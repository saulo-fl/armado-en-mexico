// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.
//
// LOS DATOS de este fichero —la selección, la estructura y los textos
// divulgativos— se ofrecen ADEMÁS bajo CC BY-SA 4.0; los hechos que contiene
// no son de nadie (art. 14 fr. X LFDA). Detalle: LICENSE-CONTENIDO.md.

// Armado en México — Datos de apartados nuevos
// Calibres (enciclopédico) · Campos de tiro (placeholder) · Cursos (placeholder)
// ───────────────────────────────────────────────────────────────────────
// NOTA: Campos y Cursos son datos PLACEHOLDER para engrosar más tarde.
// Calibres usa la taxonomía real de CATEGORIES.calibre + el catálogo (window.DB).

// ═══════════════════════════════════════════════════════════════════════
// CALIBRES — ficha divulgativa por calibre
//   clase     · Pistola / Revólver / Rifle / Escopeta / Rimfire
//   uso       · aplicación típica
//   velocidad · boca de cañón aprox. (divulgativo)
//   energia   · energía de boca aprox. (divulgativo)
//   retroceso · Bajo / Medio / Alto / Muy alto
// ═══════════════════════════════════════════════════════════════════════
// Los 30 calibres de la guía. Generado el 19-sep-2026 desde los insumos
// verificados; `sistema` va explícito en cada entrada, ya no se deriva.
window.CALIBRES = [
  {
    "id": ".380 ACP",
    "clase": "Pistola",
    "sistema": "Percusión central",
    "uso": "Defensa personal compacta",
    "alias": [],
    "mm": 25,
    "velocidad": "~300 m/s",
    "velocidadMs": 300,
    "energia": "~280 J",
    "energiaJ": 280,
    "retroceso": "Bajo-Medio",
    "retrocesoNivel": 2,
    "avail": "dcam",
    "legalArt": "art. 9o fr. I LFAFE",
    "legalNota": "Es el calibre máximo que el instructivo del permiso DEFENSA-02-040 admite en pistola para la protección del domicilio. Ojo: las pistolas de cañón largo en .380 sí están restringidas a corporaciones de seguridad.",
    "fuente": {
      "nombre": "Cifras divulgativas del catálogo",
      "fecha": "2026-09"
    },
    "enCatalogo": true,
    "cartucho": "imagenes/cartuchos/380acp.webp",
    "desc": "Cartucho de defensa en pistolas subcompactas. De libre adquisición para civiles en México (DCAM), uno de los más solicitados para defensa de domicilio."
  },
  {
    "id": ".32 ACP",
    "clase": "Pistola",
    "sistema": "Percusión central",
    "uso": "Defensa de bolsillo",
    "alias": [
      "7.65×17 Browning",
      "7.65 mm"
    ],
    "mm": 25,
    "velocidad": "~320 m/s",
    "velocidadMs": 318,
    "energia": "~240 J",
    "energiaJ": 239,
    "retroceso": "Bajo",
    "retrocesoNivel": 1,
    "avail": "dcam",
    "legalArt": "art. 9o fr. I LFAFE",
    "legalNota": "Queda por debajo del tope de .380 que el instructivo del permiso DEFENSA-02-040 fija para pistola en protección del domicilio, y no figura entre los calibres exceptuados.",
    "fuente": {
      "nombre": "C.I.P. TDCC (L6) · Sellier & Bellot 73 gr FMJ",
      "fecha": "2026-09"
    },
    "enCatalogo": false,
    "cartucho": null,
    "desc": "Cartucho pequeño de las pistolas compactas de otra época, todavía frecuente en armas heredadas. Poca energía, retroceso mínimo y munición cada vez más difícil de conseguir."
  },
  {
    "id": ".22 LR",
    "clase": "Rimfire",
    "sistema": "Rimfire",
    "uso": "Práctica, plinking y caza menor",
    "alias": [],
    "mm": 25.4,
    "velocidad": "~330 m/s",
    "velocidadMs": 330,
    "energia": "~150 J",
    "energiaJ": 150,
    "retroceso": "Bajo",
    "retrocesoNivel": 1,
    "avail": "dcam",
    "legalArt": "arts. 9o y 10 LFAFE",
    "legalNota": "De libre adquisición civil. El art. 9o permite a ejidatarios, comuneros y jornaleros del campo poseer un rifle .22, y el art. 10 incluye las pistolas y rifles de calibre .22 entre las autorizadas a socios de un club de tiro o cacería acreditado. En la DCAM el cartucho de fuego anular tiene cuota propia: hasta 500 por persona.",
    "fuente": {
      "nombre": "Cifras divulgativas del catálogo",
      "fecha": "2026-09"
    },
    "enCatalogo": true,
    "cartucho": "imagenes/cartuchos/22lr.webp",
    "desc": "El calibre de fuego anular más popular del mundo. Económico y de retroceso mínimo: ideal para iniciación, entrenamiento y control de plagas."
  },
  {
    "id": ".40 S&W",
    "clase": "Pistola",
    "sistema": "Percusión central",
    "uso": "Servicio y seguridad",
    "alias": [],
    "mm": 28.8,
    "velocidad": "~330 m/s",
    "velocidadMs": 330,
    "energia": "~600 J",
    "energiaJ": 600,
    "retroceso": "Medio-Alto",
    "retrocesoNivel": 4,
    "avail": "ejercito",
    "legalArt": "art. 9o fr. I LFAFE",
    "legalNota": "Supera el tope de .380 que el instructivo DEFENSA-02-040 fija en pistola para particulares. En el catálogo figura como uso exclusivo de las Fuerzas Armadas. CORRIGE el texto publicado hoy, que lo daba como restringido a seguridad pública o privada.",
    "fuente": {
      "nombre": "Cifras divulgativas del catálogo",
      "fecha": "2026-09"
    },
    "enCatalogo": true,
    "cartucho": "imagenes/cartuchos/40sw.webp",
    "desc": "Desarrollado para cuerpos policiales: más poder que el 9mm conservando capacidad razonable. Uso restringido a seguridad pública/privada."
  },
  {
    "id": "9mm Parabellum",
    "clase": "Pistola",
    "sistema": "Percusión central",
    "uso": "Servicio, defensa y deportivo",
    "alias": [],
    "mm": 29.7,
    "velocidad": "~360 m/s",
    "velocidadMs": 360,
    "energia": "~500 J",
    "energiaJ": 500,
    "retroceso": "Medio",
    "retrocesoNivel": 3,
    "avail": "ejercito",
    "legalArt": "art. 11 LFAFE",
    "legalNota": "La Ley Federal de Armas de Fuego y Explosivos reserva las pistolas 9 mm Parabellum al uso exclusivo de la Fuerza Armada Permanente. El instructivo del permiso de domicilio también las excluye por su nombre. Es el calibre más usado del mundo y el que más se pregunta aquí: en México, un particular no puede adquirirlo.",
    "fuente": {
      "nombre": "Cifras divulgativas del catálogo",
      "fecha": "2026-09"
    },
    "enCatalogo": true,
    "cartucho": "imagenes/cartuchos/9mm.webp",
    "desc": "El estándar mundial de pistola. Equilibrio entre capacidad, control y poder de parada. Restringido en México a corporaciones de seguridad."
  },
  {
    "id": ".38 S&W",
    "clase": "Revólver",
    "sistema": "Percusión central",
    "uso": "Tiro recreativo",
    "alias": [
      ".38 Smith & Wesson",
      ".380 Revolver"
    ],
    "mm": 31.5,
    "velocidad": "~210 m/s",
    "velocidadMs": 209,
    "energia": "~205 J",
    "energiaJ": 206,
    "retroceso": "Bajo",
    "retrocesoNivel": 1,
    "avail": "dcam",
    "legalArt": "art. 9o fr. II LFAFE",
    "legalNota": "Cartucho de revólver por debajo del .38 Especial, que es el tope del instructivo DEFENSA-02-040, y no figura entre los exceptuados. No está en el catálogo DCAM: es un calibre antiguo, frecuente en revólveres heredados.",
    "revisar": true,
    "fuente": {
      "nombre": "C.I.P. TDCC (L6) · Remington WheelGun 146 gr",
      "fecha": "2026-09"
    },
    "enCatalogo": false,
    "cartucho": null,
    "desc": "No confundir con el .38 Especial: es más corto, más débil y no son intercambiables. Vive en revólveres antiguos y su munición hoy es rara en México."
  },
  {
    "id": ".45 ACP",
    "clase": "Pistola",
    "sistema": "Percusión central",
    "uso": "Defensa y tiro deportivo",
    "alias": [
      "11.43×23",
      ".45 Auto"
    ],
    "mm": 32.39,
    "velocidad": "~255 m/s",
    "velocidadMs": 255,
    "energia": "~485 J",
    "energiaJ": 483,
    "retroceso": "Medio",
    "retrocesoNivel": 3,
    "avail": null,
    "legalArt": "art. 9o fr. I LFAFE",
    "legalNota": "HUECO MARCADO. Respaldado: supera el tope de .380 del instructivo DEFENSA-02-040, así que no procede para la protección del domicilio. No hay armas .45 en el catálogo ni texto en el repo que fije su clasificación, y no se inventa. Saulo decide el sello.",
    "revisar": true,
    "fuente": {
      "nombre": "C.I.P. TDCC (L6) · Winchester USA 230 gr FMJ",
      "fecha": "2026-09"
    },
    "enCatalogo": false,
    "cartucho": null,
    "desc": "El cartucho de la Colt 1911: bala pesada y lenta, que se siente como un empujón más que como un latigazo. Muy querido en el tiro deportivo, pero queda por encima del tope de calibre que la ley mexicana admite a un particular."
  },
  {
    "id": ".38 Super",
    "clase": "Pistola",
    "sistema": "Percusión central",
    "uso": "Tiro deportivo (IPSC) y defensa",
    "alias": [],
    "mm": 32.6,
    "velocidad": "~430 m/s",
    "velocidadMs": 430,
    "energia": "~650 J",
    "energiaJ": 650,
    "retroceso": "Medio",
    "retrocesoNivel": 3,
    "avail": "ejercito",
    "legalArt": "art. 9o fr. I LFAFE",
    "legalNota": "El instructivo del permiso DEFENSA-02-040 lo excluye por su nombre del permiso de protección al domicilio (sin las .38 Súper y .38 Comando). En el catálogo figura como uso exclusivo. REVISAR: es el calibre de competencia más arraigado en México y el art. 10 sí admite pistolas .38 con fines de tiro olímpico o de competencia para socios de club.",
    "revisar": true,
    "fuente": {
      "nombre": "Cifras divulgativas del catálogo",
      "fecha": "2026-09"
    },
    "enCatalogo": true,
    "cartucho": "imagenes/cartuchos/38super.webp",
    "desc": "Muy arraigado en México. Alta velocidad y excelente para competencia de acción en plataformas tipo 1911 y Colt Government."
  },
  {
    "id": ".22 WMR",
    "clase": "Rimfire",
    "sistema": "Rimfire",
    "uso": "Caza menor y plagas a más distancia",
    "alias": [
      ".22 Magnum",
      ".22 Win Mag"
    ],
    "mm": 34.29,
    "velocidad": "~570 m/s",
    "velocidadMs": 572,
    "energia": "~425 J",
    "energiaJ": 423,
    "retroceso": "Bajo",
    "retrocesoNivel": 1,
    "avail": "dcam",
    "legalArt": "art. 10 LFAFE",
    "legalNota": "Fuego anular, pero no es el .22 LR: la DCAM lo excluye de la cuota de 500 cartuchos de los .22 (salvo Magnum, Hornet o TCM) y el texto del art. 9o lo menciona entre los calibres exceptuados en pistola. REVISAR: la guía no debería afirmar que se adquiere como un .22 corriente.",
    "revisar": true,
    "fuente": {
      "nombre": "C.I.P. TDCC (L6) · CCI Maxi-Mag 40 gr, en rifle",
      "fecha": "2026-09"
    },
    "enCatalogo": false,
    "cartucho": null,
    "desc": "El fuego anular llevado más lejos: casi el doble de velocidad que el .22 LR conservando un retroceso mínimo. No son intercambiables: la recámara es distinta y el .22 LR no debe dispararse en un .22 Magnum."
  },
  {
    "id": ".38 Special",
    "clase": "Revólver",
    "sistema": "Percusión central",
    "uso": "Defensa y tiro recreativo",
    "alias": [],
    "mm": 39.6,
    "velocidad": "~260 m/s",
    "velocidadMs": 260,
    "energia": "~300 J",
    "energiaJ": 300,
    "retroceso": "Medio",
    "retrocesoNivel": 3,
    "avail": "dcam",
    "legalArt": "art. 9o fr. II LFAFE",
    "legalNota": "Es el calibre máximo que el instructivo del permiso DEFENSA-02-040 admite en revólver para la protección del domicilio. El .357 Magnum, que usa la misma recámara, queda expresamente fuera.",
    "fuente": {
      "nombre": "Cifras divulgativas del catálogo",
      "fecha": "2026-09"
    },
    "enCatalogo": true,
    "cartucho": "imagenes/cartuchos/38special.webp",
    "desc": "Cartucho de revólver clásico, fiable y noble. Estándar de defensa civil durante décadas; sigue vigente en revólveres de acero como el Taurus 856."
  },
  {
    "id": ".357 Magnum",
    "clase": "Revólver",
    "sistema": "Percusión central",
    "uso": "Defensa y caza menor",
    "alias": [
      ".357 Mag"
    ],
    "mm": 40.39,
    "velocidad": "~380 m/s",
    "velocidadMs": 378,
    "energia": "~730 J",
    "energiaJ": 731,
    "retroceso": "Alto",
    "retrocesoNivel": 5,
    "avail": null,
    "legalArt": "art. 9o fr. II LFAFE",
    "legalNota": "HUECO MARCADO, no rellenar sin decisión de Saulo. Lo único respaldado: el instructivo del permiso DEFENSA-02-040 lo excluye expresamente del revólver de protección al domicilio (sin el .357 Magnum). No hay en el repo texto que diga a quién SÍ corresponde, y no hay armas en .357 en el catálogo, así que no se puede derivar. Sin decisión, esta ficha no lleva sello.",
    "revisar": true,
    "fuente": {
      "nombre": "C.I.P. TDCC (L6) · Federal Hydra-Shok 158 gr, cañón 4\"",
      "fecha": "2026-09"
    },
    "enCatalogo": false,
    "cartucho": null,
    "desc": "Un .38 Especial alargado y mucho más potente. Por eso un revólver .357 dispara los dos, pero uno de .38 Especial nunca debe disparar .357: no aguanta la presión. Retroceso y estruendo notables."
  },
  {
    "id": "5.7x28mm",
    "clase": "Pistola",
    "sistema": "Percusión central",
    "uso": "Táctico y deportivo",
    "alias": [
      "5.7×28 FN"
    ],
    "mm": 40.5,
    "velocidad": "~530 m/s",
    "velocidadMs": 530,
    "energia": "~365 J",
    "energiaJ": 363,
    "retroceso": "Bajo",
    "retrocesoNivel": 1,
    "avail": null,
    "legalArt": "art. 9o fr. I LFAFE",
    "legalNota": "HUECO MARCADO. Respaldado: supera el tope de .380 del instructivo DEFENSA-02-040. Cartucho moderno de la FN Five-seveN y el P90, asociado a cuerpos armados; sin texto en el repo que lo clasifique, no se afirma más.",
    "revisar": true,
    "fuente": {
      "nombre": "C.I.P. TDCC (L6) · FN SS197SR 40 gr, pistola Five-seveN",
      "fecha": "2026-09"
    },
    "enCatalogo": false,
    "cartucho": null,
    "desc": "Cartucho pequeño y rapidísimo que FN creó para la P90 y la Five-seveN. Se comporta más como un cartucho de rifle en miniatura que como uno de pistola: muy poco retroceso y trayectoria plana."
  },
  {
    "id": "7.62x39mm",
    "clase": "Carabina",
    "sistema": "Percusión central",
    "uso": "Táctico",
    "alias": [],
    "mm": 56,
    "velocidad": "~715 m/s",
    "velocidadMs": 715,
    "energia": "~2,000 J",
    "energiaJ": 2000,
    "retroceso": "Medio",
    "retrocesoNivel": 3,
    "avail": "ejercito",
    "legalArt": "art. 11 LFAFE",
    "legalNota": "Cartucho intermedio de fusil; uso exclusivo de las Fuerzas Armadas, como el resto de los calibres militares de alto poder.",
    "fuente": {
      "nombre": "Cifras divulgativas del catálogo",
      "fecha": "2026-09"
    },
    "enCatalogo": true,
    "cartucho": "imagenes/cartuchos/762x39.webp",
    "desc": "Cartucho intermedio robusto y fiable. Buen poder a distancias medias. Uso restringido a seguridad/FF.AA."
  },
  {
    "id": "5.56x45mm",
    "clase": "Carabina",
    "sistema": "Percusión central",
    "uso": "Táctico y deportivo",
    "alias": [],
    "mm": 57.4,
    "velocidad": "~940 m/s",
    "velocidadMs": 940,
    "energia": "~1,700 J",
    "energiaJ": 1700,
    "retroceso": "Bajo-Medio",
    "retrocesoNivel": 2,
    "avail": "ejercito",
    "legalArt": "art. 11 LFAFE",
    "legalNota": "Cartucho de fusil estándar OTAN. Los fusiles automáticos y los calibres militares de alto poder son de uso exclusivo de las Fuerzas Armadas; en el catálogo todas las armas en este calibre figuran así.",
    "fuente": {
      "nombre": "Cifras divulgativas del catálogo",
      "fecha": "2026-09"
    },
    "enCatalogo": true,
    "cartucho": "imagenes/cartuchos/556.webp",
    "desc": "Estándar OTAN para fusil. Retroceso ligero y trayectoria tensa. Uso restringido en plataformas tipo AR a corporaciones/FF.AA."
  },
  {
    "id": ".223 Rem",
    "clase": "Rifle",
    "sistema": "Percusión central",
    "uso": "Tiro deportivo, varmint y práctica",
    "alias": [
      "5.56×45 en versión civil"
    ],
    "mm": 57.4,
    "velocidad": "~990 m/s",
    "velocidadMs": 988,
    "energia": "~1,740 J",
    "energiaJ": 1738,
    "retroceso": "Bajo",
    "retrocesoNivel": 1,
    "avail": "dcam",
    "legalArt": "art. 10 LFAFE",
    "legalNota": "Versión civil del 5.56×45: la DCAM lo lista entre los cartuchos de alto poder y fuego central que un particular puede adquirir con permiso extraordinario vigente. La diferencia con el militar está en la presión y en el arma que lo dispara, no en el nombre.",
    "fuente": {
      "nombre": "C.I.P. TDCC (L6) · Federal AE223 55 gr",
      "fecha": "2026-09"
    },
    "enCatalogo": true,
    "cartucho": null,
    "desc": "Versión civil del 5.56×45 de la OTAN. Comparten medidas pero no presión ni recámara: un rifle marcado .223 no debe disparar munición militar 5.56, aunque el cartucho entre. Retroceso suave y trayectoria muy tensa."
  },
  {
    "id": ".22-250 Rem",
    "clase": "Rifle",
    "sistema": "Percusión central",
    "uso": "Varmint y tiro a distancia",
    "alias": [],
    "mm": 59.69,
    "velocidad": "~1,120 m/s",
    "velocidadMs": 1122,
    "energia": "~2,240 J",
    "energiaJ": 2242,
    "retroceso": "Bajo-Medio",
    "retrocesoNivel": 2,
    "avail": "dcam",
    "legalArt": "art. 10 LFAFE",
    "legalNota": "Rifle de caza menor y alimañas, autorizado a quienes practican tiro y cacería inscritos en un club o asociación acreditado ante la Secretaría de la Defensa Nacional.",
    "fuente": {
      "nombre": "C.I.P. TDCC (L6) · Hornady V-MAX 55 gr",
      "fecha": "2026-09"
    },
    "enCatalogo": true,
    "cartucho": null,
    "desc": "De los cartuchos más veloces del catálogo: una bala muy ligera empujada por una carga grande. Diseñado para alimañas a larga distancia, con retroceso moderado para el alcance que da."
  },
  {
    "id": ".410 Bore",
    "clase": "Escopeta",
    "sistema": "Percusión central",
    "uso": "Caza menor e iniciación",
    "alias": [],
    "mm": 63.5,
    "velocidad": "~360 m/s",
    "velocidadMs": 360,
    "energia": "Variable",
    "energiaJ": null,
    "retroceso": "Bajo",
    "retrocesoNivel": 1,
    "avail": "dcam",
    "legalArt": "arts. 9o y 10 LFAFE",
    "legalNota": "La escopeta más pequeña, muy por debajo del tope de calibre 12 del art. 10. Su cartucho figura en la tabla de requisitos de la DCAM para personal civil.",
    "fuente": {
      "nombre": "Cifras divulgativas del catálogo",
      "fecha": "2026-09"
    },
    "enCatalogo": true,
    "cartucho": "imagenes/cartuchos/410.webp",
    "desc": "El calibre de escopeta más pequeño. Retroceso muy suave: excelente para iniciación y control de plagas a corta distancia."
  },
  {
    "id": ".30-30 Win",
    "clase": "Rifle",
    "sistema": "Percusión central",
    "uso": "Caza media en monte cerrado",
    "alias": [
      ".30-30",
      ".30 WCF"
    ],
    "mm": 64.77,
    "velocidad": "~730 m/s",
    "velocidadMs": 729,
    "energia": "~2,580 J",
    "energiaJ": 2579,
    "retroceso": "Medio",
    "retrocesoNivel": 3,
    "avail": "dcam",
    "legalArt": "art. 10 LFAFE",
    "legalNota": "Rifle de palanca clásico de la sierra mexicana, autorizado a socios de club acreditado. No está en el catálogo DCAM, pero es de los más presentes en el campo.",
    "revisar": true,
    "fuente": {
      "nombre": "C.I.P. TDCC (L6) · Federal Power-Shok 150 gr",
      "fecha": "2026-09"
    },
    "enCatalogo": false,
    "cartucho": null,
    "desc": "El cartucho del rifle de palanca, con más de un siglo encima y todavía de los más vistos en el campo mexicano. Alcance corto frente a los modernos, pero de sobra para el monte cerrado."
  },
  {
    "id": ".243 Winchester",
    "clase": "Rifle",
    "sistema": "Percusión central",
    "uso": "Caza menor-media y varmint",
    "alias": [],
    "mm": 68.6,
    "velocidad": "~950 m/s",
    "velocidadMs": 950,
    "energia": "~3,200 J",
    "energiaJ": 3200,
    "retroceso": "Medio",
    "retrocesoNivel": 3,
    "avail": "dcam",
    "legalArt": "art. 10 LFAFE",
    "legalNota": "Rifle de caza autorizado a socios de un club de tiro o cacería acreditado, con permiso extraordinario de adquisición vigente.",
    "fuente": {
      "nombre": "Cifras divulgativas del catálogo",
      "fecha": "2026-09"
    },
    "enCatalogo": true,
    "cartucho": "imagenes/cartuchos/243win.webp",
    "desc": "Versátil y de retroceso suave. Trayectoria tensa para caza de venado pequeño y tiro a media distancia."
  },
  {
    "id": "12 GA",
    "clase": "Escopeta",
    "sistema": "Percusión central",
    "uso": "Caza, defensa y tiro al plato",
    "alias": [],
    "mm": 70,
    "velocidad": "~400 m/s",
    "velocidadMs": 400,
    "energia": "Variable",
    "energiaJ": null,
    "retroceso": "Alto",
    "retrocesoNivel": 5,
    "avail": "dcam",
    "legalArt": "arts. 9o y 10 LFAFE",
    "legalNota": "El art. 10 autoriza escopetas hasta calibre 12 con cañón de 635 mm o más; el 12 es justo el tope. El art. 9o permite además una escopeta a ejidatarios, comuneros y jornaleros del campo. En la DCAM el cartucho de escopeta tiene su propia cuota: hasta 1,000 por persona.",
    "fuente": {
      "nombre": "Cifras divulgativas del catálogo",
      "fecha": "2026-09"
    },
    "enCatalogo": true,
    "cartucho": "imagenes/cartuchos/12ga.webp",
    "desc": "El calibre de escopeta universal. Acepta perdigón, posta y bala; versátil para caza, deportivo (skeet/trap) y defensa."
  },
  {
    "id": "20 GA",
    "clase": "Escopeta",
    "sistema": "Percusión central",
    "uso": "Caza menor y tiro",
    "alias": [],
    "mm": 70,
    "velocidad": "~380 m/s",
    "velocidadMs": 380,
    "energia": "Variable",
    "energiaJ": null,
    "retroceso": "Medio",
    "retrocesoNivel": 3,
    "avail": "dcam",
    "legalArt": "arts. 9o y 10 LFAFE",
    "legalNota": "Escopeta por debajo del calibre 12, que es el tope del art. 10. Su cartucho figura en la tabla de requisitos de la DCAM para personal civil.",
    "fuente": {
      "nombre": "Cifras divulgativas del catálogo",
      "fecha": "2026-09"
    },
    "enCatalogo": true,
    "cartucho": "imagenes/cartuchos/20ga.webp",
    "desc": "Más ligero que el calibre 12, con menor retroceso. Ideal para caza de ave y tiradores de menor complexión."
  },
  {
    "id": "16 GA",
    "clase": "Escopeta",
    "sistema": "Percusión central",
    "uso": "Caza de ave y tiro",
    "alias": [
      "Calibre 16"
    ],
    "mm": 70,
    "velocidad": "~355 m/s",
    "velocidadMs": 355,
    "energia": "Variable",
    "energiaJ": null,
    "retroceso": "Medio-Alto",
    "retrocesoNivel": 4,
    "avail": "dcam",
    "legalArt": "arts. 9o y 10 LFAFE",
    "legalNota": "Escopeta por debajo del calibre 12, que es el tope del art. 10. La DCAM lista su cartucho junto al de 12 y 20 para protección de domicilio o parcela.",
    "fuente": {
      "nombre": "C.I.P. TAB VII (casco 2¾ in) · Federal Game-Shok 1 oz",
      "fecha": "2026-09"
    },
    "enCatalogo": true,
    "cartucho": null,
    "desc": "El calibre intermedio de las escopetas, entre el 12 y el 20. Tuvo su época dorada en la cacería de ave; hoy es minoritario y su cartucho cuesta más de encontrar que el de 12 o 20."
  },
  {
    "id": ".308 Winchester",
    "clase": "Rifle",
    "sistema": "Percusión central",
    "uso": "Caza y tiro de precisión",
    "alias": [],
    "mm": 71.1,
    "velocidad": "~840 m/s",
    "velocidadMs": 840,
    "energia": "~3,500 J",
    "energiaJ": 3500,
    "retroceso": "Alto",
    "retrocesoNivel": 5,
    "avail": "dcam",
    "legalArt": "art. 10 LFAFE",
    "legalNota": "La DCAM lo lista entre los cartuchos de alto poder y fuego central que un particular puede adquirir con permiso extraordinario vigente. Su gemelo militar, el 7.62×51, no.",
    "fuente": {
      "nombre": "Cifras divulgativas del catálogo",
      "fecha": "2026-09"
    },
    "enCatalogo": true,
    "cartucho": "imagenes/cartuchos/308win.webp",
    "desc": "Uno de los calibres de rifle más equilibrados. Precisión sobresaliente y enorme disponibilidad de munición y rifles."
  },
  {
    "id": "7.62x51mm",
    "clase": "Carabina",
    "sistema": "Percusión central",
    "uso": "Táctico y precisión",
    "alias": [],
    "mm": 71.1,
    "velocidad": "~840 m/s",
    "velocidadMs": 840,
    "energia": "~3,300 J",
    "energiaJ": 3300,
    "retroceso": "Alto",
    "retrocesoNivel": 5,
    "avail": "ejercito",
    "legalArt": "art. 11 LFAFE",
    "legalNota": "Equivalente militar del .308 Winchester. Mismas dimensiones de recámara, distinta clasificación legal: como cartucho de fusil de batalla es de uso exclusivo de las Fuerzas Armadas. Es el mejor ejemplo de que el estatus no lo fija el tamaño del cartucho.",
    "fuente": {
      "nombre": "Cifras divulgativas del catálogo",
      "fecha": "2026-09"
    },
    "enCatalogo": true,
    "cartucho": "imagenes/cartuchos/762x51.webp",
    "desc": "Equivalente militar del .308. Gran energía y alcance para fusiles de batalla y precisión. Uso restringido."
  },
  {
    "id": "6.5 Creedmoor",
    "clase": "Rifle",
    "sistema": "Percusión central",
    "uso": "Precisión a larga distancia y caza",
    "alias": [
      "6.5 CM"
    ],
    "mm": 71.76,
    "velocidad": "~825 m/s",
    "velocidadMs": 823,
    "energia": "~3,140 J",
    "energiaJ": 3139,
    "retroceso": "Medio",
    "retrocesoNivel": 3,
    "avail": "dcam",
    "legalArt": "art. 10 LFAFE",
    "legalNota": "Rifle de precisión y caza autorizado a socios de un club de tiro o cacería acreditado, con permiso extraordinario de adquisición vigente.",
    "fuente": {
      "nombre": "C.I.P. TDCC (L6) · Hornady ELD-X 143 gr",
      "fecha": "2026-09"
    },
    "enCatalogo": true,
    "cartucho": null,
    "desc": "El cartucho que popularizó el tiro de precisión moderno. Usa balas largas y esbeltas que conservan la energía y aguantan mejor el viento, con bastante menos retroceso que un magnum de alcance parecido."
  },
  {
    "id": "6.5 PRC",
    "clase": "Rifle",
    "sistema": "Percusión central",
    "uso": "Precisión a larga distancia",
    "alias": [],
    "mm": 73.7,
    "velocidad": "~915 m/s",
    "velocidadMs": 915,
    "energia": "~3,900 J",
    "energiaJ": 3900,
    "retroceso": "Alto",
    "retrocesoNivel": 5,
    "avail": "dcam",
    "legalArt": "art. 10 LFAFE",
    "legalNota": "Rifle de precisión y caza de montaña autorizado a socios de un club de tiro o cacería acreditado, con permiso extraordinario vigente.",
    "fuente": {
      "nombre": "Cifras divulgativas del catálogo",
      "fecha": "2026-09"
    },
    "enCatalogo": true,
    "cartucho": "imagenes/cartuchos/65prc.webp",
    "desc": "Cartucho moderno de altísimo coeficiente balístico. Favorito actual del tiro de precisión y la caza de montaña."
  },
  {
    "id": ".270 Winchester",
    "clase": "Rifle",
    "sistema": "Percusión central",
    "uso": "Caza media-mayor",
    "alias": [],
    "mm": 84.8,
    "velocidad": "~930 m/s",
    "velocidadMs": 930,
    "energia": "~3,800 J",
    "energiaJ": 3800,
    "retroceso": "Medio-Alto",
    "retrocesoNivel": 4,
    "avail": "dcam",
    "legalArt": "art. 10 LFAFE",
    "legalNota": "Rifle de caza mayor autorizado a socios de un club de tiro o cacería acreditado, con permiso extraordinario de adquisición vigente.",
    "fuente": {
      "nombre": "Cifras divulgativas del catálogo",
      "fecha": "2026-09"
    },
    "enCatalogo": true,
    "cartucho": "imagenes/cartuchos/270win.webp",
    "desc": "Clásico de cacería en campo abierto. Excelente alcance efectivo y energía para venado y borrego."
  },
  {
    "id": ".30-06 Sprg",
    "clase": "Rifle",
    "sistema": "Percusión central",
    "uso": "Caza mayor versátil",
    "alias": [],
    "mm": 84.8,
    "velocidad": "~880 m/s",
    "velocidadMs": 880,
    "energia": "~3,900 J",
    "energiaJ": 3900,
    "retroceso": "Alto",
    "retrocesoNivel": 5,
    "avail": "dcam",
    "legalArt": "art. 10 LFAFE",
    "legalNota": "La DCAM lo lista entre los cartuchos de alto poder y fuego central autorizados a particulares con permiso extraordinario vigente.",
    "fuente": {
      "nombre": "Cifras divulgativas del catálogo",
      "fecha": "2026-09"
    },
    "enCatalogo": true,
    "cartucho": "imagenes/cartuchos/3006.webp",
    "desc": "Histórico y polivalente. Cubre prácticamente toda la caza norteamericana con amplia gama de balas."
  },
  {
    "id": "7mm Rem Mag",
    "clase": "Rifle",
    "sistema": "Percusión central",
    "uso": "Caza a larga distancia",
    "alias": [],
    "mm": 84.8,
    "velocidad": "~920 m/s",
    "velocidadMs": 920,
    "energia": "~4,500 J",
    "energiaJ": 4500,
    "retroceso": "Alto",
    "retrocesoNivel": 5,
    "avail": "dcam",
    "legalArt": "art. 10 LFAFE",
    "legalNota": "Rifle magnum de caza a larga distancia, autorizado a socios de un club de tiro o cacería acreditado.",
    "fuente": {
      "nombre": "Cifras divulgativas del catálogo",
      "fecha": "2026-09"
    },
    "enCatalogo": true,
    "cartucho": "imagenes/cartuchos/7mmrem.webp",
    "desc": "Magnum de trayectoria muy tensa para tiros largos en campo abierto. Energía elevada con retroceso manejable para su clase."
  },
  {
    "id": ".300 Win Mag",
    "clase": "Rifle",
    "sistema": "Percusión central",
    "uso": "Caza mayor y larga distancia",
    "alias": [],
    "mm": 84.8,
    "velocidad": "~900 m/s",
    "velocidadMs": 900,
    "energia": "~4,800 J",
    "energiaJ": 4800,
    "retroceso": "Muy alto",
    "retrocesoNivel": 6,
    "avail": "dcam",
    "legalArt": "art. 10 LFAFE",
    "legalNota": "Rifle magnum de caza mayor, autorizado a socios de un club de tiro o cacería acreditado.",
    "fuente": {
      "nombre": "Cifras divulgativas del catálogo",
      "fecha": "2026-09"
    },
    "enCatalogo": true,
    "cartucho": "imagenes/cartuchos/300wm.webp",
    "desc": "Magnum de gran potencia para piezas grandes y tiro extremo. Exige buen dominio por su retroceso pronunciado."
  }
];



// ═══════════════════════════════════════════════════════════════════════
// CAMPOS DE TIRO — clubes y polígonos (PLACEHOLDER · suscripción a futuro)
// ═══════════════════════════════════════════════════════════════════════
window.CAMPOS = [
  { id: 'cdmx-valle',   nombre: 'Club de Tiro Valle de México', ciudad: 'Ciudad de México', estado: 'CDMX',     entorno: 'Outdoor',       distancias: '25 · 50 · 100 m', disciplinas: ['Pistola', 'Rifle', 'Precisión'], plan: 'Membresía mensual', estatus: 'Aliado destacado' },
  { id: 'mty-poligono', nombre: 'Polígono Monterrey',           ciudad: 'Monterrey',        estado: 'Nuevo León', entorno: 'Indoor',        distancias: '15 · 25 m',       disciplinas: ['Pistola', 'Defensivo'],            plan: 'Membresía / visita',  estatus: 'Próximamente' },
  { id: 'gdl-cinegetico', nombre: 'Club Cinegético Guadalajara', ciudad: 'Guadalajara',     estado: 'Jalisco',    entorno: 'Outdoor',       distancias: 'Plato · 50 m',    disciplinas: ['Escopeta', 'Skeet', 'Trap'],       plan: 'Membresía anual',     estatus: 'Próximamente' },
  { id: 'son-venado',   nombre: 'Rancho Cinegético El Venado',  ciudad: 'Hermosillo',       estado: 'Sonora',     entorno: 'Campo abierto', distancias: 'Caza · 100-300 m',disciplinas: ['Rifle', 'Cacería'],                plan: 'Por temporada',       estatus: 'Próximamente' },
  { id: 'pue-deportivo', nombre: 'Tiro Deportivo Puebla',       ciudad: 'Puebla',           estado: 'Puebla',     entorno: 'Indoor',        distancias: '25 m',            disciplinas: ['Pistola', 'Recreativo'],           plan: 'Visita / membresía',  estatus: 'Próximamente' },
  { id: 'qro-tactico',  nombre: 'Campo Táctico Querétaro',      ciudad: 'Querétaro',        estado: 'Querétaro',  entorno: 'Outdoor',       distancias: '25 · 50 m',       disciplinas: ['Defensivo', 'IPSC'],               plan: 'Membresía mensual',   estatus: 'Próximamente' },
];

// ═══════════════════════════════════════════════════════════════════════
// CURSOS — formación (PLACEHOLDER · catálogo de muestra)
// ═══════════════════════════════════════════════════════════════════════
window.CURSOS = [
  { id: 'manejo-seguro',  titulo: 'Manejo Seguro de Armas',         nivel: 'Básico',      duracion: '1 día (8 h)',  modalidad: 'Presencial', precio: 'Desde $—',
    desc: 'Fundamentos de seguridad, reglas de oro, manipulación, carga/descarga y almacenamiento responsable. Punto de partida para todo tirador.' },
  { id: 'tiro-defensivo', titulo: 'Tiro Defensivo',                 nivel: 'Intermedio',  duracion: '2 días (16 h)',modalidad: 'Presencial', precio: 'Desde $—',
    desc: 'Desenfunde, posiciones de tiro, recargas y toma de decisiones bajo estrés. Requiere haber tomado Manejo Seguro.' },
  { id: 'precision-rifle',titulo: 'Tiro de Precisión · Rifle',      nivel: 'Avanzado',    duracion: '2 días (16 h)',modalidad: 'Presencial', precio: 'Desde $—',
    desc: 'Fundamentos de precisión a media y larga distancia: posición, respiración, viento y lectura de impactos.' },
  { id: 'marco-legal',    titulo: 'Marco Legal y Portación',        nivel: 'Básico',      duracion: '4 h',          modalidad: 'En línea',   precio: 'Desde $—',
    desc: 'Ley Federal de Armas de Fuego, trámite SEDENA, categorías legales y portación responsable. Curso teórico.' },
  { id: 'defensa-hogar',  titulo: 'Defensa en el Hogar',            nivel: 'Intermedio',  duracion: '1 día (8 h)',  modalidad: 'Presencial', precio: 'Desde $—',
    desc: 'Selección de arma para domicilio, protocolos de seguridad familiar y respuesta ante intrusión dentro del marco legal.' },
  { id: 'mantenimiento',  titulo: 'Mantenimiento y Limpieza',       nivel: 'Básico',      duracion: '4 h',          modalidad: 'Presencial', precio: 'Desde $—',
    desc: 'Desarme básico, limpieza, lubricación y diagnóstico de fallas comunes para conservar tu arma en óptimas condiciones.' },
];

// ═══════════════════════════════════════════════════════════════════════
// LECCIONES — los fundamentos, al pie de la guía de calibres
// Van en folders plegables: quien busca un calibre no los tropieza, y quien
// baja los encuentra. Redactadas el 19-sep-2026; la cuarta no afirma nada que
// no esté ya en el texto legal del FAQ (src/lib/store.js, tema «Calibres»).
// ═══════════════════════════════════════════════════════════════════════
window.LECCIONES_CALIBRE = [
  {
    tema: 'Fundamentos',
    titulo: '¿Cómo se lee el nombre de un calibre?',
    cuerpo: [
      'No hay un solo sistema, hay tres conviviendo, y por eso los nombres parecen arbitrarios. En el sistema de pulgadas, «.380» significa que la bala mide 0.380 pulgadas de diámetro, unos 9.6 mm. Lo que va después suele ser quién lo creó o para qué: ACP es Automatic Colt Pistol, S&W es Smith & Wesson, Rem es Remington.',
      'En el sistema métrico se dan dos medidas: «9×19» es una bala de 9 mm en una vaina de 19 mm de largo. Por eso el 9×19 y el 9×21 no son el mismo cartucho aunque la bala sea idéntica: la vaina cambia, y con ella la recámara que lo acepta.',
      'Las escopetas no miden diámetro: miden cuántas bolas del tamaño del cañón salen de una libra de plomo. De ahí que el calibre 12 sea MÁS grande que el 20, al revés que en todo lo demás. El .410 es la excepción: ese sí es una medida en pulgadas.',
      'Consecuencia práctica: dos cartuchos con nombres casi iguales pueden no ser intercambiables. El .38 Especial y el .38 S&W no lo son. El .380 ACP tampoco es un «.38 pequeño».',
    ],
  },
  {
    tema: 'Fundamentos',
    titulo: '¿Qué es fuego anular y qué es percusión central?',
    cuerpo: [
      'Es dónde está el fulminante, la chispa que enciende la pólvora. En el fuego anular está repartido dentro del borde del culote: el percutor golpea la orilla y por eso la vaina no puede ser gruesa. Eso limita la presión y, con ella, la potencia.',
      'En la percusión central el fulminante es una cápsula en el centro de la base. Aguanta mucha más presión, y además se puede sustituir: una vaina de percusión central se recarga, una de fuego anular no.',
      'De los 30 calibres de esta guía solo dos son de fuego anular: el .22 LR y el .22 WMR. Todos los demás son de percusión central. Esa es también la razón de que el .22 sea tan barato y de que casi todo el mundo aprenda a tirar con él.',
    ],
  },
  {
    tema: 'Cifras',
    titulo: '¿Qué significan la velocidad, la energía y el retroceso?',
    cuerpo: [
      'La velocidad es a qué rapidez sale la bala del cañón. La energía combina esa velocidad con el peso de la bala, y es la cifra que mejor responde a «qué tan fuerte pega»: un .22 LR ronda los 150 julios y un .300 Win Mag pasa de 4,800. Treinta veces más.',
      'El retroceso es el empujón hacia atrás, y no se puede leer de la energía: el .45 ACP tiene menos energía que un .357 Magnum pero se siente como un empujón lento en vez de un latigazo, porque mueve una bala pesada despacio. Por eso aquí va en palabras y no en números.',
      'Un aviso sobre las cifras: cada fabricante mide la velocidad en el cañón que le conviene —24 pulgadas de rifle, 4 de revólver—, así que las velocidades de dos calibres distintos no son estrictamente comparables. Sirven como orden de magnitud. Cada ficha dice de qué carga y de qué fuente salió su número.',
      'Y en las escopetas la energía va como «Variable» a propósito: sería la de toda la columna de perdigón junta, repartida luego en cientos de municiones. Compararla con la bala única de un rifle no significaría nada.',
    ],
  },
  {
    tema: 'Ley',
    titulo: '¿Qué calibres puede tener un civil en México?',
    cuerpo: [
      'Para la protección del domicilio, el instructivo del permiso DEFENSA-02-040 fija un techo por tipo de arma: en pistola, calibre .380 como máximo —quedan fuera las .38 Súper, las .38 Comando y las de 9 mm—; en revólver, .38 Especial como máximo, sin el .357 Magnum.',
      'Quien practica tiro o cacería inscrito en un club acreditado ante la Secretaría de la Defensa Nacional puede acceder además a escopetas de hasta calibre 12 con cañón de 635 mm o más, y a rifles de repetición o semiautomáticos no convertibles en automáticos, con las excepciones de calibre que fija la Ley (art. 10). Los ejidatarios, comuneros y jornaleros del campo pueden poseer un rifle .22 o una escopeta (art. 9o).',
      'La Ley reserva las pistolas 9 mm Parabellum al uso exclusivo de la Fuerza Armada Permanente (art. 11). Ese es el motivo de que el calibre de pistola más común del mundo no esté al alcance de un particular aquí.',
      'Ojo con una trampa: el estatus no lo fija solo el cartucho, también la configuración del arma. El .380 ACP es de adquisición civil, pero las pistolas de cañón largo en ese calibre están restringidas a corporaciones de seguridad. Y el 7.62×51 tiene las mismas medidas que el .308 Winchester de caza y sin embargo es de uso militar.',
      'Esta guía resume; no sustituye a la Ley ni a la DCAM. Cada ficha cita el artículo en el que se apoya.',
    ],
  },
];
