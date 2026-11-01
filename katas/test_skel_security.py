# Testele referințelor de schelet pentru modulul security.
# Verifică proprietatea apărată de punctele esențiale: o intrare rea nu schimbă
# query-ul, parola nu se stochează în clar și se compară în timp constant,
# tokenul JWT se respinge când algoritmul, audiența sau expirarea nu se potrivesc.
import base64
import hmac
import json
import sqlite3
import time

import jwt
import pytest

from skel_security import check_pw, find_users, hash_pw, user_id, verify


# --- s-security-sql ---

class Spy:
    """Înregistrează SQL-ul și parametrii trimiși, apoi deleagă conexiunii reale."""

    def __init__(self, db):
        self.db = db
        self.seen = []

    def execute(self, sql, params=()):
        self.seen.append((sql, params))
        return self.db.execute(sql, params)


@pytest.fixture
def db():
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)")
    con.executemany("INSERT INTO users (name) VALUES (?)", [("alice",), ("bob",), ("O'Brien",)])
    yield con
    con.close()


ATACURI = ["x' OR '1'='1", "'; DROP TABLE users; --", "alice' --", "' UNION SELECT 1, name FROM users --"]


def naiv(db, name):
    """Varianta greșită: f-string. Control: dovedește că atacurile de mai sus chiar funcționează aici."""
    return db.execute(f"SELECT id, name FROM users WHERE name = '{name}'").fetchall()


def test_sql_cautare_normala(db):
    assert find_users(db, "alice") == [(1, "alice")]
    assert find_users(db, "nimeni") == []


def test_sql_apostroful_dintr_un_nume_real_e_doar_date(db):
    assert find_users(db, "O'Brien") == [(3, "O'Brien")]


def test_sql_controlul_f_string_chiar_e_vulnerabil(db):
    # fără controlul ăsta, testele de mai jos ar putea trece degeaba
    assert len(naiv(db, "x' OR '1'='1")) == 3
    assert naiv(db, "alice' --") == [(1, "alice")]


@pytest.mark.parametrize("atac", ATACURI)
def test_sql_intrarea_malitioasa_nu_schimba_query_ul(db, atac):
    spy = Spy(db)
    find_users(spy, "alice")
    find_users(spy, atac)
    (sql_normal, _), (sql_atac, params_atac) = spy.seen
    assert sql_atac == sql_normal              # textul SQL e identic
    assert atac not in sql_atac                # valoarea nu ajunge în text
    assert params_atac == (atac,)              # ea merge separat, ca tuplu
    assert find_users(db, atac) == []          # nu există niciun utilizator cu numele ăsta
    assert db.execute("SELECT COUNT(*) FROM users").fetchone() == (3,)   # tabelul e intact


def test_sql_sortare_din_lista_alba(db):
    assert [n for _, n in find_users(db, "bob", sort="name")] == ["bob"]
    db.execute("INSERT INTO users (name) VALUES ('bob')")
    assert [i for i, _ in find_users(db, "bob", sort="id")] == [2, 4]


@pytest.mark.parametrize("sort", ["id; DROP TABLE users", "name DESC", "1", "", "nume"])
def test_sql_coloana_in_afara_listei_e_respinsa(db, sort):
    spy = Spy(db)
    with pytest.raises(ValueError):
        find_users(spy, "alice", sort=sort)
    assert spy.seen == []                      # nu a ajuns la bază
    assert db.execute("SELECT COUNT(*) FROM users").fetchone() == (3,)


# --- s-security-pw ---

def test_pw_parola_corecta_si_gresita():
    s = hash_pw("parola-mea", n=1000)
    assert check_pw("parola-mea", s) is True
    assert check_pw("alta-parola", s) is False
    assert check_pw("", s) is False


def test_pw_acelasi_text_da_hash_diferit_din_cauza_salt_ului():
    a, b = hash_pw("parola-mea", n=1000), hash_pw("parola-mea", n=1000)
    assert a != b
    assert a.split("$")[1] != b.split("$")[1]  # salt-urile diferă
    assert len(bytes.fromhex(a.split("$")[1])) >= 16
    assert check_pw("parola-mea", a) and check_pw("parola-mea", b)


def test_pw_valoarea_stocata_nu_contine_parola():
    s = hash_pw("s3cr3t-unic", n=1000)
    assert "s3cr3t-unic" not in s
    assert "s3cr3t-unic".encode().hex() not in s


def test_pw_costul_implicit_este_cel_recomandat():
    n = hash_pw("x").split("$")[0]
    assert int(n) >= 600_000                   # OWASP, PBKDF2-HMAC-SHA256


def test_pw_costul_si_salt_ul_se_citesc_din_valoarea_stocata():
    veche = hash_pw("parola-mea", n=1000)
    assert veche.startswith("1000$")
    assert check_pw("parola-mea", veche)       # verificarea folosește costul vechi


def test_pw_pbkdf2_cu_o_iteratie_e_hmac_ul_din_definitie():
    # RFC 8018: cu c = 1, DK = HMAC(parola, salt || INT(1)). Sursă independentă de hashlib.
    asteptat = hmac.new(b"parola", b"sare" + b"\x00\x00\x00\x01", "sha256").hexdigest()
    n, salt, dk = hash_pw("parola", salt=b"sare", n=1).split("$")
    assert (n, salt) == ("1", b"sare".hex())
    assert dk == asteptat


def test_pw_compara_cu_compare_digest_nu_cu_egal(monkeypatch):
    apeluri = []
    original = hmac.compare_digest

    def spy(a, b):
        apeluri.append((a, b))
        return original(a, b)

    monkeypatch.setattr(hmac, "compare_digest", spy)
    s = hash_pw("parola-mea", n=1000)
    assert check_pw("parola-mea", s) is True
    assert len(apeluri) == 1


# --- s-security-jwt ---

KEY = "o-cheie-de-test-lunga-de-cel-putin-32-de-octeti!!"
ACUM = int(time.time())


def token(extra=None, key=KEY, alg="HS256", drop=()):
    claims = {"sub": "u1", "aud": "api", "exp": ACUM + 300}
    claims.update(extra or {})
    for d in drop:
        claims.pop(d, None)
    return jwt.encode(claims, key, algorithm=alg)


def b64(d):
    return base64.urlsafe_b64encode(json.dumps(d).encode()).rstrip(b"=").decode()


def test_jwt_token_valid():
    assert verify(token(), KEY)["sub"] == "u1"
    assert user_id(token(), KEY) == "u1"


def test_jwt_token_expirat():
    t = token({"exp": ACUM - 10})
    with pytest.raises(jwt.ExpiredSignatureError):
        verify(t, KEY)
    assert user_id(t, KEY) is None


def test_jwt_audienta_gresita():
    t = token({"aud": "alt-serviciu"})
    with pytest.raises(jwt.InvalidAudienceError):
        verify(t, KEY)
    assert user_id(t, KEY) is None


@pytest.mark.parametrize("lipsa", ["exp", "aud", "sub"])
def test_jwt_claim_obligatoriu_lipsa(lipsa):
    t = token(drop=(lipsa,))
    with pytest.raises(jwt.MissingRequiredClaimError):
        verify(t, KEY)
    assert user_id(t, KEY) is None


def test_jwt_alg_none_e_respins():
    # token nesemnat, făcut de mână: antet {"alg": "none"}, semnătură goală
    t = b64({"alg": "none", "typ": "JWT"}) + "." + b64({"sub": "admin", "aud": "api", "exp": ACUM + 300}) + "."
    with pytest.raises(jwt.InvalidTokenError):
        verify(t, KEY)
    assert user_id(t, KEY) is None


def test_jwt_alt_algoritm_decat_cel_asteptat_e_respins():
    t = token(alg="HS384")                     # semnătură corectă, dar algoritm neașteptat
    with pytest.raises(jwt.InvalidAlgorithmError):
        verify(t, KEY)
    assert user_id(t, KEY) is None


def test_jwt_cheie_gresita():
    t = token(key="alta-cheie-de-test-lunga-de-cel-putin-32-de-octeti!!")
    with pytest.raises(jwt.InvalidSignatureError):
        verify(t, KEY)
    assert user_id(t, KEY) is None


def test_jwt_continut_modificat():
    h, p, s = token().split(".")
    fals = b64({"sub": "admin", "aud": "api", "exp": ACUM + 300})
    with pytest.raises(jwt.InvalidSignatureError):
        verify(".".join([h, fals, s]), KEY)


def test_jwt_gunoi_nu_ridica_din_user_id():
    for gunoi in ["", "abc", "a.b.c", "....", token()[:-3]]:
        assert user_id(gunoi, KEY) is None
