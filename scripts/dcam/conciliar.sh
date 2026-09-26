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
# LA VERDAD VIVE EN GITHUB, NO EN stdout (22-sep-2026). El canal del subagente
# se puede romper con el trabajo ya hecho: openclaw abortó el parseo con
# "CLI JSONL output exceeded 20000 lines" y este script avisó de un fallo
# inexistente mientras los PR #283/#284 estaban abiertos y auditados. Por eso
# "sin veredicto legible" YA NO es fallo: se comprueba en GitHub si la rama
# tiene PR abiertos antes de decidir.
#
# Éxito            → borra la senal, sin Telegram (el centinela avisa del PR).
# Éxito no firmado → borra la senal + UN Telegram informativo (no de alarma).
# Fallo            → mueve la senal a .fallida (no re-dispara en loop) + UN Telegram de error.
set -uo pipefail

DCAM_DIR="${DCAM_DIR:-/home/saulo/apps/dcam-bot}"
REPO="$DCAM_DIR/repo"
SENAL="$DCAM_DIR/pendiente-conciliar.json"
LOCK="$DCAM_DIR/conciliar.lock"
LOG="$DCAM_DIR/conciliar.log"
TG_ENV="${DCAM_TG_ENV:-$DCAM_DIR/telegram.env}"
TIMEOUT_S=3600

log(){ printf '%s %s\n' "$(date -Is)" "$*" >>"$LOG"; }

telegram(){  # UN mensaje. $1 = texto ya compuesto.
  [ -f "$TG_ENV" ] || { log "sin telegram.env, no aviso"; return; }
  # shellcheck disable=SC1090
  . "$TG_ENV"
  [ -n "${TG_TOKEN:-}" ] && [ -n "${TG_CHAT_ID:-}" ] || { log "telegram.env incompleto"; return; }
  curl -s -m 20 "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TG_CHAT_ID}" \
    --data-urlencode "text=$1" \
    >>"$LOG" 2>&1
}

avisar_error(){  # solo cuando el inventario NO quedó conciliado.
  telegram "⚠️ Conciliador DCAM falló: ${1}. Inventario NO conciliado — revisar en APOLO (conciliar.log)."
}

avisar_sin_firma(){  # el trabajo SÍ está hecho; lo que falló fue el canal.
  telegram "ℹ️ Conciliador DCAM: el subagente no dejó veredicto legible (${1}), pero los Draft-PR existen y la rama está en GitHub. Inventario conciliado — revisa y mergea: ${2}"
}

# Guardia anti-doble-disparo: si ya corre uno, salir (el .path re-disparará
# tras el próximo cambio; la senal sigue en disco).
exec 9>"$LOCK"
if ! flock -n 9; then log "otro conciliador en curso, salgo"; exit 0; fi

[ -f "$SENAL" ] || { log "sin senal, nada que hacer"; exit 0; }
FECHA="$(jq -r '.fecha' "$SENAL" 2>/dev/null)"
[ -n "$FECHA" ] && [ "$FECHA" != "null" ] || { log "senal ilegible"; avisar_error "senal ilegible"; mv "$SENAL" "$SENAL.fallida"; exit 1; }
PDFS="$(jq -r '.pdfs[]' "$SENAL" 2>/dev/null)"
RAMA="auto/inventario-${FECHA}"
log "arranco conciliación fecha=$FECHA pdfs=$(echo "$PDFS" | tr '\n' ' ')"

# Main fresco — lección codificada: el subagente parte de origin/main al día.
cd "$REPO" || { avisar_error "no cd al repo"; exit 1; }
git fetch origin --quiet 2>>"$LOG"
git checkout main --quiet 2>>"$LOG" && git reset --hard origin/main --quiet 2>>"$LOG"

# slug owner/repo del remoto, para no hardcodearlo.
GH_REPO="$(git remote get-url origin 2>/dev/null \
           | sed -E 's#(git@|https://)github\.com[:/]##; s#\.git$##')"

verificar_en_github(){  # imprime las URLs de los PR de $RAMA, si los hay.
  command -v gh >/dev/null 2>&1 || { log "gh no disponible, no puedo verificar"; return; }
  [ -n "$GH_REPO" ] || { log "no pude derivar owner/repo del remoto"; return; }
  # --state all a propósito: un PR ya mergeado (o cerrado a mano) demuestra
  # igual que el trabajo se hizo. Con --state open, un merge rápido de Saulo
  # convertiría un éxito en "fallo" la próxima vez que se re-lance la senal.
  gh pr list --repo "$GH_REPO" --head "$RAMA" --state all \
     --json url --jq '.[].url' 2>>"$LOG" | tr '\n' ' '
}

PROMPT="Eres el conciliador headless de armado.mx. Concilia el inventario DCAM del ${FECHA} y abre Draft-PR a main Y develop.
PDFs: ${PDFS}
Sigue AL PIE la skill /home/saulo/apps/dcam-bot/repo/.claude/skills/conciliar-inventario/SKILL.md.
Usa /home/saulo/apps/dcam-bot/.venv/bin/python para parse_pdf.py y mapear-existencias.py (PyMuPDF vive ahí).
Trabaja sobre origin/main fresco: git fetch origin && git checkout -B ${RAMA} origin/main.

EXISTENCIAS — usa mapear-existencias.py (versionado en la skill, sección 'Atribución de existencias'):
  1. Parsea cada PDF con parse_pdf.py --json
  2. Mapea existencias con mapear-existencias.py --verbose (armas usa la ref por defecto; cartuchos y accesorios pasan --ref)
  3. El JSON trae {existencias, sinFicha, sinPrecio}:
     - existencias: mapa fichaId→qty BASE. Úsalo como punto de partida.
     - sinFicha: renglones NUEVOS. Pueden ser altas O regresos de fichas agotadas — VERIFICA contra el catálogo completo antes de crear ficha nueva.
     - sinPrecio: fichas sin renglón → candidatas a AGOTADAS.
  4. Verifica factores (entre 0.95 y 1.05 normalmente).

PRECIOS — el encadenado sigue igual: mapea por marca+modelo+calibre VERIFICADO (NO fuzzy).

GATE DURO: corre node .claude/skills/conciliar-inventario/scripts/auditar.js. Si NO da '✔✔ AUDITORÍA SIN HALLAZGOS', ABORTA: no commitees, no abras PR.
Erratas nuevas: LÍSTALAS en el cuerpo del PR, no las marques. Modelo nuevo sin specs: alta con '' y año null, no lo omitas.

ACTUALIZAR REFERENCIAS: después de commitear y ANTES de abrir los PR:
  python3 .claude/skills/conciliar-inventario/scripts/mapear-existencias.py /tmp/armas.json --update-ref
  (Igual para cartuchos y accesorios con --ref.) Incluye las refs actualizadas en el commit.

En éxito abre los DOS Draft-PR con gh pr create --draft (base main y base develop).
SÉ PARCO EN TU SALIDA: no vuelques archivos completos, diffs largos ni logs crudos al chat — el CLI que te ejecuta aborta el parseo por encima de 20000 líneas y tu veredicto se pierde. Resume; el detalle va en el cuerpo del PR.
Tu ÚLTIMA línea de salida debe ser SOLO este JSON, sin nada más:
  éxito: {\"ok\":true,\"prs\":[\"<url-pr-main>\",\"<url-pr-develop>\"]}
  fallo: {\"ok\":false,\"motivo\":\"<motivo corto>\"}"

SESSION_KEY="dcam-conciliar-${FECHA}"
OUT="$(openclaw agent --json --timeout "$TIMEOUT_S" \
        --session-key "$SESSION_KEY" --message "$PROMPT" 2>>"$LOG")"
RC=$?
log "subagente terminó rc=$RC"

# El texto visible del agente vive en result.meta.finalAssistantVisibleText.
# De ahí saco la última línea JSON {"ok":...}; si jq falla, caigo a grep crudo.
TEXTO="$(printf '%s' "$OUT" | jq -r '.result.meta.finalAssistantVisibleText // empty' 2>/dev/null)"
[ -n "$TEXTO" ] || TEXTO="$OUT"

# ERE no tiene cuantificador perezoso: '.*\}' se come hasta la ÚLTIMA llave y
# arrastra el cierre del JSON externo ('...}"}}}'), que ya no parsea. Así que
# recorto un carácter por el final hasta que jq acepte el trozo.
VEREDICTO="$(printf '%s' "$TEXTO" | grep -oE '\{"ok":(true|false).*' | tail -1)"
while [ -n "$VEREDICTO" ] && ! printf '%s' "$VEREDICTO" | jq -e . >/dev/null 2>&1; do
  VEREDICTO="${VEREDICTO%?}"
done

# OJO: '.ok // empty' NO sirve aquí — para jq el operador '//' trata false como
# ausente, así que un fallo declarado se leería como "sin veredicto".
OK="$(printf '%s' "$VEREDICTO" | jq -r 'if has("ok") then .ok else empty end' 2>/dev/null)"

if [ "$OK" = "true" ]; then
  PRS="$(printf '%s' "$VEREDICTO" | jq -r '.prs[]?' 2>/dev/null | tr '\n' ' ')"
  log "ÉXITO prs=$PRS"
  rm -f "$SENAL"
  exit 0

elif [ "$OK" = "false" ]; then
  # Veredicto explícito de fallo: el subagente sabe por qué (p.ej. abortó por
  # auditoría con hallazgos). Se le cree, aunque haya dejado ramas a medias.
  MOTIVO="$(printf '%s' "$VEREDICTO" | jq -r '.motivo // empty' 2>/dev/null)"
  [ -n "$MOTIVO" ] || MOTIVO="sin motivo declarado"
  log "FALLO declarado por el subagente motivo=$MOTIVO"
  avisar_error "$MOTIVO"
  mv "$SENAL" "$SENAL.fallida"   # no re-disparar en loop; Saulo re-crea la senal tras arreglar
  exit 1

else
  # SIN veredicto legible. NO es fallo todavía: el trabajo puede estar hecho y
  # ser el canal lo que se rompió. La verdad está en GitHub.
  DIAG="rc=$RC, sin JSON de veredicto"
  log "sin veredicto legible ($DIAG); verifico en GitHub rama=$RAMA repo=$GH_REPO"
  PRS="$(verificar_en_github)"
  if [ -n "${PRS// /}" ]; then
    log "ÉXITO verificado en GitHub (sin firma del subagente) prs=$PRS"
    avisar_sin_firma "$DIAG" "$PRS"
    rm -f "$SENAL"
    exit 0
  fi
  log "FALLO sin veredicto y sin PR abierto para $RAMA"
  avisar_error "el subagente no dejó veredicto ($DIAG) y no hay PR abierto para $RAMA"
  mv "$SENAL" "$SENAL.fallida"
  exit 1
fi
