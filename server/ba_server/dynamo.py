"""Depozitul DynamoDB: un tabel, o partiție pe utilizator, cursor fără goluri.

Cinci feluri de articole în aceeași partiție (`pk`):

- `sk = "N"`: contorul, cu atributul numeric `n` (ultimul număr de secvență).
- `sk = "S#<n>"`, `n` completat cu zerouri la 12 cifre: evenimentul (`data` = JSON).
- `sk = "I#<id>"`: marcajul de idempotență al id-ului, cu `n`.
- `sk = "AI#<zi>"`: contorul zilnic al cererilor la `/ai` (`cnt`), pe ziua UTC.
- `sk = "E"`: epoca (`v`) și, cât ține o ștergere, `purging` (tokenul ei); scris doar de
  `purge` (tichetul 09). `v` lipsă = `INITIAL_EPOCH`.

Scrierea e o singură `TransactWriteItems` pe lot (cel mult 49 de evenimente:
contorul, verificarea epocii și 2 articole pe eveniment încap în cele 100 de acțiuni). Tranzacția
mută contorul de la `n` la `n + k` doar dacă el e încă `n`, deci tranzacțiile se
comit în ordinea numerelor și un cititor nu vede 6 înaintea lui 5. Dacă alt
scriitor a câștigat, tranzacția pică pe condiție și lotul se reia de la citirea
contorului. Aceeași tranzacție verifică și articolul `E` (ConditionCheck: aceeași epocă,
fără `purging`), deci o scriere care a citit starea dinaintea unei ștergeri nu poate fi
comisă după ea. Detalii și surse: `research/platforma-facts.md`, secțiunea 7.
"""
from __future__ import annotations

import random
import time
from typing import Any, Callable

from botocore.exceptions import ClientError

from .store import (
    INITIAL_EPOCH,
    AppendResult,
    EventStore,
    Page,
    PurgeInProgress,
    PurgeResult,
    dedupe,
    dump,
    new_epoch,
    take_page,
)

MAX_EVENTS_PER_TX = 49  # 1 contor + 1 verificare a epocii + 2 * 49 = 100 de acțiuni
MAX_TX_BYTES = 3_500_000  # sub limita de 4 MB a unei tranzacții
SEQ_WIDTH = 12
MAX_ATTEMPTS = 12

# Motive de anulare după care are sens să reluăm lotul.
_RETRYABLE = {"ConditionalCheckFailed", "TransactionConflict", "ThrottlingError", "None"}


def seq_key(n: int) -> str:
    return f"S#{n:0{SEQ_WIDTH}d}"


def split_chunks(items: list[tuple[dict[str, Any], str]]) -> list[list[tuple[dict[str, Any], str]]]:
    """Împarte (eveniment, json) în loturi de cel mult 49 și ~3,5 MB."""
    chunks: list[list[tuple[dict[str, Any], str]]] = []
    cur: list[tuple[dict[str, Any], str]] = []
    size = 0
    for item in items:
        n = len(item[1].encode("utf-8"))  # octeți, nu caractere: `dump` păstrează diacriticele
        if cur and (len(cur) >= MAX_EVENTS_PER_TX or size + n > MAX_TX_BYTES):
            chunks.append(cur)
            cur, size = [], 0
        cur.append(item)
        size += n
    if cur:
        chunks.append(cur)
    return chunks


class Conflict(Exception):
    """Alt scriitor a mutat contorul sau a scris același id între timp."""


class DynamoStore(EventStore):
    def __init__(
        self,
        table: Any,
        user_pk: str = "u#alex",
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        self._table = table
        self._client = table.meta.client
        self._name = table.name
        self._pk = user_pk
        self._sleep = sleep

    @classmethod
    def from_settings(cls, settings: Any) -> "DynamoStore":
        import boto3  # importat aici: testele cu falsul nu au nevoie de AWS

        table = boto3.resource("dynamodb").Table(settings.table_name)
        return cls(table, settings.user_pk)

    # ---- plafonul zilnic pentru /ai ---------------------------------------

    def take_ai_slot(self, day: str, cap: int) -> bool:
        """Un articol `AI#<zi>` cu contorul `cnt`; ADD atomic, condiționat de plafon.
        Nu intră în intervalul `S#` pe care îl citește `read`."""
        if cap <= 0:
            return False
        try:
            self._table.update_item(
                Key={"pk": self._pk, "sk": f"AI#{day}"},
                UpdateExpression="ADD cnt :one",
                ConditionExpression="attribute_not_exists(cnt) OR cnt < :cap",
                ExpressionAttributeValues={":one": 1, ":cap": cap},
            )
        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                return False
            raise
        return True

    # ---- epoca și ștergerea (tichetul 09) -----------------------------------

    def epoch(self) -> str:
        v, _ = self._epoch_state()
        return INITIAL_EPOCH if v is None else v

    def is_purging(self) -> bool:
        item = self._table.get_item(Key={"pk": self._pk, "sk": "E"}, ConsistentRead=True).get("Item")
        return bool(item and "purging" in item)

    def _epoch_state(self) -> tuple[str | None, bool]:
        """(v sau None dacă articolul `E` n-are `v`, ștergere în curs?)."""
        item = self._table.get_item(Key={"pk": self._pk, "sk": "E"}, ConsistentRead=True).get("Item")
        if not item:
            return None, False
        return (str(item["v"]) if "v" in item else None), "purging" in item

    def purge(self) -> PurgeResult:
        """Șterge `N`, `S#*` și `I#*` ale partiției; păstrează `AI#*`. În trei pași, ca să nu
        rămână evenimente orfane și ca o cădere la mijloc să se vadă:

        1. `E.purging = <token>`: de aici scrierile sunt refuzate (condiția tranzacției de
           scriere cere `attribute_not_exists(purging)`), iar epoca publicată rămâne cea veche;
        2. se șterg evenimentele, marcajele și contorul (cititorii văd epoca veche și date
           pe jumătate șterse, deci nu-și mută cursorul);
        3. o singură actualizare, condiționată de token: `E.v = <epoca nouă>` și fără `purging`.

        Dacă pasul 2 pică, `purging` rămâne și epoca nu s-a schimbat: scrierile primesc
        `PurgeInProgress` (503) până când un nou `purge` termină treaba."""
        token = new_epoch()
        self._table.update_item(
            Key={"pk": self._pk, "sk": "E"},
            UpdateExpression="SET purging = :t",
            ExpressionAttributeValues={":t": token},
        )
        deleted = self._wipe()
        epoch = new_epoch()
        try:
            self._table.update_item(
                Key={"pk": self._pk, "sk": "E"},
                UpdateExpression="SET v = :v REMOVE purging",
                ConditionExpression="purging = :t",
                ExpressionAttributeValues={":v": epoch, ":t": token},
            )
        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                raise RuntimeError("altă ștergere a preluat jurnalul; reîncearcă") from None
            raise
        return PurgeResult(deleted, epoch)

    def _wipe(self) -> int:
        """Pasul 2 al lui `purge`; întoarce câte evenimente a șters."""
        keys: list[str] = []
        kwargs: dict[str, Any] = {
            "KeyConditionExpression": "pk = :pk",
            "ExpressionAttributeValues": {":pk": self._pk},
            "ProjectionExpression": "sk",
            "ConsistentRead": True,
        }
        while True:
            resp = self._table.query(**kwargs)
            keys += [it["sk"] for it in resp["Items"]]
            if "LastEvaluatedKey" not in resp:
                break
            kwargs["ExclusiveStartKey"] = resp["LastEvaluatedKey"]
        deleted = sum(1 for k in keys if k.startswith("S#"))
        doomed = [k for k in keys if k.startswith(("S#", "I#"))] + [k for k in keys if k == "N"]
        for i in range(0, len(doomed), 25):
            request = {self._name: [{"DeleteRequest": {"Key": {"pk": self._pk, "sk": k}}} for k in doomed[i : i + 25]]}
            for _ in range(MAX_ATTEMPTS):
                if not request:
                    break
                resp = self._client.batch_write_item(RequestItems=request)
                request = resp.get("UnprocessedItems") or {}
                if request:
                    self._sleep(0.05)
            else:
                raise RuntimeError("ștergerea nu s-a terminat")
        return deleted

    # ---- citire ---------------------------------------------------------

    def _counter(self) -> int:
        item = self._table.get_item(Key={"pk": self._pk, "sk": "N"}, ConsistentRead=True).get("Item")
        return int(item["n"]) if item else 0

    def read(self, after: int, limit: int) -> Page:
        if after + 1 >= 10**SEQ_WIDTH:
            # Dincolo de ultimul număr posibil nu e nimic; o limită de jos mai mare decât cea de sus
            # (BETWEEN) ar fi respinsă de DynamoDB, deci n-o mai trimitem.
            return Page(events=[], cursor=after, more=False)

        def rows():
            kwargs: dict[str, Any] = {
                "KeyConditionExpression": "pk = :pk AND sk BETWEEN :lo AND :hi",
                "ExpressionAttributeValues": {
                    ":pk": self._pk,
                    ":lo": seq_key(after + 1),
                    ":hi": seq_key(10**SEQ_WIDTH - 1),
                },
                "ConsistentRead": True,
                "Limit": limit + 1,  # un articol în plus arată dacă mai urmează ceva
            }
            while True:
                resp = self._table.query(**kwargs)
                for it in resp["Items"]:
                    yield int(it["sk"][2:]), it["data"]
                if "LastEvaluatedKey" not in resp:
                    return
                kwargs["ExclusiveStartKey"] = resp["LastEvaluatedKey"]

        return take_page(rows(), after, limit)

    # ---- scriere --------------------------------------------------------

    def _existing(self, ids: list[str]) -> set[str]:
        found: set[str] = set()
        for i in range(0, len(ids), 100):
            keys = [{"pk": self._pk, "sk": f"I#{x}"} for x in ids[i : i + 100]]
            request = {self._name: {"Keys": keys, "ConsistentRead": True}}
            while request:
                resp = self._client.batch_get_item(RequestItems=request)
                for it in resp["Responses"].get(self._name, []):
                    found.add(it["sk"][2:])
                request = resp.get("UnprocessedKeys") or {}
        return found

    def _write_chunk(self, chunk: list[tuple[dict[str, Any], str]]) -> tuple[list[str], list[str]]:
        """Un lot. Întoarce (ids noi, ids deja păstrate). Ridică Conflict la cursă."""
        ids = [ev["id"] for ev, _ in chunk]
        have = self._existing(ids)
        fresh = [(ev, raw) for ev, raw in chunk if ev["id"] not in have]
        dups = [i for i in ids if i in have]
        if not fresh:
            return [], dups
        epoch, purging = self._epoch_state()  # înaintea contorului: ordinea contează (vezi `purge`)
        if purging:
            raise PurgeInProgress()
        old = self._counter()
        self._before_write()
        actions: list[dict[str, Any]] = [
            {
                "ConditionCheck": {
                    "TableName": self._name,
                    "Key": {"pk": self._pk, "sk": "E"},
                    **(
                        {"ConditionExpression": "attribute_not_exists(v) AND attribute_not_exists(purging)"}
                        if epoch is None
                        else {
                            "ConditionExpression": "v = :epoch AND attribute_not_exists(purging)",
                            "ExpressionAttributeValues": {":epoch": epoch},
                        }
                    ),
                }
            },
            {
                "Update": {
                    "TableName": self._name,
                    "Key": {"pk": self._pk, "sk": "N"},
                    "UpdateExpression": "SET n = :new",
                    "ConditionExpression": "attribute_not_exists(n) OR n = :old",
                    "ExpressionAttributeValues": {":new": old + len(fresh), ":old": old},
                }
            }
        ]
        for offset, (ev, raw) in enumerate(fresh, start=1):
            seq = old + offset
            actions.append(
                {
                    "Put": {
                        "TableName": self._name,
                        "Item": {"pk": self._pk, "sk": seq_key(seq), "id": ev["id"], "data": raw},
                        "ConditionExpression": "attribute_not_exists(sk)",
                    }
                }
            )
            actions.append(
                {
                    "Put": {
                        "TableName": self._name,
                        "Item": {"pk": self._pk, "sk": f"I#{ev['id']}", "n": seq},
                        "ConditionExpression": "attribute_not_exists(sk)",
                    }
                }
            )
        try:
            self._client.transact_write_items(TransactItems=actions)
        except ClientError as e:
            if e.response["Error"]["Code"] == "TransactionCanceledException":
                reasons = {r.get("Code", "None") for r in e.response.get("CancellationReasons", [])}
                if reasons <= _RETRYABLE:
                    raise Conflict() from e
            raise
        return [ev["id"] for ev, _ in fresh], dups

    def _before_write(self) -> None:
        """Cârlig pentru teste: rulează între citirea contorului și tranzacție."""

    def append(self, events: list[dict[str, Any]]) -> AppendResult:
        unique, repeated = dedupe(events)
        accepted: list[str] = []
        duplicates = list(repeated)
        for chunk in split_chunks([(ev, dump(ev)) for ev in unique]):
            for attempt in range(MAX_ATTEMPTS):
                try:
                    new, dups = self._write_chunk(chunk)
                except Conflict:
                    # Pauză scurtă cu zgomot, ca scriitorii simultani să nu se ciocnească mereu.
                    self._sleep(random.uniform(0, 0.05 * (attempt + 1)))
                    continue
                accepted += new
                duplicates += dups
                break
            else:
                raise RuntimeError("prea multe scrieri simultane")
        return AppendResult(accepted, duplicates, self._counter())
