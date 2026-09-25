# /// script
# requires-python = ">=3.12,<3.13"
# dependencies = ["rembg[cpu,cli]", "pillow", "numpy"]
# ///
# Armado en México — Copyright (C) 2026 Saulo Flores León
# SPDX-License-Identifier: AGPL-3.0-or-later
# Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
# (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

"""
Prepara fotos de producto para armado.mx: quita el fondo, decontamina el borde,
recorta al arma y codifica a WebP con alfa.

    uv run fotos.py preparar --tipo pistola --solo 13,9,11,79,86,4,88
    uv run fotos.py aplicar  --decisiones decisiones.json
    uv run fotos.py verificar

Cuatro cosas que NO se pueden cambiar sin romper el resultado (ver SKILL.md):

  1. El modelo va SIEMPRE explícito. El de por defecto de rembg es `bria-rmbg`,
     que es CC BY-NC — no vale para este sitio.
  2. El orden es máscara -> decontaminar -> recortar -> escalar -> comprimir.
     Comprimir antes de decontaminar deja el halo blanco fijado en el WebP.
  3. Nunca se escala hacia arriba. Por debajo de MIN_LADO se marca RESUSTITUIR.
  4. La máscara no se binariza (nada de post_process_mask): sobre el hero oscuro
     del sitio un alfa binario se ve aserrado.

ponytail: inferencia en CPU (~20-40 s/foto). onnxruntime-gpu de PyPI no trae
kernels sm_120 y en la RTX 5070 el proveedor CUDA cae a CPU en silencio; no se
pelea. Si algún día hay wheel oficial para Blackwell, basta con cambiar los
providers de la sesión de rembg.
"""
import argparse, json, re, shutil, subprocess, sys, time, unicodedata
from collections import Counter
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

REPO = Path(__file__).resolve().parents[4]           # .../repo/github-deploy
# El proyecto es el ancestro que tiene «Catalogo de Armas». `REPO.parents[1]` solo
# acertaba desde el checkout principal: desde un worktree (.claude/worktrees/<rama>)
# caia dentro del propio repo y la carpeta de trabajo salia en `.claude/`.
PROY = next(p for p in REPO.parents if (p / "Catalogo de Armas").is_dir())
TRABAJO = PROY / "Catalogo de Armas" / "fotos-trabajo"
ORIGINALES = PROY / "Catalogo de Armas" / "imagenes"
# Fotos conseguidas de fuera (fabricante, Wikimedia). Se nombran por ID de arma
# —`<id>.jpg`, o `<id>_loquesea.png`— porque es la unica clave estable: el
# correlativo NNN de `imagenes/` es del catalogo DCAM y solo llega a 111.
FUENTE = PROY / "Catalogo de Armas" / "fotos-fuente"
PUBLICO = REPO / "public"           # todo lo que se sirve tal cual (imagenes/, inventarios/)
DATOS = REPO / "src" / "data"       # los data-*.js: son fuente, ya no viven en la raiz

IMAGENES = PUBLICO / "imagenes"

MODELO = "birefnet-general"
MIN_LADO = 900          # por debajo de esto no hay pipeline que valga: resustituir
ANCHO = 1200
CALIDAD = 80
MARGEN = 0.02           # del lado mayor, alrededor del bbox del alfa


def sin_foto_propia(ruta):
    """La silueta NO es una foto del arma: es el placeholder de su tipo.

    Desde el 8-sep-2026 `data.js` ya no deja `img` vacio — al cargar le pone
    `imagenes/silueta-<tipo>.webp` a cada arma sin foto (data.js:1166), y
    `catalogo()` lo lee con node, asi que aqui llega la silueta, no "".
    Tratarla como foto rompia tres cosas a la vez, y las tres en silencio:

      - `mejor_origen()` la aceptaba como origen. Las siluetas miden EXACTAMENTE
        900 px de lado mayor, asi que `MIN_LADO` no las para (900 < 900 es False)
        y el pipeline recortaba la silueta creyendo que era el arma.
      - `aplicar()` veia una ruta que empieza por `imagenes/` y tomaba la rama de
        sustitucion: `shutil.copy2` PISABA `public/imagenes/silueta-pistola.webp`,
        el placeholder que comparten las 22 pistolas sin foto, y le ponia `?v=2`
        a una sola arma.
      - `verificar()` las contaba como "con alfa" (la silueta tiene alfa), asi
        que decia 252 de 252 y tapaba las 122 armas sin foto.

    Es el mismo predicado que `armaSinFoto` (ui.jsx) y `fixArmaImg` (store.js).
    El aviso de data.js:1156 dice "los tres sitios"; con este, son cuatro.
    """
    ruta = str(ruta or "")
    return not ruta.startswith("imagenes/") or "/silueta-" in ruta

# ─────────────────────────────────────────────────────────────────────────────
# Catálogo: data.js es la ÚNICA fuente de verdad del tipo de arma. El correlativo
# NNN del nombre de archivo NO es contiguo por tipo (042-060 son escopetas).
# ─────────────────────────────────────────────────────────────────────────────

def catalogo():
    js = ("global.window=global;require('./data.js');"
          "console.log(JSON.stringify((window.DB||[]).map(a=>"
          "({id:a.id,nombre:a.nombre,marca:a.marca,tipo:a.tipo,calibre:a.calibre,"
          "img:a.img,dcamRef:a.dcamRef}))))")
    # cwd=DATOS: data.js ya no vive en la raiz. encoding: ver catalogo() de cajas.py.
    out = subprocess.run(["node", "-e", js], cwd=DATOS, capture_output=True,
                         text=True, encoding="utf-8", check=True)
    return json.loads(out.stdout)


def slug_archivo(arma):
    """Nombre de archivo, derivado SOLO del nombre del modelo.

    El nombre ya lleva la marca dentro en todo el catalogo ("IWI Galil ACE 21N",
    "Benelli Vinci"), asi que anteponerla daba `IWI_IWI_Galil_ACE_21N`. Y son 192
    nombres distintos entre 192 armas: no hay colision que el prefijo evite.
    """
    return re.sub(r"[^A-Za-z0-9.-]+", "_", _sin_tildes(arma["nombre"])).strip("_")


def _sin_tildes(s):
    """NFKD tumba CUALQUIER diacritico, no solo los cinco del castellano.

    La tabla anterior no cubria la C con hacek de "Ceska Zbrojovka", asi que la
    letra se caia entera y el archivo salia como `eska_Zbrojovka_...`.
    """
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))


def _alfa_de_fabrica(alfa):
    """¿La foto ya viene recortada de origen, con un alfa en el que confiar?

    Los fabricantes publican PNG ya recortados (Benelli, Weatherby) y ese alfa es
    MEJOR que el que infiere el modelo: lo hizo un humano con el producto delante.
    Reinferir sobre el aplanado destruye trabajo — medido el 31-ago-2026 en la
    Benelli MR1 y la Argo-E, donde rembg RELLENO el hueco del guardamonte y en la
    ficha, sobre el hero oscuro, quedaba una mancha blanca en mitad del arma.

    Se exige que sea un recorte de verdad, no un canal alfa suelto: el marco tiene
    que estar mayoritariamente transparente y tiene que quedar arma dentro.
    """
    if alfa is None or alfa.ndim != 2:
        return False
    b = 4
    marco = np.concatenate([alfa[:b].ravel(), alfa[-b:].ravel(),
                            alfa[:, :b].ravel(), alfa[:, -b:].ravel()])
    marco_libre = float((marco < 16).mean())
    cuerpo = float((alfa > 128).mean())
    return marco_libre > 0.90 and 0.02 < cuerpo < 0.92


def _candidatos(arma):
    """Los origenes posibles de un arma, con bandera de si son EXTERNOS al repo.

    `externo` separa "hay una foto de fuera que puedo recortar" de "solo tengo el
    WebP que ya sirvo": recortar el segundo es recomprimir un WebP, que es el
    ultimo recurso y no el primero. `pendientes()` decide con esa bandera.
    """
    # Lo descargado de fuera, por id de arma
    cands = [(p, True) for p in sorted(FUENTE.glob(f"{arma['id']}.*"))
                              + sorted(FUENTE.glob(f"{arma['id']}_*"))]
    ruta_repo = str(arma.get("img") or "")
    if not sin_foto_propia(ruta_repo):
        p = PUBLICO / ruta_repo.split("?")[0]
        if p.exists():
            cands.append((p, False))          # el WebP que ya se sirve
        # el original sin comprimir, por su correlativo NNN
        nnn = Path(ruta_repo).stem.split("_")[0]
        cands += [(q, True) for q in sorted(ORIGINALES.glob(f"{nnn}_*"))]
    return cands


def mejor_origen(arma):
    """La copia de mayor resolución entre lo conseguido de fuera y lo que ya hay.

    Las armas sin foto propia no tienen origen en el repo — `data.js` les asigna
    la silueta de su tipo al cargar, y `sin_foto_propia()` la descarta. Para esas,
    `fotos-fuente/<id>.*` es el UNICO origen posible, asi que se mira siempre,
    tenga o no ruta en el repo.
    """
    elegida = elegida_px = None
    for p, _externo in _candidatos(arma):
        try:
            with Image.open(p) as im:
                px = max(im.size)
        except Exception:
            continue
        if elegida is None or px > elegida_px:
            elegida, elegida_px = p, px
    return elegida, (elegida_px or 0)


# ─────────────────────────────────────────────────────────────────────────────
# Recorte
# ─────────────────────────────────────────────────────────────────────────────

_sesion = None

def mascara(img):
    """Alfa del modelo. Devuelve uint8 (H,W). El RGB se toma del ORIGINAL, no de
    la salida de rembg: así la decontaminación parte de píxeles intactos."""
    global _sesion
    from rembg import new_session, remove
    if _sesion is None:
        _sesion = new_session(MODELO)
    salida = remove(img, session=_sesion, post_process_mask=False)
    return np.array(salida.convert("RGBA"))[:, :, 3]


def aplanar(im):
    """RGB sobre BLANCO cuando la foto ya trae alfa.

    Pillow aplana RGBA contra NEGRO en .convert("RGB"), y eso envenena todo lo
    que viene detras: color_fondo mide negro, y la decontaminacion ACLARA el
    borde en vez de limpiarlo (medido: halo +109 en la Beretta 80X, que ya
    traia alfa). Sobre blanco el fondo medido es el real y la formula corrige
    en la direccion correcta.
    """
    if im.mode in ("RGBA", "LA") or "transparency" in im.info:
        fondo = Image.new("RGBA", im.size, (255, 255, 255, 255))
        return Image.alpha_composite(fondo, im.convert("RGBA")).convert("RGB")
    return im.convert("RGB")


def color_fondo(rgb):
    """Mediana del marco exterior: es el color que contamina el borde."""
    b = 6
    marco = np.concatenate([
        rgb[:b].reshape(-1, 3), rgb[-b:].reshape(-1, 3),
        rgb[:, :b].reshape(-1, 3), rgb[:, -b:].reshape(-1, 3),
    ])
    return np.median(marco, axis=0)


def decontaminar(rgb, alfa, bg):
    """C_fg = (C_obs - (1-a)*C_bg) / a  en la banda semitransparente.

    Corrige el RGB en vez de adelgazar el borde: es lo que quita el halo de
    verdad. Erosionar un píxel solo lo estrecha dejando el tinte incrustado.
    """
    out = rgb.astype(np.float32).copy()
    a = alfa.astype(np.float32) / 255.0
    banda = (alfa > 16) & (alfa < 240)
    if banda.any():
        af = np.clip(a[banda], 0.10, 1.0)[:, None]
        corregido = np.clip((out[banda] - (1 - af) * bg[None, :]) / af, 0, 255)
        # La division se dispara con alfa baja y saca bordes negros (medido:
        # -34 y -43 en fotos de fondo degradado). El peso desvanece la
        # correccion por debajo de a=0.35 en vez de recortarla de golpe.
        peso = np.clip((af - 0.35) / 0.40, 0, 1)
        out[banda] = out[banda] * (1 - peso) + corregido * peso
    return np.clip(out, 0, 255).astype(np.uint8)


def recortar(rgba, margen=MARGEN, cuadrado=True):
    """Recorta al arma y la centra en un lienzo 1:1.

    El cuadrado es el formato de la ficha: el hero y las tarjetas centran la
    foto, asi que con lienzos de aspecto distinto cada arma se veia a una
    escala distinta. Con 1:1 el encuadre es identico para todas y el margen
    es el mismo, que es lo unico que se puede estandarizar sin retocar el arma.
    """
    alfa = rgba[:, :, 3]
    ys, xs = np.where(alfa > 16)
    if len(xs) == 0:
        return rgba
    y0, y1 = ys.min(), ys.max() + 1
    x0, x1 = xs.min(), xs.max() + 1
    recorte = rgba[y0:y1, x0:x1]
    if not cuadrado:
        return recorte
    h, w = recorte.shape[:2]
    lado = int(max(h, w) * (1 + 2 * margen))
    lienzo = np.zeros((lado, lado, 4), dtype=rgba.dtype)
    oy, ox = (lado - h) // 2, (lado - w) // 2
    lienzo[oy:oy + h, ox:ox + w] = recorte
    return lienzo


# ─────────────────────────────────────────────────────────────────────────────
# Control de calidad. Rojo => no se propone aprobar. Ver SKILL.md por los umbrales.
# ─────────────────────────────────────────────────────────────────────────────

def huecos_internos(alfa):
    """Componentes transparentes que NO tocan el borde: el guardamonte, el hueco
    del cargador. Cero huecos en una pistola = máscara rellenada.

    Flood-fill desde fuera con un píxel de padding; lo transparente que sobra son
    huecos. Sin scipy ni OpenCV.
    """
    from PIL import ImageDraw
    m = Image.fromarray((alfa > 128).astype(np.uint8) * 255, "L")
    lienzo = Image.new("L", (m.width + 2, m.height + 2), 0)
    lienzo.paste(m, (1, 1))
    fuera = lienzo.copy()
    ImageDraw.floodfill(fuera, (0, 0), 128)
    dentro = (np.array(fuera) == 0)          # transparente y no alcanzado desde fuera
    n_px = int(dentro.sum())
    return n_px, n_px / max(1, alfa.size)


def orientacion(alfa):
    """(lado al que apunta el canon, inclinacion del eje en grados).

    El eje sale de un PCA sobre la silueta. Para saber cual de los dos extremos
    es el canon se compara el grosor perpendicular de las dos mitades: el canon
    es la parte delgada, la empunadura la gruesa. Comprobado contra las cinco
    del piloto: acierta en las cinco.

    Importa porque el estandar del catalogo es canon a la DERECHA. Una foto que
    apunte al otro lado no se arregla con un espejo: invertiria las
    inscripciones y el lado de la ventana de expulsion, que en una ficha
    divulgativa es un error de dato, no de estetica. Se busca otra foto.
    """
    ys, xs = np.nonzero(alfa > 128)
    if len(xs) < 50:
        return "?", 0.0
    x, y = xs - xs.mean(), ys - ys.mean()
    w, v = np.linalg.eigh(np.cov(np.vstack([x, y])))
    ex, ey = v[:, np.argmax(w)]
    ang = float(np.degrees(np.arctan2(-ey, ex)))
    ang = ang - 180 if ang > 90 else (ang + 180 if ang < -90 else ang)
    t, n = x * ex + y * ey, -x * ey + y * ex
    canon_pos = n[t > np.percentile(t, 65)].std() < n[t < np.percentile(t, 35)].std()
    hacia = ("derecha" if ex > 0 else "izquierda") if canon_pos else ("izquierda" if ex > 0 else "derecha")
    return hacia, round(ang, 1)


def parche_de_fondo(rgba):
    """Un hueco del arma —el guardamonte— que la mascara dejo RELLENO con el
    fondo claro. Sobre el hero oscuro se ve como un parche blanco pegado al arma
    (medido: la CZ P-10 S del 25-sep). El semaforo no lo veia: `huecos_px` cuenta
    los huecos que SI quedaron, y basta con que sobreviva uno para no dar cero.

    Lo que distingue el fondo colado del arma que de verdad es blanca —un
    revolver de acero inoxidable, un grabado— es que el fondo es PLANO. Medido
    sobre las 128 del 25-sep: CZ P-10 S 0.23 de desviacion dentro del parche;
    Taurus 856 inox 2.75, Glock 25 con grabado blanco 1.58, Taurus PT58 cromado
    3.80. Ninguna otra de las 128 llego a tener parche.

    Devuelve el % del arma cubierto por ese parche, o 0.0 si tiene textura.
    """
    alfa, rgb = rgba[:, :, 3], rgba[:, :, :3].astype(np.float32)
    claro = (alfa > 200) & (rgb.min(axis=2) > 235)
    k = 9
    ii = np.cumsum(np.cumsum(claro.astype(np.int32), 0), 1)
    dens = (ii[k:, k:] - ii[:-k, k:] - ii[k:, :-k] + ii[:-k, :-k]) / (k * k)
    nucleo = np.zeros_like(claro)
    nucleo[k // 2:k // 2 + dens.shape[0], k // 2:k // 2 + dens.shape[1]] = dens > 0.97
    if nucleo.sum() < 50:
        return 0.0
    lum = 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]
    if float(lum[nucleo].std()) >= 1.0:      # tiene textura: es el arma, no el fondo
        return 0.0
    return round(100 * float(nucleo.sum()) / max(1, int((alfa > 128).sum())), 2)


def metricas(rgb_orig, alfa_orig, rgba_final, origen_px, peso_kb, alfa_de_fabrica=False):
    alfa = rgba_final[:, :, 3]
    rgb = rgba_final[:, :, :3]
    lum = lambda px: (0.299 * px[:, 0] + 0.587 * px[:, 1] + 0.114 * px[:, 2])

    m = {}
    op_f = alfa > 128
    m["alpha_pct"] = round(100 * float(op_f.mean()), 1)

    # Sobre el LIENZO, alpha_pct mide el aspecto del arma, no la calidad del
    # recorte: un rifle de 5:1 en un lienzo 1:1 no pasa del 9% aunque este
    # impecable. Medido sobre las 28 del 31-ago: buenas largas 4.4-9.0, buenas
    # pistolas 30.2-39.2 — sin solape, o sea que un umbral unico no existe. Lo
    # que SI es invariante al aspecto es cuanto llena el arma su PROPIO bbox:
    # buenas 24.8-56.4, y la unica mala por mascara rota (Benelli) en 9.9.
    ys, xs = np.nonzero(op_f)
    if len(xs):
        caja = (int(xs.max() - xs.min()) + 1) * (int(ys.max() - ys.min()) + 1)
        m["llenado"] = round(100 * float(op_f.sum()) / caja, 1)
    else:
        m["llenado"] = 0.0

    n_hueco, frac = huecos_internos(alfa)
    m["huecos_px"] = n_hueco
    m["huecos_pct"] = round(100 * frac, 3)
    # Mismo problema de escala: el guardamonte mide lo que mide, pero el lienzo
    # de un arma larga es enorme. Relativo al arma separa limpio: buenas >= 1.11,
    # y las tres mascaras rellenadas (dos Retay, un Gordion) entre 0.0 y 0.17.
    m["huecos_rel"] = round(100 * n_hueco / max(1, int(op_f.sum())), 2)

    banda, interior = (alfa > 16) & (alfa < 240), alfa > 240
    # El halo se mide contra los pixeles opacos VECINOS, no contra el arma
    # entera. Un arma negra sobre fondo blanco da un borde antialias de
    # luminancia intermedia por pura mezcla: comparado con el interior completo
    # marcaba +117 en recortes impecables (medido en la Canik METE SFX). La
    # pregunta correcta es si el borde es mas claro que el arma JUSTO AL LADO.
    if banda.any() and interior.any():
        from PIL import ImageFilter
        cerca = np.array(Image.fromarray((banda * 255).astype(np.uint8), "L")
                         .filter(ImageFilter.MaxFilter(9))) > 0
        vecinos = cerca & interior
        ref = rgb[vecinos] if vecinos.any() else rgb[interior]
        # ...y ponderado por alfa: un pixel blanco con alfa 0.1 no se ve, uno
        # con alfa 0.9 si. Sin ponderar, un recorte impecable de un arma negra
        # marcaba +96 por el blanco residual de la cola casi transparente.
        w = alfa[banda].astype(np.float32) / 255.0
        m["halo"] = round(float(np.average(lum(rgb[banda]), weights=w) - lum(ref).mean()), 1)
    else:
        m["halo"] = 0.0

    per = 2 * (rgba_final.shape[0] + rgba_final.shape[1])
    m["dureza_borde"] = round(float(banda.sum()) / max(1, per), 2)

    # ¿el arma sale cortada en la foto de ORIGEN? (se mide antes del recorte)
    op = alfa_orig > 128
    tocando = max(op[0].mean(), op[-1].mean(), op[:, 0].mean(), op[:, -1].mean())
    m["borde_recortado"] = round(100 * float(tocando), 2)

    # Juez determinista: solo vale donde el fondo original es blanco limpio.
    bg = color_fondo(rgb_orig)
    borde = np.concatenate([rgb_orig[:6].reshape(-1, 3), rgb_orig[-6:].reshape(-1, 3),
                            rgb_orig[:, :6].reshape(-1, 3), rgb_orig[:, -6:].reshape(-1, 3)])
    m["fondo_sigma"] = round(float(lum(borde).std()), 1)
    if m["fondo_sigma"] <= 12 and lum(bg[None, :])[0] > 200:
        dist = np.abs(rgb_orig.astype(np.int16) - bg[None, None, :]).sum(axis=2)
        # El umbral es >=160, no >60: en la franja intermedia esta la SOMBRA de la
        # foto de producto, que rembg hace bien en dejar fuera del alfa (sobre el
        # hero oscuro una sombra pegada al arma se ve como suciedad). Contandola
        # como arma, el Weatherby .300 marcaba 0.721 con un recorte impecable: la
        # sombra era el 26.5% de lo no-blanco. Numerador y denominador sobre el
        # MISMO conjunto, asi la razon queda acotada a 1 por construccion.
        objeto = dist >= 160
        n_obj = int(objeto.sum())
        m["mordida"] = (round(float((op & objeto).sum()) / n_obj, 3)
                        if n_obj > 0.005 * objeto.size else None)
    else:
        m["mordida"] = None

    m["parche_fondo"] = parche_de_fondo(rgba_final)
    # Una foto que YA viene recortada de fabrica toca sus cuatro bordes por
    # construccion y no tiene fondo que medir: sus pixeles de fuera son
    # transparentes, no una escena. Aplicarle `borde_recortado` y `fondo_sigma`
    # rechazaba en rojo las siete Breda del 25-sep, que son PNG de catalogo
    # impecables. El semaforo lee esta bandera para saltarse esas dos.
    m["alfa_de_fabrica"] = bool(alfa_de_fabrica)

    m["canon"], m["inclinacion"] = orientacion(alfa)
    m["aspecto"] = round(rgba_final.shape[1] / max(1, rgba_final.shape[0]), 2)
    m["resolucion"] = max(rgba_final.shape[:2])
    m["origen_px"] = origen_px
    m["peso_kb"] = round(peso_kb, 1)
    m["luminancia_sujeto"] = round(float(lum(rgb[interior]).mean()), 1) if interior.any() else 0.0
    return m


def semaforo(m):
    # `niveles` es metrica -> peor nivel que alcanzo, y es lo que pinta la hoja. Existe
    # porque la hoja reimplementaba los nueve umbrales en JavaScript y ya divergieron
    # una vez (31-ago-2026: pintaba halo>18 en rojo cuando aqui era ambar desde el
    # 27-ago). Los umbrales viven SOLO aqui; alli solo se leen.
    rojo, ambar, niveles = [], [], {}

    def mal(clave, nivel, texto):
        (rojo if nivel == "rojo" else ambar).append(texto)
        if niveles.get(clave) != "rojo":
            niveles[clave] = nivel

    # Apuntar a la izquierda AVISA, no bloquea (31-ago-2026, decision de Saulo).
    # Nunca se espeja — invertiria inscripciones y ventana de expulsion — pero hay
    # fabricantes que solo publican de ese lado: las seis Mendoza RM22 son foto
    # oficial 5906x1329 y las seis miran a la izquierda. Si el fabricante tiene
    # lateral derecha, se usa esa; si no, entra asi. Lo decide el humano.
    if m["canon"] == "izquierda":             mal("canon", "ambar", "apunta a la izquierda: vale solo si el fabricante no publica lateral derecha")
    if m["resolucion"] < MIN_LADO:            mal("resolucion", "rojo", f"resolucion {m['resolucion']}px")
    if m["llenado"] < 20:                     mal("llenado", "rojo", f"mascara rota: el arma llena el {m['llenado']}% de su bbox")
    if m["alpha_pct"] > 92:                   mal("llenado", "rojo", f"no recorto nada ({m['alpha_pct']}%)")
    if m["huecos_px"] == 0:                   mal("huecos", "rojo", "sin huecos internos: mascara rellenada")
    # El halo alto NO bloquea, avisa. Un objeto oscuro sobre fondo claro tiene un
    # borde antialias intrinsecamente mas claro que el objeto: es muestreo, no un
    # defecto. Medido: recortes impecables (Canik METE SFX, Beretta 80X) marcan
    # +68 y se ven perfectos. Solo un halo flagrante bloquea. El borde
    # ennegrecido si es un defecto real: sale de dividir por alfa muy baja.
    if m["halo"] > 120:                       mal("halo", "rojo", f"halo flagrante (+{m['halo']})")
    elif m["halo"] > 18:                      mal("halo", "ambar", f"halo claro (+{m['halo']}), revisar borde")
    if m["halo"] < -25:                       mal("halo", "rojo", f"borde ennegrecido ({m['halo']})")
    if not m.get("alfa_de_fabrica") and m["borde_recortado"] > 0.5:
        mal("borde_recortado", "rojo", f"arma cortada en el origen ({m['borde_recortado']}%)")
    # Un hueco relleno con el fondo: el semaforo no lo veia porque `huecos_px`
    # solo exige que sobreviva UNO. Umbral medido sobre 128 fotos: la unica con
    # parche plano de verdad marco 3.21%, y ninguna sana paso de 0.03%.
    if m.get("parche_fondo", 0) > 0.3:
        mal("parche_fondo", "rojo", f"hueco relleno con el fondo ({m['parche_fondo']}% del arma)")
    # Ya no hay rama "dejo fondo": la mordida esta acotada a 1 por construccion.
    # Ese modo lo cubre `alpha_pct > 92` / `llenado`. Si vuelve a aparecer una
    # mascara que se traga el fondo sin disparar ninguna de las dos, medir antes
    # de anadir un umbral nuevo.
    if m["mordida"] is not None and m["mordida"] < 0.93:
        mal("mordida", "rojo", f"mordida {m['mordida']}: se comio parte")
    if 0 < m["huecos_rel"] < 1.0:             mal("huecos", "ambar", f"huecos minimos ({m['huecos_rel']}% del arma)")
    if m["dureza_borde"] < 0.8:               mal("dureza_borde", "ambar", f"borde duro ({m['dureza_borde']})")
    if m["dureza_borde"] > 6:                 mal("dureza_borde", "ambar", f"borde lavado ({m['dureza_borde']})")
    # Sigma alto = fondo con textura, casi siempre una escena. Medido sobre las 28:
    # ninguna foto BUENA paso de 20.0, y por encima de 25 solo hay malas — dos con
    # una persona sosteniendo el arma (CZ 600 American 41.3, Retay Gordion 50.6),
    # que antes salian ambar y se colaban a la aprobacion. Por eso ahora bloquea.
    # Con alfa de fabrica no hay fondo que medir: lo de fuera del arma es
    # transparente y el RGB que queda ahi es basura del codificador.
    if m.get("alfa_de_fabrica"):              pass
    elif m["fondo_sigma"] > 25:               mal("fondo_sigma", "rojo", f"foto de escena, no de producto (sigma {m['fondo_sigma']})")
    elif m["fondo_sigma"] > 12:               mal("fondo_sigma", "ambar", f"fondo con textura (sigma {m['fondo_sigma']})")
    if m["peso_kb"] > 140:                    mal("peso_kb", "ambar", f"pesa {m['peso_kb']} KB")
    if m["luminancia_sujeto"] < 45:           mal("luminancia", "ambar", f"arma muy oscura (L {m['luminancia_sujeto']})")
    return ("rojo" if rojo else "ambar" if ambar else "verde"), rojo + ambar, niveles


# ─────────────────────────────────────────────────────────────────────────────
# Subcomando: preparar
# ─────────────────────────────────────────────────────────────────────────────

def preparar(args):
    for d in ("1-fuente", "2-master", "3-final"):
        (TRABAJO / d).mkdir(parents=True, exist_ok=True)

    db = catalogo()
    # --solo manda sobre --tipo: una tanda puede cruzar tipos, y informe.json se
    # reescribe entero en cada corrida (correr tipo por tipo perdia la anterior).
    if args.solo:
        pedidos = {int(x) for x in args.solo.split(",")}
        lote = [a for a in db if a["id"] in pedidos]
        faltan = pedidos - {a["id"] for a in lote}
        if faltan:
            sys.exit(f"ids que no estan en data.js: {sorted(faltan)}")
    else:
        lote = [a for a in db if a["tipo"] == args.tipo]
    print(f"lote: {len(lote)} arma(s)")

    informe = []
    for i, arma in enumerate(lote, 1):
        etq = f"[{i}/{len(lote)}] #{arma['id']} {arma['marca']} {arma['nombre']}"
        origen, px = mejor_origen(arma)
        if origen is None:
            print(f"{etq}: SIN ORIGEN")
            informe.append({**_ficha(arma), "estado": "SIN_ORIGEN"})
            continue
        if px < MIN_LADO:
            print(f"{etq}: RESUSTITUIR ({px}px < {MIN_LADO})")
            informe.append({**_ficha(arma), "estado": "RESUSTITUIR", "origen": origen.name,
                            "origen_px": px})
            continue

        t0 = time.time()
        with Image.open(origen) as im:
            # Un EXIF corrupto no puede tumbar la tanda entera: los PNG de Breda
            # traen uno que Pillow no sabe leer (ValueError en fromhex) y se
            # llevaron por delante 6 de 22 armas a medio lote. Sin EXIF legible
            # no hay rotacion que aplicar, que es justo lo que hace este paso.
            try:
                im = ImageOps.exif_transpose(im)
            except Exception as exc:                       # noqa: BLE001
                print(f"      (EXIF ilegible en {origen.name}, sigo sin rotar: {exc})")
            plano = aplanar(im)
            rgb_orig = np.array(plano)
            alfa_previo = np.array(im.convert("RGBA"))[:, :, 3] if im.mode in ("RGBA", "LA", "P") else None
            # Si la foto YA viene recortada de fabrica, ese alfa gana: es mejor que
            # el que infiere el modelo y sale gratis. Ver _alfa_de_fabrica().
            de_fabrica = _alfa_de_fabrica(alfa_previo)
            alfa = alfa_previo if de_fabrica else mascara(plano)

        # ORDEN FIJO: decontaminar -> recortar -> escalar -> comprimir
        rgb = decontaminar(rgb_orig, alfa, color_fondo(rgb_orig))
        rgba = recortar(np.dstack([rgb, alfa]))

        master = Image.fromarray(rgba, "RGBA")
        nombre = slug_archivo(arma)
        master.save(TRABAJO / "2-master" / f"{nombre}.png")

        final = master.copy()
        final.thumbnail((args.ancho, args.ancho), Image.LANCZOS)   # solo reduce
        dst = TRABAJO / "3-final" / f"{nombre}.webp"
        final.save(dst, "WEBP", quality=args.calidad, method=6)

        m = metricas(rgb_orig, alfa, np.array(final), px, dst.stat().st_size / 1024,
                     alfa_de_fabrica=de_fabrica)
        color, notas, niveles = semaforo(m)
        informe.append({**_ficha(arma), "estado": "PROCESADA", "origen": str(origen),
                        "origen_px": px, "archivo": dst.name,
                        "actual": arma.get("img", ""), "traia_alfa": alfa_previo is not None
                        and bool((alfa_previo < 250).any()),
                        "alfa_de_fabrica": de_fabrica,
                        "metricas": m, "color": color, "notas": notas, "niveles": niveles,
                        "segundos": round(time.time() - t0, 1)})
        print(f"{etq}: {color.upper()} {final.size[0]}x{final.size[1]} "
              f"{m['peso_kb']}KB {round(time.time()-t0,1)}s"
              + ("  [alfa de fabrica]" if de_fabrica else "")
              + (f"  <- {'; '.join(notas)}" if notas else ""))

    # El informe ACUMULA entre corridas, y la hoja muestra todo lo que hay en
    # 3-final — igual que accesorios.py y cajas.py. Antes se reescribia entero, asi
    # que la tanda anterior se perdia y habia que procesar las 253 de una sentada
    # (a ~25 s por foto en CPU) para tener una sola hoja. Se conserva lo previo cuyo
    # WebP siga vivo, y lo que no llego a producir archivo (RESUSTITUIR/SIN_ORIGEN)
    # porque es justo la lista de lo que falta conseguir.
    ruta_informe = TRABAJO / "informe.json"
    previas = {}
    if ruta_informe.exists():
        previas = {r["id"]: r for r in json.loads(ruta_informe.read_text("utf-8"))}
    previas.update({r["id"]: r for r in informe})
    vivos = {q.name for q in (TRABAJO / "3-final").glob("*.webp")}
    informe = [r for r in sorted(previas.values(), key=lambda r: r["id"])
               if r.get("estado") != "PROCESADA" or r.get("archivo") in vivos]
    ruta_informe.write_text(json.dumps(informe, ensure_ascii=False, indent=1), "utf-8")
    hoja(informe)
    n = lambda c: sum(1 for r in informe if r.get("color") == c)
    print(f"\nverde {n('verde')} · ambar {n('ambar')} · rojo {n('rojo')} · "
          f"resustituir {sum(1 for r in informe if r['estado'] == 'RESUSTITUIR')}")
    print(f"hoja: {TRABAJO / 'hoja-de-contactos.html'}")


def _ficha(a):
    return {"id": a["id"], "nombre": a["nombre"], "marca": a["marca"],
            "tipo": a["tipo"], "calibre": a["calibre"]}


# ─────────────────────────────────────────────────────────────────────────────
# Subcomando: aplicar
# ─────────────────────────────────────────────────────────────────────────────

def _poner_img(datajs, arma_id, ruta):
    """Rellena el hueco `img` del mk(<arma_id>, ...) de data.js.

    `img` es el 15o argumento posicional de mk() y en las armas sin foto viene
    como un `""` en su propia linea, justo detras del dcamRef. Se busca ESE, sin
    salir del bloque del arma: si aparece otro `mk(` antes, se aborta en vez de
    escribir en la ficha de al lado.

    Devuelve (texto, ok). El que llama DEBE verificar despues contra data.js
    cargado en node — un reemplazo posicional no se comprueba a ojo.
    """
    lineas = datajs.split("\n")
    ini = next((n for n, l in enumerate(lineas) if re.search(rf"\bmk\(\s*{arma_id}\s*,", l)), None)
    if ini is None:
        return datajs, False
    for n in range(ini, min(ini + 8, len(lineas))):
        if n > ini and re.search(r"\bmk\(\s*\d+\s*,", lineas[n]):
            return datajs, False                      # nos salimos del arma
        if lineas[n].strip() == '"",':
            sangria = lineas[n][:len(lineas[n]) - len(lineas[n].lstrip())]
            lineas[n] = f'{sangria}"{ruta}",'
            return "\n".join(lineas), True
    return datajs, False


def aplicar(args):
    informe = json.loads((TRABAJO / "informe.json").read_text("utf-8"))
    porid = {r["id"]: r for r in informe}

    if args.aprobar:
        ids = [int(x) for x in args.aprobar.split(",")]
    else:
        dec = json.loads(Path(args.decisiones).read_text("utf-8"))
        ids = [d["id"] for d in dec["decisiones"] if d["estado"] == "aprobada"]
    if not ids:
        print("nada aprobado")
        return 0

    datajs = (DATOS / "data.js").read_text("utf-8")
    copiadas, altas, parches = [], [], 0
    for i in ids:
        r = porid.get(i)
        if not r or r["estado"] != "PROCESADA":
            print(f"  #{i}: sin foto procesada, se salta")
            continue
        actual = str(r.get("actual") or "")
        if sin_foto_propia(actual):
            # Alta nueva: el arma no tenia foto (data.js le pone el placeholder SVG
            # al cargar, porque su `img` viene vacio). Se le da ruta propia y se
            # rellena el hueco `img` de su mk(), que es el 15o argumento.
            nueva = f"imagenes/{r['archivo']}"
            destino = PUBLICO / nueva
            if destino.exists():
                print(f"  #{i}: {nueva} ya existe, no piso nada — revisa a mano")
                continue
            datajs, ok = _poner_img(datajs, i, nueva)
            if not ok:
                print(f"  #{i}: no encuentro el hueco img de su mk() en data.js")
                continue
            shutil.copy2(TRABAJO / "3-final" / r["archivo"], destino)
            copiadas.append(destino.name)
            altas.append((i, nueva))
            continue
        destino = PUBLICO / actual.split("?")[0]
        shutil.copy2(TRABAJO / "3-final" / r["archivo"], destino)
        copiadas.append(destino.name)

        # Cache-busting: imagenes/ va con max-age de un ano (_headers), asi que
        # el mismo nombre no lo vuelve a pedir nadie que ya haya entrado. La
        # query basta: _headers empareja por path, el navegador cachea por URL.
        base = actual.split("?")[0]
        ver = 2
        if f'"{base}?v=' in datajs:
            actualver = datajs.split(f'"{base}?v=')[1].split('"')[0]
            ver = int(actualver) + 1
        antiguo = f'"{base}?v={ver - 1}"' if ver > 2 else f'"{base}"'
        if antiguo in datajs:
            datajs = datajs.replace(antiguo, f'"{base}?v={ver}"')
            parches += 1
        else:
            print(f"  #{i}: no encuentro {antiguo} en data.js")

    (DATOS / "data.js").write_text(datajs, "utf-8")

    # Las altas se escriben por posicion de argumento. Eso NO se da por bueno sin
    # comprobarlo: se recarga data.js en node y se mira que cada arma tenga
    # exactamente la ruta que le tocaba. Si una no cuadra, el `img` se fue a la
    # ficha equivocada y hay que revertir a mano — por eso aborta ruidosamente.
    if altas:
        db = {a["id"]: a for a in catalogo()}
        malas = [(i, ruta, str(db.get(i, {}).get("img") or ""))
                 for i, ruta in altas if str(db.get(i, {}).get("img") or "") != ruta]
        if malas:
            print("\n!! ALTAS MAL ESCRITAS — data.js quedo tocado, REVISA con git diff:")
            for i, esperada, real in malas:
                print(f"   #{i}: esperaba {esperada!r}, data.js dice {real!r}")
            return 1
        print(f"\naltas verificadas contra data.js: {len(altas)}")
        for i, ruta in altas:
            print(f"   #{i} {db[i]['nombre']} -> {ruta}")

    print("")
    print(f"copiadas {len(copiadas)}: {', '.join(copiadas)}")
    print(f"rutas versionadas en data.js: {parches}")
    print("")
    print("RECORDATORIOS (skill publicar):")
    print("  - data.js cambio: sube el ?v= de los <script src=\"data.js?v=...\"> en")
    print("    src/pages/index.html y src/pages/admin.html")
    print("  - tras publicar: resiembra D1 con la skill sincronizar-d1 (resembrar.js armas);")
    print("    NO con el boton del admin, que sube el catalogo viejo del navegador")
    return 0


# ─────────────────────────────────────────────────────────────────────────────
# Subcomando: verificar — el check ejecutable. Hoy dice "88 de 111 sin alfa".
# ─────────────────────────────────────────────────────────────────────────────

def verificar(args):
    db = catalogo()
    sin_alfa, faltan, sin_foto, ok = [], [], [], 0
    for a in db:
        ruta = str(a.get("img") or "")
        if sin_foto_propia(ruta):
            # Su silueta de tipo, o sin ruta: el hueco que hay que llenar. Desde
            # que data.js asigna la silueta (8-sep) esto ya no caia en el
            # `continue`, entraba al conteo y sumaba a "con alfa" — la silueta
            # tiene alfa. Resultado: "252 con alfa" y las 122 armas tapadas.
            sin_foto.append((a["id"], a["tipo"], a["nombre"]))
            continue
        p = PUBLICO / ruta.split("?")[0]
        if not p.exists():
            faltan.append((a["id"], ruta))
            continue
        with Image.open(p) as im:
            alfa = im.convert("RGBA").getchannel("A")
            (ok := ok + 1) if alfa.getextrema()[0] < 250 else sin_alfa.append((a["id"], a["tipo"], p.name))
    print(f"con alfa: {ok} | sin alfa: {len(sin_alfa)} | "
          f"sin foto propia: {len(sin_foto)} | rutas rotas: {len(faltan)}")
    for id_, ruta in faltan:
        print(f"  ROTA  #{id_} {ruta}")
    if args.tipo:
        del_tipo = [s for s in sin_alfa if s[1] == args.tipo]
        print(f"\nsin alfa en {args.tipo}: {len(del_tipo)}")
        for id_, _, n in del_tipo:
            print(f"  #{id_} {n}")
        del_tipo = [x for x in sin_foto if x[1] == args.tipo]
        print()
        print(f"sin foto propia en {args.tipo}: {len(del_tipo)}")
        for id_, _, n in del_tipo:
            print(f"  #{id_} {n}")
    return 1 if faltan else 0


# ─────────────────────────────────────────────────────────────────────────────
# Subcomando: autocheck — fija con asserts lo que se rompio alguna vez en silencio.
# Cada numero es el que justifico su umbral; si cambias uno, este check te lo dice.
# ─────────────────────────────────────────────────────────────────────────────

# Metricas de una foto impecable. Cada assert mueve UNA y comprueba su rama.
_BASE = dict(canon="derecha", resolucion=1200, llenado=35.0, alpha_pct=30.0,
             huecos_px=800, huecos_pct=2.0, huecos_rel=1.5, halo=5.0,
             dureza_borde=2.0, borde_recortado=0.1, fondo_sigma=8.0, mordida=0.99,
             peso_kb=90.0, luminancia_sujeto=70.0, parche_fondo=0.0,
             alfa_de_fabrica=False)


def autocheck(args=None):
    col = lambda **k: semaforo({**_BASE, **k})[0]

    # sin_foto_propia: el bug del 22-sep. La silueta mide 900 px justos, asi que
    # MIN_LADO no la paraba, y `aplicar` PISABA el placeholder compartido.
    assert sin_foto_propia("imagenes/silueta-pistola.webp"), "la silueta no es foto"
    assert sin_foto_propia("imagenes/silueta-escopeta.webp?v=3"), "ni con cache-buster"
    assert sin_foto_propia(""), "sin ruta es sin foto"
    assert sin_foto_propia(None), "None es sin foto"
    assert sin_foto_propia("data:image/svg+xml;base64,AAA"), "el data-URI viejo, tambien"
    assert not sin_foto_propia("imagenes/013_Beretta_80x_Cheetah.webp"), "esta SI es foto"
    assert not sin_foto_propia("imagenes/Benelli_Vinci.webp?v=2"), "y esta tambien"

    # semaforo: los umbrales, con el caso medido que fijo cada uno.
    assert col() == "verde"
    assert col(huecos_px=0) == "rojo", "mascara rellenada (las dos Retay, el Gordion)"
    assert col(resolucion=899) == "rojo" and col(resolucion=900) == "verde", "MIN_LADO"
    assert col(halo=68) == "ambar", "recortes impecables marcan +68 (Canik METE SFX)"
    assert col(halo=130) == "rojo", "halo flagrante"
    assert col(halo=-30) == "rojo", "borde ennegrecido: division por alfa baja"
    assert col(fondo_sigma=20.0) == "ambar", "ninguna foto BUENA paso de 20.0"
    assert col(fondo_sigma=41.3) == "rojo", "CZ 600 American: persona sosteniendo el arma"
    assert col(mordida=0.92) == "rojo" and col(mordida=0.93) == "verde"
    assert col(llenado=19.0) == "rojo" and col(alpha_pct=93.0) == "rojo"
    assert col(borde_recortado=0.6) == "rojo", "arma cortada en el origen"
    # 25-sep-2026: las siete Breda son PNG de catalogo con alfa de fabrica. Tocan
    # sus cuatro bordes por construccion y no tienen fondo que medir, asi que esas
    # dos reglas no les aplican; el semaforo las rechazaba en rojo a las siete.
    assert col(borde_recortado=0.6, alfa_de_fabrica=True) == "verde",         "con alfa de fabrica, tocar el borde no es estar cortada"
    assert col(fondo_sigma=41.3, alfa_de_fabrica=True) == "verde",         "con alfa de fabrica no hay fondo que medir"
    # El hueco del guardamonte relleno con el fondo: la CZ P-10 S del 25-sep
    # marco 3.21% y se colo como ambar, porque `huecos_px` solo exige que
    # sobreviva UN hueco. Ninguna de las otras 127 de ese dia paso de 0.03%.
    assert col(parche_fondo=3.21) == "rojo", "hueco relleno con el fondo"
    assert col(parche_fondo=0.03) == "verde", "un parche minimo no bloquea"
    assert col(canon="izquierda") == "ambar", "avisa, no bloquea (las seis Mendoza RM22)"

    # `niveles` es lo que pinta la hoja: si una regla no lo rellena, su badge sale
    # verde y el humano aprueba un defecto sin verlo. Se comprueba por metrica.
    niv = lambda **k: semaforo({**_BASE, **k})[2]
    assert niv(halo=68)["halo"] == "ambar", "el nivel tiene que llegar a la hoja"
    assert niv(halo=130)["halo"] == "rojo"
    assert niv(fondo_sigma=41.3)["fondo_sigma"] == "rojo"
    assert niv(huecos_px=0)["huecos"] == "rojo"
    assert niv(alpha_pct=93.0)["llenado"] == "rojo", "alpha_pct pinta el badge de llenado"
    assert niv(resolucion=899)["resolucion"] == "rojo"
    assert niv(canon="izquierda")["canon"] == "ambar"
    assert niv() == {}, "una foto impecable no pinta ningun badge de color"
    # rojo gana sobre ambar en la misma metrica: halo<-25 y halo>18 comparten clave
    assert niv(halo=-30)["halo"] == "rojo"

    # LA HOJA NO PUEDE TENER UMBRALES. Los tuvo, en un espejo manual de estas mismas
    # nueve reglas escrito en JavaScript, y divergio (31-ago-2026: pintaba halo>18 en
    # rojo cuando aqui ya era ambar). Esto era un comentario pidiendo cuidado; ahora
    # es un assert, que es lo unico que de verdad lo impide.
    fuente = Path(__file__).read_text("utf-8")
    # con el salto de linea delante: si no, la busqueda se encuentra a SI MISMA,
    # porque esta linea contiene la cadena que busca y esta antes que la funcion.
    cuerpo_hoja = fuente[fuente.index(chr(10) + "def hoja("):]
    for prohibido in ("m.llenado <", "m.alpha_pct >", "m.huecos_px ===", "m.huecos_rel <",
                      "m.halo >", "m.halo <", "m.dureza_borde <", "m.dureza_borde >",
                      "m.fondo_sigma >", "m.mordida <", "m.canon ===", "m.resolucion <",
                      "m.peso_kb >"):
        assert prohibido not in cuerpo_hoja, (
            f"la hoja volvio a comparar un umbral a mano ({prohibido!r}): "
            "usa r.niveles, que lo resuelve semaforo()")
    assert "r.niveles" in cuerpo_hoja, "la hoja tiene que leer los niveles de semaforo()"

    print("autocheck: ok")
    return 0


# ─────────────────────────────────────────────────────────────────────────────
# Subcomando: pendientes — el censo. Que necesita cada arma, medido contra disco.
# ─────────────────────────────────────────────────────────────────────────────

# Que hay que hacer con cada arma. El orden es el de menor a mayor coste.
ESTADOS = {
    "LISTA":       "foto propia con alfa: nada que hacer",
    "POR_PROCESAR": "sin foto, pero su origen ya esta en fotos-fuente: solo falta `preparar`",
    "RECORTABLE":  "fondo opaco y hay original externo >=900: intenta `preparar`, sin buscar nada",
    "RECOMPRIMIR": "fondo opaco y solo el WebP servido llega a 900: recomprimir es el ultimo recurso",
    "RESUSTITUIR": "fondo opaco y ningun origen llega a 900: hace falta OTRA foto",
    "SIN_FOTO":    "sin foto y sin origen: hace falta CONSEGUIR la foto",
}
NECESITAN_WEB = ("SIN_FOTO", "RESUSTITUIR")


def _estado(arma):
    """Clasifica un arma y devuelve (estado, px del mejor origen, ruta del mejor).

    La distincion que importa: `externo` (fotos-fuente o el original sin comprimir
    de la descarga DCAM) contra el WebP que ya se sirve. Recortar el externo es el
    pipeline normal; recortar el servido es recomprimir un WebP ya comprimido.
    """
    ext = prop = 0
    mejor = None
    for q, externo in _candidatos(arma):
        try:
            with Image.open(q) as im:
                px = max(im.size)
        except Exception:
            continue
        if externo:
            if px > ext:
                ext, mejor = px, q
        else:
            prop = max(prop, px)
    if sin_foto_propia(arma.get("img")):
        return ("POR_PROCESAR" if ext >= MIN_LADO else "SIN_FOTO"), ext, mejor
    servida = PUBLICO / str(arma["img"]).split("?")[0]
    try:
        with Image.open(servida) as im:
            alfa = im.convert("RGBA").getchannel("A")
        if alfa.getextrema()[0] < 250:
            return "LISTA", max(ext, prop), mejor
    except Exception:
        pass
    if ext >= MIN_LADO:
        return "RECORTABLE", ext, mejor
    if prop >= MIN_LADO:
        return "RECOMPRIMIR", prop, servida
    return "RESUSTITUIR", max(ext, prop), mejor


def _veredictos():
    """Lo que el pipeline YA dijo de cada arma, de `informe.json`.

    El censo mide pixeles, y con pixeles no se puede saber si la foto es de escena,
    si el arma esta cortada por el borde o si al recortarla se queda en 478 px. Eso
    solo lo dice la inferencia. Medido el 22-sep: de 30 armas clasificadas como
    RECORTABLE —origen externo de sobra— 22 salieron ROJAS, y ninguna por el recorte:
    escenas con sigma de 41 a 70, una Breda cortada al 68 %, tres Retay que caian a
    801 px. Sin leer esto, el censo las sigue llamando recortables y alguien las
    reintenta. El veredicto del pipeline manda sobre la medida de pixeles.
    """
    ruta = TRABAJO / "informe.json"
    if not ruta.exists():
        return {}
    try:
        return {r["id"]: r for r in json.loads(ruta.read_text("utf-8"))}
    except Exception:
        return {}


def rehacer_hoja(args=None):
    """Rehace la hoja desde informe.json, sin volver a inferir ninguna mascara.

    Hace falta cuando lo que cambia es la HOJA y no las fotos: un orden nuevo, un
    badge nuevo, o —el caso que lo estreno— filas guardadas antes de que semaforo()
    devolviera `niveles`. Reprocesar para eso cuesta 25 s por foto y no cambia un
    solo pixel.
    """
    ruta = TRABAJO / "informe.json"
    if not ruta.exists():
        sys.exit(f"no hay informe todavia: {ruta}")
    informe = json.loads(ruta.read_text("utf-8"))
    hoja(informe)
    ruta.write_text(json.dumps(informe, ensure_ascii=False, indent=1), "utf-8")
    n = lambda c: sum(1 for r in informe if r.get("color") == c)
    print(f"{len(informe)} filas · verde {n('verde')} · ambar {n('ambar')} · rojo {n('rojo')}")
    print(f"hoja: {HOJA if 'HOJA' in globals() else TRABAJO / 'hoja-de-contactos.html'}")
    return 0


def pendientes(args):
    """El censo, medido. Es el input del que busca fotos, y no sale de ningun doc.

    `docs/PLACEHOLDERS.md` llevaba tres semanas diciendo «192 armas, 81 sin foto»
    cuando ya eran 253 y 123: un documento con cifras caduca, este comando no.
    """
    db = catalogo()
    vistos = _veredictos()
    filas = []
    for a in db:
        est, px, mejor = _estado(a)
        nota = ""
        v = vistos.get(a["id"])
        if v and est in ("RECORTABLE", "RECOMPRIMIR", "POR_PROCESAR"):
            # ya se intento: si el pipeline la rechazo, no es recortable, hace falta OTRA foto
            if v.get("color") == "rojo":
                est, nota = "RESUSTITUIR", "el pipeline la rechazo: " + "; ".join(v.get("notas") or [])
            elif v.get("estado") == "RESUSTITUIR":
                est, nota = "RESUSTITUIR", "sin origen util: " + "; ".join(v.get("notas") or [])
            elif v.get("color"):
                nota = f"ya procesada, sale {v['color']}: pendiente de aprobar en la hoja"
        filas.append({
            "nota": nota,
            "clase": "arma", "id": a["id"], "marca": a.get("marca") or "",
            "marca_clave": _sin_tildes(a.get("marca") or "").lower().strip(),
            "nombre": a["nombre"], "tipo": a.get("tipo") or "",
            "calibre": a.get("calibre") or "", "dcamRef": a.get("dcamRef") or "",
            "estado": est, "mejor_px": px,
            "mejor_origen": mejor.name if mejor else "",
        })
    if args.estado:
        filas = [f for f in filas if f["estado"] == args.estado]
    elif args.web:
        filas = [f for f in filas if f["estado"] in NECESITAN_WEB]

    if args.ids:                       # para encadenar: preparar --solo $(... --ids)
        print(",".join(str(f["id"]) for f in filas))
        return 0
    if args.json:
        print(json.dumps(filas, ensure_ascii=False, indent=1))
        return 0

    cuenta = Counter(f["estado"] for f in filas)
    print(f"{len(db)} armas en data.js")
    for est in ESTADOS:
        if cuenta.get(est):
            print(f"  {cuenta[est]:>4}  {est:<12} {ESTADOS[est]}")
    web = [f for f in filas if f["estado"] in NECESITAN_WEB]
    if web:
        print(f"{chr(10)}hace falta buscar en la web: {len(web)}")
        # por marca NORMALIZADA: el catalogo trae «Ceska Zbrojovka» Y «Česká
        # Zbrojovka» como marcas distintas, y sin unirlas el grupo de 27 se parte
        # en 26 + 1 y alguien investiga czub.cz dos veces.
        por_marca = Counter(f["marca_clave"] or "(sin marca)" for f in web)
        print("  " + " | ".join(f"{m} {n}" for m, n in por_marca.most_common()))
    return 0


# ─────────────────────────────────────────────────────────────────────────────
# Hoja de contactos. Autocontenida: el JSON va inline porque fetch() de un .json
# local lo bloquea CORS bajo file:// — es el fallo clásico de este artefacto.
# Las imágenes sí van por ruta relativa (<img src> sí funciona en file://).
# ─────────────────────────────────────────────────────────────────────────────

def hoja(informe):
    # Una fila guardada antes de que semaforo() devolviera `niveles` no los trae, y
    # sin ellos la hoja pinta TODOS los badges en verde: el humano aprobaria un rojo
    # sin verlo. Se recalculan de sus metricas, que ya estan en el informe — mas
    # barato que reinferir 25 s por foto, y mismo resultado porque los umbrales
    # viven en un solo sitio.
    for r in informe:
        if r.get("estado") == "PROCESADA" and not r.get("niveles") and r.get("metricas"):
            r["niveles"] = semaforo(r["metricas"])[2]
    # fondo y filtro copiados literalmente de screens-2.jsx:186-198
    HERO_BG = "radial-gradient(ellipse at 50% 50%, #2C2C2C 0%, #1A1A1A 100%)"
    HERO_FX = "grayscale(0.1) contrast(1.15) drop-shadow(0 8px 24px rgba(0,0,0,.6))"
    datos = json.dumps(informe, ensure_ascii=False)
    html = f"""<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Fotos de producto — revisión</title>
<style>
 :root {{ --amber:#F5C518; --bg:#1A1A1A; --elev:#2C2C2C; --bd:#3A3A3A; --txt:#EDEDED; --dim:#9A9A9A; }}
 * {{ box-sizing:border-box; }}
 body {{ margin:0; background:#121212; color:var(--txt); font:14px/1.5 "Open Sans",system-ui,sans-serif; }}
 header {{ position:sticky; top:0; z-index:9; background:#0E0E0E; border-bottom:1px solid var(--bd);
          padding:12px 18px; display:flex; gap:18px; align-items:center; flex-wrap:wrap; }}
 h1 {{ font-size:16px; margin:0; letter-spacing:.06em; text-transform:uppercase; }}
 .cnt {{ font-family:"Courier Prime",monospace; color:var(--dim); }}
 .cnt b {{ color:var(--amber); }}
 button {{ background:none; border:1px solid var(--bd); color:var(--txt); padding:6px 12px;
           font-family:"Courier Prime",monospace; font-size:12px; cursor:pointer; letter-spacing:.08em; }}
 button:hover {{ border-color:var(--amber); color:var(--amber); }}
 .fila {{ display:grid; grid-template-columns:1fr 1fr 1fr 320px; gap:10px; padding:14px 18px;
          border-bottom:1px solid #242424; scroll-margin-top:64px; }}
 .fila.sel {{ background:#181818; box-shadow:inset 3px 0 0 var(--amber); }}
 .fila.aprobada {{ box-shadow:inset 3px 0 0 #4FAE5C; }}
 .fila.rechazada {{ box-shadow:inset 3px 0 0 #C0392B; opacity:.55; }}
 .fila.falta_foto {{ box-shadow:inset 3px 0 0 #F5C518; opacity:.75; }}
 .panel {{ position:relative; aspect-ratio:4/3; display:flex; align-items:center; justify-content:center;
           border:1px solid var(--bd); overflow:hidden; cursor:zoom-in; }}
 .hero {{ background:{HERO_BG}; }}
 .hero img {{ max-width:85%; max-height:75%; filter:{HERO_FX}; }}
 .alfa {{ background:conic-gradient(#3a3a3a 0 25%, #202020 0 50%) 0 0/16px 16px; }}
 .alfa img {{ max-width:88%; max-height:88%; }}
 .tag {{ position:absolute; top:4px; left:4px; font:11px "Courier Prime",monospace; letter-spacing:.1em;
         background:rgba(0,0,0,.7); color:var(--dim); padding:2px 6px; }}
 .datos {{ font-family:"Courier Prime",monospace; font-size:12px; }}
 .datos h3 {{ font-family:"Open Sans",sans-serif; font-size:15px; margin:0 0 6px; }}
 .datos .k {{ color:var(--dim); }}
 .badge {{ display:inline-block; padding:2px 6px; margin:2px 3px 2px 0; font-size:11px; border:1px solid; }}
 .verde {{ color:#4FAE5C; border-color:#4FAE5C; }} .ambar {{ color:#F5C518; border-color:#F5C518; }}
 .rojo {{ color:#C0392B; border-color:#C0392B; }}
 .acc {{ margin-top:8px; display:flex; gap:6px; flex-wrap:wrap; }}
 .nota {{ width:100%; margin-top:6px; background:#0E0E0E; border:1px solid var(--bd); color:var(--txt);
          font:12px "Courier Prime",monospace; padding:5px; }}
 #zoom {{ position:fixed; inset:0; background:#000C; display:none; align-items:center; justify-content:center;
          z-index:99; cursor:zoom-out; }}
 #zoom img {{ max-width:94vw; max-height:94vh; background:conic-gradient(#3a3a3a 0 25%, #202020 0 50%) 0 0/24px 24px; }}
</style></head><body>
<header>
  <h1>Fotos de producto — revisión</h1>
  <span class="cnt">aprobadas <b id="cA">0</b> · rechazadas <b id="cR">0</b> · falta foto <b id="cF">0</b> · pendientes <b id="cP">0</b></span>
  <button onclick="aprobarVerdes()">Aprobar todas las verdes</button>
  <button onclick="filtrar()">Solo con rojo</button>
  <button onclick="descargar()">Descargar decisiones.json</button>
  <span class="cnt">A aprobar · R rechazar · F falta foto · ↑↓ navegar</span>
</header>
<div id="lista"></div>
<div id="zoom" onclick="this.style.display='none'"><img></div>
<script type="application/json" id="datos">{datos}</script>
<script>
const D = JSON.parse(document.getElementById('datos').textContent);
const CLAVE = 'fotos:revision:v1';
let est = {{}}; try {{ est = JSON.parse(localStorage.getItem(CLAVE) || '{{}}'); }} catch (e) {{}}
let sel = 0, filtrado = false;

const badge = (t, c) => `<span class="badge ${{c}}">${{t}}</span>`;

function pinta() {{
  document.getElementById('lista').innerHTML = D.map((r, i) => {{
    if (r.estado !== 'PROCESADA') return filaSimple(r, i);
    const m = r.metricas, e = est[r.id] || {{}};
    // Los umbrales NO estan aqui: los pone semaforo() en fotos.py y llegan ya
    // resueltos en r.niveles (metrica -> peor nivel). Antes esto era un espejo
    // manual de las nueve reglas y divergio una vez (31-ago-2026: pintaba halo>18
    // en rojo cuando semaforo() lo daba ambar desde el 27-ago). Si añades una
    // metrica, dale su clave en `mal(...)` alli y leela aqui.
    const N = r.niveles || {{}};
    const b = (t, clave) => badge(t, N[clave] || 'verde');
    const mets = [
      b(`llenado ${{m.llenado}}%`, 'llenado'),
      b(`huecos ${{m.huecos_rel}}%`, 'huecos'),
      b(`halo ${{m.halo}}`, 'halo'),
      b(`borde ${{m.dureza_borde}}`, 'dureza_borde'),
      b(`fondo σ${{m.fondo_sigma}}`, 'fondo_sigma'),
      m.mordida !== null ? b(`mordida ${{m.mordida}}`, 'mordida') : '',
      b(`cañón ${{m.canon}}`, 'canon'),
      b(`${{m.resolucion}}px`, 'resolucion'),
      b(`${{m.peso_kb}}KB`, 'peso_kb'),
    ].join('');
    return `<div class="fila ${{e.estado||''}} ${{i===sel?'sel':''}}" id="f${{i}}" data-color="${{r.color}}">
      <div class="panel hero"><span class="tag">ACTUAL</span><img src="${{actualSrc(r)}}"></div>
      <div class="panel hero"><span class="tag">NUEVA · HERO</span><img src="3-final/${{r.archivo}}"></div>
      <div class="panel alfa"><span class="tag">NUEVA · ALFA</span><img src="3-final/${{r.archivo}}"></div>
      <div class="datos">
        <h3>#${{r.id}} ${{r.marca}} ${{r.nombre}}</h3>
        <div><span class="k">calibre</span> ${{r.calibre}}</div>
        <div><span class="k">origen</span> ${{r.origen.split(/[\\\\/]/).pop()}} · ${{r.origen_px}}px${{r.traia_alfa?' · ya traía alfa':''}}</div>
        <div><span class="k">actual</span> ${{(r.actual||'').startsWith('data:')?'placeholder SVG':(r.actual||'').replace('imagenes/','')}}</div>
        <div style="margin-top:6px">${{mets}}</div>
        ${{r.notas.length ? `<div style="color:var(--dim);margin-top:4px">${{r.notas.join(' · ')}}</div>` : ''}}
        <div class="acc">
          <button onclick="marca(${{r.id}},'aprobada')">A · aprobar</button>
          <button onclick="marca(${{r.id}},'rechazada')">R · rechazar</button>
          <button onclick="marca(${{r.id}},'falta_foto')">F · falta foto</button>
        </div>
        <input class="nota" placeholder="motivo (opcional)" value="${{e.motivo||''}}"
               onchange="est[${{r.id}}]=Object.assign(est[${{r.id}}]||{{}},{{motivo:this.value}});guarda()">
      </div></div>`;
  }}).join('');
  cuenta();
}}

function filaSimple(r, i) {{
  const e = est[r.id] || {{}};
  return `<div class="fila ${{e.estado||''}} ${{i===sel?'sel':''}}" id="f${{i}}" data-color="rojo"
    style="grid-template-columns:1fr">
    <div class="datos"><h3>#${{r.id}} ${{r.marca}} ${{r.nombre}}</h3>
    ${{badge(r.estado, 'rojo')}} <span class="k">origen</span> ${{r.origen||'—'}} ${{r.origen_px||0}}px
    <div class="acc"><button onclick="marca(${{r.id}},'falta_foto')">F · a la lista de búsqueda</button></div>
    </div></div>`;
}}

const actualSrc = (r) => (r.actual||'').startsWith('imagenes/')
  ? '../../repo/github-deploy/' + r.actual.split('?')[0] : r.actual;

function marca(id, estado) {{
  est[id] = Object.assign(est[id] || {{}}, {{ estado }});
  guarda(); pinta();
}}
function guarda() {{ try {{ localStorage.setItem(CLAVE, JSON.stringify(est)); }} catch (e) {{}} }}
function cuenta() {{
  const c = (v) => Object.values(est).filter(e => e.estado === v).length;
  cA.textContent = c('aprobada'); cR.textContent = c('rechazada');
  cF.textContent = c('falta_foto'); cP.textContent = D.length - c('aprobada') - c('rechazada') - c('falta_foto');
}}
function aprobarVerdes() {{
  D.filter(r => r.color === 'verde').forEach(r => est[r.id] = Object.assign(est[r.id]||{{}}, {{estado:'aprobada'}}));
  guarda(); pinta();
}}
function filtrar() {{
  filtrado = !filtrado;
  document.querySelectorAll('.fila').forEach(f =>
    f.style.display = (filtrado && f.dataset.color !== 'rojo') ? 'none' : '');
}}
function descargar() {{
  const dec = D.map(r => ({{ id:r.id, nombre:r.nombre, archivo:r.archivo || null,
    estado:(est[r.id]||{{}}).estado || 'pendiente', motivo:(est[r.id]||{{}}).motivo || '' }}));
  const b = new Blob([JSON.stringify({{fecha:new Date().toISOString().slice(0,10), decisiones:dec}}, null, 1)],
                     {{type:'application/json'}});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = 'decisiones.json'; a.click();
}}
document.addEventListener('click', e => {{
  if (e.target.tagName === 'IMG' && e.target.closest('.panel')) {{
    zoom.querySelector('img').src = e.target.src; zoom.style.display = 'flex';
  }}
}});
document.addEventListener('keydown', e => {{
  const k = e.key.toLowerCase();
  if (k === 'arrowdown') {{ sel = Math.min(D.length-1, sel+1); pinta(); document.getElementById('f'+sel)?.scrollIntoView({{block:'center'}}); }}
  else if (k === 'arrowup') {{ sel = Math.max(0, sel-1); pinta(); document.getElementById('f'+sel)?.scrollIntoView({{block:'center'}}); }}
  else if ('arf'.includes(k) && D[sel]) {{
    marca(D[sel].id, {{a:'aprobada', r:'rechazada', f:'falta_foto'}}[k]);
    sel = Math.min(D.length-1, sel+1); pinta(); document.getElementById('f'+sel)?.scrollIntoView({{block:'center'}});
  }}
}});
pinta();
</script></body></html>"""
    (TRABAJO / "hoja-de-contactos.html").write_text(html, "utf-8")


# ─────────────────────────────────────────────────────────────────────────────

def main():
    # stdout en UTF-8: la consola de Windows es cp1252 y no sabe escribir la C con
    # hacek de «Ceska Zbrojovka». Es el mismo gotcha que reventó catalogo() con
    # «Águila», del otro lado de la tuberia. Se arregla una vez, para todo.
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("preparar")
    p.add_argument("--tipo", default="pistola")
    p.add_argument("--solo", help="ids separados por coma")
    p.add_argument("--ancho", type=int, default=ANCHO)
    p.add_argument("--calidad", type=int, default=CALIDAD)
    p.set_defaults(fn=preparar)

    p = sub.add_parser("aplicar")
    p.add_argument("--decisiones", help="decisiones.json de la hoja de contactos")
    p.add_argument("--aprobar", help="ids separados por coma (atajo sin hoja)")
    p.set_defaults(fn=aplicar)

    p = sub.add_parser("verificar")
    p.add_argument("--tipo", help="detalla las sin alfa de este tipo")
    p.set_defaults(fn=verificar)

    p = sub.add_parser("hoja")
    p.set_defaults(fn=rehacer_hoja)

    p = sub.add_parser("autocheck")
    p.set_defaults(fn=autocheck)

    p = sub.add_parser("pendientes")
    p.add_argument("--json", action="store_true", help="el censo entero, para el buscador")
    p.add_argument("--ids", action="store_true", help="solo los ids, en coma: para --solo")
    p.add_argument("--estado", choices=sorted(ESTADOS), help="filtra por un estado")
    p.add_argument("--web", action="store_true", help=f"solo los que necesitan web: {' y '.join(NECESITAN_WEB)}")
    p.set_defaults(fn=pendientes)

    args = ap.parse_args()
    sys.exit(args.fn(args) or 0)


if __name__ == "__main__":
    main()
