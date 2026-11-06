#!/usr/bin/env python3
# Armado en México — Copyright (C) 2026 Saulo Flores León
# SPDX-License-Identifier: AGPL-3.0-or-later
# Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
# (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

"""Aplica un inventario de la OTCA (Monterrey) al catálogo.

Entrada: el mapeo de `mapear-otca.py`. Por cada categoría:
  - registra el inventario (autoridad OTCA, `primary: false`) en su lista de
    manuales, apuntando a `inventarios/otca-stock-<fecha>.pdf`;
  - añade a cada ficha un registro `{ manualId, price, date, qty }` en su
    historial, EN ORDEN DE FECHA (la OTCA publica días o semanas después de
    inventarios DCAM que ya están en el historial);
  - NO toca precios vigentes ni existencias DCAM (AMX_ARMAS_PRECIOS /
    AMX_ARMAS_EXISTENCIAS): manda la DCAM (decisión de Saulo, 05-nov-2026).
Las fichas que estaban en el OTCA anterior y no vienen en este quedan como
«agotadas en OTCA» solas: la vista lo deduce del historial.

Uso:
  python3 aplicar-otca.py --mapeo mapeo-otca.json --fecha AAAA-MM-DD --data-dir src/data/
                          [--pdf otca.pdf --public public/] [--dry-run] [--rehacer]
"""
import argparse, json, re, shutil, sys
from pathlib import Path

MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
         "septiembre", "octubre", "noviembre", "diciembre"]

CATS = {
    # cat: (archivo, marcador del historial, marcador de manuales, prefijo de manualId, nombre)
    "armas": ("data-precios.js", "window.AMX_PRICE_HISTORY_SEED", "window.AMX_MANUALES_SEED = [\n",
              "man_otca_armas", "Existencias de armas OTCA"),
    "cartuchos": ("data-municiones.js", "window.MUNICIONES_PRICE_HISTORY", "window.MUNICIONES_MANUALES = [\n",
                  "man_mun_otca", "Existencias de municiones OTCA"),
    "accesorios": ("data-accesorios.js", "window.ACCESORIOS_PRICE_HISTORY", "window.ACCESORIOS_MANUALES = [\n",
                   "man_acc_otca", "Existencias de accesorios OTCA"),
}


def eprint(*a):
    print(*a, file=sys.stderr)


def manual_id(cat, fecha):
    return f"{CATS[cat][3]}_{fecha.replace('-', '_')}"


def fmt_price(n):
    return f"${n:,.2f} MXN"


def nombre_fecha(fecha):
    y, m, d = fecha.split("-")
    return f"{int(d)} de {MESES[int(m) - 1]} {y}"


def pdf_nombre(fecha):
    return f"otca-stock-{fecha}.pdf"


def span_bloque(content, marcador):
    i = content.find(marcador)
    if i < 0:
        raise SystemExit(f"no encuentro {marcador}")
    m = re.compile(r"^\s*\};", re.MULTILINE).search(content, i)
    return i, (m.end() if m else len(content))


def registrar_manual(content, cat, fecha):
    mid = manual_id(cat, fecha)
    if f"id: '{mid}'" in content:
        return content, False
    marcador = CATS[cat][2]
    if marcador not in content:
        raise SystemExit(f"no encuentro {marcador.strip()} en {CATS[cat][0]}")
    nombre = f"{CATS[cat][4]} · {nombre_fecha(fecha)}"
    if cat == "cartuchos":  # MUNICIONES_MANUALES va en dos líneas por entrada
        entrada = (f"    {{ id: '{mid}', nombre: '{nombre}', autoridad: 'OTCA',\n"
                   f"      fecha: '{fecha}', url: 'inventarios/{pdf_nombre(fecha)}', "
                   f"fileName: '{pdf_nombre(fecha)}', primary: false }},\n")
    else:
        entrada = (f"  {{\n    id: '{mid}',\n    nombre: '{nombre}',\n"
                   f"    autoridad: 'OTCA',\n    fecha: '{fecha}',\n    url: 'inventarios/{pdf_nombre(fecha)}',\n"
                   f"    fileName: '{pdf_nombre(fecha)}',\n    primary: false,\n  }},\n")
    # Al FINAL de la lista: el aplicador DCAM le quita `primary` a la PRIMERA entrada
    # de MUNICIONES_MANUALES; si la primera fuera la OTCA, quedarían dos principales.
    # Las vistas ordenan los inventarios por fecha, así que el orden aquí no importa.
    i = content.index(marcador) + len(marcador)
    cierre = re.compile(r"^[ \t]*\];", re.MULTILINE).search(content, i)
    return content[:cierre.start()] + entrada + content[cierre.start():], True


# Un registro literal `{ manualId: '…', … date: 'AAAA-MM-DD' … }` o una llamada de ayuda
# (`_h(…)`, `_mh18(…)`): para ordenar por fecha solo se miran los literales con `date`.
_FECHA_REG = re.compile(r"date:\s*'(\d{4}-\d{2}-\d{2})'")


def _partir_registros(cuerpo):
    """Parte el interior de `[ … ]` en registros de primer nivel (respeta {} y ())."""
    regs, prof, ini = [], 0, 0
    for i, ch in enumerate(cuerpo):
        if ch in "{(":
            prof += 1
        elif ch in "})":
            prof -= 1
        elif ch == "," and prof == 0:
            regs.append(cuerpo[ini:i]); ini = i + 1
    if cuerpo[ini:].strip():
        regs.append(cuerpo[ini:])
    return regs


def insertar_registro(content, marcador, fid, mid, precio, qty, fecha):
    ini, fin = span_bloque(content, marcador)
    rec = f"{{ manualId: '{mid}', price: '{fmt_price(precio)}', date: '{fecha}', qty: {qty} }}"
    pat = re.compile(r"^(\s+" + str(fid) + r":\s*\[)(.*?)(\],?[ \t]*)$", re.MULTILINE)
    m = pat.search(content, ini, fin)
    if m:
        if f"'{mid}'" in m.group(2):
            return content, False
        regs = _partir_registros(m.group(2))
        # posición: antes del primer registro literal con fecha posterior
        pos = len(regs)
        for k, r in enumerate(regs):
            f = _FECHA_REG.search(r)
            if f and f.group(1) > fecha:
                pos = k
                break
        nuevos = [r.strip() for r in regs]
        nuevos.insert(pos, rec)
        return content[:m.start(2)] + ", ".join(nuevos) + content[m.end(2):], True
    # ficha sin historial: línea nueva antes del cierre del bloque
    cierre = re.compile(r"^(\s*)\};", re.MULTILINE).search(content, ini)
    sangria = "    " if marcador == "window.MUNICIONES_PRICE_HISTORY" else "  "
    linea = f"{sangria}{fid}: [{rec}],\n"
    return content[:cierre.start()] + linea + content[cierre.start():], True


def quitar_registros(content, marcador, mid):
    ini, fin = span_bloque(content, marcador)
    bloque = content[ini:fin]
    nuevo = re.sub(r",\s*\{ manualId: '" + mid + r"'[^}]*\}", "", bloque)
    nuevo = re.sub(r"\{ manualId: '" + mid + r"'[^}]*\},\s*", "", nuevo)
    nuevo = re.sub(r"^\s+\d+:\s*\[\{ manualId: '" + mid + r"'[^}]*\}\],?\n", "", nuevo, flags=re.MULTILINE)
    return content[:ini] + nuevo + content[fin:]


def _recalcular_precio_principal(data_dir, dry_run):
    """Regla del precio principal (precio-principal.py): DCAM > OTCA > último."""
    import importlib.util
    spec = importlib.util.spec_from_file_location("precio_principal", Path(__file__).parent / "precio-principal.py")
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    m.recalcular(str(data_dir), dry_run)


def main():
    ap = argparse.ArgumentParser(description="Aplicador OTCA")
    ap.add_argument("--mapeo", required=True)
    ap.add_argument("--fecha", required=True)
    ap.add_argument("--data-dir", required=True)
    ap.add_argument("--pdf")
    ap.add_argument("--public", default="public/")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--rehacer", action="store_true")
    a = ap.parse_args()
    mapeo = json.load(open(a.mapeo))
    if mapeo.get("fecha") and mapeo["fecha"] != a.fecha:
        raise SystemExit(f"el mapeo es del {mapeo['fecha']}, no del {a.fecha}")
    total = 0
    for cat, (archivo, hist, _, _, _) in CATS.items():
        p = Path(a.data_dir) / archivo
        content = p.read_text(encoding="utf-8")
        mid = manual_id(cat, a.fecha)
        if a.rehacer:
            content = quitar_registros(content, hist, mid)
        content, nuevo_manual = registrar_manual(content, cat, a.fecha)
        n = 0
        ex = mapeo[cat]["existencias"]
        for fid, precio in mapeo[cat]["precios"].items():
            content, ok = insertar_registro(content, hist, int(fid), mid, precio, ex[fid], a.fecha)
            n += ok
        total += n
        eprint(f"── {cat}: manual {mid} {'registrado' if nuevo_manual else 'ya estaba'}; "
               f"{n} registros nuevos; {len(mapeo[cat]['sinPrecio'])} agotados en OTCA; "
               f"{len(mapeo[cat]['sinFicha'])} sin ficha")
        if mapeo[cat]["sinFicha"]:
            eprint(f"   ⚠ {len(mapeo[cat]['sinFicha'])} renglones sin ficha NO se aplicaron")
        if not a.dry_run:
            p.write_text(content, encoding="utf-8")
    if a.pdf and not a.dry_run:
        dest = Path(a.public) / "inventarios" / pdf_nombre(a.fecha)
        shutil.copyfile(a.pdf, dest)
        eprint(f"PDF → {dest}")
    _recalcular_precio_principal(a.data_dir, a.dry_run)
    eprint(f"═══ OTCA {a.fecha}: {total} registros {'(simulado)' if a.dry_run else ''}")


if __name__ == "__main__":
    main()
