<!-- Desfășurările fișei `pytest` (13 puncte). Format și reguli: lib.mjs (checkDesf), .scratch/desfasurari/spec.md. Faptele: research/interview-facts.md, secțiunile 6, 11, 16 și 24. -->

### harta
Problema: Un test bun e rapid, determinist și izolat. Dar codul real atinge baza de date, ceasul, rețeaua, Celery și browserul, iar fiecare dintre ele face testul lent, instabil sau dependent de ordine. Fără reguli, suita crește până când nimeni nu mai are încredere în ea. Modulul răspunde la patru întrebări: cum scrii și organizezi testele, cum izolezi dependențele, cum rulezi suita repede și cum construiești un framework de teste, inclusiv pentru UI.

Grupuri:
- 1–4: cum scrii și organizezi testele (assert, fixture-uri, `conftest.py`, parametrizare)
- 5–6: uneltele care izolează codul (`raises`, `monkeypatch`, `tmp_path`, `caplog`, mock-uri)
- 7–9: dependențele reale: baza de date, Celery, timpul
- 10–11: cum rulezi suita repede (opțiuni, paralel cu xdist)
- 12–13: framework-ul de teste și testele UI (straturi, configurare, Playwright)

### 1
Problema: Un test pică în CI doar cu „AssertionError”. Nu vezi ce valoare a întors funcția, așa că deschizi codul și pui `print`-uri.
Ideea: Un test e o funcție `test_*` dintr-un fișier `test_*.py`. Pytest le găsește singur. Verifici cu `assert` simplu, fără `self.assertEqual`. Pytest rescrie `assert`-urile la import, deci un eșec arată valorile din expresie.
Exemplu:
```text
def test_f():
>       assert f(2) == 5
E       assert 4 == 5
E        +  where 4 = f(2)
```
Legătură: Un `TestCase` din Django folosește `self.assertEqual`; în pytest scrii doar `assert`.

### 2
Greu: da
Problema: Zece teste au nevoie de aceeași conexiune la baza de test. Pe fiecare o deschizi și o închizi de mână. Când un test pică la mijloc, conexiunea rămâne deschisă.
Ideea: Fixture-ul e o funcție cu `@pytest.fixture`. Testul îl cere prin numele unui parametru, iar pytest îl rulează înainte și îi dă valoarea. Codul de după `yield` e teardown și rulează și când testul pică. Pytest face `next` pe generator pentru setup și încă un `next` pentru teardown. Exemplul imită asta cu un generator. Scope-ul decide cât trăiește valoarea: `function` (implicit), `class`, `module`, `package`, `session`.
Exemplu:
```python
def db():
    print("setup")
    yield "conn"
    print("teardown")
g = db()
v = next(g)  # → setup
print(v)  # → conn
for _ in g: pass  # → teardown
```
În C++: GoogleTest folosește o clasă derivată din `testing::Test`, cu `SetUp()` și `TearDown()`, și `TEST_F`. Pentru fiecare test creează un obiect nou, cheamă `SetUp()`, rulează testul, cheamă `TearDown()` și șterge obiectul.
Unde nu ține: În C++ merg și constructorul și destructorul (RAII), iar `TearDown()` e opțional. În pytest nu moștenești nimic: testul cere fixture-ul după nume, iar un fixture poate cere altul. Scope-ul mai larg ca un test apare în GoogleTest ca `SetUpTestSuite()`, static, o dată per suită.
Legătură: PT-01 și PT-02. Un container Postgres de 5 s cere scope `session`.

### 3
Problema: Trei fișiere de test au nevoie de fixture-ul `client`. Îl copiezi în fiecare sau îl imporți, iar importul pare neutilizat, fiindcă fixture-ul apare doar ca nume de parametru.
Ideea: `conftest.py` e un plugin local al directorului. Pytest îl încarcă singur. Fixture-urile de acolo se văd în testele din director și din subdirectoare, fără import. Un `conftest.py` mai adânc poate redefini un fixture, iar cel mai apropiat de test câștigă.
Exemplu:
```text
tests/
  conftest.py  [client: root]
  test_api.py  -> root
  sub/
    conftest.py [client: sub]
    test_d.py   -> sub
```
Legătură: PT-05. Un fixture partajat de multe fișiere (PT-02) stă de obicei aici.

### 4
Greu: da
Problema: Ai 12 reguli de detecție, fiecare cu o intrare și un rezultat. Scrii 12 funcții aproape identice. Sau pui o buclă `for` într-un singur test, unde primul caz picat oprește restul.
Ideea: `@pytest.mark.parametrize("n", [1, 2, 3])` rulează același test pentru fiecare valoare. Fiecare caz e un test separat în raport, cu id din valori. Un caz picat nu le oprește pe celelalte. Decoratorii stivuiți dau produsul cartezian. `pytest.param(..., id="...")` pune un nume lizibil.
Exemplu:
```python
from pytest import mark
@mark.parametrize("n", [1, 2, 3])
def test_p(n):
    assert n < 3
```
```text
test_p[1] PASSED
test_p[2] PASSED
test_p[3] FAILED
```
În C++: GoogleTest are teste cu parametri: o clasă `testing::TestWithParam<T>`, testul `TEST_P` și `INSTANTIATE_TEST_SUITE_P(Nume, Clasa, testing::Values(1, 2, 3))`, care generează câte un test per valoare.
Unde nu ține: Lista de valori stă într-o instanțiere separată, iar testul citește valoarea cu `GetParam()`. În pytest decoratorul stă pe funcție, iar valoarea e argument. Numele din GoogleTest sunt generate cu index (`Nume/Clasa.Test/0`), cele din pytest vin din valori (`test_p[1]`).
Legătură: PT-04 și PT-13. Două `parametrize` pe același test (3 × 2 valori) dau 6 teste.

### 5
Greu: da
Problema: Testezi o funcție care citește `API_KEY` din mediu și un fișier de config, loghează un avertisment și ridică o eroare la config invalid. Fără unelte scrii `try`/`except`, atingi `os.environ` global și lași fișiere în `/tmp`.
Ideea: `pytest.raises(Exc, match="...")` verifică excepția, iar `match` caută cu `re.search` în mesaj. `monkeypatch` schimbă atribute sau variabile de mediu și le anulează la sfârșitul testului. `tmp_path` e un director temporar unic pentru fiecare test. `caplog` prinde mesajele de log.
Exemplu:
```python
import os, pytest as pt
with pt.raises(KeyError, match="a"):
    {}["a"]
with pt.MonkeyPatch.context() as m:
    m.setenv("MOD", "ok")
    print(os.getenv("MOD"))  # → ok
print(os.getenv("MOD"))  # → None
```
Legătură: PT-06, PT-11 și PT-14. În exemplu, `MonkeyPatch.context()` face ce face fixture-ul `monkeypatch` pe durata unui test.

### 6
Greu: da
Problema: `alerts.py` face `from notify import send_email`. În test faci `patch("notify.send_email")`, dar funcția trimite tot emailul real.
Ideea: `patch` înlocuiește un nume, deci îl patch-uiești unde e căutat, nu unde e definit: aici `alerts.send_email`. `autospec=True` copiază semnătura originalului, deci un apel cu argumente greșite ridică `TypeError`. `side_effect` cu o excepție o ridică la apel. `side_effect` cu o listă întoarce valorile pe rând.
Exemplu:
```python
import unittest.mock as um
def charge(amount): ...
m = um.create_autospec(charge)
m.side_effect = [1, ValueError]
print(m(5))  # → 1
m(1, 2)  # ! TypeError
```
În C++: Fără patch la rulare, o dependență se înlocuiește prin design: o interfață cu metode `virtual`, pe care testul o implementează cu un mock (gMock: `MOCK_METHOD`, `EXPECT_CALL`).
Unde nu ține: În Python `patch` schimbă un nume la rulare, fără să atingi codul testat. În C++ o dependență se înlocuiește de obicei prin design: interfață sau șablon. Iar `EXPECT_CALL` se setează înainte de apel, pe când mock-ul din Python notează apelurile, iar tu le verifici după.
Legătură: PT-03, PT-07 și PT-10. PT-03 e exact cazul din Problemă: patch-ul se pune la numele din modulul care folosește funcția.

### 7
Greu: da
Problema: Testele trec pe SQLite și pică pe Postgres în producție, fiindcă tipurile, funcțiile SQL și blocările diferă. Iar fiecare test lasă rânduri, deci următorul vede date străine.
Ideea: Rulezi testele pe același motor ca în producție: Postgres real, ca service în CI sau în Docker, cu `testcontainers`. Izolezi testele cu tranzacție și rollback: fixture-ul deschide tranzacția, testul lucrează, teardown-ul face rollback. Dacă codul testat face `commit()`, sesiunea se leagă de tranzacția externă cu un SAVEPOINT (`create_savepoint`). `factory_boy` construiește datele cu valori implicite, pe care le schimbi doar unde contează.
Exemplu:
```python
import sqlite3  # doar pt. rollback
c = sqlite3.connect(":memory:")
c.execute("create table t(x)")
c.commit()
c.execute("insert into t values(1)")
c.rollback()
n = c.execute("select * from t")
print(n.fetchall())  # → []
```
Legătură: PT-01 și PT-02. Exemplul folosește sqlite3 doar ca să arate rollback-ul, nu ca alternativă la Postgres. În Django, `TestCase` face același lucru: învelește fiecare test într-un `atomic()` anulat la final.

### 8
Problema: Testezi un task Celery care trimite un email. Cu `.delay()` testul cere broker și worker. Cu `task_always_eager` nu mai testezi nimic din ce se întâmplă prin broker.
Ideea: Un task e o funcție Python: o poți chema direct. Cu `task_always_eager = True`, `.delay()` rulează local, în același proces, fără broker. Docs: e doar o emulare a unui worker, bună pentru unit teste. Pentru integrare pornești un worker real și un broker de test.
Exemplu:
```python
from celery import Celery
app = Celery()
@app.task
def add(a, b): return a + b
print(add(2, 3))  # → 5
app.conf.task_always_eager = True
print(add.delay(2, 3).get())  # → 5
```
Legătură: PT-08. Ce nu testează modul eager (broker, worker, redelivery) e exact ce prinde testul de integrare.

### 9
Greu: da
Problema: Testezi un token care expiră în 15 minute. Ca să-l vezi expirat, ar trebui să aștepți 15 minute. Sau pui `sleep(1)` ca să aștepți un worker, iar testul pică din când în când pe un CI lent.
Ideea: Nu aștepți timpul real, îl controlezi. Cu freezegun sau time-machine ceasul stă pe loc sau sare înainte. Mai simplu, injectezi ceasul: funcția primește ora, iar testul îi dă ora dorită. Pentru sincronizare nu folosești `sleep`: aștepți condiția, cu timeout, sau un eveniment.
Exemplu:
```python
def expired(t0, now, ttl=900):
    return now - t0 >= ttl
print(expired(0, 899))  # → False
print(expired(0, 900))  # → True
```
În C++: O funcție care cheamă direct `std::chrono::steady_clock::now()` nu se testează fără să aștepți. Cu ceasul ca parametru de șablon (`template <class Clock>`), testul pasează un ceas fals, cu un `now()` pe care îl controlezi.
Unde nu ține: În C++ ceasul trebuie injectat prin design. În Python, freezegun și time-machine înlocuiesc ceasul global la rulare, fără să schimbi funcția. Un ceas injectat merge totuși la fel de bine în Python.
Legătură: PT-09 și punctul 13: același principiu, `sleep` nu e sincronizare.

### 10
Greu: da
Problema: Suita rulează 8 minute. Un test pică, iar tu rulezi din nou tot. Alte teste sunt lente și vrei să le sari cât lucrezi.
Ideea: `-x` oprește la primul eșec. `-k expr` alege testele după nume. `--lf` rulează doar testele picate data trecută. `-m "not slow"` sare testele marcate `slow`. `-n auto` (pytest-xdist) le rulează în paralel, pe procese. `pytest-cov` măsoară acoperirea, cu `--cov`.
Exemplu:
```text
pytest -x -k login --lf
pytest -m "not slow" -n auto
pytest --cov=app
```
Legătură: PT-16 pentru `-n`. Markerul `slow` îl înregistrezi în config; fără asta primești `PytestUnknownMarkWarning`.

### 11
Problema: Rulezi cu `-n 4`. Fixture-ul `session` care creează baza de test rulează de patru ori, iar patru procese scriu în aceeași bază și își strică datele.
Ideea: xdist pornește workeri ca procese separate, `gw0`, `gw1` și așa mai departe. Fiecare face propria colectare. Deci un fixture `scope="session"` rulează o dată pe worker, nu o dată în total. Fixture-ul `worker_id` îți dă numele workerului (`master`, fără paralelizare). Izolezi datele după el: o bază sau o scheamă pe worker.
Exemplu:
```python
def db_name(worker_id):
    return f"test_{worker_id}"
print(db_name("gw0"))  # → test_gw0
print(db_name("gw1"))  # → test_gw1
```
Legătură: PT-16 și GIL-13. Procese separate, ca la `ProcessPoolExecutor`: nu împart memoria.

### 12
Greu: da
Problema: Echipa de QA are 400 de teste UI, iar fiecare repetă pașii de login. Când se schimbă un buton, repari 400 de teste. URL-ul de staging e scris în cod, deci nu le poți rula local.
Ideea: Separi straturile: teste (ce verifici), pași de domeniu (ce face utilizatorul), clienți API sau page objects, drivere (browser, HTTP). O schimbare de detaliu ajunge într-un singur strat. Mediul vine din configurare: `pytest_addoption` adaugă `--env`, citit printr-un fixture. Datele vin din factories și se curăță în teardown, după `yield`. În CI scoți un raport JUnit cu `--junitxml`.
Exemplu:
```text
def pytest_addoption(parser):
    parser.addoption(
        "--env", default="local")
@pytest.fixture
def base_url(request):
    env = request.config.getoption(
        "--env")
    return URLS[env]
```
Legătură: PT-05 pentru `conftest.py`. Rolul din anunț (RO-1186) cere un framework de teste, nu doar teste.

### 13
Greu: da
Problema: Un test UI apasă „Salvează”, pune `sleep(2)` și verifică mesajul. Local trece. Pe un CI mai lent pică din când în când.
Ideea: Cauți elementele după rol, cum le vede utilizatorul: `get_by_role("button", name="Salvează")`. Acțiunile (`click`, `fill`) așteaptă singure ca elementul să fie gata. `expect(locator)` reîncearcă până trece sau expiră (5 s implicit). `is_visible()` nu așteaptă, deci nu faci `assert` pe el și nu pui `sleep`.
Exemplu:
```text
b = page.get_by_role(
    "button", name="Salvează")
b.click()
t = page.get_by_text("Salvat")
expect(t).to_be_visible()
assert t.is_visible()  # NU
```
Legătură: PT-17 și punctul 9: `sleep` nu e sincronizare, ci o ghicire.
