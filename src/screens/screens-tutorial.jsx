// Armado en México — Introducción / Onboarding
// ─────────────────────────────────────────────────────────────────
// EL EXPEDIENTE DE BIENVENIDA. Cuatro pasos, no seis (tablero de correcciones
// de Saulo, 10-sep-2026): se retiran «Arsenal y comparador» —«no es
// relevante»— y «Armas traumáticas» —«no es necesario para el aviso legal».
//
// Antes esto era la piel HUD oscura anterior al rediseño, con literales de la
// paleta vieja (lavados de #DDD5C4 al 3-12 %) que sobre el lienzo claro de hoy
// quedaban invisibles o sucios. Ahora habla el idioma del sitio: la hoja de un
// expediente con su pestaña, la copia instantánea, y los sellos de tinta —los
// mismos de `.amx-sello`— haciendo de aviso legal y de botón.
//
// EL FOLDER Y LA COPIA SON FOTOGRAFÍAS, no CSS (13-sep-2026). Estuvieron un
// tiempo dibujados con cajas —papel que seguía al tema, gris en oscuro— y se
// leían como los vectores planos que la Home ya había retirado. Ahora son los
// mismos recortes con alfa: `folder-manila.webp` (el de la Home) y
// `foto-marco.webp`. Son objetos diegéticos, así que NO siguen al tema: lo
// que va escrito encima usa las tintas del cartón, igual que en la Home.
//
// ES OBLIGATORIO: ya no hay SALTAR. «Menos accesible, pero es imprescindible
// esta información por legalidad» (Saulo). A cambio solo se abre para quien
// entra por la PORTADA —la puerta la guarda app.jsx—, no para quien llega
// desde un buscador a una de las 322 páginas prerenderizadas: sin SALTAR,
// atravesar cuatro pantallas antes de ver la ficha que venía a leer sería
// castigar al que llega por la puerta de atrás.
//
// Persistencia del "ya visto" en localStorage: amx_onboarded_v1
// ─────────────────────────────────────────────────────────────────

(function () {
  const P = window.PALETTE;

  // ── EL SELLO — la estampación de tinta, aquí también como botón ──────────
  // Reusa `.amx-sello` de estilo.css entera: el filo de 2px, el giro y —lo que
  // de verdad lo hace sello— la máscara de desgaste sobre `sello-desgaste.webp`.
  // Solo se cambia lo que aquí es distinto, y son dos cosas:
  //
  //   1. Estas leyendas son FRASES («NO EMITIMOS LICENCIAS NI PERMISOS»), no
  //      una palabra: parten en varias líneas en vez de `white-space: nowrap`.
  //   2. La tinta depende de DÓNDE cae. Dentro del folder cae sobre el manila,
  //      que no cambia con el tema: `--sello-restr`/`--sello-civil`, las mismas
  //      del «EXCLUSIVO» de la Home. Medido sobre el 1 % más oscuro del papel
  //      de la foto (#EEDFBD): rojo 5.19:1 · verde 4.87:1 · tinta 13.19:1 ·
  //      tinta-2 5.92:1. El sello «Siguiente» del pie cae sobre el
  //      lienzo, que sí cambia: ahí `--alerta`, que tiene gemelo oscuro. Las
  //      reglas están en el <style> del componente.
  //
  // El giro entra por `--tut-giro` para que dos sellos seguidos no salgan
  // peinados al mismo ángulo — nadie estampa dos veces igual. Es el mismo
  // recurso que `--giro` en las copias del carrusel. La excepción son los tres
  // avisos legales del paso 2, que van rectos a propósito (ver `mission`).
  function Sello({ children, tono = 'restr', giro = -3, clase = '' }) {
    return (
      <span
        className={'amx-sello tut-sello tut-sello--' + tono + (clase ? ' ' + clase : '')}
        style={{ '--tut-giro': giro + 'deg' }}>{children}</span>
    );
  }

  // ── Definición de los pasos ───────────────────────────────────────
  // visual: el objeto de arriba · eyebrow/title/body: el texto mecanografiado
  // sellos: las estampaciones que cierran la hoja · entradas: el índice
  function buildSlides(vp) {
    const copiaAncho = vp.isDesktop ? 208 : 176;
    return [
      {
        key: 'welcome',
        eyebrow: 'Bienvenido a',
        title: 'Armado en México',
        // Literal del tablero de Saulo (10-sep-2026): la copia de la portada es
        // suya, no del código, y se transcribe tal cual. Solo se añadió el «de» de
        // «más grande de todo México», que faltaba y Saulo confirmó al revisar el PR.
        body: 'La guía de armas y legalidad más grande de todo México. Conoce el armamento disponible, los trámites necesarios y mucho más',
        // El rombo en SVG que había aquí se fue: «se nota IA slop de webs»
        // (Saulo). En su sitio, el logotipo dentro de una foto revelada de marco
        // blanco parejo, sin faldón: el nombre ya está mecanografiado debajo y
        // rotularlo otra vez sería decir dos veces lo mismo.
        visual: (
          <figure className="tut-copia" style={{ width: copiaAncho, margin: '0 auto' }}>
            <div className="tut-copia-foto">
              <img src="imagenes/logo-armado-mx.webp" alt="Armado en México" />
            </div>
          </figure>
        ),
      },
      {
        key: 'mission',
        eyebrow: 'Antes de empezar',
        title: '¿Qué es Armado en México?',
        body: 'Es una plataforma divulgativa de código abierto que busca dar transparencia e información a los mexicanos respecto a la legalidad, los trámites necesarios y los costos que conllevan las armas de fuego.',
        // Las tres etiquetas «✕ no…» pasan a sellos rojos. Van DESPUÉS del
        // cuerpo, que es donde el tablero las coloca: un sello se estampa sobre
        // un documento ya escrito, no antes de escribirlo.
        // RECTOS, los tres a 0° (Saulo, 13-sep-2026): «sacrificamos estilo
        // realista a cambio de legibilidad, pero en este caso vale la pena ya que
        // es parte del aviso legal». Conservan el filo y el desgaste de tinta.
        sellos: [
          { texto: 'No pertenecemos al gobierno', giro: 0 },
          { texto: 'No vendemos armas de fuego', giro: 0 },
          { texto: 'No emitimos licencias ni permisos', giro: 0 },
        ],
      },
      {
        key: 'learn',
        eyebrow: 'Secciones',
        title: 'Lo que puedes hacer',
        // Centrado, por el tablero. Cuatro entradas y no seis: se fueron las
        // filas de ícono-y-tile —lo último que quedaba del HUD— y con ellas
        // «Experiencias» y «Campos de tiro», que son «próximamente» y no algo
        // que el visitante pueda hacer hoy.
        entradas: [
          { titulo: 'Armas', desc: 'Conoce el catálogo de las armerías oficiales: DCAM y OTCA' },
          { titulo: 'Calibres', desc: 'Guía de munición: balística, usos y armas que lo disparan' },
          { titulo: 'Legalidad', desc: 'Conoce tus derechos, aprende los requisitos y trámites necesarios para obtener tus permisos' },
          { titulo: 'Comparación', desc: 'Usa la herramienta de «comparación» para ver de forma clara y sencilla las diferencias entre dos armas.' },
        ],
      },
      {
        key: 'ready',
        eyebrow: 'Todo listo',
        title: 'Empieza a explorar',
        // El círculo con ✓ era el otro resto del HUD. Ahora es lo que un
        // expediente lleva cuando ya pasó por ventanilla: un sello de aprobado.
        visual: (
          <div style={{ textAlign: 'center' }}>
            <Sello tono="ok" giro={-7} clase="tut-sello--aprobado">Aprobado</Sello>
          </div>
        ),
        tema: true,
      },
    ];
  }

  // ── Componente principal ──────────────────────────────────────────
  function OnboardingTutorial({ open, onClose }) {
    const vp = window.useViewport();
    const [idx, setIdx] = React.useState(0);
    const [tema, setTema] = React.useState(() => window.amxLeerTema());
    const touch = React.useRef({ x: 0, active: false });

    const slides = React.useMemo(() => buildSlides(vp), [vp.isDesktop]);
    const count = slides.length;
    const last = idx === count - 1;

    // Reiniciar al abrir
    React.useEffect(() => { if (open) { setIdx(0); setTema(window.amxLeerTema()); } }, [open]);

    // Bloquear el scroll del fondo mientras está abierto
    React.useEffect(() => {
      if (!open) return;
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }, [open]);

    const goNext = React.useCallback(() => {
      setIdx((i) => (i >= count - 1 ? i : i + 1));
    }, [count]);
    const goBack = React.useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);
    const finish = React.useCallback(() => { onClose && onClose(); }, [onClose]);

    // Teclado (escritorio): ← → para navegar.
    //
    // ESCAPE: cierra SOLO en la reposición, no en el primer arranque. Con
    // SALTAR retirado, dejar Escape en la primera vuelta sería exactamente el
    // botón que se quitó, escondido en una tecla — y el aviso legal dejaría de
    // ser obligatorio para cualquiera que la pulse. Pero cuando alguien vuelve
    // a abrir el tutorial desde MÁS → «Ver tutorial», ya vio la información:
    // ahí es una reposición y encerrarlo no protege nada, solo estorba.
    // La bandera es la MISMA que consulta app.jsx para decidir si abrirlo, así
    // que no hay una segunda fuente de verdad que se pueda desincronizar.
    React.useEffect(() => {
      if (!open) return;
      const onKey = (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); last ? finish() : goNext(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); goBack(); }
        else if (e.key === 'Escape') {
          let visto = false;
          try { visto = !!localStorage.getItem('amx_onboarded_v1'); } catch (err) {}
          if (visto) { e.preventDefault(); finish(); }
        }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [open, last, goNext, goBack, finish]);

    if (!open) return null;

    const s = slides[idx];

    // Cuál de los dos modos está puesto ahora mismo. `amxLeerTema()` devuelve
    // 'sistema' cuando nadie ha elegido, y entonces el que manda es el del
    // sistema operativo: sin resolverlo, el selector saldría con las dos
    // opciones apagadas aunque una de las dos sea la que se está viendo.
    const temaEfectivo = tema !== 'sistema' ? tema
      : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro');
    // Cambia el tema EN VIVO y no avanza: «al hacer click en un modo no avanza
    // sino que alterna para que vea las diferencias de tono» (Saulo). No hace
    // falta maquinaria: `amxPonerTema` mueve `data-tema` en <html> y el overlay
    // entero se retematiza solo, porque sus colores entran por tokens.
    const elegirTema = (t) => { window.amxPonerTema(t); setTema(t); };

    // Swipe táctil
    const onTouchStart = (e) => { touch.current = { x: e.touches[0].clientX, active: true }; };
    const onTouchEnd = (e) => {
      if (!touch.current.active) return;
      const dx = (e.changedTouches[0].clientX) - touch.current.x;
      touch.current.active = false;
      if (Math.abs(dx) < 45) return;
      if (dx < 0) { last ? finish() : goNext(); } else { goBack(); }
    };

    const PAD = vp.isDesktop ? 40 : 18;
    const FOLDER_PAD = vp.isDesktop ? 34 : 22;
    // Tamaño de la foto del folder en pantalla (ver `.tut-folder::before`).
    const ESCALA = vp.isDesktop ? 0.5 : 0.36;

    return (
      <div role="dialog" aria-modal="true" aria-label="Introducción a Armado en México"
        style={{
          position: 'fixed', inset: 0, zIndex: 1200,
          background: P.bg,
          display: 'flex', flexDirection: 'column',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
        <style>{`
          @keyframes tutIn {
            from { opacity: 0; transform: translateX(16px); }
            to   { opacity: 1; transform: translateX(0); }
          }
          @keyframes tutFade { from { opacity: 0; } to { opacity: 1; } }
          .tut-slide { animation: tutIn 0.32s ease both; }
          @media (prefers-reduced-motion: reduce) {
            .tut-slide { animation: tutFade 0.2s ease both; }
          }

          /* EL CUERPO. Era \`justifyContent: center\` sobre un contenedor con
             \`overflowY: auto\`, y esa pareja tiene un defecto conocido: cuando
             el contenido pasa del alto, el desbordamiento de ARRIBA queda fuera
             del alcance del scroll en varios motores —no hay forma de subir a
             verlo—. La pantalla de cuatro entradas en un teléfono corto es
             justo ese caso. Se centra con \`margin: auto\` en el hijo, que es lo
             que sí cede a cero cuando ya no sobra espacio. */
          .tut-cuerpo { display: flex; flex-direction: column; overflow-y: auto; }
          .tut-hoja { margin: auto; width: 100%; max-width: 560px; }

          /* LA COPIA de la portada: una FOTO REVELADA, no una polaroid. Sin
             faldón donde escribir, solo su marco blanco parejo (Saulo,
             13-sep-2026): el nombre ya va mecanografiado justo debajo.
             El marco va ENCIMA de la foto, como en una copia real, donde la
             emulsión queda por debajo del cartón.
             \`foto-marco.webp\` sale de «Assets del Sitio/elementos/
             polaroid-marco.png»: recortado a su silueta menos 3px por lado —el
             original traía un filo de recorte, 1px blanco y 1px negro, que sobre
             el manila se leía como una raya—, con el faldón cortado para que el
             canto de abajo mida lo mismo que los otros tres (32px), y con la
             ventana, que venía negra opaca, pasada a alfa 0. Recorte de 905×770;
             la ventana mide x 32–871 · y 32–737, y en % es lo de abajo.
             La foto se sale 0.4 puntos por cada lado bajo el cartón: si cayera
             justo al filo, el redondeo de subpíxel dejaría asomar un hilo de
             lienzo entre la placa y el marco. La sombra es \`drop-shadow\` y no
             \`box-shadow\`: sigue la silueta del cartón. */
          .tut-copia {
            position: relative;
            aspect-ratio: 600 / 510;
            transform: rotate(-2deg);
            filter: drop-shadow(0 1px 2px rgba(23, 27, 25, .16))
                    drop-shadow(0 6px 12px rgba(23, 27, 25, .22));
          }
          .tut-copia::after {
            content: ''; position: absolute; inset: 0; pointer-events: none;
            background: url(imagenes/foto-marco.webp) 0 0 / 100% 100% no-repeat;
          }
          .tut-copia-foto {
            position: absolute;
            left: 3.14%; top: 3.76%; width: 93.62%; height: 92.49%;
            background: var(--copia-placa);
          }
          /* El logotipo es una insignia de esquinas redondeadas, y el .webp trae
             color fuera de esas esquinas: sin recortar, asoman cuatro picos
             tostados sobre la placa blanca. En porcentaje para que el recorte
             siga a la insignia en los dos anchos de la copia. */
          .tut-copia-foto img {
            position: absolute; inset: 0; margin: auto;
            height: 90%; aspect-ratio: 1 / 1; border-radius: 9%;
          }

          /* EL FOLDER: 9-slice de \`folder-manila.webp\` (1000×720), la misma
             fotografía de la Home. La Home lo estira entero porque su bloque es
             apaisado; aquí la hoja es más alta que ancha en móvil y estirarlo
             torcería la pestaña. Con \`border-image\` las cuatro esquinas quedan
             fijas —la pestaña entera cabe en la de arriba a la izquierda— y solo
             se estiran el canto de la solapa (en horizontal), el filo de las
             hojas (en horizontal) y el papel liso del centro.
             Cortes medidos sobre el PNG: la solapa delantera acaba en y≈120 y la
             curva de la pestaña en x≈360; las hojas van de y≈660 a 710; la
             esquina redondeada de la derecha ocupa ~60px.
             Va en un pseudo-elemento por la sombra: \`filter\` en la propia hoja
             sombrearía también el texto y los sellos que lleva encima.
             \`--tut-escala\` es el tamaño de la foto en pantalla (0.36 móvil,
             0.5 escritorio): la pestaña mide lo mismo en todas las pantallas. */
          .tut-folder { position: relative; isolation: isolate; }
          .tut-folder::before {
            content: ''; position: absolute; inset: 0; z-index: -1;
            border-style: solid; border-width: 0;
            border-image-source: url(imagenes/folder-manila.webp);
            border-image-slice: 140 60 70 370 fill;
            border-image-width:
              calc(140px * var(--tut-escala)) calc(60px * var(--tut-escala))
              calc(70px * var(--tut-escala)) calc(370px * var(--tut-escala));
            filter: drop-shadow(0 1px 2px rgba(23, 27, 25, .16))
                    drop-shadow(0 8px 16px rgba(23, 27, 25, .20));
          }
          /* El folio, rotulado sobre la pestaña de la foto —igual que la marca
             en las tarjetas de la Home—. La pestaña va de x≈20 a 340 y de y≈0 a
             115 antes de que la tape la solapa: cabe en dos renglones, no en
             uno, y por eso «Expediente» y el paso van partidos. */
          .tut-folder-rotulo {
            position: absolute;
            left: calc(40px * var(--tut-escala)); top: calc(14px * var(--tut-escala));
            width: calc(290px * var(--tut-escala)); height: calc(100px * var(--tut-escala));
            display: flex; flex-direction: column; justify-content: center;
            font-family: var(--mono); font-size: clamp(11px, calc(29px * var(--tut-escala)), 12.5px);
            line-height: 1.3; letter-spacing: .1em; text-transform: uppercase;
            color: var(--carton-tinta-2);   /* 6.25:1 sobre el cartón */
            white-space: nowrap;
          }

          /* EL SELLO DEL TUTORIAL — ver el comentario del componente Sello. */
          .amx-v2 .amx-sello.tut-sello {
            white-space: normal;
            text-align: center;
            line-height: 1.3;
            max-width: 100%;
            transform: rotate(var(--tut-giro, -3deg));
          }
          .amx-v2 .tut-sello--restr { color: var(--alerta); }
          .amx-v2 .tut-sello--ok    { color: var(--ok); }
          /* Dentro del folder, la tinta del cartón (ver el comentario de Sello). */
          .amx-v2 .tut-folder .tut-sello--restr { color: var(--sello-restr); }
          .amx-v2 .tut-folder .tut-sello--ok    { color: var(--sello-civil); }
          .amx-v2 .amx-sello.tut-sello--aprobado {
            font-size: 23px; padding: 8px 22px 10px;
            border-width: 3px; letter-spacing: .18em;
          }
          /* Los tres avisos: apilados y rectos, para que cada uno parezca una
             estampación suelta y no una lista de etiquetas.
             CADA SELLO EN UNA LÍNEA, y no por estética. El desgaste es una
             máscara estirada al 100 % de la caja: si «NO EMITIMOS LICENCIAS
             NI PERMISOS» parte en dos, la caja dobla su alto, la máscara se
             estira con ella y una de sus manchas grandes cae sobre «PERMISOS»
             y se lo come (visto a 390px). Es el aviso legal: tiene que leerse.
             Para que quepa sin bajar del piso tipográfico de 12px:
               · el bloque se sale al margen del folder —margen negativo inline,
                 el mismo número que su padding—: un sello real pisa el margen;
               · el interletraje baja de .14em a .08em.
             Medido: 291px de sello («NO EMITIMOS…», ya recto) frente a 352px de folder a 390 y 322px a
             360. Por debajo de ~340px vuelve a partir, y ahí «balance» reparte
             las dos líneas en vez de dejar una palabra huérfana. */
          .tut-sellos {
            display: flex; flex-direction: column; align-items: center;
            gap: 14px; margin-top: 26px;
          }
          .amx-v2 .tut-sellos .tut-sello {
            font-size: 12px; letter-spacing: .08em; padding: 7px 11px 8px;
            text-wrap: balance;
            /* DESGASTE REBAJADO, solo en estos tres (Saulo, 13-sep-2026): con la
               máscara entera se comía trazos —la última O de «GOBIERNO», la L de
               «LICENCIAS»— y es el aviso legal. Se suma una capa lisa al 60 %:
               donde la máscara quitaba toda la tinta ahora queda el 60 %, así
               que la textura se sigue viendo pero ninguna letra desaparece. */
            -webkit-mask-image: url(imagenes/sello-desgaste.webp), linear-gradient(rgba(0,0,0,.6), rgba(0,0,0,.6));
                    mask-image: url(imagenes/sello-desgaste.webp), linear-gradient(rgba(0,0,0,.6), rgba(0,0,0,.6));
            -webkit-mask-size: 100% 100%;
                    mask-size: 100% 100%;
            -webkit-mask-composite: source-over;
                    mask-composite: add;
          }

          /* EL SELLO COMO BOTÓN. El anillo de foco va en el <button>, que no
             lleva máscara: la de \`.amx-sello\` recorta el filo del sello Y se
             comería el anillo con él, y §7 obliga a compensarlo cada vez. */
          .tut-btn {
            background: none; border: 0; padding: 4px; cursor: pointer;
            min-height: 44px; display: inline-flex; align-items: center;
          }
          .amx-v2 .tut-btn .tut-sello {
            font-size: 14px; padding: 10px 19px 11px; border-width: 2.5px;
            transition: transform .16s ease;
          }
          /* Lo único que se anima es \`transform\` (§6). Al pulsar, el sello se
             endereza un punto: es la mano que aprieta, no un botón que rebota. */
          .tut-btn:hover .tut-sello  { transform: rotate(-1.5deg) scale(1.03); }
          .tut-btn:active .tut-sello { transform: rotate(-1deg) scale(.99); }

          /* EL ÍNDICE de «Lo que puedes hacer». Centrado, por el tablero, y
             separado por el mismo rayado a trazos que cierra el canto del
             folder: son las entradas de un expediente, no tarjetas. */
          .tut-indice { margin-top: 22px; text-align: center; }
          .tut-indice > * + * { margin-top: 16px; padding-top: 16px; border-top: 1px dashed var(--carton-filo); }
          .tut-indice dt {
            font-family: var(--sans); font-weight: 700; font-size: 13.5px;
            letter-spacing: .16em; text-transform: uppercase; color: var(--carton-tinta);
          }
          .tut-indice dd {
            margin: 5px 0 0; font-family: var(--sans); font-size: 15px;
            line-height: 1.5; color: var(--carton-tinta-2); text-wrap: pretty;
          }

          /* EL SELECTOR DE TEMA. Dos fichas de cartulina sobre el folder; la
             puesta lleva el filo en tinta plena y la letra en negra. El filo
             PORTA el estado, así que pide 3:1 (WCAG 1.4.11): la tinta del cartón
             da 13.94:1. No hay muestra de color dentro: la muestra es la
             pantalla entera, que cambia de tono al pulsarlas — que es
             exactamente lo que se pidió. El folder no cambia con ella, porque
             es un objeto: lo que cambia es el lienzo sobre el que está. */
          .tut-temas { display: flex; gap: 12px; justify-content: center; margin-top: 14px; flex-wrap: wrap; }
          .amx-v2 .tut-tema {
            min-height: 44px; padding: 11px 20px; cursor: pointer;
            background: var(--carton-alto); border: 1px solid var(--carton-filo);
            border-radius: var(--radio-sm);
            font-family: var(--mono); font-size: 13px; letter-spacing: .12em;
            text-transform: uppercase; color: var(--carton-tinta-2);
            transition: border-color .16s, color .16s;
          }
          .amx-v2 .tut-tema[aria-pressed="true"] {
            border: 2px solid var(--carton-tinta); color: var(--carton-tinta); font-weight: 700;
          }
          /* EL PIE. \`‹ Atrás\` se esconde en el primer paso con \`visibility\`
             para que el sello no se mueva de sitio al pasar de página. */
          .tut-atras {
            background: none; border: 0; cursor: pointer; min-height: 44px; padding: 10px 6px;
            font-family: var(--sans); font-weight: 600; font-size: 13px;
            letter-spacing: .12em; text-transform: uppercase; color: var(--tinta-2);
          }
          /* El filete del pie cruza la pantalla entera, pero sus dos botones van
             a la anchura de la hoja. Repartidos a los cantos de una pantalla de
             1440px, el sello de avance quedaba a 400px del documento que cierra
             —suelto en una esquina—. En móvil el tope no llega a actuar. */
          .tut-pie {
            display: flex; align-items: center; justify-content: space-between; gap: 14px;
            max-width: 560px; margin: 0 auto;
          }
        `}</style>

        {/* ── Cuerpo: la hoja del expediente ── */}
        <div
          className="tut-cuerpo"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          style={{ flex: 1, padding: `14px ${PAD}px 10px` }}>
          <div key={s.key} className="tut-hoja tut-slide">

            <div className="tut-folder" style={{
              '--tut-escala': ESCALA,
              // Arriba, por debajo de la solapa delantera (y≈120 en la foto);
              // abajo, por encima de las hojas que asoman (desde y≈660).
              padding: `${Math.round(120 * ESCALA) + FOLDER_PAD}px ${FOLDER_PAD}px ${Math.round(60 * ESCALA) + FOLDER_PAD}px`,
              textAlign: 'center',
            }}>
              {/* La pestaña del folder lleva el folio. Sustituye a la barra de
                  seis rayitas y al contador «01 / 06» del pie: el mismo dato
                  estaba dicho dos veces, y ninguna de las dos formas era de este
                  sitio. Aquí es lo que se rotula en la pestaña de un separador. */}
              <span className="tut-folder-rotulo">
                <span>Expediente</span>
                <span>Paso {String(idx + 1).padStart(2, '0')} de {String(count).padStart(2, '0')}</span>
              </span>

              {s.visual && <div style={{ marginBottom: 24 }}>{s.visual}</div>}

              {/* Rótulo mecanografiado */}
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5,
                color: 'var(--carton-tinta-2)', letterSpacing: '0.2em', textTransform: 'uppercase',
                marginBottom: 9,
              }}>{s.eyebrow}</div>

              <h2 style={{
                margin: 0,
                fontFamily: 'Archivo, sans-serif', fontWeight: 800,
                fontSize: vp.isDesktop ? 32 : 25, color: 'var(--carton-tinta)',
                textTransform: 'uppercase', letterSpacing: '0.01em', lineHeight: 1.08,
                textWrap: 'balance',
              }}>{s.title}</h2>

              {s.body && (
                <p style={{
                  margin: '14px 0 0',
                  fontFamily: 'Archivo, system-ui, sans-serif', fontSize: vp.isDesktop ? 17.5 : 16.5,
                  color: 'var(--carton-tinta)', lineHeight: 1.6, textWrap: 'pretty',
                }}>{s.body}</p>
              )}

              {s.sellos && (
                <div className="tut-sellos" style={{ marginLeft: -FOLDER_PAD, marginRight: -FOLDER_PAD }}>
                  {s.sellos.map((se) => (
                    <Sello key={se.texto} giro={se.giro}>{se.texto}</Sello>
                  ))}
                </div>
              )}

              {s.entradas && (
                <dl className="tut-indice">
                  {s.entradas.map((e) => (
                    <div key={e.titulo}>
                      <dt>{e.titulo}</dt>
                      <dd>{e.desc}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {s.tema && (
                <div style={{ marginTop: 26 }}>
                  <div style={{
                    fontFamily: 'Archivo, system-ui, sans-serif', fontSize: vp.isDesktop ? 17.5 : 16.5,
                    color: 'var(--carton-tinta)', lineHeight: 1.6,
                  }}>¿Qué prefieres?</div>
                  <div className="tut-temas">
                    <button type="button" className="tut-tema" aria-pressed={temaEfectivo === 'claro'}
                      onClick={() => elegirTema('claro')}>Modo claro</button>
                    <button type="button" className="tut-tema" aria-pressed={temaEfectivo === 'oscuro'}
                      onClick={() => elegirTema('oscuro')}>Modo oscuro</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Pie: atrás + el sello que avanza ── */}
        {/* Aquí vivía SALTAR, que se retira del todo. Antes se vaciaba su
            etiqueta en el último paso pero el <button> seguía montado: un
            destino de tabulación invisible que cerraba el tutorial. */}
        <div style={{
          padding: `10px ${PAD}px ${vp.isDesktop ? 22 : 14}px`,
          borderTop: `1px solid ${P.border}`,
        }}>
          <div className="tut-pie">
            <button type="button" className="tut-atras" onClick={goBack} disabled={idx === 0}
              style={{ visibility: idx === 0 ? 'hidden' : 'visible' }}>‹ Atrás</button>

            <button type="button" className="tut-btn" onClick={() => (last ? finish() : goNext())}>
              <Sello giro={-3}>{last ? 'Continuar' : 'Siguiente ›'}</Sello>
            </button>
          </div>
        </div>
      </div>
    );
  }

  window.OnboardingTutorial = OnboardingTutorial;
})();
