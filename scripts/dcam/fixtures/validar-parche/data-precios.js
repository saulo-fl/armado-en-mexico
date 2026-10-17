// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.
//
// LOS DATOS de este fichero —la selección, la estructura y los textos
// divulgativos— se ofrecen ADEMÁS bajo CC BY-SA 4.0; los hechos que contiene
// no son de nadie (art. 14 fr. X LFDA). Detalle: LICENCIA-CONTENIDO.md.


window.AMX_MANUALES_SEED = [
  {
    id: 'man_dcam_2026_10_15',
    nombre: 'Existencias de armas DCAM · 15 de octubre 2026',
    autoridad: 'DCAM',
    fecha: '2026-10-15',
    url: 'inventarios/dcam-existencias-2026-10-15.pdf',
    fileName: 'dcam-existencias-2026-10-15.pdf',
    addedAt: '2026-10-15T12:00:00.000Z',
    primary: true,
  },
  {
    id: 'man_dcam_2026_10_14',
    nombre: 'Existencias de armas DCAM · 14 de octubre 2026',
    autoridad: 'DCAM',
    fecha: '2026-10-14',
    url: 'inventarios/dcam-existencias-2026-10-14.pdf',
    fileName: 'dcam-existencias-2026-10-14.pdf',
    addedAt: '2026-10-14T12:00:00.000Z',
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
  1: [{ manualId: 'man_dcam_2025_10_03', price: '$8,733.33 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$10,061.26 MXN', date: '2026-06-16' }, { manualId: 'man_dcam_2026_07_06', price: '$10,222.12 MXN', date: '2026-07-06' }, { manualId: 'man_dcam_2026_09_11', price: '$9,927.55 MXN', date: '2026-09-11' }, { manualId: 'man_dcam_2026_09_14', price: '$9,926.67 MXN', date: '2026-09-14' }, { manualId: 'man_dcam_2026_09_15', price: '$10,018.51 MXN', date: '2026-09-15' }, { manualId: 'man_dcam_2026_09_18', price: '$10,053.31 MXN', date: '2026-09-18' }, { manualId: 'man_dcam_2026_09_22', price: '$10,072.67 MXN', date: '2026-09-22' }, { manualId: 'man_dcam_2026_09_25', price: '$10,319.63 MXN', date: '2026-09-25' } , { manualId: 'man_dcam_2026_09_29', price: '$10,435.91 MXN', date: '2026-09-29' }, { manualId: 'man_dcam_2026_10_01', price: '$10,569.22 MXN', date: '2026-10-01' }, { manualId: 'man_dcam_2026_10_02', price: '$10,744.46 MXN', date: '2026-10-02' }, { manualId: 'man_dcam_2026_10_05', price: '$10,640.05 MXN', date: '2026-10-05' }, { manualId: 'man_dcam_2026_10_06', price: '$10,607.30 MXN', date: '2026-10-06' }, { manualId: 'man_dcam_2026_10_07', price: '$10,509.44 MXN', date: '2026-10-07' }, { manualId: 'man_dcam_2026_10_09', price: '$10,594.72 MXN', date: '2026-10-09' }, { manualId: 'man_dcam_2026_10_13', price: '$10,677.43 MXN', date: '2026-10-13' }, { manualId: 'man_dcam_2026_10_14', price: '$10,735.10 MXN', date: '2026-10-14' }, { manualId: 'man_dcam_2026_10_15', price: '$10,814.65 MXN', date: '2026-10-15' }],
  2: [{ manualId: 'man_otca_armas_2025_09_26', price: '$10,953.46 MXN', date: '2025-09-26', qty: 6 }, { manualId: 'man_dcam_2025_10_03', price: '$10,979.05 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$9,876.70 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$9,870.04 MXN', date: '2026-06-18', qty: 18 }, { manualId: 'man_dcam_2026_06_18', price: '$9,870.04 MXN', date: '2026-06-18' }, { manualId: 'man_dcam_2026_07_06', price: '$10,034.60 MXN', date: '2026-07-06' }, { manualId: 'man_dcam_2026_09_11', price: '$9,745.44 MXN', date: '2026-09-11' }, { manualId: 'man_dcam_2026_09_14', price: '$9,744.58 MXN', date: '2026-09-14' }, { manualId: 'man_dcam_2026_09_15', price: '$9,834.73 MXN', date: '2026-09-15' }, { manualId: 'man_dcam_2026_09_18', price: '$9,868.89 MXN', date: '2026-09-18' }, { manualId: 'man_dcam_2026_09_22', price: '$9,887.90 MXN', date: '2026-09-22' }, { manualId: 'man_dcam_2026_09_25', price: '$10,130.32 MXN', date: '2026-09-25' } , { manualId: 'man_dcam_2026_09_29', price: '$10,244.47 MXN', date: '2026-09-29' }, { manualId: 'man_dcam_2026_10_01', price: '$10,375.33 MXN', date: '2026-10-01' }, { manualId: 'man_dcam_2026_10_02', price: '$10,547.36 MXN', date: '2026-10-02' }, { manualId: 'man_dcam_2026_10_05', price: '$10,444.87 MXN', date: '2026-10-05' }, { manualId: 'man_dcam_2026_10_06', price: '$10,412.72 MXN', date: '2026-10-06' }, { manualId: 'man_dcam_2026_10_07', price: '$10,316.65 MXN', date: '2026-10-07' }, { manualId: 'man_dcam_2026_10_09', price: '$10,400.37 MXN', date: '2026-10-09' }, { manualId: 'man_dcam_2026_10_13', price: '$10,481.56 MXN', date: '2026-10-13' }, { manualId: 'man_dcam_2026_10_14', price: '$10,538.18 MXN', date: '2026-10-14' }, { manualId: 'man_dcam_2026_10_15', price: '$10,616.27 MXN', date: '2026-10-15' }],
  3: [{ manualId: 'man_dcam_2025_10_03', price: '$17,364.42 MXN', date: '2025-10-03' }, { manualId: 'man_otca_armas_2026_06_18', price: '$15,610.41 MXN', date: '2026-06-18', qty: 10 }, { manualId: 'man_dcam_2026_07_06', price: '$15,870.69 MXN', date: '2026-07-06' }, { manualId: 'man_dcam_2026_09_11', price: '$15,413.34 MXN', date: '2026-09-11' }, { manualId: 'man_dcam_2026_09_14', price: '$15,411.98 MXN', date: '2026-09-14' }, { manualId: 'man_dcam_2026_09_15', price: '$15,554.56 MXN', date: '2026-09-15' }, { manualId: 'man_dcam_2026_09_18', price: '$15,608.60 MXN', date: '2026-09-18' }, { manualId: 'man_dcam_2026_09_22', price: '$15,638.66 MXN', date: '2026-09-22' }, { manualId: 'man_dcam_2026_10_02', price: '$16,681.67 MXN', date: '2026-10-02' }, { manualId: 'man_dcam_2026_10_05', price: '$16,519.56 MXN', date: '2026-10-05' }, { manualId: 'man_dcam_2026_10_06', price: '$16,468.71 MXN', date: '2026-10-06' }, { manualId: 'man_dcam_2026_10_07', price: '$16,316.77 MXN', date: '2026-10-07' }, { manualId: 'man_dcam_2026_10_09', price: '$16,449.18 MXN', date: '2026-10-09' }, { manualId: 'man_dcam_2026_10_13', price: '$16,577.60 MXN', date: '2026-10-13' }, { manualId: 'man_dcam_2026_10_14', price: '$16,667.14 MXN', date: '2026-10-14' }, { manualId: 'man_dcam_2026_10_15', price: '$16,790.65 MXN', date: '2026-10-15' }],
  4: [{ manualId: 'man_dcam_2025_10_03', price: '$9,936.59 MXN', date: '2025-10-03' }],
  5: [{ manualId: 'man_otca_armas_2025_09_26', price: '$10,144.65 MXN', date: '2025-09-26', qty: 4 }, { manualId: 'man_dcam_2025_10_03', price: '$10,133.99 MXN', date: '2025-10-03' }, { manualId: 'man_otca_armas_2026_06_18', price: '$9,110.35 MXN', date: '2026-06-18', qty: 3 }],
  6: [{ manualId: 'man_otca_armas_2025_09_26', price: '$14,891.47 MXN', date: '2025-09-26', qty: 1 }, { manualId: 'man_dcam_2025_10_03', price: '$14,875.83 MXN', date: '2025-10-03' }],
  7: [{ manualId: 'man_otca_armas_2025_09_26', price: '$15,903.05 MXN', date: '2025-09-26', qty: 18 }, { manualId: 'man_dcam_2025_10_03', price: '$15,886.35 MXN', date: '2025-10-03' }, { manualId: 'man_dcam_2026_06_16', price: '$11,408.09 MXN', date: '2026-06-16' }, { manualId: 'man_otca_armas_2026_06_18', price: '$11,400.39 MXN', date: '2026-06-18', qty: 7 }, { manualId: 'man_dcam_2026_06_18', price: '$11,400.39 MXN', date: '2026-06-18' }, { manualId: 'man_dcam_2026_07_06', price: '$11,590.47 MXN', date: '2026-07-06' }, { manualId: 'man_dcam_2026_09_11', price: '$11,256.47 MXN', date: '2026-09-11' }, { manualId: 'man_dcam_2026_09_14', price: '$11,255.48 MXN', date: '2026-09-14' }, { manualId: 'man_dcam_2026_09_15', price: '$11,359.60 MXN', date: '2026-09-15' }, { manualId: 'man_dcam_2026_09_18', price: '$11,399.07 MXN', date: '2026-09-18' }, { manualId: 'man_dcam_2026_09_22', price: '$11,421.02 MXN', date: '2026-09-22' }, { manualId: 'man_dcam_2026_09_25', price: '$11,701.04 MXN', date: '2026-09-25' } , { manualId: 'man_dcam_2026_09_29', price: '$11,832.89 MXN', date: '2026-09-29' }, { manualId: 'man_dcam_2026_10_01', price: '$11,984.04 MXN', date: '2026-10-01' }, { manualId: 'man_dcam_2026_10_02', price: '$12,182.74 MXN', date: '2026-10-02' }, { manualId: 'man_dcam_2026_10_05', price: '$12,064.35 MXN', date: '2026-10-05' }, { manualId: 'man_dcam_2026_10_06', price: '$12,027.21 MXN', date: '2026-10-06' }, { manualId: 'man_dcam_2026_10_07', price: '$11,916.25 MXN', date: '2026-10-07' }, { manualId: 'man_dcam_2026_10_09', price: '$12,012.95 MXN', date: '2026-10-09' }, { manualId: 'man_dcam_2026_10_13', price: '$12,106.73 MXN', date: '2026-10-13' }, { manualId: 'man_dcam_2026_10_14', price: '$12,172.13 MXN', date: '2026-10-14' }, { manualId: 'man_dcam_2026_10_15', price: '$12,262.33 MXN', date: '2026-10-15' }],
};
