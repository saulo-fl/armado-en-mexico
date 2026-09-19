# Instrucciones para agentes de código — Armado en México

Enciclopedia divulgativa de armas legales en México (armado.mx). App estática:
fuente en `src/` y `public/`, el build la deja en `out/`, Cloudflare Pages publica `out/`.

Responde en **español**. El documento completo es [`AGENTS.md`](../AGENTS.md); el brief
visual es [`docs/DESIGN.md`](../docs/DESIGN.md). Esto es el resumen operativo.

## Comandos

```bash
npm install                        # una vez
npm run build                      # estáticos + Babel + prerender de 398 páginas -> out/
npm run watch                      # recompila los .jsx mientras editas
npx serve out                      # la app NO carga desde file://
npm test                           # 5 suites de node:test
node --test scripts/faq.test.mjs   # una sola suite
```

Tras editar un `.jsx` hay que recompilar: **no hay bundler ni hot reload**.

## Cómo está construido (lo que sorprende)

- **No hay módulos ES ni bundler.** Babel precompila `.jsx` a `.js` con
  `runtime: "classic"` (React se carga como global UMD desde unpkg). Los archivos se
  comunican por `window.*` y **el orden de los `<script>` en el HTML importa**:
  `data-precios.js` antes que `store.js`.
- **Fuente estructurada, salida plana.** `src/styles/estilo.css` se sirve como
  `/estilo.css`; `src/screens/screens-1.jsx` como `/screens-1.js`. Las 20 reglas de
  `public/_headers` listan esas rutas planas **una por una** (los comodines no funcionan
  en Pages). Si mueves algo dentro de `src/`, ajusta `scripts/copiar-estaticos.mjs`, no el HTML.
- **`out/` no se commitea.** Lo genera el build en cada deploy.
- El prerender (`scripts/build-prerender.mjs`) emite un `.html` real por URL para los
  crawlers que no ejecutan JS. Falla ruidosamente si `index.html` cambia de forma: es a
  propósito.

## Dónde vive cada cosa

| Ruta | Qué |
|---|---|
| `src/components/ui.jsx` | las ~15 primitivas visuales — **empieza siempre aquí** |
| `src/screens/screens-*.jsx` | las pantallas; solo componen primitivas |
| `src/styles/estilo.css` | la piel |
| `src/data/data-*.js` | los catálogos (armas, accesorios, municiones, traumáticas, precios) |
| `src/lib/store.js` | estado, hidratación desde el backend |
| `functions/api/` | Cloudflare Pages Functions + D1 |

## Reglas de UI

1. **Primitiva antes que pantalla.** Cambiar `ui.jsx` propaga a todo el sitio; parchear
   una pantalla no.
2. **La piel va al CSS, el layout se queda inline.** Una propiedad vive en un sitio o en
   el otro, nunca en los dos. Lo dinámico viaja como custom property:
   `style={{'--estado': color}}`.
3. Contraste ≥ 4.5:1 en todo texto que informe · áreas táctiles ≥ 44px ·
   `:focus-visible` siempre visible · `prefers-reduced-motion` desactiva todo movimiento.
4. Móvil manda. Medir en 360px antes de dar nada por bueno.

## Git y conflictos

Las reglas generales (merge y nunca rebase sobre una rama publicada, resolver cortando por
número de línea, qué comprobar al cerrar) están en las instrucciones globales de Saulo
—`~/dotfiles/instrucciones/AGENTS.md`, sección «Git — ramas y conflictos»—. GitHub Copilot
no las hereda, así que el resumen es: **merge hacia tu rama, nunca rebase; corta por línea
en vez de reescribir el bloque; y conserva los dos lados cuando ambos añadieron al final.**

Lo propio de este repo: un conflicto en `estilo.css` entre dos secciones nuevas casi nunca
es semántico, es de vecindad. Ambas suelen añadir al final del archivo sin pisarse ninguna
regla; comprueba los selectores antes de descartar nada.

## Antes de decir que está hecho

`npm test` **no** detecta marcadores de conflicto ni CSS duplicado: las 5 suites son de
datos (catálogo, filtros, FAQ) y pasan con el archivo roto. Aquí la verificación real es:

```bash
git grep -nE '^(<<<<<<<|>>>>>>>) '             # cero resultados
npm run build && npm test                      # 398 páginas · 47 pruebas
git diff --stat origin/main...HEAD             # que el cambio sea el esperado
npx serve out                                  # y abrir la pantalla tocada
```

## Prohibido

- **Inventar leyes, artículos o reformas.** Sin fuente, no se escribe. Todo contenido
  normativo lleva fuente + fecha de actualización visibles.
- **Iconografía oficial**: escudo nacional, águila, emblemas de SEDENA, sellos de
  gobierno — ni «inspirados en». El sitio no puede parecer del gobierno.
- Tocar los logotipos de Armado en México, Armas y Más o Armas M&S, ni el nombre de su autor.
- Space Grotesk, Inter, Roboto · gradientes morado-azul · emoji como iconos de sección ·
  el borde de 1px como recurso principal · `backdrop-filter: blur()` en algo que scrollee ·
  Tailwind por CDN (compila en runtime y deshace el prerender).
- Push directo a `main` o `develop`, deploys, y cualquier escritura en D1: eso lo hace
  Saulo o los agentes de deploy, nunca un agente de código.

Sí van: verde/blanco/rojo, señalética, gráfica editorial mexicana, formularios, sellos
gráficos ficticios, numeración de expedientes, líneas tricolor.
