<!-- Python: structuri de date și idiomuri. Variantele greșite: B, C, D = ordinea din sursă (A e cea corectă). -->

### py-05
Pe scurt: Un `set`: verificarea `ip in blocked` durează în medie O(1), pentru că elementul e găsit direct, prin hash, nu prin parcurgere.
Scop: La milioane de verificări, diferența dintre O(1) și O(n) e diferența dintre milisecunde și ore.
Mecanism: Un set calculează `hash(ip)` și sare direct la poziția din tabela internă unde ar trebui să fie elementul. O listă compară elementul cu fiecare dintre cele 100.000 de valori, până îl găsește sau ajunge la final.
Pas cu pas:
```text
list: ip in blocked
  -> până la 100.000 de comparații
set: ip in blocked
  -> hash(ip) -> poziția -> 1–2 comparații
1M verificări: ~10^11 vs ~10^6 operații
```
Aplicare:
```python
blocked = set(load_blocked_ips())
for ev in events:
    if ev.ip in blocked:
        alert(ev)
```
Legătură: E aceeași idee ca un index pe o coloană (IDX-12): în loc să parcurgi tot, sari direct la locul potrivit.
Limită: Elementele trebuie să fie hashable (str, int, tuple de imutabile), deci o listă nu poate intra într-un set. Iar pentru intervale de IP-uri (CIDR) ai nevoie de altă abordare, de exemplu modulul `ipaddress`.
La interviu: „Folosesc un `set`: `in` e O(1) în medie, prin hash, față de O(n) pe o listă. La milioane de verificări pe 100.000 de elemente, diferența e uriașă.”
Verificare: Scrii `if ip in set(blocked_list):` la fiecare verificare. Ce ai câștigat?
Răspuns verificare: Nimic, chiar pierzi: construirea set-ului costă O(n) la fiecare verificare. Îl construiești o singură dată și îl refolosești.
Varianta greșită B: Parcurgerea listei costă O(n) la fiecare verificare: 100.000 de comparații, de milioane de ori.
Varianta greșită C: Un tuple e tot o secvență parcursă element cu element. Imutabilitatea nu accelerează căutarea.
Varianta greșită D: `in` pe un string caută subșiruri, deci e lent și greșit: `"1.2.3.4"` se găsește și în `"11.2.3.45"`.

### py-06
Pe scurt: `collections.deque` adaugă și scoate elemente la ambele capete în O(1), iar cu `maxlen` devine direct o fereastră glisantă.
Scop: Ferestrele glisante apar des: ultimele N evenimente, rate limiting, detectarea unui atac de tip brute force. Cu structura greșită, fiecare pas costă O(n).
Mecanism: O listă Python e un array: `pop(0)` scoate primul element și mută toate celelalte cu o poziție, deci costă O(n). `deque` e construit din blocuri legate între ele, cu acces ieftin la ambele capete, așa că `popleft()` și `append()` sunt O(1).
Pas cu pas:
```text
list [a, b, c, d].pop(0)
  -> mută b, c, d cu o poziție: O(n)
deque.popleft() -> O(1)
deque(maxlen=3) cu [a, b, c]
  append(d) -> [b, c, d], a iese singur
```
Aplicare: Încercările eșuate de login din ultimele 60 de secunde:
```python
attempts = deque()

def failed_login(now):
    attempts.append(now)
    while attempts[0] < now - 60:
        attempts.popleft()
    return len(attempts) > 5
```
Legătură: E structura din exercițiul de brute force din secțiunea de live coding: încercările noi intră la dreapta, cele vechi ies la stânga.
Limită: Accesul după index în mijlocul unui `deque` (`d[5000]`) e O(n). Dacă ai nevoie de acces aleator, lista rămâne mai bună.
La interviu: „Pentru o fereastră glisantă folosesc `collections.deque`: `append` și `popleft` sunt O(1), iar `maxlen` scoate automat elementele vechi. `list.pop(0)` e O(n), pentru că mută toate elementele.”
Verificare: Pentru o coadă FIFO într-un singur thread folosești `list.append` și `list.pop(0)`. Ce schimbi?
Răspuns verificare: Treci la `deque`, cu `append` și `popleft`: aceleași operații, dar O(1) în loc de O(n). Între threaduri folosești `queue.Queue`.
Varianta greșită B: `pop(0)` mută toate elementele rămase cu o poziție, deci fiecare scoatere costă O(n).
Varianta greșită C: Un dict cu chei numerice poate simula o coadă, dar e complicat de întreținut și n-are operații directe la capete. `deque` e făcut exact pentru asta.
Varianta greșită D: `heapq` e o coadă de priorități: scoate mereu cel mai mic element, nu pe cel mai vechi.

### py-07
Pe scurt: `is` verifică dacă două nume indică același obiect; `==` verifică dacă două obiecte au aceeași valoare, apelând `__eq__`.
Scop: Eviți un bug subtil: `is` pe numere sau stringuri pare să meargă în teste și eșuează în producție.
Mecanism: Fiecare obiect are o identitate (`id(obj)`), stabilă cât trăiește obiectul. `a is b` compară identitățile; `a == b` le cere obiectelor să-și compare valorile. Două liste create separat, cu același conținut, sunt egale, dar nu identice.
Pas cu pas:
```text
a = [1]; b = [1]; c = a
a == b -> True  (aceeași valoare)
a is b -> False (obiecte diferite)
a is c -> True  (același obiect)
x is None -> forma corectă
```
Aplicare: Folosești `is` doar pentru singleton-uri: `None`, `True`, `False` și obiecte-santinelă proprii. Pentru orice comparație de valori folosești `==`.
Legătură: În JavaScript, `===` pe obiecte compară referința: `[1] === [1]` e `false`. În Python, pentru referință folosești `is`, iar `==` compară conținutul.
Limită: `is` pe int-uri mici sau pe unele stringuri poate da `True` din cauza cache-ului intern al CPython (de exemplu, int-urile de la -5 la 256). E un detaliu de implementare, nu o garanție, iar Python afișează `SyntaxWarning` când folosești `is` cu un literal.
La interviu: „`is` compară identitatea, adică dacă e același obiect; `==` compară valorile, prin `__eq__`. Folosesc `is` doar pentru `None` și alte singleton-uri.”
Verificare: `a` și `b` sunt amândouă 1000, dar calculate separat. Ce dă `a == b`? Dar `a is b`?
Răspuns verificare: `a == b` e mereu `True`. `a is b` poate fi `True` sau `False`, după cum a creat CPython obiectele. Tocmai de aceea nu folosești `is` pentru numere.
Varianta greșită B: Nu dau mereu același rezultat: două liste cu același conținut sunt `==`, dar nu `is`.
Varianta greșită C: E invers: `is` compară identitatea, iar `==` compară valorile.
Varianta greșită D: `is` funcționează pentru orice obiect. La numere și stringuri doar pare să meargă uneori, din cauza cache-ului intern, și tocmai de aceea e periculos.

### py-08
Pe scurt: Un context manager garantează că `__exit__`, adică cleanup-ul, rulează la ieșirea din bloc, chiar dacă blocul aruncă o excepție.
Scop: Resursele (fișiere, lock-uri, conexiuni, tranzacții) se eliberează sigur, fără `try`/`finally` scris de mână peste tot.
Mecanism: `with x as y:` apelează `x.__enter__()` și pune rezultatul în `y`. La ieșirea din bloc, normal sau printr-o excepție, apelează `x.__exit__(tip, valoare, traceback)`. Dacă `__exit__` întoarce `True`, excepția e suprimată; altfel merge mai departe.
Pas cu pas:
```text
with lock: -> lock.__enter__()
  actualizează() -> ValueError
-> lock.__exit__(ValueError, ...)
-> lock-ul e eliberat
-> ValueError merge mai departe
```
Aplicare: Îți scrii propriul context manager cu `contextlib`:
```python
@contextmanager
def timer(name):
    t0 = time.perf_counter()
    try:
        yield
    finally:
        log.info("%s: %.3f s", name,
                 time.perf_counter() - t0)
```
Legătură: Ai folosit deja `with transaction.atomic():` în Django: commit la final, rollback dacă blocul aruncă excepție.
Limită: Context managerul nu prinde excepțiile: ele se propagă după cleanup, cu excepția cazului în care `__exit__` întoarce explicit `True`, cum face `contextlib.suppress`.
La interviu: „Un context manager garantează cleanup-ul: `__exit__` rulează la ieșirea din bloc, inclusiv la excepție. Îl folosesc pentru fișiere, lock-uri, sesiuni și tranzacții, iar pe ale mele le scriu cu `contextlib.contextmanager`.”
Verificare: În `timer` de mai sus scoți `try`/`finally` și lași doar `yield`, urmat de log. Ce se întâmplă dacă blocul `with` aruncă excepție?
Răspuns verificare: Excepția e aruncată în generator, la `yield`, deci linia de log nu mai rulează. Fără `finally`, cleanup-ul se face doar când totul merge bine.
Varianta greșită B: `with` nu pornește threaduri: blocul rulează imediat, în același thread.
Varianta greșită C: Excepțiile se propagă normal după cleanup. Doar un `__exit__` care întoarce `True` le suprimă.
Varianta greșită D: `with` nu partajează nimic între threaduri. Ce face depinde de obiect: `with lock:`, de exemplu, doar sincronizează accesul.

### py-09
Pe scurt: Afișează `6 0`: primul `sum` consumă generatorul, iar al doilea găsește un generator deja epuizat, deci suma e 0.
Scop: E o capcană frecventă: refolosești un generator sau un iterator (rezultatul lui `map`, un cursor DB) și a doua trecere iese goală, fără nicio eroare.
Mecanism: Expresia generator produce valorile leneș, câte una (0, 2, 4), când îi sunt cerute. Primul `sum` le cere pe toate, până la `StopIteration`. Generatorul nu se resetează, deci al doilea `sum` primește imediat `StopIteration` și întoarce suma unei secvențe goale: 0.
Pas cu pas:
```text
sum(gen): 0 + 2 + 4 = 6
gen e epuizat
sum(gen): nicio valoare -> 0
print -> 6 0
```
Aplicare: Dacă ai nevoie de mai multe treceri, materializezi o listă (`vals = [x * 2 for x in range(3)]`) sau recreezi generatorul. Generatorul e potrivit când parcurgi o singură dată date mari, de exemplu liniile unui fișier de log.
Legătură: Seamănă cu un cursor DB sau cu un stream: odată citit, nu-l mai poți citi de la capăt fără să-l redeschizi.
Limită: Avantajul generatorului e memoria constantă, indiferent câte valori produce; lista le ține pe toate în memorie.
La interviu: „Un generator e un iterator: se consumă la prima parcurgere și nu se resetează, deci al doilea `sum` primește o secvență goală și dă 0. Pentru mai multe treceri materializez o listă.”
Verificare: Ce afișează `it = map(str, [1, 2]); print(list(it), list(it))`?
Răspuns verificare: `['1', '2'] []`: `map` întoarce tot un iterator, care se epuizează la prima parcurgere.
Varianta greșită B: Ar fi `6 6` doar dacă generatorul s-ar reseta, dar nu se resetează: a doua parcurgere nu mai are valori.
Varianta greșită C: Primul `sum` primește toate valorile (0, 2 și 4), deci 6. Doar al doilea găsește generatorul epuizat.
Varianta greșită D: `sum` acceptă orice iterabil, inclusiv un generator epuizat, pentru care întoarce pur și simplu 0.

### py-10
Pe scurt: `groupby` grupează doar elementele consecutive cu aceeași cheie, deci pe o listă nesortată primești grupuri fragmentate; sortezi întâi, după aceeași cheie.
Scop: E o capcană clasică: codul pare corect, testele mici trec, iar pe date reale apar grupuri duplicate.
Mecanism: `groupby` parcurge lista o singură dată și începe un grup nou de fiecare dată când cheia diferă de cea a elementului anterior. Nu ține minte grupurile de dinainte, deci același user poate apărea în mai multe grupuri.
Pas cu pas:
```text
events: [ana, bob, ana]
groupby -> ana:1, bob:1, ana:1
sortat: [ana, ana, bob]
groupby -> ana:2, bob:1
```
Aplicare:
```python
by_user = defaultdict(list)
for e in events:
    by_user[e.user].append(e)
```
Sau sortezi cu `sorted(events, key=k)` și apoi aplici `groupby(..., key=k)`, cu aceeași cheie. Pentru simplă numărare: `Counter(e.user for e in events)`.
Legătură: `GROUP BY` din SQL grupează indiferent de ordine. `groupby` din Python seamănă mai degrabă cu `uniq` din Linux, care unește doar liniile consecutive identice.
Limită: Sortarea costă O(n log n). Dacă datele vin deja ordonate, de exemplu din SQL cu `ORDER BY user`, `groupby` e ideal: o singură trecere, fără memorie în plus.
La interviu: „`itertools.groupby` grupează doar elementele consecutive, deci pe date nesortate sortez întâi după aceeași cheie sau folosesc `defaultdict(list)` ori `Counter`.”
Verificare: Evenimentele vin din SQL cu `ORDER BY created_at`, iar tu faci `groupby` după `user`. Ce obții?
Răspuns verificare: Grupuri fragmentate: datele sunt sortate după timp, nu după user, deci același user apare în multe grupuri. Ai nevoie de `ORDER BY user` sau de `defaultdict`.
Varianta greșită B: Spre deosebire de `GROUP BY` din SQL, `groupby` nu ține minte grupurile anterioare: grupează doar elementele consecutive.
Varianta greșită C: `groupby` nu verifică ordinea și nu aruncă nicio eroare: întoarce în tăcere grupuri fragmentate.
Varianta greșită D: `groupby` nu sortează nimic. Sortarea o faci tu, înainte, cu aceeași cheie.

### py-11
Pe scurt: `raise DomainError(...) from e` ridică excepția nouă și păstrează excepția originală drept cauză, vizibilă în traceback.
Scop: La granița dintre straturi transformi o eroare tehnică (de driver DB, de HTTP) într-una de domeniu, fără să pierzi informația de debugging.
Mecanism: Excepția originală e salvată în atributul `__cause__` al celei noi. Traceback-ul le afișează pe amândouă, legate prin mesajul „The above exception was the direct cause of the following exception”. Fără `from`, Python păstrează oricum contextul (`__context__`), dar cu mesajul „During handling of the above exception, another exception occurred”, care sugerează un bug în handler.
Pas cu pas:
```text
except IntegrityError as e:
  raise DuplicateOrder(oid) from e
traceback:
  IntegrityError (cauza)
  „direct cause of”
  DuplicateOrder
```
Aplicare:
```python
try:
    row = session.execute(stmt).one()
except NoResultFound as e:
    raise AlertNotFound(alert_id) from e
```
Legătură: E echivalentul lui `cause` din JavaScript (`new Error(msg, { cause: e })`): eroarea de sus o poartă pe cea de jos.
Limită: `raise ... from None` suprimă explicit cauza, util când eroarea originală e doar zgomot sau conține date sensibile. Îl folosești rar, pentru că pierzi informație de debugging.
La interviu: „`raise ... from e` înlănțuiește excepțiile: eroarea de domeniu păstrează cauza tehnică în `__cause__`, iar traceback-ul le arată pe amândouă. Așa traduc erorile de driver în erori de domeniu fără să pierd cauza.”
Verificare: Într-un `except KeyError` scrii, din grabă, `raise ValueError("x")`, fără `from`. Se pierde `KeyError`-ul?
Răspuns verificare: Nu: Python îl păstrează automat în `__context__`, iar traceback-ul îl arată cu mesajul „During handling of the above exception...”. `from e` face legătura explicită și mesajul mai clar.
Varianta greșită B: Excepția originală nu e ascunsă: rămâne în `__cause__` și apare în traceback. O ascunzi explicit, cu `from None`.
Varianta greșită C: `from` nu reîncearcă nimic: doar leagă excepția nouă de cauza ei.
Varianta greșită D: Nu se transformă nimic în warning: excepția nouă e ridicată normal și oprește execuția dacă nu o prinde nimeni.

### py-12
Pe scurt: `frozen=True` face instanțele imutabile și hashable; `slots=True` elimină `__dict__`-ul fiecărei instanțe, deci obiectele ocupă mai puțină memorie.
Scop: Pentru obiecte-valoare (un eveniment, o cheie de cache, rezultatul unei scanări) vrei imutabilitate și posibilitatea de a le pune în set-uri sau ca chei de dict.
Mecanism: `frozen=True` generează un `__setattr__` care aruncă `FrozenInstanceError` și un `__hash__` calculat din câmpuri. `slots=True` (din 3.10) creează clasa cu `__slots__`: atributele stau în poziții fixe, nu într-un dict separat pentru fiecare instanță, deci obiectele sunt mai mici și accesul e puțin mai rapid.
Pas cu pas:
```text
f = Finding("SAP1", "R7", 3)
f.rule = "R8" -> FrozenInstanceError
{f}           -> merge (hashable)
f.extra = 1   -> eroare (nu se poate)
```
Aplicare:
```python
@dataclass(frozen=True, slots=True)
class Finding:
    system_id: str
    rule: str
    severity: int

seen: set[Finding] = set()
```
Legătură: Seamănă cu un `NamedTuple`, dar cu valori implicite, metode și `field(...)`. Pentru validarea tipurilor la runtime rămâi la Pydantic.
Limită: Imutabilitatea e doar la suprafață: dacă un câmp e o listă, lista însăși poate fi modificată. Folosești câmpuri imutabile (tuple, frozenset). Și dataclass nu validează tipurile.
La interviu: „`frozen=True` face instanțele imutabile și hashable, deci le pot folosi în set-uri sau ca chei de dict. `slots=True`, din 3.10, elimină `__dict__`-ul per instanță și reduce memoria. Validare de tipuri nu aduce: pentru asta folosesc Pydantic.”
Verificare: `Finding` mai are un câmp `tags: list`, iar `f = Finding("SAP1", "R7", 3, ["x"])`. Merge `f.tags.append("y")`?
Răspuns verificare: Da: `frozen` interzice doar reasignarea câmpului, nu modificarea listei din el. În plus, `hash(f)` aruncă acum `TypeError`, pentru că lista nu e hashable.
Varianta greșită B: dataclass nu validează tipurile la runtime: `Finding(1, 2, "x")` merge fără eroare. Validarea e treaba lui Pydantic.
Varianta greșită C: dataclass nu generează metode de serializare JSON. Folosești `dataclasses.asdict()`, apoi `json.dumps`.
Varianta greșită D: dataclass n-are legătură cu baza de date. Persistența e treaba unui ORM, ca SQLAlchemy.

### py-13
Pe scurt: Afișează `[[1, 0], [1, 0]]`: `* 2` pe lista exterioară pune de două ori aceeași listă interioară, deci modificarea apare în ambele rânduri.
Scop: E capcana clasică la inițializarea matricilor (grid-uri, tabele de programare dinamică) și apare des în exercițiile de live coding.
Mecanism: `[0] * 2` creează lista `[0, 0]`. Apoi `[lista] * 2` creează o listă cu două referințe la același obiect, nu două copii. `a[0][0] = 1` modifică acel unic obiect, iar `a[1]` e chiar el, deci arată la fel.
Pas cu pas:
```text
inner = [0, 0]
a = [inner, inner]  (același obiect)
a[0][0] = 1 -> inner devine [1, 0]
print(a) -> [[1, 0], [1, 0]]
```
Aplicare:
```python
a = [[0] * 2 for _ in range(2)]
a[0][0] = 1
# [[1, 0], [0, 0]]
```
Legătură: Leagă-l de PY-07: `a[0] is a[1]` e `True`, deci e un singur obiect cu două referințe.
Limită: Pentru numere, `[0] * 2` e sigur: int-urile sunt imutabile, deci o atribuire înlocuiește elementul, nu modifică obiectul. Problema apare doar cu obiecte mutabile (liste, dict-uri, set-uri).
La interviu: „`[[0] * 2] * 2` repetă referința la aceeași listă interioară, deci o modificare apare în toate rândurile. Creez fiecare rând separat, cu o list comprehension.”
Verificare: Ce afișează `d = dict.fromkeys(["a", "b"], []); d["a"].append(1); print(d)`?
Răspuns verificare: `{'a': [1], 'b': [1]}`: `fromkeys` pune aceeași listă la toate cheile. Corect: `{k: [] for k in keys}`.
Varianta greșită B: Așa ar fi dacă rândurile ar fi liste separate. Aici ambele rânduri sunt același obiect.
Varianta greșită C: `a[0][0] = 1` schimbă doar primul element al listei interioare. Al doilea rămâne 0.
Varianta greșită D: Operația e validă: o listă se poate înmulți cu un întreg, iar elementele ei se pot modifica.
