<!-- Desfășurările fișei `asgi` (10 puncte). Format și reguli: lib.mjs (checkDesf), .scratch/desfasurari/spec.md. Faptele: research/interview-facts.md, secțiunile 5, 11 și 23. -->

### harta
Problema: Un API Python trebuie să primească mii de cereri, să folosească toate core-urile și să rămână în picioare când un worker se blochează. Între codul tău și clienți stau însă mai multe straturi, iar fiecare are rolul ei: un contract (WSGI sau ASGI), un manager de procese, un server cu event loop, un proxy și un framework. Dacă le amesteci, ajungi cu apeluri blocante pe event loop, cu prea mulți workeri sau cu un server expus direct în internet. Modulul răspunde la patru întrebări: ce contract vorbesc serverul și aplicația, cine pornește și supraveghează procesele, ce stă în fața lor și cum rulează FastAPI codul tău.

Grupuri:
- 1–2: contractele dintre server și aplicație (WSGI sincron, ASGI async)
- 3–6: procesele: managerul Gunicorn, serverul Uvicorn, cum le combini în producție și câți workeri pornești
- 7: ce stă în fața lor (proxy-ul)
- 8–9: FastAPI: cum rulează endpoint-urile și ce face singur
- 10: contractul cu clientul (metodele HTTP și codurile de status)

### 1
Problema: Muți aplicația Flask de pe serverul de dezvoltare pe Gunicorn, apoi pe alt server. Dacă fiecare server ar cere altă formă de aplicație, ai rescrie codul la fiecare mutare.
Ideea: WSGI (PEP 3333) e contractul dintre server și aplicație. Aplicația e un apelabil `app(environ, start_response)`, chemat o dată per request. Ea apelează `start_response(status, headers)` și întoarce un iterabil de bytes, adică corpul răspunsului. Apelul e sincron: un worker sync servește un singur request odată.
Exemplu:
```python
def app(environ, start_response):
    start_response("200 OK", [])
    return [b"salut"]
def start(status, headers):
    print(status)  # → 200 OK
r = app({}, start)
print(r)  # → [b'salut']
```
Legătură: ASGI-04 și ASGI-01. Django are `wsgi.py`, pe care `gunicorn proiect.wsgi` îl încarcă. Flask folosește același contract.

### 2
Problema: Vrei notificări live în Django, prin WebSocket. Un apel WSGI primește o cerere, întoarce un răspuns și se termină, deci nu poate ține conexiunea deschisă.
Ideea: ASGI e contractul async: aplicația e o corutină `app(scope, receive, send)`. `scope` descrie conexiunea și are un tip: `http`, `websocket` sau `lifespan`. Aplicația citește mesaje cu `await receive()` și trimite cu `await send(...)`. La WebSocket, scope-ul ține cât conexiunea. WSGI și ASGI sunt specificații, nu servere.
Exemplu:
```python
import asyncio as aio
async def app(scope, receive, send):
    print(scope["type"])  # → http
s = {"type": "http"}
aio.run(app(s, 0, 0))
```
Legătură: ASGI-04. FastAPI e ASGI de la început, iar Django are `asgi.py` lângă `wsgi.py`.

### 3
Greu: da
Problema: Un worker se oprește din cauza unui bug, altul se agață într-un request fără sfârșit. Dacă nu le urmărește nimeni, rămâi cu tot mai puțini workeri, până nu mai răspunde niciunul.
Ideea: Gunicorn e un manager de procese, cu model pre-fork. Un proces master (arbiter) pornește N workeri cu `fork` și nu atinge socket-urile clienților. Dacă un worker moare, masterul pornește altul. Un worker tăcut mai mult de `--timeout` secunde (implicit 30) e omorât și înlocuit. Cu `--max-requests N`, un worker se repornește după N requesturi, ca să limiteze scurgerile de memorie (implicit 0, adică oprit).
Exemplu:
```python
import os
codes = []
for n in (7, 8):
    if os.fork() == 0:
        os._exit(n)
    st = os.wait()[1]
    codes.append(os.WEXITSTATUS(st))
print(codes)  # → [7, 8]
```
În C++: Un supervizor POSIX face același lucru: `fork()` pentru fiecare worker și un `waitpid(-1, ...)` care repornește ce a murit. `fork` și `waitpid` sunt API-uri POSIX, nu C++.
Unde nu ține: Un worker nu e un `std::thread`. Thread-urile împart memoria: un segfault într-unul oprește tot procesul, iar o excepție necaptată dintr-un thread cheamă `std::terminate`. Un worker Gunicorn care pică lasă masterul și ceilalți workeri în viață.
Legătură: ASGI-05 și ASGI-01. La Celery, `--max-tasks-per-child` reciclează la fel procesele worker.

### 4
Problema: Pornești un API FastAPI cu `uvicorn app:app` pe 8 core-uri. Sub încărcare, un core e la 100%, iar celelalte șapte stau libere.
Ideea: Uvicorn e un server ASGI: parsează HTTP și apelează aplicația. Un proces rulează un singur event loop, pe un singur thread, deci folosește un singur core. Cu `uvicorn[standard]`, bucla vine din `uvloop` și parserul HTTP din `httptools`; fără ele, din `asyncio` și `h11`. Mai multe core-uri cer mai multe procese.
Exemplu:
```python
from uvicorn import Config
async def app(*a): ...
c = Config(app)
print(c.workers)  # → 1
print(c.loop, c.http)  # → auto auto
```
Legătură: ASGI-11 și punctul 1 din fișa gil: un proces Python execută bytecode pe un singur thread odată.

### 5
Greu: da
Problema: Ai pus API-ul în producție cu un singur `uvicorn`. La fiecare deploy îl oprești și îl pornești, iar clienții primesc erori. Dacă procesul pică noaptea, nimeni nu-l repornește.
Ideea: Varianta clasică e `gunicorn app:app -k uvicorn_worker.UvicornWorker -w N`. Gunicorn ține procesele (restart la crash, reload grațios), iar fiecare worker rulează un Uvicorn cu event loop-ul lui. Modulul `uvicorn.workers` e deprecat, iar clasa vine din pachetul `uvicorn-worker`. Alternativ, `uvicorn --workers N` are propriul manager de procese. În containere, un proces per container, iar replicile le face orchestratorul. Gunicorn are și un worker ASGI propriu (`-k asgi`).
Exemplu:
```text
gunicorn app:app -w 4 \
  -k uvicorn_worker.UvicornWorker
uvicorn app:app --workers 4
```
Legătură: ASGI-01 și ASGI-10. Cu Docker Swarm sau Kubernetes, `replicas` înlocuiește `-w`: orchestratorul repornește containerele pe care Gunicorn le repornea procesele.

### 6
Greu: da
Problema: Pornești un singur worker sync pe o mașină cu 4 core-uri. Cât așteaptă el după baza de date, cererile din spate stau la coadă, deși CPU-ul e liber. Pornești 100 de workeri și mașina își pierde timpul comutând între procese și umplându-se de memorie.
Ideea: Un worker sync servește un singur request odată și așteaptă o parte din timp după I/O. Cu ceva mai mulți workeri decât core-uri, cât timp unii așteaptă, alții calculează. De aici formula (2 × core) + 1 din documentația Gunicorn: 9 workeri pe 4 core-uri. E doar punct de plecare: apoi măsori latența, CPU-ul și memoria sub încărcare.
Exemplu:
```python
def workers(cores):
    return 2 * cores + 1
print(workers(4))  # → 9
```
În C++: La un thread pool pornești tot de la numărul de core-uri, cu `std::thread::hardware_concurrency()`, și urci doar dacă thread-urile așteaptă I/O.
Unde nu ține: `hardware_concurrency()` e doar un indiciu și poate întoarce 0. `os.cpu_count()` poate întoarce `None`. Iar un worker e un proces cu memoria lui, nu un thread: 9 workeri înseamnă 9 copii ale aplicației.
Legătură: ASGI-09. În Docker Swarm, totalul e workeri per container × replici.

### 7
Problema: Expui direct un Gunicorn cu 4 workeri sync. Patru utilizatori de pe rețea mobilă încarcă încet fișiere mari, iar workerii stau ocupați să citească octeți. Toți ceilalți așteaptă.
Ideea: Un reverse proxy (Nginx, HAProxy, un load balancer) stă între clienți și aplicație. Citește tot request-ul, oricât de încet vine, și îl trimite aplicației abia când e complet. Termină TLS și servește fișierele statice de pe disc. Distribuie traficul între instanțe. Gunicorn cere un astfel de proxy pentru workerii sync.
Exemplu:
```text
location /static/ {
  alias /app/static/;
}
location / {
  proxy_pass http://app:8000;
}
```
Legătură: ASGI-06. Rolul ăsta îl are un Ingress în Kubernetes sau Traefik în Docker Swarm.

### 8
Greu: da
Problema: Un endpoint `async def` apelează `requests.get(...)` pe un API care răspunde în 2 secunde. Local merge bine. La 50 de utilizatori, și `/health` începe să răspundă greu, deși nu face nimic.
Ideea: FastAPI rulează un endpoint `async def` direct pe event loop. Un endpoint `def` îl rulează într-un threadpool AnyIO, ca să nu blocheze bucla. La fel și dependențele `def`. Threadpool-ul are implicit 40 de thread-uri, deci cel mult 40 de apeluri `def` în paralel. Un apel blocant într-un `async def` îngheață toate cererile workerului. Cu o bibliotecă blocantă folosești `def`; cu una async, `async def` și `await`.
Exemplu:
```python
import anyio, threading as th
from fastapi.concurrency import (
    run_in_threadpool as pool)
async def main():
    me = th.get_ident()
    t = await pool(th.get_ident)
    print(t == me)  # → False
anyio.run(main)
```
Legătură: ASGI-02 și ASGI-03. GIL-04 e același bug fără FastAPI. Exemplul: `run_in_threadpool` e funcția cu care FastAPI mută un `def` pe alt thread. Punctele 2 și 11 din fișa asyncio arată `to_thread` și alegerea dintre `def` și `async def`.

### 9
Greu: da
Problema: Scrii un endpoint `POST /alerts` și verifici de mână fiecare câmp: tipul, lungimea, intervalul. Apoi descrii aceleași reguli în documentația pentru echipa de frontend, iar cele două copii se strică una față de alta.
Ideea: FastAPI e un strat subțire peste două biblioteci. Starlette dă partea web ASGI: rutare, request și response, middleware, WebSocket. Pydantic dă validarea din type hint-uri. Un body invalid primește 422 automat, iar funcția ta nu e apelată. `Depends` injectează dependențe, iar una cu `yield` face setup înainte și teardown după. Din aceleași type hint-uri FastAPI generează schema OpenAPI și pagina `/docs`.
Exemplu:
```python
from pydantic import BaseModel
class A(BaseModel):
    n: int
print(A(n="3").n)  # → 3
A(n="x")  # ! ValidationError
```
Legătură: ASGI-07, ASGI-08 și ASGI-15. Un serializer DRF cu `is_valid(raise_exception=True)` face aceeași treabă, dar răspunde 400, nu 422.

### 10
Greu: da
Problema: Clientul trimite `POST /payments` și primește un timeout. Nu știe dacă plata s-a făcut. Dacă reîncearcă și s-a făcut, plătește de două ori. Dacă nu reîncearcă și nu s-a făcut, pierde comanda.
Ideea: O metodă safe (GET, HEAD, OPTIONS) nu cere nicio schimbare de stare. Una idempotentă (PUT, DELETE și cele safe) are la a doua cerere același efect ca la prima, deci o poți reîncerca. POST și PATCH nu sunt idempotente. La un POST reîncercabil, clientul trimite `Idempotency-Key` (încă draft IETF), iar serverul întoarce la a doua cerere rezultatul primei. Coduri: 401 credențiale lipsă sau invalide, 403 te știu, dar n-ai voie, 409 conflict cu starea resursei, 422 validare eșuată, 429 rate limit.
Exemplu:
```python
done = {}
def pay(key):
    if key not in done:
        done[key] = len(done) + 1
    return done[key]
print(pay("k1"), pay("k1"))  # → 1 1
```
Legătură: ASGI-17, ASGI-18 și ASGI-19. Un task Celery reîncercat trebuie să fie idempotent din același motiv.
