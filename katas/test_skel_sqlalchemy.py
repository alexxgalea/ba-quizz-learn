# Testele referințelor de schelet pentru modulul sqlalchemy (skel_sqlalchemy_*.py), pe un Postgres real.
# Verifică proprietatea apărată de punctele esențiale, nu doar cazul fericit.
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.exc import IntegrityError

from pg_fixture import pg_db, pg_server  # noqa: F401


@pytest.fixture
def engine(pg_db):
    eng = create_engine(pg_db.url)
    yield eng
    eng.dispose()


# --- s-sqlalchemy-model ---
def test_model_nullabilitate_din_adnotari(engine):
    from skel_sqlalchemy_model import User

    cols = User.__table__.c
    assert cols.id.primary_key
    assert cols.name.nullable is False        # Mapped[str] → NOT NULL
    assert cols.email.nullable is True        # Mapped[str | None] → NULL


def test_model_sesiune_add_commit_si_select(engine):
    from skel_sqlalchemy_model import create_user, find_by_name, init_db

    init_db(engine)
    uid = create_user(engine, "ana", "ana@example.com")
    assert isinstance(uid, int)
    u = find_by_name(engine, "ana")
    assert (u.id, u.name, u.email) == (uid, "ana", "ana@example.com")
    assert find_by_name(engine, "nimeni") is None
    assert create_user(engine, "bob") and find_by_name(engine, "bob").email is None


def test_model_constrangeri_ajung_in_baza(engine):
    from skel_sqlalchemy_model import create_user, init_db

    init_db(engine)
    create_user(engine, "ana")
    with pytest.raises(IntegrityError):       # unique pe name
        create_user(engine, "ana")
    with pytest.raises(IntegrityError):       # NOT NULL pe name
        create_user(engine, None)


def test_model_in_stil_2_0_fara_query_legacy(engine):
    """select(...) + session.scalars(...), nu session.query(...): query-ul legacy ar fi o amintire din 1.x."""
    import inspect

    import skel_sqlalchemy_model as m

    src = inspect.getsource(m.find_by_name)
    assert "select(" in src and ".query(" not in src


# --- s-sqlalchemy-selectin ---
N_AUTHORS, N_BOOKS = 20, 3


@pytest.fixture
def library(engine):
    from sqlalchemy.orm import Session

    import skel_sqlalchemy_selectin as m

    m.Base.metadata.create_all(engine)
    with Session(engine) as s, s.begin():
        for i in range(N_AUTHORS):
            s.add(m.Author(name="a%d" % i, books=[m.Book(title="a%d-b%d" % (i, j)) for j in range(N_BOOKS)]))
    return m


def expected():
    return {"a%d" % i: ["a%d-b%d" % (i, j) for j in range(N_BOOKS)] for i in range(N_AUTHORS)}


def norm(d):
    return {k: sorted(v) for k, v in d.items()}


def test_selectinload_doua_query_uri_indiferent_de_n(engine, library):
    from sqlalchemy.orm import Session

    with Session(engine) as s, library.count_queries(engine) as queries:
        assert norm(library.titles_by_author(s)) == expected()
    assert len(queries) == 2, queries
    assert " IN " in queries[1].upper() and "BOOK" in queries[1].upper()   # al doilea SELECT: IN pe cheile părinților


def test_control_lazy_loading_da_n_plus_1(engine, library):
    """Fără opțiune, aceeași interogare dă 1 + N query-uri; arată că numărătorul chiar măsoară."""
    from sqlalchemy import select
    from sqlalchemy.orm import Session

    with Session(engine) as s, library.count_queries(engine) as queries:
        by = {a.name: [b.title for b in a.books] for a in s.scalars(select(library.Author))}
    assert norm(by) == expected()
    assert len(queries) == 1 + N_AUTHORS


def test_numaratorul_se_dezabonaza_la_iesire(engine, library):
    from sqlalchemy import text

    with library.count_queries(engine) as queries:
        pass
    with engine.connect() as c:
        c.execute(text("SELECT 1"))
    assert queries == []


# --- s-sqlalchemy-tx: tranzacție cu session.begin() + migrare Alembic ---
import shutil
import threading
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect, text

HERE = Path(__file__).resolve().parent
ENV_PY = '''
from alembic import context
from sqlalchemy import create_engine

engine = create_engine(context.config.get_main_option("sqlalchemy.url"))
with engine.connect() as conn:
    context.configure(connection=conn)
    with context.begin_transaction():
        context.run_migrations()
'''
REV_0001 = '''
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None


def upgrade():
    op.create_table(
        "account",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("balance", sa.Integer, nullable=False))


def downgrade():
    op.drop_table("account")
'''


@pytest.fixture
def alembic_cfg(pg_db, tmp_path):
    """Un mediu Alembic real: 0001 scris aici (starea existentă), 0002 = chiar referința schelet."""
    (tmp_path / "versions").mkdir()
    (tmp_path / "env.py").write_text(ENV_PY)
    (tmp_path / "versions" / "0001_account.py").write_text(REV_0001)
    shutil.copy(HERE / "skel_sqlalchemy_tx.py", tmp_path / "versions" / "0002_currency.py")
    cfg = Config()
    cfg.set_main_option("script_location", str(tmp_path))
    cfg.set_main_option("sqlalchemy.url", pg_db.url)
    return cfg


def columns(engine):
    return {c["name"]: c for c in inspect(engine).get_columns("account")}


def balances(engine):
    with engine.connect() as c:
        return dict(c.execute(text("SELECT id, balance FROM account ORDER BY id")).all())


@pytest.fixture
def bank(engine, alembic_cfg):
    import skel_sqlalchemy_tx as m

    command.upgrade(alembic_cfg, "head")
    with engine.begin() as c:
        c.execute(text("INSERT INTO account (id, balance) VALUES (1, 100), (2, 50)"))
    return m


def test_migrarea_urca_si_coboara_simetric(engine, alembic_cfg):
    command.upgrade(alembic_cfg, "0001")
    assert set(columns(engine)) == {"id", "balance"}
    with engine.begin() as c:
        c.execute(text("INSERT INTO account (id, balance) VALUES (1, 10)"))   # rând deja existent
    command.upgrade(alembic_cfg, "head")
    cols = columns(engine)
    assert cols["currency"]["nullable"] is False
    with engine.connect() as c:                       # NOT NULL pe tabel cu rânduri: server_default a umplut
        assert c.execute(text("SELECT currency FROM account WHERE id = 1")).scalar() == "RON"
    command.downgrade(alembic_cfg, "-1")
    assert set(columns(engine)) == {"id", "balance"}
    command.upgrade(alembic_cfg, "head")              # și din nou în sus: migrarea se repetă curat
    assert "currency" in columns(engine)


def test_transfer_muta_banii_intr_o_tranzactie(engine, bank):
    bank.transfer(engine, 1, 2, 30)
    assert balances(engine) == {1: 70, 2: 80}


def test_transfer_cu_sold_prea_mic_nu_scrie_nimic(engine, bank):
    with pytest.raises(ValueError):
        bank.transfer(engine, 1, 2, 101)
    assert balances(engine) == {1: 100, 2: 50}


def test_esec_dupa_primul_update_anuleaza_tot(engine, bank):
    """Rollback real: eșuăm DUPĂ ce UPDATE-urile au rulat în bază, înainte de commit; nimic nu rămâne scris.

    (ORM-ul grupează cele două UPDATE-uri într-un singur executemany, deci eșecul se simulează după el.)"""
    from sqlalchemy import event

    ran = []

    def boom(conn, cur, stmt, *rest):
        if stmt.lstrip().upper().startswith("UPDATE"):
            ran.append(stmt)
            raise RuntimeError("cade după UPDATE, înainte de commit")

    event.listen(engine, "after_cursor_execute", boom)
    try:
        with pytest.raises(RuntimeError):
            bank.transfer(engine, 1, 2, 30)
    finally:
        event.remove(engine, "after_cursor_execute", boom)
    assert ran                                        # UPDATE-ul chiar a ajuns în bază
    assert balances(engine) == {1: 100, 2: 50}


def test_transferuri_concurente_pe_acelasi_sold_nu_il_strica(engine, bank):
    """Fără with_for_update ambele ar trece de verificare: 100 → −100. Cu blocare, exact unul reușește."""
    results = []

    def go():
        try:
            bank.transfer(engine, 1, 2, 100)
            results.append("ok")
        except ValueError:
            results.append("refuzat")

    ts = [threading.Thread(target=go) for _ in range(2)]
    [t.start() for t in ts]
    [t.join(30) for t in ts]
    assert sorted(results) == ["ok", "refuzat"], results
    assert balances(engine) == {1: 0, 2: 150}


def test_transferuri_in_sens_opus_nu_dau_deadlock(engine, bank):
    """1→2 și 2→1 în paralel: blocarea în ordinea id-urilor evită deadlock-ul (Postgres l-ar anula cu eroare)."""
    errors = []

    def go(a, b):
        try:
            for _ in range(25):
                bank.transfer(engine, a, b, 1)
        except Exception as e:  # pragma: no cover - un deadlock ar apărea aici
            errors.append(e)

    ts = [threading.Thread(target=go, args=args) for args in [(1, 2), (2, 1), (1, 2), (2, 1)]]
    [t.start() for t in ts]
    [t.join(60) for t in ts]
    assert not errors, errors
    assert sum(balances(engine).values()) == 150     # banii nu se pierd și nu se multiplică
