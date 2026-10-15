<!-- Docker și orchestrare. Variantele greșite: B, C, D = ordinea din sursă (A e cea corectă). -->

### dk-01
Pe scurt: Imaginea e un șablon read-only, făcut din layere; containerul e o instanță care rulează din imagine, cu un layer propriu de scriere.
Scop: Distincția explică de ce poți porni oricâte replici din aceeași imagine și de ce datele scrise în container dispar odată cu el.
Mecanism: `docker build` produce imaginea: layere read-only (sistemul de bază, dependențele, codul). `docker run` creează un container: adaugă peste imagine un layer subțire de scriere și pornește un proces izolat. Ce scrie procesul ajunge în acel layer, care dispare când ștergi containerul.
Pas cu pas:
```text
Dockerfile -> docker build -> imagine
imagine -> docker run -> container 1
imagine -> docker run -> container 2
container 1 scrie /tmp/x -> doar în el
docker rm -> /tmp/x dispare
```
Aplicare: Datele care trebuie păstrate (baza de date, upload-urile) le pui în volume (`-v pgdata:/var/lib/postgresql/data`) sau în servicii externe, ca S3. Containerele rămân de unică folosință.
Legătură: E relația dintre o clasă și instanțele ei: din aceeași clasă creezi oricâte obiecte, fiecare cu starea lui.
Limită: Analogia cu clasa e doar parțială: imaginea include tot sistemul de fișiere al aplicației (biblioteci, configurare), iar containerul e un proces izolat de kernel, nu o mașină virtuală.
La interviu: „Imaginea e șablonul read-only, construit din layere; containerul e o instanță care rulează din ea, cu un layer propriu de scriere. Din aceeași imagine pornesc oricâte containere, iar datele persistente le țin în volume.”
Verificare: Rulezi Postgres într-un container fără volum, adaugi date, faci `docker rm` și pornești alt container din aceeași imagine. Ce găsești?
Răspuns verificare: O bază goală: datele erau în layerul de scriere al containerului șters. Cu un volum montat pe `/var/lib/postgresql/data`, ar fi rămas.
Varianta greșită B: Nu sunt sinonime: imaginea e șablonul, containerul e instanța care rulează. Distincția există și în Docker, și în Kubernetes.
Varianta greșită C: Dockerfile-ul e rețeta: `docker build` produce din el imaginea, iar containerul pornește din imagine.
Varianta greșită D: E invers: imaginea stă pe disc, iar containerul e cel care rulează.

### dk-02
Pe scurt: Ca layerul cu dependențele instalate să rămână în cache: codul se schimbă la fiecare commit, dependențele rar, deci `pip install` nu se mai repetă la fiecare build.
Scop: Build-uri de câteva secunde în loc de minute, atât local, cât și în CI.
Mecanism: Docker refolosește un layer din cache cât timp instrucțiunea și fișierele ei de intrare sunt identice. La prima instrucțiune schimbată, invalidează cache-ul pentru ea și pentru toate cele de după. Dacă `COPY . .` vine înainte de `pip install`, orice modificare de cod reface și instalarea dependențelor.
Pas cu pas:
```text
1. COPY requirements.txt -> din cache
2. RUN pip install -> din cache
3. COPY . . -> refăcut (cod nou)
schimbi un .py -> rulează doar pasul 3
```
Aplicare:
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["gunicorn", "app.main:app"]
```
Legătură: E aceeași idee ca la `.pyc` (RT-06): refolosești rezultatul unei munci scumpe cât timp intrarea nu s-a schimbat.
Limită: Fără un `.dockerignore`, `COPY . .` include și `.git`, `node_modules` sau `__pycache__`, care schimbă contextul și invalidează inutil cache-ul. Cu BuildKit poți păstra și un cache pentru pip (`RUN --mount=type=cache,target=/root/.cache/pip`).
La interviu: „Copiez întâi `requirements.txt` și instalez dependențele, apoi codul: Docker invalidează cache-ul de la prima instrucțiune schimbată, iar codul se schimbă mult mai des decât dependențele.”
Verificare: Adaugi o dependență nouă în `requirements.txt`. Ce pași se refac?
Răspuns verificare: `COPY requirements.txt`, `pip install` și tot ce urmează. E normal: dependențele chiar s-au schimbat.
Varianta greșită B: `pip install` funcționează la fel și după `COPY . .`. Problema e doar că pierzi cache-ul la fiecare modificare de cod.
Varianta greșită C: Codul ajunge oricum în imagine, prin `COPY . .`. Ordinea afectează doar cache-ul.
Varianta greșită D: Docker execută instrucțiunile exact în ordinea scrisă și nu le reordonează.

### dk-03
Pe scurt: Un multi-stage build produce o imagine finală mică: uneltele de build rămân în primul stage, iar în imaginea finală copiezi doar rezultatul.
Scop: Imaginile mai mici se descarcă și pornesc mai repede, iar fără compilatoare și unelte inutile au mai puține vulnerabilități.
Mecanism: Primul stage (`FROM ... AS builder`) are tot ce trebuie la build: compilatoare, header-e, unelte. Acolo construiești wheels sau alte artefacte. Stage-ul final pornește de la o imagine curată și copiază doar ce trebuie la rulare, cu `COPY --from=builder`. Imaginea publicată e doar stage-ul final.
Pas cu pas:
```text
builder: python + gcc + header-e
  -> pip wheel -> /wheels
final: python-slim
  COPY --from=builder /wheels
  pip install /wheels/*
imaginea publicată: fără gcc
```
Aplicare:
```dockerfile
FROM python:3.12 AS builder
COPY requirements.txt .
RUN pip wheel -r requirements.txt -w /wheels

FROM python:3.12-slim
COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir /wheels/*
COPY . /app
```
Legătură: E ca build-ul unei aplicații React: folosești Node și toate dependențele la build, dar în producție servești doar fișierele statice rezultate, de exemplu cu Nginx.
Limită: Imaginea slim poate să nu aibă bibliotecile de sistem de care au nevoie wheel-urile la rulare, cum e `libpq` pentru psycopg. Le instalezi explicit în stage-ul final.
La interviu: „Cu un multi-stage build compilez dependențele într-un stage cu unelte de build și copiez în imaginea finală doar artefactele. Imaginea e mai mică, se distribuie mai repede și are o suprafață de atac mai mică.”
Verificare: Imaginea finală pornește de la `python:3.12-slim`, iar psycopg crapă la import cu o eroare despre `libpq`. De ce?
Răspuns verificare: Wheel-ul a fost construit în builder, unde `libpq` exista, dar biblioteca de sistem lipsește din imaginea slim. O instalezi în stage-ul final (`apt-get install libpq5`) sau folosești varianta binară a pachetului.
Varianta greșită B: Un multi-stage build produce o singură imagine finală. Containerele le pornești din imagini, cu `docker run` sau cu compose.
Varianta greșită C: Stage-urile rulează pe aceeași mașină de build. BuildKit poate rula în paralel stage-urile independente, dar nu distribuie build-ul într-un cluster.
Varianta greșită D: Stage-urile nu criptează nimic: sunt doar etape de build, iar în imaginea finală intră doar ultimul.

### dk-04
Pe scurt: Cu shell form, PID 1 e `/bin/sh -c`, care nu transmite SIGTERM mai departe, așa că gunicorn nu află de oprire și e omorât cu SIGKILL după 10 secunde.
Scop: Oprirea grațioasă înseamnă că, la fiecare deploy, request-urile în curs se termină și conexiunile se închid curat. Fără ea, fiecare deploy taie request-uri.
Mecanism: `docker stop` trimite SIGTERM procesului cu PID 1 din container și, după 10 s (implicit), SIGKILL. În shell form, PID 1 e shell-ul, iar gunicorn e procesul lui copil: shell-ul nu trimite semnalul mai departe, deci gunicorn rulează până vine SIGKILL. În exec form, gunicorn e chiar PID 1 și primește direct SIGTERM.
Pas cu pas:
```text
shell form: CMD gunicorn app:app
  PID 1 = /bin/sh -c "gunicorn ..."
  SIGTERM -> sh -> nu-l transmite
  după 10 s: SIGKILL, oprire bruscă
exec form: CMD ["gunicorn", "app:app"]
  PID 1 = gunicorn -> oprire grațioasă
```
Aplicare:
```dockerfile
CMD ["gunicorn", "app.main:app", "-w", "4",
     "--graceful-timeout", "20"]
```
Legătură: În Docker Swarm, `stop_grace_period` din compose controlează exact acele 10 secunde de dinaintea lui SIGKILL.
Limită: PID 1 are și sarcina de a culege procesele-zombie, iar semnalele pentru care nu are handler sunt ignorate. Pentru programele care nu tratează corect semnalele folosești un init minimal (`docker run --init`, adică tini).
La interviu: „În shell form, PID 1 e `/bin/sh`, care nu transmite SIGTERM, deci gunicorn e omorât cu SIGKILL după timeout. Folosesc exec form, ca gunicorn să fie PID 1 și să se oprească grațios, sau `--init` pentru procesele care nu tratează semnalele.”
Verificare: Pornești aplicația printr-un `entrypoint.sh` care rulează migrațiile, apoi `gunicorn app:app`. Cum faci ca gunicorn să primească SIGTERM?
Răspuns verificare: Pornești gunicorn cu `exec gunicorn app:app`: `exec` înlocuiește shell-ul cu gunicorn, care devine PID 1.
Varianta greșită B: Gunicorn tratează SIGTERM și își oprește grațios workerii. Problema e că semnalul nu ajunge la el.
Varianta greșită C: `docker stop` trimite întâi SIGTERM, iar SIGKILL abia după perioada de grație (implicit 10 s).
Varianta greșită D: `EXPOSE` doar documentează porturile. N-are legătură cu semnalele.

### dk-05
Pe scurt: În Dockerfile, ca `ENV` sau `ARG`: valoarea rămâne în imagine și în istoricul layerelor, deci o poate citi oricine are imaginea.
Scop: Imaginile ajung în registry-uri, pe mașinile de CI și pe laptopurile colegilor, iar un secret copt în imagine e practic public pentru toți aceștia.
Mecanism: Un `ENV DB_PASSWORD=...` e salvat în configurația imaginii (`docker inspect`) și apare în `docker history`. Un `ARG` folosit într-un `RUN` apare și el în istoric. Chiar dacă îl suprascrii mai târziu, valoarea rămâne în layerul sau în pasul care a setat-o.
Pas cu pas:
```text
ENV DB_PASSWORD=secret
docker push -> registry
oricine are imaginea:
  docker history / docker inspect
  -> DB_PASSWORD=secret
```
Aplicare: Parola vine la runtime: din secretele Docker Swarm sau Kubernetes, dintr-un secret manager sau ca variabilă de mediu setată la deploy. Pentru secretele necesare la build (de exemplu un token pentru un registry privat) folosești `RUN --mount=type=secret,id=...`, care nu rămâne în imagine.
Legătură: Leagă-l de SEC-10: secretele stau într-un secret manager și sunt injectate la runtime, nu în cod și nici în imagine.
Limită: Și variabilele de mediu setate la runtime se pot vedea cu `docker inspect`, pe mașina care rulează containerul; fișierele montate (`/run/secrets/...`) sunt mai discrete.
La interviu: „Nu pun niciodată secrete în Dockerfile: `ENV` și `ARG` rămân în imagine și în istoricul ei. Secretele vin la runtime, din secretele orchestratorului sau dintr-un secret manager, iar la build folosesc `RUN --mount=type=secret`.”
Verificare: Ai pus parola cu `ENV`, apoi ai adăugat mai jos, în același Dockerfile, `ENV DB_PASSWORD=`. Ai rezolvat problema?
Răspuns verificare: Nu: valoarea inițială apare în continuare în `docker history`, la pasul care a setat-o. Schimbi parola și o scoți complet din Dockerfile.
Varianta greșită B: Un secret manager citit la pornire e exact locul potrivit: acces controlat, auditat, cu rotație.
Varianta greșită C: O variabilă de mediu injectată la deploy dintr-un CI/CD protejat e o variantă acceptabilă: secretul nu ajunge în imagine.
Varianta greșită D: Secretele Docker și Kubernetes sunt mecanismele făcute exact pentru asta.

### dk-06
Pe scurt: Rulezi ca user non-root ca să limitezi paguba unei compromiteri: un exploit în aplicație primește doar drepturile unui user obișnuit, nu pe ale lui root.
Scop: Pentru o firmă de securitate, imaginile care rulează ca root sunt o problemă de bază, semnalată de orice scaner.
Mecanism: Implicit, procesul din container rulează ca root (UID 0). Containerul izolează procesul, dar root în container rămâne root pentru kernel: o vulnerabilitate de evadare din container sau un volum montat greșit îi pot da acces la gazdă. Ca user obișnuit, procesul nu poate modifica fișierele sistemului și nu poate instala nimic.
Pas cu pas:
```text
fără USER: aplicația rulează ca root
  exploit -> root în container
cu USER app (UID 10001):
  exploit -> doar drepturile lui app
  nu poate scrie în /usr sau /etc
```
Aplicare:
```dockerfile
RUN useradd --uid 10001 --no-create-home app
COPY --chown=app:app . /app
USER app
```
Legătură: E least privilege (SEC-09) aplicat la nivel de proces: ca la userul de DB, primești doar drepturile de care ai nevoie.
Limită: Fișierele și directoarele în care scrie aplicația (upload-uri, cache) trebuie să aparțină userului, altfel primești `Permission denied`. În Kubernetes impui regula și prin `securityContext: runAsNonRoot: true`.
La interviu: „Rulez containerele ca user non-root, cu `USER app` în Dockerfile, ca un exploit în aplicație să nu primească root. E least privilege la nivel de proces, iar în Kubernetes îl impun cu `runAsNonRoot`.”
Verificare: Ai adăugat `USER app`, dar aplicația crapă când scrie în `/app/uploads`. De ce?
Răspuns verificare: Directorul a fost creat ca root, înainte de `USER app`, deci userul n-are drept de scriere. Îl creezi cu proprietarul corect (`COPY --chown`, `chown`) sau scrii într-un volum.
Varianta greșită B: Python rulează fără probleme ca root. Problema e de securitate, nu de compatibilitate.
Varianta greșită C: Userul procesului nu influențează timpul de pornire.
Varianta greșită D: Docker publică imaginea indiferent de user. Regula e o practică de securitate, nu o cerință a registry-ului.

### dk-07
Pe scurt: Swarm e simplu și integrat în Docker; Kubernetes e standardul industriei, mai complex, dar cu un ecosistem mult mai bogat.
Scop: Ai experiență cu Swarm. La interviu arăți că aceleași concepte se regăsesc și știi ce aduce Kubernetes în plus.
Mecanism: Amândouă rulează servicii replicate pe un cluster, cu rolling updates, rețele între noduri și secrete. Swarm le face cu fișiere compose și câteva comenzi. Kubernetes are mai multe concepte (Pod, Deployment, Service, Ingress) și un API extensibil, peste care s-a construit un întreg ecosistem: autoscaling, operators, Helm.
Pas cu pas:
```text
service + replici -> Deployment, Pods
rețea overlay -> Service, cu DNS
docker secret -> Secret
docker stack deploy -> kubectl / Helm
autoscaling: manual în Swarm
  -> HPA, KEDA în Kubernetes
```
Aplicare: Spui concret ce ai făcut în Swarm (servicii, replici, rolling updates, rețele overlay, secrete) și cum se traduce în Kubernetes. Multe echipe rulează pe Kubernetes sau pe un serviciu gestionat (EKS, ECS), deci merită să știi corespondențele.
Legătură: Experiența ta cu Docker Swarm e o bază bună: servicii, replici și rolling updates se regăsesc aproape identic în Kubernetes.
Limită: Kubernetes are un cost real de operare: multe componente, multă configurare. Pentru echipe mici, un serviciu gestionat (EKS, GKE) sau chiar Swarm poate fi alegerea mai bună.
La interviu: „Am lucrat cu Docker Swarm: servicii, replici, rolling updates, rețele overlay. Swarm e simplu și integrat; Kubernetes e standardul, mai complex, cu un ecosistem bogat (autoscaling, operators, Helm). Conceptele se transferă direct.”
Verificare: Cum se numește în Kubernetes echivalentul unui serviciu Swarm cu 3 replici?
Răspuns verificare: Un Deployment cu `replicas: 3`, care creează Pod-urile, plus un Service care le dă un nume DNS stabil și împarte traficul între ele.
Varianta greșită B: Swarm nu e succesorul lui Kubernetes: sunt orchestratoare separate, iar Kubernetes e cel mai complet și a devenit standardul.
Varianta greșită C: Kubernetes rulează imagini OCI, deci și pe cele construite cu Docker. A fost scos doar suportul pentru Docker ca runtime (dockershim), nu pentru imaginile lui.
Varianta greșită D: Diferă mult ca funcționalitate: Kubernetes are autoscaling, operators, politici de rețea și un ecosistem pe care Swarm nu le are.

### dk-08
Pe scurt: Prin numele serviciului ca hostname: din containerul aplicației, Postgres e `postgres:5432`, pentru că Compose pune serviciile într-o rețea cu DNS intern.
Scop: E greșeala clasică la primul docker compose: `localhost` în container nu e mașina ta, ci chiar containerul.
Mecanism: Compose creează o rețea pentru proiect și înregistrează fiecare serviciu în DNS-ul ei intern, sub numele lui. Fiecare container are propriul `localhost`, deci `localhost:5432` din containerul aplicației caută Postgres chiar în containerul aplicației.
Pas cu pas:
```text
servicii: api, postgres
api -> postgres:5432 -> DNS intern -> OK
api -> localhost:5432
  -> containerul api -> connection refused
```
Aplicare:
```yaml
services:
  api:
    environment:
      DATABASE_URL: postgresql://app:pw@postgres:5432/app
    depends_on:
      postgres: {condition: service_healthy}
  postgres:
    image: postgres:16
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "app"]
```
Legătură: E același DNS intern ca în rețelele overlay din Docker Swarm, unde serviciile se găsesc după nume.
Limită: Un `depends_on` simplu doar ordonează pornirea, nu așteaptă ca Postgres să accepte conexiuni. Cu un healthcheck și `condition: service_healthy` chiar așteaptă; oricum, aplicația ar trebui să reîncerce conexiunea la pornire.
La interviu: „În compose, serviciile se găsesc după nume, prin DNS-ul rețelei create de compose, deci aplicația se conectează la `postgres:5432`. `localhost` în container e containerul însuși. Pentru ordinea pornirii folosesc un healthcheck cu `service_healthy`.”
Verificare: Rulezi aplicația direct pe laptop, nu în compose, iar Postgres rulează în compose, cu `ports: ["5432:5432"]`. Ce host folosești acum?
Răspuns verificare: `localhost:5432`: portul e publicat pe mașina ta, iar aplicația rulează pe mașina ta, nu în rețeaua compose.
Varianta greșită B: Fiecare container are propriul `localhost`; din containerul aplicației, `localhost:5432` caută Postgres chiar în acel container.
Varianta greșită C: IP-ul gazdei merge doar dacă portul e publicat și e un ocoliș inutil: în rețeaua compose, serviciile se găsesc direct după nume.
Varianta greșită D: Compose creează automat o rețea pentru proiect, deci serviciile se văd fără nicio configurare suplimentară.
