#!/usr/bin/env python3
# Armado en México — Copyright (C) 2026 Saulo Flores León
# SPDX-License-Identifier: AGPL-3.0-or-later
# Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
# (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

"""Autochequeo de verificar-cierre.py (saltos de precio).
Uso (desde la raiz del repo):  python3 .claude/skills/conciliar-inventario/scripts/test_verificar_cierre.py

Caso real 10-nov-2026: la ficha de accesorios 125 tenía el 06-nov un registro DCAM
(man_acc_2026_11_06, 678.41) y otro de OTCA-Monterrey (man_acc_otca_2026_11_06,
652.10). El prefijo «man_acc_» casaba también con el de OTCA, así que el registro
OTCA contaba como «DCAM anterior» y el aumento general de hoy (x0.9955) se leía
como un salto de x1.0356. Corre el script de verdad (CLI) sobre un src/data mínimo.
"""
import json, os, subprocess, sys, tempfile

SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "verificar-cierre.py")
HOY, ANT = "2026-11-10", "2026-11-06"


def reg(mid, precio, fecha):
    return {"manualId": mid, "price": f"${precio:.2f} MXN", "date": fecha, "qty": 1}


def dcam(p, f):
    return reg("man_acc_" + f.replace("-", "_"), p, f)


def otca(p, f):
    return reg("man_acc_otca_" + f.replace("-", "_"), p, f)


def correr(hist):
    with tempfile.TemporaryDirectory() as d:
        os.makedirs(os.path.join(d, "src", "data"))
        os.makedirs(os.path.join(d, "w"))
        with open(os.path.join(d, "src", "data", "data-accesorios.js"), "w") as f:
            f.write("window.ACCESORIOS_PRICE_HISTORY = " + json.dumps(hist) + ";\n")
        r = subprocess.run([sys.executable, SCRIPT, "--workdir", os.path.join(d, "w"), "--fecha", HOY],
                           cwd=d, capture_output=True, text=True)
        return r.returncode, json.loads(r.stdout), r.stderr


# 6 fichas que siguieron el aumento general (x0.9955); tres con registro OTCA más barato
# el mismo 06-nov (no deben mover la mediana general).
base = {}
for i in range(1, 7):
    h = [dcam(100.0, ANT)]
    if i <= 3:
        h.append(otca(90.0, ANT))
    h.append(dcam(99.55, HOY))
    base[str(i)] = h
base["125"] = [dcam(678.41, ANT), otca(652.10, ANT), dcam(675.33, HOY)]

# 1) El caso del 10-nov: sin hallazgos.
rc, inf, err = correr(base)
assert rc == 0, f"falso positivo por el registro OTCA:\n{err}"
s125 = [x for x in inf["saltos"] if x["id"] == "125"]
assert not s125, f"la 125 no debía salir como salto: {s125}"

# 2) Un salto DCAM real sigue saliendo aunque haya registro OTCA de por medio.
h = dict(base)
h["9"] = [dcam(500.0, ANT), otca(480.0, ANT), dcam(560.0, HOY)]
rc, inf, err = correr(h)
assert rc == 1 and "accesorios:9: salto 500 (2026-11-06)" in err, err
assert "accesorios:125" not in err, err

print("test_verificar_cierre: OK")
