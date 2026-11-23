# Cómo contribuir

## Formato preferencial para reportar

Hay dos formularios y los dos se llenan igual, en armado.mx o en GitHub.

**Sin cuenta de GitHub (vía preferida):** pulsa **Repórtalo** al final de cada ficha, de Legalidad o de
las preguntas frecuentes, o **Reportar un fallo** en [armado.mx/soporte](https://armado.mx/soporte). Son los
mismos campos de abajo y, al enviarlo, se publica solo como issue desde la cuenta del proyecto con tu
**firma** (nombre o apodo) y un **folio** (`AMX-…`). Si das tu usuario de GitHub, el issue te menciona.
El correo es opcional y no se publica; los datos del dispositivo, si marcas la casilla, solo los ve el
equipo.

**Con cuenta de GitHub:** abre el formulario directamente en *Issues → New issue*.

Elige el formulario que corresponda:

| Qué quieres reportar | Formulario | Título |
|---|---|---|
| Un dato incorrecto de la enciclopedia (ficha, calibre, Legalidad, FAQ) | **Corregir información de la enciclopedia** (`correccion.yml`) | `[Corrección]: <ficha o sección>` |
| Algo del sitio que no carga, se ve mal o no hace lo que debería | **Reportar un fallo del sitio** (`fallo.yml`) | `[Fallo]: <qué falla, en pocas palabras>` |

Las denuncias de reseñas no van aquí: se hacen en privado desde [armado.mx/soporte](https://armado.mx/soporte).
Ningún reporte debe incluir datos personales, tuyos ni de terceros: el issue es público.

### Correcciones, campo por campo

1. **Página exacta:** la URL donde aparece el dato, no la portada ni «la ficha de la Glock».
2. **Tipo de contenido** y **ficha o sección:** el nombre tal como aparece en el sitio.
3. **Dato actual:** cópialo tal cual lo muestra la página.
4. **Corrección propuesta:** el dato correcto y por qué. Una corrección por issue.
5. **Fuentes:** una por línea, con título y URL, siguiendo la jerarquía de fuentes de abajo.
6. **Relación comercial o institucional:** decláralo aunque sea «Ninguna».

Un buen ejemplo es el [#485](https://github.com/saulo-fl/armado-en-mexico/issues/485):

> - **Página exacta:** https://armado.mx/escopetas/derya-mr-s1
> - **Dato actual:** En capacidad dice que es 4+1 y es una escopeta superpuesta. Su capacidad es de 2 cartuchos.
> - **Corrección propuesta:** Capacidad 2 o 1+1.
> - **Fuentes:** https://deryaarms.com/urun/meriva-sport-mr-s1

Uno que no se puede revisar: «El precio de la pistola está mal», sin página, sin el dato que aparece y sin fuente.

### Fallos, campo por campo

1. **Página donde ocurre:** la URL exacta.
2. **¿Qué pasó?:** lo que viste, con el texto exacto de cualquier mensaje de error.
3. **¿Qué esperabas que pasara?**
4. **Pasos para reproducirlo:** numerados y en orden, desde que entraste a la página.
5. **Frecuencia:** siempre, a veces o solo una vez.
6. **Dispositivo y navegador** (opcional, pero ayuda mucho): por ejemplo «iPhone 13 · Safari» o «Windows · Chrome».
7. **Captura o video** (opcional): un enlace donde se vea el fallo.

### Después de enviarlo

1. Revisa personalmente todos los campos. En armado.mx recibes el folio y el enlace al issue; en GitHub, pulsa **Submit new issue**.
2. Espera la revisión editorial. Abrir el issue no garantiza que el cambio sea aceptado.
3. Crea un pull request solo si el cambio fue confirmado o si el issue lo solicita. El PR es opcional.

## Reglas del proyecto

Sigue `AGENTS.md`, `docs/DESIGN.md`, las pruebas y el build del repositorio. Describe qué cambió y cómo verificaste el resultado.

Para evaluar correcciones usamos esta jerarquía de fuentes:

1. Fuente oficial legal.
2. Inventarios DCAM/OTCA.
3. Fabricante o manual oficial.
4. Fuente editorial contrastable.

Publicaciones sociales, capturas, comentarios y tiendas pueden orientar la investigación, pero no bastan por sí solas.

## Licencias y derechos

El código se distribuye bajo **AGPL-3.0-or-later**. Los textos y la estructura del catálogo se distribuyen bajo **CC BY-SA 4.0**.

No aportes fotografías, logotipos, manuales o documentos de terceros sin derechos compatibles. No se requiere CLA.
