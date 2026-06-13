// Armado en México — Armas Traumáticas (defensa MENOS LETAL)
// TraumaticasScreen (sección propia) · HomeTraumaBanner (destacado en Home)
// ───────────────────────────────────────────────────────────────────────

// ── Badge de stock
function TraumaStock({ stock }) {
  const ok = stock > 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: 'Courier Prime, monospace', fontSize: 11, fontWeight: 700,
      letterSpacing: '0.12em', textTransform: 'uppercase',
      padding: '4px 9px',
      color: ok ? PALETTE.green : PALETTE.red,
      border: `1px solid ${ok ? PALETTE.green : PALETTE.red}`,
      background: 'rgba(0,0,0,0.35)',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: ok ? PALETTE.green : PALETTE.red, display: 'inline-block' }} />
      {ok ? (stock <= 3 ? `Últimas ${stock} pzas` : 'Disponible') : 'Agotado'}
    </span>
  );
}

// ── Aviso "no requiere permiso SEDENA"
function SinPermisoTag({ small }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: 'Courier Prime, monospace', fontSize: small ? 10 : 11, fontWeight: 700,
      letterSpacing: '0.1em', textTransform: 'uppercase',
      padding: small ? '3px 7px' : '4px 9px',
      color: PALETTE.amber, border: `1px solid ${PALETTE.amber}`,
      whiteSpace: 'nowrap',
    }}>◎ No requiere permiso SEDENA</span>
  );
}

// ── Ficha de producto traumático
function TraumaFicha({ p, vp }) {
  const url = window.traumaticaUrl(p.handle);
  const ok = p.stock > 0;
  const photo = (
    <div style={{
      position: 'relative', flexShrink: 0,
      width: vp.isDesktop ? '42%' : '100%',
      aspectRatio: vp.isDesktop ? 'auto' : '4 / 3',
      alignSelf: 'stretch',
      background: '#FFFFFF',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
      borderRight: vp.isDesktop ? `1px solid ${PALETTE.border}` : 'none',
      borderBottom: vp.isDesktop ? 'none' : `1px solid ${PALETTE.border}`,
    }}>
      <img src={p.img} alt={p.nombre} loading="lazy" style={{
        width: '100%', height: '100%', objectFit: 'contain',
        padding: vp.isDesktop ? 22 : 16, boxSizing: 'border-box', display: 'block',
        mixBlendMode: 'multiply',
      }} />
      <div style={{ position: 'absolute', top: 12, left: 12 }}>
        <TraumaStock stock={p.stock} />
      </div>
      <div style={{
        position: 'absolute', bottom: 12, left: 12,
        fontFamily: 'Courier Prime, monospace', fontSize: 10.5, fontWeight: 700,
        letterSpacing: '0.14em', textTransform: 'uppercase',
        color: '#1A1A1A', background: PALETTE.amber, padding: '3px 8px',
      }}>{p.tipo} · cal. {p.specs[0][1]}</div>
    </div>
  );

  return (
    <div style={{
      background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`, borderTop: `2px solid ${PALETTE.amber}`,
      display: 'flex', flexDirection: vp.isDesktop ? 'row' : 'column', alignItems: 'stretch',
    }}>
      {photo}
      <div style={{ flex: 1, minWidth: 0, padding: vp.isDesktop ? '22px 24px' : '16px' }}>
        {/* marca + modelo */}
        <div style={{ fontFamily: 'Courier Prime, monospace', fontSize: 11.5, color: PALETTE.amber, letterSpacing: '0.16em', textTransform: 'uppercase' }}>{p.marca}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
          <h3 style={{ margin: 0, fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: vp.isDesktop ? 30 : 25, color: PALETTE.text, letterSpacing: '0.01em', lineHeight: 1 }}>{p.modelo}</h3>
          <SinPermisoTag />
        </div>
        <div style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 14, color: PALETTE.textDim, marginTop: 6 }}>{p.nombre}</div>

        {/* resumen */}
        <div style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 15, color: PALETTE.textDim, lineHeight: 1.6, marginTop: 12 }}>{p.resumen}</div>

        {/* specs */}
        <div style={{
          display: 'grid', gridTemplateColumns: vp.isDesktop ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
          gap: '12px 18px', marginTop: 16, paddingTop: 14, borderTop: `1px solid ${PALETTE.border}`,
        }}>
          {p.specs.map(([k, v]) => (
            <div key={k}>
              <div style={{ fontFamily: 'Courier Prime, monospace', fontSize: 10.5, color: PALETTE.textMuted, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 3 }}>{k}</div>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 16, color: PALETTE.text }}>{v}</div>
            </div>
          ))}
        </div>

        {/* munición compatible */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
          <span style={{ fontFamily: 'Courier Prime, monospace', fontSize: 10.5, color: PALETTE.textMuted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Munición</span>
          {p.municion.map((m) => (
            <span key={m} style={{
              fontFamily: 'Courier Prime, monospace', fontSize: 11, color: PALETTE.textDim,
              border: `1px solid ${PALETTE.border}`, padding: '3px 9px', letterSpacing: '0.05em',
            }}>{m}</span>
          ))}
        </div>

        {/* destacados */}
        <ul style={{ listStyle: 'none', margin: '16px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {p.destacados.map((d) => (
            <li key={d} style={{ display: 'flex', gap: 9, fontFamily: 'Open Sans, sans-serif', fontSize: 14, color: PALETTE.textDim, lineHeight: 1.5 }}>
              <span style={{ color: PALETTE.amber, flexShrink: 0 }}>▸</span>{d}
            </li>
          ))}
        </ul>

        {/* precio + CTA */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
          marginTop: 18, paddingTop: 16, borderTop: `1px solid ${PALETTE.border}`,
        }}>
          <div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 28, color: PALETTE.amber, lineHeight: 1 }}>
              ${p.precio.toLocaleString('es-MX')} <span style={{ fontSize: 14, color: PALETTE.textMuted, fontWeight: 600 }}>MXN</span>
            </div>
            <div style={{ fontFamily: 'Courier Prime, monospace', fontSize: 11, color: PALETTE.textMuted, marginTop: 4 }}>Los tanques de CO₂ se adquieren por separado</div>
          </div>
          <a href={url} target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14,
            letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none',
            padding: '13px 22px',
            background: ok ? PALETTE.amber : 'transparent',
            color: ok ? '#1A1A1A' : PALETTE.amber,
            border: `1.5px solid ${PALETTE.amber}`,
            transition: 'transform 200ms ease, filter 200ms ease',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}>
            {ok ? 'Adquiérela en armasmys.com' : 'Disponible en armasmys.com'} →
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Sección de marco legal (reutiliza window.TRAUMATICAS_LEGAL)
function TraumaLegal({ vp }) {
  const L = window.TRAUMATICAS_LEGAL || { puntos: [] };
  const conManual = (window.TRAUMATICAS || []).find((p) => p.manual);
  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ fontFamily: 'Courier Prime, monospace', fontSize: 11, color: PALETTE.amber, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>§ Marco legal · México</div>
      <h3 style={{ margin: 0, fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: vp.isDesktop ? 24 : 20, color: PALETTE.text, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Por qué no requieren permiso</h3>
      <div style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 15, color: PALETTE.textDim, lineHeight: 1.6, marginTop: 10, marginBottom: 16, maxWidth: 720 }}>{L.resumen}</div>

      <div style={{ display: 'grid', gridTemplateColumns: vp.isDesktop ? 'repeat(2, 1fr)' : '1fr', gap: 12 }}>
        {L.puntos.map((pt) => (
          <div key={pt.tit} style={{ background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`, borderLeft: `3px solid ${PALETTE.amber}`, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14.5, color: PALETTE.text, marginBottom: 6 }}>{pt.tit}</div>
            <div style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 13.5, color: PALETTE.textDim, lineHeight: 1.55 }}>{pt.desc}</div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 16, padding: '12px 16px', background: 'rgba(168,58,42,0.08)',
        border: `1px solid ${PALETTE.red}`, borderLeft: `4px solid ${PALETTE.red}`,
      }}>
        <div style={{ fontFamily: 'Courier Prime, monospace', fontSize: 10.5, color: PALETTE.red, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>▲ Aviso</div>
        <div style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 13, color: PALETTE.textDim, lineHeight: 1.6 }}>{L.disclaimer}</div>
      </div>
    </div>
  );
}

window.TraumaLegal = TraumaLegal;

// ═══════════════════════════════════════════════════════════════════════
// PANTALLA — Armas Traumáticas
// ═══════════════════════════════════════════════════════════════════════
function TraumaticasScreen({ onNav }) {
  const vp = window.useViewport();
  const padX = vp.isDesktop ? 28 : 16;
  const productos = window.TRAUMATICAS || [];

  return (
    <div style={{ padding: `20px ${padX}px 90px`, maxWidth: 1100, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      {/* encabezado */}
      <div style={{ fontFamily: 'Courier Prime, monospace', fontSize: 11, color: PALETTE.amber, letterSpacing: '0.2em', marginBottom: 8 }}>◉ DEFENSA MENOS LETAL · CATEGORÍA APARTE</div>
      <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: vp.isDesktop ? 36 : 27, color: PALETTE.text, textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.04, marginBottom: 10 }}>Armas Traumáticas</div>
      <div style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 16, color: PALETTE.textDim, lineHeight: 1.6, maxWidth: 680, marginBottom: 14 }}>
        Dispositivos de defensa <strong style={{ color: PALETTE.text }}>NO letal</strong> propulsados por CO₂, en calibre .50 y .68. Disparan munición de pimienta, goma o polvo inerte para detener una amenaza sin recurrir a fuerza letal. Puedes adquirirlos directamente en <strong style={{ color: PALETTE.amber }}>armasmys.com</strong>.
      </div>

      {/* CATEGORÍA APARTE — énfasis */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        background: 'rgba(245,197,24,0.07)', border: `1px solid ${PALETTE.amber}`, borderLeft: `4px solid ${PALETTE.amber}`,
        padding: '14px 16px', marginBottom: 18,
      }}>
        <span style={{ color: PALETTE.amber, fontSize: 18, lineHeight: 1.2, flexShrink: 0 }}>◎</span>
        <div style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 14.5, color: PALETTE.textDim, lineHeight: 1.6 }}>
          <strong style={{ color: PALETTE.text }}>Una categoría totalmente distinta del arsenal.</strong> Al no ser armas de fuego, no requieren permiso de la SEDENA y <strong style={{ color: PALETTE.text }}>puedes adquirirlas directamente con nosotros</strong>. Son los <strong style={{ color: PALETTE.amber }}>únicos tres modelos de armamento que comercializamos</strong>; todas las armas de fuego de esta app se muestran solo con fines informativos.
        </div>
      </div>

      {/* fichas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {productos.map((p) => <TraumaFicha key={p.id} p={p} vp={vp} />)}
      </div>

      {/* MARCO LEGAL */}
      <TraumaLegal vp={vp} />

      {/* accesorios / nota cierre */}
      <div style={{
        marginTop: 24, padding: '14px 16px',
        background: PALETTE.bgElev, border: `1px dashed ${PALETTE.border}`,
        fontFamily: 'Courier Prime, monospace', fontSize: 12.5, color: PALETTE.textMuted, lineHeight: 1.6,
      }}>
        <span style={{ color: PALETTE.amber, fontWeight: 700 }}>◆ También en tienda:</span> cargadores, municiones cal. .50/.68 (goma, pimienta, polvo), tanques de CO₂ y fundas. Consulta el catálogo completo en armasmys.com.
      </div>
    </div>
  );
}
window.TraumaticasScreen = TraumaticasScreen;

// ═══════════════════════════════════════════════════════════════════════
// BANNER DESTACADO — Home (3 tarjetas tipo tienda · sin precios, solo enlaces)
// ═══════════════════════════════════════════════════════════════════════
function TraumaTierCard({ p, vp, onNav }) {
  const go = () => onNav && onNav('traumaticas');
  const badgeTextDark = p.tierColor === '#F5C518';
  const fxClass = p.effect === 'glow' ? 'trauma-fx-glow'
    : p.effect === 'pulse' ? 'trauma-fx-pulse'
    : p.effect === 'fire' ? 'trauma-fx-fire' : '';
  return (
    <div className={fxClass} style={{
      position: 'relative', background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`,
      borderTop: `2px solid ${p.tierColor}`,
      borderRadius: 8, display: 'flex', flexDirection: 'column', paddingTop: 26,
      height: '100%', width: '100%', boxSizing: 'border-box',
      boxShadow: '0 4px 16px rgba(0,0,0,0.28)',
    }}>
      {/* Tier badge — pill centrado sobre el borde superior */}
      <div style={{
        position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
        background: p.tierColor, color: badgeTextDark ? '#1A1A1A' : '#FFFFFF',
        fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 11.5,
        letterSpacing: '0.02em', padding: '5px 14px', borderRadius: 999, whiteSpace: 'nowrap',
      }}>{p.tier}</div>

      {/* Imagen del producto sobre panel blanco (fotografía de marca) */}
      <div onClick={go} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        height: 168, margin: '4px 14px 0', borderRadius: 6, background: '#FFFFFF',
        padding: '10px 16px', overflow: 'hidden',
      }}>
        <img src={p.img} alt={p.nombre} loading="lazy" style={{
          maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block', mixBlendMode: 'multiply',
        }} />
      </div>

      {/* Nombre + tagline */}
      <div style={{ padding: '14px 20px 16px', textAlign: 'center' }}>
        <h3 onClick={go} style={{
          margin: 0, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 20,
          color: PALETTE.text, letterSpacing: '0.01em',
        }}>P2P {p.modelo}</h3>
        <div style={{
          fontFamily: 'Open Sans, sans-serif', fontSize: 13, color: PALETTE.textDim,
          lineHeight: 1.5, marginTop: 8, textWrap: 'pretty',
        }}>{p.tagline}</div>
      </div>

      {/* Lista de características */}
      <ul style={{ listStyle: 'none', margin: 0, padding: '14px 20px 22px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {p.features.map((f) => (
          <li key={f} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
            <span style={{
              flexShrink: 0, width: 16, height: 16, marginTop: 1, borderRadius: 999,
              background: 'rgba(245,197,24,0.16)', color: PALETTE.amber,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700,
            }}>✓</span>
            <span style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 12.5, color: PALETTE.textDim, lineHeight: 1.45 }}>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HomeTraumaBanner({ onNav }) {
  const vp = window.useViewport();
  const productos = window.TRAUMATICAS || [];
  const PAD = 16; // mismo margen que el resto del feed (coherencia con CarouselSection)

  // Arrastre con mouse para el carrusel móvil (el táctil usa scroll nativo con momentum).
  // Sin esto, en vista móvil emulada con mouse no se podría "swipe".
  const scrollerRef = React.useRef(null);
  const drag = React.useRef({ down: false, moved: false, startX: 0, startScroll: 0 });
  const [dragging, setDragging] = React.useState(false);
  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = scrollerRef.current; if (!el) return;
    drag.current = { down: true, moved: false, startX: e.clientX, startScroll: el.scrollLeft };
    el.style.scrollSnapType = 'none';
  };
  const onPointerMove = (e) => {
    if (!drag.current.down) return;
    const el = scrollerRef.current; if (!el) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 6 && !drag.current.moved) { drag.current.moved = true; setDragging(true); }
    el.scrollLeft = drag.current.startScroll - dx;
  };
  const endDrag = () => {
    if (!drag.current.down) return;
    drag.current.down = false; setDragging(false);
    const el = scrollerRef.current;
    // Restaurar el snap → el navegador re-asienta en la ficha más cercana.
    if (el) setTimeout(() => { el.style.scrollSnapType = 'x mandatory'; }, 40);
  };
  const onClickCapture = (e) => {
    if (drag.current.moved) { e.preventDefault(); e.stopPropagation(); drag.current.moved = false; }
  };

  return (
    <div style={{ padding: `8px 0 6px`, maxWidth: 1280, marginLeft: 'auto', marginRight: 'auto', width: '100%', boxSizing: 'border-box' }}>
      {/* Animaciones de las tarjetas traumáticas */}
      <style>{`
        /* Solo efectos de luz/color — sin transform. Movimiento muy lento. */
        @keyframes traumaGlowGreen {
          0%,100% { box-shadow: 0 0 0 1px rgba(79,174,92,0.38), 0 0 16px 2px rgba(79,174,92,0.26), 0 4px 16px rgba(0,0,0,0.28); }
          50%     { box-shadow: 0 0 0 1px rgba(79,174,92,0.88), 0 0 34px 8px rgba(79,174,92,0.60), 0 0 56px 16px rgba(79,174,92,0.28), 0 4px 16px rgba(0,0,0,0.28); }
        }
        @keyframes traumaGlowAmber {
          0%,100% { box-shadow: 0 0 0 1px rgba(245,197,24,0.32), 0 0 16px 2px rgba(245,197,24,0.22), 0 4px 16px rgba(0,0,0,0.28); }
          50%     { box-shadow: 0 0 0 1px rgba(245,197,24,0.82), 0 0 34px 8px rgba(245,197,24,0.55), 0 0 56px 16px rgba(245,170,20,0.26), 0 4px 16px rgba(0,0,0,0.28); }
        }
        @keyframes traumaFireFlicker {
          0%   { box-shadow: 0 0 0 1px rgba(192,57,43,0.55), 0 0 18px 3px rgba(192,57,43,0.45), 0 0 32px 7px rgba(245,150,24,0.20), 0 4px 16px rgba(0,0,0,0.30); }
          25%  { box-shadow: 0 0 0 1px rgba(230,90,38,0.82), 0 0 32px 9px rgba(230,90,38,0.58), 0 0 54px 15px rgba(245,170,30,0.42), 0 4px 16px rgba(0,0,0,0.30); }
          50%  { box-shadow: 0 0 0 1px rgba(240,100,40,0.92), 0 0 40px 11px rgba(240,100,40,0.66), 0 0 64px 20px rgba(248,180,40,0.50), 0 4px 16px rgba(0,0,0,0.30); }
          75%  { box-shadow: 0 0 0 1px rgba(228,86,38,0.80), 0 0 32px 9px rgba(228,86,38,0.56), 0 0 54px 15px rgba(245,165,28,0.42), 0 4px 16px rgba(0,0,0,0.30); }
          100% { box-shadow: 0 0 0 1px rgba(192,57,43,0.55), 0 0 18px 3px rgba(192,57,43,0.45), 0 0 32px 7px rgba(245,150,24,0.20), 0 4px 16px rgba(0,0,0,0.30); }
        }
        .trauma-fx-glow  { animation: traumaGlowGreen 11s ease-in-out infinite; will-change: box-shadow; }
        .trauma-fx-pulse { animation: traumaGlowAmber 11s ease-in-out infinite; will-change: box-shadow; }
        .trauma-fx-fire  { animation: traumaFireFlicker 10s ease-in-out infinite; will-change: box-shadow; }
        /* +15% de velocidad SOLO con mouse real (nunca en móvil/táctil) */
        @media (hover: hover) and (pointer: fine) {
          .trauma-fx-glow:hover  { animation-duration: 9.57s; }
          .trauma-fx-pulse:hover { animation-duration: 9.57s; }
          .trauma-fx-fire:hover  { animation-duration: 8.70s; }
        }
        @media (prefers-reduced-motion: reduce) {
          .trauma-fx-glow, .trauma-fx-pulse, .trauma-fx-fire { animation: none; }
        }
      `}</style>
      {/* Encabezado de sección */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: vp.isDesktop ? 26 : 14, flexWrap: 'wrap', padding: `0 ${PAD}px` }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'Courier Prime, monospace', fontSize: 12, color: PALETTE.amber, letterSpacing: '0.14em', textTransform: 'uppercase' }}>◉ Defensa menos letal</span>
            <SinPermisoTag small />
          </div>
          <h2 style={{ margin: '8px 0 0', fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: vp.isDesktop ? 26 : 21, color: PALETTE.text, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Armas Traumáticas</h2>
        </div>
        <button onClick={() => onNav('traumaticas')} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: PALETTE.amber,
          fontFamily: 'Courier Prime, monospace', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}>Ver detalles →</button>
      </div>

      {/* Escritorio: 3 tarjetas en grid · Móvil: carrusel horizontal con swipe */}
      {vp.isDesktop ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 22,
          alignItems: 'stretch',
          padding: `0 ${PAD}px`,
        }}>
          {productos.map((p) => <TraumaTierCard key={p.id} p={p} vp={vp} onNav={onNav} />)}
        </div>
      ) : (
        <div
          ref={scrollerRef}
          className="amx-hscroll"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={endDrag}
          onClickCapture={onClickCapture}
          onDragStart={(e) => e.preventDefault()}
          style={{
            display: 'flex',
            gap: 18,
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            // Padding vertical generoso: el badge sobresale (-12) y el glow se expande ~56px
            padding: `22px ${PAD}px 30px`,
            scrollPaddingLeft: PAD,
            alignItems: 'stretch',
            cursor: dragging ? 'grabbing' : 'grab',
            userSelect: dragging ? 'none' : undefined,
          }}>
          {productos.map((p) => (
            <div key={p.id} style={{
              flex: '0 0 78%',
              maxWidth: 300,
              minWidth: 0,
              display: 'flex',
              scrollSnapAlign: 'start',
            }}>
              <TraumaTierCard p={p} vp={vp} onNav={onNav} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
window.HomeTraumaBanner = HomeTraumaBanner;
