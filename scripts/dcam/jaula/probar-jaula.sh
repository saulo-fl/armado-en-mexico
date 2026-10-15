#!/usr/bin/env bash
# Jueces de la jaula del solucionador DCAM. Cada línea imprime OK o FALLA; sale 1 si alguna falla.
# Requiere: dcam-jaula:1 construida, dcam-puente levantado y conectado a dcam-interna
# (scripts/dcam/jaula/construir.sh). ROUTER_KEY_FILE: la misma clave que se montó en
# dcam-puente, para el juez de fuga (nunca se imprime, solo se cuenta contra ella).
set -u
IMG=dcam-jaula:1
RED=dcam-interna
ROUTER_KEY_FILE="${ROUTER_KEY_FILE:?fija la ruta de la clave del router para el juez de fuga}"
[ -s "$ROUTER_KEY_FILE" ] || { echo "ROUTER_KEY_FILE no existe o está vacío" >&2; exit 2; }

correr() { docker run --rm --network "$RED" \
  --read-only --tmpfs /tmp --cap-drop ALL --security-opt no-new-privileges --user 10001:10001 \
  "$IMG" "$@"; }

r=0
ok() { echo "OK   $1"; }
mal() { echo "FALLA $1"; r=1; }

cuerpo='{"model":"qwen3.8-27b","max_tokens":8,"messages":[{"role":"user","content":"di hola"}]}'
cod=$(correr curl -s -o /dev/null -w '%{http_code}' --max-time 60 -X POST http://dcam-puente:1235/v1/messages -H 'content-type: application/json' -d "$cuerpo")
[ "$cod" = "200" ] && ok "el puente responde 200 a /v1/messages" || mal "el puente no respondió 200 a /v1/messages (fue '$cod')"

cod=$(correr curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://dcam-puente:1235/v1/models)
[ "$cod" = "404" ] && ok "el puente no expone /v1/models" || mal "el puente expuso algo en /v1/models (fue '$cod')"

correr curl -s -o /dev/null --max-time 10 https://api.anthropic.com/v1/messages >/dev/null 2>&1 && mal "sale a api.anthropic.com" || ok "api.anthropic.com bloqueado"
correr curl -s -o /dev/null --max-time 10 https://example.com >/dev/null 2>&1 && mal "sale a example.com" || ok "example.com bloqueado"
correr curl -s -o /dev/null --max-time 5 http://172.17.0.1:8090 >/dev/null 2>&1 && mal "llega directo al router sin pasar por el puente" || ok "router directo bloqueado"
correr curl -s -o /dev/null --max-time 5 http://100.64.0.1 >/dev/null 2>&1 && mal "llega a Tailscale" || ok "Tailscale bloqueado"

correr sh -c 'ls /home/saulo 2>/dev/null; ls /var/run/docker.sock 2>/dev/null' | grep -q . && mal "ve el home o el socket de docker" || ok "sin home ni socket de docker"
correr sh -c 'touch /etc/x 2>/dev/null' && mal "escribe en /" || ok "sistema de archivos de solo lectura"

fuga=$(correr env 2>/dev/null | grep -c -F -f "$ROUTER_KEY_FILE")
[ "${fuga:-0}" = "0" ] && ok "la clave del router no llega al entorno de la jaula" || mal "la clave del router aparece en el entorno de la jaula"

exit $r
