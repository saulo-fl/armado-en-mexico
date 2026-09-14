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
    id: 'man_acc_2026_09_11',
    nombre: 'Existencias de accesorios DCAM · 11 de septiembre 2026',
    autoridad: 'DCAM',
    fecha: '2026-09-11',
    url: 'inventarios/dcam-accesorios-2026-09-11.pdf',
    fileName: 'dcam-accesorios-2026-09-11.pdf',
    primary: true,
  },
  {
    id: 'man_acc_2026_07_06',
    nombre: 'Existencias de accesorios DCAM · 6 de julio 2026',
    autoridad: 'DCAM',
    fecha: '2026-07-06',
    url: 'inventarios/dcam-existencias-2026-07-06.pdf',
    fileName: 'dcam-existencias-2026-07-06.pdf',
    primary: false,
  },
  {
    id: 'man_acc_2026_06_18',
    nombre: 'Existencias de accesorios OTCA · 18 de junio 2026',
    autoridad: 'OTCA',
    fecha: '2026-06-18',
    url: 'inventarios/otca-stock-2026-06-18.pdf',
    fileName: 'otca-stock-2026-06-18.pdf',
    primary: false,
  },
  {
    id: 'man_acc_2026_06_16',
    nombre: 'Existencias de accesorios DCAM · 16 de junio 2026',
    autoridad: 'DCAM',
    fecha: '2026-06-16',
    url: 'inventarios/dcam-existencias-2026-06-16.pdf',
    fileName: 'dcam-existencias-2026-06-16.pdf',
    primary: false,
  },
  {
    id: 'man_acc_2025_10_03',
    nombre: 'Existencias de accesorios DCAM · 3 de octubre 2025',
    autoridad: 'DCAM',
    fecha: '2025-10-03',
    url: 'inventarios/dcam-accesorios-2025-10-03.pdf',
    fileName: 'dcam-accesorios-2025-10-03.pdf',
    primary: false,
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
    { id: 'dcam',      label: 'Uso civil',           desc: 'Adquisición directa para civiles en DCAM con registro SEDENA.', color: '#2F6B33' },
    { id: 'seguridad', label: 'Policía / Seguridad', desc: 'Restringido a corporaciones de seguridad pública o privada con licencia colectiva.', color: '#7D6108' },
    { id: 'ejercito',  label: 'Exclusivo Ejército',  desc: 'Uso exclusivo de las Fuerzas Armadas de México.', color: '#A3341F' },
  ],
};

// ── Imagen de respaldo por categoría ─────────────────────────────────────────
// Los 36 accesorios del catálogo están HOY sin fotografía propia, así que este
// respaldo se ve en el 100 % de las fichas y tarjetas de accesorio: no es un
// caso raro, es la vista por defecto.
//
// Antes construía aquí un SVG en `data:` URI con fondo #1A1A1A y acentos
// #F5C518: colores del TEMA OSCURO que el sitio abandonó en agosto. Sobre el
// lienzo claro era un rectángulo negro con amarillo, y en el modo oscuro nuevo
// tampoco encajaba porque su negro no es el del tema. Saulo mandó retirar los
// SVG generados el 8-sep-2026.
//
// Ahora devuelve la SILUETA de la categoría, el mismo lenguaje que usan las
// armas: negro sobre alfa, pintado como máscara, así que el color lo pone el
// CSS y sigue al tema. Las categorías sin silueta propia caen en la del
// cargador, que es la más representada (31 de los 36).
// PENDIENTE (8-sep-2026): faltan por generar `silueta-empunadura` y
// `silueta-refaccion`. Se agotó el límite de uso de Codex a mitad del lote, así
// que esas dos categorías van de momento a la silueta más cercana que SÍ existe:
// empuñaduras y fundas a la pistola —son parte de una— y refacciones, limpieza
// y bípodes al cargador. Afecta a 3 accesorios de 36 (1 empuñadura, 2
// refacciones). Cuando se generen, basta añadirlas aquí.
window.accesorioPlaceholder = function (acc) {
  const POR_CATEGORIA = {
    cargadores: 'cargador', portacargadores: 'cargador', estuches: 'cargador',
    opticas: 'optica', linternas: 'optica',
    empunaduras: 'pistola', fundas: 'pistola',
    refacciones: 'cargador', limpieza: 'cargador', bipodes: 'cargador',
  };
  const s = (acc && POR_CATEGORIA[acc.categoria]) || 'cargador';
  return 'imagenes/silueta-' + s + '.webp';
};

// ¿Este accesorio tiene fotografía propia? Misma señal que en las armas: si el
// `src` apunta a una silueta, no es una foto suya. Reconoce también el `data:`
// del placeholder anterior, porque D1 puede servir registros ya sembrados.
window.accesorioSinFoto = function (acc) {
  if (!acc || !acc.img) return true;
  const img = String(acc.img);
  return img.slice(0, 5) === 'data:' || img.indexOf('/silueta-') >= 0;
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
  amx(101, 'Cargador .22 LR · Nordic Components', 'Nordic Components', 'EUA', 'cargadores', 'dcam', 590.63,
    'CARGADOR 22 LR NORDIC COMPONENTS',
    ['Rifle .22 LR'],
    [['Calibre', '.22 LR'], ['Tipo', 'Fuego anular']],
    'Cargador de repuesto para rifle de fuego anular .22 LR, el calibre de iniciación y entrenamiento más común.'),
  amx(102, 'Cargador .22 LR · Mossberg', 'Mossberg', 'EUA', 'cargadores', 'dcam', 295.32,
    'CARGADOR CAL.22 LR MOSSBERG',
    ['Rifle Mossberg .22 LR'],
    [['Calibre', '.22 LR'], ['Marca', 'Mossberg']],
    'Cargador de fábrica para rifle Mossberg en .22 LR. Económico y de adquisición civil directa en la DCAM.'),
  amx(103, 'Cargador 5.56x45 · CZ 805', 'Česká Zbrojovka', 'Rep. Checa', 'cargadores', 'seguridad', 123.05,
    'CARG. P/RIFLE 5.56X45 CESKA CZ805',
    ['Rifle CZ 805 Bren', '5.56x45'],
    [['Calibre', '5.56x45 OTAN'], ['Plataforma', 'CZ 805 Bren']],
    'Cargador para fusil CZ 805 Bren en 5.56. Plataforma restringida a corporaciones de seguridad con licencia colectiva.'),
  amx(104, 'Cargador · Benelli MR1 (5 cart.)', 'Benelli', 'Italia', 'cargadores', 'seguridad', 1304.78,
    'CARG. P/RIFLE BENELLI MR1 CAP 5 CART',
    ['Rifle Benelli MR1', '5.56 / .223'],
    [['Capacidad', '5 cartuchos'], ['Plataforma', 'Benelli MR1']],
    'Cargador de 5 cartuchos para el rifle semiautomático Benelli MR1.'),
  amx(105, 'Cargador .380 ACP · Grand Power', 'Grand Power', 'Eslovaquia', 'cargadores', 'dcam', 320.50,
    'CARGADOR P/PIST. 0.380 GRAND POWER',
    ['Pistola Grand Power .380'],
    [['Calibre', '.380 ACP'], ['Marca', 'Grand Power']],
    'Cargador para pistola Grand Power en .380 ACP, calibre de libre adquisición civil para defensa de domicilio.'),
  amx(106, 'Cargador · IWI Jericho', 'IWI', 'Israel', 'cargadores', 'dcam', 492.19,
    'CARGADOR PPISTOLA IWI M JERICHO II',
    ['Pistola IWI Jericho'],
    [['Plataforma', 'IWI Jericho']],
    'Cargador de repuesto para pistola IWI Jericho.'),
  amx(107, 'Cargador 9mm · IWI Masada', 'IWI', 'Israel', 'cargadores', 'dcam', 492.19,
    'CARGADOR PPISTOLA IWI M MASADA 9mm',
    ['Pistola IWI Masada 9mm'],
    [['Calibre', '9mm Parabellum'], ['Plataforma', 'IWI Masada']],
    'Cargador para pistola IWI Masada en 9mm.'),
  amx(108, 'Cargador 9mm · Springfield XD-M', 'Springfield Armory', 'EUA', 'cargadores', 'dcam', 492.19,
    'CARGADOR SPRINGFIELD CAL. 9 mm XD-M',
    ['Pistola Springfield XD-M 9mm'],
    [['Calibre', '9mm Parabellum'], ['Plataforma', 'XD-M']],
    'Cargador de fábrica para pistola Springfield XD-M en 9mm.'),
  amx(109, 'Cargador 9mm · Springfield', 'Springfield Armory', 'EUA', 'cargadores', 'dcam', 661.68,
    'CARGADOR SPRINGFIELD CAL. 9 mm',
    ['Pistola Springfield 9mm'],
    [['Calibre', '9mm Parabellum'], ['Marca', 'Springfield']],
    'Cargador para pistola Springfield en 9mm.'),
  amx(110, 'Cargador 9mm · SIG Sauer P320 (17)', 'SIG Sauer', 'EUA', 'cargadores', 'dcam', 558.31,
    'CARGADOR CAL.9 mm SIG SAUER P320 17',
    ['Pistola SIG Sauer P320'],
    [['Calibre', '9mm Parabellum'], ['Capacidad', '17 cartuchos'], ['Plataforma', 'P320']],
    'Cargador de 17 cartuchos para pistola SIG Sauer P320 en 9mm.'),
  amx(111, 'Cargador .22 LR · Tippmann (25)', 'Tippmann Arms', 'EUA', 'cargadores', 'dcam', 935.17,
    'CARGADOR TIPPMANN 0.22" L.R. 25 CART.',
    ['Rifle Tippmann .22 LR'],
    [['Calibre', '.22 LR'], ['Capacidad', '25 cartuchos']],
    'Cargador de alta capacidad (25 cartuchos) para carabina Tippmann en .22 LR.'),
  amx(112, 'Cargador .380 ACP · Browning 1911', 'Browning', 'Bélgica', 'cargadores', 'dcam', 615.24,
    'CARGADOR P/PIST. 380 BROWNING 1911-',
    ['Pistola Browning 1911-380', '.380 ACP'],
    [['Calibre', '.380 ACP'], ['Plataforma', '1911-380']],
    'Cargador para la pistola Browning 1911 en versión .380 ACP.'),
  amx(113, 'Cargador .380 ACP · Česká CZ', 'Česká Zbrojovka', 'Rep. Checa', 'cargadores', 'dcam', 488.85,
    'CARGADOR CAL..380,CESKA  MOD.CZ',
    ['Pistola CZ .380'],
    [['Calibre', '.380 ACP'], ['Marca', 'Česká Zbrojovka']],
    'Cargador para pistola CZ en .380 ACP.'),
  amx(114, 'Cargador 9mm · AMSAC', 'AMSAC', 'México', 'cargadores', 'dcam', 368.86,
    'CARGADOR P/PISTOLA 9 MM, AMSAC',
    ['Pistola 9mm'],
    [['Calibre', '9mm Parabellum'], ['Origen', 'México']],
    'Cargador para pistola en 9mm, fabricación nacional (AMSAC).'),
  amx(115, 'Cargador 5.56 · polímero', '—', '', 'cargadores', 'seguridad', 546.20,
    'CARGADOR P/FUSIL 5.56 POLIMERO',
    ['Fusil 5.56'],
    [['Calibre', '5.56x45'], ['Material', 'Polímero']],
    'Cargador de polímero para fusil en 5.56. Plataforma restringida a corporaciones de seguridad.'),
  amx(116, 'Sistema C-MAG · HK G36', 'Beta Company', 'EUA', 'cargadores', 'ejercito', 8367.29,
    'SISTEMA C-MAG P/HK G36 MOD. MHGP06',
    ['Fusil HK G36', '5.56'],
    [['Tipo', 'Tambor (C-MAG)'], ['Plataforma', 'HK G36'], ['Calibre', '5.56x45']],
    'Cargador de tambor C-MAG para fusil HK G36. Uso exclusivo de las Fuerzas Armadas.'),
  amx(117, 'Sistema C-MAG · Colt AR15 / M4 / M16', 'Beta Company', 'EUA', 'cargadores', 'seguridad', 6152.42,
    'SISTEMA C-MAG P/COLT AR15/M4M16',
    ['AR-15 / M4 / M16', '5.56'],
    [['Tipo', 'Tambor (C-MAG)'], ['Plataforma', 'AR-15 / M4 / M16'], ['Calibre', '5.56x45']],
    'Cargador de tambor C-MAG para plataformas AR-15/M4/M16. Restringido a corporaciones de seguridad.'),
  // ── opticas ──
  amx(201, 'Mira réflex · Meprolight MEPRO MOR', 'Meprolight', 'Israel', 'opticas', 'seguridad', 25840.17,
    'MIRA REFLEX MEPROLIGHT MEPRO MOR',
    ['Carabina', 'Riel Picatinny'],
    [['Tipo', 'Réflex multi-retícula'], ['Modelo', 'MEPRO MOR'], ['Montura', 'Picatinny']],
    'Mira réflex táctica Meprolight MEPRO MOR con retícula tritio/fibra/punto rojo. Restringida a corporaciones de seguridad.'),
  amx(202, 'Mira réflex · Meprolight MEPRO GLS', 'Meprolight', 'Israel', 'opticas', 'seguridad', 21902.62,
    'MIRA REFLEX MEPROLIGHT MEPRO GLS',
    ['Pistola', 'Carabina'],
    [['Tipo', 'Réflex punto rojo'], ['Modelo', 'MEPRO GLS']],
    'Mira réflex de punto rojo Meprolight MEPRO GLS para adquisición rápida de blanco.'),
  // ── empunaduras ──
  amx(301, 'Culata TSK · Beretta DT11', 'TSK', 'Italia', 'empunaduras', 'dcam', 5723.24,
    'CULATA TSK PARA DT11 CODIGO E02352',
    ['Escopeta Beretta DT11', 'Tiro deportivo'],
    [['Tipo', 'Culata de competencia'], ['Plataforma', 'Beretta DT11'], ['Código', 'E02352']],
    'Culata de competencia TSK para escopeta Beretta DT11 de tiro deportivo (plato).'),
  // ── refacciones ──
  amx(401, 'Cañón · escopeta de bomba Mod. 500', 'Mossberg', 'EUA', 'refacciones', 'dcam', 4478.96,
    'CAÑON ESCOPETA BOMBA MOD500',
    ['Escopeta Mossberg 500', 'Calibre 12'],
    [['Tipo', 'Cañón de repuesto'], ['Plataforma', 'Mossberg 500'], ['Calibre', '12']],
    'Cañón de repuesto para escopeta de acción de bomba Mossberg 500, calibre 12.'),
  amx(402, 'Clips luna · revólver Rhino .38', 'Chiappa', 'Italia', 'refacciones', 'dcam', 715.40,
    'CLIPS P/REVOLVER RHINO 0.38" CHIAPPA',
    ['Revólver Chiappa Rhino .38'],
    [['Tipo', 'Moon clips'], ['Calibre', '.38'], ['Plataforma', 'Chiappa Rhino']],
    'Juego de moon clips para recarga rápida del revólver Chiappa Rhino en .38.'),

  // ── OTCA (Monterrey · 26-sep) ──
  { ...amx(118, 'Cargador .380 ACP · Taurus TH380', 'Taurus', 'Brasil', 'cargadores', 'dcam', 521.02,
    'CARGADOR CALIBRE 0.380" MARCA TAURUS PARA PISTOLA MODELO TH380', ['Pistola Taurus TH380', '.380 ACP'], [['Calibre', '.380 ACP'], ['Plataforma', 'Taurus TH380']],
    'Cargador para pistola Taurus TH380 en .380 ACP. Inventario OTCA (Monterrey).'), priceManualId: 'man_acc_2025_09_26' },
  { ...amx(119, 'Cargador .22 LR · CZ P-09', 'Česká Zbrojovka', 'Rep. Checa', 'cargadores', 'dcam', 206.72,
    'CARGADOR P/ PISTOLA CAL. 0.22" L.R. MARCA CESKA ZBROJOVKA MOD. CZ P-09', ['Pistola CZ P-09 .22', '.22 LR'], [['Calibre', '.22 LR'], ['Plataforma', 'CZ P-09 Kadet']],
    'Cargador para pistola CZ P-09 en conversión .22 LR. Inventario OTCA (Monterrey).'), priceManualId: 'man_acc_2025_09_26' },

  // ── NUEVOS (DCAM · 16-jun-2026) ──
  amx(120, 'Cargador 9mm · Glock 17 (17 cart.)', 'Glock', 'Austria', 'cargadores', 'dcam', 461.48,
    'CARG. PIST. 9MM GLOCK MOD. 17', ['Pistola Glock 17', '9mm'], [['Calibre', '9mm Parabellum'], ['Plataforma', 'Glock 17']],
    'Cargador de fábrica para pistola Glock 17 en 9mm.'),
  amx(121, 'Cargador 9mm · Glock 19 (17 cart.)', 'Glock', 'Austria', 'cargadores', 'dcam', 461.48,
    'CARG. PIST. 9MM GLOCK MOD. 19', ['Pistola Glock 19', '9mm'], [['Calibre', '9mm Parabellum'], ['Plataforma', 'Glock 19']],
    'Cargador de fábrica para pistola Glock 19 en 9mm.'),
  amx(122, 'Cargador .40 S&W · Glock 22 (16 cart.)', 'Glock', 'Austria', 'cargadores', 'dcam', 461.48,
    'CARG. PIST. CAL. 40 GLOCK MOD. 22', ['Pistola Glock 22', '.40 S&W'], [['Calibre', '.40 S&W'], ['Plataforma', 'Glock 22']],
    'Cargador de fábrica para pistola Glock 22 en .40 S&W.'),
  amx(123, 'Cargador 9mm · Beretta 92FS (15 cart.)', 'Beretta', 'Italia', 'cargadores', 'dcam', 570.95,
    'CARGADOR BERETTA 92FS CAL. 9MM 15 CART', ['Pistola Beretta 92FS', '9mm'], [['Calibre', '9mm Parabellum'], ['Plataforma', 'Beretta 92FS']],
    'Cargador de 15 cartuchos para pistola Beretta 92FS en 9mm.'),
  amx(124, 'Cargador .22 LR · Beretta 92FS (10 cart.)', 'Beretta', 'Italia', 'cargadores', 'dcam', 530.73,
    'CARG. P/PISTOLA BERETTA 22LR 92FS', ['Pistola Beretta 92FS .22', '.22 LR'], [['Calibre', '.22 LR'], ['Plataforma', 'Beretta 92FS .22']],
    'Cargador para pistola Beretta 92FS en versión .22 LR (entrenamiento).'),
  amx(125, 'Cargador .22 LR · Browning 1911-22', 'Browning', 'Bélgica', 'cargadores', 'dcam', 615.24,
    'CARG. SEMIA. CAL. .22 L.R. BROWNING 1911-22', ['Pistola Browning 1911-22', '.22 LR'], [['Calibre', '.22 LR'], ['Plataforma', 'Browning 1911-22']],
    'Cargador para pistola Browning 1911 en versión .22 LR.'),
  amx(126, 'Cargador 12 GA · Optimum OPT VM G2 (10 cart.)', 'Optimum Arms', 'Turquía', 'cargadores', 'dcam', 964.70,
    'CARGADOR 10 CARTS CAL. 12 GA OPT VM G2', ['Escopeta Optimum OPT VM G2', '12 GA'], [['Calibre', '12 GA'], ['Capacidad', '10 cartuchos'], ['Plataforma', 'OPT VM G2']],
    'Cargador de 10 cartuchos para escopeta Optimum Arms OPT VM G2 en calibre 12.'),
  amx(127, 'Cargador 20 GA · Optimum OPT VM G2 (10 cart.)', 'Optimum Arms', 'Turquía', 'cargadores', 'dcam', 964.70,
    'CARGADOR 10 CARTS CAL. 20 GA OPT VM G2', ['Escopeta Optimum OPT VM G2', '20 GA'], [['Calibre', '20 GA'], ['Capacidad', '10 cartuchos'], ['Plataforma', 'OPT VM G2']],
    'Cargador de 10 cartuchos para escopeta Optimum Arms OPT VM G2 en calibre 20.'),

  { ...amx(128, "Cargador 9mm · Beretta PX4 (20 cart.)", "Beretta", "Italia", 'cargadores', "dcam", 619.95,
    "CARGADOR PARA PISTOLA MARCA BERETTA MODELO PX4 CAL. 9x19MM CON CAPACIDAD DE 20 CARTUCHOS", ["Pistola Beretta PX4 9mm","9mm Parabellum"], [["Calibre","9mm Parabellum"],["Capacidad","20 cartuchos"],["Plataforma","Beretta PX4"]],
    "Cargador de 20 cartuchos para pistola Beretta PX4 Storm en 9mm. Existencia y precio del inventario OTCA 18-jun-2026."), priceManualId: 'man_acc_2026_06_18' },
  { ...amx(129, "Cargador .380 ACP · Taurus PT58 (19 cart.)", "Taurus", "Brasil", 'cargadores', "dcam", 521.02,
    "CARGADOR CALIBRE 0.380\", MARCA TAURUS, PARA PISTOLA MODELO PT 58 HC PLUS, CON CAPACIDAD DE 19 CARTUCHOS", ["Pistola Taurus PT58 HC Plus",".380 ACP"], [["Calibre",".380 ACP"],["Capacidad","19 cartuchos"],["Plataforma","Taurus PT58 HC Plus"]],
    "Cargador de 19 cartuchos para pistola Taurus PT58 HC Plus en .380 ACP. Existencia y precio del inventario OTCA 18-jun-2026."), priceManualId: 'man_acc_2026_06_18' },
  { ...amx(130, "Cargador .22 LR · Browning Buck Mark (10 cart.)", "Browning", "Bélgica", 'cargadores', "dcam", 615.24,
    "CARGADOR PARA PISTOLA SEMIAUTOMÁTICA CALIBRE 0.22\" L.R., MARCA BROWNING, MODELO BUCKMARK, DE 10 CARTUCHOS DE CAPACIDAD", ["Pistola Browning Buck Mark",".22 LR"], [["Calibre",".22 LR"],["Capacidad","10 cartuchos"],["Plataforma","Browning Buck Mark"]],
    "Cargador de 10 cartuchos para pistola Browning Buck Mark en .22 LR. Existencia y precio del inventario OTCA 18-jun-2026."), priceManualId: 'man_acc_2026_06_18' },
  { ...amx(131, "Cargador .22 LR · CZ 457/512 (10 cart.)", "Ceska Zbrojovka", "Rep. Checa", 'cargadores', "dcam", 1107.44,
    "CARGADOR CALIBRE 22 LR, CON CAPACIDAD DE 10 CARTUCHOS PARA RIFLE MODELO CZ 457/512, MARCA CESKA ZBROJOVKA A.S.", ["Rifle CZ 457","Rifle CZ 512",".22 LR"], [["Calibre",".22 LR"],["Capacidad","10 cartuchos"],["Plataforma","CZ 457 / CZ 512"]],
    "Cargador de 10 cartuchos para rifles Ceska Zbrojovka CZ 457 / CZ 512 en .22 LR. Existencia y precio del inventario OTCA 18-jun-2026."), priceManualId: 'man_acc_2026_06_18' },

  // ── NUEVOS (DCAM · 11-sep-2026) ──
  { ...amx(132, "Cargador .380 ACP · Tanfoglio FT-9-FS (18 cart.)", "Tanfoglio", "Italia", 'cargadores', "dcam", 2.56,
    "CARGADOR 0.380\" TANFOGLIO FT-9-FS CAR SP", ["Pistola Tanfoglio FT-9-FS (Full Size y Carry)", ".380 ACP"], [["Calibre", ".380 ACP"], ["Capacidad", "18 cartuchos"], ["Plataforma", "Tanfoglio FT-9-FS"]],
    "Cargador de 18 cartuchos para pistola Tanfoglio FT-9-FS en versiones Full Size y Carry, calibre .380 ACP."), priceManualId: 'man_acc_2026_09_11' },
  { ...amx(133, "Cargador 5.56x45 · IWI Galil ACE 21/22 (35 cart.)", "IWI", "Israel", 'cargadores', "seguridad", 664.46,
    "CARGADOR P/FUSIL 5.56 P/ACE 21 y ACE 22", ["Fusil IWI Galil ACE 21", "Fusil IWI Galil ACE 22", "5.56x45"], [["Calibre", "5.56x45 OTAN"], ["Capacidad", "35 cartuchos"], ["Plataforma", "Galil ACE 21 / ACE 22"]],
    "Cargador de 35 cartuchos para los fusiles IWI Galil ACE 21 y ACE 22 en 5.56x45. Plataforma restringida a corporaciones de seguridad."), priceManualId: 'man_acc_2026_09_11' },

  // ── Separado en la revisión del 13-sep-2026: el registro OTCA 26-sep de la 113 era
  //    el cargador de la CZ P-07; la 113 sigue el de la CZ Shadow 2 (DCAM) ──
  { ...amx(134, "Cargador .380 ACP · CZ P-07 (15 cart.)", "Česká Zbrojovka", "Rep. Checa", 'cargadores', "dcam", 666.10,
    "CARGADOR PARA PISTOLA CAL. 0.380\" MARCA CESKA ZBROJOVKA MOD. CZ P-07, CAP. 15 CARTS.", ["Pistola CZ P-07 .380"], [["Calibre", ".380 ACP"], ["Capacidad", "15 cartuchos"], ["Plataforma", "CZ P-07"]],
    "Cargador de 15 cartuchos para pistola Česká Zbrojovka CZ P-07 en .380 ACP. Existencia y precio del inventario OTCA 26-sep-2025 (Monterrey)."), priceManualId: 'man_acc_2025_09_26' },
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
  120: { tipos: ['pistola'], calibres: ['9mm Parabellum'] },
  121: { tipos: ['pistola'], calibres: ['9mm Parabellum'] },
  122: { tipos: ['pistola'], calibres: ['.40 S&W'] },
  123: { tipos: ['pistola'], calibres: ['9mm Parabellum'] },
  124: { tipos: ['pistola'], calibres: ['.22 LR'] },
  125: { tipos: ['pistola'], calibres: ['.22 LR'] },
  126: { tipos: ['escopeta'], calibres: ['12 GA'] },
  127: { tipos: ['escopeta'], calibres: ['20 GA'] },
  128: { tipos: ['pistola'], calibres: ['9mm Parabellum'] },
  129: { tipos: ['pistola'], calibres: ['.380 ACP'] },
  130: { tipos: ['pistola'], calibres: ['.22 LR'] },
  131: { tipos: ['rifle','carabina'], calibres: ['.22 LR'] },
  // 132 (Tanfoglio FT-9-FS) y 133 (Galil ACE 21/22) sin entrada a propósito: por
  // tipo+calibre se mostraban compatibles con armas del catálogo que no los aceptan.
  // Sin entrada no se muestra ninguna; la compatibilidad por modelo llega aparte.
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
// errata (opcional): el precio TAL COMO lo publicó la DCAM cuando es una errata
// evidente; `price` es entonces el que se publica (el último conocido o, si no
// hay, el mismo del PDF) y la ficha avisa junto al precio.
const _h = (mid, price, date, qty, errata) => ({ manualId: mid, price: _accFmt(price), date, qty: (qty == null ? null : qty), ...(errata == null ? {} : { errata: _accFmt(errata) }) });
const SEP = 'man_acc_2025_09_26', OCT = 'man_acc_2025_10_03', JUN = 'man_acc_2026_06_16';
const SEPd = '2025-09-26', OCTd = '2025-10-03', JUNd = '2026-06-16';
const JUN18 = 'man_acc_2026_06_18', JUN18d = '2026-06-18';
const JUL = 'man_acc_2026_07_06', JULd = '2026-07-06';
const S11 = 'man_acc_2026_09_11', S11d = '2026-09-11';

window.ACCESORIOS_PRICE_HISTORY = {
  101: [_h(OCT, 665.4, OCTd, 18), _h(JUL, 608.16, JULd, 8), _h(S11, 590.63, S11d, 4)],
  102: [_h(OCT, 332.7, OCTd, 46), _h(JUL, 304.08, JULd, 44), _h(S11, 295.32, S11d, 44)],
  103: [_h(OCT, 138.62, OCTd, 20), _h(JUL, 126.70, JULd, 20), _h(S11, 123.05, S11d, 20)],
  104: [_h(OCT, 841.81, OCTd, 39), _h(JUN, 1303.22, JUNd, 20), _h(JUN18, 761.73, JUN18d, 8), _h(JUL, 1304.78, JULd, 20)],
  105: [_h(OCT, 362.63, OCTd, 8), _h(JUL, 324.75, JULd, 6), _h(S11, 320.50, S11d, 6)],
  106: [_h(SEP, 555.08, SEPd, 18), _h(OCT, 554.5, OCTd, 5), _h(JUN18, 498.49, JUN18d, 10), _h(JUL, 506.80, JULd, 9), _h(S11, 492.19, S11d, 5)],
  107: [_h(SEP, 555.08, SEPd, 17), _h(OCT, 554.5, OCTd, 51), _h(JUN18, 498.49, JUN18d, 13), _h(JUL, 506.80, JULd, 22), _h(S11, 492.19, S11d, 20)],
  108: [_h(OCT, 554.5, OCTd, 37), _h(JUL, 506.80, JULd, 65), _h(S11, 492.19, S11d, 60)],
  109: [_h(OCT, 723.95, OCTd, 8), _h(JUL, 661.68, JULd, 1)],
  110: [_h(OCT, 621.04, OCTd, 5), _h(JUN18, 558.31, JUN18d, 6)],
  111: [_h(SEP, 1054.65, SEPd, 8), _h(OCT, 1053.55, OCTd, 40), _h(JUN18, 947.12, JUN18d, 4), _h(S11, 935.17, S11d, 26)],
  112: [_h(SEP, 701.44, SEPd, 5), _h(OCT, 693.12, OCTd, 42), _h(S11, 615.24, S11d, 19)],
  113: [_h(OCT, 543.41, OCTd, 70), _h(JUN, 488.85, JUNd, 1)],
  114: [_h(OCT, 368.86, OCTd, 36), _h(JUN, 368.86, JUNd, 36), _h(JUL, 368.86, JULd, 36), _h(S11, 368.86, S11d, 36)],
  115: [_h(OCT, 546.2, OCTd, 18), _h(JUN, 546.2, JUNd, 18), _h(JUL, 546.20, JULd, 18), _h(S11, 546.20, S11d, 18)],
  116: [_h(OCT, 9426.46, OCTd, 5), _h(JUN, 8479.99, JUNd, 5), _h(JUL, 8615.57, JULd, 5), _h(S11, 8367.29, S11d, 5)],
  117: [_h(OCT, 6931.22, OCTd, 2), _h(JUN, 6235.29, JUNd, 1), _h(JUL, 6334.98, JULd, 1), _h(S11, 6152.42, S11d, 1)],
  201: [_h(OCT, 29111.11, OCTd, 11), _h(JUL, 26606.91, JULd, 11), _h(S11, 25840.17, S11d, 10)],
  202: [_h(OCT, 24675.13, OCTd, 5), _h(JUL, 22552.52, JULd, 5), _h(S11, 21902.62, S11d, 5)],
  301: [_h(OCT, 6475.47, OCTd, 1), _h(JUN, 5792.08, JUNd, 1), _h(JUL, 5799.04, JULd, 1), _h(S11, 5723.24, S11d, 1)],
  401: [_h(OCT, 5045.93, OCTd, 10), _h(JUN, 4539.29, JUNd, 10), _h(JUL, 4611.86, JULd, 10), _h(S11, 4478.96, S11d, 10)],
  402: [_h(OCT, 809.43, OCTd, 5), _h(JUN, 724.01, JUNd, 5), _h(JUL, 724.88, JULd, 5), _h(S11, 715.40, S11d, 5)],
  // Datos reales del inventario DCAM 3-oct-2025 (EXIST_ACCESORIOS). OTCA 26-sep pendiente de conciliar.
  118: [_h(SEP, 580.17, SEPd, 9), _h(JUN18, 521.02, JUN18d, 3)],
  119: [_h(SEP, 233.13, SEPd, 10), _h(JUN, 209.51, JUNd, 23), _h(JUN18, 209.36, JUN18d, 13), _h(JUL, 212.86, JULd, 23), _h(S11, 206.72, S11d, 19)],
  // ── Nuevos accesorios DCAM 16-jun-2026 ──
  120: [_h(JUN, 467.70, JUNd, 18), _h(JUL, 475.17, JULd, 14), _h(S11, 461.48, S11d, 2)],
  121: [_h(JUN, 467.70, JUNd, 31), _h(JUL, 475.17, JULd, 29), _h(S11, 461.48, S11d, 20)],
  122: [_h(JUN, 467.70, JUNd, 44), _h(JUL, 475.17, JULd, 42), _h(S11, 461.48, S11d, 40)],
  123: [_h(JUN, 577.82, JUNd, 30), _h(JUL, 578.51, JULd, 30), _h(S11, 570.95, S11d, 30)],
  124: [_h(JUN, 530.09, JUNd, 2), _h(JUN18, 529.07, JUN18d, 10), _h(JUL, 530.73, JULd, 2)],
  125: [_h(JUN, 623.53, JUNd, 29), _h(JUN18, 618.96, JUN18d, 1), _h(JUL, 633.50, JULd, 27), _h(S11, 615.24, S11d, 27)],
  126: [_h(JUN, 977.69, JUNd, 20), _h(JUL, 993.32, JULd, 20), _h(S11, 964.70, S11d, 20)],
  127: [_h(JUN, 977.69, JUNd, 6), _h(JUL, 993.32, JULd, 6), _h(S11, 964.70, S11d, 6)],
  128: [_h(JUN18, 619.95, JUN18d, 16)],
  129: [_h(JUN18, 521.02, JUN18d, 12)],
  130: [_h(JUN18, 623.11, JUN18d, 13), _h(JUL, 633.50, JULd, 29), _h(S11, 615.24, S11d, 19)],
  131: [_h(JUN18, 1121.59, JUN18d, 16), _h(JUL, 1140.30, JULd, 37), _h(S11, 1107.44, S11d, 11)],
  // ── Nuevos accesorios DCAM 11-sep-2026 ──
  132: [_h(S11, 2.56, S11d, 3, 2.56)], // errata DCAM ($2.56); sin precio anterior se publica el del PDF
  133: [_h(S11, 664.46, S11d, 15)],
  // ── Separado en la revisión del 13-sep-2026 (antes, registro OTCA de la 113) ──
  134: [_h(SEP, 666.1, SEPd, 35)],
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

// Inventario fuente («Ver inventario fuente») = el del ÚLTIMO registro del historial.
// Se deriva aquí y pisa el `priceManualId` escrito a mano en cada ficha: las
// conciliaciones añadían registros sin tocarlo y el botón abría un PDF viejo.
window.ACCESORIOS.forEach(a => {
  const h = window.getAccesorioPriceHistory(a.id);
  if (h.length) a.priceManualId = h[h.length - 1].manualId;
});
