# DESIGN.md — Armado en México

> **Qué es esto.** El brief de dirección de arte del sitio. Cualquier agente que vaya a tocar UI
> lee este archivo **antes** de escribir una línea. Sustituye a `HANDOFF-DISENO.md`, que describe
> un stack que ya no existe.
>
> **Estado:** borrador. Las secciones marcadas **`◻︎ SAULO`** están vacías a propósito — las llena
> él. Hasta que no estén llenas, este brief no está terminado y la dirección sigue siendo genérica.

---

## 1. El stack real (verificado 31-ago-2026, no confiar en HANDOFF-DISENO.md)

- **Sí hay build step.** `npm run build` → `babel --extensions .jsx --out-dir .` + `node build-prerender.mjs`. Corre en Cloudflare Pages en cada deploy.
- **No se transpila en el navegador.** `index.html` carga React/ReactDOM UMD y `.js` ya compilados.
- **Sí hay CSS.** ~190 líneas en el `<style>` de `index.html`, que ya usan `::before`, `::after`, `:hover`, `:focus-visible`, `@media`, `@keyframes` y `:has()`.
- **Los `.js` no se versionan.** Se editan los `.jsx`; el build genera los `.js`.

**Consecuencia:** no hay ninguna limitación técnica para hacer buen CSS. Lo que falta es que los
componentes tengan `className` para que el CSS pueda agarrarlos.

---

## 2. Diagnóstico medido (por qué el sitio se ve «cuadrado»)

| Medición | Valor | Lectura |
|---|---|---|
| Borde `#3A3A3A` sobre tarjeta `#2C2C2C` | **1.23:1** | Invisible |
| Tarjeta `#2C2C2C` sobre fondo `#1A1A1A` | **1.25:1** | Invisible |
| Objetos `style={{` en los `.jsx` | **1238** | Reescribirlos no es viable |
| Valores distintos de padding/gap/fontSize | **36** | Una escala usa 6-8 |
| Escalas de espaciado, tipografía o elevación | **0** | No existe sistema |

Las dos señales que definen una tarjeta —su borde y su superficie— están por debajo del umbral
perceptible. El ojo solo puede ver la geometría, y la geometría son rectángulos. **Primero
superficies, después efectos.** Al revés se obtiene un sitio ruidoso *y* plano.

---

## 3. Dirección de arte

### El ancla

**Documento oficial mexicano de armas + instrumentación HUD.**

No es cyberpunk, no es videojuego, no es sci-fi. Es el cruce entre el papeleo real de la DCAM
—que es el mundo verdadero de este catálogo— y la precisión de un instrumento de medición.

Vernáculo del que salen las decisiones:

- **Del documento oficial:** folio, matrícula, sello, clase legal (I/II/III), anexo de inventario,
  tabla de calibres impresa, membrete, márgenes de oficio, tinta de matriz de puntos, el uso de
  mayúsculas y guiones del Diario Oficial de la Federación.
- **Del instrumento:** números tabulares que alinean en columna, pares etiqueta/valor, color
  semántico de estado, ticks de regla, marcas de esquina en dosis mínima.

### Por qué no «táctico HUD» a secas

Es el terreno más saturado que existe, y es literalmente el punto donde converge cualquier modelo
de IA: la skill oficial `frontend-design` lista *near-black con acento saturado* y *hairlines de
1px con radius cero* como dos de los tres clichés a evitar. El sitio hoy calza con ambos.

Referencia de sobriedad: **Anduril**, la marca táctica más creíble del mercado, no usa stencil ni
scanlines. Usa Helvetica, blanco y negro, y deja que el único color lo aporte el producto.

---

## 4. ◻︎ SAULO — Lo que te gusta

> Esta sección es la que hace que el brief deje de ser genérico. Sin ella, cualquier agente vuelve
> a promediar. **Sé concreto: enlaces y capturas, no adjetivos.** «Táctico y moderno» no le dice
> nada a nadie; «la densidad de la ficha de un MFD de aviación» sí.

### 4.1 Sitios, apps o piezas que te gustan y por qué

<!-- Pega 3-5 enlaces. Para cada uno, una línea de QUÉ te gusta exactamente.
     No hace falta que sean de armas ni del género. -->

1.
2.
3.

### 4.2 Cosas que odiás y no querés ver nunca en armado.mx

<!-- Sé específico y despiadado. Esto vale tanto como lo anterior. -->

-
-
-

### 4.3 El elemento firma

> Una sola cosa memorable que alguien recuerde del sitio. Se gasta la audacia acá y el resto se
> mantiene sobrio. Ideas del vernáculo por si sirven de disparador: el sello de clase legal, la
> ficha con folio, la regla de calibres, la marca de agua de documento.

<!-- ¿Cuál? -->

### 4.4 Qué NO se toca

<!-- ¿El ámbar #F5C518 es intocable? ¿El logo? ¿Alguna pantalla que ya te gusta como está? -->

-

---

## 5. Sistema visual

### 5.1 Superficies — reemplazan al borde de 1px

Tres niveles, luz interior arriba, sombra corta. **El borde de 1px deja de ser el recurso principal.**

```css
--s0:#141414;  /* fondo */
--s1:#1E1E1E;  /* superficie baja */
--s2:#262626;  /* tarjeta */
--s3:#2F2F2F;  /* elevada */
--hair: inset 0 1px 0 rgba(255,255,255,.055);
```

### 5.2 Escala de espaciado — 6 valores, no 36

`4 · 8 · 12 · 20 · 32 · 52`

Cualquier número fuera de la escala necesita justificación explícita en el commit.

### 5.3 Tipografía

**Sustituir, no sumar** — hoy se cargan 4 familias y 13 archivos.

| Rol | Fuente | Sustituye a |
|---|---|---|
| Titulares y cuerpo | **Archivo** (variable, `wdth 75..100`) | Montserrat + Open Sans |
| Datos, specs, tablas | **JetBrains Mono** | Courier Prime |
| Códigos y badges | **Share Tech Mono** | — |
| Etiquetas de sección | **Big Shoulders Stencil** (dosis mínima) | — |

`Courier Prime` es una fuente de guion de cine: blanda, con serifas, de mancha irregular. No es
técnica. **Playfair Display se elimina** — una serif editorial rompe el ancla y cuesta una petición.

`font-variant-numeric: tabular-nums` en todo dato numérico. Es lo que hace que un calibre se lea
como instrumentación y no como texto.

### 5.4 Jerarquía sin bordes

- Barra de estado legal a la izquierda de cada ficha (`border-left: 3px`) por permitida /
  restringida / permiso especial. Semántica real, una propiedad.
- Fichas destacadas con `grid-column: span 2` — rompe la cuadrícula sin código nuevo.
- Par etiqueta/valor: etiqueta a 10-11px en mayúsculas con `letter-spacing: .08em`; valor en mono.
- **Asimetría sistemática, no aleatoria:** siempre la misma esquina cortada, siempre los mismos
  dos corchetes. Rompe el rectángulo conservando el escaneo predecible.

---

## 6. Prohibiciones explícitas

Restricciones negativas: sin ellas el modelo vuelve al promedio.

- ❌ **Space Grotesk** — es el punto de convergencia documentado de la IA. Tampoco Inter ni Roboto.
- ❌ **Gradientes morado-azul**, cream `#F4F1EA` con serif display, emoji como iconos de sección.
- ❌ **El borde de 1px como recurso principal.** Si una caja necesita separarse, es superficie o sombra.
- ❌ **`backdrop-filter: blur()`** en cualquier cosa que haga scroll.
- ❌ **`box-shadow` con blur > 24px** en listas: el costo escala con el cuadrado del radio.
- ❌ **augmented-ui en la grilla.** Como recetario de `clip-path` para 3-6 elementos hero, sí; como
  librería en 322 tarjetas, no — crea un contexto de apilamiento por elemento.
- ❌ **Tailwind por CDN.** Compila en runtime; deshace el prerender del que dependen los crawlers.
- ❌ **Animar `background-position`.** Si algo rota, se anima con `transform`.
- ❌ **Todo centrado.** Y nada de `border-radius` uniforme en todo.

---

## 7. No negociables

Es un sitio publicado, divulgativo y con contenido de referencia legal.

- **Contraste ≥ 4.5:1** para todo texto que porte información, incluidas las etiquetas que parecen
  decorativas. Si comunica, no es decorativa.
- **Objetivos táctiles ≥ 44px** en filtros y chips.
- **`:focus-visible` siempre visible.** `clip-path` recorta el anillo de foco: usar
  `outline-offset` negativo cuando se recorte una tarjeta enfocable.
- **`prefers-reduced-motion`** desactiva scanlines, parpadeos y cualquier movimiento ambiental.
- **Densidad de datos por encima del espectáculo.** Es una enciclopedia, no una landing.
- **Rendimiento móvil:** medir antes y después en gama media. `contain-intrinsic-size: auto 600px`
  junto a `content-visibility`, o el scroll salta y Ctrl+F cae en la sección equivocada.

---

## 8. Cómo se trabaja

1. **Nunca sobre las 322 páginas.** Se itera en una página de galería con todos los primitivos.
2. **Las primitivas antes que las pantallas.** Las ~15 de `ui.jsx` (`ArmaCard`, `FilterChip`,
   `AvailBadge`, `TacticalCorners`, `SectionHeader`, `PriceLevel`…) propagan solas a todo el sitio.
   Las pantallas solo las componen.
3. **La piel va al CSS, el layout se queda inline.** Una propiedad vive en un sitio o en el otro,
   nunca en los dos — si no, empieza la guerra de `!important`. Lo dinámico viaja como custom
   property: `style={{'--estado': color}}`.
4. **Antes de publicar:** las skills `verificar-app` y `fidelidad-diseno`, con capturas antes/después.
5. **Prueba de no-genérico.** Antes de dar por buena una pantalla, la pregunta es:
   *¿produciría esto mismo para cualquier catálogo oscuro?* Si la respuesta es sí, se revisa.
