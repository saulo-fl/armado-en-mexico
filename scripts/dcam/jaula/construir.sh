#!/usr/bin/env bash
# Construye la jaula del solucionador DCAM: imágenes dcam-puente:1 y dcam-jaula:1,
# la red interna dcam-interna y el contenedor permanente dcam-puente. Idempotente.
set -euo pipefail
cd "$(dirname "$0")"
RAIZ="$(git rev-parse --show-toplevel)"
: "${CLAUDE_VERSION:?fija la versión de Claude Code (ej. 2.1.299)}"
: "${ROUTER_KEY_FILE:?fija la ruta a la clave del router (archivo 600, nunca en el repo)}"
[ -s "$ROUTER_KEY_FILE" ] || { echo "ROUTER_KEY_FILE no existe o está vacío: $ROUTER_KEY_FILE" >&2; exit 1; }

docker network inspect dcam-interna >/dev/null 2>&1 || docker network create --internal dcam-interna

docker build -t dcam-puente:1 puente

docker build -t dcam-jaula:1 --build-arg CLAUDE_VERSION="$CLAUDE_VERSION" -f Dockerfile "$RAIZ"

docker rm -f dcam-puente >/dev/null 2>&1 || true
docker run -d --name dcam-puente --restart unless-stopped \
  --read-only --cap-drop ALL --security-opt no-new-privileges \
  --network bridge \
  -v "$(cd "$(dirname "$ROUTER_KEY_FILE")" && pwd)/$(basename "$ROUTER_KEY_FILE")":/run/secrets/router-key:ro \
  dcam-puente:1
docker network connect dcam-interna dcam-puente
