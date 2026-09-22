# Penpot — el archivo de diseño de Armado en México

Archivo **«Wire Frame»** en el proyecto «Armado en mexico» de design.penpot.app
(id `b564c72c-f31f-81ec-8008-adb1fdea91fa`). Sirve para tres cosas: proponer y discutir
diseño antes de codificarlo, trabajar igual con cualquier proveedor de agentes, y enseñar
el sistema visual a quien entre al proyecto.

## Quién manda

**El código manda sobre lo que ya existe.** Los tokens viven en `src/styles/estilo.css`
(bloque `:root`, con su bitácora de decisiones en comentarios), las primitivas en
`src/components/ui.jsx` y el brief en `docs/DESIGN.md`. Penpot los **consume**:

```
estilo.css  ──npm run tokens──▶  docs/penpot/tokens.json  ──importar──▶  Penpot
```

Nunca al revés. Si un token cambia en Penpot, se cambia en `estilo.css`, se regenera el
JSON y se vuelve a importar. `scripts/tokens.test.mjs` falla en CI si el JSON y el CSS se
separan.

**Penpot manda solo sobre lo nuevo** (una pantalla que aún no existe, el rediseño de
Legalidad) y solo hasta que se mergea el PR que lo implementa. Después, el board pasa a
histórico y la captura del build real ocupa su lugar. El juez visual sigue siendo el
navegador con el build (`npm run smoke`, Chrome DevTools), no Penpot.

## Mapa del archivo

| Página | Qué hay | Boards |
|---|---|---|
| `00 Léeme` | Portada: este documento, resumido | `docs / leeme` |
| `01 Tokens` | Muestrarios **generados** desde los tokens | `tokens / colores`, `tokens / tipografia`, `tokens / espaciado` |
| `02 Componentes` | 15 componentes / 26 estados | `armazon / app-header` (raiz, con-volver) · `armazon / bottom-nav` (activa = inicio·arsenal·comparar·legalidad·mas) · `papel / hoja` · `papel / cinta-dymo` · `papel / sello` (civil, seguridad, exclusivo) · `papel / talon` · `papel / kardex` · `expediente / folder-manila` (cerrado, abierto) · `expediente / polaroid` · `expediente / arma-card` · `dato / spec-row` · `dato / cita-fuente` · `filtro / chip` (off, on) · `vitrina / carta-loteria` · `accion / boton` (primario, papel, enlace) |
| `03 Pantallas` | Lo publicado, como **capturas** del build a 360 px (`real / movil / <ruta>`), y los 3 arquetipos redibujados con componentes (`screens / movil / arsenal`, `ficha-arma`, `preguntas`) | |
| `10 Legalidad` | Página de trabajo del rediseño de Legalidad: 7 boards con el corpus real de `data-legal.js` y los hilos de comentarios donde Saulo decide | `screens / movil / legalidad*` |

Reglas de nombre: Penpot normaliza `a/b` a `a / b`. Prefijos `docs`, `tokens`, `components`,
`screens`, `real`. Hojas en español y kebab-case, iguales a la ruta del sitio
(`/legalidad/requisitos` → `legalidad-requisitos`). Capas por función (`fondo`, `titulo`,
`cinta`, `sello`), máximo 3-4 niveles, flex en casi todos los contenedores, **cero
valores duros**: todo color, espacio y radio sale de un token; todo texto, de una
tipografía `tipo/*`.

Móvil manda: boards de **360 px** (la base de `estilo.css`). Escritorio (1280) solo cuando
se toque `TopNav` o la rejilla.

Cada página `10+` es una tarea y un límite de alcance: el agente que trabaja en ella no
toca `00`-`03`.

## Tokens

Tres sets y un grupo de tema, generados por `scripts/tokens-dtcg.mjs`:

- `core`: lo que **no tiene gemelo `--d-`** en el CSS (marca, objetos diegéticos, espaciado,
  radios, familias, estilos de texto). Igual en los dos temas, a propósito.
- `modo/claro` y `modo/oscuro`: los tokens con gemelo, con el valor `--x` y `--d-x`.
- Tema `Modo/Claro` = core + modo/claro; `Modo/Oscuro` = core + modo/oscuro. Cambiar el tema
  en el panel de Tokens repinta todo lo que use tokens.

Nombres: los del CSS con prefijo de tipo, sin tabla de traducción: `--tinta-2` ⇄
`color.tinta-2`, `--e3` ⇄ `espacio.e3`, `--radio-sm` ⇄ `radio.sm`, `--manila-luz` ⇄
`opacidad.manila-luz`, `--sans` ⇄ `tipo.familia.sans`. Los colores con alfa van como
`rgba()`: Penpot lee un hex de 8 dígitos como ARGB. Se saltan `url()`, `linear-gradient()` y
las sombras de tres capas (`--sombra*`): la sombra se aplica una vez en el componente `papel /
hoja` y las instancias la heredan.

Estilos de texto (`tipo.*`, también como tipografías de librería `tipo/*`): `titulo-h1`,
`titulo-h2` (leídos de `.t-titulo`), `dymo`, `dymo-chica` (de `.amx-dymo`), `etiqueta`,
`cuerpo`, `cuerpo-chico`, `dato`, `dato-grande`. El tracking va en px (em × tamaño).

**Fuentes.** Archivo y JetBrains Mono están en el catálogo de Penpot. Los titulares del
sitio son Archivo a 85 % de ancho (`font-stretch`) y Penpot no tiene ese eje: se sube
`ArchivoSemiCondensed-Bold.ttf` (87,5 %, OFL; en `Penpot/fuentes/` fuera del repo) como
fuente del equipo en Dashboard → Fonts. Hasta entonces `tipo/titulo-*` usa Archivo 700 y hay
una capa `TODO-fuente` en `tokens / tipografia`.

Discrepancia anotada, para otro PR: `CLARO.radio = 12` / `radioSm = 8` en `ui.jsx` frente a
`--radio: 10px` / `--radio-sm: 6px` en el CSS.

## Conectar el MCP (cualquier proveedor)

1. En Penpot: *Your account → Integrations → MCP Server* → generar la MCP key (se muestra
   una sola vez; es un secreto: nunca en el repo, en un script ni en un log; el respaldo
   automático de dotfiles ya la filtró una vez porque viaja en la URL).
2. En el cliente: `npx -y add-mcp -g -n penpot <URL>` (Claude Code, Codex, Cursor…). La
   configuración se queda en el ámbito de usuario, no en `.mcp.json` del proyecto.
3. En el archivo abierto: *File → MCP Server → Connect*. No cerrar el panel del plugin.
4. En Chrome: *Rendimiento → Mantener siempre activos* → `design.penpot.app`. Si la pestaña
   se suspende, el MCP responde «no heartbeat» y hay que enfocarla.

El MCP opera **solo sobre la página enfocada** y en una pestaña; los proveedores se turnan,
no concurren. Nadie edita a mano mientras corre un lote (Ctrl+Z deshace lo del plugin).

## Ritual por sesión (para el agente)

1. `high_level_overview`; luego inventario en lectura (`currentFile.pages`, `library.local`).
2. `openPage(<página de la tarea>)` y **confirmar** `penpot.currentPage.name` en el lote
   siguiente.
3. `currentFile.saveVersion('<fecha> <agente> antes: <tarea>')`.
4. Describir lo que se va a hacer; lotes pequeños y **find-or-create por nombre** (repetir
   un lote no duplica nada); `try/catch` por unidad y un informe corto al final.
5. `export_shape` del board tocado como evidencia (adjunta al PR, no se commitea).
6. `saveVersion('… después')`.

Contrato token-aware para el prompt (en vez de prosa):

```
GLOBAL RULESET
- SOURCE: Penpot MCP · archivo Wire Frame · página <X>
- TOKENS: solo docs/penpot/tokens.json (sets core, modo/*) · TIPOGRAFIAS: tipo/*
- NO_GUESSING · IF_MISSING: capa "TODO-token:<nombre>" + comentario
- SIZE: móvil 360 · táctil ≥ 44 · texto ≥ 11 px · contraste ≥ 4.5:1
- NAMING: docs | tokens | components | screens | real · kebab-case · capas por función
- PROHIBIDO: valores duros, iconos de librerías ajenas, emoji, escudos o sellos oficiales
```

Puede: crear boards en la página de su tarea, instanciar componentes, aplicar tokens y
tipografías, comentar (`addCommentThread`), versionar, exportar. **No puede:** crear o
renombrar tokens (vienen del repo), tocar `00`-`03` sin OK, subir fuentes, conectar
librerías, borrar boards ajenos, poner valores duros.

## Trampas medidas de la Plugin API (22-sep-2026)

- Los nombres con `/` se normalizan a `a / b`; buscar por nombre normalizado.
- Las tipografías se guardan como `path` + `name` (`tipo` + `titulo-h1`), no `tipo/titulo-h1`.
- `text.applyTypography(t)` cambia las propiedades pero el exportador no relayouta el
  texto: aplicar además `font.applyToText(text, variante)` y reponer tamaño/tracking/caja.
- `strokes` no admite hex de 8 dígitos: color de 6 + `strokeOpacity`.
- `theme.addSet()` exige el objeto `TokenSet` (o su id), no el nombre.
- Un token con referencia `{x}` se valida al crearlo: `x` tiene que existir antes.
- `justifyContent` usa `end`, no `flex-end`. `textTransform = null` es inválido: no asignar.
- `fetch()` está bloqueado en el sandbox; imágenes solo con `uploadMediaUrl(url pública)`.
  El repo es público: `raw.githubusercontent.com/saulo-fl/armado-en-mexico/<rama>/docs/capturas/movil/<ruta>.webp`.
- `remove()` sobre hijos de un componente solo los oculta.

## Sincronía y evidencia

```
npm run tokens      # regenera docs/penpot/tokens.json desde estilo.css
npm test            # scripts/tokens.test.mjs: el JSON coincide con el CSS
npm run capturas    # 20 pantallas a 360 px en docs/capturas/movil/ (contra armado.mx)
```

Lado Penpot: importar `tokens.json` en el panel de Tokens (un clic) o volcar por MCP con el
helper idempotente (`set.tokens.find(nombre) ? actualizar : addToken`). Verificar el conteo:
92 en `core`, 31 en `modo/claro`, 31 en `modo/oscuro`.

Código abierto: **no se commitea el `.penpot`** (ZIP binario de varios MB, sin diff). Se
publica `tokens.json`, las capturas y, en cada Release, un `.penpot` exportado como asset.
