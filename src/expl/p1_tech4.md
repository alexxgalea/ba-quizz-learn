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
