# dcam-puente — único componente con la clave del router llama.cpp; ver puente.py.
# El grupo 1000 coincide a propósito con el gid de saulo en APOLO: así el proceso
# (no root) puede LEER la clave montada (modo 640, dueño saulo) sin que la imagen
# necesite root ni el host necesite abrir el archivo a todo el mundo (644).
FROM python:3.12-alpine@sha256:1b668429b3511ab407d8e00648891631b0b1a4d7e15e3ca70f38ab5b91ad4ab4
COPY puente.py /app/puente.py
RUN addgroup -g 1000 clave && adduser -D -u 10001 -G clave puente
ENV PYTHONDONTWRITEBYTECODE=1
USER puente
CMD ["python", "/app/puente.py"]
