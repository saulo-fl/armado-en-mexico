#!/usr/bin/env python3
# Armado en México — Copyright (C) 2026 Saulo Flores León
# SPDX-License-Identifier: AGPL-3.0-or-later
# Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
# (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

"""Autochequeo de parse_pdf.py contra PDFs ya versionados en public/inventarios/.
Uso (desde la raiz del repo):  python3 .claude/skills/conciliar-inventario/scripts/test_parse_pdf.py
Falla con AssertionError si el parser deja de leer bien el formato DCAM de 3 PDFs (11-sep-2026)
o los PDFs DCAM de oct-2025 (columnas mas a la izquierda, sin "$", precios pegados a texto).
"""
import os, sys
import fitz
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from parse_pdf import parse_dcam, formato

INV = os.path.join("public", "inventarios")
def items(nombre):
    return parse_dcam(fitz.open(os.path.join(INV, nombre)))

armas = items("dcam-existencias-2026-09-11.pdf")
municiones = items("dcam-municiones-2026-09-11.pdf")
accesorios = items("dcam-accesorios-2026-09-11.pdf")
assert (len(armas), len(municiones), len(accesorios)) == (204, 42, 30)

# nombre corto repetido: solo la descripcion distingue la A612 de las dos P612
p612 = [r for r in armas if r["name"] == "ESCOPETA CAL. 12 ARMSAN P612 A.C."]
assert [("A612" in r["desc"]) for r in p612] == [False, False, True], [r["desc"][:80] for r in p612]

# descripcion derramada a la pagina siguiente: se conserva entera
kz = next(r for r in armas if r["name"] == "PIST.SEMI.,CAL.9X19MMGLOCK,17GEN4,L.CÑ17")
assert kz["desc"].endswith("CÓDIGO: 33317."), kz["desc"][-60:]
# un codigo suelto al final no se confunde con el numero de pagina
assert next(r for r in municiones if r["name"].startswith("CART. CAL. 12 EXCOPESA"))["desc"].endswith("130 - 75")

# la nota en negrita del renglon siguiente ("Venta exclusiva...") no se cuela en la descripcion
assert not any("xclusiva" in r["desc"] or "Armada de México" in r["desc"] for r in accesorios)
tip = next(r for r in accesorios if r["name"].startswith("CARGADOR TIPPMANN"))
assert (tip["qty"], tip["priceN"]) == (26, 935.17)

# oct-2025: la deteccion no se deja engañar por la cabecera acentuada y lee todo
fmt = lambda n: formato(fitz.open(os.path.join(INV, n)))
assert [fmt(n) for n in ("dcam-existencias-2025-10-03.pdf", "dcam-accesorios-2025-10-03.pdf",
                         "otca-stock-2025-09-26.pdf", "otca-stock-2026-06-18.pdf")] == ["DCAM", "DCAM", "OTCA", "OTCA"]
oct_armas = items("dcam-existencias-2025-10-03.pdf")
oct_acc = items("dcam-accesorios-2025-10-03.pdf")
assert (len(oct_armas), len(oct_acc)) == (177, 22), (len(oct_armas), len(oct_acc))
par = {(r["qty"], r["priceN"]) for r in oct_armas}
assert (20, 11930.34) in par and (44, 11426.2) in par  # precio pegado a texto (856 Tungsten) y XD-M
# 14 nombres con matriz rota salen "?" en vez de heredar el del vecino
assert sum(r["name"] == "?" for r in oct_armas) == 14
assert next(r for r in oct_acc if "BENELLI MR1" in r["name"])["priceN"] == 841.81
print("OK parse_pdf: 204 armas · 42 municiones · 30 accesorios · oct-2025 177 armas · 22 accesorios")
