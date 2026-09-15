#!/usr/bin/env python3
"""Pruebas de publicar.py con un entorno falso. Correr: python3 scripts/dcam/test_publicar.py"""
import sys
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
VIVO = '<script src="data-precios.js?v=dcam20261001">'
PAGINAS = {publicar.alias_preview("bot/dcam-arm-20261001"): VIVO, "https://armado.mx/": VIVO,
           "https://armado.mx/api/state": '{"armas": [' + ",".join(['{"id": %d}' % i for i in range(225)]) + "]}"}
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


if __name__ == "__main__":
    pruebas = [f for n, f in sorted(globals().items()) if n.startswith("test_")]
    for f in pruebas:
        f()
        print("ok", f.__name__)
    print(f"{len(pruebas)} pruebas OK")
