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
  const dictamenRef = React.useRef(null);
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
    const numero = proxima ? arbol.preguntas.indexOf(proxima) + 1 : arbol.preguntas.length;
    const partes = [proxima ? 'Pregunta ' + numero + ' de ' + arbol.preguntas.length : 'Entrevista terminada'];
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
    const anterior = arbol.preguntas.findIndex(function (pregunta) {
      return pregunta.id === (d.recorrido[i] && d.recorrido[i].pregunta.id);
    });
    setAnuncio('Pregunta ' + (anterior + 1) + ' de ' + arbol.preguntas.length);
  }

  function regresar() {
    if (!d.recorrido.length) return;
    borrarYRestar(d.recorrido.length - 1);
  }

  const pregunta = !final && p ? (
    <fieldset
      key={p.id}
      className={'amx-ent-pregunta amx-ent-pregunta--entra' + (saliendo ? ' amx-ent-pregunta--sale' : '')}
    >
      <p className="amx-ent-num">Pregunta {arbol.preguntas.indexOf(p) + 1} de {arbol.preguntas.length}</p>
      <legend id={'amx-ent-p-' + p.id}>{p.texto}</legend>
      <div className="amx-ent-opciones">
        {p.opciones.map(function (o) {
          return (
            <button key={o.id} type="button" className="amx-ent-opcion"
              disabled={saliendo} onClick={function () { responder(o.id); }}>
              {o.texto}
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
              <button type="button" className="amx-ent-guardar" disabled
                title="Guardar Test llegará en la siguiente entrega">Guardar Test</button>
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
