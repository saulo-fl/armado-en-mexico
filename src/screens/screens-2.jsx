// Armado en México — Pantallas de Producto, Comparador, Legal, FAQ, Acerca

const { useState: useState2, useMemo: useMemo2 } = React;

// ════════════════════════════════════════════════════════════════
// PRODUCT — la ficha de un arma: el expediente completo
// Rediseño del 13-sep-2026, decidido con Saulo sección por sección. Qué papel
// es cada dato, cómo cambia entre móvil y escritorio y qué pasa en el tema
// oscuro está explicado en estilo.css, bloque «LA FICHA DE ARMA», y en
// docs/DESIGN.md §4.3. Aquí solo vive lo que depende del dato.
// ════════════════════════════════════════════════════════════════

function ProductScreen({ armaId, onOpenArma, onOpenAccesorio, onOpenMunicion, onNav, compareIds, toggleCompare }) {
  const vp = window.useViewport();
  // Las opiniones llegan en la hidratacion desde /api/state, DESPUES del primer
  // render. Sin esta suscripcion la etiqueta de la copia se quedaba vacia hasta
  // que el usuario navegaba a otra pantalla y volvia.
  const [, forceProd] = useState2(0);
  useEffect(() => window.Store && window.Store.onChange(() => forceProd((x) => x + 1)), []);
  const arma = window.findArma(armaId);

  // La pestaña abierta: Legalidad (la 0) al llegar y al pasar de un arma a otra.
  const [tab, setTab] = useState2(0);

  useEffect(() => {
    if (arma && window.Store) window.Store.trackVisit(arma.id);
  }, [arma?.id]);
  useEffect(() => { setTab(0); }, [armaId]);

  // El talón fijo de abajo (móvil): ver useTalonFijo en ui.jsx.
  const talon = window.useTalonFijo(armaId);

  if (!arma) return <div style={{ padding: 40, color: PALETTE.text }}>Arma no encontrada</div>;

  const inCmp = compareIds.includes(arma.id);
  // Un solo corte, el del expediente: 1024px. `vp.isDesktop` corta a 900 y deja
  // una franja con las dos columnas del CSS apagadas y el espaciado de escritorio.
  const ancho = vp.width >= 1024;
  const PAD = ancho ? 28 : 16;
  const SEC = ancho ? 52 : 34;   // aire ENTRE secciones fuera del folder

  const priceHistory = window.Store ? window.Store.getPriceHistory(arma.id) : [];
  const manuales = window.Store ? window.Store.getManuales() : [];
  const manualById = (id) => (id ? manuales.find((m) => m.id === id) : null) || null;
  // Precio vigente, su fuente, «último precio conocido» y existencias por
  // sucursal. La regla vive en src/lib/cotejo.js porque el comparador enseña lo
  // mismo, y dos copias acabarían diciendo cosas distintas de la misma arma.
  const inv = window.amxInventarioArma(arma, {
    priceHistory, manuales,
    existenciasDCAM: window.getArmaExistencias ? window.getArmaExistencias(arma.id) : null,
    autoridad: window.manualAutoridad,
  });
  const curSigla = inv.sigla;
  const precioActual = inv.precio;
  const fechaPrecio = inv.manual ? amxFmtManualDate(inv.manual.fecha) : '';
  const branches = inv.sucursales;
  const ultimoConocido = inv.ultimoConocido;

  const related = window.DB.filter((a) => a.tipo === arma.tipo && a.id !== arma.id).slice(0, 4);
  const compat = window.getAccesoriosCompatibles ? window.getAccesoriosCompatibles(arma) : [];
  const muns = window.getMunicionesParaArma ? window.getMunicionesParaArma(arma) : [];
  const opin = window.Store ? window.Store.getOpiniones('arma', arma.id) : { up: 0, down: 0, total: 0, lista: [] };
  const etOpin = window.amxOpinionLabel(opin.up, opin.down);
  const SELLOS = window.SELLOS_LEGALES || {};
  const sello = SELLOS[arma.avail] || SELLOS.dcam || { texto: 'CIVIL', tono: 'civil' };

  // `statsKeys` vivía aquí para la valoración divulgativa, retirada el
  // 7-sep-2026 (las barras se derivaban por tipo y calibre, no de mediciones).
  // El rótulo del tipo para la pestaña del folder. En singular y acentuado:
  // `CATEGORIES.tipo` guarda los rótulos en plural y despluralizar «Rifles» y
  // «Revólveres» con la misma regla no sale (uno pierde la «s», el otro «es»).
  const TIPO_SINGULAR = {
    pistola: 'Pistola', revolver: 'Revólver', rifle: 'Rifle',
    escopeta: 'Escopeta', carabina: 'Carabina' };
  const tipoRotulo = TIPO_SINGULAR[arma.tipo] || arma.tipo || 'Expediente';

  const comparar = () => toggleCompare(arma.id);

  return (
    <div style={{ paddingBottom: 90 }}>
     <div ref={talon.fichaRef} style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>

      {/* ── EL EXPEDIENTE — el folder manila abierto ───────────────────── */}
      <div style={{ padding: `${ancho ? 26 : 14}px ${PAD}px 0` }}>
        <article className="amx-carpeta" aria-labelledby="ficha-nombre">
          {/* El tipo, rotulado sobre la pestaña de la foto. El folio `AR-####`
              que iba aquí se retiró el 7-sep-2026: un código de expediente que
              no corresponde a ningún registro real es decoración que finge ser
              dato. El tipo sí dice algo verdadero. */}
          {/* Sin aria-hidden: es el único sitio de la ficha donde se dice el tipo
              (el h1 lleva solo el nombre y la ficha técnica no tiene fila Tipo). */}
          <span className="amx-carpeta-rotulo">{tipoRotulo}</span>

          {/* Las celdas van en el orden de lectura del teléfono. En escritorio
              estilo.css las reparte por filas en las dos solapas (Saulo,
              13-sep-2026): foto | ficha técnica y comprobante | tarjeta de
              almacén a la vista al abrir, y al bajar, Legalidad · Usos ·
              Antecedentes | historial. Nada se queda fijo al hacer scroll: son
              papeles sobre un folder, y una columna fija rompía esa ficción. */}
          <div className="amx-carpeta-grid">
            <header className="amx-carpeta-cab">
              <h1 id="ficha-nombre" className="t-titulo">{arma.nombre}</h1>
            </header>

            {/* La situación legal la dice el sello, y entera la hoja de
                Legalidad: la línea «Exclusivo — Fuerzas Armadas» y el enlace
                «§ Ver situación legal» que iban bajo la copia la repetían. */}
            <div className="amx-carpeta-foto">
              <div className="amx-copia">
                <span className="amx-copia-clip" aria-hidden="true" />
                <window.ArmaPolaroid arma={arma} selloSinFoto />
                {/* El sello se estampa al llegar. La `key` lo vuelve a estampar
                    al pasar de un arma a otra desde «Armas similares». */}
                <span className="amx-copia-sello">
                  <window.SelloLegal key={arma.id} avail={arma.avail} etiqueta={arma.availLabel}
                    className="amx-sello--estampa" />
                </span>
              </div>
            </div>

            <div className="amx-carpeta-ficha">
              <window.FichaTecnica arma={arma} />
            </div>

            <div className="amx-carpeta-talon">
              <window.TalonComprobante talonRef={talon.talonRef}
                precio={precioActual} fuente={curSigla} fecha={fechaPrecio}
                ultimoConocido={ultimoConocido} historial={priceHistory}
                enComparacion={inCmp} onComparar={comparar} />
              {/* Lo que opina la comunidad, junto al precio: la pregunta «¿vale
                  la pena?» se responde aquí y no al final de la página. */}
              {etOpin.hay &&
                <p className="amx-copia-opinion">Opiniones: <b>{etOpin.label}</b></p>}
            </div>

            <div className="amx-carpeta-almacen">
              <window.TarjetaAlmacen filas={branches} referencia={arma.dcamRef}
                sigla={curSigla} nivelPrecio={arma.priceLvl} movil={!ancho} />
            </div>

            <div className="amx-carpeta-legal amx-separadores">
                <window.FichaTabs activo={tab} onCambiar={setTab}>

                  <window.FichaPanel label="Legalidad">
                    <div className={'amx-oficio-banda amx-oficio-banda--' + sello.tono}>
                      <span>Clasificación: {sello.texto}</span>
                      <small>{arma.availLabel}</small>
                    </div>
                    <h3 className="amx-oficio-tit">{arma.legalTit}</h3>
                    <p className="amx-oficio-texto">{arma.legalDesc}</p>
                    {arma.disponibilidad && arma.disponibilidad.length > 0 &&
                      <React.Fragment>
                        <p className="amx-oficio-sub">Dónde se consigue</p>
                        <ul className="amx-oficio-lista">
                          {arma.disponibilidad.map((d, i) => <li key={i}>{d}</li>)}
                        </ul>
                      </React.Fragment>}
                    <button type="button" className="amx-oficio-boton" onClick={() => onNav('legal')}>
                      § Guía legal completa
                    </button>
                  </window.FichaPanel>

                  {arma.uses && arma.uses.length > 0 &&
                    <window.FichaPanel label="Usos">
                      <ul className="amx-usos">
                        {arma.uses.map((u) => {
                          const meta = window.CATEGORIES.uso.find((x) => x.id === u);
                          return <li key={u}><span className="amx-sello">{meta ? meta.label : u}</span></li>;
                        })}
                      </ul>
                    </window.FichaPanel>}

                  {arma.historia &&
                    <window.FichaPanel label="Antecedentes">
                      <p className="amx-oficio-maquina">{arma.historia}</p>
                    </window.FichaPanel>}

                </window.FichaTabs>
            </div>

            {priceHistory.length > 0 &&
              <div className="amx-carpeta-historial">
                <window.HistorialPrecios historial={priceHistory} manualById={manualById}
                  movil={!ancho} />
              </div>}
          </div>
        </article>
      </div>

      {/* ── LA VITRINA — munición y accesorios compatibles ──────────────
          En escritorio las repisas van en filas de seis, cada una con su tabla;
          en móvil cada repisa es una tira que se desliza de lado. */}
      {(muns.length > 0 || compat.length > 0) &&
        <section style={{ padding: `${SEC}px ${PAD}px 0` }} aria-labelledby="ficha-vitrina">
          <window.CintaDymo id="ficha-vitrina">Munición y accesorios</window.CintaDymo>
          <div className="amx-vitrina">
            {muns.length > 0 &&
              <window.Repisa rotulo={'Munición · ' + arma.calibre} items={muns} porFila={ancho ? 6 : 0}
                renderArticulo={(m) => {
                  const foto = window.munFoto ? window.munFoto(m) : { src: m.img };
                  const s = SELLOS[m.avail] || sello;
                  const unidad = window.munUnidadPrecio ? window.munUnidadPrecio(m) : 'cartucho';
                  const precio = m.priceExact ? String(m.priceExact).replace(' MXN', '') : '';
                  return (
                    <window.RepisaArticulo key={m.id} foto={foto.src} silueta="imagenes/silueta-municion.webp"
                      ariaLabel={[m.nombre, s.texto, precio && (precio + ' por ' + unidad)].filter(Boolean).join(', ')}
                      onClick={() => onOpenMunicion && onOpenMunicion(m.id)}
                      etiqueta={<React.Fragment>
                        <span className="amx-etiqueta-marca"><span>{m.marca}</span><i className={'es-' + s.tono}>{s.texto}</i></span>
                        <span className="amx-etiqueta-nombre">{[m.bala, m.grano].filter(Boolean).join(' · ')}</span>
                        {precio && <span className="amx-etiqueta-precio">{precio} <small>/ {unidad}</small></span>}
                      </React.Fragment>} />
                  );
                }} />}
            {compat.length > 0 &&
              <window.Repisa rotulo="Accesorios" items={compat} porFila={ancho ? 6 : 0}
                renderArticulo={(ac) => {
                  const s = SELLOS[ac.avail] || sello;
                  const foto = window.isRealImage && window.isRealImage(ac.img) ? ac.img : '';
                  const precio = ac.priceExact ? String(ac.priceExact).replace(' MXN', '') : '';
                  return (
                    <window.RepisaArticulo key={ac.id} foto={foto}
                      silueta={window.accesorioPlaceholder ? window.accesorioPlaceholder(ac) : ''}
                      ariaLabel={[ac.nombre, ac.marca, s.texto, precio].filter(Boolean).join(', ')}
                      onClick={() => onOpenAccesorio && onOpenAccesorio(ac.id)}
                      etiqueta={<React.Fragment>
                        <span className="amx-etiqueta-marca"><span>{ac.marca}</span><i className={'es-' + s.tono}>{s.texto}</i></span>
                        <span className="amx-etiqueta-nombre">{ac.nombre}</span>
                        {precio && <span className="amx-etiqueta-precio">{precio}</span>}
                      </React.Fragment>} />
                  );
                }} />}
          </div>
        </section>}

      {/* ── LA TELE — el video del modelo (solo si hay) ───────────────── */}
      <YouTubeBlock arma={arma} padX={PAD} gap={SEC} />

      {/* ── LA TARJETA DE COMENTARIOS ─────────────────────────────────── */}
      <section style={{ padding: `${SEC}px ${PAD}px 0` }} aria-labelledby="ficha-opiniones">
        <window.CintaDymo id="ficha-opiniones">Opiniones</window.CintaDymo>
        {/* Centrada en el ancho de la ficha, con sus opiniones publicadas debajo
            a la misma medida (Saulo, 13-sep-2026). */}
        <div className="amx-comentarios-marco">
          <OpinionBlock tipo="arma" entidadId={arma.id} entidadNombre={arma.nombre}
            nombreTipo="arma" onNav={onNav} />
        </div>
      </section>

      {/* ── ARMAS SIMILARES — los expedientes de la Home ─────────────── */}
      {related.length > 0 &&
        <section style={{ padding: `${SEC}px ${PAD}px 0` }} aria-labelledby="ficha-similares">
          <window.CintaDymo id="ficha-similares">Armas similares</window.CintaDymo>
          <div className="amx-hscroll amx-similares" style={{
            display: ancho ? 'grid' : 'flex',
            gridTemplateColumns: ancho ? 'repeat(4, 1fr)' : undefined,
            gap: ancho ? 14 : 10,
            overflowX: ancho ? 'visible' : 'auto',
            margin: ancho ? 0 : `0 -${PAD}px`,
            padding: ancho ? 0 : `0 ${PAD}px 4px`
          }}>
            {related.map((a) =>
              <div key={a.id} style={{ width: ancho ? 'auto' : 300, flexShrink: 0 }}>
                <ArmaCard arma={a}
                  onClick={() => onOpenArma(a.id)}
                  onCompare={() => toggleCompare(a.id)}
                  inCompare={compareIds.includes(a.id)} />
              </div>)}
          </div>
        </section>}
     </div>

      {/* El talón fijo (móvil): el mismo comprobante, en la zona del pulgar.
          Se oculta si el flotante de comparación está activo (mismo hueco). */}
      {!ancho && talon.mostrar && compareIds.length === 0 &&
        <window.TalonComprobante fijo
          precio={precioActual} fuente={curSigla} fecha={fechaPrecio}
          ultimoConocido={ultimoConocido} historial={priceHistory}
          enComparacion={inCmp} onComparar={comparar} />}
    </div>);

}
window.ProductScreen = ProductScreen;

// ════════════════════════════════════════════════════════════════
// OPINION BLOCK — "¿Recomiendas esta arma?" (modelo Steam)
// Sustituye a las estrellas de 1-5 (ago-2026). Una opinión SIN reseña no
// existe: el texto es lo que el moderador juzga y lo que da derecho a contar
// en el agregado. Nada se publica sin aprobación — ver la pantalla de Soporte.
// `nombreTipo` es la palabra de la pregunta, para reutilizar el bloque tal cual
// en las fichas de accesorio, munición, campo y curso.
// Desde el 13-sep-2026 es una TARJETA DE COMENTARIOS: el voto son dos sellos de
// goma y el formulario se escribe sobre renglones. La lógica no cambia.
// ════════════════════════════════════════════════════════════════
const RESENA_MIN = 100, RESENA_MAX = 1200;

function OpinionBlock({ tipo, entidadId, entidadNombre, nombreTipo, onNav }) {
  const [, force] = useState2(0);
  useEffect(() => window.Store && window.Store.onChange(() => force((x) => x + 1)), []);

  const yaOpino = (() => {
    try { return !!localStorage.getItem('amx_op_' + tipo + '_' + entidadId); } catch (e) { return false; }
  })();
  const [enviado, setEnviado] = useState2(yaOpino);
  const [rec, setRec] = useState2(null);          // null | true | false
  const [f, setF] = useState2({ texto: '', autor: '', email: '' });
  const set = (k, v) => setF((p) => Object.assign({}, p, { [k]: v }));

  const op = window.Store ? window.Store.getOpiniones(tipo, entidadId) : { up: 0, down: 0, total: 0, lista: [] };
  const et = window.amxOpinionLabel(op.up, op.down);

  const largo = f.texto.trim().length;
  const correoOk = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(f.email.trim());
  const listo = rec !== null && largo >= RESENA_MIN && largo <= RESENA_MAX &&
    f.autor.trim().length >= 2 && correoOk;

  const enviar = () => {
    if (!listo || !window.Store) return;
    const ok = window.Store.addReview({
      tipo, entidadId, entidadNombre, recomienda: rec,
      texto: f.texto, autor: f.autor, email: f.email,
    });
    if (!ok) return;
    try { localStorage.setItem('amx_op_' + tipo + '_' + entidadId, '1'); } catch (e) {}
    setEnviado(true);
  };

  // El formulario permanece plegado hasta que hay voto: `rec` ya distingue "no ha
  // votado" (null) de "votó", así que el gate no necesita estado propio.
  const hayVoto = rec !== null;
  const femenino = nombreTipo === 'munición' || nombreTipo === 'arma';
  const pron = femenino ? 'la' : 'lo';
  const id = 'op-' + tipo + '-' + entidadId;
  const irANormas = () => onNav && onNav('soporte');

  return (
    <React.Fragment>
      <div className="amx-comentarios">
        <div className="amx-comentarios-cab" aria-hidden="true">
          <span>Tarjeta de comentarios</span>
        </div>

        {enviado ?
          <div className="amx-comentarios-enviado" role="status">
            <span className="amx-sello">En revisión</span>
            <p>
              Tu opinión entró en revisión. Se publicará cuando se compruebe que cumple las{' '}
              <button type="button" className="amx-enlace-tinta" onClick={irANormas}>normas de la comunidad</button>.
            </p>
          </div>
        :
          <div>
            <h3 className="amx-comentarios-pregunta" id={id + '-q'}>
              ¿Recomiendas {femenino ? 'esta' : 'este'} {nombreTipo}?
            </h3>
            <div className="amx-votos" role="group" aria-labelledby={id + '-q'}>
              <button type="button" className="amx-sello-voto amx-sello-voto--si"
                aria-pressed={rec === true} onClick={() => setRec(true)}>
                <span className="amx-sello"><window.ThumbIcon up size={20} />Sí {pron} recomiendo</span>
              </button>
              <button type="button" className="amx-sello-voto amx-sello-voto--no"
                aria-pressed={rec === false} onClick={() => setRec(false)}>
                <span className="amx-sello"><window.ThumbIcon up={false} size={20} />No {pron} recomiendo</span>
              </button>
            </div>

            {hayVoto &&
            <React.Fragment>
              <label className="amx-renglon-etq" htmlFor={id + '-texto'}>Tu reseña *</label>
              <textarea id={id + '-texto'} className="amx-renglon" value={f.texto}
                onChange={(e) => set('texto', e.target.value)}
                rows={4} maxLength={RESENA_MAX} aria-describedby={id + '-cuenta'}
                placeholder="Cuenta tu experiencia con calma: qué tal se maneja, para qué la usas, qué te sorprendió." />
              <p id={id + '-cuenta'} className={'amx-renglon-ayuda' + (largo >= RESENA_MIN ? ' es-ok' : '')}>
                {largo >= RESENA_MIN
                  ? `✓ ${largo} caracteres`
                  : `${largo} / ${RESENA_MIN} mínimo — una reseña más corta no puede contar en la calificación`}
              </p>

              <div className="amx-renglones-2">
                <div>
                  <label className="amx-renglon-etq" htmlFor={id + '-autor'}>Nombre / Apodo *</label>
                  <input id={id + '-autor'} className="amx-renglon" value={f.autor}
                    onChange={(e) => set('autor', e.target.value)} placeholder="Como quieres firmar" />
                </div>
                <div>
                  <label className="amx-renglon-etq" htmlFor={id + '-email'}>Correo electrónico *</label>
                  <input id={id + '-email'} type="email" className="amx-renglon" value={f.email}
                    onChange={(e) => set('email', e.target.value)} placeholder="tucorreo@ejemplo.com"
                    aria-describedby={id + '-correo'} />
                  <p id={id + '-correo'} className="amx-renglon-ayuda">No se publica. Solo para contactarte si hace falta.</p>
                </div>
              </div>

              <div className="amx-comentarios-pie">
                <p>
                  Toda reseña se revisa antes de publicarse.{' '}
                  <button type="button" className="amx-enlace-tinta" onClick={irANormas}>Normas de la comunidad</button>
                </p>
                <button type="button" className="amx-boton-tinta" onClick={enviar} disabled={!listo}>Publicar opinión</button>
              </div>
            </React.Fragment>}
          </div>}
      </div>

      {op.total > 0 &&
        <div style={{ marginTop: 18 }}>
          <window.Disclosure title={`Leer opiniones (${op.total})`}>
            <ul className="amx-tarjetitas">
              {op.lista.slice(0, 20).map((r, i) =>
                <li key={r.id || i} className="amx-tarjetita">
                  <div className="amx-tarjetita-cab">
                    <span className={'amx-sello amx-sello--' + (r.recomienda ? 'civil' : 'restr')}>
                      {r.recomienda ? `${pron === 'la' ? 'La' : 'Lo'} recomienda` : `No ${pron} recomienda`}
                    </span>
                    <span>{amxFmtManualDate(String(r.submittedAt || '').slice(0, 10))}</span>
                  </div>
                  <p>{r.texto}</p>
                  <footer>— {r.autor || 'Anónimo'}</footer>
                </li>
              )}
            </ul>
          </window.Disclosure>
        </div>}

      {et.hay &&
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5,
          color: PALETTE.textMuted, letterSpacing: '0.08em', marginTop: 12
        }}>
          {op.up} de {op.total} {op.total === 1 ? `persona ${pron} recomienda` : `personas ${pron} recomiendan`} ({et.pct} %)
        </div>}
    </React.Fragment>);

}
window.OpinionBlock = OpinionBlock;

// ════════════════════════════════════════════════════════════════
// YOUTUBE BLOCK — el video de Armas M&S, en una tele de los 80 (si existe)
// La pantalla es un botón: el iframe no se pide hasta que el visitante la toca,
// así la ficha no carga YouTube para nadie que no lo quiera ver.
// ════════════════════════════════════════════════════════════════
function YouTubeBlock({ arma, padX = 16, gap = 34 }) {
  const [loaded, setLoaded] = useState2(false);
  const vid = window.youtubeId(arma.youtube);
  useEffect(() => { setLoaded(false); }, [vid]);
  if (!vid) return null; // si no hay video, no se renderiza nada

  const thumb = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
  const embed = `https://www.youtube-nocookie.com/embed/${vid}?rel=0&autoplay=1&modestbranding=1`;

  return (
    <section style={{ padding: `${gap}px ${padX}px 0` }} aria-labelledby="ficha-video">
      <window.CintaDymo id="ficha-video">Video</window.CintaDymo>
      <div className="amx-tele">
        <div className="amx-tele-marco">
          {loaded ?
            <div className="amx-tele-pantalla" style={{ cursor: 'default' }}>
              <iframe
                src={embed}
                title={'Video: ' + arma.nombre}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen />
            </div> :
            <button type="button" className="amx-tele-pantalla" onClick={() => setLoaded(true)}
              aria-label={'Reproducir el video de ' + arma.nombre}>
              <img src={thumb} alt="" loading="lazy"
                onError={(e) => {
                  // fallback: thumbnail "0" if hqdefault not available
                  if (!e.target.dataset.fb) {
                    e.target.dataset.fb = '1';
                    e.target.src = `https://i.ytimg.com/vi/${vid}/0.jpg`;
                  } else {
                    e.target.style.display = 'none';
                  }
                }} />
              <span className="amx-tele-sello" aria-hidden="true"><span className="amx-sello">▶ Ver video</span></span>
            </button>}
        </div>
        <div className="amx-tele-panel" aria-hidden="true">
          <span className="amx-tele-perilla" />
          <span className="amx-tele-bocina" />
          <span className="amx-tele-perilla" />
        </div>
      </div>
      <a className="amx-tele-canal" href={`https://youtube.com/watch?v=${vid}`} target="_blank" rel="noopener noreferrer">
        @ArmasMS en YouTube ↗
      </a>
    </section>);

}
window.YouTubeBlock = YouTubeBlock;

function sfld(label, k, f, set, p = {}) {
  return (
    <div style={{ marginBottom: 12, gridColumn: p.span === 2 ? '1 / -1' : 'auto' }}>
      <label style={sLblStyle()}>{label} {p.required && <span style={{ color: PALETTE.amber }}>*</span>}</label>
      {p.ta ?
      <textarea value={f[k]} onChange={(e) => set(k, e.target.value)}
      rows={p.rows || 3} placeholder={p.placeholder} style={sInpStyle()} /> :
      p.select ?
      <select value={f[k]} onChange={(e) => set(k, e.target.value)} style={sInpStyle()}>
          {p.select.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select> :

      <input type={p.type || 'text'} value={f[k]} onChange={(e) => set(k, e.target.value)}
      placeholder={p.placeholder} style={sInpStyle()} />
      }
      {p.hint &&
      <div style={window.amxProsa({
        fontSize: 13, lineHeight: 1.45, color: PALETTE.textMuted, marginTop: 4
      })}>{p.hint}</div>}
    </div>);

}
// Etiqueta de campo: versalita con tracking (el lenguaje de la app) pero en Open
// Sans, que a este cuerpo se lee bastante mejor que la mono. El 600 compensa el
// peso que Open Sans pierde en mayúsculas pequeñas.
function sLblStyle() {
  return window.amxProsa({
    display: 'block',
    fontSize: 12.5, fontWeight: 600, lineHeight: 1.4,
    color: PALETTE.textMuted,
    letterSpacing: '0.13em', textTransform: 'uppercase',
    marginBottom: 5
  });
}
function sInpStyle() {
  return window.amxProsa({
    width: '100%',
    background: PALETTE.bg,
    border: `1px solid ${PALETTE.border}`,
    color: PALETTE.text,
    padding: '10px 12px',
    // 16px NO es decorativo: por debajo de eso iOS hace zoom al enfocar el campo.
    // El estilo inline pisa la regla de index.html, así que el piso va aquí.
    fontSize: 16, outline: 'none',
    resize: 'vertical', lineHeight: 1.55
  });
}

// ════════════════════════════════════════════════════════════════
// COMPARE — dos fichas de fichero lado a lado (rediseño del 14-sep-2026)
// Qué se compara, quién gana y cómo se escribe la tira: src/lib/cotejo.js.
// Las piezas: ui.jsx, bloque «EL COMPARADOR». Las reglas: docs/DESIGN.md §5.6.
// ════════════════════════════════════════════════════════════════
function CompareScreen({ ids, onOpenArma, onNav, onPoner, onQuitar, buscarLado, onBuscar }) {
  const vp = window.useViewport();
  // Un solo corte, el del expediente: 1024px, como la ficha de arma.
  const ancho = vp.width >= 1024;
  // La que no existe se ignora y la que queda pasa a ser la primera (spec §8).
  const [a = null, b = null] = ids.map((id) => window.findArma(id)).filter(Boolean);
  const cotejo = a ? window.amxCotejar(a, b, window.amxInventarioDe(a), b ? window.amxInventarioDe(b) : null) : null;
  // La búsqueda se titula con el arma del OTRO lado.
  const otra = buscarLado === 'b' ? a : buscarLado === 'a' ? b : null;
  return (
    <div className="amx-cotejo-pantalla">
      <window.CintaDymo nivel={1}>Comparador</window.CintaDymo>
      {!a
        ? <window.CotejoVacio onArsenal={() => onNav('catalog')} />
        : <React.Fragment>
            <window.CotejoFichas a={a} b={b} cotejo={cotejo} ancho={ancho}
              onAbrir={onOpenArma} onCambiar={onBuscar} onQuitar={onQuitar} onElegir={onBuscar} />
            {b && <window.TiraCotejo tira={window.amxTiraCotejo(a, b, cotejo)} />}
          </React.Fragment>}
      <window.BuscarArma abierta={buscarLado !== null}
        titulo={otra ? 'Comparar con la ' + otra.nombre : 'Elegir arma'}
        excluir={ids}
        onElegir={(id) => { onPoner(buscarLado, id); onBuscar(null); }}
        onCerrar={() => onBuscar(null)} />
    </div>
  );
}
window.CompareScreen = CompareScreen;

// ════════════════════════════════════════════════════════════════
// LEGAL — Página de legalidad con WhatsApp asesoría
// ════════════════════════════════════════════════════════════════
function LegalScreen({ onNav }) {
  const vp = window.useViewport();
  const padX = vp.isDesktop ? 28 : 16;
  const page = window.Store ? window.Store.getPages().legal : null;
  const eyebrow = page?.eyebrow || '§ LEGALIDAD · MX';
  const title = page?.title || 'Tenencia legal de armas de fuego';
  const intro = page?.intro || 'Resumen de los requisitos y pasos para la posesión legal en México conforme a la Ley Federal de Armas de Fuego y Explosivos.';
  const requisitos = page?.requisitos || ['Original del permiso extraordinario para la adquisición de arma de fuego, cartuchos y/o accesorios, vigente (DEFENSA-02-040, lo expide el Registro Federal de Armas de Fuego)', 'Original de una identificación oficial vigente (credencial para votar, pasaporte, cartilla del Servicio Militar Nacional o cédula profesional con fotografía)', 'Comprobante original del pago de la hoja de ayuda DEFENSA-02-062 (registro del arma), uno por cada arma', 'Copia simple de la Constancia de Situación Fiscal, solo si necesitas factura'];
  const pasos = page?.pasos || [
  { t: 'Formato y documentos', d: 'Llenar y firmar la solicitud DEFENSA-02-040 para civiles (el formato está en gob.mx) y reunir la documentación que pide. Se entrega en persona en la Dirección General del Registro Federal de Armas de Fuego y Control de Explosivos (Av. Industria Militar 1111, Campo Militar No. 1-D, Naucalpan, Edo. Méx.) o se envía por paquetería. Quien vive en el interior de la República también puede enviarla por correo certificado, salvo los habitantes de la Ciudad de México, el Estado de México, Querétaro, Hidalgo y Cuernavaca.' },
  { t: 'Solicitud de permiso', d: 'Pedir el permiso extraordinario para la adquisición de armas de fuego, cartuchos y accesorios (DEFENSA-02-040), para protección de domicilio o parcela, actividades cinegéticas o tiro deportivo y caza, según el caso. En una misma solicitud se pueden pedir hasta tres armas de fuego y hasta tres cantidades de cartuchos; en actividades cinegéticas y tiro deportivo, se puede volver a solicitar la adquisición de armas una vez transcurridos 6 meses de haber adquirido el material autorizado en el último permiso. Pago de derechos.' },
  { t: 'Visita a la DCAM u OTCA', d: 'La DCAM atiende en persona en el Campo Militar No. 1-D (Av. Industria Militar 1111, Col. Lomas de Tecamachalco, Naucalpan, Edo. Méx.): las personas físicas con permiso extraordinario entran sin cita, y se otorgan 80 turnos de 08:00 a 13:00, de lunes a viernes (las personas morales piden cita en facturas.dcam@defensa.gob.mx). A la OTCA, en Monterrey, N.L., que solo atiende al público que radica en Coahuila, Nuevo León, San Luis Potosí y Tamaulipas, agendar visita. Llevar documentación completa.' },
  { t: 'Selección y compra', d: 'Elegir arma del catálogo oficial. La adquisición civil solo puede hacerse por los canales oficiales: la DCAM o la OTCA.' },
  { t: 'Registro federal del arma', d: 'Toda arma adquirida queda registrada a tu nombre en el Registro Federal de Armas (RFA).' }];

  const waPhone = page?.whatsapp_phone || '525555555555';
  const waMsg = page?.whatsapp_msg || 'Hola, me interesa asesoría para trámite SEDENA';
  const waPitch = page?.whatsapp_pitch || 'El acompañamiento legal para el trámite SEDENA es prestado por un abogado externo especializado, en lo individual y bajo su propia cédula profesional. Armas M&S no es despacho jurídico y únicamente facilita el contacto con el profesional.';
  const decl = window.ARMADO_DECLARACION || { titulo: 'Declaración de intenciones', parrafos: [] };
  return (
    <div style={{ padding: `0 ${padX}px 90px`, maxWidth: 900, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={{
        padding: '20px 0',
        textAlign: 'center',
        borderBottom: `1px solid ${PALETTE.border}`,
        marginBottom: 18
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13, color: PALETTE.amber,
          letterSpacing: '0.2em', marginBottom: 6
        }}>{eyebrow}</div>
        <div style={{
          fontFamily: 'Archivo, sans-serif',
          fontWeight: 700, fontSize: 23,
          color: PALETTE.text,
          textTransform: 'uppercase',
          letterSpacing: '0.04em', lineHeight: 1.1
        }}>{title}</div>
        <div style={window.amxProsa({
          fontSize: 16, marginTop: 10, maxWidth: 520, marginInline: 'auto', lineHeight: 1.6
        })}>{intro}</div>
      </div>

      {/* DISCLAIMER OFICIAL — visible al principio */}
      <div style={{
        background: 'rgba(168,58,42,0.08)',
        border: `1px solid ${PALETTE.redHi}`,
        padding: '14px',
        marginBottom: 22
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13, color: PALETTE.redHi,
          letterSpacing: '0.2em', textTransform: 'uppercase',
          marginBottom: 6,
          fontWeight: 700
        }}>▲ AVISO DE TRANSPARENCIA</div>
        <div style={window.amxProsa({ fontSize: 16.5, color: PALETTE.text })}>
          Armado en México y Armas M&amp;S no forman parte de DEFENSA (anteriormente SEDENA), DCAM ni de ninguna dependencia del gobierno mexicano. Las armas de fuego se muestran solo con fines informativos y de transparencia: no las comercializamos, y no emitimos licencias, permisos ni trámites administrativos de ningún tipo. Armado en México y Armas M&amp;S tampoco prestan servicios jurídicos. La única vía legal para adquirir un arma de fuego en México son los canales oficiales: la DCAM o la OTCA.
        </div>
      </div>

      {/* CATEGORÍAS LEGALES */}
      <SectionHeader>Las 4 Categorías Legales</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
        {window.CATEGORIES.disponibilidad.map((d) =>
        <div key={d.id} style={{
          background: PALETTE.bgCard,
          border: `1px solid ${window.amxColorAvail(d.color)}`,
          boxShadow: CLARO.sombra,
          padding: '12px 14px'
        }}>
            {/* El rótulo iba en d.color (data.js), pensado para el tema oscuro
                anterior: el nombre de la categoría, que es la información de la
                tarjeta, no se leía. El texto va en tinta (16.31:1 sobre la
                tarjeta) y el color de la categoría es ahora el HAIRLINE ENTERO,
                no una barra de 4px a la izquierda — misma información, sin el
                tic de la pestaña lateral que veta §6. Medidos sobre la tarjeta:
                #2F6B33 6.02:1 · #7D6108 5.49:1 · #A3341F 6.42:1. */}
            <div style={{
            fontFamily: 'Archivo, sans-serif',
            fontWeight: 700, fontSize: 15,
            color: PALETTE.text,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            marginBottom: 4
          }}>{d.label}</div>
            <div style={window.amxProsa({ fontSize: 15.5, lineHeight: 1.6 })}>{d.desc}</div>
          </div>
        )}
        {/* 4ª categoría — Armas traumáticas (sin licencia).
            Iba en '#FFFFFF' copiando el patrón del tema oscuro: sobre la tarjeta
            el título daba 1.05:1 — la tarjeta entera parecía vacía. Es la única
            categoría que sí vendemos, así que su identificador es el verde de
            marca (11.67:1 sobre la tarjeta) en el mismo hairline que usan sus
            tres hermanas, y el título va en tinta como ellas. */}
        <div style={{
          background: PALETTE.bgCard,
          border: `1px solid ${PALETTE.amber}`,
          boxShadow: CLARO.sombra,
          padding: '12px 14px'
        }}>
          <div style={{
            fontFamily: 'Archivo, sans-serif',
            fontWeight: 700, fontSize: 15,
            color: PALETTE.text,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            marginBottom: 4
          }}>Sin Licencia</div>
          <div style={window.amxProsa({ fontSize: 15.5, lineHeight: 1.6 })}>Armas traumáticas. No letales impulsadas por aire comprimido, menores a 140 Joules de potencia.</div>
        </div>
      </div>

      {/* REQUISITOS */}
      <SectionHeader>Requisitos SEDENA</SectionHeader>
      <div style={{
        background: PALETTE.bgCard,
        border: `1px solid ${PALETTE.border}`,
        padding: '14px',
        marginBottom: 22,
        position: 'relative'
      }}>
        <TacticalCorners size={10} color={PALETTE.amber} />
        {requisitos.map((r, i) =>
        <div key={i} style={window.amxProsa({
          fontSize: 16, color: PALETTE.text, lineHeight: 1.5,
          padding: '7px 0',
          borderBottom: i < requisitos.length - 1 ? `1px solid ${PALETTE.border}` : 'none',
          display: 'flex', alignItems: 'center', gap: 10
        })}>
            <span style={{
            width: 18, height: 18,
            border: `1px solid ${PALETTE.amber}`,
            color: PALETTE.amber,
            fontSize: 13, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>{String(i + 1).padStart(2, '0')}</span>
            <span>{r}</span>
          </div>
        )}
      </div>

      {/* PASOS DCAM */}
      <SectionHeader>Pasos para comprar en DCAM</SectionHeader>
      <div style={{ marginBottom: 22 }}>
        {pasos.map((s, i) =>
        <div key={i} style={{
          display: 'flex', gap: 12,
          padding: '12px 0',
          borderBottom: i < pasos.length - 1 ? `1px solid ${PALETTE.border}` : 'none'
        }}>
            <div style={{
            width: 32, height: 32,
            background: PALETTE.bgElev,
            border: `1.5px solid ${PALETTE.amber}`,
            color: PALETTE.amber,
            fontFamily: 'Archivo, sans-serif', fontWeight: 700,
            fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            letterSpacing: '0'
          }}>{String(i + 1).padStart(2, '0')}</div>
            <div>
              <div style={{
              fontFamily: 'Archivo, sans-serif',
              fontWeight: 600, fontSize: 15,
              color: PALETTE.text,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 4
            }}>{s.t}</div>
              <div style={window.amxProsa({ fontSize: 15.5, lineHeight: 1.6 })}>{s.d}</div>
            </div>
          </div>
        )}
      </div>

      {/* ASESORÍA WHATSAPP — oculta por el momento (abogado externo / asesoría legal) */}
      {false && (
      <div style={{
        background: `linear-gradient(135deg, ${PALETTE.bgCard} 0%, ${PALETTE.bgElev} 100%)`,
        border: `1.5px solid ${PALETTE.amber}`,
        padding: '16px 14px',
        marginBottom: 16,
        position: 'relative'
      }}>
        <TacticalCorners size={14} color={PALETTE.amber} thickness={2} />
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13, color: PALETTE.amber,
          letterSpacing: '0.2em', textTransform: 'uppercase',
          marginBottom: 6
        }}>▸ ABOGADO EXTERNO · ASESORÍA INDEPENDIENTE</div>
        <div style={{
          fontFamily: 'Archivo, sans-serif',
          fontWeight: 700, fontSize: 19,
          color: PALETTE.text,
          textTransform: 'uppercase',
          letterSpacing: '0.04em', lineHeight: 1.1,
          marginBottom: 8
        }}>Acompañamiento legal<br />con abogado especializado</div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 14.5, color: PALETTE.textDim,
          lineHeight: 1.6, marginBottom: 10
        }}>{waPitch}</div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13, color: PALETTE.textMuted,
          lineHeight: 1.55, marginBottom: 14,
          paddingTop: 8,
          borderTop: `1px dashed ${PALETTE.border}`
        }}>
          <b style={{ color: PALETTE.textDim }}>Nota:</b> el servicio jurídico es prestado por un abogado externo bajo su propia cédula profesional. Armas M&amp;S no es despacho jurídico y únicamente facilita el contacto; los honorarios se pactan directamente con el profesional.
        </div>
        <a href={`https://wa.me/${waPhone}?text=${encodeURIComponent(waMsg)}`}
        target="_blank" rel="noopener" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: PALETTE.amber, color: PALETTE.tintaSobreMarca,
          textDecoration: 'none',
          padding: '12px 16px',
          fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 15,
          letterSpacing: '0.15em', textTransform: 'uppercase'
        }}>
          <span>Contactar al abogado</span>
          <span style={{ fontSize: 20.5}}>↗</span>
        </a>
      </div>
      )}
    </div>);

}
window.LegalScreen = LegalScreen;

// ════════════════════════════════════════════════════════════════
// ABOUT
// ════════════════════════════════════════════════════════════════
function AboutScreen() {
  const vp = window.useViewport();
  const padX = vp.isDesktop ? 28 : 16;
  const page = window.Store ? window.Store.getPages().about : null;
  const eyebrow = page?.eyebrow || '◆ ACERCA DE';
  const title = page?.title || 'Armado en México';
  const mision = page?.mision || 'Divulgar de forma rigurosa la información técnica, histórica y legal sobre las armas de fuego disponibles para civiles en México.';
  const autor = page?.autor || 'Saulo Flores';
  const empresa = page?.empresa || 'Armas M&S';
  const bio = page?.bio || 'Catálogo curado y mantenido con base en información oficial de DCAM, SEDENA y publicaciones técnicas de los fabricantes.';
  const aviso = page?.aviso || 'Las armas de fuego de este catálogo se muestran únicamente con fines informativos y de transparencia. Las únicas que comercializamos son las tres armas traumáticas menos letales.';
  const decl = window.ARMADO_DECLARACION || { titulo: 'Declaración de intenciones', parrafos: [] };
  return (
    <div style={{ padding: `0 ${padX}px 90px`, maxWidth: 800, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={{
        padding: '24px 0',
        textAlign: 'center',
        borderBottom: `1px solid ${PALETTE.border}`,
        marginBottom: 18
      }}>
        {/* LOGO Armado en México */}
        <div style={{
          width: 132, margin: '0 auto 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <img src="imagenes/logo-armado-mx.webp" alt="Armado en México" style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 14 }} />
        </div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13, color: PALETTE.amber,
          letterSpacing: '0.2em', marginBottom: 6
        }}>{eyebrow}</div>
        <div style={{
          fontFamily: 'Archivo, sans-serif',
          fontWeight: 700, fontSize: 26,
          color: PALETTE.text,
          textTransform: 'uppercase',
          letterSpacing: '0.04em', lineHeight: 1.05
        }}>{title}</div>
      </div>

      {/* 1 ▸ DISCLAIMER OFICIAL — NO SOMOS GOBIERNO */}
      <div style={{
        background: 'rgba(168,58,42,0.08)',
        border: `1px solid ${PALETTE.redHi}`,
        padding: 14, marginBottom: 18
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13, color: PALETTE.redHi,
          letterSpacing: '0.2em', textTransform: 'uppercase',
          marginBottom: 6, fontWeight: 700
        }}>▲ NO SOMOS GOBIERNO · FINES INFORMATIVOS</div>
        <div style={window.amxProsa({ fontSize: 16.5, color: PALETTE.text })}>
          Armado en México y Armas M&amp;S NO forman parte de DEFENSA (anteriormente SEDENA), DCAM ni de ninguna dependencia del gobierno mexicano. Somos un proyecto privado divulgativo. No comercializamos armas de fuego, municiones ni accesorios para ellas: se muestran solo con fines informativos y de transparencia. No emitimos licencias ni permisos. Lo único que comercializamos son las tres armas traumáticas menos letales.
        </div>
      </div>

      {/* 2 ▸ DECLARACIÓN DE INTENCIONES */}
      <SectionHeader>{decl.titulo}</SectionHeader>
      <div style={{
        background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`, boxShadow: CLARO.sombra,
        padding: vp.isDesktop ? '20px 22px' : '16px', marginBottom: 18,
      }}>
        {decl.parrafos.map((t, i) => (
          <p key={i} style={window.amxProsa({
            margin: i === 0 ? 0 : '14px 0 0',
            fontSize: 17.5, color: i === 0 ? PALETTE.text : PALETTE.textDim,
          })}>{t}</p>
        ))}
        <div style={{
          marginTop: 18, paddingTop: 12, borderTop: `1px dashed ${PALETTE.border}`,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: PALETTE.textMuted, letterSpacing: '0.04em',
        }}>Armado en México · ¡Protege lo que amas!</div>
      </div>

      {/* 3 ▸ MISIÓN */}
      <SectionHeader>Misión</SectionHeader>
      <div style={{
        background: PALETTE.bgCard,
        border: `1px solid ${PALETTE.border}`,
        padding: 14, marginBottom: 18,
        position: 'relative'
      }}>
        <TacticalCorners size={10} color={PALETTE.amber} />
        <div style={window.amxProsa({ fontSize: 16.5, color: PALETTE.text })}>{mision}</div>
      </div>

      {/* 4 ▸ DIFERENCIA — ARMADO EN MÉXICO vs ARMAS M&S */}
      <SectionHeader>Armado en México vs. Armas M&amp;S</SectionHeader>
      <div style={{
        display: 'grid', gridTemplateColumns: vp.isDesktop ? '1fr 1fr' : '1fr',
        gap: 12, marginBottom: 18,
      }}>
        <div style={{ background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`, boxShadow: window.CLARO.sombra, borderTop: `2px solid ${PALETTE.amber}`, padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <img src="imagenes/logo-armado-mx.webp" alt="Armado en México" style={{ width: 36, height: 36, borderRadius: 7, flexShrink: 0, display: 'block' }} />
            <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 16, color: PALETTE.text, textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1.05 }}>Armado en México</div>
          </div>
          <div style={{ fontFamily: 'Archivo, system-ui, sans-serif', fontSize: 16, color: PALETTE.textDim, lineHeight: 1.65 }}>
            Una <span style={{ color: PALETTE.text }}>enciclopedia libre</span> que busca dar transparencia a toda la parte legal que las instituciones mantienen opaca para tener al pueblo desarmado e ignorante de sus derechos.
          </div>
        </div>
        <div style={{ background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`, boxShadow: window.CLARO.sombra, borderTop: `2px solid ${PALETTE.amber}`, padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 7, flexShrink: 0, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <img src="imagenes/logo-main.png" alt="Armas M&amp;S" style={{ width: '90%', height: 'auto', display: 'block' }} />
            </div>
            <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 16, color: PALETTE.text, textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1.05 }}>Armas M&amp;S</div>
          </div>
          <div style={{ fontFamily: 'Archivo, system-ui, sans-serif', fontSize: 16, color: PALETTE.textDim, lineHeight: 1.65 }}>
            Un <span style={{ color: PALETTE.text }}>proyecto digital de e-commerce</span> con tienda en <span style={{ color: PALETTE.amber }}>armasmys.com</span> y de divulgación en redes sociales (YouTube, Facebook e Instagram) sobre armamento y defensa personal.
          </div>
        </div>
      </div>

      {/* AUTOR */}
      <SectionHeader>Autor</SectionHeader>
      <div style={{
        background: PALETTE.bgCard,
        border: `1px solid ${PALETTE.border}`,
        padding: 14, marginBottom: 18,
        display: 'flex', gap: 16, alignItems: 'flex-start',
        flexWrap: 'wrap'
      }}>
        {/* FOTO */}
        <div style={{
          width: 120, height: 120,
          background: PALETTE.bgElev,
          position: 'relative',
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden'
        }}>
          {window.Store && window.Store.getPages().about.foto ?
          <img src={window.Store.getPages().about.foto} alt={autor}
          style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(0.15) contrast(1.05)' }} /> :

          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 13, color: PALETTE.textMuted,
            letterSpacing: '0.15em', textAlign: 'center',
            padding: 8, lineHeight: 1.5
          }}>
              <div style={{ fontSize: 38.5, color: PALETTE.amber, marginBottom: 4 }}>◯</div>
              FOTO<br />PENDIENTE
            </div>
          }
        </div>

        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{
            fontFamily: 'Archivo, sans-serif', fontWeight: 700,
            fontSize: 23, color: PALETTE.text,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            lineHeight: 1.1
          }}>{autor}</div>
          <div style={window.amxProsa({
            fontSize: 16, color: PALETTE.amber, marginTop: 6, lineHeight: 1.5
          })}>Co-Fundador de Armas M&amp;S<br />Creador de Armado en México</div>
          <div style={window.amxProsa({ fontSize: 16, marginTop: 10, lineHeight: 1.65 })}>{bio}</div>
        </div>
      </div>

      <div style={{
        textAlign: 'center',
        padding: '16px',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 13, color: PALETTE.textMuted,
        letterSpacing: '0.15em'
      }}>━━━ EDICIÓN 2026 · v1.0 ━━━</div>
    </div>);

}
window.AboutScreen = AboutScreen;

// ════════════════════════════════════════════════════════════════
// FAQ
// ════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════
// SOPORTE — normas de la comunidad, denuncias y moderación
// Existe porque la app acepta texto libre de desconocidos (las reseñas). Las
// normas están adaptadas de las de Steam, recortadas a lo que aquí hay: no hay
// Workshop, ni grupos, ni perfiles — hay reseñas y denuncias.
// ════════════════════════════════════════════════════════════════
function SoporteScreen({ onNav }) {
  const vp = window.useViewport();
  const padX = vp.isDesktop ? 28 : 16;
  const [den, setDen] = useState2({ reviewId: '', motivo: 'ilegal', detalle: '', email: '' });
  const [denEnviada, setDenEnviada] = useState2(false);
  const setD = (k, v) => setDen((p) => Object.assign({}, p, { [k]: v }));

  const MOTIVOS = [
    { value: 'ilegal', label: 'Compraventa u otra actividad ilegal' },
    { value: 'irrespetuoso', label: 'Insultos, acoso o amenazas' },
    { value: 'fuera-de-tema', label: 'Fuera de tema o mensaje repetido' },
    { value: 'comercial', label: 'Publicidad o contenido comercial' },
    { value: 'manipulacion', label: 'Manipulación de la calificación' },
    { value: 'datos', label: 'Datos personales de alguien' },
    { value: 'otro', label: 'Otro' },
  ];
  const denListo = den.detalle.trim().length >= 20;
  const enviarDenuncia = () => {
    if (!denListo || !window.Store) return;
    window.Store.addReport(den);
    setDenEnviada(true);
  };

  const Regla = ({ children }) => (
    <div style={window.amxProsa({
      fontSize: 16, color: PALETTE.text, lineHeight: 1.6, padding: '6px 0',
      display: 'flex', gap: 9, alignItems: 'flex-start'
    })}>
      <span style={{ color: PALETTE.amber, flexShrink: 0 }}>▸</span>
      <span>{children}</span>
    </div>
  );

  return (
    <div style={{ padding: `0 ${padX}px 90px`, maxWidth: 900, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

      <div style={{ padding: '20px 0', textAlign: 'center', borderBottom: `1px solid ${PALETTE.border}`, marginBottom: 18 }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: PALETTE.amber,
          letterSpacing: '0.2em', marginBottom: 6
        }}>◈ SOPORTE</div>
        <div style={{
          fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 23,
          color: PALETTE.text, textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.1
        }}>Normas de la comunidad</div>
        <div style={window.amxProsa({
          fontSize: 16, lineHeight: 1.6,
          marginTop: 10, maxWidth: 620, marginLeft: 'auto', marginRight: 'auto'
        })}>
          Las reseñas las escriben personas y las lee cualquiera. Estas normas dicen qué
          se puede publicar aquí, cómo denunciar lo que no cumple y qué pasa cuando se
          incumplen.
        </div>
      </div>

      {/* Lo primero, no enterrado en una lista: el uso que NO se tolera. */}
      <div style={{
        background: 'rgba(168,58,42,0.08)',
        border: `1px solid ${PALETTE.redHi}`,
        padding: 14, marginBottom: 22
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: PALETTE.redHi,
          letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700
        }}>▲ Prohibido usar esta app para comprar o vender</div>
        <div style={window.amxProsa({ fontSize: 16.5, color: PALETTE.text })}>
          Armado en México es un catálogo <b>divulgativo</b>. Aquí no se comercializan
          armas de fuego, municiones ni accesorios, y no somos intermediarios de ninguna
          venta.
          <div style={{ marginTop: 10 }}>
            Cualquier intento de usar las reseñas —o cualquier otro canal de esta
            aplicación— para <b>ofrecer, solicitar o intermediar la compraventa de armas,
            municiones o accesorios fuera de los canales legales</b> (DCAM y OTCA o, para
            cartuchos, los comercios con permiso general para su compraventa, con la
            autorización correspondiente de la SEDENA) conllevará el <b>bloqueo inmediato</b> y
            el <b>reporte a las autoridades competentes</b>, junto con la información
            asociada al envío.
          </div>
          <div style={{ marginTop: 10, color: PALETTE.textDim }}>
            Lo mismo aplica a pedir o dar instrucciones para modificar un arma de forma
            ilegal, alterar matrículas, o eludir el trámite ante la SEDENA.
          </div>
        </div>
      </div>

      <SectionHeader>Qué se puede publicar</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 26 }}>

        <window.Disclosure title="Respeto hacia las demás personas" defaultOpen>
          <div>
            <Regla>Nada de insultos, acoso ni burlas hacia otros usuarios, marcas, tiendas o autoridades.</Regla>
            <Regla>Nada de amenazas ni de incitación a la violencia, ni en broma.</Regla>
            <Regla>Nada de provocar peleas ni de discriminar por origen, género, religión, orientación o cualquier otra condición.</Regla>
            <Regla>Nada de acusaciones públicas contra personas concretas.</Regla>
            <Regla>Nada de publicar datos personales de nadie: nombres completos, domicilios, teléfonos, matrículas ni fotos de terceros.</Regla>
          </div>
        </window.Disclosure>

        <window.Disclosure title="La reseña va sobre el producto">
          <div>
            <Regla>Escribe sobre el arma, el accesorio, la munición o el lugar que estás reseñando: cómo se comporta, para qué sirve, qué te sorprendió.</Regla>
            <Regla>No uses las reseñas para hacer preguntas de trámite: para eso están las <b>preguntas frecuentes</b> y la <b>guía legal</b>.</Regla>
            <Regla>No repitas la misma reseña en varias fichas.</Regla>
          </div>
        </window.Disclosure>

        <window.Disclosure title="Nada comercial">
          <div>
            <Regla>Sin anuncios, sin promociones y sin enlaces a tiendas, propias o ajenas.</Regla>
            <Regla>Sin ofertas de compra, venta, permuta o renta de nada.</Regla>
            <Regla>Sin rifas, sorteos ni captación de clientes.</Regla>
            <Regla>Si tienes una relación comercial con lo que reseñas —lo vendes, lo distribuyes, te lo regalaron— <b>dilo en la reseña</b>.</Regla>
          </div>
        </window.Disclosure>

        <window.Disclosure title="No manipular la calificación">
          <div>
            <Regla>Una opinión por persona y por ficha.</Regla>
            <Regla>Nada de enviar varias reseñas para inflar o hundir una calificación.</Regla>
            <Regla>Nada de pagar, cobrar ni presionar a nadie por escribir una reseña.</Regla>
            <Regla>Nada de campañas coordinadas contra un modelo, una marca o una tienda.</Regla>
          </div>
        </window.Disclosure>

      </div>

      <SectionHeader>Cómo se revisan las reseñas</SectionHeader>
      <div style={{
        background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`, boxShadow: window.CLARO.sombra,
        padding: '14px 16px', marginBottom: 26, position: 'relative'
      }}>
        <TacticalCorners size={10} color={PALETTE.amber} />
        <div style={window.amxProsa({ fontSize: 16 })}>
          <b style={{ color: PALETTE.text }}>Toda reseña se revisa antes de publicarse.</b> Al enviarla
          entra en una cola y no aparece en la ficha hasta que alguien comprueba que
          cumple estas normas. Puede tardar; que no se vea al instante no significa que
          se haya rechazado.
          <div style={{ marginTop: 10 }}>
            Pedimos un mínimo de {RESENA_MIN} caracteres a propósito: una opinión sin
            argumento no ayuda a nadie a decidir, y es lo que da derecho a que tu voto
            cuente en la calificación.
          </div>
          <div style={{ marginTop: 10 }}>
            Tu <b>correo no se publica nunca</b>: se guarda solo para poder contactarte si
            hay un problema con tu reseña, y se descarta al aprobarla.
          </div>
        </div>
      </div>

      <SectionHeader>Qué pasa si se incumplen</SectionHeader>
      <div style={{ marginBottom: 26 }}>
        {[
          ['01', 'No se publica', 'Si la reseña no cumple las normas, no llega a la ficha. Si dejaste correo, te avisamos del motivo.'],
          ['02', 'Se retira lo ya publicado', 'Una reseña publicada puede retirarse después si se detecta —o se denuncia— que incumple.'],
          ['03', 'Se restringe la participación', 'Quien incumple de forma repetida deja de poder publicar reseñas.'],
          ['04', 'Bloqueo y reporte', 'En los casos graves —compraventa ilegal, amenazas, explotación de menores— el bloqueo es inmediato y se reporta a las autoridades competentes con la información del envío.'],
        ].map(([n, tit, desc]) =>
          <div key={n} style={{ display: 'flex', gap: 13, padding: '11px 0', borderBottom: `1px solid ${PALETTE.border}` }}>
            <div style={{
              width: 32, height: 32, flexShrink: 0,
              border: `1px solid ${PALETTE.amber}`, color: PALETTE.amber,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700
            }}>{n}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 14.5,
                color: PALETTE.text, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4
              }}>{tit}</div>
              <div style={window.amxProsa({ fontSize: 15.5, lineHeight: 1.6 })}>{desc}</div>
            </div>
          </div>
        )}
        <div style={window.amxProsa({ fontSize: 15.5, lineHeight: 1.65, marginTop: 12 })}>
          <b style={{ color: PALETTE.text }}>¿Crees que nos equivocamos?</b> Denúncialo con el
          formulario de abajo indicando qué reseña era y por qué crees que sí cumplía.
          Moderar es un juicio y a veces sale mal; se revisa de nuevo.
        </div>
      </div>

      <SectionHeader>Denunciar contenido</SectionHeader>
      <div style={{
        background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`, boxShadow: window.CLARO.sombra,
        padding: '15px 16px', position: 'relative'
      }}>
        <TacticalCorners size={10} color={denEnviada ? PALETTE.green : PALETTE.amber} />
        {denEnviada ?
          <div>
            <div style={{
              fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 16,
              color: PALETTE.green, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8
            }}>✓ Denuncia recibida</div>
            <div style={window.amxProsa({ fontSize: 15.5, lineHeight: 1.6 })}>
              La revisaremos. Si dejaste correo, te contamos en qué quedó.
            </div>
          </div>
        :
          <div>
            <div style={window.amxProsa({ fontSize: 16, lineHeight: 1.65, marginBottom: 14 })}>
              Si ves una reseña que incumple estas normas, cuéntanoslo. No hace falta que
              respondas a quien la escribió: eso solo alarga el problema.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: vp.isDesktop ? '1fr 1fr' : '1fr', columnGap: 12 }}>
              {sfld('Qué reseña', 'reviewId', den, setD, { placeholder: 'Ficha y autor, o el texto que empieza por…', span: 2 })}
              {sfld('Motivo', 'motivo', den, setD, { select: MOTIVOS })}
              {sfld('Tu correo (opcional)', 'email', den, setD, { type: 'email', placeholder: 'para contarte en qué quedó' })}
              {sfld('Qué pasa con ella', 'detalle', den, setD, { ta: true, rows: 3, required: true, span: 2, placeholder: 'Explica brevemente por qué incumple.' })}
            </div>
            <button type="button" onClick={enviarDenuncia} disabled={!denListo} style={{
              width: '100%', marginTop: 4,
              background: denListo ? PALETTE.amber : 'transparent',
              color: denListo ? PALETTE.tintaSobreMarca : PALETTE.textMuted,
              border: `1.5px solid ${denListo ? PALETTE.amber : PALETTE.border}`,
              padding: '13px', minHeight: 48,
              fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 14,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              cursor: denListo ? 'pointer' : 'not-allowed'
            }}>Enviar denuncia</button>
          </div>}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 22 }}>
        {[['legal', '§ Guía legal completa'], ['faq', '? Preguntas frecuentes']].map(([id, txt]) =>
          <button key={id} type="button" onClick={() => onNav && onNav(id)} style={{
            flex: '1 1 200px', background: 'transparent', color: PALETTE.amber,
            border: `1.5px dashed ${PALETTE.border}`, padding: '12px', minHeight: 48,
            fontFamily: 'Archivo, sans-serif', fontWeight: 600, fontSize: 13.5,
            letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer'
          }}>{txt} →</button>
        )}
      </div>
    </div>);

}
window.SoporteScreen = SoporteScreen;

function FAQScreen() {
  const vp = window.useViewport();
  const padX = vp.isDesktop ? 28 : 16;
  const [open, setOpen] = useState2(0);
  const faqs = window.Store ? window.Store.getPages().faq : [
  { q: '¿Puedo comprar un arma en cualquier tienda?', a: 'No. En México un arma de fuego solo puede adquirirse por los canales oficiales: la DCAM (Dirección de Comercialización de Armamento y Municiones de la SEDENA), en el Campo Militar No. 1-D, en Naucalpan, Estado de México (Av. Industria Militar 1111, Col. Lomas de Tecamachalco), y la OTCA, en Monterrey, N.L., que solo atiende al público que radica en Coahuila, Nuevo León, San Luis Potosí y Tamaulipas.' }];

  return (
    <div style={{ padding: `0 ${padX}px 90px`, maxWidth: 900, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      {/* El header móvil ya no pinta el título de pantalla: este bloque es el
          único encabezado y se centra en móvil para ocupar el sitio que dejó.
          En escritorio/tablet pasa a la izquierda —TopNav tampoco pinta título—
          para arrancar al margen de la columna de lectura de abajo. */}
      <div style={{
        padding: '20px 0',
        textAlign: vp.isMobile ? 'center' : 'left',
        borderBottom: `1px solid ${PALETTE.border}`,
        marginBottom: 18
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13, color: PALETTE.amber,
          letterSpacing: '0.2em', marginBottom: 6
        }}>? PREGUNTAS FRECUENTES</div>
        <div style={{
          fontFamily: 'Archivo, sans-serif',
          fontWeight: 700, fontSize: 23,
          color: PALETTE.text,
          textTransform: 'uppercase',
          letterSpacing: '0.04em', lineHeight: 1.1
        }}>FAQ</div>
      </div>

      {/* DISCLAIMER */}
      <div style={{
        background: 'rgba(168,58,42,0.08)',
        border: `1px solid ${PALETTE.redHi}`,
        padding: 14, marginBottom: 18
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13, color: PALETTE.redHi,
          letterSpacing: '0.2em', textTransform: 'uppercase',
          marginBottom: 6, fontWeight: 700
        }}>▲ AVISO DE TRANSPARENCIA</div>
        <div style={window.amxProsa({ fontSize: 16.5, color: PALETTE.text })}>
          Armado en México y Armas M&amp;S no son DEFENSA (anteriormente SEDENA) ni autoridad gubernamental. Las armas de fuego de esta app son informativas: no las comercializamos ni realizamos trámites ante ninguna dependencia. La única vía legal para adquirir un arma de fuego en México son los canales oficiales: la DCAM o la OTCA. Lo único que comercializamos directamente son las tres armas traumáticas menos letales.
          <br /><br />
          Armas M&amp;S no presta servicios jurídicos.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {faqs.map((f, i) =>
        <div key={i} style={{
          background: PALETTE.bgCard,
          border: `1px solid ${open === i ? PALETTE.amber : PALETTE.border}`
        }}>
            <button onClick={() => setOpen(open === i ? -1 : i)} style={{
            width: '100%',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '12px 14px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            gap: 10, textAlign: 'left'
          }}>
              <span style={{
              fontFamily: 'Archivo, sans-serif',
              fontWeight: 600, fontSize: 15,
              color: open === i ? PALETTE.amber : PALETTE.text,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              lineHeight: 1.25,
              flex: 1
            }}>{f.q}</span>
              <span style={{
              color: PALETTE.amber,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 19, flexShrink: 0
            }}>{open === i ? '−' : '+'}</span>
            </button>
            {open === i &&
          <div style={window.amxProsa({
            padding: '0 14px 14px',
            fontSize: 16.5,
            borderTop: `1px dashed ${PALETTE.border}`,
            paddingTop: 12
          })}>{f.a}</div>
          }
          </div>
        )}
      </div>
    </div>);

}
window.FAQScreen = FAQScreen;

// ════════════════════════════════════════════════════════════════
// MENU — pantalla "Más"
// ════════════════════════════════════════════════════════════════
function MenuScreen({ onNav, onTutorial }) {
  const vp = window.useViewport();
  const padX = vp.isDesktop ? 28 : 16;
  const items = [
  { id: 'traumaticas', icon: '◎', title: 'Armas traumáticas', desc: 'Defensa menos letal CO₂ .50/.68 · sin permiso SEDENA', accent: true },
  { id: 'accesorios', icon: '▫', title: 'Accesorios', desc: 'Equipamiento de adquisición legal en la DCAM · precio oficial' },
  { id: 'municiones', icon: '◉', title: 'Municiones', desc: 'Cartuchos por calibre · precio de referencia DCAM / OTCA' },
  { id: 'calibres', icon: '◉', title: 'Calibres', desc: 'Guía de munición: uso, balística y armas' },
  // Congeladas hasta el lanzamiento: visibles pero sin navegar. Ver PLACEHOLDERS.md.
  { id: 'campos', icon: '◎', title: 'Campos de tiro (Próximamente)', desc: 'Clubes y polígonos aliados', proximamente: true },
  { id: 'experiencias', icon: '✦', title: 'Experiencias (Próximamente)', desc: 'Formación y actividades de tiro', proximamente: true },
  { id: 'legal', icon: '§', title: 'Legalidad', desc: 'Trámite SEDENA y categorías legales' },
  { id: 'soporte', icon: '◈', title: 'Soporte y normas', desc: 'Normas de la comunidad, denuncias y moderación' },
  { id: 'faq', icon: '?', title: 'Preguntas frecuentes', desc: 'Dudas comunes sobre armas y trámites' },
  { id: 'about', icon: '◆', title: 'Acerca de', desc: 'Sobre Armado en México y M&S' },
  { id: 'tutorial', action: 'tutorial', icon: '▶', title: 'Ver tutorial', desc: 'Reproduce la introducción de bienvenida' }];

  return (
    <div style={{ padding: `20px ${padX}px 90px`, maxWidth: 700, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      {/* Único encabezado de la pantalla desde que el header móvil dejó de
          pintar título: centrado en móvil, al margen en escritorio/tablet. */}
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 13, color: PALETTE.amber,
        letterSpacing: '0.2em', marginBottom: 14,
        textAlign: vp.isMobile ? 'center' : 'left'
      }}>☰ MÁS</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((it) =>
        <button key={it.id} disabled={it.proximamente}
          onClick={it.proximamente ? undefined : () => it.action === 'tutorial' ? (onTutorial && onTutorial()) : onNav(it.id)} style={{
          background: it.accent ? `linear-gradient(135deg, ${PALETTE.bgCard} 0%, ${PALETTE.bgElev} 100%)` : PALETTE.bgCard,
          border: `1px solid ${it.accent ? PALETTE.amber : PALETTE.border}`,
          padding: '14px',
          cursor: it.proximamente ? 'default' : 'pointer',
          opacity: it.proximamente ? 0.55 : 1,
          textAlign: 'left',
          display: 'flex', alignItems: 'center', gap: 14
        }}>
            <span style={{
            fontSize: 27.5, color: PALETTE.amber,
            width: 30, textAlign: 'center',
            fontFamily: 'JetBrains Mono, monospace'
          }}>{it.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{
              fontFamily: 'Archivo, sans-serif',
              fontWeight: 600, fontSize: 16,
              color: PALETTE.text,
              textTransform: 'uppercase',
              letterSpacing: '0.06em'
            }}>{it.title}</div>
              <div style={window.amxProsa({
                fontSize: 15, color: PALETTE.textMuted, lineHeight: 1.45, marginTop: 2
              })}>{it.desc}</div>
            </div>
            <span style={{ color: PALETTE.amber, fontSize: 20.5}}>›</span>
          </button>
        )}
      </div>

      <div style={window.amxProsa({
        marginTop: 30,
        padding: '14px',
        background: PALETTE.bgElev,
        border: `1px dashed ${PALETTE.border}`,
        fontSize: 15, color: PALETTE.textMuted, lineHeight: 1.6
      })}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', color: PALETTE.amber, fontWeight: 700,
          letterSpacing: '0.15em', marginBottom: 4, fontSize: 13
        }}>◆ ARMADO·MX</div>
        Catálogo divulgativo. Edición 2026. Contenido editado por Saulo Flores · Armas M&amp;S.
      </div>
    </div>);

}
window.MenuScreen = MenuScreen;