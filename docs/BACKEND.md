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
    state.js                    GET  /api/state                 → snapshot público (read)
    append/[domain].js          POST /api/append/:domain         → escritura pública (merge atómico)
    admin/state/[domain].js     PUT  /api/admin/state/:domain    → reemplazo de dominio (solo admin)
scripts/sql/schema.sql          tabla `state(domain, data, updated_at)` — un blob JSON por dominio
wrangler.toml                   binding D1 (env.DB) + config de Pages
```

**Modelo de datos:** un *document store* por **dominio**. Cada dominio que store.js ya
maneja (`armas`, `pages`, `promos`, `favorites`, `appConfig`, `manuales`, `priceHist`,
`rejected`, `visits`, `reviews`, `reviewsQueue`, `reports`;
lista canónica en `ALL_DOMAINS` de `functions/api/_lib.js`) es **una fila** con su JSON,
con el mismo shape que en `localStorage`. La contraseña/sesión (`admin`) **nunca** viaja.

- **Escritura admin** (`PUT /api/admin/state/:domain`): reemplaza el blob del dominio.
  La usa todo el panel (editar páginas/promos/catálogo/favoritos/branding/inventarios y
  moderar reseñas y denuncias).
- **Escritura pública** (`POST /api/append/:domain`, solo `visits`/`reviewsQueue`/`reports`):
  manda **un item**; el servidor hace el *read-modify-write* para que reseñas y denuncias
  concurrentes no se pisen.
  `suggestions` y `pending` («Sugerir cambios» y «Proponer arma») se retiraron el 13-sep-2026. Reproduce exactamente el shape que la app espera.

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
  Sube todos los dominios locales a D1 de una vez. A partir de ahí, cada cambio se sincroniza solo.

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
- Escritura pública acotada: solo 5 dominios *append*, cuerpo ≤ 1 MB, strings recortados,
  arrays con tope, ventana de visitas de 60 días, reseñas de 100 a 1200 caracteres
  (`RESENA_MIN`/`RESENA_MAX`) que esperan moderación en `reviewsQueue`.
- Concurrencia: el *append* hace read-modify-write por petición (suficiente para este tráfico).
  Para volumen alto, migrar `reviews`/`visits`/colas a tablas fila-por-item es la evolución natural.
- "Última escritura gana" en los `PUT` de admin (sin control de versiones). El admin re-hidrata
  al enfocar la pestaña.
