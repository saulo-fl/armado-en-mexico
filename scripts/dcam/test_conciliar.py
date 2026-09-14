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


def _fila(nombre, oc, desc, qty, precio):
    return {"nombre": nombre, "ocurrencia": oc, "descripcion": desc, "existencia": qty, "precio": precio}


def _ficha(fid, precio, manual="man_a", qty=None, existencia=None):
    reg = {"manualId": manual, "price": f"${precio:,.2f} MXN", "date": "2026-07-06"}
    if qty is not None:
        reg["qty"] = qty
    return {"id": fid, "nombre": f"F{fid}", "hist": [reg], "existencia": existencia}


def test_construir_mapeo_exacto_suma_y_ambiguo():
    filas = [_fila("A", 1, "a", 5, 100.0), _fila("B", 1, "b", 2, 200.0), _fila("B", 2, "b2", 3, 200.0),
             _fila("C", 1, "c", 1, 300.0), _fila("D", 1, "d", 1, 300.0)]
    fichas = [_ficha(1, 100.0, existencia=5), _ficha(2, 200.0, existencia=5), _ficha(3, 300.0, existencia=1)]
    mapa, ambiguos = conciliar.construir_mapeo("armas", filas, fichas, "man_a")
    assert mapa["1"] == [{"nombre": "A", "ocurrencia": 1, "descripcion": "a", "representativo": True}], mapa
    assert [c["ocurrencia"] for c in mapa["2"]] == [1, 2] and mapa["2"][0]["representativo"], mapa["2"]
    assert "3" not in mapa and ambiguos[0]["id"] == 3 and len(ambiguos[0]["candidatos"]) == 2, ambiguos


def test_construir_mapeo_renglon_compartido_es_ambiguo():
    filas = [_fila("A", 1, "a", 5, 100.0)]
    fichas = [_ficha(1, 100.0, existencia=5), _ficha(2, 100.0, existencia=5)]
    mapa, ambiguos = conciliar.construir_mapeo("armas", filas, fichas, "man_a")
    assert mapa == {} and {a["id"] for a in ambiguos} == {1, 2}, (mapa, ambiguos)


def test_construir_mapeo_suma_variantes_del_mismo_nombre_con_otro_precio():
    # Caso real: 178 Huglu Renova del 6-jul = «RENOVA VBN» 1 (madera, su precio, 5 u.) + 2 (sintética, 6 u.).
    filas = [_fila("R", 1, "madera", 5, 100.0), _fila("R", 2, "sintética", 6, 90.0), _fila("X", 1, "x", 8, 100.0)]
    mapa, ambiguos = conciliar.construir_mapeo("armas", filas, [_ficha(1, 100.0, existencia=11)], "man_a")
    assert mapa == {"1": [{"nombre": "R", "ocurrencia": 1, "descripcion": "madera", "representativo": True},
                          {"nombre": "R", "ocurrencia": 2, "descripcion": "sintética", "representativo": False}]}, mapa
    assert ambiguos == [], ambiguos


def test_clasificar_casos():
    mapa = {"1": [{"nombre": "A", "ocurrencia": 1, "descripcion": "a", "representativo": True}],
            "2": [{"nombre": "B", "ocurrencia": 1, "descripcion": "b", "representativo": True}],
            "3": [{"nombre": "C", "ocurrencia": 1, "descripcion": "c", "representativo": True},
                  {"nombre": "C", "ocurrencia": 2, "descripcion": "c2", "representativo": False}],
            "4": [{"nombre": "D", "ocurrencia": 1, "descripcion": "d", "representativo": True}]}
    fichas = [_ficha(i, 100.0) for i in (1, 2, 3, 4)]
    nuevos = [_fila("A", 1, "a", 7, 97.12), _fila("C", 1, "c", 1, 90.0),
              _fila("D", 1, "otra descripción", 1, 97.12), _fila("E", 1, "e", 2, 50.0)]
    r = conciliar.clasificar("armas", nuevos, mapa, fichas, "man_a")
    assert [c["id"] for c in r["candidatos"]] == [1] and r["candidatos"][0]["pct"] == -2.88, r
    tipos = sorted((d["tipo"], d.get("id")) for d in r["dudosos"])
    assert tipos == [("agotado", 2), ("descripcion", 4), ("renglon_nuevo", None), ("variante", 3)], tipos


def test_separar_por_grupos():
    cands = [{"id": i, "pct": -2.88} for i in range(5)] + [{"id": 9, "pct": -2.84}, {"id": 10, "pct": 0.0},
                                                          {"id": 11, "pct": 24.57}]
    cl = [{"catalogo": "armas", "candidatos": cands, "dudosos": []}]
    conciliar.separar(cl)
    assert sorted(s["id"] for s in cl[0]["seguros"]) == [0, 1, 2, 3, 4, 9, 10], cl
    assert [d["id"] for d in cl[0]["dudosos"]] == [11] and cl[0]["dudosos"][0]["tipo"] == "precio_fuera_de_grupo"


def _datos_en_commit(commit: str, tmp: Path) -> dict:
    """Instantánea de los data-*.js tal como estaban en `commit` (necesita historial de git)."""
    for f in ["data.js", "data-extra.js", "data-precios.js", "data-accesorios.js", "data-municiones.js"]:
        destino = tmp / "src" / "data" / f
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_bytes(subprocess.run(["git", "-C", str(conciliar.RAIZ), "show", f"{commit}:src/data/{f}"],
                                           check=True, capture_output=True).stdout)
    return conciliar.leer_datos(tmp)


# Fichas cuyo registro del 11-sep cambió DESPUÉS de conciliar por decisiones de Saulo (variantes,
# presentación, auditoría de historiales). El implementador las llena al correr la prueba, cada una con
# su motivo verificado en la descripción de #158 o de las decisiones de #161. Ninguna otra puede fallar.
EXCEPCIONES_REPRODUCCION: dict[int, str] = {
    2: "#176 (decisión 4 de #161): existencia clase A sumada, 14 → 29",
    10: "#176 (decisión 4 de #161): existencia clase A sumada, 36 → 37",
    11: "#176 (decisión 4 de #161): existencia clase A sumada, 50 → 56",
    13: "#158 (890610d): la variante bronce pasó a la alta 218; la 13 queda agotada sin registro del 11-sep",
    24: "#158 (890610d, ba3678c): «GX4 CO PAVON» es presentación de la 24 y suma su existencia, 11 → 17",
    26: "#158 (890610d): sus registros eran «GX4 CO PAVON» (→ 24); la 26 sigue «GX4 CARRY», $7,195.87 y 10 u.",
    27: "#176 (decisión 4 de #161): existencia clase A sumada, 11 → 28",
    41: "#176 (decisión 4 de #161): existencia clase A sumada, 20 → 48",
    46: "#158 (890610d): el renglón C102mm es la C9 Compact (→ 220); la 46 sigue la C9 FS, $11,074.36 y 4 u.",
    49: "#176 (decisión 4 de #161): existencia clase A sumada, 4 → 6",
    57: "#176 (decisión 1 de #161): la 57 es American + LH, existencia 5 → 12 (altas 227, 228 y 229)",
    59: "#158 (890610d): su registro del 6-jul era el renglón .243 (→ 210); la 59 (.308) sigue el #114, 10 u.",
    61: "#176 (decisión 2 de #161): la 61 queda agotada con $18,506.91; la Outfitter pasa a la alta 230",
    126: "#158 (890610d): representativo pavón → inox y suma de los tres renglones 82S, $9,873.60 y 43 u.",
    129: "#176 (decisión 4 de #161): existencia clase A sumada, 2 → 6",
    132: "#176 (decisión 4 de #161): existencia clase A sumada, 23 → 32",
    137: "#176 (decisión 4 de #161): existencia clase A sumada, 7 → 15",
    141: "#176 (decisión 4 de #161): existencia clase A sumada, 3 → 5",
}


def test_reproduccion_armas_6_jul_a_11_sep():
    base = "41137eb"  # main justo antes de mergear la conciliación del 11-sep (#158): datos del 6-jul
    with tempfile.TemporaryDirectory() as t:
        antes = _datos_en_commit(base, Path(t))
    ahora = conciliar.leer_datos(conciliar.RAIZ)
    jul = conciliar.leer_inventario(INV / "dcam-existencias-2026-07-06.pdf")["catalogos"]["armas"]
    sep = conciliar.leer_inventario(INV / "dcam-existencias-2026-09-11.pdf")["catalogos"]["armas"]
    mapa, _amb = conciliar.construir_mapeo("armas", jul, antes["armas"], "man_dcam_2026_07_06")
    cl = [conciliar.clasificar("armas", sep, mapa, antes["armas"], "man_dcam_2026_07_06")]
    conciliar.separar(cl)
    seguros = cl[0]["seguros"]
    assert len(seguros) >= 60, len(seguros)
    por_id = {f["id"]: f for f in ahora["armas"]}
    fallos = []
    for s in seguros:
        actual = por_id.get(s["id"])  # una ficha fusionada o renumerada después también es fallo
        reg = conciliar.registro_de(actual or {"hist": []}, "man_dcam_2026_09_11")
        if not reg or reg["price"] != f"${s['precio']:,.2f} MXN" or actual["existencia"] != s["existencia"]:
            fallos.append(s["id"])
    assert set(fallos) <= set(EXCEPCIONES_REPRODUCCION), sorted(set(fallos) - set(EXCEPCIONES_REPRODUCCION))
    dudosos = {d.get("id") for d in cl[0]["dudosos"]}
    assert {100, 155, 161, 178}.issubset(dudosos), sorted(i for i in dudosos if i)


if __name__ == "__main__":
    pruebas = [f for n, f in sorted(globals().items()) if n.startswith("test_")]
    for f in pruebas:
        f()
        print("ok", f.__name__)
    print(f"{len(pruebas)} pruebas OK")
