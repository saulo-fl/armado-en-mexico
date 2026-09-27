// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Armado en México — Pantallas de MUNICIONES (cartuchos)
// Card, sección de Home (carrusel de calibres de entrada), catálogo con filtros y ficha
// con precio + historial de inventarios (mismo patrón que armas/accesorios).
// Expone en window: MunicionCard, HomeMunicionesSection, MunicionesScreen, MunicionFicha

const { useState: useStateMun, useMemo: useMemoMun } = React;

function munCatMeta(cal) {
  return (window.MUNICION_CATEGORIES.categoria.find(c => c.id === cal)) || { label: cal, icon: '◉' };
}

// Imagen del cartucho por calibre (reusa imagenes/cartuchos/*.webp)
const MUN_CARTUCHO = {
  '.22 LR': '22lr.webp', '.380 ACP': '380acp.webp', '.38 Special': '38special.webp',
  '.38 Super': '38super.webp', '9mm Parabellum': '9mm.webp', '.40 S&W': '40sw.webp',
  '12 GA': '12ga.webp', '20 GA': '20ga.webp', '.410 Bore': '410.webp',
  '5.56x45mm': '556.webp', '7.62x39mm': '762x39.webp', '7.62x51mm': '762x51.webp',
  '.243 Win': '243win.webp', '.270 Win': '270win.webp', '.308 Win': '308win.webp',
  '.30-06 Sprg': '3006.webp', '.300 Win Mag': '300wm.webp',
};
// 19 calibres tienen fotografía real del cartucho. Los que no —11 municiones de
// 71, en 7 calibres: .22-250, .17 HMR, .30-30, 28 GA, .30 Carbine, 9x18 Makarov
// y 6mm Rem— caían en cadena vacía y dejaban el hueco sin nada. Ahora reciben la
// silueta genérica de cartucho, el mismo lenguaje que armas y accesorios.
function munCartucho(cal) {
  return MUN_CARTUCHO[cal]
    ? ('imagenes/cartuchos/' + MUN_CARTUCHO[cal])
    : 'imagenes/silueta-municion.webp';
}

// El PNG del cartucho es del CALIBRE: manda en la home de calibres y en la guía
// educativa, donde lo que se enseña es el calibre. Pero la tarjeta y la ficha de
// un cartucho son de una MARCA concreta, y ahí lo que identifica al producto es
// su CAJA — que es como se compra y como se reconoce en el mostrador. `mun.img`
// la resuelve data-municiones.js por marca+calibre; cuando no hay caja (marcas
// que no publican foto), se cae al PNG del calibre, que sigue siendo correcto.
// El encuadre cambia con la foto: la caja es apaisada y el cartucho es un huso.
function munFoto(mun) {
  return mun.img ? { src: mun.img, caja: true }
                 : { src: munCartucho(mun.calibre), caja: false };
}
window.munFoto = munFoto;

// Unidad del precio de referencia. El inventario cotiza casi todo POR CARTUCHO,
// pero no todo: la 2046 (9mm PMC) viene por caja y su descripción lo dice — por
// eso cuesta $406 y no $6. Sin este chequeo la tarjeta la etiquetaría mal.
// Única fuente de verdad para la tarjeta Y la ficha.
function munUnidadPrecio(mun) {
  return /por\s+caja/i.test((mun && mun.descripcion) || '') ? 'caja' : 'cartucho';
}
window.munUnidadPrecio = munUnidadPrecio;

// ════════════════════════════════════════════════════════════════
// MUNICION CARD — tarjeta horizontal (gemela de ArmaCard/AccesorioCard)
// ════════════════════════════════════════════════════════════════
function MunicionCard({ mun, onClick }) {
  const P = window.PALETTE;
  const [imgError, setImgError] = useStateMun(false);
  const foto = munFoto(mun);
  return (
    <div onClick={onClick} style={{
      position: 'relative', background: window.CLARO.panel,
      borderRadius: window.CLARO.radio, border: `1px solid ${window.CLARO.hair}`,
      // La sombra la pone .amx-card en estilo.css (ver ui.jsx/ArmaCard).
      cursor: 'pointer', overflow: 'hidden',
      height: '100%', display: 'flex', flexDirection: 'row',
      contentVisibility: 'auto', containIntrinsicSize: 'auto 150px',
    }} className="amx-card">
      {/* foto: caja de la marca; sin caja, cartucho del calibre */}
      <div style={{
        width: '42%', flexShrink: 0, alignSelf: 'stretch', minHeight: 112,
        background: `radial-gradient(circle at 50% 50%, ${window.CLARO.panelHi} 0%, ${P.bg} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', borderRight: `1px solid ${window.CLARO.hair}`, overflow: 'hidden',
        // El padding superior reserva la banda del badge de calibre (absolute, top 6):
        // sin el, el panel es tan estrecho que la foto centrada se le mete debajo.
        boxSizing: 'border-box', padding: '28px 6px 8px',
      }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(0deg, transparent 0 3px, rgba(221,213,196,0.03) 3px 4px)` }} />
        {foto.src && !imgError ? (
          <img src={foto.src} alt={foto.caja ? `${mun.marca} ${mun.calibre}` : mun.calibre}
            loading="lazy" decoding="async" onError={() => setImgError(true)}
            style={{
              maxHeight: foto.caja ? '76%' : '82%', maxWidth: foto.caja ? '92%' : '60%',
              objectFit: 'contain', position: 'relative', zIndex: 1,
            }} />
        ) : (
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 18, color: window.CLARO.tinta2,
            opacity: 0.85, position: 'relative', zIndex: 1, letterSpacing: '0.06em',
          }}>◉</span>
        )}
        <span style={{
          position: 'absolute', top: 6, left: 6,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700,
          // Badge de calibre sobre la PLACA fotográfica, que es clara en los dos
          // temas: su relleno y su tinta tampoco cambian. Crema sobre el
          // gris-verde --tinta-placa (#59605C): 5.62:1. CLARO.tinta2 no vale
          // aquí — en oscuro se aclara y dejaría crema sobre gris claro.
          color: P.sobreMarca, background: 'var(--tinta-placa)', padding: '2px 5px',
          letterSpacing: '0.08em', whiteSpace: 'nowrap',
        }}>{mun.calibre}</span>
      </div>
      {/* body */}
      <div style={{ padding: '10px 12px 12px', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, minWidth: 0 }}>
          {window.CountryFlag && <window.CountryFlag pais={mun.pais} height={12} />}
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: window.CLARO.tinta2,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{mun.marca}</span>
        </div>
        <div style={{
          fontFamily: 'Archivo, sans-serif', fontWeight: 600, fontSize: 16,
          color: window.CLARO.tinta, textTransform: 'uppercase', lineHeight: 1.15, marginBottom: 6,
          letterSpacing: '0.02em', height: 38,
          display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden',
        }}>{mun.nombre}</div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: window.CLARO.tinta2, marginBottom: 8,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          <span style={{ color: window.CLARO.tinta2 }}>BALA </span>{mun.bala}{mun.grano ? ` · ${mun.grano}` : ''}
        </div>
        {/* La cifra sustituye a la escala $$$··: es estrictamente más informativa
            para quien compara municiones. La unidad sale de munUnidadPrecio. */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '4px 8px', flexWrap: 'wrap', marginTop: 'auto' }}>
          <window.AvailBadge avail={mun.avail} compact />
          {mun.priceExact ? (
            <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5, whiteSpace: 'nowrap' }}>
              <span style={{
                fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 15,
                color: window.CLARO.tinta2, fontVariantNumeric: 'tabular-nums',
              }}>{String(mun.priceExact).replace(' MXN', '')}</span>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: window.CLARO.tinta2,
                letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>/ {munUnidadPrecio(mun)}</span>
            </span>
          ) : (
            <window.PriceLevel lvl={mun.priceLvl} />
          )}
        </div>
      </div>
    </div>
  );
}
window.MunicionCard = MunicionCard;

// ════════════════════════════════════════════════════════════════
// HOME — "Municiones" como PUESTO DE TIANGUIS
// «Las municiones cambiarán de su ficha plana por un objeto que sea
// interactivo. Las cajas de municiones con transparencia sobre una mesa y al
// pasar el mouse por encima se iluminan ligeramente por detrás. Y sus letreros
// serán como los típicos letreros mexicanos de los tianguis y mercados de
// frutería» (tablero del 8-sep-2026).
//
// La mesa y la vara van dibujadas en CSS mientras llegan las fotos reales; la
// caja NO, esa ya es fotografía recortada.
// ════════════════════════════════════════════════════════════════

// La caja que representa al calibre en la portada. Aquí no hay una marca
// concreta —la tarjeta es del CALIBRE—, así que se toma la primera munición de
// ese calibre que tenga caja: en el mostrador el calibre se reconoce por
// cualquiera de sus cajas. Sin ninguna cae al PNG del cartucho, que es lo que
// había antes y sigue siendo correcto.
//
// Dos calibres llevan marca elegida a mano (Saulo, 9-sep-2026): las cuatro
// cajas de la mesa tienen que MIRAR AL MISMO LADO —de frente y en diagonal
// hacia la izquierda, como las PMC Bronze— y por orden de catálogo salían la
// Trust azul de frente en 12 GA y la Fiocchi Dynamics tumbada en .308 Win.
// El mapa es solo para el Home; la ficha de cada munición sigue con su caja.
const CAJA_DEL_HOME = { '12 GA': 'GB', '.308 Win': 'PMC' };

function munCajaDeCalibre(cal) {
  const conCaja = (window.MUNICIONES || []).filter(x => x.calibre === cal && x.img);
  const marca = CAJA_DEL_HOME[cal];
  const m = (marca && conCaja.find(x => x.marca === marca)) || conCaja[0];
  return m
    ? { src: m.img, alt: `Caja de ${m.marca} ${cal}` }
    : { src: munCartucho(cal), alt: cal };
}

function HomeMunicionesSection({ onNav }) {
  const P = window.PALETTE;
  const PAD = 16;
  const cats = window.MUNICION_CATEGORIES.categoria;
  const total = (window.MUNICIONES || []).length;
  if (!total) return null;
  const counts = {};
  (window.MUNICIONES || []).forEach(m => { counts[m.calibre] = (counts[m.calibre] || 0) + 1; });
  const conStock = cats.filter(c => counts[c.id]);
  // Home: solo los calibres de entrada. El resto vive detras de «Ver todas».
  // No hay .22 rimfire en los inventarios DCAM/OTCA: cierra el .308 Win (hay Aguila).
  const DESTACADOS = ['.380', '9mm', '12 GA', '.308 Win'];
  const destacados = DESTACADOS.flatMap(p => conStock.filter(c => c.id.startsWith(p)));
  // Cuatro puestos exactos: la mesa es una rejilla, no un carrusel, y con cinco
  // el quinto abriría una segunda fila con la tabla cortada a un cuarto.
  const visible = (destacados.length ? destacados : conStock).slice(0, 4);

  return (
    <div style={{ marginBottom: 20, maxWidth: 1280, marginLeft: 'auto', marginRight: 'auto' }}>
      <div style={{ padding: `0 ${PAD}px`, margin: '25px 0 10px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <div style={{
            fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 21, color: P.text,
            textTransform: 'uppercase', letterSpacing: '0.04em', flex: '1 1 auto', minWidth: 0, whiteSpace: 'nowrap',
          }}>Municiones</div>
          {/* Mismo caso que en accesorios: el objeto estaba copiado a mano y en P.amber,
              que es el VERDE de marca. estiloAccion(false) trae el rojo de accion
              #A3341F (5.96:1 sobre el lienzo #F3EFE4) y los 44px de area tactil. */}
          <button onClick={() => onNav && onNav('municiones')}
            style={window.estiloAccion(false)}>Ver todas →</button>
        </div>
      </div>

      <div className="amx-puestos" style={{ padding: `0 ${PAD}px` }}>
        {visible.map(c => {
          const caja = munCajaDeCalibre(c.id);
          return (
            <button key={c.id} type="button" className="amx-puesto"
              aria-label={`${c.label} — ${counts[c.id]} ${counts[c.id] === 1 ? 'munición' : 'municiones'}`}
              onClick={() => onNav && onNav('municiones', { categoria: c.id })}>
              {/* El nombre del calibre es TEXTO sobre el cartel, no parte del
                  dibujo: sale del dato y lo lee un lector de pantalla. */}
              <span className="amx-puesto-letrero">
                <span className="amx-puesto-rotulo">{c.label}</span>
              </span>
              <span className="amx-puesto-palo" aria-hidden="true" />
              <span className="amx-puesto-luz" aria-hidden="true" />
              {/* alt vacío a propósito: el botón ya se anuncia con el calibre y
                  su cuenta, y repetir «Caja de PMC .380 ACP» detrás lo duplica. */}
              <img className="amx-puesto-caja" src={caja.src} alt="" loading="lazy" decoding="async" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
window.HomeMunicionesSection = HomeMunicionesSection;

// ════════════════════════════════════════════════════════════════
// CATÁLOGO DE MUNICIONES — la vitrina (mismo patrón que AccesoriosScreen)
// Toldo de lona, separadores de fichero por calibre y un puesto por cartucho
// con su etiqueta de marca, condición legal, bala/grano y precio por unidad.
// Decidido con Saulo: la sección de MUNICIONES comparte estética de mesa y
// fondo con la pantalla de ACCESORIOS.
// La categoría activa vive en la URL (app.jsx): aquí solo se lee y se avisa con
// `onCategoria` al cambiar de separador.
// ════════════════════════════════════════════════════════════════
function MunicionesScreen({ initialFilter, onOpenMunicion, onCategoria }) {
  const vp = window.useViewport();
  // 2 por fila en móvil, 4 en tableta (solo para que no se rompa) y 6 desde el
  // corte único de 1024 px.
  const porFila = vp.width < 720 ? 2 : vp.width < 1024 ? 4 : 6;
  const secciones = window.municionesVitrina('all');
  const pedida = initialFilter && initialFilter.categoria;
  const activo = secciones.some((s) => s.id === pedida) ? pedida : 'all';
  const visibles = window.municionesVitrina(activo);
  const opciones = [{ id: 'all', label: 'Todas' }].concat(secciones.map((s) => ({ id: s.id, label: s.label })));
  const sellos = window.SELLOS_LEGALES || {};
  const datosPuesto = (m) => {
    const sello = sellos[m.avail] || sellos.dcam;
    const detalle = [m.bala, m.grano].filter(Boolean).join(' · ');
    const precio = m.priceExact ? String(m.priceExact).replace(' MXN', '') : '';
    const unidad = munUnidadPrecio(m);
    return { sello, detalle, precio, unidad };
  };

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

  return (
    <div className="amx-vitrina-acc">
      <window.ToldoLona>Municiones</window.ToldoLona>
      <window.SeparadoresFiltro etiqueta="Calibres" opciones={opciones}
        activo={activo} controla="vitrina-mun-panel" onCambiar={(id) => onCategoria && onCategoria(id)} />
      <div id="vitrina-mun-panel" role="tabpanel" aria-labelledby={'separador-' + activo}>
        {visibles.map((s) => (
          <section key={s.id} className="amx-vitrina-acc-seccion" aria-labelledby={'vitrina-mun-' + s.id}>
            <window.CintaDymo id={'vitrina-mun-' + s.id}>{s.label}</window.CintaDymo>
            <window.MesaPuestos items={s.piezas} porFila={porFila}
              renderPuesto={puesto} renderEtiqueta={etiqueta} />
          </section>
        ))}
      </div>
    </div>
  );
}
window.MunicionesScreen = MunicionesScreen;

// ════════════════════════════════════════════════════════════════
// FICHA DE MUNICIÓN — detalle + precio referencia + historial + armas compatibles
// ════════════════════════════════════════════════════════════════
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
