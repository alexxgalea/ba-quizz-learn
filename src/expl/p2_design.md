<!-- Design de sisteme distribuite. Variantele greșite: B, C, D = ordinea din sursă (A e cea corectă). -->

### des-01
Pe scurt: Transactional outbox: scrii evenimentul într-o tabelă `outbox`, în aceeași tranzacție cu datele, iar un proces separat (relay) îl publică ulterior în RabbitMQ.
Scop: Elimini „dual write”-ul: fie se salvează și datele, și evenimentul, fie niciuna, iar publicarea devine o problemă de retry, nu de pierdere.
Mecanism: Postgres și RabbitMQ nu au o tranzacție comună, deci două scrieri separate pot reuși doar pe jumătate. Cu outbox, scrii totul în Postgres, atomic. Relay-ul citește periodic rândurile nepublicate, le publică (cu publisher confirms) și le marchează ca publicate. Dacă publicarea eșuează, reîncearcă mai târziu.
Pas cu pas:
```text
BEGIN
  INSERT INTO orders ...
  INSERT INTO outbox (type, payload)
COMMIT -> ambele sau niciuna
relay: citește rândurile nepublicate
  -> publish -> confirm
  -> marchează published_at
```
Aplicare:
```python
with session.begin():
    session.add(order)
    session.flush()  # primește order.id
    session.add(Outbox(type="order.created",
                       payload={"id": order.id}))
```
Relay-ul rulează separat, în buclă: ia rândurile nepublicate (cu `FOR UPDATE SKIP LOCKED`), le publică și le marchează.
Legătură: Leagă-l de CEL-07: publicarea după commit închide cursa, dar un crash între commit și publicare pierde evenimentul. Outbox-ul închide și gaura asta.
Limită: Relay-ul poate publica un eveniment de două ori, dacă moare după publicare și înainte de marcare, deci consumatorii trebuie să fie idempotenți. Alternativa fără tabelă interogată periodic e CDC (de exemplu Debezium), care citește WAL-ul.
La interviu: „Pentru dual write folosesc transactional outbox: evenimentul e scris în aceeași tranzacție cu datele, iar un relay îl publică după. E at-least-once, deci consumatorii sunt idempotenți. Alternativ, CDC pe WAL.”
Verificare: Relay-ul publică evenimentul, apoi moare înainte să-l marcheze ca publicat. Ce se întâmplă la repornire?
Răspuns verificare: Vede rândul tot nepublicat și îl publică din nou, deci consumatorul primește un duplicat. De aceea evenimentul are un id unic, după care consumatorul deduplică.
Varianta greșită B: Dacă publici înainte de commit și tranzacția face rollback, consumatorii primesc un eveniment despre date care nu există.
Varianta greșită C: Retry-ul în request ține clientul blocat, iar evenimentul tot se pierde dacă procesul moare între commit și publicare.
Varianta greșită D: RabbitMQ nu participă la tranzacții distribuite (XA), deci 2PC între el și Postgres nu e o opțiune practică, iar 2PC aduce oricum blocaje și complexitate.

### des-02
Pe scurt: În practică, „exactly once” înseamnă livrare at-least-once plus procesare idempotentă: duplicatele pot apărea, dar nu produc efecte duble.
Scop: La interviu, cine promite exactly-once garantat de broker pierde puncte. Răspunsul matur explică de ce nu se poate și cum obții totuși efectul.
Mecanism: Confirmarea unei operații se poate pierde pe rețea după ce operația a reușit; expeditorul nu știe și reîncearcă, deci apare un duplicat. Fără reîncercări, pierzi mesaje. Așa că alegi să nu pierzi nimic (at-least-once) și faci consumatorul să recunoască duplicatele, după o cheie unică per mesaj.
Pas cu pas:
```text
broker -> m1 -> consumator
consumator: procesează m1, ack pierdut
broker: re-livrează m1
consumator: m1 deja procesat -> ignoră
efect: o singură dată
```
Aplicare: În aceeași tranzacție cu efectul:
```sql
INSERT INTO processed_events (event_id)
VALUES (:id) ON CONFLICT DO NOTHING;
-- 0 rânduri inserate => duplicat, ieși
```
Legătură: Leagă CEL-02 (Celery nu garantează exactly once) de RMQ-11 (ack după procesare): împreună cu idempotența, dau efectul de „exactly once”.
Limită: Deduplicarea are un cost: tabela de id-uri procesate crește, deci o cureți după o fereastră de timp. Iar efectele externe (un email trimis, un API terț) nu pot fi anulate: acolo folosești idempotency keys la terț sau accepți, rar, un duplicat.
La interviu: „Exactly once end-to-end nu se poate garanta peste rețea; în practică fac at-least-once plus procesare idempotentă, cu deduplicare după un id unic, în aceeași tranzacție cu efectul.”
Verificare: Consumatorul inserează id-ul în `processed_events` într-o tranzacție, iar efectul (UPDATE pe sold) îl face în alta. Ce poate merge prost?
Răspuns verificare: Dacă moare între cele două tranzacții, id-ul e marcat ca procesat, dar efectul nu s-a produs: la re-livrare, mesajul e ignorat, iar efectul se pierde. Le pui în aceeași tranzacție.
Varianta greșită B: Confirmările brokerului acoperă drumul mesajului, nu efectul din aplicația ta. Un ack pierdut tot duce la re-livrare.
Varianta greșită C: At-most-once fără retry pierde mesaje, adică exact opusul a ceea ce vrei.
Varianta greșită D: Te poți apropia mult: cu idempotență, duplicatele există pe fir, dar nu produc efecte duble.

### des-03
Pe scurt: Circuit breaker plus timeout-uri scurte: după câteva eșecuri nu mai chemi serviciul o vreme și eșuezi imediat, în loc să ții workerii blocați 30 de secunde.
Scop: O dependență căzută nu trebuie să-ți doboare tot serviciul. Vrei să eșuezi repede, să degradezi grațios și să-i lași dependenței timp să revină.
Mecanism: Breaker-ul are trei stări. Închis: apelurile trec normal, iar eșecurile se numără. Deschis: după N eșecuri, apelurile sunt respinse imediat, fără rețea, pentru o perioadă. Semi-deschis: după acea perioadă trec câteva apeluri de probă; dacă reușesc, breaker-ul se închide la loc.
Pas cu pas:
```text
închis: 5 eșecuri la rând -> deschis
deschis 30 s: apel -> eroare imediată
  (fallback: cache, mesaj clar)
semi-deschis: un apel de probă
  reușește -> închis; eșuează -> deschis
```
Aplicare: Pui un timeout explicit pe fiecare apel extern (de exemplu 2 s), un breaker per dependență (o bibliotecă precum `pybreaker` sau un contor în Redis, comun pentru replici) și un fallback: date din cache, un răspuns parțial sau o eroare clară și rapidă. Cu bulkheads (pool-uri separate per dependență), o singură dependență nu poate consuma toți workerii.
Legătură: E siguranța electrică din casă: la scurtcircuit sare, ca să nu ardă tot, iar o rearmezi după ce problema a trecut.
Limită: Pragurile alese prost fie deschid breaker-ul la prima eroare izolată, fie prea târziu. Iar breaker-ul nu înlocuiește timeout-urile: fără timeout, nici nu apuci să numeri eșecurile.
La interviu: „Pun timeout-uri scurte pe apelurile externe și un circuit breaker: după N eșecuri nu mai chem serviciul o perioadă și degradez grațios. Cu bulkheads, o singură dependență nu poate consuma toți workerii.”
Verificare: Serviciul extern e lent (10 s), nu căzut, iar tu ai un timeout de 30 s. Se deschide breaker-ul?
Răspuns verificare: Nu: apelurile reușesc, doar încet, deci nu se numără ca eșecuri, iar workerii tot se blochează. Ai nevoie de un timeout mai scurt sau de un breaker care numără și apelurile lente.
Varianta greșită B: Un timeout mai mare ține workerii blocați și mai mult: problema se agravează, nu se rezolvă.
Varianta greșită C: Retry-urile imediate și nelimitate înmulțesc încărcarea pe un serviciu deja căzut și îți blochează și mai mulți workeri.
Varianta greșită D: Workerii în plus se blochează la fel, doar ceva mai târziu, și consumă mai multă memorie și mai multe conexiuni.

### des-04
Pe scurt: Orizontal: adaugi sau scoți workeri stateless după lungimea cozii și după vechimea celui mai vechi mesaj.
Scop: Coada absoarbe vârfurile, iar numărul de workeri urmărește munca reală, nu CPU-ul altui serviciu.
Mecanism: Workerii stateless nu păstrează nimic între mesaje, deci oricare poate procesa orice mesaj, iar unul nou poate porni oricând. Dacă lungimea cozii tot crește, workerii nu țin pasul și adaugi alții; dacă e mereu aproape goală, scoți din ei. Vârsta celui mai vechi mesaj îți spune direct cât așteaptă un job.
Pas cu pas:
```text
coadă: 50 -> 2.000 -> 8.000 (crește)
  -> scale out: 4 -> 12 workeri
coadă stabilă, aproape de 0
  -> scale in: 12 -> 4
alertă: cel mai vechi mesaj > 5 min
```
Aplicare: În Kubernetes, KEDA scalează după lungimea cozii din RabbitMQ sau Redis. În Docker Swarm rulezi `docker service scale workers=12`, declanșat de o regulă din monitorizare.
Legătură: Ai făcut-o deja manual în Docker Swarm: mai multe replici ale serviciului de workeri când crește încărcarea.
Limită: Workerii în plus apasă pe tot ce e în aval: 100 de workeri înseamnă peste 100 de conexiuni DB (de aici PgBouncer) și mai multe apeluri spre API-urile externe. Scalezi până la capacitatea celei mai slabe dependențe.
La interviu: „Workerii stateless îi scalez orizontal, după lungimea cozii și vârsta celui mai vechi mesaj, de exemplu cu KEDA. Am grijă la dependențele din aval: conexiunile DB, prin PgBouncer, și limitele API-urilor externe.”
Verificare: Coada crește, deși workerii stau la 10% CPU. Ajută să adaugi workeri?
Răspuns verificare: Poate, dacă workerii așteaptă după I/O, dar mai întâi afli după ce: dacă așteaptă un DB sau un API saturat, mai mulți workeri doar măresc presiunea pe el. Cauza e în aval.
Varianta greșită B: Un singur worker mare are o limită și e un punct unic de defect. Workerii stateless se scalează natural orizontal.
Varianta greșită C: CPU-ul API-ului arată cât e de ocupat API-ul, nu câtă muncă așteaptă în coadă. Semnalul corect e coada.
Varianta greșită D: Workerii noi doar încep să consume, iar cei opriți își termină munca sau lasă mesajele neconfirmate să revină în coadă. Nu e nevoie de downtime.

### des-05
Pe scurt: Clientul trimite cu cererea un idempotency key unic, iar serverul îl salvează împreună cu rezultatul: la o cerere repetată cu aceeași cheie întoarce rezultatul inițial, fără să creeze altă alertă.
Scop: Clientul nu are de unde ști dacă primul POST a ajuns: poate doar răspunsul s-a pierdut. Cu cheia, retry-ul devine sigur.
Mecanism: Clientul generează un UUID per operație (nu per încercare) și îl trimite într-un header, de exemplu `Idempotency-Key`. Serverul salvează cheia într-o tabelă cu constrângere unică, în aceeași tranzacție cu alerta. La retry, cheia există deja, iar serverul întoarce răspunsul salvat la prima cerere.
Pas cu pas:
```text
POST /alerts, Idempotency-Key: k1
  -> alerta 77 + (k1, răspuns) salvate
  -> răspunsul se pierde (timeout)
retry: POST /alerts, Idempotency-Key: k1
  -> k1 există -> 201, alerta 77
```
Aplicare:
```sql
CREATE TABLE idempotency_keys (
  key uuid PRIMARY KEY,
  response jsonb NOT NULL,
  created_at timestamptz DEFAULT now());
```
Cheia și alerta se salvează în aceeași tranzacție; la conflict pe cheie, întorci răspunsul salvat.
Legătură: E pattern-ul din API-urile de plăți (Stripe are header-ul `Idempotency-Key`) și aceeași idee ca deduplicarea mesajelor din DES-02.
Limită: Două cereri cu aceeași cheie pot sosi simultan; constrângerea unică face ca doar una să câștige, iar cealaltă așteaptă sau primește un răspuns „în curs”. Cheile le ștergi după un TTL, de exemplu 24 de ore.
La interviu: „Clientul trimite un idempotency key per operație. Îl stochez cu constrângere unică, în aceeași tranzacție cu alerta, împreună cu răspunsul, iar la un retry cu aceeași cheie întorc același rezultat. Cheile expiră după un TTL.”
Verificare: Clientul generează o cheie nouă la fiecare retry. Mai funcționează protecția?
Răspuns verificare: Nu: serverul vede chei diferite, deci cereri diferite, și creează alerte duplicate. Cheia se generează o dată per operație și se refolosește la toate retry-urile ei.
Varianta greșită B: Se poate evita: cu o cheie unică per operație, serverul recunoaște cererea repetată.
Varianta greșită C: Fără retry, clientul nu mai află dacă alerta a fost creată, deci pierzi operații sau îl pui pe user să decidă. Problema se rezolvă pe server, nu interzicând retry-ul.
Varianta greșită D: Până noaptea, duplicatele au declanșat deja notificări și acțiuni. Iar un job nu poate ști sigur ce e duplicat și ce e o alertă legitimă.

### des-06
Pe scurt: De la cel mai partajat la cel mai izolat: coloana `tenant_id` (cu RLS), apoi schemă separată per tenant, apoi bază de date separată per tenant.
Scop: Alegi nivelul de izolare după cerințele clienților: costul și simplitatea operării față de izolare, performanță predictibilă și conformitate.
Mecanism: Cu `tenant_id`, toți clienții împart tabelele, iar row-level security (RLS) face ca fiecare query să vadă doar rândurile tenantului curent, chiar dacă aplicația uită filtrul. Cu schemă per tenant, fiecare client are tabelele lui, în aceeași bază. Cu bază per tenant, izolarea e completă, inclusiv la backup, restaurare și resurse.
Pas cu pas:
```text
tenant_id + RLS: ieftin, o migrație
  riscuri: bug de filtrare, noisy neighbour
schemă per tenant: izolare medie
  migrații × N scheme
bază per tenant: izolare maximă
  cost și operare × N
```
Aplicare:
```sql
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON alerts
  USING (tenant_id =
         current_setting('app.tenant_id')::int);
-- în fiecare tranzacție a request-ului:
SET LOCAL app.tenant_id = '42';
```
Legătură: E aceeași decizie ca în Elasticsearch: un index comun cu câmp `tenant`, câte un index per tenant sau clustere separate.
Limită: RLS nu se aplică proprietarului tabelei (doar cu `FORCE ROW LEVEL SECURITY`) și nici rolurilor cu `BYPASSRLS`, deci aplicația rulează cu un rol separat. Cu un pool de conexiuni, setezi tenantul cu `SET LOCAL`, în tranzacție, ca să nu treacă la request-ul următor.
La interviu: „Ordinea, de la partajat la izolat: `tenant_id` cu RLS, schemă per tenant, bază per tenant. Compromisul e cost și operare versus izolare și noisy neighbour. Pentru date de securitate ale clienților aș cântări serios o izolare mai puternică.”
Verificare: Un client mare cere ca datele lui să poată fi restaurate separat dintr-un backup, fără să-i afecteze pe ceilalți. Ce model îl servește cel mai simplu?
Răspuns verificare: Bază de date per tenant, măcar pentru acel client: backup-ul și restaurarea se fac pe baza lui, independent de ceilalți.
Varianta greșită B: E ordinea inversă: baza per tenant e varianta cea mai izolată, iar `tenant_id` cea mai partajată.
Varianta greșită C: Postgres le suportă pe toate trei: coloană cu RLS, scheme separate și baze separate.
Varianta greșită D: Și modelele partajate pot fi sigure (RLS, roluri, audit). Baza per tenant e cea mai izolată, nu singura acceptabilă.

### des-07
Pe scurt: Backoff exponențial cu jitter și o limită de încercări: reîncercările se răresc și se împrăștie în timp, în loc să lovească toate deodată serviciul revenit.
Scop: Un serviciu care abia revine e fragil. Dacă toți clienții reîncearcă în aceeași secundă (thundering herd), îl dărâmă din nou.
Mecanism: Backoff exponențial înseamnă pauze care se dublează: 1, 2, 4, 8 secunde. Jitter-ul alege o pauză aleatoare până la acea limită, ca o mie de clienți să nu reîncerce sincronizat. Limita de încercări oprește bucla și lasă eroarea să ajungă la cine poate decide.
Pas cu pas:
```text
fără jitter, 1.000 de clienți:
  la 1 s, 2 s, 4 s -> valuri de 1.000
cu jitter: pauză aleatoare 0..2^n s
  -> reîncercări împrăștiate uniform
după 5 încercări -> renunță, eroare
```
Aplicare:
```python
for attempt in range(5):
    try:
        return call()
    except TransientError:
        cap = min(30, 2 ** attempt)
        time.sleep(random.uniform(0, cap))
raise ServiceUnavailable()
```
Biblioteca tenacity face același lucru cu `wait_random_exponential` și `stop_after_attempt`.
Legătură: E exact ce face Celery cu `retry_backoff` și `retry_jitter` (CEL-04).
Limită: Backoff-ul nu ajută dacă serviciul e căzut ore întregi: acolo un circuit breaker (DES-03) oprește complet apelurile o vreme. Și reîncerci doar erorile tranzitorii, nu un 400.
La interviu: „Retry-urile le fac cu backoff exponențial, jitter și o limită de încercări, ca să nu lovească toți clienții simultan serviciul care revine. Împreună cu un circuit breaker, serviciul are timp să-și revină.”
Verificare: Toți clienții folosesc backoff exponențial, dar fără jitter. Ce se întâmplă după o cădere comună?
Răspuns verificare: Au eșuat toți în același moment, deci reîncearcă tot sincronizat, la 1 s, la 2 s, la 4 s: valuri la fel de mari, doar mai rare. Jitter-ul îi desincronizează.
Varianta greșită B: Retry-urile imediate și repetate înmulțesc exact valul care a dărâmat serviciul.
Varianta greșită C: Un timeout mai mare nu oprește retry-urile, doar le amână, și ține conexiunile ocupate mai mult.
Varianta greșită D: Replicile în plus ajută, dar un val sincronizat le poate dărâma și pe ele. Fără backoff și jitter, problema rămâne.

### des-08
Pe scurt: O operație e idempotentă dacă, repetată de mai multe ori, are același efect ca o singură rulare.
Scop: Într-un sistem distribuit, repetările sunt inevitabile (retry-uri, re-livrări). Idempotența face ca ele să nu strice nimic.
Mecanism: Operațiile care setează o stare finală sunt idempotente: `SET status = 'done'` dă același rezultat de oricâte ori ar rula. Operațiile care modifică relativ nu sunt: `balance = balance - 100` scade de fiecare dată. Le poți face idempotente legându-le de un id unic: inserezi cu cheie unică și `ON CONFLICT DO NOTHING`.
Pas cu pas:
```text
SET status = 'done', × 3 -> 'done'
balance - 100, × 3 -> -300 (greșit)
INSERT plata p1 ON CONFLICT DO NOTHING,
  × 3 -> o singură plată
```
Aplicare: Proiectezi handler-ele de mesaje și endpoint-urile PUT și DELETE ca să fie idempotente, iar pentru POST folosești idempotency keys (DES-05).
Legătură: În HTTP, GET, PUT și DELETE sunt idempotente prin definiție, iar POST nu. De aceea un PUT poate fi reîncercat liniștit, iar un POST nu.
Limită: Idempotent nu înseamnă „rulează o singură dată”: operația poate rula de mai multe ori, doar că efectul rămâne același. Iar efectele externe (un email trimis) trebuie protejate separat, de exemplu cu un id de mesaj.
La interviu: „O operație idempotentă are același efect oricâte ori ar rula. Cu livrare at-least-once plus idempotență obțin efectul de „exactly once” în practică: chei unice, `ON CONFLICT DO NOTHING`, verificarea stării înainte de acțiune.”
Verificare: E idempotent un handler care face `INSERT INTO alerts (...)` fără nicio cheie unică?
Răspuns verificare: Nu: la fiecare re-livrare inserează o alertă nouă. Devine idempotent cu o cheie unică, de exemplu id-ul evenimentului, și `ON CONFLICT DO NOTHING`.
Varianta greșită B: Asta ar fi „exactly once”, pe care rețeaua nu-l poate garanta. Idempotența acceptă repetarea și face ca ea să nu conteze.
Varianta greșită C: O operație poate modifica date și tot fi idempotentă: `SET status = 'done'` scrie, dar repetată dă același rezultat.
Varianta greșită D: Atomicitatea e altă proprietate (totul sau nimic). O operație atomică poate să nu fie idempotentă, cum e un transfer de bani repetat.
