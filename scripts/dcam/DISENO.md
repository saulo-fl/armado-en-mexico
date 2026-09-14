# Bot DCAM — diseño

Sistema que mantiene armado.mx sincronizado con la página oficial de la Secretaría de la
Defensa: <https://www.gob.mx/defensa/acciones-y-programas/comercializacion-de-armas>.
Corre en **APOLO** (siempre encendido), no en HEFESTO.

Decidido con Saulo el **13-sep-2026**. Este documento cubre el sistema entero y detalla
la **pieza 1 (vigía)**; las piezas 2 y 3 tendrán su propio diseño antes de construirse.

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
| Bot de Telegram | El vigía tiene **su propio bot** (regla del ecosistema: un bot por dominio). No reusa el bot/`.env` de `tg-notify`/panoptes-watchdog. Credenciales en `/home/saulo/apps/dcam-bot/telegram.env` (600), fuera del repo (14-sep-2026) |

## Piezas y orden

| # | Pieza | Estado |
|---|---|---|
| 0 | Puesta al día en sesión: conciliar el inventario del 11-sep-2026 y corregir los 6 textos legales que chocaban con la fuente oficial | En curso (PR aparte) |
| 1 | **Vigía**: detectar, archivar y avisar | Este documento |
| 2 | Conciliación y publicación automáticas | Diseño pendiente |
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
