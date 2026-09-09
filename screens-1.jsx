// Armado en México — Pantallas principales
// Home, Catalog (categorías), Category (lista filtrada), Product (ficha), Compare

const { useState, useMemo, useEffect } = React;

// Foto hero 4:5 por categoría (preferencia: con persona o contexto, no fondo blanco).
// Copias con nombre propio: estas cinco eran la MISMA foto que la ficha de un arma
// (008 CZ P-07, 021 Ruger Wrangler, 032 CZ 600, 050 Browning Maxus, 058 Derya MR-S1).
// Al recortarles el fondo a las fichas, la portada se habría quedado con un arma
// flotando. Son fotos de escena: NO se les quita el fondo.
const CATEGORY_HEROS = {
  pistola:  'imagenes/hero-pistola.webp',   // mano sosteniendo pistola en césped
  revolver: 'imagenes/hero-revolver.webp',  // revólver Ruger
  rifle:    'imagenes/hero-rifle.webp',     // cazador apuntando en campo
  escopeta: 'imagenes/hero-escopeta.webp',  // cazador en escena invernal
  carabina: 'imagenes/hero-carabina.webp',  // tiradora con gafas, fondo negro
};
window.CATEGORY_HEROS = CATEGORY_HEROS;

// Secciones congeladas (Campos de tiro, Experiencias): cuatro tarjetas de
// relleno idénticas — llenan el ancho del carrusel sin repetir de más — y la
// etiqueta que sustituye al «Ver todos →» en la cabecera de la sección.
const PROXIMAMENTE_ITEMS = [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }];

// Fotos reales para las secciones congeladas: un «Próximamente» con cuatro
// huecos vacíos se lee como un fallo de carga. Vienen difuminadas, desaturadas
// y con el contraste bajado desde el pipeline (no con filter de CSS: estas
// tarjetas viven en un carrusel y un blur en runtime se repinta al hacer
// scroll). Pesan 3-7 KB cada una. Al reactivar la sección, estas listas se
// sustituyen por window.CAMPOS / window.CURSOS — ver PLACEHOLDERS.md.
const FOTOS_CAMPOS = [
  'imagenes/proximamente-campo-1.webp',
  'imagenes/proximamente-campo-2.webp',
  'imagenes/proximamente-campo-3.webp',
  'imagenes/proximamente-campo-4.webp',
];
const FOTOS_EXPERIENCIAS = [
  'imagenes/proximamente-exp-1.webp',
  'imagenes/proximamente-exp-2.webp',
  'imagenes/proximamente-exp-3.webp',
];
// Ocupa el sitio del «Ver todos →» pero NO es un enlace. Ahora que los enlaces
// de acción son rojos (estiloAccion), el verde de marca ya lo diferencia solo:
// se queda en PALETTE.marca —10.83:1 sobre el lienzo crema, el mismo hex que el
// antiguo PALETTE.amber— y se nombra por lo que es. Sobre superficie verde habría
// que usar PALETTE.sobreMarcaMuted, pero este tag siempre cae sobre el lienzo.
// Sin aria-hidden a propósito: «(Próximamente)» es la ÚNICA señal de que la
// sección está congelada, y ocultarla al lector de pantalla borra esa información.
function ProximamenteTag() {
  return (
    <span style={{
      // El ACENTO, no la superficie de marca: en oscuro el verde #173A32 sobre
      // el lienzo da 1.52:1 y este rótulo desaparecía. PALETTE.amber vale lo
      // mismo (#173A32) en claro y sube a la variante clara en oscuro (9.17:1).
      fontFamily: 'JetBrains Mono, monospace', fontSize: 14.5, color: PALETTE.amber,
      letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap',
      cursor: 'default',   // refuerza que no se pincha, aunque esté donde iba el enlace
    }}>(Próximamente)</span>
  );
}

// precio numérico (MXN) a partir de priceExact "$10,061.26 MXN"
const parsePrice = (a) => parseFloat(String(a && a.priceExact || '').replace(/[^\d.]/g, '')) || 0;

// ════════════════════════════════════════════════════════════════
// HOME — Mobile-first · Header + Sliders + 3 Carruseles
// ════════════════════════════════════════════════════════════════
function HomeScreen({ onNav, onOpenArma, onOpenAccesorio, onOpenMunicion }) {
  const vp = window.useViewport();
  const [promoIdx, setPromoIdx] = useState(0);
  const [homeQuery, setHomeQuery] = useState('');
  const [, forceRender] = useState(0);
  useEffect(() => window.Store && window.Store.onChange(() => forceRender((x) => x + 1)), []);

  // Promo slides (editables desde admin). Ya no se pintan en el inicio —el
  // mockup abre con buscador y arma destacada— pero el dato se conserva porque
  // el panel de admin sigue editándolo.
  const promos = useMemo(() => window.Store ? window.Store.getPromos() : [], [forceRender]);

  // Armas destacadas (DESIGN.md §5.1). La PRIMERA es fija en la CZ P-09 (id 31,
  // imagenes/077_CZ_P-09.webp): es la pieza que la portada del mockup enseña, y
  // no debe cambiar según los favoritos que tenga el visitante.
  //
  // La SEGUNDA existe desde el tablero del 8-sep-2026 —«en el sitio de
  // escritorio caben al menos dos armas destacadas para no desaprovechar el
  // espacio»— y también va fija, por el mismo motivo que la primera. El id 55
  // es provisional: se eligió para que la portada enseñe las dos caras del
  // sello (una CIVIL y una EXCLUSIVO), pero la pieza la decide Saulo y cambiarla
  // es tocar este array y nada más.
  //
  // Si un id desapareciera del catálogo se rellena con las primeras armas que
  // queden, para no dejar el hueco.
  const IDS_DESTACADAS = [31, 55];
  const destacadas = useMemo(() => {
    const db = window.DB || [];
    const elegidas = IDS_DESTACADAS
      .map((id) => db.find((a) => a.id === id))
      .filter(Boolean);
    for (const a of db) {
      if (elegidas.length >= IDS_DESTACADAS.length) break;
      if (!elegidas.includes(a)) elegidas.push(a);
    }
    return elegidas;
  }, [forceRender]);
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
      {/* 1 ▸ BUSCADOR — DESIGN.md §5. El slider promocional se retiró: el
             mockup abre con búsqueda y una pieza destacada, no con un carrusel.
             La banda verde va a TODO el ancho: queda FUERA de containerMax y el
             ancho lo limita el div de dentro. Así la curva de .amx-banda-marca
             cierra de borde a borde y el corte de color cae justo entre el
             buscador y el bloque de Arma destacada. El padding —incluido el
             inferior, mayor— lo pone la clase; por eso aquí no hay ninguno. */}
      <div className="amx-banda-marca">
        <div style={containerMax}>
          {/* Píldora de cristal. Icono, input y placeholder heredan `color:
              var(--crema)` de .amx-buscador: 10.83:1 sobre el verde plano y
              6.69:1 en el punto más claro del cristal (medido en estilo.css).
              Los <button> no heredan color, así que va explícito. */}
          <div className="amx-buscador">
            <span aria-hidden="true" style={{ fontSize: 17, lineHeight: 1 }}>⌕</span>
            <input value={homeQuery}
              onChange={(e) => setHomeQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') doHomeSearch(); }}
              placeholder="Buscar armas, calibres, marcas…"
              aria-label="Buscar armas, calibres, marcas" />
            {homeQuery &&
              <button onClick={() => setHomeQuery('')} aria-label="Limpiar búsqueda" style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: PALETTE.sobreMarca, fontSize: 16,
                width: 44, minHeight: 44, borderRadius: 999
              }}>✕</button>
            }
            <button onClick={doHomeSearch} aria-label="Buscar" style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: PALETTE.sobreMarca, fontSize: 18,
              width: 44, minHeight: 44, borderRadius: 999
            }}>⌕</button>
          </div>
        </div>
      </div>

      {/* 1.5 ▸ ARMAS DESTACADAS — DESIGN.md §5.1 y tablero del 8-sep-2026.
          Ya no es una tarjeta verde con dos botones debajo: es el mismo folder
          del resto del sitio, abierto, con las especificaciones mecanografiadas
          a la izquierda y la copia a la derecha. El rótulo «ARMA DESTACADA» que
          iba suelto sobre el lienzo ahora es la pestaña del folder, que es
          donde se rotula un expediente. */}
      {destacadas.length > 0 &&
      <div style={{ ...containerMax, padding: `16px ${PAD}px 4px` }}>
        <div className="amx-dest-lista">
          {destacadas.map((a) =>
            <window.ArmaDestacada key={a.id} arma={a}
              onOpen={() => onOpenArma(a.id)} />)}
        </div>
      </div>}

      {/* 2 ▸ Carrusel: Favoritos de Armas M&S */}
      <CarouselSection
        title={`Favoritos de ${teamName}`}
        items={favoritos}
        fallbackItems={sugerencias(0)}
        fallbackRender={renderSugerencia}
        renderItem={(a, i) =>
        <FavCard arma={a} onClick={() => onOpenArma(a.id)} />
        } />
      

      {/* 3 ▸ Carrusel: Las más visitadas */}
      <CarouselSection
        title="Las más visitadas"
        items={masVisitadas}
        fallbackItems={sugerencias(10)}
        fallbackRender={renderSugerencia}
        renderItem={(a, i) =>
        <VisitedCard arma={a} onClick={() => onOpenArma(a.id)} />
        } />
      

      {/* 5 ▸ Calibres · guía enciclopédica */}
      <CarouselSection
        title="Calibres"
        action={
        // El estilo del enlace de acción sale de estiloAccion: rojo #A3341F
        // (5.96:1 sobre el lienzo) y área táctil de 44px. Antes iba a mano en
        // PALETTE.amber, que es el VERDE de marca y no distinguía enlace de rótulo.
        <button onClick={() => onNav('calibres')} style={window.estiloAccion(false)}>Ver guía →</button>
        }
        items={(window.CALIBRES || [])}
        renderItem={(c) =>
        <CaliberMiniCard cal={c} onClick={() => onNav('calibres')} />
        } />

      {/* 8 ▸ Categorías — cartas de lotería */}
      <div style={{ ...containerMax, padding: `8px ${PAD}px 0` }}>
        <SectionHeader action={
        // Mismo enlace de acción que «Ver guía»: rojo por estiloAccion, no el
        // verde de marca.
        <button onClick={() => onNav('catalog')} style={window.estiloAccion(false)}>Ver Todas →</button>
        }>Categorías</SectionHeader>

        {/* Cinco cartas: el número de la carta es cuántas armas hay en la
            categoría y el nombre va abajo, como en la baraja. Los ids de
            `CATEGORIES.tipo` son exactamente los cinco de `SILUETA_TIPOS`, así
            que la figura sale del asset que ya existe.
            Las fotos de escena (`CATEGORY_HEROS`) no se pierden: siguen siendo
            la portada de cada categoría en el hub del arsenal. */}
        <div className="amx-loteria-mesa" style={{ marginBottom: 22 }}>
          {window.CATEGORIES.tipo.map((c) => (
            <window.CartaLoteria key={c.id}
              nombre={c.label}
              cuenta={window.DB.filter((a) => a.tipo === c.id).length}
              unidad="armas"
              forma={`imagenes/silueta-${c.id}.webp`}
              onClick={() => onNav('category', { mode: 'tipo', value: c.id })} />
          ))}
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

      {/* 9 ▸ Armas traumáticas (defensa menos letal) — al final del feed de inicio */}
      <window.HomeTraumaBanner onNav={onNav} />

      {/* 6 y 7 ▸ Campos de tiro y Experiencias — CONGELADAS hasta el lanzamiento.
          Anuncian la sección sin dejar llegar a ella: el «Ver todos →» es ahora
          una etiqueta, y las tarjetas no son window.CAMPOS/CURSOS (datos de
          relleno) sino ProximamenteCard. Para reactivarlas, ver PLACEHOLDERS.md.
          Van al FINAL del inicio: lo que todavía no existe no puede ocupar el
          sitio del catálogo real. Son autocontenidas —no leen nada del scope del
          componente— así que mover el bloque no arrastra dependencias. */}
      <CarouselSection
        title="Campos de tiro"
        action={<ProximamenteTag />}
        items={FOTOS_CAMPOS}
        renderItem={(f) => <window.ProximamenteCard img={f} />} />

      <CarouselSection
        title="Experiencias"
        action={<ProximamenteTag />}
        items={FOTOS_EXPERIENCIAS}
        renderItem={(f) => <window.ProximamenteCard img={f} />} />

      {/* 7 ▸ Disclaimer — MUDADO AL PIE (window.PieDeSitio, en ui.jsx) el
          9-sep-2026. Era un aviso de SITIO viviendo en una sola pantalla: solo
          lo veía quien entrase por la portada, y en las 322 páginas
          prerenderizadas —las que recibe el buscador— no aparecía. El texto se
          fue LITERAL, no reescrito. No lo devuelvas aquí: quedaría duplicado. */}
    </div>);

}
window.HomeScreen = HomeScreen;

// ════════════════════════════════════════════════════════════════
// CAROUSEL SECTION — sección con título + carrusel horizontal
// ════════════════════════════════════════════════════════════════
function CarouselSection({ title, items, renderItem, emptyText, action, fallbackItems, fallbackRender }) {
  const vp = window.useViewport();
  const PAD = 16;
  const usingFallback = (!items || !items.length) && fallbackItems && fallbackItems.length > 0;
  const list = usingFallback ? fallbackItems : items;
  const render = usingFallback ? (fallbackRender || renderItem) : renderItem;
  return (
    <div style={{ marginBottom: 20, maxWidth: 1280, marginLeft: 'auto', marginRight: 'auto' }}>
      <div style={{ padding: `0 ${PAD}px`, margin: '25px 0 10px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <div style={{
            fontFamily: 'Archivo, sans-serif',
            fontWeight: 700, fontSize: 21,
            color: PALETTE.text,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            flex: '1 1 auto', minWidth: 0, whiteSpace: 'nowrap'
          }}>{title}</div>
          {action}
        </div>
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
function FavCard({ arma, onClick }) {
  // El formato de tarjeta es UNO SOLO (tablero de Saulo, 8-sep-2026): aquí solo
  // se añade el distintivo. Antes esta función repetía entera la maquetación de
  // ArmaCard y declaraba un `getRating` que no usaba nadie.
  return <window.ArmaExpediente arma={arma} onClick={onClick}
    distintivo={<span className="amx-exp-distintivo">★ TOP</span>} />;
}
window.FavCard = FavCard;


function VisitedCard({ arma, onClick }) {
  // Sin distintivo: el contador de visitas se calculaba y no se pintaba.
  return <window.ArmaExpediente arma={arma} onClick={onClick} />;
}
window.VisitedCard = VisitedCard;


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
        backgroundImage: `linear-gradient(180deg, ${window.amxAlfa(bgColor, 80)} 0%, ${window.amxAlfa(bgColor, 60)} 60%, ${window.amxAlfa(bgColor, 94)} 100%), url("${p.bgImage}")`,
        backgroundSize: 'cover', backgroundPosition: 'center'
      }} />
      }
      {/* cuadrícula táctica */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(${window.amxAlfa(accent, 7)} 1px, transparent 1px), linear-gradient(90deg, ${window.amxAlfa(accent, 7)} 1px, transparent 1px)`,
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
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 14.5, color: accent,
          letterSpacing: '0.25em', textTransform: 'uppercase',
          marginBottom: 10,
          height: 18, lineHeight: '18px', // altura fija para evitar saltos
          overflow: 'hidden'
        }}>{p.eyebrow || ' '}</div>

        <div style={{
          fontFamily: 'Archivo, sans-serif',
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
          ...window.amxProsa({ fontSize: vp.isDesktop ? 18 : 16, lineHeight: 1.55 }),
          maxWidth: 560,
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
          fontFamily: 'Archivo, sans-serif', fontWeight: 700,
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
            fontFamily: 'JetBrains Mono, monospace',
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
            // El punto activo se ensancha con transform, no con `width`: animar
            // width provoca relayout de la fila en cada frame. El hueco queda
            // fijo en 20px y el inactivo se comprime a 6px con scaleX(.3).
            width: 20, height: 4,
            transform: i === idx ? 'none' : 'scaleX(0.3)',
            background: i === idx ? accent : 'rgba(255,255,255,0.25)',
            border: 'none', cursor: 'pointer',
            transition: 'transform 0.25s, background 0.25s',
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
  const [precioLo, setPrecioLo] = useState(0);
  const [precioHi, setPrecioHi] = useState(100000);
  const [mecanismo, setMecanismo] = useState('all');
  const [disponible, setDisponible] = useState(initialFilter?.mode === 'disponible' ? 'si' : 'all'); // 'all' | 'si' | 'no'

  // Conjunto filtrado por TODO excepto el precio (base para los límites dinámicos)
  const baseFiltered = useMemo(() => {
    return window.DB.filter((a) => {
      if (tipo !== 'all' && a.tipo !== tipo) return false;
      if (avail !== 'all' && a.avail !== avail) return false;
      if (sucursal !== 'all') {
        const s = window.getArmaSucursales ? window.getArmaSucursales(a.id) : { dcam: true, otca: false };
        if (sucursal === 'DCAM' && !s.dcam) return false;
        if (sucursal === 'OTCA' && !s.otca) return false;
      }
      if (disponible !== 'all') {
        const inStock = (window.getArmaExistencias && window.getArmaExistencias(a.id) != null) ||
          (window.getArmaExistenciasOTCA && window.getArmaExistenciasOTCA(a.id));
        if (disponible === 'si' && !inStock) return false;
        if (disponible === 'no' && inStock) return false;
      }
      if (calibre !== 'all' && a.calibre !== calibre) return false;
      if (uso !== 'all' && !a.uses.includes(uso)) return false;
      if (marca !== 'all' && a.marca !== marca) return false;
      if (era !== 'all' && a.era !== era) return false;
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
  }, [query, tipo, avail, sucursal, disponible, calibre, uso, marca, era, mecanismo]);

  // Límites de precio DINÁMICOS según lo filtrado; tope en $100k (mostrado como "$100k+").
  const PRICE_CAP = 100000, PRICE_STEP = 1000;
  const priceBounds = useMemo(() => {
    const ps = baseFiltered.map(parsePrice).filter((n) => n > 0);
    if (!ps.length) return { min: 0, max: PRICE_CAP, capped: true };
    let lo = Math.floor(Math.min(...ps) / PRICE_STEP) * PRICE_STEP;
    let hi = Math.ceil(Math.max(...ps) / PRICE_STEP) * PRICE_STEP;
    const capped = hi > PRICE_CAP;
    if (capped) hi = PRICE_CAP;
    if (lo > hi) lo = hi;
    if (hi <= lo) hi = lo + PRICE_STEP;
    return { min: lo, max: hi, capped: capped };
  }, [baseFiltered]);

  // Al cambiar los límites dinámicos, reajusta el rango del slider (evita rangos vacíos)
  const _pbRef = React.useRef(null);
  if (!_pbRef.current || _pbRef.current.min !== priceBounds.min || _pbRef.current.max !== priceBounds.max) {
    _pbRef.current = { min: priceBounds.min, max: priceBounds.max };
    if (precioLo !== priceBounds.min) setPrecioLo(priceBounds.min);
    if (precioHi !== priceBounds.max) setPrecioHi(priceBounds.max);
  }

  // Si el tope ($100k) está al máximo, no hay límite superior (incluye todo lo de "$100k+")
  const noUpper = priceBounds.capped && precioHi >= priceBounds.max;
  const filtered = useMemo(() => {
    return baseFiltered.filter((a) => {
      const p = parsePrice(a);
      if (p < precioLo) return false;
      if (!noUpper && p > precioHi) return false;
      return true;
    });
  }, [baseFiltered, precioLo, precioHi, noUpper]);

  const marcas = useMemo(() => Array.from(new Set(window.DB.map((a) => a.marca))).sort(), []);

  const clearAll = () => {
    setTipo('all');setAvail('all');setSucursal('all');setCalibre('all');setUso('all');
    setMarca('all');setEra('all');setPrecioLo(priceBounds.min);setPrecioHi(priceBounds.max);setMecanismo('all');setDisponible('all');
    setQuery('');
  };

  const activeCount = [tipo, avail, sucursal, disponible, calibre, uso, marca, era, mecanismo].filter((v) => v !== 'all').length + ((precioLo > priceBounds.min || precioHi < priceBounds.max) ? 1 : 0);

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
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 15.5}} />
          {(query || activeCount > 0) &&
            <button onClick={clearAll} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: PALETTE.textMuted, fontSize: 17}}>✕</button>
            }
        </div>

        {/* FILTROS PRINCIPALES — menús desplegables */}
        <div style={{
            display: 'grid',
            gridTemplateColumns: vp.isDesktop ? 'repeat(4, 1fr)' : '1fr 1fr',
            gap: 8, marginTop: 10
          }}>
          <FilterSelect label="Tipo de arma" value={tipo} onChange={setTipo}
            options={[{ value: 'all', label: 'Todas' }].concat(window.CATEGORIES.tipo.map((c) => ({ value: c.id, label: c.label })))} />
          <FilterSelect label="Calibre" value={calibre} onChange={setCalibre}
            options={[{ value: 'all', label: 'Todos' }].concat(window.CATEGORIES.calibre.map((c) => ({ value: c.id, label: c.label })))} />
          <FilterSelect label="Armería" value={sucursal} onChange={setSucursal}
            options={[{ value: 'all', label: 'Todas' }, { value: 'DCAM', label: 'DCAM · Ciudad de México' }, { value: 'OTCA', label: 'OTCA · Nuevo León' }]} />
          <FilterSelect label="Disponibilidad" value={disponible} onChange={setDisponible}
            options={[{ value: 'all', label: 'Todas' }, { value: 'si', label: 'Con existencias' }, { value: 'no', label: 'Agotadas' }]} />
        </div>

        {/* Rango de precio — barra de mínimo/máximo (estilo Amazon) */}
        <div style={{ marginTop: 12 }}>
          <PriceRange min={priceBounds.min} max={priceBounds.max} lo={precioLo} hi={precioHi} step={PRICE_STEP} capped={priceBounds.capped}
            onChange={(lo, hi) => { setPrecioLo(lo); setPrecioHi(hi); }} />
        </div>

        {/* avanzados toggle */}
        <button onClick={() => setShowAdv((s) => !s)} style={{
            marginTop: 8,
            background: 'none', border: `1px dashed ${PALETTE.border}`,
            color: PALETTE.textDim,
            padding: '4px 10px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 13, letterSpacing: '0.12em',
            textTransform: 'uppercase', cursor: 'pointer',
            width: '100%'
          }}>
          {showAdv ? '▲ Cerrar filtros avanzados' : '▼ Filtros avanzados'} {activeCount > 0 && `· ${activeCount} activos`}
        </button>

        {showAdv &&
          <div style={{
            display: 'grid',
            gridTemplateColumns: vp.isDesktop ? 'repeat(4, 1fr)' : '1fr 1fr',
            gap: 8, marginTop: 8
          }}>
            <FilterSelect label="Uso" value={uso} onChange={setUso}
              options={[{ value: 'all', label: 'Cualquiera' }].concat(window.CATEGORIES.uso.map((u) => ({ value: u.id, label: u.label })))} />
            <FilterSelect label="Clasificación legal" value={avail} onChange={setAvail}
              options={[{ value: 'all', label: 'Todas' }].concat(window.CATEGORIES.disponibilidad.map((d) => ({ value: d.id, label: d.label })))} />
            <FilterSelect label="Marca" value={marca} onChange={setMarca}
              options={[{ value: 'all', label: 'Todas' }].concat(marcas.map((m) => ({ value: m, label: m })))} />
            <FilterSelect label="Mecanismo" value={mecanismo} onChange={setMecanismo}
              options={[{ value: 'all', label: 'Todos' }, { value: 'semi', label: 'Semi-auto' }, { value: 'cerrojo', label: 'Cerrojo' }, { value: 'bomba', label: 'Bombeo' }, { value: 'revolver', label: 'Revólver' }, { value: 'sobrepuesta', label: 'Sobrepuesta' }]} />
            <FilterSelect label="Era" value={era} onChange={setEra}
              options={[{ value: 'all', label: 'Cualquiera' }, { value: 'clasico', label: 'Clásico' }, { value: 'moderno', label: 'Moderno' }, { value: 'vanguardia', label: 'Vanguardia' }]} />
          </div>
          }
       </div>
      </div>

      {/* contador */}
      <div style={{
        ...innerMax,
        padding: `10px ${padX}px 6px`,
        fontFamily: 'JetBrains Mono, monospace',
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
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 15.5, color: PALETTE.textMuted
        }}>
            <div style={{ fontSize: 38.5, color: PALETTE.border, marginBottom: 10 }}>◯</div>
            Sin resultados.<br />Ajusta los filtros.
          </div>
        }
      </div>
    </div>);

}
// Barra de rango de precio (doble manija, estilo Amazon): min–max
function PriceRange({ min, max, lo, hi, step, capped, onChange }) {
  const P = PALETTE;
  const span = max > min ? max - min : 1;
  const pct = (v) => ((Math.min(max, Math.max(min, v)) - min) / span) * 100;
  const fmt = (v) => '$' + Math.round(v).toLocaleString('es-MX');
  const hiLabel = (capped && hi >= max) ? (fmt(max) + '+') : fmt(hi);
  const loPct = pct(lo), hiPct = pct(hi);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: P.textMuted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Rango de precio</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13.5, color: P.amber }}>{fmt(lo)} — {hiLabel}</span>
      </div>
      <div style={{ position: 'relative', height: 28 }}>
        <div style={{ position: 'absolute', top: 12, left: 0, right: 0, height: 4, background: P.border }} />
        <div style={{ position: 'absolute', top: 12, left: loPct + '%', width: (hiPct - loPct) + '%', height: 4, background: P.amber }} />
        <input type="range" className="amx-price-range" min={min} max={max} step={step} value={lo} aria-label="Precio mínimo"
          onChange={(e) => { const v = Math.min(Number(e.target.value), hi - step); onChange(Math.max(min, v), hi); }} />
        <input type="range" className="amx-price-range" min={min} max={max} step={step} value={hi} aria-label="Precio máximo"
          onChange={(e) => { const v = Math.max(Number(e.target.value), lo + step); onChange(lo, Math.min(max, v)); }} />
      </div>
    </div>
  );
}
window.PriceRange = PriceRange;

// Menú desplegable de filtro (select nativo estilizado, fácil de navegar en móvil)
function FilterSelect({ label, value, onChange, options }) {
  const active = value !== 'all';
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <span style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: PALETTE.textMuted,
        letterSpacing: '0.14em', textTransform: 'uppercase',
      }}>{label}</span>
      <div style={{ position: 'relative' }}>
        <select value={value} onChange={(e) => onChange(e.target.value)} style={{
          width: '100%', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
          background: PALETTE.bg, color: active ? PALETTE.amber : PALETTE.text,
          border: `1px solid ${active ? PALETTE.amber : PALETTE.border}`,
          padding: '10px 28px 10px 10px', borderRadius: 0, cursor: 'pointer', outline: 'none',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 14, letterSpacing: '0.02em',
        }}>
          {options.map((o) => (
            <option key={String(o.value)} value={o.value} style={{ background: PALETTE.bgElev, color: PALETTE.text }}>{o.label}</option>
          ))}
        </select>
        <span aria-hidden="true" style={{
          position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)',
          pointerEvents: 'none', color: active ? PALETTE.amber : PALETTE.textMuted, fontSize: 12,
        }}>▾</span>
      </div>
    </label>
  );
}
window.FilterSelect = FilterSelect;
function FilterRow({ label, children }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
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

// ════════════════════════════════════════════════════════════════
// ARSENAL HUB — al entrar al arsenal se elige una categoría (no lista plana)
// ════════════════════════════════════════════════════════════════
// Tarjeta con foto (fondo de imagen + overlay) para el hub del arsenal
// `color` es el acento DECORATIVO de las esquinas. No sirve para el subtítulo:
// su valor por defecto era P.amber (#173A32), el mismo verde del tinte, y el
// subtítulo de DCAM —que no pasa color— quedaba invisible. Y el #4FAE5C que sí
// pasa OTCA da 2.42:1 sobre el tinte: tampoco llegaba. El texto va siempre en la
// pareja crema, y quien necesite otro tono lo pide por `subColor`, no por `color`.
function ArsenalPhotoCard({ label, sub, img, color, subColor, onClick }) {
  const P = PALETTE;
  const [err, setErr] = useState(false);
  const showImg = img && !err;
  const ac = color || P.amber;
  return (
    <button onClick={onClick} style={{
      background: P.bgCard, border: `1px solid ${P.border}`, boxShadow: window.CLARO.sombra, padding: 0, cursor: 'pointer',
      textAlign: 'left', position: 'relative', overflow: 'hidden', display: 'block', width: '100%',
      transition: 'border-color 0.18s',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = P.amber; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = P.border; }}>
      <div style={{ width: '100%', aspectRatio: '4 / 5', position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${P.bgElev} 0%, ${P.bg} 100%)` }}>
        {showImg
          ? <img src={img} alt={label} loading="lazy" onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', filter: 'contrast(1.06) saturate(0.92) brightness(0.92)', display: 'block' }} />
          : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: P.borderHi, fontSize: 30 }}>▦</div>}
        {/* 0.94 tapaba la foto entera. A 0.78 se ve la armería y el texto claro
            de abajo sigue midiendo por encima de 4.5:1 (ver comentario del bloque). */}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(23,58,50,0.05) 0%, rgba(23,58,50,0.42) 55%, rgba(23,58,50,0.78) 100%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 6, left: 6, width: 10, height: 10, borderTop: `1.5px solid ${ac}`, borderLeft: `1.5px solid ${ac}`, opacity: 0.8 }} />
        <div style={{ position: 'absolute', bottom: 6, right: 6, width: 10, height: 10, borderBottom: `1.5px solid ${ac}`, borderRight: `1.5px solid ${ac}`, opacity: 0.8 }} />
        {/* Medido contra el peor fondo: foto blanca (tope 235 tras brightness .92)
            bajo el tinte 0.78 → compone #46615B. #F3EFE4 da 5.86:1 y #DDD5C4 da
            4.61:1. Fuera los textShadow negros: eran el parche del texto oscuro. */}
        <div style={{ position: 'absolute', left: 10, right: 10, bottom: 10 }}>
          <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 16, color: P.sobreMarca, textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.05 }}>{label}</div>
          {sub && <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: subColor || '#DDD5C4', marginTop: 3, letterSpacing: '0.08em' }}>{sub}</div>}
          {/* Mismo caso: este aviso también cae bajo el tinte (el overlay se pinta
              aunque no haya foto). P.textMuted #59605C daba ~1.1:1 ahí. */}
          {!showImg && img && <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#DDD5C4', marginTop: 2 }}>foto pendiente</div>}
        </div>
      </div>
    </button>
  );
}
window.ArsenalPhotoCard = ArsenalPhotoCard;

function ArsenalHubScreen({ onNav }) {
  const vp = window.useViewport();
  const P = PALETTE;
  const DB = window.DB || [];
  const PAD = vp.isDesktop ? 28 : 16;
  const max = { maxWidth: 1100, margin: '0 auto', width: '100%' };
  const HEROS = window.CATEGORY_HEROS || {};

  const tipoCount = (id) => DB.filter((a) => a.tipo === id).length;
  const usoCount = (id) => DB.filter((a) => a.uses.includes(id)).length;
  const availCount = (id) => DB.filter((a) => a.avail === id).length;
  const dispCount = DB.filter((a) =>
    (window.getArmaExistencias && window.getArmaExistencias(a.id) != null) ||
    (window.getArmaExistenciasOTCA && window.getArmaExistenciasOTCA(a.id))).length;

  const grid = (cols) => ({ display: 'grid', gridTemplateColumns: vp.isDesktop ? `repeat(${cols},1fr)` : '1fr 1fr', gap: 8, marginBottom: 4 });
  const Hdr = ({ icon, children }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: P.amber,
      letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600, margin: '22px 0 8px',
    }}>
      <span>{icon} {children}</span>
      <span aria-hidden="true" style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${P.border}, transparent)` }} />
    </div>
  );
  // `borde`: hairline COMPLETO en el color de la categoria, no barra lateral
  // (DESIGN.md §5.4). Por defecto, el hairline neutro de siempre.
  const Card = ({ label, sub, count, color, borde, onClick }) => (
    <button onClick={onClick} style={{
      background: P.bgCard, border: `1px solid ${borde || P.border}`, boxShadow: window.CLARO.sombra,
      padding: '12px 14px', cursor: 'pointer', textAlign: 'left', display: 'flex',
      justifyContent: 'space-between', alignItems: 'center', gap: 10, width: '100%', transition: 'border-color 0.18s',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = P.amber; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = borde || P.border; }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 15, color: P.text, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
        {sub && <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, color: P.textMuted, marginTop: 2, lineHeight: 1.4 }}>{sub}</div>}
      </div>
      <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 18, color: color || P.amber, flexShrink: 0 }}>{count}</div>
    </button>
  );

  return (
    <div style={{ ...max, padding: `8px ${PAD}px 90px` }}>
      {/* Único encabezado de la pantalla: el header móvil ya no pinta título y
          TopNav tampoco en escritorio. No se borra; en móvil se centra para que
          ocupe el sitio del título que había en la barra. */}
      <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 22, color: P.text, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '12px 0 2px', textAlign: vp.isMobile ? 'center' : 'left' }}>Arsenal</div>
      <div style={window.amxProsa({ fontSize: 15, color: P.textDim, lineHeight: 1.5 })}>Explora {DB.length} armas por categoría. Elige un grupo para ver el listado.</div>

      <Hdr icon="◆">Armería</Hdr>
      <div style={grid(2)}>
        {/* Fotos reales de las dos sedes (31-ago-2026). Son 680x382 y 680x510, y la
            tarjeta es 4:5 con cover: el recorte efectivo queda en 305x382 y 408x510,
            por debajo del minimo de 640x800 de PLACEHOLDERS.md. Se nota en pantalla
            retina. Entran igual mientras el objetivo sea quitar placeholders; hay que
            resustituirlas cuando haya foto vertical de cada sede. */}
        <ArsenalPhotoCard label="DCAM" sub="Ciudad de México" img="imagenes/armeria-dcam.webp" onClick={() => onNav('category', { mode: 'sucursal', value: 'DCAM' })} />
        <ArsenalPhotoCard label="OTCA" sub="Nuevo León" color="#4FAE5C" img="imagenes/armeria-otca.webp" onClick={() => onNav('category', { mode: 'sucursal', value: 'OTCA' })} />
      </div>

      <Hdr icon="●">Disponibilidad</Hdr>
      <div style={grid(1)}>
        <Card label="Disponibles actualmente" sub="En existencia en el último inventario de su sucursal" color={window.CLARO.ok} count={dispCount} onClick={() => onNav('category', { mode: 'disponible', value: 'si' })} />
      </div>

      {/* Clasificación legal — venia del Home («Por disponibilidad legal»). Va
          pegada a Disponibilidad porque las dos responden a lo mismo, «¿puedo
          conseguirla?»: una por existencias, la otra por ley. Antes dos de las
          tres categorias («Seguridad privada» y «Exclusivo del Ejército») colgaban
          de Uso con este mismo mode:'avail'; se retiraron de alli para no dejar
          dos puertas al mismo filtro, y Uso se queda solo con usos reales.
          El color de la categoria (data.js) va en el hairline completo y en el
          contador, como en el Home y como manda DESIGN.md §5.4. */}
      <Hdr icon="§">Clasificación legal</Hdr>
      <div style={{ ...grid(3), gridTemplateColumns: vp.isDesktop ? 'repeat(3,1fr)' : '1fr' }}>
        {window.CATEGORIES.disponibilidad.map((d) => availCount(d.id)
          ? <Card key={d.id} label={d.label} sub={d.desc}
              color={window.amxColorAvail(d.color)} borde={window.amxColorAvail(d.color)}
              count={availCount(d.id)} onClick={() => onNav('category', { mode: 'avail', value: d.id })} />
          : null)}
      </div>

      <Hdr icon="◢">Tipo de arma</Hdr>
      <div style={grid(5)}>
        {window.CATEGORIES.tipo.map((c) => tipoCount(c.id)
          ? <ArsenalPhotoCard key={c.id} label={c.label} img={HEROS[c.id]} onClick={() => onNav('category', { mode: 'tipo', value: c.id })} />
          : null)}
      </div>

      <Hdr icon="☆">Uso</Hdr>
      <div style={grid(3)}>
        <Card label="Tiro deportivo" sub="Clubes y polígonos" count={usoCount('club')} onClick={() => onNav('category', { mode: 'uso', value: 'club' })} />
        <Card label="Cacería" sub="Caza mayor y menor" count={usoCount('caza')} onClick={() => onNav('category', { mode: 'uso', value: 'caza' })} />
        <Card label="Defensa del hogar" sub="Uso en domicilio" count={usoCount('domicilio')} onClick={() => onNav('category', { mode: 'uso', value: 'domicilio' })} />
      </div>

      <Hdr icon="◈">Calibre</Hdr>
      <div style={grid(4)}>
        {window.CATEGORIES.calibre.map((c) => {
          const n = DB.filter((a) => a.calibre === c.id).length;
          return n ? <Card key={c.id} label={c.label} count={n} onClick={() => onNav('category', { mode: 'calibre', value: c.id })} /> : null;
        })}
      </div>

      <button onClick={() => onNav('category', { mode: 'all' })} style={{
        marginTop: 18, background: 'none', border: `1px dashed ${P.border}`, color: P.textDim,
        padding: '11px', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, letterSpacing: '0.12em',
        textTransform: 'uppercase', cursor: 'pointer', width: '100%',
      }}>▤ Ver todas las armas ({DB.length})</button>
    </div>
  );
}
window.ArsenalHubScreen = ArsenalHubScreen;