(function () {
  window.AMX_SOPORTE_CONTENT = {
    titulo: 'Normas de la comunidad',
    apertura: 'Todos pueden contribuir a mejorar esta enciclopedia. Queremos construir un espacio seguro, respetuoso y útil para los amantes de las armas en México, sin importar su nivel de experiencia.',
    alcance: 'Estas normas se aplican a las reseñas, las denuncias y las aportaciones editoriales.',
    venta: {
      titulo: 'Aquí no se compra ni se vende',
      intro: 'Armado en México es una enciclopedia divulgativa. Las reseñas no pueden usarse para:',
      puntos: [
        'Ofrecer, solicitar, intercambiar o intermediar la compra o venta de armas, municiones o accesorios.',
        'Publicar datos de contacto con el propósito de cerrar una operación.',
        'Promocionar rifas, sorteos, descuentos o servicios comerciales.',
        'Pedir o compartir instrucciones para alterar matrículas, modificar ilegalmente un arma o evadir trámites.',
      ],
      consecuencia: 'El contenido no se publicará o se retirará, y cualquier denuncia se revisará internamente.',
    },
    normas: [
      {
        numero: '01', titulo: 'Respeto y seguridad',
        puntos: [
          'Debate la experiencia o el producto, no ataques a otras personas.',
          'No publiques insultos, amenazas, acoso, discriminación ni provocaciones.',
          'No compartas nombres completos, domicilios, teléfonos, matrículas, correos ni fotografías de terceros.',
          'No formules acusaciones de delitos contra una persona sin una fuente pública y verificable.',
        ],
      },
      {
        numero: '02', titulo: 'Experiencias útiles y pertinentes',
        puntos: [
          'Explica qué usaste, en qué contexto, qué funcionó y qué no.',
          'Mantén la reseña relacionada con la ficha correspondiente.',
          'No dupliques la misma reseña en varias fichas ni la utilices para consultas de trámite.',
          'Las críticas negativas son válidas cuando describen hechos o razones concretas. Una reseña no se retirará solo por ser desfavorable.',
        ],
      },
      {
        numero: '03', titulo: 'Independencia y conflictos de interés',
        puntos: [
          'Los fabricantes, distribuidores, tiendas, clubes y campos de tiro no pueden reseñar productos o servicios con los que tengan relación comercial o institucional.',
          'Quien recibió pago, producto, beneficio o instrucciones de una parte interesada tampoco puede presentar esa opinión como una experiencia independiente.',
          'Estas organizaciones sí pueden corregir o aportar información factual mediante el formulario público, si declaran su relación y proporcionan fuentes.',
        ],
      },
      {
        numero: '04', titulo: 'Autenticidad y manipulación',
        puntos: [
          'Comparte experiencias propias y exprésalas con tus propias palabras.',
          'No se permiten reseñas copiadas, múltiples, pagadas o coordinadas para subir o bajar una calificación.',
          'No se admiten publicidad, enlaces promocionales, captación de clientes ni spam.',
        ],
      },
    ],
    moderacion: [
      'Toda reseña entra en una cola privada antes de publicarse.',
      'Una persona del equipo decide si cumple las normas.',
      'Al aprobarla, el correo se elimina antes de moverla al dominio público.',
      'Una reseña publicada puede retirarse si después se confirma un incumplimiento.',
      'Las opiniones negativas fundadas reciben el mismo trato que las positivas.',
    ],
    acciones: [
      ['01', 'No publicar', 'La reseña no aparece si incumple las normas.'],
      ['02', 'Retirar', 'Una reseña publicada puede retirarse si se confirma un incumplimiento.'],
      ['03', 'Pedir información', 'Cuando exista correo, el equipo puede pedir datos adicionales.'],
      ['04', 'Archivar', 'La denuncia se marca como resuelta después de revisarla.'],
    ],
    motivos: [
      ['ilegal', 'Compraventa u otra actividad ilegal'],
      ['irrespetuoso', 'Insultos, acoso o amenazas'],
      ['fuera-de-tema', 'Fuera de tema o mensaje repetido'],
      ['comercial', 'Publicidad o contenido comercial'],
      ['manipulacion', 'Manipulación de la calificación'],
      ['datos', 'Datos personales de alguien'],
      ['otro', 'Otro'],
    ],
    denuncia: {
      intro: 'Este formulario sirve para señalar una reseña comunitaria. Para corregir una ficha, utiliza la aportación pública.',
      privacidad: 'Puedes denunciar de forma anónima. El correo es opcional y no se publicará.',
      exito: 'Revisaremos el reporte. Si dejaste un correo, podremos contactarte para pedir información adicional o comunicarte el resultado. No publicaremos tu dirección.',
    },
    clasificacion: {
      titulo: 'Cómo clasificamos la información',
      criterios: [
        'La disponibilidad indica que el artículo aparece en el inventario oficial citado; no representa existencias en tiempo real.',
        'La clasificación legal se basa en la fuente vigente y en la modalidad mostrada. No sustituye asesoría jurídica para un caso particular.',
        'Las especificaciones corresponden a la variante identificada. Si las fuentes se contradicen o no permiten distinguirla, el dato se mantiene en revisión en vez de completarse por inferencia.',
      ],
    },
    correccion: {
      titulo: 'Corregir información de la enciclopedia',
      intro: 'Las correcciones factuales se proponen públicamente en GitHub con la página, el dato actual, la solución y sus fuentes.',
      pasos: [
        'Revisa el formulario y pulsa personalmente Submit new issue; Armado en México no publica nada en tu nombre.',
        'El equipo contrasta la información y confirma si el cambio es necesario.',
        'El equipo puede corregirlo, invitarte a aportar un pull request o cerrar el issue explicando la decisión.',
      ],
      fuentes: [
        'Información legal: DOF, Cámara de Diputados, DEFENSA u otra fuente oficial vigente.',
        'Precios y existencias: inventarios oficiales de DCAM u OTCA.',
        'Especificaciones: fabricante o manual oficial.',
        'Historia y contexto: fuentes editoriales identificables y contrastables.',
      ],
    },
  };
})();
