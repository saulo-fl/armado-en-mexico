// Armado en México — MUNICIONES (cartuchos) · inventario OTCA (Monterrey)
// Mismo formato que accesorios: fichas, precio de referencia con autoridad y
// existencias, historial con enlace al PDF. Compatibilidad arma↔munición por calibre.
// Reusa window.AUTORIDADES / manualAutoridad / isRealImage (data-accesorios.js).
(function () {
  function _mFmt(n) { return '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MXN'; }
  function _mLvl(n) { return n < 10 ? 1 : n < 12 ? 2 : n < 16 ? 3 : n < 30 ? 4 : 5; }
  var OTCA = 'man_otca_2025_09_26', OTCAd = '2025-09-26';

  window.MUNICIONES_MANUALES = [
    { id: 'man_otca_2025_09_26', nombre: 'Stock OTCA · 26 de septiembre 2025', autoridad: 'OTCA',
      fecha: '2025-09-26', url: 'inventarios/otca-stock-2025-09-26.pdf', fileName: 'otca-stock-2025-09-26.pdf', primary: true },
  ];

  window.MUNICION_CATEGORIES = {
    categoria: [
      { id: '.380 ACP', label: '.380 ACP', icon: '▣' },
      { id: '.38 Super', label: '.38 Super', icon: '▣' },
      { id: '.40 S&W', label: '.40 S&W', icon: '▣' },
      { id: '5.56x45mm', label: '5.56x45mm', icon: '━' },
      { id: '7.62x51mm', label: '7.62x51mm', icon: '━' },
      { id: '12 GA', label: '12 GA', icon: '◎' },
      { id: '20 GA', label: '20 GA', icon: '◎' },
    ],
    disponibilidad: [
      { id: 'dcam', label: 'Uso civil', desc: 'Adquisición directa para civiles en DCAM/OTCA con registro SEDENA.', color: '#4FAE5C' },
      { id: 'seguridad', label: 'Policía / Seguridad', desc: 'Restringido a corporaciones de seguridad o tiradores con licencia de club registrado.', color: '#F5C518' },
      { id: 'ejercito', label: 'Exclusivo Ejército', desc: 'Uso exclusivo de las Fuerzas Armadas de México.', color: '#C0392B' },
    ],
  };

  function mun(id, nombre, marca, pais, calibre, tipo, bala, grano, avail, precio, dcamRef, descripcion, compatibilidad, specs) {
    return { id: id, nombre: nombre, marca: marca, pais: pais, calibre: calibre, tipo: tipo, bala: bala, grano: grano,
      avail: avail, categoria: calibre, compatibilidad: compatibilidad || [], specs: specs || [],
      descripcion: descripcion || '', priceExact: _mFmt(precio), priceLvl: _mLvl(precio),
      dcamRef: dcamRef || '', priceManualId: 'man_otca_2025_09_26', img: '' };
  }

  window.MUNICIONES = [
    mun(2001, 'Cartucho 7.62x51mm · Águila', 'Águila', 'México', '7.62x51mm', 'rifle', 'FMJ', '150 gr', 'seguridad', 26.08,
      'CARTUCHO CALIBRE 7.62 X 51 MM MARCA ÁGUILA F.M.J. B.T. 150 GRANOS, CÓDIGO 1E762110.',
      'Cartucho de fusil/rifle en calibre 7.62x51mm, marca Águila (FMJ, 150 gr). Precio de referencia por cartucho del inventario OTCA (Monterrey).',
      ['Armas calibre 7.62x51mm'], [['Calibre', '7.62x51mm'], ['Bala', 'FMJ'], ['Peso', '150 gr'], ['Tipo', 'Fusil/Rifle']]),
    mun(2002, 'Cartucho 5.56x45mm · PMC', 'PMC', 'Corea del Sur', '5.56x45mm', 'rifle', 'FMJ', '55 gr', 'seguridad', 11.55,
      'CARTUCHO CALIBRE 5.56 X 45 mm MARCA PMC X-TC, 55 GRAINS, FULL METAL JACKET (FMJBT)',
      'Cartucho de fusil/rifle en calibre 5.56x45mm, marca PMC (FMJ, 55 gr). Precio de referencia por cartucho del inventario OTCA (Monterrey).',
      ['Armas calibre 5.56x45mm'], [['Calibre', '5.56x45mm'], ['Bala', 'FMJ'], ['Peso', '55 gr'], ['Tipo', 'Fusil/Rifle']]),
    mun(2003, 'Cartucho .38 Super · Corbon', 'Corbon', 'EUA', '.38 Super', 'pistola', 'JHP', '125 gr', 'dcam', 52.85,
      'CARTUCHO MARCA CORBON CALIBRE 38 SUPER + P DE 125 GRANOS JHP. EN PRESENTACIÓN EN CAJA CON 20 CARTUCHOS',
      'Cartucho de pistola en calibre .38 Super, marca Corbon (JHP, 125 gr). Precio de referencia por cartucho del inventario OTCA (Monterrey).',
      ['Armas calibre .38 Super'], [['Calibre', '.38 Super'], ['Bala', 'JHP'], ['Peso', '125 gr'], ['Tipo', 'Pistola']]),
    mun(2004, 'Cartucho .40 S&W · Aguila', 'Aguila', 'México', '.40 S&W', 'pistola', 'FMJ', '180 gr', 'seguridad', 9.16,
      'CARTUCHO CALIBRE 0.40" S&W MARCA AGUILA FULL METAL JACKET 180 GN. PUNTA REDONDA CODIGO: 1E402111.',
      'Cartucho de pistola en calibre .40 S&W, marca Aguila (FMJ, 180 gr). Precio de referencia por cartucho del inventario OTCA (Monterrey).',
      ['Armas calibre .40 S&W'], [['Calibre', '.40 S&W'], ['Bala', 'FMJ'], ['Peso', '180 gr'], ['Tipo', 'Pistola']]),
    mun(2005, 'Cartucho .380 ACP · PMC', 'PMC', 'Corea del Sur', '.380 ACP', 'pistola', 'FMJ', '90 gr', 'dcam', 8.88,
      'CARTUCHO CALIBRE 0.380" AUTO, MARCA PMC, BRONZE, 90 GRAINS, FULL METAL JACKET',
      'Cartucho de pistola en calibre .380 ACP, marca PMC (FMJ, 90 gr). Precio de referencia por cartucho del inventario OTCA (Monterrey).',
      ['Armas calibre .380 ACP'], [['Calibre', '.380 ACP'], ['Bala', 'FMJ'], ['Peso', '90 gr'], ['Tipo', 'Pistola']]),
    mun(2006, 'Cartucho 12 GA · Trust', 'Trust', 'España', '12 GA', 'escopeta', 'Perdigón 7.5', '24 g', 'dcam', 10.08,
      'CARTUCHO PARA ESCOPETA MARCA TRUST, CALIBRE 12, MODELO TRAP COMPETICIÓN (COMPETITION) 24 GRAMOS, MUNICIÓN DEL 7.5, EMPAC',
      'Cartucho de escopeta en calibre 12 GA, marca Trust (Perdigón 7.5, 24 g). Precio de referencia por cartucho del inventario OTCA (Monterrey).',
      ['Armas calibre 12 GA'], [['Calibre', '12 GA'], ['Bala', 'Perdigón 7.5'], ['Peso', '24 g'], ['Tipo', 'Escopeta']]),
    mun(2007, 'Cartucho 12 GA · GB', 'GB', 'España', '12 GA', 'escopeta', 'Perdigón 7.5', '28 g', 'dcam', 10.08,
      'CARTUCHO CAL. 12, MARCA GB, GB SPORTING PLUS 28, 28 GRAMOS, PERDIGON 7.5',
      'Cartucho de escopeta en calibre 12 GA, marca GB (Perdigón 7.5, 28 g). Precio de referencia por cartucho del inventario OTCA (Monterrey).',
      ['Armas calibre 12 GA'], [['Calibre', '12 GA'], ['Bala', 'Perdigón 7.5'], ['Peso', '28 g'], ['Tipo', 'Escopeta']]),
    mun(2008, 'Cartucho 12 GA · GB', 'GB', 'España', '12 GA', 'escopeta', 'Perdigón 7.5', '32 g', 'dcam', 11.11,
      'CARTUCHO CAL. 12, MARCA GB, GB CLUB, 32 GRAMOS, PERDIGON 7.5',
      'Cartucho de escopeta en calibre 12 GA, marca GB (Perdigón 7.5, 32 g). Precio de referencia por cartucho del inventario OTCA (Monterrey).',
      ['Armas calibre 12 GA'], [['Calibre', '12 GA'], ['Bala', 'Perdigón 7.5'], ['Peso', '32 g'], ['Tipo', 'Escopeta']]),
    mun(2009, 'Cartucho 12 GA · Rio', 'Rio', 'España', '12 GA', 'escopeta', 'Perdigón 7.5', '28 gr', 'dcam', 9.82,
      'CARTUCHO CAL. 12, MARCA RIO, STAR EVO TRAINING 28, 28 GR. PERDIGON 7.5',
      'Cartucho de escopeta en calibre 12 GA, marca Rio (Perdigón 7.5, 28 gr). Precio de referencia por cartucho del inventario OTCA (Monterrey).',
      ['Armas calibre 12 GA'], [['Calibre', '12 GA'], ['Bala', 'Perdigón 7.5'], ['Peso', '28 gr'], ['Tipo', 'Escopeta']]),
    mun(2010, 'Cartucho 12 GA · Rio', 'Rio', 'España', '12 GA', 'escopeta', 'Perdigón 7.5', '32 gr', 'dcam', 11.11,
      'CARTUCHO CAL. 12, MARCA RIO, GAME LOAD-32, 32 GR, PERDIGON 7.5',
      'Cartucho de escopeta en calibre 12 GA, marca Rio (Perdigón 7.5, 32 gr). Precio de referencia por cartucho del inventario OTCA (Monterrey).',
      ['Armas calibre 12 GA'], [['Calibre', '12 GA'], ['Bala', 'Perdigón 7.5'], ['Peso', '32 gr'], ['Tipo', 'Escopeta']]),
    mun(2011, 'Cartucho 12 GA · Eley', 'Eley', 'Reino Unido', '12 GA', 'escopeta', 'Perdigón 7.5', '28 g', 'dcam', 10.86,
      'CARTUCHO CAL. 12, MARCA ELEY, ELEY SELECT 28G, 28 GRAMOS, MUNICION 7.5',
      'Cartucho de escopeta en calibre 12 GA, marca Eley (Perdigón 7.5, 28 g). Precio de referencia por cartucho del inventario OTCA (Monterrey).',
      ['Armas calibre 12 GA'], [['Calibre', '12 GA'], ['Bala', 'Perdigón 7.5'], ['Peso', '28 g'], ['Tipo', 'Escopeta']]),
    mun(2012, 'Cartucho 12 GA · Saga Sporting', 'Saga Sporting', 'España', '12 GA', 'escopeta', 'Perdigón 8', '32 g', 'dcam', 12.41,
      'CARTUCHO CAL. 12 G.A., MARCA SAGA SPORTING 32, 32 GRAMOS, MUNICION 8, COD. SPORT32MX8',
      'Cartucho de escopeta en calibre 12 GA, marca Saga Sporting (Perdigón 8, 32 g). Precio de referencia por cartucho del inventario OTCA (Monterrey).',
      ['Armas calibre 12 GA'], [['Calibre', '12 GA'], ['Bala', 'Perdigón 8'], ['Peso', '32 g'], ['Tipo', 'Escopeta']]),
    mun(2013, 'Cartucho 20 GA · EG del Sur', 'EG del Sur', 'México', '20 GA', 'escopeta', 'Perdigón 7.5.', '29 g', 'dcam', 13.18,
      'CARTUCHO DE ESCOPETA CALIBRE 20, MARCA EG DEL SUR, SUBMARCA PRESTIGIO. 29 GRAMOS, MUNICIÓN 7.5.',
      'Cartucho de escopeta en calibre 20 GA, marca EG del Sur (Perdigón 7.5., 29 g). Precio de referencia por cartucho del inventario OTCA (Monterrey).',
      ['Armas calibre 20 GA'], [['Calibre', '20 GA'], ['Bala', 'Perdigón 7.5.'], ['Peso', '29 g'], ['Tipo', 'Escopeta']]),
    mun(2014, 'Cartucho 12 GA · EG del Sur', 'EG del Sur', 'México', '12 GA', 'escopeta', 'Perdigón 7.5.', '28 g', 'dcam', 10.59,
      'CARTUCHO DE ESCOPETA CALIBRE 12 MARCA EG DEL SUR SUBMARCA TRAP. 28 GRAMOS MUN. 7.5.',
      'Cartucho de escopeta en calibre 12 GA, marca EG del Sur (Perdigón 7.5., 28 g). Precio de referencia por cartucho del inventario OTCA (Monterrey).',
      ['Armas calibre 12 GA'], [['Calibre', '12 GA'], ['Bala', 'Perdigón 7.5.'], ['Peso', '28 g'], ['Tipo', 'Escopeta']]),
    mun(2015, 'Cartucho 12 GA · EG del Sur', 'EG del Sur', 'México', '12 GA', 'escopeta', 'Perdigón 7.5', '30 g', 'dcam', 11.37,
      'CARTUCHO DE ESCOPETA CALIBRE 12 MARCA EG DEL SUR SUBMARCA SPECIAL HUNTER 30 GRAMOS, MUN. 7.5',
      'Cartucho de escopeta en calibre 12 GA, marca EG del Sur (Perdigón 7.5, 30 g). Precio de referencia por cartucho del inventario OTCA (Monterrey).',
      ['Armas calibre 12 GA'], [['Calibre', '12 GA'], ['Bala', 'Perdigón 7.5'], ['Peso', '30 g'], ['Tipo', 'Escopeta']]),
  ];

  function _mh(price, qty) { return { manualId: OTCA, price: _mFmt(price), date: OTCAd, qty: (qty == null ? null : qty) }; }
  window.MUNICIONES_PRICE_HISTORY = {
    2001: [_mh(26.08, 1800)],
    2002: [_mh(11.55, 800)],
    2003: [_mh(52.85, 660)],
    2004: [_mh(9.16, 10750)],
    2005: [_mh(8.88, 17950)],
    2006: [_mh(10.08, 1500)],
    2007: [_mh(10.08, 22000)],
    2008: [_mh(11.11, 28000)],
    2009: [_mh(9.82, 1050)],
    2010: [_mh(11.11, 78100)],
    2011: [_mh(10.86, 40750)],
    2012: [_mh(12.41, 25500)],
    2013: [_mh(13.18, 4500)],
    2014: [_mh(10.59, 4000)],
    2015: [_mh(11.37, 4000)],
  };

  window.getMunicionById = function (id) { var n = Number(id); return (window.MUNICIONES || []).find(function (m) { return m.id === n; }) || null; };
  window.getMunicionManual = function (id) { return (window.MUNICIONES_MANUALES || []).find(function (m) { return m.id === id; }) || null; };
  window.getMunicionPrimaryManual = function () { return (window.MUNICIONES_MANUALES || []).find(function (m) { return m.primary; }) || (window.MUNICIONES_MANUALES || [])[0] || null; };
  window.getMunicionPriceHistory = function (id) { return (window.MUNICIONES_PRICE_HISTORY[Number(id)] || []).slice(); };
  window.getMunicionExistencias = function (id) { var h = window.getMunicionPriceHistory(id); var last = h[h.length - 1]; return (last && last.qty != null) ? { qty: last.qty, date: last.date, manualId: last.manualId } : null; };
  // Compatibilidad por calibre exacto (determinista, sin invención)
  window.getMunicionesParaArma = function (arma) { if (!arma) return []; return (window.MUNICIONES || []).filter(function (m) { return m.calibre === arma.calibre; }); };
  window.getArmasParaMunicion = function (mun) { if (!mun) return []; return (window.DB || []).filter(function (a) { return a.calibre === mun.calibre; }); };
})();
