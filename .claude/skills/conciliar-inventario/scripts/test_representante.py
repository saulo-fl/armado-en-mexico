#!/usr/bin/env python3
# Armado en México — Copyright (C) 2026 Saulo Flores León
# SPDX-License-Identifier: AGPL-3.0-or-later
# Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
# (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

"""Autochequeo de la guardia C18 (paso 3b de mapear-existencias, 11-nov-2026).
Uso (desde la raiz del repo):  python3 .claude/skills/conciliar-inventario/scripts/test_representante.py

Caso real: la 196 (Franchi Affinity 3) fija su precio con el renglón LIN/WO
(su dcamRef). El 11-nov no vino, y la variante ELI/WO, que encadena consigo
misma con su renglón del día anterior, publicaba +7.2 % sin pasar la guardia.
"""
import importlib.util, os

_p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mapear-existencias.py")
_spec = importlib.util.spec_from_file_location("mapear", _p)
m = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(m)

DREF = "ESCOPETA CAL.12 FRANCHI AFFINITY3 LIN/WO"
ULTIMO = 24990.49


def ref(name, price):
    return {"name": name, "priceN": price, "fichaId": 196}


# El renglón de referencia que se llama como la ficha era su representante.
assert m.era_representante(ref(DREF, 24986.29), DREF, ULTIMO)
# Uno cuyo precio es el último publicado también (fue el elegido ayer).
assert m.era_representante(ref("OTRO NOMBRE", 24990.49), DREF, ULTIMO)
# Otra variante con otro precio: no lo era; su cadena no prueba nada.
assert not m.era_representante(ref("ESCOPETA CAL.12 FRANCHI AFFINITY3 ELI/WO", 26616.0), DREF, ULTIMO)
# Liga forzada (sin renglón de referencia): tampoco.
assert not m.era_representante(None, DREF, ULTIMO)
# Sin último precio y sin nombre exacto: no hay con qué decidir.
assert not m.era_representante(ref("OTRO", 100.0), DREF, None)

# El elegido por cadena (ELI/WO) no encadena con el último: ok=False y la
# guardia del paso 3b se queda con el último precio.
eli = {"name": "ESCOPETA CAL.12 FRANCHI AFFINITY3 ELI/WO", "priceN": 26782.08, "qty": 5}
syn = {"name": "ESCOPETA 12 GA FRANCHI AFFINITY 3 B SYN", "priceN": 20617.95, "qty": 2}
elegido, motivo, ok = m.elegir_representante([eli, syn], DREF, ULTIMO, [(1.0037, 50), (1.0062, 10)])
assert elegido is eli and motivo == "encadenado" and not ok, (elegido, motivo, ok)

print("test_representante: OK")
