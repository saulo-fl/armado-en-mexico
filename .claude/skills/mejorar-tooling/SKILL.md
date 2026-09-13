---
name: mejorar-tooling
description: Bucle de automejora del tooling de "Armado en México". Úsalo al TERMINAR una tarea relevante (una conciliación de inventario, un cambio de UI, un fix de despliegue) para capturar aprendizajes y edge-cases en las skills/agentes correspondientes, de modo que la próxima ejecución sea mejor. También cuando el usuario pida "revisar/actualizar flujos, skills o agentes".
---

# Mejorar el tooling (automejora)

Las skills y agentes en `.claude/` son documentos vivos. Cada vez que resuelvas algo
no trivial o descubras un edge-case, DÉJALO ESCRITO para no reaprenderlo.

## Cuándo
- Al cerrar una conciliación de inventario, un cambio estético grande, o un incidente
  de despliegue.
- Cuando el usuario pida revisar/actualizar/crear flujos, skills o agentes.
- Cuando notes que repetiste un paso manual que debería estar en un script.

## Cómo (loop corto)
1. Identifica qué skill/agente cubre lo que acabas de hacer.
2. Añade a su sección **"Bitácora de aprendizajes"** una línea fechada con el
   edge-case, la decisión o el gotcha (concreto y accionable).
3. Si repetiste una secuencia mecánica de shell/Node/Python, muévela a un script en
   `.claude/skills/<skill>/scripts/` y referéncialo desde el SKILL.md.
4. Si el `description` de una skill no la disparó cuando debía, mejóralo (más
   sinónimos/triggers) para que se autoinvoque.
5. Verifica que los scripts nuevos corran (`python3 ...` / `node ...`) antes de commitear.
6. Publica con el skill `publicar` (los archivos de `.claude/` viajan en el repo).

## Inventario de tooling (mantén esta lista al día)
A 12-sep-2026, según el disco (`ls .claude/skills .claude/agents`):
- skills: `conciliar-inventario`, `verificar-app`, `fidelidad-diseno`, `migrar-a-css`,
  `fotos-producto`, `sincronizar-d1`, `publicar`, `mejorar-tooling`.
- agentes: `conciliador-inventario`, `revisor-armado`, `disenador-oficial`,
  `auditor-a11y-perf`, `auditor-estructura`, `preparador-imagenes`, `deploy-develop`,
  `deploy-main`.
- scripts: `conciliar-inventario/scripts/{parse_pdf.py, auditar.js}` ·
  `fidelidad-diseno/scripts/contraste.mjs` ·
  `fotos-producto/scripts/{fotos.py, cajas.py, traer.py}` ·
  `sincronizar-d1/scripts/resembrar.js`.
- De terceros, sin versionar y fuera de este inventario: Impeccable
  (`.claude/skills/impeccable/`, agentes `impeccable-*`), que se reinstala con
  `npx impeccable install`.

## Principios
- Un skill = un flujo repetible con triggers claros; un agente = ejecutor delegable.
- Prefiere scripts deterministas a instrucciones prosaicas cuando el paso es mecánico.
- Alta fidelidad: cualquier cambio de UI pasa por `fidelidad-diseno` + `verificar-app`.
