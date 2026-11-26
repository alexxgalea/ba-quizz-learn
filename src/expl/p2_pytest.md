<!-- pytest și testare. Variantele greșite: B, C, D = ordinea din sursă (A e cea corectă). -->

### pt-01
Pe scurt: Fixture-ul face setup înainte de `yield`, dă sesiunea testului, apoi face teardown (rollback și close) după test, chiar dacă testul pică.
Scop: Fiecare test pornește curat și nu lasă urme, deci testele nu depind unele de altele și pot rula în orice ordine.
Mecanism: pytest rulează fixture-ul până la `yield` și injectează valoarea în parametrul `db_session` al testului. După test, indiferent de rezultat, reia generatorul: codul de după `yield` face rollback, deci datele scrise de test dispar, apoi închide sesiunea.
Pas cu pas:
```text
pytest: db_session() până la yield
test_create_alert(db_session)
  (trece sau pică)
pytest: rollback + close
următorul test: sesiune curată
```
Aplicare:
```python
def test_create_alert(db_session):
    db_session.add(Alert(title="x"))
    db_session.flush()
    assert db_session.query(Alert).count() == 1
```
Legătură: E același tipar ca dependența FastAPI cu `yield` (ASGI-07) și ca un context manager: setup, valoare, cleanup.
Limită: Rollback-ul curăță doar ce a trecut prin această sesiune. Dacă codul testat face `commit` sau deschide altă conexiune, datele rămân; atunci folosești savepoint-uri sau cureți explicit tabelele.
La interviu: „Un fixture cu `yield` face setup înainte, injectează valoarea în test și face teardown după, chiar dacă testul pică. Pentru DB folosesc o tranzacție cu rollback per test, ca testele să fie izolate.”
Verificare: Testul aruncă o excepție la jumătate. Se mai face rollback?
Răspuns verificare: Da: pytest rulează partea de după `yield` indiferent de rezultatul testului, inclusiv la excepție.
Varianta greșită B: Testul primește direct valoarea de la `yield`, adică sesiunea, nu generatorul. De iterare se ocupă pytest.
Varianta greșită C: Fixture-ul rulează o singură dată pe test: partea dinainte de `yield` înainte de test, partea de după, după test.
Varianta greșită D: Scope-ul implicit e `function`, deci teardown-ul rulează după fiecare test, nu o singură dată după toate. Altfel testele ar împărți aceeași sesiune și și-ar vedea datele.

### pt-02
Pe scurt: Scope `session`: containerul pornește o singură dată pentru toată rularea, iar izolarea datelor o face un fixture separat, per test, cu rollback.
Scop: 300 × 5 s înseamnă 25 de minute doar pentru containere. Cu scope `session`, plătești 5 s o singură dată.
Mecanism: Scope-ul spune cât trăiește un fixture: `function` (implicit, unul nou pentru fiecare test), `class`, `module`, `package` sau `session` (o dată pe rulare). `engine`, cu scope `session`, e creat la primul test care îl cere și distrus la final. `db_session`, cu scope `function`, deschide pe același engine o tranzacție nouă pentru fiecare test.
Pas cu pas:
```text
scope function: 300 × 5 s = 25 min
scope session: 1 × 5 s
  engine (session): o singură dată
  db_session (function): per test,
    cu rollback
```
Aplicare:
```python
@pytest.fixture(scope="session")
def engine():
    with PostgresContainer("postgres:16") as pg:
        eng = create_engine(pg.get_connection_url())
        Base.metadata.create_all(eng)
        yield eng
```
Legătură: E ce face și runner-ul de teste din Django: creează baza de test o singură dată, iar `TestCase` pune fiecare test într-o tranzacție anulată la final.
Limită: Un fixture cu scope mare nu poate depinde de unul cu scope mai mic: `engine` (session) nu poate cere `db_session` (function). Iar starea pusă în fixture-uri cu scope mare (date inserate, mock-uri) trece de la un test la altul.
La interviu: „Resursele scumpe, fără stare per test, cum e containerul DB, le fac cu scope `session`. Izolarea o fac separat: o sesiune per test, cu rollback la final.”
Verificare: Pui și `db_session` pe scope `session`, ca să meargă mai repede. Ce riști?
Răspuns verificare: Toate testele împart aceeași sesiune și aceleași date: un test vede ce a scris altul, iar rezultatul depinde de ordinea rulării.
Varianta greșită B: Cu scope `function` pornești 300 de containere: 25 de minute doar de setup, fără niciun câștig de izolare față de rollback-ul per test.
Varianta greșită C: Scope `class` ar porni containerul pentru fiecare clasă de teste: mai bine decât per test, dar tot repetat inutil.
Varianta greșită D: Fixture-ul nu e legat de un singur test: cu `scope` poate trăi pe `class`, `module`, `package` sau `session`.

### pt-03
Pe scurt: `patch("app.alerts.send_email")`: înlocuiești numele în modulul unde e folosit, pentru că `raise_alert` caută `send_email` în `app.alerts`.
Scop: E cea mai frecventă greșeală cu `mock.patch`: patch-ul pare corect, dar funcția reală tot rulează și trimite emailuri reale din teste.
Mecanism: `from app.notify import send_email` copiază, la import, referința la funcție într-un nume nou din `app.alerts`. La rulare, `raise_alert` caută `send_email` în propriul modul. Un patch pe `app.notify.send_email` schimbă doar numele din `app.notify`, iar cel din `app.alerts` arată în continuare spre funcția reală.
Pas cu pas:
```text
app.notify.send_email -> funcția reală
app.alerts.send_email -> aceeași funcție
patch("app.notify.send_email")
  -> în app.alerts: tot cea reală
patch("app.alerts.send_email")
  -> raise_alert folosește mock-ul
```
Aplicare:
```python
def test_raise_alert_sends_email():
    with patch("app.alerts.send_email") as m:
        raise_alert(alert)
    m.assert_called_once_with(alert.owner,
                              alert.title)
```
Legătură: E consecința directă a faptului că, în Python, numele sunt doar referințe (PY-07): ai două nume care arată spre același obiect, iar patch-ul îl schimbă doar pe unul.
Limită: Dacă modulul ar face `import app.notify` și ar apela `app.notify.send_email(...)`, patch-ul corect ar fi `app.notify.send_email`. Regula e mereu aceeași: patch-uiești acolo unde e căutat numele.
La interviu: „Patch-uiesc numele acolo unde e căutat la runtime, nu unde e definit. Cu `from app.notify import send_email`, numele trăiește în `app.alerts`, deci patch-ul e `app.alerts.send_email`.”
Verificare: `app/alerts.py` face `import app.notify` și apelează `app.notify.send_email(...)`. Ce patch folosești acum?
Răspuns verificare: `patch("app.notify.send_email")`: acum codul caută atributul în modulul `app.notify`, la fiecare apel.
Varianta greșită B: Patch-ul în `app.notify` schimbă numele de acolo, dar `app.alerts` și-a copiat referința la import, deci apelează tot funcția reală.
Varianta greșită C: `patch` cere calea completă, cu modulul: `send_email` singur nu spune ce nume, din ce modul, trebuie înlocuit.
Varianta greșită D: Poți patch-ui și `smtplib.SMTP`, dar e mai departe de ce testezi și te leagă de detaliile din interiorul lui `send_email`. Varianta directă e `app.alerts.send_email`.

### pt-04
Pe scurt: `@pytest.mark.parametrize` rulează același test pe mai multe seturi de argumente, fiecare raportat ca test separat.
Scop: Testezi multe cazuri (linii de log, valori limită) fără să copiezi testul, iar la eșec vezi exact ce caz a picat.
Mecanism: pytest generează câte un test pentru fiecare set de valori, cu id-ul lui (`test_rule[root-fail]`). Dacă un caz pică, celelalte rulează în continuare și sunt raportate separat.
Pas cu pas:
```text
cazuri: ("failed login for root", True)
        ("login ok for ana", False)
-> test_rule[root-fail] -> trece
-> test_rule[ok] -> pică
fiecare caz, raportat separat
```
Aplicare:
```python
@pytest.mark.parametrize("line, expected", [
    ("failed login for root", True),
    ("login ok for ana", False),
], ids=["root-fail", "ok"])
def test_rule(line, expected):
    assert rule.matches(line) is expected
```
Legătură: E ideea de table-driven tests: datele de test stau într-un tabel, separat de logica testului.
Limită: Prea multe cazuri într-un singur test parametrizat devin greu de citit, așa că le grupezi pe comportamente. Iar parametrize nu generează date: pentru valori aleatorii, cu cazuri limită găsite automat, există Hypothesis.
La interviu: „`parametrize` rulează același test pe mai multe seturi de argumente, fiecare raportat separat. Îl folosesc pentru reguli de detecție: aceeași funcție, multe linii de log, fiecare cu verdictul așteptat, cu `ids=` lizibile.”
Verificare: Ai 20 de cazuri într-un singur test, scrise ca o buclă `for` cu `assert` înăuntru. Ce pierzi față de parametrize?
Răspuns verificare: La primul `assert` eșuat bucla se oprește, deci nu știi câte alte cazuri ar fi picat, iar raportul arată un singur test, nu cazul exact.
Varianta greșită B: Rularea în paralel o face pluginul pytest-xdist (`-n auto`). parametrize doar înmulțește cazurile.
Varianta greșită C: Pentru testele lente folosești un marker propriu, de exemplu `@pytest.mark.slow`, pe care îl excluzi cu `-m "not slow"`.
Varianta greșită D: parametrize folosește exact valorile pe care i le dai. Date aleatorii generează biblioteci ca Hypothesis.

### pt-05
Pe scurt: În `conftest.py`: pytest îl descoperă automat, iar fixture-urile din el sunt disponibile testelor din același director și din subdirectoare, fără import.
Scop: Fixture-urile comune (engine, sesiune DB, client HTTP de test) stau într-un singur loc, iar testele doar le cer ca parametri.
Mecanism: La colectare, pytest încarcă fiecare `conftest.py` aflat pe drumul spre fișierele de test. Fixture-urile definite acolo sunt vizibile în directorul respectiv și mai jos. Un `conftest.py` dintr-un subdirector poate redefini un fixture cu același nume, doar pentru testele de acolo.
Pas cu pas:
```text
tests/conftest.py: engine, db_session
tests/api/conftest.py: client
tests/api/test_alerts.py
  -> engine, db_session, client
tests/unit/test_rules.py
  -> engine, db_session
```
Aplicare: Pui fixture-urile globale (engine, sesiune) în rădăcina directorului de teste, iar pe cele specifice (clientul API, datele unui modul) în subdirectoare.
Legătură: E o convenție de nume, ca `manage.py` sau `settings.py` în Django: unealta știe singură unde să se uite.
Limită: Nu importi niciodată din `conftest.py` în teste: pytest îl încarcă singur, iar un import manual poate dubla fixture-urile. Prea multe fixture-uri globale fac și testele greu de urmărit.
La interviu: „Fixture-urile comune le pun în `conftest.py`: pytest îl descoperă automat, fără import, iar fixture-urile se văd în directorul lui și în subdirectoare.”
Verificare: Ai un fixture `client` în `tests/api/conftest.py`. Îl poate folosi un test din `tests/unit/`?
Răspuns verificare: Nu: fixture-urile dintr-un `conftest.py` se văd doar în directorul lui și mai jos. Îl muți în `tests/conftest.py` dacă e nevoie de el peste tot.
Varianta greșită B: `__init__.py` marchează un pachet Python. pytest nu caută fixture-uri acolo.
Varianta greșită C: `setup.py` descrie pachetul pentru instalare și n-are legătură cu fixture-urile.
Varianta greșită D: Importul explicit poate funcționa, dar nu e singura variantă și nici cea recomandată: `conftest.py` face asta automat.

### pt-06
Pe scurt: Folosești fixture-ul `monkeypatch`: `monkeypatch.setenv("API_KEY", "test")` setează variabila doar pe durata testului și o restaurează automat la final.
Scop: Testele nu trebuie să lase urme: o variabilă de mediu schimbată de un test și nerestaurată poate strica, în tăcere, testele următoare.
Mecanism: `monkeypatch` ține minte fiecare modificare (variabile de mediu, atribute, chei de dict) și o anulează la teardown, inclusiv când testul pică. Funcția testată citește normal `os.environ` și găsește valoarea de test.
Pas cu pas:
```text
setenv("API_KEY", "test")
funcția citește API_KEY -> "test"
teardown -> API_KEY revine cum era
  (sau dispare, dacă nu exista)
```
Aplicare:
```python
def test_client_uses_key(monkeypatch):
    monkeypatch.setenv("API_KEY", "test")
    assert build_client().key == "test"

def test_missing_key(monkeypatch):
    monkeypatch.delenv("API_KEY", raising=False)
    with pytest.raises(KeyError):
        build_client()
```
Legătură: E ca `override_settings` din Django: schimbi configurarea doar pentru un test, iar ea revine automat la final.
Limită: Dacă valoarea e citită o singură dată, la importul modulului (`API_KEY = os.environ[...]` la nivel de modul), `setenv` din test vine prea târziu. Soluția mai curată: citești configurarea într-un obiect `Settings` (pydantic-settings) pe care îl injectezi.
La interviu: „Folosesc `monkeypatch.setenv`, care restaurează automat variabila la teardown. Și mai bine, citesc configurarea într-un obiect Settings injectat, ca în teste să-l pot înlocui direct.”
Verificare: Modulul tău are la nivel de modul `API_KEY = os.environ["API_KEY"]`, iar testul face `monkeypatch.setenv` înainte de apel. De ce vezi tot valoarea veche?
Răspuns verificare: Valoarea a fost citită o singură dată, la importul modulului, înaintea testului. Patch-uiești constanta (`monkeypatch.setattr("app.config.API_KEY", "test")`) sau muți citirea într-o funcție ori într-un obiect Settings.
Varianta greșită B: Testul ar depinde de mașina pe care rulează: pe alt laptop sau pe alt runner de CI pică fără motiv aparent.
Varianta greșită C: Fără restaurare, modificarea rămâne pentru testele următoare, care trec sau pică în funcție de ordine.
Varianta greșită D: Se poate, cu `monkeypatch`, fără nicio schimbare în funcție. Un obiect de configurare injectat ar face testul și mai simplu.

### pt-07
Pe scurt: `side_effect` controlează ce face mock-ul la fiecare apel: aruncă o excepție, întoarce valori diferite la apeluri succesive sau rulează o funcție a ta.
Scop: Testezi drumurile grele: retry-uri, erori de rețea, comportamente care se schimbă de la un apel la altul.
Mecanism: Dacă `side_effect` e o excepție, fiecare apel o aruncă. Dacă e o listă, fiecare apel ia următorul element: excepțiile sunt aruncate, valorile sunt întoarse. Dacă e o funcție, e apelată cu aceleași argumente, iar rezultatul ei devine rezultatul mock-ului.
Pas cu pas:
```text
side_effect = [ConnectionError(),
               {"ok": True}]
apel 1 -> aruncă ConnectionError
apel 2 -> întoarce {"ok": True}
apel 3 -> StopIteration (lista s-a terminat)
```
Aplicare:
```python
def test_fetch_retries_once():
    with patch("app.client.http_get", side_effect=[
            ConnectionError(), {"ok": True}]) as get:
        assert fetch_status() == {"ok": True}
    assert get.call_count == 2
```
Legătură: E exact ce îți trebuie ca să testezi retry-ul din Celery (CEL-04): primul apel eșuează cu `ConnectionError`, al doilea reușește.
Limită: Când lista se termină, următorul apel aruncă `StopIteration`. Iar dacă setezi și `return_value`, are prioritate `side_effect`.
La interviu: „`side_effect` controlează comportamentul la apel: o excepție, o listă de rezultate succesive sau o funcție. O folosesc ca să testez retry-ul: primul apel aruncă `ConnectionError`, al doilea reușește.”
Verificare: Vrei ca mock-ul să întoarcă dublul argumentului primit. Cum faci?
Răspuns verificare: `m.side_effect = lambda x: x * 2`: funcția primește argumentele apelului, iar mock-ul întoarce rezultatul ei.
Varianta greșită B: Ca să apelezi funcția reală și să înregistrezi apelurile folosești `wraps=`. Tehnic, `side_effect` poate primi orice funcție, inclusiv pe cea reală, dar nu ăsta e rolul lui tipic.
Varianta greșită C: Numărul de apeluri îl ai oricum, în `call_count` și `call_args_list`, fără `side_effect`.
Varianta greșită D: Pentru funcții async folosești `AsyncMock`, iar `patch` îl alege singur când ținta e async. `side_effect` merge și acolo, dar nu el face mock-ul asincron.

### pt-08
Pe scurt: `task_always_eager=True` rulează task-ul direct în procesul testului, ca pe o funcție, deci ocolește brokerul, workerul și ack-urile.
Scop: Un test de integrare trebuie să prindă exact problemele de pe drumul real: rutare greșită pe cozi, ack-uri, redelivery după căderea unui worker, comportamentul la retry.
Mecanism: În modul eager, `.delay()` nu publică nimic: apelează imediat funcția task-ului, în același proces, și întoarce un rezultat deja calculat. Argumentele trec totuși printr-o rundă de serializare (`dumps` și `loads`, verificat pe Celery 5.6), deci un obiect ORM crapă și în modul eager. Nu există însă coadă, worker sau ack.
Pas cu pas:
```text
producție: delay -> JSON -> broker
  -> worker -> execută -> ack
eager: delay -> JSON dumps/loads
  -> execută pe loc
  (fără broker, worker, ack)
```
Aplicare: Pentru logică apelezi direct funcția task-ului (`generate_report(42)`) sau folosești eager. Pentru integrare pornești un worker real în test, cu `celery.contrib.testing.worker.start_worker(app)` sau cu fixture-urile din `celery.contrib.pytest`, și un broker în Docker.
Legătură: Ai văzut la CEL-06 de ce contează serializarea argumentelor: un obiect ORM crapă la `.delay()`, chiar și în modul eager.
Limită: Eager rămâne util pentru unit teste rapide pe logica task-ului. Doar că nu dovedește nimic despre integrare: pentru asta îți trebuie un worker real.
La interviu: „`task_always_eager` rulează task-ul sincron, în proces, deci ocolește brokerul, workerul și ack-urile. Îl folosesc pentru logică; pentru integrare pornesc un worker real în test, cu brokerul în Docker.”
Verificare: Un task Celery e testat doar cu `task_always_eager=True` și testul trece. Ce a rămas neverificat?
Răspuns verificare: Drumul prin broker și worker: rutarea pe cozi, ack-urile, redelivery-ul după căderea unui worker, retry-urile reale. De aceea, pentru integrare, pornești un worker real.
Varianta greșită B: Eager e mai rapid, nu mai lent: rulează direct, fără rețea. Problema e că testează mai puțin.
Varianta greșită C: Eager nu folosește deloc brokerul, deci nu are nevoie de RabbitMQ pornit.
Varianta greșită D: Eager execută task-ul pe loc, în procesul testului, și îi întoarce rezultatul. Problema e că sare peste brokerul și workerul reale.

### pt-09
Pe scurt: `time.sleep(2)` face testul lent și instabil (flaky), pentru că pe un runner CI încărcat jobul poate dura mai mult. Aștepți o condiție, cu timeout, sau controlezi ceasul.
Scop: Testele care pică aleator subminează încrederea în CI: echipa începe să le ignore sau să le re-ruleze până trec.
Mecanism: Un `sleep` fix presupune că jobul termină într-un anumit timp. Pe laptop termină în 0,5 s, deci aștepți degeaba 1,5 s; pe CI poate dura 3 s, deci testul pică deși codul e corect. Așteptarea unei condiții verifică repetat rezultatul și continuă imediat ce e gata, cu un timeout generos ca limită.
Pas cu pas:
```text
sleep(2):
  laptop 0,5 s -> 1,5 s pierdute
  CI 3 s -> test picat, fals
wait_until(cond, timeout=10):
  laptop -> gata la ~0,5 s
  CI -> gata la ~3 s, trece
```
Aplicare:
```python
def wait_until(cond, timeout=10, step=0.05):
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        if cond():
            return
        time.sleep(step)
    raise AssertionError("condiție neîndeplinită")
```
Pentru logică dependentă de timp (expirări, TTL) folosești freezegun sau time-machine, ori un ceas injectat.
Legătură: E aceeași idee ca la polling-ul statusului unui job (CEL-01): verifici starea, nu ghicești cât durează.
Limită: Timeout-ul trebuie ales generos, iar condiția trebuie să fie exact rezultatul așteptat, nu un efect secundar care poate apărea mai devreme.
La interviu: „Un `sleep` fix face testul lent și flaky. Aștept explicit o condiție, cu timeout, iar pentru logica dependentă de timp folosesc freezegun sau un ceas injectat.”
Verificare: Testezi că o sesiune expiră după 30 de minute. Aștepți 30 de minute în test?
Răspuns verificare: Nu: controlezi timpul, cu freezegun sau cu un ceas injectat, avansezi instant 30 de minute și verifici expirarea.
Varianta greșită B: 2 secunde pot ajunge pe laptop și pot fi prea puține pe un runner CI încărcat, deci testul devine flaky.
Varianta greșită C: pytest nu interzice `sleep`. Testul rulează, doar că e lent și instabil.
Varianta greșită D: Cu pytest-xdist, testele rulează în procese separate, iar un `sleep` nu le blochează pe celelalte. Problema e timpul pierdut și instabilitatea.

### pt-10
Pe scurt: Cu `autospec=True`, mock-ul copiază semnătura obiectului real: un apel cu argumente greșite sau un atribut inexistent pică testul.
Scop: Fără autospec, testele cu mock pot trece în timp ce codul real ar crăpa, de exemplu după ce cineva schimbă semnătura funcției.
Mecanism: Un `MagicMock` simplu acceptă orice apel și creează orice atribut ceri. Cu `autospec=True`, `patch` construiește mock-ul după obiectul real: verifică numărul și numele argumentelor la fiecare apel și permite doar atributele care există.
Pas cu pas:
```text
reală: send_email(to, subject)
cod: send_email(alert.owner)
  (lipsește subject)
MagicMock simplu -> testul trece
autospec=True -> TypeError, testul pică
```
Aplicare:
```python
with patch("app.alerts.send_email",
           autospec=True) as m:
    raise_alert(alert)
m.assert_called_once_with(alert.owner,
                          alert.title)
```
Legătură: E ca un type checker pentru mock-uri: mypy prinde apelul greșit în cod, autospec îl prinde în test.
Limită: Autospec creează mock-ul mai lent și nu vede atributele setate dinamic pe instanțe, în `__init__`. Pe acelea le configurezi manual.
La interviu: „`autospec=True` face mock-ul să respecte semnătura obiectului real, deci un apel cu argumente greșite pică testul. Fără el, un MagicMock acceptă orice, iar testul trece deși codul real ar crăpa.”
Verificare: Cineva adaugă un argument obligatoriu `priority` la `send_email`, dar uită să actualizeze apelul din `raise_alert`. Ce face testul fără autospec? Dar cu autospec?
Răspuns verificare: Fără autospec trece, pentru că MagicMock acceptă orice apel. Cu autospec pică cu `TypeError`, exact cum ar pica și codul în producție.
Varianta greșită B: Autospec nu creează mock-uri pentru tot modulul: se aplică doar obiectului pe care îl patch-uiești.
Varianta greșită C: Autospec nu rulează testul de mai multe ori: construiește un singur mock, după specificația obiectului real.
Varianta greșită D: Mock-ul rămâne activ pe toată durata patch-ului. Autospec doar verifică apelurile, nu le limitează numărul.

### pt-18
Pe scurt: Testul automat repetă exact aceeași verificare la fiecare schimbare, în secunde. Așa prinde regresiile: ce mergea și s-a stricat după un commit.
Scop: Verificarea de mână se face o dată, apoi se uită. Codul se schimbă zilnic, deci fără repetare automată afli de regresie de la client.
Mecanism: Testul fixează un comportament („`parse("1.2.2026")` întoarce `(2026, 2, 1)`”). La fiecare rulare, mașina îl verifică din nou, identic. Dacă o schimbare îl strică, testul pică imediat, lângă commit-ul vinovat, când contextul e încă proaspăt.
Pas cu pas:
```text
azi: repari parserul, testul trece
peste 2 săptămâni: alt fix
  testul vechi rulează din nou
  formatul cu puncte pică -> roșu
afli acum, nu de la client
```
Legătură: E punctul 1 al fișei. În aplicația asta, `validate.mjs` și testele din `tools/` sunt plasa: o grilă stricată nu ajunge publicată.
Limită: Testele arată prezența unui bug pe cazurile alese, nu absența lui pe toate. Cât de bine prind depinde de cazurile pe care le scrii (punctul 3).
La interviu: „Testez ca să pot schimba codul fără frică: suita repetă identic, la fiecare commit, verificările pe care de mână le-aș face o dată. Așa o regresie apare lângă schimbarea care a produs-o, nu în producție.”
Verificare: Un coleg spune: „Am testat de mână, merge, nu mai trebuie test.” Ce lipsește?
Răspuns verificare: Repetarea. Verificarea de mână e bună azi, dar nu mai rulează la următoarea schimbare. Testul automat rulează de fiecare dată.
Varianta greșită B: Testele verifică doar cazurile scrise. Pe intrările netestate nu afli nimic, deci nu dovedesc corectitudinea.
Varianta greșită C: Testele și review-ul prind lucruri diferite: review-ul vede designul, numele și riscurile pe care niciun test nu le formulează. Unul nu îl înlocuiește pe celălalt.
Varianta greșită D: Testele nu schimbă viteza codului testat; doar îl rulează. Performanța se măsoară separat, cu profilare sau benchmark-uri.

### pt-19
Pe scurt: Muți verificările de logică în jos, în teste unit și de integrare, și păstrezi puține teste E2E, pe fluxurile critice. Asta e piramida testelor.
Scop: O suită de 40 de minute care pică aleator nu mai e crezută și încetinește fiecare merge request. Testele mici rulează în secunde și arată exact unde e problema.
Mecanism: Un test E2E trece prin browser, rețea, API și bază: multe piese, deci lent și cu multe motive să pice fără legătură cu schimbarea. Ce verifică despre parsare sau reguli se poate verifica direct pe funcție (unit) sau pe API cu o bază reală (integrare). E2E rămân pentru ce numai ele dovedesc: că fluxul întreg merge.
Pas cu pas:
```text
300 E2E: 40 min, pică aleator
reguli → unit: 250 teste, 5 s
API + DB → integrare: 40, 1 min
rămân E2E: 10, 3 min
total: sub 5 min, pică rar
```
Legătură: Punctul 2 al fișei și o-pt-4. Pentru testele E2E rămase, punctul 19: fără `sleep`, cu `expect`.
Limită: Proporția exactă se discută: unele echipe pun mai mult accent pe integrare. Regula rămâne: cu cât urci, cu atât mai puține teste.
La interviu: „Aș urma piramida: multe teste unit pe logica de domeniu, teste de integrare pe API cu o bază reală și puține E2E, doar pe fluxurile critice. Așa suita e rapidă, iar când pică știu unde să mă uit.”
Verificare: Ce test pui pentru o regulă de detecție cu 12 cazuri de intrare?
Răspuns verificare: Un test unit parametrizat (punctul 10): 12 cazuri în milisecunde, fără browser și fără bază.
Varianta greșită B: `sleep` face testele și mai lente și nu le face stabile: ghicește un timp, iar pe un CI încărcat ghicește greșit.
Varianta greșită C: Rulate rar, testele E2E prind regresiile după săptămâni, când nu mai știi ce commit le-a produs.
Varianta greșită D: Alt browser nu schimbă nimic important: încetineala și instabilitatea vin din numărul de piese prin care trece fiecare test, nu din browser.

### pt-20
Pe scurt: Testul e legat de implementare: verifică un pas intern (cum e făcut), nu comportamentul (ce iese). Un refactor corect îl strică.
Scop: Testele legate de implementare pică la fiecare refactor, deci devin un cost, nu o plasă. Iar oamenii ajung să le „repare” fără să se uite la ce verifică.
Mecanism: Testul a cerut probabil ca `_normalize` să fie apelată (un mock cu `assert_called_once`). Numele intern nu face parte din contract. Un test bun dă o intrare prin interfața publică și verifică ieșirea sau efectul vizibil, deci supraviețuiește oricărei restructurări care păstrează comportamentul.
Pas cu pas:
```text
test: patch(_normalize)
  assert_called_once
redenumești în _clean
  comportament identic
testul pică: fals pozitiv
fix: assert calc_risk(x) == 87
```
Legătură: Punctul 3 al fișei. Punctul 12 (mock): mock-urile pe detalii interne sunt cauza clasică.
Limită: Uneori interacțiunea chiar e comportamentul: „trimite exact un email”. Acolo verifici apelul, dar la granița cu exteriorul (clientul de email), nu pe o funcție privată.
La interviu: „Testez comportamentul prin interfața publică: intrare, ieșire, efecte vizibile. Mock-uiesc doar la granițe (rețea, email, ceas), nu funcțiile mele interne, ca un refactor să nu strice testele.”
Verificare: Când e corect ca un test să verifice un apel?
Răspuns verificare: Când apelul e efectul cerut și traversează o graniță: emailul trimis, mesajul publicat în coadă. Atunci verifici apelul pe clientul acelei granițe.
Varianta greșită B: Comportamentul public e identic, deci nu e o regresie. Testul a dat o alarmă falsă.
Varianta greșită C: Un test flaky pică aleator pe același cod. Aici pică determinist, din cauza schimbării de nume.
Varianta greșită D: Un fixture care să refacă numele vechi ar ascunde problema: testul ar rămâne legat de implementare.

### pt-21
Pe scurt: Hook-urile stau în `.git/hooks`, care nu se versionează, deci nu vin la `git clone`, iar oricine le sare cu `--no-verify`. Sunt feedback rapid, nu o garanție.
Scop: Poarta reală trebuie să fie un loc pe care nimeni nu-l poate ocoli și care rulează la fel pentru toți: pipeline-ul din CI.
Mecanism: Git rulează scriptul `pre-commit` înainte să creeze commit-ul; dacă iese cu un cod diferit de 0, commit-ul nu se face. Dar directorul de hook-uri e local: fiecare coleg îl instalează (de exemplu cu framework-ul `pre-commit`, config în `.pre-commit-config.yaml`, apoi `pre-commit install`). `git commit --no-verify` și `git push --no-verify` sar hook-urile.
Pas cu pas:
```text
laptop: pre-commit -> lint, unit
  sărit cu --no-verify? se poate
  coleg nou fără install? lipsește
CI: același pipeline pentru toți
  nu se poate sări
```
Legătură: Punctul 4 al fișei. Punctul 16: `-m "not slow"` alege testele care încap într-un hook.
Limită: Un hook lent e sărit des: oamenii pun `--no-verify` din reflex. În hook pui doar ce durează câteva secunde.
La interviu: „Folosesc `pre-commit` pentru formatare, lint și testele rapide, ca să prind problemele în două secunde. Dar e doar confort: hook-urile se pot sări, așa că poarta e pipeline-ul de CI, cu `main` protejat.”
Verificare: Un coleg nou face commit-uri neformatate, deși repo-ul are `.pre-commit-config.yaml`. De ce?
Răspuns verificare: Fișierul de config e în repo, dar hook-ul din `.git/hooks` nu e instalat până nu rulează `pre-commit install`.
Varianta greșită B: `pre-commit` rulează înainte de commit, nu după push. Pentru push există `pre-push`, tot înainte de trimitere.
Varianta greșită C: Git nu ignoră codul de ieșire: o valoare diferită de 0 la `pre-commit` oprește commit-ul.
Varianta greșită D: Hook-urile sunt scripturi executabile și rulează pe orice sistem pe care merge git, deci și pe macOS.

### pt-22
Pe scurt: Blochează merge-ul până când pipeline-ul merge request-ului se termină cu succes. Fără pipeline reușit, butonul de merge nu e disponibil.
Scop: Codul ajunge în `main` doar după ce suita a rulat pe un runner curat, deci `main` rămâne verde și lansabil.
Mecanism: Un push în ramura unui merge request pornește un pipeline (cu regula `$CI_PIPELINE_SOURCE == "merge_request_event"`). Setarea „Pipelines must succeed” din Merge checks cere ca acest pipeline să fi reușit înainte de merge. Un merge request fără niciun pipeline nu se poate îmbina. Pe ramura protejată, doar rolurile permise pot face merge, iar push-ul direct e restrâns.
Pas cu pas:
```text
push în ramura MR
  pipeline: lint, unit, integrare
un job pică -> merge blocat
repari, push din nou
  pipeline verde + review
merge în main
```
Legătură: Punctul 5 al fișei. Sintaxa pipeline-ului e în fișa `ops`, punctul 7 (OBS-06, OBS-07, OBS-08).
Limită: Pipeline-ul unui merge request rulează pe ramura sursă, nu pe rezultatul îmbinării cu `main`. Pentru codul combinat, GitLab are merged results pipelines.
La interviu: „`main` e protejată: merge doar prin merge request, cu pipeline verde și review. Pipeline-ul rulează întâi joburile rapide, ca să pice repede, iar un build roșu pe `main` se repară înaintea oricărui alt lucru.”
Verificare: Cum faci același lucru în GitHub?
Răspuns verificare: O regulă de protecție pe ramură, cu „Require status checks before merging” și check-urile din GitHub Actions marcate obligatorii.
Varianta greșită B: Asta ar fi o verificare după fapt: codul stricat ar fi deja în `main`. Poarta oprește merge-ul înainte.
Varianta greșită C: Pipeline-ul rulează pe runnerii CI, într-un mediu curat, nu pe laptopul cuiva.
Varianta greșită D: Re-rularea automată e altă unealtă (`retry` pe job), folosită pentru eșecuri de infrastructură. Setarea doar cere un pipeline reușit.

### pt-23
Pe scurt: La Continuous Deployment, fiecare schimbare care trece pipeline-ul ajunge automat în producție. La Continuous Delivery ajunge până la „gata de lansare”, iar lansarea e un pas manual.
Scop: Lansările mici și dese au risc mic: când ceva pică, sunt puține schimbări de suspectat, nu 200 de commit-uri.
Mecanism: În amândouă, pipeline-ul construiește artefactul (imaginea Docker) o singură dată și îl duce prin teste și staging. La Delivery, jobul de producție e manual (`when: manual` în GitLab), apăsat de un om. La Deployment, jobul rulează singur după ce tot ce e înainte a trecut.
Pas cu pas:
```text
merge în main -> build imaginea
teste pe imagine -> staging
Delivery: un om apasă -> prod
Deployment: fără buton -> prod
aceeași imagine, în ambele
```
Legătură: Punctul 6 al fișei. Aplicația asta face Continuous Delivery: PR în `main`, iar GitHub Pages servește build-ul nou.
Limită: Continuous Deployment cere teste în care ai încredere deplină, plus metode de a limita impactul (feature flags, lansare treptată, rollback rapid).
La interviu: „Delivery înseamnă că `main` e mereu lansabil, iar producția e un buton. Deployment scoate butonul: fiecare schimbare verde ajunge singură în producție. În ambele imaginea se construiește o dată și se promovează.”
Verificare: De ce nu reconstruiești imaginea pentru producție, după ce a trecut pe staging?
Răspuns verificare: Un build nou poate ieși diferit (alte dependențe, alt compilator). Promovând aceeași imagine, lansezi exact ce ai testat.
Varianta greșită B: Niciuna dintre practici nu renunță la teste. La Deployment ele contează și mai mult, fiindcă sunt singura poartă.
Varianta greșită C: Imaginea se construiește o singură dată și aceeași e promovată; reconstruirea pe mediu e chiar ce evită ambele practici.
Varianta greșită D: Integrarea rară e opusul CI, pe care se sprijină și Delivery, și Deployment.

### pt-24
Pe scurt: Echipa învață să ignore roșul. Când un eșec real apare, arată la fel ca unul aleator, e re-rulat și trece de poartă.
Scop: Poarta din CI valorează cât încrederea în ea. Un singur test flaky tolerat strică încrederea în toată suita.
Mecanism: Testul pică pe același cod din cauze care nu țin de schimbare: timp (`sleep`), ordine între teste, rețea, stare partajată. „Retry până trece” transformă roșul într-un zgomot. Remediul: îl muți în carantină, unde nu mai blochează pipeline-ul și nu e ignorat, și îl repari repede, pornind de la cauză.
Pas cu pas:
```text
test pică 1 din 20, fără schimbări
echipa: Retry până trece
roșul devine zgomot
bug real -> roșu -> Retry -> trece
fix: carantină + cauza reparată
```
Legătură: Punctul 6 al fișei. Cauzele clasice și remediile: punctul 15 (timp) și punctul 19 (`sleep` în UI). Ordinea aleatoare (pytest-randomly) scoate la iveală dependențele dintre teste.
Limită: Carantina e temporară: un test lăsat acolo luni de zile nu mai protejează nimic. Re-rularea automată (`pytest-rerunfailures`) ascunde simptomul, nu repară cauza.
La interviu: „Un test flaky e mai rău decât niciun test: îi învață pe oameni să re-ruleze până trece. Îl pun în carantină, ca să nu blocheze, și caut cauza: de obicei timp, ordine sau stare partajată.”
Verificare: Cum verifici dacă un test depinde de ordinea testelor?
Răspuns verificare: Rulezi suita în ordine aleatoare, cu pytest-randomly, și reproduci un eșec cu aceeași sămânță (`--randomly-seed`).
Varianta greșită B: Durata în plus e reală, dar mică. Problema mare e că roșul nu mai înseamnă nimic.
Varianta greșită C: Runner-ul nu se strică dacă un test rulează de mai multe ori; costul e doar timpul.
Varianta greșită D: Acoperirea măsoară ce linii au rulat, nu de câte ori a fost re-rulat un test.
