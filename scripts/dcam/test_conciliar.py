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
    assert mapa["1"] == [{"nombre": "A", "ocurrencia": 1, "descripcion": "a", "representativo": True,
                          "precio": 100.0}], mapa
    assert [c["ocurrencia"] for c in mapa["2"]] == [1, 2] and mapa["2"][0]["representativo"], mapa["2"]
    assert "3" not in mapa and ambiguos[0]["id"] == 3 and len(ambiguos[0]["candidatos"]) == 2, ambiguos
    # la suma queda en el mapa, pero Saulo la confirma antes de activar
    assert [(a["id"], a["motivo"], a["propuesta"]) for a in ambiguos[1:]] == [(2, "confirmar suma", mapa["2"])], ambiguos


def test_construir_mapeo_renglon_compartido_es_ambiguo():
    filas = [_fila("A", 1, "a", 5, 100.0)]
    fichas = [_ficha(1, 100.0, existencia=5), _ficha(2, 100.0, existencia=5)]
    mapa, ambiguos = conciliar.construir_mapeo("armas", filas, fichas, "man_a")
    assert mapa == {} and {a["id"] for a in ambiguos} == {1, 2}, (mapa, ambiguos)
    assert all(isinstance(a["candidatos"], list) and a["motivo"] == "renglón compartido con otra ficha"
               for a in ambiguos), ambiguos


def test_construir_mapeo_suma_variantes_del_mismo_nombre_con_otro_precio():
    # Caso real: 178 Huglu Renova del 6-jul = «RENOVA VBN» 1 (madera, su precio, 5 u.) + 2 (sintética, 6 u.).
    filas = [_fila("R", 1, "madera", 5, 100.0), _fila("R", 2, "sintética", 6, 90.0), _fila("X", 1, "x", 8, 100.0)]
    mapa, ambiguos = conciliar.construir_mapeo("armas", filas, [_ficha(1, 100.0, existencia=11)], "man_a")
    propuesta = [{"nombre": "R", "ocurrencia": 1, "descripcion": "madera", "representativo": True, "precio": 100.0},
                 {"nombre": "R", "ocurrencia": 2, "descripcion": "sintética", "representativo": False, "precio": 90.0}]
    assert mapa == {"1": propuesta}, mapa
    assert [(a["id"], a["motivo"], a["propuesta"]) for a in ambiguos] == [(1, "confirmar suma", propuesta)], ambiguos


def test_construir_mapeo_dos_sumas_posibles_es_ambiguo():
    filas = [_fila("R", 1, "r", 5, 100.0), _fila("R", 2, "r2", 6, 90.0),
             _fila("S", 1, "s", 5, 100.0), _fila("S", 2, "s2", 6, 80.0)]
    mapa, ambiguos = conciliar.construir_mapeo("armas", filas, [_ficha(1, 100.0, existencia=11)], "man_a")
    assert mapa == {} and [a["id"] for a in ambiguos] == [1] and len(ambiguos[0]["candidatos"]) == 2, ambiguos


def test_construir_mapeo_suma_con_renglon_de_otra_ficha_es_ambiguo():
    filas = [_fila("R", 1, "r", 5, 100.0), _fila("R", 2, "r2", 6, 90.0)]
    fichas = [_ficha(1, 100.0, existencia=11), _ficha(2, 90.0, existencia=6)]   # la 2 es exacta con R 2
    mapa, ambiguos = conciliar.construir_mapeo("armas", filas, fichas, "man_a")
    assert "1" not in mapa and 1 in {a["id"] for a in ambiguos}, (mapa, ambiguos)
    assert all(a["motivo"] != "confirmar suma" for a in ambiguos), ambiguos


def test_clasificar_casos():
    mapa = {"1": [{"nombre": "A", "ocurrencia": 1, "descripcion": "a", "representativo": True, "precio": 100.0}],
            "2": [{"nombre": "B", "ocurrencia": 1, "descripcion": "b", "representativo": True, "precio": 100.0}],
            "3": [{"nombre": "C", "ocurrencia": 1, "descripcion": "c", "representativo": True, "precio": 100.0},
                  {"nombre": "C", "ocurrencia": 2, "descripcion": "c2", "representativo": False, "precio": 100.0}],
            "4": [{"nombre": "D", "ocurrencia": 1, "descripcion": "d", "representativo": True, "precio": 100.0}]}
    fichas = [_ficha(i, 100.0) for i in (1, 2, 3, 4)]
    nuevos = [_fila("A", 1, "a", 7, 97.12), _fila("C", 1, "c", 1, 90.0),
              _fila("D", 1, "otra descripción", 1, 97.12), _fila("E", 1, "e", 2, 50.0)]
    r = conciliar.clasificar("armas", nuevos, mapa, fichas, "man_a")
    assert [c["id"] for c in r["candidatos"]] == [1] and r["candidatos"][0]["pct"] == -2.88, r
    assert r["candidatos"][0]["claves"][0]["precio"] == 97.12, r["candidatos"][0]   # precio nuevo, para el mapa
    tipos = sorted((d["tipo"], d.get("id")) for d in r["dudosos"])
    assert tipos == [("agotado", 2), ("descripcion", 4), ("renglon_nuevo", None), ("variante", 3)], tipos


def test_clasificar_mapa_desincronizado_y_sin_precio():
    mapa = {"1": [{"nombre": "A", "ocurrencia": 1, "descripcion": "a", "representativo": True, "precio": 90.0}],
            "2": [{"nombre": "B", "ocurrencia": 1, "descripcion": "b", "representativo": True}]}
    nuevos = [_fila("A", 1, "a", 1, 97.12), _fila("B", 1, "b", 1, 97.12)]
    r = conciliar.clasificar("armas", nuevos, mapa, [_ficha(1, 100.0), _ficha(2, 100.0)], "man_a")
    tipos = sorted((d["tipo"], d["id"]) for d in r["dudosos"])
    assert r["candidatos"] == [] and tipos == [("mapa_desincronizado", 1), ("mapa_sin_precio", 2)], r


def test_clasificar_renglon_repetido_es_valueerror():
    a = {"nombre": "A", "ocurrencia": 1, "descripcion": "a", "representativo": True, "precio": 100.0}
    casos = [({"1": [a], "2": [a]}, [_fila("A", 1, "a", 1, 100.0)]),                  # mapa: un renglón, dos fichas
             ({"1": [a]}, [_fila("A", 1, "a", 1, 100.0), _fila("A", 1, "a", 2, 100.0)])]   # PDF: clave repetida
    for mapa, nuevos in casos:
        try:
            conciliar.clasificar("armas", nuevos, mapa, [_ficha(1, 100.0), _ficha(2, 100.0)], "man_a")
        except ValueError:
            continue
        raise AssertionError(f"no lanzó ValueError: {mapa} {nuevos}")


def _cand(fid, anterior, precio):
    pct = conciliar._pct(precio, anterior)
    return {"id": fid, "anterior": anterior, "precio": precio, "pct": round(pct, 2), "pcts_filas": [pct]}


def test_separar_por_grupos():
    cands = [_cand(i, 100.0, 97.12) for i in range(5)] + [_cand(9, 100.0, 97.16), _cand(10, 100.0, 100.0),
                                                          _cand(11, 100.0, 124.57)]
    cl = [{"catalogo": "armas", "candidatos": cands, "dudosos": []}]
    conciliar.separar(cl)
    assert sorted(s["id"] for s in cl[0]["seguros"]) == [0, 1, 2, 3, 4, 9, 10], cl
    assert [d["id"] for d in cl[0]["dudosos"]] == [11] and cl[0]["dudosos"][0]["tipo"] == "precio_fuera_de_grupo"


def test_separar_sin_cambio_no_forma_grupo():
    # +$6.86 sobre $147,658.14 redondea a 0.00 %, pero es un cambio y no tiene grupo
    mapa = {"49": [{"nombre": "COLT", "ocurrencia": 1, "descripcion": "c", "representativo": True, "precio": 147658.14}]}
    cl = [conciliar.clasificar("armas", [_fila("COLT", 1, "c", 4, 147665.00)], mapa, [_ficha(49, 147658.14)], "man_a")]
    conciliar.separar(cl)
    assert cl[0]["seguros"] == [] and [d["tipo"] for d in cl[0]["dudosos"]] == ["precio_fuera_de_grupo"], cl
    # cinco sin cambio no convierten un +0.05 % en ajuste general
    cl = [{"catalogo": "armas", "candidatos": [_cand(i, 100.0, 100.0) for i in range(5)] + [_cand(9, 100.0, 100.05)],
           "dudosos": []}]
    conciliar.separar(cl)
    assert sorted(s["id"] for s in cl[0]["seguros"]) == [0, 1, 2, 3, 4] and [d["id"] for d in cl[0]["dudosos"]] == [9]
    # cinco con el mismo cambio sí son ajuste general
    cl = [{"catalogo": "armas", "candidatos": [_cand(i, 100.0, 97.12) for i in range(5)], "dudosos": []}]
    conciliar.separar(cl)
    assert len(cl[0]["seguros"]) == 5 and cl[0]["dudosos"] == [], cl


def test_separar_exige_todas_las_filas_de_la_ficha():
    mapa = {str(i): [{"nombre": f"A{i}", "ocurrencia": 1, "descripcion": "a", "representativo": True, "precio": 100.0}]
            for i in range(4)}
    mapa["9"] = [{"nombre": "C", "ocurrencia": 1, "descripcion": "c", "representativo": True, "precio": 100.0},
                 {"nombre": "C", "ocurrencia": 2, "descripcion": "c2", "representativo": False, "precio": 100.0}]
    nuevos = [_fila(f"A{i}", 1, "a", 1, 97.12) for i in range(4)] + [_fila("C", 1, "c", 1, 97.12),
                                                                     _fila("C", 2, "c2", 1, 500.0)]
    cl = [conciliar.clasificar("armas", nuevos, mapa, [_ficha(i, 100.0) for i in (0, 1, 2, 3, 9)], "man_a")]
    c9 = next(c for c in cl[0]["candidatos"] if c["id"] == 9)
    assert [round(p, 2) for p in c9["pcts_filas"]] == [-2.88, 400.0], c9
    assert [k["precio"] for k in c9["claves"]] == [97.12, 500.0], c9
    conciliar.separar(cl)
    assert sorted(s["id"] for s in cl[0]["seguros"]) == [0, 1, 2, 3] and [d["id"] for d in cl[0]["dudosos"]] == [9], cl


def _datos_en_commit(commit: str, tmp: Path) -> dict:
    """Instantánea de los data-*.js tal como estaban en `commit` (necesita historial de git)."""
    for f in ["data.js", "data-extra.js", "data-precios.js", "data-accesorios.js", "data-municiones.js"]:
        destino = tmp / "src" / "data" / f
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_bytes(subprocess.run(["git", "-C", str(conciliar.RAIZ), "show", f"{commit}:src/data/{f}"],
                                           check=True, capture_output=True).stdout)
    return conciliar.leer_datos(tmp)


# Fichas cuyo registro del 11-sep cambió DESPUÉS de conciliar por decisiones de Saulo (variantes,
# presentación, auditoría de historiales), con los campos que pueden diferir y el motivo verificado en
# #158 o en las decisiones de #161 (#176). Los campos no listados se siguen comprobando.
EXCEPCIONES_REPRODUCCION: dict[int, tuple[set, str]] = {
    2: ({"existencia"}, "#176 (decisión 4 de #161): existencia clase A sumada, 14 → 29"),
    10: ({"existencia"}, "#176 (decisión 4 de #161): existencia clase A sumada, 36 → 37"),
    11: ({"existencia"}, "#176 (decisión 4 de #161): existencia clase A sumada, 50 → 56"),
    13: ({"precio", "existencia"}, "#158 (890610d): la variante bronce pasó a la alta 218; la 13 queda agotada"),
    24: ({"existencia"}, "#158 (890610d, ba3678c): «GX4 CO PAVON» es presentación de la 24 y suma, 11 → 17"),
    26: ({"precio", "existencia"}, "#158 (890610d): sus registros eran «GX4 CO PAVON» (→ 24); sigue «GX4 CARRY»"),
    27: ({"existencia"}, "#176 (decisión 4 de #161): existencia clase A sumada, 11 → 28"),
    41: ({"existencia"}, "#176 (decisión 4 de #161): existencia clase A sumada, 20 → 48"),
    46: ({"precio", "existencia"}, "#158 (890610d): el renglón C102mm es la C9 Compact (→ 220); la 46 es la C9 FS"),
    49: ({"existencia"}, "#176 (decisión 4 de #161): existencia clase A sumada, 4 → 6"),
    57: ({"existencia"}, "#176 (decisión 1 de #161): la 57 es American + LH, existencia 5 → 12"),
    59: ({"existencia"}, "#158 (890610d): su registro del 6-jul era el renglón .243 (→ 210); la .308 tiene 10 u."),
    61: ({"precio", "existencia"}, "#176 (decisión 2 de #161): la 61 queda agotada; la Outfitter pasa a la alta 230"),
    126: ({"precio", "existencia"}, "#158 (890610d): representativo pavón → inox y suma de los tres renglones 82S"),
    129: ({"existencia"}, "#176 (decisión 4 de #161): existencia clase A sumada, 2 → 6"),
    132: ({"existencia"}, "#176 (decisión 4 de #161): existencia clase A sumada, 23 → 32"),
    137: ({"existencia"}, "#176 (decisión 4 de #161): existencia clase A sumada, 7 → 15"),
    141: ({"existencia"}, "#176 (decisión 4 de #161): existencia clase A sumada, 3 → 5"),
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
        distintos = set()
        if not reg or reg["price"] != f"${s['precio']:,.2f} MXN":
            distintos.add("precio")
        if not actual or actual["existencia"] != s["existencia"]:
            distintos.add("existencia")
        no_explicados = distintos - EXCEPCIONES_REPRODUCCION.get(s["id"], (set(), ""))[0]
        if no_explicados:
            fallos.append((s["id"], sorted(no_explicados)))
    assert not fallos, fallos
    dudosos = {d.get("id") for d in cl[0]["dudosos"]}
    assert {77, 100, 135, 155, 161, 178}.issubset(dudosos), sorted(i for i in dudosos if i)


if __name__ == "__main__":
    pruebas = [f for n, f in sorted(globals().items()) if n.startswith("test_")]
    for f in pruebas:
        f()
        print("ok", f.__name__)
    print(f"{len(pruebas)} pruebas OK")
