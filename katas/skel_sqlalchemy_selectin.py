# Referința de schelet s-sqlalchemy-selectin.
# Secțiunea „=== s-… ===” ajunge în aplicație
# (build.mjs); testele sunt în test_skel_sqlalchemy.py.

# === s-sqlalchemy-selectin ===
from contextlib import contextmanager

from sqlalchemy import (
    ForeignKey, event, select)
from sqlalchemy.orm import (
    DeclarativeBase, Mapped, Session,
    mapped_column, relationship,
    selectinload)


class Base(DeclarativeBase):
    pass


class Author(Base):
    __tablename__ = "author"
    id: Mapped[int] = mapped_column(
        primary_key=True)
    name: Mapped[str]
    books: Mapped[list["Book"]] = (
        relationship())


class Book(Base):
    __tablename__ = "book"
    id: Mapped[int] = mapped_column(
        primary_key=True)
    title: Mapped[str]
    author_id: Mapped[int] = (
        mapped_column(
            ForeignKey("author.id")))


def titles_by_author(session):
    stmt = select(Author).options(
        selectinload(Author.books))
    return {
        a.name: [b.title for b in a.books]
        for a in session.scalars(stmt)}


@contextmanager
def count_queries(engine):
    seen = []
    evt = "before_cursor_execute"

    def on_exec(conn, cur, stmt, *rest):
        seen.append(stmt)

    event.listen(engine, evt, on_exec)
    try:
        yield seen
    finally:
        event.remove(engine, evt, on_exec)
# === end ===
