# /// script
# requires-python = ">=3.12,<3.13"
# dependencies = ["rembg[cpu,cli]", "pillow", "numpy"]
# ///
"""
Fotos de ACCESORIOS para armado.mx: recorta con alfa lo bajado y lo da de alta en el catalogo.

    uv run accesorios.py preparar [--solo 101,120_1]   # accesorios-fuente/ -> fotos-trabajo/accesorios/ + hoja
    uv run accesorios.py aplicar --aprobar 104,121_2    # copia a imagenes/accesorios/ y reescribe ACC_FOTO
    uv run accesorios.py verificar

Las fotos se bajan a `Catalogo de Armas/accesorios-fuente/<id>.<ext>` (lo hace el agente, no el
script: ver SKILL.md). Carpeta propia y no `fotos-fuente/`, porque los ids de accesorio (101-134,
201...) CHOCAN con los de arma. Candidatas de un mismo accesorio: `<id>_1`, `<id>_2`; en `aplicar`
se nombra la elegida y entra al sitio como `<id>.webp`. La procedencia va en
`accesorios-fuente/procedencia-*.json` y sale en la hoja.

ponytail: el recorte y las metricas son los de `fotos.py` (mismas funciones, ya calibradas); aqui
solo cambian el catalogo, las carpetas y dos reglas del semaforo que son de arma.
"""
import argparse, hashlib, html, json, shutil, subprocess, sys, time
from pathlib import Path
from urllib.parse import urlparse

import numpy as np
from PIL import Image, ImageOps

import fotos                      # hermano: mascara, aplanar, decontaminar, recortar, metricas, semaforo

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

FUENTE = fotos.PROY / "Catalogo de Armas" / "accesorios-fuente"      # lo bajado, fuera del repo
TRABAJO = fotos.PROY / "Catalogo de Armas" / "fotos-trabajo" / "accesorios"
HOJA = TRABAJO.parent / "hoja-accesorios.html"
DESTINO = fotos.IMAGENES / "accesorios"                               # lo que entra al sitio
DATAJS = fotos.DATOS / "data-accesorios.js"
EXT = (".jpg", ".jpeg", ".png", ".webp")
MARCA_INI = "/* ↓ generado por accesorios.py"
MARCA_FIN = "/* ↑ fin generado por accesorios.py ↑ */"


def catalogo():
    # window.DB vacio: data-accesorios.js cruza `compat.armas` con las fichas (igual que vitrina.test.mjs).
    js = ("global.window=global;window.DB=[];require('./data-accesorios.js');"
          "console.log(JSON.stringify(window.ACCESORIOS.map(a=>"
          "({id:a.id,nombre:a.nombre,corto:a.corto,dcamRef:a.dcamRef,img:a.img}))))")
    out = subprocess.run(["node", "-e", js], cwd=fotos.DATOS, capture_output=True,
                         text=True, encoding="utf-8", check=True)   # encoding: ver catalogo() de cajas.py
    return {str(a["id"]): a for a in json.loads(out.stdout)}


def semaforo_accesorio(m):
    # Dos reglas de semaforo() son de ARMA y aqui mentirian: un cargador no tiene guardamonte
    # (huecos 0 = "mascara rellenada" saldria rojo siempre) ni canon que apunte a un lado.
    # Se neutralizan en una copia en vez de duplicar el semaforo: si fotos.py cambia, esto lo sigue.
    return fotos.semaforo({**m, "huecos_px": 1, "huecos_rel": 0, "canon": "?"})


# ─────────────────────────────────────────────────────────────────────────────

def preparar(args):
    for d in ("2-master", "3-final"):
        (TRABAJO / d).mkdir(parents=True, exist_ok=True)
    accs = catalogo()
    proc = {}
    for f in sorted(FUENTE.glob("procedencia-*.json")):
        for r in json.loads(f.read_text("utf-8")):
            if r.get("archivo"):
                proc[Path(r["archivo"]).stem] = r
    pedidos = set(args.solo.split(",")) if args.solo else None
    origenes = [p for p in sorted(FUENTE.iterdir()) if p.is_file() and p.suffix.lower() in EXT
                and (pedidos is None or p.stem in pedidos)]
    if not origenes:
        print("nada que preparar en " + str(FUENTE))
        return 1

    filas = []
    for i, origen in enumerate(origenes, 1):
        stem, t0 = origen.stem, time.time()
        acc = accs.get(stem.split("_")[0], {})
        with Image.open(origen) as im:
            im = ImageOps.exif_transpose(im)
            px = max(im.size)
            plano = fotos.aplanar(im)
            rgb_orig = np.array(plano)
            alfa_previo = np.array(im.convert("RGBA"))[:, :, 3] if im.mode in ("RGBA", "LA", "P") else None
            de_fabrica = fotos._alfa_de_fabrica(alfa_previo)
            alfa = alfa_previo if de_fabrica else fotos.mascara(plano)

        # ORDEN FIJO (SKILL.md): mascara -> decontaminar -> recortar -> escalar -> comprimir
        rgb = fotos.decontaminar(rgb_orig, alfa, fotos.color_fondo(rgb_orig))
        master = Image.fromarray(fotos.recortar(np.dstack([rgb, alfa])), "RGBA")
        master.save(TRABAJO / "2-master" / f"{stem}.png")
        final = master.copy()
        final.thumbnail((fotos.ANCHO, fotos.ANCHO), Image.LANCZOS)          # solo reduce
        dst = TRABAJO / "3-final" / f"{stem}.webp"
        final.save(dst, "WEBP", quality=fotos.CALIDAD, method=6)

        m = fotos.metricas(rgb_orig, alfa, np.array(final), px, dst.stat().st_size / 1024)
        color, notas = semaforo_accesorio(m)
        if px < fotos.MIN_LADO:
            notas.insert(0, f"RESUSTITUIR: origen {px}px")
        filas.append({"stem": stem, "id": acc.get("id"), "nombre": acc.get("nombre", "¿?"),
                      "dcamRef": acc.get("dcamRef", ""), "color": color, "notas": notas,
                      "px": f"{final.size[0]}x{final.size[1]}", "origen_px": px, "kb": m["peso_kb"],
                      "alfa_de_fabrica": de_fabrica, "proc": proc.get(stem, {})})
        print(f"[{i}/{len(origenes)}] {stem:8} {color.upper():6} {final.size[0]}px {m['peso_kb']}KB "
              f"{time.time()-t0:.0f}s" + ("  [alfa de fabrica]" if de_fabrica else "")
              + (f"  <- {'; '.join(notas)}" if notas else ""))

    # La hoja muestra TODO lo que hay en 3-final, no solo esta corrida (igual que cajas.py).
    informe = TRABAJO / "informe.json"
    previas = {r["stem"]: r for r in json.loads(informe.read_text("utf-8"))} if informe.exists() else {}
    previas.update({r["stem"]: r for r in filas})
    todas = [previas[p.stem] for p in sorted((TRABAJO / "3-final").glob("*.webp")) if p.stem in previas]
    informe.write_text(json.dumps(todas, ensure_ascii=False, indent=1), "utf-8")
    _hoja(todas, accs)
    print(f"\nhoja: {HOJA}")
    return 0


def _hoja(filas, accs):
    """Contacto para el ojo humano: el QC no ve un cargador de otra capacidad ni un texto dentro del alfa."""
    e = lambda s: html.escape(str(s or ""))
    con_foto = {str(r["id"]) for r in filas}
    tarjetas = []
    for r in sorted(filas, key=lambda r: (int(r["id"] or 0), r["stem"])):
        p = r["proc"]
        fuente = (f'<a href="{e(p["pagina"])}">{e(p.get("fuente"))} · {e(urlparse(p["pagina"]).netloc)}</a>'
                  if p.get("pagina") else "sin procedencia")
        src = f"accesorios/3-final/{r['stem']}.webp"          # relativo: la hoja vive en fotos-trabajo/
        tarjetas.append(
            f'<figure class="{r["color"]}"><div class="pan"><img class="luz" src="{src}" alt="">'
            f'<img class="alfa" src="{src}" alt=""></div><figcaption>'
            f'<b>#{e(r["stem"])}</b> {e(r["nombre"])}<br><span class=k>{e(r["dcamRef"])}</span><br>'
            f'<span class="badge">{r["color"]}</span> {e(r["px"])} · origen {r["origen_px"]}px · {r["kb"]} KB'
            f'{" · alfa de fábrica" if r["alfa_de_fabrica"] else ""}<br>{fuente}'
            f'{" · <b>" + e(p.get("estado")) + "</b>" if p.get("estado") else ""}'
            + (f'<p class=aviso>{e("; ".join(r["notas"]))}</p>' if r["notas"] else "")
            + (f'<p class=nota>{e(p.get("nota"))}</p>' if p.get("nota") else "")
            + "</figcaption></figure>")
    faltan = [a for k, a in sorted(accs.items(), key=lambda x: int(x[0])) if k not in con_foto]
    HOJA.write_text(
        "<!doctype html><html lang=es><meta charset=utf-8><title>Accesorios · hoja de contactos</title><style>"
        "body{background:#F3EFE4;font:14px/1.4 system-ui;margin:24px;color:#171B19}"
        "h1{font-size:18px;letter-spacing:.06em;text-transform:uppercase}"
        ".g{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px}"
        "figure{margin:0;background:#FAF7EF;border:1px solid #DDD5C4;border-left:4px solid #4FAE5C;padding:10px}"
        "figure.ambar{border-left-color:#D9A400}figure.rojo{border-left-color:#A3341F}"
        ".pan{display:grid;grid-template-columns:1fr 1fr;gap:6px}"
        ".pan img{width:100%;aspect-ratio:1;object-fit:contain;cursor:zoom-in}"
        ".luz{background:radial-gradient(circle,#FAF7EF,#E6DFCF)}"
        ".alfa{background:conic-gradient(#bbb 0 25%,#eee 0 50%) 0 0/14px 14px}"
        "figcaption{font-size:12px;margin-top:8px}.k{color:#59605C}.badge{text-transform:uppercase;font-weight:700}"
        ".aviso{color:#A3341F;margin:4px 0 0}.nota{color:#59605C;margin:4px 0 0}"
        "#z{position:fixed;inset:0;background:#000c;display:none;place-items:center}"
        "#z img{max-width:94vw;max-height:94vh;background:conic-gradient(#bbb 0 25%,#eee 0 50%) 0 0/24px 24px}"
        "@media(max-width:420px){body{margin:16px}.g{grid-template-columns:1fr}}</style>"
        f"<h1>Accesorios · {len(filas)} fotos para {len(con_foto)} de {len(accs)}</h1>"
        + (f"<p class=aviso>Sin foto: {', '.join(f'#{a['id']} {e(a['corto'])}' for a in faltan)}</p>" if faltan else "")
        + '<div class=g>' + "".join(tarjetas) + "</div><div id=z onclick=\"this.style.display='none'\"><img></div>"
        "<script>document.addEventListener('click',ev=>{if(ev.target.closest('.pan')&&ev.target.tagName==='IMG')"
        "{z.querySelector('img').src=ev.target.src;z.style.display='grid'}})</script></html>", "utf-8")


# ─────────────────────────────────────────────────────────────────────────────

def aplicar(args):
    """Copia las aprobadas a imagenes/accesorios/<id>.webp y reescribe ACC_FOTO con lo que HAY ahi."""
    js = DATAJS.read_text("utf-8")
    if MARCA_INI not in js or MARCA_FIN not in js:
        print("data-accesorios.js no tiene el bloque ACC_FOTO generado; ver SKILL.md")
        return 1
    stems = [s for s in (args.aprobar or "").split(",") if s]
    ids = [s.split("_")[0] for s in stems]
    if len(set(ids)) != len(ids):
        print("dos candidatas del mismo accesorio: elige una")
        return 1
    accs = catalogo()
    for stem, i in zip(stems, ids):
        src = TRABAJO / "3-final" / f"{stem}.webp"
        if i not in accs or not src.exists():
            print(f"{stem}: {'no es un accesorio del catalogo' if i not in accs else 'no esta en 3-final'}")
            return 1
    DESTINO.mkdir(parents=True, exist_ok=True)
    for stem, i in zip(stems, ids):
        shutil.copyfile(TRABAJO / "3-final" / f"{stem}.webp", DESTINO / f"{i}.webp")

    archivos = sorted(DESTINO.glob("*.webp"), key=lambda p: int(p.stem))
    # ?v= = hash del contenido: imagenes/* va con max-age de un ano (_headers), y una foto
    # sustituida el mismo dia con una fecha no cambiaria la URL.
    pares = [f"  {p.stem}: 'imagenes/accesorios/{p.name}?v={hashlib.md5(p.read_bytes()).hexdigest()[:8]}',"
             for p in archivos]
    ini, fin = js.index(MARCA_INI), js.index(MARCA_FIN) + len(MARCA_FIN)
    bloque = (MARCA_INI + " · no editar a mano ↓ */\nconst ACC_FOTO = {\n" + "\n".join(pares) + "\n};\n" + MARCA_FIN)
    DATAJS.write_text(js[:ini] + bloque + js[fin:], "utf-8")
    print(f"ACC_FOTO: {len(pares)} fotos")
    return verificar(args)


def verificar(args):
    """Contra data-accesorios.js CARGADO: un bloque puede quedar bien escrito y no llegar a la ficha."""
    accs = catalogo()
    con = [a for a in accs.values() if str(a["img"]).startswith("imagenes/")]
    rotas = [a["id"] for a in con if not (fotos.PUBLICO / a["img"].split("?")[0]).exists()]
    usadas = {Path(a["img"].split("?")[0]).name for a in con}
    huerfanas = [p.name for p in DESTINO.glob("*.webp") if p.name not in usadas] if DESTINO.exists() else []
    print(f"con foto {len(con)} de {len(accs)} · sin foto: "
          + ", ".join(str(a["id"]) for a in accs.values() if a not in con))
    if rotas: print(f"RUTA ROTA: {rotas}")
    if huerfanas: print(f"en imagenes/accesorios/ sin ficha: {huerfanas}")
    return 1 if rotas or huerfanas else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("preparar"); p.add_argument("--solo", help="stems separados por coma (101,120_1)")
    p.set_defaults(fn=preparar)
    p = sub.add_parser("aplicar"); p.add_argument("--aprobar", required=True, help="stems aprobados (104,121_2)")
    p.set_defaults(fn=aplicar)
    sub.add_parser("verificar").set_defaults(fn=verificar)
    args = ap.parse_args()
    sys.exit(args.fn(args) or 0)


if __name__ == "__main__":
    main()
