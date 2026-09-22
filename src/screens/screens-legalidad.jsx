// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Legalidad v2 (22-sep-2026): las ocho decisiones de Saulo, tomadas en los hilos
// de Penpot, están en docs/superpowers/specs/2026-09-22-legalidad-v2-design.md
// (llega con el PR #278, rama fable/penpot).
// En corto: la entrevista arriba del hub; los huecos del corpus NO se publican
// (son de desarrollo: `amxLegalHuecos` los sigue contando para check-legal.mjs);
// lo federal se ordena por pregunta ciudadana; Requisitos y Permisos se funden
// en Trámites; y la vigencia de cada cuota va junto al importe.

/* ----------------------------------------------------------------__ */
/*  LegalidadHub                                                      */
/* ----------------------------------------------------------------__ */

function LegalidadHub({ onNav }) {
  const C = window.AMX_LEGAL;

  // OJO con la descripción de «Por estado»: no hay normativa estatal de armas, son
  // competencia federal. Lo que cambia de un estado a otro es dónde se hacen algunos
  // papeles, y eso es lo que esa pantalla enseña. El corpus lo dice con todas sus
  // letras en `noHayEstatal`; la carpeta no puede contradecirlo.
  const carpetas = [
    { clave: 'legal-federal', tit: 'Lo federal', desc: 'Qué arma puedes tener, qué papel llenas y cuánto cuesta: la Constitución, la ley reformada en 2025, el reglamento, los formatos y las cuotas.' },
    { clave: 'legal-estatal', tit: 'Por estado', desc: 'Dónde sacas la constancia de antecedentes penales, en qué armería compras y si puedes mandar la solicitud por correo.' },
    { clave: 'legal-tramites', tit: 'Trámites', desc: 'Seis trámites ante la Defensa: qué habilita cada uno, su checklist y su cuota vigente.' },
    { clave: 'legal-documentos', tit: 'Documentos', desc: 'Textos oficiales y PDF de consulta alojados en Armado en México.' },
  ];

  return (
    <div className="amx-leg">
      <window.CintaDymo nivel={1}>Legalidad</window.CintaDymo>
      <p className="amx-leg-eyebrow">{C.portada.eyebrow} · {C.portada.title}</p>
      <p className="amx-leg-intro">{C.portada.intro}</p>
      <window.AvisoTransparencia aviso={C.avisoTransparencia} />
      <p className="amx-leg-advertencia">{C.advertencia}</p>
      <p className="amx-leg-fecha">Actualizado el {window.amxLegalFecha(C.actualizado)}</p>

      {/* La entrevista va ARRIBA (hilo 1): es lo que resuelve la duda en tres minutos.
          El mapa queda debajo como contexto y se rediseña en un PR aparte: hoy no se
          lee en el teléfono. */}
      <section className="amx-leg-cta" aria-labelledby="leg-cta">
        <h2 id="leg-cta">¿Puedo comprar un arma?</h2>
        <p>
          Contesta unas preguntas sobre tu situación —ninguna pide un dato personal— y
          llévate el dictamen con los documentos que te corresponden.
        </p>
        <button type="button" className="amx-boton-tinta" onClick={() => onNav('entrevista')}>
          Empezar la entrevista
        </button>
      </section>

      {window.MapaTramite && <window.MapaTramite />}

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

      <window.ReportarError tipo="legalidad" titulo="Legalidad" ruta="/legalidad" />
    </div>
  );
}

function LegalidadDocumentos() {
  const C = window.AMX_LEGAL;
  const fuentes = Object.values(C.fuentes);
  const locales = fuentes.filter((f) => f.archivoLocal).concat(C.documentosComplementarios || []);
  const web = fuentes.filter((f) => f.url && !f.archivoLocal);
  const pendientes = fuentes.filter((f) => !f.url);

  function grupo(titulo, items) {
    return <section className="amx-leg-hoja" key={titulo}>
      <h2>{titulo}</h2>
      <ul className="amx-leg-documentos">
        {items.map((f) => <li key={f.archivoLocal || f.url || f.titulo}>
          <strong>{f.titulo}</strong>
          {f.emisor && <span>{f.emisor}</span>}
          {f.archivoLocal && <a href={'/' + f.archivoLocal} target="_blank" rel="noopener noreferrer">Abrir PDF en armado.mx</a>}
          {f.url && <a href={f.url} target="_blank" rel="noopener noreferrer">Fuente oficial</a>}
          {f.urlAlterna && <a href={f.urlAlterna} target="_blank" rel="noopener noreferrer">Texto oficial en DOF</a>}
          {!f.url && <span>Texto oficial pendiente de verificar</span>}
          {f.nota && <p>{f.nota}</p>}
        </li>)}
      </ul>
    </section>;
  }

  return <div className="amx-leg">
    <window.CintaDymo nivel={1}>Documentos legales</window.CintaDymo>
    <p className="amx-leg-intro">Consulta los textos oficiales que sustentan esta guía. Las copias PDF se alojan aquí para facilitar su lectura; el enlace a la autoridad permite comprobar la versión vigente.</p>
    {grupo('PDF disponibles en armado.mx', locales)}
    {grupo('Fuentes oficiales en páginas web o PDF externo', web)}
    {grupo('Textos pendientes de verificar', pendientes)}
    <window.ReportarError tipo="legalidad" titulo="Documentos legales" ruta="/legalidad/documentos" />
  </div>;
}
window.LegalidadDocumentos = LegalidadDocumentos;

/* ----------------------------------------------------------------__ */
/*  LegalidadFederal — por pregunta ciudadana (hilo 3)                */
/* ----------------------------------------------------------------__ */

// Un peldaño de la escalera. Va fuera de la pantalla a propósito: un componente
// definido dentro de otro remonta su subárbol en cada render (fidelidad-diseno).
// Los artículos van como resumen llano + cita (hilo 4); el literal se abre desde
// la cita. Una norma con `revisar` enseña su título y su fuente, que son hechos, y
// una línea neutra; ni su resumen ni su nota de vigencia, que son afirmaciones sin
// verificar, ni la nota interna del hueco (hilo 2).
function LegalidadPeldano({ n, norma, C }) {
  const arts = (norma.articulos || [])
    .map((id) => C.articulos.find((a) => a.id === id))
    .filter((a) => a && !a.revisar);
  return (
    <li className="amx-leg-peldano">
      <p className="amx-leg-peldano-num">{String(n).padStart(2, '0')} · {norma.rotulo}</p>
      <h3>{norma.titulo || norma.rotulo}</h3>
      {!norma.revisar && norma.resumen && <p className="amx-leg-habilita">{norma.resumen}</p>}
      {!norma.revisar && norma.notaVigencia && <p className="amx-leg-vigencia">{norma.notaVigencia}</p>}
      {norma.revisar && (
        <p className="amx-leg-vigencia">En verificación: su contenido se publica cuando se confirme contra la fuente oficial.</p>
      )}
      {norma.fuente && <window.CitaFuente fuente={window.amxLegalFuente(C, norma.fuente)} />}
      {arts.length > 0 && (
        <details className="amx-leg-arts">
          <summary>{(arts.length === 1 ? '1 artículo' : arts.length + ' artículos') + ' · resumen y cita'}</summary>
          <div>
            {arts.map((art) => (
              <div key={art.id}>
                <strong>{art.rotulo}</strong>
                {art.titulo && <p>{art.titulo}</p>}
                {art.resumen && <p>{art.resumen}</p>}
                <window.CitaFuente fuente={window.amxLegalFuente(C, art.fuente)} />
              </div>
            ))}
          </div>
        </details>
      )}
    </li>
  );
}

function LegalidadFederal({ onNav }) {
  const C = window.AMX_LEGAL;
  const grupos = window.amxNormasPorPregunta(C);
  let n = 0;

  return (
    <div className="amx-leg">
      <window.CintaDymo nivel={1}>Lo federal</window.CintaDymo>
      <p className="amx-leg-intro">
        Las armas de fuego en México son competencia exclusiva del Congreso de la Unión:
        ningún estado ni municipio puede crear permisos, licencias ni registros de armas
        de fuego. Las normas van ordenadas por la pregunta que traes; la jerarquía —de la
        Constitución al formato de ventanilla— se ve dentro de cada grupo.
      </p>
      {grupos.map((g) => (
        <section key={g.id} className="amx-leg-grupo" aria-labelledby={'leg-grupo-' + g.id}>
          <window.CintaDymo nivel={2} chica id={'leg-grupo-' + g.id}>{g.corto}</window.CintaDymo>
          <p className="amx-leg-pregunta">{g.pregunta}</p>
          <ol className="amx-leg-escalera">
            {g.normas.map((norma) => {
              n += 1;
              return <LegalidadPeldano key={norma.id} n={n} norma={norma} C={C} />;
            })}
          </ol>
        </section>
      ))}
      <window.ReportarError
        tipo="legalidad"
        titulo="Lo federal"
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
  const sinPortal = (e) => !!(e.antecedentes && e.antecedentes.revisar);

  return (
    <div className="amx-leg">
      <window.CintaDymo nivel={1}>Lo que cambia por estado</window.CintaDymo>
      <p className="amx-leg-advertencia">{C.noHayEstatal}</p>
      <label className="amx-leg-selector">
        <span>Elige tu estado</span>
        {/* Las entidades sin portal verificado se quedan en el selector, en gris y con
            su aviso (hilo 5): es transparencia, y cada URL que se verifique las saca de
            ahí sin tocar código. */}
        <select value={sel} onChange={(e) => setSel(e.target.value)}>
          <option value="">Selecciona…</option>
          {C.entidades.map((e) => (
            <option key={e.id} value={e.id} className={sinPortal(e) ? 'amx-leg-opcion--sin-portal' : undefined}>
              {e.nombre + (sinPortal(e) ? ' · portal sin verificar' : '')}
            </option>
          ))}
        </select>
      </label>
      {ent && (
        <dl className="amx-leg-estado">
          <dt>Constancia de antecedentes penales</dt>
          <dd>
            {ent.antecedentes.revisar ? (
              <span className="amx-leg-sin-portal">
                Portal sin verificar: todavía no hemos comprobado la dependencia ni el
                enlace de este estado.
              </span>
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
/*  LegalidadTramites — Requisitos y Permisos, fundidos (hilo 6)      */
/* ----------------------------------------------------------------__ */

function LegalidadRequisito({ r, C }) {
  return (
    <li>
      <span className="amx-leg-casilla" aria-hidden="true">☐</span>
      <span className="amx-leg-req-nombre">{r.nombre}</span>
      {window.amxRotuloEscenarios(C, r.escenarios) && (
        <span className="amx-leg-solo-si">{window.amxRotuloEscenarios(C, r.escenarios)}</span>
      )}
      {r.original && <span className="amx-leg-sello">ORIGINAL</span>}
      {r.copia && <span className="amx-leg-copia">{r.copia}</span>}
      {r.detalle && <p className="amx-leg-detalle">{r.detalle}</p>}
      {r.vigencia && <p className="amx-leg-vigencia">{r.vigencia}</p>}
      {r.variantes && r.variantes.some((v) => !v.revisar) && (
        <dl className="amx-leg-variantes">
          {r.variantes.filter((v) => !v.revisar).map((v, i) => (
            <div key={i}>
              <dt>{v.escenario}</dt>
              <dd>
                {v.documento}
                {/* Quién lo expide es la mitad útil del dato: sin esto, el ejidatario
                    sabe que necesita un certificado pero no que se lo da el Comisariado
                    Ejidal inscrito en el RAN. */}
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
  );
}

// Una tarjeta por trámite: qué es, qué habilita, cuánto cuesta y de qué año es la
// cuota (hilo 7), y su checklist plegada; la del primero viene abierta. Los seis van
// en el orden del corpus, que no es una cronología: la compra en la DCAM ya deja el
// arma registrada, y portación, colección y transporte son trámites aparte.
function LegalidadTramite({ t, C, abierto }) {
  // Un requisito o una variante en revisión es un hueco interno (hilo 2): no se pinta.
  const requisitos = window.amxRequisitosDe(C, t.id, {}).filter((r) => !r.revisar);
  const vigencia = window.amxVigenciaCuota(t.costo);
  return (
    <article className="amx-leg-ficha">
      <p className="amx-leg-paso">
        <span className="amx-leg-homoclave">{t.homoclave || 'Compra en la DCAM'}</span>
      </p>
      <h2>{t.nombre}</h2>
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
            <dd className="amx-leg-no-habilita">{t.noHabilita}</dd>
          </>
        )}
      </dl>
      {t.costo && (
        <p className="amx-leg-costo">
          <span className="amx-leg-importe">{window.amxImporte(t.costo.monto) + ' ' + t.costo.moneda}</span>
          {t.costo.concepto && <span className="amx-leg-concepto">{t.costo.concepto}</span>}
          {vigencia && <span className="amx-leg-vigencia-cuota">{vigencia}</span>}
        </p>
      )}
      {requisitos.length > 0 && (
        <details className="amx-leg-plegable" open={abierto}>
          <summary>{requisitos.length + ' requisitos · checklist'}</summary>
          <ol className="amx-leg-checklist">
            {requisitos.map((r) => <LegalidadRequisito key={r.id} r={r} C={C} />)}
          </ol>
        </details>
      )}
      {!t.revisar && t.fuente && (
        <window.CitaFuente fuente={window.amxLegalFuente(C, t.fuente)} />
      )}
    </article>
  );
}

function LegalidadTramites({ onNav }) {
  const C = window.AMX_LEGAL;
  const tramites = C.tramites;

  return (
    <div className="amx-leg">
      <window.CintaDymo nivel={1}>Trámites</window.CintaDymo>
      <p className="amx-leg-intro">
        Seis trámites ante la Secretaría de la Defensa Nacional: el permiso extraordinario
        de adquisición, la compra en la DCAM y el registro del arma; y aparte la licencia
        de portación, el permiso de colección y el de transporte. Cada uno con lo que
        habilita, su checklist de requisitos y su cuota vigente. El permiso y la compra
        son dos trámites distintos: creer que son el mismo papeleo es lo que hace que
        alguien llegue al mostrador sin expediente.
      </p>
      <p className="amx-leg-advertencia">{C.advertencia}</p>
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
      {tramites.map((t, i) => (
        <LegalidadTramite key={t.id} t={t} C={C} abierto={i === 0} />
      ))}
      <window.ReportarError tipo="legalidad" titulo="Trámites" ruta="/legalidad/tramites" />
    </div>
  );
}

/* ----------------------------------------------------------------__ */
/*  Module-level exports                                             */
/* ----------------------------------------------------------------__ */

window.LegalidadHub = LegalidadHub;
window.LegalidadFederal = LegalidadFederal;
window.LegalidadEstatal = LegalidadEstatal;
window.LegalidadTramites = LegalidadTramites;
