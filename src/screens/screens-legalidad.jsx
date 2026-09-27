// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Legalidad v2 (22-sep-2026): las ocho decisiones de Saulo, tomadas en los hilos
// de Penpot, están en docs/superpowers/specs/2026-09-22-legalidad-v2-design.md.
// Y una novena, del mismo día: TODO EN UNA SOLA PÁGINA, con desplegables. Las
// secciones viven dentro del hub como folders del cajón (el mismo de la FAQ); las
// rutas /legalidad/federal, /estatal, /tramites y /documentos siguen existiendo
// —están indexadas y enlazadas— y abren el hub en su sitio.
//
// Lenguaje llano (26-sep-2026, aprobado por Saulo): la página RESPONDE las preguntas
// en vez de enseñar fichas de normas, y las fuentes van al pie, numeradas como en
// Wikipedia. El texto vive en `AMX_LEGAL.explicado`; cada {{id}} es una nota [n].

/* ----------------------------------------------------------------__ */
/*  Notas al pie                                                      */
/* ----------------------------------------------------------------__ */

// La nota [n] lleva a su entrada en Fuentes. El salto se hace a mano: el enrutador
// escucha popstate y un enlace #fuente-n lo dispara. El href queda para quien abre
// el enlace en otra pestaña.
function LegalidadNota({ id, refs }) {
  const n = refs.indexOf(id) + 1;
  if (!n) return null;
  const ir = (e) => {
    const destino = document.getElementById('fuente-' + n);
    if (!destino) return;
    e.preventDefault();
    destino.scrollIntoView({ block: 'center' });
    destino.focus({ preventScroll: true });
  };
  return (
    <sup className="amx-leg-nota">
      <a href={'#fuente-' + n} onClick={ir} aria-label={'Fuente ' + n}>[{n}]</a>
    </sup>
  );
}

function LegalidadCitado({ texto, refs }) {
  return window.amxPartirCitas(texto).map((x, i) => (x.fuente
    ? <LegalidadNota key={i} id={x.fuente} refs={refs} />
    : <React.Fragment key={i}>{x.texto}</React.Fragment>));
}

/* ----------------------------------------------------------------__ */
/*  Lo que permite la ley — cada pregunta, respondida                 */
/* ----------------------------------------------------------------__ */

function LegalidadLeyCuerpo({ C, refs }) {
  return (
    <div className="amx-leg-cuerpo">
      {C.explicado.ley.map((p) => (
        <details key={p.id} className="amx-leg-plegable" id={'leg-ley-' + p.id}>
          <summary><span className="amx-leg-plegable-sola">{p.pregunta}</span></summary>
          <p className="amx-leg-respuesta"><LegalidadCitado texto={p.texto} refs={refs} /></p>
        </details>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------__ */
/*  Lo que cambia por estado                                          */
/* ----------------------------------------------------------------__ */

function LegalidadEstatalCuerpo({ C, refs }) {
  const [sel, setSel] = React.useState('');
  const ent = C.entidades.find((e) => e.id === sel);
  const sinPortal = (e) => !!(e.antecedentes && e.antecedentes.revisar);

  return (
    <div className="amx-leg-cuerpo">
      <p className="amx-leg-intro"><LegalidadCitado texto={C.explicado.estado} refs={refs} /></p>
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
            <LegalidadNota id={ent.ventanillaFuente} refs={refs} />
          </dd>
          <dt>Envío por correo certificado</dt>
          <dd>
            {ent.envioPorCorreo ? 'Sí se puede' : 'No se puede desde aquí'}
            , {ent.envioFundamento}
            <LegalidadNota id={ent.envioFuente} refs={refs} />
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
    </div>
  );
}

/* ----------------------------------------------------------------__ */
/*  Trámites — Requisitos y Permisos, fundidos (hilo 6)               */
/* ----------------------------------------------------------------__ */

function LegalidadRequisito({ r, C, refs }) {
  return (
    <li>
      <span className="amx-leg-casilla" aria-hidden="true">☐</span>
      <span className="amx-leg-req-nombre">{r.nombre}<LegalidadNota id={r.fuente} refs={refs} /></span>
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
    </li>
  );
}

// Un trámite plegado: en el rótulo, su nombre llano y su cuota; la clave oficial va
// en chico. Dentro, el nombre oficial (el que se pide en ventanilla), qué habilita,
// cuánto cuesta y de qué año es la cuota (hilo 7) y su checklist. Los seis van en el
// orden del corpus, que no es una cronología: la compra en la DCAM ya deja el arma
// registrada, y portación, colección y transporte son trámites aparte.
function LegalidadTramite({ t, C, refs, abierto }) {
  // Un requisito o una variante en revisión es un hueco interno (hilo 2): no se pinta.
  const requisitos = window.amxRequisitosDe(C, t.id, {}).filter((r) => !r.revisar);
  const vigencia = window.amxVigenciaCuota(t.costo);
  return (
    <details className="amx-leg-plegable amx-leg-tramite" open={abierto} id={'leg-tramite-' + t.id}>
      <summary>
        <span className="amx-leg-plegable-corto">{t.homoclave || 'DCAM'}</span>
        <span className="amx-leg-plegable-pregunta">
          {(t.llano || t.nombre) + (t.costo ? ' · ' + window.amxImporte(t.costo.monto) : '')}
        </span>
      </summary>
      <article className="amx-leg-ficha">
        <p className="amx-leg-oficial">Nombre oficial: {t.nombre}</p>
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
              <dd>{t.habilita}{!t.revisar && <LegalidadNota id={t.fuente} refs={refs} />}</dd>
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
              {requisitos.map((r) => <LegalidadRequisito key={r.id} r={r} C={C} refs={refs} />)}
            </ol>
          </section>
        )}
      </article>
    </details>
  );
}

function LegalidadTramitesCuerpo({ C, refs }) {
  return (
    <div className="amx-leg-cuerpo">
      <p className="amx-leg-intro"><LegalidadCitado texto={C.explicado.tramites} refs={refs} /></p>
      {C.tramites.map((t) => <LegalidadTramite key={t.id} t={t} C={C} refs={refs} abierto={false} />)}
    </div>
  );
}

/* ----------------------------------------------------------------__ */
/*  Fuentes — al pie, numeradas                                       */
/* ----------------------------------------------------------------__ */

function LegalidadEnlacesFuente({ f }) {
  const a = (href, texto) => (
    <> <a href={href} target="_blank" rel="noopener noreferrer"
      aria-label={texto + ': ' + f.titulo + ' (se abre en una pestaña nueva)'}>{texto}</a></>
  );
  return (
    <>
      {f.archivoLocal && a('/' + f.archivoLocal, 'PDF en armado.mx')}
      {f.url && a(f.url, 'Fuente oficial')}
      {f.urlAlterna && a(f.urlAlterna, 'Texto en el DOF')}
    </>
  );
}

// Lo que antes era la carpeta «Fundamento legal»: las fuentes citadas, en el orden de
// sus notas, y debajo, plegado, el resto de documentos de consulta. Lo que no tiene
// enlace verificado no se publica (hilo 2).
function LegalidadFuentes({ C, refs, pieRef }) {
  const citadas = refs.map((id) => C.fuentes[id]);
  const otras = Object.keys(C.fuentes)
    .filter((id) => refs.indexOf(id) < 0 && C.fuentes[id].url)
    .map((id) => C.fuentes[id])
    .concat(C.documentosComplementarios || []);
  const fecha = (f) => (f.fechaConsulta ? window.amxLegalFecha(f.fechaConsulta) : '');
  return (
    <section className="amx-leg-fuentes" id="leg-documentos" aria-labelledby="leg-fuentes" ref={pieRef}>
      <h2 id="leg-fuentes">Fuentes</h2>
      <ol>
        {citadas.map((f, i) => (
          <li key={i} id={'fuente-' + (i + 1)} tabIndex={-1}>
            {f.titulo}{f.emisor && <span className="amx-leg-emisor"> · {f.emisor}</span>}
            <LegalidadEnlacesFuente f={f} />
            {fecha(f) && <span className="amx-leg-emisor"> · Consultado el {fecha(f)}</span>}
          </li>
        ))}
      </ol>
      {otras.length > 0 && (
        <details className="amx-leg-plegable amx-leg-mas-fuentes">
          <summary><span className="amx-leg-plegable-sola">{'Más documentos de consulta · ' + otras.length}</span></summary>
          <ul>
            {otras.map((f) => (
              <li key={f.archivoLocal || f.url || f.titulo}>
                {f.titulo}{f.emisor && <span className="amx-leg-emisor"> · {f.emisor}</span>}
                <LegalidadEnlacesFuente f={f} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

/* ----------------------------------------------------------------__ */
/*  LegalidadHub — la única página                                    */
/* ----------------------------------------------------------------__ */

// Las tres secciones del cajón. El `id` es el de la ruta (/legalidad/<id>) y el de la
// pantalla del router ('legal-<id>'): una ruta profunda abre el hub con ese folder
// desplegado. La cuarta ruta, /legalidad/documentos, lleva a las Fuentes del pie.
// Pestaña y título en lenguaje llano (26-sep-2026): el título es la pregunta que
// resuelve el folder (hilo 11) y la pestaña dice de qué trata, sin jerga legal. Las
// descripciones no pueden contradecir al corpus: no hay normativa estatal de armas
// (`noHayEstatal`), lo que cambia por estado es dónde se hacen algunos papeles.
const LEGALIDAD_SECCIONES = [
  { id: 'federal', tema: 'Lo que permite la ley', titulo: '¿Qué arma puedo tener y puedo sacarla de casa?', desc: 'Qué armas están permitidas, dónde pueden estar y cuándo es delito.', Cuerpo: LegalidadLeyCuerpo },
  { id: 'estatal', tema: 'En tu estado', titulo: '¿Qué cambia según el estado donde vivo?', desc: 'Dónde sacas tu constancia de antecedentes y a qué tienda te toca ir.', Cuerpo: LegalidadEstatalCuerpo },
  { id: 'tramites', tema: 'Trámites y costos', titulo: '¿Qué trámites hago y cuánto cuestan?', desc: 'Los seis trámites ante la Defensa, con su lista de documentos.', Cuerpo: LegalidadTramitesCuerpo },
];

function LegalidadHub({ onNav, seccion }) {
  const C = window.AMX_LEGAL;
  const refs = window.amxReferencias(C);
  const abiertoRef = React.useRef(null);

  // Una ruta profunda (/legalidad/tramites) aterriza con su folder abierto, a la vista y
  // con el foco. App pone el scroll a 0 en su propio efecto, que corre DESPUÉS de este
  // (React ejecuta los efectos de hijo a padre), así que el desplazamiento se difiere un
  // frame para caer detrás; `seccion` no cambia mientras el hub está montado.
  React.useEffect(() => {
    if (!seccion || !abiertoRef.current) return undefined;
    const folder = abiertoRef.current;
    if ('open' in folder) folder.open = true;
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

      {/* EL CAJÓN: las tres secciones como folders apilados, plegados. Nada manda a
          otra página (decisión de Saulo, 22-sep-2026). */}
      <div className="amx-faq-cajon amx-leg-cajon">
        {LEGALIDAD_SECCIONES.map((s) => (
          <details
            key={s.id}
            id={'leg-' + s.id}
            className="amx-faq-folder amx-leg-folder"
            /* Los folders nacen ABIERTOS (decisión de Saulo, 22-sep-2026): esto es
               material de consulta, y un cajón cerrado esconde de qué trata la página. Lo
               que nace plegado son los documentos de dentro —cada `<details>` del cuerpo—,
               que es donde de verdad hay texto largo. */
            open
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
                <s.Cuerpo C={C} refs={refs} />
              </div>
            </div>
          </details>
        ))}
      </div>

      <LegalidadFuentes C={C} refs={refs} pieRef={seccion === 'documentos' ? abiertoRef : undefined} />

      {/* La fecha cierra la hoja, no la abre (hilo 10 de Penpot, 22-sep-2026): arriba
          repetía la cinta que ya dice LEGALIDAD y empujaba la entrada real de la página. */}
      <p className="amx-leg-fecha">Actualizado el {window.amxLegalFecha(C.actualizado)}</p>

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
