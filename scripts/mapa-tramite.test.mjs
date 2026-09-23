// Armado en México — contrato del mapa del trámite.
//
// El recorrido del mapa se mueve buscando nodos y flechas POR SU `id`. Si un
// paso se renombra en el SVG, nada falla a gritos: los botones SÍ / NO dejan de
// encender el camino y el diagrama se queda quieto. Esto lo caza antes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const jsx = readFileSync(fileURLToPath(new URL('../src/components/mapa-tramite.jsx', import.meta.url)), 'utf8');
const css = readFileSync(fileURLToPath(new URL('../src/styles/estilo.css', import.meta.url)), 'utf8');

// Las dos orientaciones, cada una con su SVG.
const orientaciones = {
  ancha: jsx.match(/function MapaTramiteAncho\(\)[\s\S]*?\n\}/)[0],
  alta: jsx.match(/function MapaTramiteAlto\(\)[\s\S]*?\n\}/)[0],
};

const lista = (nombre) => {
  const bloque = jsx.match(new RegExp('const ' + nombre + ' = \\[([\\s\\S]*?)\\];'))[1];
  return [...bloque.matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
};
const PASOS = lista('MAPA_PASOS');
const FLECHAS = lista('MAPA_FLECHAS');

test('las dos listas describen el diagrama que se dibuja', () => {
  assert.equal(PASOS.length, 6);
  assert.equal(FLECHAS.length, 6);
  // Los caminos solo pueden llevar a pasos y flechas que existan en las listas.
  const caminos = jsx.match(/const MAPA_CAMINO_(?:SI|NO) = \[[\s\S]*?\];/g).join('');
  for (const [, flecha] of caminos.matchAll(/flecha: '([a-z]+)'/g)) {
    assert.ok(FLECHAS.includes(flecha), `el camino usa la flecha «${flecha}», que no está en MAPA_FLECHAS`);
  }
  for (const [, paso] of caminos.matchAll(/paso: '([a-z]+)'/g)) {
    assert.ok(PASOS.includes(paso), `el camino llega al paso «${paso}», que no está en MAPA_PASOS`);
  }
});

for (const [nombre, svg] of Object.entries(orientaciones)) {
  test(`la versión ${nombre} trae los seis pasos y las seis flechas`, () => {
    for (const paso of PASOS) {
      assert.ok(svg.includes(`id="node-${paso}"`), `falta el paso «${paso}» en la versión ${nombre}`);
    }
    for (const flecha of FLECHAS) {
      assert.ok(svg.includes(`data-edge-id="${flecha}"`), `falta la flecha «${flecha}» en la versión ${nombre}`);
    }
  });

  test(`la versión ${nombre} se puede accionar y animar`, () => {
    assert.ok(svg.includes('data-camara'), 'sin grupo de cámara no hay acercamiento');
    assert.match(svg, /className="amx-mapa-boton amx-mapa-si"/);
    assert.match(svg, /className="amx-mapa-boton amx-mapa-no"/);
    // El brillo llama la atención sobre el SÍ: uno solo, y en el SÍ.
    assert.equal((svg.match(/amx-mapa-brillo/g) || []).length, 1);
    const si = svg.match(/className="amx-mapa-boton amx-mapa-si"[\s\S]*?<\/g>/)[0];
    assert.ok(si.includes('amx-mapa-brillo'), 'el brillo debe estar dentro del botón SÍ');
    // Cada botón es operable con teclado y se anuncia como botón.
    assert.equal((svg.match(/role="button"/g) || []).length, 2);
    assert.equal((svg.match(/tabIndex="0"/g) || []).length, 2);
  });

  test(`la versión ${nombre} nombra cada paso para el lector de pantalla`, () => {
    for (const paso of PASOS) {
      const caja = svg.match(new RegExp(`id="node-${paso}"[^>]*>`))[0];
      assert.match(caja, /data-node-label="[^"]{4,}"/,
        `el paso «${paso}» de la versión ${nombre} no dice cómo se llama`);
    }
  });
}

test('cada paso tiene su papel en el CSS: ninguno sale sin vestir', () => {
  const bloque = css.match(/\/\* ── MAPA DEL TRÁMITE[\s\S]*?(?=\n\.amx-v2 \.amx-ent-reiniciar)/)[0];
  for (const paso of PASOS) {
    assert.match(bloque, new RegExp(`#node-${paso}\\s+\\.nodo-caja\\s*\\{[^}]*fill:`),
      `el paso «${paso}» no tiene relleno propio en el bloque del mapa`);
  }
  // El mapa vive sobre papel: ni un token de tema, ni un color literal.
  assert.doesNotMatch(bloque, /var\(--d-/, 'el mapa no sigue al tema: solo papelería');
  assert.doesNotMatch(bloque, /(fill|stroke):\s*#[0-9a-fA-F]{3,8}/, 'ningún color literal en el mapa');
});
