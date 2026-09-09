# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow"]
# ///
"""
Trae fotos de producto de la web del fabricante a `Catalogo de Armas/fotos-fuente/`.

    uv run traer.py listar https://benelli.it/en/arma/vinci-black
    uv run traer.py bajar  115 https://benelli.it/uploads/abc123.png

`listar` descarga la pagina, saca TODAS las imagenes candidatas, las mide y las
ordena por tamano: la foto de producto casi siempre es la mas grande y la mas
apaisada. `bajar` guarda una en `fotos-fuente/<id_de_arma>.<ext>`, que es donde
`fotos.py mejor_origen()` la busca.

Por que curl y no la herramienta de fetch: benelli.it y otras devuelven 403 al
user-agent por defecto y 200 a uno de navegador. No se salta ningun muro de pago
ni ninguna autenticacion — es la misma pagina publica que sirve a cualquiera.
"""
import re, subprocess, sys, io
from pathlib import Path
from urllib.parse import urljoin, urlparse

from PIL import Image

FUENTE = Path(__file__).resolve().parents[4].parents[1] / "Catalogo de Armas" / "fotos-fuente"
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


def bajar(arma_id, url):
    FUENTE.mkdir(parents=True, exist_ok=True)
    ext = "." + urlparse(url).path.rsplit(".", 1)[-1].lower().split("?")[0]
    destino = FUENTE / f"{arma_id}{ext if ext in EXT else '.jpg'}"
    _curl(url, destino)
    with Image.open(destino) as im:
        w, h = im.size
    print(f"#{arma_id} <- {w}x{h} {destino.stat().st_size//1024} KB  {destino.name}")
    if min(w, h) < 500:
        print("   OJO: lado menor por debajo de 500 px; el recorte lo dejara aun mas chico")


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "listar":
        listar(sys.argv[2])
    elif len(sys.argv) >= 4 and sys.argv[1] == "bajar":
        bajar(int(sys.argv[2]), sys.argv[3])
    else:
        sys.exit(__doc__)
