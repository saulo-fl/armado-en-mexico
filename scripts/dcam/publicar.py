#!/usr/bin/env python3
"""Publicación automática de lo seguro (pieza 2 del bot DCAM).

PR a main + develop → puertas → preview → merge → producción → D1 → sondas.
Cada paso queda escrito en `pub["paso"]` para reanudar. Diseño: scripts/dcam/DISENO.md.
"""
from __future__ import annotations

import json
import os
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path

REPO = "saulo-fl/armado-en-mexico"
PRODUCCION = "https://armado.mx/"
PASOS = ["rama", "aplicado", "puertas", "pr", "preview", "mergeado", "produccion", "d1", "sondas", "hecho"]
UA = "ArmadoMX-bot/1.0 (+https://armado.mx)"
PREFIJO = {"armas": "arm", "municiones": "mun", "accesorios": "acc"}


class Entorno:
    """Todo lo que toca el mundo exterior; las pruebas lo sustituyen."""

    def __init__(self, secretos: dict | None = None, bot=None):
        self.secretos, self.bot = secretos or {}, bot

    def sh(self, args, cwd=None, env=None):
        e = dict(os.environ, **self.secretos, **(env or {}))
        p = subprocess.run([str(a) for a in args], cwd=cwd, env=e, capture_output=True, text=True)
        return p.returncode, (p.stdout or "") + (p.stderr or "")

    def http(self, url):
        req = urllib.request.Request(url, headers={"User-Agent": UA, "Cache-Control": "no-cache"})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read().decode("utf-8", errors="replace")
        except OSError:
            return ""

    def dormir(self, seg):
        time.sleep(seg)

    def avisar(self, texto):
        print(texto, flush=True)
        if self.bot is not None:
            self.bot.send_message(texto)


def rama_de(catalogo: str, fecha: str, revision: bool = False) -> str:
    return f"bot/dcam-{PREFIJO[catalogo]}-{fecha.replace('-', '')}" + ("-rev" if revision else "")


def alias_preview(rama: str) -> str:
    return f"https://{rama.replace('/', '-')[:28]}.armado-en-mexico.pages.dev/"


def _git(ent, trabajo, *args):
    return ent.sh(["git", "-c", "credential.helper=", "-c", "credential.helper=!gh auth git-credential", *args], cwd=str(trabajo))


def _esperar(ent, url, marca, plazo_seg, cada=60):
    fin = 0.0
    while fin <= plazo_seg:
        if marca in ent.http(url):
            return True
        ent.dormir(cada)
        fin += cada
    return False


def _bloquear(ent, pub, motivo):
    pub["bloqueado"] = motivo
    ent.avisar(f"⚠️ DCAM conciliación detenida ({pub.get('rama', '?')}): {motivo}")
    return pub


def publicar_seguro(ent: Entorno, trabajo: Path, pub: dict, plan: dict, plazo_seg: int = 1200) -> dict:
    pub.pop("bloqueado", None)
    rama = pub.get("rama") or rama_de(plan["catalogo"], plan["fecha"])
    pub["rama"] = rama
    hecho = lambda paso: PASOS.index(pub.get("paso", "")) >= PASOS.index(paso) if pub.get("paso") in PASOS else False  # noqa: E731
    marca = f"?v={plan['v']}"

    if not hecho("rama"):
        _git(ent, trabajo, "fetch", "--quiet", "origin", "main")
        c, out = ent.sh(["git", "checkout", "-B", rama, "origin/main"], cwd=str(trabajo))
        if c:
            return _bloquear(ent, pub, f"no pude crear la rama: {out.strip()[-300:]}")
        pub["paso"] = "rama"

    if not hecho("aplicado"):
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as t:
            json.dump(plan, t, ensure_ascii=False)
        c, out = ent.sh(["node", "scripts/dcam/datos.js", "aplicar", t.name, str(trabajo)], cwd=str(trabajo))
        if c:
            return _bloquear(ent, pub, f"datos.js aplicar falló: {out.strip()[-300:]}")
        pub["archivos"] = json.loads(out.strip().splitlines()[-1])["archivos"] + ["scripts/dcam/mapeo-dcam.json"]
        pub["paso"] = "aplicado"

    if not hecho("puertas"):
        c, out = ent.sh(["node", ".claude/skills/conciliar-inventario/scripts/auditar.js"], cwd=str(trabajo))
        if c:
            return _bloquear(ent, pub, f"auditar.js con hallazgos: {out.strip()[-300:]}")
        c, out = ent.sh(["npm", "run", "build"], cwd=str(trabajo))
        if c:
            return _bloquear(ent, pub, f"npm run build falló: {out.strip()[-300:]}")
        pub["paso"] = "puertas"

    if not hecho("pr"):
        titulo = f"Inventario DCAM ({plan['catalogo']}) del {plan['fecha']}: {len(plan['seguros'])} cambios seguros"
        ent.sh(["git", "add", "--", *pub.get("archivos", [])], cwd=str(trabajo))
        c, out = ent.sh(["git", "commit", "-m", titulo], cwd=str(trabajo))
        if c and "nothing to commit" not in out:
            return _bloquear(ent, pub, f"commit falló: {out.strip()[-300:]}")
        c, out = _git(ent, trabajo, "push", "-u", "origin", rama)
        if c:
            return _bloquear(ent, pub, f"push falló: {out.strip()[-300:]}")
        cuerpo = plan.get("cuerpo_pr", titulo)
        for base, campo in (("main", "pr_main"), ("develop", "pr_develop")):
            c, out = ent.sh(["gh", "pr", "create", "--base", base, "--repo", REPO, "--head", rama,
                             "--title", titulo if base == "main" else f"[develop] {titulo}", "--body", cuerpo], cwd=str(trabajo))
            if c:
                return _bloquear(ent, pub, f"gh pr create ({base}) falló: {out.strip()[-300:]}")
            pub[campo] = int(out.strip().rstrip("/").split("/")[-1])
        pub["paso"] = "pr"

    if not hecho("preview"):
        if not _esperar(ent, alias_preview(rama), marca, plazo_seg):
            return _bloquear(ent, pub, f"el preview {alias_preview(rama)} no sirvió {marca} en {plazo_seg // 60} min; PR #{pub['pr_main']} queda abierto")
        pub["paso"] = "preview"

    if not hecho("mergeado"):
        for campo in ("pr_main", "pr_develop"):
            c, out = ent.sh(["gh", "pr", "merge", str(pub[campo]), "--repo", REPO, "--merge"], cwd=str(trabajo))
            if c:
                return _bloquear(ent, pub, f"gh pr merge #{pub[campo]} falló: {out.strip()[-300:]}")
        pub["paso"] = "mergeado"

    if not hecho("produccion"):
        if not _esperar(ent, PRODUCCION, marca, plazo_seg):
            return _bloquear(ent, pub, f"armado.mx no sirvió {marca} en {plazo_seg // 60} min tras el merge")
        pub["paso"] = "produccion"

    if not hecho("d1"):
        if plan["catalogo"] == "armas":
            script = ".claude/skills/sincronizar-d1/scripts/resembrar.js"
            c, out = ent.sh(["node", script, "armas"], cwd=str(trabajo))
            if c or "SOLO en D1" in out:
                return _bloquear(ent, pub, f"resembrado de D1 no aplicado: {out.strip()[-300:]}")
            if "al dia" not in out:
                c, out = ent.sh(["node", script, "armas", "--aplicar"], cwd=str(trabajo))
                if c or "OK: D1 coincide" not in out:
                    return _bloquear(ent, pub, f"⚠️ publicado sin resembrar D1: {out.strip()[-300:]}")
        pub["paso"] = "d1"

    if not hecho("sondas"):
        if plan["catalogo"] == "armas":
            try:
                estado = json.loads(ent.http(PRODUCCION + "api/state") or "{}")
            except ValueError:
                estado = {}
            if len(estado.get("armas", [])) != plan.get("esperado_armas"):
                return _bloquear(ent, pub, f"sonda /api/state: {len(estado.get('armas', []))} armas, esperaba {plan.get('esperado_armas')}")
        pub["paso"] = "sondas"

    pub["paso"] = "hecho"
    ent.avisar(f"✅ Publicado inventario DCAM ({plan['catalogo']}) del {plan['fecha']}: "
               f"{len(plan['seguros'])} fichas actualizadas · PR #{pub['pr_main']}")
    return pub
