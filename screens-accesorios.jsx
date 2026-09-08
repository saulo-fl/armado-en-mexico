// Armado en México — Pantallas de ACCESORIOS DCAM
// Card, carrusel de Home, catálogo con filtros, y ficha de detalle con el bloque
// de precio + historial de inventarios (mismo patrón que las armas).
// Expone en window: AccesorioCard, HomeAccesoriosSection, AccesoriosScreen, AccesorioFicha

const { useState: useStateAcc, useMemo: useMemoAcc, useEffect: useEffectAcc } = React;

// Fecha de inventario (YYYY-MM-DD) → texto es-MX
function accFmtDate(f) {
  if (!f) return '';
  const d = new Date(String(f).length === 10 ? f + 'T12:00:00' : f);
  if (isNaN(d)) return String(f);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}
function accCatMeta(id) {
  return (window.ACCESORIO_CATEGORIES.categoria.find(c => c.id === id)) || { label: id, icon: '◆' };
}

// Aviso discreto cuando no hay fotografía real del accesorio
// Respaldo cuando un accesorio no tiene fotografía propia — hoy, los 36 del
// catálogo, así que es la vista por defecto y no un caso raro.
// Era una cámara tachada en SVG dibujada a mano. Saulo retiró los SVG generados
// el 8-sep-2026: ahora va la SILUETA de la categoría, el mismo lenguaje que las
// armas. Se pinta como máscara, así que el color lo pone el CSS y sigue al tema.
function AccNoImage({ acc, compact }) {
  const forma = window.accesorioPlaceholder ? window.accesorioPlaceholder(acc) : null;
  return (
    <div role="img" aria-label={'Sin fotografía en expediente' + (acc && acc.nombre ? ': ' + acc.nombre : '')}
      style={{
        position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: compact ? 6 : 10,
        padding: '0 12px', textAlign: 'center', width: '100%', height: '100%',
      }}>
      {forma && (
        <span className="amx-silueta-acc" aria-hidden="true"
          style={{ '--silueta-forma': `url(${forma})`, height: compact ? 34 : 52 }} />
      )}
      <span style={{
        fontFamily: 'JetBrains Mono, monospace',
        // 11px es el piso de texto funcional; los 10.5 de antes quedaban debajo.
        fontSize: compact ? 11 : 12.5,
        color: 'var(--tinta-2)', letterSpacing: '0.05em', lineHeight: 1.45,
      }}>Sin fotografía{compact ? '' : ' en expediente'}</span>
    </div>
  );
}
window.AccNoImage = AccNoImage;

// ════════════════════════════════════════════════════════════════
// ACCESORIO CARD — tarjeta horizontal (gemela de ArmaCard)
// ════════════════════════════════════════════════════════════════
function AccesorioCard({ acc, onClick }) {
  const P = window.PALETTE;
  const [imgError, setImgError] = useStateAcc(false);
  const cat = accCatMeta(acc.categoria);
  return (
    <div onClick={onClick} style={{
      position: 'relative',
      background: window.CLARO.panel,
      borderRadius: window.CLARO.radio,
      border: `1px solid ${window.CLARO.hair}`,
      // La sombra la pone .amx-card en estilo.css (ver ui.jsx/ArmaCard).
      cursor: 'pointer',
      overflow: 'hidden',
      height: '100%',
      display: 'flex', flexDirection: 'row',
      contentVisibility: 'auto',
      containIntrinsicSize: 'auto 150px',
    }} className="amx-card">
      {/* imagen */}
      <div style={{
        width: '42%', flexShrink: 0, alignSelf: 'stretch', minHeight: 112,
        background: `radial-gradient(circle at 50% 50%, ${window.CLARO.panelHi} 0%, ${P.bg} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', borderRight: `1px solid ${window.CLARO.hair}`, overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `repeating-linear-gradient(0deg, transparent 0 3px, rgba(221,213,196,0.03) 3px 4px)`,
        }} />
        {window.isRealImage(acc.img) && !imgError ? (
          <img src={acc.img} alt={acc.nombre}
            loading="lazy" decoding="async" onError={() => setImgError(true)}
            style={{ maxWidth: '88%', maxHeight: '88%', objectFit: 'contain', position: 'relative', zIndex: 1 }} />
        ) : (
          <AccNoImage acc={acc} compact />
        )}
        <span style={{
          position: 'absolute', top: 6, left: 6,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600,
          // Va sobre la PLACA fotográfica, clara en los dos temas: la tinta se
          // fija a --tinta-placa. CLARO.tinta2 se aclara en oscuro y dejaría
          // gris claro sobre casi blanco.
          color: 'var(--tinta-placa)', background: 'rgba(250,249,245,0.92)', padding: '2px 6px', borderRadius: 4,
          letterSpacing: '0.1em', textTransform: 'uppercase', borderLeft: '2px solid var(--tinta-placa)',
        }}>{cat.icon} {cat.label.split(' ')[0]}</span>
      </div>
      {/* body */}
      <div style={{ padding: '10px 12px 12px', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, minWidth: 0 }}>
          {window.CountryFlag && <window.CountryFlag pais={acc.pais} height={12} />}
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: window.CLARO.tinta2,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{acc.marca}</span>
        </div>
        <div style={{
          fontFamily: 'Archivo, sans-serif', fontWeight: 600, fontSize: 16,
          color: window.CLARO.tinta, textTransform: 'uppercase', lineHeight: 1.15, marginBottom: 6,
          letterSpacing: '0.02em', height: 38,
          display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden',
        }}>{acc.nombre}</div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: window.CLARO.tinta2, marginBottom: 8,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          <span style={{ color: window.CLARO.tinta2 }}>CAT </span>{cat.label}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px 8px', flexWrap: 'wrap', marginTop: 'auto' }}>
          <window.AvailBadge avail={acc.avail} compact />
          <window.PriceLevel lvl={acc.priceLvl} />
        </div>
      </div>
    </div>
  );
}
window.AccesorioCard = AccesorioCard;

// ════════════════════════════════════════════════════════════════
// HOME — "Accesorios DCAM" como GRID DE CATEGORÍAS (estilo categorías de arma)
// ════════════════════════════════════════════════════════════════
function HomeAccesoriosSection({ onOpen, onNav }) {
  const P = window.PALETTE;
  const vp = window.useViewport();
  const PAD = 16;
  const cats = window.ACCESORIO_CATEGORIES.categoria;
  const total = (window.ACCESORIOS || []).length;
  if (!total) return null;
  const counts = {};
  (window.ACCESORIOS || []).forEach(a => { counts[a.categoria] = (counts[a.categoria] || 0) + 1; });
  const visible = cats.filter(c => counts[c.id]);

  return (
    <div style={{ marginBottom: 20, maxWidth: 1280, marginLeft: 'auto', marginRight: 'auto' }}>
      <div style={{ padding: `0 ${PAD}px`, margin: '25px 0 10px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <div style={{
            fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 21, color: P.text,
            textTransform: 'uppercase', letterSpacing: '0.04em', flex: '1 1 auto', minWidth: 0, whiteSpace: 'nowrap',
          }}>Accesorios DCAM</div>
          {/* El estilo estaba copiado a mano y en P.amber, que es el VERDE de marca:
              contrasta de sobra sobre el lienzo (10.83:1) pero compite con el titulo
              y no es el color de accion del sistema. estiloAccion(false) trae el rojo
              #A3341F (5.96:1 sobre #F3EFE4) y el area tactil de 44px. */}
          <button onClick={() => onNav && onNav('accesorios')}
            style={window.estiloAccion(false)}>Ver todos →</button>
        </div>
      </div>

      <div style={{
        padding: `0 ${PAD}px`,
        display: 'grid',
        gridTemplateColumns: vp.isDesktop ? 'repeat(5, 1fr)' : '1fr 1fr',
        gap: 10,
      }}>
        {visible.map(c => (
          <button key={c.id} onClick={() => onNav && onNav('accesorios', { categoria: c.id })} style={{
            background: P.bgCard, border: `1px solid ${P.border}`, boxShadow: window.CLARO.sombra,
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
              {/* scanline */}
              <div style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(0deg, transparent 0 3px, rgba(221,213,196,0.03) 3px 4px)` }} />
              {/* glyph de categoría */}
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: vp.isDesktop ? 62.5 : 55,
                color: P.amber, opacity: 0.92, position: 'relative', zIndex: 1, lineHeight: 1,
                textShadow: '0 2px 8px rgba(0,0,0,0.5)',
              }}>{c.icon}</span>
              {/* corner ticks */}
              <div style={{ position: 'absolute', top: 6, left: 6, width: 10, height: 10, borderTop: `1.5px solid ${P.amber}`, borderLeft: `1.5px solid ${P.amber}`, opacity: 0.75 }} />
              <div style={{ position: 'absolute', bottom: 6, right: 6, width: 10, height: 10, borderBottom: `1.5px solid ${P.amber}`, borderRight: `1.5px solid ${P.amber}`, opacity: 0.75 }} />
              {/* Degradado decorativo: solo funde la foto/glifo con la placa de abajo.
                  Baja de 0.94 a 0.75 — ya no tiene que sostener contraste de texto. */}
              <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(23,58,50,0) 45%, rgba(23,58,50,0.55) 72%, rgba(23,58,50,0.75) 100%)`, pointerEvents: 'none' }} />
              {/* PLACA DE LEGIBILIDAD. Antes el rotulo se apoyaba en el degradado, que
                  solo llega a su parada final en el ultimo pixel: la etiqueta de
                  categoria (1-3 lineas segun ancho: «Portacargadores y cananas») caia
                  en la rampa, sobre verde a ~0.66 → crema 4.12:1. La placa fija 0.94 de
                  verde bajo TODAS las lineas. Compuesto real (0.94 sobre el degradado a
                  0.75 sobre el lienzo) = #1A3D35: crema 10.37:1, salmon 5.62:1.
                  El fundido de 12px cabe dentro del paddingTop de 14, asi que ninguna
                  linea de texto se apoya en la rampa. */}
              <div style={{
                position: 'absolute', left: 0, right: 0, bottom: 0, padding: '14px 10px 10px',
                background: `linear-gradient(180deg, rgba(23,58,50,0) 0, rgba(23,58,50,0.94) 12px)`,
              }}>
                {/* P.text (#171B19) sobre este verde daba 1.65:1. Crema: 10.37:1.
                    Fuera el textShadow negro: era para texto oscuro, bajo texto claro
                    solo ensucia el borde de la letra. */}
                <div style={{
                  fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: vp.isDesktop ? 15 : 14,
                  color: P.sobreMarca, textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.08,
                }}>{c.label}</div>
                {/* Rotulo de accion, no un control aparte: la tarjeta entera es el boton
                    y ya mide >=44px, asi que toma solo el color de estiloAccion(true)
                    —P.redSobreVerde— sin su minHeight, que aqui hincharia la placa.
                    P.amber (verde de marca) sobre este verde era invisible. 5.62:1. */}
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, color: P.redSobreVerde,
                  letterSpacing: '0.16em', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6,
                }}>VER <span aria-hidden="true">→</span></div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
window.HomeAccesoriosSection = HomeAccesoriosSection;

// ════════════════════════════════════════════════════════════════
// CATÁLOGO DE ACCESORIOS — filtros + buscador + grid responsivo
// ════════════════════════════════════════════════════════════════
function AccesoriosScreen({ initialFilter, onOpenAccesorio, onNav }) {
  const P = window.PALETTE;
  const vp = window.useViewport();
  const cols = vp.isDesktop ? 'repeat(3, 1fr)' : vp.isTablet ? 'repeat(2, 1fr)' : '1fr';
  const padX = vp.isDesktop ? 28 : 16;

  const [query, setQuery] = useStateAcc('');
  const [categoria, setCategoria] = useStateAcc((initialFilter && initialFilter.categoria) || 'all');
  const [avail, setAvail] = useStateAcc('all');
  const [marca, setMarca] = useStateAcc('all');
  const [precio, setPrecio] = useStateAcc('all');

  const todos = window.ACCESORIOS || [];
  const marcas = useMemoAcc(() => Array.from(new Set(todos.map(a => a.marca))).sort(), [todos]);
  const cats = window.ACCESORIO_CATEGORIES.categoria;
  const disp = window.ACCESORIO_CATEGORIES.disponibilidad;

  const filtered = useMemoAcc(() => {
    return todos.filter(a => {
      if (categoria !== 'all' && a.categoria !== categoria) return false;
      if (avail !== 'all' && a.avail !== avail) return false;
      if (marca !== 'all' && a.marca !== marca) return false;
      if (precio !== 'all' && String(a.priceLvl) !== precio) return false;
      if (query) {
        const q = query.toLowerCase();
        const hay = (a.nombre + ' ' + a.marca + ' ' + a.dcamRef + ' ' + accCatMeta(a.categoria).label).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [query, categoria, avail, marca, precio, todos]);

  const clearAll = () => { setQuery(''); setCategoria('all'); setAvail('all'); setMarca('all'); setPrecio('all'); };
  const anyFilter = query || categoria !== 'all' || avail !== 'all' || marca !== 'all' || precio !== 'all';

  const selStyle = {
    background: P.bg, color: P.text, border: `1px solid ${P.border}`,
    padding: '11px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 14,
    letterSpacing: '0.04em', cursor: 'pointer', minHeight: 44, boxSizing: 'border-box',
    flex: '1 1 160px', minWidth: 0,
  };
  const chip = (active) => ({
    // Activo = fondo P.amber, que es el VERDE de marca #173A32, no un ambar:
    // el negro encima daba 1.69:1. Crema sobre el verde: 10.83:1.
    background: active ? P.amber : 'transparent',
    color: active ? P.tintaSobreMarca : P.textDim,
    border: `1px solid ${active ? P.amber : P.border}`,
    padding: '10px 14px', cursor: 'pointer', minHeight: 44, boxSizing: 'border-box',
    fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5,
    letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
    display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: active ? 700 : 400,
  });

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* Encabezado + encuadre legal */}
      <div style={{ maxWidth: 1280, margin: '0 auto', width: '100%', padding: `20px ${padX}px 0`, boxSizing: 'border-box' }}>
        <div style={{
          fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: vp.isDesktop ? 32 : 26,
          color: P.text, textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1.05,
        }}>Accesorios DCAM</div>
        <div style={{
          marginTop: 12, background: P.bgCard, border: `1px solid ${P.border}`, boxShadow: window.CLARO.sombra,
          boxShadow: window.CLARO.sombra, padding: '11px 14px',
          ...window.amxProsa({ fontSize: 16, color: P.textDim, lineHeight: 1.6 }),
        }}>
          Accesorios de adquisición legal a través de la <b style={{ color: P.text }}>DCAM</b> (nacional) y la <b style={{ color: P.text }}>OTCA</b> (Monterrey, catálogo propio).
          Información con fines de transparencia; <b style={{ color: P.text }}>no los comercializamos</b>.
          Cada precio cita su inventario fuente y la autoridad que lo emite.
        </div>
      </div>

      {/* Filtros */}
      <div style={{ maxWidth: 1280, margin: '0 auto', width: '100%', padding: `16px ${padX}px 0`, boxSizing: 'border-box' }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar accesorio, marca o referencia…"
          style={{
            width: '100%', boxSizing: 'border-box', background: P.bg, color: P.text,
            border: `1px solid ${P.border}`, padding: '11px 14px', marginBottom: 12,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 17, letterSpacing: '0.03em',
          }} />

        {/* categorías (chips con swipe táctil, sin barra) */}
        <div className="amx-hscroll" style={{
          display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 4,
          WebkitOverflowScrolling: 'touch', scrollSnapType: 'x proximity',
        }}>
          <button onClick={() => setCategoria('all')} style={chip(categoria === 'all')}>Todas</button>
          {cats.map(c => (
            <button key={c.id} onClick={() => setCategoria(c.id)} style={chip(categoria === c.id)}>
              <span style={{ color: categoria === c.id ? '#000' : P.amber }}>{c.icon}</span>{c.label}
            </button>
          ))}
        </div>

        {/* selects: disponibilidad / marca / precio */}
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
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 15, letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>✕ Limpiar</button>
          }
        </div>

        {/* contador */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 14.5, color: P.amber,
          letterSpacing: '0.12em', margin: '16px 0 10px', textTransform: 'uppercase',
        }}>
          <span>▸ {filtered.length} {filtered.length === 1 ? 'ACCESORIO' : 'ACCESORIOS'}</span>
          <span style={{ color: P.textMuted }}>{todos.length} TOTAL</span>
        </div>
      </div>

      {/* grid (agrupado por categoría cuando no hay categoría ni búsqueda activa) */}
      <div style={{ maxWidth: 1280, margin: '0 auto', width: '100%', padding: `0 ${padX}px`, boxSizing: 'border-box' }}>
        {filtered.length ? (
          (categoria === 'all' && !query) ? (
            cats.map(c => {
              const list = filtered.filter(a => a.categoria === c.id);
              if (!list.length) return null;
              return (
                <div key={c.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0 12px' }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 21.5, color: P.amber, lineHeight: 1 }}>{c.icon}</span>
                    <h2 style={{
                      fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 18, color: P.text,
                      textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0, whiteSpace: 'nowrap',
                    }}>{c.label}</h2>
                    <span style={{ flex: 1, height: 1, background: P.border }} />
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14.5, color: P.textMuted }}>{list.length}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 14 }}>
                    {list.map(a => <AccesorioCard key={a.id} acc={a} onClick={() => onOpenAccesorio(a.id)} />)}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 14 }}>
              {filtered.map(a => <AccesorioCard key={a.id} acc={a} onClick={() => onOpenAccesorio(a.id)} />)}
            </div>
          )
        ) : (
          <div style={{
            border: `1px dashed ${P.border}`, padding: '40px 20px', textAlign: 'center',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 15.5, color: P.textMuted,
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
window.AccesoriosScreen = AccesoriosScreen;

// ════════════════════════════════════════════════════════════════
// FICHA DE ACCESORIO — detalle + precio referencia DCAM + historial
// ════════════════════════════════════════════════════════════════
function AccesorioFicha({ accesorioId, onOpenAccesorio, onOpenArma, onNav }) {
  const P = window.PALETTE;
  const vp = window.useViewport();
  const padX = vp.isDesktop ? 28 : 16;
  const acc = window.getAccesorioById(accesorioId);

  if (!acc) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', color: P.textMuted }}>
        Accesorio no encontrado.
      </div>
    );
  }

  const cat = accCatMeta(acc.categoria);
  const availMeta = window.ACCESORIO_CATEGORIES.disponibilidad.find(d => d.id === acc.avail);
  const priceHistory = window.getAccesorioPriceHistory(acc.id);
  const existencias = window.getAccesorioExistencias(acc.id);
  const armasComp = window.getArmasCompatibles(acc);
  const manualById = (id) => window.getAccesorioManual(id);
  const currentManual = manualById(acc.priceManualId) ||
    (priceHistory.length ? manualById(priceHistory[priceHistory.length - 1].manualId) : null) ||
    window.getAccesorioPrimaryManual();
  const curAut = window.manualAutoridad ? window.manualAutoridad(currentManual) : null;
  const curSigla = curAut ? curAut.sigla : 'DCAM';
  const relacionados = (window.ACCESORIOS || []).filter(a => a.categoria === acc.categoria && a.id !== acc.id).slice(0, 6);

  const [imgError, setImgError] = useStateAcc(false);

  return (
    <div style={{ paddingBottom: 90, maxWidth: 1100, margin: '0 auto', width: '100%' }}>
      {/* HERO: imagen + cabecera */}
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
          {window.isRealImage(acc.img) && !imgError ? (
            <img src={acc.img} alt={acc.nombre} onError={() => setImgError(true)}
              style={{ maxWidth: '82%', maxHeight: '82%', objectFit: 'contain', position: 'relative', zIndex: 1 }} />
          ) : (
            <AccNoImage acc={acc} />
          )}
          <span style={{
            position: 'absolute', top: 10, left: 10,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: P.textDim,
            // Va sobre la PLACA fotográfica, clara en los dos temas: la tinta
            // se fija a --tinta-placa (CLARO.tinta2 se aclara en oscuro).
            background: 'rgba(250,249,245,0.92)', color: 'var(--tinta-placa)', padding: '3px 8px', borderRadius: 4, letterSpacing: '0.1em',
            textTransform: 'uppercase', borderLeft: `2px solid ${P.amber}`,
          }}>{cat.icon} {cat.label}</span>
        </div>

        <div style={{ paddingTop: vp.isDesktop ? 4 : 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            {window.CountryFlag && <window.CountryFlag pais={acc.pais} height={14} />}
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 14.5, color: P.amber,
              letterSpacing: '0.16em', textTransform: 'uppercase',
            }}>{acc.marca}{acc.pais ? ` · ${acc.pais}` : ''}</span>
          </div>
          <h1 style={{
            fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: vp.isDesktop ? 30 : 25,
            color: P.text, textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.08, margin: '0 0 12px',
          }}>{acc.nombre}</h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            <window.AvailBadge avail={acc.avail} />
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: P.bgCard, border: `1px solid ${P.border}`, padding: '3px 9px',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: P.textDim,
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}><span style={{ color: P.amber }}>{cat.icon}</span>{cat.label}</span>
          </div>
          {acc.descripcion &&
            <p style={{
              fontFamily: 'Archivo, system-ui, sans-serif', fontSize: 17.5, color: P.textDim,
              lineHeight: 1.65, margin: '0 0 6px', textWrap: 'pretty',
            }}>{acc.descripcion}</p>
          }
        </div>
      </div>

      {/* CUERPO en columnas en escritorio */}
      <div style={{
        display: vp.isDesktop ? 'grid' : 'block',
        gridTemplateColumns: vp.isDesktop ? '1fr 1fr' : 'none', gap: 24,
        padding: `20px ${padX}px 0`,
      }}>
        {/* Columna izquierda: specs + compatibilidad */}
        <div>
          {acc.specs && acc.specs.length > 0 &&
            <React.Fragment>
              <window.SectionHeader>Especificaciones</window.SectionHeader>
              <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, boxShadow: window.CLARO.sombra, marginBottom: 16 }}>
                {acc.specs.map(([k, v], i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', gap: 12,
                    padding: '9px 12px',
                    borderBottom: i < acc.specs.length - 1 ? `1px solid ${P.border}` : 'none',
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 15.5,
                  }}>
                    <span style={{ color: P.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</span>
                    <span style={{ color: P.text, fontWeight: 600, textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
              </div>
            </React.Fragment>
          }

          {acc.compatibilidad && acc.compatibilidad.length > 0 &&
            <React.Fragment>
              <window.SectionHeader>Compatible con</window.SectionHeader>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                {acc.compatibilidad.map((c, i) => (
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

        {/* Columna derecha: PRECIO + HISTORIAL */}
        <div>
          <window.SectionHeader>Precio de Referencia</window.SectionHeader>
          <div style={{
            background: P.bgCard, border: `1px solid ${P.amber}`, padding: '14px',
            marginBottom: 16, position: 'relative',
          }}>
            <window.TacticalCorners size={12} color={P.amber} thickness={2} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: P.textMuted,
                letterSpacing: '0.18em', textTransform: 'uppercase',
              }}>◆ Precio Actual (con IVA)</span>
              {curAut &&
                <span title={curAut.nombre} style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700,
                  letterSpacing: '0.12em', color: '#000', background: curAut.color,
                  padding: '2px 7px', flexShrink: 0,
                }}>{curAut.sigla}</span>}
            </div>
            <div style={{
              fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 23,
              color: P.amber, letterSpacing: '0.02em',
            }}>{priceHistory.length ? priceHistory[priceHistory.length - 1].price : acc.priceExact}</div>
            {acc.dcamRef &&
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: P.textMuted,
                marginTop: 4, lineHeight: 1.4,
              }}>Ref. {curSigla}: {acc.dcamRef}</div>
            }
            {currentManual && currentManual.url &&
              <a href={currentManual.url} target="_blank" rel="noopener" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 9,
                fontFamily: 'JetBrains Mono, monospace', fontSize: 14.5, color: P.amber,
                textDecoration: 'none', border: `1px solid ${P.amber}`, padding: '9px 12px',
                minHeight: 40, boxSizing: 'border-box', letterSpacing: '0.04em',
              }}>
                <span aria-hidden="true">▦</span>
                Ver inventario fuente · {accFmtDate(currentManual.fecha)}
                <span aria-hidden="true">↗</span>
              </a>
            }
            {(() => {
              // Regla: SOLO cuenta el ÚLTIMO inventario de cada sucursal (DCAM y OTCA
              // por separado). Si el accesorio no aparece en él (pero antes sí estuvo
              // en la sucursal), se muestra AGOTADO.
              const autOf = (m) => (m && (m.autoridad || (window.manualAutoridad ? window.manualAutoridad(m).sigla : 'DCAM'))) || 'DCAM';
              const allMan = (window.ACCESORIOS_MANUALES || []).slice().sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
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
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14.5, color: P.text, letterSpacing: '0.06em' }}>disponibles en <b style={{ letterSpacing: '0.08em' }}>{b.sigla}</b></span>
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
                        {b.manual ? (b.agotado ? ' (' + accFmtDate(b.manual.fecha) + ').' : ', publicado el ' + accFmtDate(b.manual.fecha) + '.') : '.'}
                      </div>
                    </div>
                  ))}
                  <div style={window.amxProsa({ fontSize: 13, color: P.textMuted, marginTop: 7, lineHeight: 1.5 })}>
                    ⚠ Dato <b style={{ color: P.textDim }}>histórico</b> por sucursal, no en tiempo real: la disponibilidad actual puede variar.
                  </div>
                </div>
              );
            })()}
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: P.textDim, marginTop: 9,
            }}>Nivel: <window.PriceLevel lvl={acc.priceLvl} size={13} /></div>
          </div>

          {/* HISTORIAL DE PRECIOS */}
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
                          <span style={{
                            color: i === 0 ? P.amber : P.textMuted, fontSize: 13, letterSpacing: '0.1em', flexShrink: 0,
                          }}>{i === 0 ? '● ACTUAL' : '○'}</span>
                          <span style={{ color: P.text, fontWeight: i === 0 ? 700 : 500 }}>{h.price}</span>
                          {hAut &&
                            <span title={hAut.nombre} style={{
                              fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700,
                              letterSpacing: '0.1em', color: '#000', background: hAut.color,
                              padding: '1px 6px', flexShrink: 0,
                            }}>{hAut.sigla}</span>}
                        </div>
                        <span style={{ color: P.textDim, fontSize: 14.5, flexShrink: 0 }}>{accFmtDate(h.date) || '—'}</span>
                      </div>
                      {man &&
                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
                          marginTop: 6, paddingLeft: 22,
                        }}>
                          <span style={{
                            color: P.textMuted, fontSize: 13,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>{man.nombre}</span>
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

          {/* Estatus legal */}
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
                  {availMeta.desc}
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

      {/* Relacionados */}
      {relacionados.length > 0 &&
        <div style={{ marginTop: 6 }}>
          <window.CarouselSection
            title="Accesorios relacionados"
            items={relacionados}
            renderItem={(a) => <AccesorioCard acc={a} onClick={() => onOpenAccesorio(a.id)} />}
          />
        </div>
      }
    </div>
  );
}
window.AccesorioFicha = AccesorioFicha;
