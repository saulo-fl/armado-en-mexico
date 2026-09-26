// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Armado en México — Pantallas de MUNICIONES (cartuchos)
// Card, sección de Home (carrusel de calibres de entrada), catálogo con filtros y ficha
// con precio + historial de inventarios (mismo patrón que armas/accesorios).
// Expone en window: MunicionCard, HomeMunicionesSection, MunicionesScreen, MunicionFicha

const { useState: useStateMun, useMemo: useMemoMun } = React;

function munFmtDate(f) {
  if (!f) return '';
  const d = new Date(String(f).length === 10 ? f + 'T12:00:00' : f);
  if (isNaN(d)) return String(f);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}
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
function MunicionFicha({ municionId, onOpenMunicion, onOpenArma }) {
  const P = window.PALETTE;
  const vp = window.useViewport();
  const padX = vp.isDesktop ? 28 : 16;
  const mun = window.getMunicionById(municionId);

  if (!mun) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', color: P.textMuted }}>
        Munición no encontrada.
      </div>
    );
  }

  const foto = munFoto(mun);
  const availMeta = window.MUNICION_CATEGORIES.disponibilidad.find(d => d.id === mun.avail);
  const priceHistory = window.getMunicionPriceHistory(mun.id);
  const existencias = window.getMunicionExistencias(mun.id);
  const armasComp = window.getArmasParaMunicion(mun);
  const manualById = (id) => window.getMunicionManual(id);
  const currentManual = manualById(mun.priceManualId) ||
    (priceHistory.length ? manualById(priceHistory[priceHistory.length - 1].manualId) : null) ||
    window.getMunicionPrimaryManual();
  const curAut = window.manualAutoridad ? window.manualAutoridad(currentManual) : null;
  const curSigla = curAut ? curAut.sigla : 'OTCA';
  const relacionados = (window.MUNICIONES || []).filter(m => m.calibre === mun.calibre && m.id !== mun.id).slice(0, 6);

  const [imgError, setImgError] = useStateMun(false);

  return (
    <div style={{ paddingBottom: 90, maxWidth: 1100, margin: '0 auto', width: '100%' }}>
      <div style={{
        display: vp.isDesktop ? 'grid' : 'block',
        gridTemplateColumns: vp.isDesktop ? '1fr 1fr' : 'none', gap: 24,
        padding: `20px ${padX}px 0`,
      }}>
        <div style={{
          position: 'relative', background: `radial-gradient(circle at 50% 45%, ${P.bgElev} 0%, ${P.bg} 100%)`,
          border: `1px solid ${P.border}`, minHeight: 240, aspectRatio: vp.isDesktop ? 'auto' : '4/3',
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        }}>
          <window.TacticalCorners size={14} color={P.amber} thickness={2} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(0deg, transparent 0 3px, rgba(221,213,196,0.03) 3px 4px)` }} />
          {foto.src && !imgError
            ? <img src={foto.src} alt={foto.caja ? `Caja de ${mun.marca} ${mun.calibre}` : mun.calibre}
                onError={() => setImgError(true)}
                style={{
                  maxHeight: foto.caja ? '74%' : '78%', maxWidth: foto.caja ? '84%' : '46%',
                  objectFit: 'contain', position: 'relative', zIndex: 1,
                }} />
            : <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 60, color: P.amber, opacity: 0.85, position: 'relative', zIndex: 1 }}>◉</span>}
          <span style={{
            position: 'absolute', top: 10, left: 10,
            // Badge de calibre en la ficha: fondo P.amber = verde de marca #173A32,
            // con negro encima daba 1.69:1. Crema: 10.83:1.
            fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: P.tintaSobreMarca,
            background: P.amber, padding: '3px 7px', letterSpacing: '0.08em', fontWeight: 700,
          }}>{mun.calibre}</span>
        </div>

        <div style={{ paddingTop: vp.isDesktop ? 4 : 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            {window.CountryFlag && <window.CountryFlag pais={mun.pais} height={14} />}
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 14.5, color: P.amber,
              letterSpacing: '0.16em', textTransform: 'uppercase',
            }}>{mun.marca}{mun.pais ? ` · ${mun.pais}` : ''}</span>
          </div>
          <h1 style={{
            fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: vp.isDesktop ? 30 : 25,
            color: P.text, textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.08, margin: '0 0 12px',
          }}>{mun.nombre}</h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            <window.AvailBadge avail={mun.avail} />
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: P.bgCard, border: `1px solid ${P.border}`, padding: '3px 9px',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: P.textDim,
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}><span style={{ color: P.amber }}>◉</span>{mun.calibre}</span>
          </div>
          {mun.descripcion &&
            <p style={{
              fontFamily: 'Archivo, system-ui, sans-serif', fontSize: 17.5, color: P.textDim,
              lineHeight: 1.65, margin: '0 0 6px', textWrap: 'pretty',
            }}>{mun.descripcion}</p>
          }
        </div>
      </div>

      <div style={{
        display: vp.isDesktop ? 'grid' : 'block',
        gridTemplateColumns: vp.isDesktop ? '1fr 1fr' : 'none', gap: 24,
        padding: `20px ${padX}px 0`,
      }}>
        <div>
          {mun.specs && mun.specs.length > 0 &&
            <React.Fragment>
              <window.SectionHeader>Especificaciones</window.SectionHeader>
              <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, boxShadow: window.CLARO.sombra, marginBottom: 16 }}>
                {mun.specs.map(([k, v], i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 12px',
                    borderBottom: i < mun.specs.length - 1 ? `1px solid ${P.border}` : 'none',
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 15.5,
                  }}>
                    <span style={{ color: P.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</span>
                    <span style={{ color: P.text, fontWeight: 600, textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
              </div>
            </React.Fragment>
          }
          {mun.compatibilidad && mun.compatibilidad.length > 0 &&
            <React.Fragment>
              <window.SectionHeader>Compatible con</window.SectionHeader>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                {mun.compatibilidad.map((c, i) => (
                  <span key={i} style={{
                    background: P.bgCard, border: `1px solid ${P.border}`,
                    padding: '6px 10px', fontFamily: 'JetBrains Mono, monospace', fontSize: 14.5,
                    color: P.text, letterSpacing: '0.06em',
                  }}>{c}</span>
                ))}
              </div>
            </React.Fragment>
          }
        </div>

        <div>
          <window.SectionHeader>Precio de Referencia</window.SectionHeader>
          <div style={{ background: P.bgCard, border: `1px solid ${P.amber}`, padding: '14px', marginBottom: 16, position: 'relative' }}>
            <window.TacticalCorners size={12} color={P.amber} thickness={2} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: P.textMuted,
                letterSpacing: '0.18em', textTransform: 'uppercase',
              }}>◆ Precio por {munUnidadPrecio(mun)} (con IVA)</span>
              {curAut &&
                <span title={curAut.nombre} style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700,
                  letterSpacing: '0.12em', color: '#000', background: curAut.color, padding: '2px 7px', flexShrink: 0,
                }}>{curAut.sigla}</span>}
            </div>
            <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 23, color: P.amber, letterSpacing: '0.02em' }}>{priceHistory.length ? priceHistory[priceHistory.length - 1].price : mun.priceExact}</div>
            <window.NotaErrata historial={priceHistory} />
            {mun.dcamRef &&
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: P.textMuted, marginTop: 4, lineHeight: 1.4 }}>Ref. {curSigla}: {mun.dcamRef}</div>
            }
            {currentManual && currentManual.url &&
              <a href={currentManual.url} target="_blank" rel="noopener" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 9,
                fontFamily: 'JetBrains Mono, monospace', fontSize: 14.5, color: P.amber,
                textDecoration: 'none', border: `1px solid ${P.amber}`, padding: '9px 12px',
                minHeight: 40, boxSizing: 'border-box', letterSpacing: '0.04em',
              }}>
                <span aria-hidden="true">▦</span>
                Ver inventario fuente · {munFmtDate(currentManual.fecha)}
                <span aria-hidden="true">↗</span>
              </a>
            }
            {(() => {
              // Regla: SOLO cuenta el ÚLTIMO inventario de cada sucursal (DCAM y OTCA
              // por separado). Si el cartucho no aparece en él (pero antes sí estuvo
              // en la sucursal), se muestra AGOTADO.
              const autOf = (m) => (m && (m.autoridad || (window.manualAutoridad ? window.manualAutoridad(m).sigla : 'OTCA'))) || 'OTCA';
              const allMan = (window.MUNICIONES_MANUALES || []).slice().sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
              const latestOf = (s) => allMan.find((m) => autOf(m) === s) || null;
              const everIn = (s) => priceHistory.some((h) => autOf(manualById(h.manualId)) === s);
              const branches = [];
              ['DCAM', 'OTCA'].forEach((s) => {
                const man = latestOf(s); if (!man) return;
                const rec = priceHistory.find((h) => h.manualId === man.id);
                if (rec && rec.qty != null) branches.push({ sigla: s, qty: rec.qty, manual: man, agotado: false });
                else if (everIn(s)) branches.push({ sigla: s, qty: null, manual: man, agotado: true });
              });
              if (!branches.length) return null;
              return (
                <div style={{ marginTop: 11, paddingTop: 11, borderTop: `1px solid ${P.border}` }}>
                  {branches.map((b, bi) => (
                    <div key={b.sigla + bi} style={{ marginTop: bi === 0 ? 0 : 9 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                        {b.agotado ? (
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14.5, fontWeight: 700, color: window.CLARO.alerta, letterSpacing: '0.06em' }}>AGOTADO en <b style={{ letterSpacing: '0.08em' }}>{b.sigla}</b></span>
                        ) : (
                          <React.Fragment>
                            <span style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 19, color: window.CLARO.ok }}>{Number(b.qty).toLocaleString('es-MX')}</span>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14.5, color: P.text, letterSpacing: '0.06em' }}>cartuchos en <b style={{ letterSpacing: '0.08em' }}>{b.sigla}</b></span>
                          </React.Fragment>
                        )}
                      </div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, color: P.textDim, marginTop: 5, lineHeight: 1.55 }}>
                        {b.agotado ? 'No aparece en el último inventario: ' : 'De acuerdo a '}
                        {b.manual && b.manual.url ? (
                          <a href={b.manual.url} target="_blank" rel="noopener" style={{ color: P.amber, textDecoration: 'none', borderBottom: `1px solid ${P.amber}` }}>▦ {b.manual.nombre} ↗</a>
                        ) : (
                          <span style={{ color: P.textMuted }}>{b.manual ? b.manual.nombre : 'inventario oficial ' + b.sigla}</span>
                        )}
                        {b.manual ? (b.agotado ? ' (' + munFmtDate(b.manual.fecha) + ').' : ', publicado el ' + munFmtDate(b.manual.fecha) + '.') : '.'}
                      </div>
                    </div>
                  ))}
                  <div style={window.amxProsa({ fontSize: 13, color: P.textMuted, marginTop: 4, lineHeight: 1.5 })}>
                    ⚠ Dato <b style={{ color: P.textDim }}>histórico</b> por sucursal, no en tiempo real: la disponibilidad actual puede variar.
                  </div>
                </div>
              );
            })()}
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: P.textDim, marginTop: 9 }}>Nivel: <window.PriceLevel lvl={mun.priceLvl} size={13} /></div>
          </div>

          {priceHistory.length > 0 &&
            <React.Fragment>
              <window.SectionHeader>Historial de precios</window.SectionHeader>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: P.textDim,
                letterSpacing: '0.04em', marginTop: -6, marginBottom: 10, lineHeight: 1.4,
              }}>Según inventarios oficiales DCAM / OTCA</div>
              <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, boxShadow: window.CLARO.sombra, marginBottom: 16 }}>
                {priceHistory.slice().reverse().map((h, i) => {
                  const man = manualById(h.manualId);
                  const hAut = window.manualAutoridad ? window.manualAutoridad(man) : null;
                  return (
                    <div key={i} style={{
                      padding: '10px 12px',
                      borderBottom: i < priceHistory.length - 1 ? `1px solid ${P.border}` : 'none',
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 15.5,
                      background: i === 0 ? 'rgba(221,213,196,0.06)' : 'transparent',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <span style={{ color: i === 0 ? P.amber : P.textMuted, fontSize: 13, letterSpacing: '0.1em', flexShrink: 0 }}>{i === 0 ? '● ACTUAL' : '○'}</span>
                          <span style={{ color: P.text, fontWeight: i === 0 ? 700 : 500 }}>{h.price}</span>
                          {hAut &&
                            <span title={hAut.nombre} style={{
                              fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700,
                              letterSpacing: '0.1em', color: '#000', background: hAut.color, padding: '1px 6px', flexShrink: 0,
                            }}>{hAut.sigla}</span>}
                        </div>
                        <span style={{ color: P.textDim, fontSize: 14.5, flexShrink: 0 }}>{munFmtDate(h.date) || '—'}</span>
                      </div>
                      {man &&
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 6, paddingLeft: 22 }}>
                          <span style={{ color: P.textMuted, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{man.nombre}</span>
                          {man.url &&
                            <a href={man.url} target="_blank" rel="noopener" style={{
                              color: P.amber, fontSize: 13, textDecoration: 'none',
                              borderBottom: `1px solid ${P.amber}`, flexShrink: 0, whiteSpace: 'nowrap',
                            }}>▦ Ver PDF ↗</a>
                          }
                        </div>
                      }
                    </div>
                  );
                })}
              </div>
            </React.Fragment>
          }

          {availMeta &&
            <React.Fragment>
              <window.SectionHeader>Estatus Legal</window.SectionHeader>
              <div style={{
                background: P.bgCard, border: `1px solid ${window.amxColorAvail(availMeta.color)}`, boxShadow: window.CLARO.sombra,
                padding: '12px 14px', marginBottom: 16,
              }}>
                <div style={{
                  fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 15,
                  color: window.amxColorAvail(availMeta.color), textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
                }}>{availMeta.label}</div>
                <div style={{ fontFamily: 'Archivo, system-ui, sans-serif', fontSize: 16, color: P.textDim, lineHeight: 1.6 }}>
                  {availMeta.desc} Para personal civil, la tabla de requisitos de la DCAM pide: cartucho para escopeta, para protección a domicilio o parcela, la hoja de manifestación de registro del arma; cartucho de fuego anular (.22 LR y .22 Short), para actividades cinegéticas, tiro deportivo y caza, esa hoja, el Volante de Adquisición de Cartuchos del mes y la credencial vigente del club; cartucho de alto poder y de fuego central, el permiso extraordinario de adquisición vigente. En todos los casos, una identificación oficial vigente.
                </div>
              </div>
            </React.Fragment>
          }
        </div>
      </div>

      {/* Armas compatibles en inventario */}
      {armasComp.length > 0 &&
        <div style={{ marginTop: 6 }}>
          <window.CarouselSection
            title={armasComp.length === 1 ? 'Arma compatible' : `Armas compatibles · ${armasComp.length}`}
            items={armasComp}
            renderItem={(a) => <window.ArmaCard arma={a} onClick={() => onOpenArma && onOpenArma(a.id)} />}
          />
        </div>
      }

      {/* Mismo calibre */}
      {relacionados.length > 0 &&
        <div style={{ marginTop: 6 }}>
          <window.CarouselSection
            title="Otras municiones"
            items={relacionados}
            renderItem={(m) => <MunicionCard mun={m} onClick={() => onOpenMunicion(m.id)} />}
          />
        </div>
      }

      <window.ReportarError tipo="municion" titulo={mun.nombre} ruta={'/municiones/' + (window.amxSlugIndex().slugPorM[mun.id] || '')} />
    </div>
  );
}
window.MunicionFicha = MunicionFicha;
