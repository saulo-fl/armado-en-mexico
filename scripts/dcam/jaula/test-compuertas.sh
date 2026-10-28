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
# Volúmenes dcam-jaula-* que no existían al arrancar esta prueba (ronda de
# arreglo 4/5: solucionar.sh debe borrar siempre el suyo).
VOLUMENES_ANTES="$(docker volume ls -q --filter name=dcam-jaula- | sort)"
volumenes_jaula_nuevos() {
  comm -13 <(printf '%s\n' "$VOLUMENES_ANTES") <(docker volume ls -q --filter name=dcam-jaula- | sort) | grep . || true
}
# MAIN falso cuyo dentro.sh llega por stdin (la "jaula" sin agente real).
main_con_dentro() {  # $1 = carpeta destino, stdin = contenido de dentro.sh
  cp -a "$MAIN" "$1"
  cat > "$1/scripts/dcam/jaula/dentro.sh"
}
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
elif [ -n "$(volumenes_jaula_nuevos)" ]; then
  mal "(f) timeout: quedó vivo un volumen de la jaula: $(volumenes_jaula_nuevos)"
else
  ok "(f) timeout: ningún contenedor dcam-solucionador-* ni volumen dcam-jaula-* quedó vivo tras el timeout interno (solucionar.sh RC=$RC_F)"
fi
rm -rf "$W_F" "$MAIN_LENTO"

# --- (i) un subdirectorio 700 que la jaula crea en /trabajo/salida (ronda de
#     arreglo 2/5: con un uid ajeno, el `rm -rf "$W/salida"` del siguiente
#     intento abortaba). Desde la ronda 4/5 /trabajo/salida vive en el volumen
#     tmpfs: el subdirectorio NO llega al host (solo agente.json/solucion.json),
#     y el siguiente intento con el mismo WORKDIR corre igual. ---
MAIN_RESTRICTIVO="$TMP/main-restrictivo"
main_con_dentro "$MAIN_RESTRICTIVO" <<'EOF'
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
elif [ -e "$W_I/salida/sub" ] || [ ! -f "$W_I/salida/agente.json" ]; then
  mal "(i) subdirectorio 700 en salida/: llegó al host (o faltó agente.json): $(ls -la "$W_I/salida")"
else
  rm -rf "$(dirname "${RUTA_I1:?}")"
  set +e
  RUTA_I2="$(timeout 120 bash "$RAIZ/scripts/dcam/jaula/solucionar.sh" "$FECHA_ISO" "$RAMA" "$W_I" "$MAIN_RESTRICTIVO" 2>"$TMP/log-i2.txt")"
  RC_I2=$?
  set -e
  if [ "$RC_I2" -eq 0 ]; then
    ok "(i) subdirectorio 700 en salida/: se quedó en el volumen (no llegó al host) y el siguiente intento con el mismo WORKDIR corrió"
    rm -rf "$(dirname "${RUTA_I2:?}")"
  else
    mal "(i) subdirectorio 700 en salida/: el segundo intento abortó (ver $TMP/log-i2.txt)"
    tail -20 "$TMP/log-i2.txt"
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

# (Fase 3c, menor 6: ya no hay un `set +e` abierto de aquí al final; cada
# corrida que puede fallar lleva el suyo, como el resto de los casos.)
PERMITIDOS_T="$(cd "$MAIN" && node -e "import('./scripts/dcam/validar-parche-lib.mjs').then(m=>console.log([...m.PERMITIDOS].join('\n')))")"

# --- (j) la aserción "índice de $REPO fuera de PERMITIDOS" de compuertas.sh
#     (ronda de arreglo 3/5, punto 5) restaura el árbol de trabajo: $REPO llega
#     con una ruta NO permitida en el índice (solo en el índice: el árbol es
#     igual a HEAD) y la jaula trae un cambio legítimo de data.js. compuertas.sh
#     pasa todo, copia data.js a $REPO, ve el índice sucio y aborta. Después,
#     `git status --porcelain` vacío y cada ruta de PERMITIDOS igual a HEAD. ---
R="$DCAM_DIR/repo"
ANTES="$(sha_head)"
echo "# índice sucio de prueba" >> "$R/scripts/dcam/vigia.py"
git -C "$R" add scripts/dcam/vigia.py
git -C "$R" show HEAD:scripts/dcam/vigia.py > "$R/scripts/dcam/vigia.py"
J="$(jaula_desde_rama)"
node -e '
  const fs = require("fs");
  const p = process.argv[1];
  let s = fs.readFileSync(p, "utf8");
  if (!s.includes("2852g")) { console.error("no encontré 2852g en " + p + " (se esperaba tras el caso (h))"); process.exit(1); }
  fs.writeFileSync(p, s.replace("2852g", "2853g"));
' "$J/src/data/data.js" || mal "(j) fixture: no se pudo preparar el cambio legítimo de data.js"
if correr "$J" >"$TMP/log-j.txt" 2>&1; then
  mal "(j) índice fuera de PERMITIDOS: compuertas.sh NO debió salir 0"
else
  ESTADO_J="$(git -C "$R" status --porcelain)"
  DISTINTOS_J=""
  while IFS= read -r ruta; do
    [ -n "$ruta" ] || continue
    if git -C "$R" cat-file -e "HEAD:$ruta" 2>/dev/null; then
      git -C "$R" show "HEAD:$ruta" | cmp -s - "$R/$ruta" || DISTINTOS_J="$DISTINTOS_J $ruta"
    elif [ -e "$R/$ruta" ]; then
      DISTINTOS_J="$DISTINTOS_J $ruta"
    fi
  done <<< "$PERMITIDOS_T"
  if [ "$(sha_head)" = "$ANTES" ] && grep -q "fuera de PERMITIDOS" "$TMP/log-j.txt" \
     && [ -z "$ESTADO_J" ] && [ -z "$DISTINTOS_J" ]; then
    ok "(j) índice fuera de PERMITIDOS: abortó sin commit; status --porcelain vacío y las $(grep -c . <<< "$PERMITIDOS_T") rutas de PERMITIDOS iguales a HEAD"
  else
    mal "(j) índice fuera de PERMITIDOS: status='$ESTADO_J' distintas de HEAD='$DISTINTOS_J' (ver $TMP/log-j.txt)"
    tail -5 "$TMP/log-j.txt"
  fi
fi
rm -rf "$J"

# --- (k) tope de disco (ronda de arreglo 4/5): el agente intenta escribir 3 GB
#     en /trabajo/repo. El volumen tmpfs (2g por defecto) da ENOSPC dentro, la
#     jaula termina y limpia, y el disco del host casi no cambia. ---
MAIN_LLENO="$TMP/main-lleno"
main_con_dentro "$MAIN_LLENO" <<'EOF'
#!/usr/bin/env bash
dd if=/dev/zero of=/trabajo/repo/relleno bs=1M count=3072 2>&1 | tail -3
echo '{"ok":true}' > /trabajo/salida/agente.json
EOF
W_K="$TMP/w-k"
mkdir -p "$W_K"
echo "motivo de prueba" > "$W_K/motivo.txt"
echo "prompt de prueba" > "$W_K/prompt.txt"
usado() { df -B1 --output=used / | tail -1 | tr -d ' '; }
USADO_ANTES="$(usado)"
echo "$USADO_ANTES" > "$TMP/pico-k"
( while [ ! -e "$TMP/fin-k" ]; do
    u="$(usado)"; [ "$u" -gt "$(cat "$TMP/pico-k")" ] && echo "$u" > "$TMP/pico-k"; sleep 1
  done ) &
PID_MUESTREO=$!
INICIO_K=$SECONDS
set +e
RUTA_K="$(timeout 600 bash "$RAIZ/scripts/dcam/jaula/solucionar.sh" "$FECHA_ISO" "$RAMA" "$W_K" "$MAIN_LLENO" 2>"$TMP/log-k.txt")"
RC_K=$?
set -e
touch "$TMP/fin-k"; wait "$PID_MUESTREO"
USADO_DESPUES="$(usado)"
PICO_K="$(cat "$TMP/pico-k")"
DIF_K=$(( USADO_DESPUES - USADO_ANTES )); [ "$DIF_K" -lt 0 ] && DIF_K=$(( -DIF_K ))
SUBIDA_K=$(( PICO_K - USADO_ANTES ))
echo "    (k) solucionar.sh RC=$RC_K en $((SECONDS - INICIO_K))s; consola de la jaula:"
sed 's/^/      /' "$W_K/docker-solucionar.log" 2>/dev/null || true
echo "    (k) df -B1 --output=used /: antes=$USADO_ANTES después=$USADO_DESPUES |dif|=$DIF_K pico=$PICO_K (subida máx $SUBIDA_K)"
echo "    (k) docker volume ls (dcam-jaula-*) tras la corrida: '$(docker volume ls -q --filter name=dcam-jaula- | tr '\n' ' ')'"
if ! grep -q "No space left on device" "$W_K/docker-solucionar.log"; then
  mal "(k) tope de disco: no hubo ENOSPC dentro de la jaula"
elif [ "$DIF_K" -ge 104857600 ] || [ "$SUBIDA_K" -ge 104857600 ]; then
  mal "(k) tope de disco: el disco del host cambió 100 MB o más"
elif [ -n "$(volumenes_jaula_nuevos)" ]; then
  mal "(k) tope de disco: quedó vivo el volumen $(volumenes_jaula_nuevos)"
elif [ -n "$RUTA_K" ] && [ -e "$RUTA_K/relleno" ]; then
  mal "(k) tope de disco: el relleno llegó al host"
else
  ok "(k) tope de disco: ENOSPC dentro, el disco del host cambió < 100 MB (antes/después y pico) y no quedó volumen"
fi
[ -n "$RUTA_K" ] && rm -rf "$(dirname "$RUTA_K")"
rm -rf "$W_K" "$MAIN_LLENO"

# --- (l) un archivo de 6 MB en una ruta PERMITIDA + un cambio en un archivo NO
#     permitido: ninguno de los dos llega al host (la extracción aborta entera
#     por el tope de 5 MB). ---
MARCA="marca-extraccion-$$-$RANDOM"
MAIN_6MB="$TMP/main-6mb"
main_con_dentro "$MAIN_6MB" <<EOF
#!/usr/bin/env bash
{ echo "// $MARCA"; head -c 6291456 /dev/zero | tr '\\0' a; } > /trabajo/repo/src/data/data.js
echo "# $MARCA" >> /trabajo/repo/scripts/dcam/vigia.py
echo '{"ok":true}' > /trabajo/salida/agente.json
EOF
W_L="$TMP/w-l"
mkdir -p "$W_L"
echo "motivo de prueba" > "$W_L/motivo.txt"
echo "prompt de prueba" > "$W_L/prompt.txt"
set +e
RUTA_L="$(timeout 300 bash "$RAIZ/scripts/dcam/jaula/solucionar.sh" "$FECHA_ISO" "$RAMA" "$W_L" "$MAIN_6MB" 2>"$TMP/log-l.txt")"
RC_L=$?
set -e
echo "    (l) solucionar.sh RC=$RC_L; extractor: $(cat "$W_L/docker-extraer.log" 2>/dev/null)"
CON_MARCA_L="$(grep -rlF "$MARCA" "$W_L" "$R" /tmp/dcam-jaula-* 2>/dev/null || true)"
GRANDES_L="$( { find "$W_L" -size +5M; find /tmp -maxdepth 4 -path '/tmp/dcam-jaula-*' -size +5M; } 2>/dev/null || true)"
if [ "$RC_L" -eq 0 ]; then
  mal "(l) 6 MB en ruta permitida: solucionar.sh NO debió salir 0"
elif [ -n "$CON_MARCA_L" ] || [ -n "$GRANDES_L" ]; then
  mal "(l) 6 MB en ruta permitida: llegó algo al host: $CON_MARCA_L $GRANDES_L"
elif [ -n "$(volumenes_jaula_nuevos)" ]; then
  mal "(l) 6 MB en ruta permitida: quedó vivo el volumen $(volumenes_jaula_nuevos)"
else
  ok "(l) 6 MB en ruta permitida + archivo no permitido: la extracción abortó y ninguno de los dos llegó al host"
fi
[ -n "$RUTA_L" ] && rm -rf "$(dirname "$RUTA_L")"
rm -rf "$W_L" "$MAIN_6MB"

# --- (m) archivo NO permitido + archivo nuevo fuera de la lista + un cambio
#     legítimo de data.js: la corrida sale bien, al host llegan SOLO rutas de
#     PERMITIDOS (con el cambio legítimo) y solucion.json. ---
MAIN_M="$TMP/main-m"
main_con_dentro "$MAIN_M" <<EOF
#!/usr/bin/env bash
echo "# $MARCA" >> /trabajo/repo/scripts/dcam/vigia.py
echo "$MARCA" > /trabajo/repo/no-permitido.txt
sed -i 's/1020mm/1021mm/' /trabajo/repo/src/data/data.js
echo '{"ligas":[],"altas":[],"pendiente":[]}' > /trabajo/salida/solucion.json
echo '{"ok":true}' > /trabajo/salida/agente.json
EOF
W_M="$TMP/w-m"
mkdir -p "$W_M"
echo "motivo de prueba" > "$W_M/motivo.txt"
echo "prompt de prueba" > "$W_M/prompt.txt"
set +e
RUTA_M="$(timeout 300 bash "$RAIZ/scripts/dcam/jaula/solucionar.sh" "$FECHA_ISO" "$RAMA" "$W_M" "$MAIN_M" 2>"$TMP/log-m.txt")"
RC_M=$?
set -e
if [ "$RC_M" -ne 0 ] || [ -z "$RUTA_M" ]; then
  mal "(m) no permitidos: solucionar.sh falló (RC=$RC_M, ver $TMP/log-m.txt)"
  tail -5 "$TMP/log-m.txt"
else
  EXTRAIDOS_M="$(cd "$RUTA_M" && find . -type f -o -type l | sed 's|^\./||' | sort)"
  FUERA_M="$(comm -23 <(printf '%s\n' "$EXTRAIDOS_M") <(printf '%s\n' "$PERMITIDOS_T" | sort))"
  CON_MARCA_M="$(grep -rlF "$MARCA" "$RUTA_M" "$W_M" "$R" 2>/dev/null || true)"
  echo "    (m) extraído al host: $(grep -c . <<< "$EXTRAIDOS_M") archivos; salida: $(ls "$W_M/salida" | tr '\n' ' ')"
  if [ -n "$FUERA_M" ] || [ -n "$CON_MARCA_M" ]; then
    mal "(m) no permitidos: llegó al host algo fuera de PERMITIDOS: $FUERA_M $CON_MARCA_M"
  elif ! grep -q "1021mm" "$RUTA_M/src/data/data.js" || [ ! -f "$W_M/salida/solucion.json" ]; then
    mal "(m) no permitidos: no llegó el cambio legítimo de data.js o solucion.json"
  elif [ -n "$(volumenes_jaula_nuevos)" ]; then
    mal "(m) no permitidos: quedó vivo el volumen $(volumenes_jaula_nuevos)"
  else
    ok "(m) no permitidos: al host llegaron solo rutas de PERMITIDOS (con el cambio legítimo) y solucion.json"
  fi
  rm -rf "$(dirname "$RUTA_M")"
fi
rm -rf "$W_M" "$MAIN_M"

# --- (n) Fase 3c (menor 5): de punta a punta sin modelo. Una jaula falsa hace un
#     cambio legítimo de data.js y toca un archivo no permitido; solucionar.sh
#     extrae y compuertas.sh consume ESE directorio extraído (sin .git, solo
#     PERMITIDOS): pasa y commitea solo src/data/data.js. ---
MAIN_N="$TMP/main-n"
main_con_dentro "$MAIN_N" <<'EOF'
#!/usr/bin/env bash
sed -i 's/2852g/2853g/' /trabajo/repo/src/data/data.js
echo "# no permitido" >> /trabajo/repo/scripts/dcam/vigia.py
echo '{"ok":true}' > /trabajo/salida/agente.json
EOF
echo "motivo de prueba" > "$WORKDIR/motivo.txt"
echo "prompt de prueba" > "$WORKDIR/prompt.txt"
ANTES="$(sha_head)"
set +e
RUTA_N="$(timeout 300 bash "$RAIZ/scripts/dcam/jaula/solucionar.sh" "$FECHA_ISO" "$RAMA" "$WORKDIR" "$MAIN_N" 2>"$TMP/log-n1.txt")"
RC_N=$?
set -e
if [ "$RC_N" -ne 0 ] || [ -z "$RUTA_N" ]; then
  mal "(n) extracción -> compuertas: solucionar.sh falló (RC=$RC_N, ver $TMP/log-n1.txt)"
  tail -5 "$TMP/log-n1.txt"
elif [ -e "$RUTA_N/.git" ] || [ -e "$RUTA_N/scripts/dcam/vigia.py" ]; then
  mal "(n) extracción -> compuertas: lo extraído trae .git o un archivo no permitido"
elif correr "$RUTA_N" >"$TMP/log-n2.txt" 2>&1; then
  CAMBIADOS="$(git -C "$DCAM_DIR/repo" diff --name-only "$ANTES" "$(sha_head)")"
  if [ "$(sha_head)" != "$ANTES" ] && [ "$CAMBIADOS" = "src/data/data.js" ] \
     && [[ "$(git -C "$DCAM_DIR/repo" show HEAD:src/data/data.js)" == *2853g* ]]; then   # sin `| grep -q`: con pipefail, el SIGPIPE de git lo daría por falso
    ok "(n) extracción -> compuertas: compuertas.sh pasó sobre lo extraído y commiteó solo src/data/data.js (2852g -> 2853g)"
  else
    mal "(n) extracción -> compuertas: el commit no es el esperado ($CAMBIADOS)"
  fi
else
  mal "(n) extracción -> compuertas: compuertas.sh rechazó lo extraído (ver $TMP/log-n2.txt)"
  tail -20 "$TMP/log-n2.txt"
fi
[ -n "$RUTA_N" ] && rm -rf "$(dirname "$RUTA_N")"
rm -rf "$MAIN_N"

# --- (o) Fase 3d: agente.json es stream-json. Si pasa de 1 MB NO se descarta:
#     llegan sus últimos 1 MB (con la línea type=result) y queda el AVISO. ---
MAIN_O="$TMP/main-o"
main_con_dentro "$MAIN_O" <<'EOF'
#!/usr/bin/env bash
for i in $(seq 1 15000); do
  printf '{"type":"assistant","n":%d,"relleno":"%0100d"}\n' "$i" 0
done > /trabajo/salida/agente.json
echo '{"type":"result","subtype":"success","num_turns":7}' >> /trabajo/salida/agente.json
EOF
W_O="$TMP/w-o"
mkdir -p "$W_O"
echo "motivo de prueba" > "$W_O/motivo.txt"
echo "prompt de prueba" > "$W_O/prompt.txt"
set +e
RUTA_O="$(timeout 300 bash "$RAIZ/scripts/dcam/jaula/solucionar.sh" "$FECHA_ISO" "$RAMA" "$W_O" "$MAIN_O" 2>"$TMP/log-o.txt")"
RC_O=$?
set -e
TAM_O="$(stat -c%s "$W_O/salida/agente.json" 2>/dev/null || echo 0)"
ULTIMA_O="$(tail -n 1 "$W_O/salida/agente.json" 2>/dev/null || true)"
PRIMERA_O="$(head -n 1 "$W_O/salida/agente.json" 2>/dev/null || true)"
echo "    (o) solucionar.sh RC=$RC_O; agente.json en el host: $TAM_O bytes; aviso: $(grep -h AVISO "$TMP/log-o.txt" || true)"
if [ "$RC_O" -ne 0 ] || [ "$TAM_O" -le 0 ] || [ "$TAM_O" -gt 1048576 ]; then
  mal "(o) agente.json > 1 MB: RC=$RC_O, tamaño en el host $TAM_O (ver $TMP/log-o.txt)"
elif [ "$(jq -r .type <<< "$ULTIMA_O" 2>/dev/null)" != "result" ] || ! jq -e . <<< "$PRIMERA_O" >/dev/null 2>&1; then
  mal "(o) agente.json > 1 MB: la última línea no es type=result o la primera quedó partida"
elif ! grep -q "AVISO: 'agente.json' medía .* truncado" "$TMP/log-o.txt"; then
  mal "(o) agente.json > 1 MB: no quedó el AVISO del truncado en stderr"
else
  ok "(o) agente.json > 1 MB: truncado a sus últimos $TAM_O bytes, con type=result al final y el AVISO en stderr"
fi
[ -n "$RUTA_O" ] && rm -rf "$(dirname "$RUTA_O")"
rm -rf "$W_O" "$MAIN_O"

# --- (p) Revisión final, I1: los data-*.js que escribió el agente NUNCA se
#     ejecutan en el host. Un data.js con una expresión ejecutable que «pasó» el
#     validador (MAIN falso cuyo validador siempre dice ✔: el salto es SOLO de esta
#     prueba) y un WORKDIR con armas.json, para que corra el --update-ref de
#     referencias. El marcador en /tmp del HOST no debe aparecer; el control (el
#     comando que corría el host antes, en cerrar_exito) sí lo crea: la expresión
#     es real y la prueba muerde. ---
MARCADOR_P="/tmp/dcam-marcador-i1-$$-$RANDOM"
rm -f "$MARCADOR_P"
MAIN_P="$TMP/main-p"
cp -a "$MAIN" "$MAIN_P"
printf "console.log('✔ solo datos');\n" > "$MAIN_P/scripts/dcam/validar-parche.mjs"
W_P="$TMP/w-p"
mkdir -p "$W_P"
# armas.json = los renglones de la referencia de la rama, tal cual: mapeo limpio.
node -e '
  const r = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  console.log(JSON.stringify({ items: r.rows.map(({ fichaId, ...x }) => x) }));
' "$DCAM_DIR/repo/.claude/skills/conciliar-inventario/scripts/referencia-armas.json" > "$W_P/armas.json"
ANTES="$(sha_head)"
J="$(jaula_desde_rama)"
printf "\ntry { require('fs').writeFileSync('%s', 'x'); } catch (e) {}\n" "$MARCADOR_P" >> "$J/src/data/data.js"
"$COMPUERTAS" "$FECHA_ISO" "$RAMA" "$W_P" "$J" "$MAIN_P" >"$TMP/log-p.txt" 2>&1 && RC_P=0 || RC_P=$?
DESPUES="$(sha_head)"
CAMBIADOS_P="$(git -C "$DCAM_DIR/repo" diff --name-only "$ANTES" "$DESPUES" | tr '\n' ' ')"
echo "    (p) compuertas.sh RC=$RC_P; commit: $CAMBIADOS_P"
if [ -e "$MARCADOR_P" ]; then
  mal "(p) el marcador $MARCADOR_P apareció en el HOST: algo evaluó ahí los datos del agente"
elif [ "$RC_P" -ne 0 ]; then
  mal "(p) compuertas.sh falló (ver $TMP/log-p.txt)"
  tail -20 "$TMP/log-p.txt"
elif [ "$CAMBIADOS_P" != ".claude/skills/conciliar-inventario/scripts/referencia-armas.json src/data/data.js " ]; then
  mal "(p) el commit no es data.js + referencia-armas.json: '$CAMBIADOS_P'"
else
  ok "(p) data.js ejecutable + --update-ref: nada se ejecutó en el host y referencia-armas.json llegó al commit (validada)"
fi
( cd "$J" && python3 .claude/skills/conciliar-inventario/scripts/mapear-existencias.py "$W_P/armas.json" \
    --ligas .claude/skills/conciliar-inventario/scripts/ligas-armas.json --regresos src/data \
    --antes-de "$FECHA_ISO" >/dev/null 2>&1 ) || true
if [ -e "$MARCADOR_P" ]; then
  ok "(p) control: el comando que corría el host antes SÍ crea el marcador (la expresión es real)"
else
  mal "(p) control: la expresión no se ejecutó ni con el comando viejo del host: la prueba no muerde"
fi
rm -f "$MARCADOR_P"
rm -rf "$J" "$W_P" "$MAIN_P"

# --- (q) Fase 4, Task 1, ronda 3: la RAMA trae src/data como enlace a un directorio
#     de fuera; la jaula devuelve un src/data real con data.js cambiado. El destino
#     $LIMPIO/nuevo/src/data/data.js cruzaría el enlace (heredado por `cp -a base
#     nuevo`) y `install` escribiría FUERA antes del validador. Debe abortar sin
#     escribir fuera y sin commit. Repo propio para no ensuciar a los demás casos.
DCAM_Q="$TMP/dcam-q"
FUERA_Q="$TMP/fuera-q"
mkdir -p "$DCAM_Q" "$FUERA_Q"
git clone --quiet --no-hardlinks "$DCAM_DIR/repo" "$DCAM_Q/repo"
git -C "$DCAM_Q/repo" checkout --quiet "$RAMA"
cp "$DCAM_Q/repo/src/data/data.js" "$FUERA_Q/data.js"
cp "$FUERA_Q/data.js" "$TMP/fuera-q-antes.js"
J="$(jaula_desde_rama)"
node -e '
  const fs = require("fs"); const p = process.argv[1];
  let s = fs.readFileSync(p, "utf8");
  if (!s.includes("2850g")) { console.error("no encontré 2850g"); process.exit(1); }
  fs.writeFileSync(p, s.replace("2850g", "2851g"));
' "$J/src/data/data.js"
mv "$DCAM_Q/repo/src/data" "$DCAM_Q/repo/src/data-real"
ln -s "$FUERA_Q" "$DCAM_Q/repo/src/data"
git -C "$DCAM_Q/repo" add -A src >/dev/null 2>&1
git -C "$DCAM_Q/repo" -c user.name=prueba -c user.email=prueba@example.invalid commit --quiet -m "src/data como enlace"
ANTES_Q="$(git -C "$DCAM_Q/repo" rev-parse HEAD)"
if DCAM_DIR="$DCAM_Q" "$COMPUERTAS" "$FECHA_ISO" "$RAMA" "$WORKDIR" "$J" "$MAIN" >"$TMP/log-q.txt" 2>&1; then
  mal "(q) src/data de la RAMA como enlace: compuertas.sh NO debió salir 0"
elif ! cmp -s "$FUERA_Q/data.js" "$TMP/fuera-q-antes.js" || [ "$(ls -A "$FUERA_Q")" != "data.js" ]; then
  mal "(q) src/data de la RAMA como enlace: ESCRIBIÓ FUERA ($FUERA_Q)"
elif [ "$(git -C "$DCAM_Q/repo" rev-parse HEAD)" != "$ANTES_Q" ] || ! grep -q "cruza un enlace" "$TMP/log-q.txt"; then
  mal "(q) src/data de la RAMA como enlace: abortó, pero con commit o sin la razón esperada"
else
  ok "(q) src/data de la RAMA como enlace: abortó sin escribir fuera ni commitear (destino que cruza un enlace)"
fi
rm -rf "$J" "$DCAM_Q" "$FUERA_Q" "$TMP/fuera-q-antes.js"

# --- (r) Solo justificación (27-oct-2026): el agente no cambia ningún dato (todo
#     se resolvió con `saltos` en solucion.json) y las compuertas pasan. Debe
#     haber commit con SOLO las referencias del día (lo que faltaba del cierre
#     normal), no un "sin cambios" que el pipeline trata como fallo (rc=3).
#     armas.json = renglones de la referencia de la rama menos el primero, para
#     que --update-ref escriba una referencia distinta de la ya commiteada. ---
W_R="$TMP/w-r"
mkdir -p "$W_R"
node -e '
  const r = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  console.log(JSON.stringify({ items: r.rows.slice(1).map(({ fichaId, ...x }) => x) }));
' "$DCAM_DIR/repo/.claude/skills/conciliar-inventario/scripts/referencia-armas.json" > "$W_R/armas.json"
ANTES="$(sha_head)"
J="$(jaula_desde_rama)"
"$COMPUERTAS" "$FECHA_ISO" "$RAMA" "$W_R" "$J" "$MAIN" >"$TMP/log-r.txt" 2>&1 && RC_R=0 || RC_R=$?
DESPUES="$(sha_head)"
CAMBIADOS_R="$(git -C "$DCAM_DIR/repo" diff --name-only "$ANTES" "$DESPUES" | tr '\n' ' ')"
echo "    (r) compuertas.sh RC=$RC_R; commit: $CAMBIADOS_R"
if [ "$RC_R" -ne 0 ]; then
  mal "(r) solo justificación: compuertas.sh falló (ver $TMP/log-r.txt)"
  tail -20 "$TMP/log-r.txt"
elif [ "$CAMBIADOS_R" != ".claude/skills/conciliar-inventario/scripts/referencia-armas.json " ]; then
  mal "(r) solo justificación: se esperaba un commit con solo referencia-armas.json, hubo: '$CAMBIADOS_R'"
elif ! git -C "$DCAM_DIR/repo" log -1 --format=%s | grep -q "saltos justificados"; then
  mal "(r) solo justificación: el commit no lleva el mensaje de justificación"
else
  ok "(r) solo justificación: compuertas pasó y commiteó solo las referencias del día"
fi
rm -rf "$J" "$W_R"

echo "=================================================="
if [ "$FALLOS" -eq 0 ]; then
  echo "test-compuertas.sh: TODO OK"
else
  echo "test-compuertas.sh: HAY FALLAS — ver arriba"
fi
exit "$FALLOS"
