#!/usr/bin/env python3
# Armado en México — Copyright (C) 2026 Saulo Flores León
# SPDX-License-Identifier: AGPL-3.0-or-later
# Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
# (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

"""Vigía DCAM: detecta cambios en la página oficial de comercialización de armas
de la Secretaría de la Defensa (gob.mx), archiva lo nuevo y avisa por Telegram.

Diseño: scripts/dcam/DISENO.md (pieza 1). Corre en APOLO con dcam-vigia.timer.
Solo biblioteca estándar; Telegram vía quiron_telegram (PYTHONPATH).
"""
from __future__ import annotations

import argparse
import difflib
import hashlib
import http.client
import json
import os
import sys
import tempfile
import time
import traceback
import urllib.request
from datetime import datetime, timedelta
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
    p = urlparse(url)
    return p.scheme == "https" and p.netloc == "www.gob.mx" and any(u in p.path for u in UPLOADS)


def _tipo(url: str, texto: str) -> str:
    if "/cms/uploads/image/file/" in urlparse(url).path:   # por ruta, no por la etiqueta del <a>/<img>
        return "imagen"
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
            docs[url] = {"tipo": _tipo(url, texto), "etiqueta": texto or nombre_archivo(url)}
    for src in cuerpo["imagenes"]:
        url = urljoin(BASE, src)
        if _es_upload(url):
            docs.setdefault(url, {"tipo": _tipo(url, ""), "etiqueta": nombre_archivo(url)})
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
    """estructural=True: la página cargó pero cambió de forma (esperar no lo arregla).
    estructural=False: falla pasajera (red, 404, redirección en bucle, verificación de Akamai)."""

    def __init__(self, motivo: str, estructural: bool = False):
        super().__init__(motivo)
        self.estructural = estructural


def bajar_http(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def _leer_pagina(bajar, pagina: str, url: str, reintento_seg: float) -> dict:
    """Cuerpo de una lectura válida; un reintento y luego LecturaInvalida."""
    motivo, estructural = None, False
    for intento in range(2):
        if intento:
            time.sleep(reintento_seg)
        try:
            html = bajar(url).decode("utf-8", errors="replace")
        except (OSError, http.client.HTTPException, ValueError) as e:
            # OSError: URLError, HTTPError y timeouts. HTTPException: IncompleteRead, InvalidURL.
            # ValueError: UnicodeEncodeError (URL con caracteres raros) hereda de ValueError.
            motivo, estructural = f"error de red al leer «{pagina}»: {e}", False
            continue
        cuerpo = leer_cuerpo(html)
        motivo = validar(html, pagina, cuerpo)
        if motivo is None:
            return cuerpo
        estructural = "Challenge Validation" not in html
    raise LecturaInvalida(motivo, estructural)


def _codigo_viejo() -> str:
    """Cola del latido si el clon no se pudo actualizar (DCAM_CODIGO_VIEJO = fecha del commit).

    La exportaba correr.sh, del diseño de papel que nunca se desplegó (salió del repo el
    18-oct-2026). Ninguna unidad vigente la define, así que hoy la cola no aparece."""
    viejo = os.environ.get("DCAM_CODIGO_VIEJO")
    return f" · ⚠️ corriendo con código de {viejo}" if viejo else ""


_TITULOS = {
    "existencias": "📦 Inventario {verbo} DCAM: {etiqueta}",
    "requisitos": "📄 Requisitos · {verbo}: {etiqueta}",
    "imagen": "📢 Aviso o imagen · {verbo}: {etiqueta}",
    "documento": "📄 Documento · {verbo}: {etiqueta}",
}


def correr(bajar, dir_base: Path, ahora: datetime, reintento_seg: float = 60) -> tuple[int, list[dict]]:
    """Una lectura completa. Cada mensaje lleva «clase»: roto | estructural | aviso | cambio | latido
    (vigilar() decide cuáles se mandan). El latido lleva «reintentar» si no bajó un PDF de existencias."""
    ruta_estado = dir_base / "estado.json"
    previo = cargar_estado(ruta_estado)

    try:
        cuerpo_com = _leer_pagina(bajar, "comercializacion", PAGINAS["comercializacion"], reintento_seg)
    except LecturaInvalida as e:
        return 1, [{"texto": f"⚠️ DCAM vigía roto: {e}", "motivo": str(e),
                    "clase": "estructural" if e.estructural else "roto"}]   # el estado no se toca

    # «costos» es secundaria: si falla no detiene el vigía (gob.mx puede romper esa URL);
    # se avisa aparte y se conserva el texto anterior en el estado, sin comparar el diff.
    aviso_costos = None
    try:
        cuerpo_costos = _leer_pagina(bajar, "costos", PAGINAS["costos"], reintento_seg)
    except LecturaInvalida as e:
        cuerpo_costos = None
        aviso_costos = f"⚠️ DCAM vigía: no se pudo leer la página «costos»: {e}"

    prev_docs = previo["documentos"] if previo else {}
    carpeta = dir_base / "archivo" / ahora.strftime("%Y-%m-%d")
    actuales, fallidos, archivos = {}, set(), {}
    docs_com = documentos(cuerpo_com)
    for url, info in docs_com.items():
        try:
            datos = bajar(url)
        except (OSError, http.client.HTTPException, ValueError):
            fallidos.add(url)
            continue
        if b"Challenge Validation" in datos:   # Akamai también puede servirle esto a un adjunto
            fallidos.add(url)
            continue
        sha = hashlib.sha256(datos).hexdigest()
        actuales[url] = {**info, "sha256": sha, "desde": prev_docs.get(url, {}).get("desde") or fecha(ahora)}
        if prev_docs.get(url, {}).get("sha256") != sha:
            carpeta.mkdir(parents=True, exist_ok=True)
            archivos[url] = carpeta / nombre_archivo(url)
            archivos[url].write_bytes(datos)

    textos = {"comercializacion": cuerpo_com["texto"]}
    if cuerpo_costos is not None:
        textos["costos"] = cuerpo_costos["texto"]
    elif previo and "costos" in previo.get("textos", {}):
        textos["costos"] = previo["textos"]["costos"]

    nuevo_estado = {"actualizado": ahora.isoformat(timespec="seconds"), "textos": textos,
                    "documentos": {**{u: prev_docs[u] for u in fallidos if u in prev_docs}, **actuales}}

    if previo is None:
        msg = f"✅ DCAM vigía · {fecha(ahora)} · estado inicial: {len(actuales)} documentos archivados"
        if fallidos:
            msg += f" · no se pudieron bajar: {len(fallidos)}"
        if aviso_costos:
            msg += " · costos sin leer"
        msg += _codigo_viejo()
        guardar_estado(ruta_estado, nuevo_estado)
        msgs = [{"texto": msg, "clase": "latido"}]
        if any(docs_com[u]["tipo"] == "existencias" for u in fallidos):
            msgs[-1]["reintentar"] = True
        if aviso_costos:
            msgs.insert(0, {"texto": aviso_costos, "clase": "aviso"})
        return 0, msgs

    cambios = comparar(prev_docs, actuales, fallidos)
    msgs = []
    if aviso_costos:
        msgs.append({"texto": aviso_costos, "clase": "aviso"})
    for url in cambios["nuevos"] + cambios["cambiados"]:
        verbo = "nuevo" if url in cambios["nuevos"] else "cambiado"
        titulo = _TITULOS[actuales[url]["tipo"]].format(verbo=verbo, etiqueta=actuales[url]["etiqueta"])
        msgs.append({"texto": f"{titulo}\n{url}", "archivo": str(archivos[url]), "clase": "cambio"})
    diffs = {p: diff_texto(previo["textos"].get(p, ""), t) for p, t in textos.items()}
    for p, lineas in diffs.items():
        if lineas:
            cuerpo_diff = "\n".join(lineas)
            # 3500: límite de Telegram (4096) menos la cabecera del mensaje (título + URL + margen)
            if len(cuerpo_diff) > 3500:
                cuerpo_diff = cuerpo_diff[:3500] + "\n…(truncado)"
            msgs.append({"texto": f"✏️ Cambió el texto de la página «{p}»\n{PAGINAS[p]}\n\n" + cuerpo_diff,
                         "clase": "cambio"})

    partes = [f"{k}: {len(v)}" for k, v in cambios.items() if v]
    if cambios["retirados"]:
        partes[-1] += " (" + ", ".join(prev_docs[u]["etiqueta"] for u in cambios["retirados"]) + ")"
    n_diffs = sum(1 for l in diffs.values() if l)
    if n_diffs:
        partes.append(f"texto cambiado en {n_diffs} página(s)")
    if fallidos:
        partes.append(f"no se pudieron bajar: {len(fallidos)}")
    if aviso_costos:
        partes.append("costos sin leer")
    exist = ", ".join(nombre_archivo(u).split("_", 1)[1] for u, d in actuales.items() if d["tipo"] == "existencias")
    n_img = sum(1 for d in actuales.values() if d["tipo"] == "imagen")
    msgs.append({"texto": f"✅ DCAM vigía · {fecha(ahora)} · {' · '.join(partes) or 'sin cambios'}"
                          f" · existencias: {exist} · {n_img} imágenes", "clase": "latido"})
    if any(docs_com[u]["tipo"] == "existencias" for u in fallidos):
        msgs[-1]["reintentar"] = True

    # Señal para el conciliador: existencias nuevas/cambiadas con PDF ya en disco.
    # Solo escribe la bandera; el .path unit la observa y dispara conciliar-pipeline.sh.
    exist_nuevas = [u for u in cambios["nuevos"] + cambios["cambiados"]
                    if actuales[u]["tipo"] == "existencias" and u in archivos]
    if exist_nuevas:
        senal = dir_base / "pendiente-conciliar.json"
        senal.write_text(json.dumps({
            "fecha": fecha(ahora),
            "pdfs": [str(archivos[u]) for u in exist_nuevas],
            "shas": {actuales[u]["etiqueta"]: actuales[u]["sha256"] for u in exist_nuevas},
        }, ensure_ascii=False, indent=2), encoding="utf-8")

    msgs[-1]["texto"] += " · señal escrita" if exist_nuevas else " · sin señal"
    msgs[-1]["texto"] += _codigo_viejo()

    guardar_estado(ruta_estado, nuevo_estado)
    return 0, msgs

# ── Cuándo leer y cuándo avisar (decisión de Saulo, 28-oct-2026) ──────────────────────────
# El timer despierta cada 30 min; vigilar() decide. Lee en las ranuras de 10:00, 15:00 y 20:00
# (una ranura perdida por un apagón se lee al volver). Si gob.mx falla, reintenta cada 30 min en
# silencio hasta las 08:00 siguientes. Avisa solo si sigue fallando a las 23:00 (uno por noche),
# al instante si la página cargó pero cambió de forma, y otra vez cuando se recupera.
# El resumen «✅ DCAM vigía» sale una vez al día (desde las 20:00) o cuando hay cambios.
RANURAS = (10, 15, 20)
HORA_AVISO = 23
HORA_LIMITE = 8


def ranura_actual(ahora: datetime) -> datetime:
    """La ranura programada más reciente que ya pasó (puede ser la de ayer a las 20:00)."""
    for h in sorted(RANURAS, reverse=True):
        r = ahora.replace(hour=h, minute=0, second=0, microsecond=0)
        if r <= ahora:
            return r
    return (ahora - timedelta(days=1)).replace(hour=max(RANURAS), minute=0, second=0, microsecond=0)


def siguiente(desde: datetime, hora: int) -> datetime:
    """La próxima vez que el reloj marca <hora>:00 estrictamente después de «desde»."""
    t = desde.replace(hour=hora, minute=0, second=0, microsecond=0)
    return t if t > desde else t + timedelta(days=1)


def jornada_latido(ahora: datetime) -> str:
    """Día al que pertenece el resumen: de las 20:00 a las 19:59 del día siguiente."""
    return (ahora - timedelta(hours=max(RANURAS))).date().isoformat()


def _cuando(iso: str) -> str:
    dt = datetime.fromisoformat(iso)
    return f"{dt:%H:%M} del {fecha(dt)}"


def vigilar(bajar, dir_base: Path, ahora: datetime, reintento_seg: float = 60,
            forzar: bool = False) -> tuple[int, list[dict], str]:
    """Envuelve correr() con el calendario de lecturas, los reintentos y los avisos.
    Devuelve (código, mensajes a mandar, nota para el journal)."""
    ruta = dir_base / "vigia-salud.json"
    salud = cargar_estado(ruta) or {}
    ranura = ranura_actual(ahora).isoformat(timespec="minutes")
    falla = salud.get("falla")
    programada = salud.get("ultima_ranura") != ranura
    reintento = falla is not None and ahora < datetime.fromisoformat(falla["limite"])
    if not (forzar or programada or reintento):
        return 0, [], f"nada que hacer (ranura {ranura} ya leída, sin fallas pendientes)"

    codigo, msgs = correr(bajar, dir_base, ahora, reintento_seg)
    salud["ultima_ranura"] = ranura
    roto = bool(msgs) and msgs[0].get("clase") in ("roto", "estructural")
    pendiente_pdf = not roto and any(m.get("reintentar") for m in msgs)
    salida = []

    if not roto:
        cambios = [m for m in msgs if m.get("clase") == "cambio"]
        latido_toca = salud.get("ultimo_latido") != jornada_latido(ahora)
        if latido_toca or cambios:
            salida = msgs
        if latido_toca:
            salud["ultimo_latido"] = jornada_latido(ahora)

    if roto or pendiente_pdf:
        motivo = msgs[0]["motivo"] if roto else "no se pudo bajar un PDF de existencias"
        if falla is None:
            falla = {"desde": ahora.isoformat(timespec="minutes"), "intentos": 0, "avisos": 0,
                     "proximo_aviso": siguiente(ahora, HORA_AVISO).isoformat(timespec="minutes")}
        falla["intentos"] += 1
        falla["motivo"] = motivo
        if programada or "limite" not in falla:
            falla["limite"] = siguiente(ahora, HORA_LIMITE).isoformat(timespec="minutes")
        aviso = None
        if roto and msgs[0]["clase"] == "estructural" and not falla.get("estructural_avisado"):
            falla["estructural_avisado"] = True
            falla["proximo_aviso"] = (siguiente(ahora, HORA_AVISO) + timedelta(days=1)).isoformat(timespec="minutes")
            aviso = (f"⚠️ DCAM vigía: la página de DCAM cargó pero cambió de forma: {motivo}. "
                     "Esto no se arregla esperando; hay que ajustar el vigía. Sigo reintentando por si es pasajero.")
        elif ahora >= datetime.fromisoformat(falla["proximo_aviso"]):
            falla["proximo_aviso"] = siguiente(ahora, HORA_AVISO).isoformat(timespec="minutes")
            aviso = (f"⚠️ DCAM vigía: gob.mx sigue fallando desde las {_cuando(falla['desde'])} "
                     f"({falla['intentos']} intentos). Último error: {motivo}. "
                     f"Sigo reintentando cada 30 min hasta las {_cuando(falla['limite'])}.")
        if aviso:
            falla["avisos"] += 1
            salida = [{"texto": aviso, "clase": "aviso"}] + salida
        salud["falla"] = falla
        nota = f"falla #{falla['intentos']} ({motivo}); reintento cada 30 min hasta {falla['limite']}"
        codigo = 0   # falla atendida: el reintento ya quedó programado
    else:
        nota = "lectura OK"
        if falla is not None:
            nota += f" tras {falla['intentos']} intentos fallidos desde {falla['desde']}"
            if falla["avisos"]:
                salida = [{"texto": f"✅ DCAM vigía recuperado: gob.mx volvió a responder (fallaba desde las "
                                    f"{_cuando(falla['desde'])}, {falla['intentos']} intentos).",
                           "clase": "aviso"}] + salida
        salud.pop("falla", None)

    guardar_estado(ruta, salud)
    return codigo, salida, nota


def enviar(msgs: list[dict], bot) -> bool:
    """Manda todo. Devuelve True solo si cada envío (o bot is None) fue exitoso."""
    ok = True
    for m in msgs:
        print(m["texto"] + (f"\n[adjunto: {m['archivo']}]" if "archivo" in m else ""), end="\n\n", flush=True)
        if bot is None:
            continue
        if "archivo" in m:
            enviado = bot.send_document(m["archivo"], caption=m["texto"][:1024])
        else:
            enviado = bot.send_message(m["texto"])
        ok = ok and enviado
    return ok


def dir_trabajo(sin_telegram: bool, entorno: dict) -> Path:
    """Carpeta de trabajo: DCAM_DIR si está fijada; si no y es --sin-telegram, una
    temporal (no toca el estado real); si no, la de siempre."""
    if "DCAM_DIR" in entorno:
        return Path(entorno["DCAM_DIR"])
    if sin_telegram:
        return Path(tempfile.mkdtemp(prefix="dcam-seco-"))
    return Path.home() / "apps" / "dcam-bot"


def main() -> int:
    ap = argparse.ArgumentParser(description="Vigía DCAM (gob.mx → Telegram)")
    ap.add_argument("--sin-telegram", action="store_true", help="imprime los mensajes en vez de mandarlos")
    ap.add_argument("--forzar", action="store_true", help="lee ya, aunque no toque ranura ni reintento")
    args = ap.parse_args()
    dir_base = dir_trabajo(args.sin_telegram, os.environ)
    if args.sin_telegram and "DCAM_DIR" not in os.environ:
        print(dir_base)
    dir_base.mkdir(parents=True, exist_ok=True)
    bot = None
    if not args.sin_telegram:
        from quiron_telegram import Bot
        bot = Bot.desde_env(os.environ["DCAM_TG_ENV"])
    try:
        codigo, msgs, nota = vigilar(bajar_http, dir_base, datetime.now(),
                                     float(os.environ.get("DCAM_REINTENTO_SEG", "60")), args.forzar)
        print(f"vigía: {nota}", flush=True)
    except Exception:
        traceback.print_exc()
        codigo = 1
        msgs = [{"texto": "⚠️ DCAM vigía roto: excepción no prevista\n" + "".join(traceback.format_exc().splitlines(True)[-12:])}]
    if not enviar(msgs, bot) and codigo == 0:
        codigo = 1
    return codigo


if __name__ == "__main__":
    sys.exit(main())
