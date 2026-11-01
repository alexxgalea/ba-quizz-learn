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
  {
    id: "s-frontend-closure", m: "frontend", g: "js", lang: "js",
    t: "Closure și factory: un contor cu stare privată",
    p: "Scrie `makeCounter(start = 0)`, care întoarce un obiect cu `inc()`, `dec()` și `value()`. Starea nu trebuie să fie accesibilă din afară, iar doi contori creați separat nu își împart valoarea.",
    k: [
      "Starea e o variabilă locală a fabricii (`let n`), nu o proprietate a obiectului întors: din afară nu o poți citi sau scrie.",
      "Metodele sunt closure-uri: păstrează accesul la `n` și după ce `makeCounter` s-a terminat, fiindcă closure-ul capturează variabila, nu o copie a valorii.",
      "Fiecare apel al fabricii creează o variabilă `n` nouă, deci doi contori nu își împart starea; fără `new`, fără clasă.",
      "Metodele nu folosesc `this`, deci merg și extrase (`const { inc } = c; inc()`), unde o metodă de clasă și-ar pierde contextul."
    ]
  },
  {
    id: "s-frontend-union-never", m: "frontend", g: "ts", lang: "ts",
    t: "Union discriminat și switch exhaustiv cu never",
    p: "Modelează rezultatul unei cereri ca union discriminat de `status`: `loading`, `ok` (cu `data: string[]`) și `error` (cu `message`). Scrie `label(r)` cu un `switch` exhaustiv, astfel încât un caz nou în union să nu compileze până nu primește ramura lui.",
    k: [
      "Uniunea e discriminată de un câmp literal comun (`status`), nu de câmpuri opționale; în fiecare `case` tipul se îngustează (`r.data` există doar la `ok`).",
      "`default` apelează `assertNever(r)`, iar parametrul ei are tipul `never`: după ce toate cazurile sunt tratate, `r` nu mai poate avea alt tip.",
      "Un caz nou în union face `r` ne-`never` în `default`, deci eroarea apare la compilare, nu în producție.",
      "`assertNever` aruncă și la runtime (date din afara tipului, de pildă un JSON) și întoarce `never`, deci funcția nu are nevoie de alt `return`."
    ]
  },
  // ---- python (tichetul 05) ----
  {
    id: "s-python-gen-pipeline", m: "python", lang: "py",
    t: "Pipeline de generatori pe un fișier",
    p: "Scrie `read_lines(path)` (generator care citește fișierul linie cu linie, fără newline la capăt), `grep(lines, word)` și `head(lines, n)`, apoi `first_matches(path, word, n)` care le înlănțuie. Memoria rămâne constantă pentru orice fișier.",
    k: [
      "Fiecare etapă primește un iterabil și produce unul (generator sau generator expression), deci nimic nu se citește până nu consumi rezultatul. Greșeala tipică: `readlines()` sau `[... for ...]`, care încarcă tot în memorie.",
      "`with open(...)` stă ÎN generator: fișierul se deschide la prima linie cerută și se închide la epuizare sau la `close()` (`GeneratorExit` iese din `with`).",
      "Oprirea timpurie se face cu `itertools.islice(lines, n)`, nu cu `list(lines)[:n]`: după al n-lea rezultat sursa nu mai e citită.",
      "Generatorul e de unică folosință: al doilea parcurs al aceluiași pipeline e gol; pentru o nouă trecere îl refaci."
    ]
  },
  {
    id: "s-python-gen-send", m: "python", lang: "py",
    t: "Generator cu send și yield from",
    p: "Scrie `averager()`, un generator care primește numere prin `send` și, la `None`, se termină cu `return` media. Apoi `collector(results)`, care cu `yield from averager()` adună în listă media fiecărei grupe, una după alta.",
    k: [
      "Generatorul se pornește cu `next(gen)` (sau `send(None)`); `send(valoare)` pe unul neînceput ridică `TypeError`.",
      "`x = yield` primește valoarea trimisă cu `send`, iar un sentinel (`None`) marchează sfârșitul grupei.",
      "Sub-generatorul se încheie cu `return medie`, iar expresia `yield from averager()` are exact acea valoare (din `StopIteration.value`); nu prinzi tu `StopIteration`.",
      "Delegatorul stă într-un `while True`: după fiecare grupă pornește un sub-generator nou, iar `send`-urile următoare ajung direct la el."
    ]
  },
  {
    id: "s-python-decorator", m: "python", lang: "py",
    t: "Decorator cu parametri și wraps",
    p: "Scrie `@limit_calls(n)`: funcția decorată se poate apela de cel mult `n` ori, apoi ridică `RuntimeError`. Trebuie să-i păstrezi numele și docstring-ul, să transmiți argumentele și să întorci rezultatul.",
    k: [
      "Trei niveluri: `limit_calls(n)` (fabrica) întoarce `decorator(func)`, care întoarce `wrapper`. Greșeala tipică: `@limit_calls` fără paranteze, care îi dă funcția drept `n`.",
      "`@functools.wraps(func)` pe wrapper copiază `__name__` și `__doc__` și adaugă `__wrapped__`; fără el, funcția decorată se numește `wrapper`.",
      "Wrapper-ul primește `*args, **kwargs` și face `return func(*args, **kwargs)`; fără `return`, funcția decorată întoarce mereu `None`.",
      "Contorul stă în closure (`nonlocal used`), creat în `decorator`, deci e separat pe fiecare funcție decorată, nu global."
    ]
  },
  {
    id: "s-python-ctx", m: "python", lang: "py",
    t: "Context manager: clasă și @contextmanager",
    p: "Scrie același context manager în două feluri: clasa `Managed(log)` cu `__enter__` / `__exit__` și generatorul `managed(log)` cu `@contextmanager`. Ambele adaugă `open` în listă la intrare și `close` la ieșire, chiar dacă blocul `with` ridică o excepție, și lasă excepția să se propage.",
    k: [
      "`__exit__(self, exc_type, exc, tb)` rulează și când blocul ridică o excepție, iar `__enter__` întoarce obiectul legat de `as`.",
      "`__exit__` întoarce `False` sau `None`, ca excepția să se propage; un `True` o înghite în tăcere. Greșeala tipică: `return True` pus din reflex.",
      "La `@contextmanager`: exact un `yield`, iar valoarea lui ajunge în `as`.",
      "`yield` stă într-un `try/finally`: excepția din bloc e re-ridicată în generator chiar la `yield`, iar fără `finally` curățarea nu mai rulează."
    ]
  },
  {
    id: "s-python-iter", m: "python", lang: "py",
    t: "Iterator propriu: __iter__ și __next__",
    p: "Scrie `Countdown(start)`, un iterabil care dă `start, start-1, … 1` și se poate parcurge de mai multe ori, cu o clasă separată pentru iterator. Iteratorul are `__iter__` și `__next__`; fără generatori.",
    k: [
      "Iteratorul are `__iter__` (întoarce `self`) și `__next__` (întoarce valoarea următoare); starea parcurgerii stă în el, nu în container.",
      "Sfârșitul se semnalează cu `raise StopIteration` (nu `return None`, nu `IndexError`), iar după epuizare `__next__` continuă să ridice `StopIteration`.",
      "`__iter__` al iterabilului întoarce un iterator NOU la fiecare apel; dacă întoarce `self`, al doilea `for` pe același obiect iese gol.",
      "Doi iteratori creați din același iterabil merg independent unul de altul."
    ]
  },
  {
    id: "s-python-collections", m: "python", lang: "py",
    t: "Counter, defaultdict, deque, heapq.nlargest",
    p: "Scrie patru funcții mici din `collections` și `heapq`: `top_words(words, k)` (cele mai frecvente k cuvinte), `group_by_len(words)` (cuvintele grupate după lungime), `last_n(items, n)` (ultimele n dintr-un flux) și `biggest(scores, k)` (primele k perechi după valoare).",
    k: [
      "`Counter(words).most_common(k)` numără și ordonează descrescător; la egalitate păstrează ordinea primei apariții. Nu sorta de mână un dict de frecvențe.",
      "`defaultdict(list)` creează valoarea doar la `d[key]` (prin `__missing__`); `d.get(key)` și `key in d` nu o creează.",
      "`deque(maxlen=n)` aruncă singur cel mai vechi element, deci ții doar ultimele n dintr-un flux; cu o listă și `pop(0)` fiecare scoatere costă O(n).",
      "`heapq.nlargest(k, iterabil, key=...)` întoarce lista descrescător după `key`; merge bine pentru k mic, iar pentru k mare e mai eficient `sorted(...)` (pentru k = 1, `max()`)."
    ]
  },
  // ---- oop (tichetul 05) ----
  {
    id: "s-oop-value", m: "oop", lang: "py",
    t: "Value object: __eq__, __hash__ și frozen dataclass",
    p: "Scrie un value object în două feluri: clasa `Tag(name)` cu `name` doar în citire și `__eq__` / `__hash__` scrise de mână, apoi `Money(amount, currency)` ca `dataclass(frozen=True)`. Obiectele egale trebuie să intre o singură dată într-un `set`.",
    k: [
      "`__eq__` și `__hash__` merg împreună și folosesc aceleași câmpuri: obiectele egale au același hash (`hash(self.name)` sau `hash((a, b))`).",
      "Greșeala tipică: `__eq__` fără `__hash__` face clasa nehashable (`__hash__` devine `None`), deci nu intră în `set` și nu e cheie de `dict`.",
      "`__eq__` întoarce `NotImplemented` pentru alt tip, nu `False` și nu `AttributeError`; Python încearcă atunci operandul invers.",
      "Value object-ul e imuabil (`name` doar prin `@property`); `@dataclass(frozen=True)` generează `__eq__` + `__hash__` și blochează atribuirea (`FrozenInstanceError`). Fără `frozen`, `eq=True` pune `__hash__ = None`."
    ]
  },
  {
    id: "s-oop-property", m: "oop", lang: "py",
    t: "property cu validare și classmethod from_dict",
    p: "Scrie `Product(name, price)` cu `price` ca `@property`: setter-ul respinge valorile negative cu `ValueError`, iar validarea rulează și în constructor. Adaugă `Product.from_dict(data)` ca constructor alternativ.",
    k: [
      "`__init__` atribuie `self.price = price` (deci prin setter), nu `self._price`; altfel un preț negativ trece la construcție. Greșeala tipică.",
      "Getter-ul și setter-ul au același nume (`@price.setter`) și țin valoarea în `_price`; dacă setter-ul ar atribui `self.price`, s-ar apela la nesfârșit (`RecursionError`).",
      "Setter-ul validează înainte să atribuie și ridică `ValueError`; după o valoare respinsă, cea veche rămâne.",
      "`from_dict` e `@classmethod` și construiește cu `cls(...)`, nu cu `Product(...)`: o subclasă primește o instanță de subclasă."
    ]
  },
  {
    id: "s-oop-abc-protocol", m: "oop", lang: "py",
    t: "ABC vs Protocol",
    p: "Scrie interfața `Storage` ca `ABC` cu `save` abstractă și implementarea `MemoryStorage`. Apoi `Notifier` ca `Protocol` cu `send`, clasa `MemoryNotifier` care îl satisface fără moștenire și funcția `alert(notifier, msg)`.",
    k: [
      "`ABC` + `@abstractmethod`: o clasă cu metode abstracte neimplementate nu se instanțiază (`TypeError`), nici ABC-ul însuși, nici o subclasă incompletă.",
      "ABC e subtipare nominală (moștenești explicit); `Protocol` e structurală: orice clasă cu metoda `send` se potrivește, fără `Notifier` în bază.",
      "`isinstance(x, Notifier)` cere `@runtime_checkable`; fără el ridică `TypeError`. Și cu el verifică doar că metoda există, nu semnătura.",
      "Alegerea: ABC când vrei impunere la instanțiere sau cod comun în bază; Protocol când tipezi cod existent sau vrei duck typing verificat static."
    ]
  },
  {
    id: "s-oop-composition", m: "oop", lang: "py",
    t: "Compoziție cu dependență injectată și fake",
    p: "Scrie `Signup(mailer)` cu `register(email)`, care respinge un email fără `@` (`ValueError`) și trimite un mail de salut prin `mailer.send(to, text)`. Apoi un `FakeMailer` care înregistrează apelurile și un test care îl folosește.",
    k: [
      "Dependența vine prin `__init__` (`self.mailer = mailer`), nu e creată în clasă; un `Mailer()` în `__init__` leagă clasa de implementarea reală și face testul lent sau imposibil.",
      "`Signup` știe doar de metoda `send`, deci merge orice obiect care o are (fake, mock, client real). Compoziție („are un”), nu moștenire („este un”).",
      "Fake-ul e o clasă mică, scrisă de mână, care înregistrează apelurile într-o listă (`sent`); testul verifică ce s-a trimis, nu cum e scris `Signup`.",
      "Un email invalid ridică `ValueError` înainte de orice trimitere, deci fake-ul rămâne gol."
    ]
  },
  {
    id: "s-oop-super", m: "oop", lang: "py",
    t: "super() cooperativ în moștenire multiplă",
    p: "Scrie un diamant: `Base.hello()` întoarce `['Base']`, iar `Left(Base)`, `Right(Base)` și `Child(Left, Right)` adaugă fiecare numele lor în față și cheamă mai departe cu `super()`. `Child().hello()` trebuie să treacă prin fiecare clasă exact o dată.",
    k: [
      "`super()` urmează MRO-ul instanței (`Child.__mro__`: Child, Left, Right, Base), nu clasa părinte scrisă în cod: în `Left`, `super()` ajunge la `Right` când obiectul e un `Child`.",
      "Fiecare clasă cheamă `super().hello()`. Greșeala tipică: `Base.hello(self)` direct, care sare peste `Right` și rupe lanțul.",
      "Ordinea bazelor contează: `class Child(Left, Right)` pune `Left` înaintea lui `Right`; inversate, se inversează și MRO-ul.",
      "`Base` e capătul lanțului: întoarce valoarea de bază și nu mai cheamă `super()`, deci rulează o singură dată."
    ]
  },
  {
    id: "s-oop-container", m: "oop", lang: "py",
    t: "Container: __len__, __getitem__, __iter__, __contains__",
    p: "Scrie `Playlist(songs=())`, un container peste o listă internă, care merge cu `len()`, indexare (inclusiv negativă și felii), `for` și `in`.",
    k: [
      "`__len__` dă `len()` și, fără `__bool__`, face un container gol să fie fals în `if playlist:`.",
      "`__getitem__` delegă la listă: acceptă index negativ și felii, iar un index în afara limitelor ridică `IndexError` (pe el se sprijină și protocolul vechi de iterare).",
      "`__iter__` întoarce un iterator NOU (`iter(self._songs)`), nu `self`: containerul se poate parcurge de mai multe ori.",
      "`__contains__` e opțional: fără el, `in` cade pe `__iter__` și apoi pe `__getitem__` (căutare liniară); îl scrii când ai o structură mai rapidă (de pildă un `set`)."
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
