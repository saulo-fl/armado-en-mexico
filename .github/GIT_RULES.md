# Reglas de git — Armado en México

## Regla máxima: SIEMPRE abrir PR, NUNCA push directo

**Nunca hacer push directo a ninguna rama.** Todo cambio debe pasar por un Pull Request para mantener control total sobre cada modificación y poder revertir pasos.

### Flujo de trabajo

1. **Crear rama de feature** desde `develop`
2. **Hacer cambios** en la rama de feature
3. **Abrir PR** hacia `develop`
4. **Revisar** el diff antes de solicitar merge
5. **Merge** solo con tu aprobación explícita

### Excepciones

- No aplica a ramas locales sin impacto en el repo remoto
- No aplica a commits temporales en la rama actual antes de abrir PR

### Razón

- Control total sobre cada cambio
- Capacidad de revertir pasos
- Revisión visual antes de integrar
- Historial limpio y auditable
