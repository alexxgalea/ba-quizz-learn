// Schelete: codul minim, canonic, al unui concept, scris din memorie în câteva minute (vezi CONTEXT.md).
// id: „s-<modul>-<nume>”; referința e secțiunea „=== <id> ===” din katas/skel_*.{py,mjs,ts,tsx,sql}, testată.
// t titlul, p cerința, k punctele esențiale (3–5), lang limbajul referinței (py, js, ts, tsx, sql, yaml, docker),
// v marcajul de versiune (de pildă „3.11+”), st = true pentru „verificat structural”, g grupa (doar la frontend: react, js, ts).
window.PREP.skel = [
  {
    id: "s-gil-bq", m: "gil", lang: "py",
    t: "Coadă blocantă mărginită cu Condition",
    p: "Scrie o clasă `BoundedQueue(cap)` cu `put(item)` și `get()`, sigure între thread-uri: `put` așteaptă cât coada e plină, `get` așteaptă cât e goală. Fără `queue.Queue`; doar `threading`.",
    k: [
      "`while`, nu `if`, în jurul lui `wait()`: la trezire condiția se verifică din nou (trezire falsă sau alt thread a luat locul).",
      "Ambele condiții (`not_full` / `not_empty`) folosesc același lock, iar bufferul se citește și se modifică doar sub el.",
      "`put` face `notify` pe condiția „nu e goală”, `get` pe „nu e plină”, după ce au schimbat bufferul.",
      "Bufferul e un `deque` (`popleft` în O(1)), iar o capacitate < 1 e respinsă."
    ]
  },
  {
    id: "s-sqlalchemy-model", m: "sqlalchemy", lang: "py",
    t: "Model 2.0, sesiune și select",
    p: "Scrie un model SQLAlchemy 2.0 `User` (`id`, `name` unic și obligatoriu, `email` opțional), `init_db(engine)` care creează tabelele, `create_user(engine, name, email=None)` care îl salvează într-o `Session` și întoarce `id`-ul, și `find_by_name(engine, name)` care îl caută cu `select`.",
    k: [
      "Modelul moștenește `DeclarativeBase`, iar coloanele sunt `Mapped[tip] = mapped_column(...)`; nullabilitatea vine din tip: `Mapped[str | None]` e NULL, `Mapped[str]` e NOT NULL.",
      "Constrângerile se declară pe coloană (`primary_key=True`, `unique=True`) și le aplică baza: o dublură sau un `name` lipsă ridică `IntegrityError`.",
      "Sesiunea se deschide cu `with Session(engine) as s:`; scrierea e `add` + `commit`, iar `with` o închide.",
      "Interogarea e în stil 2.0: `select(User).where(...)` rulat cu `s.scalars(...)` (`.first()` dă un rând sau `None`), nu `s.query`.",
      "`Base.metadata.create_all(engine)` creează tabelele; în producție schema o ține Alembic."
    ]
  },
  {
    id: "s-sqlalchemy-selectin", m: "sqlalchemy", lang: "py",
    t: "selectinload contra N+1, cu numărător de query-uri",
    p: "Modelează `Author` cu `books` (one-to-many) și `Book` cu cheie străină. Scrie `titles_by_author(session)`, care întoarce `{nume: [titluri]}` fără N+1, și un context manager `count_queries(engine)` care strânge instrucțiunile SQL executate, ca să dovedești numărul de query-uri.",
    k: [
      "O relație se încarcă implicit leneș (lazy): `a.books` într-o buclă emite un SELECT per autor, deci 1 + N query-uri.",
      "Opțiunea se pune pe interogare: `select(Author).options(selectinload(Author.books))` încarcă toate colecțiile cu un al doilea SELECT cu `IN` pe cheile părinților, deci 2 query-uri oricâți autori ar fi.",
      "`selectinload` e alegerea obișnuită pentru colecții; `joinedload` pe o colecție repetă rândurile părintelui și cere `.unique()`.",
      "Numărătorul ascultă evenimentul `before_cursor_execute` al engine-ului și se dezabonează în `finally` (`event.remove`), ca să nu rămână ascultători în urma lui."
    ]
  },
  {
    id: "s-sqlalchemy-tx", m: "sqlalchemy", lang: "py",
    t: "Tranzacție cu session.begin() și migrare Alembic",
    p: "Scrie `transfer(engine, src, dst, amount)` pe `Account(id, balance)`: mută banii între două conturi, atomic, cu `ValueError` la sold prea mic. Apoi scrie migrarea Alembic `0002` (după `0001`), care adaugă coloana `currency` NOT NULL, cu valoarea implicită `'RON'`, și `downgrade`-ul ei.",
    k: [
      "`with Session(engine) as s, s.begin():` comite la ieșirea normală și face rollback la orice excepție; nu apelezi `commit()`, iar nimic nu rămâne scris pe jumătate.",
      "Rândurile se blochează cu `get(..., with_for_update=True)` înainte să verifici soldul, altfel două transferuri paralele trec amândouă de verificare.",
      "Blocările se iau în ordinea id-urilor (`sorted`), ca `1→2` și `2→1` în paralel să nu intre în deadlock.",
      "Migrarea are `revision` și `down_revision`, iar `upgrade()` și `downgrade()` sunt simetrice (`op.add_column` / `op.drop_column`).",
      "O coloană NOT NULL adăugată pe un tabel cu rânduri cere `server_default`; altfel migrarea pică pe datele existente."
    ]
  },
  {
    id: "s-postgres-upsert", m: "postgres", lang: "sql",
    t: "Upsert cu ON CONFLICT",
    p: "Tabela `stock(sku text PRIMARY KEY, qty int NOT NULL, updated_at timestamptz)`. Scrie un singur statement care inserează SKU-ul `'A-1'` cu cantitatea 5 sau, dacă există deja, adună 5 la cantitatea veche și actualizează `updated_at`, apoi întoarce rândul rezultat.",
    k: [
      "`ON CONFLICT (sku)` cere o constrângere sau un index unic exact pe coloanele din paranteză, altfel e eroare; fără țintă merge doar `DO NOTHING`.",
      "În `DO UPDATE`, `EXCLUDED` e rândul propus pentru inserare, iar `stock.qty` e valoarea veche: `SET qty = stock.qty + EXCLUDED.qty`. Un `qty` necalificat e ambiguu.",
      "E un singur statement atomic: sesiunile paralele nu pierd cantitate și nu primesc eroare de duplicat, spre deosebire de `SELECT` urmat de `INSERT`.",
      "`RETURNING` dă rândul inserat sau actualizat; la `DO NOTHING` rândul sărit nu se întoarce."
    ]
  },
  {
    id: "s-postgres-window", m: "postgres", lang: "sql",
    t: "Window function: ultima comandă și diferența",
    p: "Tabela `orders(id, customer, amount, created_at)`. Scrie interogarea care întoarce, pentru fiecare client, ultima lui comandă (`customer`, `id`, `amount`) și `delta` = suma ei minus suma comenzii dinainte (`NULL` dacă nu are una), ordonat după client.",
    k: [
      "Fereastra `OVER (PARTITION BY customer ORDER BY …)` păstrează toate rândurile, spre deosebire de `GROUP BY`; `ORDER BY`-ul din `OVER` decide numerotarea și ce înseamnă „anterior”.",
      "`ROW_NUMBER()` cu `ORDER BY created_at DESC, id DESC` dă 1 ultimei comenzi; `id` ca tie-breaker face rezultatul determinist când data se repetă.",
      "Funcțiile fereastră nu merg în `WHERE`: `rn = 1` se filtrează într-un subquery sau într-un CTE.",
      "`LAG(amount)` cu fereastra în ordine crescătoare întoarce comanda precedentă; la primul rând din partiție dă `NULL` (sau valoarea din al treilea argument), deci și `delta` e `NULL`."
    ]
  },
  {
    id: "s-postgres-queue", m: "postgres", lang: "sql",
    t: "Coadă de joburi cu SKIP LOCKED",
    p: "Tabela `jobs(id serial, payload text, status text DEFAULT 'new', started_at timestamptz)`. Scrie un singur statement prin care un worker ia cel mai vechi job `'new'`, îl marchează `'running'` cu `started_at` și îl întoarce, astfel încât doi workeri paraleli să nu primească niciodată același job și să nu aștepte unul după altul.",
    k: [
      "`FOR UPDATE SKIP LOCKED` sare peste rândurile blocate de alte tranzacții în loc să aștepte: doi consumatori nu iau același job și nu se blochează.",
      "Alegerea și marcarea jobului sunt un singur statement atomic: `UPDATE … WHERE id = (SELECT … FOR UPDATE SKIP LOCKED)`; un `SELECT` urmat de un `UPDATE` fără blocare lasă doi workeri să aleagă același rând.",
      "`ORDER BY id` și `LIMIT 1` dau ordinea FIFO și un singur job; blocarea se oprește la limită, deci restul cozii rămâne liber.",
      "`RETURNING` întoarce jobul luat; zero rânduri înseamnă coadă goală. Blocarea ține până la `COMMIT`: într-o tranzacție lăsată deschisă, un worker căzut eliberează jobul."
    ]
  },
  {
    id: "s-index-concurrent", m: "index", lang: "sql",
    t: "Index parțial cu CONCURRENTLY și EXPLAIN ANALYZE",
    p: "Tabela `orders(id, customer_id, status, created_at)` e mare și primește scrieri. Interogarea frecventă e `WHERE customer_id = 42 AND status = 'open' ORDER BY created_at DESC LIMIT 20`. Scrie indexul `idx_orders_open` care o servește fără să blocheze scrierile, apoi interogarea cu `EXPLAIN` care arată planul real.",
    k: [
      "`CREATE INDEX CONCURRENTLY` nu blochează `INSERT`/`UPDATE`/`DELETE` cât se construiește (cel obișnuit blochează scrierile), dar nu rulează într-o tranzacție și e mai lent: două scanări ale tabelei.",
      "Coloanele: egalitatea (`customer_id`) întâi, apoi coloana de sortare (`created_at DESC`); indexul dă rândurile în ordinea cerută, fără nod `Sort`.",
      "Indexul parțial (`WHERE status = 'open'`) e mic și e folosit doar când interogarea are același predicat.",
      "`EXPLAIN (ANALYZE)` execută interogarea și arată planul real: cauți `Index Scan using idx_orders_open`, nu `Seq Scan`, și compari rândurile estimate cu cele reale.",
      "Un build eșuat lasă un index `INVALID`, ignorat la interogări dar plătit la scrieri; îl ștergi cu `DROP INDEX` și reîncerci."
    ]
  }
];
