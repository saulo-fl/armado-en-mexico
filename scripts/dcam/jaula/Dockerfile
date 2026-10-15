# dcam-jaula — imagen del agente solucionador DCAM. Sin salida a internet: habla
# únicamente con dcam-puente:1235 (ANTHROPIC_BASE_URL), que es quien de verdad
# llega al router local. node_modules horneados desde el package-lock.json de
# main, no instalados en caliente dentro de la jaula.
# trixie (no bookworm): requirements-dcam.txt trae networkx==3.7, que exige
# Python >=3.12; el python3 de apt en bookworm es 3.11. trixie trae 3.13.
FROM node:22-trixie-slim@sha256:154ba2f4d6fec323d28e4f4bb86bba4677f1223391a1979cf521304e03a98dfa
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv git jq curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
ARG CLAUDE_VERSION
RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_VERSION}
COPY package.json package-lock.json /opt/deps/
RUN cd /opt/deps && npm ci --ignore-scripts
COPY scripts/dcam/jaula/requirements-dcam.txt /opt/deps/
RUN python3 -m venv /opt/venv && /opt/venv/bin/pip install --no-cache-dir -r /opt/deps/requirements-dcam.txt
RUN useradd -u 10001 -m agente
ENV DISABLE_TELEMETRY=1 DISABLE_ERROR_REPORTING=1 CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1 DISABLE_AUTOUPDATER=1
ENV ANTHROPIC_BASE_URL=http://dcam-puente:1235 ANTHROPIC_AUTH_TOKEN=jaula-sin-clave
# Fija el modelo para Fase 3: sin esto Claude Code intenta hablar con un modelo
# Anthropic por defecto, que el puente no sabe traducir.
ENV ANTHROPIC_MODEL=qwen3.8-27b ANTHROPIC_SMALL_FAST_MODEL=qwen3.8-27b
USER agente
