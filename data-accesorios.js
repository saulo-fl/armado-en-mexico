// Armado en México — ACCESORIOS DCAM
// =============================================================================
// Catálogo divulgativo de accesorios de armamento de adquisición legal a través
// de la DCAM-SEDENA. NO los comercializamos (las únicas que vendemos son las 3
// armas traumáticas). Solo información con precio oficial de referencia DCAM,
// citando el PDF fuente — mismo encuadre de transparencia que las armas.
//
// ── INVENTARIOS OFICIALES (PDFs) ─────────────────────────────────────────────
// Dos inventarios publicados por la DCAM/SEDENA en gob.mx. El de 3-oct-2025 es
// el PRINCIPAL (precio actual); el de 26-sep-2025 es ANTERIOR. Los enlaces
// "Ver PDF" abren los documentos oficiales reales.
//
//   ⚠ DATOS DE CATÁLOGO: muestra realista basada en la taxonomía de accesorios
//   de la DCAM (cargadores, ópticas, fundas, etc.). Las referencias y precios se
//   conciliarán contra el contenido tabular de los PDFs (mismo flujo que
//   data-precios.js — ver CLAUDE.md). La ESTRUCTURA es la definitiva.
//
// Modelo de cada accesorio:
//   { id, nombre, marca, pais, categoria, avail, compatibilidad:[…], specs:[[k,v]…],
//     descripcion, priceExact, priceLvl, dcamRef, priceManualId, img }
//   avail: 'dcam' (civil) | 'seguridad' | 'ejercito'  (mismos colores que armas)
// =============================================================================

// ── Inventarios (PDFs oficiales gob.mx) ──────────────────────────────────────
window.ACCESORIOS_MANUALES = [
  {
    id: 'man_acc_2025_10_03',
    nombre: 'Existencias de accesorios DCAM · 3 de octubre 2025',
    autoridad: 'DCAM',
    fecha: '2025-10-03',
    url: 'inventarios/dcam-accesorios-2025-10-03.pdf',
    fileName: 'dcam-accesorios-2025-10-03.pdf',
    primary: true,
  },
  {
    id: 'man_acc_2025_09_26',
    nombre: 'Stock OTCA · 26 de septiembre 2025',
    autoridad: 'OTCA',
    fecha: '2025-09-26',
    url: 'inventarios/otca-stock-2025-09-26.pdf',
    fileName: 'otca-stock-2025-09-26.pdf',
    primary: false,
  },
];

// Autoridad emisora del inventario: DCAM (nacional) u OTCA (Monterrey, catálogo propio)
window.AUTORIDADES = {
  DCAM: { sigla: 'DCAM', nombre: 'Dirección de Comercialización de Armamento y Municiones', color: '#F5C518' },
  OTCA: { sigla: 'OTCA', nombre: 'Organismo de Comercialización de Armamento (Monterrey)', color: '#4FAE5C' },
};
window.manualAutoridad = function (m) {
  if (!m) return null;
  const sig = m.autoridad || (/(^|\b)OTCA\b/i.test(m.nombre || '') ? 'OTCA' : 'DCAM');
  return window.AUTORIDADES[sig] || window.AUTORIDADES.DCAM;
};

// ── Taxonomía de categorías (derivada del inventario DCAM) ───────────────────
window.ACCESORIO_CATEGORIES = {
  categoria: [
    { id: 'cargadores',      label: 'Cargadores',                 icon: '◫' },
    { id: 'opticas',         label: 'Miras y ópticas',            icon: '◎' },
    { id: 'fundas',          label: 'Fundas y pistoleras',        icon: '▭' },
    { id: 'limpieza',        label: 'Limpieza y mantenimiento',   icon: '⌗' },
    { id: 'bipodes',         label: 'Bípodes y monopies',         icon: '⋀' },
    { id: 'estuches',        label: 'Estuches y maletas',         icon: '▣' },
    { id: 'refacciones',     label: 'Refacciones y repuestos',    icon: '◈' },
    { id: 'portacargadores', label: 'Portacargadores y cananas',  icon: '☰' },
    { id: 'empunaduras',     label: 'Empuñaduras y culatas',      icon: '⊓' },
    { id: 'linternas',       label: 'Linternas y láser',          icon: '✸' },
  ],
  disponibilidad: [
    { id: 'dcam',      label: 'Uso civil',           desc: 'Adquisición directa para civiles en DCAM con registro SEDENA.', color: '#4FAE5C' },
    { id: 'seguridad', label: 'Policía / Seguridad', desc: 'Restringido a corporaciones de seguridad pública o privada con licencia colectiva.', color: '#F5C518' },
    { id: 'ejercito',  label: 'Exclusivo Ejército',  desc: 'Uso exclusivo de las Fuerzas Armadas de México.', color: '#C0392B' },
  ],
};

// ── Placeholder visual por categoría (SVG, mismo lenguaje táctico) ───────────
window.accesorioPlaceholder = function (acc) {
  const glyph = (window.ACCESORIO_CATEGORIES.categoria.find(c => c.id === acc.categoria) || {}).icon || '◆';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240">` +
    `<rect width="320" height="240" fill="#1A1A1A"/>` +
    `<g fill="none" stroke="#F5C518" stroke-opacity="0.16" stroke-width="1">` +
    `<line x1="160" y1="40" x2="160" y2="200"/><line x1="60" y1="120" x2="260" y2="120"/>` +
    `<circle cx="160" cy="120" r="58"/></g>` +
    `<text x="160" y="138" font-family="monospace" font-size="64" fill="#F5C518" fill-opacity="0.85" text-anchor="middle">${glyph}</text>` +
    `<text x="160" y="206" font-family="monospace" font-size="13" letter-spacing="2" fill="#7A7A7A" text-anchor="middle">DCAM</text>` +
    `</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
};

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
  amx(101, 'Cargador .22 LR · Nordic Components', 'Nordic Components', 'EUA', 'cargadores', 'dcam', 665.4,
    'CARGADOR 22 LR NORDIC COMPONENTS',
    ['Rifle .22 LR'],
    [['Calibre', '.22 LR'], ['Tipo', 'Fuego anular']],
    'Cargador de repuesto para rifle de fuego anular .22 LR, el calibre de iniciación y entrenamiento más común.'),
  amx(102, 'Cargador .22 LR · Mossberg', 'Mossberg', 'EUA', 'cargadores', 'dcam', 332.7,
    'CARGADOR CAL.22 LR MOSSBERG',
    ['Rifle Mossberg .22 LR'],
    [['Calibre', '.22 LR'], ['Marca', 'Mossberg']],
    'Cargador de fábrica para rifle Mossberg en .22 LR. Económico y de adquisición civil directa en la DCAM.'),
  amx(103, 'Cargador 5.56x45 · CZ 805', 'Česká Zbrojovka', 'Rep. Checa', 'cargadores', 'seguridad', 138.62,
    'CARG. P/RIFLE 5.56X45 CESKA CZ805',
    ['Rifle CZ 805 Bren', '5.56x45'],
    [['Calibre', '5.56x45 OTAN'], ['Plataforma', 'CZ 805 Bren']],
    'Cargador para fusil CZ 805 Bren en 5.56. Plataforma restringida a corporaciones de seguridad con licencia colectiva.'),
  amx(104, 'Cargador · Benelli MR1 (5 cart.)', 'Benelli', 'Italia', 'cargadores', 'seguridad', 841.81,
    'CARG. P/RIFLE BENELLI MR1 CAP 5 CART',
    ['Rifle Benelli MR1', '5.56 / .223'],
    [['Capacidad', '5 cartuchos'], ['Plataforma', 'Benelli MR1']],
    'Cargador de 5 cartuchos para el rifle semiautomático Benelli MR1.'),
  amx(105, 'Cargador .380 ACP · Grand Power', 'Grand Power', 'Eslovaquia', 'cargadores', 'dcam', 362.63,
    'CARGADOR P/PIST. 0.380 GRAND POWER',
    ['Pistola Grand Power .380'],
    [['Calibre', '.380 ACP'], ['Marca', 'Grand Power']],
    'Cargador para pistola Grand Power en .380 ACP, calibre de libre adquisición civil para defensa de domicilio.'),
  amx(106, 'Cargador · IWI Jericho', 'IWI', 'Israel', 'cargadores', 'dcam', 554.5,
    'CARGADOR PPISTOLA IWI M JERICHO II',
    ['Pistola IWI Jericho'],
    [['Plataforma', 'IWI Jericho']],
    'Cargador de repuesto para pistola IWI Jericho.'),
  amx(107, 'Cargador 9mm · IWI Masada', 'IWI', 'Israel', 'cargadores', 'dcam', 554.5,
    'CARGADOR PPISTOLA IWI M MASADA 9mm',
    ['Pistola IWI Masada 9mm'],
    [['Calibre', '9mm Parabellum'], ['Plataforma', 'IWI Masada']],
    'Cargador para pistola IWI Masada en 9mm.'),
  amx(108, 'Cargador 9mm · Springfield XD-M', 'Springfield Armory', 'EUA', 'cargadores', 'dcam', 554.5,
    'CARGADOR SPRINGFIELD CAL. 9 mm XD-M',
    ['Pistola Springfield XD-M 9mm'],
    [['Calibre', '9mm Parabellum'], ['Plataforma', 'XD-M']],
    'Cargador de fábrica para pistola Springfield XD-M en 9mm.'),
  amx(109, 'Cargador 9mm · Springfield', 'Springfield Armory', 'EUA', 'cargadores', 'dcam', 723.95,
    'CARGADOR SPRINGFIELD CAL. 9 mm',
    ['Pistola Springfield 9mm'],
    [['Calibre', '9mm Parabellum'], ['Marca', 'Springfield']],
    'Cargador para pistola Springfield en 9mm.'),
  amx(110, 'Cargador 9mm · SIG Sauer P320 (17)', 'SIG Sauer', 'EUA', 'cargadores', 'dcam', 621.04,
    'CARGADOR CAL.9 mm SIG SAUER P320 17',
    ['Pistola SIG Sauer P320'],
    [['Calibre', '9mm Parabellum'], ['Capacidad', '17 cartuchos'], ['Plataforma', 'P320']],
    'Cargador de 17 cartuchos para pistola SIG Sauer P320 en 9mm.'),
  amx(111, 'Cargador .22 LR · Tippmann (25)', 'Tippmann Arms', 'EUA', 'cargadores', 'dcam', 1053.55,
    'CARGADOR TIPPMANN 0.22" L.R. 25 CART.',
    ['Rifle Tippmann .22 LR'],
    [['Calibre', '.22 LR'], ['Capacidad', '25 cartuchos']],
    'Cargador de alta capacidad (25 cartuchos) para carabina Tippmann en .22 LR.'),
  amx(112, 'Cargador .380 ACP · Browning 1911', 'Browning', 'Bélgica', 'cargadores', 'dcam', 693.12,
    'CARGADOR P/PIST. 380 BROWNING 1911-',
    ['Pistola Browning 1911-380', '.380 ACP'],
    [['Calibre', '.380 ACP'], ['Plataforma', '1911-380']],
    'Cargador para la pistola Browning 1911 en versión .380 ACP.'),
  amx(113, 'Cargador .380 ACP · Česká CZ', 'Česká Zbrojovka', 'Rep. Checa', 'cargadores', 'dcam', 543.41,
    'CARGADOR CAL..380,CESKA  MOD.CZ',
    ['Pistola CZ .380'],
    [['Calibre', '.380 ACP'], ['Marca', 'Česká Zbrojovka']],
    'Cargador para pistola CZ en .380 ACP.'),
  amx(114, 'Cargador 9mm · AMSAC', 'AMSAC', 'México', 'cargadores', 'dcam', 368.86,
    'CARGADOR P/PISTOLA 9 MM, AMSAC',
    ['Pistola 9mm'],
    [['Calibre', '9mm Parabellum'], ['Origen', 'México']],
    'Cargador para pistola en 9mm, fabricación nacional (AMSAC).'),
  amx(115, 'Cargador 5.56 · polímero', '—', '', 'cargadores', 'seguridad', 546.2,
    'CARGADOR P/FUSIL 5.56 POLIMERO',
    ['Fusil 5.56'],
    [['Calibre', '5.56x45'], ['Material', 'Polímero']],
    'Cargador de polímero para fusil en 5.56. Plataforma restringida a corporaciones de seguridad.'),
  amx(116, 'Sistema C-MAG · HK G36', 'Beta Company', 'EUA', 'cargadores', 'ejercito', 9426.46,
    'SISTEMA C-MAG P/HK G36 MOD. MHGP06',
    ['Fusil HK G36', '5.56'],
    [['Tipo', 'Tambor (C-MAG)'], ['Plataforma', 'HK G36'], ['Calibre', '5.56x45']],
    'Cargador de tambor C-MAG para fusil HK G36. Uso exclusivo de las Fuerzas Armadas.'),
  amx(117, 'Sistema C-MAG · Colt AR15 / M4 / M16', 'Beta Company', 'EUA', 'cargadores', 'seguridad', 6931.22,
    'SISTEMA C-MAG P/COLT AR15/M4M16',
    ['AR-15 / M4 / M16', '5.56'],
    [['Tipo', 'Tambor (C-MAG)'], ['Plataforma', 'AR-15 / M4 / M16'], ['Calibre', '5.56x45']],
    'Cargador de tambor C-MAG para plataformas AR-15/M4/M16. Restringido a corporaciones de seguridad.'),
  // ── opticas ──
  amx(201, 'Mira réflex · Meprolight MEPRO MOR', 'Meprolight', 'Israel', 'opticas', 'seguridad', 29111.11,
    'MIRA REFLEX MEPROLIGHT MEPRO MOR',
    ['Carabina', 'Riel Picatinny'],
    [['Tipo', 'Réflex multi-retícula'], ['Modelo', 'MEPRO MOR'], ['Montura', 'Picatinny']],
    'Mira réflex táctica Meprolight MEPRO MOR con retícula tritio/fibra/punto rojo. Restringida a corporaciones de seguridad.'),
  amx(202, 'Mira réflex · Meprolight MEPRO GLS', 'Meprolight', 'Israel', 'opticas', 'seguridad', 24675.13,
    'MIRA REFLEX MEPROLIGHT MEPRO GLS',
    ['Pistola', 'Carabina'],
    [['Tipo', 'Réflex punto rojo'], ['Modelo', 'MEPRO GLS']],
    'Mira réflex de punto rojo Meprolight MEPRO GLS para adquisición rápida de blanco.'),
  // ── empunaduras ──
  amx(301, 'Culata TSK · Beretta DT11', 'TSK', 'Italia', 'empunaduras', 'dcam', 6475.47,
    'CULATA TSK PARA DT11 CODIGO E02352',
    ['Escopeta Beretta DT11', 'Tiro deportivo'],
    [['Tipo', 'Culata de competencia'], ['Plataforma', 'Beretta DT11'], ['Código', 'E02352']],
    'Culata de competencia TSK para escopeta Beretta DT11 de tiro deportivo (plato).'),
  // ── refacciones ──
  amx(401, 'Cañón · escopeta de bomba Mod. 500', 'Mossberg', 'EUA', 'refacciones', 'dcam', 5045.93,
    'CAÑON ESCOPETA BOMBA MOD500',
    ['Escopeta Mossberg 500', 'Calibre 12'],
    [['Tipo', 'Cañón de repuesto'], ['Plataforma', 'Mossberg 500'], ['Calibre', '12']],
    'Cañón de repuesto para escopeta de acción de bomba Mossberg 500, calibre 12.'),
  amx(402, 'Clips luna · revólver Rhino .38', 'Chiappa', 'Italia', 'refacciones', 'dcam', 809.43,
    'CLIPS P/REVOLVER RHINO 0.38" CHIAPPA',
    ['Revólver Chiappa Rhino .38'],
    [['Tipo', 'Moon clips'], ['Calibre', '.38'], ['Plataforma', 'Chiappa Rhino']],
    'Juego de moon clips para recarga rápida del revólver Chiappa Rhino en .38.'),

  // ── OTCA (Monterrey · 26-sep) ──
  { ...amx(118, 'Cargador .380 ACP · Taurus TH380', 'Taurus', 'Brasil', 'cargadores', 'dcam', 580.17,
    'CARGADOR CALIBRE 0.380" MARCA TAURUS PARA PISTOLA MODELO TH380', ['Pistola Taurus TH380', '.380 ACP'], [['Calibre', '.380 ACP'], ['Plataforma', 'Taurus TH380']],
    'Cargador para pistola Taurus TH380 en .380 ACP. Inventario OTCA (Monterrey).'), priceManualId: 'man_acc_2025_09_26' },
  { ...amx(119, 'Cargador .22 LR · CZ P-09', 'Česká Zbrojovka', 'Rep. Checa', 'cargadores', 'dcam', 233.13,
    'CARGADOR P/ PISTOLA CAL. 0.22" L.R. MARCA CESKA ZBROJOVKA MOD. CZ P-09', ['Pistola CZ P-09 .22', '.22 LR'], [['Calibre', '.22 LR'], ['Plataforma', 'CZ P-09 Kadet']],
    'Cargador para pistola CZ P-09 en conversión .22 LR. Inventario OTCA (Monterrey).'), priceManualId: 'man_acc_2025_09_26' },
];

// ── COMPATIBILIDAD ESTRUCTURADA (derivada de la compatibilidad declarada) ────
// Permite cruzar accesorios ↔ armas del inventario SIN inventar nada: cada
// accesorio declara los tipos y/o calibres de arma con los que es compatible.
// Semántica de coincidencia: si declara calibres Y tipos, deben cumplirse ambos;
// si declara solo uno, basta ese; 'universal' aplica a todas las armas.
const ACC_COMPAT = {
  101: { tipos: ['rifle','carabina'], calibres: ['.22 LR'] },
  102: { tipos: ['rifle','carabina'], calibres: ['.22 LR'] },
  103: { tipos: ['carabina','rifle'], calibres: ['5.56x45mm'] },
  104: { tipos: ['rifle','carabina'], calibres: ['5.56x45mm'] },
  105: { tipos: ['pistola'], calibres: ['.380 ACP'] },
  106: { tipos: ['pistola'], calibres: ['9mm Parabellum'] },
  107: { tipos: ['pistola'], calibres: ['9mm Parabellum'] },
  108: { tipos: ['pistola'], calibres: ['9mm Parabellum'] },
  109: { tipos: ['pistola'], calibres: ['9mm Parabellum'] },
  110: { tipos: ['pistola'], calibres: ['9mm Parabellum'] },
  111: { tipos: ['carabina','rifle'], calibres: ['.22 LR'] },
  112: { tipos: ['pistola'], calibres: ['.380 ACP'] },
  113: { tipos: ['pistola'], calibres: ['.380 ACP'] },
  114: { tipos: ['pistola'], calibres: ['9mm Parabellum'] },
  115: { tipos: ['carabina','rifle'], calibres: ['5.56x45mm'] },
  116: { tipos: ['carabina','rifle'], calibres: ['5.56x45mm'] },
  117: { tipos: ['carabina','rifle'], calibres: ['5.56x45mm'] },
  201: { tipos: ['carabina','rifle','escopeta'] },
  202: { tipos: ['pistola','carabina'] },
  301: { tipos: ['escopeta'] },
  401: { tipos: ['escopeta'], calibres: ['12 GA'] },
  402: { tipos: ['revolver'], calibres: ['.38 Special'] },
  118: { tipos: ['pistola'], calibres: ['.380 ACP'] },
  119: { tipos: ['pistola'], calibres: ['.22 LR'] },
};
window.ACCESORIOS.forEach(a => { a.compat = ACC_COMPAT[a.id] || {}; });

// ¿el accesorio es compatible con esta arma? (determinista, sin invención)
window.accesorioFitsArma = function (acc, arma) {
  if (!acc || !arma) return false;
  const c = acc.compat || {};
  if (c.universal) return true;
  const hasCal = c.calibres && c.calibres.length;
  const hasTipo = c.tipos && c.tipos.length;
  const calOk = hasCal ? c.calibres.includes(arma.calibre) : null;
  const tipoOk = hasTipo ? c.tipos.includes(arma.tipo) : null;
  if (hasCal && hasTipo) return calOk && tipoOk;
  if (hasCal) return calOk;
  if (hasTipo) return tipoOk;
  return false;
};
window.getAccesoriosCompatibles = function (arma) {
  return (window.ACCESORIOS || []).filter(a => window.accesorioFitsArma(a, arma));
};
window.getArmasCompatibles = function (acc) {
  return (window.DB || []).filter(arma => window.accesorioFitsArma(acc, arma));
};

// ¿la fuente es una imagen real (no placeholder)? — para mostrar "sin imagen"
window.isRealImage = function (src) {
  return typeof src === 'string' && src.trim() !== '' && !src.startsWith('data:image/svg');
};

// ── Historial de precios por accesorio (cronológico; el último = actual) ─────
// accesorioId -> [{ manualId, price, date, qty }]
// qty = existencias marcadas en ESE inventario (dato histórico, no en tiempo real).
// Los que aparecen en ambos inventarios traen 2 registros (sep → oct).
const _h = (mid, price, date, qty) => ({ manualId: mid, price: _accFmt(price), date, qty: (qty == null ? null : qty) });
const SEP = 'man_acc_2025_09_26', OCT = 'man_acc_2025_10_03';
const SEPd = '2025-09-26', OCTd = '2025-10-03';

window.ACCESORIOS_PRICE_HISTORY = {
  101: [_h(OCT, 665.4, OCTd, 18)],
  102: [_h(OCT, 332.7, OCTd, 46)],
  103: [_h(OCT, 138.62, OCTd, 20)],
  104: [_h(OCT, 841.81, OCTd, 39)],
  105: [_h(OCT, 362.63, OCTd, 8)],
  106: [_h(SEP, 555.08, SEPd, 18), _h(OCT, 554.5, OCTd, 5)],
  107: [_h(SEP, 555.08, SEPd, 17), _h(OCT, 554.5, OCTd, 51)],
  108: [_h(OCT, 554.5, OCTd, 37)],
  109: [_h(OCT, 723.95, OCTd, 8)],
  110: [_h(OCT, 621.04, OCTd, 5)],
  111: [_h(SEP, 1054.65, SEPd, 8), _h(OCT, 1053.55, OCTd, 40)],
  112: [_h(SEP, 701.44, SEPd, 5), _h(OCT, 693.12, OCTd, 42)],
  113: [_h(SEP, 666.1, SEPd, 35), _h(OCT, 543.41, OCTd, 70)],
  114: [_h(OCT, 368.86, OCTd, 36)],
  115: [_h(OCT, 546.2, OCTd, 18)],
  116: [_h(OCT, 9426.46, OCTd, 5)],
  117: [_h(OCT, 6931.22, OCTd, 2)],
  201: [_h(OCT, 29111.11, OCTd, 11)],
  202: [_h(OCT, 24675.13, OCTd, 5)],
  301: [_h(OCT, 6475.47, OCTd, 1)],
  401: [_h(OCT, 5045.93, OCTd, 10)],
  402: [_h(OCT, 809.43, OCTd, 5)],
  // Datos reales del inventario DCAM 3-oct-2025 (EXIST_ACCESORIOS). OTCA 26-sep pendiente de conciliar.
  118: [_h(SEP, 580.17, SEPd, 9)],
  119: [_h(SEP, 233.13, SEPd, 10)],
};

// ── Helpers (auto-contenidos; no tocan el store de armas) ────────────────────
window.getAccesorioById = function (id) {
  if (id == null) return null;
  const nid = Number(id);
  return (window.ACCESORIOS || []).find(a => a.id === nid) || null;
};
window.getAccesorioManual = function (mid) {
  if (!mid) return null;
  return (window.ACCESORIOS_MANUALES || []).find(m => m.id === mid) || null;
};
window.getAccesorioPrimaryManual = function () {
  const arr = (window.ACCESORIOS_MANUALES || []).slice()
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  return arr.find(m => m.primary) || arr[0] || null;
};
// Historial efectivo: el sembrado, o auto-atribución del precio actual al inventario principal
window.getAccesorioPriceHistory = function (id) {
  const seeded = (window.ACCESORIOS_PRICE_HISTORY || {})[Number(id)];
  if (seeded && seeded.length) {
    return seeded.slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }
  const acc = window.getAccesorioById(id);
  const primary = window.getAccesorioPrimaryManual();
  if (acc && primary && acc.priceExact && /\d/.test(acc.priceExact)) {
    return [{ manualId: primary.id, price: acc.priceExact, date: primary.fecha }];
  }
  return [];
};

// Existencias según el último inventario (qty del registro más reciente) — o null
window.getAccesorioExistencias = function (id) {
  const h = window.getAccesorioPriceHistory(id);
  if (!h.length) return null;
  const last = h[h.length - 1];
  return (last && last.qty != null) ? { qty: last.qty, date: last.date, manualId: last.manualId } : null;
};

// Los accesorios no traen foto todavía: se muestran con un aviso discreto
// "sin imagen disponible por el momento" hasta cargar fotografías reales.
window.ACCESORIOS.forEach(a => { if (!window.isRealImage(a.img)) a.img = ''; });
