# Referințele de schelet pentru modulul oop.
# Fiecare secțiune „=== s-… ===” ajunge în aplicație
# (build.mjs); testele sunt în test_skel_oop.py.
# Doar sintaxă compatibilă cu Python 3.10.

# === s-oop-value ===
from dataclasses import dataclass


class Tag:
    def __init__(self, name):
        self._name = name

    @property
    def name(self):
        return self._name

    def __eq__(self, other):
        if not isinstance(other, Tag):
            return NotImplemented
        return self.name == other.name

    def __hash__(self):
        return hash(self.name)


@dataclass(frozen=True)
class Money:
    amount: int
    currency: str
# === end ===


# === s-oop-property ===
class Product:
    def __init__(self, name, price):
        self.name = name
        self.price = price  # prin setter

    @property
    def price(self):
        return self._price

    @price.setter
    def price(self, value):
        if value < 0:
            raise ValueError(value)
        self._price = value

    @classmethod
    def from_dict(cls, data):
        return cls(**data)
# === end ===


# === s-oop-abc-protocol ===
from abc import ABC, abstractmethod
from typing import (
    Protocol, runtime_checkable)


class Storage(ABC):
    @abstractmethod
    def save(self, key, value):
        ...


class MemoryStorage(Storage):
    def __init__(self):
        self.data = {}

    def save(self, key, value):
        self.data[key] = value


@runtime_checkable
class Notifier(Protocol):
    def send(self, msg: str) -> None: ...


class MemoryNotifier:  # fără moștenire
    def __init__(self):
        self.out = []

    def send(self, msg: str) -> None:
        self.out.append(msg)


def alert(notifier: Notifier, msg):
    notifier.send(msg)
# === end ===


# === s-oop-composition ===
class Signup:
    def __init__(self, mailer):
        self.mailer = mailer   # injectat

    def register(self, email):
        if "@" not in email:
            raise ValueError(email)
        self.mailer.send(email, "salut")


class FakeMailer:
    def __init__(self):
        self.sent = []

    def send(self, to, text):
        self.sent.append((to, text))


def test_register_trimite_mail():
    mailer = FakeMailer()
    Signup(mailer).register("a@b.ro")
    assert mailer.sent == [
        ("a@b.ro", "salut")]
# === end ===


# === s-oop-super ===
class Base:
    def hello(self):
        return ["Base"]


class Left(Base):
    def hello(self):
        return ["Left"] + super().hello()


class Right(Base):
    def hello(self):
        return ["Right"] + super().hello()


class Child(Left, Right):
    def hello(self):
        return ["Child"] + super().hello()
# === end ===


# === s-oop-container ===
class Playlist:
    def __init__(self, songs=()):
        self._songs = list(songs)

    def __len__(self):
        return len(self._songs)

    def __getitem__(self, index):
        return self._songs[index]

    def __iter__(self):
        return iter(self._songs)

    def __contains__(self, song):
        return song in self._songs
# === end ===
