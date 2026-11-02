# Referința de schelet pentru modulul runtime (memorie).
# Secțiunea „=== s-… ===” ajunge în aplicație
# (build.mjs); testele sunt în test_skel_runtime.py.

# === s-runtime-slots ===
import sys


class Plain:
    def __init__(self, x, y):
        self.x = x
        self.y = y


class Slim:
    __slots__ = ("x", "y")

    def __init__(self, x, y):
        self.x = x
        self.y = y


def size(obj):
    # getsizeof e superficial: adaugă
    # __dict__-ul, dacă instanța are unul
    n = sys.getsizeof(obj)
    if hasattr(obj, "__dict__"):
        n += sys.getsizeof(obj.__dict__)
    return n


def squares(n):
    # un element o dată, memorie constantă
    for i in range(n):
        yield i * i
# === end ===
