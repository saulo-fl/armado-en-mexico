// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

/* ----------------------------------------------------------------__ */
/*  LegalidadHub                                                      */
/* ----------------------------------------------------------------__ */

function LegalidadHub({ onNav }) {
  const C = window.AMX_LEGAL;

  const carpetas = [
    { clave: 'legal-federal', tit: 'Federal', desc: 'Trámites y permisos de la administración pública federal.' },
    { clave: 'legal-estatal', tit: 'Estatal', desc: 'Normativa estatal aplicable a la posesión y uso de armas.' },
    { clave: 'legal-requisitos', tit: 'Requisitos', desc: 'Documentos y requisitos para cada trámite.' },
    { clave: 'legal-permisos', tit: 'Permisos', desc: 'Tipos de permisos vigentes y su alcance.' },
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
/*  Module-level exports                                             */
/* ----------------------------------------------------------------__ */

window.LegalidadHub = LegalidadHub;
window.LegalidadRequisitos = LegalidadRequisitos;
