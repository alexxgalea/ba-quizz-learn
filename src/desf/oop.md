<!-- Desfășurările fișei `oop` (12 puncte). Format și reguli: lib.mjs (checkDesf), .scratch/desfasurari/spec.md. Faptele: research/interview-facts.md, secțiunea 4 (Python) și 19 (C++). -->

### harta
Problema: Un program Python crește: apar tipuri noi de date, reguli noi, variante ale aceleiași idei. Fără structură, logica se împrăștie prin funcții și lanțuri de `if tip == ...`, iar orice schimbare strică ceva în altă parte. Modulul răspunde la trei întrebări: ce merită să fie clasă, ce forme poate lua una și cum o schimbi fără să rupi restul.
Grupuri:
- 1–2: cum se naște un obiect și când două obiecte sunt „egale”
- 3–5: unde stă starea și unde stă comportamentul (atribute, `@property`, metode de clasă)
- 6–8: cum legi clasele între ele (compoziție, moștenire multiplă, contracte)
- 9: clasa de date gata făcută
- 10–12: când proiectezi bine și când nu faci clasă deloc

### 1
Problema: Două obiecte `Rule` cu aceleași date apar de două ori într-un `set`. În log vezi doar `<Rule object at 0x7f…>`.
Ideea: `__repr__` spune cum arată obiectul în log, iar `__eq__` îl face egal cu altul de aceeași valoare. Un `__eq__` scris fără `__hash__` pune `__hash__ = None`, deci obiectul nu mai intră într-un `set`.
Exemplu:
```python
class R:
    def __init__(self, n):
        self.n = n
    def __eq__(self, o):
        return self.n == o.n
print(R(1) == R(1))  # → True
{R(1)}  # ! TypeError
```
În C++: Pentru `std::unordered_set<R>` scrii `operator==` și o specializare `std::hash<R>`; fără ea, codul nu compilează.
Unde nu ține: Python te lasă să scrii `__eq__` fără `__hash__`. Eroarea apare abia la rulare, când pui obiectul într-un `set`.
Legătură: OOP-04 întreabă exact asta.

### 2
Problema: Vrei un `Config()` care întoarce mereu aceeași instanță, sau o subclasă de `int`. `__init__` nu ajută: obiectul există deja când rulează.
Ideea: `__new__` creează obiectul; `__init__` îl completează după aceea, doar dacă `__new__` a întors o instanță a lui `cls`. De obicei ai nevoie doar de `__init__`.
Exemplu:
```python
class Pos(int):
    def __new__(cls, n):
        n = abs(n)
        return int.__new__(cls, n)
print(Pos(-3))  # → 3
```
În C++: `new` alocă memoria, iar constructorul o inițializează. Seamănă cu `__new__` urmat de `__init__`.
Unde nu ține: Constructorul C++ doar inițializează un obiect deja alocat. `__new__` poate întoarce și alt obiect, chiar unul existent.
Legătură: OOP-09 cere să alegi între cele două.

### 3
Problema: Două obiecte `Scanner` primesc fiecare câte o regulă, dar amândouă o văd pe ambele. Lista era scrisă în corpul clasei.
Ideea: Ce scrii în corpul clasei există o singură dată, la clasă; `self.x` caută întâi în instanță, apoi în clasă. Starea fiecărui obiect o creezi în `__init__`.
Exemplu:
```python
class S:
    rules = []
a, b = S(), S()
a.rules.append("r1")
print(b.rules)  # → ['r1']
a.rules = []
print(S.rules)  # → ['r1']
```
În C++: Seamănă cu un membru `static`: o singură copie, comună tuturor obiectelor.
Unde nu ține: În Python, `a.rules = []` creează un atribut al instanței și ascunde pe cel al clasei. În C++, `a.count = 5` modifică tot membrul `static`.
Legătură: OOP-01 și OOP-10.

### 4
Problema: Clasa ta expune `finding.score`, iar clienții îl citesc direct. Mâine scorul trebuie limitat sau calculat. Nu vrei să schimbi toate apelurile în `get_score()`.
Ideea: `@property` păstrează sintaxa `obj.score` și rulează o metodă în spate, deci începi cu un atribut simplu și adaugi property abia când ai nevoie. `cached_property` calculează o singură dată.
Exemplu:
```python
class F:
    def __init__(self, s):
        self._s = s
    @property
    def score(self):
        return min(self._s, 10)
print(F(99).score)  # → 10
```
În C++: Un membru public care devine getter schimbă apelul din `o.x` în `o.x()`.
Unde nu ține: Python nu are `private`. `_s` e doar o convenție, iar property nu ascunde nimic.
Legătură: OOP-02.

### 5
Problema: `Finding` se creează din JSON sau dintr-un dict. Un singur `__init__` nu le acoperă, iar un factory care scrie `Finding(...)` ignoră subclasele.
Ideea: `@classmethod` primește clasa ca `cls`; cu `cls(...)` construiești exact clasa apelată, subclasele incluse. `@staticmethod` nu primește nimic: e o funcție obișnuită, pusă în clasă pentru ordine.
Exemplu:
```python
class F:
    def __init__(self, n):
        self.n = n
    @classmethod
    def make(cls, n):
        return cls(n)
class G(F): pass
isinstance(G.make(1), G)  # → True
```
În C++: O funcție `static` seamănă cu `@staticmethod`: n-are `this` și se apelează pe clasă.
Unde nu ține: `@classmethod` n-are echivalent. O funcție `static` nu poate fi `virtual`, deci un factory static nu știe cu ce subclasă a fost apelat.
Legătură: OOP-03.

### 6
Problema: `ScanJob` moștenește `EmailSender` ca să trimită alerte. Acum nu-l poți testa fără email real, iar trecerea la Slack înseamnă să rescrii clasa.
Ideea: Compoziția înseamnă că `ScanJob` primește un `notify` în constructor și îl apelează, iar în test pui un fake în loc. Moștenirea e pentru „este un”, nu pentru „folosește un”.
Exemplu:
```python
class Job:
    def __init__(self, notify):
        self.notify = notify
    def run(self):
        self.notify("gata")
sent = []
Job(sent.append).run()
print(sent)  # → ['gata']
```
Legătură: OOP-08 testează exact asta. Într-un proiect Django, clasa din `views` primește serviciile ca argumente, nu le importă direct, ca să le poți înlocui în teste.

### 7
Greu: da
Problema: `class D(B, C)`, iar `B` și `C` moștenesc amândouă `A`. Care `f()` rulează? Dacă fiecare clasă își cheamă părintele pe nume, `A` rulează de două ori sau deloc.
Ideea: Python liniarizează ierarhia într-o listă, MRO, cu algoritmul C3: aici `D, B, C, A, object`. Fiecare clasă apare o dată, copiii vin înaintea părinților, iar ordinea din `class D(B, C)` se păstrează. `super()` nu înseamnă „părintele direct”: cheamă următoarea clasă din MRO-ul instanței, de aceea un mixin cooperativ cheamă `super()` în fiecare clasă.
Exemplu:
```python
class A:
    def f(s): return "A"
class B(A):
    def f(s): return "B"+super().f()
class C(A):
    def f(s): return "C"+super().f()
class D(B, C): pass
print(D().f())  # → BCA
```
În C++: La moștenirea în diamant, un `A` obișnuit apare de două ori în `D`, iar `d.v` e ambiguu și nu compilează. Cu `virtual A`, `D` are un singur `A`, inițializat de cea mai derivată clasă.
Unde nu ține: C++ nu liniarizează: alegi tu explicit `B::f()`, pe nume. `super()` din Python depinde de MRO-ul instanței, nu de clasa scrisă în cod.
Legătură: Django cere `LoginRequiredMixin` înaintea lui `View` în lista de baze, tocmai din cauza MRO. OOP-05.

### 8
Problema: Ai `send(alert)` pentru Slack și email. Cineva uită metoda într-o clasă nouă și afli abia în producție.
Ideea: ABC + `@abstractmethod` e contract nominal: subclasa fără metoda cerută dă `TypeError` la instanțiere. `Protocol` e contract structural: nu moștenești nimic, iar verificarea o face doar type checkerul.
Exemplu:
```python
from abc import ABC, abstractmethod
class Sender(ABC):
    @abstractmethod
    def send(self): ...
class Slack(Sender): pass
Slack()  # ! TypeError
```
În C++: O funcție `virtual … = 0` face clasa abstractă, iar un obiect de tip abstract nu compilează. Un template cere doar ce folosește: duck typing la compilare.
Unde nu ține: C++ prinde greșeala la compilare; Python, la instanțiere (ABC) sau deloc la rulare (`Protocol`).
Legătură: OOP-06 și OOP-07.

### 9
Problema: La un `Finding` cu patru câmpuri scrii `__init__`, `__repr__` și `__eq__` de mână, iar o greșeală într-unul stă ascunsă luni.
Ideea: `@dataclass` generează `__init__`, `__repr__` și `__eq__` din câmpurile adnotate. Cu `frozen=True` obiectul devine imutabil și hashable, iar `slots=True` și `kw_only=True` cer Python 3.10+.
Exemplu:
```python
from dataclasses import dataclass
@dataclass(frozen=True)
class P:
    x: int
    y: int = 0
print(P(1))  # → P(x=1, y=0)
print({P(1): "ok"}[P(1)])  # → ok
```
În C++: Scrii constructorul și `operator==` de mână; `= default` pentru `==` vine abia în C++20.
Unde nu ține: Un `@dataclass` e o clasă obișnuită cu cod generat. Nu verifică tipurile: `P("a")` merge.
Legătură: Pydantic, din FastAPI, validează tipurile; `dataclass` nu.

### 10
Problema: Un `if tip == "email" … elif tip == "slack" …` crește cu fiecare client nou. Adaugi un canal, modifici codul care merge și îl poți strica.
Ideea: O clasă are o singură responsabilitate, iar extinderea vine din strategii primite din afară, nu dintr-un `if` nou. Subclasa respectă contractul părintelui (Liskov: aceeași semnătură, fără condiții mai stricte), iar codul depinde de abstracții date în constructor, ca să testezi cu fake-uri.
Exemplu:
```python
S = {
    "mail": lambda m: "mail:" + m,
    "slack": lambda m: "slack:" + m,
}
def send(k, m):
    return S[k](m)
send("slack", "hi")  # → 'slack:hi'
```
Legătură: OOP-12 arată o încălcare a lui Liskov; OOP-14 evită lanțul de `if`.

### 11
Problema: Scrii o clasă `Retry` cu o singură metodă, sau o clasă doar ca să închizi un fișier: cod în plus.
Ideea: O strategie poate fi o funcție (`sorted(key=...)`), iar cleanup-ul garantat e un context manager: `with` cheamă `__exit__` și la excepție. Un modul e deja un singleton: Python îl importă o dată.
Exemplu:
```python
import contextlib
log = []
@contextlib.contextmanager
def g():
    try: yield
    finally: log.append("close")
with g(): log.append("work")
print(log)  # → ['work', 'close']
```
În C++: `with` face ce face RAII: eliberează la ieșirea din bloc, și la excepție.
Unde nu ține: În C++ destructorul rulează singur, pentru orice obiect. În Python `with` îl scrii la locul apelului, iar `__del__` nu e destructor: nu garantează când rulează.

### 12
Problema: Primești alerte de la Splunk, Sentinel și QRadar, fiecare cu alt API. Restul codului nu trebuie să afle de diferențe.
Ideea: Adapter pune câte o clasă per SIEM, cu aceeași interfață; Observer anunță ascultătorii la „alertă creată”; Strategy + registry schimbă regulile; Unit of Work (`Session` din SQLAlchemy) strânge modificările într-o tranzacție. În Python multe devin funcții sau module.
Analogie: Adapterul e priza de călătorie. Aparatul rămâne la fel, iar adaptorul se potrivește la fiecare țară.
Legătură: OOP-15 până la OOP-18 le exersează pe rând.
