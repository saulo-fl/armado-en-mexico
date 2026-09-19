import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('el Issue Form pide contexto, fuentes, relación y derechos', () => {
  const yml = read('../.github/ISSUE_TEMPLATE/correccion.yml');
  for (const id of ['pagina', 'tipo', 'nombre', 'dato_actual', 'correccion', 'fuentes', 'relacion', 'pull_request', 'derechos']) {
    assert.match(yml, new RegExp(`id: ${id}\\b`));
  }
  assert.match(yml, /labels:\s*\[documentation\]/);
  assert.match(yml, /required:\s*true/);
});

test('las guías separan issue, revisión y PR opcional', () => {
  const contributing = read('../CONTRIBUTING.md');
  const pull = read('../.github/PULL_REQUEST_TEMPLATE.md');
  assert.match(contributing, /AGPL-3\.0-or-later/);
  assert.match(contributing, /CC BY-SA 4\.0/);
  assert.match(contributing, /No se requiere.*CLA/i);
  assert.match(pull, /issue/i);
  assert.match(pull, /fuentes/i);
  assert.match(pull, /verificaci/i);
});
