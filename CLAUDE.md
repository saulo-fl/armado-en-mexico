# CLAUDE.md — Instrucciones para Claude Code (Armado en México)

Este directorio es el contenido COMPLETO del repositorio `armado-en-mexico`.
Es una app estática con **un solo paso de build**: los `.jsx` se precompilan a `.js`
con Babel CLI (`npm run build`). No hay bundler ni módulos ES — los archivos se
comunican por `window.*` y el orden de los `<script>` en el HTML sigue importando.

**Los `.js` generados no se commitean** (`.gitignore`): los produce el build de
Cloudflare Pages en cada deploy. La fuente son los `.jsx`. En local: `npm install`
y `npm run build` (o `npm run watch`) antes de abrir la app por HTTP.

## Tooling de Claude — flujos, skills y agentes (`.claude/`)

Este repo tiene **skills y agentes** propios que se **autoinvocan** por su
`description`. Úsalos; no reinventes estos flujos a mano:

- **`conciliar-inventario`** — incorporar un PDF de DCAM/OTCA (precios, existencias,
  altas de fichas). Incluye scripts: `parse_pdf.py` (parser posicional para ambos
  formatos) y `auditar.js` (verificación de integridad).
- **`verificar-app`** — antes de commitear: transpila los `.jsx` + carga los
  `data-*.js` + valida invariantes. Orden: `node .claude/skills/conciliar-inventario/scripts/auditar.js`.
- **`fidelidad-diseno`** — al tocar UI: mantener el look táctico/tecnológico y no
  romper la transpilación ni el orden de carga. Complementa `HANDOFF-DISENO.md`.
- **`publicar`** — flujo git: `fetch` antes de `checkout -B` (gotcha), PR a `main` **y**
  `develop`, cache-busting `?v=` si cambian los `data-*.js`.
- **`mejorar-tooling`** — al cerrar una tarea: capturar aprendizajes/edge-cases en las
  skills (automejora). Mantén su inventario al día.

Agentes delegables: **`conciliador-inventario`** (conciliación completa) y
**`revisor-armado`** (auditoría de datos + fidelidad de diseño). **Regla:** cualquier
cambio de datos o UI se **verifica con `auditar.js`** y respeta `fidelidad-diseno`
antes de publicar. Al terminar algo no trivial, aplica `mejorar-tooling`.

## Tarea actual: publicar esta iteración como BRANCH

Esta carpeta contiene una **iteración de UI/UX ya aplicada** sobre la app
(detalle completo en `CHANGES.md`). Tu trabajo es publicarla como rama y abrir PR
— **no modificar el código**.

### Si el repo YA existe (caso esperado)

```bash
# dentro de una copia clonada del repo
git checkout -b feature/ui-accesibilidad-fichas
# reemplaza el contenido del repo con el de este zip (respetando .git/)
rsync -a --delete --exclude '.git' <carpeta-de-este-zip>/ .
git add -A
git commit -m "UI: fichas horizontales estandarizadas, accesibilidad tipográfica y carruseles con swipe"
git push -u origin feature/ui-accesibilidad-fichas
gh pr create --fill --title "UI: fichas horizontales + accesibilidad" --body-file CHANGES.md
```

### Si el repo NO existe (primer deploy)

```bash
git init -b main
git add -A
git commit -m "Primer deploy: Armado en México (app + admin + demo Shopify)"
gh repo create armado-en-mexico --public --source . --push
gh api -X POST "repos/{owner}/armado-en-mexico/pages" \
  -f "source[branch]=main" -f "source[path]=/"
```

### Verificación del deploy / preview

- `https://<OWNER>.github.io/armado-en-mexico/` → app principal (splash "CARGANDO ARSENAL…" y luego la home)
- `.../admin.html` → panel de administración
- `.../shopify-demo.html` → demo de la sección Shopify
- Consola sin 404 de `imagenes/`, `logo.png` ni de los `.jsx`
- Smoke test visual (ver `CHANGES.md` § Verificación): fichas horizontales, badges
  CIVIL en verde, carruseles con arrastre y sin flechas

## Conciliar inventarios y precios (tarea recurrente)

Los precios oficiales se alimentan desde los **PDFs de existencias de la DCAM**.
Toda la conciliación vive en **código versionado**, no en `localStorage`:

- Los PDFs van en la carpeta **`inventarios/`** con nombre `dcam-existencias-AAAA-MM-DD.pdf`.
- El registro de inventarios y el historial de precios por arma viven en **`data-precios.js`**
  (`window.AMX_MANUALES_SEED` y `window.AMX_PRICE_HISTORY_SEED`). Ese archivo tiene el
  esquema completo y las reglas documentadas en su cabecera — léelo antes de editar.

**Flujo al recibir un PDF nuevo:**
1. Copia el PDF a `inventarios/dcam-existencias-AAAA-MM-DD.pdf`.
2. Agrega su entrada en `AMX_MANUALES_SEED`. Si es el más reciente, ponle `primary: true`
   y quítaselo al inventario anterior (el `primary`/más reciente es la fuente de precios actual).
3. Lee el PDF, concilia precio por arma y **añade** (no reemplaces) un registro por arma en
   `AMX_PRICE_HISTORY_SEED[armaId]` con el precio de ESE inventario. Conserva los registros
   previos: el historial completo es el valor que muestra la ficha.
4. Si el precio actual de un arma cambió, actualiza también su `priceExact` en `data.js`
   (es lo que usan las tarjetas y el comparador). El último registro del historial debe
   coincidir con ese `priceExact`.

Armas sin registro explícito en `AMX_PRICE_HISTORY_SEED` muestran automáticamente su
`priceExact` (de `data.js`) atribuido al inventario principal — así nada queda sin fuente
mientras se concilia el resto.

**Autoridades DCAM / OTCA:** cada inventario en `AMX_MANUALES_SEED` lleva `autoridad`
(`'DCAM'` o `'OTCA'`); la ficha pinta el badge con `window.manualAutoridad`. Además del
inventario DCAM (3-oct, `primary`), está registrado el de **OTCA (Monterrey, 26-sep)**.
Las armas 112-128 son exclusivas de OTCA (no estaban en el DCAM); la **128 (IWI ARAD 7 DMR)**
es la variante de tirador designado del ARAD 7 estándar (id 79), catalogada como modelo aparte.

**Existencias POR SUCURSAL (no primaria/secundaria):** cada sede lleva su propia cantidad y la
ficha muestra una fila por sucursal donde el arma exista.
- **DCAM** → `window.AMX_ARMAS_EXISTENCIAS` (mapa `armaId → cantidad`, solo armas 1-111, las del
  PDF DCAM). Se lee con `window.getArmaExistencias(id)`.
- **OTCA** → campo `qty` dentro de cada registro OTCA de `AMX_PRICE_HISTORY_SEED` (cada inventario
  trae su cantidad). Se lee con `window.getArmaExistenciasOTCA(id)`. Las armas OTCA-exclusivas
  (112-128) **no** van en `AMX_ARMAS_EXISTENCIAS`: su existencia vive en ese `qty`.
Al conciliar un PDF nuevo, pon la cantidad de cada arma en el lado que corresponda (mapa DCAM o
`qty` del registro del inventario), nunca como un único número global.

## Direcciones (URLs) — esquema y reglas

Rutas legibles y jerárquicas, pensadas para SEO/GEO. Todo el ruteo vive en la
cabecera de **`app.jsx`** (`amxSlug`, `amxSlugIndex`, `amxBuildPath`, `amxParsePath`):

```
/pistolas                                  listado del tipo (filtro aplicado)
/pistolas/glock-19                         ficha del arma
  tipos: pistolas · revolveres · rifles · escopetas · carabinas
/cargadores                                listado de la categoría
/cargadores/cargador-22-lr-mossberg        ficha del accesorio
  categorías: cargadores · opticas · refacciones · empunaduras
/municiones                                listado (las municiones NO llevan sub-rama)
/municiones/12-ga-rio-perdigon-7-5-28-gr   ficha de la munición
```

- **Los slugs se derivan de los datos, no se guardan.** Armas: `tipo/nombre`.
  Accesorios: `categoria/nombre`. Municiones: `calibre marca bala grano` — calibre
  y marca **no bastan** (hay tres «12 GA · Rio» distintos), por eso se suman bala y
  grano; los 4 que aun así coinciden reciben sufijo `-2`, `-3`… asignado **por id
  ascendente**, para que la URL de una ficha no cambie al añadir otras.
- Si renombras un arma o cambias su tipo, **su URL cambia**. Es el precio de tener
  direcciones legibles; tenlo en cuenta si ya está indexada o compartida.
- El índice de slugs se memoiza y se reconstruye solo si cambia el tamaño de algún
  catálogo (p. ej. tras hidratar desde el backend).
- `404.html` es lo que hace funcionar las rutas profundas: Cloudflare no encuentra el
  archivo, sirve `404.html`, este redirige a `/?/<ruta>` y `index.html` la restaura.
  Gracias a ese rodeo `APP_BASE` se calcula con `pathname === '/'` y el `<base>` sale
  correcto aun en rutas de dos segmentos. **No toques ese trío sin probar una recarga
  directa sobre `/pistolas/glock-19`.**

## Reglas importantes

- **No renombres archivos ni rutas**: `index.html`, `admin.html` y `shopify-demo.html` cargan los `.js`/`.jsx` y `imagenes/` por ruta relativa. `data-precios.js` debe cargarse antes que `store.js`, y los PDFs viven en `inventarios/` (referenciados por ruta relativa).
- **No elimines `.nojekyll`** — evita que Jekyll interfiera con el servido de archivos.
- **Los `.jsx` se precompilan** con `npm run build` (Babel CLI, `babel.config.json` con `runtime: "classic"` — obligatorio: React se carga como global UMD, y el runtime `automatic` que Babel 8 trae por defecto emite `import` y rompe la app). Tras editar un `.jsx`, recompila antes de probar.
- Los scripts de React/Babel vienen de unpkg con hashes `integrity` fijados — no cambies las versiones.
- La carpeta `shopify/` no es parte de la web servida: contiene la sección Liquid instalable en el tema de Shopify de armasmys.com (instrucciones en `shopify/INSTALL.md`). Déjala en el repo como fuente de verdad.
- La barra "◉ DEBUG" (abajo-izquierda) es una herramienta de desarrollo intencional; no la quites.
- `logo.png` es un **borrador** del logo — se reemplazará por la versión final más adelante (mismo nombre de archivo).

## Backend compartido (Cloudflare Pages Functions + D1)

La curaduría del admin ya puede compartirse entre visitantes mediante un backend
**opcional y no intrusivo** (ver **`BACKEND.md`** para el detalle y el alta):

- Las **Functions** viven en `functions/api/` y Cloudflare Pages las despliega solas:
  `GET /api/state` (snapshot público), `POST /api/append/:domain` (escritura pública de
  `suggestions`/`pending`/`ratings`/`visits` con merge atómico en el server) y
  `PUT /api/admin/state/:domain` (reemplazo de un dominio, **solo admin**).
- **D1** guarda un *document store* por dominio: una fila `state(domain, data, updated_at)`
  con el mismo JSON que `localStorage` (esquema en `schema.sql`, binding `env.DB` en `wrangler.toml`).
- `store.js` **hidrata** al arrancar (`GET /api/state`) y empuja cada cambio. El render sigue
  siendo síncrono: la hidratación solo refresca el cache local y dispara `_notify()`.
- **Auth admin = Cloudflare Access** sobre `/admin*` y `/api/admin/*` (más verificación del
  JWT en la Function vía `CF_ACCESS_TEAM_DOMAIN`/`CF_ACCESS_AUD`; sin esas vars = fail-closed).
- **Compatibilidad total:** si no hay Functions/D1 (GitHub Pages, `file://`, antes de aprovisionar),
  `/api/*` da 404, `store.js` cae a modo offline y la app funciona igual que antes con seeds +
  `localStorage`. El sembrado inicial se hace desde **Admin → Configuración → «Sincronizar todo al servidor»**.

**No** toques el orden de carga ni conviertas store.js en async: la capa de backend es aditiva y
tolera la ausencia de red. El dominio `admin` (contraseña/sesión) **no** se sincroniza nunca.

**Limitación restante:** "última escritura gana" en los `PUT` de admin (sin versionado) y el
*append* hace read-modify-write por petición (suficiente para este tráfico). Migrar
`ratings`/`visits`/colas a tablas fila-por-item es la evolución natural si crece el volumen.

## Mejoras futuras opcionales (NO hacer ahora)

- Añadir una CSP en `_headers` (ya es posible: no queda JS inline transpilado).
- Servir imágenes en varios tamaños (`srcset`) para móvil; hoy son WebP uniformes de máx 1400px que las fichas muestran con `object-fit: contain`.

Ya hechas (no rehacer): precompilación de los `.jsx` con Babel CLI · React en builds
de producción · conversión de `imagenes/` a WebP.
