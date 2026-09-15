#!/usr/bin/env python3
"""Pruebas de publicar.py con un entorno falso. Correr: python3 scripts/dcam/test_publicar.py"""
import json
import sys
import tempfile
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import publicar  # noqa: E402


class Falso(publicar.Entorno):
    def __init__(self, respuestas=None, paginas=None):
        self.llamadas, self.avisos, self.respuestas, self.paginas = [], [], respuestas or {}, paginas or {}

    def sh(self, args, cwd=None, env=None):
        linea = " ".join(map(str, args))
        self.llamadas.append(linea)
        for patron, r in self.respuestas.items():
            if patron in linea:
                return r
        return 0, ""

    def http(self, url):
        return self.paginas.get(url, "")

    def dormir(self, seg):
        pass

    def avisar(self, texto):
        self.avisos.append(texto)


PLAN = {"catalogo": "armas", "fecha": "2026-10-01", "pdf": "/x.pdf", "v": "dcam20261001",
        "seguros": [{"id": 1, "precio": 9641.23, "existencia": 4}], "esperado_armas": 225}
VIVO = '<script src="data.js?v=dcam20261001"></script><script src="data-precios.js?v=dcam20261001"></script>'
PAGINAS = {publicar.alias_preview("bot/dcam-arm-20261001"): VIVO, "https://armado.mx/": VIVO,
           "https://armado.mx/api/state": '{"armas": [' + ",".join(['{"id": %d}' % i for i in range(225)]) + "]}",
           "https://armado.mx/data-precios.js?v=dcam20261001": "$9,641.23 MXN"}
RESP = {"gh pr create --base main": (0, "https://github.com/saulo-fl/armado-en-mexico/pull/301\n"),
        "gh pr create --base develop": (0, "https://github.com/saulo-fl/armado-en-mexico/pull/302\n"),
        "resembrar.js armas --aplicar": (0, "OK: D1 coincide con el codigo."),
        "resembrar.js armas": (0, "Difieren. Repite con --aplicar"),
        "datos.js aplicar": (0, '{"archivos": ["src/data/data-precios.js", "src/data/data.js"]}')}


def test_flujo_completo_hasta_hecho():
    ent = Falso(RESP, PAGINAS)
    pub = publicar.publicar_seguro(ent, Path("/trabajo"), {}, PLAN)
    assert pub["paso"] == "hecho" and pub["pr_main"] == 301 and pub["pr_develop"] == 302, pub
    orden = [l for l in ent.llamadas if any(k in l for k in ("checkout", "auditar.js", "npm run build", "push", "pr merge", "--aplicar"))]
    assert "checkout" in orden[0] and "--aplicar" in orden[-1], orden
    assert any("Publicado inventario DCAM" in a for a in ent.avisos), ent.avisos


def test_reanuda_desde_pr_sin_repetir_pasos():
    ent = Falso(RESP, PAGINAS)
    pub = publicar.publicar_seguro(ent, Path("/trabajo"), {"paso": "pr", "rama": "bot/dcam-arm-20261001", "pr_main": 301, "pr_develop": 302}, PLAN)
    assert pub["paso"] == "hecho", pub
    assert not any("datos.js aplicar" in l or "gh pr create" in l for l in ent.llamadas), ent.llamadas


def test_ids_solo_en_d1_bloquea_sin_aplicar():
    resp = dict(RESP, **{"resembrar.js armas": (0, "  !! SOLO en D1 (se PERDERIAN al resembrar): 300")})
    ent = Falso(resp, PAGINAS)
    pub = publicar.publicar_seguro(ent, Path("/trabajo"), {}, PLAN)
    assert pub["paso"] == "produccion" and "SOLO en D1" in pub["bloqueado"], pub
    assert not any("--aplicar" in l for l in ent.llamadas) and any("D1" in a for a in ent.avisos)


def test_preview_que_no_llega_deja_pr_abierto():
    paginas = dict(PAGINAS, **{publicar.alias_preview("bot/dcam-arm-20261001"): "viejo"})
    ent = Falso(RESP, paginas)
    pub = publicar.publicar_seguro(ent, Path("/trabajo"), {}, PLAN, plazo_seg=120)
    assert pub["paso"] == "pr" and "preview" in pub["bloqueado"], pub
    assert not any("pr merge" in l for l in ent.llamadas)


def test_auditar_que_falla_detiene_antes_del_push():
    ent = Falso(dict(RESP, **{"auditar.js": (1, "✘ 2 HALLAZGOS")}), PAGINAS)
    pub = publicar.publicar_seguro(ent, Path("/trabajo"), {}, PLAN)
    assert pub["paso"] == "aplicado" and "auditar" in pub["bloqueado"], pub
    assert not any("push" in l for l in ent.llamadas)


# ── Fix round 1 ──────────────────────────────────────────────────────────────

PLAN_MUN = {"catalogo": "municiones", "fecha": "2026-10-01", "pdf": "/x.pdf", "v": "dcam20261001",
            "seguros": [{"id": 5, "precio": 350.0, "existencia": 10}]}


def test_produccion_no_pasa_con_marca_de_otro_catalogo():
    """La espera de producción es específica del catálogo: la marca de armas (data.js?v=…)
    no debe dar por buena la publicación de municiones (data-municiones.js?v=…)."""
    rama = publicar.rama_de("municiones", "2026-10-01")
    marca_mun = "data-municiones.js?v=dcam20261001"
    paginas = {publicar.alias_preview(rama): f'<script src="{marca_mun}"></script>',
               "https://armado.mx/": '<script src="data.js?v=dcam20261001"></script>',   # solo armas
               "https://armado.mx/data-municiones.js?v=dcam20261001": "$350.00 MXN"}
    ent = Falso(RESP, paginas)
    pub = publicar.publicar_seguro(ent, Path("/trabajo"), {}, PLAN_MUN, plazo_seg=120)
    assert pub["paso"] == "mergeado" and marca_mun in pub["bloqueado"], pub

    paginas["https://armado.mx/"] += f'<script src="{marca_mun}"></script>'
    pub2 = publicar.publicar_seguro(ent, Path("/trabajo"), pub, PLAN_MUN, plazo_seg=120)
    assert pub2["paso"] == "hecho", pub2


def test_guardar_recibe_cada_paso_en_orden():
    vistos = []

    def guardar(p):
        if not vistos or vistos[-1] != p.get("paso"):
            vistos.append(p.get("paso"))

    ent = Falso(RESP, PAGINAS)
    pub = publicar.publicar_seguro(ent, Path("/trabajo"), {}, PLAN, guardar=guardar)
    assert pub["paso"] == "hecho"
    assert vistos == publicar.PASOS, vistos


def test_reanuda_pr_no_recrea_main_reusa_develop_por_gh_pr_list():
    rama = "bot/dcam-arm-20261001"
    resp = dict(RESP, **{f"gh pr list --repo {publicar.REPO} --head {rama} --base develop": (0, '[{"number": 302, "state": "OPEN"}]')})
    ent = Falso(resp, PAGINAS)
    pub = publicar.publicar_seguro(ent, Path("/trabajo"), {"paso": "puertas", "rama": rama, "pr_main": 301}, PLAN)
    assert pub["paso"] == "hecho" and pub["pr_develop"] == 302, pub
    assert not any(l.startswith("gh pr list") and "--base main" in l for l in ent.llamadas), ent.llamadas
    assert not any(l.startswith("gh pr create") for l in ent.llamadas), ent.llamadas


def test_excepcion_en_puertas_bloquea_avisa_y_guarda():
    class Explota(Falso):
        def sh(self, args, cwd=None, env=None):
            if "npm run build" in " ".join(map(str, args)):
                raise RuntimeError("boom")
            return super().sh(args, cwd, env)

    ent = Explota(RESP, PAGINAS)
    guardados = []
    pub = publicar.publicar_seguro(ent, Path("/trabajo"), {}, PLAN, guardar=guardados.append)
    assert pub["paso"] == "aplicado" and "puertas" in pub["bloqueado"], pub
    assert any("puertas" in a for a in ent.avisos), ent.avisos
    assert guardados and guardados[-1] is pub


def test_resume_aplicado_rehace_desde_rama():
    ent = Falso(RESP, PAGINAS)
    pub = publicar.publicar_seguro(ent, Path("/trabajo"), {"paso": "aplicado", "rama": "bot/dcam-arm-20261001", "archivos": ["x"]}, PLAN)
    assert pub["paso"] == "hecho", pub
    assert any("checkout -f -B" in l for l in ent.llamadas), ent.llamadas
    assert "npm ci" in ent.llamadas, ent.llamadas


def test_vencimiento_produccion_comenta_pr():
    paginas = dict(PAGINAS, **{"https://armado.mx/": "viejo"})
    ent = Falso(RESP, paginas)
    pub = publicar.publicar_seguro(ent, Path("/trabajo"), {}, PLAN, plazo_seg=120)
    assert pub["paso"] == "mergeado" and "armado.mx" in pub["bloqueado"], pub
    assert any(l.startswith("gh pr comment 301") for l in ent.llamadas), ent.llamadas


def test_sonda_precio_falla_si_no_esta_en_el_archivo_servido():
    paginas = dict(PAGINAS, **{"https://armado.mx/data-precios.js?v=dcam20261001": "nada relevante aqui"})
    ent = Falso(RESP, paginas)
    pub = publicar.publicar_seguro(ent, Path("/trabajo"), {}, PLAN)
    assert pub["paso"] == "d1" and "precio" in pub["bloqueado"], pub


def test_plan_con_mapa_actualiza_mapeo_y_lo_incluye_en_commit():
    with tempfile.TemporaryDirectory() as td:
        trabajo = Path(td)
        (trabajo / "scripts" / "dcam").mkdir(parents=True)
        ruta = trabajo / "scripts" / "dcam" / "mapeo-dcam.json"
        ruta.write_text('{"pendientes": []}', encoding="utf-8")
        plan = dict(PLAN, mapa={"manual": "man_dcam_2026_10_01", "fichas": {"1": ["renglon"]}})
        ent = Falso(RESP, PAGINAS)
        pub = publicar.publicar_seguro(ent, trabajo, {}, plan)
        assert pub["paso"] == "hecho", pub
        guardado = json.loads(ruta.read_text(encoding="utf-8"))
        assert guardado["armas"]["2026-10-01"] == plan["mapa"], guardado
        assert any(l.startswith("git add") and "mapeo-dcam.json" in l for l in ent.llamadas), ent.llamadas


if __name__ == "__main__":
    pruebas = [f for n, f in sorted(globals().items()) if n.startswith("test_")]
    for f in pruebas:
        f()
        print("ok", f.__name__)
    print(f"{len(pruebas)} pruebas OK")
