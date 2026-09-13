// node .claude/hooks/guardia.test.mjs — sale con 1 al primer caso que falle.
// Casos sacados de comandos reales de las sesiones y de las trampas de la memoria.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { evaluar } from './guardia.mjs';

// rama actual y base de PR simuladas: sin git ni red.
const ctx = (rama = 'claude/x', base = 'develop') => ({ rama: () => rama, basePr: () => base });
const GH = '$gh="C:\\Program Files\\GitHub CLI\\gh.exe"; ';

const casos = [
  // [comando, agent_type, esperado (null = pasa), ctx]
  ['git status', '', null],
  ['npm run build', 'revisor-armado', null],
  ['git push -u origin claude/arnes-guardia', '', null],
  ['git commit -m "no usar git push --force ni reset --hard"', '', null],
  ['git checkout -B claude/x origin/main', '', null],
  ['Stop-Process -Id 4321', '', null],
  [GH + '& $gh pr view 147 -R saulo-fl/armado-en-mexico --json state', '', null],
  ['gh api repos/saulo-fl/armado-en-mexico/pulls', '', null],
  ['node .claude/skills/sincronizar-d1/scripts/resembrar.js pages', 'revisor-armado', null],
  ['npx wrangler d1 execute armado-en-mexico --remote --command "SELECT 1"', '', 'ask'],

  // push peligrosos, escritos de todas las formas que se saltaban el prefijo
  ['git push --force origin claude/x', '', 'deny'],
  ['git push origin claude/x --force', '', 'deny'],
  ['git -C "C:\\Users\\USER\\Documents\\Claude\\Projects\\Armado en Mexico\\repo" push --force-with-lease', '', 'deny'],
  ['$g="C:\\repo"; git -C $g push -uf origin claude/x', '', 'deny'],
  ['git push origin +HEAD:claude/x', '', 'deny'],
  ['git push origin --delete claude/x', '', 'deny'],
  ['git push origin :claude/x', '', 'deny'],
  ['cd "/c/Users/USER/repo" && git push origin HEAD:main', '', 'deny'],
  ['git push origin x:refs/heads/develop', '', 'deny'],
  ['git push', '', 'deny', ctx('main')],
  ['git push origin HEAD', '', 'deny', ctx('develop')],
  ['bash -c "git push --force"', '', 'deny'],
  ['powershell -Command "git push origin main"', '', 'deny'],

  // destructivos locales
  ['git reset --hard origin/main', '', 'deny'],
  ['git clean -fdx', '', 'deny'],
  ['git branch -D claude/x', '', 'deny'],
  ['git checkout -- src/screens/screens-1.jsx', '', 'ask'],
  ['git stash pop', '', 'ask'],
  ['git restore src/app.jsx', '', 'ask'],
  ['git restore --staged src/app.jsx', '', null],

  // producción
  [GH + '& $gh pr merge 146 -R saulo-fl/armado-en-mexico --merge', '', 'ask'],
  ['gh pr merge 146 --merge', 'deploy-main', 'ask'],
  ['Push-Location $wt; try { node .claude/skills/sincronizar-d1/scripts/resembrar.js pages --aplicar } finally { Pop-Location }', '', 'ask'],
  ['gh api repos/saulo-fl/armado-en-mexico/rulesets -X POST --input r.json', '', 'ask'],
  ['gh api -f query=x graphql', '', 'ask'],
  ['gh auth token', '', 'deny'],
  ['npx wrangler auth token --json', '', 'deny'],
  ['taskkill /IM python.exe /F', '', 'deny'],
  ['Get-Process node | Stop-Process', '', 'deny'],

  // perfil lectura
  ['git commit -m x', 'revisor-armado', 'deny'],
  ['git branch -d vieja', 'auditor-estructura', 'deny'],
  ['git branch -a', 'auditor-estructura', null],
  ['gh pr comment 5 -b hola', 'auditor-a11y-perf', 'deny'],
  ['npm install', 'revisor-armado', 'deny'],
  ['node .claude/skills/sincronizar-d1/scripts/resembrar.js armas --aplicar', 'auditor-a11y-perf', 'deny'],

  // perfil trabajo
  ['git push -u origin claude/fotos', 'preparador-imagenes', null],
  ['gh pr create --base main --title x --body y', 'preparador-imagenes', null],
  ['gh pr merge 12 --merge', 'conciliador-inventario', 'deny'],
  ['npx wrangler d1 execute armado-en-mexico --remote --command "DELETE FROM state"', 'disenador-oficial', 'deny'],

  // perfil develop
  ['gh pr create --base develop --title x --body y', 'deploy-develop', null],
  ['gh pr create --title x --body y', 'deploy-develop', 'deny'],
  ['gh pr merge 12 --merge', 'deploy-develop', 'ask', ctx('claude/x', 'develop')],
  ['gh pr merge 12 --merge', 'deploy-develop', 'deny', ctx('claude/x', 'main')],
  ['node .claude/skills/sincronizar-d1/scripts/resembrar.js armas --aplicar', 'deploy-develop', 'deny'],
];

let fallos = 0;
for (const [command, agent_type, esperado, c = ctx()] of casos) {
  const r = evaluar({ command, agent_type, cwd: 'C:/repo' }, c);
  try { assert.equal(r?.decision ?? null, esperado); }
  catch { fallos++; console.error(`✗ [${agent_type || 'base'}] ${command}\n   esperado ${esperado}, salió ${r?.decision ?? null}${r ? ` (${r.motivo})` : ''}`); }
}

// De punta a punta, como lo lanza Claude Code: JSON por stdin, decisión por stdout.
const salida = execFileSync(process.execPath, [fileURLToPath(new URL('./guardia.mjs', import.meta.url))], {
  input: JSON.stringify({ tool_name: 'PowerShell', tool_input: { command: 'git push origin main --force' }, cwd: '.' }),
  encoding: 'utf8',
});
try { assert.equal(JSON.parse(salida).hookSpecificOutput.permissionDecision, 'deny'); }
catch { fallos++; console.error('✗ de punta a punta: el hook no devolvió deny →', salida || '(vacío)'); }

console.log(fallos ? `\n${fallos} fallo(s) de ${casos.length + 1}` : `✔ ${casos.length + 1} casos`);
process.exit(fallos ? 1 : 0);
