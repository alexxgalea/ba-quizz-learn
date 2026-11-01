# Referința de schelet pentru modulul graphql: schema Strawberry cu resolver și DataLoader.
# Fiecare secțiune „=== s-… ===” ajunge în aplicație (build.mjs); testele sunt în test_skel_graphql.py.
import asyncio
from types import SimpleNamespace as Row

# --- schela testului (nu apare în aplicație): o „bază de date” care numără apelurile ---
CALLS, AUTHORS, BOOKS = [], {}, []


def reset():
    CALLS.clear()
    AUTHORS.clear()
    AUTHORS.update({1: "Herbert", 2: "Gibson"})
    BOOKS[:] = [("Neuromancer", 2), ("Dune", 1), ("Dune Messiah", 1)]


async def fetch_authors(ids):
    """O singură interogare `WHERE id IN (...)`: rândurile vin sortate după id, cele lipsă nu apar."""
    CALLS.append(list(ids))
    await asyncio.sleep(0)
    return [Row(id=i, name=AUTHORS[i]) for i in sorted(set(ids)) if i in AUTHORS]


async def fetch_books():
    return [Row(title=t, author_id=a) for t, a in BOOKS]


reset()


# === s-graphql-dataloader ===
import strawberry
from strawberry.dataloader import (
    DataLoader,
)


async def load_authors(keys: list[int]):
    rows = await fetch_authors(keys)
    by_id = {a.id: a for a in rows}
    # ordinea cheilor; None dacă lipsește
    return [by_id.get(k) for k in keys]


@strawberry.type
class Author:
    id: int
    name: str


@strawberry.type
class Book:
    title: str
    author_id: strawberry.Private[int]

    @strawberry.field
    async def author(
        self, info: strawberry.Info
    ) -> Author | None:
        loader = info.context["authors"]
        key = self.author_id
        return await loader.load(key)


@strawberry.type
class Query:
    @strawberry.field
    async def books(self) -> list[Book]:
        rows = await fetch_books()
        return [
            Book(title=r.title,
                 author_id=r.author_id)
            for r in rows
        ]


schema = strawberry.Schema(query=Query)


def get_context():
    # un loader nou la fiecare cerere
    loader = DataLoader(load_authors)
    return {"authors": loader}
# === end ===
