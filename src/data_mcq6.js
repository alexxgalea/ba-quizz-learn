/* Grile pentru proba tehnică: OOP, asyncio, threading, generatori, testing, FastAPI. Varianta corectă e mereu la indexul 0 (a: 0). */
(function (P) {
  const R = String.raw;
  const Q = (m, list) => list.forEach(q => P.mcq.push(Object.assign({ m, a: 0 }, q)));

  Q("oop", [
    { id: "oop-01", lvl: 1, q: "Ce afișează?", code: R`class A:
    items = []

a1, a2 = A(), A()
a1.items.append(1)
print(a2.items)`, o: ["[1]", "[]", "AttributeError", "None"],
      ctx: "Un atribut scris în corpul clasei aparține clasei. `self.x` caută întâi pe instanță, apoi pe clasă. Întrebarea: câte liste există aici?",
      e: "`items` e atribut de clasă: o singură listă, comună tuturor instanțelor. Starea per obiect se creează în `__init__`." },
    { id: "oop-02", lvl: 1, q: "Ce câștigi cu `@property` față de o metodă `get_score()`?", o: [
      "Păstrezi interfața `obj.score` și adaugi calcul sau validare fără să schimbi apelanții",
      "Valoarea e calculată o singură dată și păstrată",
      "Atributul devine privat și nu mai poate fi citit din afară",
      "Accesul e mai rapid decât la un atribut obișnuit"],
      ctx: "În Java scrii getteri și setteri din prima, ca să poți schimba implementarea mai târziu. În Python începi cu un atribut simplu.",
      e: "`@property` transformă accesul la atribut într-un apel de metodă, deci poți începe cu un atribut simplu și adăuga logică mai târziu fără să rupi codul care îl folosește." },
    { id: "oop-03", lvl: 1, q: "Care e folosirea tipică pentru `@classmethod`?", o: [
      "Constructori alternativi, ca `Finding.from_dict(d)`, care merg și pentru subclase",
      "Funcții care nu au nevoie nici de instanță, nici de clasă",
      "Metode care pot fi apelate doar pe clasă, niciodată pe instanță",
      "Metode care modifică starea unei singure instanțe"],
      ctx: "`@classmethod` primește clasa ca prim argument (`cls`), `@staticmethod` nu primește nimic implicit, iar o metodă obișnuită primește instanța (`self`).",
      e: "Pentru că primește `cls`, un `@classmethod` poate construi instanțe ale clasei pe care e apelat, inclusiv ale unei subclase: `cls(**d)`." },
    { id: "oop-04", lvl: 2, q: "Ce se întâmplă?", code: R`@dataclass
class Rule:
    name: str

seen = {Rule("brute-force")}`, o: ["TypeError: unhashable type: 'Rule'", "Un set cu un element", "Un set gol", "AttributeError la `name`"],
      ctx: "`@dataclass` generează `__init__`, `__repr__` și `__eq__`. Un obiect intră într-un `set` doar dacă are `__hash__`.",
      e: "Cu `eq=True` (implicit) și fără `frozen=True`, dataclass-ul pune `__hash__ = None`: obiectele mutabile cu egalitate de valoare nu pot fi hash-uite. `@dataclass(frozen=True)` rezolvă." },
    { id: "oop-05", lvl: 3, q: "Ce afișează?", code: R`class Base:
    def hi(self):
        return "Base"

class A(Base):
    def hi(self):
        return "A" + super().hi()

class B(Base):
    def hi(self):
        return "B" + super().hi()

class C(A, B):
    pass

print(C().hi())`, o: ["ABBase", "ABase", "ABaseBBase", "BABase"],
      ctx: "Cu moștenire multiplă, Python caută metodele după MRO (method resolution order), calculată cu algoritmul C3. Vezi ordinea cu `C.__mro__`.",
      e: "MRO pentru `C` e C, A, B, Base. `super()` din `A` cheamă următoarea clasă din MRO, adică `B`, nu `Base`. Rezultă „A” + „B” + „Base”." },
    { id: "oop-06", lvl: 2, q: "Ce se întâmplă la ultima linie?", code: R`class Notifier(ABC):
    @abstractmethod
    def send(self, msg): ...

class Slack(Notifier):
    def post(self, msg): ...

n = Slack()`, o: [
      "TypeError: `Slack` nu implementează metoda abstractă `send`",
      "Merge; eroarea apare abia când apelezi `n.send()`",
      "NotImplementedError la `Slack()`",
      "Merge, iar `post` ține locul lui `send`"],
      ctx: "Un ABC (`abc.ABC`) cu metode `@abstractmethod` definește un contract. Python verifică contractul la instanțiere, nu la definirea clasei.",
      e: "O clasă care moștenește un ABC și nu implementează toate metodele abstracte rămâne abstractă: instanțierea ei aruncă `TypeError`." },
    { id: "oop-07", lvl: 2, q: "Ce aduce `typing.Protocol` față de un ABC?", o: [
      "Contract structural: orice clasă cu metodele potrivite îl satisface, fără să moștenească",
      "Verificarea tipurilor argumentelor la fiecare apel, la runtime",
      "Moștenire multiplă fără conflicte de MRO",
      "Interzice instanțierea claselor care îl implementează"],
      ctx: "Un ABC e nominal: clasa trebuie să-l moștenească. Duck typing înseamnă că contează ce metode are obiectul, nu din ce clasă vine.",
      e: "`Protocol` (PEP 544) descrie forma unui obiect. mypy sau pyright verifică static că o clasă o respectă, chiar dacă nu moștenește din ea. Util pentru biblioteci externe pe care nu le poți modifica." },
    { id: "oop-08", lvl: 1, q: "Un `ScanJob` trebuie să notifice prin email sau Slack, după client. Ce design se testează cel mai ușor?", o: [
      "`ScanJob` primește un notifier în constructor și îl apelează",
      "`EmailScanJob` și `SlackScanJob` moștenesc din `ScanJob`",
      "`ScanJob` are câte un `if` pentru fiecare canal",
      "Un notifier global, importat direct în modulul lui `ScanJob`"],
      ctx: "Compoziție („are un”) vs moștenire („este un”). Întrebarea de test: ce pui în locul notificării reale când testezi un `ScanJob`?",
      e: "Cu compoziție, în test dai un notifier fals și verifici ce a primit. Canalele noi nu cer schimbări în `ScanJob`." },
    { id: "oop-09", lvl: 2, q: "Când suprascrii `__new__` în loc de `__init__`?", o: [
      "Când controlezi crearea instanței: subclase de tipuri imutabile (`str`, `tuple`) sau un cache de instanțe",
      "Când vrei să validezi argumentele constructorului",
      "Mereu când clasa are atribute obligatorii",
      "Când clasa moștenește din mai multe clase"],
      ctx: "`__new__` creează obiectul și îl întoarce; `__init__` primește obiectul deja creat și îl inițializează.",
      e: "La un tip imutabil, valoarea trebuie fixată la creare, deci în `__new__`; în `__init__` e deja prea târziu. Pentru validare obișnuită ajunge `__init__`." },
    { id: "oop-10", lvl: 2, q: "Ce se întâmplă?", code: R`@dataclass
class Report:
    findings: list = []`, o: [
      "ValueError la definirea clasei: valoare implicită mutabilă; folosești `field(default_factory=list)`",
      "Toate rapoartele împart aceeași listă, fără nicio eroare",
      "Fiecare raport primește automat o listă nouă",
      "TypeError la crearea primului `Report()`"],
      ctx: "La funcții, `def f(x=[])` împarte aceeași listă între apeluri. Dataclass-urile verifică această capcană pentru `list`, `dict` și `set`.",
      e: "Dataclass-ul refuză o valoare implicită de tip `list`, `dict` sau `set` și aruncă `ValueError` chiar la definire. Corect: `findings: list = field(default_factory=list)`." },
    { id: "oop-11", lvl: 2, q: "Ce obții cu `__slots__ = (\"rule\", \"host\")`?", o: [
      "Instanțe fără `__dict__`: mai puțină memorie, iar atributele noi sunt interzise",
      "Atribute imutabile după `__init__`",
      "Acces thread-safe la atribute",
      "Validarea tipurilor la atribuire"],
      ctx: "Fiecare instanță obișnuită are un `__dict__` în care stau atributele. La milioane de obiecte mici, dicționarele astea contează.",
      e: "`__slots__` rezervă locuri fixe pentru atributele numite, fără `__dict__`. Economisești memorie, iar o greșeală de tastare (`obj.hots = ...`) aruncă `AttributeError`. Atributele rămân modificabile." },
    { id: "oop-12", lvl: 3, q: "`ReadOnlyRepo(Repo)` suprascrie `save()` doar ca să arunce `NotImplementedError`. Ce problemă e?", o: [
      "Încalcă substituția Liskov: codul care primește un `Repo` crapă cu subclasa",
      "Încalcă responsabilitatea unică: clasa face prea multe",
      "Nicio problemă: așa se restricționează o clasă",
      "O problemă de performanță: excepțiile sunt lente"],
      ctx: "Liskov: oriunde merge un obiect de tipul părintelui, trebuie să meargă și unul de tipul subclasei, fără ca apelantul să știe diferența.",
      e: "Subclasa promite (prin moștenire) că știe să salveze, apoi refuză. Corect: două interfețe mici, `Reader` și `Writer`, iar `Repo` le implementează pe amândouă." },
    { id: "oop-13", lvl: 2, q: "Ce afișează?", code: R`class Base:
    def __init__(self):
        self.ready = True

class Scanner(Base):
    def __init__(self, host):
        self.host = host

print(Scanner("h1").ready)`, o: ["AttributeError", "True", "None", "TypeError la `Scanner(\"h1\")`"],
      ctx: "Când o subclasă își definește propriul `__init__`, cel al părintelui nu mai rulează automat.",
      e: "`Scanner.__init__` nu cheamă `super().__init__()`, deci `ready` nu e setat niciodată, iar accesul aruncă `AttributeError`." },
    { id: "oop-14", lvl: 2, q: "Adaugi des reguli noi de detecție. Ce structură evită să modifici același `if/elif` de fiecare dată?", o: [
      "Fiecare regulă e o clasă sau funcție cu aceeași interfață, înregistrată într-o listă pe care motorul o parcurge",
      "Același `if/elif`, dar mutat într-un modul separat",
      "O clasă de bază cu câte o metodă pentru fiecare regulă",
      "Reguli scrise ca stringuri și rulate cu `eval`"],
      ctx: "Open/closed: codul e deschis pentru extindere (reguli noi), dar închis pentru modificare (motorul nu se schimbă).",
      e: "Cu o interfață comună și un registru, o regulă nouă e un fișier nou. Motorul și regulile vechi rămân neatinse, iar fiecare regulă se testează separat." }
  ]);
  Q("asyncio", [
    { id: "aio-01", lvl: 1, q: "Ce înseamnă că asyncio e concurență „cooperativă”?", o: [
      "O corutină rulează până la un `await`; abia atunci bucla poate trece la alta",
      "Corutinele rulează în paralel, pe mai multe core-uri",
      "Sistemul de operare întrerupe corutinele oricând, ca pe threaduri",
      "Fiecare corutină primește propriul thread"],
      ctx: "La threaduri, sistemul de operare decide când comută. În asyncio există un singur thread și o buclă de evenimente care rulează corutinele pe rând.",
      e: "Bucla poate comuta doar când corutina curentă cedează controlul, la un `await` pe ceva care chiar așteaptă (I/O, timer). Între două `await`-uri, corutina rulează singură." },
    { id: "aio-02", lvl: 1, q: "100 de cereri ajung simultan la acest handler, într-un singur worker. Cât așteaptă ultima?", code: R`async def handler():
    time.sleep(2)
    return "ok"`, o: [
      "~200 s: `time.sleep` blochează bucla, cererile se servesc pe rând",
      "~2 s: toate așteaptă în paralel",
      "~2 s, pentru că `async def` face apelul non-blocant",
      "Nimic: `time.sleep` aruncă eroare într-o corutină"],
      ctx: "`time.sleep` blochează threadul care îl apelează. `asyncio.sleep` e o corutină care cedează controlul buclei cât așteaptă.",
      e: "`time.sleep` nu cedează controlul: bucla stă blocată 2 s pe fiecare cerere, deci cererile se servesc una după alta. Cu `await asyncio.sleep(2)` toate ar aștepta în paralel, ~2 s în total." },
    { id: "aio-03", lvl: 1, q: "Ce face `await asyncio.to_thread(parse, data)`?", o: [
      "Rulează funcția sincronă într-un thread al executorului implicit, fără să blocheze bucla",
      "Rulează funcția într-un proces separat, pe alt core",
      "Transformă funcția într-o corutină care cedează controlul la fiecare linie",
      "Rulează funcția direct pe bucla evenimentelor, cu prioritate"],
      ctx: "Uneori trebuie să apelezi dintr-o corutină cod sincron: un SDK fără variantă async, un driver blocant, o funcție de parsare.",
      e: "`asyncio.to_thread` (3.9+) trimite funcția într-un thread și întoarce o corutină pe care o aștepți. Bucla rămâne liberă cât rulează funcția." },
    { id: "aio-04", lvl: 2, q: "`a()` aruncă `ValueError` după 1 s; `b()` și `c()` mai au de lucru. Ce se întâmplă cu ele?", code: R`try:
    await asyncio.gather(
        a(), b(), c())
except ValueError:
    ...`, o: [
      "Continuă să ruleze; `gather` doar propagă prima excepție",
      "Sunt anulate automat",
      "Sunt anulate, iar excepția devine `ExceptionGroup`",
      "`gather` așteaptă să termine toate, apoi ridică excepția"],
      ctx: "`asyncio.gather` și `asyncio.TaskGroup` rulează amândouă corutine concurent, dar tratează diferit prima eroare.",
      e: "Fără `return_exceptions=True`, `gather` propagă imediat prima excepție, dar nu anulează celelalte task-uri: ele continuă în fundal. Dacă vrei anulare, folosești `TaskGroup`." },
    { id: "aio-05", lvl: 2, q: "Ce face `asyncio.TaskGroup` când un task aruncă o excepție?", o: [
      "Anulează celelalte task-uri din grup, așteaptă să se oprească și ridică `ExceptionGroup`",
      "Ignoră eroarea și continuă cu celelalte",
      "Întoarce eroarea ca valoare, ca `return_exceptions=True`",
      "Repornește task-ul care a eșuat"],
      ctx: "`async with asyncio.TaskGroup() as tg:` (3.11+) creează task-uri cu `tg.create_task(...)`; blocul se termină abia când s-au terminat toate.",
      e: "TaskGroup implementează concurența structurată: la prima eroare anulează frații, iar la ieșirea din bloc ridică toate excepțiile într-un `ExceptionGroup`, prinse cu `except*`." },
    { id: "aio-06", lvl: 2, q: "`fetch` durează 10 s. Ce se întâmplă?", code: R`async with asyncio.timeout(5):
    data = await fetch(url)`, o: [
      "După 5 s task-ul e anulat, iar blocul ridică `TimeoutError`",
      "`fetch` continuă în fundal, iar `data` devine `None`",
      "În afara blocului primești `CancelledError`",
      "Programul așteaptă toate cele 10 s, apoi ridică `TimeoutError`"],
      ctx: "`asyncio.timeout` (3.11+) e un context manager. Intern, la expirare anulează task-ul curent și transformă anularea în altă excepție la ieșire.",
      e: "La expirare, task-ul primește `CancelledError` în `fetch`, iar la ieșirea din bloc ea devine `TimeoutError`. `fetch` e oprit, nu lăsat în fundal." },
    { id: "aio-07", lvl: 3, q: "Ce problemă are acest worker la oprirea aplicației?", code: R`async def worker():
    while True:
        try:
            await job()
        except BaseException:
            log.exception("failed")`, o: [
      "Prinde `CancelledError` și continuă bucla: task-ul nu mai poate fi oprit",
      "Nicio problemă: `except BaseException` e modul corect de a prinde tot",
      "`log.exception` nu funcționează în corutine",
      "Bucla consumă 100% CPU"],
      ctx: "Anularea unui task (`task.cancel()`, timeout, oprirea aplicației) se face aruncând `CancelledError` în el, la următorul `await`.",
      e: "`CancelledError` e `BaseException` (din 3.8), deci `except BaseException` o înghite, iar bucla continuă. Corect: `except Exception`, iar dacă prinzi anularea pentru cleanup, o ridici din nou." },
    { id: "aio-08", lvl: 2, q: "Ce risc are `asyncio.create_task(send_alert(e))` dacă nu păstrezi task-ul?", o: [
      "Task-ul poate fi colectat de GC înainte să termine, iar excepțiile lui se pierd",
      "Corutina nu pornește până nu faci `await` pe ea",
      "Rulează sincron și blochează apelantul",
      "Pornește un thread nou pentru fiecare task"],
      ctx: "`create_task` programează corutina pe buclă și întoarce un obiect `Task`. Bucla ține doar o referință slabă la el.",
      e: "Documentația cere explicit să păstrezi o referință: fără ea task-ul poate dispărea la jumătate, iar o excepție rămâne doar un warning „Task exception was never retrieved”." },
    { id: "aio-09", lvl: 3, q: "Un thread de background vrea să pună un eveniment în `q`, o `asyncio.Queue` citită de bucla principală. Ce folosește?", o: [
      "`loop.call_soon_threadsafe(q.put_nowait, ev)`",
      "`q.put_nowait(ev)` direct: `asyncio.Queue` e thread-safe",
      "`await q.put(ev)` din thread",
      "O `queue.Queue` citită cu `get()` direct în corutină"],
      ctx: "Primitivele din `asyncio` (`Queue`, `Lock`, `Event`) sunt gândite pentru corutinele aceleiași bucle, nu pentru threaduri diferite.",
      e: "`asyncio.Queue` nu e thread-safe. `call_soon_threadsafe` programează apelul în threadul buclei și o trezește. Pentru o corutină: `asyncio.run_coroutine_threadsafe`." }
  ]);

  Q("gil", [
    { id: "gil-15", lvl: 2, q: "Un producător și 4 consumatori, în threaduri. Ce folosești drept coadă de lucru?", o: [
      "`queue.Queue`: thread-safe, cu `get()` blocant și `task_done()` / `join()`",
      "O listă cu `append` și `pop(0)`, protejată de GIL",
      "`asyncio.Queue`, pentru că e mai rapidă",
      "Un `dict` global și un `while True` care verifică dacă are elemente"],
      ctx: "Producer/consumer: un thread pune lucru, alții îl iau. Ai nevoie de sincronizare și de un mod de a aștepta fără să consumi CPU.",
      e: "`queue.Queue` are lock-urile în ea, iar `get()` doarme până apare un element. `task_done()` și `join()` îți spun când s-a terminat tot lucrul." },
    { id: "gil-16", lvl: 2, q: "Ce se întâmplă la `outer()`?", code: R`lock = Lock()

def outer():
    with lock:
        inner()

def inner():
    with lock:
        ...`, o: [
      "Deadlock: același thread încearcă să ia din nou un `Lock` pe care îl ține",
      "Merge: același thread poate lua de mai multe ori un lock",
      "`RuntimeError`: lock deja luat",
      "`inner` sare peste blocul `with`"],
      ctx: "`threading.Lock` nu ține minte cine l-a luat. `threading.RLock` (reentrant) ține minte threadul proprietar și un contor.",
      e: "Un `Lock` simplu blochează pe oricine îl cere a doua oară, inclusiv threadul care îl ține. Fix: `RLock`, sau, mai curat, o funcție internă care presupune lock-ul deja luat." },
    { id: "gil-17", lvl: 2, q: "În ce ordine se afișează rezultatele?", code: R`with ThreadPoolExecutor(8) as ex:
    fs = [ex.submit(fetch, u)
          for u in urls]
    for f in as_completed(fs):
        print(f.result())`, o: [
      "În ordinea în care termină cererile",
      "În ordinea din `urls`",
      "Aleator, fără legătură cu durata",
      "Toate deodată, după ce termină ultima"],
      ctx: "`executor.map` întoarce rezultatele în ordinea intrărilor. `concurrent.futures.as_completed` întoarce viitoarele (futures) pe măsură ce se termină.",
      e: "`as_completed` dă fiecare future imediat ce e gata, deci cererile rapide apar primele. `f.result()` ridică din nou excepția dacă sarcina a eșuat." },
    { id: "gil-18", lvl: 1, q: "La ce folosești `threading.Event`?", o: [
      "Un semnal pe care un thread îl setează (`set()`) și altele îl așteaptă (`wait()`)",
      "Un lock pe care același thread îl poate lua de mai multe ori",
      "O coadă de mesaje între threaduri",
      "Un timer care pornește o funcție după un interval"],
      ctx: "Exemplu tipic: oprirea curată a workerilor. Firul principal anunță „oprește-te”, iar workerii verifică semnalul între sarcini.",
      e: "`Event` e un flag sincronizat: `set()` îl pornește, `wait()` blochează până e pornit, `is_set()` îl citește. E modul simplu de a cere workerilor să se oprească." },
    { id: "gil-19", lvl: 3, q: "Ce face `cond.wait()` într-un `threading.Condition`?", o: [
      "Eliberează lock-ul asociat, așteaptă un `notify()`, apoi îl reia înainte să revină",
      "Așteaptă un `notify()` ținând lock-ul luat",
      "Așteaptă un interval fix, apoi verifică singur condiția",
      "Blochează toate threadurile până la `notify_all()`"],
      ctx: "Un `Condition` combină un lock cu o listă de așteptare: un thread așteaptă o stare („coada nu e goală”), altul o schimbă și îl anunță.",
      e: "`wait()` trebuie apelat cu lock-ul luat. Îl eliberează cât doarme, ca alții să poată schimba starea, și îl reia la trezire. Verifici condiția într-o buclă sau cu `wait_for(predicat)`." }
  ]);
  Q("python", [
    { id: "py-14", lvl: 1, q: "Ce afișează?", code: R`gen = (x * 2 for x in range(3))
print(list(gen))
print(list(gen))`, o: ["[0, 2, 4], apoi []", "[0, 2, 4] de două ori", "[], apoi [0, 2, 4]", "TypeError la al doilea `list`"],
      ctx: "O expresie între paranteze rotunde, `(... for ...)`, e un generator, nu un tuplu și nici o listă.",
      e: "Un generator se parcurge o singură dată. Primul `list` îl consumă complet, iar al doilea primește un generator epuizat, deci o listă goală." },
    { id: "py-15", lvl: 2, q: "Ce afișează?", code: R`def inner():
    yield 1
    yield 2
    return "done"

def outer():
    r = yield from inner()
    yield r

print(list(outer()))`, o: ["[1, 2, 'done']", "[1, 2]", "['done']", "[1, 2, None]"],
      ctx: "`yield from` (PEP 380) deleagă iterarea către alt generator. Un generator poate avea și `return`, cu o valoare.",
      e: "`yield from inner()` transmite valorile 1 și 2 mai departe, iar expresia `yield from` primește valoarea returnată de `inner`, „done”, pe care `outer` o produce apoi." },
    { id: "py-16", lvl: 2, q: "Ce afișează?", code: R`def avg():
    total = n = 0
    x = yield
    while True:
        total += x
        n += 1
        x = yield total / n

g = avg()
next(g)
g.send(10)
print(g.send(20))`, o: ["15.0", "20", "10.0", "TypeError"],
      ctx: "`g.send(v)` reia generatorul, iar `yield` din interior primește valoarea `v`. Primul pas se face cu `next(g)` (sau `send(None)`), ca generatorul să ajungă la primul `yield`.",
      e: "`next` duce generatorul la primul `yield`. `send(10)` dă media 10.0, iar `send(20)` adună 20 și întoarce (10 + 20) / 2 = 15.0." },
    { id: "py-17", lvl: 3, q: "Ce se întâmplă?", code: R`def parse(lines):
    for l in lines:
        yield int(l)

nums = parse(["1", "x", "3"])
print("creat")
print(sum(nums))`, o: [
      "Afișează „creat”, apoi `ValueError` la `sum`",
      "`ValueError` la `parse(...)`, înainte de „creat”",
      "Afișează „creat” și 4, sărind peste „x”",
      "Afișează „creat” și 0"],
      ctx: "Apelul unei funcții generator nu execută corpul ei: întoarce un obiect generator. Corpul rulează abia când ceri valori.",
      e: "`parse(...)` doar creează generatorul. `int(\"x\")` rulează abia când `sum` cere a doua valoare, deci eroarea apare acolo, departe de locul în care ai creat generatorul." },
    { id: "py-18", lvl: 1, q: "Ce afișează?", code: R`def ids():
    n = 0
    while True:
        n += 1
        yield n

print(list(islice(ids(), 3)))`, o: ["[1, 2, 3]", "Nimic: rulează la nesfârșit", "[0, 1, 2]", "TypeError: generatorul nu are lungime"],
      ctx: "Un generator poate fi infinit, pentru că produce valorile la cerere. `itertools.islice` ia doar primele elemente dintr-un iterabil.",
      e: "`islice(..., 3)` cere exact trei valori și se oprește, deci generatorul infinit nu e parcurs mai departe." }
  ]);

  Q("pytest", [
    { id: "pt-11", lvl: 1, q: "Când trece testul?", code: R`def test_bad_port():
    with pytest.raises(
            ValueError, match="port"):
        parse_port("abc")`, o: [
      "Dacă `parse_port` aruncă `ValueError` cu un mesaj care conține „port”",
      "Dacă aruncă orice excepție",
      "Dacă nu aruncă nimic",
      "Doar dacă mesajul e exact „port”"],
      ctx: "`pytest.raises` verifică că blocul aruncă o excepție de un anumit tip; `match` verifică și mesajul.",
      e: "Testul trece doar dacă blocul aruncă `ValueError` (sau o subclasă) și dacă `re.search(\"port\", mesaj)` găsește ceva. Fără excepție, testul pică." },
    { id: "pt-12", lvl: 3, q: "Scrii `async def test_alert()` și rulezi pytest 9 fără pytest-asyncio sau anyio. Ce se întâmplă?", o: [
      "Testul pică: pytest nu rulează singur corutinele, are nevoie de un plugin async",
      "Trece: pytest rulează automat corutinele",
      "E sărit cu un warning, deci suita pare verde",
      "Rulează sincron, ignorând `await`"],
      ctx: "pytest e sincron. Pentru teste `async def` ai nevoie de un plugin (pytest-asyncio, sau anyio cu `@pytest.mark.anyio`, ca în documentația FastAPI).",
      e: "Din pytest 8.4, un test `async def` fără plugin pică explicit („async def functions are not natively supported”). Înainte era doar sărit cu un warning, ceea ce ascundea teste nerulate." },
    { id: "pt-13", lvl: 2, q: "Câte teste rulează?", code: R`@pytest.mark.parametrize(
    "a", [1, 2, 3])
@pytest.mark.parametrize(
    "b", ["x", "y"])
def test_grid(a, b):
    ...`, o: ["6", "5", "3", "2"],
      ctx: "Fiecare `parametrize` multiplică testul cu valorile lui. Două decoratoare puse unul peste altul se combină.",
      e: "Decoratoarele `parametrize` suprapuse fac produsul cartezian: 3 valori pentru `a` × 2 pentru `b` = 6 teste." },
    { id: "pt-14", lvl: 1, q: "Testezi o funcție care scrie un raport pe disc. Ce folosești?", o: [
      "Fixture-ul `tmp_path`: un director temporar, unic pentru fiecare test",
      "Un fișier fix, `/tmp/report.txt`",
      "Un mock pe `open` în fiecare test",
      "Directorul proiectului, curățat de mână la final"],
      ctx: "Testele care scriu fișiere în același loc se calcă pe picioare, mai ales când rulează în paralel sau când unul pică la jumătate.",
      e: "`tmp_path` dă fiecărui test un `pathlib.Path` către un director nou, deci testele nu împart fișiere și nu lasă gunoi în proiect." },
    { id: "pt-15", lvl: 2, q: "Un test trece singur, dar pică atunci când rulează toată suita. Cauza cea mai probabilă?", o: [
      "Stare partajată între teste (DB, variabile globale, fixture cu scope larg) care depinde de ordine",
      "pytest rulează implicit testele în paralel",
      "pytest păstrează rezultatele testelor de la o rulare la alta",
      "Testul e prea lent pentru suita completă"],
      ctx: "Un test bun nu depinde de alte teste: nici de ordinea lor, nici de ce au lăsat în urmă.",
      e: "Dacă rezultatul depinde de ce rulează înainte, un test anterior lasă stare în urmă: rânduri în DB, un singleton modificat, un mock nedesfăcut. Soluția e izolarea: rollback per test, fixture-uri cu scope `function`, `monkeypatch`." }
  ]);

  Q("asgi", [
    { id: "asgi-12", lvl: 2, q: "Unde creezi un `httpx.AsyncClient` partajat de toată aplicația și unde îl închizi?", o: [
      "În funcția `lifespan` (un `@asynccontextmanager` dat la `FastAPI(lifespan=...)`): îl creezi înainte de `yield` și îl închizi după",
      "În fiecare endpoint, la fiecare cerere",
      "Într-o variabilă globală creată la import, fără închidere",
      "În `@app.on_event(\"startup\")`, modul recomandat acum"],
      ctx: "Un client HTTP sau un pool de conexiuni se creează o dată, la pornire, și se închide la oprire. FastAPI are un singur loc pentru amândouă.",
      e: "`lifespan` rulează codul de dinainte de `yield` la pornire și pe cel de după la oprire. `on_event` e depreciat în favoarea lui." },
    { id: "asgi-13", lvl: 2, q: "Ce garantează `BackgroundTasks` din FastAPI?", o: [
      "Rulează funcția după trimiterea răspunsului, în același proces; dacă procesul moare, sarcina se pierde",
      "Pune sarcina într-o coadă durabilă, cu retry",
      "Rulează sarcina într-un proces separat",
      "Întârzie răspunsul până termină sarcina"],
      ctx: "Uneori vrei să răspunzi repede și să faci după aceea ceva mic: un email, un log de audit, o invalidare de cache.",
      e: "`BackgroundTasks` e convenabil pentru lucruri mici: clientul primește răspunsul, apoi sarcina rulează în același worker. Nu are coadă, retry sau persistență; pentru lucru care nu are voie să se piardă folosești Celery." },
    { id: "asgi-14", lvl: 1, q: "Ce face prima linie din test?", code: R`app.dependency_overrides[get_db] = (
    lambda: fake_db)
client = TestClient(app)
r = client.get("/alerts")`, o: [
      "Endpoint-urile care cer `Depends(get_db)` primesc `fake_db`, fără schimbări în cod",
      "Înlocuiește `get_db` peste tot în proces, și în afara FastAPI",
      "Dezactivează dependența: endpoint-ul primește `None`",
      "Pornește o bază de date de test"],
      ctx: "`Depends` e mecanismul de dependency injection al FastAPI. `dependency_overrides` e un dicționar pe aplicație.",
      e: "La fiecare cerere, FastAPI caută dependența în `dependency_overrides` și, dacă e acolo, apelează înlocuitorul. Codul endpoint-ului rămâne neschimbat; după test golești dicționarul." },
    { id: "asgi-15", lvl: 2, q: "Funcția întoarce `{\"id\": 1, \"secret\": \"x\"}`. Ce primește clientul?", code: R`class AlertOut(BaseModel):
    id: int

@app.get("/a", response_model=AlertOut)
def get_alert():
    return {"id": 1, "secret": "x"}`, o: [
      "`{\"id\": 1}`: `response_model` validează și filtrează ieșirea",
      "`{\"id\": 1, \"secret\": \"x\"}`: modelul doar documentează schema",
      "422, pentru că există un câmp în plus",
      "500, pentru că dict-ul nu e un `AlertOut`"],
      ctx: "Modelul Pydantic de la intrare validează ce trimite clientul; `response_model` controlează ce trimite serverul.",
      e: "FastAPI trece valoarea întoarsă prin `AlertOut`: câmpurile care nu sunt în model sunt scoase. Așa nu expui din greșeală câmpuri interne." },
    { id: "asgi-16", lvl: 3, q: "Un endpoint cere două dependențe, iar fiecare cere `Depends(get_db)`. De câte ori rulează `get_db` într-o cerere?", o: [
      "O dată: FastAPI ține minte rezultatul unei dependențe pe durata cererii",
      "De două ori, câte o sesiune pentru fiecare dependență",
      "De trei ori, inclusiv pentru endpoint",
      "O dată pentru toată aplicația"],
      ctx: "Dependențele pot depinde la rândul lor de alte dependențe, deci aceeași dependență apare des de mai multe ori în același arbore.",
      e: "Implicit, o dependență e calculată o singură dată pe cerere și refolosită, deci toate primesc aceeași sesiune. Cu `Depends(get_db, use_cache=False)` ai fi primit sesiuni separate." }
  ]);
  Q("frontend", [
    { id: "fe-05", lvl: 1, q: "Pornești de la `n = 0`. Cât e `n` după un click?", code: R`const [n, setN] = useState(0);

function onClick() {
  setN(n + 1);
  setN(n + 1);
  setN(n + 1);
}`, o: ["1", "3", "0", "Eroare: prea multe actualizări de state"],
      ctx: "În React, o componentă e o funcție apelată la fiecare render. `useState` întoarce valoarea pentru render-ul curent și o funcție care cere un render nou.",
      e: "`n` e 0 pe tot parcursul acestui render, deci toate trei apelurile cer `0 + 1`. Cu `setN(x => x + 1)` React aplică funcțiile pe rând și ajungi la 3." },
    { id: "fe-06", lvl: 2, q: "Un `useEffect(() => { ... })` nu are array de dependențe. Când rulează?", o: [
      "După fiecare render al componentei",
      "O singură dată, după primul render",
      "Doar când se schimbă props-urile",
      "Înainte de fiecare render, ca să pregătească datele"],
      ctx: "Al doilea argument al lui `useEffect` e lista de dependențe. Poate lipsi, poate fi `[]` sau poate conține valori din props și state.",
      e: "Fără array, efectul rulează după fiecare commit. Cu `[]` rulează doar după primul render, iar cu `[a, b]` când se schimbă `a` sau `b`." },
    { id: "fe-07", lvl: 2, q: "În dev, un `useEffect` cu `[]` se execută de două ori la mount. De ce?", o: [
      "Strict Mode face un ciclu setup → cleanup → setup în plus, ca să verifice cleanup-ul",
      "Părintele montează componenta de două ori, deci e un bug în aplicație",
      "React randează mereu de două ori, și în producție",
      "Lipsește `key` pe componentă, iar React o recreează"],
      ctx: "Aplicațiile create cu Vite sau Next.js pornesc cu `<StrictMode>` în jurul aplicației. Strict Mode adaugă verificări doar în development.",
      e: "Strict Mode simulează un unmount și un mount imediat după primul mount. Un efect cu cleanup corect nu se vede deloc; unul fără cleanup (interval, subscribe) se dublează." },
    { id: "fe-08", lvl: 2, q: "Userul tastează repede în căutare. Ce poate merge prost?", code: R`useEffect(() => {
  fetch("/api/alerts?q=" + q)
    .then(r => r.json())
    .then(setAlerts);
}, [q]);`, o: [
      "Un răspuns vechi sosește ultimul și suprascrie rezultatul corect",
      "Fetch-ul rulează o singură dată, după primul render",
      "React anulează singur request-urile vechi, deci nimic",
      "`[q]` garantează că răspunsurile vin în ordinea cererilor"],
      ctx: "La fiecare literă `q` se schimbă, deci efectul pornește un request nou. Rețeaua nu garantează ordinea răspunsurilor.",
      e: "Cererile pentru „ad” și „adm” pot reveni în orice ordine. Fără cleanup, ultimul care sosește câștigă. Rezolvi cu un flag `ignore` în cleanup, cu `AbortController` sau cu TanStack Query." },
    { id: "fe-09", lvl: 1, q: "Vrei să verifici că mesajul de eroare NU apare. Ce query din Testing Library folosești?", o: [
      "`queryByText`: întoarce `null` dacă nu găsește",
      "`getByText`: întoarce `null` dacă nu găsește",
      "`findByText`: așteaptă, apoi întoarce `null`",
      "`getAllByText`: întoarce o listă goală"],
      ctx: "Testing Library are trei familii de query-uri: `getBy`, `queryBy` și `findBy`, fiecare cu varianta `All`. Diferă prin ce fac când elementul lipsește.",
      e: "`getBy` și `getAllBy` aruncă excepție dacă nu găsesc nimic, iar `findBy` întoarce un Promise care eșuează după timeout. Pentru „nu există” folosești `queryBy`." },
    { id: "fe-10", lvl: 2, q: "Ce tip dai rezultatului `await res.json()` dintr-un API extern?", o: [
      "`unknown`: te obligă să verifici forma înainte s-o folosești",
      "`any`: e mai sigur, pentru că acceptă orice formă",
      "`unknown`: TypeScript verifică forma la runtime",
      "Oricare: `any` și `unknown` se comportă identic"],
      ctx: "`res.json()` întoarce date pe care compilatorul nu le cunoaște. TypeScript are două tipuri „orice”: `any` și `unknown`.",
      e: "Cu `any` compilatorul te lasă să faci orice, deci greșelile ajung la runtime. Cu `unknown` nu poți folosi valoarea până nu o îngustezi (verificare manuală, type guard sau zod)." },
    { id: "fe-11", lvl: 3, q: "Ce face `const n: never = x` în ramura `default`?", code: R`type State =
  | { s: "loading" }
  | { s: "error"; msg: string }
  | { s: "ok"; data: Alert[] };

function label(x: State) {
  switch (x.s) {
    case "loading": return "…";
    case "ok": return "OK";
    default: {
      const n: never = x;
      return n;
    }
  }
}`, o: [
      "Dă eroare la compilare: cazul `error` nu e tratat",
      "Aruncă excepție la runtime când `s` e `error`",
      "Nimic: compilatorul ignoră tipul `never`",
      "Transformă `x` în `null` pentru cazurile netratate"],
      ctx: "`State` e un union discriminat: câmpul comun `s` spune care variantă e. În fiecare `case`, TypeScript îngustează tipul lui `x`.",
      e: "După `loading` și `ok`, în `default` a rămas `{ s: \"error\" }`, care nu se poate atribui lui `never`. Compilarea pică, deci afli de cazul uitat înainte de rulare." },
    { id: "fe-12", lvl: 2, q: "Un SPA React se autentifică la Keycloak. Ce flux e recomandat azi?", o: [
      "Authorization Code cu PKCE, sau un BFF care ține tokenurile pe server",
      "Implicit grant: tokenul vine direct în URL, fără server",
      "Password grant: SPA-ul trimite parola userului la Keycloak",
      "Client Credentials, cu secretul clientului în bundle-ul JS"],
      ctx: "Un SPA e un client public: tot codul lui ajunge în browser, deci nu poate păstra un secret. OAuth 2.0 are mai multe fluxuri (grant types).",
      e: "RFC 9700 cere PKCE pentru clienții publici și descurajează implicit grant. RFC 10017 (2026) pune BFF-ul primul ca securitate: tokenurile nu ajung deloc în browser." },
    { id: "fe-13", lvl: 2, q: "API-ul răspunde cu `Access-Control-Allow-Origin: *`, iar frontendul face `fetch(url, { credentials: \"include\" })`. Ce se întâmplă?", o: [
      "Browserul blochează răspunsul: cu credentials, originea trebuie numită explicit",
      "Merge: `*` acceptă orice origine, inclusiv cu cookies",
      "Serverul respinge cererea cu 401",
      "Cookie-urile ajung la server, dar body-ul răspunsului e gol"],
      ctx: "Frontendul (`app.example.com`) și API-ul (`api.example.com`) au origini diferite. Browserul aplică CORS: citești răspunsul doar dacă serverul permite explicit originea ta.",
      e: "Pentru cereri cu credentials, `*` nu e acceptat. Serverul trebuie să întoarcă originea exactă și `Access-Control-Allow-Credentials: true`. Blocajul e în browser, nu pe server." },
    { id: "fe-14", lvl: 3, q: "`fetchB` respinge după 100 ms; `fetchA` și `fetchC` durează 2 s. Ce se întâmplă?", code: R`const r = await Promise.all([
  fetchA(), fetchB(), fetchC(),
]);`, o: [
      "`await` aruncă după ~100 ms; A și C continuă să ruleze",
      "`await` aruncă după 2 s, când s-au terminat toate",
      "A și C sunt anulate automat la eșecul lui B",
      "`r` conține două rezultate și eroarea lui B"],
      ctx: "`Promise.all` așteaptă mai multe promisiuni în paralel. Există și `Promise.allSettled`, care nu respinge niciodată.",
      e: "`Promise.all` respinge la primul eșec, dar o promisiune nu se poate anula, deci A și C își termină treaba. Ca să aștepți toate rezultatele, folosești `allSettled`; ca să le oprești, `AbortController`." }
  ]);
})(window.PREP);
