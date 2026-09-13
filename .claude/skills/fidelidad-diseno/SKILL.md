---
name: fidelidad-diseno
description: Guía de fidelidad estética para "Armado en México" — memoria viva de las decisiones de diseño ya tomadas y de las trampas conocidas. Úsalo SIEMPRE que agregues o modifiques UI (pantallas .jsx, tarjetas, filtros, ui.jsx): decisiones de producto, estructura de la ficha, vocabulario prohibido, reglas de "no romper" y la bitácora de aprendizajes. El sistema visual y la dirección de arte viven en docs/DESIGN.md; esta skill guarda lo aprendido a golpes.
---

# Fidelidad de diseño — Armado en México

> **La dirección de arte y el sistema visual están en [`docs/DESIGN.md`](../../../docs/DESIGN.md)**
> (superficies, escalas, tipografía, prohibiciones). Esta skill es la otra mitad: lo que ya
> se decidió, lo que no se toca, y las trampas que costaron una sesión descubrir.
> Si las dos se contradicen, gana `docs/DESIGN.md`.

## Estado del rediseño — RESUELTO (31-ago-2026)

El tema claro «Documento Oficial Mexicano» está en producción. El problema que motivó el
rediseño —borde y tarjeta a 1.23:1 y 1.25:1, invisibles, que hacían que el sitio se leyera
«cuadrado»— quedó cerrado al invertir el tema.

**Superficies antes que efectos**, que sigue siendo la regla: añadir biseles o retículas
sobre una base plana da un sitio ruidoso *y* plano. Comprobar siempre con:

```
node .claude/skills/fidelidad-diseno/scripts/contraste.mjs
```

Para rediseñar, delega en el agente `disenador-oficial`. Para mover una primitiva de inline
a CSS, la skill `migrar-a-css`.

## ADN visual (tokens en `ui.jsx` → `PALETTE`, expuesto en `window.PALETTE`)

> **La app es CLARA.** El lienzo es crema y el verde es el color de MARCA: header,
> navegación y acentos. Tenerlo al revés —toda la app en verde— fue el error del primer
> intento de rediseño, y ninguna corrección de detalle lo acercaba al mockup.

- `bg #F3EFE4` lienzo crema · `bgCard`/`bgElev #FAF9F5` tarjeta blanca · `border #D5D6CE`.
- **El acento ES el verde de marca**: `amber #173A32` (10.83:1 sobre el lienzo). El nombre
  del token es herencia del tema anterior; el valor no.
- Texto `#171B19` / `textDim #3E443D` / `textMuted #59605C`.
- Rojo: `red #C83B32` **solo como relleno** con texto claro encima; `redHi #A3341F` es el
  rojo **como texto** (5.96:1). Nunca los intercambies.
- Superficies de marca: `marca #173A32`, `marcaAlt #1E4A40`, y encima `sobreMarca #F3EFE4`,
  `sobreMarcaDim #B8C2BA`, `sobreMarcaMuted #9FACA2`.
- Sobre superficie clara usa `window.CLARO` (`ok #2F6B33`, `alerta #A3341F`): los estados de
  `PALETTE` están calibrados contra el verde y sobre crema caen a 1.7-2.3:1.
- Tipografía: **Archivo + JetBrains Mono**, y solo esas dos. Al tocar tipografía sustituye,
  nunca sumes.
- **NADIE reescribe `PALETTE` en runtime.** Hubo un `useEffect` en `app.jsx` que la mutaba
  con el acento de un selector de «facción»: el color salía bien en el primer paint y mal a
  partir del segundo render, y ninguna auditoría estática lo veía. Si vuelve a aparecer una
  asignación a `PALETTE.*` fuera de `ui.jsx`, es un bug.
- Primitivas reutilizables (`ui.jsx`): `FilterChip`, `FilterSelect`, `PriceRange`,
  `AvailBadge`, `PriceLevel`, `SectionHeader`, `ArmaCard`, `BottomNav`, `HCarousel`,
  `CountryFlag`, `LogoMarca`. Reúsalas; no reinventes estilos por pantalla.
  (`TacticalCorners` y `CUT_TR` siguen existiendo pero **ya no pintan**: eran el esqueleto
  HUD del tema anterior y era lo que ataba el sitio al diseño viejo por mucho que cambiara
  el color.)
- **Trabaja por primitivas, no por pantallas.** Las ~15 de `ui.jsx` propagan a las 321
  páginas; las pantallas solo las componen.

## Dónde vive cada estilo
- La **piel** (hover, foco, pseudo-elementos, media queries, animación, superficies) va a
  `src/styles/estilo.css` con clases `amx-` (el `<style>` de `index.html` guarda solo la
  base global que ya vive ahí). El **layout** y lo que depende de datos se
  queda inline. Una propiedad vive en un sitio **o** en el otro, nunca en los dos: si se
  comparte, el inline gana por especificidad y empieza la guerra de `!important`.
- Lo dinámico viaja como custom property: `style={{'--estado': color}}`. Precedente en el
  repo: `BottomNav` publica `--amx-nav-h`.
- Hay **1238 objetos `style={{`** en los `.jsx`. Migrarlos todos está descartado; se migra
  la piel de las primitivas, con `migrar-a-css`.
- Centraliza tokens/utilidades nuevas en `ui.jsx` / `src/styles/estilo.css`, no dispersos.

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

## Rediseño móvil 2026 — parcialmente DEROGADO por el tema claro

> Lo de esta sección se decidió sobre el tema OSCURO. Los valores de color y el lenguaje
> «menos cuadrado» ya no aplican; lo que sigue vigente está marcado. Se conserva porque
> varias decisiones de layout siguen en pie y porque explica por qué el código tiene lo que
> tiene.

- ~~Contraste AA sobre `#1A1A1A`, `textMuted #9A9A9A`, `redHi #E4574B`~~ — **derogado**:
  la paleta viva está en «ADN visual», arriba.
- **VIGENTE · Piso tipográfico 12px** en todo texto informativo (badges, etiquetas, nav).
- **VIGENTE · Áreas táctiles:** botones ≥44-48px, chips ≥44px, filas de nav ≥48px.
- ~~Lenguaje «menos cuadrado»: `CUT_TR`, `TacticalCorners`, `bgCardGrad`~~ — **derogado**:
  ese esqueleto HUD era lo que ataba el sitio al diseño viejo. `CUT_TR` vale `'none'`,
  `TacticalCorners` no pinta y `bgCardGrad` no lo usa nadie. Hoy: radios, sombras suaves
  y superficies.
- **VIGENTE · OJO clip-path + foco:** el clip se traga el `outline` — el anillo de foco va
  en un wrapper sin recorte si el elemento lleva corte.
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
Orden fijo: **identidad → foto HERO → datos clave → precio → historial
→ munición → accesorios → desplegables → vídeo → opinión → armas similares →
sugerir cambios**. No lo reordenes sin motivo: el `AvailBadge` y `legalTit` van
arriba a propósito, para responder "¿puedo comprarla?" antes del pliegue, y
«Sugerir cambios» cierra la página (es la última acción, no una interrupción).
**Usos, Legalidad e Historia van en pestañas**: `FichaTabs` con un `<Panel label>`
por pestaña (`screens-2.jsx`, docs/DESIGN.md §11), con flechas de teclado entre
ellas. Los desplegables (`window.Disclosure`) quedan para el detalle secundario
(la fuente del precio, «Leer opiniones»).
- Separación entre secciones = **espacio** (52px escritorio / 34px móvil) + banda de
  fondo, nunca una línea gris. El helper `ProdSection` de `screens-2.jsx`.
- Primitivas nuevas en `ui.jsx`: **`Disclosure`** (desplegable; con `compact` se pinta
  como pie de nota — sin fondo ni barrita de acento, título en mono 12.5),
  **`PriceChart`** (gráfica de precios), **`amxPrecioNum`** / **`amxFechaCorta`** /
  **`amxOpinionLabel`** (helpers), y `CUT_TR_SM` ya está expuesto en `window`.
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
  fije la reputación de un arma. Solo la usa la ficha: junto al precio y en
  `OpinionBlock` (`screens-2.jsx`). Las tarjetas ya no la pintan.
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
- **La valoración divulgativa está retirada de toda la app** (la ficha el 7-sep-2026;
  el comparador, el admin y el CSV el 10-sep-2026): las barras de 0 a 100 se derivaban
  por tipo y calibre, no de mediciones. `StatsBar` se borró. `arma.stats` sigue en
  `data.js` y en D1, pero no se muestra ni se edita: no la reintroduzcas sin fuente.
- El precio de munición se etiqueta con **`window.munUnidadPrecio(mun)`**
  (`screens-municiones.jsx`), no con un literal: la 2046 cotiza POR CAJA y el resto
  por cartucho. Lo usan la tarjeta y la ficha.

## Bitácora de aprendizajes (AÑADE lo que descubras)
- 2026-09: **Safari no resuelve `max-height: %` dentro de una caja cuya altura sale de
  `aspect-ratio`.** Chrome sí, así que en escritorio se ve bien y en el iPhone la foto
  sale recortada (la cuadrada de las traumáticas en el pozo 16:9). No es la resolución
  del teléfono. Solución: la imagen `position:absolute; inset:0; margin:auto` con
  `width/height` en % + `object-fit: contain` (así está `.amx-polaroid-pozo img`).
  Verificable en Windows con Playwright WebKit + `devices['iPhone 14 Pro Max']`.
- 2026-08: **una pantalla nueva son 8 puntos de alta, no 1.** `SCREEN_TO_PATH`,
  `titles`, `isInternal`, `currentNavId`, **la rama de `navTab`**, la rama del
  switch de `app.jsx`, el item de menú (`moreItems` de `TopNav` + `MenuScreen`), la
  entrada en `FIJAS` de `build-prerender.mjs`. (La línea en `.gitignore` que también
  hacía falta ya no: desde el 9-sep todo lo generado va a `out/`, ignorado entero.)
  La trampa que más cuesta ver es `navTab`: es una cadena
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
  con la skill `sincronizar-d1` (**no** con el botón del admin, que sube el catálogo
  viejo del navegador: ver esa skill). El prerender y los
  visitantes nuevos sí lo ven al instante. Y aparte, sin subir el `?v=` de los
  `data-*.js` en `index.html`/`admin.html` el navegador sirve la copia cacheada.
- 2026-08: **`NUM` no es global.** En `screens-2.jsx`, `const NUM = { fontVariantNumeric }`
  vive DENTRO de `ProductScreen`: los componentes hermanos (`RatingBlock` —hoy `OpinionBlock`—, `YouTubeBlock`)
  no lo ven. Babel transpila igual y el `ReferenceError` solo sale en runtime. `PALETTE`,
  `SectionHeader` y `TacticalCorners` sí son globales (declaraciones de nivel superior de
  scripts clásicos, compartidas entre archivos).
- 2026-08: **las cuatro tarjetas de arma comparten cuerpo.** `ArmaCard`, `FavCard`,
  `VisitedCard` y `RatedCard` delegan en `window.ArmaCardBody`: un cambio ahí las toca
  todas. (De paso: `FavCard` declaraba un `getRating` que no usaba — código muerto.)
  **Hoy** `ArmaCardBody` y `RatedCard` ya no existen: `ArmaCard`, `FavCard` y
  `VisitedCard` delegan en `window.ArmaExpediente` (`ui.jsx`). La lección es la misma.
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
- 2026-08: para revisar UI en el navegador basta `npm run build` + `npx serve out -l 4173`
  + Chrome DevTools; el tutorial de bienvenida tapa la pantalla — la clave real es
  **`localStorage['amx_onboarded_v1'] = '1'`** (no `amx_tutorial_visto`), y hay que
  recargar.
- 2026-08: al comprobar desbordes horizontales, **excluye los elementos dentro de un
  ancestro con `overflow-x: auto`** (los carruseles) o todo da falso positivo.
- 2026-06: `@babel/standalone` está vendorizado en `node_modules` → úsalo para validar.
- 2026-08: `node_modules` NO está en git — al reciclarse el contenedor se pierde.
  Reinstalar: `npm ci` (hay `package.json` y `package-lock.json`).
- 2026-08: smoke test visual sin red del navegador: `python3 -m http.server` desde
  `out/` + playwright-core con `executablePath:'/opt/pw-browsers/chromium'` y
  `page.route` ruteando unpkg a copias locales (npm react@18.3.1 trae `umd/`). El
  tutorial de bienvenida cubre la home la primera vez y ya no tiene SALTAR:
  `localStorage['amx_onboarded_v1'] = '1'` y recarga antes de capturar.
- 2026-06 → **RESUELTO ago-2026**: las fotos de armería eran placeholders SVG por falta de
  red. Ya son fotos reales (`imagenes/armeria-dcam.webp` / `armeria-otca.webp`, usadas por
  `ArsenalPhotoCard` en `screens-1.jsx`) y los `.svg` se borraron. Si una foto de sección
  se sustituye, **borra el placeholder**: quedaron dos huérfanos dos meses.
