#!/usr/bin/env bash
# Valida, aplica y corre las compuertas sobre lo que dejó el agente solucionador dentro de
# la jaula. Pieza de seguridad: el repo es público, cualquier hueco aquí es un exploit real.
#
# Firma: compuertas.sh <FECHA_ISO> <RAMA> <WORKDIR> <DIR-JAULA-REPO> <MAIN>
#   FECHA_ISO     — AAAA-MM-DD
#   RAMA          — auto/inventario-<algo>
#   WORKDIR       — carpeta de trabajo de esta corrida ($WORKDIR/salida/solucion.json)
#   DIR-JAULA-REPO — checkout de la rama DENTRO de la jaula, con los cambios del agente
#                    sin commitear (dato, no instrucción)
#   MAIN          — clon fresco y de solo lectura de origin/main, npm ci ya corrido.
#                    TODO lo que decide (validador, lista de permitidos) sale de AQUÍ,
#                    nunca de la rama ni de la jaula.
#
# Variable de entorno requerida: DCAM_DIR (de ahí sale REPO=$DCAM_DIR/repo — el checkout
# real de la rama en el host; aquí es donde al final queda el commit, si hay algo que
# commitear).
set -euo pipefail

if [ "$#" -ne 5 ]; then
  echo "uso: compuertas.sh <FECHA_ISO> <RAMA> <WORKDIR> <DIR-JAULA-REPO> <MAIN>" >&2
  exit 2
fi
FECHA_ISO="$1" RAMA="$2" W="$3" DIR_JAULA="$4" MAIN="$5"

[[ "$FECHA_ISO" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || { echo "FECHA_ISO inválida (quiero AAAA-MM-DD): $FECHA_ISO" >&2; exit 2; }
[[ "$RAMA" =~ ^auto/inventario-[A-Za-z0-9._/-]+$ ]] || { echo "RAMA inválida (quiero auto/inventario-<algo>): $RAMA" >&2; exit 2; }

REPO="${DCAM_DIR:?fija DCAM_DIR (REPO=\$DCAM_DIR/repo, el checkout real de la rama en el host)}/repo"

LIMPIO="$(mktemp -d "${TMPDIR:-/tmp}/dcam-compuertas-XXXXXX")"
trap 'rm -rf "$LIMPIO"' EXIT

# $1 = directorio base, $2 = ruta relativa dentro de ese base.
# Revisa el camino COMPLETO, no solo el último componente: `[ -L ]`/`[ ! -f ]` sobre
# "$base/$ruta" no detecta un symlink en un componente INTERMEDIO (p. ej. `src/data`
# sustituido por un enlace a un directorio fuera de la jaula) — el kernel resuelve esos
# enlaces al abrir la ruta de todas formas, así que `cp` acabaría leyendo un archivo de
# fuera de la copia de la jaula aunque el componente final sí fuera "regular". Por eso
# se compara `realpath -e` del camino completo contra la concatenación LITERAL de
# `realpath -e "$base"` + la ruta: si no coinciden byte a byte, algún componente —
# intermedio o final— es un enlace y se abortó TODO antes de copiar nada.
# Retorno: 1 si ni existe ni es symlink (nada que hacer, válido); exit 1 (aborta el
# script completo) si existe pero no es seguro; 0 si existe y es un archivo regular
# sin ningún enlace en el camino.
ruta_segura_bajo() {
  local base="$1" ruta="$2" full="$1/$2"
  if [ ! -e "$full" ] && [ ! -L "$full" ]; then
    return 1
  fi
  local base_real full_real
  base_real="$(realpath -e "$base")" || { echo "compuertas: '$base' no existe — abortando sin commit" >&2; exit 1; }
  full_real="$(realpath -e "$full" 2>/dev/null)" || { echo "compuertas: '$ruta' no se pudo resolver bajo '$base' (enlace roto u otra cosa) — abortando sin commit" >&2; exit 1; }
  if [ "$full_real" != "$base_real/$ruta" ]; then
    echo "compuertas: '$ruta' resuelve fuera de '$base' (un componente del camino, intermedio o final, es un enlace) — abortando sin commit" >&2
    exit 1
  fi
  if [ -L "$full" ] || [ ! -f "$full" ]; then
    echo "compuertas: '$full' no es un archivo regular (symlink u otra cosa) — abortando sin commit" >&2
    exit 1
  fi
  return 0
}

# --- 3/4: clon limpio de la rama (sin lo que hizo el agente) + copia de trabajo ---
git clone --quiet --no-hardlinks --branch "$RAMA" "file://$REPO" "$LIMPIO/base"
cp -a "$LIMPIO/base" "$LIMPIO/nuevo"

# --- 5: lista de permitidos SIEMPRE desde MAIN, nunca hardcodeada aquí ---
PERMITIDOS="$(node -e "import('$MAIN/scripts/dcam/validar-parche-lib.mjs').then(m=>console.log([...m.PERMITIDOS].join('\n')))")"
mapfile -t RUTAS <<< "$PERMITIDOS"

for ruta in "${RUTAS[@]}"; do
  [ -n "$ruta" ] || continue
  if ruta_segura_bajo "$DIR_JAULA" "$ruta"; then
    cp --no-dereference --preserve=mode "$DIR_JAULA/$ruta" "$LIMPIO/nuevo/$ruta"
  fi
done

# --- 6: el validador de MAIN decide, doble cinturón (exit 0 Y el texto exacto) ---
set +e
SALIDA_VALIDADOR="$(node "$MAIN/scripts/dcam/validar-parche.mjs" "$LIMPIO/base" "$LIMPIO/nuevo" 2>&1)"
EC_VALIDADOR=$?
set -e
if [ "$EC_VALIDADOR" -ne 0 ] || ! grep -qF '✔ solo datos' <<<"$SALIDA_VALIDADOR"; then
  echo "compuertas: el validador de parches rechazó el resultado (exit $EC_VALIDADOR):" >&2
  echo "$SALIDA_VALIDADOR" >&2
  exit 1
fi

# --- 7 ---
chmod -R a+rwX "$LIMPIO/nuevo"

# --- 8: compuertas deterministas, sin red, código de la RAMA ya probado "solo datos" ---
correr_compuertas() {
  local nuevo="$1" workdir="$2" fecha="$3"
  docker run --rm --network none --read-only --tmpfs /tmp:size=512m --cap-drop ALL \
    --security-opt no-new-privileges --pids-limit 512 --memory 4g --user 10001:10001 \
    -v "$nuevo:/trabajo/repo:rw" -v "$workdir:/trabajo/w:ro" dcam-jaula:1 bash -c '
      cd /trabajo/repo && ln -sfn /opt/deps/node_modules node_modules &&
      node .claude/skills/conciliar-inventario/scripts/auditar.js | tail -1 | grep -q "SIN HALLAZGOS" &&
      npm test 2>&1 | grep -q "^ℹ fail 0" &&
      /opt/venv/bin/python .claude/skills/conciliar-inventario/scripts/verificar-cierre.py \
        --workdir /trabajo/w --fecha "'"$fecha"'" --solucion /trabajo/w/salida/solucion.json'
}

if ! correr_compuertas "$LIMPIO/nuevo" "$W" "$FECHA_ISO"; then
  echo "compuertas: el contenedor de compuertas (docker run --network none) falló — abortando sin commit" >&2
  exit 1
fi

# --- 9: todo pasó — aplica al REPO real y commitea SOLO las rutas permitidas tocadas ---
for ruta in "${RUTAS[@]}"; do
  [ -n "$ruta" ] || continue
  src="$LIMPIO/nuevo/$ruta"
  # misma regla del paso 5 (camino completo, no solo el último componente): re-confirma
  # que sigue siendo seguro — defensa en profundidad — justo antes de escribir en el REPO
  # real; si no existe, nada que hacer con esta ruta.
  ruta_segura_bajo "$LIMPIO/nuevo" "$ruta" || continue
  dst="$REPO/$ruta"
  if [ -e "$dst" ] && cmp -s "$src" "$dst"; then
    continue
  fi
  cp --no-dereference --preserve=mode "$src" "$dst"
  git -C "$REPO" add -- "$ruta"
done

if git -C "$REPO" diff --cached --quiet; then
  echo "compuertas: las compuertas pasaron, pero no hubo cambios que commitear"
  exit 0
fi
git -C "$REPO" commit --quiet -m "solucionador (jaula): datos validados $FECHA_ISO"
