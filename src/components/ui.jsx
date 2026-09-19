// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

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
// `isMobile` decide el armazón (cabecera y barra inferior de móvil) y corta en
// 1024, como la ficha: por debajo, la barra superior no cabía y daba scroll
// horizontal a todo el sitio (necesitaba 1150 px; 15-sep-2026). Las rejillas
// siguen repartiéndose con `isTablet`/`isDesktop` y sus cortes de 720 y 900.
function amxMedirViewport(w) {
  return { width: w, isMobile: w < 1024, isTablet: w >= 720 && w < 900, isDesktop: w >= 900 };
}

function useViewport() {
  const [vp, setVp] = React.useState(() => amxMedirViewport(typeof window !== 'undefined' ? window.innerWidth : 1024));
  React.useEffect(() => {
    function onR() {
      setVp(amxMedirViewport(window.innerWidth));
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
// TOP NAV — barra superior para escritorio (desde 1024 px)
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
                  padding: '8px 8px',
                  fontFamily: 'Archivo, sans-serif',
                  fontSize: 14, fontWeight: 600,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
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
              background: 'none',
              border: 'none', cursor: 'pointer',
              // Compacta (antes 14 px y .12em): así los ocho botones caben
              // desde 1009 px, por debajo del corte de 1024 donde empieza esta barra.
              padding: '8px 8px',
              fontFamily: 'Archivo, sans-serif',
              fontSize: 14, fontWeight: 600,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              color: active ? '#DDD5C4' : PALETTE.sobreMarcaDim,
              borderBottom: active ? `2px solid ${'#DDD5C4'}` : '2px solid transparent',
              position: 'relative',
              transition: 'color 0.15s',
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
// TEMA TOGGLE — sol en oscuro, luna en claro
// ──────────────────────────────────────────────────────────────
// Referencia de Saulo (12-sep-2026, PureRef «Modo Claro Oscuro»): solo icono,
// sin píldora ni rótulo, en tinta apagada y verde al pasar. Antes era una
// píldora que ciclaba tres estados con el rótulo «AUTOMÁTICO» y pesaba más que
// los enlaces de la barra.
//
// Dos estados, como el selector del tutorial: el icono enseña el modo al que
// vas (sol = pasar a claro). Sin elección guardada se sigue al sistema, y el
// botón resuelve cuál es para no pedir «oscuro» estando ya en oscuro.
//
// El tema se lee del DOM en cada render, no de un estado propio: el tutorial
// también lo cambia y un estado copiado se quedaría atrás.
function TemaToggle() {
  const [, repintar] = React.useReducer(n => n + 1, 0);
  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  React.useEffect(() => {
    if (!mq || !mq.addEventListener) return;
    mq.addEventListener('change', repintar);
    return () => mq.removeEventListener('change', repintar);
  }, []);
  const t = amxLeerTema();
  const oscuro = t === 'oscuro' || (t === 'sistema' && !!(mq && mq.matches));
  const cambiar = () => { amxPonerTema(oscuro ? 'claro' : 'oscuro'); repintar(); };
  // `aria-pressed` y no una etiqueta que cambia: el lector anuncia solo el
  // cambio de estado de un botón enfocado (precedente: `.tut-tema`).
  return (
    <button type="button" className="amx-tema" onClick={cambiar}
      aria-label="Modo oscuro" aria-pressed={oscuro}
      title={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        {oscuro ? (
          <g fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <circle cx="12" cy="12" r="4" fill="currentColor" />
            <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
          </g>
        ) : (
          <path fill="currentColor" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        )}
      </svg>
    </button>
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
          centrada de verdad: antes se centraba en el espacio SOBRANTE, no en
          el ancho total. */}
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
        <TemaToggle />
      </div>
    </div>
  );
}
window.AppHeader = AppHeader;

// ──────────────────────────────────────────────────────────────
// BOTTOM NAV — navegación inferior
// ──────────────────────────────────────────────────────────────
function BottomNav({ current, onNav, compareCount, visible = true }) {
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
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      background: PALETTE.marca,
      borderTop: `1px solid ${'rgba(250,249,245,.14)'}`,
      display: 'flex',
      padding: '6px 4px 10px',
      paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
      transform: visible ? 'translateY(0)' : 'translateY(100%)',
      transition: 'transform .28s ease',
    }}>
      {items.map(it => {
        const active = current === it.id;
        return (
          <button key={it.id} onClick={() => onNav(it.id)} style={{
            flex: 1, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '8px 2px', gap: 4, minHeight: 48,
            color: active ? '#FAF9F5' : PALETTE.sobreMarcaDim,
            position: 'relative',
          }}>
            {active && (
              <span style={{
                position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)',
                width: 24, height: 2.5, borderRadius: 1,
                background: '#FAF9F5',
                boxShadow: '0 0 8px rgba(250,249,245,.6)',
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
              fontSize: 11, fontWeight: active ? 600 : 500,
              letterSpacing: '0.06em',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              maxWidth: '100%',
            }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}
window.BottomNav = BottomNav;

// ══════════════════════════════════════════════════════════════
// PIE DE OFICIO — el pie de página del sitio
//
// La ESTRUCTURA sale de canirun.ai (§4.1 de DESIGN.md): tres estratos de más a
// menos peso — crédito + GitHub · procedencia de los datos · marcas registradas.
// La estética no: aquí el pie es el reverso del membrete.
//
// POR QUÉ VA SOBRE LA BANDA DE MARCA y no sobre el lienzo. El pie es casi todo
// letra chica, y la letra chica es justo donde se cae el contraste: entre dos
// claros no queda margen. `--marca` (#173A32) es IDÉNTICA en los dos temas, y
// con ella vienen sus tres tintas ya medidas y estables —10.83:1, 6.79:1 y
// 5.27:1— sin un solo par nuevo que auditar en oscuro. De paso el documento
// queda encuadernado: banda verde arriba (AppHeader/TopNav), el expediente
// claro en medio, banda verde abajo.
//
// ── REVISIÓN DE SAULO, 9-sep-2026 — lo que pidió quitar y por qué consta aquí:
//   · CENTRADO. DESIGN.md §6 dice «❌ todo centrado»; Saulo lo pidió centrado
//     expresamente y manda él. Queda anotado para que nadie lo «arregle» luego
//     citando la §6.
//   · Fuera el cintillo «◆ FIN DEL EXPEDIENTE / ARMADO.MX» y su regla.
//   · El AVISO se queda en el pie, pero SIN el recuadro punteado y SIN el
//     rótulo «◆ Aviso»: solo el texto, y colocado DEBAJO del crédito. Hubo
//     antes un ida y vuelta sobre si volvía al Home — no vuelve. Este pie es
//     su ÚNICO sitio: en screens-1.jsx el bloque «7 ▸ Disclaimer» quedó como
//     comentario a propósito. Si algún día se toca, que se mueva, no que se
//     duplique.
//   · Fuera la línea «Código abierto: …». La transparencia la dice el enlace.
//   · La línea de crédito la dictó Saulo palabra por palabra: «Construido por
//     saulo-fl y Armas M&S para la comunidad de tiradores de México». No es
//     paráfrasis: «tiradores», no «armera», y el usuario de GitHub, no el
//     nombre. Sin corazón: lo llevó un rato y lo quitó.
//   · El enlace al repo, minimalista: icono + «GitHub», como canirun.ai. Sin
//     recuadro. Conserva 44px de alto de área táctil sin pintar borde ni fondo
//     (§7 no negocia el objetivo táctil, y no hace falta un botón para tenerlo).
//   · (DEJADO SIN EFECTO el 11-sep-2026, ver abajo) El 9-sep los enlaces no se
//     marcaban en reposo: ni subrayado ni cursiva, «lo único que los distingue
//     es que se iluminan al hacer hover». Hubo dos pasadas antes —una con
//     subrayado, otra con cursiva en FUENTES— y Saulo retiró las dos viendo el
//     pie renderizado. La cursiva sigue fuera.
//
// ── REVISIÓN DE SAULO, 11-sep-2026 — LOS ENLACES DE TEXTO SÍ SE MARCAN:
//   · Literal, dejado con una captura del pie: «Tenías razón respecto a la
//     necesidad de resaltar de alguna forma las palabras que tienen enlace.
//     Hazlo con un subrayado ligero y un tono un poco más claro que el resto
//     del texto de cada oración».
//   · Alcance, preguntado ese mismo día: se marcan LOS SEIS enlaces de texto
//     —saulo-fl, Armas M&S, las dos leyes, los inventarios DCAM y OTCA y la
//     guía de calibres— y «GitHub» (icono + palabra) se queda como estaba,
//     sin subrayado ni cambio de tono.
//   · «De cada oración»: cada enlace se aclara respecto a la tinta de SU
//     párrafo (crema en crédito y aviso, `sobreMarcaDim` en FUENTES), no hacia
//     un color único. La regla y sus ratios, en «PIE DE OFICIO» de estilo.css.
//   · El rojo del hover es #CE1126, el de la bandera de México: los rojos de
//     la paleta le parecieron «desabridos y sin saturación». Da 2.21:1 sobre
//     el verde del pie —no llega ni al 3:1 de un indicador— y queda puesto por
//     instrucción expresa con el número delante. El razonamiento entero, los
//     cuatro ratios y las alternativas que sí medirían están en el bloque
//     «PIE DE OFICIO» al final de estilo.css. NO lo cambies por tu cuenta.
//
//     Toda la piel de los enlaces vive en ese bloque de CSS: `:hover` y
//     `:focus-visible` no existen en un `style={{}}`, y es lo único del pie
//     que no cabe inline.
//
// El anillo de foco lo resuelve `.amx-sobre-verde` (estilo.css): sobre el verde
// el anillo rojo por defecto da 2.40:1, y esa clase lo pasa a crema (10.83:1).
// El rojo del hover se SUMA al anillo, no lo sustituye: quien navega con
// teclado sigue viendo dónde está.
// ══════════════════════════════════════════════════════════════

// Público al lanzamiento. A 9-sep-2026 el repo es PRIVADO y el enlace da 404 a
// cualquiera que no sea Saulo. O se publica el repo, o se quita esta constante.
const AMX_REPO = 'https://github.com/saulo-fl/armado-en-mexico';
const AMX_PERFIL = 'https://github.com/saulo-fl';
const AMX_LICENCIA = AMX_REPO + '/blob/main/LICENSE';
const AMX_TIENDA = 'https://armasmys.com/';

// Hubo un corazón de matriz de puntos en la línea de crédito —el guiño al ♥ de
// canirun.ai— y Saulo lo quitó el 9-sep-2026. Se borra en vez de dejarlo
// colgando sin usar: código muerto que nadie sabe si puede tocar.

// La marca de GitHub, en SVG inline. El sitio no carga recursos externos y un
// icono servido por CDN sería el primero.
function IconoGitHub({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true"
      style={{ fill: 'currentColor', display: 'block', flex: 'none' }}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
window.IconoGitHub = IconoGitHub;

function PieDeSitio({ onNav }) {
  const vp = window.useViewport();
  const padX = vp.isDesktop ? 28 : 16;

  // Rótulo mono en versalitas: el idioma de los cintillos del sitio
  // («◆ AVISO», «◆ ACERCA DE», «▲ AVISO DE TRANSPARENCIA»).
  const rotulo = (extra) => Object.assign({
    fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
    letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700,
  }, extra);

  // LOS SIETE ENLACES DEL PIE llevan `amx-pie-enlace` y NADA de color ni de
  // decoración inline: esa piel vive en el bloque del pie al final de
  // estilo.css —donde sí existen `:hover` y `:focus-visible`— y una propiedad
  // vive en un sitio o en el otro, nunca en los dos (DESIGN.md §8.3).
  // Los SEIS de texto —los que pintan Interno y Externo— llevan además
  // `amx-pie-enlace-texto`: en reposo se aclaran sobre la tinta de su estrato
  // y llevan un subrayado ligero (Saulo, 11-sep-2026). GitHub no la lleva.
  // En hover y en foco los siete se pintan del rojo de la bandera. Los ratios
  // están anotados en ese bloque de CSS, con lo que cuesta el que no mide.

  // Enlace INTERNO: href de verdad —lo sigue el crawler, y el «abrir en pestaña
  // nueva» del usuario— más la navegación del router al hacer clic.
  const Interno = ({ a, tab, children }) => (
    <a className="amx-pie-enlace amx-pie-enlace-texto" href={a} onClick={(e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      e.preventDefault(); onNav && onNav(tab);
    }}>{children}</a>
  );

  const Externo = ({ a, etiqueta, children }) => (
    <a className="amx-pie-enlace amx-pie-enlace-texto" href={a} target="_blank" rel="noopener noreferrer"
      aria-label={etiqueta}>{children}</a>
  );

  return (
    // `amx-pie-sitio` es la seña del pie para quien lo busca desde fuera (el talón
    // fijo de la ficha): hay otros <footer> en la página, como el de cada opinión.
    <footer className="amx-sobre-verde amx-pie-sitio" style={{ marginTop: 32 }}>
      {/* Línea tricolor — DESIGN.md §6b la autoriza expresamente («líneas
          tricolor»), y es lo único mexicano que se puede usar sin caer en
          iconografía oficial. Va SOBRE el lienzo claro, no dentro de la banda:
          el segmento verde sobre verde no se vería y la regla parecería rota. */}
      <div aria-hidden="true" style={{ display: 'flex', height: 3 }}>
        <span style={{ flex: 1, background: '#0F6B47' }} />
        <span style={{ flex: 1, background: 'var(--crema)' }} />
        <span style={{ flex: 1, background: 'var(--rojo)' }} />
      </div>

      <div style={{
        background: PALETTE.marca,
        color: PALETTE.sobreMarca,
        // El hueco de abajo respeta --amx-nav-h, que publica BottomNav
        // midiéndose y ya incluye el safe-area. En escritorio el nav se
        // desmonta y retira la propiedad, así que cae al 0px del fallback. Con
        // eso el último renglón libra también la barra fija de la ficha, que se
        // apoya en esa misma variable.
        padding: `24px ${padX}px calc(24px + var(--amx-nav-h, 0px))`,
      }}>
        {/* Centrado por orden expresa de Saulo (revisión del 9-sep-2026). Un
            solo `textAlign` en el contenedor y lo heredan los tres estratos: no
            hace falta repetirlo en cada bloque. Los bloques con ancho de medida
            —el aviso y la letra chica— se centran con `margin: 0 auto`. */}
        <div style={{ maxWidth: 1280, margin: '0 auto', textAlign: 'center' }}>

          {/* ── EL LOGOTIPO ────────────────────────────────────────
              «Añade el logo al pie de página para darle más identidad» (Saulo,
              9-sep-2026), con referencia exacta: DENTRO de la banda verde,
              arriba y centrado. Nada de placa ni de recuadro: el isotipo ya
              trae el suyo, que es claro con la pistola oscura, y las palabras
              van al lado en el crema de la marca — el mismo logotipo del
              header, sin inventar una variante para el pie.

              Antes estuvo montado en una placa crema a caballo del canto: no
              era lo pedido. Queda anotado para que no vuelva. */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 26 }}>
            <LogoMarca size={38} conTexto />
          </div>

          {/* ── 1 ▸ CRÉDITO + GITHUB — el estrato de más peso ──────────────────
              Un solo párrafo que envuelve, con el corazón y el enlace al final,
              como en canirun.ai. El texto de la línea es el que dictó Saulo,
              palabra por palabra. */}
          <div style={window.amxProsa({
            fontSize: 17, color: PALETTE.sobreMarca, lineHeight: 1.6, marginBottom: 14,
          })}>
            Construido por <Externo a={AMX_PERFIL} etiqueta="Perfil de saulo-fl en GitHub (se abre en una pestaña nueva)">saulo-fl</Externo>
            {' '}y <Externo a={AMX_TIENDA} etiqueta="Tienda Armas M&S, armasmys.com (se abre en una pestaña nueva)">Armas M&amp;S</Externo>
            {' '}para la comunidad de tiradores de México
            <span aria-hidden="true" style={{ margin: '0 8px', color: PALETTE.sobreMarcaMuted }}>·</span>
            {/* Minimalista: icono + «GitHub», sin recuadro. El padding con
                margen negativo le da los 44px de área táctil que pide §7 sin
                alterar la altura de la línea ni pintar un botón.
                El icono pinta con `fill: currentColor`, así que se pone rojo
                junto al texto en hover y en foco, sin una regla propia.
                SIN `amx-pie-enlace-texto` a propósito: en reposo no se subraya
                ni se aclara (Saulo, 11-sep-2026). */}
            <a className="amx-pie-enlace" href={AMX_REPO} target="_blank" rel="noopener noreferrer"
              aria-label="Repositorio de Armado en México en GitHub (se abre en una pestaña nueva)"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '11px 6px', margin: '-11px 0',
                verticalAlign: 'middle',
              }}>
              <IconoGitHub />GitHub
            </a>
            <span aria-hidden="true" style={{ margin: '0 8px', color: PALETTE.sobreMarcaMuted }}>·</span>
            <Externo a={AMX_LICENCIA} etiqueta="Licencia AGPL-3.0 de Armado en México (se abre en una pestaña nueva)">AGPL-3.0</Externo>
          </div>

          {/* ── AVISO ─ texto literal del que estaba al final del Home.
              Sin recuadro punteado y sin el rótulo «◆ Aviso» por orden de Saulo
              (revisión del 9-sep-2026): solo el texto, y debajo del crédito. */}
          <div style={window.amxProsa({
            fontSize: 15.5, color: PALETTE.sobreMarca, lineHeight: 1.6,
            marginBottom: 14, maxWidth: '82ch', marginInline: 'auto',
          })}>
            Catálogo divulgativo de código abierto. Las armas de fuego se
            muestran solo con fines informativos. Información basada en la <Interno a="/legalidad" tab="legal">Ley
            Federal de Armas de Fuego</Interno> y precios DCAM.
          </div>

          {/* ── 2 ▸ PROCEDENCIA DE LOS DATOS ───────────────────────────────── */}
          <div style={window.amxProsa({
            fontSize: 14, color: PALETTE.sobreMarcaDim, lineHeight: 1.7,
            marginBottom: 12, maxWidth: '96ch', marginInline: 'auto',
          })}>
            <span style={rotulo({ color: PALETTE.sobreMarcaMuted, fontSize: 11.5, marginRight: 8 })}>Fuentes</span>
            Precios y existencias de los <Interno a="/acerca" tab="about">inventarios
            oficiales DCAM y OTCA</Interno>, con la fecha del inventario en cada ficha.
            <span aria-hidden="true" style={{ margin: '0 7px', color: PALETTE.sobreMarcaMuted }}>·</span>
            Marco legal: <Interno a="/legalidad" tab="legal">Ley Federal de Armas de Fuego
            y Explosivos</Interno>.
            <span aria-hidden="true" style={{ margin: '0 7px', color: PALETTE.sobreMarcaMuted }}>·</span>
            Datos técnicos: <Interno a="/calibres" tab="calibres">guía de calibres</Interno>
            {' '}y publicaciones de los fabricantes.
          </div>

          {/* ── 3 ▸ MARCAS REGISTRADAS — la letra chica ────────────────────── */}
          <p style={window.amxProsa({
            fontSize: 13, color: PALETTE.sobreMarcaMuted, lineHeight: 1.65,
            maxWidth: '78ch', margin: '0 auto',
          })}>
            Los nombres de productos, logotipos y marcas que aparecen en este sitio son propiedad
            de sus respectivos dueños y se usan únicamente para identificar el producto del que se
            informa. Armado en México no está afiliado ni respaldado por ninguna de estas
            compañías, y no forma parte de DEFENSA (anteriormente SEDENA), la DCAM ni de ninguna
            dependencia del gobierno mexicano.
          </p>

        </div>
      </div>
    </footer>
  );
}
window.PieDeSitio = PieDeSitio;

// ──────────────────────────────────────────────────────────────
// ARMA CARD — la tarjeta del catálogo
// Desde el tablero de correcciones del 8-sep-2026 es un envoltorio fino de
// `ArmaExpediente`: el formato de tarjeta es UNO SOLO en Home y en Arsenal, y
// vivía duplicado en tres sitios (ArmaCard, FavCard y VisitedCard).
// Aquí solo queda el paso de props.
// ──────────────────────────────────────────────────────────────
function ArmaCard({ arma, onClick, onCompare, inCompare }) {
  return <ArmaExpediente arma={arma} onClick={onClick}
    onCompare={onCompare} inCompare={inCompare} />;
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
// `pie` decide qué se rotula en el faldón, y son cuatro cosas distintas porque
// el tablero de correcciones (8-sep-2026) pide tres, y la ficha de accesorio
// (15-sep-2026) suma la cuarta:
//   'rotulo'      — nombre y procedencia. La ficha, donde la copia va sola.
//   'nombre'      — solo el nombre. El destacado del Home: «Polaroid solo con
//                    foto y nombre de la pistola. Bandera, país,
//                    especificaciones, etc. van escritos del lado izquierdo en
//                    el folder».
//   'sello'       — solo el sello de legalidad. La tarjeta, donde el nombre y
//                    los datos ya están mecanografiados en el folder de al lado.
//   'procedencia' — solo bandera y marca · país, sin nombre. La ficha de
//                    accesorio, que lleva el nombre en la cabecera del folder.
//   'ninguno'     — sin faldón escrito. El comparador, donde el nombre ya va
//                    en la cabecera de la ficha de fichero.
// `selloSinFoto` (la ficha de arma, 13-sep-2026): sin fotografía, en vez de la
// leyenda va el sello «FOTOGRAFÍA PENDIENTE» sobre la silueta. Por defecto no
// cambia nada, porque las tarjetas y el destacado del Home usan la leyenda.
function ArmaPolaroid({ arma, pie = 'rotulo', selloSinFoto = false, silueta = null }) {
  // El fallback cubre los dos casos: el arma que nunca tuvo foto y el .webp
  // que existe en `data.js` pero no llega (404, red caída, formato no
  // soportado). En ambos se ve lo mismo, que es lo que hace que el `alt` y el
  // fallback sigan teniendo sentido.
  const [falloCarga, setFalloCarga] = React.useState(false);
  const sinFoto = falloCarga || armaSinFoto(arma);
  // `tipo` es un enum cerrado de data.js; el respaldo cubre un dato corrupto.
  const tipoSil = SILUETA_TIPOS.indexOf(arma.tipo) >= 0 ? arma.tipo : 'pistola';
  // `silueta` (la ficha de accesorio, 15-sep-2026): la forma de su categoría y
  // su nombre. Va SOLA, sin leyenda ni sello: «Silueta sola, como la vitrina»
  // (Saulo). En cuanto el accesorio tenga `img`, la foto la sustituye sin más.
  const forma = silueta ? silueta.forma : `imagenes/silueta-${tipoSil}.webp`;
  const nombreSil = silueta ? silueta.nombre : tipoSil;
  // 'procedencia': solo bandera y marca · país, sin nombre (la ficha de
  // accesorio lleva el nombre en la cabecera del folder). Ni «—» ni vacíos.
  const datos = (pie === 'procedencia' ? [arma.marca, arma.pais] : [arma.marca, arma.pais, arma.anio])
    .filter((v) => v != null && v !== '' && v !== '—');
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
              aria-label={'Silueta de ' + nombreSil + '. Sin fotografía en el expediente.'}
              style={{ '--silueta-forma': `url(${forma})` }} />
            {silueta ? null
              : selloSinFoto
                ? <span className="amx-sello amx-sello--pendiente" aria-hidden="true">Fotografía pendiente</span>
                : <span className="amx-polaroid-leyenda" aria-hidden="true">Sin fotografía en expediente</span>}
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
      {pie !== 'ninguno' && (
        <figcaption className="amx-polaroid-pie">
          {pie === 'sello' && <SelloLegal avail={arma.avail} etiqueta={arma.availLabel} />}
          {(pie === 'rotulo' || pie === 'nombre') && <span className="amx-polaroid-nombre">{arma.nombre}</span>}
          {(pie === 'rotulo' || pie === 'procedencia') && datos.length > 0 &&
            <span className="amx-polaroid-datos">
              {arma.pais && <CountryFlag pais={arma.pais} height={9} />}
              <span>{datos.join(' · ')}</span>
            </span>}
        </figcaption>
      )}
    </figure>
  );
}
window.ArmaPolaroid = ArmaPolaroid;

// ──────────────────────────────────────────────────────────────
// CARTA DE LOTERÍA — la categoría, de arma o de accesorio
// «Nombre de la categoría: Pistolas, Revólveres, Rifles, Escopetas, Carabinas»
// abajo, y arriba «cantidad de armas/accesorios que haya en dicha categoría»
// (tablero del 8-sep-2026). Sustituye a la tarjeta de foto con tinte verde en
// las dos rejillas del Home.
//
// `forma` es la URL de la silueta que hace de figura. Se pinta como MÁSCARA,
// igual que en la copia y en los accesorios sin foto: el .webp aporta solo el
// contorno y el color lo pone el CSS.
//
// `ilustracion` es la URL de la ilustración completa estilo Lotería mexicana
// (carta-pistola.webp, carta-revolver.webp, etc.). Cuando se proporciona,
// la carta se muestra como imagen completa y se ocultan el número y el nombre
// que el componente renderiza por defecto.
//
// El número lo lee el lector de pantalla por el `aria-label` del botón, no
// suelto: «31» a secas no dice de qué.
// ──────────────────────────────────────────────────────────────
// Cuáles de las siluetas son largas. Va por nombre de archivo y no por medir la
// imagen porque el conjunto es cerrado y conocido: son ocho .webp del repo, no
// imágenes de datos. Cargar cada una para leerle la proporción costaría una
// petición y un repintado por carta para saber algo que ya sabemos aquí.
const SILUETAS_LARGAS = /-(rifle|escopeta|carabina|optica|cargador|municion)\.webp/;

function CartaLoteria({ nombre, cuenta, unidad = 'piezas', forma, ilustracion, onClick }) {
  const esCartaCompleta = !!ilustracion;
  return (
    <button type="button" className="amx-loteria" onClick={onClick}
      aria-label={`${nombre} — ${cuenta} ${cuenta === 1 ? unidad.replace(/s$/, '') : unidad}`}>
      {esCartaCompleta
        ? <img src={ilustracion} alt="" className="amx-loteria-carta-img" />
        : <span className="amx-loteria-lam">
            <span className="amx-loteria-num" aria-hidden="true">{cuenta}</span>
            {forma &&
              <span aria-hidden="true"
                className={'amx-loteria-fig' + (SILUETAS_LARGAS.test(forma) ? ' amx-loteria-fig--largo' : '')}
                style={{ '--silueta-forma': `url(${forma})` }} />}
          </span>
      }
      {!esCartaCompleta && <span className="amx-loteria-pie">{nombre}</span>}
    </button>
  );
}
window.CartaLoteria = CartaLoteria;

// ──────────────────────────────────────────────────────────────
// SELLO LEGAL — la categoría del arma, estampada en tinta
// «Hay que generar sellos que se vean como si fueran de documentos para las
// categorías de legalidad» (tablero de Saulo, 8-sep-2026), y en la corrección
// siguiente: en las tarjetas de arma tampoco va escrito a mano, va estampado.
//
// Es TEXTO, no una imagen: la palabra la lee un lector de pantalla, se puede
// seleccionar, y las categorías salen de un mecanismo en vez de un raster por
// cada una. El giro, el filo y el desgaste los pone estilo.css.
//
// EXCLUSIVO no es una palabra nueva: `availLabel` de data.js ya llama a esa
// categoría «Exclusivo Ejército», y §6b prohíbe inventar terminología legal.
// ──────────────────────────────────────────────────────────────
const SELLOS = {
  dcam:      { texto: 'CIVIL',     tono: 'civil' },
  externo:   { texto: 'CIVIL',     tono: 'civil' },
  seguridad: { texto: 'SEGURIDAD', tono: 'restr' },
  ejercito:  { texto: 'EXCLUSIVO', tono: 'restr' },
};

function SelloLegal({ avail, etiqueta, grande = false, className = '' }) {
  const s = SELLOS[avail] || SELLOS.dcam;
  return (
    // El nombre accesible es la etiqueta LARGA de los datos («Uso civil —
    // DCAM»), no la palabra del sello: fuera del contexto visual del folder,
    // «CIVIL» a secas no dice de qué habla.
    <span className={'amx-sello amx-sello--' + s.tono + (grande ? ' amx-sello--grande' : '') + (className ? ' ' + className : '')}
      role="img" aria-label={etiqueta || s.texto}>{s.texto}</span>
  );
}
window.SelloLegal = SelloLegal;
// La palabra y el tono de cada categoría, para quien estampa sin el componente
// (la banda de la hoja de oficio, las etiquetas de la vitrina).
window.SELLOS_LEGALES = SELLOS;

// ──────────────────────────────────────────────────────────────
// ARMA EXPEDIENTE — el formato ÚNICO de tarjeta (Home y Arsenal)
// «Este es el formato visual que deben tener las fichas de armas, accesorios y
// municiones en HOME y Arsenal. Este formato también debe estar así para la
// versión móvil.» — tablero de Saulo, 8-sep-2026.
//
// Dos objetos sobre el lienzo, no una caja: el folder manila con lo
// mecanografiado y la copia instantánea encima, saliéndose por la izquierda.
// Los campos son los que dibuja el boceto y NO hay más: marca (en la pestaña),
// nombre, calibre, escala de precio, precio. Las existencias se quedan fuera a
// propósito — «ignorar existencias, eso va en la ficha únicamente».
// ──────────────────────────────────────────────────────────────
function ArmaExpediente({ arma, onClick, distintivo, onCompare, inCompare }) {
  // "$9,870.04 MXN" → "$9,870"
  const precio = (arma.priceExact || '').replace(/\.\d{2}\s*MXN\s*$/, '');
  const cal = (arma.calibre || '').replace(' Parabellum', '').replace('Winchester', 'Win');
  const sello = SELLOS[arma.avail] || SELLOS.dcam;
  const abrir = (e) => { e.preventDefault(); onClick && onClick(); };
  return (
    // No es un <button>: dentro de uno solo cabe contenido de frase, y aquí hay
    // una <figure> con su <figcaption>. Es un div con rol y teclado, y el
    // aria-label lleva la tarjeta entera para que el lector no recite el
    // contenido suelto.
    <div className="amx-exp" role="button" tabIndex={0}
      onClick={abrir}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') abrir(e); }}
      aria-label={[arma.nombre, arma.marca, cal && ('calibre ' + cal),
        arma.availLabel || sello.texto, precio].filter(Boolean).join(', ')}>
      <div className="amx-exp-folder">
        {/* La marca va rotulada sobre la pestaña que trae la fotografía del
            folder. Antes era una pestaña dibujada con CSS; Saulo la rechazó. */}
        <span className="amx-exp-marca">{arma.marca}</span>
        {distintivo}
        {onCompare &&
          <button type="button" className="amx-exp-comparar" aria-pressed={!!inCompare}
            title={inCompare ? 'Quitar de la comparación' : 'Añadir a la comparación'}
            onClick={(e) => { e.stopPropagation(); onCompare(); }}>
            {inCompare ? '✓' : '⇄'}
          </button>}
        <div className="amx-exp-nombre">{arma.nombre}</div>
        {cal && <div className="amx-exp-dato">CAL {cal}</div>}
        <div className="amx-exp-dato"><PriceLevel claro lvl={arma.priceLvl} /></div>
        {precio && <div className="amx-exp-precio">{precio}</div>}
      </div>
      {/* La copia va con el sello en el faldón: el nombre y los datos ya están
          mecanografiados a su derecha, repetirlos sería decir dos veces lo
          mismo a un palmo. */}
      <div className="amx-exp-copia" aria-hidden="true">
        <ArmaPolaroid arma={arma} pie="sello" />
      </div>
    </div>
  );
}
window.ArmaExpediente = ArmaExpediente;

// ──────────────────────────────────────────────────────────────
// ARMA DESTACADA — el folder abierto de la portada
// Tablero de Saulo, 8-sep-2026: «Polaroid solo con foto y nombre de la
// pistola. Bandera, pais, especificaciones, etc. van escritos del lado
// izquierdo en el folder». Y: «Se quitan estos botones. Si se hace click en la
// Polaroid se abre el enlace al arma mostrada».
//
// Por eso el nombre del arma sale UNA vez, en el faldon de la copia, y no se
// repite en el folder: en el boceto la copia es la que lleva el rotulo.
// ──────────────────────────────────────────────────────────────
function ArmaDestacada({ arma, onOpen }) {
  const especificaciones = [
    ['Calibre',   arma.calibre],
    ['Capacidad', arma.capacidad],
    ['Mecanismo', arma.mecanismo],
    ['Longitud',  arma.longitud],
    ['Peso',      arma.peso],
  ].filter(([, v]) => v != null && v !== '');
  return (
    <article className="amx-dest">
      <div className="amx-dest-folder">
        <span className="amx-dest-rotulo">Arma destacada</span>
        <div className="amx-dest-datos">
          {/* Lo primero que se estampa, encima de lo mecanografiado. Va grande
              porque aqui hay sitio, y dentro de esta columna y no como hermano
              del grid: un tercer hijo se iria a la celda de la copia. */}
          <div className="amx-dest-sello">
            <SelloLegal avail={arma.avail} etiqueta={arma.availLabel} grande />
          </div>
          <div className="amx-dest-procedencia">
            <CountryFlag pais={arma.pais} height={12} />
            <span>{[arma.marca, arma.pais, arma.anio].filter(Boolean).join(' · ')}</span>
          </div>
          <dl className="amx-dest-specs">
            {especificaciones.map(([k, v]) =>
              <React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}
          </dl>
        </div>
        {/* La copia ES el enlace: el tablero retira los dos botones que habia
            debajo y deja que se entre por la fotografia. */}
        <button type="button" className="amx-dest-copia" onClick={onOpen}
          aria-label={'Ver la ficha de ' + arma.nombre}>
          <ArmaPolaroid arma={arma} pie="nombre" />
        </button>
      </div>
    </article>
  );
}
window.ArmaDestacada = ArmaDestacada;

// ──────────────────────────────────────────────────────────────
// FICHA TÉCNICA — la ficha de fichero del expediente (13-sep-2026)
// «La ficha de información va con estilo de ficha bibliográfica antigua»
// (tablero de Saulo). Cartulina con renglón rojo, rayado y perforación; cada
// dato en su renglón, con puntos guía hasta el valor.
// La cabecera lleva la MARCA a la derecha y no un número de ficha: un «No. 040»
// sacado del id sería el folio `AR-####` que Saulo retiró el 7-sep-2026 —un
// código que no corresponde a ningún registro real—.
// `mecanismo` entra aquí y ya no bajo el título: dicho una sola vez.
// `filas` (la ficha de accesorio, 15-sep-2026): los renglones de las specs
// del inventario tal cual. Sin ellas, los del arma, como siempre.
// ──────────────────────────────────────────────────────────────
function FichaTecnica({ arma, filas }) {
  const lista = (filas || [
    ['Calibre',   arma.calibre],
    ['Capacidad', arma.capacidad],
    ['Mecanismo', arma.mecanismo],
    ['Longitud',  arma.longitud],
    ['Peso',      arma.peso],
    ['Origen',    arma.pais],
    ['Año',       arma.anio],
  ]).filter(([, v]) => v != null && v !== '');
  const marca = arma.marca && arma.marca !== '—' ? arma.marca : '';
  return (
    <section className="amx-papel amx-fichero" style={{ '--giro-papel': '.35deg' }}
      aria-label={'Ficha técnica de ' + arma.nombre}>
      <div className="amx-fichero-carton">
        <div className="amx-fichero-cab">
          <h2 className="amx-papel-tit">Ficha técnica</h2>
          {marca && <span>{marca}</span>}
        </div>
        <dl className="amx-fichero-lista">
          {lista.map(([k, v]) => (
            <div key={k} className="amx-fichero-fila">
              <dt>{k}</dt>
              <span className="amx-fichero-guia" aria-hidden="true" />
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
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
    'EEUU': 'EE.UU.', 'Estados Unidos': 'EE.UU.', 'USA': 'EE.UU.', 'EUA': 'EE.UU.',
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
// COMPARE FLOATING BAR — barra flotante de comparación
// ──────────────────────────────────────────────────────────────
function CompareFloat({ ids, onOpen, onElegir, onClear }) {
  if (!ids || !ids.length) return null;
  const armas = ids.map((id) => window.findArma(id)).filter(Boolean);
  if (!armas.length) return null;
  // Con una: «Comparando la Ruger LCP · Elegir otra». Con dos, sus nombres y
  // «Ver». El texto va entero en el DOM (lo lee el lector); solo se recorta a la vista.
  const texto = armas.length === 1 ? 'Comparando la ' + armas[0].nombre : armas.map((x) => x.nombre).join(' y ');
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
      <span title={texto} style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 14.5, color: PALETTE.textDim, flex: 1, minWidth: 0,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{texto}</span>
      <button onClick={armas.length === 1 ? onElegir : onOpen} style={{
        background: PALETTE.amber, color: PALETTE.tintaSobreMarca, border: 'none',
        padding: '5px 10px',
        fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 13,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        cursor: 'pointer', flex: 'none',
      }}>{armas.length === 1 ? 'Elegir otra' : 'Ver'}</button>
      <button onClick={onClear} aria-label="Vaciar la comparación" style={{
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
          // El padding vertical NO es decorativo: es lo que deja respirar a lo
          // que se sale de la tarjeta. La copia instantánea de `ArmaExpediente`
          // va girada y sobresale unos 12px por arriba y por abajo, y un
          // scroller horizontal SIEMPRE recorta el otro eje — la regla del CSS
          // es que si un eje es `auto`, el otro no puede quedarse en `visible`.
          // Con `overflowY: hidden` y sin este aire, la polaroid salía cortada
          // en cuadrado y se perdía justo lo que la hace parecer una foto.
          padding: `18px ${padX}px 20px`,
          scrollPaddingLeft: padX,
          cursor: dragging ? 'grabbing' : 'grab',
          userSelect: dragging ? 'none' : undefined,
        }}>
        {items.map((it, i) => (
          <div key={it.id || i} style={{
            flex: `0 0 ${itemWidth}px`,
            // `overflow: visible` por lo mismo: el recorte del item cortaba la
            // copia por el canto.
            width: itemWidth, minWidth: 0, overflow: 'visible',
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
// FOLDER PREGUNTA — el cajón de expedientes de /preguntas
// Cada pregunta es un folder manila que monta sobre el siguiente, y al abrirlo
// sale de dentro la hoja de oficio con la respuesta: el cartón pregunta, el
// papel responde. El tema va rotulado en la pestaña, que es lo que deja leer
// la pila de un vistazo.
//
// Es <details> nativo —el navegador da aria-expanded, teclado y estado— pero
// NO reusa `Disclosure`: aquel viste con PALETTE y lleva una barrita de
// acento, y dentro de un papel solo entran los tokens de papelería (§5.5). Sin
// estado en React: el +/− y el resto los pinta el CSS con [open].
//
// OJO: el <span> flex va DENTRO del <summary> y no en el <summary> mismo
// (display:flex ahí se traga el marcador y rompe el click en Safari viejo).
// ──────────────────────────────────────────────────────────────
function FolderPregunta({ pregunta, tema, children }) {
  return (
    <details className="amx-faq-folder">
      <summary>
        {/* La pestaña rotulada va oculta al lector: clasifica lo que la
            pregunta de al lado ya dice con todas sus letras. */}
        {tema && <span className="amx-faq-tema" aria-hidden="true">{tema}</span>}
        <span className="amx-faq-cab">
          <span className="amx-faq-q">{pregunta}</span>
        </span>
      </summary>
      <div className="amx-oficio">
        <div className="amx-oficio-membrete" aria-hidden="true">
          <span>Armado en México</span><span>{tema || 'Respuesta'}</span>
        </div>
        <p className="amx-oficio-texto">{children}</p>
      </div>
    </details>
  );
}
window.FolderPregunta = FolderPregunta;


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

// `tintas` (13-sep-2026): la ficha de arma dibuja la gráfica sobre papel
// milimétrico, que es un objeto y no sigue al tema. Con PALETTE, en oscuro los
// rótulos salían en tinta clara sobre el papel claro. Sin `tintas` no cambia.
function PriceChart({ history, color = PALETTE.amber, height = 150, tintas }) {
  const t = Object.assign({
    baja: PALETTE.green, sube: PALETTE.redHi, igual: PALETTE.textMuted,
    eje: PALETTE.border, fondo: PALETTE.bg, texto: PALETTE.textDim, texto2: PALETTE.textMuted,
  }, tintas || {});
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
  const colorTramo = (a, b) => (b.v < a.v ? t.baja : b.v > a.v ? t.sube : t.igual);
  const tramos = xy.slice(1).map((c, i) => ({
    d: `M${xy[i].x.toFixed(1)},${xy[i].y.toFixed(1)} L${c.x.toFixed(1)},${c.y.toFixed(1)}`,
    color: colorTramo(xy[i].p, c.p)
  }));
  const bajadas = tramos.filter((tr) => tr.color === t.baja).length;
  const subidas = tramos.filter((tr) => tr.color === t.sube).length;

  const ini = pts[0], fin = pts[pts.length - 1];
  const deltaPct = ini.v ? ((fin.v - ini.v) / ini.v) * 100 : 0;
  const colorFin = fin.v < ini.v ? t.baja : fin.v > ini.v ? t.sube : color;
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
                 stroke: t.fondo, strokeWidth: 3.5 };

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
        <line x1={x0} y1={y1} x2={x1} y2={y1} style={{ stroke: t.eje }} strokeWidth="1" />
        <path d={area} fill={`url(#pcG${uid})`} />
        {tramos.map((tr, i) =>
          <path key={i} d={tr.d} fill="none" style={{ stroke: tr.color }} strokeWidth="2.5"
            strokeLinejoin="round" strokeLinecap="round" />
        )}
        {xy.map((c, i) => {
          const ext = i === 0 || i === xy.length - 1;
          // cada punto toma el color del tramo que LLEGA a él (el primero, el que sale)
          const cc = tramos[Math.max(0, i - 1)].color;
          return (
            <circle key={i} cx={c.x} cy={c.y} r={ext ? 4.5 : 3}
              style={{ fill: ext ? cc : t.fondo, stroke: cc }} strokeWidth="2" />
          );
        })}
        <text x={x0} y={15} textAnchor="start"
          fontFamily={MONO} fontSize="13"
          style={{ ...HALO, fill: t.texto }}>{String(ini.price).replace(' MXN', '')}</text>
        <text x={x1} y={15} textAnchor="end"
          fontFamily={MONO} fontSize="13" fontWeight="700"
          style={{ ...HALO, fill: colorFin }}>{String(fin.price).replace(' MXN', '')}</text>
        <text x={x0} y={height - 7} textAnchor="start"
          fontFamily={MONO} fontSize="12" letterSpacing="0.1em"
          style={{ ...HALO, fill: t.texto2 }}>{amxFechaCorta(ini.date).toUpperCase()}</text>
        <text x={x1} y={height - 7} textAnchor="end"
          fontFamily={MONO} fontSize="12" letterSpacing="0.1em"
          style={{ ...HALO, fill: t.texto2 }}>{amxFechaCorta(fin.date).toUpperCase()}</text>
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

// ══════════════════════════════════════════════════════════════
// LA PAPELERÍA DEL EXPEDIENTE — primitivas de la ficha de arma
// Rediseño del 13-sep-2026 (rama opus-5/red-fichas-de-armas). Viven aquí y no
// en screens-2.jsx porque las fichas de accesorio y de munición van a portear
// este mismo diseño: el talón, la tarjeta de almacén, el historial y la repisa
// les sirven tal cual. La piel está en estilo.css, bloque «LA FICHA DE ARMA».
// ══════════════════════════════════════════════════════════════

// Fecha de un inventario (AAAA-MM-DD) en es-MX: «06 jul 2026». Vivía en
// screens-2.jsx; sube aquí porque la usan el talón, el kárdex y el historial.
// `corta`: año a dos cifras («11 sep 26»), para tablas en ancho de teléfono.
function amxFmtManualDate(f, corta) {
  if (!f) return '';
  const d = new Date(String(f).length === 10 ? f + 'T12:00:00' : f);
  if (isNaN(d)) return String(f);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: corta ? '2-digit' : 'numeric' });
}
window.amxFmtManualDate = amxFmtManualDate;

// ──────────────────────────────────────────────────────────────
// CINTA DYMO — los títulos de sección fuera del folder
// Las letras van alineadas: Saulo retiró los saltos por letra el 16-sep-2026.
// ──────────────────────────────────────────────────────────────
// `chica`: la cinta de un tramo dentro de una sección (los cargadores de la
// vitrina de accesorios, 16-sep-2026).
function CintaDymo({ children, nivel = 2, id, chica = false }) {
  const Tag = 'h' + nivel;
  return <Tag className={'amx-dymo' + (chica ? ' amx-dymo--chica' : '')} id={id}>{children}</Tag>;
}
window.CintaDymo = CintaDymo;

// ──────────────────────────────────────────────────────────────
// NOTA DE ERRATA — el precio que la DCAM publicó mal
// Saulo, 13-sep-2026: «Cuando pase eso hay que colocar el último precio
// conocido y una nota indicando que probablemente sea un error de la
// publicación de la Secretaría de Defensa». La conciliación deja en el
// registro de ese inventario `errata` (el precio tal como salió en el PDF) y en
// `price` el que se publica. Si hay un registro anterior con ese mismo precio,
// la nota cita su fecha; si no, `price` es el del PDF y la nota solo avisa.
// Sale junto al precio en las tres fichas y solo si el ÚLTIMO registro, el del
// precio actual, trae `errata`. Va también en la barra fija del móvil.
//
// EL TEXTO ESTÁ DUPLICADO en scripts/build-prerender.mjs (`textoErrata`), que
// corre en Node sin ui.jsx: si tocas uno, toca el otro. Las fechas van como en
// el boceto de Saulo, «06-JUL-2026», con meses fijos y no con toLocaleDateString:
// así la app y el prerender escriben lo mismo sea cual sea el ICU.
// ──────────────────────────────────────────────────────────────
const AMX_MESES_ERRATA = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
function amxFechaErrata(f) {
  const [a, m, d] = String(f || '').slice(0, 10).split('-');
  return AMX_MESES_ERRATA[m - 1] ? `${d}-${AMX_MESES_ERRATA[m - 1]}-${a}` : String(f || '');
}

function amxTextoErrata(historial) {
  const h = historial || [];
  const ultimo = h[h.length - 1];
  if (!ultimo || !ultimo.errata) return null;
  const v = amxPrecioNum(ultimo.price);
  let anterior = null;
  for (let i = h.length - 2; i >= 0 && v != null; i--) {
    if (amxPrecioNum(h[i].price) === v) { anterior = h[i]; break; }
  }
  const error = 'probablemente es un error de la publicación de la Secretaría de la Defensa.';
  return anterior
    ? `Precio del inventario ${amxFechaErrata(anterior.date)}. El publicado el ${amxFechaErrata(ultimo.date)} (${String(ultimo.errata).replace(' MXN', '')}) ${error}`
    : `El precio publicado el ${amxFechaErrata(ultimo.date)} ${error}`;
}
window.amxTextoErrata = amxTextoErrata;

function NotaErrata({ historial }) {
  const texto = amxTextoErrata(historial);
  if (!texto) return null;
  return (
    <p className="amx-errata">
      {/* U+FE0E: el signo en texto, no como emoji (iOS lo pinta a color). */}
      <span className="amx-errata-signo" aria-hidden="true">{'⚠︎'}</span>
      {/* Las fechas no se parten en su guion («11-» / «SEP-2026»). */}
      <span>{texto.split(/(\d{2}-[A-Z]{3}-\d{4})/).map((t, i) =>
        i % 2 ? <span key={i} className="amx-errata-fecha">{t}</span> : t)}</span>
    </p>
  );
}
window.NotaErrata = NotaErrata;

// ──────────────────────────────────────────────────────────────
// SEPARADORES de la hoja de oficio: Legalidad · Usos · Antecedentes.
// Suben a ui.jsx (15-sep-2026) porque la ficha de accesorio también los usa.
// Antes vivían en screens-2.jsx, «controlados desde fuera» porque el enlace
// «§ Ver situación legal» de la copia tenía que poder abrir Legalidad; ese
// enlace ya no existe, pero conservan el control externo. Conservan lo que ya
// tenían: rol tablist, foco itinerante y flechas ←/→.
// Se definen fuera de cualquier pantalla a propósito: un componente definido
// dentro de otro remonta su subárbol en cada render (la trampa que documenta
// fidelidad-diseno).
// ──────────────────────────────────────────────────────────────
function FichaPanel({ children }) { return <React.Fragment>{children}</React.Fragment>; }

function FichaTabs({ children, activo, onCambiar }) {
  const paneles = React.Children.toArray(children).filter(Boolean);
  const refs = React.useRef([]);
  if (!paneles.length) return null;
  const act = Math.min(activo, paneles.length - 1);

  function onKey(e) {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (act + d + paneles.length) % paneles.length;
    onCambiar(n);
    if (refs.current[n]) refs.current[n].focus();
  }

  return (
    <div>
      <div className="amx-separadores-pestanas" role="tablist" aria-label="Documentos del expediente" onKeyDown={onKey}>
        {paneles.map((p, i) => (
          <button
            key={i}
            type="button"
            ref={(el) => { refs.current[i] = el; }}
            role="tab"
            id={'ficha-tab-' + i}
            aria-selected={i === act}
            aria-controls={'ficha-panel-' + i}
            tabIndex={i === act ? 0 : -1}
            className="amx-separador"
            onClick={() => onCambiar(i)}>
            {p.props.label}
          </button>
        ))}
      </div>
      {/* LAS TRES HOJAS SE PINTAN, apiladas en la misma celda, y solo se ve la
          activa. Antes se pintaba solo la activa y el folder crecía o encogía al
          cambiar de pestaña —«puede marear o ser incómodo», Saulo, 13-sep-2026—.
          Así la pila mide siempre lo que la hoja más larga. Las de detrás van
          con `visibility: hidden` (estilo.css), que las saca del lector de
          pantalla y del orden del tabulador sin quitarles el alto. */}
      <div className="amx-oficio-pila">
        {paneles.map((p, i) => (
          <div key={i} className="amx-oficio" role="tabpanel" id={'ficha-panel-' + i}
            aria-labelledby={'ficha-tab-' + i} data-activo={i === act ? 'si' : 'no'}>
            {/* Membrete genérico del sitio: sin escudo ni emblema oficial (§6b). */}
            <div className="amx-oficio-membrete" aria-hidden="true">
              <span>Armado en México</span><span>{p.props.label}</span>
            </div>
            {p}
          </div>
        ))}
      </div>
    </div>
  );
}
window.FichaTabs = FichaTabs;
window.FichaPanel = FichaPanel;

// ──────────────────────────────────────────────────────────────
// TALÓN FIJO — cuándo se ve el talón de abajo en móvil
// Sale de ProductScreen (15-sep-2026) porque la ficha de accesorio hace lo
// mismo. `talonRef` va en el talón del folder y `fichaRef` en el contenedor de
// la ficha; `mostrar` es true cuando ese talón ya salió por arriba y el pie del
// sitio no asoma. `clave` (el id de la ficha) lo reinicia al cambiar de ficha.
//
// IntersectionObserver con la raíz implícita: recorta por los `overflow` de
// los ancestros, así que funciona igual si hace scroll la página que si lo
// hace el contenedor interno del shell móvil. Nada de escuchar el scroll.
// El margen de arriba descuenta la barra superior (64px), que tapa lo que
// pasa por debajo de ella.
//
// NO BASTA OBSERVAR EL TALÓN. En móvil va debajo de la ficha técnica, fuera
// de la pantalla al cargar, y un salto de scroll lo lleva de «debajo» a
// «encima» sin cruzar nunca la ventana: su estado no cambia y el observer no
// dispara. Por eso se observan también las celdas del folder y las secciones
// de la ficha, que cubren la página entera: cualquier salto cambia la
// visibilidad de alguna, y en cada aviso se mide dónde quedó el talón.
//
// Se observa el pie del sitio por su CLASE y no un centinela ni la etiqueta:
// un salto de scroll cruza un centinela sin que el observer dispare, y cada
// opinión publicada lleva su propio <footer> antes que el del sitio (revisión
// del PR #152).
// ──────────────────────────────────────────────────────────────
function useTalonFijo(clave) {
  const [talonFuera, setTalonFuera] = React.useState(false);
  const [pieVisible, setPieVisible] = React.useState(false);
  const talonRef = React.useRef(null);
  const fichaRef = React.useRef(null);

  React.useEffect(() => {
    setTalonFuera(false);
    setPieVisible(false);
    const el = talonRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const revisar = () => setTalonFuera(el.getBoundingClientRect().bottom < 64);
    const io = new IntersectionObserver(revisar, { rootMargin: '-64px 0px 0px 0px' });
    io.observe(el);
    const ficha = fichaRef.current;
    if (ficha) {
      Array.from(ficha.children).forEach((c) => io.observe(c));
      ficha.querySelectorAll('.amx-carpeta-grid > *').forEach((c) => io.observe(c));
    }
    const pie = document.querySelector('.amx-pie-sitio');
    const ioPie = pie && new IntersectionObserver(([e]) => setPieVisible(e.isIntersecting));
    if (ioPie) ioPie.observe(pie);
    return () => { io.disconnect(); if (ioPie) ioPie.disconnect(); };
  }, [clave]);

  return { talonRef, fichaRef, mostrar: talonFuera && !pieVisible };
}
window.useTalonFijo = useTalonFijo;

// ──────────────────────────────────────────────────────────────
// TALÓN DE COMPROBANTE — el precio, en papel autocopiante rosa
// En la ficha va bajo la copia; con `fijo` es la barra de abajo en móvil. La
// casilla de Comparar se tacha con una X: el estado lo dicen la X y el texto.
// `historial` es solo para la nota de errata (ver NotaErrata); en el fijo va en
// un renglón propio bajo la cifra y la casilla.
//
// `ultimoConocido`: el precio viene de un inventario ANTERIOR al último de su
// sucursal, es decir, el arma ya no aparece en el más reciente. El talón lleva
// entonces el sello «ÚLTIMO PRECIO CONOCIDO». Saulo, 13-sep-2026: «ambos datos
// son ciertos pero hace falta aclararlo en la ficha con Último precio
// conocido». El caso que lo motivó: la Galil ACE 21N, con precio OTCA del
// 26-sep-2025 y la tarjeta de almacén en AGOTADO al inventario OTCA del
// 18-jun-2026. Con los datos del 13-sep-2026 son 52 armas.
// Sin `onComparar` no hay casilla: la ficha de accesorio no tiene comparador
// (15-sep-2026).
// ──────────────────────────────────────────────────────────────
function TalonComprobante({ precio, fuente, fecha, enComparacion, onComparar, fijo = false, talonRef, ultimoConocido = false, historial }) {
  return (
    <div ref={talonRef} className={'amx-talon' + (fijo ? ' amx-talon--fijo' : '')}>
      <div className="amx-talon-papel">
        {fijo ? (
          <div className="amx-talon-resumen">
            <span className="amx-talon-mini">{ultimoConocido ? 'Último precio' : 'Precio'} {fuente}{fecha && <span className="amx-talon-mini-fecha"> · {fecha}</span>}</span>
            <span className="amx-talon-cifra">{String(precio || '').replace(' MXN', '')}</span>
          </div>
        ) : (
          <React.Fragment>
            <div className="amx-talon-cab"><span>Comprobante de precio</span><span>Con IVA</span></div>
            <span className="amx-talon-cifra">{precio}</span>
            <NotaErrata historial={historial} />
            {ultimoConocido &&
              <span className="amx-sello amx-sello--restr amx-talon-sello">Último precio conocido</span>}
            <dl className="amx-talon-datos">
              <dt>Fuente</dt><dd>{fuente}</dd>
              {fecha && <React.Fragment><dt>Fecha</dt><dd>{fecha}</dd></React.Fragment>}
            </dl>
          </React.Fragment>
        )}
        {onComparar && (
          <button type="button" className="amx-talon-casilla" aria-pressed={!!enComparacion} onClick={onComparar}>
            <span className="amx-talon-caja" aria-hidden="true">{enComparacion ? 'X' : ''}</span>
            {enComparacion ? 'En comparación' : 'Comparar'}
          </button>
        )}
        {fijo && <NotaErrata historial={historial} />}
      </div>
    </div>
  );
}
window.TalonComprobante = TalonComprobante;

// ──────────────────────────────────────────────────────────────
// TARJETA DE ALMACÉN — existencias por sucursal (kárdex)
// `filas`: [{ sigla, qty, manual, agotado }], la misma lista que ya calculaba
// la ficha. Absorbe lo que iba en «Detalle de la fuente»: la referencia del
// inventario, el aviso de dato histórico y el nivel de precio.
// En teléfono, como el registro de precios: fecha corta y la tabla se desliza
// dentro del cartón si aún no cabe (con AGOTADO sobran ~70 px a 360).
// ──────────────────────────────────────────────────────────────
function TarjetaAlmacen({ filas, referencia, sigla, nivelPrecio, movil }) {
  const lvl = Math.max(0, Math.min(5, Number(nivelPrecio) || 0));
  return (
    <section className="amx-papel amx-kardex" style={{ '--giro-papel': '-.4deg' }} aria-labelledby="amx-kardex-tit">
      <div className="amx-kardex-carton">
        <div className="amx-kardex-cab">
          <h2 className="amx-papel-tit" id="amx-kardex-tit">Tarjeta de almacén</h2>
          <small>Existencias por sucursal</small>
        </div>
        {referencia &&
          <p className="amx-kardex-articulo"><span>Artículo · {sigla}</span>{referencia}</p>}
        {filas.length > 0 ? (
          <div className="amx-kardex-desliza" tabIndex={movil ? 0 : undefined}
            role={movil ? 'region' : undefined} aria-label={movil ? 'Existencias por sucursal' : undefined}>
            <table className="amx-kardex-tabla">
              <thead>
                <tr><th scope="col">Sucursal</th><th scope="col" className="num">Exist.</th><th scope="col">Inventario</th><th scope="col"><span className="amx-sr">Documento</span></th></tr>
              </thead>
              <tbody>
                {filas.map((b, i) => {
                  const aut = window.manualAutoridad ? window.manualAutoridad(b.manual) : null;
                  return (
                    <tr key={b.sigla + i}>
                      <td className="amx-kardex-suc"><b>{b.sigla}</b>{aut && <small>{aut.nombre}</small>}</td>
                      <td className="num">
                        {b.agotado
                          ? <span className="amx-sello amx-sello--restr">Agotado</span>
                          : Number(b.qty).toLocaleString('es-MX')}
                      </td>
                      <td className="amx-kardex-fecha">{b.manual ? amxFmtManualDate(b.manual.fecha, movil) : '—'}</td>
                      <td>{b.manual && b.manual.url
                        ? <a className="amx-kardex-pdf" href={b.manual.url} target="_blank" rel="noopener"
                            aria-label={'PDF del inventario ' + b.sigla}>PDF ↗</a>
                        : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="amx-kardex-articulo">Existencias pendientes de conciliar con el inventario oficial.</p>
        )}
        <p className="amx-kardex-nota">
          Dato histórico por sucursal, no en tiempo real: la disponibilidad actual puede variar.
          {lvl > 0 &&
            <React.Fragment>{' '}Nivel de precio:{' '}
              <span className="amx-nivel" role="img" aria-label={`${lvl} de 5`}>
                <b>{'$'.repeat(lvl)}</b><span>{'$'.repeat(5 - lvl)}</span>
              </span>.
            </React.Fragment>}
        </p>
      </div>
    </section>
  );
}
window.TarjetaAlmacen = TarjetaAlmacen;

// ──────────────────────────────────────────────────────────────
// HISTORIAL DE PRECIOS — papel milimétrico y registro con el PDF de cada inventario
// Con dos fechas distintas o más: la gráfica y el registro (en escritorio a la
// par; en móvil el registro se pliega). Con UNA sola fecha no hay tendencia que
// dibujar: sale solo el registro, que antes directamente se ocultaba y dejaba
// sin fecha ni PDF a la mitad de las armas.
// ──────────────────────────────────────────────────────────────
const TINTAS_MILIMETRICO = {
  baja: '#2F6B33', sube: '#A3341F', igual: '#4E5B63',
  eje: '#8FB2C4', fondo: '#F6F9F5', texto: '#171B19', texto2: '#4E5B63',
};

function HistorialPrecios({ historial, manualById, movil }) {
  const [verTodo, setVerTodo] = React.useState(false);
  const hist = historial || [];
  const fechas = [];
  hist.forEach((h) => { if (fechas.indexOf(h.date) < 0) fechas.push(h.date); });
  const hayGrafica = fechas.length >= 2;
  const plegado = hayGrafica && movil;

  // Variación de cada registro contra el anterior (el orden ya es cronológico).
  const filas = hist.map((h, i) => {
    const man = manualById(h.manualId);
    const aut = window.manualAutoridad ? window.manualAutoridad(man) : null;
    const v = amxPrecioNum(h.price);
    const prev = i > 0 ? amxPrecioNum(hist[i - 1].price) : null;
    const delta = (v != null && prev) ? ((v - prev) / prev) * 100 : null;
    return { h: h, sigla: aut ? aut.sigla : '—', url: man && man.url, delta: delta, actual: i === hist.length - 1 };
  }).reverse();

  // Con el vigía de gob.mx entra un inventario tras otro: a la vista, solo los
  // últimos; el resto detrás del botón. Plegado (móvil) ya va todo escondido.
  const RECIENTES = 5;
  const recortar = !plegado && filas.length > RECIENTES;
  const visibles = recortar && !verTodo ? filas.slice(0, RECIENTES) : filas;

  const pIni = hist.length ? amxPrecioNum(hist[0].price) : null;
  const pFin = hist.length ? amxPrecioNum(hist[hist.length - 1].price) : null;
  const total = (hayGrafica && pIni && pFin != null) ? ((pFin - pIni) / pIni) * 100 : null;
  const fmtDelta = (d) => (d > 0 ? '▲ +' : d < 0 ? '▼ −' : '= ') + Math.abs(d).toFixed(1) + ' %';

  // La fuente de cada fila abre el PDF de su inventario (antes eran hojas
  // grapadas aparte, una por inventario, que no escalaban).
  // En teléfono no cabe entera ni con la fecha corta (a 360 px sobran ~50 px):
  // se desliza de lado dentro del papel, y con teclado se enfoca para deslizarla.
  const registro = (
    <div>
      <div className="amx-registro-desliza" tabIndex={movil ? 0 : undefined}
        role={movil ? 'region' : undefined} aria-label={movil ? 'Registro de precios' : undefined}>
        <table className="amx-registro">
          <thead>
            <tr><th scope="col">Fecha</th><th scope="col">Fuente</th><th scope="col" className="num">Precio</th><th scope="col" className="num">Var.</th></tr>
          </thead>
          <tbody>
            {visibles.map((f, i) => {
              const fecha = amxFmtManualDate(f.h.date) || '—';
              return (
                <tr key={i} className={f.actual ? 'es-actual' : undefined}>
                  <td>{movil ? amxFmtManualDate(f.h.date, true) || '—' : fecha}</td>
                  <td>
                    {f.url
                      ? <a href={f.url} target="_blank" rel="noopener"
                          aria-label={'Inventario ' + f.sigla + ' del ' + fecha + ' (PDF, abre en otra pestaña)'}>{f.sigla} ↗</a>
                      : f.sigla}
                  </td>
                  <td className="num">{String(f.h.price).replace(' MXN', '')}</td>
                  <td className={'num' + (f.delta < 0 ? ' amx-baja' : f.delta > 0 ? ' amx-sube' : '')}>
                    {f.delta == null ? '—' : fmtDelta(f.delta)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {recortar &&
        <button type="button" className="amx-registro-mas" aria-expanded={verTodo} onClick={() => setVerTodo(!verTodo)}>
          Ver todo el registro ({filas.length})
        </button>}
    </div>
  );

  return (
    <section className="amx-historial" aria-labelledby="amx-historial-tit">
      <div className="amx-papel" style={{ '--giro-papel': '.3deg' }}>
        <div className="amx-milimetrico">
          <div className="amx-historial-cab">
            <h2 className="amx-papel-tit" id="amx-historial-tit">Historial de precios</h2>
            <small>{fechas.length} {fechas.length === 1 ? 'inventario oficial' : 'inventarios oficiales'} DCAM / OTCA</small>
          </div>
          <div className={'amx-historial-cuerpo' + (hayGrafica ? ' amx-historial-cuerpo--doble' : '')}>
            {hayGrafica && <PriceChart history={hist} height={170} tintas={TINTAS_MILIMETRICO} />}
            {plegado
              ? <details className="amx-plegable"><summary>Ver el registro ({hist.length})</summary>{registro}</details>
              : registro}
          </div>
          {total != null &&
            <p className="amx-historial-variacion">
              Variación total
              <b className={total < 0 ? 'amx-baja' : total > 0 ? 'amx-sube' : undefined}>{fmtDelta(total)}</b>
            </p>}
        </div>
      </div>
    </section>
  );
}
window.HistorialPrecios = HistorialPrecios;

// ──────────────────────────────────────────────────────────────
// REPISA — una fila de la vitrina (munición, accesorios)
// `porFila` reparte los artículos en filas de N, cada una con su tabla
// (escritorio); sin él va todo en una tira que hace scroll de lado (móvil).
// `renderArticulo(item, i)` devuelve un <RepisaArticulo>.
// ──────────────────────────────────────────────────────────────
function Repisa({ rotulo, items, porFila, renderArticulo }) {
  const filas = [];
  if (porFila) for (let i = 0; i < items.length; i += porFila) filas.push(items.slice(i, i + porFila));
  else filas.push(items);
  return (
    <div className="amx-repisa">
      <p className="amx-repisa-placa">{rotulo}</p>
      {filas.map((fila, f) => (
        <div key={f} className="amx-repisa-fila" style={porFila ? { '--por-fila': porFila } : undefined}>
          <ul className="amx-repisa-carril">
            {fila.map((it, i) => renderArticulo(it, f * (porFila || 0) + i))}
          </ul>
        </div>
      ))}
    </div>
  );
}
window.Repisa = Repisa;

// Un artículo de la repisa: la caja (o la silueta con su sello) apoyada en la
// tabla y la etiqueta pegada al canto. Si la foto no llega, cae a la silueta.
function RepisaArticulo({ foto, silueta, alt, etiqueta, ariaLabel, onClick }) {
  const [fallo, setFallo] = React.useState(false);
  const conFoto = foto && !fallo;
  return (
    <li className="amx-articulo-celda">
      <button type="button" className="amx-articulo" onClick={onClick} aria-label={ariaLabel}>
        <span className="amx-articulo-foto">
          {conFoto
            ? <img src={foto} alt={alt || ''} loading="lazy" decoding="async" onError={() => setFallo(true)} />
            : <span className="amx-articulo-vacio">
                {silueta && <span className="amx-silueta-acc" aria-hidden="true" style={{ '--silueta-forma': `url(${silueta})` }} />}
                <span className="amx-sello amx-sello--pendiente" aria-hidden="true">Foto pendiente</span>
              </span>}
        </span>
        <span className="amx-etiqueta" aria-hidden="true">{etiqueta}</span>
      </button>
    </li>
  );
}
window.RepisaArticulo = RepisaArticulo;

// ──────────────────────────────────────────────────────────────
// GAFETE — la credencial de quien responde por el expediente
// Funda de plástico con su ranura y la tarjeta dentro: logo, filete tricolor,
// retrato circular, nombre y cargos. El formato lo eligió Saulo con una
// referencia de gafete de oficina (17-sep-2026).
//
// SIN CORDÓN: lo llevaba dibujado en CSS y Saulo lo retiró el mismo día —dos
// cintas planas no se leen como una cinta de verdad y delataban el dibujo. La
// funda y su ranura bastan para que se reconozca el gafete. No reintroducir.
//
// NO lleva folio, número, vigencia ni firma —los campos que un gafete real
// tendría ahí—: no hay ningún registro del que salgan, y un código que no
// corresponde a nada es decoración que finge ser dato. Por eso la tarjeta
// termina en los cargos y no en una tabla de campos vacíos.
//
// EL FILETE TRICOLOR: el `.tricolor` que se retiró el 8-sep-2026 (su lápida
// está en estilo.css) desinformaba porque iba bajo armas checas o italianas.
// Aquí la nacionalidad que afirma es cierta —el proyecto y la persona son
// mexicanos— y §6b lista las líneas tricolor entre lo permitido. Son tres
// franjas de color y nada más: ni escudo, ni águila, ni emblema. Y el gafete
// es de un proyecto privado, con su propio logo: no imita una credencial
// oficial de ninguna dependencia.
// ──────────────────────────────────────────────────────────────
function Gafete({ foto, nombre, cargos = [], marca = 'Armado en México', logo = 'imagenes/logo-armado-mx.webp' }) {
  // Cubre los dos casos, igual que ArmaPolaroid: la foto que nunca existió y
  // el .webp que está en el dato pero no llega.
  const [falloCarga, setFalloCarga] = React.useState(false);
  const sinFoto = falloCarga || !foto;
  return (
    <figure className="amx-gafete">
      <div className="amx-gafete-funda">
        <div className="amx-gafete-tarjeta">
          <div className="amx-gafete-marca">
            <img src={logo} alt="" />
            <span>{marca}</span>
          </div>
          <span className="amx-gafete-filete" aria-hidden="true" />
          <div className="amx-gafete-foto">
            {sinFoto ?
            <span className="amx-sello amx-sello--pendiente">Fotografía pendiente</span> :
            <img src={foto} alt={nombre} decoding="async" onError={() => setFalloCarga(true)} />}
          </div>
          <figcaption className="amx-gafete-campos">
            <span className="amx-gafete-nombre">{nombre}</span>
            {cargos.map((c, i) => <span key={i} className="amx-gafete-cargo">{c}</span>)}
          </figcaption>
        </div>
      </div>
    </figure>);

}
window.Gafete = Gafete;

// ══════════════════════════════════════════════════════════════
// EL COMPARADOR — dos fichas de fichero lado a lado (14-sep-2026)
// Decidido con Saulo sección por sección (docs/DESIGN.md §5.6). Qué se compara
// y quién gana vive en src/lib/cotejo.js; aquí solo se pinta. La piel está en
// estilo.css, bloque «EL COMPARADOR».
// ══════════════════════════════════════════════════════════════

// El valor que gana, circulado con rotulador rojo. El círculo es CSS; lo que
// dice «ventaja» al lector de pantalla es el texto oculto.
function CirculoVentaja({ children }) {
  return <span className="amx-circulo">{children}<span className="amx-sr"> (ventaja)</span></span>;
}

// «18 jun 26» en la ficha estrecha del móvil; «18 jun 2026» en escritorio.
function amxFechaCotejo(f, ancho) {
  if (!f) return '';
  const larga = amxFmtManualDate(f);
  return ancho ? larga : larga.replace(/\d{2}(\d{2})$/, '$1');
}

// Una fila de la ficha: un dato con su etiqueta. Precio y existencias apilan
// varias líneas en la MISMA fila, y la rejilla (subgrid) hace que la fila mida
// lo que la más alta de las dos fichas: así lo de abajo sigue alineado.
function CotejoFila({ f, lado, ancho }) {
  const x = f[lado];
  const etq = ancho ? f.etiqueta : f.corta;
  const valor = (v) => (f.gana === lado ? <CirculoVentaja>{v}</CirculoVentaja> : v);
  if (f.tipo === 'precio') {
    return (
      <div className="amx-cotejo-fila amx-cotejo-fila--pila">
        <dt>{etq}</dt>
        <dd>{valor(x.texto)}</dd>
        <dd className="amx-cotejo-nota">{[x.sigla, amxFechaCotejo(x.fecha, ancho)].filter(Boolean).join(' · ')}</dd>
        {x.ultimoConocido &&
          <dd className="amx-cotejo-conocido"><span className="amx-sello amx-sello--restr">Último precio conocido</span></dd>}
      </div>
    );
  }
  if (f.tipo === 'existencias') {
    return (
      <div className="amx-cotejo-fila amx-cotejo-fila--pila">
        <dt>{etq}</dt>
        {f.siglas.length ? f.siglas.map((s) => {
          const suc = x.sucursales.find((y) => y.sigla === s);
          return (
            <dd key={s} className="amx-cotejo-suc">
              <span>{s}</span>
              {!suc ? '—'
                : suc.agotado ? <span className="amx-sello amx-sello--restr">Agotado</span>
                : Number(suc.qty).toLocaleString('es-MX')}
            </dd>
          );
        }) : <dd>Pendiente</dd>}
      </div>
    );
  }
  return <div className="amx-cotejo-fila"><dt>{etq}</dt><dd>{valor(x.texto)}</dd></div>;
}

// Los dos expedientes. Cada uno ocupa en la rejilla común las filas de: la
// copia, la cabecera, cada dato (+ el separador de iguales) y las acciones; y las
// hereda con `subgrid`. El `span` va inline porque sale de contar las filas.
function CotejoFichas({ a, b, cotejo, ancho, onAbrir, onCambiar, onQuitar, onElegir }) {
  const nFilas = cotejo.arriba.length + (cotejo.iguales.length ? 1 + cotejo.iguales.length : 0);
  const pistasExp = { gridRow: 'span ' + (nFilas + 3) };
  const pistasCarton = { gridRow: 'span ' + (nFilas + 1) };
  return (
    <div className="amx-cotejo">
      {[['a', a], ['b', b]].map(([lado, arma]) => arma ? (
        <article key={lado} className="amx-cotejo-exp" style={pistasExp} aria-labelledby={'cotejo-cab-' + lado}>
          {/* El sello va FUERA del botón: dentro, su nombre («Uso civil — DCAM»)
              quedaría tapado por el del botón y el lector no diría la categoría. */}
          <div className="amx-cotejo-copia">
            <div className="amx-cotejo-abrir" role="button" tabIndex={0}
              aria-label={'Abrir la ficha de ' + arma.nombre}
              onClick={() => onAbrir(arma.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAbrir(arma.id); } }}>
              <ArmaPolaroid arma={arma} pie="ninguno" />
              <span className="amx-grapa" aria-hidden="true" />
            </div>
            <span className="amx-cotejo-sello"><SelloLegal avail={arma.avail} etiqueta={arma.availLabel} /></span>
          </div>
          <div className="amx-cotejo-carton" style={pistasCarton}>
            <h2 className="amx-cotejo-cab" id={'cotejo-cab-' + lado} tabIndex={-1}>{arma.nombre}</h2>
            <dl className="amx-cotejo-lista">
              {cotejo.arriba.map((f) => <CotejoFila key={f.clave} f={f} lado={lado} ancho={ancho} />)}
            </dl>
            {cotejo.iguales.length > 0 && <p className="amx-cotejo-sep">— iguales —</p>}
            {cotejo.iguales.length > 0 &&
              <dl className="amx-cotejo-lista">
                {cotejo.iguales.map((f) => <CotejoFila key={f.clave} f={f} lado={lado} ancho={ancho} />)}
              </dl>}
          </div>
          <p className="amx-cotejo-acciones">
            <button type="button" onClick={() => onCambiar(lado)}>Cambiar</button>
            <span aria-hidden="true">·</span>
            {/* El botón desaparece (o pasa a ser el «Quitar» de la otra arma, y un
                segundo Enter vaciaría la comparación): el foco va a la primera
                cabecera. flushSync para que exista ya pintada. */}
            <button type="button" onClick={() => {
              ReactDOM.flushSync(() => onQuitar(arma.id));
              const cab = document.getElementById('cotejo-cab-a');
              if (cab) cab.focus();
            }}>Quitar</button>
          </p>
        </article>
      ) : (
        <article key={lado} className="amx-cotejo-exp" style={pistasExp} aria-label="Ficha en blanco">
          <span className="amx-cotejo-copia amx-cotejo-copia--vacia" aria-hidden="true" />
          <div className="amx-cotejo-carton amx-cotejo-carton--blanco" style={pistasCarton}>
            <button type="button" className="amx-cotejo-elegir" onClick={() => onElegir(lado)}>+ Elegir arma</button>
          </div>
          <span className="amx-cotejo-acciones" aria-hidden="true" />
        </article>
      ))}
    </div>
  );
}
window.CotejoFichas = CotejoFichas;

// La tira de diferencias: la segunda arma frente a la primera, en cifras.
function TiraCotejo({ tira }) {
  return (
    <p className="amx-cotejo-tira">
      <b>{tira.nombreB}</b> frente a <b>{tira.nombreA}</b>:{' '}
      <span className="amx-cotejo-tira-cifras">
        {tira.partes.length
          ? tira.partes.join(' · ') + (tira.avisoFechas ? ' · precios de fechas distintas' : '')
          : 'Sin diferencias en capacidad, peso, longitud ni precio.'}
      </span>
    </p>
  );
}
window.TiraCotejo = TiraCotejo;

// Sin armas: una hoja que dice cómo empezar.
function CotejoVacio({ onArsenal }) {
  return (
    <section className="amx-cotejo-vacio" aria-label="Comparador sin armas">
      <p><b>Todavía no hay armas.</b></p>
      <p>Marca «Comparar» en el talón de cualquier ficha para empezar.</p>
      <button type="button" className="amx-cotejo-boton" onClick={onArsenal}>Ir al Arsenal</button>
    </section>
  );
}
window.CotejoVacio = CotejoVacio;

// LA BÚSQUEDA — elegir un arma sin salir del comparador. `<dialog>` nativo con
// showModal(): el foco, el Esc y el fondo inerte los pone el navegador. Sustituye
// al «modo selección», que mandaba al Arsenal y dejaba al usuario en la ficha
// del arma elegida en vez de devolverlo aquí.
function BuscarArma({ abierta, titulo, excluir, onElegir, onCerrar }) {
  const ref = React.useRef(null);
  const origen = React.useRef(null);
  const [consulta, setConsulta] = React.useState('');
  React.useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierta && !d.open) {
      origen.current = document.activeElement;
      setConsulta('');
      d.showModal();
    } else if (!abierta && d.open) {
      d.close();
    }
  }, [abierta]);
  // Al cerrar (Cerrar, Esc o tras elegir), el foco vuelve a quien abrió la
  // búsqueda si sigue en la página. La ficha en blanco desaparece al elegir:
  // entonces va a la primera cabecera del comparador. El evento `close` llega en
  // una tarea aparte, con el render de la elección ya hecho.
  const alCerrar = () => {
    onCerrar();
    const o = origen.current;
    const destino = o && document.contains(o) ? o : document.getElementById('cotejo-cab-a');
    if (destino) destino.focus();
  };
  const resultados = abierta ? window.amxBuscarArmas(window.DB || [], consulta, excluir) : [];
  return (
    <dialog ref={ref} className="amx-busqueda" aria-labelledby="amx-busqueda-titulo" onClose={alCerrar}>
      <div className="amx-busqueda-papel">
        <h2 id="amx-busqueda-titulo" className="amx-busqueda-titulo">{titulo}</h2>
        <label htmlFor="amx-busqueda-consulta" className="amx-sr">Buscar por nombre, marca o calibre</label>
        <input id="amx-busqueda-consulta" className="amx-busqueda-campo" type="search" autoComplete="off"
          value={consulta} onChange={(e) => setConsulta(e.target.value)} />
        {resultados.length > 0
          ? <ul className="amx-busqueda-lista">
              {resultados.map((x) => (
                <li key={x.id}>
                  <button type="button" className="amx-busqueda-item" onClick={() => onElegir(x.id)}>
                    <span>{x.nombre}</span><small>{x.calibre}</small>
                  </button>
                </li>
              ))}
            </ul>
          : <p className="amx-busqueda-nada">Ninguna arma coincide con «{consulta}».</p>}
        <button type="button" className="amx-busqueda-cerrar" onClick={() => ref.current.close()}>Cerrar</button>
      </div>
    </dialog>
  );
}
window.BuscarArma = BuscarArma;

// ══════════════════════════════════════════════════════════════
// LA VITRINA DE ACCESORIOS — el catálogo como puesto de tianguis (15-sep-2026)
// Decidido con Saulo pregunta por pregunta (docs/DESIGN.md §5.7). El puesto
// REUTILIZA las clases `.amx-puesto*` del puesto de munición del Home (letrero,
// vara, luz, caja) sin tocarlo; la mesa, en cambio, va en la FILA para cruzarla
// entera aunque falten puestos. La piel, en estilo.css, bloque del mismo nombre.
// ══════════════════════════════════════════════════════════════

// El toldo: lona rayada con el rótulo. Es el <h1> de la pantalla.
function ToldoLona({ children }) {
  return (
    <div className="amx-toldo">
      <h1 className="amx-toldo-rotulo">{children}</h1>
    </div>
  );
}
window.ToldoLona = ToldoLona;

// Los separadores de fichero como filtro: las pestañas de la ficha de arma
// (`.amx-separador`) sobre una tira de oficio. Patrón de pestañas, como
// FichaTabs: ← → cambian y enfocan, y solo la activa entra en el tabulador.
function SeparadoresFiltro({ etiqueta, opciones, activo, onCambiar, controla }) {
  const refs = React.useRef({});
  const act = Math.max(0, opciones.findIndex((o) => o.id === activo));
  function onKey(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const sig = opciones[(act + d + opciones.length) % opciones.length];
    onCambiar(sig.id);
    if (refs.current[sig.id]) refs.current[sig.id].focus();
  }
  return (
    <div className="amx-separadores-filtro">
      <div className="amx-separadores-pestanas" role="tablist" aria-label={etiqueta} onKeyDown={onKey}>
        {opciones.map((o, i) => (
          <button key={o.id} type="button" role="tab"
            id={'separador-' + o.id}
            ref={(el) => { refs.current[o.id] = el; }}
            aria-selected={i === act}
            aria-controls={controla}
            tabIndex={i === act ? 0 : -1}
            className="amx-separador"
            onClick={() => onCambiar(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
window.SeparadoresFiltro = SeparadoresFiltro;

// La mesa: reparte los puestos en filas de `porFila`, cada una con su tabla a
// todo el ancho aunque se quede corta (Saulo, 15-sep-2026).
function MesaPuestos({ items, porFila, renderPuesto }) {
  const filas = [];
  for (let i = 0; i < items.length; i += porFila) filas.push(items.slice(i, i + porFila));
  return (
    <div className="amx-mesa">
      {filas.map((fila, f) => (
        <div key={f} className="amx-mesa-fila" style={{ '--por-fila': porFila }}>
          {fila.map(renderPuesto)}
        </div>
      ))}
    </div>
  );
}
window.MesaPuestos = MesaPuestos;

// Un puesto: letrero con SOLO el nombre corto, vara, luz y la pieza. Sin foto,
// la silueta de su categoría, sola: sin sello «Foto pendiente» (Saulo). El
// nombre completo va en el aria-label; foto y silueta no se anuncian.
function PuestoPieza({ rotulo, foto, silueta, ariaLabel, onClick }) {
  const [fallo, setFallo] = React.useState(false);
  const conFoto = foto && !fallo;
  return (
    <button type="button" className="amx-puesto amx-puesto--pieza" aria-label={ariaLabel} onClick={onClick}>
      <span className="amx-puesto-letrero">
        <span className="amx-puesto-rotulo">{rotulo}</span>
      </span>
      <span className="amx-puesto-palo" aria-hidden="true" />
      <span className="amx-puesto-luz" aria-hidden="true" />
      {conFoto
        ? <img className="amx-puesto-caja" src={foto} alt="" loading="lazy" decoding="async" onError={() => setFallo(true)} />
        : <span className="amx-puesto-silueta amx-silueta-acc" aria-hidden="true" style={{ '--silueta-forma': `url(${silueta})` }} />}
    </button>
  );
}
window.PuestoPieza = PuestoPieza;

// ══════════════════════════════════════════════════════════════
// EL HUB DEL ARSENAL — /arsenal (15-sep-2026, docs/DESIGN.md §5.9)
// Las cuentas salen de src/lib/arsenal-hub.js; aquí solo se dibujan, con los
// papeles de la ficha: la tarjeta de almacén, la hoja de oficio con los sellos
// y la repisa de la vitrina con su etiqueta.
// ══════════════════════════════════════════════════════════════

// DISPONIBILIDAD: un renglón por sucursal y sin total (un arma puede estar en las
// dos). No es <table>: un renglón entero no puede ser un botón dentro de una
// tabla; las columnas las dibuja una rejilla con la piel del kárdex.
function AlmacenSucursales({ filas, movil, onAbrir }) {
  return (
    <section className="amx-papel amx-kardex amx-almacen" style={{ '--giro-papel': '-.4deg' }} aria-labelledby="amx-almacen-tit">
      <div className="amx-kardex-carton">
        <div className="amx-kardex-cab">
          <h3 className="amx-papel-tit" id="amx-almacen-tit">Tarjeta de almacén</h3>
        </div>
        <div className="amx-almacen-cols" aria-hidden="true">
          <span>Sucursal</span><span className="num">Armas</span><span>Inventario</span>
        </div>
        <ul className="amx-almacen-lista">
          {filas.map((f) => (
            <li key={f.sigla}>
              <button type="button" className="amx-almacen-renglon" onClick={() => onAbrir(f.sigla)}
                aria-label={`${f.sigla}: ${f.armas} ${f.armas === 1 ? 'arma' : 'armas'} con existencia${f.fecha ? ', inventario del ' + amxFmtManualDate(f.fecha) : ''}`}>
                <b>{f.sigla}</b>
                <span className="num">{Number(f.armas).toLocaleString('es-MX')}</span>
                <span className="amx-kardex-fecha">{f.fecha ? amxFmtManualDate(f.fecha, movil) : '—'}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="amx-kardex-nota">En existencia en el último inventario de su sucursal</p>
      </div>
    </section>
  );
}
window.AlmacenSucursales = AlmacenSucursales;

// CLASIFICACIÓN LEGAL: los sellos de la ficha estampados en una hoja de oficio.
// Por debajo de 1024 px el sello dice la palabra corta (CIVIL…); por encima, la
// etiqueta completa de los datos. Las dos van en el DOM y el CSS enseña una; el
// nombre accesible es siempre la etiqueta completa con su cifra.
function HojaClasificacion({ filas, onAbrir }) {
  return (
    <ul className="amx-oficio amx-clasif">
      {filas.map((f) => {
        const s = SELLOS[f.id] || SELLOS.dcam;
        return (
          <li key={f.id}>
            <button type="button" className="amx-clasif-renglon" onClick={() => onAbrir(f.id)}
              aria-label={`${f.label} — ${f.armas} ${f.armas === 1 ? 'arma' : 'armas'}`}
              aria-describedby={'amx-clasif-desc-' + f.id}>
              <span className={'amx-sello amx-sello--' + s.tono + ' amx-clasif-sello'} aria-hidden="true">
                <span className="amx-clasif-corto">{s.texto}</span>
                <span className="amx-clasif-largo">{f.label}</span>
              </span>
              <span className="amx-clasif-desc" id={'amx-clasif-desc-' + f.id}>{f.desc}</span>
              <span className="amx-clasif-cifra">{Number(f.armas).toLocaleString('es-MX')}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
window.HojaClasificacion = HojaClasificacion;

// CALIBRE: un solo mostrador de madera que se desliza de lado (la repisa de la
// vitrina de la ficha, sin su marco). Cada cartucho de pie sobre la tabla a
// escala real (`--escala` = largo ÷ el más largo), con su etiqueta de cartón
// delante y la luz de los puestos detrás. Sin foto, la silueta de pie.
function MostradorCalibres({ calibres, onAbrir }) {
  return (
    <div className="amx-repisa-fila amx-mostrador" role="region" aria-label="Calibres" tabIndex={0}>
      <ul className="amx-repisa-carril">
        {calibres.map((c) => (
          <li key={c.id} className="amx-articulo-celda amx-mostrador-celda">
            <button type="button" className="amx-articulo" onClick={() => onAbrir(c.id)}
              aria-label={`${c.label} — ${c.armas} ${c.armas === 1 ? 'arma' : 'armas'}`}>
              <span className="amx-articulo-foto">
                <span className="amx-puesto-luz" aria-hidden="true" />
                <img src={c.foto || 'imagenes/cartuchos/silueta-vertical.webp'} alt="" loading="lazy"
                  style={{ '--escala': c.escala }} />
              </span>
              <span className="amx-etiqueta">
                <span className="amx-etiqueta-calibre">{c.label}</span>
                <span className="amx-etiqueta-armas">{c.armas} {c.armas === 1 ? 'arma' : 'armas'}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
window.MostradorCalibres = MostradorCalibres;

// ──────────────────────────────────────────────────────────────
// LOS FILTROS DE LOS CATÁLOGOS (16-sep-2026)
// Decidido con Saulo pregunta por pregunta y con maqueta (docs/DESIGN.md §5.10).
// Armas y municiones: una tira de chips que se desliza; el chip sin filtro es
// una etiqueta de papel y con filtro, la cinta Dymo rotulada con el valor y su
// ✕. Cada chip abre DEBAJO una hoja que empuja el catálogo: casillas de
// formulario (una sola opción), la regla de precio o los renglones de «Más».
// Las cuentas viven en src/lib/filtros.js; la piel, en estilo.css, bloque del
// mismo nombre.
// ──────────────────────────────────────────────────────────────

// El rango de precio de un catálogo. Los límites salen de los precios que dejan
// los DEMÁS filtros (`precios`, memoizado por la pantalla) y el rango vuelve a
// los límites cuando estos cambian: la regla de siempre del catálogo.
function useRangoPrecio(precios, paso, tope) {
  const limites = React.useMemo(() => window.amxLimitesPrecio(precios, { paso, tope }), [precios, paso, tope]);
  const [rango, setRango] = React.useState([limites.min, limites.max]);
  const previo = React.useRef(limites);
  const cambio = previo.current.min !== limites.min || previo.current.max !== limites.max;
  if (cambio) {
    previo.current = limites;
    setRango([limites.min, limites.max]);
  }
  const lo = cambio ? limites.min : rango[0];
  const hi = cambio ? limites.max : rango[1];
  return {
    limites, lo, hi, paso,
    activo: lo > limites.min || hi < limites.max,
    cambiar: (a, b) => setRango([a, b]),
    reiniciar: () => setRango([limites.min, limites.max]),
    deja: (p) => window.amxDentroDePrecio(p, lo, hi, limites),
  };
}
window.useRangoPrecio = useRangoPrecio;

// Las opciones de un filtro: casillas de formulario, «Todos» primero. Una sola
// opción; la marcada lleva ✕ dentro de su casilla (lo pone el CSS).
function CasillasFiltro({ filtro, valor, onElegir }) {
  const opciones = [{ id: 'all', label: filtro.todos }].concat(filtro.opciones);
  return (
    <div className="amx-casillas" role="radiogroup" aria-label={filtro.label}>
      {opciones.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={valor === o.id}
          className="amx-casilla" onClick={() => onElegir(o.id)}>
          <span className="amx-casilla-caja" aria-hidden="true" />
          {o.label}
        </button>
      ))}
    </div>
  );
}
window.CasillasFiltro = CasillasFiltro;

// La regla de precio: marcas con número, el riel con el tramo elegido en tinta y
// dos cursores sobre <input type="range"> nativos (dedo y teclado). Arriba queda
// el cursor bajo cuando ya pasó de la mitad, para que siempre se pueda agarrar.
function ReglaPrecio({ uid, precio, formato }) {
  const { limites, lo, hi, paso } = precio;
  const { min, max } = limites;
  const ancho = max - min || 1;
  const pct = (v) => ((v - min) / ancho) * 100;
  const dicho = (v) => '$' + Math.round(v).toLocaleString('es-MX');
  return (
    <div className="amx-regla" style={{ '--lo': pct(lo) + '%', '--hi': pct(hi) + '%' }}>
      <div className="amx-regla-marcas" aria-hidden="true">
        {window.amxMarcasRegla(min, max, paso).map((m) => {
          const x = pct(m.valor);
          return (
            <React.Fragment key={m.valor}>
              <span className={'amx-regla-marca' + (m.mayor ? ' amx-regla-marca--mayor' : '')} style={{ '--x': x + '%' }} />
              {m.mayor && (
                <span className={'amx-regla-num' + (x < 6 ? ' amx-regla-num--ini' : x > 94 ? ' amx-regla-num--fin' : '')}
                  style={{ '--x': x + '%' }}>{window.amxNumeroMarca(m.valor, limites, formato)}</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div className="amx-regla-riel" aria-hidden="true" />
      <input type="range" className="amx-regla-cursor" id={uid + '-precio-lo'}
        min={min} max={max} step={paso} value={lo} aria-label="Precio mínimo"
        aria-valuetext={dicho(lo)}
        style={{ '--z': lo - min > ancho / 2 ? 3 : 1 }}
        onChange={(e) => precio.cambiar(Math.max(min, Math.min(Number(e.target.value), hi - paso)), hi)} />
      <input type="range" className="amx-regla-cursor" id={uid + '-precio-hi'}
        min={min} max={max} step={paso} value={hi} aria-label="Precio máximo"
        aria-valuetext={dicho(hi) + (limites.conTope && hi >= max ? '+' : '')}
        style={{ '--z': 2 }}
        onChange={(e) => precio.cambiar(lo, Math.min(max, Math.max(Number(e.target.value), lo + paso)))} />
    </div>
  );
}
window.ReglaPrecio = ReglaPrecio;

// La tira completa: chips, la hoja del chip abierto y el renglón del conteo.
//   uid         prefijo de ids (la hoja, los cursores)
//   orden       ids de los chips en orden; 'precio' y 'mas' son especiales
//   mas         ids que van en los renglones de «Más»
//   filtros     { id: { label, chip?, todos, opciones: [{ id, label, corto? }] } }
//   valores     { id: valor | 'all' } · onCambiar(id, valor)
//   precio      lo que devuelve useRangoPrecio · formato 'miles' | 'pesos' · tituloPrecio
//   conteo      { n, nombres: [singular, plural] } · activos · hayTexto · onLimpiar
function TiraFiltros({ uid, orden, mas = [], filtros, valores, onCambiar, precio, formato, tituloPrecio,
  conteo, activos, hayTexto, onLimpiar }) {
  const [abierto, setAbierto] = React.useState(null);
  const [renglon, setRenglon] = React.useState(null);
  const tiraRef = React.useRef(null);
  const hojaRef = React.useRef(null);
  const chipsRef = React.useRef({});
  const focoRef = React.useRef(null);
  const antesRef = React.useRef(null);
  const entra = abierto !== null && antesRef.current !== abierto;
  const idHoja = uid + '-hoja';

  const rotulo = (f, v) => { const o = f.opciones.find((x) => x.id === v); return o ? (o.corto || o.label) : v; };
  const alternar = (id) => { setAbierto(abierto === id ? null : id); setRenglon(null); };
  const cerrar = () => { focoRef.current = abierto; setAbierto(null); setRenglon(null); };
  const elegir = (id, v) => { onCambiar(id, v); focoRef.current = id; setAbierto(null); };
  const quitar = (id) => {
    if (id === 'precio') precio.reiniciar(); else onCambiar(id, 'all');
    focoRef.current = id;
    if (abierto === id) setAbierto(null);
  };

  // La muesca bajo su chip, la hoja alineada con él en escritorio y el degradado
  // del borde de la tira. Escribe custom properties: deslizar no re-renderiza.
  const colocar = React.useCallback(() => {
    const tira = tiraRef.current;
    if (!tira) return;
    tira.parentElement.style.setProperty('--fade', tira.scrollLeft + tira.clientWidth >= tira.scrollWidth - 2 ? '0' : '1');
    const hoja = hojaRef.current;
    const chip = abierto && chipsRef.current[abierto];
    if (!hoja || !chip) return;
    hoja.style.setProperty('--hoja-x', '0px');
    const hueco = hoja.parentElement;
    const h = hueco.getBoundingClientRect();
    const margen = parseFloat(getComputedStyle(hueco).paddingLeft) || 0;
    const c = chip.getBoundingClientRect();
    const ancho = hoja.offsetWidth;
    const x = Math.max(0, Math.min(c.left - h.left - margen, h.width - 2 * margen - ancho));
    hoja.style.setProperty('--hoja-x', x + 'px');
    hoja.style.setProperty('--muesca', Math.max(18, Math.min(c.left + c.width / 2 - (h.left + margen + x), ancho - 18)) + 'px');
  }, [abierto]);

  React.useLayoutEffect(() => {
    const tira = tiraRef.current;
    const chip = abierto && chipsRef.current[abierto];
    if (entra && tira && chip) {
      const izq = chip.offsetLeft - 16;
      const der = chip.offsetLeft + chip.offsetWidth + 16 - tira.clientWidth;
      if (izq < tira.scrollLeft) tira.scrollLeft = izq;
      else if (der > tira.scrollLeft) tira.scrollLeft = der;
    }
    antesRef.current = abierto;
    colocar();
    if (focoRef.current) {
      const el = chipsRef.current[focoRef.current];
      focoRef.current = null;
      const boton = el && (el.tagName === 'BUTTON' ? el : el.querySelector('button'));
      if (boton) boton.focus({ preventScroll: true });
    }
  });
  React.useEffect(() => {
    window.addEventListener('resize', colocar);
    return () => window.removeEventListener('resize', colocar);
  }, [colocar]);

  const pintarChip = (id) => {
    const ab = abierto === id;
    const ref = (el) => { chipsRef.current[id] = el; };
    const flecha = <span className="amx-chip-flecha" aria-hidden="true">{ab ? '▴' : '▾'}</span>;
    const abre = { type: 'button', 'aria-expanded': ab, 'aria-controls': idHoja, onClick: () => alternar(id) };
    if (id === 'mas') {
      const n = mas.filter((m) => valores[m] !== 'all').length;
      return (
        <button key={id} ref={ref} className={'amx-chip' + (ab ? ' amx-chip--abierto' : '')} {...abre}>
          Más{n > 0 && <span className="amx-chip-n">· {n}</span>}{flecha}
        </button>
      );
    }
    const f = id === 'precio' ? { label: 'Precio' } : filtros[id];
    const activo = id === 'precio' ? precio.activo : valores[id] !== 'all';
    if (!activo) {
      return (
        <button key={id} ref={ref} className={'amx-chip' + (ab ? ' amx-chip--abierto' : '')} {...abre}>
          {f.chip || f.label}{flecha}
        </button>
      );
    }
    const valor = id === 'precio' ? window.amxRotuloRango(precio.lo, precio.hi, precio.limites, formato) : rotulo(f, valores[id]);
    return (
      <span key={id} ref={ref} className={'amx-chip-dymo' + (ab ? ' amx-chip-dymo--abierto' : '')}>
        <button className="amx-chip-dymo-valor" aria-label={f.label + ': ' + valor + '. Cambiar'} {...abre}>
          {valor}{flecha}
        </button>
        <button type="button" className="amx-chip-dymo-quitar" aria-label={'Quitar ' + f.label} onClick={() => quitar(id)}>✕</button>
      </span>
    );
  };

  let hoja = null;
  if (abierto) {
    let titulo;
    let cuerpo;
    if (abierto === 'precio') {
      titulo = tituloPrecio;
      cuerpo = (
        <React.Fragment>
          <output className="amx-regla-lectura" htmlFor={uid + '-precio-lo ' + uid + '-precio-hi'}>
            {window.amxLecturaRango(precio.lo, precio.hi, precio.limites)}
          </output>
          <ReglaPrecio uid={uid} precio={precio} formato={formato} />
        </React.Fragment>
      );
    } else if (abierto === 'mas') {
      titulo = 'Más filtros';
      cuerpo = (
        <div className="amx-mas-renglones">
          {mas.map((id) => {
            const f = filtros[id];
            const ab = renglon === id;
            const act = valores[id] !== 'all';
            return (
              <div key={id} className="amx-mas-grupo">
                <button type="button" ref={(el) => { chipsRef.current['r-' + id] = el; }}
                  className={'amx-mas-renglon' + (act ? ' amx-mas-renglon--activo' : '')}
                  aria-expanded={ab} onClick={() => setRenglon(ab ? null : id)}>
                  <span className="amx-mas-nombre">{f.label}</span>
                  <span className="amx-mas-puntos" aria-hidden="true" />
                  <span className="amx-mas-valor">{act ? rotulo(f, valores[id]) : f.todos}</span>
                  <span className="amx-chip-flecha" aria-hidden="true">{ab ? '▾' : '▸'}</span>
                </button>
                {ab && (
                  <CasillasFiltro filtro={f} valor={valores[id]}
                    onElegir={(v) => { onCambiar(id, v); focoRef.current = 'r-' + id; setRenglon(null); }} />
                )}
              </div>
            );
          })}
        </div>
      );
    } else {
      titulo = filtros[abierto].label;
      cuerpo = <CasillasFiltro filtro={filtros[abierto]} valor={valores[abierto]} onElegir={(v) => elegir(abierto, v)} />;
    }
    hoja = (
      <div className="amx-filtros-hueco">
        <div ref={hojaRef} id={idHoja} role="region" aria-label={titulo}
          className={'amx-hoja-filtro' + (entra ? ' amx-hoja-filtro--entra' : '')}>
          <div className="amx-hoja-filtro-cab">
            <span className="amx-hoja-filtro-titulo">{titulo}</span>
            <button type="button" className="amx-filtros-enlace" onClick={cerrar}>Cerrar</button>
          </div>
          {cuerpo}
        </div>
      </div>
    );
  }

  const texto = window.amxTextoConteo(conteo.n, activos, conteo.nombres);
  return (
    <div className="amx-filtros"
      onKeyDown={(e) => { if (e.key === 'Escape' && abierto) { e.stopPropagation(); cerrar(); } }}>
      <div className="amx-filtros-envoltura">
        <div ref={tiraRef} className="amx-filtros-tira" role="group" aria-label="Filtros" onScroll={colocar}>
          {orden.map((id) => pintarChip(id))}
        </div>
      </div>
      {hoja}
      <div className="amx-filtros-conteo">
        <p className="amx-filtros-conteo-texto" aria-live="polite">
          <span aria-hidden="true">▸ </span><b>{texto.cifra}</b> {texto.resto}
        </p>
        {(activos > 0 || hayTexto) && (
          <button type="button" className="amx-filtros-enlace"
            onClick={() => { setAbierto(null); setRenglon(null); focoRef.current = orden[0]; onLimpiar(); }}>Limpiar</button>
        )}
      </div>
    </div>
  );
}
window.TiraFiltros = TiraFiltros;
