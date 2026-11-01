# 13: Conținut: Celery, securitate și runtime (6 schelete)

**What to build:** Alex are scheletele de task-uri, securitate în backend și memorie în Python.

**Blocked by:** 01 (Un schelet de la cap la coadă, fără AI)

**Status:** done

Spec: `.scratch/schelete/spec.md`. Vocabular: `CONTEXT.md` (Schelet, Punct esențial, Kata).

- [x] celery (2): task cu `autoretry_for` + backoff + idempotență · `chain` / `group` + test eager (plus testul funcției direct).
- [x] security (3): query parametrizat, nu f-string (testul arată că o intrare malițioasă nu schimbă query-ul) · hash de parolă + `compare_digest` · verificare JWT cu `algorithms=[...]`, `aud`, `exp` (testul respinge `alg: none`, audiența greșită și tokenul expirat).
- [x] runtime (1): `__slots__` / `sys.getsizeof` vs generator (memorie).
- [x] Pachetele necesare sunt în lista de dev a testelor.
- [x] Faptele sunt verificate pe surse primare și trecute în notele de fapte verificate.
- [x] Validarea datelor trece; codul încape în 42 de coloane.

## Comments

**1 nov. 2026 — implementat.** Șase schelete în `src/data_skel.js` (celery: `s-celery-retry`, `s-celery-canvas`; security: `s-security-sql`, `s-security-pw`, `s-security-jwt`; runtime: `s-runtime-slots`), cu referințele în `katas/skel_celery_retry.py`, `katas/skel_celery_canvas.py`, `katas/skel_security.py`, `katas/skel_runtime.py` și testele în `katas/test_skel_{celery,security,runtime}.py` (56 de teste, toate trec; împreună cu restul, 108). Dependențele de dev (pytest, celery, PyJWT) sunt în `katas/requirements-dev.txt`, iar README le pomenește la comenzi. Faptele sunt în `research/interview-facts.md`, secțiunea 9.

Testele au fost scrise înaintea referințelor (roșii la import, apoi verzi) și verificate cu 21 de mutații pe referințe (de pildă `Exception` în loc de `ConnectionError`, cheia marcată înainte de efect, `==` în loc de `compare_digest`, salt fix, `verify_aud` oprit, fără `require`, fără `__slots__`). Prima rulare a lăsat un mutant viu: datele testului pentru ordinea din `group` erau deja în ordine alfabetică, deci le-am schimbat. Un test a prins și un defect real în referința `s-runtime-slots`: `getattr(obj, "__dict__", {})` adăuga 64 de octeți (un dicționar gol) și la `Slim`; acum se adaugă `__dict__` doar dacă există.

Abateri și decizii:
- Celery are două fișiere (`skel_celery_retry.py`, `skel_celery_canvas.py`), fiindcă fiecare referință își face propriul `Celery("app")` și, într-un singur modul, al doilea ar fi rescris numele primului. Securitatea are un singur fișier, cu trei secțiuni cu nume distincte.
- Eager și apel direct: testele cer ambele, cum scrie tichetul. Ghidul oficial spune că modul eager „is by definition not suitable for unit tests”, așa că logica se testează prin apel direct, iar `.apply()` verifică doar legătura dintre pași (reîncercarea, ordinea din `group`, argumentul primit de `store`). Punctul esențial 5 de la `s-celery-canvas` spune asta.
- Parola: PBKDF2-HMAC-SHA256 cu 600 000 de iterații, din biblioteca standard (merge pe CoderPad fără pachete). Argon2id (prima alegere la OWASP) e pomenit în punctul esențial. Testul „costul implicit” face un hash cu costul întreg (~0,3 s); restul folosesc `n=1000`.
- `s-security-sql` rulează pe `sqlite3` (placeholder `?`, `%s` la psycopg pomenit în punct). Testul înregistrează SQL-ul și parametrii printr-un `Spy` și cere ca textul query-ului să fie identic pentru intrarea normală și pentru cea malițioasă; un control cu f-string dovedește că atacurile chiar funcționează pe varianta greșită. Include și lista albă pentru `ORDER BY`.
- `s-security-jwt`: testul `alg: none` folosește un token făcut de mână (antet base64, semnătură goală), nu `jwt.encode(..., "none")`, ca să nu depindă de felul în care PyJWT îl produce.
- `s-runtime-slots`: pe 3.11+ câștigul din `__slots__` e mai mic (obiecte cu spații de nume create leneș); testul de memorie folosește `tracemalloc`, iar `size()` din referință e varianta clasică cu `getsizeof` + `__dict__`, care supraestimează pe 3.13 (accesul la `__dict__` îl creează). Nuanțele sunt în punctele esențiale 1 și 2 și în notele de fapte.

Neverificat: Python 3.10 (versiunea implicită a CoderPad); testele au rulat pe 3.13.16, cu Celery 5.6.3 și PyJWT 2.15.0 (PyJWT 2.15.1 e ultima). Referințele evită sintaxa 3.11+, dar `size()` și diferențele de memorie nu au fost măsurate pe 3.10. Nu am rulat Celery cu un broker real, doar eager.
