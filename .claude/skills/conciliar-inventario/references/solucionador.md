# Runbook del solucionador DCAM — fallos conocidos y su arreglo

Cada entrada: **síntoma** (lo que ves en `conciliar.log` o en el mapeo), **causa**,
**arreglo**, **comprobación**. Ordenadas por frecuencia. Si el fallo de hoy no
está, añádelo al final cuando lo resuelvas.

`$S` = `.claude/skills/conciliar-inventario/scripts`, `$W` = `/tmp/dcam-pipeline-<FECHA>`.
Los PDFs de días anteriores están en `$DCAM_DIR/archivo/<AAAA-MM-DD>/`.

## A. Herramientas

- **Ligas** (`$S/ligas-<cat>.json`): `{"<nombre exacto del renglón>": fichaId|null}`.
  Ganan sobre la cadena de precios y son permanentes: sobreviven a días sin el
  producto. Todos los renglones homónimos van a la misma ficha (variantes).
- **Referencia** (`$S/referencia-<cat>.json`): foto del último PDF conciliado con su
  `fichaId` por renglón. La regenera el pipeline al cerrar (`--update-ref --ligas`).
- **Texto DCAM en el catálogo**: cada `mk(...)` (data.js), `mun(...)`
  (data-municiones.js) y `amx(...)` (data-accesorios.js) guarda el texto original
  del PDF. Buscar el renglón normalizado (mayúsculas, sin signos) en la línea del
  constructor y la siguiente es la prueba más fuerte de que ya existe ficha.
- `aplicar-mecanico.py --rehacer`: re-aplica el día sin borrar fichas nuevas.
- `verificar-cierre.py`: compuerta final (mapeo limpio + saltos de precio).

## B. Renglones «sin ficha» que no son nuevos (el fallo más común)

Antes de crear una ficha, descarta en este orden:

1. **Regreso de un agotado.** El producto no vino en los últimos PDFs; la
   referencia lo perdió. Busca su texto en el catálogo y en los PDFs archivados
   (`pdftotext -layout $DCAM_DIR/archivo/<fecha>/*ARMAS*.pdf - | grep -i …`).
   Comprueba: su precio de hoy / su último precio ≈ el aumento acumulado de las
   fichas que sí estuvieron (mismas fechas). Igual a 4–6 decimales = misma ficha.
   *Caso*: PT59 (ficha 3), ausente 25-sep → 01-oct, x1.066694 como las fichas 1, 2 y 38.
2. **Liga perdida tras una corrida fallida.** Las referencias solo se actualizan
   al cerrar; tras días fallidos quedan viejas. Mismo método: texto en catálogo.
   *Caso*: 6 cartuchos Saga/Rio (2061, 2066, 2067, 2072, 2074, 2096) perdidos
   entre el 18 y el 25-sep.
3. **Variante de una ficha existente** (otro acabado, otra longitud de cañón).
   Precedente del catálogo: los acabados de un modelo comparten ficha (PT58 inox →
   ficha 2; Jericho II C4.4 → ficha 38); en cartuchos, cada gramaje y cada
   perdigón es ficha propia.
4. **Renglón a $0**: anomalía del PDF. Liga `null` (o a su ficha, solo para
   existencias). Nunca una ficha nueva. *Caso*: Galil ACE 31 C8.5, 02-oct.

Lo que sobrevive es alta nueva.

## C. Fallos registrados

### C1. Factor espurio en el paso 1 (02-oct-2026)
- **Síntoma**: `⚠ factor fuera de rango` en el log; decenas de sinFicha; precios
  de cartuchos +10–15 %.
- **Causa**: `find_factors` comparaba todos los precios contra todos y una
  coincidencia casual (x1.155, x0.76) empataba con el aumento real (x1.0166).
  Con ese factor, renglones se emparejaban con productos ajenos.
- **Arreglo (ya en el script)**: factores solo de renglones con el mismo nombre
  en ambos PDFs, rango [0.90, 1.10], mínimo de apoyos. Si reaparece: el factor real
  del día es el mismo en armas, cartuchos y accesorios; usa el de armas.
- **Comprobación**: ningún registro de hoy salta > 3 % contra el anterior.

### C2. Dos fichas comparten un renglón; una se congela (18 → 02-oct)
- **Síntoma**: dos ids con historiales idénticos a partir de cierta fecha; una
  ficha deja de moverse.
- **Causa**: la referencia ligó el renglón de un producto a la ficha de otro.
  *Caso*: la 2101 (Excopesa E.C. M6 34 gr) recibió el renglón de la Saga Sporting
  32 M8 desde el 18-sep, mientras la 2072 (la Sporting real) se congelaba.
- **Arreglo**: liga correcta; mueve los registros mal atribuidos que puedas
  atribuir con certeza (si dos renglones tenían precio idéntico ese día, no los
  muevas y dilo). La ficha despojada vuelve a su último precio real.

### C3. Ficha duplicada (25-sep)
- **Síntoma**: dos fichas con el mismo texto DCAM.
- **Causa**: un alta creada por un agente sin buscar en el catálogo (2104 = 2074).
- **Arreglo**: mueve el historial al original, borra el `mun()`/`mk()` duplicado y
  su línea de historial (no hay bandera «oculta»). Anótalo en `correcciones`.

### C4. Variante representativa equivocada (29/30-sep)
- **Síntoma**: salto grande en una ficha con varios renglones (acabados).
- **Causa**: el precio salió de otro renglón del modelo.
- **Regla de Saulo**: manda el renglón cuyo texto es igual al `dcamRef` de la
  ficha; si ninguno, el que mejor encadena con el último precio. El script ya la
  aplica para armas (`--catalogo`); los saltos que no encadenan van a
  `revisarPrecio` y conservan el precio anterior.

### C5. Fechas en dos formatos (01-oct)
- **Síntoma**: `aplicar-mecanico.py` muere con `ValueError … 'OCT'`, o PDFs que dan
  404 en armado.mx.
- **Causa**: la señal trae `01-OCT-2026`; datos y URLs van en ISO.
- **Arreglo**: `$FECHA_ISO` para todo lo que llega a datos o a `public/inventarios/`.

### C6. El paso falla pero el log dice «OK» (30-sep)
- **Síntoma**: PR de inventario sin cambios en `src/data/`.
- **Causa**: el pipeline no corre con `set -e`; un script que muere va seguido de
  commit y «paso N OK».
- **Arreglo**: todo script del pipeline con `|| { log …; return 1; }`.

### C7. Agente cortado por tiempo o por volumen (25-sep, 02-oct)
- **Síntoma**: `cli_overall_timeout`, «sin veredicto legible».
- **Causa**: casi siempre una lista de sinFicha inflada por C1/B. No subas el
  tiempo: encoge la lista.

### C8. Método contradictorio (25-sep)
- **Síntoma**: el agente aborta citando que el SKILL y el prompt piden cosas distintas.
- **Arreglo**: si cambias un método, actualiza SKILL.md, este runbook y el agente
  en el mismo commit.

### C9. Conflictos en `mapeo-*.json` entre PRs de días seguidos
- **Causa**: cada corrida reescribe los tres mapeos de la raíz; si el PR del día
  anterior se mergea después, el nuevo choca.
- **Arreglo**: `git merge origin/main`, quédate con los de la rama (`--ours`),
  comprueba que son iguales a los de `$W`, `jq -e .` cada uno, `auditar.js`. Sin
  push forzado.

### C10. Historial editado fuera de su bloque
- **Síntoma**: `ACC_TRAMO` u otro mapa con registros de precio dentro.
- **Arreglo**: los historiales se editan solo dentro de su `*_PRICE_HISTORY`.
  Tras aplicar: `grep -c "\['[a-z]*', '[^']*', { manualId" src/data/data-accesorios.js` = 0.

## D. Altas: cómo crear una ficha

- **Armas**: `mk(<siguiente id>, …)` antes del `];` de `window.DB` (data.js), con
  capacidad/peso/longitud del modelo hermano si existe (dilo en un comentario),
  `avail` por calibre (9mm/.40/5.56/7.62 = ejército; .380 cañón largo = seguridad;
  resto civil), imagen `''`. «Riel Picatinny» en el texto → `ARMAS_CON_RIEL`.
- **Cartuchos**: `{ ...mun(<id>, …) }` en data-municiones.js con el formato de sus
  hermanos de marca; sin `priceManualId`.
- **Accesorios**: `amx(…)` más `ACC_COMPAT`, `ACC_CORTO`, `ACC_TRAMO`.
- Nombre: el producto, no el renglón; si dos fichas quedarían con nombre igual,
  distínguelas por lo que el PDF distingue (línea, gramaje, perdigón).
- Después: liga, re-mapeo, `--rehacer`, compuertas, `npm run build` (la ficha
  debe tener página).

### C11. Registro de precio idéntico a varios renglones, en fichas que no vinieron (02-oct-2026)
- **Síntoma**: una ficha tiene registro de una fecha en que su renglón **no
  aparece** en el PDF archivado; otra ficha, que sí vino, no tiene ese registro.
- **Causa**: el día del registro varios renglones tenían el mismo precio y la
  misma existencia (25-sep: Gold M6, Gold M7.5 y GB Ojeo, los tres 3000 @ 10.24);
  el emparejamiento por precio los repartió entre fichas ajenas (2015, 2078).
- **Arreglo**: si la ficha receptora **no estaba en el PDF** de esa fecha, el
  registro no es suyo: muévelo a la ficha cuyo renglón sí vino y le falta. Como los
  valores son idénticos, el contenido es cierto aunque no sepas qué copia era de
  quién. Si la receptora sí estaba en el PDF, no lo muevas (regla de C2).
- **Comprobación**: `pdftotext -layout $DCAM_DIR/archivo/<fecha>/*CART*.pdf - | grep <precio>`
  y el renglón de la receptora ausente.
