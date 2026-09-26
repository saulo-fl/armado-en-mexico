#!/usr/bin/env bash
# Armado en México — Copyright (C) 2026 Saulo Flores León
# SPDX-License-Identifier: AGPL-3.0-or-later
# Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
# (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.
#
# Pipeline conciliador DCAM — pasos independientes con commits intermedios.
# Reemplaza la invocación monolítica del agente: ahora solo se invoca para
# altas (sinFicha), que es la única parte que requiere criterio humano/agente.
#
# Pasos:
#   0. PREP   — parsea PDFs, copia a public/inventarios/, commit
#   1. MAPEO  — mapea existencias con price chain, verifica factores, commit
#   2. MECÁNICO — aplica precios/historial/existencias a data-*.js, commit
#   3. ALTAS  — solo si hay sinFicha: invoca agente para crear fichas
#   4. AUDIT  — corre auditar.js, actualiza referencias, cierra PR
#
# Cada paso commitea y pushea: si el paso 3 falla, los pasos 0–2 están en el PR.
set -uo pipefail

DCAM_DIR="${DCAM_DIR:-/home/saulo/apps/dcam-bot}"
REPO="$DCAM_DIR/repo"
SENAL="$DCAM_DIR/pendiente-conciliar.json"
LOCK="$DCAM_DIR/conciliar.lock"
LOG="$DCAM_DIR/conciliar.log"
TG_ENV="${DCAM_TG_ENV:-$DCAM_DIR/telegram.env}"
VENV="$DCAM_DIR/.venv/bin/python"
SCRIPTS=".claude/skills/conciliar-inventario/scripts"

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

# ── Lock ──
exec 9>"$LOCK"
if ! flock -n 9; then log "otro pipeline en curso, salgo"; exit 0; fi

# ── Leer señal ──
[ -f "$SENAL" ] || { log "sin senal, nada que hacer"; exit 0; }
FECHA="$(jq -r '.fecha' "$SENAL" 2>/dev/null)"
[ -n "$FECHA" ] && [ "$FECHA" != "null" ] || { log "senal ilegible"; exit 1; }
PDFS="$(jq -r '.pdfs[]' "$SENAL" 2>/dev/null)"
FECHA_ISO="$FECHA"
RAMA="auto/inventario-${FECHA}"
WORKDIR="/tmp/dcam-pipeline-${FECHA}"
STEP="init"

mkdir -p "$WORKDIR"
log "arranco pipeline fecha=$FECHA rama=$RAMA"

cd "$REPO" || { avisar_error "no cd al repo"; exit 1; }
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
      --json "$WORKDIR/${tag}.json" 2>>"$LOG"
    log "  parseado $tag: $(wc -l < "$WORKDIR/${tag}.tsv") líneas TSV"

    # Copy PDF to public/inventarios/
    target="public/inventarios/dcam-existencias-${FECHA}.pdf"
    if [ "$tag" = "cartuchos" ]; then
      target="public/inventarios/dcam-municiones-${FECHA}.pdf"
    elif [ "$tag" = "accesorios" ]; then
      target="public/inventarios/dcam-accesorios-${FECHA}.pdf"
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
    $VENV "$SCRIPTS/mapear-existencias.py" "$WORKDIR/armas.json" --verbose \
      > "$WORKDIR/mapeo-armas.json" 2>>"$LOG"
    log "  mapeo armas: $(jq '.totalMapped' "$WORKDIR/mapeo-armas.json") mapeados"
  fi

  # Cartuchos
  if [ -f "$WORKDIR/cartuchos.json" ]; then
    $VENV "$SCRIPTS/mapear-existencias.py" "$WORKDIR/cartuchos.json" \
      --ref "$SCRIPTS/referencia-cartuchos.json" --verbose \
      > "$WORKDIR/mapeo-cartuchos.json" 2>>"$LOG"
    log "  mapeo cartuchos: $(jq '.totalMapped' "$WORKDIR/mapeo-cartuchos.json") mapeados"
  fi

  # Accesorios
  if [ -f "$WORKDIR/accesorios.json" ]; then
    $VENV "$SCRIPTS/mapear-existencias.py" "$WORKDIR/accesorios.json" \
      --ref "$SCRIPTS/referencia-accesorios.json" --verbose \
      > "$WORKDIR/mapeo-accesorios.json" 2>>"$LOG"
    log "  mapeo accesorios: $(jq '.totalMapped' "$WORKDIR/mapeo-accesorios.json") mapeados"
  fi

  # Verify factors (all should be between 0.90 and 1.10)
  for f in "$WORKDIR"/mapeo-*.json; do
    [ -f "$f" ] || continue
    FACTORS="$(jq -r '.factores[]' "$f" 2>/dev/null)"
    for fv in $FACTORS; do
      if python3 -c "f=$fv; exit(0 if 0.90 <= f <= 1.10 else 1)" 2>/dev/null; then
        :
      else
        log "  ⚠ factor fuera de rango en $(basename "$f"): $fv"
      fi
    done
  done

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
    --data-dir src/data/ 2>>"$LOG"

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

  log "  $TOTAL_SF fichas nuevas (sinFicha) — invocando agente"

  # Build focused prompt with ONLY sinFicha items
  SIN_FICHA_JSON="$(python3 -c "
import json, sys
items = []
for f in ['$WORKDIR/mapeo-armas.json', '$WORKDIR/mapeo-cartuchos.json', '$WORKDIR/mapeo-accesorios.json']:
    try:
        with open(f) as fh:
            m = json.load(fh)
            for sf in m.get('sinFicha', []):
                sf['_source'] = f.split('mapeo-')[1].split('.')[0]
                items.append(sf)
    except FileNotFoundError:
        pass
print(json.dumps(items, ensure_ascii=False))
")"

  SESSION_KEY="dcam-pipeline-altas-${FECHA}"
  PROMPT="Estás en la rama ${RAMA} del repo armado.mx. El paso mecánico ya se aplicó.
Crea fichas SOLO para estos renglones sinFicha (son altas nuevas del inventario DCAM del ${FECHA}):
${SIN_FICHA_JSON}

Para cada uno:
1. Identifica si es arma, cartucho o accesorio (campo _source).
2. Busca en el catálogo si ya existe una ficha similar (mismo modelo/calibre). Si existe, es un regreso — añade existencia, no crees ficha.
3. Si es genuinamente nuevo, crea la ficha con alta mínima (specs de fabricante, '' si no hay imagen, año null si no se sabe).
4. Añade su historial de precio y existencia.

Trabaja sobre la rama ${RAMA} (ya tiene los pasos 0–2 commiteados).
Commitea y pushea cuando termines. NO abras PR nuevo — el Draft PR ya existe.
Tu ÚLTIMA línea debe ser: {\"ok\":true} o {\"ok\":false,\"motivo\":\"<razón>\"}"

  OUT="$(openclaw agent --json --timeout 900 \
        --session-key "$SESSION_KEY" --message "$PROMPT" 2>>"$LOG")" || true

  TEXTO="$(printf '%s' "$OUT" | jq -r '.result.meta.finalAssistantVisibleText // empty' 2>/dev/null)"
  [ -n "$TEXTO" ] || TEXTO="$OUT"
  VEREDICTO="$(printf '%s' "$TEXTO" | grep -oE '\{"ok":(true|false).*' | tail -1)"
  while [ -n "$VEREDICTO" ] && ! printf '%s' "$VEREDICTO" | jq -e . >/dev/null 2>&1; do
    VEREDICTO="${VEREDICTO%?}"
  done

  OK="$(printf '%s' "$VEREDICTO" | jq -r 'if has("ok") then .ok else empty end' 2>/dev/null)"
  if [ "$OK" = "true" ]; then
    log "  altas OK"
    return 0
  elif [ "$OK" = "false" ]; then
    MOTIVO="$(printf '%s' "$VEREDICTO" | jq -r '.motivo // "sin motivo"' 2>/dev/null)"
    log "  altas FALLO: $MOTIVO"
    return 1
  else
    log "  altas sin veredicto legible"
    return 1
  fi
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
    eprint "$AUDIT_OUT"
    return 1
  fi

  if ! echo "$AUDIT_OUT" | grep -q '✔✔ AUDITORÍA SIN HALLAZGOS'; then
    log "  auditoría con hallazgos"
    return 1
  fi

  log "  auditoría ✔✔"

  # Update references
  if [ -f "$WORKDIR/armas.json" ]; then
    $VENV "$SCRIPTS/mapear-existencias.py" "$WORKDIR/armas.json" --update-ref 2>>"$LOG"
  fi
  if [ -f "$WORKDIR/cartuchos.json" ]; then
    $VENV "$SCRIPTS/mapear-existencias.py" "$WORKDIR/cartuchos.json" \
      --ref "$SCRIPTS/referencia-cartuchos.json" --update-ref 2>>"$LOG"
  fi
  if [ -f "$WORKDIR/accesorios.json" ]; then
    $VENV "$SCRIPTS/mapear-existencias.py" "$WORKDIR/accesorios.json" \
      --ref "$SCRIPTS/referencia-accesorios.json" --update-ref 2>>"$LOG"
  fi

  git add -A
  git commit -m "audit: ✔✔ + refs actualizadas $FECHA" --quiet 2>>"$LOG" || true
  git push origin "$RAMA" --quiet 2>>"$LOG"

  # Mark PR ready
  PR_URL="$(gh pr list --repo "$GH_REPO" --head "$RAMA" --state open --json url --jq '.[0].url' 2>/dev/null)"
  if [ -n "$PR_URL" ]; then
    gh pr ready "$PR_URL" --repo "$GH_REPO" 2>>"$LOG" || true
    log "  PR marcado ready: $PR_URL"
  fi

  rm -f "$SENAL"
  log "paso 4 OK — pipeline completo"
}

# ═══════════════════════════════════════════════════════════════════════════════
# Run pipeline
# ═══════════════════════════════════════════════════════════════════════════════

step_prep     || { avisar_error "prep falló"; exit 1; }
step_mapeo    || { avisar_error "mapeo falló"; exit 1; }
step_mecanico || { avisar_error "mecánico falló"; exit 1; }
step_altas    || { avisar_error "altas falló (pasos 0-2 ya están en el PR)"; exit 1; }
step_audit    || { avisar_error "auditoría falló"; exit 1; }

log "pipeline completo $FECHA"
exit 0
