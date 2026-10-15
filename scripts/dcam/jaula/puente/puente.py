# puente.py — el único puente entre la jaula del solucionador DCAM y el router
# llama-server de APOLO (RTX 3090, accesible en PUENTE_UPSTREAM). Copia adaptada
# de claude-lm-proxy.py (HEFESTO, ~/.local/bin): mueve el system message de
# Claude Code al inicio (las plantillas Jinja de Qwen exigen "System message
# must be at the beginning"; la API de Anthropic no) y traduce el effort del
# lanzador al reasoning_effort nativo de Qwen 3.8.
#
# Por qué existe este contenedor y no tinyproxy: la jaula del agente NO lleva
# ninguna clave ni puede llegar al router por sí misma (red --internal). Este
# es el ÚNICO componente con la clave del router y con salida al host; solo
# reenvía las dos rutas que Claude Code necesita — todo lo demás es 404 SIN
# reenviar, para no exponer el router entero a la jaula.
#
# Endurecido en la ronda de revisión 1/5 (Fase 2): límites de cuerpo/tiempo,
# lista blanca de cabeceras, sin seguir redirecciones, effort solo para Qwen
# 3.8, sin tracebacks hacia el cliente.
import http.server, json, os, sys, urllib.request, urllib.error

UPSTREAM = os.environ.get("PUENTE_UPSTREAM", "http://172.30.0.1:8090")
with open("/run/secrets/router-key") as f:
    KEY = f.read().strip()
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 1235

RUTAS_PERMITIDAS = ("/v1/messages", "/v1/messages/count_tokens")
MAX_CUERPO = 32 * 1024 * 1024  # 32 MiB — ni Claude Code ni el router mandan/esperan más
CABECERAS_PERMITIDAS = ("content-type", "anthropic-version", "anthropic-beta", "accept")

# Qwen 3.8: reasoning_effort nativo de su plantilla (solo low | medium | xhigh;
# otro valor rompe la plantilla). xhigh entra en bucle con este modelo — nunca
# se manda, aunque el lanzador lo pida. Si la petición no trae effort, medium.
QWEN38 = {"low": "low", "medium": "medium", "high": "medium", "xhigh": "medium", "max": "medium"}

def fix(body):
    try:
        b = json.loads(body)
    except Exception:
        return body
    msgs = b.get("messages")
    if not isinstance(msgs, list):
        return body
    out = []
    for m in msgs:
        if m.get("role") != "system" or not out:
            out.append(m); continue
        c = m.get("content", "")
        blocks = [{"type": "text", "text": c}] if isinstance(c, str) else c
        blocks = [dict(x, text="<system-reminder>\n" + x["text"] + "\n</system-reminder>") if x.get("type") == "text" else x
                  for x in blocks]
        prev = out[-1]
        if prev.get("role") == "user":   # se pega al último turno de usuario para no duplicar turnos
            pc = prev["content"]
            prev["content"] = ([{"type": "text", "text": pc}] if isinstance(pc, str) else list(pc)) + blocks
        else:
            out.append({"role": "user", "content": blocks})
    b["messages"] = out
    # Solo Qwen 3.8 entiende reasoning_effort; otro modelo lo ignoraría de todas
    # formas, pero no hay razón para mandarle un campo que no es suyo.
    if "qwen3.8" in b.get("model", ""):
        effort = (b.get("output_config") or {}).get("effort")
        b["chat_template_kwargs"] = dict(b.get("chat_template_kwargs") or {}, reasoning_effort=QWEN38.get(effort, "medium"))
    return json.dumps(b).encode()

class SinRedireccion(urllib.request.HTTPRedirectHandler):
    # No hay ninguna razón legítima para que el router redirija, y seguir una
    # redirección reenviaría la cabecera Authorization (la clave real) a
    # dondequiera que apunte. Se trata como error, nunca se sigue.
    def redirect_request(self, *a, **k):
        return None

OPENER = urllib.request.build_opener(SinRedireccion)

class H(http.server.BaseHTTPRequestHandler):
    timeout = 120  # protege la lectura de la petición del cliente (slowloris); no limita la espera al router

    def responder_sin_cuerpo(self, codigo):
        try:
            self.send_response(codigo)
            self.end_headers()
        except Exception:
            pass

    def handle_one(self):
        try:
            if self.command != "POST" or self.path not in RUTAS_PERMITIDAS:
                # 404 SIN reenviar ni leer el cuerpo: ni se gasta la clave ni se toca el upstream.
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

            body = self.rfile.read(n) if n else None
            if body:
                body = fix(body)

            hdrs = {k: v for k, v in self.headers.items() if k.lower() in CABECERAS_PERMITIDAS}
            hdrs["Authorization"] = "Bearer " + KEY   # Claude Code manda su propio token; el router necesita el suyo
            req = urllib.request.Request(UPSTREAM + self.path, data=body, method=self.command, headers=hdrs)
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
                if k.lower() not in ("transfer-encoding", "content-length", "connection", "content-encoding"):
                    self.send_header(k, v)
            self.end_headers()
            leer = getattr(r, "read1", None) or r.read   # read1: entrega cada trozo del stream sin esperar a llenar el buffer
            while True:
                chunk = leer(65536)
                if not chunk: break
                self.wfile.write(chunk)
        except Exception:
            # Nunca se deja escapar un traceback (ni al cliente ni con datos de la petición
            # de por medio); el contenedor solo necesita saber que algo falló.
            self.responder_sin_cuerpo(500)

    do_POST = do_GET = do_PUT = do_DELETE = do_PATCH = handle_one
    def log_message(self, *a): pass

http.server.ThreadingHTTPServer(("0.0.0.0", PORT), H).serve_forever()
