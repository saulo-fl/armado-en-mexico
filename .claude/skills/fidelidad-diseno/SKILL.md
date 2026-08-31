---
name: fidelidad-diseno
description: Guía de fidelidad estética para "Armado en México" — memoria viva de las decisiones de diseño ya tomadas y de las trampas conocidas. Úsalo SIEMPRE que agregues o modifiques UI (pantallas .jsx, tarjetas, filtros, ui.jsx): decisiones de producto, estructura de la ficha, vocabulario prohibido, reglas de "no romper" y la bitácora de aprendizajes. El sistema visual y la dirección de arte viven en DESIGN.md; esta skill guarda lo aprendido a golpes.
---

# Fidelidad de diseño — Armado en México

> **La dirección de arte y el sistema visual están en [`DESIGN.md`](../../../DESIGN.md)**
> (superficies, escalas, tipografía, prohibiciones). Esta skill es la otra mitad: lo que ya
> se decidió, lo que no se toca, y las trampas que costaron una sesión descubrir.
> Si las dos se contradicen, gana `DESIGN.md`.
>
> `HANDOFF-DISENO.md` está obsoleto — es solo un puntero. No lo uses como fuente.

## Estado del rediseño (ago-2026)

El sitio arrastra un problema medido: el borde `#3A3A3A` sobre tarjeta `#2C2C2C` da **1.23:1**
y la tarjeta sobre el fondo da **1.25:1**. Las dos señales que definen una tarjeta son
invisibles, y por eso el sitio se lee «cuadrado»: el ojo solo puede ver la geometría.

**Superficies antes que efectos.** Añadir biseles o retículas sobre una base plana da un
sitio ruidoso *y* plano. Comprobar siempre con:

```
node .claude/skills/fidelidad-diseno/scripts/contraste.mjs
```

Para rediseñar, delega en el agente `disenador-oficial`. Para mover una primitiva de inline
a CSS, la skill `migrar-a-css`.

## ADN visual (tokens en `ui.jsx` → `PALETTE`, expuesto en `window.PALETTE`)
- Tema oscuro: `bg #1A1A1A`, superficies `#2C2C2C`, bordes `#3A3A3A`/`#555`.
- Acento **ámbar `#F5C518`**. Texto `#FFF` / `#B5B5B5` / `#9A9A9A`.
- Autoridades: DCAM ámbar `#F5C518`, OTCA verde `#4FAE5C`, ejército rojo `#C0392B`.
- Tipos vigentes hoy (Google Fonts en `index.html`): Montserrat, Courier Prime, Open Sans,
  Playfair Display. **`DESIGN.md` §5.3 los sustituye** por Archivo + JetBrains Mono +
  Share Tech Mono; al tocar tipografía, sustituye, nunca sumes — ya son 4 familias y 13 archivos.
- Primitivas reutilizables (`ui.jsx`): `TacticalCorners`, `FilterChip`, `FilterSelect`,
  `PriceRange`, `AvailBadge`, `PriceLevel`, `SectionHeader`, `ArmaCard`, `BottomNav`,
  `HCarousel`, `CountryFlag`. Reúsalas; no reinventes estilos por pantalla.
- **Trabaja por primitivas, no por pantallas.** Las ~15 de `ui.jsx` propagan a las 322
  páginas; las pantallas solo las componen.

## Dónde vive cada estilo
- La **piel** (hover, foco, pseudo-elementos, media queries, animación, superficies) va al
  `<style>` de `index.html` con clases `amx-`. El **layout** y lo que depende de datos se
  queda inline. Una propiedad vive en un sitio **o** en el otro, nunca en los dos: si se
  comparte, el inline gana por especificidad y empieza la guerra de `!important`.
- Lo dinámico viaja como custom property: `style={{'--estado': color}}`. Precedente en el
  repo: `BottomNav` publica `--amx-nav-h`.
- Hay **1238 objetos `style={{`** en los `.jsx`. Migrarlos todos está descartado; se migra
  la piel de las primitivas, con `migrar-a-css`.
- Centraliza tokens/utilidades nuevas en `ui.jsx` / `index.html`, no dispersos.

## Reglas de "NO romper" (críticas)
- **Sí hay build step** (`npm run build` → Babel CLI + prerender, corre en Cloudflare Pages;
  los `.js` no se versionan). Cada `.jsx` DEBE compilar: `npm run build:js` o skill
  `verificar-app`. *(Lo de «transpilación en el navegador con Babel standalone» que decía
  el viejo handoff dejó de ser cierto; no hay limitación técnica para escribir buen CSS.)*
- No cambies el orden de carga de scripts en `index.html` ni los `integrity` de unpkg.
- Si tocas `data-*.js`, sube el cache-busting `?v=` (ver skill `publicar`).
- Mobile-first (hay `BottomNav` y `useViewport`); áreas táctiles ≥40px; contraste ok.
- Mantén el rendimiento (las tarjetas usan `contentVisibility`).
- **VOCABULARIO PROHIBIDO: «dossier» y «curaduría»** (y sus variantes) en cualquier
  parte del proyecto — app pública, panel admin, documentación y comentarios. Son
  jerga de IA, no lenguaje natural: nadie llama «dossier» a la historia de un arma.
  Di «historia», «selección», «contenido editado», «catálogo». Misma familia de
  problema que el copy de relleno («Descubre el fascinante mundo de…»): suena a
  máquina. Comprobación: `grep -riE 'dossier|curadur' --include='*.jsx' --include='*.md'`
  debe dar 0.

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
- **Ficha móvil:** barra fija de acción (precio + comparar) apoyada en
  `bottom: calc(var(--amx-nav-h, 74px) - 1px)`; se oculta si hay comparación activa.
  **`--amx-nav-h` la publica `BottomNav` midiéndose con `ResizeObserver`** (y ya
  incluye el safe-area en su propio padding — no lo sumes otra vez). Antes eran dos
  literales `76px` a mano contra un nav que mide ~74: quedaba una rendija de 2px por
  la que se veía pasar el contenido y parecía la app rota. El `-1px` superpone los
  dos bordes en una sola línea. `CompareFloat` usa la misma variable con `+8px`,
  porque eso flota y no se solda.
- `index.html`: foco visible 2px + offset y `prefers-reduced-motion` ya globales.

## Decisiones de producto ya tomadas (respétalas)
- El arsenal abre en un HUB por categorías (`ArsenalHubScreen`), no lista plana.
- Encabezados del hub sin "Por": Armería, Disponibilidad, Tipo de arma, Uso, Calibre.
- Filtros del listado = menús desplegables (`FilterSelect`) + barra de precio min/máx
  dinámica con tope $100k ("$100k+"), NO chips flotantes.
- Las tarjetas de arma ya NO llevan etiqueta de tipo sobre la imagen (redundante).
- El "precio actual" de la ficha se toma del último registro del historial.

## Ficha de arma — estructura vigente (rediseño ago-2026, PR #45)
Orden fijo: **identidad → foto HERO → datos clave → valoración → precio → historial
→ munición → accesorios → desplegables → vídeo → opinión → armas similares →
sugerir cambios**. No lo reordenes sin motivo: el `AvailBadge` y `legalTit` van
arriba a propósito, para responder "¿puedo comprarla?" antes del pliegue, y
«Sugerir cambios» cierra la página (es la última acción, no una interrupción).
**Ya no hay tabs**: ficha técnica, usos, legalidad e **Historia** son cuatro
`<details>` (`window.Disclosure`) **sin encabezado de sección** — cada uno se
anuncia solo.
- Separación entre secciones = **espacio** (52px escritorio / 34px móvil) + banda de
  fondo, nunca una línea gris. El helper `ProdSection` de `screens-2.jsx`.
- Primitivas nuevas en `ui.jsx`: **`Disclosure`** (desplegable; con `compact` se pinta
  como pie de nota — sin fondo ni barrita de acento, título en mono 12.5),
  **`PriceChart`** (gráfica de precios), **`amxPrecioNum`** / **`amxFechaCorta`** /
  **`amxRatingLabel`** (helpers), y `CUT_TR_SM` ya está expuesto en `window`.
- **`PriceChart` colorea POR TRAMO**: verde si el precio bajó entre esos dos
  inventarios, rojo si subió, gris si no cambió. El relleno bajo la línea es
  **neutro** (blanco 8%) a propósito: si también fuera de color competiría con los
  tramos. Las etiquetas de precio viven en una **banda superior reservada**
  (`PT = 32`) y las fechas en la inferior, fuera del área del trazo — por eso ningún
  número puede quedar tapado por una línea. Llevan además halo (`paintOrder: stroke`).
- **Opiniones, no estrellas** (ago-2026, sustituyen al `StarRating`, que ya no
  existe). Modelo Steam: `¿Recomiendas esta arma?` pulgar sí/no **+ reseña escrita
  de 100 caracteres mínimo**, que es lo que da derecho a contar en el agregado.
  `window.amxOpinionLabel(up, down)` devuelve `{label, color, hay, pct, total}` con
  los cortes **reales** de Steam sobre el % de recomendaciones (95/70/40/20).
  `OPINION_EXTREMO = 20` es el único umbral de volumen: la etiqueta sale desde la
  primera opinión, pero "Extremadamente…" exige 20, para que una sola persona no
  fije la reputación de un arma. La usan `OpinionBlock` (ficha) y `ArmaCardBody`
  (todas las tarjetas: `ArmaCard`, `FavCard` y `VisitedCard` comparten ese cuerpo).
- **La etiqueta va ARRIBA, junto al precio** (`Opiniones: Mayormente positivas`, en
  Courier 12.5), no en el bloque del final. La pregunta "¿vale la pena?" se responde
  al lado del precio. Abajo solo queda el formulario para opinar.
- **Nada se publica sin moderar.** Dos dominios a propósito: `reviewsQueue`
  (privado, con el correo) y `reviews` (público, sin correo). Un único dominio con
  un flag `approved` filtrado en cliente publicaría el texto sin moderar en una URL
  abierta — ver el comentario de `functions/api/state.js`. El mínimo de 100
  caracteres se valida **también en el servidor** (`mergeAppend`), porque
  `/api/append/*` es público; hay test en `functions/api/_lib.test.mjs`.
- **Los pulgares son SVG de trazo** (`window.ThumbIcon`), como los iconos del
  `BottomNav`. Nunca emoji: renderizan distinto por plataforma y son un tell de UI
  generada.
- Las barras de la valoración usan **`StatsBar`**, que ya pinta el número. No
  reimplementes una barra plana: había una duplicada y se eliminó. Una barra sin
  cifra no informa.
- El precio de munición se etiqueta con **`window.munUnidadPrecio(mun)`**
  (`screens-municiones.jsx`), no con un literal: la 2046 cotiza POR CAJA y el resto
  por cartucho. Lo usan la tarjeta y la ficha.

## Bitácora de aprendizajes (AÑADE lo que descubras)
- 2026-08: **una pantalla nueva son 8 puntos de alta, no 1.** `SCREEN_TO_PATH`,
  `titles`, `isInternal`, `currentNavId`, **la rama de `navTab`**, la rama del
  switch de `app.jsx`, el item de menú (`moreItems` de `TopNav` + `MenuScreen`), la
  entrada en `FIJAS` de `build-prerender.mjs` **y una línea en `.gitignore`** para su
  `.html` generado (la lista es explícita, fichero a fichero: sin eso se commitea un
  artefacto de build). La trampa que más cuesta ver es `navTab`: es una cadena
  `if/else if` **sin default**, así que sin su rama el enlace funciona en móvil (que
  usa `navigate`) y es un botón muerto en escritorio.
- 2026-08: **`ProductScreen` no escuchaba `Store.onChange`.** Cualquier dato que
  llegue en la hidratación de `/api/state` (las opiniones, por ejemplo) se pintaba
  vacío hasta que el usuario navegaba y volvía. Solo `HomeScreen` estaba suscrita. Si
  añades a una ficha algo que venga del backend, suscríbela.
- 2026-08: **editar `data.js` NO basta para ver el cambio.** `Store.init()` siembra el
  catálogo entero en `localStorage['amx_armas_v2']` en la primera visita y a partir de
  ahí **el localStorage gana sobre `data.js`**. Para verificar un cambio de datos hay
  que limpiar localStorage; para propagarlo a visitantes que ya entraron, sembrar D1
  desde *Admin → Configuración → Sincronizar todo al servidor*. El prerender y los
  visitantes nuevos sí lo ven al instante. Y aparte, sin subir el `?v=` de los
  `data-*.js` en `index.html`/`admin.html` el navegador sirve la copia cacheada.
- 2026-08: **`NUM` no es global.** En `screens-2.jsx`, `const NUM = { fontVariantNumeric }`
  vive DENTRO de `ProductScreen`: los componentes hermanos (`RatingBlock`, `YouTubeBlock`)
  no lo ven. Babel transpila igual y el `ReferenceError` solo sale en runtime. `PALETTE`,
  `SectionHeader` y `TacticalCorners` sí son globales (declaraciones de nivel superior de
  scripts clásicos, compartidas entre archivos).
- 2026-08: **las cuatro tarjetas de arma comparten cuerpo.** `ArmaCard`, `FavCard`,
  `VisitedCard` y `RatedCard` delegan en `window.ArmaCardBody`: un cambio ahí las toca
  todas. (De paso: `FavCard` declaraba un `getRating` que no usaba — código muerto.)
- 2026-08: **un helper de layout definido DENTRO de un componente remonta su subárbol
  en cada render** — React lo ve como un tipo de componente nuevo. Con `<details>`
  dentro, eso los cierra solos al redimensionar (`useViewport` re-renderiza). Por eso
  `ProdSection` vive fuera de `ProductScreen`. Si añades secciones, mismo sitio.
- 2026-08: **una tarjeta `bgCard` sobre una banda `bgElev` desaparece**: son el mismo
  `#2C2C2C`. En una sección con banda, el panel interior va en `PALETTE.bg` (hundido),
  no en `bgCard`.
- 2026-08: los pseudo-elementos del `<summary>` (`list-style`, `::-webkit-details-marker`)
  **no se pueden tocar desde los estilos inline de React** → van en el `<style>` de
  `index.html`. Lo mismo `.amx-cut:has(:focus-visible)`, que devuelve el anillo de foco
  a los botones con `clip-path` (el clip se lo tragaba).
- 2026-08: `AMX_PRICE_HISTORY_SEED` tiene tres trampas para cualquier gráfica:
  `price` es **string formateado**; DCAM y OTCA publican **el mismo día** (colisionan en
  la misma X, hay que deduplicar por fecha); y hay armas con **dos precios idénticos**
  (`(max - min) || 1` o divides entre cero). Además 51 de 179 armas tienen **un solo
  registro**: la sección de historial se oculta entera, no se pinta vacía.
- 2026-08: **los desplegables no cuestan SEO aquí.** `build-prerender.mjs` emite su
  propio `<article>` y React monta con `createRoot` (reemplaza, no hidrata): los
  crawlers nunca ven los `<details>`. La condición es la inversa — texto NUEVO hay que
  añadirlo también a la plantilla del prerender (`build-prerender.mjs`, ~línea 184) o
  no se indexa.
- 2026-08: para revisar UI en el navegador basta `npx serve . -l 4173` + Chrome
  DevTools; el tutorial de bienvenida tapa la pantalla — la clave real es
  **`localStorage['amx_onboarded_v1'] = '1'`** (no `amx_tutorial_visto`), y hay que
  recargar.
- 2026-08: al comprobar desbordes horizontales, **excluye los elementos dentro de un
  ancestro con `overflow-x: auto`** (los carruseles) o todo da falso positivo.
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
