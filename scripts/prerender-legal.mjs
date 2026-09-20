// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Renderizador HTML prerrenderizado para /legalidad
// Genera HTML estático con el contenido editorial completo sin JavaScript.

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const lista = (items) => `<ul>${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;

/**
 * Genera el HTML de una cita de fuente según el molde:
 *   Fuente: <a href="…">TITULO</a> · Consultado el 19-SEP-2026
 * El «↗» y el «(PDF, » solo si fuente.pdf === true.
 */
function fuenteCita(fuente) {
  if (!fuente) return '';
  var titulo = esc(fuente.titulo);
  var html = 'Fuente: ';
  if (fuente.url) {
    var label = titulo;
    var aria = titulo + ' (se abre en una pestaña nueva)';
    if (fuente.pdf) {
      label += ' <span aria-hidden="true">↗</span>';
      aria = '(PDF, se abre en una pestaña nueva)';
    }
    html += '<a href="' + esc(fuente.url) + '" target="_blank" rel="noopener noreferrer" aria-label="' + aria + '">' + label + '</a>';
  } else {
    html += titulo;
  }
  if (fuente.fechaConsulta) {
    var fecha = '';
    if (helpers && helpers.amxLegalFecha) {
      fecha = helpers.amxLegalFecha(fuente.fechaConsulta);
    }
    if (!fecha) fecha = esc(fuente.fechaConsulta);
    html += ' · Consultado el ' + fecha;
  }
  return html;
}

/**
 * Genera el HTML de un requisito individual.
 * `r` es un requisito tal como viene del corpus (sin expandir variantes).
 */
function requisitoHtml(r, corpus, helpers) {
  var html = '<span class="amx-leg-req-nombre">' + esc(r.nombre) + '</span>';
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
      html += '<dd>' + esc(v.documento) + '</dd>';
    }
    html += '</dl>';
  }

  var cita = fuenteCita(r.fuente && corpus.fuentes ? corpus.fuentes[r.fuente] : null);
  if (cita) html += cita;
  return html;
}

/**
 * Genera el HTML de la sección de requisitos de un trámite.
 * Ordena por orden ascendente y filtra revisar === true.
 */
function requisitosSection(corpus, tramite) {
  if (tramite.revisar) return '';

  var reqs = corpus.requisitos || [];
  var filtrados = [];
  for (var i = 0; i < reqs.length; i++) {
    if (reqs[i].tramite === tramite.id && reqs[i].revisar !== true) {
      filtrados.push(reqs[i]);
    }
  }
  filtrados.sort(function(a, b) { return a.orden - b.orden; });

  var itemsHtml = filtrados.map(function(r) {
    return '<li>' + requisitoHtml(r, corpus, helpers) + '</li>';
  }).join('');

  var tramiteCita = fuenteCita(tramite.fuente && corpus.fuentes ? corpus.fuentes[tramite.fuente] : null);

  return '<section class="amx-leg-hoja">' +
    '<h2>' + esc(tramite.nombre) + '</h2>' +
    '<p class="amx-leg-dependencia">' + esc(tramite.dependencia) + '</p>' +
    '<p class="amx-leg-habilita">' + esc(tramite.habilita) + '</p>' +
    (tramite.noHabilita ? '<p class="amx-leg-no-habilita">' + esc(tramite.noHabilita) + '</p>' : '') +
    '<ol class="amx-leg-checklist">' +
    itemsHtml +
    '</ol>' +
    (tramiteCita ? tramiteCita : '') +
    '</section>';
}

export function renderLegalHtml(corpus, seccion, h) {
  // Guardar helpers en cierre para que fuenteCita los vea.
  helpers = h;

  if (seccion === 'hub') {
    var huecos = h.amxLegalHuecos(corpus);
    var huecosHtml = huecos.map(function(hc) {
      return '<li><code>' + esc(hc.tabla) + '</code> — ' + esc(hc.nota) + '</li>';
    }).join('');

    return '<article class="amx-leg amx-v2">' +
      '<nav aria-label="Ruta"><a href="/">Inicio</a> › Legalidad</nav>' +
      '<h1>' + esc(corpus.portada.title) + '</h1>' +
      '<p>' + esc(corpus.portada.intro) + '</p>' +
      '<section aria-labelledby="aviso"><h2 id="aviso">' + esc(corpus.avisoTransparencia.titulo) + '</h2>' +
      corpus.avisoTransparencia.parrafos.map(function(p) { return '<p>' + esc(p) + '</p>'; }).join('') +
      '</section>' +
      '<p>' + esc(corpus.advertencia) + '</p>' +
      '<p>Actualizado el <time datetime="' + esc(corpus.actualizado) + '">' + h.amxLegalFecha(corpus.actualizado) + '</time></p>' +
      '<nav aria-label="Secciones"><ul>' +
      '<li><a href="/legalidad/requisitos">Requisitos</a></li>' +
      '<li><a href="/legalidad/federal">Federal</a></li>' +
      '<li><a href="/legalidad/estatal">Estatal</a></li>' +
      '<li><a href="/legalidad/permisos">Permisos</a></li>' +
      '</ul></nav>' +
      '<section aria-labelledby="huecos"><h2 id="huecos">Qué falta por verificar</h2>' +
      '<ul>' + huecosHtml + '</ul></section>' +
      '<nav aria-label="Más"><a href="/preguntas">Preguntas frecuentes</a> · <a href="/soporte">Soporte</a></nav>' +
      '</article>';
  }

  if (seccion === 'requisitos') {
    var orden = ['permiso-adquisicion', 'compra-dcam'];
    var secciones = orden.map(function(id) {
      var items = corpus.tramites.filter(function(t) { return t.id === id; });
      return items.length > 0 ? requisitosSection(corpus, items[0]) : '';
    }).filter(Boolean).join('');

    return '<article class="amx-leg amx-v2">' +
      '<nav aria-label="Ruta"><a href="/">Inicio</a> › <a href="/legalidad">Legalidad</a> › Requisitos</nav>' +
      '<h1>Requisitos</h1>' +
      '<p class="amx-leg-advertencia">' + esc(corpus.advertencia) + '</p>' +
      secciones +
      '</article>';
  }

  return '';
}
