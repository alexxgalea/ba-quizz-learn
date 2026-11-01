# Testele referinței de schelet pentru modulul index (skel_idx.sql), pe un Postgres real.
# Verifică ce apără punctele esențiale: planul folosește indexul, build-ul nu blochează scrierile.
import json
import threading
import time

import psycopg
import pytest

from pg_fixture import pg_db, pg_server, sql_section, sql_statements  # noqa: F401

SID = "s-index-concurrent"
# 200.000 de comenzi: 100 de clienți × 2.000, din care 80 „open” fiecare (4%). Cu atâtea rânduri
# potrivite, LIMIT 20 pe un index în ordinea cerută oprește scanarea devreme; cu 4 rânduri, planul
# corect ar fi Bitmap Scan + Sort, deci datele contează pentru ce arată planul.
SETUP = """
CREATE TABLE orders (
  id serial PRIMARY KEY, customer_id int NOT NULL, status text NOT NULL,
  created_at timestamptz NOT NULL, note text);
INSERT INTO orders (customer_id, status, created_at)
SELECT g % 100 + 1,
       CASE WHEN (g / 100) % 25 = 0 THEN 'open' ELSE 'done' END,
       timestamptz '2026-01-01' + g * interval '1 second'
FROM generate_series(0, 199999) g;
ANALYZE orders;
"""


def stmts():
    s = sql_statements(sql_section("skel_idx.sql", SID))
    assert len(s) == 2 and s[0].startswith("CREATE INDEX CONCURRENTLY") and s[1].startswith("EXPLAIN")
    return s


@pytest.fixture
def big(pg_db):
    with pg_db.connect() as c:
        for stmt in sql_statements(SETUP):
            c.execute(stmt)
    return pg_db


def nodes(plan):
    """Toate nodurile planului JSON, în adâncime."""
    out = [plan]
    for child in plan.get("Plans", []):
        out += nodes(child)
    return out


def explain_json(conn, sql):
    assert "EXPLAIN (ANALYZE, BUFFERS)" in sql
    sql = sql.replace("EXPLAIN (ANALYZE, BUFFERS)", "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)")
    raw = conn.execute(sql).fetchone()[0]
    doc = raw if isinstance(raw, list) else json.loads(raw)
    return doc[0]


def test_fara_index_planul_e_seq_scan(big):
    """Control: fără index testul ar vedea Seq Scan, deci verificarea de mai jos nu e tautologică."""
    _, explain = stmts()
    with big.connect() as c:
        kinds = [n["Node Type"] for n in nodes(explain_json(c, explain)["Plan"])]
    assert "Seq Scan" in kinds


def test_planul_foloseste_indexul_si_nu_sorteaza(big):
    create, explain = stmts()
    with big.connect() as c:                       # autocommit: CONCURRENTLY nu merge într-o tranzacție
        c.execute(create)
        c.execute("ANALYZE orders")
        doc = explain_json(c, explain)
    ns = nodes(doc["Plan"])
    kinds = [n["Node Type"] for n in ns]
    assert any(n.get("Index Name") == "idx_orders_open" for n in ns), kinds
    assert not {"Seq Scan", "Sort"} & set(kinds), kinds
    assert doc["Execution Time"] > 0                           # ANALYZE a rulat interogarea
    scan = next(n for n in ns if n.get("Index Name"))
    assert scan["Node Type"] == "Index Scan"                   # în ordinea indexului, nu bitmap + sort
    assert scan["Actual Rows"] == 20                           # LIMIT 20 din cele 80 „open” ale clientului 42


def test_coloanele_egalitate_intai_apoi_sortarea(big):
    """Planul singur nu prinde ordinea inversată (indexul se folosește oricum), deci verific definiția."""
    create, _ = stmts()
    with big.connect() as c:
        c.execute(create)
        d = c.execute("SELECT pg_get_indexdef('idx_orders_open'::regclass)").fetchone()[0]
        valid = c.execute("SELECT indisvalid FROM pg_index WHERE indexrelid = 'idx_orders_open'::regclass").fetchone()[0]
    assert "(customer_id, created_at DESC)" in d
    assert "WHERE (status = 'open'::text)" in d
    assert valid is True


def test_indexul_partial_nu_serveste_alt_predicat(big):
    create, _ = stmts()
    with big.connect() as c:
        c.execute(create)
        c.execute("ANALYZE orders")
        raw = c.execute(
            "EXPLAIN (FORMAT JSON) SELECT * FROM orders WHERE customer_id = 42 AND status = 'done' "
            "ORDER BY created_at DESC LIMIT 20").fetchone()[0]
    doc = raw if isinstance(raw, list) else json.loads(raw)
    assert not any(n.get("Index Name") == "idx_orders_open" for n in nodes(doc[0]["Plan"]))


def test_concurrently_nu_merge_in_tranzactie(big):
    create, _ = stmts()
    with big.connect(autocommit=False) as c:
        with pytest.raises(psycopg.errors.ActiveSqlTransaction):
            c.execute(create)


def test_build_invalid_ramane_in_urma(big):
    """Punctul despre INVALID: un build eșuat lasă un index ignorat de interogări, de șters."""
    with big.connect() as c:
        with pytest.raises(psycopg.errors.UniqueViolation):
            c.execute("CREATE UNIQUE INDEX CONCURRENTLY idx_bad ON orders (customer_id)")
        assert c.execute("SELECT indisvalid FROM pg_index WHERE indexrelid = 'idx_bad'::regclass").fetchone() == (False,)
        c.execute("DROP INDEX idx_bad")


def _wait_until_blocked(db, needle, timeout=15):
    """Așteaptă până când comanda cu `needle` stă într-o așteptare de lock (nu doar rulează)."""
    end = time.time() + timeout
    with db.connect() as c:
        while time.time() < end:
            row = c.execute(
                "SELECT 1 FROM pg_stat_activity WHERE query LIKE %s AND wait_event_type IS NOT NULL "
                "AND pid <> pg_backend_pid()", (needle + "%",)).fetchone()
            if row:
                return
            time.sleep(0.05)
    raise AssertionError("build-ul nu a ajuns să aștepte")


def _insert_during_build(db, build_sql, needle):
    """Pornește build-ul în thread, cât un alt writer ține tranzacția deschisă, apoi încearcă un INSERT."""
    holder = db.connect(autocommit=False)
    holder.execute("INSERT INTO orders (customer_id, status, created_at) VALUES (1, 'open', now())")
    result = {}

    def build():
        try:
            with db.connect() as c:
                c.execute(build_sql)
        except Exception as e:  # pragma: no cover
            result["err"] = e

    t = threading.Thread(target=build)
    t.start()
    try:
        _wait_until_blocked(db, needle)
        with db.connect() as w:
            w.execute("SET lock_timeout = '1s'")
            try:
                w.execute("INSERT INTO orders (customer_id, status, created_at) VALUES (2, 'open', now())")
                outcome = "inserted"
            except psycopg.errors.LockNotAvailable:
                outcome = "blocked"
    finally:
        holder.commit()
        holder.close()
        t.join(60)
    assert "err" not in result, result
    return outcome


def test_concurrently_nu_blocheaza_scrierile_dar_create_index_obisnuit_da(big):
    create, _ = stmts()
    assert _insert_during_build(big, create, "CREATE INDEX CONCURRENTLY") == "inserted"
    with big.connect() as c:
        c.execute("DROP INDEX idx_orders_open")
    plain = create.replace(" CONCURRENTLY", "")
    assert plain != create
    assert _insert_during_build(big, plain, "CREATE INDEX idx_orders_open") == "blocked"
