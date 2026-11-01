# Testele referințelor de schelet pentru modulul postgres (skel_pg.sql), pe un Postgres real.
# Verifică proprietatea apărată de punctele esențiale, nu doar cazul fericit.
import threading

import psycopg
import pytest

from pg_fixture import pg_db, pg_server, sql_section, sql_statements  # noqa: F401


def run_all(conn, sid):
    """Rulează comenzile secțiunii, pe rând; întoarce rezultatul ultimei."""
    cur = None
    for stmt in sql_statements(sql_section("skel_pg.sql", sid)):
        cur = conn.execute(stmt)
    return cur


# --- s-postgres-upsert ---
STOCK = "CREATE TABLE stock (sku text PRIMARY KEY, qty int NOT NULL, updated_at timestamptz)"


def test_upsert_insereaza_apoi_aduna(pg_db):
    with pg_db.connect() as c:
        c.execute(STOCK)
        assert run_all(c, "s-postgres-upsert").fetchall() == [("A-1", 5)]
        assert run_all(c, "s-postgres-upsert").fetchall() == [("A-1", 10)]
        assert c.execute("SELECT count(*) FROM stock").fetchone() == (1,)
        assert c.execute("SELECT updated_at IS NOT NULL FROM stock").fetchone() == (True,)


def test_upsert_cere_index_unic_pe_tinta(pg_db):
    """Fără constrângere unică pe (sku), ON CONFLICT (sku) e eroare, nu un upsert tăcut."""
    with pg_db.connect() as c:
        c.execute("CREATE TABLE stock (sku text, qty int NOT NULL, updated_at timestamptz)")
        with pytest.raises(psycopg.errors.InvalidColumnReference):
            run_all(c, "s-postgres-upsert")


def test_upsert_atomic_sub_concurenta(pg_db):
    """8 sesiuni × 25 de upsert-uri pe același SKU: nicio eroare de duplicat, nicio cantitate pierdută."""
    with pg_db.connect() as c:
        c.execute(STOCK)
    errors = []

    def worker():
        try:
            with pg_db.connect() as c:
                for _ in range(25):
                    run_all(c, "s-postgres-upsert")
        except Exception as e:  # pragma: no cover - ar fi un bug în referință
            errors.append(e)

    ts = [threading.Thread(target=worker) for _ in range(8)]
    [t.start() for t in ts]
    [t.join(60) for t in ts]
    assert not errors, errors
    with pg_db.connect() as c:
        assert c.execute("SELECT qty FROM stock WHERE sku = 'A-1'").fetchone() == (8 * 25 * 5,)


def test_do_nothing_nu_intoarce_randul_sarit(pg_db):
    """Punctul despre RETURNING: pe conflict, DO NOTHING nu întoarce nimic."""
    with pg_db.connect() as c:
        c.execute(STOCK)
        c.execute("INSERT INTO stock VALUES ('A-1', 1, now())")
        r = c.execute("INSERT INTO stock VALUES ('A-1', 5, now()) ON CONFLICT (sku) DO NOTHING RETURNING sku")
        assert r.fetchall() == []


def test_qty_necalificat_in_set_e_ambiguu(pg_db):
    """Punctul despre EXCLUDED: `qty` fără calificare e ambiguu între tabel și excluded."""
    with pg_db.connect() as c:
        c.execute(STOCK)
        with pytest.raises(psycopg.errors.AmbiguousColumn):
            c.execute("INSERT INTO stock VALUES ('A-1', 5, now()) ON CONFLICT (sku) DO UPDATE SET qty = qty + EXCLUDED.qty")


# --- s-postgres-window ---
ORDERS = """
CREATE TABLE orders (id int PRIMARY KEY, customer text, amount int, created_at timestamptz);
INSERT INTO orders VALUES
  (1, 'A', 10, '2026-01-01'), (2, 'A', 25, '2026-01-02'), (3, 'A', 40, '2026-01-03'),
  (4, 'B', 7, '2026-01-05'),
  (7, 'C', 5, '2026-01-04'), (8, 'C', 9, '2026-01-04'),
  (9, 'D', 100, '2026-01-01'), (10, 'D', 60, '2026-01-02');
"""


def test_window_ultima_comanda_si_delta(pg_db):
    with pg_db.connect() as c:
        for stmt in sql_statements(ORDERS):
            c.execute(stmt)
        rows = run_all(c, "s-postgres-window").fetchall()
    # un rând pe client; A: 40 − 25; B: o singură comandă → NULL;
    # C: același created_at, câștigă id-ul mai mare (8): 9 − 5; D: delta negativ 60 − 100
    assert rows == [("A", 3, 40, 15), ("B", 4, 7, None), ("C", 8, 9, 4), ("D", 10, 60, -40)]


def test_functia_fereastra_nu_merge_in_where(pg_db):
    """Punctul despre filtrarea pe `rn`: fereastra în WHERE direct e eroare, de aceea subquery."""
    with pg_db.connect() as c:
        for stmt in sql_statements(ORDERS):
            c.execute(stmt)
        with pytest.raises(psycopg.errors.WindowingError):
            c.execute("SELECT id FROM orders WHERE ROW_NUMBER() OVER (ORDER BY id) = 1")


# --- s-postgres-queue ---
JOBS = """
CREATE TABLE jobs (id serial PRIMARY KEY, payload text, status text NOT NULL DEFAULT 'new', started_at timestamptz);
INSERT INTO jobs (payload) SELECT 'job-' || g FROM generate_series(1, %d) g;
"""


def make_jobs(db, n):
    with db.connect() as c:
        for stmt in sql_statements(JOBS % n):
            c.execute(stmt)


def test_coada_fifo_si_goala(pg_db):
    make_jobs(pg_db, 2)
    with pg_db.connect() as c:
        assert run_all(c, "s-postgres-queue").fetchall() == [(1, "job-1")]
        assert run_all(c, "s-postgres-queue").fetchall() == [(2, "job-2")]
        assert run_all(c, "s-postgres-queue").fetchall() == []          # coadă goală: zero rânduri
        assert c.execute("SELECT status FROM jobs ORDER BY id").fetchall() == [("running",), ("running",)]


def test_al_doilea_consumator_sare_peste_jobul_blocat(pg_db):
    """Consumatorul 1 ține tranzacția deschisă pe jobul 1; al doilea nu așteaptă și ia jobul 2."""
    make_jobs(pg_db, 3)
    with pg_db.connect(autocommit=False) as c1, pg_db.connect(autocommit=False) as c2:
        c2.execute("SET lock_timeout = '1s'")        # dacă ar aștepta, pică în loc să atârne
        assert run_all(c1, "s-postgres-queue").fetchall() == [(1, "job-1")]
        assert run_all(c2, "s-postgres-queue").fetchall() == [(2, "job-2")]
        c1.commit(); c2.commit()


def test_worker_cazut_elibereaza_jobul(pg_db):
    """Blocarea ține până la COMMIT: dacă tranzacția cade (rollback), jobul revine în coadă."""
    make_jobs(pg_db, 1)
    with pg_db.connect(autocommit=False) as c1:
        assert run_all(c1, "s-postgres-queue").fetchall() == [(1, "job-1")]
        c1.rollback()
    with pg_db.connect() as c2:
        assert run_all(c2, "s-postgres-queue").fetchall() == [(1, "job-1")]


def test_consumatori_paraleli_nu_iau_acelasi_job(pg_db):
    n_jobs, n_workers = 200, 8
    make_jobs(pg_db, n_jobs)
    taken, errors = [], []
    lock = threading.Lock()

    def worker():
        try:
            with pg_db.connect() as c:
                while True:
                    row = run_all(c, "s-postgres-queue").fetchone()
                    if row is None:
                        return
                    with lock:
                        taken.append(row[0])
        except Exception as e:  # pragma: no cover
            errors.append(e)

    ts = [threading.Thread(target=worker) for _ in range(n_workers)]
    [t.start() for t in ts]
    [t.join(60) for t in ts]
    assert not errors, errors
    assert sorted(taken) == list(range(1, n_jobs + 1)), "un job a fost luat de două ori sau a rămas"
