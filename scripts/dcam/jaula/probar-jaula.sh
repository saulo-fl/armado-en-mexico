#!/usr/bin/env bash
# Jueces de la jaula del solucionador DCAM. Cada línea imprime OK o FALLA; sale 1 si alguna falla.
# Requiere: dcam-jaula:1 construida y dcam-puente levantado (dcam-salida + dcam-interna,
# scripts/dcam/jaula/construir.sh).
# Fase 3d: el puente habla con api.anthropic.com con el token OAuth de Saulo. Este
# juez NUNCA lee el archivo del token: la fuga se busca por la FORMA de un token
# de Anthropic (sk-ant-<tipo><nn>-…) y solo se imprimen nombres, nunca contenido.
# Gasta una corrida mínima de Claude Code con Haiku (un turno) de la suscripción.
set -u
IMG=dcam-jaula:1
RED=dcam-interna
FORMA_TOKEN='sk-ant-[a-z]{2,4}[0-9]{2}-[A-Za-z0-9_-]{20,}'

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

# La jaula llega al puente (y el puente no expone nada fuera de su lista).
cod=$(correr curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://dcam-puente:1235/v1/models)
[ "$cod" = "404" ] && ok "la jaula llega al puente; el puente no expone /v1/models (404)" || mal "GET /v1/models al puente no dio 404 (fue '$cod'; 000 = la jaula no llega al puente)"

# Una petición mínima de verdad (Fase 3d), hecha por Claude Code mismo desde la
# jaula (POST /v1/messages?beta=true con Haiku). NO con curl: la API responde
# 429 «Error» a una petición con el token de la suscripción que no viene de
# Claude Code (medido el 15-oct), y fabricar una que lo parezca sería rodear ese
# control. El resto se rechaza, y el puente deja una línea por petición sin
# query, cabeceras, cuerpo ni token (solo modelo y effort del cuerpo).
DESDE="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
sleep 1
res="$(correr sh -c 'cd /tmp && HOME=/tmp timeout 120 claude -p "Responde solo con la palabra hola" --model claude-haiku-5-5 --output-format json' 2>/dev/null)"
if [ "$(printf '%s' "$res" | jq -r 'select(.type == "result") | "\(.is_error) \(.modelUsage | keys | join(","))"' 2>/dev/null)" = "false claude-haiku-5-5" ]; then
  ok "Claude Code en la jaula -> puente -> API con claude-haiku-5-5: resultado sin error ($(printf '%s' "$res" | jq -c '{num_turns, total_cost_usd, result}'))"
else
  mal "Claude Code en la jaula no obtuvo respuesta por el puente: $(printf '%s' "$res" | head -c 300)"
fi
cod=$(correr curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://dcam-puente:1235/v1/messages)
[ "$cod" = "404" ] && ok "GET /v1/messages -> 404" || mal "GET /v1/messages no dio 404 (fue '$cod')"
cod=$(correr curl -s -o /dev/null -w '%{http_code}' --max-time 10 -X POST http://dcam-puente:1235/v1/models -d '{}')
[ "$cod" = "404" ] && ok "POST /v1/models -> 404" || mal "POST /v1/models no dio 404 (fue '$cod')"
# (El http.server de Python 3.12 ya colapsa un "//" inicial antes de que lo vea
# el puente: //dcam-puente/v1/messages llega como /dcam-puente/v1/messages y se
# rechaza igual por no ser una ruta permitida.)
for raro in '//dcam-puente/v1/messages' '/v1/../v1/messages' '/v1//messages'; do
  cod=$(correr curl -s -o /dev/null -w '%{http_code}' --max-time 10 --path-as-is -X POST "http://dcam-puente:1235$raro" -d '{}')
  [ "$cod" = "404" ] && ok "POST $raro -> 404" || mal "POST $raro no dio 404 (fue '$cod')"
done
# Fase 3d, ronda de arreglo 1: el puente filtra el CUERPO por lista blanca. Las
# herramientas de servidor (web_search, web_fetch, code_execution, mcp_servers…)
# las ejecutaría la API fuera de la jaula: 400 del puente, sin reenviar.
post_puente() {  # $1 = cuerpo JSON; imprime el código HTTP
  correr curl -s -o /dev/null -w '%{http_code}' --max-time 30 -X POST 'http://dcam-puente:1235/v1/messages?beta=true' \
    -H 'content-type: application/json' -H 'anthropic-version: 2023-06-01' -H 'anthropic-beta: mcp-client-2025-04-04' -d "$1"
}
base='"max_tokens":8,"messages":[{"role":"user","content":"di hola"}]'
for caso in \
  "mcp_servers|{\"model\":\"claude-haiku-5-5\",$base,\"mcp_servers\":[{\"type\":\"url\",\"url\":\"https://example.com/mcp\",\"name\":\"x\"}]}|clave_de_primer_nivel_no_permitida" \
  "tools[].type de servidor|{\"model\":\"claude-haiku-5-5\",$base,\"tools\":[{\"type\":\"web_search_20250305\",\"name\":\"web_search\"}]}|herramienta_de_servidor" \
  "modelo claude-sonnet-5-5|{\"model\":\"claude-sonnet-5-5\",$base}|modelo_no_permitido" \
  "effort high|{\"model\":\"claude-haiku-5-5\",$base,\"output_config\":{\"effort\":\"high\"}}|effort_mayor_que_medium" \
  "clave model repetida (sonnet primero)|{\"model\":\"claude-sonnet-5-5\",\"model\":\"claude-haiku-5-5\",$base}|clave_repetida" \
  "image con source url|{\"model\":\"claude-haiku-5-5\",\"max_tokens\":8,\"messages\":[{\"role\":\"user\",\"content\":[{\"type\":\"image\",\"source\":{\"type\":\"url\",\"url\":\"https://example.com/x.png\"}}]}]}|bloque_de_contenido_no_permitido"; do
  IFS='|' read -r nombre cuerpo motivo <<< "$caso"
  cod=$(post_puente "$cuerpo")
  [ "$cod" = "400" ] && ok "POST con $nombre -> 400 del puente" || mal "POST con $nombre no dio 400 (fue '$cod')"
done
# Ronda de arreglo 2: la query solo puede ser vacía o exactamente beta=true.
cod=$(correr curl -s -o /dev/null -w '%{http_code}' --max-time 30 -X POST 'http://dcam-puente:1235/v1/messages?beta=false' \
  -H 'content-type: application/json' -H 'anthropic-version: 2023-06-01' -d "{\"model\":\"claude-haiku-5-5\",$base}")
[ "$cod" = "400" ] && ok "POST /v1/messages?beta=false -> 400 del puente" || mal "POST con ?beta=false no dio 400 (fue '$cod')"
# Claude Code con WebSearch permitido y un prompt que obliga a buscar: el puente
# rechaza la petición (lleva la herramienta de servidor) y no hay ninguna búsqueda.
res_ws="$(correr sh -c 'cd /tmp && HOME=/tmp timeout 120 claude -p "Usa la herramienta WebSearch para buscar armado.mx y dime el primer resultado. Es obligatorio buscar." --model claude-haiku-5-5 --allowedTools WebSearch --output-format json' 2>/dev/null)"
ws="$(printf '%s' "$res_ws" | jq -r 'select(.type == "result") | (.usage.server_tool_use.web_search_requests // 0)' 2>/dev/null)"
echo "    claude -p con WebSearch: $(printf '%s' "$res_ws" | jq -c 'select(.type == "result") | {is_error, api_error_status, web_search_requests: (.usage.server_tool_use.web_search_requests // 0), result: ((.result // "") | .[0:160])}' 2>/dev/null)"
[ "${ws:-0}" = "0" ] && ok "claude -p con --allowedTools WebSearch: web_search_requests = 0" || mal "claude -p con WebSearch hizo $ws búsquedas"
# Un cuerpo que pasa la lista blanca pero la API rechaza (mal formado): la
# respuesta (cabeceras + cuerpo) no trae nada con prefijo sk-ant ni cabeceras de
# organización o límites. Solo se CUENTAN las coincidencias, nunca se imprimen.
resp="$(correr curl -s -i --max-time 30 -X POST 'http://dcam-puente:1235/v1/messages?beta=true' \
  -H 'content-type: application/json' -H 'anthropic-version: 2023-06-01' -d '{"model":"claude-haiku-5-5","max_tokens":8,"messages":"mal"}')"
n_sk=$(printf '%s' "$resp" | grep -c 'sk-ant')
n_org=$(printf '%s' "$resp" | grep -ciE '^(anthropic-organization|anthropic-workspace|anthropic-ratelimit|set-cookie|cf-)')
echo "    respuesta a un cuerpo mal formado: $(printf '%s' "$resp" | head -1 | tr -d '\r'); cabeceras: $(printf '%s' "$resp" | sed -n '2,/^\r\?$/p' | cut -d: -f1 | tr -d '\r' | grep . | tr '\n' ' ')"
[ "$n_sk" = "0" ] && [ "$n_org" = "0" ] && ok "respuesta de error de la API: 0 'sk-ant' y 0 cabeceras de organización/límites" || mal "respuesta de error: $n_sk 'sk-ant', $n_org cabeceras de organización/límites"
sleep 1
LOG_PUENTE="$(docker logs --since "$DESDE" dcam-puente 2>&1)"
echo "--- docker logs dcam-puente de estas peticiones ---"
printf '%s\n' "$LOG_PUENTE"
printf '%s\n' "$LOG_PUENTE" | grep -qE ' POST /v1/messages 200 [0-9]+ [0-9]+ms modelo=claude-haiku-5-5 effort=[a-z-]+$' && ok "el puente registró el POST /v1/messages con 200 y el modelo" || mal "no hay línea 'POST /v1/messages 200 … modelo=claude-haiku-5-5' en docker logs dcam-puente"
printf '%s\n' "$LOG_PUENTE" | grep -qE ' GET /v1/messages 404 ' && printf '%s\n' "$LOG_PUENTE" | grep -qE ' POST /v1/models 404 ' \
  && printf '%s\n' "$LOG_PUENTE" | grep -qE ' POST \(rechazada\) /v1/\.\./v1/messages 404 ' \
  && ok "el puente registró los rechazos (GET, /v1/models, ruta con ..)" || mal "faltan líneas de rechazo en docker logs dcam-puente"
for m in clave_de_primer_nivel_no_permitida herramienta_de_servidor modelo_no_permitido effort_mayor_que_medium clave_repetida bloque_de_contenido_no_permitido query_no_permitida; do
  printf '%s\n' "$LOG_PUENTE" | grep -qE " POST /v1/messages 400 0 [0-9]+ms .* rechazo=$m$" \
    && ok "el puente registró el rechazo '$m' (línea fija, sin valores)" || mal "falta la línea de rechazo '$m' en el log del puente"
done
if printf '%s\n' "$LOG_PUENTE" | grep -qiE 'beta=true|content-type|anthropic-version|authorization|bearer|oauth|responde solo|example.com|web_search_2'; then
  mal "el log del puente trae query, cabeceras o cuerpo"
elif printf '%s\n' "$LOG_PUENTE" | grep -qE "$FORMA_TOKEN"; then
  mal "algo con forma de token aparece en el log del puente"
else
  ok "el log del puente no trae query, cabeceras, cuerpo ni nada con forma de token"
fi

cod=$(crudo_cl "abc")
[ "$cod" = "400" ] && ok "Content-Length no numérico -> 400" || mal "Content-Length 'abc' no dio 400 (fue '$cod')"

cod=$(crudo_cl "-1")
[ "$cod" = "400" ] && ok "Content-Length negativo -> 400" || mal "Content-Length -1 no dio 400 (fue '$cod')"

cod=$(correr sh -c "head -c 34603008 /dev/zero | curl -s -o /dev/null -w '%{http_code}' --max-time 60 -X POST http://dcam-puente:1235/v1/messages -H 'content-type: application/json' --data-binary @-")
[ "$cod" = "413" ] && ok "cuerpo de 33 MiB -> 413" || mal "cuerpo de 33 MiB no dio 413 (fue '$cod')"

correr curl -s -o /dev/null --max-time 10 https://api.anthropic.com/v1/messages >/dev/null 2>&1 && mal "la jaula sale directo a api.anthropic.com" || ok "api.anthropic.com bloqueado desde la jaula"
correr curl -s -o /dev/null --max-time 10 https://example.com >/dev/null 2>&1 && mal "sale a example.com" || ok "example.com bloqueado"
correr curl -s -o /dev/null --max-time 10 http://1.1.1.1 >/dev/null 2>&1 && mal "sale a internet por IP (1.1.1.1)" || ok "internet por IP (1.1.1.1) bloqueado"
correr curl -s -o /dev/null --max-time 5 "http://$GW_INTERNA:8090" >/dev/null 2>&1 && mal "llega a 8090 en el gateway de su propia red (dcam-interna)" || ok "gateway de dcam-interna:8090 bloqueado"
correr curl -s -o /dev/null --max-time 5 "http://$GW_INTERNA:22" >/dev/null 2>&1 && mal "llega a 22 (SSH) en el gateway de dcam-interna" || ok "gateway de dcam-interna:22 bloqueado"
correr curl -s -o /dev/null --max-time 5 "http://$GW_SALIDA:8090" >/dev/null 2>&1 && mal "llega a dcam-salida (no debería ni tener ruta)" || ok "dcam-salida inalcanzable desde la jaula"
correr curl -s -o /dev/null --max-time 5 http://100.64.0.1 >/dev/null 2>&1 && mal "llega a Tailscale" || ok "Tailscale bloqueado"

correr sh -c 'ls /home/saulo 2>/dev/null; ls /var/run/docker.sock 2>/dev/null' | grep -q . && mal "ve el home o el socket de docker" || ok "sin home ni socket de docker"
correr sh -c 'touch /home/agente/x 2>/dev/null' && mal "escribe en su propio home (FS no es de solo lectura)" || ok "sistema de archivos de solo lectura"

# Fuga del token hacia la jaula: entorno, entorno del PID 1 y todo el sistema de
# archivos visible. En el FS, el prefijo pelado "sk-ant-" solo puede salir en el
# código de Claude Code (que lo menciona); nada con FORMA de token, en ningún lado.
entorno="$(correr sh -c 'env; echo ===; tr "\0" "\n" < /proc/1/environ' 2>/dev/null)"
if ! printf '%s' "$entorno" | grep -q ANTHROPIC_BASE_URL || ! printf '%s' "$entorno" | grep -q '^===$'; then
  mal "el juez de fuga no pudo leer el entorno de la jaula (env o /proc/1/environ no respondió lo esperado)"
elif printf '%s' "$entorno" | grep -qE "sk-ant-|$FORMA_TOKEN"; then
  mal "algo con prefijo sk-ant- aparece en env o /proc/1/environ de la jaula"
else
  ok "ni env ni /proc/1/environ de la jaula traen nada con prefijo sk-ant- (ANTHROPIC_AUTH_TOKEN=$(printf '%s\n' "$entorno" | sed -n 's/^ANTHROPIC_AUTH_TOKEN=//p' | head -1))"
fi
fs="$(correr sh -c 'echo "== prefijo"; grep -rlaF "sk-ant-" / --exclude-dir=proc --exclude-dir=sys --exclude-dir=dev 2>/dev/null; echo "== forma"; grep -rlaE "$1" / --exclude-dir=proc --exclude-dir=sys --exclude-dir=dev 2>/dev/null; echo "== fin"' _ "$FORMA_TOKEN")"
printf '%s\n' "$fs" | sed 's/^/    /'
PREFIJO_FUERA="$(printf '%s\n' "$fs" | sed -n '/^== prefijo$/,/^== forma$/p' | grep -v '^==' | grep -v '^/usr/local/lib/node_modules/@anthropic-ai/claude-code/' || true)"
FORMA="$(printf '%s\n' "$fs" | sed -n '/^== forma$/,/^== fin$/p' | grep -v '^==' || true)"
if ! printf '%s\n' "$fs" | grep -q '^== fin$'; then
  mal "la búsqueda en el FS de la jaula no terminó"
elif [ -n "$FORMA" ] || [ -n "$PREFIJO_FUERA" ]; then
  mal "token en el FS de la jaula: forma='$FORMA' prefijo fuera de Claude Code='$PREFIJO_FUERA'"
else
  ok "FS de la jaula: nada con forma de token; el prefijo sk-ant- solo en los binarios de Claude Code"
fi

exit $r
