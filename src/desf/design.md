<!-- Desfășurările fișei `design` (9 puncte). Format și reguli: lib.mjs (checkDesf), .scratch/desfasurari/spec.md. Faptele: research/interview-facts.md, secțiunile 12, 13, 15, 23 și 26. Fără C++: modulul nu are echivalent real. -->

### harta
Problema: Între serviciile unui sistem distribuit nu ai, de obicei, o tranzacție comună. Rețeaua pierde mesaje și le dublează, serviciile cad, iar clienții se înmulțesc. Dacă nu te gândești la asta de la început, pierzi evenimente, creezi duplicate sau lași un client să-l încurce pe altul. Modulul răspunde la șase întrebări: cum comunică serviciile, ce garanții de livrare ai, cum supraviețuiești eșecurilor, cum crești, cum izolezi clienții și cum vezi ce se întâmplă.
Grupuri:
- 1: cum comunică serviciile (sincron sau prin cozi)
- 2–3: ce garanții de livrare ai și cum nu pierzi un eveniment (outbox)
- 4–5: eșecul ca situație obișnuită (retry, circuit breaker, idempotency key)
- 6–7: cum crești fără să te prăbușești (scalare și backpressure)
- 8: cum izolezi clienții unul de altul (multi-tenant)
- 9: cum vezi ce se întâmplă (observabilitate)

### 1
Problema: Endpoint-ul care creează o alertă apelează direct serviciul de notificări. Acesta cade 5 minute, iar toate creările de alerte pică, deși alerta se putea salva.
Ideea: Un apel sincron (HTTP, gRPC) așteaptă răspunsul, deci ambele servicii trebuie să fie în picioare deodată (cuplare temporală). Cu o coadă, producătorul lasă mesajul și pleacă; consumatorul îl ia când poate. În schimb apar întârzierea, duplicatele și depanarea mai grea.
Analogie: Apelul sincron e telefonul: amândoi la aparat. Coada e scrisoarea: o pui în cutie și pleci.
Legătură: CEL-01. În Celery, request-ul doar publică task-ul.

### 2
Greu: da
Problema: Un consumator procesează o plată și trimite confirmarea (ack). Ack-ul se pierde pe rețea. Brokerul crede că mesajul n-a ajuns și îl trimite din nou. Clientul e debitat de două ori.
Ideea: At-most-once: trimiți o singură dată, fără retry, deci poți pierde mesaje. At-least-once: reîncerci până primești confirmarea, deci nu pierzi nimic, dar apar duplicate. Exactly-once end-to-end e foarte greu de garantat peste rețea, fiindcă expeditorul nu deosebește un mesaj pierdut de o confirmare pierdută. De aceea alegi at-least-once și faci consumatorul idempotent. Efectul e atunci „effectively once”.
Exemplu:
```python
seen, tot = set(), []
def handle(mid, amount):
    if mid not in seen:
        seen.add(mid)
        tot.append(amount)
for m in ("m1", "m1"):  # re-livrat
    handle(m, 100)
print(sum(tot))  # → 100
```
Legătură: RMQ-02 și CEL-02. Auto-ack din RabbitMQ înseamnă at-most-once, iar ack-ul după procesare înseamnă at-least-once. Celery confirmă implicit înainte de rulare; cu `acks_late` confirmă după, deci task-ul trebuie să fie idempotent.

### 3
Greu: da
Problema: Salvezi o comandă în Postgres, apoi publici `order.created` în RabbitMQ. Procesul cade între cele două scrieri. Comanda există, dar nimeni nu află de ea. Cele două sisteme n-au o tranzacție comună, iar scrierea în ambele se numește dual write.
Ideea: Scrii evenimentul într-o tabelă `outbox`, în aceeași tranzacție cu datele. Fie se salvează amândouă, fie niciunul. Un relay separat citește rândurile nepublicate, le publică și le marchează. Dacă moare după publicare și înainte de marcare, publică din nou, deci consumatorii trebuie să fie idempotenți. Alternativa e CDC (de exemplu Debezium), care citește rândul direct din jurnalul WAL al Postgres.
Exemplu:
```text
BEGIN;
INSERT INTO orders ...;
INSERT INTO outbox ...;
COMMIT;  -- ambele sau niciunul
-- relay, în altă buclă:
--   SELECT ... FROM outbox
--   WHERE sent_at IS NULL
--   FOR UPDATE SKIP LOCKED;
```
Legătură: DES-01, CEL-07 și PG-05. Publicarea după commit închide cursa din CEL-07, dar un crash între commit și publicare pierde evenimentul; outbox-ul închide și gaura asta. Relay-ul poate prelua rândurile cu `SKIP LOCKED`, ca în PG-05.

### 4
Greu: da
Problema: Un serviciu cade 10 secunde. O mie de clienți reîncearcă imediat, toți deodată, iar serviciul revenit cade din nou sub val. Altă dată, un apel fără timeout ține un worker blocat minute întregi.
Ideea: Backoff exponențial înseamnă pauze care cresc: 1, 2, 4, 8 secunde, până la un plafon. Jitter-ul alege pauza aleator între 0 și acea valoare, ca clienții să nu reîncerce sincronizat. Limita de încercări oprește bucla, iar mesajul care tot eșuează merge într-o DLQ, ca să nu blocheze coada. Circuit breaker-ul oprește apelurile după un prag de eșecuri și le reia cu un apel de probă. Timeout-ul scurt pe fiecare apel eliberează workerul.
Exemplu:
```python
from random import uniform as u
# 5 clienți, pauza după 3 eșecuri
a = {2 ** 3 for _ in range(5)}
b = {u(0, 8) for _ in range(5)}
# momente: fără / cu jitter
print(len(a), len(b))  # → 1 5
```
Legătură: DES-03, DES-07, RMQ-05 și CEL-04. Celery are `autoretry_for`, `retry_backoff` și `retry_jitter`; jitter-ul e activ implicit, backoff-ul nu. RabbitMQ trimite mesajul respins fără requeue într-un dead letter exchange.

### 5
Greu: da
Problema: Clientul trimite `POST /alerts`, iar răspunsul se pierde. Nu știe dacă alerta s-a creat, deci retrimite. Serverul creează o a doua alertă.
Ideea: Clientul generează o cheie unică per operație (UUID) și o trimite în header-ul `Idempotency-Key`. Serverul o salvează cu rezultatul, sub o constrângere unică, în aceeași tranzacție cu efectul. La retry cu aceeași cheie întoarce rezultatul salvat. Cheia ține de operație, nu de încercare, și expiră după un TTL.
Exemplu:
```python
alerte, salvat = [], {}
def post(k):
    if k not in salvat:
        alerte.append(1)
        salvat[k] = len(alerte)
    return salvat[k]
print(post("a"), post("a"))  # → 1 1
print(len(alerte))  # → 1
```
Legătură: DES-05 și DES-08. E deduplicarea de la punctul 2, la marginea API-ului. Header-ul e încă draft IETF; Stripe îl folosește.

### 6
Greu: da
Problema: La 9:00 sosesc 50.000 de evenimente pe secundă. Instanța de API ajunge la 100% CPU, iar coada crește. Mărești mașina, dar a doua zi vârful e dublu.
Ideea: Un serviciu stateless nu ține nimic local între cereri (sesiunea e în Redis sau în token), deci un load balancer îi împarte cererile și adaugi instanțe liber. Workerii îi scalezi după lungimea cozii și vârsta celui mai vechi mesaj. Partiționarea trimite datele cu aceeași cheie (`system_id`) pe aceeași partiție, deci ordinea per cheie se păstrează (un consumator per partiție). Replicile de citire preiau citirile, iar cache-ul pe cele repetate. Pentru partiționare folosești o funcție stabilă, nu `hash()`, care la `str` diferă între procese.
Exemplu:
```python
from zlib import crc32
# nu hash(): diferă între procese
def p(k):
    return crc32(k.encode()) % 4
print(p("s7"), p("s8"))  # → 1 0
```
Legătură: DES-04, PG-06 și RMQ-06. Ai făcut-o în Docker Swarm cu `docker service scale`. Cu 100 de workeri ai cel puțin 100 de conexiuni DB, de aceea PgBouncer. Ordinea mesajelor se strică cu mai mulți consumatori pe aceeași coadă.

### 7
Greu: da
Problema: Producătorul trimite 10.000 de mesaje pe secundă, iar consumatorul procesează 1.000. Coada crește până se umple memoria brokerului, iar totul cade.
Ideea: Backpressure înseamnă că partea lentă îi spune celei rapide să încetinească. O coadă limitată blochează producătorul sau îi respinge mesajul când e plină. Prefetch-ul limitează câte mesaje neconfirmate primește un consumator. Rate limit-ul per tenant respinge excesul cu `429`, ca un client zgomotos să nu-i încurce pe ceilalți.
Exemplu:
```python
import queue
q = queue.Queue(maxsize=2)
q.put("a")
q.put("b")
print(q.full())  # → True
q.put_nowait("c")  # ! Full
```
Legătură: RMQ-03 și RD-06. Prefetch-ul (`basic.qos`) e backpressure la consumator; rate limit-ul per API key merge în Redis, cu `INCR` și `EXPIRE`.

### 8
Greu: da
Problema: Doi clienți ai platformei de securitate au alertele în aceeași tabelă. Un dev uită `WHERE tenant_id = …` într-un query nou. Clientul A vede alertele clientului B.
Ideea: Izolarea are trei niveluri, de la cel mai partajat la cel mai izolat: coloana `tenant_id`, o schemă per tenant, o bază per tenant. Cu cât urci, cresc izolarea și costul de operare (migrații și backup × N). La `tenant_id`, row-level security (RLS) face Postgres-ul să filtreze rândurile singur. Politica nu se aplică proprietarului tabelei (decât cu `FORCE ROW LEVEL SECURITY`), superuserilor și rolurilor cu `BYPASSRLS`, deci aplicația folosește un rol obișnuit. Tenantul se setează cu `SET LOCAL`, în tranzacția request-ului; fără el, query-ul pică, nu scurge date.
Exemplu:
```text
ALTER TABLE alerts
  ENABLE ROW LEVEL SECURITY;
CREATE POLICY t ON alerts USING (
  tenant_id = current_setting(
    'app.tenant_id')::int);
-- în tranzacția request-ului:
SET LOCAL app.tenant_id = '2';
```
Legătură: DES-06 și SEC-09. Rolul aplicației are doar drepturile de care are nevoie (least privilege). Aceeași alegere o ai la Elasticsearch: indexuri partajate, cu un câmp `tenant`, sau un index per tenant.

### 9
Problema: Clienții se plâng că alertele vin cu 20 de minute întârziere. Dashboard-ul e verde. Coada era plină de mult, dar nu se uita nimeni la ea.
Ideea: Măsori de la început ce simte utilizatorul și cum stau cozile. Lag-ul e câte mesaje așteaptă; vârsta celui mai vechi mesaj spune cât așteaptă un job. Latența end-to-end e timpul de la eveniment la alertă. Alertezi pe vârstă, latență și erori; CPU-ul singur nu arată cât așteaptă clientul.
Exemplu:
```python
n = 100  # acum, în secunde
a = [95, 96, 97]  # sosiri
b = [10, 50, 97]
print(len(a), len(b))  # → 3 3
print(n - a[0], n - b[0])  # → 5 90
```
Legătură: DES-04. Scenariul SAP din Design are metrici la pasul 5. Google SRE: latency, traffic, errors, saturation.
