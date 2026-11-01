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
  }
];
