#!/usr/bin/env bash
# Juez: con solucion.json `ok` != true el PR NO se marca ready y el aviso dice «en parte»;
# con ok:true se queda el comportamiento de siempre. Corre la COLA REAL del pipeline
# (desde `resumen_seguro()` hasta el final) con git/gh/telegram sustituidos.
# Requiere jq y stat GNU (APOLO). Uso: bash test-cierre-borrador.sh
set -u
AQUI="$(cd "$(dirname "$0")" && pwd)"
PIPE="$AQUI/../conciliar-pipeline.sh"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
OK=0; MAL=0
bien(){ echo "  ok   $*"; OK=$((OK+1)); }
mal(){ echo "  MAL  $*"; MAL=$((MAL+1)); }

# Cola real: desde la definición de resumen_seguro hasta el final.
tr -d '\r' < "$PIPE" | sed -n '/^resumen_seguro() {/,$p' > "$TMP/cola.sh"
# cerrar_exito real, sin el bloque de update-ref (no aplica a «jaula»).
tr -d '\r' < "$PIPE" | sed -n '/^cerrar_exito() {/,/^}/p' > "$TMP/cerrar.sh"
[ -s "$TMP/cola.sh" ] && [ -s "$TMP/cerrar.sh" ] || { echo "no pude extraer las funciones"; exit 1; }

caso() { # $1 nombre, $2 contenido de solucion.json
  local d="$TMP/$1"; mkdir -p "$d/salida"; printf '%s' "$2" > "$d/salida/solucion.json"
  cat > "$d/run.sh" <<EOF
WORKDIR="$d"; FECHA="16-OCT-2026"; RAMA="rama"; GH_REPO="o/r"; SENAL="$d/senal"; LOG="$d/log"
log(){ echo "\$*" >> "$d/log"; }
falla(){ echo "FALLA \$*" >> "$d/log"; exit 1; }
telegram(){ echo "\$*" >> "$d/tg"; }
git(){ echo "git \$*" >> "$d/calls"; return 0; }
gh(){ echo "gh \$*" >> "$d/calls"; [ "\$2" = list ] && echo https://pr/1; return 0; }
source "$TMP/cerrar.sh"
source "$TMP/cola.sh"
EOF
  bash "$d/run.sh" >/dev/null 2>&1; echo "rc=$?" > "$d/rc"
}

JSON_F='{"ok":false,"ligas":[1],"altas":[],"pendiente":[1,2,3,4,5,6,7]}'
JSON_T='{"ok":true,"ligas":[1],"altas":[1,2],"pendiente":[]}'

caso f "$JSON_F"
grep -q 'git push' "$TMP/f/calls" && bien "ok:false: commit y push igual" || mal "ok:false: no empujó"
! grep -q 'gh pr ready' "$TMP/f/calls" && bien "ok:false: NO gh pr ready" || mal "ok:false: llamó gh pr ready"
grep -qF '⚠️ Solucionador (jaula) resolvió en parte 16-OCT-2026: Ligas: 1 · Altas: 0 · Pendientes: 7. El PR queda en borrador: revisa los pendientes.' "$TMP/f/tg" && bien "ok:false: aviso de borrador" || mal "ok:false: aviso: $(cat "$TMP/f/tg" 2>/dev/null)"
grep -q 'rc=0' "$TMP/f/rc" && bien "ok:false: rc=0" || mal "ok:false: $(cat "$TMP/f/rc")"

caso t "$JSON_T"
grep -q 'gh pr ready' "$TMP/t/calls" && bien "ok:true: gh pr ready" || mal "ok:true: no marcó ready"
grep -qF '🔧 Solucionador (jaula) resolvió 16-OCT-2026: Ligas: 1 · Altas: 2 · Pendientes: 0. Revisa la rama rama.' "$TMP/t/tg" && bien "ok:true: aviso de siempre" || mal "ok:true: aviso: $(cat "$TMP/t/tg" 2>/dev/null)"

caso a ''  # solucion.json vacío/ilegible: tratado como no-ok
! grep -q 'gh pr ready' "$TMP/a/calls" && bien "ilegible: NO gh pr ready" || mal "ilegible: llamó gh pr ready"

echo "$OK ok, $MAL mal"; [ "$MAL" -eq 0 ]
