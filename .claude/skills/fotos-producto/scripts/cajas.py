# /// script
# requires-python = ">=3.12,<3.13"
# dependencies = ["rembg[cpu,cli]", "pillow", "numpy"]
# ///
# Armado en México — Copyright (C) 2026 Saulo Flores León
# SPDX-License-Identifier: AGPL-3.0-or-later
# Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
# (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

"""
Fotos de CAJA para las municiones de armado.mx: baja la foto del fabricante,
le quita el fondo y la deja lista en `imagenes/municiones/`.

    uv run cajas.py pendientes                    # que claves faltan y con que buscarlas
    uv run cajas.py listar https://.../producto   # imagenes candidatas de una pagina
    uv run cajas.py bajar aguila__380acp https://.../caja.png
    uv run cajas.py procesar [--solo aguila__380acp,pmc__9mmparabellum]
    uv run cajas.py aplicar                       # reescribe MUNICION_CAJAS en data-municiones.js
    uv run cajas.py verificar

El PNG del cartucho (`imagenes/cartuchos/*.webp`) es del CALIBRE y se queda en la
home de calibres y en la guia educativa. La ficha de un cartucho de marca lleva la
foto de SU CAJA; sin caja, cae al PNG del calibre (lo resuelve screens-municiones.jsx).

CLAVE = `<marca>__<calibre>` normalizados (aguila__380acp). Una caja sirve a todas
las municiones de esa marca y ese calibre — que es como se venden: la caja de
Aguila .308 es la misma para el lote de 150 gr SP y para el de FMJ. Cuando una
municion concreta necesite SU foto, el archivo se llama con su id (`2054.webp`) y
pisa a la de marca+calibre.

ponytail: el recorte es el de `fotos.py` (mismas funciones, ya calibradas); aqui
solo cambia el encuadre —una caja se recorta ajustada, no a lienzo 1:1— y el QC,
que no puede ser el de un arma (una caja no tiene huecos internos: el semaforo de
fotos.py la marcaria roja siempre).
"""
import argparse, json, re, subprocess, sys, time, unicodedata
from datetime import date
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

import fotos                      # hermano: mascara, aplanar, decontaminar, recortar

# La consola de Windows es cp1252 y aqui pasan tildes y URLs con la enye
# descompuesta: sin esto, un print revienta la corrida entera.
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

REPO = fotos.REPO
PUBLICO = fotos.PUBLICO
DATOS = fotos.DATOS                 # .../repo/github-deploy
PROY = fotos.PROY                 # .../Armado en Mexico
FUENTE = PROY / "Catalogo de Armas" / "cajas-fuente"      # lo bajado, fuera del repo
MASTER = FUENTE / "_master"                                # PNG recortado a resolucion plena
DESTINO = PUBLICO / "imagenes" / "municiones"                 # lo que entra al sitio
HOJA = PROY / "Catalogo de Armas" / "fotos-trabajo" / "hoja-cajas.html"

ANCHO = 900          # la ficha da ~470 px al ancho de la caja; x2 de DPR
CALIDAD = 80
MARGEN = 0.03
MIN_LADO = 600       # por debajo, la caja se ve blanda en la ficha
EXT = (".jpg", ".jpeg", ".png", ".webp")


def slug(s):
    """Igual que _slug() de data-municiones.js. Si cambia uno, cambia el otro."""
    s = "".join(c for c in unicodedata.normalize("NFKD", str(s)) if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", s.lower())


def catalogo():
    js = ("global.window=global;require('./data-municiones.js');"
          "console.log(JSON.stringify((window.MUNICIONES||[]).map(m=>"
          "({id:m.id,nombre:m.nombre,marca:m.marca,calibre:m.calibre,img:m.img,ref:m.dcamRef}))))")
    # encoding explicito: node escribe UTF-8 y en Windows text=True decodifica en
    # cp1252, que revienta con "Aguila" y con el punto medio de los nombres.
    # cwd: data-municiones.js ya no vive en la raiz, sino en src/data.
    out = subprocess.run(["node", "-e", js], cwd=fotos.DATOS, capture_output=True,
                         text=True, encoding="utf-8", check=True)
    return json.loads(out.stdout)


def clave(m):
    return f"{slug(m['marca'])}__{slug(m['calibre'])}"


def grupos():
    """{clave: [municiones]}, mas los ids que tienen archivo propio."""
    g = {}
    for m in catalogo():
        g.setdefault(clave(m), []).append(m)
    return g


def _final(cl):
    return DESTINO / f"{cl}.webp"


def _origen(cl):
    for p in sorted(FUENTE.glob(f"{cl}.*")):
        if p.suffix.lower() in EXT:
            return p
    return None


# ─────────────────────────────────────────────────────────────────────────────

def pendientes(args):
    g = grupos()
    faltan = 0
    print(f"{'clave':34} {'n':>2}  estado      buscar")
    for cl in sorted(g):
        ms = g[cl]
        if _final(cl).exists():
            estado = "LISTA"
        elif _origen(cl):
            estado = "sin procesar"
        else:
            estado = "FALTA"
            faltan += 1
        # La consulta sale de la ficha DCAM, que trae la linea comercial ("GB CLUB",
        # "STAR EVO"): sin ella "GB 12 GA" no encuentra ninguna caja.
        linea = re.sub(r"\s+", " ", (ms[0].get("ref") or ""))[:60]
        print(f"{cl:34} {len(ms):>2}  {estado:11} {ms[0]['marca']} {ms[0]['calibre']} caja  ·  {linea}")
    n_mun = sum(len(v) for v in g.values())
    con = sum(len(v) for k, v in g.items() if _final(k).exists())
    print(f"\n{len(g)} claves · {n_mun} municiones · {con} con caja · {faltan} claves sin origen")
    return 0


def listar(args):
    import traer                                  # hermano: mide y ordena por tamano
    traer.FUENTE = FUENTE
    traer.listar(args.url)
    return 0


def bajar(args):
    FUENTE.mkdir(parents=True, exist_ok=True)
    ext = "." + args.url.split("?")[0].rsplit(".", 1)[-1].lower()
    destino = FUENTE / f"{args.clave}{ext if ext in EXT else '.jpg'}"
    for viejo in FUENTE.glob(f"{args.clave}.*"):   # una clave, un origen
        viejo.unlink()
    # --compressed o la pagina llega en gzip crudo: hornady.com lo manda aunque
    # no se pida, y el HTML sale binario (nos costo media hora de "sin imagenes").
    subprocess.run(["curl", "-s", "-L", "--compressed", "--max-time", "60", "-A", fotos_UA,
                    "-o", str(destino), args.url], check=True)
    try:
        with Image.open(destino) as im:
            w, h = im.size
    except Exception as e:
        destino.unlink(missing_ok=True)
        print(f"{args.clave}: no es una imagen ({e})")
        return 1
    aviso = "  OJO: por debajo de %d px, la caja saldra blanda" % MIN_LADO if max(w, h) < MIN_LADO else ""
    print(f"{args.clave} <- {w}x{h} {destino.stat().st_size // 1024} KB{aviso}")
    return 0


fotos_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")


def procesar(args):
    DESTINO.mkdir(parents=True, exist_ok=True)
    MASTER.mkdir(parents=True, exist_ok=True)
    pedidas = set(args.solo.split(",")) if args.solo else None
    origenes = [p for p in sorted(FUENTE.iterdir())
                if p.is_file() and p.suffix.lower() in EXT
                and (pedidas is None or p.stem in pedidas)]
    if not origenes:
        print("nada que procesar en " + str(FUENTE))
        return 1

    filas = []
    for i, origen in enumerate(origenes, 1):
        cl = origen.stem
        t0 = time.time()
        with Image.open(origen) as im:
            im = ImageOps.exif_transpose(im)
            plano = fotos.aplanar(im)              # RGBA sobre BLANCO, no sobre negro
            rgb_orig = np.array(plano)
            # Siempre se infiere, aunque la foto traiga alfa: los renders de
            # fabricante vienen con polvo y sombras dentro del alfa (Aguila), y
            # ese alfa "de fabrica" mete la nube de particulas en la tarjeta.
            alfa = fotos.mascara(plano)

        rgb = fotos.decontaminar(rgb_orig, alfa, fotos.color_fondo(rgb_orig))
        # cuadrado=False: la caja es apaisada y el hueco de la tarjeta tambien.
        # En lienzo 1:1 la caja se queda en un tercio del ancho disponible.
        rgba = fotos.recortar(np.dstack([rgb, alfa]), margen=MARGEN, cuadrado=False)

        master = Image.fromarray(rgba, "RGBA")
        master.save(MASTER / f"{cl}.png")
        final = master.copy()
        final.thumbnail((args.ancho, args.ancho), Image.LANCZOS)   # solo reduce
        dst = _final(cl)
        final.save(dst, "WEBP", quality=args.calidad, method=6)

        a = np.array(final)[:, :, 3]
        # El recorte es AJUSTADO al objeto, asi que "% de pixeles opacos" mide la
        # forma de la caja, no la calidad del recorte: una caja de frente llena su
        # bbox y marcaba 94 % con el fondo perfectamente quitado. Lo que delata un
        # fondo intacto son las ESQUINAS: en un render 3D las cuatro estan vacias.
        h, w = a.shape
        cy, cx = max(2, h // 12), max(2, w // 12)
        esquinas = np.concatenate([a[:cy, :cx].ravel(), a[:cy, -cx:].ravel(),
                                   a[-cy:, :cx].ravel(), a[-cy:, -cx:].ravel()])
        opaco = float((esquinas > 240).mean() * 100)
        kb = dst.stat().st_size / 1024
        notas = []
        # 75 y no 55: una caja casi de frente llena su bbox y marca 58 con el recorte
        # impecable (Remington UMC). Por encima de 75 ya es fondo de verdad.
        if opaco > 75: notas.append(f"esquinas opacas {opaco:.0f}% — mira si quedo fondo")
        if float((a > 240).mean()) < 0.08: notas.append("se comio la caja")
        if max(master.size) < MIN_LADO: notas.append(f"solo {max(master.size)} px")
        if kb > 90: notas.append(f"{kb:.0f} KB")
        filas.append({"clave": cl, "px": f"{final.size[0]}x{final.size[1]}",
                      "opaco": round(opaco, 1), "kb": round(kb), "notas": notas})
        print(f"[{i}/{len(origenes)}] {cl:34} {final.size[0]}x{final.size[1]} "
              f"{kb:.0f}KB esquinas {opaco:.0f}% {time.time()-t0:.0f}s"
              + ("  <- " + "; ".join(notas) if notas else ""))

    _hoja(filas)
    print(f"\nhoja: {HOJA}")
    return 0


def _hoja(filas):
    """Contacto para el ojo humano: el QC numerico no ve una caja de otro calibre.

    Sale TODO lo que hay en imagenes/municiones/, no solo lo de esta corrida: una
    tanda parcial (--solo) tambien se revisa contra las cajas que ya estaban.
    """
    HOJA.parent.mkdir(parents=True, exist_ok=True)
    g = grupos()
    por_clave = {f["clave"]: f for f in filas}
    filas = [por_clave.get(p.stem, {"clave": p.stem, "px": "", "kb": round(p.stat().st_size / 1024),
                                    "opaco": "", "notas": []})
             for p in sorted(DESTINO.glob("*.webp"))]
    tarjetas = []
    for f in filas:
        usos = ", ".join(str(m["id"]) for m in g.get(f["clave"], []))
        aviso = ("<p class=aviso>" + "; ".join(f["notas"]) + "</p>") if f["notas"] else ""
        tarjetas.append(
            f'<figure><img src="{_final(f["clave"]).as_uri()}" alt="{f["clave"]}">'
            f'<figcaption><b>{f["clave"]}</b><br>{f["px"]} · {f["kb"]} KB · esquinas {f["opaco"]}%'
            f'<br><span class=usos>usan: {usos or "—"}</span>{aviso}</figcaption></figure>')
    HOJA.write_text(
        "<!doctype html><meta charset=utf-8><title>Cajas de municion</title><style>"
        "body{background:#F3EFE4;font:14px/1.4 system-ui;margin:24px;color:#171B19}"
        "h1{font-size:18px;letter-spacing:.06em;text-transform:uppercase}"
        ".g{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:18px}"
        "figure{margin:0;background:#FAF7EF;border:1px solid #DDD5C4;padding:10px}"
        "img{width:100%;height:150px;object-fit:contain;background:"
        "radial-gradient(circle at 50% 50%,#FAF7EF 0%,#F3EFE4 100%)}"
        "figcaption{font-size:12px;margin-top:8px}.usos{color:#59605C}"
        ".aviso{color:#A3341F;margin:4px 0 0}</style>"
        f"<h1>Cajas de municion · {len(filas)}</h1><div class=g>" + "".join(tarjetas) + "</div>",
        "utf-8")


# ─────────────────────────────────────────────────────────────────────────────

MARCA_INI = "/* ↓ generado por cajas.py"
MARCA_FIN = "/* ↑ fin generado por cajas.py ↑ */"


def aplicar(args):
    """Reescribe el bloque MUNICION_CAJAS con lo que HAY en imagenes/municiones/."""
    js = (DATOS / "data-municiones.js").read_text("utf-8")
    if MARCA_INI not in js or MARCA_FIN not in js:
        print("data-municiones.js no tiene el bloque generado; ver SKILL.md")
        return 1

    archivos = sorted(p for p in DESTINO.glob("*.webp"))
    if not archivos:
        print("no hay cajas en " + str(DESTINO))
        return 1
    pares = []
    for p in archivos:
        # ?v= por fecha del archivo: imagenes/* va con max-age de un ano (_headers),
        # asi que sin la query nadie que ya haya entrado vuelve a pedirla.
        v = date.fromtimestamp(p.stat().st_mtime).strftime("%Y%m%d")
        pares.append(f"    '{p.stem}': 'imagenes/municiones/{p.name}?v={v}',")

    ini = js.index(MARCA_INI)
    fin = js.index(MARCA_FIN) + len(MARCA_FIN)
    bloque = (MARCA_INI + " · no editar a mano ↓ */\n"
              "  window.MUNICION_CAJAS = {\n" + "\n".join(pares) + "\n  };\n  " + MARCA_FIN)
    (DATOS / "data-municiones.js").write_text(js[:ini] + bloque + js[fin:], "utf-8")
    print(f"MUNICION_CAJAS: {len(pares)} cajas")
    return verificar(args)


def verificar(args):
    """Contra data-municiones.js CARGADO, no contra el texto: un bloque generado
    puede quedar sintacticamente bien y no llegar a ninguna municion."""
    db = catalogo()
    rotas = [m for m in db if m["img"] and not (PUBLICO / m["img"].split("?")[0]).exists()]
    con = [m for m in db if m["img"]]
    huerfanas = []
    claves_vivas = {clave(m) for m in db} | {str(m["id"]) for m in db}
    for p in sorted(DESTINO.glob("*.webp")):
        if p.stem not in claves_vivas:
            huerfanas.append(p.name)

    print(f"municiones con caja: {len(con)}/{len(db)}")
    if rotas:
        print("RUTAS ROTAS (la caja no esta en el repo):")
        for m in rotas:
            print(f"  #{m['id']} {m['nombre']} -> {m['img']}")
    if huerfanas:
        print("archivos que no usa ninguna municion: " + ", ".join(huerfanas))
    faltan = sorted({clave(m) for m in db if not m["img"]})
    if faltan:
        print(f"sin caja ({len(faltan)} claves, caen al PNG del calibre): " + ", ".join(faltan))
    return 1 if rotas else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    sub = ap.add_subparsers(dest="cmd", required=True)

    sub.add_parser("pendientes").set_defaults(fn=pendientes)

    p = sub.add_parser("listar"); p.add_argument("url"); p.set_defaults(fn=listar)

    p = sub.add_parser("bajar")
    p.add_argument("clave", help="marca__calibre (o el id de una municion suelta)")
    p.add_argument("url")
    p.set_defaults(fn=bajar)

    p = sub.add_parser("procesar")
    p.add_argument("--solo", help="claves separadas por coma")
    p.add_argument("--ancho", type=int, default=ANCHO)
    p.add_argument("--calidad", type=int, default=CALIDAD)
    p.set_defaults(fn=procesar)

    sub.add_parser("aplicar").set_defaults(fn=aplicar)
    sub.add_parser("verificar").set_defaults(fn=verificar)

    args = ap.parse_args()
    sys.exit(args.fn(args) or 0)


if __name__ == "__main__":
    main()
