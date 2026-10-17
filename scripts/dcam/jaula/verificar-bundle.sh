# Armado en México — Copyright (C) 2026 Saulo Flores León
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# Se carga con `source`; no se ejecuta. La usan el lanzador (que revisa su
# propio bundle antes de entregarlo) y el pipeline de `dcam` (que lo revisa otra
# vez antes del merge --ff-only). Las dos copias salen del árbol fijado de root:
# $DCAM_MAIN/scripts/dcam/jaula/verificar-bundle.sh (/usr/local/lib/dcam/main).
#
# verificar_bundle <REPO> <BUNDLE> <RAMA> [BASE]
#   Acepta el bundle solo si es un archivo regular, `git bundle verify` pasa en
#   REPO, trae UNA sola ref (refs/heads/<RAMA>) y su commit tiene exactamente un
#   padre y ese padre es BASE (por defecto, la HEAD de REPO; el pipeline pasa el
#   `base` de su solicitud). Es decir: un solo commit hijo de la rama tal como la
#   dejó `dcam`. Deja los objetos en REPO
#   (git fetch a FETCH_HEAD, sin tocar ramas) e imprime en stdout el SHA del
#   commit, que es lo que se aplica con `git merge --ff-only <SHA>`.
#   Sale distinto de 0, sin imprimir nada, en cualquier otro caso.
verificar_bundle() {
  local repo="$1" bundle="$2" rama="$3" base="${4:-}" heads tip
  [ -n "$base" ] || base="$(git -C "$repo" rev-parse -q --verify 'HEAD^{commit}')" || return 1
  [[ "$base" =~ ^[0-9a-f]{40}$ ]] || return 1
  [ -f "$bundle" ] && [ ! -L "$bundle" ] || return 1
  git -C "$repo" bundle verify -q "$bundle" >/dev/null 2>&1 || return 1
  heads="$(git -C "$repo" bundle list-heads "$bundle" 2>/dev/null)" || return 1
  tip="${heads%% *}"
  # Una sola ref y es la de la rama: con dos, "${heads#* }" arrastra la segunda línea y no cuadra.
  [[ "$tip" =~ ^[0-9a-f]{40}$ ]] && [ "${heads#* }" = "refs/heads/$rama" ] || return 1
  git -C "$repo" fetch -q "$bundle" "refs/heads/$rama" >/dev/null 2>&1 || return 1
  # `^@` lista TODOS los padres, uno por línea: igual a BASE ⇔ un padre y es BASE.
  [ "$(git -C "$repo" rev-parse "$tip^@" 2>/dev/null)" = "$base" ] || return 1
  printf '%s\n' "$tip"
}
