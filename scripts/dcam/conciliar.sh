#!/usr/bin/env bash
# Armado en México — Copyright (C) 2026 Saulo Flores León
# SPDX-License-Identifier: AGPL-3.0-or-later
# Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
# (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.
# Conciliador DCAM — disparado por dcam-conciliar.path cuando el vigía deja
# pendiente-conciliar.json. Corre el mapeo de criterio en un subagente headless
# de Quirón (openclaw agent) siguiendo la skill conciliar-inventario, que hace
# parse → mapeo → auditar.js → Draft-PR a main Y develop él mismo.
#
# Contrato de salida del subagente: su ÚLTIMA línea debe ser un JSON
#   {"ok":true,"prs":["<url main>","<url develop>"]}  en éxito, o
#   {"ok":false,"motivo":"<texto corto>"}             en fallo/aborto.
# El aborto por auditar.js con hallazgos vive DENTRO del prompt (regla dura).
#
# Éxito  → borra la senal, sin Telegram (el centinela de GitHub avisa del PR).
# Fallo  → mueve la senal a .fallida (no re-dispara en loop) + UN Telegram de error.
set -uo pipefail

DCAM_DIR="${DCAM_DIR:-/home/saulo/apps/dcam-bot}"
REPO="$DCAM_DIR/repo"
SENAL="$DCAM_DIR/pendiente-conciliar.json"
LOCK="$DCAM_DIR/conciliar.lock"
LOG="$DCAM_DIR/conciliar.log"
TG_ENV="${DCAM_TG_ENV:-$DCAM_DIR/telegram.env}"
TIMEOUT_S=3600

log(){ printf '%s %s\n' "$(date -Is)" "$*" >>"$LOG"; }

avisar_error(){  # UN Telegram, solo en fallo. Cero avisos en flujo feliz.
  local motivo="$1"
  [ -f "$TG_ENV" ] || { log "sin telegram.env, no aviso"; return; }
  # shellcheck disable=SC1090
  . "$TG_ENV"
  [ -n "${TG_TOKEN:-}" ] && [ -n "${TG_CHAT_ID:-}" ] || { log "telegram.env incompleto"; return; }
  curl -s -m 20 "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TG_CHAT_ID}" \
    --data-urlencode "text=⚠️ Conciliador DCAM falló: ${motivo}. Inventario NO conciliado — revisar en APOLO (conciliar.log)." \
    >>"$LOG" 2>&1
}

# Guardia anti-doble-disparo: si ya corre uno, salir (el .path re-disparará
# tras el próximo cambio; la senal sigue en disco).
exec 9>"$LOCK"
if ! flock -n 9; then log "otro conciliador en curso, salgo"; exit 0; fi

[ -f "$SENAL" ] || { log "sin senal, nada que hacer"; exit 0; }
FECHA="$(jq -r '.fecha' "$SENAL" 2>/dev/null)"
[ -n "$FECHA" ] && [ "$FECHA" != "null" ] || { log "senal ilegible"; avisar_error "senal ilegible"; mv "$SENAL" "$SENAL.fallida"; exit 1; }
PDFS="$(jq -r '.pdfs[]' "$SENAL" 2>/dev/null)"
log "arranco conciliación fecha=$FECHA pdfs=$(echo "$PDFS" | tr '\n' ' ')"

# Main fresco — lección codificada: el subagente parte de origin/main al día.
cd "$REPO" || { avisar_error "no cd al repo"; exit 1; }
git fetch origin --quiet 2>>"$LOG"
git checkout main --quiet 2>>"$LOG" && git reset --hard origin/main --quiet 2>>"$LOG"

PROMPT="Eres el conciliador headless de armado.mx. Concilia el inventario DCAM del ${FECHA} y abre Draft-PR a main Y develop.
PDFs: ${PDFS}
Sigue AL PIE la skill /home/saulo/apps/dcam-bot/repo/.claude/skills/conciliar-inventario/SKILL.md.
Usa /home/saulo/apps/dcam-bot/.venv/bin/python para parse_pdf.py (PyMuPDF vive ahí).
Trabaja sobre origin/main fresco: git fetch origin && git checkout -B auto/inventario-${FECHA} origin/main.
Mapeo por marca+modelo+calibre VERIFICADO (NO fuzzy). Usa el encadenado de precios como autochequeo.
GATE DURO: corre node .claude/skills/conciliar-inventario/scripts/auditar.js. Si NO da '✔✔ AUDITORÍA SIN HALLAZGOS', ABORTA: no commitees, no abras PR.
Erratas nuevas: LÍSTALAS en el cuerpo del PR, no las marques. Modelo nuevo sin specs: alta con '' y año null, no lo omitas.
En éxito abre los DOS Draft-PR con gh pr create --draft (base main y base develop).
Tu ÚLTIMA línea de salida debe ser SOLO este JSON, sin nada más:
  éxito: {\"ok\":true,\"prs\":[\"<url-pr-main>\",\"<url-pr-develop>\"]}
  fallo: {\"ok\":false,\"motivo\":\"<motivo corto>\"}"

SESSION_KEY="dcam-conciliar-${FECHA}"
OUT="$(openclaw agent --json --timeout "$TIMEOUT_S" \
        --session-key "$SESSION_KEY" --message "$PROMPT" 2>>"$LOG")"
log "subagente terminó rc=$?"

# El texto visible del agente vive en result.meta.finalAssistantVisibleText.
# De ahí saco la última línea JSON {"ok":...}; si jq falla, caigo a grep crudo.
TEXTO="$(printf '%s' "$OUT" | jq -r '.result.meta.finalAssistantVisibleText // empty' 2>/dev/null)"
[ -n "$TEXTO" ] || TEXTO="$OUT"
VEREDICTO="$(printf '%s' "$TEXTO" | grep -oE '\{"ok":(true|false).*\}' | tail -1)"
OK="$(printf '%s' "$VEREDICTO" | jq -r '.ok // empty' 2>/dev/null)"

if [ "$OK" = "true" ]; then
  PRS="$(printf '%s' "$VEREDICTO" | jq -r '.prs[]?' 2>/dev/null | tr '\n' ' ')"
  log "ÉXITO prs=$PRS"
  rm -f "$SENAL"
  exit 0
else
  MOTIVO="$(printf '%s' "$VEREDICTO" | jq -r '.motivo // "sin veredicto legible del subagente"' 2>/dev/null)"
  log "FALLO motivo=$MOTIVO"
  avisar_error "$MOTIVO"
  mv "$SENAL" "$SENAL.fallida"   # no re-disparar en loop; Saulo re-crea la senal tras arreglar
  exit 1
fi
