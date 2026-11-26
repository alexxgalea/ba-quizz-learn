<!-- Desfășurările fișei `pytest` (19 puncte). Format și reguli: lib.mjs (checkDesf), .scratch/desfasurari/spec.md. Faptele: research/interview-facts.md, secțiunile 6, 11, 16, 24 și 57. Excepție de la regula „punctele nu se reordonează” (hotărârea lui Alex, 26 noiembrie 2026): punctele 1–6 (de ce testăm, nivelurile, git, CI/CD) au fost puse la început, iar vechile 1–13 au devenit 7–19; nicio grilă nu era încă legată de punctele modulului. -->

### harta
Problema: Fără teste, fiecare schimbare e un pariu: afli de bug de la utilizatori, iar refactorizarea devine riscantă. Testele te apără doar dacă rulează automat, la fiecare schimbare, și dacă echipa are încredere în ele. Modulul merge de la de ce la cum: ce testezi la fiecare nivel al codului, unde rulează testele pe drumul unei schimbări prin git, de pe laptop până în producție, apoi uneltele pytest: cum scrii testele, cum izolezi dependențele, cum rulezi suita repede și cum construiești un framework de teste.

Grupuri:
- 1–3: de ce testezi și ce testezi la fiecare nivel al codului (piramida)
- 4–6: unde rulează testele pe drumul prin git: hook-uri locale, CI la merge request, CD până în producție
- 7–10: cum scrii și organizezi testele (assert, fixture-uri, `conftest.py`, parametrizare)
- 11–12: uneltele care izolează codul (`raises`, `monkeypatch`, `tmp_path`, `caplog`, mock-uri)
- 13–15: dependențele reale: baza de date, Celery, timpul
- 16–17: cum rulezi suita repede (opțiuni, paralel cu xdist)
- 18–19: framework-ul de teste și testele UI (straturi, configurare, Playwright)

### 1
Problema: Repari un bug în parserul de date. Peste două săptămâni, un client raportează că formatul cu puncte nu mai merge: nimeni nu l-a reverificat.
Ideea: Un test e o afirmație despre comportament, verificată de mașină la fiecare schimbare. Prinde regresiile, îți dă curaj la refactorizare și spune ce face codul. Un bug prins pe laptop costă un minut, în producție un incident.
Analogie: Lista de verificare a pilotului. Pilotul știe să zboare, dar lista prinde ce sare memoria în grabă.
Legătură: `validate.mjs` și testele din `tools/` opresc o grilă stricată la publicare.
Tablă:
- problema: bug întors după fix
- ideea: verificare repetată; prinde regresii
- analogie: lista pilotului
- punct: plasa schimbării

### 2
Greu: da
Problema: Ai 300 de teste, toate prin browser: login, click, verificare. Suita durează 40 de minute și pică din când în când fără nicio schimbare. Când pică, nu știi dacă e de vină parserul, API-ul sau baza.
Ideea: Testele au niveluri. Unit: o funcție sau o clasă, fără I/O, în milisecunde; când pică, știi exact unde. Integrare: codul tău plus o dependență reală (Postgres, broker, HTTP), în secunde; dovedește că piesele se potrivesc. End-to-end: tot sistemul, cum îl folosește userul; e singurul care dovedește fluxul întreg, dar e lent și fragil. Piramida lui Mike Cohn (2009): multe teste jos, tot mai puține spre vârf. Proporția exactă se discută, dar ideea rămâne: prinzi un bug la nivelul cel mai de jos la care se poate.
Exemplu:
```text
E2E: browser → API → DB
  puține, minute, fragile
integrare: API + Postgres real
  zeci, secunde
unit: parse("1.2.2026")
  sute, milisecunde
```
Legătură: o-pt-4 și punctul 10. În Django, testele pe serializer sunt unit, iar cele cu `APIClient` și baza de test sunt de integrare. Aici, `tools/unit` e baza, iar suitele Playwright din `tools/` sunt E2E.
Tablă:
- problema: 300 teste prin browser
- ideea: unit, integrare, E2E; piramida
- schemă:
```text
unit: o funcție, ms
↓ urci un nivel
integrare: cod + Postgres
↓ urci încă unul
E2E: tot sistemul, minute
↓ cu cât urci
tot mai puține teste
```
- punct: multe jos, puține sus

### 3
Greu: da
Problema: Un test verifică faptul că `calc_risk` cheamă `_normalize` de două ori. Redenumești funcția internă, comportamentul rămâne identic, iar testul pică. Alt test nu atinge pragul: dacă `>=` devine `>`, trece mai departe.
Ideea: Testezi ce vede apelantul: intrarea și ieșirea sau efectul, prin interfața publică, nu pașii interni. Un test are trei părți: pregătești (Arrange), acționezi (Act), verifici (Assert). Alegi cazurile: cel normal, limitele (gol, zero, pragul exact) și erorile. Un bug raportat primește întâi un test care îl reproduce și pică; abia apoi îl repari, iar testul rămâne în suită ca test de regresie. TDD face asta pentru orice cod nou: roșu (testul pică), verde (codul minim), refactor.
Exemplu:
```python
def level(score):
    if score >= 70:
        return "high"
    return "low"
def test_prag():  # limita exactă
    assert level(70) == "high"
    assert level(69) == "low"
test_prag()  # → None
```
Legătură: Punctul 12: un `assert_called_once` pe un detaliu intern leagă testul de implementare. Aplicația asta e scrisă cu TDD: întâi testul la interfață, apoi codul.
Tablă:
- problema: test legat de implementare
- ideea: comportament, nu pași; limite și erori
- schemă:
```text
bug raportat
↓ scrii testul care îl arată
testul pică: roșu
↓ repari codul
testul trece: verde
↓ testul rămâne în suită
regresia nu mai revine
```
- punct: întâi testul care pică

### 4
Greu: da
Problema: Împingi un commit, iar după 10 minute CI-ul pică pe un import nefolosit și pe formatare. Ai pierdut un ciclu întreg pentru ceva ce se vedea în două secunde pe laptop.
Ideea: Git rulează scripturi, numite hook-uri, la anumite momente: `pre-commit` înainte să creeze commit-ul, `pre-push` înainte să trimită. Dacă scriptul iese cu un cod diferit de 0, operația se oprește. Acolo pui verificările de câteva secunde: formatare, lint, testele unit rapide. Dar hook-urile stau în `.git/hooks`, care nu se versionează, deci nu vin la `git clone`. Le distribui cu framework-ul `pre-commit`: config în `.pre-commit-config.yaml`, iar fiecare coleg rulează o dată `pre-commit install`. Și oricine le sare cu `--no-verify`. Deci hook-ul e feedback rapid, nu garanție; garanția e în CI.
Exemplu:
```text
$ cat .git/hooks/pre-commit
#!/bin/sh
pytest -q -m "not slow"
$ git commit -m "fix"  # pică
$ git commit --no-verify  # sare
```
Legătură: Punctul 16: `-m "not slow"` alege ce încape într-un hook. Repo-ul ăsta nu are hook-uri: verificările din CLAUDE.md le rulezi de mână înainte de publicare, exact ce ar automatiza un hook.
Tablă:
- problema: CI pică pe formatare
- ideea: pre-commit, pre-push; --no-verify le sare
- schemă:
```text
git commit
↓ rulează hook-ul pre-commit
lint și teste rapide
↓ ieșire diferită de 0
commit-ul nu se creează
↓ cu --no-verify
hook-ul e sărit
```
- punct: confort, nu garanție

### 5
Greu: da
Problema: Pe laptopul tău testele trec. Colegul face merge, iar `main` nu mai pornește: tu aveai o variabilă de mediu setată local, el avea altă versiune de Python. Nimeni n-a rulat suita pe codul combinat, într-un mediu curat.
Ideea: Continuous Integration înseamnă că fiecare își integrează schimbările des în ramura principală, cel puțin zilnic, iar fiecare integrare e verificată de un build automat, cu teste. Concret: un push într-un merge request pornește pipeline-ul pe un runner curat, cu lint, unit, integrare, apoi E2E; cele rapide întâi, ca să pice repede. Ramura `main` e protejată: merge doar cu pipeline verde și review. În GitLab setarea e „Pipelines must succeed”, în GitHub „required status checks”. Aici `--no-verify` nu ajută. Un build roșu pe `main` se repară înaintea oricărei alte sarcini.
Exemplu:
```text
test:
  stage: test
  image: python:3.14
  script:
    - pytest -m "not slow"
  rules:
    - if: $CI_PIPELINE_SOURCE ==
        "merge_request_event"
```
Legătură: OBS-06 și OBS-07: `artifacts` și `services: postgres` sunt piesele aceluiași pipeline; sintaxa e la fișa `ops`, punctul 7. Aici PR-ul spre `main` e poarta, doar că verificările le rulezi tu, nu un runner.
Tablă:
- problema: merge-ul strică main
- ideea: pipeline la fiecare MR; main protejat
- schemă:
```text
push în merge request
↓ pornește pipeline-ul
lint → unit → integrare
↓ un job pică
merge-ul e blocat
↓ totul verde, plus review
merge în main
```
- punct: poarta: pipeline verde

### 6
Greu: da
Problema: Codul din `main` e verde, dar lansarea se face o dată pe lună, de mână: cineva construiește imaginea pe laptop, o copiază pe server și rulează migrările după o listă. Când ceva pică, sunt 200 de commit-uri suspecte.
Ideea: Continuous Delivery: `main` se poate lansa oricând. Pipeline-ul construiește artefactul (imaginea Docker) și îl duce automat până la staging, iar lansarea în producție e o decizie, un buton. Continuous Deployment merge mai departe: fiecare schimbare care trece pipeline-ul ajunge singură în producție. Imaginea se construiește o singură dată și aceeași e promovată staging → producție, deci lansezi exact ce ai testat. Totul stă pe încrederea în teste. Un test flaky pică uneori fără nicio schimbare și îi învață pe oameni să re-ruleze până trece; atunci poarta nu mai oprește nimic. Îl pui în carantină și îl repari repede.
Exemplu:
```text
stages: [build, test, deploy]
deploy_prod:
  stage: deploy
  script: ./deploy.sh
  when: manual  # Delivery
# fără when: manual → Deployment
```
Legătură: Aplicația asta face Continuous Delivery: PR în `main`, iar GitHub Pages servește build-ul nou. În Docker Swarm, `docker service update --image` e pasul de lansare. Punctele 15 și 19: `sleep` e cauza clasică a testelor flaky.
Tablă:
- problema: lansare lunară, de mână
- ideea: Delivery: buton; Deployment: automat
- schemă:
```text
merge în main, pipeline verde
↓ build o singură dată
imaginea ajunge pe staging
↓ Delivery: un om apasă
aceeași imagine în producție
```
- punct: build o dată; flaky în carantină

### 7
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
Tablă:
- problema: pică doar AssertionError
- ideea: assert simplu; valori în eșec
- schemă:
```text
assert f(2) == 5
↓ rescris la import
asertul păstrează valorile
↓ testul pică
E  assert 4 == 5
```
- punct: def test_*, assert simplu

### 8
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
Tablă:
- problema: 10 teste, aceeași conexiune
- ideea: fixture; teardown după yield
- schemă:
```text
testul cere fixture după nume
↓ setup, până la yield
valoarea intră în test
↓ testul rulează (sau pică)
↓ teardown, după yield
```
- cpp: SetUp și TearDown
- punct: yield: setup și teardown

### 9
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
Tablă:
- problema: fixture copiat peste tot
- ideea: conftest.py; cel mai apropiat câștigă
- schemă:
```text
test_d.py cere client
↓ caută în sub/conftest.py
găsit: client = sub
↓ altfel urcă în tests/
client = root
```
- punct: conftest.py, fără import

### 10
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
Tablă:
- problema: 12 reguli, 12 funcții
- ideea: parametrize; un test per valoare
- schemă:
```text
parametrize("n", [1, 2, 3])
↓ un test per valoare
test_p[1], [2], [3]
↓ unul pică
[3] FAILED, restul trec
```
- cpp: TEST_P; GetParam
- punct: parametrize, teste separate

### 11
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
Tablă:
- problema: env, fișiere, loguri
- ideea: raises, monkeypatch; tmp_path, caplog
- schemă:
```text
monkeypatch.setenv("MOD", "ok")
↓ testul rulează
os.getenv("MOD") → ok
↓ sfârșitul testului
valoarea veche revine
```
- punct: unelte care curăță singure

### 12
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
Tablă:
- problema: patch pe nume greșit
- ideea: patch unde e căutat; autospec
- schemă:
```text
from notify import send_email
↓ patch("notify.send_email")
alerts.send_email rămâne real
↓ patch("alerts.send_email")
apelul prinde mock-ul
```
- cpp: interfață virtuală; EXPECT_CALL
- punct: patch la consumator

### 13
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
Tablă:
- problema: SQLite vs Postgres
- ideea: Postgres real; rollback
- schemă:
```text
fixture: deschide tranzacția
↓ testul scrie în bază
rândurile există doar în test
↓ teardown: rollback
baza e curată
```
- punct: Postgres real, rollback

### 14
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
Tablă:
- problema: task Celery fără broker
- ideea: task_always_eager; emulare worker
- schemă:
```text
add.delay(2, 3)
↓ eager = False
mesaj la broker, apoi worker
↓ eager = True
rulează local, fără broker
```
- punct: eager pentru unit teste

### 15
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
Legătură: PT-09 și punctul 19: același principiu, `sleep` nu e sincronizare.
Tablă:
- problema: token expirat, sleep
- ideea: ceas injectat; aștepți condiția
- schemă:
```text
expired(t0, now, ttl)
↓ testul dă now = 899
False
↓ testul dă now = 900
True, fără sleep
```
- cpp: ceas ca parametru
- punct: controlezi timpul

### 16
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
Tablă:
- problema: suita de 8 minute
- ideea: -x, -k, --lf; -m, -n auto
- punct: opțiuni care scurtează suita

### 17
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
Tablă:
- problema: -n 4, baza comună
- ideea: xdist; worker_id
- schemă:
```text
pytest -n 4
↓ pornește gw0..gw3
fiecare colectează testele
↓ fixture scope session
rulează o dată pe worker
↓ worker_id în nume
test_gw0, test_gw1: baze separate
```
- punct: session per worker

### 18
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
Tablă:
- problema: 400 teste, login repetat
- ideea: straturi; configurare din CLI
- schemă:
```text
test: user se loghează
↓ pas de domeniu
login()
↓ page object sau client API
↓ driver: browser sau HTTP
```
- punct: framework, nu doar teste

### 19
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
Legătură: PT-17 și punctul 15: `sleep` nu e sincronizare, ci o ghicire.
Tablă:
- problema: sleep(2) fragil
- ideea: get_by_role; expect reîncearcă
- schemă:
```text
button.click()
↓ așteaptă elementul gata
acțiunea se face
↓ expect(t).to_be_visible()
reîncearcă până la 5 s
```
- punct: așteptare automată
