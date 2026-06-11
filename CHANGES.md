# CHANGES.md — Iteración UI/UX · accesibilidad y fichas estandarizadas

Rama propuesta: `feature/ui-accesibilidad-fichas` · Junio 2026

Resumen para el PR: estandarización de las fichas de arma (layout horizontal único),
semántica de color en badges legales, aumento tipográfico global para accesibilidad
(público adulto / adulto mayor) y carruseles modernos con swipe.

---

## 1. Fichas de arma estandarizadas (horizontales)

**Archivos: `ui.jsx`, `screens-1.jsx`**

- Toda ficha de arma (catálogo, carruseles de home, "Misma categoría") usa ahora un
  layout **horizontal**: foto a la izquierda (42% del ancho, llena la altura) y datos
  a la derecha.
- Cuerpo unificado en el nuevo componente **`ArmaCardBody`** (`window.ArmaCardBody`),
  que muestra **únicamente**:
  1. Bandera del país (SVG `CountryFlag`) + marca
  2. Nombre del modelo — 2 líneas fijas con clamp (altura 40px)
  3. Calibre (`CAL …`)
  4. Badge de legalidad (`AvailBadge` compacto)
  5. Nivel de precio (`PriceLevel`)
- Eliminados del cuerpo: capacidad, visitas, estrellas, "marca · país" en texto.
  Los indicadores de sección (★ TOP, ranking, calificación) quedan como overlay
  sobre la foto.
- Todas las fichas llenan el 100% de la altura de su fila (`height:'100%'` +
  wrappers con ancho fijo en el carrusel) → tamaños idénticos dentro de cada sección.
- Catálogo: grid a **1 columna en móvil / 2 tablet / 3 escritorio**.
- Botón comparar ⇄ solo se renderiza si hay handler (`onCompare`).

## 2. Semántica de color

**Archivos: `ui.jsx` (PALETTE + AvailBadge), `data.js`, `screens-3.jsx`**

- `PALETTE.green = #4FAE5C` (nuevo token).
- Badges legales: **CIVIL = verde** (dcam y externo), **SEGURIDAD = amarillo
  #F5C518**, **EJÉRCITO = rojo #C0392B**. En modo compacto usan labels cortos
  ("CIVIL" en vez de "CIVIL · DCAM").
- `CATEGORIES.disponibilidad[dcam].color` → verde (afecta "Por disponibilidad legal").
- Niveles de curso (Básico/Intermedio/Avanzado): **todos gris #9AA3AD**, sin
  relleno sólido (`NIVEL_COLOR` en `screens-3.jsx`).

## 3. Accesibilidad tipográfica

**Archivos: `ui.jsx`, `screens-1/2/3.jsx`, `app.jsx` (~270 valores)**

- Aumento global: tamaños ≤15px → **+2px**; 16–24px → **+1px**; >24px sin cambio.
  Mínimo efectivo ~10-11px (antes había 8px).
- Alturas fijas dependientes ajustadas (títulos 2 líneas, slider promocional
  330/285px, `containIntrinsicSize`, `StarRating` PX map, badges).
- Nuevo **`PriceLevel`**: escala de precio con 5 `$` siempre visibles — llenos en
  amarillo, restantes atenuados (sustituye `starsCost` con puntos `·` que se veía
  mal en móvil). `starsCost` sigue existiendo en `data.js` por compatibilidad.

## 4. Carruseles modernos

**Archivos: `ui.jsx` (HCarousel), `screens-1.jsx` (CarouselSection)**

- `HCarousel`: swipe táctil nativo + **arrastre con mouse** (pointer events, con
  supresión de click tras drag), scroll-snap por ficha, sin barras de scroll,
  **sin flechas** (eliminadas a petición del usuario).
- Ancho de item: 300px móvil / 340px escritorio (fichas horizontales).
- Secciones vacías de la home (favoritos / más visitadas / mejor calificadas) ya no
  muestran barra gris de aviso: renderizan un **carrusel de sugerencias** del
  catálogo con nota discreta (`fallbackItems` / `fallbackNote` / `fallbackRender`
  en `CarouselSection`).

## 5. Medios y proporciones

- Placeholders de **campos de tiro y cursos: 16:9** (`StripePlaceholder`); las
  tarjetas de curso ahora incluyen placeholder de foto.
- Fotos de **categorías: 4:5** (antes 1:1) en la home.
- Mini-fichas "armas que lo usan" (guía de calibres): 16:9.
- **`logo.png`** (borrador) integrado como logo por defecto del header
  (`DEFAULT_APP_CONFIG.logo` en `store.js`; un logo vacío guardado en
  localStorage cae al default). Reemplazable desde el panel admin.

## 6. Verificación sugerida (smoke test)

1. Home móvil (~390px): carruseles arrastrables, fichas horizontales de 300px,
   badge CIVIL verde, escala `$$$$$` con llenos/vacíos, sin flechas ‹ › y sin
   barras de scroll.
2. Catálogo: 1 columna en móvil; fichas idénticas en altura; botón ⇄ presente
   (ahí sí hay comparador).
3. Cursos: 3 badges de nivel en gris; tarjetas con placeholder 16:9.
4. Ficha de producto: "Nivel: $$$$$" con escala nueva.
5. Header: logo borrador visible (cuadro 28×28).

## Notas

- No hay build step: los `.jsx` se transpilan en navegador (Babel standalone).
- `admin.jsx` NO recibió el aumento tipográfico (herramienta interna).
- Datos y rutas sin cambios; no se requiere migración de `localStorage`.
