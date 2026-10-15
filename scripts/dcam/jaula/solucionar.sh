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
# archivos permitidos; el pipeline la borra al final de la corrida.

git clone --quiet --no-hardlinks --branch "$RAMA" "file://$REPO" "$JAULA/repo"
git -C "$JAULA/repo" remote remove origin

mkdir -p "$JAULA/entrada" "$W/salida"
cp "$W"/*.json "$W"/*.tsv "$JAULA/entrada/" 2>/dev/null || true
cp "$W/motivo.txt" "$W/prompt.txt" "$JAULA/entrada/"
chmod -R a+rwX "$JAULA/repo" "$W/salida"

timeout --kill-after=60 45m docker run --rm --network dcam-interna \
  --read-only --tmpfs /tmp:size=512m --tmpfs /home/agente:size=256m \
  --cap-drop ALL --security-opt no-new-privileges --pids-limit 512 --memory 4g --cpus 2 \
  --user 10001:10001 \
  -v "$JAULA/repo:/trabajo/repo:rw" -v "$JAULA/entrada:/trabajo/entrada:ro" -v "$W/salida:/trabajo/salida:rw" \
  -v "$MAIN/scripts/dcam/jaula/dentro.sh:/opt/main/dentro.sh:ro" \
  -v "$MAIN/.claude/agents/solucionador-dcam.md:/opt/main/solucionador-dcam.md:ro" \
  dcam-jaula:1 bash /opt/main/dentro.sh >"$W/docker-solucionar.log" 2>&1 && RC=0 || RC=$?
# ^ el `&& RC=0 || RC=$?` es necesario con `set -e`: sin él, un docker run que
# falla corta el script ANTES de llegar a la línea `RC=$?` de abajo (nunca se
# ejecutaría), y el chequeo de agente.json vacío (RC=0 pero sin salida útil)
# tampoco se alcanzaría nunca.

if [ "$RC" -eq 0 ] && [ -s "$W/salida/agente.json" ]; then
  echo "$JAULA/repo"   # ÚNICA línea de stdout en éxito: el host la captura con $(...)
  exit 0
fi
# Fallo: $JAULA solo hace falta cuando hay algo que compuertas.sh tenga que validar.
# Sin éxito no hay nada que validar — se limpia aquí (nunca en un trap: el trap
# también dispararía en el camino de ÉXITO, que es justo el que no se debe borrar).
# Dejarla huérfana en /tmp con el contenido de la rama (y de lo que haya escrito el
# agente a medias) hasta la próxima limpieza manual es el hueco que esto cierra.
rm -rf "$JAULA"
echo "solucionar.sh: docker run salió $RC o agente.json vacío; ver $W/docker-solucionar.log" >&2
exit 1
