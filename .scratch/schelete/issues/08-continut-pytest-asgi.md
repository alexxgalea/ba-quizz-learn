# 08: Conținut: pytest și asgi (11 schelete)

**What to build:** Alex are scheletele de testare și FastAPI: cum scrie testele odată cu codul și cum construiește un endpoint testat pe loc.

**Blocked by:** 01 (Un schelet de la cap la coadă, fără AI)

**Status:** ready-for-agent

Spec: `.scratch/schelete/spec.md`. Vocabular: `CONTEXT.md` (Schelet, Punct esențial, Kata).

- [ ] pytest (6): fixture cu `yield` + scope + `conftest.py` · `parametrize` cu `ids` · `raises(match=)` · `monkeypatch` (env, atribut) · `patch` acolo unde e folosit + `autospec` + `side_effect` · `tmp_path` + `caplog`.
- [ ] asgi (5): endpoint cu model Pydantic, `response_model`, coduri și `HTTPException` · `Depends` cu `yield` (sesiune) · `TestClient` + `dependency_overrides` · `lifespan` · `async def` vs `def` (cod blocant pus corect).
- [ ] Referințele pytest sunt chiar teste care rulează (și un test care arată că fixture-ul face teardown); referințele FastAPI au teste cu `TestClient` pe versiunile din notele de fapte verificate.
- [ ] Scheletele nu repetă kata-urile k11 și k13.
- [ ] Textele sunt în română, cu termenii tehnici în engleză; punctele numesc greșeala tipică.
- [ ] Faptele noi sunt verificate pe surse primare și trecute în notele de fapte verificate.
- [ ] Validarea datelor trece; codul încape în 42 de coloane.
