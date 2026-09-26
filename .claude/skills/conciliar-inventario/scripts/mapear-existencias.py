#!/usr/bin/env python3
# Armado en México — Copyright (C) 2026 Saulo Flores León
# SPDX-License-Identifier: AGPL-3.0-or-later
# Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
# (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

"""Mapea renglones de un PDF DCAM nuevo a fichas del catálogo para existencias.

Usa el encadenado de precios (price chain) contra una referencia verificada
(referencia-armas.json) para transferir la atribución de existencias ficha a
ficha. No necesita keyword matching: el precio relativo entre PDFs consecutivos
es la firma estable de cada renglón.

Uso:
  python3 mapear-existencias.py <nuevo.json> [--ref referencia.json] [--verbose]
  python3 mapear-existencias.py <nuevo.json> [--ref referencia.json] --update-ref

Entrada:
  - nuevo.json: salida de parse_pdf.py (formato {"items": [...]})
  - referencia.json: snapshot del PDF anterior con fichaId por renglón
    (por defecto: referencia-armas.json en el mismo directorio)

Salida (stdout): JSON con:
  {
    "existencias": {fichaId: qty},
    "factores": [factor1, factor2],
    "sinFicha": [...],
    "sinPrecio": [...],
    "totalPdf": N,
    "totalMapped": M
  }

Con --update-ref: después de mapear, sobreescribe la referencia con el snapshot
del PDF nuevo (rows con fichaId transferidos; sinFicha queda con fichaId=null).
"""
import sys, json, math
from pathlib import Path
from collections import Counter, defaultdict

SCRIPT_DIR = Path(__file__).parent
DEFAULT_REF = SCRIPT_DIR / "referencia-armas.json"


def find_factors(ref_rows, new_rows, tolerance=0.0005):
    """Encuentra los factores de precio entre el PDF de referencia y el nuevo.

    Busca los 1-2 factores dominantes (general + grupo Beretta/Stoeger/etc).
    Devuelve [(factor, count)] ordenado por frecuencia descendente.
    """
    # Para cada renglón del nuevo PDF, calcular la ratio con cada renglón de
    # la referencia. Los factores dominantes se agrupan por redondeo.
    ratios = Counter()

    ref_prices = [(r["priceN"], r) for r in ref_rows]

    for nr in new_rows:
        np = nr["priceN"]
        for rp, rr in ref_prices:
            if rp > 0:
                ratio = round(np / rp, 6)
                ratios[ratio] += 1

    # Los factores dominantes son los con más ocurrencias
    top = ratios.most_common(20)
    # Agrupar factores muy cercanos (dentro de tolerancia)
    groups = []
    for factor, count in top:
        merged = False
        for g in groups:
            if abs(factor - g[0]) < tolerance:
                g[1] += count
                merged = True
                break
        if not merged:
            groups.append([factor, count])

    # Filtrar factores espurios (≤0 o muy lejanos a 1.0)
    groups = [g for g in groups if g[0] > 0.5]
    groups.sort(key=lambda g: -g[1])
    result = [(g[0], g[1]) for g in groups[:5]]
    # Siempre incluir factor 1.0 (sin cambio de precio) como candidato:
    # algunos renglones no cambian de precio entre PDFs consecutivos.
    if not any(abs(f - 1.0) < 0.001 for f, _ in result):
        result.append((1.0, 0))
    return result


def _name_sim(a, b):
    """Similitud entre dos nombres cortos del PDF (0-1)."""
    import difflib
    return difflib.SequenceMatcher(None, a.upper(), b.upper()).ratio()


def match_rows(ref_rows, new_rows, factors, tolerance=0.005):
    """Empareja renglones del nuevo PDF con renglones de referencia por price chain.

    Para cada renglón del nuevo PDF:
    1. Calcula el precio esperado en la referencia: new_price / factor
    2. Busca los renglones de referencia candidatos (dentro de tolerancia)
    3. Si hay varios candidatos al mismo precio, desempata por similitud de nombre

    Usa emparejamiento global (Hungarian-style greedy) para evitar que el orden
    del PDF determine quién se lleva a quién: primero acumula TODOS los
    candidatos y luego asigna de mayor a menor similitud.

    Devuelve:
      matched: [(new_idx, ref_idx, factor_used)]
      unmatched_new: [new_idx]
    """
    # Construir índice de precios de referencia
    ref_by_price = defaultdict(list)
    for i, r in enumerate(ref_rows):
        ref_by_price[round(r["priceN"], 2)].append(i)

    # Paso 1: para cada renglón nuevo, acumular TODOS los candidatos viables
    # con su score (price_diff, name_similarity)
    candidates = []  # (score, new_idx, ref_idx, factor)

    for ni, nr in enumerate(new_rows):
        np_ = nr["priceN"]
        if np_ <= 0:
            continue

        for factor, _count in factors:
            if factor <= 0:
                continue
            expected_ref_price = np_ / factor
            for rp_round, ref_indices in ref_by_price.items():
                if abs(rp_round - round(expected_ref_price, 2)) > 2:
                    continue
                for ri in ref_indices:
                    rp = ref_rows[ri]["priceN"]
                    if rp <= 0:
                        continue
                    price_diff = abs(np_ / rp - factor)
                    if price_diff < tolerance:
                        sim = _name_sim(nr.get("name", ""), ref_rows[ri].get("name", ""))
                        # Score: priorizar similitud de nombre, luego menor diff de precio
                        # Más alto = mejor match
                        score = sim * 1000 - price_diff * 100
                        candidates.append((score, ni, ri, factor))

    # Paso 2: asignar de mayor score a menor (greedy óptimo para 1:1)
    candidates.sort(key=lambda x: -x[0])
    ref_used = set()
    new_used = set()
    matched = []

    for score, ni, ri, f in candidates:
        if ni in new_used or ri in ref_used:
            continue
        ref_used.add(ri)
        new_used.add(ni)
        matched.append((ni, ri, f))

    unmatched_new = [i for i in range(len(new_rows)) if i not in new_used]

    return matched, unmatched_new


def map_existencias(ref_path, new_items, verbose=False):
    """Mapea renglones del nuevo PDF a fichas usando la referencia."""
    with open(ref_path) as f:
        ref = json.load(f)

    ref_rows = ref["rows"]

    # 1) Encontrar factores
    factors = find_factors(ref_rows, new_items)
    if verbose:
        print(f"Factores detectados:", file=sys.stderr)
        for f_val, cnt in factors[:5]:
            print(f"  x{f_val:.6f} → {cnt} coincidencias", file=sys.stderr)

    # 2) Emparejar renglones
    matched, unmatched_new = match_rows(ref_rows, new_items, factors)
    if verbose:
        print(f"\nEmparejados: {len(matched)} / {len(new_items)}", file=sys.stderr)
        print(f"Sin emparejar (nuevos): {len(unmatched_new)}", file=sys.stderr)

    # 3) Transferir fichaId de la referencia y sumar qty
    existencias = defaultdict(int)
    ficha_rows = defaultdict(list)  # fichaId → [new_rows]

    for ni, ri, f_used in matched:
        fid = ref_rows[ri]["fichaId"]
        if fid is not None:
            qty = new_items[ni]["qty"]
            if qty > 0:
                existencias[fid] += qty
                ficha_rows[fid].append(new_items[ni])

    # 4) Renglones sin emparejar en el nuevo PDF (posibles altas)
    sin_ficha = []
    for ni in unmatched_new:
        nr = new_items[ni]
        sin_ficha.append({
            "idx": ni,
            "name": nr["name"],
            "priceN": nr["priceN"],
            "qty": nr["qty"],
            "desc": nr.get("desc", "")[:120],
        })

    # 5) Renglones de referencia sin emparejar (posibles agotados)
    ref_matched = {ri for _, ri, _ in matched}
    sin_precio = []
    for i, rr in enumerate(ref_rows):
        if i not in ref_matched and rr["fichaId"] is not None:
            sin_precio.append({
                "fichaId": rr["fichaId"],
                "refName": rr["name"],
                "refPrice": rr["priceN"],
            })

    # 6) Cordura: comparar unidades mapeadas vs totales del PDF
    total_pdf = sum(r["qty"] for r in new_items)
    total_mapped = sum(existencias.values())
    if total_pdf > 0:
        pct = total_mapped / total_pdf * 100
        if pct < 80 or pct > 105:
            print(f"  ⚠ Cordura: mapeado {total_mapped}/{total_pdf} ({pct:.1f}%) — revisar sinFicha/sinPrecio", file=sys.stderr)

    if verbose:
        print(f"\nFichas con existencia: {len(existencias)}", file=sys.stderr)
        print(f"Unidades mapeadas: {total_mapped} / {total_pdf}", file=sys.stderr)

        if sin_ficha:
            print(f"\nRenglones NUEVOS (sin referencia, posibles altas):", file=sys.stderr)
            for s in sin_ficha:
                print(f"  [{s['idx']:3}] {s['name'][:50]} qty={s['qty']} p={s['priceN']:.2f}", file=sys.stderr)

        if sin_precio:
            print(f"\nFichas SIN renglón en el nuevo PDF (posibles agotadas):", file=sys.stderr)
            for s in sin_precio:
                print(f"  ficha {s['fichaId']}: {s['refName'][:50]}", file=sys.stderr)

        # Print per-ficha detail
        print(f"\nDetalle por ficha:", file=sys.stderr)
        for fid in sorted(existencias.keys()):
            rows = ficha_rows[fid]
            names = ", ".join(r["name"][:25] for r in rows)
            print(f"  {fid:>3} → {existencias[fid]:>3} ({len(rows)} rows: {names})", file=sys.stderr)

    return {
        "existencias": dict(sorted(existencias.items())),
        "factores": [f_val for f_val, _ in factors[:2]],
        "sinFicha": sin_ficha,
        "sinPrecio": sin_precio,
        "totalPdf": total_pdf,
        "totalMapped": total_mapped,
        "_matched": matched,          # internal: for --update-ref
        "_unmatched_new": unmatched_new,
    }


def update_ref(ref_path, new_items, result, new_path):
    """Sobreescribe la referencia con el snapshot del PDF nuevo.

    Los renglones emparejados heredan el fichaId de la referencia.
    Los sinFicha quedan con fichaId=null (se asignarán en la siguiente
    conciliación cuando se creen las fichas).
    """
    with open(ref_path) as f:
        old_ref = json.load(f)

    ref_rows = old_ref["rows"]
    matched = result["_matched"]
    unmatched_new = result["_unmatched_new"]

    new_rows = []
    for ni, ri, f_used in matched:
        nr = new_items[ni]
        fid = ref_rows[ri]["fichaId"]
        new_rows.append({
            "idx": nr.get("idx", ni),
            "name": nr["name"],
            "desc": nr.get("desc", ""),
            "priceN": nr["priceN"],
            "qty": nr["qty"],
            "fichaId": fid,
        })

    for ni in unmatched_new:
        nr = new_items[ni]
        new_rows.append({
            "idx": nr.get("idx", ni),
            "name": nr["name"],
            "desc": nr.get("desc", ""),
            "priceN": nr["priceN"],
            "qty": nr["qty"],
            "fichaId": None,
        })

    new_rows.sort(key=lambda r: r["idx"])

    # Derive pdfFile from new_path if it looks like a filename
    pdf_file = Path(new_path).stem if new_path else old_ref.get("pdfFile", "")

    new_ref = {
        "pdfDate": old_ref.get("pdfDate", ""),
        "pdfFile": pdf_file,
        "totalRows": len(new_rows),
        "rows": new_rows,
    }

    with open(ref_path, "w", encoding="utf-8") as f:
        json.dump(new_ref, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"Referencia actualizada: {ref_path} ({len(new_rows)} rows)", file=sys.stderr)


def main():
    if len(sys.argv) < 2:
        print("uso: mapear-existencias.py <nuevo.json> [--ref referencia.json] [--verbose] [--update-ref]")
        sys.exit(1)

    new_path = sys.argv[1]
    ref_path = DEFAULT_REF
    verbose = "--verbose" in sys.argv
    do_update = "--update-ref" in sys.argv

    if "--ref" in sys.argv:
        ref_path = Path(sys.argv[sys.argv.index("--ref") + 1])

    with open(new_path) as f:
        pdf_data = json.load(f)

    result = map_existencias(ref_path, pdf_data["items"], verbose)

    # Strip internal keys before printing
    output = {k: v for k, v in result.items() if not k.startswith("_")}
    print(json.dumps(output, indent=2, ensure_ascii=False))

    if do_update:
        update_ref(ref_path, pdf_data["items"], result, new_path)


if __name__ == "__main__":
    main()
