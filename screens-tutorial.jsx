// Armado en México — Introducción / Onboarding tutorial
// ─────────────────────────────────────────────────────────────────
// Pantalla de bienvenida que se muestra en el primer arranque (navegador
// nuevo o app recién instalada) y que puede reproducirse desde MÁS.
// Persistencia del "ya visto" en localStorage: amx_onboarded_v1
// ─────────────────────────────────────────────────────────────────

(function () {
  const P = window.PALETTE;

  // ── Tile de ícono (mismo lenguaje visual que MenuScreen) ──────────
  function IconTile({ icon, accent }) {
    return (
      <span style={{
        flexShrink: 0,
        width: 46, height: 46,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: accent ? 'rgba(245,197,24,0.12)' : P.bg,
        border: `1px solid ${accent ? P.amber : P.border}`,
        color: P.amber,
        fontFamily: 'Courier Prime, monospace',
        fontSize: 26.5,
        borderRadius: 6,
      }}>{icon}</span>
    );
  }

  // ── Fila de función (ícono + título + descripción) ────────────────
  function FeatureRow({ icon, title, desc, accent }) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        background: accent ? `linear-gradient(135deg, ${P.bgCard} 0%, ${P.bgElev} 100%)` : P.bgCard,
        border: `1px solid ${accent ? P.amber : P.border}`,
        padding: '12px 14px',
        textAlign: 'left',
      }}>
        <IconTile icon={icon} accent={accent} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 15,
            color: P.text, textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>{title}</div>
          <div style={{
            fontFamily: 'Open Sans, sans-serif', fontSize: 15, color: P.textDim,
            lineHeight: 1.5, marginTop: 3, textWrap: 'pretty',
          }}>{desc}</div>
        </div>
      </div>
    );
  }

  // ── Etiqueta "✕ no" para las intenciones ──────────────────────────
  function NoChip({ children }) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'rgba(192,57,43,0.10)',
        border: `1px solid ${P.redHi || '#E4574B'}`,
        color: P.text,
        ...window.amxProsa({ fontSize: 14.5, lineHeight: 1.4 }),
        letterSpacing: '0.03em',
        padding: '7px 12px',
      }}>
        <span style={{ color: P.redHi || '#E4574B', fontWeight: 700 }}>✕</span>{children}
      </span>
    );
  }

  // ── Definición de los pasos ───────────────────────────────────────
  // visual: nodo grande; eyebrow/title/body: texto. tone: 'accent' tiñe.
  function buildSlides(vp) {
    const logoSize = vp.isDesktop ? 168 : 138;
    return [
      {
        key: 'welcome',
        eyebrow: '◆ BIENVENIDO',
        title: 'Armado en México',
        body: 'Tu enciclopedia táctica de las armas legales en México. Conoce, compara y aprende — todo en un mismo lugar.',
        tagline: '¡Protege lo que amas!',
        visual: (
          <div style={{
            width: logoSize, height: logoSize, margin: '0 auto',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img src="imagenes/logo-armado-mx.webp" alt="Armado en México"
              style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 18, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />
          </div>
        ),
      },
      {
        key: 'mission',
        eyebrow: '▲ ANTES DE EMPEZAR',
        title: 'Informar, no vender',
        body: 'Somos un proyecto privado y divulgativo. Mostramos las armas de fuego solo con fines informativos y de transparencia — no tramitamos permisos. Lo único que comercializamos son tres armas traumáticas de defensa menos letal.',
        visual: (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', maxWidth: 360, margin: '0 auto' }}>
            <NoChip>No somos gobierno</NoChip>
            <NoChip>No vendemos armas de fuego</NoChip>
            <NoChip>No tramitamos licencias</NoChip>
          </div>
        ),
      },
      {
        key: 'explore',
        eyebrow: '▤ EXPLORA',
        title: 'Arsenal y comparador',
        rows: [
          { icon: '▤', title: 'Arsenal', desc: 'Más de 100 fichas con specs, calibre y disponibilidad legal. Filtra por categoría y tipo.' },
          { icon: '⇄', title: 'Comparar', desc: 'Pon dos armas lado a lado y revisa sus diferencias al detalle.' },
        ],
      },
      {
        key: 'learn',
        eyebrow: '◉ APRENDE',
        title: 'Conocimiento a la mano',
        rows: [
          { icon: '◉', title: 'Calibres', desc: 'Guía de munición: balística, usos y las armas que lo disparan.' },
          { icon: '✦', title: 'Experiencias', desc: 'Formación y actividades de tiro · próximamente.' },
          { icon: '◎', title: 'Campos de tiro', desc: 'Clubes y polígonos aliados · próximamente.' },
          { icon: '§', title: 'Legalidad', desc: 'Cómo es el trámite ante SEDENA y las categorías legales.' },
        ],
      },
      {
        key: 'defense',
        eyebrow: '◎ DEFENSA MENOS LETAL',
        title: 'Armas traumáticas',
        body: 'Dispositivos de defensa propulsados por CO₂ en calibre .50 y .68. Sin permiso SEDENA — y lo único que sí puedes comprar con nosotros.',
        accent: true,
        visual: (
          <div style={{
            width: vp.isDesktop ? 150 : 128, height: vp.isDesktop ? 150 : 128, margin: '0 auto',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${P.amber}`, borderRadius: 12,
            background: 'rgba(245,197,24,0.06)',
            fontFamily: 'Courier Prime, monospace', fontSize: vp.isDesktop ? 77 : 65, color: P.amber,
            boxShadow: '0 0 0 1px rgba(245,197,24,0.18), 0 10px 30px rgba(0,0,0,0.45)',
          }}>◎</div>
        ),
      },
      {
        key: 'ready',
        eyebrow: '✓ TODO LISTO',
        title: 'Empieza a explorar',
        body: '¿Quieres repasar esta introducción más tarde? Encuentra «Ver tutorial» en la sección MÁS cuando quieras.',
        tagline: 'Tu defensa, nuestra especialidad.',
        visual: (
          <div style={{
            width: vp.isDesktop ? 110 : 96, height: vp.isDesktop ? 110 : 96, margin: '0 auto',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `2px solid ${P.amber}`, borderRadius: '50%',
            color: P.amber, fontSize: vp.isDesktop ? 62.5 : 53, fontFamily: 'Courier Prime, monospace',
            boxShadow: '0 0 0 6px rgba(245,197,24,0.08)',
          }}>✓</div>
        ),
      },
    ];
  }

  // ── Componente principal ──────────────────────────────────────────
  function OnboardingTutorial({ open, onClose }) {
    const vp = window.useViewport();
    const [idx, setIdx] = React.useState(0);
    const touch = React.useRef({ x: 0, active: false });

    const slides = React.useMemo(() => buildSlides(vp), [vp.isDesktop]);
    const count = slides.length;
    const last = idx === count - 1;

    // Reiniciar al abrir
    React.useEffect(() => { if (open) setIdx(0); }, [open]);

    // Bloquear el scroll del fondo mientras está abierto
    React.useEffect(() => {
      if (!open) return;
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }, [open]);

    const goNext = React.useCallback(() => {
      setIdx((i) => (i >= count - 1 ? i : i + 1));
    }, [count]);
    const goBack = React.useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);
    const finish = React.useCallback(() => { onClose && onClose(); }, [onClose]);

    // Teclado (escritorio): ← → para navegar, Esc para salir
    React.useEffect(() => {
      if (!open) return;
      const onKey = (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); last ? finish() : goNext(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); goBack(); }
        else if (e.key === 'Escape') { e.preventDefault(); finish(); }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [open, last, goNext, goBack, finish]);

    if (!open) return null;

    const s = slides[idx];

    // Swipe táctil
    const onTouchStart = (e) => { touch.current = { x: e.touches[0].clientX, active: true }; };
    const onTouchEnd = (e) => {
      if (!touch.current.active) return;
      const dx = (e.changedTouches[0].clientX) - touch.current.x;
      touch.current.active = false;
      if (Math.abs(dx) < 45) return;
      if (dx < 0) { last ? finish() : goNext(); } else { goBack(); }
    };

    const PAD = vp.isDesktop ? 40 : 22;

    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1200,
        background: P.bg,
        display: 'flex', flexDirection: 'column',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <style>{`
          @keyframes tutIn {
            from { opacity: 0; transform: translateX(16px); }
            to   { opacity: 1; transform: translateX(0); }
          }
          @keyframes tutFade { from { opacity: 0; } to { opacity: 1; } }
          .tut-slide { animation: tutIn 0.32s ease both; }
          @media (prefers-reduced-motion: reduce) {
            .tut-slide { animation: tutFade 0.2s ease both; }
          }
          .tut-grid::before {
            content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 0;
            background-image:
              linear-gradient(rgba(245,197,24,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(245,197,24,0.03) 1px, transparent 1px);
            background-size: 44px 44px;
            -webkit-mask-image: radial-gradient(ellipse at center, black 25%, transparent 78%);
            mask-image: radial-gradient(ellipse at center, black 25%, transparent 78%);
          }
        `}</style>

        {/* ── Barra superior: progreso + saltar ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: `16px ${PAD}px 8px`,
        }}>
          <div style={{ display: 'flex', gap: 6, flex: 1 }}>
            {slides.map((sl, i) => (
              <div key={sl.key} style={{
                height: 3, flex: 1, borderRadius: 2,
                background: i <= idx ? P.amber : P.border,
                transition: 'background 0.25s ease',
              }} />
            ))}
          </div>
          <button onClick={finish} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: P.textMuted, fontFamily: 'Courier Prime, monospace',
            fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase',
            padding: '4px 2px', whiteSpace: 'nowrap',
          }}>{last ? '' : 'Saltar ✕'}</button>
        </div>

        {/* ── Cuerpo del paso ── */}
        <div
          className="tut-grid"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          style={{
            flex: 1, position: 'relative', overflowY: 'auto',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            padding: `8px ${PAD}px 8px`,
          }}>
          <div key={s.key} className="tut-slide" style={{
            position: 'relative', zIndex: 1,
            width: '100%', maxWidth: 460, margin: '0 auto',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Visual */}
            {s.visual && (
              <div style={{ marginBottom: 26 }}>{s.visual}</div>
            )}

            {/* Eyebrow */}
            <div style={{
              fontFamily: 'Courier Prime, monospace', fontSize: 14.5,
              color: P.amber, letterSpacing: '0.2em', textTransform: 'uppercase',
              marginBottom: 10, textAlign: s.rows ? 'left' : 'center',
            }}>{s.eyebrow}</div>

            {/* Título */}
            <h2 style={{
              margin: 0,
              fontFamily: 'Montserrat, sans-serif', fontWeight: 800,
              fontSize: vp.isDesktop ? 34 : 27, color: P.text,
              textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.05,
              textAlign: s.rows ? 'left' : 'center',
            }}>{s.title}</h2>

            {/* Cuerpo de texto */}
            {s.body && (
              <p style={{
                margin: '14px 0 0',
                fontFamily: 'Open Sans, sans-serif', fontSize: vp.isDesktop ? 19 : 18,
                color: P.textDim, lineHeight: 1.65, textAlign: 'center', textWrap: 'pretty',
              }}>{s.body}</p>
            )}

            {/* Filas de funciones */}
            {s.rows && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
                {s.rows.map((r) => <FeatureRow key={r.title} {...r} />)}
              </div>
            )}

            {/* Tagline */}
            {s.tagline && (
              <div style={{
                marginTop: 20, textAlign: 'center',
                fontFamily: 'Courier Prime, monospace', fontSize: 15,
                color: P.amber, letterSpacing: '0.08em',
              }}>{s.tagline}</div>
            )}
          </div>
        </div>

        {/* ── Barra inferior: atrás + siguiente ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
          padding: `12px ${PAD}px ${vp.isDesktop ? 24 : 18}px`,
          borderTop: `1px solid ${P.border}`,
        }}>
          <button onClick={goBack} disabled={idx === 0} style={{
            background: 'none', border: 'none',
            cursor: idx === 0 ? 'default' : 'pointer',
            visibility: idx === 0 ? 'hidden' : 'visible',
            color: P.textDim, fontFamily: 'Montserrat, sans-serif', fontWeight: 600,
            fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '10px 6px',
          }}>‹ Atrás</button>

          <div style={{
            fontFamily: 'Courier Prime, monospace', fontSize: 14.5, color: P.textMuted,
            letterSpacing: '0.1em',
          }}>{String(idx + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}</div>

          <button onClick={() => (last ? finish() : goNext())} style={{
            background: P.amber, color: '#000', border: 'none',
            cursor: 'pointer',
            fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
            fontSize: 14, letterSpacing: '0.12em', textTransform: 'uppercase',
            padding: '12px 22px', borderRadius: 4,
            transition: 'filter 0.2s ease, transform 0.1s ease',
          }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >{last ? 'Empezar ›' : 'Siguiente ›'}</button>
        </div>
      </div>
    );
  }

  window.OnboardingTutorial = OnboardingTutorial;
})();
