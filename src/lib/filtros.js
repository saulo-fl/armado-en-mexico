// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Armado en México — las cuentas de los filtros de los catálogos (armas y municiones)
// ─────────────────────────────────────────────────────────────────────────────
// JS plano colgado de `window`, como cotejo.js: sin React ni DOM, para que
// `node --test scripts/filtros.test.mjs` lo pruebe tal cual. Se carga ANTES que
// ui.js, que pinta la tira (TiraFiltros). Decidido con Saulo el 16-sep-2026:
// docs/DESIGN.md §5.10.
(function () {
  const pesos = (v) => '$' + Math.round(v).toLocaleString('es-MX');
  const mas = (v, limites) => (limites.conTope && v >= limites.max ? '+' : '');

  // Límites de la regla de precio a partir de los precios que dejan los DEMÁS
  // filtros. Redondea al paso; con `tope`, el máximo no pasa de ahí y `conTope`
  // avisa de que hay precios por encima (la regla dice «$100,000+»). Los
  // precios 0 (sin dato) no cuentan. Nunca devuelve un rango vacío.
  function amxLimitesPrecio(precios, o) {
    const paso = o.paso;
    const tope = o.tope || 0;
    const ps = (precios || []).filter((p) => p > 0);
    if (!ps.length) return { min: 0, max: tope || paso, conTope: !!tope };
    let min = Math.floor(Math.min(...ps) / paso) * paso;
    let max = Math.ceil(Math.max(...ps) / paso) * paso;
    const conTope = !!tope && max > tope;
    if (conTope) max = tope;
    if (min > max) min = max;
    if (max <= min) max = min + paso;
    return { min, max, conTope };
  }

  // ¿Pasa el filtro de precio algo que cuesta `p`? Con el cursor alto en el
  // tope no hay límite superior: «$100,000+» incluye lo que pasa de ahí.
  function amxDentroDePrecio(p, lo, hi, limites) {
    if (p < lo) return false;
    return (limites.conTope && hi >= limites.max) || p <= hi;
  }

  // Las marcas de la regla: una mayor (con número) cada «paso bonito» de un
  // quinto del rango —1, 2, 2.5, 5 o 10 por potencia de diez— y cuatro menores
  // entre mayores. Se cuentan por índice para no arrastrar decimales.
  function amxMarcasRegla(min, max) {
    const rango = max - min;
    if (!(rango > 0)) return [];
    const bruto = rango / 5;
    const e = Math.pow(10, Math.floor(Math.log10(bruto)));
    const f = bruto / e;
    const mayor = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e;
    const menor = mayor / 5;
    const marcas = [];
    for (let k = Math.ceil(min / menor - 1e-9); k * menor <= max + 1e-9; k++) {
      const valor = Math.round(k * menor * 1e6) / 1e6;
      marcas.push({ valor: valor + 0, mayor: k % 5 === 0 });
    }
    return marcas;
  }

  // La cinta del chip de precio: «$10k–$30k» (armas, en miles) o «$10–$60»
  // (municiones, en pesos). Con el cursor alto en el tope, «+».
  function amxRotuloRango(lo, hi, limites, formato) {
    if (formato === 'miles') return '$' + Math.round(lo / 1000) + 'k–$' + Math.round(hi / 1000) + 'k' + mas(hi, limites);
    return '$' + Math.round(lo) + '–$' + Math.round(hi) + mas(hi, limites);
  }

  // La lectura grande de la hoja de precio: «$10,000 — $30,000».
  function amxLecturaRango(lo, hi, limites) {
    return pesos(lo) + ' — ' + pesos(hi) + mas(hi, limites);
  }

  // El número de una marca mayor: «20k» en miles, «$100» en pesos; en el tope, «100k+».
  function amxNumeroMarca(v, limites, formato) {
    return (formato === 'miles' ? Math.round(v / 1000) + 'k' : '$' + Math.round(v)) + mas(v, limites);
  }

  // El renglón del conteo. La cifra va aparte porque se pinta en negrita.
  function amxTextoConteo(n, activos, nombres) {
    const resto = (n === 1 ? nombres[0] : nombres[1])
      + (activos > 0 ? ' · ' + activos + (activos === 1 ? ' filtro' : ' filtros') : '');
    return { cifra: n.toLocaleString('es-MX'), resto };
  }

  // El número de un precio de inventario («$9,927.55 MXN»); 0 si no hay.
  function amxPrecioNumero(texto) {
    return parseFloat(String(texto || '').replace(/[^\d.]/g, '')) || 0;
  }

  window.amxLimitesPrecio = amxLimitesPrecio;
  window.amxDentroDePrecio = amxDentroDePrecio;
  window.amxMarcasRegla = amxMarcasRegla;
  window.amxRotuloRango = amxRotuloRango;
  window.amxLecturaRango = amxLecturaRango;
  window.amxNumeroMarca = amxNumeroMarca;
  window.amxTextoConteo = amxTextoConteo;
  window.amxPrecioNumero = amxPrecioNumero;
})();
