#!/usr/bin/env python3
# Armado en México — Copyright (C) 2026 Saulo Flores León
# SPDX-License-Identifier: AGPL-3.0-or-later
# Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
# (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

"""Parser de inventarios DCAM/OTCA de "Armado en México".

Detecta el formato solo y extrae [{idx, name, qty, priceN}] (+ desc en DCAM).
Uso:  python3 parse_pdf.py <ruta.pdf> [--json salida.json]

- DCAM (SEDENA): tabla posicional. Columnas relativas a las cabeceras "Existencia" y
  "Precio" de la pag. 1 (en oct-2025 estan mas a la izquierda que en 2026),
  nombre/descripcion x<200; precio+existencia comparten la fila 'y' del nombre corto.
  desc = la descripcion larga bajo el nombre corto, aunque se derrame a la pagina
  siguiente. Es lo unico que distingue dos renglones con el MISMO nombre corto.
- OTCA (anexo Monterrey): columnas apiladas DESCRIPCIÓN / EXISTENCIA / PRECIO.
  Por item: texto(desc) -> entero(existencia) -> "$ numero"(precio).
"""
import sys, re, json
from collections import defaultdict, Counter
import fitz  # PyMuPDF

PRICE = re.compile(r'^\d{1,3}(?:,\d{3})*\.\d{2}(?![\d,])')
DCAM_HDR = ("SECRETARIA", "DIRECCION DE COMERCIALIZACION", "EXISTENCIA DE ",  # ARMAS/MUNICIONES/ACCESORIOS
            "LAS EXISTENCIAS", "LA ADQUISIC", "52 DE LA LEY", "al cierre",
            "Descripción", "Existencia", "Precio en")


def is_hdr(t):
    return any(t.startswith(h) for h in DCAM_HDR) or re.match(r'^\d{1,2}/\d{1,2}/\d{4}$', t.strip())


INT = re.compile(r'[\d,]+')  # la EXISTENCIA puede traer coma: "3,500"


def _cols(doc):
    """x0 de las cabeceras Existencia y Precio (la mas a la derecha): el PDF de
    oct-2025 tiene las columnas mas a la izquierda que los de 2026."""
    ws = doc[0].get_text("words")
    ex = max(w[0] for w in ws if w[4].upper() == "EXISTENCIA")
    pr = max(w[0] for w in ws if w[4].upper() == "PRECIO")
    return ex - 20, pr - 30


def _rows(page, cols=(440, 505)):
    """(precios, existencias, descripciones) de una pagina, por posicion."""
    qx, px = cols
    d = defaultdict(list)
    for w in page.get_text("words"):
        d[(w[5], w[6])].append(w)
    L = []
    for v in d.values():
        x0 = min(t[0] for t in v)
        y = (min(t[1] for t in v) + max(t[3] for t in v)) / 2
        L.append((y, x0, " ".join(t[4] for t in sorted(v, key=lambda t: t[0]))))
    # match (no fullmatch): en oct-2025 un precio sale pegado al texto que se le encima
    # ("11,930.34REVOLVER.F.A.TAU", Taurus 856 Tungsten); se toma solo el numero
    prices = [(y, m.group()) for y, x, t in L if x > px and (m := PRICE.match(t.strip()))]
    qtys = [(y, t) for y, x, t in L if qx < x < px + 30 and INT.fullmatch(t.strip())]
    # columna Descripcion entera (sin encabezado ni el numero de pagina del pie, y~767;
    # por posicion: un codigo suelto como "75" o "23715" es texto de la descripcion)
    left = sorted((y, x, t) for y, x, t in L
                  if x < qx and y < 755 and t.strip() and not is_hdr(t))
    descs = [(y, t) for y, x, t in left if x < 200]
    return prices, qtys, descs, left


def parse_dcam(doc):
    # El nombre corto se imprime a un desplazamiento vertical FIJO respecto del
    # precio, pero ese offset cambia entre layouts (0.0 en el PDF de 2025-10,
    # +1.6 en los de 2026). Se calibra con la moda del documento en vez de
    # fijarlo: asi el "mas cercano" no se lleva una linea de descripcion larga
    # que se derrame justo sobre el renglon del precio.
    cols = _cols(doc)
    pages = [_rows(page, cols) for page in doc]
    off = Counter()
    for prices, _q, descs, _l in pages:
        for py, _pt in prices:
            if descs:
                off[round(min(descs, key=lambda e: abs(e[0] - py))[0] - py, 1)] += 1
    dy = off.most_common(1)[0][0] if off else 0.0

    recs, pos = [], []
    for pn, (prices, qtys, descs, _l) in enumerate(pages):
        for py, pt in sorted(prices):
            q = min(qtys, key=lambda e: abs(e[0] - py))[1] if qtys else '0'
            ny, nm = min(descs, key=lambda e: abs(e[0] - (py + dy))) if descs else (py, '?')
            if abs(ny - (py + dy)) > 10:  # oct-2025: nombre con matriz rota (revolveres Taurus); leelo renderizando
                nm = '?'
            recs.append({"name": nm.strip(), "qty": int(q.replace(",", "")),
                         "priceN": float(pt.replace(",", "")), "pagina": pn})
            pos.append((pn, ny))
    # Descripcion larga: lo que hay entre el nombre corto y el siguiente, cruzando
    # paginas. Sobre cada nombre hay una linea en negrita (casi siempre vacia; a veces
    # "(Venta exclusiva para Oficiales...)") que llega a ~13 pt por encima y se encima
    # con el nombre: el corte a 14 pt la deja fuera de la descripcion anterior.
    lines = [(pn, y, t) for pn, pg in enumerate(pages) for y, _x, t in pg[3]]
    for i, r in enumerate(recs):
        ini = pos[i]
        fin = (pos[i + 1][0], pos[i + 1][1] - 14) if i + 1 < len(recs) else (len(pages), 0)
        r["desc"] = re.sub(r'\s+', ' ', " ".join(
            t for pn, y, t in lines if (ini[0], ini[1] + 1) < (pn, y) < fin)).strip()
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


def formato(doc):
    """La OTCA pone "$" en los precios; la DCAM (2025 y 2026) no. La cabecera no sirve:
    oct-2025 dice "DIRECCIÓN DE COMERCIALIZACIÓN" (con acentos, al pie) y "EXISTENCIAS"."""
    return "OTCA" if "$" in doc[0].get_text() else "DCAM"


def write_tsv(recs, dest):
    """Escribe TSV limpio: idx, name, qty, priceN, desc (con cabecera)."""
    with open(dest, "w", encoding="utf-8") as f:
        f.write("idx\tname\tqty\tpriceN\tdesc\n")
        for r in recs:
            f.write(f"{r['idx']}\t{r['name']}\t{r['qty']}\t{r['priceN']:.2f}\t{r.get('desc','')}\n")


def main():
    if len(sys.argv) < 2:
        print("uso: parse_pdf.py <ruta.pdf> [--json salida.json] [--tsv salida.tsv]"); sys.exit(1)
    path = sys.argv[1]
    doc = fitz.open(path)
    fmt = formato(doc)
    recs = parse_dcam(doc) if fmt == "DCAM" else parse_otca(doc)
    for i, r in enumerate(recs, 1):
        r["idx"] = i
    out = {"formato": fmt, "paginas": doc.page_count, "total": len(recs), "items": recs}
    wrote = False
    if "--json" in sys.argv:
        dest = sys.argv[sys.argv.index("--json") + 1]
        json.dump(out, open(dest, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
        print(f"[{fmt}] {len(recs)} renglones -> {dest}")
        wrote = True
    if "--tsv" in sys.argv:
        dest = sys.argv[sys.argv.index("--tsv") + 1]
        write_tsv(recs, dest)
        print(f"[{fmt}] {len(recs)} renglones -> {dest} (TSV)")
        wrote = True
    if not wrote:
        print(f"# formato={fmt} paginas={doc.page_count} renglones={len(recs)}")
        for r in recs:
            print(f"{r['idx']:3} | qty={r['qty']:>5} | ${r['priceN']:>12,.2f} | {r['name'][:60]}")


if __name__ == "__main__":
    main()
