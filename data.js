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
    legalDesc:  "Únicamente se distribuye a corporaciones de seguridad pública o privada con licencia colectiva vigente expedida por SEDENA. No se entrega a particulares. Las pistolas de cañón largo en calibre .380 también están restringidas a este uso.",
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
  mk(1, "Taurus TH380", "Taurus", "pistola", "Brasil", ".380 ACP", "15+1", "725g", "188mm", "Semi-auto, DA/SA", 2019, "dcam", "10061.26", "PISTOLA CAL .380 TAURUS TH380 PAVON",
    "imagenes/001_Taurus_TH380.webp",
    "Pistola compacta de servicio fabricada en Brasil. Calibre .380 ACP de libre adquisición para civiles. Excelente relación costo-beneficio y una de las más populares para defensa de domicilio."),

  mk(2, "Taurus PT58 Plus", "Taurus", "pistola", "Brasil", ".380 ACP", "19+1", "850g", "196mm", "Semi-auto, DA/SA", 2005, "dcam", "9870.04", "PISTOLA CAL .380 TAURUS PT58 PLUS",
    "imagenes/002_Taurus_PT58_Plus.webp",
    "Pistola full-size brasileña con capacidad ampliada de 19 cartuchos. Estructura de acero, doble acción/simple acción. Modelo clásico en el mercado mexicano para defensa domiciliaria."),

  mk(3, "Taurus PT59", "Taurus", "pistola", "Brasil", ".380 ACP", "16+1", "836g", "200mm", "Semi-auto, DA/SA", 2003, "dcam", "15610.41", "PISTOLA F.C. TAURUS PT 59 CAL .380",
    "imagenes/003_Taurus_PT59.webp",
    "Evolución del PT58 con cañón ligeramente más largo. Mecanismo doble acción / simple acción con seguro de descenso. Apreciada en clubes de tiro y por su capacidad."),

  mk(4, "Bersa Thunder 380", "Bersa", "pistola", "Argentina", ".380 ACP", "7+1", "565g", "165mm", "Semi-auto, DA/SA", 1995, "dcam", "9936.59", "PISTOLA CAL .380 BERSA THUNDER",
    "imagenes/004_Bersa_Thunder_380.webp",
    "Pistola compacta argentina inspirada en la Walther PPK. Una de las opciones más económicas y confiables en .380 ACP para portar oculto."),

  mk(5, "Ruger LCP", "Ruger", "pistola", "EE.UU.", ".380 ACP", "6+1", "270g", "133mm", "Semi-auto, DAO subcompacta", 2008, "dcam", "9110.35", "PISTOLA CAL .380 RUGER LCP NEGRO",
    "imagenes/005_Ruger_LCP.webp",
    "Lightweight Compact Pistol. Con 270g es una de las pistolas más ligeras del mundo en su calibre. Diseñada para portación oculta de respaldo."),

  mk(6, "Ruger LCP Max", "Ruger", "pistola", "EE.UU.", ".380 ACP", "10+1", "297g", "137mm", "Semi-auto, DAO subcompacta", 2021, "dcam", "14875.83", "PISTOLA CAL .380 RUGER LCPMAX",
    "imagenes/006_Ruger_LCP_Max.webp",
    "Evolución de la LCP con capacidad duplicada manteniendo dimensiones subcompactas. Excelente opción de defensa personal para portación discreta."),

  mk(7, "SIG Sauer P365", "SIG Sauer", "pistola", "EE.UU.", ".380 ACP", "10+1", "498g", "147mm", "Semi-auto, striker-fired micro", 2018, "dcam", "11400.39", "PISTOLA CAL .380 SIG SAUER P365 NIT",
    "imagenes/007_SIG_Sauer_P365.webp",
    "Revolucionó el segmento de subcompactas. Acabado nitrón resistente a la corrosión. Versión .380 disponible en México para civiles."),

  mk(8, "CZ P-07", "Ceska Zbrojovka", "pistola", "Rep. Checa", ".380 ACP", "15+1", "800g", "185mm", "Semi-auto, DA/SA con Omega trigger", 2012, "dcam", "11415.35", "PISTOLA CAL .380 CESKA CZ P-07",
    "imagenes/008_CZ_P-07.webp",
    "Pistola checa de servicio con sistema de gatillo Omega intercambiable. Variante .380 ACP especialmente fabricada para mercados con restricción de calibre."),

  mk(9, "CZ P-10 C", "Ceska Zbrojovka", "pistola", "Rep. Checa", ".380 ACP", "15+1", "740g", "185mm", "Semi-auto, striker-fired", 2017, "dcam", "11689.52", "PISTOLA CAL .380 CESKA CZ P-10 C 15C",
    "imagenes/009_CZ_P-10_C.webp",
    "Compact striker-fired checa con uno de los mejores gatillos de fábrica del mercado. Versión .380 para el mercado mexicano."),

  mk(10, "CZ Shadow 2", "Ceska Zbrojovka", "pistola", "Rep. Checa", ".380 ACP", "17+1", "1270g", "206mm", "Semi-auto, DA/SA armazón metálico", 2016, "dcam", "32376.72", "PISTOLA CAL .380 CESKA CZ SHADOW 2",
    "imagenes/010_CZ_Shadow_2.webp",
    "Pistola de competición premium. Armazón de aluminio, cañón de acero inoxidable. Elección de campeones de IPSC. Versión .380 hecha para el mercado mexicano."),

  mk(11, "Glock 25", "Glock", "pistola", "Austria", ".380 ACP", "15+1", "560g", "172mm", "Semi-auto, Safe Action striker", 1995, "dcam", "10842.09", "PISTOLA CAL .380 GLOCK MOD. 25",
    "imagenes/011_Glock_25.webp",
    "Diseñada específicamente para mercados como México y Brasil donde el 9mm tiene restricciones. Internamente similar a una Glock 19 pero en calibre civil."),

  mk(12, "Glock 28", "Glock", "pistola", "Austria", ".380 ACP", "10+1", "496g", "160mm", "Semi-auto, Safe Action striker", 1997, "dcam", "12060.32", "PISTOLA CAL .380 GLOCK MOD. 28",
    "imagenes/012_Glock_28.webp",
    "Versión subcompacta de la Glock 25 para portación oculta. Una de las Glock más pequeñas en calibre legal para civiles en México."),

  mk(13, "Beretta 80x Cheetah", "Beretta", "pistola", "Italia", ".380 ACP", "13+1", "780g", "182mm", "Semi-auto, DA/SA", 2023, "dcam", "13932.08", "PISTOLA CAL .380 BERETTA 80X NEGRO",
    "imagenes/013_Beretta_80x_Cheetah.webp",
    "Renacimiento moderno de la serie 80 de Beretta. Compacta en calibre .380, fabricada en Italia. Ideal para defensa de hogar con elegancia europea."),

  mk(14, "Browning 1911-380", "Browning", "pistola", "EE.UU.", ".380 ACP", "8+1", "453g", "190mm", "Semi-auto, SA estilo 1911", 2011, "dcam", "21070.90", "PISTOLA 380 ACP BROWNING 1911-380",
    "imagenes/014_Browning_1911-380.webp",
    "Versión a escala 85% del clásico 1911 de John Browning, en calibre civil .380 ACP. Mantiene la estética y el manejo del 1911 original."),

  // ═══════════════════════════════════════════════════════════
  //  PISTOLAS .380 CAÑÓN LARGO — RESTRINGIDAS (SEGURIDAD)
  // ═══════════════════════════════════════════════════════════
  mk(15, "Mendoza HM-7", "Mendoza", "pistola", "México", ".380 ACP", "12+1", "1100g", "280mm", "Semi-auto cañón largo, blow-back", 2010, "seguridad", "18648.29", "PISTOLA C/LARGO 380 MENDOZA HM-7",
    "imagenes/022_Mendoza_HM-7.webp",
    "Pistola mexicana de cañón largo en calibre .380. A pesar de ser .380, su configuración táctica la restringe únicamente a corporaciones de seguridad pública o privada con licencia colectiva. NO disponible para civiles."),

  // ═══════════════════════════════════════════════════════════
  //  PISTOLAS .22 LR — USO CIVIL (DCAM)
  // ═══════════════════════════════════════════════════════════
  mk(16, "Browning 1911-22", "Browning", "pistola", "EE.UU.", ".22 LR", "10+1", "440g", "190mm", "Semi-auto, SA estilo 1911", 2011, "dcam", "18021.17", "PIST. SEMIA. CAL .22 L.R. BROWNING 1911",
    "imagenes/015_Browning_1911-22.webp",
    "Versión .22 LR del clásico 1911. Excelente herramienta de entrenamiento económico para quienes manejan 1911 calibre mayor. Apta para tiro deportivo."),

  mk(17, "Browning Buck Mark", "Browning", "pistola", "EE.UU.", ".22 LR", "10+1", "964g", "240mm", "Semi-auto, blow-back competición", 1985, "dcam", "14456.12", "PISTOLA 22 L.R. BROWNING BUCKMARK",
    "imagenes/016_Browning_Buck_Mark.webp",
    "Pistola .22 LR de competición americana. Cañón fijo, gatillo de competencia. Una de las pistolas .22 más vendidas del mundo para tiro deportivo."),

  mk(18, "SIG Sauer P322", "SIG Sauer", "pistola", "EE.UU.", ".22 LR", "20+1", "478g", "188mm", "Semi-auto, blow-back", 2022, "dcam", "14206.87", "PISTOLA 22 LR SIG SAUER P322 NIT NEG",
    "imagenes/017_SIG_Sauer_P322.webp",
    "Pistola .22 LR moderna de SIG con capacidad de 20 cartuchos. Acabado nitrón, óptica-ready. Excelente herramienta de entrenamiento y deporte."),

  // ═══════════════════════════════════════════════════════════
  //  REVÓLVERES .38 SPECIAL — USO CIVIL (DCAM)
  // ═══════════════════════════════════════════════════════════
  mk(19, "Taurus 856 Acero Inox", "Taurus", "revolver", "Brasil", ".38 Special", "6", "626g", "190mm", "Revólver DA/SA cañón 3\"", 2018, "dcam", "9636.55", "REVOLVER TAURUS 856 CAÑÓN 3\" CAL .38 SPL AC INOX",
    "imagenes/018_Taurus_856_Acero_Inox.webp",
    "Revólver compacto de 6 tiros en acero inoxidable. Cañón 3\" balance ideal entre portabilidad y precisión. Excelente para defensa de hogar y portación."),

  mk(20, "Taurus 856 Pavón Mate", "Taurus", "revolver", "Brasil", ".38 Special", "6", "626g", "190mm", "Revólver DA/SA cañón 3\"", 2018, "dcam", "9273.65", "REVOLVER TAURUS 856 CAÑÓN 3\" CAL .38 SPL PV MT",
    "imagenes/019_Taurus_856_Pavon_Mate.webp",
    "Versión con acabado pavón mate del Taurus 856. Mismo desempeño, presentación táctica discreta."),

  mk(21, "Taurus 856 Tungsten", "Taurus", "revolver", "Brasil", ".38 Special", "6", "626g", "190mm", "Revólver DA/SA cañón 3\"", 2020, "dcam", "10725.24", "REVOLVER TAURUS 856 CAÑÓN 3\" CAL .38 SPL TUNGSTENO",
    "imagenes/020_Taurus_856_Tungsten.webp",
    "Acabado premium tungsteno del 856. Resistencia superior al desgaste y oxidación."),

  mk(22, "Ruger Wrangler", "Ruger", "revolver", "EE.UU.", ".22 LR", "6", "850g", "267mm", "Revólver SA single-action", 2019, "dcam", "22912.05", "REVOLVER CAL .22 RUGER",
    "imagenes/021_Ruger_Wrangler.webp",
    "Revólver de acción simple estilo western en .22 LR. Económico, divertido y educativo. Ideal para introducir nuevos tiradores al tiro deportivo."),

  // ═══════════════════════════════════════════════════════════
  //  PISTOLAS 9MM — EXCLUSIVO EJÉRCITO / SEGURIDAD
  // ═══════════════════════════════════════════════════════════
  mk(23, "Taurus TS9", "Taurus", "pistola", "Brasil", "9mm Parabellum", "17+1", "780g", "192mm", "Semi-auto, striker-fired", 2019, "ejercito", "8823.22", "PISTOLA CAL 9mm TAURUS TS9 PAVON",
    "imagenes/069_Taurus_TS9.webp",
    "Pistola full-size 9mm brasileña con mira tipo Glock. Calibre de uso restringido en México — únicamente Fuerzas Armadas y corporaciones autorizadas."),

  mk(24, "Taurus GX4", "Taurus", "pistola", "Brasil", "9mm Parabellum", "11+1", "530g", "158mm", "Semi-auto, striker-fired", 2021, "ejercito", "8484.25", "PISTOLA CAL 9mm TAURUS GX4",
    "imagenes/070_Taurus_GX4.webp",
    "Pistola compacta 9mm de Taurus para portar oculto. Calibre 9mm: uso reservado a Fuerzas Armadas en México."),

  mk(25, "Taurus GX4 XL", "Taurus", "pistola", "Brasil", "9mm Parabellum", "13+1", "570g", "175mm", "Semi-auto, striker-fired", 2022, "ejercito", "9516.11", "PISTOLA CAL 9mm TAURUS GX4XL",
    "imagenes/071_Taurus_GX4_XL.webp",
    "Versión de cañón largo de la GX4. Mayor velocidad de boca y mejor control. Restringida en México por su calibre 9mm."),

  mk(26, "Taurus GX4 Carry", "Taurus", "pistola", "Brasil", "9mm Parabellum", "13+1", "552g", "171mm", "Semi-auto, striker-fired", 2023, "ejercito", "8058.14", "PISTOLA F.C. TAURUS GX4 CARRY CAL 9MM",
    "imagenes/072_Taurus_GX4_Carry.webp",
    "Variante portación con cañón intermedio. Calibre 9mm restringido a Fuerzas Armadas."),

  mk(27, "Taurus PT92", "Taurus", "pistola", "Brasil", "9mm Parabellum", "17+1", "975g", "217mm", "Semi-auto, DA/SA full-size", 1983, "ejercito", "10627.74", "PISTOLA F.C. TAURUS PT 92 AF-D CAL 9 MM",
    "imagenes/073_Taurus_PT92.webp",
    "Variante brasileña del Beretta 92, fabricada bajo licencia. Pistola militar histórica. Calibre 9mm: restringido a Fuerzas Armadas en México."),

  mk(28, "CZ P-10 S", "Ceska Zbrojovka", "pistola", "Rep. Checa", "9mm Parabellum", "12+1", "680g", "169mm", "Semi-auto, striker-fired subcompacta", 2018, "ejercito", "11866.24", "PISTOLA CAL 9mm CESKA MOD P-10 S",
    "imagenes/074_CZ_P-10_S.webp",
    "Subcompact de la familia P-10. Calibre 9mm restringido a Fuerzas Armadas."),

  mk(29, "CZ P-10 C 9mm", "Ceska Zbrojovka", "pistola", "Rep. Checa", "9mm Parabellum", "15+1", "740g", "185mm", "Semi-auto, striker-fired", 2017, "ejercito", "11340.57", "PISTOLA 9mm CESKA CZ P-10 C",
    "imagenes/075_CZ_P-10_C_9mm.webp",
    "Compact striker-fired checa. Excelente gatillo de fábrica. Calibre 9mm: restringido en México."),

  mk(30, "CZ P-10 F", "Ceska Zbrojovka", "pistola", "Rep. Checa", "9mm Parabellum", "19+1", "800g", "204mm", "Semi-auto, striker-fired full-size", 2018, "ejercito", "11340.57", "PISTOLA 9mm CESKA CZ P-10 F",
    "imagenes/076_CZ_P-10_F.webp",
    "Versión full-size de la P-10. Mayor capacidad. Calibre 9mm: restringido a Fuerzas Armadas."),

  mk(31, "CZ P-09", "Ceska Zbrojovka", "pistola", "Rep. Checa", "9mm Parabellum", "19+1", "870g", "207mm", "Semi-auto, DA/SA Omega", 2013, "ejercito", "11938.76", "PISTOLA 9mm CESKA CZ P-09",
    "imagenes/077_CZ_P-09.webp",
    "Pistola de servicio checa de alta capacidad. Calibre 9mm: restringido en México."),

  mk(32, "CZ P-07 9mm", "Ceska Zbrojovka", "pistola", "Rep. Checa", "9mm Parabellum", "15+1", "800g", "185mm", "Semi-auto, DA/SA Omega", 2012, "ejercito", "13002.96", "PISTOLA 9mm CESKA CZ P-07",
    "imagenes/078_CZ_P-07_9mm.webp",
    "Compact DA/SA con gatillo Omega intercambiable. Calibre 9mm: restringido a Fuerzas Armadas."),

  mk(33, "Canik METE SFX", "Canik", "pistola", "Turquía", "9mm Parabellum", "20+1", "850g", "210mm", "Semi-auto, striker-fired", 2021, "ejercito", "11166.10", "PISTOLA 9 MM CANIK MOD. METE SFX",
    "imagenes/079_Canik_METE_SFX.webp",
    "Pistola turca de competición con gatillo de clase mundial a precio accesible. Calibre 9mm: restringido en México."),

  mk(34, "Canik TP9 SF", "Canik", "pistola", "Turquía", "9mm Parabellum", "18+1", "750g", "196mm", "Semi-auto, striker-fired", 2018, "ejercito", "8823.22", "PISTOLA 9 MM CANIK TP9SF MOD. 2",
    "imagenes/080_Canik_TP9_SF.webp",
    "TP9 SF versión mejorada. Muy popular en Latinoamérica. Calibre 9mm: restringido a Fuerzas Armadas."),

  mk(35, "Canik SFX Rival", "Canik", "pistola", "Turquía", "9mm Parabellum", "18+1", "1020g", "216mm", "Semi-auto, striker-fired competición", 2022, "ejercito", "16219.05", "PISTOLA 9 MM CANIK MOD. SFX RIVAL",
    "imagenes/081_Canik_SFX_Rival.webp",
    "Versión de competición premium con armazón metálico parcial. Calibre 9mm: restringido en México."),

  mk(36, "Springfield XD-M", "Springfield", "pistola", "Croacia", "9mm Parabellum", "19+1", "800g", "198mm", "Semi-auto, striker-fired", 2008, "ejercito", "10272.02", "PISTOLA SEMI 9mm SPRINGFIELD XD-M",
    "imagenes/082_Springfield_XD-M.webp",
    "Fabricada por HS Produkt en Croacia. Indicador de cartucho visible. Calibre 9mm: restringido a Fuerzas Armadas."),

  mk(37, "IWI Masada", "IWI", "pistola", "Israel", "9mm Parabellum", "17+1", "740g", "192mm", "Semi-auto, striker-fired modular", 2019, "ejercito", "11066.41", "PISTOLA 9MM IWI MOD. MASADA",
    "imagenes/083_IWI_Masada.webp",
    "Pistola modular israelí con chasis intercambiable. Calibre 9mm: restringido a Fuerzas Armadas."),

  mk(38, "IWI Jericho II Polymer", "IWI", "pistola", "Israel", "9mm Parabellum", "16+1", "820g", "205mm", "Semi-auto, DA/SA polímero", 2018, "ejercito", "11066.41", "PISTOLA 9MM IWI MOD JERICHO II C4.4",
    "imagenes/084_IWI_Jericho_II_Polymer.webp",
    "Evolución de la Jericho 941. Cañón corto 4.4\". Calibre 9mm: restringido en México."),

  mk(39, "IWI Jericho F (acero)", "IWI", "pistola", "Israel", "9mm Parabellum", "16+1", "1100g", "207mm", "Semi-auto, DA/SA armazón metal", 1990, "ejercito", "14278.31", "PIST. IWI JERICHO F CAL 9X19MM",
    "imagenes/085_IWI_Jericho_F_acero.webp",
    "Versión clásica con armazón de acero. Robustez probada. Calibre 9mm: restringido a Fuerzas Armadas."),

  mk(40, "Glock 19", "Glock", "pistola", "Austria", "9mm Parabellum", "15+1", "670g", "187mm", "Semi-auto, Safe Action striker", 1988, "ejercito", "10842.09", "PISTOLA CAL 9X19MM GLOCK MODELO 19",
    "imagenes/086_Glock_19.webp",
    "La pistola de servicio más vendida del mundo. Calibre 9mm: en México restringido al uso exclusivo de Fuerzas Armadas."),

  mk(41, "SIG P320 Full Size", "SIG Sauer", "pistola", "EE.UU.", "9mm Parabellum", "17+1", "830g", "203mm", "Semi-auto, striker-fired modular", 2014, "ejercito", "14331.50", "PISTOLA CAL 9MM SIG SAUER P320 FULL",
    "imagenes/087_SIG_P320_Full_Size.webp",
    "Pistola modular adoptada por el Ejército de EE.UU. como M17/M18. Calibre 9mm: restringido en México."),

  mk(42, "SIG P320 Carry", "SIG Sauer", "pistola", "EE.UU.", "9mm Parabellum", "17+1", "740g", "190mm", "Semi-auto, striker-fired", 2014, "ejercito", "14904.76", "PISTOLA CAL 9MM SIG SAUER P320 CARRY",
    "imagenes/088_SIG_P320_Carry.webp",
    "Versión de portación de la P320. Mismo chasis modular. Calibre 9mm: restringido a Fuerzas Armadas."),

  mk(43, "SIG P320 X-Five FS", "SIG Sauer", "pistola", "EE.UU.", "9mm Parabellum", "21+1", "1050g", "224mm", "Semi-auto, striker competición", 2018, "ejercito", "27772.29", "PISTOLA 9MM SIG SAUER P320 X-FIVE FS",
    "imagenes/089_SIG_P320_X-Five_FS.webp",
    "Versión de competición de la P320. Cañón extendido, mira fibra óptica. Calibre 9mm: restringido."),

  mk(44, "SIG P320 Coyote", "SIG Sauer", "pistola", "EE.UU.", "9mm Parabellum", "17+1", "830g", "203mm", "Semi-auto, striker-fired", 2017, "ejercito", "17417.13", "PISTOLA 9MM COYOTE SIG SAUER P320",
    "imagenes/090_SIG_P320_Coyote.webp",
    "Variante color coyote tan, similar a la M17 militar. Calibre 9mm: restringido a Fuerzas Armadas."),

  mk(45, "Beretta PX4 Storm 9mm", "Beretta", "pistola", "Italia", "9mm Parabellum", "17+1", "785g", "192mm", "Semi-auto, DA/SA cañón rotativo", 2004, "ejercito", "10636.94", "PISTOLA CAL 9 MM BERETTA M PX4",
    "imagenes/091_Beretta_PX4_Storm_9mm.webp",
    "Sistema de cañón rotativo único de Beretta. Calibre 9mm: restringido en México."),

  mk(46, "System Defence 9mm", "System Defence", "pistola", "Israel", "9mm Parabellum", "15+1", "780g", "188mm", "Semi-auto, striker-fired", 2020, "ejercito", "10430.94", "PISTOLA CAL 9mm SYSTEM DEFENCE",
    "imagenes/092_System_Defence_9mm.webp",
    "Pistola israelí de servicio. Calibre 9mm: restringido a Fuerzas Armadas."),

  // ═══════════════════════════════════════════════════════════
  //  PISTOLAS .40 S&W — EXCLUSIVO EJÉRCITO
  // ═══════════════════════════════════════════════════════════
  mk(47, "Glock 22", "Glock", "pistola", "Austria", ".40 S&W", "15+1", "780g", "204mm", "Semi-auto, Safe Action striker", 1990, "ejercito", "10842.09", "PISTOLA CAL .40 S&W GLOCK MOD. 22",
    "imagenes/093_Glock_22.webp",
    "Versión .40 S&W de la Glock full-size. Calibre de uso militar/policial — restringido a Fuerzas Armadas."),

  mk(48, "Beretta PX4 .40", "Beretta", "pistola", "Italia", ".40 S&W", "14+1", "820g", "192mm", "Semi-auto, DA/SA cañón rotativo", 2004, "ejercito", "10925.99", "PISTOLA CAL .40 S&W BERETTA PX4",
    "imagenes/094_Beretta_PX4_.40.webp",
    "PX4 Storm en calibre .40. Cañón rotativo absorbe parte del retroceso. Restringido a Fuerzas Armadas."),

  // ═══════════════════════════════════════════════════════════
  //  PISTOLA .38 SUPER — EXCLUSIVO EJÉRCITO
  // ═══════════════════════════════════════════════════════════
  mk(49, "Colt Government .38 Super", "Colt", "pistola", "EE.UU.", ".38 Super", "9+1", "1100g", "216mm", "Semi-auto, SA estilo 1911", 1929, "ejercito", "149546.04", "PISTOLA .38\" SUPER COLT GOVERNMENT",
    "imagenes/095_Colt_Government_.38_Super.webp",
    "1911 clásico en calibre .38 Super, históricamente popular en México. Acabado premium. Calibre .38 Super: restringido a Fuerzas Armadas."),

  // ═══════════════════════════════════════════════════════════
  //  RIFLES .22 LR — USO CIVIL
  // ═══════════════════════════════════════════════════════════
  mk(50, "Mendoza RM22-6000 Nogal", "Mendoza", "rifle", "México", ".22 LR", "10+1", "2700g", "1010mm", "Semi-auto, culata de nogal", 2015, "dcam", "8348.94", "RIFLE 22 MENDOZA RM22-6000 NOGAL",
    "imagenes/023_Mendoza_RM22-6000_Nogal.webp",
    "Rifle deportivo mexicano de Productos Mendoza. Acción semi-automática .22 LR con culata de nogal tradicional. Ideal para tiro deportivo y caza menor."),

  mk(51, "Mendoza RM22-6000 Black", "Mendoza", "rifle", "México", ".22 LR", "10+1", "2700g", "1010mm", "Semi-auto, sintético negro", 2017, "dcam", "9760.66", "RIFLE 22 MENDOZA RM22-6000 A.",
    "imagenes/024_Mendoza_RM22-6000_Black.webp",
    "Versión con culata sintética del RM22-6000. Resistente al clima, ideal para campo."),

  mk(52, "Mendoza RM22-6000 Squad", "Mendoza", "rifle", "México", ".22 LR", "10+1", "2750g", "1010mm", "Semi-auto, presentación táctica", 2019, "dcam", "9760.66", "RIFLE 22 MENDOZA RM22-6000 A. SQUAD",
    "imagenes/025_Mendoza_RM22-6000_Squad.webp",
    "Edición con apariencia táctica del RM22-6000. Calibre .22 LR de libre adquisición civil."),

  mk(53, "Mendoza RM22-6000 Safari", "Mendoza", "rifle", "México", ".22 LR", "10+1", "2750g", "1010mm", "Semi-auto, camo safari", 2020, "dcam", "9760.66", "RIFLE 22 MENDOZA RM22-6000 A. SAFARI",
    "imagenes/026_Mendoza_RM22-6000_Safari.webp",
    "Acabado camuflaje safari. Ideal para cacería menor y plinking."),

  mk(54, "Mendoza RM22-3000 Ergonómico", "Mendoza", "rifle", "México", ".22 LR", "10+1", "2850g", "1020mm", "Semi-auto, culata ergonómica", 2021, "dcam", "10833.88", "RIFLE 22 MENDOZA RM22-3000 ERG",
    "imagenes/027_Mendoza_RM22-3000_Ergonomico.webp",
    "Línea ergonómica de Mendoza con empuñadura pistola. Mayor comodidad para sesiones largas."),

  mk(55, "Mendoza RM22-1000", "Mendoza", "rifle", "México", ".22 LR", "10+1", "2500g", "990mm", "Semi-auto, entrada de gama", 2014, "dcam", "5965.69", "RIFLE SEMI CAL 22 RM22-1000",
    "imagenes/028_Mendoza_RM22-1000.webp",
    "El rifle .22 más económico del catálogo. Excelente para iniciarse en el tiro deportivo. Fabricado en México."),

  mk(56, "Mendoza Centenario", "Mendoza", "rifle", "México", ".22 LR", "10+1", "2700g", "1010mm", "Semi-auto edición conmemorativa", 2011, "dcam", "7028.28", "RIFLE SEMI CAL .22 MENDOZA CENTENARIO",
    "imagenes/029_Mendoza_Centenario.webp",
    "Edición conmemorativa del centenario de la Revolución Mexicana. Pieza de colección y deporte."),

  mk(57, "CZ 457", "Ceska Zbrojovka", "rifle", "Rep. Checa", ".22 LR", "5", "2750g", "1010mm", "Cerrojo de precisión", 2019, "dcam", "12935.73", "RIFLE CAL .22 LR CESKA Z. MOD CZ 457",
    "imagenes/030_CZ_457.webp",
    "Rifle de cerrojo de precisión checo, referencia internacional. Excelente para tiro a 50m y caza menor."),

  // ═══════════════════════════════════════════════════════════
  //  RIFLES DE CACERÍA — USO CIVIL
  // ═══════════════════════════════════════════════════════════
  mk(58, "CZ 600 Alpha .243", "Ceska Zbrojovka", "rifle", "Rep. Checa", ".243 Winchester", "5", "2900g", "1080mm", "Cerrojo bolt-action", 2022, "dcam", "18842.80", "RIFLE CESKA Z. CZ 600 ALPHA CAL .243",
    "imagenes/031_CZ_600_Alpha_.243.webp",
    "Nueva generación de rifles de cerrojo CZ. .243 Win: popular para venado y jabalí en México."),

  mk(59, "CZ 600 American", "Ceska Zbrojovka", "rifle", "Rep. Checa", ".308 Winchester", "5", "3100g", "1110mm", "Cerrojo bolt-action", 2023, "dcam", "22232.51", "RIFLE CESKA CZ 600 AMERICAN",
    "imagenes/032_CZ_600_American.webp",
    "Versión americana del CZ 600 con culata clásica. Disponible en varios calibres para cacería mayor."),

  mk(60, "Franchi Horizon Elite", "Franchi", "rifle", "Italia", ".243 Winchester", "4+1", "2700g", "1080mm", "Cerrojo bolt-action", 2018, "dcam", "17580.90", "RIFLE 243 WIN FRANCHI HORIZON ELITE",
    "imagenes/033_Franchi_Horizon_Elite.webp",
    "Rifle italiano de cerrojo con excelente acabado. Cañón flotante. Ideal para cazadores que valoran la estética europea."),

  mk(61, "Weatherby Vanguard .243", "Weatherby", "rifle", "EE.UU.", ".243 Winchester", "5", "3100g", "1100mm", "Cerrojo bolt-action", 2008, "dcam", "18506.91", "RIFLE 243 WIN WEATHERBY VANGUARD",
    "imagenes/034_Weatherby_Vanguard_.243.webp",
    "Línea de entrada de Weatherby. .243 Win: calibre versátil para varmint y venado mediano."),

  mk(62, "Weatherby Vanguard .300", "Weatherby", "rifle", "EE.UU.", ".300 Win Mag", "3+1", "3300g", "1120mm", "Cerrojo bolt-action magnum", 2010, "dcam", "24375.71", "RIFLE CRJ WEATHERBY VANGUARD CAL .300",
    "imagenes/035_Weatherby_Vanguard_.300.webp",
    ".300 Winchester Magnum es calibre premium para caza mayor a larga distancia. Excelente para borrego cimarrón."),

  mk(63, "Weatherby Vanguard 7mm", "Weatherby", "rifle", "EE.UU.", "7mm Rem Mag", "3+1", "3300g", "1120mm", "Cerrojo bolt-action magnum", 2010, "dcam", "24375.71", "RIFLE CRJ WEATHERBY VANGUARD CAL 7MM",
    "imagenes/036_Weatherby_Vanguard_7mm.webp",
    "7mm Remington Magnum: balance ideal entre poder y retroceso. Excelente para caza de venado y berrendo."),

  mk(64, "Weatherby Vanguard 6.5 PRC", "Weatherby", "rifle", "EE.UU.", "6.5 PRC", "3+1", "3200g", "1110mm", "Cerrojo bolt-action moderno", 2020, "dcam", "24375.71", "RIFLE 6.5PRC WEATHERBY VANGUARD",
    "imagenes/037_Weatherby_Vanguard_6.5_PRC.webp",
    "Nuevo calibre 6.5 Precision Rifle Cartridge. Diseñado para precisión a larga distancia. Tendencia entre cazadores modernos."),

  mk(65, "Winchester XPR Thumb .243", "Winchester", "rifle", "EE.UU.", ".243 Winchester", "3+1", "3000g", "1100mm", "Cerrojo, culata thumbhole", 2017, "dcam", "27724.87", "RIFLE WINCHESTER XPR V. THUMB L. CAL .243",
    "imagenes/038_Winchester_XPR_Thumb_.243.webp",
    "XPR con culata thumbhole laminada. Excelente ergonomía para sesiones largas en banco."),

  mk(66, "Winchester XPR Sintético .270", "Winchester", "rifle", "EE.UU.", ".270 Winchester", "3+1", "2950g", "1100mm", "Cerrojo bolt-action", 2015, "dcam", "22179.90", "RIFLE WINCHESTER XPR V. SINT. CAL .270",
    "imagenes/039_Winchester_XPR_Sintetico_.270.webp",
    ".270 Winchester: el calibre por excelencia para venado cola blanca en el norte de México."),

  mk(67, "Winchester XPR Sintético .308", "Winchester", "rifle", "EE.UU.", ".308 Winchester", "3+1", "3000g", "1100mm", "Cerrojo bolt-action", 2015, "dcam", "19939.47", "RIFLE WINCHESTER XPR V. SINT. CAL .308",
    "imagenes/040_Winchester_XPR_Sintetico_.308.webp",
    ".308 Winchester: balístico ideal para caza media y tiro a media distancia."),

  mk(68, "Winchester XPR Sintético .30-06", "Winchester", "rifle", "EE.UU.", ".30-06 Sprg", "3+1", "3050g", "1100mm", "Cerrojo bolt-action", 2015, "dcam", "19939.47", "RIFLE WINCHESTER XPR V. SINT. CAL .30-06",
    "imagenes/041_Winchester_XPR_Sintetico_.30-06.webp",
    ".30-06 Springfield: calibre histórico americano, polivalente desde venado hasta alce."),

  // ═══════════════════════════════════════════════════════════
  //  RIFLES MILITARES (5.56, 7.62) — EXCLUSIVO EJÉRCITO
  // ═══════════════════════════════════════════════════════════
  mk(69, "Ruger AR-556", "Ruger", "carabina", "EE.UU.", "5.56x45mm", "30", "3200g", "850mm", "Semi-auto, plataforma AR-15", 2015, "ejercito", "27932.41", "RIFLE CAL 5.56X45 MM RUGER M AR-556",
    "imagenes/099_Ruger_AR-556.webp",
    "Carabina semi-automática AR-15. En México el 5.56x45mm es calibre exclusivo de las Fuerzas Armadas."),

  mk(70, "SIG MCX", "SIG Sauer", "carabina", "EE.UU.", "5.56x45mm", "30", "3300g", "830mm", "Semi-auto, pistón corto", 2015, "ejercito", "54063.50", "RIFLE 5.56X45 mm SIG SAUER M SIG MCX",
    "imagenes/100_SIG_MCX.webp",
    "Carabina táctica modular. Diseñada para operaciones especiales. Exclusiva de Fuerzas Armadas."),

  mk(71, "SIG M400", "SIG Sauer", "carabina", "EE.UU.", "5.56x45mm", "30", "3200g", "910mm", "Semi-auto, AR-15", 2010, "ejercito", "25395.98", "RIFLE 5.56 SIG SAUER SIG M400",
    "imagenes/101_SIG_M400.webp",
    "Línea de carabinas civiles AR-15 en EE.UU. En México, calibre 5.56: exclusivo de Fuerzas Armadas."),

  mk(72, "SIG 516", "SIG Sauer", "carabina", "EE.UU.", "5.56x45mm", "30", "3500g", "780mm", "Semi-auto, pistón corto", 2010, "ejercito", "40201.06", "RIFLE 5.56X45 SIG SAUER M SIG 516",
    "imagenes/102_SIG_516.webp",
    "Sistema de pistón corto en plataforma AR. Mayor confiabilidad. Exclusivo de Fuerzas Armadas."),

  mk(73, "Rock River Arms LAR-15", "Rock River Arms", "carabina", "EE.UU.", "5.56x45mm", "30", "3000g", "730mm", "Semi-auto, AR-15 corto", 2012, "ejercito", "34894.08", "FUSIL 5.56X45 ROCK RIVER ARMS C 10.5\"",
    "imagenes/103_Rock_River_Arms_LAR-15.webp",
    "Versión corta tipo PDW para operaciones tácticas. Restringido a Fuerzas Armadas."),

  mk(74, "IWI Galil ACE 52", "IWI", "carabina", "Israel", "7.62x51mm", "20", "4000g", "950mm", "Semi-auto, basado en AK", 2010, "ejercito", "34894.08", "FUSIL CAL 7.62X51 mm GALIL IWI ACE 52",
    "imagenes/104_IWI_Galil_ACE_52.webp",
    "Evolución moderna del Galil israelí en 7.62 OTAN. Robustez probada en combate. Exclusivo militar."),

  mk(75, "IWI Galil ACE 31", "IWI", "carabina", "Israel", "7.62x39mm", "30", "3500g", "780mm", "Semi-auto, basado en AK", 2014, "ejercito", "38383.48", "FUSIL 7.62X39 mm IWI M GALIL ACE 31",
    "imagenes/105_IWI_Galil_ACE_31.webp",
    "Galil ACE en calibre del bloque oriental 7.62x39. Compatible con cargadores AK. Uso exclusivo militar."),

  mk(76, "IWI X95", "IWI", "carabina", "Israel", "5.56x45mm", "30", "3300g", "590mm", "Semi-auto, bullpup", 2009, "ejercito", "47879.66", "FUSIL 5.56X45 mm IWI MOD X95",
    "imagenes/106_IWI_X95.webp",
    "Carabina bullpup de las fuerzas especiales israelíes. Compacta y precisa. Exclusiva militar."),

  mk(77, "CZ BREN 2", "Ceska Zbrojovka", "carabina", "Rep. Checa", "5.56x45mm", "30", "3600g", "700mm", "Semi-auto, pistón corto", 2018, "ejercito", "47480.87", "RIFLE CAL 5.56X45 mm CESKA BREN 2",
    "imagenes/107_CZ_BREN_2.webp",
    "Fusil de asalto modular checo. Adoptado por varias fuerzas armadas. Exclusivo de Fuerzas Armadas en México."),

  mk(78, "IWI ARAD 5.56", "IWI", "carabina", "Israel", "5.56x45mm", "30", "3200g", "780mm", "Semi-auto, plataforma AR", 2022, "ejercito", "46106.46", "FUSIL 5.56X45MM IWI ARAD",
    "imagenes/108_IWI_ARAD_5.56.webp",
    "Nueva carabina israelí compatible con accesorios AR-15. Exclusiva militar."),

  mk(79, "IWI ARAD 7", "IWI", "carabina", "Israel", "7.62x51mm", "20", "3800g", "920mm", "Semi-auto, plataforma AR-10", 2023, "ejercito", "42371.38", "FUSIL 7.62x51 MM IWI ARAD 7",
    "imagenes/109_IWI_ARAD_7.webp",
    "Fusil de combate de IWI en 7.62×51 mm OTAN sobre plataforma modular tipo AR-10, de uso general (versión militar select-fire). Robusto y versátil para servicio. La variante de precisión de tirador designado se cataloga aparte como ARAD 7 DMR (id 128)."),

  // ═══════════════════════════════════════════════════════════
  //  RIFLES TIPPMANN — EXCLUSIVO OFICIALES (Ejército)
  // ═══════════════════════════════════════════════════════════
  mk(80, "Tippmann M4-22 Elite", "Tippmann", "rifle", "EE.UU.", ".22 LR", "25", "2800g", "850mm", "Semi-auto, réplica AR-15", 2019, "ejercito", "30497.36", "RIFLE 0.22 L.R. TIPPMANN M4-22 ELITE",
    "imagenes/096_Tippmann_M4-22_Elite.webp",
    "Réplica .22 LR del M4. Distribución EXCLUSIVA para Oficiales, Jefes y Generales del Ejército y Fuerza Aérea Mexicana, y equivalencias en la Armada de México."),

  mk(81, "Tippmann M4-22 Redline", "Tippmann", "rifle", "EE.UU.", ".22 LR", "25", "2800g", "850mm", "Semi-auto, edición Redline", 2021, "ejercito", "36042.33", "RIFLE 0.22 TIPPMANN M4-22 REDLINE",
    "imagenes/097_Tippmann_M4-22_Redline.webp",
    "Edición Redline con detalles rojos. Distribución exclusiva para Oficiales, Jefes y Generales del Ejército y Fuerza Aérea Mexicana."),

  mk(82, "Tippmann M4-22 OD-Green", "Tippmann", "rifle", "EE.UU.", ".22 LR", "25", "2800g", "850mm", "Semi-auto, edición OD-Green", 2020, "ejercito", "17189.42", "RIFLE CAL 22 TIPPMANN M4-22 OD-GREEN",
    "imagenes/098_Tippmann_M4-22_OD-Green.webp",
    "Edición verde militar. Distribución exclusiva para Oficiales del Ejército Mexicano."),

  // ═══════════════════════════════════════════════════════════
  //  SUBAMETRALLADORAS — EXCLUSIVO EJÉRCITO
  // ═══════════════════════════════════════════════════════════
  mk(83, "Emtan MZ-9S", "Emtan", "carabina", "Israel", "9mm Parabellum", "32", "2700g", "550mm", "Subametralladora, blow-back", 2017, "ejercito", "36588.93", "SUBAMETRALLADORA 9X19mm EMTAN MZ-9S",
    "imagenes/110_Emtan_MZ-9S.webp",
    "Subametralladora israelí compacta. Exclusiva de Fuerzas Armadas."),

  mk(84, "IWI UZI Pro", "IWI", "carabina", "Israel", "9mm Parabellum", "20", "2300g", "470mm", "Subametralladora, blow-back compacta", 2010, "ejercito", "16634.92", "SUBAMETRALLADORA 9X19 I.W.I UZI PRO",
    "imagenes/111_IWI_UZI_Pro.webp",
    "Versión moderna del histórico UZI. Compacta y confiable. Exclusiva militar."),

  // ═══════════════════════════════════════════════════════════
  //  ESCOPETAS — USO CIVIL (DCAM)
  // ═══════════════════════════════════════════════════════════
  mk(85, "Stoeger SP312", "Stoeger", "escopeta", "Turquía", "12 GA", "4+1", "3200g", "1240mm", "Semi-auto, pistón inercia", 2016, "dcam", "5347.38", "ESCOPETA CAL 12 GA STOEGER SP312",
    "imagenes/042_Stoeger_SP312.webp",
    "Escopeta semi-automática económica y robusta. Excelente entrada al mundo de las escopetas para caza y deporte."),

  mk(86, "AYA Yuxtapuesta cal 12", "AYA", "escopeta", "España", "12 GA", "2", "3300g", "1180mm", "Yuxtapuesta, hecho a mano", 1995, "dcam", "384837.64", "ESCOPETA CAL 12 YUXTAPUESTA AYA",
    "imagenes/043_AYA_Yuxtapuesta_cal_12.webp",
    "Escopeta yuxtapuesta artesanal española. Pieza de alta gama para coleccionistas y caza de pluma."),

  mk(87, "AYA Yuxtapuesta cal 20", "AYA", "escopeta", "España", "20 GA", "2", "2900g", "1160mm", "Yuxtapuesta, hecho a mano", 1995, "dcam", "637291.60", "ESCOPETA CAL 20 YUXTAPUESTA AYA",
    "imagenes/044_AYA_Yuxtapuesta_cal_20.webp",
    "Versión calibre 20 de la yuxtapuesta AYA. Más ligera, ideal para perdiz y codorniz."),

  mk(88, "AYA Sobre Legend cal 20", "AYA", "escopeta", "España", "20 GA", "2", "3000g", "1170mm", "Superpuesta, hecho a mano", 2010, "dcam", "291417.54", "ESCOPETA CAL 20 SOBRE AYA LEGEND",
    "imagenes/045_AYA_Sobre_Legend_cal_20.webp",
    "Superpuesta cal. 20 de la línea Legend de AYA. Tradición vasca de armería fina."),

  mk(89, "AYA Sobre cal 12", "AYA", "escopeta", "España", "12 GA", "2", "3400g", "1200mm", "Superpuesta, hecho a mano", 2005, "dcam", "398509.58", "ESCOPETA CAL 12 SOBRE AYA",
    "imagenes/046_AYA_Sobre_cal_12.webp",
    "Superpuesta clásica calibre 12. Grabados artesanales. Pieza de tiro deportivo y caza."),

  mk(90, "AYA Senax DL C32", "AYA", "escopeta", "España", "12 GA", "2", "3500g", "1200mm", "Superpuesta premium", 2018, "dcam", "648506.63", "ESCOPETA CAL 12 SOBRE AYA SENAX DL C32",
    "imagenes/047_AYA_Senax_DL_C32.webp",
    "Gama alta Senax DL de AYA. Bloques laterales grabados, madera selecta. Pieza de colección y exhibición."),

  mk(91, "Armsan P612 ASN", "Armsan", "escopeta", "Turquía", "12 GA", "4+1", "3100g", "1240mm", "Semi-auto inercial", 2018, "dcam", "10185.01", "ESCOPETA CAL 12 ARMSAN P612 ASN",
    "imagenes/048_Armsan_P612_ASN.webp",
    "Semi-automática turca. Excelente relación calidad-precio. Cañón intercambiable para choke."),

  mk(92, "Armsan P612 AC", "Armsan", "escopeta", "Turquía", "12 GA", "4+1", "3100g", "1240mm", "Semi-auto inercial", 2020, "dcam", "13435.47", "ESCOPETA CAL 12 ARMSAN P612 AC",
    "imagenes/049_Armsan_P612_AC.webp",
    "Versión AC del P612 con acabado mejorado y accesorios incluidos."),

  mk(93, "Browning Maxus", "Browning", "escopeta", "Bélgica/EE.UU.", "12 GA", "4+1", "3200g", "1270mm", "Semi-auto, gas-operada", 2009, "dcam", "38258.86", "ESCOPETA SEMI BROWNING MAXUS CAL 12",
    "imagenes/050_Browning_Maxus.webp",
    "Semi-automática gas-operada de Browning. Sistema Power Drive Gas para confiabilidad con todo tipo de munición."),

  mk(94, "Winchester SX4", "Winchester", "escopeta", "Italia", "12 GA", "4+1", "3200g", "1240mm", "Semi-auto, gas-operada", 2016, "dcam", "25689.39", "ESCOPETA SEMI WINCHESTER SX4 CAL 12",
    "imagenes/051_Winchester_SX4.webp",
    "Cuarta generación del Super X de Winchester. Gas-operada, suave en disparo, robusta para campo."),

  mk(95, "Breda Astro cal 20", "Breda", "escopeta", "Italia", "20 GA", "4+1", "2700g", "1180mm", "Semi-auto un cañón", 2018, "dcam", "28168.29", "ESCOPETA SEMI 1 CAÑÓN BREDA ASTRO CAL 20",
    "imagenes/052_Breda_Astro_cal_20.webp",
    "Semi-automática italiana ligera. Calibre 20 ideal para caza de pluma y deporte."),

  mk(96, "Breda cal 12 (28\")", "Breda", "escopeta", "Italia", "12 GA", "4+1", "3100g", "1180mm", "Semi-auto un cañón 28\"", 2019, "dcam", "28653.95", "ESCOPETA SEMI 1 CAÑÓN 28\" BREDA CAL 12",
    "imagenes/053_Breda_cal_12_28.webp",
    "Versión calibre 12 cañón 28\". Ideal para todo tipo de caza menor y tiro deportivo."),

  mk(97, "Benelli M2 cal 20", "Benelli", "escopeta", "Italia", "20 GA", "4+1", "2800g", "1180mm", "Semi-auto, sistema inercial", 2010, "dcam", "43004.88", "ESCOPETA CAL 20 BENELLI M2 NEGRO",
    "imagenes/054_Benelli_M2_cal_20.webp",
    "Sistema inercial Benelli, referencia mundial. Calibre 20 ligero para caza de pluma."),

  mk(98, "Benelli Executive cal 12", "Benelli", "escopeta", "Italia", "12 GA", "4+1", "3200g", "1240mm", "Semi-auto, edición lujo grabada", 2008, "dcam", "124628.15", "ESCOPETA SEMI 12 BENELLI EXECUTIVE",
    "imagenes/055_Benelli_Executive_cal_12.webp",
    "Edición de lujo del legendario semi-automático Benelli. Grabados artesanales. Pieza de colección."),

  mk(99, "Huglu Atrox cal 12 (Bomba)", "Huglu", "escopeta", "Turquía", "12 GA", "5+1", "3100g", "1140mm", "Acción de bomba (pump)", 2018, "dcam", "13259.75", "ESCOPETA BOMBA 12 HUGLU ATROX",
    "imagenes/056_Huglu_Atrox_cal_12_Bomba.webp",
    "Escopeta de corredera (pump-action). Confiable, económica. Excelente para defensa de hogar y campo."),

  mk(100, "Beretta DT11 Sport", "Beretta", "escopeta", "Italia", "12 GA", "2", "3900g", "1280mm", "Superpuesta competición", 2012, "dcam", "169670.79", "ESCOPETA CAL 12 BERETTA DT11 SPORT",
    "imagenes/057_Beretta_DT11_Sport.webp",
    "Superpuesta de competición top-tier. Estándar olímpico en trap y skeet. Pieza de tirador profesional."),

  mk(101, "Derya MR-S1", "Derya", "escopeta", "Turquía", "12 GA", "4+1", "3100g", "1240mm", "Semi-auto, sintética", 2020, "dcam", "43006.82", "ESCOPETA CAL 12 DERYA MR-S1 C 30\"",
    "imagenes/058_Derya_MR-S1.webp",
    "Semi-automática turca con cañón 30\". Buen acabado y precio competitivo."),

  mk(102, "Derya MR-100 cal 12", "Derya", "escopeta", "Turquía", "12 GA", "4+1", "3000g", "1200mm", "Semi-auto inercial", 2018, "dcam", "23169.67", "ESCOPETA CAL 12 DERYA MR-100 C 28\"",
    "imagenes/059_Derya_MR-100_cal_12.webp",
    "Semi-automática inercial de entrada de Derya. Buen valor para caza."),

  mk(103, "Derya AG410 cal .410", "Derya", "escopeta", "Turquía", ".410 Bore", "4+1", "2400g", "1130mm", "Semi-auto, ligera", 2020, "dcam", "13678.48", "ESCOPETA CAL 410 DERYA AG410 C 26\"",
    "imagenes/060_Derya_AG410_cal_.410.webp",
    "Escopeta semi-automática calibre .410. Mínimo retroceso, ideal para iniciar tiradores jóvenes y caza menor."),

  mk(104, "Derya AG20 cal 20", "Derya", "escopeta", "Turquía", "20 GA", "4+1", "2700g", "1160mm", "Semi-auto, ligera", 2020, "dcam", "13818.05", "ESCOPETA CAL 20 DERYA AG20 C 26\"",
    "imagenes/061_Derya_AG20_cal_20.webp",
    "Versión cal 20 de la AG, ligera y precisa para perdiz y codorniz."),

  mk(105, "Derya CR-101 (Bomba)", "Derya", "escopeta", "Turquía", "12 GA", "5+1", "3000g", "1150mm", "Acción de bomba (pump)", 2019, "dcam", "13120.17", "ESCOPETA BOMBA 12 DERYA CR-101 C28\"",
    "imagenes/062_Derya_CR-101_Bomba.webp",
    "Escopeta de corredera turca. Económica, confiable. Ideal para defensa de hogar."),

  mk(106, "Retay Masai Mara cal 12", "Retay", "escopeta", "Turquía", "12 GA", "4+1", "3200g", "1240mm", "Semi-auto inercial premium", 2017, "dcam", "22667.85", "ESCOPETA CAL 12 RETAY MASAI MARA",
    "imagenes/063_Retay_Masai_Mara_cal_12.webp",
    "Línea premium de Retay con sistema inercial. Acabados finos, gran confiabilidad."),

  mk(107, "Retay Masai Mara cal 20", "Retay", "escopeta", "Turquía", "20 GA", "4+1", "2900g", "1200mm", "Semi-auto inercial", 2018, "dcam", "24872.54", "ESCOPETA CAL 20 RETAY MASAI MARA",
    "imagenes/064_Retay_Masai_Mara_cal_20.webp",
    "Versión cal 20 del Masai Mara. Ligera y elegante para caza fina."),

  mk(108, "Retay Gordion cal 12", "Retay", "escopeta", "Turquía", "12 GA", "4+1", "3100g", "1240mm", "Semi-auto inercial", 2016, "dcam", "15432.77", "ESCOPETA SEMI 12 RETAY GORDION MAD",
    "imagenes/065_Retay_Gordion_cal_12.webp",
    "Modelo Gordion con culata de madera. Excelente balance precio-calidad."),

  mk(109, "Retay GPSX (Bomba)", "Retay", "escopeta", "Turquía", "12 GA", "5+1", "3000g", "1150mm", "Acción de bomba (pump)", 2019, "dcam", "8228.74", "ESCOPETA BOMBA CAL 12 RETAY GPSX",
    "imagenes/066_Retay_GPSX_Bomba.webp",
    "Pump-action Retay accesible. Robusta para defensa y campo."),

  mk(110, "Fair Lincoln G.", "Fair", "escopeta", "Italia", "12 GA", "2", "3300g", "1180mm", "Yuxtapuesta dos cañones", 2015, "dcam", "36197.87", "ESCOPETA 2 CAÑS FAIR LINCOLN G CM CAL 12",
    "imagenes/067_Fair_Lincoln_G..webp",
    "Yuxtapuesta italiana Fair. Tradición lombarda en armería. Excelente para caza de pluma."),

  mk(111, "Fair SLX800P", "Fair", "escopeta", "Italia", "12 GA", "2", "3500g", "1200mm", "Superpuesta premium", 2018, "dcam", "53618.28", "ESCOPETA 2 CAÑS FAIR SLX800P CAL 12",
    "imagenes/068_Fair_SLX800P.webp",
    "Superpuesta de gama media-alta. Bloques laterales grabados. Tiro deportivo y caza fina."),

  // ── ARMAS OTCA (Monterrey) — inventario 26-sep-2025, no presentes en el catálogo DCAM ──
  mk(112, "IWI Galil ACE 21N", "IWI", "carabina", "Israel", "5.56x45mm", "30+1", "3.3 kg", "845 mm", "Selectivo, pistón de gas", 2012, "ejercito", "37218.13", "FUSIL DE ASALTO CALIBRE 5.56 x 45 mm. (.223\") MARCA I.W.I. MODELO GALIL ACE 21N",
    "",
    "Versión compacta del fusil Galil ACE israelí en 5.56 OTAN, con cañón corto. Plataforma de pistón de gas robusta derivada del AK; de uso exclusivo de las Fuerzas Armadas."),
  mk(113, "CZ Scorpion EVO 3 A1", "Česká Zbrojovka", "carabina", "Rep. Checa", "9mm Parabellum", "20+1", "1.9 kg", "625 mm", "Blowback, selectivo", 2009, "ejercito", "36638.78", "SUBAMETRALLADORA AUTOMATICA CALIBRE 9X19 MM MARCA CESKA ZBROJOVKA MODELO CZ SCORPION EVO 3 A1",
    "",
    "Subfusil checo de 9 mm con armazón de polímero y disparo selectivo, sucesor del Škorpion. Cañón de 208 mm y culata plegable; uso exclusivo de las Fuerzas Armadas."),
  mk(114, "SIG MPX", "SIG Sauer", "carabina", "EE.UU.", "9mm Parabellum", "30+1", "2.7 kg", "660 mm", "Gas, cerrojo cerrado, selectivo", 2015, "ejercito", "48602.46", "SUBAMETRALLADORA CALIBRE 9 X 19 mm MARCA SIG SAUER MODELO SIG MPX, STANDARD",
    "",
    "Subfusil de SIG Sauer con sistema de gas de pistón corto y cerrojo cerrado, inusual para un arma de 9 mm, lo que mejora seguridad y suavidad. Uso exclusivo de las Fuerzas Armadas."),
  mk(115, "Benelli Vinci", "Benelli", "escopeta", "Italia", "12 GA", "3+1", "3.0 kg", "1257 mm", "Semi-auto inercial", 2009, "dcam", "61127.13", "ESCOPETA SEMIAUTOMÁTICA CAL. 12 G.A. MARCA BENELLI MODELO VINCI, SUPERSPORT, CAÑÓN DE 28\", SISTEMA COMFORTECH",
    "",
    "Escopeta semiautomática italiana de diseño modular en tres módulos, con el sistema de inercia Benelli y reducción de retroceso ComforTech. Acabado SuperSport para tiro deportivo."),
  mk(116, "Benelli Super Vinci", "Benelli", "escopeta", "Italia", "12 GA", "3+1", "3.1 kg", "1257 mm", "Semi-auto inercial", 2011, "dcam", "50272.96", "ESCOPETA SEMIAUTOMÁTICA CAL. 12 G.A. MARCA BENELLI MODELO SUPER VINCI, CAÑÓN DE 28\", SISTEMA COMFORTECH",
    "",
    "Evolución de la Vinci con recámara de 3½\" para cartuchos magnum, sistema de inercia y ComforTech 3. Pensada para cacería de ave en condiciones exigentes."),
  mk(117, "Benelli Super Black Eagle 3", "Benelli", "escopeta", "Italia", "12 GA", "3+1", "3.1 kg", "1257 mm", "Semi-auto inercial", 2017, "dcam", "60610.27", "ESCOPETA SEMIAUTOMÁTICA CAL. 12 G.A. MARCA BENELLI MODELO SUPER BLACK EAGLE 3, CAÑÓN DE 28\", SISTEMA COMFORTECH",
    "",
    "Escopeta insignia de Benelli para cacería de ave acuática, con recámara de 3½\", sistema de inercia y ComforTech 3 que reduce notablemente el retroceso. Referente del segmento."),
  mk(118, "Benelli 828U", "Benelli", "escopeta", "Italia", "12 GA", "2", "3.1 kg", "1190 mm", "Sobrepuesta (acción quebrada)", 2015, "dcam", "81543.34", "ESCOPETA SOBREPUESTA CAL. 12 G.A. MARCA BENELLI MODELO 828 U, TERMINADO SILVER, CAÑÓN DE 28\"",
    "",
    "Escopeta sobrepuesta (over/under) de Benelli con báscula de aluminio y sistema de bloqueo patentado, ligera para su clase. Acabado plata para tiro deportivo y cacería."),
  mk(119, "Benelli M2 cal 12", "Benelli", "escopeta", "Italia", "12 GA", "3+1", "3.2 kg", "1200 mm", "Semi-auto inercial", 2005, "dcam", "42907.62", "ESCOPETA SEMIAUTOMÁTICA CAL. 12 G.A. MARCA BENELLI MODELO M2, CAÑÓN DE 26\", SISTEMA COMFORTECH",
    "",
    "Escopeta semiautomática versátil con el sistema de inercia Benelli, muy popular para cacería y tiro deportivo por su fiabilidad y ligereza. Versión calibre 12."),
  mk(120, "Benelli Nova", "Benelli", "escopeta", "Italia", "12 GA", "4+1", "3.6 kg", "1257 mm", "Acción de bomba", 1999, "dcam", "21070.03", "ESCOPETA A BOMBA CAL. 12 G.A. MARCA BENELLI MODELO NOVA, CAÑÓN DE 28\", CULATA ESTÁNDAR",
    "",
    "Escopeta de acción de bomba (corredera) con armazón técnico-polimérico de una pieza, robusta y económica. Popular para cacería y defensa de domicilio."),
  mk(121, "Benelli Super Nova", "Benelli", "escopeta", "Italia", "12 GA", "4+1", "3.8 kg", "1257 mm", "Acción de bomba", 2006, "dcam", "22782.15", "ESCOPETA A BOMBA CAL. 12 G.A. MARCA BENELLI MODELO SUPER NOVA, CAÑÓN DE 28\", SISTEMA COMFORTECH",
    "",
    "Versión reforzada de la Nova con recámara de 3½\" y sistema ComforTech para reducir el retroceso de cargas magnum. Escopeta de corredera para uso intensivo."),
  mk(122, "Derya MR-300", "Derya Arms", "escopeta", "Turquía", "12 GA", "2", "3.2 kg", "1190 mm", "Sobrepuesta (acción quebrada)", 2018, "dcam", "25140.69", "ESCOPETA SOBREPUESTA MARCA DERYA, MODELO MR-300, CALIBRE 12, CAÑÓN DE 28\"",
    "",
    "Escopeta sobrepuesta turca de Derya Arms, alternativa accesible en el segmento over/under para tiro deportivo de plato y cacería."),
  mk(123, "Derya AG12", "Derya Arms", "escopeta", "Turquía", "12 GA", "4+1", "3.4 kg", "1200 mm", "Acción de bomba", 2017, "dcam", "12561.87", "ESCOPETA ACCIÓN DE BOMBA MARCA DERYA, MODELO AG12, CALIBRE 12, CAÑÓN DE 28\"",
    "",
    "Escopeta de corredera turca de Derya Arms en calibre 12, opción económica y fiable para cacería y defensa de domicilio."),
  mk(124, "Glock 19X", "Glock", "pistola", "Austria", "9mm Parabellum", "17+1", "0.80 kg", "187 mm", "Semi-auto, striker (Safe Action)", 2018, "ejercito", "13334.52", "PISTOLA SEMIAUTOMÁTICA CALIBRE 9X19 MM MARCA GLOCK MODELO 19X, COLOR COYOTE",
    "",
    "Pistola de Glock que combina la corredera compacta de la G19 con la empuñadura de tamaño completo de la G17, en acabado coyote. Derivada del concurso militar MHS de EE.UU."),
  mk(125, "Springfield Echelon", "Springfield Armory", "pistola", "EE.UU.", "9mm Parabellum", "17+1", "0.74 kg", "203 mm", "Semi-auto, striker", 2023, "ejercito", "11531.00", "PISTOLA SEMIAUTOMÁTICA CALIBRE 9 X 19 mm MARCA SPRINGFIELD ARMORY MODELO ECHELON",
    "",
    "Pistola moderna de Springfield Armory con chasis de acero serializado (Central Operating Group) y sistema de miras de montaje directo. Plataforma full-size para servicio."),
  mk(126, "Taurus 82S", "Taurus", "revolver", "Brasil", ".38 Special", "6", "0.96 kg", "235 mm", "Revólver, doble acción", 2012, "dcam", "9636.95", "REVOLVER DE FUEGO CENTRAL MARCA TAURUS MODELO 82S, CAÑÓN DE 4\" CALIBRE .38 SPL, 6 CARTUCHOS, ACERO INOXIDABLE",
    "",
    "Revólver de servicio clásico de Taurus en .38 Special con cañón de 4\" y capacidad de 6 cartuchos. Sólido y económico, muy difundido para defensa de domicilio."),
  mk(127, "Grand Power LP380", "Grand Power", "pistola", "Eslovaquia", ".380 ACP", "15+1", "0.66 kg", "168 mm", "Semi-auto, blowback", 2019, "dcam", "17095.34", "PISTOLA SEMIAUTOMÁTICA CALIBRE 0.380\" ACP MARCA GRAND POWER MODELO LP 380",
    "",
    "Pistola eslovaca de Grand Power en .380 ACP, de tamaño completo y alta capacidad para su calibre, de libre adquisición civil para defensa de domicilio."),

  // ═══════════════════════════════════════════════════════════
  //  IWI ARAD 7 DMR — variante de TIRADOR DESIGNADO (OTCA)
  //  Modelo aparte del ARAD 7 estándar (id 79): build de precisión.
  // ═══════════════════════════════════════════════════════════
  mk(128, "IWI ARAD 7 DMR", "IWI", "carabina", "Israel", "7.62x51mm", "20+1", "≈4.0 kg", "≈1000 mm", "Semiauto de precisión (DMR), gatillo de dos etapas", 2023, "ejercito", "99697.36", "FUSIL DE ASALTO CALIBRE 7.62 X 51 mm MARCA I.W.I. MODELO ARAD 7 DMR, SEMIAUTOMÁTICO",
    "",
    "Variante DMR (Designated Marksman Rifle) del ARAD 7: el mismo chasis modular tipo AR-10 en 7.62×51 mm OTAN, pero re-configurado para el rol de TIRADOR DESIGNADO de media-larga distancia. Frente al ARAD 7 estándar (fusil de asalto select-fire de uso general, id 79), el DMR es exclusivamente SEMIAUTOMÁTICO y prioriza la precisión: cañón más largo de paso de estría más rápido (≈1:254 mm / 1:10\" vs ≈1:304 mm / 1:12\" del fusil de asalto) optimizado para proyectiles pesados, cañón flotante (free-float) que no toca el guardamanos, gatillo de DOS ETAPAS para un disparo limpio y repetible, y riel superior continuo pensado para montar óptica de aumento. Esa combinación de cañón de precisión, gatillo de competencia y la mira telescópica que casi siempre lo acompaña explica el salto de precio: ≈\$111,016 MXN, más del doble del ARAD 7 estándar (≈\$47,132 MXN). En síntesis: el ARAD 7 es el fusil de combate versátil; el ARAD 7 DMR es la herramienta de tiro de precisión derivada de él."),


  // ── NUEVOS MODELOS — inventario DCAM 16-jun-2026 (no estaban en el catálogo) ──
  mk(129, "Grand Power Stribog SP380", "Grand Power", "pistola", "Eslovaquia", ".380 ACP", "30+1", "1.4 kg", "cañón 8\"", "Semi-auto, blowback, cañón largo con culata plegable", 2021, "seguridad", "29135.97", "PISTOLA CAL .380 ACP GRAND POWER STRIBOG SP380 A2",
    "",
    "Pistola de cañón largo (8\") con culata plegable y cargador de alta capacidad. En México las pistolas .380 de cañón largo están restringidas a corporaciones de seguridad."),
  mk(130, "Beretta 92A1", "Beretta", "pistola", "Italia", "9mm Parabellum", "17+1", "0.95 kg", "217mm", "Semi-auto, DA/SA", 2010, "ejercito", "10087.75", "PISTOLA CAL .9 mm BERETTA 92A1",
    "",
    "Evolución del clásico 92 con riel Picatinny y cargador de 17 cartuchos. Uso restringido por su calibre 9 mm."),
  mk(131, "Glock 27", "Glock", "pistola", "Austria", ".40 S&W", "9+1", "0.66 kg", "165mm", "Semi-auto, striker (Safe Action), subcompacta", 2003, "ejercito", "7477.30", "PISTOLA CAL .40 GLOCK MOD. 27",
    "",
    "Glock subcompacta en .40 S&W para porteo oculto. Calibre restringido a fuerzas armadas/seguridad."),
  mk(132, "Glock 17", "Glock", "pistola", "Austria", "9mm Parabellum", "17+1", "0.71 kg", "204mm", "Semi-auto, striker (Safe Action)", 1988, "ejercito", "10842.09", "PISTOLA 9X19 MM GLOCK 17 GEN4",
    "",
    "La pistola de servicio más difundida del mundo, full-size en 9 mm. Uso militar/seguridad en México."),
  mk(133, "Glock 44", "Glock", "pistola", "Austria", ".22 LR", "10+1", "0.42 kg", "187mm", "Semi-auto, blowback híbrido", 2019, "dcam", "7726.55", "PISTOLA CAL .22 GLOCK MOD. 44",
    "",
    "Versión en .22 LR de la G19, ideal para entrenamiento económico. De libre adquisición civil."),
  mk(134, "Beretta 92FS .22 LR", "Beretta", "pistola", "Italia", ".22 LR", "10+1", "0.92 kg", "217mm", "Semi-auto, DA/SA (entrenador .22)", 2013, "dcam", "19019.32", "PISTOLA CAL .22 LR BERETTA 92 FS",
    "",
    "Réplica en .22 LR del 92FS para práctica de bajo costo con la ergonomía del original. Adquisición civil."),
  mk(135, "Beretta 92FS", "Beretta", "pistola", "Italia", "9mm Parabellum", "15+1", "0.95 kg", "217mm", "Semi-auto, DA/SA", 1989, "ejercito", "10608.04", "PISTOLA 9X19 MM BERETTA 92FS",
    "",
    "Pistola de servicio icónica con armazón de aluminio y cerrojo abierto. Calibre 9 mm de uso restringido."),
  mk(136, "Arex Delta L", "Arex", "pistola", "Eslovenia", "9mm Parabellum", "19+1", "0.78 kg", "cañón 4.5\"", "Semi-auto, striker-fired", 2018, "ejercito", "13296.18", "PISTOLA 9 MM AREX DELTA L",
    "",
    "Pistola eslovena de polímero, ligera y de alta capacidad, con miras listas para red-dot. Uso restringido por calibre."),
  mk(137, "Taurus G3", "Taurus", "pistola", "Brasil", "9mm Parabellum", "17+1", "0.72 kg", "185mm", "Semi-auto, striker-fired", 2019, "ejercito", "8334.70", "PIST. F.C. TAURUS G3 CAL .9 MM",
    "",
    "Pistola full-size de gran valor, muy popular para servicio. Calibre 9 mm restringido en México."),
  mk(138, "Taurus G3C", "Taurus", "pistola", "Brasil", "9mm Parabellum", "12+1", "0.62 kg", "168mm", "Semi-auto, striker-fired compacta", 2020, "ejercito", "6988.78", "PIST. F.C. TAURUS G3C CAL .9 MM",
    "",
    "Versión compacta de la G3 para porteo oculto. Calibre 9 mm de uso militar/seguridad."),
  mk(139, "Taurus G3 Tactical", "Taurus", "pistola", "Brasil", "9mm Parabellum", "17+1", "0.74 kg", "210mm", "Semi-auto, striker-fired, cañón roscado", 2021, "ejercito", "11699.49", "PIST. F.C. TAURUS G3 TAC CAL .9 MM",
    "",
    "G3 con cañón roscado y miras altas para supresor/red-dot. Restringida por calibre."),
  mk(140, "Taurus TH9", "Taurus", "pistola", "Brasil", "9mm Parabellum", "17+1", "0.82 kg", "210mm", "Semi-auto, DA/SA", 2018, "ejercito", "9132.28", "PIST. F.C. TAURUS TH9 CAL .9 MM",
    "",
    "Pistola hammer-fired DA/SA con seguro de palanca, alternativa de servicio económica. Uso restringido."),
  mk(141, "Taurus 889", "Taurus", "revolver", "Brasil", ".38 Special", "6", "0.95 kg", "cañón 4\"/6\"", "Revólver DA/SA", 2019, "dcam", "13070.12", "REVL. F.C. TAURUS 889 CAL .38 SPL",
    "",
    "Revólver de 6 tiros en .38 Special con cañón de 4\" o 6\", para defensa y tiro. Adquisición civil."),
  mk(142, "Taurus 85S", "Taurus", "revolver", "Brasil", ".38 Special", "5", "0.82 kg", "190mm", "Revólver DA/SA cañón 3\"", 2015, "dcam", "9469.06", "REVL. F.C. TAURUS 85S CAL .38 SPL",
    "",
    "Revólver compacto de 5 tiros con cañón de 3\", clásico para defensa de domicilio. Libre adquisición civil."),
  mk(143, "Benelli MR1", "Benelli", "carabina", "Italia", "5.56x45mm", "5 / 30", "3.7 kg", "910mm", "Semi-auto, pistón de gas (plataforma AR)", 2009, "ejercito", "22262.89", "RIFLE CAL .223 REM BENELLI MR1",
    "",
    "Carabina semiautomática italiana de pistón en .223/5.56 con riel Picatinny. Uso restringido a fuerzas armadas."),
  mk(144, "Benelli Argo-E", "Benelli", "rifle", "Italia", ".300 Win Mag", "3+1", "3.2 kg", "1100mm", "Semi-auto, pistón de gas A.R.G.O.", 2003, "dcam", "27286.07", "RIFLE CAL .300 WIN BENELLI ARGO-E",
    "",
    "Rifle de caza semiautomático con sistema de gas A.R.G.O. de doble pistón, preciso y suave. Calibre de cacería, adquisición civil."),
  mk(145, "Winchester XPERT .22", "Winchester", "rifle", "EE.UU.", ".22 LR", "10+1", "2.6 kg", "1020mm", "Cerrojo, culata sintética/thumbhole", 2021, "dcam", "12841.02", "RIFLE CAL .22 LR WINCHESTER XPERT",
    "",
    "Rifle de cerrojo en .22 LR, económico y preciso para iniciación y plinking. De libre adquisición civil."),
  mk(146, "Winchester Ranger .22", "Winchester", "rifle", "EE.UU.", ".22 LR", "15+1", "2.5 kg", "1000mm", "Acción de palanca", 2020, "dcam", "16470.00", "RIFLE CAL .22 LR WINCHESTER RANGER",
    "",
    "Rifle .22 de acción de palanca, clásico para tiro recreativo y control de plagas. Adquisición civil."),
  mk(147, "Winchester XPR 6.5 Creedmoor", "Winchester", "rifle", "EE.UU.", "6.5 Creedmoor", "3+1", "3.2 kg", "1120mm", "Cerrojo", 2019, "dcam", "19939.47", "RIFLE WINCHESTER XPR CAL 6.5 CREEDMOOR",
    "",
    "Rifle de cerrojo XPR en 6.5 Creedmoor, calibre de gran precisión a larga distancia para cacería y tiro. Adquisición civil."),
  mk(148, "Browning BAR MK4", "Browning", "rifle", "Bélgica/EE.UU.", ".308 Winchester", "4+1", "3.5 kg", "1070mm", "Semi-auto, pistón de gas", 2017, "dcam", "37386.51", "RIFLE SEMI BROWNING BAR MK4 CAL .308",
    "",
    "Rifle de caza semiautomático de gran prestigio, suave y preciso en .308 Win. Calibre de cacería, adquisición civil."),
  mk(149, "Winchester SXR2 Pump", "Winchester", "rifle", "EE.UU.", ".308 Winchester", "3+1", "3.3 kg", "1050mm", "Acción de bomba (corredera)", 2018, "dcam", "28912.23", "RIFLE A BOMBA WINCHESTER SXR2 PUMP CAL .308",
    "",
    "Rifle de cacería de acción de bomba en .308 Win, de ciclo rápido. Adquisición civil para caza."),
  mk(150, "IWI US Z-15", "IWI", "carabina", "EE.UU.", "5.56x45mm", "30+1", "3.0 kg", "830mm", "Semi-auto, directo de gas (AR-15)", 2021, "ejercito", "28662.99", "FUSIL CAL .5.56 IWI US Z-15",
    "",
    "Carabina AR-15 fabricada por IWI US en 5.56 OTAN, con riel y miras auxiliares. Uso restringido a fuerzas armadas."),
  mk(151, "Ruger 10/22", "Ruger", "rifle", "EE.UU.", ".22 LR", "10+1", "2.3 kg", "940mm", "Semi-auto, blowback", 1964, "dcam", "14203.09", "RIFLE RUGER 10/22 CAL .22",
    "",
    "El rifle semiautomático .22 más popular de la historia, fiable y personalizable, con cargador rotativo. Libre adquisición civil."),
  mk(152, "Weatherby Orion", "Weatherby", "escopeta", "EE.UU.", "12 GA", "2", "3.3 kg", "1170mm", "Sobrepuesta (acción quebrada)", 2018, "dcam", "33219.16", "ESC. SOB. WEATHERBY ORION CAL 12",
    "",
    "Escopeta sobrepuesta de dos cañones para tiro deportivo y cacería de pluma. Adquisición civil."),
  mk(153, "Beretta 687 Silver Pigeon III", "Beretta", "escopeta", "Italia", "12 GA", "2", "3.3 kg", "1180mm", "Sobrepuesta (acción quebrada)", 2016, "dcam", "48559.95", "ESC. SOB. BERETTA 687 SILVER PIGEON III",
    "",
    "Sobrepuesta italiana de gama media-alta con báscula grabada, referente para caza y plato. Adquisición civil."),
  mk(154, "Beretta 687 Silver Pigeon V", "Beretta", "escopeta", "Italia", "12 GA", "2", "3.4 kg", "1200mm", "Sobrepuesta (acción quebrada)", 2018, "dcam", "77956.07", "ESC. SOB. BERETTA 687 SILVER PIGEON V",
    "",
    "Versión superior de la Silver Pigeon, con grabado floral y mejor madera, para tiro deportivo. Adquisición civil."),
  mk(155, "Beretta 694 Sporting", "Beretta", "escopeta", "Italia", "12 GA", "2", "3.6 kg", "1200mm", "Sobrepuesta tipo sporting", 2018, "dcam", "83650.30", "ESC. SOB. BERETTA 694 SPORTING",
    "",
    "Sobrepuesta de competencia tipo sporting, equilibrada y de disparo rápido. Adquisición civil para tiro deportivo."),
  mk(156, "Beretta A400 Xtreme Plus", "Beretta", "escopeta", "Italia", "12 GA", "3+1", "3.4 kg", "1280mm", "Semi-auto (gas Blink), Kick-Off", 2017, "dcam", "40264.30", "ESC. SEMI. BERETTA A400 XTREME PLUS",
    "",
    "Semiautomática de gas Blink con sistema antirretroceso Kick-Off, pensada para cacería de ave acuática. Adquisición civil."),
  mk(157, "Beretta Ultraleggero", "Beretta", "escopeta", "Italia", "12 GA", "2", "2.9 kg", "1180mm", "Sobrepuesta ultraligera", 2021, "dcam", "50641.10", "ESC. SOB. BERETTA ULTRALEGGERO",
    "",
    "Sobrepuesta ultraligera con báscula de aleación técnica, cómoda para caza de montaña. Adquisición civil."),
  mk(158, "Beretta 687 EELL Diamond Pigeon", "Beretta", "escopeta", "Italia", "12 GA", "2", "3.4 kg", "1200mm", "Sobrepuesta de lujo, grabado fino", 2019, "dcam", "164612.47", "ESC. SOB. BERETTA 687 EELL DIAMOND PIGEON",
    "",
    "Escopeta de lujo con grabado a buril hecho a mano y maderas selectas, pieza de colección y tiro fino. Adquisición civil."),
  mk(159, "Browning 825 Sporter", "Browning", "escopeta", "Bélgica/EE.UU.", "12 GA", "2", "3.6 kg", "1180mm", "Sobrepuesta (acción quebrada)", 2022, "dcam", "65182.13", "ESC. SOB. BROWNING 825 SPORTER",
    "",
    "Sobrepuesta deportiva con culata ajustable y maderas seleccionadas, sucesora de la 725. Adquisición civil."),
  mk(160, "Browning B525 Sporter", "Browning", "escopeta", "Bélgica/EE.UU.", "12 GA", "2", "3.5 kg", "1180mm", "Sobrepuesta (acción quebrada)", 2016, "dcam", "51224.50", "ESC. SOB. BROWNING B525 SPORTER",
    "",
    "Clásica sobrepuesta Browning de báscula baja, muy apreciada para sporting y caza. Adquisición civil."),
  mk(161, "Winchester SXP", "Winchester", "escopeta", "EE.UU.", "12 GA", "4+1", "3.2 kg", "1170mm", "Acción de bomba (corredera)", 2014, "dcam", "13818.05", "ESC. A BOMBA WINCHESTER SXP",
    "",
    "Escopeta de corredera de ciclo rápido (Inflex), económica y versátil para caza y defensa. Adquisición civil."),
  mk(162, "Benelli M4", "Benelli", "escopeta", "Italia", "12 GA", "5+1", "3.8 kg", "886mm", "Semi-auto, pistón de gas (ARGO), táctica", 1998, "dcam", "35552.82", "ESC. SEMI. BENELLI M4 CAÑÓN 14\"",
    "",
    "Escopeta semiautomática táctica de doble pistón ARGO, adoptada por cuerpos militares. Robusta y fiable."),
  mk(163, "Caesar Guerini Summit Sporting", "Caesar Guerini", "escopeta", "Italia", "12 GA", "2", "3.6 kg", "1200mm", "Sobrepuesta tipo sporting", 2019, "dcam", "83765.92", "ESC. SOB. CAESAR GUERINI SUMMIT SPORTING",
    "",
    "Sobrepuesta italiana de tiro deportivo con báscula reforzada y excelente terminado. Adquisición civil."),
  mk(164, "Caesar Guerini Invictus", "Caesar Guerini", "escopeta", "Italia", "12 GA", "2", "3.7 kg", "1220mm", "Sobrepuesta sporting, báscula Invictus", 2018, "dcam", "115358.80", "ESC. SOB. CAESAR GUERINI INVICTUS SPORTING",
    "",
    "Sobrepuesta de competencia con sistema de bisagra reemplazable Invictus para gran durabilidad. Adquisición civil."),
  mk(165, "Optimum Arms LRT-12", "Optimum Arms", "escopeta", "Turquía", "12 GA", "5+1", "3.4 kg", "920mm", "Acción de palanca (lever)", 2021, "dcam", "17586.61", "ESC. PALANCA OPTIMUM ARMS LRT 12 AL CAL 12",
    "",
    "Escopeta de acción de palanca calibre 12, llamativa y de ciclo manual rápido. Adquisición civil."),
  mk(166, "Optimum Arms OPT-200 Pro", "Optimum Arms", "escopeta", "Turquía", "12 GA", "4+1", "3.2 kg", "1180mm", "Semi-auto", 2021, "dcam", "19540.68", "ESC. SEMI. OPTIMUM ARMS OPT 200 PRO CAL 12",
    "",
    "Escopeta semiautomática turca económica para caza y tiro recreativo. Adquisición civil."),
  mk(167, "Optimum Arms OPT VM G2", "Optimum Arms", "escopeta", "Turquía", "12 GA", "5+1", "3.3 kg", "varía", "Semi-auto", 2022, "dcam", "22332.21", "ESC. SEMI. OPTIMUM ARMS OPT VM G2",
    "",
    "Escopeta semiautomática de defensa/utilidad con cañón corto, en calibres 12 y 20. Adquisición civil."),
  mk(168, "Optimum Arms OPT-100", "Optimum Arms", "escopeta", "Turquía", "12 GA", "4+1", "3.2 kg", "1170mm", "Acción de bomba (corredera)", 2021, "dcam", "13120.17", "ESC. A BOMBA OPTIMUM ARMS OPT 100-1 CAL 12",
    "",
    "Escopeta de corredera económica y robusta para caza y defensa de domicilio. Adquisición civil."),

  // ═══════════════════════════════════════════════════════════
  //  ALTAS 18-jun-2026 — modelos nuevos DCAM / OTCA
  // ═══════════════════════════════════════════════════════════
  mk(169, "AYA Sena 32", "AYA", "escopeta", "España", "12 GA", "2", "3.6 kg", "1200mm", "Superpuesta sidelock premium", 2019, "dcam", "408366.10", "ESCOPETA CAL 12 SOBRE AYA SENA 32",
    "",
    "Escopeta superpuesta sidelock de gama alta fabricada artesanalmente en Éibar, España. Pieza de exhibición y competición; existen los acabados Sena y Sena Black. Adquisición civil."),

  mk(170, "Beretta A400 Lite", "Beretta", "escopeta", "Italia", "12 GA", "3+1", "2.9 kg", "1240mm", "Semi-auto (gas Blink), ligera", 2019, "dcam", "33327.16", "ESC. SEMI. BERETTA A400 LITE CAL 12",
    "",
    "Versión ligera de la serie A400 de Beretta, con sistema de gas Blink para ciclos de tiro rápidos. Orientada a caza de campo y tiro deportivo. Adquisición civil."),

  mk(171, "Beretta A400 Upland", "Beretta", "escopeta", "Italia", "12 GA", "3+1", "3.2 kg", "1250mm", "Semi-auto (gas Blink), Kick-Off", 2018, "dcam", "35321.59", "ESC. SEMI. BERETTA A400 UPLAND CAL 12",
    "",
    "Escopeta semiautomática A400 Upland de Beretta con sistema Kick-Off de reducción de retroceso. Configurada para caza de aves. Adquisición civil."),

  mk(172, "Weatherby Element", "Weatherby", "escopeta", "Turquía", "12 GA", "4+1", "3.2 kg", "1240mm", "Semi-auto (inercia)", 2020, "dcam", "21718.08", "ESCOPETA SEMI CAL 12 WEATHERBY ELEMENT WATERFOWL",
    "",
    "Escopeta semiautomática por inercia con acabado camuflaje, orientada a la caza acuática (waterfowl). Robusta y de bajo mantenimiento. Adquisición civil."),

  mk(173, "Taurus 838", "Taurus", "revolver", "Brasil", ".38 Special", "8", "0.95 kg", "230 mm", "Revólver doble acción, 8 tiros", 2023, "dcam", "13823.83", "REVOLVER TAURUS 838 CAL .38 SPL 8 TIROS",
    "",
    "Revólver de fuego central de 8 tiros en calibre .38 Special, acero inoxidable mate. Capacidad ampliada para defensa y tiro deportivo. Adquisición civil."),

  mk(174, "CZ 600 Alpha .270", "Ceska Zbrojovka", "rifle", "Rep. Checa", ".270 Winchester", "5", "2900g", "1080mm", "Cerrojo bolt-action", 2022, "dcam", "18842.80", "RIFLE CESKA Z. CZ 600 ALPHA CAL .270",
    "",
    "Rifle de cerrojo CZ 600 Alpha en calibre .270 Winchester, culata sintética. Versión de caza mayor de la plataforma modular CZ 600. Adquisición civil."),

  mk(175, "CZ 600 American .270", "Ceska Zbrojovka", "rifle", "Rep. Checa", ".270 Winchester", "5", "3100g", "1110mm", "Cerrojo bolt-action", 2023, "dcam", "22232.51", "RIFLE CESKA CZ 600 AMERICAN C. 270 WIN",
    "",
    "Rifle de cerrojo CZ 600 American en .270 Win con culata de madera de estilo americano clásico. Precisión de caza a media y larga distancia. Adquisición civil."),

  mk(176, "Winchester XPR Thumbhole .308", "Winchester", "rifle", "EUA", ".308 Winchester", "3", "3200g", "1120mm", "Cerrojo bolt-action, culata thumbhole laminada", 2021, "dcam", "24924.34", "RIFLE WINCHESTER XPR V. THUMB L. CAL .308",
    "",
    "Rifle de cerrojo Winchester XPR con culata thumbhole laminada, calibre .308 Winchester. Ergonomía de tiro de precisión para caza. Adquisición civil."),

  mk(177, "Winchester XPR Thumbhole .30-06", "Winchester", "rifle", "EUA", ".30-06 Sprg", "3", "3200g", "1120mm", "Cerrojo bolt-action, culata thumbhole laminada", 2021, "dcam", "24924.34", "RIFLE WINCHESTER XPR V. THUMB L. CAL .30-06",
    "",
    "Rifle de cerrojo Winchester XPR con culata thumbhole laminada, calibre .30-06 Springfield. Versátil para caza mayor. Adquisición civil."),

  mk(178, "Huglu Renova", "Huglu", "escopeta", "Turquía", "12 GA", "4+1", "3.1 kg", "1230mm", "Semi-auto (gas)", 2022, "dcam", "16330.43", "ESCOPETA SEMI CAL 12 HUGLU RENOVA VBN",
    "",
    "Escopeta semiautomática turca Huglu Renova calibre 12, acabado VBN. Opción económica y confiable para caza y tiro deportivo. Adquisición civil."),

  mk(179, "Mendoza RM22-6000 Commander", "Mendoza", "rifle", "México", ".22 LR", "10+1", "2850g", "1020mm", "Semi-auto, acabado camuflaje Commander", 2022, "dcam", "9760.66", "RIFLE 22 MENDOZA RM22-6000 CAMUFLAJE COMMANDER",
    "",
    "Rifle semiautomático mexicano Mendoza RM22-6000 en .22 LR con acabado camuflaje Commander y leyenda S.D.N. Ideal para iniciación, plinking y control de plaga. Adquisición civil."),
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
  // Aviso discreto "sin imagen disponible" (reemplaza la silueta placeholder).
  void SIL;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 480 200' preserveAspectRatio='xMidYMid meet'>
    <g fill='none' stroke='%23555555' stroke-width='2.5' opacity='0.55' stroke-linejoin='round'>
      <rect x='206' y='64' width='68' height='52' rx='4'/>
      <circle cx='240' cy='90' r='13'/>
      <line x1='210' y1='60' x2='270' y2='120'/>
    </g>
    <text x='240' y='148' font-family='Courier New,monospace' font-size='13' fill='%237A7A7A' text-anchor='middle' letter-spacing='1'>Sin imagen disponible</text>
    <text x='240' y='168' font-family='Courier New,monospace' font-size='13' fill='%237A7A7A' text-anchor='middle' letter-spacing='1'>por el momento</text>
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
