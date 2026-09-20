// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

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
})();
