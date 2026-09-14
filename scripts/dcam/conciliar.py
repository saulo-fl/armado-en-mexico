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
from collections import Counter
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
    """Empareja cada ficha con los renglones de su registro `manual_id` por precio y existencia exactos.

    Cada renglón del mapa guarda su `precio` en ese inventario. Las fichas mapeadas por suma quedan en el
    mapa y también en `ambiguos` con motivo «confirmar suma», para que Saulo las confirme antes de activar.
    """
    mapa, ambiguos, dueños, sumas = {}, [], {}, []
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
        base = {"id": f["id"], "nombre": f["nombre"], "precio": precio, "existencia": existencia,
                "candidatos": [clave(r) for r in cand]}
        if len(exactos) == 1:
            elegidos = exactos
        elif not exactos and len(cand) > 1 and existencia is not None and sum(r["existencia"] for r in cand) == existencia:
            elegidos = cand          # la ficha suma todas las variantes de ese precio
        elif not exactos and len(variantes) == 1:
            elegidos = variantes[0]  # la ficha suma las ocurrencias de su nombre corto
        else:
            ambiguos.append({**base, "motivo": "sin pareja única de precio y existencia"})
            continue
        mapa[str(f["id"])] = [dict(clave(r), representativo=(i == 0), precio=r["precio"]) for i, r in enumerate(elegidos)]
        if len(elegidos) > 1:
            sumas.append(base)
        for r in elegidos:
            dueños.setdefault(_k(r), []).append(base)
    for bases in dueños.values():   # un renglón no puede ser de dos fichas
        if len(bases) > 1:
            for b in bases:
                propuesta = mapa.pop(str(b["id"]), None)
                if propuesta is not None:
                    ambiguos.append({**b, "motivo": "renglón compartido con otra ficha", "propuesta": propuesta})
    ambiguos += [{**b, "motivo": "confirmar suma", "propuesta": mapa[str(b["id"])]} for b in sumas if str(b["id"]) in mapa]
    return mapa, ambiguos


def _pct(nuevo: float, anterior: float) -> float:
    """% de cambio sin redondear; exactamente 0 si el precio no cambió (diferencia menor a medio centavo)."""
    return 0.0 if abs(nuevo - anterior) < 0.005 else (nuevo - anterior) / anterior * 100


def clasificar(catalogo: str, nuevos: list, mapa_anterior: dict, fichas: list, manual_anterior: str) -> dict:
    for que, claves in (("el mapa anterior asigna el mismo renglón a varias fichas",
                         [_k(c) for cs in mapa_anterior.values() for c in cs]),
                        ("el inventario nuevo repite nombre corto y ocurrencia", [_k(r) for r in nuevos])):
        repetidos = sorted(k for k, n in Counter(claves).items() if n > 1)
        if repetidos:
            raise ValueError(f"{que}: {repetidos}")
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
        elif any("precio" not in c for c in claves):
            dudosos.append({"tipo": "mapa_sin_precio", **base})    # mapa en formato viejo
        else:
            c_rep, rep = next((c, r) for c, r in zip(claves, hallados) if c.get("representativo"))
            anterior = precio_num(registro_de(f, manual_anterior)["price"])
            if abs(c_rep["precio"] - anterior) >= 0.005:   # la ficha cambió de precio fuera del mapa (p. ej. en un PR)
                dudosos.append({"tipo": "mapa_desincronizado", **base, "precio_mapa": c_rep["precio"],
                                "anterior": anterior})
            else:
                candidatos.append({**base, "anterior": anterior, "precio": rep["precio"],
                                   "existencia": sum(r["existencia"] for r in hallados),
                                   "pct": round((rep["precio"] - anterior) / anterior * 100, 2),
                                   "pcts_filas": [_pct(r["precio"], c["precio"]) for c, r in zip(claves, hallados)],
                                   "claves": [dict(clave(r), representativo=bool(c.get("representativo")),
                                                   precio=r["precio"]) for c, r in zip(claves, hallados)]})
    dudosos += [{"tipo": "renglon_nuevo", "renglon": r} for r in nuevos if _k(r) not in reclamados]
    return {"catalogo": catalogo, "candidatos": candidatos, "dudosos": dudosos}


def separar(clasificaciones: list, pcts_previos=()) -> None:
    """Seguro = cada renglón de la ficha sin cambio o dentro de un ajuste general.

    Ajuste general: ≥ MINIMO_GRUPO fichas CON cambio (una por ficha, con el % del representativo) a
    ±TOLERANCIA_PP. Lo que no cambió no forma grupo; los 0 de `pcts_previos` tampoco cuentan.
    """
    cambios = [p for p in pcts_previos if p != 0]
    cambios += [p for cl in clasificaciones for c in cl["candidatos"] if (p := _pct(c["precio"], c["anterior"])) != 0]

    def cabe(p):
        return p == 0 or sum(1 for x in cambios if abs(x - p) <= TOLERANCIA_PP + 1e-9) >= MINIMO_GRUPO

    for cl in clasificaciones:
        cl["seguros"] = []
        for c in cl.pop("candidatos"):
            if all(cabe(p) for p in c["pcts_filas"]):
                cl["seguros"].append(c)
            else:
                cl["dudosos"].append({"tipo": "precio_fuera_de_grupo", **c})


def leer_datos(raiz: Path) -> dict:
    out = subprocess.run(["node", str(RAIZ / "scripts" / "dcam" / "datos.js"), "leer", str(raiz)],
                         check=True, capture_output=True)
    return json.loads(out.stdout.decode("utf-8"))
