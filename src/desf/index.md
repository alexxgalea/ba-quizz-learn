<!-- Desfășurările fișei `index` (11 puncte). Format și reguli: lib.mjs (checkDesf), .scratch/desfasurari/spec.md. Faptele: research/interview-facts.md, secțiunea 29 (Postgres 16, Elasticsearch, C++ cu structuri de date) și 15 (CONCURRENTLY). Exemplele SQL sunt ```text (nu se rulează aici; verificate pe Postgres 16 la scriere). -->

### harta
Problema: O tabelă ajunge la zeci de milioane de rânduri, iar un query simplu, după email, trece de la milisecunde la secunde, fiindcă baza citește tot tabelul. Un index repară asta, dar se plătește la fiecare scriere și poate fi ocolit fără să observi. Modulul spune ce e un index și ce costă, ce coloane indexezi și cum, ce tip alegi, cum îl construiești fără să oprești aplicația și cum verifici că se folosește. Ultimul punct lămurește cuvântul „index” din Elasticsearch.
Grupuri:
- 1–2: ce e un index și ce plătești pentru el
- 3–6: ce și cum indexezi (coloane, compus, selectivitate, expresii)
- 7–8: ce tip de index alegi și cum acoperi un query întreg
- 9–10: cum îl construiești în producție și cum verifici că merge
- 11: „index” în Elasticsearch, un alt înțeles

### 1
Problema: `WHERE email = $1` durează secunde pe 5 milioane de rânduri. Postgres citește tot tabelul (full scan).
Ideea: Indexul e o structură sortată după coloană, cu pointeri spre rânduri. B-tree-ul implicit din Postgres coboară ca o căutare binară: O(log n), nu O(n).
Exemplu:
```python
k = 765_432  # cheia căutată
lo, hi, n = 0, 10**6, 0
while lo < hi:
    n += 1
    m = (lo + hi) // 2
    if m < k: lo = m + 1
    else: hi = m
print(n)  # → 20
```
În C++: `std::map` e tot un arbore ordonat: `find` e logaritmic, iar `lower_bound` dă începutul unui interval.
Unde nu ține: Standardul cere doar complexitate logaritmică; de obicei e un arbore roșu-negru, cu o cheie pe nod. Un nod de B-tree e o pagină de disc (8 kB) cu mai multe chei.
Legătură: IDX-01 și IDX-12.

### 2
Greu: da
Problema: Importul de noapte, 10 milioane de rânduri într-o tabelă cu șase indexuri, durează mult mai mult decât într-una fără. Baza ocupă și mai mult disc, deși n-a apărut niciun query nou.
Ideea: Indexul trebuie ținut sincron cu tabela. Fiecare `INSERT` adaugă câte o intrare în fiecare index, iar un `UPDATE` pe o coloană indexată mută intrarea. `VACUUM` curăță apoi din indexuri versiunile moarte de rânduri. Un `UPDATE` care nu atinge nicio coloană indexată poate sări peste indexuri (HOT update), dacă rândul nou încape în aceeași pagină. Indexezi ce citești des, nu tot.
Analogie: Indexul alfabetic de la finalul unui manual. Cine caută un termen îl găsește imediat, dar fiecare pagină adăugată sau mutată te obligă să corectezi indexul. Cu șase indexuri corectezi șase liste, iar ele ocupă și ele hârtie.
Legătură: IDX-04. Indexurile nefolosite se șterg: costă la scriere și nu aduc nimic la citire.

### 3
Problema: Pagina „comenzile unui client” e rapidă în dezvoltare și lentă în producție. `orders.customer_id` e cheie străină, dar nu are index, deci fiecare cerere citește toată tabela. Costul crește odată cu ea.
Ideea: Indexezi coloanele din `WHERE`, din `JOIN` și din `ORDER BY`, cu multe valori distincte. Postgres creează singur index pentru `PRIMARY KEY` și `UNIQUE`, nu și pentru o cheie străină.
Exemplu:
```text
-- FK nu creează index singur:
CREATE TABLE orders (
  id bigint PRIMARY KEY,
  customer_id bigint
    REFERENCES customers
);
CREATE INDEX ON orders
  (customer_id);
```
Legătură: IDX-01. Django creează implicit un index pe fiecare `ForeignKey` (`db_index=True`); în SQL scris de mână îl adaugi tu.

### 4
Greu: da
Problema: Ai un index pe `(tenant_id, created_at)`. „Alertele tenantului 5, cele mai noi” zboară. Apoi cineva cere alertele de azi pentru toți tenanții, doar după `created_at`, și iar e lent.
Ideea: Indexul compus e sortat după prima coloană, iar în fiecare valoare a ei după a doua, ca o agendă după nume și apoi prenume. De aceea ajută la `a = ?`, la `a = ? AND b = ?` și la `ORDER BY a, b`. Pentru `b = ?` singur, valorile lui `b` sunt împrăștiate prin tot indexul, deci îl parcurgi întreg. Postgres 18 poate sări peste valorile lui `a` (skip scan), în special când sunt puține. Egalitățile merg înaintea intervalelor: intervalul scanat îl limitează egalitățile din față și primul interval.
Exemplu:
```python
ix = [(1, "x"), (1, "y"),
      (2, "x"), (2, "y")]
at = lambda c, v: [
    i for i, k in enumerate(ix)
    if k[c] == v]
print(at(0, 2))  # → [2, 3]
print(at(1, "x"))  # → [0, 2]
```
În C++: `std::map<std::pair<int, std::string>, V>` se ordonează lexicografic. `lower_bound({a, ""})` începe blocul lui `a`; după doar al doilea câmp nu ai decât parcurgerea întregii hărți.
Unde nu ține: Alegerea o face planner-ul Postgres, care compară costul. Poate parcurge tot indexul pentru `b = ?` sau poate prefera un Seq Scan. `std::map` n-are planner.
Legătură: IDX-02.

### 5
Greu: da
Problema: `orders.status` are trei valori: două treimi `done`, o treime `open`, 1% `pending`. Pui un index pe `status`, dar `WHERE status = 'done'` face tot Seq Scan. Echipa vrea doar comenzile `pending`.
Ideea: Indexul dă rândurile din pagini împrăștiate, iar Postgres socotește o pagină citită aleator de patru ori mai scumpă decât una citită în ordine (`random_page_cost` 4,0 față de `seq_page_cost` 1,0). Când ceri o fracțiune mare din tabel, citirea întregului tabel costă mai puțin, deci planner-ul alege Seq Scan. Valorile frecvente nu merită indexate, de aceea un index parțial acoperă doar rândurile rare. Query-ul îl folosește când `WHERE` implică predicatul indexului.
Exemplu:
```text
CREATE INDEX ON orders (created_at)
  WHERE status = 'pending';
-- folosit: status = 'pending'
SELECT * FROM orders
  WHERE status = 'pending'
  ORDER BY created_at LIMIT 20;
```
Legătură: IDX-03. Un index parțial e mic și nu se actualizează pentru rândurile care nu-i satisfac predicatul.

### 6
Greu: da
Problema: Login-ul caută `WHERE lower(email) = 'ana@x.ro'`, dar indexul de pe `email` e ignorat și vezi Seq Scan. Indexul e sortat după valoarea stocată, `Ana@X.ro`, nu după varianta cu litere mici.
Ideea: Indexul se potrivește doar cu expresia pe care a fost construit. Soluția: un index pe expresie, `lower(email)`, iar query-ul folosește exact aceeași expresie. Funcțiile din index trebuie să fie `IMMUTABLE`: `created_at::date` pe un `timestamptz` e respins, fiindcă depinde de fusul orar. Folosești `(created_at AT TIME ZONE 'UTC')::date` sau un interval de timp. Expresia se calculează la fiecare `INSERT`.
Exemplu:
```python
u = {"Ana@X.ro": 1}
print("ana@x.ro" in u)  # → False
lo = {k.lower(): 1 for k in u}
print("ana@x.ro" in lo)  # → True
```
Legătură: IDX-05. Django: `Index(Lower("email"), name="email_lower_idx")` în `Meta.indexes`.

### 7
Greu: da
Problema: Tabela `events` are 2 miliarde de rânduri, adăugate în ordinea timpului și interogate pe intervale. Un B-tree pe `created_at` ocupă zeci de GB. Alt query caută `payload @> '{"type": "login"}'` pe un JSONB, iar un B-tree nu poate răspunde la `@>`.
Ideea: Alegi tipul după operatorul din query, nu după coloană. B-tree (implicit): `=`, intervale, sortare. Hash: doar `=`, păstrează codul hash de 32 de biți al valorii. GIN: index inversat pentru valori compuse (chei JSONB, elemente de array, cuvinte). GiST: geometrii, intervale (ranges), cel mai apropiat vecin. BRIN: min și max pe grupuri de pagini; e minuscul, dar merge doar când valorile urmează ordinea fizică a tabelei, cum e timpul.
Exemplu:
```text
CREATE INDEX ON ev
  USING gin (payload);
CREATE INDEX ON ev
  USING brin (at);
CREATE INDEX ON ev
  USING gist (area);
CREATE INDEX ON ev
  USING hash (id);
```
În C++: Hash seamănă cu `std::unordered_map`: doar căutare exactă, fără ordine și fără interval. B-tree seamănă cu `std::map`, care are `lower_bound`.
Unde nu ține: `std::unordered_map` ține cheia întreagă, în memorie. Un Hash index din Postgres e pe disc și păstrează doar codul hash, nu valoarea.
Legătură: IDX-06 și IDX-07. GIN e același index inversat ca în Elasticsearch, punctul 11.

### 8
Greu: da
Problema: Pagina de comenzi arată doar `total` și `status` ale unui client. Indexul pe `customer_id` găsește rapid rândurile, dar pentru fiecare Postgres sare în tabel după cele două coloane: o mie de sărituri, deși răspunsul încape în index.
Ideea: `INCLUDE (total, status)` pune coloanele în index ca date însoțitoare, nu ca parte din cheia de căutare. Un query care cere doar coloane din index poate face Index Only Scan, fără să citească tabelul. Postgres verifică totuși harta de vizibilitate: dacă pagina nu e marcată „vizibilă pentru toți”, tot sare în tabel (Heap Fetches). Harta o actualizează `VACUUM`, deci câștigul apare la tabele care se schimbă rar. `SELECT *` nu mai e acoperit.
Exemplu:
```text
CREATE INDEX ON orders (customer_id)
  INCLUDE (total, status);
SELECT total, status FROM orders
  WHERE customer_id = 7;
-- Index Only Scan, Heap Fetches: 0
```
Legătură: IDX-11. Nu-l pui pe coloane late: un tuplu prea mare pentru pagină dă eroare la inserare.

### 9
Greu: da
Problema: Rulezi `CREATE INDEX` în producție pe `events`, 200 de milioane de rânduri. Construirea ține minute sau ore, iar în tot timpul ăsta orice `INSERT`, `UPDATE` sau `DELETE` pe tabelă așteaptă. API-ul începe să dea timeout.
Ideea: `CREATE INDEX CONCURRENTLY` nu blochează scrierile; citirile merg oricum. Plătești cu timp: face două scanări ale tabelei și așteaptă tranzacțiile existente. Nu poate rula într-un bloc de tranzacție, deci o migrare îl rulează în autocommit. Dacă pică (deadlock, încălcare de unicitate), lasă un index `INVALID`: nu e folosit la citiri, dar tot costă la scrieri. Îl ștergi cu `DROP INDEX` și reiei, sau folosești `REINDEX INDEX CONCURRENTLY`.
Exemplu:
```text
CREATE INDEX CONCURRENTLY
  events_at_idx ON events (at);
-- în BEGIN … COMMIT: eroare
-- dacă pică: apare ca INVALID
DROP INDEX events_at_idx;
```
Legătură: IDX-09. În Alembic folosești `op.get_context().autocommit_block()` și `postgresql_concurrently=True` la `op.create_index`.

### 10
Greu: da
Problema: Ai adăugat indexul, iar pagina e tot lentă. Fără plan, ghicești: poate Postgres nu-l folosește, poate estimează rânduri greșit.
Ideea: `EXPLAIN` arată planul ales. `EXPLAIN ANALYZE` rulează query-ul și adaugă timpii și rândurile reale. `BUFFERS` arată paginile citite: `hit` din cache, `read` de pe disc. Cauți Seq Scan unde te așteptai la Index Scan și rânduri estimate față de cele reale; o diferență mare poate însemna statistici vechi, deci rulezi `ANALYZE` pe tabelă. Atenție: `ANALYZE` execută comanda, deci un `UPDATE` sau `DELETE` se aplică; îl pui într-o tranzacție și faci `ROLLBACK`.
Exemplu:
```text
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders WHERE id = 5;
-- Index Scan using orders_pkey
--   Index Cond: (id = 5)
--   Buffers: shared hit=3 read=4
```
Legătură: IDX-08. `Rows Removed by Filter` mare lângă un Seq Scan înseamnă că ai citit multe rânduri degeaba. Din Postgres 18, `BUFFERS` e inclus automat în `EXPLAIN ANALYZE`.

### 11
Greu: da
Problema: În Postgres „index” e o structură auxiliară; în Elasticsearch e locul unde stau documentele. Iar `LIKE '%login%'` ar citi tot tabelul.
Ideea: În Elasticsearch, un index e un spațiu logic cu o colecție de documente, cam cât un tabel. Dedesubt, un index inversat ține, pentru fiecare termen, documentele care îl conțin. Căutarea unui cuvânt e un lookup în dicționarul de termeni.
Exemplu:
```python
docs = ["login ok", "login failed",
        "logout"]
ix = {}
for d, t in enumerate(docs):
    for w in t.split():
        ix[w] = ix.get(w, []) + [d]
print(ix["login"])  # → [0, 1]
```
În C++: `std::unordered_map<std::string, std::vector<int>>` e același index inversat, în memorie.
Unde nu ține: Elasticsearch trece întâi textul printr-un analyzer (tokenizare, litere mici) și ține termenii sortați. `unordered_map` nu are ordine și nici analiză.
Legătură: IDX-10. Pe Elasticsearch îl cunoști deja; GIN din Postgres (punctul 7) e tot un index inversat.
