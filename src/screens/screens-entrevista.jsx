// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.


function EntrevistaScreen({ onNav }) {
  const [resp, setResp] = React.useState({});
  const [sel, setSel] = React.useState(null);

  const arbol = window.AMX_ENTREVISTA;
  const d = window.amxEvaluarEntrevista(arbol, resp);
  const p = d.pendiente;

  function borrarYRestar(i) {
    const claves = d.recorrido.slice(0, i).map(function (r) { return r.pregunta.id; });
    var acc = {};
    claves.forEach(function (k) { if (resp[k] !== undefined) acc[k] = resp[k]; });
    setResp(acc);
    setSel(null);
  }

  if (d.estado !== 'incompleta' && d.pendiente === null) {
    var tituloDictamen;
    if (d.dictamen === 'reune-requisitos') {
      tituloDictamen = 'Reúnes los requisitos del formato';
    } else if (d.dictamen === 'falta-requisito') {
      tituloDictamen = 'Falta un requisito';
    } else if (d.dictamen === 'no-procede') {
      tituloDictamen = 'El formato no procede';
    } else {
      tituloDictamen = 'Dictamen';
    }

    return (
      <div className="amx-ent">
        <window.CintaDymo nivel={1}>{arbol.titulo || 'Entrevista'}</window.CintaDymo>

        <div className="amx-ent-mesa">

          <div className="amx-ent-folder">
            <nav className="amx-ent-recorrido" aria-label="Respuestas dadas">
              {d.recorrido.map(function (r, i) {
                return (
                  <button
                    key={i}
                    type="button"
                    className="amx-ent-paso"
                    aria-label={'Pregunta ' + (i + 1) + ', ' + r.pregunta.texto +
                      ': respondiste ' + r.opcion.texto + '. Cambiar.'}
                    onClick={function () { borrarYRestar(i); }}
                  >
                    <span aria-hidden="true">{i + 1}</span>
                  </button>
                );
              })}
            </nav>

            <section className="amx-ent-dictamen" data-tipo={d.dictamen}>
              <p className="amx-ent-sello" aria-hidden="true">REVISIÓN PROPIA · ARMADO EN MÉXICO</p>
              <h2>{tituloDictamen}</h2>
              {d.dictamen === 'reune-requisitos' && (
                <p>Con lo que contestaste, reúnes los requisitos que el formato
                  DEFENSA-02-040 pide para iniciar el trámite. La autorización la decide la
                  autoridad, no este cuestionario.</p>
              )}
              {d.dictamen === 'falta-requisito' && (
                <p>Con lo que contestaste, todavía te falta un requisito.</p>
              )}
              {d.dictamen === 'no-procede' && (
                <p>Con lo que contestaste, el formato no permite expedir la
                  autorización.</p>
              )}
              {d.impedimento && (
                <>
                  <p className="amx-ent-motivo">{d.impedimento.motivo}</p>
                  {d.impedimento.remedio && (
                    <p className="amx-ent-remedio">{d.impedimento.remedio}</p>
                  )}
                  {d.impedimento.nota && (
                    <p className="amx-ent-nota">{d.impedimento.nota}</p>
                  )}
                </>
              )}
              {d.avisos && d.avisos.length > 0 && (
                <ul className="amx-ent-avisos">
                  {d.avisos.map(function (a, i) {
                    return <li key={i}>{a.texto}</li>;
                  })}
                </ul>
              )}
              <button type="button" className="amx-ent-reiniciar" onClick={function () { setResp({}); setSel(null); }}>
                Empezar de nuevo
              </button>
            </section>
          </div>

          <aside className="amx-ent-carpeta" aria-label="Documentos que llevas">
            <h2>En tu carpeta</h2>
            <ul>
              {d.documentos.map(function (docId, i) {
                var req = (window.AMX_LEGAL.requisitos || []).find(function (r) { return r.id === docId; });
                var nombre = req ? req.nombre : docId;
                return <li key={i}>{nombre}</li>;
              })}
            </ul>
            <p className="amx-ent-cuenta">{d.documentos.length} documentos</p>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="amx-ent">
      <window.CintaDymo nivel={1}>{arbol.titulo || 'Entrevista'}</window.CintaDymo>

      <div className="amx-ent-mesa">

        <div className="amx-ent-folder">
          <nav className="amx-ent-recorrido" aria-label="Respuestas dadas">
            {d.recorrido.map(function (r, i) {
              return (
                <button
                  key={i}
                  type="button"
                  className="amx-ent-paso"
                  aria-label={'Pregunta ' + (i + 1) + ', ' + r.pregunta.texto +
                    ': respondiste ' + r.opcion.texto + '. Cambiar.'}
                  onClick={function () { borrarYRestar(i); }}
                >
                  <span aria-hidden="true">{i + 1}</span>
                </button>
              );
            })}
          </nav>

          {d.estado === 'incompleta' && d.pendiente && (
            <fieldset className="amx-ent-pregunta">
              <legend>{p.texto}</legend>
              {p.ayuda && <p className="amx-ent-ayuda">{p.ayuda}</p>}
              {p.opciones.map(function (o) {
                return (
                  <label key={o.id} className="amx-ent-opcion">
                    <input
                      type="radio"
                      name={'p-' + p.id}
                      value={o.id}
                      checked={sel === o.id}
                      onChange={function () { setSel(o.id); }}
                    />
                    <span>{o.texto}</span>
                  </label>
                );
              })}
              <button
                type="button"
                className="amx-ent-continuar"
                disabled={!sel}
                onClick={function () {
                  setResp(Object.assign({}, resp, { [p.id]: sel }));
                  setSel(null);
                }}
              >
                Continuar
              </button>
            </fieldset>
          )}
        </div>

        <aside className="amx-ent-carpeta" aria-label="Documentos que llevas">
          <h2>En tu carpeta</h2>
          <ul>
            {d.documentos.map(function (docId, i) {
              var req = (window.AMX_LEGAL.requisitos || []).find(function (r) { return r.id === docId; });
              var nombre = req ? req.nombre : docId;
              return <li key={i}>{nombre}</li>;
            })}
          </ul>
          <p className="amx-ent-cuenta">{d.documentos.length} documentos</p>
        </aside>
      </div>
    </div>
  );
}

window.EntrevistaScreen = EntrevistaScreen;
