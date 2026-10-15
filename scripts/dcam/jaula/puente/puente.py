# puente.py — el único puente entre la jaula del solucionador DCAM y el router
# llama-server de APOLO (RTX 3090, 172.17.0.1:8090). Copia adaptada de
# claude-lm-proxy.py (HEFESTO, ~/.local/bin): mueve el system message de Claude
# Code al inicio (las plantillas Jinja de Qwen exigen "System message must be
# at the beginning"; la API de Anthropic no) y traduce el effort del lanzador
# al reasoning_effort nativo de Qwen 3.8.
#
# Por qué existe este contenedor y no tinyproxy: la jaula del agente NO lleva
# ninguna clave ni puede llegar a 172.17.0.1:8090 por sí misma (red
# --internal). Este es el ÚNICO componente con la clave del router y con
# salida al host; solo reenvía las dos rutas que Claude Code necesita — todo
# lo demás es 404 SIN reenviar, para no exponer el router entero a la jaula.
import http.server, json, os, sys, urllib.request, urllib.error

UPSTREAM = os.environ.get("PUENTE_UPSTREAM", "http://172.17.0.1:8090")
with open("/run/secrets/router-key") as f:
    KEY = f.read().strip()
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 1235

RUTAS_PERMITIDAS = ("/v1/messages", "/v1/messages/count_tokens")

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
    effort = (b.get("output_config") or {}).get("effort")
    b["chat_template_kwargs"] = dict(b.get("chat_template_kwargs") or {}, reasoning_effort=QWEN38.get(effort, "medium"))
    return json.dumps(b).encode()

class H(http.server.BaseHTTPRequestHandler):
    def handle_one(self):
        if self.command != "POST" or self.path not in RUTAS_PERMITIDAS:
            # 404 SIN reenviar: ni se lee el upstream ni se gasta la clave en rutas no permitidas.
            self.send_response(404)
            self.end_headers()
            return
        n = int(self.headers.get("content-length", 0))
        body = self.rfile.read(n) if n else None
        if body:
            body = fix(body)
        hdrs = {k: v for k, v in self.headers.items() if k.lower() not in ("host", "content-length", "accept-encoding")}
        hdrs["Authorization"] = "Bearer " + KEY   # Claude Code manda su propio token; el router necesita el suyo
        req = urllib.request.Request(UPSTREAM + self.path, data=body, method=self.command, headers=hdrs)
        try:
            r = urllib.request.urlopen(req, timeout=3600)
        except urllib.error.HTTPError as e:
            r = e
        except urllib.error.URLError:
            self.send_response(502)
            self.end_headers()
            return
        self.send_response(getattr(r, "status", None) or r.code)
        for k, v in r.headers.items():
            if k.lower() not in ("transfer-encoding", "content-length", "connection", "content-encoding"):
                self.send_header(k, v)
        self.end_headers()
        read = getattr(r, "read1", None) or r.read   # read1: entrega cada trozo del stream sin esperar a llenar el buffer
        while True:
            chunk = read(65536)
            if not chunk: break
            self.wfile.write(chunk)
    do_POST = do_GET = do_PUT = do_DELETE = do_PATCH = handle_one
    def log_message(self, *a): pass

http.server.ThreadingHTTPServer(("0.0.0.0", PORT), H).serve_forever()
