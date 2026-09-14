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
- El token de Telegram del chat personal vive en `/opt/hestia/panoptes-watchdog/watchdog.env`
  (lo usa `tg-notify`); el helper es `~/apps/quiron/lib/quiron_telegram.py` (stdlib).

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
  Credenciales por variable `DCAM_TG_ENV` apuntando al `.env` existente; no se copian.
- Sin ETag: los adjuntos pesan 50–400 KB y se bajan todos cada día para comparar sha256.
- Sin `OnFailure=`: si el script muere sin avisar, lo delata la falta de latido.

### Flujo de una corrida

1. **Leer** cada página. Es **lectura válida** si no contiene «Challenge Validation» y, en la
   de comercialización, trae los 3 enlaces «Existencias de…». Si no: un reintento a los
   10 min; si sigue mal → «⚠️ bot roto» y **no se toca el estado**.
2. **Documentos** de la página de comercialización: todos los enlaces e imágenes a
   `/cms/uploads/attachment/file/` y `/cms/uploads/image/file/` del cuerpo, clasificados
   por el texto del enlace o la ruta: `existencias` (armas/municiones/accesorios),
   `requisitos`, `aviso` (imagen), `otro`.
3. **Comparar** con `estado.json`: **nuevo** (URL no vista), **cambiado** (misma URL, otro
   sha256), **retirado** (vista antes, ausente en esta lectura válida). Nuevo y cambiado se
   archivan.
4. **Texto**: el texto normalizado (espacios colapsados) del cuerpo de cada página se
   compara con el guardado; si difiere, diff unificado.
5. **Guardar** el estado de forma atómica (temporal + `rename`) y mandar los mensajes.

### Mensajes

| Evento | Mensaje |
|---|---|
| Existencias nuevas | «📦 Inventario nuevo DCAM: Armas / Municiones / Accesorios al <fecha>» + PDFs adjuntos |
| Aviso nuevo o cambiado | La imagen + enlace oficial |
| Requisitos u otro documento nuevo o cambiado | El documento adjunto + qué es |
| Texto de una página cambió | Diff (líneas − / +) + enlace |
| Bot roto | «⚠️ DCAM vigía roto: <motivo>» (Akamai, página sin enlaces, red, excepción con traceback resumido) |
| Latido (siempre) | «✅ DCAM vigía · <fecha> · sin cambios · existencias al <fecha> · N avisos»; con cambios, resumen en una línea (retirados incluidos) |

**Primera corrida** (sin `estado.json`): siembra el estado y manda solo
«estado inicial: N documentos», sin alertas.

### Errores

- Documento que no baja: su estado no se actualiza (reintento natural al día siguiente);
  se menciona en el latido.
- Excepción no prevista: capturada arriba del todo → «⚠️ bot roto» con traceback resumido y
  salida ≠ 0 (queda en `journalctl -u dcam-vigia`).
- Telegram caído: el helper lo registra en stderr y no lanza.

### Pruebas

`python3 scripts/dcam/test_vigia.py` (asserts, sin framework), sobre fixtures guardados:

- página real → 3 existencias, 2 requisitos y los avisos que traiga el fixture (los dos
  agentes contaron 7 y 8 imágenes: el test fija la cifra tras contarla a mano);
- pantalla de Akamai → lectura inválida, estado intacto;
- estado viejo vs nuevo → nuevo / cambiado / retirado correctos;
- primera corrida → sin alertas;
- diff de texto insensible a espacios.

`vigia.py --sin-telegram` imprime los mensajes en vez de mandarlos (prueba manual en APOLO).

### Instalación

1. PR con `scripts/dcam/` a `main` y `develop`, pruebas en verde. Saulo mergea.
2. APOLO: `git clone` en `~/apps/dcam-bot/repo`; corrida manual con `--sin-telegram`.
3. Copiar las unidades a `/etc/systemd/system/` y `systemctl enable --now dcam-vigia.timer`
   (requiere `sudo`: lo corre Saulo o lo autoriza).
4. Primera corrida real: siembra el estado y llega el latido.

### Fuera de la pieza 1

Conciliación y publicación (pieza 2) · extracción de avisos a datos y bloque de Legalidad
(pieza 3) · monitor externo de «último OK» tipo Healthchecks (el latido cubre el hueco).
