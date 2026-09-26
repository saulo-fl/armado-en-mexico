# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow"]
# ///
# Armado en México — Copyright (C) 2026 Saulo Flores León
# SPDX-License-Identifier: AGPL-3.0-or-later
# Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
# (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

"""
Trae fotos de producto de la web del fabricante a `Catalogo de Armas/fotos-fuente/`.

    uv run traer.py listar https://benelli.it/en/arma/vinci-black
    uv run traer.py bajar  115 https://benelli.it/uploads/abc123.png
    uv run traer.py manifiesto procedencia-2026-09-22.json [--carpeta ../accesorios-fuente]

`listar` descarga la pagina, saca TODAS las imagenes candidatas, las mide y las
ordena por tamano: la foto de producto casi siempre es la mas grande y la mas
apaisada. `bajar` guarda una en `fotos-fuente/<id_de_arma>.<ext>`, que es donde
`fotos.py mejor_origen()` la busca.

Por que curl y no la herramienta de fetch: benelli.it y otras devuelven 403 al
user-agent por defecto y 200 a uno de navegador. No se salta ningun muro de pago
ni ninguna autenticacion — es la misma pagina publica que sirve a cualquiera.
"""
import json, re, subprocess, sys, io
from collections import Counter
from pathlib import Path
from urllib.parse import urljoin, urlparse

from PIL import Image

# Mismo criterio que PROY en fotos.py: el ancestro con «Catalogo de Armas» (vale desde un worktree).
FUENTE = next(p for p in Path(__file__).resolve().parents
              if (p / "Catalogo de Armas").is_dir()) / "Catalogo de Armas" / "fotos-fuente"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
EXT = (".jpg", ".jpeg", ".png", ".webp")
# Cromo de la propia web que nunca es la foto del arma
RUIDO = re.compile(r"(logo|bandierin|flag|icon|sprite|favicon|banner|footer|header|avatar)", re.I)


def _curl(url, destino=None):
    cmd = ["curl", "-s", "-L", "--compressed", "--max-time", "30", "-A", UA,
           "-H", "Accept-Language: en-US,en;q=0.9"]
    if destino:
        subprocess.run(cmd + ["-o", str(destino), url], check=True)
        return destino
    return subprocess.run(cmd + [url], capture_output=True, check=True).stdout.decode("utf-8", "replace")


def listar(url):
    html = _curl(url)
    urls = set()
    for m in re.finditer(r'(?:src|data-src|data-original|href|content)="([^"]+)"', html):
        u = m.group(1)
        if u.lower().split("?")[0].endswith(EXT):
            urls.add(urljoin(url, u))
    for m in re.finditer(r'srcset="([^"]+)"', html):          # el mayor de cada srcset
        for parte in m.group(1).split(","):
            u = parte.strip().split(" ")[0]
            if u.lower().split("?")[0].endswith(EXT):
                urls.add(urljoin(url, u))
    urls = [u for u in urls if not RUIDO.search(urlparse(u).path)]
    if not urls:
        print("ninguna imagen candidata — la pagina las cargara por JS")
        return
    tmp = FUENTE / "_tmp"
    tmp.mkdir(parents=True, exist_ok=True)
    filas = []
    for u in sorted(urls):
        p = tmp / re.sub(r"[^A-Za-z0-9._-]", "_", urlparse(u).path.split("/")[-1])[-60:]
        try:
            _curl(u, p)
            with Image.open(p) as im:
                w, h = im.size
            filas.append((w * h, w, h, p.stat().st_size // 1024, u))
        except Exception:
            continue
        finally:
            p.unlink(missing_ok=True)
    if not filas:
        print("ninguna descargable")
        return
    print(f"{'px':>12} {'aspecto':>8} {'KB':>6}  url")
    for _, w, h, kb, u in sorted(filas, reverse=True)[:14]:
        print(f"{w:>5}x{h:<6} {w/h:>8.2f} {kb:>6}  {u}")


def bajar(arma_id, url, callado=False):
    """Baja una foto a `fotos-fuente/<id>.<ext>` y devuelve (ruta, ancho, alto).

    Borra los hermanos primero: una pieza, un origen. Bajar una candidata nueva
    con otra extension dejaba las DOS, y `mejor_origen()` se queda con la mas
    grande — que no es el criterio cuando la duda es de contenido y no de pixeles.
    Copiado de `cajas.py bajar`, que ya lo hacia bien.
    """
    FUENTE.mkdir(parents=True, exist_ok=True)
    ext = "." + urlparse(url).path.rsplit(".", 1)[-1].lower().split("?")[0]
    destino = FUENTE / f"{arma_id}{ext if ext in EXT else '.jpg'}"
    for viejo in FUENTE.glob(f"{arma_id}.*"):
        viejo.unlink()
    _curl(url, destino)
    try:
        with Image.open(destino) as im:
            w, h = im.size
    except Exception:
        destino.unlink(missing_ok=True)      # no era una imagen: HTML de error, 403, captcha
        raise
    if not callado:
        print(f"#{arma_id} <- {w}x{h} {destino.stat().st_size//1024} KB  {destino.name}")
        if min(w, h) < 500:
            print("   OJO: lado menor por debajo de 500 px; el recorte lo dejara aun mas chico")
    return destino, w, h


def manifiesto(ruta, carpeta=None):
    """Baja un manifiesto de procedencia entero y lo deja medido.

    El manifiesto lo escribe quien busco las fotos, con el formato que ya usan los
    `procedencia-g*.json` de accesorios: id, pagina, url_imagen, fuente, estado,
    nota. Aqui se rellenan los dos campos que solo se saben tras bajar —`archivo`
    y `px`— y se degrada a RESUSTITUIR lo que no llegue a 900 px.

    Existe por dos razones que son la misma: nadie va a aprobar 350 descargas de
    una en una, y una foto sin procedencia anotada es una foto que nadie sabe de
    donde salio. Un permiso por tanda, y el registro se escribe solo.

    MIN_LADO no se importa de fotos.py para no arrastrar rembg al venv de este
    script, que solo necesita pillow. Si cambia alli, cambia aqui.
    """
    global FUENTE
    if carpeta:
        FUENTE = Path(carpeta)
    MIN_LADO = 900
    p = Path(ruta)
    regs = json.loads(p.read_text("utf-8"))
    # dos candidatas para la misma pieza -> <id>_1, <id>_2, que es lo que espera
    # accesorios.py; una sola -> <id> a secas, que es lo que espera fotos.py.
    veces = Counter(str(r["id"]) for r in regs if r.get("url_imagen"))
    n = Counter()
    for r in regs:
        if not r.get("url_imagen") or r.get("estado") == "SIN_FOTO":
            continue
        clave = str(r["id"])
        n[clave] += 1
        stem = f"{clave}_{n[clave]}" if veces[clave] > 1 else clave
        try:
            destino, w, h = bajar(stem, r["url_imagen"], callado=True)
        except Exception as e:
            r["estado"] = "SIN_FOTO"
            r["nota"] = f"no se pudo bajar ({type(e).__name__}). " + (r.get("nota") or "")
            print(f"  {stem:10} FALLO  {r['url_imagen'][:70]}")
            continue
        r["archivo"], r["px"] = destino.name, f"{w}x{h}"
        # Se mide el lado MAYOR, no el menor. El recorte centra el arma en un
        # lienzo cuadrado cuyo lado sale del mayor, y es ESE el que compara
        # `fotos.py` contra MIN_LADO. Con el lado menor, un arma apaisada se
        # descartaba por el alto de su encuadre: el 25-sep escondio las cinco
        # Armsan (2000x650, salen a 1200), catorce de Huglu y System Defence, y
        # tres CZ que llevaban el original en disco desde la manana. Aqui solo
        # se filtra lo inservible; el juez de verdad es el semaforo, que mide el
        # lienzo ya recortado.
        if max(w, h) < MIN_LADO:
            r["estado"] = "RESUSTITUIR"
            r["nota"] = f"origen {w}x{h}, por debajo de {MIN_LADO}. " + (r.get("nota") or "")
        print(f"  {stem:10} {r['estado']:12} {w}x{h}  {destino.name}")
    p.write_text(json.dumps(regs, ensure_ascii=False, indent=1), "utf-8")
    print()
    for est, n_ in Counter(r.get("estado") or "?" for r in regs).most_common():
        print(f"  {n_:>4}  {est}")
    print(f"procedencia actualizada: {p}")


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "listar":
        listar(sys.argv[2])
    elif len(sys.argv) >= 4 and sys.argv[1] == "bajar":
        bajar(sys.argv[2], sys.argv[3])
    elif len(sys.argv) >= 3 and sys.argv[1] == "manifiesto":
        carpeta = sys.argv[sys.argv.index("--carpeta") + 1] if "--carpeta" in sys.argv else None
        manifiesto(sys.argv[2], carpeta)
    else:
        sys.exit(__doc__)
