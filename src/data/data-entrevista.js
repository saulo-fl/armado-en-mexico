// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// EL GUION DE LA ENTREVISTA «¿Puedo comprar un arma?».
//
// No es un arbol con punteros: es un ARRAY ORDENADO de preguntas, cada una con una
// guarda opcional sobre las respuestas anteriores. La siguiente pregunta es, literalmente,
// la siguiente del array cuya guarda se cumple. Por eso no pueden existir nodos huerfanos
// —no hay punteros que apunten a nada— y todo camino termina por construccion. Meter una
// pregunta es meter un objeto en su sitio; no hay que recablear a los vecinos.
//
// Este archivo NO tiene tabla de documentos. Cada opcion cita ids de `requisitos` de
// data-legal.js, y `scripts/check-legal.mjs --entrevista` falla si uno no resuelve. Es lo
// que impide que el mismo documento acabe descrito en dos sitios y corregido en uno solo.
//
// Tres cosas distintas, y la diferencia importa:
//   impedimento definitivo  la ley o el formato lo cierran. `remedio: null` obligatorio:
//                           insinuar una salida que no existe es peor que no decir nada.
//   impedimento subsanable  el formato lo exige y no lo tienes. `remedio` obligatorio.
//   aviso                   nadie lo exige, pero te vas a topar con ello. NO detiene.
//
// Si el corpus no lo respalda como requisito, no es una puerta: o es `ayuda`, o es `aviso`,
// o no esta. Por eso aqui no hay ninguna pregunta sobre la declaracion anual del SAT: no es
// requisito de SEDENA, y decir que sin ella no puedes comprar le cerraria la puerta a quien
// si puede (decision de Saulo, 19-sep-2026).
//
// Las `clave` viajan en el enlace compartible: son APPEND-ONLY. Cambiar la redaccion de una
// pregunta es libre; cambiar su clave rompe los enlaces que alguien ya compartio.

(function () {
  window.AMX_ENTREVISTA = {
    version: '2026-09-20',
    titulo: '¿Puedo comprar un arma?',
    advertencia: 'Esta entrevista es informativa y está escrita sobre el formato DEFENSA-02-040 y la ley vigente al 19 de septiembre de 2026. Reunir todos los documentos no obliga a la autoridad a otorgar el permiso: la autorización la decide la Secretaría de la Defensa Nacional.',
    etapas: [
      {
        id: 'quien',
        nombre: 'Quién eres',
      },
      {
        id: 'vivir',
        nombre: 'De qué vives',
      },
      {
        id: 'historial',
        nombre: 'Tu historial',
      },
      {
        id: 'uso',
        nombre: 'Para qué la quieres',
      },
      {
        id: 'papeles',
        nombre: 'Los papeles del expediente',
      },
    ],
    siempre: [],
    preguntas: [
      {
        clave: 'nac',
        id: 'nacimiento',
        etapa: 'quien',
        texto: '¿Naciste en México?',
        opciones: [
          {
            clave: 'mx',
            id: 'mx',
            texto: 'Sí',
            documentos: ['pa-acta-nacimiento', 'pa-curp'],
          },
          {
            clave: 'ex',
            id: 'extranjero',
            texto: 'No, nací en el extranjero',
            documentos: ['pa-residencia'],
            aviso: {
              texto: 'El formato todavía pide la «forma migratoria FM2», que ya no existe: la Ley de Migración de 2011 sustituyó aquellas formas por las condiciones de estancia de residente temporal y residente permanente. Lo que hoy tienes es tu tarjeta de residente vigente o tu carta de naturalización.',
              remedio: 'Antes de juntar los papeles, pregunta en la DGRFAFyCE qué condición de estancia te aceptan para ADQUIRIR: el artículo 27 de la LFAFE exige residente permanente, pero ese artículo regula la portación, no la compra. El pliego de la DCAM tampoco dice qué identificación admite de una persona extranjera residente; eso también se pregunta antes de ir.',
              fundamento: 'Ley de Migración, arts. 3o y 52 (condiciones de estancia), que sustituyeron las formas migratorias anteriores; el formato DEFENSA-02-040 Civiles 2026, requisito 1, conserva la redacción anterior. Los dos puntos quedan marcados como pendientes de confirmar en el corpus de armado.mx.',
            },
            escenario: 'extranjero',
          },
        ],
      },
      {
        clave: 'sex',
        id: 'sexo',
        etapa: 'quien',
        texto: '¿Eres hombre o mujer?',
        opciones: [
          {
            clave: 'h',
            id: 'hombre',
            texto: 'Hombre',
          },
          {
            clave: 'm',
            id: 'mujer',
            texto: 'Mujer',
            escenario: 'mujer',
          },
        ],
      },
      {
        clave: 'ed',
        id: 'edad',
        etapa: 'quien',
        texto: '¿Eres mayor de edad?',
        ayuda: 'El trámite se hace a tu nombre y la ventanilla pide documentos que solo existen si ya eres adulto: la cartilla del Servicio Militar Nacional liberada y una identificación oficial vigente.',
        opciones: [
          {
            clave: 's',
            id: 'si',
            texto: 'Sí',
            documentos: ['pa-identificacion'],
          },
          {
            clave: 'n',
            id: 'no',
            texto: 'Todavía no',
            impedimento: {
              tipo: 'subsanable',
              motivo: 'El formato pide, en sus requisitos 1 y 6, cartilla del Servicio Militar Nacional liberada e identificación oficial vigente a tu nombre. Sin mayoría de edad no tienes ni una ni otra, y el expediente se arma con tus documentos.',
              remedio: 'Es cuestión de tiempo. Cuando seas mayor de edad saca tu identificación oficial vigente y, si eres hombre, libera tu cartilla en la Oficina de Reclutamiento de tu Zona Militar o en la Oficina Central de Reclutamiento de la Ciudad de México. Con esos dos documentos ya puedes empezar el expediente.',
              fundamento: 'Formato DEFENSA-02-040 Civiles 2026, requisitos 1 y 6 del anverso. El corpus normativo de armado.mx no publica una edad mínima con artículo y fuente verificables, así que aquí no se cita ninguno: solo lo que el formato sí exige.',
            },
          },
        ],
      },
      {
        clave: 'car',
        id: 'cartilla',
        etapa: 'quien',
        texto: '¿Cuentas con la cartilla del Servicio Militar Nacional liberada?',
        si: [
          {
            pregunta: 'nacimiento',
            es: ['mx'],
          },
          {
            pregunta: 'sexo',
            es: ['hombre'],
          },
        ],
        opciones: [
          {
            clave: 's',
            id: 'si',
            texto: 'Sí',
            documentos: ['pa-smn'],
            escenario: 'hombre',
          },
          {
            clave: 'n',
            id: 'no',
            texto: 'No',
            impedimento: {
              tipo: 'subsanable',
              motivo: 'El requisito 1 del formato pide fotocopia legible de la cartilla del Servicio Militar Nacional liberada. Sin ella el expediente queda incompleto desde el primer renglón.',
              remedio: 'La expide la Oficina de Reclutamiento de la Zona Militar que te corresponde o la Oficina Central de Reclutamiento en la Ciudad de México. Es un documento permanente: una vez liberada no caduca ni se revalida.',
              fundamento: 'Formato DEFENSA-02-040 Civiles 2026, requisito 1 del anverso.',
            },
            escenario: 'hombre',
          },
          {
            clave: 'mil',
            id: 'militar',
            texto: 'Soy personal militar',
            aviso: {
              texto: 'Esta entrevista está hecha sobre el formato de CIVILES. El personal militar usa la versión MILITAR del 02-040 y se identifica con su credencial militar vigente (CIM o TIM) junto con credencial para votar, pasaporte, cartilla del Servicio Militar Nacional o cédula profesional con fotografía.',
              remedio: 'Pide el formato militar y la lista de documentos en tu unidad, dependencia o instalación de adscripción. El corpus de armado.mx no verificó qué documento sustituye a la cartilla para el personal militar en este trámite, así que confírmalo ahí antes de armar nada.',
              fundamento: 'Formato DEFENSA-02-040 Civiles 2026, requisito 1 del anverso, variante de personal militar; hueco anotado en el corpus sobre el documento sustituto.',
            },
            escenario: 'militar',
          },
        ],
      },
      {
        clave: 'viv',
        id: 'modo-vivir',
        etapa: 'vivir',
        texto: '¿De qué vives hoy?',
        ayuda: 'El comprobante de ingresos es el requisito que más solicitudes detiene, y el documento cambia según de dónde venga tu dinero. Ojo: el certificado de «modo honesto de vivir» que quizá hayas oído nombrar es de la licencia de portación, no de este permiso.',
        opciones: [
          {
            clave: 'a',
            id: 'asalariado',
            texto: 'Trabajo para un patrón',
            escenario: 'asalariado',
          },
          {
            clave: 'i',
            id: 'independiente',
            texto: 'Trabajo por mi cuenta o tengo un negocio',
            escenario: 'independiente',
          },
          {
            clave: 'p',
            id: 'pensionado',
            texto: 'Estoy pensionado o jubilado',
            escenario: 'pensionado',
          },
          {
            clave: 'e',
            id: 'ejidatario',
            texto: 'Soy ejidatario, comunero o jornalero del campo',
            escenario: 'ejidatario',
          },
          {
            clave: 'n',
            id: 'ninguno',
            texto: 'Ninguna de las cuatro',
            impedimento: {
              tipo: 'subsanable',
              motivo: 'El requisito 2 del formato solo reconoce cuatro maneras de acreditar ingresos: carta de trabajo del patrón, constancia de un contador público con cédula, documento de la pensión, o certificado de ejidatario, comunero o jornalero. No hay una quinta casilla.',
              remedio: 'La puerta que queda abierta es la del contador: un documento original expedido por un contador público con cédula profesional, con la fotocopia de su cédula por ambos lados ampliada al 200%. Si tus ingresos se pueden sustentar, un contador titulado puede firmarlo.',
              fundamento: 'Formato DEFENSA-02-040 Civiles 2026, requisito 2 del anverso e instructivo punto 13.',
            },
          },
        ],
      },
      {
        clave: 'trab',
        id: 'carta-trabajo',
        etapa: 'vivir',
        texto: '¿Tu patrón puede darte una carta de trabajo en original que diga tu puesto, tu antigüedad y tus percepciones?',
        ayuda: 'Va en ORIGINAL: es uno de los tres documentos que el instructivo no acepta en fotocopia. El membrete tiene que traer razón social, teléfono de contacto, domicilio y correo electrónico de la empresa.',
        si: [
          {
            pregunta: 'modo-vivir',
            es: ['asalariado'],
          },
        ],
        opciones: [
          {
            clave: 's',
            id: 'si',
            texto: 'Sí',
            documentos: ['pa-ingresos'],
          },
          {
            clave: 'n',
            id: 'no',
            texto: 'No',
            impedimento: {
              tipo: 'subsanable',
              motivo: 'El requisito 2 pide la carta de trabajo en original, con membrete que asiente razón social, teléfono, domicilio y correo, y que especifique puesto, antigüedad y percepciones. Sin ese papel no se acredita el ingreso.',
              remedio: 'Pídesela por escrito a Recursos Humanos o a tu patrón, con esos datos exactos, y guarda el original sin dobleces. Si tu patrón no la expide, el mismo requisito admite la otra puerta: la constancia de ingresos de un contador público con cédula profesional.',
              fundamento: 'Formato DEFENSA-02-040 Civiles 2026, requisito 2 del anverso e instructivo punto 13.',
            },
          },
        ],
      },
      {
        clave: 'cont',
        id: 'contador',
        etapa: 'vivir',
        texto: '¿Puedes conseguir la constancia de ingresos en ORIGINAL, expedida por un contador público con cédula profesional, junto con la copia de su cédula por ambos lados ampliada al 200%?',
        ayuda: 'SEDENA no pide tu declaración anual: lo que pide es la constancia del contador. Pero el contador normalmente te va a pedir tu última declaración para poder sustentarla y firmarla.',
        si: [
          {
            pregunta: 'modo-vivir',
            es: ['independiente'],
          },
        ],
        opciones: [
          {
            clave: 's',
            id: 'si',
            texto: 'Sí',
            documentos: ['pa-ingresos'],
          },
          {
            clave: 'n',
            id: 'no',
            texto: 'No',
            impedimento: {
              tipo: 'subsanable',
              motivo: 'Para quien trabaja por su cuenta, el requisito 2 del formato pide un documento original expedido por contador público con cédula profesional. Es el comprobante de ingresos que la ventanilla espera en tu caso.',
              remedio: 'Cualquier contador público titulado con cédula puede expedirla: no tiene que ser «tu» contador de siempre. El documento va en ORIGINAL y se acompaña de la fotocopia de la cédula por ambos lados ampliada al 200%; esa cédula se puede verificar en el Registro Nacional de Profesionistas, así que tiene que estar a nombre de quien firma.',
              fundamento: 'Formato DEFENSA-02-040 Civiles 2026, requisito 2 del anverso, variante de trabajador independiente, e instructivo punto 13.',
            },
          },
        ],
      },
      {
        clave: 'pens',
        id: 'pension',
        etapa: 'vivir',
        texto: '¿Tienes el documento que acredita tu pensión o jubilación y el último talón de pago?',
        ayuda: 'Aquí sí van fotocopias: la resolución o la credencial por ambos lados, ampliada al 200%, más la copia del talón de pago más reciente.',
        si: [
          {
            pregunta: 'modo-vivir',
            es: ['pensionado'],
          },
        ],
        opciones: [
          {
            clave: 's',
            id: 'si',
            texto: 'Sí, los dos',
            documentos: ['pa-ingresos'],
          },
          {
            clave: 'n',
            id: 'no',
            texto: 'Me falta alguno',
            impedimento: {
              tipo: 'subsanable',
              motivo: 'El requisito 2 acredita el ingreso del pensionado con dos papeles: la fotocopia del documento que otorga la pensión o jubilación y la fotocopia del último talón de pago. Van los dos.',
              remedio: 'Pide la reposición de la resolución o de la credencial y el último talón en la institución de seguridad social o en la entidad que te paga la pensión. Saca las copias por ambos lados y ampliadas al 200%.',
              fundamento: 'Formato DEFENSA-02-040 Civiles 2026, requisito 2 del anverso, variante de pensionado, e instructivo punto 13.',
            },
          },
        ],
      },
      {
        clave: 'ejid',
        id: 'documento-campo',
        etapa: 'vivir',
        texto: '¿Cuál de estos documentos del campo puedes conseguir?',
        ayuda: 'El certificado lo firma el Presidente del Comisariado Ejidal o de bienes comunales. Si no lo tienes, el formato acepta en su lugar la constancia de posesión de la primera autoridad administrativa municipal, con membrete, sello, número de oficio, teléfono y dirección.',
        si: [
          {
            pregunta: 'modo-vivir',
            es: ['ejidatario'],
          },
        ],
        opciones: [
          {
            clave: 'c',
            id: 'certificado',
            texto: 'El certificado de ejidatario, comunero o jornalero del campo',
            documentos: ['pa-ingresos'],
          },
          {
            clave: 'p',
            id: 'posesion',
            texto: 'El certificado no, pero sí la constancia de posesión del municipio',
            documentos: ['pa-ingresos'],
          },
          {
            clave: 'n',
            id: 'ninguno',
            texto: 'Ninguno de los dos',
            impedimento: {
              tipo: 'subsanable',
              motivo: 'El requisito 2 acredita tu ingreso con el certificado de ejidatario, comunero o jornalero del campo y, a falta de ese, con la constancia de posesión. Sin alguno de los dos no hay comprobante de ingresos en tu caso.',
              remedio: 'Pide el certificado al Presidente del Comisariado Ejidal o de bienes comunales reconocido por la Asamblea e inscrito en el Registro Agrario Nacional, o acreditado por ejecutoria del Tribunal Agrario. Si no lo consigues, acude a la primera autoridad administrativa municipal por la constancia de posesión, y cuida que salga con membrete, sello, número de oficio, teléfono y dirección.',
              fundamento: 'Formato DEFENSA-02-040 Civiles 2026, requisito 2 del anverso, variante de ejidatario, e instructivo punto 13; concordante con el artículo 14 del Reglamento de la LFAFE.',
            },
          },
        ],
      },
      {
        clave: 'ap',
        id: 'antecedentes',
        etapa: 'historial',
        texto: '¿Tienes antecedentes penales?',
        ayuda: 'La constancia la expide la autoridad de la entidad donde RESIDES, no donde naciste ni donde te juzgaron. Va en original, con firma autógrafa y sello, y con fecha de expedición no mayor a seis meses.',
        opciones: [
          {
            clave: 'n',
            id: 'no',
            texto: 'No',
            documentos: ['pa-antecedentes'],
          },
          {
            clave: 's',
            id: 'si',
            texto: 'Sí',
            impedimento: {
              tipo: 'definitivo',
              motivo: 'El instructivo del formato lo dice sin rodeos: si se comprueban antecedentes penales NO se expide la autorización, aun cuando se hayan reunido los demás requisitos. Aquí no hay documento que compense.',
              remedio: null,
              fundamento: 'Formato DEFENSA-02-040 Civiles 2026, requisito 3 del anverso e instructivo punto 14.',
              nota: 'Si crees que ese registro es un error, que ya fue cancelado o que no debería aparecer, eso se aclara con la autoridad que expide la constancia en tu estado, que es la única que puede corregir lo que ella misma certifica. Este sitio solo lee la norma: no ve tu expediente, no lo consulta y no puede cambiarlo.',
            },
          },
        ],
      },
      {
        clave: 'uso',
        id: 'uso',
        etapa: 'uso',
        texto: '¿Para qué vas a pedir el arma?',
        ayuda: 'La modalidad que declares define qué documentos extra te piden y cada cuándo puedes volver a comprar cartuchos: un año en protección al domicilio y a la parcela, tres meses en actividades cinegéticas y un mes en tiro deportivo. En un mismo trámite se pueden solicitar hasta tres armas, con un solo juego de documentos.',
        opciones: [
          {
            clave: 'do',
            id: 'domicilio',
            texto: 'Protección al domicilio',
            aviso: {
              texto: 'En esta modalidad el instructivo del formato solo autoriza un arma corta. Eso es criterio administrativo de la dependencia, no un tope de la ley: el artículo 15 reformado en 2025 ya no fija un número máximo de armas en el domicilio, y el límite legal de verdad está en el artículo 83 Bis, que castiga como acopio tener más de cinco armas de las permitidas sin el permiso correspondiente.',
              remedio: 'Si quieres más de un arma en casa, pregunta en ventanilla cómo están aplicando ese criterio antes de llenar el formato. Los calibres sí los fija la ley: pistola hasta .380 y sus equivalentes, revólver hasta .38 Especial.',
              fundamento: 'Instructivo del formato DEFENSA-02-040 Civiles 2026, puntos 3 y 5, contrastado con la LFAFE arts. 15, 9o fracciones I y II (reformados DOF 29-05-2025) y 83 Bis. Donde no coinciden, manda la ley.',
            },
            escenario: 'domicilio',
          },
          {
            clave: 'ti',
            id: 'tiro-caza',
            texto: 'Tiro deportivo o cacería',
            escenario: 'tiro-caza',
          },
          {
            clave: 'co',
            id: 'coleccion',
            texto: 'Colección',
            escenario: 'coleccion',
          },
        ],
      },
      {
        clave: 'club',
        id: 'club',
        etapa: 'uso',
        texto: '¿Tienes credencial vigente de un club registrado ante la SEDENA y su presidente te puede firmar la constancia de socio activo?',
        ayuda: 'Son dos papeles del mismo club: la credencial (fotocopia por ambos lados al 200%, con día, mes y año de inicio y término, y no mayor a dos años) y la constancia de socio activo en el modelo anexo al formato, con sello y firma del presidente.',
        si: [
          {
            pregunta: 'uso',
            es: ['tiro-caza'],
          },
        ],
        opciones: [
          {
            clave: 's',
            id: 'si',
            texto: 'Sí, tengo los dos',
            documentos: ['pa-club', 'pa-socio-activo'],
          },
          {
            clave: 'c',
            id: 'solo-credencial',
            texto: 'Tengo la credencial, pero no la constancia',
            impedimento: {
              tipo: 'subsanable',
              motivo: 'El requisito 7 pide las dos cosas. En la constancia, el presidente del club hace constar tu antigüedad, el número de tu credencial y su vigencia; la credencial sola no lo sustituye.',
              remedio: 'Llévale al presidente del club el modelo de «Constancia de Socio Activo» que viene anexo al formato, para que lo llene, lo selle y lo firme. El propio modelo le advierte de los artículos 243 y 244 del Código Penal Federal sobre falsificación de documentos, así que revisará tus datos antes de firmar: ve con la credencial en la mano.',
              fundamento: 'Formato DEFENSA-02-040 Civiles 2026, requisito 7 del anverso y anexo «Constancia de Socio Activo».',
            },
          },
          {
            clave: 'n',
            id: 'sin-club',
            texto: 'No pertenezco a ningún club',
            impedimento: {
              tipo: 'subsanable',
              motivo: 'En tiro deportivo y en actividades cinegéticas el requisito 7 exige la credencial de un club o asociación registrado ante la SEDENA. Sin club no hay expediente en esta modalidad.',
              remedio: 'Inscríbete en un club de tiro o cinegético registrado ante la SEDENA y espera a tener la credencial vigente y la constancia de socio activo. Si lo que quieres en realidad es tener el arma en casa, la otra puerta es declarar la modalidad de protección al domicilio, que no pide club.',
              fundamento: 'Formato DEFENSA-02-040 Civiles 2026, requisito 7 del anverso.',
            },
          },
        ],
      },
      {
        clave: 'col',
        id: 'permiso-coleccion',
        etapa: 'uso',
        texto: '¿Tienes vigente el permiso para poseer colección de armas de fuego?',
        ayuda: 'Es un permiso aparte, el DEFENSA-02-032, que expide la misma dirección; en el expediente va la fotocopia con la fecha de vigencia legible. Ten presente que desde 2025 queda expresamente prohibido comprar cartuchos para las armas de colección.',
        si: [
          {
            pregunta: 'uso',
            es: ['coleccion'],
          },
        ],
        opciones: [
          {
            clave: 's',
            id: 'si',
            texto: 'Sí, está vigente',
            documentos: ['pa-permiso-coleccion'],
          },
          {
            clave: 'n',
            id: 'no',
            texto: 'No lo tengo o ya venció',
            impedimento: {
              tipo: 'subsanable',
              motivo: 'El requisito 8 pide la fotocopia del «Permiso para Poseer Colección de Armas de Fuego» con la fecha de vigencia legible y actual. En la modalidad de colección, ese permiso es la puerta de entrada.',
              remedio: 'Tramita primero el permiso de colección (DEFENSA-02-032) ante la Dirección General del Registro Federal de Armas de Fuego y Control de Explosivos; entre otras cosas tendrás que aceptar por escrito las inspecciones de la Secretaría. Pide ahí mismo la lista completa y vigente de documentos: el corpus de armado.mx no logró recuperar esa lista de una fuente oficial, así que no te fíes de listas de terceros.',
              fundamento: 'Formato DEFENSA-02-040 Civiles 2026, requisito 8 del anverso; LFAFE arts. 21 a 23. La lista de requisitos del DEFENSA-02-032 está marcada como hueco en el corpus de armado.mx.',
            },
          },
        ],
      },
      {
        clave: 'dom',
        id: 'domicilio',
        etapa: 'papeles',
        texto: '¿Tienes un comprobante de domicilio de los últimos tres meses?',
        ayuda: 'Sirve el predial, el agua, la luz o el teléfono residencial, con fecha de expedición no mayor a tres meses. El domicilio tiene que coincidir con el de tu identificación oficial y con el estado de tu constancia de antecedentes penales.',
        opciones: [
          {
            clave: 's',
            id: 'a-mi-nombre',
            texto: 'Sí, y está a mi nombre',
            documentos: ['pa-domicilio'],
          },
          {
            clave: 'c',
            id: 'constancia',
            texto: 'No está a mi nombre, pero el titular del inmueble me firma la constancia domiciliaria',
            documentos: ['pa-domicilio'],
          },
          {
            clave: 'n',
            id: 'no',
            texto: 'No tengo comprobante ni quién me firme',
            impedimento: {
              tipo: 'subsanable',
              motivo: 'El requisito 5 pide comprobante de domicilio con menos de tres meses de expedido. Si no está a tu nombre, el formato admite la constancia domiciliaria de su modelo anexo, firmada por el titular del inmueble y acompañada del comprobante de ese titular y de la fotocopia de su identificación oficial vigente por ambos lados ampliada al 200%.',
              remedio: 'Consigue un recibo reciente de predial, agua, luz o teléfono residencial del domicilio donde vives. Si no está a tu nombre, pídele al titular que te firme la constancia domiciliaria del modelo anexo «SEDENA-02-040-Const. Dom.» y que te preste su comprobante y su identificación para las copias.',
              fundamento: 'Formato DEFENSA-02-040 Civiles 2026, requisito 5 del anverso, instructivo puntos 10, 11 y 13, y anexo «SEDENA-02-040-Const. Dom.».',
            },
          },
        ],
      },
      {
        clave: 'med',
        id: 'medico',
        etapa: 'papeles',
        texto: '¿Puedes hacerte el certificado médico-psicológico de salud mental con un profesional que tenga cédula?',
        ayuda: 'Para ADQUIRIR solo se revisa la salud mental: no hay examen físico ni toxicológico, esos son de la licencia de portación. Por eso una persona con discapacidad motriz sí puede adquirir y poseer. El certificado se elabora conforme al Acuerdo publicado en el DOF el 21 de abril de 2021; los exámenes exactos que ese Acuerdo exige no se pudieron verificar en la fuente oficial, así que confirma el contenido con quien te lo expida.',
        opciones: [
          {
            clave: 's',
            id: 'si',
            texto: 'Sí',
            documentos: ['pa-medico'],
          },
          {
            clave: 'n',
            id: 'no',
            texto: 'Todavía no',
            impedimento: {
              tipo: 'subsanable',
              motivo: 'El requisito 4 pide el certificado médico-psicológico de salud mental en ORIGINAL, acompañado de los resultados de las pruebas psicológicas, los tests aplicados y la copia al 200% de la cédula profesional de quien lo firma.',
              remedio: 'Busca a un profesional con cédula y pídele el certificado conforme al Acuerdo del DOF del 21 de abril de 2021, con los resultados de las pruebas y los tests que aplicó, y con la copia de su cédula ampliada al 200%. El formato no publica plazo de vigencia para este documento, así que hazlo cuando ya vayas a entregar.',
              fundamento: 'Formato DEFENSA-02-040 Civiles 2026, requisito 4 del anverso, que remite al Acuerdo publicado en el DOF el 21-04-2021.',
            },
          },
        ],
      },
      {
        clave: 'nom',
        id: 'nombres',
        etapa: 'papeles',
        texto: '¿Tu nombre está escrito exactamente igual en el acta de nacimiento, la CURP, la identificación oficial y el comprobante de domicilio?',
        ayuda: 'Es la causa de rechazo más común del trámite. Golpea sobre todo a quien tiene acta corregida, cambio de nombre o de identidad de género, apellidos mal capturados o nació en el extranjero. La CURP, además, debe ser la impresión del formato nuevo.',
        opciones: [
          {
            clave: 's',
            id: 'si',
            texto: 'Sí, idéntico en los cuatro',
          },
          {
            clave: 'n',
            id: 'no',
            texto: 'No, hay diferencias',
            impedimento: {
              tipo: 'subsanable',
              motivo: 'Los nombres y apellidos del acta deben coincidir con los de todos los demás documentos. La falta de coincidencia exacta entre acta, CURP, identificación y comprobante de domicilio es la causa de rechazo más común del trámite.',
              remedio: 'Corrige primero el documento equivocado: si el error viene del acta, en el Registro Civil de la entidad donde te registraron; si viene de la CURP, imprime el formato nuevo ya corregido. Después actualiza la identificación oficial para que el nombre y el domicilio empaten con el comprobante.',
              fundamento: 'Formato DEFENSA-02-040 Civiles 2026, requisitos 9 y 10 del anverso e instructivo puntos 1 y 10.',
            },
          },
          {
            clave: 'ns',
            id: 'no-revisado',
            texto: 'No lo he revisado',
            aviso: {
              texto: 'Revísalo con los cuatro documentos sobre la mesa antes de ir a ventanilla. Una letra distinta, un apellido pegado o un acento de más bastan para que te regresen el expediente completo.',
              remedio: 'Compara letra por letra el acta, la CURP, la identificación oficial y el comprobante de domicilio. Saca la CURP en el formato nuevo y, si algo no empata, corrígelo antes de armar el resto.',
              fundamento: 'Formato DEFENSA-02-040 Civiles 2026, requisitos 9 y 10 del anverso e instructivo puntos 1 y 10.',
            },
          },
        ],
      },
    ],
  };
})();
