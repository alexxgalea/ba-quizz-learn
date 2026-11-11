# 04: Serverul minim: primește și întoarce evenimente

**Parent:** `.scratch/platforma/spec.md`

**What to build:** un serviciu FastAPI lansat pe AWS Lambda, cu un tabel DynamoDB. Primește evenimente (idempotent, după id), le întoarce pe cele de după un cursor și respinge cererile fără secret. Stă în repo, cu teste și cu infrastructura descrisă în cod, și se lansează cu o singură comandă.

**Blocked by:** 01, 03

**Status:** ready-for-agent

- [ ] Trimiterea aceluiași eveniment de două ori îl păstrează o dată.
- [ ] Citirea de la un cursor întoarce evenimentele în ordinea sosirii, cu cursorul următor; paginată.
- [ ] Fără secret sau cu secret greșit: refuz, fără detalii.
- [ ] Originea PWA-ului e permisă; altele nu.
- [ ] Teste pytest cu DynamoDB local sau fals; rulează fără cont AWS.
- [ ] Lansat; adresa e notată aici. Nimic secret în repo.

## Comments
