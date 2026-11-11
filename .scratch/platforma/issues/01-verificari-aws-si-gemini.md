# 01: Verificări pe surse primare: AWS și jetonul Gemini

Type: research

**Parent:** `.scratch/platforma/spec.md` (Further Notes).

**What to build:** un fișier `research/platforma-facts.md` cu răspunsuri din documentația oficială, cu link și dată, la întrebările de mai jos. Hotărârile din ADR 0004 se sprijină pe căutări rapide; aici se confirmă sau se corectează.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] Ce e gratuit fără termen pentru un cont AWS creat în noiembrie 2026: Lambda, DynamoDB (provizionat sau la cerere), adresa funcției, secretele, jurnalele.
- [x] Ce se întâmplă exact la 6 luni pe planul gratuit și cum se trece pe cel plătit.
- [x] FastAPI pe Lambda în spatele unei adrese a funcției: împachetarea recomandată azi (Lambda Web Adapter sau alt adaptor) și limitele (durată, mărimea răspunsului).
- [x] Jetonul de scurtă durată pentru Gemini Live: cum se creează, cât ține, dacă se poate prelungi, ce versiune de API cere, dacă merge cu modelul din `src/jarvis.js`.
- [x] Limitele gratuite Gemini și prețul DeepSeek pentru volumul unei seri (≈ 50 de verificări).
- [x] Orice contrazice ADR 0004 e semnalat lui Alex, nu rezolvat în tăcere.

## Comments

- 2026-11-11: făcut în `research/platforma-facts.md` (patru semnalări pentru Alex în capul fișierului; nicio contradicție care răstoarnă ADR 0004). Alex hotărăște: secretele (variabile de mediu sau Secrets Manager) și Gemini gratuit vs plătit (conținutul nivelului gratuit e folosit de Google).
