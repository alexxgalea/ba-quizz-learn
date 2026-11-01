# Referința de schelet s-sqlalchemy-tx.
# Secțiunea „=== s-… ===” ajunge în aplicație
# (build.mjs); testele sunt în test_skel_sqlalchemy.py.
# Testul copiază fișierul ca revizia 0002 într-un mediu Alembic real.

# === s-sqlalchemy-tx ===
import sqlalchemy as sa
from alembic import op
from sqlalchemy.orm import (
    DeclarativeBase, Mapped, Session,
    mapped_column)


class Base(DeclarativeBase):
    pass


class Account(Base):
    __tablename__ = "account"
    id: Mapped[int] = mapped_column(
        primary_key=True)
    balance: Mapped[int]
    currency: Mapped[str] = mapped_column(
        server_default="RON")


def transfer(engine, src, dst, amount):
    with Session(engine) as s, s.begin():
        acc = {}
        # ordine fixă: fără deadlock
        for i in sorted((src, dst)):
            acc[i] = s.get(
                Account, i,
                with_for_update=True)
        if acc[src].balance < amount:
            raise ValueError("sold mic")
        acc[src].balance -= amount
        acc[dst].balance += amount
    # ieșire normală din begin(): commit;
    # la excepție: rollback


# migrarea Alembic (versions/0002_*.py)
revision = "0002"
down_revision = "0001"


def upgrade():
    op.add_column("account", sa.Column(
        "currency", sa.String(3),
        nullable=False,
        server_default="RON"))


def downgrade():
    op.drop_column("account", "currency")
# === end ===
