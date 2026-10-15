#!/usr/bin/env bash
# Juez de host, SIN modelo/LLM, para scripts/dcam/jaula/compuertas.sh. Arma una "jaula"
# falsa (un clon con cambios ya hechos a mano, sin ningún agente de por medio) a partir
# de la rama real de este repo y comprueba que compuertas.sh aplica lo legítimo y
# rechaza/ignora todo lo demás, SIEMPRE sin commit cuando debe rechazar.
#
# Requiere Docker con la imagen dcam-jaula:1 (Fase 2) y corre en Linux (APOLO) — el
# paso 8 de compuertas.sh (las compuertas en contenedor) no es reproducible en
# HEFESTO/Windows. `npm ci` necesita red saliente normal del host (no la jaula).
set -uo pipefail

RAIZ="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "corre esto dentro de un checkout git" >&2; exit 2; }
cd "$RAIZ"
COMPUERTAS="$RAIZ/scripts/dcam/jaula/compuertas.sh"
[ -x "$COMPUERTAS" ] || { echo "no encuentro $COMPUERTAS ejecutable" >&2; exit 2; }

TMP="$(mktemp -d "${TMPDIR:-/tmp}/dcam-test-compuertas-XXXXXX")"
trap 'rm -rf "$TMP"' EXIT

FALLOS=0
ok()  { echo "OK    $1"; }
mal() { echo "FALLA $1"; FALLOS=1; }

FECHA_ISO="2026-01-01"
RAMA="auto/inventario-TEST"

echo "== preparando fixtures en $TMP (red del host, no de la jaula) =="
export DCAM_DIR="$TMP/dcam"
mkdir -p "$DCAM_DIR"
git clone --quiet "file://$RAIZ" "$DCAM_DIR/repo"
git -C "$DCAM_DIR/repo" checkout --quiet -b "$RAMA"
git -C "$DCAM_DIR/repo" remote remove origin

MAIN="$TMP/main"
git clone --quiet --depth 1 --branch main "file://$RAIZ" "$MAIN"
npm ci --ignore-scripts --prefix "$MAIN" >/dev/null 2>&1 || { echo "npm ci en MAIN falló" >&2; exit 2; }

WORKDIR="$TMP/w"
mkdir -p "$WORKDIR"

sha_head() { git -C "$DCAM_DIR/repo" rev-parse HEAD; }
correr() {  # $1 = carpeta DIR-JAULA-REPO ya preparada
  "$COMPUERTAS" "$FECHA_ISO" "$RAMA" "$WORKDIR" "$1" "$MAIN"
}
jaula_desde_rama() {  # arma un clon limpio de la rama para mutar a mano (sin agente real)
  local d="$TMP/jaula-$RANDOM"
  git clone --quiet --no-hardlinks "$DCAM_DIR/repo" "$d"
  echo "$d"
}

# --- (a) cambio legítimo de datos: compuertas pasa y commitea SOLO esa ruta ---
# Deliberadamente NO es una ficha nueva: una alta de verdad también necesita su
# liga (scripts/ligas-armas.json) para que resembrar-vigia.test.mjs no la vea como
# "arma que existe solo en D1" — eso es un fallo real de la fixture, no de
# compuertas.sh. Cambiar un campo de una ficha YA existente es el "cambio legítimo
# de datos" más simple que no dispara ninguna otra compuerta por accidente.
ANTES="$(sha_head)"
J="$(jaula_desde_rama)"
node -e '
  const fs = require("fs");
  const p = process.argv[1];
  let s = fs.readFileSync(p, "utf8");
  if (!s.includes("2850g")) { console.error("no encontré el campo de peso 2850g en " + p); process.exit(1); }
  s = s.replace("2850g", "2851g");
  fs.writeFileSync(p, s);
' "$J/src/data/data.js"
if correr "$J" >"$TMP/log-a.txt" 2>&1; then
  DESPUES="$(sha_head)"
  CAMBIADOS="$(git -C "$DCAM_DIR/repo" diff --name-only "$ANTES" "$DESPUES")"
  if [ "$DESPUES" != "$ANTES" ] && [ "$CAMBIADOS" = "src/data/data.js" ]; then
    ok "(a) cambio legítimo: compuertas pasó y commiteó solo src/data/data.js"
  else
    mal "(a) cambio legítimo: pasó pero el commit no es el esperado ($CAMBIADOS)"
  fi
else
  mal "(a) cambio legítimo: compuertas.sh rechazó (ver $TMP/log-a.txt)"
  tail -20 "$TMP/log-a.txt"
fi
rm -rf "$J"

# --- (b) un archivo PERMITIDO sustituido por un symlink a /etc/passwd ---
ANTES="$(sha_head)"
J="$(jaula_desde_rama)"
rm -f "$J/src/data/data.js"
ln -s /etc/passwd "$J/src/data/data.js"
if correr "$J" >"$TMP/log-b.txt" 2>&1; then
  mal "(b) symlink a /etc/passwd: compuertas.sh NO debió salir 0"
else
  DESPUES="$(sha_head)"
  if [ "$DESPUES" = "$ANTES" ]; then
    ok "(b) symlink a /etc/passwd: abortó sin commit"
  else
    mal "(b) symlink a /etc/passwd: abortó pero SÍ hubo un commit nuevo"
  fi
fi
rm -rf "$J"

# --- (c) un archivo NO permitido modificado (vigia.py): se ignora, nunca sale de ahí ---
ANTES="$(sha_head)"
J="$(jaula_desde_rama)"
echo "# inyección de prueba, no debería llegar a ningún lado" >> "$J/scripts/dcam/vigia.py"
if correr "$J" >"$TMP/log-c.txt" 2>&1; then
  DESPUES="$(sha_head)"
  if [ "$DESPUES" = "$ANTES" ] && ! grep -q "inyección de prueba" "$DCAM_DIR/repo/scripts/dcam/vigia.py"; then
    ok "(c) archivo no permitido (vigia.py): se ignoró, sin commit y sin tocar el REPO real"
  else
    mal "(c) archivo no permitido (vigia.py): algo cambió en el REPO real (no debía)"
  fi
else
  mal "(c) archivo no permitido (vigia.py): compuertas.sh no debía rechazar solo por esto (ver $TMP/log-c.txt)"
  tail -20 "$TMP/log-c.txt"
fi
rm -rf "$J"

# --- (d) fetch(1) inyectado en data.js: el validador rechaza, sin commit ---
ANTES="$(sha_head)"
J="$(jaula_desde_rama)"
printf '\nfetch(1);\n' >> "$J/src/data/data.js"
if correr "$J" >"$TMP/log-d.txt" 2>&1; then
  mal "(d) fetch(1) en data.js: compuertas.sh NO debió salir 0"
else
  DESPUES="$(sha_head)"
  if [ "$DESPUES" = "$ANTES" ] && grep -q "estructura del código cambió\|rechazó" "$TMP/log-d.txt"; then
    ok "(d) fetch(1) en data.js: el validador rechazó, sin commit"
  else
    mal "(d) fetch(1) en data.js: abortó pero sin la razón esperada o con commit"
  fi
fi
rm -rf "$J"

# --- (e) src/data (directorio INTERMEDIO) sustituido por un symlink a un directorio
#     externo con un data.js "válido" — el hueco que solo mira el último componente ---
ANTES="$(sha_head)"
J="$(jaula_desde_rama)"
EXTERNO="$TMP/externo-$RANDOM"
mkdir -p "$EXTERNO"
cp "$J/src/data/data.js" "$EXTERNO/data.js"
echo '// contenido de fuera de la jaula, no debería poder entrar por aquí' >> "$EXTERNO/data.js"
rm -rf "$J/src/data"
ln -s "$EXTERNO" "$J/src/data"
if correr "$J" >"$TMP/log-e.txt" 2>&1; then
  mal "(e) src/data sustituido por symlink a directorio externo: compuertas.sh NO debió salir 0"
else
  DESPUES="$(sha_head)"
  if [ "$DESPUES" = "$ANTES" ] && grep -q "enlace\|no es un archivo regular" "$TMP/log-e.txt"; then
    ok "(e) src/data sustituido por symlink a directorio externo: abortó sin commit (componente intermedio detectado)"
  else
    mal "(e) src/data sustituido por symlink a directorio externo: abortó pero sin la razón esperada, o con commit"
  fi
fi
rm -rf "$J"

# --- (f) timeout real (ronda de arreglo 1/5, punto 2; corregido en la 2/5 —
#     "test (f) no muerde"): un dentro.sh falso que IGNORA SIGTERM y nunca
#     termina solo (`trap '' TERM` + loop infinito) — un `sleep 300` normal SÍ
#     muere con el SIGTERM que `timeout`/`--init` reenvían, así que esa versión
#     pasaba por la razón EQUIVOCADA (el proceso se portaba bien, no porque el
#     `docker rm -f` del trap de solucionar.sh hiciera algo). Con un proceso que
#     de verdad ignora la señal, solo un `docker rm -f` (SIGKILL del daemon,
#     nunca del `timeout` del host, que solo llega al cliente `docker`) puede
#     pararlo — eso es lo que de verdad se está probando. ---
MAIN_LENTO="$TMP/main-lento"
cp -a "$MAIN" "$MAIN_LENTO"
cat > "$MAIN_LENTO/scripts/dcam/jaula/dentro.sh" <<'EOF'
#!/usr/bin/env bash
trap '' TERM
while :; do sleep 1; done
EOF
W_F="$TMP/w-f"
mkdir -p "$W_F"
echo "motivo de prueba" > "$W_F/motivo.txt"
echo "prompt de prueba" > "$W_F/prompt.txt"
set +e
SOLUCIONADOR_TIMEOUT=3s SOLUCIONADOR_KILL_AFTER=2 \
  timeout 90 bash "$RAIZ/scripts/dcam/jaula/solucionar.sh" "$FECHA_ISO" "$RAMA" "$W_F" "$MAIN_LENTO" >/dev/null 2>"$TMP/log-f.txt"
RC_F=$?
set -e
sleep 2  # margen para que el daemon de Docker termine de limpiar tras el SIGKILL
RESTANTES_F="$(docker ps -a --filter "name=dcam-solucionador-${FECHA_ISO}" -q)"
if [ "$RC_F" -eq 124 ]; then
  mal "(f) timeout: el timeout de la PRUEBA (90s) venció — solucionar.sh no terminó ni con su propio timeout interno"
elif [ -n "$RESTANTES_F" ]; then
  mal "(f) timeout: quedó un contenedor dcam-solucionador-* corriendo tras el timeout interno"
else
  ok "(f) timeout: ningún contenedor dcam-solucionador-* quedó corriendo tras el timeout interno (solucionar.sh RC=$RC_F)"
fi
rm -rf "$W_F" "$MAIN_LENTO"

# --- (i) un subdirectorio 700 que la jaula crea en /trabajo/salida se borra
#     sin problema en el SIGUIENTE intento con el mismo WORKDIR (ronda de
#     arreglo 2/5, "Important nuevo": con un uid fijo ajeno al host, el host no
#     podía atravesar/borrar ese subdirectorio — `rm -rf "$W/salida"` del
#     arranque de solucionar.sh fallaba bajo `set -e` y el script abortaba
#     ANTES del `docker run`, con el mensaje engañoso "el agente no produjo
#     resultado". Con el uid del host (esta ronda), ese subdirectorio ya es
#     del mismo usuario que corre el pipeline. ---
MAIN_RESTRICTIVO="$TMP/main-restrictivo"
cp -a "$MAIN" "$MAIN_RESTRICTIVO"
cat > "$MAIN_RESTRICTIVO/scripts/dcam/jaula/dentro.sh" <<'EOF'
#!/usr/bin/env bash
mkdir -p /trabajo/salida/sub
chmod 700 /trabajo/salida/sub
echo '{"dato":"de prueba"}' > /trabajo/salida/sub/archivo.json
echo '{"ok":true}' > /trabajo/salida/agente.json
EOF
W_I="$TMP/w-i"
mkdir -p "$W_I"
echo "motivo de prueba" > "$W_I/motivo.txt"
echo "prompt de prueba" > "$W_I/prompt.txt"

set +e
RUTA_I1="$(timeout 120 bash "$RAIZ/scripts/dcam/jaula/solucionar.sh" "$FECHA_ISO" "$RAMA" "$W_I" "$MAIN_RESTRICTIVO" 2>"$TMP/log-i1.txt")"
RC_I1=$?
set -e
if [ "$RC_I1" -ne 0 ]; then
  mal "(i) subdirectorio 700 en salida/: la primera corrida ya falló (ver $TMP/log-i1.txt)"
  tail -20 "$TMP/log-i1.txt"
else
  rm -rf "$(dirname "$RUTA_I1")"
  SUBDIR_I="$W_I/salida/sub"
  if [ ! -d "$SUBDIR_I" ]; then
    mal "(i) subdirectorio 700 en salida/: la jaula no lo dejó donde se esperaba ($SUBDIR_I)"
  else
    # El segundo intento, con el MISMO WORKDIR, es la prueba real: su propio
    # `rm -rf "$W/salida"` de arranque tiene que poder borrar $SUBDIR_I.
    set +e
    RUTA_I2="$(timeout 120 bash "$RAIZ/scripts/dcam/jaula/solucionar.sh" "$FECHA_ISO" "$RAMA" "$W_I" "$MAIN_RESTRICTIVO" 2>"$TMP/log-i2.txt")"
    RC_I2=$?
    set -e
    if [ "$RC_I2" -eq 0 ]; then
      ok "(i) subdirectorio 700 en salida/: el siguiente intento con el mismo WORKDIR corrió de verdad, sin abortar por permisos"
      rm -rf "$(dirname "$RUTA_I2")"
    else
      mal "(i) subdirectorio 700 en salida/: el segundo intento abortó (ver $TMP/log-i2.txt)"
      tail -20 "$TMP/log-i2.txt"
    fi
  fi
fi
rm -rf "$W_I" "$MAIN_RESTRICTIVO"

# --- (g) solucion.json como FIFO (ronda de arreglo 1/5, punto 3): no debe
#     colgar las compuertas (verificar-cierre.py, dentro del contenedor, abriría
#     el FIFO y se quedaría esperando para siempre con el flock del pipeline
#     tomado) — debe rechazar rápido, sin commit. ---
ANTES="$(sha_head)"
J="$(jaula_desde_rama)"
node -e '
  const fs = require("fs");
  const p = process.argv[1];
  let s = fs.readFileSync(p, "utf8");
  if (!s.includes("1020mm")) { console.error("no encontré 1020mm en " + p); process.exit(1); }
  s = s.replace("1020mm", "1021mm");
  fs.writeFileSync(p, s);
' "$J/src/data/data.js"
mkdir -p "$WORKDIR/salida"
rm -f "$WORKDIR/salida/solucion.json"
mkfifo "$WORKDIR/salida/solucion.json"
set +e
timeout 60 "$COMPUERTAS" "$FECHA_ISO" "$RAMA" "$WORKDIR" "$J" "$MAIN" >"$TMP/log-g.txt" 2>&1
RC_G=$?
set -e
DESPUES="$(sha_head)"
if [ "$RC_G" -eq 124 ]; then
  mal "(g) FIFO en solucion.json: compuertas.sh SE COLGÓ (lo mató el timeout de la prueba, 60s)"
elif [ "$DESPUES" != "$ANTES" ]; then
  mal "(g) FIFO en solucion.json: compuertas.sh commiteó, no debía"
else
  ok "(g) FIFO en solucion.json: no se colgó, rechazó rápido y sin commit (RC=$RC_G)"
fi
rm -f "$WORKDIR/salida/solucion.json"
rm -rf "$J"

# --- (h) un data.js con +x dentro de la jaula no debe llegar +x al commit real
#     (ronda de arreglo 1/5, punto 6: antes `cp --preserve=mode` lo arrastraba) ---
ANTES="$(sha_head)"
J="$(jaula_desde_rama)"
node -e '
  const fs = require("fs");
  const p = process.argv[1];
  let s = fs.readFileSync(p, "utf8");
  if (!s.includes("2851g")) { console.error("no encontré 2851g en " + p + " (se esperaba tras el caso (a))"); process.exit(1); }
  s = s.replace("2851g", "2852g");
  fs.writeFileSync(p, s);
' "$J/src/data/data.js"
chmod +x "$J/src/data/data.js"
if correr "$J" >"$TMP/log-h.txt" 2>&1; then
  MODO_FINAL="$(git -C "$DCAM_DIR/repo" ls-files -s src/data/data.js | awk '{print $1}')"
  if [ "$MODO_FINAL" = "100644" ]; then
    ok "(h) data.js +x en la jaula: el commit real queda en 100644, no 100755"
  else
    mal "(h) data.js +x en la jaula: el commit quedó en modo $MODO_FINAL (se esperaba 100644)"
  fi
else
  mal "(h) data.js +x en la jaula: compuertas.sh rechazó un cambio legítimo (ver $TMP/log-h.txt)"
  tail -20 "$TMP/log-h.txt"
fi
rm -rf "$J"

echo "=================================================="
if [ "$FALLOS" -eq 0 ]; then
  echo "test-compuertas.sh: TODO OK"
else
  echo "test-compuertas.sh: HAY FALLAS — ver arriba"
fi
exit "$FALLOS"
