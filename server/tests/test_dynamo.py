"""Ce e propriu DynamoStore: forma articolelor și reluarea la scriere concurentă."""
from boto3.dynamodb.conditions import Key

from ba_server.dynamo import MAX_EVENTS_PER_TX, DynamoStore, split_chunks
from conftest import ev


def test_item_layout(dynamo_table):
    store = DynamoStore(dynamo_table, user_pk="u#test")
    store.append([ev(1), ev(2)])
    items = dynamo_table.query(KeyConditionExpression=Key("pk").eq("u#test"))["Items"]
    by_sk = {i["sk"]: i for i in items}
    assert set(by_sk) == {"N", "S#000000000001", "S#000000000002", "I#e1", "I#e2"}
    assert by_sk["N"]["n"] == 2
    assert by_sk["I#e2"]["n"] == 2
    assert by_sk["S#000000000001"]["id"] == "e1"


def _racing(table, other, events):
    """Un DynamoStore care, o dată, lasă `other` să scrie `events` înaintea tranzacției lui."""

    class Racing(DynamoStore):
        fired = False

        def _before_write(self):
            if not Racing.fired:
                Racing.fired = True
                other.append(events)

    return Racing(table, sleep=lambda s: None)


def test_conflict_with_another_writer_is_retried(dynamo_table):
    """Alt scriitor comite între citirea contorului și tranzacția noastră."""
    other = DynamoStore(dynamo_table, sleep=lambda s: None)
    mine = _racing(dynamo_table, other, [ev(100), ev(101)])
    res = mine.append([ev(1), ev(2)])
    assert res.accepted == ["e1", "e2"]
    got = mine.read(0, 10)
    assert [e["id"] for e in got.events] == ["e100", "e101", "e1", "e2"]
    assert got.cursor == 4


def test_same_id_written_by_another_writer_meanwhile_is_a_duplicate(dynamo_table):
    other = DynamoStore(dynamo_table, sleep=lambda s: None)
    mine = _racing(dynamo_table, other, [ev(1)])
    res = mine.append([ev(1), ev(2)])
    assert res.accepted == ["e2"] and res.duplicates == ["e1"]
    assert [e["id"] for e in other.read(0, 10).events] == ["e1", "e2"]


def test_chunks_respect_action_and_byte_limits():
    items = [({"id": str(i)}, "x") for i in range(120)]
    sizes = [len(c) for c in split_chunks(items)]
    assert sizes == [49, 49, 22] and max(sizes) == MAX_EVENTS_PER_TX
    big = [({"id": str(i)}, "x" * 1_000_000) for i in range(8)]
    assert [len(c) for c in split_chunks(big)] == [3, 3, 2]
