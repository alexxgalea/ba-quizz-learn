# Referințele de schelet pentru modulul gil.
# Fiecare secțiune „=== s-… ===” ajunge în aplicație
# (build.mjs); testele sunt în test_skel_gil.py.

# === s-gil-bq ===
from collections import deque
from threading import Condition, Lock


class BoundedQueue:
    def __init__(self, cap):
        if cap < 1:
            raise ValueError(cap)
        self.cap = cap
        self.q = deque()
        lock = Lock()
        # două condiții, același lock
        self.not_full = Condition(lock)
        self.not_empty = Condition(lock)

    def put(self, item):
        with self.not_full:
            # while, nu if: altul poate
            # lua locul cât dormi
            while len(self.q) >= self.cap:
                self.not_full.wait()
            self.q.append(item)
            self.not_empty.notify()

    def get(self):
        with self.not_empty:
            while not self.q:
                self.not_empty.wait()
            item = self.q.popleft()
            self.not_full.notify()
            return item

    def __len__(self):
        with self.not_full:
            return len(self.q)
# === end ===
