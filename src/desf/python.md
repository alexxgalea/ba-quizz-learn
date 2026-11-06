<!-- Desfășurările fișei `python` (10 puncte). Format și reguli: lib.mjs (checkDesf), .scratch/desfasurari/spec.md. Faptele: research/interview-facts.md, secțiunile 3, 4, 10 și 20. -->

### harta
Problema: Un script Python merge în demo, dar în producție dă rezultate care depind de apelurile anterioare, își umple memoria pe un fișier mare și lasă resurse deschise. Cauza e aproape mereu un detaliu al limbajului: când se evaluează o expresie, cine ține o referință la ce și de câte ori poți parcurge o valoare. Modulul răspunde la trei întrebări: ce se întâmplă „în spate”, cum procesezi mult fără să încarci tot și cum garantezi curățenia.
Grupuri:
- 1–3: când se evaluează o expresie și ce înseamnă „același obiect” (valori implicite, closures, `is`)
- 4–6: cod care ține stare sau învelește alt cod (generatori, decoratori, context managers)
- 7–8: structura potrivită (colecții cu cost cunoscut, `dataclass`)
- 9: cum propagi o eroare fără să pierzi cauza
- 10: gruparea pe chei consecutive

### 1
Problema: `add_event("a")` și apoi `add_event("b")` întorc aceeași listă, cu `"a"` în ea la al doilea apel. Funcția are `events=[]`.
Ideea: Python evaluează valoarea implicită o singură dată, când rulează `def`. Toate apelurile împart același obiect. Ca soluție, pui `None` implicit și `if x is None: x = []` în corp.
Exemplu:
```python
def add(x, acc=[]):
    acc.append(x)
    return acc
add(1)
add(2)  # → [1, 2]
add.__defaults__  # → ([1, 2],)
```
În C++: Seamănă cu un argument implicit: `std::vector<int> acc = std::vector<int>()`.
Unde nu ține: În C++, argumentul implicit se evaluează la fiecare apel în care îl omiți, deci primești mereu un vector nou. În Python, expresia rulează o dată, la `def`.
Legătură: PY-01. În Django, `JSONField(default=[])` dă eroarea `fields.E010`; scrii `default=list`.

### 2
Greu: da
Problema: Creezi trei callback-uri într-o buclă, fiecare cu alt `i`. Apelate mai târziu, toate întorc `2`.
Ideea: Un closure ține variabila, nu valoarea ei. Python citește `i` în momentul apelului, când bucla s-a terminat. Cu `lambda i=i: i` valoarea rămâne cea de la definire, fiindcă valoarea implicită se evaluează atunci (punctul 1).
Exemplu:
```python
r = range(3)
fs = [lambda: i for i in r]
[f() for f in fs]  # → [2, 2, 2]
gs = [lambda i=i: i for i in r]
[g() for g in gs]  # → [0, 1, 2]
```
În C++: Un lambda cu `[i]` copiază valoarea la creare și întoarce 0, 1, 2. Cu `[&i]` ține o referință la variabilă, ca un closure Python.
Unde nu ține: În C++, `i` moare odată cu bucla, deci apelul prin `[&i]` e comportament nedefinit. În Python variabila trăiește cât o ține closure-ul, așa că vezi doar ultima valoare.
Legătură: PY-02. În JavaScript, `var` într-o buclă dă același rezultat (`[3, 3, 3]`), iar `let` face o legare nouă la fiecare iterație.

### 3
Greu: da
Problema: Două liste cu aceleași elemente dau `False` la `is`. Iar `x == None` poate da `True` când `x` are un `__eq__` scris greșit.
Ideea: `==` întreabă „au aceeași valoare?” și cheamă `__eq__`. `is` întreabă „e chiar același obiect?” și nu poate fi suprascris. Pentru singleton-uri scrii `is None`: există un singur `None`. Pe numere și șiruri nu folosi `is`: CPython refolosește unele obiecte, dar e un detaliu de implementare.
Exemplu:
```python
a = [1]
b = [1]
c = a
a == b  # → True
a is b  # → False
a is c  # → True
```
În C++: `a == b` cheamă `operator==`, iar `&a == &b` compară adresele. Asta face `is`.
Unde nu ține: În Python n-ai pointeri expliciți: fiecare nume e o referință, iar `is` compară obiectele spre care arată. Adresa nu apare nicăieri în cod.
Legătură: PY-07. PY-13 arată același obiect repetat: în `[[0] * 2] * 2`, ambele rânduri sunt aceeași listă.

### 4
Greu: da
Problema: Procesezi un log de 50 GB cu `f.readlines()` pe o mașină cu 8 GB de RAM. Procesul moare înainte să filtreze prima eroare.
Ideea: Un generator (`yield`) produce o valoare, apoi se oprește și își păstrează variabilele locale. Corpul lui rulează abia la primul `next`. Ții un element în memorie, nu tot fișierul. Îl parcurgi o singură dată; a doua oară e gol. Generatorii se înlănțuie (`citește → filtrează → parsează`), deci un pipeline procesează fișiere oricât de mari. Capcană: o eroare din interior apare abia când consumi, nu când creezi.
Exemplu:
```python
def errs(lines):
    for l in lines:
        if "E" in l:
            yield l
e = errs(["a", "E1", "E2"])
print(next(e))  # → E1
print(list(e))  # → ['E2']
print(list(e))  # → []
```
În C++: Cel mai aproape din C++17 e `std::istream_iterator`: citește o valoare la fiecare `++` și se parcurge o singură dată. Iteratorii `begin`/`end` ai unui container parcurg o colecție care există deja.
Unde nu ține: Un iterator forward (`vector::begin`) se parcurge de mai multe ori; generatorul, doar o dată. În C++17 n-ai `yield`: starea o ții de mână, într-o clasă de iterator.
Legătură: PY-03. PY-09 și PY-14 arată consumul unic, PY-17 eroarea amânată. `QuerySet.iterator()` din Django și `helpers.scan` din Elasticsearch dau rezultatele pe rând.

### 5
Greu: da
Problema: Vrei să măsori timpul la douăzeci de funcții sau să le reîncerci la eroare. Copiezi aceleași rânduri în fiecare, iar când le schimbi, le schimbi în douăzeci de locuri.
Ideea: Un decorator e o funcție care primește o funcție și întoarce alta, de obicei una care o învelește pe prima. `@dec` peste `def f` înseamnă `f = dec(f)`. Wrapperul ia `*args, **kwargs` și le pasează mai departe. Fără `functools.wraps`, `f.__name__` devine numele wrapperului și docstring-ul se pierde; `@wraps(f)` copiază metadatele și adaugă `__wrapped__`. Un decorator cu parametri (`@retry(3)`) are trei niveluri: `retry(3)` întoarce decoratorul, care întoarce wrapperul.
Exemplu:
```python
from functools import wraps
def deco(f):
    @wraps(f)
    def w(*a): return f(*a)
    return w
@deco
def one(): return 1
print(one.__name__)  # → one
```
În C++: O funcție care primește un `std::function<int(int)>` și întoarce un lambda ce o apelează face același lucru: `[f](int x) { return f(f(x)); }`.
Unde nu ține: În C++ învelești explicit, la locul folosirii: `auto g = twice(f);`. În Python, `@dec` leagă numele `f` de wrapper chiar la definire, deci toți apelanții folosesc versiunea învelită.
Legătură: PY-04. `@login_required` din Django, `@api_view(["GET"])` din DRF și `@app.task(bind=True)` din Celery sunt decoratori, ultimii doi cu parametri.

### 6
Greu: da
Problema: Deschizi o conexiune, apare o excepție înainte de `close()` și conexiunea rămâne deschisă. Scrii `try/finally` la fiecare folosire și, într-un loc, îl uiți.
Ideea: `with` cheamă `__enter__` la intrare și `__exit__` la ieșire, inclusiv când blocul aruncă o excepție. `__exit__` primește excepția: dacă întoarce o valoare adevărată, o înghite, altfel ea urcă mai departe. Nu o re-ridici tu. Cu `@contextlib.contextmanager` scrii același lucru ca generator: codul de dinainte de `yield` e `__enter__`, iar `finally` de după el e cleanup-ul.
Exemplu:
```python
class Q:
    def __enter__(self): return self
    def __exit__(self, t, v, tb):
        print("exit")  # → exit
        return True
with Q():
    raise ValueError
print("ok")  # → ok
```
În C++: Destructorul unui obiect RAII rulează la ieșirea din scope, inclusiv când trece o excepție. `with` are același rol.
Unde nu ține: Un destructor nu poate opri o excepție în zbor; `__exit__` o poate înghiți. Și `__del__` nu e destructor: nu garantează când rulează, de aceea cleanup-ul stă în `with`.
Legătură: PY-08. În Django, `transaction.atomic()` e context manager (și decorator), iar `with Session(engine) as s` din SQLAlchemy închide sesiunea la ieșire.

### 7
Greu: da
Problema: Verifici de milioane de ori dacă un IP e printre 100.000 de IP-uri blocate, cu `ip in blocked` pe o listă, și fiecare verificare parcurge lista. Sau scoți elemente de la începutul unei liste ca dintr-o coadă, cu `pop(0)`, și fiecare scoatere mută tot restul.
Ideea: `x in list` parcurge elementele: O(n). `set` și `dict` sunt tabele hash: `in` costă O(1) în medie și O(n) în cazul rău, cu coliziuni. `list.pop(0)` și `insert(0, v)` mută restul listei: O(n). `collections.deque` adaugă și scoate la ambele capete în O(1), dar indexarea la mijloc costă O(n). Alegi structura după operația pe care o faci cel mai des.
Exemplu:
```python
from collections import deque
q = deque([1, 2, 3])
q.appendleft(0)
print(q.popleft())  # → 0
print(3 in {1, 2, 3})  # → True
```
În C++: Se potrivesc cu STL: `list` din Python cu `std::vector`, `set` cu `std::unordered_set`, `deque` cu `std::deque`.
Unde nu ține: Numele păcălesc. `std::set` e un arbore ordonat, iar `std::list` e o listă înlănțuită. Și `std::deque` are acces aleator în O(1); `collections.deque` doar la capete.
Legătură: PY-05 (IP-uri blocate într-un `set`) și PY-06 (fereastră glisantă cu `deque`).

### 8
Greu: da
Problema: Primești un `Finding(score="high")` dintr-un JSON greșit. Clasa îl acceptă fără o vorbă, iar eroarea apare mai târziu, la un `score + 1`, departe de cauză. Un `Finding` împărțit între module poate fi modificat de unul dintre ele, pe sub nasul celorlalte.
Ideea: `@dataclass` generează `__init__`, `__repr__` și `__eq__` din câmpurile cu adnotări, dar nu verifică tipurile: adnotările sunt pentru type checker. `frozen=True` face atribuirea să ridice `FrozenInstanceError` și generează `__hash__`, deci obiectul poate fi cheie de dict. Imutabilitatea e superficială: o listă dinăuntru se poate modifica. `slots=True` (3.10+) elimină `__dict__` și scade memoria. Validarea o face Pydantic.
Exemplu:
```python
from dataclasses import dataclass
@dataclass(frozen=True)
class F:
    score: int
f = F("high")
print(f)  # → F(score='high')
f.score = 5  # ! FrozenInstanceError
```
Legătură: PY-12. Punctul 9 din fișa OOP explică `@dataclass` din partea clasei; Pydantic, din FastAPI, validează tipurile.

### 9
Greu: da
Problema: Un `except Exception: pass` înghite și o eroare de programare, nu doar cea pe care o așteptai. Iar când prinzi un `KeyError` de jos și ridici un `DomainError`, din traceback dispare cauza reală.
Ideea: Prinzi tipul precis pe care știi să-l tratezi, nu `Exception` sau un `except:` gol. `raise DomainError("...") from e` atașează `e` ca `__cause__`, iar traceback-ul arată ambele excepții. Fără `from`, dacă ridici în timp ce tratezi o excepție, Python o atașează oricum ca `__context__`, cu alt mesaj („During handling…”). `from None` ascunde lanțul. Din 3.11, `ExceptionGroup` ține mai multe excepții odată, iar `except*` tratează câte un tip din grup și lasă restul să urce; îl întâlnești la `asyncio.TaskGroup`.
Exemplu:
```python
try:
    try:
        {}["k"]
    except KeyError as e:
        raise ValueError("x") from e
except ValueError as v:
    v.__cause__  # → KeyError('k')
```
În C++: `std::throw_with_nested` și `std::rethrow_if_nested` (C++11) păstrează excepția de jos în cea nouă.
Unde nu ține: Python înlănțuie și arată lanțul în traceback; în C++ despachetezi tu lanțul cu `rethrow_if_nested`, iar C++17 nu are traceback standard. `ExceptionGroup` n-are echivalent.
Legătură: PY-11. `asyncio.TaskGroup` ridică un `ExceptionGroup` când mai multe task-uri eșuează (fișa asyncio).

### 10
Greu: da
Problema: Ai o listă de evenimente nesortată și vrei un grup pe utilizator. `groupby(events, key=…)` îți dă utilizatorul `a` de două ori, în două grupuri separate.
Ideea: `groupby` începe un grup nou de fiecare dată când se schimbă cheia, deci grupează doar elemente consecutive, ca `uniq` din Unix. Un `GROUP BY` din SQL strânge toate rândurile cu aceeași cheie, oricum vin. Sortezi întâi după aceeași cheie sau folosești `defaultdict(list)`. Grupul e un iterator legat de sursă și dispare când avansezi, deci îl salvezi cu `list(g)`.
Exemplu:
```python
from itertools import groupby
d = [1, 1, 2, 1]
s = groupby(d)
[k for k, g in s]  # → [1, 2, 1]
t = groupby(sorted(d))
[k for k, g in t]  # → [1, 2]
```
Legătură: PY-10.
