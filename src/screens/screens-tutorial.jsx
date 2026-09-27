// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

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
// desde un buscador a una de las 321 páginas prerenderizadas: sin SALTAR,
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
  function OnboardingTutorial({ open, onClose, onRecorrido }) {
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
          /* EL CIERRE DEL AVISO (27-sep-2026): dos sellos en vez de «Continuar».
             El que abre el recorrido va arriba y en rojo; el otro, en la tinta
             gris del pie, porque es la salida y no la invitación. */
          .tut-dos { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
          .amx-v2 .tut-sello--tinta { color: var(--tinta-2); }
          .amx-v2 .tut-dos .tut-sello { font-size: 13px; letter-spacing: .06em; padding: 9px 13px 10px; }
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

            {last && onRecorrido ? (
              <div className="tut-dos">
                <button type="button" className="tut-btn" onClick={onRecorrido}>
                  <Sello giro={-3}>Hacer el recorrido</Sello>
                </button>
                <button type="button" className="tut-btn" onClick={finish}>
                  <Sello tono="tinta" giro={2}>Explorar por mi cuenta</Sello>
                </button>
              </div>
            ) : (
              <button type="button" className="tut-btn" onClick={() => (last ? finish() : goNext())}>
                <Sello giro={-3}>{last ? 'Continuar' : 'Siguiente ›'}</Sello>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  window.OnboardingTutorial = OnboardingTutorial;

  // ── EL RECORRIDO POR EL SITIO ─────────────────────────────────────────
  // Se ofrece al cerrar el aviso (27-sep-2026, decidido con Saulo en cinco
  // rondas; spec en docs/superpowers/specs/2026-09-27-tour-bienvenida-design.md).
  // Doce paradas por páginas DE VERDAD: atenúa la página, rodea un apartado con
  // el marco rojo de los GIF del README y deja una nota en papel de oficio con su
  // cinta Dymo. `sel`: el apartado; si son varios, el marco abarca a todos. Los
  // que miden más que la pantalla se encuadran solo en su primera parte.
  // Si el apartado de una parada no aparece en 4 s, la parada se salta: el
  // recorrido nunca deja a nadie atrapado. scripts/recorrido.test.mjs comprueba
  // que cada ruta es una página del sitio y cada clase existe en el código.
  const PARADAS = [
    { ruta: '/arsenal', sel: ['.amx-arsenal-armeria', '.amx-kardex-carton'], cinta: 'Por armería',
      nota: 'El catálogo se reparte por armería: la OTCA (Coahuila, Nuevo León, San Luis Potosí y Tamaulipas) y la DCAM (el resto del país). La tarjeta de almacén dice cuántas armas tenía cada sucursal en su último inventario.' },
    { ruta: '/arsenal', sel: ['.amx-arsenal-loteria-mesa', '.amx-hub-usos', '.amx-anaquel'], cinta: 'Tipo, uso y calibre',
      nota: 'También puedes entrar por tipo de arma, por uso o por calibre. Cada entrada lleva al listado con su filtro ya puesto.' },
    { ruta: '/pistolas/glock-25', sel: ['.amx-talon-papel', '.amx-kardex-carton'], cinta: 'Precio y existencias',
      nota: 'Cada arma tiene su ficha. El comprobante dice el precio oficial con IVA, la armería y la fecha del inventario; la tarjeta de almacén, cuántas piezas había en cada sucursal.' },
    { ruta: '/pistolas/glock-25', sel: ['.amx-carpeta-legal'], cinta: 'Clasificación legal',
      nota: 'El sello dice si es de uso civil, de seguridad o exclusivo, y la hoja explica qué permiso hace falta y dónde se tramita.' },
    { ruta: '/pistolas/glock-25', sel: ['.amx-carpeta-historial'], cinta: 'Historial de precios',
      nota: 'Cada inventario oficial deja un punto en el papel milimétrico: así ves cómo ha cambiado el precio.' },
    { ruta: '/pistolas/glock-25', sel: ['.amx-comentarios'], cinta: 'Recomendaciones',
      nota: '¿La recomiendas? Se contesta con un sello y una reseña de al menos 100 caracteres. Nada se publica sin que lo revise una persona.' },
    { ruta: '/pistolas/glock-25', sel: ['.amx-reportar-error'], cinta: 'Reportar un error',
      nota: 'Si ves un dato incorrecto, repórtalo: se abre un formulario público en GitHub con la ficha ya puesta. Cada corrección se revisa con sus fuentes.' },
    { ruta: '/comparar/glock-25-vs-glock-28', sel: ['.amx-cotejo'], cinta: 'Comparador',
      nota: 'Pon dos armas lado a lado. Arriba va lo que las distingue, con la mejor cifra rodeada en rojo. Se llena con la casilla «Comparar» de cada ficha.' },
    { ruta: '/legalidad', sel: ['.amx-leg-cta'], cinta: 'La entrevista',
      nota: '¿Puedo comprar un arma? Contesta unas preguntas (ninguna pide datos personales) y llévate la lista de documentos que te corresponden.' },
    { ruta: '/legalidad', sel: ['.amx-mapa'], cinta: 'El mapa del trámite',
      nota: 'El camino completo, del permiso a la compra en la armería, en un solo mapa.' },
    { ruta: '/legalidad', sel: ['.amx-leg-cajon', '.amx-leg-fuentes'], cinta: 'Lo que dice la ley',
      nota: 'Lo que permite la ley, lo que cambia en tu estado y los trámites con sus costos. Cada afirmación lleva su fuente oficial al pie.' },
    { ruta: '/soporte', sel: ['.amx-soporte-seccion-normas'], cinta: 'Normas de la comunidad',
      nota: 'Aquí no se compra ni se vende. Las normas rigen reseñas y reportes, y desde aquí puedes denunciar una reseña.' },
  ];

  // Dónde van el marco y la nota, en píxeles de la ventana. Pura, para poder
  // probarla sin navegador.
  //   r  el apartado: { top, bottom, left, right }
  //   v  la ventana: { ancho, alto, arriba, abajo, movil } — `arriba` es lo que
  //      tapa la barra de arriba; `abajo`, en móvil, lo que tapan la nota fija
  //      y la barra de navegación
  //   n  la nota: { ancho, alto }
  // Devuelve { marco: { x, y, w, h }, nota: { x, y } | null, lado, flecha }.
  // `lado` es dónde queda la nota respecto al marco (en móvil, 'movil': la nota
  // no se mueve y el CSS la fija abajo) y `flecha`, a cuántos px de la esquina
  // de la nota va la flecha que señala el marco.
  function colocarNota(r, v, n) {
    const H = 10, SEP = 16, M = 16;
    const x = Math.max(r.left - H, 4), der = Math.min(r.right + H, v.ancho - 4);
    const y = Math.max(r.top - H, v.arriba);
    let bajo = Math.min(r.bottom + H, v.alto - v.abajo - M);
    const marco = () => ({ x, y, w: der - x, h: Math.max(bajo - y, 0) });
    if (v.movil) return { marco: marco(), nota: null, lado: 'movil', flecha: 0 };
    // Al lado, si cabe: la nota a la altura del marco.
    const cabeDer = v.ancho - der - SEP - M >= n.ancho;
    if (cabeDer || x - SEP - M >= n.ancho) {
      const ny = Math.max(v.arriba, Math.min(y, v.alto - M - n.alto));
      return { marco: marco(), nota: { x: cabeDer ? der + SEP : x - SEP - n.ancho, y: ny },
        lado: cabeDer ? 'derecha' : 'izquierda', flecha: Math.max(18, Math.min(y + 28 - ny, n.alto - 18)) };
    }
    const nx = Math.max(M, Math.min(x, v.ancho - M - n.ancho));
    const flecha = Math.max(22, Math.min(x + 44 - nx, n.ancho - 22));
    // Debajo, si cabe entera.
    if (bajo + SEP + n.alto <= v.alto - M) return { marco: marco(), nota: { x: nx, y: bajo + SEP }, lado: 'abajo', flecha };
    // Encima, si el apartado quedó abajo (el final de una página no sube más).
    if (y - SEP - n.alto >= v.arriba) return { marco: marco(), nota: { x: nx, y: y - SEP - n.alto }, lado: 'arriba', flecha };
    // Si no, debajo y el marco se recorta para dejarle sitio.
    bajo = v.alto - M - n.alto - SEP;
    return { marco: marco(), nota: { x: nx, y: bajo + SEP }, lado: 'abajo', flecha };
  }

  function RecorridoSitio({ irARuta, onCerrar }) {
    const vp = window.useViewport();
    const [paso, setPaso] = React.useState(0);   // 0-11 las paradas · 12 la hoja «Listo»
    const [geo, setGeo] = React.useState(null);  // colocarNota(), o null mientras busca
    const notaRef = React.useRef(null);
    const sentido = React.useRef(1);             // hacia dónde se salta una parada sin apartado
    const rutaAntes = React.useRef(null);
    const touch = React.useRef({ x: 0, active: false });
    const total = PARADAS.length;
    const listo = paso >= total;
    const p = PARADAS[paso];

    const siguiente = () => { sentido.current = 1; setPaso((i) => Math.min(i + 1, total)); };
    const atras = () => { sentido.current = -1; setPaso((i) => Math.max(i - 1, 0)); };

    // La página no responde mientras dura: sin scroll de fondo. Atrás del
    // navegador cierra (la app ya pinta la página anterior por su cuenta).
    React.useEffect(() => {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      window.addEventListener('popstate', onCerrar);
      return () => { document.body.style.overflow = prev; window.removeEventListener('popstate', onCerrar); };
    }, []);
    React.useEffect(() => { if (notaRef.current) notaRef.current.focus(); }, [listo]);

    // Cada parada: ir a su página, esperar el apartado, llevarlo arriba y
    // seguirlo. Se vuelve a medir cada 250 ms y al hacer scroll o cambiar el
    // tamaño: lo que se hidrata después (D1, fotos) mueve la página.
    React.useEffect(() => {
      if (listo) { setGeo(null); return; }
      const misma = rutaAntes.current === p.ruta;
      rutaAntes.current = p.ruta;
      irARuta(p.ruta);
      setGeo(null);
      const quieto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const arriba = vp.isMobile ? 58 : 72;
      const t0 = Date.now();
      let els = null, llevado = 0, raf = 0;
      const llevar = (como) => {
        els[0].style.scrollMarginTop = (arriba + 12) + 'px';
        els[0].scrollIntoView({ block: 'start', behavior: como });
        llevado = Date.now();
      };
      const medir = () => {
        if (!els) return;
        const rs = els.map((e) => e.getBoundingClientRect());
        const r = { top: Math.min(...rs.map((b) => b.top)), bottom: Math.max(...rs.map((b) => b.bottom)),
          left: Math.min(...rs.map((b) => b.left)), right: Math.max(...rs.map((b) => b.right)) };
        const nota = notaRef.current;
        const n = { ancho: nota ? nota.offsetWidth : 360, alto: nota ? nota.offsetHeight : 200 };
        const alto = window.innerHeight;
        const abajo = vp.isMobile && nota ? alto - nota.getBoundingClientRect().top : 0;
        // Se movió la página por debajo (algo se hidrató encima): se vuelve a llevar.
        if (Date.now() - llevado > 900 && (rs[0].top < arriba - 4 || rs[0].top > alto - abajo - 80)) llevar('auto');
        const g = colocarNota(r, { ancho: document.documentElement.clientWidth, alto, arriba, abajo, movil: vp.isMobile }, n);
        setGeo((antes) => (JSON.stringify(antes) === JSON.stringify(g) ? antes : g));
      };
      const alMover = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; medir(); }); };
      const reloj = setInterval(() => {
        if (els) return medir();
        const hallados = p.sel.map((s) => document.querySelector(s)).filter(Boolean);
        if (hallados.length) { els = hallados; llevar(misma && !quieto ? 'smooth' : 'auto'); medir(); }
        else if (Date.now() - t0 > 4000) {
          clearInterval(reloj);
          setPaso((i) => (i + sentido.current < 0 ? i + 1 : i + sentido.current));
        }
      }, 250);
      window.addEventListener('scroll', alMover, { capture: true, passive: true });
      window.addEventListener('resize', alMover);
      return () => {
        clearInterval(reloj); cancelAnimationFrame(raf);
        window.removeEventListener('scroll', alMover, { capture: true });
        window.removeEventListener('resize', alMover);
        if (els) els[0].style.scrollMarginTop = '';
      };
    }, [paso, vp.isMobile]);

    // Teclado: ← → avanzan, Escape sale; el Tab no sale de la nota.
    React.useEffect(() => {
      const onKey = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); onCerrar(); }
        else if (e.key === 'ArrowRight' && !listo) { e.preventDefault(); siguiente(); }
        else if (e.key === 'ArrowLeft' && paso > 0) { e.preventDefault(); atras(); }
        else if (e.key === 'Tab' && notaRef.current) {
          const bs = notaRef.current.querySelectorAll('button:not([disabled])');
          const a = document.activeElement, primero = bs[0], ultimo = bs[bs.length - 1];
          const fuera = !notaRef.current.contains(a) || a === notaRef.current;
          if (fuera || a === (e.shiftKey ? primero : ultimo)) { e.preventDefault(); (e.shiftKey ? ultimo : primero).focus(); }
        }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [paso, listo]);

    // Deslizar sobre cualquier punto: a la izquierda avanza, a la derecha vuelve.
    const onTouchStart = (e) => { touch.current = { x: e.touches[0].clientX, active: true }; };
    const onTouchEnd = (e) => {
      if (!touch.current.active) return;
      touch.current.active = false;
      const dx = e.changedTouches[0].clientX - touch.current.x;
      if (Math.abs(dx) < 45) return;
      if (dx < 0) { if (!listo) siguiente(); } else if (paso > 0) atras();
    };

    const marco = !listo && geo && geo.marco;
    const empezar = () => { irARuta('/'); onCerrar(); };
    return (
      <div className="rec-capa" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        style={{ background: marco ? 'transparent' : 'rgba(23, 27, 25, .5)' }}>
        <style>{`
          /* La capa se come los toques: la página de fondo no responde. */
          .rec-capa { position: fixed; inset: 0; z-index: 1200; touch-action: none; }
          /* EL MARCO — el de los GIF del README: filo rojo de sello y una sombra
             enorme que atenúa todo lo demás. El anillo de papel entre los dos
             separa el rojo del fondo atenuado en el tema oscuro. */
          .rec-marco {
            position: fixed; box-sizing: border-box; pointer-events: none;
            border: 4px solid var(--sello-restr); border-radius: 6px;
            box-shadow: 0 0 0 2px var(--oficio), 0 0 0 4000px rgba(23, 27, 25, .5);
          }
          /* LA NOTA — papel de oficio, que no sigue al tema (es un objeto). */
          .rec-nota, .rec-hoja {
            position: fixed; box-sizing: border-box;
            background: var(--oficio); color: var(--carton-tinta); border-radius: 4px;
            box-shadow: 0 1px 2px rgba(23, 27, 25, .2), 0 12px 32px rgba(23, 27, 25, .35);
          }
          .rec-nota { width: 360px; padding: 12px 14px 6px; }
          .rec-nota:focus, .rec-hoja:focus { outline: none; }
          .rec-nota--movil {
            left: 50%; transform: translateX(-50%); width: min(560px, calc(100% - 24px));
            bottom: calc(var(--amx-nav-h, 8px) + 8px);
          }
          .rec-hoja {
            left: 50%; top: 50%; transform: translate(-50%, -50%);
            width: min(420px, calc(100% - 32px)); padding: 22px 18px 8px; text-align: center;
          }
          .rec-cabeza { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
          .amx-v2 .rec-nota .amx-dymo, .amx-v2 .rec-hoja .amx-dymo { margin: 0; }
          .rec-salir, .rec-atras {
            background: none; border: 0; cursor: pointer; min-height: 44px; padding: 10px 4px;
            font-family: var(--sans); font-weight: 600; font-size: 13px;
            letter-spacing: .12em; text-transform: uppercase; color: var(--oficio-tinta-2);
          }
          .rec-salir { margin: -10px -4px 0 0; }
          .rec-atras:disabled { visibility: hidden; }
          .rec-texto {
            margin: 8px 0 2px; font-family: var(--sans); font-size: 15.5px; line-height: 1.5;
            color: var(--carton-tinta); text-wrap: pretty;
          }
          .rec-hoja .rec-texto { margin-top: 14px; }
          .rec-pie { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
          .rec-folio { font-family: var(--mono); font-size: 12.5px; letter-spacing: .08em; color: var(--oficio-tinta-2); }
          /* El anillo de foco va en el botón: la máscara del sello se lo comería.
             Sobre el papel, el rojo del sello (6.42:1): el del tema oscuro no llega. */
          .rec-btn {
            background: none; border: 0; padding: 4px; cursor: pointer;
            min-height: 44px; display: inline-flex; align-items: center;
          }
          .amx-v2 .rec-btn .amx-sello {
            font-size: 13px; letter-spacing: .1em; padding: 9px 13px 10px; border-width: 2.5px;
            transform: rotate(-3deg);
          }
          .amx-v2 .rec-nota :focus-visible, .amx-v2 .rec-hoja :focus-visible { outline-color: var(--sello-restr); }
          .amx-v2 .rec-aprobado { margin: 18px 0 12px; }
          .amx-v2 .rec-aprobado .amx-sello {
            font-size: 23px; padding: 8px 22px 10px; border-width: 3px; letter-spacing: .18em;
            transform: rotate(-7deg);
          }
          /* LA FLECHA: una punta de papel en el canto que mira al marco. */
          .rec-flecha { position: absolute; width: 14px; height: 14px; background: var(--oficio); transform: rotate(45deg); }
          .rec-nota--derecha .rec-flecha   { left: -7px;   top: calc(var(--rec-flecha) - 7px); }
          .rec-nota--izquierda .rec-flecha { right: -7px;  top: calc(var(--rec-flecha) - 7px); }
          .rec-nota--abajo .rec-flecha     { top: -7px;    left: calc(var(--rec-flecha) - 7px); }
          .rec-nota--arriba .rec-flecha    { bottom: -7px; left: calc(var(--rec-flecha) - 7px); }
        `}</style>

        {marco && (
          <div className="rec-marco" aria-hidden="true"
            style={{ left: marco.x, top: marco.y, width: marco.w, height: marco.h }} />
        )}
        <p className="amx-sr" aria-live="polite">
          {listo ? 'Recorrido terminado' : `Parada ${paso + 1} de ${total}: ${p.cinta}`}
        </p>

        {listo ? (
          <div ref={notaRef} className="rec-hoja" role="dialog" aria-modal="true" aria-labelledby="rec-cinta" tabIndex={-1}>
            <window.CintaDymo nivel={2} id="rec-cinta">Listo</window.CintaDymo>
            <p className="rec-texto">Ya conoces el sitio. Puedes repetir este recorrido desde Más → Ver tutorial.</p>
            <div className="rec-aprobado"><span className="amx-sello amx-sello--civil">Aprobado</span></div>
            <div className="rec-pie">
              <button type="button" className="rec-atras" onClick={atras}>‹ Atrás</button>
              <button type="button" className="rec-btn" onClick={empezar}>
                <span className="amx-sello amx-sello--restr">Empezar</span>
              </button>
            </div>
          </div>
        ) : (
          <div ref={notaRef} className={'rec-nota rec-nota--' + (geo ? geo.lado : 'movil')}
            role="dialog" aria-modal="true" aria-labelledby="rec-cinta" tabIndex={-1}
            style={geo && geo.nota ? { left: geo.nota.x, top: geo.nota.y } : undefined}>
            {geo && geo.nota && <span className="rec-flecha" aria-hidden="true" style={{ '--rec-flecha': geo.flecha + 'px' }} />}
            <div className="rec-cabeza">
              <window.CintaDymo nivel={2} chica id="rec-cinta">{p.cinta}</window.CintaDymo>
              <button type="button" className="rec-salir" onClick={onCerrar}>Salir</button>
            </div>
            <p className="rec-texto">{p.nota}</p>
            <div className="rec-pie">
              <button type="button" className="rec-atras" onClick={atras} disabled={paso === 0}>‹ Atrás</button>
              <span className="rec-folio">{String(paso + 1).padStart(2, '0')} / {total}</span>
              <button type="button" className="rec-btn" onClick={siguiente}>
                <span className="amx-sello amx-sello--restr">Siguiente ›</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
  RecorridoSitio.PARADAS = PARADAS;
  RecorridoSitio.colocarNota = colocarNota;
  window.RecorridoSitio = RecorridoSitio;
})();
