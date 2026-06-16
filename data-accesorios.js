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
    url: 'https://www.gob.mx/cms/uploads/attachment/file/1026250/EXIST_ACCESORIOS_PARA_3_OCTUBRE_2025.pdf',
    fileName: 'EXIST_ACCESORIOS_PARA_3_OCTUBRE_2025.pdf',
    primary: true,
  },
  {
    id: 'man_acc_2025_09_26',
    nombre: 'Stock OTCA · 26 de septiembre 2025',
    autoridad: 'OTCA',
    fecha: '2025-09-26',
    url: 'https://www.gob.mx/cms/uploads/attachment/file/1024996/STOCK_OTCA_26_SEP._2025_PUBLICAR_PAG._WEB.pdf',
    fileName: 'STOCK_OTCA_26_SEP._2025_PUBLICAR_PAG._WEB.pdf',
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
  // ── Cargadores ──────────────────────────────────────────────────────────
  amx(101, 'Cargador 9mm · 17 cartuchos', 'Beretta', 'Italia', 'cargadores', 'dcam', 1890,
    'CARGADOR CAL. 9mm MCA BERETTA P/PISTOLA 17 CART.',
    ['Pistola 9mm', 'Beretta 92 / APX'],
    [['Calibre', '9mm Parabellum'], ['Capacidad', '17 cartuchos'], ['Material', 'Acero / polímero'], ['Acabado', 'Pavón mate']],
    'Cargador de repuesto de fábrica para pistola de servicio en 9mm. Cuerpo de acero con seguidor de polímero de alta visibilidad.'),
  amx(102, 'Cargador .380 ACP · 7 cartuchos', 'Colt', 'EUA', 'cargadores', 'dcam', 1450,
    'CARGADOR CAL. .380 MCA COLT P/PISTOLA 7 CART.',
    ['Pistola .380 ACP'],
    [['Calibre', '.380 ACP'], ['Capacidad', '7 cartuchos'], ['Material', 'Acero inoxidable']],
    'Cargador compacto para pistola de bolsillo en calibre .380, el más común de adquisición civil directa en la DCAM.'),
  amx(103, 'Cargador .38 Super · 10 cartuchos', 'Para Ordnance', 'Canadá', 'cargadores', 'dcam', 2390,
    'CARGADOR CAL. .38 SUPER P/PISTOLA 10 CART.',
    ['Pistola .38 Super', '1911'],
    [['Calibre', '.38 Super'], ['Capacidad', '10 cartuchos'], ['Tipo', 'Doble hilera']],
    'Cargador de doble hilera para plataformas 1911 en .38 Super, calibre de tiro deportivo muy popular en México.'),
  amx(104, 'Cargador 5.56 PMAG · 30 cartuchos', 'Magpul', 'EUA', 'cargadores', 'seguridad', 1290,
    'CARGADOR CAL. 5.56 MCA MAGPUL PMAG 30 CART.',
    ['Carabina 5.56', 'AR-15 / M4'],
    [['Calibre', '5.56x45mm OTAN'], ['Capacidad', '30 cartuchos'], ['Material', 'Polímero reforzado'], ['Peso', '0.13 kg']],
    'Cargador de polímero estándar de la industria para plataformas 5.56. Restringido a corporaciones de seguridad con licencia colectiva.'),

  // ── Miras y ópticas ──────────────────────────────────────────────────────
  amx(201, 'Mira réflex punto rojo', 'Aimpoint', 'Suecia', 'opticas', 'seguridad', 18900,
    'MIRA TELESCOPICA PUNTO ROJO MCA AIMPOINT',
    ['Carabina', 'Escopeta', 'Riel Picatinny'],
    [['Tipo', 'Réflex 1x'], ['Punto', '2 MOA'], ['Batería', '50,000 h'], ['Montura', 'Picatinny 21mm']],
    'Mira de punto rojo sin aumento para adquisición rápida de blanco. Sumergible y de batería de larga duración.'),
  amx(202, 'Visor telescópico 3-9x40', 'Leupold', 'EUA', 'opticas', 'dcam', 12400,
    'VISOR TELESCOPICO 3-9X40 MCA LEUPOLD',
    ['Rifle de cacería', '.308 Win', '.30-06'],
    [['Aumento', '3-9x'], ['Objetivo', '40mm'], ['Retícula', 'Duplex'], ['Tubo', '1 pulgada']],
    'Visor variable clásico para cacería y tiro a distancia media. Óptica multicapa con buena transmisión de luz al amanecer y atardecer.'),
  amx(203, 'Visor táctico 1-6x24 FFP', 'Vortex', 'EUA', 'opticas', 'seguridad', 21500,
    'VISOR TACTICO 1-6X24 MCA VORTEX PRIMER PLANO',
    ['Carabina 5.56', 'Tiro práctico'],
    [['Aumento', '1-6x'], ['Plano', 'Primer plano focal (FFP)'], ['Retícula', 'Iluminada BDC'], ['Tubo', '30mm']],
    'Visor de bajo aumento variable para tiro dinámico, con retícula iluminada en el primer plano focal.'),
  amx(204, 'Mira de hierro abatible', 'Magpul', 'EUA', 'opticas', 'seguridad', 2950,
    'MIRA METALICA ABATIBLE MCA MAGPUL MBUS',
    ['Riel Picatinny', 'Carabina'],
    [['Tipo', 'Respaldo abatible'], ['Material', 'Polímero'], ['Ajuste', 'Elevación y deriva']],
    'Miras metálicas de respaldo plegables para usar como respaldo de una óptica o como puntería primaria.'),

  // ── Fundas y pistoleras ──────────────────────────────────────────────────
  amx(301, 'Funda de retención nivel II', 'Safariland', 'EUA', 'fundas', 'seguridad', 4200,
    'FUNDA PISTOLERA RETENCION MCA SAFARILAND',
    ['Pistola 9mm', 'Cinturón táctico'],
    [['Retención', 'Nivel II (SLS)'], ['Material', 'SafariLaminate'], ['Montaje', 'Cinturón / muslera']],
    'Pistolera de retención activa para portación de servicio, con liberación de pulgar y ajuste de caída.'),
  amx(302, 'Funda interior IWB', 'Blackhawk', 'EUA', 'fundas', 'dcam', 1350,
    'FUNDA INTERIOR IWB MCA BLACKHAWK',
    ['Pistola compacta', '.380 / 9mm'],
    [['Porte', 'Interior (IWB)'], ['Material', 'Kydex'], ['Clip', 'Acero'], ['Mano', 'Diestro']],
    'Funda interior de Kydex para porte discreto. Ajuste de retención por tornillo y clip de acero resistente.'),
  amx(303, 'Cartuchera de cuero para revólver', 'Bianchi', 'EUA', 'fundas', 'dcam', 1980,
    'FUNDA DE CUERO P/REVOLVER MCA BIANCHI',
    ['Revólver .38 Special', 'Cañón 2-4"'],
    [['Material', 'Cuero vegetal'], ['Porte', 'Cinturón (OWB)'], ['Acabado', 'Natural / negro']],
    'Cartuchera de cuero curtido para revólver de cañón corto, estilo clásico para porte al cinturón.'),

  // ── Limpieza y mantenimiento ──────────────────────────────────────────────
  amx(401, 'Kit de limpieza universal', 'Hoppe\u0027s', 'EUA', 'limpieza', 'dcam', 980,
    'JUEGO DE LIMPIEZA UNIVERSAL MCA HOPPES',
    ['Pistola', 'Rifle', 'Escopeta'],
    [['Calibres', 'Multi (.22 a 12 GA)'], ['Incluye', 'Varillas, cepillos, parches'], ['Estuche', 'Rígido']],
    'Estuche universal de limpieza con varillas, cepillos de bronce, jags y solvente para mantenimiento de cañón.'),
  amx(402, 'Cepillo de bronce 9mm (pack)', 'Otis', 'EUA', 'limpieza', 'dcam', 320,
    'CEPILLO DE LIMPIEZA CAL. 9mm MCA OTIS',
    ['Pistola 9mm', '.38 Super'],
    [['Calibre', '9mm / .357'], ['Material', 'Cerdas de bronce'], ['Rosca', '8-32 estándar']],
    'Cepillos de bronce fosforado para el calibre 9mm. Consumible de mantenimiento de rutina del ánima.'),
  amx(403, 'Aceite lubricante CLP 120 ml', 'Break-Free', 'EUA', 'limpieza', 'dcam', 540,
    'LUBRICANTE PROTECTOR CLP MCA BREAK-FREE',
    ['Todas las armas'],
    [['Tipo', 'Limpia-Lubrica-Protege (CLP)'], ['Volumen', '120 ml'], ['Aplicador', 'Gotero']],
    'Solución tres-en-uno que limpia, lubrica y protege contra corrosión en una sola aplicación.'),

  // ── Bípodes y monopies ────────────────────────────────────────────────────
  amx(501, 'Bípode plegable 6-9"', 'Harris', 'EUA', 'bipodes', 'dcam', 3850,
    'BIPODE PLEGABLE 6-9 PULG MCA HARRIS',
    ['Rifle de precisión', 'Swivel / Picatinny'],
    [['Altura', '6 a 9 pulgadas'], ['Montaje', 'Bocallave / adaptador'], ['Patas', 'Resorte, ajuste rápido']],
    'Bípode plegable de aluminio para tiro de precisión desde posición tendido. Estándar de la industria.'),
  amx(502, 'Monópode de culata', 'Accu-Shot', 'EUA', 'bipodes', 'seguridad', 2650,
    'MONOPODE DE CULATA MCA ACCU-SHOT',
    ['Rifle táctico', 'Culata con riel'],
    [['Ajuste', 'Perilla micrométrica'], ['Material', 'Aluminio'], ['Montaje', 'Riel inferior']],
    'Monópode trasero ajustable que estabiliza la culata para correcciones finas de elevación en tiro de larga distancia.'),

  // ── Estuches y maletas ────────────────────────────────────────────────────
  amx(601, 'Maleta rígida para rifle', 'Pelican', 'EUA', 'estuches', 'dcam', 7900,
    'ESTUCHE RIGIDO P/RIFLE MCA PELICAN',
    ['Rifle', 'Carabina'],
    [['Material', 'Polipropileno'], ['Interior', 'Espuma a presión'], ['Sello', 'Hermético O-ring'], ['Cierres', 'Con candado']],
    'Maleta rígida impermeable con espuma de capas para transporte y resguardo seguro de un rifle largo.'),
  amx(602, 'Estuche de pistola con espuma', 'Plano', 'EUA', 'estuches', 'dcam', 690,
    'ESTUCHE P/PISTOLA CON ESPUMA MCA PLANO',
    ['Pistola', 'Revólver'],
    [['Material', 'Polímero'], ['Interior', 'Espuma de huevera'], ['Cierre', 'Pestillos dobles']],
    'Estuche ligero para guardar y transportar una pistola con accesorios, con espuma protectora interior.'),

  // ── Refacciones y repuestos ───────────────────────────────────────────────
  amx(701, 'Juego de resortes recuperadores', 'Wolff', 'EUA', 'refacciones', 'dcam', 760,
    'JUEGO DE RESORTES RECUPERADORES MCA WOLFF',
    ['Pistola 1911', '.38 Super / .45'],
    [['Tipo', 'Resorte recuperador'], ['Presentación', 'Surtido de libraje'], ['Uso', 'Mantenimiento']],
    'Surtido de resortes recuperadores de repuesto para mantener el ciclo de funcionamiento de pistolas de armazón metálico.'),
  amx(702, 'Pin de percutor de repuesto', 'CZ', 'Chequia', 'refacciones', 'dcam', 410,
    'PIN PERCUTOR DE REPUESTO MCA CZ',
    ['Pistola CZ 75', '9mm'],
    [['Pieza', 'Aguja percutora'], ['Material', 'Acero tratado'], ['Compatibilidad', 'CZ 75 / SP-01']],
    'Aguja percutora de repuesto de fábrica. Pieza de desgaste recomendada como refacción de servicio.'),

  // ── Portacargadores y cananas ─────────────────────────────────────────────
  amx(801, 'Portacargador doble', 'Blackhawk', 'EUA', 'portacargadores', 'seguridad', 980,
    'PORTACARGADOR DOBLE MCA BLACKHAWK',
    ['Cargador de pistola', 'Cinturón'],
    [['Capacidad', '2 cargadores'], ['Material', 'Nylon / polímero'], ['Retención', 'Ajustable']],
    'Portacargador doble para cinturón con retención ajustable, para recarga rápida en portación de servicio.'),
  amx(802, 'Canana de escopeta (cartuchera)', 'Uncle Mike\u0027s', 'EUA', 'portacargadores', 'dcam', 720,
    'CANANA P/ESCOPETA MCA UNCLE MIKES',
    ['Escopeta 12 GA', 'Cinturón / culata'],
    [['Capacidad', '6 cartuchos'], ['Material', 'Nylon'], ['Montaje', 'Cinturón o culata']],
    'Cartuchera de nylon para munición de escopeta calibre 12, de montaje en cinturón o en la culata del arma.'),

  // ── Empuñaduras y culatas ─────────────────────────────────────────────────
  amx(901, 'Empuñadura de pistola texturizada', 'Hogue', 'EUA', 'empunaduras', 'dcam', 890,
    'EMPUÑADURA TEXTURIZADA MCA HOGUE',
    ['Pistola 1911', 'Revólver'],
    [['Material', 'Caucho / polímero'], ['Textura', 'Antideslizante'], ['Ajuste', 'Modelo específico']],
    'Cachas de caucho texturizado que mejoran el agarre y absorben retroceso. Pieza de personalización común.'),
  amx(902, 'Culata ajustable para carabina', 'Magpul', 'EUA', 'empunaduras', 'seguridad', 2480,
    'CULATA AJUSTABLE MCA MAGPUL P/CARABINA',
    ['Carabina 5.56', 'Tubo de receptor mil-spec'],
    [['Tipo', 'Telescópica'], ['Material', 'Polímero reforzado'], ['Ajuste', '6 posiciones']],
    'Culata telescópica de polímero con ajuste de longitud de tiro, para plataformas de carabina de uso de seguridad.'),

  // ── Linternas y láser ─────────────────────────────────────────────────────
  amx(1001, 'Linterna táctica de riel 1000 lm', 'Streamlight', 'EUA', 'linternas', 'seguridad', 4650,
    'LINTERNA TACTICA DE RIEL MCA STREAMLIGHT',
    ['Pistola con riel', 'Carabina'],
    [['Salida', '1,000 lúmenes'], ['Montaje', 'Riel Picatinny / accesorio'], ['Batería', 'CR123A'], ['Resistencia', 'Al agua IPX7']],
    'Linterna de arma de alta intensidad para identificación de blanco en baja luz. Montaje en riel con switch de cola.'),
  amx(1002, 'Designador láser verde', 'Crimson Trace', 'EUA', 'linternas', 'seguridad', 6300,
    'MIRA LASER VERDE MCA CRIMSON TRACE',
    ['Pistola con riel', '9mm'],
    [['Color', 'Láser verde'], ['Montaje', 'Riel de pistola'], ['Activación', 'Instintiva / interruptor'], ['Alcance', 'Diurno mejorado']],
    'Designador láser verde de alta visibilidad diurna para puntería rápida, con activación instintiva al empuñar.'),
];

// ── COMPATIBILIDAD ESTRUCTURADA (derivada de la compatibilidad declarada) ────
// Permite cruzar accesorios ↔ armas del inventario SIN inventar nada: cada
// accesorio declara los tipos y/o calibres de arma con los que es compatible.
// Semántica de coincidencia: si declara calibres Y tipos, deben cumplirse ambos;
// si declara solo uno, basta ese; 'universal' aplica a todas las armas.
const ACC_COMPAT = {
  101: { tipos: ['pistola'], calibres: ['9mm Parabellum'] },
  102: { tipos: ['pistola'], calibres: ['.380 ACP'] },
  103: { tipos: ['pistola'], calibres: ['.38 Super'] },
  104: { tipos: ['carabina'], calibres: ['5.56x45mm'] },
  201: { tipos: ['carabina', 'escopeta'] },
  202: { tipos: ['rifle'] },
  203: { tipos: ['carabina'] },
  204: { tipos: ['carabina'] },
  301: { tipos: ['pistola'] },
  302: { tipos: ['pistola'] },
  303: { tipos: ['revolver'] },
  401: { universal: true },
  402: { tipos: ['pistola', 'revolver'], calibres: ['9mm Parabellum', '.38 Super', '.38 Special'] },
  403: { universal: true },
  501: { tipos: ['rifle'] },
  502: { tipos: ['rifle'] },
  601: { tipos: ['rifle', 'carabina'] },
  602: { tipos: ['pistola', 'revolver'] },
  701: { tipos: ['pistola'], calibres: ['.38 Super'] },
  702: { tipos: ['pistola'], calibres: ['9mm Parabellum'] },
  801: { tipos: ['pistola'] },
  802: { tipos: ['escopeta'], calibres: ['12 GA'] },
  901: { tipos: ['pistola', 'revolver'] },
  902: { tipos: ['carabina'] },
  1001: { tipos: ['pistola', 'carabina'] },
  1002: { tipos: ['pistola'] },
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
  101: [_h(SEP, 1790, SEPd, 320), _h(OCT, 1890, OCTd, 412)],
  102: [_h(SEP, 1450, SEPd, 168), _h(OCT, 1450, OCTd, 145)],
  104: [_h(SEP, 1190, SEPd, 540), _h(OCT, 1290, OCTd, 612)],
  201: [_h(SEP, 17900, SEPd, 38), _h(OCT, 18900, OCTd, 44)],
  202: [_h(SEP, 11900, SEPd, 72), _h(OCT, 12400, OCTd, 65)],
  204: [_h(SEP, 2950, SEPd, 210), _h(OCT, 2950, OCTd, 198)],
  301: [_h(SEP, 3980, SEPd, 86), _h(OCT, 4200, OCTd, 94)],
  401: [_h(SEP, 920, SEPd, 430), _h(OCT, 980, OCTd, 388)],
  501: [_h(SEP, 3650, SEPd, 57), _h(OCT, 3850, OCTd, 61)],
  601: [_h(SEP, 7600, SEPd, 29), _h(OCT, 7900, OCTd, 24)],
  1001: [_h(SEP, 4480, SEPd, 112), _h(OCT, 4650, OCTd, 103)],
  1002: [_h(SEP, 6300, SEPd, 47), _h(OCT, 6300, OCTd, 52)],
  // Sin registro explícito → la app atribuye su priceExact al inventario principal (sin dato de existencias).
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
