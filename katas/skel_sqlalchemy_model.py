# Referința de schelet s-sqlalchemy-model.
# Secțiunea „=== s-… ===” ajunge în aplicație
# (build.mjs); testele sunt în test_skel_sqlalchemy.py.

# === s-sqlalchemy-model ===
from sqlalchemy import select
from sqlalchemy.orm import (
    DeclarativeBase, Mapped, Session,
    mapped_column)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "user_account"

    id: Mapped[int] = mapped_column(
        primary_key=True)
    name: Mapped[str] = mapped_column(
        unique=True)
    # cu "| None" coloana e nullable
    email: Mapped[str | None]


def init_db(engine):
    Base.metadata.create_all(engine)


def create_user(engine, name, email=None):
    with Session(engine) as s:
        u = User(name=name, email=email)
        s.add(u)
        s.commit()
        return u.id


def find_by_name(engine, name):
    stmt = select(User).where(
        User.name == name)
    with Session(engine) as s:
        return s.scalars(stmt).first()
# === end ===
