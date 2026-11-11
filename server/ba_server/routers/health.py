"""GET /health: fără secret, fără date; arată doar că funcția răspunde."""
from fastapi import APIRouter

PUBLIC = True

router = APIRouter()


@router.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}
