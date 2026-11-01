# Testele referințelor de schelet pentru modulul python.
# Verifică proprietatea apărată de punctele esențiale, nu doar cazul fericit.
import contextlib

import pytest

import skel_python as sp


# --- s-python-gen-pipeline -------------------------------------------------

def sursa_numarata(n):
    """Sursă de linii care ține minte câte a dat (ca să vedem lenea)."""
    cerute = []

    def gen():
        for i in range(n):
            cerute.append(i)
            yield "linia %d" % i

    return gen(), cerute


def test_pipeline_etapele_sunt_lenese():
    sursa, cerute = sursa_numarata(1000)
    rezultat = sp.head(sp.grep(sursa, "7"), 2)
    assert cerute == [], "construirea pipeline-ului a citit deja linii"
    assert list(rezultat) == ["linia 7", "linia 17"]
    # s-a oprit imediat după al doilea rezultat: nu a citit restul sursei
    assert len(cerute) == 18


def spion_open(monkeypatch):
    """Înlocuiește `open` din modul cu unul care ține minte fișierele."""
    deschise = []
    real = open

    def spion(*args, **kwargs):
        f = real(*args, **kwargs)
        deschise.append(f)
        return f

    monkeypatch.setattr(sp, "open", spion, raising=False)
    return deschise


def fisier(tmp_path, linii):
    p = tmp_path / "log.txt"
    p.write_text("".join(l + "\n" for l in linii))
    return str(p)


def test_pipeline_fisierul_se_deschide_abia_la_prima_linie(
        tmp_path, monkeypatch):
    deschise = spion_open(monkeypatch)
    gen = sp.read_lines(fisier(tmp_path, ["a", "b"]))
    assert deschise == [], "fișierul a fost deschis înainte de iterare"
    assert next(gen) == "a"
    assert len(deschise) == 1 and not deschise[0].closed


def test_pipeline_fisierul_se_inchide_la_epuizare(tmp_path, monkeypatch):
    deschise = spion_open(monkeypatch)
    linii = list(sp.read_lines(fisier(tmp_path, ["a", "b", "c"])))
    assert linii == ["a", "b", "c"]          # fără \n la capăt
    assert deschise[0].closed


def test_pipeline_fisierul_se_inchide_si_la_oprire_timpurie(
        tmp_path, monkeypatch):
    deschise = spion_open(monkeypatch)
    gen = sp.read_lines(fisier(tmp_path, ["a", "b", "c"]))
    assert next(gen) == "a"
    assert not deschise[0].closed
    gen.close()                              # GeneratorExit în `with`
    assert deschise[0].closed


def test_pipeline_cap_la_cap(tmp_path, monkeypatch):
    deschise = spion_open(monkeypatch)
    cale = fisier(tmp_path, ["ok 1", "eroare 2", "ok 3", "eroare 4",
                             "eroare 5"])
    rezultat = sp.first_matches(cale, "eroare", 2)
    assert list(rezultat) == ["eroare 2", "eroare 4"]


def test_pipeline_e_de_unica_folosinta(tmp_path):
    rezultat = sp.first_matches(fisier(tmp_path, ["x", "x"]), "x", 5)
    assert list(rezultat) == ["x", "x"]
    assert list(rezultat) == []


# --- s-python-gen-send -----------------------------------------------------

def test_send_media_pe_grupe():
    medii = []
    c = sp.collector(medii)
    next(c)                                  # pornire
    for x in (1, 2, 3):
        c.send(x)
    c.send(None)                             # încheie grupa
    for x in (10, 20):
        c.send(x)
    c.send(None)
    assert medii == [2.0, 15.0]


def test_send_pe_generator_neinceput_da_type_error():
    with pytest.raises(TypeError):
        sp.collector([]).send(5)


def test_yield_from_ia_valoarea_din_return():
    a = sp.averager()
    next(a)
    a.send(4)
    a.send(6)
    with pytest.raises(StopIteration) as e:
        a.send(None)
    assert e.value.value == 5.0


def test_grupa_goala_nu_imparte_la_zero():
    medii = []
    c = sp.collector(medii)
    next(c)
    c.send(None)
    assert medii == [0]


# --- s-python-decorator ----------------------------------------------------

def test_decorator_pastreaza_numele_si_doc():
    @sp.limit_calls(2)
    def salut(nume):
        """Spune salut."""
        return "salut " + nume

    assert salut.__name__ == "salut"
    assert salut.__doc__ == "Spune salut."
    assert salut.__wrapped__("x") == "salut x"   # funcția originală


def test_decorator_intoarce_rezultatul_si_trece_argumentele():
    @sp.limit_calls(3)
    def aduna(a, b=0, *, c=0):
        return a + b + c

    assert aduna(1, 2, c=3) == 6
    assert aduna(1) == 1


def test_decorator_limiteaza_apelurile():
    @sp.limit_calls(2)
    def f():
        return "ok"

    assert f() == "ok" and f() == "ok"
    with pytest.raises(RuntimeError):
        f()


def test_decorator_are_contor_separat_pe_functie():
    una_singura = sp.limit_calls(1)          # același decorator, două funcții

    @una_singura
    def a():
        return "a"

    @una_singura
    def b():
        return "b"

    assert a() == "a"
    assert b() == "b"                        # contorul lui a nu-l afectează
    with pytest.raises(RuntimeError):
        a()
    with pytest.raises(RuntimeError):
        b()


def test_decorator_fabrica_intoarce_decoratorul_care_intoarce_wrapperul():
    def f():
        return 1

    decorator = sp.limit_calls(5)            # nivelul 1: fabrica
    wrapper = decorator(f)                   # nivelul 2: decoratorul
    assert wrapper is not f and wrapper() == 1   # nivelul 3: wrapper-ul


# --- s-python-ctx ----------------------------------------------------------

def test_ctx_clasa_inchide_la_iesire_normala():
    jurnal = []
    with sp.Managed(jurnal) as r:
        assert isinstance(r, sp.Managed)     # `as` primește __enter__()
        assert jurnal == ["open"]
    assert jurnal == ["open", "close"]


def test_ctx_clasa_inchide_si_propaga_exceptia():
    jurnal = []
    with pytest.raises(KeyError):
        with sp.Managed(jurnal):
            raise KeyError("x")
    assert jurnal == ["open", "close"]


def test_ctx_generator_inchide_la_iesire_normala():
    jurnal = []
    with sp.managed(jurnal) as r:
        assert r is jurnal                   # valoarea din `yield`
        assert jurnal == ["open"]
    assert jurnal == ["open", "close"]


def test_ctx_generator_inchide_si_propaga_exceptia():
    jurnal = []
    with pytest.raises(KeyError):
        with sp.managed(jurnal):
            raise KeyError("x")
    assert jurnal == ["open", "close"]


def test_ctx_exit_care_intoarce_true_ar_inghiti_exceptia():
    # Contrastul pe care îl apără punctul 2: referința întoarce False.
    class Inghite(sp.Managed):
        def __exit__(self, *exc):
            super().__exit__(*exc)
            return True

    jurnal = []
    with Inghite(jurnal):
        raise KeyError("x")                  # înghițită
    with pytest.raises(KeyError):
        with sp.Managed([]):
            raise KeyError("x")              # propagată


def test_ctx_generator_fara_finally_nu_curata_la_exceptie():
    # Contrastul pentru punctul despre try/finally.
    jurnal = []

    @contextlib.contextmanager
    def fara_finally():
        jurnal.append("open")
        yield jurnal
        jurnal.append("close")

    with pytest.raises(KeyError):
        with fara_finally():
            raise KeyError("x")
    assert jurnal == ["open"], "fără finally, close nu rulează"


# --- s-python-iter ---------------------------------------------------------

def test_iter_se_poate_parcurge_de_mai_multe_ori():
    c = sp.Countdown(3)
    assert list(c) == [3, 2, 1]
    assert list(c) == [3, 2, 1]


def test_iter_iteratorul_se_intoarce_pe_el_insusi():
    it = iter(sp.Countdown(2))
    assert iter(it) is it


def test_iter_containerul_nu_e_propriul_iterator():
    c = sp.Countdown(2)
    assert iter(c) is not c
    assert iter(c) is not iter(c)


def test_iter_dupa_epuizare_ridica_mereu_stop_iteration():
    it = iter(sp.Countdown(1))
    assert next(it) == 1
    for _ in range(3):
        with pytest.raises(StopIteration):
            next(it)


def test_iter_doi_iteratori_au_stari_independente():
    c = sp.Countdown(3)
    a, b = iter(c), iter(c)
    assert (next(a), next(a), next(b)) == (3, 2, 3)


def test_iter_zero_nu_produce_nimic():
    assert list(sp.Countdown(0)) == []


# --- s-python-collections --------------------------------------------------

def test_top_words_ordoneaza_dupa_frecventa():
    cuvinte = "b a b c a b".split()          # cel mai frecvent nu e primul alfabetic
    assert sp.top_words(cuvinte, 2) == [("b", 3), ("a", 2)]


def test_top_words_la_egalitate_pastreaza_prima_aparitie():
    # y apare întâi, deci rămâne înaintea lui x (nu ordine alfabetică)
    assert sp.top_words(["y", "x", "x", "y", "z"], 2) == [("y", 2), ("x", 2)]


def test_group_by_len_grupeaza_fara_cheie_initiala():
    g = sp.group_by_len(["a", "bb", "c", "dd", "eee"])
    assert dict(g) == {1: ["a", "c"], 2: ["bb", "dd"], 3: ["eee"]}


def test_group_by_len_get_nu_creeaza_cheia_dar_indexarea_da():
    g = sp.group_by_len(["a"])
    assert g.get(9) is None
    assert 9 not in g
    assert g[9] == []                        # __missing__ o creează
    assert 9 in g


def test_last_n_tine_doar_ultimele_n_dintr_un_flux():
    assert sp.last_n(iter(range(10)), 3) == [7, 8, 9]
    assert sp.last_n([1], 3) == [1]
    assert sp.last_n([], 3) == []


def test_biggest_intoarce_descrescator_dupa_valoare():
    scoruri = {"a": 3, "b": 9, "c": 5, "d": 1}
    assert sp.biggest(scoruri, 2) == [("b", 9), ("c", 5)]
    assert sp.biggest(scoruri, 10) == sorted(
        scoruri.items(), key=lambda kv: kv[1], reverse=True)


def test_biggest_k_zero_da_lista_goala():
    assert sp.biggest({"a": 1}, 0) == []
