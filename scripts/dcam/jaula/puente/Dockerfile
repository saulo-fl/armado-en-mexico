# dcam-puente — único componente con el token OAuth de Claude; ver puente.py.
# La imagen NO sabe nada del host (ni gid, ni "saulo"): el grupo que de verdad
# puede leer el token montado (modo 640, dueño saulo en APOLO) se añade en
# tiempo de ejecución con `--group-add 1000` en el `docker run` (construir.sh),
# no horneado aquí.
FROM python:3.12-alpine@sha256:1b668429b3511ab407d8e00648891631b0b1a4d7e15e3ca70f38ab5b91ad4ab4
COPY puente.py /app/puente.py
RUN adduser -D -u 10001 puente
ENV PYTHONDONTWRITEBYTECODE=1
USER puente
CMD ["python", "/app/puente.py"]
