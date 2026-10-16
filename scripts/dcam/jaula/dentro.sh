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

timeout --kill-after=60 "$((${SOLUCIONADOR_MIN:-45} * 60))" \
  claude -p "$(cat /trabajo/entrada/prompt.txt)" \
    --append-system-prompt "$INSTRUCCIONES" \
    --permission-mode dontAsk \
    --allowedTools Read Write Edit Grep Glob "Bash(python3 *)" "Bash(/opt/venv/bin/python *)" "Bash(node *)" \
                   "Bash(npm test *)" "Bash(git status *)" "Bash(git diff *)" "Bash(git log *)" \
                   "Bash(ls *)" "Bash(head *)" "Bash(tail *)" "Bash(grep *)" "Bash(jq *)" "Bash(wc *)" "Bash(cp *)" \
    --disallowedTools WebFetch WebSearch \
    --add-dir /trabajo/entrada --add-dir /trabajo/salida \
    --effort medium \
    --output-format stream-json --verbose > /trabajo/salida/agente.json
