<!-- Indexuri (Postgres, Elasticsearch). Variantele greșite: B, C, D = ordinea din sursă (A e cea corectă). -->

### idx-01
Pe scurt: Întâi măsori cu `EXPLAIN ANALYZE` și confirmi un Seq Scan, apoi creezi un index UNIQUE pe `email`, cu `CONCURRENTLY`, ca să nu blochezi scrierile.
Scop: Arăți disciplina corectă (măsori, schimbi un singur lucru, verifici) și știi să faci schimbarea în producție fără downtime.
Mecanism: Fără index, Postgres citește toate cele 5M de rânduri ca să găsească un email. Un index B-tree pe `email` duce direct la rând în câțiva pași. UNIQUE adaugă și garanția că nu pot exista două conturi cu același email, iar `CONCURRENTLY` construiește indexul fără să blocheze INSERT-urile și UPDATE-urile.
Pas cu pas:
```text
EXPLAIN ANALYZE ... -> Seq Scan, 900 ms
CREATE UNIQUE INDEX CONCURRENTLY
  users_email_key ON users (email);
EXPLAIN ANALYZE ... -> Index Scan, 0.1 ms
```
Aplicare: Dacă există deja emailuri duplicate, crearea indexului UNIQUE eșuează, așa că le cureți întâi. Pentru căutare fără diferență între litere mari și mici indexezi `lower(email)` (vezi IDX-05).
Legătură: E echivalentul lui `unique=True` pe un câmp Django, împreună cu migrația care creează indexul.
Limită: `CONCURRENTLY` durează mai mult și nu poate rula într-o tranzacție. Dacă eșuează, lasă un index INVALID, pe care îl ștergi și îl creezi din nou.
La interviu: „Întâi rulez `EXPLAIN ANALYZE` și confirm un Seq Scan. Apoi creez un index UNIQUE pe `email` cu `CONCURRENTLY`, ca să nu blochez scrierile, și verific din nou planul.”
Verificare: Ai creat indexul, dar `EXPLAIN` arată tot Seq Scan pentru `WHERE email = $1`. Ce verifici?
Răspuns verificare: Dacă indexul e valid (nu INVALID după un `CONCURRENTLY` eșuat), dacă query-ul compară exact coloana, fără funcții ca `lower()` în jurul ei, și dacă statisticile sunt la zi (`ANALYZE users`).
Varianta greșită B: Elasticsearch e pentru căutare full-text, nu pentru un lookup exact după o cheie. Un index B-tree rezolvă problema în Postgres, fără un sistem nou de sincronizat.
Varianta greșită C: Mai mult RAM face citirea completă mai rapidă, dar tot citești 5M de rânduri pentru unul singur. Indexul elimină munca, nu doar o accelerează.
Varianta greșită D: Fiecare index încetinește scrierile și ocupă spațiu. Indexezi doar coloanele folosite de query-uri reale.

### idx-03
Pe scurt: Când 99% din rânduri trec filtrul, indexul nu scutește aproape nimic, așa că planner-ul alege oricum citirea secvențială a tabelei.
Scop: Arăți că știi când ajută un index: când filtrează puține rânduri dintr-o tabelă mare.
Mecanism: Citirea prin index înseamnă salturi aleatoare pe disc pentru fiecare rând găsit. Dacă oricum trebuie citită aproape toată tabela, e mai ieftin s-o parcurgi secvențial. Planner-ul estimează din statistici câte rânduri trec filtrul și alege varianta mai ieftină.
Pas cu pas:
```text
WHERE is_active = true -> 99% din rânduri
  prin index: salturi pe aproape tot -> scump
  Seq Scan: o singură trecere -> ieftin
WHERE NOT is_active -> 1% din rânduri
  index parțial -> foarte util
```
Aplicare: Dacă interoghezi des minoritatea, creezi un index parțial, care conține doar acele rânduri:
```sql
CREATE INDEX users_inactive_idx
  ON users (last_login) WHERE NOT is_active;
```
Legătură: E ca un index de carte pentru cuvântul „și”: apare pe aproape fiecare pagină, deci n-are rost să-l cauți în index.
Limită: Selectivitatea depinde de valoare, nu doar de coloană: același index e inutil pentru `true` și foarte util pentru `false`. Planner-ul știe asta din statisticile coloanei.
La interviu: „Un index ajută când filtrul e selectiv. La 99% `true`, planner-ul preferă un Seq Scan. Dacă interoghez des minoritatea, folosesc un index parțial, `WHERE NOT is_active`, mic și eficient.”
Verificare: Coloana `status` are 95% `done` și 5% `pending`, iar workerii caută mereu joburile `pending`. Ce index pui?
Răspuns verificare: Un index parțial, de exemplu `ON jobs (created_at) WHERE status = 'pending'`: e mic, conține doar joburile în așteptare și se potrivește exact query-ului.
Varianta greșită B: Postgres permite indexuri B-tree pe boolean. Problema nu e tipul coloanei, ci selectivitatea.
Varianta greșită C: Un index pe o coloană boolean e mai mic decât tabela. Problema e că nu ajută la un filtru neselectiv.
Varianta greșită D: Postgres nu indexează automat coloanele boolean. Creează singur indexuri doar pentru PRIMARY KEY și UNIQUE.

### idx-04
Pe scurt: Un index face scrierile mai lente, ocupă spațiu pe disc și în memorie și cere întreținere.
Scop: Arăți că indexurile sunt un compromis: accelerezi anumite citiri și plătești la fiecare scriere.
Mecanism: Indexul e o structură separată, sortată, pe care Postgres o actualizează la fiecare INSERT și la majoritatea UPDATE-urilor; intrările vechi le curăță VACUUM. Fiecare index înseamnă scrieri în plus, inclusiv în WAL, plus pagini care concurează pentru memoria cache.
Pas cu pas:
```text
INSERT în events (3 indexuri)
  -> rândul, scris în tabelă
  -> + 3 scrieri în indexuri
  -> + WAL pentru toate
```
Aplicare: Găsești indexurile nefolosite cu `pg_stat_user_indexes` (`idx_scan = 0` de mult timp) și le ștergi. Pe tabelele cu multe inserări, cum sunt evenimentele și logurile, păstrezi doar indexurile cerute de query-uri reale.
Legătură: Elasticsearch are același compromis: fiecare câmp indexat costă la ingestie, de aceea dezactivezi indexarea (`"index": false`) pentru câmpurile după care nu cauți niciodată.
Limită: Costul nu e uniform: un index pe o coloană care se schimbă rar costă puțin, iar unul pe o coloană actualizată constant costă mult.
La interviu: „Fiecare index accelerează anumite citiri, dar încetinește scrierile, ocupă spațiu și trebuie întreținut. Pe tabelele cu multe scrieri păstrez doar indexurile justificate de query-uri reale și le șterg pe cele nefolosite.”
Verificare: O tabelă de evenimente primește 5.000 de inserări pe secundă și are 9 indexuri, dintre care 6 nefolosite. Ce câștigi dacă le ștergi?
Răspuns verificare: Fiecare inserare face cu 6 scrieri de index mai puțin: mai mult throughput la scriere, mai puțin WAL, mai puțin spațiu și mai mult cache pentru indexurile utile.
Varianta greșită B: Fiecare index costă la scriere și spațiu. Pus pe fiecare coloană, încetinește serios inserările.
Varianta greșită C: Indexul nu încetinește SELECT-urile; în cel mai rău caz, planner-ul nu-l folosește. Costul apare la scrieri.
Varianta greșită D: Un index nu blochează permanent tabela. Doar crearea lui fără `CONCURRENTLY` blochează temporar scrierile.

### idx-05
Pe scurt: Creezi un index pe expresie, `CREATE INDEX ON users (lower(email))`, pentru că indexul de pe `email` nu conține valorile lui `lower(email)`.
Scop: Rezolvi un caz frecvent: o căutare fără diferență între litere mari și mici, care ignoră indexul existent.
Mecanism: Indexul de pe `email` e sortat după valorile exacte (`Ana@x.com`). Query-ul caută după `lower(email)`, o valoare calculată pe care indexul nu o are, deci Postgres ar trebui să calculeze `lower` pe fiecare rând. Un index pe expresie stochează chiar rezultatul lui `lower(email)`, sortat.
Pas cu pas:
```text
index (email): 'Ana@x.com', 'bob@x.com'
WHERE lower(email) = 'ana@x.com'
  -> indexul nu ajută -> Seq Scan
index (lower(email)): 'ana@x.com', ...
  -> Index Scan
```
Aplicare:
```sql
CREATE UNIQUE INDEX CONCURRENTLY
  users_email_lower_key
  ON users (lower(email));
```
Query-ul folosește exact aceeași expresie: `WHERE lower(email) = lower($1)`.
Legătură: În Django pui `Index(Lower("email"), name=...)` în `Meta.indexes` sau, pentru unicitate, un `UniqueConstraint` pe `Lower("email")`.
Limită: Funcția din index trebuie să fie IMMUTABLE (același input dă mereu același rezultat), iar `lower` este. Alternativ, tipul `citext` face comparațiile case-insensitive fără să mai scrii `lower`.
La interviu: „Indexul pe `email` stochează valorile exacte, nu `lower(email)`, deci nu poate fi folosit. Creez un index pe expresie, `ON users (lower(email))`, și scriu query-ul cu exact aceeași expresie. Alternativ, folosesc `citext`.”
Verificare: Ai indexul pe `lower(email)`, dar query-ul e `WHERE upper(email) = 'ANA@X.COM'`. Se folosește indexul?
Răspuns verificare: Nu: `upper(email)` e altă expresie decât cea indexată. Query-ul trebuie să folosească exact `lower(email)`.
Varianta greșită B: Un index Hash pe `email` stochează tot valorile exacte, deci nu ajută la `lower(email)`. Problema e expresia, nu tipul indexului.
Varianta greșită C: `work_mem` controlează memoria pentru sortări și hash-uri. Nu face ca un index pe `email` să conțină `lower(email)`.
Varianta greșită D: Reconstruit, indexul rămâne identic, tot pe valorile exacte din `email`. În plus, `VACUUM FULL` blochează tabela.

### idx-06
Pe scurt: Un index GIN: indexează cheile și valorile din JSONB, așa că operatorul `@>` („conține”) găsește repede documentele potrivite.
Scop: Când stochezi evenimente cu payload variabil în JSONB, vrei căutări rapide după conținut, fără să extragi fiecare câmp într-o coloană separată.
Mecanism: GIN e un index inversat: pentru fiecare cheie și valoare din documente ține lista rândurilor care o conțin. La `payload @> '{"type": "login"}'`, Postgres intersectează listele pentru `type` și `login`, apoi verifică rândurile candidate.
Pas cu pas:
```text
rând 1: {"type": "login"}
rând 2: {"type": "logout"}
GIN: 'type'   -> [1, 2]
     'login'  -> [1]
     'logout' -> [2]
@> {"type": "login"} -> rândul 1
```
Aplicare:
```sql
CREATE INDEX events_payload_gin
  ON events USING GIN (payload);
-- mai compact, doar pentru @>:
-- USING GIN (payload jsonb_path_ops)
```
Legătură: E același principiu ca indexul inversat din Elasticsearch: termenul duce la documentele care îl conțin.
Limită: GIN e mai lent la scriere și mai mare decât un B-tree. Dacă filtrezi mereu după o singură cheie, un B-tree pe expresie, `ON events ((payload->>'type'))`, e mai mic și mai rapid.
La interviu: „Pentru `@>` pe JSONB folosesc un index GIN, adică un index inversat pe cheile și valorile documentului. Dacă interoghez mereu o singură cheie, un B-tree pe expresia `payload->>'type'` e mai eficient.”
Verificare: Query-ul e `WHERE payload->>'type' = 'login'`, nu `@>`. Îl ajută indexul GIN pe `payload`?
Răspuns verificare: Nu: GIN-ul pe `payload` ajută operatori ca `@>` și `?`, nu egalitatea pe `->>`. Pui un B-tree pe expresia `(payload->>'type')` sau rescrii query-ul cu `@>`.
Varianta greșită B: Un B-tree pe toată coloana compară documente întregi, deci ajută doar la egalitatea pe tot JSON-ul, nu la „conține”.
Varianta greșită C: Hash ajută doar la egalitate exactă pe toată valoarea. Nu poate răspunde la „documentul conține perechea asta”.
Varianta greșită D: BRIN reține min/max pe blocuri de pagini, util pentru coloane corelate cu ordinea fizică, cum e timpul. Pentru conținutul unui JSON nu ajută.

### idx-07
Pe scurt: BRIN pe `created_at`: reține doar minimul și maximul pentru fiecare grup de pagini, deci e minuscul când datele sunt inserate în ordinea timpului.
Scop: La tabele uriașe, append-only, vrei filtrare pe intervale de timp fără un index de zeci de GB.
Mecanism: Pentru fiecare bloc de pagini (implicit 128), BRIN ține un rezumat: min și max pentru `created_at`. La `WHERE created_at >= ...`, Postgres sare peste blocurile al căror interval nu se potrivește și citește doar blocurile candidate. Merge pentru că rândurile apropiate în timp stau fizic împreună.
Pas cu pas:
```text
bloc 1: 01.10 00:00 – 01.10 06:00
bloc 2: 01.10 06:00 – 01.10 12:00
...
WHERE created_at >= '2026-10-14'
  -> citește doar blocurile recente
```
Aplicare:
```sql
CREATE INDEX events_created_brin
  ON events USING BRIN (created_at);
```
Îl combini cu partiționarea pe timp (PG-07): partițiile fac retenția ușoară, iar BRIN filtrează în interiorul lor.
Legătură: Seamănă cu indexurile pe zile din Elasticsearch: pentru un interval cauți doar în bucățile care îl pot conține.
Limită: Dacă datele nu sunt ordonate fizic (inserări întârziate, UPDATE-uri care mută rânduri), intervalele blocurilor se suprapun și BRIN nu mai filtrează nimic. Pentru căutări punctuale, B-tree rămâne mai precis.
La interviu: „Pentru o tabelă append-only, inserată în ordinea timpului, folosesc un BRIN pe `created_at`: reține min și max pe blocuri de pagini, deci ocupă câțiva MB în loc de zeci de GB. Îl combin cu partiționarea pe timp.”
Verificare: Importi în aceeași tabelă date istorice, în ordine aleatoare de timp. Ce pățește BRIN-ul?
Răspuns verificare: Fiecare bloc ajunge să conțină date din tot intervalul, deci min și max acoperă aproape tot. BRIN nu mai poate sări peste blocuri, iar query-urile citesc aproape toată tabela.
Varianta greșită B: Hash nu ajută la intervale, doar la egalitate exactă, și nu e cel mai mic tip de index pentru o asemenea tabelă.
Varianta greșită C: GIN e pentru valori compuse (JSONB, array-uri, text). Pentru intervale de timp nu e potrivit.
Varianta greșită D: Un B-tree pe fiecare coloană ar ocupa zeci de GB și ar încetini fiecare inserare: exact opusul a ceea ce se cere.

### idx-08
Pe scurt: Postgres a citit toată tabela și a aruncat aproape 5 milioane de rânduri ca să păstreze câteva: lipsește un index utilizabil pentru filtru.
Scop: Știi să citești un plan și să recunoști semnalul clasic al unui index lipsă.
Mecanism: `Seq Scan` înseamnă citirea secvențială a întregii tabele. `Rows Removed by Filter` arată câte rânduri au fost citite și eliminate pentru că nu respectau condiția. Când numărul ăsta e uriaș față de rândurile întoarse, aproape toată munca e irosită.
Pas cu pas:
```text
Seq Scan on users
  Filter: (email = 'a@b.com')
  Rows Removed by Filter: 4999999
  -> 1 rând util din 5.000.000
fix: index pe email -> Index Scan
```
Aplicare: Citești planul de jos în sus și compari `rows` estimat cu `actual rows`. O diferență mare (10 estimate, 500.000 reale) indică statistici vechi, deci rulezi `ANALYZE`. Pentru detalii de I/O folosești `EXPLAIN (ANALYZE, BUFFERS)`.
Legătură: În Django, `queryset.explain(analyze=True)` îți dă exact acest plan, direct din cod.
Limită: Un Seq Scan nu e mereu o problemă: pe tabele mici sau când query-ul chiar are nevoie de majoritatea rândurilor, e varianta cea mai ieftină.
La interviu: „`Seq Scan` cu milioane de `Rows Removed by Filter` înseamnă că Postgres a citit toată tabela ca să găsească câteva rânduri: lipsește un index potrivit. Compar și rândurile estimate cu cele reale, ca să prind statisticile vechi.”
Verificare: După ce adaugi un index, planul arată `rows=1` estimat și `actual rows=480000`. Ce faci?
Răspuns verificare: Rulezi `ANALYZE` pe tabelă: statisticile sunt vechi, iar planner-ul alege planuri pe baza unor estimări greșite.
Varianta greșită B: Un index folosit ar apărea ca `Index Scan` sau `Bitmap Index Scan`, nu ca `Seq Scan`.
Varianta greșită C: Cache-ul nu schimbă tipul planului. Paginile pot veni din memorie, dar toate rândurile sunt tot citite.
Varianta greșită D: Un query paralel apare ca `Gather`, cu câțiva workeri, nu cu milioane de procese. Cifra e numărul de rânduri eliminate.

### idx-09
Pe scurt: Folosești `CREATE INDEX CONCURRENTLY`, în afara unei tranzacții: construiește indexul fără să blocheze scrierile.
Scop: Adaugi indexuri în producție, pe tabele mari, fără downtime și fără request-uri blocate minute în șir.
Mecanism: Un `CREATE INDEX` obișnuit ia un lock care blochează INSERT, UPDATE și DELETE cât construiește indexul. Varianta CONCURRENTLY ia un lock mai slab, face două treceri prin tabelă și așteaptă să se termine tranzacțiile vechi. Durează mai mult, dar scrierile continuă.
Pas cu pas:
```text
CREATE INDEX: scrierile așteaptă minute
CONCURRENTLY:
  trecerea 1 -> construiește indexul
  trecerea 2 -> adaugă ce s-a schimbat
  scrierile merg tot timpul
```
Aplicare: În Alembic:
```python
def upgrade():
    with op.get_context().autocommit_block():
        op.create_index(
            "ix_events_user_id", "events",
            ["user_id"],
            postgresql_concurrently=True)
```
Legătură: În Django ai `AddIndexConcurrently` din `django.contrib.postgres.operations`, într-o migrație cu `atomic = False`.
Limită: Dacă eșuează, de exemplu din cauza unui duplicat la un index UNIQUE, lasă un index INVALID, pe care îl ștergi cu `DROP INDEX CONCURRENTLY` și îl creezi din nou.
La interviu: „În producție creez indexurile cu `CREATE INDEX CONCURRENTLY`, în afara unei tranzacții: durează mai mult, dar nu blochează scrierile. Dacă eșuează, șterg indexul INVALID și reîncerc. În Alembic folosesc `autocommit_block`.”
Verificare: Rulezi `CREATE INDEX CONCURRENTLY` într-o migrație Alembic obișnuită, fără `autocommit_block`. Ce se întâmplă?
Răspuns verificare: Eșuează: `CONCURRENTLY` nu poate rula într-un bloc de tranzacție, iar Alembic rulează implicit migrațiile într-o tranzacție pe Postgres.
Varianta greșită B: Pe o tabelă mare, construirea indexului durează minute, iar varianta obișnuită blochează scrierile în tot acest timp.
Varianta greșită C: `SHARE MODE` blochează exact scrierile, adică problema pe care vrei s-o eviți.
Varianta greșită D: Se poate, cu `CONCURRENTLY`. Pentru un index nou nu ai nevoie de fereastră de mentenanță.

### idx-10
Pe scurt: În Elasticsearch, un index e o colecție de documente, aproximativ echivalentul unei tabele, stocată ca index inversat și împărțită în shard-uri.
Scop: La interviu, cuvântul „index” poate crea confuzie între Postgres și Elasticsearch. Arăți că știi ambele sensuri și le separi clar.
Mecanism: Documentele JSON trimise într-un index sunt analizate: textul e împărțit în termeni, iar pentru fiecare termen se ține lista documentelor care îl conțin (indexul inversat). Indexul e împărțit în shard-uri, distribuite pe nodurile clusterului, cu replici pentru disponibilitate.
Pas cu pas:
```text
POST logs-2026.10.15/_doc
  {"msg": "login failed"}
  -> analizor: ["login", "failed"]
  -> "login" -> [doc1, doc7, ...]
index = shard-uri pe noduri, cu replici
```
Aplicare: Ai lucrat deja cu Elasticsearch: indexurile pe zile (`logs-2026.10.15`), mapping-ul câmpurilor și aliasurile peste mai multe indexuri țin toate de acest concept.
Legătură: În Postgres, indexul e o structură care accelerează căutarea într-o tabelă. În Elasticsearch, indexul e locul în care stochezi documentele, cu structura de căutare inclusă.
Limită: Analogia cu tabela e aproximativă: indexurile ES nu au JOIN-uri sau tranzacții, iar numărul de shard-uri primare se alege la creare (schimbarea lui cere reindexare, split sau shrink).
La interviu: „În Elasticsearch, un index e o colecție de documente, cam ca o tabelă, împărțită în shard-uri, cu index inversat dedesubt. În Postgres, un index e o structură auxiliară pe o tabelă. Precizez mereu la care mă refer.”
Verificare: Cauți cuvântul `failed` într-un index ES cu 100 de milioane de loguri. De ce e rapid?
Răspuns verificare: Indexul inversat are deja termenul `failed`, cu lista documentelor care îl conțin. ES citește lista, în paralel pe shard-uri, fără să parcurgă documentele.
Varianta greșită B: Ăsta e sensul din Postgres. În ES, indexul e colecția de documente, iar structura de căutare e un index inversat, nu un B-tree pe un câmp.
Varianta greșită C: Un cluster conține mai multe indexuri. Aliasurile există, dar indică unul sau mai multe indexuri, nu tot clusterul.
Varianta greșită D: Logul de tranzacții (translog) e un fișier separat al fiecărui shard. Indexul e colecția de documente.

### idx-11
Pe scurt: `INCLUDE` adaugă `total` și `status` în frunzele indexului, fără să le facă parte din cheie, ca query-urile care cer doar aceste coloane să fie servite numai din index (index-only scan).
Scop: Elimini accesul la tabelă pentru un query foarte frecvent, de exemplu lista de comenzi a unui client, cu totalul și statusul.
Mecanism: Cheia indexului rămâne `customer_id`, deci căutarea și sortarea se fac după ea. `total` și `status` sunt copiate în fiecare intrare, ca un „bagaj”. Când query-ul cere doar `customer_id`, `total` și `status`, Postgres citește totul din index, fără să mai meargă în tabelă pentru fiecare rând.
Pas cu pas:
```text
SELECT total, status FROM orders
WHERE customer_id = 42;
fără INCLUDE: index, apoi tabela per rând
cu INCLUDE: doar indexul
  -> Index Only Scan
```
Aplicare: Verifici în plan că apare `Index Only Scan` și că `Heap Fetches` e aproape 0. Dacă nu, rulezi `VACUUM`, ca să actualizezi visibility map-ul.
Legătură: E ca un cuprins care conține deja răspunsul: dacă informația e acolo, nu mai deschizi capitolul.
Limită: Indexul devine mai mare, iar orice modificare a lui `total` sau `status` îl actualizează. Index-only scan merge bine doar când visibility map-ul e la zi, adică tabela e vacuum-ată des.
La interviu: „`INCLUDE` pune coloane suplimentare în frunzele indexului, fără să le facă parte din cheie, ca query-urile care cer doar acele coloane să fie servite printr-un index-only scan, fără acces la tabelă.”
Verificare: Query-ul devine `SELECT total, status, created_at ... WHERE customer_id = 42`. Mai e index-only scan?
Răspuns verificare: Nu: `created_at` nu e în index, deci Postgres trebuie să citească tabela pentru fiecare rând. Ar trebui adăugat și el în `INCLUDE`.
Varianta greșită B: Un index nu sortează fizic tabela. Coloanele din `INCLUDE` nici măcar nu fac parte din cheie.
Varianta greșită C: `INCLUDE` nu adaugă unicitate. Chiar și într-un index UNIQUE, unicitatea se aplică doar cheii, nu coloanelor din `INCLUDE`.
Varianta greșită D: Căutarea se face doar după cheie (`customer_id`). Coloanele din `INCLUDE` nu sunt sortate, deci nu ajută la filtrarea după `total` sau `status`.

### idx-12
Pe scurt: Un B-tree pe `email` ține valorile sortate, fiecare cu trimitere la rândul ei, deci găsești un email în câțiva pași, fără să citești toată tabela.
Scop: E fundația pentru restul întrebărilor despre indexuri: ce face un index și ce costă.
Mecanism: Indexul e un arbore echilibrat: rădăcina și nodurile intermediare împart intervalul de valori, iar frunzele conțin valorile sortate și adresa rândului în tabelă. O căutare coboară din rădăcină până la frunză în O(log n) pași. La 5 milioane de rânduri, asta înseamnă 3–4 pagini citite, nu 5 milioane de rânduri.
Pas cu pas:
```text
rădăcină: [a–k | l–z]
  -> nod: [ana… | bob… | …]
  -> frunză: 'ana@x.com' -> pagina 12
3–4 pagini citite, indiferent de mărime
```
Aplicare: B-tree-ul ajută la egalitate (`=`), intervale (`<`, `BETWEEN`), `ORDER BY` și, în anumite condiții, la prefixe (`LIKE 'abc%'`). Nu ajută la `LIKE '%abc'`.
Legătură: E indexul de la finalul unei cărți: lista sortată a termenilor, cu pagina fiecăruia. Elasticsearch folosește pentru text altă structură, indexul inversat.
Limită: Indexul costă spațiu și încetinește scrierile, pentru că fiecare INSERT și majoritatea UPDATE-urilor îl actualizează (IDX-04).
La interviu: „Un B-tree ține valorile sortate, cu trimiteri la rânduri, într-un arbore echilibrat: căutarea costă O(log n) în loc de O(n). Ajută la egalitate, intervale și sortare, iar costul e la scrieri și spațiu.”
Verificare: Ai un B-tree pe `email`, iar query-ul e `WHERE email LIKE '%@onapsis.com'`. Îl folosește?
Răspuns verificare: Nu: indexul e sortat după începutul valorii, iar o căutare după sfârșit nu știe de unde să înceapă. Pentru așa ceva există indexurile trigram (`pg_trgm`, cu GIN).
Varianta greșită B: Indexul nu comprimă coloana: e o structură în plus, care ocupă spațiu suplimentar.
Varianta greșită C: Indexul nu copiază tabela în memorie și nu accelerează toate query-urile, doar pe cele care filtrează sau sortează după `email`.
Varianta greșită D: Indexul nu validează formatul: pentru asta folosești un CHECK sau validare în aplicație. Doar un index UNIQUE respinge duplicatele.
