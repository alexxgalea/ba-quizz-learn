<!-- Observabilitate și CI/CD. Variantele greșite: B, C, D = ordinea din sursă (A e cea corectă). -->

### obs-01
Pe scurt: Percentilele (p95, p99): media ascunde coada distribuției, adică exact request-urile lente de care se plâng userii.
Scop: Monitorizezi experiența reală a userilor, nu un număr care arată bine pe dashboard.
Mecanism: Media adună toate duratele și împarte, așa că câteva request-uri foarte lente se pierd printre multe rapide. p99 e valoarea sub care se află 99% din request-uri: dacă p99 e 7 s, un request din 100 durează cel puțin 7 s. Un user care face 50 de request-uri pe sesiune lovește aproape sigur coada.
Pas cu pas:
```text
99 de request-uri × 50 ms + 1 × 7 s
media = (4.950 + 7.000) / 100 ≈ 120 ms
p50 = 50 ms, p99 = 7 s
userul: „aplicația e lentă”
```
Aplicare: Pe dashboard-uri și în alerte folosești p95 și p99 per endpoint, calculate din histograme (Prometheus, New Relic). Când p99 crește, cauți în trace-uri request-urile din coadă.
Legătură: E aceeași capcană ca la metricile din AI: o acuratețe medie bună poate ascunde o clasă pe care modelul o ratează constant.
Limită: Percentilele nu se pot media între servere: media p99-urilor nu e p99-ul total, așa că le calculezi din histograme agregate. Iar p99 calculat pe puține request-uri e zgomotos.
La interviu: „Media ascunde coada distribuției, așa că urmăresc p95 și p99 per endpoint, calculate din histograme. Un p99 mare înseamnă că o parte reală dintre useri așteaptă mult, chiar dacă media arată bine.”
Verificare: Ai p99 pe fiecare dintre cele 4 servere și afișezi media lor pe dashboard. Asta e p99-ul serviciului?
Răspuns verificare: Nu: percentilele nu se mediază. Calculezi p99 din histograma agregată a tuturor request-urilor, de pe toate serverele.
Varianta greșită B: O fereastră mai mare face media și mai netedă, deci ascunde și mai bine request-urile lente.
Varianta greșită C: Numărul de servere arată capacitatea, nu ce trăiesc userii.
Varianta greșită D: CPU-ul mediu nu spune nimic despre request-urile lente care așteaptă după DB sau după alte servicii.

### obs-02
Pe scurt: Metricile sunt valori agregate în timp, logurile sunt evenimente individuale cu context, iar un trace arată drumul unui request prin servicii, cu durata fiecărui pas.
Scop: La un incident, fiecare răspunde la altă întrebare: metricile îți spun că e o problemă, trace-urile unde e, logurile de ce.
Mecanism: Metricile (rata de request-uri, erorile, latența p99) sunt numere ieftine de stocat, bune pentru alerte și dashboard-uri. Logurile descriu un eveniment concret, de exemplu o eroare, cu userul și parametrii. Un trace leagă printr-un trace id span-urile unui request: API, coadă, worker, DB, fiecare cu durata lui.
Pas cu pas:
```text
metrică: p99 /alerts = 4 s -> alertă
trace: API 20 ms, DB 3,9 s (span lent)
log: „slow query ... user=7 tenant=3”
-> cauza: un query fără index
```
Aplicare: Instrumentezi serviciile cu OpenTelemetry (trace-uri și metrici), scrii loguri structurate care conțin trace id-ul și le legi pe toate trei în unealta de observabilitate (New Relic, Grafana, Datadog).
Legătură: Un stack ELK (Elasticsearch, Kibana) acoperă bine logurile; pentru metrici și trace-uri ai nevoie de unelte în plus, ca Prometheus sau OpenTelemetry.
Limită: Logurile sunt cele mai scumpe la volum mare: nu loga totul la nivel DEBUG în producție și eșantionează trace-urile. Iar fără un id comun, cele trei nu se pot lega între ele.
La interviu: „Metricile spun că e o problemă, trace-urile unde, logurile de ce. Instrumentez cu OpenTelemetry, pun trace id-ul în loguri și alertez pe metrici, de exemplu pe p99 și pe rata de erori.”
Verificare: Ai o alertă pe p99 și vrei să afli ce serviciu din lanț e lent. Ce folosești?
Răspuns verificare: Trace-urile: vezi span-urile unui request lent și care dintre ele consumă timpul (API, coadă, worker sau DB).
Varianta greșită B: Nu sunt aceleași date: metricile sunt agregate, logurile sunt evenimente, iar trace-urile leagă pașii unui request.
Varianta greșită C: Un trace distribuit nu e un log de eroare: arată drumul complet al unui request, inclusiv al celor reușite.
Varianta greșită D: Metricile nu sunt loguri comprimate: sunt măsurători numerice, agregate în timp și colectate separat.

### obs-03
Pe scurt: RED înseamnă Rate (request-uri pe secundă), Errors (rata de erori) și Duration (latența, pe percentile), măsurate pentru fiecare serviciu.
Scop: Cu trei metrici standard pe fiecare serviciu vezi repede dacă e sănătos și poți compara serviciile între ele.
Mecanism: Rate arată cât trafic primește serviciul. Errors arată ce parte din request-uri eșuează, de exemplu cu 5xx. Duration arată cât durează, ideal ca p50, p95 și p99. Împreună acoperă ce simte clientul serviciului.
Pas cu pas:
```text
API /alerts:
  Rate: 120 req/s
  Errors: 0,4% (5xx)
  Duration: p50 40 ms, p99 900 ms
alertă: Errors > 1% sau p99 > 1 s
```
Aplicare: Pui RED pe fiecare serviciu și endpoint (cu un middleware în FastAPI sau prin agentul APM). Pentru resurse (CPU, disc, pool de conexiuni) folosești USE: Utilization, Saturation, Errors. Pentru cozi: adâncimea și vârsta celui mai vechi mesaj.
Legătură: Pentru workeri și cozi aplici aceeași logică de la DES-04: lungimea cozii și vârsta mesajelor țin locul lui Duration pentru munca asincronă.
Limită: RED descrie simptomele văzute de client, nu cauza: îți spune că un serviciu e lent, iar de ce afli din trace-uri și loguri.
La interviu: „Pentru servicii folosesc RED: Rate, Errors, Duration, cu latența pe percentile. Pentru resurse, USE, iar pentru cozi, adâncimea și vârsta celui mai vechi mesaj.”
Verificare: Un worker Celery nu primește request-uri HTTP. Ce metrici echivalente pui pentru el?
Răspuns verificare: Task-uri procesate pe secundă (rate), task-uri eșuate (errors), durata task-urilor și, pentru coadă, lungimea ei și vârsta celui mai vechi mesaj.
Varianta greșită B: RED nu e un stack de unelte: literele sunt metrici, nu Redis, Elastic și Docker.
Varianta greșită C: RED n-are legătură cu permisiunile: descrie ce măsori la un serviciu.
Varianta greșită D: RED nu descrie pașii unui incident, ci metricile de bază ale unui serviciu.

### obs-04
Pe scurt: New Relic APM îți arată unde se duce timpul la fiecare tranzacție: în codul tău, în query-urile DB sau în apelurile externe.
Scop: La o investigație de latență vrei să afli în câteva minute dacă endpoint-ul lent stă într-un query, într-un apel HTTP extern sau în cod, fără să adaugi loguri și să faci deploy.
Mecanism: Agentul rulează în procesul aplicației și instrumentează automat framework-ul (FastAPI, Django), driverele DB și clienții HTTP. Pentru fiecare tranzacție (request web sau task de fundal) înregistrează durata pe componente, query-urile lente cu textul lor, erorile și trace-urile distribuite între servicii.
Pas cu pas:
```text
GET /alerts, p95 2,1 s:
  Python: 150 ms
  Postgres: 1,8 s (120 de query-uri)
  HTTP extern: 100 ms
-> N+1: lipsește un selectinload
```
Aplicare: Pornești aplicația prin agent (`newrelic-admin run-program gunicorn ...`), cu cheia de licență luată din secrete, apoi folosești Transactions, Databases și Distributed tracing pentru endpoint-ul lent.
Legătură: Ce vezi în APM duce direct la temele din P1: N+1 în SQLAlchemy sau un index lipsă (IDX-08). APM-ul îți arată unde e problema, `EXPLAIN` îți arată de ce.
Limită: Agentul adaugă un mic overhead și costă după volumul de date. Iar fără nume clare pentru tranzacțiile de fundal (task-urile Celery), timpul lor se amestecă și e greu de analizat.
La interviu: „În New Relic APM văd timpul defalcat pe tranzacție (cod, DB, apeluri externe), plus query-urile lente și trace-urile distribuite. Așa aflu repede dacă un endpoint lent are N+1, un index lipsă sau o dependență externă lentă.”
Verificare: APM-ul arată că `GET /alerts` face 120 de query-uri cu aceeași formă, de câte 10 ms fiecare. Ce problemă ai?
Răspuns verificare: N+1: un query pentru listă și câte unul pentru fiecare element. Rezolvi cu eager loading (`selectinload`) sau cu un JOIN.
Varianta greșită B: Uptime-ul și disponibilitatea țin de monitorizarea sintetică; APM-ul analizează tranzacțiile din interiorul aplicației.
Varianta greșită C: APM-ul agregă pe tranzacții și pe componente; logurile sunt doar una dintre sursele lui.
Varianta greșită D: Costurile AWS le vezi în Cost Explorer. APM-ul măsoară performanța aplicației.

### obs-05
Pe scurt: Logurile structurate (JSON) se filtrează ușor după câmpuri, iar un correlation ID comun îți permite să urmărești un request prin toate serviciile: API, coadă, worker.
Scop: La un incident vrei să găsești în câteva secunde toate liniile de log ale unui anumit request, din toate serviciile, nu să cauți prin text liber.
Mecanism: Fiecare linie de log e un obiect JSON cu câmpuri fixe (`level`, `message`, `request_id`, `tenant_id`), indexate pe câmpuri de unealta de loguri (Elasticsearch, Loki). ID-ul request-ului e generat la intrare sau preluat dintr-un header, pus în contextul logger-ului și trimis mai departe în headerele task-urilor Celery.
Pas cu pas:
```text
API: request_id=abc -> log JSON
  -> task publicat cu header request_id
worker: abc în context -> log JSON
căutare: request_id:abc
  -> tot drumul, în ordine
```
Aplicare:
```python
request_id = contextvars.ContextVar("request_id")

class JsonFormatter(logging.Formatter):
    def format(self, r):
        return json.dumps({"level": r.levelname,
            "msg": r.getMessage(),
            "request_id": request_id.get(None)})
```
Legătură: E exact rolul trace id-ului la trace-uri (OBS-02): un identificator comun care leagă pașii aceluiași request.
Limită: Nu pui în loguri date sensibile: parole, token-uri, date personale. Iar câmpurile cu foarte multe valori distincte, folosite ca etichete, pot face indexarea scumpă în unele unelte.
La interviu: „Scriu loguri structurate, în JSON, cu un correlation ID generat la intrare și propagat în headerele task-urilor Celery, ca să pot urmări un request din API până în worker. Fără date sensibile în loguri.”
Verificare: Un task Celery rulează pe alt worker, după 2 minute. Cum ajunge request_id-ul acolo?
Răspuns verificare: Îl pui în headerele task-ului la publicare (de exemplu cu semnalul `before_task_publish`), iar când pornește task-ul îl citești și îl setezi în contextul logger-ului.
Varianta greșită B: JSON-ul are câmpuri și ghilimele, deci ocupă de obicei mai mult spațiu decât textul simplu. Câștigul e la căutare, nu la spațiu.
Varianta greșită C: Modulul `logging` nu cere JSON: formatul îl alegi tu, prin formatter.
Varianta greșită D: Textul simplu se citește mai ușor cu ochiul liber; JSON-ul e făcut pentru mașini, pentru filtrare și agregare.

### obs-06
Pe scurt: `cache` accelerează joburile prin fișiere refolosite (de exemplu pachetele pip), fără garanții; `artifacts` transmit sigur rezultatele unui job către joburile următoare și pot fi descărcate.
Scop: Folosești fiecare mecanism pentru ce e făcut: cache-ul pentru viteză, artifacts pentru corectitudine.
Mecanism: Cache-ul e salvat pe runner sau într-un storage comun, sub o cheie; un job îl poate găsi sau nu, deci trebuie să meargă și fără el. Artifacts sunt încărcate în GitLab la finalul jobului și descărcate automat de joburile din stage-urile următoare (sau din `needs`); expiră după timpul setat.
Pas cu pas:
```text
cache: .cache/pip, cheie pe requirements
  -> pip install mai rapid, dacă există
build: dist/app.whl -> artifacts
test: primește garantat dist/app.whl
raportul JUnit -> apare în merge request
```
Aplicare:
```yaml
test:
  variables:
    PIP_CACHE_DIR: "$CI_PROJECT_DIR/.cache/pip"
  cache:
    key:
      files: [requirements.txt]
    paths: [.cache/pip]
  script:
    - pip install -r requirements.txt
    - pytest --junitxml=report.xml
  artifacts:
    reports:
      junit: report.xml
```
Legătură: E diferența dintre cache-ul de layere din Docker (DK-02), care doar accelerează, și imaginea publicată, rezultatul pe care îl folosești mai departe.
Limită: Cache-ul poate fi oricând gol sau vechi, deci nu-l folosești ca să transmiți rezultate între joburi. Iar artifacts mari încetinesc pipeline-ul și ocupă spațiu, așa că le pui `expire_in`.
La interviu: „`cache` accelerează joburile, de exemplu pachetele pip, dar fără garanții. `artifacts` transmit rezultatele între joburi și pot fi descărcate; rapoartele JUnit și de coverage apar direct în merge request.”
Verificare: Jobul de build pune wheel-ul în `cache`, iar jobul de deploy îl ia de acolo. Ce poate merge prost?
Răspuns verificare: Deploy-ul poate rula pe alt runner sau poate găsi cache-ul gol ori vechi, deci nu livrează nimic sau livrează un wheel vechi. Rezultatele dintre joburi trec prin `artifacts`.
Varianta greșită B: Nu sunt același lucru: cache-ul accelerează, fără garanții, iar artifacts transmit sigur rezultatele.
Varianta greșită C: Artifacts pot fi orice fișiere: wheel-uri, rapoarte de teste, coverage. Imaginile Docker merg de obicei în container registry.
Varianta greșită D: Cache-ul nu e garantat: poate lipsi, poate fi vechi și depinde de runner și de cheie.

### obs-07
Pe scurt: Declari `services: [postgres:17]` în job: GitLab pornește un container Postgres lângă cel al jobului, accesibil prin hostname-ul `postgres`.
Scop: Testele de integrare rulează pe un Postgres real, ca în producție, fără instalări manuale pe runner.
Mecanism: Pentru fiecare job, runner-ul pornește containerele din `services` și le leagă de containerul jobului printr-o rețea. Serviciul e accesibil după numele imaginii (`postgres`) sau după un alias. Variabilele jobului (`POSTGRES_DB`, `POSTGRES_PASSWORD`) configurează și containerul serviciului.
Pas cu pas:
```text
job test:
  container: python:3.12 (testele)
  serviciu: postgres:17 (host: postgres)
teste -> postgres:5432 -> DB curat
job gata -> ambele containere dispar
```
Aplicare:
```yaml
test:
  image: python:3.12
  services: [postgres:17]
  variables:
    POSTGRES_DB: app
    POSTGRES_USER: app
    POSTGRES_PASSWORD: test
    DATABASE_URL: postgresql://app:test@postgres:5432/app
  script: [pytest]
```
Legătură: E exact ca în docker compose (DK-08): serviciul e găsit după nume, iar `localhost` din job nu e DB-ul.
Limită: Serviciul poate porni mai încet decât jobul, deci testele trebuie să aștepte ca DB-ul să accepte conexiuni (`pg_isready` sau retry). Alternativa, testcontainers, cere ca runner-ul să permită Docker în job.
La interviu: „În GitLab CI declar `services: [postgres:17]`, iar testele se conectează la hostname-ul `postgres`, ca în compose. Așa rulez testele de integrare pe un Postgres real, curat la fiecare job.”
Verificare: Testele pică uneori, chiar la început, cu „connection refused”, deși configurarea e corectă. De ce?
Răspuns verificare: Postgres încă pornea când au început testele. Aștepți explicit (`pg_isready` într-o buclă) sau pui retry la conexiune, în fixture.
Varianta greșită B: Instalarea manuală la fiecare rulare e lentă și fragilă, iar `services` face exact asta automat, într-un container curat.
Varianta greșită C: Se poate, cu `services`. Iar SQLite în teste ascunde diferențe reale față de Postgres: tipuri, JSONB, lock-uri.
Varianta greșită D: Mock-urile pe SQL nu prind erorile reale de query, de constrângeri sau de tranzacții, adică exact ce testează integrarea.

### obs-08
Pe scurt: `needs:` declară dependențe directe între joburi: un job pornește imediat ce s-au terminat joburile de care are nevoie, fără să aștepte tot stage-ul anterior.
Scop: Pipeline-uri mai scurte: un build lent al unei componente nu mai blochează testele alteia.
Mecanism: Implicit, joburile unui stage așteaptă terminarea tuturor joburilor din stage-ul anterior. Cu `needs`, pipeline-ul devine un graf de dependențe (DAG): fiecare job așteaptă doar joburile listate și primește doar artifacts-urile lor.
Pas cu pas:
```text
fără needs:
  build-api (1 min), build-ui (8 min)
  test-api așteaptă și după build-ui
cu needs: [build-api]
  test-api pornește după 1 min
```
Aplicare:
```yaml
test-api:
  stage: test
  needs: [build-api]
  script: [pytest]
```
Legătură: E aceeași idee ca un chain sau un chord în Celery (CEL-09): declari explicit ce depinde de ce, iar restul rulează în paralel.
Limită: Un `needs` uitat face jobul să pornească înainte să existe ce-i trebuie, iar unul în plus reintroduce așteptarea. `rules:` e altceva: decide dacă jobul rulează (branch, merge request, fișiere schimbate).
La interviu: „`needs:` transformă pipeline-ul într-un DAG: jobul pornește când termină joburile de care depinde, fără să aștepte tot stage-ul anterior, deci pipeline-ul se scurtează. `rules:` decide dacă jobul rulează.”
Verificare: Un job are `needs: []`. Când pornește?
Răspuns verificare: Imediat, la începutul pipeline-ului, fără să aștepte vreun alt job, chiar dacă face parte dintr-un stage ulterior.
Varianta greșită B: Pachetele de sistem le instalezi în `before_script` sau în imaginea jobului. `needs` declară dependențe între joburi.
Varianta greșită C: Variabilele secrete se definesc în setările CI/CD ale proiectului sau cu `variables`. `needs` n-are legătură cu ele.
Varianta greșită D: Reîncercările automate se configurează cu `retry:`. `needs` declară doar dependențe.

### obs-09
Pe scurt: Un SLO e o țintă internă de fiabilitate, de exemplu 99,9% din request-uri sub 300 ms, măsurată pe o perioadă, cum ar fi 30 de zile.
Scop: Un SLO transformă „aplicația trebuie să fie rapidă” într-un număr pe care îl poți măsura, pe care pui alerte și pe care îl folosești la decizii: lansăm funcții noi sau reparăm stabilitatea?
Mecanism: SLI e indicatorul măsurat (procentul de request-uri reușite sub 300 ms). SLO e ținta pentru acest indicator (99,9% pe 30 de zile). SLA e angajamentul contractual față de client, de obicei mai relaxat decât SLO-ul și cu penalități. Diferența până la 100% e error budget-ul: cât îți permiți să ratezi.
Pas cu pas:
```text
SLI: % request-uri OK, sub 300 ms
SLO: 99,9% pe 30 de zile
error budget: 0,1% ≈ 43 min pe lună
buget consumat -> prioritate: stabilitate
```
Aplicare: Alegi SLO-uri pentru câteva drumuri critice (ingestia evenimentelor, livrarea alertelor), pui alerte pe ritmul în care se consumă error budget-ul (burn rate) și folosești bugetul la decizii de prioritizare.
Legătură: Pentru un produs ca Defend, un SLO natural ar fi pe latența de la eveniment la alertă: de exemplu, 99% din alerte livrate în SIEM în mai puțin de 2 minute.
Limită: Un SLO prea strict (99,999%) costă enorm și blochează schimbările, iar unul prea lax nu protejează userii. Iar 100% nu e o țintă realistă.
La interviu: „SLI e ce măsor, SLO e ținta internă, de exemplu 99,9% din request-uri sub 300 ms pe 30 de zile, iar SLA e angajamentul contractual. Error budget-ul îmi spune cât pot risca și când trebuie să prioritizez stabilitatea.”
Verificare: Ai consumat tot error budget-ul lunii în prima săptămână. Ce înseamnă asta practic?
Răspuns verificare: Pentru restul lunii prioritizezi stabilitatea: amâni lansările riscante, repari cauzele incidentelor și abia apoi revii la funcții noi.
Varianta greșită B: Contractul cu clientul, cu penalități, e SLA-ul. SLO-ul e ținta internă, de obicei mai strictă decât SLA-ul.
Varianta greșită C: SLO-ul nu e un format de log, ci o țintă măsurabilă de fiabilitate.
Varianta greșită D: Un dashboard poate afișa SLO-urile, dar SLO-ul e ținta în sine, nu panoul.
