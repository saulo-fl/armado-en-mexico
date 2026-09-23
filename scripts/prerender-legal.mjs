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

  var cita = fuenteCita(r.fuente && corpus.fuentes ? corpus.fuentes[r.fuente] : null);
  if (cita) html += cita;
  return html;
}

/**
 * La checklist de un trámite: sus requisitos ordenados y sin los que están en
 * revisión. Devuelve { n, html } o null si no hay ninguno.
 */
function requisitosLista(corpus, tramite) {
  if (tramite.revisar) return null;

  // La MISMA lista que pinta la pantalla (amxRequisitosDe en modo catálogo), sin los
  // requisitos en revisión: bots y personas ven el mismo checklist, con el mismo conteo.
  var filtrados = (helpers && helpers.amxRequisitosDe ? helpers.amxRequisitosDe(corpus, tramite.id, {}) : [])
    .filter(function(r) { return r.revisar !== true; });

  if (!filtrados.length) return null;
  var itemsHtml = filtrados.map(function(r) {
    return '<li>' + requisitoHtml(r, corpus, helpers) + '</li>';
  }).join('');
  return { n: filtrados.length, html: '<ol class="amx-leg-checklist">' + itemsHtml + '</ol>' };
}

// El modulo de la cita necesita el formateador de fecha, y esta escrito como funcion
// suelta. Se guarda el juego de helpers en una variable del modulo, DECLARADA: un ESM va
// en modo estricto y una asignacion a variable no declarada revienta el build entero.
let helpers = null;

export function renderLegalHtml(corpus, seccion, h) {
  helpers = h;

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
      '<li><a href="/legalidad/federal">¿Qué arma puedo tener y portar?</a>: qué arma puedes tener, qué papel llenas y cuánto cuesta; la Constitución, la ley reformada en 2025, el reglamento, los formatos y las cuotas.</li>' +
      '<li><a href="/legalidad/estatal">¿Dónde hago los papeles en mi estado?</a>: dónde sacas la constancia de antecedentes penales, en qué armería compras y si puedes mandar la solicitud por correo.</li>' +
      '<li><a href="/legalidad/tramites">¿Cómo saco mi permiso, paso a paso?</a>: seis trámites ante la Defensa, con lo que habilita cada uno, su checklist y su cuota vigente.</li>' +
      '<li><a href="/legalidad/documentos">¿Dónde están la ley y los formatos?</a>: textos oficiales y PDF de consulta alojados en Armado en México.</li>' +
      '</ul></nav>' +
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
            (f.nota && !f.revisar ? '<p>' + esc(f.nota) + '</p>' : '') + '</li>';
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

  if (seccion === 'federal') {
    // Por pregunta ciudadana (hilo 3): la tabla vive en lib/legal.js, junto a la pantalla.
    // Los artículos van como resumen + cita (hilo 4); el hueco de una norma en revisión
    // no se publica (hilo 2): solo su título y su nota de vigencia.
    var grupos = h.amxNormasPorPregunta(corpus);
    var num = 0;
    var gruposHtml = grupos.map(function(g) {
      var peldanos = g.normas.map(function(n) {
        num += 1;
        var arts = (n.articulos || []).map(function(artId) {
          var art = (corpus.articulos || []).find(function(a) { return a.id === artId; });
          if (!art || art.revisar) return '';
          return '<div><strong>' + esc(art.rotulo) + '</strong>' +
            (art.titulo ? '<p>' + esc(art.titulo) + '</p>' : '') +
            (art.resumen ? '<p>' + esc(art.resumen) + '</p>' : '') +
            fuenteCita(corpus.fuentes ? corpus.fuentes[art.fuente] : null) +
            '</div>';
        }).filter(Boolean);
        return '<li class="amx-leg-peldano">' +
          '<p class="amx-leg-peldano-num">' + String(num).padStart(2, '0') + ' · ' + esc(n.rotulo) + '</p>' +
          '<h3>' + esc(n.titulo || n.rotulo) + '</h3>' +
          (!n.revisar && n.resumen ? '<p class="amx-leg-habilita">' + esc(n.resumen) + '</p>' : '') +
          (!n.revisar && n.notaVigencia ? '<p class="amx-leg-vigencia">' + esc(n.notaVigencia) + '</p>' : '') +
          (n.revisar ? '<p class="amx-leg-vigencia">En verificación: su contenido se publica cuando se confirme contra la fuente oficial.</p>' : '') +
          (n.fuente ? fuenteCita(corpus.fuentes ? corpus.fuentes[n.fuente] : null) : '') +
          (arts.length ? '<details class="amx-leg-arts"><summary>' + (arts.length === 1 ? '1 artículo' : arts.length + ' artículos') + ' · resumen y cita</summary><div>' + arts.join('') + '</div></details>' : '') +
          '</li>';
      }).join('');
      return '<section class="amx-leg-grupo" aria-labelledby="leg-grupo-' + esc(g.id) + '">' +
        '<h2 id="leg-grupo-' + esc(g.id) + '">' + esc(g.corto) + '</h2>' +
        '<p class="amx-leg-pregunta">' + esc(g.pregunta) + '</p>' +
        '<ol class="amx-leg-escalera">' + peldanos + '</ol></section>';
    }).join('');

    return '<article class="amx-leg amx-v2">' +
      '<nav aria-label="Ruta"><a href="/">Inicio</a> › <a href="/legalidad">Legalidad</a> › ¿Qué arma puedo tener y portar?</nav>' +
      '<h1>¿Qué arma puedo tener y portar?</h1>' +
      '<p class="amx-leg-intro">Las armas de fuego en México son competencia exclusiva del ' +
      'Congreso de la Unión: ningún estado ni municipio puede crear permisos, licencias ni ' +
      'registros de armas de fuego. Las normas van ordenadas por la pregunta que traes; la ' +
      'jerarquía —de la Constitución al formato de ventanilla— se ve dentro de cada grupo.</p>' +
      gruposHtml +
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
        ', ' + esc(e.ventanillaFundamento) + '</dd>' +
        '<dt>Envío por correo certificado</dt><dd>' +
        (e.envioPorCorreo ? 'Sí se puede' : 'No se puede desde aquí') +
        ', ' + esc(e.envioFundamento) +
        (e.envioNota ? '<p>' + esc(e.envioNota) + '</p>' : '') + '</dd>' +
        '<dt>Traslado de traumáticas</dt><dd>' +
        (e.traumaticas && !e.traumaticas.revisar
          ? esc(e.traumaticas.texto) + ' — ' + esc(e.traumaticas.fundamento)
          : 'No hemos verificado la regla local de este estado.') +
        '</dd>' +
        '</dl></section>';
    }).join('');

    return '<article class="amx-leg amx-v2">' +
      '<nav aria-label="Ruta"><a href="/">Inicio</a> › <a href="/legalidad">Legalidad</a> › ¿Dónde hago los papeles en mi estado?</nav>' +
      '<h1>¿Dónde hago los papeles en mi estado?</h1>' +
      '<p class="amx-leg-advertencia">' + esc(corpus.noHayEstatal) + '</p>' +
      fichas +
      '</article>';
  }

  if (seccion === 'tramites') {
    var tramites = corpus.tramites || [];
    var fichasTramite = tramites.map(function(t, i) {
      var filas = '';
      if (t.dependencia) filas += '<dt>Dependencia</dt><dd>' + esc(t.dependencia) + '</dd>';
      if (t.sede) filas += '<dt>Sede</dt><dd>' + esc(t.sede) + '</dd>';
      if (t.habilita) filas += '<dt>Qué habilita</dt><dd>' + esc(t.habilita) + '</dd>';
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
      var reqs = requisitosLista(corpus, t);
      var checklist = reqs
        ? '<details class="amx-leg-plegable"' + (i === 0 ? ' open' : '') + '><summary>' + reqs.n + ' requisitos · checklist</summary>' + reqs.html + '</details>'
        : '';
      return '<article class="amx-leg-ficha">' +
        '<p class="amx-leg-paso"><span class="amx-leg-homoclave">' + esc(t.homoclave || 'Compra en la DCAM') + '</span></p>' +
        '<h2>' + esc(t.nombre) + '</h2>' +
        (t.notaHomoclave ? '<p class="amx-leg-vigencia">' + esc(t.notaHomoclave) + '</p>' : '') +
        '<dl>' + filas + '</dl>' + costo + checklist +
        (!t.revisar && t.fuente ? fuenteCita(corpus.fuentes ? corpus.fuentes[t.fuente] : null) : '') +
        '</article>';
    }).join('');

    return '<article class="amx-leg amx-v2">' +
      '<nav aria-label="Ruta"><a href="/">Inicio</a> › <a href="/legalidad">Legalidad</a> › Trámites</nav>' +
      '<h1>Trámites</h1>' +
      '<p class="amx-leg-intro">Seis trámites ante la Secretaría de la Defensa Nacional: el permiso extraordinario ' +
      'de adquisición, la compra en la DCAM y el registro del arma; y aparte la licencia de portación, el permiso ' +
      'de colección y el de transporte. Cada uno con lo que habilita, su checklist de requisitos y su cuota vigente. ' +
      'El permiso y la compra son dos trámites distintos: creer que son el mismo papeleo es lo que hace que ' +
      'alguien llegue al mostrador sin expediente.</p>' +
      '<p class="amx-leg-advertencia">' + esc(corpus.advertencia) + '</p>' +
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
    '<nav aria-label="Más"><a href="/legalidad/tramites">Todos los trámites y sus requisitos, sin entrevista</a> · ' +
    '<a href="/legalidad">Legalidad</a></nav>' +
    '</article>';
}
