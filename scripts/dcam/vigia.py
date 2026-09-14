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
