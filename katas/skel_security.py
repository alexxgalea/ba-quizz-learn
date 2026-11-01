# Referințele de schelet pentru modulul security.
# Fiecare secțiune „=== s-… ===” ajunge în aplicație
# (build.mjs); testele sunt în test_skel_security.py.

# === s-security-sql ===
SORT = {"id", "name"}


def find_users(db, name, sort="id"):
    # coloana nu se parametrizează:
    # lista albă
    if sort not in SORT:
        raise ValueError(sort)
    # ? la sqlite3, %s la psycopg
    cur = db.execute(
        "SELECT id, name FROM users"
        " WHERE name = ?"
        " ORDER BY " + sort,
        (name,),
    )
    return cur.fetchall()
# === end ===


# === s-security-pw ===
import hashlib
import hmac
import os

ITER = 600_000


def hash_pw(pw, salt=None, n=ITER):
    salt = salt or os.urandom(16)
    dk = hashlib.pbkdf2_hmac(
        "sha256", pw.encode(), salt, n
    )
    return f"{n}${salt.hex()}${dk.hex()}"


def check_pw(pw, stored):
    n, salt, _ = stored.split("$")
    again = hash_pw(
        pw, bytes.fromhex(salt), int(n)
    )
    # timp constant, nu ==
    return hmac.compare_digest(
        again, stored
    )
# === end ===


# === s-security-jwt ===
import jwt  # PyJWT

REQUIRED = ["exp", "aud", "sub"]


def verify(token, key, aud="api"):
    return jwt.decode(
        token,
        key,
        algorithms=["HS256"],
        audience=aud,
        options={"require": REQUIRED},
    )


def user_id(token, key):
    try:
        return verify(token, key)["sub"]
    except jwt.InvalidTokenError:
        return None  # → 401
# === end ===
