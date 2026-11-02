# Testele referințelor de schelet pentru modulul celery.
# Verifică proprietățile apărate de punctele esențiale (retry doar pe erori
# tranzitorii, backoff, idempotență, legătura dintre pașii unui lanț).
# Corpul fiecărui task se testează apelat direct; modul eager (.apply())
# verifică doar legătura dintre apeluri, fiindcă emulează un worker, nu îl înlocuiește.
import pytest
from celery.app.task import Task

import skel_celery_canvas as canvas
import skel_celery_retry as retry


# --- s-celery-retry ---

@pytest.fixture
def mail(monkeypatch):
    """Un `deliver` fals care înregistrează apelurile și pică după o listă de erori."""

    class Fake:
        def __init__(self):
            self.calls = []
            self.errors = []   # excepții de ridicat, câte una pe apel

        def __call__(self, to, body):
            self.calls.append(to)
            if self.errors:
                raise self.errors.pop(0)

    fake = Fake()
    monkeypatch.setattr(retry, "deliver", fake)
    monkeypatch.setattr(retry, "SENT", set())
    return fake


def test_retry_trimite_o_data(mail):
    assert retry.send_mail.run("k1", "a@x.ro", "salut") == "sent"
    assert mail.calls == ["a@x.ro"]


def test_retry_idempotent_la_aceeasi_cheie(mail):
    retry.send_mail.run("k1", "a@x.ro", "salut")
    assert retry.send_mail.run("k1", "a@x.ro", "salut") == "skipped"
    assert mail.calls == ["a@x.ro"]            # al doilea apel nu a mai trimis


def test_retry_chei_diferite_trimit_amandoua(mail):
    retry.send_mail.run("k1", "a@x.ro", "salut")
    retry.send_mail.run("k2", "b@x.ro", "salut")
    assert mail.calls == ["a@x.ro", "b@x.ro"]


def test_retry_cheia_se_marcheaza_dupa_efect(mail):
    # dacă trimiterea pică, cheia nu e marcată: reîncercarea trebuie să poată trimite
    mail.errors = [ConnectionError("jos")]
    with pytest.raises(ConnectionError):
        retry.send_mail.run("k1", "a@x.ro", "salut")
    assert "k1" not in retry.SENT
    assert retry.send_mail.run("k1", "a@x.ro", "salut") == "sent"


def test_retry_reincearca_pe_eroare_de_retea_apoi_reuseste(mail):
    mail.errors = [ConnectionError("jos"), ConnectionError("jos")]
    res = retry.send_mail.apply(args=("k1", "a@x.ro", "salut"))
    assert res.get() == "sent"
    assert len(mail.calls) == 3                # 2 eșecuri + succesul
    # redelivery după succes: nu mai trimite
    assert retry.send_mail.apply(args=("k1", "a@x.ro", "salut")).get() == "skipped"
    assert len(mail.calls) == 3


def test_retry_se_opreste_la_max_retries(mail):
    mail.errors = [ConnectionError("jos")] * 50
    res = retry.send_mail.apply(args=("k1", "a@x.ro", "salut"))
    assert res.failed()
    assert isinstance(res.result, ConnectionError)
    assert len(mail.calls) == 1 + 5            # apelul inițial + max_retries
    assert "k1" not in retry.SENT


def test_retry_nu_reincearca_o_eroare_permanenta(mail):
    # autoretry_for e o listă îngustă: ValueError nu e o problemă tranzitorie
    mail.errors = [ValueError("adresă invalidă")]
    res = retry.send_mail.apply(args=("k1", "a@x.ro", "salut"))
    assert res.failed()
    assert isinstance(res.result, ValueError)
    assert len(mail.calls) == 1


def test_retry_backoff_exponential_cu_jitter(mail, monkeypatch):
    countdowns = []
    original = Task.retry

    def spy(self, *args, **kwargs):
        countdowns.append(kwargs.get("countdown"))
        return original(self, *args, **kwargs)

    monkeypatch.setattr(Task, "retry", spy)
    mail.errors = [ConnectionError("jos")] * 4
    retry.send_mail.apply(args=("k1", "a@x.ro", "salut")).get()
    assert len(countdowns) == 4
    for i, c in enumerate(countdowns):
        # întârzierea crește ca 1, 2, 4, 8 s, cu jitter (între 0 și plafon), sub retry_backoff_max
        assert 0 <= c <= min(2 ** i, 60)


def test_retry_setarile_cerute():
    t = retry.send_mail
    assert t.autoretry_for == (ConnectionError,)
    assert t.max_retries == 5
    assert t.retry_backoff is True
    assert t.retry_backoff_max == 60
    assert t.retry_jitter is True
    assert t.acks_late is True


# --- s-celery-canvas ---

def test_canvas_pasii_direct():
    assert canvas.fetch("abc") == {"url": "abc", "n": 3}
    assert canvas.parse({"n": 4}) == 4
    assert canvas.store(4, "u") == ("u", 4)    # rezultatul anterior e primul argument


def test_canvas_lantul_paseaza_rezultatul_ca_prim_argument():
    assert canvas.one("abc").apply().get() == ("abc", 3)


def test_canvas_grupul_pastreaza_ordinea_intrarii():
    urls = ["ccc", "a", "bb"]                  # nici alfabetic, nici după lungime
    assert canvas.many(urls).apply().get() == [("ccc", 3), ("a", 1), ("bb", 2)]


def test_canvas_grup_gol():
    assert canvas.many([]).apply().get() == []


def test_canvas_o_eroare_dintr_un_pas_ajunge_la_cel_care_cere_rezultatul():
    with pytest.raises(TypeError):
        canvas.one(None).apply().get()         # len(None) pică în fetch


def test_canvas_pasii_sunt_semnaturi_nu_apeluri():
    # lanțul se construiește fără să ruleze nimic
    c = canvas.one("abc")
    assert len(c.tasks) == 3
    g = canvas.many(["a", "b"])
    assert len(g.tasks) == 2
