/* Proba tehnică (după interviul cu managerul): fișele modulelor noi, OOP și asyncio. */
(function (P) {
  P.sheets.oop = {
    lead: "În Python, o clasă există ca să țină date împreună cu invarianții și comportamentul lor. Restul poate fi o funcție.",
    points: [
      "Data model: `__repr__` pentru debugging, `__eq__` pentru egalitate de valoare. Dacă definești `__eq__` fără `__hash__`, Python pune `__hash__ = None`: obiectele nu mai pot intra în `set` sau ca chei de `dict`.",
      "`__new__` creează instanța (rar: tipuri imutabile, subclase de `int`/`str`, cache de instanțe); `__init__` o inițializează. Aproape mereu îți trebuie doar `__init__`.",
      "Atribut de clasă vs atribut de instanță: o listă declarată în corpul clasei e una singură, împărțită de toate instanțele. Starea per obiect se creează în `__init__` (sau cu `field(default_factory=list)`).",
      "`@property`: atribut calculat sau validat fără să schimbi interfața (`obj.x` rămâne `obj.x`). Nu scrii getteri și setteri ca în Java. `functools.cached_property` calculează o dată și păstrează rezultatul în `__dict__`.",
      "`@classmethod` primește clasa: constructori alternativi (`Finding.from_dict(d)`) care funcționează și pentru subclase. `@staticmethod`: o funcție pusă în clasă doar pentru că ține logic de ea.",
      "Compoziție înaintea moștenirii: un `Scanner` care primește un `Notifier` („are un”) se testează cu un fake și se schimbă ușor. Moștenirea („este un”) leagă strâns codul de detaliile părintelui.",
      "Moștenire multiplă: ordinea de căutare e MRO, calculată cu C3 (`Clasa.__mro__`). `super()` cheamă următoarea clasă din MRO, nu neapărat părintele direct; mixin-urile cooperative cheamă mereu `super()`.",
      "ABC + `@abstractmethod`: contract nominal; o subclasă care nu implementează metoda nu poate fi instanțiată (`TypeError`). `typing.Protocol`: contract structural, verificat static (duck typing); `@runtime_checkable` verifică la `isinstance` doar că metodele există.",
      "`@dataclass`: generează `__init__`, `__repr__`, `__eq__`. `frozen=True` → imutabil și hashable; `slots=True` (3.10+) → fără `__dict__`, mai puțină memorie; `kw_only=True` (3.10+) → argumente doar cu nume.",
      "SOLID, pythonic: o responsabilitate pe clasă; extinzi prin strategii injectate, nu prin `if tip == ...`; o subclasă respectă contractul părintelui (Liskov: aceeași semnătură, fără precondiții mai stricte); depinzi de abstracții primite în constructor, deci testezi cu fake-uri.",
      "Fără clase inutile: o strategie poate fi o funcție (`sorted(key=...)`), cleanup-ul garantat e un context manager (`with`), iar un modul e deja un „singleton”.",
      "Patterns de recunoscut: Adapter (interfață comună peste SIEM-uri diferite), Observer (ascultători la „alertă creată”), Strategy + registry (reguli interschimbabile, k12), Unit of Work (`Session` din SQLAlchemy), Factory (`@classmethod from_dict`). În Python multe devin funcții sau module."
    ],
    avoid: ["„Moștenirea e principalul mod de reutilizare a codului.”", "„Fac getter și setter pentru fiecare atribut.”", "„`super()` cheamă mereu clasa părinte directă.”", "„Pun o listă goală ca atribut de clasă, ca valoare implicită.”"]
  };

  P.sheets.asyncio = {
    lead: "asyncio înseamnă concurență cooperativă pe un singur thread: o corutină cedează controlul doar la `await`.",
    points: [
      "Event loop: rulează corutinele pe rând. Când o corutină face `await` pe I/O (socket, timer), bucla trece la alta gata de rulat. Nu e paralelism: tot un singur thread execută cod Python.",
      "Un apel blocant într-o corutină (`time.sleep`, `requests.get`, un driver DB sincron, calcul greu) oprește toată bucla: toate celelalte request-uri așteaptă. Pentru I/O sincron: `await asyncio.to_thread(f, ...)` (3.9+); pentru CPU: procese.",
      "`asyncio.gather(*aws)`: rulează concurent și întoarce rezultatele în ordinea argumentelor. La prima excepție, `await gather(...)` o ridică, dar celelalte task-uri NU sunt anulate; cu `return_exceptions=True` primești excepțiile ca valori.",
      "`asyncio.TaskGroup` (3.11+): `async with asyncio.TaskGroup() as tg: tg.create_task(...)`. La prima eroare anulează restul task-urilor și ridică `ExceptionGroup` (prins cu `except*`).",
      "Timeout: `async with asyncio.timeout(5):` (3.11+) sau `asyncio.wait_for(aw, 5)`. La expirare task-ul e anulat: primește `CancelledError` la următorul `await`, iar în afară vezi `TimeoutError`.",
      "Anulare: `CancelledError` moștenește `BaseException` (din 3.8), deci `except Exception` nu o prinde. Dacă o prinzi pentru cleanup, o ridici din nou; altfel anularea nu mai funcționează.",
      "Limitezi concurența: `asyncio.Semaphore(n)` sau N workeri care consumă o `asyncio.Queue`. Fără limită, 50.000 de task-uri deschid 50.000 de conexiuni deodată.",
      "`asyncio.create_task` fără referință: bucla ține doar o referință slabă, deci task-ul poate fi colectat de GC, iar excepțiile lui se pierd. Păstrezi task-ul (de exemplu într-un `set`) și îl aștepți sau îl anulezi la oprire.",
      "Primitivele asyncio (`Queue`, `Lock`, `Event`) nu sunt thread-safe. Din alt thread trimiți lucru în buclă cu `loop.call_soon_threadsafe` sau `asyncio.run_coroutine_threadsafe`.",
      "Când asyncio, când threads: asyncio pentru multe conexiuni I/O cu biblioteci async (httpx, asyncpg); threads când bibliotecile sunt sincrone; procese pentru calcul.",
      "FastAPI: un endpoint `async def` rulează direct pe bucla evenimentelor, deci nu ai voie să blochezi în el; un endpoint `def` rulează în threadpool-ul AnyIO (implicit, cel mult 40 de apeluri în paralel)."
    ],
    avoid: ["„asyncio rulează corutinele pe mai multe core-uri.”", "„Dacă pun `async` în fața funcției, codul devine non-blocant.”", "„`gather` anulează celelalte task-uri la prima eroare.”"]
  };
})(window.PREP);
