# Testele referințelor de schelet pentru modulul perf.
import cProfile
import sys
import time

import pytest

from skel_perf import best_of, profile


def busy():
    total = 0
    for i in range(200_000):         # Python pur: timpul rămâne în funcție
        total += i * i
    return total


def cheap():
    return 1


def work():
    busy()
    for _ in range(3):
        cheap()


def rows(report):
    """Rândurile de date ale raportului pstats (după antetul ncalls)."""
    lines = report.splitlines()
    head = next(i for i, l in enumerate(lines) if "ncalls" in l)
    return [l for l in lines[head + 1:] if l.strip()]


def test_raportul_arata_antetul_si_functiile():
    rep = profile(work)
    assert isinstance(rep, str)
    for col in ("ncalls", "tottime", "cumtime"):
        assert col in rep
    assert "(busy)" in rep and "(cheap)" in rep


def test_sortat_dupa_tottime_cea_mai_lenta_prima():
    first = rows(profile(work, sort="tottime"))[0]
    assert "(busy)" in first, first


def test_sortarea_cumulative_pune_apelantul_inaintea_celor_apelate():
    r = rows(profile(work, sort="cumulative"))
    names = [("(work)" in l, "(busy)" in l) for l in r]
    assert names.index((True, False)) < names.index((False, True))


def test_top_limiteaza_numarul_de_randuri():
    assert len(rows(profile(work, top=2))) == 2
    assert len(rows(profile(work, top=1))) == 1


def test_numara_apelurile():
    rep = rows(profile(work))
    cheap_row = next(l for l in rep if "(cheap)" in l)
    assert cheap_row.split()[0] == "3"


def test_profilerul_se_opreste_si_dupa_exceptie():
    # un profiler rămas activ ar strica următoarea profilare / debugger
    def boom():
        raise ValueError("x")

    with pytest.raises(ValueError):
        profile(boom)
    assert sys.getprofile() is None, "profilerul a rămas pornit"
    cProfile.Profile().runcall(lambda: None)    # încă se poate profila


def test_best_of_apeleaza_de_number_ori_repeat():
    calls = []
    best_of(lambda: calls.append(1), n=7, repeat=3)
    assert len(calls) == 21


def test_best_of_intoarce_secunde_pe_apel():
    t = best_of(lambda: time.sleep(0.002), n=10, repeat=2)
    assert 0.002 <= t < 0.01, "trebuie împărțit la n: secunde pe apel"


def test_best_of_ia_minimul_nu_media():
    # prima rulare e lentă (cache rece); minimul o ignoră
    seen = []

    def f():
        seen.append(1)
        time.sleep(0.05 if len(seen) <= 3 else 0.001)

    t = best_of(f, n=3, repeat=3)
    assert t < 0.01, "s-a luat media, nu minimul: %r" % t
