---
name: migrar-a-css
description: Mueve una primitiva de "Armado en México" de estilos inline a `className` + CSS sin romper nada. Úsala SIEMPRE que haya que darle hover, foco, pseudo-elementos, media queries o animación a un componente, o al sacar decoración de los objetos `style`. Cubre el orden correcto, la regla de no duplicar propiedades, el puente de custom properties para lo dinámico y la verificación. NO usar para reescribir los 1238 inline styles de golpe — eso está descartado.
---

# Migrar una primitiva a CSS

## Por qué existe esta skill

El sitio tiene **1238 objetos `style={{`** repartidos por los `.jsx`. Reescribirlos todos
no es viable. Pero los estilos inline no generan selector: sin `className`, el CSS no puede
darle `:hover`, `::before`, `@media` ni `@keyframes` a un componente.

La salida no es migrar todo. Es migrar **la piel** —decoración y estado— y dejar inline
**el layout** y lo que depende de datos.

Prueba de lo que pasa sin clase: para que el tweak de tipografía funcionara hubo que
escribir `body[data-type="editorial"] *[style*="Montserrat"] { … !important }`, que
estilaba por coincidencia de subcadena en el atributo serializado. Ese hack ya se retiró
con el tema anterior (queda la lápida en `src/pages/index.html`), pero es lo que vuelve a
aparecer cuando una primitiva no tiene `className`.

## Qué va a cada sitio

| Va al CSS | Se queda inline |
|---|---|
| `:hover`, `:focus-visible`, `:active` | `width: ${pct}%` y demás valores calculados |
| `::before`, `::after` | Colores que dependen del dato (estado legal, disponibilidad) |
| `@media`, `@keyframes`, `@supports` | Posición dentro de un grid calculado en JS |
| Superficies, sombras, bordes, radios | |
| Tipografía y espaciado del sistema | |

**Regla dura:** una propiedad vive en el CSS **o** vive inline, nunca en los dos. Si se
comparte, el inline gana siempre por especificidad y empieza la guerra de `!important`.
Mover una propiedad al CSS significa **borrarla del objeto `style`**, no duplicarla.

## Procedimiento

### 1 · Elegir la primitiva, no la pantalla

Las de `ui.jsx` propagan a las 321 páginas: `ArmaCard`, `TiraFiltros`, `AvailBadge`,
`TacticalCorners`, `SectionHeader`, `PriceLevel`, `AppHeader`, `TopNav`,
`BottomNav`, `HCarousel`, `SpecRow`, `MiniSpec`, `Disclosure`, `CompareFloat`.

Migrar una pantalla suelta es trabajo tirado: las pantallas solo componen primitivas.

### 2 · Prefijo de clase

Todas las clases llevan `amx-`. No hay bundler ni scoping, y el prefijo evita colisiones
por 0 coste: `.amx-card`, `.amx-chip`, `.amx-badge`.

### 3 · Escribir el CSS antes de tocar el JSX

En `src/styles/estilo.css`, dentro de su bloque de sección. Empieza por las
propiedades que **no se pueden** hacer inline — ese es el motivo de la migración. Las que
ya funcionan inline se mueven solo si estorban.

### 4 · Puentear lo dinámico con custom properties

React pasa las `--*` tal cual. Ya hay precedente en el repo: `BottomNav` publica
`--amx-nav-h` con `raiz.style.setProperty()`.

```jsx
<div className="amx-card" style={{ '--estado': colorSegunDisponibilidad }}>
```
```css
.amx-card { border-left: 3px solid var(--estado, transparent); }
.amx-card:hover { box-shadow: …; }   /* imposible inline, y ahora gratis */
```

Así el dato sigue mandando desde JS y el estado visual vive en CSS.

### 5 · Borrar lo que sustituiste

- Las propiedades que pasaron al CSS, fuera del objeto `style`.
- Los listeners que el CSS ya cubre: `onMouseEnter` / `onMouseLeave` que solo cambiaban
  color de borde. `ArmaCard` tenía dos por tarjeta, ×192 armas.
- Los nodos decorativos: `TacticalCorners` renderiza 2-4 `<span>` vacíos por instancia que
  `::before` / `::after` hacen sin DOM.

**Una migración bien hecha deja diff negativo.** Si el diff crece, algo se duplicó.

### 6 · Verificar

```
npm run build:js                                              # transpila
node .claude/skills/fidelidad-diseno/scripts/contraste.mjs    # contraste
```

Y a ojo, en este orden:
1. La primitiva se ve igual o mejor que antes (captura antes/después).
2. `:hover` **y** `:focus-visible` por teclado — la paridad de foco es lo que más se olvida.
3. Móvil y escritorio con el alternador de `dev-viewport.js`.
4. Si recortaste con `clip-path`, que el anillo de foco siga visible (`outline-offset` negativo).

## Trampas de este repo

- **`_headers` y el guardia del build.** `scripts/build-prerender.mjs` escanea los
  `<script src="*.js">` **y** los `<link href="*.css">` de `index.html` y `admin.html`:
  una hoja nueva sin su regla en `public/_headers` o sin `?v=` rompe el build a
  propósito. Si añades una: la regla, el `?v=`, y su línea en
  `scripts/copiar-estaticos.mjs`, que copia `estilo.css` **por nombre** a `out/`.
- **El prerender no estorba.** `emitir()` usa `index.html` como shell y solo sustituye seis
  marcas; un `<link>` viaja solo a las 321 páginas. No hay que tocar el script para eso.
- **No toques** el orden de carga de scripts ni los `integrity` de unpkg.
