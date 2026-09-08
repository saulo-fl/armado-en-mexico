// Armado en México — Apartados nuevos
// CalibresScreen · CamposScreen · CursosScreen + tarjetas para la home
// ───────────────────────────────────────────────────────────────────────
const { useState: useState3, useMemo: useMemo3 } = React;

// ── helpers ──────────────────────────────────────────────────────────────
function armasPorCalibre(id) {
  return (window.DB || []).filter((a) => a.calibre === id);
}

// Tira horizontal con arrastre por mouse (drag-to-scroll) + táctil nativo.
// Resuelve que en escritorio no se pudiera deslizar sin barra visible.
function DragScroll({ children, style }) {
  const ref = React.useRef(null);
  const st = React.useRef({ down: false, moved: false, x0: 0, s0: 0 });
  const [grab, setGrab] = React.useState(false);
  const down = (e) => {
    if (e.pointerType === 'touch') return; // táctil: scroll nativo
    const el = ref.current; if (!el) return;
    st.current = { down: true, moved: false, x0: e.clientX, s0: el.scrollLeft };
  };
  const move = (e) => {
    if (!st.current.down) return;
    const el = ref.current; if (!el) return;
    const dx = e.clientX - st.current.x0;
    if (Math.abs(dx) > 5 && !st.current.moved) { st.current.moved = true; setGrab(true); }
    if (st.current.moved) el.scrollLeft = st.current.s0 - dx;
  };
  const up = () => { st.current.down = false; setGrab(false); };
  const onClickCapture = (e) => {
    if (st.current.moved) { e.preventDefault(); e.stopPropagation(); st.current.moved = false; }
  };
  return (
    <div ref={ref} className="amx-hscroll"
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
      onClickCapture={onClickCapture}
      style={Object.assign({ cursor: grab ? 'grabbing' : 'grab' }, style)}>
      {children}
    </div>
  );
}
window.DragScroll = DragScroll;

// ═══════════════════════════════════════════════════════════════════════
// IMAGE SLOT — panel sólido limpio con etiqueta (foto real a futuro)
// ═══════════════════════════════════════════════════════════════════════
function StripePlaceholder({ label, ratio = '16 / 9', children }) {
  return (
    <div style={{
      position: 'relative', width: '100%', aspectRatio: ratio, flexShrink: 0,
      overflow: 'hidden',
      background: PALETTE.bgElev,
      borderBottom: `1px solid ${PALETTE.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {children || (
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 14.5,
          color: PALETTE.textMuted, letterSpacing: '0.18em',
          textTransform: 'uppercase', textAlign: 'center', padding: '0 10px',
        }}>{label}</span>
      )}
    </div>
  );
}
window.StripePlaceholder = StripePlaceholder;

// pequeño badge reutilizable
function MiniBadge({ children, color = PALETTE.amber, solid = false }) {
  return (
    <span style={{
      fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700,
      letterSpacing: '0.12em', textTransform: 'uppercase',
      padding: '3px 7px',
      // El badge sólido pintaba el texto en '#173A32' fijo. Su único llamador
      // (CampoCard, el estatus destacado) le pasa color=PALETTE.amber, que HOY
      // vale ese mismo #173A32: verde sobre verde, 1.00:1, invisible. Se corrige
      // aquí y no en el llamador porque es el relleno el que decide su tinta.
      color: solid ? PALETTE.sobreMarca : color,   // 10.83:1 sobre el verde de marca
      background: solid ? color : 'transparent',
      border: `1px solid ${color}`,
      whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}
window.MiniBadge = MiniBadge;

// ═══════════════════════════════════════════════════════════════════════
// CALIBRES — guía enciclopédica
// ═══════════════════════════════════════════════════════════════════════
function CalibresScreen({ onOpenArma, onNav }) {
  const vp = window.useViewport();
  const padX = vp.isDesktop ? 28 : 16;
  const calibres = window.CALIBRES || [];
  const clases = useMemo3(() => ['Todos', ...Array.from(new Set(calibres.map((c) => c.sistema)))], [calibres]);
  const [clase, setClase] = useState3('Todos');
  const list = clase === 'Todos' ? calibres : calibres.filter((c) => c.sistema === clase);

  return (
    <div style={{ padding: `20px ${padX}px 90px`, maxWidth: 1100, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      {/* encabezado */}
      <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: vp.isDesktop ? 34 : 26, color: PALETTE.text, textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.05, marginBottom: 8 }}>Guía de calibres</div>
      <div style={{ fontFamily: 'Archivo, system-ui, sans-serif', fontSize: 19, color: PALETTE.textDim, lineHeight: 1.6, maxWidth: 640, marginBottom: 18 }}>
        Conoce los calibres presentes en el catálogo: su uso típico, balística aproximada y las armas que los emplean. Cifras divulgativas, varían según marca y munición.
      </div>

      {/* filtro por clase */}
      <div className="amx-hscroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, marginBottom: 18 }}>
        {clases.map((cl) => {
          const active = clase === cl;
          return (
            <button key={cl} onClick={() => setClase(cl)} style={{
              flexShrink: 0,
              background: active ? PALETTE.amber : 'transparent',
              color: active ? '#173A32' : PALETTE.textDim,
              border: `1px solid ${active ? PALETTE.amber : PALETTE.border}`,
              padding: '7px 14px', cursor: 'pointer',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 15.5,
              letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700,
            }}>{cl}</button>
          );
        })}
      </div>

      {/* lista de fichas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {list.map((c) => <CaliberFicha key={c.id} cal={c} onOpenArma={onOpenArma} vp={vp} />)}
      </div>
    </div>
  );
}
window.CalibresScreen = CalibresScreen;

// Escala real de cartuchos — la altura del PNG es proporcional a la longitud
// total real del cartucho (mm). Misma escala en todas las fichas → comparables.
const CARTUCHO_MAX_MM = 84.8;          // .30-06 / .270 / 7mm Rem / .300 WM
const CARTUCHO_FICHA_MAXH = { desktop: 212, mobile: 168 };
const CARTUCHO_HOME_MAXH = 120;

// ── CARTUCHO SLOT — rectángulo vertical para el PNG del cartucho del calibre.
// La imagen se dibuja anclada al piso con altura = longitud real escalada.
function CartuchoSlot({ cal, vp }) {
  const w = vp.isDesktop ? 104 : 72;
  const maxH = vp.isDesktop ? CARTUCHO_FICHA_MAXH.desktop : CARTUCHO_FICHA_MAXH.mobile;
  const h = Math.round(((cal.mm || 40) / CARTUCHO_MAX_MM) * maxH);
  return (
    <div style={{
      flexShrink: 0, width: w, alignSelf: 'stretch', position: 'relative', overflow: 'hidden',
      borderLeft: `1px solid ${PALETTE.border}`,
      background: cal.cartucho ? PALETTE.bgElev
        : `repeating-linear-gradient(135deg, ${PALETTE.bgElev} 0 9px, ${PALETTE.bgCard} 9px 18px)`,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      {/* corner ticks */}
      <span style={{ position: 'absolute', top: 7, left: 7, width: 9, height: 9, borderTop: `1.5px solid ${PALETTE.amber}`, borderLeft: `1.5px solid ${PALETTE.amber}`, opacity: 0.7 }} />
      <span style={{ position: 'absolute', bottom: 7, right: 7, width: 9, height: 9, borderBottom: `1.5px solid ${PALETTE.amber}`, borderRight: `1.5px solid ${PALETTE.amber}`, opacity: 0.7 }} />
      {cal.cartucho
        ? <img src={cal.cartucho} alt={`Cartucho ${cal.id}`} loading="lazy"
            style={{ height: h, width: 'auto', maxWidth: 'calc(100% - 14px)', objectFit: 'contain', objectPosition: 'bottom', display: 'block', marginBottom: 12 }} />
        : <span style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) rotate(180deg)',
            writingMode: 'vertical-rl',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: PALETTE.textMuted,
            letterSpacing: '0.2em', textTransform: 'uppercase', whiteSpace: 'nowrap',
          }}>▢ Cartucho · {cal.id}</span>}
    </div>
  );
}

function CaliberFicha({ cal, onOpenArma, vp }) {
  const armas = armasPorCalibre(cal.id);
  const stat = (k, v) => (
    <div style={{ flex: 1, minWidth: 90 }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, color: PALETTE.textMuted, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 3 }}>{k}</div>
      <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 600, fontSize: 16, color: PALETTE.text }}>{v}</div>
    </div>
  );
  return (
    <div style={{ background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`, boxShadow: window.CLARO.sombra, display: 'flex', alignItems: 'stretch', minHeight: vp.isDesktop ? CARTUCHO_FICHA_MAXH.desktop + 28 : CARTUCHO_FICHA_MAXH.mobile + 24 }}>
      <div style={{ flex: 1, minWidth: 0, padding: vp.isDesktop ? '18px 20px' : '14px' }}>
        {/* título + sistema */}
        <div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: PALETTE.amber, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 5 }}>{cal.sistema}</div>
          <span style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: vp.isDesktop ? 25 : 21, color: PALETTE.text, letterSpacing: '0.01em' }}>{cal.id}</span>
        </div>
        {/* uso */}
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14.5, color: PALETTE.amber, letterSpacing: '0.06em', marginTop: 6 }}>▸ {cal.uso}</div>
        {/* desc */}
        <div style={{ fontFamily: 'Archivo, system-ui, sans-serif', fontSize: 18, color: PALETTE.textDim, lineHeight: 1.6, marginTop: 8 }}>{cal.desc}</div>
        {/* balística */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 14, paddingTop: 12, borderTop: `1px solid ${PALETTE.border}` }}>
          {stat('Velocidad', cal.velocidad)}
          {stat('Energía', cal.energia)}
          {stat('Retroceso', cal.retroceso)}
          {stat('En catálogo', `${armas.length} arma${armas.length === 1 ? '' : 's'}`)}
        </div>
        {/* armas que lo usan */}
        {armas.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, color: PALETTE.textMuted, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>Armas que lo usan</div>
            <DragScroll style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {armas.map((a) => (
                <button key={a.id} onClick={() => onOpenArma(a.id)} style={{
                  flexShrink: 0, width: 118, background: PALETTE.bgElev, border: `1px solid ${PALETTE.border}`,
                  cursor: 'pointer', padding: 0, textAlign: 'left',
                }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = PALETTE.amber}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = PALETTE.border}>
                  <div style={{ width: '100%', aspectRatio: '16 / 9', background: '#fff', overflow: 'hidden' }}>
                    {a.img
                      ? <img src={a.img} alt={a.nombre} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                      : <div style={{ width: '100%', height: '100%', background: `repeating-linear-gradient(135deg, ${PALETTE.bgElev} 0 8px, ${PALETTE.bgCard} 8px 16px)` }} />}
                  </div>
                  <div style={{ padding: '6px 7px' }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: PALETTE.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{a.marca}</div>
                    <div style={{ fontFamily: 'Archivo, sans-serif', fontSize: 13, fontWeight: 600, color: PALETTE.text, lineHeight: 1.15, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nombre}</div>
                  </div>
                </button>
              ))}
            </DragScroll>
          </div>
        )}
      </div>
      <CartuchoSlot cal={cal} vp={vp} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CAMPOS DE TIRO — listado de clubes/polígonos (placeholder)
// ═══════════════════════════════════════════════════════════════════════
function CamposScreen({ onNav }) {
  const vp = window.useViewport();
  const padX = vp.isDesktop ? 28 : 16;
  const campos = window.CAMPOS || [];
  return (
    <div style={{ padding: `20px ${padX}px 90px`, maxWidth: 1100, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: vp.isDesktop ? 34 : 26, color: PALETTE.text, textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.05, marginBottom: 10 }}>Campos de tiro</div>

      {/* banner suscripción a futuro */}
      <div style={{
        background: `linear-gradient(135deg, ${PALETTE.bgCard} 0%, ${PALETTE.bgElev} 100%)`,
        border: `1px solid ${PALETTE.amber}`, padding: vp.isDesktop ? '16px 18px' : '14px',
        marginBottom: 20, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 17, color: PALETTE.text, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Suscripción próximamente</div>
          <div style={{ fontFamily: 'Archivo, system-ui, sans-serif', fontSize: 18, color: PALETTE.textDim, lineHeight: 1.55, marginTop: 4 }}>
            Pronto podrás suscribirte para acceder a campos y clubes de tiro aliados con beneficios y reservación. Estos son ejemplos de lo que vendrá.
          </div>
        </div>
        <button onClick={() => onNav && onNav('submit')} style={{
          // El texto era '#173A32' sobre PALETTE.amber, que hoy ES #173A32:
          // 1.00:1, el botón salía en blanco. Sobre verde de marca → sobreMarca.
          flexShrink: 0, background: PALETTE.amber, color: PALETTE.sobreMarca, border: 'none',   // 10.83:1
          padding: '11px 18px', cursor: 'pointer',
          fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 14,
          letterSpacing: '0.12em', textTransform: 'uppercase',
        }}>Avísame</button>
      </div>

      {/* grid de campos */}
      <div style={{ display: 'grid', gridTemplateColumns: vp.isDesktop ? 'repeat(3, 1fr)' : vp.isTablet ? 'repeat(2, 1fr)' : '1fr', gap: 14 }}>
        {campos.map((c) => <CampoCard key={c.id} campo={c} vp={vp} />)}
      </div>
    </div>
  );
}
window.CamposScreen = CamposScreen;

function CampoCard({ campo, vp }) {
  const destacado = /destacado/i.test(campo.estatus);
  return (
    <div style={{ background: PALETTE.bgCard, border: `1px solid ${destacado ? PALETTE.amber : PALETTE.border}` }}>
      <StripePlaceholder label={`Foto · ${campo.ciudad}`} ratio="16 / 9">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14.5, color: PALETTE.textMuted, letterSpacing: '0.16em' }}>▢ FOTO DEL CAMPO</div>
          <div style={{ fontFamily: 'Archivo, sans-serif', fontSize: 14, color: PALETTE.textDim, marginTop: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{campo.entorno}</div>
        </div>
      </StripePlaceholder>
      <div style={{ padding: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 17, color: PALETTE.text, textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.15 }}>{campo.nombre}</div>
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14.5, color: PALETTE.amber, letterSpacing: '0.06em', marginTop: 5 }}>◉ {campo.ciudad}, {campo.estado}</div>
        {/* disciplinas */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          {campo.disciplinas.map((d) => <MiniBadge key={d} color={PALETTE.border === d ? PALETTE.amber : PALETTE.textDim}>{d}</MiniBadge>)}
        </div>
        {/* meta */}
        <div style={{ display: 'flex', gap: 14, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${PALETTE.border}` }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, color: PALETTE.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Distancias</div>
            <div style={{ fontFamily: 'Archivo, sans-serif', fontSize: 14, fontWeight: 600, color: PALETTE.text, marginTop: 2 }}>{campo.distancias}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, color: PALETTE.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Acceso</div>
            <div style={{ fontFamily: 'Archivo, sans-serif', fontSize: 14, fontWeight: 600, color: PALETTE.text, marginTop: 2 }}>{campo.plan}</div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <MiniBadge color={destacado ? PALETTE.amber : PALETTE.textMuted} solid={destacado}>{campo.estatus}</MiniBadge>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CURSOS — catálogo de formación (placeholder)
// ═══════════════════════════════════════════════════════════════════════
const NIVEL_COLOR = { 'Básico': '#9AA3AD', 'Intermedio': '#9AA3AD', 'Avanzado': '#9AA3AD' };

function CursosScreen({ onNav }) {
  const vp = window.useViewport();
  const padX = vp.isDesktop ? 28 : 16;
  const cursos = window.CURSOS || [];
  return (
    <div style={{ padding: `20px ${padX}px 90px`, maxWidth: 1100, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: vp.isDesktop ? 34 : 26, color: PALETTE.text, textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.05, marginBottom: 8 }}>Cursos</div>
      <div style={{ fontFamily: 'Archivo, system-ui, sans-serif', fontSize: 19, color: PALETTE.textDim, lineHeight: 1.6, maxWidth: 640, marginBottom: 20 }}>
        Aprende antes de decidir. Catálogo de formación con instructores certificados, del manejo seguro al tiro defensivo y de precisión. Contenido de muestra.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: vp.isDesktop ? 'repeat(3, 1fr)' : vp.isTablet ? 'repeat(2, 1fr)' : '1fr', gap: 14 }}>
        {cursos.map((c) => <CursoCard key={c.id} curso={c} onNav={onNav} vp={vp} />)}
      </div>
    </div>
  );
}
window.CursosScreen = CursosScreen;

function CursoCard({ curso, onNav, vp }) {
  const col = NIVEL_COLOR[curso.nivel] || PALETTE.amber;
  return (
    <div style={{ background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`, boxShadow: window.CLARO.sombra, borderTop: `2px solid ${col}`, display: 'flex', flexDirection: 'column' }}>
      <StripePlaceholder label={`Foto · ${curso.titulo}`} ratio="16 / 9">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14.5, color: PALETTE.textMuted, letterSpacing: '0.16em' }}>▢ FOTO DEL CURSO</div>
          <div style={{ fontFamily: 'Archivo, sans-serif', fontSize: 14, color: PALETTE.textDim, marginTop: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{curso.modalidad}</div>
        </div>
      </StripePlaceholder>
      <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <MiniBadge color={col}>{curso.nivel}</MiniBadge>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14.5, color: PALETTE.textMuted, letterSpacing: '0.08em' }}>{curso.modalidad}</span>
        </div>
        <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 18, color: PALETTE.text, textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.1, marginTop: 12 }}>{curso.titulo}</div>
        <div style={{ fontFamily: 'Archivo, system-ui, sans-serif', fontSize: 18, color: PALETTE.textDim, lineHeight: 1.55, marginTop: 8, flex: 1 }}>{curso.desc}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTop: `1px solid ${PALETTE.border}` }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, color: PALETTE.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Duración</div>
            <div style={{ fontFamily: 'Archivo, sans-serif', fontSize: 14, fontWeight: 600, color: PALETTE.text, marginTop: 2 }}>{curso.duracion}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, color: PALETTE.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Inversión</div>
            <div style={{ fontFamily: 'Archivo, sans-serif', fontSize: 15, fontWeight: 700, color: PALETTE.amber, marginTop: 2 }}>{curso.precio}</div>
          </div>
        </div>
        <button onClick={() => onNav && onNav('submit')} style={{
          marginTop: 12, width: '100%', background: 'transparent', color: PALETTE.amber,
          border: `1.5px solid ${PALETTE.amber}`, padding: '10px', cursor: 'pointer',
          fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 14,
          letterSpacing: '0.12em', textTransform: 'uppercase',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = PALETTE.amber; e.currentTarget.style.color = '#173A32'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = PALETTE.amber; }}>
          Me interesa
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TARJETAS COMPACTAS PARA LA HOME (carruseles)
// ═══════════════════════════════════════════════════════════════════════
function CaliberMiniCard({ cal, onClick }) {
  const n = armasPorCalibre(cal.id).length;
  return (
    <div onClick={onClick} style={{
      background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`, boxShadow: window.CLARO.sombra, borderTop: `2px solid ${PALETTE.amber}`,
      cursor: 'pointer', overflow: 'hidden', height: '100%', minHeight: CARTUCHO_HOME_MAXH + 22, display: 'flex', alignItems: 'stretch',
    }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = PALETTE.amber}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = PALETTE.border}>
      <div style={{ padding: '14px 14px 12px', display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, color: PALETTE.amber, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{cal.sistema}</div>
      <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 20, color: PALETTE.text, marginTop: 8, lineHeight: 1 }}>{cal.id}</div>
      <div style={{ fontFamily: 'Archivo, system-ui, sans-serif', fontSize: 15.5, color: PALETTE.textDim, lineHeight: 1.4, marginTop: 6, flex: 1 }}>{cal.uso}</div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: PALETTE.amber, letterSpacing: '0.08em', marginTop: 10 }}>{n} arma{n === 1 ? '' : 's'} →</div>
      </div>
      {/* CARTUCHO SLOT — PNG vertical del cartucho a escala REAL (altura ∝ mm), anclado al piso */}
      <div style={{
        flexShrink: 0, width: 58, alignSelf: 'stretch', position: 'relative', overflow: 'hidden',
        borderLeft: `1px solid ${PALETTE.border}`,
        background: PALETTE.bgElev,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}>
        <img src={cal.cartucho} alt={`Cartucho ${cal.id}`} loading="lazy"
          style={{ height: Math.round(((cal.mm || 40) / CARTUCHO_MAX_MM) * CARTUCHO_HOME_MAXH), width: 'auto', maxWidth: 'calc(100% - 10px)', objectFit: 'contain', objectPosition: 'bottom', display: 'block', marginBottom: 9 }} />
      </div>
    </div>
  );
}
window.CaliberMiniCard = CaliberMiniCard;

function CampoMiniCard({ campo, onClick }) {
  const destacado = /destacado/i.test(campo.estatus);
  return (
    <div onClick={onClick} style={{
      background: PALETTE.bgCard, border: `1px solid ${destacado ? PALETTE.amber : PALETTE.border}`,
      cursor: 'pointer', overflow: 'hidden', height: '100%',
    }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = PALETTE.amber}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = destacado ? PALETTE.amber : PALETTE.border}>
      <StripePlaceholder label="Foto" ratio="16 / 9">
        <div style={{ fontFamily: 'Archivo, sans-serif', fontSize: 13, color: PALETTE.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{campo.entorno}</div>
      </StripePlaceholder>
      <div style={{ padding: '11px 12px' }}>
        <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 15, color: PALETTE.text, textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{campo.nombre}</div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: PALETTE.amber, letterSpacing: '0.05em', marginTop: 4 }}>◉ {campo.ciudad}</div>
      </div>
    </div>
  );
}
window.CampoMiniCard = CampoMiniCard;

function CursoMiniCard({ curso, onClick }) {
  const col = NIVEL_COLOR[curso.nivel] || PALETTE.amber;
  return (
    <div onClick={onClick} style={{
      background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`, boxShadow: window.CLARO.sombra, borderTop: `2px solid ${col}`,
      cursor: 'pointer', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column',
    }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = PALETTE.amber}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = PALETTE.border}>
      <StripePlaceholder label="Foto" ratio="16 / 9">
        <div style={{ fontFamily: 'Archivo, sans-serif', fontSize: 13, color: PALETTE.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{curso.modalidad}</div>
      </StripePlaceholder>
      <div style={{ padding: '11px 14px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <MiniBadge color={col}>{curso.nivel}</MiniBadge>
      <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 16, color: PALETTE.text, textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.15, marginTop: 10, flex: 1 }}>{curso.titulo}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: PALETTE.textMuted, letterSpacing: '0.06em' }}>{curso.duracion}</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: PALETTE.amber, letterSpacing: '0.08em' }}>Ver →</span>
      </div>
      </div>
    </div>
  );
}
window.CursoMiniCard = CursoMiniCard;

// ═══════════════════════════════════════════════════════════════════════
// PRÓXIMAMENTE — Campos de tiro y Experiencias, congeladas hasta el lanzamiento
//
// Sus datos son de relleno (ver la cabecera de data-extra.js) y publicarlos
// restaría credibilidad al resto del catálogo, que sí está conciliado contra
// inventarios oficiales. Las pantallas reales (CamposScreen, CursosScreen) se
// conservan intactas justo arriba: al lanzar se reconectan en el switch de
// app.jsx y estos dos componentes dejan de usarse. Ver PLACEHOLDERS.md.
// ═══════════════════════════════════════════════════════════════════════
function ProximamenteScreen({ titulo, texto }) {
  const vp = window.useViewport();
  const padX = vp.isDesktop ? 28 : 16;
  // El header móvil ya no pinta el título de pantalla: este bloque (título +
  // antetítulo) es el único encabezado, así que en móvil ocupa el centro que
  // dejó el header. En escritorio/tablet TopNav tampoco pinta título y el
  // encabezado se queda al margen izquierdo, alineado con el resto de la columna.
  const alinea = vp.isMobile ? 'center' : 'left';
  return (
    <div style={{ padding: `20px ${padX}px 90px`, maxWidth: 1100, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={{
        fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: vp.isDesktop ? 34 : 26,
        color: PALETTE.text, textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.05,
        textAlign: alinea,
      }}>{titulo}</div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 15, color: PALETTE.amber,
        letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 8,
        textAlign: alinea,
      }}>Próximamente</div>

      {/* Panel informativo, NO un control: cursor por defecto y sin onClick para
          que no se lea como algo pulsable (los datos de esta sección están
          congelados, no hay adónde ir). */}
      <div style={{
        marginTop: 26, background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`, boxShadow: window.CLARO.sombra,
        padding: vp.isDesktop ? '34px 30px' : '26px 18px', textAlign: 'center', cursor: 'default',
      }}>
        {/* El glifo es decoración, pero aun así debe verse: a opacity 0.55 el
            verde resolvía a #7D908A sobre la tarjeta #FAF9F5 = 3.20:1, justo en
            el filo del mínimo gráfico. A 0.6 resuelve a #728680 = 3.67:1. */}
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 56, color: PALETTE.amber, opacity: 0.6, lineHeight: 1 }} aria-hidden="true">?</div>
        <div style={{
          fontFamily: 'Archivo, system-ui, sans-serif', fontSize: 16, color: PALETTE.textDim,
          lineHeight: 1.55, maxWidth: 560, margin: '16px auto 0',
        }}>{texto}</div>
      </div>
    </div>
  );
}
window.ProximamenteScreen = ProximamenteScreen;

// Tarjeta de relleno del carrusel de la home. Reusa StripePlaceholder para que
// el hueco de la foto sea el mismo que tendrá la tarjeta real. Sin onClick y
// sin cursor: pointer — no debe leerse como algo pulsable.
function ProximamenteCard({ img }) {
  return (
    <div style={{
      background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`, boxShadow: window.CLARO.sombra,
      overflow: 'hidden', height: '100%', cursor: 'default',
    }}>
      {img ? (
        /* La foto viene YA difuminada, desaturada y con el contraste bajado
           desde el pipeline de imágenes (Pillow: blur 3.2, saturación .32,
           contraste .72). Se procesa en origen y no con `filter` de CSS a
           propósito: un blur en runtime se repinta en cada scroll y estas
           tarjetas van dentro de un carrusel. De paso pesan 3-7 KB cada una.
           El velo verde encima las unifica entre sí, porque vienen de fuentes
           distintas y con dominantes distintas. */
        <div style={{
          position: 'relative', aspectRatio: '16 / 9',
          overflow: 'hidden', background: PALETTE.bgElev,
        }}>
          <img src={img} alt="" aria-hidden="true"
            loading="lazy" decoding="async"
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%', objectFit: 'cover',
              display: 'block',
            }} />
          <div aria-hidden="true" style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(23,58,50,0.10) 0%, rgba(23,58,50,0.28) 100%)',
          }} />
        </div>
      ) : (
      <StripePlaceholder ratio="16 / 9">
        {/* A opacity 0.45 el verde de marca resolvía a #94A39D sobre el hueco
            #FAF9F5 de StripePlaceholder: 2.50:1, por debajo del 3:1 que exige
            un elemento gráfico. A 0.6 resuelve a #728680 = 3.67:1. */}
        <span aria-hidden="true" style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 42, color: PALETTE.amber,
          opacity: 0.6, lineHeight: 1,
        }}>?</span>
      </StripePlaceholder>
      )}
      <div style={{ padding: '11px 12px' }}>
        <div style={{
          fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 15, color: PALETTE.textMuted,
          textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.15,
        }}>Próximamente</div>
      </div>
    </div>
  );
}
window.ProximamenteCard = ProximamenteCard;
