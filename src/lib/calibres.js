// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

(function () {
  /**
   * Escala un calibre respecto a un calibre de referencia (mayor).
   * @param {number} mm — diámetro del calibre en mm.
   * @param {number} [mayor] — diámetro del calibre más largo de la lista;
   *   si es 0, null o undefined, se trata como 1.
   * @returns {number} proporción entre 0 y 1 (o mayor que 1 si mm > mayor).
   */
  function amxEscalaCartucho(mm, mayor) {
    return (mm || 0) / (mayor || 1);
  }

  /**
   * Enriched y ordena la guía de calibres.
   * A cada calibre le agrega:
   *   - armas: cuántas entradas de db tienen a.calibre === c.id
   *   - escala: mm / mayor (o escala del mm más corto si mm es 0/null)
   * @param {Array} guia — arreglo de objetos calibre con campo `mm`.
   * @param {Array} db — arreglo de entradas que referencian calibre por `id`.
   * @returns {Array} nuevo arreglo ordenado por mm ASC.
   */
  function amxGuiaCalibres(guia, db) {
    var mayor = 0;
    for (var i = 0; i < guia.length; i++) {
      if (guia[i].mm > mayor) mayor = guia[i].mm;
    }

    // Si no hay mm mayor, todos son 0/null → escala por defecto 1.
    if (!mayor) mayor = 1;

    // Buscar el mm más corto positivo para calibres sin mm.
    var menor = Infinity;
    for (var j = 0; j < guia.length; j++) {
      if (guia[j].mm > 0 && guia[j].mm < menor) menor = guia[j].mm;
    }
    // Si todos son 0/null, menor sigue siendo Infinity → escala 1.
    if (menor === Infinity) menor = 1;

    var escalaZero = (menor === 1) ? 1 : (0 / mayor || 1);
    // En realidad, si mm=0, escala = 0/mayor = 0, pero la regla dice:
    // "a escala 1 mentiría diciendo que es el cartucho más largo"
    // Entonces: calibre con mm nulo o 0 recibe la escala del mm MÁS CORTO.
    var escalaMenor = menor / mayor;

    var resultado = [];
    for (var k = 0; k < guia.length; k++) {
      var c = guia[k];
      var count = 0;
      for (var l = 0; l < db.length; l++) {
        if (db[l].calibre === c.id) count++;
      }
      var escala;
      if (!c.mm || c.mm === 0) {
        escala = escalaMenor;
      } else {
        escala = amxEscalaCartucho(c.mm, mayor);
      }
      // Se copia el calibre ENTERO y solo se añade lo calculado. Copiarlo campo
      // por campo perdía `cartucho`, `desc`, `uso`, `alias`, `velocidad`,
      // `energia`, `retroceso`, `legalArt`, `legalNota` y `fuente`: la guía y la
      // ficha (que leen de aquí) salían vacías aunque el dato estuviera en
      // data-extra.js. Cualquier campo nuevo del origen llega solo.
      resultado.push(Object.assign({}, c, {
        armas: count,
        escala: escala
      }));
    }

    resultado.sort(function (a, b) {
      return a.mm - b.mm;
    });

    return resultado;
  }

  /**
   * Calcula el rango [min, max] de energía y velocidad en la guía.
   * @param {Array} guia — arreglo de calibres enriquecido por amxGuiaCalibres.
   * @returns {{energia: {min:number, max:number}, velocidad: {min:number, max:number}}}
   */
  function amxRangoCalibres(guia) {
    var energiaMin = Infinity, energiaMax = -Infinity;
    var velocidadMin = Infinity, velocidadMax = -Infinity;
    var tieneEnergia = false, tieneVelocidad = false;

    for (var i = 0; i < guia.length; i++) {
      if (guia[i].energiaJ != null) {
        if (guia[i].energiaJ < energiaMin) energiaMin = guia[i].energiaJ;
        if (guia[i].energiaJ > energiaMax) energiaMax = guia[i].energiaJ;
        tieneEnergia = true;
      }
      if (guia[i].velocidadMs != null) {
        if (guia[i].velocidadMs < velocidadMin) velocidadMin = guia[i].velocidadMs;
        if (guia[i].velocidadMs > velocidadMax) velocidadMax = guia[i].velocidadMs;
        tieneVelocidad = true;
      }
    }

    return {
      energia: tieneEnergia ? { min: energiaMin, max: energiaMax } : { min: 0, max: 0 },
      velocidad: tieneVelocidad ? { min: velocidadMin, max: velocidadMax } : { min: 0, max: 0 }
    };
  }

  /**
   * Posición normalizada de un valor dentro de un rango [min, max].
   * @param {number} v — valor a posicionar.
   * @param {number} min — límite inferior.
   * @param {number} max — límite superior.
   * @returns {number} entre 0 y 1, recortado.
   */
  function amxPosicionEnRango(v, min, max) {
    if (max === min) return 0;
    var pos = (v - min) / (max - min);
    if (pos < 0) return 0;
    if (pos > 1) return 1;
    return pos;
  }

  /**
   * Busca un calibre por su slug.
   * @param {string} slug — slug a buscar.
   * @param {Array} guia — arreglo de calibres.
   * @returns {Object|null} el calibre cuyo window.amxSlug(id) === slug, o null.
   */
  function amxCalibrePorSlug(slug, guia) {
    if (typeof window.amxSlug !== 'function') return null;
    for (var i = 0; i < guia.length; i++) {
      if (window.amxSlug(guia[i].id) === slug) return guia[i];
    }
    return null;
  }

  /**
   * Filtra calibres por avail, clase y sistema.
   * @param {Array} guia — arreglo de calibres.
   * @param {Object} filtro — { avail, clase, sistema }. Claves ausentes/null/'' no filtran.
   * @returns {Array} nuevo arreglo filtrado.
   */
  function amxFiltrarCalibres(guia, filtro) {
    var tieneAvail = (filtro.avail != null && filtro.avail !== '');
    var tieneClase = (filtro.clase != null && filtro.clase !== '');
    var tieneSistema = (filtro.sistema != null && filtro.sistema !== '');

    var resultado = [];
    for (var i = 0; i < guia.length; i++) {
      var c = guia[i];
      if (tieneAvail && c.avail !== filtro.avail) continue;
      if (tieneClase && c.clase !== filtro.clase) continue;
      if (tieneSistema && c.sistema !== filtro.sistema) continue;
      resultado.push(c);
    }
    return resultado;
  }

  window.amxEscalaCartucho = amxEscalaCartucho;
  window.amxGuiaCalibres = amxGuiaCalibres;
  window.amxRangoCalibres = amxRangoCalibres;
  window.amxPosicionEnRango = amxPosicionEnRango;
  window.amxCalibrePorSlug = amxCalibrePorSlug;
  window.amxFiltrarCalibres = amxFiltrarCalibres;
})();
