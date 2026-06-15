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
    fecha: '2025-10-03',
    url: 'inventarios/dcam-existencias-2025-10-03.pdf',
    fileName: 'dcam-existencias-2025-10-03.pdf',
    addedAt: '2025-10-03T12:00:00.000Z',
    primary: true,
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
window.AMX_PRICE_HISTORY_SEED = {};
