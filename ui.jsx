// Armado en México — Componentes UI compartidos
// Estética: oscuro elegante con detalles tácticos (color palette dark/amber/military)

// ── Paleta «Documento Oficial Mexicano» (DESIGN.md §2 y §5.1b) ─────────────
//
// ESTOS OBJETOS YA NO GUARDAN HEX: guardan `var(--token)`.
//
// Por qué. Hay ~1355 referencias a PALETTE/CLARO/P repartidas por los .jsx, y
// casi todas acaban como color inline dentro de un objeto `style={{}}`. Un
// modo oscuro hecho solo con CSS no alcanza a ninguna de ellas, y reescribirlas
// está descartado (DESIGN.md §2: 1238 objetos `style={{`). React pasa las
// `var()` TAL CUAL al atributo `style`, así que cambiando estos ~30 valores los
// 1355 usos heredan el tema sin tocar una sola pantalla. Precedente en el repo:
// `BottomNav` ya publica `--amx-nav-h` con `setProperty`.
//
// LOS VALORES REALES —los dos temas, con sus ratios medidos— VIVEN EN
// `estilo.css`, en el bloque `:root`. Ahí se cambian, y ahí los audita
// `node .claude/skills/fidelidad-diseno/scripts/contraste.mjs`, que lee ese
// bloque y mide LOS DOS TEMAS por separado.
//
// TRES TRAMPAS de trabajar con `var()` en vez de hex, ya resueltas:
//   1. `${color}66` (hex + alfa) produce `var(--x)66`, que es CSS inválido.
//      Para eso está `amxAlfa(color, pct)`, más abajo.
//   2. Un `var()` en un ATRIBUTO de presentación de SVG (`fill=`, `stroke=`)
//      tiene soporte irregular. En SVG va por `style={{ fill: … }}`.
//   3. Nada puede parsear el hex de un token en JS. El único sitio que lo hacía
//      —`amxTintaSobre`— tiene ahora su token dedicado (ver más abajo).
//
// El error que arrastraba la paleta original: la tarjeta daba 1.25:1 contra su
// fondo y el borde 1.23:1 contra la tarjeta — las dos señales que definen una
// tarjeta eran invisibles, y por eso el sitio se leía «cuadrado». En el tema
// CLARO eso lo resuelve la SOMBRA (ningún par de superficies claras pasa de
// ~1.2:1). En el tema OSCURO la sombra no separa —no hay luz que ocultar—, así
// que ahí lo resuelven el salto de superficie (1.54:1) y un hairline visible.
const PALETTE = {
  bg:        'var(--lienzo)',      // lienzo «papel de oficio frío» / near-black verde
  bgElev:    'var(--papel)',       // tarjeta
  bgCard:    'var(--papel)',
  bgCardGrad:'var(--papel-grad)',
  border:    'var(--hair)',        // hairline
  borderHi:  'var(--hair-hi)',     // borde/indicador que PORTA estado (WCAG 1.4.11)
  amber:     'var(--acento)',      // el acento de marca: verde oscuro en claro, verde claro en oscuro
  amberDim:  'var(--ok)',
  military:  'var(--gris-2)',
  red:       'var(--rojo)',        // relleno de CTA, con texto claro encima
  redHi:     'var(--alerta)',      // rojo como TEXTO
  green:     'var(--ok)',
  blue:      'var(--azul)',
  text:      'var(--tinta)',
  textDim:   'var(--tinta-dim)',
  textMuted: 'var(--tinta-2)',
  // Superficies de MARCA: header, nav y hero. Son verde oscuro en LOS DOS
  // temas —el verde de marca no se toca—, así que su tinta tampoco cambia.
  marca:     'var(--marca)',
  marcaAlt:  'var(--marca-alt)',
  sobreMarca:'var(--sobre-marca)',        // 10.83:1 sobre la marca, en ambos temas
  sobreMarcaDim:   'var(--sobre-marca-dim)',    // 6.79:1 — enlace inactivo
  sobreMarcaMuted: 'var(--sobre-marca-muted)',  // 5.27:1 — lo desactivado
  redSobreVerde:   'var(--rojo-sobre-marca)',   // 5.87:1 sobre la marca
  // LA TINTA QUE VA ENCIMA DE UN RELLENO DE `amber`. No es lo mismo que
  // `sobreMarca`: la superficie de marca es verde OSCURO en los dos temas, pero
  // el ACENTO se aclara en oscuro, y entonces la tinta encima tiene que
  // oscurecerse. Confundir los dos era el fallo que este token cierra: 12 CTAs
  // pintaban crema sobre un relleno que en oscuro es verde claro (1.4:1).
  tintaSobreMarca: 'var(--tinta-sobre-marca)',  // 10.83:1 claro / 9.17:1 oscuro
};
window.PALETTE = PALETTE;

// ── Tokens SOBRE SUPERFICIE DE CONTENIDO ───────────────────────────────────
// Lo que va encima de una tarjeta usa estos. Mismos tokens que PALETTE donde
// coinciden: son deliberadamente gemelos, no dos paletas distintas.
const CLARO = {
  panel:   'var(--papel)',     // tarjeta
  panelHi: 'var(--papel-hi)',  // PLACA FOTOGRÁFICA — clara en los dos temas, ver estilo.css
  zebra:   'var(--beige)',     // fila alterna — 1.17:1 en ambos, va con el hairline
  tinta:   'var(--tinta)',
  tinta2:  'var(--tinta-2)',
  hair:    'var(--hair)',      // el MISMO hairline que PALETTE.border
  // ── LA SOMBRA ────────────────────────────────────────────────────────────
  // Tres capas: contacto (2px) + media (8px) + ambiente (18px). En CLARO ese
  // escalonado es lo que lee el ojo como «una capa encima de otra» cuando el
  // color de las dos superficies solo da 1.14:1. En OSCURO ya no es quien
  // separa las capas —eso lo hace el salto de superficie— pero sigue dando el
  // contacto del canto, así que se queda, en negro y más opaca.
  // Máximo 18px de blur: §6 veta blur > 24px en listas.
  sombra:  'var(--sombra)',
  radio:   12,
  radioSm: 8,
  // Los tres colores de disponibilidad legal. Sus gemelos por superficie.
  ok:      'var(--ok)',        // 5.28:1 claro / 5.47:1 oscuro
  alerta:  'var(--alerta)',    // 5.63:1 claro / 5.26:1 oscuro
};
window.CLARO = CLARO;

// ── amxAlfa — teñir un color que puede ser un token ────────────────────────
// El idioma de siempre era `${PALETTE.amber}66`: hex + dos dígitos de alfa. Con
// `var(--acento)` eso produce `var(--acento)66`, CSS inválido, y la declaración
// entera se descarta en silencio (adiós al degradado del hero de promos).
// `color-mix` es la única forma de teñir un token sin conocer su valor. El hex
// se sigue concatenando: los datos de promos traen hex de verdad.
function amxAlfa(color, pct) {
  const c = String(color == null ? '' : color).trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(c)) {
    return c + Math.round(Math.max(0, Math.min(100, pct)) * 2.55).toString(16).padStart(2, '0');
  }
  return `color-mix(in srgb, ${c} ${pct}%, transparent)`;
}
window.amxAlfa = amxAlfa;

// ── amxTintaSobre — la tinta que se lee sobre un relleno DINÁMICO ──────────
// Decide claro/oscuro por luminancia relativa (WCAG). El pivote 0.18 es donde
// el contraste contra blanco iguala al contraste contra negro.
//
// SOLO para hex de verdad. El único relleno dinámico de la app es `p.accent`
// de los datos de promos, que es un hex editable desde el panel de admin.
// Para el relleno CONOCIDO —el acento de marca— no se calcula nada: lo resuelve
// el token `--tinta-sobre-marca`, que el CSS define bien en cada tema. Por eso
// el guard de abajo devuelve ese token y no un color fijo: si aquí llegara un
// `var(…)` (porque alguien pasó PALETTE.amber), la respuesta correcta sigue
// siendo la tinta del acento, en el tema que toque. Ningún caso queda resuelto
// por un color que solo acierta en uno de los dos temas.
function amxTintaSobre(hex) {
  const h = String(hex || '').trim();
  if (!/^#[0-9A-Fa-f]{6}$/.test(h)) return PALETTE.tintaSobreMarca;
  const lum = [1, 3, 5]
    .map((i) => {
      const v = parseInt(h.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    })
    .reduce((a, c, i) => a + [0.2126, 0.7152, 0.0722][i] * c, 0);
  // Tinta FIJA a propósito: el relleno es un hex fijo que no sigue al tema, así
  // que su tinta tampoco puede seguirlo. Son los mismos dos extremos de la
  // paleta (#171B19 / #F3EFE4), escritos aquí porque no pueden ser tokens.
  return lum > 0.18 ? '#171B19' : '#F3EFE4';
}
window.amxTintaSobre = amxTintaSobre;

// ── amxColorAvail — el color de disponibilidad legal, por superficie ───────
// Los tres colores viven en los data-*.js (`AVAIL.color`) calibrados para
// superficie CLARA; sobre fondo oscuro caen a 1.7-2.3:1. Traducirlos a su
// token es el mismo patrón que ya usaba AvailBadge con CLARO.ok / CLARO.alerta,
// resuelto una vez en lugar de en cada pantalla. Lo que no reconoce, pasa.
const AVAIL_TOKEN = {
  '#2F6B33': 'var(--ok)',         // uso civil
  '#7D6108': 'var(--seguridad)',  // policía / seguridad
  '#A3341F': 'var(--alerta)',     // exclusivo Ejército
};
function amxColorAvail(hex) {
  return AVAIL_TOKEN[String(hex || '').toUpperCase()] || hex;
}
window.amxColorAvail = amxColorAvail;

// ── EL TEMA — claro · oscuro · seguir al sistema ───────────────────────────
// El atributo `data-tema` de <html> lo pone el script inline del <head> ANTES
// del primer pintado (sin él habría fogonazo). Ausente = seguir al sistema, que
// resuelve el `@media (prefers-color-scheme: dark)` de estilo.css.
const TEMAS = ['sistema', 'claro', 'oscuro'];
const TEMA_ROTULO = { sistema: 'Automático', claro: 'Claro', oscuro: 'Oscuro' };

function amxLeerTema() {
  if (typeof document === 'undefined') return 'sistema';
  const t = document.documentElement.getAttribute('data-tema');
  return t === 'claro' || t === 'oscuro' ? t : 'sistema';
}
function amxPonerTema(t) {
  const raiz = document.documentElement;
  if (t === 'claro' || t === 'oscuro') raiz.setAttribute('data-tema', t);
  else raiz.removeAttribute('data-tema');
  // localStorage LANZA en modo privado y con almacenamiento bloqueado: el tema
  // se aplica igual, solo que no sobrevive a la recarga.
  try {
    if (t === 'sistema') localStorage.removeItem('amx-tema');
    else localStorage.setItem('amx-tema', t);
  } catch (e) { /* sin persistencia; la sesión actual sí cambia */ }
}
window.amxLeerTema = amxLeerTema;
window.amxPonerTema = amxPonerTema;

// El bisel de esquina era el otro rasgo que ataba el sitio al look HUD anterior.
// DESIGN.md §27 pide lo contrario: «border radius consistente, bordes finos,
// sombras extremadamente suaves». Se anula el recorte y el redondeo lo pone
// estilo.css sobre .amx-cut, así los 11 usos existentes pasan a esquina
// redondeada sin editarlos uno a uno — y de paso el clip-path deja de comerse
// el anillo de foco, que era un parche permanente.
const CUT_TR = 'none';
const CUT_TR_SM = 'none';
window.CUT_TR = CUT_TR;
window.CUT_TR_SM = CUT_TR_SM;

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
// LOGO MARCA — logotipo en SVG inline
// ──────────────────────────────────────────────────────────────
// logo.png es 256×256 de paleta indexada SIN canal alfa: sobre el header verde
// se ve su recuadro y NO se puede recolorear. En SVG la silueta va con
// fill="currentColor" y hereda el color de la superficie donde caiga.
// Sobre el verde de marca: silueta en --crema #F3EFE4 (10.83:1) y texto en
// #FAF9F5 (11.81:1) — el texto un punto más claro para que gane la jerarquía.
// El recuadro es marco decorativo (opacity .5): no porta información, la
// información está en la silueta y en el texto.
function LogoMarca({ size = 28, conTexto = false, src = null }) {
  const ft = Math.max(12, Math.round(size * 0.43)); // piso tipográfico 12px
  // `src` = logo subido desde el panel de admin. El SVG de marca es el de
  // fabrica; si Saulo sube uno propio manda el suyo, y asi la pestana BRANDING
  // del admin sigue teniendo efecto en vez de escribir un ajuste muerto.
  if (src) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(size * 0.32) }}>
        <img src={src} alt="Armado en México"
          style={{ height: size, width: 'auto', objectFit: 'contain', display: 'block' }} />
        {conTexto && (
          <span style={{
            fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: ft,
            letterSpacing: '0.09em', textTransform: 'uppercase',
            color: PALETTE.sobreMarca, whiteSpace: 'nowrap', lineHeight: 1.05,
          }}>Armado en México</span>
        )}
      </span>
    );
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      gap: Math.round(size * 0.34),
    }}>
      {/* El ISOTIPO REAL de la marca, no un dibujo. Aquí había una pistola en
          SVG hecha a mano —20 coordenadas inventadas dentro de un recuadro— que
          no era el logotipo de Armado en México sino un sustituto genérico.
          `imagenes/isotipo-armado.webp` sale del propio `logo-armado-mx.webp`:
          es su recuadro y su pistola, recortados del archivo original y sin las
          palabras, que ahora van al lado. Nada dibujado de nuevo — §6b manda
          usar los logotipos tal cual. */}
      <img src="imagenes/isotipo-armado.webp"
        width={size} height={size}
        style={{ display: 'block', flexShrink: 0, borderRadius: Math.round(size * 0.22) }}
        role={conTexto ? 'presentation' : 'img'}
        alt={conTexto ? '' : 'Armado en México'} />
      {conTexto && (
        <span style={{
          display: 'flex', flexDirection: 'column',
          // La tipografía del logotipo: Archivo en bold y versalitas, que es la
          // misma con la que están puestas las palabras dentro del original.
          fontFamily: 'Archivo, sans-serif', fontWeight: 700,
          fontSize: ft, lineHeight: 1.04,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          color: '#FAF9F5',                 // 11.81:1 sobre el verde de marca
          whiteSpace: 'nowrap',
        }}>
          <span>Armado en</span>
          <span>México</span>
        </span>
      )}
    </span>
  );
}
window.LogoMarca = LogoMarca;

// ──────────────────────────────────────────────────────────────
// TOP NAV — barra superior para escritorio/tablet
// ──────────────────────────────────────────────────────────────
function TopNav({ current, onNav, compareCount, onSearch }) {
  const [moreOpen, setMoreOpen] = React.useState(false);
  const moreItems = [
    { id: 'traumaticas', label: 'Armas traumáticas' },
    { id: 'calibres', label: 'Calibres' },
    // Congeladas hasta el lanzamiento: se anuncian, no se entra. Ver PLACEHOLDERS.md.
    { id: 'campos',   label: 'Campos de tiro (Próximamente)', proximamente: true },
    { id: 'experiencias', label: 'Experiencias (Próximamente)', proximamente: true },
    { id: 'soporte',  label: 'Soporte y normas' },
  ];
  const items = [
    { id: 'home',    label: 'INICIO' },
    { id: 'catalog', label: 'ARSENAL' },
    { id: 'accesorios', label: 'ACCESORIOS' },
    { id: 'compare', label: 'COMPARAR', badge: compareCount },
    { id: 'legal',   label: 'LEGALIDAD' },
    { id: 'faq',     label: 'FAQ' },
    { id: 'about',   label: 'ACERCA' },
    { id: 'menu',    label: 'MÁS', dropdown: true },
    { id: 'submit',  label: '＋ PROPONER', accent: true },
  ];
  return (
    <div className="amx-sobre-verde" style={{
      position: 'sticky', top: 0, zIndex: 50,
      height: 64,
      background: PALETTE.marca,
      borderBottom: `1px solid ${'rgba(250,249,245,.14)'}`,
      display: 'flex', alignItems: 'center',
      padding: '0 28px', gap: 24,
    }}>
      {/* El logotipo lo pinta LogoMarca en SVG: logo.png no tiene alfa y sobre
          el verde arrastraba su propio recuadro. El texto va A LA DERECHA de la
          silueta, igual que en móvil. */}
      <button onClick={() => onNav('home')} aria-label="Inicio — Armado en México" style={{
        background: 'none', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center',
        padding: 0, minHeight: 44, flexShrink: 0,
      }}>
        <LogoMarca size={34} conTexto />
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
                  fontFamily: 'Archivo, sans-serif',
                  fontSize: 14, fontWeight: 600,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: (dActive || moreOpen) ? '#DDD5C4' : PALETTE.sobreMarcaDim,
                  borderBottom: dActive ? `2px solid ${'#DDD5C4'}` : '2px solid transparent',
                  whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5,
                  transition: 'color 0.15s',
                }}>{it.label} <span style={{ fontSize: 13, transform: moreOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span></button>
                {moreOpen && (
                  <div className="amx-sobre-verde" style={{
                    position: 'absolute', top: '100%', right: 0, minWidth: 200,
                    background: PALETTE.marca,
                    border: `1px solid ${'rgba(250,249,245,.14)'}`,
                    borderTop: `2px solid ${'#DDD5C4'}`,
                    boxShadow: '0 12px 30px rgba(0,0,0,0.55)',
                    zIndex: 60, padding: 4,
                  }}>
                    {moreItems.map(mi => {
                      const miActive = current === mi.id;
                      return (
                        <button key={mi.id} disabled={mi.proximamente}
                          onClick={mi.proximamente ? undefined : () => { onNav(mi.id); setMoreOpen(false); }} style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          background: miActive ? 'rgba(221,213,196,0.10)' : 'none',
                          border: 'none', cursor: mi.proximamente ? 'default' : 'pointer', padding: '10px 12px',
                          fontFamily: 'Archivo, sans-serif', fontSize: 14, fontWeight: 600,
                          letterSpacing: '0.08em', textTransform: 'uppercase',
                          color: mi.proximamente ? PALETTE.sobreMarcaMuted : (miActive ? '#DDD5C4' : PALETTE.sobreMarca),
                          transition: 'background 0.12s, color 0.12s',
                        }}
                          onMouseEnter={e => { if (mi.proximamente) return; e.currentTarget.style.background = 'rgba(221,213,196,0.10)'; e.currentTarget.style.color = '#DDD5C4'; }}
                          onMouseLeave={e => { if (mi.proximamente) return; e.currentTarget.style.background = miActive ? 'rgba(221,213,196,0.10)' : 'transparent'; e.currentTarget.style.color = miActive ? '#DDD5C4' : PALETTE.sobreMarca; }}>
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
              background: it.accent ? (active ? '#DDD5C4' : 'transparent') : 'none',
              border: it.accent ? `1px solid ${'#DDD5C4'}` : 'none', cursor: 'pointer',
              padding: it.accent ? '8px 12px' : '8px 14px',
              fontFamily: 'Archivo, sans-serif',
              fontSize: 14, fontWeight: 600,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: active ? (it.accent ? '#000' : '#DDD5C4') : (it.accent ? '#DDD5C4' : PALETTE.sobreMarcaDim),
              borderBottom: active && !it.accent ? `2px solid ${'#DDD5C4'}` : (it.accent ? `1px solid ${'#DDD5C4'}` : '2px solid transparent'),
              position: 'relative',
              transition: 'color 0.15s',
              marginLeft: it.accent ? 8 : 0,
              whiteSpace: 'nowrap',
            }}>
              {it.label}
              {it.badge ? (
                <span style={{
                  position: 'absolute', top: 2, right: 2,
                  background: '#DDD5C4', color: '#000',
                  fontSize: 12, fontWeight: 700,
                  padding: '1px 4px', borderRadius: 8,
                  fontFamily: 'JetBrains Mono, monospace',
                  minWidth: 12, textAlign: 'center', lineHeight: 1.2,
                }}>{it.badge}</span>
              ) : null}
            </button>
          );
        })}
      </div>
      <TemaToggle />
    </div>
  );
}
window.TopNav = TopNav;

// ──────────────────────────────────────────────────────────────
// AVAILABILITY BADGE — la disponibilidad legal del arma
// ──────────────────────────────────────────────────────────────
// `claro` = va sobre una superficie crema (tarjeta). Los colores de PALETTE
// están calibrados contra el fondo verde y sobre crema caen a 1.7-2.3:1, así
// que ahí se usan las variantes oscuras de CLARO.
function AvailBadge({ avail, compact = false, claro = true }) {
  const map = claro ? {
    dcam:      { label: 'CIVIL · DCAM',   short: 'CIVIL',     color: CLARO.ok,     dot: '●' },
    externo:   { label: 'CIVIL · EXT',    short: 'CIVIL',     color: CLARO.ok,     dot: '●' },
    seguridad: { label: 'SEGURIDAD',      short: 'SEGURIDAD', color: CLARO.tinta2, dot: '◆' },
    ejercito:  { label: 'EJÉRCITO',       short: 'EJÉRCITO',  color: CLARO.alerta, dot: '▲' },
  } : {
    dcam:      { label: 'CIVIL · DCAM',   short: 'CIVIL',     color: PALETTE.green, dot: '●' },
    externo:   { label: 'CIVIL · EXT',    short: 'CIVIL',     color: PALETTE.green, dot: '●' },
    seguridad: { label: 'SEGURIDAD',      short: 'SEGURIDAD', color: PALETTE.amber,    dot: '◆' },
    ejercito:  { label: 'EJÉRCITO',       short: 'EJÉRCITO',  color: PALETTE.redHi,    dot: '▲' },
  };
  const m = map[avail] || map.dcam;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: compact ? '3px 8px' : '4px 9px',
      background: claro ? 'transparent' : 'rgba(0,0,0,0.55)',
      border: `1px solid ${claro ? CLARO.hair : m.color}`,
      borderRadius: CLARO.radioSm,
      color: m.color,
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '12px', // piso tipográfico 12px (antes 10-11px)
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      lineHeight: 1,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: compact ? '9px' : '10px' }}>{m.dot}</span>
      <span>{compact ? m.short : m.label}</span>
    </span>
  );
}
window.AvailBadge = AvailBadge;

// ──────────────────────────────────────────────────────────────
// PRICE LEVEL — escala de precio 1-5 con "$" llenos y vacíos
// ──────────────────────────────────────────────────────────────
function PriceLevel({ lvl, size = 12, claro = true }) {
  const n = Math.max(1, Math.min(5, Number(lvl) || 1));
  // Sobre crema el verde claro da 1.74:1; sobre el fondo verde el oscuro no se
  // vería. Cada superficie tiene el suyo.
  const lleno = claro ? CLARO.ok : '#6FCB7B';
  const vacio = claro ? 'rgba(47,107,51,0.28)' : 'rgba(111,203,123,0.30)';
  return (
    <span style={{
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: Math.round(size * 1.35), fontWeight: 700,
      letterSpacing: '0.08em', whiteSpace: 'nowrap', lineHeight: 1,
    }}>
      <span style={{ color: lleno }}>{'$'.repeat(n)}</span>
      <span style={{ color: vacio }}>{'$'.repeat(5 - n)}</span>
    </span>
  );
}
window.PriceLevel = PriceLevel;

// ──────────────────────────────────────────────────────────────
// ARMA CARD BODY — cuerpo estándar de ficha:
// marca + bandera · nombre (2 líneas) · calibre · legalidad · precio
// ──────────────────────────────────────────────────────────────
function ArmaCardBody({ arma }) {
  // Existencias por sucursal en la tarjeta (rediseño 2026): dato del último
  // inventario de cada sede, mismas fuentes que la ficha (solo lectura).
  const exD = window.getArmaExistencias ? window.getArmaExistencias(arma.id) : null;
  const exOReg = window.getArmaExistenciasOTCA ? window.getArmaExistenciasOTCA(arma.id) : null;
  const exO = exOReg && exOReg.qty != null ? exOReg.qty : null;
  const enStock = exD != null || exO != null;
  // precio exacto compacto: "$9,870.04 MXN" → "$9,870"
  const priceShort = (arma.priceExact || '').replace(/\.\d{2}\s*MXN\s*$/, '');
  // Resumen de la comunidad: en la tarjeta va SOLO la etiqueta. El porcentaje y
  // el conteo viven en la ficha; aquí no caben sin apretar el resto.
  const op = window.Store ? window.Store.getOpiniones('arma', arma.id) : null;
  const etRating = op ? window.amxOpinionLabel(op.up, op.down) : null;
  return (
    <div style={{ padding: '10px 12px 12px', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, minWidth: 0 }}>
        <CountryFlag pais={arma.pais} height={12} />
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13, color: CLARO.tinta2,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{arma.marca}</span>
      </div>
      <div style={{
        fontFamily: 'Archivo, sans-serif',
        fontWeight: 600, fontSize: 17,
        color: CLARO.tinta,
        textTransform: 'uppercase',
        lineHeight: 1.15,
        marginBottom: 6,
        letterSpacing: '0.02em',
        // altura fija de 2 líneas para fichas uniformes
        height: 40,
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: 2,
        overflow: 'hidden',
      }}>{arma.nombre}</div>
      {/* calibre */}
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 13,
        color: CLARO.tinta2,
        marginBottom: 8,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        <span style={{ color: CLARO.tinta2 }}>CAL </span>{arma.calibre.replace(' Parabellum','').replace('Winchester','Win')}
      </div>
      {/* existencias por sucursal (último inventario de cada sede) */}
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 12,
        color: enStock ? CLARO.ok : CLARO.alerta,
        marginBottom: 8,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {enStock
          ? <>● {exD != null && <>{exD} DCAM</>}{exD != null && exO != null && ' · '}{exO != null && <>{exO} OTCA</>}</>
          : '✕ AGOTADO'}
      </div>
      {etRating && etRating.hay &&
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 12, color: etRating.color,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          marginBottom: 8,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{etRating.label}</div>}
      {/* legalidad + precio */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px 8px', flexWrap: 'wrap', marginTop: 'auto' }}>
        <AvailBadge claro avail={arma.avail} compact />
        <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <PriceLevel claro lvl={arma.priceLvl} />
          {priceShort && <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 12, color: CLARO.tinta2, lineHeight: 1,
          }}>{priceShort}</span>}
        </span>
      </div>
    </div>
  );
}
window.ArmaCardBody = ArmaCardBody;

// ──────────────────────────────────────────────────────────────
// TACTICAL CORNERS — esquinas tipo mira para enmarcar contenido
// ──────────────────────────────────────────────────────────────
function TacticalCorners({ color = PALETTE.amber, size = 10, thickness = 1.5, all = false }) {
  // DESIGN.md §28: el HUD es un DETALLE de baja jerarquía, no la estructura.
  // Antes cada caja del sitio llevaba corchetes en las esquinas, y eso —no el
  // color— era lo que hacía que el rediseño siguiera pareciendo el diseño viejo
  // pintado de verde. Ahora no pinta nada salvo que se pida `all` a propósito,
  // para el puñado de sitios donde el marco aporta algo.
  // Los 21 usos existentes quedan neutralizados sin tocarlos uno a uno.
  if (!all) return null;
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
      {all && <span style={style('tr')}></span>}
      {all && <span style={style('bl')}></span>}
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
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 14.5, color: PALETTE.textDim,
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
          background: `linear-gradient(90deg, ${amxAlfa(color, 67)}, ${color})`,
          boxShadow: `0 0 6px ${amxAlfa(color, 33)}`,
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
        boxShadow: `0 0 6px ${amxAlfa(accent, 40)}`,
      }} />
      <div style={{
        fontFamily: 'Archivo, sans-serif',
        fontSize: 16, fontWeight: 600,
        color: PALETTE.text,
        textTransform: 'uppercase', letterSpacing: '0.13em',
      }}>{children}</div>
      <span aria-hidden="true" style={{
        flex: 1, height: 1, minWidth: 12,
        background: `linear-gradient(90deg, ${PALETTE.border}, transparent)`,
      }} />
      {action}
    </div>
  );
}
window.SectionHeader = SectionHeader;

// El enlace de acción de un SectionHeader («VER TODO», «LIMPIAR»…) se repetía a
// mano en 9 pantallas, y con el rojo equivocado según dónde cayera: PALETTE.redHi
// da 5.96:1 sobre crema pero 1.8:1 sobre el verde de marca — invisible. Una sola
// función decide el rojo por superficie.
function estiloAccion(sobreVerde) {
  return {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 14.5,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    minHeight: 44,   // área táctil mínima
    color: sobreVerde ? PALETTE.redSobreVerde : PALETTE.redHi,  // 5.87:1 / 5.96:1
  };
}
window.estiloAccion = estiloAccion;

// ──────────────────────────────────────────────────────────────
// PROSA — estilo de texto de lectura corrida
// ──────────────────────────────────────────────────────────────
// Avisos, notas, disclaimers, normas, respuestas del FAQ, la historia de un arma,
// los campos de formulario. Courier Prime va con el look táctico, pero en párrafo
// cansa y se lee mal: aquí la accesibilidad gana al estilo.
//
// Pedía 'Open Sans', que index.html NO carga: el <link> de fuentes solo trae
// Archivo y JetBrains Mono. Los 51 usos de esta receta —historia, legal, avisos,
// FAQ— caían al sans del sistema, así que la prosa del sitio no era de ninguna
// familia elegida. DESIGN.md §5.3 sustituye Open Sans por Archivo justamente;
// esto lo pone de acuerdo con la fuente que sí llega al navegador.
//
// Arreglar esta función NO bastó, y conviene saber por qué: había otros 25
// `fontFamily: 'Open Sans'` escritos a mano en screens-2/3/4, accesorios,
// municiones y tutorial, que no pasaban por aquí. Se cerraron el 7-sep-2026.
// La lección: comprobar UN archivo compilado y dar por bueno el conjunto es
// como se coló. Si vuelves a cambiar la familia de la prosa, cámbiala aquí y
// después `grep -rn "fontFamily: 'Open Sans" *.jsx` para los que se escapen.
//
// Usar la receta (`window.amxProsa({...})`) en vez de escribir la familia a
// mano es lo que evita que esto se repita.
//
// La mono NO se toca en lo que se escanea en vez de leerse: rótulos HUD en
// versalitas (§ LEGALIDAD · MX), precios, existencias, fechas, siglas y badges.
// Esa es la frontera; si dudas, pregúntate si la frase se lee o se mira.
function amxProsa(o) {
  return Object.assign({
    fontFamily: 'Archivo, system-ui, sans-serif',
    fontSize: 16, lineHeight: 1.7,
    color: PALETTE.textDim, textWrap: 'pretty',
  }, o);
}
window.amxProsa = amxProsa;

// ──────────────────────────────────────────────────────────────
// APP HEADER — barra superior con logo + acciones
// ──────────────────────────────────────────────────────────────
// `title` sigue en la firma aunque YA NO SE PINTA: lo pasan casi todas las
// pantallas desde app.jsx y quitarlo de ahí es otro lote. El título de pantalla
// vive SOLO en el cuerpo — aquí duplicaba el que ya pinta cada pantalla, y
// además nunca quedaba centrado (textAlign left/right según hubiera «volver»).
// ──────────────────────────────────────────────────────────────
// TEMA TOGGLE — claro · oscuro · seguir al sistema
// ──────────────────────────────────────────────────────────────
// Un solo botón que cicla los tres estados, no tres controles: en la barra
// superior no hay sitio para un segmentado, y la barra de escritorio ya
// desborda por debajo de ~1140px (CLAUDE.md). Este botón cuesta 44px.
//
// Los glifos son los de la app (●, ◆, ▲, ◉ ya se usan), no emoji: §6 veta el
// emoji como icono. ○ claro · ● oscuro · ◐ automático.
//
// El `aria-label` dice el estado ACTUAL y la acción SIGUIENTE, porque un botón
// que cicla no se entiende solo por su glifo. Y como el lector de pantalla no
// vuelve a leer la etiqueta de un botón que sigue enfocado, el cambio se
// anuncia por una región `aria-live`.
const TEMA_GLIFO = { sistema: '◐', claro: '○', oscuro: '●' };

function TemaToggle({ compacto = false }) {
  const [tema, setTema] = React.useState(() => (window.amxLeerTema ? window.amxLeerTema() : 'sistema'));
  // Solo para reanunciar: el primer render no debe disparar el aria-live.
  const [tocado, setTocado] = React.useState(false);
  const siguiente = TEMAS[(TEMAS.indexOf(tema) + 1) % TEMAS.length];
  const cambiar = () => {
    window.amxPonerTema(siguiente);
    setTema(siguiente);
    setTocado(true);
  };
  const etiqueta = `Tema: ${TEMA_ROTULO[tema].toLowerCase()}. Cambiar a ${TEMA_ROTULO[siguiente].toLowerCase()}`;
  return (
    <React.Fragment>
      <button type="button" onClick={cambiar} aria-label={etiqueta} title={etiqueta} style={{
        flexShrink: 0,
        minWidth: 44, minHeight: 44,            // área táctil, no negociable (§7)
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: 7,
        padding: compacto ? 0 : '0 12px',
        background: 'rgba(250,249,245,0.10)',
        border: '1px solid rgba(250,249,245,0.30)',
        borderRadius: 999,
        cursor: 'pointer',
        color: PALETTE.sobreMarca,              // 10.83:1 sobre la marca, en los dos temas
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 15, lineHeight: 1,
      }}>
        <span aria-hidden="true">{TEMA_GLIFO[tema]}</span>
        {!compacto && (
          <span aria-hidden="true" style={{
            fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700,
          }}>{TEMA_ROTULO[tema]}</span>
        )}
      </button>
      {/* Fuera de pantalla pero NO `display:none`: así lo lee el lector y no lo
          ve nadie. Sin `clip-path`, que aquí se comería nada — no es enfocable. */}
      <span aria-live="polite" style={{
        position: 'absolute', width: 1, height: 1, overflow: 'hidden',
        clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0, padding: 0, margin: -1,
      }}>{tocado ? `Tema ${TEMA_ROTULO[tema].toLowerCase()}` : ''}</span>
    </React.Fragment>
  );
}
window.TemaToggle = TemaToggle;

function AppHeader({ title, back, onBack, onHome, right }) {
  // El panel de admin (pestaña BRANDING) sigue guardando cfg.logo. Si Saulo sube
  // uno propio se respeta; si esta el 'logo.png' de fabrica, manda el SVG de
  // marca. Sin esto, el admin escribia un ajuste que ya no leia nadie.
  const cfgH = window.Store ? window.Store.getAppConfig() : null;
  const logoUsuario = cfgH && cfgH.logo && cfgH.logo !== 'logo.png' ? cfgH.logo : null;
  return (
    <div className="amx-sobre-verde" style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: PALETTE.marca,
      borderBottom: `1px solid ${'rgba(250,249,245,.14)'}`,
      display: 'flex', alignItems: 'center',
      padding: '0 14px', gap: 10,
      minHeight: 50,
      paddingTop: 'env(safe-area-inset-top)',
    }}>
      {/* Los dos lados pesan igual (flex:1 cada uno) para que la marca quede
          centrada de verdad: antes se centraba en el espacio SOBRANTE, asi que
          con la insignia SLOT presente se desplazaba a la izquierda. */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        {back && (
          <button onClick={onBack} aria-label="Volver" style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: PALETTE.sobreMarca, fontSize: 23,
            minWidth: 44, minHeight: 44, padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'JetBrains Mono, monospace',
          }}>‹</button>
        )}
      </div>

      {/* El logo ya no es excluyente con «volver»: en pantalla interna la barra
          se quedaba sin marca. Y vuelve a ser pulsable — quitado el titulo, es
          lo unico de la barra y es donde se toca para volver al inicio. */}
      <button onClick={onHome} aria-label="Inicio — Armado en México" style={{
        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        display: 'flex', alignItems: 'center', minHeight: 44, flexShrink: 0,
      }}>
        <LogoMarca size={28} conTexto={!back} src={logoUsuario} />
      </button>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
        {right}
        <TemaToggle compacto />
      </div>
    </div>
  );
}
window.AppHeader = AppHeader;

// ──────────────────────────────────────────────────────────────
// BOTTOM NAV — navegación inferior
// ──────────────────────────────────────────────────────────────
function BottomNav({ current, onNav, compareCount }) {
  const navRef = React.useRef(null);

  // La barra fija de la ficha y CompareFloat se apoyan JUSTO encima de este nav.
  // Antes ambas llevaban un `76px` a mano y el nav mide ~74 (y ya incluye el
  // safe-area en su propio padding): quedaba una rendija de 2px por la que se
  // veía pasar el contenido, y parecía la app rota. Publicamos la altura real
  // medida y que se apoyen en ella.
  React.useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const raiz = document.documentElement;
    const publicar = () => raiz.style.setProperty('--amx-nav-h', el.offsetHeight + 'px');
    publicar();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', publicar);
      return () => window.removeEventListener('resize', publicar);
    }
    const ro = new ResizeObserver(publicar);
    ro.observe(el);
    // Al desmontar (paso a escritorio) se retira: sin nav, el fallback manda.
    return () => { ro.disconnect(); raiz.style.removeProperty('--amx-nav-h'); };
  }, []);

  // Iconos SVG de trazo (1.75) — los glifos de fuente (◈▤⇄§☰) renderizan
  // distinto por plataforma; el SVG es consistente y escala limpio.
  const NavIcon = ({ id }) => {
    const paths = {
      home:    <React.Fragment><path d="M4 11.2 12 4.8l8 6.4" /><path d="M6.4 10v9h11.2v-9" /></React.Fragment>,
      catalog: <React.Fragment><circle cx="12" cy="12" r="6.4" /><path d="M12 2.8v4M12 17.2v4M2.8 12h4M17.2 12h4" /></React.Fragment>,
      compare: <path d="M6.5 8.5h11l-3.2-3.2M17.5 15.5h-11l3.2 3.2" />,
      legal:   <React.Fragment><path d="M12 3.6 18.8 6v5c0 4-2.9 6.4-6.8 7.9C8.1 17.4 5.2 15 5.2 11V6z" /><path d="m9.4 11.5 1.9 1.9 3.4-3.4" /></React.Fragment>,
      menu:    <path d="M5 7h14M5 12h14M5 17h14" />,
    };
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
        style={{ display: 'block' }}>{paths[id] || paths.menu}</svg>
    );
  };
  const items = [
    { id: 'home',    label: 'INICIO' },
    { id: 'catalog', label: 'ARSENAL' },
    { id: 'compare', label: 'COMPARAR', badge: compareCount },
    { id: 'legal',   label: 'LEGALIDAD' },
    { id: 'menu',    label: 'MÁS' },
  ];
  return (
    <div ref={navRef} style={{
      position: 'sticky', bottom: 0, zIndex: 50,
      background: PALETTE.marca,
      borderTop: `1px solid ${'rgba(250,249,245,.14)'}`,
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
            padding: '8px 4px', gap: 4, minHeight: 48,
            color: active ? '#DDD5C4' : PALETTE.sobreMarcaDim,
            position: 'relative',
          }}>
            {active && (
              <span style={{
                position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)',
                width: 18, height: 2, background: '#DDD5C4',
                boxShadow: `0 0 6px ${'#DDD5C4'}`,
              }} />
            )}
            <span style={{ lineHeight: 1, position: 'relative' }}>
              <NavIcon id={it.id} />
              {it.badge ? (
                <span style={{
                  position: 'absolute', top: -4, right: -10,
                  background: '#DDD5C4', color: '#000',
                  fontSize: 12, fontWeight: 700,
                  borderRadius: 8, padding: '1px 4px',
                  fontFamily: 'JetBrains Mono, monospace',
                  minWidth: 12, textAlign: 'center', lineHeight: 1.2,
                }}>{it.badge}</span>
              ) : null}
            </span>
            <span style={{
              fontFamily: 'Archivo, sans-serif',
              fontSize: 12, fontWeight: active ? 600 : 500,
              letterSpacing: '0.07em',
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
    // Tarjeta CLARA sobre el lienzo claro. La superficie sola da 1.14:1 —
    // invisible—, así que la definen la SOMBRA y el hairline, en ese orden
    // (§5.1b y §27: «bordes finos, sombras extremadamente suaves»). El borde
    // no es el recurso principal: sin sombra la tarjeta desaparece.
    <div onClick={onClick} className="amx-card" style={{
      position: 'relative',
      background: CLARO.panel,
      borderRadius: CLARO.radio,
      border: `1px solid ${CLARO.hair}`,
      // La sombra la pone .amx-card en estilo.css: aqui, inline, ganaria por
      // especificidad y anularia el :hover.
      cursor: 'pointer',
      overflow: 'hidden',
      height: '100%',
      display: 'flex', flexDirection: 'row',
      contentVisibility: 'auto',
      containIntrinsicSize: 'auto 170px',
    }}>
      {/* imagen · columna izquierda, sobre blanco como una ficha de producto */}
      <div style={{
        width: '42%', flexShrink: 0, alignSelf: 'stretch', minHeight: 112,
        background: CLARO.panelHi,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
        borderRight: `1px solid ${CLARO.hair}`,
        overflow: 'hidden',
      }}>
        {!imgError ? (
          <img src={arma.img} alt={arma.nombre}
            loading="lazy" decoding="async"
            onError={() => setImgError(true)}
            style={{
              maxWidth: '88%', maxHeight: '88%', objectFit: 'contain',
              
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
      </div>
      {/* compare button — sólo donde hay comparador */}
      {onCompare &&
      <button onClick={(e) => { e.stopPropagation(); onCompare(); }}
        style={{
          position: 'absolute', top: 6, right: 6, zIndex: 2,
          background: inCompare ? PALETTE.amber : 'rgba(0,0,0,0.6)',
          // Sobre el relleno de acento la tinta la decide el TEMA: en claro el
          // acento es verde oscuro, en oscuro es verde claro. El '#000' de antes
          // daba 1.69:1 ya en claro.
          color: inCompare ? PALETTE.tintaSobreMarca : PALETTE.textDim,
          border: `1px solid ${inCompare ? PALETTE.amber : PALETTE.border}`,
          padding: '2px 5px',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13, fontWeight: 700,
          cursor: 'pointer',
          letterSpacing: '0.05em',
        }}>{inCompare ? '✓' : '⇄'}</button>
      }
      {/* body — sólo: marca + bandera · nombre · calibre · legalidad · precio */}
      <ArmaCardBody arma={arma} />
    </div>
  );
}
window.ArmaCard = ArmaCard;

// ══════════════════════════════════════════════════════════════
// EL EXPEDIENTE ABIERTO — las dos primitivas de la ficha (DESIGN.md §4.3)
// «un diseño tipo analógico que dé la sensación de estar leyendo desde un
//  folder […] la foto del arma del lado izquierdo con un marco de polaroid y
//  su precio de referencia y del lado derecho la ficha técnica».
//
// La POLAROID es GEOMETRÍA, no un filtro: §4 pide que «el estilo ochentero
// esté en el lenguaje visual, no mediante filtros de imagen envejecidos».
// Lo que la hace polaroid es el faldón inferior ancho y el nombre escrito en
// él — cero sepia, cero grano, cero viñeta, cero `filter`.
//
// La piel (marco, faldón, giro, pozo, rótulo) vive en estilo.css. Aquí solo
// queda el dato y la estructura: una propiedad vive en el CSS O inline, nunca
// en los dos. Precedente de la fase 2: `.amx-card:hover { box-shadow }` estaba
// MUERTA porque las tarjetas declaraban `boxShadow` inline.
// ══════════════════════════════════════════════════════════════

// Siluetas por tipo de arma, para las 62 de 192 (32 %) que no tienen fotografía.
// Los cinco tipos que tienen silueta. La forma vive en `imagenes/silueta-*.webp`
// y se pinta como máscara (ver ArmaPolaroid), así que el color lo pone el CSS y
// sigue al tema. Aquí vivían esas cinco siluetas como cadenas SVG inyectadas con
// `dangerouslySetInnerHTML`; Saulo las descartó el 7-sep-2026 por su factura, y
// los .webp generados las sustituyen. Con ellas se va la única inyección de HTML
// que tenía la app.
const SILUETA_TIPOS = ['pistola', 'revolver', 'rifle', 'escopeta', 'carabina'];
window.SILUETA_TIPOS = SILUETA_TIPOS;

// ¿Esta arma tiene fotografía propia? `armaPlaceholder` (data.js) le asigna a
// las que no la tienen la ruta de la silueta de su tipo, así que el `src` es la
// señal y no hay que consultar el disco.
// Sigue reconociendo el `data:` URI del placeholder anterior: D1 pisa
// `window.DB` al hidratar y puede servir registros sembrados antes del cambio.
function armaSinFoto(arma) {
  if (!arma || !arma.img) return true;
  const img = String(arma.img);
  return img.slice(0, 5) === 'data:' || img.indexOf('/silueta-') >= 0;
}
window.armaSinFoto = armaSinFoto;

// ──────────────────────────────────────────────────────────────
// ARMA POLAROID — la foto del expediente, con su faldón
// Sin fotografía NO desaparece: se convierte en ficha de expediente sin
// fotografía —mismo marco, mismo faldón— con la silueta del tipo sobre el
// papel. Un expediente incompleto es una cosa que existe; un hueco gris no.
// ──────────────────────────────────────────────────────────────
function ArmaPolaroid({ arma }) {
  // El fallback cubre los dos casos: el arma que nunca tuvo foto y el .webp
  // que existe en `data.js` pero no llega (404, red caída, formato no
  // soportado). En ambos se ve lo mismo, que es lo que hace que el `alt` y el
  // fallback sigan teniendo sentido.
  const [falloCarga, setFalloCarga] = React.useState(false);
  const sinFoto = falloCarga || armaSinFoto(arma);
  // `tipo` es un enum cerrado de data.js; el respaldo cubre un dato corrupto.
  const tipoSil = SILUETA_TIPOS.indexOf(arma.tipo) >= 0 ? arma.tipo : 'pistola';
  return (
    <figure className="amx-polaroid">
      <div className="amx-polaroid-pozo">
        {sinFoto ? (
          <div className="amx-polaroid-vacia">
            {/* La silueta se pinta como MÁSCARA, no como imagen: el .webp aporta
                solo la forma (negro sobre alfa) y el color lo pone
                `background-color: var(--silueta)`, así que sigue al tema sin
                duplicar assets. 3.38:1 sobre la placa clara y 3.34:1 sobre la
                atenuada del tema oscuro — por encima del 3:1 de WCAG 1.4.11 en
                los dos. La leyenda, que sí porta información, va en
                --tinta-placa: 6.46:1 / 5.36:1.

                Sustituye a un objeto de cinco cadenas SVG inyectadas con
                `dangerouslySetInnerHTML`. Saulo las descartó por feas; de paso
                desaparece la única inyección de HTML de la app. */}
            <div className="amx-polaroid-silueta" role="img"
              aria-label={'Silueta de ' + tipoSil + '. Sin fotografía en el expediente.'}
              style={{ '--silueta-forma': `url(imagenes/silueta-${tipoSil}.webp)` }} />
            <span className="amx-polaroid-leyenda" aria-hidden="true">Sin fotografía en expediente</span>
          </div>
        ) : (
          <img src={arma.img} alt={arma.nombre} decoding="async" fetchpriority="high"
            onError={() => setFalloCarga(true)} />
        )}
      </div>
      {/* El faldón lleva lo que alguien escribiría a mano en el borde blanco de
          una copia: el nombre y, debajo, de quién es y de cuándo. Centrado,
          como se rotula una foto de verdad — no alineado al canto, que es cosa
          de una interfaz, no de un objeto.
          La bandera es ahora lo único que dice la nacionalidad del arma: la
          franja tricolor que había bajo el título se retiró porque, siendo
          mexicana, hacía parecer mexicana un arma checa o italiana. */}
      <figcaption className="amx-polaroid-pie">
        <span className="amx-polaroid-nombre">{arma.nombre}</span>
        <span className="amx-polaroid-datos">
          <CountryFlag pais={arma.pais} height={9} />
          <span>{[arma.marca, arma.pais, arma.anio].filter(Boolean).join(' · ')}</span>
        </span>
      </figcaption>
    </figure>
  );
}
window.ArmaPolaroid = ArmaPolaroid;

// ──────────────────────────────────────────────────────────────
// FICHA TÉCNICA — la columna derecha del folder
// Reusa la tabla `.specs` que ya estaba bien resuelta (zebra + hairline, `th`
// en versalitas, `td` en mono con tabular-nums). Los seis campos son los que
// pide §4.3; `mecanismo` va como prosa bajo el título y `tipo` en la pestaña
// del folder, así que aquí serían una tercera copia.
// ──────────────────────────────────────────────────────────────
function FichaTecnica({ arma }) {
  const filas = [
    ['Calibre',   arma.calibre],
    ['Capacidad', arma.capacidad],
    ['Longitud',  arma.longitud],
    ['Peso',      arma.peso],
    ['Origen',    arma.pais],
    ['Año',       arma.anio],
  ].filter(([, v]) => v != null && v !== '');
  return (
    <div className="amx-ficha">
      <div className="amx-ficha-rotulo">Ficha técnica</div>
      <div style={{ overflowX: 'auto' }}>
        {/* El rótulo es un div, no un `caption`, para que la zebra empiece en
            la primera fila de datos: el nombre accesible de la tabla lo pone
            el aria-label, que además dice de qué arma es. */}
        <table className="specs" aria-label={'Ficha técnica de ' + arma.nombre}>
          <tbody>
            {filas.map(([k, v]) => <tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
window.FichaTecnica = FichaTecnica;

// ──────────────────────────────────────────────────────────────
// SPEC ROW — fila de especificación técnica
// ──────────────────────────────────────────────────────────────
function SpecRow({ label, value, accent }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      padding: '7px 10px',
      borderBottom: `1px solid ${PALETTE.border}`,
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 15.5,
    }}>
      <span style={{
        color: PALETTE.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        fontSize: 14.5,
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
      background: 'linear-gradient(180deg, rgba(28,33,26,0.85) 0%, rgba(23,58,50,0.85) 100%)',
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
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 19, fontWeight: 700,
          color: PALETTE.amber,
          letterSpacing: 0,
        }}>{fallbackIcon || '◆'}</span>
      </div>
      {/* TEXT */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13, color: PALETTE.amber,
          textTransform: 'uppercase', letterSpacing: '0.14em',
          marginBottom: 2,
        }}>{label}</div>
        <div style={{
          fontFamily: 'Archivo, sans-serif',
          fontWeight: 600, fontSize: 16,
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
      color: active ? PALETTE.tintaSobreMarca : PALETTE.textDim,   // '#000' daba 1.69:1 sobre el verde
      border: `1px solid ${active ? PALETTE.amber : PALETTE.border}`,
      padding: '10px 12px', minHeight: 44,
      clipPath: CUT_TR_SM,
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 14.5, fontWeight: 600,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      transition: 'all 0.15s',
      display: 'inline-flex', alignItems: 'center', gap: 5,
    }}>
      {children}
      {count != null && (
        <span style={{
          fontSize: 13, opacity: 0.7,
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
      // --amx-nav-h la publica BottomNav (ya incluye el safe-area). El +8 es
      // aire deliberado: esto flota, no se solda al nav como la barra de precio.
      position: 'fixed', bottom: 'calc(var(--amx-nav-h, 74px) + 8px)', left: '50%', transform: 'translateX(-50%)',
      width: 'calc(100% - 24px)', maxWidth: 360,
      background: PALETTE.bgElev,
      border: `1px solid ${PALETTE.amber}`,
      boxShadow: `0 0 0 1px rgba(221,213,196,0.2), 0 8px 24px rgba(0,0,0,0.6)`,
      padding: '8px 12px',
      display: 'flex', alignItems: 'center', gap: 8,
      zIndex: 60,
      animation: 'slideUp 0.25s ease',
    }}>
      <span style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 14.5, color: PALETTE.amber,
        letterSpacing: '0.1em', fontWeight: 700,
      }}>⇄ {ids.length}/2</span>
      <span style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 14.5, color: PALETTE.textDim, flex: 1,
      }}>{ids.length === 1 ? 'Selecciona otra para comparar' : 'Listas para comparar'}</span>
      {ids.length === 2 && (
        <button onClick={onOpen} style={{
          background: PALETTE.amber, color: PALETTE.tintaSobreMarca, border: 'none',
          padding: '5px 10px',
          fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 13,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          cursor: 'pointer',
        }}>Ver</button>
      )}
      <button onClick={onClear} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: PALETTE.textDim, fontSize: 19, padding: 2,
      }}>✕</button>
    </div>
  );
}
window.CompareFloat = CompareFloat;


// ──────────────────────────────────────────────────────────────
// HORIZONTAL CAROUSEL — carrusel moderno: swipe táctil + arrastre con mouse + snap + flechas
// ──────────────────────────────────────────────────────────────
function HCarousel({ items, renderItem, itemWidth = 175, gap = 12, padX = 16, emptyText }) {
  const scrollerRef = React.useRef(null);
  const drag = React.useRef({ down: false, moved: false, startX: 0, startScroll: 0 });
  const [dragging, setDragging] = React.useState(false);

  if (!items || !items.length) {
    return emptyText ? (
      <div style={{
        padding: '20px 14px',
        background: PALETTE.bgElev,
        border: `1px dashed ${PALETTE.border}`,
        color: PALETTE.textMuted,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 15.5, letterSpacing: '0.04em',
        textAlign: 'center',
        margin: `0 ${padX}px`,
      }}>{emptyText}</div>
    ) : null;
  }

  const step = itemWidth + gap;

  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse') return; // táctil: scroll nativo con momentum
    const el = scrollerRef.current;
    if (!el) return;
    drag.current = { down: true, moved: false, startX: e.clientX, startScroll: el.scrollLeft };
    el.style.scrollSnapType = 'none';
  };
  const onPointerMove = (e) => {
    if (!drag.current.down) return;
    const el = scrollerRef.current;
    if (!el) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 6 && !drag.current.moved) {
      drag.current.moved = true;
      setDragging(true);
    }
    el.scrollLeft = drag.current.startScroll - dx;
  };
  const endDrag = () => {
    if (!drag.current.down) return;
    const el = scrollerRef.current;
    drag.current.down = false;
    setDragging(false);
    if (el) {
      if (drag.current.moved) {
        // asentar en la tarjeta más cercana y reactivar el snap
        const target = Math.max(0, Math.round(el.scrollLeft / step) * step);
        el.scrollTo({ left: target, behavior: 'smooth' });
        setTimeout(() => { el.style.scrollSnapType = ''; }, 360);
      } else {
        el.style.scrollSnapType = '';
      }
    }
  };
  const onClickCapture = (e) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };

  return (
    <div style={{ position: 'relative' }} className="amx-carousel">
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
          display: 'flex', gap, overflowX: 'auto', overflowY: 'hidden',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          padding: `4px ${padX}px 12px`,
          scrollPaddingLeft: padX,
          cursor: dragging ? 'grabbing' : 'grab',
          userSelect: dragging ? 'none' : undefined,
        }}>
        {items.map((it, i) => (
          <div key={it.id || i} style={{
            flex: `0 0 ${itemWidth}px`,
            width: itemWidth, minWidth: 0, overflow: 'hidden',
            scrollSnapAlign: 'start',
          }}>{renderItem(it, i)}</div>
        ))}
      </div>
    </div>
  );
}
window.HCarousel = HCarousel;

// ──────────────────────────────────────────────────────────────
// DISCLOSURE — sección desplegable (<details> nativo)
// El navegador ya da aria-expanded, teclado y estado: no hace falta ARIA
// manual ni JS de apertura. El estado local es SOLO para el estilo (borde
// ámbar y signo +/−). Estilo heredado del acordeón del FAQ.
// OJO: el <summary> lleva un <span> flex dentro, no display:flex él mismo
// (ponerlo en el summary se traga el marcador y rompe el click en Safari
// viejo). El list-style:none va en el <style> de index.html.
// ──────────────────────────────────────────────────────────────
function Disclosure({ title, eyebrow, defaultOpen = false, accent = PALETTE.amber, compact = false, children }) {
  const [open, setOpen] = React.useState(!!defaultOpen);
  // `compact` = pie de nota: sin fondo ni barrita de acento y con el título en
  // mono pequeño. El padding se compensa para no bajar de 44px de área táctil.
  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      style={{
        background: compact ? 'transparent' : PALETTE.bgCard,
        border: `1px solid ${open ? accent : PALETTE.border}`,
        transition: 'border-color 0.18s'
      }}>
      <summary style={{ padding: compact ? '11px 12px' : '12px 14px', cursor: 'pointer', listStyle: 'none' }}>
        <span style={{
          display: 'flex', alignItems: 'center', gap: compact ? 8 : 11,
          minHeight: compact ? 22 : 24 /* + padding = 44-48px de área táctil */
        }}>
          {!compact &&
            <span aria-hidden="true" style={{
              width: 3, height: 15, flexShrink: 0,
              background: open ? accent : PALETTE.borderHi,
              boxShadow: open ? `0 0 6px ${amxAlfa(accent, 40)}` : 'none',
              transition: 'background 0.18s'
            }} />}
          <span style={{ flex: 1, minWidth: 0 }}>
            {eyebrow &&
              <span style={{
                display: 'block',
                fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                color: PALETTE.textMuted, letterSpacing: '0.16em',
                textTransform: 'uppercase', marginBottom: 2
              }}>{eyebrow}</span>}
            <span style={{
              display: 'block',
              fontFamily: compact ? 'JetBrains Mono, monospace' : 'Archivo, sans-serif',
              fontWeight: compact ? 400 : 600, fontSize: compact ? 12.5 : 15,
              color: open ? accent : (compact ? PALETTE.textMuted : PALETTE.text),
              textTransform: 'uppercase',
              letterSpacing: compact ? '0.16em' : '0.11em', lineHeight: 1.25
            }}>{title}</span>
          </span>
          <span aria-hidden="true" style={{
            color: accent, fontFamily: 'JetBrains Mono, monospace',
            fontSize: compact ? 16 : 21, lineHeight: 1, flexShrink: 0, width: 14, textAlign: 'center'
          }}>{open ? '−' : '+'}</span>
        </span>
      </summary>
      <div style={{
        padding: compact ? '10px 12px 12px' : '13px 14px 15px',
        borderTop: `1px dashed ${PALETTE.border}`
      }}>{children}</div>
    </details>
  );
}
window.Disclosure = Disclosure;

// ──────────────────────────────────────────────────────────────
// PRICE CHART — historial de precios en SVG inline, sin librerías
// Los precios llegan como string ya formateado ('$10,842.09 MXN'), así que
// hay que parsearlos. Eje X en escala de TIEMPO REAL (no índice del array):
// entre dos inventarios puede haber 9 meses o 2 días y tiene que verse.
// ──────────────────────────────────────────────────────────────
function amxPrecioNum(s) {
  const n = parseFloat(String(s == null ? '' : s).replace(/[^\d.]/g, ''));
  return isFinite(n) ? n : null;
}
window.amxPrecioNum = amxPrecioNum;

function amxFechaCorta(f) {
  const d = new Date(String(f).length === 10 ? f + 'T12:00:00' : f);
  if (isNaN(d)) return String(f || '');
  return d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }).replace('.', '');
}
window.amxFechaCorta = amxFechaCorta;

function PriceChart({ history, color = PALETTE.amber, height = 150 }) {
  const uid = React.useId().replace(/:/g, '');
  const wrapRef = React.useRef(null);
  const [w, setW] = React.useState(640);

  // Medimos el contenedor para dibujar en píxeles 1:1. Sin esto habría que
  // escalar el viewBox, y eso deforma el trazo y agranda el texto en desktop.
  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const medir = () => setW(Math.max(240, el.clientWidth));
    medir();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', medir);
      return () => window.removeEventListener('resize', medir);
    }
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Parseo + deduplicado por fecha: DCAM y OTCA publican el MISMO día y
  // colisionarían en la misma X. Se queda el último registro de esa fecha.
  const pts = React.useMemo(() => {
    const porFecha = new Map();
    (history || []).forEach((h) => {
      const v = amxPrecioNum(h.price);
      const t = Date.parse(String(h.date).length === 10 ? h.date + 'T12:00:00' : h.date);
      if (v == null || isNaN(t)) return;
      porFecha.set(h.date, { v: v, t: t, price: h.price, date: h.date });
    });
    return Array.from(porFecha.values()).sort((a, b) => a.t - b.t);
  }, [history]);

  if (pts.length < 2) return null;

  // PT reserva una BANDA SUPERIOR para las etiquetas de precio y PB una banda
  // inferior para las fechas. El trazo vive entre y0 e y1, así que ningún
  // número puede quedar tapado por una línea: es imposible por construcción.
  const PL = 10, PR = 10, PT = 32, PB = 24;
  const x0 = PL, x1 = Math.max(PL + 40, w - PR);
  const y0 = PT, y1 = height - PB;
  const tMin = pts[0].t, tMax = pts[pts.length - 1].t;
  const vs = pts.map((p) => p.v);
  const vMin = Math.min.apply(null, vs), vMax = Math.max.apply(null, vs);
  // Margen del 10% para que el punto máximo no quede pegado al borde, y
  // guarda de dominio plano: hay armas con dos precios idénticos.
  const span = (vMax - vMin) || 1;
  const dMin = vMin - span * 0.1, dMax = vMax + span * 0.1;
  const px = (p) => (tMax === tMin ? x1 : x0 + ((p.t - tMin) / (tMax - tMin)) * (x1 - x0));
  const py = (p) => y1 - ((p.v - dMin) / (dMax - dMin)) * (y1 - y0);

  const xy = pts.map((p) => ({ x: px(p), y: py(p), p: p }));
  const linea = xy.map((c, i) => `${i ? 'L' : 'M'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const area = `${linea} L${xy[xy.length - 1].x.toFixed(1)},${y1} L${xy[0].x.toFixed(1)},${y1} Z`;

  // Color POR TRAMO: verde si el precio bajó entre esos dos inventarios, rojo
  // si subió. El color no es el único canal — el <desc>, el pie de la sección
  // y la lista de precios dicen lo mismo en texto (WCAG 1.4.1).
  const colorTramo = (a, b) => (b.v < a.v ? PALETTE.green : b.v > a.v ? PALETTE.redHi : PALETTE.textMuted);
  const tramos = xy.slice(1).map((c, i) => ({
    d: `M${xy[i].x.toFixed(1)},${xy[i].y.toFixed(1)} L${c.x.toFixed(1)},${c.y.toFixed(1)}`,
    color: colorTramo(xy[i].p, c.p)
  }));
  const bajadas = tramos.filter((t) => t.color === PALETTE.green).length;
  const subidas = tramos.filter((t) => t.color === PALETTE.redHi).length;

  const ini = pts[0], fin = pts[pts.length - 1];
  const deltaPct = ini.v ? ((fin.v - ini.v) / ini.v) * 100 : 0;
  const colorFin = fin.v < ini.v ? PALETTE.green : fin.v > ini.v ? PALETTE.redHi : color;
  const plural = (n, s1, s2) => `${n} ${n === 1 ? s1 : s2}`;
  const resumen = `${pts.length} registros entre ${amxFechaCorta(ini.date)} y ${amxFechaCorta(fin.date)}: ` +
    `de ${ini.price} a ${fin.price}, ${deltaPct >= 0 ? '+' : '−'}${Math.abs(deltaPct).toFixed(1)}%. ` +
    `${plural(bajadas, 'bajada', 'bajadas')} y ${plural(subidas, 'subida', 'subidas')} entre inventarios consecutivos.`;

  const MONO = 'JetBrains Mono, monospace';
  // Halo del color del fondo: cinturón por si una etiqueta se acercara al trazo.
  // paintOrder va por `style` porque es CSS, no un atributo de React.
  // Y desde que la paleta son tokens, `fill`/`stroke` van TAMBIÉN por `style`:
  // `var()` dentro de un atributo de presentación de SVG tiene soporte
  // irregular, y aquí fallaría en silencio dejando el texto en negro por
  // defecto sobre el lienzo oscuro.
  const HALO = { paintOrder: 'stroke', fontVariantNumeric: 'tabular-nums',
                 stroke: PALETTE.bg, strokeWidth: 3.5 };

  return (
    <div ref={wrapRef} style={{ width: '100%' }}>
      <svg
        width={w} height={height} viewBox={`0 0 ${w} ${height}`}
        role="img" aria-labelledby={`pcT${uid} pcD${uid}`}
        style={{ display: 'block', width: '100%', height: height }}>
        <title id={`pcT${uid}`}>Historial de precio de referencia</title>
        <desc id={`pcD${uid}`}>{resumen}</desc>
        <defs>
          {/* área NEUTRA: el color lo ponen los tramos, no el relleno */}
          <linearGradient id={`pcG${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={x0} y1={y1} x2={x1} y2={y1} style={{ stroke: PALETTE.border }} strokeWidth="1" />
        <path d={area} fill={`url(#pcG${uid})`} />
        {tramos.map((t, i) =>
          <path key={i} d={t.d} fill="none" style={{ stroke: t.color }} strokeWidth="2.5"
            strokeLinejoin="round" strokeLinecap="round" />
        )}
        {xy.map((c, i) => {
          const ext = i === 0 || i === xy.length - 1;
          // cada punto toma el color del tramo que LLEGA a él (el primero, el que sale)
          const cc = tramos[Math.max(0, i - 1)].color;
          return (
            <circle key={i} cx={c.x} cy={c.y} r={ext ? 4.5 : 3}
              style={{ fill: ext ? cc : PALETTE.bg, stroke: cc }} strokeWidth="2" />
          );
        })}
        <text x={x0} y={15} textAnchor="start"
          fontFamily={MONO} fontSize="13"
          style={{ ...HALO, fill: PALETTE.textDim }}>{String(ini.price).replace(' MXN', '')}</text>
        <text x={x1} y={15} textAnchor="end"
          fontFamily={MONO} fontSize="13" fontWeight="700"
          style={{ ...HALO, fill: colorFin }}>{String(fin.price).replace(' MXN', '')}</text>
        <text x={x0} y={height - 7} textAnchor="start"
          fontFamily={MONO} fontSize="12" letterSpacing="0.1em"
          style={{ ...HALO, fill: PALETTE.textMuted }}>{amxFechaCorta(ini.date).toUpperCase()}</text>
        <text x={x1} y={height - 7} textAnchor="end"
          fontFamily={MONO} fontSize="12" letterSpacing="0.1em"
          style={{ ...HALO, fill: PALETTE.textMuted }}>{amxFechaCorta(fin.date).toUpperCase()}</text>
      </svg>
    </div>
  );
}
window.PriceChart = PriceChart;

// ──────────────────────────────────────────────────────────────
// OPINION LABEL — resumen de la comunidad (patrón Steam)
// Ahora hay PORCENTAJE REAL de recomendaciones (up / total), así que se usan
// los cortes auténticos de Steam — verificados contra su endpoint público
// appreviews — y no el mapeo aproximado desde estrellas que hubo antes.
//
// Los umbrales de VOLUMEN sí se apartan de Steam (que pide 10 opiniones para
// etiquetar y 500 para los extremos): con el tráfico de este catálogo nada
// llegaría a 10 y la sección quedaría permanentemente muerta — es la crítica
// nº1 documentada de ese sistema. La etiqueta sale desde la PRIMERA opinión;
// lo que sigue reservado al volumen son los extremos, para que una sola
// persona no declare un arma "Extremadamente positiva".
// Recalibrar AQUÍ cuando haya volumen real.
// ──────────────────────────────────────────────────────────────
const OPINION_EXTREMO = 20;  // opiniones para desbloquear "Extremadamente…"

function amxOpinionLabel(up, down) {
  const total = (up || 0) + (down || 0);
  if (!total) return { label: 'Sin opiniones', color: PALETTE.textMuted, hay: false, pct: 0, total: 0 };
  const pct = Math.round((up / total) * 100);
  const base = { hay: true, pct: pct, total: total };
  if (pct >= 95 && total >= OPINION_EXTREMO) return { ...base, label: 'Extremadamente positivas', color: PALETTE.green };
  if (pct >= 70) return { ...base, label: 'Mayormente positivas', color: PALETTE.green };
  if (pct >= 40) return { ...base, label: 'Variadas', color: PALETTE.textDim };
  if (pct >= 20) return { ...base, label: 'Mayormente negativas', color: PALETTE.redHi };
  if (total >= OPINION_EXTREMO) return { ...base, label: 'Extremadamente negativas', color: PALETTE.redHi };
  return { ...base, label: 'Mayormente negativas', color: PALETTE.redHi };
}
window.amxOpinionLabel = amxOpinionLabel;

// Pulgar arriba / abajo en SVG de trazo, como los iconos de BottomNav. Nada de
// emoji: renderizan distinto por plataforma y son un tell de UI generada.
function ThumbIcon({ up = true, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ display: 'block', transform: up ? 'none' : 'rotate(180deg)' }}>
      <path d="M6.5 10.5h-2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h2z" />
      <path d="M6.5 10.5 11 3.2a2.2 2.2 0 0 1 2 2.6l-.8 3.4h5.3a2 2 0 0 1 2 2.4l-1.2 6a2 2 0 0 1-2 1.5H6.5z" />
    </svg>
  );
}
window.ThumbIcon = ThumbIcon;
