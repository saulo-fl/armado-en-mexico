#!/usr/bin/env python3
# Armado en México — Copyright (C) 2026 Saulo Flores León
# SPDX-License-Identifier: AGPL-3.0-or-later
# Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
# (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

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


FACTOR_MIN, FACTOR_MAX = 0.90, 1.10


def clave_liga(row, ligas):
    """Clave de `row` en el archivo de ligas, o None.

    Las ligas son {"<nombre exacto del PDF>": fichaId|null}, permanentes: el
    nombre de un producto en el PDF de la DCAM no cambia entre inventarios, así
    que una liga sobrevive a días en que el producto no viene (agotado) y a la
    cadena de precios. Si varios renglones comparten nombre, todos van a la
    misma ficha (variantes: suman existencias, el precio lo elige la regla del
    representante).
    """
    if not ligas:
        return None
    return row["name"] if row["name"] in ligas else None


def find_factors(ref_rows, new_rows, tolerance=0.0005):
    """Encuentra los factores de precio entre el PDF de referencia y el nuevo.

    Busca los 1-2 factores dominantes (general + grupo Beretta/Stoeger/etc).
    Devuelve [(factor, count)] ordenado por frecuencia descendente.
    """
    # Para cada renglón del nuevo PDF, calcular la ratio con cada renglón de
    # la referencia. Los factores dominantes se agrupan por redondeo.
    ratios = Counter()

    # Preferente: solo pares con el MISMO nombre en los dos PDFs. Es el mismo
    # producto, así que su razón de precios es un factor real. Comparar todos
    # contra todos (lo de abajo) inventa factores casuales entre productos
    # distintos — 02-oct-2026: x1.155 y x0.76 empataban con el real.
    por_nombre = defaultdict(list)
    for r in ref_rows:
        if r["priceN"] > 0:
            por_nombre[_norm_nombre(r["name"])].append(r["priceN"])
    for nr in new_rows:
        for rp in por_nombre.get(_norm_nombre(nr["name"]), []):
            if nr["priceN"] > 0:
                ratios[round(nr["priceN"] / rp, 6)] += 1
    if sum(ratios.values()) < 5:
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

    # Filtrar factores espurios. Entre dos PDFs consecutivos la DCAM nunca ha
    # movido precios fuera de ±10 %; un factor de 1.155 o 0.76 es una cadena
    # casual entre productos distintos y empareja renglones con la ficha
    # equivocada (02-oct-2026: 16 cartuchos «nuevos» que ya tenían ficha y 9
    # precios inflados 10-15 %). Mismo rango que vigila el pipeline.
    groups = [g for g in groups if FACTOR_MIN <= g[0] <= FACTOR_MAX]
    groups.sort(key=lambda g: -g[1])
    # Un factor con 1-2 apoyos no es un movimiento de precios: es el cruce entre
    # dos renglones homónimos de precio distinto (Huglu Renova ×2 → x1.0397, que
    # emparejaba el renglón con su gemelo equivocado y dejaba el otro «nuevo»).
    if groups:
        minimo = max(3, groups[0][1] * 0.05)
        groups = [g for g in groups if g[1] >= minimo]
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


def _norm_nombre(s):
    import re
    return re.sub(r"[^A-Z0-9]", "", (s or "").upper())


def elegir_representante(rows, dcam_ref, ultimo, factors, tol=0.02):
    """Renglón que fija el precio de una ficha (regla de Saulo, 01-oct-2026).

    1) Si algún renglón se llama EXACTAMENTE como la ficha (dcamRef, sin
       puntuación), manda ese; si hay varios, el que mejor encadena.
    2) Si no, el renglón que mejor encadena con el último precio publicado
       (precio / último ≈ factor del PDF).
    Devuelve (renglon, motivo, ok). ok=False si el elegido no encadena con
    ningún factor (±tol): el precio no se publica y se manda a revisión.
    """
    if not rows:
        return None, "sin renglones", False
    facs = [f for f, _ in factors if f > 0] or [1.0]

    def desvio(r):
        return min(abs(r["priceN"] / ultimo - f) for f in facs) if ultimo else 0.0

    ref = _norm_nombre(dcam_ref)
    exactos = [r for r in rows if ref and _norm_nombre(r["name"]) == ref]
    if exactos:
        r = min(exactos, key=desvio)
        motivo = "nombre exacto"
    else:
        r = min(rows, key=desvio)
        motivo = "encadenado"
    ok = (not ultimo) or desvio(r) <= tol
    return r, motivo, ok


def cargar_catalogo(data_dir, antes_de=None):
    """{fichaId: {dcamRef, ultimo}} evaluando los data-*.js con node.

    `ultimo` = precio del último registro DCAM del historial con fecha < antes_de.
    """
    import subprocess
    js = r"""
const fs = require('fs'); global.window = {};
for (const f of ['data-precios.js', 'data.js', 'data-extra.js']) {
  try { eval(fs.readFileSync(process.argv[1] + '/' + f, 'utf8')); } catch (e) {}
}
const antes = process.argv[2] || '9999-12-31';
const H = window.AMX_PRICE_HISTORY_SEED || {}; const out = {};
for (const a of (window.DB || [])) {
  const regs = (H[a.id] || []).filter(r => /^man_dcam_/.test(r.manualId) && r.date < antes);
  const u = regs.length ? parseFloat(regs[regs.length - 1].price.replace(/[^\d.]/g, '')) : null;
  out[a.id] = { dcamRef: a.dcamRef || '', ultimo: u };
}
console.log(JSON.stringify(out));
"""
    r = subprocess.run(["node", "-e", js, str(data_dir), antes_de or ""],
                       capture_output=True, text=True)
    if r.returncode != 0:
        print(f"  ⚠ catálogo no cargado: {r.stderr[:300]}", file=sys.stderr)
        return None
    return json.loads(r.stdout)


PREFIJO_DCAM = {"armas": "man_dcam_", "cartuchos": "man_mun_dcam_", "accesorios": "man_acc_"}
TOL_REGRESO = 0.015   # misma tolerancia que el «aumento general» de verificar-cierre.py
MIN_GRUPO_REGRESO = 5
# Cada línea de producto sube a su ritmo (Beretta x1.0219 cuando la mediana era
# x1.049; Saga x1.0496 contra x1.0724). Un regreso también cuadra si su razón
# coincide casi exacta con la de varias fichas más desde la misma fecha.
TOL_TRAMO = 0.0005
MIN_TRAMO = 2


def cuadra_regreso(razon, razones):
    """¿La razón precio_hoy / precio_d de una ficha se explica por el movimiento
    del resto del catálogo entre d y hoy? `razones` = las de las OTRAS fichas con
    registro en d. Devuelve (ok, motivo, detalle) con detalle = {general, tramo, apoyos}.
    """
    det = {"apoyos": len(razones), "general": None, "tramo": 0}
    if len(razones) >= MIN_GRUPO_REGRESO:
        import statistics
        det["general"] = round(statistics.median(razones), 6)
        if abs(razon - det["general"]) <= TOL_REGRESO:
            return True, "aumento general", det
    det["tramo"] = sum(1 for x in razones if abs(x - razon) <= TOL_TRAMO)
    if det["tramo"] >= MIN_TRAMO:
        return True, f"mismo aumento que {det['tramo']} fichas de su tramo", det
    if len(razones) < MIN_GRUPO_REGRESO:
        return False, f"solo {len(razones)} fichas para comparar", det
    return False, "el precio no cuadra con el aumento general ni con un tramo", det


def cargar_historial(data_dir, cat, antes_de):
    """Fichas de la categoría con su dcamRef y su historial DCAM anterior a `antes_de`.

    Devuelve {fichaId(str): {"dcamRef": str, "regs": [(fecha, precio), ...]}}
    con los registros ordenados por fecha.
    """
    import subprocess
    js = r"""
const fs = require('fs'); const win = {}; global.window = win;
for (const f of ['data-precios.js', 'data.js', 'data-extra.js', 'data-accesorios.js', 'data-municiones.js'])
  { try { eval(fs.readFileSync(process.argv[1] + '/' + f, 'utf8')); } catch (e) {} }
const cat = process.argv[2], pref = process.argv[3], antes = process.argv[4];
const fichas = { armas: win.DB, cartuchos: win.MUNICIONES, accesorios: win.ACCESORIOS }[cat] || [];
const H = { armas: win.AMX_PRICE_HISTORY_SEED, cartuchos: win.MUNICIONES_PRICE_HISTORY,
            accesorios: win.ACCESORIOS_PRICE_HISTORY }[cat] || {};
const out = {};
for (const a of fichas) {
  const regs = (H[a.id] || []).filter(r => r && String(r.manualId || '').startsWith(pref) && r.date < antes)
    .map(r => [r.date, parseFloat(String(r.price || '').replace(/[^\d.]/g, '')) || 0])
    .filter(r => r[1] > 0).sort((x, y) => x[0] < y[0] ? -1 : 1);
  out[a.id] = { dcamRef: a.dcamRef || '', regs };
}
console.log(JSON.stringify(out));
"""
    r = subprocess.run(["node", "-e", js, str(data_dir), cat, PREFIJO_DCAM[cat], antes_de],
                       capture_output=True, text=True)
    if r.returncode != 0:
        print(f"  ⚠ historial no cargado: {r.stderr[:300]}", file=sys.stderr)
        return None
    return json.loads(r.stdout)


def detectar_regresos(new_items, candidatos, ficha_prices, historial):
    """Renglones sin emparejar que son una ficha existente que vuelve tras agotarse.

    La referencia solo guarda el PDF anterior, así que un producto que faltó uno
    o más días vuelve sin fichaId (runbook §B.1 / C12 / C13). Se liga solo si
    se cumplen las tres cosas:
      1. su nombre normalizado es el dcamRef de UNA sola ficha, que hoy no tiene
         otro renglón;
      2. la ficha tiene un registro DCAM anterior (fecha d, precio p);
      3. precio_hoy / p cuadra con lo que se movió el resto del catálogo entre
         d y hoy (`cuadra_regreso`): el aumento general (mediana, ±1.5 %) o el
         de su tramo (≥2 fichas con la misma razón, ±0.0005).
    Lo demás se queda en sinFicha para el solucionador: un precio que no cuadra
    es justo lo que destapó el registro ajeno de la 2079 (09-oct-2026).
    Devuelve ({new_idx: fichaId}, [detalle], [rechazos]).
    """
    por_ref = defaultdict(list)
    for fid, info in historial.items():
        k = _norm_nombre(info.get("dcamRef"))
        if k:
            por_ref[k].append(fid)
    precio_en = {fid: dict(info["regs"]) for fid, info in historial.items()}

    def razones_en(fecha):
        return [p / precio_en[str(f)][fecha] for f, p in ficha_prices.items()
                if p > 0 and precio_en.get(str(f), {}).get(fecha)]

    aceptados, detalle, rechazos = {}, [], []
    tomadas = {str(f) for f in ficha_prices}
    for ni in candidatos:
        nr = new_items[ni]
        fids = por_ref.get(_norm_nombre(nr["name"]), [])
        if not fids or nr["priceN"] <= 0:
            continue
        info = {"idx": ni, "name": nr["name"], "priceN": nr["priceN"]}
        if len(fids) > 1:
            rechazos.append(dict(info, motivo=f"dcamRef compartido por {len(fids)} fichas: {fids}"))
            continue
        fid = fids[0]
        if fid in tomadas:
            rechazos.append(dict(info, fichaId=int(fid), motivo="la ficha ya tiene renglón hoy"))
            continue
        regs = historial[fid]["regs"]
        if not regs:
            rechazos.append(dict(info, fichaId=int(fid), motivo="ficha sin registro DCAM anterior"))
            continue
        fecha, ultimo = regs[-1]
        razon = nr["priceN"] / ultimo
        ok, motivo, det = cuadra_regreso(razon, razones_en(fecha))
        info.update(fichaId=int(fid), fechaAntes=fecha, antes=ultimo, razon=round(razon, 6),
                    motivo=motivo, **det)
        if ok:
            aceptados[ni] = int(fid)
            tomadas.add(fid)
            detalle.append(info)
        else:
            rechazos.append(info)
    return aceptados, detalle, rechazos


def map_existencias(ref_path, new_items, verbose=False, catalogo=None, ligas=None, historial=None):
    """Mapea renglones del nuevo PDF a fichas usando la referencia.

    `ligas` (opcional) fuerza la ficha de renglones concretos por nombre: lo
    decide el solucionador o un humano y gana sobre la cadena de precios.
    Valor null = renglón conocido que a propósito no va a ninguna ficha.
    """
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

    # 2b) Ligas manuales: sacan el renglón del emparejamiento automático
    forzados = {}   # new_idx → fichaId (o None = excluido a propósito)
    for ni, nr in enumerate(new_items):
        k = clave_liga(nr, ligas)
        if k is not None:
            forzados[ni] = ligas[k]
    if forzados:
        matched = [(ni, ri, f) for ni, ri, f in matched if ni not in forzados]
        unmatched_new = [ni for ni in unmatched_new if ni not in forzados]
        if verbose:
            print(f"Ligas manuales aplicadas: {len(forzados)}", file=sys.stderr)
    if verbose:
        print(f"\nEmparejados: {len(matched)} / {len(new_items)}", file=sys.stderr)
        print(f"Sin emparejar (nuevos): {len(unmatched_new)}", file=sys.stderr)

    # 3) Transferir fichaId de la referencia y sumar qty
    existencias = defaultdict(int)
    ficha_rows = defaultdict(list)  # fichaId → [new_rows]
    ficha_prices = {}  # fichaId → priceN (precio unitario del PDF nuevo)

    for ni, ri, f_used in matched:
        fid = ref_rows[ri]["fichaId"]
        if fid is not None:
            qty = new_items[ni]["qty"]
            if qty > 0:
                existencias[fid] += qty
                ficha_rows[fid].append(new_items[ni])
            # Precio provisional: el del primer renglón (se corrige abajo con
            # la variante representativa si hay catálogo)
            if fid not in ficha_prices:
                ficha_prices[fid] = new_items[ni]["priceN"]

    for ni, fid in forzados.items():
        if fid is None:
            continue
        nr = new_items[ni]
        if nr["qty"] > 0:
            existencias[fid] += nr["qty"]
            ficha_rows[fid].append(nr)
        if fid not in ficha_prices and nr["priceN"] > 0:
            ficha_prices[fid] = nr["priceN"]

    # 3b) Variante representativa (regla 01-oct-2026). Candidatos: los renglones
    # mapeados a la ficha + los que se llaman exactamente como ella y no tienen
    # dueño (referencia con fichaId null). Si el renglón exacto no estaba
    # mapeado, su existencia también se suma a la ficha.
    revisar = []
    consumidos = set()
    if catalogo:
        dueno = {}
        for ni, ri, _ in matched:
            dueno[ni] = ref_rows[ri]["fichaId"]
        for ni, fid in forzados.items():
            dueno[ni] = fid if fid is not None else "excluido"
        por_nombre = defaultdict(list)
        for ni, nr in enumerate(new_items):
            if dueno.get(ni) is None:
                por_nombre[_norm_nombre(nr["name"])].append(nr)
        for fid in list(ficha_rows.keys()):
            info = catalogo.get(str(fid)) or {}
            dref = info.get("dcamRef") or ""
            libres = [r for r in por_nombre.get(_norm_nombre(dref), []) if r["priceN"] > 0]
            cands = ficha_rows[fid] + libres
            if len(cands) < 2:
                continue
            elegido, motivo, ok = elegir_representante(cands, dref, info.get("ultimo"), factors)
            # Un renglón emparejado por la cadena de precios encadena por
            # construcción con su renglón del PDF anterior: es válido aunque
            # el último registro de la ficha fuera de otra variante.
            if any(elegido is r for r in ficha_rows[fid] if r not in libres):
                ok = True
            if elegido in libres:
                existencias[fid] += elegido["qty"]
                ficha_rows[fid].append(elegido)
                por_nombre[_norm_nombre(dref)].remove(elegido)
                consumidos.add(id(elegido))
            if ok:
                ficha_prices[fid] = elegido["priceN"]
            else:
                # Guardia: no se publica un salto que no encadena; se queda el último.
                if info.get("ultimo"):
                    ficha_prices[fid] = info["ultimo"]
                revisar.append({"fichaId": fid, "dcamRef": dref, "renglon": elegido["name"],
                                "precio": elegido["priceN"], "ultimo": info.get("ultimo"),
                                "motivo": motivo})

    # 3c) Regresos tras agotarse: renglón sin pareja cuyo nombre es el dcamRef
    # de una ficha y cuyo precio cuadra con el aumento general desde su último
    # registro. Se tratan como una liga (también sobreviven en --update-ref).
    regresos, regresos_rechazados = [], []
    if historial:
        cands = [ni for ni in unmatched_new if id(new_items[ni]) not in consumidos]
        aceptados, regresos, regresos_rechazados = detectar_regresos(
            new_items, cands, ficha_prices, historial)
        for ni, fid in aceptados.items():
            nr = new_items[ni]
            if nr["qty"] > 0:
                existencias[fid] += nr["qty"]
                ficha_rows[fid].append(nr)
            ficha_prices[fid] = nr["priceN"]
            forzados[ni] = fid
        unmatched_new = [ni for ni in unmatched_new if ni not in aceptados]
        if verbose and (regresos or regresos_rechazados):
            print(f"Regresos tras agotarse ligados: {len(regresos)}", file=sys.stderr)
            for r in regresos:
                print(f"  ✔ {r['name'][:45]} → {r['fichaId']}  {r['antes']} ({r['fechaAntes']}) → "
                      f"{r['priceN']}  x{r['razon']:.6f}: {r['motivo']}", file=sys.stderr)
            for r in regresos_rechazados:
                print(f"  ✗ {r['name'][:45]} → {r.get('fichaId', '?')}: {r['motivo']}", file=sys.stderr)

    # 4) Renglones sin emparejar en el nuevo PDF (posibles altas)
    sin_ficha = []
    for ni in unmatched_new:
        nr = new_items[ni]
        if id(nr) in consumidos:
            continue
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
        if i not in ref_matched and rr["fichaId"] is not None and rr["fichaId"] not in existencias:
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
        "precios": {k: round(v, 2) for k, v in sorted(ficha_prices.items())},
        "factores": [f_val for f_val, _ in factors[:2]],
        "sinFicha": sin_ficha,
        "sinPrecio": sin_precio,
        "revisarPrecio": revisar if catalogo else [],
        "totalPdf": total_pdf,
        "totalMapped": total_mapped,
        "excluidos": [{"idx": ni, "name": new_items[ni]["name"], "priceN": new_items[ni]["priceN"],
                       "qty": new_items[ni]["qty"]} for ni, fid in sorted(forzados.items()) if fid is None],
        "regresos": regresos,
        "regresosRechazados": regresos_rechazados,
        "_matched": matched,          # internal: for --update-ref
        "_unmatched_new": unmatched_new,
        "_forzados": forzados,
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

    for ni, fid in result.get("_forzados", {}).items():
        nr = new_items[ni]
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
        print("uso: mapear-existencias.py <nuevo.json> [--ref referencia.json] [--verbose] [--update-ref]"
              " [--catalogo src/data] [--regresos src/data] [--antes-de AAAA-MM-DD] [--ligas ligas.json]")
        sys.exit(1)

    new_path = sys.argv[1]
    ref_path = DEFAULT_REF
    verbose = "--verbose" in sys.argv
    do_update = "--update-ref" in sys.argv

    if "--ref" in sys.argv:
        ref_path = Path(sys.argv[sys.argv.index("--ref") + 1])

    with open(new_path) as f:
        pdf_data = json.load(f)

    # --catalogo <src/data> [--antes-de AAAA-MM-DD]: activa la variante
    # representativa (solo armas; cartuchos y accesorios no usan dcamRef).
    catalogo = None
    if "--catalogo" in sys.argv:
        antes = sys.argv[sys.argv.index("--antes-de") + 1] if "--antes-de" in sys.argv else None
        catalogo = cargar_catalogo(sys.argv[sys.argv.index("--catalogo") + 1], antes)

    ligas = None
    if "--ligas" in sys.argv:
        lp = Path(sys.argv[sys.argv.index("--ligas") + 1])
        if lp.exists():
            with open(lp) as f:
                ligas = json.load(f)

    # --regresos <src/data> --antes-de AAAA-MM-DD: liga solo las fichas que
    # vuelven tras agotarse (nombre = dcamRef y precio = aumento general).
    # La categoría sale del nombre de la referencia (referencia-<cat>.json).
    historial = None
    if "--regresos" in sys.argv:
        if "--antes-de" not in sys.argv:
            print("--regresos necesita --antes-de AAAA-MM-DD", file=sys.stderr)
            sys.exit(2)
        cat = Path(ref_path).stem.replace("referencia-", "")
        if cat not in PREFIJO_DCAM:
            print(f"--regresos: categoría desconocida «{cat}» (de {ref_path})", file=sys.stderr)
            sys.exit(2)
        historial = cargar_historial(sys.argv[sys.argv.index("--regresos") + 1], cat,
                                     sys.argv[sys.argv.index("--antes-de") + 1])
        if historial is None:
            sys.exit(2)

    result = map_existencias(ref_path, pdf_data["items"], verbose, catalogo, ligas, historial)

    # Strip internal keys before printing
    output = {k: v for k, v in result.items() if not k.startswith("_")}
    print(json.dumps(output, indent=2, ensure_ascii=False))

    if do_update:
        update_ref(ref_path, pdf_data["items"], result, new_path)


if __name__ == "__main__":
    main()
