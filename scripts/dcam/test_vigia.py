#!/usr/bin/env python3
"""Pruebas del vigía DCAM. Correr: python3 scripts/dcam/test_vigia.py"""
import sys
import tempfile
from datetime import datetime
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import vigia  # noqa: E402

FIX = AQUI / "fixtures"
COM = (FIX / "comercializacion.html").read_text(encoding="utf-8")
COS = (FIX / "costos.html").read_text(encoding="utf-8")
AKA = (FIX / "akamai.html").read_text(encoding="utf-8")


def test_lee_la_pagina_real():
    cuerpo = vigia.leer_cuerpo(COM)
    assert vigia.validar(COM, "comercializacion", cuerpo) is None
    tipos = [d["tipo"] for d in vigia.documentos(cuerpo).values()]
    assert tipos.count("existencias") == 3, tipos
    assert tipos.count("requisitos") == 2, tipos
    assert tipos.count("documento") == 3, tipos   # volante, garantías, marco legal
    assert tipos.count("imagen") == 8, tipos      # foto de la entrada + 7 avisos
    assert "Avenida Industria Militar número 1111" in cuerpo["texto"]


def test_pagina_de_costos_es_valida():
    cuerpo = vigia.leer_cuerpo(COS)
    assert vigia.validar(COS, "costos", cuerpo) is None
    assert "DEFENSA-02-001" in cuerpo["texto"]


def test_akamai_es_lectura_invalida():
    motivo = vigia.validar(AKA, "comercializacion", vigia.leer_cuerpo(AKA))
    assert motivo and "Challenge Validation" in motivo, motivo


def test_nombre_archivo():
    url = "https://www.gob.mx/cms/uploads/attachment/file/1103069/ARMAS_11_SEP._2026.pdf"
    assert vigia.nombre_archivo(url) == "1103069_ARMAS_11_SEP._2026.pdf"


if __name__ == "__main__":
    pruebas = [f for n, f in sorted(globals().items()) if n.startswith("test_")]
    for f in pruebas:
        f()
        print("ok", f.__name__)
    print(f"{len(pruebas)} pruebas OK")
