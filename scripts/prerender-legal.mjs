// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Renderizador HTML prerrenderizado para /legalidad
// Genera HTML estático con el contenido editorial completo sin JavaScript.

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const lista = (items) => `<ul>${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;

// La nota [n] de una fuente, enlazada a su entrada en la lista del pie.
function nota(id, refs) {
  var n = refs.indexOf(id) + 1;
  return n ? '<sup class="amx-leg-nota"><a href="#fuente-' + n + '" aria-label="Fuente ' + n + '">[' + n + ']</a></sup>' : '';
}

// Un texto de `explicado` con sus {{id}} cambiados por notas.
function citado(texto, refs) {
  return helpers.amxPartirCitas(texto).map(function(x) {
    return x.fuente ? nota(x.fuente, refs) : esc(x.texto);
  }).join('');
}

function enlacesFuente(f) {
  var a = function(href, texto) {
    return ' <a href="' + esc(href) + '" target="_blank" rel="noopener noreferrer" aria-label="' +
      esc(texto + ': ' + f.titulo + ' (se abre en una pestaña nueva)') + '">' + texto + '</a>';
  };
  return (f.archivoLocal ? a('/' + f.archivoLocal, 'PDF en armado.mx') : '') +
    (f.url ? a(f.url, 'Fuente oficial') : '') +
    (f.urlAlterna ? a(f.urlAlterna, 'Texto en el DOF') : '');
}

// Las Fuentes del pie: las citadas, numeradas por orden de aparición, y el resto de
// documentos de consulta. Lo que no tiene enlace verificado no se publica.
function fuentesHtml(corpus, refs) {
  var fuentes = corpus.fuentes || {};
  var fecha = function(f) { return f.fechaConsulta ? helpers.amxLegalFecha(f.fechaConsulta) : ''; };
  var citadas = refs.map(function(id, i) {
    var f = fuentes[id];
    return '<li id="fuente-' + (i + 1) + '">' + esc(f.titulo) +
      (f.emisor ? ' · ' + esc(f.emisor) : '') + enlacesFuente(f) +
      (fecha(f) ? ' · Consultado el ' + fecha(f) : '') + '</li>';
  }).join('');
  var otras = Object.keys(fuentes)
    .filter(function(id) { return refs.indexOf(id) < 0 && fuentes[id].url; })
    .map(function(id) { return fuentes[id]; })
    .concat(corpus.documentosComplementarios || []);
  return '<section class="amx-leg-fuentes" id="leg-documentos" aria-labelledby="leg-fuentes">' +
    '<h2 id="leg-fuentes">Fuentes</h2><ol>' + citadas + '</ol>' +
    (otras.length ? '<details class="amx-leg-plegable amx-leg-mas-fuentes"><summary>Más documentos de consulta · ' + otras.length + '</summary><ul>' +
      otras.map(function(f) {
        return '<li>' + esc(f.titulo) + (f.emisor ? ' · ' + esc(f.emisor) : '') + enlacesFuente(f) + '</li>';
      }).join('') + '</ul></details>' : '') +
    '</section>';
}

/**
 * Genera el HTML de un requisito individual.
 * `r` es un requisito tal como viene del corpus (sin expandir variantes).
 */
function requisitoHtml(r, corpus, helpers, refs) {
  var html = '<span class="amx-leg-req-nombre">' + esc(r.nombre) + nota(r.fuente, refs) + '</span>';
  var soloSi = helpers && helpers.amxRotuloEscenarios ? helpers.amxRotuloEscenarios(corpus, r.escenarios) : '';
  if (soloSi) html += ' <span class="amx-leg-solo-si">' + esc(soloSi) + '</span>';
  if (r.original) html += ' <span class="amx-leg-sello">ORIGINAL</span>';
  if (r.copia) html += ' <span class="amx-leg-copia">' + esc(r.copia) + '</span>';
  if (r.detalle) html += '<p>' + esc(r.detalle) + '</p>';
  if (r.vigencia) html += '<p>' + esc(r.vigencia) + '</p>';

  // Variantes: si existe r.variantes, mostrar un <dl> por cada variante.
  if (r.variantes && r.variantes.length > 0) {
    html += '<dl>';
    for (var i = 0; i < r.variantes.length; i++) {
      var v = r.variantes[i];
      if (v.revisar) continue;
      html += '<dt>' + esc(v.escenario) + '</dt>';
      // Quién lo expide es la mitad útil del dato: sin esto, el ejidatario sabe que
      // necesita un certificado pero no que se lo da el Comisariado Ejidal inscrito en
      // el Registro Agrario Nacional.
      html += '<dd>' + esc(v.documento) +
        (v.autoridadLocal ? ' <span class="amx-leg-autoridad">Lo expide: ' + esc(v.autoridadLocal) + '</span>' : '') +
        '</dd>';
    }
    html += '</dl>';
  }

  return html;
}

/**
 * La checklist de un trámite: sus requisitos ordenados y sin los que están en
 * revisión. Devuelve { n, html } o null si no hay ninguno.
 */
function requisitosLista(corpus, tramite, refs) {
  if (tramite.revisar) return null;

  // La MISMA lista que pinta la pantalla (amxRequisitosDe en modo catálogo), sin los
  // requisitos en revisión: bots y personas ven el mismo checklist, con el mismo conteo.
  var filtrados = (helpers && helpers.amxRequisitosDe ? helpers.amxRequisitosDe(corpus, tramite.id, {}) : [])
    .filter(function(r) { return r.revisar !== true; });

  if (!filtrados.length) return null;
  var itemsHtml = filtrados.map(function(r) {
    return '<li>' + requisitoHtml(r, corpus, helpers, refs) + '</li>';
  }).join('');
  return { n: filtrados.length, html: '<ol class="amx-leg-checklist">' + itemsHtml + '</ol>' };
}

// El modulo de la cita necesita el formateador de fecha, y esta escrito como funcion
// suelta. Se guarda el juego de helpers en una variable del modulo, DECLARADA: un ESM va
// en modo estricto y una asignacion a variable no declarada revienta el build entero.
let helpers = null;

export function renderLegalHtml(corpus, seccion, h) {
  helpers = h;
  var refs = h.amxReferencias(corpus);
  var ex = corpus.explicado;

  // Legalidad v2 (22-sep-2026): la entrevista va primero, los huecos del corpus no se
  // publican (son de desarrollo) y Requisitos y Permisos se fundieron en Trámites.
  if (seccion === 'hub') {
    return '<article class="amx-leg amx-v2">' +
      '<nav aria-label="Ruta"><a href="/">Inicio</a> › Legalidad</nav>' +
      '<h1>' + esc(corpus.portada.title) + '</h1>' +
      '<p>' + esc(corpus.portada.intro) + '</p>' +
      '<section aria-labelledby="aviso"><h2 id="aviso">' + esc(corpus.avisoTransparencia.titulo) + '</h2>' +
      corpus.avisoTransparencia.parrafos.map(function(p) { return '<p>' + esc(p) + '</p>'; }).join('') +
      '</section>' +
      '<p>' + esc(corpus.advertencia) + '</p>' +
      '<p>Actualizado el <time datetime="' + esc(corpus.actualizado) + '">' + h.amxLegalFecha(corpus.actualizado) + '</time></p>' +
      '<section aria-labelledby="entrevista"><h2 id="entrevista">¿Puedo comprar un arma?</h2>' +
      '<p>Contesta unas preguntas sobre tu situación —ninguna pide un dato personal— y llévate el dictamen con los documentos que te corresponden. ' +
      '<a href="/legalidad/puedo-comprar">Empezar la entrevista</a></p></section>' +
      '<nav aria-label="Secciones"><ul>' +
      '<li><a href="/legalidad/federal">¿Qué arma puedo tener y puedo sacarla de casa?</a>: qué armas están permitidas, dónde pueden estar y cuándo es delito.</li>' +
      '<li><a href="/legalidad/estatal">¿Qué cambia según el estado donde vivo?</a>: dónde sacas tu constancia de antecedentes y a qué tienda te toca ir.</li>' +
      '<li><a href="/legalidad/tramites">¿Qué trámites hago y cuánto cuestan?</a>: los seis trámites ante la Defensa, con su lista de documentos.</li>' +
      '<li><a href="/legalidad/documentos">Fuentes</a>: las leyes, el reglamento y los formatos de donde sale cada respuesta, con sus PDF.</li>' +
      '</ul></nav>' +
      '<nav aria-label="Más"><a href="/preguntas">Preguntas frecuentes</a> · <a href="/soporte">Soporte</a></nav>' +
      '</article>';
  }

  if (seccion === 'documentos') {
    return '<article class="amx-leg amx-v2">' +
      '<nav aria-label="Ruta"><a href="/">Inicio</a> › <a href="/legalidad">Legalidad</a> › Fuentes</nav>' +
      '<h1>Fuentes de la sección de Legalidad</h1>' +
      '<p class="amx-leg-intro">Las leyes, el reglamento y los formatos de donde sale cada respuesta de <a href="/legalidad">Legalidad</a>, con enlace a la autoridad y copia en PDF cuando la hay.</p>' +
      fuentesHtml(corpus, refs).replace('<h2 id="leg-fuentes">Fuentes</h2>', '<h2 id="leg-fuentes">Fuentes citadas</h2>') +
      '</article>';
  }

  if (seccion === 'federal') {
    return '<article class="amx-leg amx-v2">' +
      '<nav aria-label="Ruta"><a href="/">Inicio</a> › <a href="/legalidad">Legalidad</a> › Lo que permite la ley</nav>' +
      '<h1>¿Qué arma puedo tener y puedo sacarla de casa?</h1>' +
      ex.ley.map(function(p) {
        return '<section class="amx-leg-grupo" aria-labelledby="leg-ley-' + esc(p.id) + '">' +
          '<h2 id="leg-ley-' + esc(p.id) + '">' + esc(p.pregunta) + '</h2>' +
          '<p class="amx-leg-respuesta">' + citado(p.texto, refs) + '</p></section>';
      }).join('') +
      fuentesHtml(corpus, refs) +
      '</article>';
  }

  // El prerender de Estatal NO lleva el `<select>` de la pantalla: sin JavaScript un
  // selector no selecciona nada, y lo que el buscador —y quien llegue sin JS— necesita
  // ver son las 32 fichas escritas. La pantalla filtra; esta página las enseña todas.
  if (seccion === 'estatal') {
    var fichas = (corpus.entidades || []).map(function(e) {
      var ant = e.antecedentes || {};
      var antHtml = ant.revisar
        ? '<span class="amx-leg-sin-portal">Portal sin verificar: todavía no hemos comprobado la dependencia ni el enlace de este estado.</span>'
        : esc(ant.dependencia || '') +
          (ant.domicilio ? '<p>' + esc(ant.domicilio) + '</p>' : '') +
          (ant.url ? ' <a href="' + esc(ant.url) + '" target="_blank" rel="noopener noreferrer"' +
            ' aria-label="Ir al trámite de antecedentes penales de ' + esc(e.nombre) +
            ' (se abre en una pestaña nueva)">Ir al trámite</a>' : '');

      return '<section class="amx-leg-estado-ficha">' +
        '<h2>' + esc(e.nombre) + (ant.revisar ? ' <small class="amx-leg-sin-portal">· portal sin verificar</small>' : '') + '</h2>' +
        '<dl class="amx-leg-estado">' +
        '<dt>Constancia de antecedentes penales</dt><dd>' + antHtml + '</dd>' +
        '<dt>Dónde compras</dt><dd>' +
        (e.ventanilla === 'otca' ? 'OTCA, en Monterrey' : 'DCAM, en Naucalpan') +
        ', ' + esc(e.ventanillaFundamento) + nota(e.ventanillaFuente, refs) + '</dd>' +
        '<dt>Envío por correo certificado</dt><dd>' +
        (e.envioPorCorreo ? 'Sí se puede' : 'No se puede desde aquí') +
        ', ' + esc(e.envioFundamento) + nota(e.envioFuente, refs) +
        (e.envioNota ? '<p>' + esc(e.envioNota) + '</p>' : '') + '</dd>' +
        '<dt>Traslado de traumáticas</dt><dd>' +
        (e.traumaticas && !e.traumaticas.revisar
          ? esc(e.traumaticas.texto) + ' — ' + esc(e.traumaticas.fundamento)
          : 'No hemos verificado la regla local de este estado.') +
        '</dd>' +
        '</dl></section>';
    }).join('');

    return '<article class="amx-leg amx-v2">' +
      '<nav aria-label="Ruta"><a href="/">Inicio</a> › <a href="/legalidad">Legalidad</a> › En tu estado</nav>' +
      '<h1>¿Qué cambia según el estado donde vivo?</h1>' +
      '<p class="amx-leg-intro">' + citado(ex.estado, refs) + '</p>' +
      fichas + fuentesHtml(corpus, refs) +
      '</article>';
  }

  if (seccion === 'tramites') {
    var tramites = corpus.tramites || [];
    var fichasTramite = tramites.map(function(t, i) {
      var filas = '';
      if (t.dependencia) filas += '<dt>Dependencia</dt><dd>' + esc(t.dependencia) + '</dd>';
      if (t.sede) filas += '<dt>Sede</dt><dd>' + esc(t.sede) + '</dd>';
      if (t.habilita) filas += '<dt>Qué habilita</dt><dd>' + esc(t.habilita) + (!t.revisar ? nota(t.fuente, refs) : '') + '</dd>';
      if (t.noHabilita) filas += '<dt>Qué NO habilita</dt><dd class="amx-leg-no-habilita">' + esc(t.noHabilita) + '</dd>';
      var costo = '';
      if (t.costo) {
        var vigencia = helpers && helpers.amxVigenciaCuota ? helpers.amxVigenciaCuota(t.costo) : '';
        var importe = helpers && helpers.amxImporte ? helpers.amxImporte(t.costo.monto) : '$' + t.costo.monto;
        costo = '<p class="amx-leg-costo"><span class="amx-leg-importe">' + esc(importe) + ' ' + esc(t.costo.moneda) + '</span>' +
          (t.costo.concepto ? ' <span class="amx-leg-concepto">' + esc(t.costo.concepto) + '</span>' : '') +
          (vigencia ? ' <span class="amx-leg-vigencia-cuota">' + esc(vigencia) + '</span>' : '') + '</p>';
      }
      // La checklist va plegada en un <details>, la del primer paso abierta: es lo
      // mismo que hace la pantalla, y un bot lee el contenido esté abierto o no.
      var reqs = requisitosLista(corpus, t, refs);
      var checklist = reqs
        ? '<details class="amx-leg-plegable"' + (i === 0 ? ' open' : '') + '><summary>' + reqs.n + ' requisitos · checklist</summary>' + reqs.html + '</details>'
        : '';
      return '<article class="amx-leg-ficha">' +
        '<p class="amx-leg-paso"><span class="amx-leg-homoclave">' + esc(t.homoclave || 'DCAM') + '</span></p>' +
        '<h2>' + esc((t.llano || t.nombre) + (t.costo && helpers.amxImporte ? ' · ' + helpers.amxImporte(t.costo.monto) : '')) + '</h2>' +
        '<p class="amx-leg-oficial">Nombre oficial: ' + esc(t.nombre) + '</p>' +
        (t.notaHomoclave ? '<p class="amx-leg-vigencia">' + esc(t.notaHomoclave) + '</p>' : '') +
        '<dl>' + filas + '</dl>' + costo + checklist +
        '</article>';
    }).join('');

    return '<article class="amx-leg amx-v2">' +
      '<nav aria-label="Ruta"><a href="/">Inicio</a> › <a href="/legalidad">Legalidad</a> › Trámites y costos</nav>' +
      '<h1>¿Qué trámites hago y cuánto cuestan?</h1>' +
      '<p class="amx-leg-intro">' + citado(ex.tramites, refs) + '</p>' +
      '<p class="amx-leg-advertencia">' + esc(corpus.advertencia) + '</p>' +
      fichasTramite + fuentesHtml(corpus, refs) +
      '</article>';
  }

  return '';
}

/**
 * La entrevista no se puede jugar sin JavaScript, así que su página estática no finge un
 * formulario: enseña de qué preguntas se compone, qué documentos entran siempre y de dónde
 * sale el criterio. Es lo que un bot puede indexar y lo que alguien sin JS puede leer.
 */
export function renderEntrevistaHtml(arbol, corpus, h) {
  helpers = h;

  var etapasHtml = (arbol.etapas || []).map(function(et) {
    var preguntas = (arbol.preguntas || [])
      .filter(function(p) { return p.etapa === et.id; })
      .map(function(p) { return '<li>' + esc(p.texto) + '</li>'; })
      .join('');
    return '<section><h2>' + esc(et.nombre) + '</h2><ol>' + preguntas + '</ol></section>';
  }).join('');

  var siempreHtml = (arbol.siempre || []).map(function(id) {
    var req = (corpus.requisitos || []).find(function(r) { return r.id === id; });
    return '<li>' + esc(req ? req.nombre : id) + '</li>';
  }).join('');

  return '<article class="amx-ent amx-v2">' +
    '<nav aria-label="Ruta"><a href="/">Inicio</a> › <a href="/legalidad">Legalidad</a> › ¿Puedo comprar un arma?</nav>' +
    '<h1>' + esc(arbol.titulo) + '</h1>' +
    '<p class="amx-leg-advertencia">' + esc(arbol.advertencia) + '</p>' +
    '<p>Son ' + (arbol.preguntas || []).length + ' preguntas sobre tu situación —ninguna pide ' +
    'un dato personal— y al final dice qué papeles te tocan según el formato DEFENSA-02-040, ' +
    'cuál te falta y cómo se consigue. Estas son las preguntas:</p>' +
    etapasHtml +
    '<section><h2>Lo que entra en el expediente pase lo que pase</h2><ul>' + siempreHtml + '</ul></section>' +
    '<nav aria-label="Más"><a href="/legalidad/tramites">Todos los trámites y sus requisitos, sin entrevista</a> · ' +
    '<a href="/legalidad">Legalidad</a></nav>' +
    '</article>';
}
