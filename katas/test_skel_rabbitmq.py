# Testele referințelor de schelet pentru modulul rabbitmq.
# Nu pornesc un broker: un channel fals înregistrează apelurile, iar fiecare
# apel e legat de semnătura reală din pika (un nume de argument greșit pică).
import inspect
from types import SimpleNamespace

import pytest

pika = pytest.importorskip(
    "pika",
    reason="pika lipsește: pip install -r katas/requirements-dev.txt",
)

from skel_rabbitmq import consume  # noqa: E402

REAL = pika.channel.Channel


class FakeChannel:
    """Înregistrează apelurile în ordine. Mesajele se livrează la
    start_consuming(), ca într-un consumer blocant."""

    def __init__(self, bodies=()):
        self.calls = []                  # [(nume, {argument: valoare})]
        self.bodies = list(bodies)
        self.cb = None

    def _rec(self, name, args, kwargs):
        # legat de metoda reală: un argument inexistent dă TypeError
        bound = inspect.signature(getattr(REAL, name)).bind(
            self, *args, **kwargs)
        bound.apply_defaults()
        d = dict(bound.arguments)
        d.pop("self")
        self.calls.append((name, d))
        return d

    def queue_declare(self, *a, **kw):
        self._rec("queue_declare", a, kw)

    def basic_qos(self, *a, **kw):
        self._rec("basic_qos", a, kw)

    def basic_consume(self, *a, **kw):
        self.cb = self._rec("basic_consume", a, kw)["on_message_callback"]

    def basic_ack(self, *a, **kw):
        self._rec("basic_ack", a, kw)

    def basic_nack(self, *a, **kw):
        self._rec("basic_nack", a, kw)

    def start_consuming(self):
        self.calls.append(("start_consuming", {}))
        for tag, body in enumerate(self.bodies, start=1):
            self.cb(self, SimpleNamespace(delivery_tag=tag), None, body)

    def names(self):
        return [n for n, _ in self.calls]

    def of(self, name):
        return [d for n, d in self.calls if n == name]


def run(bodies, handle):
    ch = FakeChannel(bodies)
    consume(ch, handle, queue="jobs")
    return ch


def test_ordinea_qos_consume_ack():
    seen = []
    ch = run([b"a"], seen.append)
    names = ch.names()
    assert seen == [b"a"]
    assert names.index("basic_qos") < names.index("basic_consume")
    assert names.index("basic_consume") < names.index("basic_ack")
    assert names.index("basic_consume") < names.index("start_consuming")


def test_prefetch_limitat():
    ch = run([], lambda b: None)
    assert ch.of("basic_qos")[0]["prefetch_count"] >= 1, \
        "fără prefetch, brokerul trimite toată coada"


def test_consuma_din_coada_ceruta_cu_ack_manual():
    ch = run([], lambda b: None)
    c = ch.of("basic_consume")[0]
    assert c["queue"] == "jobs"
    assert c["auto_ack"] is False, "auto_ack confirmă înainte de procesare"


def test_ack_cu_tag_ul_mesajului_dupa_handler():
    ch = FakeChannel([b"a", b"b"])
    acked_when_handled = []

    def handle(body):
        acked_when_handled.append(len(ch.of("basic_ack")))

    consume(ch, handle, queue="jobs")
    assert acked_when_handled == [0, 1], "ack înainte de handler"
    assert [d["delivery_tag"] for d in ch.of("basic_ack")] == [1, 2]
    assert not ch.of("basic_nack")


def test_eroare_nack_fara_requeue_si_fara_ack():
    def handle(body):
        if body == b"rau":
            raise ValueError("mesaj stricat")

    ch = run([b"ok", b"rau", b"ok2"], handle)
    nacks = ch.of("basic_nack")
    assert len(nacks) == 1
    assert nacks[0]["delivery_tag"] == 2
    assert nacks[0]["requeue"] is False, "requeue=True => buclă infinită"
    assert [d["delivery_tag"] for d in ch.of("basic_ack")] == [1, 3], \
        "consumerul trebuie să meargă mai departe, fără ack pe mesajul rău"


def test_dlq_declarat_si_legat_de_coada_principala():
    ch = run([], lambda b: None)
    decl = {d["queue"]: d for d in ch.of("queue_declare")}
    assert set(decl) == {"jobs", "jobs.dlq"}
    assert decl["jobs"]["durable"] and decl["jobs.dlq"]["durable"]
    args = decl["jobs"]["arguments"]
    assert args["x-dead-letter-exchange"] == "", \
        "'' = exchange-ul implicit, rutează după numele cozii"
    assert args["x-dead-letter-routing-key"] == "jobs.dlq"


def test_declararile_vin_inainte_de_consume():
    ch = run([], lambda b: None)
    names = ch.names()
    last_decl = max(i for i, n in enumerate(names) if n == "queue_declare")
    assert last_decl < names.index("basic_consume")
