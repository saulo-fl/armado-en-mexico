#!/usr/bin/env python3
# Armado en México — Copyright (C) 2026 Saulo Flores León
# SPDX-License-Identifier: AGPL-3.0-or-later
# Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
# (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.
"""Compuertas deterministas de cierre de una conciliación DCAM.

El pipeline NO se fía de lo que diga un agente: antes de marcar el PR listo,
comprueba con datos que el inventario quedó conciliado.

  1. Mapeo limpio: re-mapea los PDFs del día contra la referencia + ligas de la
     rama. No debe quedar ningún renglón sin ficha (salvo ligas null = excluidos
     a propósito) y todos los factores deben estar en [0.90, 1.10].
  2. Sin saltos de precio sin explicar: cada ficha con registro de hoy se
     compara con su registro DCAM anterior. Un salto > 3 % pasa solo si
     (a) es el aumento general del catálogo entre esas dos fechas (la mediana de
     las fichas que tienen registro en ambas, ±1 %) — producto que estuvo
     agotado unos días —, o (b) viene justificado en solucion.json
     ("saltos": {"<cat>:<id>": "motivo"}).

auditar.js y npm test los corre el pipeline aparte.

uso: verificar-cierre.py --workdir /tmp/dcam-pipeline-<FECHA> --fecha <ISO>
                         [--solucion <workdir>/solucion.json]
Sale 0 si todo pasa; 1 con la lista de hallazgos en stderr y JSON en stdout.
"""
import argparse
import json
import statistics
import subprocess
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
UMBRAL = 0.03
TOL_GENERAL = 0.015

CATS = {
    # cat: (prefijo de manualId, expresión JS del historial)
    "armas": ("man_dcam_", "win.AMX_PRICE_HISTORY_SEED"),
    "cartuchos": ("man_mun_dcam_", "win.MUNICIONES_PRICE_HISTORY"),
    "accesorios": ("man_acc_", "win.ACCESORIOS_PRICE_HISTORY"),
}


def historiales(data_dir):
    js = r"""
const fs = require('fs'); const win = {}; global.window = win;
for (const f of ['data-precios.js', 'data.js', 'data-extra.js', 'data-accesorios.js', 'data-municiones.js'])
  { try { eval(fs.readFileSync(process.argv[1] + '/' + f, 'utf8')); } catch (e) {} }
const pick = (H) => Object.fromEntries(Object.entries(H || {}).map(([k, v]) =>
  [k, (v || []).filter(Boolean).map(r => ({ m: r.manualId || '', d: r.date || '',
     p: parseFloat(String(r.price || '').replace(/[^\d.]/g, '')) || 0 }))]));
console.log(JSON.stringify({ armas: pick(win.AMX_PRICE_HISTORY_SEED),
  cartuchos: pick(win.MUNICIONES_PRICE_HISTORY), accesorios: pick(win.ACCESORIOS_PRICE_HISTORY) }));
"""
    r = subprocess.run(["node", "-e", js, str(data_dir)], capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


def remapear(workdir, cat, fecha):
    pdf = Path(workdir) / f"{cat}.json"
    if not pdf.exists():
        return None
    cmd = [sys.executable, str(SCRIPTS / "mapear-existencias.py"), str(pdf),
           "--ref", str(SCRIPTS / f"referencia-{cat}.json"),
           "--ligas", str(SCRIPTS / f"ligas-{cat}.json")]
    if cat == "armas":
        cmd += ["--catalogo", "src/data", "--antes-de", fecha]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"mapear-existencias {cat} falló: {r.stderr[-400:]}")
    return json.loads(r.stdout)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workdir", required=True)
    ap.add_argument("--fecha", required=True, help="ISO AAAA-MM-DD")
    ap.add_argument("--solucion")
    a = ap.parse_args()

    justif = {}
    if a.solucion and Path(a.solucion).exists():
        try:
            justif = json.load(open(a.solucion)).get("saltos", {}) or {}
        except Exception:
            pass

    hallazgos, informe = [], {"mapeo": {}, "saltos": []}

    # 1) mapeo limpio
    for cat in CATS:
        m = remapear(a.workdir, cat, a.fecha)
        if m is None:
            continue
        sf = [r["name"] for r in m.get("sinFicha", [])]
        fuera = [f for f in m.get("factores", []) if not 0.90 <= f <= 1.10]
        informe["mapeo"][cat] = {"sinFicha": sf, "factores": m.get("factores"),
                                 "revisarPrecio": len(m.get("revisarPrecio", []))}
        for n in sf:
            hallazgos.append(f"{cat}: renglón sin ficha ni liga: {n}")
        for f in fuera:
            hallazgos.append(f"{cat}: factor fuera de rango {f}")

    # 2) saltos de precio
    H = historiales("src/data")
    for cat, (pref, _) in CATS.items():
        hoy_id = pref + a.fecha.replace("-", "_")
        regs = {fid: [r for r in v if r["m"].startswith(pref) and r["p"] > 0]
                for fid, v in H.get(cat, {}).items()}
        hoy = {fid: next((r for r in v if r["m"] == hoy_id), None) for fid, v in regs.items()}
        previo = {}
        for fid, v in regs.items():
            ant = [r for r in v if r["d"] < a.fecha]
            if hoy.get(fid) and ant:
                previo[fid] = ant[-1]
        # razón general hoy / fecha d, con las fichas que tienen registro en ambas
        por_fecha = {}
        for fid, v in regs.items():
            if not hoy.get(fid):
                continue
            for r in v:
                if r["d"] < a.fecha:
                    por_fecha.setdefault(r["d"], []).append(hoy[fid]["p"] / r["p"])
        # Aumento general hoy / fecha d: mediana de lo que se movieron las fichas
        # presentes en ambas fechas. La mediana aguanta aunque un tercio de las
        # fichas venga mal emparejado (02-oct: 9 de 53 cartuchos inflados); las
        # líneas de producto suben a ritmos algo distintos, de ahí la tolerancia.
        general = {d: statistics.median(x) for d, x in por_fecha.items() if len(x) >= 5}
        for fid, ant in previo.items():
            razon = hoy[fid]["p"] / ant["p"]
            if abs(razon - 1) <= UMBRAL:
                continue
            g = general.get(ant["d"])
            item = {"cat": cat, "id": fid, "antes": ant["p"], "fechaAntes": ant["d"],
                    "hoy": hoy[fid]["p"], "razon": round(razon, 4), "general": g and round(g, 4)}
            clave = f"{cat}:{fid}"
            if g and abs(razon - g) <= TOL_GENERAL:
                item["ok"] = "aumento general"
            elif clave in justif:
                item["ok"] = "justificado: " + str(justif[clave])
            else:
                item["ok"] = False
                hallazgos.append(f"{clave}: salto {ant['p']} ({ant['d']}) → {hoy[fid]['p']} "
                                 f"(x{razon:.4f}, general x{g:.4f})" if g else
                                 f"{clave}: salto {ant['p']} ({ant['d']}) → {hoy[fid]['p']} (x{razon:.4f})")
            informe["saltos"].append(item)

    informe["hallazgos"] = hallazgos
    print(json.dumps(informe, ensure_ascii=False, indent=1))
    for h in hallazgos:
        print("  ✗ " + h, file=sys.stderr)
    print(("✔ CIERRE VERIFICADO" if not hallazgos else f"✗ {len(hallazgos)} hallazgos"), file=sys.stderr)
    sys.exit(1 if hallazgos else 0)


if __name__ == "__main__":
    main()
