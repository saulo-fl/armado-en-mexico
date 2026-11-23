// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// ══════════════════════════════════════════════════════════════
// REPORTE WEB — corrección o fallo SIN cuenta de GitHub
// Pinta el Issue Form de .github/ISSUE_TEMPLATE/<formato>.yml a partir de
// window.AMX_FORMATOS_ISSUE (src/lib/formatos-issue.js, GENERADO: npm run formatos),
// más la firma, la casilla de metadata y el captcha. Lo recibe
// POST /api/append/issues (functions/api/_issues.js), que lo publica solo en GitHub.
// Lo usan ReportarError (ui.jsx, al final de las fichas) y Soporte (fallos del sitio).
// ══════════════════════════════════════════════════════════════
const { useState: useStateRep, useEffect: useEffectRep, useRef: useRefRep, useId: useIdRep } = React;

// Mensajes para cada error del servidor. `campo` dice dónde pintarlo cuando no viene en la respuesta.
const REPORTE_MENSAJES = {
  falta_campo: 'Este dato es obligatorio.',
  opcion_invalida: 'Elige una de las opciones.',
  campo_demasiado_largo: 'Es demasiado largo; resúmelo un poco.',
  campo_invalido: 'Revisa este dato.',
  pagina_invalida: 'Pon la dirección de una página de armado.mx.',
  firma_invalida: 'Firma con un nombre o apodo de 2 a 40 caracteres, sin enlaces.',
  github_invalido: 'Ese no parece un usuario de GitHub. Déjalo vacío si no tienes.',
  email_invalido: 'Revisa el correo, o déjalo vacío.',
  captcha_invalido: 'La verificación anti-bots no pasó. Complétala de nuevo y reintenta.',
  cola_llena: 'Ahora mismo hay demasiados reportes en espera. Inténtalo más tarde.',
  http_429: 'Demasiados envíos seguidos. Espera unos segundos y reintenta.',
  payload_demasiado_grande: 'El reporte es demasiado largo.',
};
const REPORTE_CAMPO_DE_ERROR = { firma_invalida: 'firma', github_invalido: 'github', email_invalido: 'email' };
const REPORTE_FALLO_GENERAL = 'No pudimos enviar el reporte ahora. Lo que escribiste sigue aquí para que reintentes.';

function reporteValoresIniciales(formato, inicial) {
  const campos = {};
  for (const c of formato.body) {
    if (c.type === 'markdown') continue;
    campos[c.id] = c.type === 'checkboxes'
      ? c.attributes.options.map(() => false)
      : String((inicial && inicial[c.id]) || '');
  }
  return campos;
}

const reporteRequerido = (c) => c.type === 'checkboxes'
  ? c.attributes.options.some((o) => o.required === true)
  : !!(c.validations && c.validations.required === true);

// Lo mínimo antes de gastar el captcha. El servidor vuelve a validarlo todo.
function reporteValidarLocal(formato, campos, firma) {
  for (const c of formato.body) {
    if (c.type === 'markdown') continue;
    const v = campos[c.id];
    if (c.type === 'checkboxes') {
      if (c.attributes.options.some((o, i) => o.required === true && !v[i])) return { campo: c.id, error: 'falta_campo' };
    } else if (reporteRequerido(c) && !String(v).trim()) {
      return { campo: c.id, error: 'falta_campo' };
    }
  }
  const f = firma.trim();
  if (f.length < 2 || f.length > 40) return { campo: 'firma', error: 'firma_invalida' };
  return null;
}

function CampoReporte({ campo, id, valor, onCambio, error, registrar }) {
  const a = campo.attributes;
  const req = reporteRequerido(campo);
  const ayudaId = id + '-ayuda';
  const errId = id + '-err';
  const describe = [a.description ? ayudaId : null, error ? errId : null].filter(Boolean).join(' ') || undefined;
  const pie = (
    <>
      {a.description && <p className="amx-renglon-ayuda" id={ayudaId}>{a.description}</p>}
      {error && <p className="amx-reporte-err" id={errId}>{error}</p>}
    </>
  );

  if (campo.type === 'checkboxes') {
    return (
      <fieldset className="amx-reporte-casillas" aria-describedby={describe}>
        <legend className="amx-renglon-etq">{a.label}{req && <span className="amx-soporte-req"> *</span>}</legend>
        {a.options.map((o, i) => (
          <label key={i} className="amx-reporte-casilla">
            <input type="checkbox" checked={!!valor[i]} ref={i === 0 ? registrar : undefined}
              onChange={(e) => onCambio(valor.map((x, j) => (j === i ? e.target.checked : x)))} />
            <span>{o.label}</span>
          </label>
        ))}
        {pie}
      </fieldset>
    );
  }

  const comunes = {
    id, ref: registrar, className: 'amx-renglon', value: valor,
    onChange: (e) => onCambio(e.target.value),
    'aria-invalid': error ? 'true' : undefined, 'aria-describedby': describe,
    'aria-required': req ? 'true' : undefined,
  };
  let control;
  if (campo.type === 'dropdown') {
    control = (
      <select {...comunes}>
        <option value="">Elige una opción</option>
        {a.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  } else if (campo.type === 'textarea') {
    control = <textarea {...comunes} rows={4} maxLength={4000} placeholder={a.placeholder || undefined} />;
  } else {
    control = <input {...comunes} type={campo.id === 'pagina' || campo.id === 'captura' ? 'url' : 'text'}
      maxLength={300} placeholder={a.placeholder || undefined} />;
  }
  return (
    <div className="amx-reporte-campo">
      <label className="amx-renglon-etq" htmlFor={id}>{a.label}{req && <span className="amx-soporte-req"> *</span>}</label>
      {control}
      {pie}
    </div>
  );
}

function FormularioReporteCuerpo({ formatoId, formato, inicial, enlaceGitHub }) {
  const base = useIdRep();
  const [campos, setCampos] = useStateRep(() => reporteValoresIniciales(formato, inicial));
  const [firma, setFirma] = useStateRep('');
  const [github, setGithub] = useStateRep('');
  const [email, setEmail] = useStateRep('');
  const [conMeta, setConMeta] = useStateRep(false);
  const [token, setToken] = useStateRep('');
  const [captcha, setCaptcha] = useStateRep('cargando'); // cargando | listo | falla
  const [errores, setErrores] = useStateRep({});
  const [estado, setEstado] = useStateRep({ kind: 'idle' });
  const widgetRef = useRefRep(null);
  const controlRef = useRefRep(null);
  const camposRef = useRefRep({});

  useEffectRep(() => {
    let vivo = true;
    if (!window.amxTurnstile || !widgetRef.current) { setCaptcha('falla'); return undefined; }
    window.amxTurnstile.montar(widgetRef.current, {
      onToken: (t) => { if (vivo) setToken(t); },
      onCaduca: () => { if (vivo) setToken(''); },
    }).then((c) => {
      if (!vivo) { c.quitar(); return; }
      controlRef.current = c;
      setCaptcha('listo');
    }).catch(() => { if (vivo) setCaptcha('falla'); });
    return () => { vivo = false; if (controlRef.current) controlRef.current.quitar(); };
  }, []);

  const idDe = (campo) => `${base}-${campo}`;
  const registrar = (campo) => (el) => { camposRef.current[campo] = el; };
  const enfocar = (campo) => requestAnimationFrame(() => {
    const el = camposRef.current[campo];
    if (el && el.focus) el.focus();
  });
  const marcar = (campo, error) => {
    setErrores({ [campo]: REPORTE_MENSAJES[error] || REPORTE_MENSAJES.campo_invalido });
    enfocar(campo);
  };
  const cambiar = (campo, v) => {
    setCampos((p) => Object.assign({}, p, { [campo]: v }));
    if (errores[campo]) setErrores({});
  };

  const enviar = async (e) => {
    e.preventDefault();
    if (estado.kind === 'enviando') return;
    const local = reporteValidarLocal(formato, campos, firma);
    if (local) { marcar(local.campo, local.error); setEstado({ kind: 'idle' }); return; }
    if (!token) {
      setEstado({ kind: 'error', mensaje: captcha === 'falla'
        ? 'No se pudo cargar la verificación anti-bots. Revisa tu conexión y recarga la página.'
        : 'Completa la verificación anti-bots de arriba antes de enviar.' });
      return;
    }
    setErrores({});
    setEstado({ kind: 'enviando' });
    const item = {
      formato: formatoId, campos, firma: firma.trim(), github: github.trim(), email: email.trim(),
      adjuntarMetadata: conMeta,
      metadata: conMeta && window.amxMetadataDispositivo ? window.amxMetadataDispositivo() : undefined,
      turnstile: token,
    };
    const r = await window.amxEnviarReporte(window.AMX_REPORTE_URL, item);
    // El token es de un solo uso: pase lo que pase, se pide otro.
    setToken('');
    if (controlRef.current) controlRef.current.reset();
    if (r.ok) {
      const d = r.data || {};
      setEstado({ kind: 'exito', folio: d.folio, issue: d.issue || null });
      return;
    }
    const campo = r.campo || REPORTE_CAMPO_DE_ERROR[r.error];
    if (campo) {
      marcar(campo, r.error);
      setEstado({ kind: 'error', mensaje: 'Revisa el dato marcado y vuelve a enviar.' });
    } else {
      const clave = r.status === 429 ? 'http_429' : r.error;
      setEstado({ kind: 'error', mensaje: REPORTE_MENSAJES[clave] || REPORTE_FALLO_GENERAL });
    }
  };

  if (estado.kind === 'exito') {
    return (
      <div className="amx-reporte-exito" role="status" aria-live="polite">
        <p className="amx-reporte-exito-tit">✓ Reporte enviado · folio <b>{estado.folio}</b></p>
        {estado.issue ? (
          <p>Ya está publicado en GitHub con tu firma:{' '}
            <a href={estado.issue.url} target="_blank" rel="noopener noreferrer">#{estado.issue.numero} ↗</a></p>
        ) : (
          <p>Lo recibimos y se publicará en GitHub en breve, con tu firma. Guarda tu folio por si quieres preguntar por él.</p>
        )}
        <p>Gracias por ayudar a mejorar la enciclopedia.</p>
      </div>
    );
  }

  const metadata = conMeta && window.amxMetadataDispositivo ? window.amxMetadataDispositivo() : null;
  const errorDe = (campo) => errores[campo];

  return (
    <form className="amx-reporte" onSubmit={enviar} noValidate aria-label={formato.name}>
      {/* Advertencia arriba de los campos, a la vista y no en letra chica. Es la versión
          web del aviso del bloque markdown de cada Issue Form («No incluyas datos personales»),
          que es lo que ve quien reporta desde GitHub. */}
      <div className="amx-reporte-advertencia" role="note">
        <p className="amx-reporte-advertencia-tit">No incluyas datos personales</p>
        <p>Lo que escribas abajo será público en GitHub. No pongas nombres completos, teléfonos, direcciones,
          CURP ni números de permiso o de registro de armas, tuyos ni de nadie más. Tu correo va solo en su
          campo, que no se publica.</p>
      </div>
      {formato.body.filter((c) => c.type !== 'markdown').map((c) => (
        <CampoReporte key={c.id} campo={c} id={idDe(c.id)} valor={campos[c.id]}
          onCambio={(v) => cambiar(c.id, v)} error={errorDe(c.id)} registrar={registrar(c.id)} />
      ))}

      <fieldset className="amx-reporte-firma">
        <legend className="amx-reporte-sub">Tu firma</legend>
        <p className="amx-renglon-ayuda">Así te acreditamos en GitHub. No hace falta cuenta.</p>
        <div className="amx-renglones-2">
          <div className="amx-reporte-campo">
            <label className="amx-renglon-etq" htmlFor={idDe('firma')}>Nombre o apodo<span className="amx-soporte-req"> *</span></label>
            <input id={idDe('firma')} ref={registrar('firma')} className="amx-renglon" value={firma} maxLength={40}
              autoComplete="nickname" aria-required="true" aria-invalid={errorDe('firma') ? 'true' : undefined}
              onChange={(e) => { setFirma(e.target.value); if (errores.firma) setErrores({}); }} />
            {errorDe('firma') && <p className="amx-reporte-err">{errorDe('firma')}</p>}
          </div>
          <div className="amx-reporte-campo">
            <label className="amx-renglon-etq" htmlFor={idDe('github')}>Usuario de GitHub (opcional)</label>
            <input id={idDe('github')} ref={registrar('github')} className="amx-renglon" value={github} maxLength={40}
              placeholder="para que GitHub te avise" autoCapitalize="none" spellCheck="false"
              aria-invalid={errorDe('github') ? 'true' : undefined}
              onChange={(e) => { setGithub(e.target.value); if (errores.github) setErrores({}); }} />
            {errorDe('github') && <p className="amx-reporte-err">{errorDe('github')}</p>}
          </div>
        </div>
        <div className="amx-reporte-campo">
          <label className="amx-renglon-etq" htmlFor={idDe('email')}>Correo (opcional, privado)</label>
          <input id={idDe('email')} ref={registrar('email')} className="amx-renglon" type="email" value={email} maxLength={160}
            autoComplete="email" placeholder="solo lo ve el equipo, para contarte en qué quedó"
            aria-invalid={errorDe('email') ? 'true' : undefined}
            onChange={(e) => { setEmail(e.target.value); if (errores.email) setErrores({}); }} />
          {errorDe('email') && <p className="amx-reporte-err">{errorDe('email')}</p>}
        </div>
      </fieldset>

      <div className="amx-reporte-meta">
        <label className="amx-reporte-casilla">
          <input type="checkbox" checked={conMeta} onChange={(e) => setConMeta(e.target.checked)} />
          <span>Adjuntar los datos de mi dispositivo para ayudar a reproducir el problema. Solo los ve el equipo; no se publican.</span>
        </label>
        {metadata && (
          <details>
            <summary>Ver qué se envía</summary>
            <pre>{JSON.stringify(metadata, null, 2)}</pre>
          </details>
        )}
      </div>

      <div className="amx-reporte-turnstile" ref={widgetRef} />
      {captcha === 'cargando' && <p className="amx-renglon-ayuda">Cargando la verificación anti-bots…</p>}

      <p className="amx-reporte-aviso">
        Se publicará de inmediato en GitHub con tu firma. Tu correo y los datos del dispositivo no se publican.
        No incluyas datos personales.
      </p>

      <div className="amx-reporte-acciones">
        <button type="submit" className="amx-boton-tinta" disabled={estado.kind === 'enviando'}>
          {estado.kind === 'enviando' ? 'Enviando…' : estado.kind === 'error' ? 'Reintentar' : 'Enviar reporte'}
        </button>
        {enlaceGitHub && (
          <a className="amx-reporte-alterno" href={enlaceGitHub} target="_blank" rel="noopener noreferrer">
            ¿Tienes cuenta de GitHub? Ábrelo allá ↗
          </a>
        )}
      </div>
      {estado.kind === 'error' && <p className="amx-reporte-err amx-reporte-err--general" role="alert">{estado.mensaje}</p>}
    </form>
  );
}

function FormularioReporte({ formato, inicial, enlaceGitHub }) {
  const f = window.AMX_FORMATOS_ISSUE && window.AMX_FORMATOS_ISSUE[formato];
  if (!f) return null;
  return <FormularioReporteCuerpo formatoId={formato} formato={f} inicial={inicial} enlaceGitHub={enlaceGitHub} />;
}
window.FormularioReporte = FormularioReporte;
