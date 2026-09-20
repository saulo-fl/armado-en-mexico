// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Armado en México — Pantallas de Producto, Comparador, Legal, FAQ, Acerca

const { useState: useState2, useMemo: useMemo2, useEffect: useEffect2, useRef: useRef2 } = React;

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
            nombreTipo="arma" onNav={onNav} onReportReview={onReportReview} />
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

      <window.ReportarError tipo="arma" titulo={arma.nombre} ruta={'/pistolas/' + (idx.slugPorA[arma.id] || '')} />
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

function OpinionBlock({ tipo, entidadId, entidadNombre, nombreTipo, onNav, onReportReview }) {
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
                  {onReportReview &&
                    <button type="button" className="amx-opinion-denunciar"
                      onClick={() => onReportReview(window.amxContextoDenuncia({
                        review: r, tipo, entidadId, entidadNombre,
                      }))}>
                      Denunciar
                    </button>}
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

      <window.ReportarError tipo="legalidad" titulo="Legalidad" ruta="/legalidad" />
    </div>);

}
window.LegalScreen = LegalScreen;

// ════════════════════════════════════════════════════════════════
// ABOUT — el expediente del propio proyecto
// Decidido con Saulo sección por sección (17-sep-2026). El folder manila lleva
// la identidad: cabecera, el gafete de quien responde y la declaración. Fuera
// del folder, cada sección con su cinta Dymo, como en la ficha de arma.
// El aviso «no somos gobierno» va AL FINAL: Acerca es la sección personal, y el
// aviso ya está claro en Inicio y en Legalidad.
// NADA de folios ni números de expediente: no hay ningún registro real del que
// salgan. El rótulo de la pestaña es el `eyebrow` del Store, que sí es un dato.
// Dentro del papel no entra `amxProsa` (inyecta PALETTE.textDim, que sigue al
// tema) ni PALETTE ni CLARO: el texto va con `.amx-oficio-texto`.
// ════════════════════════════════════════════════════════════════
function AboutScreen() {
  const vp = window.useViewport();
  // Un solo corte, 1024px, el mismo del resto del expediente: `vp.isDesktop`
  // corta a 900 y dejaría una franja con el CSS de una columna y el espaciado
  // de escritorio puesto.
  const ancho = vp.width >= 1024;
  const padX = ancho ? 28 : 16;
  const sec = ancho ? 52 : 34;
  const page = window.Store ? window.Store.getPages().about : null;
  const eyebrow = page?.eyebrow || '◆ ACERCA DE';
  const title = page?.title || 'Armado en México';
  const mision = page?.mision || 'Divulgar de forma rigurosa la información técnica, histórica y legal sobre las armas de fuego disponibles para civiles en México.';
  const autor = page?.autor || 'Saulo Flores';
  const bio = page?.bio || 'Catálogo curado y mantenido con base en información oficial de DCAM, SEDENA y publicaciones técnicas de los fabricantes.';
  const foto = page?.foto || null;
  const decl = window.ARMADO_DECLARACION || { titulo: 'Declaración de intenciones', parrafos: [] };
  return (
    <div className="amx-acerca" style={{ padding: `${ancho ? 26 : 14}px ${padX}px 90px`, maxWidth: 800, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

      {/* ══ EL EXPEDIENTE ══ */}
      <article className="amx-carpeta" aria-labelledby="acerca-titulo">
        <span className="amx-carpeta-rotulo">{eyebrow}</span>

        {/* El DOM va en el orden de lectura del teléfono; en escritorio las
            áreas lo reparten sin reordenarlo. */}
        <div className="amx-acerca-grid">
          <header className="amx-carpeta-cab amx-acerca-cab">
            <img className="amx-acerca-logo" src="imagenes/logo-armado-mx.webp" alt="" />
            <h1 id="acerca-titulo" className="t-titulo">{title}</h1>
          </header>

          {/* La credencial y la misión, hombro con hombro; apiladas en el
              teléfono. Lo pidió Saulo así para que la fila quede simétrica. */}
          <div className="amx-acerca-identidad">
            <div className="amx-acerca-gafete">
              <window.Gafete
                foto={foto}
                nombre={autor}
                cargos={['Creador de Armado en México', 'Co-Fundador de Armas M&S']} />
            </div>

            <section className="amx-oficio" aria-labelledby="acerca-mision">
              <div className="amx-oficio-membrete" aria-hidden="true">
                <span>Armado en México</span><span>Misión</span>
              </div>
              <h2 id="acerca-mision" className="amx-sr">Misión</h2>
              <p className="amx-oficio-texto">{mision}</p>
            </section>
          </div>

          <div className="amx-acerca-papeles">
            <section className="amx-oficio" aria-labelledby="acerca-declaracion">
              <div className="amx-oficio-membrete" aria-hidden="true">
                <span>Armado en México</span><span>{decl.titulo}</span>
              </div>
              {/* El membrete ya rotula la hoja: el encabezado va solo para el
                  lector de pantalla (el membrete es aria-hidden). */}
              <h2 id="acerca-declaracion" className="amx-sr">{decl.titulo}</h2>
              {decl.parrafos.map((t, i) => <p key={i} className="amx-oficio-texto">{t}</p>)}
              <p className="amx-acerca-colofon">Armado en México · ¡Protege lo que amas!</p>
            </section>
          </div>
        </div>
      </article>

      {/* ══ LAS DOS ENTIDADES ══ */}
      <section style={{ padding: `${sec}px 0 0` }} aria-labelledby="acerca-duo">
        <window.CintaDymo id="acerca-duo">Armado en México vs. Armas M&amp;S</window.CintaDymo>
        <div className="amx-acerca-duo">
          <article className="amx-oficio">
            <div className="amx-acerca-duo-cab">
              <img src="imagenes/logo-armado-mx.webp" alt="" />
              <h3 className="amx-oficio-tit">Armado en México</h3>
            </div>
            <p className="amx-oficio-texto">Una <b>enciclopedia libre</b> que busca dar transparencia a toda la parte legal que las instituciones mantienen opaca para tener al pueblo desarmado e ignorante de sus derechos.</p>
          </article>
          <article className="amx-oficio">
            <div className="amx-acerca-duo-cab">
              <span className="amx-acerca-duo-placa"><img src="imagenes/logo-main.png" alt="" /></span>
              <h3 className="amx-oficio-tit">Armas M&amp;S</h3>
            </div>
            <p className="amx-oficio-texto">Un <b>proyecto digital de e-commerce</b> con tienda en <b>armasmys.com</b> y de divulgación en redes sociales (YouTube, Facebook e Instagram) sobre armamento y defensa personal.</p>
          </article>
        </div>
      </section>

      {/* ══ EL AVISO, AL FINAL ══ */}
      <section style={{ padding: `${sec}px 0 0` }} aria-labelledby="acerca-aviso">
        <window.CintaDymo id="acerca-aviso">Aviso</window.CintaDymo>
        <div className="amx-oficio">
          <div className="amx-oficio-membrete" aria-hidden="true">
            <span>Armado en México</span><span>Aviso</span>
          </div>
          <h2 id="acerca-aviso" className="amx-acerca-filete">▲ No somos gobierno · Fines informativos</h2>
          <p className="amx-oficio-texto">Armado en México y Armas M&amp;S NO forman parte de DEFENSA (anteriormente SEDENA), DCAM ni de ninguna dependencia del gobierno mexicano. Somos un proyecto privado divulgativo. No comercializamos armas de fuego, municiones ni accesorios para ellas: se muestran solo con fines informativos y de transparencia. No emitimos licencias ni permisos. Armado en México no realiza ningún tipo de comercialización, Armas M&amp;S realiza comercialización exclusivamente de productos de outdoors y defensa personal en su propia tienda digital (armasmys.com)</p>
        </div>
      </section>

      {/* ══ FUENTES ══ */}
      <section style={{ padding: `${sec}px 0 0` }} aria-labelledby="acerca-fuente">
        <div className="amx-oficio">
          <div className="amx-oficio-membrete" aria-hidden="true">
            <span>Armado en México</span><span>Fuentes</span>
          </div>
          <h2 id="acerca-fuente" className="amx-sr">Fuentes</h2>
          <p className="amx-acerca-nota">{bio}</p>
        </div>
      </section>
    </div>);

}
window.AboutScreen = AboutScreen;

// ════════════════════════════════════════════════════════════════
// SOPORTE — manual de convivencia + formato de denuncia
// Rediseño del 19-sep-2026: convierte /soporte en un manual de convivencia
// vintage, con hojas siempre visibles, formulario de denuncia privada con
// contexto y corrección pública vía GitHub Issues.
// ════════════════════════════════════════════════════════════════
function SoportePortada({ contenido }) {
  return (
    <header className="amx-soporte-portada">
      <window.CintaDymo nivel={1}>{contenido.titulo}</window.CintaDymo>
      <p className="amx-soporte-apertura">{contenido.apertura}</p>
      <p className="amx-soporte-alcance">{contenido.alcance}</p>
    </header>
  );
}

function SoporteAviso({ aviso }) {
  return (
    <section className="amx-soporte-aviso" aria-labelledby="soporte-limite">
      <p className="amx-soporte-aviso-tit" id="soporte-limite">{aviso.titulo}</p>
      <p>{aviso.intro}</p>
      <ul>{aviso.puntos.map((p, i) => <li key={i}>{p}</li>)}</ul>
      <p className="amx-soporte-alcance">{aviso.consecuencia}</p>
    </section>
  );
}

function SoporteHojaNorma({ norma }) {
  return (
    <section className="amx-soporte-regla">
      <h3><span className="amx-soporte-num">NORMA {norma.numero}</span>{norma.titulo}</h3>
      <ul>{norma.puntos.map((p, i) => <li key={i}>{p}</li>)}</ul>
    </section>
  );
}

function SoporteModeracion({ contenido }) {
  return (
    <section className="amx-soporte-carbon amx-soporte-moderacion" aria-labelledby="soporte-moderacion">
      <h3 id="soporte-moderacion">Cómo se moderan las reseñas</h3>
      <ul>{contenido.moderacion.map((p, i) => <li key={i}>{p}</li>)}</ul>
      <h3>Acciones reales</h3>
      <dl className="amx-soporte-acciones">
        {contenido.acciones.map(([n, tit, desc]) => (
          <div key={n} className="amx-soporte-accion">
            <dt><span className="amx-soporte-num">{n}</span>{tit}</dt>
            <dd>{desc}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function SoporteDenuncia({ reportContext }) {
  const contenido = window.AMX_SOPORTE_CONTENT;
  const VACIA = { reviewId: '', tipo: 'otro', entidadId: '', entidadNombre: '', reviewExcerpt: '', motivo: 'ilegal', detalle: '', email: '' };
  const [den, setDen] = useState2(() => Object.assign({}, VACIA, reportContext || {}));
  const [estado, setEstado] = useState2({ kind: 'idle', error: '' });
  const titleRef = useRef2(null);

  useEffect2(() => {
    if (!reportContext) return;
    setDen(Object.assign({}, VACIA, reportContext));
    setEstado({ kind: 'idle', error: '' });
    requestAnimationFrame(() => titleRef.current && titleRef.current.focus());
  }, [reportContext]);

  const setD = (k, v) => setDen((p) => Object.assign({}, p, { [k]: v }));

  const enviar = async (e) => {
    e.preventDefault();
    const detalle = den.detalle.trim();
    if (detalle.length < 20 || detalle.length > 1200) return;
    setEstado({ kind: 'submitting', error: '' });
    const result = await window.Store.addReport(Object.assign({}, den, { detalle }));
    if (result.ok) {
      setDen(VACIA);
      setEstado({ kind: 'success', error: '' });
    } else {
      setEstado({ kind: 'error', error: 'No pudimos enviar el reporte. Tus datos siguen en este formulario para que puedas reintentar.' });
    }
  };

  const borrarContexto = () => {
    setDen(Object.assign({}, VACIA, { motivo: den.motivo, detalle: den.detalle, email: den.email }));
  };

  const motivos = contenido.motivos.map(([v, l]) => ({ value: v, label: l }));

  return (
    <section className="amx-soporte-carbon amx-soporte-denuncia" aria-labelledby="soporte-denuncia">
      <h3 id="soporte-denuncia">Denunciar una reseña</h3>
      <p>{contenido.denuncia.intro}</p>
      <p className="amx-soporte-alcance">{contenido.denuncia.privacidad}</p>

      {estado.kind === 'success' ? (
        <div role="status" aria-live="polite" className="amx-soporte-exito">
          <p className="amx-soporte-exito-tit">✓ {contenido.denuncia.exito}</p>
        </div>
      ) : (
        <form onSubmit={enviar} noValidate className="amx-soporte-formato">
          {reportContext && (
            <div className="amx-soporte-contexto">
              <div>
                <strong ref={titleRef} tabIndex="-1">
                  {reportContext.entidadNombre || 'Entidad no identificada'}
                </strong>
                <button type="button" onClick={borrarContexto} className="amx-soporte-borrar">Borrar contexto</button>
              </div>
              <p className="amx-soporte-alcance">
                {reportContext.tipo} · {reportContext.reviewId || 'captura manual'} · Autor: {reportContext.autor || 'Anónimo'}
              </p>
              {reportContext.reviewExcerpt && (
                <blockquote>"{reportContext.reviewExcerpt}"</blockquote>
              )}
            </div>
          )}

          <div className="amx-soporte-campos">
            <div className="amx-soporte-ancho">
              <label className="amx-renglon-etq" htmlFor="soporte-reviewId">Reseña denunciada</label>
              <input id="soporte-reviewId" className="amx-renglon" value={den.reviewId}
                onChange={(e) => setD('reviewId', e.target.value)}
                placeholder="Ficha y autor, o el texto que empieza por…" />
            </div>
            <div>
              <label className="amx-renglon-etq" htmlFor="soporte-motivo">Motivo</label>
              <select id="soporte-motivo" className="amx-renglon" value={den.motivo}
                onChange={(e) => setD('motivo', e.target.value)}>
                {motivos.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="amx-renglon-etq" htmlFor="soporte-email">Correo (opcional)</label>
              <input id="soporte-email" className="amx-renglon" type="email" value={den.email}
                onChange={(e) => setD('email', e.target.value)} maxLength={160}
                placeholder="para contarte en qué quedó" />
            </div>
            <div className="amx-soporte-ancho">
              <label className="amx-renglon-etq" htmlFor="soporte-detalle">
                ¿Qué pasa con la reseña? <span className="amx-soporte-req">*</span>
              </label>
              <textarea id="soporte-detalle" className="amx-renglon" value={den.detalle}
                onChange={(e) => setD('detalle', e.target.value)}
                rows={3} minLength={20} maxLength={1200} required
                placeholder="Explica brevemente por qué incumple las normas." />
              <p className="amx-renglon-ayuda" aria-describedby="soporte-detalle-count">
                {den.detalle.length} / 20 mínimo — {den.detalle.length >= 20 ? '✓ mínimo alcanzado' : 'necesitas más detalle'}
              </p>
            </div>
          </div>

          <button type="submit" disabled={estado.kind === 'submitting'} className="amx-soporte-enviar">
            {estado.kind === 'submitting' ? 'Enviando…' : estado.kind === 'error' ? 'Reintentar' : 'Enviar denuncia'}
          </button>

          {estado.kind === 'error' && (
            <div role="alert" className="amx-soporte-error">{estado.error}</div>
          )}
        </form>
      )}
    </section>
  );
}

function SoporteDirectorio({ contenido, onNav }) {
  return (
    <section className="amx-soporte-cierre">
      <h3>{contenido.clasificacion.titulo}</h3>
      <ul>{contenido.clasificacion.criterios.map((p, i) => <li key={i}>{p}</li>)}</ul>

      <h3>{contenido.correccion.titulo}</h3>
      <p>{contenido.correccion.intro}</p>
      <ol>{contenido.correccion.pasos.map((p, i) => <li key={i}>{p}</li>)}</ol>

      <h4>Fuentes aceptables</h4>
      <ul>{contenido.correccion.fuentes.map((p, i) => <li key={i}>{p}</li>)}</ul>

      <div className="amx-soporte-directorio">
        {[['legal', '§ Guía legal completa'], ['faq', '? Preguntas frecuentes']].map(([id, txt]) => (
          <button key={id} type="button" onClick={() => onNav && onNav(id)}>{txt} →</button>
        ))}
      </div>
    </section>
  );
}

function SoporteScreen({ onNav, reportContext }) {
  const contenido = window.AMX_SOPORTE_CONTENT;
  return (
    <main className="amx-soporte">
      <SoportePortada contenido={contenido} />
      <SoporteAviso aviso={contenido.venta} />
      <section className="amx-soporte-seccion-normas" aria-labelledby="soporte-normas-titulo">
        <h2 id="soporte-normas-titulo">Normas</h2>
        <div className="amx-soporte-reglas">
          {contenido.normas.map((norma) => <SoporteHojaNorma key={norma.numero} norma={norma} />)}
        </div>
      </section>
      <SoporteModeracion contenido={contenido} />
      <SoporteDenuncia reportContext={reportContext} />
      <SoporteDirectorio contenido={contenido} onNav={onNav} />
    </main>
  );
}
window.SoporteScreen = SoporteScreen;

// ════════════════════════════════════════════════════════════════
// FAQ — el cajón de expedientes
// Rediseño del 18-sep-2026. Las 12 preguntas son folders manila apilados que
// montan uno sobre otro; al abrir uno sale de dentro la hoja de oficio con la
// respuesta. Arriba, el aviso de transparencia como ficha de fichero con clip.
//
// Las preguntas salen de Store —que sirve D1 si lo hay y, si no, el seed de
// store.js—. Ya NO hay una pregunta de repuesto escrita aquí: era la misma
// duplicación que AGENTS.md avisa, y con el texto legal desactualizándose por
// su cuenta.
// ════════════════════════════════════════════════════════════════
function FAQScreen() {
  const vp = window.useViewport();
  const padX = vp.isDesktop ? 28 : 16;
  const faqs = (window.Store && window.Store.getPages().faq) || [];

  return (
    <div className="amx-faq" style={{
      padding: `${vp.isDesktop ? 26 : 14}px ${padX}px 90px`,
      maxWidth: 820, margin: '0 auto', width: '100%', boxSizing: 'border-box'
    }}>
      <window.CintaDymo nivel={1} id="faq-titulo">Preguntas frecuentes</window.CintaDymo>

      {/* ══ EL AVISO — la ficha de fichero, lo primero de la página ══ */}
      {/* La cartulina es la MISMA ficha de fichero de la ficha técnica; el clip
          va fuera de ella porque lleva la máscara de la perforación y una
          máscara recorta lo que asome del borde. */}
      <section className="amx-faq-aviso" aria-labelledby="faq-aviso">
        <span className="amx-copia-clip" aria-hidden="true" />
        <div className="amx-fichero-carton">
          <div className="amx-fichero-cab">
            <h2 id="faq-aviso" className="amx-faq-aviso-tit">▲ Aviso de transparencia</h2>
          </div>
          <p className="amx-faq-aviso-texto">
            Armado en México y Armas M&amp;S no son DEFENSA (anteriormente SEDENA) ni autoridad gubernamental. Las armas de fuego de esta app son informativas: no las comercializamos ni realizamos trámites ante ninguna dependencia. La única vía legal para adquirir un arma de fuego en México son los canales oficiales: la DCAM o la OTCA. Lo único que comercializamos directamente son las tres armas traumáticas menos letales.
          </p>
          <p className="amx-faq-aviso-texto">Armas M&amp;S no presta servicios jurídicos.</p>
        </div>
      </section>

      {/* ══ EL CAJÓN ══ */}
      <div className="amx-faq-cajon">
        {faqs.map((f, i) =>
          <window.FolderPregunta key={i} pregunta={f.q} tema={f.tema}>{f.a}</window.FolderPregunta>
        )}
      </div>

      <window.ReportarError tipo="faq" titulo="Preguntas frecuentes" ruta="/preguntas" />
    </div>);

}
window.FAQScreen = FAQScreen;

// ════════════════════════════════════════════════════════════════
// MENU — pantalla "Más"
// ════════════════════════════════════════════════════════════════
function MenuScreen({ onNav, onTutorial }) {
  const vp = window.useViewport();
  const padX = vp.isDesktop ? 28 : 16;

  // Cada ítem lleva su imagen (silueta webp existente o glifo para los que no tienen asset).
  // Las siluetas se pintan con mask-image sobre el fondo del folder, al estilo del resto del sitio.
  const items = [
    { id: 'traumaticas', img: 'imagenes/silueta-pistola.webp', title: 'Armas traumáticas', desc: 'Defensa menos letal CO₂ .50/.68 · sin permiso SEDENA', accent: true },
    { id: 'accesorios', img: 'imagenes/silueta-cargador.webp', title: 'Accesorios', desc: 'Equipamiento de adquisición legal en la DCAM · precio oficial' },
    { id: 'municiones', img: 'imagenes/silueta-municion.webp', title: 'Municiones', desc: 'Cartuchos por calibre · precio de referencia DCAM / OTCA' },
    { id: 'calibres', img: 'imagenes/silueta-municion.webp', title: 'Calibres', desc: 'Guía de munición: uso, balística y armas' },
    { sep: true },
    { id: 'campos', img: 'imagenes/silueta-rifle.webp', title: 'Campos de tiro', desc: 'Clubes y polígonos aliados', proximamente: true },
    { id: 'experiencias', img: 'imagenes/silueta-escopeta.webp', title: 'Experiencias', desc: 'Formación y actividades de tiro', proximamente: true },
    { sep: true },
    { id: 'legal', glyph: '§', title: 'Legalidad', desc: 'Trámite SEDENA y categorías legales' },
    { id: 'soporte', glyph: '◈', title: 'Soporte y normas', desc: 'Normas de la comunidad, denuncias y moderación' },
    { id: 'faq', glyph: '?', title: 'Preguntas frecuentes', desc: 'Dudas comunes sobre armas y trámites' },
    { id: 'about', img: 'imagenes/isotipo-armado.webp', title: 'Acerca de', desc: 'Sobre Armado en México y M&S' },
    { sep: true },
    { id: 'tutorial', action: 'tutorial', glyph: '▶', title: 'Ver tutorial', desc: 'Reproduce la introducción de bienvenida' },
  ];

  return (
    <div style={{ padding: `20px ${padX}px 90px`, maxWidth: 700, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 12, color: PALETTE.amber,
        letterSpacing: '0.2em', marginBottom: 14,
        textTransform: 'uppercase',
        textAlign: vp.isMobile ? 'center' : 'left'
      }}>☰ ÍNDICE · MÁS</div>

      <div className="amx-menu-folders">
        {items.map((it, i) => {
          if (it.sep) return <hr key={`sep-${i}`} className="amx-menu-sep" />;
          const proximamente = it.proximamente;
          const label = proximamente ? `${it.title} (Próximamente)` : it.title;
          return (
            <button
              key={it.id}
              className={`amx-menu-folder${it.accent ? ' amx-menu-folder--accent' : ''}`}
              disabled={proximamente}
              onClick={proximamente ? undefined : () => it.action === 'tutorial' ? (onTutorial && onTutorial()) : onNav(it.id)}
            >
              <span className="amx-menu-folder-icono">
                {it.img
                  ? <img src={it.img} alt="" width="36" height="36" loading="lazy"
                      style={{ width: 36, height: 36, objectFit: 'contain', opacity: .7 }} />
                  : <span className="amx-menu-folder-glyph">{it.glyph}</span>}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="amx-menu-folder-titulo">{label}</div>
                <div className="amx-menu-folder-desc">{it.desc}</div>
              </div>
              <span className="amx-menu-folder-flecha">›</span>
            </button>
          );
        })}
      </div>

      <div className="amx-menu-pie">
        <strong>◆ ARMADO·MX</strong>
        Catálogo divulgativo. Edición 2026. Contenido editado por Saulo Flores · Armas M&amp;S.
      </div>
    </div>);

}
window.MenuScreen = MenuScreen;
