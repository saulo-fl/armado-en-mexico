# CHANGES — Inventarios DCAM y precio de referencia con fuente PDF

Rama propuesta: `feature/inventarios-precios-dcam` · Junio 2026

Resumen para el PR: la ficha de producto ahora muestra el **precio actual de
referencia DCAM con enlace al PDF oficial** donde se publica ese precio, más un
**historial de precios por inventario** (fecha del manual + enlace a su PDF). El
almacenamiento de inventarios se hizo **robusto**: los PDFs se versionan en el
repo (carpeta `inventarios/`) y la conciliación de precios vive en código
(`data-precios.js`), no en `localStorage` — así lo ven todos los usuarios.

Esta es la fuente de verdad operativa para la tarea recurrente de **alimentar PDFs
nuevos y conciliar precios** (documentada en `CLAUDE.md` § "Conciliar inventarios
y precios").

---

## 1. Nuevos archivos

- **`inventarios/dcam-existencias-2025-10-03.pdf`** — primer inventario oficial
  (fuente principal de los precios actuales del catálogo). Se referencia por ruta
  relativa; se sirve tal cual en GitHub Pages.
- **`data-precios.js`** — fuente de verdad de inventarios y precios. Define dos
  globales (su cabecera trae el esquema completo y las reglas de conciliación):
  - `window.AMX_MANUALES_SEED` — lista de inventarios (PDFs).
  - `window.AMX_PRICE_HISTORY_SEED` — mapa `armaId → [registros]`.

## 2. `data-precios.js` — modelo de datos

```js
// Inventario (PDF)
{ id:'man_dcam_2025_10_03', nombre:'Existencias de armas DCAM · 3 de octubre 2025',
  fecha:'2025-10-03', url:'inventarios/dcam-existencias-2025-10-03.pdf',
  fileName:'dcam-existencias-2025-10-03.pdf', primary:true }

// Registro de precio (uno por inventario donde aparece el arma; cronológico)
// AMX_PRICE_HISTORY_SEED[armaId] = [ ... ]; el ÚLTIMO = precio actual
{ manualId:'man_dcam_2025_10_03', price:'$8,733.33 MXN', date:'2025-10-03' }
```

- El inventario con fecha más reciente (o `primary:true`) es la **fuente principal**.
- `AMX_PRICE_HISTORY_SEED` arranca **vacío**: las armas sin registro explícito
  muestran su `priceExact` (de `data.js`) **atribuido automáticamente** al
  inventario principal, para que ninguna ficha quede sin fuente mientras se concilia.

## 3. `store.js`

- Nueva clave `K.manuales = 'amx_manuales_v2'`.
- `DEFAULT_MANUALES` ahora se toma de `window.AMX_MANUALES_SEED` (con respaldo
  embebido si el archivo no cargó). `PRICE_HISTORY_SEED` ← `window.AMX_PRICE_HISTORY_SEED`.
- CRUD de inventarios: `getManuales()` (ordena por fecha desc, fallback a la seed),
  `getManual(id)`, `getPrimaryManual()`, `saveManuales()`, `upsertManual()`,
  `deleteManual()`.
- `getPriceHistory(armaId)` con prioridad: (1) edición explícita en `localStorage`
  (admin) → (2) `PRICE_HISTORY_SEED[armaId]` → (3) auto-atribución del `priceExact`
  al inventario principal.
- Las armas pueden llevar `priceManualId` (inventario fuente del precio actual);
  el `ArmaForm` lo deriva del registro más reciente al guardar.

## 4. `admin.jsx`

- Nueva pestaña **INVENTARIOS** (`ManualesTab` + `ManualEditor`): registrar PDFs por
  **ruta relativa del repo** (recomendado) o enlace público; carga al navegador
  queda como borrador local secundario (con aviso de tamaño/cuota). Lista con fecha,
  conteo de armas que lo referencian, abrir/editar/eliminar.
- `ArmaForm`: editor **"Historial de precios DCAM"** — agrega registros eligiendo un
  inventario (dropdown) + precio; el más reciente se publica como precio actual y
  sincroniza `priceExact`/`dcamRef`. Al guardar persiste vía `setPriceHistory`.

## 5. `screens-2.jsx` (ficha de producto)

- Helper `amxFmtManualDate(YYYY-MM-DD)` → fecha legible es-MX.
- Bloque **"Precio Referencia DCAM"**: bajo la referencia, botón
  **"▦ Ver inventario fuente · {fecha} ↗"** que abre el PDF (cae al inventario
  principal si la ficha no apunta a otro).
- **"Historial de precios"**: cada registro muestra precio + **fecha del manual** +
  nombre del inventario + enlace **"▦ Ver PDF ↗"**. Subtítulo "Según inventarios
  oficiales DCAM-SEDENA".

## 6. `index.html` y `admin.html`

- Cargan **`data-precios.js` ANTES de `store.js`** (orden obligatorio: `store.js`
  consume los globales de la seed).

## 7. `CLAUDE.md`

- Nueva sección **"Conciliar inventarios y precios (tarea recurrente)"** con el flujo
  paso a paso al recibir un PDF nuevo. Regla "no renombres" actualizada
  (`data-precios.js` antes de `store.js`; PDFs en `inventarios/`).

---

## Publicar (rama + PR)

```bash
git checkout -b feature/inventarios-precios-dcam
# reemplaza el contenido del repo con el de este bundle (respetando .git/)
rsync -a --delete --exclude '.git' <carpeta-de-este-bundle>/ .
git add -A
git commit -m "Fichas: precio de referencia DCAM con PDF fuente + historial por inventario; almacenamiento de inventarios versionado en repo (data-precios.js)"
git push -u origin feature/inventarios-precios-dcam
gh pr create --fill --title "Inventarios DCAM + precio con fuente PDF" --body-file CHANGES-inventarios-precios.md
```

## Verificación (smoke test)

1. Consola sin 404 de `data-precios.js` ni del PDF en `inventarios/`.
2. Ficha de cualquier arma con precio: aparece "▦ Ver inventario fuente · 03 oct 2025"
   y abre el PDF; sección "Historial de precios" con un registro (precio + fecha +
   Ver PDF).
3. `admin.html` (clave `armado2026`) → pestaña **INVENTARIOS** lista el inventario
   del 3-oct-2025; editor de arma muestra "Historial de precios DCAM".
4. Enlaces de PDF resuelven a `inventarios/dcam-existencias-2025-10-03.pdf`.

## Notas

- No hay build step: los `.jsx` se transpilan en navegador (Babel standalone).
- **No se requiere migración de `localStorage`**: los inventarios y precios canónicos
  se siembran en código. Una edición de admin sigue teniendo prioridad por-navegador.
- Próximos PDFs: copiar a `inventarios/dcam-existencias-AAAA-MM-DD.pdf`, registrar en
  `AMX_MANUALES_SEED` (marcar `primary` el más reciente) y **añadir** registros en
  `AMX_PRICE_HISTORY_SEED` sin borrar los previos. Detalle en `CLAUDE.md`.
