// Armado en México — base de datos oficial DCAM/SEDENA
// Fuente: Catálogo de existencias DCAM al 3 de octubre de 2025
// Clasificación legal según Ley Federal de Armas de Fuego y Explosivos.

window.CATEGORIES = {
  tipo: [
    { id: 'pistola',  label: 'Pistolas',    icon: '◢' },
    { id: 'revolver', label: 'Revólveres',  icon: '◉' },
    { id: 'rifle',    label: 'Rifles',      icon: '━' },
    { id: 'escopeta', label: 'Escopetas',   icon: '═' },
    { id: 'carabina', label: 'Carabinas',   icon: '╌' },
  ],
  calibre: [
    { id: '.22 LR',           label: '.22 LR' },
    { id: '.380 ACP',         label: '.380 ACP' },
    { id: '.38 Special',      label: '.38 Special' },
    { id: '.38 Super',        label: '.38 Super' },
    { id: '9mm Parabellum',   label: '9mm Parabellum' },
    { id: '.40 S&W',          label: '.40 S&W' },
    { id: '.243 Winchester',  label: '.243 Win' },
    { id: '.270 Winchester',  label: '.270 Win' },
    { id: '.308 Winchester',  label: '.308 Win' },
    { id: '.30-06 Sprg',      label: '.30-06' },
    { id: '7mm Rem Mag',      label: '7mm Mag' },
    { id: '.300 Win Mag',     label: '.300 Win' },
    { id: '6.5 PRC',          label: '6.5 PRC' },
    { id: '12 GA',            label: 'Cal. 12' },
    { id: '20 GA',            label: 'Cal. 20' },
    { id: '.410 Bore',        label: 'Cal. .410' },
    { id: '5.56x45mm',        label: '5.56 OTAN' },
    { id: '7.62x39mm',        label: '7.62x39' },
    { id: '7.62x51mm',        label: '7.62 OTAN' },
  ],
  uso: [
    { id: 'domicilio', label: 'Defensa hogar', icon: '⌂' },
    { id: 'club',      label: 'Tiro deportivo', icon: '◎' },
    { id: 'caza',      label: 'Cacería',        icon: '⤧' },
    { id: 'militar',   label: 'Militar / Táctico', icon: '☆' },
  ],
  disponibilidad: [
    { id: 'dcam',      label: 'Uso civil',           desc: 'Adquisición directa para civiles en DCAM con registro SEDENA.', color: '#4FAE5C' },
    { id: 'seguridad', label: 'Policía / Seguridad', desc: 'Restringido a corporaciones de seguridad pública y privada con licencia colectiva.', color: '#F5C518' },
    { id: 'ejercito',  label: 'Exclusivo Ejército',  desc: 'Uso exclusivo de las Fuerzas Armadas de México.', color: '#C0392B' },
  ],
};

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
const _statsFor = (tipo, calibre) => {
  const c = calibre || '';
  if (tipo === 'pistola' || tipo === 'revolver') {
    if (/\.22/.test(c))               return { alcance:35, precision:62, retroceso:18, capacidad:55, manejo:90, poder:25 };
    if (/\.380/.test(c))              return { alcance:48, precision:65, retroceso:36, capacidad:55, manejo:84, poder:48 };
    if (/\.38 Sp/i.test(c))           return { alcance:55, precision:70, retroceso:46, capacidad:30, manejo:74, poder:60 };
    if (/9 ?mm|9X19/i.test(c))        return { alcance:60, precision:72, retroceso:48, capacidad:75, manejo:75, poder:65 };
    if (/\.40/.test(c))               return { alcance:62, precision:70, retroceso:62, capacidad:70, manejo:68, poder:78 };
    if (/\.38 Sup/i.test(c))          return { alcance:66, precision:76, retroceso:55, capacidad:55, manejo:64, poder:82 };
  }
  if (tipo === 'rifle' || tipo === 'carabina') {
    if (/\.22/.test(c))               return { alcance:58, precision:78, retroceso:14, capacidad:45, manejo:82, poder:32 };
    if (/6\.5 PRC|\.300/.test(c))     return { alcance:95, precision:92, retroceso:70, capacidad:30, manejo:50, poder:92 };
    if (/7mm/.test(c))                return { alcance:92, precision:90, retroceso:68, capacidad:30, manejo:52, poder:88 };
    if (/\.30-06|\.308/.test(c))      return { alcance:90, precision:88, retroceso:68, capacidad:35, manejo:55, poder:88 };
    if (/\.270|\.243/.test(c))        return { alcance:85, precision:90, retroceso:55, capacidad:40, manejo:62, poder:80 };
    if (/5\.56/.test(c))              return { alcance:82, precision:85, retroceso:48, capacidad:88, manejo:75, poder:70 };
    if (/7\.62x39/.test(c))           return { alcance:78, precision:80, retroceso:62, capacidad:78, manejo:68, poder:82 };
    if (/7\.62x51|7\.62 OTAN/.test(c))return { alcance:90, precision:88, retroceso:72, capacidad:75, manejo:60, poder:92 };
  }
  if (tipo === 'escopeta') {
    if (/410|\.410/.test(c))          return { alcance:35, precision:55, retroceso:30, capacidad:25, manejo:78, poder:62 };
    if (/20/.test(c))                 return { alcance:48, precision:65, retroceso:55, capacidad:35, manejo:72, poder:80 };
    return                                   { alcance:55, precision:68, retroceso:75, capacidad:42, manejo:64, poder:92 };
  }
  return { alcance:50, precision:60, retroceso:40, capacidad:50, manejo:60, poder:50 };
};

const _legalFor = (avail) => {
  if (avail === 'dcam') return {
    availLabel: "Uso civil — DCAM",
    legalTit:   "Civil — Adquisición directa en DCAM",
    legalDesc:  "Adquisición legal para civiles mexicanos mayores de edad con trámite SEDENA previo (RFC, INE, comprobante de domicilio, antecedentes no penales). Compra exclusiva en DCAM Campo Militar No. 1 (CDMX) o DCAM Monterrey.",
    disponibilidad: ["DCAM Campo Militar No. 1 — CDMX","DCAM Monterrey"],
  };
  if (avail === 'seguridad') return {
    availLabel: "Policía / Seguridad",
    legalTit:   "Restringido — Seguridad pública/privada",
    legalDesc:  "Únicamente se vende a corporaciones de seguridad pública o privada con licencia colectiva vigente expedida por SEDENA. No se entrega a particulares. Las pistolas de cañón largo en calibre .380 también están restringidas a este uso.",
    disponibilidad: ["DCAM con licencia colectiva vigente"],
  };
  return {
    availLabel: "Exclusivo Ejército",
    legalTit:   "Exclusivo — Fuerzas Armadas",
    legalDesc:  "Calibre y modelo restringido al uso exclusivo de las Fuerzas Armadas de México (Ejército, Fuerza Aérea, Armada). No disponible para civiles ni corporaciones de seguridad privada.",
    disponibilidad: ["DCAM con autorización SEDENA (uso militar)"],
  };
};

const _priceLvl = (p) => p < 10000 ? 1 : p < 20000 ? 2 : p < 50000 ? 3 : p < 100000 ? 4 : 5;

const _usesFor = (tipo, avail, calibre) => {
  if (avail === 'ejercito') return ['militar'];
  if (avail === 'seguridad') return ['militar'];
  if (tipo === 'pistola' || tipo === 'revolver') return ['domicilio','club'];
  if (tipo === 'rifle') return /\.22/.test(calibre) ? ['club'] : ['caza','club'];
  if (tipo === 'carabina') return ['militar'];
  if (tipo === 'escopeta') return ['caza','club'];
  return [];
};

// Builder
const mk = (id, nombre, marca, tipo, pais, calibre, capacidad, peso, longitud, mecanismo, anio, avail, priceExact, dcamRef, img, historia) => {
  const stats = _statsFor(tipo, calibre);
  const legal = _legalFor(avail);
  const priceN = parseFloat((priceExact||'0').replace(/[^\d.]/g,''));
  return {
    id, nombre, marca, tipo, pais, calibre, capacidad, peso, longitud, mecanismo, anio,
    era: anio >= 2015 ? 'vanguardia' : anio >= 1990 ? 'moderno' : 'clasico',
    img: img || '',
    historia,
    avail, ...legal,
    uses: _usesFor(tipo, avail, calibre),
    priceLvl: _priceLvl(priceN), priceExact: `$${priceN.toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2})} MXN`,
    dcamRef,
    stats,
  };
};

// ──────────────────────────────────────────────────────────────
// CATÁLOGO ARMADO EN MÉXICO — 2025
// Basado en existencias DCAM-SEDENA al 3 de octubre de 2025
// ──────────────────────────────────────────────────────────────
const W = "https://commons.wikimedia.org/wiki/Special:FilePath/";

window.DB = [

  // ═══════════════════════════════════════════════════════════
  //  PISTOLAS .380 ACP — USO CIVIL (DCAM)
  // ═══════════════════════════════════════════════════════════
  mk(1, "Taurus TH380", "Taurus", "pistola", "Brasil", ".380 ACP", "15+1", "725g", "188mm", "Semi-auto, DA/SA", 2019, "dcam", "8733.33", "PISTOLA CAL .380 TAURUS TH380 PAVON",
    "imagenes/001_Taurus_TH380.webp",
    "Pistola compacta de servicio fabricada en Brasil. Calibre .380 ACP de libre adquisición para civiles. Excelente relación costo-beneficio y una de las más populares para defensa de domicilio."),

  mk(2, "Taurus PT58 Plus", "Taurus", "pistola", "Brasil", ".380 ACP", "19+1", "850g", "196mm", "Semi-auto, DA/SA", 2005, "dcam", "10979.05", "PISTOLA CAL .380 TAURUS PT58 PLUS",
    "imagenes/002_Taurus_PT58_Plus.jpg",
    "Pistola full-size brasileña con capacidad ampliada de 19 cartuchos. Estructura de acero, doble acción/simple acción. Modelo clásico en el mercado mexicano para defensa domiciliaria."),

  mk(3, "Taurus PT59", "Taurus", "pistola", "Brasil", ".380 ACP", "16+1", "836g", "200mm", "Semi-auto, DA/SA", 2003, "dcam", "17364.42", "PISTOLA F.C. TAURUS PT 59 CAL .380",
    "imagenes/003_Taurus_PT59.jpg",
    "Evolución del PT58 con cañón ligeramente más largo. Mecanismo doble acción / simple acción con seguro de descenso. Apreciada en clubes de tiro y por su capacidad."),

  mk(4, "Bersa Thunder 380", "Bersa", "pistola", "Argentina", ".380 ACP", "7+1", "565g", "165mm", "Semi-auto, DA/SA", 1995, "dcam", "9936.59", "PISTOLA CAL .380 BERSA THUNDER",
    "imagenes/004_Bersa_Thunder_380.jpg",
    "Pistola compacta argentina inspirada en la Walther PPK. Una de las opciones más económicas y confiables en .380 ACP para portar oculto."),

  mk(5, "Ruger LCP", "Ruger", "pistola", "EE.UU.", ".380 ACP", "6+1", "270g", "133mm", "Semi-auto, DAO subcompacta", 2008, "dcam", "10133.99", "PISTOLA CAL .380 RUGER LCP NEGRO",
    "imagenes/005_Ruger_LCP.png",
    "Lightweight Compact Pistol. Con 270g es una de las pistolas más ligeras del mundo en su calibre. Diseñada para portación oculta de respaldo."),

  mk(6, "Ruger LCP Max", "Ruger", "pistola", "EE.UU.", ".380 ACP", "10+1", "297g", "137mm", "Semi-auto, DAO subcompacta", 2021, "dcam", "14875.83", "PISTOLA CAL .380 RUGER LCPMAX",
    "imagenes/006_Ruger_LCP_Max.jpg",
    "Evolución de la LCP con capacidad duplicada manteniendo dimensiones subcompactas. Excelente opción de defensa personal para portación discreta."),

  mk(7, "SIG Sauer P365", "SIG Sauer", "pistola", "EE.UU.", ".380 ACP", "10+1", "498g", "147mm", "Semi-auto, striker-fired micro", 2018, "dcam", "15886.35", "PISTOLA CAL .380 SIG SAUER P365 NIT",
    "imagenes/007_SIG_Sauer_P365.jpg",
    "Revolucionó el segmento de subcompactas. Acabado nitrón resistente a la corrosión. Versión .380 disponible en México para civiles."),

  mk(8, "CZ P-07", "Ceska Zbrojovka", "pistola", "Rep. Checa", ".380 ACP", "15+1", "800g", "185mm", "Semi-auto, DA/SA con Omega trigger", 2012, "dcam", "12697.99", "PISTOLA CAL .380 CESKA CZ P-07",
    "imagenes/008_CZ_P-07.jpg",
    "Pistola checa de servicio con sistema de gatillo Omega intercambiable. Variante .380 ACP especialmente fabricada para mercados con restricción de calibre."),

  mk(9, "CZ P-10 C", "Ceska Zbrojovka", "pistola", "Rep. Checa", ".380 ACP", "15+1", "740g", "185mm", "Semi-auto, striker-fired", 2017, "dcam", "13002.96", "PISTOLA CAL .380 CESKA CZ P-10 C 15C",
    "imagenes/009_CZ_P-10_C.jpg",
    "Compact striker-fired checa con uno de los mejores gatillos de fábrica del mercado. Versión .380 para el mercado mexicano."),

  mk(10, "CZ Shadow 2", "Ceska Zbrojovka", "pistola", "Rep. Checa", ".380 ACP", "17+1", "1270g", "206mm", "Semi-auto, DA/SA armazón metálico", 2016, "dcam", "36014.61", "PISTOLA CAL .380 CESKA CZ SHADOW 2",
    "imagenes/010_CZ_Shadow_2.jpg",
    "Pistola de competición premium. Armazón de aluminio, cañón de acero inoxidable. Elección de campeones de IPSC. Versión .380 hecha para el mercado mexicano."),

  mk(11, "Glock 25", "Glock", "pistola", "Austria", ".380 ACP", "15+1", "560g", "172mm", "Semi-auto, Safe Action striker", 1995, "dcam", "12060.32", "PISTOLA CAL .380 GLOCK MOD. 25",
    "imagenes/011_Glock_25.jpg",
    "Diseñada específicamente para mercados como México y Brasil donde el 9mm tiene restricciones. Internamente similar a una Glock 19 pero en calibre civil."),

  mk(12, "Glock 28", "Glock", "pistola", "Austria", ".380 ACP", "10+1", "496g", "160mm", "Semi-auto, Safe Action striker", 1997, "dcam", "12060.32", "PISTOLA CAL .380 GLOCK MOD. 28",
    "imagenes/012_Glock_28.jpg",
    "Versión subcompacta de la Glock 25 para portación oculta. Una de las Glock más pequeñas en calibre legal para civiles en México."),

  mk(13, "Beretta 80x Cheetah", "Beretta", "pistola", "Italia", ".380 ACP", "13+1", "780g", "182mm", "Semi-auto, DA/SA", 2023, "dcam", "15055.46", "PISTOLA CAL .380 BERETTA 80X NEGRO",
    "imagenes/013_Beretta_80x_Cheetah.webp",
    "Renacimiento moderno de la serie 80 de Beretta. Compacta en calibre .380, fabricada en Italia. Ideal para defensa de hogar con elegancia europea."),

  mk(14, "Browning 1911-380", "Browning", "pistola", "EE.UU.", ".380 ACP", "8+1", "453g", "190mm", "Semi-auto, SA estilo 1911", 2011, "dcam", "21070.90", "PISTOLA 380 ACP BROWNING 1911-380",
    "imagenes/014_Browning_1911-380.webp",
    "Versión a escala 85% del clásico 1911 de John Browning, en calibre civil .380 ACP. Mantiene la estética y el manejo del 1911 original."),

  // ═══════════════════════════════════════════════════════════
  //  PISTOLAS .380 CAÑÓN LARGO — RESTRINGIDAS (SEGURIDAD)
  // ═══════════════════════════════════════════════════════════
  mk(15, "Mendoza HM-7", "Mendoza", "pistola", "México", ".380 ACP", "12+1", "1100g", "280mm", "Semi-auto cañón largo, blow-back", 2010, "seguridad", "18648.29", "PISTOLA C/LARGO 380 MENDOZA HM-7",
    "imagenes/022_Mendoza_HM-7.png",
    "Pistola mexicana de cañón largo en calibre .380. A pesar de ser .380, su configuración táctica la restringe únicamente a corporaciones de seguridad pública o privada con licencia colectiva. NO disponible para civiles."),

  // ═══════════════════════════════════════════════════════════
  //  PISTOLAS .22 LR — USO CIVIL (DCAM)
  // ═══════════════════════════════════════════════════════════
  mk(16, "Browning 1911-22", "Browning", "pistola", "EE.UU.", ".22 LR", "10+1", "440g", "190mm", "Semi-auto, SA estilo 1911", 2011, "dcam", "18021.17", "PIST. SEMIA. CAL .22 L.R. BROWNING 1911",
    "imagenes/015_Browning_1911-22.webp",
    "Versión .22 LR del clásico 1911. Excelente herramienta de entrenamiento económico para quienes manejan 1911 calibre mayor. Apta para tiro deportivo."),

  mk(17, "Browning Buck Mark", "Browning", "pistola", "EE.UU.", ".22 LR", "10+1", "964g", "240mm", "Semi-auto, blow-back competición", 1985, "dcam", "16080.42", "PISTOLA 22 L.R. BROWNING BUCKMARK",
    "imagenes/016_Browning_Buck_Mark.webp",
    "Pistola .22 LR de competición americana. Cañón fijo, gatillo de competencia. Una de las pistolas .22 más vendidas del mundo para tiro deportivo."),

  mk(18, "SIG Sauer P322", "SIG Sauer", "pistola", "EE.UU.", ".22 LR", "20+1", "478g", "188mm", "Semi-auto, blow-back", 2022, "dcam", "12277.90", "PISTOLA 22 LR SIG SAUER P322 NIT NEG",
    "imagenes/017_SIG_Sauer_P322.jpg",
    "Pistola .22 LR moderna de SIG con capacidad de 20 cartuchos. Acabado nitrón, óptica-ready. Excelente herramienta de entrenamiento y deporte."),

  // ═══════════════════════════════════════════════════════════
  //  REVÓLVERES .38 SPECIAL — USO CIVIL (DCAM)
  // ═══════════════════════════════════════════════════════════
  mk(19, "Taurus 856 Acero Inox", "Taurus", "revolver", "Brasil", ".38 Special", "6", "626g", "190mm", "Revólver DA/SA cañón 3\"", 2018, "dcam", "10719.32", "REVOLVER TAURUS 856 CAÑÓN 3\" CAL .38 SPL AC INOX",
    "imagenes/018_Taurus_856_Acero_Inox.jpg",
    "Revólver compacto de 6 tiros en acero inoxidable. Cañón 3\" balance ideal entre portabilidad y precisión. Excelente para defensa de hogar y portación."),

  mk(20, "Taurus 856 Pavón Mate", "Taurus", "revolver", "Brasil", ".38 Special", "6", "626g", "190mm", "Revólver DA/SA cañón 3\"", 2018, "dcam", "10315.65", "REVOLVER TAURUS 856 CAÑÓN 3\" CAL .38 SPL PV MT",
    "imagenes/019_Taurus_856_Pavon_Mate.jpg",
    "Versión con acabado pavón mate del Taurus 856. Mismo desempeño, presentación táctica discreta."),

  mk(21, "Taurus 856 Tungsten", "Taurus", "revolver", "Brasil", ".38 Special", "6", "626g", "190mm", "Revólver DA/SA cañón 3\"", 2020, "dcam", "11930.34", "REVOLVER TAURUS 856 CAÑÓN 3\" CAL .38 SPL TUNGSTENO",
    "imagenes/020_Taurus_856_Tungsten.webp",
    "Acabado premium tungsteno del 856. Resistencia superior al desgaste y oxidación."),

  mk(22, "Ruger Wrangler", "Ruger", "revolver", "EE.UU.", ".22 LR", "6", "850g", "267mm", "Revólver SA single-action", 2019, "dcam", "22912.05", "REVOLVER CAL .22 RUGER",
    "imagenes/021_Ruger_Wrangler.webp",
    "Revólver de acción simple estilo western en .22 LR. Económico, divertido y educativo. Ideal para introducir nuevos tiradores al tiro deportivo."),

  // ═══════════════════════════════════════════════════════════
  //  PISTOLAS 9MM — EXCLUSIVO EJÉRCITO / SEGURIDAD
  // ═══════════════════════════════════════════════════════════
  mk(23, "Taurus TS9", "Taurus", "pistola", "Brasil", "9mm Parabellum", "17+1", "780g", "192mm", "Semi-auto, striker-fired", 2019, "ejercito", "9814.60", "PISTOLA CAL 9mm TAURUS TS9 PAVON",
    "imagenes/069_Taurus_TS9.webp",
    "Pistola full-size 9mm brasileña con mira tipo Glock. Calibre de uso restringido en México — únicamente Fuerzas Armadas y corporaciones autorizadas."),

  mk(24, "Taurus GX4", "Taurus", "pistola", "Brasil", "9mm Parabellum", "11+1", "530g", "158mm", "Semi-auto, striker-fired", 2021, "ejercito", "8963.56", "PISTOLA CAL 9mm TAURUS GX4",
    "imagenes/070_Taurus_GX4.webp",
    "Pistola compacta 9mm de Taurus para portar oculto. Calibre 9mm: uso reservado a Fuerzas Armadas en México."),

  mk(25, "Taurus GX4 XL", "Taurus", "pistola", "Brasil", "9mm Parabellum", "13+1", "570g", "175mm", "Semi-auto, striker-fired", 2022, "ejercito", "10585.36", "PISTOLA CAL 9mm TAURUS GX4XL",
    "imagenes/071_Taurus_GX4_XL.webp",
    "Versión de cañón largo de la GX4. Mayor velocidad de boca y mejor control. Restringida en México por su calibre 9mm."),

  mk(26, "Taurus GX4 Carry", "Taurus", "pistola", "Brasil", "9mm Parabellum", "13+1", "552g", "171mm", "Semi-auto, striker-fired", 2023, "ejercito", "8106.75", "PISTOLA F.C. TAURUS GX4 CARRY CAL 9MM",
    "imagenes/072_Taurus_GX4_Carry.webp",
    "Variante portación con cañón intermedio. Calibre 9mm restringido a Fuerzas Armadas."),

  mk(27, "Taurus PT92", "Taurus", "pistola", "Brasil", "9mm Parabellum", "17+1", "975g", "217mm", "Semi-auto, DA/SA full-size", 1983, "ejercito", "11821.88", "PISTOLA F.C. TAURUS PT 92 AF-D CAL 9 MM",
    "imagenes/073_Taurus_PT92.jpg",
    "Variante brasileña del Beretta 92, fabricada bajo licencia. Pistola militar histórica. Calibre 9mm: restringido a Fuerzas Armadas en México."),

  mk(28, "CZ P-10 S", "Ceska Zbrojovka", "pistola", "Rep. Checa", "9mm Parabellum", "12+1", "680g", "169mm", "Semi-auto, striker-fired subcompacta", 2018, "ejercito", "11866.24", "PISTOLA CAL 9mm CESKA MOD P-10 S",
    "imagenes/074_CZ_P-10_S.jpg",
    "Subcompact de la familia P-10. Calibre 9mm restringido a Fuerzas Armadas."),

  mk(29, "CZ P-10 C 9mm", "Ceska Zbrojovka", "pistola", "Rep. Checa", "9mm Parabellum", "15+1", "740g", "185mm", "Semi-auto, striker-fired", 2017, "ejercito", "12614.82", "PISTOLA 9mm CESKA CZ P-10 C",
    "imagenes/075_CZ_P-10_C_9mm.jpg",
    "Compact striker-fired checa. Excelente gatillo de fábrica. Calibre 9mm: restringido en México."),

  mk(30, "CZ P-10 F", "Ceska Zbrojovka", "pistola", "Rep. Checa", "9mm Parabellum", "19+1", "800g", "204mm", "Semi-auto, striker-fired full-size", 2018, "ejercito", "12614.82", "PISTOLA 9mm CESKA CZ P-10 F",
    "imagenes/076_CZ_P-10_F.webp",
    "Versión full-size de la P-10. Mayor capacidad. Calibre 9mm: restringido a Fuerzas Armadas."),

  mk(31, "CZ P-09", "Ceska Zbrojovka", "pistola", "Rep. Checa", "9mm Parabellum", "19+1", "870g", "207mm", "Semi-auto, DA/SA Omega", 2013, "ejercito", "13280.21", "PISTOLA 9mm CESKA CZ P-09",
    "imagenes/077_CZ_P-09.png",
    "Pistola de servicio checa de alta capacidad. Calibre 9mm: restringido en México."),

  mk(32, "CZ P-07 9mm", "Ceska Zbrojovka", "pistola", "Rep. Checa", "9mm Parabellum", "15+1", "800g", "185mm", "Semi-auto, DA/SA Omega", 2012, "ejercito", "13002.96", "PISTOLA 9mm CESKA CZ P-07",
    "imagenes/078_CZ_P-07_9mm.jpg",
    "Compact DA/SA con gatillo Omega intercambiable. Calibre 9mm: restringido a Fuerzas Armadas."),

  mk(33, "Canik METE SFX", "Canik", "pistola", "Turquía", "9mm Parabellum", "20+1", "850g", "210mm", "Semi-auto, striker-fired", 2021, "ejercito", "12420.74", "PISTOLA 9 MM CANIK MOD. METE SFX",
    "imagenes/079_Canik_METE_SFX.webp",
    "Pistola turca de competición con gatillo de clase mundial a precio accesible. Calibre 9mm: restringido en México."),

  mk(34, "Canik TP9 SF", "Canik", "pistola", "Turquía", "9mm Parabellum", "18+1", "750g", "196mm", "Semi-auto, striker-fired", 2018, "ejercito", "9814.60", "PISTOLA 9 MM CANIK TP9SF MOD. 2",
    "imagenes/080_Canik_TP9_SF.webp",
    "TP9 SF versión mejorada. Muy popular en Latinoamérica. Calibre 9mm: restringido a Fuerzas Armadas."),

  mk(35, "Canik SFX Rival", "Canik", "pistola", "Turquía", "9mm Parabellum", "18+1", "1020g", "216mm", "Semi-auto, striker-fired competición", 2022, "ejercito", "16219.05", "PISTOLA 9 MM CANIK MOD. SFX RIVAL",
    "imagenes/081_Canik_SFX_Rival.webp",
    "Versión de competición premium con armazón metálico parcial. Calibre 9mm: restringido en México."),

  mk(36, "Springfield XD-M", "Springfield", "pistola", "Croacia", "9mm Parabellum", "19+1", "800g", "198mm", "Semi-auto, striker-fired", 2008, "ejercito", "11062.22", "PISTOLA SEMI 9mm SPRINGFIELD XD-M",
    "imagenes/082_Springfield_XD-M.webp",
    "Fabricada por HS Produkt en Croacia. Indicador de cartucho visible. Calibre 9mm: restringido a Fuerzas Armadas."),

  mk(37, "IWI Masada", "IWI", "pistola", "Israel", "9mm Parabellum", "17+1", "740g", "192mm", "Semi-auto, striker-fired modular", 2019, "ejercito", "12309.84", "PISTOLA 9MM IWI MOD. MASADA",
    "imagenes/083_IWI_Masada.png",
    "Pistola modular israelí con chasis intercambiable. Calibre 9mm: restringido a Fuerzas Armadas."),

  mk(38, "IWI Jericho II Polymer", "IWI", "pistola", "Israel", "9mm Parabellum", "16+1", "820g", "205mm", "Semi-auto, DA/SA polímero", 2018, "ejercito", "12309.84", "PISTOLA 9MM IWI MOD JERICHO II C4.4",
    "imagenes/084_IWI_Jericho_II_Polymer.jpg",
    "Evolución de la Jericho 941. Cañón corto 4.4\". Calibre 9mm: restringido en México."),

  mk(39, "IWI Jericho F (acero)", "IWI", "pistola", "Israel", "9mm Parabellum", "16+1", "1100g", "207mm", "Semi-auto, DA/SA armazón metal", 1990, "ejercito", "14278.31", "PIST. IWI JERICHO F CAL 9X19MM",
    "imagenes/085_IWI_Jericho_F_acero.jpg",
    "Versión clásica con armazón de acero. Robustez probada. Calibre 9mm: restringido a Fuerzas Armadas."),

  mk(40, "Glock 19", "Glock", "pistola", "Austria", "9mm Parabellum", "15+1", "670g", "187mm", "Semi-auto, Safe Action striker", 1988, "ejercito", "14832.81", "PISTOLA CAL 9X19MM GLOCK MODELO 19",
    "imagenes/086_Glock_19.png",
    "La pistola de servicio más vendida del mundo. Calibre 9mm: en México restringido al uso exclusivo de Fuerzas Armadas."),

  mk(41, "SIG P320 Full Size", "SIG Sauer", "pistola", "EE.UU.", "9mm Parabellum", "17+1", "830g", "203mm", "Semi-auto, striker-fired modular", 2014, "ejercito", "15941.80", "PISTOLA CAL 9MM SIG SAUER P320 FULL",
    "imagenes/087_SIG_P320_Full_Size.jpg",
    "Pistola modular adoptada por el Ejército de EE.UU. como M17/M18. Calibre 9mm: restringido en México."),

  mk(42, "SIG P320 Carry", "SIG Sauer", "pistola", "EE.UU.", "9mm Parabellum", "17+1", "740g", "190mm", "Semi-auto, striker-fired", 2014, "ejercito", "16579.47", "PISTOLA CAL 9MM SIG SAUER P320 CARRY",
    "imagenes/088_SIG_P320_Carry.jpg",
    "Versión de portación de la P320. Mismo chasis modular. Calibre 9mm: restringido a Fuerzas Armadas."),

  mk(43, "SIG P320 X-Five FS", "SIG Sauer", "pistola", "EE.UU.", "9mm Parabellum", "21+1", "1050g", "224mm", "Semi-auto, striker competición", 2018, "ejercito", "30892.82", "PISTOLA 9MM SIG SAUER P320 X-FIVE FS",
    "imagenes/089_SIG_P320_X-Five_FS.webp",
    "Versión de competición de la P320. Cañón extendido, mira fibra óptica. Calibre 9mm: restringido."),

  mk(44, "SIG P320 Coyote", "SIG Sauer", "pistola", "EE.UU.", "9mm Parabellum", "17+1", "830g", "203mm", "Semi-auto, striker-fired", 2017, "ejercito", "19374.14", "PISTOLA 9MM COYOTE SIG SAUER P320",
    "imagenes/090_SIG_P320_Coyote.webp",
    "Variante color coyote tan, similar a la M17 militar. Calibre 9mm: restringido a Fuerzas Armadas."),

  mk(45, "Beretta PX4 Storm 9mm", "Beretta", "pistola", "Italia", "9mm Parabellum", "17+1", "785g", "192mm", "Semi-auto, DA/SA cañón rotativo", 2004, "ejercito", "11914.86", "PISTOLA CAL 9 MM BERETTA M PX4",
    "imagenes/091_Beretta_PX4_Storm_9mm.jpg",
    "Sistema de cañón rotativo único de Beretta. Calibre 9mm: restringido en México."),

  mk(46, "System Defence 9mm", "System Defence", "pistola", "Israel", "9mm Parabellum", "15+1", "780g", "188mm", "Semi-auto, striker-fired", 2020, "ejercito", "12476.19", "PISTOLA CAL 9mm SYSTEM DEFENCE",
    "imagenes/092_System_Defence_9mm.jpg",
    "Pistola israelí de servicio. Calibre 9mm: restringido a Fuerzas Armadas."),

  // ═══════════════════════════════════════════════════════════
  //  PISTOLAS .40 S&W — EXCLUSIVO EJÉRCITO
  // ═══════════════════════════════════════════════════════════
  mk(47, "Glock 22", "Glock", "pistola", "Austria", ".40 S&W", "15+1", "780g", "204mm", "Semi-auto, Safe Action striker", 1990, "ejercito", "12060.32", "PISTOLA CAL .40 S&W GLOCK MOD. 22",
    "imagenes/093_Glock_22.png",
    "Versión .40 S&W de la Glock full-size. Calibre de uso militar/policial — restringido a Fuerzas Armadas."),

  mk(48, "Beretta PX4 .40", "Beretta", "pistola", "Italia", ".40 S&W", "14+1", "820g", "192mm", "Semi-auto, DA/SA cañón rotativo", 2004, "ejercito", "12238.63", "PISTOLA CAL .40 S&W BERETTA PX4",
    "imagenes/094_Beretta_PX4_.40.webp",
    "PX4 Storm en calibre .40. Cañón rotativo absorbe parte del retroceso. Restringido a Fuerzas Armadas."),

  // ═══════════════════════════════════════════════════════════
  //  PISTOLA .38 SUPER — EXCLUSIVO EJÉRCITO
  // ═══════════════════════════════════════════════════════════
  mk(49, "Colt Government .38 Super", "Colt", "pistola", "EE.UU.", ".38 Super", "9+1", "1100g", "216mm", "Semi-auto, SA estilo 1911", 1929, "ejercito", "166349.22", "PISTOLA .38\" SUPER COLT GOVERNMENT",
    "imagenes/095_Colt_Government_.38_Super.webp",
    "1911 clásico en calibre .38 Super, históricamente popular en México. Acabado premium. Calibre .38 Super: restringido a Fuerzas Armadas."),

  // ═══════════════════════════════════════════════════════════
  //  RIFLES .22 LR — USO CIVIL
  // ═══════════════════════════════════════════════════════════
  mk(50, "Mendoza RM22-6000 Nogal", "Mendoza", "rifle", "México", ".22 LR", "10+1", "2700g", "1010mm", "Semi-auto, culata de nogal", 2015, "dcam", "8348.94", "RIFLE 22 MENDOZA RM22-6000 NOGAL",
    "imagenes/023_Mendoza_RM22-6000_Nogal.jpg",
    "Rifle deportivo mexicano de Productos Mendoza. Acción semi-automática .22 LR con culata de nogal tradicional. Ideal para tiro deportivo y caza menor."),

  mk(51, "Mendoza RM22-6000 Black", "Mendoza", "rifle", "México", ".22 LR", "10+1", "2700g", "1010mm", "Semi-auto, sintético negro", 2017, "dcam", "9760.66", "RIFLE 22 MENDOZA RM22-6000 A.",
    "imagenes/024_Mendoza_RM22-6000_Black.jpg",
    "Versión con culata sintética del RM22-6000. Resistente al clima, ideal para campo."),

  mk(52, "Mendoza RM22-6000 Squad", "Mendoza", "rifle", "México", ".22 LR", "10+1", "2750g", "1010mm", "Semi-auto, presentación táctica", 2019, "dcam", "9760.66", "RIFLE 22 MENDOZA RM22-6000 A. SQUAD",
    "imagenes/025_Mendoza_RM22-6000_Squad.jpg",
    "Edición con apariencia táctica del RM22-6000. Calibre .22 LR de libre adquisición civil."),

  mk(53, "Mendoza RM22-6000 Safari", "Mendoza", "rifle", "México", ".22 LR", "10+1", "2750g", "1010mm", "Semi-auto, camo safari", 2020, "dcam", "9760.66", "RIFLE 22 MENDOZA RM22-6000 A. SAFARI",
    "imagenes/026_Mendoza_RM22-6000_Safari.jpg",
    "Acabado camuflaje safari. Ideal para cacería menor y plinking."),

  mk(54, "Mendoza RM22-3000 Ergonómico", "Mendoza", "rifle", "México", ".22 LR", "10+1", "2850g", "1020mm", "Semi-auto, culata ergonómica", 2021, "dcam", "10833.88", "RIFLE 22 MENDOZA RM22-3000 ERG",
    "imagenes/027_Mendoza_RM22-3000_Ergonomico.jpg",
    "Línea ergonómica de Mendoza con empuñadura pistola. Mayor comodidad para sesiones largas."),

  mk(55, "Mendoza RM22-1000", "Mendoza", "rifle", "México", ".22 LR", "10+1", "2500g", "990mm", "Semi-auto, entrada de gama", 2014, "dcam", "5965.69", "RIFLE SEMI CAL 22 RM22-1000",
    "imagenes/028_Mendoza_RM22-1000.jpg",
    "El rifle .22 más económico del catálogo. Excelente para iniciarse en el tiro deportivo. Fabricado en México."),

  mk(56, "Mendoza Centenario", "Mendoza", "rifle", "México", ".22 LR", "10+1", "2700g", "1010mm", "Semi-auto edición conmemorativa", 2011, "dcam", "7028.28", "RIFLE SEMI CAL .22 MENDOZA CENTENARIO",
    "imagenes/029_Mendoza_Centenario.jpg",
    "Edición conmemorativa del centenario de la Revolución Mexicana. Pieza de colección y deporte."),

  mk(57, "CZ 457", "Ceska Zbrojovka", "rifle", "Rep. Checa", ".22 LR", "5", "2750g", "1010mm", "Cerrojo de precisión", 2019, "dcam", "21514.50", "RIFLE CAL .22 LR CESKA Z. MOD CZ 457",
    "imagenes/030_CZ_457.webp",
    "Rifle de cerrojo de precisión checo, referencia internacional. Excelente para tiro a 50m y caza menor."),

  // ═══════════════════════════════════════════════════════════
  //  RIFLES DE CACERÍA — USO CIVIL
  // ═══════════════════════════════════════════════════════════
  mk(58, "CZ 600 Alpha .243", "Ceska Zbrojovka", "rifle", "Rep. Checa", ".243 Winchester", "5", "2900g", "1080mm", "Cerrojo bolt-action", 2022, "dcam", "20960.00", "RIFLE CESKA Z. CZ 600 ALPHA CAL .243",
    "imagenes/031_CZ_600_Alpha_.243.jpg",
    "Nueva generación de rifles de cerrojo CZ. .243 Win: popular para venado y jabalí en México."),

  mk(59, "CZ 600 American", "Ceska Zbrojovka", "rifle", "Rep. Checa", ".308 Winchester", "5", "3100g", "1110mm", "Cerrojo bolt-action", 2023, "dcam", "24730.58", "RIFLE CESKA CZ 600 AMERICAN",
    "imagenes/032_CZ_600_American.jpg",
    "Versión americana del CZ 600 con culata clásica. Disponible en varios calibres para cacería mayor."),

  mk(60, "Franchi Horizon Elite", "Franchi", "rifle", "Italia", ".243 Winchester", "4+1", "2700g", "1080mm", "Cerrojo bolt-action", 2018, "dcam", "17580.90", "RIFLE 243 WIN FRANCHI HORIZON ELITE",
    "imagenes/033_Franchi_Horizon_Elite.png",
    "Rifle italiano de cerrojo con excelente acabado. Cañón flotante. Ideal para cazadores que valoran la estética europea."),

  mk(61, "Weatherby Vanguard .243", "Weatherby", "rifle", "EE.UU.", ".243 Winchester", "5", "3100g", "1100mm", "Cerrojo bolt-action", 2008, "dcam", "18506.91", "RIFLE 243 WIN WEATHERBY VANGUARD",
    "imagenes/034_Weatherby_Vanguard_.243.png",
    "Línea de entrada de Weatherby. .243 Win: calibre versátil para varmint y venado mediano."),

  mk(62, "Weatherby Vanguard .300", "Weatherby", "rifle", "EE.UU.", ".300 Win Mag", "3+1", "3300g", "1120mm", "Cerrojo bolt-action magnum", 2010, "dcam", "24375.71", "RIFLE CRJ WEATHERBY VANGUARD CAL .300",
    "imagenes/035_Weatherby_Vanguard_.300.jpg",
    ".300 Winchester Magnum es calibre premium para caza mayor a larga distancia. Excelente para borrego cimarrón."),

  mk(63, "Weatherby Vanguard 7mm", "Weatherby", "rifle", "EE.UU.", "7mm Rem Mag", "3+1", "3300g", "1120mm", "Cerrojo bolt-action magnum", 2010, "dcam", "24375.71", "RIFLE CRJ WEATHERBY VANGUARD CAL 7MM",
    "imagenes/036_Weatherby_Vanguard_7mm.png",
    "7mm Remington Magnum: balance ideal entre poder y retroceso. Excelente para caza de venado y berrendo."),

  mk(64, "Weatherby Vanguard 6.5 PRC", "Weatherby", "rifle", "EE.UU.", "6.5 PRC", "3+1", "3200g", "1110mm", "Cerrojo bolt-action moderno", 2020, "dcam", "24375.71", "RIFLE 6.5PRC WEATHERBY VANGUARD",
    "imagenes/037_Weatherby_Vanguard_6.5_PRC.png",
    "Nuevo calibre 6.5 Precision Rifle Cartridge. Diseñado para precisión a larga distancia. Tendencia entre cazadores modernos."),

  mk(65, "Winchester XPR Thumb .243", "Winchester", "rifle", "EE.UU.", ".243 Winchester", "3+1", "3000g", "1100mm", "Cerrojo, culata thumbhole", 2017, "dcam", "27724.87", "RIFLE WINCHESTER XPR V. THUMB L. CAL .243",
    "imagenes/038_Winchester_XPR_Thumb_.243.webp",
    "XPR con culata thumbhole laminada. Excelente ergonomía para sesiones largas en banco."),

  mk(66, "Winchester XPR Sintético .270", "Winchester", "rifle", "EE.UU.", ".270 Winchester", "3+1", "2950g", "1100mm", "Cerrojo bolt-action", 2015, "dcam", "22179.90", "RIFLE WINCHESTER XPR V. SINT. CAL .270",
    "imagenes/039_Winchester_XPR_Sintetico_.270.jpg",
    ".270 Winchester: el calibre por excelencia para venado cola blanca en el norte de México."),

  mk(67, "Winchester XPR Sintético .308", "Winchester", "rifle", "EE.UU.", ".308 Winchester", "3+1", "3000g", "1100mm", "Cerrojo bolt-action", 2015, "dcam", "22179.90", "RIFLE WINCHESTER XPR V. SINT. CAL .308",
    "imagenes/040_Winchester_XPR_Sintetico_.308.jpg",
    ".308 Winchester: balístico ideal para caza media y tiro a media distancia."),

  mk(68, "Winchester XPR Sintético .30-06", "Winchester", "rifle", "EE.UU.", ".30-06 Sprg", "3+1", "3050g", "1100mm", "Cerrojo bolt-action", 2015, "dcam", "22179.90", "RIFLE WINCHESTER XPR V. SINT. CAL .30-06",
    "imagenes/041_Winchester_XPR_Sintetico_.30-06.jpg",
    ".30-06 Springfield: calibre histórico americano, polivalente desde venado hasta alce."),

  // ═══════════════════════════════════════════════════════════
  //  RIFLES MILITARES (5.56, 7.62) — EXCLUSIVO EJÉRCITO
  // ═══════════════════════════════════════════════════════════
  mk(69, "Ruger AR-556", "Ruger", "carabina", "EE.UU.", "5.56x45mm", "30", "3200g", "850mm", "Semi-auto, plataforma AR-15", 2015, "ejercito", "31070.93", "RIFLE CAL 5.56X45 MM RUGER M AR-556",
    "imagenes/099_Ruger_AR-556.jpg",
    "Carabina semi-automática AR-15. En México el 5.56x45mm es calibre exclusivo de las Fuerzas Armadas."),

  mk(70, "SIG MCX", "SIG Sauer", "carabina", "EE.UU.", "5.56x45mm", "30", "3300g", "830mm", "Semi-auto, pistón corto", 2015, "ejercito", "54063.50", "RIFLE 5.56X45 mm SIG SAUER M SIG MCX",
    "imagenes/100_SIG_MCX.png",
    "Carabina táctica modular. Diseñada para operaciones especiales. Exclusiva de Fuerzas Armadas."),

  mk(71, "SIG M400", "SIG Sauer", "carabina", "EE.UU.", "5.56x45mm", "30", "3200g", "910mm", "Semi-auto, AR-15", 2010, "ejercito", "25395.98", "RIFLE 5.56 SIG SAUER SIG M400",
    "imagenes/101_SIG_M400.webp",
    "Línea de carabinas civiles AR-15 en EE.UU. En México, calibre 5.56: exclusivo de Fuerzas Armadas."),

  mk(72, "SIG 516", "SIG Sauer", "carabina", "EE.UU.", "5.56x45mm", "30", "3500g", "780mm", "Semi-auto, pistón corto", 2010, "ejercito", "40201.06", "RIFLE 5.56X45 SIG SAUER M SIG 516",
    "imagenes/102_SIG_516.jpg",
    "Sistema de pistón corto en plataforma AR. Mayor confiabilidad. Exclusivo de Fuerzas Armadas."),

  mk(73, "Rock River Arms LAR-15", "Rock River Arms", "carabina", "EE.UU.", "5.56x45mm", "30", "3000g", "730mm", "Semi-auto, AR-15 corto", 2012, "ejercito", "38814.82", "FUSIL 5.56X45 ROCK RIVER ARMS C 10.5\"",
    "imagenes/103_Rock_River_Arms_LAR-15.webp",
    "Versión corta tipo PDW para operaciones tácticas. Restringido a Fuerzas Armadas."),

  mk(74, "IWI Galil ACE 52", "IWI", "carabina", "Israel", "7.62x51mm", "20", "4000g", "950mm", "Semi-auto, basado en AK", 2010, "ejercito", "38814.82", "FUSIL CAL 7.62X51 mm GALIL IWI ACE 52",
    "imagenes/104_IWI_Galil_ACE_52.jpg",
    "Evolución moderna del Galil israelí en 7.62 OTAN. Robustez probada en combate. Exclusivo militar."),

  mk(75, "IWI Galil ACE 31", "IWI", "carabina", "Israel", "7.62x39mm", "30", "3500g", "780mm", "Semi-auto, basado en AK", 2014, "ejercito", "42696.30", "FUSIL 7.62X39 mm IWI M GALIL ACE 31",
    "imagenes/105_IWI_Galil_ACE_31.jpg",
    "Galil ACE en calibre del bloque oriental 7.62x39. Compatible con cargadores AK. Uso exclusivo militar."),

  mk(76, "IWI X95", "IWI", "carabina", "Israel", "5.56x45mm", "30", "3300g", "590mm", "Semi-auto, bullpup", 2009, "ejercito", "53259.48", "FUSIL 5.56X45 mm IWI MOD X95",
    "imagenes/106_IWI_X95.png",
    "Carabina bullpup de las fuerzas especiales israelíes. Compacta y precisa. Exclusiva militar."),

  mk(77, "CZ BREN 2", "Ceska Zbrojovka", "carabina", "Rep. Checa", "5.56x45mm", "30", "3600g", "700mm", "Semi-auto, pistón corto", 2018, "ejercito", "52815.88", "RIFLE CAL 5.56X45 mm CESKA BREN 2",
    "imagenes/107_CZ_BREN_2.jpg",
    "Fusil de asalto modular checo. Adoptado por varias fuerzas armadas. Exclusivo de Fuerzas Armadas en México."),

  mk(78, "IWI ARAD 5.56", "IWI", "carabina", "Israel", "5.56x45mm", "30", "3200g", "780mm", "Semi-auto, plataforma AR", 2022, "ejercito", "46106.46", "FUSIL 5.56X45MM IWI ARAD",
    "imagenes/108_IWI_ARAD_5.56.jpg",
    "Nueva carabina israelí compatible con accesorios AR-15. Exclusiva militar."),

  mk(79, "IWI ARAD 7", "IWI", "carabina", "Israel", "7.62x51mm", "20", "3800g", "920mm", "Semi-auto, plataforma AR-10", 2023, "ejercito", "47132.28", "FUSIL 7.62x51 MM IWI ARAD 7",
    "imagenes/109_IWI_ARAD_7.png",
    "Versión 7.62 OTAN del ARAD para tirador designado. Exclusiva militar."),

  // ═══════════════════════════════════════════════════════════
  //  RIFLES TIPPMANN — EXCLUSIVO OFICIALES (Ejército)
  // ═══════════════════════════════════════════════════════════
  mk(80, "Tippmann M4-22 Elite", "Tippmann", "rifle", "EE.UU.", ".22 LR", "25", "2800g", "850mm", "Semi-auto, réplica AR-15", 2019, "ejercito", "30497.36", "RIFLE 0.22 L.R. TIPPMANN M4-22 ELITE",
    "imagenes/096_Tippmann_M4-22_Elite.jpg",
    "Réplica .22 LR del M4. Venta EXCLUSIVA para Oficiales, Jefes y Generales del Ejército y Fuerza Aérea Mexicana, y equivalencias en la Armada de México."),

  mk(81, "Tippmann M4-22 Redline", "Tippmann", "rifle", "EE.UU.", ".22 LR", "25", "2800g", "850mm", "Semi-auto, edición Redline", 2021, "ejercito", "36042.33", "RIFLE 0.22 TIPPMANN M4-22 REDLINE",
    "imagenes/097_Tippmann_M4-22_Redline.jpg",
    "Edición Redline con detalles rojos. Venta exclusiva para Oficiales, Jefes y Generales del Ejército y Fuerza Aérea Mexicana."),

  mk(82, "Tippmann M4-22 OD-Green", "Tippmann", "rifle", "EE.UU.", ".22 LR", "25", "2800g", "850mm", "Semi-auto, edición OD-Green", 2020, "ejercito", "17189.42", "RIFLE CAL 22 TIPPMANN M4-22 OD-GREEN",
    "imagenes/098_Tippmann_M4-22_OD-Green.jpg",
    "Edición verde militar. Venta exclusiva para Oficiales del Ejército Mexicano."),

  // ═══════════════════════════════════════════════════════════
  //  SUBAMETRALLADORAS — EXCLUSIVO EJÉRCITO
  // ═══════════════════════════════════════════════════════════
  mk(83, "Emtan MZ-9S", "Emtan", "carabina", "Israel", "9mm Parabellum", "32", "2700g", "550mm", "Subametralladora, blow-back", 2017, "ejercito", "40700.11", "SUBAMETRALLADORA 9X19mm EMTAN MZ-9S",
    "imagenes/110_Emtan_MZ-9S.jpg",
    "Subametralladora israelí compacta. Exclusiva de Fuerzas Armadas."),

  mk(84, "IWI UZI Pro", "IWI", "carabina", "Israel", "9mm Parabellum", "20", "2300g", "470mm", "Subametralladora, blow-back compacta", 2010, "ejercito", "16634.92", "SUBAMETRALLADORA 9X19 I.W.I UZI PRO",
    "imagenes/111_IWI_UZI_Pro.jpg",
    "Versión moderna del histórico UZI. Compacta y confiable. Exclusiva militar."),

  // ═══════════════════════════════════════════════════════════
  //  ESCOPETAS — USO CIVIL (DCAM)
  // ═══════════════════════════════════════════════════════════
  mk(85, "Stoeger SP312", "Stoeger", "escopeta", "Turquía", "12 GA", "4+1", "3200g", "1240mm", "Semi-auto, pistón inercia", 2016, "dcam", "5989.81", "ESCOPETA CAL 12 GA STOEGER SP312",
    "imagenes/042_Stoeger_SP312.jpg",
    "Escopeta semi-automática económica y robusta. Excelente entrada al mundo de las escopetas para caza y deporte."),

  mk(86, "AYA Yuxtapuesta cal 12", "AYA", "escopeta", "España", "12 GA", "2", "3300g", "1180mm", "Yuxtapuesta, hecho a mano", 1995, "dcam", "431071.90", "ESCOPETA CAL 12 YUXTAPUESTA AYA",
    "imagenes/043_AYA_Yuxtapuesta_cal_12.jpg",
    "Escopeta yuxtapuesta artesanal española. Pieza de alta gama para coleccionistas y caza de pluma."),

  mk(87, "AYA Yuxtapuesta cal 20", "AYA", "escopeta", "España", "20 GA", "2", "2900g", "1160mm", "Yuxtapuesta, hecho a mano", 1995, "dcam", "713855.59", "ESCOPETA CAL 20 YUXTAPUESTA AYA",
    "imagenes/044_AYA_Yuxtapuesta_cal_20.jpg",
    "Versión calibre 20 de la yuxtapuesta AYA. Más ligera, ideal para perdiz y codorniz."),

  mk(88, "AYA Sobre Legend cal 20", "AYA", "escopeta", "España", "20 GA", "2", "3000g", "1170mm", "Superpuesta, hecho a mano", 2010, "dcam", "326428.34", "ESCOPETA CAL 20 SOBRE AYA LEGEND",
    "imagenes/045_AYA_Sobre_Legend_cal_20.jpg",
    "Superpuesta cal. 20 de la línea Legend de AYA. Tradición vasca de armería fina."),

  mk(89, "AYA Sobre cal 12", "AYA", "escopeta", "España", "12 GA", "2", "3400g", "1200mm", "Superpuesta, hecho a mano", 2005, "dcam", "446386.39", "ESCOPETA CAL 12 SOBRE AYA",
    "imagenes/046_AYA_Sobre_cal_12.jpg",
    "Superpuesta clásica calibre 12. Grabados artesanales. Pieza de tiro deportivo y caza."),

  mk(90, "AYA Senax DL C32", "AYA", "escopeta", "España", "12 GA", "2", "3500g", "1200mm", "Superpuesta premium", 2018, "dcam", "726418.00", "ESCOPETA CAL 12 SOBRE AYA SENAX DL C32",
    "imagenes/047_AYA_Senax_DL_C32.jpg",
    "Gama alta Senax DL de AYA. Bloques laterales grabados, madera selecta. Pieza de colección y exhibición."),

  mk(91, "Armsan P612 ASN", "Armsan", "escopeta", "Turquía", "12 GA", "4+1", "3100g", "1240mm", "Semi-auto inercial", 2018, "dcam", "10185.01", "ESCOPETA CAL 12 ARMSAN P612 ASN",
    "imagenes/048_Armsan_P612_ASN.jpg",
    "Semi-automática turca. Excelente relación calidad-precio. Cañón intercambiable para choke."),

  mk(92, "Armsan P612 AC", "Armsan", "escopeta", "Turquía", "12 GA", "4+1", "3100g", "1240mm", "Semi-auto inercial", 2020, "dcam", "13435.47", "ESCOPETA CAL 12 ARMSAN P612 AC",
    "imagenes/049_Armsan_P612_AC.webp",
    "Versión AC del P612 con acabado mejorado y accesorios incluidos."),

  mk(93, "Browning Maxus", "Browning", "escopeta", "Bélgica/EE.UU.", "12 GA", "4+1", "3200g", "1270mm", "Semi-auto, gas-operada", 2009, "dcam", "41725.93", "ESCOPETA SEMI BROWNING MAXUS CAL 12",
    "imagenes/050_Browning_Maxus.webp",
    "Semi-automática gas-operada de Browning. Sistema Power Drive Gas para confiabilidad con todo tipo de munición."),

  mk(94, "Winchester SX4", "Winchester", "escopeta", "Italia", "12 GA", "4+1", "3200g", "1240mm", "Semi-auto, gas-operada", 2016, "dcam", "27447.62", "ESCOPETA SEMI WINCHESTER SX4 CAL 12",
    "imagenes/051_Winchester_SX4.webp",
    "Cuarta generación del Super X de Winchester. Gas-operada, suave en disparo, robusta para campo."),

  mk(95, "Breda Astro cal 20", "Breda", "escopeta", "Italia", "20 GA", "4+1", "2700g", "1180mm", "Semi-auto un cañón", 2018, "dcam", "28168.29", "ESCOPETA SEMI 1 CAÑÓN BREDA ASTRO CAL 20",
    "imagenes/052_Breda_Astro_cal_20.jpg",
    "Semi-automática italiana ligera. Calibre 20 ideal para caza de pluma y deporte."),

  mk(96, "Breda cal 12 (28\")", "Breda", "escopeta", "Italia", "12 GA", "4+1", "3100g", "1180mm", "Semi-auto un cañón 28\"", 2019, "dcam", "28653.95", "ESCOPETA SEMI 1 CAÑÓN 28\" BREDA CAL 12",
    "imagenes/053_Breda_cal_12_28.png",
    "Versión calibre 12 cañón 28\". Ideal para todo tipo de caza menor y tiro deportivo."),

  mk(97, "Benelli M2 cal 20", "Benelli", "escopeta", "Italia", "20 GA", "4+1", "2800g", "1180mm", "Semi-auto, sistema inercial", 2010, "dcam", "43004.88", "ESCOPETA CAL 20 BENELLI M2 NEGRO",
    "imagenes/054_Benelli_M2_cal_20.webp",
    "Sistema inercial Benelli, referencia mundial. Calibre 20 ligero para caza de pluma."),

  mk(98, "Benelli Executive cal 12", "Benelli", "escopeta", "Italia", "12 GA", "4+1", "3200g", "1240mm", "Semi-auto, edición lujo grabada", 2008, "dcam", "124628.15", "ESCOPETA SEMI 12 BENELLI EXECUTIVE",
    "imagenes/055_Benelli_Executive_cal_12.webp",
    "Edición de lujo del legendario semi-automático Benelli. Grabados artesanales. Pieza de colección."),

  mk(99, "Huglu Atrox cal 12 (Bomba)", "Huglu", "escopeta", "Turquía", "12 GA", "5+1", "3100g", "1140mm", "Acción de bomba (pump)", 2018, "dcam", "12731.26", "ESCOPETA BOMBA 12 HUGLU ATROX",
    "imagenes/056_Huglu_Atrox_cal_12_Bomba.jpg",
    "Escopeta de corredera (pump-action). Confiable, económica. Excelente para defensa de hogar y campo."),

  mk(100, "Beretta DT11 Sport", "Beretta", "escopeta", "Italia", "12 GA", "2", "3900g", "1280mm", "Superpuesta competición", 2012, "dcam", "219647.87", "ESCOPETA CAL 12 BERETTA DT11 SPORT",
    "imagenes/057_Beretta_DT11_Sport.webp",
    "Superpuesta de competición top-tier. Estándar olímpico en trap y skeet. Pieza de tirador profesional."),

  mk(101, "Derya MR-S1", "Derya", "escopeta", "Turquía", "12 GA", "4+1", "3100g", "1240mm", "Semi-auto, sintética", 2020, "dcam", "43006.82", "ESCOPETA CAL 12 DERYA MR-S1 C 30\"",
    "imagenes/058_Derya_MR-S1.webp",
    "Semi-automática turca con cañón 30\". Buen acabado y precio competitivo."),

  mk(102, "Derya MR-100 cal 12", "Derya", "escopeta", "Turquía", "12 GA", "4+1", "3000g", "1200mm", "Semi-auto inercial", 2018, "dcam", "25773.04", "ESCOPETA CAL 12 DERYA MR-100 C 28\"",
    "imagenes/059_Derya_MR-100_cal_12.webp",
    "Semi-automática inercial de entrada de Derya. Buen valor para caza."),

  mk(103, "Derya AG410 cal .410", "Derya", "escopeta", "Turquía", ".410 Bore", "4+1", "2400g", "1130mm", "Semi-auto, ligera", 2020, "dcam", "15215.41", "ESCOPETA CAL 410 DERYA AG410 C 26\"",
    "imagenes/060_Derya_AG410_cal_.410.jpg",
    "Escopeta semi-automática calibre .410. Mínimo retroceso, ideal para iniciar tiradores jóvenes y caza menor."),

  mk(104, "Derya AG20 cal 20", "Derya", "escopeta", "Turquía", "20 GA", "4+1", "2700g", "1160mm", "Semi-auto, ligera", 2020, "dcam", "15370.67", "ESCOPETA CAL 20 DERYA AG20 C 26\"",
    "imagenes/061_Derya_AG20_cal_20.jpg",
    "Versión cal 20 de la AG, ligera y precisa para perdiz y codorniz."),

  mk(105, "Derya CR-101 (Bomba)", "Derya", "escopeta", "Turquía", "12 GA", "5+1", "3000g", "1150mm", "Acción de bomba (pump)", 2019, "dcam", "14594.37", "ESCOPETA BOMBA 12 DERYA CR-101 C28\"",
    "imagenes/062_Derya_CR-101_Bomba.webp",
    "Escopeta de corredera turca. Económica, confiable. Ideal para defensa de hogar."),

  mk(106, "Retay Masai Mara cal 12", "Retay", "escopeta", "Turquía", "12 GA", "4+1", "3200g", "1240mm", "Semi-auto inercial premium", 2017, "dcam", "22667.85", "ESCOPETA CAL 12 RETAY MASAI MARA",
    "imagenes/063_Retay_Masai_Mara_cal_12.webp",
    "Línea premium de Retay con sistema inercial. Acabados finos, gran confiabilidad."),

  mk(107, "Retay Masai Mara cal 20", "Retay", "escopeta", "Turquía", "20 GA", "4+1", "2900g", "1200mm", "Semi-auto inercial", 2018, "dcam", "24872.54", "ESCOPETA CAL 20 RETAY MASAI MARA",
    "imagenes/064_Retay_Masai_Mara_cal_20.webp",
    "Versión cal 20 del Masai Mara. Ligera y elegante para caza fina."),

  mk(108, "Retay Gordion cal 12", "Retay", "escopeta", "Turquía", "12 GA", "4+1", "3100g", "1240mm", "Semi-auto inercial", 2016, "dcam", "15432.77", "ESCOPETA SEMI 12 RETAY GORDION MAD",
    "imagenes/065_Retay_Gordion_cal_12.jpg",
    "Modelo Gordion con culata de madera. Excelente balance precio-calidad."),

  mk(109, "Retay GPSX (Bomba)", "Retay", "escopeta", "Turquía", "12 GA", "5+1", "3000g", "1150mm", "Acción de bomba (pump)", 2019, "dcam", "8228.74", "ESCOPETA BOMBA CAL 12 RETAY GPSX",
    "imagenes/066_Retay_GPSX_Bomba.png",
    "Pump-action Retay accesible. Robusta para defensa y campo."),

  mk(110, "Fair Lincoln G.", "Fair", "escopeta", "Italia", "12 GA", "2", "3300g", "1180mm", "Yuxtapuesta dos cañones", 2015, "dcam", "36197.87", "ESCOPETA 2 CAÑS FAIR LINCOLN G CM CAL 12",
    "imagenes/067_Fair_Lincoln_G..jpg",
    "Yuxtapuesta italiana Fair. Tradición lombarda en armería. Excelente para caza de pluma."),

  mk(111, "Fair SLX800P", "Fair", "escopeta", "Italia", "12 GA", "2", "3500g", "1200mm", "Superpuesta premium", 2018, "dcam", "60059.97", "ESCOPETA 2 CAÑS FAIR SLX800P CAL 12",
    "imagenes/068_Fair_SLX800P.jpg",
    "Superpuesta de gama media-alta. Bloques laterales grabados. Tiro deportivo y caza fina."),

];

// ──────────────────────────────────────────────────────────────
// Placeholder SVG por tipo (silueta táctica detallada)
// ──────────────────────────────────────────────────────────────
window.armaPlaceholder = function(arma) {
  const SIL = {
    pistola: `
      <rect x='150' y='90' width='140' height='15' />
      <rect x='282' y='95' width='16' height='5' />
      <path d='M 220,100 L 220,118 L 246,118 L 246,100' stroke-width='1.5' fill='none' />
      <path d='M 180,105 L 230,105 L 220,170 L 175,170 Z' />
      <rect x='185' y='110' width='35' height='2' opacity='0.4' />
      <rect x='188' y='130' width='28' height='32' opacity='0.6' />
    `,
    revolver: `
      <rect x='160' y='90' width='110' height='12' />
      <rect x='262' y='93' width='14' height='4' />
      <circle cx='205' cy='115' r='22' />
      <circle cx='205' cy='115' r='14' fill='black' opacity='0.4' />
      <path d='M 210,118 L 210,135 L 230,135 L 230,118' stroke-width='1.5' fill='none' />
      <path d='M 188,128 L 222,128 L 215,180 L 175,180 Z' />
    `,
    rifle: `
      <rect x='90' y='98' width='280' height='6' />
      <rect x='365' y='100' width='14' height='4' />
      <path d='M 200,100 L 200,118 L 226,118 L 226,100' stroke-width='1.5' fill='none' />
      <path d='M 180,104 L 240,104 L 230,140 L 200,140 Z' />
      <path d='M 90,104 L 200,104 L 195,128 L 90,128 Z' />
      <line x1='100' y1='110' x2='195' y2='110' stroke-width='0.6' opacity='0.4' />
      <line x1='100' y1='122' x2='195' y2='122' stroke-width='0.6' opacity='0.4' />
      <rect x='220' y='118' width='14' height='22' />
      <rect x='230' y='90' width='18' height='6' />
      <rect x='200' y='94' width='30' height='8' />
    `,
    escopeta: `
      <rect x='180' y='94' width='270' height='5' />
      <rect x='180' y='102' width='270' height='5' />
      <rect x='443' y='96' width='10' height='3' />
      <rect x='443' y='104' width='10' height='3' />
      <path d='M 196,108 L 196,124 L 220,124 L 220,108' stroke-width='1.4' fill='none' />
      <path d='M 30,98 L 198,98 L 198,108 L 30,124 Z' />
      <line x1='40' y1='105' x2='190' y2='105' stroke-width='0.7' opacity='0.4' />
      <line x1='40' y1='115' x2='190' y2='115' stroke-width='0.7' opacity='0.4' />
      <path d='M 150,110 L 162,110 L 162,138 L 142,138 Z' />
    `,
    carabina: `
      <rect x='350' y='95' width='45' height='5' />
      <rect x='388' y='91' width='14' height='13' />
      <rect x='180' y='90' width='180' height='14' />
      <rect x='155' y='86' width='12' height='5' />
      <path d='M 178,108 L 178,124 L 206,124 L 206,108' stroke-width='1.4' fill='none' />
      <path d='M 168,108 L 184,108 L 178,148 L 154,148 Z' />
      <path d='M 100,98 L 165,98 L 165,116 L 100,116 Z' />
      <line x1='105' y1='102' x2='160' y2='102' stroke-width='0.6' opacity='0.4' />
      <line x1='105' y1='112' x2='160' y2='112' stroke-width='0.6' opacity='0.4' />
      <rect x='90' y='100' width='12' height='14' />
      <path d='M 180,124 L 200,124 L 200,160 L 180,160 Z' />
      <line x1='184' y1='132' x2='196' y2='132' stroke-width='0.6' opacity='0.4' />
      <line x1='184' y1='140' x2='196' y2='140' stroke-width='0.6' opacity='0.4' />
      <line x1='184' y1='148' x2='196' y2='148' stroke-width='0.6' opacity='0.4' />
    `,
  };
  const shape = SIL[arma.tipo] || SIL.pistola;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 480 200' preserveAspectRatio='xMidYMid meet'>
    <defs>
      <linearGradient id='gradGun' x1='0' y1='0' x2='0' y2='1'>
        <stop offset='0' stop-color='%23c9a227' stop-opacity='0.95'/>
        <stop offset='1' stop-color='%238a6e1a' stop-opacity='0.85'/>
      </linearGradient>
      <pattern id='dot' patternUnits='userSpaceOnUse' width='10' height='10'>
        <circle cx='5' cy='5' r='0.5' fill='%23c9a227' opacity='0.15'/>
      </pattern>
    </defs>
    <rect width='480' height='200' fill='url(%23dot)'/>
    <g stroke='%23c9a227' stroke-width='0.6' opacity='0.25'>
      <line x1='240' y1='10' x2='240' y2='40'/>
      <line x1='240' y1='160' x2='240' y2='190'/>
      <line x1='10' y1='100' x2='40' y2='100'/>
      <line x1='440' y1='100' x2='470' y2='100'/>
      <circle cx='240' cy='100' r='90' fill='none'/>
    </g>
    <g fill='url(%23gradGun)' stroke='%23c9a227' stroke-width='1' stroke-linejoin='round'>
      ${shape.replace(/#/g, '%23')}
    </g>
    <text x='240' y='194' font-family='JetBrains Mono,monospace' font-size='7' fill='%236a685e' text-anchor='middle' letter-spacing='3'>${(arma.marca||'').toUpperCase()} · ${(arma.tipo||'').toUpperCase()}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + svg.replace(/\n\s+/g, '').replace(/#/g, '%23');
};

// si un arma no tiene imagen, asigna su placeholder al cargar
window.DB.forEach(a => { if (!a.img) a.img = window.armaPlaceholder(a); });

// helper de búsqueda usado por screens / admin
window.findArma = function(id) {
  if (id == null) return null;
  const nid = Number(id);
  return window.DB.find(a => a.id === nid) || null;
};

// helper visual: nivel de precio → cadena de "$" (1-5)
window.starsCost = function(lvl) {
  const n = Math.max(1, Math.min(5, Number(lvl) || 1));
  return '$'.repeat(n) + '·'.repeat(5 - n);
};

// helper: bandera emoji o código corto de país
window.countryFlag = function(pais) {
  const map = {
    'México':'🇲🇽','Mexico':'🇲🇽',
    'Brasil':'🇧🇷','Brazil':'🇧🇷',
    'Argentina':'🇦🇷',
    'EE.UU.':'🇺🇸','EEUU':'🇺🇸','Estados Unidos':'🇺🇸','USA':'🇺🇸',
    'Italia':'🇮🇹','Italy':'🇮🇹',
    'Austria':'🇦🇹',
    'Alemania':'🇩🇪',
    'España':'🇪🇸','Spain':'🇪🇸',
    'Bélgica/EE.UU.':'🇧🇪','Bélgica':'🇧🇪',
    'Rep. Checa':'🇨🇿','República Checa':'🇨🇿','Czech Republic':'🇨🇿',
    'Israel':'🇮🇱',
    'Turquía':'🇹🇷','Turkey':'🇹🇷',
    'Croacia':'🇭🇷',
    'Suiza':'🇨🇭',
    'Rusia':'🇷🇺',
  };
  return map[pais] || '🏳️';
};

// helper: extrae el video ID de una URL de YouTube (o devuelve el ID tal cual)
// Soporta: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, /shorts/ID
window.youtubeId = function(input) {
  if (!input || typeof input !== 'string') return '';
  const s = input.trim();
  if (!s) return '';
  // Si ya parece un ID (11 chars alfanuméricos + _-)
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  try {
    const m = s.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=|shorts\/|v\/))([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
  } catch (e) {}
  return '';
};
