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
    html += '<a href="' + esc(fuente.archivoLocal ? '/' + fuente.archivoLocal : fuente.url) + '" target="_blank" rel="noopener noreferrer" aria-label="' + aria + '">' + label + '</a>';
    if (fuente.archivoLocal) html += ' · <a href="' + esc(fuente.url) + '" target="_blank" rel="noopener noreferrer">Fuente oficial</a>';
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
      // Quién lo expide es la mitad útil del dato: sin esto, el ejidatario sabe que
      // necesita un certificado pero no que se lo da el Comisariado Ejidal inscrito en
      // el Registro Agrario Nacional.
      html += '<dd>' + esc(v.documento) +
        (v.autoridadLocal ? ' <span class="amx-leg-autoridad">Lo expide: ' + esc(v.autoridadLocal) + '</span>' : '') +
        '</dd>';
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

// El modulo de la cita necesita el formateador de fecha, y esta escrito como funcion
// suelta. Se guarda el juego de helpers en una variable del modulo, DECLARADA: un ESM va
// en modo estricto y una asignacion a variable no declarada revienta el build entero.
let helpers = null;

export function renderLegalHtml(corpus, seccion, h) {
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
      '<li><a href="/legalidad/documentos">Documentos legales</a></li>' +
      '</ul></nav>' +
      '<section aria-labelledby="huecos"><h2 id="huecos">Qué falta por verificar</h2>' +
      '<ul>' + huecosHtml + '</ul></section>' +
      '<nav aria-label="Más"><a href="/preguntas">Preguntas frecuentes</a> · <a href="/soporte">Soporte</a></nav>' +
      '</article>';
  }

  if (seccion === 'documentos') {
    var fuentes = Object.values(corpus.fuentes || {});
    var locales = fuentes.filter(function(f) { return f.archivoLocal; })
      .concat(corpus.documentosComplementarios || []);
    var web = fuentes.filter(function(f) { return f.url && !f.archivoLocal; });
    var pendientes = fuentes.filter(function(f) { return !f.url; });
    function grupo(titulo, items) {
      return '<section class="amx-leg-hoja"><h2>' + esc(titulo) + '</h2><ul class="amx-leg-documentos">' +
        items.map(function(f) {
          return '<li><strong>' + esc(f.titulo) + '</strong>' +
            (f.emisor ? '<span>' + esc(f.emisor) + '</span>' : '') +
            (f.archivoLocal ? '<a href="/' + esc(f.archivoLocal) + '">Abrir PDF en armado.mx</a>' : '') +
            (f.url ? '<a href="' + esc(f.url) + '">Fuente oficial</a>' : '') +
            (f.urlAlterna ? '<a href="' + esc(f.urlAlterna) + '">Texto oficial en DOF</a>' : '') +
            (!f.url ? '<span>Texto oficial pendiente de verificar</span>' : '') +
            (f.nota ? '<p>' + esc(f.nota) + '</p>' : '') + '</li>';
        }).join('') + '</ul></section>';
    }
    return '<article class="amx-leg amx-v2">' +
      '<nav aria-label="Ruta"><a href="/">Inicio</a> › <a href="/legalidad">Legalidad</a> › Documentos</nav>' +
      '<h1>Documentos legales</h1>' +
      '<p class="amx-leg-intro">Consulta los textos oficiales que sustentan esta guía. Las copias PDF se alojan aquí para facilitar su lectura; el enlace a la autoridad permite comprobar la versión vigente.</p>' +
      grupo('PDF disponibles en armado.mx', locales) +
      grupo('Fuentes oficiales en páginas web o PDF externo', web) +
      grupo('Textos pendientes de verificar', pendientes) +
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

  if (seccion === 'federal') {
    var normas = (corpus.normas || []).slice().sort(function(a, b) { return a.orden - b.orden; });
    var peldanos = normas.map(function(n) {
      var arts = (n.articulos || []).map(function(artId) {
        var art = (corpus.articulos || []).find(function(a) { return a.id === artId; });
        if (!art || art.revisar) return '';
        return '<div><strong>' + esc(art.rotulo) + '</strong>' +
          (art.titulo ? '<p>' + esc(art.titulo) + '</p>' : '') +
          (art.resumen ? '<p>' + esc(art.resumen) + '</p>' : '') +
          fuenteCita(corpus.fuentes ? corpus.fuentes[art.fuente] : null) +
          '</div>';
      }).join('');

      return '<li class="amx-leg-peldano">' +
        '<h2>' + esc(n.rotulo) + '</h2>' +
        (n.titulo ? '<p class="amx-leg-peldano-tit">' + esc(n.titulo) + '</p>' : '') +
        (!n.revisar && n.resumen ? '<p class="amx-leg-habilita">' + esc(n.resumen) + '</p>' : '') +
        (n.notaVigencia ? '<p class="amx-leg-vigencia">' + esc(n.notaVigencia) + '</p>' : '') +
        (n.revisar ? '<p class="amx-leg-hueco">Pendiente de verificar: ' + esc(n.nota) + '</p>' : '') +
        (!n.revisar && n.fuente ? fuenteCita(corpus.fuentes ? corpus.fuentes[n.fuente] : null) : '') +
        (arts ? '<details class="amx-leg-arts"><summary>Artículos</summary><div>' + arts + '</div></details>' : '') +
        '</li>';
    }).join('');

    return '<article class="amx-leg amx-v2">' +
      '<nav aria-label="Ruta"><a href="/">Inicio</a> › <a href="/legalidad">Legalidad</a> › Marco federal</nav>' +
      '<h1>Marco federal</h1>' +
      '<p class="amx-leg-intro">Las armas de fuego en México son competencia exclusiva del ' +
      'Congreso de la Unión. Ningún estado ni municipio puede crear permisos, licencias ni ' +
      'registros de armas de fuego. Esta es la escalera de normas que se aplica, del escalón ' +
      'más alto al más específico.</p>' +
      '<ol class="amx-leg-escalera">' + peldanos + '</ol>' +
      '</article>';
  }

  // El prerender de Estatal NO lleva el `<select>` de la pantalla: sin JavaScript un
  // selector no selecciona nada, y lo que el buscador —y quien llegue sin JS— necesita
  // ver son las 32 fichas escritas. La pantalla filtra; esta página las enseña todas.
  if (seccion === 'estatal') {
    var fichas = (corpus.entidades || []).map(function(e) {
      var ant = e.antecedentes || {};
      var antHtml = ant.revisar
        ? 'Todavía no hemos verificado el portal de este estado. ' + esc(ant.nota || '')
        : esc(ant.dependencia || '') +
          (ant.domicilio ? '<p>' + esc(ant.domicilio) + '</p>' : '') +
          (ant.url ? ' <a href="' + esc(ant.url) + '" target="_blank" rel="noopener noreferrer"' +
            ' aria-label="Ir al trámite de antecedentes penales de ' + esc(e.nombre) +
            ' (se abre en una pestaña nueva)">Ir al trámite</a>' : '');

      return '<section class="amx-leg-estado-ficha">' +
        '<h2>' + esc(e.nombre) + '</h2>' +
        '<dl class="amx-leg-estado">' +
        '<dt>Constancia de antecedentes penales</dt><dd>' + antHtml + '</dd>' +
        '<dt>Dónde compras</dt><dd>' +
        (e.ventanilla === 'otca' ? 'OTCA, en Monterrey' : 'DCAM, en Naucalpan') +
        ', ' + esc(e.ventanillaFundamento) + '</dd>' +
        '<dt>Envío por correo certificado</dt><dd>' +
        (e.envioPorCorreo ? 'Sí se puede' : 'No se puede desde aquí') +
        ', ' + esc(e.envioFundamento) +
        (e.envioNota ? '<p>' + esc(e.envioNota) + '</p>' : '') + '</dd>' +
        '<dt>Traslado de traumáticas</dt><dd>' +
        (e.traumaticas
          ? esc(e.traumaticas.texto) + ' — ' + esc(e.traumaticas.fundamento)
          : 'No hemos verificado la regla local de este estado.') +
        '</dd>' +
        '</dl></section>';
    }).join('');

    return '<article class="amx-leg amx-v2">' +
      '<nav aria-label="Ruta"><a href="/">Inicio</a> › <a href="/legalidad">Legalidad</a> › Lo que cambia por estado</nav>' +
      '<h1>Lo que cambia por estado</h1>' +
      '<p class="amx-leg-advertencia">' + esc(corpus.noHayEstatal) + '</p>' +
      fichas +
      '</article>';
  }

  if (seccion === 'permisos') {
    var fichasTramite = (corpus.tramites || []).map(function(t) {
      var filas = '';
      if (t.dependencia) filas += '<dt>Dependencia</dt><dd>' + esc(t.dependencia) + '</dd>';
      if (t.sede) filas += '<dt>Sede</dt><dd>' + esc(t.sede) + '</dd>';
      if (t.habilita) filas += '<dt>Qué habilita</dt><dd>' + esc(t.habilita) + '</dd>';
      if (t.noHabilita) filas += '<dt>Qué NO habilita</dt><dd>' + esc(t.noHabilita) + '</dd>';
      if (t.costo) {
        filas += '<dt>Costo</dt><dd>$' + esc(t.costo.monto) + ' ' + esc(t.costo.moneda) +
          ' (cuota de ' + esc(t.costo.anio) + ')</dd>';
      }

      return '<article class="amx-leg-ficha">' +
        '<h2>' + esc(t.nombre) + '</h2>' +
        (t.homoclave ? '<p class="amx-leg-homoclave">' + esc(t.homoclave) + '</p>' : '') +
        (t.notaHomoclave ? '<p class="amx-leg-vigencia">' + esc(t.notaHomoclave) + '</p>' : '') +
        '<dl>' + filas + '</dl>' +
        (t.revisar ? '<p class="amx-leg-hueco">Pendiente de verificar: ' + esc(t.nota) + '</p>' : '') +
        (!t.revisar && t.fuente ? fuenteCita(corpus.fuentes ? corpus.fuentes[t.fuente] : null) : '') +
        '</article>';
    }).join('');

    return '<article class="amx-leg amx-v2">' +
      '<nav aria-label="Ruta"><a href="/">Inicio</a> › <a href="/legalidad">Legalidad</a> › Permisos y licencias</nav>' +
      '<h1>Permisos y licencias</h1>' +
      '<section class="amx-leg-contraste">' +
      '<h2>Posesión no es portación</h2>' +
      '<p>Tener un permiso de adquisición te autoriza a comprar el arma y a tenerla en el ' +
      'domicilio que declaraste ante la Secretaría de la Defensa Nacional. Pero sacar esa arma ' +
      'de tu casa para llevarla en la vía pública es otra cosa completamente distinta: eso se ' +
      'llama portación, y requiere una licencia individual de portación (DEFENSA-02-025), que ' +
      'es un trámite separado, más costoso, y cuya concesión no está garantizada aunque cumplas ' +
      'todos los requisitos. Esta es la confusión más frecuente entre las personas que tramitan ' +
      'su primer permiso.</p>' +
      '</section>' +
      fichasTramite +
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
    '<nav aria-label="Más"><a href="/legalidad/requisitos">Todos los requisitos, sin entrevista</a> · ' +
    '<a href="/legalidad">Legalidad</a></nav>' +
    '</article>';
}
