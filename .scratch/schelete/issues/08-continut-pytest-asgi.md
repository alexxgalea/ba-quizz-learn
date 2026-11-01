# 08: Conținut: pytest și asgi (11 schelete)

**What to build:** Alex are scheletele de testare și FastAPI: cum scrie testele odată cu codul și cum construiește un endpoint testat pe loc.

**Blocked by:** 01 (Un schelet de la cap la coadă, fără AI)

**Status:** done

Spec: `.scratch/schelete/spec.md`. Vocabular: `CONTEXT.md` (Schelet, Punct esențial, Kata).

- [x] pytest (6): fixture cu `yield` + scope + `conftest.py` · `parametrize` cu `ids` · `raises(match=)` · `monkeypatch` (env, atribut) · `patch` acolo unde e folosit + `autospec` + `side_effect` · `tmp_path` + `caplog`.
- [x] asgi (5): endpoint cu model Pydantic, `response_model`, coduri și `HTTPException` · `Depends` cu `yield` (sesiune) · `TestClient` + `dependency_overrides` · `lifespan` · `async def` vs `def` (cod blocant pus corect).
- [x] Referințele pytest sunt chiar teste care rulează (și un test care arată că fixture-ul face teardown); referințele FastAPI au teste cu `TestClient` pe versiunile din notele de fapte verificate.
- [x] Scheletele nu repetă kata-urile k11 și k13.
- [x] Textele sunt în română, cu termenii tehnici în engleză; punctele numesc greșeala tipică.
- [x] Faptele noi sunt verificate pe surse primare și trecute în notele de fapte verificate.
- [x] Validarea datelor trece; codul încape în 42 de coloane.

## Comments

**1 nov. 2026 — implementat** (b436339). Cele 11 schelete sunt în `src/data_skel.js`, referințele în `katas/skel_pytest.py` și `katas/skel_asgi.py`, testele în `katas/test_skel_pytest.py` (26) și `katas/test_skel_asgi.py` (27), rulate pe pytest 9.2.0, FastAPI 0.162.0, Starlette 1.7.0. Referințele pytest sunt chiar module de teste; testele lor le rulează cu pytest într-un director nou și strică referința (mutații), ca să vadă că testul pică exact unde apără punctul esențial: teardown-ul de după `yield` (un plugin de spionaj verifică că `conn` e închis la final, iar cu `return` nu e), izolarea prin `rollback`, scurgerea din atribuiri directe, `delenv` fără `raising=False`, `patch` pe `client` în loc de `svc`, `autospec` și `caplog.at_level`. Referințele FastAPI se încarcă într-un modul nou: `response_model` (parola nu iese), `rollback` + `raise` în dependența cu `yield` (fără `raise`: `FastAPIError` / 500), cleanup după trimiterea răspunsului (măsurat pe interfața ASGI), override curățat, lifespan doar cu `with TestClient`, iar codul blocant verificat prin thread-ul pe care rulează și prin timp (5 cereri: ~0,2 s în threadpool, ~1 s pe loop). Faptele noi sunt în `research/interview-facts.md`, secțiunea 9.

Abateri: referințele folosesc `from pytest import mark, param` și nume scurte ca să încapă în 42 de coloane. La `patch`, `client.py` îl dă testul, nu Alex, iar `SessionLocal` din dependența cu `yield` e injectat de test (promptul spune că există deja). Secțiunile cu mai multe fișiere au separatori `# --- nume.py ---`. Față de k11 și k13: `parametrize` aici e forma (cu `ids`), nu căutarea bug-ului din k11, iar nicio referință nu repetă `Header`, paginarea sau idempotența din k13. Nu am atins `src/app.js`; `tools/test_skel.py` și `tools/test_skel_ai.py` trec, iar la 360 px, în light și dark, referințele încap fără scroll orizontal.

Neverificat: testele de timp (`test_five_requests_*`) au praguri largi (0,6 s și 0,9 s față de 0,2 s și 1 s), dar pe un runner foarte încărcat ar putea fi sensibile.
