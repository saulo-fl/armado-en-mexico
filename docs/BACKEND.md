# Backend compartido — Cloudflare Pages Functions + D1

La app sigue siendo estática (HTML + JSX en el navegador). El "backend" añade una
capa **opcional y no intrusiva** para que lo editado en el admin deje de vivir solo
en `localStorage` y se comparta entre todos los visitantes.

- **Sin backend** (GitHub Pages, `file://`, o antes de aprovisionar): la app funciona
  igual que siempre, con los _seeds_ del código + `localStorage` por navegador.
- **Con backend** (Cloudflare Pages con Functions + D1): al arrancar, la app **hidrata**
  el estado compartido (`GET /api/state`) y, a partir de ahí, cada cambio se sincroniza:
  el admin con `PUT` (protegido por Cloudflare Access) y el público con `POST /append`.

El render de la app **no cambió**: sigue siendo síncrono; la hidratación solo refresca
el cache local y dispara un re-render.

## Arquitectura

```
functions/
  api/
    _lib.js                     utilidades (JSON, allowlists, verificación de Access JWT)
    _visitas.js                 visitas por día + ranking «Más visitadas» (no es ruta)
    state.js                    GET  /api/state                 → snapshot público (read, con caché)
    append/[domain].js          POST /api/append/:domain         → escritura pública (merge atómico)
    admin/state/[domain].js     PUT  /api/admin/state/:domain    → reemplazo de dominio (solo admin)
    admin/moderar.js            POST /api/admin/moderar          → mueve UNA reseña o denuncia (solo admin)
scripts/sql/schema.sql          tabla `state(domain, data, updated_at)` — un blob JSON por dominio
                                y tabla `visitas_dia(dia, arma_id, n)` — contador de visitas
wrangler.toml                   binding D1 (env.DB) + config de Pages
```

**Modelo de datos:** un *document store* por **dominio**. Cada dominio que store.js ya
maneja (`armas`, `pages`, `promos`, `favorites`, `appConfig`, `manuales`, `priceHist`,
`rejected`, `reviews`, `reviewsQueue`, `reports`, más `masVisitadas`, que calcula el servidor;
lista canónica en `ALL_DOMAINS` de `functions/api/_lib.js`) es **una fila** con su JSON,
con el mismo shape que en `localStorage`. La contraseña/sesión (`admin`) **nunca** viaja.

**Las visitas son la excepción (nov-2026):** no son un blob sino la tabla `visitas_dia`, un
contador por arma y día (UTC). Antes el blob `visits` guardaba una marca por visita (35 mil,
~500 KB), viajaba en cada `GET /api/state` y cada visita lo reescribía entero: pasó del límite
de 10 ms de CPU del plan gratis. El ranking «Más visitadas» (30 días) se recalcula **una vez
al día** con la primera visita del día y se guarda en la fila `masVisitadas`
(`{dia, dias, top: [[armaId, visitas], ...]}`), que sí viaja en el snapshot. El blob histórico
se migró con `scripts/migrar-visitas.mjs` y quedó renombrado como `visits_respaldo_<fecha>`.

- **Escritura admin** (`PUT /api/admin/state/:domain`): reemplaza el blob del dominio.
  La usa el panel para editar páginas/promos/catálogo/favoritos/branding/inventarios.
  **Los dominios que escribe el servidor** (el público por `/append`, la moderación por
  `/admin/moderar`; `DOMINIOS_MODERADOS` en `_lib.js`: `reviews`,
  `reviewsQueue`, `rejected`, `reports`, `visits`, `masVisitadas`) **responden 409 `dominio_moderado`**: un
  reemplazo con la copia del navegador borraría lo que llegó después de abrir el panel.
- **Moderación admin** (`POST /api/admin/moderar`, cuerpo `{accion, id, motivo?}` con `accion` =
  `aprobar` | `rechazar` | `retirar` | `resolver`): el servidor lee de D1 lo vigente y mueve ese
  único elemento con la misma escritura condicional (`actualizarDominio`, con reintentos) del
  formulario público. Primero añade al destino y luego quita del origen, así un corte a medias
  deja un duplicado, nunca una pérdida, y repetir la acción lo termina. Aprobar quita el correo.
  Errores: 400 cuerpo/acción/id inválidos, 404 `no_encontrada`, 503 `ocupado_reintenta`
  (con `Retry-After`). El navegador la llama con `Store.moderar` y se re-hidrata; si falla
  (sesión de Access caducada, red) el panel avisa y no cambia su copia local.
- **Escritura pública** (`POST /api/append/:domain`, solo `visits`/`reviewsQueue`/`reports`):
  manda **un item**; el servidor hace el *read-modify-write* para que reseñas y denuncias
  concurrentes no se pisen. Una visita (`{armaId}`) es en cambio **un solo upsert** en
  `visitas_dia`; la fecha la pone el servidor; ids fuera de 1–5000 → 400 `arma_invalida`.
  `suggestions` y `pending` («Sugerir cambios» y «Proponer arma») se retiraron el 13-sep-2026. Reproduce exactamente el shape que la app espera.

## Rendimiento: `/api/state` con caché por versión (nov-2026)

El plan gratis de Workers corta cada petición a los **10 ms de CPU**, y `/api/state` se pide en
cada carga de página (y al volver a la pestaña). El contenido cambia pocas veces: reseñas
aprobadas unas veces por semana y el resembrado de las 20:00 (L-V) cuando hay inventario.
Por eso el snapshot **público** se sirve desde la Cache API de Cloudflare hasta que algo cambie:

- **Versión** = huella de los `updated_at` de las filas públicas (no `MAX(updated_at)`: el
  resembrado escribe `2026-11-06 20:00:00` y las Functions ISO, y como texto no se comparan
  bien). Cualquier escritura la cambia, venga del panel, de la moderación o del resembrado.
- La versión se recuerda **60 s** por centro de datos; la copia del snapshot, hasta 7 días con
  la versión en la clave. Un cambio tarda **≤ 1 min** en verse en todo el mundo, sin purgas.
- `ETag` = versión y `Cache-Control: no-cache`: el navegador pregunta y recibe **304** sin
  cuerpo; `store.js` además no re-parsea ni reescribe localStorage si el ETag no cambió.
- El **admin** (token de Access válido) no pasa por la caché: `no-store`, siempre de D1.
- Cabecera de diagnóstico `X-Amx-Cache`: `MISS` (se armó y guardó), `HIT`, `NOT-MODIFIED` (304).
- El snapshot se arma **pegando el texto de cada fila** (sin `JSON.parse` + `JSON.stringify` del
  todo); cada fila se valida con un parse solo al reconstruir.

Medido con `npm run bench:api` (handlers reales, snapshot de producción, HEFESTO; con el código
anterior el banco daba ~9 ms y el dashboard 10.6 ms de mediana, la escala es parecida):

| Petición | Antes | Ahora |
|---|---|---|
| `GET /api/state`, copia en caché | 8.7 ms | 0.4 ms |
| `GET /api/state`, misma versión (304) | — | ~0 ms |
| `GET /api/state`, reconstruir (1 vez por cambio y centro de datos) | 8.7 ms | 3.0 ms |
| `POST /api/append/visits` | 4.1 ms | 0.07 ms |

Sonda en producción (la segunda debe dar `HIT`, la tercera `304`):

```bash
curl -sD - -o /dev/null https://armado.mx/api/state | grep -iE '^HTTP|etag|x-amx-cache'
curl -sD - -o /dev/null https://armado.mx/api/state | grep -i x-amx-cache
curl -sD - -o /dev/null -H 'If-None-Match: <etag>' https://armado.mx/api/state | grep -i '^HTTP'
```

## Alta (una sola vez)

Requisitos: [`wrangler`](https://developers.cloudflare.com/workers/wrangler/) y el repo ya
desplegado como proyecto de Cloudflare Pages.

```bash
# 1) Crear la base D1 y copiar el database_id que imprime → wrangler.toml
wrangler d1 create armado-en-mexico

# 2) Crear la tabla (remota; usa --local para pruebas con `wrangler pages dev`)
wrangler d1 execute armado-en-mexico --remote --file=./scripts/sql/schema.sql

# 3) Vincular la D1 al proyecto Pages como  DB :
#    Dashboard → Pages → (proyecto) → Settings → Functions → D1 database bindings
#    Variable name: DB   ·   D1 database: armado-en-mexico
#    (o deja el binding en wrangler.toml con el database_id real)
```

### Autenticación del admin (Cloudflare Access)

La escritura de admin se protege con **Cloudflare Access**, igual que `admin.html`:

1. En **Zero Trust → Access → Applications**, asegúrate de que la aplicación que ya cubre
   `armado.mx/admin*` **también** cubra la ruta `armado.mx/api/admin/*` (añade ese path).
   Eso es lo que **realmente** bloquea la escritura en el borde, antes de la Function.
2. Define dos variables en **Pages → Settings → Variables and Secrets** (defensa en profundidad;
   la Function verifica el JWT de Access):
   - `CF_ACCESS_TEAM_DOMAIN` = `tu-equipo.cloudflareaccess.com`
   - `CF_ACCESS_AUD` = *Application Audience (AUD) tag* de esa app de Access.

   Si estas variables **no** están definidas, la API de admin responde `503` (fail-closed):
   nadie puede escribir hasta configurarlas.

### Sembrado inicial

La D1 arranca vacía → `GET /api/state` devuelve `{}` → la app usa sus _seeds_. Para subir la
contenido ya editado en un navegador (el del admin) por primera vez:

- Abre **`/admin.html` → Configuración → Backend compartido → «Sincronizar todo al servidor»**.
  Sube a D1 de una vez los dominios de contenido locales; se salta reseñas, cola, rechazadas,
  denuncias y visitas, que solo escribe el servidor. A partir de ahí, cada cambio se sincroniza solo.

## Desarrollo local

```bash
# Sirve la app + Functions + D1 local. ALLOW_INSECURE_ADMIN salta la verificación de
# Access SOLO en local (nunca en producción).
npm run build   # primero: se sirve out/
wrangler pages dev out --d1 DB=armado-en-mexico --binding ALLOW_INSECURE_ADMIN=1
# crea el esquema en la D1 local una vez:
wrangler d1 execute armado-en-mexico --local --file=./scripts/sql/schema.sql
```

Sin `wrangler` (solo estático, ej. `python3 -m http.server`): la app corre en modo offline;
`/api/*` da 404 y todo cae a `localStorage` — útil para trabajar en la UI sin backend.

## Seguridad y límites (fase 1)

- Lectura pública abierta (`GET /api/state`); es contenido de display.
- Escritura admin verificada por Access (path rule + JWT). Las variables faltantes = fail-closed.
- Escritura pública acotada: solo 3 dominios *append*, cuerpo ≤ 1 MB, strings recortados,
  arrays con tope, visitas solo para ids 1–5000 (la tabla guarda 60 días), reseñas de 100 a
  1200 caracteres (`RESENA_MIN`/`RESENA_MAX`) que esperan moderación en `reviewsQueue`.
- Concurrencia: el *append* de reseñas y denuncias hace read-modify-write por petición
  (suficiente para este tráfico). Las visitas ya están en su tabla; si crecen las reseñas,
  migrar `reviews`/colas a tablas fila-por-item es la evolución natural.
- "Última escritura gana" en los `PUT` de admin (sin control de versiones) **para los demás
  dominios**: reseñas, denuncias y visitas ya no (ver arriba). El admin re-hidrata
  al enfocar la pestaña.
