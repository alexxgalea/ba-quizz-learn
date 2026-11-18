"""GET /me: contul legat de secret (ADR 0006), ca aplicația să arate „Conectat ca: <nume>”
și să-și pună numele, adresarea și profilul în prompturile AI. Fără secret și fără partiție."""
from fastapi import APIRouter, Depends

from ..accounts import Account
from ..deps import get_account

router = APIRouter()


@router.get("/me")
def me(account: Account = Depends(get_account)) -> dict[str, str]:
    return account.public()
