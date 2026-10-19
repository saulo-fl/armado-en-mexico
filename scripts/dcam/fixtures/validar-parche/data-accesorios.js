// Copia CONGELADA de un recorte de src/data/data-accesorios.js (16-oct-2026) para validar-parche.test.mjs.
// Los tests no leen src/data/ en vivo: una edición normal de los datos no debe romper npm test.
const _accPriceLvl = (p) => p < 2000 ? 1 : p < 8000 ? 2 : p < 25000 ? 3 : p < 60000 ? 4 : 5;
const _accFmt = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;

// Builder: amx(id, nombre, marca, pais, categoria, avail, precioActualMXN, dcamRef,
//              compatibilidad[], specs[[k,v]], descripcion)
const amx = (id, nombre, marca, pais, categoria, avail, precio, dcamRef, compatibilidad, specs, descripcion) => ({
  id, nombre, marca, pais, categoria, avail,
  compatibilidad: compatibilidad || [],
  specs: specs || [],
  descripcion: descripcion || '',
  priceExact: _accFmt(precio),
  priceLvl: _accPriceLvl(precio),
  dcamRef: dcamRef || '',
  priceManualId: 'man_acc_2025_10_03',
  img: '',
});

// ── CATÁLOGO DE ACCESORIOS (muestra realista · estructura definitiva) ────────
window.ACCESORIOS = [
  // ── cargadores ──
  amx(101, 'Cargador .22 LR · Nordic Components', 'Nordic Components', 'EUA', 'cargadores', 'dcam', 590.63,
    'CARGADOR 22 LR NORDIC COMPONENTS',
    [],
    [['Calibre', '.22 LR'], ['Tipo', 'Fuego anular']],
    'Cargador de repuesto para rifle de fuego anular .22 LR, el calibre de iniciación y entrenamiento más común.'),
  amx(102, 'Cargador .22 LR · Mossberg', 'Mossberg', 'EUA', 'cargadores', 'dcam', 295.32,
    'CARGADOR CAL.22 LR MOSSBERG',
    ['Mossberg 702 Plinkster (cód. 95702)'],
    [['Calibre', '.22 LR'], ['Marca', 'Mossberg']],
    'Cargador de fábrica para rifle Mossberg en .22 LR. Económico y de adquisición civil directa en la DCAM.'),
];

const _h = (mid, price, date, qty, errata) => ({ manualId: mid, price: _accFmt(price), date, qty: (qty == null ? null : qty), ...(errata == null ? {} : { errata: _accFmt(errata) }) });
const SEP = 'man_acc_2025_09_26', OCT = 'man_acc_2025_10_03', JUN = 'man_acc_2026_06_16';
const SEPd = '2025-09-26', OCTd = '2025-10-03', JUNd = '2026-06-16';
const JUN18 = 'man_acc_2026_06_18', JUN18d = '2026-06-18';
const JUL = 'man_acc_2026_07_06', JULd = '2026-07-06';
const S11 = 'man_acc_2026_09_11', S11d = '2026-09-11';
const S14 = 'man_acc_2026_09_14', S14d = '2026-09-14';
const S15 = 'man_acc_2026_09_15', S15d = '2026-09-15';
const S18 = 'man_acc_2026_09_18', S18d = '2026-09-18';
const S22 = 'man_acc_2026_09_22', S22d = '2026-09-22';
const S25 = 'man_acc_2026_09_25', S25d = '2026-09-25';

window.ACCESORIOS_PRICE_HISTORY = {
  101: [_h(OCT, 665.4, OCTd, 18), _h(JUL, 608.16, JULd, 8), _h(S11, 590.63, S11d, 4), _h(S14, 590.58, S14d, 4), _h(S15, 596.04, S15d, 4), _h(S18, 598.11, S18d, 4), _h(S22, 599.27, S22d, 4), _h(S25, 613.96, S25d, 4), { manualId: 'man_acc_2026_10_01', price: '$628.81 MXN', date: '2026-10-01', qty: 4 }, { manualId: 'man_acc_2026_10_02', price: '$639.23 MXN', date: '2026-10-02', qty: 4 }, { manualId: 'man_acc_2026_10_05', price: '$633.02 MXN', date: '2026-10-05', qty: 4 }, { manualId: 'man_acc_2026_10_06', price: '$631.07 MXN', date: '2026-10-06', qty: 4 }, { manualId: 'man_acc_2026_10_07', price: '$625.25 MXN', date: '2026-10-07', qty: 4 }, { manualId: 'man_acc_2026_10_09', price: '$630.33 MXN', date: '2026-10-09', qty: 4 }, { manualId: 'man_acc_2026_10_13', price: '$635.25 MXN', date: '2026-10-13', qty: 4 }],
  102: [_h(OCT, 332.7, OCTd, 46), _h(JUL, 304.08, JULd, 44), _h(S11, 295.32, S11d, 44), _h(S14, 295.29, S14d, 44), _h(S15, 298.02, S15d, 44), _h(S18, 299.06, S18d, 44), _h(S22, 299.63, S22d, 44), _h(S25, 306.98, S25d, 42), { manualId: 'man_acc_2026_10_01', price: '$314.40 MXN', date: '2026-10-01', qty: 42 }, { manualId: 'man_acc_2026_10_02', price: '$319.62 MXN', date: '2026-10-02', qty: 42 }, { manualId: 'man_acc_2026_10_05', price: '$316.51 MXN', date: '2026-10-05', qty: 42 }, { manualId: 'man_acc_2026_10_06', price: '$315.54 MXN', date: '2026-10-06', qty: 42 }, { manualId: 'man_acc_2026_10_07', price: '$312.63 MXN', date: '2026-10-07', qty: 42 }, { manualId: 'man_acc_2026_10_09', price: '$315.16 MXN', date: '2026-10-09', qty: 42 }, { manualId: 'man_acc_2026_10_13', price: '$317.62 MXN', date: '2026-10-13', qty: 42 }],
};
