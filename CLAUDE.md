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

## Cómo se trabaja aquí

Producción es **armado.mx**, servida por **Cloudflare Pages** desde `main`. `main` y
`develop` se mantienen en espejo. Sigue la skill **`publicar`** para el flujo de git
(el gotcha crítico: `git fetch origin main` **antes** de `checkout -B`, porque los
merges se hacen por la API y tu `origin/main` local se queda viejo).

```bash
npm install                 # una vez
npm run build               # .jsx -> .js  +  prerender de las 294 páginas
npx serve .                 # o cualquier servidor HTTP: los .jsx no cargan desde file://
node .claude/skills/conciliar-inventario/scripts/auditar.js   # antes de cada commit
```

Antes de publicar, la skill **`verificar-app`**. Al tocar UI, **`fidelidad-diseno`**.
Al cerrar algo no trivial, **`mejorar-tooling`**.

### Verificar un despliegue

Cloudflare reconstruye `main` al mergear (~1-2 min). Comprueba **estados HTTP**, que es
lo que ve un crawler — no basta con que se vea bien en el navegador:

```bash
for u in / /pistolas /pistolas/glock-19 /municiones/12-ga-rio-perdigon-7-5-28-gr          /sitemap.xml /robots.txt /app.js /imagenes/favicon.png /noexiste-xyz; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' https://armado.mx$u)  $u"
done
# Esperado: 200 en todas menos /noexiste-xyz -> 404
```

Si el deploy queda **Failed**, NO se publica nada y sigue vivo el anterior. Causa
conocida: un `database_id` inválido en `wrangler.toml` («Error 8000022»).

**Comprueba también que el backend no cayó a fallback.** Un fallback no se nota: el
sitio se ve perfecto y nada se comparte. **No sirve mirar `/api/state`** — devuelve
`200 {}` tanto con binding como sin él (`if (!env.DB) return json({})`). La sonda que
sí distingue es un `append` con JSON inválido, que llega a comprobar `env.DB` **antes**
de parsear el cuerpo, así que no escribe nada:

```bash
curl -s -X POST https://armado.mx/api/append/reviewsQueue -d 'x'  # -> {"error":"json_invalido"}
curl -s -X PUT  https://armado.mx/api/admin/state/pages -d '{}'   # -> {"error":"no_autenticado"}
```

`sin_backend` en la primera = se perdió el binding D1. `admin_auth_no_configurado` en
la segunda = se perdieron las vars de Access. Ambos son 503 y ambos son silenciosos.

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

## Prerender: un .html real por URL (`build-prerender.mjs`)

`npm run build` hace dos cosas: **`build:js`** (Babel) y **`build:html`**
(`build-prerender.mjs`), que emite **un fichero HTML por cada URL** — 294 — con su
`<title>`, `description`, `canonical`, Open Graph, JSON-LD y el contenido **en HTML
crudo** dentro de `#app-root`.

**Por qué existe** (detalle y fuentes en `SEO.md`): la app pinta todo con JS y las
rutas profundas devolvían **404** (las resolvía el truco SPA de `404.html`).
Googlebot **no renderiza JS en respuestas 4xx**, y GPTBot/ClaudeBot/PerplexityBot
**no ejecutan JS nunca**. Sin estos ficheros el sitio era invisible para ambos.

- React monta con `createRoot` (no `hydrateRoot`) y **reemplaza** ese contenido: no
  hay hidratación ni riesgo de desajuste. El HTML crudo es solo para los crawlers.
- **Nada de esto se commitea** (`.gitignore`): lo genera el build de Cloudflare.
  La fuente son los `.jsx` y los `data-*.js`. `index.html`, `admin.html`, `404.html`
  y `shopify-demo.html` **sí** son fuente y no se tocan.
- El script **falla ruidosamente** si `index.html` cambia de forma (busca el cálculo
  de `APP_BASE`, el `<base>`, el `<title>`, la `description` y `#app-root`). Si tocas
  esas líneas, actualiza las marcas del script — es a propósito: mejor romper el
  build que publicar 294 páginas mal generadas.

**Dos trampas ya resueltas — no las reintroduzcas:**

1. **`<base href="/">` va estático en el `<head>` de las páginas generadas.** El
   `index.html` lo crea por JS, y eso no basta: el *preload scanner* pide los
   `<script src="app.js">` **antes** de ejecutar ese inline, resolviéndolos contra
   `/pistolas/` → 18 peticiones 404 por visita. Con la etiqueta estática: 0.
2. **NO añadas un `_redirects`** (hoy no existe, y es deliberado). Coexisten
   `pistolas.html` (listado) y el directorio `pistolas/` (fichas); la documentación
   de Cloudflare no define cuál gana en `/pistolas`, pero **empíricamente gana el
   fichero**, que es justo lo que se quiere. Forzarlo con un rewrite
   `/pistolas → /pistolas.html 200` provoca un **bucle infinito**: Pages redirige
   todo `.html` a su versión sin extensión, así que el rewrite se persigue a sí
   mismo. Ya ocurrió una vez. Y **nunca un catch-all `/*`**: en Pages los redirects
   se siguen exista o no el asset, y se comería `sitemap.xml`, `robots.txt`,
   `app.js` e `imagenes/`.

`sitemap.xml` y `robots.txt` salen del mismo script. El `lastmod` se toma del commit
que tocó cada `data-*.js`; las páginas fijas van **sin** `lastmod` a propósito (Google
se cree la columna entera o la descarta entera: una fecha inventada contamina las
buenas).

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
- `.nojekyll` es un resto de la época de GitHub Pages; en Cloudflare no hace nada. Es inofensivo: déjalo.
- **Los `.jsx` se precompilan** con `npm run build` (Babel CLI, `babel.config.json` con `runtime: "classic"` — obligatorio: React se carga como global UMD, y el runtime `automatic` que Babel 8 trae por defecto emite `import` y rompe la app). Tras editar un `.jsx`, recompila antes de probar.
- Los scripts de React/Babel vienen de unpkg con hashes `integrity` fijados — no cambies las versiones.
- La carpeta `shopify/` no es parte de la web servida: contiene la sección Liquid instalable en el tema de Shopify de armasmys.com (instrucciones en `shopify/INSTALL.md`). Déjala en el repo como fuente de verdad.
- La barra "◉ DEBUG" (abajo-izquierda) es una herramienta de desarrollo intencional; no la quites.
- `logo.png` (raíz) es el logo del **header**, y es un borrador: se reemplazará por la
  versión final con el mismo nombre. No confundir con los iconos de `imagenes/`.
- **Los iconos están separados por uso a propósito** — no los unifiques: `favicon.png`
  (48px, 2 KB) es lo que pide todo navegador en cada visita; `apple-touch-icon.png`
  (180px) solo lo pide Safari al añadir a inicio; `logo-armado-mx.webp` (512px) es el
  icono PWA del manifest y el que sale en el tutorial. Servir el de 512 como favicon
  costaba 324 KB por visita.

## Backend compartido (Cloudflare Pages Functions + D1)

Lo editado en el admin ya puede compartirse entre visitantes mediante un backend
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

- **Prefiltro de reseñas con IA.** Hoy toda reseña espera revisión humana en
  Admin → RESEÑAS. La evolución natural es que un modelo la contraste antes contra
  las normas de la comunidad (`/soporte`) y la marque `ok` / `dudosa` / `rechazar`
  con su motivo, para que el humano revise solo lo dudoso. Encaja como llamada a la
  API de Claude dentro de la Function de `append`, o como tarea programada sobre la
  cola. **La decisión de publicar sigue siendo humana**: la IA ordena la cola, no la
  sustituye. Pedido explícito de Saulo (25-ago-2026).
- **Reseñas a tabla fila-por-reseña.** El dominio `reviews` viaja ENTERO en cada
  `GET /api/state`, o sea en cada carga de página de cada visitante. Por eso el tope
  de 1200 caracteres por reseña (`RESENA_MAX` en `functions/api/_lib.js`). Si el
  volumen crece, la salida es una tabla en D1 con paginación por entidad, no subir
  el tope.
- **Rate limiting en `/api/append/*`.** No hay ninguno, ni captcha ni identidad. Con
  reseñas de texto libre, la cola de moderación se puede inundar. Mitigación actual:
  nada se publica sin aprobación humana, así que el daño se queda en el panel.

- **Engrosar la sección «Historia» de cada arma con investigación real.** Hoy
  `arma.historia` sale del builder de `data.js` y mide 58/118/982 caracteres
  (mín/media/máx): en la mayoría son dos frases. Es el contenido con más valor
  divulgativo y de GEO de toda la ficha, y el que menos peso tiene. Pedido
  explícito de Saulo (25-ago-2026) para una sesión dedicada.
- Añadir una CSP en `_headers` (ya es posible: no queda JS inline transpilado).
- Servir imágenes en varios tamaños (`srcset`) para móvil; hoy son WebP uniformes de máx 1400px que las fichas muestran con `object-fit: contain`.
- Sincronizar `shopify/armado-en-mexico.catalog.json` (36 armas) con el catálogo real
  (179). Pendiente hasta la 1.0, y se quiere una versión **recortada** que empuje a la app.
- Revisar 3 municiones indistinguibles entre sí por calibre, marca, bala y grano
  (ids 2002/2034, 2048/2033, 2051/2029): puede ser el mismo producto en dos inventarios
  o un error de conciliación. Requiere los PDFs a la mano.
- **Recortar el fondo de las fotos de arma a WebP con alfa.** Muchas son recortes sobre
  blanco opaco (otras ya traen alfa) y sobre el hero oscuro de la ficha el blanco se lee
  como un error. Es problema de assets, no de CSS: cualquier truco de mezcla que "quite"
  el blanco rompe las que ya son transparentes.
- **`TopNav` desborda a lo ancho alrededor de los 1200px** y mete scroll horizontal en
  TODO el sitio: el rótulo `ENCICLOPEDIA TÁCTICA · ED. 2026` no cabe junto a los enlaces.
  Está en `ui.jsx`; se arregla ocultándolo o dejándolo encoger por debajo de cierto ancho.

Ya hechas (no rehacer): precompilación de los `.jsx` con Babel CLI · React en builds de
producción · `imagenes/` a WebP · URLs legibles por tipo y modelo · prerender estático
con `sitemap.xml` y `robots.txt` · iconos separados por tamaño de uso.

**Fuera del código — ya resuelto (25-ago-2026):** `/admin` está cerrado en Cloudflare
Access (destino `admin*`, política «Solo Admins» = Allow · Emails; la trampa era que
Access compara paths **literalmente** y Pages sirve `admin.html` también en `/admin`,
así que la política sobre `admin.html` no cubría nada). armado.mx está dado de alta en
Search Console con el sitemap enviado. Las vars de Access viven en `wrangler.toml`.

**Fuera del código — pendiente:** decidir si se abre el `robots.txt` gestionado de
Cloudflare a GPTBot/ClaudeBot (hoy bloquea el **entrenamiento**; los bots de citación
sí pasan, que son los que importan para GEO). Ver `SEO.md`. Y cambiar la contraseña
por defecto del admin (`armado2026`, en claro en `store.js` dentro de un repo público):
ya no es la única barrera —Access va delante— pero sigue ahí.
