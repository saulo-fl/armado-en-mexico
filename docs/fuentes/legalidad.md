# De donde sale el corpus normativo de Legalidad

`src/data/data-legal.js` no se escribio a mano: se compuso el 19-sep-2026 a partir de una
investigacion con fuentes oficiales, y se conserva esta hoja para poder auditar cada
afirmacion. El juez de estos datos es **`scripts/check-legal.mjs`**: ninguna entrada pasa sin
su fundamento y su fuente, o sin ir marcada como hueco.

| Tabla | Entradas |
|---|---|
| `fuentes` | 26 |
| `normas` | 9 |
| `articulos` | 33 |
| `tramites` | 6 |
| `requisitos` | 33 |
| `entidades` | 32 |

## Las dos reglas del archivo

1. **Toda afirmacion lleva `fundamento` y `fuente`**, o va `revisar: true` con su `nota` — y
   entonces no se publica. Un hueco marcado es preferible a una afirmacion juridica inventada
   (`docs/DESIGN.md` §6b). Es la misma decision que se tomo con el `.357 Magnum`, el `.45 ACP`
   y el `5.7x28` en la guia de calibres.
2. **Cada URL, titulo y fecha se escribe una sola vez**, en `fuentes`; todo lo demas la cita
   por id, y el juez falla si un id no resuelve. Es lo que impide repetir el incidente «DCAM
   Monterrey», donde el mismo texto vivia en doce sitios y se corrigio en uno solo.

## Lo que hay que saber antes de tocarlo

- **La LFAFE se reformo el 29 de mayo de 2025** (DOF, reforma 16 de 16, en vigor al dia
  siguiente). Es la mas profunda desde 1998. Todo el contenido esta escrito sobre ese texto.
- **El instructivo del formato administrativo no se actualizo con ella.** Donde los dos no
  dicen lo mismo —calibres, tope de armas en el domicilio, candado de un anio, «forma
  migratoria FM2»— **manda la ley**, y el conflicto queda escrito en `notaVigencia`
  (decision de Saulo, 19-sep-2026).
- **El Reglamento sigue siendo el de 1972** y no se ha actualizado, pese a que el transitorio
  Tercero del decreto de 2025 dio 180 dias para hacerlo.
- **Trampa medida:** el PDF vigente del formato (edicion Civiles 2026) conserva en el pie la
  leyenda «Mayo de 2021». La fecha del pie no dice que edicion es; hay que comparar el punto 5
  del instructivo, que es donde cambiaron las cantidades de cartuchos y los periodos.
- Las cuotas de $490 y $201 son de 2026 y **caducan el 1 de enero de 2027**: el juez lo avisa
  solo, porque cada costo lleva su `anio`.

## Los 18 huecos, y por que

Ninguno se renderiza como afirmacion. Salen listados en el hub de Legalidad, bajo «que falta
por verificar», con su nota.

| Donde | Id | Por que |
|---|---|---|
| `fuente` | `acuerdo-medico-2021` | HUECO — No se pudo leer el texto íntegro: dof.gob.mx, diariooficial.gob.mx y sidof.segob.gob.mx rechazaron la conexión durante la investigación. Faltan: qué exámenes exige exactamente, quién puede aplicarlos y la vigencia del certificado. Recuperarlo desde APOLO con la nota DOF código 5616435 del 21-04-2021 y volver a fundamentar con la URL oficial. |
| `fuente` | `acuerdo-simplificacion-2026` | HUECO CRÍTICO — Nota SIDOF 5789879 (posible nota relacionada 5784083 del 06-04-2026), sin fecha exacta ni texto confirmado. Podría eliminar requisitos del DEFENSA-02-040 y del DEFENSA-02-062 (CURP impresa, acta de nacimiento, escritos libres). Verificarlo en el DOF antes de publicar la lista de requisitos. |
| `normas` | `reglamento` | Falta el mapeo artículo por artículo de qué partes del Reglamento de 1972 quedaron desplazadas por la ley reformada. Solo está verificado el conflicto general, no la lista completa. |
| `normas` | `acuerdo-medico` | HUECO — No se pudo abrir el texto en el DOF durante la investigación (código 5616435, 21-04-2021). Quedan sin verificar los exámenes exactos que exige, quién puede aplicarlos y la vigencia del certificado. Lo que sí está verificado es que el formato SEDENA-02-040 lo cita como fundamento de su requisito 4. |
| `normas` | `formato-02040` | Decidir caso por caso qué se publica del formato de 2021 y qué se corrige contra la ley de 2025. Los conflictos concretos están marcados en los límites de cada trámite y en las variantes de cada requisito. |
| `normas` | `acuerdo-simplificacion` | HUECO CRÍTICO — Sin fecha de publicación confirmada ni texto (nota SIDOF 5789879). La ficha oficial del DEFENSA-02-040 consultada el 19-09-2026 todavía pide CURP y acta de nacimiento, es decir, aún no refleja la simplificación. Verificar en el DOF antes de publicar. |
| `limite` | `pa-lim-cartuchos` | Prevalece la ley sobre el formato administrativo, pero no hay formato actualizado publicado. Decidir qué cifra se muestra y con qué advertencia. |
| `limite` | `dc-lim-turnos` | HUECO — Dato ya aprobado en el sitio, pero no confirmado en la página oficial de Comercialización de Armas, que solo dice que la adquisición es presencial y da teléfonos de 08:00 a 14:00 h. No se halló evidencia oficial de un sistema de citas ni del número de turnos. Verificar antes de sostenerlo como cifra oficial. |
| `limite` | `dc-lim-otca` | HUECO — Dato ya aprobado en el sitio; la investigación no encontró la página o el pliego oficial de la OTCA que lo respalde. Falta la fuente en gob.mx. |
| `limite` | `dc-lim-internet` | Confirmar si la modalidad sigue operando tras la prohibición del artículo 52 y con qué importes. |
| `limite` | `ra-lim-costo-viejo` | Confirmar que la ficha oficial ya no publica el importe de $47.00 antes de citar la contradicción en el sitio. |
| `limite` | `ra-lim-avisos` | Lectura resumida de la página oficial, no transcripción literal. Confirmar el texto exacto de cada aviso antes de publicarlo. |
| `limite` | `pt-lim-alcance` | Confirmar con un formato o pliego posterior a 2025 antes de publicar estas cifras como vigentes. |
| `limite` | `pt-lim-vigencia` | HUECO EN LA DURACION. La ficha oficial no publica cuantos meses dura. Saulo aporta que es de un anio y que para tiro deportivo y competencia nacional corre por anio calendario, del 1 de enero al 31 de diciembre; no se hallo fuente oficial que lo diga, asi que no se publica como afirmacion hasta confirmarlo. El formato RFA-LC-017 de 2010 deja que el solicitante indique el periodo, con un minimo de 15 dias desde la solicitud. |
| `variante` | `pa-smn/extranjero` | Se corrige la terminologia obsoleta del formato conforme a la Ley de Migracion. Queda por confirmar que condicion de estancia exige en ventanilla la DGRFAFyCE para ADQUIRIR: el art. 27 de la LFAFE exige residente permanente, pero ese articulo regula la PORTACION, no la adquisicion. Falta tambien fijar la URL de la Ley de Migracion en el catalogo de fuentes. |
| `variante` | `dc-identificacion/extranjero` | HUECO — El pliego de la DCAM para personal civil solo enumera credencial para votar, pasaporte, cartilla del SMN y cédula profesional. No dice qué identificación admite de una persona extranjera residente. Preguntar en la DCAM antes de afirmarlo. |
| `variante` | `lp-smn/militar` | HUECO — No se verificó qué documento sustituye a la cartilla para el personal militar en activo o en retiro en este trámite. |
| `requisitos` | `pc-requisitos-vigentes` | HUECO — La investigación confirmó la existencia y el marco legal del trámite (LFAFE arts. 21 a 23 y catálogo «Licencias, Clubes y Colecciones»), pero no se recuperó la ficha con la lista de requisitos ni el formato. Recuperarla antes de publicar una lista de documentos para coleccionistas. |

Los dos graves son el **Acuerdo de simplificacion de tramites de 2026**, que podria eliminar
requisitos del DEFENSA-02-040 y no se pudo leer porque el DOF rechazo la conexion, y el
**Acuerdo medico del 21-04-2021**, por lo mismo. Conviene recuperarlos desde APOLO.

## Los 14 estados sin portal verificado

Aguascalientes, Baja California, Baja California Sur, Campeche, Colima, Chiapas, Chihuahua, Durango, Guanajuato, Guerrero, Hidalgo, Jalisco, Nayarit, Nuevo León

Para esos, la pantalla dice que todavia no se ha verificado el portal, en vez de mandar a
nadie a un enlace inventado para un tramite real. Cada URL que se verifique quita un hueco sin
tocar una linea de codigo.

Las 18 entidades restantes si traen dependencia, y las 17 que ademas traen enlace responden
200, comprobado con `curl` el 19-sep-2026.

## El material de trabajo

La investigacion completa —631 hallazgos, 568 verificados, 159 URLs oficiales— vive fuera del
repo, en `contratos-legalidad/` de la carpeta del proyecto, junto con el insumo del que se
volco este archivo. No se commitea: aqui solo va lo del sitio, y cada afirmacion publicada ya
trae su fundamento y su enlace dentro de `data-legal.js`.
