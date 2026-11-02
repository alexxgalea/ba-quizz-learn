<!-- ASGI, Uvicorn, Gunicorn, FastAPI. Variantele greșite: B, C, D = ordinea din sursă (A e cea corectă). -->

### asgi-01
Pe scurt: Un proces Uvicorn rulează un singur event loop, pe un singur core; Gunicorn pornește și supraveghează mai multe astfel de procese worker.
Scop: Vrei să folosești toate core-urile mașinii și să ai cine reporni un worker care crapă sau se blochează.
Mecanism: Gunicorn e un manager de procese (modelul pre-fork): procesul master pornește N workeri, îi urmărește, îi repornește dacă mor și îi oprește grațios la deploy. Cu clasa de worker Uvicorn, fiecare worker rulează propriul event loop și aplicația ASGI.
Pas cu pas:
```text
gunicorn master
  ├ worker 1: event loop Uvicorn
  ├ worker 2: event loop Uvicorn
  ├ worker 3: event loop Uvicorn
  └ worker 4: event loop Uvicorn
worker crapă -> masterul pornește altul
```
Aplicare:
```text
gunicorn app.main:app -w 4 \
  -k uvicorn.workers.UvicornWorker
```
În versiunile recente de Uvicorn, aceeași clasă de worker vine din pachetul separat `uvicorn-worker`.
Legătură: E același rol pe care Gunicorn îl are la Django cu workeri sync: managerul de procese rămâne, se schimbă doar tipul de worker.
Limită: În containere, o alternativă des folosită e un singur proces Uvicorn per container, cu replici gestionate de orchestrator (Docker Swarm, Kubernetes). Atunci orchestratorul face rolul lui Gunicorn.
La interviu: „Un proces Uvicorn înseamnă un event loop pe un core. Gunicorn pornește N workeri Uvicorn, îi repornește la crash și face reload grațios. În containere pot rula și un singur proces Uvicorn per container, cu replici din orchestrator.”
Verificare: Rulezi un singur `uvicorn app:app` pe o mașină cu 8 core-uri, iar CPU-ul total nu trece de 12%. Ce se întâmplă?
Răspuns verificare: Un singur proces folosește cam un core, adică o optime din mașină; restul stă nefolosit. Pornești mai mulți workeri sau mai multe replici.
Varianta greșită B: Aplicația e asincronă prin felul în care e scrisă (`async def`) și prin Uvicorn. HTTPS-ul îl face de obicei Nginx sau load balancer-ul.
Varianta greșită C: Uvicorn acceptă singur conexiuni HTTP, fără nimic în față. În combinația asta, Gunicorn doar gestionează procesele.
Varianta greșită D: Fiecare worker are în continuare GIL-ul lui. Paralelismul vine din faptul că sunt procese separate, nu din eliminarea GIL-ului.

### asgi-03
Pe scurt: `requests` e sincron: cât așteaptă răspunsul, blochează event loop-ul, deci toate request-urile acelui worker stau.
Scop: E bug-ul tipic într-un serviciu FastAPI: merge perfect local, iar sub încărcare latența explodează.
Mecanism: Un endpoint `async def` rulează direct pe event loop. `requests.get` nu face `await`: ține threadul blocat până vine răspunsul. Cât timp stă, loop-ul nu poate servi niciun alt request al acelui worker.
Pas cu pas:
```text
req 1: requests.get -> loop blocat 800 ms
req 2..50: așteaptă loop-ul
=> latențele se adună, nu se suprapun
```
Aplicare:
```python
@app.get("/report")
async def report():
    async with httpx.AsyncClient() as c:
        r = await c.get(STATS_URL, timeout=5)
    return summarize(r.json())
```
Alternativ: declari endpointul cu `def`, ca să ruleze în threadpool, sau muți apelul cu `await asyncio.to_thread(...)`.
Legătură: E exact GIL-04 (`time.sleep` într-un `async def`), într-un endpoint real.
Limită: Un `AsyncClient` nou la fiecare request deschide mereu conexiuni noi; în producție creezi unul la pornire (în `lifespan`) și îl refolosești. Iar dacă `summarize` e un calcul greu, blochează și el loop-ul.
La interviu: „`requests` e sincron, deci într-un `async def` blochează event loop-ul și toate request-urile workerului așteaptă. Folosesc `httpx.AsyncClient` cu `await`, declar endpointul cu `def` ca să ruleze în threadpool sau mut apelul cu `asyncio.to_thread`.”
Verificare: Schimbi doar `async def report()` în `def report()` și păstrezi `requests`. Mai e problemă?
Răspuns verificare: Nu mai blochezi loop-ul: FastAPI rulează endpointurile `def` în threadpool. Limita devine threadpool-ul, implicit 40 de apeluri simultane.
Varianta greșită B: FastAPI nu analizează ce biblioteci folosești. Doar endpointurile declarate cu `def` ajung în threadpool.
Varianta greșită C: Un endpoint `async def` poate returna un dict: FastAPI îl serializează în JSON.
Varianta greșită D: `summarize` e o funcție obișnuită, nu o corutină, deci nu are nevoie de `await`. Problema e apelul blocant dinaintea ei.

### asgi-04
Pe scurt: ASGI e o interfață asincronă între server și aplicație, care suportă și conexiuni lungi (WebSockets); WSGI e una sincronă, cu un apel per request.
Scop: Clarifici că sunt contracte, nu servere, și știi când contează alegerea.
Mecanism: WSGI definește aplicația ca o funcție apelată o dată per request, care întoarce răspunsul; cât rulează, ocupă un thread sau un proces. ASGI definește aplicația ca o corutină care primește și trimite mesaje (`receive`, `send`), deci poate ține deschise conexiuni lungi și poate servi multe request-uri pe același thread.
Pas cu pas:
```text
WSGI: app(environ, start_response)
  Gunicorn sync + Django/Flask
ASGI: await app(scope, receive, send)
  Uvicorn + FastAPI/Starlette
  HTTP, WebSocket, lifespan
```
Aplicare: Mult I/O concurent, WebSockets sau streaming: ASGI. CRUD clasic, cu drivere sincrone: WSGI rămâne o alegere bună.
Legătură: Un proiect Django vine cu ambele fișiere: `wsgi.py` pentru Gunicorn și `asgi.py` pentru servere ca Uvicorn sau Daphne. FastAPI e construit pe ASGI de la început.
Limită: ASGI nu face codul mai rapid: un request CPU-bound durează la fel. Câștigul apare când ai multe operații I/O concurente și biblioteci cu adevărat async.
La interviu: „WSGI și ASGI sunt contracte între server și aplicație. WSGI e sincron, un apel per request; ASGI e asincron și suportă și conexiuni lungi, ca WebSockets. ASGI ajută la mult I/O concurent, nu face automat codul mai rapid.”
Verificare: Vrei notificări live prin WebSockets într-o aplicație Django. Ce interfață îți trebuie?
Răspuns verificare: ASGI: WSGI nu poate ține deschisă o conexiune bidirecțională. Rulezi Django prin `asgi.py`, cu Uvicorn sau Daphne, plus Django Channels pentru WebSockets.
Varianta greșită B: Ambele sunt specificații, nu servere sau framework-uri. Serverele (Gunicorn, Uvicorn) și framework-urile (Django, FastAPI) le implementează.
Varianta greșită C: Async nu e automat mai rapid. Pentru munca CPU-bound sau cu drivere sincrone poate fi chiar mai lent.
Varianta greșită D: WSGI e folosit pe scară largă în producție, de exemplu de Django și Flask cu Gunicorn.

### asgi-05
Pe scurt: După `--timeout` (implicit 30 s), masterul consideră workerul blocat, îl omoară și pornește altul; clientul primește o eroare.
Scop: Explici de unde vin erorile 502 și mesajele „WORKER TIMEOUT” din loguri și de ce munca lungă nu are ce căuta în request.
Mecanism: Workerul sync servește un singur request odată și anunță periodic masterul că e viu. Dacă un request îl ține ocupat peste `--timeout` secunde, masterul îl omoară și pornește un worker nou. Request-ul în curs se pierde.
Pas cu pas:
```text
t=0   workerul primește request-ul
t=30  masterul: „WORKER TIMEOUT”
      -> omoară workerul
      -> pornește un worker nou
client: 502 de la proxy sau conexiune închisă
```
Aplicare: Muți munca lungă într-o coadă (Celery) și răspunzi 202 cu un id de job. Pentru request-uri legitime puțin mai lungi crești `--timeout`, dar și timeout-urile din Nginx sau din load balancer.
Legătură: E aceeași problemă ca la CEL-01: un task de minute în request blochează un worker și se lovește de timeout-uri.
Limită: La workerii async (Uvicorn), timeout-ul nu se leagă de durata request-ului: workerul e omorât doar dacă event loop-ul e blocat și nu mai poate anunța masterul.
La interviu: „Un worker sync servește un request odată. Dacă depășește `--timeout`, implicit 30 de secunde, masterul îl omoară și pornește altul, iar clientul primește eroare. Munca lungă o mut într-o coadă și răspund 202.”
Verificare: Crești `--timeout` la 120 s și problema dispare. Ce cost ascuns are asta, cu 4 workeri sync?
Răspuns verificare: Patru request-uri lente pot ocupa toți workerii până la 2 minute, iar restul utilizatorilor așteaptă. Ai ascuns simptomul, dar munca lungă e tot în request.
Varianta greșită B: Un worker sync nu servește alte request-uri cât așteaptă: e ocupat cu unul singur până la final.
Varianta greșită C: Gunicorn nu are cozi de task-uri și nu răspunde singur 202. E o decizie de arhitectură, pe care o implementezi tu, de exemplu cu Celery.
Varianta greșită D: Masterul nu schimbă tipul workerului: îl omoară și pornește altul de același tip.

### asgi-06
Pe scurt: Reverse proxy-ul face TLS, servește fișierele statice și preia clienții lenți (buffering), ca workerii aplicației să primească doar request-uri complete.
Scop: Explici de ce Gunicorn nu e expus direct în internet și ce câștigi cu Nginx sau cu un load balancer în față.
Mecanism: Nginx citește tot request-ul de la client, oricât de încet vine, și abia apoi îl trimite lui Gunicorn. La fel, preia răspunsul complet și îl livrează clientului în ritmul acestuia. Așa, un worker sync nu stă blocat după o conexiune proastă. În plus, Nginx terminează TLS, servește `/static` direct de pe disc și distribuie traficul între instanțe.
Pas cu pas:
```text
client lent -> Nginx (bufferează)
Nginx -> Gunicorn: request complet
Gunicorn -> Nginx -> client
/static/* -> direct din Nginx
```
Aplicare:
```text
location /static/ { alias /app/static/; }
location / {
  proxy_pass http://app:8000;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```
Legătură: E rolul unui Ingress în Kubernetes sau al unui Nginx ori Traefik în fața serviciilor dintr-un Docker Swarm.
Limită: Proxy-ul trebuie să transmită datele originale ale clientului (`X-Forwarded-For`, `X-Forwarded-Proto`), iar aplicația trebuie să aibă încredere doar în proxy-ul ei. Altfel, IP-urile din loguri și redirect-urile spre HTTPS ies greșit.
La interviu: „Nginx sau load balancer-ul face TLS, servește fișierele statice și bufferează clienții lenți, ca un worker sync să nu stea blocat după o conexiune proastă. În plus, distribuie traficul între instanțe.”
Verificare: Expui direct în internet un Gunicorn cu 4 workeri sync, iar 4 clienți de pe o conexiune mobilă slabă încarcă încet fișiere mari. Ce pățesc ceilalți utilizatori?
Răspuns verificare: Așteaptă: toți cei 4 workeri sunt ocupați să citească încet upload-urile. Cu Nginx în față, workerii primesc request-urile abia când sunt complete.
Varianta greșită B: Nginx nu rulează cod Python și nu are cache de bytecode. Accelerează transportul, nu execuția.
Varianta greșită C: Nginx nu rulează aplicația Python: trimite request-urile mai departe la Gunicorn sau Uvicorn, care o execută.
Varianta greșită D: Proxy-ul nu schimbă interfața aplicației: WSGI rămâne WSGI. Nginx vorbește doar HTTP cu serverul din spatele lui.

### asgi-07
Pe scurt: Creează o sesiune DB pentru fiecare request și o închide la final, chiar dacă endpointul aruncă excepție.
Scop: Vrei ca fiecare request să aibă propria sesiune și ca nicio conexiune să nu rămână deschisă, indiferent cum se termină request-ul.
Mecanism: FastAPI rulează `get_db` până la `yield` și injectează valoarea în endpoint. După ce endpointul termină sau aruncă, FastAPI reia generatorul: rulează blocul `finally`, care închide sesiunea și returnează conexiunea în pool.
Pas cu pas:
```text
request -> get_db(): SessionLocal()
yield db -> list_alerts(db) rulează
endpoint gata sau excepție
-> finally: db.close()
-> conexiunea revine în pool
```
Aplicare: În teste înlocuiești dependența, ca endpointul să folosească o sesiune de test fără să-i schimbi codul: `app.dependency_overrides[get_db] = lambda: test_session`.
Legătură: E echivalentul unui `with Session() as s:` în jurul fiecărui request. În Django, framework-ul gestionează singur conexiunea per request.
Limită: Sesiunea trăiește doar cât request-ul. Unui background task sau task Celery îi dai id-uri, iar el își deschide propria sesiune. Momentul exact s-a schimbat între versiuni: din FastAPI 0.118, codul de după `yield` rulează după ce răspunsul a fost trimis (implicit `scope="request"`); cu `Depends(get_db, scope="function")` (0.121+) rulează înainte. Dacă prinzi o excepție în dependență, o ridici din nou.
La interviu: „O dependență cu `yield` face setup înainte de `yield` și cleanup după. Cu `try`/`finally`, fiecare request primește propria sesiune, închisă chiar și la eroare. În teste o înlocuiesc cu `dependency_overrides`.”
Verificare: Scoți `try`/`finally` și lași doar `yield db`, urmat de `db.close()`. Ce se întâmplă când endpointul aruncă excepție?
Răspuns verificare: Excepția e aruncată în generator, la `yield`, deci `db.close()` nu mai rulează: sesiunea rămâne deschisă până o colectează garbage collector-ul. De aceea e nevoie de `finally`.
Varianta greșită B: Streamingul se face cu `StreamingResponse`. Aici `yield` doar împarte dependența în setup și cleanup.
Varianta greșită C: `yield`-ul din dependență nu schimbă tipul endpointului: un `def` rulează tot în threadpool.
Varianta greșită D: `get_db` e apelată la fiecare request, deci fiecare primește sesiunea lui. O sesiune globală, partajată, e tocmai ce vrei să eviți.

### asgi-08
Pe scurt: FastAPI validează body-ul cu Pydantic înainte să-ți apeleze funcția și, dacă nu se potrivește, răspunde automat 422 cu lista erorilor.
Scop: Codul endpointului lucrează doar cu date valide, iar clientul află exact ce câmp e greșit, fără ca tu să scrii validare manuală.
Mecanism: FastAPI citește type hint-ul parametrului (`a: AlertIn`) și construiește modelul Pydantic din JSON-ul primit. Dacă validarea eșuează, handler-ul implicit răspunde 422 Unprocessable Entity, cu câmpul și mesajul fiecărei erori. Funcția ta nu e apelată.
Pas cu pas:
```text
POST /alerts {"severity": "mare"}
Pydantic: severity trebuie să fie int
-> 422, detail: loc ["body", "severity"]
funcția create() nu rulează
```
Aplicare:
```python
class AlertIn(BaseModel):
    title: str = Field(min_length=3)
    severity: int = Field(ge=1, le=5)

@app.post("/alerts", status_code=201)
def create(a: AlertIn): ...
```
Legătură: E echivalentul unui serializer DRF cu `is_valid(raise_exception=True)`, doar că DRF răspunde 400, iar FastAPI 422.
Limită: Validarea acoperă forma datelor, nu regulile de business care cer DB, de exemplu „titlul e unic”. Pe acelea le verifici în cod și întorci tu eroarea potrivită, de exemplu 409.
La interviu: „FastAPI validează body-ul cu Pydantic înainte de funcție: la date invalide răspunde automat 422 cu erorile pe câmpuri, iar endpointul nu rulează. Același model generează și schema OpenAPI.”
Verificare: Clientul trimite `"severity": "3"`, ca string, iar modelul are `severity: int`. Ce se întâmplă implicit în Pydantic v2?
Răspuns verificare: Trece: în modul implicit (lax), Pydantic convertește stringul `"3"` în 3. Dacă vrei să-l refuzi, activezi modul strict (`strict=True`), iar atunci răspunsul e 422.
Varianta greșită B: FastAPI nu completează câmpurile invalide cu valori implicite: oprește request-ul înainte de funcție.
Varianta greșită C: O eroare de validare nu e o eroare de server: e o problemă a clientului, deci primește un cod 4xx (422), nu 500.
Varianta greșită D: FastAPI nu ignoră câmpurile invalide: orice eroare de validare oprește request-ul cu 422.

### asgi-09
Pe scurt: Pornești de la 2 × core + 1, adică 9 workeri pe 4 core-uri, apoi ajustezi după măsurători sub încărcare.
Scop: Vrei un punct de plecare argumentat, nu un număr ales la întâmplare, și să știi ce măsori ca să-l ajustezi.
Mecanism: Un worker sync servește un request odată, iar o parte din timp așteaptă după DB sau rețea, fără să folosească CPU-ul. Cu ceva mai mulți workeri decât core-uri, cât unii așteaptă, alții calculează. Formula din documentația Gunicorn, (2 × core) + 1, pornește de la acest echilibru.
Pas cu pas:
```text
4 core-uri -> 2 × 4 + 1 = 9 workeri
test de încărcare: latență, CPU, memorie
CPU ~100% -> nu mai adaugi workeri
CPU mic, cereri la coadă -> adaugi
```
Aplicare: Pornești cu `gunicorn app.wsgi -w 9`, apoi rulezi un test de încărcare (de exemplu cu locust sau k6) și urmărești latența p95, CPU-ul și memoria. Fiecare worker e un proces cu toată aplicația încărcată în memorie.
Legătură: În Docker Swarm, totalul e numărul de workeri per container înmulțit cu numărul de replici, iar socoteala de CPU și memorie o faci pe fiecare nod.
Limită: Formula e pentru workeri sync. Cu workeri async (Uvicorn) pornești de obicei de la un worker pe core, pentru că un event loop servește deja multe request-uri concurente.
La interviu: „Pornesc de la formula din documentația Gunicorn, (2 × core) + 1, adică 9 pe 4 core-uri, pentru că workerii sync așteaptă des după I/O. Apoi ajustez după un test de încărcare, urmărind latența, CPU-ul și memoria.”
Verificare: Ai 9 workeri, iar sub încărcare CPU-ul stă la 100% și latența crește. Ajută să treci la 20 de workeri?
Răspuns verificare: Nu: CPU-ul e deja plin, iar workerii în plus adaugă doar memorie și comutări între procese. Cauți ce consumă CPU sau adaugi mașini.
Varianta greșită B: GIL-ul e per proces, iar workerii Gunicorn sunt procese separate, fiecare cu GIL-ul lui. Cu un singur worker ai servi un singur request odată.
Varianta greșită C: Prea mulți workeri consumă memorie și timp de comutare, fără throughput în plus. 400 de procese pe 4 core-uri înrăutățesc latența.
Varianta greșită D: Workerii sync sunt procese, nu threaduri, și nu există vreo regulă cu „4 threaduri obligatoriu”. Gunicorn are și workeri `gthread`, dar e o alegere separată.

### asgi-11
Pe scurt: Uvicorn e un server ASGI: deschide portul, acceptă conexiuni HTTP, rulează event loop-ul și apelează aplicația FastAPI.
Scop: Separi clar rolurile: FastAPI e framework-ul (rutare, validare), Uvicorn e serverul care îl rulează, iar Nginx e proxy-ul din față.
Mecanism: Uvicorn ascultă pe un port, transformă bytes-ii HTTP în cereri și apelează aplicația prin interfața ASGI: `await app(scope, receive, send)`. Răspunsul primit prin `send` îl transformă înapoi în bytes HTTP și îl trimite clientului.
Pas cu pas:
```text
client -> TCP :8000 -> Uvicorn
Uvicorn: parsează HTTP -> scope
await app(scope, receive, send)
FastAPI: rutare, validare, handler
send -> Uvicorn -> răspuns HTTP
```
Aplicare: Local rulezi `uvicorn app.main:app --reload`. În producție renunți la `--reload` și îl rulezi sub Gunicorn sau câte un proces per container, cu Nginx sau un load balancer în față.
Legătură: Corespondentul din lumea Django/WSGI e Gunicorn cu workeri sync: serverul care rulează aplicația, separat de framework.
Limită: Uvicorn e un singur proces cu un singur event loop, deci folosește un singur core. Pentru mai multe core-uri rulezi mai multe procese.
La interviu: „Uvicorn e serverul ASGI: acceptă conexiunile, parsează HTTP și apelează aplicația FastAPI prin interfața ASGI. FastAPI e framework-ul, iar în față am de obicei Nginx sau un load balancer.”
Verificare: Rulezi `python main.py`, unde `main.py` doar definește `app = FastAPI()`. Pornește vreun server?
Răspuns verificare: Nu: ai creat doar obiectul aplicației. Ai nevoie de un server care s-o ruleze, de exemplu `uvicorn main:app` sau `uvicorn.run(app)` în cod.
Varianta greșită B: Framework-ul e FastAPI, construit pe Starlette. Uvicorn nu are rutare sau validare: doar rulează aplicația.
Varianta greșită C: Uvicorn n-are legătură cu baza de date. Ca ORM async folosești, de exemplu, SQLAlchemy cu asyncpg.
Varianta greșită D: Reverse proxy-ul stă în fața lui Uvicorn. Uvicorn poate face și TLS, dar de obicei îl lași pe seama proxy-ului.
