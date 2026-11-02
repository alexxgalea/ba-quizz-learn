# Referința de schelet pentru modulul django: select_related / prefetch_related lângă joinedload / selectinload.
# Fiecare secțiune „=== s-… ===” ajunge în aplicație (build.mjs); testele sunt în test_skel_django.py.
import django
from django.apps import AppConfig
from django.conf import settings


# --- schela testului (nu apare în aplicație): modelele din cerință, în baze SQLite în memorie ---
class ShopConfig(AppConfig):
    # fără aplicație înregistrată, Django nu vede relațiile inverse la delete() (fără cascadă)
    name = "skel_django"
    label = "shop"


if not settings.configured:
    settings.configure(
        DATABASES={"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}},
        INSTALLED_APPS=["skel_django.ShopConfig"],
        USE_TZ=True,
        DEFAULT_AUTO_FIELD="django.db.models.BigAutoField",
    )
    django.setup()

from django.db import connection, models  # noqa: E402
from sqlalchemy import ForeignKey, create_engine  # noqa: E402
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402


class Author(models.Model):
    name = models.CharField(max_length=50)

    class Meta:
        app_label = "shop"


class Book(models.Model):
    title = models.CharField(max_length=80)
    author = models.ForeignKey(Author, on_delete=models.CASCADE, related_name="books")

    class Meta:
        app_label = "shop"


class Base(DeclarativeBase):
    pass


class SAAuthor(Base):
    __tablename__ = "author"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    books: Mapped[list["SABook"]] = relationship(back_populates="author")


class SABook(Base):
    __tablename__ = "book"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str]
    author_id: Mapped[int] = mapped_column(ForeignKey("author.id"))
    author: Mapped[SAAuthor] = relationship(back_populates="books")


engine = create_engine("sqlite://", poolclass=StaticPool)


def create_schema():
    with connection.schema_editor() as editor:
        editor.create_model(Author)
        editor.create_model(Book)
    Base.metadata.create_all(engine)


def seed(books_by_author):
    for name, titles in books_by_author.items():
        a = Author.objects.create(name=name)
        Book.objects.bulk_create([Book(title=t, author=a) for t in titles])
        with Session(engine) as s:
            s.add(SAAuthor(name=name, books=[SABook(title=t) for t in titles]))
            s.commit()


def unseed(name):
    Author.objects.filter(name=name).delete()
    with Session(engine) as s:
        for a in s.query(SAAuthor).filter_by(name=name):
            for b in a.books:
                s.delete(b)
            s.delete(a)
        s.commit()


# === s-django-orm ===
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from sqlalchemy.orm import selectinload


def books_with_author():
    qs = Book.objects.select_related(
        "author")
    return [(b.title, b.author.name)
            for b in qs]


def authors_with_books():
    qs = Author.objects.prefetch_related(
        "books")
    return [(a.name, len(a.books.all()))
            for a in qs]


def sa_books_with_author(session):
    stmt = select(SABook).options(
        joinedload(SABook.author))
    books = session.scalars(stmt)
    return [(b.title, b.author.name)
            for b in books]


def sa_authors_with_books(session):
    stmt = select(SAAuthor).options(
        selectinload(SAAuthor.books))
    authors = session.scalars(stmt)
    return [(a.name, len(a.books))
            for a in authors]
# === end ===
