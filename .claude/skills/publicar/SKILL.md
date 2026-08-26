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
- Si el deploy queda **Failed**: revisar el log. Causa conocida: un `database_id`
  inválido en `wrangler.toml` («Error 8000022») → la Function no publica y NADA se
  despliega.
- **El backend D1 está ACTIVO desde el 25-ago-2026.** Tras cualquier deploy que toque
  `wrangler.toml` o `functions/`, comprueba que no cayó a fallback — es silencioso: el
  sitio se ve perfecto y nada se comparte entre visitantes.
  **`/api/state` NO sirve como sonda:** devuelve `200 {}` con binding y sin él.
  Usa un `append` con JSON inválido, que comprueba `env.DB` antes de parsear el cuerpo
  (así que no escribe nada):
  ```bash
  curl -s -X POST https://armado.mx/api/append/reviewsQueue -d 'x'  # json_invalido = OK
  curl -s -X PUT  https://armado.mx/api/admin/state/pages -d '{}'   # no_autenticado = OK
  ```
  `sin_backend` = se perdió el binding D1. `admin_auth_no_configurado` = se perdieron
  las vars de Access. Los dos responden 503.
- **Verifica en el preview del PR antes de mergear** cuando toques `wrangler.toml` o
  `functions/`: el alias por rama es `<rama-con-guiones>.armado-en-mexico.pages.dev`
  (`claude/x-y` → `claude-x-y`). Las mismas sondas funcionan ahí y el binding es el
  mismo, así que un fallo se ve sin arriesgar producción.

## Bitácora de aprendizajes (AÑADE lo que descubras)
- 2026-08: **un deploy correcto puede no llegar al usuario, y no es culpa del deploy.**
  Dos capas encadenadas servían JavaScript viejo hasta 4 h después de publicar:
  (1) en `_headers`, `/*.js` NUNCA aplicó — el splat de Pages matchea codiciosamente
  hasta el final y no retrocede, así que un patrón con texto tras el `*` no coincide
  con nada (ya corregido: los archivos van listados uno a uno, y `build-prerender.mjs`
  falla si un `<script>` se queda sin regla); y (2) **el ajuste «Browser Cache TTL» de
  la zona `armado.mx` estaba en 4 h y eleva cualquier `max-age` menor** que mande el
  origen — pisa a `_headers` y solo se arregla en el dashboard, poniéndolo en «Respect
  Existing Headers». **Resuelto el 26-ago-2026**, pero es el primer sospechoso si vuelve
  a servirse código viejo: no se ve desde el repo.
  Para distinguir origen de zona, mide los dos:
  ```bash
  curl -sI https://armado-en-mexico.pages.dev/app.js | grep -i cache-control  # el origen
  curl -sI https://armado.mx/app.js                  | grep -i cache-control  # con la zona
  ```
  Si difieren, el problema NO está en el repo. Y no midas la caché en un preview de
  rama: `*.pages.dev` antepone su propio default a toda respuesta, así que las
  cabeceras no se parecen a las de producción.
- 2026-08: **la sonda del backend caduca si cambian los APPEND_DOMAINS.** Usaba
  `/api/append/ratings`, y al retirar el dominio `ratings` (opiniones tipo Steam)
  pasó a responder `dominio_invalido` — que NO distingue si D1 sigue vinculada.
  Ahora sonda `reviewsQueue`. Si algún día cambian los dominios de append, actualiza
  esta línea y la de CLAUDE.md: una sonda que ya no prueba nada es peor que ninguna,
  porque da confianza falsa.
- 2026-06: un deploy fallido NO publica el sitio aunque suban los assets.
- 2026-06: preview por-rama (`<hash>.pages.dev`) tiene origen distinto → localStorage
  no persiste ahí; validar en armado.mx.
