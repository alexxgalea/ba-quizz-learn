# 04: Serverul minim: primește și întoarce evenimente

**Parent:** `.scratch/platforma/spec.md`

**What to build:** un serviciu FastAPI lansat pe AWS Lambda, cu un tabel DynamoDB. Primește evenimente (idempotent, după id), le întoarce pe cele de după un cursor și respinge cererile fără secret. Stă în repo, cu teste și cu infrastructura descrisă în cod, și se lansează cu o singură comandă.

**Blocked by:** 01, 03

**Status:** ready-for-agent

- [x] Trimiterea aceluiași eveniment de două ori îl păstrează o dată.
- [x] Citirea de la un cursor întoarce evenimentele în ordinea sosirii, cu cursorul următor; paginată.
- [x] Fără secret sau cu secret greșit: refuz, fără detalii.
- [x] Originea PWA-ului e permisă; altele nu.
- [x] Teste pytest cu DynamoDB local sau fals; rulează fără cont AWS.
- [ ] Lansat; adresa e notată aici. Nimic secret în repo.

## Comments

### Partea de cod (agent, 2026-11-11)

Codul, testele și infrastructura sunt în `server/` (README în română, cu pașii de lansare). `cd server && make install && make test`: 84 de teste trec, fără cont AWS (falsul în memorie și `DynamoStore` peste moto).

- Aplicația: `ba_server.main.create_app(settings=None, store=None)`; secretul și depozitul ajung în rute prin `Depends(require_secret)` / `Depends(get_store)`. Un ruter nou (tichetele 06 și 08) e un fișier în `ba_server/routers/` cu `router = APIRouter()`, găsit singur și păzit de secret; `PUBLIC = True` îl scoate de sub secret.
- Variabile de mediu: `APP_SECRET`, `TABLE_NAME`, `USER_PK` (implicit `u#alex`), `LOCAL_CORS_ORIGIN` (doar local). Secretul stă ca variabilă de mediu a funcției (nu Secrets Manager, care costă); la lansare vine din `BA_SECRET`.
- CORS: doar pe adresa funcției, origine `https://alexxgalea.github.io` (parametrul `PwaOrigin`). Originea reală a PWA-ului se confirmă la lansare.
- Neverificat pe AWS real: șablonul SAM (în special `InvokedViaFunctionUrl` pe permisiune și versiunea stratului Lambda Web Adapter) și `deploy.sh`. Criteriul „Originea PWA-ului e permisă; altele nu” e acoperit în teste prin șablon (originea, tiparul parametrului) și prin CORS-ul local al aplicației; efectul pe adresa reală se vede la primul `make smoke` / din PWA.

Rămâne deschis: **Lansat** (cere contul din tichetul 03, deci Alex: `BA_SECRET=... make deploy` din `server/`) și adresa funcției.

Adresa: _(de completat după lansare)_
