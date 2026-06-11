// Armado en México — Apartados nuevos
// CalibresScreen · CamposScreen · CursosScreen + tarjetas para la home
// ───────────────────────────────────────────────────────────────────────
const { useState: useState3, useMemo: useMemo3 } = React;

// ── helpers ──────────────────────────────────────────────────────────────
function armasPorCalibre(id) {
  return (window.DB || []).filter((a) => a.calibre === id);
}
const CLASE_GLYPH = {
  'Rimfire': '·', 'Pistola': '◢', 'Revólver': '◉',
  'Rifle': '━', 'Escopeta': '═', 'Carabina': '╌',
};

// ═══════════════════════════════════════════════════════════════════════
// STRIPE PLACEHOLDER — marcador rayado con etiqueta mono (imagen a futuro)
// ═══════════════════════════════════════════════════════════════════════
function StripePlaceholder({ label, ratio = '16 / 9', children }) {
  return (
    <div style={{
      position: 'relative', width: '100%', aspectRatio: ratio, flexShrink: 0,
      overflow: 'hidden',
      background: `repeating-linear-gradient(135deg, ${PALETTE.bgElev} 0 10px, ${PALETTE.bg} 10px 20px)`,
      borderBottom: `1px solid ${PALETTE.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* corner ticks */}
      <span style={{ position: 'absolute', top: 6, left: 6, width: 10, height: 10, borderTop: `1.5px solid ${PALETTE.amber}`, borderLeft: `1.5px solid ${PALETTE.amber}`, opacity: 0.7 }} />
      <span style={{ position: 'absolute', bottom: 6, right: 6, width: 10, height: 10, borderBottom: `1.5px solid ${PALETTE.amber}`, borderRight: `1.5px solid ${PALETTE.amber}`, opacity: 0.7 }} />
      {children || (
        <span style={{
          fontFamily: 'Courier Prime, monospace', fontSize: 12,
          color: PALETTE.textMuted, letterSpacing: '0.18em',
          textTransform: 'uppercase', textAlign: 'center', padding: '0 10px',
        }}>▢ {label}</span>
      )}
    </div>
  );
}
window.StripePlaceholder = StripePlaceholder;

// pequeño badge reutilizable
function MiniBadge({ children, color = PALETTE.amber, solid = false }) {
  return (
    <span style={{
      fontFamily: 'Courier Prime, monospace', fontSize: 11, fontWeight: 700,
      letterSpacing: '0.12em', textTransform: 'uppercase',
      padding: '3px 7px',
      color: solid ? '#1A1A1A' : color,
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
  const clases = useMemo3(() => ['Todos', ...Array.from(new Set(calibres.map((c) => c.clase)))], [calibres]);
  const [clase, setClase] = useState3('Todos');
  const list = clase === 'Todos' ? calibres : calibres.filter((c) => c.clase === clase);

  return (
    <div style={{ padding: `20px ${padX}px 90px`, maxWidth: 1100, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      {/* encabezado */}
      <div style={{ fontFamily: 'Courier Prime, monospace', fontSize: 11, color: PALETTE.amber, letterSpacing: '0.2em', marginBottom: 8 }}>◉ MUNICIÓN · GUÍA DIVULGATIVA</div>
      <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: vp.isDesktop ? 34 : 26, color: PALETTE.text, textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.05, marginBottom: 8 }}>Guía de calibres</div>
      <div style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 16, color: PALETTE.textDim, lineHeight: 1.6, maxWidth: 640, marginBottom: 18 }}>
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
              color: active ? '#1A1A1A' : PALETTE.textDim,
              border: `1px solid ${active ? PALETTE.amber : PALETTE.border}`,
              padding: '7px 14px', cursor: 'pointer',
              fontFamily: 'Courier Prime, monospace', fontSize: 13,
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

function CaliberFicha({ cal, onOpenArma, vp }) {
  const armas = armasPorCalibre(cal.id);
  const stat = (k, v) => (
    <div style={{ flex: 1, minWidth: 90 }}>
      <div style={{ fontFamily: 'Courier Prime, monospace', fontSize: 10.5, color: PALETTE.textMuted, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 3 }}>{k}</div>
      <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 16, color: PALETTE.text }}>{v}</div>
    </div>
  );
  return (
    <div style={{ background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`, borderLeft: `3px solid ${PALETTE.amber}` }}>
      <div style={{ padding: vp.isDesktop ? '18px 20px' : '14px' }}>
        {/* título + clase */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ color: PALETTE.amber, fontFamily: 'Courier Prime, monospace', fontSize: 17 }}>{CLASE_GLYPH[cal.clase] || '◆'}</span>
            <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: vp.isDesktop ? 25 : 21, color: PALETTE.text, letterSpacing: '0.01em' }}>{cal.id}</span>
          </div>
          <MiniBadge>{cal.clase}</MiniBadge>
        </div>
        {/* uso */}
        <div style={{ fontFamily: 'Courier Prime, monospace', fontSize: 12, color: PALETTE.amber, letterSpacing: '0.06em', marginTop: 6 }}>▸ {cal.uso}</div>
        {/* desc */}
        <div style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 15, color: PALETTE.textDim, lineHeight: 1.6, marginTop: 8 }}>{cal.desc}</div>
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
            <div style={{ fontFamily: 'Courier Prime, monospace', fontSize: 10.5, color: PALETTE.textMuted, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>Armas que lo usan</div>
            <div className="amx-hscroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
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
                    <div style={{ fontFamily: 'Courier Prime, monospace', fontSize: 10, color: PALETTE.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{a.marca}</div>
                    <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 600, color: PALETTE.text, lineHeight: 1.15, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nombre}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
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
      <div style={{ fontFamily: 'Courier Prime, monospace', fontSize: 11, color: PALETTE.amber, letterSpacing: '0.2em', marginBottom: 8 }}>◎ CAMPOS Y CLUBES DE TIRO</div>
      <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: vp.isDesktop ? 34 : 26, color: PALETTE.text, textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.05, marginBottom: 10 }}>Campos de tiro</div>

      {/* banner suscripción a futuro */}
      <div style={{
        background: `linear-gradient(135deg, ${PALETTE.bgCard} 0%, ${PALETTE.bgElev} 100%)`,
        border: `1px solid ${PALETTE.amber}`, padding: vp.isDesktop ? '16px 18px' : '14px',
        marginBottom: 20, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 17, color: PALETTE.text, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Suscripción próximamente</div>
          <div style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 15, color: PALETTE.textDim, lineHeight: 1.55, marginTop: 4 }}>
            Pronto podrás suscribirte para acceder a campos y clubes de tiro aliados con beneficios y reservación. Estos son ejemplos de lo que vendrá.
          </div>
        </div>
        <button onClick={() => onNav && onNav('submit')} style={{
          flexShrink: 0, background: PALETTE.amber, color: '#1A1A1A', border: 'none',
          padding: '11px 18px', cursor: 'pointer',
          fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14,
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
          <div style={{ fontFamily: 'Courier Prime, monospace', fontSize: 12, color: PALETTE.textMuted, letterSpacing: '0.16em' }}>▢ FOTO DEL CAMPO</div>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, color: PALETTE.textDim, marginTop: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{campo.entorno}</div>
        </div>
      </StripePlaceholder>
      <div style={{ padding: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 17, color: PALETTE.text, textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.15 }}>{campo.nombre}</div>
        </div>
        <div style={{ fontFamily: 'Courier Prime, monospace', fontSize: 12, color: PALETTE.amber, letterSpacing: '0.06em', marginTop: 5 }}>◉ {campo.ciudad}, {campo.estado}</div>
        {/* disciplinas */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          {campo.disciplinas.map((d) => <MiniBadge key={d} color={PALETTE.border === d ? PALETTE.amber : PALETTE.textDim}>{d}</MiniBadge>)}
        </div>
        {/* meta */}
        <div style={{ display: 'flex', gap: 14, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${PALETTE.border}` }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Courier Prime, monospace', fontSize: 10.5, color: PALETTE.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Distancias</div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 600, color: PALETTE.text, marginTop: 2 }}>{campo.distancias}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Courier Prime, monospace', fontSize: 10.5, color: PALETTE.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Acceso</div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 600, color: PALETTE.text, marginTop: 2 }}>{campo.plan}</div>
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
      <div style={{ fontFamily: 'Courier Prime, monospace', fontSize: 11, color: PALETTE.amber, letterSpacing: '0.2em', marginBottom: 8 }}>✦ FORMACIÓN Y CURSOS</div>
      <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: vp.isDesktop ? 34 : 26, color: PALETTE.text, textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.05, marginBottom: 8 }}>Cursos</div>
      <div style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 16, color: PALETTE.textDim, lineHeight: 1.6, maxWidth: 640, marginBottom: 20 }}>
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
    <div style={{ background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`, borderTop: `2px solid ${col}`, display: 'flex', flexDirection: 'column' }}>
      <StripePlaceholder label={`Foto · ${curso.titulo}`} ratio="16 / 9">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Courier Prime, monospace', fontSize: 12, color: PALETTE.textMuted, letterSpacing: '0.16em' }}>▢ FOTO DEL CURSO</div>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, color: PALETTE.textDim, marginTop: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{curso.modalidad}</div>
        </div>
      </StripePlaceholder>
      <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <MiniBadge color={col}>{curso.nivel}</MiniBadge>
          <span style={{ fontFamily: 'Courier Prime, monospace', fontSize: 12, color: PALETTE.textMuted, letterSpacing: '0.08em' }}>{curso.modalidad}</span>
        </div>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 18, color: PALETTE.text, textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.1, marginTop: 12 }}>{curso.titulo}</div>
        <div style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 15, color: PALETTE.textDim, lineHeight: 1.55, marginTop: 8, flex: 1 }}>{curso.desc}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTop: `1px solid ${PALETTE.border}` }}>
          <div>
            <div style={{ fontFamily: 'Courier Prime, monospace', fontSize: 10.5, color: PALETTE.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Duración</div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 600, color: PALETTE.text, marginTop: 2 }}>{curso.duracion}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Courier Prime, monospace', fontSize: 10.5, color: PALETTE.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Inversión</div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 15, fontWeight: 700, color: PALETTE.amber, marginTop: 2 }}>{curso.precio}</div>
          </div>
        </div>
        <button onClick={() => onNav && onNav('submit')} style={{
          marginTop: 12, width: '100%', background: 'transparent', color: PALETTE.amber,
          border: `1.5px solid ${PALETTE.amber}`, padding: '10px', cursor: 'pointer',
          fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14,
          letterSpacing: '0.12em', textTransform: 'uppercase',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = PALETTE.amber; e.currentTarget.style.color = '#1A1A1A'; }}
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
      background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`, borderTop: `2px solid ${PALETTE.amber}`,
      cursor: 'pointer', padding: '14px 14px 12px', height: '100%', display: 'flex', flexDirection: 'column',
    }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = PALETTE.amber}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = PALETTE.border}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: PALETTE.amber, fontFamily: 'Courier Prime, monospace', fontSize: 17 }}>{CLASE_GLYPH[cal.clase] || '◆'}</span>
        <span style={{ fontFamily: 'Courier Prime, monospace', fontSize: 10.5, color: PALETTE.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{cal.clase}</span>
      </div>
      <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 20, color: PALETTE.text, marginTop: 10, lineHeight: 1 }}>{cal.id}</div>
      <div style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 13, color: PALETTE.textDim, lineHeight: 1.4, marginTop: 6, flex: 1 }}>{cal.uso}</div>
      <div style={{ fontFamily: 'Courier Prime, monospace', fontSize: 11, color: PALETTE.amber, letterSpacing: '0.08em', marginTop: 10 }}>{n} arma{n === 1 ? '' : 's'} →</div>
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
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: PALETTE.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{campo.entorno}</div>
      </StripePlaceholder>
      <div style={{ padding: '11px 12px' }}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 15, color: PALETTE.text, textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{campo.nombre}</div>
        <div style={{ fontFamily: 'Courier Prime, monospace', fontSize: 11.5, color: PALETTE.amber, letterSpacing: '0.05em', marginTop: 4 }}>◉ {campo.ciudad}</div>
      </div>
    </div>
  );
}
window.CampoMiniCard = CampoMiniCard;

function CursoMiniCard({ curso, onClick }) {
  const col = NIVEL_COLOR[curso.nivel] || PALETTE.amber;
  return (
    <div onClick={onClick} style={{
      background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`, borderTop: `2px solid ${col}`,
      cursor: 'pointer', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column',
    }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = PALETTE.amber}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = PALETTE.border}>
      <StripePlaceholder label="Foto" ratio="16 / 9">
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: PALETTE.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{curso.modalidad}</div>
      </StripePlaceholder>
      <div style={{ padding: '11px 14px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <MiniBadge color={col}>{curso.nivel}</MiniBadge>
      <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 16, color: PALETTE.text, textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.15, marginTop: 10, flex: 1 }}>{curso.titulo}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <span style={{ fontFamily: 'Courier Prime, monospace', fontSize: 11.5, color: PALETTE.textMuted, letterSpacing: '0.06em' }}>{curso.duracion}</span>
        <span style={{ fontFamily: 'Courier Prime, monospace', fontSize: 11.5, color: PALETTE.amber, letterSpacing: '0.08em' }}>Ver →</span>
      </div>
      </div>
    </div>
  );
}
window.CursoMiniCard = CursoMiniCard;
