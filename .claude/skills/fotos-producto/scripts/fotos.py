# /// script
# requires-python = ">=3.12,<3.13"
# dependencies = ["rembg[cpu,cli]", "pillow", "numpy"]
# ///
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
import argparse, json, re, shutil, subprocess, sys, time
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

REPO = Path(__file__).resolve().parents[4]           # .../repo/github-deploy
PROY = REPO.parents[1]                                # .../Armado en Mexico
TRABAJO = PROY / "Catalogo de Armas" / "fotos-trabajo"
ORIGINALES = PROY / "Catalogo de Armas" / "imagenes"
IMAGENES = REPO / "imagenes"

MODELO = "birefnet-general"
MIN_LADO = 900          # por debajo de esto no hay pipeline que valga: resustituir
ANCHO = 1200
CALIDAD = 80
MARGEN = 0.02           # del lado mayor, alrededor del bbox del alfa

# ─────────────────────────────────────────────────────────────────────────────
# Catálogo: data.js es la ÚNICA fuente de verdad del tipo de arma. El correlativo
# NNN del nombre de archivo NO es contiguo por tipo (042-060 son escopetas).
# ─────────────────────────────────────────────────────────────────────────────

def catalogo():
    js = ("global.window=global;require('./data.js');"
          "console.log(JSON.stringify((window.DB||[]).map(a=>"
          "({id:a.id,nombre:a.nombre,marca:a.marca,tipo:a.tipo,calibre:a.calibre,img:a.img}))))")
    out = subprocess.run(["node", "-e", js], cwd=REPO, capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def slug_archivo(arma):
    """Nombre de archivo con el patrón del repo: NNN_Marca_Modelo.webp"""
    limpio = lambda s: re.sub(r"[^A-Za-z0-9.-]+", "_", _sin_tildes(s)).strip("_")
    return f"{limpio(arma['marca'])}_{limpio(arma['nombre'])}"


def _sin_tildes(s):
    tabla = str.maketrans("áéíóúüñÁÉÍÓÚÜÑ", "aeiouunAEIOUUN")
    return s.translate(tabla)


def mejor_origen(arma):
    """La copia de mayor resolución entre los originales sin procesar y el repo."""
    cands = []
    ruta_repo = str(arma.get("img") or "")
    if ruta_repo.startswith("imagenes/"):
        p = REPO / ruta_repo.split("?")[0]
        if p.exists():
            cands.append(p)
        # el original sin comprimir, por su correlativo NNN
        nnn = Path(ruta_repo).stem.split("_")[0]
        cands += sorted(ORIGINALES.glob(f"{nnn}_*"))
    elegida = elegida_px = None
    for p in cands:
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


def metricas(rgb_orig, alfa_orig, rgba_final, origen_px, peso_kb):
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

    m["canon"], m["inclinacion"] = orientacion(alfa)
    m["aspecto"] = round(rgba_final.shape[1] / max(1, rgba_final.shape[0]), 2)
    m["resolucion"] = max(rgba_final.shape[:2])
    m["origen_px"] = origen_px
    m["peso_kb"] = round(peso_kb, 1)
    m["luminancia_sujeto"] = round(float(lum(rgb[interior]).mean()), 1) if interior.any() else 0.0
    return m


def semaforo(m):
    rojo, ambar = [], []
    # Apuntar a la izquierda AVISA, no bloquea (31-ago-2026, decision de Saulo).
    # Nunca se espeja — invertiria inscripciones y ventana de expulsion — pero hay
    # fabricantes que solo publican de ese lado: las seis Mendoza RM22 son foto
    # oficial 5906x1329 y las seis miran a la izquierda. Si el fabricante tiene
    # lateral derecha, se usa esa; si no, entra asi. Lo decide el humano.
    if m["canon"] == "izquierda":             ambar.append("apunta a la izquierda: vale solo si el fabricante no publica lateral derecha")
    if m["resolucion"] < MIN_LADO:            rojo.append(f"resolucion {m['resolucion']}px")
    if m["llenado"] < 20:                     rojo.append(f"mascara rota: el arma llena el {m['llenado']}% de su bbox")
    if m["alpha_pct"] > 92:                   rojo.append(f"no recorto nada ({m['alpha_pct']}%)")
    if m["huecos_px"] == 0:                   rojo.append("sin huecos internos: mascara rellenada")
    # El halo alto NO bloquea, avisa. Un objeto oscuro sobre fondo claro tiene un
    # borde antialias intrinsecamente mas claro que el objeto: es muestreo, no un
    # defecto. Medido: recortes impecables (Canik METE SFX, Beretta 80X) marcan
    # +68 y se ven perfectos. Solo un halo flagrante bloquea. El borde
    # ennegrecido si es un defecto real: sale de dividir por alfa muy baja.
    if m["halo"] > 120:                       rojo.append(f"halo flagrante (+{m['halo']})")
    elif m["halo"] > 18:                      ambar.append(f"halo claro (+{m['halo']}), revisar borde")
    if m["halo"] < -25:                       rojo.append(f"borde ennegrecido ({m['halo']})")
    if m["borde_recortado"] > 0.5:            rojo.append(f"arma cortada en el origen ({m['borde_recortado']}%)")
    # Ya no hay rama "dejo fondo": la mordida esta acotada a 1 por construccion.
    # Ese modo lo cubre `alpha_pct > 92` / `llenado`. Si vuelve a aparecer una
    # mascara que se traga el fondo sin disparar ninguna de las dos, medir antes
    # de anadir un umbral nuevo.
    if m["mordida"] is not None and m["mordida"] < 0.93:
        rojo.append(f"mordida {m['mordida']}: se comio parte")
    if 0 < m["huecos_rel"] < 1.0:             ambar.append(f"huecos minimos ({m['huecos_rel']}% del arma)")
    if m["dureza_borde"] < 0.8:               ambar.append(f"borde duro ({m['dureza_borde']})")
    if m["dureza_borde"] > 6:                 ambar.append(f"borde lavado ({m['dureza_borde']})")
    # Sigma alto = fondo con textura, casi siempre una escena. Medido sobre las 28:
    # ninguna foto BUENA paso de 20.0, y por encima de 25 solo hay malas — dos con
    # una persona sosteniendo el arma (CZ 600 American 41.3, Retay Gordion 50.6),
    # que antes salian ambar y se colaban a la aprobacion. Por eso ahora bloquea.
    if m["fondo_sigma"] > 25:                 rojo.append(f"foto de escena, no de producto (sigma {m['fondo_sigma']})")
    elif m["fondo_sigma"] > 12:               ambar.append(f"fondo con textura (sigma {m['fondo_sigma']})")
    if m["peso_kb"] > 140:                    ambar.append(f"pesa {m['peso_kb']} KB")
    if m["luminancia_sujeto"] < 45:           ambar.append(f"arma muy oscura (L {m['luminancia_sujeto']})")
    return ("rojo" if rojo else "ambar" if ambar else "verde"), rojo + ambar


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
            im = ImageOps.exif_transpose(im)
            plano = aplanar(im)
            rgb_orig = np.array(plano)
            alfa_previo = np.array(im.convert("RGBA"))[:, :, 3] if im.mode in ("RGBA", "LA", "P") else None
            alfa = mascara(plano)

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

        m = metricas(rgb_orig, alfa, np.array(final), px, dst.stat().st_size / 1024)
        color, notas = semaforo(m)
        informe.append({**_ficha(arma), "estado": "PROCESADA", "origen": str(origen),
                        "origen_px": px, "archivo": dst.name,
                        "actual": arma.get("img", ""), "traia_alfa": alfa_previo is not None
                        and bool((alfa_previo < 250).any()),
                        "metricas": m, "color": color, "notas": notas,
                        "segundos": round(time.time() - t0, 1)})
        print(f"{etq}: {color.upper()} {final.size[0]}x{final.size[1]} "
              f"{m['peso_kb']}KB {round(time.time()-t0,1)}s" + (f"  <- {'; '.join(notas)}" if notas else ""))

    (TRABAJO / "informe.json").write_text(json.dumps(informe, ensure_ascii=False, indent=1), "utf-8")
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

    datajs = (REPO / "data.js").read_text("utf-8")
    copiadas, parches = [], 0
    for i in ids:
        r = porid.get(i)
        if not r or r["estado"] != "PROCESADA":
            print(f"  #{i}: sin foto procesada, se salta")
            continue
        actual = str(r.get("actual") or "")
        if not actual.startswith("imagenes/"):
            print(f"  #{i}: alta nueva todavia no soportada (hoy tiene placeholder)")
            continue
        destino = REPO / actual.split("?")[0]
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

    (REPO / "data.js").write_text(datajs, "utf-8")
    print("")
    print(f"copiadas {len(copiadas)}: {', '.join(copiadas)}")
    print(f"rutas versionadas en data.js: {parches}")
    print("")
    print("RECORDATORIOS (skill publicar):")
    print("  - data.js cambio: sube el ?v= de los <script src=\"data.js?v=...\"> en")
    print("    index.html, admin.html y shopify-demo.html")
    print("  - tras publicar: Admin -> Configuracion -> «Sincronizar todo al servidor»,")
    print("    o el catalogo de D1 seguira sirviendo las rutas viejas")
    return 0


# ─────────────────────────────────────────────────────────────────────────────
# Subcomando: verificar — el check ejecutable. Hoy dice "88 de 111 sin alfa".
# ─────────────────────────────────────────────────────────────────────────────

def verificar(args):
    db = catalogo()
    sin_alfa, faltan, ok = [], [], 0
    for a in db:
        ruta = str(a.get("img") or "")
        if not ruta.startswith("imagenes/"):
            continue
        p = REPO / ruta.split("?")[0]
        if not p.exists():
            faltan.append((a["id"], ruta))
            continue
        with Image.open(p) as im:
            alfa = im.convert("RGBA").getchannel("A")
            (ok := ok + 1) if alfa.getextrema()[0] < 250 else sin_alfa.append((a["id"], a["tipo"], p.name))
    print(f"con alfa: {ok} | sin alfa: {len(sin_alfa)} | rutas rotas: {len(faltan)}")
    for id_, ruta in faltan:
        print(f"  ROTA  #{id_} {ruta}")
    if args.tipo:
        del_tipo = [s for s in sin_alfa if s[1] == args.tipo]
        print(f"\nsin alfa en {args.tipo}: {len(del_tipo)}")
        for id_, _, n in del_tipo:
            print(f"  #{id_} {n}")
    return 1 if faltan else 0


# ─────────────────────────────────────────────────────────────────────────────
# Hoja de contactos. Autocontenida: el JSON va inline porque fetch() de un .json
# local lo bloquea CORS bajo file:// — es el fallo clásico de este artefacto.
# Las imágenes sí van por ruta relativa (<img src> sí funciona en file://).
# ─────────────────────────────────────────────────────────────────────────────

def hoja(informe):
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
    const mets = [
      // OJO: estos umbrales son un ESPEJO de semaforo() en fotos.py. Si cambias
      // uno alli, cambialo aqui. Ya divergieron una vez (31-ago-2026): la hoja
      // pintaba halo>18 en rojo cuando semaforo() lo daba ambar desde el 27-ago.
      badge(`llenado ${{m.llenado}}%`, m.llenado < 20 || m.alpha_pct > 92 ? 'rojo' : 'verde'),
      badge(`huecos ${{m.huecos_rel}}%`, m.huecos_px === 0 ? 'rojo' : m.huecos_rel < 1.0 ? 'ambar' : 'verde'),
      badge(`halo ${{m.halo}}`, m.halo > 120 || m.halo < -25 ? 'rojo' : m.halo > 18 ? 'ambar' : 'verde'),
      badge(`borde ${{m.dureza_borde}}`, m.dureza_borde < 0.8 || m.dureza_borde > 6 ? 'ambar' : 'verde'),
      badge(`fondo σ${{m.fondo_sigma}}`, m.fondo_sigma > 25 ? 'rojo' : m.fondo_sigma > 12 ? 'ambar' : 'verde'),
      m.mordida !== null ? badge(`mordida ${{m.mordida}}`, m.mordida < 0.93 ? 'rojo' : 'verde') : '',
      badge(`cañón ${{m.canon}}`, m.canon === 'izquierda' ? 'ambar' : 'verde'),
      badge(`${{m.resolucion}}px`, m.resolucion < {MIN_LADO} ? 'rojo' : 'verde'),
      badge(`${{m.peso_kb}}KB`, m.peso_kb > 140 ? 'ambar' : 'verde'),
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

    args = ap.parse_args()
    sys.exit(args.fn(args) or 0)


if __name__ == "__main__":
    main()
