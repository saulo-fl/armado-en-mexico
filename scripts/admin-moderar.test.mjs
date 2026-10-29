// El panel (src/admin.jsx) modera con Store.moderar y avisa si no se guardó. Ni build ni
// smoke ejecutan los handlers, así que se vigila el código: lo que sigue es lo que
// no puede volver a aparecer (reemplazar listas desde el navegador) ni faltar (el aviso).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const admin = readFileSync(new URL('../src/admin.jsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const bloque = (desde, hasta) => {
  const i = admin.indexOf(desde);
  const f = admin.indexOf(hasta, i);
  assert.ok(i >= 0 && f > i, 'no encontré ' + desde);
  return admin.slice(i, f);
};
const reseñas = bloque('function ReviewsTab()', 'const Pulgar');
const denuncias = bloque('function ReportsTab()', 'window.ReportsTab');

test('el panel ya no llama a los métodos viejos que reemplazaban listas', () => {
  assert.doesNotMatch(admin, /Store\.(approveReview|rejectReview|unpublishReview|resolveReport)\b/);
});

test('avisarModeracion alerta con el error del servidor cuando no se guardó', () => {
  const fn = bloque('const avisarModeracion', '\n\n');
  assert.match(fn, /if \(!res\.ok\)/);
  assert.match(fn, /alert\('No se guardó \(' \+ res\.error \+ '\)\. Recarga la página e inténtalo de nuevo\.'\)/);
});

test('aprobar, rechazar y retirar son async, esperan Store.moderar, avisan y refrescan', () => {
  const casos = [
    ['aprobar', /const aprobar = async \(r\) => \{[\s\S]*?const res = await window\.Store\.moderar\('aprobar', r\.id\);\s*avisarModeracion\(res\);\s*refresh\(\);[\s\S]*?\};/],
    ['rechazar', /const rechazar = async \(r\) => \{[\s\S]*?const res = await window\.Store\.moderar\('rechazar', r\.id, motivo\);\s*avisarModeracion\(res\);\s*refresh\(\);[\s\S]*?\};/],
    ['retirar', /const retirar = async \(r\) => \{[\s\S]*?const res = await window\.Store\.moderar\('retirar', r\.id\);\s*avisarModeracion\(res\);\s*refresh\(\);[\s\S]*?\};/],
  ];
  for (const [nombre, re] of casos) assert.match(reseñas, re, nombre);
});

test('aprobar y retirar conservan su confirm y rechazar su prompt (antes de moderar)', () => {
  assert.match(reseñas, /if \(!confirm\(`¿Publicar la reseña de[^\n]*\)\) return;[\s\S]*?window\.Store\.moderar\('aprobar'/);
  assert.match(reseñas, /prompt\('Motivo del rechazo[\s\S]*?motivo === null\) return;[\s\S]*?window\.Store\.moderar\('rechazar'/);
  assert.match(reseñas, /if \(!confirm\('¿Retirar esta reseña ya publicada\?'\)\) return;[\s\S]*?window\.Store\.moderar\('retirar'/);
});

test('«Marcar resuelta» modera por id, espera, avisa y refresca', () => {
  assert.match(denuncias, /onClick=\{async \(\) => \{[\s\S]*?await window\.Store\.moderar\('resolver', d\.id\)[\s\S]*?avisarModeracion\(res\)[\s\S]*?refresh\(\)[\s\S]*?\}\}[^>]*>Marcar resuelta/);
});

test('el confirm de «Sincronizar todo» avisa que reseñas, denuncias y visitas no se suben', () => {
  const pushAll = bloque('const pushAll', 'setSyncing(true)');
  assert.match(pushAll, /Las reseñas, denuncias y visitas no se suben: las guarda el servidor\./);
});
