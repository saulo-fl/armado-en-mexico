#!/usr/bin/env bash
# Corre DENTRO de la jaula. /trabajo/repo = copia (rw), /trabajo/entrada = ro,
# /trabajo/salida = lo único que vuelve al host.
#
# NO hace `git diff` ni escribe parche.diff: el host reconstruye el resultado
# copiando él mismo los archivos permitidos desde /trabajo/repo (otro script,
# fuera de la jaula). Este script tampoco escribe solucion.json: lo escribe el
# propio agente en /trabajo/salida/solucion.json, según sus instrucciones.
#
# El modelo lo fija la imagen (ANTHROPIC_MODEL=qwen3.8-27b vía el puente
# dcam-puente); por eso no hay --model aquí.
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
    --output-format json > /trabajo/salida/agente.json
