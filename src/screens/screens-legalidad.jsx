// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Legalidad v2 (22-sep-2026): las ocho decisiones de Saulo, tomadas en los hilos
// de Penpot, están en docs/superpowers/specs/2026-09-22-legalidad-v2-design.md
// (llega con el PR #278, rama fable/penpot). Y una novena, del mismo día, al ver
// la primera versión: TODO EN UNA SOLA PÁGINA, con desplegables, en vez de mandar
// a la persona a otra pantalla. Las cuatro secciones viven dentro del hub como
// folders del cajón (el mismo de la FAQ); las rutas /legalidad/federal, /estatal,
// /tramites y /documentos siguen existiendo —están indexadas y enlazadas— y lo que
// hacen es abrir el hub con ese folder desplegado.
//
// En corto: la entrevista arriba; los huecos del corpus NO se publican (son de
// desarrollo: `amxLegalHuecos` los sigue contando para check-legal.mjs); lo
// federal se ordena por pregunta ciudadana; Requisitos y Permisos se funden en
// Trámites; y la vigencia de cada cuota va junto al importe.

/* ----------------------------------------------------------------__ */
/*  Lo federal — por pregunta ciudadana (hilo 3)                      */
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

// Tres preguntas, cada una plegada: abrir una enseña sus normas numeradas.
function LegalidadFederalCuerpo({ C }) {
  const grupos = window.amxNormasPorPregunta(C);
  let n = 0;
  return (
    <div className="amx-leg-cuerpo">
      <p className="amx-leg-intro">
        Las armas de fuego son competencia exclusiva del Congreso de la Unión: ningún
        estado ni municipio puede crear permisos, licencias ni registros. Las normas van
        por la pregunta que traes; la jerarquía —de la Constitución al formato de
        ventanilla— se ve dentro de cada una.
      </p>
      {grupos.map((g) => {
        const desde = n;
        n += g.normas.length;
        return (
          <details key={g.id} className="amx-leg-plegable" id={'leg-grupo-' + g.id}>
            <summary>
              <span className="amx-leg-plegable-corto">{g.corto}</span>
              <span className="amx-leg-plegable-pregunta">{g.pregunta}</span>
            </summary>
            <ol className="amx-leg-escalera">
              {g.normas.map((norma, i) => <LegalidadPeldano key={norma.id} n={desde + i + 1} norma={norma} C={C} />)}
            </ol>
          </details>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------__ */
/*  Lo que cambia por estado                                          */
/* ----------------------------------------------------------------__ */

function LegalidadEstatalCuerpo({ C }) {
  const [sel, setSel] = React.useState('');
  const ent = C.entidades.find((e) => e.id === sel);
  const sinPortal = (e) => !!(e.antecedentes && e.antecedentes.revisar);

  return (
    <div className="amx-leg-cuerpo">
      <p className="amx-leg-intro">
        No hay ley estatal de armas. Lo que sí cambia por estado es dónde sacas la
        constancia de antecedentes penales, en qué armería compras y si puedes mandar la
        solicitud por correo certificado.
      </p>
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
            {ent.traumaticas && !ent.traumaticas.revisar
              ? `${ent.traumaticas.texto} — ${ent.traumaticas.fundamento}`
              : 'No hemos verificado la regla local de este estado.'}
          </dd>
        </dl>
      )}
      <details className="amx-leg-plegable">
        <summary><span className="amx-leg-plegable-corto">Por qué no hay ley estatal</span></summary>
        <p className="amx-leg-advertencia">{C.noHayEstatal}</p>
      </details>
    </div>
  );
}

/* ----------------------------------------------------------------__ */
/*  Trámites — Requisitos y Permisos, fundidos (hilo 6)               */
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

// Un trámite plegado: en el rótulo, homoclave y nombre; dentro, qué habilita, cuánto
// cuesta y de qué año es la cuota (hilo 7) y su checklist. Los seis van en el orden
// del corpus, que no es una cronología: la compra en la DCAM ya deja el arma
// registrada, y portación, colección y transporte son trámites aparte.
function LegalidadTramite({ t, C, abierto }) {
  // Un requisito o una variante en revisión es un hueco interno (hilo 2): no se pinta.
  const requisitos = window.amxRequisitosDe(C, t.id, {}).filter((r) => !r.revisar);
  const vigencia = window.amxVigenciaCuota(t.costo);
  return (
    <details className="amx-leg-plegable amx-leg-tramite" open={abierto} id={'leg-tramite-' + t.id}>
      <summary>
        <span className="amx-leg-plegable-corto">{t.homoclave || 'Compra en la DCAM'}</span>
        <span className="amx-leg-plegable-pregunta">{t.nombre}</span>
      </summary>
      <article className="amx-leg-ficha">
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
          <section className="amx-leg-checklist-seccion" aria-label={'Checklist de ' + t.nombre}>
            <p className="amx-leg-checklist-rotulo">{requisitos.length + ' requisitos · checklist'}</p>
            <ol className="amx-leg-checklist">
              {requisitos.map((r) => <LegalidadRequisito key={r.id} r={r} C={C} />)}
            </ol>
          </section>
        )}
        {!t.revisar && t.fuente && (
          <window.CitaFuente fuente={window.amxLegalFuente(C, t.fuente)} />
        )}
      </article>
    </details>
  );
}

function LegalidadTramitesCuerpo({ C }) {
  const tramites = C.tramites;
  return (
    <div className="amx-leg-cuerpo">
      <p className="amx-leg-intro">
        Seis trámites ante la Secretaría de la Defensa Nacional: el permiso extraordinario
        de adquisición, la compra en la DCAM y el registro del arma; y aparte la licencia
        de portación, el permiso de colección y el de transporte. El permiso y la compra
        son dos trámites distintos: creer que son el mismo papeleo es lo que hace que
        alguien llegue al mostrador sin expediente.
      </p>
      <p className="amx-leg-advertencia">{C.advertencia}</p>
      <section className="amx-leg-contraste">
        <h3>Posesión no es portación</h3>
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
      {tramites.map((t) => <LegalidadTramite key={t.id} t={t} C={C} abierto={false} />)}
    </div>
  );
}

/* ----------------------------------------------------------------__ */
/*  Documentos legales                                                */
/* ----------------------------------------------------------------__ */

function LegalidadDocumentosCuerpo({ C }) {
  const fuentes = Object.values(C.fuentes);
  const locales = fuentes.filter((f) => f.archivoLocal).concat(C.documentosComplementarios || []);
  const web = fuentes.filter((f) => f.url && !f.archivoLocal);
  const pendientes = fuentes.filter((f) => !f.url);

  function grupo(titulo, items) {
    if (!items.length) return null;
    return <details className="amx-leg-plegable" key={titulo}>
      <summary><span className="amx-leg-plegable-corto">{titulo + ' · ' + items.length}</span></summary>
      <ul className="amx-leg-documentos">
        {items.map((f) => <li key={f.archivoLocal || f.url || f.titulo}>
          <strong>{f.titulo}</strong>
          {f.emisor && <span>{f.emisor}</span>}
          {f.archivoLocal && <a href={'/' + f.archivoLocal} target="_blank" rel="noopener noreferrer">Abrir PDF en armado.mx</a>}
          {f.url && <a href={f.url} target="_blank" rel="noopener noreferrer">Fuente oficial</a>}
          {f.urlAlterna && <a href={f.urlAlterna} target="_blank" rel="noopener noreferrer">Texto oficial en DOF</a>}
          {!f.url && <span>Texto oficial pendiente de verificar</span>}
          {f.nota && !f.revisar && <p>{f.nota}</p>}
        </li>)}
      </ul>
    </details>;
  }

  return <div className="amx-leg-cuerpo">
    <p className="amx-leg-intro">Los textos oficiales que sustentan esta guía. Las copias PDF se alojan aquí para facilitar su lectura; el enlace a la autoridad permite comprobar la versión vigente.</p>
    {grupo('PDF en armado.mx', locales)}
    {grupo('Fuentes oficiales en la web', web)}
    {grupo('Pendientes de verificar', pendientes)}
  </div>;
}

/* ----------------------------------------------------------------__ */
/*  LegalidadHub — la única página                                    */
/* ----------------------------------------------------------------__ */

// Las cuatro secciones del cajón. El `id` es el de la ruta (/legalidad/<id>) y el de
// la pantalla del router ('legal-<id>'): una ruta profunda abre el hub con ese folder
// desplegado. Las descripciones no pueden contradecir al corpus: no hay normativa
// estatal de armas (`noHayEstatal`), lo que cambia por estado es dónde se hacen
// algunos papeles.
const LEGALIDAD_SECCIONES = [
  { id: 'federal', tema: 'Federal', titulo: 'Lo federal', desc: 'Qué arma puedes tener, qué papel llenas y cuánto cuesta.', Cuerpo: LegalidadFederalCuerpo },
  { id: 'estatal', tema: 'Por estado', titulo: 'Lo que cambia por estado', desc: 'Antecedentes penales, armería y correo, estado por estado.', Cuerpo: LegalidadEstatalCuerpo },
  { id: 'tramites', tema: 'Trámites', titulo: 'Los trámites, con su checklist', desc: 'Seis trámites ante la Defensa: qué habilita cada uno y cuánto cuesta.', Cuerpo: LegalidadTramitesCuerpo },
  { id: 'documentos', tema: 'Documentos', titulo: 'Documentos oficiales', desc: 'Leyes, reglamento y formatos en PDF, con su fuente.', Cuerpo: LegalidadDocumentosCuerpo },
];

function LegalidadHub({ onNav, seccion }) {
  const C = window.AMX_LEGAL;
  const abiertoRef = React.useRef(null);

  // Una ruta profunda (/legalidad/tramites) aterriza con su folder abierto, a la vista y
  // con el foco. App pone el scroll a 0 en su propio efecto, que corre DESPUÉS de este
  // (React ejecuta los efectos de hijo a padre), así que el desplazamiento se difiere un
  // frame para caer detrás; `seccion` no cambia mientras el hub está montado.
  React.useEffect(() => {
    if (!seccion || !abiertoRef.current) return undefined;
    const folder = abiertoRef.current;
    folder.open = true;
    const suave = !window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const id = requestAnimationFrame(() => {
      folder.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'start' });
      folder.tabIndex = -1;
      folder.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [seccion]);

  return (
    <div className="amx-leg">
      <window.CintaDymo nivel={1}>Legalidad</window.CintaDymo>
      <p className="amx-leg-eyebrow">{C.portada.eyebrow} · actualizado el {window.amxLegalFecha(C.actualizado)}</p>
      <p className="amx-leg-intro">{C.portada.intro}</p>
      <p className="amx-leg-advertencia">{C.advertencia}</p>
      <window.AvisoTransparencia aviso={C.avisoTransparencia} />

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

      {/* EL CAJÓN: las cuatro secciones como folders apilados, plegados. Nada manda a
          otra página (decisión de Saulo, 22-sep-2026). */}
      <div className="amx-faq-cajon amx-leg-cajon">
        {LEGALIDAD_SECCIONES.map((s) => (
          <details
            key={s.id}
            id={'leg-' + s.id}
            className="amx-faq-folder amx-leg-folder"
            open={seccion === s.id}
            ref={seccion === s.id ? abiertoRef : undefined}
          >
            <summary>
              <span className="amx-faq-tema" aria-hidden="true">{s.tema}</span>
              <span className="amx-faq-cab">
                <span className="amx-faq-q">{s.titulo}</span>
                <span className="amx-leg-folder-desc">{s.desc}</span>
              </span>
            </summary>
            <div className="amx-oficio">
              <div className="amx-oficio-membrete" aria-hidden="true">
                <span>Armado en México</span><span>{s.tema}</span>
              </div>
              <div className="amx-oficio-texto">
                <s.Cuerpo C={C} />
              </div>
            </div>
          </details>
        ))}
      </div>

      <window.ReportarError tipo="legalidad" titulo="Legalidad" ruta="/legalidad" />
    </div>
  );
}

// Las rutas profundas siguen existiendo (están indexadas y enlazadas): abren el hub
// con su folder desplegado. Son la misma página.
function LegalidadFederal({ onNav }) { return <LegalidadHub onNav={onNav} seccion="federal" />; }
function LegalidadEstatal({ onNav }) { return <LegalidadHub onNav={onNav} seccion="estatal" />; }
function LegalidadTramites({ onNav }) { return <LegalidadHub onNav={onNav} seccion="tramites" />; }
function LegalidadDocumentos({ onNav }) { return <LegalidadHub onNav={onNav} seccion="documentos" />; }

/* ----------------------------------------------------------------__ */
/*  Module-level exports                                             */
/* ----------------------------------------------------------------__ */

window.LegalidadHub = LegalidadHub;
window.LegalidadFederal = LegalidadFederal;
window.LegalidadEstatal = LegalidadEstatal;
window.LegalidadTramites = LegalidadTramites;
window.LegalidadDocumentos = LegalidadDocumentos;
