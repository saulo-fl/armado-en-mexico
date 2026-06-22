# Handoff a Claude (Diseño) — "Armado en México"

> **Objetivo del encargo:** retoque **estético** de la app para que se vea **táctica y tecnológica**, pero **menos "cuadrada"/rígida** (hoy todo son rectángulos con bordes de 1px). NO cambiar la lógica ni los datos: es un pase de *art direction* sobre una app que ya funciona.

---

## 1) Qué es la app y cómo está construida (LÉEME antes de tocar)

- App **estática**, sin build step. El JSX se **transpila en el navegador** con Babel standalone (scripts de unpkg con `integrity` fijado — **no cambies versiones ni el orden de carga**).
- Estilos = **objetos `style` inline en JS** + un bloque `<style>` en `index.html`. La paleta y las primitivas viven en `ui.jsx`.
- Globals en `window.*` (cada archivo expone componentes). Orden de carga en `index.html` importa: `data*.js` → `store.js` → `ui.jsx` → `screens-*.jsx` → `app.jsx`.
- Los `<script src="data-*.js?v=20260616b">` llevan **cache-busting** con `?v=…`: si tocas datos, sube ese sufijo (no aplica a estética).
- **No rompas**: carga de datos, `window.*`, la lógica de precios/existencias por sucursal, ni el render síncrono. Mantén el rendimiento (las tarjetas usan `contentVisibility`).
- Mobile-first (hay `BottomNav` y un hook `useViewport`).

## 2) Estética actual (design tokens)

- Tema oscuro. `PALETTE` (en `ui.jsx`):
  - `bg #1A1A1A`, `bgElev/bgCard #2C2C2C`, `border #3A3A3A`, `borderHi #555`,
  - acento **ámbar `#F5C518`**, `text #FFF`, `textDim #B5B5B5`, `textMuted #7A7A7A`.
  - Autoridades: DCAM ámbar `#F5C518`, OTCA verde `#4FAE5C`, "ejército" rojo `#C0392B`, civil verde `#4FAE5C`.
- Tipografías (Google Fonts en `index.html`): **Montserrat** (titulares, MAYÚSCULAS, mucho `letter-spacing`), **Courier Prime** (mono, etiquetas/datos), Open Sans (cuerpo), Playfair (tema editorial alterno).
- Lenguaje visual "táctico": componente **`TacticalCorners`** (corchetes en L en las esquinas), bordes rectos de 1px, badges cuadrados, glifos tipo `◆ ◢ ◉ ▦ ⌕`.

## 3) El problema a resolver (dirección creativa)

Hoy se ve **demasiado cuadrado/uniforme**: todo son cajas rectangulares iguales con borde fino. Quiero conservar el ADN **táctico + tecnológico (HUD/mira/terminal)** pero hacerlo **más dinámico y menos rígido**. Ideas (a tu criterio, propón y muestra):
- **Cortes/biseles** en esquinas selectas (clip-path en polígono) en vez de solo rectángulos; cintas/etiquetas inclinadas.
- Acentos tipo **HUD/mira**: líneas de escaneo sutiles, retículas, marcas de esquina asimétricas, "ticks" de regla.
- **Profundidad**: gradientes sutiles, glow ámbar en focos/hover, sombras tenues, separadores con degradado en vez de línea plana.
- **Jerarquía y ritmo**: variar tamaños/formas de tarjetas (no toda la cuadrícula idéntica), destacar la pieza principal.
- **Micro-animaciones** discretas (hover, entrada de tarjetas, estado activo de chips/tabs) sin sacrificar performance ni accesibilidad.
- Mantener **legibilidad** y la densidad de datos del catálogo. Nada de recargar; que se sienta premium, no ruidoso.

## 4) Superficies / componentes a pulir

- **Header / BottomNav** (`ui.jsx`: `AppHeader`, `BottomNav`).
- **Home** (`screens-1.jsx` `HomeScreen`): slider promo, **nueva barra de búsqueda** (bajo el slider), carruseles ("Favoritos", "Más visitadas"), grids de categorías, sección de disponibilidad legal, y el **banner de armas traumáticas (ahora al final del feed)**.
- **Arsenal HUB** (`screens-1.jsx` `ArsenalHubScreen`): pantalla nueva de entrada al arsenal, con tarjetas por **tipo / uso / calibre / sucursal / disponibles**. Buen candidato para el rediseño "menos cuadrado".
- **Catálogo/listado** (`screens-1.jsx` `CatalogScreen`): buscador, **chips de filtro** (incluye nuevos **DCAM/OTCA** y **● Disponibles**), tarjetas de arma.
- **Tarjetas** (`ui.jsx` `ArmaCard`; `screens-accesorios.jsx` `AccesorioCard`; `screens-municiones.jsx` `MunicionCard`) — horizontales, imagen + datos + `AvailBadge` + `PriceLevel`.
- **Ficha de detalle** (`screens-2.jsx`): bloque "PRECIO ACTUAL" + **existencias por sucursal (DCAM/OTCA) con estado AGOTADO** + historial de precios + specs. Bastante "cajón"; ideal para HUD.
- **Primitivas** (`ui.jsx`): `TacticalCorners`, `FilterChip`, `AvailBadge`, `PriceLevel`, `SectionHeader`, `StatsBar`, `HCarousel`. Rediseñarlas propaga el estilo a toda la app.

## 5) Cambios funcionales recientes (contexto — NO rehacer, solo estilizar lo nuevo)

Esta sesión dejó la app así (ya en `main` y `develop`):
1. **Conciliación inventario DCAM 16-jun-2026**: catálogo **168 armas** (40 fichas nuevas, ids 129-168, con imagen placeholder "sin imagen disponible"); **accesorios 32** (8 nuevos); **municiones 44** (29 cartuchos DCAM nuevos).
2. **Regla "último inventario por sucursal"**: cada ficha (armas/accesorios/municiones) muestra existencias **DCAM y OTCA por separado**, tomando solo el último inventario de cada una; si no aparece → **"AGOTADO en \<sucursal\>"**. Helper `window.getArmaSucursales(id)`.
3. **"PRECIO ACTUAL"** ahora se toma del **último registro del historial** (no del campo estático), para consistencia. Cache-busting `?v=` en los `data-*.js`.
4. **Inicio**: barra de **búsqueda rápida** (lleva al arsenal con la consulta); banner de **armas traumáticas movido al final** del feed.
5. **Arsenal**: ya **no** abre en lista plana → abre en **hub seccionado** (`ArsenalHubScreen`); nuevos filtros **DCAM/OTCA** y **Disponibles** en el listado.
6. **Backend D1 desactivado temporalmente** (binding comentado en `wrangler.toml`) — se reactivará después; no afecta estética.

## 6) Reglas de oro para el rediseño

- Cambios **solo visuales**: paleta/tokens, formas, espaciado, tipografía, micro-interacción. No toques data-*.js, store.js, ni la lógica de filtros/precios.
- Centraliza: idealmente mete los nuevos tokens/utilidades en `ui.jsx` (`PALETTE`, primitivas) y el `<style>` de `index.html`, para no repetir en cada pantalla.
- Respeta el orden de scripts y los `integrity` de unpkg.
- Verifica que cada `.jsx` **transpile** (Babel standalone) y que la app cargue sin errores tras los cambios.
- Conserva accesibilidad (contraste, foco, tamaños táctiles ≥40px) y rendimiento.
- Entrega: muestra antes/después de 2-3 superficies clave (Home, Arsenal HUB, Ficha) y aplica de forma consistente.

---

### Prompt corto (para pegar)

> Eres un diseñador de producto. Toma la app estática "Armado en México" (catálogo táctico de armas DCAM/OTCA; JSX transpilado en navegador, estilos inline + `ui.jsx`/`index.html`). Hazla ver **táctica y tecnológica (HUD/mira/terminal) pero menos cuadrada y rígida**: introduce cortes/biseles, acentos tipo retícula, profundidad (gradientes/glow ámbar `#F5C518` sobre fondo `#1A1A1A`), jerarquía variada de tarjetas y micro-animaciones discretas, **sin** tocar la lógica ni los datos y respetando el orden de carga de scripts y los `integrity` de unpkg. Centraliza tokens/primitivas en `ui.jsx` y el `<style>` de `index.html`. Empieza por `ui.jsx` (PALETTE, `TacticalCorners`, `FilterChip`, `AvailBadge`, `PriceLevel`, `SectionHeader`, `ArmaCard`, `BottomNav`), luego Home (`screens-1.jsx`), el nuevo **Arsenal HUB** (`ArsenalHubScreen` en `screens-1.jsx`) y la **ficha** (`screens-2.jsx`). Lee primero `HANDOFF-DISENO.md` y `CLAUDE.md`. Verifica que todo transpile y cargue.
