// Armado en México — pinta en el README las cifras que contó el prerender
// ============================================================================
// SOLO PINTA. No cuenta: lee `out/cifras.json`, que escribe
// `build-prerender.mjs` (§8b) porque es el único del repo que carga los
// data-*.js. Duplicar aquí la aritmética sería una cifra más que mantener.
//
// Se ejecuta con `npm run cifras`, DELIBERADAMENTE fuera de `npm run build`:
// un build que reescribe ficheros fuente ensucia el árbol de trabajo cada vez,
// y en Cloudflare no aporta nada porque allí el README no se publica.
// En CI lo dispara .github/workflows/cifras-readme.yml.
// ============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const README = join(process.cwd(), 'README.md');
const INICIO = '<!-- cifras:inicio -->';
const FIN = '<!-- cifras:fin -->';

const c = JSON.parse(readFileSync(join(process.cwd(), 'out', 'cifras.json'), 'utf8'));
const viejo = readFileSync(README, 'utf8');
const i = viejo.indexOf(INICIO);
const f = viejo.indexOf(FIN);
// Marcadores, no números de línea: cualquier edición del párrafo de arriba
// movería las cifras de sitio. Si alguien se los carga editando a mano, esto
// revienta y el workflow se pone rojo — que es justo lo que debe pasar.
if (i < 0 || f < i) throw new Error(
  `actualizar-readme: faltan los marcadores en README.md.\n`
  + `Las cifras se pintan entre «${INICIO}» y «${FIN}»; sin ellos no hay dónde.\n`
  + `Repón las dos líneas en el README (no las edites a mano por dentro: se sobrescribe).`
);

// El README está en CRLF (core.autocrlf=true en Windows) y el runner de CI usa
// LF. Escribir el bloque con el fin de línea ajeno sacaría el fichero ENTERO en
// el diff. Misma trampa que `_headers` en build-prerender.mjs:440.
const EOL = viejo.includes('\r\n') ? '\r\n' : '\n';
const bloque = [
  `Catálogo actual: **${c.armas} armas · ${c.accesorios} accesorios · ${c.municiones} municiones**,`,
  `servidas como **${c.paginas} páginas HTML prerenderizadas** para que los buscadores y los`,
  `bots de IA —que no ejecutan JavaScript— vean el contenido real. El sitemap declara`,
  `**${c.urls} URLs**, ${c.conFecha} de ellas con la fecha real de su inventario (la última, ${c.inventario}).`,
  ``,
  `<sub>Bloque generado por \`npm run cifras\` desde el propio build. No editar a mano.</sub>`,
].join(EOL);

const nuevo = viejo.slice(0, i) + INICIO + EOL + bloque + EOL + viejo.slice(f);
if (nuevo === viejo) {
  console.log('cifras: el README ya está al día');
} else {
  writeFileSync(README, nuevo, 'utf8');
  console.log(`cifras: README actualizado — ${c.armas} armas · ${c.accesorios} accesorios`
    + ` · ${c.municiones} municiones · ${c.paginas} páginas`);
}
