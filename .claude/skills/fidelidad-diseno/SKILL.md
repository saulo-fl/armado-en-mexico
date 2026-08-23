---
name: fidelidad-diseno
description: Guía de fidelidad estética para "Armado en México" — mantén el look táctico/tecnológico (HUD/mira/terminal militar) y evita romperlo. Úsalo SIEMPRE que agregues o modifiques UI (pantallas .jsx, tarjetas, filtros, ui.jsx): paleta, tipografías, primitivas, patrones de tarjeta, y las reglas de "no romper" (transpilar, orden de carga, integrity de unpkg). Complementa HANDOFF-DISENO.md.
---

# Fidelidad de diseño — Armado en México

## ADN visual (tokens en `ui.jsx` → `PALETTE`, expuesto en `window.PALETTE`)
- Tema oscuro: `bg #1A1A1A`, superficies `#2C2C2C`, bordes `#3A3A3A`/`#555`.
- Acento **ámbar `#F5C518`**. Texto `#FFF` / `#B5B5B5` / `#7A7A7A`.
- Autoridades: DCAM ámbar `#F5C518`, OTCA verde `#4FAE5C`, ejército rojo `#C0392B`.
- Tipos (Google Fonts en `index.html`): **Montserrat** (títulos MAYÚSCULAS + letter-spacing),
  **Courier Prime** (mono, datos/etiquetas), Open Sans (cuerpo).
- Primitivas reutilizables (`ui.jsx`): `TacticalCorners`, `FilterChip`, `FilterSelect`,
  `PriceRange`, `AvailBadge`, `PriceLevel`, `SectionHeader`, `ArmaCard`, `BottomNav`,
  `HCarousel`, `CountryFlag`. Reúsalas; no reinventes estilos por pantalla.

## Cómo mantener el estilo (y no que se sienta "cuadrado")
- Prefiere cortes/biseles, retículas/ticks HUD, glow ámbar en hover/foco, gradientes
  sutiles y jerarquía variada de tarjetas antes que más rectángulos de 1px.
- Los estilos son objetos `style` inline en JS + un `<style>` en `index.html` (ahí van
  los pseudo-elementos, p. ej. las manijas del slider `.amx-price-range`).
- Centraliza tokens/utilidades nuevas en `ui.jsx` / `index.html`, no dispersos.

## Reglas de "NO romper" (críticas)
- Sin build step: cada `.jsx` DEBE transpilar (usa skill `verificar-app`).
- No cambies el orden de carga de scripts en `index.html` ni los `integrity` de unpkg.
- Si tocas `data-*.js`, sube el cache-busting `?v=` (ver skill `publicar`).
- Mobile-first (hay `BottomNav` y `useViewport`); áreas táctiles ≥40px; contraste ok.
- Mantén el rendimiento (las tarjetas usan `contentVisibility`).

## Rediseño móvil 2026 (canvas aprobado — tokens vigentes)
Canvas de referencia: https://claude.ai/code/artifact/5bfe4baa-8106-44a4-b122-1f49a622905e
- **Contraste AA sobre #1A1A1A:** `textMuted = #9A9A9A` (nunca volver a #7A7A7A);
  rojo para TEXTO/BORDE = `PALETTE.redHi #E4574B`; `PALETTE.red #C0392B` queda SOLO
  como relleno con texto blanco.
- **Piso tipográfico 12px** en todo texto informativo (badges, etiquetas, nav).
- **Áreas táctiles:** botones ≥44-48px, chips ≥44px, filas de nav ≥48px.
- **Lenguaje "menos cuadrado":** corte biselado `window.CUT_TR` (clip-path esquina
  sup-der) en CTAs/badges/chips; `TacticalCorners` ahora pinta 2 esquinas (tl+br)
  por defecto (`all` para las 4); tarjetas con `PALETTE.bgCardGrad`; separadores
  `linear-gradient(90deg, border, transparent)` (SectionHeader/Hdr ya lo hacen).
- **OJO clip-path + foco:** el clip se traga el `outline` — el anillo de foco va en
  un wrapper sin recorte si el elemento lleva corte.
- **Nav inferior:** iconos SVG de trazo 1.75 (componente `NavIcon` en BottomNav);
  no volver a glifos de fuente (◈▤⇄§☰ renderizan distinto por plataforma).
- **Tarjetas de arma:** muestran existencias por sucursal (`● 36 DCAM · 18 OTCA` /
  `✕ AGOTADO`) y precio exacto compacto bajo la escala $$$$$ (solo lectura de
  getArmaExistencias/getArmaExistenciasOTCA — sin tocar store).
- **Ficha móvil:** barra fija de acción (precio + comparar) a `bottom: calc(76px +
  safe-area)` — mismo hueco que CompareFloat; se oculta si hay comparación activa.
- `index.html`: foco visible 2px + offset y `prefers-reduced-motion` ya globales.

## Decisiones de producto ya tomadas (respétalas)
- El arsenal abre en un HUB por categorías (`ArsenalHubScreen`), no lista plana.
- Encabezados del hub sin "Por": Armería, Disponibilidad, Tipo de arma, Uso, Calibre.
- Filtros del listado = menús desplegables (`FilterSelect`) + barra de precio min/máx
  dinámica con tope $100k ("$100k+"), NO chips flotantes.
- Las tarjetas de arma ya NO llevan etiqueta de tipo sobre la imagen (redundante).
- El "precio actual" de la ficha se toma del último registro del historial.

## Bitácora de aprendizajes (AÑADE lo que descubras)
- 2026-06: `@babel/standalone` está vendorizado en `node_modules` → úsalo para validar.
- 2026-08: `node_modules` NO está en git — al reciclarse el contenedor se pierde.
  Reinstalar: `npm install --no-save @babel/standalone@7.29.0`. GOTCHA: sin
  package.json, cada `npm install --no-save X` BORRA los paquetes anteriores —
  instala todo lo que necesites en UN solo comando.
- 2026-08: smoke test visual sin red del navegador: `python3 -m http.server` +
  playwright-core con `executablePath:'/opt/pw-browsers/chromium'` y `page.route`
  ruteando unpkg a copias locales (npm react@18.3.1 trae `umd/`). El tutorial de
  bienvenida cubre la home la primera vez — clic en SALTAR antes de capturar.
- 2026-06: fotos de armería son placeholders SVG (`imagenes/armeria-*.svg`) por falta
  de red; cuando lleguen fotos reales, apuntar a `.jpg`.
