# CHANGES — Sesión: accesorios, ruteo por URL, autoridades DCAM/OTCA

Rama propuesta: `feature/accesorios-rutas-otca` · Junio 2026

Resumen para el PR: se añadió la sección **Accesorios DCAM**, se etiquetaron los
precios por **autoridad emisora (DCAM u OTCA)**, se implementó **ruteo por URL**
(cada pantalla con su dirección propia), y varias mejoras de UI en fichas y
calibres. Todo sobre el SPA estático servido por GitHub Pages.

> La fuente de verdad de inventarios/precios sigue siendo código versionado
> (`data-precios.js`, `data-accesorios.js`). Ver `CLAUDE.md` para el flujo de
> conciliación de PDFs.

---

## 1. Accesorios DCAM/OTCA (nuevos archivos)

- **`data-accesorios.js`** — catálogo de accesorios (`window.ACCESORIOS`),
  taxonomía de 10 categorías (`window.ACCESORIO_CATEGORIES`), inventarios
  (`window.ACCESORIOS_MANUALES`) e historial de precios
  (`window.ACCESORIOS_PRICE_HISTORY`, mapa `accesorioId → [{manualId, price, date, qty}]`).
  - Compatibilidad arma↔accesorio determinista: `window.accesorioFitsArma`,
    `getAccesoriosCompatibles(arma)`, `getArmasCompatibles(acc)`.
  - Existencias: `getAccesorioExistencias(id)` (qty del inventario más reciente).
- **`screens-accesorios.jsx`** — `AccesorioCard`, `HomeAccesoriosSection`
  (grid de categorías en el Home), `AccesoriosScreen` (catálogo agrupado por
  categoría, con filtros) y `AccesorioFicha` (detalle + precio + historial +
  carrusel de armas compatibles).

  ⚠ **DATOS DE MUESTRA**: el catálogo de accesorios y sus existencias son una
  muestra realista basada en la taxonomía DCAM. **Estructura definitiva; faltan
  conciliar referencias/precios/existencias reales** de los dos PDFs (ver §4).

## 2. Autoridad emisora: DCAM vs OTCA

- Cada inventario lleva `autoridad: 'DCAM' | 'OTCA'`.
  - Armas (`data-precios.js`): el PDF 3-oct-2025 → `DCAM`.
  - Accesorios (`data-accesorios.js`): existencias 3-oct → `DCAM`;
    `Stock OTCA · 26-sep` → `OTCA`.
- `window.AUTORIDADES` (sigla, nombre, color) y `window.manualAutoridad(manual)`
  (definidos en `data-accesorios.js`, usados por ambas fichas).
- En las fichas (armas y accesorios): título **"Precio de Referencia"** (genérico),
  **badge de color con la sigla** (DCAM ámbar / OTCA verde) junto al precio,
  etiqueta `Ref. {sigla}:`, `disponibles en {sigla}`, y **badge por renglón**
  en el historial. Subtítulo: "Según inventarios oficiales DCAM / OTCA".
- **Monterrey = OTCA** (catálogo propio). Para sumar el catálogo de armas OTCA:
  registrar el inventario con `autoridad: 'OTCA'` y la app lo etiqueta solo.

## 3. Ruteo por URL (cada pantalla con su dirección)

- **`app.jsx`**: History API. Mapa `SCREEN_TO_PATH` y helpers
  `amxBuildUrl` / `amxParsePath`. Estado inicial leído de la URL (deep-links),
  `pushState` al navegar, listener `popstate` (atrás/adelante del navegador).
  Rutas: `/`, `/arsenal`, `/calibres`, `/accesorios`, `/comparar`, `/legalidad`,
  `/preguntas`, `/acerca`, `/campos`, `/cursos`, `/traumaticas`, `/proponer`,
  `/mas`; fichas `/arma/<id>` y `/accesorio/<id>`.
- **`index.html`**: en `<head>`, antes de todo, congela `window.APP_BASE` e
  inyecta un **`<base href>`** (clave: que las rutas relativas de imágenes/scripts
  resuelvan contra la raíz aunque la URL sea profunda como `/arma/1`). Incluye el
  snippet de restauración de deep-links del truco SPA de GitHub Pages.
- **`404.html`** (nuevo): fallback SPA de GitHub Pages — reescribe `/<ruta>` a
  `/?/<ruta>` y redirige al index, que restaura la dirección con History API.
  Asume la app servida en la **raíz del dominio** (`armado.mx`); si se sirve en
  subcarpeta, ajustar `pathSegmentsToKeep` en `404.html` y `APP_BASE`.

## 4. Conciliación pendiente de datos reales (para Code)

Leer los PDFs oficiales y reemplazar la muestra por datos reales:
- Accesorios DCAM (3-oct): `EXIST_ACCESORIOS_PARA_3_OCTUBRE_2025.pdf`
  (https://www.gob.mx/cms/uploads/attachment/file/1026250/…).
- Stock OTCA (26-sep): `STOCK_OTCA_26_SEP._2025_PUBLICAR_PAG._WEB.pdf`
  (https://www.gob.mx/cms/uploads/attachment/file/1024996/…).
- Existencias de **armas**: llenar `window.AMX_ARMAS_EXISTENCIAS` en
  `data-precios.js` (mapa `armaId → cantidad`) desde
  `inventarios/dcam-existencias-2025-10-03.pdf`.
- Por cada ítem que aparezca en ambos catálogos, **añadir** (no reemplazar) un
  registro por inventario en el historial, conservando los previos.

## 5. Otros ajustes de UI de la sesión

- **Calibres**: el slider del Home muestra el sistema de percusión
  (`Rimfire` / `Percusión central`, derivado en `data-extra.js`) como eyebrow
  arriba del nombre; cartuchos a **escala real** (altura ∝ mm); sin glyphs de
  clase. La guía filtra por sistema. La tira "Armas que lo usan" ahora tiene
  **arrastre con mouse** (`DragScroll` en `screens-3.jsx`) además de táctil.
- **Placeholders**: Campos de Tiro / Cursos usan panel sólido limpio
  (sin rayas diagonales ni corchetes). Armas/accesorios sin foto real muestran
  un aviso discreto "Sin imagen disponible por el momento".
- **Ficha de arma** simplificada (una sola imagen, strip de specs clave,
  valoración con barras verde/amarillo/rojo). Botón "Similares" eliminado.
  Pestañas: "Ficha Técnica" y "Legalidad".
- **Existencias** en fichas: "X disponibles en {DCAM/OTCA}", citando el PDF
  fuente y su fecha, con aviso de dato histórico (no en tiempo real).
- **Nivel de precio** en verde con `$` más grandes.
- **Menú MÁS** reordenado; solo "Armas traumáticas" resaltada.
- **Oculto por el momento**: todo lo de asesoría legal / abogado externo
  (promo del home, tarjeta WhatsApp en Legalidad, menciones en FAQ/Acerca).
  Reversible (`{false && …}` y filtro por id en `getPromos`).

## 6. Orden de carga de scripts (importante)

`index.html` y `admin.html` cargan, en orden:
`data.js → data-extra.js → data-traumaticas.js → data-precios.js →
data-accesorios.js → store.js`, y luego los `screens-*.jsx` incluido
`screens-accesorios.jsx`. `data-accesorios.js` define `window.manualAutoridad`,
usado por las fichas de armas — no cambiar ese orden.

## Verificación (smoke test)

1. Consola sin 404 (incl. imágenes en `/arma/<id>` gracias al `<base href>`).
2. URLs cambian al navegar (`/calibres`, `/arsenal`, `/accesorio/101`…);
   atrás/adelante del navegador funcionan; recargar un deep-link funciona en
   producción (vía `404.html`).
3. Ficha de arma: "Precio de Referencia" con badge **DCAM**; historial debajo.
4. Ficha de accesorio 101: badges **DCAM** y **OTCA** en el historial.
5. Guía de calibres: deslizar la tira "Armas que lo usan" con mouse.

## Publicar

```bash
git checkout -b feature/accesorios-rutas-otca
rsync -a --delete --exclude '.git' <carpeta-de-este-bundle>/ .
git add -A
git commit -m "Accesorios DCAM/OTCA, ruteo por URL (+404 SPA), autoridad en precios, UI calibres/fichas"
git push -u origin feature/accesorios-rutas-otca
gh pr create --fill --title "Accesorios + rutas + autoridades DCAM/OTCA" --body-file CHANGES-sesion-accesorios-rutas-otca.md
```
