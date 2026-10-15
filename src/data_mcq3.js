/* MCQ bank 3: Pytest, Docker, AWS, GraphQL, observabilitate & GitLab CI, Linux. */
(function (P) {
  const R = String.raw;
  const Q = (m, list) => list.forEach(q => P.mcq.push(Object.assign({ m }, q)));

  Q("pytest", [
    { id: "pt-01", q: "Ce face fixture-ul?", code: R`@pytest.fixture
def db_session(engine):
    session = Session(bind=engine)
    yield session
    session.rollback()
    session.close()`, o: [
      "Setup înainte de `yield`, teardown după, chiar dacă testul pică",
      "Testul primește un generator pe care trebuie să-l itereze",
      "Fixture-ul rulează de două ori pentru fiecare test: înainte și după",
      "Codul de după `yield` rulează doar dacă testul trece cu succes"], a: 0,
      e: "Valoarea de la `yield` e injectată în test. Pattern clasic de izolare: tranzacție + rollback per test, deci testele nu-și văd datele unul altuia." },
    { id: "pt-02", q: "Fixture-ul `engine` pornește un container Postgres (~5 s) și e folosit de 300 de teste. Ce scope?", o: [
      "`session`; datele rămân izolate per test",
      "`function`, ca fiecare test să aibă containerul lui",
      "`class`, ca să fie reutilizat în clasa de teste",
      "Nu se poate partaja: fixture-urile sunt mereu per test"], a: 0,
      e: "Resurse scumpe, fără stare per test → scope mare. Sesiunea DB per test rămâne cu scope `function`. Un fixture cu scope mare nu poate depinde de unul cu scope mai mic." },
    { id: "pt-03", q: "Ce patch e corect în testul pentru `raise_alert`?", code: R`# app/alerts.py
from app.notify import send_email

def raise_alert(alert):
    send_email(alert.owner, alert.title)`, o: [
      "`patch(\"app.alerts.send_email\")`",
      "`patch(\"app.notify.send_email\")`",
      "`patch(\"send_email\")`",
      "`patch(\"smtplib.SMTP\")` e singura variantă"], a: 0,
      e: "Patch-uiești numele acolo unde e căutat la runtime. `from ... import` creează o referință în `app.alerts`; patch-ul în `app.notify` nu o atinge." },
    { id: "pt-04", q: "Ce face `@pytest.mark.parametrize`?", o: [
      "Rulează același test pe mai multe seturi de argumente",
      "Rulează testele în paralel pe mai multe procese",
      "Marchează testul ca lent, ca să-l poți exclude",
      "Generează date de test aleatorii pentru fiecare rulare"], a: 0,
      e: "Fiecare set e raportat ca test separat. Ideal pentru reguli de detecție: aceeași funcție, multe linii de log, fiecare cu verdictul așteptat. `ids=` dă nume lizibile." },
    { id: "pt-05", q: "Unde pui fixture-urile folosite de mai multe fișiere de test?", o: [
      "În `conftest.py`, descoperit automat, fără import",
      "În `__init__.py` din directorul de teste",
      "În `setup.py`",
      "Într-un modul importat cu `from fixtures import *`, singura variantă"], a: 0,
      e: "Poți avea `conftest.py` pe mai multe niveluri; fixture-urile se văd în directorul lui și în subdirectoare." },
    { id: "pt-06", q: "Cum testezi o funcție care citește `os.environ[\"API_KEY\"]`?", o: [
      "`monkeypatch.setenv(\"API_KEY\", \"test\")`",
      "Setezi variabila în `.bashrc` pe mașina de CI și local",
      "Modifici `os.environ` direct, fără să-l restaurezi",
      "Nu se poate testa fără să modifici funcția"], a: 0,
      e: "monkeypatch anulează modificarea automat la teardown. Și mai bine: citești configurarea într-un obiect Settings (pydantic-settings) pe care îl injectezi." },
    { id: "pt-07", q: "La ce folosește `side_effect` pe un mock?", o: [
      "Să arunce excepții sau să returneze valori succesive",
      "Să ruleze funcția reală în locul mock-ului",
      "Să numere de câte ori a fost apelat mock-ul",
      "Să facă mock-ul asincron, pentru funcții `async`"], a: 0,
      e: "`mock.side_effect = [ConnectionError(), {\"ok\": True}]`: primul apel eșuează, al doilea reușește. Exact ce îți trebuie ca să testezi un retry." },
    { id: "pt-08", q: "De ce `task_always_eager=True` nu ajunge pentru testarea integrării cu Celery?", o: [
      "Ocolește brokerul, serializarea și ack-urile",
      "E mai lent decât un worker real, deci testele durează",
      "Cere oricum un RabbitMQ pornit, deci nu e izolat",
      "Nu execută deloc task-ul, doar înregistrează apelul"], a: 0,
      e: "E OK pentru unit teste pe logică. Pentru integrare: worker real în test (fixture-ul `celery_worker`) sau broker în Docker." },
    { id: "pt-09", q: "Un test folosește `time.sleep(2)` ca să aștepte un job asincron. Problema?", o: [
      "E lent și flaky; aștepți o condiție sau controlezi ceasul",
      "Nicio problemă, 2 secunde sunt suficiente",
      "pytest interzice `sleep` în teste și le marchează failed",
      "Blochează celelalte teste care rulează în paralel"], a: 0,
      e: "Testele trebuie să fie rapide și deterministe. Aștepți explicit o condiție, cu timeout; pentru logică dependentă de timp: freezegun/time-machine sau un clock injectat." },
    { id: "pt-10", q: "Ce schimbă `autospec=True` la patch?", o: [
      "Mock-ul respectă semnătura obiectului real",
      "Creează automat mock-uri pentru tot modulul",
      "Rulează testul cu mai multe specificații de mock",
      "Dezactivează mock-ul după primul apel"], a: 0,
      e: "Un apel cu argumente greșite pică testul. Fără autospec, un MagicMock acceptă orice apel și orice atribut: testul trece deși codul real ar crăpa." }
  ]);

  Q("docker", [
    { id: "dk-01", q: "Imagine vs container?", o: [
      "Imaginea e șablonul read-only; containerul rulează din ea",
      "Sunt sinonime; „container” e doar termenul din Kubernetes",
      "Containerul e fișierul Dockerfile, imaginea e rezultatul rulării",
      "Imaginea rulează, containerul e copia ei de pe disc"], a: 0,
      e: "Imaginea e făcută din layere; containerul adaugă un layer de scriere propriu. Din aceeași imagine pornești oricâte containere, iar ce scrie un container dispare cu el: datele persistente stau în volume." },
    { id: "dk-02", q: "De ce copiezi `requirements.txt` și rulezi `pip install` înainte de `COPY . .`?", o: [
      "Ca layerul cu dependențe să rămână în cache",
      "Pentru că `pip install` nu mai funcționează după `COPY . .`",
      "Ca imaginea finală să nu conțină codul sursă al aplicației",
      "Ordinea nu contează: Docker reordonează pașii optim"], a: 0,
      e: "Docker invalidează cache-ul de la prima instrucțiune al cărei input s-a schimbat. Codul se schimbă des, dependențele rar." },
    { id: "dk-03", q: "Ce aduce un multi-stage build?", o: [
      "Imagine finală mică, fără unelte de build",
      "Pornește mai multe containere din același Dockerfile",
      "Face build-ul în paralel, pe mai multe mașini din cluster",
      "Criptează layerele imaginii cu o cheie per stage"], a: 0,
      e: "Stage-ul de build produce wheels sau artefacte; stage-ul final copiază doar ce trebuie (`COPY --from=builder`). Suprafață de atac mai mică, distribuție mai rapidă." },
    { id: "dk-04", q: "Cu `CMD gunicorn app:app` (shell form), `docker stop` omoară aplicația după 10 s, fără oprire grațioasă. De ce?", o: [
      "PID 1 e `/bin/sh`, care nu-i transmite SIGTERM lui gunicorn",
      "Gunicorn ignoră SIGTERM în orice configurație",
      "`docker stop` trimite direct SIGKILL, fără SIGTERM",
      "Lipsește `EXPOSE`, deci semnalul nu ajunge în container"], a: 0,
      e: "Cu exec form (`CMD [\"gunicorn\", \"app:app\"]`), gunicorn e PID 1, primește SIGTERM și își închide workerii grațios. Pentru procese care nu tratează semnale: `--init` (tini)." },
    { id: "dk-05", q: "Unde NU pui parola bazei de date?", o: [
      "În Dockerfile (ENV sau ARG): rămâne în istoricul layerelor imaginii",
      "Într-un secret manager citit la pornire",
      "Într-o variabilă de mediu injectată la deploy dintr-un CI/CD protejat",
      "În secretele Docker sau Kubernetes"], a: 0,
      e: "`docker history` și oricine are imaginea pot extrage valorile. Pentru secrete la build: `RUN --mount=type=secret` (BuildKit)." },
    { id: "dk-06", q: "De ce rulezi containerul ca user non-root?", o: [
      "Limitezi impactul unei compromiteri a aplicației",
      "Pentru că interpretorul Python refuză să ruleze ca root",
      "Pentru că așa containerul pornește mai repede",
      "Pentru că altfel Docker refuză să publice imaginea"], a: 0,
      e: "Un exploit în aplicație nu primește root în container. Least privilege: `RUN useradd ...` + `USER app`. Relevant pentru o firmă de securitate." },
    { id: "dk-07", q: "Docker Swarm vs Kubernetes, pe scurt?", o: [
      "Swarm: simplu, integrat; Kubernetes: standard, mai complex",
      "Swarm e succesorul mai nou și mai complet al lui Kubernetes",
      "Kubernetes nu poate rula imagini construite cu Docker",
      "Sunt identice ca funcționalitate; diferă doar CLI-ul și sintaxa YAML"], a: 0,
      e: "Kubernetes are ecosistemul bogat (autoscaling, operators, Helm). Ai lucrat cu Swarm: servicii, replici, rolling updates, rețele overlay; conceptele se transferă direct la Kubernetes și ECS." },
    { id: "dk-08", q: "În docker compose, cum se conectează aplicația la serviciul Postgres?", o: [
      "Prin numele serviciului ca hostname, de exemplu `postgres:5432`",
      "Prin `localhost:5432`, pentru că rulează pe aceeași mașină",
      "Doar prin IP-ul mașinii gazdă și portul expus",
      "Nu se pot conecta fără o rețea creată manual de tine"], a: 0,
      e: "Compose creează o rețea în care serviciile se găsesc după nume. În container, `localhost` e chiar containerul. `depends_on` nu așteaptă ca DB-ul să fie gata: folosești healthcheck + `condition: service_healthy`." }
  ]);

  Q("aws", [
    { id: "aws-01", q: "Cum primește corect un container ECS acces la un bucket S3?", o: [
      "Printr-un IAM task role cu permisiuni minime",
      "Cu access key-ul unui user IAM, pus în imagine la build",
      "Făcând bucket-ul public, dar cu un nume greu de ghicit",
      "Cu credențialele contului root, ținute într-un `.env`"], a: 0,
      e: "Rolurile dau credențiale temporare, rotite automat. Cheile statice în imagini sau cod sunt o problemă clasică de securitate." },
    { id: "aws-02", q: "Ce garantează SQS standard?", o: [
      "At-least-once și ordine best-effort; FIFO adaugă ordine",
      "Exactly-once și ordine strictă pentru toate mesajele",
      "Livrare la cel mult un consumator, fără retry",
      "Mesaje păstrate permanent, până le ștergi manual"], a: 0,
      e: "FIFO adaugă și deduplicare. Visibility timeout: mesajul preluat devine invizibil; dacă nu e șters la timp, reapare. După `maxReceiveCount` ajunge în DLQ. Aceleași concepte ca la Celery și RabbitMQ." },
    { id: "aws-03", q: "Security Group vs NACL?", o: [
      "SG: per instanță, stateful; NACL: per subnet, stateless",
      "Sunt identice, doar numele diferă între consolă și CLI",
      "NACL e la nivel de instanță, SG la nivel de VPC",
      "SG: per subnet, stateless; NACL: per instanță, stateful"], a: 0,
      e: "SG are doar reguli allow; NACL are allow și deny. Stateful = răspunsul la o conexiune permisă trece automat. Baza de date stă în subnete private, accesibilă doar din SG-ul aplicației." },
    { id: "aws-04", q: "Postgres gestionat, cu failover automat în altă zonă de disponibilitate?", o: ["RDS sau Aurora cu Multi-AZ", "EC2 cu Postgres instalat manual", "DynamoDB global tables", "S3 cu versionare"], a: 0,
      e: "Multi-AZ = standby pentru disponibilitate; replicile de citire (asincrone) sunt pentru scalarea citirilor. Diferență des întrebată." },
    { id: "aws-05", q: "Când nu e potrivit AWS Lambda?", o: [
      "Pentru procesări de peste 15 minute sau cu conexiuni persistente",
      "Pentru evenimente rare, care vin de câteva ori pe zi",
      "Pentru procesarea fișierelor încărcate în S3",
      "Pentru API-uri cu trafic variabil, cu vârfuri imprevizibile"], a: 0,
      e: "Limita e 15 minute; atunci treci pe ECS sau EC2. Mai contează cold start-urile și conexiunile la DB (RDS Proxy)." },
    { id: "aws-06", q: "Ce înregistrează CloudTrail?", o: [
      "Apelurile API din cont: cine, ce, când, de unde",
      "Metricile CPU și de memorie ale instanțelor",
      "Logurile scrise de aplicația ta în stdout",
      "Costurile pe servicii, actualizate zilnic"], a: 0,
      e: "CloudTrail = audit al acțiunilor pe resursele AWS, util în investigații de securitate. CloudWatch = metrici, loguri, alarme." },
    { id: "aws-07", q: "Ce rezolvă combinația SNS + SQS (fan-out)?", o: [
      "Un eveniment ajunge în mai multe cozi independente",
      "Reduce costul stocării mesajelor vechi, mutându-le în S3",
      "Înlocuiește baza de date pentru datele de tip eveniment",
      "Asigură ordine globală a mesajelor între toate cozile"], a: 0,
      e: "Echivalentul unui fanout exchange: notificări, audit și indexare consumă același eveniment, fiecare în ritmul lui, cu consumatorii lui." }
  ]);

  Q("graphql", [
    { id: "gql-01", q: "Un resolver de câmp face un query DB pentru fiecare element dintr-o listă. Ce problemă e și cum o rezolvi?", o: [
      "N+1 query-uri; DataLoader le grupează într-un singur query",
      "Over-fetching; adaugi paginare pe câmpul de listă",
      "Deadlock; muți query-ul într-o tranzacție",
      "CORS; configurezi header-ele de pe endpoint-ul GraphQL"], a: 0,
      e: "DataLoader colectează cheile cerute în același tick și face un `WHERE id IN (...)`, cu cache per request." },
    { id: "gql-02", q: "Care e un risc de securitate specific GraphQL?", o: [
      "Query-uri adânc imbricate care epuizează serverul (DoS)",
      "Imposibilitatea de a folosi HTTPS pe un endpoint unic",
      "SQL injection imposibil de prevenit în resolvers",
      "Lipsa suportului pentru autentificare cu token-uri"], a: 0,
      e: "Ex.: `user { friends { friends { friends ... } } }`. Limitezi adâncimea, complexitatea și timpul; plus autorizare per câmp și obiect, paginare obligatorie, rate limit pe cost, persisted queries." },
    { id: "gql-03", q: "Principalul avantaj GraphQL față de REST pentru un frontend complex?", o: [
      "Clientul cere exact câmpurile de care are nevoie",
      "Serverul e mereu mai rapid decât unul REST echivalent",
      "Caching HTTP mai simplu, pentru că totul e pe un URL",
      "Nu are nevoie de schemă, deci API-ul evoluează liber"], a: 0,
      e: "Poate agrega mai multe resurse într-un singur drum. Costul: complexitate pe server (N+1, costul query-urilor, caching mai greu). REST rămâne bun pentru API-uri simple, publice, cache-uibile." },
    { id: "gql-04", q: "Cum evoluezi de obicei o schemă GraphQL?", o: [
      "Adaugi câmpuri și le marchezi pe cele vechi `@deprecated`",
      "Creezi `/graphql/v2` la fiecare schimbare incompatibilă",
      "Ștergi imediat câmpurile vechi, ca schema să rămână curată",
      "Schema nu se poate schimba după publicare"], a: 0,
      e: "Fără versiuni /v2: clienții cer explicit câmpurile, deci adăugarea nu strică nimic. Monitorizezi folosirea câmpurilor depreciate înainte să le scoți." },
    { id: "gql-05", q: "Unde faci autorizarea într-un API GraphQL multi-tenant?", o: [
      "În resolvers / logica de business, per obiect sau câmp",
      "Doar în gateway, la intrarea în endpoint",
      "Nicăieri: schema e publică, deci datele sunt publice",
      "Doar în frontend, care ascunde câmpurile nepermise"], a: 0,
      e: "Un singur endpoint expune tot graful; un user autentificat nu trebuie să poată traversa spre datele altui tenant." },
    { id: "gql-06", q: "Ce sunt mutations în GraphQL?", o: [
      "Operații de scriere, executate secvențial",
      "Query-uri cache-uite pe server, pentru performanță mai bună",
      "Notificări în timp real prin WebSocket",
      "Schimbări de schemă aplicate la runtime"], a: 0,
      e: "Queries = citire (câmpurile pot rula în paralel), mutations = scriere (în serie), subscriptions = flux de evenimente." },
    { id: "gql-07", q: "Ce bibliotecă Python construiește schema GraphQL din clase cu type hints (code-first) și se integrează cu FastAPI?", o: ["Strawberry", "Ariadne", "Marshmallow", "Graphene"], a: 0,
      e: "Strawberry e code-first, cu type hints și dataclasses. Ariadne e schema-first (SDL), Graphene e alternativa code-first mai veche, fără type hints, iar Marshmallow face serializare și validare, nu GraphQL." }
  ]);

  Q("ops", [
    { id: "obs-01", q: "Latența medie e 120 ms, dar userii se plâng de lentoare. Ce metrică te ajută mai mult?", o: [
      "Percentilele (p95, p99): media ascunde coada distribuției",
      "Media calculată pe o fereastră de timp mai mare",
      "Numărul de servere active din spatele load balancer-ului",
      "CPU-ul mediu al clusterului în ultima oră"], a: 0,
      e: "Dacă 1% din request-uri durează 5 s, media arată bine. p99 surprinde experiența celor mai afectați useri." },
    { id: "obs-02", q: "Metrici vs loguri vs trace-uri?", o: [
      "Metrici: agregate; loguri: evenimente; trace: drumul unui request",
      "Sunt aceleași date, stocate în trei formate, pentru trei unelte",
      "Trace-urile sunt doar logurile de eroare, cu stack trace-ul lor",
      "Metricile sunt loguri comprimate, păstrate o perioadă mai lungă"], a: 0,
      e: "Metricile (valori agregate în timp) spun CĂ e o problemă, trace-urile (pașii unui request prin servicii, cu durate) UNDE, logurile (evenimente cu context) DE CE." },
    { id: "obs-03", q: "Ce înseamnă RED?", o: [
      "Rate, Errors, Duration, pentru fiecare serviciu",
      "Redis, Elastic, Docker: stack-ul de monitorizare",
      "Read, Execute, Delete: permisiunile pe metrici",
      "Retry, Escalate, Deploy: pașii unui incident"], a: 0,
      e: "Pentru resurse: USE (Utilization, Saturation, Errors). Pentru cozi: adâncimea și vârsta celui mai vechi mesaj." },
    { id: "obs-04", q: "Ce îți arată concret New Relic APM într-o investigație de latență?", o: [
      "Unde se duce timpul pe tranzacție: cod, DB, apeluri externe",
      "Doar uptime-ul serverelor și alertele de disponibilitate",
      "Doar logurile brute, fără agregare pe tranzacții",
      "Doar costurile din AWS, împărțite pe servicii"], a: 0,
      e: "Plus query-urile lente, trace-uri distribuite și erori. Vezi direct dacă endpoint-ul lent stă într-un query (N+1, index lipsă) sau într-un apel extern." },
    { id: "obs-05", q: "De ce loguri structurate (JSON) cu correlation ID?", o: [
      "Le filtrezi ușor și urmărești un request prin servicii",
      "Ocupă mereu mai puțin spațiu pe disc decât logurile text simple",
      "Sunt cerute de modulul `logging` începând cu Python 3.8",
      "Sunt mai ușor de citit cu ochiul liber, direct în terminal"], a: 0,
      e: "Propagi ID-ul în headerele task-ului Celery și în contextul logger-ului, ca să urmărești API → coadă → worker. Fără date sensibile în loguri." },
    { id: "obs-06", q: "În GitLab CI, diferența dintre `cache` și `artifacts`?", o: [
      "`cache` accelerează; `artifacts` transmit rezultate între joburi",
      "Sunt identice; `artifacts` e doar numele vechi al lui `cache`",
      "`artifacts` e doar pentru imaginile Docker construite în pipeline",
      "`cache` e permanent și garantat între pipeline-uri și branch-uri"], a: 0,
      e: "Cache-ul (ex. pip) n-are garanții, deci nu te bazezi pe el pentru corectitudine. Artifacts sunt descărcabile și trec la joburile următoare; rapoartele de teste (JUnit) și coverage apar în merge request." },
    { id: "obs-07", q: "Cum rulezi testele cu un Postgres real în GitLab CI?", o: [
      "Cu `services: [postgres:17]` în job",
      "Instalezi manual Postgres pe runner la fiecare rulare",
      "Nu se poate; în CI folosești doar SQLite",
      "Mock-uiești tot SQL-ul, ca testele să nu depindă de DB"], a: 0,
      e: "Aplicația se conectează la hostname-ul serviciului, ca în compose. Alternativ testcontainers, dacă runner-ul permite Docker." },
    { id: "obs-08", q: "Ce face `needs:` într-un job GitLab CI?", o: [
      "Declară dependențe directe între joburi (DAG)",
      "Instalează pachetele de sistem de care are nevoie jobul",
      "Definește variabilele secrete transmise jobului",
      "Repornește automat jobul de câte ori e nevoie la eșec"], a: 0,
      e: "Jobul pornește când termină joburile de care depinde, fără să aștepte tot stage-ul anterior. Scurtează pipeline-urile. `rules:` decide dacă jobul rulează (branch, merge request, fișiere schimbate)." },
    { id: "obs-09", q: "Ce e un SLO?", o: [
      "O țintă internă: de ex. 99,9% din request-uri sub 300 ms",
      "Contractul legal cu clientul, cu penalități dacă nu e respectat",
      "Un tip de log structurat pentru erorile de serviciu",
      "Un dashboard Grafana cu starea tuturor serviciilor din producție"], a: 0,
      e: "SLI = măsura, SLO = ținta (de ex. pe 30 de zile), SLA = angajamentul contractual. Error budget = cât îți permiți să ratezi." }
  ]);

  Q("linux", [
    { id: "lx-01", q: "Diferența dintre `kill -15` și `kill -9`?", o: [
      "SIGTERM poate fi tratat de proces; SIGKILL nu",
      "Sunt identice, diferă doar numărul semnalului trimis",
      "`-9` oprește grațios procesul, `-15` îl oprește imediat",
      "`-15` repornește procesul, `-9` îl oprește definitiv"], a: 0,
      e: "Orchestratoarele trimit întâi SIGTERM, apoi SIGKILL după perioada de grație. Aplicația trebuie să trateze SIGTERM: termină request-urile în curs, închide conexiunile." },
    { id: "lx-02", q: "Cum afli ce proces ascultă pe portul 8000?", o: [
      "`ss -tlnp | grep 8000` sau `lsof -i :8000`",
      "`ps aux | grep 8000`, care arată și porturile",
      "`df -h | grep 8000`, care listează resursele ocupate",
      "`ping localhost:8000`, care răspunde cu PID-ul"], a: 0,
      e: "`ss -tlnp` listează socket-urile TCP în ascultare, cu procesul. `ps` nu știe de porturi; `ping` nu folosește porturi." },
    { id: "lx-03", q: "Top 5 IP-uri dintr-un access log (IP-ul pe prima coloană)?", o: [
      "`awk '{print $1}' access.log | sort | uniq -c | sort -rn | head -5`",
      "`awk '{print $1}' access.log | uniq -c | sort -rn | head -5`",
      "`awk '{print $1}' access.log | sort -u | uniq -c | sort -rn | head -5`",
      "`awk '{print $1}' access.log | sort | uniq -c | sort -n | head -5`"], a: 0,
      e: "`uniq -c` numără doar liniile consecutive identice, deci sortezi întâi. Apoi sortezi numeric descrescător după contor (`sort -rn`). `sort -u` ar elimina repetițiile înainte de numărare, iar `sort -n` ar pune primele IP-urile cele mai rare." },
    { id: "lx-04", q: "Un serviciu Python aruncă „Too many open files”. Cauza probabilă și verificarea?", o: [
      "Leak de descriptori sau `ulimit -n` mic; verifici cu `lsof -p PID`",
      "Discul e plin și nu se mai pot crea fișiere; verifici cu `df -h`",
      "Prea multe threaduri Python; verifici cu `top`",
      "Lipsă de RAM pentru buffere; verifici cu `free -m`"], a: 0,
      e: "Fiecare fișier și fiecare conexiune (HTTP, DB) ocupă un descriptor. Cauza tipică: clienți creați per request și neînchiși. Soluții: context managers și pool-uri." },
    { id: "lx-05", q: "Ce înseamnă `chmod 640 config.yaml`?", o: [
      "Owner: citire și scriere; grup: citire; ceilalți: nimic",
      "Toți utilizatorii: citire și scriere, fără execuție",
      "Owner: execuție; grup: scriere; ceilalți: citire",
      "Doar root poate citi și modifica fișierul"], a: 0,
      e: "Cifre octale: 4 = r, 2 = w, 1 = x. 6 = rw, 4 = r, 0 = nimic." },
    { id: "lx-06", q: "Pe ce mecanisme ale kernelului Linux se bazează containerele?", o: [
      "Namespaces (izolare) și cgroups (limite de resurse)",
      "Mașini virtuale complete, fiecare cu kernelul propriu",
      "Doar chroot, care schimbă directorul rădăcină",
      "Un hypervisor ușor, integrat direct în Docker Engine"], a: 0,
      e: "Namespaces izolează PID-uri, rețea, mount-uri; cgroups limitează CPU și memorie. Un container e un proces Linux izolat care partajează kernelul gazdei, de aceea pornește în milisecunde." },
    { id: "lx-07", q: "Un container se oprește cu exit code 137. Ce înseamnă de obicei?", o: [
      "A primit SIGKILL (128 + 9), adesea de la OOM killer",
      "O eroare de sintaxă în codul Python la pornire",
      "Imaginea Docker a fost ștearsă din registry-ul privat",
      "Portul e deja ocupat de alt container de pe aceeași mașină"], a: 0,
      e: "A depășit limita de memorie. Verifici `docker inspect` (OOMKilled: true) sau evenimentele Kubernetes, apoi memoria procesului (leak, fișiere încărcate integral în RAM)." }
  ]);
})(window.PREP);
