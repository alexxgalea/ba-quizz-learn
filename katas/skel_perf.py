# Referințele de schelet pentru modulul perf.
# Fiecare secțiune „=== s-… ===” ajunge în aplicație
# (build.mjs); testele sunt în test_skel_perf.py.

# === s-perf-profile ===
import cProfile
import io
import pstats
import timeit


def profile(fn, sort="tottime", top=10):
    with cProfile.Profile() as pr:
        fn()  # doar ce măsori
    out = io.StringIO()
    st = pstats.Stats(pr, stream=out)
    st.sort_stats(sort)
    st.print_stats(top)
    return out.getvalue()


def best_of(fn, n=1000, repeat=5):
    # min, nu media: zgomotul doar adaugă
    runs = timeit.repeat(
        fn, number=n, repeat=repeat)
    return min(runs) / n  # s pe apel
# === end ===
