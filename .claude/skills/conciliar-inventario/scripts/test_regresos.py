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

print("✔ regresos: 7 casos + gemelos y renombres")
