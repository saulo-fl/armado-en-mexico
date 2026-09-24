// El 19-sep se publicó la ficha de arma en blanco por dos referencias que no
// existían: una prop que app.jsx pasaba y el componente no declaraba en su
// firma, y un `idx` que solo vive dentro de una función de app.jsx. Las dos son
// lo mismo —un identificador sin nada detrás— y las dos revientan solo al
// RENDERIZAR: el build compila feliz y el prerender no ejecuta los componentes,
// así que nadie se entera hasta que el navegador tira el árbol de React y deja
// la pantalla vacía.
//
// Los .jsx del sitio son scripts de navegador, no módulos: comparten el scope
// global. Por eso el test junta primero lo que declara CADA archivo y solo
// entonces exige que toda referencia se resuelva contra ese conjunto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse = _traverse.default || _traverse;

const raiz = new URL('../src/', import.meta.url);
const archivos = ['.', 'screens', 'components'].flatMap((d) =>
  readdirSync(new URL(d + '/', raiz)).filter((f) => f.endsWith('.jsx'))
    .map((f) => [(d === '.' ? '' : d + '/') + f, readFileSync(new URL((d === '.' ? '' : d + '/') + f, raiz), 'utf8')]));

// Lo que el navegador ya trae, más lo que el sitio carga por <script> aparte
// (React por CDN, los datos y las libs de src/lib como window.Store).
const DEL_NAVEGADOR = new Set(['window', 'document', 'navigator', 'location', 'history', 'console', 'React', 'ReactDOM',
  'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Date', 'RegExp', 'Promise', 'Set', 'Map', 'Error',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent', 'fetch', 'URL',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame',
  'localStorage', 'sessionStorage', 'IntersectionObserver', 'ResizeObserver', 'MutationObserver', 'CustomEvent',
  'Intl', 'structuredClone', 'queueMicrotask', 'globalThis', 'undefined', 'NaN', 'Infinity',
  'alert', 'confirm', 'prompt', 'Blob', 'FileReader', 'getComputedStyle']);

const ast = (src) => parse(src, { sourceType: 'script', errorRecovery: true, plugins: ['jsx'] });

// Paso 1: todo lo que los .jsx declaran arriba del todo es global del sitio.
const declarado = new Set(DEL_NAVEGADOR);
for (const [, src] of archivos) {
  traverse(ast(src), { Program(path) { for (const n of Object.keys(path.scope.bindings)) declarado.add(n); path.stop(); } });
}

test('ninguna referencia se queda sin nada detrás', () => {
  const sueltas = [];
  for (const [nombre, src] of archivos) {
    traverse(ast(src), {
      Program(path) {
        for (const ident of Object.keys(path.scope.globals || {})) {
          if (declarado.has(ident)) continue;
          const linea = path.scope.globals[ident].loc ? path.scope.globals[ident].loc.start.line : '?';
          sueltas.push(`${nombre}:${linea} → "${ident}" no está declarado en ninguna parte`);
        }
        path.stop();
      },
    });
  }
  assert.deepEqual(sueltas, []);
});
