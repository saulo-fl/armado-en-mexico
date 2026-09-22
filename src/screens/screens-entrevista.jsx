// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.


const AMX_ENTREVISTA_STORAGE = 'amx_entrevista_v1';
const AMX_ENTREVISTA_PIE = 'Autodiagnóstico hecho en armado.mx, esto no constituye ningún permiso ni trámite oficial';

function amxEntrevistaNombreDocumento(docId) {
  const requisitos = window.AMX_LEGAL && window.AMX_LEGAL.requisitos || [];
  const req = requisitos.find(function (r) { return r.id === docId; });
  return req ? req.nombre : docId;
}

function amxEntrevistaAjustarTexto(ctx, texto, anchoMaximo) {
  const palabras = String(texto || '').trim().split(/\s+/).filter(Boolean);
  const lineas = [];
  let linea = '';

  function guardarLinea() {
    if (linea) lineas.push(linea);
    linea = '';
  }

  palabras.forEach(function (palabra) {
    const candidata = linea ? linea + ' ' + palabra : palabra;
    if (ctx.measureText(candidata).width <= anchoMaximo) {
      linea = candidata;
      return;
    }
    guardarLinea();
    if (ctx.measureText(palabra).width <= anchoMaximo) {
      linea = palabra;
      return;
    }
    let fragmento = '';
    Array.from(palabra).forEach(function (caracter) {
      if (fragmento && ctx.measureText(fragmento + caracter).width > anchoMaximo) {
        lineas.push(fragmento);
        fragmento = caracter;
      } else {
        fragmento += caracter;
      }
    });
    linea = fragmento;
  });
  guardarLinea();
  return lineas;
}
window.amxEntrevistaAjustarTexto = amxEntrevistaAjustarTexto;

function amxEntrevistaTextoEspaciado(ctx, texto, centroX, y, espacio) {
  const caracteres = Array.from(texto);
  const ancho = caracteres.reduce(function (total, caracter) {
    return total + ctx.measureText(caracter).width;
  }, 0) + Math.max(0, caracteres.length - 1) * espacio;
  let x = centroX - ancho / 2;
  caracteres.forEach(function (caracter) {
    ctx.fillText(caracter, x, y);
    x += ctx.measureText(caracter).width + espacio;
  });
}

// Devuelve la imagen ya cargada, o null si no se pudo: la hoja se dibuja igual
// sin ella. Nunca rechaza, porque un dibujo que falta no puede tumbar el PNG
// entero cuando alguien pulsa Guardar Test.
function amxEntrevistaCargarImagen(ruta) {
  return new Promise(function (resolve) {
    const imagen = new window.Image();
    imagen.onload = function () { resolve(imagen); };
    imagen.onerror = function () { resolve(null); };
    imagen.src = ruta;
  });
}

async function amxEntrevistaCrearHoja(d) {
  if (document.fonts && document.fonts.ready) await document.fonts.ready;

  const ANCHO = 1080;
  const MARGEN = 80;
  const ANCHO_TEXTO = ANCHO - MARGEN * 2;
  const canvas = document.createElement('canvas');
  canvas.width = ANCHO;
  canvas.height = 1920;
  let ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_2d_no_disponible');

  function fuente(peso, tamano, familia) {
    ctx.font = peso + ' ' + tamano + 'px ' + familia;
  }

  const bloques = [];
  let y = 120 + 90 + 150 + 84;

  if (d.impedimento) {
    fuente(400, 38, 'Archivo, sans-serif');
    const motivo = amxEntrevistaAjustarTexto(ctx, d.impedimento.motivo, ANCHO_TEXTO);
    bloques.push({ tipo: 'texto', lineas: motivo, y: y, alto: 53.2, peso: 400, tamano: 38 });
    y += motivo.length * 53.2 + 24;
    if (d.impedimento.remedio) {
      const remedio = amxEntrevistaAjustarTexto(ctx, d.impedimento.remedio, ANCHO_TEXTO);
      bloques.push({ tipo: 'texto', lineas: remedio, y: y, alto: 53.2, peso: 400, tamano: 38 });
      y += remedio.length * 53.2 + 54;
    } else {
      y += 30;
    }
  }

  fuente(700, 46, 'Archivo, sans-serif');
  const tituloDocumentos = amxEntrevistaAjustarTexto(ctx, 'Documentos que te corresponden', ANCHO_TEXTO);
  bloques.push({ tipo: 'titulo', lineas: tituloDocumentos, y: y, alto: 59.8, peso: 700, tamano: 46 });
  y += tituloDocumentos.length * 59.8 + 32;

  fuente(400, 36, 'Archivo, sans-serif');
  d.documentos.forEach(function (docId) {
    const lineas = amxEntrevistaAjustarTexto(ctx, amxEntrevistaNombreDocumento(docId), ANCHO_TEXTO - 54);
    bloques.push({ tipo: 'documento', lineas: lineas, y: y, alto: 50.4, peso: 400, tamano: 36 });
    y += lineas.length * 50.4 + 18;
  });

  fuente(400, 26, '"JetBrains Mono", monospace');
  const lineasPie = amxEntrevistaAjustarTexto(ctx, AMX_ENTREVISTA_PIE, ANCHO_TEXTO - 40);
  const altoPie = lineasPie.length * 39;
  // El pie de la hoja, de arriba abajo: el reclamo, la advertencia y la marca.
  // La hoja se comparte, así que el reclamo va en cuerpo grande —es lo único
  // que trae gente de vuelta— y la dirección ya no se repite tres veces.
  const ALTO_RECLAMO = 74;
  const ALTO_MARCA = 92;
  const alto = Math.max(1100, Math.ceil(y + 60 + ALTO_RECLAMO + altoPie + ALTO_MARCA + 24));
  canvas.height = alto;
  ctx = canvas.getContext('2d');

  ctx.fillStyle = '#F7F8F4';
  ctx.fillRect(0, 0, ANCHO, alto);
  ctx.fillStyle = '#1C1D1F';
  ctx.fillRect(0, 0, ANCHO, 120);
  fuente(700, 44, '"JetBrains Mono", monospace');
  ctx.fillStyle = '#F2F1EC';
  ctx.textBaseline = 'alphabetic';
  amxEntrevistaTextoEspaciado(ctx, '¿PUEDO COMPRAR UN ARMA?', ANCHO / 2, 77, 3.5);

  const selloColor = d.dictamen === 'reune-requisitos' ? '#2E6B4F' : '#C83B32';
  const selloTexto = d.dictamen === 'reune-requisitos'
    ? 'APTO PARA INICIAR EL TRÁMITE' : 'NO APTO PARA EL TRÁMITE';
  ctx.save();
  ctx.translate(ANCHO / 2, 120 + 90 + 75);
  ctx.rotate(-3 * Math.PI / 180);
  ctx.strokeStyle = selloColor;
  ctx.lineWidth = 5;
  ctx.strokeRect(-440, -75, 880, 150);
  fuente(700, 42, '"JetBrains Mono", monospace');
  ctx.fillStyle = selloColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lineasSello = amxEntrevistaAjustarTexto(ctx, selloTexto, 820);
  lineasSello.forEach(function (lineaSello, i) {
    ctx.fillText(lineaSello, 0, (i - (lineasSello.length - 1) / 2) * 50);
  });
  ctx.restore();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#171B19';
  bloques.forEach(function (bloque) {
    fuente(bloque.peso, bloque.tamano, 'Archivo, sans-serif');
    bloque.lineas.forEach(function (lineaTexto, i) {
      const lineaY = bloque.y + i * bloque.alto;
      if (bloque.tipo === 'documento') {
        if (i === 0) {
          ctx.beginPath();
          ctx.arc(MARGEN + 13, lineaY - 12, 7, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillText(lineaTexto, MARGEN + 54, lineaY);
      } else {
        ctx.fillText(lineaTexto, MARGEN, lineaY);
      }
    });
  });

  ctx.textAlign = 'center';
  // 1 — El reclamo, lo más grande del pie.
  const marcaCentroY = alto - ALTO_MARCA / 2 - 34;
  const pieY = marcaCentroY - ALTO_MARCA / 2 - 26 - (lineasPie.length - 1) * 39;
  fuente(700, 42, 'Archivo, sans-serif');
  ctx.fillStyle = '#1C1D1F';
  ctx.fillText('¡Haz tu test en armado.mx!', ANCHO / 2, pieY - 52);

  // 2 — La advertencia, en el cuerpo pequeño de siempre.
  fuente(400, 26, '"JetBrains Mono", monospace');
  ctx.fillStyle = '#59605C';
  lineasPie.forEach(function (lineaPie, i) {
    ctx.fillText(lineaPie, ANCHO / 2, pieY + i * 39);
  });

  // 3 — La marca: el isotipo y el logotipo al lado, como en la cabecera del
  // sitio. Sustituye al «armado.mx» suelto que repetía la dirección por
  // tercera vez. Si el isotipo no carga, se cae a solo el logotipo: una hoja
  // sin pie de marca sería peor que una sin dibujo.
  const isotipo = await amxEntrevistaCargarImagen('imagenes/isotipo-armado.webp');
  const LADO = 76;
  const SEPARACION = 26;
  const ESPACIADO = 3;
  fuente(700, 32, 'Archivo, sans-serif');
  const logotipo = 'ARMADO EN MÉXICO';
  const anchoLogotipo = Array.from(logotipo).reduce(function (total, caracter) {
    return total + ctx.measureText(caracter).width;
  }, 0) + Math.max(0, Array.from(logotipo).length - 1) * ESPACIADO;
  const anchoMarca = (isotipo ? LADO + SEPARACION : 0) + anchoLogotipo;
  let marcaX = (ANCHO - anchoMarca) / 2;
  if (isotipo) {
    ctx.drawImage(isotipo, marcaX, marcaCentroY - LADO / 2, LADO, LADO);
    marcaX += LADO + SEPARACION;
  }
  ctx.fillStyle = '#1C1D1F';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  amxEntrevistaTextoEspaciado(ctx, logotipo, marcaX + anchoLogotipo / 2, marcaCentroY, ESPACIADO);
  ctx.textBaseline = 'alphabetic';

  return canvas;
}

function amxEntrevistaCanvasABlob(canvas) {
  return new Promise(function (resolve, reject) {
    canvas.toBlob(function (blob) {
      if (blob) resolve(blob);
      else reject(new Error('png_no_generado'));
    }, 'image/png');
  });
}

function amxEntrevistaDescargar(blob, nombre) {
  const url = window.URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(function () { window.URL.revokeObjectURL(url); }, 1000);
}

async function amxEntrevistaGuardarHoja(d) {
  const nombre = 'armado-mx-autodiagnostico.png';
  const canvas = await amxEntrevistaCrearHoja(d);
  const blob = await amxEntrevistaCanvasABlob(canvas);
  const archivo = new window.File([blob], nombre, { type: 'image/png' });
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [archivo] })) {
    try {
      await navigator.share({
        files: [archivo],
        title: '¿Puedo comprar un arma?',
        text: 'Mi autodiagnóstico de armado.mx',
      });
      return 'compartido';
    } catch (error) {
      if (error && error.name === 'AbortError') return 'cancelado';
    }
  }
  amxEntrevistaDescargar(blob, nombre);
  return 'descargado';
}

function amxLeerEntrevista(arbol) {
  try {
    const guardado = JSON.parse(window.localStorage.getItem(AMX_ENTREVISTA_STORAGE) || 'null');
    if (!guardado || guardado.version !== arbol.version) {
      window.localStorage.removeItem(AMX_ENTREVISTA_STORAGE);
      return {};
    }
    return guardado.respuestas && typeof guardado.respuestas === 'object'
      ? guardado.respuestas : {};
  } catch (e) {
    return {};
  }
}

function EntrevistaCuerpo({ modoPortada = false }) {
  const arbol = window.AMX_ENTREVISTA;
  // Al montar, borra cualquier progreso guardado para que siempre empiece
  // retraído en la primera pregunta.
  React.useEffect(function () {
    try { window.localStorage.removeItem(AMX_ENTREVISTA_STORAGE); } catch (e) {}
  }, []);
  const [resp, setResp] = React.useState(function () { return {}; });
  const [saliendo, setSaliendo] = React.useState(false);
  const [anuncio, setAnuncio] = React.useState('');
  const [guardando, setGuardando] = React.useState(false);
  const dictamenRef = React.useRef(null);
  const enunciadoRef = React.useRef(null);
  const cuerpoRef = React.useRef(null);
  const d = window.amxEvaluarEntrevista(arbol, resp);
  const p = d.pendiente;
  const final = d.estado !== 'incompleta' && d.pendiente === null;
  const compacta = modoPortada && d.recorrido.length === 0;

  React.useEffect(function () {
    try {
      window.localStorage.setItem(AMX_ENTREVISTA_STORAGE,
        JSON.stringify({ version: arbol.version, respuestas: resp }));
    } catch (e) {}
  }, [arbol.version, resp]);

  React.useEffect(function () {
    if (final && dictamenRef.current) dictamenRef.current.focus();
  }, [final]);

  // Al contestar la PRIMERA pregunta aparece la mesa, que va encima y empuja la
  // pregunta hacia abajo: quien acaba de tocar un botón se queda mirando un
  // sitio donde ya no hay nada. Este es el único empujón de la entrevista; en
  // las siguientes la mesa ya está puesta y nada se mueve de sitio.
  const contestadas = d.recorrido.length;
  const contestadasAntes = React.useRef(contestadas);
  React.useEffect(function () {
    const antes = contestadasAntes.current;
    contestadasAntes.current = contestadas;
    if (!modoPortada || antes !== 0 || contestadas !== 1 || !cuerpoRef.current) return;
    const reducir = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    cuerpoRef.current.scrollIntoView({ block: 'start', behavior: reducir ? 'auto' : 'smooth' });
  }, [modoPortada, contestadas]);

  function guardarRespuestas(nuevas) {
    setResp(nuevas);
    setSaliendo(false);
  }

  function responder(opcionId) {
    if (!p || saliendo) return;
    const nuevas = Object.assign({}, resp, { [p.id]: opcionId });
    const siguiente = window.amxEvaluarEntrevista(arbol, nuevas);
    const agregados = siguiente.documentos.filter(function (id) {
      return d.documentos.indexOf(id) === -1;
    });
    const proxima = siguiente.pendiente;
    const partes = [proxima ? proxima.texto : 'Entrevista terminada'];
    agregados.forEach(function (id) {
      partes.push('Agregado: ' + amxEntrevistaNombreDocumento(id));
    });
    setAnuncio(partes.join('. '));
    const reducir = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducir) {
      guardarRespuestas(nuevas);
      return;
    }
    setSaliendo(true);
    window.setTimeout(function () { guardarRespuestas(nuevas); }, 180);
  }

  function borrarYRestar(i) {
    const claves = d.recorrido.slice(0, i).map(function (r) { return r.pregunta.id; });
    const acc = {};
    claves.forEach(function (k) { if (resp[k] !== undefined) acc[k] = resp[k]; });
    setResp(acc);
    setSaliendo(false);
    const anterior = d.recorrido[i] && d.recorrido[i].pregunta;
    setAnuncio(anterior ? anterior.texto : '');
  }

  function regresar() {
    if (!d.recorrido.length) return;
    borrarYRestar(d.recorrido.length - 1);
  }

  async function guardarTest() {
    if (!final || guardando) return;
    setGuardando(true);
    setAnuncio('Preparando la imagen del autodiagnóstico');
    try {
      const resultado = await amxEntrevistaGuardarHoja(d);
      if (resultado === 'compartido') setAnuncio('Imagen compartida');
      else if (resultado === 'descargado') setAnuncio('Imagen descargada');
      else setAnuncio('Compartir cancelado');
    } catch (error) {
      console.error('No se pudo guardar el autodiagnóstico', error);
      setAnuncio('No se pudo guardar la imagen. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  const pregunta = !final && p ? (
    <fieldset
      key={p.id}
      className={'amx-ent-pregunta amx-ent-pregunta--entra' + (saliendo ? ' amx-ent-pregunta--sale' : '')}
    >
      {/* La altura estable evita que salten las respuestas; el texto se apoya
          abajo para que la pregunta corta no deje un hueco encima de ellas. */}
      <legend id={'amx-ent-p-' + p.id} ref={enunciadoRef} className="amx-ent-pregunta-enunciado"
        data-largo={p.texto.length > 80 ? 'mucho' : p.texto.length > 45 ? 'medio' : 'poco'}>
        {/* El folio del renglón, como en un formato impreso. Va oculto al
            lector de pantalla: numera, no dice nada que la pregunta no diga. */}
        <span className="amx-ent-folio" aria-hidden="true">{d.recorrido.length + 1}</span>
        <span>{p.texto}</span></legend>
      <div className={'amx-ent-opciones' + (compacta ? ' amx-ent-opciones--compacta' : '')}
        role="radiogroup" aria-labelledby={'amx-ent-p-' + p.id}>
        {p.opciones.map(function (o) {
          return (
            <button key={o.id} type="button" role="radio" aria-checked={resp[p.id] === o.id}
              className="amx-ent-opcion"
              disabled={saliendo} onClick={function () { responder(o.id); }}>
              {/* En la portada cabe la versión corta; el lector de pantalla
                  sigue oyendo la respuesta entera por el aria-label. */}
              <span aria-hidden={compacta && o.corto ? 'true' : undefined}>
                {compacta && o.corto ? o.corto : o.texto}
              </span>
              {compacta && o.corto && <span className="amx-solo-lector">{o.texto}</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  ) : null;

  const dictamen = final ? (
    <section className="amx-ent-dictamen" data-tipo={d.dictamen} tabIndex="-1" ref={dictamenRef}>
      <p className="amx-ent-sello" aria-label={d.dictamen === 'reune-requisitos'
        ? 'Apto para iniciar el trámite' : 'No apto para el trámite'}>
        {d.dictamen === 'reune-requisitos' ? 'Apto para iniciar el trámite' : 'No apto para el trámite'}
      </p>
      {d.impedimento && <p className="amx-ent-motivo">{d.impedimento.motivo}</p>}
      {d.impedimento && d.impedimento.remedio && (
        <p className="amx-ent-remedio">{d.impedimento.remedio}</p>
      )}
      {d.impedimento && d.impedimento.nota && <p className="amx-ent-nota">{d.impedimento.nota}</p>}
      {d.avisos && d.avisos.length > 0 && (
        <ul className="amx-ent-avisos">
          {d.avisos.map(function (a, i) { return <li key={i}>{a.texto}</li>; })}
        </ul>
      )}
      <h2>Documentos que te corresponden</h2>
      <ul className="amx-ent-documentos-finales">
        {d.documentos.map(function (docId) {
          return <li key={docId}>{amxEntrevistaNombreDocumento(docId)}</li>;
        })}
      </ul>
      <p className="amx-ent-pie-dictamen">{AMX_ENTREVISTA_PIE}</p>
    </section>
  ) : null;

  return (
    <div ref={cuerpoRef} className={'amx-ent-cuerpo' + (compacta ? ' amx-ent-cuerpo--compacto' : '')}>
      <div className="amx-ent-vivo amx-solo-lector" aria-live="polite" aria-atomic="true">{anuncio}</div>
      {/* El escritorio va ARRIBA de las preguntas: así no lo empuja hacia abajo
          una pregunta con cuatro respuestas largas, y se queda quieto mientras
          se contesta. Se reordena aquí y no con `order` en CSS para que el
          lector de pantalla lo recorra en el mismo orden en que se ve. */}
      {!compacta && !final && d.recorrido.length > 0 && (
        <window.EscritorioPapeles documentos={d.documentos} />
      )}
      <div className="amx-ent-mesa">
        {/* Toda la entrevista se sirve sobre la misma hoja de oficio que usan la
            FAQ y la clasificación, con su membrete: cada pregunta es un renglón
            del formato, no una tarjeta de aplicación. */}
        <div className="amx-ent-folder amx-oficio">
          {!final && (
            <div className="amx-oficio-membrete" aria-hidden="true">
              {/* En el teléfono el membrete se queda solo con lo que aporta: la
                  marca ya está en la cabecera del sitio y partida en dos
                  renglones estorbaba más de lo que decía. */}
              <span><span className="amx-ent-membrete-marca">Armado en México · </span>Autodiagnóstico</span>
              <span>DEFENSA-02-040</span>
            </div>
          )}
          {pregunta}
          {dictamen}
          <div className="amx-ent-acciones">
            <button type="button" className="amx-ent-regresar" disabled={!d.recorrido.length}
              onClick={regresar}>Regresar</button>
            {final && (
              <button type="button" className="amx-ent-guardar" disabled={guardando}
                onClick={guardarTest}>{guardando ? 'Preparando…' : 'Guardar Test'}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
window.EntrevistaCuerpo = EntrevistaCuerpo;

function EntrevistaScreen() {
  const arbol = window.AMX_ENTREVISTA;
  return (
    <div className="amx-ent">
      <window.CintaDymo nivel={1}>{arbol.titulo || 'Entrevista'}</window.CintaDymo>
      <EntrevistaCuerpo />
    </div>
  );
}

window.EntrevistaScreen = EntrevistaScreen;
