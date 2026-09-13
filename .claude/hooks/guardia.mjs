#!/usr/bin/env node
// GUARDIA DEL ARNÉS — hook PreToolUse para Bash y PowerShell (13-sep-2026).
//
// Por qué existe: las reglas `deny` de settings casan por PREFIJO y solo miran la
// herramienta Bash. `git -C ruta push --force`, `git push origin main --force` o
// cualquier cosa lanzada desde PowerShell —la consola principal de HEFESTO— se
// las saltaban. Este guardia lee el comando ENTERO, trocea por operadores fuera
// de comillas y decide por lo que de verdad se ejecuta.
//
// Qué devuelve: `deny` (no se ejecuta), `ask` (lo decide Saulo) o nada (sigue el
// flujo normal de permisos). Si el propio guardia falla, sale con código 1: el
// error se ve en la sesión pero NO bloquea — hay varias sesiones a la vez sobre
// este proyecto y un fallo aquí no debe pararlas todas.
//
// Perfiles: la entrada del hook trae `agent_type` cuando llama un subagente
// (medido). Sin agent_type es la sesión principal → perfil `base`.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PERFILES = {
  'revisor-armado': 'lectura', 'auditor-a11y-perf': 'lectura', 'auditor-estructura': 'lectura',
  'impeccable-finish-reviewer': 'lectura', Explore: 'lectura', Plan: 'lectura',
  'conciliador-inventario': 'trabajo', 'preparador-imagenes': 'trabajo', 'disenador-oficial': 'trabajo',
  'impeccable-asset-producer': 'trabajo', 'impeccable-manual-edit-applier': 'trabajo',
  'impeccable-documenter': 'trabajo',
  'deploy-develop': 'develop',
  // deploy-main y la sesión principal: base.
};
const PROTEGIDAS = new Set(['main', 'develop']);

// ── troceado: tokens y segmentos, respetando comillas de bash y de PowerShell ──
export function segmentos(texto) {
  const segs = [[]];
  let tok = null, q = null;
  const cortar = (op) => { if (tok !== null) segs.at(-1).push(tok); tok = null; if (segs.at(-1).length) segs.push([]); segs.at(-1).op = op; };
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (q) {
      if (c === q && !(q === "'" && texto[i + 1] === "'")) q = null;
      else if (c === q) { tok += "'"; i++; }                  // '' dentro de '…' en PowerShell
      else if ((c === '\\' || c === '`') && q === '"' && texto[i + 1] === '"') { tok += '"'; i++; }
      else tok += c;
      continue;
    }
    if (c === '"' || c === "'") { q = c; tok ??= ''; continue; }
    if ((c === '\\' || c === '`') && texto[i + 1] === '\n') { i++; continue; }
    if (texto.startsWith('&&', i) || texto.startsWith('||', i)) { cortar(texto.slice(i, i + 2)); i++; continue; }
    if (';\n|(){}'.includes(c)) { cortar(c); continue; }
    if (/\s/.test(c)) { if (tok !== null) segs.at(-1).push(tok); tok = null; continue; }
    tok = (tok ?? '') + c;
  }
  if (tok !== null) segs.at(-1).push(tok);
  return segs.filter((s) => s.length);
}

const nombre = (t) => (t.split(/[\\/]/).pop() || '').toLowerCase().replace(/\.(exe|cmd|bat|ps1)$/, '');
const aRutaWin = (p) => p.replace(/^\/([a-zA-Z])\//, '$1:/');

// ── reglas ──────────────────────────────────────────────────────────────────
function revisarGit(args, dir, perfil, ctx, sale) {
  let i = 0;
  for (; i < args.length && args[i].startsWith('-'); i++) {
    if (args[i] === '-C') dir = path.resolve(dir, aRutaWin(args[++i] ?? ''));
    else if (args[i] === '-c') i++;
  }
  const sub = args[i], resto = args.slice(i + 1);
  const opts = resto.filter((a) => a.startsWith('-'));
  const tiene = (...f) => opts.some((o) => f.some((x) => o === x || o.startsWith(x + '=')));
  const corto = (letra) => opts.some((o) => /^-[a-zA-Z]+$/.test(o) && o.includes(letra));

  if (perfil === 'lectura') {
    const escribe = ['commit', 'push', 'merge', 'rebase', 'reset', 'checkout', 'switch', 'cherry-pick', 'revert',
      'am', 'apply', 'clean', 'rm', 'mv', 'add', 'restore', 'filter-branch', 'update-ref', 'gc', 'prune'];
    if (escribe.includes(sub)) return sale('deny', `perfil lectura: \`git ${sub}\` escribe en el repo; este agente solo informa`);
    if (['branch', 'tag'].includes(sub) && resto.some((a) => !['-a', '-r', '--list', '-l', '-v', '-vv', '--all', '--show-current', '--contains', '--merged'].includes(a)))
      return sale('deny', `perfil lectura: \`git ${sub}\` con argumentos crea o borra; este agente solo informa`);
    if (sub === 'stash' && !['list', 'show'].includes(resto[0])) return sale('deny', 'perfil lectura: `git stash` escribe');
    if (sub === 'worktree' && ['add', 'remove', 'move', 'prune'].includes(resto[0])) return sale('deny', 'perfil lectura: `git worktree` escribe');
  }

  if (sub === 'push') {
    if (tiene('--force', '--force-with-lease', '--force-if-includes') || corto('f'))
      sale('deny', '`git push` forzado: reescribe historia remota. Si hace falta, lo hace Saulo a mano');
    if (tiene('--delete', '--prune') || corto('d')) sale('deny', '`git push` que BORRA ramas remotas: lo hace Saulo a mano');
    if (tiene('--all', '--mirror')) sale('deny', '`git push --all/--mirror` empuja todas las ramas, main incluida');
    const pos = [];
    for (let k = 0; k < resto.length; k++) {
      if (['--repo', '-o', '--push-option', '--receive-pack', '--exec'].includes(resto[k])) { k++; continue; }
      if (!resto[k].startsWith('-')) pos.push(resto[k]);
    }
    const refspecs = pos.slice(1);
    if (!refspecs.length) refspecs.push('HEAD');
    for (const r of refspecs) {
      if (r.startsWith('+')) sale('deny', `refspec forzado \`${r}\``);
      if (r.startsWith(':')) sale('deny', `refspec que borra \`${r}\``);
      let destino = r.replace(/^\+/, '').split(':').pop().replace(/^refs\/heads\//, '');
      if (destino === 'HEAD') destino = ctx.rama(dir) ?? '';
      if (PROTEGIDAS.has(destino)) sale('deny', `push directo a \`${destino}\`: a main y develop solo se llega por PR`);
    }
  }
  if (sub === 'reset' && tiene('--hard')) sale('deny', '`git reset --hard` tira trabajo sin commitear, y aquí trabajan varias sesiones a la vez');
  if (sub === 'clean' && (corto('f') || tiene('--force'))) sale('deny', '`git clean -f` borra archivos sin versionar de otras sesiones');
  if (sub === 'branch' && (resto.includes('-D') || (tiene('--delete') && tiene('--force')) || opts.some((o) => /^-[a-zA-Z]*D/.test(o))))
    sale('deny', '`git branch -D` borra ramas sin mergear');
  if (['filter-branch', 'filter-repo'].includes(sub)) sale('deny', `\`git ${sub}\` reescribe la historia`);
  if (sub === 'checkout' && (resto.includes('--') || resto.includes('.'))) sale('ask', '`git checkout -- …` descarta cambios locales, quizá de otra sesión');
  if (sub === 'restore' && (!resto.includes('--staged') || tiene('--worktree') || corto('W')))
    sale('ask', '`git restore` descarta cambios locales, quizá de otra sesión');
  if (sub === 'stash' && (!resto.length || ['pop', 'drop', 'clear'].includes(resto[0])))
    sale('ask', '`git stash` usa una pila COMPARTIDA con las demás sesiones y worktrees');
  if (sub === 'worktree' && resto[0] === 'remove' && (resto.includes('--force') || resto.includes('-f')))
    sale('ask', '`git worktree remove --force` borra un worktree con cambios');
}

function revisarGh(args, perfil, ctx, sale) {
  const [a, b] = args;
  if (a === 'auth' && ['token', 'logout', 'refresh'].includes(b)) return sale('deny', `\`gh auth ${b}\` expone o toca la credencial de GitHub`);
  if (a === 'repo' && ['delete', 'rename', 'archive'].includes(b)) return sale('deny', `\`gh repo ${b}\``);
  const escrituraApi = a === 'api' && (() => {
    for (let k = 1; k < args.length; k++) {
      const m = args[k].match(/^(?:-X|--method)=?(.*)$/);
      if (m) return (m[1] || args[k + 1] || '').toUpperCase() !== 'GET';
    }
    return args.some((x) => ['-f', '-F', '--field', '--raw-field', '--input'].includes(x));
  })();
  if (perfil === 'lectura' && (escrituraApi || (['pr', 'issue', 'release', 'repo', 'ruleset'].includes(a) && !['view', 'list', 'diff', 'checks', 'status'].includes(b))))
    return sale('deny', `perfil lectura: \`gh ${a} ${b ?? ''}\` escribe en GitHub`);
  if (escrituraApi) sale(perfil === 'trabajo' ? 'deny' : 'ask', '`gh api` con escritura: es el mismo poder que la web de GitHub, por otro transporte');
  if (a === 'pr' && b === 'merge') {
    if (perfil === 'trabajo') return sale('deny', 'este agente deja la rama lista; mergear es de Saulo o de los agentes de deploy');
    if (perfil === 'develop') {
      const num = args.slice(2).find((x) => !x.startsWith('-'));
      const base = ctx.basePr(num);
      if (base !== 'develop') return sale('deny', `deploy-develop solo mergea a develop, y este PR va a \`${base ?? '¿?'}\``);
    }
    sale('ask', '`gh pr merge`: si el PR va a main, publica en armado.mx');
  }
  if (a === 'pr' && b === 'create' && perfil === 'develop') {
    const i = args.findIndex((x) => x === '--base' || x === '-B');
    const base = i >= 0 ? args[i + 1] : (args.find((x) => x.startsWith('--base=')) ?? '').slice(7) || 'main';
    if (base !== 'develop') sale('deny', `deploy-develop no abre PR a \`${base}\` (sin --base, gh apunta a main)`);
  }
}

function revisarWrangler(args, perfil, sale) {
  const txt = args.join(' ');
  if (/^auth token/.test(txt)) return sale('deny', '`wrangler auth token` imprime la credencial de Cloudflare en la sesión');
  const remoto = args.includes('--remote');
  const escribe = (/^d1 (execute|migrations apply)/.test(txt) && remoto) || /^d1 delete|^(pages )?deploy|^pages project delete|^secret |^kv .*(put|delete)/.test(txt);
  if (!escribe) return;
  if (perfil !== 'base') return sale('deny', `perfil ${perfil}: \`wrangler ${args.slice(0, 2).join(' ')}\` escribe en Cloudflare de producción`);
  sale('ask', `\`wrangler ${args.slice(0, 2).join(' ')}\`: D1 de producción (la comparten los previews) o despliegue directo`);
}

export function evaluar({ command = '', agent_type = '', cwd = '.' }, ctx) {
  const perfil = PERFILES[agent_type] ?? 'base';
  const hallazgos = [];
  const sale = (decision, motivo) => { hallazgos.push({ decision, motivo }); };
  const vars = Object.fromEntries([...command.matchAll(/\$(\w+)\s*=\s*(["'])(.*?)\2/g)].map((m) => [m[1].toLowerCase(), m[3]]));
  let dir = cwd;

  const analizar = (texto) => {
    for (const seg of segmentos(texto)) {
      // `$gh="…\gh.exe"; & $gh pr merge` y `git -C $g push`: se sustituyen las
      // variables asignadas en el mismo comando. ponytail: las de otra llamada
      // (el estado de PowerShell no persiste) no se ven; tampoco `node -e`/`python -c`,
      // que ya no están autorizados y pasan por el flujo normal de permisos.
      let t = seg.map((x) => (x.startsWith('$') && vars[x.slice(1).toLowerCase()] !== undefined ? vars[x.slice(1).toLowerCase()] : x));
      while (t.length && (/^\w+=/.test(t[0]) || ['&', '.', 'sudo', 'command', 'exec', 'time', 'call'].includes(t[0]))) t.shift();
      if (!t.length) continue;
      let cmd = nombre(t[0]);
      if (['npx', 'pnpm', 'bunx'].includes(cmd)) { t = t.slice(1).filter((x) => !['-y', '--yes'].includes(x)); cmd = nombre(t[0] ?? ''); }
      const args = t.slice(1);
      const low = args.map((x) => x.toLowerCase());

      if (['cd', 'set-location', 'sl', 'push-location', 'pushd', 'chdir'].includes(cmd) && args[0]) dir = path.resolve(dir, aRutaWin(args.find((x) => !x.startsWith('-')) ?? ''));
      else if (['bash', 'sh', 'zsh'].includes(cmd) && low.includes('-c')) analizar(args[low.indexOf('-c') + 1] ?? '');
      else if (cmd === 'cmd' && (low.includes('/c') || low.includes('/k'))) analizar(args.slice(Math.max(low.indexOf('/c'), low.indexOf('/k')) + 1).join(' '));
      else if (['powershell', 'pwsh'].includes(cmd)) { const k = low.findIndex((x) => ['-command', '-c'].includes(x)); if (k >= 0) analizar(args.slice(k + 1).join(' ')); }
      else if (['iex', 'invoke-expression'].includes(cmd)) analizar(args.join(' '));
      else if (cmd === 'git') revisarGit(args, dir, perfil, ctx, sale);
      else if (cmd === 'gh') revisarGh(args, perfil, ctx, sale);
      else if (cmd === 'wrangler') revisarWrangler(args, perfil, sale);
      else if (cmd === 'node' && args.some((x) => nombre(x) === 'resembrar.js') && args.includes('--aplicar'))
        sale(perfil === 'base' ? 'ask' : 'deny', '`resembrar.js --aplicar` escribe en la D1 de producción: siempre lo aprueba Saulo');
      else if (cmd === 'taskkill' && low.includes('/im')) sale('deny', 'matar procesos por NOMBRE tumba los de otras sesiones y los MCP; para por PID');
      else if (['pkill', 'killall'].includes(cmd)) sale('deny', 'matar procesos por nombre: para por PID');
      else if (['stop-process', 'spps', 'kill'].includes(cmd) && (low.some((x) => ['-name', '-processname'].includes(x)) || (seg.op === '|' && !low.includes('-id'))))
        sale('deny', '`Stop-Process` por nombre o por tubería: para por PID (`-Id`)');
      else if (perfil === 'lectura' && cmd === 'npm' && ['install', 'i', 'ci', 'uninstall', 'update', 'add'].includes(low[0]))
        sale('deny', 'perfil lectura: `npm install` toca el node_modules compartido por los worktrees');
    }
  };
  analizar(command);

  const deny = hallazgos.filter((h) => h.decision === 'deny');
  const elegidos = deny.length ? deny : hallazgos;
  if (!elegidos.length) return null;
  return { decision: elegidos[0].decision, motivo: [...new Set(elegidos.map((h) => h.motivo))].join(' · ') };
}

// ── como hook ───────────────────────────────────────────────────────────────
const contextoReal = {
  rama: (dir) => { try { return execFileSync('git', ['-C', dir, 'symbolic-ref', '--short', '-q', 'HEAD'], { encoding: 'utf8', timeout: 4000, windowsHide: true }).trim(); } catch { return null; } },
  basePr: (num) => { try { return execFileSync('gh', ['pr', 'view', ...(num ? [num] : []), '--json', 'baseRefName', '-q', '.baseRefName'], { encoding: 'utf8', timeout: 15000, windowsHide: true }).trim(); } catch { return null; } },
};

// Comparando rutas REALES: si se lanza a través de un enlace de carpeta
// (junction), argv[1] trae la ruta del enlace e import.meta.url la real, y una
// comparación directa haría que el hook no hiciera nada, en silencio.
const real = (p) => { try { return fs.realpathSync(p); } catch { return p; } };
if (process.argv[1] && real(process.argv[1]) === real(fileURLToPath(import.meta.url))) {
  let entrada = '';
  process.stdin.on('data', (d) => { entrada += d; }).on('end', () => {
    try {
      const j = JSON.parse(entrada);
      if (!['Bash', 'PowerShell'].includes(j.tool_name)) return;
      const r = evaluar({ command: j.tool_input?.command, agent_type: j.agent_type, cwd: j.cwd }, contextoReal);
      if (r) process.stdout.write(JSON.stringify({ hookSpecificOutput: {
        hookEventName: 'PreToolUse', permissionDecision: r.decision,
        permissionDecisionReason: `[guardia${j.agent_type ? ' · ' + j.agent_type : ''}] ${r.motivo}` } }));
    } catch (e) {
      process.stderr.write(`guardia: fallo interno, no bloquea (${e.message})\n`);
      process.exit(1);
    }
  });
}
