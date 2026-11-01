Status: ready-for-agent

# Schelete: conceptele din teorie, scrise ca cod

Vocabularul vine din `CONTEXT.md`: **Schelet**, **Punct esențial**, **Kata**, **Modul**, **Fișă**. Deciziile au ieșit dintr-o sesiune `/grill-with-docs` (1 noiembrie 2026); jurnalul întrebărilor e la final. Tichetele nu sunt scrise încă: următorul pas e `/to-tickets`, apoi `/implement` pe valuri.

## Problem Statement

La sesiunea tehnică de pe CoderPad (marți, 3 noiembrie 2026) Alex trebuie să scrie cod care rulează, cu voce tare. Aplicația îl pregătește acum pe trei straturi: grile și fișe (recunoaște conceptul), snippet-uri orale (citește cod și găsește bug-ul) și kata-uri (rezolvă o problemă în ~20 de minute). Lipsește stratul din mijloc: forma canonică a fiecărui concept, scrisă din memorie. Alex știe ce e un `Condition` sau un fixture cu `yield`, dar nu a exersat să le scrie fără să se blocheze la sintaxă. Pe P1, majoritatea conceptelor din fișe nu au niciun exemplu de cod pe care să-l scrie el (thread cu lock, producer/consumer, `Process`, context manager, ABC, `Depends` cu `yield`, closure, `this`, generice TS etc.).

## Solution

Un tip nou de exercițiu, **Schelet**: codul minim și canonic al unui concept, scris din memorie în 2–5 minute. Fiecare schelet are o cerință, o referință testată și 3–5 **puncte esențiale**. Alex scrie scheletul într-un textarea, îl trimite la verificarea AI (care pre-bifează punctele acoperite și arată greșelile reale), confirmă bifele și primește o cutie Leitner. Scheletele au segmentul lor în Studiu, o sarcină în planul de seară și acoperă tot ce se poate scrie ca cod din module, inclusiv JavaScript și TypeScript ca limbaje, nu doar React.

## Decizii

### Conceptul

- **Schelet ≠ Kata.** Kata = problemă (~20 min, gândire algoritmică). Schelet = formă (2–5 min, fără blocaje la sintaxă). Sunt termeni separați în glosar și liste separate în aplicație. Scheletele sunt minimale, deci nu dublează k8 și k14: acolo e problema, aici doar forma.
- **Punct esențial**: 3–5 pe schelet, scrise odată cu referința; încercarea se notează pe ele. Exemplu (coada blocantă cu `Condition`): `while`, nu `if`, în jurul lui `wait()`; condițiile legate de același lock; `notify` după `put` și după `get`; capacitatea verificată sub lock.

### În aplicație

- **Segment nou în Studiu, „Schelete”**, lângă „Live coding”. Lista e grupată pe modul, P1 primele. `frontend` are trei grupe: React · JavaScript · TypeScript. Opțional: link „Schelete (N)” din fișa modulului.
- **Ecranul unui schelet**: conceptul, cerința, un textarea monospace, butoanele **Verifică cu AI** și **Arată referința**, apoi notarea pe puncte (bife).
- **Ciorna**: în `localStorage`, pe schelet, până la trimitere. Nu intră în `S`, în sincronizare, în export sau în brief.
- **Arată referința**: disponibil oricând. Apăsat înainte să existe o încercare trimisă → încercarea se notează cu 0.

### Verificarea AI

- Sursa: `AskModel` existent (Claude prin `sample` în artifact, Gemini cu cheia Jarvis în PWA, DeepSeek ca rezervă).
- Promptul primește cerința, punctele esențiale și codul lui Alex. Răspunsul (JSON): punctele acoperite, greșelile reale (nu rulează, bug de concurență, tip greșit), ce lipsește.
- Verdictul **doar pre-bifează**; Alex confirmă. Scorul vine din bife, nu din AI (același model ca `updO` la cardurile orale).
- Fără sursă AI: butonul lipsește, iar Alex se notează singur pe aceleași puncte.

### Repetare și scor

- **Leitner**, cu aceleași praguri ca `updO`, pe procentul de puncte bifate: ≥ 80% → cutia următoare; 50–80% → rămâne (minimum 1); < 50% → cutia 1. Scadențele sunt cele existente (`dueAt` / `isDue`).
- Starea stă într-o cheie nouă din `S`, cu aceeași formă ca la itemii existenți (cutie, număr de încercări, scor, timestamp) și îmbinare pe item în `mergeState`.
- **Nu intră în scorul de pregătire** (ca întrebările deschise): un tip nou, cu o zi înainte, ar sări brusc scorul calibrat pe grile și orale.

### Plan

- O sarcină pe seară, cheie stabilă `sch`: „Schelete: N scadente + 3 noi pe modulele cu nevoie mare”, ~15–20 min. Bugetul vine din „mix inteligent”, nu din kata.

### Progres și brief

- Progres: o linie „Schelete: X știute · Y de repetat · Z neîncepute”, ca la Live coding.
- `export/make_brief.js`: numărătoarea pe modul și scheletele ratate.
- **Jarvis nu folosește scheletele** (nici lecție, nici antrenament): cod dictat vocal nu are sens.

### Python

- **Forma principală e compatibilă cu Python 3.10.** Pagina CoderPad pentru Python 3 spune „Running CPython 3.10” (https://coderpad.io/?p=1372, posibil veche, neconfirmată pentru 2026). Formele 3.11+ (`TaskGroup`, `asyncio.timeout`, `except*`) sunt schelete separate, marcate „3.11+”. La interviu, Alex întreabă întâi versiunea.

### Testare

Fiecare referință e cod real, testat, în `katas/`, cu marcaje `=== s-… ===`, ca la kata (`build.mjs` le injectează).

- **Python**: pytest. Postgres 16 și `redis-server` există în sandbox și sunt pornite de teste. Celery cu `task_always_eager` + testul funcției. pika peste un channel fals (ordinea `basic_qos` → `basic_consume` → `basic_ack`). boto3 cu moto. Pachetele (SQLAlchemy 2.1.6 e ultima la 1 nov. 2026, Celery, redis-py, pika, boto3, moto, Strawberry) se instalează cu `pip`, care merge din sandbox.
- **JS**: `node --test`, ca `katas/katas_js.test.mjs`.
- **TS / TSX**: `tsc --strict --noEmit` (codul trebuie să compileze; erorile de tip așteptate se verifică cu `// @ts-expect-error`) + vitest + jsdom + Testing Library pentru componente și hook-uri. Dependențele stau într-un `katas/package.json` separat, ca aplicația să rămână fără dependențe. Tot așa pornește testul k15 (`katas/k15_alerts.test.tsx`), pe care azi nu-l rulează nimeni.
- **Dockerfile, compose, `.gitlab-ci.yml`**: doar verificare structurală (YAML valid, `FROM … AS build`, `USER` non-root etc.), fără rulare (Docker nu are daemon în sandbox). În date, scheletul e marcat „verificat structural”.
- Datele: `src/data_skel.js` (adăugat în `DATA_FILES` din `lib.mjs` și în `export/make_brief.js`). Referințele: `katas/skel_*.{py,mjs,ts,tsx,sql}` (plus fișierele de config). `validate.mjs` verifică puncte (3–5), cerință, referință existentă și rânduri ≤ 38 de caractere.

### Livrare

Patru valuri. Fiecare e validat (`node validate.mjs`, `node build.mjs`, `node --check dist/bundle-check.js`), testat (testele de interfață din `tools/`, `npm run test:unit`, testele scheletelor, screenshot la 360 px, light și dark) și publicat la același link, ca progresul să rămână.

1. Aplicația (segment, verificare AI, Leitner, plan, Progres, brief) + **gil, asyncio, python, oop** (24).
2. **pytest, asgi, frontend** (React, JavaScript, TypeScript) (37).
3. **P2** (13).
4. **P3** (14).

## Catalogul (~88)

### Valul 1

- **gil (6)**: `Thread` + `Lock` pe counter · producer/consumer pe `queue.Queue` (sentinel, `task_done` / `join`; `deque` menționat pentru BFS / fereastră) · coadă blocantă mărginită scrisă cu `threading.Condition` · `multiprocessing.Process` + `if __name__ == "__main__"` + rezultat prin `Queue` · `ThreadPoolExecutor` / `ProcessPoolExecutor` cu `as_completed` și excepții · oprire cu `threading.Event`
- **asyncio (6)**: `Semaphore` + `gather(return_exceptions=True)` · N workeri pe `asyncio.Queue` cu oprire curată · `TaskGroup` + `asyncio.timeout` (3.11+) · `to_thread` / `run_in_executor` · anulare corectă (`finally`, `CancelledError` re-ridicat) · `async with` + generator async
- **python (6)**: pipeline de generatori pe un fișier · generator cu `send` și `yield from` · decorator cu parametri + `wraps` · context manager ca clasă și cu `@contextmanager` · iterator propriu (`__iter__` / `__next__`) · `Counter` / `defaultdict` / `deque` / `heapq.nlargest`
- **oop (6)**: value object (`__eq__` + `__hash__`, sau `dataclass(frozen=True)`) · `@property` cu validare + `@classmethod from_dict` · ABC vs `Protocol` · compoziție cu dependență injectată + fake în test · `super()` cooperativ în moștenire multiplă · container (`__len__`, `__iter__`, `__getitem__`, `__contains__`)

### Valul 2

- **pytest (6)**: fixture cu `yield` + scope + `conftest.py` · `parametrize` cu `ids` · `raises(match=)` · `monkeypatch` (env, atribut) · `patch` acolo unde e folosit + `autospec` + `side_effect` · `tmp_path` + `caplog`
- **asgi (5)**: endpoint cu model Pydantic, `response_model`, coduri și `HTTPException` · `Depends` cu `yield` (sesiune DB) · `TestClient` + `dependency_overrides` · `lifespan` · `async def` vs `def` (cod blocant pus corect)
- **frontend / React (6)**: `useState` cu update funcțional + formular controlat · custom hook `useFetch` cu `AbortController` · listă cu `key` + filtru derivat, fără effect · Context + hook propriu · test RTL (`getByRole`, `userEvent`, `findBy`) · `Promise.allSettled` + erori în TS
- **frontend / JavaScript (12)**: closure și factory cu stare privată · `this` (arrow vs `function`, `bind`, metodă pasată ca handler) · ordinea pe event loop (`setTimeout` vs `.then` vs `queueMicrotask` vs `await`; scrii și prezici output-ul) · promisify + `async` / `await` cu `try` / `catch` / `finally` · retry cu backoff exponențial + timeout (`AbortSignal.timeout` / `Promise.race`) · `debounce` și `throttle` · update imutabil imbricat (spread, `structuredClone`) · `map` / `filter` / `reduce` + grupare (`Object.groupBy` sau `reduce`) · `Map` / `Set` (deduplicare, numărare, ordinea inserării) · generator async + `for await` peste un API paginat · clasă ES cu `#private`, `static`, getter · module ESM (named vs default, import dinamic)
- **frontend / TypeScript (8)**: generice cu constrângeri (`pluck<T, K extends keyof T>`) · narrowing + type guard propriu (`x is Alert`), `unknown` validat din JSON · union discriminat + `switch` exhaustiv cu `never` (cu `useReducer`) · utility types (`Partial`, `Pick`, `Omit`, `Record`, `Readonly`) + un mapped type · `as const`, union de literali, `satisfies` · `interface` vs `type` (`extends`, opțional, `readonly`) · tipuri în React (props, `children`, `ChangeEvent<HTMLInputElement>`) · hook generic `useFetch<T>` cu rezultat tipat ca union (`loading` / `error` / `ok`)

Prototipurile JS (`prototype`, `__proto__`) sunt lăsate pe dinafară intenționat.

### Valul 3 (P2)

- **sqlalchemy (3)**: model 2.0 (`Mapped`, `mapped_column`) + sesiune + `select` · `selectinload` contra N+1 · tranzacție (`session.begin()`) + migrare Alembic
- **postgres (3)**: upsert `ON CONFLICT` · window function (`ROW_NUMBER` / `LAG`) · `SELECT … FOR UPDATE SKIP LOCKED` ca coadă de joburi
- **index (1)**: `CREATE INDEX CONCURRENTLY` compus / parțial + `EXPLAIN ANALYZE`
- **celery (2)**: task cu `autoretry_for` + backoff + idempotență · `chain` / `group` + test eager
- **security (3)**: query parametrizat (nu f-string) · hash de parolă + `compare_digest` · verificare JWT (`algorithms=[...]`, `aud`, `exp`)
- **runtime (1)**: `__slots__` / `sys.getsizeof` vs generator (memorie)

### Valul 4 (P3)

- **redis (3)**: cache-aside cu TTL · lock cu `SET NX PX` + eliberare sigură · rate limit pe fereastră
- **rabbitmq (1)**: consumer pika cu `basic_qos` + ack manual + DLQ
- **docker (2)**: Dockerfile multi-stage, non-root · compose cu `healthcheck` + `depends_on` (verificate structural)
- **ops (2)**: logging structurat (JSON + `extra`) · `.gitlab-ci.yml` minim cu test + build (verificat structural)
- **linux (1)**: handler `SIGTERM` pentru graceful shutdown
- **perf (1)**: `cProfile` / `timeit` + citirea rezultatului
- **aws (1)**: boto3, URL presemnat S3 (testat cu moto)
- **graphql (1)**: schema Strawberry + resolver + DataLoader
- **django (1)**: `select_related` / `prefetch_related` lângă echivalentul SQLAlchemy

Dacă trebuie tăiat, primele candidate sunt runtime, perf, graphql și django. Fără `dbmodels` (Bonus), `domain` și `behav` (fără cod).

## Out of Scope

- Scheletele în Jarvis (lecție, antrenament, interviu simulat).
- Rularea codului lui Alex în aplicație (AI-ul citește codul, nu îl execută).
- Intrarea în scorul de pregătire.
- Salvarea încercărilor vechi în `S`.
- Prototipurile JS.

## Jurnalul deciziilor (grill, 1 nov. 2026)

| # | Întrebare | Decizie |
|---|---|---|
| Q1 | Nume și graniță față de kata | „Schelet”, termen separat în glosar |
| Q2 | Câte module | Tot ce se poate scrie ca cod |
| Q3 | Ce e „coada” | `queue.Queue` folosită corect + coadă blocantă cu `Condition` (două schelete) |
| Q4 | Exersare pe telefon | Textarea + verificare AI |
| Q5 | Referința testată | Da, în `katas/`, ca la kata |
| Q6 | Termen | Cât de bine se poate (fără termen fix) |
| Q7 | Unde în aplicație | Segment nou în Studiu, „Schelete” |
| Q8 | Ce verifică AI-ul | 3–5 puncte esențiale; verdictul pre-bifează, Alex confirmă |
| Q9 | Repetare / scor | Leitner, fără scor de pregătire |
| Q10 | Plan | Sarcină `sch` pe seară |
| Q11 | Limbaje | Toate; Dockerfile, compose și CI câte unul |
| Q12 | Infrastructură în teste | Servicii reale unde se poate, fake / moto altfel, structural pentru config |
| Q13 | Livrare | În valuri, fiecare publicat |
| Q14 | Versiune Python | 3.10 compatibil; 3.11+ separat, marcat |
| Q15 | Notare | Pragurile `updO`; referința văzută înainte → 0 |
| Q16 | Ciorna | `localStorage`, pe schelet |
| Q17 | Catalog | Acceptat; JS și TS acoperite neapărat |
| Q18 | Catalog JS / TS | 12 JS + 8 TS + 6 React |
| Q19 | Testare JS / TS | `node --test`; `tsc --strict` + vitest în `katas/package.json` |
| Q20 | Ordinea valurilor | gil/asyncio/python/oop → pytest/asgi/frontend → P2 → P3 |
| – | Presupuse în rezumat, neconfirmate explicit (Alex a cerut doar salvarea) | Jarvis fără schelete; linie în Progres; brief cu numărătoare; `src/data_skel.js` + `katas/skel_*` |
