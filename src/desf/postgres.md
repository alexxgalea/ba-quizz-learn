<!-- Desfășurările fișei `postgres` (11 puncte). Format și reguli: lib.mjs (checkDesf), .scratch/desfasurari/spec.md. Faptele: research/interview-facts.md, secțiunile 15, 26 și 28. SQL în blocuri `text` (nerulat în check, rulat de mână pe Postgres 16). C++ doar la 3 (lost update) și 5 (deadlock): singurele două puncte cu echivalent real. -->

### harta
Problema: Mii de request-uri și workeri lovesc aceleași tabele în același timp. Fără reguli, două tranzacții își strică datele (lost update) sau se blochează una pe alta (deadlock), conexiunile se termină, tabela de evenimente crește fără limită, iar când totul încetinește nu știi de ce. Modulul răspunde la patru întrebări: ce vede fiecare tranzacție, cum eviți conflictele dintre ele, cum ții baza sănătoasă sub încărcare și cum afli ce o încetinește. La final adaugă două unelte pentru date.
Grupuri:
- 1–2: ce vede o tranzacție (versiunile rândurilor și nivelurile de izolare)
- 3–5: conflicte între tranzacții (update pierdut, coadă de joburi, deadlock)
- 6–8: baza sub încărcare (conexiuni, partiții, încărcări masive)
- 9–10: diagnostic și plase de siguranță (statistici, EXPLAIN, timeout-uri)
- 11: două unelte pentru date (JSONB și window functions)

### 1
Greu: da
Problema: Un raport citește zece minute o tabelă mare, în timp ce aplicația îi face UPDATE-uri. Dacă cititorul ar bloca scriitorii, aplicația ar îngheța. Dacă scriitorul ar suprascrie rândul pe loc, raportul ar vedea date pe jumătate schimbate.
Ideea: UPDATE nu modifică rândul pe loc, ci scrie o versiune nouă; cea veche rămâne cât timp o mai poate vedea o tranzacție. Fiecare tranzacție citește versiunile potrivite snapshot-ului ei, deci cititorii nu blochează scriitorii și nici invers. Versiunile moarte ocupă loc (bloat) până le curăță VACUUM; autovacuum rulează singur. VACUUM obișnuit doar marchează spațiul ca reutilizabil, nu îl întoarce sistemului de operare. O tranzacție veche rămasă deschisă după o scriere (sau la `REPEATABLE READ`) ține versiunile moarte în viață.
Exemplu:
```text
INSERT INTO t VALUES (1, 10);
SELECT ctid, v FROM t; -- → (0,1)
UPDATE t SET v = 11;
SELECT ctid, v FROM t; -- → (0,2)
-- versiunea (0,1) e moartă acum
```
Legătură: PG-03 și PG-04. De aceea o conexiune uitată „idle in transaction”, care a scris ceva (sau lucrează la `REPEATABLE READ`), umflă tabelele. Punctul 10 o oprește cu un timeout.

### 2
Greu: da
Problema: Un raport calculează totalul unui cont în două query-uri. Între ele, o altă tranzacție comite o plată. Al doilea query vede alt sold decât primul, deci cifrele raportului nu sunt din același moment.
Ideea: `READ COMMITTED` (implicit) dă fiecărui statement snapshot-ul de la începutul lui; de aceea al doilea query vede plata. `REPEATABLE READ` dă o singură poză pentru toată tranzacția, luată la primul statement, nu la `BEGIN`. `SERIALIZABLE` face ca rezultatul să fie ca al unei execuții pe rând; dacă nu poate, Postgres anulează tranzacția cu `40001`. Același cod apare la `REPEATABLE READ`, când modifici un rând schimbat între timp. Aplicația reia toată tranzacția.
Exemplu:
```text
BEGIN ISOLATION LEVEL
  REPEATABLE READ;
SELECT v FROM t; -- → 10
-- altă sesiune: UPDATE t SET v=99;
SELECT v FROM t; -- → 10
-- la READ COMMITTED ar fi fost 99
```
Legătură: PG-01. Django merge implicit pe `READ COMMITTED`; nivelul se schimbă din `OPTIONS` (`isolation_level`). Retry-ul e același ca la deadlock (punctul 5).

### 3
Greu: da
Problema: Doi workeri citesc stocul, 5. Fiecare scade 1 în Python și scrie 4. Stocul trebuia să ajungă la 3.
Ideea: Între citire și scriere, celălalt worker scrie. Patru remedii. Un `UPDATE` atomic (`SET qty = qty - 1`). `SELECT … FOR UPDATE`, care ține rândul blocat până la commit. O coloană `version` verificată în `WHERE`; dacă `rowcount` e 0, reiei. `SERIALIZABLE` cu retry. La `READ COMMITTED`, al doilea `FOR UPDATE` așteaptă, apoi primește versiunea nouă a rândului.
Exemplu:
```python
stoc = 5
a = stoc  # worker A citește
b = stoc  # worker B citește
stoc = a - 1
stoc = b - 1
print(stoc)  # → 4
```
```text
UPDATE stock SET qty = qty - 1;
```
În C++: `x = x - 1` pe un `int` partajat e același bug (data race); `fetch_sub(1)` pe un `std::atomic<int>` e `SET qty = qty - 1`, iar `std::mutex` seamănă cu `FOR UPDATE`.
Unde nu ține: Lock-ul de rând trăiește în bază, e văzut de toate procesele și ține până la `COMMIT` sau `ROLLBACK`, nu până la ieșirea din scope. Nu blochează `SELECT`-urile obișnuite, doar scriitorii și alte lock-uri.
Legătură: PG-02. În Django, `F("qty") - 1` și `select_for_update()` fac asta.

### 4
Greu: da
Problema: Patru workeri iau joburi din tabela `jobs` cu `SELECT … LIMIT 1`. Toți primesc același job. Cu `FOR UPDATE` simplu, unul lucrează, iar ceilalți trei așteaptă după el.
Ideea: `FOR UPDATE SKIP LOCKED` sare peste rândurile blocate de alții și le ia pe următoarele libere. Lock-ul ține până la `COMMIT`, deci preiei și procesezi jobul în aceeași tranzacție. Dacă workerul cade, rollback-ul eliberează jobul. Documentația avertizează că vederea asupra datelor e inconsistentă, așa că folosești asta doar pentru tabele-coadă.
Exemplu:
```text
BEGIN;
SELECT id FROM jobs
 WHERE status = 'new'
 ORDER BY id LIMIT 1
 FOR UPDATE SKIP LOCKED;
-- lucrezi, apoi UPDATE … 'done'
COMMIT;
```
Legătură: PG-05. E relay-ul din outbox (Design, punctul 3). Django: `select_for_update(skip_locked=True)`; SQLAlchemy: `with_for_update(skip_locked=True)`.

### 5
Greu: da
Problema: Două transferuri rulează în sensuri opuse: A→B și B→A. Primul a blocat contul 1 și cere contul 2. Al doilea a blocat contul 2 și cere contul 1. Fiecare așteaptă după celălalt.
Ideea: Postgres detectează ciclul după `deadlock_timeout` (1 s implicit) și anulează una dintre tranzacții cu `40P01`; cealaltă merge mai departe. Nu poți prevedea care e anulată. Prevenția: iei lock-urile mereu în aceeași ordine, de exemplu `ORDER BY id` la `SELECT … FOR UPDATE`. Plasa de siguranță: aplicația reia tranzacția anulată.
Exemplu:
```text
A: UPDATE acc SET b=b-10 WHERE id=1
B: UPDATE acc SET b=b-10 WHERE id=2
A: UPDATE acc SET b=b+10 WHERE id=2
B: UPDATE acc SET b=b+10 WHERE id=1
-- → ERROR: deadlock detected
```
În C++: Ciclul apare și cu doi `std::mutex`: un thread ia `m1`, apoi `m2`, altul invers. Remediul e același: ordine fixă sau `std::scoped_lock lk(m1, m2)` (C++17; `std::lock` în C++11), care le ia pe amândouă fără deadlock.
Unde nu ține: Deadlock-ul de mutex-uri nu-l detectează nimeni: thread-urile rămân blocate. Postgres anulează o tranzacție, deci aplicația trebuie să știe să reia.
Legătură: PG-08. Un task Celery anulat de un deadlock se reia cu `autoretry_for`.

### 6
Greu: da
Problema: 20 de replici de API au câte 10 conexiuni la bază, plus workerii Celery. Postgres are `max_connections` = 100 implicit. Cele 200 de conexiuni nu încap, iar cele noi sunt refuzate.
Ideea: Fiecare conexiune e un proces backend, cu memoria lui, deci nu poți ține mii. PgBouncer stă între aplicații și Postgres și împarte câteva conexiuni reale la mulți clienți. În modul `transaction`, clientul primește o conexiune reală doar cât durează tranzacția. De aceea nu merg lucrurile de sesiune: `SET` simplu, `LISTEN`, advisory lock-uri de sesiune. `SET LOCAL` merge, fiindcă ține cât tranzacția.
Analogie: Fără pooler, fiecare client are bucătarul lui, chiar și când stă la telefon. Cu pooler, bucătarii sunt puțini și lucrează pentru un client doar cât durează comanda lui.
Legătură: PG-06. Django cere `DISABLE_SERVER_SIDE_CURSORS = True` în transaction pooling. `SET LOCAL` e și varianta din Design, punctul 8.

### 7
Greu: da
Problema: Tabela de evenimente `ev` are 2 miliarde de rânduri. `DELETE` pe cele de peste 90 de zile durează ore și lasă versiuni moarte de curățat. Iar query-urile pe ultima oră umblă prin indexuri uriașe.
Ideea: Împarți tabela pe timp, câte o partiție pe lună. Un query cu filtru pe `ts` atinge doar partițiile potrivite (partition pruning). Retenția: `DETACH PARTITION`, apoi `DROP TABLE`, fără `DELETE` și fără VACUUM. Partițiile nu se creează singure; un `INSERT` fără partiție potrivită pică, deci le creezi dinainte. Cheia primară trebuie să includă `ts`.
Exemplu:
```text
CREATE TABLE ev (ts timestamptz)
  PARTITION BY RANGE (ts);
CREATE TABLE ev_11
  PARTITION OF ev
  FOR VALUES FROM ('2026-11-01')
  TO ('2026-12-01');
ALTER TABLE ev DETACH PARTITION
  ev_08; DROP TABLE ev_08;
```
Legătură: PG-07. La Elasticsearch, indexurile pe zi se șterg întregi, ca partițiile de aici.

### 8
Greu: da
Problema: Importi 5 milioane de rânduri dintr-un CSV cu un `INSERT` și un `COMMIT` pe rând. Durează ore: fiecare commit așteaptă ca jurnalul (WAL) să ajungă pe disc.
Ideea: `COPY` încarcă tot fluxul într-o singură comandă, cu mult mai puțin overhead decât `INSERT`-urile, chiar grupate într-o tranzacție. Dacă n-ai `COPY`, grupezi `INSERT`-urile în loturi, un commit per lot. Dacă o linie e greșită, tot `COPY`-ul pică. `COPY` nu are `ON CONFLICT`.
Exemplu:
```text
with cur.copy(
    "COPY ev FROM STDIN"
) as cp:
    for row in rows:
        cp.write_row(row)
```
Legătură: PG-09. Pentru bulk idempotent, SQLAlchemy are `on_conflict_do_nothing()`. `COPY FROM` nu merge pe tabele cu row-level security (Design, punctul 8).

### 9
Greu: da
Problema: Dashboard-ul e lent și nu știi din ce. Din 300 de query-uri diferite, unul rulează de 50.000 de ori pe oră și consumă cel mai mult timp în total, deși fiecare execuție e rapidă.
Ideea: `pg_stat_statements` adună statistici pe query normalizat (constantele devin `$1`): apeluri și timp. Îl sortezi după `total_exec_time` și vezi ce costă cel mai mult. Apoi `EXPLAIN (ANALYZE, BUFFERS)` pe query-ul găsit îl execută și arată timpii reali și paginile citite; un `UPDATE` îl pui între `BEGIN` și `ROLLBACK`. `auto_explain` scrie în log planul query-urilor mai lente decât un prag.
Exemplu:
```text
SELECT query, calls, total_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 5;
```
Legătură: PG-10 și PG-14. `pg_stat_statements` se încarcă din `shared_preload_libraries` (cu restart) și se activează cu `CREATE EXTENSION`. Planul îl citești ca la grilele de index.

### 10
Greu: da
Problema: O migrație cere un lock pe tabelă, dar o tranzacție veche încă o folosește. Migrația așteaptă, iar toate query-urile noi se aliniază în spatele ei. Aplicația îngheață.
Ideea: `lock_timeout` oprește așteptarea unui lock; migrația pică în câteva secunde, în loc să înghețe tot. `statement_timeout` oprește un statement care rulează prea mult. `idle_in_transaction_session_timeout` închide sesiunea care ține o tranzacție deschisă fără să facă nimic. Toate trei sunt 0, adică oprite, implicit. Le pui pe rol (`ALTER ROLE … SET`) sau pe tranzacție (`SET LOCAL`).
Exemplu:
```text
ALTER ROLE app
  SET statement_timeout = '30s';
BEGIN;
SET LOCAL lock_timeout = '2s';
ALTER TABLE t ADD COLUMN c int;
-- → ERROR: canceling statement
--   due to lock timeout
```
Legătură: PG-04. În Alembic pui `lock_timeout` la începutul migrației. Ultimul timeout rezolvă și conexiunea uitată de la punctul 1.

### 11
Greu: da
Problema: Fiecare tip de alertă are alte câmpuri, iar tabela a ajuns la 40 de coloane aproape goale. Mai ai nevoie și de ultima citire a fiecărui senzor, nu de toate.
Ideea: `JSONB` ține un document JSON binar într-o coloană, bun pentru câmpuri care variază. Un index GIN pe coloană accelerează operatorii de conținut (`@>`) și de existență a cheii, dar nu un filtru pe `payload->>'sev'`, care cere un index pe expresie. `ROW_NUMBER() OVER (PARTITION BY …)` numără rândurile fiecărui grup. Funcțiile fereastră nu merg în `WHERE`; filtrezi `rn = 1` într-un subquery.
Exemplu:
```text
SELECT * FROM alert
 WHERE payload @> '{"sev":"high"}';
SELECT * FROM (
  SELECT *, ROW_NUMBER() OVER (
    PARTITION BY sid
    ORDER BY ts DESC) rn
  FROM r) x
WHERE rn = 1;
```
Legătură: PG-11. GIN e un index inversat, ca cel din Elasticsearch. În Django: `payload__contains` și `Window(RowNumber())`.
