// Armado en México — Componentes UI compartidos
// Estética: oscuro elegante con detalles tácticos (color palette dark/amber/military)

const PALETTE = {
  bg:        '#1A1A1A',
  bgElev:    '#2C2C2C',
  bgCard:    '#2C2C2C',
  border:    '#3A3A3A',
  borderHi:  '#555555',
  amber:     '#F5C518',
  amberDim:  '#D4A910',
  military:  '#555555',
  red:       '#C0392B',
  blue:      '#7E8A99',
  text:      '#FFFFFF',
  textDim:   '#B5B5B5',
  textMuted: '#7A7A7A',
};
window.PALETTE = PALETTE;

// ──────────────────────────────────────────────────────────────
// USE VIEWPORT — hook responsivo
// ──────────────────────────────────────────────────────────────
function useViewport() {
  const [vp, setVp] = React.useState(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1024;
    return { width: w, isMobile: w < 720, isTablet: w >= 720 && w < 900, isDesktop: w >= 900 };
  });
  React.useEffect(() => {
    function onR() {
      const w = window.innerWidth;
      setVp({ width: w, isMobile: w < 720, isTablet: w >= 720 && w < 900, isDesktop: w >= 900 });
    }
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);
  return vp;
}
window.useViewport = useViewport;

// ──────────────────────────────────────────────────────────────
// TOP NAV — barra superior para escritorio/tablet
// ──────────────────────────────────────────────────────────────
function TopNav({ current, onNav, compareCount, onSearch }) {
  const [moreOpen, setMoreOpen] = React.useState(false);
  const moreItems = [
    { id: 'calibres', label: 'Calibres' },
    { id: 'campos',   label: 'Campos de tiro' },
    { id: 'cursos',   label: 'Cursos' },
  ];
  const items = [
    { id: 'home',    label: 'INICIO' },
    { id: 'catalog', label: 'ARSENAL' },
    { id: 'compare', label: 'COMPARAR', badge: compareCount },
    { id: 'legal',   label: 'LEGALIDAD' },
    { id: 'faq',     label: 'FAQ' },
    { id: 'about',   label: 'ACERCA' },
    { id: 'menu',    label: 'MÁS', dropdown: true },
    { id: 'submit',  label: '＋ PROPONER', accent: true },
  ];
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 50,
      height: 64,
      background: 'rgba(26,26,26,0.95)',
      backdropFilter: 'blur(10px)',
      borderBottom: `1px solid ${PALETTE.border}`,
      display: 'flex', alignItems: 'center',
      padding: '0 28px', gap: 24,
    }}>
      <button onClick={() => onNav('home')} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
        fontSize: 20, color: PALETTE.amber,
        letterSpacing: '0.1em',
        display: 'flex', alignItems: 'center', gap: 8,
        padding: 0,
      }}>
        <span style={{
          display: 'inline-block', width: 18, height: 18,
          border: `1.5px solid ${PALETTE.amber}`,
          position: 'relative',
        }}>
          <span style={{ position: 'absolute', inset: 3, background: PALETTE.amber }} />
        </span>
        ARMADO<span style={{ color: PALETTE.textDim, fontWeight: 400, fontSize: '0.75em', marginLeft: 4 }}>en MX</span>
      </button>
      <div style={{
        display: 'flex', gap: 4, marginLeft: 12,
        flex: 1,
      }}>
        {items.map(it => {
          const active = current === it.id;
          if (it.dropdown) {
            const dActive = current === 'menu';
            return (
              <div key={it.id} style={{ position: 'relative' }}
                onMouseEnter={() => setMoreOpen(true)}
                onMouseLeave={() => setMoreOpen(false)}>
                <button onClick={() => setMoreOpen(o => !o)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '8px 14px',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: 12, fontWeight: 600,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: (dActive || moreOpen) ? PALETTE.amber : PALETTE.textDim,
                  borderBottom: dActive ? `2px solid ${PALETTE.amber}` : '2px solid transparent',
                  whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5,
                  transition: 'color 0.15s',
                }}>{it.label} <span style={{ fontSize: 9, transform: moreOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span></button>
                {moreOpen && (
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, minWidth: 200,
                    background: 'rgba(26,26,26,0.98)', backdropFilter: 'blur(10px)',
                    border: `1px solid ${PALETTE.border}`,
                    borderTop: `2px solid ${PALETTE.amber}`,
                    boxShadow: '0 12px 30px rgba(0,0,0,0.55)',
                    zIndex: 60, padding: 4,
                  }}>
                    {moreItems.map(mi => {
                      const miActive = current === mi.id;
                      return (
                        <button key={mi.id} onClick={() => { onNav(mi.id); setMoreOpen(false); }} style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          background: miActive ? 'rgba(245,197,24,0.10)' : 'none',
                          border: 'none', cursor: 'pointer', padding: '10px 12px',
                          fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 600,
                          letterSpacing: '0.08em', textTransform: 'uppercase',
                          color: miActive ? PALETTE.amber : PALETTE.text,
                          transition: 'background 0.12s, color 0.12s',
                        }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.10)'; e.currentTarget.style.color = PALETTE.amber; }}
                          onMouseLeave={e => { e.currentTarget.style.background = miActive ? 'rgba(245,197,24,0.10)' : 'transparent'; e.currentTarget.style.color = miActive ? PALETTE.amber : PALETTE.text; }}>
                          {mi.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          return (
            <button key={it.id} onClick={() => onNav(it.id)} style={{
              background: it.accent ? (active ? PALETTE.amber : 'transparent') : 'none',
              border: it.accent ? `1px solid ${PALETTE.amber}` : 'none', cursor: 'pointer',
              padding: it.accent ? '8px 12px' : '8px 14px',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 12, fontWeight: 600,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: active ? (it.accent ? '#000' : PALETTE.amber) : (it.accent ? PALETTE.amber : PALETTE.textDim),
              borderBottom: active && !it.accent ? `2px solid ${PALETTE.amber}` : (it.accent ? `1px solid ${PALETTE.amber}` : '2px solid transparent'),
              position: 'relative',
              transition: 'color 0.15s',
              marginLeft: it.accent ? 8 : 0,
              whiteSpace: 'nowrap',
            }}>
              {it.label}
              {it.badge ? (
                <span style={{
                  position: 'absolute', top: 2, right: 2,
                  background: PALETTE.amber, color: '#000',
                  fontSize: 8, fontWeight: 700,
                  padding: '1px 4px', borderRadius: 8,
                  fontFamily: 'Courier Prime, monospace',
                  minWidth: 12, textAlign: 'center', lineHeight: 1.2,
                }}>{it.badge}</span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div style={{
        fontFamily: 'Courier Prime, monospace',
        fontSize: 9, color: PALETTE.textMuted,
        letterSpacing: '0.2em', textTransform: 'uppercase',
      }}>ENCICLOPEDIA TÁCTICA · ED. 2026</div>
    </div>
  );
}
window.TopNav = TopNav;

// ──────────────────────────────────────────────────────────────
// AVAILABILITY BADGE — la disponibilidad legal del arma
// ──────────────────────────────────────────────────────────────
function AvailBadge({ avail, compact = false }) {
  const map = {
    dcam:      { label: 'CIVIL · DCAM',   color: PALETTE.military, dot: '●' },
    externo:   { label: 'CIVIL · EXT',    color: PALETTE.blue,     dot: '●' },
    seguridad: { label: 'SEGURIDAD',      color: PALETTE.amber,    dot: '◆' },
    ejercito:  { label: 'EJÉRCITO',       color: PALETTE.red,      dot: '▲' },
  };
  const m = map[avail] || map.dcam;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: compact ? '2px 6px' : '3px 8px',
      borderRadius: 2,
      background: 'rgba(0,0,0,0.55)',
      border: `1px solid ${m.color}`,
      color: m.color,
      fontFamily: 'Courier Prime, monospace',
      fontSize: compact ? '8px' : '9px',
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      lineHeight: 1,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: compact ? '6px' : '7px' }}>{m.dot}</span>
      <span>{m.label}</span>
    </span>
  );
}
window.AvailBadge = AvailBadge;

// ──────────────────────────────────────────────────────────────
// TACTICAL CORNERS — esquinas tipo mira para enmarcar contenido
// ──────────────────────────────────────────────────────────────
function TacticalCorners({ color = PALETTE.amber, size = 10, thickness = 1.5 }) {
  const style = (pos) => {
    const s = { position: 'absolute', width: size, height: size, pointerEvents: 'none' };
    if (pos.includes('t')) { s.top = 0; s.borderTop = `${thickness}px solid ${color}`; }
    if (pos.includes('b')) { s.bottom = 0; s.borderBottom = `${thickness}px solid ${color}`; }
    if (pos.includes('l')) { s.left = 0; s.borderLeft = `${thickness}px solid ${color}`; }
    if (pos.includes('r')) { s.right = 0; s.borderRight = `${thickness}px solid ${color}`; }
    return s;
  };
  return (
    <React.Fragment>
      <span style={style('tl')}></span>
      <span style={style('tr')}></span>
      <span style={style('bl')}></span>
      <span style={style('br')}></span>
    </React.Fragment>
  );
}
window.TacticalCorners = TacticalCorners;

// ──────────────────────────────────────────────────────────────
// STATS BAR — barra de estadística estilo videojuego
// ──────────────────────────────────────────────────────────────
function StatsBar({ label, value, max = 100, color = PALETTE.amber, compareValue = null }) {
  const pct = Math.min(100, (value / max) * 100);
  const cmpPct = compareValue != null ? Math.min(100, (compareValue / max) * 100) : null;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontFamily: 'Courier Prime, monospace',
        fontSize: 10, color: PALETTE.textDim,
        textTransform: 'uppercase', letterSpacing: '0.1em',
        marginBottom: 4,
      }}>
        <span>{label}</span>
        <span style={{ color: PALETTE.text, fontWeight: 600 }}>{value}</span>
      </div>
      <div style={{
        position: 'relative',
        height: 6,
        background: PALETTE.bg,
        border: `1px solid ${PALETTE.border}`,
        borderRadius: 1,
        overflow: 'hidden',
      }}>
        {cmpPct != null && (
          <div style={{
            position: 'absolute', inset: 0,
            width: `${cmpPct}%`,
            background: 'rgba(90,122,154,0.35)',
            borderRight: `1px dashed ${PALETTE.blue}`,
          }} />
        )}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: 0,
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}aa, ${color})`,
          boxShadow: `0 0 6px ${color}55`,
        }} />
        {/* segmentos visuales */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 9px, rgba(0,0,0,0.6) 9px 10px)',
          pointerEvents: 'none',
        }} />
      </div>
    </div>
  );
}
window.StatsBar = StatsBar;

// ──────────────────────────────────────────────────────────────
// SECTION HEADER — encabezado de sección con línea
// ──────────────────────────────────────────────────────────────
function SectionHeader({ children, action, accent = PALETTE.amber }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      marginBottom: 12, marginTop: 4,
    }}>
      <span style={{
        width: 3, height: 14, background: accent,
        boxShadow: `0 0 6px ${accent}66`,
      }} />
      <div style={{
        fontFamily: 'Montserrat, sans-serif',
        fontSize: 14, fontWeight: 600,
        color: PALETTE.text,
        textTransform: 'uppercase', letterSpacing: '0.15em',
        flex: 1,
      }}>{children}</div>
      {action}
    </div>
  );
}
window.SectionHeader = SectionHeader;

// ──────────────────────────────────────────────────────────────
// APP HEADER — barra superior con logo + acciones
// ──────────────────────────────────────────────────────────────
function AppHeader({ title, back, onBack, right }) {
  const cfg = window.Store ? window.Store.getAppConfig() : { logo: '', logoText: 'ARMADO en MX' };
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(26,26,26,0.92)',
      backdropFilter: 'blur(8px)',
      borderBottom: `1px solid ${PALETTE.border}`,
      display: 'flex', alignItems: 'center',
      padding: '0 14px', gap: 10,
      minHeight: 50,
      paddingTop: 'env(safe-area-inset-top)',
    }}>
      {back ? (
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: PALETTE.amber, fontSize: 18, padding: 4,
          fontFamily: 'Courier Prime, monospace',
        }}>‹</button>
      ) : (
        <div style={{
          fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
          fontSize: 16, color: PALETTE.amber,
          letterSpacing: '0.08em',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {cfg.logo ? (
            <img src={cfg.logo} alt="logo" style={{
              width: 28, height: 28, objectFit: 'contain',
              borderRadius: 6,
            }} />
          ) : (
            <span aria-label="logo placeholder" style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28,
              border: `1.5px dashed ${PALETTE.amber}`,
              borderRadius: 6, color: PALETTE.amber,
              fontFamily: 'Courier Prime, monospace',
              fontSize: 9, letterSpacing: '0.1em',
              background: 'rgba(245,197,24,0.08)',
            }}>LOGO</span>
          )}
          <span style={{ whiteSpace: 'nowrap' }}>
            {(cfg.logoText || 'ARMADO en MX').split(/\s+(?=en\s+MX)/i).map((part, i) =>
              i === 0
                ? <span key="t">{part}</span>
                : <span key="s" style={{ color: PALETTE.textDim, fontWeight: 400, fontSize: '0.72em', marginLeft: 4 }}>{part}</span>
            )}
          </span>
        </div>
      )}
      <div style={{
        flex: 1,
        fontFamily: 'Montserrat, sans-serif',
        fontSize: 14, fontWeight: 500,
        color: PALETTE.text,
        textTransform: 'uppercase', letterSpacing: '0.12em',
        textAlign: back ? 'left' : 'right',
      }}>{title}</div>
      {right}
    </div>
  );
}
window.AppHeader = AppHeader;

// ──────────────────────────────────────────────────────────────
// BOTTOM NAV — navegación inferior
// ──────────────────────────────────────────────────────────────
function BottomNav({ current, onNav, compareCount }) {
  const items = [
    { id: 'home',    label: 'INICIO',     icon: '◈' },
    { id: 'catalog', label: 'ARSENAL',    icon: '▤' },
    { id: 'compare', label: 'COMPARAR',   icon: '⇄', badge: compareCount },
    { id: 'legal',   label: 'LEGALIDAD',  icon: '§' },
    { id: 'menu',    label: 'MÁS',        icon: '☰' },
  ];
  return (
    <div style={{
      position: 'sticky', bottom: 0, zIndex: 50,
      background: 'rgba(26,26,26,0.96)',
      backdropFilter: 'blur(12px)',
      borderTop: `1px solid ${PALETTE.border}`,
      display: 'flex',
      padding: '6px 4px 10px',
      paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
    }}>
      {items.map(it => {
        const active = current === it.id;
        return (
          <button key={it.id} onClick={() => onNav(it.id)} style={{
            flex: 1, background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '6px 4px', gap: 3,
            color: active ? PALETTE.amber : PALETTE.textDim,
            position: 'relative',
          }}>
            {active && (
              <span style={{
                position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)',
                width: 18, height: 2, background: PALETTE.amber,
                boxShadow: `0 0 6px ${PALETTE.amber}`,
              }} />
            )}
            <span style={{ fontSize: 16, lineHeight: 1, position: 'relative' }}>
              {it.icon}
              {it.badge ? (
                <span style={{
                  position: 'absolute', top: -4, right: -8,
                  background: PALETTE.amber, color: '#000',
                  fontSize: 8, fontWeight: 700,
                  borderRadius: 8, padding: '1px 4px',
                  fontFamily: 'Courier Prime, monospace',
                  minWidth: 12, textAlign: 'center', lineHeight: 1.2,
                }}>{it.badge}</span>
              ) : null}
            </span>
            <span style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 9, fontWeight: 500,
              letterSpacing: '0.08em',
            }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}
window.BottomNav = BottomNav;

// ──────────────────────────────────────────────────────────────
// ARMA CARD — tarjeta de arma estilo "ficha de armería"
// ──────────────────────────────────────────────────────────────
function ArmaCard({ arma, onClick, onCompare, inCompare }) {
  const [imgError, setImgError] = React.useState(false);
  return (
    <div onClick={onClick} style={{
      position: 'relative',
      background: PALETTE.bgCard,
      border: `1px solid ${PALETTE.border}`,
      cursor: 'pointer',
      transition: 'border-color 0.18s',
      overflow: 'hidden',
      contentVisibility: 'auto',
      containIntrinsicSize: 'auto 232px',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = PALETTE.amber}
    onMouseLeave={e => e.currentTarget.style.borderColor = PALETTE.border}
    >
      <TacticalCorners size={8} color={PALETTE.amber} />
      {/* imagen */}
      <div style={{
        height: 110,
        background: `radial-gradient(circle at 50% 50%, ${PALETTE.bgElev} 0%, ${PALETTE.bg} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
        borderBottom: `1px solid ${PALETTE.border}`,
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `repeating-linear-gradient(0deg, transparent 0 3px, rgba(245,197,24,0.03) 3px 4px)`,
        }} />
        {!imgError ? (
          <img src={arma.img} alt={arma.nombre}
            loading="lazy" decoding="async"
            onError={() => setImgError(true)}
            style={{
              maxWidth: '88%', maxHeight: '88%', objectFit: 'contain',
              filter: 'grayscale(0.25) contrast(1.1)',
              position: 'relative', zIndex: 1,
            }} />
        ) : (
          <img src={window.armaPlaceholder(arma)} alt={arma.nombre}
            loading="lazy" decoding="async"
            style={{
              maxWidth: '90%', maxHeight: '70%', objectFit: 'contain',
              position: 'relative', zIndex: 1, opacity: 0.85,
            }} />
        )}
        {/* tipo top-left */}
        <span style={{
          position: 'absolute', top: 6, left: 6,
          fontFamily: 'Courier Prime, monospace',
          fontSize: 8, fontWeight: 600,
          color: PALETTE.textDim,
          background: 'rgba(0,0,0,0.6)',
          padding: '2px 5px',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          borderLeft: `2px solid ${PALETTE.amber}`,
        }}>{arma.tipo}</span>
        {/* compare button */}
        <button onClick={(e) => { e.stopPropagation(); onCompare && onCompare(); }}
          style={{
            position: 'absolute', top: 6, right: 6,
            background: inCompare ? PALETTE.amber : 'rgba(0,0,0,0.6)',
            color: inCompare ? '#000' : PALETTE.textDim,
            border: `1px solid ${inCompare ? PALETTE.amber : PALETTE.border}`,
            padding: '2px 5px',
            fontFamily: 'Courier Prime, monospace',
            fontSize: 9, fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '0.05em',
          }}>{inCompare ? '✓' : '⇄'}</button>
      </div>
      {/* body */}
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{
          fontFamily: 'Courier Prime, monospace',
          fontSize: 9, color: PALETTE.amber,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          marginBottom: 2,
        }}>{arma.marca} · {arma.pais}</div>
        <div style={{
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 600, fontSize: 15,
          color: PALETTE.text,
          textTransform: 'uppercase',
          lineHeight: 1.15,
          marginBottom: 6,
          letterSpacing: '0.02em',
        }}>{arma.nombre}</div>
        {/* mini specs */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 8px',
          fontFamily: 'Courier Prime, monospace',
          fontSize: 9,
          color: PALETTE.textDim,
          marginBottom: 8,
        }}>
          <div><span style={{ color: PALETTE.textMuted }}>CAL </span>{arma.calibre.replace(' Parabellum','').replace('Winchester','Win')}</div>
          <div><span style={{ color: PALETTE.textMuted }}>CAP </span>{arma.capacidad}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <AvailBadge avail={arma.avail} compact />
          <span style={{
            fontFamily: 'Courier Prime, monospace',
            fontSize: 10, color: PALETTE.amber,
            letterSpacing: '0.1em', fontWeight: 700,
          }}>{window.starsCost(arma.priceLvl)}</span>
        </div>
      </div>
    </div>
  );
}
window.ArmaCard = ArmaCard;

// ──────────────────────────────────────────────────────────────
// SPEC ROW — fila de especificación técnica
// ──────────────────────────────────────────────────────────────
function SpecRow({ label, value, accent }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      padding: '7px 10px',
      borderBottom: `1px solid ${PALETTE.border}`,
      fontFamily: 'Courier Prime, monospace',
      fontSize: 11,
    }}>
      <span style={{
        color: PALETTE.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        fontSize: 10,
      }}>{label}</span>
      <span style={{ color: accent || PALETTE.text, fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  );
}
window.SpecRow = SpecRow;

// ──────────────────────────────────────────────────────────────
// COUNTRY FLAG — bandera SVG simplificada por país de origen
// (representaciones esquemáticas; sin escudos detallados)
// ──────────────────────────────────────────────────────────────
function CountryFlag({ pais, height = 14, style = {} }) {
  const h = height;
  const w = Math.round(h * 1.5);
  const base = {
    display: 'inline-block',
    verticalAlign: 'middle',
    border: '1px solid rgba(0,0,0,0.5)',
    boxShadow: '0 0 0 1px rgba(255,255,255,0.06)',
    flexShrink: 0,
    ...style,
  };
  const flags = {
    'México': (
      <svg width={w} height={h} viewBox="0 0 60 40" style={base}>
        <rect width="20" height="40" fill="#006847"/>
        <rect x="20" width="20" height="40" fill="#fff"/>
        <rect x="40" width="20" height="40" fill="#ce1126"/>
        <ellipse cx="30" cy="20" rx="5" ry="3.5" fill="none" stroke="#7a4319" strokeWidth="0.9"/>
      </svg>
    ),
    'Brasil': (
      <svg width={w} height={h} viewBox="0 0 60 40" style={base}>
        <rect width="60" height="40" fill="#009c3b"/>
        <polygon points="30,5 55,20 30,35 5,20" fill="#ffdf00"/>
        <circle cx="30" cy="20" r="8" fill="#002776"/>
      </svg>
    ),
    'Argentina': (
      <svg width={w} height={h} viewBox="0 0 60 40" style={base}>
        <rect width="60" height="13.33" fill="#74acdf"/>
        <rect y="13.33" width="60" height="13.34" fill="#fff"/>
        <rect y="26.67" width="60" height="13.33" fill="#74acdf"/>
        <circle cx="30" cy="20" r="3" fill="#fcbf49"/>
      </svg>
    ),
    'EE.UU.': (() => {
      const stripeH = 40 / 13;
      return (
        <svg width={w} height={h} viewBox="0 0 60 40" style={base}>
          <rect width="60" height="40" fill="#fff"/>
          {[0,2,4,6,8,10,12].map(i => (
            <rect key={i} y={i * stripeH} width="60" height={stripeH} fill="#b22234"/>
          ))}
          <rect width="24" height={stripeH * 7} fill="#3c3b6e"/>
        </svg>
      );
    })(),
    'Italia': (
      <svg width={w} height={h} viewBox="0 0 60 40" style={base}>
        <rect width="20" height="40" fill="#009246"/>
        <rect x="20" width="20" height="40" fill="#fff"/>
        <rect x="40" width="20" height="40" fill="#ce2b37"/>
      </svg>
    ),
    'Austria': (
      <svg width={w} height={h} viewBox="0 0 60 40" style={base}>
        <rect width="60" height="40" fill="#ed2939"/>
        <rect y="13.33" width="60" height="13.34" fill="#fff"/>
      </svg>
    ),
    'Alemania': (
      <svg width={w} height={h} viewBox="0 0 60 40" style={base}>
        <rect width="60" height="13.33" fill="#000"/>
        <rect y="13.33" width="60" height="13.34" fill="#dd0000"/>
        <rect y="26.67" width="60" height="13.33" fill="#ffce00"/>
      </svg>
    ),
    'España': (
      <svg width={w} height={h} viewBox="0 0 60 40" style={base}>
        <rect width="60" height="40" fill="#aa151b"/>
        <rect y="10" width="60" height="20" fill="#f1bf00"/>
      </svg>
    ),
    'Bélgica': (
      <svg width={w} height={h} viewBox="0 0 60 40" style={base}>
        <rect width="20" height="40" fill="#000"/>
        <rect x="20" width="20" height="40" fill="#fae042"/>
        <rect x="40" width="20" height="40" fill="#ed2939"/>
      </svg>
    ),
    'Rep. Checa': (
      <svg width={w} height={h} viewBox="0 0 60 40" style={base}>
        <rect width="60" height="20" fill="#fff"/>
        <rect y="20" width="60" height="20" fill="#d7141a"/>
        <polygon points="0,0 30,20 0,40" fill="#11457e"/>
      </svg>
    ),
    'Israel': (
      <svg width={w} height={h} viewBox="0 0 60 40" style={base}>
        <rect width="60" height="40" fill="#fff"/>
        <rect y="6" width="60" height="4" fill="#0038b8"/>
        <rect y="30" width="60" height="4" fill="#0038b8"/>
        <polygon points="30,15 33.5,25 26.5,25" fill="none" stroke="#0038b8" strokeWidth="0.8"/>
        <polygon points="30,25 33.5,15 26.5,15" fill="none" stroke="#0038b8" strokeWidth="0.8"/>
      </svg>
    ),
    'Turquía': (
      <svg width={w} height={h} viewBox="0 0 60 40" style={base}>
        <rect width="60" height="40" fill="#e30a17"/>
        <circle cx="24" cy="20" r="7" fill="#fff"/>
        <circle cx="26.5" cy="20" r="5.5" fill="#e30a17"/>
        <polygon points="34,20 37.5,18.5 36.2,22" fill="#fff"/>
      </svg>
    ),
    'Croacia': (
      <svg width={w} height={h} viewBox="0 0 60 40" style={base}>
        <rect width="60" height="13.33" fill="#ff0000"/>
        <rect y="13.33" width="60" height="13.34" fill="#fff"/>
        <rect y="26.67" width="60" height="13.33" fill="#171796"/>
      </svg>
    ),
    'Suiza': (
      <svg width={h} height={h} viewBox="0 0 32 32" style={base}>
        <rect width="32" height="32" fill="#d52b1e"/>
        <rect x="13.5" y="6" width="5" height="20" fill="#fff"/>
        <rect x="6" y="13.5" width="20" height="5" fill="#fff"/>
      </svg>
    ),
    'Rusia': (
      <svg width={w} height={h} viewBox="0 0 60 40" style={base}>
        <rect width="60" height="13.33" fill="#fff"/>
        <rect y="13.33" width="60" height="13.34" fill="#0039a6"/>
        <rect y="26.67" width="60" height="13.33" fill="#d52b1e"/>
      </svg>
    ),
  };
  // alias
  const aliases = {
    'Mexico': 'México',
    'Brazil': 'Brasil',
    'EEUU': 'EE.UU.', 'Estados Unidos': 'EE.UU.', 'USA': 'EE.UU.',
    'Italy': 'Italia',
    'Spain': 'España',
    'República Checa': 'Rep. Checa', 'Czech Republic': 'Rep. Checa',
    'Turkey': 'Turquía',
    'Bélgica/EE.UU.': 'Bélgica',
  };
  const key = flags[pais] ? pais : aliases[pais];
  return flags[key] || (
    <span style={{
      display: 'inline-block',
      width: w, height: h,
      background: PALETTE.bgElev,
      border: `1px solid ${PALETTE.border}`,
      ...style,
    }} />
  );
}
window.CountryFlag = CountryFlag;

// ──────────────────────────────────────────────────────────────
// MINI SPEC CARD — tarjeta de spec con miniatura tipo HUD táctico
// Estilo inspirado en HUD de videojuego (esquinas, dot accent)
// ──────────────────────────────────────────────────────────────
function MiniSpec({ icon, fallbackIcon, label, value }) {
  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(180deg, rgba(28,33,26,0.85) 0%, rgba(26,26,26,0.85) 100%)',
      border: `1px solid ${PALETTE.border}`,
      padding: '10px 12px 10px 10px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      minHeight: 56,
    }}>
      <TacticalCorners size={7} color={PALETTE.amber} thickness={1.25} />
      {/* dot accent top-right */}
      <span style={{
        position: 'absolute', top: 6, right: 8,
        width: 5, height: 5, borderRadius: 5,
        background: PALETTE.amber,
        boxShadow: `0 0 6px ${PALETTE.amber}`,
      }} />
      {/* ICON */}
      <div style={{
        width: 34, height: 34,
        background: PALETTE.bg,
        border: `1px solid ${PALETTE.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon ? (
          <img src={icon} alt={label} style={{
            maxWidth: 26, maxHeight: 26, objectFit: 'contain',
            filter: 'brightness(1.05)',
          }} onError={(e) => {
            // fallback a glifo monoespaciado
            e.target.style.display = 'none';
            if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';
          }} />
        ) : null}
        <span style={{
          display: icon ? 'none' : 'block',
          fontFamily: 'Courier Prime, monospace',
          fontSize: 14, fontWeight: 700,
          color: PALETTE.amber,
          letterSpacing: 0,
        }}>{fallbackIcon || '◆'}</span>
      </div>
      {/* TEXT */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontFamily: 'Courier Prime, monospace',
          fontSize: 9, color: PALETTE.amber,
          textTransform: 'uppercase', letterSpacing: '0.14em',
          marginBottom: 2,
        }}>{label}</div>
        <div style={{
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 600, fontSize: 14,
          color: PALETTE.text,
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          lineHeight: 1.1,
        }}>{value}</div>
      </div>
    </div>
  );
}
window.MiniSpec = MiniSpec;

// ──────────────────────────────────────────────────────────────
// FILTER CHIP — chip de filtro
// ──────────────────────────────────────────────────────────────
function FilterChip({ children, active, onClick, count }) {
  return (
    <button onClick={onClick} style={{
      background: active ? PALETTE.amber : 'transparent',
      color: active ? '#000' : PALETTE.textDim,
      border: `1px solid ${active ? PALETTE.amber : PALETTE.border}`,
      padding: '5px 10px',
      fontFamily: 'Courier Prime, monospace',
      fontSize: 10, fontWeight: 600,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      transition: 'all 0.15s',
      display: 'inline-flex', alignItems: 'center', gap: 5,
    }}>
      {children}
      {count != null && (
        <span style={{
          fontSize: 9, opacity: 0.7,
        }}>· {count}</span>
      )}
    </button>
  );
}
window.FilterChip = FilterChip;

// ──────────────────────────────────────────────────────────────
// COMPARE FLOATING BAR — barra flotante de comparación
// ──────────────────────────────────────────────────────────────
function CompareFloat({ ids, onOpen, onClear }) {
  if (!ids || !ids.length) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 'calc(76px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)',
      width: 'calc(100% - 24px)', maxWidth: 360,
      background: PALETTE.bgElev,
      border: `1px solid ${PALETTE.amber}`,
      boxShadow: `0 0 0 1px rgba(245,197,24,0.2), 0 8px 24px rgba(0,0,0,0.6)`,
      padding: '8px 12px',
      display: 'flex', alignItems: 'center', gap: 8,
      zIndex: 60,
      animation: 'slideUp 0.25s ease',
    }}>
      <span style={{
        fontFamily: 'Courier Prime, monospace',
        fontSize: 10, color: PALETTE.amber,
        letterSpacing: '0.1em', fontWeight: 700,
      }}>⇄ {ids.length}/2</span>
      <span style={{
        fontFamily: 'Courier Prime, monospace',
        fontSize: 10, color: PALETTE.textDim, flex: 1,
      }}>{ids.length === 1 ? 'Selecciona otra para comparar' : 'Listas para comparar'}</span>
      {ids.length === 2 && (
        <button onClick={onOpen} style={{
          background: PALETTE.amber, color: '#000', border: 'none',
          padding: '5px 10px',
          fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 11,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          cursor: 'pointer',
        }}>Ver</button>
      )}
      <button onClick={onClear} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: PALETTE.textDim, fontSize: 14, padding: 2,
      }}>✕</button>
    </div>
  );
}
window.CompareFloat = CompareFloat;

// ──────────────────────────────────────────────────────────────
// STAR RATING — widget e-commerce 1-5 ⭐
// ──────────────────────────────────────────────────────────────
let __starUid = 0;
function StarRating({ value = 0, count = 0, interactive = false, onRate, size = 'sm', showCount = true, label }) {
  const [hover, setHover] = React.useState(0);
  const [uid] = React.useState(() => 'sr' + (++__starUid));
  const PX = { xs: 11, sm: 14, md: 18, lg: 26 }[size] || 14;
  const v = hover || value || 0;
  const onClick = (n) => { if (interactive && typeof onRate === 'function') onRate(n); };
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, userSelect: 'none' }}
      onMouseLeave={() => interactive && setHover(0)}>
      <div style={{ display: 'inline-flex', gap: 1 }}>
        {[1, 2, 3, 4, 5].map(n => {
          // fill 0..1 based on v
          const fill = Math.max(0, Math.min(1, v - (n - 1)));
          const gradId = uid + '_' + n;
          const star = (
            <svg width={PX} height={PX} viewBox="0 0 24 24" style={{ display: 'block' }}>
              <defs>
                <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="0">
                  <stop offset={(fill * 100) + '%'} stopColor="#F5C518" />
                  <stop offset={(fill * 100) + '%'} stopColor="rgba(245,197,24,0.18)" />
                </linearGradient>
              </defs>
              <path d="M12 2.3l2.95 6.0 6.61.96-4.78 4.66 1.13 6.6L12 17.4l-5.91 3.12 1.13-6.6L2.44 9.26l6.61-.96L12 2.3z"
                fill={`url(#${gradId})`}
                stroke="#F5C518" strokeWidth="0.9" strokeLinejoin="round" />
            </svg>
          );
          return interactive ? (
            <button key={n}
              type="button"
              onClick={(e) => { e.stopPropagation(); onClick(n); }}
              onMouseEnter={() => setHover(n)}
              aria-label={`${n} estrella${n > 1 ? 's' : ''}`}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 2, lineHeight: 0,
                touchAction: 'manipulation',
              }}>{star}</button>
          ) : (
            <span key={n} style={{ display: 'inline-block', padding: '0 0.5px', lineHeight: 0 }}>{star}</span>
          );
        })}
      </div>
      {showCount && (
        <span style={{
          fontFamily: 'Courier Prime, monospace',
          fontSize: Math.max(9, PX - 5),
          color: PALETTE.textMuted,
          letterSpacing: '0.04em',
          whiteSpace: 'nowrap',
        }}>
          {count > 0
            ? <>{value.toFixed(1)} <span style={{ opacity: 0.6 }}>({count})</span></>
            : (interactive ? 'Sé el primero' : 'Sin calificar')}
        </span>
      )}
      {label && (
        <span style={{
          fontFamily: 'Courier Prime, monospace',
          fontSize: Math.max(9, PX - 5),
          color: PALETTE.textDim,
          letterSpacing: '0.04em',
        }}>{label}</span>
      )}
    </div>
  );
}
window.StarRating = StarRating;

// ──────────────────────────────────────────────────────────────
// HORIZONTAL CAROUSEL — scroll-snap horizontal con flechas opcionales
// ──────────────────────────────────────────────────────────────
function HCarousel({ items, renderItem, itemWidth = 175, gap = 12, padX = 16, emptyText }) {
  if (!items || !items.length) {
    return emptyText ? (
      <div style={{
        padding: '20px 14px',
        background: PALETTE.bgElev,
        border: `1px dashed ${PALETTE.border}`,
        color: PALETTE.textMuted,
        fontFamily: 'Courier Prime, monospace',
        fontSize: 11, letterSpacing: '0.04em',
        textAlign: 'center',
        margin: `0 ${padX}px`,
      }}>{emptyText}</div>
    ) : null;
  }
  return (
    <div style={{
      display: 'flex', gap, overflowX: 'auto', overflowY: 'hidden',
      scrollSnapType: 'x mandatory',
      WebkitOverflowScrolling: 'touch',
      padding: `4px ${padX}px 12px`,
      scrollPaddingLeft: padX,
      // hide scrollbar on mobile, subtle on desktop
    }} className="amx-hscroll">
      {items.map((it, i) => (
        <div key={it.id || i} style={{
          flex: `0 0 ${itemWidth}px`,
          scrollSnapAlign: 'start',
        }}>{renderItem(it, i)}</div>
      ))}
    </div>
  );
}
window.HCarousel = HCarousel;
