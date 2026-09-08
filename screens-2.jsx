// Armado en México — Pantallas de Producto, Comparador, Legal, FAQ, Acerca

const { useState: useState2, useMemo: useMemo2 } = React;

// Formatea la fecha de un inventario DCAM (YYYY-MM-DD) a texto legible es-MX
function amxFmtManualDate(f) {
  if (!f) return '';
  const d = new Date(String(f).length === 10 ? f + 'T12:00:00' : f);
  if (isNaN(d)) return String(f);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ════════════════════════════════════════════════════════════════
// PRODUCT — Ficha completa de un arma
// ════════════════════════════════════════════════════════════════
// Sección de la ficha. Vive FUERA de ProductScreen a propósito: definida
// dentro, React la trataría como un componente nuevo en cada render y
// remontaría el subárbol — lo que cerraría los <details> abiertos.
// ──────────────────────────────────────────────────────────────
// TABS de la ficha (DESIGN.md §11) — variante B de la comparación.
// Envuelve los paneles sin reescribir su contenido: cada hijo <Panel label="X">
// aporta su rótulo y el resto va igual que en la variante de desplegables.
// Vive fuera de ProductScreen a propósito: un componente definido dentro de
// otro remonta su subárbol en cada render (la trampa que ya documenta
// fidelidad-diseno con ProdSection).
// ──────────────────────────────────────────────────────────────
function Panel({ children }) { return <React.Fragment>{children}</React.Fragment>; }

function FichaTabs({ children }) {
  const paneles = React.Children.toArray(children).filter(Boolean);
  const [act, setAct] = React.useState(0);
  const refs = React.useRef([]);
  if (!paneles.length) return null;
  const activo = Math.min(act, paneles.length - 1);

  // Flechas entre pestañas: lo que espera un lector de pantalla en un tablist.
  function onKey(e) {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (activo + d + paneles.length) % paneles.length;
    setAct(n);
    if (refs.current[n]) refs.current[n].focus();
  }

  return (
    <div>
      <div className="tabs-bar" role="tablist" onKeyDown={onKey}>
        {paneles.map((p, i) => (
          <button
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            role="tab"
            id={'tab-' + i}
            aria-selected={i === activo}
            aria-controls={'panel-' + i}
            tabIndex={i === activo ? 0 : -1}
            className={'tab' + (i === activo ? ' is-act' : '')}
            onClick={() => setAct(i)}>
            {p.props.label}
          </button>
        ))}
      </div>
      <div className="tab-panel" role="tabpanel" id={'panel-' + activo} aria-labelledby={'tab-' + activo}>
        {paneles[activo]}
      </div>
    </div>
  );
}

function ProdSection({ pad, gap, band, children }) {
  return (
    <section style={{
      padding: `${gap}px ${pad}px ${band ? gap : 0}px`,
      background: band ? PALETTE.bgElev : 'transparent'
    }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {children}
      </div>
    </section>
  );
}

function ProductScreen({ armaId, onOpenArma, onOpenAccesorio, onOpenMunicion, onNav, compareIds, toggleCompare }) {
  const vp = window.useViewport();
  // Las opiniones llegan en la hidratacion desde /api/state, DESPUES del primer
  // render. Sin esta suscripcion la etiqueta de arriba se quedaba vacia hasta
  // que el usuario navegaba a otra pantalla y volvia.
  const [, forceProd] = useState2(0);
  useEffect(() => window.Store && window.Store.onChange(() => forceProd((x) => x + 1)), []);
  const arma = window.findArma(armaId);
  const [showSuggest, setShowSuggest] = useState2(false);

  // track de visita una vez por mount
  useEffect(() => {
    if (arma && window.Store) window.Store.trackVisit(arma.id);
  }, [arma?.id]);

  if (!arma) return <div style={{ padding: 40, color: PALETTE.text }}>Arma no encontrada</div>;

  const availMeta = window.CATEGORIES.disponibilidad.find((d) => d.id === arma.avail);
  const inCmp = compareIds.includes(arma.id);
  const containerMax = { maxWidth: 1200, margin: '0 auto', width: '100%' };
  const PAD = vp.isDesktop ? 28 : 16;
  const SEC = vp.isDesktop ? 52 : 34;   // aire ENTRE secciones (dentro se usa 12-22)
  const ORANGE = window.GUN_ACCENT || PALETTE.amber;
  const NUM = { fontVariantNumeric: 'tabular-nums' };

  const priceHistory = window.Store ? window.Store.getPriceHistory(arma.id) : [];
  const manuales = window.Store ? window.Store.getManuales() : [];
  const manualById = (id) => (id ? manuales.find((m) => m.id === id) : null) || null;
  // Inventario fuente del precio actual: el ligado al arma, el del registro más
  // reciente, o el inventario principal del repo (fuente general de precios)
  const currentManual = manualById(arma.priceManualId) ||
    (priceHistory.length ? manualById(priceHistory[priceHistory.length - 1].manualId) : null) ||
    (window.Store ? window.Store.getPrimaryManual() : null);
  const curAut = window.manualAutoridad ? window.manualAutoridad(currentManual) : null;
  const curSigla = curAut ? curAut.sigla : 'DCAM';
  const precioActual = priceHistory.length ? priceHistory[priceHistory.length - 1].price : arma.priceExact;

  // Existencias POR SUCURSAL (no hay primaria/secundaria): DCAM y OTCA se
  // muestran por separado, cada una con su inventario fuente. Regla: SOLO
  // cuenta el ÚLTIMO inventario de cada sucursal. Si el arma no aparece en él,
  // se asume AGOTADA en esa sede.
  const autOf = (m) => (m && (m.autoridad || (window.manualAutoridad ? window.manualAutoridad(m).sigla : 'DCAM'))) || 'DCAM';
  const latestByBranch = (sigla) => manuales.find((m) => autOf(m) === sigla) || null; // manuales: más reciente primero
  const everIn = (sigla) => priceHistory.some((h) => autOf(manualById(h.manualId)) === sigla);
  const branches = [];
  const dcamQty = window.getArmaExistencias ? window.getArmaExistencias(arma.id) : null;
  const latestDcam = latestByBranch('DCAM');
  if (dcamQty != null) {
    branches.push({ sigla: 'DCAM', qty: dcamQty, manual: latestDcam, agotado: false });
  } else if (everIn('DCAM') && latestDcam) {
    branches.push({ sigla: 'DCAM', qty: null, manual: latestDcam, agotado: true });
  }
  const latestOtca = latestByBranch('OTCA');
  if (latestOtca) {
    const rec = priceHistory.find((h) => h.manualId === latestOtca.id);
    if (rec && rec.qty != null) {
      branches.push({ sigla: 'OTCA', qty: rec.qty, manual: latestOtca, agotado: false });
    } else if (everIn('OTCA')) {
      branches.push({ sigla: 'OTCA', qty: null, manual: latestOtca, agotado: true });
    }
  }

  // La gráfica necesita DOS fechas distintas: DCAM y OTCA publican el mismo
  // día y sus registros se funden en un solo punto.
  const fechasHist = [];
  priceHistory.forEach((h) => { if (fechasHist.indexOf(h.date) < 0) fechasHist.push(h.date); });
  const hayGrafica = fechasHist.length >= 2;
  const pIni = priceHistory.length ? window.amxPrecioNum(priceHistory[0].price) : null;
  const pFin = window.amxPrecioNum(precioActual);
  const deltaPct = (hayGrafica && pIni && pFin != null) ? ((pFin - pIni) / pIni) * 100 : null;

  const related = window.DB.filter((a) => a.tipo === arma.tipo && a.id !== arma.id).slice(0, 4);
  const compat = window.getAccesoriosCompatibles ? window.getAccesoriosCompatibles(arma) : [];
  const muns = window.getMunicionesParaArma ? window.getMunicionesParaArma(arma) : [];
  const opin = window.Store ? window.Store.getOpiniones('arma', arma.id) : { up: 0, down: 0, total: 0, lista: [] };
  const etOpin = window.amxOpinionLabel(opin.up, opin.down);

  // `statsKeys` vivía aquí para la valoración divulgativa, retirada el
  // 7-sep-2026. El comparador no lo usaba: lleva su propia lista inline.
  // El rótulo del tipo para la pestaña del folder. En singular y acentuado:
  // `CATEGORIES.tipo` guarda los rótulos en plural y despluralizar «Rifles» y
  // «Revólveres» con la misma regla no sale (uno pierde la «s», el otro «es»).
  const TIPO_SINGULAR = {
    pistola: 'Pistola', revolver: 'Revólver', rifle: 'Rifle',
    escopeta: 'Escopeta', carabina: 'Carabina' };
  const tipoRotulo = TIPO_SINGULAR[arma.tipo] || arma.tipo || 'Expediente';

  const btnComparar = (
    <span className="amx-cut" style={{ display: vp.isDesktop ? 'inline-block' : 'block' }}>
      <button onClick={() => toggleCompare(arma.id)} style={{
        width: '100%',
        background: inCmp ? PALETTE.amber : 'transparent',
        // Cuando está añadida el relleno es el verde de marca, y aquí ponía
        // negro encima: 1.69:1. La tinta la decide el fondo (ui.jsx).
        color: inCmp ? window.amxTintaSobre(PALETTE.amber) : PALETTE.amber,
        border: `1.5px solid ${PALETTE.amber}`,
        clipPath: CUT_TR,
        padding: '12px 22px', minHeight: 48,
        fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 14,
        letterSpacing: '0.15em', textTransform: 'uppercase',
        cursor: 'pointer'
      }}>{inCmp ? '✓ AÑADIDA' : '⇄ Comparar'}</button>
    </span>
  );

  return (
    <div style={{ paddingBottom: 90 }}>
     <div style={containerMax}>

      {/* ── 1 · EL EXPEDIENTE — el elemento firma (DESIGN.md §4.3) ───────
          «La pagina de arma de cada elemento debe ser preciosa, con un diseño
           tipo analógico que de la sensación de estar leyendo desde un folder.
           En escritorio aprovecharemos el ancho de la pagina para tener un
           folder extendido con la foto del arma del lado izquierdo con un marco
           de polaroid y su precio de referencia y del lado derecho la ficha
           tecnica del arma.»

          Sustituye a TRES bloques apilados: la identidad, el hero apaisado de
          380px y los cuatro «datos clave». Los tres decían lo mismo tres veces
          —calibre, capacidad, longitud y peso salían en el bloque de datos y
          otra vez en la pestaña de Especificaciones— y en escritorio dejaban
          1200px de ancho sin usar, que es justo lo que §4.3 quiere aprovechar.

          El reparto en columnas lo hace estilo.css con una @media a 1024px, no
          `vp.isDesktop`: aquí solo vive lo que depende del dato. */}
      <div style={{ padding: `${vp.isDesktop ? 26 : 18}px ${PAD}px 0` }}>

        {/* Aquí iba un folio `AR-####` derivado del id. Saulo lo descartó el
            7-sep-2026: un código de expediente que no corresponde a ningún
            registro real es decoración que finge ser dato. La pestaña con el
            tipo sí dice algo verdadero, y se queda. */}
        <div className="amx-folder-cabecera">
          <span className="amx-folder-pestana">{tipoRotulo}</span>
          <span className="amx-folder-rayado" aria-hidden="true" />
        </div>

        <div className="amx-folder">
          <div className="amx-folder-grid">

            <div className="amx-folder-cab">
              <div className="t-dato" style={{
                display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                fontSize: 12.5, letterSpacing: '0.16em', textTransform: 'uppercase',
                marginBottom: 8
              }}>
                <CountryFlag pais={arma.pais} height={12} />
                <span>{arma.marca} · {arma.pais} · {arma.anio}</span>
              </div>

              <h1 className="t-titulo" style={{
                fontSize: vp.isDesktop ? 36 : 27,
                margin: '0 0 10px'
              }}>{arma.nombre}</h1>

              <hr className="tricolor" style={{ width: 84, marginBottom: 12 }} />

              <div style={window.amxProsa({ fontSize: 16.5, margin: 0 })}>{arma.mecanismo}</div>
            </div>

            <div className="amx-folder-izq">
              <window.ArmaPolaroid arma={arma} />
              {/* El precio bajo la foto, con su procedencia a la vista (§14 y
                  §6b: todo dato con fuente). Los tres valores ya existían en
                  esta pantalla — no se inventa ninguno. */}
              <div className="amx-precio-ref">
                <div className="amx-precio-ref-cifra">{precioActual}</div>
                <div className="amx-precio-ref-fuente">
                  <div>Referencia · {curSigla}</div>
                  {currentManual && <div>al {amxFmtManualDate(currentManual.fecha)}</div>}
                </div>
              </div>
            </div>

            <div className="amx-folder-der">
              <window.FichaTecnica arma={arma} />

              {/* la pregunta que trae al visitante, resuelta antes del pliegue */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                marginTop: 20
              }}>
                <AvailBadge avail={arma.avail} />
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 14,
                  color: availMeta?.color || PALETTE.textDim, letterSpacing: '0.04em'
                }}>{arma.legalTit}</span>
              </div>

              <div style={{ marginTop: 14 }}>{btnComparar}</div>
            </div>

          </div>
        </div>
      </div>

      {/* ── VALORACIÓN DIVULGATIVA — RETIRADA (7-sep-2026) ───────────────
          Aquí iban seis barras —precisión, daño, alcance, movilidad, capacidad
          y control de retroceso— con su aviso de «estimación por familia».

          Saulo la retiró: los números no salían de mediciones ni de votos
          verificables, sino de una derivación por tipo y calibre, así que todas
          las armas de una misma familia mostraban exactamente lo mismo. Una
          barra de 0 a 100 promete una precisión que el dato no tiene, y en un
          sitio cuyo valor es la trazabilidad —cada precio con su inventario y
          su fecha, cada afirmación legal con su texto de ley— una cifra sin
          respaldo cuesta más credibilidad de la que aporta.

          `arma.stats` NO se ha tocado: sigue en `data.js` y lo sigue usando el
          comparador (línea ~1300). Si vuelve, que vuelva con una fuente real.
          `window.StatsBar` se queda en ui.jsx: el comparador la necesita. */}

      {/* ── PRECIO DE REFERENCIA + HISTORIAL ───────────────────────────── */}
      <ProdSection pad={PAD} gap={SEC}>
        <SectionHeader>Precio de referencia</SectionHeader>
        {/* Lo que opina la comunidad, en una línea: la pregunta "¿vale la pena?"
            se responde junto al precio, no al final de la página. */}
        {etOpin.hay &&
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: PALETTE.textMuted, marginTop: -6, marginBottom: 9
          }}>
            Opiniones: <span style={{ color: etOpin.color, fontWeight: 700 }}>{etOpin.label}</span>
          </div>}
        {/* Este panel se quedó en el tema oscuro cuando la app pasó a clara: el
            fondo seguía siendo casi negro y, como PALETTE.amber dejó de ser ámbar
            para ser el verde de marca #173A32, el precio —30px, el dato que trae
            al visitante— daba 1.24:1 sobre él, y sus rótulos 2.40:1. Una caja
            negra ilegible en mitad de una página clara.
            El texto ya estaba calibrado para superficie clara (amber 11.81:1 y
            textMuted 6.13:1 sobre CLARO.panel): lo único que hacía falta era el
            fondo. Superficie + sombra en vez de borde de 1px, que es lo que piden
            DESIGN.md §5.1b y §6, con el mismo patrón que ya usa la línea 267. */}
        <div style={{
          background: CLARO.panel,
          borderRadius: CLARO.radio,
          border: `1px solid ${CLARO.hair}`,
          boxShadow: CLARO.sombra,
          padding: vp.isDesktop ? '16px 18px' : '14px',
          position: 'relative'
        }}>
          <TacticalCorners size={12} color={PALETTE.amber} thickness={2} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 13,
              color: PALETTE.textMuted, letterSpacing: '0.18em', textTransform: 'uppercase'
            }}>◆ Precio actual · con IVA</span>
            {curAut &&
              <span title={curAut.nombre} style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700,
                letterSpacing: '0.12em', color: '#000', background: curAut.color,
                padding: '2px 7px', flexShrink: 0
              }}>{curAut.sigla}</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'Archivo, sans-serif', fontWeight: 700,
              fontSize: vp.isDesktop ? 30 : 25, color: PALETTE.amber,
              letterSpacing: '0.01em', ...NUM
            }}>{precioActual}</span>
            {currentManual &&
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 13,
                color: PALETTE.textMuted, letterSpacing: '0.06em'
              }}>{amxFmtManualDate(currentManual.fecha)}</span>}
          </div>

          {/* existencias: un chip por sucursal, sin prosa */}
          {branches.length > 0 &&
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
              {branches.map((b, bi) => {
                const col = b.agotado ? PALETTE.redHi : PALETTE.green;
                return (
                  <span key={b.sigla + bi}
                    title={b.manual ? b.manual.nombre : ''}
                    style={{
                      // El chip vivía sobre el fondo casi negro del panel; ahora que
                      // el panel es claro, ningún relleno claro lo separa (crema
                      // 1.09:1, zebra 1.12:1). Lo que lo define es el borde de color
                      // semántico, y en sólido en vez del `55` de antes: verde
                      // 5.44:1 y rojo 5.80:1 sobre la zebra. Aquí el borde SÍ porta
                      // información (hay existencias / está agotado), así que no es
                      // el «borde como recurso principal» que prohíbe §6.
                      display: 'inline-flex', alignItems: 'baseline', gap: 7,
                      background: CLARO.zebra, border: `1px solid ${col}`,
                      clipPath: window.CUT_TR_SM,
                      padding: '7px 12px'
                    }}>
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, fontWeight: 700,
                      color: PALETTE.textDim, letterSpacing: '0.14em'
                    }}>{b.sigla}</span>
                    {b.agotado
                      ? <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13.5, color: col, letterSpacing: '0.08em' }}>AGOTADO</span>
                      : <span style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 16, color: col, ...NUM }}>{Number(b.qty).toLocaleString('es-MX')}</span>}
                  </span>);
              })}
            </div>}

        </div>

        {/* La atribución y el PDF viven aquí, como pie de nota: siguen en el
            sitio y dejan de competir con el precio. `compact` los pinta
            pequeños, sin fondo ni barrita de acento. */}
        <div style={{ marginTop: 10 }}>
          <window.Disclosure title="Detalle de la fuente" compact>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13.5, color: PALETTE.textDim, lineHeight: 1.6 }}>
              <div style={{ marginBottom: 10 }}>
                <span style={{ color: PALETTE.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: 12 }}>Ref. {curSigla}</span>
                <div style={{ color: PALETTE.text }}>{arma.dcamRef}</div>
              </div>
              {branches.map((b, bi) => (
                <div key={b.sigla + bi} style={{ marginBottom: 8 }}>
                  {b.agotado ? 'No aparece en el último inventario de ' : `${Number(b.qty).toLocaleString('es-MX')} en `}
                  <b style={{ color: PALETTE.text, letterSpacing: '0.08em' }}>{b.sigla}</b>
                  {' — '}
                  {b.manual && b.manual.url
                    ? <a href={b.manual.url} target="_blank" rel="noopener" style={{ color: PALETTE.amber, textDecoration: 'none', borderBottom: `1px solid ${PALETTE.amber}` }}>▦ {b.manual.nombre} ↗</a>
                    : <span style={{ color: PALETTE.textMuted }}>{b.manual ? b.manual.nombre : 'inventario oficial ' + b.sigla}</span>}
                  {b.manual ? ` (${amxFmtManualDate(b.manual.fecha)}).` : '.'}
                </div>
              ))}
              {branches.length === 0 &&
                <div style={{ marginBottom: 8 }}>Existencias pendientes de conciliar con el inventario oficial.</div>}
              {!currentManual &&
                <div style={{ marginBottom: 8 }}>Sin PDF de inventario vinculado.</div>}
              <div style={{ fontSize: 12.5, color: PALETTE.textMuted, marginTop: 10 }}>
                ⚠ Dato <b style={{ color: PALETTE.textDim }}>histórico</b> por sucursal, no en tiempo
                real: la disponibilidad actual puede variar.
              </div>
              <div style={{ marginTop: 8 }}>
                Nivel de precio: <window.PriceLevel lvl={arma.priceLvl} size={13} />
              </div>
              {currentManual && currentManual.url &&
                <a href={currentManual.url} target="_blank" rel="noopener" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 12,
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 13.5,
                  color: PALETTE.amber, textDecoration: 'none',
                  border: `1px solid ${PALETTE.amber}`,
                  padding: '10px 13px', minHeight: 44, boxSizing: 'border-box', letterSpacing: '0.04em'
                }}>
                  <span aria-hidden="true">▦</span>
                  Inventario fuente (PDF)
                  <span aria-hidden="true">↗</span>
                </a>}
            </div>
          </window.Disclosure>
        </div>

        {/* HISTORIAL — con UN solo registro no hay historia que contar: el precio
            y su PDF ya están arriba, y la sección quedaba hueca (le pasa a la
            mayoría de las armas). La gráfica pide además dos fechas distintas. */}
        {priceHistory.length > 1 &&
          <div style={{ marginTop: vp.isDesktop ? 34 : 26 }}>
            <SectionHeader>Historial de precios</SectionHeader>
            {hayGrafica &&
              <div style={{
                background: PALETTE.bgCard,
                border: `1px solid ${PALETTE.border}`,
                padding: '12px 14px 10px',
                position: 'relative', marginBottom: 10
              }}>
                <TacticalCorners size={10} color={ORANGE} />
                <window.PriceChart history={priceHistory} color={ORANGE} height={vp.isDesktop ? 170 : 148} />
                <div style={{
                  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                  gap: 10, flexWrap: 'wrap', marginTop: 6,
                  borderTop: `1px dashed ${PALETTE.border}`, paddingTop: 10
                }}>
                  <span style={{
                    fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 15,
                    color: deltaPct <= 0 ? PALETTE.green : PALETTE.redHi, ...NUM
                  }}>
                    {deltaPct <= 0 ? '▼' : '▲'} {deltaPct > 0 ? '+' : '−'}{Math.abs(deltaPct).toFixed(1)} %
                  </span>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5,
                    color: PALETTE.textMuted, letterSpacing: '0.04em'
                  }}>{fechasHist.length} inventarios oficiales DCAM / OTCA</span>
                </div>
              </div>}
            <window.Disclosure
              title={hayGrafica ? 'Ver inventarios y PDFs' : 'Ver el registro de precios'}>
              <div>
                {priceHistory.slice().reverse().map((h, i, arr) => {
                  const man = manualById(h.manualId);
                  const hAut = window.manualAutoridad ? window.manualAutoridad(man) : null;
                  return (
                    <div key={i} style={{
                      padding: i === 0 ? '0 0 10px' : '10px 0',
                      borderBottom: i < arr.length - 1 ? `1px solid ${PALETTE.border}` : 'none',
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 15
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <span style={{
                            color: i === 0 ? PALETTE.amber : PALETTE.textMuted,
                            fontSize: 13, letterSpacing: '0.1em', flexShrink: 0
                          }}>{i === 0 ? '● ACTUAL' : '○'}</span>
                          <span style={{ color: PALETTE.text, fontWeight: i === 0 ? 700 : 500, ...NUM }}>{h.price}</span>
                          {hAut &&
                            <span title={hAut.nombre} style={{
                              fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700,
                              letterSpacing: '0.1em', color: '#000', background: hAut.color,
                              padding: '1px 6px', flexShrink: 0
                            }}>{hAut.sigla}</span>}
                        </div>
                        <span style={{ color: PALETTE.textDim, fontSize: 14, flexShrink: 0, ...NUM }}>
                          {amxFmtManualDate(h.date) || '—'}
                        </span>
                      </div>
                      {(man || h.note) &&
                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          gap: 10, marginTop: 6, paddingLeft: 22
                        }}>
                          <span style={{
                            color: PALETTE.textMuted, fontSize: 13,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                          }}>{man ? man.nombre : h.note}</span>
                          {man && man.url &&
                            <a href={man.url} target="_blank" rel="noopener" style={{
                              color: PALETTE.amber, fontSize: 13, textDecoration: 'none',
                              borderBottom: `1px solid ${PALETTE.amber}`, flexShrink: 0, whiteSpace: 'nowrap'
                            }}>▦ Ver PDF ↗</a>}
                        </div>}
                    </div>);
                })}
              </div>
            </window.Disclosure>
          </div>}
      </ProdSection>

      {/* ── 7 · MUNICIÓN COMPATIBLE ────────────────────────────────────── */}
      {/* sin banda: las tarjetas de munición ya usan bgCard y sobre la banda
          (mismo color) perderían su contorno */}
      {muns.length > 0 &&
        <ProdSection pad={PAD} gap={SEC}>
          <window.CarouselSection
            title="Munición compatible"
            items={muns}
            renderItem={(m) => <window.MunicionCard mun={m} onClick={() => onOpenMunicion && onOpenMunicion(m.id)} />} />
        </ProdSection>}

      {/* ── 8 · ACCESORIOS COMPATIBLES ─────────────────────────────────── */}
      {compat.length > 0 &&
        <ProdSection pad={PAD} gap={muns.length > 0 ? (vp.isDesktop ? 30 : 22) : SEC}>
          <window.CarouselSection
            title="Accesorios compatibles"
            items={compat}
            renderItem={(ac) => <window.AccesorioCard acc={ac} onClick={() => onOpenAccesorio && onOpenAccesorio(ac.id)} />} />
        </ProdSection>}

      {/* ── 9-12 · TABS (DESIGN.md §11) — variante B de la comparación.
             GALERÍA no está: hoy cada arma tiene una sola foto. Cuando haya
             varias imágenes por ficha, entra como quinto Panel y ya.
             ESPECIFICACIONES tampoco: la ficha técnica del folder (§4.3) es la
             misma tabla `.specs` con los mismos campos. `mecanismo` es la prosa
             bajo el título y `tipo` es la pestaña del folder, así que aquí no
             se pierde ningún dato — se deja de repetir. ────────────────── */}
      <ProdSection pad={PAD} gap={SEC}>
        <FichaTabs>

          {arma.uses && arma.uses.length > 0 &&
            <Panel label="Usos">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {arma.uses.map((u) => {
                  const meta = window.CATEGORIES.uso.find((x) => x.id === u);
                  return (
                    <span key={u} style={{
                      background: PALETTE.bg,
                      border: `1px solid ${PALETTE.border}`,
                      clipPath: window.CUT_TR_SM,
                      padding: '7px 11px',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 14, color: PALETTE.text,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      display: 'inline-flex', alignItems: 'center', gap: 6
                    }}>
                      <span style={{ color: ORANGE }}>{meta?.icon || '●'}</span>
                      {meta?.label || u}
                    </span>);
                })}
              </div>
            </Panel>}

          <Panel label="Legalidad">
            <div>
              <div style={{
                fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 15,
                color: availMeta?.color || PALETTE.text,
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7
              }}>{arma.legalTit}</div>
              <div style={window.amxProsa({ fontSize: 16, marginBottom: 14 })}>{arma.legalDesc}</div>

              {arma.disponibilidad && arma.disponibilidad.length > 0 &&
                <div style={{ marginBottom: 14 }}>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                    color: PALETTE.textMuted, letterSpacing: '0.16em',
                    textTransform: 'uppercase', marginBottom: 6
                  }}>Disponibilidad</div>
                  {arma.disponibilidad.map((d, i) =>
                    <div key={i} style={window.amxProsa({
                      fontSize: 15.5, color: PALETTE.text, padding: '5px 0',
                      lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: 8
                    })}>
                      <span style={{ color: ORANGE }}>▸</span>{d}
                    </div>)}
                </div>}

              <button onClick={() => onNav('legal')} style={{
                width: '100%', background: 'transparent',
                border: `1.5px dashed ${PALETTE.border}`, color: PALETTE.amber,
                padding: '12px', minHeight: 48,
                fontFamily: 'Archivo, sans-serif', fontSize: 14, fontWeight: 600,
                letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer'
              }}>§ Guía legal completa →</button>
            </div>
          </Panel>

          {arma.historia &&
            <Panel label="Historia">
              <div style={window.amxProsa({
                fontSize: 16.5, color: PALETTE.text, lineHeight: 1.75
              })}>{arma.historia}</div>
            </Panel>}

        </FichaTabs>
      </ProdSection>

      {/* VIDEO YOUTUBE (sólo si hay) */}
      <YouTubeBlock arma={arma} padX={PAD} />

      {/* CALIFICACIÓN DE LA COMUNIDAD */}
      <ProdSection pad={PAD} gap={SEC}>
        <OpinionBlock tipo="arma" entidadId={arma.id} entidadNombre={arma.nombre}
          nombreTipo="arma" onNav={onNav} />
      </ProdSection>

      {/* RELACIONADAS */}
      {related.length > 0 &&
        <div style={{ padding: `${SEC}px ${PAD}px 0` }}>
          <SectionHeader>Armas similares</SectionHeader>
          <div className="amx-hscroll" style={{
            display: vp.isDesktop ? 'grid' : 'flex',
            gridTemplateColumns: vp.isDesktop ? 'repeat(4, 1fr)' : undefined,
            gap: vp.isDesktop ? 14 : 10,
            overflowX: vp.isDesktop ? 'visible' : 'auto',
            margin: vp.isDesktop ? 0 : `0 -${PAD}px`,
            padding: vp.isDesktop ? 0 : `0 ${PAD}px 4px`
          }}>
            {related.map((a) =>
              <div key={a.id} style={{ width: vp.isDesktop ? 'auto' : 300, flexShrink: 0 }}>
                <ArmaCard arma={a}
                  onClick={() => onOpenArma(a.id)}
                  onCompare={() => toggleCompare(a.id)}
                  inCompare={compareIds.includes(a.id)} />
              </div>)}
          </div>
        </div>}

      {/* ── SUGERIR CAMBIOS — cierra la página ─────────────────────────── */}
      <ProdSection pad={PAD} gap={SEC}>
        <button onClick={() => setShowSuggest(true)} style={{
            width: '100%', background: 'transparent', color: PALETTE.amber,
            border: `1.5px dashed ${PALETTE.amber}`,
            padding: '14px', minHeight: 48,
            fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 15,
            letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer'
          }}>Sugerir cambios</button>
      </ProdSection>

      {showSuggest &&
        <SuggestChangesModal arma={arma} onClose={() => setShowSuggest(false)} />}
     </div>

      {/* BARRA FIJA DE ACCIÓN (móvil) — precio + comparar en zona del pulgar.
          Se oculta si el flotante de comparación está activo (mismo hueco). */}
      {vp.isMobile && compareIds.length === 0 &&
        <div style={{
          position: 'fixed', left: 0, right: 0,
          // --amx-nav-h la publica BottomNav midiéndose (ya incluye el safe-area).
          // El -1px superpone los dos bordes en una sola línea: si se apoya justo
          // encima queda una rendija por la que se ve pasar el contenido.
          bottom: 'calc(var(--amx-nav-h, 74px) - 1px)',
          // Blanco sólido sobre el lienzo claro. Sin backdrop-filter: es el
          // asesino nº1 del scroll en móvil y aquí no aportaba nada.
          background: CLARO.panelHi,
          borderTop: `1px solid ${PALETTE.border}`,
          boxShadow: '0 -6px 18px -12px rgba(23,27,25,.28)',
          padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
          zIndex: 55
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
              color: PALETTE.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase'
            }}>Precio actual</div>
            <div style={{
              fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 18,
              color: PALETTE.amber, whiteSpace: 'nowrap', ...NUM
            }}>{String(precioActual).replace(' MXN', '')}</div>
          </div>
          <div style={{ flex: 1 }} />
          <span className="amx-cut" style={{ display: 'block' }}>
            <button onClick={() => toggleCompare(arma.id)} style={{
              background: inCmp ? 'transparent' : PALETTE.amber,
              // Este es el botón de la barra fija del móvil, y su estado por
              // defecto —relleno verde con texto negro, 1.69:1— es justo el que
              // Saulo señaló desde el teléfono.
              color: inCmp ? PALETTE.amber : window.amxTintaSobre(PALETTE.amber),
              border: `1.5px solid ${PALETTE.amber}`,
              clipPath: CUT_TR,
              minHeight: 46, padding: '0 20px',
              fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 14,
              letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer',
              boxShadow: inCmp ? 'none' : '0 0 16px rgba(221,213,196,0.25)'
            }}>{inCmp ? '✓ Añadida' : '⇄ Comparar'}</button>
          </span>
        </div>}
    </div>);

}
window.ProductScreen = ProductScreen;

// ════════════════════════════════════════════════════════════════
// OPINION BLOCK — "¿Recomiendas esta arma?" (modelo Steam)
// Sustituye a las estrellas de 1-5 (ago-2026). Una opinión SIN reseña no
// existe: el texto es lo que el moderador juzga y lo que da derecho a contar
// en el agregado. Nada se publica sin aprobación — ver la pantalla de Soporte.
// `nombreTipo` es la palabra de la pregunta, para reutilizar el bloque tal cual
// en las fichas de accesorio, munición, campo y curso.
// ════════════════════════════════════════════════════════════════
const RESENA_MIN = 100, RESENA_MAX = 1200;

function OpinionBlock({ tipo, entidadId, entidadNombre, nombreTipo, onNav }) {
  const vp = window.useViewport();
  const [, force] = useState2(0);
  useEffect(() => window.Store && window.Store.onChange(() => force((x) => x + 1)), []);

  const yaOpino = (() => {
    try { return !!localStorage.getItem('amx_op_' + tipo + '_' + entidadId); } catch (e) { return false; }
  })();
  const [enviado, setEnviado] = useState2(yaOpino);
  const [rec, setRec] = useState2(null);          // null | true | false
  const [f, setF] = useState2({ texto: '', autor: '', email: '' });
  const set = (k, v) => setF((p) => Object.assign({}, p, { [k]: v }));

  const op = window.Store ? window.Store.getOpiniones(tipo, entidadId) : { up: 0, down: 0, total: 0, lista: [] };
  const et = window.amxOpinionLabel(op.up, op.down);

  const largo = f.texto.trim().length;
  const correoOk = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(f.email.trim());
  const listo = rec !== null && largo >= RESENA_MIN && largo <= RESENA_MAX &&
    f.autor.trim().length >= 2 && correoOk;

  const enviar = () => {
    if (!listo || !window.Store) return;
    const ok = window.Store.addReview({
      tipo, entidadId, entidadNombre, recomienda: rec,
      texto: f.texto, autor: f.autor, email: f.email,
    });
    if (!ok) return;
    try { localStorage.setItem('amx_op_' + tipo + '_' + entidadId, '1'); } catch (e) {}
    setEnviado(true);
  };

  // Botón de pulgar. El anillo de foco va en el propio botón (aquí no hay
  // clip-path, así que no hace falta el wrapper .amx-cut).
  const Pulgar = ({ up, activo, onClick }) => {
    const col = up ? PALETTE.green : PALETTE.redHi;
    return (
      <button type="button" onClick={onClick}
        aria-pressed={activo}
        style={{
          flex: '1 1 0', minWidth: 0, minHeight: 64,
          background: activo ? col : 'transparent',
          color: activo ? '#000' : col,
          border: `1.5px solid ${activo ? col : PALETTE.border}`,
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 10,
          fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 15,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          transition: 'background 0.15s, border-color 0.15s, color 0.15s'
        }}>
        <window.ThumbIcon up={up} size={24} />
        {up ? 'Sí' : 'No'}
      </button>
    );
  };

  // El formulario permanece plegado hasta que hay voto: `rec` ya distingue "no ha
  // votado" (null) de "votó", así que el gate no necesita estado propio. Sin esto
  // media pantalla de ficha la ocupaba un formulario que casi nadie va a usar.
  const hayVoto = rec !== null;

  return (
    <React.Fragment>
      <div style={{
        background: PALETTE.bgCard,
        border: `1px solid ${PALETTE.border}`,
        padding: vp.isDesktop ? '18px 20px' : '15px 16px',
        position: 'relative'
      }}>
        <TacticalCorners size={10} color={enviado ? PALETTE.green : PALETTE.amber} />

        {enviado ?
          <div>
            <div style={{
              fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 16,
              color: PALETTE.green, textTransform: 'uppercase',
              letterSpacing: '0.1em', marginBottom: 8
            }}>✓ Tu opinión entró en revisión</div>
            <div style={window.amxProsa({ fontSize: 15, lineHeight: 1.6 })}>
              Se publicará cuando se compruebe que cumple las{' '}
              <button type="button" onClick={() => onNav && onNav('soporte')} style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                font: 'inherit', color: PALETTE.amber,
                borderBottom: `1px solid ${PALETTE.amber}`
              }}>normas de la comunidad</button>.
            </div>
          </div>
        :
          <div>
            <div style={{
              fontFamily: 'Archivo, sans-serif', fontWeight: 700,
              fontSize: vp.isDesktop ? 19 : 17, color: PALETTE.text,
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12
            }}>¿Recomiendas {nombreTipo === 'munición' ? 'esta' : nombreTipo === 'arma' ? 'esta' : 'este'} {nombreTipo}?</div>

            <div style={{ display: 'flex', gap: 10, marginBottom: hayVoto ? 16 : 0 }}>
              <Pulgar up activo={rec === true} onClick={() => setRec(true)} />
              <Pulgar up={false} activo={rec === false} onClick={() => setRec(false)} />
            </div>

            {hayVoto &&
            <React.Fragment>
              <label style={sLblStyle()}>Tu reseña <span style={{ color: PALETTE.amber }}>*</span></label>
              <textarea value={f.texto} onChange={(e) => set('texto', e.target.value)}
                rows={4} maxLength={RESENA_MAX}
                placeholder="Cuenta tu experiencia con calma: qué tal se maneja, para qué la usas, qué te sorprendió."
                style={Object.assign(sInpStyle(), { marginBottom: 4 })} />
              <div style={window.amxProsa({
                fontSize: 13.5, lineHeight: 1.5, marginBottom: 12,
                color: largo >= RESENA_MIN ? PALETTE.green : PALETTE.textMuted
              })}>
                {largo >= RESENA_MIN
                  ? `✓ ${largo} caracteres`
                  : `${largo} / ${RESENA_MIN} mínimo — una reseña más corta no puede contar en la calificación`}
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: vp.isDesktop ? '1fr 1fr' : '1fr',
                columnGap: 12
              }}>
                {sfld('Nombre / Apodo', 'autor', f, set, { required: true, placeholder: 'Como quieres firmar' })}
                {sfld('Correo electrónico', 'email', f, set, {
                  required: true, type: 'email', placeholder: 'tucorreo@ejemplo.com',
                  hint: 'No se publica. Solo para contactarte si hace falta.'
                })}
              </div>

              <div style={{
                borderTop: `1px dashed ${PALETTE.border}`, paddingTop: 12, marginTop: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 12, flexWrap: 'wrap'
              }}>
                <div style={window.amxProsa({
                  fontSize: 13.5, lineHeight: 1.55,
                  color: PALETTE.textMuted, flex: '1 1 240px'
                })}>
                  Toda reseña se revisa antes de publicarse.{' '}
                  <button type="button" onClick={() => onNav && onNav('soporte')} style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    font: 'inherit', color: PALETTE.amber,
                    borderBottom: `1px solid ${PALETTE.amber}`
                  }}>Normas de la comunidad →</button>
                </div>
                <button type="button" onClick={enviar} disabled={!listo} style={{
                  background: listo ? PALETTE.amber : 'transparent',
                  color: listo ? '#000' : PALETTE.textMuted,
                  border: `1.5px solid ${listo ? PALETTE.amber : PALETTE.border}`,
                  padding: '0 22px', minHeight: 48,
                  fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 14,
                  letterSpacing: '0.14em', textTransform: 'uppercase',
                  cursor: listo ? 'pointer' : 'not-allowed'
                }}>Publicar opinión</button>
              </div>
            </React.Fragment>}
          </div>}
      </div>

      {op.total > 0 &&
        <div style={{ marginTop: 10 }}>
          <window.Disclosure title={`Leer opiniones (${op.total})`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {op.lista.slice(0, 20).map((r, i) =>
                <div key={r.id || i} style={{
                  paddingBottom: 14,
                  borderBottom: i < Math.min(op.lista.length, 20) - 1 ? `1px solid ${PALETTE.border}` : 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                    <span style={{ color: r.recomienda ? PALETTE.green : PALETTE.redHi, display: 'flex' }}>
                      <window.ThumbIcon up={!!r.recomienda} size={17} />
                    </span>
                    <span style={{
                      fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 12.5,
                      color: r.recomienda ? PALETTE.green : PALETTE.redHi,
                      letterSpacing: '0.12em', textTransform: 'uppercase'
                    }}>{r.recomienda ? 'La recomienda' : 'No la recomienda'}</span>
                    <span style={{ flex: 1 }} />
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                      color: PALETTE.textMuted, letterSpacing: '0.06em'
                    }}>{amxFmtManualDate(String(r.submittedAt || '').slice(0, 10))}</span>
                  </div>
                  <div style={window.amxProsa({
                    fontSize: 16, color: PALETTE.text, lineHeight: 1.65, marginBottom: 6,
                    whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'
                  })}>{r.texto}</div>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 13,
                    color: PALETTE.textMuted, letterSpacing: '0.08em'
                  }}>— {r.autor || 'Anónimo'}</div>
                </div>
              )}
            </div>
          </window.Disclosure>
        </div>}

      {et.hay &&
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5,
          color: PALETTE.textMuted, letterSpacing: '0.08em', marginTop: 10
        }}>
          {op.up} de {op.total} {op.total === 1 ? 'persona la recomienda' : 'personas la recomiendan'} ({et.pct} %)
        </div>}
    </React.Fragment>);

}
window.OpinionBlock = OpinionBlock;

// ════════════════════════════════════════════════════════════════
// YOUTUBE BLOCK — embed de video de Armas M&S (si existe)
// ════════════════════════════════════════════════════════════════
function YouTubeBlock({ arma, padX = 16 }) {
  const [loaded, setLoaded] = useState2(false);
  const vid = window.youtubeId(arma.youtube);
  if (!vid) return null; // si no hay video, no se renderiza nada

  const thumb = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
  const embed = `https://www.youtube-nocookie.com/embed/${vid}?rel=0&autoplay=1&modestbranding=1`;

  return (
    <div style={{ padding: `0 ${padX}px 16px` }}>
      <SectionHeader action={
      <a href={`https://youtube.com/watch?v=${vid}`} target="_blank" rel="noopener noreferrer"
      style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 13, color: PALETTE.textMuted,
        letterSpacing: '0.1em', textDecoration: 'none'
      }}>
          @ArmasMS ↗
        </a>
      }>Video Review · YouTube</SectionHeader>

      <div style={{
        position: 'relative',
        background: '#000',
        border: `1px solid ${PALETTE.border}`,
        aspectRatio: '16/9',
        overflow: 'hidden',
        cursor: loaded ? 'default' : 'pointer'
      }} onClick={() => !loaded && setLoaded(true)}>
        {loaded ?
        <iframe
          src={embed}
          title={'Video: ' + arma.nombre}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} /> :


        <React.Fragment>
            <img src={thumb} alt={arma.nombre}
          loading="lazy"
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover',
            filter: 'brightness(0.7)'
          }}
          onError={(e) => {
            // fallback: thumbnail "0" if hqdefault not available
            if (!e.target.dataset.fb) {
              e.target.dataset.fb = '1';
              e.target.src = `https://i.ytimg.com/vi/${vid}/0.jpg`;
            } else {
              e.target.style.display = 'none';
            }
          }} />
          
            {/* play button overlay */}
            <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none'
          }}>
              <div style={{
              width: 70, height: 50,
              background: 'rgba(192,57,43,0.92)',
              borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
              transition: 'transform 0.18s'
            }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
            {/* canal info bottom-left */}
            <div style={{
            position: 'absolute', bottom: 10, left: 12,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 15.5, color: '#fff',
            letterSpacing: '0.08em',
            textShadow: '0 2px 6px rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', gap: 6
          }}>
              {/* Los siete rellenos `background: PALETTE.amber` de este archivo
                  llevaban el texto en '#000': cuando «amber» era ámbar el negro
                  encima funcionaba, pero hoy amber ES el verde de marca #173A32
                  y el negro encima daba 1.69:1 — CTAs ilegibles. Sobre verde el
                  texto va en sobreMarca #F3EFE4 (10.83:1). Vale para los siete. */}
              <span style={{
              background: PALETTE.amber, color: PALETTE.sobreMarca,
              padding: '2px 6px', fontWeight: 700, fontSize: 13,
              letterSpacing: '0.1em'
            }}>YOUTUBE</span>
              @ArmasMS
            </div>
            <div style={{
            position: 'absolute', top: 10, right: 12,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 13, color: '#fff', opacity: 0.85,
            letterSpacing: '0.12em',
            background: 'rgba(0,0,0,0.5)',
            padding: '3px 7px'
          }}>▶ TOCA PARA REPRODUCIR</div>
          </React.Fragment>
        }
      </div>
    </div>);

}
window.YouTubeBlock = YouTubeBlock;

// ════════════════════════════════════════════════════════════════
// SUGGEST CHANGES — modal para sugerir cambios a una ficha
// ════════════════════════════════════════════════════════════════
function SuggestChangesModal({ arma, onClose }) {
  const [f, setF] = useState2({ name: '', email: '', field: 'precio', current: '', suggested: '', source: '', notes: '' });
  const [sent, setSent] = useState2(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!f.name || !f.suggested) {alert('Falta tu nombre y el cambio sugerido.');return;}
    window.Store.addSuggestion({
      armaId: arma.id,
      armaNombre: arma.nombre,
      submitterName: f.name,
      submitterEmail: f.email,
      field: f.field,
      currentValue: f.current,
      suggestedValue: f.suggested,
      source: f.source,
      notes: f.notes
    });
    setSent(true);
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(7,8,10,0.85)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '40px 16px', overflowY: 'auto'
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        maxWidth: 580, width: '100%',
        background: PALETTE.bgCard, border: `1px solid ${PALETTE.amber}`,
        boxShadow: '0 30px 80px rgba(0,0,0,0.6)'
      }}>
        <div style={{
          padding: '14px 18px',
          background: PALETTE.bgElev,
          borderBottom: `2px solid ${PALETTE.amber}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: PALETTE.amber, letterSpacing: '0.2em' }}>✎ SUGERIR CAMBIO</div>
            <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 17, color: PALETTE.text, textTransform: 'uppercase' }}>{arma.nombre}</div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: `1px solid ${PALETTE.border}`,
            color: PALETTE.textDim, width: 28, height: 28, cursor: 'pointer',
            fontSize: 19, lineHeight: 1
          }}>✕</button>
        </div>

        {sent ?
        <div style={{ padding: 28, textAlign: 'center' }}>
            <div style={{ fontSize: 50.5, color: PALETTE.amber, lineHeight: 1, marginBottom: 12 }}>✓</div>
            <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 19, color: PALETTE.text, textTransform: 'uppercase', marginBottom: 8 }}>¡Gracias!</div>
            <div style={window.amxProsa({ fontSize: 16, lineHeight: 1.6, marginBottom: 20 })}>Tu sugerencia entró en la cola. Revisaremos la información y, si procede, aplicaremos el cambio.</div>
            <button onClick={onClose} style={{
            background: PALETTE.amber, color: PALETTE.sobreMarca, border: 'none',
            padding: '10px 20px',
            fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 14,
            letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer'
          }}>Cerrar</button>
          </div> :

        <form onSubmit={submit} style={{ padding: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              {sfld('Tu nombre', 'name', f, set, { required: true })}
              {sfld('Correo (opcional)', 'email', f, set, { type: 'email' })}
            </div>
            {sfld('Campo a corregir', 'field', f, set, { select: [
            { value: 'precio', label: 'Precio / Historial de precios' },
            { value: 'ficha_tecnica', label: 'Ficha técnica (specs)' },
            { value: 'historia', label: 'Historia / descripción' },
            { value: 'legal', label: 'Información legal' },
            { value: 'imagen', label: 'Imagen' },
            { value: 'stats', label: 'Stats de combate' },
            { value: 'otro', label: 'Otro' }]
          })}
            {sfld('Valor actual (lo que dice ahora)', 'current', f, set, { ta: true, rows: 2 })}
            {sfld('Valor sugerido / corrección', 'suggested', f, set, { ta: true, rows: 3, required: true })}
            {sfld('Fuente / referencia (URL, doc, etc.)', 'source', f, set, { placeholder: 'https://... o "publicación oficial XYZ"' })}
            {sfld('Comentarios adicionales', 'notes', f, set, { ta: true, rows: 2 })}

            <div style={window.amxProsa({
            background: PALETTE.bgElev, border: `1px dashed ${PALETTE.border}`,
            padding: 10, marginTop: 8,
            fontSize: 14, color: PALETTE.textMuted, lineHeight: 1.55
          })}>
              <b style={{ color: PALETTE.amber }}>◆ Nota:</b> tu sugerencia va a la cola de revisión. No se aplica al instante; se revisa, se valida con la fuente y luego se publica.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" onClick={onClose} style={{
              background: 'transparent', color: PALETTE.textDim,
              border: `1px solid ${PALETTE.border}`,
              padding: '10px 18px',
              fontFamily: 'Archivo, sans-serif', fontWeight: 600, fontSize: 14,
              letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer'
            }}>Cancelar</button>
              <button type="submit" style={{
              background: PALETTE.amber, color: PALETTE.sobreMarca, border: 'none',
              padding: '10px 20px',
              fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 14,
              letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer'
            }}>✓ Enviar sugerencia</button>
            </div>
          </form>
        }
      </div>
    </div>);

}
function sfld(label, k, f, set, p = {}) {
  return (
    <div style={{ marginBottom: 12, gridColumn: p.span === 2 ? '1 / -1' : 'auto' }}>
      <label style={sLblStyle()}>{label} {p.required && <span style={{ color: PALETTE.amber }}>*</span>}</label>
      {p.ta ?
      <textarea value={f[k]} onChange={(e) => set(k, e.target.value)}
      rows={p.rows || 3} placeholder={p.placeholder} style={sInpStyle()} /> :
      p.select ?
      <select value={f[k]} onChange={(e) => set(k, e.target.value)} style={sInpStyle()}>
          {p.select.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select> :

      <input type={p.type || 'text'} value={f[k]} onChange={(e) => set(k, e.target.value)}
      placeholder={p.placeholder} style={sInpStyle()} />
      }
      {p.hint &&
      <div style={window.amxProsa({
        fontSize: 13, lineHeight: 1.45, color: PALETTE.textMuted, marginTop: 4
      })}>{p.hint}</div>}
    </div>);

}
// Etiqueta de campo: versalita con tracking (el lenguaje de la app) pero en Open
// Sans, que a este cuerpo se lee bastante mejor que la mono. El 600 compensa el
// peso que Open Sans pierde en mayúsculas pequeñas.
function sLblStyle() {
  return window.amxProsa({
    display: 'block',
    fontSize: 12.5, fontWeight: 600, lineHeight: 1.4,
    color: PALETTE.textMuted,
    letterSpacing: '0.13em', textTransform: 'uppercase',
    marginBottom: 5
  });
}
function sInpStyle() {
  return window.amxProsa({
    width: '100%',
    background: PALETTE.bg,
    border: `1px solid ${PALETTE.border}`,
    color: PALETTE.text,
    padding: '10px 12px',
    // 16px NO es decorativo: por debajo de eso iOS hace zoom al enfocar el campo.
    // El estilo inline pisa la regla de index.html, así que el piso va aquí.
    fontSize: 16, outline: 'none',
    resize: 'vertical', lineHeight: 1.55
  });
}
window.SuggestChangesModal = SuggestChangesModal;

// ════════════════════════════════════════════════════════════════
// COMPARE — Vista lado a lado tipo loadout
// ════════════════════════════════════════════════════════════════
function CompareScreen({ ids, onOpenArma, onNav, removeFromCompare, openPickerForSlot }) {
  const vp = window.useViewport();
  const a = ids[0] ? window.findArma(ids[0]) : null;
  const b = ids[1] ? window.findArma(ids[1]) : null;

  if (!a && !b) {
    return (
      <div style={{
        padding: '60px 24px', textAlign: 'center',
        fontFamily: 'JetBrains Mono, monospace',
        color: PALETTE.textMuted
      }}>
        <div style={{ fontSize: 57.5, color: PALETTE.border, marginBottom: 16 }}>⇄</div>
        <div style={{ fontSize: 17, marginBottom: 8, color: PALETTE.text }}>COMPARADOR VACÍO</div>
        <div style={{ fontSize: 14.5, lineHeight: 1.6, marginBottom: 18 }}>
          Selecciona armas desde el catálogo<br />tocando el botón ⇄ en cada tarjeta.
        </div>
        <button onClick={() => onNav('catalog')} style={{
          background: PALETTE.amber, color: PALETTE.sobreMarca, border: 'none',
          padding: '10px 22px',
          fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 14,
          letterSpacing: '0.15em', textTransform: 'uppercase',
          cursor: 'pointer'
        }}>Ir al Arsenal</button>
      </div>);

  }

  const padX = vp.isDesktop ? 28 : 12;
  return (
    <div style={{ paddingBottom: 90, maxWidth: 1100, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={{
        padding: `${vp.isDesktop ? 22 : 14}px ${padX}px 10px`,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 13, color: PALETTE.amber,
        letterSpacing: '0.2em', textTransform: 'uppercase',
        textAlign: 'center'
      }}>━━━ LOADOUT · COMPARATIVA ━━━</div>

      {/* HEADERS LADO A LADO */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: vp.isDesktop ? 16 : 4,
        padding: `0 ${padX}px 12px`
      }}>
        {[a, b].map((x, idx) =>
        <CompareSlot key={idx} arma={x} side={idx === 0 ? 'A' : 'B'}
        onOpen={() => x && onOpenArma(x.id)}
        onRemove={() => x && removeFromCompare(x.id)}
        onPick={() => openPickerForSlot(idx)} />
        )}
      </div>

      {/* STATS SIDE BY SIDE */}
      {a && b &&
      <div style={{ padding: `0 ${padX}px 16px` }}>
          <SectionHeader>Estadísticas</SectionHeader>
          <div style={{
          background: PALETTE.bgCard,
          border: `1px solid ${PALETTE.border}`,
          padding: 12,
          position: 'relative'
        }}>
            <TacticalCorners size={10} color={PALETTE.amber} />
            {[
          { k: 'alcance', l: 'Alcance' },
          { k: 'precision', l: 'Precisión' },
          { k: 'retroceso', l: 'Retroceso' },
          { k: 'capacidad', l: 'Capacidad' },
          { k: 'manejo', l: 'Manejo' },
          { k: 'poder', l: 'Poder' }].
          map((stat) => {
            const va = a.stats[stat.k],vb = b.stats[stat.k];
            const winner = va > vb ? 'a' : vb > va ? 'b' : null;
            return (
              <div key={stat.k} style={{
                display: 'grid', gridTemplateColumns: '1fr 70px 1fr',
                alignItems: 'center', gap: 8, marginBottom: 10
              }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 15.5, color: winner === 'a' ? PALETTE.amber : PALETTE.text,
                    fontWeight: 700
                  }}>{va}</div>
                    <div style={{
                    height: 4, background: PALETTE.bg,
                    border: `1px solid ${PALETTE.border}`,
                    marginTop: 3, position: 'relative'
                  }}>
                      <div style={{
                      position: 'absolute', right: 0, top: 0, bottom: 0,
                      width: `${va}%`,
                      background: winner === 'a' ? PALETTE.amber : PALETTE.textMuted,
                      boxShadow: winner === 'a' ? `0 0 4px ${PALETTE.amber}66` : 'none'
                    }} />
                    </div>
                  </div>
                  <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 13, color: PALETTE.textMuted,
                  textAlign: 'center', letterSpacing: '0.1em',
                  textTransform: 'uppercase'
                }}>{stat.l}</div>
                  <div>
                    <div style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 15.5, color: winner === 'b' ? PALETTE.amber : PALETTE.text,
                    fontWeight: 700
                  }}>{vb}</div>
                    <div style={{
                    height: 4, background: PALETTE.bg,
                    border: `1px solid ${PALETTE.border}`,
                    marginTop: 3, position: 'relative'
                  }}>
                      <div style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0,
                      width: `${vb}%`,
                      background: winner === 'b' ? PALETTE.amber : PALETTE.textMuted,
                      boxShadow: winner === 'b' ? `0 0 4px ${PALETTE.amber}66` : 'none'
                    }} />
                    </div>
                  </div>
                </div>);

          })}
          </div>

          {/* SPEC ROWS */}
          <SectionHeader>Ficha técnica</SectionHeader>
          <div style={{
          background: PALETTE.bgCard,
          border: `1px solid ${PALETTE.border}`
        }}>
            {[
          { l: 'Calibre', av: a.calibre, bv: b.calibre },
          { l: 'Capacidad', av: a.capacidad, bv: b.capacidad },
          { l: 'Peso', av: a.peso, bv: b.peso },
          { l: 'Longitud', av: a.longitud, bv: b.longitud },
          { l: 'Origen', av: a.pais, bv: b.pais },
          { l: 'Año', av: a.anio, bv: b.anio },
          { l: 'Mecanismo', av: a.mecanismo, bv: b.mecanismo },
          { l: 'Precio', av: a.priceExact, bv: b.priceExact },
          { l: 'Disponib.', av: a.availLabel, bv: b.availLabel }].
          map((row, i) =>
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '1fr 80px 1fr',
            borderBottom: `1px solid ${PALETTE.border}`,
            padding: '8px 10px', alignItems: 'center', gap: 8,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 14.5}}>
                <div style={{ color: PALETTE.text, textAlign: 'right', lineHeight: 1.3 }}>{row.av}</div>
                <div style={{
              color: PALETTE.textMuted,
              textAlign: 'center', letterSpacing: '0.1em',
              textTransform: 'uppercase', fontSize: 12}}>{row.l}</div>
                <div style={{ color: PALETTE.text, lineHeight: 1.3 }}>{row.bv}</div>
              </div>
          )}
          </div>
        </div>
      }
    </div>);

}
function CompareSlot({ arma, side, onOpen, onRemove, onPick }) {
  if (!arma) {
    return (
      <button onClick={onPick} style={{
        height: 230,
        background: 'transparent',
        border: `2px dashed ${PALETTE.border}`,
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 6,
        fontFamily: 'JetBrains Mono, monospace',
        color: PALETTE.textMuted
      }}>
        <div style={{ fontSize: 38.5, color: PALETTE.border }}>+</div>
        <div style={{
          fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase'
        }}>SLOT {side}</div>
        <div style={{ fontSize: 13, color: PALETTE.textDim }}>Añadir arma</div>
      </button>);

  }
  return (
    <div style={{
      background: PALETTE.bgCard,
      border: `1px solid ${PALETTE.border}`,
      padding: 10,
      position: 'relative'
    }}>
      <TacticalCorners size={8} color={PALETTE.amber} />
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        marginBottom: 4
      }}>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 12, color: PALETTE.amber,
          letterSpacing: '0.2em'
        }}>◆ SLOT {side}</span>
        <button onClick={onRemove} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: PALETTE.textMuted, fontSize: 15.5, padding: 0
        }}>✕</button>
      </div>
      <div style={{
        height: 90,
        background: `radial-gradient(ellipse at 50% 50%, ${PALETTE.bgElev} 0%, ${PALETTE.bg} 100%)`,
        border: `1px solid ${PALETTE.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 8, overflow: 'hidden'
      }}>
        <img src={arma.img} alt={arma.nombre} loading="lazy" decoding="async" style={{
          maxWidth: '90%', maxHeight: '85%',
          filter: 'grayscale(0.15) contrast(1.1)'
        }} onError={(e) => {e.target.src = window.armaPlaceholder(arma);e.target.onerror = null;}} />
      </div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 12, color: PALETTE.amber,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        marginBottom: 2
      }}>{arma.marca}</div>
      <div style={{
        fontFamily: 'Archivo, sans-serif',
        fontSize: 15, fontWeight: 600,
        color: PALETTE.text,
        textTransform: 'uppercase',
        lineHeight: 1.1, marginBottom: 4
      }}>{arma.nombre}</div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 13, color: PALETTE.textDim,
        marginBottom: 6
      }}>{arma.calibre.replace(' Parabellum', '').replace('Winchester', 'Win')}</div>
      <AvailBadge avail={arma.avail} compact />
      <button onClick={onOpen} style={{
        marginTop: 8, width: '100%',
        background: 'transparent', border: `1px solid ${PALETTE.border}`,
        color: PALETTE.text,
        padding: '5px',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 13, letterSpacing: '0.1em',
        cursor: 'pointer', textTransform: 'uppercase'
      }}>Ver ficha →</button>
    </div>);

}
window.CompareScreen = CompareScreen;

// ════════════════════════════════════════════════════════════════
// LEGAL — Página de legalidad con WhatsApp asesoría
// ════════════════════════════════════════════════════════════════
function LegalScreen({ onNav }) {
  const vp = window.useViewport();
  const padX = vp.isDesktop ? 28 : 16;
  const page = window.Store ? window.Store.getPages().legal : null;
  const eyebrow = page?.eyebrow || '§ LEGALIDAD · MX';
  const title = page?.title || 'Tenencia legal de armas de fuego';
  const intro = page?.intro || 'Resumen de los requisitos y pasos para la posesión legal en México conforme a la Ley Federal de Armas de Fuego y Explosivos.';
  const requisitos = page?.requisitos || ['INE / IFE vigente', 'CURP impresa', 'RFC (constancia SAT)', 'Comprobante de domicilio (no mayor a 3 meses)', 'Constancia de no antecedentes penales', 'Examen toxicológico (algunos casos)', 'Acta de nacimiento'];
  const pasos = page?.pasos || [
  { t: 'Registro en plataforma SEDENA', d: 'Crear cuenta en el portal oficial de Defensa Nacional y completar perfil con tus datos.' },
  { t: 'Solicitud de licencia', d: 'Pedir Licencia Particular (uso doméstico) o de tiro/cacería según el caso. Pago de derechos.' },
  { t: 'Cita en la DCAM u OTCA', d: 'Agendar visita a la DCAM, en el Campo Militar No. 1 (CDMX), o a la OTCA, en Monterrey, N.L. Llevar documentación completa.' },
  { t: 'Selección y compra', d: 'Elegir arma del catálogo oficial. La adquisición civil solo puede hacerse por los canales oficiales: la DCAM o la OTCA.' },
  { t: 'Registro federal del arma', d: 'Toda arma adquirida queda registrada a tu nombre en el Registro Federal de Armas (RFA).' }];

  const waPhone = page?.whatsapp_phone || '525555555555';
  const waMsg = page?.whatsapp_msg || 'Hola, me interesa asesoría para trámite SEDENA';
  const waPitch = page?.whatsapp_pitch || 'El acompañamiento legal para el trámite SEDENA es prestado por un abogado externo especializado, en lo individual y bajo su propia cédula profesional. Armas M&S no es despacho jurídico y únicamente facilita el contacto con el profesional.';
  const decl = window.ARMADO_DECLARACION || { titulo: 'Declaración de intenciones', parrafos: [] };
  return (
    <div style={{ padding: `0 ${padX}px 90px`, maxWidth: 900, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={{
        padding: '20px 0',
        textAlign: 'center',
        borderBottom: `1px solid ${PALETTE.border}`,
        marginBottom: 18
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13, color: PALETTE.amber,
          letterSpacing: '0.2em', marginBottom: 6
        }}>{eyebrow}</div>
        <div style={{
          fontFamily: 'Archivo, sans-serif',
          fontWeight: 700, fontSize: 23,
          color: PALETTE.text,
          textTransform: 'uppercase',
          letterSpacing: '0.04em', lineHeight: 1.1
        }}>{title}</div>
        <div style={window.amxProsa({
          fontSize: 16, marginTop: 10, maxWidth: 520, marginInline: 'auto', lineHeight: 1.6
        })}>{intro}</div>
      </div>

      {/* DISCLAIMER OFICIAL — visible al principio */}
      <div style={{
        background: 'rgba(168,58,42,0.08)',
        border: `1px solid ${PALETTE.redHi}`,
        padding: '14px',
        marginBottom: 22
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13, color: PALETTE.redHi,
          letterSpacing: '0.2em', textTransform: 'uppercase',
          marginBottom: 6,
          fontWeight: 700
        }}>▲ AVISO DE TRANSPARENCIA</div>
        <div style={window.amxProsa({ fontSize: 16.5, color: PALETTE.text })}>
          Armado en México y Armas M&amp;S no forman parte de DEFENSA (anteriormente SEDENA), DCAM ni de ninguna dependencia del gobierno mexicano. Las armas de fuego se muestran solo con fines informativos y de transparencia: no las comercializamos, y no gestionamos licencias, permisos ni trámites administrativos de ningún tipo. Armado en México y Armas M&amp;S tampoco prestan servicios jurídicos. La única vía legal para adquirir un arma de fuego en México son los canales oficiales: la DCAM o la OTCA.
        </div>
      </div>

      {/* CATEGORÍAS LEGALES */}
      <SectionHeader>Las 4 Categorías Legales</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
        {window.CATEGORIES.disponibilidad.map((d) =>
        <div key={d.id} style={{
          background: PALETTE.bgCard,
          border: `1px solid ${d.color}`,
          boxShadow: CLARO.sombra,
          padding: '12px 14px'
        }}>
            {/* El rótulo iba en d.color (data.js), pensado para el tema oscuro
                anterior: el nombre de la categoría, que es la información de la
                tarjeta, no se leía. El texto va en tinta (16.31:1 sobre la
                tarjeta) y el color de la categoría es ahora el HAIRLINE ENTERO,
                no una barra de 4px a la izquierda — misma información, sin el
                tic de la pestaña lateral que veta §6. Medidos sobre la tarjeta:
                #2F6B33 6.02:1 · #7D6108 5.49:1 · #A3341F 6.42:1. */}
            <div style={{
            fontFamily: 'Archivo, sans-serif',
            fontWeight: 700, fontSize: 15,
            color: PALETTE.text,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            marginBottom: 4
          }}>{d.label}</div>
            <div style={window.amxProsa({ fontSize: 15.5, lineHeight: 1.6 })}>{d.desc}</div>
          </div>
        )}
        {/* 4ª categoría — Armas traumáticas (sin licencia).
            Iba en '#FFFFFF' copiando el patrón del tema oscuro: sobre la tarjeta
            el título daba 1.05:1 — la tarjeta entera parecía vacía. Es la única
            categoría que sí vendemos, así que su identificador es el verde de
            marca (11.67:1 sobre la tarjeta) en el mismo hairline que usan sus
            tres hermanas, y el título va en tinta como ellas. */}
        <div style={{
          background: PALETTE.bgCard,
          border: `1px solid ${PALETTE.amber}`,
          boxShadow: CLARO.sombra,
          padding: '12px 14px'
        }}>
          <div style={{
            fontFamily: 'Archivo, sans-serif',
            fontWeight: 700, fontSize: 15,
            color: PALETTE.text,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            marginBottom: 4
          }}>Sin Licencia</div>
          <div style={window.amxProsa({ fontSize: 15.5, lineHeight: 1.6 })}>Armas traumáticas. No letales impulsadas por aire comprimido, menores a 140 Joules de potencia.</div>
        </div>
      </div>

      {/* REQUISITOS */}
      <SectionHeader>Requisitos SEDENA</SectionHeader>
      <div style={{
        background: PALETTE.bgCard,
        border: `1px solid ${PALETTE.border}`,
        padding: '14px',
        marginBottom: 22,
        position: 'relative'
      }}>
        <TacticalCorners size={10} color={PALETTE.amber} />
        {requisitos.map((r, i) =>
        <div key={i} style={window.amxProsa({
          fontSize: 16, color: PALETTE.text, lineHeight: 1.5,
          padding: '7px 0',
          borderBottom: i < requisitos.length - 1 ? `1px solid ${PALETTE.border}` : 'none',
          display: 'flex', alignItems: 'center', gap: 10
        })}>
            <span style={{
            width: 18, height: 18,
            border: `1px solid ${PALETTE.amber}`,
            color: PALETTE.amber,
            fontSize: 13, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>{String(i + 1).padStart(2, '0')}</span>
            <span>{r}</span>
          </div>
        )}
      </div>

      {/* PASOS DCAM */}
      <SectionHeader>Pasos para comprar en DCAM</SectionHeader>
      <div style={{ marginBottom: 22 }}>
        {pasos.map((s, i) =>
        <div key={i} style={{
          display: 'flex', gap: 12,
          padding: '12px 0',
          borderBottom: i < pasos.length - 1 ? `1px solid ${PALETTE.border}` : 'none'
        }}>
            <div style={{
            width: 32, height: 32,
            background: PALETTE.bgElev,
            border: `1.5px solid ${PALETTE.amber}`,
            color: PALETTE.amber,
            fontFamily: 'Archivo, sans-serif', fontWeight: 700,
            fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            letterSpacing: '0'
          }}>{String(i + 1).padStart(2, '0')}</div>
            <div>
              <div style={{
              fontFamily: 'Archivo, sans-serif',
              fontWeight: 600, fontSize: 15,
              color: PALETTE.text,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 4
            }}>{s.t}</div>
              <div style={window.amxProsa({ fontSize: 15.5, lineHeight: 1.6 })}>{s.d}</div>
            </div>
          </div>
        )}
      </div>

      {/* ASESORÍA WHATSAPP — oculta por el momento (abogado externo / asesoría legal) */}
      {false && (
      <div style={{
        background: `linear-gradient(135deg, ${PALETTE.bgCard} 0%, ${PALETTE.bgElev} 100%)`,
        border: `1.5px solid ${PALETTE.amber}`,
        padding: '16px 14px',
        marginBottom: 16,
        position: 'relative'
      }}>
        <TacticalCorners size={14} color={PALETTE.amber} thickness={2} />
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13, color: PALETTE.amber,
          letterSpacing: '0.2em', textTransform: 'uppercase',
          marginBottom: 6
        }}>▸ ABOGADO EXTERNO · ASESORÍA INDEPENDIENTE</div>
        <div style={{
          fontFamily: 'Archivo, sans-serif',
          fontWeight: 700, fontSize: 19,
          color: PALETTE.text,
          textTransform: 'uppercase',
          letterSpacing: '0.04em', lineHeight: 1.1,
          marginBottom: 8
        }}>Acompañamiento legal<br />con abogado especializado</div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 14.5, color: PALETTE.textDim,
          lineHeight: 1.6, marginBottom: 10
        }}>{waPitch}</div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13, color: PALETTE.textMuted,
          lineHeight: 1.55, marginBottom: 14,
          paddingTop: 8,
          borderTop: `1px dashed ${PALETTE.border}`
        }}>
          <b style={{ color: PALETTE.textDim }}>Nota:</b> el servicio jurídico es prestado por un abogado externo bajo su propia cédula profesional. Armas M&amp;S no es despacho jurídico y únicamente facilita el contacto; los honorarios se pactan directamente con el profesional.
        </div>
        <a href={`https://wa.me/${waPhone}?text=${encodeURIComponent(waMsg)}`}
        target="_blank" rel="noopener" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: PALETTE.amber, color: PALETTE.sobreMarca,
          textDecoration: 'none',
          padding: '12px 16px',
          fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 15,
          letterSpacing: '0.15em', textTransform: 'uppercase'
        }}>
          <span>Contactar al abogado</span>
          <span style={{ fontSize: 20.5}}>↗</span>
        </a>
      </div>
      )}
    </div>);

}
window.LegalScreen = LegalScreen;

// ════════════════════════════════════════════════════════════════
// ABOUT
// ════════════════════════════════════════════════════════════════
function AboutScreen() {
  const vp = window.useViewport();
  const padX = vp.isDesktop ? 28 : 16;
  const page = window.Store ? window.Store.getPages().about : null;
  const eyebrow = page?.eyebrow || '◆ ACERCA DE';
  const title = page?.title || 'Armado en México';
  const mision = page?.mision || 'Divulgar de forma rigurosa la información técnica, histórica y legal sobre las armas de fuego disponibles para civiles en México.';
  const autor = page?.autor || 'Saulo Flores';
  const empresa = page?.empresa || 'Armas M&S';
  const bio = page?.bio || 'Catálogo curado y mantenido con base en información oficial de DCAM, SEDENA y publicaciones técnicas de los fabricantes.';
  const aviso = page?.aviso || 'Las armas de fuego de este catálogo se muestran únicamente con fines informativos y de transparencia. Las únicas que comercializamos son las tres armas traumáticas menos letales.';
  const decl = window.ARMADO_DECLARACION || { titulo: 'Declaración de intenciones', parrafos: [] };
  return (
    <div style={{ padding: `0 ${padX}px 90px`, maxWidth: 800, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={{
        padding: '24px 0',
        textAlign: 'center',
        borderBottom: `1px solid ${PALETTE.border}`,
        marginBottom: 18
      }}>
        {/* LOGO Armado en México */}
        <div style={{
          width: 132, margin: '0 auto 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <img src="imagenes/logo-armado-mx.webp" alt="Armado en México" style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 14 }} />
        </div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13, color: PALETTE.amber,
          letterSpacing: '0.2em', marginBottom: 6
        }}>{eyebrow}</div>
        <div style={{
          fontFamily: 'Archivo, sans-serif',
          fontWeight: 700, fontSize: 26,
          color: PALETTE.text,
          textTransform: 'uppercase',
          letterSpacing: '0.04em', lineHeight: 1.05
        }}>{title}</div>
      </div>

      {/* 1 ▸ DISCLAIMER OFICIAL — NO SOMOS GOBIERNO */}
      <div style={{
        background: 'rgba(168,58,42,0.08)',
        border: `1px solid ${PALETTE.redHi}`,
        padding: 14, marginBottom: 18
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13, color: PALETTE.redHi,
          letterSpacing: '0.2em', textTransform: 'uppercase',
          marginBottom: 6, fontWeight: 700
        }}>▲ NO SOMOS GOBIERNO · FINES INFORMATIVOS</div>
        <div style={window.amxProsa({ fontSize: 16.5, color: PALETTE.text })}>
          Armado en México y Armas M&amp;S NO forman parte de DEFENSA (anteriormente SEDENA), DCAM ni de ninguna dependencia del gobierno mexicano. Somos un proyecto privado divulgativo. No comercializamos armas de fuego, municiones ni accesorios para ellas: se muestran solo con fines informativos y de transparencia. No tramitamos licencias ni permisos. Lo único que comercializamos son las tres armas traumáticas menos letales.
        </div>
      </div>

      {/* 2 ▸ DECLARACIÓN DE INTENCIONES */}
      <SectionHeader>{decl.titulo}</SectionHeader>
      <div style={{
        background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`, boxShadow: CLARO.sombra,
        padding: vp.isDesktop ? '20px 22px' : '16px', marginBottom: 18,
      }}>
        {decl.parrafos.map((t, i) => (
          <p key={i} style={window.amxProsa({
            margin: i === 0 ? 0 : '14px 0 0',
            fontSize: 17.5, color: i === 0 ? PALETTE.text : PALETTE.textDim,
          })}>{t}</p>
        ))}
        <div style={{
          marginTop: 18, paddingTop: 12, borderTop: `1px dashed ${PALETTE.border}`,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: PALETTE.textMuted, letterSpacing: '0.04em',
        }}>Armado en México · ¡Protege lo que amas!</div>
      </div>

      {/* 3 ▸ MISIÓN */}
      <SectionHeader>Misión</SectionHeader>
      <div style={{
        background: PALETTE.bgCard,
        border: `1px solid ${PALETTE.border}`,
        padding: 14, marginBottom: 18,
        position: 'relative'
      }}>
        <TacticalCorners size={10} color={PALETTE.amber} />
        <div style={window.amxProsa({ fontSize: 16.5, color: PALETTE.text })}>{mision}</div>
      </div>

      {/* 4 ▸ DIFERENCIA — ARMADO EN MÉXICO vs ARMAS M&S */}
      <SectionHeader>Armado en México vs. Armas M&amp;S</SectionHeader>
      <div style={{
        display: 'grid', gridTemplateColumns: vp.isDesktop ? '1fr 1fr' : '1fr',
        gap: 12, marginBottom: 18,
      }}>
        <div style={{ background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`, boxShadow: window.CLARO.sombra, borderTop: `2px solid ${PALETTE.amber}`, padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <img src="imagenes/logo-armado-mx.webp" alt="Armado en México" style={{ width: 36, height: 36, borderRadius: 7, flexShrink: 0, display: 'block' }} />
            <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 16, color: PALETTE.text, textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1.05 }}>Armado en México</div>
          </div>
          <div style={{ fontFamily: 'Archivo, system-ui, sans-serif', fontSize: 16, color: PALETTE.textDim, lineHeight: 1.65 }}>
            Una <span style={{ color: PALETTE.text }}>enciclopedia libre</span> que busca dar transparencia a toda la parte legal que las instituciones mantienen opaca para tener al pueblo desarmado e ignorante de sus derechos.
          </div>
        </div>
        <div style={{ background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`, boxShadow: window.CLARO.sombra, borderTop: `2px solid ${PALETTE.amber}`, padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 7, flexShrink: 0, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <img src="imagenes/logo-main.png" alt="Armas M&amp;S" style={{ width: '90%', height: 'auto', display: 'block' }} />
            </div>
            <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 16, color: PALETTE.text, textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1.05 }}>Armas M&amp;S</div>
          </div>
          <div style={{ fontFamily: 'Archivo, system-ui, sans-serif', fontSize: 16, color: PALETTE.textDim, lineHeight: 1.65 }}>
            Un <span style={{ color: PALETTE.text }}>proyecto digital de e-commerce</span> con tienda en <span style={{ color: PALETTE.amber }}>armasmys.com</span> y de divulgación en redes sociales (YouTube, Facebook e Instagram) sobre armamento y defensa personal.
          </div>
        </div>
      </div>

      {/* AUTOR */}
      <SectionHeader>Autor</SectionHeader>
      <div style={{
        background: PALETTE.bgCard,
        border: `1px solid ${PALETTE.border}`,
        padding: 14, marginBottom: 18,
        display: 'flex', gap: 16, alignItems: 'flex-start',
        flexWrap: 'wrap'
      }}>
        {/* FOTO */}
        <div style={{
          width: 120, height: 120,
          background: PALETTE.bgElev,
          position: 'relative',
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden'
        }}>
          {window.Store && window.Store.getPages().about.foto ?
          <img src={window.Store.getPages().about.foto} alt={autor}
          style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(0.15) contrast(1.05)' }} /> :

          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 13, color: PALETTE.textMuted,
            letterSpacing: '0.15em', textAlign: 'center',
            padding: 8, lineHeight: 1.5
          }}>
              <div style={{ fontSize: 38.5, color: PALETTE.amber, marginBottom: 4 }}>◯</div>
              FOTO<br />PENDIENTE
            </div>
          }
        </div>

        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{
            fontFamily: 'Archivo, sans-serif', fontWeight: 700,
            fontSize: 23, color: PALETTE.text,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            lineHeight: 1.1
          }}>{autor}</div>
          <div style={window.amxProsa({
            fontSize: 16, color: PALETTE.amber, marginTop: 6, lineHeight: 1.5
          })}>Co-Fundador de Armas M&amp;S<br />Creador de Armado en México</div>
          <div style={window.amxProsa({ fontSize: 16, marginTop: 10, lineHeight: 1.65 })}>{bio}</div>
        </div>
      </div>

      <div style={{
        textAlign: 'center',
        padding: '16px',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 13, color: PALETTE.textMuted,
        letterSpacing: '0.15em'
      }}>━━━ EDICIÓN 2026 · v1.0 ━━━</div>
    </div>);

}
window.AboutScreen = AboutScreen;

// ════════════════════════════════════════════════════════════════
// FAQ
// ════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════
// SOPORTE — normas de la comunidad, denuncias y moderación
// Existe porque la app acepta texto libre de desconocidos (las reseñas). Las
// normas están adaptadas de las de Steam, recortadas a lo que aquí hay: no hay
// Workshop, ni grupos, ni perfiles — hay reseñas y denuncias.
// ════════════════════════════════════════════════════════════════
function SoporteScreen({ onNav }) {
  const vp = window.useViewport();
  const padX = vp.isDesktop ? 28 : 16;
  const [den, setDen] = useState2({ reviewId: '', motivo: 'ilegal', detalle: '', email: '' });
  const [denEnviada, setDenEnviada] = useState2(false);
  const setD = (k, v) => setDen((p) => Object.assign({}, p, { [k]: v }));

  const MOTIVOS = [
    { value: 'ilegal', label: 'Compraventa u otra actividad ilegal' },
    { value: 'irrespetuoso', label: 'Insultos, acoso o amenazas' },
    { value: 'fuera-de-tema', label: 'Fuera de tema o mensaje repetido' },
    { value: 'comercial', label: 'Publicidad o contenido comercial' },
    { value: 'manipulacion', label: 'Manipulación de la calificación' },
    { value: 'datos', label: 'Datos personales de alguien' },
    { value: 'otro', label: 'Otro' },
  ];
  const denListo = den.detalle.trim().length >= 20;
  const enviarDenuncia = () => {
    if (!denListo || !window.Store) return;
    window.Store.addReport(den);
    setDenEnviada(true);
  };

  const Regla = ({ children }) => (
    <div style={window.amxProsa({
      fontSize: 16, color: PALETTE.text, lineHeight: 1.6, padding: '6px 0',
      display: 'flex', gap: 9, alignItems: 'flex-start'
    })}>
      <span style={{ color: PALETTE.amber, flexShrink: 0 }}>▸</span>
      <span>{children}</span>
    </div>
  );

  return (
    <div style={{ padding: `0 ${padX}px 90px`, maxWidth: 900, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

      <div style={{ padding: '20px 0', textAlign: 'center', borderBottom: `1px solid ${PALETTE.border}`, marginBottom: 18 }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: PALETTE.amber,
          letterSpacing: '0.2em', marginBottom: 6
        }}>◈ SOPORTE</div>
        <div style={{
          fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 23,
          color: PALETTE.text, textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.1
        }}>Normas de la comunidad</div>
        <div style={window.amxProsa({
          fontSize: 16, lineHeight: 1.6,
          marginTop: 10, maxWidth: 620, marginLeft: 'auto', marginRight: 'auto'
        })}>
          Las reseñas las escriben personas y las lee cualquiera. Estas normas dicen qué
          se puede publicar aquí, cómo denunciar lo que no cumple y qué pasa cuando se
          incumplen.
        </div>
      </div>

      {/* Lo primero, no enterrado en una lista: el uso que NO se tolera. */}
      <div style={{
        background: 'rgba(168,58,42,0.08)',
        border: `1px solid ${PALETTE.redHi}`,
        padding: 14, marginBottom: 22
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: PALETTE.redHi,
          letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700
        }}>▲ Prohibido usar esta app para comprar o vender</div>
        <div style={window.amxProsa({ fontSize: 16.5, color: PALETTE.text })}>
          Armado en México es un catálogo <b>divulgativo</b>. Aquí no se comercializan
          armas de fuego, municiones ni accesorios, y no somos intermediarios de ninguna
          venta.
          <div style={{ marginTop: 10 }}>
            Cualquier intento de usar las reseñas —o cualquier otro canal de esta
            aplicación— para <b>ofrecer, solicitar o intermediar la compraventa de armas,
            municiones o accesorios fuera de los canales legales</b> (DCAM y OTCA, con la
            autorización correspondiente de la SEDENA) conllevará el <b>bloqueo inmediato</b> y
            el <b>reporte a las autoridades competentes</b>, junto con la información
            asociada al envío.
          </div>
          <div style={{ marginTop: 10, color: PALETTE.textDim }}>
            Lo mismo aplica a pedir o dar instrucciones para modificar un arma de forma
            ilegal, alterar matrículas, o eludir el trámite ante la SEDENA.
          </div>
        </div>
      </div>

      <SectionHeader>Qué se puede publicar</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 26 }}>

        <window.Disclosure title="Respeto hacia las demás personas" defaultOpen>
          <div>
            <Regla>Nada de insultos, acoso ni burlas hacia otros usuarios, marcas, tiendas o autoridades.</Regla>
            <Regla>Nada de amenazas ni de incitación a la violencia, ni en broma.</Regla>
            <Regla>Nada de provocar peleas ni de discriminar por origen, género, religión, orientación o cualquier otra condición.</Regla>
            <Regla>Nada de acusaciones públicas contra personas concretas.</Regla>
            <Regla>Nada de publicar datos personales de nadie: nombres completos, domicilios, teléfonos, matrículas ni fotos de terceros.</Regla>
          </div>
        </window.Disclosure>

        <window.Disclosure title="La reseña va sobre el producto">
          <div>
            <Regla>Escribe sobre el arma, el accesorio, la munición o el lugar que estás reseñando: cómo se comporta, para qué sirve, qué te sorprendió.</Regla>
            <Regla>No uses las reseñas para hacer preguntas de trámite: para eso están las <b>preguntas frecuentes</b> y la <b>guía legal</b>.</Regla>
            <Regla>No repitas la misma reseña en varias fichas.</Regla>
            <Regla>Si un dato del catálogo está mal, no lo denuncies en una reseña: usa el botón <b>Sugerir cambios</b> de la ficha, que va directo a corregirlo.</Regla>
          </div>
        </window.Disclosure>

        <window.Disclosure title="Nada comercial">
          <div>
            <Regla>Sin anuncios, sin promociones y sin enlaces a tiendas, propias o ajenas.</Regla>
            <Regla>Sin ofertas de compra, venta, permuta o renta de nada.</Regla>
            <Regla>Sin rifas, sorteos ni captación de clientes.</Regla>
            <Regla>Si tienes una relación comercial con lo que reseñas —lo vendes, lo distribuyes, te lo regalaron— <b>dilo en la reseña</b>.</Regla>
          </div>
        </window.Disclosure>

        <window.Disclosure title="No manipular la calificación">
          <div>
            <Regla>Una opinión por persona y por ficha.</Regla>
            <Regla>Nada de enviar varias reseñas para inflar o hundir una calificación.</Regla>
            <Regla>Nada de pagar, cobrar ni presionar a nadie por escribir una reseña.</Regla>
            <Regla>Nada de campañas coordinadas contra un modelo, una marca o una tienda.</Regla>
          </div>
        </window.Disclosure>

      </div>

      <SectionHeader>Cómo se revisan las reseñas</SectionHeader>
      <div style={{
        background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`, boxShadow: window.CLARO.sombra,
        padding: '14px 16px', marginBottom: 26, position: 'relative'
      }}>
        <TacticalCorners size={10} color={PALETTE.amber} />
        <div style={window.amxProsa({ fontSize: 16 })}>
          <b style={{ color: PALETTE.text }}>Toda reseña se revisa antes de publicarse.</b> Al enviarla
          entra en una cola y no aparece en la ficha hasta que alguien comprueba que
          cumple estas normas. Puede tardar; que no se vea al instante no significa que
          se haya rechazado.
          <div style={{ marginTop: 10 }}>
            Pedimos un mínimo de {RESENA_MIN} caracteres a propósito: una opinión sin
            argumento no ayuda a nadie a decidir, y es lo que da derecho a que tu voto
            cuente en la calificación.
          </div>
          <div style={{ marginTop: 10 }}>
            Tu <b>correo no se publica nunca</b>: se guarda solo para poder contactarte si
            hay un problema con tu reseña, y se descarta al aprobarla.
          </div>
        </div>
      </div>

      <SectionHeader>Qué pasa si se incumplen</SectionHeader>
      <div style={{ marginBottom: 26 }}>
        {[
          ['01', 'No se publica', 'Si la reseña no cumple las normas, no llega a la ficha. Si dejaste correo, te avisamos del motivo.'],
          ['02', 'Se retira lo ya publicado', 'Una reseña publicada puede retirarse después si se detecta —o se denuncia— que incumple.'],
          ['03', 'Se restringe la participación', 'Quien incumple de forma repetida deja de poder publicar reseñas.'],
          ['04', 'Bloqueo y reporte', 'En los casos graves —compraventa ilegal, amenazas, explotación de menores— el bloqueo es inmediato y se reporta a las autoridades competentes con la información del envío.'],
        ].map(([n, tit, desc]) =>
          <div key={n} style={{ display: 'flex', gap: 13, padding: '11px 0', borderBottom: `1px solid ${PALETTE.border}` }}>
            <div style={{
              width: 32, height: 32, flexShrink: 0,
              border: `1px solid ${PALETTE.amber}`, color: PALETTE.amber,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700
            }}>{n}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 14.5,
                color: PALETTE.text, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4
              }}>{tit}</div>
              <div style={window.amxProsa({ fontSize: 15.5, lineHeight: 1.6 })}>{desc}</div>
            </div>
          </div>
        )}
        <div style={window.amxProsa({ fontSize: 15.5, lineHeight: 1.65, marginTop: 12 })}>
          <b style={{ color: PALETTE.text }}>¿Crees que nos equivocamos?</b> Denúncialo con el
          formulario de abajo indicando qué reseña era y por qué crees que sí cumplía.
          Moderar es un juicio y a veces sale mal; se revisa de nuevo.
        </div>
      </div>

      <SectionHeader>Denunciar contenido</SectionHeader>
      <div style={{
        background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`, boxShadow: window.CLARO.sombra,
        padding: '15px 16px', position: 'relative'
      }}>
        <TacticalCorners size={10} color={denEnviada ? PALETTE.green : PALETTE.amber} />
        {denEnviada ?
          <div>
            <div style={{
              fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 16,
              color: PALETTE.green, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8
            }}>✓ Denuncia recibida</div>
            <div style={window.amxProsa({ fontSize: 15.5, lineHeight: 1.6 })}>
              La revisaremos. Si dejaste correo, te contamos en qué quedó.
            </div>
          </div>
        :
          <div>
            <div style={window.amxProsa({ fontSize: 16, lineHeight: 1.65, marginBottom: 14 })}>
              Si ves una reseña que incumple estas normas, cuéntanoslo. No hace falta que
              respondas a quien la escribió: eso solo alarga el problema.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: vp.isDesktop ? '1fr 1fr' : '1fr', columnGap: 12 }}>
              {sfld('Qué reseña', 'reviewId', den, setD, { placeholder: 'Ficha y autor, o el texto que empieza por…', span: 2 })}
              {sfld('Motivo', 'motivo', den, setD, { select: MOTIVOS })}
              {sfld('Tu correo (opcional)', 'email', den, setD, { type: 'email', placeholder: 'para contarte en qué quedó' })}
              {sfld('Qué pasa con ella', 'detalle', den, setD, { ta: true, rows: 3, required: true, span: 2, placeholder: 'Explica brevemente por qué incumple.' })}
            </div>
            <button type="button" onClick={enviarDenuncia} disabled={!denListo} style={{
              width: '100%', marginTop: 4,
              background: denListo ? PALETTE.amber : 'transparent',
              color: denListo ? '#000' : PALETTE.textMuted,
              border: `1.5px solid ${denListo ? PALETTE.amber : PALETTE.border}`,
              padding: '13px', minHeight: 48,
              fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 14,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              cursor: denListo ? 'pointer' : 'not-allowed'
            }}>Enviar denuncia</button>
          </div>}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 22 }}>
        {[['legal', '§ Guía legal completa'], ['faq', '? Preguntas frecuentes']].map(([id, txt]) =>
          <button key={id} type="button" onClick={() => onNav && onNav(id)} style={{
            flex: '1 1 200px', background: 'transparent', color: PALETTE.amber,
            border: `1.5px dashed ${PALETTE.border}`, padding: '12px', minHeight: 48,
            fontFamily: 'Archivo, sans-serif', fontWeight: 600, fontSize: 13.5,
            letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer'
          }}>{txt} →</button>
        )}
      </div>
    </div>);

}
window.SoporteScreen = SoporteScreen;

function FAQScreen() {
  const vp = window.useViewport();
  const padX = vp.isDesktop ? 28 : 16;
  const [open, setOpen] = useState2(0);
  const faqs = window.Store ? window.Store.getPages().faq : [
  { q: '¿Puedo comprar un arma en cualquier tienda?', a: 'No. En México un arma de fuego solo puede adquirirse por los canales oficiales: la DCAM (Dirección de Comercialización de Armamento y Municiones de la SEDENA), en el Campo Militar No. 1 de la CDMX, y la OTCA, en Monterrey, N.L.' }];

  return (
    <div style={{ padding: `0 ${padX}px 90px`, maxWidth: 900, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      {/* El header móvil ya no pinta el título de pantalla: este bloque es el
          único encabezado y se centra en móvil para ocupar el sitio que dejó.
          En escritorio/tablet pasa a la izquierda —TopNav tampoco pinta título—
          para arrancar al margen de la columna de lectura de abajo. */}
      <div style={{
        padding: '20px 0',
        textAlign: vp.isMobile ? 'center' : 'left',
        borderBottom: `1px solid ${PALETTE.border}`,
        marginBottom: 18
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13, color: PALETTE.amber,
          letterSpacing: '0.2em', marginBottom: 6
        }}>? PREGUNTAS FRECUENTES</div>
        <div style={{
          fontFamily: 'Archivo, sans-serif',
          fontWeight: 700, fontSize: 23,
          color: PALETTE.text,
          textTransform: 'uppercase',
          letterSpacing: '0.04em', lineHeight: 1.1
        }}>FAQ</div>
      </div>

      {/* DISCLAIMER */}
      <div style={{
        background: 'rgba(168,58,42,0.08)',
        border: `1px solid ${PALETTE.redHi}`,
        padding: 14, marginBottom: 18
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13, color: PALETTE.redHi,
          letterSpacing: '0.2em', textTransform: 'uppercase',
          marginBottom: 6, fontWeight: 700
        }}>▲ AVISO DE TRANSPARENCIA</div>
        <div style={window.amxProsa({ fontSize: 16.5, color: PALETTE.text })}>
          Armado en México y Armas M&amp;S no son DEFENSA (anteriormente SEDENA) ni autoridad gubernamental. Las armas de fuego de esta app son informativas: no las comercializamos ni realizamos trámites ante ninguna dependencia. La única vía legal para adquirir un arma de fuego en México son los canales oficiales: la DCAM o la OTCA. Lo único que comercializamos directamente son las tres armas traumáticas menos letales.
          <br /><br />
          Armas M&amp;S no presta servicios jurídicos.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {faqs.map((f, i) =>
        <div key={i} style={{
          background: PALETTE.bgCard,
          border: `1px solid ${open === i ? PALETTE.amber : PALETTE.border}`
        }}>
            <button onClick={() => setOpen(open === i ? -1 : i)} style={{
            width: '100%',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '12px 14px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            gap: 10, textAlign: 'left'
          }}>
              <span style={{
              fontFamily: 'Archivo, sans-serif',
              fontWeight: 600, fontSize: 15,
              color: open === i ? PALETTE.amber : PALETTE.text,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              lineHeight: 1.25,
              flex: 1
            }}>{f.q}</span>
              <span style={{
              color: PALETTE.amber,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 19, flexShrink: 0
            }}>{open === i ? '−' : '+'}</span>
            </button>
            {open === i &&
          <div style={window.amxProsa({
            padding: '0 14px 14px',
            fontSize: 16.5,
            borderTop: `1px dashed ${PALETTE.border}`,
            paddingTop: 12
          })}>{f.a}</div>
          }
          </div>
        )}
      </div>
    </div>);

}
window.FAQScreen = FAQScreen;

// ════════════════════════════════════════════════════════════════
// MENU — pantalla "Más"
// ════════════════════════════════════════════════════════════════
function MenuScreen({ onNav, onTutorial }) {
  const vp = window.useViewport();
  const padX = vp.isDesktop ? 28 : 16;
  const items = [
  { id: 'traumaticas', icon: '◎', title: 'Armas traumáticas', desc: 'Defensa menos letal CO₂ .50/.68 · sin permiso SEDENA', accent: true },
  { id: 'accesorios', icon: '▫', title: 'Accesorios', desc: 'Equipamiento de adquisición legal en la DCAM · precio oficial' },
  { id: 'municiones', icon: '◉', title: 'Municiones', desc: 'Cartuchos por calibre · precio de referencia DCAM / OTCA' },
  { id: 'calibres', icon: '◉', title: 'Calibres', desc: 'Guía de munición: uso, balística y armas' },
  // Congeladas hasta el lanzamiento: visibles pero sin navegar. Ver PLACEHOLDERS.md.
  { id: 'campos', icon: '◎', title: 'Campos de tiro (Próximamente)', desc: 'Clubes y polígonos aliados', proximamente: true },
  { id: 'experiencias', icon: '✦', title: 'Experiencias (Próximamente)', desc: 'Formación y actividades de tiro', proximamente: true },
  { id: 'legal', icon: '§', title: 'Legalidad', desc: 'Trámite SEDENA y categorías legales' },
  { id: 'soporte', icon: '◈', title: 'Soporte y normas', desc: 'Normas de la comunidad, denuncias y moderación' },
  { id: 'faq', icon: '?', title: 'Preguntas frecuentes', desc: 'Dudas comunes sobre armas y trámites' },
  { id: 'about', icon: '◆', title: 'Acerca de', desc: 'Sobre Armado en México y M&S' },
  { id: 'tutorial', action: 'tutorial', icon: '▶', title: 'Ver tutorial', desc: 'Reproduce la introducción de bienvenida' },
  { id: 'submit', icon: '＋', title: 'Proponer arma', desc: 'Envía un arma para revisión' }];

  return (
    <div style={{ padding: `20px ${padX}px 90px`, maxWidth: 700, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      {/* Único encabezado de la pantalla desde que el header móvil dejó de
          pintar título: centrado en móvil, al margen en escritorio/tablet. */}
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 13, color: PALETTE.amber,
        letterSpacing: '0.2em', marginBottom: 14,
        textAlign: vp.isMobile ? 'center' : 'left'
      }}>☰ MÁS</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((it) =>
        <button key={it.id} disabled={it.proximamente}
          onClick={it.proximamente ? undefined : () => it.action === 'tutorial' ? (onTutorial && onTutorial()) : onNav(it.id)} style={{
          background: it.accent ? `linear-gradient(135deg, ${PALETTE.bgCard} 0%, ${PALETTE.bgElev} 100%)` : PALETTE.bgCard,
          border: `1px solid ${it.accent ? PALETTE.amber : PALETTE.border}`,
          padding: '14px',
          cursor: it.proximamente ? 'default' : 'pointer',
          opacity: it.proximamente ? 0.55 : 1,
          textAlign: 'left',
          display: 'flex', alignItems: 'center', gap: 14
        }}>
            <span style={{
            fontSize: 27.5, color: PALETTE.amber,
            width: 30, textAlign: 'center',
            fontFamily: 'JetBrains Mono, monospace'
          }}>{it.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{
              fontFamily: 'Archivo, sans-serif',
              fontWeight: 600, fontSize: 16,
              color: PALETTE.text,
              textTransform: 'uppercase',
              letterSpacing: '0.06em'
            }}>{it.title}</div>
              <div style={window.amxProsa({
                fontSize: 15, color: PALETTE.textMuted, lineHeight: 1.45, marginTop: 2
              })}>{it.desc}</div>
            </div>
            <span style={{ color: PALETTE.amber, fontSize: 20.5}}>›</span>
          </button>
        )}
      </div>

      <div style={window.amxProsa({
        marginTop: 30,
        padding: '14px',
        background: PALETTE.bgElev,
        border: `1px dashed ${PALETTE.border}`,
        fontSize: 15, color: PALETTE.textMuted, lineHeight: 1.6
      })}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', color: PALETTE.amber, fontWeight: 700,
          letterSpacing: '0.15em', marginBottom: 4, fontSize: 13
        }}>◆ ARMADO·MX</div>
        Catálogo divulgativo. Edición 2026. Contenido editado por Saulo Flores · Armas M&amp;S.
      </div>
    </div>);

}
window.MenuScreen = MenuScreen;

// ════════════════════════════════════════════════════════════════
// SUBMIT — Formulario público para proponer un arma
// ════════════════════════════════════════════════════════════════
function SubmitScreen({ onNav }) {
  const vp = window.useViewport();
  const padX = vp.isDesktop ? 28 : 16;
  const [sent, setSent] = useState2(false);
  const [f, setF] = useState2({
    submitterName: '', submitterEmail: '', submitterMessage: '',
    nombre: '', marca: '', tipo: 'pistola', pais: '',
    calibre: '', capacidad: '', peso: '', longitud: '', mecanismo: '',
    anio: new Date().getFullYear(), img: '',
    historia: '', avail: 'dcam'
  });
  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!f.submitterName || !f.nombre || !f.marca || !f.calibre) {
      alert('Faltan campos obligatorios: tu nombre, nombre del arma, marca y calibre.');
      return;
    }
    window.Store.addPending({
      submitterName: f.submitterName,
      submitterEmail: f.submitterEmail,
      submitterMessage: f.submitterMessage,
      nombre: f.nombre, marca: f.marca, tipo: f.tipo, pais: f.pais,
      calibre: f.calibre, capacidad: f.capacidad, peso: f.peso,
      longitud: f.longitud, mecanismo: f.mecanismo,
      anio: Number(f.anio) || new Date().getFullYear(),
      era: 'moderno',
      img: f.img, historia: f.historia,
      avail: f.avail, availLabel: window.CATEGORIES.disponibilidad.find((d) => d.id === f.avail)?.label || 'Civil',
      uses: ['domicilio', 'club'],
      priceLvl: 2, priceExact: 'Por confirmar',
      stats: { alcance: 50, precision: 50, retroceso: 50, capacidad: 50, manejo: 50, poder: 50 },
      disponibilidad: [], dcamRef: '', legalTit: '', legalDesc: ''
    });
    setSent(true);
  };

  if (sent) {
    return (
      <div style={{ padding: `40px ${padX}px 90px`, maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          fontSize: 67, color: PALETTE.amber, marginBottom: 20, lineHeight: 1
        }}>✓</div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 14.5, color: PALETTE.amber,
          letterSpacing: '0.25em', marginBottom: 10
        }}>◆ ENVÍO RECIBIDO</div>
        <div style={{
          fontFamily: 'Archivo, sans-serif', fontWeight: 700,
          fontSize: 26, color: PALETTE.text, textTransform: 'uppercase',
          lineHeight: 1.1, letterSpacing: '0.02em', marginBottom: 14
        }}>¡Gracias por contribuir!</div>
        <div style={window.amxProsa({ fontSize: 17, marginBottom: 28 })}>
          Tu propuesta entró en la cola de revisión. Saulo Flores revisará la información,
          podrá enriquecerla con datos técnicos adicionales, y publicarla en el catálogo cuando esté lista.
          {f.submitterEmail && <div style={{ marginTop: 10, color: PALETTE.amber }}>
            Te avisaremos por correo a <b>{f.submitterEmail}</b> cuando se publique.
          </div>}
        </div>
        <button onClick={() => onNav('home')} style={{
          background: PALETTE.amber, color: PALETTE.sobreMarca, border: 'none',
          padding: '12px 24px',
          fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 15,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          cursor: 'pointer', marginRight: 8
        }}>Volver al inicio</button>
        <button onClick={() => {setSent(false);setF((prev) => ({ ...prev, nombre: '', marca: '', calibre: '', img: '', historia: '' }));}} style={{
          background: 'transparent', color: PALETTE.text,
          border: `1px solid ${PALETTE.border}`,
          padding: '12px 24px',
          fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 15,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          cursor: 'pointer'
        }}>Enviar otra</button>
      </div>);

  }

  const fld = (label, k, props = {}) =>
  <div style={{ marginBottom: 14, gridColumn: props.span === 2 ? '1 / -1' : 'auto' }}>
      <label style={sLblStyle()}>{label} {props.required && <span style={{ color: PALETTE.amber }}>*</span>}</label>
      {props.ta ?
    <textarea value={f[k]} onChange={(e) => set(k, e.target.value)}
    rows={props.rows || 3} style={sInpStyle()} placeholder={props.placeholder} /> :
    props.select ?
    <select value={f[k]} onChange={(e) => set(k, e.target.value)} style={sInpStyle()}>
          {props.select.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select> :

    <input type={props.type || 'text'} value={f[k]} onChange={(e) => set(k, e.target.value)}
    style={sInpStyle()} placeholder={props.placeholder} />
    }
    </div>;


  return (
    <form onSubmit={submit} style={{ padding: `0 ${padX}px 90px`, maxWidth: 880, margin: '0 auto' }}>
      <div style={{
        padding: '24px 0',
        textAlign: 'center',
        borderBottom: `1px solid ${PALETTE.border}`,
        marginBottom: 22
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13, color: PALETTE.amber,
          letterSpacing: '0.25em', marginBottom: 8
        }}>＋ COLABORA</div>
        <div style={{
          fontFamily: 'Archivo, sans-serif', fontWeight: 700,
          fontSize: 28, color: PALETTE.text, textTransform: 'uppercase',
          lineHeight: 1, letterSpacing: '0.04em', marginBottom: 10
        }}>Proponer un arma</div>
        <div style={window.amxProsa({
          fontSize: 16.5, lineHeight: 1.6, maxWidth: 540, margin: '0 auto'
        })}>¿Tienes información de un arma que falta en el catálogo? Compártela. Revisaremos tu envío y lo publicaremos si cumple los criterios divulgativos.</div>
      </div>

      <SectionHeader>Sobre ti</SectionHeader>
      <div style={{ background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`, boxShadow: window.CLARO.sombra, padding: 18, marginBottom: 24, display: 'grid', gridTemplateColumns: vp.isDesktop ? '1fr 1fr' : '1fr', gap: '0 16px' }}>
        {fld('Tu nombre', 'submitterName', { required: true, placeholder: 'Cómo apareces en los créditos' })}
        {fld('Correo (opcional)', 'submitterEmail', { type: 'email', placeholder: 'Para avisarte cuando se publique' })}
        {fld('Comentario (opcional)', 'submitterMessage', { ta: true, rows: 2, span: 2, placeholder: 'Cualquier nota: fuentes, dudas, contexto...' })}
      </div>

      <SectionHeader>Datos del arma</SectionHeader>
      <div style={{ background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`, boxShadow: window.CLARO.sombra, padding: 18, marginBottom: 24, display: 'grid', gridTemplateColumns: vp.isDesktop ? '1fr 1fr' : '1fr', gap: '0 16px' }}>
        {fld('Nombre del arma', 'nombre', { required: true, placeholder: 'CZ Shadow 2' })}
        {fld('Marca / fabricante', 'marca', { required: true, placeholder: 'Ceska Zbrojovka' })}
        {fld('Tipo', 'tipo', { select: [
          { value: 'pistola', label: 'Pistola' }, { value: 'revolver', label: 'Revólver' },
          { value: 'rifle', label: 'Rifle' }, { value: 'escopeta', label: 'Escopeta' },
          { value: 'carabina', label: 'Carabina' }]
        })}
        {fld('País de origen', 'pais', { placeholder: 'República Checa' })}
        {fld('Calibre', 'calibre', { required: true, placeholder: '9mm Parabellum' })}
        {fld('Capacidad', 'capacidad', { placeholder: '17+1' })}
        {fld('Peso', 'peso', { placeholder: '1,270g' })}
        {fld('Longitud', 'longitud', { placeholder: '206mm' })}
        {fld('Mecanismo', 'mecanismo', { placeholder: 'Semi-auto, DA/SA, metal completo', span: 2 })}
        {fld('Año de introducción', 'anio', { type: 'number' })}
        {fld('Disponibilidad legal', 'avail', { select: [
          { value: 'dcam', label: 'Civil — DCAM' },
          { value: 'externo', label: 'Civil con licencia externa' },
          { value: 'seguridad', label: 'Policía / Seguridad' },
          { value: 'ejercito', label: 'Exclusivo Ejército' }]
        })}
        {fld('URL de imagen (opcional)', 'img', { placeholder: 'https://...jpg', span: 2 })}
        {fld('Historia / contexto', 'historia', { ta: true, rows: 5, placeholder: 'Datos históricos, fabricante, usos notables, año de introducción al mercado mexicano...', span: 2 })}
      </div>

      <div style={window.amxProsa({
        background: PALETTE.bgElev, border: `1px dashed ${PALETTE.border}`,
        padding: 14, marginBottom: 22,
        fontSize: 15, color: PALETTE.textMuted, lineHeight: 1.6
      })}>
        <b style={{ color: PALETTE.amber }}>◆ Nota:</b> tu envío no se publica automáticamente. Pasa primero por la revisión. Pueden completarse datos faltantes (precio, ficha legal, ref. DCAM), corregir errores y enriquecerlo con fotografía oficial.
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button type="button" onClick={() => onNav('home')} style={{
          background: 'transparent', color: PALETTE.textDim,
          border: `1px solid ${PALETTE.border}`,
          padding: '12px 22px',
          fontFamily: 'Archivo, sans-serif', fontWeight: 600, fontSize: 14,
          letterSpacing: '0.15em', textTransform: 'uppercase',
          cursor: 'pointer'
        }}>Cancelar</button>
        <button type="submit" style={{
          background: PALETTE.amber, color: PALETTE.sobreMarca, border: 'none',
          padding: '12px 26px',
          fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 15,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          cursor: 'pointer'
        }}>＋ Enviar propuesta</button>
      </div>
    </form>);

}

window.SubmitScreen = SubmitScreen;