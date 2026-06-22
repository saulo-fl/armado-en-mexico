// Armado en México — Pantallas principales
// Home, Catalog (categorías), Category (lista filtrada), Product (ficha), Compare

const { useState, useMemo, useEffect } = React;

// Foto hero 4:5 por categoría (preferencia: con persona o contexto, no fondo blanco)
const CATEGORY_HEROS = {
  pistola:  'imagenes/008_CZ_P-07.jpg',           // mano sosteniendo pistola en césped
  revolver: 'imagenes/021_Ruger_Wrangler.webp',   // revólver Ruger
  rifle:    'imagenes/032_CZ_600_American.jpg',   // cazador apuntando en campo
  escopeta: 'imagenes/050_Browning_Maxus.webp',   // cazador en escena invernal
  carabina: 'imagenes/058_Derya_MR-S1.webp',      // tiradora con gafas, fondo negro
};
window.CATEGORY_HEROS = CATEGORY_HEROS;

// ════════════════════════════════════════════════════════════════
// HOME — Mobile-first · Header + Sliders + 3 Carruseles
// ════════════════════════════════════════════════════════════════
function HomeScreen({ onNav, onOpenArma, onOpenAccesorio, onOpenMunicion }) {
  const vp = window.useViewport();
  const [promoIdx, setPromoIdx] = useState(0);
  const [homeQuery, setHomeQuery] = useState('');
  const [, forceRender] = useState(0);
  useEffect(() => window.Store && window.Store.onChange(() => forceRender((x) => x + 1)), []);

  // Promo slides (editables desde admin)
  const promos = useMemo(() => window.Store ? window.Store.getPromos() : [], [forceRender]);
  useEffect(() => {
    if (promos.length < 2) return;
    const t = setInterval(() => setPromoIdx((i) => (i + 1) % promos.length), 6500);
    return () => clearInterval(t);
  }, [promos.length]);

  // Tres listas curadas / dinámicas
  const favoritos = useMemo(() => window.Store ? window.Store.getFavoriteArmas() : [], [forceRender]);
  const masVisitadas = useMemo(() => window.Store ? window.Store.getTopPopular(10, 30) : [], [forceRender]);

  const PAD = 16;
  const containerMax = { maxWidth: 1280, margin: '0 auto', width: '100%' };
  const teamName = (window.Store ? window.Store.getAppConfig().teamName : 'Armas M&S') || 'Armas M&S';

  // Sugerencias para secciones aún vacías — carrusel swipeable en lugar de barra de aviso
  const db = window.DB || [];
  const sugerencias = (offset) => db.slice(offset, offset + 10);
  const renderSugerencia = (a) => <window.ArmaCard arma={a} onClick={() => onOpenArma(a.id)} />;
  const doHomeSearch = () => { const q = homeQuery.trim(); if (q) onNav('category', { mode: 'search', value: q }); };

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* 1 ▸ SLIDERS uniformes y centrados */}
      {promos.length > 0 &&
      <PromoSlider promos={promos} idx={promoIdx} setIdx={setPromoIdx} onNav={onNav} vp={vp} />
      }

      {/* 1.5 ▸ Buscador rápido — acceso directo al arsenal desde el inicio */}
      <div style={{ ...containerMax, padding: `12px ${PAD}px 4px` }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: PALETTE.bgCard, border: `1px solid ${PALETTE.amber}`, padding: '10px 12px'
        }}>
          <span style={{ color: PALETTE.amber, fontSize: 18 }}>⌕</span>
          <input value={homeQuery}
            onChange={(e) => setHomeQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') doHomeSearch(); }}
            placeholder="Buscar arma · nombre, marca, calibre…"
            aria-label="Buscar arma"
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none', color: PALETTE.text,
              fontFamily: 'Courier Prime, monospace', fontSize: 15.5
            }} />
          {homeQuery &&
            <button onClick={() => setHomeQuery('')} aria-label="Limpiar búsqueda" style={{
              background: 'none', border: 'none', cursor: 'pointer', color: PALETTE.textMuted, fontSize: 16
            }}>✕</button>
          }
          <button onClick={doHomeSearch} style={{
            background: PALETTE.amber, border: 'none', cursor: 'pointer', color: '#000',
            fontFamily: 'Courier Prime, monospace', fontSize: 13, fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase', padding: '7px 14px', whiteSpace: 'nowrap'
          }}>Buscar</button>
        </div>
      </div>

      {/* 2 ▸ Carrusel: Favoritos de Armas M&S */}
      <CarouselSection
        eyebrow="◆ CURADURÍA DEL EQUIPO"
        title={`Favoritos de ${teamName}`}
        items={favoritos}
        fallbackItems={sugerencias(0)}
        fallbackNote="Selección sugerida · el equipo aún no marca favoritos"
        fallbackRender={renderSugerencia}
        renderItem={(a, i) =>
        <FavCard arma={a} rank={i + 1} onClick={() => onOpenArma(a.id)} />
        } />
      

      {/* 3 ▸ Carrusel: Las más visitadas */}
      <CarouselSection
        eyebrow="▸ POPULARIDAD · ÚLT. 30 DÍAS"
        title="Las más visitadas"
        items={masVisitadas}
        fallbackItems={sugerencias(10)}
        fallbackNote="Explora el catálogo · las visitas de la comunidad aparecerán aquí"
        fallbackRender={renderSugerencia}
        renderItem={(a, i) =>
        <VisitedCard arma={a} rank={i + 1} onClick={() => onOpenArma(a.id)} />
        } />
      

      {/* 5 ▸ Calibres · guía enciclopédica */}
      <CarouselSection
        eyebrow="◉ MUNICIÓN · GUÍA"
        title="Calibres"
        action={
        <button onClick={() => onNav('calibres')} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: PALETTE.amber,
          fontFamily: 'Courier Prime, monospace', fontSize: 14.5, letterSpacing: '0.12em', textTransform: 'uppercase'
        }}>Ver guía →</button>
        }
        items={(window.CALIBRES || [])}
        renderItem={(c) =>
        <CaliberMiniCard cal={c} onClick={() => onNav('calibres')} />
        } />

      {/* 6 ▸ Campos de tiro */}
      <CarouselSection
        eyebrow="◎ CAMPOS Y CLUBES · PRÓXIMAMENTE"
        title="Campos de tiro"
        action={
        <button onClick={() => onNav('campos')} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: PALETTE.amber,
          fontFamily: 'Courier Prime, monospace', fontSize: 14.5, letterSpacing: '0.12em', textTransform: 'uppercase'
        }}>Ver todos →</button>
        }
        items={(window.CAMPOS || [])}
        renderItem={(c) =>
        <CampoMiniCard campo={c} onClick={() => onNav('campos')} />
        } />

      {/* 7 ▸ Cursos */}
      <CarouselSection
        eyebrow="✦ FORMACIÓN"
        title="Cursos"
        action={
        <button onClick={() => onNav('cursos')} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: PALETTE.amber,
          fontFamily: 'Courier Prime, monospace', fontSize: 14.5, letterSpacing: '0.12em', textTransform: 'uppercase'
        }}>Ver todos →</button>
        }
        items={(window.CURSOS || [])}
        renderItem={(c) =>
        <CursoMiniCard curso={c} onClick={() => onNav('cursos')} />
        } />

      {/* 8 ▸ Categorías rápidas (legacy) */}
      <div style={{ ...containerMax, padding: `8px ${PAD}px 0` }}>
        <SectionHeader action={
        <button onClick={() => onNav('catalog')} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: PALETTE.amber,
          fontFamily: 'Courier Prime, monospace',
          fontSize: 14.5, letterSpacing: '0.12em',
          textTransform: 'uppercase'
        }}>Ver Todas →</button>
        }>Categorías</SectionHeader>

        <div style={{
          display: 'grid', gridTemplateColumns: vp.isDesktop ? 'repeat(5, 1fr)' : '1fr 1fr',
          gap: 10, marginBottom: 22
        }}>
          {window.CATEGORIES.tipo.map((c) => {
            const count = window.DB.filter((a) => a.tipo === c.id).length;
            const hero = CATEGORY_HEROS[c.id];
            return (
              <button key={c.id} onClick={() => onNav('category', { mode: 'tipo', value: c.id })} style={{
                background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`,
                padding: 0, cursor: 'pointer', textAlign: 'left',
                position: 'relative', overflow: 'hidden',
                display: 'block', width: '100%',
                transition: 'border-color 0.18s'
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = PALETTE.amber; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = PALETTE.border; }}>
                {/* Foto 4:5 */}
                <div style={{
                  width: '100%', aspectRatio: '4 / 5',
                  position: 'relative', overflow: 'hidden',
                  background: `linear-gradient(135deg, ${PALETTE.bgElev} 0%, ${PALETTE.bg} 100%)`
                }}>
                  {hero && (
                    <img src={hero} alt={c.label} loading="lazy" style={{
                      width: '100%', height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center',
                      filter: 'contrast(1.06) saturate(0.92) brightness(0.92)',
                      display: 'block'
                    }} />
                  )}
                  {/* tinte para integrar con el dark theme */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: `linear-gradient(180deg, rgba(26,26,26,0.05) 0%, rgba(26,26,26,0.35) 55%, rgba(26,26,26,0.92) 100%)`,
                    pointerEvents: 'none'
                  }} />
                  {/* corner ticks */}
                  <div style={{
                    position: 'absolute', top: 6, left: 6,
                    width: 10, height: 10,
                    borderTop: `1.5px solid ${PALETTE.amber}`,
                    borderLeft: `1.5px solid ${PALETTE.amber}`,
                    opacity: 0.75
                  }} />
                  <div style={{
                    position: 'absolute', bottom: 6, right: 6,
                    width: 10, height: 10,
                    borderBottom: `1.5px solid ${PALETTE.amber}`,
                    borderRight: `1.5px solid ${PALETTE.amber}`,
                    opacity: 0.75
                  }} />
                  {/* badge de conteo */}
                  <div style={{
                    position: 'absolute', top: 8, right: 8,
                    background: 'rgba(0,0,0,0.78)',
                    border: `1px solid ${PALETTE.amber}`,
                    color: PALETTE.amber,
                    padding: '2px 7px',
                    fontFamily: 'Courier Prime, monospace',
                    fontSize: 13, letterSpacing: '0.1em',
                    fontWeight: 700
                  }}>{String(count).padStart(2, '0')}</div>
                  {/* label overlay */}
                  <div style={{
                    position: 'absolute', left: 10, right: 10, bottom: 10
                  }}>
                    <div style={{
                      fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                      fontSize: vp.isDesktop ? 17 : 16,
                      color: PALETTE.text,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      lineHeight: 1,
                      textShadow: '0 1px 2px rgba(0,0,0,0.6)'
                    }}>{c.label}</div>
                    <div style={{
                      fontFamily: 'Courier Prime, monospace',
                      fontSize: 13, color: PALETTE.amber,
                      letterSpacing: '0.18em',
                      marginTop: 4,
                      display: 'flex', alignItems: 'center', gap: 6
                    }}>
                      <span style={{ fontSize: 15.5}}>{c.icon}</span>
                      <span>{count} unidades</span>
                    </div>
                  </div>
                </div>
              </button>);

          })}
        </div>
      </div>

      {/* 8.5 ▸ Accesorios DCAM — categorías (justo después de las categorías de armas) */}
      {window.HomeAccesoriosSection &&
        <window.HomeAccesoriosSection onOpen={onOpenAccesorio} onNav={onNav} />
      }

      {/* 8.6 ▸ Municiones DCAM/OTCA — por calibre */}
      {window.HomeMunicionesSection &&
        <window.HomeMunicionesSection onNav={onNav} />
      }

      {/* 6 ▸ Disponibilidad legal */}
      <div style={{ ...containerMax, padding: `0 ${PAD}px` }}>
        <SectionHeader>Por disponibilidad legal</SectionHeader>
        <div style={{
          display: 'grid',
          gridTemplateColumns: vp.isDesktop ? '1fr 1fr' : '1fr',
          gap: 8, marginBottom: 22
        }}>
          {window.CATEGORIES.disponibilidad.map((d) => {
            const count = window.DB.filter((a) => a.avail === d.id).length;
            if (!count) return null;
            return (
              <button key={d.id} onClick={() => onNav('category', { mode: 'avail', value: d.id })}
              style={{
                background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`,
                borderLeft: `3px solid ${d.color}`,
                padding: '10px 12px', cursor: 'pointer', textAlign: 'left',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{
                    fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 15,
                    color: PALETTE.text, textTransform: 'uppercase', letterSpacing: '0.06em'
                  }}>{d.label}</div>
                  <div style={{
                    fontFamily: 'Courier Prime, monospace', fontSize: 13,
                    color: PALETTE.textMuted, marginTop: 2, lineHeight: 1.4
                  }}>{d.desc}</div>
                </div>
                <div style={{
                  fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                  fontSize: 19, color: d.color, marginLeft: 10
                }}>{count}</div>
              </button>);

          })}
        </div>
      </div>

      {/* 9 ▸ Armas traumáticas (defensa menos letal) — al final del feed de inicio */}
      <window.HomeTraumaBanner onNav={onNav} />

      {/* 7 ▸ Disclaimer */}
      <div style={{
        ...containerMax,
        marginTop: 8, marginBottom: 16,
        padding: '12px',
        background: PALETTE.bgElev,
        border: `1px dashed ${PALETTE.border}`,
        fontFamily: 'Courier Prime, monospace',
        fontSize: 14.5, color: PALETTE.textMuted,
        lineHeight: 1.55, boxSizing: 'border-box'
      }}>
        <div style={{
          color: PALETTE.amber, fontWeight: 700,
          letterSpacing: '0.15em', marginBottom: 4, fontSize: 13}}>◆ AVISO</div>
        Catálogo divulgativo sin fines de lucro. Las armas de fuego se muestran solo con fines informativos. Información basada en la Ley Federal de Armas de Fuego y precios DCAM. Por <span style={{ color: PALETTE.text }}>Saulo Flores · {teamName}</span>.
      </div>
    </div>);

}
window.HomeScreen = HomeScreen;

// ════════════════════════════════════════════════════════════════
// CAROUSEL SECTION — sección con título + carrusel horizontal
// ════════════════════════════════════════════════════════════════
function CarouselSection({ eyebrow, title, items, renderItem, emptyText, action, fallbackItems, fallbackNote, fallbackRender }) {
  const vp = window.useViewport();
  const PAD = 16;
  const usingFallback = (!items || !items.length) && fallbackItems && fallbackItems.length > 0;
  const list = usingFallback ? fallbackItems : items;
  const render = usingFallback ? (fallbackRender || renderItem) : renderItem;
  return (
    <div style={{ marginBottom: 20, maxWidth: 1280, marginLeft: 'auto', marginRight: 'auto' }}>
      <div style={{ padding: `0 ${PAD}px`, marginBottom: 10 }}>
        {eyebrow &&
        <div style={{
          fontFamily: 'Courier Prime, monospace',
          fontSize: 13, color: PALETTE.amber,
          letterSpacing: '0.22em', textTransform: 'uppercase',
          marginBottom: 4, fontWeight: 600, margin: "25px 0px 4px"
        }}>{eyebrow}</div>
        }
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <div style={{
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 700, fontSize: 21,
            color: PALETTE.text,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            flex: '1 1 auto', minWidth: 0, whiteSpace: 'nowrap'
          }}>{title}</div>
          {action}
        </div>
        {usingFallback && fallbackNote &&
        <div style={{
          fontFamily: 'Courier Prime, monospace',
          fontSize: 14, color: PALETTE.textMuted,
          letterSpacing: '0.08em', marginTop: 4
        }}>◇ {fallbackNote}</div>
        }
      </div>
      <window.HCarousel
        items={list}
        renderItem={render}
        itemWidth={vp.isDesktop ? 340 : 300}
        padX={PAD}
        emptyText={emptyText} />
      
    </div>);

}
window.CarouselSection = CarouselSection;

// ════════════════════════════════════════════════════════════════
// CARDS para los tres carruseles
// ════════════════════════════════════════════════════════════════
function FavCard({ arma, rank, onClick }) {
  const rating = window.Store ? window.Store.getRating(arma.id) : { avg: 0, count: 0 };
  return (
    <div onClick={onClick} style={{
      background: PALETTE.bgCard,
      border: `1px solid ${PALETTE.border}`,
      borderTop: `2px solid ${PALETTE.amber}`,
      cursor: 'pointer', position: 'relative',
      overflow: 'hidden',
      height: '100%', display: 'flex', flexDirection: 'row',
      transition: 'border-color 0.18s, transform 0.18s'
    }}
    onMouseEnter={(e) => e.currentTarget.style.borderColor = PALETTE.amber}
    onMouseLeave={(e) => e.currentTarget.style.borderColor = PALETTE.border}>
      {/* badge de favorito */}
      <div style={{
        position: 'absolute', top: 0, left: 0, zIndex: 2,
        background: PALETTE.amber, color: '#000',
        fontFamily: 'Courier Prime, monospace',
        fontSize: 13, fontWeight: 700,
        letterSpacing: '0.1em',
        padding: '3px 8px'
      }}>★ TOP</div>
      <div style={{
        width: '42%', flexShrink: 0, alignSelf: 'stretch', minHeight: 112, overflow: 'hidden',
        background: `radial-gradient(ellipse at 50% 50%, ${PALETTE.bgElev} 0%, ${PALETTE.bg} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
        borderRight: `1px solid ${PALETTE.border}`
      }}>
        <img src={arma.img} alt={arma.nombre}
        style={{ maxWidth: '85%', maxHeight: '85%', objectFit: 'contain', filter: 'grayscale(0.1) contrast(1.1)' }}
        onError={(e) => {e.target.src = window.armaPlaceholder(arma);e.target.onerror = null;}} />
      </div>
      <window.ArmaCardBody arma={arma} />
    </div>);

}
window.FavCard = FavCard;

function VisitedCard({ arma, rank, onClick }) {
  const visits = window.Store ? (window.Store.getVisits()[arma.id] || []).length : 0;
  return (
    <div onClick={onClick} style={{
      background: PALETTE.bgCard,
      border: `1px solid ${PALETTE.border}`,
      cursor: 'pointer', position: 'relative',
      overflow: 'hidden',
      height: '100%', display: 'flex', flexDirection: 'row'
    }}>
      <div style={{
        position: 'absolute', top: 8, left: 8, zIndex: 2,
        background: 'rgba(0,0,0,0.7)', border: `1px solid ${PALETTE.amber}`,
        color: PALETTE.amber,
        fontFamily: 'Montserrat, sans-serif',
        fontSize: 13, fontWeight: 700,
        width: 26, height: 26,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>{String(rank).padStart(2, '0')}</div>
      <div style={{
        width: '42%', flexShrink: 0, alignSelf: 'stretch', minHeight: 112, overflow: 'hidden',
        background: `radial-gradient(ellipse at 50% 50%, ${PALETTE.bgElev} 0%, ${PALETTE.bg} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
        borderRight: `1px solid ${PALETTE.border}`
      }}>
        <img src={arma.img} alt={arma.nombre}
        style={{ maxWidth: '85%', maxHeight: '85%', objectFit: 'contain', filter: 'grayscale(0.1) contrast(1.1)' }}
        onError={(e) => {e.target.src = window.armaPlaceholder(arma);e.target.onerror = null;}} />
      </div>
      <window.ArmaCardBody arma={arma} />
    </div>);

}
window.VisitedCard = VisitedCard;

function RatedCard({ arma, onClick }) {
  const rating = window.Store ? window.Store.getRating(arma.id) : { avg: 0, count: 0 };
  return (
    <div onClick={onClick} style={{
      background: PALETTE.bgCard,
      border: `1px solid ${PALETTE.border}`,
      cursor: 'pointer', position: 'relative',
      overflow: 'hidden',
      height: '100%', display: 'flex', flexDirection: 'row'
    }}>
      <div style={{
        width: '42%', flexShrink: 0, alignSelf: 'stretch', minHeight: 112, overflow: 'hidden',
        background: `radial-gradient(ellipse at 50% 50%, ${PALETTE.bgElev} 0%, ${PALETTE.bg} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
        borderRight: `1px solid ${PALETTE.border}`
      }}>
        <img src={arma.img} alt={arma.nombre}
        style={{ maxWidth: '85%', maxHeight: '85%', objectFit: 'contain', filter: 'grayscale(0.1) contrast(1.1)' }}
        onError={(e) => {e.target.src = window.armaPlaceholder(arma);e.target.onerror = null;}} />
        {rating.count > 0 &&
        <div style={{
          position: 'absolute', bottom: 8, right: 8,
          background: PALETTE.amber, color: '#000',
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 700, fontSize: 15,
          padding: '3px 8px',
          display: 'flex', alignItems: 'center', gap: 4
        }}>
            <span>★</span>{rating.avg.toFixed(1)}
          </div>
        }
      </div>
      <window.ArmaCardBody arma={arma} />
    </div>);

}
window.RatedCard = RatedCard;

// ════════════════════════════════════════════════════════════════
// PROMO SLIDER — banner editable arriba de la Home
// ════════════════════════════════════════════════════════════════
function PromoSlider({ promos, idx, setIdx, onNav, vp }) {
  if (!promos || !promos.length) return null;
  const p = promos[idx % promos.length];
  const bgColor = p.bgColor || PALETTE.bgElev;
  const accent = p.accent || PALETTE.amber;
  // Dimensiones UNIFORMES (no varían según contenido)
  const SLIDER_HEIGHT = vp.isDesktop ? 330 : 285;
  // Swipe táctil (móvil) — desliza entre slides sin bloquear el scroll vertical
  const touch = React.useRef({ x: 0, y: 0, active: false });
  const onTouchStart = (e) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, active: true };
  };
  const onTouchEnd = (e) => {
    if (!touch.current.active || promos.length < 2) return;
    touch.current.active = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;
    // sólo si el gesto fue predominantemente horizontal y con recorrido suficiente
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) setIdx((i) => (i + 1) % promos.length);
    else setIdx((i) => (i - 1 + promos.length) % promos.length);
  };
  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
      position: 'relative',
      background: bgColor,
      borderBottom: `2px solid ${accent}`,
      overflow: 'hidden',
      height: SLIDER_HEIGHT, // ← altura fija
      maxWidth: 1280,
      margin: '0 auto',
      touchAction: 'pan-y'
    }}>
      {/* imagen de fondo (opcional) */}
      {p.bgImage &&
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(180deg, ${bgColor}cc 0%, ${bgColor}99 60%, ${bgColor}f0 100%), url("${p.bgImage}")`,
        backgroundSize: 'cover', backgroundPosition: 'center'
      }} />
      }
      {/* cuadrícula táctica */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(${accent}11 1px, transparent 1px), linear-gradient(90deg, ${accent}11 1px, transparent 1px)`,
        backgroundSize: '32px 32px',
        maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)'
      }} />

      {/* contenido — centrado vertical y horizontal */}
      <div style={{
        position: 'absolute', inset: 0,
        padding: vp.isDesktop ? '40px 56px 56px' : '24px 22px 44px',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center'
      }}>
        <div style={{
          fontFamily: 'Courier Prime, monospace',
          fontSize: 14.5, color: accent,
          letterSpacing: '0.25em', textTransform: 'uppercase',
          marginBottom: 10,
          height: 18, lineHeight: '18px', // altura fija para evitar saltos
          overflow: 'hidden'
        }}>{p.eyebrow || ' '}</div>

        <div style={{
          fontFamily: 'Montserrat, sans-serif',
          fontSize: vp.isDesktop ? 38 : 25,
          fontWeight: 700, color: PALETTE.text,
          textTransform: 'uppercase',
          letterSpacing: '0.02em', lineHeight: 1.05,
          marginBottom: 10,
          maxWidth: 720,
          // altura fija de 2 líneas
          height: vp.isDesktop ? 80 : 56,
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 2,
          overflow: 'hidden'
        }}>{p.title}</div>

        <div style={{
          fontFamily: 'Courier Prime, monospace',
          fontSize: vp.isDesktop ? 18 : 15.5, color: PALETTE.textDim,
          lineHeight: 1.55, maxWidth: 560,
          marginBottom: 18,
          // altura fija de 2 líneas
          height: vp.isDesktop ? 48 : 42,
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 2,
          overflow: 'hidden'
        }}>{p.subtitle || ' '}</div>

        {p.cta ?
        <button onClick={() => onNav(p.ctaTarget || 'catalog')} style={{
          background: accent, color: '#000', border: 'none',
          padding: vp.isDesktop ? '12px 24px' : '10px 20px',
          fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
          fontSize: vp.isDesktop ? 15 : 14,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          cursor: 'pointer',
          display: 'inline-flex', gap: 10, alignItems: 'center',
          whiteSpace: 'nowrap'
        }}>{p.cta} <span>→</span></button> :

        // espacio vacío con misma altura para mantener consistencia
        <div style={{ height: vp.isDesktop ? 44 : 40 }} />
        }
      </div>

      {/* navegación */}
      {promos.length > 1 &&
      <React.Fragment>
          <div style={{
          position: 'absolute', bottom: 14, right: 14,
          display: 'flex', gap: 6, alignItems: 'center',
          background: 'rgba(0,0,0,0.55)',
          padding: '5px 8px',
          zIndex: 2
        }}>
            <button onClick={(e) => {e.stopPropagation();setIdx((i) => (i - 1 + promos.length) % promos.length);}}
          style={promoBtnStyle()}>‹</button>
            <span style={{
            fontFamily: 'Courier Prime, monospace',
            fontSize: 14.5, color: PALETTE.text,
            letterSpacing: '0.15em', margin: '0 4px',
            minWidth: 28, textAlign: 'center'
          }}>{String(idx + 1).padStart(2, '0')}/{String(promos.length).padStart(2, '0')}</span>
            <button onClick={(e) => {e.stopPropagation();setIdx((i) => (i + 1) % promos.length);}}
          style={promoBtnStyle()}>›</button>
          </div>

          {/* dots centrados abajo */}
          <div style={{
          position: 'absolute', bottom: 14, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', gap: 5,
          zIndex: 2
        }}>
            {promos.map((_, i) =>
          <button key={i} onClick={(e) => {e.stopPropagation();setIdx(i);}} style={{
            width: i === idx ? 20 : 6, height: 4,
            background: i === idx ? accent : 'rgba(255,255,255,0.25)',
            border: 'none', cursor: 'pointer',
            transition: 'width 0.25s, background 0.25s',
            padding: 0
          }} />
          )}
          </div>
        </React.Fragment>
      }
    </div>);

}
function promoBtnStyle() {
  return {
    background: 'transparent', color: PALETTE.text,
    border: `1px solid ${PALETTE.border}`,
    width: 24, height: 24, cursor: 'pointer',
    fontSize: 16, lineHeight: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0
  };
}

// CATALOG — Catálogo principal con todos los filtros
// ════════════════════════════════════════════════════════════════
function CatalogScreen({ initialFilter, onOpenArma, compareIds, toggleCompare }) {
  const vp = window.useViewport();
  const cols = vp.isDesktop ? 'repeat(3, 1fr)' : vp.isTablet ? 'repeat(2, 1fr)' : '1fr';
  const [query, setQuery] = useState(initialFilter?.mode === 'search' ? initialFilter.value : '');
  const [tipo, setTipo] = useState(initialFilter?.mode === 'tipo' ? initialFilter.value : 'all');
  const [avail, setAvail] = useState(initialFilter?.mode === 'avail' ? initialFilter.value : 'all');
  const [sucursal, setSucursal] = useState(initialFilter?.mode === 'sucursal' ? initialFilter.value : 'all');
  const [calibre, setCalibre] = useState(initialFilter?.mode === 'calibre' ? initialFilter.value : 'all');
  const [uso, setUso] = useState(initialFilter?.mode === 'uso' ? initialFilter.value : 'all');
  const [showAdv, setShowAdv] = useState(false);
  const [marca, setMarca] = useState('all');
  const [era, setEra] = useState('all');
  const [precio, setPrecio] = useState('all'); // 1..5
  const [mecanismo, setMecanismo] = useState('all');

  const filtered = useMemo(() => {
    return window.DB.filter((a) => {
      if (tipo !== 'all' && a.tipo !== tipo) return false;
      if (avail !== 'all' && a.avail !== avail) return false;
      if (sucursal !== 'all') {
        const s = window.getArmaSucursales ? window.getArmaSucursales(a.id) : { dcam: true, otca: false };
        if (sucursal === 'DCAM' && !s.dcam) return false;
        if (sucursal === 'OTCA' && !s.otca) return false;
      }
      if (calibre !== 'all' && a.calibre !== calibre) return false;
      if (uso !== 'all' && !a.uses.includes(uso)) return false;
      if (marca !== 'all' && a.marca !== marca) return false;
      if (era !== 'all' && a.era !== era) return false;
      if (precio !== 'all' && a.priceLvl !== Number(precio)) return false;
      if (mecanismo !== 'all') {
        const m = a.mecanismo.toLowerCase();
        if (mecanismo === 'semi' && !m.includes('semi')) return false;
        if (mecanismo === 'cerrojo' && !m.includes('cerrojo')) return false;
        if (mecanismo === 'bomba' && !m.includes('bombeo')) return false;
        if (mecanismo === 'revolver' && !m.includes('revólver')) return false;
        if (mecanismo === 'sobrepuesta' && !m.includes('sobrepuesta')) return false;
      }
      if (query) {
        const q = query.toLowerCase();
        if (!a.nombre.toLowerCase().includes(q) &&
        !a.marca.toLowerCase().includes(q) &&
        !a.calibre.toLowerCase().includes(q) &&
        !a.pais.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [query, tipo, avail, sucursal, calibre, uso, marca, era, precio, mecanismo]);

  const marcas = useMemo(() => Array.from(new Set(window.DB.map((a) => a.marca))).sort(), []);

  const clearAll = () => {
    setTipo('all');setAvail('all');setSucursal('all');setCalibre('all');setUso('all');
    setMarca('all');setEra('all');setPrecio('all');setMecanismo('all');
    setQuery('');
  };

  const activeCount = [tipo, avail, sucursal, calibre, uso, marca, era, precio, mecanismo].filter((v) => v !== 'all').length;

  const innerMax = { maxWidth: 1400, margin: '0 auto', width: '100%' };
  const padX = vp.isDesktop ? 28 : 14;
  const stickyTop = vp.isMobile ? 50 : 64;

  return (
    <div>
      {/* búsqueda */}
      <div style={{
        padding: `12px ${padX}px`,
        background: PALETTE.bgElev,
        borderBottom: `1px solid ${PALETTE.border}`,
        position: 'sticky', top: stickyTop, zIndex: 30
      }}>
       <div style={innerMax}>
        <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: PALETTE.bg,
            border: `1px solid ${PALETTE.border}`,
            padding: '8px 10px'
          }}>
          <span style={{ color: PALETTE.amber, fontSize: 17}}>⌕</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Nombre, marca, calibre, país..." style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: PALETTE.text,
              fontFamily: 'Courier Prime, monospace',
              fontSize: 15.5}} />
          {(query || activeCount > 0) &&
            <button onClick={clearAll} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: PALETTE.textMuted, fontSize: 17}}>✕</button>
            }
        </div>

        {/* CHIPS TIPO */}
        <div className="amx-hscroll" style={{
            display: 'flex', gap: 6, overflowX: 'auto', marginTop: 10,
            paddingBottom: 2
          }}>
          <FilterChip active={tipo === 'all'} onClick={() => setTipo('all')}>Todas</FilterChip>
          {window.CATEGORIES.tipo.map((c) =>
            <FilterChip key={c.id} active={tipo === c.id} onClick={() => setTipo(c.id)}>
              {c.label}
            </FilterChip>
            )}
        </div>

        {/* AVAIL CHIPS */}
        <div className="amx-hscroll" style={{
            display: 'flex', gap: 6, overflowX: 'auto', marginTop: 6,
            paddingBottom: 2
          }}>
          {window.CATEGORIES.disponibilidad.map((d) =>
            <FilterChip key={d.id} active={avail === d.id} onClick={() => setAvail(avail === d.id ? 'all' : d.id)}>
              {d.label}
            </FilterChip>
            )}
        </div>

        {/* SUCURSAL CHIPS (DCAM / OTCA) */}
        <div className="amx-hscroll" style={{
            display: 'flex', gap: 6, overflowX: 'auto', marginTop: 6,
            paddingBottom: 2
          }}>
          <FilterChip active={sucursal === 'all'} onClick={() => setSucursal('all')}>Toda sucursal</FilterChip>
          <FilterChip active={sucursal === 'DCAM'} onClick={() => setSucursal(sucursal === 'DCAM' ? 'all' : 'DCAM')}>◆ DCAM</FilterChip>
          <FilterChip active={sucursal === 'OTCA'} onClick={() => setSucursal(sucursal === 'OTCA' ? 'all' : 'OTCA')}>◆ OTCA</FilterChip>
        </div>

        {/* avanzados toggle */}
        <button onClick={() => setShowAdv((s) => !s)} style={{
            marginTop: 8,
            background: 'none', border: `1px dashed ${PALETTE.border}`,
            color: PALETTE.textDim,
            padding: '4px 10px',
            fontFamily: 'Courier Prime, monospace',
            fontSize: 13, letterSpacing: '0.12em',
            textTransform: 'uppercase', cursor: 'pointer',
            width: '100%'
          }}>
          {showAdv ? '▲ Cerrar filtros avanzados' : '▼ Filtros avanzados'} {activeCount > 0 && `· ${activeCount} activos`}
        </button>

        {showAdv &&
          <div style={{ marginTop: 8 }}>
            <FilterRow label="Calibre">
              <FilterChip active={calibre === 'all'} onClick={() => setCalibre('all')}>Todos</FilterChip>
              {window.CATEGORIES.calibre.map((c) =>
              <FilterChip key={c.id} active={calibre === c.id} onClick={() => setCalibre(c.id)}>{c.label}</FilterChip>
              )}
            </FilterRow>
            <FilterRow label="Función">
              <FilterChip active={uso === 'all'} onClick={() => setUso('all')}>Cualquiera</FilterChip>
              {window.CATEGORIES.uso.map((u) =>
              <FilterChip key={u.id} active={uso === u.id} onClick={() => setUso(u.id)}>{u.label}</FilterChip>
              )}
            </FilterRow>
            <FilterRow label="Marca">
              <FilterChip active={marca === 'all'} onClick={() => setMarca('all')}>Todas</FilterChip>
              {marcas.map((m) =>
              <FilterChip key={m} active={marca === m} onClick={() => setMarca(m)}>{m}</FilterChip>
              )}
            </FilterRow>
            <FilterRow label="Mecanismo">
              <FilterChip active={mecanismo === 'all'} onClick={() => setMecanismo('all')}>Todos</FilterChip>
              <FilterChip active={mecanismo === 'semi'} onClick={() => setMecanismo('semi')}>Semi-auto</FilterChip>
              <FilterChip active={mecanismo === 'cerrojo'} onClick={() => setMecanismo('cerrojo')}>Cerrojo</FilterChip>
              <FilterChip active={mecanismo === 'bomba'} onClick={() => setMecanismo('bomba')}>Bombeo</FilterChip>
              <FilterChip active={mecanismo === 'revolver'} onClick={() => setMecanismo('revolver')}>Revólver</FilterChip>
              <FilterChip active={mecanismo === 'sobrepuesta'} onClick={() => setMecanismo('sobrepuesta')}>Sobrepuesta</FilterChip>
            </FilterRow>
            <FilterRow label="Era">
              <FilterChip active={era === 'all'} onClick={() => setEra('all')}>Cualquiera</FilterChip>
              <FilterChip active={era === 'clasico'} onClick={() => setEra('clasico')}>Clásico</FilterChip>
              <FilterChip active={era === 'moderno'} onClick={() => setEra('moderno')}>Moderno</FilterChip>
              <FilterChip active={era === 'vanguardia'} onClick={() => setEra('vanguardia')}>Vanguardia</FilterChip>
            </FilterRow>
            <FilterRow label="Rango de precio">
              <FilterChip active={precio === 'all'} onClick={() => setPrecio('all')}>Todos</FilterChip>
              {[1, 2, 3, 4, 5].map((p) =>
              <FilterChip key={p} active={precio === String(p)} onClick={() => setPrecio(String(p))}>
                  {'$'.repeat(p)}
                </FilterChip>
              )}
            </FilterRow>
          </div>
          }
       </div>
      </div>

      {/* contador */}
      <div style={{
        ...innerMax,
        padding: `10px ${padX}px 6px`,
        fontFamily: 'Courier Prime, monospace',
        fontSize: 14.5, color: PALETTE.textDim,
        letterSpacing: '0.1em',
        display: 'flex', justifyContent: 'space-between'
      }}>
        <span>▸ {filtered.length} {filtered.length === 1 ? 'ARMA' : 'ARMAS'}</span>
        <span style={{ color: PALETTE.textMuted }}>{window.DB.length} TOTAL</span>
      </div>

      {/* grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: cols, gap: vp.isDesktop ? 16 : 10,
        padding: vp.isDesktop ? '6px 28px 90px' : '6px 14px 90px',
        maxWidth: 1400, margin: '0 auto', width: '100%'
      }}>
        {filtered.map((a) =>
        <ArmaCard key={a.id} arma={a}
        onClick={() => onOpenArma(a.id)}
        onCompare={() => toggleCompare(a.id)}
        inCompare={compareIds.includes(a.id)} />

        )}
        {!filtered.length &&
        <div style={{
          gridColumn: '1/-1',
          textAlign: 'center', padding: '40px 20px',
          fontFamily: 'Courier Prime, monospace',
          fontSize: 15.5, color: PALETTE.textMuted
        }}>
            <div style={{ fontSize: 38.5, color: PALETTE.border, marginBottom: 10 }}>◯</div>
            Sin resultados.<br />Ajusta los filtros.
          </div>
        }
      </div>
    </div>);

}
function FilterRow({ label, children }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{
        fontFamily: 'Courier Prime, monospace',
        fontSize: 13, color: PALETTE.textMuted,
        letterSpacing: '0.15em', textTransform: 'uppercase',
        marginBottom: 4
      }}>{label}</div>
      <div style={{ display: 'flex', gap: 5, overflowX: 'auto', flexWrap: 'wrap' }}>
        {children}
      </div>
    </div>);

}
window.CatalogScreen = CatalogScreen;