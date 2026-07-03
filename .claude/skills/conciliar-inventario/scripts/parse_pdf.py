#!/usr/bin/env python3
"""Parser de inventarios DCAM/OTCA de "Armado en México".

Detecta el formato solo y extrae [{idx, name, qty, priceN}].
Uso:  python3 parse_pdf.py <ruta.pdf> [--json salida.json]

- DCAM (SEDENA): tabla posicional. precio x>505, existencia 440<x<500,
  nombre/descripcion x<200; precio+existencia comparten la fila 'y' del nombre corto.
- OTCA (anexo Monterrey): columnas apiladas DESCRIPCIÓN / EXISTENCIA / PRECIO.
  Por item: texto(desc) -> entero(existencia) -> "$ numero"(precio).
"""
import sys, re, json
from collections import defaultdict
import fitz  # PyMuPDF

PRICE = re.compile(r'^\d{1,3}(?:,\d{3})*\.\d{2}$')
DCAM_HDR = ("SECRETARIA", "DIRECCION DE COMERCIALIZACION", "EXISTENCIA DE ARMAS",
            "LAS EXISTENCIAS", "LA ADQUISIC", "52 DE LA LEY", "al cierre",
            "Descripción", "Existencia", "Precio en")


def is_hdr(t):
    return any(t.startswith(h) for h in DCAM_HDR) or re.match(r'^\d{1,2}/\d{1,2}/\d{4}$', t.strip())


def parse_dcam(doc):
    recs = []
    for page in doc:
        d = defaultdict(list)
        for w in page.get_text("words"):
            d[(w[5], w[6])].append(w)
        L = []
        for v in d.values():
            x0 = min(t[0] for t in v)
            y = (min(t[1] for t in v) + max(t[3] for t in v)) / 2
            L.append((y, x0, " ".join(t[4] for t in sorted(v, key=lambda t: t[0]))))
        prices = [(y, t) for y, x, t in L if x > 505 and PRICE.match(t.strip())]
        qtys = [(y, t) for y, x, t in L if 440 < x < 500 and t.strip().isdigit()]
        descs = [(y, t) for y, x, t in L if x < 200 and not is_hdr(t) and t.strip()]
        for py, pt in prices:
            q = min(qtys, key=lambda e: abs(e[0] - py))[1] if qtys else '0'
            nm = min(descs, key=lambda e: abs(e[0] - py))[1] if descs else '?'
            recs.append({"name": nm.strip(), "qty": int(q),
                         "priceN": float(pt.replace(",", ""))})
    return recs


def parse_otca(doc):
    # Layout apilado: DESCRIPCIÓN (multi-linea) -> EXISTENCIA (entero, puede traer coma)
    # -> PRECIO ("$ n.nn"). Salta el boilerplate de encabezado/pie que se repite por pagina.
    BOIL = ("DESCRIPC", "EXISTENC", "PRECIO", "INCLUYE", "LAS EXISTENC", "LA ADQUISIC",
            "FEDERAL DE ARMAS", "SECRETAR", "DIRECCI", "OFICINAS", "EXISTENCIAS DE",
            "RVC-", "CAPACIDAD DE 5 CARTUCHOS, CA")

    def boil(s):
        u = s.upper()
        return any(u.startswith(b) for b in BOIL) or re.match(r'^\d{1,2} DE [A-ZÁÉÍÓÚ]+ DE \d{4}$', u)

    lines = []
    for page in doc:
        for b in page.get_text("blocks"):
            for ln in b[4].splitlines():
                s = ln.strip()
                if s:
                    lines.append(s)
    recs = []
    desc = []
    qty = None
    money = re.compile(r'\$\s*([\d,]+\.\d{2})')
    for s in lines:
        if boil(s):
            continue
        if re.fullmatch(r'[\d,]+', s):            # EXISTENCIA (permite coma: 17,700)
            qty = int(s.replace(",", ""))
            continue
        m = money.search(s)
        if m and qty is not None:                 # cierra el item
            recs.append({"name": " ".join(desc).strip(), "qty": qty,
                         "priceN": float(m.group(1).replace(",", ""))})
            desc, qty = [], None
        elif not m:                               # texto de descripción (incluye palabras sueltas)
            desc.append(s)
    return recs


def main():
    if len(sys.argv) < 2:
        print("uso: parse_pdf.py <ruta.pdf> [--json salida.json]"); sys.exit(1)
    path = sys.argv[1]
    doc = fitz.open(path)
    head = "".join(doc[0].get_text()[:400])
    fmt = "DCAM" if "DIRECCION DE COMERCIALIZACION" in head or "EXISTENCIA DE ARMAS" in head else "OTCA"
    recs = parse_dcam(doc) if fmt == "DCAM" else parse_otca(doc)
    for i, r in enumerate(recs, 1):
        r["idx"] = i
    out = {"formato": fmt, "paginas": doc.page_count, "total": len(recs), "items": recs}
    if "--json" in sys.argv:
        dest = sys.argv[sys.argv.index("--json") + 1]
        json.dump(out, open(dest, "w"), ensure_ascii=False, indent=0)
        print(f"[{fmt}] {len(recs)} renglones -> {dest}")
    else:
        print(f"# formato={fmt} paginas={doc.page_count} renglones={len(recs)}")
        for r in recs:
            print(f"{r['idx']:3} | qty={r['qty']:>5} | ${r['priceN']:>12,.2f} | {r['name'][:60]}")


if __name__ == "__main__":
    main()
