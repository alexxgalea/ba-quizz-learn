"""Conturile (ADR 0006): un secret pe persoană, fiecare cont cu partiția lui `u#<id>`.

Contul principal (Alex) vine din `APP_SECRET` + `USER_PK`, ca înainte. Celelalte vin din
`ACCOUNTS`, o listă JSON `[{"id", "secret", "name", "address", "profile"}]`, pe care
`deploy.sh` o citește din `server/.accounts.json` (în afara repo-ului), o trimite în base64 și o validează cu
`python3 -m ba_server.accounts <fișier>` înainte de lansare.

`address` e forma de adresare din prompturile AI: "m" (masculin) sau "f" (feminin).
`profile` e experiența persoanei, pusă în prompturi ca întrebările să fie concrete; gol = fără.
"""
from __future__ import annotations

import base64
import binascii
import hmac
import json
import re
import sys
from dataclasses import dataclass, field
from typing import Iterable

ID_RE = re.compile(r"^[a-z0-9]{1,32}$")
SECRET_RE = re.compile(r"^[\x21-\x7e]{32,256}$")  # ca la client: ASCII tipăribil, fără spații
MAX_ACCOUNTS = 10
MAX_NAME = 40
MAX_PROFILE = 800  # variabilele de mediu ale unei funcții Lambda au cel mult 4 KB în total


class AccountsError(ValueError):
    """Lista de conturi e invalidă. Mesajul nu conține niciodată un secret."""


@dataclass(frozen=True)
class Account:
    id: str
    secret: str = field(repr=False)
    name: str
    address: str = "m"
    profile: str = ""
    pk: str = ""

    def public(self) -> dict[str, str]:
        """Ce afla clientul despre contul lui (`GET /me`): fără secret și fără partiție."""
        return {"id": self.id, "name": self.name, "address": self.address, "profile": self.profile}


def parse_accounts(
    raw: str | None,
    *,
    reserved_ids: Iterable[str] = (),
    reserved_secrets: Iterable[str] = (),
) -> tuple[Account, ...]:
    if raw is None or not raw.strip():
        return ()
    raw = raw.strip()
    if raw[0] not in "[{":
        # deploy.sh trimite lista în base64: `sam deploy --parameter-overrides` strică ghilimelele și spațiile.
        try:
            raw = base64.b64decode(raw, validate=True).decode("utf-8")
        except (binascii.Error, UnicodeDecodeError):
            raise AccountsError("ACCOUNTS nu e nici JSON, nici base64 valid") from None
    try:
        data = json.loads(raw)
    except ValueError:
        raise AccountsError("ACCOUNTS nu e JSON valid") from None
    if not isinstance(data, list):
        raise AccountsError("ACCOUNTS trebuie să fie o listă de conturi")
    if len(data) > MAX_ACCOUNTS:
        raise AccountsError(f"cel mult {MAX_ACCOUNTS} conturi")
    ids, secrets = set(reserved_ids), set(reserved_secrets)
    out: list[Account] = []
    for i, item in enumerate(data):
        where = f"contul {i + 1}"
        if not isinstance(item, dict):
            raise AccountsError(f"{where}: trebuie să fie un obiect")
        extra = set(item) - {"id", "secret", "name", "address", "profile"}
        if extra:
            raise AccountsError(f"{where}: câmpuri necunoscute: {', '.join(sorted(extra))}")
        aid, secret = item.get("id"), item.get("secret")
        if not isinstance(aid, str) or not ID_RE.match(aid):
            raise AccountsError(f"{where}: id-ul trebuie să aibă 1–32 de litere mici sau cifre")
        if aid in ids:
            raise AccountsError(f"{where}: id-ul „{aid}” se repetă")
        if not isinstance(secret, str) or not SECRET_RE.match(secret):
            raise AccountsError(f"{where} ({aid}): secretul trebuie să aibă cel puțin 32 de caractere ASCII, fără spații (make secret)")
        if secret in secrets:
            raise AccountsError(f"{where} ({aid}): secretul e folosit deja de alt cont")
        name = item.get("name", aid)
        address = item.get("address", "m")
        profile = item.get("profile", "")
        if not isinstance(name, str) or not name.strip() or len(name) > MAX_NAME:
            raise AccountsError(f"{where} ({aid}): name trebuie să aibă 1–{MAX_NAME} caractere")
        if address not in ("m", "f"):
            raise AccountsError(f"{where} ({aid}): address trebuie să fie „m” sau „f”")
        if not isinstance(profile, str) or len(profile) > MAX_PROFILE:
            raise AccountsError(f"{where} ({aid}): profile are cel mult {MAX_PROFILE} caractere")
        ids.add(aid)
        secrets.add(secret)
        out.append(Account(aid, secret, name.strip(), address, profile.strip(), "u#" + aid))
    return tuple(out)


def find(accounts: Iterable[Account], given: str) -> Account | None:
    """Contul al cărui secret e `given`. Compară cu fiecare cont (fără scurtătură la prima
    potrivire), ca durata să nu spună câte conturi există sau care se potrivește."""
    hit = None
    raw = given.encode("utf-8")
    for a in accounts:
        if hmac.compare_digest(raw, a.secret.encode("utf-8")) and a.secret:
            hit = hit or a
    return hit


def main(argv: list[str]) -> int:
    """`python3 -m ba_server.accounts <fișier>`: validează fișierul înainte de lansare (deploy.sh)."""
    if len(argv) != 2:
        print("Folosire: python3 -m ba_server.accounts server/.accounts.json", file=sys.stderr)
        return 2
    try:
        with open(argv[1], encoding="utf-8") as f:
            accounts = parse_accounts(f.read(), reserved_ids={"alex"})
    except (OSError, AccountsError) as e:
        print(f"Conturi invalide: {e}", file=sys.stderr)
        return 1
    print("Conturi: " + (", ".join(a.id for a in accounts) or "niciunul în afară de alex"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
