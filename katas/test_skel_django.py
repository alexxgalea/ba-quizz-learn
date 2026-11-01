# Testele referinței Django ORM ↔ SQLAlchemy (modulul django): numără query-urile, nu doar compară rezultatele.
# select_related / joinedload → 1 query cu JOIN; prefetch_related / selectinload → 2 query-uri (al doilea cu IN);
# fără ele, N+1; .filter() / .order_by() pe relația prefetch-uită ocolesc cache-ul și readuc N+1.
import pytest

pytest.importorskip("django")
pytest.importorskip("sqlalchemy")

from django.db import connection  # noqa: E402
from django.test.utils import CaptureQueriesContext  # noqa: E402
from sqlalchemy import event  # noqa: E402

import skel_django as d  # noqa: E402

BOOKS = {"Herbert": ["Dune", "Dune Messiah", "Children of Dune"], "Gibson": ["Neuromancer", "Count Zero"], "Le Guin": ["Earthsea"]}
EXPECTED_BOOKS = sorted((t, a) for a, ts in BOOKS.items() for t in ts)
EXPECTED_AUTHORS = sorted((a, len(ts)) for a, ts in BOOKS.items())
N_BOOKS, N_AUTHORS = len(EXPECTED_BOOKS), len(BOOKS)


@pytest.fixture(scope="module", autouse=True)
def db():
    d.create_schema()
    d.seed(BOOKS)


@pytest.fixture
def session():
    with d.Session(d.engine) as s:
        yield s


@pytest.fixture
def sa_sql(session):
    """Instrucțiunile SELECT trimise de SQLAlchemy, în ordine."""
    stmts = []

    def grab(conn, cursor, statement, *a):
        if statement.lstrip().upper().startswith("SELECT"):
            stmts.append(statement)

    event.listen(d.engine, "before_cursor_execute", grab)
    yield stmts
    event.remove(d.engine, "before_cursor_execute", grab)


def sql_of(ctx):
    return [q["sql"] for q in ctx.captured_queries]


# ---------- Django ----------
def test_select_related_un_singur_query_cu_join():
    with CaptureQueriesContext(connection) as ctx:
        got = d.books_with_author()
    assert sorted(got) == EXPECTED_BOOKS
    assert len(ctx) == 1
    assert "JOIN" in sql_of(ctx)[0].upper()


def test_prefetch_related_doua_query_uri_al_doilea_cu_in():
    with CaptureQueriesContext(connection) as ctx:
        got = d.authors_with_books()
    assert sorted(got) == EXPECTED_AUTHORS
    assert len(ctx) == 2
    assert " IN (" in sql_of(ctx)[1].upper()


def test_fara_select_related_e_n_plus_unu():
    with CaptureQueriesContext(connection) as ctx:
        got = [(b.title, b.author.name) for b in d.Book.objects.all()]
    assert sorted(got) == EXPECTED_BOOKS
    assert len(ctx) == 1 + N_BOOKS


def test_fara_prefetch_related_e_n_plus_unu():
    with CaptureQueriesContext(connection) as ctx:
        got = [(a.name, len(a.books.all())) for a in d.Author.objects.all()]
    assert sorted(got) == EXPECTED_AUTHORS
    assert len(ctx) == 1 + N_AUTHORS


def test_filter_pe_relatia_prefetchuita_arunca_cache_ul():
    with CaptureQueriesContext(connection) as ctx:
        authors = d.Author.objects.prefetch_related("books")
        [list(a.books.filter(title__startswith="D")) for a in authors]
    assert len(ctx) == 2 + N_AUTHORS, "filter() face un query nou per autor"
    with CaptureQueriesContext(connection) as ctx:
        authors = d.Author.objects.prefetch_related("books")
        [list(a.books.order_by("title")) for a in authors]
    assert len(ctx) == 2 + N_AUTHORS, "order_by() face un query nou per autor"


def test_all_si_count_pe_relatia_prefetchuita_folosesc_cache_ul():
    # .all() citește din cache; .count() pe relația prefetch-uită nu mai întreabă baza (verificat pe Django 6.1)
    with CaptureQueriesContext(connection) as ctx:
        authors = d.Author.objects.prefetch_related("books")
        got = [(a.name, len(a.books.all()), a.books.count()) for a in authors]
    assert len(ctx) == 2
    assert all(n == c for _, n, c in got)


def test_numarul_de_query_uri_nu_creste_cu_datele():
    d.seed({"Asimov": ["Foundation", "I, Robot"]})
    try:
        with CaptureQueriesContext(connection) as ctx:
            d.books_with_author()
        assert len(ctx) == 1
        with CaptureQueriesContext(connection) as ctx:
            d.authors_with_books()
        assert len(ctx) == 2
    finally:
        d.unseed("Asimov")


# ---------- SQLAlchemy 2.0 ----------
def test_joinedload_un_singur_select_cu_join(session, sa_sql):
    got = d.sa_books_with_author(session)
    assert sorted(got) == EXPECTED_BOOKS
    assert len(sa_sql) == 1 and "JOIN" in sa_sql[0].upper()


def test_selectinload_doua_selecturi_al_doilea_cu_in(session, sa_sql):
    got = d.sa_authors_with_books(session)
    assert sorted(got) == EXPECTED_AUTHORS
    assert len(sa_sql) == 2 and " IN (" in sa_sql[1].upper()


def test_fara_options_lazy_loading_da_n_plus_unu(session, sa_sql):
    books = session.scalars(d.select(d.SABook)).all()
    got = [(b.title, b.author.name) for b in books]
    assert sorted(got) == EXPECTED_BOOKS
    # identity map: un autor deja încărcat nu mai costă un SELECT, deci 1 + autorii distincți (nu 1 + N cărți)
    assert len(sa_sql) == 1 + N_AUTHORS
