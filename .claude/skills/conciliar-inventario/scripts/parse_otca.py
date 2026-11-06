#!/usr/bin/env python3
# Armado en México — Copyright (C) 2026 Saulo Flores León
# SPDX-License-Identifier: AGPL-3.0-or-later
# Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
# (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

"""Lee el PDF de existencias de la OTCA (Monterrey) a JSON + TSV.

A diferencia de los tres PDF de la DCAM, la OTCA publica UN solo PDF con armas,
municiones y accesorios juntos, y sin nombre corto: cada renglón es solo la
descripción larga (que se parte en varias líneas, arriba y abajo de la línea que
lleva existencia y precio), la existencia y el precio.

Uso:
  python3 parse_otca.py <otca.pdf> [--json salida.json] [--tsv salida.tsv]

Salida JSON: {"formato": "OTCA", "fecha": "AAAA-MM-DD"|null, "paginas": N, "total": N,
              "items": [{"idx", "name", "desc", "qty", "priceN", "cat", "pagina"}]}
  name = desc (la OTCA no trae nombre corto; las ligas usan este texto exacto).
  cat  = armas | cartuchos | accesorios, deducida de la primera palabra.
"""
import json, re, sys, unicodedata

RE_FECHA = re.compile(r"^\s*(\d{1,2}) DE ([A-ZÁÉÍÓÚ]+) DE (\d{4})\s*$")
MESES = {"ENERO": 1, "FEBRERO": 2, "MARZO": 3, "ABRIL": 4, "MAYO": 5, "JUNIO": 6, "JULIO": 7,
         "AGOSTO": 8, "SEPTIEMBRE": 9, "SETIEMBRE": 9, "OCTUBRE": 10, "NOVIEMBRE": 11, "DICIEMBRE": 12}

ARMAS = ("FUSIL", "RIFLE", "PISTOLA", "ESCOPETA", "SUBAMETRALLADORA", "REVOLVER", "REVÓLVER",
         "CARABINA", "ARMA", "LANZA")
CARTUCHOS = ("CARTUCHO", "CARTUCHOS", "CART", "CARTS", "MUNICION", "MUNICIÓN")


def _sin_acentos(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def categoria(desc):
    """armas | cartuchos | accesorios, por la primera palabra significativa.

    Algunos renglones llevan un código antes (p. ej. «H87 PISTOLA …»): se salta
    una primera palabra que tenga dígitos."""
    palabras = re.findall(r"[A-ZÁÉÍÓÚÑ0-9]+", desc.upper())
    if palabras and re.search(r"\d", palabras[0]) and len(palabras) > 1:
        palabras = palabras[1:]
    p = _sin_acentos(palabras[0]) if palabras else ""
    if p in tuple(_sin_acentos(x) for x in ARMAS) or p.rstrip("S") in tuple(_sin_acentos(x) for x in ARMAS):
        return "armas"
    if p in tuple(_sin_acentos(x) for x in CARTUCHOS) or p.startswith("CARTUCH"):
        return "cartuchos"
    return "accesorios"


def _limpia(s):
    return re.sub(r"\s+", " ", s).strip()


def _num(s):
    return float(re.sub(r"[^0-9.]", "", s or "") or "nan")


def parse_pdf(ruta):
    """Lee la tabla de cada página con PyMuPDF (`find_tables`).

    El PDF de la OTCA es una tabla con bordes de tres columnas (descripción,
    existencia, precio). Leer el texto plano no basta: la descripción se parte
    arriba y abajo de la línea del precio y, cuando dos renglones van pegados,
    no hay forma fiable de saber de cuál es cada pedazo (18-jun-2026: el final de
    la Stoeger SP312 caía en la Benelli MR1). Las celdas de la tabla sí lo dicen."""
    import pymupdf
    doc = pymupdf.open(ruta)
    fecha = None
    items = []
    for np_, pag in enumerate(doc):
        if fecha is None:
            for l in pag.get_text().split("\n"):
                m = RE_FECHA.match(l)
                if m and m.group(2) in MESES:
                    fecha = f"{int(m.group(3)):04d}-{MESES[m.group(2)]:02d}-{int(m.group(1)):02d}"
                    break
        for tabla in pag.find_tables().tables:
            for fila in tabla.extract():
                if len(fila) < 3:
                    continue
                desc, qty, precio = (_limpia(c or "") for c in fila[:3])
                if not re.fullmatch(r"\d[\d,]*", qty) or "$" not in precio:
                    continue  # encabezado de la tabla o fila vacía
                items.append({
                    "name": desc,
                    "desc": desc,
                    "qty": int(qty.replace(",", "")),
                    "priceN": _num(precio),
                    "cat": categoria(desc),
                    "pagina": np_,
                })
    for n, it in enumerate(items, 1):
        it["idx"] = n
    return {"formato": "OTCA", "fecha": fecha, "paginas": len(doc), "total": len(items), "items": items}


def main():
    a = sys.argv[1:]
    if not a:
        print(__doc__); sys.exit(1)
    out = parse_pdf(a[0]); a = a[1:]
    if "--json" in a:
        with open(a[a.index("--json") + 1], "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=1); f.write("\n")
    if "--tsv" in a:
        with open(a[a.index("--tsv") + 1], "w", encoding="utf-8") as f:
            f.write("idx\tcat\tqty\tpriceN\tdesc\n")
            for it in out["items"]:
                f.write(f"{it['idx']}\t{it['cat']}\t{it['qty']}\t{it['priceN']:.2f}\t{it['desc']}\n")
    if "--json" not in a and "--tsv" not in a:
        print(json.dumps(out, ensure_ascii=False, indent=1))
    print(f"OTCA {out['fecha']}: {out['total']} renglones "
          f"({', '.join(f'{c} {sum(1 for i in out['items'] if i['cat'] == c)}' for c in ('armas', 'cartuchos', 'accesorios'))})",
          file=sys.stderr)


if __name__ == "__main__":
    main()
