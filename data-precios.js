// Armado en México — Inventarios DCAM y conciliación de precios
// =============================================================================
// FUENTE DE VERDAD de precios oficiales. Este archivo viaja con el despliegue
// (versionado en git), así que lo que pongas aquí lo ven TODOS los usuarios.
// Edita ESTE archivo al alimentar un PDF nuevo — no hace falta tocar el admin.
//
// ── 1) INVENTARIOS (PDFs oficiales) ──────────────────────────────────────────
// Cada PDF va físicamente en la carpeta  inventarios/  del repo y se registra
// aquí en window.AMX_MANUALES_SEED. Esquema de cada entrada:
//
//   {
//     id:       'man_dcam_2025_10_03',                 // id estable y único
//     nombre:   'Existencias de armas DCAM · 3 de octubre 2025',
//     fecha:    '2025-10-03',                          // YYYY-MM-DD del inventario
//     url:      'inventarios/dcam-existencias-2025-10-03.pdf', // ruta relativa
//     fileName: 'dcam-existencias-2025-10-03.pdf',
//     primary:  true,    // opcional: marca la FUENTE PRINCIPAL de precios
//   }
//
// El inventario con fecha más reciente (o el marcado primary:true) es la
// fuente principal: toda ficha sin precio específico enlaza a él.
//
// ── 2) HISTORIAL DE PRECIOS por arma ─────────────────────────────────────────
// window.AMX_PRICE_HISTORY_SEED es un mapa  armaId -> [registros].
// Un registro por cada inventario donde aparece esa arma, en ORDEN CRONOLÓGICO
// (más antiguo primero). El ÚLTIMO se publica como precio actual de la ficha.
// Esquema de cada registro:
//
//   { manualId: 'man_dcam_2025_10_03', price: '$8,733.33 MXN', date: '2025-10-03' }
//
//   - manualId : id de un inventario de la lista de arriba
//   - price    : texto exacto del precio (con $ y "MXN") tal como conviene mostrarlo
//   - date     : = fecha del inventario (se usa para ordenar y mostrar)
//   - note     : (opcional) nota corta; por defecto se muestra el nombre del inventario
//
// ── REGLA DE CONCILIACIÓN (al cargar un PDF nuevo) ───────────────────────────
// 1. Copia el PDF a  inventarios/  con nombre  dcam-existencias-AAAA-MM-DD.pdf
// 2. Agrega su entrada en AMX_MANUALES_SEED. Si es el más reciente, ponle
//    primary:true y quítaselo al anterior.
// 3. Por cada arma cuyo precio aparezca en ese PDF, AÑADE (no reemplaces) un
//    registro en AMX_PRICE_HISTORY_SEED[armaId] con el precio de ESE inventario.
//    Conserva los registros previos: el historial completo es el valor.
// 4. Si una arma ya tenía precio y NO cambió en el nuevo PDF, igual conviene
//    añadir el registro para dejar constancia de que sigue vigente en esa fecha.
//
// NOTA: para las armas que aún no tienen un registro explícito aquí, la app
// atribuye automáticamente su precio actual (de data.js) al inventario
// principal. Conforme conciliemos PDFs, esos precios se vuelven explícitos aquí.
// =============================================================================

window.AMX_MANUALES_SEED = [
  {
    id: 'man_dcam_2025_10_03',
    nombre: 'Existencias de armas DCAM · 3 de octubre 2025',
    autoridad: 'DCAM',
    fecha: '2025-10-03',
    url: 'inventarios/dcam-existencias-2025-10-03.pdf',
    fileName: 'dcam-existencias-2025-10-03.pdf',
    addedAt: '2025-10-03T12:00:00.000Z',
    primary: true,
  },
  {
    id: 'man_otca_armas_2025_09_26',
    nombre: 'Existencias de armas OTCA · 26 de septiembre 2025',
    autoridad: 'OTCA',
    fecha: '2025-09-26',
    url: 'inventarios/otca-stock-2025-09-26.pdf',
    fileName: 'otca-stock-2025-09-26.pdf',
    addedAt: '2025-09-26T12:00:00.000Z',
    primary: false,
  },
];

// armaId -> [{ manualId, price, date, note? }]  (cronológico; el último = actual)
// Vacío por ahora: los precios actuales de data.js se atribuyen automáticamente
// al inventario principal. Agrega entradas aquí al conciliar PDFs nuevos, p. ej.:
//
//   window.AMX_PRICE_HISTORY_SEED = {
//     1: [
//       { manualId: 'man_dcam_2025_06_15', price: '$8,200.00 MXN', date: '2025-06-15' },
//       { manualId: 'man_dcam_2025_10_03', price: '$8,733.33 MXN', date: '2025-10-03' },
//     ],
//   };
// Armas presentes en DCAM y OTCA: 2 registros (OTCA 26-sep → DCAM 3-oct, el actual).
window.AMX_PRICE_HISTORY_SEED = {
  2: [{ manualId: 'man_otca_armas_2025_09_26', price: '$10,953.46 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$10,979.05 MXN', date: '2025-10-03' }],
  5: [{ manualId: 'man_otca_armas_2025_09_26', price: '$10,144.65 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$10,133.99 MXN', date: '2025-10-03' }],
  6: [{ manualId: 'man_otca_armas_2025_09_26', price: '$14,891.47 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$14,875.83 MXN', date: '2025-10-03' }],
  7: [{ manualId: 'man_otca_armas_2025_09_26', price: '$15,903.05 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$15,886.35 MXN', date: '2025-10-03' }],
  9: [{ manualId: 'man_otca_armas_2025_09_26', price: '$12,628.07 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$13,002.96 MXN', date: '2025-10-03' }],
  10: [{ manualId: 'man_otca_armas_2025_09_26', price: '$36,052.46 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$36,014.61 MXN', date: '2025-10-03' }],
  11: [{ manualId: 'man_otca_armas_2025_09_26', price: '$12,073.00 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$12,060.32 MXN', date: '2025-10-03' }],
  12: [{ manualId: 'man_otca_armas_2025_09_26', price: '$12,073.00 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$12,060.32 MXN', date: '2025-10-03' }],
  13: [{ manualId: 'man_otca_armas_2025_09_26', price: '$12,290.81 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$15,055.46 MXN', date: '2025-10-03' }],
  23: [{ manualId: 'man_otca_armas_2025_09_26', price: '$9,824.92 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$9,814.60 MXN', date: '2025-10-03' }],
  25: [{ manualId: 'man_otca_armas_2025_09_26', price: '$10,596.48 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$10,585.36 MXN', date: '2025-10-03' }],
  31: [{ manualId: 'man_otca_armas_2025_09_26', price: '$13,294.17 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$13,280.21 MXN', date: '2025-10-03' }],
  34: [{ manualId: 'man_otca_armas_2025_09_26', price: '$9,824.92 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$9,814.60 MXN', date: '2025-10-03' }],
  37: [{ manualId: 'man_otca_armas_2025_09_26', price: '$12,322.78 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$12,309.84 MXN', date: '2025-10-03' }],
  38: [{ manualId: 'man_otca_armas_2025_09_26', price: '$12,322.78 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$12,309.84 MXN', date: '2025-10-03' }],
  41: [{ manualId: 'man_otca_armas_2025_09_26', price: '$15,958.56 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$15,941.80 MXN', date: '2025-10-03' }],
  42: [{ manualId: 'man_otca_armas_2025_09_26', price: '$16,596.90 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$16,579.47 MXN', date: '2025-10-03' }],
  45: [{ manualId: 'man_otca_armas_2025_09_26', price: '$11,887.91 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$11,914.86 MXN', date: '2025-10-03' }],
  46: [{ manualId: 'man_otca_armas_2025_09_26', price: '$11,615.16 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$12,476.19 MXN', date: '2025-10-03' }],
  47: [{ manualId: 'man_otca_armas_2025_09_26', price: '$14,004.68 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$12,060.32 MXN', date: '2025-10-03' }],
  57: [{ manualId: 'man_otca_armas_2025_09_26', price: '$13,155.40 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$21,514.50 MXN', date: '2025-10-03' }],
  59: [{ manualId: 'man_otca_armas_2025_09_26', price: '$24,756.58 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$24,730.58 MXN', date: '2025-10-03' }],
  74: [{ manualId: 'man_otca_armas_2025_09_26', price: '$38,855.62 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$38,814.82 MXN', date: '2025-10-03' }],
  75: [{ manualId: 'man_otca_armas_2025_09_26', price: '$42,741.18 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$42,696.30 MXN', date: '2025-10-03' }],
  76: [{ manualId: 'man_otca_armas_2025_09_26', price: '$53,315.46 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$53,259.48 MXN', date: '2025-10-03' }],
  77: [{ manualId: 'man_otca_armas_2025_09_26', price: '$55,924.34 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$52,815.88 MXN', date: '2025-10-03' }],
  81: [{ manualId: 'man_otca_armas_2025_09_26', price: '$36,080.22 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$36,042.33 MXN', date: '2025-10-03' }],
  82: [{ manualId: 'man_otca_armas_2025_09_26', price: '$17,207.49 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$17,189.42 MXN', date: '2025-10-03' }],
  102: [{ manualId: 'man_otca_armas_2025_09_26', price: '$25,800.13 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$25,773.04 MXN', date: '2025-10-03' }],
  103: [{ manualId: 'man_otca_armas_2025_09_26', price: '$15,231.40 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$15,215.41 MXN', date: '2025-10-03' }],
  104: [{ manualId: 'man_otca_armas_2025_09_26', price: '$15,386.82 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$15,370.67 MXN', date: '2025-10-03' }],
  105: [{ manualId: 'man_otca_armas_2025_09_26', price: '$14,609.71 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$14,594.37 MXN', date: '2025-10-03' }],
  106: [{ manualId: 'man_otca_armas_2025_09_26', price: '$24,898.61 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$22,667.85 MXN', date: '2025-10-03' }],
  108: [{ manualId: 'man_otca_armas_2025_09_26', price: '$15,449.03 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$15,432.77 MXN', date: '2025-10-03' }],
  109: [{ manualId: 'man_otca_armas_2025_09_26', price: '$8,237.39 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$8,228.74 MXN', date: '2025-10-03' }],
  48: [{ manualId: 'man_otca_armas_2025_09_26', price: '$11,552.21 MXN', date: '2025-09-26' }, { manualId: 'man_dcam_2025_10_03', price: '$12,238.63 MXN', date: '2025-10-03' }],
  // Armas exclusivas de OTCA (no en el catálogo DCAM) — un registro OTCA:
  112: [{ manualId: 'man_otca_armas_2025_09_26', price: '$37,218.13 MXN', date: '2025-09-26' }],
  113: [{ manualId: 'man_otca_armas_2025_09_26', price: '$40,798.40 MXN', date: '2025-09-26' }],
  114: [{ manualId: 'man_otca_armas_2025_09_26', price: '$54,120.33 MXN', date: '2025-09-26' }],
  115: [{ manualId: 'man_otca_armas_2025_09_26', price: '$61,127.13 MXN', date: '2025-09-26' }],
  116: [{ manualId: 'man_otca_armas_2025_09_26', price: '$50,272.96 MXN', date: '2025-09-26' }],
  117: [{ manualId: 'man_otca_armas_2025_09_26', price: '$60,610.27 MXN', date: '2025-09-26' }],
  118: [{ manualId: 'man_otca_armas_2025_09_26', price: '$81,543.34 MXN', date: '2025-09-26' }],
  119: [{ manualId: 'man_otca_armas_2025_09_26', price: '$42,907.62 MXN', date: '2025-09-26' }],
  120: [{ manualId: 'man_otca_armas_2025_09_26', price: '$21,070.03 MXN', date: '2025-09-26' }],
  121: [{ manualId: 'man_otca_armas_2025_09_26', price: '$22,782.15 MXN', date: '2025-09-26' }],
  122: [{ manualId: 'man_otca_armas_2025_09_26', price: '$27,976.05 MXN', date: '2025-09-26' }],
  123: [{ manualId: 'man_otca_armas_2025_09_26', price: '$13,988.03 MXN', date: '2025-09-26' }],
  124: [{ manualId: 'man_otca_armas_2025_09_26', price: '$14,848.40 MXN', date: '2025-09-26' }],
  125: [{ manualId: 'man_otca_armas_2025_09_26', price: '$12,840.12 MXN', date: '2025-09-26' }],
  126: [{ manualId: 'man_otca_armas_2025_09_26', price: '$11,135.14 MXN', date: '2025-09-26' }],
  127: [{ manualId: 'man_otca_armas_2025_09_26', price: '$17,095.34 MXN', date: '2025-09-26' }],
};

// ── EXISTENCIAS DE ARMAS por inventario (cantidad marcada en el PDF) ─────────
// Mapa  armaId -> cantidad  según el inventario MÁS RECIENTE (el de priceManualId
// o el principal). Dato HISTÓRICO del PDF, no en tiempo real. La ficha lo muestra
// con ese aviso. Vacío por ahora: se concilia desde el PDF oficial de existencias
// de armas (inventarios/dcam-existencias-2025-10-03.pdf) — ver CLAUDE.md.
// Conciliado desde dcam-existencias-2025-10-03.pdf (casado por precio + descripción).
window.AMX_ARMAS_EXISTENCIAS = { 1: 10, 2: 15, 3: 7, 4: 4, 5: 9, 6: 1, 7: 26, 8: 30, 9: 47, 10: 1, 11: 4, 12: 15, 13: 38, 14: 30, 15: 2, 16: 54, 17: 28, 18: 37, 19: 20, 20: 20, 21: 15, 22: 1, 23: 11, 24: 20, 25: 14, 26: 17, 27: 40, 28: 1, 29: 17, 30: 19, 31: 15, 32: 4, 33: 13, 34: 47, 35: 13, 36: 15, 37: 26, 38: 12, 39: 3, 40: 16, 41: 40, 42: 19, 43: 28, 44: 32, 45: 21, 46: 4, 47: 8, 48: 24, 49: 6, 50: 10, 51: 10, 52: 10, 53: 10, 54: 10, 55: 10, 56: 10, 57: 2, 58: 5, 59: 10, 60: 8, 61: 4, 62: 1, 63: 3, 64: 1, 65: 7, 66: 7, 67: 7, 68: 7, 69: 1, 70: 3, 71: 1, 72: 3, 73: 3, 74: 5, 75: 2, 76: 5, 77: 1, 78: 3, 79: 2, 80: 1, 81: 11, 82: 2, 83: 1, 84: 2, 85: 3, 86: 2, 87: 1, 88: 1, 89: 1, 90: 1, 91: 8, 92: 3, 93: 7, 94: 7, 95: 5, 96: 7, 97: 5, 98: 1, 99: 8, 100: 4, 101: 3, 102: 7, 103: 8, 104: 7, 105: 9, 106: 5, 107: 4, 108: 7, 109: 17, 110: 11, 111: 7, 112: 1, 113: 5, 114: 1, 115: 2, 116: 1, 117: 6, 118: 1, 119: 1, 120: 2, 121: 1, 122: 1, 123: 2, 124: 7, 125: 1, 126: 2, 127: 9 };
window.getArmaExistencias = function (armaId) {
  const m = window.AMX_ARMAS_EXISTENCIAS || {};
  const q = m[Number(armaId)];
  return (q == null) ? null : q;
};
