# /// script
# requires-python = ">=3.12,<3.13"
# dependencies = ["rembg[cpu,cli]", "pillow", "numpy"]
# ///
# Armado en México — Copyright (C) 2026 Saulo Flores León
# SPDX-License-Identifier: AGPL-3.0-or-later
# Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
# (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

"""
Cartuchos de la GUÍA de calibres (`public/imagenes/cartuchos/<id>.webp`).

No es lo mismo que una foto de arma ni que una caja de munición:
  - arma      → lienzo 1:1, porque la ficha centra la foto        (fotos.py)
  - caja      → foto de producto de una marca                     (cajas.py)
  - cartucho  → el CALIBRE, de pie sobre la regla graduada        (esto)

Por eso aquí el lienzo NO es cuadrado: el cartucho se recorta a su silueta y se
escala a ALTO px de alto, con el ancho que le toque. La escala real entre
calibres la pone el CSS con `--escala` (largo ÷ el más largo de la mesa), no el
archivo — de los 19 que ya existían, 18 miden 500 de alto y anchos de 75 a 208;
el 20 GA se quedó en 259 porque su original no daba para más.

El proceso es el de fotos.py y se importa de ahí, no se reescribe: máscara →
decontaminar → recortar → escalar → comprimir. Cambiar ese orden deja el halo
del fondo fijado en el WebP.

    uv run cartuchos.py preparar --origen <carpeta> --destino <carpeta>
    uv run cartuchos.py preparar --origen <carpeta> --solo 357mag,45acp
"""
import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fotos  # noqa: E402  — máscara, decontaminación y recorte ya resueltos

ALTO = 500          # el alto de los 19 cartuchos que ya están en el repo
CALIDAD = 82
EXTS = (".jpg", ".jpeg", ".png", ".webp")


def procesar(src: Path, dst: Path, alto: int = ALTO, calidad: int = CALIDAD):
    """Un cartucho: del original al WebP vertical con alfa."""
    im = Image.open(src)
    rgb_im = fotos.aplanar(im)
    alfa = fotos.mascara(rgb_im)
    rgb = fotos.decontaminar(np.array(rgb_im), alfa, fotos.color_fondo(np.array(rgb_im)))
    recorte = fotos.recortar(np.dstack([rgb, alfa]), cuadrado=False)

    final = Image.fromarray(recorte)
    if final.height == 0:
        raise ValueError("la máscara salió vacía: el modelo no encontró el cartucho")
    ancho = max(1, round(final.width * alto / final.height))
    final = final.resize((ancho, alto), Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    final.save(dst, "WEBP", quality=calidad, method=6)
    return final.size, float((np.array(final)[:, :, 3] > 16).mean())


def preparar(args):
    origen, destino = Path(args.origen), Path(args.destino)
    solo = {s.strip() for s in args.solo.split(",")} if args.solo else None

    fuentes = [p for p in sorted(origen.iterdir())
               if p.suffix.lower() in EXTS and (solo is None or p.stem in solo)]
    if not fuentes:
        print(f"nada que hacer en {origen}")
        return 1

    fallos = 0
    for src in fuentes:
        dst = destino / f"{src.stem}.webp"
        try:
            (w, h), lleno = procesar(src, dst, args.alto, args.calidad)
        except Exception as exc:                      # noqa: BLE001
            print(f"  {src.stem:<12} FALLO  {exc}")
            fallos += 1
            continue
        # Un cartucho recortado a su bbox llena bastante: medido, entre 43% (20
        # GA) y 89% (.45 ACP). El aviso es para el caso en que la máscara se
        # trajo el fondo entero, que da un rectángulo casi lleno.
        aviso = "   <-- revisar: el alfa cubre casi todo" if lleno > 0.93 else ""
        print(f"  {src.stem:<12} OK     {w}x{h}  alfa {lleno:.0%}{aviso}")

    # Los print van en ASCII a proposito: la consola de Windows es cp1252 y una
    # flecha en el texto revienta la corrida entera con UnicodeEncodeError.
    print(f"\n{len(fuentes) - fallos} de {len(fuentes)} en {destino}")
    return 1 if fallos else 0


def autocheck(args=None):
    """Comprueba el contrato de salida contra los cartuchos YA publicados: alto
    uniforme, alfa de verdad y más alto que ancho. Si esto pasa en el repo y no
    en lo que produces, lo que cambió es tu salida."""
    repo = Path(__file__).resolve().parents[4] / "public" / "imagenes" / "cartuchos"
    publicados = [p for p in sorted(repo.glob("*.webp")) if p.stem != "silueta-vertical"]
    assert publicados, f"no encontré cartuchos publicados en {repo}"

    for p in publicados:
        im = Image.open(p).convert("RGBA")
        assert im.width < im.height, f"{p.name}: {im.width}x{im.height} no es vertical"
        assert im.height <= ALTO, f"{p.name}: {im.height} de alto, más que los {ALTO} del formato"
        alfa = np.array(im)[:, :, 3]
        ys, xs = np.where(alfa > 16)
        assert len(ys), f"{p.name}: no hay nada opaco, el alfa está vacío"
        # Recortado al cartucho: el margen que queda es el del antialiasing del
        # borde, no fondo sobrante. Medido en los 19 publicados: 0 a 4 px.
        margen = max(ys.min(), im.height - 1 - ys.max(), xs.min(), im.width - 1 - xs.max())
        assert margen <= 6, f"{p.name}: {margen}px de fondo alrededor, no está recortado"
        # Y sigue siendo una silueta, no un bloque: las esquinas están vacías.
        esquinas = [alfa[0, 0], alfa[0, -1], alfa[-1, 0], alfa[-1, -1]]
        assert min(esquinas) <= 16, f"{p.name}: opaco hasta las esquinas, el fondo no se quitó"

    print(f"autocheck: {len(publicados)} cartuchos publicados cumplen "
          f"vertical, {ALTO}px de alto como mucho, recortado al cartucho y con alfa")
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("preparar", help="recorta y escala los cartuchos de una carpeta")
    p.add_argument("--origen", required=True)
    p.add_argument("--destino", required=True)
    p.add_argument("--solo", help="stems separados por coma (357mag,45acp)")
    p.add_argument("--alto", type=int, default=ALTO)
    p.add_argument("--calidad", type=int, default=CALIDAD)
    p.set_defaults(func=preparar)

    sub.add_parser("autocheck", help="verifica el contrato contra lo ya publicado") \
       .set_defaults(func=autocheck)

    args = ap.parse_args()
    sys.exit(args.func(args))


if __name__ == "__main__":
    main()
