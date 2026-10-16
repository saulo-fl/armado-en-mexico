#!/usr/bin/env bash
# Corre DENTRO de un contenedor corto, sin red, cuando el agente ya terminó (ver
# solucionar.sh). /v = volumen tmpfs de la jaula (SOLO LECTURA); /x/repo y
# /x/salida = carpetas del host (escritura); /x/permitidos.txt = la lista
# PERMITIDOS de MAIN. Copia al host SOLO:
#   - cada ruta de PERMITIDOS que exista en /v/repo: archivo regular, sin enlaces
#     en ningún componente del camino, ≤ 5 MB (MAX_BYTES del validador);
#   - /v/salida/solucion.json y /v/salida/agente.json: regulares, sin enlaces, ≤ 1 MB.
# Cualquier cosa que no cumpla aborta la extracción entera (exit 1): no se
# "arregla" ni se salta en silencio. Todo lo demás del volumen se queda ahí y se
# borra con él.
set -euo pipefail

# $1 base, $2 ruta relativa, $3 destino, $4 tope en bytes.
copiar() {
  local base="$1" ruta="$2" destino="$3" tope="$4" full="$1/$2" real tam
  if [ ! -e "$full" ] && [ ! -L "$full" ]; then
    return 0   # no existe: nada que copiar
  fi
  # La base misma (/v/repo, /v/salida) tampoco puede ser un enlace: el agente
  # controla /trabajo entero y podría sustituirla.
  if [ "$(realpath -e -- "$base" 2>/dev/null)" != "$base" ]; then
    echo "extraer: '$base' no es un directorio real dentro del volumen" >&2; exit 1
  fi
  real="$(realpath -e -- "$full" 2>/dev/null)" || { echo "extraer: '$ruta' no se pudo resolver (enlace roto u otra cosa)" >&2; exit 1; }
  if [ "$real" != "$base/$ruta" ]; then
    echo "extraer: '$ruta' pasa por un enlace (componente intermedio o final)" >&2; exit 1
  fi
  if [ -L "$full" ] || [ ! -f "$full" ]; then
    echo "extraer: '$ruta' no es un archivo regular" >&2; exit 1
  fi
  tam="$(stat -c%s -- "$full")"
  if [ "$tam" -gt "$tope" ]; then
    echo "extraer: '$ruta' mide $tam bytes (tope $tope)" >&2; exit 1
  fi
  mkdir -p "$(dirname "$destino")"
  install -m 0644 "$full" "$destino"
}

while IFS= read -r ruta; do
  [ -n "$ruta" ] || continue
  copiar /v/repo "$ruta" "/x/repo/$ruta" 5242880
done < /x/permitidos.txt

for f in solucion.json agente.json; do
  copiar /v/salida "$f" "/x/salida/$f" 1048576
done
