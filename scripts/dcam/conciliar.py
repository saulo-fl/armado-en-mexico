#!/usr/bin/env python3
"""Conciliación automática de inventarios DCAM (pieza 2 del bot DCAM).

Diseño: scripts/dcam/DISENO.md. Lee los PDFs con el parser de la skill
conciliar-inventario, mapea renglones con fichas, clasifica seguro/dudoso y
orquesta la publicación (publicar.py).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
from collections import Counter
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / ".claude" / "skills" / "conciliar-inventario" / "scripts"))
sys.path.insert(0, str(Path(__file__).resolve().parent))   # vigia y publicar
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


# ── Orquestación: semilla del mapa y corrida diaria ──────────────────────────

DIR_BOT = Path(os.environ.get("DCAM_DIR", "/home/saulo/apps/dcam-bot"))
TRABAJO = Path(os.environ.get("DCAM_TRABAJO", "/home/saulo/apps/dcam-bot/trabajo"))
MAPA = "scripts/dcam/mapeo-dcam.json"
MANUAL = {"armas": "man_dcam_{}", "municiones": "man_mun_dcam_{}", "accesorios": "man_acc_{}"}


def _json(ruta: Path, defecto):
    return json.loads(ruta.read_text(encoding="utf-8")) if ruta.exists() else defecto


def _guardar(ruta: Path, datos) -> None:
    tmp = ruta.with_suffix(".tmp")
    tmp.write_text(json.dumps(datos, ensure_ascii=False, indent=1), encoding="utf-8")
    os.replace(tmp, ruta)


def pendientes(dir_bot: Path, conc: dict) -> list:
    """(sha256, pdf archivado) de las existencias del vigía que la conciliación no terminó."""
    import vigia
    estado = _json(dir_bot / "estado.json", {"documentos": {}})
    salida = []
    for url, d in estado.get("documentos", {}).items():
        if d.get("tipo") != "existencias" or conc.get("procesados", {}).get(d["sha256"], {}).get("paso") == "hecho":
            continue
        rutas = sorted((dir_bot / "archivo").glob(f"*/{vigia.nombre_archivo(url)}"))
        if rutas:
            salida.append((d["sha256"], rutas[-1]))
    return salida


def semilla(pdfs, marcar=False, raiz=RAIZ, dir_bot=DIR_BOT):
    datos = leer_datos(raiz)
    mapa = _json(raiz / MAPA, {"pendientes": []})
    conc = _json(dir_bot / "conciliacion.json", {"procesados": {}})
    for ruta in pdfs:
        inv = leer_inventario(ruta)
        for cat, filas in inv["catalogos"].items():
            manual = MANUAL[cat].format(inv["fecha"].replace("-", "_"))
            m, amb = construir_mapeo(cat, filas, datos[cat], manual)
            mapa.setdefault(cat, {})[inv["fecha"]] = {"manual": manual, "fichas": m}
            # repetir la semilla de un inventario reemplaza sus ambiguos, no los duplica
            mapa["pendientes"] = [p for p in mapa["pendientes"] if (p.get("catalogo"), p.get("fecha")) != (cat, inv["fecha"])]
            mapa["pendientes"] += [dict(a, catalogo=cat, fecha=inv["fecha"]) for a in amb]
            print(f"{cat} {inv['fecha']}: {len(m)} fichas mapeadas, {len(amb)} ambiguas")
            for a in amb:
                print(f"  ? #{a['id']} {a['nombre']} precio={a['precio']} existencia={a['existencia']} "
                      f"motivo={a['motivo']} candidatos={a['candidatos']}")
        if marcar:
            conc["procesados"][hashlib.sha256(Path(ruta).read_bytes()).hexdigest()] = {"paso": "hecho", "semilla": True}
    _guardar(raiz / MAPA, mapa)
    if marcar:
        _guardar(dir_bot / "conciliacion.json", conc)


def _cuerpo_pr(cl: dict, fecha: str, ruta: Path) -> str:
    filas = [f"Inventario DCAM de {cl['catalogo']} con fecha de corte {fecha} (`{ruta.name}`): cambios seguros que "
             f"publica el bot. Lo dudoso ({len(cl['dudosos'])} casos) va en un PR de revisión aparte.", "",
             "| id | ficha | anterior | nuevo | cambio | existencia |", "|---|---|---|---|---|---|"]
    filas += [f"| {c['id']} | {c['nombre']} | ${c['anterior']:,.2f} | ${c['precio']:,.2f} | {c['pct']:+.2f} % | {c['existencia']} |"
              for c in cl["seguros"]]
    return "\n".join(filas)


def _ensayar(ent, trabajo: Path, plan: dict) -> None:
    """--seco: imprime el plan y el diff de `datos.js aplicar` en el clon de trabajo y lo deja como estaba."""
    print(json.dumps(plan, ensure_ascii=False, indent=1))
    if not plan["seguros"]:
        return
    with tempfile.TemporaryDirectory() as td:
        ruta = Path(td) / "plan.json"
        ruta.write_text(json.dumps(plan, ensure_ascii=False), encoding="utf-8")
        try:
            print(ent.sh(["node", "scripts/dcam/datos.js", "aplicar", str(ruta), str(trabajo)], cwd=str(trabajo))[1])
            print(ent.sh(["git", "--no-pager", "diff", "--patch-with-stat"], cwd=str(trabajo))[1])
        finally:
            ent.sh(["git", "checkout", "-f", "--", "."], cwd=str(trabajo))
            ent.sh(["git", "clean", "-fd"], cwd=str(trabajo))   # el PDF copiado a public/inventarios/


def correr(seco=False, dir_bot=DIR_BOT, trabajo=TRABAJO, ent=None):
    import publicar
    ent = ent or publicar.Entorno.real(dir_bot, seco=seco)
    ruta_conc = dir_bot / "conciliacion.json"
    conc = _json(ruta_conc, {"procesados": {}})

    def guardar_conc():
        if not seco:   # un ensayo en seco no deja estado
            _guardar(ruta_conc, conc)

    for sha, ruta in pendientes(dir_bot, conc):
        reg = conc["procesados"].setdefault(sha, {"paso": "leido", "catalogos": {}})
        try:   # un inventario que revienta avisa y no tumba la corrida
            inv = leer_inventario(ruta)
            fecha = inv["fecha"]
            c, out = publicar._git(ent, trabajo, "fetch", "--quiet", "origin", "main")
            for orden in (["git", "checkout", "-f", "-B", "bot/lectura", "origin/main"], ["git", "clean", "-fd"]):
                if not c:
                    c, out = ent.sh(orden, cwd=str(trabajo))
            if c:
                ent.avisar(f"⚠️ DCAM conciliación detenida ({ruta.name}): no pude poner el clon de trabajo en origin/main: {out.strip()[-300:]}")
                continue
            datos = leer_datos(trabajo)
            mapa = _json(trabajo / MAPA, {"pendientes": []})
            if mapa.get("pendientes"):
                ent.avisar(f"⚠️ DCAM conciliación detenida: el mapa tiene {len(mapa['pendientes'])} fichas ambiguas sin decidir")
                continue
            completo, clasif = True, []
            for cat, filas in inv["catalogos"].items():
                previas = sorted(f for f in mapa.get(cat, {}) if f < fecha)
                if not previas:
                    ent.avisar(f"⚠️ DCAM conciliación detenida ({cat} {fecha}): no hay inventario anterior en el mapa")
                    completo = False
                    continue
                ant = mapa[cat][previas[-1]]
                try:
                    clasif.append(clasificar(cat, filas, ant["fichas"], datos[cat], ant["manual"]))
                except Exception as e:
                    ent.avisar(f"⚠️ DCAM conciliación detenida ({cat} {fecha}): {type(e).__name__}: {e}")
                    completo = False
            # % sin redondear de lo que CAMBIA, para los ajustes generales de otros catálogos con la misma fecha de
            # corte; los del propio catálogo (un intento anterior, un PDF reemplazado) no cuentan dos veces
            reg.update(fecha=fecha, pcts={cl["catalogo"]: [p for c in cl["candidatos"] if (p := _pct(c["precio"], c["anterior"])) != 0]
                                          for cl in clasif})
            separar(clasif, [p for r in conc["procesados"].values() if r.get("fecha") == fecha
                             for otro, ps in r.get("pcts", {}).items() if otro not in inv["catalogos"] for p in ps])
            for cl in clasif:
                cat = cl["catalogo"]
                fuera = [d for d in cl["dudosos"] if d["tipo"] == "precio_fuera_de_grupo"]
                plan = {"catalogo": cat, "fecha": fecha, "pdf": str(ruta), "v": f"dcam{fecha.replace('-', '')}",
                        "seguros": [{"id": c["id"], "precio": c["precio"], "existencia": c["existencia"]} for c in cl["seguros"]],
                        "esperado_armas": len(datos["armas"]),
                        "mapa": {"manual": MANUAL[cat].format(fecha.replace("-", "_")),
                                 "fichas": {str(c["id"]): c["claves"] for c in cl["seguros"] + fuera}},
                        "cuerpo_pr": _cuerpo_pr(cl, fecha, ruta)}
                print(json.dumps({"catalogo": cat, "seguros": len(cl["seguros"]), "dudosos": len(cl["dudosos"])}, ensure_ascii=False), flush=True)
                if seco:
                    _ensayar(ent, trabajo, plan)
                    continue
                pub = reg["catalogos"].setdefault(cat, {})

                def guardar(p, cat=cat):
                    reg["catalogos"][cat] = p
                    guardar_conc()

                if plan["seguros"]:
                    mapa.setdefault(cat, {})[fecha] = plan["mapa"]   # publicar_seguro lo escribe en su rama
                    pub = publicar.publicar_seguro(ent, trabajo, pub, plan, guardar=guardar)
                    guardar(pub)
                    if pub.get("paso") != "hecho":
                        completo = False   # bloqueado: ya avisó; lo dudoso sale después del merge de lo seguro
                        continue
                # "issue" también es final: claude -p no pudo y el caso ya llegó a Saulo como issue
                if cl["dudosos"] and pub.get("dudoso", {}).get("paso") not in ("hecho", "issue"):
                    pub = publicar.pr_revision(ent, trabajo, pub, {"catalogo": cat, "fecha": fecha, "pdf": str(ruta),
                                                                  "dudosos": cl["dudosos"]})
                    guardar(pub)
                    completo = completo and pub.get("dudoso", {}).get("paso") in ("hecho", "issue")
        except Exception as e:
            ent.avisar(f"⚠️ DCAM conciliación detenida ({ruta.name}): {type(e).__name__}: {e}")
            continue
        if completo and not seco:
            reg["paso"] = "hecho"
        guardar_conc()


def main() -> int:
    ap = argparse.ArgumentParser(description="Conciliación automática DCAM")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("semilla", help="construye el mapa de renglones con PDFs ya conciliados")
    s.add_argument("pdfs", nargs="+")
    s.add_argument("--marcar", action="store_true", help="registra esos PDFs como ya conciliados")
    c = sub.add_parser("correr", help="concilia y publica los inventarios nuevos del vigía")
    c.add_argument("--seco", action="store_true", help="imprime plan y diff; sin push, PR, merge, D1, claude ni Telegram")
    a = ap.parse_args()
    if a.cmd == "semilla":
        semilla([Path(p) for p in a.pdfs], marcar=a.marcar)
    else:
        correr(seco=a.seco)
    return 0


if __name__ == "__main__":
    sys.exit(main())
