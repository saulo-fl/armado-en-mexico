#!/usr/bin/env bash
# Valida, aplica y corre las compuertas sobre lo que dejó el agente solucionador dentro de
# la jaula. Pieza de seguridad: el repo es público, cualquier hueco aquí es un exploit real.
#
# Firma: compuertas.sh <FECHA_ISO> <RAMA> <WORKDIR> <DIR-JAULA-REPO> <MAIN>
#   FECHA_ISO     — AAAA-MM-DD
#   RAMA          — auto/inventario-<algo>
#   WORKDIR       — carpeta de trabajo de esta corrida ($WORKDIR/salida/solucion.json)
#   DIR-JAULA-REPO — lo que extraer.sh sacó del volumen tmpfs de la jaula (solo
#                    archivos de PERMITIDOS; ronda de arreglo 4/5). Sigue siendo
#                    dato del agente, no instrucción: se revisa igual que antes.
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
# Ronda de arreglo 1/5 (punto 11): misma regex estricta que solucionar.sh — antes
# esta era más laxa (A-Za-z0-9._/-) y las dos podían aceptar ramas distintas.
[[ "$RAMA" =~ ^auto/inventario-[0-9A-Z-]+$ ]] || { echo "RAMA inválida (quiero auto/inventario-<algo>): $RAMA" >&2; exit 2; }

REPO="${DCAM_DIR:?fija DCAM_DIR (REPO=\$DCAM_DIR/repo, el checkout real de la rama en el host)}/repo"

# Ronda de arreglo 2/5: el contenedor de compuertas corre con el uid:gid DEL
# USUARIO DEL HOST (nunca un uid fijo) — ver la nota larga en solucionar.sh.
# Lo que ese contenedor crea dentro de $LIMPIO/nuevo (el symlink de
# node_modules, cachés de npm) queda del mismo usuario que corre el pipeline,
# así que el `rm -rf "$LIMPIO"` del trap de abajo nunca puede fallar por
# permisos de un uid ajeno.
UID_HOST="$(id -u)"
GID_HOST="$(id -g)"

LIMPIO="$(mktemp -d "${TMPDIR:-/tmp}/dcam-compuertas-XXXXXX")"
# Nombre único del contenedor de compuertas: permite `docker rm -f` de respaldo
# en el trap aunque el `timeout` del paso 8 solo mate al cliente `docker`, no al
# contenedor en el daemon (ronda de arreglo 1/5, punto 2). Se referencia por
# nombre de variable (comillas simples): bash la resuelve al valor que tenga EN
# EL MOMENTO en que el trap de verdad se dispara, no al registrar el trap.
NOMBRE_COMPUERTAS="dcam-compuertas-${FECHA_ISO}-$$"
trap 'docker rm -f "$NOMBRE_COMPUERTAS" >/dev/null 2>&1 || true; rm -rf "$LIMPIO"' EXIT

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
    # install -m 0644 (ronda de arreglo 1/5, punto 6): consistente con la
    # copia del paso 9 — nunca `--preserve=mode` en ninguna de las dos copias.
    install -m 0644 "$DIR_JAULA/$ruta" "$LIMPIO/nuevo/$ruta"
  fi
done

# --- 6: el validador de MAIN decide, doble cinturón (exit 0 Y el texto exacto EN
# STDOUT) --- Ronda de arreglo 1/5 (punto 12): antes se mezclaba stderr con `2>&1`
# dentro de la misma variable que se greppeaba — un parche podría, en principio,
# imprimir "✔ solo datos" por STDERR (p. ej. en un mensaje de error) y colarse.
# Ahora stdout y stderr se capturan por separado; el texto exacto se exige SOLO
# en stdout.
set +e
SALIDA_STDOUT="$(node "$MAIN/scripts/dcam/validar-parche.mjs" "$LIMPIO/base" "$LIMPIO/nuevo" 2>"$LIMPIO/validador.stderr")"
EC_VALIDADOR=$?
set -e
if [ "$EC_VALIDADOR" -ne 0 ] || ! grep -qF '✔ solo datos' <<<"$SALIDA_STDOUT"; then
  echo "compuertas: el validador de parches rechazó el resultado (exit $EC_VALIDADOR):" >&2
  echo "$SALIDA_STDOUT" >&2
  cat "$LIMPIO/validador.stderr" >&2
  exit 1
fi

# --- 7: snapshot INMUTABLE de lo ya validado (ronda de arreglo 1/5, punto 8):
# "lo commiteado = lo validado". A partir de aquí, `nuevo` queda libre para que
# el contenedor de compuertas escriba lo que necesite (el symlink de
# node_modules, cachés de npm/node --test, lo que sea) sin que eso pueda, ni por
# accidente, cambiar un solo byte de lo que de verdad se va a commitear: eso
# sale SIEMPRE de `validado`, nunca de `nuevo`.
VALIDADO="$LIMPIO/validado"
cp -a "$LIMPIO/nuevo" "$VALIDADO"

# Ronda de arreglo 3/5 (punto 4, "fuera de alcance pero barato"): ya NO se
# ensancha $LIMPIO/nuevo a mundo con `chmod -R a+rwX`. Con el uid del host
# (ronda 2/5), el contenedor de compuertas corre como el mismo usuario que
# hizo el `cp -a`/`git clone` — ya es dueño, no hace falta abrirlo a 777/666
# (que además deja esa copia tocable por cualquier otro proceso local
# mientras el contenedor trabaja).

# --- defensa contra solucion.json como FIFO/symlink/dispositivo (ronda de arreglo
# 1/5, punto 3): `verificar-cierre.py`, DENTRO del contenedor, abre el archivo que
# le pase `--solucion` sin comprobar su tipo. Si esa ruta fuera un FIFO, abrirlo se
# QUEDA ESPERANDO a que alguien escriba del otro lado — con el `flock` del
# pipeline tomado, eso cuelga la corrida entera (denegación de servicio real,
# sembrada por el propio agente en una carpeta que él controla). El host SIEMPRE
# copia (nunca monta directo) a una carpeta PROPIA antes de que el contenedor la
# vea, y solo si es un archivo regular, sin enlaces, ≤ 1 MiB — si no, es FALLO.
SALIDA_VALIDADA="$LIMPIO/salida-validada"
mkdir -p "$SALIDA_VALIDADA"
SOLUCION_ORIG="$W/salida/solucion.json"
if [ -e "$SOLUCION_ORIG" ] || [ -L "$SOLUCION_ORIG" ]; then
  if [ -L "$SOLUCION_ORIG" ] || [ ! -f "$SOLUCION_ORIG" ]; then
    echo "compuertas: '$SOLUCION_ORIG' existe pero no es un archivo regular (symlink, FIFO u otra cosa) — abortando sin commit" >&2
    exit 1
  fi
  TAM_SOLUCION="$(stat -c%s "$SOLUCION_ORIG" 2>/dev/null || echo 0)"
  if [ "$TAM_SOLUCION" -gt 1048576 ]; then
    echo "compuertas: '$SOLUCION_ORIG' excede 1 MiB — abortando sin commit" >&2
    exit 1
  fi
  cp --no-dereference "$SOLUCION_ORIG" "$SALIDA_VALIDADA/solucion.json"
fi

# --- 8: compuertas deterministas, sin red, código de la RAMA ya probado "solo datos" ---
correr_compuertas() {
  local nuevo="$1" workdir="$2" fecha="$3" salida_validada="$4"
  # --init (reaper de zombies/señales) + --name (para el `docker rm -f` del trap)
  # + timeout con --kill-after: ronda de arreglo 1/5, punto 2. `timeout` por sí
  # solo mata al CLIENTE `docker`, no al contenedor en el daemon — el `--name` +
  # el trap de arriba son el cierre real.
  timeout --kill-after="${COMPUERTAS_KILL_AFTER:-30}" "${COMPUERTAS_TIMEOUT:-10m}" \
  docker run --rm --init --name "$NOMBRE_COMPUERTAS" --network none --read-only --tmpfs /tmp:size=512m --cap-drop ALL \
    --security-opt no-new-privileges --pids-limit 512 --memory 4g --user "${UID_HOST}:${GID_HOST}" -e HOME=/tmp \
    -v "$nuevo:/trabajo/repo:rw" -v "$workdir:/trabajo/w:ro" -v "$salida_validada:/trabajo/solucion-validada:ro" \
    dcam-jaula:1 bash -c '
      cd /trabajo/repo && ln -sfn /opt/deps/node_modules node_modules &&
      node .claude/skills/conciliar-inventario/scripts/auditar.js | tail -1 | grep -q "SIN HALLAZGOS" &&
      { npm test >/tmp/t.log 2>&1; rc=$?; cat /tmp/t.log; [ $rc -eq 0 ] && grep -Eq "^# pass [1-9]" /tmp/t.log && grep -q "^# fail 0$" /tmp/t.log; } &&
      /opt/venv/bin/python .claude/skills/conciliar-inventario/scripts/verificar-cierre.py \
        --workdir /trabajo/w --fecha "'"$fecha"'" --solucion /trabajo/solucion-validada/solucion.json'
}
# "^# fail 0", NO "^ℹ fail 0" (verificado en APOLO contra dcam-jaula:1): el Node
# 22.23.3 horneado en la imagen emite el resumen de `node --test` en formato TAP
# ("# fail N") cuando stdout no es una TTY — el host (Node 26) usa el reportero
# "spec" ("ℹ fail N"), que es de donde salió el patrón original del plan. Con "ℹ"
# este grep nunca empareja y NINGÚN cambio podría pasar jamás las compuertas.
# Ronda de arreglo 1/5 (punto 4): además exige "# pass [1-9]" (al menos una
# prueba de verdad) — sin `pipefail` dentro del `bash -c` del contenedor, un
# `npm test` roto que no corra NINGUNA prueba también imprime "# fail 0" y antes
# pasaba igual.

correr_compuertas "$LIMPIO/nuevo" "$W" "$FECHA_ISO" "$SALIDA_VALIDADA" && RC_COMPUERTAS=0 || RC_COMPUERTAS=$?
# ^ con `set -e`, un simple `correr_compuertas ...; RC=$?` corta el script en
# la propia llamada si sale != 0 (nunca llegaría a la línea siguiente) — mismo
# idiom que ya usa solucionar.sh para el `docker run`.
# Ronda de arreglo 2/5 (minor "orden del trap"): explícito aquí, antes de
# cualquier limpieza o declaración de éxito/fallo — no solo en el trap EXIT.
docker rm -f "$NOMBRE_COMPUERTAS" >/dev/null 2>&1 || true
if [ "$RC_COMPUERTAS" -ne 0 ]; then
  echo "compuertas: el contenedor de compuertas (docker run --network none) falló — abortando sin commit" >&2
  exit 1
fi

# --- 9: todo pasó — aplica al REPO real y commitea SOLO las rutas permitidas
# tocadas. SIEMPRE desde $VALIDADO (lo que de verdad pasó el validador), NUNCA
# desde $LIMPIO/nuevo (que el contenedor de compuertas pudo haber tocado: el
# symlink de node_modules, cachés, lo que sea) — "lo commiteado = lo validado"
# (ronda de arreglo 1/5, punto 8). Y sin el `cmp -s` que había antes (punto 7):
# ese atajo se saltaba el `git add` si el árbol de trabajo de $REPO ya tenía,
# por lo que fuera, el mismo contenido sin commitear — y el pipeline avisaba
# "resolvió" sin que el cambio llegara a un commit real. Siempre se copia y se
# `git add`; si al final no hay nada en el índice, se trata como "sin cambios"
# más abajo (compuertas.sh no decide solo si eso es éxito o fallo: lo decide
# quien lo llama).
for ruta in "${RUTAS[@]}"; do
  [ -n "$ruta" ] || continue
  src="$VALIDADO/$ruta"
  # misma regla del paso 5 (camino completo, no solo el último componente): re-confirma
  # que sigue siendo seguro — defensa en profundidad — justo antes de escribir en el REPO
  # real; si no existe, nada que hacer con esta ruta.
  ruta_segura_bajo "$VALIDADO" "$ruta" || continue
  dst="$REPO/$ruta"
  # install -m 0644, NUNCA --preserve=mode (ronda de arreglo 1/5, punto 6): el
  # agente, dentro de la jaula, puede dejar un archivo con +x (o cualquier otro
  # modo) — con --preserve=mode eso viajaba tal cual hasta el commit real en
  # $REPO. El dato que se publica siempre es un archivo plano 0644, sin
  # excepción, sin importar qué modo tenía en la jaula.
  install -m 0644 "$src" "$dst"
  git -C "$REPO" add -- "$ruta"
done

if git -C "$REPO" diff --cached --quiet; then
  echo "compuertas: las compuertas pasaron, pero no hubo cambios que commitear"
  exit 0
fi

# Ronda de arreglo 2/5 (minor "índice de $REPO"): antes de commitear, el índice
# de $REPO debe ser SOLO rutas de PERMITIDOS — el loop de arriba solo hace
# `git add` de esas rutas, así que esto debería ser siempre cierto; es una
# aserción defensiva (p. ej. si $REPO ya llegó con algo staged de otro lado).
CAMBIOS_INDICE="$(git -C "$REPO" diff --cached --name-only)"
FUERA_DE_PERMITIDOS="$(comm -23 <(printf '%s\n' "$CAMBIOS_INDICE" | sort) <(printf '%s\n' "$PERMITIDOS" | sort))"
if [ -n "$FUERA_DE_PERMITIDOS" ]; then
  echo "compuertas: el índice de \$REPO tiene rutas fuera de PERMITIDOS antes de commitear — abortando sin commit: $FUERA_DE_PERMITIDOS" >&2
  git -C "$REPO" reset --quiet
  # Ronda de arreglo 3/5 (punto 5): `git reset` solo desarma el ÍNDICE — el
  # árbol de trabajo de $REPO se queda con lo que `install` copió. Se
  # restaura cada ruta de PERMITIDOS desde HEAD (si no existía en HEAD, se
  # borra: era un archivo nuevo). Nunca un comando que descarte el árbol
  # entero (`checkout -- .`, `reset --hard`) — el guardia del repo los
  # bloquea; esto es, archivo por archivo, solo las rutas conocidas.
  for ruta in "${RUTAS[@]}"; do
    [ -n "$ruta" ] || continue
    if git -C "$REPO" cat-file -e "HEAD:$ruta" 2>/dev/null; then
      git -C "$REPO" show "HEAD:$ruta" > "$REPO/$ruta" 2>/dev/null || true
    else
      rm -f "$REPO/$ruta" 2>/dev/null || true
    fi
  done
  exit 1
fi

git -C "$REPO" commit --quiet -m "solucionador (jaula): datos validados $FECHA_ISO"
