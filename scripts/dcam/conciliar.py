#!/usr/bin/env python3
"""Conciliación automática de inventarios DCAM (pieza 2 del bot DCAM).

Diseño: scripts/dcam/DISENO.md. Lee los PDFs con el parser de la skill
conciliar-inventario, mapea renglones con fichas, clasifica seguro/dudoso y
orquesta la publicación (publicar.py).
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / ".claude" / "skills" / "conciliar-inventario" / "scripts"))
import fitz  # noqa: E402  (PyMuPDF, dependencia del parser)
import parse_pdf  # noqa: E402

SECCIONES = {"ARMAS": "armas", "MUNICIONES": "municiones", "ACCESORIOS": "accesorios"}


def _limpia(s) -> str:
    return " ".join(str(s).split())


def clave(renglon: dict) -> dict:
    return {"nombre": renglon["nombre"], "ocurrencia": renglon["ocurrencia"], "descripcion": renglon["descripcion"]}


def leer_inventario(ruta) -> dict:
    nombre = Path(ruta).name
    doc = fitz.open(str(ruta))
    if doc.page_count == 0:
        raise ValueError(f"PDF sin páginas: {nombre}")
    portada = doc[0].get_text()
    corte = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", portada)
    if "DIRECCION DE COMERCIALIZACION" not in portada or not corte:
        raise ValueError(f"formato no reconocido: {nombre}")
    fecha = f"{corte.group(3)}-{int(corte.group(2)):02d}-{int(corte.group(1)):02d}"
    seccion, por_pagina = None, []
    for pagina in doc:                       # el encabezado de sección se repite por página
        m = re.search(r"EXISTENCIA DE (ARMAS|MUNICIONES|ACCESORIOS)", pagina.get_text())
        seccion = SECCIONES[m.group(1)] if m else seccion
        por_pagina.append(seccion)
    catalogos, vistos = {}, {}
    for r in parse_pdf.parse_dcam(doc):
        cat = por_pagina[r["pagina"]]
        corto = _limpia(r["name"])
        if cat is None or corto in ("", "?"):
            raise ValueError(f"renglón sin sección o ilegible en {nombre}: {r}")
        n = vistos[(cat, corto)] = vistos.get((cat, corto), 0) + 1
        catalogos.setdefault(cat, []).append({
            "nombre": corto, "ocurrencia": n, "descripcion": _limpia(r.get("desc", "")),
            "existencia": int(r["qty"]), "precio": float(r["priceN"]),
        })
    return {"fecha": fecha, "catalogos": catalogos}
