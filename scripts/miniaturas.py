# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow"]
# ///
"""Miniaturas de public/imagenes/ para srcset (fase 4.2 de velocidad, 6-nov-2026).

    uv run scripts/miniaturas.py           # genera las que falten o estén viejas
    uv run scripts/miniaturas.py --todas   # las rehace todas

Por cada imagen ráster de public/imagenes/ (subcarpetas incluidas):
  - imagenes/400/<ruta>  — 400 px de ancho. Si el original es más angosto, se copia tal cual:
    así el componente puede pedir siempre la de 400 sin saber cuánto mide cada foto.
  - imagenes/800/<ruta>  — solo si el original pasa de 1300 px (las cartas de la portada).
Mismo nombre y mismo formato que el original; WebP con alfa a calidad 82.

scripts/miniaturas.json guarda la huella del original de cada miniatura. La prueba
scripts/miniaturas.test.mjs falla si una foto nueva o reemplazada no tiene miniatura al día.
No es parte del build: Cloudflare sirve las miniaturas tal como están en el repo.
"""
import hashlib
import json
import shutil
import sys
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
IMAGENES = RAIZ / "public" / "imagenes"
MANIFIESTO = RAIZ / "scripts" / "miniaturas.json"
ANCHOS = (400, 800)
UMBRAL_800 = 1300  # solo los originales más anchos que esto llevan versión de 800
RASTER = {".webp", ".png", ".jpg", ".jpeg"}
CARPETAS_GENERADAS = {str(a) for a in ANCHOS}


def huella(ruta: Path) -> str:
    return hashlib.sha256(ruta.read_bytes()).hexdigest()[:16]


def originales():
    for f in sorted(IMAGENES.rglob("*")):
        rel = f.relative_to(IMAGENES)
        if f.is_file() and f.suffix.lower() in RASTER and rel.parts[0] not in CARPETAS_GENERADAS:
            yield f, rel.as_posix()


def guardar(im: Image.Image, destino: Path, formato: str):
    destino.parent.mkdir(parents=True, exist_ok=True)
    if formato == "WEBP":
        im.save(destino, "WEBP", quality=82, method=4)
    elif formato == "PNG":
        im.save(destino, "PNG", optimize=True)
    else:
        im.convert("RGB").save(destino, "JPEG", quality=84, optimize=True, progressive=True)


def main():
    todas = "--todas" in sys.argv
    viejo = json.loads(MANIFIESTO.read_text(encoding="utf-8")) if MANIFIESTO.exists() else {}
    nuevo, hechas = {}, 0
    for f, rel in originales():
        h = huella(f)
        with Image.open(f) as im:
            ancho, alto, formato = im.width, im.height, im.format or "WEBP"
            anchos = [a for a in ANCHOS if a == 400 or ancho > UMBRAL_800]
            entrada = {"huella": h, "ancho": ancho, "alto": alto, "miniaturas": anchos}
            al_dia = (not todas and viejo.get(rel) == entrada
                      and all((IMAGENES / str(a) / rel).exists() for a in anchos))
            if not al_dia:
                im.load()
                for a in anchos:
                    destino = IMAGENES / str(a) / rel
                    if ancho <= a:
                        destino.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copyfile(f, destino)
                    else:
                        guardar(im.resize((a, round(alto * a / ancho)), Image.Resampling.LANCZOS), destino, formato)
                hechas += 1
        nuevo[rel] = entrada
    # Miniaturas huérfanas (su original ya no existe): fuera.
    borradas = 0
    for a in ANCHOS:
        for m in (IMAGENES / str(a)).rglob("*") if (IMAGENES / str(a)).exists() else []:
            rel = m.relative_to(IMAGENES / str(a)).as_posix()
            if m.is_file() and (rel not in nuevo or a not in nuevo[rel]["miniaturas"]):
                m.unlink()
                borradas += 1
    MANIFIESTO.write_text(json.dumps(nuevo, indent=1, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    peso = sum(m.stat().st_size for a in ANCHOS if (IMAGENES / str(a)).exists()
               for m in (IMAGENES / str(a)).rglob("*") if m.is_file())
    print(f"{len(nuevo)} originales · {hechas} rehechas · {borradas} huérfanas borradas · "
          f"miniaturas en disco: {peso / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
