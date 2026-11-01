# 13: Conținut: Celery, securitate și runtime (6 schelete)

**What to build:** Alex are scheletele de task-uri, securitate în backend și memorie în Python.

**Blocked by:** 01 (Un schelet de la cap la coadă, fără AI)

**Status:** ready-for-agent

Spec: `.scratch/schelete/spec.md`. Vocabular: `CONTEXT.md` (Schelet, Punct esențial, Kata).

- [ ] celery (2): task cu `autoretry_for` + backoff + idempotență · `chain` / `group` + test eager (plus testul funcției direct).
- [ ] security (3): query parametrizat, nu f-string (testul arată că o intrare malițioasă nu schimbă query-ul) · hash de parolă + `compare_digest` · verificare JWT cu `algorithms=[...]`, `aud`, `exp` (testul respinge `alg: none`, audiența greșită și tokenul expirat).
- [ ] runtime (1): `__slots__` / `sys.getsizeof` vs generator (memorie).
- [ ] Pachetele necesare sunt în lista de dev a testelor.
- [ ] Faptele sunt verificate pe surse primare și trecute în notele de fapte verificate.
- [ ] Validarea datelor trece; codul încape în 38 de coloane.
