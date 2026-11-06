#!/usr/bin/env python3
# Armado en México — Copyright (C) 2026 Saulo Flores León
# SPDX-License-Identifier: AGPL-3.0-or-later
# Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
# (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

"""Autochequeo del lector y el emparejador de la OTCA.
Uso (desde la raiz del repo, con el python del bot):  python3 .claude/skills/conciliar-inventario/scripts/test_otca.py
El lector usa los PDF OTCA versionados en public/inventarios/; el emparejador, casos mínimos.
"""
import importlib.util, os
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[3]


def cargar(nombre, archivo):
    spec = importlib.util.spec_from_file_location(nombre, AQUI / archivo)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


fallas = 0
def caso(nombre, ok):
    global fallas
    print(("ok   " if ok else "FALLA ") + nombre)
    fallas += not ok


p = cargar("parse_otca", "parse_otca.py")
m = cargar("mapear_otca", "mapear-otca.py")

# ── lector ──
caso("categoría por la primera palabra", [p.categoria(d) for d in (
    "FUSIL DE ASALTO …", "H87 PISTOLA CALIBRE 9X19", "PISTOLAS SEMIAUTOMÁTICAS CAL. 0.22",
    "CARTUCHO MARCA PMC", "CARGADOR PARA PISTOLA", "MIRA REFLEX")] ==
     ["armas", "armas", "armas", "cartuchos", "accesorios", "accesorios"])

pdf = RAIZ / "public/inventarios/otca-stock-2026-06-18.pdf"
try:
    import pymupdf  # noqa: F401
    hay_pdf = pdf.exists()
except ImportError:
    hay_pdf = False
if hay_pdf:
    d = p.parse_pdf(str(pdf))
    caso("18-jun-2026: fecha y 106 renglones", d["fecha"] == "2026-06-18" and d["total"] == 106)
    sp = [i for i in d["items"] if "STOEGER MODELO SP312" in i["desc"]]
    mr = [i for i in d["items"] if i["desc"].startswith("RIFLE SEMIAUTOMÁTICO MARCA BENELLI CAL. .223 REM, MODELO MR1")]
    caso("la cola de la SP312 no cae en la MR1 (celdas, no texto)",
         len(sp) == 1 and len(mr) == 1 and sp[0]["desc"].endswith("de México)")
         and mr[0]["desc"].endswith("RIEL PICATINNY") and mr[0]["qty"] == 14 and mr[0]["priceN"] == 35495.02)
    caso("cada renglón trae existencia y precio", all(i["qty"] >= 0 and i["priceN"] > 0 for i in d["items"]))
else:
    print("(sin pymupdf o sin el PDF: se saltan las pruebas del lector)")

# ── emparejador ──
it = lambda idx, desc, precio, qty=1, cat="armas": {"idx": idx, "desc": desc, "name": desc, "priceN": precio, "qty": qty, "cat": cat}
ref = {"armas": [
    {"idx": 1, "desc": "PISTOLA MARCA X MODELO A1 CALIBRE 9 MM", "priceN": 100.0, "qty": 3, "fichaId": 10},
    {"idx": 2, "desc": "PISTOLA MARCA X MODELO B2 CALIBRE 9 MM", "priceN": 200.0, "qty": 3, "fichaId": 20},
    {"idx": 3, "desc": "RIFLE MARCA Y MODELO R7 CALIBRE 308", "priceN": 300.0, "qty": 1, "fichaId": 30},
    {"idx": 4, "desc": "RIFLE MARCA Z MODELO Q9 CALIBRE 22", "priceN": 400.0, "qty": 1, "fichaId": 40},
]}
hoy = [
    it(1, "PISTOLA MARCA X MODELO A1 CALIBRE 9 MM", 110.0, 2),            # referencia (x1.10)
    it(2, "PISTOLA MARCA X MODELO B2 CALIBRE 9 MM", 220.0, 1),            # referencia (x1.10)
    it(3, "RIFLE MARCA Y, MODELO R7, CALIBRE 0.308 WIN CON CAÑÓN", 330.0),  # cadena: redacción nueva
    it(4, "RIFLE MARCA Y MODELO R7 CALIBRE 308 VERSION LH", 330.0, 4),    # cadena: variante, suma
    it(5, "ESCOPETA MARCA W MODELO E1", 50.0),                            # dcam idéntica
    it(6, "ESCOPETA NUEVA SIN FICHA", 60.0),                              # sinFicha
    it(7, "LANZADOR A $0", 0.01),                                         # liga null
    it(8, "CARGADOR P/ PISTOLA X A1", 9.0, 5, "accesorios"),              # liga
]
ligas = {"armas": {"LANZADOR A $0": None}, "accesorios": {"CARGADOR P/ PISTOLA X A1": 7}}
dcam = {"armas": {m.norm("ESCOPETA MARCA W MODELO E1"): {50}}}
r = m.mapear(hoy, ref, ligas, dcam)
A = r["armas"]
via = {x["idx"]: (x["fichaId"], x["via"].split()[0]) for x in A["renglones"]}
caso("factor del día sale de las descripciones idénticas", r["factores"]["armas"] == [1.1])
caso("referencia por descripción", via[1] == (10, "referencia") and via[2] == (20, "referencia"))
caso("cadena: redacción nueva y variante van a la misma ficha", via[3] == (30, "cadena") and via[4] == (30, "cadena"))
caso("variantes suman existencias; precio del de más piezas", A["existencias"]["30"] == 5 and "30" in A["variantes"])
caso("descripción idéntica a la DCAM", via[5] == (50, "dcam"))
caso("lo demás queda sinFicha", [s["idx"] for s in A["sinFicha"]] == [6])
caso("liga null excluye", [e["idx"] for e in A["excluidos"]] == [7])
caso("agotado = estaba en la referencia y hoy no", [s["fichaId"] for s in A["sinPrecio"]] == [40])
caso("liga en otra categoría", r["accesorios"]["existencias"] == {"7": 5})
caso("la leyenda de venta exclusiva no cuenta",
     m.norm("RIFLE X (Venta exclusiva para Oficiales)") == m.norm("RIFLE X (Venta exclusiva para Oficiales, Jefes y Generales)"))

print(f"\n{'TODO OK' if not fallas else f'{fallas} FALLA(S)'}")
raise SystemExit(1 if fallas else 0)
