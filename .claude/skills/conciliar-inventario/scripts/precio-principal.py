#!/usr/bin/env python3
# Armado en México — Copyright (C) 2026 Saulo Flores León
# SPDX-License-Identifier: AGPL-3.0-or-later
# Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
# (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

"""Fija el PRECIO PRINCIPAL de cada ficha según la regla de Saulo (05-nov-2026):

  1. Hay existencias en DCAM (estén o no en OTCA)  → precio de la DCAM
  2. No hay en DCAM pero sí en OTCA                → precio de la OTCA
  3. No hay en ninguna                             → precio del último inventario

«Hay existencias» = la ficha viene, con piezas, en el ÚLTIMO inventario de esa
armería. El precio de cada armería es el de su registro en ese inventario.

Lo usan los dos aplicadores (DCAM y OTCA) al terminar; también corre solo:
  python3 precio-principal.py --data-dir src/data/ [--dry-run]
Toca: AMX_ARMAS_PRECIOS (armas) y el precio de cada `mun()` (municiones). Los
accesorios no guardan precio aparte: la vista lo calcula con la misma regla
(src/lib/cotejo.js, amxPrecioPrincipal).
"""
import argparse, json, re, subprocess, sys
from pathlib import Path

JS = r"""
const fs=require('fs'), path=require('path'), vm=require('vm'); const d=process.argv[1];
const w={}; w.window=w; const ctx=vm.createContext(w);
for (const f of ['data-precios.js','data.js','data-accesorios.js','data-municiones.js'])
  vm.runInContext(fs.readFileSync(path.join(d,f),'utf8'), ctx);
const out={armas:{}, cartuchos:{}};
const aut=(m)=>m.autoridad||(/(^|\b)OTCA\b/i.test(m.nombre||'')?'OTCA':'DCAM');
const ultimo=(mans,s)=>mans.filter(m=>aut(m)===s).sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha)))[0]||null;
const num=(p)=>Number(String(p).replace(/[^0-9.]/g,''));
function hist(h){return (h||[]).filter(r=>r&&r.date).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));}
// armas: existencias DCAM de AMX_ARMAS_EXISTENCIAS; OTCA del registro del último inventario OTCA
{ const mans=w.AMX_MANUALES_SEED||[], oD=ultimo(mans,'DCAM'), oO=ultimo(mans,'OTCA');
  for (const a of w.DB||[]) { const h=hist((w.AMX_PRICE_HISTORY_SEED||{})[a.id]); if(!h.length) continue;
    const rD=oD&&h.find(r=>r.manualId===oD.id), rO=oO&&h.find(r=>r.manualId===oO.id);
    const qD=(w.AMX_ARMAS_EXISTENCIAS||{})[a.id]||0, qO=rO&&rO.qty?rO.qty:0;
    out.armas[a.id]={actual:num(a.priceExact), dcam:rD?num(rD.price):null, qD, otca:rO?num(rO.price):null, qO, ultimo:num(h[h.length-1].price)}; } }
{ const mans=w.MUNICIONES_MANUALES||[], oD=ultimo(mans,'DCAM'), oO=ultimo(mans,'OTCA');
  for (const m of w.MUNICIONES||[]) { const h=hist((w.MUNICIONES_PRICE_HISTORY||{})[m.id]); if(!h.length) continue;
    const rD=oD&&h.find(r=>r.manualId===oD.id), rO=oO&&h.find(r=>r.manualId===oO.id);
    out.cartuchos[m.id]={actual:num(m.priceExact), dcam:rD?num(rD.price):null, qD:rD&&rD.qty?rD.qty:0, otca:rO?num(rO.price):null, qO:rO&&rO.qty?rO.qty:0, ultimo:num(h[h.length-1].price)}; } }
process.stdout.write(JSON.stringify(out));
"""


def regla(f):
    """Precio principal y de qué armería sale (dcam | otca | ultimo)."""
    if f["qD"] > 0 and f["dcam"] is not None:
        return f["dcam"], "dcam"
    if f["qO"] > 0 and f["otca"] is not None:
        return f["otca"], "otca"
    return f["ultimo"], "ultimo"


def leer(data_dir):
    r = subprocess.run(["node", "-e", JS, str(Path(data_dir).resolve())], capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"precio-principal: node falló: {r.stderr[-400:]}")
    return json.loads(r.stdout)


def recalcular(data_dir, dry_run=False, log=lambda *a: print(*a, file=sys.stderr)):
    datos = leer(data_dir)
    cambios = {"armas": [], "cartuchos": []}
    # armas → AMX_ARMAS_PRECIOS
    p = Path(data_dir) / "data-precios.js"
    t = p.read_text(encoding="utf-8")
    m = re.search(r"window\.AMX_ARMAS_PRECIOS\s*=\s*\{([^}]*)\};", t)
    mapa = {int(k): v for k, v in re.findall(r"(\d+):\s*([\d.]+)", m.group(1))}
    for fid, f in datos["armas"].items():
        precio, via = regla(f)
        if abs(precio - f["actual"]) > 0.004:
            cambios["armas"].append((int(fid), f["actual"], precio, via))
            mapa[int(fid)] = repr(round(precio, 2))
    if cambios["armas"]:
        nuevo = "window.AMX_ARMAS_PRECIOS = { " + ", ".join(f"{k}: {mapa[k]}" for k in sorted(mapa)) + " };"
        t = t[:m.start()] + nuevo + t[m.end():]
        if not dry_run:
            p.write_text(t, encoding="utf-8")
    # municiones → precio literal de mun(id, …)
    p = Path(data_dir) / "data-municiones.js"
    t = p.read_text(encoding="utf-8")
    for fid, f in datos["cartuchos"].items():
        precio, via = regla(f)
        if abs(precio - f["actual"]) > 0.004:
            pat = re.compile(r"(mun\(" + str(fid) + r",\s*(?:(?:\"[^\"]*\"|'[^']*'|[^,]*),\s*){8})([\d.]+)")
            t, n = pat.subn(lambda mm: mm.group(1) + f"{precio:.2f}", t, count=1)
            if n:
                cambios["cartuchos"].append((int(fid), f["actual"], precio, via))
            else:
                log(f"  ⚠ no encontré el precio de mun({fid}) para fijarlo")
    if cambios["cartuchos"] and not dry_run:
        p.write_text(t, encoding="utf-8")
    for cat, cs in cambios.items():
        log(f"  precio principal {cat}: {len(cs)} cambios")
        for fid, ant, nue, via in cs:
            log(f"    {fid}: {ant:,.2f} → {nue:,.2f} ({via})")
    return cambios


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--data-dir", required=True)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    recalcular(a.data_dir, a.dry_run)


if __name__ == "__main__":
    main()
