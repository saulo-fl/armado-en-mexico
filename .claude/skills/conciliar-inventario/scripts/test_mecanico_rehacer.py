#!/usr/bin/env python3
# Armado en México — Copyright (C) 2026 Saulo Flores León
# SPDX-License-Identifier: AGPL-3.0-or-later
# Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
# (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

"""Pruebas del --rehacer automático de aplicar-mecanico.py. Correr: python3 test_mecanico_rehacer.py

19-nov-2026: la segunda corrida con la misma fecha saltaba los registros del día (idempotencia)
y el precio principal volvía al PDF anterior; solo 3 de 137 armas quedaron con el precio nuevo."""
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location("mecanico", Path(__file__).parent / "aplicar-mecanico.py")
mec = importlib.util.module_from_spec(spec); spec.loader.exec_module(mec)

HIST = """window.AMX_PRICE_HISTORY_SEED = {
  1: [{ manualId: 'man_dcam_2026_11_17', price: '$10,851.91 MXN', date: '2026-11-17' }, { manualId: 'man_dcam_2026_11_19', price: '$10,802.31 MXN', date: '2026-11-19' }],
};
window.AMX_ARMAS_PRECIOS = { 1: 10802.31 };
"""
M = "window.AMX_PRICE_HISTORY_SEED"


def test_rehace_si_ya_hay_registros_del_dia():
    assert mec.rehacer_si_ya_hay(HIST, M, "man_dcam_2026_11_19", False, "armas") is True


def test_no_rehace_un_dia_nuevo():
    assert mec.rehacer_si_ya_hay(HIST, M, "man_dcam_2026_11_20", False, "armas") is False


def test_respeta_rehacer_explicito():
    assert mec.rehacer_si_ya_hay(HIST, M, "man_dcam_2026_11_20", True, "armas") is True


def test_solo_mira_el_bloque_de_historial():
    # el manualId fuera del historial (semilla de manuales) no cuenta
    otro = "window.AMX_MANUALES_SEED = [{ id: 'man_dcam_2026_11_20' }];\n" + HIST
    assert mec.rehacer_si_ya_hay(otro, M, "man_dcam_2026_11_20", False, "armas") is False


if __name__ == "__main__":
    pruebas = [f for n, f in sorted(globals().items()) if n.startswith("test_")]
    for f in pruebas:
        f(); print("ok", f.__name__)
    print(f"{len(pruebas)} pruebas OK")
