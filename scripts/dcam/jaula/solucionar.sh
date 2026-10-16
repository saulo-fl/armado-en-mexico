#!/usr/bin/env bash
# Corre en el HOST. Lanza al agente solucionador DENTRO de la jaula (docker run,
# sin red salvo dcam-puente) sobre una copia de la rama que vive en un volumen
# tmpfs con tope, y saca de ahí SOLO lo permitido para que compuertas.sh lo valide.
#
# Firma: solucionar.sh <FECHA_ISO> <RAMA> <WORKDIR> <MAIN>
#   FECHA_ISO: fecha de la corrida (YYYY-MM-DD)
#   RAMA:      auto/inventario-<FECHA> que el pipeline ya dejó con lo mecánico
#   WORKDIR:   carpeta de trabajo de la corrida ($W); trae motivo.txt, prompt.txt
#              y los *.json/*.tsv que el agente necesita como entrada
#   MAIN:      clon desechable de main que arma quien nos llama (no lo creamos
#              aquí); de ahí salen dentro.sh, extraer.sh, solucionador-dcam.md y
#              la lista PERMITIDOS, de confianza, nunca de la rama que se repara
#
# Contrato de stdout: en éxito, la ÚNICA línea en stdout es la ruta absoluta a
# $JAULA/repo (lo EXTRAÍDO: solo archivos de PERMITIDOS) y $W/salida trae
# agente.json y, si el agente lo escribió, solucion.json. En fallo, stdout vacío,
# exit distinto de 0 y $JAULA ya borrada.
#
# Ronda de arreglo 4/5 (decisión de Saulo, 15-oct): tope de disco. Todo lo que
# el agente puede escribir vive en tmpfs con tamaño fijo — /trabajo (repo y
# salida) es un volumen Docker tmpfs con nombre, creado por corrida
# ($DCAM_JAULA_TMPFS, 2g por defecto), además de los --tmpfs de /tmp y
# /home/agente. Nada que escribe el agente toca el disco del host:
#   1-2. un contenedor PREVIO (comando fijo de aquí, no dentro.sh) monta el
#      clon del host ($DCAM_DIR/repo) en SOLO LECTURA y clona la rama directo a
#      /trabajo/repo del volumen: ni esa copia pasa por el disco del host;
#   3. el agente trabaja sobre el volumen;
#   4. un contenedor corto de extracción (extraer.sh de MAIN) monta el volumen
#      en solo lectura y copia al host SOLO los archivos de PERMITIDOS (regular,
#      sin enlaces, ≤ 5 MB) a $JAULA/repo y solucion.json/agente.json (≤ 1 MB)
#      a $W/salida. Lo máximo que llega al disco del host está acotado.
# La salida de consola de los contenedores no pasa por el log json-file del
# daemon (--log-driver none) y en el host se recorta a 1 MB.
# Un volumen tmpfs de Docker se desmonta (y PIERDE el contenido) en cuanto
# ningún contenedor lo usa — comprobado en APOLO. Por eso un contenedor "ancla"
# (sleep, sin red, solo lectura) lo mantiene montado de la copia a la extracción.
# El trap EXIT borra siempre los contenedores y el volumen.
set -euo pipefail

FECHA_ISO="$1" RAMA="$2" W="$3" MAIN="$4"

# Validar ANTES de tocar nada (fail fast).
[[ "$FECHA_ISO" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || { echo "fecha inválida" >&2; exit 2; }
[[ "$RAMA" =~ ^auto/inventario-[0-9A-Z-]+$ ]] || { echo "rama inválida" >&2; exit 2; }
TAM_TMPFS="${DCAM_JAULA_TMPFS:-2g}"
[[ "$TAM_TMPFS" =~ ^[0-9]+[kmg]?$ ]] || { echo "DCAM_JAULA_TMPFS inválido: $TAM_TMPFS" >&2; exit 2; }
TIEMPO_AGENTE="${SOLUCIONADOR_TIMEOUT:-45m}"
[[ "$TIEMPO_AGENTE" =~ ^([0-9]+)([smh]?)$ ]] || { echo "SOLUCIONADOR_TIMEOUT inválido: $TIEMPO_AGENTE" >&2; exit 2; }
# Fase 3c (menor 1): el ancla caduca sola, timeout del agente + 15 min, aunque
# este script muera con SIGKILL sin pasar por el trap (con --rm se borra y el
# volumen tmpfs se desmonta; el objeto vacío lo barre el pipeline al arrancar).
case "${BASH_REMATCH[2]}" in m) F=60 ;; h) F=3600 ;; *) F=1 ;; esac
ANCLA_S=$(( BASH_REMATCH[1] * F + 900 ))

REPO="${DCAM_DIR:?}/repo"
JAULA="$(mktemp -d /tmp/dcam-jaula-XXXX)"
VOL="$(basename "$JAULA")"   # dcam-jaula-XXXX: un volumen por corrida
# La jaula y los contenedores corren con el uid:gid DEL USUARIO DEL HOST (ronda
# de arreglo 2/5): lo que se extrae al host es del mismo usuario que corre el
# pipeline y un `rm -rf` normal basta. Hoy saulo; en Fase 4, el usuario `dcam`.
UID_HOST="$(id -u)"
GID_HOST="$(id -g)"

NOMBRE_CONTENEDOR="dcam-solucionador-${FECHA_ISO}-$$"
ANCLA="${VOL}-ancla"
PREP="${VOL}-prep"
EXTRACTOR="${VOL}-extraer"
EXITO=0
limpiar() {
  local c i
  for c in "$NOMBRE_CONTENEDOR" "$PREP" "$EXTRACTOR" "$ANCLA"; do
    docker rm -f "$c" >/dev/null 2>&1 || true
  done
  # Guardia del nombre: solo se borra un volumen con la forma exacta de los
  # que crea este script.
  if [[ "$VOL" =~ ^dcam-jaula-[A-Za-z0-9]+$ ]]; then
    # `--rm` puede tardar un instante en soltar el volumen: reintenta.
    for i in 1 2 3 4 5 6 7 8 9 10; do
      docker volume rm "$VOL" >/dev/null 2>&1 && break
      docker volume inspect "$VOL" >/dev/null 2>&1 || break
      sleep 1
    done
    # Fase 3c (menor 4): que la fuga deje rastro en el $LOG del pipeline.
    if docker volume inspect "$VOL" >/dev/null 2>&1; then
      echo "solucionar.sh: AVISO: el volumen $VOL sigue vivo tras 10 intentos de borrarlo" >&2
    fi
  fi
  # $JAULA se queda solo en éxito (la usa compuertas.sh; el pipeline la borra
  # al final con limpiar_jaula). En cualquier fallo, incluido un `set -e` a
  # medias, se borra aquí.
  [ "$EXITO" -eq 1 ] || rm -rf "$JAULA" 2>/dev/null || true
}
trap limpiar EXIT

# Banderas comunes de endurecimiento para todos los contenedores de este script.
DURO=(--read-only --cap-drop ALL --security-opt no-new-privileges --log-driver none
      --user "${UID_HOST}:${GID_HOST}")
# La consola de un contenedor va al host recortada a $1 bytes; el resto se
# descarta sin escribirse (se sigue leyendo para no matar al cliente docker).
recortar() { { head -c "$1" > "$2"; cat > /dev/null; }; }

mkdir -p "$JAULA/entrada" "$JAULA/repo"
# Vacía $W/salida: aquí solo escribe el extractor (uid del host).
rm -rf "$W/salida"
mkdir -p "$W/salida"
chmod 700 "$W/salida"
cp "$W"/*.json "$W"/*.tsv "$JAULA/entrada/" 2>/dev/null || true
cp "$W/motivo.txt" "$W/prompt.txt" "$JAULA/entrada/"

# Lista PERMITIDOS de MAIN (nunca de la rama), para el extractor.
( cd "$MAIN" && node -e "import('./scripts/dcam/validar-parche-lib.mjs').then(m=>console.log([...m.PERMITIDOS].join('\n')))" ) \
  > "$JAULA/permitidos.txt"
[ -s "$JAULA/permitidos.txt" ] || { echo "solucionar.sh: lista PERMITIDOS vacía" >&2; exit 1; }

docker volume create --driver local --opt type=tmpfs --opt device=tmpfs \
  --opt "o=size=${TAM_TMPFS},uid=${UID_HOST},gid=${GID_HOST},mode=0700" "$VOL" >/dev/null

docker run -d --rm --init --name "$ANCLA" --network none "${DURO[@]}" \
  --pids-limit 16 --memory 64m -v "$VOL:/trabajo:ro" dcam-jaula:1 sleep "$ANCLA_S" >/dev/null

# Copia de la rama al volumen: contenedor previo con un comando fijo del host;
# el clon del host entra en solo lectura. La copia no sabe a dónde empujar.
timeout --kill-after=10 5m \
  docker run --rm --init --name "$PREP" --network none "${DURO[@]}" \
  --pids-limit 64 --memory 1g --tmpfs /tmp:size=64m -e HOME=/tmp -e RAMA="$RAMA" \
  -v "$REPO:/fuente:ro" -v "$VOL:/trabajo" \
  dcam-jaula:1 sh -c 'git clone --quiet --no-hardlinks --branch "$RAMA" file:///fuente /trabajo/repo &&
    git -C /trabajo/repo remote remove origin && mkdir /trabajo/salida' \
  2>&1 | recortar 65536 "$W/docker-prep.log" && RC_PREP=0 || RC_PREP=$?
docker rm -f "$PREP" >/dev/null 2>&1 || true
if [ "$RC_PREP" -ne 0 ]; then   # Fase 3c (menor 3): que el $LOG diga dónde mirar
  echo "solucionar.sh: falló la copia previa de la rama al volumen (rc=$RC_PREP); ver $W/docker-prep.log" >&2
  exit 1
fi

# `--init` (reaper de PID 1) ayuda a que las señales lleguen dentro; un
# `timeout` que vence solo mata al CLIENTE docker, por eso el `docker rm -f`
# explícito de abajo (ronda de arreglo 1/5, punto 2).
timeout --kill-after="${SOLUCIONADOR_KILL_AFTER:-60}" "$TIEMPO_AGENTE" \
  docker run --rm --init --name "$NOMBRE_CONTENEDOR" --network dcam-interna "${DURO[@]}" \
  --tmpfs /tmp:size=512m --tmpfs "/home/agente:size=256m,uid=${UID_HOST},gid=${GID_HOST}" \
  --pids-limit 512 --memory 4g --cpus 2 -e HOME=/home/agente \
  -v "$VOL:/trabajo" -v "$JAULA/entrada:/trabajo/entrada:ro" \
  -v "$MAIN/scripts/dcam/jaula/dentro.sh:/opt/main/dentro.sh:ro" \
  -v "$MAIN/.claude/agents/solucionador-dcam.md:/opt/main/solucionador-dcam.md:ro" \
  dcam-jaula:1 bash /opt/main/dentro.sh \
  2>&1 | recortar 1048576 "$W/docker-solucionar.log" && RC=0 || RC=$?
# ^ `&& RC=0 || RC=$?` porque con `set -e` un docker run que falla cortaría el
# script aquí; con pipefail, RC es el del docker run (recortar sale 0).
docker rm -f "$NOMBRE_CONTENEDOR" >/dev/null 2>&1 || true
# Fase 3c (menor 2): no se extrae nada mientras el agente pueda seguir vivo
# (un `docker rm -f` que falló en silencio): podría cambiar los archivos
# entre la revisión y la copia.
if docker container inspect "$NOMBRE_CONTENEDOR" >/dev/null 2>&1; then
  echo "solucionar.sh: el contenedor del agente ($NOMBRE_CONTENEDOR) sigue existiendo tras docker rm -f; no se extrae nada" >&2
  exit 1
fi

# Extracción acotada: el volumen en solo lectura, el agente ya muerto.
timeout --kill-after=10 5m \
  docker run --rm --init --name "$EXTRACTOR" --network none "${DURO[@]}" \
  --pids-limit 64 --memory 512m \
  -v "$VOL:/v:ro" -v "$JAULA/repo:/x/repo" -v "$W/salida:/x/salida" \
  -v "$JAULA/permitidos.txt:/x/permitidos.txt:ro" \
  -v "$MAIN/scripts/dcam/jaula/extraer.sh:/opt/main/extraer.sh:ro" \
  dcam-jaula:1 bash /opt/main/extraer.sh \
  2>&1 | recortar 65536 "$W/docker-extraer.log" && RC_EXT=0 || RC_EXT=$?
docker rm -f "$EXTRACTOR" >/dev/null 2>&1 || true

AGENTE_JSON="$W/salida/agente.json"
# `[ -f ] && [ ! -L ]` + tamaño > 0, no `[ -s ]` a secas (ronda de arreglo 1/5,
# punto 10): `-s` no mira el TIPO.
if [ "$RC" -eq 0 ] && [ "$RC_EXT" -eq 0 ] && [ -f "$AGENTE_JSON" ] && [ ! -L "$AGENTE_JSON" ] \
   && [ "$(stat -c%s "$AGENTE_JSON" 2>/dev/null || echo 0)" -gt 0 ]; then
  EXITO=1
  echo "$JAULA/repo"   # ÚNICA línea de stdout en éxito: el host la captura con $(...)
  exit 0
fi
echo "solucionar.sh: agente RC=$RC, extracción RC=$RC_EXT o agente.json vacío/irregular; ver $W/docker-solucionar.log y $W/docker-extraer.log" >&2
exit 1
