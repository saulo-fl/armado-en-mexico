// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

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
function CalibresScreen({ onNav, onAbrirCalibre }) {
  const vp = window.useViewport();
  const padX = vp.isDesktop ? 28 : 16;
  const guia = useMemo3(() => window.amxGuiaCalibres(window.CALIBRES || [], window.DB || []), []);
  const [soloCiviles, setSoloCiviles] = useState3(false);
  const [clase, setClase] = useState3('');
  const clases = useMemo3(() => Array.from(new Set(guia.map((c) => c.clase))), [guia]);
  const lista = window.amxFiltrarCalibres(guia, { avail: soloCiviles ? 'dcam' : '', clase: clase });
  const abrir = (id) => onAbrirCalibre && onAbrirCalibre(id);

  // La mesa se dibuja con la misma primitiva del hub del Arsenal. Sin foto, la
  // silueta de pie: 11 de los 30 calibres todavía no tienen la suya.
  const mesa = lista.map((c) => ({
    id: c.id, label: c.id, armas: c.armas, escala: c.escala,
    foto: c.cartucho || 'imagenes/cartuchos/silueta-vertical.webp',
  }));

  const chip = (activo, texto, alClic) => (
    <button key={texto} type="button" onClick={alClic} aria-pressed={activo}
      className={'amx-calchip' + (activo ? ' amx-calchip--on' : '')}>{texto}</button>
  );

  return (
    <div style={{ padding: `20px ${padX}px 90px`, maxWidth: 1100, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <h1 className="amx-cal-titulo">Guía de calibres</h1>
      <p className="amx-cal-entrada" style={window.amxProsa({ maxWidth: 640 })}>
        Treinta cartuchos: qué son, qué tan fuerte pega cada uno y cuáles puede comprar
        un civil en México. Las cifras son de una carga comercial corriente y cada ficha
        dice de dónde salen.
      </p>

      <div className="amx-calchips" role="group" aria-label="Filtros de la guía">
        {chip(!soloCiviles && !clase, 'Todos', () => { setSoloCiviles(false); setClase(''); })}
        {chip(soloCiviles, 'Solo civiles', () => setSoloCiviles(!soloCiviles))}
        {clases.map((cl) => chip(clase === cl, cl, () => setClase(clase === cl ? '' : cl)))}
      </div>

      <window.CintaDymo chica>De menor a mayor</window.CintaDymo>
      <p className="amx-cal-pie-mesa">Cada cartucho, a su tamaño real comparado con los demás.</p>
      {mesa.length > 0
        ? <window.MostradorCalibres calibres={mesa} onAbrir={abrir} />
        : <p className="amx-cal-vacio">Ningún calibre cumple ese filtro.</p>}

      <window.CintaDymo chica>Las fichas</window.CintaDymo>
      <div className="amx-cal-rejilla">
        {lista.map((c) => <CaliberMiniCard key={c.id} cal={c} onClick={() => abrir(c.id)} />)}
      </div>

      <window.CintaDymo chica>Para empezar</window.CintaDymo>
      <div className="amx-cal-lecciones">
        {(window.LECCIONES_CALIBRE || []).map((l) => (
          <window.FolderPregunta key={l.titulo} pregunta={l.titulo} tema={l.tema}>
            {l.cuerpo.map((p, i) => <p key={i} style={window.amxProsa({ marginTop: i ? 10 : 0 })}>{p}</p>)}
          </window.FolderPregunta>
        ))}
      </div>

      <window.ReportarError tipo="calibres" titulo="Guía de calibres" ruta="/calibres" />
    </div>
  );
}
window.CalibresScreen = CalibresScreen;

// Escala real de cartuchos — la altura de la imagen es proporcional a la longitud
// total real del cartucho (mm), la misma en toda la app. La usa la tarjeta de la
// portada; la guía y el hub del Arsenal calculan la suya con amxEscalaCartucho.
const CARTUCHO_MAX_MM = 84.8;          // .30-06 / .270 / 7mm Rem / .300 WM
const CARTUCHO_HOME_MAXH = 120;

// ═══════════════════════════════════════════════════════════════════════
// FICHA DE UN CALIBRE — /calibres/<slug>
// El expediente de un cartucho: su tamaño real sobre la regla, sus cifras
// situadas entre las de los otros 29, lo que la ley mexicana dice de él y las
// armas del catálogo que lo usan.
// ═══════════════════════════════════════════════════════════════════════
function CalibreScreen({ calibreId, onOpenArma, onNav }) {
  const vp = window.useViewport();
  const padX = vp.isDesktop ? 28 : 16;
  const guia = useMemo3(() => window.amxGuiaCalibres(window.CALIBRES || [], window.DB || []), []);
  const cal = guia.find((c) => c.id === calibreId);
  const rango = useMemo3(() => window.amxRangoCalibres(guia), [guia]);
  const mmMax = useMemo3(() => guia.reduce((m, c) => Math.max(m, c.mm || 0), 0), [guia]);

  if (!cal) {
    return (
      <div style={{ padding: `20px ${padX}px 90px`, maxWidth: 720, margin: '0 auto' }}>
        <p style={window.amxProsa({})}>Ese calibre no está en la guía.</p>
        <button type="button" className="amx-calchip" onClick={() => onNav && onNav('calibres')}>Ver los 30 calibres</button>
      </div>
    );
  }

  const armas = armasPorCalibre(cal.id);
  const visibles = armas.slice(0, 6);
  const sello = (window.SELLOS_LEGALES || {})[cal.avail];

  return (
    <div style={{ padding: `20px ${padX}px 90px`, maxWidth: 900, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div className="amx-calficha">
        <div className="amx-calficha-cabeza">
          <div>
            <div className="amx-calficha-clase">{cal.clase} · {cal.sistema}</div>
            <h1 className="amx-calficha-id">{cal.id}</h1>
            <div className="amx-calficha-uso">{cal.uso}</div>
            {cal.alias && cal.alias.length > 0
              ? <div className="amx-calficha-alias">También se le llama {cal.alias.join(', ')}</div>
              : null}
          </div>
          {sello
            ? <window.SelloLegal avail={cal.avail} etiqueta={cal.legalArt} grande />
            : <span className="amx-calficha-sinsello">Clasificación pendiente</span>}
        </div>

        <p style={window.amxProsa({ marginTop: 14 })}>{cal.desc}</p>

        <window.ReglaCartucho calibre={cal} escala={cal.escala} mmMax={mmMax} />

        <div className="amx-calficha-specs">
          <window.SpecRow label="Velocidad" value={cal.velocidad} />
          <window.SpecRow label="Energía" value={cal.energia} />
          <window.SpecRow label="Retroceso" value={cal.retroceso} />
          <window.SpecRow label="En el catálogo" value={armas.length === 0 ? 'No se vende en DCAM' : armas.length + (armas.length === 1 ? ' arma' : ' armas')} />
        </div>

        {typeof cal.energiaJ === 'number' && rango.energia.max > 0
          ? <window.ReglaComparativa titulo="Energía frente a los otros 29"
              valor={cal.energiaJ} min={rango.energia.min} max={rango.energia.max}
              unidad="J" fuente={cal.fuente} />
          : <p className="amx-calficha-nota" style={window.amxProsa({})}>
              La energía de una escopeta no se compara con la de una bala única: depende
              de la carga de perdigón y va repartida en cientos de municiones.
            </p>}

        <div className="amx-calficha-legal">
          <div className="amx-calficha-legal-tit">Qué dice la ley mexicana</div>
          <p style={window.amxProsa({})}>{cal.legalNota}</p>
          <div className="amx-calficha-legal-art">{cal.legalArt}</div>
          <button type="button" className="amx-calchip" onClick={() => onNav && onNav('legal')}>
            Ver la pantalla de Legalidad
          </button>
        </div>

        {visibles.length > 0 ? (
          <div className="amx-calficha-armas">
            <window.CintaDymo chica>Armas que lo usan</window.CintaDymo>
            <DragScroll style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
              {/* ArmaPolaroid no recibe onClick: el clic va en el botón que la envuelve. */}
              {visibles.map((a) => (
                <button key={a.id} type="button" className="amx-calficha-arma"
                  onClick={() => onOpenArma && onOpenArma(a.id)} aria-label={a.nombre}>
                  <window.ArmaPolaroid arma={a} />
                </button>
              ))}
            </DragScroll>
            {armas.length > visibles.length ? (
              <button type="button" className="amx-calchip"
                onClick={() => onNav && onNav('category', { mode: 'calibre', value: cal.id })}>
                Ver las {armas.length} en el Arsenal
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Viene del rediseño de soporte (#242): ahora que cada calibre tiene su
          propia dirección, la corrección apunta a la ficha y no a un ancla. */}
      <window.ReportarError tipo="calibre" titulo={cal.id}
        ruta={'/calibres/' + window.amxSlug(cal.id)} />
    </div>
  );
}
window.CalibreScreen = CalibreScreen;

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
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TARJETAS COMPACTAS PARA LA HOME (carruseles)
// ═══════════════════════════════════════════════════════════════════════
function CaliberMiniCard({ cal, onClick }) {
  const n = armasPorCalibre(cal.id).length;
  // La altura del cartucho sigue siendo PROPORCIONAL A LOS MILIMETROS reales:
  // esa decisión es anterior y no la toca el rediseño. Lo que cambia es dónde
  // se apoya — ahora dentro del marco de época, en vez de un hueco gris.
  const alto = Math.round(((cal.mm || 40) / CARTUCHO_MAX_MM) * CARTUCHO_HOME_MAXH);
  const abrir = (e) => { e.preventDefault(); onClick && onClick(); };
  return (
    <div className="amx-calibre" role="button" tabIndex={0}
      onClick={abrir}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') abrir(e); }}
      aria-label={[cal.id, cal.sistema, cal.uso, n + (n === 1 ? ' arma' : ' armas')]
        .filter(Boolean).join(', ')}>
      <div className="amx-calibre-datos">
        <div className="amx-calibre-sistema">{cal.sistema}</div>
        <div className="amx-calibre-id">{cal.id}</div>
        <div className="amx-calibre-uso">{cal.uso}</div>
        <div className="amx-calibre-n">{n} arma{n === 1 ? '' : 's'} →</div>
      </div>
      <div className="amx-calibre-marco">
        <img src={cal.cartucho || 'imagenes/cartuchos/silueta-vertical.webp'} alt={`Cartucho ${cal.id}`} loading="lazy"
          style={{ height: alto }} />
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
// Cinco ángulos, entre 1° y 2° y alternando el signo, repartidos por índice:
// «están muy perfectas en su alineación, añade un poco de jittering» (Saulo,
// 9-sep-2026). DETERMINISTA y no aleatorio a propósito: con `Math.random` las
// copias saltarían de ángulo en cada repintado del carrusel.
//
// Cinco y no cuatro para que el ciclo no cuadre con la fila de 4. El índice lo
// da el carrusel y empieza en 0 en CADA sección, así que Experiencias entra
// desplazada dos posiciones desde el Home para no repetir la misma tirada.
const GIROS_COPIA = ['-1.4deg', '1.1deg', '-1.8deg', '1.5deg', '-1deg'];
window.GIROS_COPIA = GIROS_COPIA;

function ProximamenteCard({ img, i = 0 }) {
  // Es una POLAROID APAISADA, no una tarjeta. Saulo, 9-sep-2026: «reemplazar
  // los marcos perfectos de CAMPOS DE TIRO y EXPERIENCIAS por marcos de
  // polaroid horizontales para mantener la estética de todo el HOME». Reusa
  // `.amx-polaroid` —la misma copia instantánea de la ficha de arma— con el
  // modificador que le pone el pozo a 16/9: ni un token ni una sombra nuevos.
  //
  // El «Próximamente» baja al FALDÓN, que es donde se rotula una copia a
  // mano. Antes era una banda de interfaz pegada bajo la foto.
  return (
    <figure className="amx-polaroid amx-polaroid--apaisada"
      style={{ '--giro': GIROS_COPIA[i % GIROS_COPIA.length] }}>
      <div className="amx-polaroid-pozo">
        {img ? (
          <React.Fragment>
            {/* La foto viene YA difuminada, desaturada y con el contraste
                bajado desde el pipeline de imágenes (Pillow: blur 3.2,
                saturación .32, contraste .72). Se procesa en origen y no con
                `filter` de CSS a propósito: un blur en runtime se repinta en
                cada scroll y estas tarjetas van dentro de un carrusel. De paso
                pesan 3-7 KB cada una. */}
            <img src={img} alt="" aria-hidden="true" loading="lazy" decoding="async" />
            <div className="amx-polaroid-velo" aria-hidden="true" />
          </React.Fragment>
        ) : (
          <span aria-hidden="true" style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 42,
            color: 'var(--copia-silueta)', lineHeight: 1,
          }}>?</span>
        )}
      </div>
      <figcaption className="amx-polaroid-pie">
        <span className="amx-polaroid-nombre">Próximamente</span>
      </figcaption>
    </figure>
  );
}
window.ProximamenteCard = ProximamenteCard;
