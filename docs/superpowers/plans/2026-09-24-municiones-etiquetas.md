# Etiquetas de especificaciones y precio en Municiones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sustituir en `/municiones` el letrero amarillo de cada producto por la etiqueta de cartón ya aprobada, con condición legal, especificaciones y precio por unidad.

**Architecture:** `MesaPuestos` ganará un carril opcional de etiquetas alineado con las mismas columnas de cada mesa; sin ese prop conservará exactamente el DOM y la apariencia de Accesorios. `PuestoPieza` hará opcionales el letrero y la vara, mientras `MunicionesScreen` compondrá la etiqueta con las clases `.amx-etiqueta*` y los datos existentes, sin duplicar fuentes de precio o legalidad.

**Tech Stack:** React 18 global con JSX clásico, Babel CLI, CSS plano, `node:test`, Puppeteer/Chrome para smoke.

**Spec:** `docs/superpowers/specs/2026-09-24-municiones-etiquetas-design.md`

## Global Constraints

- La fuente editable vive en `src/`; no editar ni versionar `out/` ni archivos `.js` generados.
- Partir de `origin/develop`; la migración base ya entró allí mediante el PR #295. La rama local `feature/municiones-vitrina-mesa` perdió su remoto y no se debe volver a publicar.
- Conservar sin tocar el archivo ajeno no rastreado `HANDOFF-limpieza-ramas.md`.
- No cambiar datos, precios, inventarios, rutas, prerender, D1, Home, ficha individual ni Accesorios.
- Reutilizar `.amx-etiqueta`, `.amx-etiqueta-marca`, `.amx-etiqueta-nombre` y `.amx-etiqueta-precio`; no crear otra piel de tarjeta.
- La condición legal sale de `window.SELLOS_LEGALES`; la unidad sale de `window.munUnidadPrecio(mun)`; el precio sale de `mun.priceExact`.
- Dentro de la etiqueta de papel no usar `PALETTE` ni `CLARO`.
- Mantener 2/4/6 productos por fila en los cortes actuales: `<720`, `720–1023`, `≥1024` px.
- Piso tipográfico informativo de 12 px, contraste mínimo 4.5:1 y foco visible.
- No instalar dependencias ni tocar producción, `main`, D1 o Cloudflare.

---

## File Structure

- Modify: `src/components/ui.jsx` — volver opcional el letrero de `PuestoPieza` y añadir a `MesaPuestos` el carril opcional `renderEtiqueta`.
- Modify: `src/screens/screens-municiones.jsx` — componer el contenido de la etiqueta y activar el carril solamente en `MunicionesScreen`.
- Modify: `src/styles/estilo.css` — alinear las etiquetas con las columnas, montarlas sobre el frente de madera y separar filas sin afectar Accesorios.
- Modify: `scripts/mesa-style.test.mjs` — fijar por prueba el contrato estructural y visual de la variante con etiquetas.
- Modify: `docs/DESIGN.md` — registrar la diferencia deliberada entre Accesorios y Municiones.

### Task 1: Partir de `develop` y fijar el contrato de la primitiva

**Files:**
- Modify: `scripts/mesa-style.test.mjs`
- Modify: `src/components/ui.jsx:3122-3162`
- Modify: `src/styles/estilo.css:4132-4187`

**Interfaces:**
- Consumes: `MesaPuestos({ items, porFila, renderPuesto })` y `PuestoPieza({ rotulo, foto, silueta, ariaLabel, onClick })` existentes.
- Produces: `MesaPuestos({ items, porFila, renderPuesto, renderEtiqueta? })`; `renderEtiqueta(item)` devuelve el contenido interno de una `.amx-etiqueta`. `PuestoPieza` omite letrero y vara cuando `rotulo` es vacío, pero conserva producto, luz, clic y foco.

- [ ] **Step 1: Confirmar el punto de partida y abrir una rama nueva**

Run:

```powershell
git fetch origin --prune; git merge-base --is-ancestor f71fbfa origin/develop; git switch -c feature/municiones-etiquetas origin/develop; git status --short --branch
```

Expected: `merge-base` devuelve código 0; la rama nueva nace en `origin/develop`; `HANDOFF-limpieza-ramas.md` sigue como `??` y no aparece ningún otro cambio ajeno.

- [ ] **Step 2: Escribir las pruebas que fijan el carril opcional y la compatibilidad con Accesorios**

En `scripts/mesa-style.test.mjs`, junto a las constantes de CSS, cargar también las tres fuentes:

```js
const ui = readFileSync(fileURLToPath(new URL('../src/components/ui.jsx', import.meta.url)), 'utf8');
const municiones = readFileSync(fileURLToPath(new URL('../src/screens/screens-municiones.jsx', import.meta.url)), 'utf8');
const accesorios = readFileSync(fileURLToPath(new URL('../src/screens/screens-accesorios.jsx', import.meta.url)), 'utf8');
```

Agregar estas pruebas:

```js
test('MesaPuestos ofrece etiquetas opcionales y conserva el letrero por defecto', () => {
  assert.match(ui,
    /function MesaPuestos\(\{ items, porFila, renderPuesto, renderEtiqueta \}\)/,
    'falta el contrato renderEtiqueta');
  assert.match(ui,
    /renderEtiqueta[\s\S]{0,900}amx-mesa-etiquetas[\s\S]{0,900}amx-etiqueta/,
    'el contenido opcional no llega a un carril de etiquetas');
  assert.match(ui,
    /rotulo &&[\s\S]{0,500}amx-puesto-letrero[\s\S]{0,500}amx-puesto-palo/,
    'letrero y vara deben desaparecer juntos cuando no hay rótulo');
  assert.match(accesorios, /rotulo=\{a\.corto\}/,
    'Accesorios debe conservar sus letreros');
});

test('el carril de etiquetas comparte columnas y no mueve la mesa de Accesorios', () => {
  assert.match(css,
    /\.amx-mesa-etiquetas\s*\{[^}]*grid-template-columns:\s*repeat\(var\(--por-fila\), minmax\(0, 1fr\)\)/,
    'productos y etiquetas deben usar las mismas columnas');
  assert.match(css,
    /\.amx-mesa-etiquetas \.amx-etiqueta\s*\{[^}]*margin-top:\s*-4px/,
    'la cinta debe montar la etiqueta sobre el frente de madera');
  assert.doesNotMatch(css,
    /\.amx-mesa-fila(?![^,{]*--etiquetas)[^{]*\{[^}]*padding-bottom/,
    'la mesa base de Accesorios no debe reservar espacio de etiqueta');
});
```

- [ ] **Step 3: Ejecutar la prueba y confirmar que falla por la funcionalidad ausente**

Run:

```powershell
node --test scripts/mesa-style.test.mjs
```

Expected: FAIL en las dos pruebas nuevas; las tres pruebas anteriores siguen pasando.

- [ ] **Step 4: Añadir el carril opcional a `MesaPuestos`**

Sustituir la implementación actual por esta estructura, conservando el reparto en filas:

```jsx
function MesaPuestos({ items, porFila, renderPuesto, renderEtiqueta }) {
  const filas = [];
  for (let i = 0; i < items.length; i += porFila) filas.push(items.slice(i, i + porFila));
  return (
    <div className="amx-mesa">
      {filas.map((fila, f) => (
        <div key={f} className={'amx-mesa-tramo' + (renderEtiqueta ? ' amx-mesa-tramo--etiquetas' : '')}>
          <div className="amx-mesa-fila" style={{ '--por-fila': porFila }}>
            {fila.map((item, i) => (
              <div key={i} className="amx-puesto-wrap">
                {renderPuesto(item)}
              </div>
            ))}
          </div>
          {renderEtiqueta &&
            <div className="amx-mesa-etiquetas" style={{ '--por-fila': porFila }}>
              {fila.map((item, i) => (
                <div key={i} className="amx-mesa-etiqueta-celda">
                  <span className="amx-etiqueta" aria-hidden="true">{renderEtiqueta(item)}</span>
                </div>
              ))}
            </div>}
        </div>
      ))}
    </div>
  );
}
```

La etiqueta es visual y no crea un segundo control. Toda su información se repetirá en el `aria-label` del botón del producto en Task 2.

- [ ] **Step 5: Hacer opcionales el letrero y la vara en `PuestoPieza`**

Agrupar solamente esas dos piezas bajo la condición `rotulo`; no condicionar la luz ni la foto:

```jsx
{rotulo && <React.Fragment>
  <span className="amx-puesto-letrero">
    <span className="amx-puesto-rotulo">{rotulo}</span>
  </span>
  <span className="amx-puesto-palo" aria-hidden="true" />
</React.Fragment>}
<span className="amx-puesto-luz" aria-hidden="true" />
```

Actualizar el comentario del componente para decir que el letrero y la vara son opcionales; Accesorios los conserva porque sigue enviando `rotulo`.

- [ ] **Step 6: Añadir únicamente el layout del carril nuevo**

En el bloque «LA VITRINA DE ACCESORIOS», después de `.amx-mesa-fila`, agregar:

```css
.amx-v2 .amx-mesa-etiquetas {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(var(--por-fila), minmax(0, 1fr));
  gap: 12px;
  padding: 0 12px;
  align-items: start;
}
.amx-v2 .amx-mesa-etiqueta-celda { min-width: 0; }
.amx-v2 .amx-mesa-etiquetas .amx-etiqueta { margin-top: -4px; }
.amx-v2 .amx-mesa-tramo--etiquetas + .amx-mesa-tramo--etiquetas { margin-top: var(--e4); }
```

No modificar `.amx-etiqueta*`: su cartón, cinta, tintas, giros y tipografía ya son la referencia aprobada.

- [ ] **Step 7: Verificar la primitiva**

Run:

```powershell
node --test scripts/mesa-style.test.mjs; npm run build:js
```

Expected: todas las pruebas de `mesa-style` pasan y Babel compila los 13 archivos JSX.

- [ ] **Step 8: Commit de la primitiva**

```powershell
git add scripts/mesa-style.test.mjs src/components/ui.jsx src/styles/estilo.css; git commit -m "feat: añadir etiquetas opcionales a la mesa"
```

### Task 2: Sustituir el letrero de cada munición por su etiqueta informativa

**Files:**
- Modify: `scripts/mesa-style.test.mjs`
- Modify: `src/screens/screens-municiones.jsx:257-296`

**Interfaces:**
- Consumes: `MesaPuestos.renderEtiqueta(item)`, `PuestoPieza` con `rotulo` opcional, `window.SELLOS_LEGALES`, `window.munUnidadPrecio(mun)` y `mun.priceExact`.
- Produces: una etiqueta por munición con `{ marca, condición legal, bala/grano, precio/unidad }`; el botón conserva un único nombre accesible con los mismos datos.

- [ ] **Step 1: Escribir la prueba de integración de `MunicionesScreen`**

Agregar a `scripts/mesa-style.test.mjs`:

```js
test('Municiones sustituye el letrero por especificaciones y precio reales', () => {
  const bloque = municiones.match(/function MunicionesScreen[\s\S]*?window\.MunicionesScreen = MunicionesScreen;/);
  assert.ok(bloque, 'no encuentro MunicionesScreen');
  const pantalla = bloque[0];
  assert.match(pantalla, /rotulo=\{null\}/, 'el letrero amarillo sigue activo');
  assert.match(pantalla, /renderEtiqueta=\{etiqueta\}/, 'la mesa no recibe la etiqueta');
  assert.match(pantalla, /amx-etiqueta-marca[\s\S]*amx-etiqueta-nombre[\s\S]*amx-etiqueta-precio/,
    'faltan niveles de información de la etiqueta');
  assert.match(pantalla, /window\.SELLOS_LEGALES/, 'la condición legal no sale de la primitiva común');
  assert.match(pantalla, /munUnidadPrecio\(m\)/, 'la unidad no respeta el caso por caja');
  assert.match(pantalla, /String\(m\.priceExact\)\.replace\(' MXN', ''\)/,
    'el precio no sale de priceExact');
});
```

- [ ] **Step 2: Ejecutar la prueba y comprobar el fallo esperado**

Run:

```powershell
node --test scripts/mesa-style.test.mjs
```

Expected: FAIL solamente en «Municiones sustituye el letrero…».

- [ ] **Step 3: Derivar una sola vez los datos de presentación**

Dentro de `MunicionesScreen`, antes de `puesto`, agregar:

```jsx
const sellos = window.SELLOS_LEGALES || {};
const datosPuesto = (m) => {
  const sello = sellos[m.avail] || sellos.dcam;
  const detalle = [m.bala, m.grano].filter(Boolean).join(' · ');
  const precio = m.priceExact ? String(m.priceExact).replace(' MXN', '') : '';
  const unidad = munUnidadPrecio(m);
  return { sello, detalle, precio, unidad };
};
```

Los datos son de presentación y pequeños; no añadir estado, memoización ni una segunda fuente de precio.

- [ ] **Step 4: Mantener el botón y retirar solamente su letrero**

Reemplazar `puesto` por:

```jsx
const puesto = (m) => {
  const { sello, detalle, precio, unidad } = datosPuesto(m);
  return (
    <window.PuestoPieza key={m.id}
      rotulo={null}
      ariaLabel={[m.nombre, sello.texto, detalle, precio && (precio + ' por ' + unidad)].filter(Boolean).join(', ')}
      foto={window.isRealImage(m.img) ? m.img : null}
      silueta={window.municionPlaceholder(m)}
      onClick={() => onOpenMunicion(m.id)} />
  );
};
```

- [ ] **Step 5: Componer la etiqueta con la estructura ya aprobada**

Agregar junto a `puesto`:

```jsx
const etiqueta = (m) => {
  const { sello, detalle, precio, unidad } = datosPuesto(m);
  return (
    <React.Fragment>
      <span className="amx-etiqueta-marca">
        <span>{m.marca}</span>
        <i className={'es-' + sello.tono}>{sello.texto}</i>
      </span>
      <span className="amx-etiqueta-nombre">{detalle}</span>
      {precio && <span className="amx-etiqueta-precio">{precio} <small>/ {unidad}</small></span>}
    </React.Fragment>
  );
};
```

Pasarla a la mesa:

```jsx
<window.MesaPuestos items={s.piezas} porFila={porFila}
  renderPuesto={puesto} renderEtiqueta={etiqueta} />
```

- [ ] **Step 6: Ejecutar el contrato y compilar**

Run:

```powershell
node --test scripts/mesa-style.test.mjs; npm run build
```

Expected: `mesa-style` pasa completo; Babel compila; el prerender vuelve a emitir sus páginas sin cambiar rutas ni cantidades por causa de este cambio.

- [ ] **Step 7: Commit de la pantalla**

```powershell
git add scripts/mesa-style.test.mjs src/screens/screens-municiones.jsx; git commit -m "feat: mostrar precio y especificaciones en municiones"
```

### Task 3: Registrar la decisión y verificar el resultado real

**Files:**
- Modify: `docs/DESIGN.md:1176-1200`
- Verify: `src/components/ui.jsx`
- Verify: `src/screens/screens-municiones.jsx`
- Verify: `src/styles/estilo.css`

**Interfaces:**
- Consumes: implementación terminada de Tasks 1 y 2.
- Produces: evidencia visual en Chrome y una regla durable en el brief para que el letrero amarillo no vuelva a `/municiones`.

- [ ] **Step 1: Documentar la variante de Municiones en `docs/DESIGN.md`**

Al final de §5.7, añadir:

```markdown
- **Variante de Municiones (24-sep-2026).** `/municiones` comparte toldo,
  separadores, mueble y mesas con Accesorios, pero no sus letreros amarillos.
  Cada caja conserva la luz del puesto y lleva debajo, sobre el frente de madera,
  la misma etiqueta de cartón de la vitrina de una ficha de arma: marca + condición
  legal, bala/grano y precio por `munUnidadPrecio`. Accesorios y los puestos de Home
  conservan el letrero con vara.
```

- [ ] **Step 2: Ejecutar las verificaciones automáticas**

Run, en este orden:

```powershell
npm run build
node --test scripts/mesa-style.test.mjs
node .claude/skills/conciliar-inventario/scripts/auditar.js
node .claude/skills/fidelidad-diseno/scripts/contraste.mjs
npm run smoke
npm test
```

Expected:

- Build: 13 JSX compilados y prerender completo.
- `mesa-style`: todas pasan.
- Auditoría: `AUDITORÍA SIN HALLAZGOS`.
- Contraste: los dos temas pasan.
- Smoke: ninguna pantalla con error de consola.
- Suite completa: no aparecen regresiones. En el punto de partida del 24-sep-2026 existe un fallo ajeno en `scripts/rutas.test.mjs` porque `_redirects` produce una cuarta cadena vacía; si sigue presente, debe ser el único fallo y se reporta como preexistente sin corregirlo en esta rama.

- [ ] **Step 3: Revisar visualmente en Chrome a cuatro anchos**

Abrir el build local y comprobar `/municiones` a `390×844`, `720×900`, `1024×900` y `1440×900`, primero en claro y después a `390×844` en oscuro.

En cada captura comprobar:

- Las cajas/siluetas siguen apoyadas sobre una mesa continua.
- No quedan cartel amarillo ni vara en el catálogo.
- Cada etiqueta queda alineada con su caja, montada 4 px sobre el frente de madera.
- Ninguna etiqueta invade la mesa siguiente; la última fila corta conserva el mueble completo.
- Marca y estado caben en el primer renglón; bala/grano admite dos líneas sin tapar el precio.
- El precio no pierde `$`, decimales ni unidad; la munición 2046 dice `/ caja`.
- No hay scroll horizontal fuera de componentes que ya lo permiten.

- [ ] **Step 4: Confirmar que el alcance vecino no cambió**

Comparar en el mismo viewport:

- `/accesorios/cargadores`: conserva letreros amarillos, varas y luz.
- Home, bloque de municiones: conserva sus puestos por calibre.
- Una ficha de arma con «Munición y accesorios»: conserva sus etiquetas actuales.

Navegar con Tab por `/municiones`: cada producto debe mostrar foco visible, activar la luz y anunciar nombre, estado, especificación y precio/unidad una sola vez.

- [ ] **Step 5: Revisar el diff y cerrar el commit de documentación**

Run:

```powershell
git grep -nE '^(<<<<<<<|>>>>>>>) '; git ls-files -u; git diff --check; git diff --stat origin/develop...HEAD; git status --short
```

Expected: cero marcadores, índice de conflictos vacío, `diff --check` sin salida y solamente los cinco archivos previstos más los dos documentos de planeación; `HANDOFF-limpieza-ramas.md` sigue sin añadirse.

Commit:

```powershell
git add docs/DESIGN.md docs/superpowers/specs/2026-09-24-municiones-etiquetas-design.md docs/superpowers/plans/2026-09-24-municiones-etiquetas.md; git commit -m "docs: fijar etiquetas de la vitrina de municiones"
```

