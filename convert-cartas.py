#!/usr/bin/env python3
"""Convertir carta-*.png → carta-*.webp con los nombres correctos."""
import os
from PIL import Image

SRC = r"C:\Users\USER\Documents\Claude\Projects\Armado en Mexico\repo\espejo-main"
IMAGES = os.path.join(SRC, "public", "imagenes")

# Mapeo: nombre actual en disco → nombre correcto (webp)
# Armas = SINGULAR, Accesorios = PLURAL (según data.js y screens-accesorios.jsx)
RENAME = {
    # Armas (singular)
    "carta-pistola.png": "carta-pistola.webp",
    "carta-revolver.png": "carta-revolver.webp",
    "carta-rifle.png": "carta-rifle.webp",
    "carta-escopeta.png": "carta-escopeta.webp",
    "carta-carabina.png": "carta-carabina.webp",
    # Accesorios (plural)
    "carta-cargadores.png": "carta-cargadores.webp",
    "carta-opticas.png": "carta-opticas.webp",
    "carta-empuñaduras.png": "carta-empuñaduras.webp",
    "carta-refacciones.png": "carta-refacciones.webp",
}

for src_name, dst_name in RENAME.items():
    src = os.path.join(IMAGES, src_name)
    dst = os.path.join(IMAGES, dst_name)
    if not os.path.exists(src):
        print(f"SKIP {src_name}: no existe")
        continue
    img = Image.open(src)
    img.save(dst, "WEBP", quality=85, method=6)
    src_size = os.path.getsize(src) / 1024
    dst_size = os.path.getsize(dst) / 1024
    print(f"{src_name:30s} {src_size:8.1f} KB → {dst_name:30s} {dst_size:7.1f} KB")

# Borrar los .png originales
for src_name in RENAME:
    src = os.path.join(IMAGES, src_name)
    if os.path.exists(src):
        os.remove(src)
        print(f"ELIMINADO: {src_name}")

# Borrar los .webp viejos (con sufijo -s/-es) que quedaron del PR
OLD_WEBP = [
    "carta-pistolas.webp",
    "carta-revolveres.webp",
    "carta-rifles.webp",
    "carta-escopetas.webp",
    "carta-carabinas.webp",
]
for old in OLD_WEBP:
    old_path = os.path.join(IMAGES, old)
    if os.path.exists(old_path):
        os.remove(old_path)
        print(f"ELIMINADO viejo: {old}")

print("\nListo.")
