<!-- Desfășurările fișei `redis` (10 puncte). Format și reguli: lib.mjs (checkDesf), .scratch/desfasurari/spec.md. Faptele: research/_desf_facts_redis.md (secțiunea 33) și research/interview-facts.md, secțiunile 13 și 26. Exemplele Python sunt simulări în Python pur (check-ul nu are server Redis); comenzile Redis stau în blocuri `text`, rulate de mână pe Redis 7.0.15. C++ doar la 1 (singurul punct cu echivalent real). -->

### harta
Problema: Aplicația ta are nevoie de o stare comună și rapidă: contoare, cache, lock-uri, o coadă mică de evenimente. Dacă fiecare operație lovește Postgres, baza ajunge la limita de conexiuni și încetinește. Redis ține datele în RAM și le dă prin comenzi simple, dar RAM-ul e limitat, iar un restart poate șterge totul. Modulul răspunde la șase întrebări: cum lucrează Redis și ce ții în el (1–2), ce faci când memoria se umple și datele trebuie să reziste unui restart (3–4), cum trimiți mesaje (5), ce tipare construiești (6–8), cum cauți chei fără să blochezi serverul (9) și ce alternativă ai (10).
Grupuri:
- 1–2: cum lucrează Redis (comenzi atomice) și ce structuri oferă
- 3–4: memoria și discul (TTL, evacuare, persistență)
- 5: mesaje (Pub/Sub și Streams)
- 6–8: tipare de aplicație (cache, lock, rate limiting)
- 9: operare fără să blochezi serverul (SCAN)
- 10: alternativa Valkey

### 1
Greu: da
Problema: Două replici ale API-ului numără vizitele paginii. Fiecare citește contorul cu `GET`, adaugă 1 în Python și scrie înapoi cu `SET`. La două vizite deodată, contorul crește cu 1, nu cu 2.
Ideea: Redis execută comenzile una câte una, deci o comandă nu e întreruptă de alta. `INCR` citește, adaugă și scrie într-o singură comandă, deci e atomică. `GET` urmat de `SET` sunt două comenzi, iar între ele se strecoară alt client. Pentru mai multe comenzi legate folosești `MULTI`/`EXEC` sau un script Lua. `MULTI`/`EXEC` nu face rollback: o comandă care eșuează nu le anulează pe celelalte. Versiunile noi folosesc thread-uri pentru alte treburi. Comenzile rămân pe un singur thread.
Exemplu:
```python
hits = 0
a = hits       # A: GET
b = hits       # B: GET
hits = a + 1   # A: SET
hits = b + 1   # B: SET
# INCR ar fi dat 2
print(hits)  # → 1
```
În C++: `fetch_add(1)` pe un `std::atomic<int>` e un `INCR`, iar `load()` urmat de `store()` e `GET` plus `SET`.
Unde nu ține: `std::atomic` protejează o variabilă între thread-urile unui proces, printr-o instrucțiune de procesor. Redis e un server cu un singur executor de comenzi, la care vin cereri prin rețea de la mai multe procese. Atomicitatea acoperă o comandă (sau un bloc `MULTI`/script), nu două comenzi separate.
Legătură: RD-08 și RD-10. Exemplul e o simulare în Python.

### 2
Problema: Vrei clasamentul primilor 100 de jucători dintr-un milion. Într-un string JSON citești tot, sortezi în Python și rescrii tot la fiecare punctaj.
Ideea: Redis are structuri, cu comenzi proprii executate pe server. String: o valoare, un contor (`INCR`) sau un lock. Hash: câmpurile unui obiect. List: o coadă simplă. Set: elemente unice. Sorted set: elemente ordonate după scor, pentru clasamente și ferestre glisante. Stream: jurnal cu consumer groups. Pub/Sub nu stochează nimic.
Exemplu:
```text
ZADD lb 30 ana 50 bob 40 cip
ZREVRANGE lb 0 1 WITHSCORES
bob
50
cip
40
```
Legătură: RD-10, punctul 8 (ferestre glisante) și punctul 5 (Streams).

### 3
Greu: da
Problema: Cache-ul de sesiuni nu șterge niciodată nimic. Cu `maxmemory` setat, după o lună memoria e plină și scrierile nu mai merg.
Ideea: TTL face cheia să dispară singură: `SET k v EX 100` sau `EXPIRE`. Un `SET` nou pe aceeași cheie șterge TTL-ul; `INCR` îl lasă. `maxmemory` pune plafonul (implicit 0, fără limită). La plafon decide `maxmemory-policy`. `noeviction`, valoarea implicită, refuză scrierile cu eroare, dar citirile merg. `allkeys-lru` șterge cheile folosite cel mai demult, ca la un cache. Variantele `volatile-*` aleg doar dintre cheile cu TTL. Cozile Celery nu au ce căuta în același Redis cu un cache evacuat: evacuarea le poate șterge.
Exemplu:
```text
SET k 5 EX 100
INCR k
6
TTL k
100
SET k 7
TTL k
-1
```
Legătură: RD-07 și RD-11.

### 4
Greu: da
Problema: Redis se repornește la 3 noaptea. Sesiunile și cozile erau doar în RAM. Dimineața baza e goală sau lipsesc ultimele minute.
Ideea: RDB face, la intervale, un snapshot compact al întregii baze. Pornirea e rapidă, dar pierzi ce s-a scris după ultimul snapshot, de obicei minute. AOF adaugă într-un jurnal fiecare comandă de scriere și o rejoacă la pornire. Cu `appendfsync everysec` (implicit) pierzi cel mult o secundă. `always` scrie la fiecare comandă și e mai lent. Le poți combina, iar la pornire Redis folosește AOF. Documentația recomandă ambele pentru siguranță comparabilă cu Postgres. Implicit, RDB e pornit și AOF oprit. Un cache pur poate renunța la ambele.
Exemplu:
```text
save 60 1000
appendonly yes
appendfsync everysec
```
Legătură: RD-09. AOF e ca WAL-ul din Postgres, iar RDB ca un `pg_dump` periodic.

### 5
Greu: da
Problema: Serviciul de facturi se repornește 10 secunde. În acest timp serviciul de comenzi publică 20 de evenimente pe un canal Pub/Sub. Facturile nu le primesc niciodată.
Ideea: Pub/Sub livrează doar abonaților conectați în clipa publicării (at-most-once). Fără abonat, mesajul se pierde definitiv. `PUBLISH` întoarce numărul de abonați care l-au primit. Un stream păstrează intrările (`XADD`). Un consumer group (`XREADGROUP`) le împarte între consumatori, iar fiecare intrare livrată stă în lista de pending până la `XACK`. Dacă un consumator cade, altul preia intrarea cu `XAUTOCLAIM`. Livrarea e at-least-once, deci handlerul trebuie să fie idempotent.
Exemplu:
```python
subs, log = [], []
def publish(m):
    for q in subs: q.append(m)
    log.append(m)  # doar stream
publish("e1")  # fără abonat
subs.append(late := [])
publish("e2")
print(len(late), len(log))  # → 1 2
```
Legătură: RD-01 și RMQ-11. Exemplul e o simulare în Python.

### 6
Greu: da
Problema: Pagina de start vine din cache cu TTL de 60 de secunde. La secunda 60 cheia expiră și 500 de cereri o ratează deodată. Toate rulează același query scump, iar Postgres cade.
Ideea: În cache-aside, aplicația citește cheia. La miss citește din DB și scrie în cache cu TTL. La scriere în DB șterge cheia din cache. Stampede apare când multe cereri ratează aceeași cheie simultan. Single-flight (un lock) lasă o singură cerere să reconstruiască valoarea, iar celelalte așteaptă sau primesc valoarea veche. TTL cu jitter (TTL aleator în jurul unei valori) împiedică expirarea simultană a multor chei. Ordinea „scrii sursa, apoi ștergi cheia” lasă o fereastră mică în care o citire concurentă repune o valoare veche.
Exemplu:
```python
cache = {}
miss = [k for k in ["home"] * 5
        if k not in cache]
print(len(miss))  # → 5
# single-flight: un singur query
print(len(set(miss)))  # → 1
```
Legătură: RD-03, RD-04 și punctul 7. Exemplul e o simulare: 5 cereri văd cache-ul gol deodată.

### 7
Greu: da
Problema: Două workere Celery pornesc la miezul nopții același job de export și trimit emailul de două ori. Vrei ca doar unul să ruleze.
Ideea: `SET lock token NX PX 30000` ia lock-ul într-o comandă. `NX` creează cheia doar dacă lipsește. `PX` îi pune TTL, deci lock-ul dispare dacă workerul moare. Token-ul e unic pentru fiecare client. Eliberezi doar dacă valoarea e a ta, cu un script Lua. Din Redis 8.4 există `DELEX key IFEQ token`. Un `DEL` simplu poate șterge lock-ul altuia după ce al tău a expirat. TTL-ul nu garantează exclusivitatea, fiindcă un proces blocat peste TTL scrie totuși. Pentru corectitudine strictă, resursa verifică un fencing token crescător și respinge numerele mai mici.
Exemplu:
```python
lock = {"v": "B"}  # A a expirat
def release(tok):
    if lock.get("v") == tok:
        del lock["v"]
release("A")  # A termină târziu
print(lock)  # → {'v': 'B'}
```
Legătură: RD-02 și PG-05. Exemplul e o simulare în Python.

### 8
Greu: da
Problema: Limita e 100 de cereri pe minut per cheie API, dar ai 4 replici, fiecare cu contor în memoria proprie. Un client primește de fapt 400 pe minut, iar contorul dispare la restart.
Ideea: Contorul stă în Redis, comun tuturor replicilor. Fixed window: `INCR rl:cheie:minut` plus `EXPIRE`, într-un `MULTI`/`EXEC` sau un script Lua. Altfel cheia poate rămâne fără TTL. Defectul: la granița ferestrei poți primi până la 2× limita, ca în exemplu. Sliding window: un sorted set cu timestamp-uri. `ZREMRANGEBYSCORE` șterge ce e vechi, iar `ZCARD` numără. Token bucket: un script Lua care reumple și scade atomic. La depășire răspunzi 429.
Exemplu:
```python
c = {}
def allow(t):
    w = t // 60
    c[w] = c.get(w, 0) + 1
    return c[w] <= 5
ts = [59] * 5 + [60] * 5
n = sum(map(allow, ts))
print(n)  # → 10
```
Legătură: RD-06 și scheletul `s-redis-ratelimit`. Exemplul e o simulare în Python.

### 9
Problema: Un dev rulează `KEYS session:*` pe Redis-ul de producție, cu 20 de milioane de chei. Până termină, niciun alt client nu primește răspuns.
Ideea: Redis rulează comenzile pe rând, iar `KEYS` e O(N), deci îi blochează pe toți. `SCAN` întoarce o bucată de chei și un cursor. Repeți cu cursorul primit până revine 0. Un element poate veni de mai multe ori. `COUNT` (implicit 10) e doar o sugestie. Cursorul din exemplu e ilustrativ.
Exemplu:
```text
SCAN 0 MATCH u:* COUNT 2
5
u:3
u:1
SCAN 5 MATCH u:* COUNT 2
```
Legătură: RD-05. E ca `search_after` din Elasticsearch.

### 10
Problema: Juridicul întreabă dacă poți rula Redis 7.4 în produs. Licența nu mai e BSD, ci RSALv2 sau SSPLv1.
Ideea: Valkey e un fork al Redis sub Linux Foundation, cu licență BSD. E compatibil cu Redis OSS 7.2, iar clienții Redis se conectează fără modificări. AWS îl oferă ca ElastiCache for Valkey. Redis a adăugat AGPLv3 la versiunea 8.0.
Analogie: Ca un fork de repo pe GitHub: cod comun până la un punct, apoi drumuri separate.
Legătură: RD-10. Alegerea ține de licență și de ce oferă furnizorul de cloud, nu de cod.
