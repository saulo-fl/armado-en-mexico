#!/usr/bin/env python3
# Armado en México — Copyright (C) 2026 Saulo Flores León
# SPDX-License-Identifier: AGPL-3.0-or-later
# Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
# (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

"""Autochequeo de los traslados a armas (mapear-existencias + traslados-armas.json).
Uso (desde la raiz del repo):  python3 .claude/skills/conciliar-inventario/scripts/test_traslados.py
Caso real: 05-nov-2026, el lanzagranadas Colt M203 llegó en el PDF de accesorios
y en el catálogo es un arma (ficha 276).
"""
import importlib.util, json, os, tempfile
from pathlib import Path

_p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mapear-existencias.py")
_spec = importlib.util.spec_from_file_location("mapear", _p)
m = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(m)

M203 = "LANZA GRANADAS CAL.40 mm COLT MOD M203"
TR = {"accesorios": [M203]}

d = Path(tempfile.mkdtemp())
armas = [{"name": "PISTOLA X", "qty": 3, "priceN": 10.0, "idx": 1},
         {"name": "RIFLE Y", "qty": 1, "priceN": 20.0, "idx": 2}]
acc = [{"name": "MIRA Z", "qty": 5, "priceN": 30.0, "idx": 1},
       {"name": M203, "qty": 1, "priceN": 4051.7, "idx": 2}]
(d / "armas.json").write_text(json.dumps({"items": armas}))
(d / "accesorios.json").write_text(json.dumps({"items": acc}))

fallas = 0
def caso(nombre, ok):
    global fallas
    print(("ok   " if ok else "FALLA ") + nombre)
    fallas += not ok

r = m.aplicar_traslados(d / "armas.json", armas, TR)
caso("armas recibe el renglón trasladado", [x["name"] for x in r] == ["PISTOLA X", "RIFLE Y", M203])
caso("el trasladado lleva idx nuevo (sin chocar)", r[-1]["idx"] == 3 and r[-1]["priceN"] == 4051.7)
caso("no muta la lista original", len(armas) == 2)

r = m.aplicar_traslados(d / "accesorios.json", acc, TR)
caso("accesorios ya no lo cuenta", [x["name"] for x in r] == ["MIRA Z"])

r = m.aplicar_traslados(d / "cartuchos.json", acc, TR)
caso("otra categoría no se toca", r == acc)

r = m.aplicar_traslados(d / "prueba.json", armas, TR)
caso("un archivo con otro nombre no se toca", r == armas)

(d / "accesorios.json").unlink()
r = m.aplicar_traslados(d / "armas.json", armas, TR)
caso("sin PDF de origen ese día, armas queda igual", r == armas)

caso("sin traslados no cambia nada", m.aplicar_traslados(d / "armas.json", armas, {}) == armas)

print(f"\n{'TODO OK' if not fallas else f'{fallas} FALLA(S)'}")
raise SystemExit(1 if fallas else 0)
