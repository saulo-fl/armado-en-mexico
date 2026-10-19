#!/usr/bin/env bash
# Armado en México — Copyright (C) 2026 Saulo Flores León
# SPDX-License-Identifier: AGPL-3.0-or-later
# Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
# (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.
#
# Pipeline conciliador DCAM — pasos independientes con commits intermedios.
# Reemplaza la invocación monolítica del agente: ahora solo se invoca para
# altas (sinFicha), que es la única parte que requiere criterio humano/agente.
#
# Pasos:
#   0. PREP   — parsea PDFs, copia a public/inventarios/, commit
#   1. MAPEO  — mapea existencias con price chain, verifica factores, commit
#   2. MECÁNICO — aplica precios/historial/existencias a data-*.js, commit
#   3. ALTAS  — si quedan renglones sin ficha (ni liga), pasa al solucionador
#   4. CIERRE — compuertas (auditar.js, npm test, verificar-cierre.py),
#               actualiza referencias, marca el PR listo
#
# Si falla cualquier paso del 1 al 4 y DCAM_SOLUCIONADOR no vale «jaula» (lo
# normal), se avisa y la rama queda para revisión a mano. Con
# DCAM_SOLUCIONADOR=jaula el pipeline PIDE una vez el SOLUCIONADOR (agente
# `solucionador-dcam`) y espera: deja una solicitud (solo datos) en
# $DCAM_IPC/solicitud/<ID>/ y espera $DCAM_IPC/resultado/<ID>/hecho. La jaula la
# corre otro usuario (dcam-jaula, scripts/dcam/jaula/lanzar-jaula.sh, código de
# root); este script no toca contenedores. Lo que vuelve es un bundle con UN
# commit hijo de la rama empujada, que solo entra si lo acepta verificar_bundle
# y aplica con merge --ff-only; lo que dice el agente no cuenta, cuentan las
# compuertas. Mergear y resembrar D1 siguen siendo de Saulo (el guardia del
# repo lo impone).
#
# Cada paso commitea y pushea: si algo falla, lo anterior ya está en el PR.
set -uo pipefail

export DCAM_DIR="${DCAM_DIR:-/home/saulo/apps/dcam-bot}"
REPO="$DCAM_DIR/repo"
SENAL="$DCAM_DIR/pendiente-conciliar.json"
LOCK="$DCAM_DIR/conciliar.lock"
LOG="$DCAM_DIR/conciliar.log"
TG_ENV="${DCAM_TG_ENV:-$DCAM_DIR/telegram.env}"
VENV="$DCAM_DIR/.venv/bin/python"
SCRIPTS=".claude/skills/conciliar-inventario/scripts"
MOTIVO=""
PR_URL=""

log(){ printf '%s %s\n' "$(date -Is)" "$*" >>"$LOG"; }

telegram(){
  [ -f "$TG_ENV" ] || { log "sin telegram.env, no aviso"; return; }
  # shellcheck disable=SC1090
  . "$TG_ENV"
  [ -n "${TG_TOKEN:-}" ] && [ -n "${TG_CHAT_ID:-}" ] || { log "telegram.env incompleto"; return; }
  curl -s -m 20 "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TG_CHAT_ID}" \
    --data-urlencode "text=$1" \
    >>"$LOG" 2>&1
}

avisar_error(){
  telegram "⚠️ Pipeline DCAM falló en paso $STEP: ${1}. Inventario NO conciliado — revisar conciliar.log."
}

# La señal fallida se aparta para no re-disparar
# en bucle; Saulo la re-crea tras arreglar.
falla(){
  avisar_error "$1"
  [ -f "$SENAL" ] && mv "$SENAL" "$SENAL.fallida"
  log "FALLO paso $STEP: $1 (señal -> pendiente-conciliar.json.fallida)"
  exit 1
}

# ── Lock ──
exec 9>"$LOCK"
if ! flock -n 9; then log "otro pipeline en curso, salgo"; exit 0; fi

# ── Leer señal ──
[ -f "$SENAL" ] || { log "sin senal, nada que hacer"; exit 0; }
FECHA="$(jq -r '.fecha' "$SENAL" 2>/dev/null)"
[ -n "$FECHA" ] && [ "$FECHA" != "null" ] || { STEP="senal"; falla "señal ilegible"; }
PDFS="$(jq -r '.pdfs[]' "$SENAL" 2>/dev/null)"
# La señal trae «01-OCT-2026»; aplicar-mecanico.py espera «2026-10-01».
# Si ya viene en ISO, se respeta tal cual.
fecha_a_iso() {
  local f="$1" d m y n
  if [[ "$f" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then echo "$f"; return 0; fi
  IFS='-' read -r d m y <<<"$f"
  case "${m^^}" in
    ENE|JAN) n=01;; FEB) n=02;; MAR) n=03;; ABR|APR) n=04;; MAY) n=05;; JUN) n=06;;
    JUL) n=07;; AGO|AUG) n=08;; SEP|SET) n=09;; OCT) n=10;; NOV) n=11;; DIC|DEC) n=12;;
    *) return 1;;
  esac
  [[ "$d" =~ ^[0-9]{1,2}$ && "$y" =~ ^[0-9]{4}$ ]] || return 1
  printf '%s-%s-%02d\n' "$y" "$n" "$((10#$d))"
}
FECHA_ISO="$(fecha_a_iso "$FECHA")" || { STEP="senal"; falla "fecha ilegible en la señal: $FECHA"; }
RAMA="auto/inventario-${FECHA}"
# Fuera de /tmp (/srv/dcam/trabajo) para que, con PrivateTmp, la ruta que da el
# aviso de borrador siga existiendo; /tmp si esa carpeta no está (antes de la Fase 4).
WB="${DCAM_WORKDIR_BASE:-/srv/dcam/trabajo}"
[ -n "${DCAM_WORKDIR_BASE:-}" ] || [ -d "$WB" ] || WB=/tmp
WORKDIR="$WB/dcam-pipeline-${FECHA}"
STEP="init"

mkdir -p "$WORKDIR"
log "arranco pipeline fecha=$FECHA rama=$RAMA"

cd "$REPO" || falla "no cd al repo"
git fetch origin --quiet 2>>"$LOG"

# slug owner/repo
GH_REPO="$(git remote get-url origin 2>/dev/null \
           | sed -E 's#(git@|https://)github\.com[:/]##; s#\.git$##')"

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 0: PREP — Parse PDFs + copy
# ═══════════════════════════════════════════════════════════════════════════════
step_prep() {
  STEP="0-prep"
  log "paso 0: prep"

  git checkout -B "$RAMA" origin/main --quiet 2>>"$LOG"

  # Parse each PDF
  for pdf in $PDFS; do
    base="$(basename "$pdf" .pdf)"
    # Detect type from filename
    if echo "$base" | grep -qi "ARMAS"; then
      tag="armas"
    elif echo "$base" | grep -qi "CARTUCHO\|MUNICION"; then
      tag="cartuchos"
    elif echo "$base" | grep -qi "ACCESORIO"; then
      tag="accesorios"
    else
      tag="$(echo "$base" | tr '[:upper:]' '[:lower:]')"
    fi

    $VENV "$SCRIPTS/parse_pdf.py" "$pdf" \
      --tsv "$WORKDIR/${tag}.tsv" \
      --json "$WORKDIR/${tag}.json" 2>>"$LOG" \
      || { log "  parse_pdf falló en $tag"; return 1; }
    log "  parseado $tag: $(wc -l < "$WORKDIR/${tag}.tsv") líneas TSV"

    # Copy PDF to public/inventarios/ — nombre en ISO: es el que enlazan los data-*.js
    target="public/inventarios/dcam-existencias-${FECHA_ISO}.pdf"
    if [ "$tag" = "cartuchos" ]; then
      target="public/inventarios/dcam-municiones-${FECHA_ISO}.pdf"
    elif [ "$tag" = "accesorios" ]; then
      target="public/inventarios/dcam-accesorios-${FECHA_ISO}.pdf"
    fi
    cp "$pdf" "$target"
  done

  git add -A
  git commit -m "prep: PDFs parseados $FECHA" --quiet 2>>"$LOG"
  git push origin "$RAMA" --force --quiet 2>>"$LOG"

  # Create draft PR
  if ! gh pr list --repo "$GH_REPO" --head "$RAMA" --state open --json url --jq '.[].url' 2>/dev/null | grep -q .; then
    gh pr create --draft --base main \
      --title "inventario(dcam): $FECHA" \
      --body "Pipeline en curso… pasos completados: prep" \
      --repo "$GH_REPO" 2>>"$LOG" || true
  fi

  log "paso 0 OK"
}

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 1: MAPEO — Price chain matching
# ═══════════════════════════════════════════════════════════════════════════════
step_mapeo() {
  STEP="1-mapeo"
  log "paso 1: mapeo"

  # Armas
  if [ -f "$WORKDIR/armas.json" ]; then
    # --catalogo: precio por variante representativa (nombre de la ficha) y
    # guardia de saltos que no encadenan (van a revisarPrecio, no se publican).
    $VENV "$SCRIPTS/mapear-existencias.py" "$WORKDIR/armas.json" --verbose \
      --catalogo src/data --antes-de "$FECHA_ISO" --ligas "$SCRIPTS/ligas-armas.json" \
      --regresos src/data > "$WORKDIR/mapeo-armas.json" 2>>"$LOG" \
      || { log "  mapeo armas falló"; return 1; }
    log "  mapeo armas: $(jq '.totalMapped' "$WORKDIR/mapeo-armas.json") mapeados, $(jq '.revisarPrecio | length' "$WORKDIR/mapeo-armas.json") precios a revisar"
  fi

  # Cartuchos
  if [ -f "$WORKDIR/cartuchos.json" ]; then
    $VENV "$SCRIPTS/mapear-existencias.py" "$WORKDIR/cartuchos.json" \
      --ref "$SCRIPTS/referencia-cartuchos.json" --ligas "$SCRIPTS/ligas-cartuchos.json" --verbose \
      --regresos src/data --antes-de "$FECHA_ISO" > "$WORKDIR/mapeo-cartuchos.json" 2>>"$LOG" \
      || { log "  mapeo cartuchos falló"; return 1; }
    log "  mapeo cartuchos: $(jq '.totalMapped' "$WORKDIR/mapeo-cartuchos.json") mapeados"
  fi

  # Accesorios
  if [ -f "$WORKDIR/accesorios.json" ]; then
    $VENV "$SCRIPTS/mapear-existencias.py" "$WORKDIR/accesorios.json" \
      --ref "$SCRIPTS/referencia-accesorios.json" --ligas "$SCRIPTS/ligas-accesorios.json" --verbose \
      --regresos src/data --antes-de "$FECHA_ISO" > "$WORKDIR/mapeo-accesorios.json" 2>>"$LOG" \
      || { log "  mapeo accesorios falló"; return 1; }
    log "  mapeo accesorios: $(jq '.totalMapped' "$WORKDIR/mapeo-accesorios.json") mapeados"
  fi

  # Factores fuera de [0.90, 1.10] = emparejamiento equivocado: el paso 2
  # publicaría precios ajenos (02-oct-2026). Antes solo se avisaba en el log.
  local fuera=""
  for f in "$WORKDIR"/mapeo-*.json; do
    [ -f "$f" ] || continue
    FACTORS="$(jq -r '.factores[]' "$f" 2>/dev/null)"
    for fv in $FACTORS; do
      if ! python3 -c "f=$fv; exit(0 if 0.90 <= f <= 1.10 else 1)" 2>/dev/null; then
        log "  ⚠ factor fuera de rango en $(basename "$f"): $fv"
        fuera="$fuera $(basename "$f" .json | sed 's/mapeo-//')=$fv"
      fi
    done
  done
  if [ -n "$fuera" ]; then
    MOTIVO="factor fuera de rango:$fuera"
    return 1
  fi

  # Copy mapeos to repo for reference
  cp "$WORKDIR"/mapeo-*.json . 2>/dev/null || true

  git add -A
  git commit -m "mapeo: factores verificados $FECHA" --quiet 2>>"$LOG"
  git push origin "$RAMA" --quiet 2>>"$LOG"

  log "paso 1 OK"
}

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2: MECHANICAL — Apply prices, history, existencias
# ═══════════════════════════════════════════════════════════════════════════════
step_mecanico() {
  STEP="2-mecanico"
  log "paso 2: mecánico"

  MECANICO_ARGS=""

  if [ -f "$WORKDIR/mapeo-armas.json" ]; then
    MECANICO_ARGS="$MECANICO_ARGS --armas $WORKDIR/mapeo-armas.json"
  fi

  if [ -f "$WORKDIR/mapeo-cartuchos.json" ]; then
    MECANICO_ARGS="$MECANICO_ARGS --cartuchos $WORKDIR/mapeo-cartuchos.json"
  fi

  if [ -f "$WORKDIR/mapeo-accesorios.json" ]; then
    MECANICO_ARGS="$MECANICO_ARGS --accesorios $WORKDIR/mapeo-accesorios.json"
  fi

  # shellcheck disable=SC2086
  $VENV "$SCRIPTS/aplicar-mecanico.py" \
    $MECANICO_ARGS \
    --fecha "$FECHA_ISO" \
    --data-dir src/data/ 2>>"$LOG" \
    || { log "  aplicar-mecanico.py falló (ver traza arriba)"; return 1; }

  git add -A
  git commit -m "mecánico: precios + existencias $FECHA" --quiet 2>>"$LOG"
  git push origin "$RAMA" --quiet 2>>"$LOG"

  log "paso 2 OK"
}

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 3: ALTAS — Agent-driven, only if sinFicha is non-empty
# ═══════════════════════════════════════════════════════════════════════════════
step_altas() {
  STEP="3-altas"
  log "paso 3: altas"

  # Count total sinFicha
  TOTAL_SF=0
  for f in "$WORKDIR"/mapeo-*.json; do
    [ -f "$f" ] || continue
    SF="$(jq '.sinFicha | length' "$f" 2>/dev/null || echo 0)"
    TOTAL_SF=$((TOTAL_SF + SF))
  done

  if [ "$TOTAL_SF" -eq 0 ]; then
    log "  sin altas nuevas, salto paso 3"
    return 0
  fi

  # Triage, ligas y altas necesitan criterio: es trabajo del solucionador.
  MOTIVO="$TOTAL_SF renglones sin ficha ni liga"
  log "  $MOTIVO — paso al solucionador"
  return 1
}

# ═══════════════════════════════════════════════════════════════════════════════
# CIERRE DE ÉXITO — común a los dos caminos: el cierre normal (step_audit, tras
# auditar.js/npm test/verificar-cierre.py en el host) y el de la jaula (tras
# compuertas.sh, que ya corrió las mismas compuertas dentro del contenedor). Ronda
# de arreglo 1/5 (C1): antes el camino de la jaula solo hacía push+aviso+borrar
# señal, sin esta cola — ni actualizaba referencia-*.json, ni corría `gh pr ready`.
# Esta función NUNCA vuelve a correr auditar.js/npm test: eso ya pasó (en el host
# para el camino normal, dentro del contenedor para el de la jaula).
# Revisión final (I1): con `cerrar_exito jaula` NO corre aquí el `--update-ref`.
# Ese paso evalúa con `node` los data-*.js, y en el camino de la jaula esos datos
# los escribió el agente: nada suyo se ejecuta en el host. Las referencias ya las
# actualizó compuertas.sh en un contenedor sin red y las volvió a pasar por el
# validador de main; llegan aquí dentro de su commit.
# ═══════════════════════════════════════════════════════════════════════════════
cerrar_exito() {
  if [ "${1:-}" != "jaula" ]; then
    if [ -f "$WORKDIR/armas.json" ]; then
      $VENV "$SCRIPTS/mapear-existencias.py" "$WORKDIR/armas.json" \
        --ligas "$SCRIPTS/ligas-armas.json" --regresos src/data --antes-de "$FECHA_ISO" --update-ref >/dev/null 2>>"$LOG"
    fi
    if [ -f "$WORKDIR/cartuchos.json" ]; then
      $VENV "$SCRIPTS/mapear-existencias.py" "$WORKDIR/cartuchos.json" \
        --ref "$SCRIPTS/referencia-cartuchos.json" --ligas "$SCRIPTS/ligas-cartuchos.json" \
        --regresos src/data --antes-de "$FECHA_ISO" --update-ref >/dev/null 2>>"$LOG"
    fi
    if [ -f "$WORKDIR/accesorios.json" ]; then
      $VENV "$SCRIPTS/mapear-existencias.py" "$WORKDIR/accesorios.json" \
        --ref "$SCRIPTS/referencia-accesorios.json" --ligas "$SCRIPTS/ligas-accesorios.json" \
        --regresos src/data --antes-de "$FECHA_ISO" --update-ref >/dev/null 2>>"$LOG"
    fi
  fi

  git add -A
  git commit -m "audit: ✔✔ + refs actualizadas $FECHA" --quiet 2>>"$LOG" || true
  # Se revisa el código de salida (a diferencia de los pasos 0-2): aquí hay un
  # commit real — de datos resueltos por la jaula, o de referencias actualizadas
  # — que nadie más va a reintentar solo si el push se pierde en silencio.
  git push origin "$RAMA" --quiet 2>>"$LOG" || falla "cerrar_exito: el push de la rama falló"

  # Mark PR ready
  PR_URL="$(gh pr list --repo "$GH_REPO" --head "$RAMA" --state open --json url --jq '.[0].url' 2>/dev/null)"
  if [ -n "$PR_URL" ] && [ "${2:-}" = "borrador" ]; then
    log "  PR se queda en borrador (solucion.json sin ok:true): $PR_URL"
  elif [ -n "$PR_URL" ]; then
    gh pr ready "$PR_URL" --repo "$GH_REPO" 2>>"$LOG" || true
    log "  PR marcado ready: $PR_URL"
  fi

  rm -f "$SENAL"
}

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 4: AUDIT + CLOSE
# ═══════════════════════════════════════════════════════════════════════════════
step_audit() {
  STEP="4-audit"
  log "paso 4: auditoría"

  # Pull any changes from step 3
  git pull origin "$RAMA" --quiet 2>>"$LOG" || true

  AUDIT_OUT="$(node "$SCRIPTS/auditar.js" 2>&1)"
  AUDIT_RC=$?
  echo "$AUDIT_OUT" >>"$LOG"

  if [ $AUDIT_RC -ne 0 ]; then
    log "  auditoría FALLIDA"
    MOTIVO="auditar.js falló (código $AUDIT_RC)"
    return 1
  fi

  if ! echo "$AUDIT_OUT" | grep -q '✔✔ AUDITORÍA SIN HALLAZGOS'; then
    log "  auditoría con hallazgos"
    MOTIVO="auditar.js con hallazgos"
    return 1
  fi

  log "  auditoría ✔✔"

  TEST_OUT="$(npm test 2>&1)"
  if ! printf '%s' "$TEST_OUT" | grep -qE '^ℹ fail 0$'; then
    printf '%s\n' "$TEST_OUT" | tail -30 >>"$LOG"
    MOTIVO="npm test con fallos"
    log "  $MOTIVO"
    return 1
  fi
  log "  npm test ✔"

  # Mapeo limpio con referencia+ligas de la rama y sin saltos de precio sin explicar
  if ! $VENV "$SCRIPTS/verificar-cierre.py" --workdir "$WORKDIR" --fecha "$FECHA_ISO" \
        --solucion "$WORKDIR/solucion.json" > "$WORKDIR/cierre.json" 2>>"$LOG"; then
    MOTIVO="verificar-cierre: $(jq -r '.hallazgos | length' "$WORKDIR/cierre.json" 2>/dev/null) hallazgos ($(jq -r '.hallazgos[0] // ""' "$WORKDIR/cierre.json" 2>/dev/null | cut -c1-120))"
    log "  $MOTIVO"
    return 1
  fi
  log "  cierre verificado ✔"

  cerrar_exito
  log "paso 4 OK — pipeline completo"
}

# ═══════════════════════════════════════════════════════════════════════════════
# Run pipeline
# ═══════════════════════════════════════════════════════════════════════════════

step_prep || falla "prep falló"

if step_mapeo && step_mecanico && step_altas && step_audit; then
  log "pipeline completo $FECHA"
  telegram "✅ Inventario DCAM $FECHA conciliado. PR listo para revisar: $PR_URL"
  exit 0
fi

# Algún paso 1–4 falló. Con DCAM_SOLUCIONADOR=jaula se intenta resolver en la
# jaula aislada (sin red); en cualquier otro caso, el solucionador sigue
# apagado y la rama queda para revisión a mano (plan 2026-10-14).
if [ "${DCAM_SOLUCIONADOR:-}" != "jaula" ]; then
  falla "paso $STEP: ${MOTIVO:-falló}. Solucionador apagado: revisa la rama $RAMA a mano."
fi

log "paso $STEP falló (${MOTIVO:-sin motivo}) — intento solucionador (jaula)"

# Fase 3d: el agente habla con la API de Anthropic (suscripción de Saulo) por
# dcam-puente. Si la API falla, el agente falla, la jaula devuelve rc≠0 y la rama
# queda para revisión a mano.

# Ronda de arreglo 2/5 (minor "índice de $REPO"): si el paso que falló dejó
# $REPO con cambios sin commitear (p. ej. aplicar-mecanico.py escribió algo en
# src/data/ antes de reventar, sin llegar al `git commit` de step_mecanico),
# ese estado se commitea AQUÍ, de una vez, como hacía el `step_solucionador`
# antiguo — es trabajo del HOST, de confianza, antes de pedir la jaula. Así la
# rama que el lanzador baja de GitHub trae ese estado (si no se commiteara, se
# perdería silenciosamente), y el `git add -A` de `cerrar_exito` más abajo no
# recoge una mezcla con esto. Si el repo no queda limpio tras el intento, no se
# pide la jaula sobre un estado a medias.
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit --quiet -m "pipeline: estado al fallar el paso $STEP $FECHA" 2>>"$LOG" || true
fi
if [ -n "$(git status --porcelain)" ]; then
  falla "solucionador (jaula): el repo de trabajo no quedó limpio antes de lanzar la jaula"
fi

# Fase 4: el lanzador baja la rama de GitHub y exige que su punta sea `base`, así
# que antes se empuja. Si el push no sale, no se pide nada.
git push origin "$RAMA" --quiet 2>>"$LOG" || falla "solucionador (jaula): el push de la rama falló; no se pide la jaula"
BASE="$(git rev-parse HEAD)"

# ── Solicitud: solo DATOS (contrato en scripts/dcam/jaula/lanzar-jaula.sh). Se
# escribe en .tmp-<ID> y se publica con un mv. Carpeta g+w (umask 0002): el
# lanzador tiene que poder moverla. El motivo es dato para el agente, nunca
# instrucción; el prompt lo arma el lanzador.
IPC="${DCAM_IPC:-/srv/dcam-ipc}"
ID="$(date +%Y%m%dT%H%M%S)-$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')"
SOL_TMP="$IPC/solicitud/.tmp-$ID"
RES="$IPC/resultado/$ID"
if ! (
  umask 0002
  mkdir -- "$SOL_TMP" || exit 1
  jq -n --arg i "$FECHA_ISO" --arg r "$RAMA" --arg f "$FECHA" --arg b "$BASE" \
    '{fecha_iso: $i, rama: $r, fecha_dcam: $f, base: $b}' > "$SOL_TMP/solicitud.json" || exit 1
  printf '%s\n' "${MOTIVO:-paso $STEP falló sin motivo}" > "$SOL_TMP/motivo.txt" || exit 1
  for n in armas cartuchos accesorios; do
    for f in "$n.json" "$n.tsv" "mapeo-$n.json"; do
      [ ! -f "$WORKDIR/$f" ] || cp -- "$WORKDIR/$f" "$SOL_TMP/$f" || exit 1
    done
  done
  mv -T -- "$SOL_TMP" "$IPC/solicitud/$ID"
) 2>>"$LOG"; then
  rm -rf -- "$SOL_TMP"
  falla "solucionador (jaula): no pude publicar la solicitud"
fi
log "solicitud $ID publicada (base $BASE); espero $RES/hecho"

# Tope de la espera: mayor que el TimeoutStartSec del lanzador (2 h) más los
# 120 s que espera una .tmp- más margen. El lanzador SIEMPRE deja `hecho` (salvo SIGKILL).
ESPERA="${DCAM_ESPERA_JAULA:-8400}"
[[ "$ESPERA" =~ ^[0-9]+$ ]] || ESPERA=8400
FIN=$((SECONDS + ESPERA))
until [ -e "$RES/hecho" ]; do
  [ "$SECONDS" -lt "$FIN" ] || falla "solucionador (jaula): la jaula no contestó en $ESPERA s; detalle: journalctl -u dcam-jaula"
  sleep 2
done

# Recordatorio del lanzador: el main fijado se quedó atrás. Texto FIJO del host;
# lo que diga el archivo no se reenvía.
[ ! -e "$RES/aviso" ] || telegram "⚠️ Jaula DCAM: el main fijado difiere del main de GitHub en las rutas de la jaula. Revisa qué cambió en main antes de actualizarlo."

# rc se compara con una lista cerrada; su texto nunca se reenvía. El stderr de la
# jaula va al journal de dcam-jaula, no a conciliar.log.
J="; detalle: journalctl -u dcam-jaula"
case "$(head -c 8 "$RES/rc" 2>/dev/null | tr -d '[:space:]')" in
  0) ;;
  3) falla "solucionador (jaula): la jaula no produjo cambios" ;;
  2) falla "solucionador (jaula): el lanzador rechazó la solicitud (rc=2)$J" ;;
  4) falla "solucionador (jaula): el agente no produjo resultado (rc=4)$J" ;;
  5) falla "solucionador (jaula): no pasó validación/compuertas (rc=5)$J" ;;
  6) falla "solucionador (jaula): error del lanzador (rc=6)$J" ;;
  143) falla "solucionador (jaula): el lanzador murió (rc=143)$J" ;;
  *) falla "solucionador (jaula): la jaula terminó con un rc desconocido$J" ;;
esac

# ── Vuelta. verificar_bundle sale del árbol FIJADO de root, nunca de la rama: acepta
# solo UN commit cuyo único padre es BASE y deja sus objetos en $REPO (es el
# `git fetch` del bundle); después, merge --ff-only a ese commit.
# shellcheck source=jaula/verificar-bundle.sh
. "${DCAM_MAIN:-/usr/local/lib/dcam/main}/scripts/dcam/jaula/verificar-bundle.sh" \
  || falla "solucionador (jaula): no pude cargar verificar-bundle.sh del main fijado"
TIP="$(verificar_bundle "$REPO" "$RES/rama.bundle" "$RAMA" "$BASE")" \
  || falla "solucionador (jaula): bundle inválido (no es un solo commit hijo de la rama empujada)"
git merge --ff-only --quiet "$TIP" 2>>"$LOG" || falla "solucionador (jaula): merge --ff-only del bundle falló"

# solucion.json del resultado (el lanzador solo copia ahí archivos regulares de
# ≤ 1 MiB) a $WORKDIR/salida, que es la ruta que da el aviso de borrador. cp -P no
# sigue enlaces; resumen_seguro y solucion_ok vuelven a mirar la copia.
rm -rf "$WORKDIR/salida"
mkdir -p "$WORKDIR/salida"
if [ -f "$RES/solucion.json" ] && [ ! -L "$RES/solucion.json" ]; then
  timeout 60 cp -P -- "$RES/solucion.json" "$WORKDIR/salida/solucion.json" 2>>"$LOG" \
    || rm -f "$WORKDIR/salida/solucion.json"
fi

# Aviso con SOLO contadores: nunca texto libre del agente ni URLs. solucion.json lo
# escribió el agente dentro de la jaula: nunca se lee si no es un archivo REGULAR y
# sin enlaces y de tamaño razonable.
resumen_seguro() {
  local f="$WORKDIR/salida/solucion.json" tam
  if [ ! -f "$f" ] || [ -L "$f" ]; then
    echo "(sin solucion.json)"; return
  fi
  tam="$(stat -c%s "$f" 2>/dev/null || echo 0)"
  if [ "$tam" -gt 1048576 ]; then
    echo "(sin solucion.json)"; return
  fi
  jq -r '"Ligas: \((.ligas // [])|length) · Altas: \((.altas // [])|length) · Pendientes: \((.pendiente // [])|length)"' \
    "$f" 2>/dev/null || echo "(sin solucion.json)"
}
RESUMEN="$(resumen_seguro)"

# ok:true solo si solucion.json es regular, sin enlaces, razonable y trae `ok` == true.
# Cualquier otra cosa (ok:false, "true" como texto, ausente, ilegible) deja el PR en borrador.
# Límite: con claves `ok` repetidas jq se queda con la última; el agente ya controla todo el
# archivo, así que duplicar no gana nada que un `"ok":true` directo no gane.
solucion_ok() {
  local f="$WORKDIR/salida/solucion.json"
  [ -f "$f" ] && [ ! -L "$f" ] && [ "$(stat -c%s "$f" 2>/dev/null || echo 0)" -le 1048576 ] \
    && jq -e '.ok == true' "$f" >/dev/null 2>&1
}

# El merge --ff-only dejó en $REPO el commit de datos y referencias que hizo
# compuertas.sh en la jaula (sin push).
# La cola de éxito es la del cierre normal SIN el update-ref (push + gh pr ready
# + borrar señal): nunca se vuelve a correr auditar.js/npm test ni se evalúan
# los data-*.js en el host; eso ya pasó dentro del contenedor (I1).
if solucion_ok; then
  cerrar_exito jaula
  telegram "🔧 Solucionador (jaula) resolvió $FECHA: $RESUMEN. Revisa la rama $RAMA."
  log "solucionador (jaula) OK: $RESUMEN"
else
  # Se commitea y empuja igual (los datos validados no se pierden), pero sin `gh pr ready`.
  cerrar_exito jaula borrador
  # La ruta la pone el host (WORKDIR), nunca texto del agente: ahí está la lista de pendientes.
  telegram "⚠️ Solucionador (jaula) resolvió en parte $FECHA: $RESUMEN. El PR queda en borrador: revisa los pendientes en $WORKDIR/salida/solucion.json (APOLO)."
  log "solucionador (jaula) EN PARTE (PR en borrador): $RESUMEN"
fi
log "paso 4 OK — pipeline completo (jaula)"
exit 0
