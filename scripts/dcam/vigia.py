#!/usr/bin/env python3
"""Vigía DCAM: detecta cambios en la página oficial de comercialización de armas
de la Secretaría de la Defensa (gob.mx), archiva lo nuevo y avisa por Telegram.

Diseño: scripts/dcam/DISENO.md (pieza 1). Corre en APOLO con dcam-vigia.timer.
Solo biblioteca estándar; Telegram vía quiron_telegram (PYTHONPATH).
"""
from __future__ import annotations

import argparse
import difflib
import hashlib
import json
import os
import sys
import time
import traceback
import urllib.error
import urllib.request
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse

# Akamai bloquea a quien finge ser navegador sin JavaScript; un UA honesto pasa.
UA = "ArmadoMX-bot/1.0 (+https://armado.mx)"
BASE = "https://www.gob.mx"
PAGINAS = {
    "comercializacion": f"{BASE}/defensa/acciones-y-programas/comercializacion-de-armas",
    "costos": f"{BASE}/defensa/acciones-y-programas/formatos-de-pagos-e5-del-2023",
}
UPLOADS = ("/cms/uploads/attachment/file/", "/cms/uploads/image/file/")
BLOQUES = {"p", "li", "div", "br", "blockquote", "ul", "ol", "table", "tr",
           "h1", "h2", "h3", "h4", "h5", "h6"}
MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"]


class _Cuerpo(HTMLParser):
    """Recorre solo <div class="article-body">: enlaces, imágenes y texto."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.encontrado = False
        self.profundidad = 0          # divs abiertos dentro del cuerpo; 0 = fuera
        self.enlaces = []             # [href, texto]
        self.imagenes = []
        self.lineas = [""]
        self._enlace = None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if self.profundidad == 0:
            if tag == "div" and "article-body" in (a.get("class") or "").split():
                self.encontrado = True
                self.profundidad = 1
            return
        if tag == "div":
            self.profundidad += 1
        if tag in BLOQUES:
            self.lineas.append("")
        if tag == "a" and a.get("href"):
            self._enlace = [a["href"], ""]
        elif tag == "img" and a.get("src"):
            self.imagenes.append(a["src"])

    def handle_endtag(self, tag):
        if self.profundidad == 0:
            return
        if tag == "a" and self._enlace:
            self.enlaces.append(self._enlace)
            self._enlace = None
        if tag in BLOQUES:
            self.lineas.append("")
        if tag == "div":
            self.profundidad -= 1

    def handle_data(self, data):
        if self.profundidad == 0:
            return
        self.lineas[-1] += data
        if self._enlace:
            self._enlace[1] += data


def _limpia(s: str) -> str:
    return " ".join(s.split())


def leer_cuerpo(html: str) -> dict:
    p = _Cuerpo()
    p.feed(html)
    return {
        "encontrado": p.encontrado,
        "enlaces": [(h, _limpia(t)) for h, t in p.enlaces],
        "imagenes": p.imagenes,
        "texto": "\n".join(l for l in (_limpia(x) for x in p.lineas) if l),
    }


def validar(html: str, pagina: str, cuerpo: dict) -> str | None:
    """Motivo si NO es una lectura válida; None si lo es."""
    if "Challenge Validation" in html:
        return "Akamai devolvió la pantalla de verificación (Challenge Validation)"
    if not cuerpo["encontrado"]:
        return f'la página «{pagina}» no trae <div class="article-body">'
    if pagina == "comercializacion":
        n = sum(1 for _, t in cuerpo["enlaces"] if t.startswith("Existencias de"))
        if n < 3:
            return f"la página trae {n} enlaces «Existencias de…» (se esperan 3)"
    return None


def nombre_archivo(url: str) -> str:
    partes = unquote(urlparse(url).path).rstrip("/").split("/")
    return f"{partes[-2]}_{partes[-1]}"


def _es_upload(url: str) -> bool:
    return any(u in urlparse(url).path for u in UPLOADS)


def _tipo(texto: str) -> str:
    if texto.startswith("Existencias de"):
        return "existencias"
    if "requisitos" in texto.lower():
        return "requisitos"
    return "documento"


def documentos(cuerpo: dict) -> dict:
    """url absoluta → {tipo, etiqueta} de los adjuntos de /cms/uploads/ del cuerpo."""
    docs = {}
    for href, texto in cuerpo["enlaces"]:
        url = urljoin(BASE, href)
        if _es_upload(url):
            docs[url] = {"tipo": _tipo(texto), "etiqueta": texto or nombre_archivo(url)}
    for src in cuerpo["imagenes"]:
        url = urljoin(BASE, src)
        if _es_upload(url):
            docs.setdefault(url, {"tipo": "imagen", "etiqueta": nombre_archivo(url)})
    return docs


def comparar(previos: dict, actuales: dict, fallidos: set) -> dict:
    """previos/actuales: url → {…, sha256}. fallidos: urls de la página que no bajaron
    (no cuentan como retiradas: siguen publicadas, solo falló la descarga)."""
    return {
        "nuevos": [u for u in actuales if u not in previos],
        "cambiados": [u for u in actuales if u in previos and actuales[u]["sha256"] != previos[u]["sha256"]],
        "retirados": [u for u in previos if u not in actuales and u not in fallidos],
    }


def diff_texto(anterior: str, actual: str) -> list[str]:
    if _limpia(anterior) == _limpia(actual):
        return []
    a = [_limpia(l) for l in anterior.splitlines() if _limpia(l)]
    b = [_limpia(l) for l in actual.splitlines() if _limpia(l)]
    return [l for l in difflib.ndiff(a, b) if l[:2] in ("- ", "+ ")]


def cargar_estado(ruta: Path) -> dict | None:
    if not ruta.exists():
        return None
    return json.loads(ruta.read_text(encoding="utf-8"))


def guardar_estado(ruta: Path, estado: dict) -> None:
    tmp = ruta.with_suffix(".tmp")
    tmp.write_text(json.dumps(estado, ensure_ascii=False, indent=1), encoding="utf-8")
    os.replace(tmp, ruta)   # atómico: un corte a medias no deja el estado corrupto


def fecha(dt: datetime) -> str:
    return f"{dt.day:02d}-{MESES[dt.month - 1]}-{dt.year}"


class LecturaInvalida(Exception):
    pass


def bajar_http(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def _leer_pagina(bajar, pagina: str, url: str, reintento_seg: float) -> dict:
    """Cuerpo de una lectura válida; un reintento y luego LecturaInvalida."""
    motivo = None
    for intento in range(2):
        if intento:
            time.sleep(reintento_seg)
        try:
            html = bajar(url).decode("utf-8", errors="replace")
        except OSError as e:   # URLError, HTTPError y timeouts heredan de OSError
            motivo = f"error de red al leer «{pagina}»: {e}"
            continue
        cuerpo = leer_cuerpo(html)
        motivo = validar(html, pagina, cuerpo)
        if motivo is None:
            return cuerpo
    raise LecturaInvalida(motivo)


_TITULOS = {
    "existencias": "📦 Inventario {verbo} DCAM: {etiqueta}",
    "requisitos": "📄 Requisitos · {verbo}: {etiqueta}",
    "imagen": "📢 Aviso o imagen · {verbo}: {etiqueta}",
    "documento": "📄 Documento · {verbo}: {etiqueta}",
}


def correr(bajar, dir_base: Path, ahora: datetime, reintento_seg: float = 600) -> tuple[int, list[dict]]:
    ruta_estado = dir_base / "estado.json"
    previo = cargar_estado(ruta_estado)
    try:
        cuerpos = {p: _leer_pagina(bajar, p, u, reintento_seg) for p, u in PAGINAS.items()}
    except LecturaInvalida as e:
        return 1, [{"texto": f"⚠️ DCAM vigía roto: {e}"}]   # el estado no se toca

    prev_docs = previo["documentos"] if previo else {}
    carpeta = dir_base / "archivo" / ahora.strftime("%Y-%m-%d")
    actuales, fallidos, archivos = {}, set(), {}
    for url, info in documentos(cuerpos["comercializacion"]).items():
        try:
            datos = bajar(url)
        except OSError:
            fallidos.add(url)
            continue
        sha = hashlib.sha256(datos).hexdigest()
        actuales[url] = {**info, "sha256": sha, "desde": prev_docs.get(url, {}).get("desde") or fecha(ahora)}
        if prev_docs.get(url, {}).get("sha256") != sha:
            carpeta.mkdir(parents=True, exist_ok=True)
            archivos[url] = carpeta / nombre_archivo(url)
            archivos[url].write_bytes(datos)
    textos = {p: c["texto"] for p, c in cuerpos.items()}

    nuevo_estado = {"actualizado": ahora.isoformat(timespec="seconds"), "textos": textos,
                    "documentos": {**{u: prev_docs[u] for u in fallidos if u in prev_docs}, **actuales}}

    if previo is None:
        msg = f"✅ DCAM vigía · {fecha(ahora)} · estado inicial: {len(actuales)} documentos archivados"
        if fallidos:
            msg += f" · no se pudieron bajar: {len(fallidos)}"
        guardar_estado(ruta_estado, nuevo_estado)
        return 0, [{"texto": msg}]

    cambios = comparar(prev_docs, actuales, fallidos)
    msgs = []
    for url in cambios["nuevos"] + cambios["cambiados"]:
        verbo = "nuevo" if url in cambios["nuevos"] else "cambiado"
        titulo = _TITULOS[actuales[url]["tipo"]].format(verbo=verbo, etiqueta=actuales[url]["etiqueta"])
        msgs.append({"texto": f"{titulo}\n{url}", "archivo": str(archivos[url])})
    diffs = {p: diff_texto(previo["textos"].get(p, ""), t) for p, t in textos.items()}
    for p, lineas in diffs.items():
        if lineas:
            msgs.append({"texto": f"✏️ Cambió el texto de la página «{p}»\n{PAGINAS[p]}\n\n" + "\n".join(lineas)[:3500]})

    partes = [f"{k}: {len(v)}" for k, v in cambios.items() if v]
    if cambios["retirados"]:
        partes[-1] += " (" + ", ".join(prev_docs[u]["etiqueta"] for u in cambios["retirados"]) + ")"
    n_diffs = sum(1 for l in diffs.values() if l)
    if n_diffs:
        partes.append(f"texto cambiado en {n_diffs} página(s)")
    if fallidos:
        partes.append(f"no se pudieron bajar: {len(fallidos)}")
    exist = ", ".join(nombre_archivo(u).split("_", 1)[1] for u, d in actuales.items() if d["tipo"] == "existencias")
    n_img = sum(1 for d in actuales.values() if d["tipo"] == "imagen")
    msgs.append({"texto": f"✅ DCAM vigía · {fecha(ahora)} · {' · '.join(partes) or 'sin cambios'}"
                          f" · existencias: {exist} · {n_img} imágenes"})
    guardar_estado(ruta_estado, nuevo_estado)
    return 0, msgs


def enviar(msgs: list[dict], bot) -> None:
    for m in msgs:
        print(m["texto"] + (f"\n[adjunto: {m['archivo']}]" if "archivo" in m else ""), end="\n\n", flush=True)
        if bot is None:
            continue
        if "archivo" in m:
            bot.send_document(m["archivo"], caption=m["texto"][:1024])
        else:
            bot.send_message(m["texto"])


def main() -> int:
    ap = argparse.ArgumentParser(description="Vigía DCAM (gob.mx → Telegram)")
    ap.add_argument("--sin-telegram", action="store_true", help="imprime los mensajes en vez de mandarlos")
    args = ap.parse_args()
    dir_base = Path(os.environ.get("DCAM_DIR", str(Path.home() / "apps" / "dcam-bot")))
    dir_base.mkdir(parents=True, exist_ok=True)
    bot = None
    if not args.sin_telegram:
        from quiron_telegram import Bot
        bot = Bot.desde_env(os.environ["DCAM_TG_ENV"])
    try:
        codigo, msgs = correr(bajar_http, dir_base, datetime.now(), float(os.environ.get("DCAM_REINTENTO_SEG", "600")))
    except Exception:
        traceback.print_exc()
        codigo = 1
        msgs = [{"texto": "⚠️ DCAM vigía roto: excepción no prevista\n" + "".join(traceback.format_exc().splitlines(True)[-12:])}]
    enviar(msgs, bot)
    return codigo


if __name__ == "__main__":
    sys.exit(main())
