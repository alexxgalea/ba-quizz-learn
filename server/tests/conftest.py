"""Fixturi comune. Nimic de aici nu cere un cont AWS: DynamoDB e moto, în memorie."""
from __future__ import annotations

import threading

import boto3
import pytest
from fastapi.testclient import TestClient
from moto import mock_aws

from ba_server.config import Settings
from ba_server.dynamo import DynamoStore
from ba_server.main import create_app
from ba_server.store import MemoryStore

SECRET = "test-secret-not-a-real-one-0123456789abcdef"
AUTH = {"Authorization": f"Bearer {SECRET}"}
PWA_ORIGIN = "https://alexxgalea.github.io"


@pytest.fixture(autouse=True)
def _fake_aws_env(monkeypatch):
    # Chei false: boto3 nu are voie să găsească (sau să folosească) credențiale reale.
    for k in ("AWS_PROFILE", "AWS_SESSION_TOKEN"):
        monkeypatch.delenv(k, raising=False)
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
    monkeypatch.setenv("AWS_DEFAULT_REGION", "eu-central-1")


def make_table():
    ddb = boto3.resource("dynamodb", region_name="eu-central-1")
    return ddb.create_table(
        TableName="ba-events-test",
        KeySchema=[{"AttributeName": "pk", "KeyType": "HASH"}, {"AttributeName": "sk", "KeyType": "RANGE"}],
        AttributeDefinitions=[
            {"AttributeName": "pk", "AttributeType": "S"},
            {"AttributeName": "sk", "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )


class _Locked:
    """Face fiecare apel moto atomic, ca la DynamoDB, dar lasă firele să se intercaleze
    între apeluri. Moto în sine nu e sigur la fire de execuție (tranzacțiile copiază tabelul)."""

    _lock = threading.RLock()

    def __init__(self, target):
        self._target = target

    def __getattr__(self, name):
        attr = getattr(self._target, name)
        if callable(attr):
            def call(*a, **kw):
                with self._lock:
                    return attr(*a, **kw)
            return call
        if name in ("meta", "client"):
            return _Locked(attr)
        return attr


@pytest.fixture
def dynamo_table():
    with mock_aws():
        yield _Locked(make_table())


@pytest.fixture(params=["memory", "dynamo"])
def store(request):
    """Aceleași teste de contract pentru falsul în memorie și pentru DynamoStore."""
    if request.param == "memory":
        yield MemoryStore()
    else:
        with mock_aws():
            yield DynamoStore(_Locked(make_table()), sleep=lambda s: None)


@pytest.fixture
def settings():
    return Settings(app_secret=SECRET)


@pytest.fixture
def client(settings, store):
    return TestClient(create_app(settings, store))


def ev(i, **extra):
    return {"id": f"e{i}", "t": 1000 + i, "item": "CEL-07", **extra}
