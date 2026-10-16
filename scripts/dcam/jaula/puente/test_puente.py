# Juez sin red ni token de la lista blanca del puente (Fase 3d, ronda de arreglo 1).
# python3 scripts/dcam/jaula/puente/test_puente.py  ->  "test_puente: OK" o AssertionError.
import json, os, sys
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from puente import validar, betas_filtrados, BETA_OAUTH

def cuerpo(**extra):
    b = {"model": "claude-opus-5-5", "max_tokens": 8, "messages": [{"role": "user", "content": "hola"}],
         "tools": [{"name": "Read", "input_schema": {"type": "object"}}], "output_config": {"effort": "medium"}}
    b.update(extra)
    return json.dumps(b).encode()

casos = [
    ("legítimo (como Claude Code)", cuerpo(), None),
    ("legítimo Haiku sin effort", cuerpo(model="claude-haiku-5-5", output_config={}), None),
    ("legítimo tool type custom", cuerpo(tools=[{"type": "custom", "name": "x", "input_schema": {}}]), None),
    ("mcp_servers", cuerpo(mcp_servers=[{"type": "url", "url": "https://x", "name": "x"}]), "clave de primer nivel no permitida"),
    ("container", cuerpo(container="c"), "clave de primer nivel no permitida"),
    ("web_search de servidor", cuerpo(tools=[{"type": "web_search_20250305", "name": "web_search"}]), "herramienta de servidor"),
    ("web_fetch de servidor", cuerpo(tools=[{"type": "web_fetch_20250910", "name": "web_fetch"}]), "herramienta de servidor"),
    ("code_execution de servidor", cuerpo(tools=[{"type": "code_execution_20250825", "name": "x"}]), "herramienta de servidor"),
    ("tool que no es objeto", cuerpo(tools=["web_search"]), "herramienta de servidor"),
    ("modelo sonnet", cuerpo(model="claude-sonnet-5-5"), "modelo no permitido"),
    ("sin modelo", json.dumps({"max_tokens": 8, "messages": []}).encode(), "modelo no permitido"),
    ("effort high", cuerpo(output_config={"effort": "high"}), "effort mayor que medium"),
    ("effort max", cuerpo(output_config={"effort": "max"}), "effort mayor que medium"),
    ("no JSON", b"no json", "cuerpo no es JSON"),
    ("vacío", b"", "cuerpo no es JSON"),
    ("arreglo", b"[1]", "cuerpo no es un objeto"),
]
for nombre, body, esperado in casos:
    motivo = validar(body)[0]
    assert motivo == esperado, f"{nombre}: esperaba {esperado!r}, salió {motivo!r}"
    print(f"ok  {nombre}: {motivo or 'pasa'}")

b = betas_filtrados("claude-code-20250219, mcp-client-2025-04-04,files-api-2025-04-14,code-execution-2025-08-25,x-raro")
assert b == "claude-code-20250219," + BETA_OAUTH, b
assert betas_filtrados(None) == BETA_OAUTH
print("ok  betas:", b)
print("test_puente: OK")
