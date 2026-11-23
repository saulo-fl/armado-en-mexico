// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// GENERADO por scripts/formatos-issue.mjs desde .github/ISSUE_TEMPLATE/*.yml.
// NO lo edites a mano: cambia el .yml y corre `npm run formatos`.

export const FORMATOS = {
  "correccion": {
    "id": "correccion",
    "archivo": "correccion.yml",
    "name": "Corregir información de la enciclopedia",
    "description": "Señala un dato factual y aporta fuentes para revisarlo.",
    "title": "[Corrección]: ",
    "labels": [
      "documentation"
    ],
    "body": [
      {
        "type": "markdown",
        "attributes": {
          "value": "Este issue será público. No incluyas datos personales ni denuncias sobre reseñas. El equipo revisará las fuentes antes de modificar la web.\n"
        }
      },
      {
        "type": "input",
        "id": "pagina",
        "attributes": {
          "label": "Página exacta",
          "description": "URL o ruta donde aparece el dato.",
          "placeholder": "https://armado.mx/pistolas/ejemplo"
        },
        "validations": {
          "required": true
        }
      },
      {
        "type": "dropdown",
        "id": "tipo",
        "attributes": {
          "label": "Tipo de contenido",
          "options": [
            "Arma",
            "Accesorio",
            "Munición",
            "Calibre",
            "Legalidad",
            "Preguntas frecuentes",
            "Otro"
          ]
        },
        "validations": {
          "required": true
        }
      },
      {
        "type": "input",
        "id": "nombre",
        "attributes": {
          "label": "Ficha o sección",
          "placeholder": "Nombre del producto o apartado"
        },
        "validations": {
          "required": true
        }
      },
      {
        "type": "textarea",
        "id": "dato_actual",
        "attributes": {
          "label": "Dato actual",
          "description": "Copia o describe con precisión lo que parece incorrecto."
        },
        "validations": {
          "required": true
        }
      },
      {
        "type": "textarea",
        "id": "correccion",
        "attributes": {
          "label": "Corrección propuesta",
          "description": "Indica cuál debería ser el dato y por qué."
        },
        "validations": {
          "required": true
        }
      },
      {
        "type": "textarea",
        "id": "fuentes",
        "attributes": {
          "label": "Fuentes",
          "description": "Enlaza DOF, Cámara de Diputados, DEFENSA, inventarios DCAM/OTCA, fabricante, manual oficial o fuentes editoriales identificables.",
          "placeholder": "Una fuente por línea, con título y URL."
        },
        "validations": {
          "required": true
        }
      },
      {
        "type": "dropdown",
        "id": "relacion",
        "attributes": {
          "label": "Relación comercial o institucional",
          "description": "Declara cualquier relación con la información corregida.",
          "options": [
            "Ninguna",
            "Fabricante o marca",
            "Distribuidor o tienda",
            "Club o campo de tiro",
            "Autor o representante de la fuente",
            "Otra relación"
          ]
        },
        "validations": {
          "required": true
        }
      },
      {
        "type": "dropdown",
        "id": "pull_request",
        "attributes": {
          "label": "¿Te interesaría aportar la solución mediante un pull request?",
          "description": "Es opcional y solo procede después de que el equipo confirme el cambio.",
          "options": [
            "Sí",
            "Tal vez, necesito orientación",
            "No"
          ]
        },
        "validations": {
          "required": true
        }
      },
      {
        "type": "checkboxes",
        "id": "derechos",
        "attributes": {
          "label": "Derechos y licencia",
          "options": [
            {
              "label": "Confirmo que puedo aportar este contenido bajo la licencia correspondiente y que no incluyo material de terceros sin permiso compatible.",
              "required": true
            }
          ]
        }
      }
    ]
  },
  "fallo": {
    "id": "fallo",
    "archivo": "fallo.yml",
    "name": "Reportar un fallo del sitio",
    "description": "Algo no carga, se ve mal o no hace lo que debería.",
    "title": "[Fallo]: ",
    "labels": [
      "bug"
    ],
    "body": [
      {
        "type": "markdown",
        "attributes": {
          "value": "Este issue será público. No incluyas datos personales. Para denunciar una reseña usa https://armado.mx/soporte y, si el problema es un dato incorrecto, el formulario «Corregir información de la enciclopedia».\n"
        }
      },
      {
        "type": "input",
        "id": "pagina",
        "attributes": {
          "label": "Página donde ocurre",
          "description": "URL o ruta donde viste el fallo.",
          "placeholder": "https://armado.mx/pistolas/ejemplo"
        },
        "validations": {
          "required": true
        }
      },
      {
        "type": "textarea",
        "id": "que_paso",
        "attributes": {
          "label": "¿Qué pasó?",
          "description": "Describe lo que viste, con el texto exacto de cualquier mensaje de error."
        },
        "validations": {
          "required": true
        }
      },
      {
        "type": "textarea",
        "id": "que_esperabas",
        "attributes": {
          "label": "¿Qué esperabas que pasara?"
        },
        "validations": {
          "required": true
        }
      },
      {
        "type": "textarea",
        "id": "pasos",
        "attributes": {
          "label": "Pasos para reproducirlo",
          "description": "Lo que hiciste, en orden, hasta que apareció el fallo.",
          "placeholder": "1. Entré a…\n2. Toqué…\n3. Apareció…\n"
        },
        "validations": {
          "required": true
        }
      },
      {
        "type": "dropdown",
        "id": "frecuencia",
        "attributes": {
          "label": "¿Con qué frecuencia ocurre?",
          "options": [
            "Siempre",
            "A veces",
            "Solo una vez"
          ]
        },
        "validations": {
          "required": true
        }
      },
      {
        "type": "input",
        "id": "dispositivo",
        "attributes": {
          "label": "Dispositivo y navegador",
          "description": "Opcional. Desde armado.mx puedes adjuntarlo automáticamente con la casilla de datos del dispositivo.",
          "placeholder": "iPhone 13 · Safari"
        },
        "validations": {
          "required": false
        }
      },
      {
        "type": "input",
        "id": "captura",
        "attributes": {
          "label": "Captura o video",
          "description": "Opcional. Enlace a una imagen o video donde se vea el fallo.",
          "placeholder": "https://…"
        },
        "validations": {
          "required": false
        }
      },
      {
        "type": "checkboxes",
        "id": "privacidad",
        "attributes": {
          "label": "Privacidad",
          "options": [
            {
              "label": "Confirmo que el reporte no incluye datos personales, míos ni de terceros.",
              "required": true
            }
          ]
        }
      }
    ]
  }
};
