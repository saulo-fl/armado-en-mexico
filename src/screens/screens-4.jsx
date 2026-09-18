// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Armado en México — Armas Traumáticas (defensa MENOS LETAL)
// TraumaticasScreen (sección propia) · HomeTraumaBanner (destacado en Home)
// ───────────────────────────────────────────────────────────────────────

// ── Una partida de la cotización: un modelo con su ficha, su precio y su
//    salida a la tienda. La piel vive en estilo.css (.amx-cotiz-*); aquí solo
//    queda la estructura y lo que depende de los datos.
function TraumaFicha({ p, indice = 1 }) {
  const url = window.traumaticaUrl(p.handle);
  const ok = p.stock > 0;
  const existencia = ok ? (p.stock <= 3 ? `Últimas ${p.stock} pzas` : 'Disponible') : 'Agotado';

  return (
    <div>
      <div className="amx-cotiz-num">Partida {indice}</div>
      <div className="amx-cotiz-partida">
        <div className="amx-cotiz-foto">
          <img src={p.img} alt={p.nombre} loading="lazy" />
        </div>

        <div>
          <div className="amx-cotiz-marca">{p.marca} · {p.tipo}</div>
          <h3 className="amx-cotiz-modelo">{p.modelo}</h3>
          <div className="amx-cotiz-nombre">{p.nombre}</div>
          <p className="amx-cotiz-resumen">{p.resumen}</p>

          <dl className="amx-cotiz-specs">
            {p.specs.map(([k, v]) => (
              <React.Fragment key={k}>
                <div>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              </React.Fragment>
            ))}
          </dl>

          <div className="amx-cotiz-municion">
            <span className="amx-cotiz-municion-tit">Munición</span>
            {p.municion.map((m) => <span key={m}>{m}</span>)}
          </div>

          <ul className="amx-cotiz-destacados">
            {p.destacados.map((d) => <li key={d}>{d}</li>)}
          </ul>

          <div className="amx-cotiz-cierre">
            <div>
              <div className="amx-cotiz-precio">
                ${p.precio.toLocaleString('es-MX')}<small>MXN</small>
              </div>
              <div className="amx-cotiz-nota">Los tanques de CO₂ se adquieren por separado</div>
            </div>

            <div className="amx-cotiz-estado">
              <span className={ok ? '' : 'amx-cotiz-agotado'}>{existencia}</span>
            </div>

            <a href={url} target="_blank" rel="noopener noreferrer"
              className={'amx-cotiz-accion' + (ok ? '' : ' amx-cotiz-accion--agotado')}>
              Ver en armasmys.com ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── El marco legal, ya dentro del pie de la cotización: son sus condiciones.
//    Se quitó `conManual`, que se calculaba y no se usaba en ningún sitio.
function TraumaLegal() {
  const L = window.TRAUMATICAS_LEGAL || { puntos: [] };

  return (
    <React.Fragment>
      <div className="amx-cotiz-pie-tit">§ Marco legal · México — por qué no requieren permiso</div>

      <p className="amx-cotiz-resumen">{L.resumen}</p>

      <div className="amx-cotiz-condiciones">
        {L.puntos.map((pt) => (
          <div key={pt.tit}>
            <b>{pt.tit}</b>
            {pt.desc}
          </div>
        ))}
      </div>

      <div className="amx-cotiz-aviso">
        <div className="amx-cotiz-aviso-tit">▲ Aviso</div>
        {L.disclaimer}
      </div>
    </React.Fragment>
  );
}

window.TraumaLegal = TraumaLegal;

// ═══════════════════════════════════════════════════════════════════════
// PANTALLA — Armas Traumáticas
// ═══════════════════════════════════════════════════════════════════════
function TraumaticasScreen({ onNav }) {
  const vp = window.useViewport();
  const productos = window.TRAUMATICAS || [];

  return (
    <div style={{ padding: `20px ${vp.isDesktop ? 28 : 16}px 90px`, width: '100%', boxSizing: 'border-box' }}>
      <div className="amx-cotiz">
        {/* El membrete y el folio son papelería ficticia (DESIGN.md §6b): no
            imitan ningún folio de la SEDENA ni llevan iconografía oficial. */}
        <div className="amx-cotiz-membrete">
          <span>Cotización · Armas M&amp;S</span>
          <span>Folio AT-003 · {productos.length} partidas</span>
        </div>

        <h2 className="amx-cotiz-tit">Armas traumáticas</h2>
        <p className="amx-cotiz-entrada">
          Dispositivos de defensa <strong>NO letal</strong> propulsados por CO₂, en calibre .50 y
          .68. Disparan munición de pimienta, goma o polvo inerte para detener una amenaza sin
          recurrir a fuerza letal. Puedes adquirirlos directamente en <strong>armasmys.com</strong>.
        </p>

        <div className="amx-cotiz-partidas">
          {productos.map((p, i) => <TraumaFicha key={p.id} p={p} indice={i + 1} />)}
        </div>

        {/* Las condiciones, al pie, como en una cotización de verdad: primero
            qué se vende y después por qué es legal (decisión de Saulo,
            18-sep-2026). Los textos son los mismos de antes, movidos. */}
        <div className="amx-cotiz-pie">
          <div className="amx-cotiz-pie-tit">Condiciones</div>
          <div className="amx-cotiz-condiciones">
            <div>
              <b>Una categoría totalmente distinta del arsenal.</b>
              Al no ser armas de fuego, no requieren permiso de la SEDENA y puedes adquirirlas
              directamente con nosotros. Son los únicos tres modelos de armamento que
              comercializamos; todas las armas de fuego de esta app se muestran solo con fines
              informativos.
            </div>
            <div>
              <b>También en tienda.</b>
              Cargadores, municiones cal. .50/.68 (goma, pimienta, polvo), tanques de CO₂ y
              fundas. Consulta el catálogo completo en armasmys.com.
            </div>
          </div>

          <TraumaLegal />
        </div>
      </div>
    </div>
  );
}
window.TraumaticasScreen = TraumaticasScreen;

// ═══════════════════════════════════════════════════════════════════════
// BANNER DESTACADO — Home · TRES CARTONES IMPRESOS QUE FORMAN LA BANDERA
// ═══════════════════════════════════════════════════════════════════════
//
// LA DIRECCIÓN. Tres cartones recién salidos de una imprenta barata de los
// ochenta: tinta plana, trama de puntos, filete doble, condensada de caja,
// folio de expediente, cruz de registro — y el registro CORRIDO dos píxeles,
// que es el defecto que delata al offset malo. Puestos en fila —HDP 50,
// SECURE 68P, HDX 68— forman la bandera. DESIGN.md §29 lo autoriza por su
// nombre («líneas tricolor, numeración de expedientes, códigos, gráfica
// editorial mexicana») y §4 pone la única condición: el ochentero va «en el
// lenguaje visual, no mediante filtros de imagen envejecidos». Por eso aquí
// no hay un solo `filter`: la trama es un radial-gradient, el registro
// corrido es una segunda capa de texto y el cartón es geometría.
//
// SE FUE EL GLOW. Eran tres @keyframes de box-shadow —verde, ámbar y fuego—
// pintados con `p.tierColor` (#4FAE5C, #F5C518, #C0392B): tres tonos AJENOS a
// la paleta, y un halo de color que DESIGN.md §5.1b marca por su propio
// nombre, `dark-glow`, como tic de interfaz generada. Lo que separa ahora el
// cartón del lienzo es la SOMBRA, igual que a la polaroid y al folder.
//
// LAS TINTAS SON DIEGÉTICAS Y NINGUNA ES NUEVA: las tres ya vivían en
// estilo.css. Un cartón impreso es del mismo color sobre una mesa a oscuras
// que a plena luz —misma regla que `--copia-*` y `--loteria-*`—, así que
// ninguna sigue al tema. Ahí está la respuesta al caso peligroso: la ficha
// BLANCA del centro no se apaga en oscuro porque no es una superficie de la
// interfaz sino un objeto; sobre el lienzo #1D1D1D da 15.80:1 y se lee como
// lo que es, un cartón blanco sobre un escritorio a media luz.
//
// CONTRASTES MEDIDOS A MANO — `contraste.mjs` no audita los tokens
// diegéticos. Como los tres colores son fijos, cada ratio vale para LOS DOS
// TEMAS y no hay que medirlos dos veces:
//
//   VERDE   plancha --marca        #173A32 · tinta --crema       #F3EFE4  10.83:1
//   BLANCO  plancha --copia-carton #F7F8F4 · tinta --copia-tinta #171B19  16.31:1
//   ROJO    plancha --sello-restr  #A3341F · tinta --blanco      #FAF9F5   6.50:1
//
//   Bajo la trama de puntos (peor caso, al 12 %):    7.72 · 12.75 · 5.15:1
//   Sobre el registro corrido (filo de 2 px, 50 %):  8.94 ·  6.90 · 9.75:1
//   Cartón sobre el lienzo:   1.14:1 en claro (lo separa --sombra) · 15.80:1 en oscuro
//   Plancha sobre el margen de cartón:  verde 11.67:1 · rojo 6.42:1
//   Ventana blanca #FFFFFF sobre el cartón 1.07:1 → la encuadra el filete (16.31:1)
//
// El rojo es --sello-restr #A3341F —la tinta de sello del expediente— y no
// --rojo #C83B32: sobre #C83B32 la tinta clara se queda en 4.83:1, justo en
// el filo de AA y sin margen para la trama. Sobre #A3341F son 6.50:1.

// Las tres tintas, por producto. Va por `id` y no por la posición del array:
// la bandera Saulo la nombró por modelo (HDP 50 verde, SECURE 68P blanco,
// HDX 68 rojo). Lo que no esté en el mapa sale en cartón sin imprimir, que es
// el único de los tres que nunca queda mal.
const TRAUMA_TINTAS = {
  hdp50:     { plancha: 'var(--marca)',        tinta: 'var(--crema)',       fuga: 'var(--sello-restr)' },
  secure68p: { plancha: 'var(--copia-carton)', tinta: 'var(--copia-tinta)', fuga: 'var(--sello-restr)' },
  hdx68:     { plancha: 'var(--sello-restr)',  tinta: 'var(--blanco)',      fuga: 'var(--marca)' },
};

// La cruz de registro de la imprenta. El color va por `style` y no por el
// atributo `stroke`: un var() en atributo de presentación de SVG tiene
// soporte irregular (ui.jsx, trampa 2). `currentColor` hereda la tinta.
function TraumaRegistro() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false"
      style={{ display: 'block', flex: '0 0 auto', stroke: 'currentColor', fill: 'none', strokeWidth: 1 }}>
      <circle cx="6" cy="6" r="3.4" />
      <path d="M6 0v12M0 6h12" />
    </svg>
  );
}

function TraumaTierCard({ p, vp, onNav, indice }) {
  const go = () => onNav && onNav('traumaticas');
  const t = TRAUMA_TINTAS[p.id] || TRAUMA_TINTAS.secure68p;
  // MÓVIL: solo cuatro características —SEDENA, calibre, joules y capacidad—.
  // Los datos YA las traen en las cuatro primeras posiciones de `features` y
  // en ese orden, en los tres productos, así que no hace falta reestructurar
  // data-traumaticas.js ni duplicar el dato. El precio de no duplicarlo: si
  // algún día se reordenan allí, esta lista se reordena con ellas.
  const features = vp.isDesktop ? p.features : p.features.slice(0, 4);
  return (
    <div className="trauma-carton" role="link" tabIndex={0}
      onClick={go}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }}
      aria-label={`P2P ${p.modelo} — ver armas traumáticas`}
      style={{ '--tr-plancha': t.plancha, '--tr-tinta': t.tinta, '--tr-fuga': t.fuga }}>
      <div className="trauma-plancha">
        <div className="trauma-cab">
          <TraumaRegistro />
          {/* Sin folio. «Eliminar el slop de EXP 01/03» (Saulo, 9-sep-2026): era
              un número de expediente inventado, y un dato falso no da carta de
              autenticidad, la quita. El sello queda CENTRADO en la fila. */}
          <span className="trauma-sello">{p.tier}</span>
        </div>
        <div className="trauma-filete" />
        <div className="trauma-kicker">{p.marca}</div>
        <h3 className="trauma-titulo">
          <span className="trauma-fuga" aria-hidden="true">{p.modelo}</span>
          <span className="trauma-tinta">{p.modelo}</span>
        </h3>
        {/* La foto va en POLAROID, como el resto del Home (Saulo, 9-sep-2026).
            Reusa `.amx-polaroid--apaisada`: mismo cartón, mismo faldón y mismo
            giro que las copias de Campos y Experiencias, con el ángulo repartido
            por índice —que es lo que antes alimentaba el folio—. */}
        <figure className="amx-polaroid amx-polaroid--apaisada trauma-copia"
          style={{ '--giro': (window.GIROS_COPIA || [])[indice % 3] }}>
          <div className="amx-polaroid-pozo">
            <img src={p.img} alt={p.nombre} loading="lazy" />
          </div>
        </figure>
        <p className="trauma-tagline">{p.tagline}</p>
        <ul className="trauma-lista">
          {features.map((f) => <li key={f}>{f}</li>)}
        </ul>
        <div className="trauma-pie">Ver ficha completa →</div>
      </div>
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
      {/* La piel de los tres cartones. Vive aquí y no en estilo.css a
          propósito: es un objeto de ESTA pantalla, y estilo.css lo está
          tocando otra sesión en paralelo. Ni un token nuevo — los diegéticos
          que usa (--marca, --copia-carton, --sello-restr y sus tintas) ya
          estaban declarados en el :root de estilo.css. */}
      <style>{`
        /* ── El cartón ────────────────────────────────────────────────────
           Es un OBJETO, no una superficie de la interfaz: lleva el filo de
           --copia-filo igual que la polaroid, y quien lo separa del lienzo es
           --sombra (§5.1b), no el borde. Radio 2px porque un cartón
           troquelado no tiene esquinas redondeadas. */
        .trauma-carton {
          position: relative; box-sizing: border-box;
          display: flex; flex-direction: column;
          width: 100%; height: 100%;
          padding: 9px;                        /* el margen del pliego sin imprimir */
          background: var(--copia-carton);
          border: 1px solid var(--copia-filo);
          border-radius: 2px;
          box-shadow: var(--sombra);
          cursor: pointer;
          transition: box-shadow 200ms ease, transform 200ms ease;
        }
        .trauma-carton:hover { box-shadow: var(--sombra-hover); transform: translateY(-2px); }
        /* El anillo de foco SÍ sigue al tema: es interfaz, no objeto impreso.
           Antes no había ninguno — la foto y el título eran divs con onClick,
           inalcanzables con el teclado. */
        .trauma-carton:focus-visible { outline: 3px solid var(--acento); outline-offset: 3px; }
        @media (prefers-reduced-motion: reduce) {
          .trauma-carton { transition: none; }
          .trauma-carton:hover { transform: none; }
        }

        /* ── La plancha de tinta plana ───────────────────────────────────
           flex:1 iguala las tres alturas en escritorio: sin eso la bandera
           sale escalonada, porque cada arma trae distinto número de
           características (5, 7 y 11). */
        .trauma-plancha {
          position: relative; flex: 1; box-sizing: border-box;
          display: flex; flex-direction: column;
          padding: 12px 13px 15px;
          background: var(--tr-plancha);
          color: var(--tr-tinta);
          overflow: hidden;
        }
        /* La trama de puntos: lo que delata una impresión barata. Es
           GEOMETRÍA —un radial-gradient de 3px de paso—, no un filtro de
           imagen envejecida. Al 12 % el punto ya se VE (al 7 % no llegaba a
           leerse) y el peor caso medido sigue holgado: 7.72:1 sobre el verde ·
           12.75:1 sobre el cartón · 5.15:1 sobre el rojo. */
        .trauma-plancha::before {
          content: ''; position: absolute; inset: 0; z-index: 0; pointer-events: none;
          background-image: radial-gradient(currentColor .9px, transparent 1px);
          background-size: 3px 3px;
          opacity: .12;
        }
        .trauma-plancha > * { position: relative; z-index: 1; }

        /* ── Cabecera: cruz de registro + sello del tier ─────────────────── */
        .trauma-cab {
          /* Rejilla de tres y no flex: así el sello cae en el centro EXACTO de
             la fila, sin que lo desplace el ancho de la cruz de registro. */
          display: grid; grid-template-columns: 1fr auto 1fr;
          align-items: center; gap: 7px;
          font-family: var(--mono);
          font-size: 11px;                     /* piso de texto funcional */
          font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
        }
        /* El tier se queda —«Más económica / Más popular / Más poderosa»—
           pero deja de ser una píldora flotante de radio 999 colgada del
           borde: eso es UI de 2026, no imprenta. Ahora es un sello
           recuadrado, y ningún sello cae recto. */
        .trauma-sello {
          border: 1px solid currentColor;
          padding: 3px 7px;
          letter-spacing: .1em;
          transform: rotate(-1.5deg);
          white-space: nowrap;
        }
        /* El filete doble, el remate de caja de toda la vida. */
        .trauma-filete {
          margin-top: 10px; height: 4px; box-sizing: border-box;
          border-top: 3px solid currentColor; border-bottom: 1px solid currentColor;
        }
        .trauma-kicker {
          margin-top: 10px;
          font-family: var(--mono); font-size: 11px;
          letter-spacing: .2em; text-transform: uppercase;
        }
        /* La condensada de caja. Archivo es variable con eje wdth 75..100
           —así lo pide index.html—: el 75 % da el condensado sin sumar otra
           familia (§5.3). El peso tope de la fuente es 700; 800 se sintetiza. */
        .trauma-titulo {
          position: relative; margin: 4px 0 0;
          font-family: var(--sans); font-weight: 700; font-stretch: 75%;
          font-size: 34px; line-height: .96; letter-spacing: .005em;
          text-transform: uppercase;
        }
        /* EL REGISTRO CORRIDO: la plancha de la tinta vecina, dos píxeles
           fuera de sitio. Es el defecto característico del offset barato, y
           aquí es una segunda capa de TEXTO, no un filtro. Al 50 % el filo de
           2px deja el título en 8.94 (verde) · 6.90 (blanco) · 9.75:1 (rojo). */
        .trauma-fuga {
          position: absolute; left: 0; top: 0; z-index: 0;
          color: var(--tr-fuga); opacity: .5;
          transform: translate(2px, 2px);
          pointer-events: none;
        }
        .trauma-tinta { position: relative; z-index: 1; }
        /* LA COPIA. Sustituye a la ventana de tinta: mismo cartón y mismo
           faldón que las copias de Campos y Experiencias, para que las fichas
           hablen el idioma del resto del Home. */
        .amx-v2 .trauma-carton .trauma-copia {
          margin-top: 13px;
          /* EL MARCO VA EN PORCENTAJE, no en px. Esta es la única polaroid del
             sitio montada sobre una tarjeta de ancho PROPORCIONAL (flex 78 %);
             Campos y Experiencias van a ancho fijo, y por eso allí los 9px de
             la clase apaisada sí caen en la proporción correcta. Aquí no: a
             390px el canto salía al 4.2 % de la foto en vez del 2.7 %.
             El porcentaje de padding se resuelve SIEMPRE contra el ancho del
             bloque contenedor, que es justo lo que quiere decir «proporcional
             a la foto» — y de paso deja de hacer falta la media query.
             Aritmética: el pozo mide CB − 2px de filo − 2p, así que para un
             canto del 2.7 % del pozo, p ≈ 2.55 % del contenedor.
             El faldón, como padding: aquí no va rotulado —el modelo ya está
             escrito arriba, en el título— y repetirlo debajo sería decir dos
             veces lo mismo. El 9.6 % son los 34px de escritorio de siempre,
             congelados en proporción: se mantiene el aspecto de escritorio
             tal cual y es el móvil el que se pone a la par.
             OJO: nada de acentos graves aquí dentro; esto vive en un template
             literal y un acento grave lo cierra a media CSS. */
          padding: 2.55% 2.55% 9.6%;
        }
        /* El pozo de la apaisada va a 16/9, casi el alto que tenía la ventana
           de antes: el cartón entra sin estirar la tarjeta. */
        .amx-v2 .trauma-carton .trauma-copia .amx-polaroid-pozo img {
          /* La apaisada recorta al marco porque sirve fotos de paisaje. Estas
             son RECORTES DE PRODUCTO: se contienen, no se encuadran. Y siguen
             en multiply porque 87 de las fotos del catálogo son recortes sobre
             blanco opaco (CLAUDE.md) y el multiply necesita el blanco debajo,
             que es justo lo que pone el pozo con --copia-placa.
             El 92 % va como ancho y alto de la caja, NO como max-width/max-height:
             Safari ignoraba el max-height en % dentro de un pozo con aspect-ratio
             y la foto cuadrada salía recortada en el iPhone (ver estilo.css). */
          width: 92%; height: 92%;
          object-fit: contain;
          mix-blend-mode: multiply;
        }
        .trauma-tagline {
          margin: 13px 0 0; font-family: var(--sans);
          font-size: 14.5px; line-height: 1.45; text-wrap: pretty;
        }
        /* El margen de abajo NO es decorativo: la ficha roja trae once
           características y llena la plancha entera, así que ahí el
           margin-top:auto del pie se queda en 0 y el filete se le montaba a
           la última línea. Este margen es el hueco garantizado. */
        .trauma-lista {
          list-style: none; margin: 13px 0 13px; padding: 0;
          display: flex; flex-direction: column; gap: 8px;
        }
        .trauma-lista li {
          display: flex; gap: 9px; align-items: flex-start;
          font-family: var(--sans); font-size: 14.5px; line-height: 1.4;
        }
        /* El cuadratín de la caja, en lugar del palomita-dentro-de-círculo. */
        .trauma-lista li::before {
          content: ''; flex: 0 0 auto; width: 7px; height: 7px; margin-top: 6px;
          background: currentColor;
        }
        /* La primera línea es siempre «No requiere permiso de la SEDENA»:
           es el titular de la categoría, y va en negra. */
        .trauma-lista li:first-child { font-weight: 700; }

        /* El pie de imprenta. El margin-top:auto lo clava abajo, y ahí hace dos
           cosas: cierra las tres planchas por el mismo canto —sin él la ficha
           verde se quedaba con 200px de tinta vacía, porque solo trae cinco
           características frente a las once de la roja— y dice que el cartón
           entero es pulsable, que antes no lo decía nadie. */
        .trauma-pie {
          margin-top: auto; padding-top: 13px;
          border-top: 1px solid currentColor;
          font-family: var(--mono); font-size: 11px;
          font-weight: 700; letter-spacing: .16em; text-transform: uppercase;
        }

        /* MÓVIL Y TABLETA — el mismo corte que vp.isDesktop (900px). Ahí la
           ficha va en el carrusel y solo lleva cuatro características, así
           que el cartón se aprieta. */
        @media (max-width: 899px) {
          .trauma-titulo  { font-size: 29px; }
          /* El marco ya no se toca aquí: va en % y se ajusta solo. */
          .amx-v2 .trauma-carton .trauma-copia { margin-top: 12px; }
          .trauma-plancha { padding: 11px 12px 14px; }
        }
      `}</style>
      {/* Encabezado de sección */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: vp.isDesktop ? 26 : 14, flexWrap: 'wrap', padding: `0 ${PAD}px` }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: vp.isDesktop ? 26 : 21, color: PALETTE.text, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Armas Traumáticas</h2>
        </div>
        {/* Repetía a mano el estilo del enlace de acción y lo pintaba con
            PALETTE.amber — el verde de MARCA, el mismo tono del título de al
            lado: no se distinguía de un encabezado. estiloAccion(false) le da el
            rojo de acción sobre superficie clara (#A3341F, 5.96:1 sobre el
            lienzo crema) y los 44px de área táctil. */}
        <button onClick={() => onNav('traumaticas')}
          style={{ ...window.estiloAccion(false), whiteSpace: 'nowrap' }}>Ver detalles →</button>
      </div>

      {/* Escritorio: 3 tarjetas en grid · Móvil: carrusel horizontal con swipe */}
      {vp.isDesktop ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          // 20, de la escala de 6 valores (§5.2); eran 22, fuera de escala.
          // Y apretado a propósito: cuanto más juntos los tres cartones, más
          // se lee la bandera y menos tres tarjetas sueltas.
          gap: 20,
          alignItems: 'stretch',
          padding: `0 ${PAD}px`,
        }}>
          {productos.map((p, i) => <TraumaTierCard key={p.id} p={p} vp={vp} onNav={onNav} indice={i} total={productos.length} />)}
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
            gap: 12,
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            // El padding vertical era generoso porque el badge sobresalía -12px
            // y el glow se expandía ~56px. Ya no hay ni badge colgado ni glow:
            // basta con dejar respirar la sombra del cartón.
            padding: `12px ${PAD}px 20px`,
            scrollPaddingLeft: PAD,
            alignItems: 'stretch',
            cursor: dragging ? 'grabbing' : 'grab',
            userSelect: dragging ? 'none' : undefined,
          }}>
          {productos.map((p, i) => (
            <div key={p.id} style={{
              flex: '0 0 78%',
              maxWidth: 300,
              minWidth: 0,
              display: 'flex',
              scrollSnapAlign: 'start',
            }}>
              <TraumaTierCard p={p} vp={vp} onNav={onNav} indice={i} total={productos.length} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
window.HomeTraumaBanner = HomeTraumaBanner;
