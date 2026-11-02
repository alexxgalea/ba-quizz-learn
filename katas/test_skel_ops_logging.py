# Testele referinței de logging structurat (modulul ops): JSON pe o linie, mesaj interpolat, câmpurile din `extra`,
# excepția într-un câmp. Verifică proprietatea apărată de punctele esențiale, nu doar cazul fericit.
import datetime
import io
import json
import logging

import pytest

from skel_ops_logging import JsonFormatter


@pytest.fixture
def log():
    """Un logger izolat, cu un handler JSON care scrie într-un buffer."""
    buf = io.StringIO()
    handler = logging.StreamHandler(buf)
    handler.setFormatter(JsonFormatter())
    lg = logging.getLogger("t.%d" % id(buf))
    lg.setLevel(logging.INFO)
    lg.propagate = False
    lg.addHandler(handler)
    lg.buf = buf
    return lg


def lines(lg):
    return [json.loads(x) for x in lg.buf.getvalue().splitlines()]


def test_un_obiect_json_pe_linie(log):
    log.info("pornit")
    log.warning("lent")
    raw = log.buf.getvalue().splitlines()
    assert len(raw) == 2
    first, second = (json.loads(x) for x in raw)
    assert first["level"] == "INFO" and first["msg"] == "pornit" and first["logger"] == log.name
    assert second["level"] == "WARNING"


def test_mesajul_e_interpolat_cu_argumentele(log):
    log.info("user %s a făcut %d cereri", "ana", 3)
    assert lines(log)[0]["msg"] == "user ana a făcut 3 cereri"


def test_campurile_din_extra_ajung_la_nivelul_de_sus(log):
    log.info("plată", extra={"request_id": "r-7", "user_id": 42, "ok": True})
    rec = lines(log)[0]
    assert rec["request_id"] == "r-7" and rec["user_id"] == 42 and rec["ok"] is True


def test_atributele_standard_nu_se_scurg_in_json(log):
    log.info("x", extra={"a": 1})
    assert set(lines(log)[0]) == {"level", "logger", "msg", "a"}


def test_tipurile_neserializabile_nu_strica_linia(log):
    when = datetime.date(2026, 11, 3)
    log.info("x", extra={"when": when, "obj": object})
    rec = lines(log)[0]
    assert rec["when"] == "2026-11-03" and "object" in rec["obj"]


def test_exceptia_intra_intr_un_camp_si_linia_ramane_una(log):
    try:
        1 / 0
    except ZeroDivisionError:
        log.exception("eșec")
    raw = log.buf.getvalue().splitlines()
    assert len(raw) == 1, "traceback-ul a spart linia"
    rec = json.loads(raw[0])
    assert "ZeroDivisionError" in rec["exc"] and "Traceback" in rec["exc"]


def test_fara_exceptie_nu_apare_campul_exc(log):
    log.info("fără excepție")
    assert "exc" not in lines(log)[0]


def test_mesaj_pe_mai_multe_randuri_ramane_o_linie(log):
    log.info("a\nb")
    assert len(log.buf.getvalue().splitlines()) == 1


def test_alt_handler_care_a_setat_message_si_asctime_nu_le_scurge(log):
    # un Formatter obișnuit adaugă `message` și `asctime` pe același record; ale noastre nu trebuie să le repete
    buf2 = io.StringIO()
    h2 = logging.StreamHandler(buf2)
    h2.setFormatter(logging.Formatter("%(asctime)s %(message)s"))
    log.handlers.insert(0, h2)
    log.info("x", extra={"k": 1})
    assert set(lines(log)[0]) == {"level", "logger", "msg", "k"}
    assert "x" in buf2.getvalue()


@pytest.mark.parametrize("cheie", ["message", "asctime", "name", "msg"])
def test_extra_nu_poate_folosi_nume_rezervate(log, cheie):
    # comportamentul din CPython (Logger.makeRecord): extra care se ciocnește cu LogRecord dă KeyError
    with pytest.raises(KeyError):
        log.info("x", extra={cheie: "oops"})


def test_nivelul_filtreaza(log):
    log.debug("nu apare")
    assert log.buf.getvalue() == ""
