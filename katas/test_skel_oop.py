# Testele referințelor de schelet pentru modulul oop.
# Verifică proprietatea apărată de punctele esențiale, nu doar cazul fericit.
import dataclasses
from dataclasses import dataclass

import pytest

import skel_oop as so


# --- s-oop-value -----------------------------------------------------------

def test_value_obiectele_egale_intra_o_singura_data_in_set():
    assert len({so.Tag("a"), so.Tag("a"), so.Tag("b")}) == 2
    assert len({so.Money(5, "RON"), so.Money(5, "RON")}) == 1


def test_value_egale_inseamna_acelasi_hash():
    assert hash(so.Tag("a")) == hash(so.Tag("a"))
    assert hash(so.Money(5, "RON")) == hash(so.Money(5, "RON"))
    assert so.Money(5, "RON") != so.Money(5, "EUR")


def test_value_poate_fi_cheie_de_dict():
    d = {so.Tag("a"): 1}
    assert d[so.Tag("a")] == 1


def test_value_eq_intoarce_not_implemented_pentru_alt_tip():
    assert so.Tag("a").__eq__("a") is NotImplemented
    assert (so.Tag("a") == "a") is False     # Python încearcă și invers
    assert so.Tag("a") != 1


def test_value_tag_e_imuabil():
    t = so.Tag("a")
    with pytest.raises(AttributeError):
        t.name = "b"


def test_value_dataclass_frozen_blocheaza_atribuirea():
    m = so.Money(5, "RON")
    with pytest.raises(dataclasses.FrozenInstanceError):
        m.amount = 6


def test_value_eq_fara_hash_face_clasa_nehashable():
    # Contrastul pentru punctul 2: ce se întâmplă dacă uiți __hash__.
    class FaraHash:
        def __init__(self, x):
            self.x = x

        def __eq__(self, other):
            return self.x == other.x

    assert FaraHash.__hash__ is None
    with pytest.raises(TypeError):
        {FaraHash(1)}


def test_value_dataclass_fara_frozen_nu_e_hashable():
    # Contrastul pentru punctul despre frozen: eq=True fără frozen.
    @dataclass
    class Mutabil:
        x: int

    with pytest.raises(TypeError):
        hash(Mutabil(1))


# --- s-oop-property --------------------------------------------------------

def test_property_valideaza_la_constructie():
    with pytest.raises(ValueError):
        so.Product("x", -1)


def test_property_valideaza_la_atribuire():
    p = so.Product("x", 10)
    p.price = 20
    assert p.price == 20
    with pytest.raises(ValueError):
        p.price = -5
    assert p.price == 20                     # valoarea veche rămâne


def test_property_valoarea_se_tine_in_atribut_privat():
    p = so.Product("x", 10)
    assert p._price == 10
    assert "price" not in vars(p)            # property, nu atribut de instanță


def test_property_from_dict_construieste_prin_cls():
    p = so.Product.from_dict({"name": "x", "price": 3})
    assert (p.name, p.price) == ("x", 3)


def test_property_from_dict_pe_subclasa_da_subclasa():
    class Special(so.Product):
        pass

    assert type(Special.from_dict({"name": "x", "price": 3})) is Special


def test_property_from_dict_valideaza_si_el():
    with pytest.raises(ValueError):
        so.Product.from_dict({"name": "x", "price": -1})


# --- s-oop-abc-protocol ----------------------------------------------------

def test_abc_nu_se_instantiaza_direct():
    with pytest.raises(TypeError):
        so.Storage()


def test_abc_subclasa_incompleta_nu_se_instantiaza():
    class Incomplet(so.Storage):
        pass

    with pytest.raises(TypeError):
        Incomplet()


def test_abc_subclasa_completa_merge():
    s = so.MemoryStorage()
    s.save("k", 1)
    assert s.data == {"k": 1}
    assert isinstance(s, so.Storage)


def test_protocol_potrivire_structurala_fara_mostenire():
    n = so.MemoryNotifier()
    assert so.Notifier not in type(n).__mro__
    so.alert(n, "salut")
    assert n.out == ["salut"]


def test_protocol_isinstance_cere_runtime_checkable():
    assert isinstance(so.MemoryNotifier(), so.Notifier)
    assert not isinstance(object(), so.Notifier)


def test_protocol_fara_runtime_checkable_nu_merge_cu_isinstance():
    # Contrastul pentru punctul 3.
    from typing import Protocol

    class Gol(Protocol):
        def f(self): ...

    with pytest.raises(TypeError):
        isinstance(object(), Gol)


def test_protocol_runtime_check_vede_doar_prezenta_metodei():
    class Prost:
        def send(self):                      # altă semnătură
            return None

    assert isinstance(Prost(), so.Notifier)


# --- s-oop-composition -----------------------------------------------------

def test_composition_serviciul_foloseste_dependenta_injectata():
    mailer = so.FakeMailer()
    so.Signup(mailer).register("a@b.ro")
    assert mailer.sent == [("a@b.ro", "salut")]


def test_composition_testul_din_referinta_trece():
    so.test_register_trimite_mail()


def test_composition_nu_creeaza_singur_dependenta():
    marcaj = object()
    assert so.Signup(marcaj).mailer is marcaj    # niciun apel la construcție


def test_composition_fake_uri_diferite_sunt_independente():
    a, b = so.FakeMailer(), so.FakeMailer()
    so.Signup(a).register("x@y.ro")
    assert a.sent and b.sent == []


def test_composition_email_invalid_nu_trimite_nimic():
    mailer = so.FakeMailer()
    with pytest.raises(ValueError):
        so.Signup(mailer).register("fără-arond")
    assert mailer.sent == []


def test_composition_orice_obiect_cu_send_merge():
    class Dublura:
        def __init__(self):
            self.calls = 0

        def send(self, to, text):
            self.calls += 1

    d = Dublura()
    so.Signup(d).register("a@b.ro")
    assert d.calls == 1


def test_composition_serviciul_nu_mosteneste_din_mailer():
    assert so.FakeMailer not in so.Signup.__mro__


# --- s-oop-super -----------------------------------------------------------

def test_super_fiecare_clasa_e_chemata_o_data_in_ordinea_mro():
    assert so.Child().hello() == ["Child", "Left", "Right", "Base"]
    assert [c.__name__ for c in so.Child.__mro__] == [
        "Child", "Left", "Right", "Base", "object"]


def test_super_urmeaza_mro_ul_instantei_nu_parintele_scris():
    # Left singur: super() ajunge la Base. În Child: ajunge la Right.
    assert so.Left().hello() == ["Left", "Base"]
    assert so.Child().hello()[1:3] == ["Left", "Right"]


def test_super_base_e_chemata_exact_o_data(monkeypatch):
    calls = []
    original = so.Base.hello

    def numarat(self):
        calls.append(1)
        return original(self)

    monkeypatch.setattr(so.Base, "hello", numarat)
    so.Child().hello()
    assert len(calls) == 1


def test_super_ordinea_bazelor_schimba_mro_ul():
    class Invers(so.Right, so.Left):
        def hello(self):
            return ["Invers"] + super().hello()

    assert Invers().hello() == ["Invers", "Right", "Left", "Base"]


def test_super_apelul_explicit_al_parintelui_rupe_lantul():
    # Contrastul pentru punctul 2: Base.hello(self) în loc de super().
    class L(so.Base):
        def hello(self):
            return ["L"] + so.Base.hello(self)

    class R(so.Base):
        def hello(self):
            return ["R"] + so.Base.hello(self)

    class C(L, R):
        def hello(self):
            return ["C"] + super().hello()

    assert C().hello() == ["C", "L", "Base"]     # R a fost sărită


# --- s-oop-container -------------------------------------------------------

def test_container_len_si_truthiness():
    assert len(so.Playlist(["a", "b"])) == 2
    assert bool(so.Playlist(["a"])) is True
    assert bool(so.Playlist()) is False      # gol => fals, din __len__


def test_container_getitem_index_negativ_si_slice():
    p = so.Playlist(["a", "b", "c"])
    assert p[0] == "a" and p[-1] == "c"
    assert p[1:] == ["b", "c"]
    with pytest.raises(IndexError):
        p[3]


def test_container_iter_poate_fi_parcurs_de_mai_multe_ori():
    p = so.Playlist(["a", "b"])
    assert list(p) == ["a", "b"]
    assert list(p) == ["a", "b"]
    assert iter(p) is not p


def test_container_contains():
    p = so.Playlist(["a", "b"])
    assert "a" in p and "z" not in p


def test_container_in_merge_si_fara_contains_prin_iter():
    # Contrastul pentru punctul 4: fallback pe __iter__.
    class FaraContains:
        def __iter__(self):
            return iter([1, 2])

    assert 2 in FaraContains() and 3 not in FaraContains()


def test_container_getitem_singur_permite_for_dar_iter_il_face_explicit():
    # Protocolul vechi: __getitem__ + IndexError.
    class Vechi:
        def __getitem__(self, i):
            return [1, 2][i]

    assert list(Vechi()) == [1, 2]
    assert hasattr(so.Playlist, "__iter__")
