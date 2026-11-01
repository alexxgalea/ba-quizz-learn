# Testele referințelor de schelet pentru modulul aws.
# S3 e simulat cu moto (fără rețea, fără cont AWS): URL-ul presemnat se
# generează și apoi se folosește cu `requests`, pe care moto îl interceptează.
from urllib.parse import parse_qs, urlparse

import pytest

HINT = "lipsește: pip install -r katas/requirements-dev.txt"
boto3 = pytest.importorskip("boto3", reason="boto3 " + HINT)
requests = pytest.importorskip("requests", reason="requests " + HINT)
moto = pytest.importorskip("moto", reason="moto " + HINT)

from skel_aws import presign  # noqa: E402

BUCKET = "my-bucket"
REGION = "eu-central-1"


@pytest.fixture
def s3(monkeypatch):
    # credențiale false: nimic nu pleacă spre AWS
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "test")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "test")
    monkeypatch.setenv("AWS_DEFAULT_REGION", REGION)
    monkeypatch.delenv("AWS_SESSION_TOKEN", raising=False)
    with moto.mock_aws():
        client = boto3.client("s3", region_name=REGION)
        client.create_bucket(
            Bucket=BUCKET,
            CreateBucketConfiguration={"LocationConstraint": REGION})
        yield client


def query(url):
    return {k: v[0] for k, v in parse_qs(urlparse(url).query).items()}


def test_get_descarca_obiectul(s3):
    s3.put_object(Bucket=BUCKET, Key="raport.txt", Body=b"salut")
    url = presign("get_object", BUCKET, "raport.txt")
    r = requests.get(url)
    assert r.status_code == 200 and r.content == b"salut"


def test_put_incarca_obiectul(s3):
    url = presign("put_object", BUCKET, "nou.txt")
    assert requests.put(url, data=b"continut").status_code == 200
    got = s3.get_object(Bucket=BUCKET, Key="nou.txt")["Body"].read()
    assert got == b"continut"


def test_cheia_cu_spatii_si_prefix_functioneaza(s3):
    key = "dosar vechi/raport 1.txt"
    s3.put_object(Bucket=BUCKET, Key=key, Body=b"x")
    url = presign("get_object", BUCKET, key)
    assert " " not in url
    assert requests.get(url).content == b"x"


def test_expirarea_in_secunde_si_implicit_scurta(s3):
    assert query(presign("get_object", BUCKET, "k", expires=90))[
        "X-Amz-Expires"] == "90"
    default = int(query(presign("get_object", BUCKET, "k"))["X-Amz-Expires"])
    assert 0 < default <= 900, "implicit trebuie să fie scurt"


def test_semnatura_v4_si_in_us_east_1(s3):
    # fără s3v4 explicit, boto3 dă în us-east-1 un URL SigV2
    # (AWSAccessKeyId / Signature / Expires)
    q = query(presign("get_object", BUCKET, "k", region="us-east-1"))
    assert q.get("X-Amz-Algorithm") == "AWS4-HMAC-SHA256", q
    assert "Signature" not in q and "AWSAccessKeyId" not in q


def test_regiunea_apare_in_credential_scope(s3):
    q = query(presign("get_object", BUCKET, "k", region="eu-west-1"))
    assert q["X-Amz-Credential"].split("/")[2:] == [
        "eu-west-1", "s3", "aws4_request"]


def test_se_calculeaza_local_fara_sa_verifice_obiectul(s3):
    # nici bucket-ul, nici cheia nu trebuie să existe
    url = presign("get_object", "alt-bucket-inexistent", "nu/exista.txt")
    assert "X-Amz-Signature" in url
    assert requests.get(url).status_code == 404   # abia la folosire


def test_url_identic_cu_apelul_direct_boto3(s3, monkeypatch):
    # cu timpul înghețat, semnătura depinde doar de metodă, bucket, cheie,
    # regiune și expirare: o metodă sau o cheie fixate în cod dau alt URL
    import datetime
    import botocore.auth
    from botocore.config import Config
    monkeypatch.setattr(
        botocore.auth, "get_current_datetime",
        lambda: datetime.datetime(2026, 11, 1, 12, 0, 0,
                                  tzinfo=datetime.timezone.utc))
    direct = boto3.client(
        "s3", region_name="eu-west-1",
        config=Config(signature_version="s3v4"))
    for method in ("get_object", "put_object"):
        want = direct.generate_presigned_url(
            method, Params={"Bucket": BUCKET, "Key": "a/b.txt"},
            ExpiresIn=120)
        got = presign(method, BUCKET, "a/b.txt", expires=120,
                      region="eu-west-1")
        assert got == want, method
    # și cele două metode dau semnături diferite
    assert presign("get_object", BUCKET, "k") != presign(
        "put_object", BUCKET, "k")
