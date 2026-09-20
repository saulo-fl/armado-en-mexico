// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

/* ----------------------------------------------------------------__ */
/*  LegalidadHub                                                      */
/* ----------------------------------------------------------------__ */

function LegalidadHub({ onNav }) {
  const C = window.AMX_LEGAL;

  // OJO con la descripción de «Estatal»: decía «normativa estatal aplicable a la posesión
  // y uso de armas», y eso es FALSO. Las armas de fuego son competencia federal: no hay
  // normativa estatal que consultar. Lo que sí cambia de un estado a otro es dónde se
  // hacen algunos papeles, y eso es lo que esa pantalla enseña. El corpus lo dice con
  // todas sus letras en `noHayEstatal`; la carpeta no puede contradecirlo.
  //
  // Y la clave de Requisitos es 'legal-req', que es la que conoce el router. Con
  // 'legal-requisitos' la única carpeta que debería funcionar tampoco lo hacía.
  const carpetas = [
    { clave: 'legal-federal', tit: 'Federal', desc: 'La escalera de normas que aplica, de la Constitución al formato de solicitud.' },
    { clave: 'legal-estatal', tit: 'Estatal', desc: 'Dónde se saca cada papel según el estado donde vives.' },
    { clave: 'legal-req', tit: 'Requisitos', desc: 'Los papeles del permiso y los de la compra, que son dos listas distintas.' },
    { clave: 'legal-permisos', tit: 'Permisos', desc: 'Qué autoriza cada permiso y qué no. Posesión no es portación.' },
  ];

  const huecos = window.amxLegalHuecos(C);

  return (
    <div className="amx-leg">
      <window.CintaDymo nivel={1}>Legalidad</window.CintaDymo>
      <p className="amx-leg-eyebrow">{C.portada.eyebrow} · {C.portada.title}</p>
      <p className="amx-leg-intro">{C.portada.intro}</p>
      <window.AvisoTransparencia aviso={C.avisoTransparencia} />
      <p className="amx-leg-advertencia">{C.advertencia}</p>
      <p className="amx-leg-fecha">Actualizado el {window.amxLegalFecha(C.actualizado)}</p>

      <nav className="amx-leg-carpetas" aria-label="Secciones de Legalidad">
        {carpetas.map((c) => (
          <button
            key={c.clave}
            type="button"
            className="amx-leg-carpeta"
            onClick={() => onNav(c.clave)}
          >
            <span className="amx-leg-carpeta-tit">{c.tit}</span>
            <span className="amx-leg-carpeta-desc">{c.desc}</span>
          </button>
        ))}
      </nav>

      <section className="amx-leg-huecos" aria-labelledby="leg-huecos">
        <h2 id="leg-huecos">Qué falta por verificar</h2>
        <p>
          Estos puntos no se afirman en esta página porque todavía no se ha
          encontrado la fuente oficial que los respalde.
        </p>
        <ul>
          {huecos.map((h) => (
            <li key={h.tabla + h.id}>
              <code>{h.tabla}</code> — {h.nota}
            </li>
          ))}
        </ul>
      </section>

      <window.ReportarError tipo="legalidad" titulo="Legalidad" ruta="/legalidad" />
    </div>
  );
}

/* ----------------------------------------------------------------__ */
/*  LegalidadRequisitos                                               */
/* ----------------------------------------------------------------__ */

function LegalidadRequisitos({ onNav }) {
  const C = window.AMX_LEGAL;

  const orden = ['permiso-adquisicion', 'compra-dcam'];

  return (
    <div className="amx-leg">
      <window.CintaDymo nivel={1}>Requisitos</window.CintaDymo>
      <p className="amx-leg-advertencia">{C.advertencia}</p>

      {orden.map((id) => {
        const tramite = C.tramites.find((t) => t.id === id);
        if (!tramite) return null;

        const requisitos = window.amxRequisitosDe(C, tramite.id, {});

        return (
          <section key={tramite.id} className="amx-leg-hoja">
            <h2>{tramite.nombre}</h2>
            <p className="amx-leg-dependencia">{tramite.dependencia}</p>
            <p className="amx-leg-habilita">{tramite.habilita}</p>
            {tramite.noHabilita && (
              <p className="amx-leg-no-habilita">{tramite.noHabilita}</p>
            )}

            <ol className="amx-leg-checklist">
              {requisitos.map((r) => (
                <li key={r.id}>
                  <span className="amx-leg-casilla" aria-hidden="true">☐</span>
                  <span className="amx-leg-req-nombre">{r.nombre}</span>
                  {r.original && <span className="amx-leg-sello">ORIGINAL</span>}
                  {r.copia && <span className="amx-leg-copia">{r.copia}</span>}
                  {r.detalle && <p className="amx-leg-detalle">{r.detalle}</p>}
                  {r.vigencia && <p className="amx-leg-vigencia">{r.vigencia}</p>}
                  {r.variantes && r.variantes.length > 0 && (
                    <dl className="amx-leg-variantes">
                      {r.variantes.map((v, i) => (
                        <div key={i}>
                          <dt>{v.escenario}</dt>
                          <dd>
                            {v.documento}
                            {/* Quién lo expide es la mitad útil del dato: sin esto, el
                                ejidatario sabe que necesita un certificado pero no que
                                se lo da el Comisariado Ejidal inscrito en el RAN. */}
                            {v.autoridadLocal && (
                              <span className="amx-leg-autoridad"> Lo expide: {v.autoridadLocal}</span>
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  <window.CitaFuente fuente={window.amxLegalFuente(C, r.fuente)} />
                </li>
              ))}
            </ol>

            <window.CitaFuente fuente={window.amxLegalFuente(C, tramite.fuente)} />
          </section>
        );
      })}

      <window.ReportarError tipo="legalidad" titulo="Requisitos" ruta="/legalidad/requisitos" />
    </div>
  );
}

/* ----------------------------------------------------------------__ */
/*  LegalidadFederal                                                  */
/* ----------------------------------------------------------------__ */

function LegalidadFederal({ onNav }) {
  const C = window.AMX_LEGAL;

  const normasOrdenadas = [...C.normas].sort((a, b) => a.orden - b.orden);

  return (
    <div className="amx-leg">
      <window.CintaDymo nivel={1}>Marco federal</window.CintaDymo>
      <p className="amx-leg-intro">
        Las armas de fuego en México son competencia exclusiva del Congreso de la Unión.
        Ningún estado ni municipio puede crear permisos, licencias ni registros de armas
        de fuego. Esta es la escalera de normas que se aplica, del escalón más alto al más
        específico.
      </p>
      <ol className="amx-leg-escalera">
        {normasOrdenadas.map((n) => (
          <li key={n.id} className="amx-leg-peldano">
            <h2>{n.rotulo}</h2>
            {n.titulo && <p className="amx-leg-peldano-tit">{n.titulo}</p>}
            {!n.revisar && n.resumen && <p className="amx-leg-habilita">{n.resumen}</p>}
            {n.notaVigencia && <p className="amx-leg-vigencia">{n.notaVigencia}</p>}
            {n.revisar && (
              <p className="amx-leg-hueco">
                Pendiente de verificar: {n.nota}
              </p>
            )}
            {!n.revisar && n.fuente && (
              <window.CitaFuente fuente={window.amxLegalFuente(C, n.fuente)} />
            )}
            {n.articulos && n.articulos.length > 0 && (
              <details className="amx-leg-arts">
                <summary>Artículos</summary>
                <div>
                  {n.articulos.map((artId) => {
                    const art = C.articulos.find((a) => a.id === artId);
                    if (!art || art.revisar) return null;
                    return (
                      <div key={art.id}>
                        <strong>{art.rotulo}</strong>
                        {art.titulo && <p>{art.titulo}</p>}
                        {art.resumen && <p>{art.resumen}</p>}
                        <window.CitaFuente fuente={window.amxLegalFuente(C, art.fuente)} />
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
          </li>
        ))}
      </ol>
      <window.ReportarError
        tipo="legalidad"
        titulo="Marco federal"
        ruta="/legalidad/federal"
      />
    </div>
  );
}

/* ----------------------------------------------------------------__ */
/*  LegalidadEstatal                                                  */
/* ----------------------------------------------------------------__ */

function LegalidadEstatal({ onNav }) {
  const C = window.AMX_LEGAL;
  const [sel, setSel] = React.useState('');

  const ent = C.entidades.find((e) => e.id === sel);

  return (
    <div className="amx-leg">
      <window.CintaDymo nivel={1}>Lo que cambia por estado</window.CintaDymo>
      <p className="amx-leg-advertencia">{C.noHayEstatal}</p>
      <label className="amx-leg-selector">
        <span>Elige tu estado</span>
        <select value={sel} onChange={(e) => setSel(e.target.value)}>
          <option value="">Selecciona…</option>
          {C.entidades.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
      </label>
      {ent && (
        <dl className="amx-leg-estado">
          <dt>Constancia de antecedentes penales</dt>
          <dd>
            {ent.antecedentes.revisar ? (
              <>
                Todavía no hemos verificado el portal de este estado.{' '}
                {ent.antecedentes.nota}
              </>
            ) : (
              <>
                {ent.antecedentes.dependencia}
                {ent.antecedentes.domicilio && <p>{ent.antecedentes.domicilio}</p>}
                {ent.antecedentes.url && (
                  <a
                    href={ent.antecedentes.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Ir al trámite de antecedentes penales de ${ent.nombre} (se abre en una pestaña nueva)`}
                  >
                    Ir al trámite
                  </a>
                )}
              </>
            )}
          </dd>
          <dt>Dónde compras</dt>
          <dd>
            {ent.ventanilla === 'otca'
              ? 'OTCA, en Monterrey'
              : 'DCAM, en Naucalpan'}
            , {ent.ventanillaFundamento}
          </dd>
          <dt>Envío por correo certificado</dt>
          <dd>
            {ent.envioPorCorreo ? 'Sí se puede' : 'No se puede desde aquí'}
            , {ent.envioFundamento}
            {ent.envioNota && <p>{ent.envioNota}</p>}
          </dd>
          <dt>Traslado de traumáticas</dt>
          <dd>
            {ent.traumaticas
              ? `${ent.traumaticas.texto} — ${ent.traumaticas.fundamento}`
              : 'No hemos verificado la regla local de este estado.'}
          </dd>
        </dl>
      )}
      <window.ReportarError
        tipo="legalidad"
        titulo="Lo que cambia por estado"
        ruta="/legalidad/estatal"
      />
    </div>
  );
}

/* ----------------------------------------------------------------__ */
/*  LegalidadPermisos                                                 */
/* ----------------------------------------------------------------__ */

function LegalidadPermisos({ onNav }) {
  const C = window.AMX_LEGAL;

  return (
    <div className="amx-leg">
      <window.CintaDymo nivel={1}>Permisos y licencias</window.CintaDymo>
      <section className="amx-leg-contraste">
        <h2>Posesión no es portación</h2>
        <p>
          Tener un permiso de adquisición te autoriza a comprar el arma y a tenerla en
          el domicilio que declaraste ante la Secretaría de la Defensa Nacional. Pero
          sacar esa arma de tu casa para llevarla en la vía pública es otra cosa
          completamente distinta: eso se llama portación, y requiere una licencia
          individual de portación (DEFENSA-02-025), que es un trámite separado, más
          costoso, y cuya concesión no está garantizada aunque cumplas todos los
          requisitos. Esta es la confusión más frecuente entre las personas que
          tramitan su primer permiso.
        </p>
      </section>
      {C.tramites.map((t) => (
        <article key={t.id} className="amx-leg-ficha">
          <h2>{t.nombre}</h2>
          {t.homoclave && <p className="amx-leg-homoclave">{t.homoclave}</p>}
          {t.notaHomoclave && <p className="amx-leg-vigencia">{t.notaHomoclave}</p>}
          <dl>
            {t.dependencia && (
              <>
                <dt>Dependencia</dt>
                <dd>{t.dependencia}</dd>
              </>
            )}
            {t.sede && (
              <>
                <dt>Sede</dt>
                <dd>{t.sede}</dd>
              </>
            )}
            {t.habilita && (
              <>
                <dt>Qué habilita</dt>
                <dd>{t.habilita}</dd>
              </>
            )}
            {t.noHabilita && (
              <>
                <dt>Qué NO habilita</dt>
                <dd>{t.noHabilita}</dd>
              </>
            )}
            {t.costo && (
              <>
                <dt>Costo</dt>
                <dd>
                  ${t.costo.monto}{' '}
                  {t.costo.moneda} (cuota de {t.costo.anio})
                </dd>
              </>
            )}
          </dl>
          {t.revisar && (
            <p className="amx-leg-hueco">
              Pendiente de verificar: {t.nota}
            </p>
          )}
          {!t.revisar && t.fuente && (
            <window.CitaFuente fuente={window.amxLegalFuente(C, t.fuente)} />
          )}
        </article>
      ))}
      <window.ReportarError
        tipo="legalidad"
        titulo="Permisos"
        ruta="/legalidad/permisos"
      />
    </div>
  );
}

/* ----------------------------------------------------------------__ */
/*  Module-level exports                                             */
/* ----------------------------------------------------------------__ */

window.LegalidadHub = LegalidadHub;
window.LegalidadRequisitos = LegalidadRequisitos;
window.LegalidadFederal = LegalidadFederal;
window.LegalidadEstatal = LegalidadEstatal;
window.LegalidadPermisos = LegalidadPermisos;
