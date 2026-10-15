<!-- Modele de date: SQL, NoSQL, Elasticsearch, Redis. Variantele greșite: B, C, D = ordinea din sursă (A e cea corectă). -->

### dbm-01
Pe scurt: Formularea bună: Postgres duce fără probleme sute de milioane de rânduri, cu indexuri potrivite; NoSQL îl alegi pentru un model de acces anume, nu pentru volum.
Scop: La interviu, „volum mare, deci NoSQL” sună a reflex, nu a analiză. Arăți că alegi baza de date după modelul de acces și după garanțiile de care ai nevoie.
Mecanism: Cu indexuri potrivite, o căutare în Postgres costă O(log n): între un milion și o sută de milioane de rânduri diferența e de un nivel sau două în arbore. Motivele reale pentru NoSQL sunt altele: acces simplu, doar după cheie, la scară foarte mare; scrieri distribuite pe multe noduri; schemă foarte variabilă; latență foarte mică pe date simple.
Pas cu pas:
```text
100M de rânduri, index pe user_id
  -> ~4 pagini citite per căutare
motive reale pentru NoSQL:
  acces doar după cheie, la scară mare
  scrieri distribuite pe multe noduri
  documente cu schemă foarte variabilă
```
Aplicare: Când alegi, te întrebi: cum citesc datele (după ce chei, cu ce JOIN-uri)? Ce garanții îmi trebuie (tranzacții, integritate)? Unde e limita reală (CPU, IOPS, scrieri pe secundă)? Abia apoi alegi tehnologia.
Legătură: E lecția de la interviul Lateral: argumentul „volum mare, deci NoSQL” sună slab; argumentul bun e modelul de acces.
Limită: Postgres are și limite reale: un singur nod primar pentru scrieri, iar sharding-ul nu vine nativ (există Citus). La volume foarte mari de scrieri, un sistem distribuit poate fi alegerea bună, dar argumentul e rata de scriere, nu numărul de rânduri.
La interviu: „Postgres ține fără probleme sute de milioane de rânduri, dacă indexurile se potrivesc query-urilor. Aleg NoSQL pentru un model de acces anume (acces după cheie la scară mare, scrieri distribuite, schemă foarte variabilă), nu doar pentru volum.”
Verificare: Ai un tabel de 300 de milioane de evenimente, citit mereu după `system_id` și un interval de timp. Treci pe NoSQL?
Răspuns verificare: Nu neapărat: un index compus pe `(system_id, created_at)` și partiționarea pe timp rezolvă citirile în Postgres. Ai motiv să schimbi doar dacă rata de scriere depășește ce poate duce un singur primar.
Varianta greșită B: Câteva milioane de rânduri sunt puține pentru Postgres: cu indexuri, căutările rămân rapide și la sute de milioane.
Varianta greșită C: NoSQL nu e mereu mai rapid: lipsa JOIN-urilor mută munca în aplicație, iar pentru query-uri variate un SQL indexat e adesea mai bun.
Varianta greșită D: Multe baze NoSQL oferă consistență reglabilă, unele chiar tranzacții. O formulare absolută arată că nu cunoști opțiunile.

### dbm-02
Pe scurt: Userii și facturile în Postgres, pentru tranzacții și integritate; logurile în Elasticsearch, pentru căutare full-text și agregări pe volum mare.
Scop: Arăți că alegi depozitul după tipul datelor și după cum le folosești, nu un singur instrument pentru tot.
Mecanism: Facturile cer tranzacții (factura și liniile ei se salvează împreună), constrângeri (chei străine, unicitate) și rapoarte cu JOIN-uri: exact ce face o bază relațională. Logurile sunt multe, vin continuu și se caută după text liber și agregări pe timp: exact ce face Elasticsearch, cu indexul inversat.
Pas cu pas:
```text
useri, facturi -> Postgres
  tranzacții, FK, JOIN-uri
loguri -> Elasticsearch
  full-text, agregări, retenție pe zile
loguri brute -> S3 (arhivă ieftină)
```
Aplicare: Logurile ajung în Elasticsearch printr-un pipeline (Filebeat, Logstash sau o coadă), cu indexuri pe zile și o politică de retenție (ILM). Postgres rămâne sursa de adevăr pentru datele de business.
Legătură: Ai lucrat cu Django și Elasticsearch: împărțirea e aceeași, baza relațională pentru date de business și Elasticsearch pentru căutare.
Limită: Elasticsearch e o copie reconstruibilă, nu sursa de adevăr: dacă indexul se strică, îl refaci din logurile brute sau din DB. Iar două sisteme înseamnă și o sincronizare de întreținut.
La interviu: „Userii și facturile le țin în Postgres, pentru tranzacții și integritate. Logurile merg în Elasticsearch, pentru full-text și agregări, ca replică reconstruibilă, cu brutele arhivate în S3.”
Verificare: Ai nevoie de un raport lunar cu totalul facturat per client. Îl faci din Elasticsearch?
Răspuns verificare: Nu: facturile sunt în Postgres, sursa de adevăr, cu tranzacții. Un `GROUP BY` acolo e exact și consistent, pe când Elasticsearch ar putea avea date nesincronizate.
Varianta greșită B: Elasticsearch nu are tranzacții multi-document, iar indexarea e near-real-time: pentru facturi și useri nu e o sursă de adevăr potrivită.
Varianta greșită C: Redis ține datele în memorie, fără garanțiile unei baze relaționale, deci nu e locul facturilor. Iar userii n-au nevoie de full-text.
Varianta greșită D: Lipsa schemei nu te scapă de migrații, doar le mută în cod. Iar pentru facturi pierzi constrângerile și JOIN-urile.

### dbm-03
Pe scurt: ACID înseamnă Atomicity, Consistency, Isolation, Durability: garanțiile unei tranzacții într-o bază relațională.
Scop: Când spui „am nevoie de tranzacții”, explici concret ce garanții îți trebuie, de exemplu la un transfer de bani sau la salvarea unei facturi cu liniile ei.
Mecanism: Atomicity: toate modificările tranzacției se aplică sau niciuna. Consistency: constrângerile (chei străine, unicitate, CHECK) rămân respectate. Isolation: tranzacțiile concurente nu se încurcă, în măsura stabilită de nivelul de izolare. Durability: după COMMIT, datele supraviețuiesc unui crash, pentru că sunt scrise în WAL.
Pas cu pas:
```text
BEGIN
  UPDATE cont A: -100
  UPDATE cont B: +100
  crash aici -> se anulează ambele (A)
COMMIT -> scris în WAL (D)
alt transfer simultan -> izolat (I)
sold negativ? CHECK îl oprește (C)
```
Aplicare:
```python
with session.begin():  # COMMIT sau ROLLBACK
    a.balance -= 100
    b.balance += 100
```
Legătură: În Django, `transaction.atomic()` îți dă exact garanția A: tot blocul se aplică sau nimic.
Limită: „C” din ACID nu e același lucru cu „C” din CAP: aici înseamnă constrângeri respectate, acolo înseamnă că toate nodurile văd aceeași valoare. Iar izolarea depinde de nivel: implicit, în Postgres, READ COMMITTED permite unele anomalii (PG-02).
La interviu: „ACID: atomicitate, adică totul sau nimic; consistență, adică constrângeri respectate; izolare între tranzacțiile concurente, după nivelul ales; durabilitate după COMMIT, prin WAL.”
Verificare: Serverul cade imediat după ce clientul a primit confirmarea de COMMIT. Se pierde tranzacția?
Răspuns verificare: Nu: durabilitatea garantează că, înainte de confirmare, tranzacția a fost scrisă în WAL, pe disc, iar la repornire Postgres o reface.
Varianta greșită B: Availability și Distribution țin de sistemele distribuite (CAP), nu de garanțiile unei tranzacții.
Varianta greșită C: Caching și Indexing sunt tehnici de performanță, nu garanții ale tranzacțiilor.
Varianta greșită D: Literele nu descriu moduri de execuție, ci garanții: atomicitate, consistență, izolare, durabilitate.

### dbm-04
Pe scurt: Elasticsearch nu are tranzacții care să cuprindă mai multe documente și e near-real-time: o scriere devine vizibilă în căutări abia după un refresh.
Scop: Sursa de adevăr trebuie să garanteze scrieri sigure, consistente și imediat vizibile; Elasticsearch e optimizat pentru altceva, pentru căutare și agregări.
Mecanism: Un document scris în ES apare în căutări după următorul refresh (implicit, cam o secundă). Nu poți salva atomic o factură și liniile ei în documente diferite. Iar tipul unui câmp din mapping nu se poate schimba pe loc: cere reindexare. Toate acestea sunt în regulă pentru un index de căutare, dar riscante pentru datele de bază.
Pas cu pas:
```text
scrii în Postgres (sursa de adevăr)
  -> outbox / CDC / coadă
  -> indexezi în Elasticsearch
indexul se strică?
  -> îl reconstruiești din Postgres
```
Aplicare: Scrii în Postgres, propagi schimbările spre Elasticsearch (outbox, CDC sau o coadă) și păstrezi un script de reindexare completă din sursa de adevăr.
Legătură: Lângă Django, tiparul tipic e același: modelele stau în baza relațională, iar indexul ES e actualizat din semnale sau din task-uri Celery.
Limită: Pentru loguri, unde sursa e chiar fluxul de evenimente, Elasticsearch poate fi depozitul principal pentru căutare, dar păstrezi copiile brute (de exemplu în S3), ca să poți reindexa.
La interviu: „Elasticsearch nu e sursă de adevăr: nu are tranzacții multi-document, e near-real-time, iar schimbarea mapping-ului cere reindexare. Scriu în Postgres, propag în Elastic prin outbox sau CDC și pot reconstrui indexul oricând.”
Verificare: Salvezi un document în ES și, imediat, în același request, îl cauți. Îl găsești?
Răspuns verificare: Nu neapărat: documentul apare în căutări după următorul refresh (implicit, cam o secundă). Un `GET` după id îl găsește, dar o căutare poate să nu-l vadă încă.
Varianta greșită B: Elasticsearch stochează fără probleme documente JSON imbricate, pe mai multe niveluri.
Varianta greșită C: Un index poate avea miliarde de documente, împărțite în shard-uri. Limita de un milion nu există.
Varianta greșită D: Elasticsearch are un API HTTP cu JSON: exact așa îl folosești de obicei, din orice limbaj.

### dbm-05
Pe scurt: În timpul unei partiții de rețea, un sistem distribuit trebuie să aleagă: fie rămâne consistent și refuză unele cereri, fie rămâne disponibil și poate da date vechi.
Scop: Când discuți replicare, cozi sau baze distribuite, arăți că știi ce sacrifici atunci când pică rețeaua dintre noduri.
Mecanism: Când nodurile nu mai comunică, un nod care primește o scriere nu poate confirma că o au și ceilalți. Dacă răspunde oricum, rămâne disponibil, dar alte noduri pot servi valori vechi (AP). Dacă refuză până revine legătura, rămâne consistent, dar o parte din cereri eșuează (CP). Toleranța la partiții nu e opțională: rețelele chiar se partiționează.
Pas cu pas:
```text
noduri N1, N2; legătura cade
clientul scrie x=2 pe N1
CP: N1 refuză (nu poate replica)
AP: N1 acceptă; N2 răspunde încă x=1
legătura revine -> AP reconciliază
```
Aplicare: Quorum queues din RabbitMQ (RMQ-09) aleg consistența: fără majoritate, nu acceptă scrieri. Un cache distribuit alege de obicei disponibilitatea.
Legătură: Elasticsearch alege și el: nodurile rămase fără master refuză scrierile, ca să nu apară două versiuni diferite ale datelor.
Limită: CAP vorbește doar despre ce se întâmplă la partiție. PACELC completează: și fără partiție alegi între latență și consistență, de exemplu replicare sincronă (lentă, consistentă) sau asincronă (rapidă, eventual consistentă).
La interviu: „CAP spune că, la o partiție de rețea, alegi între consistență și disponibilitate. Un Postgres cu un singur primar sau quorum queues aleg consistența; un cache distribuit alege disponibilitatea. PACELC adaugă alegerea dintre latență și consistență fără partiție.”
Verificare: Ai un Postgres cu primar și o replică asincronă. Primarul cade, iar tu promovezi imediat replica. Ce ai ales?
Răspuns verificare: Disponibilitatea: serviciul revine repede, dar ultimele tranzacții confirmate pe primar și încă nereplicate se pot pierde.
Varianta greșită B: La o partiție nu le poți avea pe toate trei simultan: exact asta spune teorema.
Varianta greșită C: Un sistem care alege consistența refuză scrierile în timpul partiției, deci nu pierde ce a confirmat. Pierderea nu e obligatorie.
Varianta greșită D: Consistența eventuală e o alegere de proiectare (AP), nu ceva automat. Un sistem CP refuză cereri în loc să devină eventual consistent.

### dbm-06
Pe scurt: Când ai câmpuri variabile, dar vrei să păstrezi tranzacțiile, JOIN-urile și un singur sistem: câmpurile stabile rămân coloane, iar partea variabilă stă în JSONB.
Scop: Eviți încă un sistem de operat și de sincronizat doar pentru câteva câmpuri flexibile.
Mecanism: JSONB stochează JSON-ul într-un format binar, interogabil cu operatori (`->`, `->>`, `@>`) și indexabil cu GIN. Rândul rămâne parte dintr-o tabelă obișnuită: intră în tranzacții, poate avea chei străine pe coloanele normale și poate fi folosit în JOIN-uri.
Pas cu pas:
```text
events: id, system_id (FK), type,
  created_at, payload jsonb
WHERE type = 'login'
  AND payload @> '{"user": "root"}'
GIN pe payload -> căutare rapidă
```
Aplicare:
```python
class Event(Base):
    __tablename__ = "events"
    id: Mapped[int] = mapped_column(primary_key=True)
    system_id: Mapped[int] = mapped_column(
        ForeignKey("systems.id"))
    payload: Mapped[dict] = mapped_column(JSONB)
```
Legătură: În Django ai `models.JSONField`, care pe Postgres folosește chiar JSONB.
Limită: Câmpurile din JSONB n-au constrângeri de tip sau chei străine, iar statisticile planner-ului pentru ele sunt slabe. Dacă un câmp devine important și stabil, îl promovezi la coloană.
La interviu: „Aleg JSONB pentru partea variabilă a datelor, cum e payload-ul unui eveniment, când vreau totuși tranzacții și JOIN-uri. Câmpurile stabile rămân coloane, iar pentru căutare pun un index GIN. Un sistem în loc de două.”
Verificare: Filtrezi des după `payload->>'user'`, iar câmpul trebuie să fie mereu prezent și de tip text. Ce faci?
Răspuns verificare: Îl promovezi la o coloană proprie (`user_name text NOT NULL`), cu index normal: primești constrângeri, statistici bune și query-uri mai simple.
Varianta greșită B: JSONB e puțin mai lent la scriere decât textul simplu, dar mult mai rapid la interogare: nu reparsează JSON-ul la fiecare citire și poate fi indexat.
Varianta greșită C: Chei străine pe câmpurile din interiorul JSONB nu există. Dacă îți trebuie, câmpul trebuie să fie coloană.
Varianta greșită D: Fișierele binare mari nu stau în JSONB: le pui în object storage (S3), iar în DB păstrezi doar referința.

### dbm-07
Pe scurt: În Redis: e în memorie, are TTL nativ și operații atomice (`INCR`, `SET NX PX`), exact ce cer sesiunile, rate limit-urile și lock-urile.
Scop: Starea efemeră se citește și se scrie foarte des și trebuie să expire singură. Ținută în Postgres, adaugă scrieri inutile și joburi de curățenie.
Mecanism: Fiecare cheie poate avea un TTL, după care dispare automat. Operațiile pe o cheie sunt atomice, deci contoarele și lock-urile funcționează corect între mai multe replici. Totul se petrece în memorie, în microsecunde.
Pas cu pas:
```text
sesiune: SET session:abc ... EX 3600
rate limit: INCR rl:key:minut + EXPIRE
lock: SET lock:job NX PX 30000
toate expiră singure
```
Aplicare: Pentru sesiuni Django folosești `SESSION_ENGINE = "django.contrib.sessions.backends.cache"`, cu cache-ul pe Redis. Pentru rate limiting și lock-uri, vezi RD-06 și RD-02.
Legătură: E rolul pe care Redis îl are deja în stack-urile cu Django și Celery: cache, sesiuni, broker.
Limită: Pierderea Redis nu trebuie să însemne pierderea datelor de business: cel mult userii se reloghează sau limitele se resetează. Ce nu ai voie să pierzi stă în Postgres.
La interviu: „Starea efemeră cu TTL o țin în Redis: e în memorie, are expirare nativă și operații atomice pentru contoare și lock-uri. Dacă Redis se pierde, cel mult userii se reloghează; datele de business rămân în Postgres.”
Verificare: Ții în Redis și coșurile de cumpărături ale userilor, fără persistență. Ce se întâmplă la un restart?
Răspuns verificare: Coșurile dispar. Dacă e acceptabil, pentru că sunt date efemere, e în regulă; dacă nu, activezi persistența (AOF) sau le muți în Postgres.
Varianta greșită B: Postgres poate ține și asta, dar cu scrieri pe disc la fiecare request și cu un job care șterge rândurile expirate: muncă în plus, fără câștig.
Varianta greșită C: Elasticsearch e pentru căutare și agregări, nu pentru stare mică, modificată des și cu expirare.
Varianta greșită D: S3 e stocare de obiecte, cu latență de zeci de milisecunde și fără operații atomice ca `INCR`: nepotrivit pentru contoare și lock-uri.

### dbm-08
Pe scurt: Consistența eventuală înseamnă că replicile ajung la aceleași date în timp, dacă scrierile se opresc; între timp, o citire poate întoarce o valoare veche.
Scop: Când citești de pe replici sau dintr-un index sincronizat asincron, trebuie să știi ce poate vedea userul imediat după o scriere.
Mecanism: Scrierea ajunge întâi pe un nod (primarul), apoi e copiată asincron pe celelalte, cu o mică întârziere (replication lag). În acest interval, o citire de pe o replică poate vedea starea dinainte de scriere. Fără scrieri noi, toate replicile ajung la aceeași valoare.
Pas cu pas:
```text
t=0     primar: status = done
t=0,01  replica întoarce încă pending
t=0,2   replica primește schimbarea
t=0,3   replica întoarce done
```
Aplicare: Pentru „read your writes”, citești de pe primar imediat după o scriere a aceluiași user (sau o scurtă perioadă după ea) și trimiți pe replici doar citirile care tolerează date puțin vechi.
Legătură: Elasticsearch e și el eventual consistent față de baza ta: indexul se actualizează după scriere, nu în aceeași tranzacție (DBM-04).
Limită: „Eventual” nu are o limită de timp garantată: lag-ul poate crește la încărcare mare sau la probleme de rețea. Îl monitorizezi (de exemplu cu `pg_stat_replication`) și pui alerte.
La interviu: „Consistența eventuală înseamnă că replicile converg în timp, dar între timp poți citi date vechi. Replicile de citire Postgres asincrone sunt eventual consistente, deci pentru read-your-writes citesc de pe primar imediat după scriere.”
Verificare: Userul își schimbă emailul, iar pagina următoare, citită de pe o replică, arată tot emailul vechi. Ce s-a întâmplat și ce faci?
Răspuns verificare: Citirea a ajuns pe replică înainte ca aceasta să primească schimbarea (replication lag). Pentru userul care tocmai a scris, citești o scurtă perioadă de pe primar.
Varianta greșită B: Nu e vorba de un job zilnic: replicile primesc schimbările continuu, de obicei în fracțiuni de secundă.
Varianta greșită C: Replicile ajung la aceleași date: „eventual” înseamnă „cu întârziere”, nu „niciodată”.
Varianta greșită D: Ce descrie varianta e consistența puternică: fiecare citire vede ultima scriere.
