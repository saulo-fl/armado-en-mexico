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
function munCartucho(cal) {
  return MUN_CARTUCHO[cal] ? ('imagenes/cartuchos/' + MUN_CARTUCHO[cal]) : '';
}

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
  const cart = munCartucho(mun.calibre);
  return (
    <div onClick={onClick} style={{
      position: 'relative', background: P.bgCard, border: `1px solid ${P.border}`,
      cursor: 'pointer', transition: 'border-color 0.18s', overflow: 'hidden',
      height: '100%', display: 'flex', flexDirection: 'row',
      contentVisibility: 'auto', containIntrinsicSize: 'auto 150px',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = P.amber}
    onMouseLeave={e => e.currentTarget.style.borderColor = P.border}>
      <window.TacticalCorners size={8} color={P.amber} />
      {/* cartucho */}
      <div style={{
        width: '42%', flexShrink: 0, alignSelf: 'stretch', minHeight: 112,
        background: `radial-gradient(circle at 50% 50%, ${P.bgElev} 0%, ${P.bg} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', borderRight: `1px solid ${P.border}`, overflow: 'hidden',
        // El padding superior reserva la banda del badge de calibre (absolute, top 6):
        // sin el, el panel es tan estrecho que la foto centrada se le mete debajo.
        boxSizing: 'border-box', padding: '28px 6px 8px',
      }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(0deg, transparent 0 3px, rgba(245,197,24,0.03) 3px 4px)` }} />
        {cart && !imgError ? (
          <img src={cart} alt={mun.calibre} loading="lazy" decoding="async" onError={() => setImgError(true)}
            style={{ maxHeight: '82%', maxWidth: '60%', objectFit: 'contain', position: 'relative', zIndex: 1 }} />
        ) : (
          <span style={{
            fontFamily: 'Courier Prime, monospace', fontSize: 18, color: P.amber,
            opacity: 0.85, position: 'relative', zIndex: 1, letterSpacing: '0.06em',
          }}>◉</span>
        )}
        <span style={{
          position: 'absolute', top: 6, left: 6,
          fontFamily: 'Courier Prime, monospace', fontSize: 12, fontWeight: 700,
          color: '#000', background: P.amber, padding: '2px 5px',
          letterSpacing: '0.08em', whiteSpace: 'nowrap',
        }}>{mun.calibre}</span>
      </div>
      {/* body */}
      <div style={{ padding: '10px 12px 12px', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, minWidth: 0 }}>
          {window.CountryFlag && <window.CountryFlag pais={mun.pais} height={12} />}
          <span style={{
            fontFamily: 'Courier Prime, monospace', fontSize: 13, color: P.amber,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{mun.marca}</span>
        </div>
        <div style={{
          fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 16,
          color: P.text, textTransform: 'uppercase', lineHeight: 1.15, marginBottom: 6,
          letterSpacing: '0.02em', height: 38,
          display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden',
        }}>{mun.nombre}</div>
        <div style={{
          fontFamily: 'Courier Prime, monospace', fontSize: 13, color: P.textDim, marginBottom: 8,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          <span style={{ color: P.textMuted }}>BALA </span>{mun.bala}{mun.grano ? ` · ${mun.grano}` : ''}
        </div>
        {/* La cifra sustituye a la escala $$$··: es estrictamente más informativa
            para quien compara municiones. La unidad sale de munUnidadPrecio. */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '4px 8px', flexWrap: 'wrap', marginTop: 'auto' }}>
          <window.AvailBadge avail={mun.avail} compact />
          {mun.priceExact ? (
            <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5, whiteSpace: 'nowrap' }}>
              <span style={{
                fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 15,
                color: P.amber, fontVariantNumeric: 'tabular-nums',
              }}>{String(mun.priceExact).replace(' MXN', '')}</span>
              <span style={{
                fontFamily: 'Courier Prime, monospace', fontSize: 12, color: P.textMuted,
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
// HOME — "Municiones" como grid por calibre
// ════════════════════════════════════════════════════════════════
function HomeMunicionesSection({ onNav }) {
  const P = window.PALETTE;
  const vp = window.useViewport();
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
  const visible = destacados.length ? destacados : conStock;

  return (
    <div style={{ marginBottom: 20, maxWidth: 1280, marginLeft: 'auto', marginRight: 'auto' }}>
      <div style={{ padding: `0 ${PAD}px`, margin: '25px 0 10px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <div style={{
            fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 21, color: P.text,
            textTransform: 'uppercase', letterSpacing: '0.04em', flex: '1 1 auto', minWidth: 0, whiteSpace: 'nowrap',
          }}>Municiones</div>
          <button onClick={() => onNav && onNav('municiones')} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: P.amber,
            fontFamily: 'Courier Prime, monospace', fontSize: 14.5, letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>Ver todas →</button>
        </div>
      </div>

      <window.HCarousel items={visible} itemWidth={vp.isDesktop ? 220 : 165} padX={PAD}
        renderItem={(c) => {
          const cart = munCartucho(c.id);
          return (
            <button onClick={() => onNav && onNav('municiones', { categoria: c.id })} style={{
              background: P.bgCard, border: `1px solid ${P.border}`,
              padding: 0, cursor: 'pointer', textAlign: 'left',
              position: 'relative', overflow: 'hidden', display: 'block', width: '100%',
              transition: 'border-color 0.18s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = P.amber; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = P.border; }}>
              <div style={{
                width: '100%', aspectRatio: '4 / 5', position: 'relative', overflow: 'hidden',
                background: `radial-gradient(circle at 50% 42%, ${P.bgElev} 0%, ${P.bg} 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(0deg, transparent 0 3px, rgba(245,197,24,0.03) 3px 4px)` }} />
                {cart
                  ? <img src={cart} alt={c.label} loading="lazy" style={{ maxHeight: '62%', maxWidth: '46%', objectFit: 'contain', position: 'relative', zIndex: 1 }} />
                  : <span style={{ fontFamily: 'Courier Prime, monospace', fontSize: vp.isDesktop ? 55 : 48, color: P.amber, opacity: 0.9, position: 'relative', zIndex: 1 }}>{c.icon}</span>}
                <div style={{ position: 'absolute', top: 6, left: 6, width: 10, height: 10, borderTop: `1.5px solid ${P.amber}`, borderLeft: `1.5px solid ${P.amber}`, opacity: 0.75 }} />
                <div style={{ position: 'absolute', bottom: 6, right: 6, width: 10, height: 10, borderBottom: `1.5px solid ${P.amber}`, borderRight: `1.5px solid ${P.amber}`, opacity: 0.75 }} />
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(26,26,26,0) 45%, rgba(26,26,26,0.55) 72%, rgba(26,26,26,0.94) 100%)`, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', left: 10, right: 10, bottom: 10 }}>
                  <div style={{
                    fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: vp.isDesktop ? 15 : 14,
                    color: P.text, textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.08,
                    textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                  }}>{c.label}</div>
                  <div style={{
                    fontFamily: 'Courier Prime, monospace', fontSize: 12.5, color: P.amber,
                    letterSpacing: '0.16em', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6,
                  }}>VER <span aria-hidden="true">→</span></div>
                </div>
              </div>
            </button>
          );
        }} />
    </div>
  );
}
window.HomeMunicionesSection = HomeMunicionesSection;

// ════════════════════════════════════════════════════════════════
// CATÁLOGO DE MUNICIONES — filtros + buscador + grid agrupado por calibre
// ════════════════════════════════════════════════════════════════
function MunicionesScreen({ initialFilter, onOpenMunicion, onNav }) {
  const P = window.PALETTE;
  const vp = window.useViewport();
  const cols = vp.isDesktop ? 'repeat(3, 1fr)' : vp.isTablet ? 'repeat(2, 1fr)' : '1fr';
  const padX = vp.isDesktop ? 28 : 16;

  const [query, setQuery] = useStateMun('');
  const [categoria, setCategoria] = useStateMun((initialFilter && initialFilter.categoria) || 'all');
  const [avail, setAvail] = useStateMun('all');
  const [marca, setMarca] = useStateMun('all');
  const [precio, setPrecio] = useStateMun('all');

  const todos = window.MUNICIONES || [];
  const marcas = useMemoMun(() => Array.from(new Set(todos.map(m => m.marca))).sort(), [todos]);
  const cats = window.MUNICION_CATEGORIES.categoria;
  const disp = window.MUNICION_CATEGORIES.disponibilidad;

  const filtered = useMemoMun(() => {
    return todos.filter(m => {
      if (categoria !== 'all' && m.calibre !== categoria) return false;
      if (avail !== 'all' && m.avail !== avail) return false;
      if (marca !== 'all' && m.marca !== marca) return false;
      if (precio !== 'all' && String(m.priceLvl) !== precio) return false;
      if (query) {
        const q = query.toLowerCase();
        const hay = (m.nombre + ' ' + m.marca + ' ' + m.calibre + ' ' + m.bala + ' ' + m.dcamRef).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [query, categoria, avail, marca, precio, todos]);

  const clearAll = () => { setQuery(''); setCategoria('all'); setAvail('all'); setMarca('all'); setPrecio('all'); };
  const anyFilter = query || categoria !== 'all' || avail !== 'all' || marca !== 'all' || precio !== 'all';

  const selStyle = {
    background: P.bg, color: P.text, border: `1px solid ${P.border}`,
    padding: '11px 12px', fontFamily: 'Courier Prime, monospace', fontSize: 14,
    letterSpacing: '0.04em', cursor: 'pointer', minHeight: 44, boxSizing: 'border-box',
    flex: '1 1 160px', minWidth: 0,
  };
  const chip = (active) => ({
    background: active ? P.amber : 'transparent', color: active ? '#000' : P.textDim,
    border: `1px solid ${active ? P.amber : P.border}`,
    padding: '10px 14px', cursor: 'pointer', minHeight: 44, boxSizing: 'border-box',
    fontFamily: 'Courier Prime, monospace', fontSize: 12.5,
    letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
    display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: active ? 700 : 400,
  });

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', width: '100%', padding: `20px ${padX}px 0`, boxSizing: 'border-box' }}>
        <div style={{
          fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: vp.isDesktop ? 32 : 26,
          color: P.text, textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1.05,
        }}>Municiones</div>
        <div style={{
          marginTop: 12, background: P.bgCard, border: `1px solid ${P.border}`,
          borderLeft: `3px solid ${P.amber}`, padding: '11px 14px',
          ...window.amxProsa({ fontSize: 16, color: P.textDim, lineHeight: 1.6 }),
        }}>
          Cartuchos de adquisición legal a través de la <b style={{ color: P.text }}>DCAM</b> (nacional) y la <b style={{ color: P.text }}>OTCA</b> (Monterrey).
          Información con fines de transparencia; <b style={{ color: P.text }}>no los comercializamos</b>.
          El precio es por cartucho e incluye IVA; cada uno cita su inventario fuente.
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', width: '100%', padding: `16px ${padX}px 0`, boxSizing: 'border-box' }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por calibre, marca o tipo de bala…"
          style={{
            width: '100%', boxSizing: 'border-box', background: P.bg, color: P.text,
            border: `1px solid ${P.border}`, padding: '11px 14px', marginBottom: 12,
            fontFamily: 'Courier Prime, monospace', fontSize: 17, letterSpacing: '0.03em',
          }} />

        <div className="amx-hscroll" style={{
          display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 4,
          WebkitOverflowScrolling: 'touch', scrollSnapType: 'x proximity',
        }}>
          <button onClick={() => setCategoria('all')} style={chip(categoria === 'all')}>Todos</button>
          {cats.map(c => (
            <button key={c.id} onClick={() => setCategoria(c.id)} style={chip(categoria === c.id)}>
              <span style={{ color: categoria === c.id ? '#000' : P.amber }}>{c.icon}</span>{c.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <select value={avail} onChange={(e) => setAvail(e.target.value)} style={selStyle}>
            <option value="all">Toda disponibilidad</option>
            {disp.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
          <select value={marca} onChange={(e) => setMarca(e.target.value)} style={selStyle}>
            <option value="all">Todas las marcas</option>
            {marcas.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={precio} onChange={(e) => setPrecio(e.target.value)} style={selStyle}>
            <option value="all">Todo nivel de precio</option>
            <option value="1">$ · Económico</option>
            <option value="2">$$ · Medio-bajo</option>
            <option value="3">$$$ · Medio</option>
            <option value="4">$$$$ · Alto</option>
            <option value="5">$$$$$ · Premium</option>
          </select>
          {anyFilter &&
            <button onClick={clearAll} style={{
              background: 'transparent', color: P.redHi, border: `1px solid ${P.redHi}`,
              padding: '11px 14px', minHeight: 44, boxSizing: 'border-box', cursor: 'pointer',
              fontFamily: 'Courier Prime, monospace', fontSize: 15, letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>✕ Limpiar</button>
          }
        </div>

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontFamily: 'Courier Prime, monospace', fontSize: 14.5, color: P.amber,
          letterSpacing: '0.12em', margin: '16px 0 10px', textTransform: 'uppercase',
        }}>
          <span>▸ {filtered.length} {filtered.length === 1 ? 'CARTUCHO' : 'CARTUCHOS'}</span>
          <span style={{ color: P.textMuted }}>{todos.length} TOTAL</span>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', width: '100%', padding: `0 ${padX}px`, boxSizing: 'border-box' }}>
        {filtered.length ? (
          (categoria === 'all' && !query) ? (
            cats.map(c => {
              const list = filtered.filter(m => m.calibre === c.id);
              if (!list.length) return null;
              return (
                <div key={c.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0 12px' }}>
                    <span style={{ fontFamily: 'Courier Prime, monospace', fontSize: 21.5, color: P.amber, lineHeight: 1 }}>{c.icon}</span>
                    <h2 style={{
                      fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 18, color: P.text,
                      textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0, whiteSpace: 'nowrap',
                    }}>{c.label}</h2>
                    <span style={{ flex: 1, height: 1, background: P.border }} />
                    <span style={{ fontFamily: 'Courier Prime, monospace', fontSize: 14.5, color: P.textMuted }}>{list.length}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 14 }}>
                    {list.map(m => <MunicionCard key={m.id} mun={m} onClick={() => onOpenMunicion(m.id)} />)}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 14 }}>
              {filtered.map(m => <MunicionCard key={m.id} mun={m} onClick={() => onOpenMunicion(m.id)} />)}
            </div>
          )
        ) : (
          <div style={{
            border: `1px dashed ${P.border}`, padding: '40px 20px', textAlign: 'center',
            fontFamily: 'Courier Prime, monospace', fontSize: 15.5, color: P.textMuted,
          }}>
            ◇ Sin resultados con estos filtros.
            <button onClick={clearAll} style={{
              display: 'block', margin: '12px auto 0', background: 'none', border: 'none',
              color: P.amber, cursor: 'pointer', fontFamily: 'inherit', fontSize: 15.5, textDecoration: 'underline',
            }}>Limpiar filtros</button>
          </div>
        )}
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
      <div style={{ padding: '60px 20px', textAlign: 'center', fontFamily: 'Courier Prime, monospace', color: P.textMuted }}>
        Munición no encontrada.
      </div>
    );
  }

  const cart = munCartucho(mun.calibre);
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
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(0deg, transparent 0 3px, rgba(245,197,24,0.03) 3px 4px)` }} />
          {cart && !imgError
            ? <img src={cart} alt={mun.calibre} onError={() => setImgError(true)} style={{ maxHeight: '78%', maxWidth: '46%', objectFit: 'contain', position: 'relative', zIndex: 1 }} />
            : <span style={{ fontFamily: 'Courier Prime, monospace', fontSize: 60, color: P.amber, opacity: 0.85, position: 'relative', zIndex: 1 }}>◉</span>}
          <span style={{
            position: 'absolute', top: 10, left: 10,
            fontFamily: 'Courier Prime, monospace', fontSize: 13, color: '#000',
            background: P.amber, padding: '3px 7px', letterSpacing: '0.08em', fontWeight: 700,
          }}>{mun.calibre}</span>
        </div>

        <div style={{ paddingTop: vp.isDesktop ? 4 : 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            {window.CountryFlag && <window.CountryFlag pais={mun.pais} height={14} />}
            <span style={{
              fontFamily: 'Courier Prime, monospace', fontSize: 14.5, color: P.amber,
              letterSpacing: '0.16em', textTransform: 'uppercase',
            }}>{mun.marca}{mun.pais ? ` · ${mun.pais}` : ''}</span>
          </div>
          <h1 style={{
            fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: vp.isDesktop ? 30 : 25,
            color: P.text, textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.08, margin: '0 0 12px',
          }}>{mun.nombre}</h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            <window.AvailBadge avail={mun.avail} />
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: P.bgCard, border: `1px solid ${P.border}`, padding: '3px 9px',
              fontFamily: 'Courier Prime, monospace', fontSize: 13, color: P.textDim,
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}><span style={{ color: P.amber }}>◉</span>{mun.calibre}</span>
          </div>
          {mun.descripcion &&
            <p style={{
              fontFamily: 'Open Sans, sans-serif', fontSize: 17.5, color: P.textDim,
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
              <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, marginBottom: 16 }}>
                {mun.specs.map(([k, v], i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 12px',
                    borderBottom: i < mun.specs.length - 1 ? `1px solid ${P.border}` : 'none',
                    fontFamily: 'Courier Prime, monospace', fontSize: 15.5,
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
                    background: P.bgCard, border: `1px solid ${P.border}`, borderLeft: `2px solid ${P.amber}`,
                    padding: '6px 10px', fontFamily: 'Courier Prime, monospace', fontSize: 14.5,
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
                fontFamily: 'Courier Prime, monospace', fontSize: 13, color: P.textMuted,
                letterSpacing: '0.18em', textTransform: 'uppercase',
              }}>◆ Precio por {munUnidadPrecio(mun)} (con IVA)</span>
              {curAut &&
                <span title={curAut.nombre} style={{
                  fontFamily: 'Courier Prime, monospace', fontSize: 12, fontWeight: 700,
                  letterSpacing: '0.12em', color: '#000', background: curAut.color, padding: '2px 7px', flexShrink: 0,
                }}>{curAut.sigla}</span>}
            </div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 23, color: P.amber, letterSpacing: '0.02em' }}>{priceHistory.length ? priceHistory[priceHistory.length - 1].price : mun.priceExact}</div>
            {mun.dcamRef &&
              <div style={{ fontFamily: 'Courier Prime, monospace', fontSize: 13, color: P.textMuted, marginTop: 4, lineHeight: 1.4 }}>Ref. {curSigla}: {mun.dcamRef}</div>
            }
            {currentManual && currentManual.url &&
              <a href={currentManual.url} target="_blank" rel="noopener" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 9,
                fontFamily: 'Courier Prime, monospace', fontSize: 14.5, color: P.amber,
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
                          <span style={{ fontFamily: 'Courier Prime, monospace', fontSize: 14.5, fontWeight: 700, color: '#E4574B', letterSpacing: '0.06em' }}>AGOTADO en <b style={{ letterSpacing: '0.08em' }}>{b.sigla}</b></span>
                        ) : (
                          <React.Fragment>
                            <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 19, color: '#4FAE5C' }}>{Number(b.qty).toLocaleString('es-MX')}</span>
                            <span style={{ fontFamily: 'Courier Prime, monospace', fontSize: 14.5, color: P.text, letterSpacing: '0.06em' }}>cartuchos en <b style={{ letterSpacing: '0.08em' }}>{b.sigla}</b></span>
                          </React.Fragment>
                        )}
                      </div>
                      <div style={{ fontFamily: 'Courier Prime, monospace', fontSize: 12.5, color: P.textDim, marginTop: 5, lineHeight: 1.55 }}>
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
            <div style={{ fontFamily: 'Courier Prime, monospace', fontSize: 13, color: P.textDim, marginTop: 9 }}>Nivel: <window.PriceLevel lvl={mun.priceLvl} size={13} /></div>
          </div>

          {priceHistory.length > 0 &&
            <React.Fragment>
              <window.SectionHeader>Historial de precios</window.SectionHeader>
              <div style={{
                fontFamily: 'Courier Prime, monospace', fontSize: 12, color: P.textDim,
                letterSpacing: '0.04em', marginTop: -6, marginBottom: 10, lineHeight: 1.4,
              }}>Según inventarios oficiales DCAM / OTCA</div>
              <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, marginBottom: 16 }}>
                {priceHistory.slice().reverse().map((h, i) => {
                  const man = manualById(h.manualId);
                  const hAut = window.manualAutoridad ? window.manualAutoridad(man) : null;
                  return (
                    <div key={i} style={{
                      padding: '10px 12px',
                      borderBottom: i < priceHistory.length - 1 ? `1px solid ${P.border}` : 'none',
                      fontFamily: 'Courier Prime, monospace', fontSize: 15.5,
                      background: i === 0 ? 'rgba(245,197,24,0.06)' : 'transparent',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <span style={{ color: i === 0 ? P.amber : P.textMuted, fontSize: 13, letterSpacing: '0.1em', flexShrink: 0 }}>{i === 0 ? '● ACTUAL' : '○'}</span>
                          <span style={{ color: P.text, fontWeight: i === 0 ? 700 : 500 }}>{h.price}</span>
                          {hAut &&
                            <span title={hAut.nombre} style={{
                              fontFamily: 'Courier Prime, monospace', fontSize: 12, fontWeight: 700,
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
                background: P.bgCard, border: `1px solid ${availMeta.color}`, borderLeft: `4px solid ${availMeta.color}`,
                padding: '12px 14px', marginBottom: 16,
              }}>
                <div style={{
                  fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 15,
                  color: availMeta.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
                }}>{availMeta.label}</div>
                <div style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 16, color: P.textDim, lineHeight: 1.6 }}>
                  {availMeta.desc} La adquisición de municiones requiere licencia y registro vigentes del arma correspondiente.
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
    </div>
  );
}
window.MunicionFicha = MunicionFicha;
