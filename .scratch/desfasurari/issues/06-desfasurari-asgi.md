# 06: Desfășurări pentru asgi (10 puncte)

**What to build:** Când Alex deschide fișa `asgi` în Studiu, găsește harta modulului și câte o desfășurare pentru fiecare punct, în formatul calibrat la `oop`: Problema, Ideea, Exemplu sau Analogie, În C++ cu Unde nu ține doar unde există un echivalent real, Legătură opțională. Modulul e publicat la același link, iar Alex primește un mesaj cu ce s-a adăugat și cu erorile de fapt corectate în puncte.

**Blocked by:** 02 (Calibrarea: Alex citește `oop` pe telefon)

**Status:** done

Spec: `.scratch/desfasurari/spec.md`. Vocabular: `CONTEXT.md` (Fișă, Punct, Desfășurare, Harta modulului).

Unghiul C++ și legăturile pentru `asgi`: C++ apare rar aici (servere, procese, worker-i); unde nu există echivalent real, câmpul lipsește. Legătura cu `asyncio` (05) și cu Gunicorn/Django din experiența lui Alex contează mai mult.

- [x] Fiecare modul din tichet are harta (problema mare și grupurile care acoperă toate punctele) și câte o desfășurare pentru fiecare punct, în ordinea punctelor.
- [x] Fiecare desfășurare pornește de la o Problemă concretă și nu repetă punctul cuvânt cu cuvânt; Ideea are câte un fapt pe propoziție.
- [x] Comparațiile cu C++ apar doar unde există un echivalent real, la nivel C++11/17, și au întotdeauna Unde nu ține.
- [x] Punctele nu sunt împărțite, unite sau reordonate; erorile de fapt găsite sunt corectate și enumerate în comentariul de închidere și în mesajul către Alex.
- [x] Faptele noi (Python și C++) sunt verificate pe surse primare și trecute în fișierul de fapte verificate.
- [x] Validarea trece (câmpuri, lungimi, rânduri de cod ≤ 36, hartă completă), iar check-ul de exemple trece pe toate exemplele Python.
- [x] `xcheck` / `fencew` curate; screenshot la 360 px, light și dark, pe fișă cu „Deschide tot”.
- [x] Toate testele de interfață și de unitate din `CLAUDE.md` trec; publicat la același link (artifact și PWA); mesaj scurt către Alex, în română.

## Comments

**2 nov. 2026:** `asgi` are acum harta și 10 desfășurări (`src/desf/asgi.md`), în ordinea punctelor.

- `Greu: da` la 3, 5, 8, 9 și 10 (plafonul rămâne 180 de cuvinte); 1, 2, 4, 6 și 7 rămân în banda normală (60–90 de cuvinte).
- C++ doar la punctul 3 (supervizor POSIX cu `fork` / `waitpid`; `Unde nu ține`: un worker nu e un `std::thread`, un segfault sau o excepție necaptată într-un thread oprește tot procesul, `std::terminate`). La 6 comparația cu `std::thread::hardware_concurrency()` a ieșit la review: formula (2 × core) + 1 vorbește de procese, deci nu există echivalent real. Fără C++ la restul punctelor.
- Exemplele rulează pe Python 3.13 (46 de exemple în total, 0 picate): la 3 un master care face `os.fork()` și își colectează workerii, la 4 valorile implicite din `uvicorn.Config`, la 8 `run_in_threadpool` pe alt thread, la 9 `ValidationError` din Pydantic, la 10 un store de `Idempotency-Key`. La 5 și 7 exemplele sunt ` ```text ` (comenzi, config Nginx).
- Verificat și prin rulare: Gunicorn 26.2.0 (`WORKER TIMEOUT` la `--timeout`, `--max-requests`), `uvicorn_worker.UvicornWorker` (un `await sleep` lung nu e omorât, un `time.sleep` în `async def` da) și worker-ul ASGI propriu `-k asgi`. Faptele noi (Gunicorn, Uvicorn, uvicorn-worker, RFC 9110 / 5789 / 6585, draftul `Idempotency-Key`, DRF, Celery, Kubernetes / Swarm, C++ `[thread.thread.constr]`, POSIX `fork`) sunt în `research/interview-facts.md`, secțiunea 23.
- Erori de fapt în punctele fișei: niciuna. Precizări, nu erori: la 4, `uvloop` și `httptools` vin cu `uvicorn[standard]` (fără ele: `asyncio` și `h11`); la 5, `uvicorn.workers` e deprecat (clasa nouă e `uvicorn_worker.UvicornWorker`, cum spune deja punctul), iar Gunicorn are din 24.0 și un worker ASGI propriu; la 6, docs Gunicorn dau și intervalul „2-4 × core” la setarea `workers`; la 10, `Idempotency-Key` e încă draft IETF.
- `tools/test_desf.py` are acum o secțiune pentru `asgi` (10 desfășurări, C++ doar la 3, exemplele ` ```text ` fără colorare Python, fără overflow la 360 px, light și dark).
- Review (`/code-review`, Standards și Spec): fără defecte blocante. Corectate: Legătura de la 8 care explica exemplul, gramatica Legăturii de la 5, Legăturile la Ingress / Swarm (acum cu surse), codurile de status de la 10 (acum ca reacții, cu Problema care le motivează), faptele lipsă din secțiunea 23 (DRF 400, reload grațios, orchestratori). Rămân judecăți asumate: rupturile de rând din exemple la 360 px (ca la `oop`, `python`, `gil`, `asyncio`) și comparația `fork` / `waitpid` la 3, care e POSIX, nu C++ standard (spus în text).
