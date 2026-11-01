// Schelete: codul minim, canonic, al unui concept, scris din memorie în câteva minute (vezi CONTEXT.md).
// id: „s-<modul>-<nume>”; referința e secțiunea „=== <id> ===” din katas/skel_*.{py,mjs,ts,tsx,sql}, testată.
// t titlul, p cerința, k punctele esențiale (3–5), lang limbajul referinței (py, js, ts, tsx, sql, yaml, docker),
// v marcajul de versiune (de pildă „3.11+”), st = true pentru „verificat structural”, g grupa (doar la frontend: react, js, ts).
window.PREP.skel = [
  {
    id: "s-gil-bq", m: "gil", lang: "py",
    t: "Coadă blocantă mărginită cu Condition",
    p: "Scrie o clasă `BoundedQueue(cap)` cu `put(item)` și `get()`, sigure între thread-uri: `put` așteaptă cât coada e plină, `get` așteaptă cât e goală. Fără `queue.Queue`; doar `threading`.",
    k: [
      "`while`, nu `if`, în jurul lui `wait()`: la trezire condiția se verifică din nou (trezire falsă sau alt thread a luat locul).",
      "Ambele condiții (`not_full` / `not_empty`) folosesc același lock, iar bufferul se citește și se modifică doar sub el.",
      "`put` face `notify` pe condiția „nu e goală”, `get` pe „nu e plină”, după ce au schimbat bufferul.",
      "Bufferul e un `deque` (`popleft` în O(1)), iar o capacitate < 1 e respinsă."
    ]
  },
  // ----- pytest (6) -----
  {
    id: "s-pytest-fixture", m: "pytest", lang: "py",
    t: "Fixture cu yield, scope și conftest.py",
    p: "Scrie în `conftest.py` un fixture `conn` cu scope `module`, care deschide o conexiune SQLite în memorie, creează tabela `t (x int)` și o închide la final. Adaugă un fixture `db` (scope `function`) care dă aceeași conexiune și face `rollback()` după fiecare test. Apoi un test care inserează un rând prin `db` și verifică `count(*)`.",
    k: [
      "`yield`, nu `return`: ce e după `yield` e teardown-ul și rulează și când testul pică (aici `close()`). Cu `return`, conexiunea rămâne deschisă.",
      "Scope-ul îl alegi după costul setup-ului: `module` pentru o conexiune scumpă, `function` (implicit) pentru ce trebuie nou la fiecare test.",
      "Cu scope mare, testele împart starea. Izolezi cu un fixture `function` deasupra (aici `db` face `rollback()`), nu coborând scope-ul conexiunii.",
      "Fixture-ul comun stă în `conftest.py`, iar testele îl cer după nume, ca argument. Fără `import`."
    ]
  },
  {
    id: "s-pytest-parametrize", m: "pytest", lang: "py",
    t: "Parametrize cu ids",
    p: "Scrie `slugify(text)` (`\"A B\"` → `\"a-b\"`: litere mici, un grup de caractere non-alfanumerice devine un singur `-`, fără `-` la capete) și un singur test `parametrize` cu trei cazuri: două cuvinte, spații multiple și șirul gol. Fiecare caz are un `id` citibil.",
    k: [
      "Numele argumentelor sunt într-un singur string, separate prin virgulă (`\"text, expected\"`), iar fiecare caz e un tuplu în aceeași ordine.",
      "`param(..., id=\"gol\")` dă fiecărui caz un nume în raport (`test_slugify[gol]`). Fără `id`, numele iese din valori și nu spune ce testează cazul.",
      "Cazurile limită sunt rânduri în listă, nu o buclă `for` în test: fiecare caz e un test separat, iar unul care pică nu le oprește pe celelalte.",
      "`expected` e un literal scris de mână, nu rezultatul funcției testate: altfel testul e tautologic și nu pică niciodată."
    ]
  },
  {
    id: "s-pytest-raises", m: "pytest", lang: "py",
    t: "raises cu match",
    p: "Scrie `parse_port(text)`: ridică `ValueError(\"nu e număr\")` dacă textul nu are doar cifre și `ValueError` pentru un port în afara 1–65535; altfel întoarce portul ca `int`. Două teste: unul cu `pytest.raises(ValueError, match=...)`, unul care păstrează excepția (`as ei`) și îi verifică mesajul.",
    k: [
      "`raises` e context manager, iar în `with` pui doar linia care trebuie să arunce. Cu mai multe linii, orice `ValueError` din ele face testul să treacă.",
      "Tipul cât mai precis (`ValueError`, nu `Exception`): un tip larg prinde și bug-uri care nu te interesează.",
      "`match` e un regex căutat în `str(excepție)` cu `re.search`: un fragment ajunge, iar caracterele speciale (`.`, `(`) le escapezi cu `re.escape`.",
      "Excepția o verifici după `with` (`ei.value`), nu în interior: codul din `with` de după linia care aruncă nu mai rulează niciodată."
    ]
  },
  {
    id: "s-pytest-monkeypatch", m: "pytest", lang: "py",
    t: "monkeypatch pe mediu și atribut",
    p: "Ai `api_url()` (citește `API_HOST` din mediu, implicit `\"local\"`) și `attempts()` (`Cfg.tries + 1`). Scrie trei teste cu `monkeypatch`: variabila setată, variabila ștearsă și atributul `Cfg.tries` schimbat la 0. Niciun test nu lasă urme în următoarele.",
    k: [
      "`monkeypatch` anulează singur tot ce a schimbat, la finalul testului. O atribuire directă (`os.environ[...] = ...`, `Cfg.tries = 0`) rămâne și strică testele următoare.",
      "Pentru mediu: `setenv` și `delenv(nume, raising=False)`. Fără `raising=False`, `delenv` pe o variabilă care lipsește dă `KeyError`, iar testul depinde de mașina pe care rulează.",
      "`setattr(obiect, \"nume\", valoare)` schimbă atributul pe obiectul pe care îl citește codul testat (aici clasa `Cfg`).",
      "Fiecare test își setează singur tot ce citește (aici `API_HOST`) și nu presupune nimic despre mediul mașinii."
    ]
  },
  {
    id: "s-pytest-patch", m: "pytest", lang: "py",
    t: "patch acolo unde e folosit, cu autospec",
    p: "`svc.py` face `from client import get_user`, iar `greeting(uid)` întoarce `\"Salut, \"` + numele. `client.get_user` face rețea și nu-l scrii tu. Scrie două teste cu `@patch`: unul cu `return_value`, care verifică și apelul (`assert_called_once_with`), și unul cu `side_effect = TimeoutError`.",
    k: [
      "Patch-uiești numele acolo unde e căutat: `\"svc.get_user\"`, nu `\"client.get_user\"`. După `from client import get_user`, `svc` are propria referință, iar patch-ul pe `client` nu o schimbă.",
      "`autospec=True` copiază semnătura funcției reale: un apel cu argumente greșite pică cu `TypeError` în test, nu rămâne ascuns într-un mock care primește orice.",
      "`return_value` pentru succes, `side_effect = Excepție` pentru eșec (clasa sau instanța se ridică la apel; o listă dă valorile pe rând).",
      "Verifici și apelul (`assert_called_once_with(7)`), nu doar rezultatul: așa prinzi un argument greșit sau un apel în plus."
    ]
  },
  {
    id: "s-pytest-tmp-caplog", m: "pytest", lang: "py",
    t: "tmp_path și caplog",
    p: "Scrie `read_config(path)`: citește linii `cheie=valoare` într-un dict (cu `strip`), loghează `WARNING` pentru o linie fără `=` și `INFO` cu numărul de chei citite. Un test cu `tmp_path` și `caplog` verifică dict-ul și mesajele exacte.",
    k: [
      "`tmp_path` e un `Path` nou pentru fiecare test: scrii fișierul acolo, nu într-un nume fix (`/tmp/app.cfg`, directorul curent) care se amestecă între teste.",
      "Dai funcției un fișier real din `tmp_path`, nu mock-uiești `open()`: testezi și citirea.",
      "Pentru mesaje sub `WARNING` (aici `INFO`) ai nevoie de `caplog.at_level(logging.INFO)`; implicit pytest prinde doar `WARNING` și peste.",
      "Verifici `caplog.messages` (sau `records`: nivel și text), nu `capsys`: log-urile se prind din logger, nu din stdout."
    ]
  },
  // ----- asgi (5) -----
  {
    id: "s-asgi-endpoint", m: "asgi", lang: "py",
    t: "Endpoint cu model Pydantic și response_model",
    p: "`POST /users` primește `{email, password}` (`email` minim 3 caractere, `password` minim 8), întoarce 201 cu `{id, email}`, fără parolă. `GET /users/{uid}` întoarce utilizatorul sau 404 cu `user inexistent`. Stocarea e un `dict` global.",
    k: [
      "Corpul vine ca model Pydantic (`body: UserIn`): validarea și răspunsul `422` vin de la FastAPI. Nu parsezi `dict`-uri de mână.",
      "Două modele, unul pentru intrare și unul pentru ieșire: `response_model=UserOut` taie ce nu e în el. Fără el, `password` ajunge în răspuns.",
      "`status_code=201` pe decorator pentru creare. Fără el, răspunsul e `200`.",
      "Lipsa o semnalezi cu `raise HTTPException(404, ...)`, nu cu un `return` cu mesaj de eroare și status 200. `{uid}` cu tipul `int` se validează singur: `abc` dă 422."
    ]
  },
  {
    id: "s-asgi-depends-yield", m: "asgi", lang: "py",
    t: "Dependență cu yield pentru sesiune",
    p: "`SessionLocal()` (un sessionmaker SQLAlchemy) există deja. Scrie dependența `get_session` și un `POST /notes?text=...` care adaugă textul în sesiune și face `commit()`. Sesiunea se închide mereu; la o eroare faci `rollback()`, iar eroarea ajunge mai departe.",
    k: [
      "`yield` în dependență: ce e înainte e setup, ce e după e cleanup. `close()` stă în `finally`, ca să ruleze și când endpoint-ul aruncă.",
      "Excepția din endpoint ajunge în dependență, la `yield`: faci `rollback()` și `raise` mai departe. Fără `raise` o înghiți și FastAPI nu mai știe de ea (500, fără urmă în loguri).",
      "Endpoint-ul cere sesiunea cu `Depends(get_session)`, fără paranteze: dai funcția, iar FastAPI o apelează la fiecare request.",
      "`commit()` rămâne în endpoint, nu după `yield`: din FastAPI 0.118 codul de după `yield` rulează după ce răspunsul a plecat, deci o eroare de commit nu mai ajunge la client."
    ]
  },
  {
    id: "s-asgi-override", m: "asgi", lang: "py",
    t: "TestClient cu dependency_overrides",
    p: "`GET /count` depinde de `get_db()`, care în producție ridică `RuntimeError`. Scrie un fixture `client` care înlocuiește `get_db` cu o funcție ce întoarce `[1, 2]`, dă un `TestClient` și curăță înlocuirile la final. Un test verifică statusul și JSON-ul.",
    k: [
      "Cheia din `app.dependency_overrides` e funcția originală (`get_db`, obiectul, nu numele ca string), iar valoarea e funcția care o înlocuiește.",
      "Override-ul e global pe `app`: îl cureți cu `clear()` după `yield`, în fixture. Altfel scurge în testele următoare.",
      "`TestClient(app)` apelează aplicația în proces, fără server și fără port, iar testul e un `def` obișnuit, nu `async`.",
      "Verifici contractul HTTP (`status_code`, `json()`), nu funcția endpoint-ului apelată direct."
    ]
  },
  {
    id: "s-asgi-lifespan", m: "asgi", lang: "py",
    t: "lifespan: startup și shutdown",
    p: "La pornire pui în `app.state.pool` o listă cu un element; la oprire o golești. `GET /pool` întoarce `{\"n\": numărul de elemente}`. Un test pornește aplicația cu lifespan-ul, verifică răspunsul și apoi că pool-ul e gol după oprire.",
    k: [
      "`@asynccontextmanager` cu un singur `yield`: ce e înainte rulează la startup, ce e după, la shutdown. Îl dai cu `FastAPI(lifespan=lifespan)`.",
      "Resursele partajate le pui în `app.state` și le citești din `request.app.state`, nu în variabile globale create la import.",
      "Cu `lifespan` dat, handler-ele `@app.on_event(\"startup\")` nu mai sunt apelate, iar `on_event` e deprecated: folosești doar `lifespan`.",
      "În test, `with TestClient(app) as client:` pornește startup și shutdown. Fără `with`, lifespan-ul nu rulează și `app.state.pool` nu există (`AttributeError`)."
    ]
  },
  {
    id: "s-asgi-async-def", m: "asgi", lang: "py",
    t: "async def sau def: cod blocant pus corect",
    p: "Ai `blocking_io()` (un `time.sleep(0.2)`, ca un client sincron). Expune-l pe două endpoint-uri, `GET /sync` (`def`) și `GET /async` (`async def`), fără să blochezi event loop-ul în niciunul. Cinci cereri deodată trebuie să dureze ~0,2 s, nu 1 s.",
    k: [
      "Un endpoint `def` rulează într-un threadpool (AnyIO, 40 de thread-uri implicit): cod blocant (client sincron, SQLAlchemy sync, `time.sleep`) merge aici fără să blocheze serverul.",
      "Un endpoint `async def` rulează chiar pe event loop. Un apel blocant direct în el îngheață toate cererile, nu doar pe a ta.",
      "Cod blocant într-un `async def`: `await asyncio.to_thread(f)` (sau `run_in_threadpool`), ori varianta async a bibliotecii.",
      "Dacă faci I/O și nu ai pe ce să dai `await`, scrie `def`: un `async def` fără `await` peste cod blocant doar blochează loop-ul."
    ]
  }
];
