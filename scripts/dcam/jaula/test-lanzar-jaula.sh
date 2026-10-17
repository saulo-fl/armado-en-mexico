#!/usr/bin/env bash
# Armado en México — Copyright (C) 2026 Saulo Flores León
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# Juez del lanzador de la jaula (lanzar-jaula.sh) y de verificar_bundle.
#
#   bash test-lanzar-jaula.sh
#     Todo en un mktemp -d: IPC, clon de `dcam`, árbol de main fijado (con
#     solucionar.sh/compuertas.sh de mentira) y `docker` de mentira en el PATH.
#     No toca /srv, /etc, /var/lib ni Docker, y no llama al modelo.
#     Requiere git, jq, flock y stat GNU (APOLO).
#     LANZADOR=<ruta> y VERIFICAR=<ruta> prueban otra copia (mordidas).
#
#   bash test-lanzar-jaula.sh --real <FECHA_ISO> <RAMA> [DIR_DATOS]
#     Paso 15 del despliegue, como `dcam`: deja una solicitud REAL en
#     $DCAM_IPC/solicitud (por defecto /srv/dcam-ipc) y espera `hecho`.
#     Corre el agente de verdad (gasta suscripción). No empuja ni mergea.
#     DIR_DATOS: carpeta con armas/cartuchos/accesorios .json/.tsv y
#     mapeo-*.json para el agente (opcional).
set -uo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "${1:-}" = "--real" ]; then
  [ "$#" -ge 3 ] || { echo "uso: $0 --real <FECHA_ISO> <RAMA> [DIR_DATOS]" >&2; exit 2; }
  ISO="$2" RAMA="$3" DATOS="${4:-}"
  IPC="${DCAM_IPC:-/srv/dcam-ipc}"
  ESPERA="${DCAM_ESPERA_JAULA:-6000}"
  umask 0002   # el lanzador tiene que poder mover la carpeta (escribe su «..»)
  ID="$(date +%Y%m%dT%H%M%S)-$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')"
  TMPD="$IPC/solicitud/.tmp-$ID"
  mkdir "$TMPD" || exit 1
  jq -n --arg i "$ISO" --arg r "$RAMA" --arg f "${RAMA#auto/inventario-}" \
    '{fecha_iso: $i, rama: $r, fecha_dcam: $f}' > "$TMPD/solicitud.json" || exit 1
  printf 'prueba del despliegue (paso 15): solicitud real, sin push\n' > "$TMPD/motivo.txt"
  if [ -n "$DATOS" ]; then
    for n in armas.json armas.tsv cartuchos.json cartuchos.tsv accesorios.json accesorios.tsv \
             mapeo-armas.json mapeo-cartuchos.json mapeo-accesorios.json; do
      [ -f "$DATOS/$n" ] && cp "$DATOS/$n" "$TMPD/$n"
    done
  fi
  mv -T "$TMPD" "$IPC/solicitud/$ID" || exit 1
  R="$IPC/resultado/$ID"
  echo "solicitud $ID publicada; espero $R/hecho (hasta ${ESPERA}s)"
  for ((s = 0; s < ESPERA; s += 5)); do [ -e "$R/hecho" ] && break; sleep 5; done
  [ -e "$R/hecho" ] || { echo "sin hecho tras ${ESPERA}s"; exit 1; }
  ls -l "$R"
  echo "rc=$(cat "$R/rc")"
  [ "$(cat "$R/rc")" = 0 ]
  exit
fi

LANZADOR="${LANZADOR:-$AQUI/lanzar-jaula.sh}"
VERIFICAR="${VERIFICAR:-$AQUI/verificar-bundle.sh}"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
OK=0; MAL=0
bien(){ echo "  ok   $*"; OK=$((OK+1)); }
mal(){ echo "  MAL  $*"; MAL=$((MAL+1)); }

export HOME="$T/home" GIT_CONFIG_NOSYSTEM=1
export DCAM_IPC="$T/ipc" DCAM_REPO_FUENTE="$T/fuente" DCAM_MAIN="$T/main" \
       DCAM_ESTADO="$T/estado" DCAM_TMP="$T/tmp" DCAM_ESPERA_TMP=2 \
       STUB_LOG="$T/stub.log" T_VISTO="$T/visto"
mkdir -p "$HOME" "$DCAM_IPC"/{solicitud,resultado,rechazadas} "$DCAM_ESTADO" "$DCAM_TMP" \
         "$T/bin" "$T_VISTO" "$DCAM_MAIN/scripts/dcam/jaula"
SOLS="$DCAM_IPC/solicitud" RESS="$DCAM_IPC/resultado" RECH="$DCAM_IPC/rechazadas"

# docker de mentira: solo anota que lo llamaron.
printf '#!/usr/bin/env bash\necho "docker $*" >> "$STUB_LOG"\n' > "$T/bin/docker"
chmod +x "$T/bin/docker"
export PATH="$T/bin:$PATH"

# Clon de `dcam`: main con 3 commits (x.sh v1, x.sh v2, README) y la rama encima.
RAMA="auto/inventario-16-OCT-2026"
F="$DCAM_REPO_FUENTE"
g(){ git -C "$F" -c user.name='Saulo Prueba' -c user.email=prueba@example.invalid "$@"; }
git init -q -b main "$F"
mkdir -p "$F/scripts/dcam/jaula"
echo v1 > "$F/scripts/dcam/jaula/x.sh"; g add -A; g commit -qm c1
echo v2 > "$F/scripts/dcam/jaula/x.sh"; g commit -qam c2
echo leeme > "$F/README"; g add -A; g commit -qm c3
g switch -qc "$RAMA"; echo mecanico > "$F/dato.txt"; g add -A; g commit -qm mecanico; g switch -q main
BASE_RAMA="$(git -C "$F" rev-parse "$RAMA")"

# Árbol de main fijado: verificar-bundle.sh de verdad, solucionar/compuertas de mentira.
J="$DCAM_MAIN/scripts/dcam/jaula"
cp "$VERIFICAR" "$J/verificar-bundle.sh"
cat > "$J/solucionar.sh" <<'EOF'
#!/usr/bin/env bash
W="$3"
echo "solucionar $*" >> "$STUB_LOG"
[ -d "$DCAM_DIR/repo/.git" ] || exit 9
ls -A "$W" > "$T_VISTO/w.txt"; cp "$W/prompt.txt" "$W/motivo.txt" "$T_VISTO/"
[ "${STUB_SOLUCIONAR_RC:-0}" -eq 0 ] || exit 1
JA="$(mktemp -d "$DCAM_TMP/dcam-jaula-XXXX")"; mkdir -p "$JA/repo" "$W/salida"
echo '{"ok":true}' > "$W/salida/solucion.json"; echo '{"r":1}' > "$W/salida/agente.json"
echo consola > "$W/docker-solucionar.log"
echo "$JA/repo"
EOF
cat > "$J/compuertas.sh" <<'EOF'
#!/usr/bin/env bash
echo "compuertas $*" >> "$STUB_LOG"
[ "${STUB_COMPUERTAS_RC:-0}" -eq 0 ] || exit 1
R="$DCAM_DIR/repo"
for i in $(seq 1 "${STUB_COMMITS:-1}"); do
  echo "$i" > "$R/solucion-$i.txt"; git -C "$R" add -A && git -C "$R" commit -qm "stub $i" || exit 1
done
EOF
git -C "$F" rev-parse main > "$DCAM_MAIN/.sha"

N=0
nuevo_id(){ N=$((N + 1)); printf -v id '20261017T2000%02d-%08x' "$N" "$N"; }   # deja el ID en $id
# Solicitud buena a medio escribir (.tmp-<ID>); el caso la estropea y la publica.
preparar(){
  local d="$SOLS/.tmp-$1"
  mkdir "$d"
  printf '{"fecha_iso":"2026-10-16","rama":"%s","fecha_dcam":"16-OCT-2026"}\n' "$RAMA" > "$d/solicitud.json"
  echo '[]' > "$d/armas.json"; printf 'a\tb\n' > "$d/armas.tsv"
  echo '{"totalMapped":0}' > "$d/mapeo-armas.json"
  echo 'paso 3-altas: 2 renglones sin ficha' > "$d/motivo.txt"
  echo "$d"
}
publicar(){ mv -T "$SOLS/.tmp-$1" "$SOLS/$1"; }
correr(){ : > "$STUB_LOG"; rm -rf "$T_VISTO"/*; bash "$LANZADOR" 2>>"$T/lanzador.err"; }
leer(){ cat "$RESS/$1/$2" 2>/dev/null; }
limpio(){  # sin restos de la corrida en estado/ ni en tmp/
  ! compgen -G "$DCAM_ESTADO/run-*" >/dev/null && ! compgen -G "$DCAM_TMP/dcam-jaula-*" >/dev/null
}

# $1 = nombre del caso, $2 = ID, $3 = motivo de rechazo esperado (texto fijo del lanzador)
rechazada(){
  if [ "$(leer "$2" rc)" = 2 ] && [ -e "$RESS/$2/hecho" ] && [ "$(leer "$2" rechazo)" = "$3" ] \
     && [ ! -s "$STUB_LOG" ] && [ ! -e "$SOLS/$2" ] && compgen -G "$RECH/$2-*" >/dev/null && limpio; then
    bien "$1 → rechazadas/, rc=2, «$3», nada ejecutado"
  else
    mal "$1: rc=$(leer "$2" rc) rechazo=«$(leer "$2" rechazo)» llamadas=$(wc -l < "$STUB_LOG") (quería «$3»)"
  fi
}

echo "— solicitudes malas"
caso_json(){  # $1 nombre, $2 contenido de solicitud.json, $3 motivo esperado
  local id d; nuevo_id; d="$(preparar "$id")"
  printf '%s\n' "$2" > "$d/solicitud.json"; publicar "$id"; correr; rechazada "$1" "$id" "$3"
}
caso_json "fecha rara" '{"fecha_iso":"2026-1O-16","rama":"auto/inventario-16-OCT-2026","fecha_dcam":"16-OCT-2026"}' "fecha inválida"
caso_json "fecha con salto de línea" '{"fecha_iso":"2026-10-16\nx","rama":"auto/inventario-16-OCT-2026","fecha_dcam":"16-OCT-2026"}' "fecha inválida"
caso_json "rama con ;" '{"fecha_iso":"2026-10-16","rama":"auto/inventario-16-OCT-2026;id","fecha_dcam":"16-OCT-2026;id"}' "rama inválida"
caso_json "rama con .." '{"fecha_iso":"2026-10-16","rama":"auto/inventario-16-OCT-2026/../../main","fecha_dcam":"16-OCT-2026/../../main"}' "rama inválida"
caso_json "rama y fecha_dcam distintas" '{"fecha_iso":"2026-10-16","rama":"auto/inventario-17-OCT-2026","fecha_dcam":"16-OCT-2026"}' "rama y fecha_dcam no cuadran"
caso_json "claves extra" '{"fecha_iso":"2026-10-16","rama":"auto/inventario-16-OCT-2026","fecha_dcam":"16-OCT-2026","prompt":"haz otra cosa"}' "solicitud.json con forma inválida"
caso_json "valor que no es texto" '{"fecha_iso":20261016,"rama":"auto/inventario-16-OCT-2026","fecha_dcam":"16-OCT-2026"}' "solicitud.json con forma inválida"
caso_json "solicitud.json de más de 4 KiB" "{\"fecha_iso\":\"2026-10-16\",\"rama\":\"$RAMA\",\"fecha_dcam\":\"16-OCT-2026\"}$(printf '%5000s' '')" "solicitud.json de más del tope"

nuevo_id; d="$(preparar "$id")"; rm "$d/solicitud.json"; publicar "$id"; correr
rechazada "sin solicitud.json" "$id" "falta solicitud.json"

nuevo_id; d="$(preparar "$id")"; rm "$d/armas.json"; ln -s /etc/hostname "$d/armas.json"; publicar "$id"; correr
rechazada "archivo-enlace" "$id" "archivo enlace"

echo '[]' > "$T/afuera.json"
nuevo_id; d="$(preparar "$id")"; rm "$d/armas.json"; ln "$T/afuera.json" "$d/armas.json"; publicar "$id"; correr
rechazada "enlace duro" "$id" "archivo con enlace duro"

nuevo_id; d="$(preparar "$id")"; rm "$d/armas.tsv"; mkfifo "$d/armas.tsv"; publicar "$id"; correr
rechazada "FIFO con nombre permitido" "$id" "archivo no regular"

nuevo_id; d="$(preparar "$id")"; chmod 000 "$d/armas.tsv"; publicar "$id"; correr
rechazada "archivo ilegible" "$id" "no se pudo copiar el archivo"

nuevo_id; d="$(preparar "$id")"; echo 'rm -rf /' > "$d/correme.sh"; publicar "$id"; correr
rechazada "nombre fuera de la lista" "$id" "archivo fuera de la lista"

nuevo_id; d="$(preparar "$id")"; echo x > "$d/.armas.json"; publicar "$id"; correr
rechazada "archivo oculto" "$id" "archivo fuera de la lista"

nuevo_id; d="$(preparar "$id")"; head -c 2000 /dev/zero > "$d/armas.tsv"; publicar "$id"
DCAM_TOPE_ARCHIVO=1000 correr
rechazada "archivo de más del tope" "$id" "archivo de más del tope"

nuevo_id; d="$(preparar "$id")"; mv -T "$d" "$T/real-$id"; ln -s "$T/real-$id" "$SOLS/$id"; correr
rechazada "la solicitud es un enlace a una carpeta" "$id" "la solicitud no es una carpeta"

# Nombre de solicitud fuera del formato: no hay resultado (no hay <ID> válido),
# va a rechazadas/sin-id-* y no se ejecuta nada.
sin_id(){  # $1 nombre del caso
  if [ -z "$(ls -A "$SOLS")" ] && compgen -G "$RECH/sin-id-*" >/dev/null \
     && tail -2 "$T/lanzador.err" | grep -qF 'solicitud sin id rechazada: nombre de solicitud inválido' && [ ! -s "$STUB_LOG" ] && limpio; then
    bien "$1 → rechazadas/sin-id-*, nada ejecutado"
  else
    mal "$1: solicitud/=«$(ls -A "$SOLS")» llamadas=$(wc -l < "$STUB_LOG")"
  fi
  rm -rf "$RECH"/sin-id-*
}
nuevo_id; d="$(preparar "$id")"; mv -T "$d" "$SOLS/zz;rm -rf ~"; correr; sin_id "nombre de solicitud inválido"
nuevo_id; d="$(preparar "$id")"; correr; sin_id ".tmp abandonado (más de DCAM_ESPERA_TMP)"

# Un <ID> cuyo resultado ya existe no se vuelve a correr ni se pisa.
nuevo_id; d="$(preparar "$id")"; mkdir "$RESS/$id"; publicar "$id"; correr
if [ -z "$(ls -A "$RESS/$id")" ] && compgen -G "$RECH/$id-*" >/dev/null && [ ! -s "$STUB_LOG" ] && limpio; then
  bien "resultado ya existente → rechazada sin tocar el resultado"
else
  mal "resultado ya existente: resultado=«$(ls -A "$RESS/$id")» llamadas=$(wc -l < "$STUB_LOG")"
fi

echo "— solicitud buena"
nuevo_id; preparar "$id" >/dev/null; publicar "$id"; correr
R="$RESS/$id"
if [ "$(leer "$id" rc)" = 0 ] && [ -e "$R/hecho" ] && [ -f "$R/rama.bundle" ]; then bien "hecho + rc=0 + rama.bundle"
else mal "buena: rc=$(leer "$id" rc) hecho=$([ -e "$R/hecho" ] && echo sí || echo no) archivos=«$(ls -A "$R" | tr '\n' ' ')»"; fi
for f in solucion.json agente.json docker-solucionar.log; do
  [ -f "$R/$f" ] && bien "resultado trae $f" || mal "resultado sin $f"
done
[ ! -e "$R/aviso" ] && bien "sin aviso (main fijado == origin/main en las rutas de la jaula)" || mal "aviso de más: $(cat "$R/aviso")"
[ ! -e "$SOLS/$id" ] && limpio && bien "solicitud tomada; run-<ID> y la carpeta de la jaula borradas" || mal "quedaron restos"
grep -qx 'docker ps -a --format {{.Names}} --filter name=dcam-' "$STUB_LOG" && bien "barrer_jaulas corrió" || mal "barrer_jaulas no corrió"
grep -qFx "Fecha: 2026-10-16. Rama: $RAMA." "$T_VISTO/prompt.txt" && bien "prompt.txt lo arma el lanzador" || mal "prompt.txt: $(cat "$T_VISTO/prompt.txt" 2>/dev/null)"
grep -qx 'paso 3-altas: 2 renglones sin ficha' "$T_VISTO/motivo.txt" && bien "motivo.txt llega como dato" || mal "motivo.txt"
[ "$(tr '\n' ' ' < "$T_VISTO/w.txt")" = "armas.json armas.tsv mapeo-armas.json motivo.txt prompt.txt " ] \
  && bien "WORKDIR solo con los permitidos (sin solicitud.json)" || mal "WORKDIR: $(tr '\n' ' ' < "$T_VISTO/w.txt")"

# El pipeline (dcam) verifica el bundle en su clon, con la rama en su HEAD.
# shellcheck source=verificar-bundle.sh
. "$VERIFICAR"
C="$T/clon-dcam"; git clone -q --branch "$RAMA" "file://$F" "$C"
TIP="$(verificar_bundle "$C" "$R/rama.bundle" "$RAMA")"
if [ -n "$TIP" ] && [ "$(git -C "$C" rev-parse "$TIP^")" = "$BASE_RAMA" ] && git -C "$C" merge -q --ff-only "$TIP"; then
  bien "bundle verificable: un commit hijo de la rama, merge --ff-only"
else
  mal "verificar_bundle rechazó el bundle bueno"
fi

echo "— la jaula no entrega un commit"
caso_rc(){  # $1 nombre, $2 rc esperado; el entorno del stub va delante de la llamada
  local id; nuevo_id; preparar "$id" >/dev/null; publicar "$id"
  env "${@:3}" bash "$LANZADOR" 2>>"$T/lanzador.err" < /dev/null
  if [ "$(leer "$id" rc)" = "$2" ] && [ -e "$RESS/$id/hecho" ] && [ ! -e "$RESS/$id/rama.bundle" ] && limpio; then
    bien "$1 → rc=$2, hecho, sin bundle"
  else
    mal "$1: rc=$(leer "$id" rc) archivos=«$(ls -A "$RESS/$id" | tr '\n' ' ')»"
  fi
}
: > "$STUB_LOG"
caso_rc "dos commits" 6 STUB_COMMITS=2
caso_rc "sin cambios" 3 STUB_COMMITS=0
caso_rc "solucionar.sh falla" 4 STUB_SOLUCIONAR_RC=1
caso_rc "compuertas.sh falla" 5 STUB_COMPUERTAS_RC=1

echo "— aviso de main fijado desactualizado"
git -C "$F" rev-parse main~1 > "$DCAM_MAIN/.sha"   # difiere solo en README: fuera de las rutas
nuevo_id; preparar "$id" >/dev/null; publicar "$id"; correr
[ ! -e "$RESS/$id/aviso" ] && bien "cambio fuera de las rutas de la jaula: sin aviso" || mal "aviso por un cambio ajeno"
git -C "$F" rev-parse main~2 > "$DCAM_MAIN/.sha"   # x.sh v1 ≠ v2: dentro de scripts/dcam/jaula/
nuevo_id; preparar "$id" >/dev/null; publicar "$id"; correr
[ -s "$RESS/$id/aviso" ] && [ "$(leer "$id" rc)" = 0 ] && bien "cambio en scripts/dcam/jaula/: aviso (y la corrida sigue)" || mal "sin aviso con main desactualizado"
git -C "$F" rev-parse main > "$DCAM_MAIN/.sha"

echo "— verificar_bundle (lo que corre el pipeline)"
V="$T/v"; git clone -q --branch "$RAMA" "file://$F" "$V"
git -C "$V" -c user.name=x -c user.email=x@x commit -q --allow-empty -m uno
git -C "$V" -c user.name=x -c user.email=x@x commit -q --allow-empty -m dos
git -C "$V" bundle create -q "$T/dos.bundle" "$BASE_RAMA..$RAMA"
C2="$T/clon2"; git clone -q --branch "$RAMA" "file://$F" "$C2"
verificar_bundle "$C2" "$T/dos.bundle" "$RAMA" >/dev/null && mal "aceptó un bundle con dos commits" || bien "bundle con dos commits → rechazado"
git -C "$V" reset -q --soft HEAD~1   # la rama del clon de prueba vuelve a UN commit
git -C "$V" bundle create -q "$T/uno.bundle" "$BASE_RAMA..$RAMA"
verificar_bundle "$C2" "$T/uno.bundle" "otra/rama" >/dev/null && mal "aceptó una rama distinta" || bien "rama distinta → rechazado"
[ -n "$(verificar_bundle "$C2" "$T/uno.bundle" "$RAMA")" ] && bien "un commit hijo de la HEAD → aceptado" || mal "rechazó un bundle de un commit"
git -C "$C2" -c user.name=x -c user.email=x@x commit -q --allow-empty -m "dcam avanzó"
verificar_bundle "$C2" "$T/uno.bundle" "$RAMA" >/dev/null && mal "aceptó un padre que no es la HEAD" || bien "padre distinto de la HEAD → rechazado"
git -C "$V" branch -q otra
git -C "$V" bundle create -q "$T/dos-refs.bundle" "^$BASE_RAMA" "$RAMA" otra
verificar_bundle "$V" "$T/dos-refs.bundle" "$RAMA" "$BASE_RAMA" >/dev/null && mal "aceptó un bundle con dos refs" || bien "bundle con dos refs → rechazado"
ln -s "$T/uno.bundle" "$T/enlace.bundle"
verificar_bundle "$V" "$T/enlace.bundle" "$RAMA" "$BASE_RAMA" >/dev/null && mal "aceptó un bundle-enlace" || bien "bundle-enlace → rechazado"
[ -n "$(verificar_bundle "$V" "$T/uno.bundle" "$RAMA" "$BASE_RAMA")" ] && bien "un commit sobre BASE explícita → aceptado" || mal "rechazó un bundle bueno con BASE explícita"

echo
echo "resultado: $OK ok, $MAL mal"
[ "$MAL" -eq 0 ]
