# CLAUDE.md — Instrucciones para Claude Code (Armado en México)

Este directorio es el contenido COMPLETO del repositorio `armado-en-mexico`.
Es una app estática (HTML + JSX transpilado en navegador, sin build step).

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

## Reglas importantes

- **No renombres archivos ni rutas**: `index.html`, `admin.html` y `shopify-demo.html` cargan los `.js`/`.jsx` y `imagenes/` por ruta relativa. `data-precios.js` debe cargarse antes que `store.js`, y los PDFs viven en `inventarios/` (referenciados por ruta relativa).
- **No elimines `.nojekyll`** — evita que Jekyll interfiera con el servido de archivos.
- **No "compiles" los `.jsx`**: se transpilan en el navegador con Babel standalone a propósito. La precompilación es una mejora futura opcional, no parte de este deploy.
- Los scripts de React/Babel vienen de unpkg con hashes `integrity` fijados — no cambies las versiones.
- La carpeta `shopify/` no es parte de la web servida: contiene la sección Liquid instalable en el tema de Shopify de armasmys.com (instrucciones en `shopify/INSTALL.md`). Déjala en el repo como fuente de verdad.
- La barra "◉ DEBUG" (abajo-izquierda) es una herramienta de desarrollo intencional; no la quites.
- `logo.png` es un **borrador** del logo — se reemplazará por la versión final más adelante (mismo nombre de archivo).

## Limitación conocida (documentar, no arreglar ahora)

El "backend" (`store.js` + `admin.html`) persiste en `localStorage`: la curaduría del admin (catálogo, páginas, favoritos, sugerencias) solo vive en el navegador donde se hizo. **Excepción:** los inventarios DCAM y el historial de precios se siembran en código (`data-precios.js`), así que esos sí viajan con el despliegue y los ven todos. Para compartir el resto de la curaduría entre visitantes hará falta un backend real (API + DB) en una fase posterior.

## Mejoras futuras opcionales (NO hacer ahora)

- GitHub Action que precompile los `.jsx` con Babel CLI y sirva JS plano (quita ~1-2 s de arranque).
- Cambiar React development → production builds.
- Convertir `imagenes/` a WebP uniformes con tamaños responsivos (hoy son mezcla de jpg/png/webp con relaciones de aspecto heterogéneas; las fichas las muestran con `object-fit: contain`).
