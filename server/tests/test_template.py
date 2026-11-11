"""Șablonul SAM: ce nu se poate verifica fără cont AWS se verifică în text."""
import re
from pathlib import Path

import pytest
import yaml

from conftest import PWA_ORIGIN

ROOT = Path(__file__).resolve().parent.parent
TEXT = (ROOT / "template.yaml").read_text(encoding="utf-8")


class _Loader(yaml.SafeLoader):
    pass


def _tag(loader, suffix, node):
    if isinstance(node, yaml.ScalarNode):
        return {suffix: loader.construct_scalar(node)}
    if isinstance(node, yaml.SequenceNode):
        return {suffix: loader.construct_sequence(node, deep=True)}
    return {suffix: loader.construct_mapping(node, deep=True)}


_Loader.add_multi_constructor("!", _tag)
T = yaml.load(TEXT, Loader=_Loader)
RES = T["Resources"]
FN = RES["ServerFunction"]["Properties"]
TABLE = RES["EventsTable"]["Properties"]


def test_cors_is_on_the_function_url_for_the_pwa_origin_only():
    url = FN["FunctionUrlConfig"]
    assert url["AuthType"] == "NONE"  # secretul se verifică în aplicație
    cors = url["Cors"]
    assert cors["AllowOrigins"] == [{"Ref": "PwaOrigin"}]
    assert T["Parameters"]["PwaOrigin"]["Default"] == PWA_ORIGIN
    assert "*" not in str(cors["AllowOrigins"])
    assert set(cors["AllowMethods"]) == {"GET", "POST"}
    assert set(cors["AllowHeaders"]) == {"authorization", "content-type"}


def test_pwa_origin_pattern_rejects_wildcards_paths_and_http():
    pattern = re.compile(T["Parameters"]["PwaOrigin"]["AllowedPattern"])
    assert pattern.match(PWA_ORIGIN)
    for bad in ("*", "https://*.github.io", PWA_ORIGIN + "/ba-quizz-learn/app", "http://alexxgalea.github.io", ""):
        assert not pattern.match(bad), bad


def test_secret_is_a_noecho_parameter_not_a_literal():
    p = T["Parameters"]["AppSecret"]
    assert p["NoEcho"] is True and p["MinLength"] >= 32 and "Default" not in p
    assert FN["Environment"]["Variables"]["APP_SECRET"] == {"Ref": "AppSecret"}
    assert "SecretsManager" not in TEXT  # costă bani; secretul stă în variabila de mediu


def test_table_is_provisioned_standard_within_free_limits():
    assert TABLE["BillingMode"] == "PROVISIONED"
    assert TABLE["TableClass"] == "STANDARD"
    params = T["Parameters"]
    assert params["ReadCapacity"]["Default"] <= 25 and params["WriteCapacity"]["Default"] <= 25
    assert params["ReadCapacity"]["MaxValue"] <= 25 and params["WriteCapacity"]["MaxValue"] <= 25
    keys = {k["AttributeName"]: k["KeyType"] for k in TABLE["KeySchema"]}
    assert keys == {"pk": "HASH", "sk": "RANGE"}
    assert RES["EventsTable"]["DeletionPolicy"] == "Retain"  # datele lui Alex


def test_function_runs_fastapi_through_lambda_web_adapter():
    assert FN["Runtime"] == "python3.14" and FN["Handler"] == "run.sh"
    env = FN["Environment"]["Variables"]
    assert env["AWS_LAMBDA_EXEC_WRAPPER"] == "/opt/bootstrap"
    assert "LambdaAdapterLayer" in TEXT
    run_sh = (ROOT / "run.sh").read_text()
    assert "--factory" in run_sh and "ba_server.main:create_app" in run_sh


def test_iam_is_limited_to_the_table():
    stmt = FN["Policies"][0]["Statement"][0]
    assert stmt["Resource"] == {"GetAtt": "EventsTable.Arn"}
    assert not any(a.endswith(("*", "DeleteItem", "Scan")) for a in stmt["Action"])


def test_no_secrets_committed():
    for path in list(ROOT.rglob("*.py")) + [ROOT / "template.yaml", ROOT / "deploy.sh", ROOT / "README.md"]:
        if ".build" in path.parts or path.name == "conftest.py":
            continue
        body = path.read_text(encoding="utf-8")
        assert not re.search(r"AKIA[0-9A-Z]{16}", body), path
        assert not re.search(r"AIza[0-9A-Za-z_-]{35}", body), path
        assert not re.search(r"sk-[0-9a-f]{32}", body), path


def test_ai_keys_are_noecho_parameters_and_the_function_waits_for_two_models():
    params = T["Parameters"]
    env = FN["Environment"]["Variables"]
    for param, var in (("GeminiApiKey", "GEMINI_API_KEY"), ("DeepseekApiKey", "DEEPSEEK_API_KEY")):
        assert params[param]["NoEcho"] is True and params[param]["Default"] == ""
        assert env[var] == {"Ref": param}
    assert env["AI_DAILY_CAP"] == {"Ref": "AiDailyCap"}
    assert FN["Timeout"] >= 2 * 20 + 10  # două modele a câte AI_TIMEOUT_S (20 s) și puțină rezervă
    # Contorul zilnic folosește UpdateItem pe tabel: permisiunea există deja.
    assert "dynamodb:UpdateItem" in FN["Policies"][0]["Statement"][0]["Action"]
