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
  const alto = Math.max(1100, Math.ceil(y + 120 + altoPie + 130));
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

  fuente(400, 26, '"JetBrains Mono", monospace');
  ctx.fillStyle = '#59605C';
  ctx.textAlign = 'center';
  const pieY = alto - 130 - altoPie;
  lineasPie.forEach(function (lineaPie, i) {
    ctx.fillText(lineaPie, ANCHO / 2, pieY + i * 39);
  });
  fuente(700, 24, '"JetBrains Mono", monospace');
  ctx.fillText('armado.mx', ANCHO / 2, alto - 52);

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

function EntrevistaCarpeta({ documentos }) {
  return (
    <aside className="amx-ent-carpeta" aria-label="Documentos que llevas">
      <h2>En tu carpeta</h2>
      <ul>
        {documentos.map(function (docId) {
          return <li key={docId}>{amxEntrevistaNombreDocumento(docId)}</li>;
        })}
      </ul>
      <p className="amx-ent-cuenta">{documentos.length} documentos</p>
    </aside>
  );
}

function EntrevistaCuerpo({ modoPortada = false }) {
  const arbol = window.AMX_ENTREVISTA;
  const [resp, setResp] = React.useState(function () { return amxLeerEntrevista(arbol); });
  const [saliendo, setSaliendo] = React.useState(false);
  const [anuncio, setAnuncio] = React.useState('');
  const [guardando, setGuardando] = React.useState(false);
  const dictamenRef = React.useRef(null);
  const enunciadoRef = React.useRef(null);
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
      {/* `data-largo` encoge la letra en los enunciados largos para que quepan en la
          altura reservada. Sin él, «¿Tu patrón puede darte una carta de trabajo…»
          (109 caracteres) empujaba las respuestas 25 px más abajo que «¿Naciste en
          México?», y las cajas saltaban de sitio al cambiar de pregunta. */}
      <legend id={'amx-ent-p-' + p.id} ref={enunciadoRef} className="amx-ent-pregunta-enunciado"
        data-largo={p.texto.length > 80 ? 'mucho' : p.texto.length > 45 ? 'medio' : 'poco'}>{p.texto}</legend>
      <div className={'amx-ent-opciones' + (compacta ? ' amx-ent-opciones--compacta' : '')}
        role="radiogroup" aria-labelledby={'amx-ent-p-' + p.id}>
        {p.opciones.map(function (o) {
          return (
            <button key={o.id} type="button" role="radio" aria-checked={resp[p.id] === o.id}
              className="amx-casilla amx-ent-opcion"
              disabled={saliendo} onClick={function () { responder(o.id); }}>
              <span className="amx-casilla-caja" aria-hidden="true" />
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
    <div className={'amx-ent-cuerpo' + (compacta ? ' amx-ent-cuerpo--compacto' : '')}>
      <div className="amx-ent-vivo amx-solo-lector" aria-live="polite" aria-atomic="true">{anuncio}</div>
      <div className="amx-ent-mesa">
        <div className="amx-ent-folder">
          {pregunta}
          {dictamen}
          {!compacta && <window.EscritorioPapeles documentos={d.documentos} />}
          <div className="amx-ent-acciones">
            <button type="button" className="amx-ent-regresar" disabled={!d.recorrido.length}
              onClick={regresar}>Regresar</button>
            {final && (
              <button type="button" className="amx-ent-guardar" disabled={guardando}
                onClick={guardarTest}>{guardando ? 'Preparando…' : 'Guardar Test'}</button>
            )}
          </div>
        </div>
        {!compacta && <EntrevistaCarpeta documentos={d.documentos} />}
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
