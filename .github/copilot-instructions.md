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

Lecciones del 18-sep-2026, cuando el conflicto de un PR costó 40 minutos y quedó mal resuelto.

1. **Para actualizar una rama publicada: `merge`, nunca `rebase`.** Rebasar reescribe la
   rama y obliga a `push --force`, que está prohibido. Además multiplica el trabajo: aquel
   conflicto era **uno** por merge y **cuatro** por rebase, uno por commit de la rama.
2. **En un rebase, `ours` y `theirs` se invierten**: `HEAD` pasa a ser la rama base, no la
   tuya. Leerlo al revés fue lo que llevó a «restaurar» 43 líneas de CSS que ya estaban.
3. **Resuelve cortando por número de línea, no reproduciendo el bloque.** Reescribir
   literalmente cientos de líneas no sale bien: localiza los marcadores
   (`grep -n '^<<<<<<<\|^=======\|^>>>>>>>'`), corta las partes con `sed -n` o `awk` y
   reensambla. Cuando ambos lados añaden al final del archivo, casi siempre la resolución
   correcta es conservar los dos bloques, uno tras otro.
4. **Un conflicto de CSS entre dos secciones nuevas casi nunca es semántico**: es de
   vecindad. Comprueba si los selectores se pisan de verdad antes de decidir nada.

## Antes de decir que está hecho

`npm test` **no** detecta marcadores de conflicto ni CSS duplicado: las 5 suites son de
datos (catálogo, filtros, FAQ) y pasan con el archivo roto. La verificación real es:

```bash
grep -rn '^<<<<<<<\|^=======\|^>>>>>>>' src/   # cero resultados
npm run build && npm test                        # 398 páginas · 47 pruebas
git diff origin/main --stat                      # que el cambio sea el esperado
npx serve out                                    # y abrir la pantalla tocada
```

Nunca anuncies que algo quedó resuelto sin haber visto la salida de esos comandos. Si una
tarea no cupo en el presupuesto de tokens, dilo: media resolución silenciosa cuesta más
que un «no pude terminar».

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
