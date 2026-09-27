# Ficha de calibre en el expediente — plan

> **Ejecución:** Opus orquesta y audita; **Qwen 3.6 (`claude-lm 36`) aplica el código** con contratos de
> 40-55 líneas y bloques literales ANTES/DESPUÉS. Opus solo hace cortes mecánicos por rango de líneas
> (dejar marcadores, borrar CSS muerto) y corre los jueces. Casillas `- [ ]`.

**Goal:** la ficha `/calibres/<slug>` pasa al folder manila del expediente con las decisiones de la spec.
**Architecture:** se reutilizan las primitivas de §5.5 (`.amx-carpeta`, `ArmaPolaroid`, `FichaTecnica`,
`FichaTabs`, `HojaCompatibilidad`, `.amx-milimetrico`, `ReglaComparativa`) y la vitrina de la ficha de
munición, extraída a `VitrinaMuniciones`. Una función nueva con prueba: `amxMismoCalibre`.
**Tech Stack:** React sin bundler (Babel → `out/`), `src/styles/estilo.css`, `node --test`, puppeteer-core.
**Spec:** `docs/superpowers/specs/2026-09-28-ficha-calibre-design.md`

## Global Constraints

- Nunca definir ni redefinir un token. Tokens permitidos en el CSS nuevo: `--mono`, `--sans`, `--manila-tinta`,
  `--manila-tinta-2`, `--milimetrico-linea`, `--milimetrico-tinta-2`, `--oficio-tinta-2`, `--sello-restr`, `--e3`, `--e4`.
- Dentro de un papel, solo tokens de papelería; nunca `PALETTE`, `CLARO`, `--tinta`, `--hair` ni `--acento`.
- Móvil manda: 360 · 390 · 412 · 440; escritorio 1440 con corte en 1024.
- `npm test` verde salvo el fallo preexistente de `public/_redirects` en CRLF.

## Review Focus

1. **Calibre con datos que faltan** — sin sello (3), sin energía (4 escopetas), sin armas (`.32 ACP`, `.45 ACP`…),
   sin munición (13): la ficha se ve completa y no deja huecos rotos. Lo cubre la sonda de las 30 (Task 6).
2. **Tema oscuro dentro del folder** — papeles claros, manila al 68 %: todo texto ≥ 4.5:1. Sonda de contraste (Task 6).
3. **Regresión en la ficha de munición** al extraer `VitrinaMuniciones` — misma vitrina byte a byte, y «Ver los N»
   se cierra al cambiar de munición (`key`). Juez de Task 2.
4. **Referencia rota** (`window.X` inexistente) — el prerender no ejecuta componentes y la ficha quedaría en blanco:
   `scripts/referencias.test.mjs` y consola limpia en la sonda.
5. **Alias de munición** — «.308 Win» debe encontrar «.308 Winchester» y nada más («.300 Win Mag» no es «.300 Winchester»). Prueba de Task 1.

---

### Task 1: `amxMismoCalibre` y su prueba

**Files:** Modify `src/lib/calibres.js` (antes de `window.amxEscalaCartucho = …`) · Modify `scripts/calibres.test.mjs` (al final)
**Produces:** `window.amxMismoCalibre(a: string, b: string): boolean`

- [ ] Contrato B1a (Qwen): insertar en `calibres.js`, antes de la línea `  window.amxEscalaCartucho = amxEscalaCartucho;`:

```js
  /**
   * ¿Es el mismo calibre? El inventario de munición abrevia «.308 Win» donde la
   * guía y el catálogo de armas dicen «.308 Winchester» (igual .243 y .270).
   * ponytail: solo iguala el sufijo « Winchester»; otra abreviatura, aquí y en su prueba.
   * @param {string} a
   * @param {string} b
   * @returns {boolean}
   */
  function amxMismoCalibre(a, b) {
    if (a == null || b == null) return false;
    var corto = function (s) { return String(s).replace(/ Winchester$/, ' Win'); };
    return corto(a) === corto(b);
  }

```
  y añadir `  window.amxMismoCalibre = amxMismoCalibre;` tras `  window.amxFiltrarCalibres = amxFiltrarCalibres;`.
- [ ] Contrato B1b (Qwen): añadir al final de `scripts/calibres.test.mjs`:

```js
test('9 — amxMismoCalibre iguala «.308 Win» con «.308 Winchester» y nada más', () => {
  assert.equal(window.amxMismoCalibre('.308 Win', '.308 Winchester'), true);
  assert.equal(window.amxMismoCalibre('.243 Winchester', '.243 Win'), true);
  assert.equal(window.amxMismoCalibre('.300 Win Mag', '.300 Win Mag'), true);
  assert.equal(window.amxMismoCalibre('.30-30 Win', '.30-30 Win'), true);
  assert.equal(window.amxMismoCalibre('.308 Win', '.30-06 Sprg'), false);
  assert.equal(window.amxMismoCalibre('.300 Win Mag', '.300 Winchester'), false);
  assert.equal(window.amxMismoCalibre(undefined, undefined), false);
});
```
- [ ] Juez: `node --test scripts/calibres.test.mjs` → `pass 9`, `fail 0`. **Mordida:** cambiar a mano la regex a
  `/ Winchesterx$/` → la prueba 9 falla; restaurar con `git checkout` del bloque y volver a verde.

### Task 2: extraer `VitrinaMuniciones` de la ficha de munición

**Files:** Modify `src/screens/screens-municiones.jsx`
**Produces:** `window.VitrinaMuniciones({ items, rotulo, ancho, onOpenMunicion })` — el que la usa le pone `key`.

- [ ] Juez previo (Opus): guardar el `outerHTML` de `.amx-vitrina` de `/municiones/12-ga-…` (una con más de 12
  hermanas) en el build de develop, antes y después de pulsar «Ver los N».
- [ ] Contrato B2a (Qwen): insertar antes de `function MunicionFicha(`:

```jsx
// ── LA VITRINA DE MUNICIÓN ────────────────────────────────────────────────
// Repisa con etiquetas de cartón: 12 a la vista y el resto tras «Ver los N»
// (Saulo, 26-sep-2026). La usan «Otras municiones» de esta ficha y «Municiones
// de este calibre» de la ficha de calibre (28-sep-2026). Quien la usa le pone
// `key` con su id, para que «Ver los N» se cierre al cambiar de ficha.
function VitrinaMuniciones({ items, rotulo, ancho, onOpenMunicion }) {
  const [todas, setTodas] = useStateMun(false);
  const SELLOS = window.SELLOS_LEGALES || {};
  return (
    <div className="amx-vitrina">
      <window.Repisa rotulo={rotulo} items={todas ? items : items.slice(0, 12)} porFila={ancho ? 6 : 0}
        renderArticulo={(m) => {
          const foto = munFoto(m);
          const s = SELLOS[m.avail] || SELLOS.dcam;
          const uni = munUnidadPrecio(m);
          const precio = m.priceExact ? String(m.priceExact).replace(' MXN', '') : '';
          return (
            <window.RepisaArticulo key={m.id} foto={foto.src} silueta="imagenes/silueta-municion.webp"
              ariaLabel={[m.nombre, s.texto, precio && (precio + ' por ' + uni)].filter(Boolean).join(', ')}
              onClick={() => onOpenMunicion && onOpenMunicion(m.id)}
              etiqueta={<React.Fragment>
                <span className="amx-etiqueta-marca"><span>{m.marca}</span><i className={'es-' + s.tono}>{s.texto}</i></span>
                <span className="amx-etiqueta-nombre">{[m.bala, m.grano].filter(Boolean).join(' · ')}</span>
                {precio && <span className="amx-etiqueta-precio">{precio} <small>/ {uni}</small></span>}
              </React.Fragment>} />
          );
        }} />
      {items.length > 12 &&
        <button type="button" className="amx-registro-mas" aria-expanded={todas}
          onClick={() => setTodas(!todas)}>
          Ver los {items.length}
        </button>}
    </div>
  );
}
window.VitrinaMuniciones = VitrinaMuniciones;

```
- [ ] Contrato B2b (Qwen): en `MunicionFicha`, quitar el estado `todasOtras` (el comentario, el `useStateMun` y
  `setTodasOtras(false)` del efecto, que queda `React.useEffect(() => { setTab(0); }, [municionId]);`) y sustituir el
  `<div className="amx-vitrina">…</div>` entero de «Otras municiones» por:

```jsx
          <window.VitrinaMuniciones key={mun.id} items={relacionados} rotulo={'Munición · ' + mun.calibre}
            ancho={ancho} onOpenMunicion={onOpenMunicion} />
```
- [ ] Juez: `grep -c todasOtras src/screens/screens-municiones.jsx` → 0; `npm run build` sin error; el `outerHTML`
  de la vitrina, igual antes y después, cerrada y abierta. (Cambio consciente: el sello de repuesto es el civil, no
  el de la munición abierta; las 105 municiones tienen `avail` conocido, así que no se ve.)

### Task 3: la nueva `CalibreScreen` y su cableado

**Files:** Modify `src/screens/screens-3.jsx:160-267` · Modify `src/app.jsx:546`

- [ ] Corte (Opus): sustituir desde la cabecera `// FICHA DE UN CALIBRE` hasta `window.CalibreScreen = CalibreScreen;`
  por dos marcadores `// @@CAL-1@@` y `// @@CAL-2@@` (sed por rango, sin tocar nada más).
- [ ] Contrato B3a (Qwen): `@@CAL-1@@` → cabecera, preparación de datos y el folder (hasta `</article>` y su `</div>`).
- [ ] Contrato B3b (Qwen): `@@CAL-2@@` → secciones de debajo, `ReportarError` y cierre. El código completo es este:

```jsx
// ═══════════════════════════════════════════════════════════════════════
// FICHA DE UN CALIBRE — /calibres/<slug>
// El mismo expediente que las fichas de arma, accesorio y munición (DESIGN.md
// §5.12, decidido con Saulo el 28-sep-2026). Sin talón ni tarjeta de almacén:
// un calibre no tiene precio ni existencias propias. Debajo, sus municiones y
// sus armas.
// ═══════════════════════════════════════════════════════════════════════
function CalibreScreen({ calibreId, onOpenArma, onOpenMunicion, onNav }) {
  const vp = window.useViewport();
  // La hoja abierta vuelve a la primera al pasar de un calibre a otro.
  const [tab, setTab] = useState3(0);
  React.useEffect(() => { setTab(0); }, [calibreId]);
  const guia = useMemo3(() => window.amxGuiaCalibres(window.CALIBRES || [], window.DB || []), []);
  const cal = guia.find((c) => c.id === calibreId);
  const rango = useMemo3(() => window.amxRangoCalibres(guia), [guia]);

  // Un solo corte, el del expediente: 1024px (DESIGN.md §5.5).
  const ancho = vp.width >= 1024;
  const PAD = ancho ? 28 : 16;
  const SEC = ancho ? 52 : 34;

  if (!cal) {
    return (
      <div style={{ padding: `20px ${PAD}px 90px`, maxWidth: 720, margin: '0 auto' }}>
        <p style={window.amxProsa({})}>Ese calibre no está en la guía.</p>
        <button type="button" className="amx-calchip" onClick={() => onNav && onNav('calibres')}>Ver los 30 calibres</button>
      </div>
    );
  }

  const armas = armasPorCalibre(cal.id);
  const visibles = armas.slice(0, 6);
  const municiones = (window.MUNICIONES || []).filter((m) => window.amxMismoCalibre(m.calibre, cal.id));
  const sello = (window.SELLOS_LEGALES || {})[cal.avail];
  const conEnergia = typeof cal.energiaJ === 'number' && rango.energia.max > 0;
  // La copia: la foto del cartucho y, al pie, su nombre y su largo (Saulo).
  const copia = { id: cal.id, nombre: cal.id, img: cal.cartucho, marca: cal.mm ? cal.mm + ' mm de largo' : '' };
  const silueta = { forma: 'imagenes/cartuchos/silueta-vertical.webp', nombre: 'cartucho' };
  const filas = [
    ['Velocidad', cal.velocidad],
    ['Energía', cal.energia],
    ['Retroceso', cal.retroceso],
    ['En el catálogo', armas.length === 0 ? 'No se vende en DCAM' : armas.length + (armas.length === 1 ? ' arma' : ' armas')],
  ];

  return (
    <div style={{ paddingBottom: 90 }}>
     <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      <div style={{ padding: `${ancho ? 26 : 14}px ${PAD}px 0` }}>
        <article className="amx-carpeta amx-carpeta--calibre" aria-labelledby="ficha-nombre">
          <span className="amx-carpeta-rotulo">Calibre</span>
          <div className="amx-carpeta-grid">
            <header className="amx-carpeta-cab">
              <div className="amx-carpeta-clase">{cal.clase} · {cal.sistema}</div>
              <h1 id="ficha-nombre" className="t-titulo">{cal.id}</h1>
              <div className="amx-carpeta-uso">{cal.uso}</div>
              {cal.alias && cal.alias.length > 0 &&
                <div className="amx-carpeta-alias">También se le llama {cal.alias.join(', ')}</div>}
              {cal.desc && <p className="amx-carpeta-desc">{cal.desc}</p>}
            </header>

            <div className="amx-carpeta-foto">
              <div className="amx-copia">
                <span className="amx-copia-clip" aria-hidden="true" />
                <window.ArmaPolaroid arma={copia} silueta={silueta} />
                {/* Sin clasificación fijada, sin sello (Saulo, 28-sep-2026). */}
                {sello &&
                  <span className="amx-copia-sello">
                    <window.SelloLegal key={cal.id} avail={cal.avail} etiqueta={cal.legalArt}
                      className="amx-sello--estampa" />
                  </span>}
              </div>
            </div>

            <div className="amx-carpeta-ficha">
              <window.FichaTecnica arma={{ nombre: cal.id }} filas={filas} />
            </div>

            {/* En el móvil el milimétrico va antes que las hojas (Saulo). Las escopetas
                no lo llevan: su energía no se compara con la de una bala. */}
            {conEnergia &&
              <div className="amx-carpeta-historial">
                <div className="amx-milimetrico">
                  <window.ReglaComparativa titulo="Energía frente a los otros 29"
                    valor={cal.energiaJ} min={rango.energia.min} max={rango.energia.max}
                    unidad="J" fuente={cal.fuente} />
                </div>
              </div>}

            <div className="amx-carpeta-legal amx-separadores">
              <window.FichaTabs activo={tab} onCambiar={setTab}>
                {armas.length > 0 &&
                  <window.FichaPanel label="Armas">
                    <window.HojaCompatibilidad key={cal.id} compat={{ caso: 'fichas', armas: armas, texto: '' }}
                      onOpenArma={onOpenArma} rotulo="Lo disparan:" />
                  </window.FichaPanel>}
                <window.FichaPanel label="Legalidad">
                  {sello &&
                    <div className={'amx-oficio-banda amx-oficio-banda--' + sello.tono}>
                      <span>Clasificación: {sello.texto}</span>
                    </div>}
                  <p className="amx-oficio-texto">{cal.legalNota}</p>
                  <p className="amx-oficio-texto amx-carpeta-art">{cal.legalArt}</p>
                  <button type="button" className="amx-oficio-boton" onClick={() => onNav && onNav('legal')}>
                    § Guía legal completa
                  </button>
                </window.FichaPanel>
              </window.FichaTabs>
            </div>
          </div>
        </article>
      </div>

      {municiones.length > 0 &&
        <section style={{ padding: `${SEC}px ${PAD}px 0` }} aria-labelledby="ficha-municiones">
          <window.CintaDymo id="ficha-municiones">Municiones de este calibre</window.CintaDymo>
          <window.VitrinaMuniciones key={cal.id} items={municiones} rotulo={'Munición · ' + cal.id}
            ancho={ancho} onOpenMunicion={onOpenMunicion} />
        </section>}

      {visibles.length > 0 &&
        <section style={{ padding: `${SEC}px ${PAD}px 0` }} aria-labelledby="ficha-armas">
          <window.CintaDymo id="ficha-armas">Armas que lo usan</window.CintaDymo>
          <DragScroll style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {/* ArmaPolaroid no recibe onClick: el clic va en el botón que la envuelve. */}
            {visibles.map((a) => (
              <button key={a.id} type="button" className="amx-calficha-arma"
                onClick={() => onOpenArma && onOpenArma(a.id)} aria-label={a.nombre}>
                <window.ArmaPolaroid arma={a} />
              </button>
            ))}
          </DragScroll>
          {armas.length > visibles.length &&
            <button type="button" className="amx-calchip"
              onClick={() => onNav && onNav('category', { mode: 'calibre', value: cal.id })}>
              Ver las {armas.length} en el Arsenal
            </button>}
        </section>}

      {/* Viene del rediseño de soporte (#242): la corrección apunta a la ficha. */}
      <div style={{ padding: `${SEC}px ${PAD}px 0` }}>
        <window.ReportarError tipo="calibre" titulo={cal.id}
          ruta={'/calibres/' + window.amxSlug(cal.id)} />
      </div>
     </div>
    </div>
  );
}
window.CalibreScreen = CalibreScreen;
```
- [ ] Contrato B3c (Qwen), `src/app.jsx:546`: `<window.CalibreScreen calibreId={calibreId} onOpenArma={openArma} onNav={navigate} />`
  → `<window.CalibreScreen calibreId={calibreId} onOpenArma={openArma} onOpenMunicion={openMunicion} onNav={navigate} />`
- [ ] Juez: la función entera, byte a byte contra este bloque (`comparar.mjs … contiene`); `grep -c ReglaCartucho src/screens/screens-3.jsx` → 0; `npm run build`.

### Task 4: `HojaCompatibilidad` con rótulo y fuera `ReglaCartucho`

**Files:** Modify `src/components/ui.jsx`

- [ ] Contrato B4 (Qwen): firma `function HojaCompatibilidad({ compat, onOpenArma, rotulo = 'Sirve a:' })`, el texto
  `: 'Sirve a:'}` del caso de lista pasa a `: rotulo}`; y se borra el bloque `// REGLA CARTUCHO …` hasta
  `window.ReglaCartucho = ReglaCartucho;` inclusive.
- [ ] Juez: `git grep -c ReglaCartucho -- src` → 0; `grep -c "rotulo = 'Sirve a:'" src/components/ui.jsx` → 1.

### Task 5: CSS

**Files:** Modify `src/styles/estilo.css`

- [ ] Contrato B5a (Qwen): tras el cierre del `@media (min-width: 1024px)` de `.amx-carpeta-grid` (la línea
  `  .amx-v2 .amx-carpeta-historial { grid-area: historial; }` y su `}`), insertar:

```css

/* LA FICHA DE CALIBRE (28-sep-2026, DESIGN.md §5.12): el mismo folder sin talón
   ni tarjeta de almacén. Desde 1024, copia | cabecera y ficha; debajo, hojas |
   milimétrico. Las escopetas no llevan milimétrico y sus hojas se quedan en su
   columna (Saulo). */
@media (min-width: 1024px) {
  .amx-v2 .amx-carpeta--calibre .amx-carpeta-grid {
    grid-template-areas:
      "foto   cab"
      "foto   ficha"
      "legal  historial";
    grid-template-rows: auto 1fr auto;
  }
}
.amx-v2 .amx-carpeta-clase {
  margin-bottom: 6px;
  font-family: var(--mono); font-size: 12.5px; letter-spacing: .16em; text-transform: uppercase;
  color: var(--manila-tinta-2);
}
.amx-v2 .amx-carpeta-uso { margin-top: 6px; font-family: var(--mono); font-size: 13.5px; color: var(--manila-tinta); }
.amx-v2 .amx-carpeta-alias { margin-top: 4px; font-size: 14px; color: var(--manila-tinta-2); }
.amx-v2 .amx-carpeta-art { font-family: var(--mono); font-size: 12.5px; letter-spacing: .06em; color: var(--oficio-tinta-2); }
```
- [ ] Contrato B5b (Qwen): el bloque `/* ── Regla comparativa …` pasa a las tintas del milimétrico, donde vive ahora:
  `--carton-tinta-2` → `--milimetrico-tinta-2`, `--hair` → `--milimetrico-linea`, `--acento` → `--sello-restr`,
  y `.amx-regla-pies b` de `--tinta` a `--manila-tinta` (bloque ANTES/DESPUÉS literal en el contrato).
- [ ] Corte (Opus): borrar los bloques `/* ── Regla cartucho …` (`.amx-reglacart*`) y `.amx-calficha*`, **salvo**
  `.amx-calficha-arma` y su `:focus-visible`, que siguen en uso.
- [ ] Juez: `git grep -c -E 'amx-reglacart|amx-calficha-(cabeza|clase|id|uso|alias|sinsello|specs|nota|legal|armas)\b' -- src` → 0;
  el diff de CSS no añade ningún `#hex` ni `rgba(`; `npm run build`.

### Task 5b: datos — aprobado por Saulo el 28-sep-2026

- [ ] Contrato B7a (Qwen), `src/data/data-municiones.js:549`: `getArmasParaMunicion` compara con
  `window.amxMismoCalibre(a.calibre, mun.calibre)` en vez de `a.calibre === mun.calibre`. Arregla las 9 municiones
  «.308/.243/.270 Win» que enseñaban 0 armas compatibles (tienen 12, 7 y 4).
- [ ] Contratos B7b/B7c (Qwen), `src/data/data-extra.js`: fuera las notas internas del texto público de 5 calibres.
  Las tres sin sello empiezan con «Clasificación pendiente.»; en `.38 Super` «REVISAR:» pasa a «Aun así,»; en
  `.22 WMR` se borra la frase «REVISAR: …». Lo verificado se conserva palabra por palabra.
- [ ] Juez: `node -e` con los datos → la munición 2048 (.308 Win Fiocchi) da 12 armas; ningún `legalNota`/`desc`/`uso`
  de `CALIBRES` contiene `HUECO`, `REVISAR`, `Saulo` ni `no rellenar`; `node scripts/check-calibres.mjs` sin errores nuevos.

### Task 6: verificación y documentación

- [ ] Sonda de las 30 (Opus, script fuera del repo contra `out/` servido en local): por cada slug del sitemap,
  `h1 === id`, `.amx-carpeta--calibre` presente, copia con imagen cargada, sello ⇔ `avail`, milimétrico ⇔ energía,
  hoja Armas ⇔ armas > 0, vitrina ⇔ municiones > 0, cero errores de consola. En 360 y 1440.
- [ ] Contraste de todo texto dentro del folder en claro y oscuro (≥ 4.5:1; el manila de referencia, `--manila-medido`).
- [ ] Capturas para Saulo: `.380 ACP`, `12 GA`, `.357 Magnum`, `.308 Winchester`, en 390 y 1440, claro y oscuro.
- [ ] Contrato B6a (Qwen): DESIGN.md §5.12 antes del `---` que cierra §5.11 (texto en el contrato, sacado de la spec).
- [ ] Contrato B6b (Qwen): README, sección «Guía de calibres»: la frase «Cada calibre tiene su ficha: … con esas armas a
  un toque.» pasa a «Cada calibre tiene su ficha, en el mismo folder que las armas: sistema, uso típico, velocidad y
  energía aproximadas, retroceso, su clasificación legal, las armas del catálogo que lo usan y las municiones de ese
  calibre en el inventario oficial.»
- [ ] `npm test` (solo el fallo de `_redirects`), commit por pathspec, push y PR a `develop`.
