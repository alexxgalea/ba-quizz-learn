# Testele referinței de schelet pentru modulul runtime (memorie).
# Verifică proprietățile apărate de punctele esențiale: __slots__ elimină __dict__,
# getsizeof e superficial, generatorul are mărime constantă și se consumă o singură dată.
import inspect
import sys
import tracemalloc

import pytest

from skel_runtime import Plain, Slim, size, squares


def test_slots_instanta_fara_dict():
    assert hasattr(Plain(1, 2), "__dict__")
    assert not hasattr(Slim(1, 2), "__dict__")


def test_slots_atribut_nedeclarat_da_attribute_error():
    Plain(1, 2).z = 3                          # se poate
    with pytest.raises(AttributeError):
        Slim(1, 2).z = 3
    s = Slim(1, 2)
    s.x = 10                                   # cele declarate se pot schimba
    assert (s.x, s.y) == (10, 2)


def test_size_include_dict_ul_instantei():
    p = Plain(1, 2)
    assert size(p) > sys.getsizeof(p)          # getsizeof singur nu vede __dict__
    s = Slim(1, 2)
    assert size(s) == sys.getsizeof(s)         # fără __dict__ nu se adaugă nimic
    assert size(p) > size(s)


def amprenta(make, n):
    """Memoria rămasă în urmă de n obiecte, măsurată cu tracemalloc (nu cu getsizeof)."""
    tracemalloc.start()
    try:
        tinute = [make(i) for i in range(n)]
        curent, _ = tracemalloc.get_traced_memory()
        assert len(tinute) == n
        return curent
    finally:
        tracemalloc.stop()


def test_slots_ocupa_mai_putina_memorie_pentru_multe_obiecte():
    n = 20_000
    assert amprenta(lambda i: Slim(i, i), n) < amprenta(lambda i: Plain(i, i), n)


def test_squares_valori_si_gol():
    assert list(squares(5)) == [0, 1, 4, 9, 16]
    assert list(squares(0)) == []


def test_squares_e_generator_lenes():
    g = squares(10**12)                        # nu se construiește nimic până nu cerem
    assert inspect.isgenerator(g)
    assert next(g) == 0 and next(g) == 1


def test_generatorul_are_marime_constanta_lista_creste():
    assert sys.getsizeof(squares(10)) == sys.getsizeof(squares(10**9))
    assert sys.getsizeof(list(squares(10_000))) > 50 * sys.getsizeof(squares(10_000))


def test_getsizeof_este_superficial():
    mici = [str(i) for i in range(100)]
    mari = ["x" * 10_000 for _ in range(100)]
    assert sys.getsizeof(mici) == sys.getsizeof(mari)   # conținutul nu intră în calcul


def test_generatorul_se_consuma_o_singura_data():
    g = squares(3)
    assert sum(g) == 5
    assert sum(g) == 0                         # a doua trecere e goală


def test_suma_pe_generator_nu_construieste_lista():
    n = 50_000
    tracemalloc.start()
    sum(squares(n))
    _, varf_gen = tracemalloc.get_traced_memory()
    tracemalloc.reset_peak()
    sum(list(squares(n)))
    _, varf_lista = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    assert varf_gen * 20 < varf_lista
