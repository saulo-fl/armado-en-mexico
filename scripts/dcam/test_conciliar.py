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


def test_pdf_sin_paginas_es_valueerror():
    # PyMuPDF se niega a guardar un PDF de 0 páginas ("cannot save with zero pages"),
    # así que se simula con un doble mínimo que solo expone page_count.
    original = conciliar.fitz.open
    conciliar.fitz.open = lambda *a, **k: type("DocVacio", (), {"page_count": 0})()
    try:
        try:
            conciliar.leer_inventario("vacio.pdf")
        except ValueError as e:
            assert "sin páginas" in str(e), e
        else:
            raise AssertionError("no lanzó ValueError")
    finally:
        conciliar.fitz.open = original


def test_pdf_que_no_es_dcam_es_valueerror():
    with tempfile.TemporaryDirectory() as tmp:
        ruta = Path(tmp) / "no-dcam.pdf"
        doc = conciliar.fitz.open()
        pagina = doc.new_page()
        pagina.insert_text((72, 72), "Hola")
        doc.save(str(ruta))
        try:
            conciliar.leer_inventario(ruta)
        except ValueError as e:
            assert "formato no reconocido" in str(e), e
        else:
            raise AssertionError("no lanzó ValueError")


def test_layout_oct_2025_se_detiene():
    # El bot solo lee inventarios nuevos en el layout 2026; el de oct-2025 usa la
    # cabecera acentuada "DIRECCIÓN DE COMERCIALIZACIÓN" y se detiene a propósito.
    try:
        conciliar.leer_inventario(INV / "dcam-existencias-2025-10-03.pdf")
    except ValueError:
        pass
    else:
        raise AssertionError("no lanzó ValueError")


if __name__ == "__main__":
    pruebas = [f for n, f in sorted(globals().items()) if n.startswith("test_")]
    for f in pruebas:
        f()
        print("ok", f.__name__)
    print(f"{len(pruebas)} pruebas OK")
