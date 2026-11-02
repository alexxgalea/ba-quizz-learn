# Referințele de schelet pentru modulul python.
# Fiecare secțiune „=== s-… ===” ajunge în aplicație
# (build.mjs); testele sunt în test_skel_python.py.
# Doar sintaxă compatibilă cu Python 3.10.

# === s-python-gen-pipeline ===
from itertools import islice


def read_lines(path):
    # with în generator: se închide la
    # epuizare și la close()
    with open(path) as f:
        for line in f:
            yield line.rstrip("\n")


def grep(lines, word):
    return (s for s in lines if word in s)


def head(lines, n):
    return islice(lines, n)


def first_matches(path, word, n):
    lines = read_lines(path)
    return head(grep(lines, word), n)
# === end ===


# === s-python-gen-send ===
def averager():
    total = count = 0
    while True:
        x = yield  # din send()
        if x is None:
            return total / max(count, 1)
        total += x
        count += 1


def collector(results):
    while True:
        # yield from = valoarea din return
        avg = yield from averager()
        results.append(avg)
# === end ===


# === s-python-decorator ===
import functools


def limit_calls(n):
    def decorator(func):
        used = 0

        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            nonlocal used
            if used >= n:
                raise RuntimeError("max")
            used += 1
            return func(*args, **kwargs)

        return wrapper

    return decorator
# === end ===


# === s-python-ctx ===
from contextlib import contextmanager


class Managed:
    def __init__(self, log):
        self.log = log

    def __enter__(self):
        self.log.append("open")
        return self

    def __exit__(self, exc_type, exc, tb):
        self.log.append("close")
        return False  # propagă


@contextmanager
def managed(log):
    log.append("open")
    try:
        yield log
    finally:
        log.append("close")
# === end ===


# === s-python-iter ===
class Countdown:
    def __init__(self, start):
        self.start = start

    def __iter__(self):
        # iterator nou la fiecare for
        return CountdownIter(self.start)


class CountdownIter:
    def __init__(self, n):
        self.n = n

    def __iter__(self):
        return self

    def __next__(self):
        if self.n <= 0:
            raise StopIteration
        value = self.n
        self.n -= 1
        return value
# === end ===


# === s-python-collections ===
import heapq
from collections import (
    Counter, defaultdict, deque)


def top_words(words, k):
    return Counter(words).most_common(k)


def group_by_len(words):
    groups = defaultdict(list)
    for w in words:
        groups[len(w)].append(w)
    return groups


def last_n(items, n):
    window = deque(maxlen=n)
    for x in items:
        window.append(x)
    return list(window)


def biggest(scores, k):
    pairs = scores.items()
    return heapq.nlargest(
        k, pairs, key=lambda p: p[1])
# === end ===
