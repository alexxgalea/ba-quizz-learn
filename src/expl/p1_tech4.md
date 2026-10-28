<!-- Proba tehnică, lotul 4: generatori, pytest, FastAPI. Variantele greșite: B, C, D = ordinea din sursă (A e cea corectă). -->

### py-14
Pe scurt: `[0, 2, 4]`, apoi `[]`: un generator se parcurge o singură dată.
Scop: Eviți bug-ul în care același generator e folosit de două ori și a doua oară e gol, fără nicio eroare.
Mecanism: Un generator ține o poziție internă. `list(gen)` îl citește până la capăt și îl lasă epuizat. Orice parcurgere ulterioară primește imediat `StopIteration`, deci o colecție goală.
Pas cu pas:
```text
gen creat: poziția 0
list(gen) -> 0, 2, 4 -> epuizat
list(gen) -> StopIteration imediat
          -> []
```
Aplicare: Dacă ai nevoie de date de două ori, le pui într-o listă (dacă încap) sau recreezi generatorul; și mai bine, calculezi tot într-o singură trecere.
Legătură: E același bug ca în cardul cu `read_events`: `sum` consumă generatorul, iar filtrarea de după primește nimic. Un `QuerySet` din Django, spre deosebire, poate fi parcurs de mai multe ori (are cache).
Limită: `itertools.tee` pare să rezolve dubla parcurgere, dar ține în memorie tot ce a citit o ramură și cealaltă nu, deci poate costa cât o listă.
La interviu: „Un generator e un iterator de unică folosință: după ce l-am parcurs, e gol. Dacă îmi trebuie datele de două ori, fac o singură trecere, îl recreez sau, dacă încap, le țin într-o listă.”
Verificare: O funcție primește `items` și face `if not list(items): return`, apoi `for x in items:`. Ce se întâmplă dacă îi dai un generator?
Răspuns verificare: Bucla nu face nimic: `list(items)` a consumat deja generatorul pentru verificare.
Varianta greșită B: Ar fi corect pentru o listă sau un tuplu. Un generator nu se resetează.
Varianta greșită C: Primul `list` e cel care consumă valorile; ordinea nu se inversează.
Varianta greșită D: Un generator epuizat nu aruncă eroare: `list` primește direct sfârșitul iterării și întoarce `[]`.

### py-15
Pe scurt: `[1, 2, 'done']`: `yield from` transmite valorile lui `inner`, iar expresia primește valoarea returnată de `inner`.
Scop: Știi să compui generatori și ce valoare are `yield from` ca expresie.
Mecanism: `yield from inner()` iterează `inner` și dă mai departe fiecare valoare. Când `inner` se termină cu `return "done"`, valoarea ajunge în `StopIteration.value`, iar `yield from` o întoarce ca rezultat al expresiei. `outer` o produce apoi cu un `yield` obișnuit.
Pas cu pas:
```text
outer -> yield from inner()
  inner: yield 1 -> afară: 1
  inner: yield 2 -> afară: 2
  inner: return "done"
r = "done"
outer: yield r -> afară: "done"
```
Aplicare:
```python
def all_events(files):
    for f in files:
        yield from read(f)
```
Legătură: `yield from` stă la baza corutinelor vechi din asyncio, de dinainte de `async`/`await`.
Limită: Pentru simpla concatenare de iterabile, `itertools.chain.from_iterable` e la fel de clar; `yield from` contează când îți trebuie și valoarea returnată sau `send`.
La interviu: „`yield from` deleagă iterarea către alt generator: îi transmite valorile, iar `send` și `throw` ajung direct la el. Expresia întoarce valoarea din `return`-ul generatorului interior.”
Verificare: Ce afișează `list(outer())` dacă `inner` nu are `return`?
Răspuns verificare: `[1, 2, None]`: fără `return`, generatorul întoarce `None`, iar `outer` produce `r`, adică `None`.
Varianta greșită B: Ar lipsi valoarea returnată, pe care `outer` o produce explicit cu `yield r`.
Varianta greșită C: `yield from` nu înghite valorile lui `inner`: le transmite mai departe, una câte una.
Varianta greșită D: `return "done"` dă o valoare, deci `r` e „done”, nu `None`.

### py-16
Pe scurt: `15.0`: fiecare `send` trimite o valoare în generator și primește înapoi media curentă.
Scop: Înțelegi că un generator poate primi date, nu doar produce, și de ce primul pas e `next`.
Mecanism: `next(g)` rulează până la primul `yield` (cel fără valoare). `send(10)` face ca acel `yield` să întoarcă 10; generatorul adună și se oprește la următorul `yield`, întorcând 10.0. `send(20)` reia de acolo cu `x = 20` și întoarce (10 + 20) / 2.
Pas cu pas:
```text
next(g)   -> oprit la x = yield
send(10)  -> x=10, total=10, n=1
          -> yield 10.0
send(20)  -> x=20, total=30, n=2
          -> yield 15.0
```
Aplicare: Un generator cu `send` poate ține stare între evenimente (o medie, o fereastră glisantă) fără o clasă.
Legătură: E mecanismul din care au crescut corutinele asyncio; azi, pentru stare simplă, o clasă mică e adesea mai clară.
Limită: `send` cu o valoare diferită de `None` pe un generator nepornit aruncă `TypeError`; primul pas e mereu `next(g)` sau `g.send(None)`.
La interviu: „`send` reia generatorul și face ca `yield` să întoarcă valoarea trimisă. Primul pas e `next`, ca generatorul să ajungă la primul `yield`.”
Verificare: Ce se întâmplă dacă sari peste `next(g)` și faci direct `g.send(10)`?
Răspuns verificare: `TypeError: can't send non-None value to a just-started generator`.
Varianta greșită B: `send` întoarce media curentă, nu valoarea trimisă.
Varianta greșită C: 10.0 e rezultatul primului `send`; al doilea include și 20.
Varianta greșită D: Ordinea `next`, apoi `send` e cea corectă, deci nu apare nicio eroare.

### py-17
Pe scurt: Afișează „creat”, apoi aruncă `ValueError` la `sum`: corpul generatorului rulează abia când ceri valori.
Scop: Știi unde apar erorile într-un pipeline leneș, ca să le tratezi în locul potrivit.
Mecanism: Apelul `parse(...)` creează doar obiectul generator, fără să execute vreo linie din corp. `sum` cere valorile: prima, 1, merge; la a doua, `int("x")` aruncă `ValueError`, chiar în interiorul lui `sum`.
Pas cu pas:
```text
parse([...]) -> generator, 0 linii
print("creat")
sum: next -> int("1") = 1
sum: next -> int("x") -> ValueError
eroarea apare în sum, nu în parse
```
Aplicare:
```python
def parse(lines):
    for l in lines:
        try:
            yield int(l)
        except ValueError:
            log.warning("bad %r", l)
```
Legătură: Același efect ca la un `QuerySet` leneș din Django: eroarea SQL apare când îl evaluezi, nu când îl construiești.
Limită: Dacă tratezi eroarea în generator și sari peste linie, pierzi date în tăcere; de obicei vrei măcar un contor sau un log.
La interviu: „Un generator e leneș: apelul doar îl creează, iar codul rulează când cer valori. Erorile apar la consum, deci le tratez în generator, pe linie, sau acolo unde îl consum.”
Verificare: Pui `parse(...)` într-un `try/except ValueError` și consumi generatorul după acel bloc. Prinde blocul eroarea?
Răspuns verificare: Nu. Eroarea apare la consum, în afara blocului `try`.
Varianta greșită B: Crearea generatorului nu execută corpul, deci nu poate apărea eroarea la `parse(...)`.
Varianta greșită C: Generatorul nu sare peste erori de unul singur; `int("x")` aruncă.
Varianta greșită D: `sum` nu întoarce 0 la eroare: excepția se propagă.

### py-18
Pe scurt: `[1, 2, 3]`: `islice` cere exact trei valori, deci generatorul infinit nu e parcurs mai departe.
Scop: Lucrezi cu fluxuri potențial infinite (evenimente, ID-uri, paginare) fără să le materializezi.
Mecanism: Generatorul produce câte o valoare la fiecare `next`. `islice(gen, 3)` cheamă `next` de trei ori și se oprește, iar `list` adună doar ce a primit.
Pas cu pas:
```text
islice(ids(), 3)
next -> 1, next -> 2, next -> 3
islice: gata -> nu mai cere
list -> [1, 2, 3]
```
Aplicare:
```python
page = list(islice(stream, 100))
```
Legătură: Paginarea leneșă a unui API (un generator care cere pagina următoare doar când e nevoie) funcționează la fel.
Limită: `islice` nu poate sări înapoi și nu acceptă indici negativi: parcurge iteratorul.
La interviu: „Un generator poate fi infinit, pentru că produce la cerere. Cu `islice` iau doar cât îmi trebuie, fără să materializez fluxul.”
Verificare: Ce se întâmplă cu `list(ids())`, fără `islice`?
Răspuns verificare: Rulează la nesfârșit și consumă memorie până la epuizare: `list` cere valori până la `StopIteration`, care nu vine niciodată.
Varianta greșită B: Ar fi adevărat fără `islice`; aici sunt cerute doar trei valori.
Varianta greșită C: `n` crește înainte de `yield`, deci prima valoare e 1.
Varianta greșită D: `islice` nu cere lungime; lucrează cu orice iterator.

### pt-11
Pe scurt: Testul trece doar dacă `parse_port` aruncă `ValueError` cu un mesaj în care se găsește „port”.
Scop: Testezi și calea de eroare, nu doar cazul fericit, cu o aserțiune precisă.
Mecanism: `pytest.raises` prinde excepția din bloc și verifică tipul (inclusiv subclase). `match` aplică `re.search` pe `str(excepție)`. Dacă blocul nu aruncă, sau aruncă alt tip, testul pică.
Pas cu pas:
```text
bloc aruncă ValueError("bad port")
  -> tip ok, re.search("port") ok
  -> trece
nu aruncă -> Failed: DID NOT RAISE
alt tip -> excepția se propagă
```
Aplicare:
```python
with pytest.raises(ValueError) as e:
    parse_port("abc")
assert e.value.args
```
Legătură: E echivalentul lui `assertRaisesRegex` din `unittest`, pe care îl știi din testele Django.
Limită: `match` e o expresie regulată: caractere ca `+`, `*`, `?` sau `[` din textul căutat schimbă sensul tiparului, deci le escapezi cu `re.escape`.
La interviu: „Cu `pytest.raises(Tip, match=...)` verific și tipul, și mesajul excepției; testul pică dacă blocul nu aruncă. `match` e regex, căutat cu `re.search`.”
Verificare: Mesajul e „expected host+port”, iar `match="host+port"`. Trece testul?
Răspuns verificare: Nu: `+` e cuantificator, deci tiparul caută „host” lipit de „port” (cu unul sau mai mulți „t”) și nu găsește „host+port”. Cu `match=re.escape("host+port")` trece.
Varianta greșită B: Doar `ValueError` și subclasele lui sunt acceptate; alt tip de excepție se propagă și testul pică.
Varianta greșită C: Dacă blocul nu aruncă, pytest raportează „DID NOT RAISE”.
Varianta greșită D: `match` folosește `re.search`, deci ajunge ca „port” să apară undeva în mesaj.

### pt-12
Pe scurt: Testul pică: pytest nu rulează singur corutinele și cere un plugin async (pytest-asyncio sau anyio).
Scop: Știi să rulezi teste pentru cod async și de ce o suită „verde” poate ascunde teste nerulate.
Mecanism: Funcția `async def` întoarce o corutină; fără un plugin care s-o ruleze într-o buclă, nimeni n-o așteaptă. Din pytest 8.4, un astfel de test e marcat ca eșuat, nu doar sărit.
Pas cu pas:
```text
async def test_x(): ...
pytest fără plugin:
  < 8.4: sărit + warning
  >= 8.4: FAILED
  (not natively supported)
cu anyio: @pytest.mark.anyio
```
Aplicare:
```python
@pytest.mark.anyio
async def test_alert():
    assert await notify() is True
```
Legătură: Documentația FastAPI folosește `@pytest.mark.anyio` pentru teste async, cu clientul async din httpx.
Limită: pytest-asyncio rulează implicit în mod `strict`: fiecare test async are nevoie de marcaj (`@pytest.mark.asyncio`), dacă nu configurezi altfel.
La interviu: „pytest e sincron; pentru teste `async def` folosesc pytest-asyncio sau anyio. Fără plugin, pytest recent marchează testul ca eșuat; versiunile vechi doar îl săreau, ceea ce ascundea teste.”
Verificare: De ce era periculos comportamentul vechi, în care testul era doar sărit?
Răspuns verificare: Suita părea verde, deși testele async nu rulaseră niciodată.
Varianta greșită B: pytest nu are o buclă de evenimente proprie; ai nevoie de plugin.
Varianta greșită C: Așa era înainte de pytest 8.4; acum testul pică explicit.
Varianta greșită D: O corutină nerulată nu execută nimic; nu există un mod sincron care să ignore `await`.

### pt-13
Pe scurt: 6: decoratoarele `parametrize` suprapuse fac produsul cartezian al valorilor (3 × 2).
Scop: Acoperi combinații de intrări fără să scrii teste duplicate.
Mecanism: Fiecare decorator adaugă o dimensiune. pytest generează câte un test pentru fiecare combinație și îi dă un ID, de exemplu `test_grid[x-1]`.
Pas cu pas:
```text
a: 1, 2, 3
b: x, y
teste: (1,x) (1,y) (2,x)
       (2,y) (3,x) (3,y) = 6
```
Aplicare:
```python
CASES = [(0, []), (3, [[1, 2, 3]])]

@pytest.mark.parametrize(
    "n, out", CASES)
def test_chunks(n, out): ...
```
Legătură: E echivalentul lui `subTest` din `unittest`, dar fiecare combinație apare ca test separat în raport.
Limită: Produsul crește repede (4 parametri × 5 valori = 625 de teste). Pentru combinații alese, folosești o singură listă de tupluri.
La interviu: „`parametrize` rulează același test pe mai multe intrări; două decoratoare suprapuse fac produsul cartezian. Pentru cazuri de margine pun o listă de tupluri, cu `ids` lizibile.”
Verificare: Cum rulezi doar combinațiile (1, „x”) și (3, „y”), fără produs?
Răspuns verificare: Un singur `parametrize("a, b", [(1, "x"), (3, "y")])`, cu o listă de tupluri.
Varianta greșită B: Valorile se înmulțesc, nu se adună.
Varianta greșită C: Ar fi doar parametrul `a`; al doilea decorator înmulțește cu 2.
Varianta greșită D: Ar fi doar parametrul `b`; primul decorator înmulțește cu 3.

### pt-14
Pe scurt: Fixture-ul `tmp_path`: un director temporar nou, unic pentru fiecare test, ca `pathlib.Path`.
Scop: Testezi codul care scrie fișiere fără ca testele să se calce între ele sau să murdărească proiectul.
Mecanism: pytest creează pentru fiecare test un director sub un director de bază temporar și ți-l dă ca `Path`. Directoarele vechi sunt păstrate doar pentru ultimele rulări, ca să poți inspecta un eșec.
Pas cu pas:
```text
test_a(tmp_path) -> .../test_a0/
test_b(tmp_path) -> .../test_b0/
write_report(tmp_path / "r.txt")
assert (tmp_path / "r.txt").exists()
```
Aplicare:
```python
def test_report(tmp_path):
    out = tmp_path / "r.txt"
    write_report(out)
    assert "CRIT" in out.read_text()
```
Legătură: Același tip de izolare ca rollback-ul per test pentru baza de date.
Limită: Codul testat trebuie să primească drumul ca parametru. Dacă scrie la un drum fix, întâi îl refactorizezi.
La interviu: „Pentru fișiere folosesc `tmp_path`: fiecare test are directorul lui, deci testele nu se influențează și pot rula în paralel. Codul primește drumul ca parametru.”
Verificare: De ce un fișier fix, `/tmp/report.txt`, strică testele rulate în paralel (`pytest -n 4`)?
Răspuns verificare: Toate testele scriu și citesc același fișier în același timp, deci rezultatul depinde de ordine.
Varianta greșită B: Un drum fix e partajat între teste și rulări și poate rămâne de la un test eșuat.
Varianta greșită C: Un mock pe `open` testează apelurile, nu conținutul real, și se strică la orice schimbare de implementare.
Varianta greșită D: Curățenia de mână nu rulează dacă testul pică la jumătate.

### pt-15
Pe scurt: Stare partajată între teste (DB, variabile globale, fixture cu scope larg) care face rezultatul să depindă de ordine.
Scop: Diagnostichezi testele dependente de ordine, care fac CI-ul instabil.
Mecanism: Un test anterior lasă ceva în urmă: un rând în DB, un singleton modificat, un mock nedesfăcut, un fișier. Testul tău trece pe stare curată și pică pe starea lăsată de altul.
Pas cu pas:
```text
test_a: inserează alerta X
  (fără rollback)
test_b: assert len(alerts) == 1
singur: 1 -> trece
după test_a: 2 -> pică
```
Aplicare: Rollback per test pentru DB, fixture-uri cu scope `function` pentru starea mutabilă, `monkeypatch` în loc de modificări manuale ale globalelor.
Legătură: În Django, `TestCase` face rollback după fiecare test; cu SQLAlchemy construiești singur o fixture cu tranzacție.
Limită: pytest-randomly (ordine aleatoare) scoate la iveală astfel de dependențe, dar nu le repară.
La interviu: „Un test care trece singur și pică în suită depinde de starea lăsată de alt test. Izolez: rollback pe DB după fiecare test, fixture-uri cu scope `function`, `monkeypatch` pentru globale.”
Verificare: Cum găsești testul care lasă stare în urmă?
Răspuns verificare: Rulezi suita în ordini diferite (pytest-randomly) sau prin bisecție: rulezi testul tău după jumătăți din suită până găsești vinovatul.
Varianta greșită B: pytest rulează implicit secvențial; paralelismul cere pytest-xdist.
Varianta greșită C: pytest nu păstrează rezultatele de la o rulare la alta (cache-ul reține doar ce a eșuat, pentru `--lf`).
Varianta greșită D: Durata nu schimbă rezultatul unei aserțiuni; ordinea și starea, da.

### asgi-12
Pe scurt: În `lifespan`: creezi clientul înainte de `yield` (la pornire) și îl închizi după `yield` (la oprire).
Scop: Gestionezi corect resursele partajate (client HTTP, pool DB, modele încărcate) pe durata aplicației.
Mecanism: Dai lui `FastAPI(lifespan=...)` un `@asynccontextmanager`. Codul de dinainte de `yield` rulează o dată, înainte de prima cerere; cel de după `yield`, la oprire. Resursa o pui pe `app.state` sau o expui printr-o dependență.
Pas cu pas:
```text
pornire: lifespan -> client creat
  yield -> aplicația servește
oprire: după yield
  -> await client.aclose()
```
Aplicare:
```python
@asynccontextmanager
async def lifespan(app):
    app.state.http = AsyncClient()
    yield
    await app.state.http.aclose()
```
Legătură: E echivalentul unui `with` în jurul întregii vieți a aplicației; în Django ar fi cod în `AppConfig.ready()`, fără o parte de oprire.
Limită: Cu mai mulți workeri Gunicorn sau Uvicorn, fiecare proces își rulează propriul `lifespan`, deci are propriul client și propriul pool.
La interviu: „Resursele partajate le creez în `lifespan`: înainte de `yield` la pornire, după `yield` la oprire. `on_event` e depreciat. Fiecare worker are instanța lui.”
Verificare: De ce e o idee proastă un `AsyncClient` nou la fiecare cerere?
Răspuns verificare: Pierzi pool-ul de conexiuni și keep-alive: fiecare cerere deschide conexiuni și face handshake TLS din nou, iar clientul trebuie închis de fiecare dată.
Varianta greșită B: Un client pe cerere pierde reutilizarea conexiunilor și costă un handshake la fiecare cerere.
Varianta greșită C: Un client creat la import nu e închis niciodată și e creat chiar și când doar importi modulul, de exemplu în teste.
Varianta greșită D: `on_event("startup")` e depreciat în favoarea lui `lifespan`, iar Starlette 1.0 l-a eliminat.

### asgi-13
Pe scurt: Rulează funcția după trimiterea răspunsului, în același proces; dacă procesul moare, sarcina se pierde.
Scop: Alegi corect între `BackgroundTasks`, un task asyncio și o coadă reală.
Mecanism: FastAPI trimite răspunsul, apoi rulează sarcinile adăugate cu `add_task` în același worker: cele `async` pe buclă, cele `def` în threadpool. Nu există persistență, retry sau vizibilitate.
Pas cu pas:
```text
handler: t.add_task(send_email)
răspuns trimis clientului
apoi: send_email() în același proces
restart în acest moment
  -> email pierdut
```
Aplicare: Bun pentru lucruri mici, pe care le poți pierde: un log de audit secundar, o invalidare de cache.
Legătură: Pentru lucru important sau lung (scanări, alerte), Celery cu RabbitMQ: coadă durabilă, retry, workeri separați.
Limită: O sarcină grea rulată astfel ocupă workerul care servește cereri: CPU, threadpool sau buclă.
La interviu: „`BackgroundTasks` rulează după răspuns, în același proces, fără coadă și fără retry. Îl folosesc pentru lucruri mici; tot ce nu are voie să se piardă merge în Celery.”
Verificare: O alertă de securitate trebuie trimisă sigur, chiar dacă podul se repornește. Ce folosești?
Răspuns verificare: O coadă durabilă: publici mesajul în RabbitMQ (sau un task Celery cu `acks_late`) și răspunzi; un worker separat îl procesează, cu retry și idempotență.
Varianta greșită B: Nu există coadă: sarcina trăiește doar în memoria procesului.
Varianta greșită C: Sarcina rulează în același proces, pe buclă sau în threadpool.
Varianta greșită D: Răspunsul pleacă înainte ca sarcina să ruleze; asta e chiar ideea.

### asgi-14
Pe scurt: Endpoint-urile care cer `Depends(get_db)` primesc `fake_db`, fără nicio schimbare în codul lor.
Scop: Testezi API-ul cu dependențe false (DB de test, client extern fals, utilizator autentificat).
Mecanism: La fiecare cerere, FastAPI rezolvă dependențele și caută întâi în `app.dependency_overrides`. Dacă găsește cheia `get_db`, apelează înlocuitorul în loc de funcția reală.
Pas cu pas:
```text
overrides[get_db] = lambda: fake
GET /alerts -> Depends(get_db)
  -> găsit în overrides
  -> endpoint primește fake
după test: overrides.clear()
```
Aplicare:
```python
@pytest.fixture
def client():
    ov = app.dependency_overrides
    ov[get_db] = lambda: fake_db
    yield TestClient(app)
    ov.clear()
```
Legătură: E dependency injection, același principiu ca un `ScanJob` care primește notificatorul în constructor.
Limită: Dicționarul e pe obiectul `app`, comun tuturor testelor: dacă nu îl golești, un override rămâne activ în testele următoare.
La interviu: „În teste înlocuiesc dependențele cu `app.dependency_overrides`: endpoint-ul rămâne neschimbat, iar eu controlez DB-ul sau clientul extern. Golesc dicționarul după fiecare test.”
Verificare: Cum simulezi un utilizator autentificat într-un test, fără tokenuri reale?
Răspuns verificare: Faci override pe dependența de autentificare (de exemplu `get_current_user`) cu o funcție care întoarce un utilizator de test.
Varianta greșită B: Override-ul acționează doar în rezolvarea dependențelor FastAPI; un apel direct `get_db()` din alt cod rămâne cel real.
Varianta greșită C: Endpoint-ul primește valoarea întoarsă de înlocuitor, adică `fake_db`, nu `None`.
Varianta greșită D: Nu se pornește nimic: e doar o înlocuire de funcție.

### asgi-15
Pe scurt: Clientul primește doar `{"id": 1}`: `response_model` validează valoarea întoarsă și scoate câmpurile care nu sunt în model.
Scop: Controlezi exact ce iese din API, ca să nu expui câmpuri interne (parole, note, ID-uri interne).
Mecanism: FastAPI trece rezultatul funcției prin modelul de răspuns: îl validează (un câmp obligatoriu lipsă dă eroare de server) și serializează doar câmpurile declarate.
Pas cu pas:
```text
funcția: {"id": 1, "secret": "x"}
response_model=AlertOut (id)
  -> validează id
  -> scoate secret
client: {"id": 1}
```
Aplicare: Ai modele separate pentru intrare și ieșire, de exemplu `AlertIn` (ce poate trimite clientul) și `AlertOut` (ce vede), plus modelul ORM intern.
Legătură: E rolul serializer-elor din DRF: `fields` controlează ce câmpuri pleacă în răspuns.
Limită: Dacă funcția întoarce ceva care nu se potrivește modelului (un câmp obligatoriu lipsă), primești o eroare 500, nu 422: problema e a serverului.
La interviu: „Folosesc `response_model` ca să controlez ce iese: FastAPI validează și filtrează rezultatul, deci câmpurile interne nu ajung la client. Modelele de intrare și de ieșire sunt separate.”
Verificare: Funcția întoarce `{"secret": "x"}`, fără `id`. Ce primește clientul?
Răspuns verificare: Eroare de server (500): rezultatul nu respectă `AlertOut`, iar problema e în codul serverului, nu în cererea clientului.
Varianta greșită B: `response_model` are efect la runtime: filtrează și validează, nu doar documentează.
Varianta greșită C: Câmpurile în plus sunt scoase, nu provoacă eroare; iar 422 e pentru cererile invalide.
Varianta greșită D: Un dict cu câmpurile potrivite e acceptat și convertit; nu trebuie să fie deja o instanță `AlertOut`.

### asgi-16
Pe scurt: O dată: FastAPI păstrează rezultatul unei dependențe pe durata cererii și îl dă tuturor celor care o cer.
Scop: Știi că sub-dependențele care cer aceeași sesiune lucrează în aceeași tranzacție.
Mecanism: La rezolvarea arborelui de dependențe, FastAPI ține un cache per cerere, după funcție. A doua cerere a lui `get_db` primește aceeași valoare. Cu `use_cache=False` dependența rulează din nou.
Pas cu pas:
```text
endpoint -> repo(Depends(get_db))
         -> svc(Depends(get_db))
get_db rulează o dată
repo și svc: aceeași sesiune
use_cache=False -> două sesiuni
```
Aplicare: Un `repo` și un `audit` care scriu în aceeași cerere folosesc aceeași sesiune, deci un singur commit, atomic.
Legătură: Similar cu o sesiune per request în Django: tot codul din cerere vede aceeași conexiune și aceeași tranzacție.
Limită: Cache-ul ține doar o cerere; între cereri, dependența rulează din nou (ce vrei pentru o sesiune DB).
La interviu: „O dependență e calculată o singură dată pe cerere și refolosită în tot arborele, deci toată cererea lucrează cu aceeași sesiune. Dacă vreau instanțe separate, pun `use_cache=False`.”
Verificare: Ai nevoie de o a doua sesiune, independentă, pentru un log de audit care trebuie salvat chiar dacă tranzacția principală face rollback. Ce faci?
Răspuns verificare: Ceri dependența cu `use_cache=False` sau o dependență separată, care deschide propria sesiune și face commit separat.
Varianta greșită B: Ar fi adevărat doar cu `use_cache=False`. Implicit, rezultatul e refolosit în cerere.
Varianta greșită C: Endpoint-ul nu cere direct `get_db`, iar chiar dacă ar cere-o, ar primi aceeași valoare din cache.
Varianta greșită D: Cache-ul ține o cerere, nu toată aplicația; fiecare cerere primește sesiunea ei.

### asgi-17
Pe scurt: 403 Forbidden. Serverul știe cine e userul, dar refuză accesul la tenant.
Scop: Codul corect îi spune clientului ce să facă: la 401 se autentifică din nou, la 403 n-are rost să reîncerce.
Mecanism: 401 înseamnă că lipsesc credențiale valide: token absent, expirat sau cu semnătură greșită. RFC 9110 cere atunci headerul `WWW-Authenticate`, care spune cum să se autentifice. 403 înseamnă că serverul a înțeles cererea și știe cine o face, dar o refuză. Un frontend tratează diferit cele două: la 401 face refresh la token sau login, la 403 arată „n-ai acces”.
Pas cu pas:
```text
fără token / token expirat
  -> 401 + WWW-Authenticate
token valid, tenant străin
  -> 403
token valid, acces permis
  -> 200
```
Aplicare:
```python
def require_tenant(
    tenant_id: str,
    user=Depends(current_user),
):
    if tenant_id not in user.tenants:
        raise HTTPException(403)
    return user
```
Legătură: E diferența dintre autentificare și autorizare de la Keycloak (SEC-03, SEC-04): JWT-ul valid rezolvă autentificarea, rolurile și tenantul rezolvă autorizarea.
Limită: Unele API-uri întorc 404 în loc de 403, ca să nu confirme că resursa există (de exemplu un repository privat). E o alegere de securitate, nu o regulă HTTP.
La interviu: „401 când lipsesc credențiale valide, cu `WWW-Authenticate`; 403 când știu cine e userul, dar n-are voie. La resurse sensibile pot întoarce 404, ca să nu confirm că există.”
Verificare: Tokenul a expirat cu o secundă înainte de cerere. Ce status primești?
Răspuns verificare: 401: credențialele nu mai sunt valide. Clientul face refresh la token și reîncearcă.
Varianta greșită B: 401 e pentru credențiale lipsă sau invalide. Aici tokenul e valid, deci problema e de autorizare.
Varianta greșită C: 422 e pentru un body care nu trece validarea. Cererea e corectă; doar accesul e refuzat.
Varianta greșită D: 409 descrie un conflict cu starea resursei, de exemplu un duplicat. Nu are legătură cu drepturile userului.

### asgi-18
Pe scurt: GET, HEAD, OPTIONS și TRACE (safe), plus PUT și DELETE. POST și PATCH nu sunt idempotente.
Scop: Clienții HTTP, proxy-urile și load balancerele reîncearcă automat doar metodele idempotente. Dacă un endpoint încalcă semantica, un retry poate dubla efecte.
Mecanism: „Safe” înseamnă că cererea nu schimbă starea serverului. „Idempotent” înseamnă că N cereri identice au același efect ca una. `PUT /alerts/7` cu același body lasă resursa la fel, iar un al doilea `DELETE` găsește resursa deja ștearsă. POST creează ceva nou la fiecare apel, iar PATCH poate fi relativ („adaugă 1”), deci nu sunt idempotente.
Pas cu pas:
```text
safe: GET HEAD OPTIONS TRACE
idempotent: safe + PUT DELETE
neidempotent: POST PATCH
PUT x3 -> resursa = body
POST x3 -> 3 resurse noi
```
Aplicare:
```python
@app.put("/alerts/{id}/status")
def set_status(id: int, s: Status):
    # setezi, nu incrementezi:
    # sigur la retry
    store.set_status(id, s.value)
```
Legătură: E idempotența din DES-08 și din task-urile Celery (CEL-03), aplicată la nivel de HTTP.
Limită: Idempotent se referă la efectul pe server, nu la răspuns: al doilea `DELETE` poate întoarce 404, iar efectul (resursa ștearsă) e același. Și e o promisiune a implementării: un `PUT` scris greșit poate să nu fie idempotent.
La interviu: „GET, HEAD, OPTIONS sunt safe; PUT și DELETE sunt idempotente; POST și PATCH nu. De aceea un retry automat e sigur pe PUT, iar pe POST am nevoie de o cheie de idempotență.”
Verificare: `DELETE /alerts/7` întoarce 204, iar al doilea, 404. E încă idempotent?
Răspuns verificare: Da. Idempotența privește starea serverului: după ambele cereri, alerta 7 nu există. Răspunsul poate diferi.
Varianta greșită B: POST nu e idempotent: fiecare cerere poate crea o resursă nouă.
Varianta greșită C: Lista e prea scurtă: OPTIONS și TRACE sunt safe, iar PUT și DELETE sunt idempotente fără să fie safe.
Varianta greșită D: Tranzacțiile fac o cerere atomică, dar nu împiedică a doua cerere să creeze încă o resursă.

### asgi-19
Pe scurt: Doar dacă API-ul acceptă o cheie de idempotență. Fără ea, un retry poate crea o a doua alertă.
Scop: Timeout-ul e cel mai ambiguu rezultat: cererea poate să fi eșuat sau să fi reușit fără ca răspunsul să ajungă. Codul de retry trebuie să fie sigur în ambele cazuri.
Mecanism: Clientul generează o cheie unică (UUID) pentru operație și o trimite în `Idempotency-Key`. Serverul ține `cheie → răspuns`. La prima cerere execută și salvează răspunsul; la un retry cu aceeași cheie întoarce răspunsul salvat, fără să creeze din nou. Aceeași cheie cu alt body e o greșeală a clientului (409 sau 422).
Pas cu pas:
```text
POST + key=abc -> creează #7
  răspunsul se pierde (timeout)
POST + key=abc (retry)
  -> serverul vede abc
  -> întoarce #7, fără duplicat
```
Aplicare:
```python
seen = store.by_key.get(key)
if seen:
    return seen.response
alert = store.create(body)
store.by_key[key] = Saved(body, alert)
```
Legătură: Exact exercițiul k13. În bază, cheia primește o constrângere unică, ca la inserturile idempotente din SQA-09.
Limită: Două cereri cu aceeași cheie pot ajunge simultan pe workeri diferiți. Verificarea „există cheia?” urmată de insert nu ajunge: ai nevoie de o constrângere unică sau de un lock. Cheile se păstrează doar o perioadă (de exemplu 24 h).
La interviu: „POST nu e idempotent, deci la timeout nu reîncerc orbește. Clientul trimite un `Idempotency-Key`, serverul ține cheia cu răspunsul, iar un retry primește același rezultat. În bază pun o constrângere unică pe cheie, pentru cereri simultane.”
Verificare: Clientul reîncearcă cu aceeași cheie, dar cu alt body. Ce faci?
Răspuns verificare: Refuzi (de obicei 409 sau 422): cheia identifică o operație deja făcută, iar un body diferit înseamnă o greșeală a clientului.
Varianta greșită B: RFC 9110 nu definește POST ca idempotent. Fiecare cerere poate crea o resursă nouă.
Varianta greșită C: Timpul scurs nu schimbă nimic: serverul poate să fi creat deja alerta în primele milisecunde.
Varianta greșită D: Se poate reîncerca în siguranță, cu condiția ca serverul să deduplice după cheie.

### asgi-20
Pe scurt: 409 Conflict. Cererea e corectă, dar intră în conflict cu starea curentă a resursei.
Scop: Clientul trebuie să poată deosebi „ai trimis date greșite” (corectezi cererea) de „datele sunt bune, dar resursa există deja” (o folosești pe cea existentă).
Mecanism: 422 Unprocessable Content înseamnă că body-ul e bine format, dar conținutul nu trece regulile de validare; FastAPI îl întoarce automat când Pydantic respinge datele. 409 Conflict înseamnă că cererea ar fi validă, dar contrazice starea serverului: un duplicat, o versiune veche (optimistic locking), o tranziție de stare interzisă.
Pas cu pas:
```text
body fără rule_id -> 422 (Pydantic)
JSON stricat      -> 422 la FastAPI
                     (400 în altele)
external_id există -> 409
versiune veche     -> 409 (sau 412)
```
Aplicare:
```python
try:
    db.add(Alert(**body.model_dump()))
    db.commit()
except IntegrityError:
    db.rollback()
    raise HTTPException(409,
        "external_id există deja")
```
Legătură: 422 e răspunsul automat din ASGI-08. 409 apare natural când o constrângere unică din Postgres respinge un insert (SQA-09).
Limită: Granița nu e strictă între API-uri: unele întorc 400 pentru orice eroare de client. Contează să fii consecvent și să documentezi codurile în OpenAPI.
La interviu: „422 când body-ul nu trece validarea, ceea ce FastAPI face automat; 409 când datele sunt bune, dar intră în conflict cu starea resursei, de exemplu un duplicat prins de o constrângere unică.”
Verificare: Doi useri editează aceeași alertă; al doilea trimite o versiune mai veche. Ce cod întorci?
Răspuns verificare: 409 Conflict (sau 412 Precondition Failed, dacă versiunea vine în `If-Match`): cererea contrazice starea curentă.
Varianta greșită B: 422 e pentru conținut invalid. Aici body-ul trece validarea; problema e starea serverului.
Varianta greșită C: 400 e o eroare generală de client. Există un cod mai precis pentru conflictul cu starea resursei.
Varianta greșită D: 500 înseamnă că serverul a greșit. Un duplicat e un caz așteptat, pe care îl raportezi clientului.

### pt-16
Pe scurt: De 4 ori. Fiecare worker xdist e un proces separat, cu sesiunea lui, deci fixture-ul de sesiune rulează o dată în fiecare.
Scop: Suitele mari se rulează în paralel ca să încapă în CI. Dacă presupui că fixture-ul de sesiune rulează o singură dată, workerii își calcă unul altuia datele.
Mecanism: `pytest -n 4` pornește patru procese (`gw0` … `gw3`). Fiecare colectează testele și primește un subset de la procesul principal. Scope-ul `session` e relativ la proces: fiecare worker creează și distruge propria instanță. Dacă fixture-ul creează aceeași bază sau aceleași înregistrări, workerii intră în conflict.
Pas cu pas:
```text
pytest -n 4
  gw0: session fixture -> create_db
  gw1: session fixture -> create_db
  gw2: session fixture -> create_db
  gw3: session fixture -> create_db
fix: o bază per worker
  test_db_gw0, test_db_gw1, ...
```
Aplicare:
```python
@pytest.fixture(scope="session")
def db_url(worker_id):
    # worker_id: "gw0"… sau "master"
    name = f"test_{worker_id}"
    create_database(name)
    yield f"postgresql:///{name}"
    drop_database(name)
```
Legătură: E aceeași idee ca la workerii Celery sau Gunicorn: procese separate nu împart memoria (GIL-01), deci starea comună trebuie izolată sau mutată într-un loc partajat.
Limită: Fixture-ul se creează doar în workerii care primesc un test care îl cere, deci „de 4 ori” e maximul. Când vrei o singură creare (un container scump), documentația xdist recomandă un lock pe fișier (`filelock`).
La interviu: „Sub xdist, fiecare worker are sesiunea lui, deci fixture-ul de sesiune rulează în fiecare proces. Izolez datele după `worker_id`, de exemplu o bază per worker, sau folosesc un lock pe fișier dacă resursa trebuie creată o singură dată.”
Verificare: Două teste pe workeri diferiți creează amândouă userul `admin`. Ce se întâmplă și cum eviți?
Răspuns verificare: Al doilea insert poate pica pe constrângerea unică sau testele își schimbă datele unul altuia. Generezi date unice per test (factories, sufix aleator) sau izolezi baza per worker.
Varianta greșită B: Asta s-ar întâmpla fără xdist. Cu `-n 4` există patru sesiuni, una pe proces.
Varianta greșită C: Scope-ul `function` rulează per test. `session` rulează o dată per proces.
Varianta greșită D: xdist nu ignoră fixture-urile de sesiune; le rulează în fiecare worker.

### pt-17
Pe scurt: `is_visible()` verifică o singură dată, imediat. Dacă toast-ul apare după 2,1 s, testul pică. `expect(...).to_be_visible()` reîncearcă până la timeout (5 s implicit).
Scop: Testele UI instabile sunt cea mai scumpă problemă dintr-o suită E2E: oamenii încetează să mai creadă în ele. `sleep` e cauza clasică.
Mecanism: Acțiunile Playwright (`click`, `fill`) așteaptă singure ca elementul să fie vizibil, stabil și activ. Aserțiile web-first (`expect(locator)`) reîncearcă până se îndeplinește condiția sau expiră timeout-ul. Metodele care întorc o valoare (`is_visible`, `inner_text`) nu așteaptă: dau starea din acel moment, deci rezultatul depinde de viteza aplicației.
Pas cu pas:
```text
click -> așteaptă butonul, apasă
sleep(2) -> pierzi 2 s mereu
is_visible() -> o singură privire
  toast la 2,1 s -> False -> pică
expect(...).to_be_visible()
  verifică repetat până la 5 s
  toast la 2,1 s -> trece
```
Aplicare:
```python
from playwright.sync_api import expect

page.get_by_role(
    "button", name="Salvează").click()
expect(page.get_by_role("status")
       ).to_be_visible()
```
Legătură: E aceeași idee ca `findBy` din Testing Library (FE-09): aștepți o condiție, nu un timp fix. Și ca la k14: un timeout pe condiție, nu un `sleep`.
Limită: `expect` nu repară o aplicație lentă. Dacă un ecran durează constant 8 s, mărești timeout-ul doar pentru aserția respectivă (`timeout=10_000`) și investighezi de ce e lent.
La interviu: „`is_visible()` nu așteaptă, iar `sleep` doar ghicește. Folosesc aserțiile web-first, `expect(locator).to_be_visible()`, care reîncearcă până la timeout, și locatori după rol. Fără `sleep` în teste.”
Verificare: Cum verifici că un spinner a dispărut după încărcare?
Răspuns verificare: `expect(spinner).to_be_hidden()`: reîncearcă până dispare. Un `assert not spinner.is_visible()` ar putea trece prea devreme, înainte să apară spinnerul.
Varianta greșită B: Un `sleep` mai lung face testul mai lent și tot nu garantează nimic pe un CI încărcat.
Varianta greșită C: `click()` așteaptă deja singur ca butonul să fie vizibil și activ; un `sleep` în plus doar încetinește.
Varianta greșită D: Viteza selectorului nu e problema. Problema e că aserția nu așteaptă; XPath ar face selectorul și mai fragil.
