#!/usr/bin/env bash
# Corre en el HOST. Clona la rama a una copia desechable, lanza al agente
# solucionador DENTRO de la jaula (docker run, sin red salvo dcam-puente) y,
# si salió bien, imprime en stdout la ruta del repo clonado para que
# compuertas.sh (otro script) reconstruya el resultado copiando de ahí solo
# los archivos permitidos.
#
# Firma: solucionar.sh <FECHA_ISO> <RAMA> <WORKDIR> <MAIN>
#   FECHA_ISO: fecha de la corrida (YYYY-MM-DD)
#   RAMA:      auto/inventario-<FECHA> que el pipeline ya dejó con lo mecánico
#   WORKDIR:   carpeta de trabajo de la corrida ($W); trae motivo.txt, prompt.txt
#              y los *.json/*.tsv que el agente necesita como entrada
#   MAIN:      clon desechable de main que arma quien nos llama (no lo creamos
#              aquí); de ahí salen dentro.sh y solucionador-dcam.md, de confianza,
#              nunca de la rama que se está reparando
#
# Contrato de stdout: en éxito, la ÚNICA línea en stdout es la ruta absoluta a
# $JAULA/repo. Todo lo demás va a $W/docker-solucionar.log. En fallo, stdout
# vacío y exit distinto de 0.
set -euo pipefail

FECHA_ISO="$1" RAMA="$2" W="$3" MAIN="$4"

# Validar ANTES de tocar nada (fail fast).
[[ "$FECHA_ISO" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || { echo "fecha inválida" >&2; exit 2; }
[[ "$RAMA" =~ ^auto/inventario-[0-9A-Z-]+$ ]] || { echo "rama inválida" >&2; exit 2; }

REPO="${DCAM_DIR:?}/repo"
JAULA="$(mktemp -d /tmp/dcam-jaula-XXXX)"
# NO borrar $JAULA en ningún trap: lo usa compuertas.sh después para copiar los
# archivos permitidos; el pipeline la borra al final de la corrida (ver
# `limpiar_jaula` en conciliar-pipeline.sh).
# ponytail: $JAULA y $W/salida son bind mounts normales de /tmp, sin cuota — el
# agente puede llenar el disco hasta el kill de 45 min (SOLUCIONADOR_TIMEOUT).
# Mejora: volumen tmpfs con tope + extractor, o un FS con cuota dedicado
# (decisión de Saulo, fuera de esta fase).

# Ronda de arreglo 2/5 (causa común de los puntos 9 y el "Important nuevo" de
# huérfanos en /tmp): la jaula y el contenedor de compuertas corren con el
# uid:gid DEL USUARIO DEL HOST que lanza el pipeline — NUNCA con un uid fijo
# (10001) que el host no es. Con un uid fijo, cualquier archivo/directorio que
# el agente crea dentro de /trabajo/repo o /trabajo/salida (bind mounts reales,
# no tmpfs) queda en el host con ESE dueño; si el usuario del host no es root,
# ni puede atravesarlo ni puede borrarlo con un `rm -rf` normal — hacía falta
# un contenedor efímero solo para limpiar. Con el uid del host, todo lo que
# crea el agente ya es del mismo usuario que corre el pipeline: `rm -rf`
# normal basta, siempre. Hoy ese usuario es saulo; en Fase 4 será el usuario
# dedicado `dcam`.
UID_HOST="$(id -u)"
GID_HOST="$(id -g)"

# Nombre único del contenedor: permite un `docker rm -f` explícito (ver abajo,
# justo después del `docker run`) y, como respaldo, en el trap EXIT — ronda de
# arreglo 1/5 (punto 2), probado en APOLO: un `timeout` que vence solo mata al
# CLIENTE `docker` (el proceso que corre aquí), nunca al contenedor en el
# daemon. `--init` (reaper de PID 1) ayuda a que las señales lleguen dentro.
NOMBRE_CONTENEDOR="dcam-solucionador-${FECHA_ISO}-$$"
trap 'docker rm -f "$NOMBRE_CONTENEDOR" >/dev/null 2>&1 || true' EXIT

git clone --quiet --no-hardlinks --branch "$RAMA" "file://$REPO" "$JAULA/repo"
git -C "$JAULA/repo" remote remove origin

mkdir -p "$JAULA/entrada"
# Vacía $W/salida antes de montarla rw en la jaula (ronda de arreglo 1/5, punto
# 3): una corrida anterior pudo dejar algo ahí. Con el uid del host (arriba),
# este `rm -rf` ya no puede fallar por permisos de un uid ajeno (ronda 2/5,
# "Important nuevo": con uid 10001 fijo, esto abortaba el script ANTES del
# `docker run` en cada reintento con la misma fecha, con un mensaje engañoso).
rm -rf "$W/salida"
mkdir -p "$W/salida"
cp "$W"/*.json "$W"/*.tsv "$JAULA/entrada/" 2>/dev/null || true
cp "$W/motivo.txt" "$W/prompt.txt" "$JAULA/entrada/"
chmod -R a+rwX "$JAULA/repo" "$W/salida"

timeout --kill-after="${SOLUCIONADOR_KILL_AFTER:-60}" "${SOLUCIONADOR_TIMEOUT:-45m}" \
  docker run --rm --init --name "$NOMBRE_CONTENEDOR" --network dcam-interna \
  --read-only --tmpfs /tmp:size=512m --tmpfs "/home/agente:size=256m,uid=${UID_HOST},gid=${GID_HOST}" \
  --cap-drop ALL --security-opt no-new-privileges --pids-limit 512 --memory 4g --cpus 2 \
  --user "${UID_HOST}:${GID_HOST}" -e HOME=/home/agente \
  -v "$JAULA/repo:/trabajo/repo:rw" -v "$JAULA/entrada:/trabajo/entrada:ro" -v "$W/salida:/trabajo/salida:rw" \
  -v "$MAIN/scripts/dcam/jaula/dentro.sh:/opt/main/dentro.sh:ro" \
  -v "$MAIN/.claude/agents/solucionador-dcam.md:/opt/main/solucionador-dcam.md:ro" \
  dcam-jaula:1 bash /opt/main/dentro.sh >"$W/docker-solucionar.log" 2>&1 && RC=0 || RC=$?
# ^ el `&& RC=0 || RC=$?` es necesario con `set -e`: sin él, un docker run que
# falla corta el script ANTES de llegar a la línea `RC=$?` de abajo (nunca se
# ejecutaría), y el chequeo de agente.json vacío (RC=0 pero sin salida útil)
# tampoco se alcanzaría nunca.

# Ronda de arreglo 2/5 (minor "orden del trap"): el `docker rm -f` del
# contenedor del agente se hace AQUÍ, explícito, antes de cualquier limpieza o
# declaración de éxito/fallo — no solo en el trap EXIT (que sigue como
# respaldo si el script muriera antes de llegar aquí). Importa el orden: si el
# contenedor sigue vivo (p. ej. ignoró la señal), borrar $JAULA mientras sigue
# montada dentro de él es el escenario que se quiere evitar.
docker rm -f "$NOMBRE_CONTENEDOR" >/dev/null 2>&1 || true

AGENTE_JSON="$W/salida/agente.json"
# Ronda de arreglo 1/5 (punto 10): `[ -f ] && [ ! -L ]` + tamaño > 0, no `[ -s ]`
# a secas — `-s` solo mira "existe y tamaño > 0", sin importar el TIPO (un
# symlink a algo grande también pasaría `-s`).
if [ "$RC" -eq 0 ] && [ -f "$AGENTE_JSON" ] && [ ! -L "$AGENTE_JSON" ] \
   && [ "$(stat -c%s "$AGENTE_JSON" 2>/dev/null || echo 0)" -gt 0 ]; then
  echo "$JAULA/repo"   # ÚNICA línea de stdout en éxito: el host la captura con $(...)
  exit 0
fi
# Fallo: $JAULA solo hace falta cuando hay algo que compuertas.sh tenga que validar.
# Sin éxito no hay nada que validar — se limpia aquí (nunca en un trap: el trap
# también dispararía en el camino de ÉXITO, que es justo el que no se debe
# borrar). Dejarla huérfana en /tmp con el contenido de la rama (y de lo que
# haya escrito el agente a medias) hasta la próxima limpieza manual es el
# hueco que esto cierra. Con el uid del host (arriba) un `rm -rf` normal
# siempre basta — ya no hace falta un contenedor efímero para limpiar por
# dentro (ronda de arreglo 2/5, quitado ese mecanismo).
rm -rf "$JAULA" 2>/dev/null || true
echo "solucionar.sh: docker run salió $RC o agente.json vacío/irregular; ver $W/docker-solucionar.log" >&2
exit 1
