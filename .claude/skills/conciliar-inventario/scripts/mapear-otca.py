#!/usr/bin/env python3
# Armado en México — Copyright (C) 2026 Saulo Flores León
# SPDX-License-Identifier: AGPL-3.0-or-later
# Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
# (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

"""Empareja los renglones del PDF de la OTCA con las fichas del catálogo.

La OTCA no trae nombre corto: cada renglón es una descripción larga, que casi
no cambia de un inventario a otro. Por eso, a diferencia de la DCAM (que empata
por cadena de precios porque sus nombres se repiten), aquí manda la descripción:

  1. liga       `ligas-otca.json` {cat: {"<descripción exacta>": fichaId|null}}
  2. referencia misma descripción (normalizada) en `referencia-otca.json`
                (renglones del último OTCA verificado, con su fichaId)
  3. cadena     descripción parecida (≥ 0.5) a un renglón de la referencia Y su
                precio / el de la referencia ≈ un factor de aumento del día
                (los factores salen de los renglones del paso 2)
  4. DCAM       descripción IDÉNTICA (normalizada) a la de un solo renglón con
                ficha de las referencias de la DCAM o a un `dcamRef`
  Lo demás → sinFicha (lo decide el solucionador: liga a una ficha o alta).

Uso:
  python3 mapear-otca.py <otca.json> [--ref referencia-otca.json] [--ligas ligas-otca.json]
                         [--catalogo src/data] [--update-ref]

Salida (stdout): {"fecha", "factores", "<cat>": {"existencias": {id: qty},
  "precios": {id: precio}, "renglones": [{idx, fichaId, via}], "sinFicha": [...],
  "sinPrecio": [{fichaId, ...}], "excluidos": [...]}} para cat = armas, cartuchos, accesorios.
Varios renglones de una misma ficha suman existencias; el precio es el del
renglón con más piezas (empate: el primero del PDF) y se listan en `variantes`.
"""
import json, re, subprocess, sys, unicodedata
from collections import Counter
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
CATS = ("armas", "cartuchos", "accesorios")
STOP = set("DE LA EL CON PARA Y EN DEL LOS LAS UN UNA MARCA MODELO MOD CALIBRE CAL VERSION COLOR TIPO C U CADA".split())
TOL_FACTOR = 0.0005
SIM_CADENA = 0.5


def norm(s):
    s = "".join(c for c in unicodedata.normalize("NFD", (s or "").upper()) if unicodedata.category(c) != "Mn")
    s = re.sub(r"\(VENTA EXCLUSIVA.*", "", s)  # leyenda de venta exclusiva: cambia de redacción
    return re.sub(r"[^A-Z0-9]+", " ", s).strip()


def _toks(s):
    return [t for t in norm(s).split() if t not in STOP]


def similitud(a, b):
    """0..1. Cuenta palabras compartidas y, aparte, las que llevan dígitos
    (modelo, calibre, capacidad), que son las que distinguen variantes."""
    ta, tb = set(_toks(a)), set(_toks(b))
    if not ta or not tb:
        return 0.0
    da = {t for t in ta if re.search(r"\d", t)}
    db = {t for t in tb if re.search(r"\d", t)}
    cov = len(ta & tb) / len(ta)
    jac = len(ta & tb) / len(ta | tb)
    dig = len(da & db) / len(da | db) if (da | db) else 1.0
    return round(0.4 * cov + 0.3 * jac + 0.3 * dig, 3)


def factores(pares, minimo=2):
    """Factores de precio del día: razones repetidas entre renglones con la misma
    descripción (agrupadas a 4 decimales). La OTCA no sube todo parejo (30-oct:
    x1.0946 la mayoría y x1.0516 otros), así que se aceptan varios."""
    c = Counter(round(n / v, 4) for n, v in pares if v)
    return sorted(f for f, k in c.items() if k >= minimo and 0.80 <= f <= 1.30)


def cargar_dcam(catalogo):
    """{cat: {norm(desc o dcamRef): {fichaIds}}} de las referencias DCAM y del catálogo."""
    out = {c: {} for c in CATS}
    for c in CATS:
        p = SCRIPT_DIR / f"referencia-{c}.json"
        if p.exists():
            for r in json.load(open(p))["rows"]:
                if r.get("fichaId") is not None:
                    for t in (r.get("desc"), r.get("name")):
                        if t:
                            out[c].setdefault(norm(t), set()).add(r["fichaId"])
    if catalogo:
        js = """
const path=require('path'); global.window=global; const d=process.argv[1];
for (const f of ['data-precios.js','data.js','data-municiones.js','data-accesorios.js']) require(path.join(d,f));
const m=(l)=>(l||[]).map(a=>[a.id,a.dcamRef||'']);
process.stdout.write(JSON.stringify({armas:m(window.DB),cartuchos:m(window.MUNICIONES),accesorios:m(window.ACCESORIOS)}));"""
        r = subprocess.run(["node", "-e", js, str(Path(catalogo).resolve())], capture_output=True, text=True)
        if r.returncode == 0:
            for c, filas in json.loads(r.stdout).items():
                for fid, ref in filas:
                    if ref:
                        out[c].setdefault(norm(ref), set()).add(fid)
        else:
            print(f"aviso: no pude leer el catálogo ({r.stderr[-200:]})", file=sys.stderr)
    return out


def mapear(items, ref, ligas, dcam):
    ligas = ligas or {}
    out = {"factores": {}}
    for c in CATS:
        filas = [it for it in items if it["cat"] == c]
        refrows = [r for r in ref.get(c, []) if r.get("fichaId") is not None]
        por_desc = {}
        for r in refrows:
            por_desc.setdefault(norm(r["desc"]), r)
        lig = {norm(k): v for k, v in (ligas.get(c) or {}).items()}
        asign, excluidos, sin = {}, [], []
        pares = []
        # 1-2: liga y descripción exacta
        for it in filas:
            k = norm(it["desc"])
            if k in lig:
                if lig[k] is None:
                    excluidos.append({"idx": it["idx"], "desc": it["desc"], "priceN": it["priceN"], "qty": it["qty"]})
                else:
                    asign[it["idx"]] = (lig[k], "liga")
            elif k in por_desc:
                r = por_desc[k]
                asign[it["idx"]] = (r["fichaId"], "referencia")
                pares.append((it["priceN"], r["priceN"]))
        fs = factores(pares)
        out["factores"][c] = fs
        # 3: cadena de precios + descripción parecida
        for it in filas:
            if it["idx"] in asign or norm(it["desc"]) in lig:
                continue
            mejor = None
            for r in refrows:
                if not r["priceN"]:
                    continue
                razon = it["priceN"] / r["priceN"]
                if not any(abs(razon - f) <= TOL_FACTOR for f in fs):
                    continue
                s = similitud(it["desc"], r["desc"])
                if s >= SIM_CADENA and (mejor is None or s > mejor[0]):
                    mejor = (s, r)
            if mejor:
                asign[it["idx"]] = (mejor[1]["fichaId"], f"cadena {mejor[0]}")
        # 4: descripción idéntica a la de la DCAM / dcamRef (una sola ficha)
        for it in filas:
            if it["idx"] in asign or norm(it["desc"]) in lig:
                continue
            ids = dcam.get(c, {}).get(norm(it["desc"]), set())
            if len(ids) == 1:
                asign[it["idx"]] = (next(iter(ids)), "dcam")
            else:
                sin.append({"idx": it["idx"], "desc": it["desc"], "priceN": it["priceN"], "qty": it["qty"],
                            "candidatos": sorted(ids)})
        # existencias y precio por ficha
        por_ficha = {}
        for it in filas:
            if it["idx"] in asign:
                por_ficha.setdefault(asign[it["idx"]][0], []).append(it)
        exist, precios, variantes = {}, {}, {}
        for fid, its in por_ficha.items():
            exist[str(fid)] = sum(i["qty"] for i in its)
            rep = max(its, key=lambda i: (i["qty"], -i["idx"]))
            precios[str(fid)] = rep["priceN"]
            if len(its) > 1:
                variantes[str(fid)] = [{"idx": i["idx"], "priceN": i["priceN"], "qty": i["qty"]} for i in its]
        hoy = set(por_ficha)
        sin_precio = [{"fichaId": r["fichaId"], "desc": r["desc"], "priceN": r["priceN"]}
                      for r in refrows if r["fichaId"] not in hoy]
        # quitar repetidos (una ficha con dos renglones en la referencia)
        vistos, sp = set(), []
        for s in sin_precio:
            if s["fichaId"] not in vistos:
                vistos.add(s["fichaId"]); sp.append(s)
        out[c] = {
            "existencias": dict(sorted(exist.items(), key=lambda kv: int(kv[0]))),
            "precios": dict(sorted(precios.items(), key=lambda kv: int(kv[0]))),
            "renglones": [{"idx": i, "fichaId": f, "via": v} for i, (f, v) in sorted(asign.items())],
            "variantes": variantes,
            "sinFicha": sin,
            "sinPrecio": sp,
            "excluidos": excluidos,
        }
    return out


def actualizar_ref(ref_path, items, res, fecha, pdf_file):
    filas = {c: [] for c in CATS}
    asign = {}
    for c in CATS:
        for r in res[c]["renglones"]:
            asign[(c, r["idx"])] = r["fichaId"]
    for it in items:
        filas[it["cat"]].append({"idx": it["idx"], "desc": it["desc"], "priceN": it["priceN"],
                                 "qty": it["qty"], "fichaId": asign.get((it["cat"], it["idx"]))})
    data = {"pdfDate": fecha, "pdfFile": pdf_file, **filas}
    with open(ref_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(f"referencia OTCA actualizada: {ref_path}", file=sys.stderr)


def main():
    a = sys.argv[1:]
    if not a:
        print(__doc__); sys.exit(1)
    pdf = json.load(open(a[0]))
    opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
    ref_path = Path(opt("--ref", SCRIPT_DIR / "referencia-otca.json"))
    ligas_path = Path(opt("--ligas", SCRIPT_DIR / "ligas-otca.json"))
    ref = json.load(open(ref_path)) if ref_path.exists() else {}
    ligas = json.load(open(ligas_path)) if ligas_path.exists() else {}
    dcam = cargar_dcam(opt("--catalogo"))
    res = mapear(pdf["items"], ref, ligas, dcam)
    res = {"fecha": pdf.get("fecha"), **res}
    print(json.dumps(res, ensure_ascii=False, indent=1))
    for c in CATS:
        r = res[c]
        vias = Counter(x["via"].split()[0] for x in r["renglones"])
        print(f"{c}: {len(r['renglones'])} ligados ({dict(vias)}), sinFicha {len(r['sinFicha'])}, "
              f"agotados {len(r['sinPrecio'])}, excluidos {len(r['excluidos'])}, factores {res['factores'][c]}",
              file=sys.stderr)
    if "--update-ref" in a:
        actualizar_ref(ref_path, pdf["items"], res, pdf.get("fecha"), f"otca-stock-{pdf.get('fecha')}.pdf")


if __name__ == "__main__":
    main()
