<!-- PostgreSQL, în formatul propus de Perplexity. Variantele greșite: B, C, D = ordinea din sursă (A e cea corectă). -->

### pg-02
Pe scurt: Rezultatul poate fi 400: ambele request-uri citesc 500, scad 100 în Python și scriu 400. O scădere se pierde (lost update).
Scop: Orice „citesc în aplicație, calculez, scriu înapoi” pe date folosite concurent poate pierde actualizări: solduri, stocuri, contoare.
Mecanism: În READ COMMITTED fiecare citire vede valoarea comisă în acel moment. Ambele request-uri citesc 500 înainte ca vreunul să scrie. Fiecare calculează 400 în Python și trimite `UPDATE ... SET balance = 400`. Al doilea UPDATE așteaptă lock-ul pe rând, apoi scrie tot 400.
Pas cu pas:
```text
A: SELECT balance -> 500
B: SELECT balance -> 500
A: UPDATE balance = 400; COMMIT
B: UPDATE balance = 400; COMMIT
Final: 400 (o scădere s-a pierdut)
```
Aplicare: Lași baza de date să facă scăderea, atomic:
```python
session.execute(
    update(Account).where(Account.id == 1)
    .values(balance=Account.balance - 100))
```
Sau blochezi rândul la citire: `session.get(Account, 1, with_for_update=True)`.
Legătură: În Django rezolvi la fel: `F("balance") - 100` în `update()` sau `select_for_update()` înainte de modificare.
Limită: În REPEATABLE READ sau SERIALIZABLE, al doilea commit ar eșua cu eroare de serializare, deci aplicația trebuie să reîncerce. În READ COMMITTED nu primești nicio eroare: pierderea e tăcută.
La interviu: „E un lost update: ambele request-uri citesc 500 în Python și scriu 400. Îl previn cu un UPDATE atomic în SQL (`balance = balance - 100`), cu `SELECT ... FOR UPDATE` sau cu versionare optimistă.”
Verificare: Ambele request-uri rulează direct `UPDATE accounts SET balance = balance - 100 WHERE id = 1`. Ce sold final obții?
Răspuns verificare: 300. Al doilea UPDATE așteaptă lock-ul pe rând, apoi recitește valoarea comisă (400) și scade din ea.
Varianta greșită B: Commit-urile se fac pe rând, dar valorile au fost calculate în Python din aceeași citire veche: fiecare request scrie 400.
Varianta greșită C: Eroarea de serializare apare în REPEATABLE READ sau SERIALIZABLE. În READ COMMITTED, nivelul implicit, al doilea UPDATE trece fără eroare.
Varianta greșită D: Un deadlock cere un ciclu: două tranzacții care țin fiecare un lock de care are nevoie cealaltă. Pe un singur rând, a doua tranzacție doar așteaptă.

### pg-03
Pe scurt: MVCC (Multi-Version Concurrency Control) înseamnă că Postgres păstrează mai multe versiuni ale unui rând, așa că citirile nu așteaptă după scrieri.
Scop: Vrei ca rapoartele și API-ul să poată citi în timp ce alte tranzacții scriu, fără să stea la coadă după lock-uri.
Mecanism: Un UPDATE nu suprascrie rândul: scrie o versiune nouă și o lasă pe cea veche celor care încă o văd. Fiecare tranzacție citește dintr-un snapshot: vede doar versiunile comise înainte de snapshot-ul ei. Versiunile pe care nu le mai vede nimeni sunt șterse de VACUUM.
Pas cu pas:
```text
rând 7: v1 (stoc 10)
T1: UPDATE stoc = 9 -> v2, necomisă
T2: SELECT -> vede v1 (10), nu așteaptă
T1: COMMIT
T2: SELECT nou -> vede v2 (9)
VACUUM: șterge v1 când n-o mai vede nimeni
```
Aplicare: Ții tranzacțiile scurte și lași autovacuum pornit. Pe tabelele cu multe UPDATE-uri urmărești rândurile moarte (`n_dead_tup` din `pg_stat_user_tables`).
Legătură: De aceea, în Django, un SELECT din alt request nu se blochează cât `transaction.atomic()` modifică același rând.
Limită: MVCC elimină doar blocarea între cititori și scriitori. Două UPDATE-uri pe același rând tot se așteaptă una pe alta.
La interviu: „Postgres folosește MVCC: un UPDATE creează o versiune nouă a rândului, iar fiecare tranzacție citește din snapshot-ul ei, deci cititorii nu blochează scriitorii. Costul: versiunile moarte trebuie curățate de VACUUM, iar o tranzacție lungă împiedică curățarea.”
Verificare: O tranzacție de raport rămâne deschisă 3 ore, în timp ce aplicația face milioane de UPDATE-uri. Ce pățesc tabelele?
Răspuns verificare: Se umflă (bloat): VACUUM nu poate șterge versiunile vechi cât timp tranzacția lungă le-ar putea vedea, așa că query-urile devin mai lente.
Varianta greșită B: MVCC nu e un tip de index, ci felul în care Postgres gestionează versiunile rândurilor din tabelă. Tipurile de index sunt B-tree, GIN, BRIN etc.
Varianta greșită C: Replicarea între servere e alt mecanism (streaming de WAL, replicare logică). MVCC funcționează în interiorul unui singur server.
Varianta greșită D: `pg_basebackup` face o copie fizică a întregii baze; nu are legătură cu versiunile rândurilor.

### pg-04
Pe scurt: O tranzacție deschisă și uitată ține lock-uri și un snapshot vechi: blochează alte scrieri și oprește VACUUM, deci tabelele se umflă și totul încetinește.
Scop: Un singur request care deschide o tranzacție și se agață (de exemplu așteptând un API extern) poate încetini toată baza de date.
Mecanism: Lock-urile luate de UPDATE sau `SELECT ... FOR UPDATE` se eliberează abia la COMMIT sau ROLLBACK, deci alți scriitori așteaptă. Snapshot-ul tranzacției ține „în viață” versiunile vechi ale rândurilor: VACUUM nu le poate curăța cât timp ea le-ar putea vedea.
Pas cu pas:
```text
10:00 BEGIN; UPDATE orders ... (lock)
10:00 apel HTTP extern... se agață
10:05 alt request: UPDATE același rând -> așteaptă
ore la rând: VACUUM nu curăță nimic nou
-> așteptări pe lock-uri + bloat
```
Aplicare: Setezi `idle_in_transaction_session_timeout` (de exemplu 60 s) și găsești conexiunile cu `SELECT pid, xact_start FROM pg_stat_activity WHERE state = 'idle in transaction'`. În cod: niciun apel extern în interiorul tranzacției.
Legătură: În Django, cu `ATOMIC_REQUESTS = True`, tot request-ul e o tranzacție: un apel lent la alt serviciu din view ține tranzacția deschisă tot atât.
Limită: Starea „idle in transaction” pentru câteva milisecunde, între query-urile aceleiași tranzacții, e normală. Problema e durata.
La interviu: „O conexiune idle in transaction ține lock-urile și snapshot-ul tranzacției: blochează alte scrieri și împiedică VACUUM să curețe, deci apare bloat. Pun `idle_in_transaction_session_timeout` și nu fac apeluri externe în tranzacție.”
Verificare: Ai setat `idle_in_transaction_session_timeout = 60s`. O tranzacție așteaptă 2 minute un API extern, fără să trimită query-uri. Ce face Postgres?
Răspuns verificare: După 60 de secunde închide sesiunea: tranzacția e anulată, iar lock-urile se eliberează. Aplicația primește o eroare la următorul query.
Varianta greșită B: O conexiune care nu face nimic nu consumă CPU. Consumă memorie (un proces pe server) și, mai grav, ține lock-uri și un snapshot vechi.
Varianta greșită C: Postgres nu anulează tranzacțiile celorlalți din cauza ei. Ele doar așteaptă lock-urile pe care le ține tranzacția deschisă.
Varianta greșită D: Pericolul vine tocmai din ce ține deschis, nu din ce execută: lock-urile și snapshot-ul rămân active până la COMMIT sau ROLLBACK.

### pg-05
Pe scurt: `SELECT ... FOR UPDATE SKIP LOCKED LIMIT 1` blochează jobul ales, iar ceilalți workeri sar peste el și iau următorul job liber.
Scop: Mai mulți workeri iau joburi din aceeași tabelă fără să proceseze de două ori același job și fără să se aștepte unul pe altul.
Mecanism: `FOR UPDATE` pune un lock pe rândul selectat până la finalul tranzacției. Fără `SKIP LOCKED`, al doilea worker ar aștepta după același rând. Cu `SKIP LOCKED`, query-ul ignoră rândurile deja blocate și întoarce primul rând liber.
Pas cu pas:
```text
jobs: 1, 2, 3 (pending)
W1: ... FOR UPDATE SKIP LOCKED LIMIT 1 -> 1
W2: același query -> 1 e blocat, sare -> 2
W1: procesează 1, status = 'done', COMMIT
```
Aplicare:
```sql
BEGIN;
SELECT id FROM jobs
WHERE status = 'pending'
ORDER BY id
FOR UPDATE SKIP LOCKED
LIMIT 1;
-- procesezi, apoi UPDATE status
COMMIT;
```
Legătură: E același model ca o coadă RabbitMQ cu mai mulți consumatori, dar în Postgres: lock-ul pe rând ține locul ack-ului.
Limită: Lock-ul durează cât tranzacția. Dacă procesarea e lungă, marchezi jobul `running`, faci commit și procesezi în afara tranzacției, ca să nu ții tranzacția deschisă.
La interviu: „Pentru o coadă simplă în Postgres folosesc `SELECT ... FOR UPDATE SKIP LOCKED LIMIT 1`: fiecare worker blochează un job, ceilalți sar peste el. Nu am contenție și nici dublă procesare. Pentru volum mare sau routing complex aleg un broker.”
Verificare: Doi workeri rulează query-ul doar cu `FOR UPDATE`, fără `SKIP LOCKED`. Ce face al doilea cât timp primul procesează jobul 1?
Răspuns verificare: Așteaptă până când primul face commit și abia apoi primește un job. Workerii ajung să lucreze pe rând, nu în paralel.
Varianta greșită B: Fără lock, doi workeri pot citi același job în același timp și îl procesează amândoi.
Varianta greșită C: Un lock pe toată tabela face ca doar un worker să ia un job odată, iar ceilalți așteaptă. Merge, dar pierzi paralelismul.
Varianta greșită D: `FOR SHARE` e un lock partajat: doi workeri îl pot ține pe același rând simultan, deci nu previne dubla procesare.

### pg-06
Pe scurt: Fiecare conexiune Postgres e un proces pe server; PgBouncer pune multe conexiuni din aplicații pe puține conexiuni reale.
Scop: Cu sute de workeri Celery și replici de API, fiecare cu pool-ul lui, ajungi la mii de conexiuni: depășești `max_connections`, iar serverul își irosește memoria pe procese care stau degeaba.
Mecanism: Aplicația se conectează la PgBouncer ca la un Postgres obișnuit. PgBouncer ține un pool mic de conexiuni reale și i-o împrumută unui client doar cât rulează o tranzacție (transaction pooling), apoi o dă altuia.
Pas cu pas:
```text
300 workeri + 20 API × pool 5
  -> 400 conexiuni client
  -> PgBouncer (transaction pooling)
  -> 40 conexiuni reale la Postgres
```
Aplicare: Pui PgBouncer între aplicații și DB, în transaction pooling, și dimensionezi pool-ul real după resursele serverului DB, nu după numărul de workeri.
Legătură: E aceeași idee ca un load balancer în fața aplicației: un strat care împarte o resursă scumpă între mulți clienți.
Limită: În transaction pooling, ce ține de sesiune (`SET`, advisory locks, prepared statements, `LISTEN`) nu e sigur, pentru că următoarea tranzacție poate primi altă conexiune reală.
La interviu: „În Postgres fiecare conexiune e un proces cu memoria lui, iar `max_connections` e limitat. Cu sute de workeri pun PgBouncer în transaction pooling: multe conexiuni client, puține conexiuni reale. Am grijă la ce ține de sesiune: `SET`, advisory locks, prepared statements.”
Verificare: Ai 50 de workeri Celery, fiecare cu un pool SQLAlchemy de 10 conexiuni, și `max_connections = 200`. Ce se întâmplă la un vârf de trafic, fără PgBouncer?
Răspuns verificare: Se cer până la 500 de conexiuni. După 200, cele noi sunt refuzate („too many clients”), iar task-urile eșuează.
Varianta greșită B: TLS se configură direct în Postgres (`ssl = on`). PgBouncer poate face și TLS, dar nu de asta ai nevoie de el aici.
Varianta greșită C: Backup-urile se fac cu `pg_basebackup`, pgBackRest sau snapshot-uri. PgBouncer doar rutează conexiuni.
Varianta greșită D: PgBouncer nu cache-uiește rezultate: fiecare query ajunge la Postgres. Pentru cache folosești Redis.

### pg-07
Pe scurt: Partiționezi tabela pe timp: query-urile pe ultimele 7 zile citesc doar partițiile recente, iar datele vechi le scoți instant, ștergând partiția lor.
Scop: Tabela crește continuu; vrei citiri rapide pe datele recente și o retenție care nu încarcă baza în fiecare noapte.
Mecanism: Cu partiționare declarativă (`PARTITION BY RANGE (created_at)`), Postgres ține câte o tabelă fizică pe zi sau pe lună. Un `WHERE created_at > ...` citește doar partițiile care pot conține rânduri (partition pruning). Retenția înseamnă să desprinzi partiția veche (`DETACH PARTITION`) și s-o ștergi cu `DROP TABLE`: dispare o tabelă întreagă, fără să atingi rândurile unul câte unul.
Pas cu pas:
```text
events (tabela logică)
  ├ events_2026_07  -> DROP
  ├ events_2026_08
  ├ events_2026_09
  └ events_2026_10  <- query 7 zile
```
Aplicare:
```sql
CREATE TABLE events (id bigint, created_at timestamptz)
  PARTITION BY RANGE (created_at);
CREATE TABLE events_2026_10 PARTITION OF events
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
-- retenție:
ALTER TABLE events DETACH PARTITION events_2026_07;
DROP TABLE events_2026_07;
```
Partițiile viitoare le creezi automat (job programat sau extensia pg_partman).
Legătură: E ca indexurile zilnice din Elasticsearch (`logs-2026.10.15`) cu politică de retenție: ștergi un index întreg, nu documente.
Limită: Query-urile fără filtru pe cheia de partiționare citesc toate partițiile. Cheile primare și unice trebuie să includă coloana de partiționare.
La interviu: „Pentru evenimente cu retenție folosesc partiționare pe timp: partition pruning pentru citirile recente, iar pentru retenție desprind și șterg partițiile vechi, instant, fără DELETE masiv și fără bloat.”
Verificare: Rulezi zilnic `DELETE FROM events WHERE created_at < now() - interval '90 days'` pe o tabelă nepartiționată. Ce rămâne în urmă?
Răspuns verificare: Milioane de versiuni moarte de rânduri (bloat), pe care VACUUM trebuie să le curețe, plus mult I/O și WAL în timpul ștergerii.
Varianta greșită B: DELETE-ul masiv marchează rândurile ca șterse, generează mult WAL și lasă bloat pentru VACUUM. Citirile tot parcurg o tabelă uriașă.
Varianta greșită C: Redis ține totul în RAM: 50M de rânduri pe lună, păstrate 90 de zile, ar costa enorm, iar tu ai pierde SQL-ul și durabilitatea.
Varianta greșită D: Tabelele per client rezolvă altă problemă (izolarea datelor), nu retenția pe timp. Le-ai crea manual și n-ai avea pruning după dată.

### pg-08
Pe scurt: Un deadlock apare când două tranzacții se așteaptă reciproc. Postgres îl detectează, anulează una dintre ele, iar aplicația face retry.
Scop: Când două request-uri modifică aceleași rânduri în ordine diferită, se pot bloca reciproc. Trebuie să știi ce eroare primești și cum previi situația.
Mecanism: T1 blochează rândul A și vrea B; T2 blochează B și vrea A, deci niciuna nu poate continua. După `deadlock_timeout` (implicit 1 s), Postgres verifică dacă există un ciclu de așteptare. Dacă găsește unul, anulează una dintre tranzacții cu eroarea „deadlock detected”.
Pas cu pas:
```text
T1: UPDATE cont A  (lock A)
T2: UPDATE cont B  (lock B)
T1: UPDATE cont B  -> așteaptă T2
T2: UPDATE cont A  -> așteaptă T1 => ciclu
Postgres: anulează T2, T1 continuă
```
Aplicare: Iei lock-urile mereu în aceeași ordine, de exemplu sortând id-urile, și prinzi eroarea ca să reîncerci toată tranzacția.
```python
rows = session.scalars(
    select(Account).where(Account.id.in_(ids))
    .order_by(Account.id).with_for_update()).all()
```
Legătură: În Django eroarea iese din blocul `transaction.atomic()`, iar retry-ul îl faci tu, pentru tot blocul.
Limită: Dacă T2 doar așteaptă după T1, fără un ciclu, nu e deadlock, ci un simplu lock wait: Postgres nu anulează nimic, iar T2 continuă când T1 termină.
La interviu: „Un deadlock e un ciclu de așteptare: T1 ține A și vrea B, T2 ține B și vrea A. Postgres îl detectează și anulează una dintre tranzacții. Îl previn luând lock-urile mereu în aceeași ordine și fac retry pe eroare.”
Verificare: Două transferuri, A→B și B→A, sortează întâi id-urile conturilor și le blochează în ordine crescătoare. Mai poate apărea deadlock între ele?
Răspuns verificare: Nu: amândouă încearcă să blocheze întâi contul cu id-ul mai mic, deci a doua tranzacție așteaptă după prima, fără ciclu.
Varianta greșită B: O tranzacție lungă poate ține lock-uri și încetini alte tranzacții, dar fără un ciclu de așteptare nu e deadlock.
Varianta greșită C: Un index corupt e o problemă rară de integritate, rezolvată cu REINDEX. Nu are legătură cu deadlock-ul.
Varianta greșită D: Dacă se pierde conexiunea, Postgres face rollback și eliberează lock-urile. Nu rămân lock-uri agățate.

### pg-09
Pe scurt: COPY trimite datele printr-un singur flux, cu overhead minim per rând: e cel mai rapid mod de a încărca milioane de rânduri.
Scop: La importuri mari (CSV-uri, migrări de date, backfill-uri), diferența dintre minute și ore vine din costul fix plătit pentru fiecare rând.
Mecanism: Fiecare INSERT separat costă un drum dus-întors între client și server, plus parsare. Fiecare commit forțează o scriere sincronă pe disc (fsync al WAL-ului). COPY trimite toate rândurile într-o singură comandă, iar serverul le scrie direct.
Pas cu pas:
```text
INSERT + commit per rând: 10M × (round-trip + fsync)
INSERT în loturi de 1.000: 10.000 × round-trip
COPY: o comandă, un flux de date
```
Aplicare: Cu psycopg 3:
```python
with conn.cursor() as cur:
    with cur.copy("COPY events (ts, type) FROM STDIN") as cp:
        for row in rows:
            cp.write_row(row)
```
Pentru volume medii, `session.execute(insert(Event), lista_de_dict)` trimite inserturile în loturi.
Legătură: Echivalentul Django pentru volume medii e `bulk_create(batch_size=...)`; pentru milioane de rânduri tot COPY câștigă.
Limită: Un rând invalid oprește tot COPY-ul. Validezi datele înainte sau încarci întâi într-o tabelă de staging. Din PostgreSQL 17, opțiunea `ON_ERROR ignore` poate sări peste rândurile cu valori invalide.
La interviu: „Pentru 10M de rânduri folosesc COPY, de exemplu `cursor.copy()` din psycopg 3: un singur flux, overhead minim per rând. Pentru volume medii fac inserturi în loturi; niciodată commit după fiecare rând.”
Verificare: Încarci 1M de rânduri cu câte un `session.add()` și un singur `commit()` la final. Care e principala problemă?
Răspuns verificare: Overhead-ul ORM: un milion de obiecte Python construite, ținute în memorie și urmărite de sesiune. Merge, dar e mult mai lent și mai scump decât COPY sau un insert în bulk.
Varianta greșită B: Un singur commit evită fsync-ul per rând, dar 10M de obiecte ORM țin memoria ocupată și sesiunea le urmărește pe toate: lent și riscant.
Varianta greșită C: E cea mai lentă variantă: 10M de drumuri dus-întors și 10M de scrieri sincrone pe disc.
Varianta greșită D: Adaugă peste fiecare rând un request HTTP, serializare și validare: ore în loc de minute.

### pg-10
Pe scurt: `pg_stat_statements` adună statistici pentru fiecare formă de query; îl sortezi după timpul total ca să vezi ce costă cel mai mult.
Scop: Vrei să optimizezi ce contează: query-ul care, adunat peste toate rulările, consumă cel mai mult din timpul bazei de date.
Mecanism: Extensia normalizează query-urile (înlocuiește valorile cu `$1`, `$2`) și ține pentru fiecare formă numărul de apeluri, timpul total, timpul mediu și rândurile întoarse. Sortate după `total_exec_time`, primele rânduri sunt candidații de optimizat.
Pas cu pas:
```text
X: 5 ms × 1.000.000 apeluri = 5.000 s
Y: 10 s × 10 apeluri         =   100 s
=> X costă de 50 de ori mai mult, deși e „rapid”
```
Aplicare:
```sql
SELECT query, calls, total_exec_time, mean_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```
Apoi rulezi `EXPLAIN (ANALYZE, BUFFERS)` pe primele.
Legătură: În Django ai văzut query-urile per request cu Django Debug Toolbar. `pg_stat_statements` e aceeași idee, dar pentru toată baza și în producție.
Limită: Extensia trebuie încărcată (`shared_preload_libraries`) și creată cu `CREATE EXTENSION`. Statisticile se adună de la ultimul reset, deci compari perioade comparabile.
La interviu: „Pornesc de la `pg_stat_statements`, sortat după timpul total: un query de 5 ms rulat de un milion de ori poate costa mai mult decât unul de 10 s. Apoi fac EXPLAIN ANALYZE pe primele și compar cu ce arată APM-ul, de exemplu New Relic.”
Verificare: Query-ul A durează 2 ms și rulează de 3 milioane de ori pe zi. Query-ul B durează 4 s și rulează de 100 de ori pe zi. Pe care îl optimizezi întâi, ca să reduci încărcarea bazei?
Răspuns verificare: Pe A: 6.000 s pe zi, față de 400 s pentru B. Pe B îl optimizezi întâi doar dacă problema e latența unui anumit endpoint.
Varianta greșită B: Logurile aplicației arată request-uri, nu cât timp petrece fiecare query în DB. Manual nu poți aduna milioane de apeluri.
Varianta greșită C: `pg_tables` doar listează tabelele. Dimensiunea unei tabele nu spune ce query-uri sunt scumpe.
Varianta greșită D: Restartul golește cache-urile și te lasă fără date relevante, iar CPU-ul total nu spune ce query îl consumă.

### pg-11
Pe scurt: Pune un număr de ordine (1, 2, 3...) pe rândurile fiecărui user, de la cel mai recent, fără să reducă numărul de rânduri.
Scop: Răspunzi la întrebări ca „ultimul eveniment al fiecărui user” sau „ultimele 3 alerte per sistem”, greu de scris doar cu `GROUP BY`.
Mecanism: `PARTITION BY user_id` împarte rândurile în grupuri, câte unul per user. `ORDER BY created_at DESC` le ordonează în fiecare grup. `ROW_NUMBER()` dă 1 primului rând din grup, 2 celui de-al doilea și așa mai departe. Toate rândurile rămân în rezultat, fiecare cu numărul lui.
Pas cu pas:
```text
user 1, 10:05 -> rn 1
user 1, 09:00 -> rn 2
user 2, 11:30 -> rn 1
user 2, 08:15 -> rn 2
user 2, 07:00 -> rn 3
```
Aplicare:
```sql
WITH r AS (
  SELECT *, ROW_NUMBER() OVER (
    PARTITION BY user_id
    ORDER BY created_at DESC) AS rn
  FROM events)
SELECT * FROM r WHERE rn = 1;
```
Legătură: În Django scrii asta cu `Window(RowNumber(), partition_by=...)`. Pentru cazul „doar ultimul”, Postgres are și `DISTINCT ON (user_id)`.
Limită: `PARTITION BY` de aici nu are legătură cu partiționarea tabelelor: e doar gruparea din funcția fereastră. Nu poți filtra direct `WHERE rn = 1` în același SELECT; ai nevoie de un subquery sau de un CTE.
La interviu: „`ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC)` numerotează evenimentele fiecărui user de la cel mai recent, fără să le comprime ca GROUP BY. Filtrez `rn = 1` într-un CTE ca să iau ultimul eveniment per user.”
Verificare: Vrei cele mai recente 3 alerte pentru fiecare sistem. Ce schimbi în query?
Răspuns verificare: `PARTITION BY system_id ORDER BY created_at DESC`, iar în query-ul exterior filtrezi `WHERE rn <= 3`.
Varianta greșită B: Funcția doar numerotează; nu șterge nimic. Ca să deduplici, filtrezi tu `rn = 1` și abia apoi poți șterge restul.
Varianta greșită C: `PARTITION BY` din `OVER` grupează rândurile pentru calcul; nu creează partiții de tabelă.
Varianta greșită D: Agregarea într-un singur rând per user o face `GROUP BY`. Funcțiile fereastră păstrează toate rândurile.

### pg-12
Pe scurt: O tranzacție face ca toți pașii să se aplice împreună sau deloc: dacă ceva eșuează, ROLLBACK readuce baza la starea de dinainte.
Scop: Nu vrei niciodată operații făcute pe jumătate: bani scăzuți dintr-un cont și neadăugați în celălalt, o comandă salvată fără liniile ei.
Mecanism: Între BEGIN și COMMIT, modificările sunt provizorii. COMMIT le face permanente și vizibile pentru ceilalți; ROLLBACK, sau o cădere înainte de COMMIT, le anulează pe toate. Postgres garantează asta prin WAL: după un crash rămân doar tranzacțiile comise.
Pas cu pas:
```text
BEGIN
UPDATE conturi SET sold = sold - 100 WHERE id = 1
UPDATE conturi SET sold = sold + 100 WHERE id = 2
COMMIT  -> ambele modificări se văd
eroare înainte de COMMIT -> ROLLBACK: niciuna
```
Aplicare:
```python
with session.begin():
    debit(session, from_id, 100)
    credit(session, to_id, 100)
# commit la ieșire, rollback la excepție
```
Legătură: E exact `with transaction.atomic():` din Django.
Limită: Atomicitatea nu înseamnă izolare totală: ce văd ceilalți în timpul tranzacției depinde de nivelul de izolare. Efectele externe (un email trimis, un mesaj publicat) nu se anulează la ROLLBACK.
La interviu: „O tranzacție grupează operațiile într-o unitate atomică: COMMIT le aplică pe toate, ROLLBACK le anulează pe toate. Ce văd ceilalți între timp depinde de nivelul de izolare.”
Verificare: În aceeași tranzacție scazi bani dintr-un cont, trimiți un email de confirmare, apoi al doilea UPDATE eșuează. Ce se anulează?
Răspuns verificare: UPDATE-ul deja făcut se anulează (ROLLBACK). Emailul rămâne trimis: efectele externe nu fac parte din tranzacție, de aceea le declanșezi după commit.
Varianta greșită B: E invers: în tranzacție nimic nu e definitiv până la COMMIT. Tocmai asta face posibilă anularea.
Varianta greșită C: Pașii unei tranzacții rulează în ordine, pe aceeași conexiune. Tranzacția nu paralelizează nimic.
Varianta greșită D: În Postgres, cititorii nu sunt blocați de o tranzacție care scrie (MVCC): ei văd ultima versiune comisă.

### pg-13
Pe scurt: LEFT JOIN păstrează toți userii, inclusiv pe cei fără comenzi, cu NULL în coloanele comenzii; INNER JOIN îi păstrează doar pe cei cu cel puțin o comandă.
Scop: Tipul de JOIN decide ce rânduri apar în raport. Un dashboard cu „toți userii și numărul lor de comenzi” are nevoie și de userii cu 0 comenzi.
Mecanism: INNER JOIN întoarce doar perechile (user, comandă) care respectă condiția. LEFT JOIN întoarce fiecare rând din tabela din stânga; când nu găsește pereche, completează coloanele din dreapta cu NULL.
Pas cu pas:
```text
users: Ana (1), Dan (2)
orders: #10 (user 1)
INNER: Ana  #10
LEFT:  Ana  #10
       Dan  NULL
```
Aplicare:
```sql
SELECT u.name, count(o.id) AS orders
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.name;
```
`count(o.id)` dă 0 pentru Dan, pentru că ignoră valorile NULL.
Legătură: În Django, `User.objects.annotate(n=Count("orders"))` generează un LEFT OUTER JOIN, ca să nu piardă userii fără comenzi.
Limită: Un `WHERE o.status = 'paid'` după LEFT JOIN elimină rândurile cu NULL și transformă, de fapt, join-ul în INNER. Condiția pe tabela din dreapta o pui în `ON`.
La interviu: „INNER JOIN întoarce doar potrivirile; LEFT JOIN păstrează toate rândurile din stânga și pune NULL unde nu există potrivire. Cu `LEFT JOIN ... WHERE orders.id IS NULL` găsesc userii fără comenzi.”
Verificare: Vrei toți userii, iar lângă fiecare doar comenzile plătite. Unde pui `o.status = 'paid'`: în `ON` sau în `WHERE`?
Răspuns verificare: În `ON`. În `WHERE` ar elimina userii fără comenzi plătite, ca la un INNER JOIN.
Varianta greșită B: E invers: INNER JOIN îi elimină pe userii fără comenzi, iar LEFT JOIN îi păstrează.
Varianta greșită C: Nu sunt echivalente: diferă exact pentru rândurile fără potrivire. Ambele fac parte din standardul SQL.
Varianta greșită D: LEFT JOIN poate întoarce coloane din ambele tabele. „Left” arată doar tabela ale cărei rânduri le păstrezi pe toate.

### pg-14
Pe scurt: EXPLAIN arată planul estimat, fără să ruleze query-ul; EXPLAIN ANALYZE îl rulează și adaugă timpii și numărul real de rânduri.
Scop: Când un query e lent, vrei să vezi ce face Postgres de fapt: dacă folosește indexul, unde se pierde timpul și unde se înșală estimările.
Mecanism: Planner-ul alege un plan pe baza statisticilor: câte rânduri crede că trec de fiecare filtru. EXPLAIN îți arată planul și aceste estimări. EXPLAIN ANALYZE execută planul și pune lângă fiecare pas timpul și rândurile reale, ca să compari estimarea cu realitatea.
Pas cu pas:
```text
EXPLAIN:
  Seq Scan on users (rows=1, estimat)
EXPLAIN ANALYZE:
  Seq Scan on users (actual rows=1, 812 ms)
  Rows Removed by Filter: 4999999
```
Aplicare:
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM users WHERE email = 'a@b.com';
```
Pentru UPDATE sau DELETE: `BEGIN; EXPLAIN ANALYZE UPDATE ...; ROLLBACK;`.
Legătură: În Django, `queryset.explain(analyze=True)` face același lucru pe Postgres.
Limită: EXPLAIN ANALYZE chiar execută query-ul: pentru un query de 10 minute aștepți 10 minute, iar un DELETE chiar șterge (de aceea ROLLBACK). Comanda separată `ANALYZE tabel` actualizează statisticile; e alt lucru.
La interviu: „Folosesc EXPLAIN pentru planul estimat și EXPLAIN (ANALYZE, BUFFERS) ca să văd timpii și rândurile reale. Compar estimările cu realitatea: diferențele mari înseamnă statistici vechi.”
Verificare: EXPLAIN ANALYZE arată, la un pas, 10 rânduri estimate și 2.000.000 de rânduri reale. Ce bănuiești?
Răspuns verificare: Statistici învechite: planner-ul a ales planul pe baza unei estimări greșite. Rulezi `ANALYZE` pe tabelă și verifici din nou planul.
Varianta greșită B: Statisticile le actualizează comanda separată `ANALYZE tabel` (sau autovacuum). EXPLAIN ANALYZE doar rulează query-ul și măsoară.
Varianta greșită C: E invers: EXPLAIN doar estimează, iar EXPLAIN ANALYZE rulează query-ul.
Varianta greșită D: Formatul îl alegi cu `FORMAT JSON`. ANALYZE adaugă măsurătorile reale; nu schimbă formatul.
