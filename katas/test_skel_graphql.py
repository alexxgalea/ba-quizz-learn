# Testele referinței Strawberry + DataLoader (modulul graphql): proprietatea apărată de punctele esențiale
# e „un singur apel în lot per cerere”, cu rezultate în ordinea cheilor, cheie lipsă fără să cadă lotul
# și loader nou la fiecare cerere. Fără plugin async: rulăm cu asyncio.run.
import asyncio

import pytest

pytest.importorskip("strawberry")

import skel_graphql as g  # noqa: E402

QUERY = "{ books { title author { id name } } }"


@pytest.fixture(autouse=True)
def db():
    g.reset()
    yield


def run(query=QUERY, context=None):
    ctx = g.get_context() if context is None else context
    return asyncio.run(g.schema.execute(query, context_value=ctx))


def test_o_singura_cerere_catre_baza_pentru_toti_autorii():
    res = run()
    assert res.errors is None
    assert len(res.data["books"]) == 3
    assert g.CALLS == [[2, 1]], "N+1: câte un apel per carte în loc de unul în lot (și fără chei duplicate)"


def test_rezultatele_urmeaza_ordinea_cheilor_nu_ordinea_randurilor():
    # baza întoarce rândurile sortate după id ([1, 2]), cheile cerute sunt [2, 1]
    res = run()
    got = [(b["title"], b["author"]["name"]) for b in res.data["books"]]
    assert got == [("Neuromancer", "Gibson"), ("Dune", "Herbert"), ("Dune Messiah", "Herbert")]


def test_autor_lipsa_da_null_fara_sa_strice_restul_lotului():
    g.BOOKS.append(("Orfană", 99))
    res = run()
    assert res.errors is None
    by_title = {b["title"]: b["author"] for b in res.data["books"]}
    assert by_title["Orfană"] is None
    assert by_title["Dune"]["name"] == "Herbert"
    assert g.CALLS == [[2, 1, 99]]


def test_loader_nou_la_fiecare_cerere():
    assert g.get_context()["authors"] is not g.get_context()["authors"]
    run()
    g.AUTHORS[1] = "Frank Herbert"          # datele se schimbă între cereri
    res = run()
    assert [b["author"]["name"] for b in res.data["books"]] == ["Gibson", "Frank Herbert", "Frank Herbert"]
    assert len(g.CALLS) == 2, "fiecare cerere face exact un lot"


def test_un_loader_global_ar_servi_date_vechi():
    # contrapartida: același loader reutilizat între cereri ține cache-ul și nu mai vede schimbarea
    shared = g.get_context()
    run(context=shared)
    g.AUTHORS[1] = "Frank Herbert"
    res = run(context=shared)
    assert res.data["books"][1]["author"]["name"] == "Herbert"
    assert len(g.CALLS) == 1


def test_campul_author_id_nu_apare_in_schema():
    sdl = g.schema.as_str()
    assert "author_id" not in sdl and "authorId" not in sdl
    assert "author: Author" in sdl


def test_loader_ul_primeste_cheile_ca_lista_si_intoarce_aceeasi_lungime():
    out = asyncio.run(g.load_authors([2, 99, 1]))
    assert len(out) == 3 and out[0].name == "Gibson" and out[1] is None and out[2].name == "Herbert"
