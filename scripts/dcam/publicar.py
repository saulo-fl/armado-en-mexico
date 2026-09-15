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
# El archivo que sirve index.html (marca de "?v=" catálogo-específica) y el archivo
# donde datos.js escribe el historial de precios de cada catálogo (scripts/dcam/datos.js CATALOGOS).
ARCHIVO_PRINCIPAL = {"armas": "data.js", "accesorios": "data-accesorios.js", "municiones": "data-municiones.js"}
ARCHIVO_HISTORIAL = {"armas": "data-precios.js", "accesorios": "data-accesorios.js", "municiones": "data-municiones.js"}


class Entorno:
    """Todo lo que toca el mundo exterior; las pruebas lo sustituyen."""

    def __init__(self, secretos: dict | None = None, bot=None):
        self.secretos, self.bot = secretos or {}, bot

    @classmethod
    def real(cls, dir_bot: Path, seco: bool = False):
        secretos = {}
        for nombre in ("github.env", "cloudflare.env"):
            ruta = dir_bot / nombre
            if ruta.exists():
                for linea in ruta.read_text(encoding="utf-8").splitlines():
                    if "=" in linea and not linea.lstrip().startswith("#"):
                        k, v = linea.split("=", 1)
                        secretos[k.strip()] = v.strip()
        bot = None
        if not seco:
            from quiron_telegram import Bot   # PYTHONPATH=/home/saulo/apps/quiron/lib
            bot = Bot.desde_env(str(dir_bot / "telegram.env"))
        return cls(secretos, bot)

    def sh(self, args, cwd=None, env=None, timeout=1800):
        e = dict(os.environ, **self.secretos, **(env or {}))
        p = subprocess.run([str(a) for a in args], cwd=cwd, env=e, capture_output=True, text=True, timeout=timeout)
        salida = p.stdout or ""
        if salida and not salida.endswith("\n"):
            salida += "\n"   # para que un JSON en la última línea de stdout no se pegue con stderr
        return p.returncode, salida + (p.stderr or "")

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
    """Sondea `url` hasta encontrar `marca` o agotar `plazo_seg` (contando el tiempo real
    que tarda cada `http()`, no solo `cada`), sin dormir tras el último intento."""
    restante = plazo_seg
    while True:
        inicio = time.monotonic()
        if marca in ent.http(url):
            return True
        restante -= time.monotonic() - inicio
        if restante <= 0:
            return False
        pausa = min(cada, restante)
        ent.dormir(pausa)
        restante -= pausa


def _bloquear(ent, pub, motivo):
    pub["bloqueado"] = motivo
    ent.avisar(f"⚠️ DCAM conciliación detenida ({pub.get('rama', '?')}): {motivo}")
    return pub


def _archivos_de_salida(salida):
    """`datos.js aplicar` imprime un JSON con clave "archivos"; se busca desde el final
    de la salida por si stderr (p. ej. un warning de Node) quedó pegado antes."""
    for linea in reversed(salida.splitlines()):
        try:
            d = json.loads(linea)
        except ValueError:
            continue
        if isinstance(d, dict) and "archivos" in d:
            return d["archivos"]
    return None


def publicar_seguro(ent: Entorno, trabajo: Path, pub: dict, plan: dict, plazo_seg: int = 1200, guardar=None) -> dict:
    if pub.get("paso") == "hecho":
        return pub
    pub.pop("bloqueado", None)
    rama = pub.get("rama") or rama_de(plan["catalogo"], plan["fecha"])
    pub["rama"] = rama
    # Nada antes de "puertas" (rama, aplicado) es de fiar entre corridas: el árbol de
    # trabajo puede traer sobras de un intento a medias. Se rehace todo desde "rama".
    if pub.get("paso") not in PASOS or PASOS.index(pub.get("paso", "")) < PASOS.index("puertas"):
        pub.pop("paso", None)
    hecho = lambda paso: PASOS.index(pub.get("paso", "")) >= PASOS.index(paso) if pub.get("paso") in PASOS else False  # noqa: E731
    catalogo = plan["catalogo"]
    marca = f"{ARCHIVO_PRINCIPAL[catalogo]}?v={plan['v']}"

    def _paso(nombre, fn):
        if hecho(nombre):
            return True
        try:
            motivo = fn()
        except Exception as e:  # cualquier excepción inesperada bloquea y avisa, no rompe la corrida
            motivo = f"{nombre}: {e!r}"
        if motivo:
            _bloquear(ent, pub, motivo)
            if guardar:
                guardar(pub)
            return False
        pub["paso"] = nombre
        if guardar:
            guardar(pub)
        return True

    def _comentar(numero, motivo):
        try:
            ent.sh(["gh", "pr", "comment", str(numero), "--repo", REPO, "--body", motivo], cwd=str(trabajo))
        except Exception:
            pass   # el comentario es de cortesía; no puede hacer fallar el bloqueo

    def _comentar_prs(motivo):
        if pub.get("pr_main"):
            _comentar(pub["pr_main"], motivo)
        n = pub.get("pr_develop")
        if not n:
            return
        fusionado = False
        try:
            c, out = ent.sh(["gh", "pr", "view", str(n), "--repo", REPO, "--json", "state"], cwd=str(trabajo))
            fusionado = c == 0 and json.loads(out or "{}").get("state") == "MERGED"
        except Exception:
            pass
        if not fusionado:
            _comentar(n, motivo)

    def paso_rama():
        c, out = _git(ent, trabajo, "fetch", "--quiet", "origin", "main")
        if c:
            return f"git fetch falló: {out.strip()[-300:]}"
        c, out = ent.sh(["git", "checkout", "-f", "-B", rama, "origin/main"], cwd=str(trabajo))
        if c:
            return f"no pude crear la rama: {out.strip()[-300:]}"
        c, out = ent.sh(["git", "clean", "-fd"], cwd=str(trabajo))   # sin -x: node_modules se conserva
        if c:
            return f"git clean falló: {out.strip()[-300:]}"
        if "mapa" in plan:
            ruta = trabajo / "scripts" / "dcam" / "mapeo-dcam.json"
            try:
                mapa = json.loads(ruta.read_text(encoding="utf-8"))
            except FileNotFoundError:
                mapa = {"pendientes": []}
            mapa.setdefault(catalogo, {})[plan["fecha"]] = plan["mapa"]
            ruta.write_text(json.dumps(mapa, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        c, out = ent.sh(["npm", "ci"], cwd=str(trabajo))
        if c:
            return f"npm ci falló: {out.strip()[-300:]}"
        return None

    def paso_aplicado():
        fd, ruta_tmp = tempfile.mkstemp(suffix=".json")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as t:
                json.dump(plan, t, ensure_ascii=False)
            c, out = ent.sh(["node", "scripts/dcam/datos.js", "aplicar", ruta_tmp, str(trabajo)], cwd=str(trabajo))
        finally:
            os.unlink(ruta_tmp)
        if c:
            return f"datos.js aplicar falló: {out.strip()[-300:]}"
        archivos = _archivos_de_salida(out)
        if archivos is None:
            return f"datos.js aplicar: no encontré el JSON de 'archivos' en la salida: {out.strip()[-300:]}"
        if "mapa" in plan:
            archivos = archivos + ["scripts/dcam/mapeo-dcam.json"]
        pub["archivos"] = archivos
        return None

    def paso_puertas():
        c, out = ent.sh(["node", ".claude/skills/conciliar-inventario/scripts/auditar.js"], cwd=str(trabajo))
        if c:
            return f"auditar.js con hallazgos: {out.strip()[-300:]}"
        c, out = ent.sh(["npm", "run", "build"], cwd=str(trabajo))
        if c:
            return f"npm run build falló: {out.strip()[-300:]}"
        c, out = ent.sh(["git", "add", "--", *pub.get("archivos", [])], cwd=str(trabajo))
        if c:
            return f"git add falló: {out.strip()[-300:]}"
        titulo = f"Inventario DCAM ({catalogo}) del {plan['fecha']}: {len(plan['seguros'])} cambios seguros"
        c, out = ent.sh(["git", "commit", "-m", titulo], cwd=str(trabajo))
        if c and "nothing to commit" not in out:
            return f"commit falló: {out.strip()[-300:]}"
        c, out = _git(ent, trabajo, "push", "-u", "origin", rama)
        if c:
            return f"push falló: {out.strip()[-300:]}"
        return None

    def paso_pr():
        titulo = f"Inventario DCAM ({catalogo}) del {plan['fecha']}: {len(plan['seguros'])} cambios seguros"
        cuerpo = plan.get("cuerpo_pr", titulo)
        for base, campo in (("main", "pr_main"), ("develop", "pr_develop")):
            if pub.get(campo):
                continue
            c, out = ent.sh(["gh", "pr", "list", "--repo", REPO, "--head", rama, "--base", base,
                             "--state", "all", "--json", "number,state"], cwd=str(trabajo))
            if c:
                return f"gh pr list ({base}) falló: {out.strip()[-300:]}"
            try:
                existentes = json.loads(out.strip() or "[]")
            except ValueError:
                existentes = []
            if existentes:
                pub[campo] = existentes[0]["number"]
            else:
                c, out = ent.sh(["gh", "pr", "create", "--base", base, "--repo", REPO, "--head", rama,
                                 "--title", titulo if base == "main" else f"[develop] {titulo}", "--body", cuerpo], cwd=str(trabajo))
                if c:
                    return f"gh pr create ({base}) falló: {out.strip()[-300:]}"
                pub[campo] = int(out.strip().rstrip("/").split("/")[-1])
            if guardar:
                guardar(pub)
        return None

    def paso_preview():
        url = alias_preview(rama)
        if _esperar(ent, url, marca, plazo_seg):
            return None
        motivo = f"el preview {url} no sirvió {marca} en {plazo_seg // 60} min; PR #{pub.get('pr_main')} queda abierto"
        _comentar_prs(motivo)
        return motivo

    def paso_mergeado():
        for campo in ("pr_main", "pr_develop"):
            n = pub.get(campo)
            if not n:
                continue
            c, out = ent.sh(["gh", "pr", "view", str(n), "--repo", REPO, "--json", "state"], cwd=str(trabajo))
            if c:
                return f"gh pr view #{n} falló: {out.strip()[-300:]}"
            try:
                estado = json.loads(out or "{}").get("state")
            except ValueError:
                estado = None
            if estado == "MERGED":
                continue
            c, out = ent.sh(["gh", "pr", "merge", str(n), "--repo", REPO, "--merge"], cwd=str(trabajo))
            if c:
                return f"gh pr merge #{n} falló: {out.strip()[-300:]}"
        return None

    def paso_produccion():
        if _esperar(ent, PRODUCCION, marca, plazo_seg):
            return None
        motivo = f"{PRODUCCION} no sirvió {marca} en {plazo_seg // 60} min tras el merge"
        _comentar_prs(motivo)
        return motivo

    def paso_d1():
        if catalogo == "armas":
            c, out = _git(ent, trabajo, "fetch", "--quiet", "origin", "main")
            if c:
                return f"git fetch falló: {out.strip()[-300:]}"
            c, out = ent.sh(["git", "checkout", "-f", "--detach", "origin/main"], cwd=str(trabajo))
            if c:
                return f"no pude alinear con main: {out.strip()[-300:]}"
            script = ".claude/skills/sincronizar-d1/scripts/resembrar.js"
            c, out = ent.sh(["node", script, "armas"], cwd=str(trabajo))
            if c or "SOLO en D1" in out:
                return f"resembrado de D1 no aplicado: {out.strip()[-300:]}"
            if "al dia" not in out:
                c, out = ent.sh(["node", script, "armas", "--aplicar"], cwd=str(trabajo))
                if c or "OK: D1 coincide" not in out:
                    return f"publicado sin resembrar D1: {out.strip()[-300:]}"
        return None

    def paso_sondas():
        if catalogo == "armas":
            try:
                estado = json.loads(ent.http(PRODUCCION + "api/state") or "{}")
            except ValueError:
                estado = {}
            n = len(estado.get("armas", []))
            if n != plan.get("esperado_armas"):
                return f"sonda /api/state: {n} armas, esperaba {plan.get('esperado_armas')}"
        precio_nuevo = f"${plan['seguros'][0]['precio']:,.2f} MXN"
        archivo = ARCHIVO_HISTORIAL[catalogo]
        contenido = ent.http(f"{PRODUCCION}{archivo}?v={plan['v']}")
        if precio_nuevo not in contenido:
            return f"sonda {archivo}: no encontré el precio nuevo {precio_nuevo}"
        return None

    for nombre, fn in (("rama", paso_rama), ("aplicado", paso_aplicado), ("puertas", paso_puertas),
                       ("pr", paso_pr), ("preview", paso_preview), ("mergeado", paso_mergeado),
                       ("produccion", paso_produccion), ("d1", paso_d1), ("sondas", paso_sondas)):
        if not _paso(nombre, fn):
            return pub

    pub["paso"] = "hecho"
    if guardar:
        guardar(pub)
    ent.avisar(f"✅ Publicado inventario DCAM ({catalogo}) del {plan['fecha']}: "
               f"{len(plan['seguros'])} fichas actualizadas · PR #{pub['pr_main']}")
    return pub
