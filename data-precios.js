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
    id: 'man_dcam_2026_06_18',
    nombre: 'Existencias de armas DCAM · 18 de junio 2026',
    autoridad: 'DCAM',
    fecha: '2026-06-18',
    url: 'inventarios/dcam-existencias-2026-06-18.pdf',
    fileName: 'dcam-existencias-2026-06-18.pdf',
    addedAt: '2026-06-18T12:00:00.000Z',
    primary: true,
  },
  {
    id: 'man_otca_armas_2026_06_18',
    nombre: 'Existencias de armas OTCA · 18 de junio 2026',
    autoridad: 'OTCA',
    fecha: '2026-06-18',
    url: 'inventarios/otca-stock-2026-06-18.pdf',
    fileName: 'otca-stock-2026-06-18.pdf',
    addedAt: '2026-06-18T12:00:00.000Z',
    primary: false,
  },
  {
    id: 'man_dcam_2026_06_16',
    nombre: 'Existencias de armas DCAM · 16 de junio 2026',
    autoridad: 'DCAM',
    fecha: '2026-06-16',
    url: 'inventarios/dcam-existencias-2026-06-16.pdf',
    fileName: 'dcam-existencias-2026-06-16.pdf',
    addedAt: '2026-06-16T12:00:00.000Z',
    primary: false,
  },
  {
    id: 'man_dcam_2025_10_03',
    nombre: 'Existencias de armas DCAM · 3 de octubre 2025',
    autoridad: 'DCAM',
    fecha: '2025-10-03',
    url: 'inventarios/dcam-existencias-2025-10-03.pdf',
    fileName: 'dcam-existencias-2025-10-03.pdf',
    addedAt: '2025-10-03T12:00:00.000Z',
    primary: false,
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
  1: [{ manualId: 'man_dcam_2025_10_03', price: '$8,733.33 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$10,061.26 MXN', date: '2026-06-16' }],
  2: [{ manualId: 'man_otca_armas_2025_09_26', price: '$10,953.46 MXN', date: '2025-09-26', qty: 6 }, { manualId: 'man_dcam_2025_10_03', price: '$10,979.05 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$9,876.70 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$9,870.04 MXN', date: '2026-06-18', qty: 18 }, { manualId: 'man_dcam_2026_06_18', price: '$9,870.04 MXN', date: '2026-06-18' }],
  3: [{ manualId: 'man_dcam_2025_10_03', price: '$17,364.42 MXN', date: '2025-10-03' }, { manualId: 'man_otca_armas_2026_06_18', price: '$15,610.41 MXN', date: '2026-06-18', qty: 10 }],
  4: [{ manualId: 'man_dcam_2025_10_03', price: '$9,936.59 MXN', date: '2025-10-03' }],
  5: [{ manualId: 'man_otca_armas_2025_09_26', price: '$10,144.65 MXN', date: '2025-09-26', qty: 4 }, { manualId: 'man_dcam_2025_10_03', price: '$10,133.99 MXN', date: '2025-10-03' }, { manualId: 'man_otca_armas_2026_06_18', price: '$9,110.35 MXN', date: '2026-06-18', qty: 3 }],
  6: [{ manualId: 'man_otca_armas_2025_09_26', price: '$14,891.47 MXN', date: '2025-09-26', qty: 1 }, { manualId: 'man_dcam_2025_10_03', price: '$14,875.83 MXN', date: '2025-10-03' }],
  7: [{ manualId: 'man_otca_armas_2025_09_26', price: '$15,903.05 MXN', date: '2025-09-26', qty: 18 }, { manualId: 'man_dcam_2025_10_03', price: '$15,886.35 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$11,408.09 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$11,400.39 MXN', date: '2026-06-18', qty: 7 }, { manualId: 'man_dcam_2026_06_18', price: '$11,400.39 MXN', date: '2026-06-18' }],
  8: [{ manualId: 'man_dcam_2025_10_03', price: '$12,697.99 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$11,423.05 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$11,415.35 MXN', date: '2026-06-18', qty: 8 }, { manualId: 'man_dcam_2026_06_18', price: '$11,415.35 MXN', date: '2026-06-18' }],
  9: [{ manualId: 'man_otca_armas_2025_09_26', price: '$12,628.07 MXN', date: '2025-09-26', qty: 14 }, { manualId: 'man_dcam_2025_10_03', price: '$13,002.96 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$11,697.40 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$11,689.52 MXN', date: '2026-06-18', qty: 6 }, { manualId: 'man_dcam_2026_06_18', price: '$11,689.52 MXN', date: '2026-06-18' }],
  10: [{ manualId: 'man_otca_armas_2025_09_26', price: '$36,052.46 MXN', date: '2025-09-26', qty: 16 }, { manualId: 'man_dcam_2025_10_03', price: '$36,014.61 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$32,398.57 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$32,376.72 MXN', date: '2026-06-18', qty: 20 }, { manualId: 'man_dcam_2026_06_18', price: '$32,376.72 MXN', date: '2026-06-18' }],
  11: [{ manualId: 'man_otca_armas_2025_09_26', price: '$12,073.00 MXN', date: '2025-09-26', qty: 39 }, { manualId: 'man_dcam_2025_10_03', price: '$12,060.32 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$10,849.40 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$10,842.09 MXN', date: '2026-06-18', qty: 17 }, { manualId: 'man_dcam_2026_06_18', price: '$10,842.09 MXN', date: '2026-06-18' }],
  12: [{ manualId: 'man_otca_armas_2025_09_26', price: '$12,073.00 MXN', date: '2025-09-26', qty: 5 }, { manualId: 'man_dcam_2025_10_03', price: '$12,060.32 MXN', date: '2025-10-03' }],
  13: [{ manualId: 'man_otca_armas_2025_09_26', price: '$12,290.81 MXN', date: '2025-09-26', qty: 16 }, { manualId: 'man_dcam_2025_10_03', price: '$15,055.46 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$13,958.92 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$13,932.08 MXN', date: '2026-06-18', qty: 3 }, { manualId: 'man_dcam_2026_06_18', price: '$13,932.08 MXN', date: '2026-06-18' }],
  14: [{ manualId: 'man_dcam_2025_10_03', price: '$21,070.90 MXN', date: '2025-10-03' }],
  15: [{ manualId: 'man_dcam_2025_10_03', price: '$18,648.29 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$18,648.29 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$18,648.29 MXN', date: '2026-06-18' }],
  16: [{ manualId: 'man_dcam_2025_10_03', price: '$18,021.17 MXN', date: '2025-10-03' }],
  17: [{ manualId: 'man_dcam_2025_10_03', price: '$16,080.42 MXN', date: '2025-10-03' }, { manualId: 'man_otca_armas_2026_06_18', price: '$14,456.12 MXN', date: '2026-06-18', qty: 9 }],
  18: [{ manualId: 'man_dcam_2025_10_03', price: '$12,277.90 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$14,216.46 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$14,206.87 MXN', date: '2026-06-18', qty: 31 }, { manualId: 'man_dcam_2026_06_18', price: '$14,206.87 MXN', date: '2026-06-18' }],
  19: [{ manualId: 'man_dcam_2025_10_03', price: '$10,719.32 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$9,643.05 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$9,636.55 MXN', date: '2026-06-18' }],
  20: [{ manualId: 'man_dcam_2025_10_03', price: '$10,315.65 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$9,279.91 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$9,273.65 MXN', date: '2026-06-18' }],
  21: [{ manualId: 'man_dcam_2025_10_03', price: '$11,930.34 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$10,732.48 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$10,725.24 MXN', date: '2026-06-18' }],
  22: [{ manualId: 'man_dcam_2025_10_03', price: '$22,912.05 MXN', date: '2025-10-03' }],
  23: [{ manualId: 'man_otca_armas_2025_09_26', price: '$9,824.92 MXN', date: '2025-09-26', qty: 14 }, { manualId: 'man_dcam_2025_10_03', price: '$9,814.60 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$8,829.17 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$8,823.22 MXN', date: '2026-06-18' }],
  24: [{ manualId: 'man_dcam_2025_10_03', price: '$8,963.56 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$8,489.97 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$8,484.25 MXN', date: '2026-06-18' }],
  25: [{ manualId: 'man_otca_armas_2025_09_26', price: '$10,596.48 MXN', date: '2025-09-26', qty: 9 }, { manualId: 'man_dcam_2025_10_03', price: '$10,585.36 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$9,522.53 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$9,516.11 MXN', date: '2026-06-18', qty: 7 }, { manualId: 'man_dcam_2026_06_18', price: '$9,516.11 MXN', date: '2026-06-18' }],
  26: [{ manualId: 'man_dcam_2025_10_03', price: '$8,106.75 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$8,063.58 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$8,058.14 MXN', date: '2026-06-18' }],
  27: [{ manualId: 'man_dcam_2025_10_03', price: '$11,821.88 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$10,634.91 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$10,627.74 MXN', date: '2026-06-18' }],
  28: [{ manualId: 'man_dcam_2025_10_03', price: '$11,866.24 MXN', date: '2025-10-03' }],
  29: [{ manualId: 'man_dcam_2025_10_03', price: '$12,614.82 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$11,348.23 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$11,340.57 MXN', date: '2026-06-18', qty: 12 }, { manualId: 'man_dcam_2026_06_18', price: '$11,340.57 MXN', date: '2026-06-18' }],
  30: [{ manualId: 'man_dcam_2025_10_03', price: '$12,614.82 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$11,348.23 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$11,340.58 MXN', date: '2026-06-18', qty: 11 }, { manualId: 'man_dcam_2026_06_18', price: '$11,340.57 MXN', date: '2026-06-18' }],
  31: [{ manualId: 'man_otca_armas_2025_09_26', price: '$13,294.17 MXN', date: '2025-09-26', qty: 6 }, { manualId: 'man_dcam_2025_10_03', price: '$13,280.21 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$11,946.82 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$11,938.76 MXN', date: '2026-06-18', qty: 2 }, { manualId: 'man_dcam_2026_06_18', price: '$11,938.76 MXN', date: '2026-06-18' }],
  32: [{ manualId: 'man_dcam_2025_10_03', price: '$13,002.96 MXN', date: '2025-10-03' }],
  33: [{ manualId: 'man_dcam_2025_10_03', price: '$12,420.74 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$11,173.64 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$11,166.10 MXN', date: '2026-06-18' }],
  34: [{ manualId: 'man_otca_armas_2025_09_26', price: '$9,824.92 MXN', date: '2025-09-26', qty: 14 }, { manualId: 'man_dcam_2025_10_03', price: '$9,814.60 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$8,829.17 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$8,823.22 MXN', date: '2026-06-18', qty: 4 }, { manualId: 'man_dcam_2026_06_18', price: '$8,823.22 MXN', date: '2026-06-18' }],
  35: [{ manualId: 'man_dcam_2025_10_03', price: '$16,219.05 MXN', date: '2025-10-03' }],
  36: [{ manualId: 'man_dcam_2025_10_03', price: '$11,062.22 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$10,278.95 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$10,272.02 MXN', date: '2026-06-18' }],
  37: [{ manualId: 'man_otca_armas_2025_09_26', price: '$12,322.78 MXN', date: '2025-09-26', qty: 8 }, { manualId: 'man_dcam_2025_10_03', price: '$12,309.84 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$11,073.88 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$11,066.41 MXN', date: '2026-06-18', qty: 7 }, { manualId: 'man_dcam_2026_06_18', price: '$11,066.41 MXN', date: '2026-06-18' }],
  38: [{ manualId: 'man_otca_armas_2025_09_26', price: '$12,322.78 MXN', date: '2025-09-26', qty: 1 }, { manualId: 'man_dcam_2025_10_03', price: '$12,309.84 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$11,073.88 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$11,066.41 MXN', date: '2026-06-18', qty: 4 }, { manualId: 'man_dcam_2026_06_18', price: '$11,066.41 MXN', date: '2026-06-18' }],
  39: [{ manualId: 'man_dcam_2025_10_03', price: '$14,278.31 MXN', date: '2025-10-03' }],
  40: [{ manualId: 'man_dcam_2025_10_03', price: '$14,832.81 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$10,849.40 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$10,842.09 MXN', date: '2026-06-18', qty: 2 }, { manualId: 'man_dcam_2026_06_18', price: '$10,842.09 MXN', date: '2026-06-18' }],
  41: [{ manualId: 'man_otca_armas_2025_09_26', price: '$15,958.56 MXN', date: '2025-09-26', qty: 36 }, { manualId: 'man_dcam_2025_10_03', price: '$15,941.80 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$14,341.17 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$14,331.49 MXN', date: '2026-06-18', qty: 16 }, { manualId: 'man_dcam_2026_06_18', price: '$14,331.50 MXN', date: '2026-06-18' }],
  42: [{ manualId: 'man_otca_armas_2025_09_26', price: '$16,596.90 MXN', date: '2025-09-26', qty: 11 }, { manualId: 'man_dcam_2025_10_03', price: '$16,579.47 MXN', date: '2025-10-03' }, { manualId: 'man_otca_armas_2026_06_18', price: '$14,904.76 MXN', date: '2026-06-18', qty: 4 }],
  43: [{ manualId: 'man_dcam_2025_10_03', price: '$30,892.82 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$27,791.04 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$27,772.29 MXN', date: '2026-06-18' }],
  44: [{ manualId: 'man_dcam_2025_10_03', price: '$19,374.14 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$17,428.88 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$17,417.13 MXN', date: '2026-06-18', qty: 18 }, { manualId: 'man_dcam_2026_06_18', price: '$17,417.13 MXN', date: '2026-06-18' }],
  45: [{ manualId: 'man_otca_armas_2025_09_26', price: '$11,887.91 MXN', date: '2025-09-26', qty: 37 }, { manualId: 'man_dcam_2025_10_03', price: '$11,914.86 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$10,657.43 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$10,636.94 MXN', date: '2026-06-18', qty: 2 }, { manualId: 'man_dcam_2026_06_18', price: '$10,636.94 MXN', date: '2026-06-18' }],
  46: [{ manualId: 'man_otca_armas_2025_09_26', price: '$11,615.16 MXN', date: '2025-09-26', qty: 2 }, { manualId: 'man_dcam_2025_10_03', price: '$12,476.19 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$10,437.98 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$10,430.94 MXN', date: '2026-06-18' }],
  47: [{ manualId: 'man_otca_armas_2025_09_26', price: '$14,004.68 MXN', date: '2025-09-26', qty: 19 }, { manualId: 'man_dcam_2025_10_03', price: '$12,060.32 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$10,849.40 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$10,842.09 MXN', date: '2026-06-18', qty: 10 }, { manualId: 'man_dcam_2026_06_18', price: '$10,842.09 MXN', date: '2026-06-18' }],
  48: [{ manualId: 'man_otca_armas_2025_09_26', price: '$11,552.21 MXN', date: '2025-09-26', qty: 20 }, { manualId: 'man_dcam_2025_10_03', price: '$12,238.63 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$10,947.04 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$10,925.99 MXN', date: '2026-06-18', qty: 1 }, { manualId: 'man_dcam_2026_06_18', price: '$10,925.99 MXN', date: '2026-06-18' }],
  49: [{ manualId: 'man_dcam_2025_10_03', price: '$166,349.22 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$149,646.96 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$149,546.04 MXN', date: '2026-06-18' }],
  50: [{ manualId: 'man_dcam_2025_10_03', price: '$8,348.94 MXN', date: '2025-10-03' }, { manualId: 'man_otca_armas_2026_06_18', price: '$8,348.94 MXN', date: '2026-06-18', qty: 2 }],
  51: [{ manualId: 'man_dcam_2025_10_03', price: '$9,760.66 MXN', date: '2025-10-03' }],
  52: [{ manualId: 'man_dcam_2025_10_03', price: '$9,760.66 MXN', date: '2025-10-03' }, { manualId: 'man_otca_armas_2026_06_18', price: '$9,760.66 MXN', date: '2026-06-18', qty: 5 }],
  53: [{ manualId: 'man_dcam_2025_10_03', price: '$9,760.66 MXN', date: '2025-10-03' }, { manualId: 'man_otca_armas_2026_06_18', price: '$9,760.66 MXN', date: '2026-06-18', qty: 2 }],
  54: [{ manualId: 'man_dcam_2025_10_03', price: '$10,833.88 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$10,833.88 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$10,833.88 MXN', date: '2026-06-18' }],
  55: [{ manualId: 'man_dcam_2025_10_03', price: '$5,965.69 MXN', date: '2025-10-03' }],
  56: [{ manualId: 'man_dcam_2025_10_03', price: '$7,028.28 MXN', date: '2025-10-03' }],
  57: [{ manualId: 'man_otca_armas_2025_09_26', price: '$13,155.40 MXN', date: '2025-09-26', qty: 1 }, { manualId: 'man_dcam_2025_10_03', price: '$21,514.50 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$12,944.46 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$14,306.57 MXN', date: '2026-06-18', qty: 41 }, { manualId: 'man_dcam_2026_06_18', price: '$12,935.73 MXN', date: '2026-06-18' }],
  58: [{ manualId: 'man_dcam_2025_10_03', price: '$20,960.00 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$18,855.52 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$18,842.80 MXN', date: '2026-06-18' }],
  59: [{ manualId: 'man_otca_armas_2025_09_26', price: '$24,756.58 MXN', date: '2025-09-26', qty: 1 }, { manualId: 'man_dcam_2025_10_03', price: '$24,730.58 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$22,247.51 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$22,232.51 MXN', date: '2026-06-18' }],
  60: [{ manualId: 'man_dcam_2025_10_03', price: '$17,580.90 MXN', date: '2025-10-03' }],
  61: [{ manualId: 'man_dcam_2025_10_03', price: '$18,506.91 MXN', date: '2025-10-03' }],
  62: [{ manualId: 'man_dcam_2025_10_03', price: '$24,375.71 MXN', date: '2025-10-03' }],
  63: [{ manualId: 'man_dcam_2025_10_03', price: '$24,375.71 MXN', date: '2025-10-03' }],
  64: [{ manualId: 'man_dcam_2025_10_03', price: '$24,375.71 MXN', date: '2025-10-03' }],
  65: [{ manualId: 'man_dcam_2025_10_03', price: '$27,724.87 MXN', date: '2025-10-03' }],
  66: [{ manualId: 'man_dcam_2025_10_03', price: '$22,179.90 MXN', date: '2025-10-03' }],
  67: [{ manualId: 'man_dcam_2025_10_03', price: '$22,179.90 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$19,952.93 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$19,939.47 MXN', date: '2026-06-18' }],
  68: [{ manualId: 'man_dcam_2025_10_03', price: '$22,179.90 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$19,952.93 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$19,939.47 MXN', date: '2026-06-18' }],
  69: [{ manualId: 'man_dcam_2025_10_03', price: '$31,070.93 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$27,951.26 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$27,932.41 MXN', date: '2026-06-18' }],
  70: [{ manualId: 'man_dcam_2025_10_03', price: '$54,063.50 MXN', date: '2025-10-03' }],
  71: [{ manualId: 'man_dcam_2025_10_03', price: '$25,395.98 MXN', date: '2025-10-03' }],
  72: [{ manualId: 'man_dcam_2025_10_03', price: '$40,201.06 MXN', date: '2025-10-03' }],
  73: [{ manualId: 'man_dcam_2025_10_03', price: '$38,814.82 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$34,917.62 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$34,894.08 MXN', date: '2026-06-18' }],
  74: [{ manualId: 'man_otca_armas_2025_09_26', price: '$38,855.62 MXN', date: '2025-09-26', qty: 3 }, { manualId: 'man_dcam_2025_10_03', price: '$38,814.82 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$34,917.62 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$34,894.08 MXN', date: '2026-06-18', qty: 3 }, { manualId: 'man_dcam_2026_06_18', price: '$34,894.08 MXN', date: '2026-06-18' }],
  75: [{ manualId: 'man_otca_armas_2025_09_26', price: '$42,741.18 MXN', date: '2025-09-26', qty: 1 }, { manualId: 'man_dcam_2025_10_03', price: '$42,696.30 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$38,409.39 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$38,383.48 MXN', date: '2026-06-18' }],
  76: [{ manualId: 'man_otca_armas_2025_09_26', price: '$53,315.46 MXN', date: '2025-09-26', qty: 4 }, { manualId: 'man_dcam_2025_10_03', price: '$53,259.48 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$47,911.97 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$47,879.66 MXN', date: '2026-06-18', qty: 4 }, { manualId: 'man_dcam_2026_06_18', price: '$47,879.66 MXN', date: '2026-06-18' }],
  77: [{ manualId: 'man_otca_armas_2025_09_26', price: '$55,924.34 MXN', date: '2025-09-26', qty: 2 }, { manualId: 'man_dcam_2025_10_03', price: '$52,815.88 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$47,512.91 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$50,222.55 MXN', date: '2026-06-18', qty: 5 }, { manualId: 'man_dcam_2026_06_18', price: '$47,480.87 MXN', date: '2026-06-18' }],
  78: [{ manualId: 'man_dcam_2025_10_03', price: '$46,106.46 MXN', date: '2025-10-03' }],
  79: [{ manualId: 'man_dcam_2025_10_03', price: '$47,132.28 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$42,399.97 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$42,371.38 MXN', date: '2026-06-18' }],
  80: [{ manualId: 'man_dcam_2025_10_03', price: '$30,497.36 MXN', date: '2025-10-03' }],
  81: [{ manualId: 'man_otca_armas_2025_09_26', price: '$36,080.22 MXN', date: '2025-09-26', qty: 2 }, { manualId: 'man_dcam_2025_10_03', price: '$36,042.33 MXN', date: '2025-10-03' }],
  82: [{ manualId: 'man_otca_armas_2025_09_26', price: '$17,207.49 MXN', date: '2025-09-26', qty: 1 }, { manualId: 'man_dcam_2025_10_03', price: '$17,189.42 MXN', date: '2025-10-03' }],
  83: [{ manualId: 'man_dcam_2025_10_03', price: '$40,700.11 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$36,613.62 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$36,588.93 MXN', date: '2026-06-18' }],
  84: [{ manualId: 'man_dcam_2025_10_03', price: '$16,634.92 MXN', date: '2025-10-03' }],
  85: [{ manualId: 'man_dcam_2025_10_03', price: '$5,989.81 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$5,357.68 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$5,368.35 MXN', date: '2026-06-18', qty: 5 }, { manualId: 'man_dcam_2026_06_18', price: '$5,347.38 MXN', date: '2026-06-18' }],
  86: [{ manualId: 'man_dcam_2025_10_03', price: '$431,071.90 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$385,578.97 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$384,837.64 MXN', date: '2026-06-18' }],
  87: [{ manualId: 'man_dcam_2025_10_03', price: '$713,855.59 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$638,519.23 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$637,291.60 MXN', date: '2026-06-18' }],
  88: [{ manualId: 'man_dcam_2025_10_03', price: '$326,428.34 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$291,978.90 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$291,417.54 MXN', date: '2026-06-18' }],
  89: [{ manualId: 'man_dcam_2025_10_03', price: '$446,386.39 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$399,277.24 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$398,509.58 MXN', date: '2026-06-18' }],
  90: [{ manualId: 'man_dcam_2025_10_03', price: '$726,418.00 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$649,755.87 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$648,506.63 MXN', date: '2026-06-18' }],
  91: [{ manualId: 'man_dcam_2025_10_03', price: '$10,185.01 MXN', date: '2025-10-03' }],
  92: [{ manualId: 'man_dcam_2025_10_03', price: '$13,435.47 MXN', date: '2025-10-03' }],
  93: [{ manualId: 'man_dcam_2025_10_03', price: '$41,725.93 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$36,912.92 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$38,258.86 MXN', date: '2026-06-18', qty: 7 }, { manualId: 'man_dcam_2026_06_18', price: '$38,258.86 MXN', date: '2026-06-18' }],
  94: [{ manualId: 'man_dcam_2025_10_03', price: '$27,447.62 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$25,689.39 MXN', date: '2026-06-16' }],
  95: [{ manualId: 'man_dcam_2025_10_03', price: '$28,168.29 MXN', date: '2025-10-03' }],
  96: [{ manualId: 'man_dcam_2025_10_03', price: '$28,653.95 MXN', date: '2025-10-03' }],
  97: [{ manualId: 'man_dcam_2025_10_03', price: '$43,004.88 MXN', date: '2025-10-03' }],
  98: [{ manualId: 'man_dcam_2025_10_03', price: '$124,628.15 MXN', date: '2025-10-03' }],
  99: [{ manualId: 'man_dcam_2025_10_03', price: '$12,731.26 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_18', price: '$13,259.75 MXN', date: '2026-06-18' }],
  100: [{ manualId: 'man_dcam_2025_10_03', price: '$219,647.87 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$169,997.64 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$169,670.79 MXN', date: '2026-06-18' }],
  101: [{ manualId: 'man_dcam_2025_10_03', price: '$43,006.82 MXN', date: '2025-10-03' }],
  102: [{ manualId: 'man_otca_armas_2025_09_26', price: '$25,800.13 MXN', date: '2025-09-26', qty: 1 }, { manualId: 'man_dcam_2025_10_03', price: '$25,773.04 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$23,185.30 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$23,169.67 MXN', date: '2026-06-18' }],
  103: [{ manualId: 'man_otca_armas_2025_09_26', price: '$15,231.40 MXN', date: '2025-09-26', qty: 3 }, { manualId: 'man_dcam_2025_10_03', price: '$15,215.41 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$13,687.71 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$13,678.48 MXN', date: '2026-06-18' }],
  104: [{ manualId: 'man_otca_armas_2025_09_26', price: '$15,386.82 MXN', date: '2025-09-26', qty: 3 }, { manualId: 'man_dcam_2025_10_03', price: '$15,370.67 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_18', price: '$13,818.05 MXN', date: '2026-06-18' }],
  105: [{ manualId: 'man_otca_armas_2025_09_26', price: '$14,609.71 MXN', date: '2025-09-26', qty: 3 }, { manualId: 'man_dcam_2025_10_03', price: '$14,594.37 MXN', date: '2025-10-03' }, { manualId: 'man_otca_armas_2026_06_18', price: '$13,120.17 MXN', date: '2026-06-18', qty: 3 }],
  106: [{ manualId: 'man_otca_armas_2025_09_26', price: '$24,898.61 MXN', date: '2025-09-26', qty: 2 }, { manualId: 'man_dcam_2025_10_03', price: '$22,667.85 MXN', date: '2025-10-03' }],
  107: [{ manualId: 'man_dcam_2025_10_03', price: '$24,872.54 MXN', date: '2025-10-03' }],
  108: [{ manualId: 'man_otca_armas_2025_09_26', price: '$15,449.03 MXN', date: '2025-09-26', qty: 2 }, { manualId: 'man_dcam_2025_10_03', price: '$15,432.77 MXN', date: '2025-10-03' }],
  109: [{ manualId: 'man_otca_armas_2025_09_26', price: '$8,237.39 MXN', date: '2025-09-26', qty: 1 }, { manualId: 'man_dcam_2025_10_03', price: '$8,228.74 MXN', date: '2025-10-03' }],
  110: [{ manualId: 'man_dcam_2025_10_03', price: '$36,197.87 MXN', date: '2025-10-03' }],
  111: [{ manualId: 'man_dcam_2025_10_03', price: '$60,059.97 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$53,721.57 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$53,618.28 MXN', date: '2026-06-18' }],
  112: [{ manualId: 'man_otca_armas_2025_09_26', price: '$37,218.13 MXN', date: '2025-09-26', qty: 1 }],
  113: [{ manualId: 'man_otca_armas_2025_09_26', price: '$40,798.40 MXN', date: '2025-09-26', qty: 5 }, { manualId: 'man_otca_armas_2026_06_18', price: '$36,638.78 MXN', date: '2026-06-18', qty: 5 }],
  114: [{ manualId: 'man_otca_armas_2025_09_26', price: '$54,120.33 MXN', date: '2025-09-26', qty: 1 }, { manualId: 'man_otca_armas_2026_06_18', price: '$48,602.46 MXN', date: '2026-06-18', qty: 1 }],
  115: [{ manualId: 'man_otca_armas_2025_09_26', price: '$61,127.13 MXN', date: '2025-09-26', qty: 2 }],
  116: [{ manualId: 'man_otca_armas_2025_09_26', price: '$50,272.96 MXN', date: '2025-09-26', qty: 1 }],
  117: [{ manualId: 'man_otca_armas_2025_09_26', price: '$60,610.27 MXN', date: '2025-09-26', qty: 6 }],
  118: [{ manualId: 'man_otca_armas_2025_09_26', price: '$81,543.34 MXN', date: '2025-09-26', qty: 1 }],
  119: [{ manualId: 'man_otca_armas_2025_09_26', price: '$42,907.62 MXN', date: '2025-09-26', qty: 1 }],
  120: [{ manualId: 'man_otca_armas_2025_09_26', price: '$21,070.03 MXN', date: '2025-09-26', qty: 2 }],
  121: [{ manualId: 'man_otca_armas_2025_09_26', price: '$22,782.15 MXN', date: '2025-09-26', qty: 1 }],
  122: [{ manualId: 'man_otca_armas_2025_09_26', price: '$27,976.05 MXN', date: '2025-09-26', qty: 1 }, { manualId: 'man_dcam_2026_06_16', price: '$25,140.69 MXN', date: '2026-06-16' }],
  123: [{ manualId: 'man_otca_armas_2025_09_26', price: '$13,988.03 MXN', date: '2025-09-26', qty: 2 }, { manualId: 'man_otca_armas_2026_06_18', price: '$12,561.87 MXN', date: '2026-06-18', qty: 2 }],
  124: [{ manualId: 'man_otca_armas_2025_09_26', price: '$14,848.40 MXN', date: '2025-09-26', qty: 7 }, { manualId: 'man_dcam_2026_06_16', price: '$13,343.52 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$13,334.52 MXN', date: '2026-06-18' }],
  125: [{ manualId: 'man_otca_armas_2025_09_26', price: '$12,840.12 MXN', date: '2025-09-26', qty: 1 }, { manualId: 'man_dcam_2026_06_16', price: '$11,538.78 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$11,531.00 MXN', date: '2026-06-18' }],
  126: [{ manualId: 'man_otca_armas_2025_09_26', price: '$11,135.14 MXN', date: '2025-09-26', qty: 2 }, { manualId: 'man_dcam_2026_06_16', price: '$9,643.45 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$9,636.95 MXN', date: '2026-06-18', qty: 2 }, { manualId: 'man_dcam_2026_06_18', price: '$9,636.95 MXN', date: '2026-06-18' }],
  127: [{ manualId: 'man_otca_armas_2025_09_26', price: '$17,095.34 MXN', date: '2025-09-26', qty: 9 }],
  128: [{ manualId: 'man_otca_armas_2025_09_26', price: '$111,016.06 MXN', date: '2025-09-26', qty: 1 }, { manualId: 'man_dcam_2026_06_16', price: '$99,764.64 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$99,697.36 MXN', date: '2026-06-18', qty: 1 }, { manualId: 'man_dcam_2026_06_18', price: '$99,697.36 MXN', date: '2026-06-18' }],
  129: [{ manualId: 'man_dcam_2026_06_16', price: '$29,192.10 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$29,135.97 MXN', date: '2026-06-18' }],
  130: [{ manualId: 'man_dcam_2026_06_16', price: '$10,107.18 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$10,087.75 MXN', date: '2026-06-18' }],
  131: [{ manualId: 'man_dcam_2026_06_16', price: '$7,482.35 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$7,477.30 MXN', date: '2026-06-18' }],
  132: [{ manualId: 'man_dcam_2026_06_16', price: '$10,849.40 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$10,842.09 MXN', date: '2026-06-18' }],
  133: [{ manualId: 'man_dcam_2026_06_16', price: '$7,731.76 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$7,726.54 MXN', date: '2026-06-18', qty: 16 }, { manualId: 'man_dcam_2026_06_18', price: '$7,726.55 MXN', date: '2026-06-18' }],
  134: [{ manualId: 'man_dcam_2026_06_16', price: '$19,055.95 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$19,019.32 MXN', date: '2026-06-18', qty: 8 }, { manualId: 'man_dcam_2026_06_18', price: '$19,019.32 MXN', date: '2026-06-18' }],
  135: [{ manualId: 'man_dcam_2026_06_16', price: '$10,628.47 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$10,608.04 MXN', date: '2026-06-18' }],
  136: [{ manualId: 'man_dcam_2026_06_16', price: '$13,321.79 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$13,296.18 MXN', date: '2026-06-18' }],
  137: [{ manualId: 'man_dcam_2026_06_16', price: '$8,340.32 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$8,334.70 MXN', date: '2026-06-18' }],
  138: [{ manualId: 'man_dcam_2026_06_16', price: '$6,993.50 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$6,988.78 MXN', date: '2026-06-18' }],
  139: [{ manualId: 'man_dcam_2026_06_16', price: '$11,707.38 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$11,699.49 MXN', date: '2026-06-18' }],
  140: [{ manualId: 'man_dcam_2026_06_16', price: '$9,138.44 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$9,132.28 MXN', date: '2026-06-18' }],
  141: [{ manualId: 'man_dcam_2026_06_16', price: '$13,078.94 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$13,070.12 MXN', date: '2026-06-18' }],
  142: [{ manualId: 'man_dcam_2026_06_16', price: '$9,475.45 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$9,469.06 MXN', date: '2026-06-18' }],
  143: [{ manualId: 'man_dcam_2026_06_16', price: '$22,305.77 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$35,495.02 MXN', date: '2026-06-18', qty: 14 }, { manualId: 'man_dcam_2026_06_18', price: '$22,262.89 MXN', date: '2026-06-18' }],
  144: [{ manualId: 'man_dcam_2026_06_16', price: '$27,338.63 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$27,286.07 MXN', date: '2026-06-18' }],
  145: [{ manualId: 'man_dcam_2026_06_16', price: '$12,849.69 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$12,841.02 MXN', date: '2026-06-18', qty: 22 }, { manualId: 'man_dcam_2026_06_18', price: '$12,841.02 MXN', date: '2026-06-18' }],
  146: [{ manualId: 'man_dcam_2026_06_16', price: '$16,481.12 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$16,470.00 MXN', date: '2026-06-18' }],
  147: [{ manualId: 'man_dcam_2026_06_16', price: '$19,952.93 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$19,939.47 MXN', date: '2026-06-18' }],
  148: [{ manualId: 'man_dcam_2026_06_16', price: '$37,411.74 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$37,386.51 MXN', date: '2026-06-18' }],
  149: [{ manualId: 'man_dcam_2026_06_16', price: '$28,931.75 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$28,912.23 MXN', date: '2026-06-18' }],
  150: [{ manualId: 'man_dcam_2026_06_16', price: '$28,682.33 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$28,662.99 MXN', date: '2026-06-18' }],
  151: [{ manualId: 'man_dcam_2026_06_16', price: '$14,212.67 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$14,203.09 MXN', date: '2026-06-18' }],
  152: [{ manualId: 'man_dcam_2026_06_16', price: '$33,241.58 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$33,219.16 MXN', date: '2026-06-18', qty: 6 }, { manualId: 'man_dcam_2026_06_18', price: '$33,219.16 MXN', date: '2026-06-18' }],
  153: [{ manualId: 'man_dcam_2026_06_16', price: '$48,653.50 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$48,559.95 MXN', date: '2026-06-18' }],
  154: [{ manualId: 'man_dcam_2026_06_16', price: '$78,106.24 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$77,956.07 MXN', date: '2026-06-18' }],
  155: [{ manualId: 'man_dcam_2026_06_16', price: '$83,811.44 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$83,650.30 MXN', date: '2026-06-18' }],
  156: [{ manualId: 'man_dcam_2026_06_16', price: '$40,341.86 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$40,264.30 MXN', date: '2026-06-18', qty: 13 }, { manualId: 'man_dcam_2026_06_18', price: '$40,264.30 MXN', date: '2026-06-18' }],
  157: [{ manualId: 'man_dcam_2026_06_16', price: '$50,738.65 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$50,641.10 MXN', date: '2026-06-18' }],
  158: [{ manualId: 'man_dcam_2026_06_16', price: '$164,929.56 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$164,612.47 MXN', date: '2026-06-18' }],
  159: [{ manualId: 'man_dcam_2026_06_16', price: '$65,226.12 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$65,182.14 MXN', date: '2026-06-18', qty: 6 }, { manualId: 'man_dcam_2026_06_18', price: '$65,182.13 MXN', date: '2026-06-18' }],
  160: [{ manualId: 'man_dcam_2026_06_16', price: '$51,259.07 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$51,224.50 MXN', date: '2026-06-18', qty: 12 }, { manualId: 'man_dcam_2026_06_18', price: '$51,224.50 MXN', date: '2026-06-18' }],
  161: [{ manualId: 'man_dcam_2026_06_16', price: '$13,827.38 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$14,236.79 MXN', date: '2026-06-18', qty: 1 }, { manualId: 'man_dcam_2026_06_18', price: '$13,818.05 MXN', date: '2026-06-18' }],
  162: [{ manualId: 'man_dcam_2026_06_16', price: '$35,621.31 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$35,552.83 MXN', date: '2026-06-18', qty: 3 }, { manualId: 'man_dcam_2026_06_18', price: '$35,552.82 MXN', date: '2026-06-18' }],
  163: [{ manualId: 'man_dcam_2026_06_16', price: '$83,927.28 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$83,765.92 MXN', date: '2026-06-18' }],
  164: [{ manualId: 'man_dcam_2026_06_16', price: '$115,581.02 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$115,358.80 MXN', date: '2026-06-18' }],
  165: [{ manualId: 'man_dcam_2026_06_16', price: '$17,598.48 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$17,586.61 MXN', date: '2026-06-18' }],
  166: [{ manualId: 'man_dcam_2026_06_16', price: '$19,553.87 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$19,540.68 MXN', date: '2026-06-18' }],
  167: [{ manualId: 'man_dcam_2026_06_16', price: '$22,347.28 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$22,332.21 MXN', date: '2026-06-18' }],
  168: [{ manualId: 'man_dcam_2026_06_16', price: '$13,129.03 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_06_18', price: '$13,120.17 MXN', date: '2026-06-18' }],
  169: [{ manualId: 'man_dcam_2026_06_18', price: '$408,366.10 MXN', date: '2026-06-18' }],
  170: [{ manualId: 'man_dcam_2026_06_18', price: '$33,327.16 MXN', date: '2026-06-18' }],
  171: [{ manualId: 'man_otca_armas_2026_06_18', price: '$35,321.58 MXN', date: '2026-06-18', qty: 8 }, { manualId: 'man_dcam_2026_06_18', price: '$35,321.59 MXN', date: '2026-06-18' }],
  172: [{ manualId: 'man_otca_armas_2026_06_18', price: '$21,718.08 MXN', date: '2026-06-18', qty: 5 }],
  173: [{ manualId: 'man_otca_armas_2026_06_18', price: '$13,823.83 MXN', date: '2026-06-18', qty: 7 }],
  174: [{ manualId: 'man_dcam_2026_06_18', price: '$18,842.80 MXN', date: '2026-06-18' }],
  175: [{ manualId: 'man_dcam_2026_06_18', price: '$22,232.51 MXN', date: '2026-06-18' }],
  176: [{ manualId: 'man_dcam_2026_06_18', price: '$24,924.34 MXN', date: '2026-06-18' }],
  177: [{ manualId: 'man_otca_armas_2026_06_18', price: '$24,924.34 MXN', date: '2026-06-18', qty: 6 }, { manualId: 'man_dcam_2026_06_18', price: '$24,924.34 MXN', date: '2026-06-18' }],
  178: [{ manualId: 'man_dcam_2026_06_18', price: '$16,330.43 MXN', date: '2026-06-18' }],
  179: [{ manualId: 'man_otca_armas_2026_06_18', price: '$9,760.66 MXN', date: '2026-06-18', qty: 3 }],
};

// ── EXISTENCIAS DE ARMAS — SUCURSAL DCAM ─────────────────────────────────────
// Mapa  armaId -> cantidad  en la sucursal DCAM, según su inventario oficial
// (inventarios/dcam-existencias-2025-10-03.pdf). Dato HISTÓRICO del PDF, no en
// tiempo real. La ficha lo muestra con ese aviso, como UNA sucursal entre varias.
//
// IMPORTANTE: las existencias son POR SUCURSAL (no hay "primaria/secundaria").
//   - DCAM  -> este mapa (solo las armas presentes en el inventario DCAM: 1-111).
//   - OTCA  -> campo  qty  dentro de cada registro OTCA de AMX_PRICE_HISTORY_SEED
//              (cada inventario lleva su propia cantidad por arma).
// Las armas exclusivas de OTCA (112-128) normalmente NO van aquí; la excepción son
// las que YA tienen stock en DCAM (p. ej. 122, 124, 125, 126, 128), que sí se listan.
window.AMX_ARMAS_EXISTENCIAS = { 2: 36, 7: 35, 8: 44, 9: 55, 10: 44, 11: 21, 13: 22, 15: 2, 18: 37, 19: 14, 20: 18, 21: 17, 23: 7, 24: 16, 25: 16, 26: 8, 27: 16, 29: 13, 30: 1, 31: 14, 33: 1, 34: 6, 36: 33, 37: 14, 38: 19, 40: 27, 41: 14, 43: 32, 44: 10, 45: 26, 46: 12, 47: 15, 48: 11, 49: 5, 54: 6, 57: 6, 58: 3, 59: 5, 67: 9, 68: 6, 69: 1, 73: 2, 74: 5, 75: 1, 76: 5, 77: 1, 79: 4, 83: 2, 85: 5, 86: 2, 87: 1, 88: 1, 89: 1, 90: 1, 93: 5, 99: 12, 100: 7, 102: 4, 103: 5, 104: 5, 111: 5, 124: 22, 125: 16, 126: 23, 128: 1, 129: 6, 130: 1, 131: 1, 132: 19, 133: 34, 134: 36, 135: 46, 136: 18, 137: 9, 138: 9, 139: 10, 140: 5, 141: 18, 142: 8, 143: 6, 144: 1, 145: 10, 146: 7, 147: 3, 148: 3, 149: 9, 150: 10, 151: 22, 152: 5, 153: 1, 154: 8, 155: 4, 156: 5, 157: 8, 158: 8, 159: 2, 160: 31, 161: 1, 162: 8, 163: 2, 164: 3, 165: 5, 166: 13, 167: 1, 168: 4, 169: 2, 170: 8, 171: 8, 174: 8, 175: 4, 176: 1, 177: 5, 178: 10 };
window.getArmaExistencias = function (armaId) {
  const m = window.AMX_ARMAS_EXISTENCIAS || {};
  const q = m[Number(armaId)];
  return (q == null) ? null : q;
};

// Existencias OTCA por arma (lee el qty del registro OTCA en el historial de precios).
// Devuelve { qty, manualId, date } o null. La sucursal DCAM usa getArmaExistencias.
window.getArmaExistenciasOTCA = function (armaId) {
  const man = (window.AMX_MANUALES_SEED || []).filter((m) => (m.autoridad || 'DCAM') === 'OTCA');
  if (!man.length) return null;
  man.sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
  const cur = man[0].id; // inventario OTCA vigente (mas reciente)
  const recs = (window.AMX_PRICE_HISTORY_SEED || {})[Number(armaId)] || [];
  for (const r of recs) {
    if (r && r.manualId === cur && r.qty != null) {
      return { qty: r.qty, manualId: r.manualId, date: r.date };
    }
  }
  return null;
};

// Sucursales (DCAM / OTCA) donde el arma ha aparecido — para filtrar el arsenal.
// Devuelve { dcam, otca } booleanos, según las autoridades de su historial de
// precios y los mapas de existencias por sucursal.
window.getArmaSucursales = function (armaId) {
  const id = Number(armaId);
  const man = window.AMX_MANUALES_SEED || [];
  const autOf = (mid) => { const m = man.find((x) => x.id === mid); return m ? (m.autoridad || 'DCAM') : null; };
  const recs = (window.AMX_PRICE_HISTORY_SEED || {})[id] || [];
  let dcam = false, otca = false;
  recs.forEach((r) => { const a = autOf(r.manualId); if (a === 'DCAM') dcam = true; else if (a === 'OTCA') otca = true; });
  if (window.getArmaExistencias && window.getArmaExistencias(id) != null) dcam = true;
  if (window.getArmaExistenciasOTCA && window.getArmaExistenciasOTCA(id)) otca = true;
  if (!dcam && !otca) dcam = true; // por defecto, atribuible al inventario principal (DCAM)
  return { dcam: dcam, otca: otca };
};
