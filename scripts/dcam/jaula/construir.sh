#!/usr/bin/env bash
# Construye la jaula del solucionador DCAM: imágenes dcam-puente:1 y dcam-jaula:1,
# las redes dcam-interna/dcam-salida y el contenedor permanente dcam-puente.
# Idempotente. Con --solo-puente reconstruye y recrea solo dcam-puente (no toca
# la imagen dcam-jaula:1 ni pide CLAUDE_VERSION).
set -euo pipefail
cd "$(dirname "$0")"
RAIZ="$(git rev-parse --show-toplevel)"
SOLO_PUENTE=0
[ "${1:-}" = "--solo-puente" ] && SOLO_PUENTE=1
[ "$SOLO_PUENTE" -eq 1 ] || : "${CLAUDE_VERSION:?fija la versión de Claude Code (ej. 2.1.299)}"
# El token OAuth de Claude: solo se comprueba que exista (nunca se lee aquí) y
# se monta en solo lectura en dcam-puente, el único que lo ve.
: "${CLAUDE_TOKEN_FILE:?fija la ruta al token OAuth de Claude (archivo 640, dueño saulo, nunca en el repo)}"
[ -s "$CLAUDE_TOKEN_FILE" ] || { echo "CLAUDE_TOKEN_FILE no existe o está vacío: $CLAUDE_TOKEN_FILE" >&2; exit 1; }

# dcam-interna: la red de la jaula. Debe ser --internal (sin salida); si alguien
# la recreó sin ese flag, aquí no se repara sola — se para antes de construir
# encima de una red que ya no aísla nada.
if docker network inspect dcam-interna >/dev/null 2>&1; then
  [ "$(docker network inspect -f '{{.Internal}}' dcam-interna)" = "true" ] \
    || { echo "dcam-interna existe pero NO es --internal; bórrala o corrígela a mano" >&2; exit 1; }
else
  docker network create --internal dcam-interna
fi

# dcam-salida: red PROPIA del puente para salir (decisión de Saulo, 19:06 —
# "solo el puente", IP fija). Fase 3d: sale a api.anthropic.com:443; la regla
# ufw 172.30.0.2 → 8090 (router local) queda sin uso, la quita Saulo.
# NO es --internal (necesita salir al host) y dcam-puente YA NO se conecta al
# bridge por defecto (ahí vive portainer y cualquier otra cosa del host).
docker network inspect dcam-salida >/dev/null 2>&1 || \
  docker network create --subnet 172.30.0.0/29 --gateway 172.30.0.1 dcam-salida

# Fase 3d: un puente.py que no compila dejaba dcam-puente en bucle de reinicio
# (pasó el 16-oct, ~60 s). Se valida ANTES de construir y de tumbar el viejo.
python3 -c 'import sys; compile(open(sys.argv[1], encoding="utf-8").read(), sys.argv[1], "exec")' puente/puente.py \
  || { echo "puente/puente.py no compila; no se toca dcam-puente" >&2; exit 1; }
docker build -t dcam-puente:1 puente

[ "$SOLO_PUENTE" -eq 1 ] || \
  docker build -t dcam-jaula:1 --build-arg CLAUDE_VERSION="$CLAUDE_VERSION" -f Dockerfile "$RAIZ"

docker rm -f dcam-puente >/dev/null 2>&1 || true
docker run -d --name dcam-puente --restart unless-stopped \
  --read-only --cap-drop ALL --security-opt no-new-privileges \
  --memory 256m --pids-limit 64 \
  --group-add 1000 \
  --log-opt max-size=1m --log-opt max-file=2 \
  --network dcam-salida --ip 172.30.0.2 \
  -v "$(cd "$(dirname "$CLAUDE_TOKEN_FILE")" && pwd)/$(basename "$CLAUDE_TOKEN_FILE")":/run/secrets/claude-oauth-token:ro \
  dcam-puente:1
docker network connect dcam-interna dcam-puente
