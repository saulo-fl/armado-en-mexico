// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

(function () {
  /**
   * Devuelve true si el ítem existe y NO tiene revisar === true.
   */
  function amxLegalPublicado(item) {
    return item != null && item.revisar !== true;
  }

  /**
   * Busca una fuente del corpus por su clave id.
   */
  function amxLegalFuente(corpus, id) {
    return (corpus.fuentes && corpus.fuentes[id]) || null;
  }

  /**
   * Recorre todas las tablas del corpus y devuelve un array plano de
   * { tabla, id, nota } para cada ítem que tenga revisar === true.
   */
  function amxLegalHuecos(corpus) {
    // Un hueco no siempre es una entrada entera: puede ser un limite de un tramite, una
    // variante de un requisito, o el portal de antecedentes de un estado. Si esta funcion
    // solo mirara el primer nivel, el bloque «que falta por verificar» del hub enseniaria
    // 5 huecos donde hay 18, y el sitio pareceria mas verificado de lo que esta. Eso es
    // justo lo contrario de para lo que existe ese bloque.
    var tablas = ['normas', 'articulos', 'tramites', 'requisitos', 'entidades'];
    var resultado = [];
    var i, j, k;

    function apuntar(tabla, id, nota) {
      resultado.push({ tabla: tabla, id: id, nota: nota || '' });
    }

    // Las fuentes son un objeto, no un array: se recorre aparte.
    var fuentes = corpus.fuentes || {};
    for (var clave in fuentes) {
      if (Object.prototype.hasOwnProperty.call(fuentes, clave) && fuentes[clave].revisar === true) {
        apuntar('fuentes', clave, fuentes[clave].nota);
      }
    }

    for (i = 0; i < tablas.length; i++) {
      var tabla = tablas[i];
      var items = corpus[tabla];
      if (!Array.isArray(items)) continue;
      for (j = 0; j < items.length; j++) {
        var it = items[j];
        if (it.revisar === true) apuntar(tabla, it.id, it.nota);

        var limites = it.limites || [];
        for (k = 0; k < limites.length; k++) {
          if (limites[k].revisar === true) {
            apuntar(tabla + '/limites', it.id + '/' + (limites[k].id || k), limites[k].nota);
          }
        }

        var variantes = it.variantes || [];
        for (k = 0; k < variantes.length; k++) {
          if (variantes[k].revisar === true) {
            apuntar(tabla + '/variantes', it.id + '/' + (variantes[k].escenario || k), variantes[k].nota);
          }
        }

        // El portal de antecedentes penales de cada estado: el dato por el que existe
        // la pestania Estatal, y el que mas huecos tiene.
        if (it.antecedentes && it.antecedentes.revisar === true) {
          apuntar('entidades/antecedentes', it.id, it.antecedentes.nota);
        }
        if (it.traumaticas && it.traumaticas.revisar === true) {
          apuntar('entidades/traumaticas', it.id, it.traumaticas.nota);
        }
      }
    }
    return resultado;
  }

  /**
   * Devuelve los requisitos de un trámite, filtrados por escenarios y
   * ordenados por orden ascendente. Devuelve COPIAS de los objetos.
   */
  function amxRequisitosDe(corpus, tramiteId, escenarios) {
    var requisitos = corpus.requisitos || [];
    var resultado = [];

    for (var i = 0; i < requisitos.length; i++) {
      var req = requisitos[i];

      // a) filtro por tramite
      if (req.tramite !== tramiteId) continue;

      var incluir = false;
      var variante = null;

      // b) escenarios con '*' → entra tal cual
      if (Array.isArray(req.escenarios) && req.escenarios.length === 1 && req.escenarios[0] === '*') {
        incluir = true;
      }
      // b') escenarios propios (p. ej. ['extranjero']) sin variantes: entra si casa con
      // lo elegido, y en MODO CATÁLOGO entra siempre, con `escenarios` a la vista para
      // que la pantalla diga «Solo si: …». Antes se descartaba y la ficha del permiso
      // perdía el documento de residencia que sí pide a una persona extranjera.
      else if (Array.isArray(req.escenarios) && !Array.isArray(req.variantes)) {
        var pedidos = [];
        for (var ejeP in escenarios) {
          if (Object.prototype.hasOwnProperty.call(escenarios, ejeP) && escenarios[ejeP]) pedidos.push(escenarios[ejeP]);
        }
        if (!pedidos.length) incluir = true;
        else for (var q = 0; q < req.escenarios.length; q++) if (pedidos.indexOf(req.escenarios[q]) !== -1) { incluir = true; break; }
      }
      // c) si tiene variantes, busca una que case con los escenarios
      else if (Array.isArray(req.variantes)) {
        // `escenarios` viene por eje —{ ingresos: 'ejidatario' }— o como lista de ids.
        // Una variante casa cuando su escenario es uno de los VALORES, no una clave.
        var elegidos = [];
        for (var eje in escenarios) {
          if (Object.prototype.hasOwnProperty.call(escenarios, eje) && escenarios[eje]) {
            elegidos.push(escenarios[eje]);
          }
        }
        if (!elegidos.length) {
          // MODO CATÁLOGO. Sin escenarios no hay a quién adaptar el documento, y las dos
          // lecturas posibles no son simétricas: descartar el requisito dejaría la
          // pantalla de Requisitos sin la carta de trabajo, sin la constancia del contador
          // y sin el certificado del comisariado ejidal —justo lo que más cuesta
          // encontrar en el formato—. Así que se devuelve entero, con TODAS sus variantes,
          // que es lo que esa pantalla necesita enseñar.
          incluir = true;
        } else {
          for (var k = 0; k < req.variantes.length; k++) {
            var v = req.variantes[k];
            if (v.escenario && elegidos.indexOf(v.escenario) !== -1) {
              incluir = true;
              variante = v;
              break;
            }
          }
        }
      }
      // d) si no tiene escenarios ni variantes, no entra
      else {
        continue;
      }

      if (incluir) {
        // Devolver COPIA profunda del requisito
        var copia = {};
        for (var key in req) {
          if (req.hasOwnProperty(key)) {
            copia[key] = req[key];
          }
        }
        // Reemplazar variantes por la variante solitaria
        if (variante !== null) {
          copia.variante = variante;
          delete copia.variantes;
        }
        resultado.push(copia);
      }
    }

    // Ordenar por orden ascendente
    resultado.sort(function (a, b) {
      return a.orden - b.orden;
    });

    return resultado;
  }

  // Una nota al pie dentro de un texto del corpus: {{id-de-fuente}}.
  var AMX_CITA = /{{([a-z0-9-]+)}}/g;

  /**
   * Parte un texto de `explicado` en trozos: { texto } para lo que se lee y { fuente }
   * para cada nota al pie. La pantalla y el prerender pintan los mismos trozos.
   */
  function amxPartirCitas(texto) {
    var trozos = [];
    var desde = 0;
    String(texto || '').replace(AMX_CITA, function (m, id, pos) {
      if (pos > desde) trozos.push({ texto: texto.slice(desde, pos) });
      trozos.push({ fuente: id });
      desde = pos + m.length;
      return m;
    });
    if (desde < String(texto || '').length) trozos.push({ texto: texto.slice(desde) });
    return trozos;
  }

  /**
   * Las fuentes que cita la página, en el orden en que aparecen por primera vez: la
   * posición + 1 es el número de la nota [n] y el de su entrada en la lista del pie,
   * como en Wikipedia. Sigue el orden de la página: las respuestas de lo que permite la
   * ley, la línea de los estados y sus fichas, la entrada de trámites y cada trámite
   * (su fuente y luego la de cada requisito publicado).
   */
  function amxReferencias(corpus) {
    var fuentes = corpus.fuentes || {};
    var orden = [];
    function anota(id) { if (id && fuentes[id] && orden.indexOf(id) < 0) orden.push(id); }
    function delTexto(t) { amxPartirCitas(t).forEach(function (x) { anota(x.fuente); }); }
    var ex = corpus.explicado || {};
    (ex.ley || []).forEach(function (p) { delTexto(p.texto); });
    delTexto(ex.estado);
    (corpus.entidades || []).forEach(function (e) { anota(e.ventanillaFuente); anota(e.envioFuente); });
    delTexto(ex.tramites);
    (corpus.tramites || []).forEach(function (t) {
      if (!t.revisar) anota(t.fuente);
      amxRequisitosDe(corpus, t.id, {}).forEach(function (r) { if (!r.revisar) anota(r.fuente); });
    });
    return orden;
  }

  /**
   * La vigencia de una cuota, para pintarla junto al importe (hilo 7). Lo único que el
   * corpus respalda es el AÑO de la cuota (`costo.anio`, de la Ley Federal de Derechos);
   * cuándo la sustituye la siguiente no está en ninguna fuente, así que no se afirma.
   */
  function amxVigenciaCuota(costo) {
    if (!costo || !costo.anio) return '';
    var anio = parseInt(costo.anio, 10);
    if (isNaN(anio)) return '';
    return 'Cuota vigente ' + anio;
  }

  /** «$15,804.77» y «$490», como los escribe el propio corpus. */
  function amxImporte(monto) {
    var n = Number(monto);
    if (isNaN(n)) return String(monto);
    var decimales = n % 1 ? 2 : 0;
    return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: decimales, maximumFractionDigits: 2 });
  }

  /**
   * «Solo si: Persona extranjera». Un requisito con escenarios propios (sin variantes)
   * entra en el catálogo de un trámite, pero hay que decir a quién aplica.
   */
  function amxRotuloEscenarios(corpus, escenarios) {
    if (!Array.isArray(escenarios) || !escenarios.length || escenarios[0] === '*') return '';
    var etiquetas = [];
    for (var i = 0; i < escenarios.length; i++) {
      var e = (corpus.escenarios || []).find(function (x) { return x.id === escenarios[i]; });
      etiquetas.push(e ? e.label : escenarios[i]);
    }
    return 'Solo si: ' + etiquetas.join(' · ');
  }

  /**
   * Busca una entidad del corpus por su id.
   */
  function amxLegalEntidad(corpus, id) {
    var entidades = corpus.entidades || [];
    for (var i = 0; i < entidades.length; i++) {
      if (entidades[i].id === id) {
        return entidades[i];
      }
    }
    return null;
  }

  /**
   * Convierte '2026-09-19' en '19-SEP-2026'.
   * No usa toLocaleDateString ni new Date.
   */
  function amxLegalFecha(iso) {
    if (typeof iso !== 'string') return '';
    var partes = iso.split('-');
    if (partes.length !== 3) return '';
    var anio = partes[0];
    var mesNum = parseInt(partes[1], 10);
    var dia = partes[2];
    if (isNaN(mesNum) || mesNum < 1 || mesNum > 12) return '';
    var meses = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
    return dia + '-' + meses[mesNum - 1] + '-' + anio;
  }

  // Colgar todas las funciones de window, a nivel de módulo
  window.amxLegalPublicado = amxLegalPublicado;
  window.amxLegalFuente = amxLegalFuente;
  window.amxLegalHuecos = amxLegalHuecos;
  window.amxRequisitosDe = amxRequisitosDe;
  window.amxLegalEntidad = amxLegalEntidad;
  window.amxLegalFecha = amxLegalFecha;
  window.amxPartirCitas = amxPartirCitas;
  window.amxReferencias = amxReferencias;
  window.amxVigenciaCuota = amxVigenciaCuota;
  window.amxImporte = amxImporte;
  window.amxRotuloEscenarios = amxRotuloEscenarios;
})();
