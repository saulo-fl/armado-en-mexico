# Rediseño de Soporte y Normas de la comunidad Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir `/soporte` en un manual de convivencia vintage, hacer que las denuncias privadas solo se confirmen después de llegar al backend y ofrecer correcciones públicas estructuradas mediante GitHub Issues y pull requests opcionales.

**Architecture:** Una fuente de contenido plana (`window.AMX_SOPORTE_CONTENT`) alimentará React y el prerender. Las funciones puras de Soporte vivirán en un script de navegador independiente y comprobable. Las denuncias viajarán directamente a `/api/append/reports`, se validarán con una lista cerrada en el servidor y solo se conservarán en D1; React mantendrá temporalmente el formulario y el contexto de una reseña. La corrección editorial seguirá un flujo distinto y público mediante un Issue Form de GitHub.

**Tech Stack:** React 18 UMD, JSX compilado con Babel, JavaScript plano mediante `window.*`, CSS existente sin preprocesador, Node `node:test`, Cloudflare Pages Functions + D1 y GitHub Issue Forms.

**Spec:** `docs/superpowers/specs/2026-09-19-redeseno-soporte-normas-comunidad-design.md`

## Global Constraints

- `docs/DESIGN.md` manda sobre la presentación. No introducir gradientes, glassmorphism, sombras grandes, otra tipografía ni otro breakpoint estructural.
- No añadir dependencias, ES modules al navegador, bundler, cuentas, bloqueo de usuarios, moderación automática, SLA, CAPTCHA ni creación automática de issues.
- No persistir denuncias del visitante en `localStorage`, URL, query string ni historial. El contexto existe solo en estado React.
- No afirmar que se bloquea o reporta automáticamente a autoridades. Las acciones reales son no publicar, retirar, pedir información y archivar.
- No escribir en D1 remoto, desplegar ni fusionar a `main` durante la implementación sin autorización explícita.
- Toda referencia local nueva servida como JS/CSS debe llevar `?v=` en el HTML y regla literal en `public/_headers`.
- Mantener el texto aprobado de apertura exactamente igual y proteger expresamente las críticas negativas de buena fe.
- Cada tarea termina con pruebas enfocadas y un commit pequeño. Si una prueba falla por una causa ajena, documentarla antes de continuar.
- Antes de cualquier cambio visual, conservar una captura de `/soporte` actual; después comparar a las anchuras indicadas en la Tarea 10.

---

## Task 1: Restaurar una línea base verde y atribuible

**Files:**

- Modify: `scripts/vitrina.test.mjs:112-126`

- [ ] **Step 1: Reproducir la falla previa**

Run:

```powershell
npm test
```

Expected: una sola falla en `scripts/vitrina.test.mjs`; el test espera 34 cargadores, pero el catálogo real contiene 35 y el tramo `Pistolas · .22 LR` contiene 5.

- [ ] **Step 2: Actualizar únicamente la expectativa obsoleta**

Cambiar el caso final a:

```js
test('el catálogo real: 35 cargadores en 9 tramos; Jericho en 9mm y MR1 en .223 Rem', () => {
  const s = window.accesoriosVitrina('cargadores')[0];
  assert.equal(s.piezas.length, 35);
  assert.deepEqual(s.tramos.map((t) => [t.label, t.piezas.length]), [
    ['Pistolas · .22 LR', 5], ['Pistolas · .380 ACP', 7], ['Pistolas · 9mm', 10], ['Pistolas · .40 S&W', 1],
    ['Rifles · .22 LR', 4], ['Rifles · .223 Rem', 1], ['Rifles · 5.56', 5],
    ['Escopetas · 12 GA', 1], ['Escopetas · 20 GA', 1],
  ]);
  const ids = (label) => s.tramos.find((t) => t.label === label).piezas.map((p) => p.id);
  assert.ok(ids('Pistolas · 9mm').includes(106));
  assert.deepEqual(ids('Rifles · .223 Rem'), [104]);
});
```

- [ ] **Step 3: Verificar la línea base**

Run:

```powershell
node --test scripts/vitrina.test.mjs; npm test
```

Expected: ambos comandos terminan con código 0.

- [ ] **Step 4: Commit**

```powershell
git add scripts/vitrina.test.mjs; git commit -m "test: actualizar conteo real de cargadores"
```

---

## Task 2: Crear la fuente única de contenido y las utilidades puras

**Files:**

- Create: `src/data/data-soporte.js`
- Create: `src/lib/soporte.js`
- Create: `scripts/soporte.test.mjs`
- Modify: `src/pages/index.html:263-281`
- Modify: `src/pages/admin.html:72-77`
- Modify: `public/_headers:37-85`
- Modify: `package.json:11`
- Modify: `scripts/build-prerender.mjs:45-49`

- [ ] **Step 1: Escribir las pruebas fallidas del contrato compartido**

Crear `scripts/soporte.test.mjs` con carga mediante `vm`, sin DOM ni dependencia nueva:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const load = (rel, sandbox) => {
  const url = new URL(rel, import.meta.url);
  vm.runInNewContext(readFileSync(url, 'utf8'), sandbox, { filename: url.pathname });
};

const sandbox = { window: {}, URL, console };
sandbox.window.window = sandbox.window;
load('../src/data/data-soporte.js', sandbox);
load('../src/lib/soporte.js', sandbox);

const C = sandbox.window.AMX_SOPORTE_CONTENT;
const U = sandbox.window;

test('el contenido conserva las decisiones editoriales aprobadas', () => {
  assert.equal(C.apertura,
    'Todos pueden contribuir a mejorar esta enciclopedia. Queremos construir un espacio seguro, respetuoso y útil para los amantes de las armas en México, sin importar su nivel de experiencia.');
  assert.equal(C.normas.length, 4);
  assert.match(C.venta.titulo, /Aquí no se compra ni se vende/i);
  assert.match(JSON.stringify(C), /no se retirará solo por ser desfavorable/i);
  assert.match(JSON.stringify(C), /fabricantes, distribuidores, tiendas, clubes y campos de tiro/i);
  assert.equal(C.clasificacion.criterios.length, 3);
  assert.doesNotMatch(JSON.stringify(C), /bloqueo inmediato|reporte a las autoridades|24 horas|48 horas/i);
});

test('la URL de corrección codifica la página y el contexto', () => {
  const url = new URL(U.amxCorreccionUrl({
    tipo: 'arma', titulo: 'Pistola Águila & Cía.', ruta: '/pistolas/aguila?vista=1', origin: 'https://armado.mx',
  }));
  assert.equal(url.origin + url.pathname,
    'https://github.com/saulo-fl/armado-en-mexico/issues/new');
  assert.equal(url.searchParams.get('template'), 'correccion.yml');
  assert.equal(url.searchParams.get('title'), '[Corrección]: Pistola Águila & Cía.');
  assert.equal(url.searchParams.get('pagina'), 'https://armado.mx/pistolas/aguila?vista=1');
  assert.equal(url.searchParams.get('tipo'), 'Arma');
  assert.equal(url.searchParams.get('nombre'), 'Pistola Águila & Cía.');
});

test('el contexto de denuncia contiene solo datos públicos y acota el extracto', () => {
  const out = U.amxContextoDenuncia({
    review: { id: 'r_1', autor: 'Ana', texto: 'x'.repeat(300), email: 'privado@example.com' },
    tipo: 'arma', entidadId: 47, entidadNombre: 'Ruger LCP',
  });
  assert.deepEqual(Object.keys(out),
    ['reviewId', 'tipo', 'entidadId', 'entidadNombre', 'autor', 'reviewExcerpt']);
  assert.equal(out.reviewExcerpt.length, 240);
  assert.equal('email' in out, false);
});

test('el envío solo informa éxito ante un 2xx', async () => {
  const ok = await U.amxEnviarReporte('/api/append/reports', { detalle: 'x'.repeat(20) },
    async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) }));
  const bad = await U.amxEnviarReporte('/api/append/reports', { detalle: 'x'.repeat(20) },
    async () => ({ ok: false, status: 503, json: async () => ({ error: 'sin_backend' }) }));
  const offline = await U.amxEnviarReporte('/api/append/reports', {},
    async () => { throw new Error('network down'); });
  assert.deepEqual(ok, { ok: true, status: 200, data: { ok: true } });
  assert.equal(bad.ok, false);
  assert.equal(bad.status, 503);
  assert.equal(offline.ok, false);
  assert.equal(offline.status, 0);
});
```

Run:

```powershell
node --test scripts/soporte.test.mjs
```

Expected: FAIL porque los dos archivos aún no existen.

- [ ] **Step 2: Crear el dato editorial sin JSX**

En `src/data/data-soporte.js`, usar una IIFE y publicar un único objeto. Esta es la estructura y el contenido obligatorio; se pueden ajustar conectores gramaticales, pero no las decisiones:

```js
(function () {
  window.AMX_SOPORTE_CONTENT = {
    titulo: 'Normas de la comunidad',
    apertura: 'Todos pueden contribuir a mejorar esta enciclopedia. Queremos construir un espacio seguro, respetuoso y útil para los amantes de las armas en México, sin importar su nivel de experiencia.',
    alcance: 'Estas normas se aplican a las reseñas, las denuncias y las aportaciones editoriales.',
    venta: {
      titulo: 'Aquí no se compra ni se vende',
      intro: 'Armado en México es una enciclopedia divulgativa. Las reseñas no pueden usarse para:',
      puntos: [
        'Ofrecer, solicitar, intercambiar o intermediar la compra o venta de armas, municiones o accesorios.',
        'Publicar datos de contacto con el propósito de cerrar una operación.',
        'Promocionar rifas, sorteos, descuentos o servicios comerciales.',
        'Pedir o compartir instrucciones para alterar matrículas, modificar ilegalmente un arma o evadir trámites.',
      ],
      consecuencia: 'El contenido no se publicará o se retirará, y cualquier denuncia se revisará internamente.',
    },
    normas: [
      {
        numero: '01', titulo: 'Respeto y seguridad',
        puntos: [
          'Debate la experiencia o el producto, no ataques a otras personas.',
          'No publiques insultos, amenazas, acoso, discriminación ni provocaciones.',
          'No compartas nombres completos, domicilios, teléfonos, matrículas, correos ni fotografías de terceros.',
          'No formules acusaciones de delitos contra una persona sin una fuente pública y verificable.',
        ],
      },
      {
        numero: '02', titulo: 'Experiencias útiles y pertinentes',
        puntos: [
          'Explica qué usaste, en qué contexto, qué funcionó y qué no.',
          'Mantén la reseña relacionada con la ficha correspondiente.',
          'No dupliques la misma reseña en varias fichas ni la utilices para consultas de trámite.',
          'Las críticas negativas son válidas cuando describen hechos o razones concretas. Una reseña no se retirará solo por ser desfavorable.',
        ],
      },
      {
        numero: '03', titulo: 'Independencia y conflictos de interés',
        puntos: [
          'Fabricantes, distribuidores, tiendas, clubes y campos de tiro no pueden reseñar productos o servicios con los que tengan relación comercial o institucional.',
          'Quien recibió pago, producto, beneficio o instrucciones de una parte interesada tampoco puede presentar esa opinión como una experiencia independiente.',
          'Estas organizaciones sí pueden corregir o aportar información factual mediante el formulario público, si declaran su relación y proporcionan fuentes.',
        ],
      },
      {
        numero: '04', titulo: 'Autenticidad y manipulación',
        puntos: [
          'Comparte experiencias propias y exprésalas con tus propias palabras.',
          'No se permiten reseñas copiadas, múltiples, pagadas o coordinadas para subir o bajar una calificación.',
          'No se admiten publicidad, enlaces promocionales, captación de clientes ni spam.',
        ],
      },
    ],
    moderacion: [
      'Toda reseña entra en una cola privada antes de publicarse.',
      'Una persona del equipo decide si cumple las normas.',
      'Al aprobarla, el correo se elimina antes de moverla al dominio público.',
      'Una reseña publicada puede retirarse si después se confirma un incumplimiento.',
      'Las opiniones negativas fundadas reciben el mismo trato que las positivas.',
    ],
    acciones: [
      ['01', 'No publicar', 'La reseña no aparece si incumple las normas.'],
      ['02', 'Retirar', 'Una reseña publicada puede retirarse si se confirma un incumplimiento.'],
      ['03', 'Pedir información', 'Cuando exista correo, el equipo puede pedir datos adicionales.'],
      ['04', 'Archivar', 'La denuncia se marca como resuelta después de revisarla.'],
    ],
    motivos: [
      ['ilegal', 'Compraventa u otra actividad ilegal'],
      ['irrespetuoso', 'Insultos, acoso o amenazas'],
      ['fuera-de-tema', 'Fuera de tema o mensaje repetido'],
      ['comercial', 'Publicidad o contenido comercial'],
      ['manipulacion', 'Manipulación de la calificación'],
      ['datos', 'Datos personales de alguien'],
      ['otro', 'Otro'],
    ],
    denuncia: {
      intro: 'Este formulario sirve para señalar una reseña comunitaria. Para corregir una ficha, utiliza la aportación pública.',
      privacidad: 'Puedes denunciar de forma anónima. El correo es opcional y no se publicará.',
      exito: 'Revisaremos el reporte. Si dejaste un correo, podremos contactarte para pedir información adicional o comunicarte el resultado. No publicaremos tu dirección.',
    },
    clasificacion: {
      titulo: 'Cómo clasificamos la información',
      criterios: [
        'La disponibilidad indica que el artículo aparece en el inventario oficial citado; no representa existencias en tiempo real.',
        'La clasificación legal se basa en la fuente vigente y en la modalidad mostrada. No sustituye asesoría jurídica para un caso particular.',
        'Las especificaciones corresponden a la variante identificada. Si las fuentes se contradicen o no permiten distinguirla, el dato se mantiene en revisión en vez de completarse por inferencia.',
      ],
    },
    correccion: {
      titulo: 'Corregir información de la enciclopedia',
      intro: 'Las correcciones factuales se proponen públicamente en GitHub con la página, el dato actual, la solución y sus fuentes.',
      pasos: [
        'Revisa el formulario y pulsa personalmente Submit new issue; Armado en México no publica nada en tu nombre.',
        'El equipo contrasta la información y confirma si el cambio es necesario.',
        'El equipo puede corregirlo, invitarte a aportar un pull request o cerrar el issue explicando la decisión.',
      ],
      fuentes: [
        'Información legal: DOF, Cámara de Diputados, DEFENSA u otra fuente oficial vigente.',
        'Precios y existencias: inventarios oficiales de DCAM u OTCA.',
        'Especificaciones: fabricante o manual oficial.',
        'Historia y contexto: fuentes editoriales identificables y contrastables.',
      ],
    },
  };
})();
```

- [ ] **Step 3: Implementar los helpers puros**

Crear `src/lib/soporte.js`:

```js
(function () {
  const ISSUE_URL = 'https://github.com/saulo-fl/armado-en-mexico/issues/new';
  const TIPO_ISSUE = {
    arma: 'Arma', accesorio: 'Accesorio', municion: 'Munición',
    calibre: 'Calibre', legalidad: 'Legalidad', faq: 'Preguntas frecuentes',
  };

  window.amxCorreccionUrl = function ({ tipo, titulo, ruta, origin }) {
    const base = origin || (window.location && window.location.origin) || 'https://armado.mx';
    const pagina = new URL(ruta || (window.location && window.location.pathname) || '/', base).href;
    const url = new URL(ISSUE_URL);
    url.searchParams.set('template', 'correccion.yml');
    url.searchParams.set('title', '[Corrección]: ' + String(titulo || 'Dato de la enciclopedia'));
    url.searchParams.set('pagina', pagina);
    url.searchParams.set('tipo', TIPO_ISSUE[tipo] || 'Otro');
    url.searchParams.set('nombre', String(titulo || ''));
    return url.href;
  };

  window.amxContextoDenuncia = function ({ review, tipo, entidadId, entidadNombre }) {
    return {
      reviewId: String((review && review.id) || ''),
      tipo: String(tipo || 'otro'),
      entidadId: String(entidadId == null ? '' : entidadId),
      entidadNombre: String(entidadNombre || '').slice(0, 120),
      autor: String((review && review.autor) || '').slice(0, 60),
      reviewExcerpt: String((review && review.texto) || '').trim().slice(0, 240),
    };
  };

  window.amxEnviarReporte = async function (url, item, fetchFn) {
    const send = fetchFn || (window.fetch && window.fetch.bind(window));
    if (!send) return { ok: false, status: 0, error: 'sin_backend' };
    try {
      const res = await send(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item), credentials: 'include',
      });
      let data = {};
      try { data = await res.json(); } catch (e) {}
      return res.ok
        ? { ok: true, status: res.status, data }
        : { ok: false, status: res.status, error: data.error || 'http_' + res.status };
    } catch (e) {
      return { ok: false, status: 0, error: 'red_no_disponible' };
    }
  };
})();
```

- [ ] **Step 4: Cargar los scripts y proteger la caché**

En `src/pages/index.html`, cargar en este orden:

```html
<script src="data-soporte.js?v=20260919a"></script>
<script src="soporte.js?v=20260919a"></script>
<script src="store.js?v=20260919a"></script>
```

En `src/pages/admin.html`, cargar `soporte.js` antes de `store.js` y cambiar la versión de `store.js`. No hace falta cargar `data-soporte.js` en Admin.

Añadir reglas literales a `public/_headers`:

```text
/soporte.js
  Cache-Control: public, max-age=0, must-revalidate
/data-soporte.js
  Cache-Control: public, max-age=0, must-revalidate
```

Agregar `data-soporte.js` al arreglo cargado por `scripts/build-prerender.mjs` y actualizar `package.json`:

```json
"test": "node --test scripts/cotejo.test.mjs scripts/vitrina.test.mjs scripts/arsenal-hub.test.mjs scripts/filtros.test.mjs scripts/faq.test.mjs scripts/soporte.test.mjs"
```

- [ ] **Step 5: Verificar contenido, utilidades y guardias de caché**

Run:

```powershell
node --test scripts/soporte.test.mjs; npm run build; npm test
```

Expected: pruebas verdes; el build no denuncia scripts sin `?v=` ni reglas faltantes; `out/data-soporte.js` y `out/soporte.js` existen.

- [ ] **Step 6: Commit**

```powershell
git add src/data/data-soporte.js src/lib/soporte.js scripts/soporte.test.mjs src/pages/index.html src/pages/admin.html public/_headers package.json scripts/build-prerender.mjs; git commit -m "feat: compartir contenido y utilidades de soporte"
```

---

## Task 3: Formalizar la corrección pública y la colaboración opcional

**Files:**

- Create: `.github/ISSUE_TEMPLATE/correccion.yml`
- Create: `.github/PULL_REQUEST_TEMPLATE.md`
- Create: `CONTRIBUTING.md`
- Modify: `scripts/soporte.test.mjs`

- [ ] **Step 1: Añadir pruebas fallidas sobre los archivos públicos**

Agregar a `scripts/soporte.test.mjs` comprobaciones de texto y campos estables:

```js
test('el Issue Form pide contexto, fuentes, relación y derechos', () => {
  const yml = readFileSync(new URL('../.github/ISSUE_TEMPLATE/correccion.yml', import.meta.url), 'utf8');
  for (const id of ['pagina', 'tipo', 'nombre', 'dato_actual', 'correccion', 'fuentes', 'relacion', 'pull_request', 'derechos']) {
    assert.match(yml, new RegExp('id: ' + id + '\\b'));
  }
  assert.match(yml, /labels:\s*\[documentation\]/);
  assert.match(yml, /required:\s*true/);
});

test('las guías separan issue, revisión y PR opcional', () => {
  const contributing = readFileSync(new URL('../CONTRIBUTING.md', import.meta.url), 'utf8');
  const pull = readFileSync(new URL('../.github/PULL_REQUEST_TEMPLATE.md', import.meta.url), 'utf8');
  assert.match(contributing, /AGPL-3\.0-or-later/);
  assert.match(contributing, /CC BY-SA 4\.0/);
  assert.match(contributing, /No se requiere.*CLA/i);
  assert.match(pull, /issue/i);
  assert.match(pull, /fuentes/i);
  assert.match(pull, /verificaci/i);
});
```

Run:

```powershell
node --test scripts/soporte.test.mjs
```

Expected: FAIL por archivos ausentes.

- [ ] **Step 2: Crear el Issue Form completo**

Usar en `.github/ISSUE_TEMPLATE/correccion.yml`:

```yaml
name: Corregir información de la enciclopedia
description: Señala un dato factual y aporta fuentes para revisarlo.
title: "[Corrección]: "
labels: [documentation]
body:
  - type: markdown
    attributes:
      value: |
        Este issue será público. No incluyas datos personales ni denuncias sobre reseñas. El equipo revisará las fuentes antes de modificar la web.
  - type: input
    id: pagina
    attributes:
      label: Página exacta
      description: URL o ruta donde aparece el dato.
      placeholder: https://armado.mx/pistolas/ejemplo
    validations:
      required: true
  - type: dropdown
    id: tipo
    attributes:
      label: Tipo de contenido
      options:
        - Arma
        - Accesorio
        - Munición
        - Calibre
        - Legalidad
        - Preguntas frecuentes
        - Otro
    validations:
      required: true
  - type: input
    id: nombre
    attributes:
      label: Ficha o sección
      placeholder: Nombre del producto o apartado
    validations:
      required: true
  - type: textarea
    id: dato_actual
    attributes:
      label: Dato actual
      description: Copia o describe con precisión lo que parece incorrecto.
    validations:
      required: true
  - type: textarea
    id: correccion
    attributes:
      label: Corrección propuesta
      description: Indica cuál debería ser el dato y por qué.
    validations:
      required: true
  - type: textarea
    id: fuentes
    attributes:
      label: Fuentes
      description: Enlaza DOF, Cámara de Diputados, DEFENSA, inventarios DCAM/OTCA, fabricante, manual oficial o fuentes editoriales identificables.
      placeholder: Una fuente por línea, con título y URL.
    validations:
      required: true
  - type: dropdown
    id: relacion
    attributes:
      label: Relación comercial o institucional
      description: Declara cualquier relación con la información corregida.
      options:
        - Ninguna
        - Fabricante o marca
        - Distribuidor o tienda
        - Club o campo de tiro
        - Autor o representante de la fuente
        - Otra relación
    validations:
      required: true
  - type: dropdown
    id: pull_request
    attributes:
      label: ¿Te interesaría aportar la solución mediante un pull request?
      description: Es opcional y solo procede después de que el equipo confirme el cambio.
      options:
        - Sí
        - Tal vez, necesito orientación
        - No
    validations:
      required: true
  - type: checkboxes
    id: derechos
    attributes:
      label: Derechos y licencia
      options:
        - label: Confirmo que puedo aportar este contenido bajo la licencia correspondiente y que no incluyo material de terceros sin permiso compatible.
          required: true
```

- [ ] **Step 3: Crear la guía de contribución y la plantilla de PR**

`CONTRIBUTING.md` debe explicar, en este orden:

1. Abrir primero `correccion.yml` con página, dato, propuesta y fuentes.
2. Esperar la revisión editorial; abrir el issue no garantiza aceptación.
3. Crear un PR solo si el cambio fue confirmado o si el issue lo solicita.
4. Seguir `AGENTS.md`, `docs/DESIGN.md`, las pruebas y el build del repo.
5. Jerarquía de fuentes: oficial legal; inventarios DCAM/OTCA; fabricante/manual; editorial contrastable.
6. Publicaciones sociales, capturas, comentarios y tiendas pueden orientar, pero no bastan solas.
7. Código bajo AGPL-3.0-or-later; textos y estructura del catálogo bajo CC BY-SA 4.0.
8. No aportar fotografías, logotipos, manuales o documentos de terceros sin derechos compatibles. No se requiere CLA.

`.github/PULL_REQUEST_TEMPLATE.md` debe contener casillas accionables:

```md
## Qué corrige

- Issue aceptado: Closes #
- Resumen del cambio:

## Fuentes

- Fuente oficial o primaria:
- Fuente de contraste, si aplica:

## Archivos modificados

- [ ] Datos o contenido
- [ ] Interfaz o estilos
- [ ] Pruebas o documentación

## Verificación

- [ ] `npm test`
- [ ] `npm run build`
- [ ] Revisé el resultado visible si cambié la interfaz
- [ ] Tengo derecho a aportar el contenido bajo la licencia correspondiente
```

- [ ] **Step 4: Validar localmente**

Run:

```powershell
node --test scripts/soporte.test.mjs; git diff --check
```

Expected: PASS. La disponibilidad real del Issue Form solo se comprobará después de fusionarlo en la rama predeterminada; no confundir la validación del YAML con su publicación.

- [ ] **Step 5: Commit**

```powershell
git add .github/ISSUE_TEMPLATE/correccion.yml .github/PULL_REQUEST_TEMPLATE.md CONTRIBUTING.md scripts/soporte.test.mjs; git commit -m "docs: abrir flujo público de correcciones"
```

---

## Task 4: Validar denuncias como contrato del servidor

**Files:**

- Modify: `functions/api/_lib.js:25-112`
- Modify: `functions/api/_lib.test.mjs:9-108`
- Modify: `functions/api/append/[domain].js:12-28`
- Create: `functions/api/append/domain.test.mjs`

- [ ] **Step 1: Escribir casos rojos para normalización y rechazo**

En `functions/api/_lib.test.mjs`, importar `normalizeReport`, `REPORT_MIN` y `REPORT_MAX`. Sustituir los antiguos casos de denuncia genérica —que aceptaban objetos arbitrarios— por este fixture cerrado:

```js
const REPORTE_VALIDO = {
  reviewId: 'r_47', tipo: 'arma', entidadId: 47, entidadNombre: 'Ruger LCP',
  reviewExcerpt: 'Una reseña pública breve', motivo: 'datos',
  detalle: 'La reseña contiene el teléfono de una tercera persona.',
  email: 'ana@example.com', extra: 'no debe persistir',
};

{
  const out = normalizeReport(REPORTE_VALIDO);
  assert.equal(out.ok, true);
  assert.equal(out.value.extra, undefined);
  assert.deepEqual(Object.keys(out.value), [
    'reviewId', 'tipo', 'entidadId', 'entidadNombre', 'reviewExcerpt', 'motivo', 'detalle', 'email',
  ]);
  ok('denuncia válida normalizada por lista cerrada');
}

for (const [nombre, cambio] of [
  ['tipo desconocido', { tipo: 'inventado' }],
  ['motivo desconocido', { motivo: 'spam' }],
  ['detalle corto', { detalle: 'demasiado corto' }],
  ['detalle largo', { detalle: 'x'.repeat(REPORT_MAX + 1) }],
  ['correo inválido', { email: 'no-es-correo' }],
  ['nombre sobredimensionado', { entidadNombre: 'x'.repeat(121) }],
]) {
  const out = normalizeReport({ ...REPORTE_VALIDO, ...cambio });
  assert.equal(out.ok, false, nombre);
  assert.deepEqual(mergeAppend('reports', [], { ...REPORTE_VALIDO, ...cambio }), [], nombre);
}
ok('denuncias inválidas no modifican el dominio');
```

Crear `functions/api/append/domain.test.mjs` para probar el límite HTTP:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from './[domain].js';

const request = (body) => new Request('https://armado.mx/api/append/reports', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

test('un reporte inválido devuelve 400 antes de leer o escribir D1', async () => {
  let calls = 0;
  const DB = { prepare() { calls++; throw new Error('D1 no debe tocarse'); } };
  const res = await onRequestPost({
    request: request({ tipo: 'arma', motivo: 'inventado', detalle: 'x'.repeat(30) }),
    env: { DB }, params: { domain: 'reports' },
  });
  assert.equal(res.status, 400);
  assert.equal(calls, 0);
});
```

Run:

```powershell
node functions/api/_lib.test.mjs; node --test functions/api/append/domain.test.mjs
```

Expected: FAIL; no existen el normalizador ni el rechazo HTTP.

- [ ] **Step 2: Implementar una normalización cerrada**

Añadir a `functions/api/_lib.js`:

```js
export const REPORT_MIN = 20;
export const REPORT_MAX = 1200;
const TIPOS_REPORTE = ['arma', 'accesorio', 'municion', 'campo', 'curso', 'otro'];
const MOTIVOS_REPORTE = ['ilegal', 'irrespetuoso', 'fuera-de-tema', 'comercial', 'manipulacion', 'datos', 'otro'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeReport(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return { ok: false, error: 'reporte_invalido' };
  }
  const value = {
    reviewId: String(item.reviewId || '').trim(),
    tipo: String(item.tipo || '').trim(),
    entidadId: String(item.entidadId == null ? '' : item.entidadId).trim(),
    entidadNombre: String(item.entidadNombre || '').trim(),
    reviewExcerpt: String(item.reviewExcerpt || '').trim(),
    motivo: String(item.motivo || '').trim(),
    detalle: String(item.detalle || '').trim(),
    email: String(item.email || '').trim(),
  };
  const demasiadoLargo = value.reviewId.length > 80 || value.entidadId.length > 80
    || value.entidadNombre.length > 120 || value.reviewExcerpt.length > 240
    || value.email.length > 160;
  if (demasiadoLargo) return { ok: false, error: 'campo_demasiado_largo' };
  if (!TIPOS_REPORTE.includes(value.tipo)) return { ok: false, error: 'tipo_invalido' };
  if (!MOTIVOS_REPORTE.includes(value.motivo)) return { ok: false, error: 'motivo_invalido' };
  if (value.detalle.length < REPORT_MIN || value.detalle.length > REPORT_MAX) {
    return { ok: false, error: 'detalle_invalido' };
  }
  if (value.email && !EMAIL.test(value.email)) return { ok: false, error: 'email_invalido' };
  return { ok: true, value };
}
```

En la rama `reports` de `mergeAppend`, volver a validar para que cualquier llamada interna insegura sea no-op:

```js
if (domain === 'reports') {
  const arr = Array.isArray(current) ? current.slice() : [];
  const normalized = normalizeReport(item);
  if (!normalized.ok) return arr;
  const clean = normalized.value;
  clean.id = 'd_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  clean.submittedAt = new Date().toISOString();
  clean.status = 'pending';
  arr.unshift(clean);
  return recortarPorBytes(arr.slice(0, 1000), MAX_DOMINIO);
}
```

- [ ] **Step 3: Rechazar antes de tocar D1**

Importar `normalizeReport` en `functions/api/append/[domain].js` y, después de parsear JSON pero antes de `readDomain`, añadir:

```js
if (domain === 'reports') {
  const normalized = normalizeReport(item);
  if (!normalized.ok) return json({ error: normalized.error }, 400);
  item = normalized.value;
}
```

Ampliar `domain.test.mjs` con un D1 falso para el caso válido. El mock debe distinguir `SELECT` de `INSERT`, guardar el segundo argumento del `bind` y comprobar que el JSON persistido contiene `status: "pending"` pero no `extra`.

- [ ] **Step 4: Ejecutar la batería del backend**

Run:

```powershell
node functions/api/_lib.test.mjs; node --test functions/api/append/domain.test.mjs
```

Expected: todas las comprobaciones pasan; payload inválido = `400`; payload válido = `200`; el mock registra una sola escritura saneada.

- [ ] **Step 5: Commit**

```powershell
git add functions/api/_lib.js functions/api/_lib.test.mjs functions/api/append/[domain].js functions/api/append/domain.test.mjs; git commit -m "feat: validar denuncias en el backend"
```

---

## Task 5: Confirmar denuncias solo después de la respuesta real

**Files:**

- Modify: `src/lib/store.js:214-222,430-448`
- Modify: `scripts/soporte.test.mjs`

- [ ] **Step 1: Escribir un test de runtime que demuestre el problema**

Agregar un segundo sandbox a `scripts/soporte.test.mjs`. Debe proporcionar `window.DB = []`, `window.armaPlaceholder`, un `localStorage` en memoria, `location` HTTPS, `addEventListener` y un `fetch` que responda `{}` para `/state` y una respuesta controlable para `/append/reports`. Cargar primero `soporte.js` y luego `store.js`.

Casos requeridos:

```js
const storageMap = new Map();
const webStorage = {
  getItem: (key) => storageMap.has(key) ? storageMap.get(key) : null,
  setItem: (key, value) => storageMap.set(key, String(value)),
  removeItem: (key) => storageMap.delete(key),
};
let reportResponse = { ok: true, status: 200, json: async () => ({ ok: true }) };
const webSandbox = {
  console, URL, localStorage: webStorage,
  location: { protocol: 'https:', origin: 'https://armado.mx' },
  setTimeout, clearTimeout,
  fetch: async (url) => String(url).endsWith('/state')
    ? { ok: true, status: 200, json: async () => ({}) }
    : reportResponse,
  window: {
    DB: [], AMX_PRICE_HISTORY_SEED: {}, armaPlaceholder: () => '',
    addEventListener: () => {},
  },
};
Object.assign(webSandbox.window, {
  localStorage: webStorage, location: webSandbox.location, fetch: webSandbox.fetch,
});
load('../src/lib/soporte.js', webSandbox);
load('../src/lib/store.js', webSandbox);
const WEB = webSandbox.window;

const REPORTE_WEB_VALIDO = {
  reviewId: 'r_47', tipo: 'arma', entidadId: '47', entidadNombre: 'Ruger LCP',
  reviewExcerpt: 'Una reseña pública breve', motivo: 'datos',
  detalle: 'La reseña contiene el teléfono de una tercera persona.', email: '',
};

test('Store.addReport no persiste en localStorage y devuelve el resultado HTTP', async () => {
  const before = webStorage.getItem('amx_reports_v1');
  const result = await WEB.Store.addReport(REPORTE_WEB_VALIDO);
  assert.equal(result.ok, true);
  assert.equal(webStorage.getItem('amx_reports_v1'), before);
  assert.equal(JSON.parse(before).length, 0);
});

test('Store.addReport conserva el fallo sin notificar éxito', async () => {
  reportResponse = { ok: false, status: 503, json: async () => ({ error: 'sin_backend' }) };
  const result = await WEB.Store.addReport(REPORTE_WEB_VALIDO);
  assert.deepEqual(result, { ok: false, status: 503, error: 'sin_backend' });
  assert.deepEqual(JSON.parse(webStorage.getItem('amx_reports_v1')), []);
});
```

Run:

```powershell
node --test scripts/soporte.test.mjs
```

Expected: FAIL; el método actual escribe localmente y devuelve `true` antes de conocer la respuesta.

- [ ] **Step 2: Convertir `Store.addReport` en operación asíncrona específica**

Reemplazar el método por:

```js
async addReport(rep) {
  const item = {
    reviewId: String(rep.reviewId || ''),
    tipo: String(rep.tipo || 'otro'),
    entidadId: String(rep.entidadId == null ? '' : rep.entidadId),
    entidadNombre: String(rep.entidadNombre || ''),
    reviewExcerpt: String(rep.reviewExcerpt || ''),
    motivo: String(rep.motivo || ''),
    detalle: String(rep.detalle || '').trim(),
    email: String(rep.email || '').trim(),
  };
  if (!REMOTE.enabled || typeof window.amxEnviarReporte !== 'function') {
    return { ok: false, status: 0, error: 'sin_backend' };
  }
  const result = await window.amxEnviarReporte(REMOTE.base + '/append/reports', item, fetch);
  if (result.ok) REMOTE.ok = true;
  return result;
},
```

No llamar a `read(K.reports)`, `write(K.reports)`, `Store._notify()` ni al `publicAppend` de fire-and-forget. Mantener `getReports()` y `resolveReport()` para el panel administrativo, que recibe D1 durante `hydrate()`.

- [ ] **Step 3: Verificar ausencia de persistencia y regresiones**

Run:

```powershell
node --test scripts/soporte.test.mjs; npm test; npm run build
```

Expected: PASS; el test demuestra que `amx_reports_v1` permanece vacío tanto en éxito como en error.

- [ ] **Step 4: Commit**

```powershell
git add src/lib/store.js scripts/soporte.test.mjs; git commit -m "fix: confirmar denuncias después del backend"
```

---

## Task 6: Llevar el contexto de una reseña hasta Soporte y Admin

**Files:**

- Modify: `src/screens/screens-2.jsx:18,250,302-441`
- Modify: `src/screens/screens-accesorios.jsx:145,291`
- Modify: `src/app.jsx:206-377,452-498`
- Modify: `src/admin.jsx:1260-1304`
- Modify: `src/styles/estilo.css` (acción secundaria de la reseña)
- Modify: `scripts/soporte.test.mjs`

- [ ] **Step 1: Escribir guardias fallidas de integración**

Agregar pruebas estáticas acotadas a las firmas y puntos de conexión:

```js
test('las reseñas publicadas exponen Denunciar y App transporta contexto', () => {
  const screen = readFileSync(new URL('../src/screens/screens-2.jsx', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../src/app.jsx', import.meta.url), 'utf8');
  assert.match(screen, /onReportReview/);
  assert.match(screen, />Denunciar</);
  assert.match(app, /reportContext/);
  assert.match(app, /openReviewReport/);
  assert.match(app, /<window\.SoporteScreen[^>]+reportContext=/);
});

test('Admin muestra el contexto factual de la denuncia', () => {
  const admin = readFileSync(new URL('../src/admin.jsx', import.meta.url), 'utf8');
  for (const field of ['entidadNombre', 'entidadId', 'reviewExcerpt']) assert.match(admin, new RegExp('d\\.' + field));
});
```

Run:

```powershell
node --test scripts/soporte.test.mjs
```

Expected: FAIL.

- [ ] **Step 2: Añadir `Denunciar` a cada reseña publicada**

Cambiar `OpinionBlock` a:

```jsx
function OpinionBlock({ tipo, entidadId, entidadNombre, nombreTipo, onNav, onReportReview }) {
```

En el `map` de reseñas publicadas, añadir una acción secundaria con objetivo táctil mínimo de 44 px:

```jsx
<button type="button" className="amx-opinion-denunciar"
  onClick={() => onReportReview && onReportReview(window.amxContextoDenuncia({
    review: r, tipo, entidadId, entidadNombre,
  }))}>
  Denunciar
</button>
```

Añadir una regla visual discreta, con foco existente y área táctil real:

```css
.amx-v2 .amx-opinion-denunciar {
  min-height: 44px;
  padding: 9px 12px;
  border: 0;
  background: transparent;
  color: var(--tinta-dim);
  font: 600 12px/1.2 var(--mono);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}
```

Propagar `onReportReview` desde `ProductScreen` y `AccesorioFicha` hasta sus instancias de `OpinionBlock`. No añadirlo a municiones: actualmente solo armas y accesorios publican opiniones.

- [ ] **Step 3: Transportar el contexto solo en memoria**

En `App`, junto a los demás estados de navegación:

```jsx
const [reportContext, setReportContext] = useStateApp(null);

const openReviewReport = (context) => {
  setHistory((h) => [...h, { screen, productId, accesorioId, municionId, catalogFilter }]);
  setReportContext(context);
  setScreen('soporte');
};

useEffectApp(() => {
  if (screen !== 'soporte') setReportContext(null);
}, [screen]);
```

En `onPop`, borrar el contexto. Pasar el callback y el dato:

```jsx
<window.ProductScreen ... onReportReview={openReviewReport} />
<window.AccesorioFicha ... onReportReview={openReviewReport} />
<window.SoporteScreen onNav={navTab} reportContext={reportContext} />
```

No modificar `amxBuildPath`, `amxBuildUrl`, `history.pushState` ni la URL para incluir el identificador de la reseña.

- [ ] **Step 4: Dar al panel el contexto suficiente**

En cada tarjeta de `ReportsTab`, mostrar:

```jsx
<div>{d.entidadNombre || 'Entidad no identificada'}</div>
<div>{String(d.tipo || 'otro')} · {d.entidadId || 'sin id'} · {d.reviewId || 'captura manual'}</div>
{d.reviewExcerpt && <blockquote>{d.reviewExcerpt}</blockquote>}
```

Conservar el aviso de que retirar una reseña ocurre en `RESEÑAS`, y conservar `Marcar resuelta`. Resolver la denuncia no debe llamar a `unpublishReview`.

- [ ] **Step 5: Verificar el cableado**

Run:

```powershell
node --test scripts/soporte.test.mjs; npm run build; npm test
```

Expected: PASS; el JSX compila y las dos fichas con opiniones reciben el callback.

- [ ] **Step 6: Commit**

```powershell
git add src/screens/screens-2.jsx src/screens/screens-accesorios.jsx src/app.jsx src/admin.jsx src/styles/estilo.css scripts/soporte.test.mjs; git commit -m "feat: denunciar reseñas con contexto privado"
```

---

## Task 7: Construir el contenido y la interfaz vintage de `/soporte`

**Files:**

- Modify: `src/screens/screens-2.jsx:950-1184`
- Modify: `src/styles/estilo.css` (añadir bloque `.amx-soporte-*` junto a las pantallas editoriales)
- Modify: `scripts/soporte.test.mjs`

- [ ] **Step 1: Crear pruebas rojas de estructura editorial**

Agregar:

```js
test('Soporte usa el dato común y deja todas las normas visibles', () => {
  const src = readFileSync(new URL('../src/screens/screens-2.jsx', import.meta.url), 'utf8');
  const ini = src.indexOf('function SoportePortada');
  const fin = src.indexOf('window.SoporteScreen = SoporteScreen');
  const soporte = src.slice(ini, fin);
  assert.match(soporte, /AMX_SOPORTE_CONTENT/);
  assert.match(soporte, /amx-soporte-reglas/);
  assert.doesNotMatch(soporte, /<window\.Disclosure/);
  assert.match(soporte, /aria-live/);
  assert.match(soporte, /Reintentar/);
});

test('la piel de Soporte usa papeles físicos y un solo corte estructural', () => {
  const css = readFileSync(new URL('../src/styles/estilo.css', import.meta.url), 'utf8');
  for (const cls of ['amx-soporte', 'amx-soporte-portada', 'amx-soporte-aviso',
    'amx-soporte-reglas', 'amx-soporte-regla', 'amx-soporte-carbon', 'amx-soporte-formato']) {
    assert.match(css, new RegExp('\\.' + cls + '\\b'));
  }
  const block = css.slice(css.indexOf('/* SOPORTE'));
  assert.match(block, /@media \(min-width: 1024px\)/);
});
```

Run:

```powershell
node --test scripts/soporte.test.mjs
```

Expected: FAIL.

- [ ] **Step 2: Separar componentes de módulo, no componentes internos**

Ampliar primero la desestructuración superior del archivo, porque la pantalla actual solo importa `useState2` y `useMemo2`:

```jsx
const {
  useState: useState2, useMemo: useMemo2, useEffect: useEffect2, useRef: useRef2,
} = React;
```

Antes de `SoporteScreen`, declarar:

```jsx
function SoportePortada({ contenido }) { /* h1 Dymo, apertura y alcance */ }
function SoporteAviso({ aviso }) { /* hoja recortada y sello rojo textual */ }
function SoporteHojaNorma({ norma }) { /* h2, número y lista siempre visible */ }
function SoporteModeracion({ contenido }) { /* copia al carbón y acciones reales */ }
function SoporteDenuncia({ reportContext }) { /* formulario y máquina de estados */ }
function SoporteDirectorio({ contenido, onNav }) { /* clasificación, corrección, fuentes, FAQ y Legalidad */ }
```

El esqueleto semántico de pantalla debe ser:

```jsx
function SoporteScreen({ onNav, reportContext }) {
  const contenido = window.AMX_SOPORTE_CONTENT;
  return (
    <main className="amx-soporte">
      <SoportePortada contenido={contenido} />
      <SoporteAviso aviso={contenido.venta} />
      <section aria-labelledby="soporte-normas-titulo">
        <h2 id="soporte-normas-titulo" className="amx-soporte-seccion-titulo">Normas</h2>
        <div className="amx-soporte-reglas">
          {contenido.normas.map((norma) => <SoporteHojaNorma key={norma.numero} norma={norma} />)}
        </div>
      </section>
      <SoporteModeracion contenido={contenido} />
      <SoporteDenuncia reportContext={reportContext} />
      <SoporteDirectorio contenido={contenido} onNav={onNav} />
    </main>
  );
}
```

Debe existir un solo `h1`; las cuatro hojas usan `h3` dentro de una sección `h2`. No usar acordeones.

- [ ] **Step 3: Implementar la máquina de estados honesta del formulario**

En `SoporteDenuncia`:

```jsx
const VACIA = { reviewId: '', tipo: 'otro', entidadId: '', entidadNombre: '', reviewExcerpt: '', motivo: 'ilegal', detalle: '', email: '' };
const [den, setDen] = useState2(() => Object.assign({}, VACIA, reportContext || {}));
const [estado, setEstado] = useState2({ kind: 'idle', error: '' });
const titleRef = useRef2(null);

useEffect2(() => {
  if (!reportContext) return;
  setDen(Object.assign({}, VACIA, reportContext));
  setEstado({ kind: 'idle', error: '' });
  requestAnimationFrame(() => titleRef.current && titleRef.current.focus());
}, [reportContext]);

const enviar = async (e) => {
  e.preventDefault();
  const detalle = den.detalle.trim();
  if (detalle.length < 20 || detalle.length > 1200) return;
  setEstado({ kind: 'submitting', error: '' });
  const result = await window.Store.addReport(Object.assign({}, den, { detalle }));
  if (result.ok) {
    setDen(VACIA);
    setEstado({ kind: 'success', error: '' });
  } else {
    setEstado({ kind: 'error', error: 'No pudimos enviar el reporte. Tus datos siguen en este formulario para que puedas reintentar.' });
  }
};
```

Requisitos del JSX:

- `<form onSubmit={enviar} noValidate>` con `label` + `htmlFor` en cada campo.
- Motivo a partir de `contenido.motivos`; correo opcional `type="email" maxLength="160"`.
- Detalle `minLength="20" maxLength="1200" required` y contador visible.
- En contexto, mostrar entidad, autor público, extracto y un botón para borrar el contexto sin borrar el detalle ya escrito.
- `submitting`: controles deshabilitados y botón `Enviando…`.
- `success`: región `role="status" aria-live="polite"` con `contenido.denuncia.exito` y sin datos sensibles.
- `error`: región `role="alert"`, conservar `den` y rotular el mismo submit como `Reintentar`.
- El encabezado contextual lleva `tabIndex="-1"` para recibir foco programático.
- El directorio muestra `contenido.clasificacion`, la jerarquía de fuentes y un enlace público construido con `amxCorreccionUrl`; las únicas rutas de ayuda adicionales son Legalidad y Preguntas frecuentes. No inventar correo general.

- [ ] **Step 4: Aplicar la dirección visual usando tokens físicos existentes**

Crear un bloque `/* SOPORTE — manual de convivencia + formato de denuncia */` con estas responsabilidades:

```css
.amx-soporte { width: min(100% - 32px, 920px); margin: 0 auto; padding: 22px 0 96px; }
.amx-soporte-portada,
.amx-soporte-regla,
.amx-soporte-formato { background: var(--oficio); color: var(--oficio-tinta-2); }
.amx-soporte-portada { position: relative; padding: clamp(22px, 5vw, 48px); }
.amx-soporte-dymo { display: inline-block; background: #111; color: #f4efe3; font-family: "JetBrains Mono", monospace; }
.amx-soporte-aviso { background: var(--oficio-2); border-inline-start: 6px solid var(--fichero-rojo); }
.amx-soporte-reglas { display: grid; grid-template-columns: 1fr; gap: 18px; }
.amx-soporte-regla { position: relative; padding: 24px 20px; }
.amx-soporte-carbon { color: var(--oficio-tinta-2); background: color-mix(in srgb, var(--fichero-azul) 13%, var(--oficio)); }
.amx-soporte-formato input,
.amx-soporte-formato select,
.amx-soporte-formato textarea,
.amx-soporte-formato button { min-height: 44px; }
@media (min-width: 1024px) {
  .amx-soporte-reglas { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
```

Completar separaciones con pseudo-elementos, pestañas y líneas de formulario, sin usar bordes como único recurso. Las superficies de papel conservan estos colores en tema oscuro. El fondo exterior sí usa los tokens normales del tema. No leer `PALETTE` ni `CLARO` para los papeles.

- [ ] **Step 5: Verificar contenido y compilación**

Run:

```powershell
node --test scripts/soporte.test.mjs; npm run build; npm test
```

Expected: PASS; `out/screens-2.js` contiene la nueva pantalla y no hay `Disclosure` dentro de Soporte.

- [ ] **Step 6: Punto de control visual antes de seguir**

Servir `out/` con una herramienta ya disponible en el equipo. Si `npx serve` no está ya instalado, usar `python -m http.server` desde `out/`; no instalar nada.

Revisar `/soporte` a 375 px y 1440 px en claro y oscuro. Confirmar antes de continuar:

- La portada se reconoce como parte del archivo físico del sitio, no como una landing genérica.
- El aviso de no compraventa aparece antes de las normas.
- Las cuatro hojas son visibles, 1 columna en móvil y 2 × 2 en escritorio.
- Papel claro legible en oscuro; nada parece un sello gubernamental real.
- Ningún texto, foco o control queda cortado; los controles miden al menos 44 px.

Guardar capturas fuera del repo o en la carpeta de evidencia ya usada por el proyecto; no añadir binarios al commit.

- [ ] **Step 7: Commit**

```powershell
git add src/screens/screens-2.jsx src/styles/estilo.css scripts/soporte.test.mjs; git commit -m "feat: rediseñar normas y formulario de soporte"
```

---

## Task 8: Añadir `ReportarError` solo en las páginas acordadas

**Files:**

- Modify: `src/components/ui.jsx` (antes de las exportaciones finales)
- Modify: `src/screens/screens-2.jsx:18-288,584-817,1197-1235`
- Modify: `src/screens/screens-accesorios.jsx:145-306`
- Modify: `src/screens/screens-municiones.jsx:397-700`
- Modify: `src/screens/screens-3.jsx:132-241`
- Modify: `src/styles/estilo.css`
- Modify: `scripts/soporte.test.mjs`

- [ ] **Step 1: Escribir pruebas rojas de inclusión y exclusión**

Agregar:

```js
test('ReportarError usa el helper público y advierte que GitHub es público', () => {
  const ui = readFileSync(new URL('../src/components/ui.jsx', import.meta.url), 'utf8');
  assert.match(ui, /function ReportarError/);
  assert.match(ui, /amxCorreccionUrl/);
  assert.match(ui, /noopener noreferrer/);
  assert.match(ui, /GitHub.*públic/i);
  assert.match(ui, /window\.ReportarError = ReportarError/);
});

test('la acción aparece en seis tipos de detalle y no en listados', () => {
  const two = readFileSync(new URL('../src/screens/screens-2.jsx', import.meta.url), 'utf8');
  const acc = readFileSync(new URL('../src/screens/screens-accesorios.jsx', import.meta.url), 'utf8');
  const mun = readFileSync(new URL('../src/screens/screens-municiones.jsx', import.meta.url), 'utf8');
  const three = readFileSync(new URL('../src/screens/screens-3.jsx', import.meta.url), 'utf8');
  assert.match(two, /tipo="arma"/);
  assert.match(two, /tipo="legalidad"/);
  assert.match(two, /tipo="faq"/);
  assert.match(acc, /tipo="accesorio"/);
  assert.match(mun, /tipo="municion"/);
  assert.match(three, /tipo="calibre"/);
});
```

Run:

```powershell
node --test scripts/soporte.test.mjs
```

Expected: FAIL.

- [ ] **Step 2: Crear la primitiva reutilizable**

En `src/components/ui.jsx`:

```jsx
function ReportarError({ tipo, titulo, ruta }) {
  const href = window.amxCorreccionUrl({ tipo, titulo, ruta });
  return (
    <aside className="amx-reportar-error" aria-label="Corregir información">
      <div>
        <strong>¿Encontraste un dato incorrecto?</strong>
        <span>La aportación se revisará con sus fuentes antes de modificar la enciclopedia.</span>
        <small>El formulario y lo que escribas serán públicos en GitHub. No incluyas datos personales.</small>
      </div>
      <a href={href} target="_blank" rel="noopener noreferrer">
        Repórtalo <span aria-hidden="true">↗</span>
      </a>
    </aside>
  );
}
window.ReportarError = ReportarError;
```

La clase debe reutilizar papel, tipografía y contraste del sistema, pero distinguirse del formulario privado. El enlace debe tener foco visible, área mínima 44 px y texto comprensible sin el símbolo.

- [ ] **Step 3: Colocar la acción al final del contenido correcto**

Añadir una sola instancia, después del contenido principal y antes del cierre de la pantalla:

```jsx
<window.ReportarError tipo="arma" titulo={arma.nombre} />
<window.ReportarError tipo="accesorio" titulo={acc.nombre} />
<window.ReportarError tipo="municion" titulo={mun.nombre} />
<window.ReportarError tipo="legalidad" titulo="Legalidad" ruta="/legalidad" />
<window.ReportarError tipo="faq" titulo="Preguntas frecuentes" ruta="/preguntas" />
```

En cada `CaliberFicha`, crear un ancla estable y apuntar al bloque:

```jsx
<article id={'calibre-' + window.amxSlug(cal.nombre)} className="amx-calibre-ficha">
  {/* contenido actual */}
  <window.ReportarError tipo="calibre" titulo={cal.nombre}
    ruta={'/calibres#calibre-' + window.amxSlug(cal.nombre)} />
</article>
```

No añadir el componente a Inicio, hubs/listados, Comparador, Más, Acerca, Tutorial ni Soporte. No añadirlo al componente compartido de layout, porque eso lo haría aparecer fuera del alcance.

- [ ] **Step 4: Probar rutas y build**

Ampliar el test del helper con los seis tipos. Verificar que la ruta de calibre conserva el fragmento y que `ruta` omitida usa el pathname actual.

Run:

```powershell
node --test scripts/soporte.test.mjs; npm run build; npm test
```

Expected: PASS.

- [ ] **Step 5: Verificación manual de alcance**

Abrir una ficha real de cada tipo y comprobar el enlace prellenado sin enviar el issue. Abrir también Inicio, Arsenal, Comparador, Más, Acerca, Tutorial y Soporte para confirmar ausencia.

- [ ] **Step 6: Commit**

```powershell
git add src/components/ui.jsx src/screens/screens-2.jsx src/screens/screens-accesorios.jsx src/screens/screens-municiones.jsx src/screens/screens-3.jsx src/styles/estilo.css scripts/soporte.test.mjs; git commit -m "feat: añadir aportación de correcciones por página"
```

---

## Task 9: Prerenderizar las normas completas desde la misma fuente

**Files:**

- Create: `scripts/prerender-soporte.mjs`
- Modify: `scripts/build-prerender.mjs:41-50,416-454`
- Modify: `scripts/soporte.test.mjs`

- [ ] **Step 1: Escribir una prueba roja del HTML semántico**

Agregar:

```js
test('el prerender de Soporte contiene el manual completo sin formulario operativo', async () => {
  const { renderSoporteHtml } = await import('./prerender-soporte.mjs');
  const html = renderSoporteHtml(C);
  assert.match(html, /<h1>Normas de la comunidad<\/h1>/);
  assert.match(html, /Todos pueden contribuir a mejorar esta enciclopedia/);
  assert.match(html, /Aquí no se compra ni se vende/);
  for (const norma of C.normas) assert.match(html, new RegExp(norma.titulo));
  assert.match(html, /Cómo se moderan las reseñas/);
  assert.match(html, /Corregir información de la enciclopedia/);
  assert.match(html, /href="\/legalidad"/);
  assert.match(html, /href="\/preguntas"/);
  assert.doesNotMatch(html, /<form|type="email"|reviewId/);
});
```

Run:

```powershell
node --test scripts/soporte.test.mjs
```

Expected: FAIL porque el renderizador no existe.

- [ ] **Step 2: Crear un renderizador pequeño y puro**

`scripts/prerender-soporte.mjs` debe escapar todo texto y emitir estructura semántica:

```js
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const lista = (items) => `<ul>${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;

export function renderSoporteHtml(c) {
  return `<article>
<nav aria-label="Ruta"><a href="/">Inicio</a> › Soporte</nav>
<h1>${esc(c.titulo)}</h1>
<p>${esc(c.apertura)}</p>
<p>${esc(c.alcance)}</p>
<section aria-labelledby="limite-compraventa"><h2 id="limite-compraventa">${esc(c.venta.titulo)}</h2>
<p>${esc(c.venta.intro)}</p>${lista(c.venta.puntos)}<p>${esc(c.venta.consecuencia)}</p></section>
<section aria-labelledby="normas-comunidad"><h2 id="normas-comunidad">Normas</h2>
${c.normas.map((n) => `<section><h3>${esc(n.titulo)}</h3>${lista(n.puntos)}</section>`).join('')}</section>
<section><h2>Cómo se moderan las reseñas</h2>${lista(c.moderacion)}</section>
<section><h2>Denunciar una reseña</h2><p>${esc(c.denuncia.intro)}</p><p>${esc(c.denuncia.privacidad)}</p></section>
<section><h2>${esc(c.clasificacion.titulo)}</h2>${lista(c.clasificacion.criterios)}</section>
<section><h2>${esc(c.correccion.titulo)}</h2><p>${esc(c.correccion.intro)}</p>
${lista(c.correccion.pasos)}<h3>Fuentes aceptables</h3>${lista(c.correccion.fuentes)}</section>
<p><a href="/legalidad">Legalidad</a> · <a href="/preguntas">Preguntas frecuentes</a></p>
</article>`;
}
```

- [ ] **Step 3: Integrarlo en el build**

En `scripts/build-prerender.mjs`:

```js
import { renderSoporteHtml } from './prerender-soporte.mjs';
```

Después de cargar los datos:

```js
const SOPORTE = win.AMX_SOPORTE_CONTENT;
if (!SOPORTE || !SOPORTE.normas || SOPORTE.normas.length !== 4) {
  throw new Error('No se cargó el contenido completo de Soporte');
}
```

Dar a la entrada `soporte` de `FIJAS` una propiedad `cuerpo: renderSoporteHtml(SOPORTE)` y cambiar el loop a:

```js
cuerpo: p.cuerpo || `<article>
<nav aria-label="Ruta"><a href="/">Inicio</a> › ${esc(p.titulo)}</nav>
<h1>${esc(p.titulo)}</h1><p>${esc(p.desc)}</p></article>`,
```

- [ ] **Step 4: Probar el archivo generado, no solo el helper**

Después de `npm run build`, comprobar `out/soporte.html`:

```powershell
npm run build; node --test scripts/soporte.test.mjs; Select-String -Path out\soporte.html -Pattern 'Todos pueden contribuir','Aquí no se compra ni se vende','Independencia y conflictos de interés','href="/legalidad"'
```

Expected: cuatro coincidencias; el HTML contiene las normas aun sin ejecutar JavaScript.

- [ ] **Step 5: Commit**

```powershell
git add scripts/prerender-soporte.mjs scripts/build-prerender.mjs scripts/soporte.test.mjs; git commit -m "feat: prerenderizar las normas de soporte"
```

---

## Task 10: Sincronizar documentación y ejecutar la aceptación completa

**Files:**

- Modify: `docs/DESIGN.md:581-620` (sección de Soporte)
- Modify: `AGENTS.md` (mapa de archivos, número de datos y suites)
- Modify: `.github/copilot-instructions.md` (mismas convenciones afectadas)
- Modify: `README.md` (mapa de archivos y comandos)
- Modify: `src/pages/index.html` (versiones finales de los assets modificados)
- Modify: `src/pages/admin.html` (versiones finales de CSS, Store y Admin)
- Verify: todos los archivos modificados desde `origin/main`

- [ ] **Step 1: Cerrar el cache busting de todos los assets modificados**

Antes de la verificación final, usar el mismo sufijo nuevo `20260919a` en `src/pages/index.html` para:

```text
estilo.css
data-soporte.js
soporte.js
store.js
ui.js
screens-2.js
screens-3.js
screens-accesorios.js
screens-municiones.js
app.js
```

En `src/pages/admin.html`, usar `20260919a` para `estilo.css`, `soporte.js`, `store.js` y `admin.js`. No cambiar la versión de un asset que no se modificó. Confirmar que los diez archivos servidos tienen regla literal en `public/_headers`; los ocho preexistentes ya la tienen y la Tarea 2 añade las dos reglas nuevas.

Run:

```powershell
npm run build
```

Expected: PASS de los dos guardias: ninguna referencia local sin `?v=` y ningún JS/CSS servido sin regla literal de caché.

- [ ] **Step 2: Actualizar la documentación de arquitectura**

En `docs/DESIGN.md`, registrar como diseño vigente:

- concepto `manual de convivencia + formato de denuncia`;
- ancho aproximado de 920 px, papel fijo en oscuro y breakpoint de 1024 px;
- cuatro hojas siempre visibles y clases `.amx-soporte-*`;
- diferencia entre denuncia privada y corrección pública;
- ubicación y exclusiones de `ReportarError`;
- textos que el producto no puede prometer.

En `AGENTS.md`, `.github/copilot-instructions.md` y `README.md`, actualizar sin copiar contenido editorial:

- siete archivos `src/data/` si ese es el conteo final;
- `src/lib/soporte.js` y `scripts/prerender-soporte.mjs`;
- seis suites dentro de `npm test`;
- pruebas adicionales de Functions ejecutadas fuera de `npm test`;
- regla de no almacenar denuncias privadas en el navegador.

- [ ] **Step 3: Ejecutar la batería automatizada completa**

Run:

```powershell
npm run build; npm test; node functions/api/_lib.test.mjs; node --test functions/api/append/domain.test.mjs; node .claude/skills/conciliar-inventario/scripts/auditar.js
```

Expected: todos los comandos terminan con código 0. Si el auditor no existe en este checkout, registrar literalmente que no pudo ejecutarse; no sustituir esa evidencia con otra afirmación.

- [ ] **Step 4: Revisar seguridad de datos y afirmaciones**

Run:

```powershell
rg -n "bloqueo inmediato|reporte a las autoridades|te contamos en qué quedó|24 horas|48 horas" src scripts docs public functions
rg -n "write\(K\.reports|localStorage.*reports|reviewId.*searchParams|email.*searchParams" src
```

Expected: la primera búsqueda no encuentra afirmaciones prohibidas en la UI nueva; la segunda no encuentra persistencia ni filtración del reporte. Las menciones históricas justificadas en la especificación o el plan se revisan manualmente y no cuentan como producto.

- [ ] **Step 5: QA funcional manual**

Con DevTools, ejecutar esta matriz sin escribir en D1 remoto. Usar interceptación o un servidor local que simule las respuestas:

| Caso | Resultado esperado |
|---|---|
| Denuncia contextual desde arma | Soporte recibe ficha, autor y extracto; enfoca el encabezado |
| Denuncia contextual desde accesorio | Mismo contrato, tipo `accesorio` |
| Recarga de `/soporte` | No reaparece contexto privado; el formulario manual sigue disponible |
| Anónima válida + `200` | Muestra el texto exacto de éxito y limpia campos |
| Con correo válido + `200` | Igual; el correo nunca aparece en URL ni `localStorage` |
| `400` | Mensaje honesto; conserva los campos y ofrece `Reintentar` |
| `503` | Igual, sin éxito falso |
| Pérdida de red | Igual, sin éxito falso |
| Admin después de hidratar mock | Muestra entidad, ids, extracto, motivo, detalle y correo opcional |
| Resolver denuncia | Desaparece de la cola; no retira la reseña automáticamente |
| Corrección en seis tipos | Abre GitHub en nueva pestaña con tipo, nombre y página prellenados |
| Páginas excluidas | No muestran `ReportarError` |

- [ ] **Step 6: QA visual y accesible**

Revisar 360, 375, 440, 1024 y 1440 px, cada uno en claro y oscuro:

- exactamente un `h1`, jerarquía de encabezados sin saltos y landmarks claros;
- navegación completa con Tab/Shift+Tab, foco visible y orden igual al visual;
- labels, `aria-describedby`, `aria-live` y `role="alert"` operativos;
- 44 × 44 px mínimos y texto de 12 px o mayor;
- cuatro hojas apiladas bajo 1024 y 2 × 2 desde 1024;
- portada, aviso, carbón, formulario y directorio se distinguen sin depender solo de color o bordes;
- papel claro legible en modo oscuro, sin desbordamiento horizontal;
- respeto a `prefers-reduced-motion` y sin movimiento ambiental.

Guardar una captura por combinación representativa: 360 claro, 375 oscuro, 1024 claro y 1440 oscuro. Compararlas con la captura previa y con `docs/DESIGN.md`.

- [ ] **Step 7: Inspeccionar el diff y el estado Git**

Run:

```powershell
git diff --check; git grep -nE '^(<<<<<<<|>>>>>>>) '; git ls-files -u; git diff --stat origin/main...HEAD; git status --short
```

Expected:

- `git diff --check` sin salida;
- búsqueda de marcadores sin coincidencias;
- `git ls-files -u` vacío;
- el stat solo contiene archivos de este plan;
- el estado solo muestra la actualización documental aún sin commit.

- [ ] **Step 8: Commit documental final**

```powershell
git add docs/DESIGN.md AGENTS.md .github/copilot-instructions.md README.md src/pages/index.html src/pages/admin.html; git commit -m "docs: registrar arquitectura y cache de soporte"
```

- [ ] **Step 9: Evidencia final antes de pedir PR**

Run:

```powershell
git status --short --branch; git log --oneline --decorate origin/main..HEAD; git diff --stat origin/main...HEAD
```

Expected: worktree limpio, lista de los diez commits de tarea y un diff limitado al rediseño de Soporte, sus pruebas y documentación. No hacer push, abrir PR, fusionar ni desplegar hasta que Saulo lo solicite explícitamente.

## Definition of Done

- `/soporte` presenta el aviso aprobado, el límite de compraventa, cuatro hojas visibles, moderación real, denuncia privada y corrección pública.
- La sección documenta fuentes y criterios de clasificación, incluida la diferencia entre inventario citado y existencia en tiempo real.
- Un fabricante, distribuidor, tienda, club o campo de tiro no puede reseñar algo relacionado, pero sí puede proponer información factual declarando su relación y sus fuentes.
- Las opiniones negativas fundadas están protegidas por el texto visible.
- El formulario nunca comunica éxito sin `2xx`, no persiste datos privados localmente y reintenta desde memoria.
- El backend rechaza payloads inválidos antes de D1 y guarda solo ocho campos permitidos más metadatos del servidor.
- Admin ofrece contexto suficiente y resolver no retira automáticamente una reseña.
- El Issue Form es específico, público y manual; el PR es opcional y posterior a la revisión.
- `ReportarError` aparece solo al final de arma, accesorio, munición, calibre, Legalidad y FAQ.
- El HTML de `/soporte` contiene el contenido editorial completo sin JavaScript.
- Build, pruebas, auditoría disponible, revisión de seguridad, teclado, contraste y capturas visuales aportan evidencia verificable.
