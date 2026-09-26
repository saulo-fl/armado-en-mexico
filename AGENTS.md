# AGENTS.md — Instrucciones para agentes (Armado en México)

Este directorio es el contenido COMPLETO del repositorio `armado-en-mexico`.
Es una app estática. La fuente vive en `src/` y `public/`; `npm run build` la deja en
`out/`, que es lo que publica Cloudflare Pages. Babel precompila los `.jsx` a `.js`;
no hay bundler ni módulos ES — los archivos se comunican por `window.*` y el orden de
los `<script>` en el HTML sigue importando.

**Los `.js` generados no se commitean** (`.gitignore`): los produce el build de
Cloudflare Pages en cada deploy. En local: `npm install`
y `npm run build` (o `npm run watch`) antes de abrir la app por HTTP.

## Tooling de agentes — flujos, skills y agentes (`.claude/`)

Este repo tiene **skills y agentes** propios que se **autoinvocan** por su
`description`. Úsalos; no reinventes estos flujos a mano:

- **`conciliar-inventario`** — incorporar un PDF de DCAM/OTCA (precios, existencias,
  altas de fichas). Incluye scripts: `parse_pdf.py` (parser posicional para ambos
  formatos) y `auditar.js` (verificación de integridad).
- **`verificar-app`** — antes de commitear: transpila los `.jsx` + carga los
  `data-*.js` + valida invariantes. Orden: `node .claude/skills/conciliar-inventario/scripts/auditar.js`.
- **`fidelidad-diseno`** — al tocar UI: decisiones de producto ya tomadas, estructura de
  la ficha, vocabulario prohibido y la bitácora de trampas descubiertas. Incluye
  `contraste.mjs` (audita la `PALETTE` viva contra los umbrales WCAG).
- **`migrar-a-css`** — pasar una primitiva de estilos inline a `className` + CSS sin
  romper nada: qué va a cada sitio, el puente de custom properties, y las trampas de
  `_headers` y del guardia del build.
- **`publicar`** — flujo git: `fetch` antes de `checkout -B` (gotcha), PR a `main` **y**
  `develop`, cache-busting `?v=` si cambian los `data-*.js`.
- **`fotos-producto`** — preparar fotos de producto: quitar fondo con alfa, encuadrar a
  1:1, control de calidad y hoja de aprobación humana. Agente: **`preparador-imagenes`**.
- **`sincronizar-d1`** — resembrar D1 desde el código tras publicar datos. **No basta con
  desplegar**: los dominios de D1 pisan a los seeds.
- **`mejorar-tooling`** — al cerrar una tarea: capturar aprendizajes/edge-cases en las
  skills (automejora). Mantén su inventario al día.

Agentes delegables: **`deploy-main`** (publicar en producción, con resembrado de D1 y
sondas de verificación) · **`deploy-develop`** (llevar a `develop` para ver el preview,
sin tocar producción) · **`conciliador-inventario`** (conciliación completa) ·
**`preparador-imagenes`** (fotos de arma con alfa) · **`revisor-armado`** (auditoría de
datos + fidelidad de diseño) · **`disenador-oficial`** (rediseño y custodia del sistema
visual) · **`auditor-a11y-perf`** (contraste, foco, áreas táctiles, peso, coste de scroll) ·
**`auditor-estructura`** (orden del repo: huérfanos, basura, docs desactualizadas; solo informa).

**Diseño:** el brief vigente es **`docs/DESIGN.md`** — stack real, diagnóstico medido,
dirección de arte «Documento Oficial Mexicano + instrumentación» y prohibiciones
explícitas. `HANDOFF-DISENO.md` se **borró** (9-sep-2026): describía un stack inexistente
y ya había producido diagnósticos equivocados en sesiones de diseño.

**Los dos agentes de deploy están separados a propósito**: `develop` es el ensayo y no
necesita ni resembrar D1 ni verificar armado.mx; `main` es producción y no está hecho
hasta que D1 esté resembrado y las sondas den lo que deben. Mezclarlos era la vía por la
que se daba por publicado algo que ningún visitante veía.

**Agentes que no son Claude Code:** `.github/copilot-instructions.md` es el resumen
operativo de una página que GitHub Copilot inyecta solo — comandos, invariantes que
rompen el sitio y las prohibiciones de la §6b. Está pensado para modelos pequeños
(Qwen y compañía), que no digieren este documento entero. **Si cambian los comandos, el
stack o las prohibiciones, actualiza los dos.**

**Regla:** cualquier cambio de datos o UI se **verifica con `auditar.js`** y respeta
`fidelidad-diseno` antes de publicar. Al terminar algo no trivial, aplica
`mejorar-tooling`.

### Arnés: quién puede hacer qué (13-sep-2026)

Lo que dicen los agentes en prosa lo hace cumplir **`.claude/hooks/guardia.mjs`**, un
hook `PreToolUse` sobre Bash **y** PowerShell que lee el comando entero (no por prefijo,
que es como se saltaban las reglas `deny`: `git -C ruta push --force`, el flag al final,
o cualquier cosa desde PowerShell). Devuelve `deny`, `ask` (decide Saulo) o nada.
Prueba: `node .claude/hooks/guardia.test.mjs`.

| Perfil | Agentes | Además de la base |
|---|---|---|
| base | sesión principal, `deploy-main` | — |
| `lectura` | `revisor-armado`, `auditor-a11y-perf`, `auditor-estructura`, `impeccable-finish-reviewer`, `Explore`, `Plan` | nada de git/gh/wrangler que escriba, ni `npm install` |
| `trabajo` | `conciliador-inventario`, `preparador-imagenes`, `disenador-oficial`, `impeccable-*` que editan | ramas y PR sí; mergear, `gh api` de escritura y D1, no |
| `develop` | `deploy-develop` | PR y merge solo con base `develop` (lo consulta a GitHub); D1, no |

**Base, para todos:** `deny` al push directo a `main`/`develop`, al push forzado o que
borra, `reset --hard`, `clean -f`, `branch -D`, `gh auth token`, `wrangler auth token` y
matar procesos por nombre. `ask` en `gh pr merge`, `gh api` de escritura,
`resembrar.js --aplicar`, `wrangler d1 execute --remote` y deploys directos, y en lo que
tira cambios de otra sesión (`checkout -- …`, `restore`, `stash pop/drop`).
El perfil sale del `agent_type` que Claude Code pasa al hook. Un agente nuevo entra en
`base` hasta que se le asigne perfil en `PERFILES`.

**En GitHub**, el ruleset «Ramas permanentes» impide borrar o forzar `main` y `develop`
(no exige PR: rompería el push del workflow de cifras). Debería impedir también que el
borrado automático al mergear `develop → main` se lleve `develop` — sin medir aún.

**Sesiones que arrancan en la carpeta padre** (`Armado en Mexico\`, lo habitual): ahí no
se carga este `settings.json` ni `.claude/agents/`. Por eso la carpeta padre tiene
`.claude/agents` y `.claude/hooks` como **enlaces** a `repo/espejo-main/`, un worktree en
`origin/main` que su `SessionStart` refresca — y su `settings.local.json` engancha el
mismo guardia. **`repo/espejo-main` no se edita nunca**: es solo lectura, para que los
agentes y el guardia sean siempre los de `main` y no los de la rama que otra sesión tenga
sacada en `github-deploy`.

## Estructura del repo

Reestructurado el **9-sep-2026**. La regla es una sola: **la raíz solo lleva
configuración**; todo lo demás vive en su carpeta.

```
raíz/         solo config: package.json · wrangler.toml · babel.config.json
              .gitignore · CNAME · .nojekyll · README.md · AGENTS.md · CLAUDE.md · LICENSE (AGPL-3.0-or-later)
              LICENSE-CONTENIDO.md (CC BY-SA 4.0) · LICENSE-TERMINOS-ADICIONALES.md
functions/    las Functions de Pages. Van en la RAÍZ, fuera de out/: es donde
              Cloudflare las descubre. No las muevas.
public/       lo que se sirve tal cual → se copia entero a out/
              imagenes/ · inventarios/ · _headers · logo.png · manifest.webmanifest
src/          app.jsx · admin.jsx          (puntos de entrada)
  pages/      index.html · admin.html · 404.html
  screens/    los 7 screens-*.jsx
  components/ ui.jsx
  data/       los 6 data-*.js
  lib/        store.js · arsenal-hub.js · cotejo.js · dev-viewport.js
  styles/     estilo.css
scripts/      build-prerender.mjs · copiar-estaticos.mjs · actualizar-readme.mjs
              cotejo|vitrina|arsenal-hub|filtros|faq.test.mjs · dcam/ · sql/schema.sql
              tokens-dtcg.mjs (+ tokens.test.mjs) · capturas-movil.mjs   ← Penpot
docs/         BACKEND.md · SEO.md · PRODUCT.md · DESIGN.md · PLACEHOLDERS.md · PENPOT.md
              penpot/tokens.json (generado desde estilo.css) · capturas/movil/ (360 px)
out/          TODO lo generado. Gitignoreado. Es lo que publica Pages.
```

**Penpot es espejo, no fuente (22-sep-2026).** El diseño vive en `estilo.css` / `ui.jsx` /
`DESIGN.md`; el archivo «Wire Frame» de Penpot los consume por `docs/penpot/tokens.json`
(`npm run tokens`, vigilado por `scripts/tokens.test.mjs`) y sirve para proponer lo nuevo,
trabajar igual con cualquier agente y enseñar el sistema. Cómo conectar el MCP, el mapa
del archivo, el ritual por sesión y las trampas de la Plugin API: `docs/PENPOT.md`.

**Fuente estructurada, salida plana.** El build aplana: `src/styles/estilo.css`
acaba en `out/estilo.css` y se sirve como `/estilo.css`. Se hizo así a propósito
para que las URLs servidas no cambiaran y las 20 reglas literales de `_headers`
siguieran valiendo. Al leer una ruta en este documento, fíjate en si habla del
**archivo fuente** (lleva `src/`) o de la **URL servida** (plana, sin prefijo).

`npm run build` son tres pasos en este orden, y el orden importa:

1. `build:static` — vacía `out/` y copia `public/` + los archivos que no se
   compilan. Va **primero** porque vacía: si fuera después, borraría lo demás.
2. `build:js` — Babel compila los `.jsx` a `out/`, planos.
3. `build:html` — el prerender emite un `.html` por URL, `sitemap.xml` y `robots.txt`.
   Las cifras del día las imprime el propio build; no se copian aquí porque se pudren.

## Cómo se trabaja aquí

Producción es **armado.mx**, servida por **Cloudflare Pages** desde `main`. `main` y
`develop` se mantienen en espejo. Sigue la skill **`publicar`** para el flujo de git
(el gotcha crítico: `git fetch origin main` **antes** de `checkout -B`, porque los
merges se hacen por la API y tu `origin/main` local se queda viejo).

```bash
npm install                 # una vez
npm run build               # estáticos + .jsx -> .js + prerender, todo en out/
npx serve out               # o cualquier servidor HTTP sobre out/: no carga desde file://
node .claude/skills/conciliar-inventario/scripts/auditar.js   # antes de cada commit
npm test                     # las suites de node:test (scripts/*.test.mjs)
npm run smoke                # abre out/ en un Chrome real: una página por forma de ruta
node --test scripts/faq.test.mjs   # una sola suite
```

Antes de publicar, la skill **`verificar-app`**. Al tocar UI, **`fidelidad-diseno`**.
Al cerrar algo no trivial, **`mejorar-tooling`**.

### RESUELTO (26-ago-2026) — «Browser Cache TTL» de la zona pisaba el `_headers`

**Se quedó aquí porque la trampa se repite.** Durante meses un deploy tardaba 4 horas en
llegar a quien ya había visitado el sitio: el ajuste **Caching → Configuration → Browser
Cache TTL** de la zona `armado.mx` estaba en **4 h**, y ese ajuste **eleva cualquier
`max-age` menor** que envíe el origen, en todo tipo de archivo que Cloudflare cachea
(`.js`, `.png`, `.txt`…). Los `.js` salían de Pages con `max-age=0, must-revalidate` y
llegaban al navegador con `max-age=14400`.

**Ya está en «Respect Existing Headers»**, así que manda `_headers`. Si alguna vez vuelve a
servirse código viejo, este ajuste es el primer sospechoso — no se puede tocar desde el
repo, solo desde el dashboard.

Se aisló comparando el origen con la zona — la sonda, que sigue siendo la forma de
distinguir un problema de repo de uno de zona:

```bash
curl -sI https://armado-en-mexico.pages.dev/app.js | grep -i cache-control  # el origen
curl -sI https://armado.mx/app.js                  | grep -i cache-control  # con la zona delante
# Si DIFIEREN, el problema no está en el repo. Hoy coinciden: max-age=0, must-revalidate.
```

Por qué entonces solo se notaba en algunos ficheros: el ajuste **subía** los TTL bajos,
nunca bajaba los altos, y solo tocaba lo que Cloudflare cachea. Por eso `imagenes/` (`max-age=31536000`)
e `inventarios/` (`86400`) pasaban intactos, el HTML y `.xml`/`.webmanifest` también (no son
cacheables por defecto), y en cambio `robots.txt` sí salía reescrito a 14400.

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
Toda la conciliación vive en **código versionado**, no en `localStorage`. Desde el
14-sep-2026 hay además un **bot que concilia y publica solo** lo que ya está catalogado y
cambió de forma predecible (pieza 2 del bot DCAM): diseño completo en
`scripts/dcam/DISENO.md`. Lo de abajo es el flujo manual/heredado, que sigue aplicando a lo
que el bot manda a PR por dudoso:

- Los PDFs van en la carpeta **`public/inventarios/`** con nombre `dcam-existencias-AAAA-MM-DD.pdf`.
  Desde el 11-sep-2026 la DCAM los publica por separado: armas → `dcam-existencias-`, cartuchos →
  `dcam-municiones-`, accesorios → `dcam-accesorios-AAAA-MM-DD.pdf` (skill `conciliar-inventario`).
- El registro de inventarios y el historial de precios por arma viven en **`data-precios.js`**
  (`window.AMX_MANUALES_SEED` y `window.AMX_PRICE_HISTORY_SEED`). Ese archivo tiene el
  esquema completo y las reglas documentadas en su cabecera — léelo antes de editar.

**Flujo al recibir un PDF nuevo:**
1. Copia el PDF a `public/inventarios/dcam-existencias-AAAA-MM-DD.pdf`.
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

## Prerender: un .html real por URL (`scripts/build-prerender.mjs`)

`npm run build` son tres pasos (ver «Estructura del repo»): **`build:static`**, **`build:js`**
(Babel) y **`build:html`** (`scripts/build-prerender.mjs`), que emite **un fichero HTML por cada URL** — 398 — con su
`<title>`, `description`, `canonical`, Open Graph, JSON-LD y el contenido **en HTML
crudo** dentro de `#app-root`.

**Por qué existe** (detalle y fuentes en `docs/SEO.md`): la app pinta todo con JS y las
rutas profundas devolvían **404** (las resolvía el truco SPA de `404.html`).
Googlebot **no renderiza JS en respuestas 4xx**, y GPTBot/ClaudeBot/PerplexityBot
**no ejecutan JS nunca**. Sin estos ficheros el sitio era invisible para ambos.

- React monta con `createRoot` (no `hydrateRoot`) y **reemplaza** ese contenido: no
  hay hidratación ni riesgo de desajuste. El HTML crudo es solo para los crawlers.
- **Nada de esto se commitea** (`.gitignore`): el build lo genera en `out/`.
  La fuente son los `.jsx` de `src/` y los `data-*.js` de `src/data/`. Las tres
  páginas de `src/pages/` **sí** son fuente y no se tocan.
- El script **falla ruidosamente** si `index.html` cambia de forma (busca el cálculo
  de `APP_BASE`, el `<base>`, el `<title>`, la `description` y `#app-root`). Si tocas
  esas líneas, actualiza las marcas del script — es a propósito: mejor romper el
  build que publicar todas las páginas mal generadas.

**Dos trampas ya resueltas — no las reintroduzcas:**

1. **`<base href="/">` va estático en el `<head>` de las páginas generadas.** El
   `index.html` lo crea por JS, y eso no basta: el *preload scanner* pide los
   `<script src="app.js">` **antes** de ejecutar ese inline, resolviéndolos contra
   `/pistolas/` → 18 peticiones 404 por visita. Con la etiqueta estática: 0.
2. **`public/_redirects` solo admite redirecciones 301 literales** (desde el
   22-sep-2026 existe, con dos: las rutas viejas de Legalidad a `/legalidad/tramites`).
   Nunca un rewrite `200` ni un comodín. Coexisten `pistolas.html` (listado) y el
   directorio `pistolas/` (fichas); la documentación de Cloudflare no define cuál gana
   en `/pistolas`, pero **empíricamente gana el fichero**, que es justo lo que se
   quiere. Forzarlo con un rewrite `/pistolas → /pistolas.html 200` provoca un
   **bucle infinito**: Pages redirige todo `.html` a su versión sin extensión, así
   que el rewrite se persigue a sí mismo. Ya ocurrió una vez. Y **nunca un catch-all
   `/*`**: en Pages los redirects se siguen exista o no el asset, y se comería
   `sitemap.xml`, `robots.txt`, `app.js` e `imagenes/`.

`sitemap.xml` y `robots.txt` salen del mismo script. El `lastmod` sale de la **fecha del
inventario** del que viene cada artículo (los historiales de precio la traen, una por
artículo), así que es real y distinta por URL. Las páginas fijas van **sin** `lastmod` a
propósito (Google se cree la columna entera o la descarta entera: una fecha inventada
contamina las buenas).

**NO lo saques de git.** Se intentó y estuvo mal desde el principio: Cloudflare Pages
clona en superficial, así que `git log -1 -- ruta` cae siempre al commit HEAD y el
sitemap publicado llevaba UNA sola fecha —la del último deploy— en sus 317 URLs. En
local no se ve, porque ahí sí hay historial. Medido el 9-sep-2026 comparando armado.mx
con el historial local; corregido en la misma fecha.

## Direcciones (URLs) — esquema y reglas

Rutas legibles y jerárquicas, pensadas para SEO/GEO. Todo el ruteo vive en la
cabecera de **`app.jsx`** (`amxSlug`, `amxSlugIndex`, `amxBuildPath`, `amxParsePath`):

```
/arsenal                                  base de la sección (el hub)
/arsenal/catalogo                         el catálogo completo
/arsenal/catalogo/dcam                    catálogo filtrado por armería DCAM (filtro rápido)
/arsenal/catalogo/otca                    catálogo filtrado por armería OTCA (filtro rápido)
/pistolas                                  listado del tipo (filtro aplicado)
/pistolas/glock-19                         ficha del arma
  tipos: pistolas · revolveres · rifles · escopetas · carabinas
/cargadores                                listado de la categoría
/cargadores/cargador-22-lr-mossberg        ficha del accesorio
  categorías: cargadores · opticas · refacciones · empunaduras
/municiones                                listado (las municiones NO llevan sub-rama)
/municiones/12-ga-rio-perdigon-7-5-28-gr   ficha de la munición
/comparar/ruger-lcp-vs-ruger-lcp-max   comparador (slug del nombre, sin la rama de tipo; el orden es el de las armas)
```

- **Los slugs se derivan de los datos, no se guardan.** Armas: `tipo/nombre`.
  Accesorios: `categoria/nombre`. Municiones: `calibre marca bala grano` — calibre
  y marca **no bastan** (hay tres «12 GA · Rio» distintos), por eso se suman bala y
  grano; los 4 que aun así coinciden reciben sufijo `-2`, `-3`… asignado **por id
  ascendente**, para que la URL de una ficha no cambie al añadir otras.
- Si renombras un arma o cambias su tipo, **su URL cambia**. Es el precio de tener
  direcciones legibles; tenlo en cuenta si ya está indexada o compartida.
- **Comparador:** los slugs son los del NOMBRE, sin la rama de tipo, y el orden de la
  URL es el orden de las armas (la tira compara la segunda contra la primera).
  Renombrar un arma rompe los enlaces de comparación ya compartidos. Estas URL **no
  se prerenderizan** (noindex hasta la parte 2 del comparador).
- El índice de slugs se memoiza y se reconstruye solo si cambia el tamaño de algún
  catálogo (p. ej. tras hidratar desde el backend).
- `404.html` es lo que hace funcionar las rutas profundas: Cloudflare no encuentra el
  archivo, sirve `404.html`, este redirige a `/?/<ruta>` y `index.html` la restaura.
  Gracias a ese rodeo `APP_BASE` se calcula con `pathname === '/'` y el `<base>` sale
  correcto aun en rutas de dos segmentos. **No toques ese trío sin probar una recarga
  directa sobre `/pistolas/glock-19`.**

## Reglas importantes

- **⚠️ SI ENTRA ALGUIEN MÁS AL REPO, ACOTA LOS PERMISOS ANTES.** La lista
  `permissions.allow` de `.claude/settings.json` está calibrada para **un solo
  desarrollador que es también el dueño de la cuenta de Cloudflare** (Saulo,
  27-ago-2026). El permiso `Bash(npx wrangler d1 execute:*)` es el que hay que
  mirar primero: con el comodín, autoriza **cualquier SQL contra cualquier base D1
  de la cuenta** — `DROP TABLE` incluido — sin preguntar. Es cómodo mientras
  trabaja una sola persona que puede reparar lo que rompa; deja de serlo en cuanto
  hay un segundo par de manos, porque el permiso viaja en el repo y aplica a
  quien lo clone.
  Al añadir a alguien: sustituye el comodín por lo mínimo que necesite (idealmente
  solo `resembrar.js`, que ya encapsula el único uso legítimo), o quítalo y deja
  que el resembrado lo haga quien tenga la cuenta. Revisa la lista entera con el
  mismo criterio, no solo esa línea.

  **Los agentes `deploy-main` y `deploy-develop` necesitan el flujo de git y `gh`
  en esa lista** (`git add/commit/merge/rebase/push`, `gh pr create/merge`, más
  `git ls-remote` y `git checkout`). Sin esos permisos el flujo se corta a mitad:
  el 31-ago-2026 se quedó una rama empujada con el PR abierto y sin mergear, y
  hasta un `git ls-remote` de solo lectura resultó bloqueado.

  Al añadirlos, las dos entradas que hay que mirar con el mismo ojo que
  `wrangler` son `Bash(git push:*)` y `Bash(git rebase:*)`: entre las dos se
  puede reescribir la historia de `main`. Conviene acompañarlas de un bloque
  `permissions.deny` con `git push --force` / `-f` / `--delete`, `git reset
  --hard` y `git clean -fdx` — pero **ese deny no es hermético y no debe darte
  confianza**: la coincidencia es por prefijo del comando, así que no cubre
  variantes como `git push origin +main` ni `--force-with-lease`. Es una red para
  el descuido, no una barrera contra la intención.

  **Nota para Claude:** editar `.claude/settings.json` está bloqueado por el
  clasificador del entorno, y está bien que lo esté — es el archivo que te da
  permisos a ti. Propón el contenido y que lo aplique el usuario; no busques otra
  vía para escribirlo.

- **Campos de tiro y Experiencias están CONGELADAS** (27-ago-2026) para poder publicar:
  sus datos son de relleno y la app sirve una pantalla «Próximamente» en `/campos`,
  `/experiencias` y `/cursos` (alias vivo del nombre viejo). No están enlazadas desde
  ningún sitio y salen del sitemap con `noindex`. **Las pantallas reales siguen escritas
  en `screens-3.jsx`**: los cinco pasos para reactivarlas están en `docs/PLACEHOLDERS.md`.
  No produzcas las 12 fotos 16:9 de esas secciones mientras siga así.

- **No cambies las rutas SERVIDAS.** La fuente vive en `src/`, pero el build la **aplana** en `out/`: `src/styles/estilo.css` se sirve como `/estilo.css`, y `src/screens/screens-1.jsx` como `/screens-1.js`. Eso no es un detalle cosmético: las páginas cargan esas URLs planas y las 20 reglas de `_headers` las listan **una por una con ruta literal** (los comodines no matchean en Pages), así que aplanar es lo que las mantiene válidas. Si mueves algo dentro de `src/`, ajusta `scripts/copiar-estaticos.mjs`, no el HTML. `data-precios.js` debe seguir cargándose antes que `store.js`, y los PDFs viven en `public/inventarios/`.
- `.nojekyll` es un resto de la época de GitHub Pages; en Cloudflare no hace nada. Es inofensivo: déjalo.
- **Los `.jsx` se precompilan** con `npm run build` (Babel CLI, `babel.config.json` con `runtime: "classic"` — obligatorio: React se carga como global UMD, y el runtime `automatic` que Babel 8 trae por defecto emite `import` y rompe la app). Tras editar un `.jsx`, recompila antes de probar.
- Los scripts de React/Babel vienen de unpkg con hashes `integrity` fijados — no cambies las versiones.
- La barra "◉ DEBUG" (abajo-izquierda) es una herramienta de desarrollo intencional; no la quites.
- `public/logo.png` **no** es el logo del header: es el borrador de 256 px sin alfa que
  queda como valor de fábrica del admin (`store.js`). El header lo pinta `LogoMarca` en
  SVG (`src/components/ui.jsx`). No confundir con los iconos de `imagenes/`.
- **Los iconos están separados por uso a propósito** — no los unifiques: `favicon.png`
  (48px, 2 KB) es lo que pide todo navegador en cada visita; `apple-touch-icon.png`
  (180px) solo lo pide Safari al añadir a inicio; `logo-armado-mx.webp` (512px) es el
  icono PWA del manifest y el que sale en el tutorial. Servir el de 512 como favicon
  costaba 324 KB por visita.

## Backend compartido (Cloudflare Pages Functions + D1)

Lo editado en el admin ya puede compartirse entre visitantes mediante un backend
**opcional y no intrusivo** (ver **`docs/BACKEND.md`** para el detalle y el alta):

- Las **Functions** viven en `functions/api/` y Cloudflare Pages las despliega solas:
  `GET /api/state` (snapshot público), `POST /api/append/:domain` (escritura pública de
  `reviewsQueue`/`reports`/`visits` con merge atómico y
  **validación** en el server) y
  `PUT /api/admin/state/:domain` (reemplazo de un dominio, **solo admin**).
- **D1** guarda un *document store* por dominio: una fila `state(domain, data, updated_at)`
  con el mismo JSON que `localStorage` (esquema en `scripts/sql/schema.sql`, binding `env.DB` en `wrangler.toml`).
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
`reviews`/`visits`/colas a tablas fila-por-item es la evolución natural si crece el volumen.

## RESUELTO (27-ago-2026) — «DCAM Monterrey» y por qué tardó dos días

**Se queda aquí porque el error de método se repite, no el dato.** La DCAM está
**solo** en el **Campo Militar No. 1-D, en Naucalpan, Edo. Méx.** (Av. Industria Militar
1111, Col. Lomas de Tecamachalco, C.P. 53950; planta baja del edificio principal de la
Dirección General de Industria Militar), según gob.mx/defensa/acciones-y-programas/comercializacion-de-armas
y la «Ubicación de módulos de registro» del RFA (módulo RFA-DCAM-1: «Campo Militar 1-D»).
No está en la CDMX, como dijo el sitio hasta sep-2026. La sede de Monterrey es de **OTCA**,
otra institución. El 25-ago se corrigió en `data.js` y se dio por cerrado **sin grepear el
resto**: el texto vivía en cuatro archivos más. Al hacerlo bien aparecieron **doce**
sitios, no cinco, porque había un segundo error encadenado — varias respuestas
declaraban que la DCAM es el **único** punto legal de adquisición, omitiendo a OTCA,
que es justo quien surte el catálogo de municiones de esta app: la app se contradecía.

Los textos están **duplicados** en `store.js` (`DEFAULT_PAGES`) y en `screens-2.jsx`
(el fallback de la pantalla). Corregir uno solo deja que el otro resucite el error.
Si vuelves a tocar el trámite o el FAQ, corrige los dos y grepea `store.js *.jsx`
antes de cerrar.

**Corregir el código NO bastó, y esa es la parte que se pasó por alto dos veces:** el
dominio `pages` estaba guardado en D1 con el texto viejo, y D1 **pisa** a
`DEFAULT_PAGES` al hidratar. Ahora hay skill para eso — **`sincronizar-d1`** — que
resiembra desde el código en vez de desde el navegador. Sonda:

```bash
curl -s https://armado.mx/api/state | grep -c "sede Monterrey"   # debe dar 0
```

### Lo que ese mismo mecanismo tenía escondido

Al resembrar se descubrió que `armas` llevaba **congelado desde el 25-ago**: servía
**179 fichas cuando el catálogo tenía 192** — las trece del inventario DCAM del 6-jul
llevaban siete semanas invisibles —, «DCAM Monterrey» en 117 armas y 113 precios
viejos. **Publicar no es desplegar.** Después de tocar `data.js` o `DEFAULT_PAGES`,
resiembra D1 y compruébalo como visitante, no por la API.

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
- **CAPTCHA + rate limiting en `/api/append/*`.** No hay ninguno de los dos, ni
  identidad. Con reseñas de texto libre, la cola de moderación se puede inundar.
  Mitigación actual: nada se publica sin aprobación humana, así que el daño se queda
  en el panel. La vía natural es **Cloudflare Turnstile** (el sitio ya vive en
  Cloudflare Pages): widget en `OpinionBlock` y la denuncia de
  `SoporteScreen`, y verificación del token dentro de la Function de `append` **antes**
  de tocar D1 — mismo sitio donde ya se valida el mínimo de caracteres. Pedido
  explícito de Saulo (26-ago-2026) al rediseñar el bloque de opinión.

- **Engrosar la sección «Historia» de cada arma con investigación real.** Hoy
  `arma.historia` sale del builder de `data.js` y mide 58/118/982 caracteres
  (mín/media/máx): en la mayoría son dos frases. Es el contenido con más valor
  divulgativo y de GEO de toda la ficha, y el que menos peso tiene. Pedido
  explícito de Saulo (25-ago-2026) para una sesión dedicada.
- **`TopNav` sigue desbordando por debajo de ~1140px** y mete scroll horizontal en TODO
  el sitio. El 26-ago-2026 se retiró el rótulo `ENCICLOPEDIA TÁCTICA · ED. 2026`, que
  liberó unos 280px —antes reventaba en casi cualquier escritorio—, pero **no bastó**:
  medido a 992px, la barra necesita 1125px. El reparto es logo 40 + padding 56 + gap 24
  + `marginLeft` 12 + 982px de enlaces.
  Recortar padding y `letterSpacing` da ~126px: alcanza por los pelos y se vuelve a romper
  en cuanto se añada un enlace. La salida de verdad es un breakpoint que compacte la barra
  (o mueva enlaces al desplegable «Más») por debajo de 1200px.
  **Ojo con el atajo**: `overflowX: 'auto'` en el contenedor de enlaces quita el desborde
  pero **recorta el desplegable de «Más»**, que es `position: absolute` dentro de ese mismo
  div. Habría que sacarlo del flujo primero.
- Añadir una CSP en `_headers` (ya es posible: no queda JS inline transpilado).
- Servir imágenes en varios tamaños (`srcset`) para móvil; hoy son WebP uniformes de máx 1400px que las fichas muestran con `object-fit: contain`.
- Revisar 3 municiones indistinguibles entre sí por calibre, marca, bala y grano
  (ids 2002/2034, 2048/2033, 2051/2029): puede ser el mismo producto en dos inventarios
  o un error de conciliación. Requiere los PDFs a la mano.
- **Fotos de arma con alfa — EN CURSO (skill `fotos-producto`).** El censo vigente
  (cuántas tienen alfa, cuáles faltan y en qué resolución) vive en
  **`docs/PLACEHOLDERS.md`**; no lo dupliques aquí. Hay pipeline, control de calidad y
  hoja de aprobación; lo que falta es material. El estándar acordado es **lateral
  derecha sobre lienzo 1:1**.

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
sí pasan, que son los que importan para GEO). Ver `docs/SEO.md`. Y cambiar la contraseña
por defecto del admin (`armado2026`, en claro en `store.js`, que armado.mx sirve público
aunque el repo sea privado):
ya no es la única barrera —Access va delante— pero sigue ahí.

## Convenciones de contribución

- **Estilo:** conserva la sangría existente de dos espacios, punto y coma, comillas simples, `camelCase` para funciones y variables, y `UPPER_SNAKE_CASE` para constantes. Los comentarios y textos visibles van en español.
- **Pruebas:** usa `node:test` y `node:assert/strict`; nombra los archivos `*.test.mjs`. Las pruebas del navegador viven en `scripts/` y las de Functions junto a sus helpers privados. Antes de abrir un PR corre `npm run build`, `npm test`, `npm run smoke`, `node --test functions/api/_lib.test.mjs` y la auditoría indicada arriba. El smoke no es opcional si tocaste un `.jsx`: ni las pruebas ni el build ejecutan los componentes, y es ahí donde se esconden los fallos que dejan la pantalla en blanco.
- **Commits:** usa asuntos breves en español y enfocados en un solo cambio. El historial admite el formato convencional cuando ayuda, por ejemplo `fix: corregir menú móvil` o `feat(traumaticas): rediseñar cotización`.
- **Pull requests:** explica el cambio visible, enumera la verificación ejecutada, enlaza el issue si existe y adjunta capturas antes/después para cambios de UI. Trabaja en una rama de tarea; nunca hagas push directo a `main` o `develop`. Los merges, despliegues de producción y escrituras remotas en D1 requieren aprobación explícita.
