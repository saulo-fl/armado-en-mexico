// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.
//
// LOS DATOS de este fichero —la selección, la estructura y los textos
// divulgativos— se ofrecen ADEMÁS bajo CC BY-SA 4.0; los hechos que contiene
// no son de nadie (art. 14 fr. X LFDA). Detalle: LICENCIA-CONTENIDO.md.

// Armado en México — MUNICIONES (cartuchos) · inventario OTCA (Monterrey)
// Mismo formato que accesorios: fichas, precio de referencia con autoridad y
// existencias, historial con enlace al PDF. Compatibilidad arma↔munición por calibre.
// Reusa window.AUTORIDADES / manualAutoridad / isRealImage (data-accesorios.js).
(function () {
  function _mFmt(n) { return '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MXN'; }
  function _mLvl(n) { return n < 10 ? 1 : n < 12 ? 2 : n < 16 ? 3 : n < 30 ? 4 : 5; }
  var OTCA = 'man_otca_2025_09_26', OTCAd = '2025-09-26';
  var JUN = 'man_mun_dcam_2026_06_16', JUNd = '2026-06-16';
  var JUN18M = 'man_mun_otca_2026_06_18', JUN18Md = '2026-06-18';
  var JUL = 'man_mun_dcam_2026_07_06', JULd = '2026-07-06';
  var SEP11 = 'man_mun_dcam_2026_09_11', SEP11d = '2026-09-11';
  var SEP14 = 'man_mun_dcam_2026_09_14', SEP14d = '2026-09-14';
  var SEP15 = 'man_mun_dcam_2026_09_15', SEP15d = '2026-09-15';
  var SEP18 = 'man_mun_dcam_2026_09_18', SEP18d = '2026-09-18';
  var SEP22 = 'man_mun_dcam_2026_09_22', SEP22d = '2026-09-22';
  var SEP25 = 'man_mun_dcam_2026_09_25', SEP25d = '2026-09-25';

  function mun(id, nombre, marca, pais, calibre, tipo, bala, grano, avail, precio, dcamRef, descripcion, compatibilidad, specs) {
    return { id: id, nombre: nombre, marca: marca, pais: pais, calibre: calibre, tipo: tipo, bala: bala, grano: grano,
      avail: avail, categoria: calibre, compatibilidad: compatibilidad || [], specs: specs || [],
      descripcion: descripcion || '', priceExact: _mFmt(precio), priceLvl: _mLvl(precio),
      dcamRef: dcamRef || '', priceManualId: 'man_otca_2025_09_26', img: _caja(id, marca, calibre) };
  }

  window.MUNICIONES = [
    mun(2001, 'Cartucho 7.62x51mm · Águila', 'Águila', 'México', '7.62x51mm', 'rifle', 'FMJ', '150 gr', 'seguridad', 26.08,
      'CARTUCHO CALIBRE 7.62 X 51 MM MARCA ÁGUILA F.M.J. B.T. 150 GRANOS, CÓDIGO 1E762110.',
      'Cartucho de fusil/rifle en calibre 7.62x51mm, marca Águila (FMJ, 150 gr). Precio de referencia por cartucho del inventario OTCA (Monterrey).',
      ['Armas calibre 7.62x51mm'], [['Calibre', '7.62x51mm'], ['Bala', 'FMJ'], ['Peso', '150 gr'], ['Tipo', 'Fusil/Rifle']]),

    // ── NUEVAS · cartuchos del inventario DCAM 16-jun-2026 ──
    { ...mun(2016, "Cartucho 12 GA · Rio", "Rio", "España", "12 GA", "escopeta", "Buckshot", "—", "dcam", 15.54, "CART.CAL.12.RIO.ROYAL.BUCK9, P.9P (3X3)",
      "Cartucho de escopeta en calibre 12 GA, marca Rio (Buckshot). Precio de referencia por cartucho del inventario DCAM (16-jun-2026).", ["Armas calibre 12 GA"], [["Calibre","12 GA"],["Bala","Buckshot"],["Peso","—"],["Tipo","Escopeta"]]), priceManualId: SEP18 },
    { ...mun(2105, "Cartucho 12 GA · EG del Sur (SH 29 M7.5)", "EG del Sur", "México", "12 GA", "escopeta", "Perdigón 7.5", "29 gr", "dcam", 10.01, "CARTS. CAL. 12 EG DEL SUR SH 29 GR M.7.5",
      "Cartucho de escopeta en calibre 12 GA, marca EG del Sur, Special Hunter (Perdigón 7.5, 29 gr). Precio de referencia por cartucho del inventario DCAM (25-sep-2026).", ["Armas calibre 12 GA"], [["Calibre", "12 GA"], ["Bala", "Perdigón 7.5"], ["Peso", "29 gr"], ["Tipo", "Escopeta"]]), priceManualId: SEP25 },
    { ...mun(2106, "Cartucho 12 GA · EG del Sur (SH 32 M7.5)", "EG del Sur", "México", "12 GA", "escopeta", "Perdigón 7.5", "32 gr", "dcam", 10.91, "CART CAL.12 EG DEL SUR (SH) 32 GR M. 7.5",
      "Cartucho de escopeta en calibre 12 GA, marca EG del Sur, Special Hunter (Perdigón 7.5, 32 gr). Precio de referencia por cartucho del inventario DCAM (25-sep-2026).", ["Armas calibre 12 GA"], [["Calibre", "12 GA"], ["Bala", "Perdigón 7.5"], ["Peso", "32 gr"], ["Tipo", "Escopeta"]]), priceManualId: SEP25 },
    { ...mun(2107, "Cartucho 9mm Luger · Federal", "Federal", "EUA", "9mm Parabellum", "pistola", "FMJ", "124 gr", "seguridad", 12.42, "CARTUCHO CALIBRE 9 mm LUGER, MARCA FEDERAL 124 Grs. FMJ.",
      "Cartucho de pistola en calibre 9mm Parabellum, marca Federal (FMJ, 124 gr). Precio de referencia por cartucho del inventario DCAM (29-sep-2026).", ["Armas calibre 9mm Parabellum"], [["Calibre", "9mm Parabellum"], ["Bala", "FMJ"], ["Peso", "124 gr"], ["Tipo", "Pistola"]]), priceManualId: 'man_mun_dcam_2026_09_29' },
    { ...mun(2108, "Cartucho 12 GA · Eley (Olympic Blues 32)", "Eley", "Reino Unido", "12 GA", "escopeta", "Perdigón 7.5", "32 gr", "dcam", 10.37, "CART. CAL. 12 ELEY EOB 32GR 7.5",
      "Cartucho de escopeta en calibre 12 GA, marca Eley, línea Olympic Blues (Perdigón 7.5, 32 gr). Precio de referencia por cartucho del inventario DCAM (1-oct-2026).", ["Armas calibre 12 GA"], [["Calibre", "12 GA"], ["Bala", "Perdigón 7.5"], ["Peso", "32 gr"], ["Tipo", "Escopeta"]]) },
    { ...mun(2109, "Cartucho 12 GA · Sprint (N7.5 28 gr T2)", "Sprint", "", "12 GA", "escopeta", "Perdigón 7.5", "28 gr", "dcam", 9.29, "CART CAL12 SPRINT N7.5 28GR. T2",
      "Cartucho de escopeta en calibre 12 GA, marca Sprint (N. 7.5, 28 gr, T2, cat. CEBUL B228 75). Precio de referencia por cartucho del inventario DCAM (1-oct-2026).", ["Armas calibre 12 GA"], [["Calibre", "12 GA"], ["Bala", "Perdigón 7.5"], ["Peso", "28 gr"], ["Tipo", "Escopeta"]]) },
    { ...mun(2110, "Cartucho 12 GA · Sprint (N7.5 32 gr T2)", "Sprint", "", "12 GA", "escopeta", "Perdigón 7.5", "32 gr", "dcam", 10.35, "CART CAL12 SPRINT N7.5 32GR T2",
      "Cartucho de escopeta en calibre 12 GA, marca Sprint (N. 7.5, 32 gr, T2, cat. CEBUL B232 75). Precio de referencia por cartucho del inventario DCAM (1-oct-2026).", ["Armas calibre 12 GA"], [["Calibre", "12 GA"], ["Bala", "Perdigón 7.5"], ["Peso", "32 gr"], ["Tipo", "Escopeta"]]) },
    { ...mun(2111, "Cartucho 12 GA · J&G Excopesa (Competición 24 M7.5)", "J&G Excopesa", "España", "12 GA", "escopeta", "Perdigón 7.5", "24 gr", "dcam", 8.99, "CART. CAL. 12 BULLET C 24GR M7.5 0096-75",
      "Cartucho de escopeta en calibre 12 GA, marca J&G Excopesa (el DCAM lo vende como «Bullet»; Competición, Perdigón 7.5, 24 gr, cat. 0096-75). Precio de referencia por cartucho del inventario DCAM (1-oct-2026).", ["Armas calibre 12 GA"], [["Calibre", "12 GA"], ["Bala", "Perdigón 7.5"], ["Peso", "24 gr"], ["Tipo", "Escopeta"]]) },
    // ── ALTAS del inventario DCAM 2-oct-2026 (cartuchos nuevos) ──
    { ...mun(2112, "Cartucho 12 GA · Saga (Sporting 32 M7.5)", "Saga", "España", "12 GA", "escopeta", "Perdigón 7.5", "32 gr", "dcam", 11.55, "CARTUCHO CAL 12 SAGA SPORTING 32 M7.5",
      "Cartucho de escopeta en calibre 12 GA, marca Saga, línea Sporting 32 (Perdigón 7.5, 32 gr). Precio de referencia por cartucho del inventario DCAM (2-oct-2026).", ["Armas calibre 12 GA"], [["Calibre", "12 GA"], ["Bala", "Perdigón 7.5"], ["Peso", "32 gr"], ["Tipo", "Escopeta"]]) },
    { ...mun(2113, "Cartucho 12 GA · Saga (Export 28 M7.5)", "Saga", "España", "12 GA", "escopeta", "Perdigón 7.5", "28 gr", "dcam", 9.87, "CART.CAL.12G.A.SAGA EXPORT28,28GR,M7.5.",
      "Cartucho de escopeta en calibre 12 GA, marca Saga, línea Export 28 (Perdigón 7.5, 28 gr). Precio de referencia por cartucho del inventario DCAM (2-oct-2026).", ["Armas calibre 12 GA"], [["Calibre", "12 GA"], ["Bala", "Perdigón 7.5"], ["Peso", "28 gr"], ["Tipo", "Escopeta"]]) },
    { ...mun(2114, "Cartucho 12 GA · Saga (Top Export 36 M4)", "Saga", "España", "12 GA", "escopeta", "Perdigón 4", "36 gr", "dcam", 10.51, "CAR. CAL. 12 G.A. MAR. SAGA TOP EXP. 36,",
      "Cartucho de escopeta en calibre 12 GA, marca Saga, línea Top Export 36 (Perdigón 4, 36 gr). Precio de referencia por cartucho del inventario DCAM (2-oct-2026).", ["Armas calibre 12 GA"], [["Calibre", "12 GA"], ["Bala", "Perdigón 4"], ["Peso", "36 gr"], ["Tipo", "Escopeta"]]) },
    { ...mun(2115, "Cartucho 12 GA · Saga (Top Export 36 M6)", "Saga", "España", "12 GA", "escopeta", "Perdigón 6", "36 gr", "dcam", 10.51, "CART. CAL. 12 G.A. MAR. SAGA TOP EXPORT",
      "Cartucho de escopeta en calibre 12 GA, marca Saga, línea Top Export 36 (Perdigón 6, 36 gr). Precio de referencia por cartucho del inventario DCAM (2-oct-2026).", ["Armas calibre 12 GA"], [["Calibre", "12 GA"], ["Bala", "Perdigón 6"], ["Peso", "36 gr"], ["Tipo", "Escopeta"]]) },
    { ...mun(2116, "Cartucho 12 GA · J&G Excopesa (Alta Competición 24 M8)", "J&G Excopesa", "España", "12 GA", "escopeta", "Perdigón 8", "24 gr", "dcam", 9.94, "CART. CAL. 12 EXCOPESA 24GR M8 110-80",
      "Cartucho de escopeta en calibre 12 GA, marca J&G Excopesa, línea Alta Competición (Perdigón 8, 24 gr, cat. 110-80). Precio de referencia por cartucho del inventario DCAM (2-oct-2026).", ["Armas calibre 12 GA"], [["Calibre", "12 GA"], ["Bala", "Perdigón 8"], ["Peso", "24 gr"], ["Tipo", "Escopeta"]]) },
  ];

  function _mh(price, qty) { return { manualId: OTCA, price: _mFmt(price), date: OTCAd, qty: (qty == null ? null : qty) }; }
  function _mhj(price, qty) { return { manualId: JUN, price: _mFmt(price), date: JUNd, qty: (qty == null ? null : qty) }; }
  function _mh18(price, qty) { return { manualId: JUN18M, price: _mFmt(price), date: JUN18Md, qty: (qty == null ? null : qty) }; }
  function _mhl(price, qty) { return { manualId: JUL, price: _mFmt(price), date: JULd, qty: (qty == null ? null : qty) }; }
  function _mhs(price, qty) { return { manualId: SEP11, price: _mFmt(price), date: SEP11d, qty: (qty == null ? null : qty) }; }
  function _mh14(price, qty) { return { manualId: SEP14, price: _mFmt(price), date: SEP14d, qty: (qty == null ? null : qty) }; }
  function _mh15(price, qty) { return { manualId: SEP15, price: _mFmt(price), date: SEP15d, qty: (qty == null ? null : qty) }; }
  function _mh18s(price, qty) { return { manualId: SEP18, price: _mFmt(price), date: SEP18d, qty: (qty == null ? null : qty) }; }
  function _mh22(price, qty) { return { manualId: SEP22, price: _mFmt(price), date: SEP22d, qty: (qty == null ? null : qty) }; }
  function _mh25(price, qty) { return { manualId: SEP25, price: _mFmt(price), date: SEP25d, qty: (qty == null ? null : qty) }; }
  window.MUNICIONES_PRICE_HISTORY = {
    2001: [_mh(26.08, 1800)],
    2112: [{ manualId: 'man_mun_dcam_2026_10_02', price: '$11.79 MXN', date: '2026-10-02', qty: 3000 }, { manualId: 'man_mun_dcam_2026_10_05', price: '$11.62 MXN', date: '2026-10-05', qty: 1750 }, { manualId: 'man_mun_dcam_2026_10_06', price: '$11.55 MXN', date: '2026-10-06', qty: 750 }],
    2113: [{ manualId: 'man_mun_dcam_2026_10_02', price: '$10.11 MXN', date: '2026-10-02', qty: 3000 }, { manualId: 'man_mun_dcam_2026_10_05', price: '$9.96 MXN', date: '2026-10-05', qty: 2500 }, { manualId: 'man_mun_dcam_2026_10_06', price: '$9.90 MXN', date: '2026-10-06', qty: 2500 }, { manualId: 'man_mun_dcam_2026_10_07', price: '$9.84 MXN', date: '2026-10-07', qty: 2500 }, { manualId: 'man_mun_dcam_2026_10_09', price: '$9.87 MXN', date: '2026-10-09', qty: 1125 }],
    2114: [{ manualId: 'man_mun_dcam_2026_10_02', price: '$10.83 MXN', date: '2026-10-02', qty: 3000 }, { manualId: 'man_mun_dcam_2026_10_05', price: '$10.67 MXN', date: '2026-10-05', qty: 2625 }, { manualId: 'man_mun_dcam_2026_10_06', price: '$10.60 MXN', date: '2026-10-06', qty: 375 }, { manualId: 'man_mun_dcam_2026_10_07', price: '$10.55 MXN', date: '2026-10-07', qty: 125 }, { manualId: 'man_mun_dcam_2026_10_09', price: '$10.51 MXN', date: '2026-10-09', qty: 375 }],
    2115: [{ manualId: 'man_mun_dcam_2026_10_02', price: '$10.83 MXN', date: '2026-10-02', qty: 3000 }, { manualId: 'man_mun_dcam_2026_10_05', price: '$10.67 MXN', date: '2026-10-05', qty: 2875 }, { manualId: 'man_mun_dcam_2026_10_06', price: '$10.60 MXN', date: '2026-10-06', qty: 2875 }, { manualId: 'man_mun_dcam_2026_10_07', price: '$10.55 MXN', date: '2026-10-07', qty: 2875 }, { manualId: 'man_mun_dcam_2026_10_09', price: '$10.51 MXN', date: '2026-10-09', qty: 2875 }],
    2116: [{ manualId: 'man_mun_dcam_2026_10_02', price: '$10.11 MXN', date: '2026-10-02', qty: 3000 }, { manualId: 'man_mun_dcam_2026_10_05', price: '$9.96 MXN', date: '2026-10-05', qty: 3000 }, { manualId: 'man_mun_dcam_2026_10_06', price: '$9.90 MXN', date: '2026-10-06', qty: 3000 }, { manualId: 'man_mun_dcam_2026_10_07', price: '$9.84 MXN', date: '2026-10-07', qty: 2750 }, { manualId: 'man_mun_dcam_2026_10_09', price: '$9.87 MXN', date: '2026-10-09', qty: 2500 }, { manualId: 'man_mun_dcam_2026_10_13', price: '$9.94 MXN', date: '2026-10-13', qty: 2500 }],
  };
})();
