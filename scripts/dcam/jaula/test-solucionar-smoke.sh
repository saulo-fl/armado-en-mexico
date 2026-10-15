#!/usr/bin/env bash
# Ponytail check de solucionar.sh SIN Docker/APOLO real: un `docker` falso al
# frente del PATH simula el `docker run` y así se prueba el contrato de stdout
# y la validación de argumentos en HEFESTO/Windows. No se añade a npm test (es
# infra, no Node); se corre a mano: bash scripts/dcam/jaula/test-solucionar-smoke.sh
set -euo pipefail
cd "$(dirname "$0")/../../.."
SCRIPT="$(pwd)/scripts/dcam/jaula/solucionar.sh"

FAIL=0
ok()  { echo "OK   $1"; }
mal() { echo "FALLA $1"; FAIL=1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# --- repo falso que hace de $DCAM_DIR/repo, con la rama que solucionar.sh clona ---
export DCAM_DIR="$TMP/dcam"
mkdir -p "$DCAM_DIR"
git init --quiet "$DCAM_DIR/repo"
git -C "$DCAM_DIR/repo" -c user.email=t@t -c user.name=t commit --quiet --allow-empty -m init
git -C "$DCAM_DIR/repo" branch --quiet "auto/inventario-13-OCT-2026"

# --- MAIN falso: solo necesita existir para la ruta -v, el docker falso no la usa ---
MAIN="$TMP/main"
mkdir -p "$MAIN/scripts/dcam/jaula" "$MAIN/.claude/agents"
: > "$MAIN/scripts/dcam/jaula/dentro.sh"
: > "$MAIN/.claude/agents/solucionador-dcam.md"

# --- W con la entrada mínima que solucionar.sh copia a la jaula ---
W="$TMP/w"
mkdir -p "$W"
echo "motivo de prueba" > "$W/motivo.txt"
echo "prompt de prueba" > "$W/prompt.txt"

FAKEBIN="$TMP/bin"
mkdir -p "$FAKEBIN"

# (a) fecha inválida -> exit 2, sin tocar nada. El regex de solucionar.sh solo
# exige el FORMATO YYYY-MM-DD (no valida que el mes/día exista); una fecha con
# formato roto de verdad es "2026/10/13".
set +e
OUT="$(bash "$SCRIPT" "2026/10/13" "auto/inventario-13-OCT-2026" "$W" "$MAIN" 2>"$TMP/err-a")"
RC=$?
set -e
[ "$RC" -eq 2 ] && [ -z "$OUT" ] && ok "(a) fecha inválida -> exit 2, stdout vacío" \
  || mal "(a) fecha inválida: RC=$RC OUT='$OUT'"

# (b) rama inválida -> exit 2
set +e
OUT="$(bash "$SCRIPT" "2026-10-13" "ramaCualquiera" "$W" "$MAIN" 2>"$TMP/err-b")"
RC=$?
set -e
[ "$RC" -eq 2 ] && [ -z "$OUT" ] && ok "(b) rama inválida -> exit 2, stdout vacío" \
  || mal "(b) rama inválida: RC=$RC OUT='$OUT'"

# (c) docker falso que simula éxito: crea agente.json no vacío en $W/salida (el
# 6º argumento posicional del docker run real -v "$W/salida:..." es el que se
# vuelve a mapear aquí vía la propia variable de entorno que exportamos).
cat > "$FAKEBIN/docker" <<'EOF'
#!/usr/bin/env bash
# docker falso de éxito: a "run" le sigue, entre los argumentos, la ruta real
# de W/salida como "<ruta>:/trabajo/salida:rw" — la extraemos y escribimos ahí.
for a in "$@"; do
  case "$a" in
    *:/trabajo/salida:rw) echo '{"ok":true}' > "${a%%:/trabajo/salida:rw}/agente.json" ;;
  esac
done
exit 0
EOF
chmod +x "$FAKEBIN/docker"

JAULA_ANTES="$(find /tmp -maxdepth 1 -name 'dcam-jaula-*' 2>/dev/null | wc -l)"
set +e
OUT="$(PATH="$FAKEBIN:$PATH" bash "$SCRIPT" "2026-10-13" "auto/inventario-13-OCT-2026" "$W" "$MAIN" 2>"$TMP/err-c")"
RC=$?
set -e
if [ "$RC" -eq 0 ] && [ -n "$OUT" ] && [ "$(printf '%s\n' "$OUT" | wc -l)" -eq 1 ] && [ -d "$OUT" ] && [[ "$OUT" == */repo ]]; then
  ok "(c) éxito -> stdout es exactamente la ruta de \$JAULA/repo ($OUT)"
else
  mal "(c) éxito: RC=$RC OUT='$OUT'"
fi
# $JAULA no debe haber sido tocado/borrado por ningún trap de limpieza.
if [ -n "${OUT:-}" ] && [ -d "$OUT" ]; then
  ok "(c) \$JAULA/repo sigue existiendo tras la corrida (ningún trap lo borró)"
else
  mal "(c) \$JAULA/repo ya no existe tras la corrida"
fi
JAULA_RUTA_C="$OUT"

# (d) docker falso que simula fallo (rc != 0, no escribe agente.json) -> exit 1, stdout vacío
rm -f "$W/salida/agente.json"   # limpia el agente.json de éxito que dejó (c)
cat > "$FAKEBIN/docker" <<'EOF'
#!/usr/bin/env bash
exit 1
EOF
chmod +x "$FAKEBIN/docker"
set +e
OUT="$(PATH="$FAKEBIN:$PATH" bash "$SCRIPT" "2026-10-13" "auto/inventario-13-OCT-2026" "$W" "$MAIN" 2>"$TMP/err-d")"
RC=$?
set -e
[ "$RC" -eq 1 ] && [ -z "$OUT" ] && ok "(d) docker run falla -> exit 1, stdout vacío" \
  || mal "(d) docker run falla: RC=$RC OUT='$OUT'"

# (d2) docker falso con rc=0 pero SIN escribir agente.json (o vacío) -> también exit 1
rm -f "$W/salida/agente.json"
cat > "$FAKEBIN/docker" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
chmod +x "$FAKEBIN/docker"
set +e
OUT="$(PATH="$FAKEBIN:$PATH" bash "$SCRIPT" "2026-10-13" "auto/inventario-13-OCT-2026" "$W" "$MAIN" 2>"$TMP/err-d2")"
RC=$?
set -e
[ "$RC" -eq 1 ] && [ -z "$OUT" ] && ok "(d2) rc=0 pero agente.json vacío/ausente -> exit 1, stdout vacío" \
  || mal "(d2) rc=0 sin agente.json: RC=$RC OUT='$OUT'"

# Limpieza SOLO de la $JAULA que este test sí creó (ronda de arreglo 1/5, punto
# 14): un `find /tmp -name 'dcam-jaula-*' ... -exec rm -rf` barría CUALQUIER
# carpeta con ese prefijo — si esto se corre en APOLO mientras un pipeline real
# está en medio de una corrida de verdad, le borraba la suya. Los únicos $JAULA
# reales de este test son el de (c) (éxito, se queda y hay que limpiarlo a
# mano) — los de (d)/(d2) ya los limpia el propio `solucionar.sh` en su camino
# de fallo (ver el fix de huérfanos en ese script), así que no hay nada más que
# rastrear ni borrar aquí.
rm -rf "$JAULA_RUTA_C" 2>/dev/null || true

exit $FAIL
