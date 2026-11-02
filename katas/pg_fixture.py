"""Postgres temporar pentru testele referințelor de schelet (sqlalchemy, postgres, index).

Folosire, în fișierul de test:

    from pg_fixture import pg_db, pg_server, sql_section, sql_statements  # noqa: F401

* `pg_server` (sesiune): inițializează un cluster într-un director temporar, îl pornește pe un
  socket unix și pe un port liber, apoi îl oprește și îl șterge la final. Preferă Postgres 16
  (/usr/lib/postgresql/16/bin, apoi PATH, apoi alte versiuni); `PG_BIN` suprascrie căutarea.
  Dacă binarele lipsesc, testele sunt SĂRITE cu un mesaj clar (nu pică).
* `pg_db` (funcție): o bază de date nouă pentru fiecare test, ștearsă după el.
* Ca root, Postgres refuză să pornească; fixture-ul rulează comenzile ca utilizatorul `postgres`
  (`runuser`). Dacă nu există nici acesta, testele sunt sărite cu mesaj.
"""
import glob
import itertools
import os
import re
import shutil
import socket
import subprocess
import tempfile
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
WANT_MAJOR = 16
MISSING = (
    "Postgres lipsește: instalează postgresql-16 (initdb, pg_ctl, postgres) "
    "sau setează PG_BIN către directorul cu binare."
)


def _find_bin():
    """(director, versiune majoră) pentru cel mai potrivit set de binare Postgres, sau None."""
    dirs = []
    if os.environ.get("PG_BIN"):
        dirs.append(os.environ["PG_BIN"])
    dirs += glob.glob("/usr/lib/postgresql/*/bin")
    which = shutil.which("pg_ctl")
    if which:
        dirs.append(str(Path(which).parent))
    found = []
    for d in dirs:
        if not all((Path(d) / b).is_file() for b in ("initdb", "pg_ctl", "postgres")):
            continue
        try:
            out = subprocess.run(
                [str(Path(d) / "postgres"), "--version"], capture_output=True, text=True, timeout=20
            ).stdout
            major = int(re.search(r"(\d+)(?:\.\d+)?", out).group(1))
        except Exception:
            continue
        found.append((d, major))
    if not found:
        return None
    # PG_BIN primul, apoi 16, apoi cea mai nouă
    pinned = os.environ.get("PG_BIN")
    found.sort(key=lambda x: (x[0] != pinned, x[1] != WANT_MAJOR, -x[1]))
    return found[0]


def _free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class PgServer:
    def __init__(self, bindir, major, root, port):
        self.bindir, self.major, self.root, self.port = bindir, major, root, port
        self.host = str(root)           # directorul socketului unix
        self._n = itertools.count(1)

    @property
    def data(self):
        return str(Path(self.root) / "data")

    def dsn(self, dbname="postgres"):
        return "host=%s port=%d user=postgres dbname=%s" % (self.host, self.port, dbname)

    def url(self, dbname="postgres"):
        """URL SQLAlchemy (driver psycopg 3)."""
        return "postgresql+psycopg://postgres@/%s?host=%s&port=%d" % (dbname, self.host, self.port)

    def new_db(self):
        import psycopg
        name = "t%d_%d" % (os.getpid(), next(self._n))
        with psycopg.connect(self.dsn(), autocommit=True) as c:
            c.execute('CREATE DATABASE "%s"' % name)
        return PgDb(self, name)


class PgDb:
    def __init__(self, server, name):
        self.server, self.name = server, name
        self.url = server.url(name)
        self.dsn = server.dsn(name)

    def connect(self, autocommit=True, **kw):
        import psycopg
        return psycopg.connect(self.dsn, autocommit=autocommit, **kw)

    def drop(self):
        import psycopg
        with psycopg.connect(self.server.dsn(), autocommit=True) as c:
            c.execute('DROP DATABASE IF EXISTS "%s" WITH (FORCE)' % self.name)


def _sudo_prefix():
    """Ca root, comenzile Postgres rulează ca utilizatorul `postgres`."""
    if os.geteuid() != 0:
        return []
    try:
        import pwd
        pwd.getpwnam("postgres")
    except KeyError:
        pytest.skip("Rulezi ca root și utilizatorul `postgres` lipsește: Postgres refuză să pornească ca root. " + MISSING)
    if not shutil.which("runuser"):
        pytest.skip("Rulezi ca root și `runuser` lipsește. " + MISSING)
    return ["runuser", "-u", "postgres", "--"]


@pytest.fixture(scope="session")
def pg_server():
    pytest.importorskip("psycopg", reason="lipsește psycopg: pip install -r katas/requirements-sql.txt")
    found = _find_bin()
    if not found:
        pytest.skip(MISSING)
    bindir, major = found
    prefix = _sudo_prefix()
    root = tempfile.mkdtemp(prefix="skelpg-")
    if prefix:
        import pwd
        pw = pwd.getpwnam("postgres")
        os.chown(root, pw.pw_uid, pw.pw_gid)
    os.chmod(root, 0o755)
    port = _free_port()
    srv = PgServer(bindir, major, root, port)

    def run(*cmd):
        r = subprocess.run(prefix + [str(Path(bindir) / cmd[0])] + list(cmd[1:]), capture_output=True, text=True, timeout=120)
        if r.returncode != 0:
            raise RuntimeError("%s a eșuat:\n%s%s" % (cmd[0], r.stdout, r.stderr))
        return r

    try:
        run("initdb", "-D", srv.data, "-U", "postgres", "--auth=trust", "-E", "UTF8", "--no-locale", "--no-sync")
        with open(Path(srv.data) / "postgresql.conf", "a") as f:
            f.write(
                "\nlisten_addresses = ''\nunix_socket_directories = '%s'\nport = %d\n"
                "fsync = off\nsynchronous_commit = off\nfull_page_writes = off\n"
                "max_connections = 60\nshared_buffers = 64MB\n" % (root, port)
            )
        run("pg_ctl", "-D", srv.data, "-w", "-t", "60", "-l", str(Path(root) / "pg.log"), "start")
    except Exception:
        log = Path(root) / "pg.log"
        tail = log.read_text()[-2000:] if log.exists() else ""
        shutil.rmtree(root, ignore_errors=True)
        raise RuntimeError("Postgres nu a pornit.\n" + tail)
    try:
        yield srv
    finally:
        subprocess.run(prefix + [str(Path(bindir) / "pg_ctl"), "-D", srv.data, "-m", "immediate", "-w", "stop"],
                       capture_output=True, timeout=60)
        shutil.rmtree(root, ignore_errors=True)


@pytest.fixture
def pg_db(pg_server):
    db = pg_server.new_db()
    try:
        yield db
    finally:
        db.drop()


# ---- referințele SQL: secțiunile „-- === s-… ===” din fișierele .sql ----
def sql_section(filename, sid):
    """Textul secțiunii `sid` din katas/<filename> (exact ce arată aplicația)."""
    src = (HERE / filename).read_text()
    m = re.search(r"^-- === %s ===\n(.*?)^-- === end ===" % re.escape(sid), src, re.S | re.M)
    assert m, "secțiunea %s lipsește din %s" % (sid, filename)
    return m.group(1)


def sql_statements(text):
    """Comenzile dintr-un text SQL (fără comentarii `--`), separate prin `;`."""
    clean = "\n".join(re.sub(r"--.*$", "", l) for l in text.splitlines())
    return [s.strip() for s in clean.split(";") if s.strip()]
