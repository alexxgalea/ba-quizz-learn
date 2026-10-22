/* Proba tehnică: carduri orale cu cod (snippet: găsești problema, spui ce ai schimba și cum testezi) și scenarii de design.
   `code` = snippet-ul afișat pe card și trimis intervievatorului; rânduri de cel mult 38 de caractere (încap la 360 px). */
(function (P) {
  const R = String.raw;
  const O = (m, list) => list.forEach(c => P.oral.push(Object.assign({ m }, c)));

  O("gil", [
    { id: "o-snp-thr1", q: "Ce afișează codul și ce ai schimba?", code: R`counter = 0

def work():
    global counter
    for _ in range(100_000):
        counter += 1

ts = [Thread(target=work)
      for _ in range(8)]
for t in ts: t.start()
for t in ts: t.join()
print(counter)`, k: [
      "Poate afișa mai puțin de 800.000: `counter += 1` înseamnă citire, adunare, scriere și se poate intercala între threaduri",
      "GIL-ul nu ajută: protejează doar instrucțiunile individuale de bytecode, nu operația compusă",
      "Fix: `threading.Lock` în jurul incrementului",
      "Mai bine: fără stare partajată (fiecare thread numără local și aduni la final, sau `concurrent.futures`)",
      "Testare: rulezi de multe ori; o eroare de concurență nu apare la fiecare rulare"],
      model: "Rezultatul nu e garantat 800.000: `counter += 1` înseamnă citire, adunare și scriere, iar un thread poate fi întrerupt între ele, deci se pierd incrementări. GIL-ul nu mă protejează aici, pentru că el garantează doar instrucțiunile individuale de bytecode, nu operația compusă. Aș pune un `threading.Lock` în jurul incrementului, sau, mai curat, aș evita starea partajată: fiecare thread numără local și adun la final, de exemplu cu `ThreadPoolExecutor` și `sum` pe rezultate. Un astfel de bug nu apare la fiecare rulare, deci un test care trece o dată nu dovedește nimic." },
    { id: "o-snp-thr2", q: "Ce se poate întâmpla când aceste funcții rulează în threaduri diferite?", code: R`a, b = Lock(), Lock()

def transfer_1():
    with a:
        with b:
            move(1)

def transfer_2():
    with b:
        with a:
            move(2)`, k: [
      "Deadlock: T1 ține `a` și așteaptă `b`, T2 ține `b` și așteaptă `a`",
      "Cauza: lock-uri luate în ordine diferită",
      "Fix: o ordine globală fixă de achiziție (mereu `a`, apoi `b`) sau un singur lock",
      "Alternativ: `acquire(timeout=...)` cu retry, ca să nu blochezi la nesfârșit",
      "Diagnostic în producție: thread dump (`faulthandler`, `py-spy dump`) arată unde stă fiecare thread"],
      model: "Pot ajunge într-un deadlock: primul thread ia `a` și așteaptă `b`, al doilea a luat deja `b` și așteaptă `a`, deci niciunul nu mai avansează. Cauza e ordinea diferită în care se iau lock-urile. Soluția simplă e o ordine globală fixă, mereu `a` apoi `b`, sau un singur lock dacă protejează aceeași resursă. Pot folosi și `acquire(timeout=...)`, ca să detectez și să reîncerc în loc să blochez la nesfârșit. Dacă se întâmplă în producție, un thread dump cu `py-spy dump` sau `faulthandler` îmi arată exact unde stă fiecare thread." }
  ]);

  O("asyncio", [
    { id: "o-snp-aio1", q: "Ce probleme are funcția când lista are 50.000 de hosturi?", code: R`async def scan_all(hosts):
    tasks = [check(h) for h in hosts]
    res = await asyncio.gather(*tasks)
    return res`, k: [
      "Fără limită de concurență: 50.000 de conexiuni deodată (descriptori, porturi, ținte supraîncărcate)",
      "Limitare: `asyncio.Semaphore(n)` în `check` sau N workeri pe o `asyncio.Queue`",
      "La prima excepție `gather` o ridică, dar celelalte task-uri continuă să ruleze (nu sunt anulate)",
      "Erori: `return_exceptions=True` sau `TaskGroup` (anulează restul), după ce vrei",
      "Timeout per host (`asyncio.timeout`) și rezultate procesate pe măsură ce vin, nu ținute toate în memorie"],
      model: "Prima problemă e că pornesc 50.000 de corutine care deschid conexiuni toate deodată: rămân fără descriptori de fișiere și supraîncarc țintele. Aș limita concurența cu un `asyncio.Semaphore` în `check`, sau cu un număr fix de workeri care consumă o `asyncio.Queue`. A doua: dacă un host aruncă o excepție, `gather` o ridică imediat, dar celelalte task-uri nu sunt anulate, continuă în fundal. Aleg explicit: `return_exceptions=True` dacă vreau toate rezultatele, sau `TaskGroup` dacă la prima eroare vreau să opresc tot. Aș pune și un timeout per host cu `asyncio.timeout` și aș procesa rezultatele pe măsură ce vin, ca să nu țin totul în memorie." },
    { id: "o-snp-aio2", q: "Ce e riscant în acest handler?", code: R`async def handle(event):
    asyncio.create_task(
        send_alert(event))
    return {"ok": True}`, k: [
      "Task-ul nu e păstrat: bucla ține doar o referință slabă, deci poate fi colectat de GC înainte să termine",
      "Excepțiile din `send_alert` se pierd (doar un warning „Task exception was never retrieved”)",
      "La oprirea aplicației task-ul e anulat: alerta se pierde",
      "Fix minim: păstrezi task-ul într-un `set` cu `add_done_callback(set.discard)` și tratezi excepțiile",
      "Pentru lucru care nu are voie să se piardă: o coadă durabilă (RabbitMQ, Celery) + idempotență"],
      model: "Task-ul e pornit și uitat. Bucla de evenimente păstrează doar o referință slabă la el, deci poate fi colectat înainte să termine, iar dacă `send_alert` aruncă, excepția se pierde într-un warning. La oprirea aplicației task-ul e anulat și alerta dispare. Minim, aș păstra task-urile într-un `set`, cu `add_done_callback` care le scoate și le loghează erorile. Dar o alertă de securitate nu are voie să se piardă, așa că aș publica-o într-o coadă durabilă, RabbitMQ sau Celery, cu retry și consumator idempotent." }
  ]);

  O("asgi", [
    { id: "o-snp-api1", q: "Endpoint-ul merge în test, dar sub încărcare latența crește pentru toate rutele. De ce?", code: R`@app.get("/scan/{host}")
async def scan(host: str):
    r = requests.get(
        f"http://{host}/status",
        timeout=10)
    time.sleep(1)
    return r.json()`, k: [
      "`requests.get` și `time.sleep` sunt blocante și rulează pe event loop (`async def`)",
      "Cât blochează, workerul nu servește nicio altă cerere: toate rutele așteaptă",
      "Fix: `httpx.AsyncClient` + `await`, `await asyncio.sleep`; sau declari endpoint-ul cu `def` (rulează în threadpool)",
      "Un singur `AsyncClient` refolosit (creat în `lifespan`), nu unul pe cerere",
      "Tratezi timeout-ul și erorile hostului (502/504), nu le lași să devină 500"],
      model: "Endpoint-ul e `async def`, deci rulează direct pe event loop, iar `requests.get` și `time.sleep` sunt blocante: cât așteaptă, workerul nu mai servește nicio altă cerere, de aceea cresc toate rutele. Am două variante. Fie trec pe I/O async, cu `httpx.AsyncClient` și `await asyncio.sleep`, cu un singur client creat în `lifespan` și refolosit. Fie declar endpoint-ul cu `def`, iar FastAPI îl rulează în threadpool, unde blocarea nu oprește bucla. Aș trata și timeout-ul și erorile hostului, ca să întorc 502 sau 504, nu 500." },
    { id: "o-snp-api2", q: "Ce ai schimba la acest endpoint?", code: R`db = SessionLocal()

@app.post("/findings")
def create(f: FindingIn):
    obj = Finding(**f.dict())
    db.add(obj)
    db.commit()
    return obj`, k: [
      "O sesiune globală, folosită din threadpool (`def`) de mai multe cereri: `Session` nu e thread-safe",
      "O sesiune per cerere: dependență cu `yield` (`Depends(get_db)`), închisă la final, rollback la eroare",
      "`.dict()` e API-ul din Pydantic v1, depreciat în v2: `model_dump()` (FastAPI cere acum Pydantic v2)",
      "`response_model` controlează ce iese: nu returnezi obiectul ORM brut",
      "Erori: `IntegrityError` → 409, nu 500; testezi cu `dependency_overrides` pe `get_db`"],
      model: "Sesiunea e globală, dar endpoint-ul e `def`, deci rulează în threadpool și mai multe cereri o folosesc în paralel; `Session` din SQLAlchemy nu e thread-safe, iar după o eroare rămâne într-o stare stricată pentru toată lumea. Aș face o sesiune per cerere, printr-o dependență cu `yield` care face rollback la eroare și închide sesiunea. `.dict()` e API-ul vechi din Pydantic v1, depreciat în v2, unde se folosește `model_dump()`. Aș pune un `response_model`, ca să nu expun câmpuri interne, și aș transforma `IntegrityError` în 409. În teste înlocuiesc `get_db` cu `dependency_overrides`." }
  ]);

  O("python", [
    { id: "o-snp-gen1", q: "Ce conține `critical` și de ce?", code: R`def read_events(path):
    with open(path) as f:
        for line in f:
            yield parse(line)

events = read_events("audit.log")
total = sum(1 for _ in events)
critical = [e for e in events
            if e.level == "CRIT"]`, k: [
      "`critical` e gol: generatorul a fost consumat complet de `sum`",
      "Un generator se parcurge o singură dată",
      "Fix: o singură trecere care calculează ambele, sau recreezi generatorul, sau `list` dacă încape în memorie",
      "Avantajul generatorului: memorie constantă pe un log mare",
      "Fișierul se închide când generatorul se termină sau la `close()`; testezi cu un fișier mic în `tmp_path`"],
      model: "`critical` iese gol, pentru că `sum` a consumat deja tot generatorul, iar un generator se parcurge o singură dată. Aș face o singură trecere în care număr și filtrez în același timp, sau aș apela din nou `read_events`; o listă merge doar dacă logul încape în memorie. Generatorul e alegerea bună aici, pentru că un log de audit poate fi foarte mare și așa memoria rămâne constantă. Fișierul se închide când generatorul se termină sau când îl închid explicit. L-aș testa cu un fișier mic scris în `tmp_path`." },
    { id: "o-snp-gen2", q: "Funcția pare corectă. Ce caz scapă?", code: R`def chunks(items, n):
    batch = []
    for x in items:
        batch.append(x)
        if len(batch) == n:
            yield batch
            batch = []`, k: [
      "Ultimul lot incomplet se pierde: lipsește `if batch: yield batch` după buclă",
      "Bug clasic de margine: numărul de elemente nu e multiplu de `n`",
      "Din 3.12 există `itertools.batched(items, n)`, care întoarce tupluri",
      "Test cu `parametrize`: 0 elemente, exact `n`, `n + 1`",
      "Folosire tipică: insert în loturi în DB, cu memorie limitată"],
      model: "Ultimul lot se pierde când numărul de elemente nu e multiplu de `n`: după buclă lipsește `if batch: yield batch`. E un bug de margine care trece de un test cu 10 elemente și `n` egal cu 5. Din Python 3.12 aș folosi direct `itertools.batched`, care întoarce tupluri. L-aș testa cu `parametrize` pe cazurile 0, exact `n` și `n + 1` elemente. Folosirea tipică e un insert în loturi într-o bază de date, cu memorie limitată." }
  ]);

  O("oop", [
    { id: "o-snp-oop1", q: "Ce afișează ultima linie și de ce?", code: R`class Scanner:
    findings = []

    def add(self, f):
        self.findings.append(f)

a, b = Scanner(), Scanner()
a.add("weak password")
print(b.findings)`, k: [
      "Afișează `['weak password']`: `findings` e atribut de clasă, o singură listă pentru toate instanțele",
      "`self.findings` găsește lista pe clasă (căutarea merge instanță → clasă), iar `append` o modifică pe loc",
      "Fix: `self.findings = []` în `__init__`, sau `@dataclass` cu `field(default_factory=list)`",
      "Aceeași capcană ca valoarea implicită mutabilă `def f(x=[])`",
      "Test: două instanțe noi, verifici că nu împart starea"],
      model: "Afișează `['weak password']`, deși am adăugat doar în `a`. `findings` e atribut de clasă, deci o singură listă comună tuturor instanțelor: `self.findings` nu găsește nimic pe instanță, o găsește pe clasă, iar `append` o modifică pe loc. Starea per obiect trebuie creată în `__init__`, `self.findings = []`, sau cu `@dataclass` și `field(default_factory=list)`. E aceeași capcană ca valoarea implicită mutabilă la funcții. Un test simplu creează două instanțe și verifică că nu împart starea." },
    { id: "o-snp-oop2", q: "Ce principiu de design încalcă aceste subclase și ce problemă produc?", code: R`class Notifier:
    def send(self, msg: str) -> None:
        ...

class EmailNotifier(Notifier):
    def send(self, msg, to):
        smtp.send(to, msg)

class SlackNotifier(Notifier):
    def send(self, msg):
        if len(msg) > 4000:
            raise ValueError
        slack.post(msg)`, k: [
      "Liskov: o subclasă trebuie să poată înlocui părintele fără ca apelantul să știe",
      "`EmailNotifier` schimbă semnătura (cere `to`): codul care primește un `Notifier` crapă",
      "`SlackNotifier` adaugă o precondiție mai strictă (aruncă la mesaje lungi)",
      "Fix: destinatarul vine din constructor (configurare), mesajele lungi se împart sau se trunchiază în implementare",
      "Contract explicit (ABC sau `Protocol`) și aceleași teste rulate pe toate implementările (`parametrize`)"],
      model: "Încalcă principiul substituției al lui Liskov: codul care primește un `Notifier` trebuie să poată folosi orice subclasă fără să știe care e. `EmailNotifier` schimbă semnătura, cere și destinatarul, deci apelul `send(msg)` crapă. `SlackNotifier` adaugă o precondiție mai strictă și aruncă pe mesaje lungi, pe care părintele nu le interzicea. Aș muta destinatarul în constructor, ca configurare, iar limitele platformei le-aș trata în implementare, împărțind mesajul. Aș face contractul explicit cu un ABC sau un `Protocol` și aș rula aceleași teste pe toate implementările, cu `parametrize`." },
    { id: "o-snp-oop3", q: "Ultima linie aruncă o excepție. Care și de ce?", code: R`class Finding:
    def __init__(self, rule, host):
        self.rule = rule
        self.host = host

    def __eq__(self, o):
        return ((self.rule, self.host)
                == (o.rule, o.host))

unique = set(findings)`, k: [
      "`TypeError: unhashable type`: definind `__eq__` fără `__hash__`, Python pune `__hash__ = None`",
      "Regula: obiectele egale trebuie să aibă același hash",
      "Fix: `__hash__` din aceleași câmpuri (`hash((self.rule, self.host))`) sau `@dataclass(frozen=True)`",
      "Câmpurile din hash nu au voie să se schimbe după ce obiectul e într-un `set` (de aici `frozen`)",
      "`__eq__` întoarce `NotImplemented` pentru alte tipuri, nu crapă cu `AttributeError`"],
      model: "Aruncă `TypeError: unhashable type`. Când definesc `__eq__` fără `__hash__`, Python setează `__hash__` la `None`, pentru că hash-ul moștenit, bazat pe identitate, ar contrazice egalitatea nouă. Regula e că obiectele egale trebuie să aibă același hash. Aș defini `__hash__` din aceleași câmpuri sau, mai simplu, aș face clasa `@dataclass(frozen=True)`, care le generează pe amândouă și împiedică modificarea câmpurilor după ce obiectul e într-un set. Iar `__eq__` ar trebui să întoarcă `NotImplemented` pentru alte tipuri, nu să crape cu `AttributeError`." }
  ]);

  O("pytest", [
    { id: "o-snp-tst1", q: "Testul pică din când în când în CI. De ce și cum l-ai rescrie?", code: R`def test_alert_sent():
    svc = AlertService()
    svc.process(event)
    time.sleep(2)
    r = requests.get(
        "http://localhost:8000"
        "/alerts")
    assert len(r.json()) == 1`, k: [
      "Depinde de un server pornit, de rețea și de timp: lent și flaky",
      "`time.sleep(2)` ghicește durata: uneori prea puțin, mereu lent",
      "Izolare: injectezi un notifier fals sau folosești `TestClient` cu `dependency_overrides`",
      "Starea partajată (aceeași bază între teste) face rezultatul dependent de ordine: fixture cu rollback",
      "Verifici comportamentul (ce s-a trimis, cu ce date), nu doar numărul"],
      model: "Testul depinde de un server real pornit pe portul 8000, de rețea și de un `sleep` care ghicește cât durează procesarea, deci e lent și pică aleator. În plus, dacă alte teste scriu în aceeași bază, `len == 1` depinde de ordinea testelor. L-aș rescrie fără rețea: `AlertService` primește un notifier fals în constructor și verific direct ce a primit, cu ce date. Dacă vreau să testez API-ul, folosesc `TestClient` cu `dependency_overrides`. Pentru bază, o fixture care deschide o tranzacție și face rollback după fiecare test." },
    { id: "o-snp-tst2", q: "Testul trimite totuși un mail real. De ce?", code: R`# app/alerts.py
from app.mail import send

def notify(e):
    send(e.owner, e.text)

# tests/test_alerts.py
@patch("app.mail.send")
def test_notify(m):
    notify(ev)
    m.assert_called_once()`, k: [
      "`patch` înlocuiește numele acolo unde e căutat: `app.alerts.send`, nu `app.mail.send`",
      "`from app.mail import send` a copiat referința în `app.alerts` la import",
      "Fix: `@patch(\"app.alerts.send\")` sau `monkeypatch.setattr(alerts, \"send\", fake)`",
      "Mai robust: dependency injection (notificatorul vine ca parametru)",
      "`assert_called_once_with(ev.owner, ev.text)` verifică și argumentele"],
      model: "`patch` înlocuiește un nume acolo unde e căutat, nu acolo unde e definit. `from app.mail import send` a copiat referința în modulul `app.alerts` la import, deci `notify` folosește în continuare funcția reală, iar mock-ul din `app.mail` nu e apelat niciodată. Corect e `@patch(\"app.alerts.send\")` sau `monkeypatch.setattr` pe modulul `alerts`. Mai robust, aș injecta funcția de trimitere ca dependență, ca testul să nu depindă de cum e scris importul. Și aș verifica argumentele cu `assert_called_once_with`, nu doar că a fost apelat." }
  ]);

  O("design", [
    { id: "o-des-3", q: "Design: un serviciu care rulează scanări de securitate lungi (minute până la ore) pe sistemele SAP ale clienților, pornite din UI.", k: [
      "Clarificări: câte scanări simultan, durata, cât de încărcat are voie să fie sistemul clientului",
      "API asincron: `POST` întoarce 202 + `job_id`; starea și progresul se citesc separat (polling sau WebSocket)",
      "Coadă + workeri (Celery/RabbitMQ), starea jobului în Postgres; limită de concurență per client și per sistem",
      "Eșecuri: timeout, retry cu backoff, puncte de reluare (checkpoint) ca să nu repornești de la zero",
      "Idempotență (aceeași cerere nu pornește două scanări), anulare, metrici: durată, cozi, erori"],
      model: "Întâi aș clarifica volumul: câte scanări rulează simultan, cât durează și cât de tare am voie să încarc sistemul SAP al clientului. Pentru că o scanare durează minute sau ore, API-ul nu ține conexiunea deschisă: `POST` întoarce 202 cu un `job_id`, iar UI-ul citește starea și progresul separat. Jobul intră într-o coadă, RabbitMQ cu workeri Celery, iar starea lui stă în Postgres. Limitez concurența per client și per sistem țintă, ca să nu-i afectez producția. Pentru eșecuri am timeout, retry cu backoff și checkpoint-uri, ca o scanare întreruptă să continue, nu să repornească. Aș face pornirea idempotentă, aș permite anularea și aș măsura durata, lungimea cozilor și rata de erori." },
    { id: "o-des-4", q: "Design: un API de alerte consumat de SIEM-urile clienților, cu rate limiting și paginare.", k: [
      "Clarificări: câți clienți, cât de des citesc, câte alerte pe zi, ce latență acceptă",
      "Autentificare per tenant (API key sau OAuth, de exemplu Keycloak) și izolare strictă a datelor",
      "Rate limiting per client (token bucket în Redis), 429 cu `Retry-After`",
      "Paginare cu cursor (ordonare stabilă după `(created_at, id)`), nu cu offset, plus index pe aceleași coloane",
      "Alternative și evoluție: webhook push în loc de polling, versionarea API-ului, filtre"],
      model: "Aș începe cu volumul: câți clienți, cât de des întreabă și câte alerte apar pe zi. Fiecare client se autentifică per tenant, cu API key sau OAuth prin Keycloak, iar fiecare interogare e filtrată pe tenant. Rate limiting-ul îl fac per client, cu un token bucket în Redis, și întorc 429 cu `Retry-After`. Pentru paginare folosesc un cursor pe `(created_at, id)`, nu offset, ca rezultatele să fie stabile când apar alerte noi, cu un index pe aceleași coloane. Dacă polling-ul devine o problemă, ofer webhook-uri push. Și versionez API-ul de la început, pentru că SIEM-urile clienților nu se actualizează odată cu noi." },
    { id: "o-des-5", q: "Design: același incident e detectat de 50 de ori în 10 minute. Cum eviți 50 de notificări?", k: [
      "Cheie de deduplicare (fingerprint): tenant + regulă + sistem/asset",
      "Fereastră de timp: în Redis `SET key NX EX 600` (atomic) sau constrângere unică în DB",
      "Agregare: un incident cu `count`, `first_seen`, `last_seen`, nu 50 de rânduri",
      "Procesare at-least-once: operații idempotente; operații atomice între workeri, fără „citește, apoi scrie”",
      "Notificări: prima imediat, apoi rezumat sau escaladare; teste pe fereastra de timp"],
      model: "Definesc o cheie de deduplicare, un fingerprint din tenant, regula care a declanșat și sistemul afectat. Prima detecție creează incidentul și trimite notificarea; următoarele din aceeași fereastră doar cresc un contor și actualizează `last_seen`. Fereastra o țin în Redis cu `SET key NX EX 600`, care e atomic, deci doi workeri care văd același eveniment simultan nu creează două incidente; ca plasă de siguranță, o constrângere unică în baza de date. Procesarea e at-least-once, deci totul trebuie să fie idempotent. Pentru notificări: prima imediat, apoi un rezumat sau o escaladare dacă incidentul continuă. Fereastra o testez injectând ceasul, nu cu `sleep`." },
    { id: "o-des-6", q: "Cum ai structura un serviciu FastAPI de detecție ca să fie ușor de testat și de schimbat?", k: [
      "Straturi: routere (HTTP) → servicii (logica de domeniu) → repository-uri (DB) și clienți externi",
      "Logica de domeniu nu știe de FastAPI sau de SQLAlchemy: clase și funcții simple",
      "Dependențele intră prin constructor sau `Depends`; în teste le înlocuiești (`dependency_overrides`, fake-uri)",
      "Contracte pentru sistemele externe (`Protocol`: notificator, client SAP) cu implementări false în teste",
      "Configurare din mediu (`pydantic-settings`), fără stare globală; teste unitare pe domeniu, de integrare cu `TestClient`"],
      model: "Aș separa pe straturi: routerele FastAPI doar traduc HTTP în apeluri, serviciile conțin logica de detecție, iar repository-urile și clienții externi vorbesc cu baza de date și cu sistemele SAP. Logica de domeniu nu importă FastAPI sau SQLAlchemy, deci o testez rapid, cu obiecte simple. Dependențele intră prin constructor sau prin `Depends`, iar pentru sistemele externe definesc contracte mici cu `Protocol`, ca în teste să pun implementări false. Configurarea vine din mediu cu `pydantic-settings`, fără stare globală. Testele unitare acoperă domeniul, iar câteva teste de integrare cu `TestClient` și o bază de test verifică legăturile." }
  ]);
})(window.PREP);
