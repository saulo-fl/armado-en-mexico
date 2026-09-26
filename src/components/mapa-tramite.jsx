// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// EL MAPA DEL TRÁMITE — seis pasos y dos salidas.
//
// Sustituye al diagrama de las tres vías, que no se leía en el teléfono. La
// geometría de la versión ancha la compila Archify desde
// `contratos-legalidad/mapa-tramite-v2.workflow.json`; la alta se dibuja a mano
// porque Archify solo compone en horizontal. Las dos comparten marcado —
// `#node-<paso>`, `[data-edge-id]`, `.nodo-caja`— y por eso comparten el CSS y
// el recorrido de aquí abajo.
//
// El SVG va inline y no en un <img>: servido como imagen no heredaría el CSS de
// la página, y todo el color sale de las clases (bloque «MAPA DEL TRÁMITE» de
// estilo.css) con los tokens de papelería del sitio.
//
// La única pieza que el visitante acciona son los botones SÍ / NO dentro de la
// primera caja: encienden el camino que les toca. Sin JavaScript el diagrama
// sigue siendo legible, solo que estático.

/* ── Los pasos, y por dónde pasa cada respuesta ────────────────────────────
   Un tramo es una flecha y el papel al que llega. Estas dos listas son la
   fuente de la animación: si un paso cambia de `id`, aquí se nota. */
const MAPA_CAMINO_SI = [
  { flecha: 'si', paso: 'solicitud' },
  { flecha: 'entrega', paso: 'espera' },
  { flecha: 'plazo', paso: 'resolucion' },
  { flecha: 'aprobado', paso: 'compra' },
];
const MAPA_CAMINO_NO = [{ flecha: 'no', paso: 'sin' }];
const MAPA_PASOS = ['requisitos', 'solicitud', 'espera', 'resolucion', 'compra', 'sin'];
const MAPA_FLECHAS = ['si', 'entrega', 'plazo', 'aprobado', 'no', 'rechazado'];

// El recorrido, montado sobre un SVG ya pintado. Devuelve su propia limpieza:
// al cambiar de orientación el SVG se reemplaza entero y hay que soltar todo.
function montarRecorridoDelMapa(svg, anuncio) {
  if (!svg) return function () {};

  const vb = svg.viewBox.baseVal;
  const FOCO = parseFloat(svg.dataset.escalaFoco || '2.35');
  const TRAMO = parseFloat(svg.dataset.escalaTramo || '1.75');
  const camara = svg.querySelector('[data-camara]');
  if (!camara) return function () {};

  const quieto = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const paso = (id) => svg.querySelector('#node-' + id);
  const linea = (id) => svg.querySelector('path[data-edge-id="' + id + '"]');
  const rotulo = (id) => svg.querySelector('g[data-edge-id="' + id + '"]');
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  const decir = (txt) => { if (anuncio) anuncio.textContent = txt; };

  // Cada flecha lleva una copia encima: es la que se dibuja al recorrerla.
  const trazos = {};
  const capa = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  capa.setAttribute('aria-hidden', 'true');
  MAPA_FLECHAS.forEach((id) => {
    const p = linea(id);
    if (!p) return;
    const copia = p.cloneNode(false);
    copia.removeAttribute('marker-end');
    copia.setAttribute('class', 'amx-mapa-trazo');
    copia.style.strokeWidth = (parseFloat(getComputedStyle(p).strokeWidth) + 1.4) + 'px';
    capa.appendChild(copia);
    trazos[id] = copia;
  });
  camara.appendChild(capa);

  // Centrar algo = escalarlo y llevar su centro al centro del lienzo. El fondo
  // se queda fuera del grupo de cámara, así que no viaja con el resto.
  function caja(els) {
    let c = null;
    els.filter(Boolean).forEach((el) => {
      const b = el.getBBox();
      if (!c) { c = { x: b.x, y: b.y, width: b.width, height: b.height }; return; }
      const x2 = Math.max(c.x + c.width, b.x + b.width);
      const y2 = Math.max(c.y + c.height, b.y + b.height);
      c.x = Math.min(c.x, b.x); c.y = Math.min(c.y, b.y);
      c.width = x2 - c.x; c.height = y2 - c.y;
    });
    return c;
  }

  function encuadrar(els, escala, ms) {
    const c = caja(els);
    if (!c) return Promise.resolve();
    const tx = vb.width / 2 - escala * (c.x + c.width / 2);
    const ty = vb.height / 2 - escala * (c.y + c.height / 2);
    camara.style.transitionDuration = (quieto ? 0 : ms) + 'ms';
    camara.style.transform = 'translate(' + tx + 'px, ' + ty + 'px) scale(' + escala + ')';
    return esperar(quieto ? 0 : ms);
  }

  function vistaGeneral(ms) {
    camara.style.transitionDuration = (quieto ? 0 : ms) + 'ms';
    camara.style.transform = 'translate(0px, 0px) scale(1)';
    return esperar(quieto ? 0 : ms);
  }

  function marcar(el, clase) {
    if (!el) return;
    el.setAttribute('data-estado', '');
    el.classList.remove('apagado', 'encendido', 'oculto');
    if (clase) el.classList.add(clase);
  }

  function reposo() {
    MAPA_PASOS.forEach((id) => marcar(paso(id), id === 'requisitos' ? 'encendido' : 'apagado'));
    MAPA_FLECHAS.forEach((id) => {
      marcar(linea(id), 'apagado');
      marcar(rotulo(id), 'apagado');
      const t = trazos[id];
      if (t) { t.classList.remove('corriendo'); t.style.transition = 'none'; }
    });
    decir('');
  }

  function dibujar(id, ms) {
    const t = trazos[id];
    if (!t) return Promise.resolve();
    const largo = t.getTotalLength();
    t.style.transition = 'none';
    t.style.strokeDasharray = largo + ' ' + largo;
    t.style.strokeDashoffset = largo;
    t.classList.add('corriendo');
    if (quieto) { t.style.strokeDashoffset = '0'; return Promise.resolve(); }
    return new Promise((listo) => {
      requestAnimationFrame(() => {
        t.style.transition = 'stroke-dashoffset ' + ms + 'ms cubic-bezier(.4, 0, .2, 1)';
        t.style.strokeDashoffset = '0';
        setTimeout(listo, ms);
      });
    });
  }

  let tanda = 0;
  let vivo = true;
  async function recorrer(camino, boton) {
    const mia = ++tanda;
    const sigo = () => vivo && mia === tanda;
    apagarBrillo();
    reposo();
    botones.forEach((b) => {
      b.setAttribute('data-activo', String(b === boton));
      b.setAttribute('aria-pressed', String(b === boton));
    });

    // 1. Fuera todo lo demás y la cámara se acerca a la pregunta.
    MAPA_PASOS.forEach((id) => { if (id !== 'requisitos') marcar(paso(id), 'oculto'); });
    MAPA_FLECHAS.forEach((id) => { marcar(linea(id), 'oculto'); marcar(rotulo(id), 'oculto'); });
    await encuadrar([paso('requisitos')], FOCO, 700);
    if (!sigo()) return;
    await esperar(430);
    if (!sigo()) return;

    // 2. El recorrido, con la cámara acompañando cada tramo.
    for (let i = 0; i < camino.length; i++) {
      const tramo = camino[i];
      const destino = paso(tramo.paso);
      marcar(linea(tramo.flecha), 'encendido');
      marcar(rotulo(tramo.flecha), 'encendido');
      marcar(destino, 'apagado');
      await encuadrar([linea(tramo.flecha), destino], TRAMO, 620);
      if (!sigo()) return;
      await dibujar(tramo.flecha, 540);
      if (!sigo()) return;
      marcar(destino, 'encendido');
      decir(destino ? destino.getAttribute('data-node-label') : '');
      await esperar(260);
      if (!sigo()) return;
    }

    // 3. Vuelta a la vista general; lo no recorrido queda en segundo plano.
    MAPA_PASOS.forEach((id) => { if (paso(id).classList.contains('oculto')) marcar(paso(id), 'apagado'); });
    MAPA_FLECHAS.forEach((id) => {
      if (linea(id).classList.contains('oculto')) { marcar(linea(id), 'apagado'); marcar(rotulo(id), 'apagado'); }
    });
    await vistaGeneral(880);
    if (!sigo()) return;
    const ultimo = paso(camino[camino.length - 1].paso);
    decir('Fin del recorrido: ' + ultimo.getAttribute('data-node-label'));
  }

  // El brillo que recorre el contorno del SÍ hasta que alguien lo usa.
  const brillo = svg.querySelector('.amx-mapa-brillo');
  let animacion = null;
  if (brillo && !quieto && brillo.animate) {
    let largo = 0;
    try { largo = brillo.getTotalLength(); } catch (e) { largo = 0; }
    if (!largo) largo = 2 * (brillo.width.baseVal.value + brillo.height.baseVal.value);
    brillo.style.strokeDasharray = (largo * 0.18) + ' ' + largo;
    animacion = brillo.animate(
      [{ strokeDashoffset: largo }, { strokeDashoffset: 0 }],
      { duration: 2600, iterations: Infinity, easing: 'linear' }
    );
  } else if (brillo) {
    brillo.classList.add('quieto');
  }
  function apagarBrillo() {
    if (animacion) { animacion.cancel(); animacion = null; }
    if (brillo) brillo.classList.add('quieto');
  }

  const botones = Array.prototype.slice.call(svg.querySelectorAll('.amx-mapa-boton'));
  const sueltos = [];
  botones.forEach((b) => {
    const camino = b.classList.contains('amx-mapa-si') ? MAPA_CAMINO_SI : MAPA_CAMINO_NO;
    const alPulsar = () => recorrer(camino, b);
    const alTeclear = (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); recorrer(camino, b); }
    };
    b.addEventListener('click', alPulsar);
    b.addEventListener('keydown', alTeclear);
    sueltos.push(() => { b.removeEventListener('click', alPulsar); b.removeEventListener('keydown', alTeclear); });
  });

  reposo();

  return function limpiar() {
    vivo = false;
    apagarBrillo();
    sueltos.forEach((f) => f());
  };
}

function MapaTramiteAncho() {
  return (
<svg className="amx-mapa-svg amx-mapa-ancho" data-escala-foco="2.35" data-escala-tramo="1.75" viewBox="0 0 1142 364" role="img" aria-labelledby="mapa-titulo mapa-desc">
            <title id="mapa-titulo">Cómo se compra un arma en México</title>
            <desc id="mapa-desc">Del requisito a la compra, con las dos salidas que dejan sin arma.</desc>
            {/* Definitions */}
            <defs>
              <marker id="mapa-punta" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" className="m-default" />
              </marker>
              <marker id="mapa-punta-si" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" className="m-emphasis" />
              </marker>
              <marker id="mapa-punta-no" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" className="m-security" />
              </marker>
              <pattern id="mapa-rejilla" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" className="c-grid" strokeWidth="0.5"/>
              </pattern>
        
              <filter id="mapa-grano" x="0" y="0" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/>
                <feColorMatrix type="saturate" values="0"/>
              </filter>
            </defs>

            {/* Background Grid */}
            <rect width="100%" height="100%" fill="url(#mapa-rejilla)" />
            <g data-camara="">

            {/* Swimlanes */}
            <rect data-graph-role="structural-frame" data-composition-frame-kind="lane" data-composition-frame-id="lane-0" x="40" y="52" width="1086" height="138" rx="10" className="c-lane" strokeWidth="1"/>

            <rect data-graph-role="structural-frame" data-composition-frame-kind="lane" data-composition-frame-id="lane-1" x="40" y="210" width="1086" height="138" rx="10" className="c-lane" strokeWidth="1"/>
            <rect data-graph-role="structural-frame" data-composition-frame-kind="exception-lane" data-composition-frame-id="lane-1-exception" x="46" y="216" width="1074" height="126" rx="8" className="c-security-group" strokeWidth="1"/>

            {/* Las flechas */}
            <path data-edge-from="resolucion" data-edge-to="compra" data-edge-label="aprobado" data-edge-key="0" data-edge-id="aprobado" data-composition-points="816,136;872.4,136" d="M 816 136 L 872.4 136" className="a-emphasis" strokeWidth="1.8" markerEnd="url(#mapa-punta-si)"/>
            <path data-edge-from="solicitud" data-edge-to="espera" data-edge-key="1" data-edge-id="entrega" data-composition-points="472,136;500,136" d="M 472 136 L 500 136" className="a-default" strokeWidth="1.4" markerEnd="url(#mapa-punta)"/>
            <path data-edge-from="requisitos" data-edge-to="sin" data-edge-label="no" data-edge-key="2" data-edge-id="no" data-composition-points="48,136;20,136;20,294;70,294" d="M 48 136 L 20 136 L 20 294 L 70 294" className="a-security" strokeWidth="1.4" markerEnd="url(#mapa-punta-no)"/>
            <path data-edge-from="espera" data-edge-to="resolucion" data-edge-key="3" data-edge-id="plazo" data-composition-points="648,136;676,136" d="M 648 136 L 676 136" className="a-default" strokeWidth="1.4" markerEnd="url(#mapa-punta)"/>
            <path data-edge-from="resolucion" data-edge-to="requisitos" data-edge-label="rechazado" data-edge-key="4" data-edge-id="rechazado" data-composition-points="746,110;746,36;166,36;166,86" d="M 746 110 L 746 36 L 166 36 L 166 86" className="a-security" strokeWidth="1.4" markerEnd="url(#mapa-punta-no)"/>
            <path data-edge-from="requisitos" data-edge-to="solicitud" data-edge-label="sí" data-edge-key="5" data-edge-id="si" data-composition-points="284,136;322,136" d="M 284 136 L 322 136" className="a-emphasis" strokeWidth="1.8" markerEnd="url(#mapa-punta-si)"/>

            {/* Los papeles */}
            <g id="node-requisitos" data-node-id="requisitos" data-node-label="¿Crees que reúnes los requisitos?" data-node-kind="frontend">
              <title>¿Crees que reúnes los requisitos?</title>
              <rect x="48" y="86" width="236" height="100" rx="6" className="c-mask"/>
              <rect x="48" y="86" width="236" height="100" rx="6" className="c-frontend nodo-caja" strokeWidth="1.5"/>
              <g aria-hidden="true" data-semantic-sigil="frontend" className="semantic-sigil s-frontend" transform="translate(54 92) scale(0.6875)">
                <rect x="2" y="3" width="12" height="10" rx="2"/>
                <path d="M2 6.5h12"/>
                <circle cx="4.1" cy="4.8" r=".7" className="sigil-fill"/>
                <circle cx="6.3" cy="4.8" r=".7" className="sigil-fill"/>
              </g>
              <text data-node-label="" x="166" y="107" className="t-primary" fontSize="11" fontWeight="600" textAnchor="middle">¿Crees que reúnes los requisitos?</text>
            </g>

            <g id="node-solicitud" data-node-id="solicitud" data-node-label="Haces tu solicitud" data-node-kind="frontend">
              <title>Haces tu solicitud</title>
              <rect x="322" y="110" width="150" height="52" rx="6" className="c-mask"/>
              <rect x="322" y="110" width="150" height="52" rx="6" className="c-frontend nodo-caja" strokeWidth="1.5"/>
              <g aria-hidden="true" data-semantic-sigil="frontend" className="semantic-sigil s-frontend" transform="translate(328 116) scale(0.6875)">
                <rect x="2" y="3" width="12" height="10" rx="2"/>
                <path d="M2 6.5h12"/>
                <circle cx="4.1" cy="4.8" r=".7" className="sigil-fill"/>
                <circle cx="6.3" cy="4.8" r=".7" className="sigil-fill"/>
              </g>
              <text data-node-label="" x="397" y="131" className="t-primary" fontSize="11" fontWeight="600" textAnchor="middle">Haces tu solicitud</text>
            </g>

            <g id="node-espera" data-node-id="espera" data-node-label="45 a 60 días hábiles" data-node-kind="messagebus">
              <title>45 a 60 días hábiles</title>
              <rect x="500" y="110" width="148" height="52" rx="6" className="c-mask"/>
              <rect x="500" y="110" width="148" height="52" rx="6" className="c-messagebus nodo-caja" strokeWidth="1.5"/>
              <g aria-hidden="true" data-semantic-sigil="messagebus" className="semantic-sigil s-messagebus" transform="translate(506 116) scale(0.6875)">
                <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11"/>
                <circle cx="5" cy="4.5" r="1" className="sigil-fill"/>
                <circle cx="10.5" cy="8" r="1" className="sigil-fill"/>
                <circle cx="7" cy="11.5" r="1" className="sigil-fill"/>
              </g>
              <text data-node-label="" x="574" y="131" className="t-primary" fontSize="11" fontWeight="600" textAnchor="middle">45 a 60 días hábiles</text>
            </g>

            <g id="node-resolucion" data-node-id="resolucion" data-node-label="Resolución" data-node-kind="security">
              <title>Resolución</title>
              <rect x="676" y="110" width="140" height="52" rx="6" className="c-mask"/>
              <rect x="676" y="110" width="140" height="52" rx="6" className="c-security nodo-caja" strokeWidth="1.5"/>
              <g aria-hidden="true" data-semantic-sigil="security" className="semantic-sigil s-security" transform="translate(682 116) scale(0.6875)">
                <path d="M8 2.2 13 4v3.5c0 3.1-1.8 5.4-5 6.5-3.2-1.1-5-3.4-5-6.5V4Z"/>
                <path d="m5.8 8 1.5 1.5 3-3"/>
              </g>
              <text data-node-label="" x="746" y="131" className="t-primary" fontSize="11" fontWeight="600" textAnchor="middle">Resolución</text>
            </g>

            <g id="node-compra" data-node-id="compra" data-node-label="Compras tu arma" data-node-kind="cloud">
              <title>Compras tu arma</title>
              <rect x="872.4" y="110" width="150" height="52" rx="6" className="c-mask"/>
              <rect x="872.4" y="110" width="150" height="52" rx="6" className="c-cloud nodo-caja" strokeWidth="1.5"/>
              <g aria-hidden="true" data-semantic-sigil="cloud" className="semantic-sigil s-cloud" transform="translate(878.4 116) scale(0.6875)">
                <path d="M4.3 12.5h7.3a2.4 2.4 0 0 0 .2-4.8 4 4 0 0 0-7.5-1.3A3.1 3.1 0 0 0 4.3 12.5Z"/>
              </g>
              <text data-node-label="" x="947.4" y="131" className="t-primary" fontSize="11" fontWeight="600" textAnchor="middle">Compras tu arma</text>
            </g>

            <g id="node-sin" data-node-id="sin" data-node-label="No puedes comprar un arma" data-node-kind="security">
              <title>No puedes comprar un arma</title>
              <rect x="70" y="268" width="192" height="52" rx="6" className="c-mask"/>
              <rect x="70" y="268" width="192" height="52" rx="6" className="c-security nodo-caja" strokeWidth="1.5"/>
              <g aria-hidden="true" data-semantic-sigil="security" className="semantic-sigil s-security" transform="translate(76 274) scale(0.6875)">
                <path d="M8 2.2 13 4v3.5c0 3.1-1.8 5.4-5 6.5-3.2-1.1-5-3.4-5-6.5V4Z"/>
                <path d="m5.8 8 1.5 1.5 3-3"/>
              </g>
              <text data-node-label="" x="166" y="289" className="t-primary" fontSize="11" fontWeight="600" textAnchor="middle">No puedes comprar un arma</text>
            </g>

            {/* Lo que dice cada flecha */}
            <g data-detail="context" data-edge-from="resolucion" data-edge-to="compra" data-edge-label="aprobado" data-edge-key="0" data-edge-id="aprobado">
              <rect x="820" y="116" width="48.4" height="14" rx="3" className="c-mask"/>
              <text x="844.2" y="126" className="t-backend" fontSize="8" textAnchor="middle">aprobado</text>
            </g>

            <g data-detail="context" data-edge-from="requisitos" data-edge-to="sin" data-edge-label="no" data-edge-key="2" data-edge-id="no">
              <rect x="30" y="274" width="30" height="14" rx="3" className="c-mask"/>
              <text x="45" y="284" className="t-security" fontSize="8" textAnchor="middle">no</text>
            </g>

            <g data-detail="context" data-edge-from="resolucion" data-edge-to="requisitos" data-edge-label="rechazado" data-edge-key="4" data-edge-id="rechazado">
              <rect x="429.4" y="16" width="53.199999999999996" height="14" rx="3" className="c-mask"/>
              <text x="456" y="26" className="t-security" fontSize="8" textAnchor="middle">rechazado</text>
            </g>
            <g data-detail="context" data-edge-from="requisitos" data-edge-to="solicitud" data-edge-label="sí" data-edge-key="5" data-edge-id="si">
              <rect x="288" y="116" width="30" height="14" rx="3" className="c-mask"/>
              <text x="303" y="126" className="t-backend" fontSize="8" textAnchor="middle">sí</text>
            </g>

        
              {/* SÍ / NO: arrancan el recorrido */}
              <g className="amx-mapa-boton amx-mapa-si" role="button" tabIndex="0" aria-pressed="false"
                 aria-label="Sí, creo que reúno los requisitos. Recorrer el trámite completo">
                <rect className="amx-mapa-cuerpo" x="66" y="130" width="94" height="32" rx="2"/>
                <rect className="amx-mapa-brillo" x="66" y="130" width="94" height="32" rx="2"/>
                <text x="113" y="147">SÍ</text>
              </g>
              <g className="amx-mapa-boton amx-mapa-no" role="button" tabIndex="0" aria-pressed="false"
                 aria-label="No, no reúno los requisitos. Ver a dónde lleva">
                <rect className="amx-mapa-cuerpo" x="172" y="130" width="94" height="32" rx="2"/>
                <text x="219" y="147">NO</text>
              </g>
            </g>
            <rect width="100%" height="100%" filter="url(#mapa-grano)" opacity=".055" style={{ pointerEvents: 'none' }}/>
          </svg>
  );
}

function MapaTramiteAlto() {
  return (
<svg className="amx-mapa-svg amx-mapa-alto" viewBox="0 0 360 668" role="img" data-escala-foco="1.22" data-escala-tramo="1.14"
         aria-labelledby="mapa-titulo mapa-desc">
      <title id="mapa-titulo">Cómo se compra un arma en México</title>
      <desc id="mapa-desc">Del requisito a la compra, con las dos salidas que dejan sin arma.</desc>
      <defs>
        <marker id="mapa-punta" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
          <polygon points="0 0, 9 3.5, 0 7" className="m-default"/>
        </marker>
        <marker id="mapa-punta-si" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
          <polygon points="0 0, 9 3.5, 0 7" className="m-emphasis"/>
        </marker>
        <marker id="mapa-punta-no" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
          <polygon points="0 0, 9 3.5, 0 7" className="m-security"/>
        </marker>
        <pattern id="mapa-rejilla" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M 28 0 L 0 0 0 28" className="c-grid" strokeWidth="0.5"/>
        </pattern>
        <filter id="mapa-grano" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="url(#mapa-rejilla)"/>
      <g data-camara="">
            <rect x="26" y="34" width="308" height="514" rx="8" className="c-lane" strokeWidth="1"/>
            <rect x="26" y="586" width="308" height="76" rx="8" className="c-security-group" strokeWidth="1"/>
            <path data-edge-id="si" d="M 180.0 162.0 L 180.0 195.0" className="a-emphasis" fill="none" strokeWidth="1.8" markerEnd="url(#mapa-punta-si)"/>
            <path data-edge-id="entrega" d="M 180.0 256.0 L 180.0 289.0" className="a-default" fill="none" strokeWidth="1.4" markerEnd="url(#mapa-punta)"/>
            <path data-edge-id="plazo" d="M 180.0 350.0 L 180.0 383.0" className="a-default" fill="none" strokeWidth="1.4" markerEnd="url(#mapa-punta)"/>
            <path data-edge-id="aprobado" d="M 180.0 444.0 L 180.0 477.0" className="a-emphasis" fill="none" strokeWidth="1.8" markerEnd="url(#mapa-punta-si)"/>
            <path data-edge-id="no" d="M 320.0 103.0 L 344.0 103.0 L 344.0 624.0 L 325.0 624.0" className="a-security" fill="none" strokeWidth="1.4" markerEnd="url(#mapa-punta-no)"/>
            <path data-edge-id="rechazado" d="M 40.0 416.0 L 16.0 416.0 L 16.0 12.0 L 180.0 12.0 L 180.0 39.0" className="a-security" fill="none" strokeWidth="1.4" markerEnd="url(#mapa-punta-no)"/>
            <g data-edge-id="si">
              <rect x="198.8" y="174.0" width="22.4" height="15" rx="2" className="c-mask"/>
              <text x="210.0" y="185.0" className="t-backend" fontSize="10" textAnchor="middle">sí</text>
            </g>
            <g data-edge-id="aprobado">
              <rect x="198.2" y="456.0" width="59.6" height="15" rx="2" className="c-mask"/>
              <text x="228.0" y="467.0" className="t-backend" fontSize="10" textAnchor="middle">aprobado</text>
            </g>
            <g data-edge-id="no">
              <rect x="315.8" y="352.5" width="22.4" height="15" rx="2" className="c-mask"/>
              <text x="327.0" y="363.5" className="t-security" fontSize="10" textAnchor="middle">no</text>
            </g>
            <g data-edge-id="rechazado">
              <rect x="107.1" y="5.0" width="65.8" height="15" rx="2" className="c-mask"/>
              <text x="140.0" y="16.0" className="t-security" fontSize="10" textAnchor="middle">rechazado</text>
            </g>
            <g id="node-requisitos" data-node-label="¿Crees que reúnes los requisitos?">
              <rect x="40" y="44" width="280" height="118" className="nodo-caja"/>
              <text x="180.0" y="70.0" className="t-primary" fontSize="13" fontWeight="600" textAnchor="middle">¿Crees que reúnes los requisitos?</text>
            </g>
            <g id="node-solicitud" data-node-label="Haces tu solicitud">
              <rect x="40" y="200" width="280" height="56" className="nodo-caja"/>
              <text x="180.0" y="232.5" className="t-primary" fontSize="13" fontWeight="600" textAnchor="middle">Haces tu solicitud</text>
            </g>
            <g id="node-espera" data-node-label="45 a 60 días hábiles">
              <rect x="40" y="294" width="280" height="56" className="nodo-caja"/>
              <text x="180.0" y="326.5" className="t-primary" fontSize="13" fontWeight="600" textAnchor="middle">45 a 60 días hábiles</text>
            </g>
            <g id="node-resolucion" data-node-label="Resolución">
              <rect x="40" y="388" width="280" height="56" className="nodo-caja"/>
              <text x="180.0" y="420.5" className="t-primary" fontSize="13" fontWeight="600" textAnchor="middle">Resolución</text>
            </g>
            <g id="node-compra" data-node-label="Compras tu arma">
              <rect x="40" y="482" width="280" height="56" className="nodo-caja"/>
              <text x="180.0" y="514.5" className="t-primary" fontSize="13" fontWeight="600" textAnchor="middle">Compras tu arma</text>
            </g>
            <g id="node-sin" data-node-label="No puedes comprar un arma">
              <rect x="40" y="596" width="280" height="56" className="nodo-caja"/>
              <text x="180.0" y="628.5" className="t-primary" fontSize="13" fontWeight="600" textAnchor="middle">No puedes comprar un arma</text>
            </g>
            <g className="amx-mapa-boton amx-mapa-si" role="button" tabIndex="0" aria-pressed="false"
               aria-label="Sí, creo que reúno los requisitos. Recorrer el trámite completo">
              <rect className="amx-mapa-cuerpo" x="56" y="93" width="118" height="48" rx="2"/>
              <rect className="amx-mapa-brillo" x="56" y="93" width="118" height="48" rx="2"/>
              <text x="115" y="118" fontSize="15">SÍ</text>
            </g>
            <g className="amx-mapa-boton amx-mapa-no" role="button" tabIndex="0" aria-pressed="false"
               aria-label="No, no reúno los requisitos. Ver a dónde lleva">
              <rect className="amx-mapa-cuerpo" x="186" y="93" width="118" height="48" rx="2"/>
              <text x="245" y="118" fontSize="15">NO</text>
            </g>
          </g>
      <rect width="100%" height="100%" filter="url(#mapa-grano)" opacity=".055" style={{ pointerEvents: 'none' }}/>
    </svg>
  );
}

function MapaTramite() {
  // El diagrama ancho pide 720 px para que los rótulos se lean; por debajo se
  // sirve el mismo trámite apilado. Se elige uno, no se ocultan los dos.
  const consulta = '(min-width: 760px)';
  const [ancho, setAncho] = React.useState(
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(consulta).matches : true)
  );
  const caja = React.useRef(null);
  const anuncio = React.useRef(null);

  React.useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(consulta);
    const alCambiar = (e) => setAncho(e.matches);
    // Safari < 14 no tiene addEventListener en MediaQueryList.
    if (mq.addEventListener) mq.addEventListener('change', alCambiar);
    else mq.addListener(alCambiar);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', alCambiar);
      else mq.removeListener(alCambiar);
    };
  }, []);

  React.useEffect(() => {
    if (!caja.current) return undefined;
    return montarRecorridoDelMapa(caja.current.querySelector('svg'), anuncio.current);
  }, [ancho]);

  return (
    <figure className="amx-mapa" role="group" aria-labelledby="mapa-pie">
      <div className="amx-mapa-caja" ref={caja}>
        {ancho ? <MapaTramiteAncho /> : <MapaTramiteAlto />}
      </div>
      <p className="amx-solo-lector" role="status" aria-live="polite" ref={anuncio}></p>
      <figcaption id="mapa-pie" className="amx-mapa-pie">
        Del requisito a la compra. Si la resolución es negativa el trámite vuelve al
        principio; la Defensa resuelve en 45 a 60 días hábiles según la ficha vigente.
      </figcaption>
    </figure>
  );
}
window.MapaTramite = MapaTramite;
