# puente.py — el único puente entre la jaula del solucionador DCAM y la API de
# Anthropic (Fase 3d: Claude con la suscripción de Saulo, token OAuth).
#
# Por qué existe este contenedor: la jaula del agente NO lleva ninguna credencial
# ni puede salir a internet (red --internal). Este es el ÚNICO componente con el
# token OAuth (montado en solo lectura) y con salida; solo reenvía las dos rutas
# que Claude Code necesita, al destino FIJO de abajo — todo lo demás es 404 SIN
# reenviar. Si el agente tuviera el token, una inyección podría escribirlo en un
# string de data.js y acabaría publicado en el repo público.
#
# Fase 3d, ronda de arreglo 1: la API de Anthropic tiene herramientas de SERVIDOR
# (web_search, web_fetch, code_execution, mcp_servers…) que ejecuta ella, fuera de
# la jaula: reenviar cualquier cuerpo sería darle salida a internet al agente.
# Por eso el cuerpo y los betas pasan por LISTA BLANCA (sacada de las peticiones
# reales de Claude Code 2.1.299, solo nombres): modelo, claves de primer nivel,
# tipos de herramienta (solo de cliente), effort ≤ medium y betas. Lo demás es
# 400 del puente, sin reenviar, con una línea fija en el log.
#
# Endurecido en la ronda de revisión 1/5 (Fase 2): límites de cuerpo/tiempo,
# lista blanca de cabeceras, sin seguir redirecciones, sin tracebacks hacia el
# cliente. Fase 3d: fuera las traducciones de llama.cpp y la clave del router.
import http.server, json, sys, time, urllib.parse, urllib.request, urllib.error

UPSTREAM = "https://api.anthropic.com"   # fijo: la jaula no puede elegir destino
RUTAS_PERMITIDAS = ("/v1/messages", "/v1/messages/count_tokens")
MAX_CUERPO = 32 * 1024 * 1024  # 32 MiB — Claude Code no manda más
# Lista blanca de la petición: authorization, x-api-key y cookie nunca pasan.
CABECERAS_PERMITIDAS = ("content-type", "anthropic-version", "anthropic-beta", "accept")
# Lista blanca de la respuesta: nada de organización, workspace ni límites de la
# suscripción hacia la jaula (podrían acabar en un string de data.js).
CABECERAS_RESPUESTA = ("content-type", "request-id", "cache-control", "retry-after", "x-should-retry")
BETA_OAUTH = "oauth-2025-04-20"   # la API exige este beta con un token OAuth

MODELOS = {"claude-opus-5-5", "claude-haiku-5-5"}
EFFORTS = {"low", "medium"}       # ≤ medium (decisión de Saulo); sin effort también vale
# Claves de primer nivel y betas que mandó Claude Code 2.1.299 en las corridas
# reales del 16-oct (Opus en la jaula y Haiku en probar-jaula.sh).
CLAVES = {"context_management", "max_tokens", "messages", "metadata", "model", "output_config",
          "safeguards", "stream", "system", "thinking", "tools"}
BETAS = {"afk-mode-2026-01-31", "claude-code-20250219", "context-management-2025-06-27",
         "dangerous-tool-use-2026-09-03", "effort-2025-11-24", "interleaved-thinking-2025-05-14",
         "mid-conversation-tool-changes-2026-07-01", "per-turn-control-2026-07-01",
         "prompt-caching-scope-2026-01-05", "thinking-display-updates-2026-08-18",
         "thinking-token-count-2026-05-13", BETA_OAUTH}
BETAS_VETADOS = ("mcp-client", "files-api", "code-execution")   # nunca, aunque alguien los añada arriba

def betas_filtrados(valor):
    """Solo los betas de la lista blanca (los demás se quitan en silencio), más el de OAuth."""
    betas = [b.strip() for b in (valor or "").split(",") if b.strip()]
    ok = [b for b in betas if b in BETAS and not b.startswith(BETAS_VETADOS)]
    return ",".join(ok if BETA_OAUTH in ok else ok + [BETA_OAUTH])

def validar(body):
    """(motivo de rechazo o None, modelo, effort). El motivo es un texto FIJO del
    puente; modelo y effort solo para el log (recortados y escapados allí)."""
    try:
        b = json.loads(body)
    except Exception:
        return "cuerpo no es JSON", "-", "-"
    if not isinstance(b, dict):
        return "cuerpo no es un objeto", "-", "-"
    modelo = b.get("model")
    oc = b.get("output_config")
    effort = oc.get("effort") if isinstance(oc, dict) else None
    log_m, log_e = str(modelo if modelo is not None else "-"), str(effort if effort is not None else "-")
    if set(b) - CLAVES:
        return "clave de primer nivel no permitida", log_m, log_e
    if modelo not in MODELOS:
        return "modelo no permitido", log_m, log_e
    if oc is not None and not isinstance(oc, dict):
        return "output_config no es un objeto", log_m, log_e
    if effort is not None and effort not in EFFORTS:
        return "effort mayor que medium", log_m, log_e
    tools = b.get("tools", [])
    if not isinstance(tools, list):
        return "tools no es una lista", log_m, log_e
    for t in tools:
        if not isinstance(t, dict) or t.get("type", "custom") != "custom":
            return "herramienta de servidor", log_m, log_e
    return None, log_m, log_e

class SinRedireccion(urllib.request.HTTPRedirectHandler):
    # Seguir una redirección reenviaría la cabecera Authorization (el token) a
    # dondequiera que apunte. Se trata como error, nunca se sigue.
    def redirect_request(self, *a, **k):
        return None

OPENER = urllib.request.build_opener(SinRedireccion)   # TLS: contexto por defecto (valida certificado y host)

def ruta_de(crudo):
    """Ruta sin query de la línea de petición, o None si no es aceptable.

    Claude Code 2.1.299 pide `/v1/messages?beta=true`. Se rechaza ANTES de partir:
    lo que no empieza por una sola `/` (con `//x/...`, urlsplit tomaría `x` como
    host), cualquier `..` y cualquier carácter de control."""
    if not crudo.startswith("/") or crudo.startswith("//") or ".." in crudo:
        return None
    if any(ord(c) < 0x20 or ord(c) == 0x7f for c in crudo):
        return None
    ruta = urllib.parse.urlsplit(crudo).path
    return ruta if "//" not in ruta else None

def para_log(texto, maximo=120):
    # Lo manda la jaula: se recorta y se escapa (nada de saltos de línea ni bytes
    # de control en el log del host).
    return texto[:maximo].encode("unicode_escape").decode("ascii")

class H(http.server.BaseHTTPRequestHandler):
    timeout = 120  # protege la lectura de la petición del cliente (slowloris); no limita la espera a la API

    def send_response(self, code, message=None):
        self._codigo = code
        super().send_response(code, message)

    def responder_sin_cuerpo(self, codigo):
        try:
            self.send_response(codigo)
            self.end_headers()
        except Exception:
            pass

    def handle_one(self):
        t0 = time.monotonic()
        self._codigo, enviados, modelo, effort, rechazo = 0, 0, "-", "-", None
        ruta = ruta_de(self.path)
        try:
            if self.command != "POST" or ruta not in RUTAS_PERMITIDAS:
                # 404 SIN reenviar ni leer el cuerpo: ni se usa el token ni se toca la API.
                return self.responder_sin_cuerpo(404)

            crudo = self.headers.get("content-length")
            if crudo is None:
                n = 0
            else:
                try:
                    n = int(crudo)
                except ValueError:
                    return self.responder_sin_cuerpo(400)
            if n < 0:
                return self.responder_sin_cuerpo(400)
            if n > MAX_CUERPO:
                return self.responder_sin_cuerpo(413)

            body = self.rfile.read(n) if n else b""
            rechazo, modelo, effort = validar(body)
            if rechazo:
                return self.responder_sin_cuerpo(400)   # sin reenviar

            hdrs = {k: v for k, v in self.headers.items() if k.lower() in CABECERAS_PERMITIDAS}
            beta = next((v for k, v in hdrs.items() if k.lower() == "anthropic-beta"), None)
            hdrs = {k: v for k, v in hdrs.items() if k.lower() != "anthropic-beta"}
            hdrs["anthropic-beta"] = betas_filtrados(beta)
            hdrs["Authorization"] = "Bearer " + TOKEN
            # A la API va la ruta permitida con la query original (?beta=true).
            q = urllib.parse.urlsplit(self.path).query
            req = urllib.request.Request(UPSTREAM + ruta + ("?" + q if q else ""), data=body,
                                         method="POST", headers=hdrs)
            try:
                r = OPENER.open(req, timeout=3600)
            except urllib.error.HTTPError as e:
                r = e
            except urllib.error.URLError:
                return self.responder_sin_cuerpo(502)

            estado = getattr(r, "status", None) or r.code
            if estado in (301, 302, 303, 307, 308):
                r.close()
                return self.responder_sin_cuerpo(502)

            self.send_response(estado)
            for k, v in r.headers.items():
                if k.lower() in CABECERAS_RESPUESTA:
                    self.send_header(k, v)
            self.end_headers()
            leer = getattr(r, "read1", None) or r.read   # read1: entrega cada trozo del stream sin esperar a llenar el buffer
            while True:
                chunk = leer(65536)
                if not chunk: break
                self.wfile.write(chunk)
                enviados += len(chunk)
        except Exception:
            # Nunca se deja escapar un traceback (ni al cliente ni con datos de la petición).
            self.responder_sin_cuerpo(500)
        finally:
            # Una línea por petición: hora, método, ruta SIN query, código, bytes de
            # respuesta, duración, modelo y effort pedidos y, si el puente la
            # rechazó, el motivo (texto fijo). Nunca cabeceras, el resto del cuerpo
            # ni el token. docker logs: --log-opt max-size=1m max-file=2.
            etiqueta = ruta if ruta is not None else "(rechazada) " + self.path.split("?", 1)[0]
            sys.stderr.write("%s %s %s %s %d %dms modelo=%s effort=%s%s\n" % (
                time.strftime("%Y-%m-%dT%H:%M:%S"), para_log(self.command or "-", 10),
                para_log(etiqueta), self._codigo, enviados, (time.monotonic() - t0) * 1000,
                para_log(modelo, 60), para_log(effort, 20),
                " rechazo=" + rechazo.replace(" ", "_") if rechazo else ""))
            sys.stderr.flush()

    do_POST = do_GET = do_PUT = do_DELETE = do_PATCH = handle_one
    def log_message(self, *a): pass   # el log propio va en handle_one (sin query ni cabeceras)

if __name__ == "__main__":
    with open("/run/secrets/claude-oauth-token") as f:
        TOKEN = f.read().strip()
    PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 1235
    http.server.ThreadingHTTPServer(("0.0.0.0", PORT), H).serve_forever()
