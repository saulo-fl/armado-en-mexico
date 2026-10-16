# Juez sin red ni token de la lista blanca del puente (Fase 3d, rondas de arreglo 1 y 2).
# python3 scripts/dcam/jaula/puente/test_puente.py  ->  "test_puente: OK" o AssertionError.
import json, os, sys, threading, http.server, urllib.request
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import puente
from puente import validar, betas_filtrados, query_de, BETA_OAUTH

def cuerpo(**extra):
    b = {"model": "claude-opus-5-5", "max_tokens": 8, "messages": [{"role": "user", "content": "hola"}],
         "tools": [{"name": "Read", "input_schema": {"type": "object"}}], "output_config": {"effort": "medium"}}
    b.update(extra)
    return json.dumps(b).encode()

def msg(*bloques):
    return [{"role": "user", "content": list(bloques)}]

URL = {"type": "url", "url": "https://atacante.example/x?d=DATOS"}
B64 = {"type": "base64", "media_type": "image/png", "data": "iVBORw0KGgo="}
BASE = b'"max_tokens":8,"messages":[{"role":"user","content":"hola"}]'

casos = [
    ("legítimo (como Claude Code)", cuerpo(), None),
    ("legítimo Haiku sin effort", cuerpo(model="claude-haiku-5-5", output_config={}), None),
    ("legítimo tool type custom", cuerpo(tools=[{"type": "custom", "name": "x", "input_schema": {}}]), None),
    ("legítimo: bloques reales (text, thinking, tool_use, tool_result con lista, image base64, system role)",
     cuerpo(system=[{"type": "text", "text": "s"}], messages=[
         {"role": "user", "content": [{"type": "text", "text": "a"}]},
         {"role": "assistant", "content": [{"type": "thinking", "thinking": "t", "signature": "s"},
                                            {"type": "redacted_thinking", "data": "x"},
                                            {"type": "tool_use", "id": "1", "name": "Read", "input": {}}]},
         {"role": "system", "content": "recordatorio"},
         {"role": "user", "content": [{"type": "tool_result", "tool_use_id": "1",
                                       "content": [{"type": "text", "text": "r"}, {"type": "image", "source": B64}]}]},
         {"role": "user", "content": [{"type": "document", "source": {"type": "text", "media_type": "text/plain", "data": "d"}}]}]),
     None),
    ("mcp_servers", cuerpo(mcp_servers=[{"type": "url", "url": "https://x", "name": "x"}]), "clave de primer nivel no permitida"),
    ("container", cuerpo(container="c"), "clave de primer nivel no permitida"),
    ("web_search de servidor", cuerpo(tools=[{"type": "web_search_20250305", "name": "web_search"}]), "herramienta de servidor"),
    ("web_fetch de servidor", cuerpo(tools=[{"type": "web_fetch_20250910", "name": "web_fetch"}]), "herramienta de servidor"),
    ("code_execution de servidor", cuerpo(tools=[{"type": "code_execution_20250825", "name": "x"}]), "herramienta de servidor"),
    ("tool que no es objeto", cuerpo(tools=["web_search"]), "herramienta de servidor"),
    ("modelo sonnet", cuerpo(model="claude-sonnet-5-5"), "modelo no permitido"),
    ("modelo que no es texto", cuerpo(model=["claude-opus-5-5"]), "modelo no permitido"),
    ("sin modelo", json.dumps({"max_tokens": 8, "messages": []}).encode(), "modelo no permitido"),
    ("effort high", cuerpo(output_config={"effort": "high"}), "effort mayor que medium"),
    ("effort max", cuerpo(output_config={"effort": "max"}), "effort mayor que medium"),
    ("effort que no es texto", cuerpo(output_config={"effort": {"x": 1}}), "effort mayor que medium"),
    ("no JSON", b"no json", "cuerpo no es JSON"),
    ("vacío", b"", "cuerpo no es JSON"),
    ("arreglo", b"[1]", "cuerpo no es un objeto"),
    # Ronda 2, Importante 1: claves repetidas (casos de la re-revisión) y NaN.
    ("dup tools (servidor primero, vacío al final)",
     b'{"model":"claude-haiku-5-5",' + BASE + b',"tools":[{"type":"web_search_20250305","name":"web_search"}],"tools":[]}', "clave repetida"),
    ("dup type dentro de tool",
     b'{"model":"claude-haiku-5-5",' + BASE + b',"tools":[{"type":"web_fetch_20250910","name":"x","type":"custom"}]}', "clave repetida"),
    ("dup model", b'{"model":"claude-sonnet-5-5","model":"claude-haiku-5-5",' + BASE + b'}', "clave repetida"),
    ("dup effort", b'{"model":"claude-haiku-5-5",' + BASE + b',"output_config":{"effort":"max","effort":"low"}}', "clave repetida"),
    ("dup en un bloque profundo",
     b'{"model":"claude-haiku-5-5","max_tokens":8,"messages":[{"role":"user","content":[{"type":"image","source":{"type":"url","type":"base64"}}]}]}', "clave repetida"),
    ("NaN", b'{"model":"claude-haiku-5-5","max_tokens":NaN,"messages":[]}', "cuerpo no es JSON"),
    # Ronda 2, Importante 2: salida por URL y bloques desconocidos.
    ("image con source url", cuerpo(messages=msg({"type": "image", "source": URL})), "bloque de contenido no permitido"),
    ("document con source url", cuerpo(messages=msg({"type": "document", "source": URL})), "bloque de contenido no permitido"),
    ("document con source content", cuerpo(messages=msg({"type": "document", "source": {"type": "content", "content": []}})), "bloque de contenido no permitido"),
    ("url dentro de tool_result", cuerpo(messages=msg({"type": "tool_result", "tool_use_id": "1",
                                                       "content": [{"type": "image", "source": URL}]})), "bloque de contenido no permitido"),
    ("image sin source", cuerpo(messages=msg({"type": "image"})), "bloque de contenido no permitido"),
    ("tipo de bloque desconocido", cuerpo(messages=msg({"type": "container_upload", "file_id": "f"})), "bloque de contenido no permitido"),
    ("server_tool_use en el historial", cuerpo(messages=msg({"type": "server_tool_use", "id": "1", "name": "web_search", "input": {}})), "bloque de contenido no permitido"),
    ("bloque desconocido en system", cuerpo(system=[{"type": "search_result", "source": "https://x"}]), "bloque de contenido no permitido"),
    ("bloque que no es objeto", cuerpo(messages=msg("texto suelto")), "bloque de contenido no permitido"),
]
for nombre, body, esperado in casos:
    motivo = validar(body)[0]
    assert motivo == esperado, f"{nombre}: esperaba {esperado!r}, salió {motivo!r}"
    print(f"ok  {nombre}: {motivo or 'pasa'}")

# Ronda 2, Menor: la query.
for crudo, esperado in [("/v1/messages", ""), ("/v1/messages?beta=true", "beta=true"),
                        ("/v1/messages?beta=false", None), ("/v1/messages?beta=true&x=1", None),
                        ("/v1/messages?x=1", None)]:
    assert query_de(crudo) == esperado, (crudo, query_de(crudo))
    print(f"ok  query {crudo!r}: {esperado!r}")

b = betas_filtrados("claude-code-20250219, mcp-client-2025-04-04,files-api-2025-04-14,code-execution-2025-08-25,x-raro")
assert b == "claude-code-20250219," + BETA_OAUTH, b
assert betas_filtrados(None) == BETA_OAUTH
print("ok  betas:", b)

# Ronda 2: lo que se REENVÍA es el objeto validado re-serializado, no los bytes de
# la jaula. Puente real (clase H) contra una API falsa local que guarda lo que recibe.
original = ('{ "model" : "claude-haiku-5-5", "max_tokens": 8,\n  "messages": [{"role": "user", "content": "hólà"}] }').encode("utf-8")
esperado_bytes = json.dumps(json.loads(original), ensure_ascii=True, allow_nan=False, separators=(",", ":")).encode("utf-8")
assert validar(original)[3] == esperado_bytes and esperado_bytes != original
recibido = {}
class API(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        recibido["path"] = self.path
        recibido["cl"] = self.headers.get("content-length")
        recibido["body"] = self.rfile.read(int(self.headers["content-length"]))
        self.send_response(200); self.send_header("content-type", "application/json"); self.end_headers()
        self.wfile.write(b"{}")
    def log_message(self, *a): pass
api = http.server.HTTPServer(("127.0.0.1", 0), API)
threading.Thread(target=api.serve_forever, daemon=True).start()
puente.UPSTREAM = "http://127.0.0.1:%d" % api.server_port
puente.TOKEN = "falso"
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), puente.H)
threading.Thread(target=srv.serve_forever, daemon=True).start()
stderr, sys.stderr = sys.stderr, open(os.devnull, "w")   # la línea de log del puente, fuera del test
try:
    r = urllib.request.urlopen(urllib.request.Request(
        "http://127.0.0.1:%d/v1/messages?beta=true" % srv.server_port, data=original, method="POST",
        headers={"content-type": "application/json"}), timeout=10)
    assert r.status == 200
    primero = dict(recibido)
    # Revisión final, M1: un surrogate suelto (emoji partido) se reenvía; antes, 500.
    suelto = rb'{"model":"claude-haiku-5-5","max_tokens":8,"messages":[{"role":"user","content":"a\ud83d"}]}'
    r2 = urllib.request.urlopen(urllib.request.Request(
        "http://127.0.0.1:%d/v1/messages?beta=true" % srv.server_port, data=suelto, method="POST",
        headers={"content-type": "application/json"}), timeout=10)
    assert r2.status == 200 and recibido["body"] == suelto, (r2.status, recibido["body"])
finally:
    sys.stderr = stderr
api.shutdown(); srv.shutdown()
assert primero["body"] == esperado_bytes, (primero["body"], esperado_bytes)
assert primero["cl"] == str(len(esperado_bytes)), primero["cl"]
assert primero["path"] == "/v1/messages?beta=true", primero["path"]
print("ok  surrogate suelto: reenviado (200) y escapado, sin 500")
print("ok  reenviado = re-serializado (%d bytes en vez de %d), Content-Length %s, query %s"
      % (len(esperado_bytes), len(original), primero["cl"], primero["path"].split("?")[1]))
print("test_puente: OK")
