# Bot DCAM — diseño

Sistema que mantiene armado.mx sincronizado con la página oficial de la Secretaría de la
Defensa: <https://www.gob.mx/defensa/acciones-y-programas/comercializacion-de-armas>.
Corre en **APOLO** (siempre encendido), no en HEFESTO.

Decidido con Saulo el **13-sep-2026** (pieza 1) y el **14-sep-2026** (pieza 2). Este
documento cubre el sistema entero y detalla la **pieza 1 (vigía)** y la **pieza 2
(conciliación y publicación automáticas)**; la pieza 3 tendrá su propio diseño.

## Decisiones del sistema

| Tema | Decisión |
|---|---|
| Automatismo del inventario | **Completo**: concilia, publica en `main` + `develop` y resiembra D1 solo |
| Anomalías | Lo que pasa todas las verificaciones se publica solo; lo dudoso (modelo nuevo, Δ% fuera de la distribución, formato desconocido) va a un **PR** y avisa por Telegram. Si `auditar.js` falla o el PDF no se entiende, no publica nada |
| Erratas de precio de la DCAM | Se publica el **último precio conocido** con una nota visible **junto al precio**: «Precio del inventario <fecha>. El publicado el <fecha> ($X) probablemente es un error de la publicación de la Secretaría de la Defensa». Si **no hay precio anterior**, se publica el del PDF con la misma nota. (Caso origen: cargador Tanfoglio FT-9-FS a $2.56, 11-sep-2026) |
| Qué es una ficha | **Modelo + calibre.** Variantes de acabado/cañón del mismo calibre suman existencias en una ficha cuyo precio sigue a una **variante representativa fija**. Una ficha **nunca** cambia de modelo ni de calibre entre inventarios: si son distintos, se crea la variante, no se sobrescribe |
| Variante que desaparece | Si la representativa desaparece y queda otra, la ficha queda **agotada** con su último precio y la variante que queda entra como **ficha nueva** con historial propio. El bot lo trata como «dudoso» (PR), porque crear una ficha pide criterio |
| Municiones raras | Perdigón o gramaje que el fabricante no publica: se publica **tal cual el PDF**, sin nota |
| Compatibilidad de accesorios | **Lista explícita por modelo** (de la descripción del PDF, verificada con el fabricante). Sin lista, no se muestra compatibilidad |
| Motor de conciliación | **Script fijo** para lo ya catalogado; `claude -p` solo **redacta** lo dudoso dentro del PR. La IA nunca decide un precio publicado |
| Frecuencia | **Una vez al día, 20:00** (America/Mexico_City) |
| Avisos por Telegram | Publicación automática · bot roto · cambios en avisos/requisitos · latido diario · PR por revisar |
| Anti-bots (Akamai) | Petición HTTP **honesta**, sin navegador ni camuflaje. Si aparece la verificación o un CAPTCHA: se detiene y avisa; no se escala a navegador sin preguntar |
| PDFs oficiales | Se siguen **alojando** en `public/inventarios/` |
| D1 | Token de API de Cloudflare (D1:Edit) **en APOLO**, archivo 600. Si resembrar borraría ids que solo existen en D1, no aplica y avisa |
| Info legal sincronizada | Avisos de la DCAM · requisitos de compra · costos de derechos · dirección, horario y contacto |
| Publicación legal | El **dato oficial literal** se publica solo (con fecha y enlace a gob.mx) en un bloque nuevo de Legalidad; la **redacción propia** (FAQ, pasos) va por PR |
| Dónde vive el código | En este repo, `scripts/dcam/`. Estado, archivo y credenciales, solo en APOLO |
| Qué se publica solo (pieza 2) | Solo el renglón **idéntico** (nombre corto, n.º de ocurrencia y descripción larga) al del inventario anterior sobre una ficha existente, cuyo cambio de precio es 0 % o cae en un **ajuste general** (grupo de ≥ 5 renglones con el mismo %, ±0.05 pp). Todo lo demás —altas, agotados, regresos, variantes, erratas, % fuera de grupo— va a PR (14-sep-2026) |
| Cómo se publica (pieza 2) | **PR que se mergea solo** tras `auditar.js`, build y preview de Cloudflare Pages en verde; luego resembrado de D1 y sondas como visitante. **Automático desde el primer inventario**, sin ensayo previo (14-sep-2026) |
| Credencial de GitHub (pieza 2) | Token **fine-grained solo de `armado-en-mexico`** en `~/apps/dcam-bot/github.env` (600). No se usa la sesión de `gh` de APOLO, que alcanza todos los repos (14-sep-2026) |
| PR de lo dudoso (pieza 2) | `claude -p` en APOLO lo deja **investigado contra el fabricante** (URL por dato; lo no encontrado, vacío y marcado), con la evidencia del PDF y la regla aplicada. Saulo revisa y mergea (14-sep-2026) |
| Código del bot en APOLO | Cada corrida hace `git fetch` + reset del clon a `origin/main`; si el fetch falla, sigue y avisa «corriendo con código de <fecha>» (14-sep-2026) |
| Vigilante externo | **No**: basta con el latido diario (14-sep-2026) |
| Bot de Telegram | El vigía tiene **su propio bot** (regla del ecosistema: un bot por dominio). No reusa el bot/`.env` de `tg-notify`/panoptes-watchdog. Credenciales en `/home/saulo/apps/dcam-bot/telegram.env` (600), fuera del repo (14-sep-2026) |

## Piezas y orden

| # | Pieza | Estado |
|---|---|---|
| 0 | Puesta al día en sesión: conciliar el inventario del 11-sep-2026 y corregir los textos legales que chocaban con la fuente oficial | Hecha (#154/#155, #158/#159, #164/#165; D1 resembrado) |
| 1 | **Vigía**: detectar, archivar y avisar | Hecha e instalada en APOLO el 14-sep-2026 (#166/#167) |
| 2 | Conciliación y publicación automáticas | Diseñada (sección «Pieza 2»); pendiente de plan e implementación |
| 3 | Sincronización legal + bloque de Legalidad (entrevista de diseño con bocetos) | Diseño pendiente |

## Hechos medidos (13-sep-2026)

- **Akamai filtra por User-Agent, no por IP.** Desde APOLO: `ArmadoMX-bot/1.0` y `curl/8.5.0`
  reciben la página completa (58 KB, 3 enlaces «Existencias de»); un UA de Chrome sin
  JavaScript recibe «Challenge Validation» (1.8 KB) con **HTTP 200**. Se detecta por
  contenido, nunca por código de estado. Los adjuntos de `/cms/uploads/` no tienen filtro.
- **Los PDFs cambian de nombre en cada publicación** (`ARMAS_11_SEP._2026.pdf`,
  `EXIST_ARMAS_24_ABR..pdf`…) y **las versiones viejas se borran** (404). Las URLs se
  sacan del HTML y cada publicación se archiva al verla.
- `HEAD` devuelve 404: no usarlo.
- Inventario al 11-sep-2026: 3 PDFs separados (armas 204 renglones, cartuchos 42,
  accesorios 30), texto seleccionable.
- Los **avisos** son imágenes JPG sin texto alternativo.
- El helper de envío es `~/apps/quiron/lib/quiron_telegram.py` (stdlib): `Bot.send_message(texto)`
  y `Bot.send_document(ruta, caption)` mandan texto plano (sin `parse_mode`, no hace falta
  escapar) y devuelven `bool`. Cada consumidor trae su propio `.env` — `tg-notify` usa el de
  panoptes-watchdog; el vigía tiene el suyo (ver «Bot de Telegram» arriba).

## Pieza 1 — Vigía

### Arquitectura

```
APOLO · 20:00 diario (systemd timer, Persistent=true)
  └─ dcam-vigia.service  (User=saulo, Type=oneshot)
       ├─ ExecStartPre: git -C ~/apps/dcam-bot/repo pull --ff-only
       └─ python3 scripts/dcam/vigia.py        ← solo biblioteca estándar
             ├─ páginas vigiladas (UA «ArmadoMX-bot/1.0 (+https://armado.mx)»):
             │    · /defensa/acciones-y-programas/comercializacion-de-armas  (adjuntos + texto)
             │    · /defensa/acciones-y-programas/formatos-de-pagos-e5-del-2023  (texto: costos)
             ├─ ~/apps/dcam-bot/estado.json
             ├─ ~/apps/dcam-bot/archivo/AAAA-MM-DD/<id>_<nombre>
             └─ Telegram: quiron_telegram.Bot  (PYTHONPATH=~/apps/quiron/lib)
```

- En el repo: `scripts/dcam/vigia.py`, `test_vigia.py`, `fixtures/`,
  `systemd/dcam-vigia.{service,timer}`.
- En APOLO: clon dedicado `~/apps/dcam-bot/repo` (no el de Orca), `estado.json`, `archivo/`.
  Credenciales propias del vigía en `~/apps/dcam-bot/telegram.env` (600), apuntadas por
  `DCAM_TG_ENV`; no se comparten con otros bots (ver «Bot de Telegram»).
- Sin ETag: los adjuntos pesan 50–400 KB y se bajan todos cada día para comparar sha256.
- Sin `OnFailure=`: si el script muere sin avisar, lo delata la falta de latido.

### Flujo de una corrida

1. **Leer** «comercialización» (la única obligatoria). Es **lectura válida** si no contiene
   «Challenge Validation» y trae los 3 enlaces «Existencias de…». Si no: un reintento a los
   10 min; si sigue mal → «⚠️ DCAM vigía roto: …» y **no se toca el estado** (salida 1).
   Leer «costos» **no bloquea**: si falla (tras su propio reintento), el vigía sigue con
   comercialización, manda un aviso aparte y conserva el texto anterior de costos en el
   estado, sin comparar su diff ese día (ver «Comportamientos añadidos» abajo).
2. **Documentos** de la página de comercialización: todos los enlaces e imágenes a
   `https://www.gob.mx/cms/uploads/attachment/file/…` y `.../image/file/…` del cuerpo
   (otro host o esquema, aunque tenga la misma ruta, se ignora). Se clasifican por **ruta**
   primero — cualquier URL bajo `/cms/uploads/image/file/` es `imagen`, venga de `<a>` o de
   `<img>` — y si no, por el texto del enlace: `existencias` («Existencias de…»),
   `requisitos` (contiene «requisitos»), o `documento` en cualquier otro caso.
3. **Bajar cada documento** y compararlo con `estado.json`: **nuevo** (URL no vista),
   **cambiado** (misma URL, otro sha256), **retirado** (vista antes, ausente en esta lectura
   válida). Nuevo y cambiado se archivan. Si la descarga falla — de red (`OSError`),
   HTTP incompleto/URL inválida (`http.client.HTTPException`) o de codificación
   (`UnicodeEncodeError`, subclase de `ValueError`) — o si Akamai le sirve la pantalla de
   verificación a ese adjunto (`Challenge Validation` en los bytes bajados), el documento
   pasa a **fallido**: no se archiva, conserva su sha256 anterior en el estado y **no** cuenta
   como retirado (sigue publicado; solo falló bajarlo).
4. **Texto**: el texto normalizado (espacios colapsados) del cuerpo de cada página se
   compara con el guardado; si difiere, diff unificado (cortado a 3500 caracteres, con
   «…(truncado)» si se cortó).
5. **Guardar** el estado de forma atómica (temporal + `rename`) y mandar los mensajes.

### Mensajes

Un mensaje por documento nuevo o cambiado (con el archivo adjunto), más el diff de texto si
lo hay, más el latido — siempre el último:

| Evento | Mensaje |
|---|---|
| Existencias nuevo/cambiado | «📦 Inventario nuevo DCAM: Existencias de Armas.» (o «cambiado») + URL, con el PDF adjunto |
| Aviso o imagen nuevo/cambiado | «📢 Aviso o imagen · nuevo: …» (o «cambiado») + URL, con la imagen adjunta |
| Requisitos nuevo/cambiado | «📄 Requisitos · nuevo: …» (o «cambiado») + URL, con el documento adjunto |
| Otro documento nuevo/cambiado | «📄 Documento · nuevo: …» (o «cambiado») + URL, con el documento adjunto |
| Texto de una página cambió | «✏️ Cambió el texto de la página «…»» + enlace + diff (líneas − / +, truncado a 3500) |
| «Costos» no se pudo leer | «⚠️ DCAM vigía: no se pudo leer la página «costos»: <motivo>» (primer mensaje de la corrida; comercialización sigue su curso) |
| Comercialización rota | «⚠️ DCAM vigía roto: <motivo>» (único mensaje, salida 1, estado intacto) |
| Latido (siempre, el último) | «✅ DCAM vigía · DD-MMM-AAAA · <resumen o «sin cambios»> · existencias: <archivos> · N imágenes»; el resumen suma nuevos/cambiados/retirados, «no se pudieron bajar: N», «texto cambiado en N página(s)» y «costos sin leer» cuando aplican |

**Primera corrida** (sin `estado.json`): siembra el estado y manda solo
«estado inicial: N documentos archivados» (más «costos sin leer» si tocó), sin alertas de
cambios.

### Comportamientos añadidos en la ola de arreglos (14-sep-2026)

- **Akamai en un adjunto** (no solo en la página): se trata igual que un fallo de descarga —
  a «fallidos», sin archivar ni avisar como nuevo/cambiado, con su sha256 anterior intacto.
- **`--sin-telegram` no consume estado real**: si además `DCAM_DIR` no está en el entorno,
  usa una carpeta temporal nueva (`dcam-seco-…`, impresa antes de correr) en vez de
  `~/apps/dcam-bot`. Con `DCAM_DIR` fijada (con o sin `--sin-telegram`), se respeta esa ruta.
- **«Costos» ya no bloquea el vigía**: solo «comercialización» es obligatoria. Ver «Flujo de
  una corrida» y «Mensajes» arriba.
- **`enviar()` reporta si el envío falló**: devuelve `True` solo si cada `send_message`/
  `send_document` devolvió verdadero (o si no hay bot, modo `--sin-telegram`); si devuelve
  `False`, `main()` sale con código 1 (sin pisar un código ya distinto de 0).

### Errores

- Documento que no baja (o Akamai se lo sirve): su estado no se actualiza (reintento natural
  al día siguiente); se menciona en el latido («no se pudieron bajar: N»).
- Excepción no prevista: capturada arriba del todo → «⚠️ bot roto» con traceback resumido y
  salida ≠ 0 (queda en `journalctl -u dcam-vigia`).
- Envío a Telegram falló: `enviar()` lo detecta (ver arriba) y `main()` sale con código 1.

### Pruebas

`python3 scripts/dcam/test_vigia.py` (asserts, sin framework; 22 pruebas), sobre fixtures
guardados:

- página real → 3 existencias, 2 requisitos, 3 documentos y 8 imágenes; texto de la
  dirección presente;
- página de costos real es válida;
- pantalla de Akamai en comercialización → lectura inválida, motivo con «Challenge
  Validation»; con estado previo, la corrida completa sale 1 y **no toca** `estado.json`
  (comparación byte a byte);
- Akamai servido a los adjuntos (no a la página) → no rompe la corrida, no archiva, no avisa
  nuevo/cambiado, cuenta como fallido en el latido y conserva el sha256 anterior;
- error de descarga que no es `OSError` (`http.client.IncompleteRead`, subclase de
  `HTTPException`) en un adjunto → igual que un fallo de red: a «fallidos», sin romper la
  corrida;
- «costos» roto (tras su reintento) con «comercialización» viva → sale 0, aviso propio, texto
  de costos sin cambiar en el estado, latido con «costos sin leer»;
- `_es_upload`: rechaza esquema distinto de `https` o host distinto de `www.gob.mx`;
- clasificación por ruta: una URL de `/cms/uploads/image/file/…` es «imagen» aunque venga de
  un `<a>`, no de un `<img>`;
- `_tipo`/`nombre_archivo`/`comparar`/`diff_texto` (insensible a espacios)/`fecha`/
  `cargar_estado`+`guardar_estado` (ida y vuelta, atómico);
- corrida completa: siembra (16 documentos), segunda corrida sin cambios, y una tercera con
  un PDF nuevo + uno retirado + un cambio de horario en el texto;
- documento que no baja no se da por retirado (cuenta en `fallidos`, no en `retirados`);
- diff de texto truncado a 3500 caracteres termina en «…(truncado)»;
- inventario **cambiado** (misma URL, otro contenido) manda «📦 Inventario cambiado DCAM:
  …» con el archivo adjunto y «cambiados: 1» en el latido;
- `enviar()` devuelve `True`/`False` según lo que devuelva el bot falso, y `True` si no hay
  bot;
- `dir_trabajo()`: usa una carpeta temporal `dcam-seco-…` en `--sin-telegram` sin `DCAM_DIR`,
  y respeta `DCAM_DIR` en cualquier otro caso.

`vigia.py --sin-telegram` imprime los mensajes en vez de mandarlos (prueba manual en APOLO o
en HEFESTO); si no se fija `DCAM_DIR`, usa y muestra una carpeta temporal para no tocar el
estado real.

### Instalación

PR con `scripts/dcam/` a `main` y `develop`, pruebas en verde. Saulo mergea. Después:

1. Clon dedicado:
   ```
   ssh apolo 'mkdir -p ~/apps/dcam-bot && git clone --quiet https://github.com/saulo-fl/armado-en-mexico ~/apps/dcam-bot/repo && git -C ~/apps/dcam-bot/repo log -1 --format="%h %s"'
   ```
2. Crear el bot y su `.env` (uno propio, no el de `tg-notify`): Saulo da de alta el bot con
   `/newbot` en @BotFather, le manda `/start` desde su Telegram, y luego:
   ```
   ssh apolo 'install -d -m 700 ~/apps/dcam-bot && install -m 600 /dev/null ~/apps/dcam-bot/telegram.env'
   ```
   y edita ese archivo con las dos líneas `TG_TOKEN=<token del bot>` y
   `TG_CHAT_ID=5468286636` (chat personal de Saulo).
3. Pruebas y corrida en seco:
   ```
   ssh apolo 'cd ~/apps/dcam-bot/repo && python3 scripts/dcam/test_vigia.py && test -r ~/apps/dcam-bot/telegram.env && echo env-legible && DCAM_DIR=/tmp/dcam-seco python3 scripts/dcam/vigia.py --sin-telegram; echo exit=$?; rm -rf /tmp/dcam-seco'
   ```
4. Instalar y activar (sudo):
   ```
   ssh -t apolo 'sudo cp ~/apps/dcam-bot/repo/scripts/dcam/systemd/dcam-vigia.service ~/apps/dcam-bot/repo/scripts/dcam/systemd/dcam-vigia.timer /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable --now dcam-vigia.timer && systemctl list-timers dcam-vigia.timer'
   ```
5. Primera corrida real:
   ```
   ssh -t apolo 'sudo systemctl start dcam-vigia.service; systemctl status dcam-vigia.service --no-pager | head -5; journalctl -u dcam-vigia.service -n 20 --no-pager; ls ~/apps/dcam-bot ~/apps/dcam-bot/archivo'
   ```
   Confirmar que llegó el mensaje a Telegram.

En la primera instalación, arrancar el servicio **dos veces** (la segunda manda un latido
real con nombres de archivo, la primera solo siembra el estado) y probar una vez el camino
«roto» (por ejemplo cortando la red o forzando un motivo cualquiera) para confirmar que el
aviso llega y el estado queda intacto.

`ExecStart` corre con `TimeoutStartSec=1h`: una corrida colgada no debe bloquear el disparo
del timer del día siguiente.

Para leer los logs después: `journalctl -u dcam-vigia.service -n 50 --no-pager`.

### Fuera de la pieza 1

Conciliación y publicación (pieza 2) · extracción de avisos a datos y bloque de Legalidad
(pieza 3) · monitor externo de «último OK» tipo Healthchecks (el latido cubre el hueco).

## Pieza 2 — Conciliación y publicación automáticas

Diseñada con Saulo el **14-sep-2026**. Objetivo: cuando el vigía archiva un inventario de
existencias nuevo, que lo que ya está catalogado y cambió de forma predecible llegue solo a
armado.mx, y que todo lo que pide criterio llegue a Saulo como PR investigado.

### Arquitectura

```
APOLO · 20:00 · dcam-vigia.service
  ├─ ExecStart: scripts/dcam/correr.sh
  │     ├─ git fetch + reset --hard origin/main del clon que ejecuta
  │     │   (si falla: DCAM_CODIGO_VIEJO=<fecha del commit> y sigue)
  │     └─ exec python3 scripts/dcam/vigia.py
  └─ vigia.py ── archiva ──► ¿existencias nuevas o cambiadas?
                                └─ sí → conciliar.py, en la misma corrida, por catálogo

conciliar.py  (scripts/dcam/)
  1. Lee cada PDF nuevo con .claude/skills/conciliar-inventario/scripts/parse_pdf.py.
     Armas, municiones y accesorios se procesan por separado (la DCAM no siempre los
     sube a la vez).
  2. Encadena cada renglón con el inventario anterior de ese catálogo usando
     scripts/dcam/mapeo-dcam.json.
  3. Clasifica cada cambio en SEGURO o DUDOSO (ver «Reglas»).
  4. SEGURO → rama bot/dcam-<catalogo>-AAAA-MM-DD en el clon de TRABAJO
     (~/apps/dcam-bot/trabajo, distinto del clon que ejecuta):
       · aplicador: PDF a public/inventarios/, registro del inventario (primary),
         historial, priceExact, existencias, ?v= de los data-*.js y mapeo actualizado
       · puertas: ajuste general, auditar.js, npm ci + npm run build
       · PR a main y gemelo a develop → preview de Cloudflare Pages en verde → merge de
         ambos → despliegue del merge en verde → resembrado de D1 `armas` → sondas
         como visitante → Telegram «publicado»
  5. DUDOSO → rama bot/dcam-<catalogo>-AAAA-MM-DD-revision creada desde el main YA
     publicado:
       · claude -p con prompt fijo + skill conciliar-inventario + web del fabricante
       · PR a main y gemelo a develop SIN merge → Telegram «PR por revisar»
```

- **Dos clones en APOLO.** `~/apps/dcam-bot/repo` ejecuta el código y se resetea a `main`
  en cada corrida; `~/apps/dcam-bot/trabajo` es donde el bot crea ramas y commits. Así un
  reset nunca se lleva trabajo a medias.
- **El PR dudoso sale siempre después del merge del seguro**: los dos tocan las mismas
  líneas de `data.js`/`data-precios.js` y, en paralelo, chocarían.
- **Credenciales** en `~/apps/dcam-bot/` (chmod 600, fuera del repo): `telegram.env` (ya
  existe), `github.env` (token fine-grained solo de `armado-en-mexico`), `cloudflare.env`
  (token de API con D1:Edit). Se escriben con el comando que valida antes de guardar (vacío
  → no escribe; la API rechaza el token → no escribe).
- **Resembrado de D1 sin wrangler**: `resembrar.js` hoy obtiene el token con
  `wrangler auth token`; se adapta de forma mínima para aceptar `CLOUDFLARE_API_TOKEN` del
  entorno. APOLO no instala ni inicia sesión en wrangler.

### Mapa de renglones (`scripts/dcam/mapeo-dcam.json`)

Hoy los datos no guardan a qué renglón del PDF corresponde cada ficha (el historial tiene
precio y fecha, no renglón). El mapa lo guarda, versionado en el repo y **no servido** (vive
en `scripts/`, fuera de `out/`):

- Por catálogo y por inventario: ficha → lista de renglones `{nombre_corto, ocurrencia,
  descripcion}` (una ficha puede sumar varios renglones; uno está marcado como
  `representativo`).
- **Construcción inicial, una sola vez**, con el inventario del 11-sep-2026 ya conciliado:
  cada ficha se empareja con el renglón cuyo precio **y** existencia coinciden exactamente
  con su registro del 11-sep. Lo que quede ambiguo (varios renglones con el mismo precio y
  existencia) o sin pareja se presenta a Saulo para decidirlo **antes** de activar la
  pieza 2.
- Cada publicación (automática o mergeada desde el PR dudoso) añade el inventario nuevo al
  mapa. Así el encadenado aguanta inventarios saltados: siempre se compara con el último
  inventario del catálogo que está en el mapa.

### Reglas: seguro, dudoso y detenido

**SEGURO — se publica solo** (se cumple todo):
1. El renglón es **idéntico** (nombre corto, n.º de ocurrencia y descripción larga) al que el
   mapa asigna a una ficha existente en el **inventario anterior** de ese catálogo.
2. El cambio de precio es **0 %** o cae en un **ajuste general**: un grupo de ≥ 5 renglones
   encadenados con el mismo % (tolerancia ±0.05 pp), calculado juntando los catálogos que
   tengan la **misma fecha de corte** (la del encabezado «al cierre del día DD/MM/AAAA»),
   aunque se hayan subido en días distintos; si un catálogo llega solo, el grupo se calcula
   con los que ya estén en el mapa para esa fecha más el nuevo. Referencia real: el 11-sep
   el 97 % de las armas cayó en −2.88 % y −1.31 %.
3. Si la ficha suma varios renglones, **todos** cumplen 1 y 2; el precio sigue al
   representativo.
4. Entra: registro en el historial, `priceExact` (armas), existencia (mapa DCAM en armas,
   `qty` del registro en accesorios y municiones), registro del inventario con `primary` y
   el PDF en `public/inventarios/` con la convención de nombres de `AGENTS.md`.

**DUDOSO — va a PR** (cualquiera):
- renglón nuevo (alta, variante nueva o ficha que regresa de un inventario más viejo);
- renglón que desaparece (agotado; si queda otra variante, regla de variantes);
- cambio de precio fuera de los ajustes generales, incluidas las posibles erratas (Claude
  aplica en el PR la regla de erratas);
- mismo nombre corto y ocurrencia con descripción distinta.

**DETENIDO — no se publica nada de ese catálogo** y llega «⚠️ conciliación detenida:
<motivo>» si: el parser no reconoce el formato; el número de renglones leídos no cuadra con
el de precios del PDF; falla `auditar.js` o el build; o la aplicación deja un historial que
no cumple las invariantes de la skill.

### Publicación de lo seguro

1. Commit por pathspec en la rama del bot, push con el token de `github.env`, PR a `main` y
   gemelo a `develop`, con la tabla de cambios en la descripción.
2. `auditar.js` y `npm ci && npm run build` en el clon de trabajo; espera el check de
   Cloudflare Pages del PR en verde (hasta 20 min). Merge del PR a `main` y del gemelo a
   `develop`.
3. Espera el despliegue del commit del merge en verde → resembrado de D1 `armas`. Si
   `resembrar.js` avisa de ids que solo existen en D1 (ediciones del admin), **no aplica** y
   avisa.
4. Sondas como visitante: `/api/state` con el número de armas esperado, el precio nuevo de
   una ficha cambiada y el `?v=` de `data-precios.js` que sirve `index.html`.
5. Telegram: «✅ Publicado inventario DCAM (<catálogo>) del DD-MMM-AAAA: N precios, M
   existencias · PR #x».

### PR de lo dudoso

- `claude -p` con un prompt fijo versionado en `scripts/dcam/` que: lee la skill
  `conciliar-inventario`, recibe la lista de casos dudosos con sus renglones y la regla que
  aplica a cada uno, verifica especificaciones de fichas nuevas en la web del fabricante (URL
  por dato; lo que no encuentre queda vacío y marcado) y propone listas de compatibilidad si
  entra un accesorio o un arma. Commits por pathspec, PR a `main` y `develop` **sin merge**.
- Límite propio de 45 min. Si se pasa, o si falla la sesión o la suscripción, el PR sale
  **igual** con los datos del PDF y la marca «investigación incompleta», y se avisa.
- Telegram: «🔎 PR por revisar #y (<catálogo> del DD-MMM-AAAA): K altas, J agotados, E
  posibles erratas, V variantes».

### Errores y reanudación

- **Una publicación se procesa una vez.** `estado.json` guarda, por catálogo y fecha, el paso
  alcanzado (`rama`, `pr`, `mergeado`, `d1`, `sondas`, `dudoso_pr`). Una corrida que muere a
  medias deja ese paso escrito y la siguiente continúa desde ahí (encuentra rama o PR por su
  nombre) en vez de empezar de nuevo.
- **Merge hecho pero D1 sin resembrar** es el caso grave (el código está publicado pero quien
  ya visitó el sitio ve lo viejo): «⚠️ publicado sin resembrar D1» y la siguiente corrida
  reintenta el resembrado.
- **Preview o despliegue que no llega a verde** en su plazo: el PR queda abierto sin merge,
  con un comentario del motivo, y se avisa.
- **Código viejo**: si `correr.sh` no pudo actualizar el clon, el latido incluye «⚠️
  corriendo con código de <fecha>».
- `dcam-vigia.service` sube a `TimeoutStartSec=3h` (espera del preview + `claude -p`).

### Pruebas

- **Reproducción con datos reales**: encadenar `dcam-existencias-2026-07-06.pdf` →
  `dcam-existencias-2026-09-11.pdf` (y los de municiones/accesorios equivalentes) con un
  mapa construido desde el 6-jul. En armas, la existencia de cada ficha en el 6-jul no está
  en los datos actuales (`AMX_ARMAS_EXISTENCIAS` solo guarda la del último inventario): se
  toma de los `data-*.js` tal como quedaron en git en el commit que concilió el 6-jul. Lo que el bot clasifique como seguro, aplicado sobre los
  datos del 6-jul, debe coincidir con lo publicado hoy en `main` para esas fichas; y lo
  dudoso debe contener los casos que se decidieron a mano (DT11, 694, Renova, SXP, BREN 2,
  92FS, Tanfoglio…).
- Pruebas pequeñas del aplicador sobre copias de los `data-*.js`, de la detección de
  ajustes generales y de la reanudación por pasos.
- **Modo `--seco`**: hace todo en el clon de trabajo (aplicador y puertas incluidos) pero sin
  push, merge, D1, `claude -p` ni Telegram; imprime el plan y el diff.

### Instalación (tras mergear la pieza 2)

1. Saulo crea el token fine-grained de GitHub (Contents y Pull requests lectura/escritura,
   Metadata lectura y el permiso mínimo para leer checks — se confirma en la
   implementación) y el token de API de Cloudflare (D1:Edit); los escribe en
   `~/apps/dcam-bot/github.env` y `cloudflare.env` con el comando que valida.
2. Clon de trabajo `~/apps/dcam-bot/trabajo` con `npm ci`; comprobar que `claude -p`
   responde en APOLO con el usuario `saulo`.
3. Construcción inicial del mapa desde el 11-sep y decisión de Saulo sobre lo ambiguo.
4. `--seco` contra el último inventario archivado (no debe haber nada que publicar) y la
   prueba de reproducción 6-jul → 11-sep en verde.
5. Unidad actualizada (`correr.sh`, `TimeoutStartSec=3h`) y `daemon-reload`. Desde ahí, el
   próximo inventario se publica solo.

### Fuera de la pieza 2

Pieza 3 (sincronización legal y bloque de Legalidad) · inventarios de OTCA (el vigía no los
lee) · fotos de fichas nuevas (siguen con marcador de posición) · vigilante externo.
