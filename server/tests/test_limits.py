"""Limitele depozitului și ale rutelor (code review PR #6): octeți UTF-8, `after` imens, id cu newline."""
import json

from botocore.exceptions import ClientError

from ba_server.dynamo import MAX_TX_BYTES, DynamoStore, split_chunks
from ba_server.store import PAGE_BYTES, take_page
from conftest import AUTH, ev


def test_read_with_an_after_beyond_the_key_space_is_an_empty_page(store):
    """GET /events?after=<imens> nu poate da 500: dincolo de ultimul număr nu e nimic."""
    store.append([ev(1)])
    for after in (10**12 - 2, 10**12 - 1, 10**12, 10**13 - 2, 10**13 - 1, 10**15):
        page = store.read(after, 10)
        assert page.events == [] and page.cursor == after and page.more is False


def test_the_route_survives_an_huge_after(client):
    r = client.get("/events", params={"after": 10**12}, headers=AUTH)
    assert r.status_code == 200
    assert r.json()["events"] == [] and r.json()["cursor"] == 10**12


def test_chunks_count_utf8_bytes_not_characters():
    """Diacriticele au 2 octeți: 1,7 M de caractere sunt 3,4 MB; două încap doar în loturi separate."""
    raw = json.dumps({"t": "ș" * 1_700_000}, ensure_ascii=False)
    chunks = split_chunks([({"id": str(i)}, raw) for i in range(2)])
    assert [len(c) for c in chunks] == [1, 1]  # în caractere ar încăpea împreună (3,4 M < 3,5 M)
    assert all(sum(len(r.encode("utf-8")) for _, r in c) <= MAX_TX_BYTES for c in chunks)


class DynamoLimits:
    """Ca DynamoDB, nu ca moto: o tranzacție de peste 4 MB (în octeți) e respinsă, iar o
    condiție BETWEEN cu limita de jos peste cea de sus e invalidă."""

    def __init__(self, table):
        self._table = table
        self._client = table.meta.client
        self.max_tx = 0

    def __getattr__(self, name):
        return getattr(self._table, name)

    @property
    def meta(self):
        outer = self

        class _Meta:
            client = outer

        return _Meta

    def transact_write_items(self, **kw):
        size = sum(len(json.dumps(a["Put"]["Item"], ensure_ascii=False).encode("utf-8")) for a in kw["TransactItems"] if "Put" in a)
        self.max_tx = max(self.max_tx, size)
        if size > 4_000_000:
            raise ClientError({"Error": {"Code": "ValidationException", "Message": "Member must have length less than or equal to 4 MB"}}, "TransactWriteItems")
        return self._client.transact_write_items(**kw)

    def query(self, **kw):
        vals = kw.get("ExpressionAttributeValues", {})
        if ":lo" in vals and vals[":lo"] > vals[":hi"]:
            raise ClientError({"Error": {"Code": "ValidationException", "Message": "BETWEEN lower bound greater than upper"}}, "Query")
        return self._table.query(**kw)

    def __getattribute__(self, name):
        if name in ("batch_get_item", "batch_write_item"):
            return getattr(object.__getattribute__(self, "_client"), name)
        return object.__getattribute__(self, name)


def test_a_big_multibyte_batch_is_written_in_several_transactions(dynamo_table):
    limits = DynamoLimits(dynamo_table)
    store = DynamoStore(limits, sleep=lambda s: None)
    store.append([ev(i, text="ș" * 90_000) for i in range(40)])  # ~7,2 MB de octeți în total
    assert 0 < limits.max_tx <= 4_000_000
    cursor, seen = 0, 0
    while True:
        page = store.read(cursor, 100)
        seen += len(page.events)
        cursor = page.cursor
        if not page.more:
            break
    assert seen == 40


def test_read_with_a_huge_after_never_sends_an_inverted_between(dynamo_table):
    store = DynamoStore(DynamoLimits(dynamo_table), sleep=lambda s: None)
    for after in (10**12 - 1, 10**13 - 2):  # 13 de cifre începând cu 12 de 9: lexicografic, jos > sus
        page = store.read(after, 10)
        assert page.events == [] and page.cursor == after


def test_a_get_page_stays_under_the_response_limit_with_multibyte_text():
    raw = json.dumps({"id": "x", "t": "ș" * 1_000_000}, ensure_ascii=False)  # ~2 MB de octeți
    page = take_page(iter([(1, raw), (2, raw)]), 0, 10)
    assert len(page.events) == 1 and page.more is True  # a doua ar trece de 3 MB în octeți
    assert PAGE_BYTES < 6_000_000


def test_an_id_with_a_trailing_newline_is_rejected(client):
    r = client.post("/events", json={"events": [{"id": "abc\n"}]}, headers=AUTH)
    assert r.status_code == 422
    assert client.get("/events", headers=AUTH).json()["events"] == []
