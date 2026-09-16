// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Armado en México — Pantallas de ACCESORIOS DCAM
// Cartas de lotería del Home, la vitrina del catálogo (15-sep-2026) y la ficha
// de cada accesorio, que desde el 15-sep-2026 es el mismo expediente que la
// ficha de arma (spec «ficha-accesorio», decidido con Saulo pregunta por pregunta).
// Expone en window: HomeAccesoriosSection, AccesoriosScreen, AccesorioFicha

const { useState: useStateAcc } = React;

// ════════════════════════════════════════════════════════════════
// HOME — cartas de lotería de las categorías de accesorio
// ════════════════════════════════════════════════════════════════
// Sin encabezado ni rejilla propios: devuelve solo las cartas, y el Home las
// pinta dentro de la misma mesa de «Categorías» que las de arma (Saulo,
// 13-sep-2026: fuera el título «Accesorios DCAM» y su «Ver todos →»).
function HomeAccesoriosSection({ onNav }) {
  const cats = window.ACCESORIO_CATEGORIES.categoria;
  const counts = {};
  (window.ACCESORIOS || []).forEach(a => { counts[a.categoria] = (counts[a.categoria] || 0) + 1; });

  // El número es cuántos accesorios hay en la categoría y el nombre va abajo.
  // La figura sale de `accesorioPlaceholder`, que ya sabe mapear las diez
  // categorías a las siluetas que existen —solo lee `.categoria`, por eso se le
  // pasa un objeto de un campo.
  return (
    <React.Fragment>
      {cats.filter(c => counts[c.id]).map(c => (
        <window.CartaLoteria key={c.id}
          nombre={c.label}
          cuenta={counts[c.id]}
          unidad="accesorios"
          forma={window.accesorioPlaceholder({ categoria: c.id })}
          onClick={() => onNav && onNav('accesorios', { categoria: c.id })} />
      ))}
    </React.Fragment>
  );
}
window.HomeAccesoriosSection = HomeAccesoriosSection;

// ════════════════════════════════════════════════════════════════
// CATÁLOGO DE ACCESORIOS — la vitrina (rediseño del 15-sep-2026)
// Un puesto de tianguis como el de Municiones del Home: toldo de lona,
// separadores de fichero por categoría y un puesto por pieza con SOLO su nombre
// corto. Decidido con Saulo pregunta por pregunta (docs/DESIGN.md §5.7); él
// retiró el buscador, los desplegables y el aviso de esta pantalla.
// La categoría activa vive en la URL (app.jsx): aquí solo se lee y se avisa con
// `onCategoria` al cambiar de separador.
// ════════════════════════════════════════════════════════════════
function AccesoriosScreen({ initialFilter, onOpenAccesorio, onCategoria }) {
  const vp = window.useViewport();
  // 2 por fila en móvil, 4 en tableta (solo para que no se rompa) y 6 desde el
  // corte único de 1024 px.
  const porFila = vp.width < 720 ? 2 : vp.width < 1024 ? 4 : 6;
  const secciones = window.accesoriosVitrina('all');
  const pedida = initialFilter && initialFilter.categoria;
  const activo = secciones.some((s) => s.id === pedida) ? pedida : 'all';
  const visibles = window.accesoriosVitrina(activo);
  const opciones = [{ id: 'all', label: 'Todas' }].concat(secciones.map((s) => ({ id: s.id, label: s.label })));

  return (
    <div className="amx-vitrina-acc">
      <window.ToldoLona>Accesorios</window.ToldoLona>
      <window.SeparadoresFiltro etiqueta="Categorías de accesorios" opciones={opciones}
        activo={activo} controla="vitrina-acc-panel" onCambiar={(id) => onCategoria && onCategoria(id)} />
      <div id="vitrina-acc-panel" role="tabpanel" aria-labelledby={'separador-' + activo}>
        {visibles.map((s) => (
          <section key={s.id} className="amx-vitrina-acc-seccion" aria-labelledby={'vitrina-acc-' + s.id}>
            <window.CintaDymo id={'vitrina-acc-' + s.id}>{s.label}</window.CintaDymo>
            <window.MesaPuestos items={s.piezas} porFila={porFila} renderPuesto={(a) => (
              <window.PuestoPieza key={a.id}
                rotulo={a.corto}
                ariaLabel={a.corto + ' — ' + a.nombre}
                foto={window.isRealImage(a.img) ? a.img : null}
                silueta={window.accesorioPlaceholder(a)}
                onClick={() => onOpenAccesorio(a.id)} />
            )} />
          </section>
        ))}
      </div>
    </div>
  );
}
window.AccesoriosScreen = AccesoriosScreen;

// ════════════════════════════════════════════════════════════════
// FICHA DE ACCESORIO — el expediente (rediseño del 15-sep-2026)
// Réplica de la ficha de arma (DESIGN.md §5.5 y §5.8): mismas primitivas y
// mismas clases `amx-carpeta-*`, así que la rejilla, el tema oscuro y el móvil
// son los del arma. Lo propio del accesorio: la pestaña con la categoría en
// singular, el nombre corto de título, la silueta sola, el talón sin casilla
// (no hay comparador de accesorios) y la hoja «Compatibilidad».
// ════════════════════════════════════════════════════════════════

// El rótulo de la pestaña del folder: la categoría en singular, como «Pistola»
// en la ficha de arma. «Empuñaduras y culatas» es «Culata» porque su única
// pieza lo es. Una categoría sin entrada cae en su rótulo tal cual.
const ACC_SINGULAR = { cargadores: 'Cargador', opticas: 'Mira', refacciones: 'Refacción', empunaduras: 'Culata' };

// La hoja «Compatibilidad»: los primeros 6 y el resto detrás de «Ver las N»,
// ahí mismo (Saulo, 15-sep-2026). Vive fuera de AccesorioFicha a propósito: un
// componente definido dentro de otro remonta su subárbol en cada render.
// Los nombres son navegación interna: sin «↗», que en el sitio es «abre un PDF».
const COMPAT_A_LA_VISTA = 6;
function HojaCompatibilidad({ compat, onOpenArma }) {
  const [todas, setTodas] = useStateAcc(false);
  if (compat.caso === 'plataforma') {
    return <p className="amx-oficio-texto">Sirve a: {compat.texto} (sin ficha en el Arsenal)</p>;
  }
  const visibles = todas ? compat.armas : compat.armas.slice(0, COMPAT_A_LA_VISTA);
  return (
    <React.Fragment>
      <p className="amx-oficio-texto">
        {compat.caso === 'regla' ? `Sirve a: ${compat.texto}. En el Arsenal:` : 'Sirve a:'}
      </p>
      <ul className="amx-oficio-lista amx-compat-lista">
        {visibles.map((a) => (
          <li key={a.id}>
            <button type="button" className="amx-enlace-tinta" onClick={() => onOpenArma && onOpenArma(a.id)}>
              {a.nombre}
            </button>
          </li>
        ))}
      </ul>
      {compat.armas.length > COMPAT_A_LA_VISTA &&
        <button type="button" className="amx-registro-mas" aria-expanded={todas} onClick={() => setTodas(!todas)}>
          Ver las {compat.armas.length}
        </button>}
    </React.Fragment>
  );
}

function AccesorioFicha({ accesorioId, onOpenArma, onNav, compareIds }) {
  const vp = window.useViewport();
  // Las opiniones llegan con la hidratación de /api/state, DESPUÉS del primer
  // render: sin esta suscripción «Opiniones: …» se quedaba vacío.
  const [, forzar] = useStateAcc(0);
  React.useEffect(() => window.Store && window.Store.onChange(() => forzar((x) => x + 1)), []);
  // La hoja abierta: la primera (Compatibilidad, o Legalidad si no hay) al
  // llegar y al pasar de un accesorio a otro.
  const [tab, setTab] = useStateAcc(0);
  React.useEffect(() => { setTab(0); }, [accesorioId]);
  const talon = window.useTalonFijo(accesorioId);
  const acc = window.getAccesorioById(accesorioId);

  if (!acc) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', color: window.PALETTE.textMuted }}>
        Accesorio no encontrado.
      </div>
    );
  }

  // Un solo corte, el del expediente: 1024px (ver ProductScreen).
  const ancho = vp.width >= 1024;
  const PAD = ancho ? 28 : 16;
  const SEC = ancho ? 52 : 34;   // aire ENTRE secciones fuera del folder

  const priceHistory = window.getAccesorioPriceHistory(acc.id);
  const manualById = (id) => window.getAccesorioManual(id);
  // Precio, fuente, «último precio conocido» y existencias por sucursal: la
  // misma regla que el arma, en src/lib/cotejo.js.
  const inv = window.amxInventarioAccesorio(acc, {
    priceHistory, manuales: window.ACCESORIOS_MANUALES || [], autoridad: window.manualAutoridad,
  });
  const fechaPrecio = inv.manual ? window.amxFmtManualDate(inv.manual.fecha) : '';
  const armas = window.getArmasCompatibles(acc);
  const compat = window.amxCompatAccesorio(acc, armas);
  const opin = window.Store ? window.Store.getOpiniones('accesorio', acc.id) : { up: 0, down: 0 };
  const etOpin = window.amxOpinionLabel(opin.up, opin.down);
  const disp = window.ACCESORIO_CATEGORIES.disponibilidad.find((d) => d.id === acc.avail);
  const SELLOS = window.SELLOS_LEGALES || {};
  const sello = SELLOS[acc.avail] || SELLOS.dcam || { texto: 'CIVIL', tono: 'civil' };
  const cat = window.ACCESORIO_CATEGORIES.categoria.find((c) => c.id === acc.categoria);
  const rotulo = ACC_SINGULAR[acc.categoria] || (cat ? cat.label : 'Accesorio');
  // Las specs del inventario tal cual, y el origen si no viene ya en ellas.
  const specs = acc.specs || [];
  const filas = acc.pais && !specs.some(([k]) => k === 'Origen') ? specs.concat([['Origen', acc.pais]]) : specs;
  const silueta = { forma: window.accesorioPlaceholder(acc), nombre: rotulo.toLowerCase() };

  return (
    <div style={{ paddingBottom: 90 }}>
     <div ref={talon.fichaRef} style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>

      {/* ── EL EXPEDIENTE — el folder manila abierto ───────────────────── */}
      <div style={{ padding: `${ancho ? 26 : 14}px ${PAD}px 0` }}>
        {/* `amx-carpeta--accesorio`: para colgar de ella el CSS que no debe tocar al arma. */}
        <article className="amx-carpeta amx-carpeta--accesorio" aria-labelledby="ficha-nombre">
          <span className="amx-carpeta-rotulo">{rotulo}</span>

          {/* Mismo orden de lectura que el arma; estilo.css lo reparte por
              filas desde 1024px. */}
          <div className="amx-carpeta-grid">
            <header className="amx-carpeta-cab">
              {/* El nombre corto de título y el completo debajo (Saulo, 15-sep-2026). */}
              <h1 id="ficha-nombre" className="t-titulo">{acc.corto || acc.nombre}</h1>
              {acc.corto && <p className="amx-carpeta-completo">{acc.nombre}</p>}
              {acc.descripcion && <p className="amx-carpeta-desc">{acc.descripcion}</p>}
            </header>

            <div className="amx-carpeta-foto">
              <div className="amx-copia">
                <span className="amx-copia-clip" aria-hidden="true" />
                <window.ArmaPolaroid arma={acc} pie="procedencia" silueta={silueta} />
                <span className="amx-copia-sello">
                  <window.SelloLegal key={acc.id} avail={acc.avail} etiqueta={disp ? disp.label : ''}
                    className="amx-sello--estampa" />
                </span>
              </div>
            </div>

            <div className="amx-carpeta-ficha">
              <window.FichaTecnica arma={acc} filas={filas} />
            </div>

            <div className="amx-carpeta-talon">
              <window.TalonComprobante talonRef={talon.talonRef}
                precio={inv.precio} fuente={inv.sigla} fecha={fechaPrecio}
                ultimoConocido={inv.ultimoConocido} historial={priceHistory} />
              {etOpin.hay &&
                <p className="amx-copia-opinion">Opiniones: <b>{etOpin.label}</b></p>}
            </div>

            <div className="amx-carpeta-almacen">
              <window.TarjetaAlmacen filas={inv.sucursales} referencia={acc.dcamRef}
                sigla={inv.sigla} nivelPrecio={acc.priceLvl} movil={!ancho} />
            </div>

            <div className="amx-carpeta-legal amx-separadores">
              <window.FichaTabs activo={tab} onCambiar={setTab}>
                {compat.caso !== 'nada' &&
                  <window.FichaPanel label="Compatibilidad">
                    <HojaCompatibilidad key={acc.id} compat={compat} onOpenArma={onOpenArma} />
                  </window.FichaPanel>}
                <window.FichaPanel label="Legalidad">
                  <div className={'amx-oficio-banda amx-oficio-banda--' + sello.tono}>
                    <span>Clasificación: {sello.texto}</span>
                    {disp && <small>{disp.label}</small>}
                  </div>
                  {disp && <p className="amx-oficio-texto">{disp.desc}</p>}
                  <button type="button" className="amx-oficio-boton" onClick={() => onNav && onNav('legal')}>
                    § Guía legal completa
                  </button>
                </window.FichaPanel>
              </window.FichaTabs>
            </div>

            {priceHistory.length > 0 &&
              <div className="amx-carpeta-historial">
                <window.HistorialPrecios historial={priceHistory} manualById={manualById} movil={!ancho} />
              </div>}
          </div>
        </article>
      </div>

      {/* ── ARMAS COMPATIBLES — todas, en expediente y sin ⇄ ─────────────── */}
      {armas.length > 0 &&
        <section style={{ padding: `${SEC}px ${PAD}px 0` }} aria-labelledby="ficha-compatibles">
          <window.CintaDymo id="ficha-compatibles">Armas compatibles</window.CintaDymo>
          <div className="amx-hscroll amx-similares" style={{
            display: ancho ? 'grid' : 'flex',
            gridTemplateColumns: ancho ? 'repeat(4, 1fr)' : undefined,
            gap: ancho ? 14 : 10,
            overflowX: ancho ? 'visible' : 'auto',
            margin: ancho ? 0 : `0 -${PAD}px`,
            padding: ancho ? 0 : `0 ${PAD}px 4px`
          }}>
            {armas.map((a) =>
              <div key={a.id} style={{ width: ancho ? 'auto' : 300, flexShrink: 0 }}>
                <window.ArmaCard arma={a} onClick={() => onOpenArma && onOpenArma(a.id)} />
              </div>)}
          </div>
        </section>}

      {/* ── LA TARJETA DE COMENTARIOS ─────────────────────────────────── */}
      <section style={{ padding: `${SEC}px ${PAD}px 0` }} aria-labelledby="ficha-opiniones">
        <window.CintaDymo id="ficha-opiniones">Opiniones</window.CintaDymo>
        <div className="amx-comentarios-marco">
          <window.OpinionBlock tipo="accesorio" entidadId={acc.id} entidadNombre={acc.nombre}
            nombreTipo="accesorio" onNav={onNav} />
        </div>
      </section>
     </div>

      {/* El talón fijo (móvil), sin casilla. Se oculta con la barra de
          comparación, que ocupa el mismo hueco. */}
      {!ancho && talon.mostrar && (compareIds || []).length === 0 &&
        <window.TalonComprobante fijo
          precio={inv.precio} fuente={inv.sigla} fecha={fechaPrecio}
          ultimoConocido={inv.ultimoConocido} historial={priceHistory} />}
    </div>
  );
}
window.AccesorioFicha = AccesorioFicha;
