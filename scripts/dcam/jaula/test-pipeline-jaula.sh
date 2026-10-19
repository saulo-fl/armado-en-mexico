#!/usr/bin/env bash
# Armado en México — Copyright (C) 2026 Saulo Flores León
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# Juez de la Fase 4, Task 2: el pipeline PIDE la jaula y espera; ya no corre Docker.
# Corre el bloque REAL de conciliar-pipeline.sh desde la compuerta de
# DCAM_SOLUCIONADOR hasta el final (con falla, avisar_error y cerrar_exito reales)
# sobre un clon de verdad cuyo origin es un «GitHub» bare local. gh y Telegram son
# de mentira; `docker` de mentira en el PATH solo anota si alguien lo llama. Un
# lanzador simulado toma la solicitud, comprueba el contrato de lanzar-jaula.sh
# (ID, lista blanca, solicitud.json, base == punta en GitHub, carpeta g+w) y deja
# resultado/<ID>/ con un bundle y `hecho`.
#
#   bash test-pipeline-jaula.sh          (PIPE=<ruta> prueba otra copia: mordidas)
#
# Todo en un mktemp -d. Requiere git, jq y stat GNU (APOLO).
set -uo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIPE="${PIPE:-$AQUI/../conciliar-pipeline.sh}"
T="$(mktemp -d)"; trap 'kill $(jobs -p) 2>/dev/null; rm -rf "$T"' EXIT
OK=0; MAL=0
bien(){ echo "  ok   $*"; OK=$((OK+1)); }
mal(){ echo "  MAL  $*"; MAL=$((MAL+1)); }

tr -d '\r' < "$PIPE" > "$T/pipe.sh"
sed -n '/^if \[ "\${DCAM_SOLUCIONADOR:-}" != "jaula" \]; then$/,$p' "$T/pipe.sh" > "$T/cola.sh"
sed -n '/^cerrar_exito() {/,/^}/p' "$T/pipe.sh" > "$T/cerrar.sh"
sed -n '/^avisar_error(){/,/^}/p; /^falla(){/,/^}/p' "$T/pipe.sh" > "$T/falla.sh"
[ -s "$T/cola.sh" ] && [ -s "$T/cerrar.sh" ] && [ "$(grep -c '^}' "$T/falla.sh")" = 2 ] \
  || { echo "no pude extraer el bloque de la jaula del pipeline"; exit 1; }

RAMA="auto/inventario-16-OCT-2026"
# Árbol de main fijado: solo hace falta verificar-bundle.sh, el de verdad.
mkdir -p "$T/main/scripts/dcam/jaula" "$T/bin"
cp "$AQUI/verificar-bundle.sh" "$T/main/scripts/dcam/jaula/"
printf '#!/usr/bin/env bash\necho "docker $*" >> "$DOCKER_LOG"\n' > "$T/bin/docker"; chmod +x "$T/bin/docker"
export PATH="$T/bin:$PATH" DOCKER_LOG="$T/docker.log"
: > "$DOCKER_LOG"

# Fuente: main y la rama del pipeline con un commit encima.
F="$T/fuente"
g(){ git -C "$F" -c user.name='Saulo Prueba' -c user.email=prueba@example.invalid "$@"; }
git init -q -b main "$F"; echo leeme > "$F/README"; g add -A; g commit -qm c1
g switch -qc "$RAMA"; echo mecanico > "$F/dato.txt"; g add -A; g commit -qm mecanico

# Lanzador simulado. $1 IPC, $2 GitHub bare, $3 modo, $4 carpeta de notas.
cat > "$T/lanzador.sh" <<'EOF'
IPC="$1" GH="$2" MODO="$3" N="$4" S=""
for _ in $(seq 1 300); do
  for e in "$IPC"/solicitud/*; do
    case "${e##*/}" in .tmp-*|'*') ;; *) S="$e"; break 2 ;; esac
  done
  sleep 0.1
done
[ -n "$S" ] || exit 0
ID="${S##*/}"; echo "$ID" > "$N/id"
nota(){ echo "$*" >> "$N/contrato"; }
[[ "$ID" =~ ^[0-9]{8}T[0-9]{6}-[0-9a-f]{8}$ ]] || nota "MAL id $ID"
[ "$(( 0$(stat -c %a "$S") & 020 ))" -ne 0 ] || nota "MAL carpeta sin g+w"
mv -T "$S" "$N/tomada"
for f in "$N/tomada"/* "$N/tomada"/.[!.]*; do
  [ -e "$f" ] || continue
  [[ "${f##*/}" =~ ^((armas|cartuchos|accesorios)\.(json|tsv)|mapeo-(armas|cartuchos|accesorios)\.json|motivo\.txt|solicitud\.json)$ ]] \
    || nota "MAL archivo fuera de la lista: ${f##*/}"
  [ -f "$f" ] && [ ! -L "$f" ] || nota "MAL no regular: ${f##*/}"
done
SJ="$N/tomada/solicitud.json"
jq -s -e 'length == 1 and (.[0] | type == "object" and (keys == ["base", "fecha_dcam", "fecha_iso", "rama"]) and all(.[]; type == "string"))' \
  "$SJ" >/dev/null 2>&1 || nota "MAL forma de solicitud.json"
BASE="$(jq -r .base "$SJ")" RAMA="$(jq -r .rama "$SJ")"
[ "$(jq -r .fecha_iso "$SJ")" = 2026-10-16 ] && [ "$RAMA" = "auto/inventario-$(jq -r .fecha_dcam "$SJ")" ] || nota "MAL fecha/rama"
[ "$(git --git-dir="$GH" rev-parse "refs/heads/$RAMA")" = "$BASE" ] || nota "MAL base no es la punta en GitHub"
echo "$BASE" > "$N/base"
R="$IPC/resultado/$ID"; mkdir "$R"
case "$MODO" in
  timeout) exit 0 ;;
  rc*) echo "${MODO#rc}" > "$R/rc"; : > "$R/hecho"; exit 0 ;;
esac
C="$N/clon"; git clone -q --branch "$RAMA" "file://$GH" "$C"
for i in $(seq 1 "$([ "$MODO" = dos ] && echo 2 || echo 1)"); do
  echo "$i" > "$C/solucion-$i.txt"
  git -C "$C" add -A && git -C "$C" -c user.name=j -c user.email=j@x commit -qm "jaula $i"
done
git -C "$C" rev-parse HEAD > "$N/tip"
git -C "$C" bundle create -q "$R/rama.bundle" "$BASE..refs/heads/$RAMA"
if [ "$MODO" = borrador ]; then
  echo '{"ok":false,"ligas":[1],"altas":[],"pendiente":[1,2]}' > "$R/solucion.json"
else
  echo '{"ok":true,"ligas":[1],"altas":[1,2],"pendiente":[]}' > "$R/solucion.json"
fi
[ "$MODO" != aviso ] || printf 'main fijado abc difiere; visita https://malo.example\n' > "$R/aviso"
echo 0 > "$R/rc"; : > "$R/hecho"
EOF

# $1 nombre, $2 modo del lanzador (ninguno = no se lanza); resto: VAR=valor para la cola.
caso(){
  local d="$T/c/$1" modo="$2"; shift 2
  mkdir -p "$d/w" "$d/ipc/solicitud" "$d/ipc/resultado" "$d/n"
  git clone -q --bare "$F" "$d/gh.git"
  git clone -q --branch "$RAMA" "file://$d/gh.git" "$d/repo"
  git -C "$d/repo" config user.name 'Saulo Prueba'; git -C "$d/repo" config user.email prueba@example.invalid
  echo 'a medias' > "$d/repo/mecanico.txt"   # estado sin commitear del paso que falló
  echo '[]' > "$d/w/armas.json"; printf 'a\tb\n' > "$d/w/armas.tsv"
  echo '{"totalMapped":0}' > "$d/w/mapeo-armas.json"; echo '{}' > "$d/w/cierre.json"
  : > "$d/senal"
  git -C "$d/repo" rev-parse HEAD > "$d/antes"
  cat > "$d/run.sh" <<EOF
umask 022   # la carpeta g+w tiene que ponerla el pipeline, no el umask de quien lo corre
cd "$d/repo" || exit 9
REPO="$d/repo" WORKDIR="$d/w" FECHA="16-OCT-2026" FECHA_ISO="2026-10-16" RAMA="$RAMA"
GH_REPO="o/r" SENAL="$d/senal" LOG="$d/log" STEP="3-altas" MOTIVO="2 renglones sin ficha ni liga" PR_URL=""
export DCAM_IPC="$d/ipc" DCAM_MAIN="$T/main"
if [ -n "\${SIN_JAULA:-}" ]; then unset DCAM_SOLUCIONADOR; else export DCAM_SOLUCIONADOR=jaula; fi
[ -z "\${ROMPER_ORIGIN:-}" ] || git remote set-url origin "file://$T/no-existe.git"
log(){ echo "\$*" >> "$d/log"; }
telegram(){ echo "\$*" >> "$d/tg"; }
gh(){ echo "gh \$*" >> "$d/calls"; [ "\$2" = list ] && echo https://pr/1; return 0; }
source "$T/falla.sh"; source "$T/cerrar.sh"; source "$T/cola.sh"
EOF
  [ -z "$modo" ] || { bash "$T/lanzador.sh" "$d/ipc" "$d/gh.git" "$modo" "$d/n" & }
  local s0=$SECONDS
  env "$@" timeout 60 bash "$d/run.sh" >/dev/null 2>>"$d/err"; echo $? > "$d/rc"
  echo $((SECONDS - s0)) > "$d/seg"
  wait 2>/dev/null
}
rc(){ cat "$T/c/$1/rc"; }
tg(){ cat "$T/c/$1/tg" 2>/dev/null; }
punta(){ git --git-dir="$T/c/$1/gh.git" rev-parse "refs/heads/$RAMA"; }
contrato_ok(){ [ -s "$T/c/$1/n/id" ] && [ ! -e "$T/c/$1/n/contrato" ]; }

echo "— bundle bueno: fast-forward, push, PR listo"
caso ff ok
contrato_ok ff && bien "solicitud: ID, lista blanca (sin cierre.json), forma, base == punta en GitHub, carpeta g+w" \
  || mal "contrato: $(cat "$T/c/ff/n/contrato" 2>/dev/null || echo 'no hubo solicitud')"
[ "$(git -C "$T/c/ff/repo" log -1 --format=%s "$(cat "$T/c/ff/n/base" 2>/dev/null)" 2>/dev/null)" = "pipeline: estado al fallar el paso 3-altas 16-OCT-2026" ] \
  && bien "base = el estado del paso que falló, commiteado y empujado antes de pedir" || mal "base no es el commit del estado"
[ "$(rc ff)" = 0 ] && bien "rc=0" || mal "rc=$(rc ff) log: $(tail -2 "$T/c/ff/log" 2>/dev/null)"
[ "$(git -C "$T/c/ff/repo" rev-parse HEAD)" = "$(cat "$T/c/ff/n/tip" 2>/dev/null)" ] && [ "$(punta ff)" = "$(cat "$T/c/ff/n/tip" 2>/dev/null)" ] \
  && bien "merge --ff-only al commit de la jaula y push a GitHub" || mal "HEAD/punta no son el commit de la jaula"
grep -q 'gh pr ready' "$T/c/ff/calls" 2>/dev/null && bien "gh pr ready" || mal "no marcó el PR listo"
tg ff | grep -qxF '🔧 Solucionador (jaula) resolvió 16-OCT-2026: Ligas: 1 · Altas: 2 · Pendientes: 0. Revisa la rama auto/inventario-16-OCT-2026.' \
  && bien "Telegram solo con contadores" || mal "tg: $(tg ff)"
[ -f "$T/c/ff/w/salida/solucion.json" ] && [ ! -e "$T/c/ff/senal" ] && bien "solucion.json del resultado en \$WORKDIR/salida; señal borrada" \
  || mal "sin \$WORKDIR/salida/solucion.json o señal sin borrar"
[ -z "$(ls -A "$T/c/ff/ipc/solicitud")" ] && bien "solicitud/ queda vacía (ni .tmp-)" || mal "solicitud/: $(ls -A "$T/c/ff/ipc/solicitud")"

echo "— bundle de dos commits"
caso dos dos
[ "$(rc dos)" = 1 ] && grep -qF 'FALLO paso 3-altas: solucionador (jaula): bundle inválido' "$T/c/dos/log" \
  && bien "falla «bundle inválido»" || mal "dos commits: rc=$(rc dos) log: $(tail -1 "$T/c/dos/log" 2>/dev/null)"
[ "$(git -C "$T/c/dos/repo" rev-parse HEAD)" = "$(cat "$T/c/dos/n/base")" ] && [ "$(punta dos)" = "$(cat "$T/c/dos/n/base")" ] \
  && bien "ni la HEAD ni GitHub pasan de base" || mal "dos commits: la rama avanzó"
! grep -q 'gh pr ready' "$T/c/dos/calls" 2>/dev/null && [ -e "$T/c/dos/senal.fallida" ] && bien "sin PR listo; señal → .fallida" || mal "dos commits: PR listo o señal"

echo "— la jaula no contesta"
caso tarde timeout DCAM_ESPERA_JAULA=3
[ "$(rc tarde)" = 1 ] && grep -qF 'FALLO paso 3-altas: solucionador (jaula): la jaula no contestó en 3 s; detalle: journalctl -u dcam-jaula' "$T/c/tarde/log" \
  && [ "$(cat "$T/c/tarde/seg")" -lt 20 ] && bien "timeout → falla con texto fijo ($(cat "$T/c/tarde/seg")s)" \
  || mal "timeout: rc=$(rc tarde) en $(cat "$T/c/tarde/seg")s log: $(tail -1 "$T/c/tarde/log" 2>/dev/null)"

echo "— aviso del main fijado"
caso aviso aviso
[ "$(rc aviso)" = 0 ] && tg aviso | grep -qxF '⚠️ Jaula DCAM: el main fijado difiere del main de GitHub en las rutas de la jaula. Revisa qué cambió en main antes de actualizarlo.' \
  && bien "aviso → Telegram con texto fijo del host, y la corrida sigue" || mal "aviso: rc=$(rc aviso) tg: $(tg aviso)"
! tg aviso | grep -q 'malo.example' && bien "el texto del aviso no llega a Telegram" || mal "se reenvió el texto del aviso"
[ "$(tg ff | grep -c 'Jaula DCAM')" = 0 ] && bien "sin aviso → sin ese Telegram" || mal "aviso sin archivo aviso"

echo "— la jaula termina sin bundle"
caso r3 rc3
[ "$(rc r3)" = 1 ] && grep -qF 'FALLO paso 3-altas: solucionador (jaula): la jaula no produjo cambios' "$T/c/r3/log" \
  && bien "rc 3 → «la jaula no produjo cambios»" || mal "rc 3: $(tail -1 "$T/c/r3/log" 2>/dev/null)"
caso r5 rc5
[ "$(rc r5)" = 1 ] && grep -qF 'FALLO paso 3-altas: solucionador (jaula): no pasó validación/compuertas (rc=5); detalle: journalctl -u dcam-jaula' "$T/c/r5/log" \
  && bien "rc 5 → texto fijo + journalctl" || mal "rc 5: $(tail -1 "$T/c/r5/log" 2>/dev/null)"
caso rx 'rc;rm -rf ~'
[ "$(rc rx)" = 1 ] && grep -qF 'FALLO paso 3-altas: solucionador (jaula): la jaula terminó con un rc desconocido; detalle: journalctl -u dcam-jaula' "$T/c/rx/log" \
  && ! grep -q 'rm -rf' "$T/c/rx/log" && bien "rc ilegible → texto fijo, sin eco del archivo" || mal "rc ilegible: $(tail -1 "$T/c/rx/log" 2>/dev/null)"

echo "— solucion.json con ok:false"
caso borr borrador
[ "$(rc borr)" = 0 ] && ! grep -q 'gh pr ready' "$T/c/borr/calls" 2>/dev/null \
  && tg borr | grep -qF "revisa los pendientes en $T/c/borr/w/salida/solucion.json (APOLO)" && [ -f "$T/c/borr/w/salida/solucion.json" ] \
  && bien "borrador: sin ready, y la ruta del aviso existe" || mal "borrador: rc=$(rc borr) tg: $(tg borr)"

echo "— el push falla: no se pide nada"
caso sinpush '' ROMPER_ORIGIN=1
[ "$(rc sinpush)" = 1 ] && grep -qF 'FALLO paso 3-altas: solucionador (jaula): el push de la rama falló; no se pide la jaula' "$T/c/sinpush/log" \
  && [ -z "$(ls -A "$T/c/sinpush/ipc/solicitud")" ] && bien "push fallido → falla y ninguna solicitud" \
  || mal "push fallido: rc=$(rc sinpush) log: $(tail -1 "$T/c/sinpush/log" 2>/dev/null)"

echo "— DCAM_SOLUCIONADOR sin definir (camino de hoy)"
caso apagado '' SIN_JAULA=1
[ "$(rc apagado)" = 1 ] && grep -qF 'FALLO paso 3-altas: paso 3-altas: 2 renglones sin ficha ni liga. Solucionador apagado: revisa la rama auto/inventario-16-OCT-2026 a mano.' "$T/c/apagado/log" \
  && [ -z "$(ls -A "$T/c/apagado/ipc/solicitud")" ] && [ "$(git -C "$T/c/apagado/repo" rev-parse HEAD)" = "$(cat "$T/c/apagado/antes")" ] \
  && bien "falla de siempre, sin solicitud ni commit" || mal "apagado: rc=$(rc apagado) log: $(tail -1 "$T/c/apagado/log" 2>/dev/null)"

echo "— el pipeline no toca Docker"
[ ! -s "$DOCKER_LOG" ] && bien "docker no se llamó en ningún caso" || mal "docker: $(head -3 "$DOCKER_LOG")"
! grep -v '^[[:space:]]*#' "$T/pipe.sh" | grep -qiE 'docker|solucionar\.sh|compuertas\.sh' \
  && bien "fuera de comentarios, el pipeline no nombra docker/solucionar.sh/compuertas.sh" || mal "el pipeline aún nombra docker o la jaula"

echo "— DCAM_WORKDIR_BASE"
sed -n '/^WB=/,/^WORKDIR=/p' "$T/pipe.sh" > "$T/wb.sh"
wb(){ env "$@" bash -c "FECHA=F; . '$T/wb.sh'; echo \"\$WORKDIR\""; }
[ "$(wb DCAM_WORKDIR_BASE="$T/x")" = "$T/x/dcam-pipeline-F" ] && bien "DCAM_WORKDIR_BASE explícito se respeta" || mal "explícito: $(wb DCAM_WORKDIR_BASE="$T/x")"
if [ -d /srv/dcam/trabajo ]; then
  [ "$(wb -u DCAM_WORKDIR_BASE)" = /srv/dcam/trabajo/dcam-pipeline-F ] && bien "sin variable → /srv/dcam/trabajo" || mal "por defecto: $(wb -u DCAM_WORKDIR_BASE)"
else
  [ "$(wb -u DCAM_WORKDIR_BASE)" = /tmp/dcam-pipeline-F ] && bien "sin variable y sin /srv/dcam/trabajo → /tmp" || mal "respaldo: $(wb -u DCAM_WORKDIR_BASE)"
fi

echo
echo "resultado: $OK ok, $MAL mal"
[ "$MAL" -eq 0 ]
