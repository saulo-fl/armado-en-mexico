#!/usr/bin/env bash
# Armado en México — Copyright (C) 2026 Saulo Flores León
# SPDX-License-Identifier: AGPL-3.0-or-later
# Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
# (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.
#
# otca-pipeline.sh — inventario de la OTCA (Monterrey) → PR (Saulo, 05-nov-2026)
#
# Lo dispara dcam-otca.path cuando el vigía deja $DCAM_DIR/pendiente-otca.json
# ({fecha, pdf, url, sha256}). Un solo PDF con armas, municiones y accesorios:
#   1. parse_otca.py      → otca.json/.tsv en el workdir
#   2. mapear-otca.py     → mapeo-otca.json (+ referencia-otca.json al día)
#   3. aplicar-otca.py    → registros OTCA, inventario OTCA, PDF en public/, y el
#                           precio principal (DCAM > OTCA > último)
#   4. compuertas         → auditar.js ✔✔, npm test sin fallos, test_otca.py
#   5. PR a main          → listo si todo se ligó; en BORRADOR, con la lista y un
#                           aviso por Telegram, si quedaron renglones sin ficha
#                           (el solucionador para OTCA llega en otro PR).
# Rama: auto/inventario-otca-<AAAA-MM-DD>. Empieza con «auto/inventario-» a propósito:
# así el pipeline DCAM espera a que este PR se fusione (y este espera al suyo), y
# nunca hay dos PRs de inventario tocando los mismos data-*.js a la vez.
# Comparte el lock del pipeline DCAM (mismo clon /srv/dcam/repo): espera a que
# se libere en vez de salir, y al terminar re-dispara una señal DCAM que hubiera
# quedado sin atender por el lock.
set -uo pipefail

export DCAM_DIR="${DCAM_DIR:-/srv/dcam}"
REPO="${DCAM_REPO:-$DCAM_DIR/repo}"
SENAL="$DCAM_DIR/pendiente-otca.json"
SENAL_DCAM="$DCAM_DIR/pendiente-conciliar.json"
LOCK="$DCAM_DIR/conciliar.lock"
LOG="$DCAM_DIR/otca.log"
TG_ENV="${DCAM_TG_ENV:-$DCAM_DIR/telegram.env}"
VENV="${DCAM_VENV:-$DCAM_DIR/.venv/bin/python}"
SCRIPTS=".claude/skills/conciliar-inventario/scripts"
SIN_GH="${OTCA_SIN_GH:-}"          # =1: pruebas locales, sin push ni PR
ESPERA_INTERVALO="${OTCA_ESPERA_INTERVALO:-600}"
ESPERA_MAX="${OTCA_ESPERA_MAX:-86400}"
STEP="init"

log(){ printf '%s %s\n' "$(date -Is)" "$*" >>"$LOG"; }

telegram(){
  [ -f "$TG_ENV" ] || { log "sin telegram.env, no aviso"; return 0; }
  # shellcheck disable=SC1090
  . "$TG_ENV"
  [ -n "${TG_TOKEN:-}" ] && [ -n "${TG_CHAT_ID:-}" ] || { log "telegram.env incompleto"; return 0; }
  curl -s -m 20 "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TG_CHAT_ID}" --data-urlencode "text=$1" >>"$LOG" 2>&1
  echo >>"$LOG"
}

falla(){
  telegram "⚠️ Pipeline OTCA falló en paso $STEP: $1. Inventario OTCA NO cargado — revisar otca.log."
  [ -f "$SENAL" ] && mv "$SENAL" "$SENAL.fallida"
  log "FALLO paso $STEP: $1 (señal -> pendiente-otca.json.fallida)"
  exit 1
}

# Un PR de inventario abierto (DCAM u OTCA) que no sea el nuestro. Se espera SIN
# el lock tomado, para no dejar sin atender una señal DCAM mientras tanto.
pr_previo(){
  gh pr list --repo "$GH_REPO" --state open --limit 100 --json number,headRefName 2>>"$LOG" \
    | jq -r --arg r "$RAMA" '[.[] | select((.headRefName | startswith("auto/inventario-")) and .headRefName != $r)]
                              | sort_by(.number) | first // empty | "\(.number) \(.headRefName)"'
}

esperar_pr_previo(){
  [ -n "$SIN_GH" ] && return 0
  local fin=$((SECONDS + ESPERA_MAX)) avisado="" previo
  while :; do
    if previo="$(pr_previo)"; then
      if [ -z "$previo" ]; then
        [ -n "$avisado" ] && telegram "▶️ Inventario OTCA $FECHA_ISO: el PR previo ya se fusionó o cerró, sigo."
        return 0
      fi
      if [ -z "$avisado" ]; then
        log "en espera: PR #${previo% *} (${previo#* }) abierto"
        telegram "⏸️ Inventario OTCA $FECHA_ISO en espera: el PR #${previo% *} sigue abierto. Sigo solo en cuanto lo fusiones o cierres."
        avisado=1
      fi
    else
      log "gh pr list falló; reintento"
    fi
    [ "$SECONDS" -lt "$fin" ] || return 1
    sleep "$ESPERA_INTERVALO"
  done
}

# ── Señal ──
[ -f "$SENAL" ] || { log "sin señal, nada que hacer"; exit 0; }
PDF="$(jq -r '.pdf // empty' "$SENAL" 2>/dev/null)"
[ -n "$PDF" ] && [ -f "$PDF" ] || { STEP="señal"; falla "la señal no trae un PDF que exista (${PDF:-vacío})"; }

cd "$REPO" || { STEP="init"; falla "no cd al repo $REPO"; }
GH_REPO="$(git remote get-url origin 2>/dev/null | sed -E 's#(git@|https://)github\.com[:/]##; s#\.git$##')"

# La fecha manda la del PDF (la OTCA publica días después de su corte), no la del vigía.
STEP="1-lector"
WB="${DCAM_WORKDIR_BASE:-$DCAM_DIR/trabajo}"
TMPW="$(mktemp -d "$WB/otca-XXXXXX")" || falla "no pude crear el workdir en $WB"
$VENV "$REPO/$SCRIPTS/parse_otca.py" "$PDF" --json "$TMPW/otca.json" --tsv "$TMPW/otca.tsv" 2>>"$LOG" \
  || falla "parse_otca.py no pudo leer $(basename "$PDF")"
FECHA_ISO="$(jq -r '.fecha // empty' "$TMPW/otca.json")"
TOTAL="$(jq -r '.total' "$TMPW/otca.json")"
[[ "$FECHA_ISO" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || falla "el PDF no trae una fecha legible"
[ "${TOTAL:-0}" -gt 0 ] || falla "el PDF no trae renglones (¿cambió de formato?)"
WORKDIR="$WB/otca-$FECHA_ISO"
rm -rf "$WORKDIR" && mv "$TMPW" "$WORKDIR"
RAMA="auto/inventario-otca-$FECHA_ISO"
log "arranco OTCA $FECHA_ISO ($TOTAL renglones) rama=$RAMA"

STEP="0-espera"
esperar_pr_previo || falla "otro PR de inventario sigue abierto tras $((ESPERA_MAX / 3600)) h"

# Lock compartido con el pipeline DCAM: se espera (hasta 15 h), no se sale.
exec 9>"$LOCK"
flock -w 54000 9 || falla "el lock del pipeline DCAM siguió tomado 15 h"

STEP="0-rama"
if [ -z "$SIN_GH" ]; then
  git fetch origin --quiet 2>>"$LOG" || falla "git fetch origin falló"
  git checkout -B "$RAMA" origin/main --quiet 2>>"$LOG" || falla "no pude cortar $RAMA de origin/main"
else
  git checkout -B "$RAMA" --quiet 2>>"$LOG" || falla "no pude cortar $RAMA"
fi

STEP="2-mapeo"
$VENV "$SCRIPTS/mapear-otca.py" "$WORKDIR/otca.json" --catalogo src/data --update-ref \
  > "$WORKDIR/mapeo-otca.json" 2>>"$LOG" || falla "mapear-otca.py falló"
cp "$WORKDIR/mapeo-otca.json" mapeo-otca.json
SIN_FICHA="$(jq '[.armas.sinFicha, .cartuchos.sinFicha, .accesorios.sinFicha] | map(length) | add' mapeo-otca.json)"
LIGADOS="$(jq '[.armas.renglones, .cartuchos.renglones, .accesorios.renglones] | map(length) | add' mapeo-otca.json)"
log "  mapeo: $LIGADOS ligados, $SIN_FICHA sin ficha"

STEP="3-carga"
$VENV "$SCRIPTS/aplicar-otca.py" --mapeo mapeo-otca.json --fecha "$FECHA_ISO" --data-dir src/data/ \
  --pdf "$PDF" --public public/ 2>>"$LOG" || falla "aplicar-otca.py falló"

STEP="4-compuertas"
node "$SCRIPTS/auditar.js" >"$WORKDIR/auditar.txt" 2>&1
tail -1 "$WORKDIR/auditar.txt" | grep -q "AUDITORÍA SIN HALLAZGOS" \
  || falla "auditar.js con hallazgos: $(grep -m1 -E '❌' "$WORKDIR/auditar.txt" | sed 's/^ *//')"
npm test >"$WORKDIR/npm-test.txt" 2>&1
grep -qE '^ℹ fail 0$' "$WORKDIR/npm-test.txt" || falla "npm test con fallos ($(grep -E '^ℹ fail' "$WORKDIR/npm-test.txt"))"
$VENV "$SCRIPTS/test_otca.py" >"$WORKDIR/test-otca.txt" 2>&1 || falla "test_otca.py falló"
log "  compuertas ✔ (auditar, npm test, test_otca)"

STEP="5-pr"
# Precios OTCA lejos de la DCAM (±10 %): van al cuerpo del PR para revisarlos.
LISTA_SIN="$(jq -r '["armas","cartuchos","accesorios"][] as $c | .[$c].sinFicha[] | "- \($c): \(.desc[0:110]) — $\(.priceN), \(.qty) pzas"' mapeo-otca.json)"
CUERPO="$WORKDIR/pr.md"
{
  echo "Inventario OTCA (Monterrey) del $FECHA_ISO — pipeline automático."
  echo
  echo "- Renglones: $TOTAL · ligados: $LIGADOS · sin ficha: $SIN_FICHA"
  for c in armas cartuchos accesorios; do
    echo "- $c: $(jq -r --arg c $c '"\(.[$c].renglones|length) ligados, \(.[$c].sinPrecio|length) agotados en OTCA"' mapeo-otca.json)"
  done
  if [ "$SIN_FICHA" -gt 0 ]; then
    echo; echo "**Sin ficha (no se cargaron; el PR queda en borrador):**"; echo "$LISTA_SIN"
  fi
  echo; echo "Compuertas: auditar.js ✔✔, npm test sin fallos, test_otca.py OK."
} >"$CUERPO"
git add -A
# Solo cuenta lo que ve el sitio: el mapeo y la referencia cambian solos al re-leer el mismo PDF.
if git diff --cached --quiet -- src public; then
  git reset -q --hard HEAD
  log "OTCA $FECHA_ISO ya estaba cargado: nada que cambiar"
  telegram "ℹ️ Inventario OTCA $FECHA_ISO: ya estaba cargado en el sitio, no hay nada nuevo."
  rm -f "$SENAL"; exit 0
fi
git commit -m "inventario(otca): $FECHA_ISO" --quiet 2>>"$LOG" || falla "git commit falló"
if [ -n "$SIN_GH" ]; then
  log "OTCA $FECHA_ISO listo (sin GitHub: OTCA_SIN_GH)"; rm -f "$SENAL"; exit 0
fi
git push origin "$RAMA" --force --quiet 2>>"$LOG" || falla "git push falló"
PR_URL="$(gh pr list --repo "$GH_REPO" --head "$RAMA" --state open --json url --jq '.[0].url' 2>>"$LOG")"
if [ -z "$PR_URL" ]; then
  PR_URL="$(gh pr create --repo "$GH_REPO" --base main --head "$RAMA" --draft \
             --title "inventario(otca): $FECHA_ISO" --body-file "$CUERPO" 2>>"$LOG" | tail -1)"
fi
[ -n "$PR_URL" ] || falla "no pude abrir el PR"
if [ "$SIN_FICHA" -eq 0 ]; then
  gh pr ready "$PR_URL" --repo "$GH_REPO" 2>>"$LOG" || true
  telegram "✅ Inventario OTCA $FECHA_ISO cargado: $LIGADOS renglones con ficha. PR listo para revisar: $PR_URL"
else
  telegram "⚠️ Inventario OTCA $FECHA_ISO: $LIGADOS cargados y $SIN_FICHA SIN ficha (no se cargaron). PR en borrador: $PR_URL
$(echo "$LISTA_SIN" | head -20)"
fi
rm -f "$SENAL"
log "OTCA $FECHA_ISO OK — $PR_URL"

# Si una señal DCAM llegó mientras teníamos el lock, su pipeline salió sin
# atenderla: se re-dispara (mv dispara el .path; touch no).
if [ -f "$SENAL_DCAM" ]; then
  flock -u 9
  sleep 2
  if ! systemctl is-active --quiet dcam-conciliar.service 2>/dev/null; then
    cp "$SENAL_DCAM" "$SENAL_DCAM.re" && mv "$SENAL_DCAM.re" "$SENAL_DCAM" && log "señal DCAM pendiente re-disparada"
  fi
fi
exit 0
