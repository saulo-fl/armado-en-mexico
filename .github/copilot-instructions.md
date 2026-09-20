# Instrucciones para agentes de código — Armado en México

Enciclopedia divulgativa de armas legales en México (armado.mx). App estática:
fuente en `src/` y `public/`, el build la deja en `out/`, Cloudflare Pages publica `out/`.

Responde en **español**. El documento completo es [`AGENTS.md`](../AGENTS.md); el brief
visual es [`docs/DESIGN.md`](../docs/DESIGN.md). Esto es el resumen operativo.

## Comandos

```bash
npm install                        # una vez
npm run build                      # estáticos + Babel + prerender -> out/
npm run watch                      # recompila los .jsx mientras editas
npx serve out                      # la app NO carga desde file://
npm test                           # las suites de node:test (scripts/*.test.mjs)
node --test scripts/faq.test.mjs   # una sola suite
npm run smoke                      # abre out/ en un Chrome real, una página por ruta
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

<!-- Copia literal de ~/dotfiles/instrucciones/AGENTS.md § «Git — ramas y conflictos».
     github.com no ve ese disco, por eso está duplicada. La captura horaria de HEFESTO
     compara las dos; si editas una, edita la otra. -->

## Git — ramas y conflictos

- Para traer `main`/`develop` a **tu** rama ya publicada: `merge` hacia tu rama, nunca `rebase`. Rebasar la reescribe y obliga a `push --force`, prohibido arriba; además multiplica el conflicto: uno por merge, uno por cada commit de la rama en rebase. El merge en sentido contrario, hacia `main`, sigue necesitando el OK de Saulo. Cuidado con `git pull`: si el repo tiene `pull.rebase=true` rebasa solo — usa `git fetch` y luego `git merge origin/<rama>`.
- En un conflicto, `HEAD` es donde estás parado, no lo que traes. En `rebase`, `cherry-pick`, `revert` y `stash pop` eso invierte `ours` y `theirs` respecto a lo que esperas. Confirma de quién es cada lado antes de borrar nada.
- Resuelve **cortando por número de línea**, no reescribiendo el bloque de memoria: localiza los marcadores, corta los trozos (`sed -n` en APOLO, `Get-Content | Select-Object -Skip -First` en HEFESTO) y reensambla. Reproducir cientos de líneas a mano sale mal y se queda a medias.
- Si los dos lados añadieron al final del mismo archivo, casi siempre lo correcto es conservar **los dos bloques**, uno tras otro. Comprueba si de verdad se pisan antes de descartar uno.
- Cierra así: `git grep -nE '^(<<<<<<<|>>>>>>>) '` en cero y `git ls-files -u` vacío —hacen falta los dos: si alguien hizo `git add` del archivo con los marcadores dentro, `ls-files -u` sale vacío igual—, la comprobación que tenga el proyecto (build, test o linter; si no tiene, dilo) y `git diff --stat origin/<rama-base>...HEAD` para ver qué archivos cambiaron. Si aparece con cientos de líneas uno que no tocaste, lo rompiste tú: finales de línea.

## Antes de decir que está hecho

`npm test` **no** detecta marcadores de conflicto ni CSS duplicado: casi todas las
suites son de datos (catálogo, filtros, FAQ) y pasan con el archivo roto. La excepción
es `referencias.test.mjs`, que sí lee el código: resuelve cada identificador de los
`.jsx` contra lo que declaran entre todos, porque son scripts de navegador y comparten
el scope global.

Y ni las pruebas ni el build EJECUTAN los componentes — Babel compila feliz y el
prerender escribe el HTML sin montarlos. El 19-sep-2026 eso dejó tres fichas en blanco
en producción con la suite verde. Por eso la verificación real termina en un navegador:

```bash
git grep -nE '^(<<<<<<<|>>>>>>>) '             # cero resultados
npm run build && npm test                      # que compile y que las suites pasen
npm run smoke                                  # un Chrome de verdad, una página por ruta
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
