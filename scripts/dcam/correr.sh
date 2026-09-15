#!/bin/sh
# Punto de entrada de dcam-vigia.service: actualiza el clon que ejecuta, corre el vigía y la conciliación.
# Diseño: scripts/dcam/DISENO.md (pieza 2). Credenciales de GitHub en /home/saulo/apps/dcam-bot/github.env.
set -u
DIR=/home/saulo/apps/dcam-bot
cd "$DIR/repo" || exit 1
[ -r "$DIR/github.env" ] && . "$DIR/github.env" && export GH_TOKEN
# Si no se puede actualizar, corre igual con el código que hay y el latido lo avisa.
if ! { git -c credential.helper= -c 'credential.helper=!gh auth git-credential' fetch --quiet origin main \
       && git reset --quiet --hard origin/main; }; then
  DCAM_CODIGO_VIEJO="$(git log -1 --format=%cs)"; export DCAM_CODIGO_VIEJO
fi
python3 scripts/dcam/vigia.py; v=$?
python3 scripts/dcam/conciliar.py correr; c=$?
[ "$v" -ne 0 ] && exit "$v"
exit "$c"
