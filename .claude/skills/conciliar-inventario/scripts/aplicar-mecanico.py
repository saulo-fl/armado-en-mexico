#!/usr/bin/env python3
# Armado en México — Copyright (C) 2026 Saulo Flores León
# SPDX-License-Identifier: AGPL-3.0-or-later
# Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
# (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

"""Aplicador mecánico: actualiza data-*.js con precios, historial y existencias.

Lee los JSON de mapeo (salida de mapear-existencias.py) y aplica TODOS los
cambios mecánicos a los archivos de datos, sin intervención humana.

NO maneja sinFicha (altas nuevas) — eso lo hace el agente en paso 3.

Uso:
  python3 aplicar-mecanico.py \\
    --armas mapeo-armas.json \\
    [--cartuchos mapeo-carts.json] \\
    [--accesorios mapeo-accs.json] \\
    --fecha 2026-09-25 \\
    --data-dir src/data/ \\
    [--dry-run]
"""

import sys, os, re, json, argparse, subprocess
from pathlib import Path
from collections import OrderedDict


# ═══════════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════════

def fmt_price(price_n):
    """Formatea un float como '$X,XXX.XX MXN'."""
    return f"${price_n:,.2f} MXN"


def fecha_to_manual_id(fecha, prefix="man_dcam"):
    """'2026-09-25' -> 'man_dcam_2026_09_25'"""
    return f"{prefix}_{fecha.replace('-', '_')}"


def fecha_to_nombre_armas(fecha):
    """'2026-09-25' -> 'Existencias de armas DCAM · 25 de septiembre 2026'"""
    meses = {1: "enero", 2: "febrero", 3: "marzo", 4: "abril", 5: "mayo",
             6: "junio", 7: "julio", 8: "agosto", 9: "septiembre",
             10: "octubre", 11: "noviembre", 12: "diciembre"}
    y, m, d = fecha.split("-")
    return f"Existencias de armas DCAM · {int(d)} de {meses[int(m)]} {y}"


def fecha_to_nombre_mun(fecha):
    meses = {1: "enero", 2: "febrero", 3: "marzo", 4: "abril", 5: "mayo",
             6: "junio", 7: "julio", 8: "agosto", 9: "septiembre",
             10: "octubre", 11: "noviembre", 12: "diciembre"}
    y, m, d = fecha.split("-")
    return f"Existencias de municiones DCAM · {int(d)} de {meses[int(m)]} {y}"


def fecha_to_nombre_acc(fecha):
    meses = {1: "enero", 2: "febrero", 3: "marzo", 4: "abril", 5: "mayo",
             6: "junio", 7: "julio", 8: "agosto", 9: "septiembre",
             10: "octubre", 11: "noviembre", 12: "diciembre"}
    y, m, d = fecha.split("-")
    return f"Existencias de accesorios DCAM · {int(d)} de {meses[int(m)]} {y}"


def load_mapeo(path):
    """Carga un JSON de mapeo, devuelve None si no se proporcionó."""
    if not path:
        return None
    with open(path) as f:
        return json.load(f)


def read_file(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def write_file(path, content, dry_run=False):
    if dry_run:
        return
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)


# ═══════════════════════════════════════════════════════════════════════════════
# Node.js data extractor — lee los datos actuales evaluando el JS
# ═══════════════════════════════════════════════════════════════════════════════

def node_extract(data_dir, expr):
    """Evalúa JS de los archivos de datos y devuelve el resultado."""
    script = f"""
const fs = require('fs');
const win = {{}};
global.window = win;
['data-precios.js', 'data.js', 'data-extra.js', 'data-accesorios.js', 'data-municiones.js']
  .forEach(f => {{
    try {{ eval(fs.readFileSync('{data_dir}/' + f, 'utf8')); }} catch(e) {{}}
  }});
console.log(JSON.stringify({expr}));
"""
    r = subprocess.run(["node", "-e", script], capture_output=True, text=True,
                       cwd=str(Path(data_dir).parent.parent))
    if r.returncode != 0:
        eprint(f"node error: {r.stderr[:500]}")
        return None
    return json.loads(r.stdout.strip())


# ═══════════════════════════════════════════════════════════════════════════════
# 1) Register manuals
# ═══════════════════════════════════════════════════════════════════════════════

def register_manual_armas(content, fecha, manual_id, dry_run=False):
    """Agrega entrada a AMX_MANUALES_SEED en data-precios.js."""
    if manual_id in content:
        eprint(f"  [armas] manual {manual_id} ya registrado, skip")
        return content, False

    nombre = fecha_to_nombre_armas(fecha)
    y, m, d = fecha.split("-")

    # Quitar primary:true del manual anterior
    content = re.sub(r"(\s+primary:\s*)true,", r"\1false,", content, count=1)

    new_entry = f"""  {{
    id: '{manual_id}',
    nombre: '{nombre}',
    autoridad: 'DCAM',
    fecha: '{fecha}',
    url: 'inventarios/dcam-existencias-{fecha}.pdf',
    fileName: 'dcam-existencias-{fecha}.pdf',
    addedAt: '{fecha}T12:00:00.000Z',
    primary: true,
  }},"""

    # Insertar después de "window.AMX_MANUALES_SEED = ["
    content = content.replace(
        "window.AMX_MANUALES_SEED = [\n",
        f"window.AMX_MANUALES_SEED = [\n{new_entry}\n"
    )
    return content, True


def register_manual_municiones(content, fecha, dry_run=False):
    """Agrega manual a MUNICIONES_MANUALES en data-municiones.js."""
    manual_id = fecha_to_manual_id(fecha, "man_mun_dcam")
    if manual_id in content:
        eprint(f"  [municiones] manual {manual_id} ya registrado, skip")
        return content, manual_id, False

    nombre = fecha_to_nombre_mun(fecha)

    # Quitar primary del anterior
    content = re.sub(
        r"(window\.MUNICIONES_MANUALES = \[\s*\{[^}]*?)primary:\s*true",
        r"\1primary: false",
        content, count=1
    )

    new_entry = (
        f"    {{ id: '{manual_id}', nombre: '{nombre}', autoridad: 'DCAM',\n"
        f"      fecha: '{fecha}', url: 'inventarios/dcam-municiones-{fecha}.pdf', "
        f"fileName: 'dcam-municiones-{fecha}.pdf', primary: true }},"
    )

    content = content.replace(
        "window.MUNICIONES_MANUALES = [\n",
        f"window.MUNICIONES_MANUALES = [\n{new_entry}\n"
    )
    return content, manual_id, True


def register_manual_accesorios(content, fecha, dry_run=False):
    """Agrega manual a ACCESORIOS_MANUALES en data-accesorios.js."""
    manual_id = fecha_to_manual_id(fecha, "man_acc")
    if manual_id in content:
        eprint(f"  [accesorios] manual {manual_id} ya registrado, skip")
        return content, manual_id, False

    nombre = fecha_to_nombre_acc(fecha)

    # Quitar primary del anterior
    content = re.sub(
        r"(id:\s*'man_acc_[^']*'[^}]*?)primary:\s*true",
        r"\1primary: false",
        content, count=1
    )

    new_entry = f"""  {{
    id: '{manual_id}',
    nombre: '{nombre}',
    autoridad: 'DCAM',
    fecha: '{fecha}',
    url: 'inventarios/dcam-accesorios-{fecha}.pdf',
    fileName: 'dcam-accesorios-{fecha}.pdf',
    primary: true,
  }},"""

    content = content.replace(
        "window.ACCESORIOS_MANUALES = [\n",
        f"window.ACCESORIOS_MANUALES = [\n{new_entry}\n"
    )
    return content, manual_id, True


# ═══════════════════════════════════════════════════════════════════════════════
# 2) Update AMX_ARMAS_PRECIOS map (data-precios.js) — replaces old mk() patching
# ═══════════════════════════════════════════════════════════════════════════════

def rewrite_precios_map(content, precios_map):
    """Reescribe window.AMX_ARMAS_PRECIOS = { ... }; con el nuevo mapa."""
    pairs = sorted((int(k), float(v)) for k, v in precios_map.items())
    pairs_str = ", ".join(f"{fid}: {price}" for fid, price in pairs)
    new_line = f"window.AMX_ARMAS_PRECIOS = {{ {pairs_str} }};"

    content = re.sub(
        r'window\.AMX_ARMAS_PRECIOS\s*=\s*\{[^}]*\};',
        new_line,
        content
    )
    return content


# ═══════════════════════════════════════════════════════════════════════════════
# 3) Append history records (data-precios.js)
# ═══════════════════════════════════════════════════════════════════════════════

def append_arma_history(content, ficha_id, manual_id, price_n, qty, fecha):
    """Appends a history record to AMX_PRICE_HISTORY_SEED[ficha_id]."""
    price_str = fmt_price(price_n)
    new_rec = f"{{ manualId: '{manual_id}', price: '{price_str}', date: '{fecha}' }}"

    # Check if ficha already has entries
    # Pattern: fichaId: [...]
    fid_str = str(ficha_id)
    # Find the line for this ficha id
    pat = re.compile(r'(\s+' + fid_str + r':\s*\[)(.*?)(\],?\s*$)', re.MULTILINE)
    m = pat.search(content)
    if m:
        existing = m.group(2)
        # Check idempotency: is manual_id already there?
        if manual_id in existing:
            return content, False
        # Append
        new_val = f"{existing}, {new_rec}"
        content = content[:m.start(2)] + new_val + content[m.end(2):]
        return content, True
    else:
        # No existing entry — add a new line before the closing };
        # Find the end of AMX_PRICE_HISTORY_SEED
        end_pat = re.compile(r'(window\.AMX_PRICE_HISTORY_SEED\s*=\s*\{.*?)(^\};)', re.MULTILINE | re.DOTALL)
        em = end_pat.search(content)
        if em:
            insert_pos = em.start(2)
            new_line = f"  {fid_str}: [{new_rec}],\n"
            content = content[:insert_pos] + new_line + content[insert_pos:]
            return content, True
    return content, False


# ═══════════════════════════════════════════════════════════════════════════════
# 4) Rewrite AMX_ARMAS_EXISTENCIAS (data-precios.js)
# ═══════════════════════════════════════════════════════════════════════════════

def rewrite_existencias(content, existencias_map):
    """Reescribe window.AMX_ARMAS_EXISTENCIAS = { ... }; con el nuevo mapa."""
    # Build the new value: sorted by ficha id, only qty > 0
    pairs = sorted((int(k), int(v)) for k, v in existencias_map.items() if int(v) > 0)
    pairs_str = ", ".join(f"{fid}: {qty}" for fid, qty in pairs)
    new_line = f"window.AMX_ARMAS_EXISTENCIAS = {{ {pairs_str} }};"

    # Replace existing line
    content = re.sub(
        r'window\.AMX_ARMAS_EXISTENCIAS\s*=\s*\{[^}]*\};',
        new_line,
        content
    )
    return content


# ═══════════════════════════════════════════════════════════════════════════════
# 5) Cartuchos (data-municiones.js) — price + history
# ═══════════════════════════════════════════════════════════════════════════════

def append_mun_history(content, ficha_id, manual_id, price_n, qty, fecha):
    """Appends a history record to MUNICIONES_PRICE_HISTORY[ficha_id]."""
    # Municiones history uses helper functions like _mh22(price, qty)
    # But we'll write it in expanded form for new appends
    fid_str = str(ficha_id)
    price_str = fmt_price(price_n)
    qty_part = f", qty: {qty}" if qty is not None else ""
    new_rec = f"{{ manualId: '{manual_id}', price: '{price_str}', date: '{fecha}'{qty_part} }}"

    # Find existing entry
    pat = re.compile(r'(\s+' + fid_str + r':\s*\[)(.*?)(\],?\s*$)', re.MULTILINE)
    m = pat.search(content)
    if m:
        existing = m.group(2)
        if manual_id in existing:
            return content, False
        new_val = f"{existing}, {new_rec}"
        content = content[:m.start(2)] + new_val + content[m.end(2):]
        return content, True
    else:
        # Add new entry before closing of MUNICIONES_PRICE_HISTORY
        end_pat = re.compile(r'(window\.MUNICIONES_PRICE_HISTORY\s*=\s*\{.*?)(^\s*\};)', re.MULTILINE | re.DOTALL)
        em = end_pat.search(content)
        if em:
            insert_pos = em.start(2)
            new_line = f"    {fid_str}: [{new_rec}],\n"
            content = content[:insert_pos] + new_line + content[insert_pos:]
            return content, True
    return content, False


def update_mun_price(content, ficha_id, new_price):
    """Updates the mun() call's price argument (10th positional arg, 0-indexed: arg[9]).

    mun(id, nombre, marca, pais, calibre, tipo, bala, grano, avail, precio, ...)
    """
    fid_str = str(ficha_id)
    # Find mun(ID, and count 9 commas to get to the price arg
    pattern = re.compile(
        r'(mun\(' + fid_str + r',\s*'  # mun(ID,
        r'(?:[^,]*,\s*){8})'            # 8 args (nombre..avail)
        r'([\d.]+)'                      # 9th = price (numeric literal)
    )
    new_price_str = f"{new_price:.2f}"
    new_content, n = pattern.subn(r'\g<1>' + new_price_str, content, count=1)
    return new_content, n > 0


# ═══════════════════════════════════════════════════════════════════════════════
# 6) Accesorios (data-accesorios.js) — price + history
# ═══════════════════════════════════════════════════════════════════════════════

def append_acc_history(content, ficha_id, manual_id, price_n, qty, fecha):
    """Appends a history record to ACCESORIOS_PRICE_HISTORY[ficha_id]."""
    fid_str = str(ficha_id)
    price_str = fmt_price(price_n)
    qty_part = f", qty: {qty}" if qty is not None else ""
    new_rec = f"{{ manualId: '{manual_id}', price: '{price_str}', date: '{fecha}'{qty_part} }}"

    pat = re.compile(r'(\s+' + fid_str + r':\s*\[)(.*?)(\],?\s*$)', re.MULTILINE)
    m = pat.search(content)
    if m:
        existing = m.group(2)
        if manual_id in existing:
            return content, False
        new_val = f"{existing}, {new_rec}"
        content = content[:m.start(2)] + new_val + content[m.end(2):]
        return content, True
    else:
        end_pat = re.compile(r'(window\.ACCESORIOS_PRICE_HISTORY\s*=\s*\{.*?)(^\};)', re.MULTILINE | re.DOTALL)
        em = end_pat.search(content)
        if em:
            insert_pos = em.start(2)
            new_line = f"  {fid_str}: [{new_rec}],\n"
            content = content[:insert_pos] + new_line + content[insert_pos:]
            return content, True
    return content, False


def update_acc_price(content, ficha_id, new_price):
    """Updates accesorio price in the acc() call."""
    # acc() calls vary; the price is in the last history record.
    # For accesorios the priceExact is computed from the function, not stored literally.
    # The price lives in the HISTORY — the last record's price IS the displayed price.
    # So we only need to append the history record (done above).
    # No literal price update needed in accesorios unlike armas.
    return content, False


# ═══════════════════════════════════════════════════════════════════════════════
# 7) Mark agotadas
# ═══════════════════════════════════════════════════════════════════════════════

def mark_agotadas_armas(existencias_map, sin_precio, sin_ficha_ids):
    """Fichas in sinPrecio NOT in sinFicha → remove from existencias (qty=0)."""
    sf_ids = set(sf.get("fichaId") for sf in sin_ficha_ids) if sin_ficha_ids else set()
    removed = []
    for sp in sin_precio:
        fid = str(sp["fichaId"])
        if sp["fichaId"] not in sf_ids and fid in existencias_map:
            del existencias_map[fid]
            removed.append(sp["fichaId"])
    return removed


# ═══════════════════════════════════════════════════════════════════════════════
# Main orchestration
# ═══════════════════════════════════════════════════════════════════════════════

def process_armas(mapeo, fecha, manual_id, data_dir, dry_run):
    """Process armas mapeo: prices, history, existencias.

    Prices are updated in AMX_ARMAS_PRECIOS (data-precios.js), NOT in data.js.
    data.js reads prices from that map at runtime via window.AMX_ARMAS_PRECIOS.
    """
    eprint("\n── ARMAS ──")
    existencias = mapeo.get("existencias", {})
    sin_precio = mapeo.get("sinPrecio", [])
    sin_ficha = mapeo.get("sinFicha", [])

    # Load data-precios.js (the ONLY file we touch for price changes)
    precios_path = Path(data_dir) / "data-precios.js"
    precios_content = read_file(precios_path)

    # 1) Register manual
    precios_content, added = register_manual_armas(precios_content, fecha, manual_id, dry_run)
    if added:
        eprint(f"  + manual {manual_id} registrado")

    # 2) Update prices in AMX_ARMAS_PRECIOS map and append history records
    prices = mapeo.get("precios", {})

    prices_updated = 0
    history_added = 0

    if not prices:
        eprint("  ⚠ mapeo sin campo 'precios' — no se actualizan precios")
        eprint("    (ejecuta mapear-existencias.py con versión actualizada)")
        # Still update history with CURRENT prices from AMX_ARMAS_PRECIOS
        current = node_extract(data_dir, "win.AMX_ARMAS_PRECIOS || {}")
        if current:
            for fid_str, qty in existencias.items():
                fid = int(fid_str)
                price = current.get(str(fid)) or current.get(fid)
                if price:
                    precios_content, added = append_arma_history(
                        precios_content, fid, manual_id, price, None, fecha)
                    if added:
                        history_added += 1
    else:
        # Build the new prices map: start from current, overlay new prices
        current = node_extract(data_dir, "win.AMX_ARMAS_PRECIOS || {}")
        precios_map = dict(current) if current else {}

        for fid_str, price_n in prices.items():
            fid = int(fid_str)
            precios_map[str(fid)] = float(price_n)
            prices_updated += 1

            # Append history record
            precios_content, added = append_arma_history(
                precios_content, fid, manual_id, float(price_n), None, fecha)
            if added:
                history_added += 1

        # Rewrite AMX_ARMAS_PRECIOS map
        precios_content = rewrite_precios_map(precios_content, precios_map)

    # 3) Mark agotadas
    agotadas = mark_agotadas_armas(existencias, sin_precio, sin_ficha)

    # 4) Rewrite existencias
    precios_content = rewrite_existencias(precios_content, existencias)

    # Write — only data-precios.js, never data.js for price changes
    write_file(precios_path, precios_content, dry_run)

    eprint(f"  precios actualizados: {prices_updated}")
    eprint(f"  historial añadido: {history_added}")
    eprint(f"  existencias: {len([v for v in existencias.values() if int(v) > 0])} fichas con stock")
    eprint(f"  agotadas marcadas: {len(agotadas)}")
    if agotadas:
        eprint(f"    fichas: {agotadas[:10]}{'...' if len(agotadas) > 10 else ''}")


def process_cartuchos(mapeo, fecha, data_dir, dry_run):
    """Process cartuchos mapeo."""
    eprint("\n── CARTUCHOS ──")
    existencias = mapeo.get("existencias", {})
    prices = mapeo.get("precios", {})

    mun_path = Path(data_dir) / "data-municiones.js"
    content = read_file(mun_path)

    # Register manual
    content, manual_id, added = register_manual_municiones(content, fecha, dry_run)
    if added:
        eprint(f"  + manual {manual_id} registrado")

    prices_updated = 0
    history_added = 0

    for fid_str in existencias:
        fid = int(fid_str)
        qty = int(existencias[fid_str])
        price = prices.get(fid_str)

        if price:
            # Update price in mun() call
            content, updated = update_mun_price(content, fid, float(price))
            if updated:
                prices_updated += 1

            # Append history
            content, added = append_mun_history(content, fid, manual_id, float(price), qty, fecha)
            if added:
                history_added += 1

    write_file(mun_path, content, dry_run)

    eprint(f"  precios actualizados: {prices_updated}")
    eprint(f"  historial añadido: {history_added}")
    eprint(f"  fichas con stock: {len([v for v in existencias.values() if int(v) > 0])}")


def process_accesorios(mapeo, fecha, data_dir, dry_run):
    """Process accesorios mapeo."""
    eprint("\n── ACCESORIOS ──")
    existencias = mapeo.get("existencias", {})
    prices = mapeo.get("precios", {})

    acc_path = Path(data_dir) / "data-accesorios.js"
    content = read_file(acc_path)

    # Register manual
    content, manual_id, added = register_manual_accesorios(content, fecha, dry_run)
    if added:
        eprint(f"  + manual {manual_id} registrado")

    history_added = 0

    for fid_str in existencias:
        fid = int(fid_str)
        qty = int(existencias[fid_str])
        price = prices.get(fid_str)

        if price:
            # Accesorios: price lives in history, no literal in acc() call
            content, added = append_acc_history(content, fid, manual_id, float(price), qty, fecha)
            if added:
                history_added += 1

    write_file(acc_path, content, dry_run)

    eprint(f"  historial añadido: {history_added}")
    eprint(f"  fichas con stock: {len([v for v in existencias.values() if int(v) > 0])}")


def main():
    parser = argparse.ArgumentParser(description="Aplicador mecánico DCAM")
    parser.add_argument("--armas", help="Mapeo armas JSON")
    parser.add_argument("--cartuchos", help="Mapeo cartuchos JSON")
    parser.add_argument("--accesorios", help="Mapeo accesorios JSON")
    parser.add_argument("--fecha", required=True, help="Fecha ISO (YYYY-MM-DD)")
    parser.add_argument("--data-dir", required=True, help="Directorio src/data/")
    parser.add_argument("--dry-run", action="store_true", help="Solo imprime, no escribe")
    args = parser.parse_args()

    if not any([args.armas, args.cartuchos, args.accesorios]):
        eprint("Error: proporciona al menos --armas, --cartuchos o --accesorios")
        sys.exit(1)

    data_dir = Path(args.data_dir)
    if not data_dir.exists():
        eprint(f"Error: {data_dir} no existe")
        sys.exit(1)

    fecha = args.fecha
    manual_id_armas = fecha_to_manual_id(fecha)

    eprint(f"═══ Aplicador mecánico DCAM — {fecha} ═══")
    if args.dry_run:
        eprint("  *** DRY RUN — no se escriben archivos ***")

    try:
        if args.armas:
            mapeo = load_mapeo(args.armas)
            process_armas(mapeo, fecha, manual_id_armas, str(data_dir), args.dry_run)

        if args.cartuchos:
            mapeo = load_mapeo(args.cartuchos)
            process_cartuchos(mapeo, fecha, str(data_dir), args.dry_run)

        if args.accesorios:
            mapeo = load_mapeo(args.accesorios)
            process_accesorios(mapeo, fecha, str(data_dir), args.dry_run)

        eprint("\n═══ Aplicador mecánico finalizado ═══")
        sys.exit(0)

    except Exception as e:
        eprint(f"\nError fatal: {e}")
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
