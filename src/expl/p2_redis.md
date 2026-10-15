<!-- Redis. Variantele greșite: B, C, D = ordinea din sursă (A e cea corectă). -->

### rd-01
Pe scurt: Streams: păstrează mesajele, iar consumer groups le împart între consumatori, cu ack și o listă a mesajelor neconfirmate.
Scop: Când un eveniment nu are voie să se piardă, ai nevoie de un mecanism în care mesajul îl așteaptă pe consumator, nu invers.
Mecanism: Pub/Sub e fire-and-forget: Redis trimite mesajul subscriberilor conectați în acel moment și nu-l păstrează nicăieri. Un Stream e un log append-only: fiecare mesaj primește un id și rămâne în stream. Un consumer group ține minte până unde a citit și ce mesaje au fost livrate, dar neconfirmate (lista de pending).
Pas cu pas:
```text
Pub/Sub: PUBLISH alerts m1
  subscriber deconectat -> m1 pierdut
Stream: XADD alerts * msg m1
  consumatorul revine -> XREADGROUP -> m1
  XACK după procesare
```
Aplicare:
```python
r.xadd("alerts", {"sid": "SAP1", "rule": "R7"})
r.xgroup_create("alerts", "workers", id="0",
                mkstream=True)
msgs = r.xreadgroup("workers", "w1",
                    {"alerts": ">"}, count=10)
# după procesare: r.xack("alerts", "workers", mid)
```
Legătură: Un consumer group seamănă cu o coadă RabbitMQ cu ack manual: mesajele se împart între consumatori, iar cele neconfirmate pot fi reluate.
Limită: Un stream crește la nesfârșit dacă nu-l limitezi (`MAXLEN` la `XADD` sau `XTRIM`). Iar mesajele rămase neconfirmate la un consumator mort trebuie preluate explicit, cu `XAUTOCLAIM`.
La interviu: „Pentru evenimente care nu au voie să se piardă folosesc Streams: mesajele sunt păstrate, iar consumer groups le împart între consumatori, cu ack și listă de pending. Pub/Sub e fire-and-forget: un subscriber deconectat pierde mesajele.”
Verificare: Un consumator din grup citește un mesaj cu `XREADGROUP` și moare înainte de `XACK`. Ce se întâmplă cu mesajul?
Răspuns verificare: Rămâne în lista de pending a acelui consumator. Nu e re-livrat automat: alt consumator îl preia cu `XAUTOCLAIM` (sau `XCLAIM`) după un timp de inactivitate.
Varianta greșită B: Pub/Sub livrează doar subscriberilor conectați în acel moment. Unul deconectat, chiar și pentru o secundă, pierde mesajele.
Varianta greșită C: Garanțiile diferă fundamental: Pub/Sub nu păstrează nimic, iar Streams păstrează mesajele și urmăresc confirmările.
Varianta greșită D: Redis transportă mesaje prin Pub/Sub, liste și Streams. Celery îl poate folosi chiar ca broker.

### rd-02
Pe scurt: `SET lock:job42 <token> NX PX 30000` creează cheia doar dacă nu există, atomic, și o face să expire singură după 30 de secunde.
Scop: Vrei ca un job să ruleze o singură dată, chiar dacă mai multe replici încearcă simultan, fără ca un proces mort să țină lock-ul pentru totdeauna.
Mecanism: `NX` înseamnă „setează doar dacă cheia nu există”, într-o singură comandă, deci doi clienți nu pot reuși amândoi. `PX 30000` pune expirarea în aceeași comandă: dacă procesul moare, lock-ul dispare singur. Token-ul unic (de exemplu un UUID) arată cine deține lock-ul.
Pas cu pas:
```text
A: SET lock tA NX PX 30000 -> OK
B: SET lock tB NX PX 30000 -> nil
A termină -> șterge doar dacă e tA
A moare -> lock-ul expiră după 30 s
```
Aplicare:
```python
RELEASE = r.register_script("""
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
end
return 0""")
token = str(uuid.uuid4())
if r.set("lock:job42", token, nx=True, px=30_000):
    try:
        run_job()
    finally:
        RELEASE(keys=["lock:job42"], args=[token])
```
Legătură: E aceeași idee ca `SELECT ... FOR UPDATE SKIP LOCKED` din Postgres (PG-05): un singur worker preia resursa, iar ceilalți trec mai departe.
Limită: Dacă job-ul durează mai mult decât expirarea, lock-ul expiră și al doilea proces pornește în paralel. Alegi o expirare peste durata maximă sau o prelungești periodic, iar operațiile rămân idempotente.
La interviu: „Folosesc `SET key token NX PX`: creare atomică doar dacă cheia nu există, cu expirare în aceeași comandă. La eliberare șterg doar dacă token-ul e al meu, printr-un script Lua, ca să nu eliberez lock-ul altcuiva.”
Verificare: La final faci simplu `DEL lock:job42`. Job-ul tău a durat 35 de secunde, cu un lock de 30. Ce se poate întâmpla?
Răspuns verificare: Lock-ul tău a expirat la 30 s și l-a luat alt proces. `DEL`-ul tău îi șterge lock-ul, iar un al treilea proces poate porni și el. De aceea verifici token-ul înainte de ștergere.
Varianta greșită B: Între `GET` și `SET` poate intra alt client: amândoi văd că cheia nu există și amândoi iau lock-ul. E un race condition.
Varianta greșită C: Fără expirare, dacă procesul moare înainte de `DEL`, lock-ul rămâne pentru totdeauna, iar job-ul nu mai rulează niciodată.
Varianta greșită D: Dacă procesul moare între `SETNX` și `EXPIRE`, cheia rămâne fără expirare, deci lock-ul e blocat pentru totdeauna.

### rd-04
Pe scurt: Un cache stampede apare când o cheie foarte cerută expiră și multe request-uri o ratează simultan, apoi rulează toate același query scump pe DB.
Scop: Un cache pus ca să protejeze DB-ul poate provoca exact problema pe care trebuia s-o evite: un vârf de încărcare în momentul expirării.
Mecanism: Cât cheia există, DB-ul nu vede nimic. În secunda în care expiră, fiecare request găsește cache-ul gol și pornește aceeași recalculare. Dacă recalcularea durează 2 secunde și ai 500 de request-uri pe secundă, DB-ul primește în jur de 1.000 de query-uri identice.
Pas cu pas:
```text
12:00:00 cheia dashboard expiră
500 req/s -> toate ratează cache-ul
fiecare -> query de 2 s pe DB
DB-ul: ~1.000 de query-uri identice
```
Aplicare: Lași un singur request să recalculeze (un lock `SET NX` pe cheie, iar ceilalți servesc valoarea veche sau așteaptă), pui TTL cu jitter (`3600 + random(0, 300)`), ca cheile să nu expire toate deodată, sau reîmprospătezi valoarea înainte să expire.
Legătură: E un caz de cache-aside: aplicația citește din cache, iar la miss citește din DB și scrie în cache. Problema apare exact când miss-ul e simultan.
Limită: Lock-ul de recalculare aduce o întrebare nouă: ce fac ceilalți cât așteaptă? Să servești o valoare ușor expirată (stale-while-revalidate) e adesea soluția cea mai simplă.
La interviu: „Cache stampede: o cheie populară expiră și multe request-uri o recalculează simultan, lovind DB-ul. Previn cu un singur recalculator (lock), TTL cu jitter sau refresh înainte de expirare.”
Verificare: Ai 10.000 de chei de cache create toate la pornirea aplicației, cu un TTL fix de o oră. Ce se întâmplă peste o oră?
Răspuns verificare: Expiră toate în aceeași secundă, iar DB-ul primește valul de recalculări. Cu jitter pe TTL, expirările se împrăștie în timp.
Varianta greșită B: Ce descrie varianta e evacuarea cheilor când memoria e plină (`maxmemory-policy`), nu un stampede.
Varianta greșită C: Comenzile O(N) lente blochează Redis, dar e altă problemă (RD-05). Stampede-ul lovește DB-ul, nu Redis.
Varianta greșită D: Un TTL prea mare duce la date vechi, nu la un val de request-uri spre DB.

### rd-05
Pe scurt: `KEYS *` parcurge toată baza într-o singură comandă, O(N), și blochează Redis pentru toți clienții; în producție folosești `SCAN`.
Scop: O singură comandă rulată din reflex în producție poate opri pentru câteva secunde cache-ul, sesiunile și brokerul Celery.
Mecanism: Redis execută comenzile una câte una, pe un singur thread. Pe o bază cu 10 milioane de chei, `KEYS *` rulează secunde întregi, timp în care nicio altă comandă nu e servită. `SCAN` întoarce câte un lot mic de chei și un cursor, iar tu continui de unde ai rămas, cu alte comenzi intercalate între loturi.
Pas cu pas:
```text
KEYS * -> 10M chei, ~3 s blocat
SCAN 0 COUNT 1000 -> lot + cursor 1832
SCAN 1832 COUNT 1000 -> lot + cursor
...cursor 0 -> gata, fără blocare lungă
```
Aplicare:
```python
for key in r.scan_iter(match="session:*",
                       count=1000):
    ...
```
Legătură: E ca paginarea cu cursor dintr-un API sau ca `search_after` din Elasticsearch: iei datele pe bucăți, nu toate odată.
Limită: `SCAN` poate întoarce o cheie de mai multe ori și nu dă un snapshot exact dacă baza se schimbă în timpul iterației. Aceeași grijă și la structurile mari: `HGETALL` sau `SMEMBERS` pe milioane de elemente; folosești `HSCAN` sau `SSCAN`.
La interviu: „Redis rulează comenzile pe un singur thread, iar `KEYS *` e O(N): pe o bază mare blochează serverul pentru toți clienții. Folosesc `SCAN`, care iterează incremental, cu cursor.”
Verificare: Un hash `user:42:events` are 5 milioane de câmpuri. Ce comandă eviți și ce folosești în loc?
Răspuns verificare: Eviți `HGETALL`, care întoarce totul odată și blochează serverul, și folosești `HSCAN`, pe loturi. Sau regândești structura, ca să nu crească atât.
Varianta greșită B: `KEYS` nu e depreciată și funcționează în continuare. Problema e costul, nu sintaxa.
Varianta greșită C: `KEYS` doar listează cheile, nu le șterge. Ștergerea în masă o face `FLUSHDB`.
Varianta greșită D: `KEYS` merge și pe primar, și pe replici, iar pe o replică blochează serverul respectiv.

### rd-06
Pe scurt: Un contor per cheie și minut: `INCR rl:{key}:{minut}` plus `EXPIRE`; dacă valoarea trece de 100, respingi request-ul cu 429.
Scop: Cu mai multe replici de API, limita trebuie aplicată global, nu per proces. Altfel, un client primește câte 100 de request-uri pe minut de la fiecare replică.
Mecanism: Toate replicile incrementează aceeași cheie din Redis. `INCR` e atomic, deci nu se pierde niciun increment, nici la request-uri simultane. Cheia include minutul curent, așa că fiecare minut are contorul lui, iar `EXPIRE` șterge contoarele vechi.
Pas cu pas:
```text
12:07:15 INCR rl:abc:12:07 -> 1
...
12:07:50 INCR rl:abc:12:07 -> 101 -> 429
12:08:00 INCR rl:abc:12:08 -> 1
rl:abc:12:07 expiră singură
```
Aplicare:
```python
key = f"rl:{api_key}:{int(time.time() // 60)}"
pipe = r.pipeline()
pipe.incr(key)
pipe.expire(key, 120)
count, _ = pipe.execute()
if count > 100:
    raise HTTPException(status_code=429)
```
Legătură: E un contor partajat, ca un `UPDATE ... SET x = x + 1` atomic în Postgres (PG-02), dar mult mai rapid și cu expirare automată.
Limită: Fereastra fixă permite rafale la graniță: 100 de request-uri la 12:07:59 și alte 100 la 12:08:00. Pentru limite mai netede folosești sliding window (sorted set) sau token bucket, printr-un script Lua.
La interviu: „Cu mai multe replici, contorul trebuie să fie central și atomic: `INCR` pe o cheie per API key și minut, cu `EXPIRE`, și răspund 429 peste 100. Fereastra fixă permite rafale la graniță; pentru netezire folosesc sliding window sau token bucket.”
Verificare: Faci `INCR`, apoi separat `EXPIRE`, doar când valoarea e 1. Procesul moare între cele două comenzi. Ce rămâne?
Răspuns verificare: O cheie fără expirare, care nu se mai șterge niciodată. Dacă cheia e per minut, se adună doar chei moarte; dacă e fixă, utilizatorul rămâne blocat. De aceea le trimiți împreună, într-un pipeline sau într-un script.
Varianta greșită B: Un dict local numără doar request-urile acelei replici. Cu 4 replici, clientul poate face 400 de request-uri pe minut.
Varianta greșită C: Un UPDATE în Postgres la fiecare request adaugă latență și încarcă DB-ul cu scrieri, iar rândul devine un punct de contenție.
Varianta greșită D: Pub/Sub nu păstrează nimic, deci n-ai ce număra. Un contor are nevoie de stare, nu de mesaje trecătoare.

### rd-07
Pe scurt: Pentru un cache folosești `allkeys-lru` sau `allkeys-lfu`: când memoria se umple, Redis șterge cheile cel mai puțin folosite, oricare ar fi ele.
Scop: Un cache plin trebuie să-și facă singur loc pentru datele noi. Altfel, aplicația primește erori la scriere exact când e mai încărcată.
Mecanism: La atingerea `maxmemory`, politica decide ce se întâmplă cu o scriere nouă. `allkeys-lru` șterge cheile folosite cel mai demult, iar `allkeys-lfu` pe cele folosite cel mai rar. Variantele `volatile-*` aleg doar dintre cheile cu TTL. `noeviction`, valoarea implicită, refuză scrierile cu eroare.
Pas cu pas:
```text
maxmemory 2gb, memoria e plină
SET cache:x ..., cu allkeys-lru
  -> șterge chei vechi, nefolosite
  -> SET reușește
cu noeviction -> eroare OOM la SET
```
Aplicare:
```text
maxmemory 2gb
maxmemory-policy allkeys-lru
```
Legătură: E ca `functools.lru_cache(maxsize=...)` din Python, aplicat întregului Redis.
Limită: Dacă același Redis ține și date care nu au voie să dispară (cozi Celery, lock-uri), evacuarea le poate șterge. Folosești instanțe separate: una de cache, cu `allkeys-lru`, și una pentru date, cu `noeviction`.
La interviu: „Pentru un Redis folosit strict ca cache aleg `allkeys-lru` sau `allkeys-lfu`, ca să evacueze singur cheile cel mai puțin folosite. `noeviction`, valoarea implicită, e pentru date care nu au voie să dispară, cum sunt cozile.”
Verificare: Ai `volatile-lru`, dar aplicația scrie cheile de cache fără TTL. Ce se întâmplă când memoria se umple?
Răspuns verificare: Nu există chei cu TTL dintre care să aleagă, deci Redis nu poate evacua nimic, iar scrierile încep să dea eroare, ca la `noeviction`.
Varianta greșită B: `noeviction` refuză scrierile când memoria e plină, deci cache-ul dă erori în loc să-și facă loc.
Varianta greșită C: Redis are mai multe politici de evacuare (`allkeys-lru`, `allkeys-lfu`, `volatile-*`, `noeviction`), setate cu `maxmemory-policy`.
Varianta greșită D: `volatile-ttl` alege doar dintre cheile cu TTL, pe cele care expiră cel mai curând. E o opțiune validă, dar nu singura și nici cea mai potrivită pentru un cache.

### rd-08
Pe scurt: MULTI/EXEC garantează că toate comenzile din bloc rulează una după alta, fără comenzi ale altor clienți între ele, dar nu face rollback dacă una eșuează.
Scop: Nu confunzi tranzacțiile Redis cu cele SQL: știi ce garantează și când îți trebuie un script Lua.
Mecanism: După `MULTI`, comenzile sunt puse la coadă, nu executate. La `EXEC`, Redis le rulează pe toate consecutiv, pe singurul lui thread. Dacă o comandă eșuează la execuție (de exemplu, `INCR` pe un string), celelalte rulează totuși, iar ce s-a scris rămâne.
Pas cu pas:
```text
MULTI
INCR counter        -> QUEUED
INCR name (string)  -> QUEUED
SET done 1          -> QUEUED
EXEC -> 1) 6  2) eroare  3) OK
fără rollback: counter și done rămân
```
Aplicare: Pentru „citești, apoi decizi” atomic folosești un script Lua, care rulează tot pe server, fără întrerupere, sau `WATCH` + `MULTI`, unde `EXEC` e anulat dacă cheia urmărită s-a schimbat între timp.
Legătură: E opusul unei tranzacții Postgres, unde o eroare anulează tot. În Redis, atomicitatea înseamnă doar că nimeni nu se bagă între comenzi.
Limită: Erorile detectate încă de la punerea în coadă, cum e o comandă cu sintaxă greșită, anulează tot blocul la `EXEC`. Doar erorile de la execuție lasă restul să ruleze.
La interviu: „MULTI/EXEC execută comenzile consecutiv, fără intercalări de la alți clienți, dar fără rollback: dacă o comandă eșuează la execuție, celelalte rămân aplicate. Pentru logică condiționată atomică folosesc Lua sau WATCH.”
Verificare: Vrei să scazi stocul doar dacă e mai mare decât 0. Poți face asta doar cu MULTI/EXEC?
Răspuns verificare: Nu: în MULTI nu poți citi valoarea ca să decizi, pentru că comenzile se execută abia la EXEC. Folosești un script Lua sau WATCH, cu retry dacă cheia s-a schimbat.
Varianta greșită B: Redis nu face rollback: comenzile reușite rămân aplicate chiar dacă alta din bloc eșuează.
Varianta greșită C: Comenzile rulează pe un singur thread, una după alta. Tranzacția garantează tocmai că nu se intercalează, nu că rulează în paralel.
Varianta greșită D: Scrierea pe disc depinde de RDB și AOF, nu de MULTI/EXEC. Un bloc tranzacțional nu forțează nicio scriere pe disc.

### rd-09
Pe scurt: RDB e un snapshot periodic al întregii baze; AOF e un jurnal în care Redis adaugă fiecare comandă de scriere.
Scop: Alegi cât poți pierde la un crash: minute (RDB), cam o secundă (AOF cu `everysec`) sau nimic important (cache pur, fără persistență).
Mecanism: RDB salvează periodic tot setul de date într-un fișier compact, de exemplu la 5 minute dacă s-au schimbat chei; la crash pierzi ce s-a scris după ultimul snapshot. AOF adaugă fiecare scriere într-un fișier și face fsync după politica aleasă (`everysec`, implicit); la restart, Redis rejoacă jurnalul.
Pas cu pas:
```text
RDB: snapshot la 12:00, 12:05, ...
  crash la 12:04 -> pierzi 4 minute
AOF everysec: fiecare scriere -> fișier
  crash -> pierzi cel mult ~1 s
```
Aplicare:
```text
appendonly yes
appendfsync everysec
save 300 10
```
Legătură: AOF seamănă cu WAL-ul din Postgres: un jurnal al scrierilor, rejucat la pornire. RDB seamănă cu un `pg_dump` periodic.
Limită: AOF crește continuu și e rescris periodic, într-o formă compactă. Iar persistența pe disc nu e replicare: pentru disponibilitate ai nevoie de replici, cu Sentinel sau Cluster.
La interviu: „RDB e un snapshot periodic, compact, dar pierzi ce s-a scris după ultimul snapshot. AOF e un jurnal al comenzilor; cu `everysec` pierzi cel mult o secundă. Pentru date importante combin AOF cu replicare; pentru cache pur pot opri persistența.”
Verificare: Redis ține cozile Celery, cu RDB la 5 minute și fără AOF, iar serverul crapă. Ce pierzi?
Răspuns verificare: Toate task-urile publicate după ultimul snapshot, adică până la 5 minute de muncă. Pentru cozi activezi AOF sau folosești RabbitMQ, cu cozi durabile.
Varianta greșită B: Ambele scriu pe disc: RDB, un snapshot; AOF, un jurnal de comenzi.
Varianta greșită C: Replicarea între noduri e un mecanism separat. AOF e un jurnal local, pe disc.
Varianta greșită D: E aproape invers: RDB poate pierde minute de date, iar AOF cu `everysec` pierde cel mult o secundă.

### rd-10
Pe scurt: Redis e un store cheie-valoare care ține datele în memorie, cu structuri de date (string, hash, list, set, sorted set, stream) și expirare pe chei.
Scop: Înțelegi de ce apare peste tot în stack-urile Python (cache, broker Celery, rate limiter, lock) și ce nu e potrivit să-i ceri.
Mecanism: Datele stau în RAM, deci operațiile durează microsecunde. Fiecare cheie are un tip de valoare, cu comenzi proprii: `INCR` pentru contoare, `LPUSH` pentru liste, `ZADD` pentru clasamente. Comenzile rulează pe un singur thread, deci fiecare e atomică.
Pas cu pas:
```text
SET session:42 "..." EX 3600 -> cache
INCR rl:abc:12:07 -> contor
LPUSH jobs "..." -> coadă
ZADD top 95 "SAP1" -> clasament
```
Aplicare:
```python
r = redis.Redis(host="redis",
                decode_responses=True)
r.set("user:42:name", "Ana", ex=3600)
r.incr("visits")
```
Legătură: Într-un stack cu Django și Celery, Redis apare tipic în două roluri: broker pentru task-uri și cache.
Limită: Datele trebuie să încapă în RAM, iar Redis n-are JOIN-uri, query-uri ad-hoc sau tranzacții ca în SQL. E gândit pentru date pe care le poți reconstrui sau care expiră; sursa de adevăr rămâne de obicei în Postgres.
La interviu: „Redis e un store cheie-valoare în memorie, cu structuri de date și TTL. Îl folosesc pentru cache, rate limiting, lock-uri și ca broker, dar sursa de adevăr rămâne în Postgres.”
Verificare: Ai 200 GB de evenimente pe care vrei să le interoghezi după filtre variate. E Redis o alegere bună?
Răspuns verificare: Nu: datele ar trebui să încapă în RAM, ceea ce costă mult, și n-ai query-uri ad-hoc. Le ții în Postgres sau Elasticsearch, iar Redis îl folosești doar pentru cache-ul rezultatelor frecvente.
Varianta greșită B: Redis nu are tabele, scheme sau SQL: e un store cheie-valoare, cu structuri de date.
Varianta greșită C: Căutarea full-text e treaba lui Elasticsearch. Redis e în primul rând un store cheie-valoare în memorie, iar căutarea nu e rolul lui de bază.
Varianta greșită D: Redis poate persista datele pe disc, prin RDB și AOF, iar mesageria e doar unul dintre rolurile lui.

### rd-11
Pe scurt: `EXPIRE session:42 3600` pune un TTL pe cheie: Redis o șterge automat după 3.600 de secunde, adică după o oră.
Scop: Datele temporare (sesiuni, coduri de verificare, contoare pe minut) dispar singure, fără joburi de curățenie.
Mecanism: Redis reține momentul expirării pentru fiecare cheie cu TTL. O cheie expirată e ștearsă fie când cineva o accesează, fie de o curățenie periodică în fundal. `TTL session:42` arată câte secunde mai are.
Pas cu pas:
```text
SET session:42 "..."
EXPIRE session:42 3600
TTL session:42 -> 3600 ... 1
după o oră: GET -> nil, TTL -> -2
```
Aplicare:
```python
r.set("session:42", data, ex=3600)  # TTL la scriere
r.ttl("session:42")  # câte secunde mai are
```
Legătură: E echivalentul unui cookie cu `Max-Age`: după timpul setat, nu mai există.
Limită: Un `SET` ulterior fără `EX` șterge TTL-ul, iar cheia devine permanentă. Dacă vrei să păstrezi TTL-ul la suprascriere, folosești `SET ... KEEPTTL`.
La interviu: „`EXPIRE` pune un TTL pe cheie, iar Redis o șterge automat după acel timp. De obicei îl setez direct la scriere, cu `SET ... EX`, și țin minte că un `SET` ulterior fără `EX` șterge TTL-ul.”
Verificare: Rulezi `SET session:42 x EX 3600`, iar după 10 minute `SET session:42 y`. Când expiră cheia?
Răspuns verificare: Niciodată: al doilea `SET`, fără `EX`, a șters TTL-ul. Ai nevoie din nou de `EX` sau de `KEEPTTL`.
Varianta greșită B: `EXPIRE` acționează pe o singură cheie și doar îi pune un termen. Nu există o comandă care să șteargă cheile după vechime.
Varianta greșită C: `EXPIRE` nu blochează cheia: alți clienți o pot citi și modifica normal până expiră.
Varianta greșită D: `EXPIRE` nu mută nimic pe disc: doar stabilește momentul în care cheia va fi ștearsă.
