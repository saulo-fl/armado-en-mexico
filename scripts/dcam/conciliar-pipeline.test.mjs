// Pruebas de la espera al PR de inventario previo (esperar_pr_previo en
// scripts/dcam/conciliar-pipeline.sh). Contrato: con otro PR abierto de rama
// auto/inventario-* (distinta de la propia) no se corta la rama; se avisa una vez,
// se reintenta cada DCAM_ESPERA_INTERVALO s y al vencer DCAM_ESPERA_MAX se falla
// con motivo. Si gh falla no se arranca a ciegas. `gh` es un falso en el PATH.
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
const RAMA = 'auto/inventario-23-OCT-2026';
const PREVIO = { number: 414, headRefName: 'auto/inventario-22-OCT-2026', url: 'https://github.com/x/y/pull/414' };
const OTRO = { number: 420, headRefName: 'infra/algo', url: 'https://github.com/x/y/pull/420' };
const MISMA = { number: 415, headRefName: RAMA, url: 'https://github.com/x/y/pull/415' };

// Falso gh: responde la línea N de $T/respuestas en la llamada N (la última se
// repite). «FALLA» = sale con 1. Anota sus argumentos en $T/gh-args.
const GH_FALSO = `#!/usr/bin/env bash
T="$(dirname "$0")"
echo "$*" >>"$T/gh-args"
n=$(( $(cat "$T/n" 2>/dev/null || echo 0) + 1 )); echo "$n" >"$T/n"
total=$(wc -l <"$T/respuestas")
linea=$(sed -n "$(( n < total ? n : total ))p" "$T/respuestas")
[ "$linea" = FALLA ] && { echo "gh: error de red" >&2; exit 1; }
printf '%s\\n' "$linea"
`;

function correr(respuestas, { intervalo = '1', max = '30' } = {}) {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'dcam-espera-'));
  fs.writeFileSync(path.join(t, 'gh'), GH_FALSO, { mode: 0o755 });
  fs.writeFileSync(path.join(t, 'respuestas'),
    respuestas.map((r) => (r === 'FALLA' ? r : JSON.stringify(r))).join('\n') + '\n');
  // Solo la función, sacada del script (llega hasta la primera «}» en columna 0).
  const fn = execFileSync('awk', ['/^esperar_pr_previo\\(\\)\\{/,/^}/', SCRIPT], { encoding: 'utf8' });
  const arnes = `set -uo pipefail
LOG="$T/log"; GH_REPO=x/y; RAMA=${RAMA}; FECHA=23-OCT-2026; MOTIVO=""
log(){ echo "$*" >>"$LOG"; }
telegram(){ echo "$*" >>"$T/tg"; }
# gh como función que lo corre con bash: no necesita permiso de ejecución en
# $T (en la jaula /tmp va montado noexec y el falso no corría).
gh(){ bash "$T/gh" "$@"; }
${fn}
declare -F esperar_pr_previo >/dev/null || { echo "SIN_FUNCION"; exit 99; }
esperar_pr_previo; rc=$?
echo "rc=$rc"; echo "motivo=$MOTIVO"
`;
  const r = spawnSync('bash', ['-c', arnes], {
    encoding: 'utf8',
    env: { ...process.env, T: t, PATH: `${t}:${process.env.PATH}`,
      DCAM_ESPERA_INTERVALO: intervalo, DCAM_ESPERA_MAX: max },
  });
  const leer = (f) => (fs.existsSync(path.join(t, f)) ? fs.readFileSync(path.join(t, f), 'utf8') : '');
  const salida = { out: r.stdout, tg: leer('tg').trim().split('\n').filter(Boolean),
    llamadas: Number(leer('n') || 0), args: leer('gh-args'), log: leer('log') };
  fs.rmSync(t, { recursive: true, force: true });
  return salida;
}

test('el script pasa bash -n', () => {
  execFileSync('bash', ['-n', SCRIPT]);
});

test('otro PR de inventario abierto → avisa, espera y reanuda cuando se cierra', () => {
  const r = correr([[PREVIO, OTRO], [PREVIO, OTRO], [OTRO]]);
  assert.match(r.out, /^rc=0$/m, r.out);
  assert.equal(r.llamadas, 3);
  assert.match(r.args, /pr list --repo x\/y --state open/);
  assert.equal(r.tg.length, 2, r.tg.join('\n'));
  assert.equal(r.tg[0], '⏸️ Inventario DCAM 23-OCT-2026 en espera: el PR #414 (22-OCT-2026) sigue abierto. Arranco solo en cuanto lo fusiones o cierres.');
  assert.match(r.tg[1], /^▶️ Inventario DCAM 23-OCT-2026: .*reanudo\.$/);
});

test('solo está abierto el PR de la misma rama (relanzamiento) → no espera ni avisa', () => {
  const r = correr([[MISMA, OTRO]]);
  assert.match(r.out, /^rc=0$/m, r.out);
  assert.equal(r.llamadas, 1);
  assert.deepEqual(r.tg, []);
});

test('nada abierto → sigue sin avisar', () => {
  const r = correr([[]]);
  assert.match(r.out, /^rc=0$/m, r.out);
  assert.deepEqual(r.tg, []);
});

test('el PR previo nunca se cierra → falla al tope con motivo, un solo aviso', () => {
  const r = correr([[PREVIO]], { intervalo: '1', max: '2' });
  assert.match(r.out, /^rc=1$/m, r.out);
  assert.match(r.out, /^motivo=PR previo #414 sigue abierto tras 2 s$/m);
  assert.ok(r.llamadas >= 2, `llamadas=${r.llamadas}`);
  assert.equal(r.tg.length, 1);
});

test('gh falla y luego responde → reintenta, no arranca a ciegas', () => {
  const r = correr(['FALLA', 'FALLA', [OTRO]]);
  assert.match(r.out, /^rc=0$/m, r.out);
  assert.equal(r.llamadas, 3);
  assert.match(r.log, /gh pr list falló/);
});

test('gh falla siempre → falla al tope con motivo claro', () => {
  const r = correr(['FALLA'], { intervalo: '1', max: '1' });
  assert.match(r.out, /^rc=1$/m, r.out);
  assert.match(r.out, /^motivo=no pude consultar los PRs abiertos con gh/m);
});

test('la espera va antes del fetch y del corte de rama', () => {
  const s = fs.readFileSync(SCRIPT, 'utf8');
  const espera = s.indexOf('esperar_pr_previo || falla');
  const fetch = s.indexOf('git fetch origin', espera);
  const prep = s.indexOf('\nstep_prep || falla');
  assert.ok(espera > 0, 'no se llama a esperar_pr_previo');
  assert.ok(espera < fetch && fetch < prep, 'el fetch debe ir después de la espera y antes de step_prep');
  assert.equal(s.lastIndexOf('git fetch origin', espera), -1, 'hay un fetch antes de la espera');
});
