#!/usr/bin/env python3
# Armado en México — Copyright (C) 2026 Saulo Flores León
# SPDX-License-Identifier: AGPL-3.0-or-later
# Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
# (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

"""Pruebas del vigía DCAM. Correr: python3 scripts/dcam/test_vigia.py"""
import http.client
import sys
import tempfile
from datetime import datetime, timedelta
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


def test_comparar():
    prev = {"a": {"sha256": "1"}, "b": {"sha256": "2"}, "c": {"sha256": "3"}, "d": {"sha256": "4"}}
    act = {"a": {"sha256": "1"}, "b": {"sha256": "X"}, "e": {"sha256": "5"}}
    r = vigia.comparar(prev, act, fallidos={"d"})
    assert r == {"nuevos": ["e"], "cambiados": ["b"], "retirados": ["c"]}, r


def test_diff_ignora_espacios():
    assert vigia.diff_texto("Lunes a  Viernes\n08:00", "Lunes a Viernes \n 08:00") == []
    assert vigia.diff_texto("Tel 1\nTel 2", "Tel 1\nTel 3") == ["- Tel 2", "+ Tel 3"]


def test_estado_ida_y_vuelta():
    with tempfile.TemporaryDirectory() as tmp:
        ruta = Path(tmp) / "estado.json"
        assert vigia.cargar_estado(ruta) is None
        vigia.guardar_estado(ruta, {"textos": {"x": "Número"}})
        assert vigia.cargar_estado(ruta) == {"textos": {"x": "Número"}}
        assert not ruta.with_suffix(".tmp").exists()


def test_fecha():
    assert vigia.fecha(datetime(2026, 9, 4, 20, 0)) == "04-SEP-2026"


def _bajador(paginas: dict, archivos: dict):
    def bajar(url):
        if url in paginas:
            return paginas[url].encode("utf-8")
        if url in archivos:
            return archivos[url]
        raise OSError(f"sin fixture: {url}")
    return bajar


def _archivos_de(html):
    return {u: u.encode() for u in vigia.documentos(vigia.leer_cuerpo(html))}


def test_corrida_completa():
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        paginas = {vigia.PAGINAS["comercializacion"]: COM, vigia.PAGINAS["costos"]: COS}
        archivos = _archivos_de(COM)
        dia1 = datetime(2026, 9, 14, 20, 0)

        codigo, msgs = vigia.correr(_bajador(paginas, archivos), base, dia1, reintento_seg=0)
        assert codigo == 0
        assert len(msgs) == 1 and "estado inicial: 16 documentos" in msgs[0]["texto"], msgs
        assert len(list((base / "archivo" / "2026-09-14").iterdir())) == 16

        codigo, msgs = vigia.correr(_bajador(paginas, archivos), base, dia1, reintento_seg=0)
        assert codigo == 0 and len(msgs) == 1 and "sin cambios" in msgs[0]["texto"], msgs

        # Sale un inventario nuevo de armas (otro id, otro nombre) y cambia el horario.
        com2 = (COM.replace("1103069/ARMAS_11_SEP._2026.pdf", "1200000/ARMAS_20_SEP._2026.pdf")
                   .replace("08:00 a 14:00", "08:00 a 13:00"))
        paginas[vigia.PAGINAS["comercializacion"]] = com2
        dia2 = datetime(2026, 9, 20, 20, 0)
        codigo, msgs = vigia.correr(_bajador(paginas, _archivos_de(com2)), base, dia2, reintento_seg=0)
        assert codigo == 0
        inv = [m for m in msgs if m["texto"].startswith("📦 Inventario nuevo DCAM: Existencias de Armas.")]
        assert len(inv) == 1 and inv[0]["archivo"].endswith("1200000_ARMAS_20_SEP._2026.pdf"), msgs
        assert any("Cambió el texto" in m["texto"] and "+ Lunes a Viernes de 08:00 a 13:00 horas." in m["texto"]
                   for m in msgs), msgs
        latido = msgs[-1]["texto"]
        assert "nuevos: 1" in latido and "retirados: 1" in latido and "20-SEP-2026" in latido, latido
        assert (base / "archivo" / "2026-09-20" / "1200000_ARMAS_20_SEP._2026.pdf").exists()


def test_documento_que_no_baja_no_se_da_por_retirado():
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        paginas = {vigia.PAGINAS["comercializacion"]: COM, vigia.PAGINAS["costos"]: COS}
        archivos = _archivos_de(COM)
        vigia.correr(_bajador(paginas, archivos), base, datetime(2026, 9, 14, 20), reintento_seg=0)
        sin_uno = dict(archivos)
        caido = next(u for u in sin_uno if "969507" in u)
        del sin_uno[caido]
        codigo, msgs = vigia.correr(_bajador(paginas, sin_uno), base, datetime(2026, 9, 15, 20), reintento_seg=0)
        latido = msgs[-1]["texto"]
        assert codigo == 0 and "no se pudieron bajar: 1" in latido and "retirados" not in latido, latido
        assert caido in vigia.cargar_estado(base / "estado.json")["documentos"]


def test_akamai_no_toca_el_estado():
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        paginas = {vigia.PAGINAS["comercializacion"]: AKA, vigia.PAGINAS["costos"]: COS}
        codigo, msgs = vigia.correr(_bajador(paginas, {}), base, datetime(2026, 9, 14, 20), reintento_seg=0)
        assert codigo == 1 and len(msgs) == 1, msgs
        assert "roto" in msgs[0]["texto"] and "Challenge Validation" in msgs[0]["texto"], msgs
        assert not (base / "estado.json").exists()


class _BotFalso:
    def __init__(self, resultado):
        self.resultado = resultado

    def send_message(self, texto):
        return self.resultado

    def send_document(self, ruta, caption):
        return self.resultado


def test_enviar_devuelve_si_todo_se_mando():
    msgs = [{"texto": "hola"}, {"texto": "adjunto", "archivo": "x.pdf"}]
    assert vigia.enviar(msgs, _BotFalso(False)) is False
    assert vigia.enviar(msgs, _BotFalso(True)) is True
    assert vigia.enviar(msgs, None) is True


def test_error_de_red_no_oser_en_adjunto_no_rompe_la_corrida():
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        paginas = {vigia.PAGINAS["comercializacion"]: COM, vigia.PAGINAS["costos"]: COS}
        archivos = _archivos_de(COM)
        vigia.correr(_bajador(paginas, archivos), base, datetime(2026, 9, 14, 20), reintento_seg=0)
        caido = next(iter(archivos))

        def bajar(url, _caido=caido):
            if url == _caido:
                raise http.client.IncompleteRead(b"")
            return _bajador(paginas, archivos)(url)

        codigo, msgs = vigia.correr(bajar, base, datetime(2026, 9, 15, 20), reintento_seg=0)
        latido = msgs[-1]["texto"]
        assert codigo == 0 and "no se pudieron bajar: 1" in latido and "retirados" not in latido, latido


def test_akamai_en_adjunto_no_se_archiva():
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        paginas = {vigia.PAGINAS["comercializacion"]: COM, vigia.PAGINAS["costos"]: COS}
        archivos = _archivos_de(COM)
        vigia.correr(_bajador(paginas, archivos), base, datetime(2026, 9, 14, 20), reintento_seg=0)
        estado_antes = vigia.cargar_estado(base / "estado.json")["documentos"]
        aka_archivos = {u: AKA.encode() for u in archivos}
        codigo, msgs = vigia.correr(_bajador(paginas, aka_archivos), base, datetime(2026, 9, 15, 20), reintento_seg=0)
        assert codigo == 0 and len(msgs) == 1, msgs   # solo el latido: nada nuevo/cambiado que avisar
        latido = msgs[-1]["texto"]
        assert "no se pudieron bajar: 16" in latido, latido
        estado_despues = vigia.cargar_estado(base / "estado.json")["documentos"]
        for u, d in estado_antes.items():
            assert estado_despues[u]["sha256"] == d["sha256"], u


def test_dir_trabajo_seco_usa_tempdir_si_no_hay_dcam_dir():
    d = vigia.dir_trabajo(True, {})
    assert d.name.startswith("dcam-seco-") and d.exists(), d


def test_dir_trabajo_respeta_dcam_dir():
    assert vigia.dir_trabajo(True, {"DCAM_DIR": "/tmp/algo"}) == Path("/tmp/algo")
    assert vigia.dir_trabajo(False, {"DCAM_DIR": "/tmp/algo"}) == Path("/tmp/algo")


def test_costos_roto_no_bloquea():
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        paginas = {vigia.PAGINAS["comercializacion"]: COM, vigia.PAGINAS["costos"]: COS}
        archivos = _archivos_de(COM)
        vigia.correr(_bajador(paginas, archivos), base, datetime(2026, 9, 14, 20), reintento_seg=0)
        costos_antes = vigia.cargar_estado(base / "estado.json")["textos"]["costos"]

        paginas2 = dict(paginas)
        paginas2[vigia.PAGINAS["costos"]] = AKA
        codigo, msgs = vigia.correr(_bajador(paginas2, archivos), base, datetime(2026, 9, 15, 20), reintento_seg=0)
        assert codigo == 0
        assert any("no se pudo leer la página «costos»" in m["texto"] for m in msgs), msgs
        assert "costos sin leer" in msgs[-1]["texto"], msgs[-1]["texto"]
        assert vigia.cargar_estado(base / "estado.json")["textos"]["costos"] == costos_antes


def test_es_upload_solo_gob_mx_https():
    assert not vigia._es_upload("http://192.168.1.10/cms/uploads/attachment/file/1/x.pdf")
    assert not vigia._es_upload("file:///cms/uploads/image/file/1/x.jpg")
    assert vigia._es_upload("https://www.gob.mx/cms/uploads/attachment/file/1/x.pdf")


def test_imagen_por_ruta_aunque_venga_de_enlace():
    html = '<div class="article-body"><a href="/cms/uploads/image/file/5/aviso.jpg">Ver aviso</a></div>'
    docs = vigia.documentos(vigia.leer_cuerpo(html))
    assert list(docs.values())[0]["tipo"] == "imagen", docs


def test_diff_truncado():
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        paginas = {vigia.PAGINAS["comercializacion"]: COM, vigia.PAGINAS["costos"]: COS}
        archivos = _archivos_de(COM)
        vigia.correr(_bajador(paginas, archivos), base, datetime(2026, 9, 14, 20), reintento_seg=0)
        marca = '<div class="article-body">'
        cos_larga = COS.replace(marca, marca + "<p>" + "X" * 5000 + "</p>", 1)
        paginas2 = dict(paginas)
        paginas2[vigia.PAGINAS["costos"]] = cos_larga
        codigo, msgs = vigia.correr(_bajador(paginas2, archivos), base, datetime(2026, 9, 15, 20), reintento_seg=0)
        diff_msg = next(m for m in msgs if "Cambió el texto" in m["texto"])
        assert diff_msg["texto"].endswith("…(truncado)"), diff_msg["texto"][-40:]


def test_akamai_con_estado_previo_no_lo_toca():
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        paginas = {vigia.PAGINAS["comercializacion"]: COM, vigia.PAGINAS["costos"]: COS}
        archivos = _archivos_de(COM)
        vigia.correr(_bajador(paginas, archivos), base, datetime(2026, 9, 14, 20), reintento_seg=0)
        antes = (base / "estado.json").read_bytes()
        paginas2 = {vigia.PAGINAS["comercializacion"]: AKA, vigia.PAGINAS["costos"]: COS}
        codigo, msgs = vigia.correr(_bajador(paginas2, {}), base, datetime(2026, 9, 15, 20), reintento_seg=0)
        assert codigo == 1
        assert (base / "estado.json").read_bytes() == antes


def test_documento_cambiado_manda_inventario_cambiado():
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        paginas = {vigia.PAGINAS["comercializacion"]: COM, vigia.PAGINAS["costos"]: COS}
        archivos = _archivos_de(COM)
        vigia.correr(_bajador(paginas, archivos), base, datetime(2026, 9, 14, 20), reintento_seg=0)
        u = next(u for u in archivos if "1103069" in u)   # ARMAS_11_SEP._2026.pdf, tipo existencias
        archivos2 = dict(archivos)
        archivos2[u] = b"CONTENIDO NUEVO"
        codigo, msgs = vigia.correr(_bajador(paginas, archivos2), base, datetime(2026, 9, 15, 20), reintento_seg=0)
        cambiado = [m for m in msgs if m["texto"].startswith("📦 Inventario cambiado DCAM:")]
        assert len(cambiado) == 1 and "archivo" in cambiado[0], msgs
        assert "cambiados: 1" in msgs[-1]["texto"], msgs[-1]["texto"]
        assert (base / "pendiente-conciliar.json").exists(), "el vigia no dejo la senal"
        assert "escrita" in msgs[-1]["texto"], msgs[-1]["texto"]


def test_latido_avisa_codigo_viejo():
    import os
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        paginas = {vigia.PAGINAS["comercializacion"]: COM, vigia.PAGINAS["costos"]: COS}
        archivos = _archivos_de(COM)
        vigia.correr(_bajador(paginas, archivos), base, datetime(2026, 9, 14, 20), reintento_seg=0)
        os.environ["DCAM_CODIGO_VIEJO"] = "2026-09-14"
        try:
            _c, msgs = vigia.correr(_bajador(paginas, archivos), base, datetime(2026, 9, 15, 20), reintento_seg=0)
            with tempfile.TemporaryDirectory() as otro:   # también en el mensaje de «estado inicial»
                _c, inicial = vigia.correr(_bajador(paginas, archivos), Path(otro), datetime(2026, 9, 15, 20), reintento_seg=0)
        finally:
            del os.environ["DCAM_CODIGO_VIEJO"]
        assert msgs[-1]["texto"].endswith("⚠️ corriendo con código de 2026-09-14"), msgs[-1]
        assert "estado inicial" in inicial[-1]["texto"], inicial
        assert inicial[-1]["texto"].endswith("⚠️ corriendo con código de 2026-09-14"), inicial[-1]


# ── vigilar(): calendario, reintentos y avisos ─────────────────────────────────────────────

def _no_debe_leer(url):
    raise AssertionError(f"vigilar() no debía leer gob.mx y pidió {url}")


def _paginas_ok():
    return {vigia.PAGINAS["comercializacion"]: COM, vigia.PAGINAS["costos"]: COS}


def _caido(url):
    raise OSError("HTTP Error 404: Not Found")


def test_ranuras_y_horas():
    assert vigia.ranura_actual(datetime(2026, 10, 28, 9, 59)) == datetime(2026, 10, 27, 20, 0)
    assert vigia.ranura_actual(datetime(2026, 10, 28, 10, 0)) == datetime(2026, 10, 28, 10, 0)
    assert vigia.ranura_actual(datetime(2026, 10, 28, 19, 30)) == datetime(2026, 10, 28, 15, 0)
    assert vigia.siguiente(datetime(2026, 10, 28, 20, 0), 23) == datetime(2026, 10, 28, 23, 0)
    assert vigia.siguiente(datetime(2026, 10, 28, 23, 0), 23) == datetime(2026, 10, 29, 23, 0)
    assert vigia.siguiente(datetime(2026, 10, 28, 20, 0), 8) == datetime(2026, 10, 29, 8, 0)
    assert vigia.jornada_latido(datetime(2026, 10, 29, 10, 0)) == "2026-10-28"
    assert vigia.jornada_latido(datetime(2026, 10, 29, 20, 0)) == "2026-10-29"


def test_vigilar_solo_lee_en_ranura():
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        b = _bajador(_paginas_ok(), _archivos_de(COM))
        codigo, msgs, _ = vigia.vigilar(b, base, datetime(2026, 10, 28, 20, 0), reintento_seg=0)
        assert codigo == 0 and "estado inicial" in msgs[-1]["texto"], msgs
        codigo, msgs, nota = vigia.vigilar(_no_debe_leer, base, datetime(2026, 10, 28, 20, 30), reintento_seg=0)
        assert codigo == 0 and msgs == [] and "nada que hacer" in nota, nota
        # --forzar lee aunque no toque
        codigo, msgs, _ = vigia.vigilar(b, base, datetime(2026, 10, 28, 21, 0), reintento_seg=0, forzar=True)
        assert codigo == 0 and msgs == [], msgs   # sin cambios y el resumen del día ya salió


def test_vigilar_falla_pasajera_silencio_aviso_23_y_recuperacion():
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        ok = _bajador(_paginas_ok(), _archivos_de(COM))
        vigia.vigilar(ok, base, datetime(2026, 10, 27, 20, 0), reintento_seg=0)   # estado inicial
        # 28-oct 20:00: gob.mx da 404 → silencio
        codigo, msgs, nota = vigia.vigilar(_caido, base, datetime(2026, 10, 28, 20, 0), reintento_seg=0)
        assert codigo == 0 and msgs == [] and "falla #1" in nota, (msgs, nota)
        for h, m in ((20, 30), (21, 0), (22, 30)):
            codigo, msgs, _ = vigia.vigilar(_caido, base, datetime(2026, 10, 28, h, m), reintento_seg=0)
            assert msgs == [], msgs
        # 23:00: primer aviso
        codigo, msgs, _ = vigia.vigilar(_caido, base, datetime(2026, 10, 28, 23, 0), reintento_seg=0)
        assert len(msgs) == 1 and "sigue fallando desde las 20:00 del 28-OCT-2026" in msgs[0]["texto"], msgs
        assert "5 intentos" in msgs[0]["texto"] and "404" in msgs[0]["texto"], msgs
        # 23:30 y 03:00: ya avisó esta noche
        for dt in (datetime(2026, 10, 28, 23, 30), datetime(2026, 10, 29, 3, 0)):
            assert vigia.vigilar(_caido, base, dt, reintento_seg=0)[1] == []
        # 04:00 vuelve: aviso de recuperación + resumen del día (el de las 20:00 no había salido)
        codigo, msgs, nota = vigia.vigilar(ok, base, datetime(2026, 10, 29, 4, 0), reintento_seg=0)
        assert codigo == 0 and msgs[0]["texto"].startswith("✅ DCAM vigía recuperado"), msgs
        assert "fallaba desde las 20:00 del 28-OCT-2026" in msgs[0]["texto"], msgs
        assert "sin cambios" in msgs[-1]["texto"], msgs
        assert "falla" not in vigia.cargar_estado(base / "vigia-salud.json")
        # 04:30 ya no hay nada pendiente
        assert "nada que hacer" in vigia.vigilar(_no_debe_leer, base, datetime(2026, 10, 29, 4, 30), reintento_seg=0)[2]


def test_vigilar_recuperacion_sin_aviso_previo_es_silenciosa():
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        ok = _bajador(_paginas_ok(), _archivos_de(COM))
        vigia.vigilar(ok, base, datetime(2026, 10, 27, 20, 0), reintento_seg=0)
        vigia.vigilar(_caido, base, datetime(2026, 10, 28, 20, 0), reintento_seg=0)
        codigo, msgs, _ = vigia.vigilar(ok, base, datetime(2026, 10, 28, 20, 30), reintento_seg=0)
        assert not any("recuperado" in m["texto"] for m in msgs), msgs
        assert len(msgs) == 1 and "sin cambios" in msgs[0]["texto"], msgs   # el resumen del día sí


def test_vigilar_reintentos_paran_a_las_8_y_sigue_en_ranura():
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        vigia.vigilar(_caido, base, datetime(2026, 10, 28, 20, 0), reintento_seg=0)
        assert vigia.vigilar(_caido, base, datetime(2026, 10, 29, 7, 30), reintento_seg=0)[2].startswith("falla")
        assert "nada que hacer" in vigia.vigilar(_no_debe_leer, base, datetime(2026, 10, 29, 8, 0), reintento_seg=0)[2]
        assert "nada que hacer" in vigia.vigilar(_no_debe_leer, base, datetime(2026, 10, 29, 9, 30), reintento_seg=0)[2]
        codigo, msgs, nota = vigia.vigilar(_caido, base, datetime(2026, 10, 29, 10, 0), reintento_seg=0)
        assert "falla #" in nota and msgs == [], (nota, msgs)
        # con la ranura de las 10:00 vuelve a reintentar hasta las 08:00 del día siguiente
        assert vigia.cargar_estado(base / "vigia-salud.json")["falla"]["limite"] == "2026-10-30T08:00"


def test_vigilar_falla_de_varios_dias_avisa_una_vez_por_noche():
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        avisos = []
        dt = datetime(2026, 10, 28, 20, 0)
        while dt < datetime(2026, 10, 30, 12, 0):
            _c, msgs, _ = vigia.vigilar(_caido, base, dt, reintento_seg=0)
            avisos += [(dt, m["texto"]) for m in msgs]
            dt += timedelta(minutes=30)
        assert [a[0] for a in avisos] == [datetime(2026, 10, 28, 23, 0), datetime(2026, 10, 29, 23, 0)], avisos


def test_vigilar_pagina_cambiada_avisa_al_instante():
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        sin_exist = COM.replace("Existencias de", "Inventario de")
        b = _bajador({vigia.PAGINAS["comercializacion"]: sin_exist, vigia.PAGINAS["costos"]: COS}, {})
        codigo, msgs, _ = vigia.vigilar(b, base, datetime(2026, 10, 28, 10, 0), reintento_seg=0)
        assert len(msgs) == 1 and "cambió de forma" in msgs[0]["texto"], msgs
        # los reintentos siguen, sin repetir el aviso esa noche
        for dt in (datetime(2026, 10, 28, 10, 30), datetime(2026, 10, 28, 23, 0)):
            assert vigia.vigilar(b, base, dt, reintento_seg=0)[1] == []
        assert vigia.vigilar(b, base, datetime(2026, 10, 29, 23, 0), reintento_seg=0)[1] != []


def test_vigilar_akamai_es_pasajero():
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        b = _bajador({vigia.PAGINAS["comercializacion"]: AKA, vigia.PAGINAS["costos"]: COS}, {})
        codigo, msgs, nota = vigia.vigilar(b, base, datetime(2026, 10, 28, 20, 0), reintento_seg=0)
        assert codigo == 0 and msgs == [] and "Challenge Validation" in nota, (msgs, nota)


def test_vigilar_resumen_una_vez_al_dia_y_cambios_al_momento():
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        ok = _bajador(_paginas_ok(), _archivos_de(COM))
        vigia.vigilar(ok, base, datetime(2026, 10, 28, 20, 0), reintento_seg=0)
        assert vigia.vigilar(ok, base, datetime(2026, 10, 29, 10, 0), reintento_seg=0)[1] == []
        com2 = COM.replace("1103069/ARMAS_11_SEP._2026.pdf", "1200000/ARMAS_29_OCT._2026.pdf")
        b2 = _bajador({vigia.PAGINAS["comercializacion"]: com2, vigia.PAGINAS["costos"]: COS}, _archivos_de(com2))
        codigo, msgs, _ = vigia.vigilar(b2, base, datetime(2026, 10, 29, 15, 0), reintento_seg=0)
        assert any(m["texto"].startswith("📦 Inventario nuevo DCAM") for m in msgs), msgs
        assert "señal escrita" in msgs[-1]["texto"], msgs[-1]
        assert (base / "pendiente-conciliar.json").exists()
        codigo, msgs, _ = vigia.vigilar(b2, base, datetime(2026, 10, 29, 20, 0), reintento_seg=0)
        assert len(msgs) == 1 and "sin cambios" in msgs[0]["texto"], msgs


def test_vigilar_ranura_perdida_por_apagon_se_lee_al_volver():
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        ok = _bajador(_paginas_ok(), _archivos_de(COM))
        vigia.vigilar(ok, base, datetime(2026, 10, 28, 15, 0), reintento_seg=0)
        # APOLO estuvo apagado a las 20:00; el timer (Persistent=true) lo despierta a las 20:40
        codigo, msgs, nota = vigia.vigilar(ok, base, datetime(2026, 10, 28, 20, 40), reintento_seg=0)
        assert nota == "lectura OK" and msgs and "sin cambios" in msgs[-1]["texto"], (nota, msgs)


def test_vigilar_pdf_de_existencias_que_no_baja_se_reintenta():
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        archivos = _archivos_de(COM)
        vigia.vigilar(_bajador(_paginas_ok(), archivos), base, datetime(2026, 10, 27, 20, 0), reintento_seg=0)
        com2 = COM.replace("1103069/ARMAS_11_SEP._2026.pdf", "1200000/ARMAS_28_OCT._2026.pdf")
        sin_pdf = {u: v for u, v in _archivos_de(com2).items() if "1200000" not in u}
        b = _bajador({vigia.PAGINAS["comercializacion"]: com2, vigia.PAGINAS["costos"]: COS}, sin_pdf)
        codigo, msgs, nota = vigia.vigilar(b, base, datetime(2026, 10, 28, 20, 0), reintento_seg=0)
        assert "falla #1" in nota and "PDF de existencias" in nota, nota
        b_ok = _bajador({vigia.PAGINAS["comercializacion"]: com2, vigia.PAGINAS["costos"]: COS}, _archivos_de(com2))
        codigo, msgs, nota = vigia.vigilar(b_ok, base, datetime(2026, 10, 28, 20, 30), reintento_seg=0)
        assert any(m["texto"].startswith("📦 Inventario nuevo DCAM") for m in msgs), msgs
        assert (base / "pendiente-conciliar.json").exists()


if __name__ == "__main__":
    pruebas = [f for n, f in sorted(globals().items()) if n.startswith("test_")]
    for f in pruebas:
        f()
        print("ok", f.__name__)
    print(f"{len(pruebas)} pruebas OK")
