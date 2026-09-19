# Rediseño de Soporte y Normas de la comunidad

**Estado:** diseño aprobado

**Fecha:** 19 de septiembre de 2026

**Ruta principal:** `/soporte`

## Resumen

La página de Soporte se convertirá en un manual de convivencia con estética de documento técnico mexicano de los años ochenta y noventa. Las normas serán el contenido principal; al final habrá un directorio breve hacia denuncias privadas, correcciones públicas, Preguntas frecuentes y Legalidad.

El trabajo también corrige dos flujos que hoy están incompletos:

1. Las denuncias de reseñas deben confirmarse únicamente después de llegar al backend y deben poder gestionarse desde el panel interno.
2. Los errores factuales deben abrir un issue público y estructurado en GitHub, con la posibilidad de que el usuario proponga después una solución mediante un pull request.

## Objetivos

- Comunicar normas breves, firmes y humanas sin tono jurídico innecesario.
- Mantener la dirección visual y las restricciones de `docs/DESIGN.md`.
- Proteger las críticas negativas hechas de buena fe.
- Separar claramente una denuncia privada de una corrección editorial pública.
- Evitar afirmaciones sobre bloqueos, sanciones o tiempos de respuesta que el sistema no puede cumplir.
- Hacer que las normas completas estén disponibles en el HTML prerenderizado.
- Ofrecer una vía de colaboración compatible con las licencias del repositorio.

## Fuera de alcance

- Cuentas, perfiles o identidad verificada.
- Bloqueo técnico de personas.
- Moderación automática o decisiones tomadas por IA.
- Plazos garantizados de revisión o respuesta.
- Creación automática de issues o pull requests mediante tokens.
- Un sistema general de tickets distinto de la cola administrativa existente.
- CAPTCHA y rate limiting; permanecen como mejora posterior documentada en `AGENTS.md`.

## Audiencia y tono

La página debe servir tanto a personas nuevas como a usuarios experimentados, fabricantes, distribuidores, clubes y campos de tiro. El lenguaje será directo, respetuoso y comprensible. No empleará vocabulario burocrático fingido, amenazas que el producto no pueda ejecutar ni términos prohibidos por la guía del repositorio.

El aviso de apertura será:

> Todos pueden contribuir a mejorar esta enciclopedia. Queremos construir un espacio seguro, respetuoso y útil para los amantes de las armas en México, sin importar su nivel de experiencia.

## Arquitectura editorial

### 1. Portada y propósito

La portada identificará la página como `Normas de la comunidad`. Debajo del aviso de apertura explicará en una frase que las normas se aplican a las reseñas, las denuncias y las aportaciones editoriales.

### 2. Límite principal: aquí no se compra ni se vende

Este aviso aparecerá antes de las demás reglas y no quedará escondido en un acordeón. Explicará que Armado en México es una enciclopedia divulgativa y que sus reseñas no pueden usarse para:

- Ofrecer, solicitar, intercambiar o intermediar la compra o venta de armas, municiones o accesorios.
- Publicar datos de contacto con el propósito de cerrar una operación.
- Promocionar rifas, sorteos, descuentos o servicios comerciales.
- Pedir o compartir instrucciones para alterar matrículas, modificar ilegalmente un arma o evadir trámites.

El texto no prometerá bloquear personas ni reportarlas automáticamente a autoridades. La acción real será no publicar o retirar el contenido y revisar internamente la denuncia.

### 3. Cuatro hojas de normas

Las reglas estarán siempre visibles y distribuidas en cuatro hojas, en una cuadrícula de dos columnas en escritorio y una sola columna en móvil.

#### Respeto y seguridad

- Debatir la experiencia o el producto, no atacar a otras personas.
- No publicar insultos, amenazas, acoso, discriminación ni provocaciones.
- No compartir nombres completos, domicilios, teléfonos, matrículas, correos ni fotografías de terceros.
- No formular acusaciones de delitos contra una persona sin una fuente pública y verificable.

#### Experiencias útiles y pertinentes

- Explicar qué se usó, en qué contexto, qué funcionó y qué no.
- Mantener la reseña relacionada con la ficha correspondiente.
- No duplicar la misma reseña en varias fichas ni utilizarla para consultas de trámite.
- Permitir críticas negativas cuando describan hechos o razones concretas. Una reseña no se retirará solo por ser desfavorable.

#### Independencia y conflictos de interés

- Fabricantes, distribuidores, tiendas, clubes y campos de tiro no pueden reseñar productos o servicios con los que tengan relación comercial o institucional.
- Una persona que recibió pago, producto, beneficio o instrucciones de una parte interesada tampoco puede presentar esa opinión como una experiencia independiente.
- Esas organizaciones sí pueden corregir o aportar información factual mediante el formulario público, siempre que declaren la relación y proporcionen fuentes.

#### Autenticidad y manipulación

- Solo se admiten experiencias propias expresadas con palabras propias.
- No se permiten reseñas copiadas, múltiples, pagadas o coordinadas para subir o bajar una calificación.
- No se admiten publicidad, enlaces promocionales, captación de clientes ni spam.

### 4. Cómo se moderan las reseñas

Se explicará el funcionamiento real:

- Toda reseña entra en una cola privada antes de publicarse.
- Una persona del equipo decide si cumple las normas.
- Aprobar una reseña elimina el correo antes de moverla al dominio público.
- Una reseña publicada puede retirarse si posteriormente se confirma un incumplimiento.
- Las opiniones negativas fundadas reciben el mismo trato que las positivas.

Las acciones comunicadas serán únicamente `no publicar`, `retirar`, `pedir información adicional cuando exista correo` y `archivar la denuncia al resolverla`.

### 5. Denunciar una reseña

El formulario privado explicará que sirve para señalar contenido comunitario, no para corregir fichas. Podrá enviarse anónimamente. El correo será opcional y solo se utilizará para solicitar información adicional o comunicar el resultado.

El mensaje posterior al éxito será:

> Revisaremos el reporte. Si dejaste un correo, podremos contactarte para pedir información adicional o comunicarte el resultado. No publicaremos tu dirección.

No se prometerá un plazo de respuesta.

### 6. Corregir información de la enciclopedia

Una sección separada explicará que los datos incorrectos se reportan públicamente en GitHub. El usuario revisará el formulario y pulsará personalmente `Submit new issue`; Armado en México no publicará nada en su nombre.

Después de que el equipo confirme el problema, podrá:

- Corregirlo internamente.
- Invitar al usuario a preparar un pull request.
- Cerrar el issue explicando por qué la información actual se conserva.

### 7. Más ayuda y contacto

El cierre enlazará únicamente a `Preguntas frecuentes`, `Legalidad`, el formulario de corrección y la denuncia privada. Esas dos últimas vías constituyen el contacto según el motivo: privado para denunciar una reseña y público para corregir información. No se inventará un correo general que el proyecto no tenga ni se convertirá la página en un centro de ayuda genérico.

## Dirección visual

El concepto es **manual de convivencia + formato de denuncia**. Debe sentirse parte del mismo archivo físico que las fichas del sitio, pero no copiar literalmente la carpeta de producto ni el apilado de FAQ.

- Título principal en cinta Dymo.
- Portada de manual sobre papel de oficio claro.
- Aviso principal como hoja recortada con un sello rojo: `Aquí no se compra ni se vende`.
- Cuatro hojas de reglas con jerarquía editorial, numeración y marcas discretas de archivo.
- Moderación y consecuencias sobre una hoja de copia al carbón.
- Formulario privado como formato desprendible.
- Directorio de ayuda como pestañas o referencias al pie, no como tarjetas genéricas.

Se usarán exclusivamente Archivo y JetBrains Mono. Las superficies físicas conservarán sus colores de papel en tema oscuro y no leerán colores desde `PALETTE` o `CLARO`. Los estilos visuales vivirán en clases `.amx-soporte-*`; los valores dependientes de datos o estado permanecerán en JSX.

No habrá gradientes, cristal, sombras grandes, animación ambiental, sellos oficiales, escudos, folios que parezcan datos reales ni bordes usados como único recurso de separación. El ancho de lectura será cercano a 920 px y habrá un único cambio estructural a 1024 px.

## Flujo de denuncia privada

### Inicio contextual

Cada reseña publicada mostrará una acción secundaria `Denunciar`. Al activarla, `OpinionBlock` enviará a `App` este contexto:

```text
reviewId
tipo de entidad
entidadId
entidadNombre
autor público
extracto de la reseña
```

`App` conservará el objeto solo en estado de React, navegará a `/soporte` y se lo pasará a `SoporteScreen`. El correo y el texto completo no se incorporarán a la URL. Si se recarga la página, el formulario seguirá disponible, pero el usuario deberá identificar manualmente la reseña.

### Campos y validación

El reporte almacenado tendrá este contrato:

```text
reviewId: string requerido para inicio contextual, opcional en captura manual
tipo: arma | accesorio | municion | campo | curso | otro
entidadId: string o número normalizado
entidadNombre: string breve
reviewExcerpt: string breve del contenido público
motivo: ilegal | irrespetuoso | fuera-de-tema | comercial | manipulacion | datos | otro
detalle: string de 20 a 1200 caracteres
email: string opcional, máximo 160 caracteres y sintaxis válida
```

El navegador validará para ayudar al usuario; el servidor repetirá la validación como autoridad, limitará tamaños, aceptará solo los motivos conocidos y descartará campos no definidos. Un payload inválido devolverá `400` y no escribirá el dominio `reports`.

### Persistencia y estados

`Store.addReport` pasará a ser una operación asíncrona específica para denuncias. No añadirá el reporte a `amx_reports_v1` ni a ningún otro almacenamiento local del visitante. Solo resolverá con éxito después de un `2xx` de `/api/append/reports`.

El formulario tendrá cuatro estados:

- `idle`: edición normal.
- `submitting`: controles deshabilitados y texto `Enviando…`.
- `success`: confirmación y limpieza de los datos sensibles.
- `error`: mensaje honesto, campos conservados en memoria y botón `Reintentar`.

Un backend ausente, una pérdida de red o una respuesta no exitosa nunca mostrarán `Denuncia recibida`.

### Gestión interna

El panel ya incluye `ReportsTab`; se ampliará en lugar de construir otro sistema. Cada tarjeta mostrará motivo, fecha, entidad, identificador y extracto de la reseña, explicación, correo opcional y estado. Ofrecerá contexto suficiente para localizar la reseña publicada y conservará `Marcar resuelta` como cierre manual. Retirar una reseña seguirá ocurriendo en la pestaña de Reseñas para no mezclar denuncia con decisión editorial.

## Flujo de corrección pública

### Acción reutilizable

Un componente `ReportarError` aparecerá al final de:

- Fichas de armas.
- Fichas de accesorios.
- Fichas de municiones.
- Cada ficha o bloque detallado de calibre.
- Legalidad.
- Preguntas frecuentes.

No aparecerá en Inicio, listados, Comparador, Más, Acerca, Tutorial ni Soporte. El texto será `¿Encontraste un dato incorrecto? Repórtalo`.

El componente recibirá `tipo`, `titulo` y la ruta canónica. Abrirá en una pestaña nueva la plantilla `correccion.yml`, con `rel="noopener noreferrer"`. El enlace codificará título, página, tipo y nombre. Los campos del Issue Form tendrán identificadores estables para aceptar esos valores como parámetros de prellenado.

### Issue Form

`.github/ISSUE_TEMPLATE/correccion.yml` definirá:

- Título inicial `[Corrección]: ` y la etiqueta existente `documentation`.
- URL o ruta exacta, prellenada y obligatoria.
- Tipo de contenido.
- Dato actual que parece incorrecto.
- Corrección propuesta.
- Fuentes que sustentan la corrección.
- Relación comercial o institucional, incluida la opción `Ninguna`.
- Disposición para aportar un pull request, sin convertirla en requisito.
- Confirmación obligatoria de que el aporte puede publicarse bajo la licencia correspondiente y no incorpora material de terceros sin permiso.

Los Issue Forms se definen como YAML en `.github/ISSUE_TEMPLATE/` y solo quedan disponibles después de llegar a la rama predeterminada. GitHub considera el `id` de cada campo su identificador para los parámetros de prellenado. Referencias: [configuración de formularios](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository) y [esquema de campos](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-githubs-form-schema).

### Fuentes aceptables

`CONTRIBUTING.md` y el formulario aplicarán esta jerarquía:

1. Información legal: DOF, Cámara de Diputados, DEFENSA u otra fuente oficial vigente.
2. Precios y existencias: inventarios oficiales de DCAM u OTCA.
3. Especificaciones: fabricante o manual oficial.
4. Historia y contexto: fuentes editoriales identificables y contrastables.

Publicaciones sociales, comentarios, capturas o páginas comerciales pueden orientar la investigación, pero no bastan por sí solas.

### Pull requests

`.github/PULL_REQUEST_TEMPLATE.md` pedirá enlazar el issue aceptado, resumir la corrección, enumerar fuentes, identificar archivos modificados y declarar la verificación ejecutada. `CONTRIBUTING.md` aclarará:

- Código: AGPL-3.0-or-later.
- Textos y estructura del catálogo: CC BY-SA 4.0.
- La persona afirma tener derecho a aportar el contenido.
- Fotografías, logotipos, manuales y documentos de terceros no se aceptan sin derechos compatibles.
- No se requiere un CLA separado.
- Abrir un issue no garantiza que la corrección sea aceptada ni obliga al usuario a programar.

## Componentes y límites técnicos

### Fuente única de contenido

Se añadirá `src/data/data-soporte.js`, un archivo de datos sin JSX que publicará `window.AMX_SOPORTE_CONTENT`. Contendrá los textos, reglas, motivos y ayudas que deben compartir la app y el prerender.

El archivo se cargará antes de `screens-2.js` en `src/pages/index.html`, con versión de caché propia, y tendrá su regla literal en `public/_headers`. `scripts/copiar-estaticos.mjs` ya copia los archivos de `src/data/`; no requiere una ruta nueva. `scripts/build-prerender.mjs` cargará el mismo archivo en su contexto `vm` y emitirá el cuerpo semántico completo de `/soporte`.

### Componentes de pantalla

`SoporteScreen` compondrá unidades con una sola responsabilidad: portada, aviso prioritario, hoja de norma, proceso de moderación, consecuencias reales, formulario de denuncia y directorio de ayuda. Esos componentes se declararán a nivel de módulo, no dentro de `SoporteScreen`, para evitar remontajes innecesarios.

`ReportarError` será una primitiva compartida en `src/components/ui.jsx`. La construcción y codificación de la URL vivirán en una función pura y comprobable, expuesta mediante `window.*` según el patrón actual del repositorio.

No se introducirán módulos ES, bundler ni dependencias.

## Accesibilidad y comportamiento adaptable

- Estructura semántica con un solo `h1`, títulos jerárquicos, listas y regiones identificables.
- `label` asociado a cada campo; ayuda y errores enlazados mediante `aria-describedby`.
- Mensajes de éxito y error anunciados con una región viva apropiada.
- Foco visible y colocado en el encabezado del formulario después de navegar desde una reseña.
- Controles de al menos 44 × 44 px y texto de al menos 12 px.
- Orden de tabulación equivalente al orden visual.
- Estado de envío comunicado por texto además de color.
- Cuatro hojas en 2 × 2 por encima de 1024 px y apiladas por debajo.
- Papeles legibles y claros en tema oscuro; fondo exterior adaptado al tema.
- Sin movimiento automático y respetando `prefers-reduced-motion` si se añade alguna transición funcional.

## SEO y prerender

`/soporte` dejará de prerenderizar únicamente título y descripción. El HTML crudo incluirá:

- Aviso de apertura.
- Límite de compraventa.
- Cuatro grupos de reglas.
- Proceso de moderación.
- Explicación de denuncias y correcciones.
- Enlaces internos a Legalidad y Preguntas frecuentes.

El prerender no incluirá el formulario operativo ni datos de una reseña. React seguirá reemplazando el contenido estático al montar, conforme al funcionamiento actual. El texto procederá de la misma fuente que la pantalla para evitar divergencias.

## Archivos previstos

- `src/data/data-soporte.js` — contenido compartido.
- `src/pages/index.html` y `public/_headers` — carga y caché del dato nuevo.
- `src/screens/screens-2.jsx` — Soporte, arma, Legalidad, FAQ y reseñas.
- `src/screens/screens-accesorios.jsx` — acción en ficha.
- `src/screens/screens-municiones.jsx` — acción en ficha.
- `src/screens/screens-3.jsx` — acción en calibres.
- `src/app.jsx` — contexto temporal de denuncia.
- `src/components/ui.jsx` — acción reutilizable y constructor de URL.
- `src/lib/store.js` — envío confirmado de denuncias.
- `src/admin.jsx` — contexto en la cola interna.
- `src/styles/estilo.css` — skin `.amx-soporte-*`.
- `functions/api/_lib.js` y su prueba — validación del reporte.
- `scripts/build-prerender.mjs` y una prueba de Soporte — HTML semántico.
- `.github/ISSUE_TEMPLATE/correccion.yml` — corrección pública.
- `.github/PULL_REQUEST_TEMPLATE.md` y `CONTRIBUTING.md` — colaboración.

## Estrategia de pruebas

### Automatizadas

- Aceptar un reporte válido y normalizar únicamente sus campos permitidos.
- Rechazar motivos desconocidos, detalle corto o largo, correo inválido y payloads sobredimensionados.
- Verificar que una validación fallida no modifica `reports`.
- Construir correctamente la URL de GitHub, incluidos acentos, espacios, rutas y caracteres reservados.
- Comprobar que la plantilla contiene los campos y confirmaciones obligatorios.
- Verificar que `/soporte` prerenderizado contiene los encabezados y reglas clave.
- Mantener verdes `npm test` y `node --test functions/api/_lib.test.mjs`.

### Manuales

- Denuncia contextual desde una reseña publicada.
- Denuncia manual anónima y con correo.
- Éxito real, respuesta `400`, respuesta `503` y pérdida de red.
- Aparición del reporte en Admin y resolución sin retirar automáticamente la reseña.
- Enlace de corrección desde cada tipo de página incluido y ausencia en las excluidas.
- Revisión visual a 360, 375, 440, 1024 y 1440 px, en temas claro y oscuro.
- Recorrido completo con teclado y comprobación de foco.
- Inspección del HTML generado antes de ejecutar JavaScript.

Antes del commit de implementación deberán pasar:

```text
npm run build
npm test
node --test functions/api/_lib.test.mjs
node .claude/skills/conciliar-inventario/scripts/auditar.js
```

## Secuencia de entrega

1. Añadir pruebas y fuente única de contenido.
2. Crear Issue Form, guía de contribución y plantilla de pull request.
3. Implementar validación del servidor y envío privado confirmado.
4. Transportar el contexto desde las reseñas y ampliar la cola administrativa.
5. Construir el rediseño visual de `/soporte`.
6. Añadir `ReportarError` a las páginas acordadas.
7. Integrar el contenido completo en el prerender.
8. Ejecutar pruebas técnicas, auditoría, accesibilidad y revisión visual.

La implementación se hará en una rama de tarea. Ningún merge a `main`, despliegue, escritura remota en D1 ni publicación en producción forma parte automática de este diseño; requiere la aprobación correspondiente.

## Criterios de aceptación

- Las normas son visibles sin acordeones y respetan `docs/DESIGN.md`.
- La apertura usa exactamente el aviso aprobado.
- La página no promete bloqueo, reporte automático ni plazo de respuesta.
- Las críticas negativas fundadas están protegidas expresamente.
- Los conflictos comerciales impiden reseñar, pero no aportar correcciones factuales revisables.
- Una denuncia exitosa existe en D1 y puede gestionarse en Admin.
- Una denuncia fallida permanece únicamente en memoria para reintentar.
- El botón de error abre el formulario correcto con contexto prellenado.
- Ninguna corrección modifica automáticamente la web.
- La contribución opcional por pull request queda sujeta a fuentes y licencias.
- El contenido completo de normas existe en el HTML prerenderizado.
- La experiencia funciona con teclado, en móvil, escritorio y tema oscuro.
- Build, pruebas, auditoría y revisión visual terminan sin fallos atribuibles al cambio.

## Decisiones cerradas

No quedan decisiones funcionales abiertas en esta especificación. Cualquier ampliación de alcance —cuentas, bloqueos, Turnstile, moderación automática o SLA— requerirá un diseño separado.
