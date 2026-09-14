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


TOLERANCIA_PP = 0.05     # puntos porcentuales para pertenecer a un ajuste general
MINIMO_GRUPO = 5         # renglones con el mismo % para que cuente como ajuste general


def precio_num(texto) -> float:
    return float(re.sub(r"[^\d.]", "", str(texto)))


def registro_de(ficha: dict, manual_id: str) -> dict | None:
    return next((h for h in ficha.get("hist", []) if h.get("manualId") == manual_id), None)


def _k(c: dict) -> tuple:
    return (c["nombre"], c["ocurrencia"])


def construir_mapeo(catalogo: str, renglones: list, fichas: list, manual_id: str) -> tuple[dict, list]:
    """Empareja cada ficha con los renglones de su registro `manual_id` por precio y existencia exactos."""
    mapa, ambiguos, dueños = {}, [], {}
    for f in fichas:
        reg = registro_de(f, manual_id)
        if not reg:
            continue
        precio = precio_num(reg["price"])
        existencia = f.get("existencia") if catalogo == "armas" else reg.get("qty")
        cand = [r for r in renglones if abs(r["precio"] - precio) < 0.005]
        exactos = [r for r in cand if r["existencia"] == existencia]
        # variantes del mismo nombre corto con otro precio: el renglón de su precio es el representativo
        variantes = [[r] + [o for o in renglones if o["nombre"] == r["nombre"] and o is not r] for r in cand]
        variantes = [g for g in variantes if len(g) > 1 and sum(o["existencia"] for o in g) == existencia]
        if len(exactos) == 1:
            elegidos = exactos
        elif not exactos and len(cand) > 1 and existencia is not None and sum(r["existencia"] for r in cand) == existencia:
            elegidos = cand          # la ficha suma todas las variantes de ese precio
        elif not exactos and len(variantes) == 1:
            elegidos = variantes[0]  # la ficha suma las ocurrencias de su nombre corto
        else:
            ambiguos.append({"id": f["id"], "nombre": f["nombre"], "precio": precio, "existencia": existencia,
                             "candidatos": [clave(r) for r in cand]})
            continue
        mapa[str(f["id"])] = [dict(clave(r), representativo=(i == 0)) for i, r in enumerate(elegidos)]
        for r in elegidos:
            dueños.setdefault(_k(r), []).append(f)
    for fichas_del_renglon in dueños.values():   # un renglón no puede ser de dos fichas
        if len(fichas_del_renglon) > 1:
            for f in fichas_del_renglon:
                if mapa.pop(str(f["id"]), None) is not None:
                    ambiguos.append({"id": f["id"], "nombre": f["nombre"], "precio": None, "existencia": None,
                                     "candidatos": "renglón compartido con otra ficha"})
    return mapa, ambiguos


def clasificar(catalogo: str, nuevos: list, mapa_anterior: dict, fichas: list, manual_anterior: str) -> dict:
    por_clave = {_k(r): r for r in nuevos}
    fichas_por_id = {str(f["id"]): f for f in fichas}
    reclamados, candidatos, dudosos = set(), [], []
    for fid, claves in mapa_anterior.items():
        f = fichas_por_id.get(fid)
        if f is None:
            continue
        hallados = [por_clave.get(_k(c)) for c in claves]
        reclamados.update(_k(c) for c, r in zip(claves, hallados) if r)
        base = {"id": f["id"], "nombre": f["nombre"]}
        if not any(hallados):
            dudosos.append({"tipo": "agotado", **base, "renglones": claves})
        elif not all(hallados):
            dudosos.append({"tipo": "variante", **base, "faltan": [c for c, r in zip(claves, hallados) if not r]})
        elif any(c["descripcion"] != r["descripcion"] for c, r in zip(claves, hallados)):
            dudosos.append({"tipo": "descripcion", **base, "antes": claves, "ahora": [clave(r) for r in hallados]})
        elif not registro_de(f, manual_anterior):
            dudosos.append({"tipo": "sin_precio_anterior", **base})
        else:
            rep = next(r for c, r in zip(claves, hallados) if c.get("representativo"))
            anterior = precio_num(registro_de(f, manual_anterior)["price"])
            candidatos.append({**base, "anterior": anterior, "precio": rep["precio"],
                               "existencia": sum(r["existencia"] for r in hallados),
                               "pct": round((rep["precio"] - anterior) / anterior * 100, 2),
                               "claves": [dict(clave(r), representativo=bool(c.get("representativo")))
                                          for c, r in zip(claves, hallados)]})
    dudosos += [{"tipo": "renglon_nuevo", "renglon": r} for r in nuevos if _k(r) not in reclamados]
    return {"catalogo": catalogo, "candidatos": candidatos, "dudosos": dudosos}


def separar(clasificaciones: list, pcts_previos=()) -> None:
    pcts = list(pcts_previos) + [c["pct"] for cl in clasificaciones for c in cl["candidatos"]]
    for cl in clasificaciones:
        cl["seguros"] = []
        for c in cl.pop("candidatos"):
            en_grupo = sum(1 for x in pcts if abs(x - c["pct"]) <= TOLERANCIA_PP + 1e-9) >= MINIMO_GRUPO
            if c["pct"] == 0 or en_grupo:
                cl["seguros"].append(c)
            else:
                cl["dudosos"].append({"tipo": "precio_fuera_de_grupo", **c})


def leer_datos(raiz: Path) -> dict:
    out = subprocess.run(["node", str(RAIZ / "scripts" / "dcam" / "datos.js"), "leer", str(raiz)],
                         check=True, capture_output=True)
    return json.loads(out.stdout.decode("utf-8"))
