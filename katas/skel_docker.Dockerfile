# Referința de schelet pentru modulul docker: Dockerfile multi-stage, non-root.
# Verificat structural (nu rulează în sandbox, fără daemon): katas/test_skel_docker.py.

# === s-docker-multistage ===
FROM python:3.12-slim AS build
WORKDIR /app
# dependențele întâi, pentru cache:
# stratul se refolosește cât timp
# requirements.txt nu se schimbă
COPY requirements.txt .
RUN pip install --no-cache-dir \
    --prefix=/install -r requirements.txt

FROM python:3.12-slim AS runtime
RUN useradd --create-home app
COPY --from=build /install /usr/local
WORKDIR /app
COPY --chown=app:app . .
USER app
CMD ["uvicorn", "main:app", \
     "--host", "0.0.0.0"]
# === end ===
