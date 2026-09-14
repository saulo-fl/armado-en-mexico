#!/usr/bin/env python3
"""Pruebas de la conciliación automática. Correr: python3 scripts/dcam/test_conciliar.py"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import conciliar  # noqa: E402

INV = conciliar.RAIZ / "public" / "inventarios"


def test_lee_pdf_de_armas_del_11_sep():
    inv = conciliar.leer_inventario(INV / "dcam-existencias-2026-09-11.pdf")
    assert inv["fecha"] == "2026-09-11", inv["fecha"]
    assert list(inv["catalogos"]) == ["armas"], list(inv["catalogos"])
    filas = inv["catalogos"]["armas"]
    assert len(filas) == 204, len(filas)
    p612 = [f for f in filas if f["nombre"].startswith("ESCOPETA CAL. 12 ARMSAN P612")]
    assert [f["ocurrencia"] for f in p612] == [1, 2, 3], p612
    assert all(f["descripcion"] for f in p612)


def test_lee_pdf_combinado_del_6_jul():
    inv = conciliar.leer_inventario(INV / "dcam-existencias-2026-07-06.pdf")
    assert inv["fecha"] == "2026-07-06"
    assert set(inv["catalogos"]) == {"armas", "municiones", "accesorios"}, set(inv["catalogos"])


def test_lee_municiones_y_accesorios_del_11_sep():
    mun = conciliar.leer_inventario(INV / "dcam-municiones-2026-09-11.pdf")["catalogos"]
    acc = conciliar.leer_inventario(INV / "dcam-accesorios-2026-09-11.pdf")["catalogos"]
    assert len(mun["municiones"]) == 42 and len(acc["accesorios"]) == 30


if __name__ == "__main__":
    pruebas = [f for n, f in sorted(globals().items()) if n.startswith("test_")]
    for f in pruebas:
        f()
        print("ok", f.__name__)
    print(f"{len(pruebas)} pruebas OK")
