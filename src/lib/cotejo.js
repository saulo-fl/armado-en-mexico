// Armado en México — el cotejo de dos armas (pantalla Comparar) y el inventario de un arma
// ─────────────────────────────────────────────────────────────────────────────
// JS plano colgado de `window`, como store.js y los data-*.js: sin React ni DOM,
// para que `node --test scripts/cotejo.test.mjs` lo pruebe tal cual. Se carga
// ANTES que ui.js: lo usan la ficha de arma y el comparador.
// Reglas decididas con Saulo el 14-sep-2026: docs/DESIGN.md §5.6.
(function () {
  const texto = (v) => String(v == null ? '' : v);

  // ── INVENTARIO DE UN ARMA ─────────────────────────────────────────────────
  // Precio vigente, su inventario fuente, «último precio conocido» y existencias
  // por sucursal. Vivía dentro de ProductScreen; sale aquí porque el comparador
  // enseña lo mismo, y dos copias de la regla acabarían diciendo cosas
  // distintas de la misma arma.
  //   o.priceHistory    registros del arma, del más viejo al más reciente (Store.getPriceHistory)
  //   o.manuales        inventarios, del más reciente al más viejo (Store.getManuales)
  //   o.existenciasDCAM número o null (window.getArmaExistencias)
  //   o.autoridad       window.manualAutoridad
  // Existencias: SOLO cuenta el último inventario de cada sucursal; si el arma
  // estuvo alguna vez en esa sucursal y no aparece en él, está AGOTADA ahí.
  function amxInventarioArma(arma, o) {
    const priceHistory = (o && o.priceHistory) || [];
    const manuales = (o && o.manuales) || [];
    const autoridad = (o && o.autoridad) || (() => null);
    const manualById = (id) => (id ? manuales.find((m) => m.id === id) : null) || null;
    const ultimo = priceHistory.length ? priceHistory[priceHistory.length - 1] : null;
    const manual = manualById(arma.priceManualId) ||
      (ultimo ? manualById(ultimo.manualId) : null) ||
      manuales.find((m) => m.primary) || manuales[0] || null;
    const aut = autoridad(manual);
    const sigla = aut ? aut.sigla : 'DCAM';
    const precio = ultimo ? ultimo.price : arma.priceExact;

    const autOf = (m) => (m && (m.autoridad || (autoridad(m) ? autoridad(m).sigla : 'DCAM'))) || 'DCAM';
    const ultimoDe = (s) => manuales.find((m) => autOf(m) === s) || null;
    const estuvoEn = (s) => priceHistory.some((h) => autOf(manualById(h.manualId)) === s);

    const sucursales = [];
    const dcam = ultimoDe('DCAM');
    const qtyDcam = o && o.existenciasDCAM != null ? o.existenciasDCAM : null;
    if (qtyDcam != null) sucursales.push({ sigla: 'DCAM', qty: qtyDcam, manual: dcam, agotado: false });
    else if (estuvoEn('DCAM') && dcam) sucursales.push({ sigla: 'DCAM', qty: null, manual: dcam, agotado: true });
    const otca = ultimoDe('OTCA');
    if (otca) {
      const rec = priceHistory.find((h) => h.manualId === otca.id);
      if (rec && rec.qty != null) sucursales.push({ sigla: 'OTCA', qty: rec.qty, manual: otca, agotado: false });
      else if (estuvoEn('OTCA')) sucursales.push({ sigla: 'OTCA', qty: null, manual: otca, agotado: true });
    }

    // ¿Hay un inventario de la MISMA sucursal más reciente que el del precio? Si
    // lo hay, el arma ya no aparece en él y el precio es el último conocido.
    // Fechas AAAA-MM-DD, comparables como texto.
    const ultimoSuc = ultimoDe(sigla);
    const ultimoConocido = !!(manual && ultimoSuc && String(ultimoSuc.fecha || '') > String(manual.fecha || ''));
    return { precio, manual, sigla, ultimoConocido, sucursales };
  }

  // La misma consulta con los datos vivos de la app (Store, hidratado desde D1).
  function amxInventarioDe(arma) {
    const S = window.Store;
    return amxInventarioArma(arma, {
      priceHistory: S ? S.getPriceHistory(arma.id) : [],
      manuales: S ? S.getManuales() : [],
      existenciasDCAM: window.getArmaExistencias ? window.getArmaExistencias(arma.id) : null,
      autoridad: window.manualAutoridad,
    });
  }

  // ── NÚMEROS COMPARABLES ───────────────────────────────────────────────────
  // Solo un valor único y exacto compite por la ventaja. Formatos medidos sobre
  // las 231 armas del 14-sep-2026: capacidad `N` o `N+N`; peso `Ng` o `N kg`;
  // longitud `Nmm` o `N mm`; precio `$N MXN`. Lo demás —`5 / 30`, `3.5–3.7 kg`,
  // `≈4.0 kg`, `cañón 18"`, `varía`, vacío, precio 0— da null: se muestra tal
  // cual, sin círculo y fuera de la tira.
  const amxCotejoNum = {
    capacidad(v) {
      const m = /^\s*(\d+)(?:\s*\+\s*(\d+))?\s*$/.exec(texto(v));
      return m ? Number(m[1]) + Number(m[2] || 0) : null;
    },
    peso(v) { // en gramos
      const m = /^\s*(\d+(?:\.\d+)?)\s*(kg|g)\s*$/i.exec(texto(v));
      if (!m) return null;
      const n = Number(m[1]) * (m[2].toLowerCase() === 'kg' ? 1000 : 1);
      return n > 0 ? n : null;
    },
    longitud(v) { // en milímetros
      const m = /^\s*(\d+(?:\.\d+)?)\s*mm\s*$/i.exec(texto(v));
      return m && Number(m[1]) > 0 ? Number(m[1]) : null;
    },
    precio(v) {
      const m = /^\s*\$\s*(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?\s*(?:MXN)?\s*$/i.exec(texto(v));
      if (!m) return null;
      const n = Number(m[1].replace(/,/g, '') + (m[2] || ''));
      return n > 0 ? n : null;
    },
  };

  window.amxInventarioArma = amxInventarioArma;
  window.amxInventarioDe = amxInventarioDe;
  window.amxCotejoNum = amxCotejoNum;
})();
