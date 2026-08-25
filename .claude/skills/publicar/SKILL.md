---
name: publicar
description: Flujo de git y despliegue para "Armado en México". Úsalo para commitear, abrir PR y publicar en main + develop, y para el cache-busting cuando cambian los data-*.js. Contiene el gotcha crítico de basarse en un origin/main fresco (fetch antes de checkout -B) para no revertir trabajo.
---

# Publicar cambios — Armado en México

Producción es **armado.mx**, servida por **Cloudflare Pages** desde la rama **`main`**.
`main` y `develop` se mantienen en espejo. La rama de trabajo es la que indique la
tarea (p. ej. `claude/...`).

## Regla de oro (GOTCHA que ya nos mordió)
SIEMPRE parte de un `origin/main` fresco:
```bash
git fetch origin main
git checkout -B <rama-de-trabajo> origin/main
```
Los merges se hacen por la API de GitHub (MCP), así que tu `origin/main` LOCAL queda
viejo si no haces `fetch`. Si te basaste en un main viejo, **rebasa antes de pushear**:
`git rebase --onto origin/main <base-vieja> <rama>`.

## Cache-busting (si cambió CUALQUIER data-*.js)
Los `<script src="data-*.js?v=YYYYMMDD...">` en `index.html`, `admin.html` y
`shopify-demo.html` llevan un sufijo `?v=`. Súbelo (p. ej. `20260616b` → `20260617`)
cuando cambien los datos, para forzar descarga fresca (el navegador puede cachear
`data.js` viejo aunque el historial venga fresco). Los `.jsx` revalidan solos.

## Build (Cloudflare lo corre solo)
El proyecto de Pages tiene **build command `npm ci && npm run build`** y output `.`:
Babel CLI precompila los `.jsx` a `.js` en cada deploy. Los `.js` NO se commitean.
Si tocas `package.json` o `babel.config.json`, comprueba el build del preview del PR
antes de mergear: un fallo ahí deja el HTML apuntando a `.js` inexistentes.

## Flujo
1. Verifica: `npm run build` y luego
   `node .claude/skills/conciliar-inventario/scripts/auditar.js` (skill `verificar-app`).
2. `git add ...` && commit con mensaje claro. Cierra el mensaje con la línea
   `Co-Authored-By` y `Claude-Session` que exige el entorno.
3. `git push -u origin <rama>` (reintenta con backoff si falla por red).
4. Abre PR a `main` (MCP `create_pull_request`) y **mergéalo** (`merge_pull_request`).
5. Abre PR de la misma rama a `develop` y mergéalo (sincroniza espejo).
6. NO crees PR si el usuario no lo pidió para otros repos; aquí el flujo es el estándar.

## Verificar el deploy (lo hace el usuario; tú no tienes red)
- Cloudflare reconstruye `main` al hacer merge; ~1-2 min.
- Si el deploy queda **Failed**: revisar el log. Causa conocida: `wrangler.toml` con
  binding D1 y `database_id` placeholder → la Function no publica y NADA se despliega.
  El binding D1 está comentado a propósito hasta crear la base (ver BACKEND.md).

## Bitácora de aprendizajes (AÑADE lo que descubras)
- 2026-06: un deploy fallido NO publica el sitio aunque suban los assets.
- 2026-06: preview por-rama (`<hash>.pages.dev`) tiene origen distinto → localStorage
  no persiste ahí; validar en armado.mx.
