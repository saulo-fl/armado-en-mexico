#!/usr/bin/env bash
# Corre DENTRO de la jaula. /trabajo es un volumen tmpfs con tope (ronda de
# arreglo 4/5): /trabajo/repo = copia de la rama (rw), /trabajo/salida = donde
# el agente deja solucion.json, /trabajo/entrada = ro. Nada de esto toca el
# disco del host: al terminar, extraer.sh (otro contenedor) copia al host SOLO
# los archivos de PERMITIDOS y solucion.json/agente.json, con tope de tamaño.
#
# NO hace `git diff` ni escribe parche.diff: el host reconstruye el resultado
# copiando él mismo los archivos permitidos desde /trabajo/repo (otro script,
# fuera de la jaula). Este script tampoco escribe solucion.json: lo escribe el
# propio agente en /trabajo/salida/solucion.json, según sus instrucciones.
#
# El modelo lo fija la imagen (ANTHROPIC_MODEL=claude-opus-5-5 vía el puente
# dcam-puente); por eso no hay --model aquí. El effort sí va aquí (Fase 3d,
# Saulo: «Opus 5.5 en razonamiento medio»): este archivo viene de MAIN, nunca
# de la rama, así que la rama no puede cambiarlo.
#
# Fase 3d: stream-json (una línea JSON por evento) en vez de json: si el agente
# muere por timeout, agente.json conserva lo que hizo. El resultado, el costo y
# los turnos van en la última línea con type=result.
set -uo pipefail
cd /trabajo/repo
ln -sfn /opt/deps/node_modules node_modules

# Las instrucciones del agente vienen de MAIN (montadas en /opt/main), no de la
# rama que se está reparando: la rama es DATO que el agente edita, no código de
# confianza que deba poder cambiar sus propias reglas.
INSTRUCCIONES="$(awk '/^---$/{n++; next} n>=2' /opt/main/solucionador-dcam.md)"

# Fase 3d, decisión de Saulo (16-oct): «bypass solo dentro de la jaula».
# Con --permission-mode dontAsk, Claude Code niega SIEMPRE Edit/Write dentro de
# .claude/ (ni reglas por ruta ni acceptEdits lo abren), y ahí viven los
# ligas-*.json que el agente tiene que poder reponer. Aquí sí vale bypass porque
# la frontera es el CONTENEDOR, no la lista de herramientas: su red solo llega
# al puente, y el puente solo deja pasar peticiones de mensajes con modelo,
# effort y betas de lista blanca y herramientas de CLIENTE (las de servidor,
# que ejecutaría la API fuera de la jaula, dan 400); sin credenciales, FS de solo lectura
# salvo el volumen tmpfs con tope, sin capacidades, uid sin privilegios; y lo
# único que sale al host lo extrae extraer.sh (solo PERMITIDOS, con tope), lo
# valida el validador de MAIN y lo prueban las compuertas sin red. FUERA de la
# jaula está prohibido correr Claude Code con bypass (ni el pipeline, ni
# solucionar.sh, ni compuertas.sh lo hacen). --disallowedTools se sigue
# respetando en bypass: WebFetch y WebSearch (este lo ejecutaría la API, fuera
# de la jaula) quedan fuera.
if [ "$(id -u)" -eq 0 ]; then
  echo "dentro.sh: me niego a correr como root" >&2; exit 1
fi
echo "dentro.sh: uid=$(id -u) gid=$(id -g)" >&2

timeout --kill-after=60 "$((${SOLUCIONADOR_MIN:-45} * 60))" \
  claude -p "$(cat /trabajo/entrada/prompt.txt)" \
    --append-system-prompt "$INSTRUCCIONES" \
    --permission-mode bypassPermissions \
    --disallowedTools WebFetch WebSearch \
    --add-dir /trabajo/entrada --add-dir /trabajo/salida \
    --effort medium \
    --output-format stream-json --verbose > /trabajo/salida/agente.json
