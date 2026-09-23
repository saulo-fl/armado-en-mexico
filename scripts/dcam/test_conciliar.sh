#!/usr/bin/env bash
# Armado en México — Copyright (C) 2026 Saulo Flores León
# SPDX-License-Identifier: AGPL-3.0-or-later
# Prueba de conciliar.sh SIN tocar GitHub, el repo real ni Telegram.
# Sustituye openclaw, gh, git y curl por dobles, y comprueba las tres
# ramas de decisión + el caso que motivó el arreglo (22-sep-2026).
set -uo pipefail

SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/conciliar.sh"
BASE="$(mktemp -d)"
trap 'rm -rf "$BASE"' EXIT
FALLOS=0

# ── dobles ────────────────────────────────────────────────────────────────
BIN="$BASE/bin"; mkdir -p "$BIN"

cat >"$BIN/openclaw" <<'EOF'
#!/usr/bin/env bash
# MODO lo decide el test. Escribe en stdout lo que el de verdad escribiría.
case "${DOBLE_OPENCLAW:-ok}" in
  ok)       printf '{"result":{"meta":{"finalAssistantVisibleText":"listo\n{\"ok\":true,\"prs\":[\"https://x/1\",\"https://x/2\"]}"}}}' ;;
  fallo)    printf '{"result":{"meta":{"finalAssistantVisibleText":"abort\n{\"ok\":false,\"motivo\":\"auditoria con hallazgos\"}"}}}' ;;
  # El caso real: el CLI se rinde al parsear y no emite JSON. rc=1.
  reventado) echo "[openclaw] Could not start the CLI." >&2
             echo "[openclaw] Reason: CLI JSONL output exceeded 20000 lines; refusing to parse output." >&2
             exit 1 ;;
esac
EOF

cat >"$BIN/gh" <<'EOF'
#!/usr/bin/env bash
# gh pr list --repo R --head RAMA --state all --json url --jq .[].url
[ "${DOBLE_GH:-con_pr}" = "sin_pr" ] && exit 0
echo "https://github.com/saulo-fl/armado-en-mexico/pull/283"
echo "https://github.com/saulo-fl/armado-en-mexico/pull/284"
EOF

cat >"$BIN/git" <<'EOF'
#!/usr/bin/env bash
# Solo responde lo que el script consulta; el resto es no-op silencioso.
[ "$1" = "remote" ] && { echo "https://github.com/saulo-fl/armado-en-mexico"; exit 0; }
exit 0
EOF

cat >"$BIN/curl" <<'EOF'
#!/usr/bin/env bash
# Captura el texto del Telegram en vez de enviarlo.
for i in "$@"; do [ "$VISTO" = "1" ] && { printf '%s\n' "${i#text=}" >>"$TG_CAPTURA"; VISTO=0; }
  [ "$i" = "--data-urlencode" ] && VISTO=1 || true
done
exit 0
EOF
sed -i '2i VISTO=0' "$BIN/curl"
chmod +x "$BIN"/*

# ── arnés ─────────────────────────────────────────────────────────────────
correr(){  # $1=modo openclaw  $2=modo gh → imprime "rc|senal|telegram"
  local dir="$BASE/caso-$RANDOM"; mkdir -p "$dir/repo"
  printf '{"fecha":"22-SEP-2026","pdfs":["/tmp/a.pdf"]}' >"$dir/pendiente-conciliar.json"
  : >"$dir/telegram.env"; printf 'TG_TOKEN=x\nTG_CHAT_ID=1\n' >"$dir/telegram.env"
  local cap="$dir/tg.txt"; : >"$cap"
  local rc
  PATH="$BIN:$PATH" DCAM_DIR="$dir" DCAM_TG_ENV="$dir/telegram.env" \
    DOBLE_OPENCLAW="$1" DOBLE_GH="$2" TG_CAPTURA="$cap" \
    bash "$SCRIPT" >/dev/null 2>&1
  rc=$?
  local senal="ninguna"
  [ -f "$dir/pendiente-conciliar.json" ] && senal="viva"
  [ -f "$dir/pendiente-conciliar.json.fallida" ] && senal="fallida"
  printf '%s|%s|%s' "$rc" "$senal" "$(tr '\n' ' ' <"$cap")"
}

verificar(){  # $1=nombre $2=obtenido $3=rc esperado $4=senal esperada $5=patrón telegram ('-' = ninguno)
  local rc="${2%%|*}" resto="${2#*|}"; local senal="${resto%%|*}" tg="${resto#*|}"
  local ok=1
  [ "$rc" = "$3" ] || { echo "  ✗ rc: esperaba $3, obtuve $rc"; ok=0; }
  [ "$senal" = "$4" ] || { echo "  ✗ senal: esperaba $4, obtuve $senal"; ok=0; }
  if [ "$5" = "-" ]; then
    [ -z "${tg// /}" ] || { echo "  ✗ telegram: esperaba NINGUNO, obtuve: $tg"; ok=0; }
  else
    printf '%s' "$tg" | grep -q "$5" || { echo "  ✗ telegram: esperaba /$5/, obtuve: $tg"; ok=0; }
  fi
  if [ "$ok" = 1 ]; then echo "  ✔ $1"; else echo "  ✗ $1"; FALLOS=$((FALLOS+1)); fi
}

echo "conciliar.sh — pruebas"

# 1. Flujo feliz: veredicto ok. Sin Telegram (el centinela avisa del PR).
verificar "éxito firmado: rc=0, senal borrada, sin Telegram" \
  "$(correr ok con_pr)" 0 ninguna -

# 2. Fallo declarado: se le cree al subagente aunque haya PR.
verificar "fallo declarado: avisa error y guarda .fallida" \
  "$(correr fallo con_pr)" 1 fallida "falló"

# 3. EL BUG DEL 22-SEP: canal roto pero trabajo hecho.
verificar "sin veredicto + PR en GitHub: ÉXITO, no alarma" \
  "$(correr reventado con_pr)" 0 ninguna "Inventario conciliado"

# 4. Canal roto y además sin PR: sí es fallo de verdad.
verificar "sin veredicto + sin PR: falla y avisa" \
  "$(correr reventado sin_pr)" 1 fallida "no hay PR abierto"

# 5. El aviso del caso 3 NO debe decir que falló.
SALIDA3="$(correr reventado con_pr)"
if printf '%s' "${SALIDA3##*|}" | grep -q "NO conciliado"; then
  echo "  ✗ el aviso sin-firma no debe decir 'NO conciliado'"; FALLOS=$((FALLOS+1))
else
  echo "  ✔ el aviso sin-firma no alarma"
fi

echo
[ "$FALLOS" = 0 ] && { echo "✔ todo en verde"; exit 0; } || { echo "✗ $FALLOS fallo(s)"; exit 1; }
