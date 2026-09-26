// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Armado en México — las cuentas del hub del Arsenal (/arsenal)
// ─────────────────────────────────────────────────────────────────────────────
// JS plano colgado de `window`, como cotejo.js: sin React ni DOM, para que
// `node --test scripts/arsenal-hub.test.mjs` lo pruebe tal cual. Se carga ANTES
// que ui.js. Decidido con Saulo el 15-sep-2026: docs/DESIGN.md §5.9.
(function () {
  // Las dos lecturas de existencias de data-precios.js. Las pruebas inyectan otras.
  const fxApp = () => ({
    dcam: (id) => (window.getArmaExistencias ? window.getArmaExistencias(id) : null),
    otca: (id) => (window.getArmaExistenciasOTCA ? window.getArmaExistenciasOTCA(id) : null),
  });

  // Un arma tiene existencia en una sucursal si aparece con cantidad en el ÚLTIMO
  // inventario de armas de esa sucursal. Con 'all', en cualquiera de las dos.
  // La usan la tarjeta de almacén del hub y el filtro «Con existencias» del
  // catálogo, para que las dos cuenten siempre lo mismo.
  function amxTieneExistencia(id, sucursal, fx) {
    const f = fx || fxApp();
    const enDcam = f.dcam(id) != null;
    const enOtca = !!f.otca(id);
    if (sucursal === 'DCAM') return enDcam;
    if (sucursal === 'OTCA') return enOtca;
    return enDcam || enOtca;
  }

  // La tarjeta de almacén: por sucursal, cuántas armas tienen existencia y la
  // fecha de su último inventario de armas. Sin total: un arma puede estar en las
  // dos (Saulo, 15-sep-2026).
  //   manuales: inventarios de armas, en cualquier orden ({ fecha, autoridad })
  // El hub le pasa AMX_MANUALES_SEED y no Store.getManuales() a propósito: las
  // existencias de OTCA también salen de la semilla (getArmaExistenciasOTCA), así
  // que la cifra y la fecha vienen de la misma fuente. La ficha sí usa el Store.
  function amxArsenalSucursales(db, manuales, fx) {
    const f = fx || fxApp();
    const ultimaFecha = (sigla) => (manuales || [])
      .filter((m) => (m.autoridad || 'DCAM') === sigla)
      .map((m) => String(m.fecha || ''))
      .sort()
      .pop() || null;
    return ['DCAM', 'OTCA'].map((sigla) => ({
      sigla: sigla,
      armas: (db || []).filter((a) => amxTieneExistencia(a.id, sigla, f)).length,
      fecha: ultimaFecha(sigla),
    }));
  }

  // Largo real de los calibres que no están en la guía (window.CALIBRES), para la
  // mesa a escala. SAAMI, largo máximo del cartucho; 16 GA con el casco de 2¾ in,
  // el mismo criterio que 12 y 20 GA en data-extra.js.
  const LARGO_SIN_GUIA = { '.22-250 Rem': 59.7, '.223 Rem': 57.4, '6.5 Creedmoor': 71.8, '16 GA': 70 };

  // La mesa de calibres: solo los que tienen armas, en el orden de la categoría.
  //   categorias: CATEGORIES.calibre ({ id, label })
  //   guia:       window.CALIBRES ({ id, mm, cartucho })
  // escala = largo ÷ el largo mayor de la mesa (1 = el cartucho más largo).
  function amxArsenalCalibres(db, categorias, guia) {
    const filas = (categorias || []).map((c) => {
      const g = (guia || []).find((x) => x.id === c.id);
      return {
        id: c.id,
        label: c.label,
        armas: (db || []).filter((a) => a.calibre === c.id).length,
        mm: g ? g.mm : (LARGO_SIN_GUIA[c.id] || null),
        foto: g && g.cartucho ? g.cartucho : null,
      };
    }).filter((fila) => fila.armas > 0);
    const mayor = Math.max(0, ...filas.map((fila) => fila.mm || 0));
    // Un calibre del que no se sabe el largo (ni en la guía ni en LARGO_SIN_GUIA) se
    // dibuja como el más CORTO de la mesa. A escala 1 mentiría: diría que es el
    // cartucho más largo de todos.
    const menor = Math.min(...filas.map((fila) => fila.mm).filter(Boolean), mayor);
    return filas.map((fila) => Object.assign(fila, { escala: window.amxEscalaCartucho(fila.mm || menor, mayor) }));
  }

  window.amxTieneExistencia = amxTieneExistencia;
  window.amxArsenalSucursales = amxArsenalSucursales;
  window.amxArsenalCalibres = amxArsenalCalibres;
})();
