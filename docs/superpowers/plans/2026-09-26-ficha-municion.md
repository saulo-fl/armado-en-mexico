# Ficha de munición — el mismo expediente · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `MunicionFicha` pasa al folder manila de la ficha de accesorio, sin perder datos.

**Architecture:** Las reglas nuevas (requisito legal, compatibilidad, inventario) van en
`src/lib/cotejo.js`, con prueba en `scripts/cotejo.test.mjs`. Las primitivas del expediente ya
existen en `src/components/ui.jsx`. Solo cambian dos: `TalonComprobante` (prop `unidad`) y
`HojaCompatibilidad` (pasa de `screens-accesorios.jsx` a `ui.jsx`). La pantalla se reescribe
copiando la estructura de `AccesorioFicha` (`src/screens/screens-accesorios.jsx`).

**Tech Stack:** React sin bundler (globales `window.*`, Babel a `out/`), `node --test`, Cloudflare Pages.

**Spec:** `docs/superpowers/specs/2026-09-26-ficha-municion-design.md`

## Global Constraints

- Worktree `repo/wt-ficha-municion`, rama `Opus-5/RED-ficha-municion`. **No** trabajar en `repo/github-deploy` (ahí edita Saulo con Copilot).
- `node_modules` es una unión (junction) al de `github-deploy`: se suelta con `cmd /c rmdir`, **nunca** `Remove-Item -Recurse`.
- Commits por pathspec (`git add <archivos>`), nunca `git add -A`. Trailer: `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. Revisar los trailers si los escribe un subagente.
- Dentro de un papel no se usa `PALETTE` ni `CLARO` (DESIGN.md §5.5): solo clases `amx-*` existentes.
- No tocar datos (`src/data/*`), D1, precios, rutas, prerender ni el listado `/municiones`.
- El `.17 HMR` y los cartuchos `avail: 'seguridad'` no llevan requisito.
- Los enlaces a armas van sin `↗` (en el sitio `↗` es «abre un PDF»).
- Textos de producto en español, sin emojis ni «dossier» ni «curaduría».

## Review Focus

1. **Munición sin ninguna arma compatible en el Arsenal** → la hoja dice «Sirve a: armas calibre X (sin ficha en el Arsenal)» y la sección «Armas compatibles» no aparece. Prueba en Task 1 (`amxCompatMunicion` con lista vacía).
2. **Foto de caja que no carga (404)** → la copia muestra la silueta de munición, no la de una pistola. Se verifica en Task 3, paso 6, forzando `img` roto en consola.
3. **Munición cotizada por caja (2046)** → talón «Por caja · con IVA», y en móvil `/ caja`. Task 2 (prueba) y Task 3 (Chrome).
4. **Munición con precio solo en OTCA (2005)** → la tarjeta de almacén no inventa fila DCAM. Prueba en Task 1.
5. **Pasar de una munición a otra desde «Otras municiones»** → la hoja vuelve a Compatibilidad y el scroll sube. Task 3, paso 6.

---

### Task 1: Reglas de munición en `cotejo.js`

**Files:**
- Modify: `src/lib/cotejo.js` (tras `amxCompatAccesorio`, ~línea 118; exports ~línea 284)
- Test: `scripts/cotejo.test.mjs` (al final)

**Interfaces:**
- Produces:
  - `window.amxRequisitoMunicion(mun) → string | null`
  - `window.amxCompatMunicion(mun, armas) → { caso: 'fichas'|'plataforma'|'nada', armas: Arma[], texto: string }` (la misma forma que `amxCompatAccesorio`)
  - `window.amxInventarioMunicion(mun, { priceHistory, manuales, autoridad }) → { precio, manual, sigla, ultimoConocido, sucursales }` (la misma que `amxInventarioAccesorio`)

- [ ] **Step 1: Escribir las pruebas que fallan** — al final de `scripts/cotejo.test.mjs`:

```js
// ── MUNICIÓN (ficha del 26-sep-2026) ─────────────────────────────────────
test('requisito: escopeta pide la hoja de registro', () => {
  const r = amxRequisitoMunicion({ tipo: 'escopeta', calibre: '12 GA', avail: 'dcam' });
  assert.match(r, /hoja de manifestación de registro del arma/);
  assert.match(r, /identificación oficial vigente\.$/);
  assert.doesNotMatch(r, /permiso extraordinario|Volante/);
});
test('requisito: .22 LR pide hoja, Volante y credencial', () => {
  const r = amxRequisitoMunicion({ tipo: 'rifle', calibre: '.22 LR', avail: 'dcam' });
  assert.match(r, /Volante de Adquisición de Cartuchos del mes/);
  assert.match(r, /credencial vigente del club/);
});
test('requisito: fuego central pide permiso extraordinario', () => {
  const r = amxRequisitoMunicion({ tipo: 'pistola', calibre: '.380 ACP', avail: 'dcam' });
  assert.match(r, /permiso extraordinario de adquisición vigente/);
});
test('requisito: .17 HMR y seguridad no llevan requisito', () => {
  assert.equal(amxRequisitoMunicion({ tipo: 'rifle', calibre: '.17 HMR', avail: 'dcam' }), null);
  assert.equal(amxRequisitoMunicion({ tipo: 'rifle', calibre: '7.62x51mm', avail: 'seguridad' }), null);
  assert.equal(amxRequisitoMunicion(null), null);
});
test('compat munición: con fichas, lista; sin fichas, el calibre', () => {
  const armas = [{ id: 1, nombre: 'Glock 25' }];
  assert.deepEqual(amxCompatMunicion({ calibre: '.380 ACP' }, armas),
    { caso: 'fichas', armas, texto: '' });
  assert.deepEqual(amxCompatMunicion({ calibre: '.17 HMR' }, []),
    { caso: 'plataforma', armas: [], texto: 'armas calibre .17 HMR' });
  assert.equal(amxCompatMunicion({}, []).caso, 'nada');
});
test('inventario munición: solo OTCA no inventa fila DCAM (2005)', () => {
  const manuales = [
    { id: 'man_mun_dcam_2026_09_25', fecha: '2026-09-25', autoridad: 'DCAM' },
    { id: 'man_mun_otca_2026_06_18', fecha: '2026-06-18', autoridad: 'OTCA' },
    { id: 'man_otca_2025_09_26', fecha: '2025-09-26', autoridad: 'OTCA' },
  ];
  const priceHistory = [
    { manualId: 'man_otca_2025_09_26', price: '$8.88 MXN', date: '2025-09-26', qty: 17950 },
    { manualId: 'man_mun_otca_2026_06_18', price: '$7.97 MXN', date: '2026-06-18', qty: 19350 },
  ];
  const inv = amxInventarioMunicion(
    { id: 2005, priceExact: '$7.97 MXN', priceManualId: 'man_mun_otca_2026_06_18' },
    { priceHistory, manuales, autoridad: AUTORIDAD });
  assert.equal(inv.precio, '$7.97 MXN');
  assert.equal(inv.sigla, 'OTCA');
  assert.equal(inv.ultimoConocido, false);
  assert.deepEqual(inv.sucursales.map((s) => [s.sigla, s.qty, s.agotado]), [['OTCA', 19350, false]]);
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `node --test scripts/cotejo.test.mjs`
Expected: FAIL con `ReferenceError: amxRequisitoMunicion is not defined`.

- [ ] **Step 3: Implementar** — en `src/lib/cotejo.js`, tras `amxCompatAccesorio`:

```js
  // ── MUNICIÓN — la ficha del 26-sep-2026 ──────────────────────────────────
  // Inventario: la misma regla que el accesorio (las existencias DCAM salen del
  // registro del último inventario DCAM); o = { priceHistory, manuales, autoridad }
  // con getMunicionPriceHistory y MUNICIONES_MANUALES.
  const amxInventarioMunicion = amxInventarioAccesorio;

  // Hoja «Compatibilidad»: las armas del Arsenal con su calibre
  // (getArmasParaMunicion); sin ninguna, el calibre como texto.
  function amxCompatMunicion(mun, armas) {
    const lista = armas || [];
    if (lista.length) return { caso: 'fichas', armas: lista, texto: '' };
    const cal = texto(mun && mun.calibre).trim();
    if (cal) return { caso: 'plataforma', armas: [], texto: 'armas calibre ' + cal };
    return { caso: 'nada', armas: [], texto: '' };
  }

  // Hoja «Legalidad»: SOLO el requisito de este cartucho, de la tabla de la DCAM
  // (Saulo, 26-sep-2026). Sin requisito: los de seguridad (no son de venta
  // civil) y el .17 HMR, anular pero fuera de la tabla, hasta confirmarlo.
  function amxRequisitoMunicion(mun) {
    if (!mun || mun.avail === 'seguridad') return null;
    const cal = texto(mun.calibre).trim();
    if (/^\.17 HMR$/i.test(cal)) return null;
    const id = ' y una identificación oficial vigente.';
    if (mun.tipo === 'escopeta') return 'Para comprarlo, la hoja de manifestación de registro del arma' + id;
    if (/^\.22 (LR|Short)$/i.test(cal)) {
      return 'Para comprarlo, la hoja de manifestación de registro del arma, el Volante de Adquisición de ' +
        'Cartuchos del mes, la credencial vigente del club' + id;
    }
    return 'Para comprarlo, el permiso extraordinario de adquisición vigente' + id;
  }
```

Y en los exports:

```js
  window.amxInventarioMunicion = amxInventarioMunicion;
  window.amxCompatMunicion = amxCompatMunicion;
  window.amxRequisitoMunicion = amxRequisitoMunicion;
```

- [ ] **Step 4: Correr y ver que pasan**

Run: `node --test scripts/cotejo.test.mjs`
Expected: PASS, todas (las viejas y las 6 nuevas).

- [ ] **Step 5: Comprobar que la prueba muerde** — cambiar temporalmente `'seguridad'` por `'segurida'` en `amxRequisitoMunicion`, correr y ver FAIL en «.17 HMR y seguridad»; revertir.

- [ ] **Step 6: Commit**

```bash
git add src/lib/cotejo.js scripts/cotejo.test.mjs
git commit -m "feat(municiones): requisito, compatibilidad e inventario en cotejo"
```

---

### Task 2: Primitivas compartidas — `unidad` en el talón y `HojaCompatibilidad` a `ui.jsx`

**Files:**
- Modify: `src/components/ui.jsx:2556-2594` (`TalonComprobante`)
- Modify: `src/components/ui.jsx` (añadir `HojaCompatibilidad` justo antes de `TalonComprobante`)
- Modify: `src/screens/screens-accesorios.jsx:122-155` (quitar `COMPAT_A_LA_VISTA` y `HojaCompatibilidad`; la llamada de la línea ~246 pasa a `window.HojaCompatibilidad`)
- Test: `scripts/referencias.test.mjs` (existente; caza referencias rotas) y build

**Interfaces:**
- Produces:
  - `<window.TalonComprobante unidad="cartucho"|"caja" …/>`: `unidad` es opcional; sin ella, idéntico a hoy.
  - `<window.HojaCompatibilidad compat={…} onOpenArma={fn} />`: la misma firma que tenía en accesorios.

- [ ] **Step 1: Mover `HojaCompatibilidad`** — cortar las líneas 124-155 de `screens-accesorios.jsx` (comentario, `COMPAT_A_LA_VISTA` y la función) y pegarlas en `ui.jsx` antes de `function TalonComprobante`. Cambiar `useStateAcc` por `React.useState` y añadir debajo `window.HojaCompatibilidad = HojaCompatibilidad;`. Conservar `ACC_SINGULAR` en accesorios. En `AccesorioFicha`, `<HojaCompatibilidad` → `<window.HojaCompatibilidad`.

- [ ] **Step 2: Añadir `unidad` a `TalonComprobante`**

```jsx
function TalonComprobante({ precio, fuente, fecha, enComparacion, onComparar, fijo = false, talonRef, ultimoConocido = false, historial, unidad }) {
```

En la rama `fijo`:

```jsx
            <span className="amx-talon-cifra">{String(precio || '').replace(' MXN', '')}{unidad && <small> / {unidad}</small>}</span>
```

En la cabecera no fija:

```jsx
            <div className="amx-talon-cab"><span>Comprobante de precio</span><span>{unidad ? `Por ${unidad} · con IVA` : 'Con IVA'}</span></div>
```

- [ ] **Step 3: Build y pruebas**

Run: `npm run build && npm test`
Expected: build sin errores; todas las pruebas PASS salvo `rutas.test.mjs`, que falla en Windows por CRLF en `public/_redirects` (falla conocida, también en develop; comprobar que es la misma).

- [ ] **Step 4: El accesorio no cambia** — `npx serve out` (ojo: cambia de puerto en silencio si está ocupado; leer el puerto de la salida) y abrir en Chrome una ficha de accesorio con compatibles (p. ej. `/accesorios` → un cargador). La hoja Compatibilidad y el talón («Con IVA») se ven igual que en armado.mx.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui.jsx src/screens/screens-accesorios.jsx
git commit -m "refactor(ficha): HojaCompatibilidad compartida y unidad en el talón"
```

---

### Task 3: `MunicionFicha` en el folder

**Files:**
- Modify: `src/screens/screens-municiones.jsx:305-609` (reescribir `MunicionFicha` entera)
- Modify: `src/app.jsx:566` (pasar `onNav`, `onReportReview`, `compareIds`)

**Interfaces:**
- Consumes: `amxInventarioMunicion`, `amxCompatMunicion`, `amxRequisitoMunicion` (Task 1); `window.HojaCompatibilidad`, `TalonComprobante unidad` (Task 2); y ya existentes: `useTalonFijo`, `ArmaPolaroid`, `SelloLegal`, `FichaTecnica`, `TarjetaAlmacen`, `FichaTabs`/`FichaPanel`, `HistorialPrecios`, `CintaDymo`, `ArmaCard`, `OpinionBlock`, `amxOpinionLabel`, `amxFmtManualDate`, `ReportarError`, `munUnidadPrecio`, `MunicionCard`.
- Produces: `<window.MunicionFicha municionId onOpenMunicion onOpenArma onNav onReportReview compareIds />`

- [ ] **Step 1: `app.jsx:566`**

```jsx
    content = <window.MunicionFicha municionId={municionId} onOpenMunicion={openMunicion} onOpenArma={openArma} onNav={navigate} onReportReview={openReviewReport} compareIds={compareIds} />;
```

- [ ] **Step 2: Reescribir `MunicionFicha`** — sustituir la función entera (de `function MunicionFicha` hasta `window.MunicionFicha = MunicionFicha;`) por:

```jsx
function MunicionFicha({ municionId, onOpenMunicion, onOpenArma, onNav, onReportReview, compareIds }) {
  const vp = window.useViewport();
  // Las opiniones llegan con la hidratación de /api/state, después del primer render.
  const [, forzar] = useStateMun(0);
  React.useEffect(() => window.Store && window.Store.onChange(() => forzar((x) => x + 1)), []);
  // La hoja abierta vuelve a la primera al pasar de una munición a otra.
  const [tab, setTab] = useStateMun(0);
  React.useEffect(() => { setTab(0); }, [municionId]);
  const talon = window.useTalonFijo(municionId);
  const mun = window.getMunicionById(municionId);

  if (!mun) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', color: window.PALETTE.textMuted }}>
        Munición no encontrada.
      </div>
    );
  }

  // Un solo corte, el del expediente: 1024px (DESIGN.md §5.5).
  const ancho = vp.width >= 1024;
  const PAD = ancho ? 28 : 16;
  const SEC = ancho ? 52 : 34;

  const priceHistory = window.getMunicionPriceHistory(mun.id);
  const manualById = (id) => window.getMunicionManual(id);
  const inv = window.amxInventarioMunicion(mun, {
    priceHistory, manuales: window.MUNICIONES_MANUALES || [], autoridad: window.manualAutoridad,
  });
  const fechaPrecio = inv.manual ? window.amxFmtManualDate(inv.manual.fecha) : '';
  const unidad = munUnidadPrecio(mun);
  const armas = window.getArmasParaMunicion(mun);
  const compat = window.amxCompatMunicion(mun, armas);
  const requisito = window.amxRequisitoMunicion(mun);
  const relacionados = (window.MUNICIONES || []).filter((m) => m.calibre === mun.calibre && m.id !== mun.id);
  const opin = window.Store ? window.Store.getOpiniones('municion', mun.id) : { up: 0, down: 0 };
  const etOpin = window.amxOpinionLabel(opin.up, opin.down);
  const disp = window.MUNICION_CATEGORIES.disponibilidad.find((d) => d.id === mun.avail);
  const SELLOS = window.SELLOS_LEGALES || {};
  const sello = SELLOS[mun.avail] || SELLOS.dcam || { texto: 'CIVIL', tono: 'civil' };
  const specs = mun.specs || [];
  const filas = mun.pais && !specs.some(([k]) => k === 'Origen') ? specs.concat([['Origen', mun.pais]]) : specs;
  // Si la caja no carga, la silueta de munición, nunca la de un arma.
  const silueta = { forma: 'imagenes/silueta-municion.webp', nombre: 'munición' };

  return (
    <div style={{ paddingBottom: 90 }}>
     <div ref={talon.fichaRef} style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>

      {/* ── EL EXPEDIENTE — el folder manila abierto ───────────────────── */}
      <div style={{ padding: `${ancho ? 26 : 14}px ${PAD}px 0` }}>
        <article className="amx-carpeta amx-carpeta--municion" aria-labelledby="ficha-nombre">
          <span className="amx-carpeta-rotulo">Munición</span>
          <div className="amx-carpeta-grid">
            <header className="amx-carpeta-cab">
              <h1 id="ficha-nombre" className="t-titulo">{mun.nombre}</h1>
              {mun.descripcion && <p className="amx-carpeta-desc">{mun.descripcion}</p>}
            </header>

            <div className="amx-carpeta-foto">
              <div className="amx-copia">
                <span className="amx-copia-clip" aria-hidden="true" />
                <window.ArmaPolaroid arma={mun} pie="procedencia" silueta={silueta} />
                <span className="amx-copia-sello">
                  <window.SelloLegal key={mun.id} avail={mun.avail} etiqueta={disp ? disp.label : ''}
                    className="amx-sello--estampa" />
                </span>
              </div>
            </div>

            <div className="amx-carpeta-ficha">
              <window.FichaTecnica arma={mun} filas={filas} />
            </div>

            <div className="amx-carpeta-talon">
              <window.TalonComprobante talonRef={talon.talonRef} unidad={unidad}
                precio={inv.precio} fuente={inv.sigla} fecha={fechaPrecio}
                ultimoConocido={inv.ultimoConocido} historial={priceHistory} />
              {etOpin.hay &&
                <p className="amx-copia-opinion">Opiniones: <b>{etOpin.label}</b></p>}
            </div>

            <div className="amx-carpeta-almacen">
              <window.TarjetaAlmacen filas={inv.sucursales} referencia={mun.dcamRef}
                sigla={inv.sigla} nivelPrecio={mun.priceLvl} movil={!ancho} />
            </div>

            <div className="amx-carpeta-legal amx-separadores">
              <window.FichaTabs activo={tab} onCambiar={setTab}>
                {compat.caso !== 'nada' &&
                  <window.FichaPanel label="Compatibilidad">
                    <window.HojaCompatibilidad key={mun.id} compat={compat} onOpenArma={onOpenArma} />
                  </window.FichaPanel>}
                <window.FichaPanel label="Legalidad">
                  <div className={'amx-oficio-banda amx-oficio-banda--' + sello.tono}>
                    <span>Clasificación: {sello.texto}</span>
                    {disp && <small>{disp.label}</small>}
                  </div>
                  {disp && <p className="amx-oficio-texto">{disp.desc}</p>}
                  {requisito && <p className="amx-oficio-texto">{requisito}</p>}
                  <button type="button" className="amx-oficio-boton" onClick={() => onNav && onNav('legal')}>
                    § Guía legal completa
                  </button>
                </window.FichaPanel>
              </window.FichaTabs>
            </div>

            {priceHistory.length > 0 &&
              <div className="amx-carpeta-historial">
                <window.HistorialPrecios historial={priceHistory} manualById={manualById} movil={!ancho} />
              </div>}
          </div>
        </article>
      </div>

      {/* ── ARMAS COMPATIBLES — todas, en expediente y sin ⇄ ─────────────── */}
      {armas.length > 0 &&
        <section style={{ padding: `${SEC}px ${PAD}px 0` }} aria-labelledby="ficha-compatibles">
          <window.CintaDymo id="ficha-compatibles">Armas compatibles</window.CintaDymo>
          <div className="amx-hscroll amx-similares" style={{
            display: ancho ? 'grid' : 'flex',
            gridTemplateColumns: ancho ? 'repeat(4, 1fr)' : undefined,
            gap: ancho ? 14 : 10,
            overflowX: ancho ? 'visible' : 'auto',
            margin: ancho ? 0 : `0 -${PAD}px`,
            padding: ancho ? 0 : `0 ${PAD}px 4px`
          }}>
            {armas.map((a) =>
              <div key={a.id} style={{ width: ancho ? 'auto' : 300, flexShrink: 0 }}>
                <window.ArmaCard arma={a} onClick={() => onOpenArma && onOpenArma(a.id)} />
              </div>)}
          </div>
        </section>}

      {/* ── OTRAS MUNICIONES — el mismo calibre ─────────────────────────── */}
      {relacionados.length > 0 &&
        <section style={{ padding: `${SEC}px ${PAD}px 0` }} aria-labelledby="ficha-otras">
          <window.CintaDymo id="ficha-otras">Otras municiones</window.CintaDymo>
          <div className="amx-hscroll amx-similares" style={{
            display: ancho ? 'grid' : 'flex',
            gridTemplateColumns: ancho ? 'repeat(4, 1fr)' : undefined,
            gap: ancho ? 14 : 10,
            overflowX: ancho ? 'visible' : 'auto',
            margin: ancho ? 0 : `0 -${PAD}px`,
            padding: ancho ? 0 : `0 ${PAD}px 4px`
          }}>
            {relacionados.map((m) =>
              <div key={m.id} style={{ width: ancho ? 'auto' : 300, flexShrink: 0 }}>
                <MunicionCard mun={m} onClick={() => onOpenMunicion(m.id)} />
              </div>)}
          </div>
        </section>}

      {/* ── LA TARJETA DE COMENTARIOS ─────────────────────────────────── */}
      <section style={{ padding: `${SEC}px ${PAD}px 0` }} aria-labelledby="ficha-opiniones">
        <window.CintaDymo id="ficha-opiniones">Opiniones</window.CintaDymo>
        <div className="amx-comentarios-marco">
          <window.OpinionBlock tipo="municion" entidadId={mun.id} entidadNombre={mun.nombre}
            nombreTipo="munición" onNav={onNav} onReportReview={onReportReview} />
        </div>
      </section>
     </div>

      {/* Talón fijo (móvil), sin casilla; cede el hueco a la barra de comparación. */}
      {!ancho && talon.mostrar && (compareIds || []).length === 0 &&
        <window.TalonComprobante fijo unidad={unidad}
          precio={inv.precio} fuente={inv.sigla} fecha={fechaPrecio}
          ultimoConocido={inv.ultimoConocido} historial={priceHistory} />}
      <window.ReportarError tipo="municion" titulo={mun.nombre} ruta={'/municiones/' + (window.amxSlugIndex().slugPorM[mun.id] || '')} />
    </div>
  );
}
window.MunicionFicha = MunicionFicha;
```

Nota: la ficha vieja mostraba «Otras municiones» limitado a 6; el spec dice todas las del calibre (12 GA tiene 50: en escritorio son 13 filas). **Si al verlo en Chrome 12 GA se hace eterno, limitar a 8 con `.slice(0, 8)` y avisar a Saulo** — no decidirlo en silencio.

- [ ] **Step 3: Limpiar lo que quedó sin uso** — `grep -n "munFmtDate\|TacticalCorners\|imgError" src/screens/screens-municiones.jsx`. Borrar `munFmtDate` solo si ya nadie lo usa en ningún archivo (`grep -rn munFmtDate src`).

- [ ] **Step 4: Build y pruebas**

Run: `npm run build && npm test`
Expected: igual que en Task 2 (solo `rutas.test.mjs` por CRLF). `referencias.test.mjs` PASS: ninguna referencia a un componente inexistente (el prerender no ejecuta componentes; una referencia rota deja la pantalla en blanco en producción).

- [ ] **Step 5: Auditorías**

Run: `node .claude/skills/conciliar-inventario/scripts/auditar.js && node .claude/skills/fidelidad-diseno/scripts/contraste.mjs`
Expected: sin errores nuevos respecto a develop.

- [ ] **Step 6: Chrome** — `npx serve out` y abrir (leer el puerto de la salida) con el navegador del MCP (`isolatedContext` propio):
  - `/municiones/<slug de 2005>` a 1440 y 390 px, tema claro y oscuro: folder con pestaña «Munición», foto de la caja con sello CIVIL, talón «Por cartucho · con IVA» $7.97, almacén solo OTCA 19,350, hoja Compatibilidad abierta con armas .380, Legalidad con «permiso extraordinario», historial con 2 registros y PDF.
  - La 2046: «Por caja · con IVA»; a 390 px, bajar hasta que el talón salga de pantalla: la barra fija dice `/ caja`.
  - La 2001 (seguridad): sello rojo, Legalidad sin requisito.
  - Un .17 HMR: Legalidad sin requisito.
  - En consola: `document.querySelector('.amx-polaroid img').src='x.webp'` → sale la silueta de munición.
  - Desde «Otras municiones», abrir otra: la hoja vuelve a Compatibilidad.
  - Sin scroll horizontal ajeno a los carruseles a 360 y 390 px.
  Guardar capturas en el scratchpad.

- [ ] **Step 7: Commit**

```bash
git add src/screens/screens-municiones.jsx src/app.jsx
git commit -m "feat(municiones): la ficha de munición en el folder del expediente"
```

---

### Task 4: DESIGN.md y PR a develop

**Files:**
- Modify: `docs/DESIGN.md` (nueva §5.11 tras §5.10, antes de «## 6. Prohibiciones»)
- Add: `docs/superpowers/specs/2026-09-26-ficha-municion-design.md` y este plan

- [ ] **Step 1: Escribir §5.11**

```markdown
### 5.11 La ficha de munición — el mismo expediente (26-sep-2026)

Decidido con Saulo (rama `Opus-5/RED-ficha-municion`). Reglas en `src/lib/cotejo.js`
(`amxInventarioMunicion`, `amxCompatMunicion`, `amxRequisitoMunicion`), con prueba; pantalla en
`MunicionFicha` (`screens-municiones.jsx`); primitivas de §5.5.

- **Réplica de la ficha de accesorio (§5.8)**, pestaña «Munición». Título: el nombre; debajo, la
  descripción. La copia es la foto de la caja; si no carga, la silueta de munición.
- **El talón dice la unidad:** «Por cartucho · con IVA», o «Por caja» (2046); en móvil, `/ cartucho`.
- **Legalidad: solo el requisito de este cartucho** de la tabla de la DCAM (escopeta, anular .22,
  fuego central). Sin requisito: los de seguridad y el .17 HMR, hasta confirmarlo con la DCAM.
- **Debajo del folder:** Armas compatibles (todas, sin ⇄), Otras municiones del calibre y Opiniones.
```

- [ ] **Step 2: Commit**

```bash
git add docs/DESIGN.md docs/superpowers/specs/2026-09-26-ficha-municion-design.md docs/superpowers/plans/2026-09-26-ficha-municion.md
git commit -m "docs(design): la ficha de munición, §5.11"
```

- [ ] **Step 3: Revisar trailers y empujar** — `git log origin/develop..HEAD --format='%h %an %(trailers:key=Co-Authored-By)'`; todos con el trailer de Opus 5.5. Luego `git push -u origin Opus-5/RED-ficha-municion`.

- [ ] **Step 4: PR a develop** (no a main; main necesita el OK de Saulo)

```bash
gh pr create --base develop --title "Ficha de munición en el folder del expediente" --body-file <archivo con resumen, criterios medidos y capturas>
```

El cuerpo termina con `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
