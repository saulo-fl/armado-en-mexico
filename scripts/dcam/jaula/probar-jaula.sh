#!/usr/bin/env bash
# Jueces de la jaula del solucionador DCAM. Cada línea imprime OK o FALLA; sale 1 si alguna falla.
# Requiere: dcam-jaula:1 construida, dcam-puente levantado (dcam-salida + dcam-interna),
# la regla ufw de Saulo ya aplicada (scripts/dcam/jaula/construir.sh).
# ROUTER_KEY_FILE: la misma clave que se montó en dcam-puente, para el juez de fuga
# (nunca se imprime, solo se cuenta contra ella).
set -u
IMG=dcam-jaula:1
RED=dcam-interna
ROUTER_KEY_FILE="${ROUTER_KEY_FILE:?fija la ruta de la clave del router para el juez de fuga}"
[ -s "$ROUTER_KEY_FILE" ] || { echo "ROUTER_KEY_FILE no existe o está vacío" >&2; exit 2; }

# Gateways reales — el de dcam-interna (la propia red de la jaula: si --internal
# de verdad aísla, ni su propio gateway debe responder nada) y el de dcam-salida
# (la jaula NI SIQUIERA está conectada ahí; debe fallar por falta de ruta).
GW_INTERNA="$(docker network inspect -f '{{(index .IPAM.Config 0).Gateway}}' dcam-interna)"
GW_SALIDA="$(docker network inspect -f '{{(index .IPAM.Config 0).Gateway}}' dcam-salida 2>/dev/null || echo 172.30.0.1)"

correr() { docker run --rm --network "$RED" \
  --read-only --tmpfs /tmp --cap-drop ALL --security-opt no-new-privileges --user 10001:10001 \
  "$IMG" "$@"; }

r=0
ok() { echo "OK   $1"; }
mal() { echo "FALLA $1"; r=1; }

# Petición malformada a nivel HTTP crudo (curl no deja mandar un Content-Length
# que no coincida con lo que de verdad envía), para ejercer el parseo del puente.
crudo_cl() {  # $1 = valor de Content-Length a mandar tal cual
  correr python3 -c '
import socket, sys
val = sys.argv[1]
s = socket.create_connection(("dcam-puente", 1235), timeout=10)
req = "POST /v1/messages HTTP/1.1\r\nHost: dcam-puente\r\nContent-Length: " + val + "\r\nConnection: close\r\n\r\n"
s.sendall(req.encode())
d = s.recv(200)
print(d.split(b" ")[1].decode() if b" " in d else "000")
' "$1"
}

cuerpo='{"model":"qwen3.8-27b","max_tokens":8,"messages":[{"role":"user","content":"di hola"}]}'
cod=$(correr curl -s -o /dev/null -w '%{http_code}' --max-time 180 -X POST http://dcam-puente:1235/v1/messages -H 'content-type: application/json' -d "$cuerpo")
[ "$cod" = "200" ] && ok "el puente responde 200 a /v1/messages (el router puede tardar en despertar)" || mal "el puente no respondió 200 a /v1/messages (fue '$cod')"

cod=$(correr curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://dcam-puente:1235/v1/models)
[ "$cod" = "404" ] && ok "el puente no expone /v1/models" || mal "el puente expuso algo en /v1/models (fue '$cod')"

# Fase 3c: Claude Code pide /v1/messages?beta=true (la query no cuenta), el resto
# se rechaza, y el puente deja una línea por petición sin query, cabeceras, cuerpo
# ni clave.
DESDE="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
sleep 1
cod=$(correr curl -s -o /dev/null -w '%{http_code}' --max-time 180 -X POST 'http://dcam-puente:1235/v1/messages?beta=true' -H 'content-type: application/json' -d "$cuerpo")
[ "$cod" = "200" ] && ok "POST /v1/messages?beta=true -> 200 (la query no cuenta)" || mal "POST /v1/messages?beta=true no dio 200 (fue '$cod')"
cod=$(correr curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://dcam-puente:1235/v1/messages)
[ "$cod" = "404" ] && ok "GET /v1/messages -> 404" || mal "GET /v1/messages no dio 404 (fue '$cod')"
cod=$(correr curl -s -o /dev/null -w '%{http_code}' --max-time 10 -X POST http://dcam-puente:1235/v1/models -d '{}')
[ "$cod" = "404" ] && ok "POST /v1/models -> 404" || mal "POST /v1/models no dio 404 (fue '$cod')"
for raro in '//dcam-puente/v1/messages' '/v1/../v1/messages' '/v1//messages'; do
  cod=$(correr curl -s -o /dev/null -w '%{http_code}' --max-time 10 --path-as-is -X POST "http://dcam-puente:1235$raro" -d '{}')
  [ "$cod" = "404" ] && ok "POST $raro -> 404" || mal "POST $raro no dio 404 (fue '$cod')"
done
sleep 1
LOG_PUENTE="$(docker logs --since "$DESDE" dcam-puente 2>&1)"
echo "--- docker logs dcam-puente de estas peticiones ---"
printf '%s\n' "$LOG_PUENTE"
printf '%s\n' "$LOG_PUENTE" | grep -qE ' POST /v1/messages 200 [0-9]+ [0-9]+ms$' && ok "el puente registró el POST /v1/messages con 200" || mal "no hay línea 'POST /v1/messages 200' en docker logs dcam-puente"
printf '%s\n' "$LOG_PUENTE" | grep -qE ' GET /v1/messages 404 ' && printf '%s\n' "$LOG_PUENTE" | grep -qE ' POST /v1/models 404 ' \
  && printf '%s\n' "$LOG_PUENTE" | grep -qE ' POST \(rechazada\) //dcam-puente/v1/messages 404 ' \
  && ok "el puente registró los rechazos (GET, /v1/models, ruta con //)" || mal "faltan líneas de rechazo en docker logs dcam-puente"
if printf '%s\n' "$LOG_PUENTE" | grep -qiE 'beta=true|content-type|authorization|bearer|di hola'; then
  mal "el log del puente trae query, cabeceras o cuerpo"
elif printf '%s\n' "$LOG_PUENTE" | grep -q -F -f "$ROUTER_KEY_FILE"; then
  mal "la clave del router aparece en el log del puente"
else
  ok "el log del puente no trae query, cabeceras, cuerpo ni la clave"
fi

cod=$(crudo_cl "abc")
[ "$cod" = "400" ] && ok "Content-Length no numérico -> 400" || mal "Content-Length 'abc' no dio 400 (fue '$cod')"

cod=$(crudo_cl "-1")
[ "$cod" = "400" ] && ok "Content-Length negativo -> 400" || mal "Content-Length -1 no dio 400 (fue '$cod')"

cod=$(correr sh -c "head -c 34603008 /dev/zero | curl -s -o /dev/null -w '%{http_code}' --max-time 60 -X POST http://dcam-puente:1235/v1/messages -H 'content-type: application/json' --data-binary @-")
[ "$cod" = "413" ] && ok "cuerpo de 33 MiB -> 413" || mal "cuerpo de 33 MiB no dio 413 (fue '$cod')"

correr curl -s -o /dev/null --max-time 10 https://api.anthropic.com/v1/messages >/dev/null 2>&1 && mal "sale a api.anthropic.com" || ok "api.anthropic.com bloqueado"
correr curl -s -o /dev/null --max-time 10 https://example.com >/dev/null 2>&1 && mal "sale a example.com" || ok "example.com bloqueado"
correr curl -s -o /dev/null --max-time 5 "http://$GW_INTERNA:8090" >/dev/null 2>&1 && mal "llega a 8090 en el gateway de su propia red (dcam-interna)" || ok "gateway de dcam-interna:8090 bloqueado"
correr curl -s -o /dev/null --max-time 5 "http://$GW_INTERNA:22" >/dev/null 2>&1 && mal "llega a 22 (SSH) en el gateway de dcam-interna" || ok "gateway de dcam-interna:22 bloqueado"
correr curl -s -o /dev/null --max-time 5 "http://$GW_SALIDA:8090" >/dev/null 2>&1 && mal "llega a dcam-salida (no debería ni tener ruta)" || ok "dcam-salida inalcanzable desde la jaula"
correr curl -s -o /dev/null --max-time 5 http://100.64.0.1 >/dev/null 2>&1 && mal "llega a Tailscale" || ok "Tailscale bloqueado"

correr sh -c 'ls /home/saulo 2>/dev/null; ls /var/run/docker.sock 2>/dev/null' | grep -q . && mal "ve el home o el socket de docker" || ok "sin home ni socket de docker"
correr sh -c 'touch /home/agente/x 2>/dev/null' && mal "escribe en su propio home (FS no es de solo lectura)" || ok "sistema de archivos de solo lectura"

entorno="$(correr env 2>/dev/null)"
if ! printf '%s' "$entorno" | grep -q ANTHROPIC_BASE_URL; then
  mal "el juez de fuga no pudo leer el entorno de la jaula (env no respondió lo esperado)"
else
  fuga=$(printf '%s' "$entorno" | grep -c -F -f "$ROUTER_KEY_FILE")
  [ "${fuga:-0}" = "0" ] && ok "la clave del router no llega al entorno de la jaula" || mal "la clave del router aparece en el entorno de la jaula"
fi

# Informativo para la Fase 3 (no bloqueante): si el router ya implementa
# /v1/messages/count_tokens. Se anota el código, no se falla el juez por esto.
cod=$(correr curl -s -o /dev/null -w '%{http_code}' --max-time 30 -X POST http://dcam-puente:1235/v1/messages/count_tokens -H 'content-type: application/json' -d "$cuerpo")
echo "INFO count_tokens a través del puente: $cod (no bloqueante, para Fase 3)"

exit $r
