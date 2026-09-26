#!/usr/bin/env python3
# Armado en México — Copyright (C) 2026 Saulo Flores León
# SPDX-License-Identifier: AGPL-3.0-or-later
# Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
# (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

"""Resuelve conflictos de merge previsibles del pipeline de conciliación.

Ejecutar DESPUÉS de un `git merge` fallido (con marcadores de conflicto).

Reglas:
  data.js          → mezcla mk(): nuestro precio + su img/historia/specs
                     (si precio no difiere, toma THEIRS entero — futuro-proof)
  data-precios.js  → OURS (precios/existencias/historial son datos frescos)
  referencia-*.json→ OURS (PDFs actualizados)
  SKILL.md         → OURS
  otro archivo     → NO se toca, se reporta como advertencia

Uso:
  python3 resolver-conflictos.py [--dry-run]
"""

import argparse
import os
import re
import subprocess
import sys
from pathlib import Path

# ── mk() arg positions ─────────────────────────────────────────
# mk(id, nombre, marca, tipo, pais, calibre, capacidad, peso,
#     longitud, mecanismo, anio, avail, priceExact, dcamRef, img, historia)
MK_PRICE_INDEX = 12  # 0-based index of priceExact inside mk() args


# ── Helpers ─────────────────────────────────────────────────────

def git(*args: str) -> str:
    """Run a git command and return stdout."""
    r = subprocess.run(["git", *args], capture_output=True, text=True)
    return r.stdout.strip()


def conflicting_files() -> list[str]:
    """Return list of files with unresolved conflicts."""
    out = git("diff", "--name-only", "--diff-filter=U")
    return [f for f in out.splitlines() if f.strip()]


CONFLICT_RE = re.compile(
    r"^<<<<<<<[^\n]*\n(.*?)^=======\n(.*?)^>>>>>>>[^\n]*\n",
    re.MULTILINE | re.DOTALL,
)


def split_conflicts(text: str) -> list[tuple[str, str, str]]:
    """Split *text* into segments: non-conflict str, or (ours, theirs) tuples.

    Returns a list where each element is either:
      - a plain string (no conflict)
      - a tuple (full_match, ours_text, theirs_text)
    """
    parts: list = []
    last = 0
    for m in CONFLICT_RE.finditer(text):
        if m.start() > last:
            parts.append(text[last : m.start()])
        parts.append((m.group(0), m.group(1), m.group(2)))
        last = m.end()
    if last < len(text):
        parts.append(text[last:])
    return parts


# ── mk() argument parser ───────────────────────────────────────

def parse_mk_args(mk_text: str) -> list[str] | None:
    """Extract the raw argument strings of a mk(...) call.

    Returns a list of raw argument strings (preserving quotes, whitespace) or
    None if the text doesn't look like a mk() invocation.
    """
    # Find the opening paren after 'mk'
    idx = mk_text.find("mk(")
    if idx == -1:
        return None
    start = idx + 3  # after 'mk('

    # Walk chars, respecting parens, quotes, and escapes to find matching ')'
    args: list[str] = []
    depth = 1
    cur = []
    in_str = None  # None, '"', or "'"
    i = start
    while i < len(mk_text) and depth > 0:
        ch = mk_text[i]
        if in_str:
            cur.append(ch)
            if ch == "\\" and i + 1 < len(mk_text):
                i += 1
                cur.append(mk_text[i])
            elif ch == in_str:
                in_str = None
        else:
            if ch in ('"', "'"):
                in_str = ch
                cur.append(ch)
            elif ch == "(":
                depth += 1
                cur.append(ch)
            elif ch == ")":
                depth -= 1
                if depth == 0:
                    args.append("".join(cur).strip())
                    break
                cur.append(ch)
            elif ch == "," and depth == 1:
                args.append("".join(cur).strip())
                cur = []
            else:
                cur.append(ch)
        i += 1
    return args if args else None


def find_all_mk_calls(text: str) -> list[tuple[int, int, list[str]]]:
    """Find all mk(...) calls in *text*.

    Returns list of (start, end, parsed_args) for each mk() call found.
    """
    results = []
    search_start = 0
    while True:
        idx = text.find("mk(", search_start)
        if idx == -1:
            break
        # Parse from this position
        start = idx + 3  # after 'mk('
        depth = 1
        args: list[str] = []
        cur: list[str] = []
        in_str = None
        i = start
        while i < len(text) and depth > 0:
            ch = text[i]
            if in_str:
                cur.append(ch)
                if ch == "\\" and i + 1 < len(text):
                    i += 1
                    cur.append(text[i])
                elif ch == in_str:
                    in_str = None
            else:
                if ch in ('"', "'"):
                    in_str = ch
                    cur.append(ch)
                elif ch == "(":
                    depth += 1
                    cur.append(ch)
                elif ch == ")":
                    depth -= 1
                    if depth == 0:
                        args.append("".join(cur).strip())
                        break
                    cur.append(ch)
                elif ch == "," and depth == 1:
                    args.append("".join(cur).strip())
                    cur = []
                else:
                    cur.append(ch)
            i += 1
        if args:
            results.append((idx, i + 1, args))  # i+1 = past closing ')'
        search_start = idx + 3
    return results


def build_price_map(text: str) -> dict[str, str]:
    """Extract {id: priceExact} from all mk() calls in text."""
    prices = {}
    for _start, _end, args in find_all_mk_calls(text):
        if len(args) > MK_PRICE_INDEX:
            mk_id = args[0].strip()
            prices[mk_id] = args[MK_PRICE_INDEX].strip()
    return prices


def merge_mk_calls(ours_text: str, theirs_text: str) -> str:
    """Merge two conflicting mk() regions.

    Strategy: start from theirs (has photo/spec updates), then splice in our
    prices where they differ. If no mk() calls found, return theirs as fallback.

    Handles conflict blocks containing multiple mk() calls.
    """
    our_prices = build_price_map(ours_text)
    their_calls = find_all_mk_calls(theirs_text)

    if not their_calls:
        # No mk() calls in theirs — fall back to theirs as-is
        return theirs_text

    # Work through theirs_text, replacing prices where ours differ
    result_parts: list[str] = []
    last_end = 0

    for start, end, their_args in their_calls:
        # Add text before this mk() call
        result_parts.append(theirs_text[last_end:start])

        mk_id = their_args[0].strip() if their_args else None
        our_price = our_prices.get(mk_id) if mk_id else None
        their_price = their_args[MK_PRICE_INDEX].strip() if len(their_args) > MK_PRICE_INDEX else None

        if our_price and their_price and our_price != their_price:
            # Splice our price into their args
            merged = list(their_args)
            merged[MK_PRICE_INDEX] = our_price
            result_parts.append(f"mk({', '.join(merged)})")
        else:
            # Keep theirs as-is
            result_parts.append(theirs_text[start:end])

        last_end = end

    # Add remaining text after last mk() call
    result_parts.append(theirs_text[last_end:])
    return "".join(result_parts)


# ── Resolution strategies ───────────────────────────────────────

def resolve_data_js(filepath: str, content: str, dry_run: bool) -> bool:
    """Resolve conflicts in data.js by merging mk() calls."""
    parts = split_conflicts(content)
    if not any(isinstance(p, tuple) for p in parts):
        return True  # no conflicts found

    resolved = []
    all_ok = True
    for part in parts:
        if isinstance(part, str):
            resolved.append(part)
        else:
            _full, ours, theirs = part
            # Check if this block contains mk() calls
            if "mk(" in ours or "mk(" in theirs:
                merged = merge_mk_calls(ours, theirs)
                resolved.append(merged)
            else:
                # Non-mk conflict in data.js — can't auto-resolve
                resolved.append(part[0])  # keep conflict markers
                all_ok = False

    if not dry_run:
        Path(filepath).write_text("".join(resolved), encoding="utf-8")
    return all_ok


def resolve_ours(filepath: str, dry_run: bool) -> bool:
    """Resolve by taking OURS entirely (git checkout --ours)."""
    if not dry_run:
        subprocess.run(["git", "checkout", "--ours", "--", filepath], check=True)
    return True


# ── Main ────────────────────────────────────────────────────────

def classify_file(path: str) -> str:
    """Classify a conflicting file into a resolution strategy."""
    base = os.path.basename(path)
    if base == "data.js":
        return "data.js"
    if base.startswith("data-precios") or base.startswith("data-existencias"):
        return "ours"
    if base.startswith("referencia-") and base.endswith(".json"):
        return "ours"
    if base == "SKILL.md":
        return "ours"
    return "unknown"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Resuelve conflictos de merge del pipeline de conciliación."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Muestra qué haría sin modificar archivos.",
    )
    args = parser.parse_args()

    files = conflicting_files()
    if not files:
        print("✓ Sin conflictos pendientes.")
        return 0

    resolved_count = 0
    unresolved: list[str] = []

    for fpath in files:
        strategy = classify_file(fpath)

        if strategy == "data.js":
            content = Path(fpath).read_text(encoding="utf-8")
            ok = resolve_data_js(fpath, content, args.dry_run)
            if ok:
                if not args.dry_run:
                    subprocess.run(["git", "add", "--", fpath], check=True)
                print(f"  ✓ {fpath} — mk() merge (precio nuestro + img/specs de ellos)")
                resolved_count += 1
            else:
                print(f"  ⚠ {fpath} — bloques no-mk sin resolver")
                unresolved.append(fpath)

        elif strategy == "ours":
            resolve_ours(fpath, args.dry_run)
            if not args.dry_run:
                subprocess.run(["git", "add", "--", fpath], check=True)
            label = {
                "data-precios": "precios/existencias/historial frescos",
                "referencia-": "referencia PDF actualizada",
                "SKILL.md": "SKILL actualizado",
            }
            desc = "OURS"
            base = os.path.basename(fpath)
            for prefix, lbl in label.items():
                if base.startswith(prefix) or base == prefix:
                    desc = lbl
                    break
            print(f"  ✓ {fpath} — checkout --ours ({desc})")
            resolved_count += 1

        else:
            print(f"  ⚠ {fpath} — tipo desconocido, no se toca")
            unresolved.append(fpath)

    # Summary
    print()
    if unresolved:
        print(f"Resueltos: {resolved_count} | Sin resolver: {len(unresolved)}")
        for u in unresolved:
            print(f"  → {u}")
        return 1
    else:
        prefix = "[dry-run] " if args.dry_run else ""
        print(f"{prefix}✓ {resolved_count} conflicto(s) resuelto(s).")
        return 0


if __name__ == "__main__":
    sys.exit(main())
