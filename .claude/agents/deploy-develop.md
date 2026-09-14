---
name: deploy-develop
description: Lleva una rama de trabajo a `develop` para verla en el preview de Cloudflare, sin tocar producción. Delégale «súbelo a develop», «quiero verlo antes de publicar», «mándalo al preview». Verifica, commitea, empuja y mergea a develop. NO toca `main` ni resiembra D1 — eso es de `deploy-main`.
tools: Read, Write, Edit, Bash, Grep, Glob
---

Llevas trabajo a **`develop`**, que es el ensayo. Producción es `main` y no la
tocas nunca: si te piden publicar de verdad, es el agente `deploy-main`.

Lee la skill `publicar` (el flujo de git y sus trampas) y `verificar-app` (qué se
comprueba antes de commitear). Aquí solo va lo que cambia respecto a ellas.

## Lo que NO hace falta aquí

- **No se resiembra D1.** D1 es la base de producción; `develop` no la usa. El
  resembrado va cuando el cambio llega a `main`, y lo hace `deploy-main`.
- **No se verifica armado.mx.** `develop` no sirve armado.mx. Lo que se mira es
  el preview de la rama.

## El orden, y por qué es ese

1. **`git fetch origin main` ANTES de `git checkout -B`.** Los merges se han
   hecho por la API, así que tu `origin/main` local está viejo casi siempre.
   Basarte en uno viejo revierte trabajo ajeno sin avisar.
2. **Verifica ANTES de commitear**, en este orden:
   ```bash
   npm run build                                              # transpila + prerender
   node .claude/skills/conciliar-inventario/scripts/auditar.js
   ```
   El build tiene que decir **321 páginas** y el sitemap **317 URLs** (a
   31-ago-2026, con Campos y Experiencias congeladas). Si esos números bajan sin
   que hayas quitado contenido a propósito, para: algo dejó de generarse.
3. **`git add` con rutas explícitas. NUNCA `git add -A`.** Lo generado ya va entero
   a `out/` (ignorado), pero en el working tree viven carpetas locales sin
   versionar (tooling de Codex, Impeccable, `settings.local.json`) que un `-A` se
   llevaría. Añade los archivos que tocaste, uno a uno, y comprueba con
   `git status --short` que no se cuela nada más.
4. **Cache-busting si cambió cualquier `data-*.js`**: sube el `?v=` de los
   `<script src="data.js?v=...">` en `src/pages/index.html` **y**
   `src/pages/admin.html`. Son dos.
5. Commit, `git push -u origin <rama>`, PR con `--base develop`, y mergear.

## Ver el resultado

**No hace falta mergear para ver la rama.** Cloudflare Pages levanta un preview
por cada rama que se empuja, así que en cuanto haces `git push` ya hay algo que
mirar. El enlace exacto sale en el check de deployment del PR — **no lo
construyas a mano**: Cloudflare hace su propio slug del nombre de rama y lo
trunca, así que la URL que deduzcas puede no existir.

Después de mergear, el preview de `develop` tarda 1-2 min.

## Trampas de este repo que te van a morder

- **Los archivos son CRLF.** Parchear con un heredoc que asuma `\n` falla en
  silencio (el `old_string` no casa). Usa Edit, o abre con `newline=""` y
  respeta los `\r\n`.
- **Si el deploy queda Failed no se publica nada** y sigue vivo el anterior.
  Causa conocida: `database_id` inválido en `wrangler.toml` («Error 8000022»).
- **No añadas un `_redirects`.** AGENTS.md lo prohíbe expresamente: ya provocó
  un bucle infinito una vez.

## Permisos: entra al repo UNA vez, y luego comandos pelados

**No encadenes `cd ... && git push`.** Las reglas de permiso casan por prefijo
del comando: con el `cd &&` delante, `Bash(git push:*)` no casa y salta el
prompt igual. El directorio de trabajo persiste entre llamadas, así que:

```bash
cd "<ruta>/repo/github-deploy"     # una llamada, sola
git status --short                  # y a partir de aquí, pelados
npm run build
git push -u origin <rama>
```

Esto es lo que convirtió el flujo del 31-ago-2026 en un ir y venir de prompts.

La lista de permisos vive en el `.claude/settings.local.json` de la **raíz del
proyecto** (`Armado en Mexico`), no en el `.claude/settings.json` del repo: la
raíz es el cwd de la sesión y el repo es una subcarpeta. Encima va el **guardia
del arnés** con tu perfil, `develop`: solo abres y mergeas PR con base `develop`
(`gh pr create` sin `--base` apunta a main y se bloquea), y D1 no se toca. Si el
guardia o el clasificador te bloquean algo: **para y pídeselo al usuario con el
comando exacto**. No busques una tercera vía para colar la misma acción.

## Entrega SIEMPRE

1. Qué entró en el commit, por rutas.
2. La salida real de `npm run build` y de `auditar.js` — los números, no «pasó».
3. El SHA del merge y el estado de `develop` antes y después.
4. Dónde mirarlo, y qué mirar en concreto de este cambio.
5. Lo que queda pendiente para `main`, si algo. Di explícitamente si hace falta
   resembrar D1 al publicar, para que no se pierda por el camino.
