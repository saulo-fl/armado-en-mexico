// Pruebas de la detección de categoría de los PDFs del DCAM (categoria_pdf en
// scripts/dcam/conciliar-pipeline.sh) y de que los pasos 1 y 2 fallen con motivo
// cuando no hay nada que mapear/aplicar. Caso real: el 03-nov-2026 llegaron
// «1114146_ARM3nov26.pdf», «…_CARTS3nov26», «…_ACC3nov26»; la detección solo
// por nombre (ARMAS|CARTUCHO|ACCESORIO) no reconoció ninguno y el pipeline
// siguió vacío hasta fallar «sin motivo» en el paso 2.
// pdftotext es una función falsa: lee «<pdf>.txt» si existe (la jaula no trae
// poppler y /tmp va noexec, así que no se usan binarios falsos).
// DCAM_PIPELINE permite apuntar a otra copia (p. ej. la de origin/main).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = process.env.DCAM_PIPELINE || path.join(AQUI, 'conciliar-pipeline.sh');

const funcion = (nombre) =>
  execFileSync('awk', [`/^${nombre}\\(\\) *\\{/,/^}/`, SCRIPT], { encoding: 'utf8' });

function bash(cuerpo, t) {
  const r = spawnSync('bash', ['-c', `set -uo pipefail
LOG="$T/log"; MOTIVO=""; FECHA=03-NOV-2026; FECHA_ISO=2026-11-03
log(){ echo "$*" >>"$LOG"; }
commitear(){ return 0; }
pdftotext(){ local f="\${@: -2:1}"; [ -f "$f.txt" ] && cat "$f.txt" || return 1; }
${cuerpo}`], { encoding: 'utf8', env: { ...process.env, T: t } });
  return r.stdout + r.stderr;
}

function categoria(nombre, encabezado) {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'dcam-cat-'));
  const pdf = path.join(t, nombre);
  fs.writeFileSync(pdf, '%PDF-1.4\n');
  if (encabezado !== undefined) fs.writeFileSync(`${pdf}.txt`, encabezado);
  const out = bash(`${funcion('categoria_pdf')}
declare -F categoria_pdf >/dev/null || { echo SIN_FUNCION; exit 99; }
echo "cat=[$(categoria_pdf "$T/${nombre}")]"`, t);
  return (out.match(/^cat=\[(.*)\]$/m) || [null, `SALIDA: ${out}`])[1];
}

const ENC = (tipo) => `SECRETARIA DE LA DEFENSA NACIONAL,
DIRECCION DE COMERCIALIZACION DE ARMAMENTO Y MUNICIONES
EXISTENCIA DE ${tipo}
al cierre del día 03/ 11/ 2026
`;

test('nombres abreviados del 03-nov sin encabezado legible → por nombre', () => {
  assert.equal(categoria('1114146_ARM3nov26.pdf'), 'armas');
  assert.equal(categoria('1114147_CARTS3nov26.pdf'), 'cartuchos');
  assert.equal(categoria('1114145_ACC3nov26.pdf'), 'accesorios');
  assert.equal(categoria('1109274_acc14.pdf'), 'accesorios');
  assert.equal(categoria('1109276_carts14.pdf'), 'cartuchos');
});

test('nombres de siempre siguen funcionando', () => {
  assert.equal(categoria('1113844_ARMAS_30_OCT._2026.pdf'), 'armas');
  assert.equal(categoria('1113845_CARTUCHOS_30_OCT._2026.pdf'), 'cartuchos');
  assert.equal(categoria('1113843_ACCESORIOS_30_OCT._2026.pdf'), 'accesorios');
  assert.equal(categoria('x_MUNICIONES_1.pdf'), 'cartuchos');
});

test('el encabezado manda sobre el nombre', () => {
  assert.equal(categoria('1200001_X1.pdf', ENC('ARMAS')), 'armas');
  assert.equal(categoria('1200002_X2.pdf', ENC('MUNICIONES')), 'cartuchos');
  assert.equal(categoria('1200003_X3.pdf', ENC('ACCESORIOS')), 'accesorios');
  // Nombre engañoso: el contenido decide.
  assert.equal(categoria('1200004_ARMAS.pdf', ENC('ACCESORIOS')), 'accesorios');
});

test('«ARMAMENTO Y MUNICIONES» del membrete no confunde la categoría', () => {
  assert.equal(categoria('1200005_Z.pdf', ENC('ACCESORIOS')), 'accesorios');
});

test('PDF sin categoría reconocible → vacío (prep fallará con motivo)', () => {
  assert.equal(categoria('1113846_EXISTENCIAS_O.T.C.A._30_OCT._2026.pdf',
    `OFICINAS PARA TRAMITE DE COMERCIALIZACION DE ARTICULOS REGULADOS
EXISTENCIAS DE ARMAS, MUNICIONES Y ACCESORIOS
30 DE OCTUBRE DE 2026
`), '');
  assert.equal(categoria('ARMADO_SECRETO.pdf'), '');
  assert.equal(categoria('ACCION.pdf'), '');
});

test('paso 1 sin ningún <cat>.json → falla con motivo, no «paso 1 OK»', () => {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'dcam-m1-'));
  const out = bash(`WORKDIR="$T"; VENV=false; SCRIPTS="$T"
${funcion('step_mapeo')}
cd "$T"; step_mapeo; echo "rc=$?"; echo "motivo=$MOTIVO"`, t);
  assert.match(out, /^rc=1$/m, out);
  assert.match(out, /^motivo=paso 1 sin ningún mapeo/m, out);
  assert.doesNotMatch(fs.readFileSync(path.join(t, 'log'), 'utf8'), /paso 1 OK/);
});

test('paso 2 sin mapeos → falla con motivo (antes: «sin motivo»)', () => {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'dcam-m2-'));
  const out = bash(`WORKDIR="$T"; VENV=false; SCRIPTS="$T"
${funcion('step_mecanico')}
step_mecanico; echo "rc=$?"; echo "motivo=$MOTIVO"`, t);
  assert.match(out, /^rc=1$/m, out);
  assert.match(out, /^motivo=paso 2 sin mapeos que aplicar$/m, out);
});

test('aplicar-mecanico.py falla → deja motivo', () => {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'dcam-m2b-'));
  fs.writeFileSync(path.join(t, 'mapeo-armas.json'), '{}');
  const out = bash(`WORKDIR="$T"; VENV=false; SCRIPTS="$T"
${funcion('step_mecanico')}
step_mecanico; echo "rc=$?"; echo "motivo=$MOTIVO"`, t);
  assert.match(out, /^rc=1$/m, out);
  assert.match(out, /^motivo=aplicar-mecanico\.py falló/m, out);
});

test('prep usa categoria_pdf y su fallo llega al aviso con motivo', () => {
  const s = fs.readFileSync(SCRIPT, 'utf8');
  const prep = funcion('step_prep');
  assert.match(prep, /categoria_pdf "\$pdf"/);
  assert.doesNotMatch(prep, /tr '\[:upper:\]' '\[:lower:\]'/, 'sigue el tag arbitrario por nombre');
  assert.match(s, /\nstep_prep \|\| falla "[^"\n]*\$\{MOTIVO/);
});

// ── Fecha del PDF (19-nov-2026: los PDFs del 18 se conciliaron como del 19) ──
function fechaPdf(encabezado) {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'dcam-fecha-'));
  const pdf = path.join(t, 'x.pdf');
  fs.writeFileSync(pdf, '%PDF-1.4\n');
  if (encabezado !== undefined) fs.writeFileSync(`${pdf}.txt`, encabezado);
  const out = bash(`${funcion('fecha_pdf')}
declare -F fecha_pdf >/dev/null || { echo SIN_FUNCION; exit 99; }
echo "f=[$(fecha_pdf "$T/x.pdf")]"`, t);
  return (out.match(/^f=\[(.*)\]$/m) || [null, `SALIDA: ${out}`])[1];
}

test('fecha_pdf lee «al cierre del día 18/ 11/ 2026» (con espacios, con o sin acento)', () => {
  assert.equal(fechaPdf(ENC('ARMAS').replace('03/ 11/ 2026', '18/ 11/ 2026')), '2026-11-18');
  assert.equal(fechaPdf('EXISTENCIA DE ARMAS\nal cierre del dia 3/11/2026\n'), '2026-11-03');
  assert.equal(fechaPdf('EXISTENCIA DE ARMAS\nAL CIERRE DEL DÍA 09 / 1 / 2027\n'), '2027-01-09');
});

test('fecha_pdf sin encabezado legible → vacío (prep sigue con la fecha de la señal)', () => {
  assert.equal(fechaPdf(), '');
  assert.equal(fechaPdf('EXISTENCIA DE ARMAS\nsin fecha\n'), '');
});

function prep(encabezado) {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'dcam-prep-'));
  const pdf = path.join(t, '1116983_ARMAS18.pdf');
  fs.writeFileSync(pdf, '%PDF-1.4\n');
  fs.writeFileSync(`${pdf}.txt`, encabezado);
  // git y parse_pdf falsos: el paso debe pararse ANTES de parsear si la fecha no cuadra.
  return bash(`WORKDIR="$T"; VENV=true; SCRIPTS="$T"; RAMA=auto/x; GH_REPO=o/r; PDFS="$T/1116983_ARMAS18.pdf"; mkdir -p "$T/public/inventarios"
git(){ return 0; }; gh(){ return 0; }
${funcion('categoria_pdf')}
${funcion('fecha_pdf')}
${funcion('step_prep')}
cd "$T"; step_prep; echo "rc=$?"; echo "motivo=$MOTIVO"; echo "--log"; cat "$LOG"`, t);
}

test('prep frena un PDF de otro día con motivo (señal 03-NOV, PDF del 02)', () => {
  const out = prep(ENC('ARMAS').replace('03/ 11/ 2026', '02/ 11/ 2026'));
  assert.match(out, /^rc=1$/m, out);
  assert.match(out, /^motivo=PDF 1116983_ARMAS18\.pdf es del 2026-11-02 y la señal dice 03-NOV-2026/m, out);
});

test('prep con la fecha correcta no se frena por la fecha', () => {
  const out = prep(ENC('ARMAS'));
  assert.doesNotMatch(out, /es del .* y la señal dice/, out);
  assert.match(out, /parseado armas/, out);   // pasó la fecha y llegó a parsear
});
