#!/usr/bin/env python3
# Armado en México — Copyright (C) 2026 Saulo Flores León
# SPDX-License-Identifier: AGPL-3.0-or-later
# Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
# (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

"""Autochequeo de la detección de regresos tras agotarse (mapear-existencias --regresos).
Uso (desde la raiz del repo):  python3 .claude/skills/conciliar-inventario/scripts/test_regresos.py
Los casos son los reales que antes tenían que resolver el solucionador o un humano
(07-oct armas, 02-oct y 09-oct cartuchos), reducidos a lo mínimo.
"""
import importlib.util, os

_p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mapear-existencias.py")
_spec = importlib.util.spec_from_file_location("mapear", _p)
m = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(m)


def fila(name, price, qty=100):
    return {"name": name, "priceN": price, "qty": qty, "desc": ""}


# Catálogo: 6 fichas presentes hoy (subieron x1.0574 desde el 15-sep, la mediana)
# + 2 de un tramo que subió distinto (x1.0245) + las que regresan.
hist = {str(i): {"dcamRef": f"OTRA {i}", "regs": [["2026-09-15", 10.0]]} for i in range(1, 7)}
hist["7"] = {"dcamRef": "SAGA A", "regs": [["2026-09-15", 20.0]]}
hist["8"] = {"dcamRef": "SAGA B", "regs": [["2026-09-15", 30.0]]}
precios_hoy = {i: 10.574 for i in range(1, 7)}
precios_hoy.update({7: 20.49, 8: 30.735})

hist["2093"] = {"dcamRef": "CARTUCHO CALIBRE .380” AUTO, MARCA FEDE.", "regs": [["2026-09-15", 11.92]]}
hist["2079"] = {"dcamRef": "CART. CAL12 SAGA SPORTING 28GR MUN7.5", "regs": [["2026-09-15", 9.40]]}
hist["2100"] = {"dcamRef": "PRECIO RARO", "regs": [["2026-09-15", 10.0]]}
hist["2074"] = {"dcamRef": "RIO P4", "regs": [["2026-09-15", 10.0]]}
hist["2104"] = {"dcamRef": "RIO P4", "regs": [["2026-09-15", 10.0]]}
hist["2200"] = {"dcamRef": "SIN HISTORIA", "regs": []}

items = [
    fila("CARTUCHO CALIBRE .380” AUTO, MARCA FEDE.", 12.61),   # 0 aumento general (x1.0579)
    fila("CART. CAL12 SAGA SPORTING 28GR MUN7.5", 9.63),       # 1 tramo Saga (x1.0245)
    fila("PRECIO RARO", 11.50),                                # 2 x1.15: no cuadra
    fila("RIO P4", 10.57),                                     # 3 dcamRef compartido
    fila("SIN HISTORIA", 5.0),                                 # 4 sin registro previo
    fila("NADA QUE VER", 7.0),                                 # 5 alta de verdad
    fila("OTRA 1", 10.574),                                    # 6 ficha que ya tiene renglón
]
ok, det, rech = m.detectar_regresos(items, list(range(len(items))), dict(precios_hoy), hist)

assert ok == {0: 2093, 1: 2079}, ok
motivos = {r["idx"]: r["motivo"] for r in det + rech}
assert motivos[0] == "aumento general", motivos
assert motivos[1].startswith("mismo aumento que 2 fichas"), motivos
assert "no cuadra" in motivos[2], motivos
assert "compartido" in motivos[3], motivos
assert "sin registro" in motivos[4], motivos
assert 5 not in motivos, "un nombre sin ficha no es regreso: va a altas"
assert "ya tiene renglón" in motivos[6], motivos

# Con un solo apoyo el tramo no basta: hacen falta 2 fichas con la misma razón.
r, motivo, _ = m.cuadra_regreso(1.0245, [1.0574] * 5 + [1.0245])
assert not r, motivo
r, motivo, _ = m.cuadra_regreso(1.0245, [1.0574] * 5 + [1.0245, 1.02452])
assert r, motivo

# --- Gemelos: mismo nombre exacto y mismo precio que un renglón ya ligado ---
A, B = fila("ATROX SB", 13511.62, 1), fila("ATROX SB", 13511.62, 6)
g = m.ligar_gemelos([A, B], [1], {99: [A]})
assert g == {1: 99}, g
# ligado a dos fichas distintas con ese nombre: ambiguo, no se liga
g = m.ligar_gemelos([A, A, B], [2], {99: [A], 100: [A]})
assert g == {}, g
# precio distinto (> 0.005): no es gemelo
g = m.ligar_gemelos([A, fila("ATROX SB", 13511.63, 6)], [1], {99: [A]})
assert g == {}, g

# --- Regreso renombrado: otra notación del calibre ---
assert m._clave_calibre("RIFLE CAL22 TIPPMANN") == m._clave_calibre("RIFLE 0.22 TIPPMANN")     == m._clave_calibre("RIFLE CAL. 22 TIPPMANN") == m._clave_calibre("RIFLE .22 TIPPMANN")
assert m._clave_calibre("PISTOLA 0.380") == m._clave_calibre("PISTOLA CALIBRE 380")
h2 = dict(hist)
h2["81"] = {"dcamRef": "RIFLE 0.22 TIPPMANN M4-22 REDLINE", "regs": [["2026-09-15", 20.0]]}
ph = dict(precios_hoy)
r_ok = [fila("RIFLE CAL22 TIPPMANN M4-22 REDLINE", 20.0 * 1.0574)]
ok, det, rech = m.detectar_regresos(r_ok, [0], ph, h2)
assert ok == {0: 81} and "renombre" in det[0]["motivo"], (ok, det, rech)
# el precio no cuadra (razón 0.85 con la mediana en 1.0574): rechazo con pista
r_mal = [fila("RIFLE CAL22 TIPPMANN M4-22 REDLINE", 20.0 * 0.85)]
ok, det, rech = m.detectar_regresos(r_mal, [0], ph, h2)
assert ok == {} and rech[0]["fichaId"] == 81 and "renombre" in rech[0]["motivo"], (ok, rech)
# la forma canónica apunta a 2 fichas: no se adivina
h3 = dict(h2)
h3["82"] = {"dcamRef": "RIFLE .22 TIPPMANN M4-22 REDLINE", "regs": [["2026-09-15", 20.0]]}
ok, det, rech = m.detectar_regresos(r_ok, [0], ph, h3)
assert ok == {} and "compartido" in rech[0]["motivo"], (ok, rech)
# ...pero si una de las dos ya tiene renglón hoy, la otra es la única candidata
ok, det, rech = m.detectar_regresos(r_ok, [0], dict(ph, **{"82": 21.0}), h3)
assert ok == {0: 81}, (ok, rech)

# Gemelo: el mismo nombre ligado a OTRA ficha con qty 0 también cuenta (no se liga)
Z = fila("ATROX SB", 13511.62, 0)
g = m.ligar_gemelos([A, Z, B], [2], {99: [A], 100: [Z]})
assert g == {}, g

# Clave de calibre acotada: lo que no es calibre no colisiona
assert m._clave_calibre("BOLSA 0.5") != m._clave_calibre("BOLSA 5")
assert m._clave_calibre("TUBO 1.22") != m._clave_calibre("TUBO 122")
assert m._clave_calibre("RIFLE M4-22") == m._norm_nombre("RIFLE M4-22")
assert m._clave_calibre("PISTOLA CAL 9") == m._norm_nombre("PISTOLA CAL 9")

# Renombre cuya única candidata ya tiene renglón: rechazo con pista, no silencio
ok, det, rech = m.detectar_regresos(r_ok, [0], dict(ph, **{"81": 21.0}), h2)
assert ok == {} and rech[0]["fichaId"] == 81 and "ya tiene renglón" in rech[0]["motivo"], (ok, rech)

# Integración (paso 3d): gemelo de un regreso (ficha ligada por forzado) suma qty,
# sale de sinFicha y aparece en gemelos, sin duplicarse en regresosRechazados.
import json, tempfile
with tempfile.TemporaryDirectory() as td:
    ref = os.path.join(td, "referencia-cartuchos.json")
    json.dump({"rows": [{"name": f"OTRA {i}", "priceN": 10.0, "fichaId": i} for i in range(1, 7)]}, open(ref, "w"))
    nom = "CARTUCHO CALIBRE .380” AUTO, MARCA FEDE."
    nuevos = [fila(f"OTRA {i}", 10.574) for i in range(1, 7)] + [fila(nom, 12.61, 5), fila(nom, 12.61, 3)]
    res = m.map_existencias(ref, nuevos, historial=hist)
assert res["existencias"][2093] == 8, res["existencias"]
assert [(g["idx"], g["fichaId"], g["qty"]) for g in res["gemelos"]] == [(7, 2093, 3)], res["gemelos"]
assert res["sinFicha"] == [] and res["regresosRechazados"] == [], (res["sinFicha"], res["regresosRechazados"])

# Falso positivo: 92 y 212 comparten dcamRef y precio; el segundo renglón NO es gemelo
# de la 92, conserva su rechazo «compartido» y se queda en sinFicha.
ARM = "ESCOPETA CAL. 12 ARMSAN P612 A.C."
h4 = dict(hist, **{"92": {"dcamRef": ARM, "regs": [["2026-09-15", 10.0]]},
                   "212": {"dcamRef": ARM, "regs": [["2026-09-15", 10.0]]}})
with tempfile.TemporaryDirectory() as td:
    ref = os.path.join(td, "referencia-armas.json")
    json.dump({"rows": [{"name": f"OTRA {i}", "priceN": 10.0, "fichaId": i} for i in range(1, 7)]
               + [{"name": ARM, "priceN": 10.0, "fichaId": 92}]}, open(ref, "w"))
    nuevos = [fila(f"OTRA {i}", 10.574) for i in range(1, 7)] + [fila(ARM, 10.574, 2), fila(ARM, 10.574, 1)]
    res = m.map_existencias(ref, nuevos, historial=h4)
assert res["existencias"][92] == 2 and res["gemelos"] == [], (res["existencias"], res["gemelos"])
assert [x["idx"] for x in res["sinFicha"]] == [7], res["sinFicha"]
assert "compartido" in res["regresosRechazados"][0]["motivo"], res["regresosRechazados"]

# --- 21-oct-2026 (C14) ---
# (a) Precio caro que NO cambió con un factor del día ≠ 1: antes un prefiltro de
# ±2 MXN absolutos lo dejaba sin pareja (HM-7: 18,648.29 con x0.999712 → 5.37 MXN).
REF = [{"name": f"OTRA {i}", "priceN": 1000.0 * i, "fichaId": i} for i in range(1, 7)]
REF.append({"name": "PISTOLA HM-7", "priceN": 18648.29, "fichaId": 15})
NUEVOS = [fila(f"OTRA {i}", round(1000.0 * i * 0.999712, 2)) for i in range(1, 7)]
NUEVOS.append(fila("PISTOLA HM-7", 18648.29, 2))
mt, sin = m.match_rows(REF, NUEVOS, m.find_factors(REF, NUEVOS))
assert 6 in {ni for ni, _, _ in mt} and 6 not in sin, (mt, sin)

# (b) Renglón que encadena con un renglón de la referencia SIN fichaId: antes se
# perdía en silencio. Ahora pasa por regresos (dcamRef exacto + aumento general)
# y, si nadie lo liga, sale en sinDueno (no en sinFicha: no es nuevo).
h5 = {str(i): {"dcamRef": f"OTRA {i}", "regs": [["2026-09-15", 10.0]]} for i in range(1, 7)}
h5["223"] = {"dcamRef": "BERETTA DT11 BLACKTRAP", "regs": [["2026-09-15", 200.0]]}
with tempfile.TemporaryDirectory() as td:
    ref = os.path.join(td, "referencia-armas.json")
    json.dump({"pdfDate": "2026-10-02", "pdfFile": "armas",
               "rows": [{"name": f"OTRA {i}", "priceN": 10.0, "fichaId": i} for i in range(1, 7)]
               + [{"name": "BERETTA DT11 BLACKTRAP", "priceN": 200.0, "fichaId": None},
                  {"name": "AYA CENTENARY", "priceN": 400.0, "fichaId": None}]}, open(ref, "w"))
    nuevos = [fila(f"OTRA {i}", 10.574) for i in range(1, 7)] + [
        fila("BERETTA DT11 BLACKTRAP", 211.48, 1), fila("AYA CENTENARY", 422.96, 2)]
    res = m.map_existencias(ref, nuevos, historial=h5)
    assert res["existencias"].get(223) == 1, res["existencias"]
    assert [r["fichaId"] for r in res["regresos"]] == [223], res["regresos"]
    assert [s["name"] for s in res["sinDueno"]] == ["AYA CENTENARY"], res["sinDueno"]
    assert res["sinFicha"] == [], res["sinFicha"]
    # (c) --update-ref: el regreso queda ligado, el sin dueño sigue en null, y
    # pdfDate pasa a la fecha del inventario (antes se copiaba la vieja).
    m.update_ref(ref, nuevos, res, os.path.join(td, "armas.json"), "2026-10-21")
    nueva = json.load(open(ref))
    assert nueva["pdfDate"] == "2026-10-21", nueva["pdfDate"]
    por_nombre = {r["name"]: r["fichaId"] for r in nueva["rows"]}
    assert por_nombre["BERETTA DT11 BLACKTRAP"] == 223 and por_nombre["AYA CENTENARY"] is None, por_nombre
    assert len(nueva["rows"]) == len(nuevos), len(nueva["rows"])

print("✔ regresos: 7 casos + gemelos, renombres, integración y C14 (prefiltro, sin dueño, pdfDate)")
