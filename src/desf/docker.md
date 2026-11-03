<!-- Desfășurările fișei `docker` (9 puncte). Format și reguli: lib.mjs (checkDesf), .scratch/desfasurari/spec.md. Faptele: research/_desf_facts_docker.md (secțiunea 35). Fără C++: containerele sunt procese Linux, nu există un echivalent real în C++11/17. Exemplele sunt în blocuri `text` (comenzi și Dockerfile; rulate de mână pe Docker 29.9.1, unde scrie în fapte). -->

### harta
Problema: Aplicația merge pe laptop și pică pe server: altă versiune de Python, alte biblioteci, altă configurație. O imagine umflată se descarcă greu, un container oprit brutal pierde request-uri, iar un secret uitat într-un layer ajunge la oricine are imaginea. Modulul răspunde la patru întrebări: ce e o imagine și ce e un container, cum o construiești mică și sigură, cum rulează și se oprește aplicația în container și cum o pui pe mai multe servere.
Grupuri:
- 1: imagine și container (layere, izolare)
- 2–4: imaginea bine construită (cache, multi-stage, ce nu pui în ea)
- 5–6: containerul în viață (semnale, sănătate, date)
- 7: mai multe containere împreună (Compose)
- 8–9: pe servere și alegerea imaginii de bază (orchestratoare, slim sau alpine)

### 1
Greu: da
Problema: Pornești al doilea container din aceeași imagine și fișierul scris de primul lipsește. Altă dată ștergi un container, iar baza de date din el dispare.
Ideea: Imaginea e un șablon read-only, făcut din layere: fiecare instrucțiune care schimbă fișiere (`RUN`, `COPY`, `ADD`) adaugă un layer, iar `ENV` și `CMD` adaugă doar metadate. Containerul e imaginea plus un layer subțire de scriere și un proces izolat. Izolarea vine de la namespaces, limitele de resurse de la cgroups. Layerul de scriere dispare odată cu containerul. Din aceeași imagine pornesc oricâte containere.
Exemplu:
```text
docker run --name c1 alpine \
  sh -c 'echo hi > /tmp/x'
docker diff c1  # → A /tmp/x
docker rm c1
docker run --rm alpine ls /tmp/x
# → No such file or directory
```
Legătură: DK-01. E relația dintre o clasă și instanțele ei. Datele care trebuie păstrate stau în volume (punctul 6) sau în servicii externe, nu în container.

### 2
Greu: da
Problema: Schimbi o linie de cod, iar build-ul durează patru minute: `pip install` rulează iar de la zero, deși dependențele nu s-au mișcat.
Ideea: Docker refolosește un layer din cache cât timp instrucțiunea și fișierele ei de intrare sunt neschimbate. La prima instrucțiune schimbată, ea și toate cele de după se refac, chiar dacă rezultatul ar ieși identic. De aceea pui ce se schimbă rar înaintea a ce se schimbă des. Copiezi întâi doar `requirements.txt` și instalezi, apoi `COPY . .`, fiindcă dependențele se schimbă rar, iar codul la fiecare commit.
Exemplu:
```text
FROM python:3.13-slim
COPY requirements.txt .
RUN pip install -r requirements.txt
# codul vine ultimul: se schimbă des
COPY . .
```
Legătură: DK-02. Același tipar ca la cache-ul din GitLab CI (OBS-06): cheia neschimbată înseamnă refolosire.

### 3
Problema: Imaginea aplicației e cu sute de megabytes mai mare decât trebuie, fiindcă ține compilatorul și uneltele de build, necesare doar la construire. Se descarcă greu și are suprafață de atac mare.
Ideea: Un Dockerfile cu mai multe `FROM` are mai multe etape. Prima instalează dependențele cu unelte de build, iar ultima pornește de la o imagine mică. `COPY --from=build` aduce în ea doar rezultatul; restul nu intră în imaginea finală.
Exemplu:
```text
FROM python:3.13-slim AS build
RUN pip install --prefix=/install \
  -r requirements.txt
FROM python:3.13-slim
COPY --from=build \
  /install /usr/local
```
Legătură: DK-03. Același gând ca la imaginea mică din punctul 9: în producție ajunge doar ce rulează aplicația, nu ce a construit-o.

### 4
Greu: da
Problema: `COPY . .` urcă în imagine și `.git`, și `.env` cu parola bazei. Procesul rulează ca root, deci o vulnerabilitate în aplicație dă atacatorului root în container. Iar parola pusă cu `ENV` sau `ARG` se citește din imagine.
Ideea: `.dockerignore` scoate fișiere din contextul de build, deci `COPY . .` nu le mai vede. `USER app`, după un `useradd`, schimbă utilizatorul pentru pașii următori și pentru procesul final. Valoarea unui `ENV` rămâne în configurația imaginii, iar o valoare de `ARG` folosită într-un `RUN` apare în `docker history`. La build dai secretele cu `RUN --mount=type=secret`. La rulare le dai din afara imaginii.
Exemplu:
```text
# .dockerignore
.git
.env
# ARG TOKEN + RUN cu $TOKEN
docker build --build-arg \
  TOKEN=abc123 -t img .
docker history --no-trunc img
# → RUN |1 TOKEN=abc123 …
```
Legătură: DK-05 și DK-06. În Swarm, secretele se dau serviciului cu `docker secret` și se montează în `/run/secrets`, în afara imaginii.

### 5
Greu: da
Problema: La deploy, `docker stop` așteaptă 10 secunde și apoi omoară containerul cu SIGKILL. Request-urile în curs se pierd, iar logurile de închidere nu apar.
Ideea: Forma shell (`CMD python app.py`) pornește `/bin/sh -c`, iar `sh` devine PID 1 și nu trece semnalul mai departe. Forma exec (`CMD ["python", "app.py"]`) pornește direct programul ca PID 1. `docker stop` trimite SIGTERM și, după 10 secunde, SIGKILL. PID 1 nu primește acțiunile implicite ale semnalelor, deci fără un handler SIGTERM nu face nimic. Instalezi un handler (gunicorn și uvicorn au) sau pornești containerul cu `--init`.
Exemplu:
```text
CMD python -u app.py
# docker stop: ~10 s, apoi 137
CMD ["python", "-u", "app.py"]
# docker stop: imediat, exit 0
```
Legătură: DK-04. Exit code 137 înseamnă 128 + 9, adică SIGKILL (LX-07). Un worker Celery oprit cu SIGTERM termină întâi task-urile în curs.

### 6
Greu: da
Problema: Containerul de API e `running`, dar rămas într-o buclă nu mai răspunde, iar nimeni nu observă. Altă dată, o bază de date pornită fără volum își pierde datele la prima recreare.
Ideea: `running` înseamnă doar că procesul există. `HEALTHCHECK` rulează periodic o comandă (exit 0 = sănătos), la 30 s, cu 3 eșecuri implicit, iar starea trece prin `starting`, `healthy`, `unhealthy`. Docker doar marchează `unhealthy`; nu repornește containerul. Swarm îl poate reprograma. În Kubernetes, liveness repornește containerul, iar readiness scoate podul din Service. Un volum ține datele în afara layerului de scriere, deci supraviețuiește lui `docker rm`.
Exemplu:
```text
docker run -d --health-cmd false \
  --health-interval 1s alpine \
  sleep 60
# după câteva secunde:
docker ps --format '{{.Status}}'
# → Up 6 seconds (unhealthy)
```
Legătură: DK-08. Healthcheck-ul este și condiția din `depends_on` de la punctul 7.

### 7
Greu: da
Problema: API-ul pornește în Compose și pică cu „connection refused” la `localhost:5432`. Corectezi la `postgres:5432`, dar pică tot o dată, fiindcă baza încă își pregătește datele.
Ideea: Compose creează o rețea pentru proiect și înregistrează fiecare serviciu în DNS-ul ei sub numele lui. În container, `localhost` e containerul însuși. Între servicii folosești portul containerului, iar `HOST:CONTAINER` din `ports` contează doar din afara rețelei. `depends_on` simplu ordonează doar pornirea. Cu `condition: service_healthy` și un `healthcheck`, Compose așteaptă ca dependența să fie sănătoasă. Aplicația reîncearcă totuși conexiunea la pornire.
Exemplu:
```text
api:
  depends_on:
    db:
      condition: service_healthy
db:
  healthcheck:
    test: pg_isready
```
Legătură: DK-08. Ca în rețelele overlay din Swarm: serviciile se găsesc după nume.

### 8
Greu: da
Problema: Ai trei servicii pe cinci servere și vrei replici, actualizare pe rând și repornire automată dacă pică unul. Un script de deploy prin SSH nu face asta singur.
Ideea: Un orchestrator ține starea dorită (de pildă 3 replici) și o readuce singur dacă se strică. Swarm e integrat în Docker Engine: `docker swarm init`, apoi servicii cu replici, rolling update și rollback. Kubernetes e standardul industriei: mai mult de învățat, ecosistem bogat. Pe AWS, ECS e orchestratorul AWS (taskuri pe EC2 sau Fargate), iar EKS e Kubernetes cu control plane administrat de AWS.
Exemplu:
```text
docker service create \
  --name api --replicas 3 \
  alpine sleep 600
# omori un container al serviciului:
docker rm -f $(docker ps -q -n 1)
docker service ls  # → api … 3/3
```
Legătură: DK-07. Swarm îl știi din practică (ai refăcut clusterul cu `--force-new-cluster` și ai reparat rețeaua overlay a lui Redis). La interviu pornești de la ce ai folosit.

### 9
Problema: Treci de la `python:3.13` la `python:3.13-alpine` ca să câștigi megabytes. Apoi `pip install` nu găsește un wheel și compilează din sursă sau pică.
Ideea: Alpine folosește musl, iar `slim` (Debian) folosește glibc. Wheels obișnuite sunt `manylinux`, făcute pentru glibc; pe Alpine pip cere wheels `musllinux`. Multe pachete populare au așa ceva, dar nu toate. `slim` e mai mare, dar merge cu wheels-urile obișnuite, deci e alegerea implicită.
Exemplu:
```text
pip install --dry-run \
  --only-binary=:all: torch
# alpine → No matching distribution
# slim → Would install … torch
```
Legătură: DK-02 și DK-03. Un build lent din cauza compilării anulează câștigul de spațiu; multi-stage ajută la ambele.
