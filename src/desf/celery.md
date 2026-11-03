<!-- Desfășurările fișei `celery` (12 puncte). Format și reguli: lib.mjs (checkDesf), .scratch/desfasurari/spec.md. Faptele: research/interview-facts.md, secțiunile 12, 26 și 30. Fără C++: modulul nu are echivalent real. Exemplele Python rulează cu Celery 5.6.3 (broker `memory://`, task-uri apelate cu `.apply()` sau doar publicate); ce cere un worker real (ack, prefetch, Beat, visibility timeout, limite de timp) e în blocuri `text`, verificat de mână pe un worker Celery 5.6.3 cu Redis (secțiunea 30). -->

### harta
Problema: O aplicație web face tot în request: trimite email-uri, generează rapoarte, apelează servicii lente. Un request lung ține ocupat un worker web, iar un crash pierde munca fără urmă. Munca mutată pe o coadă aduce alte probleme: mesajul poate rula de două ori sau deloc, workerii se blochează pe task-uri lungi, iar un task periodic poate porni de mai multe ori. Modulul răspunde la cinci întrebări: de ce scoți munca din request, ce se întâmplă când ceva pică, cum ajunge munca la workeri, cum compui și programezi task-uri și cum rulează fiecare task. La final vin capcanele din broker și din mesaj, plus cum îți povestești cazul la interviu.
Grupuri:
- 1: de ce coadă, nu request
- 2–3: ce se întâmplă când pică (retry și confirmarea mesajului)
- 4–5: cum ajunge munca la workeri (prefetch și cozi separate)
- 6–7: cum compui și programezi task-uri (canvas și Beat)
- 8–9: cum rulează un task (pool-uri și limite de timp)
- 10–11: capcanele din broker și din mesaj (visibility timeout, serializer, commit)
- 12: cum povestești cazul tău la interviu

### 1
Problema: Un raport durează 2 minute. Generat în request, ține ocupat un worker web, load balancer-ul taie conexiunea la timeout, iar dacă procesul cade, raportul se pierde.
Ideea: Request-ul publică un mesaj în broker și răspunde imediat cu 202 și un id de job. Un worker Celery îl ia în ritmul lui, cu retry și scalare separată de API. Mesajul stă în broker, deci supraviețuiește unui proces web mort.
Exemplu:
```python
from celery import Celery
app = Celery(
    broker="memory://",
    backend="cache+memory://")
@app.task
def report(rid): return rid
r = report.delay(42)
print(r.state)  # → PENDING
```
Legătură: CEL-01 și CEL-15. Ai făcut deja asta în Django. Starea rămâne `PENDING` până rulează un worker, dar și pentru un id necunoscut.

### 2
Greu: da
Problema: Un task apelează un API extern care pică 3 secunde. Fără retry, raportul lipsește. Cu retry imediat, o mie de task-uri lovesc deodată API-ul care abia și-a revenit.
Ideea: `autoretry_for=(OSError,)` reîncearcă task-ul când apare excepția; implicit nu reîncearcă nimic. `max_retries` (implicit 3) limitează reîncercările, deci task-ul rulează cel mult 1 + 3 ori. `retry_backoff=True` dublează pauza (1, 2, 4, 8 s…, până la `retry_backoff_max`, implicit 600 s), iar `retry_jitter` (implicit `True`) o alege aleatoriu între 0 și valoarea calculată. Pentru control fin: `bind=True` și `raise self.retry(exc=exc, countdown=…)`. Reîncerci doar erori tranzitorii (timeout, 503), nu un input greșit: pică din nou.
Exemplu:
```python
from celery import Celery
a, n = Celery(), []
@a.task(autoretry_for=[OSError])
def f():
    n.append(1)
    raise OSError
f.apply()
print(len(n))  # → 4
```
Legătură: CEL-04. Backoff-ul cu jitter e același tipar ca `urllib3.Retry` și ca retry-ul din design (punctul 4). Cu `.apply()` pauzele sunt ignorate, deci exemplul rulează instant.

### 3
Greu: da
Problema: Containerul unui worker e oprit forțat (`kill -9`) în mijlocul unui export de 10 minute. Implicit, brokerul a primit confirmarea (ack) când a început exportul, deci mesajul a dispărut: exportul nu mai rulează niciodată.
Ideea: Implicit, workerul confirmă mesajul înainte de rulare, deci task-ul început nu se mai repetă, dar o cădere îl pierde. Cu `acks_late=True` confirmă după rulare. Dacă workerul cade, brokerul retrimite mesajul, iar task-ul rulează din nou: poate rula de două ori, deci trebuie să fie idempotent. Dacă moare doar procesul copil care rulează task-ul, mesajul se confirmă oricum, afară de cazul în care activezi `task_reject_on_worker_lost`.
Exemplu:
```text
implicit:
  ack → rulează → cade
  mesajul e șters: pierdut
acks_late:
  rulează → cade
  fără ack: mesajul revine
  rulează a doua oară
```
Legătură: CEL-02, CEL-03 și design, punctul 2. Același compromis ca la RabbitMQ: auto-ack înseamnă at-most-once (RMQ-02). Pe Redis, re-livrarea după o cădere vine abia după `visibility_timeout` (punctul 10).

### 4
Problema: Un worker cu un singur proces primește patru mesaje: un export de 30 de minute și trei task-uri mici. Le rezervă pe toate dinainte. Al doilea worker, liber, nu le poate lua, iar cele trei așteaptă 30 de minute.
Ideea: Prefetch-ul e câte mesaje își rezervă un worker dinainte: `worker_prefetch_multiplier` (implicit 4) înmulțit cu numărul de procese. Pentru task-uri lungi pui 1 și `acks_late=True`: task-ul rulat rămâne neconfirmat, deci workerul nu mai rezervă altele. Cu confirmare timpurie ar mai rezerva unul.
Exemplu:
```text
coada: [lung, a, b, c]
prefetch 4:
  worker 1 ține toate cele 4
  worker 2 stă liber
prefetch 1 + acks_late:
  worker 1 ține doar [lung]
  worker 2 ia a, b, c
```
Legătură: RMQ-03: `basic.qos` face același lucru în RabbitMQ.

### 5
Problema: Email-urile durează o milisecundă, rapoartele zece minute, iar toate stau în aceeași coadă. Când toți workerii rulează rapoarte, un email așteaptă după ele.
Ideea: Fiecare task merge într-o coadă; implicit, în coada `celery`. `task_routes` leagă numele unui task de o coadă, iar workerul alege ce consumă cu `-Q`. Așa scalezi separat: 2 workeri pe `heavy`, 10 pe coada obișnuită.
Exemplu:
```python
from celery import Celery
app = Celery()
app.conf.task_routes = {
    "pdf": {"queue": "heavy"}}
r = app.amqp.router.route
q = r({}, "pdf")["queue"]
print(q.name)  # → heavy
```
Legătură: CEL-08. Workerul pentru `heavy` pornește cu `celery -A proj worker -Q heavy`. E ca în Docker Swarm: servicii separate pentru API și pentru batch.

### 6
Greu: da
Problema: Un import are trei pași: descarcă, parsează, salvează. Dacă task-ul de descărcare pornește parsarea și așteaptă cu `.get()` rezultatul ei, blochează un proces din pool. Când pool-ul se umple, task-urile se așteaptă între ele și apare un deadlock.
Ideea: Compui task-urile fără să aștepți. `chain` le rulează pe rând, iar rezultatul pasului anterior intră ca prim argument în următorul (`.si()` îl ignoră). `group` le rulează în paralel. `chord` e un group urmat de un callback, care primește lista rezultatelor; cere un result backend. Un group legat cu `|` de alt task devine automat chord.
Exemplu:
```python
from celery import *
app = Celery()
@app.task
def inc(a): return a + 1
c = inc.s(1) | inc.s()
c.apply().get()  # → 3
g = group(inc.s(1), inc.s(5))
g.apply().get()  # → [2, 6]
```
Legătură: CEL-09. Seamănă cu `asyncio.gather` urmat de o funcție care primește lista rezultatelor, doar că munca e distribuită pe workeri.

### 7
Problema: Rulezi aceeași aplicație în trei replici, iar fiecare pornește și Beat. La 09:00 raportul zilnic pleacă de trei ori, iar clienții primesc trei email-uri.
Ideea: Beat nu rulează task-uri: la ora din `beat_schedule` trimite un mesaj în broker, iar un worker îl execută. Între instanțe nu există coordonare, deci N instanțe trimit N mesaje. Rulezi exact una, ca serviciu separat, cu o singură replică.
Exemplu:
```text
beat 1: 09:00 → raport în coadă
beat 2: 09:00 → raport în coadă
beat 3: 09:00 → raport în coadă
→ raportul rulează de 3 ori
```
Legătură: CEL-05. E ca un cron pus pe trei servere identice. Pornirea cu `-B`, în procesul workerului, nu se recomandă în producție.

### 8
Greu: da
Problema: Un task face 200 de apeluri HTTP lente și așteaptă rețeaua aproape tot timpul. Pe un worker prefork cu 8 procese rulează doar 8 task-uri deodată, deși CPU-ul e liber. Invers, un task care procesează imagini cere nuclee, nu thread-uri.
Ideea: Pool-ul (`-P`) alege cum rulează workerul task-urile, iar `-c` câte rulează deodată (implicit, numărul de nuclee). `prefork` e implicit: procese separate, fără GIL comun, bune pentru CPU și pentru majoritatea cazurilor. `threads`, `gevent` și `eventlet` sunt pentru task-uri I/O (gevent și eventlet țin sute deodată). `solo` rulează un task odată, în procesul principal. La gevent și eventlet nu merge `soft_time_limit`.
Exemplu:
```text
# I/O: 200 de task-uri deodată
celery -A app worker \
  -P gevent -c 200
# CPU: un proces pe nucleu
celery -A app worker \
  -P prefork -c 4
```
Legătură: CEL-12 și GIL-02. Aceeași regulă ca la GIL: CPU-bound înseamnă procese, I/O-bound înseamnă thread-uri sau asyncio.

### 9
Problema: Un task apelează un serviciu care nu răspunde niciodată. Fără limită, ocupă un proces din pool pe vecie. După câteva ore, toate procesele sunt blocate și nu mai rulează nimic.
Ideea: `soft_time_limit` aruncă `SoftTimeLimitExceeded` în task, care o prinde, face curățenie și iese. `time_limit` e plasa de siguranță: procesul care rulează task-ul e ucis cu forța și înlocuit, iar task-ul nu mai prinde nimic. Soft e mai mic decât hard (60 și 90 s), ca să rămână timp de curățenie.
Exemplu:
```text
soft_time_limit=60  # excepție
time_limit=90       # kill
try:
    run()
except SoftTimeLimitExceeded:
    cleanup()  # ai 30 s
```
Legătură: CEL-13. E ca `--timeout` de la Gunicorn, dar cu avertizare înainte.

### 10
Greu: da
Problema: Programezi un task cu `countdown=7200` (2 ore) pe Redis. Se întâmplă să ruleze de mai multe ori, deși l-ai trimis o singură dată.
Ideea: Redis nu are confirmări ca RabbitMQ: un mesaj neconfirmat în `visibility_timeout` (implicit 1 oră) e redat altui worker. Un task cu ETA sau `countdown` stă neconfirmat în worker până îi vine ora. Peste 1 oră, mesajul revine și rulează din nou, apoi iar. La fel pățește un task cu `acks_late` mai lung de o oră. Ridici `visibility_timeout` peste cel mai lung ETA, folosești RabbitMQ sau ții termenele lungi în baza de date.
Exemplu:
```text
0 h  apply_async(countdown=7200)
1 h  fără ack: mesajul revine
     și e livrat din nou
2 h  la ETA, task-ul rulează
     de mai multe ori
```
Legătură: CEL-10. E aceeași re-livrare ca la `acks_late` (punctul 3). RabbitMQ are o limită asemănătoare, `consumer_timeout` (implicit 30 de minute).

### 11
Greu: da
Problema: View-ul salvează comanda și face `send.delay(order)`. Celery cere JSON, iar un obiect ORM nu se serializează: `EncodeError`. Dacă trimiți `order.id`, task-ul poate porni înainte de commit și nu găsește rândul.
Ideea: Task-ul primește doar date simple, în JSON (implicit din Celery 4.0): ID-uri, nu obiecte. Un obiect ar fi oricum o copie veche până rulează task-ul; reîncarci după ID. `pickle` ar accepta obiectul, dar poate executa cod la deserializare, deci `accept_content` rămâne `["json"]`. Publici după commit: în Django, `transaction.on_commit(partial(send.delay, pk))` sau `send.delay_on_commit(pk)` (Celery 5.4+).
Exemplu:
```python
from celery import Celery
app = Celery(broker="memory://")
@app.task
def send(order): pass
class Order: pass
o = Order()
send.delay(o)  # ! EncodeError
```
Legătură: CEL-06 și CEL-07. E aceeași regulă ca la Django cu Celery: trimiți `pk`-ul, nu instanța. Un `pickle.loads` pe date din Redis are același risc.

### 12
Problema: La interviu povestești un task Celery scris de tine. Răspunzi „rulează periodic și citește din Redis”. Eșecul lipsește: Redis cade, task-ul rulează de două ori, o rulare ține mai mult decât intervalul.
Ideea: Spui patru lucruri. Frecvența: Beat trimite mesajul la fiecare N minute. Eșecul: retry doar la erori tranzitorii; următoarea rulare, care citește starea curentă, recuperează una pierdută. Idempotența: rulat de două ori, scrie același rezultat. Suprapunerea: Beat trimite următorul mesaj chiar dacă cel vechi rulează.
Exemplu:
```text
Beat publică task-ul la fiecare
<N> minute. Task-ul citește
statusul din Redis și îl scrie
în <loc>. La eroare de Redis
face retry cu backoff, max <M>.
Dacă pierde o rulare, următoarea
reface starea. Rulat de două
ori, scrie același lucru.
```
Legătură: CEL-05, CEL-02 și punctul 2. Pune valorile tale în `<N>`, `<loc>`, `<M>`.
