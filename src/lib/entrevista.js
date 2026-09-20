// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

(function () {
  /**
   * amxAplicaGuarda
   *
   * Devuelve true si `si` está ausente o vacío, o si TODAS las condiciones
   * de `si` se cumplen en `respuestas`.
   *
   *   { pregunta: 'edad', es: ['si'] }      → respuestas.edad ∈ ['si']
   *   { pregunta: 'edad', noEs: ['no'] }     → respuestas.edad existe y ∉ ['no']
   */
  function amxAplicaGuarda(si, respuestas) {
    if (!si || si.length === 0) return true;
    return si.every(function (cond) {
      var val = respuestas[cond.pregunta];
      if (cond.es) return cond.es.includes(val);
      if (cond.noEs) return val !== undefined && !cond.noEs.includes(val);
      return true;
    });
  }

  /**
   * amxSiguientePregunta
   *
   * Devuelve la primera pregunta del árbol cuyo guarda se cumple y que todavía
   * no está contestada. null si no queda ninguna.
   */
  function amxSiguientePregunta(arbol, respuestas) {
    if (!arbol || !respuestas) return null;
    for (var i = 0; i < arbol.preguntas.length; i++) {
      var p = arbol.preguntas[i];
      if (amxAplicaGuarda(p.si, respuestas) && !respuestas[p.id]) return p;
    }
    return null;
  }

  /**
   * amxEvaluarEntrevista
   *
   * Recorre las preguntas en orden, salta las que no aplican, se detiene en
   * el primer impedimento. Devuelve el dictamen completo.
   */
  function amxEvaluarEntrevista(arbol, respuestas) {
    if (!arbol) {
      return {
        estado: 'incompleta', dictamen: null, pendiente: null,
        recorrido: [], documentos: [], avisos: [], fundamentos: [], escenarios: [],
        progreso: { hechas: 0, total: 0 },
      };
    }
    if (!respuestas) respuestas = {};

    var recorrido = [];
    var escenarios = [];
    var documentos = [];
    var avisos = [];
    var fundamentos = [];
    var impedimento = null;
    var estado = 'incompleta';
    var dictamen = null;
    var pendiente = null;
    var hechas = 0;
    var total = 0;

    for (var i = 0; i < arbol.preguntas.length; i++) {
      var p = arbol.preguntas[i];
      if (!amxAplicaGuarda(p.si, respuestas)) continue;

      total++;
      var opcionId = respuestas[p.id];
      var opcion = null;

      if (!opcionId) {
        // La PRIMERA sin contestar manda: es la que toca responder ahora.
        if (pendiente === null) pendiente = p;
        continue;
      }

      for (var j = 0; j < p.opciones.length; j++) {
        if (p.opciones[j].id === opcionId) { opcion = p.opciones[j]; break; }
      }

      if (!opcion) {
        // Una respuesta que no casa con ninguna opción cuenta como no contestada.
        if (pendiente === null) pendiente = p;
        continue;
      }

      hechas++;
      recorrido.push({ pregunta: p, opcion: opcion });

      // El mapa de escenarios, por eje. Una opcion lo declara EXPLICITAMENTE con
      // `escenario`; no se adivina por coincidencia de id, porque el guion puede partir
      // un escenario del corpus en dos opciones (hombre con cartilla liberada y sin
      // ella) y entonces ninguna coincidiria. Con este mapa, amxRequisitosDe resuelve
      // la variante que le toca a esta persona.
      if (opcion.escenario && escenarios.indexOf(opcion.escenario) === -1) escenarios.push(opcion.escenario);

      if (opcion.documentos) {
        for (var k = 0; k < opcion.documentos.length; k++) {
          if (documentos.indexOf(opcion.documentos[k]) === -1) {
            documentos.push(opcion.documentos[k]);
          }
        }
      }
      if (opcion.aviso) avisos.push(opcion.aviso);
      if (opcion.impedimento) fundamentos.push(opcion.impedimento.fundamento);

      if (opcion.impedimento) {
        impedimento = opcion.impedimento;
        break;
      }
    }

    if (impedimento) {
      estado = 'detenida';
      dictamen = impedimento.tipo === 'definitivo' ? 'no-procede' : 'falta-requisito';
    } else if (pendiente === null) {
      // Sin impedimento y sin nada pendiente: se recorrió el guion entero.
      estado = 'completa';
      dictamen = 'reune-requisitos';
    } else {
      estado = 'incompleta';
      dictamen = null;
    }

    // Prepend `siempre` documents (no duplicates)
    if (arbol.siempre) {
      for (var m = 0; m < arbol.siempre.length; m++) {
        if (documentos.indexOf(arbol.siempre[m]) === -1) {
          documentos.unshift(arbol.siempre[m]);
        }
      }
    }

    return {
      estado: estado,
      dictamen: dictamen,
      pendiente: pendiente,
      recorrido: recorrido,
      impedimento: impedimento,
      documentos: documentos,
      avisos: avisos,
      fundamentos: fundamentos,
      escenarios: escenarios,
      progreso: { hechas: hechas, total: total },
    };
  }

  /**
   * amxCodificarEntrevista
   *
   * Codifica respuestas en cadena corta para compartir por enlace.
   * Formato: v{versionSinGuiones}.par1_par2_...
   */
  function amxCodificarEntrevista(arbol, respuestas) {
    var v = arbol.version ? arbol.version.replace(/-/g, '') : '';
    var partes = [];
    for (var i = 0; i < arbol.preguntas.length; i++) {
      var p = arbol.preguntas[i];
      var val = respuestas[p.id];
      if (val) {
        for (var j = 0; j < p.opciones.length; j++) {
          if (p.opciones[j].id === val) {
            partes.push(p.clave + '-' + p.opciones[j].clave);
            break;
          }
        }
      }
    }
    return 'v' + v + '.' + partes.join('_');
  }

  /**
   * amxDecodificarEntrevista
   *
   * Traduce una cadena codificada de vuelta a { respuestas, avisos }.
   * Descarta pares cuya clave de pregunta o de opción no exista.
   */
  function amxDecodificarEntrevista(arbol, codigo) {
    var respuestas = {};
    var avisos = [];

    if (!codigo || !codigo.startsWith('v')) {
      return { respuestas: respuestas, avisos: avisos };
    }

    var pares = codigo.substring(1).split('.');
    if (pares.length < 2) {
      return { respuestas: respuestas, avisos: avisos };
    }

    var paresStr = pares[1];
    if (!paresStr) {
      return { respuestas: respuestas, avisos: avisos };
    }

    var tokens = paresStr.split('_');
    for (var t = 0; t < tokens.length; t++) {
      var parts = tokens[t].split('-');
      if (parts.length !== 2) continue;

      var clavePregunta = parts[0];
      var claveOpcion = parts[1];

      // Find the question by clave
      var pregunta = null;
      for (var i = 0; i < arbol.preguntas.length; i++) {
        if (arbol.preguntas[i].clave === clavePregunta) {
          pregunta = arbol.preguntas[i];
          break;
        }
      }

      if (!pregunta) {
        avisos.push('Par "' + tokens[t] + '" ignorado: pregunta no encontrada.');
        continue;
      }

      // Find the option by clave
      var opcion = null;
      for (var j = 0; j < pregunta.opciones.length; j++) {
        if (pregunta.opciones[j].clave === claveOpcion) {
          opcion = pregunta.opciones[j];
          break;
        }
      }

      if (!opcion) {
        avisos.push('Par "' + tokens[t] + '" ignorado: opción no encontrada.');
        continue;
      }

      respuestas[pregunta.id] = opcion.id;
    }

    return { respuestas: respuestas, avisos: avisos };
  }

  window.amxAplicaGuarda = amxAplicaGuarda;
  window.amxSiguientePregunta = amxSiguientePregunta;
  window.amxEvaluarEntrevista = amxEvaluarEntrevista;
  window.amxCodificarEntrevista = amxCodificarEntrevista;
  window.amxDecodificarEntrevista = amxDecodificarEntrevista;
})();
