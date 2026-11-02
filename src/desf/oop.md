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
Greu: da
Problema: Vrei un `Config()` care întoarce mereu aceeași instanță, sau o subclasă de `int` care ține doar valoarea absolută. `__init__` nu ajută: obiectul există deja când rulează, iar un `int` nu se mai schimbă după creare.
Ideea: `__new__(cls, …)` creează instanța; e metodă statică implicită și primește clasa. `__init__(self, …)` o completează după aceea, dar rulează doar dacă `__new__` a întors o instanță a lui `cls`. Dacă întoarce alt tip, `__init__` nu rulează deloc. La un singleton făcut în `__new__`, `__init__` rulează din nou la fiecare `Config()`, pe același obiect. Regula practică: scrii doar `__init__`. `__new__` apare la tipuri imutabile (`int`, `str`, `tuple`), la cache de instanțe și la metaclase.
Exemplu:
```python
class P(int):
    def __new__(cls, n):
        n = abs(n)
        return int.__new__(cls, n)
    def __init__(self, n):
        print("init")  # → init
print(P(-3))  # → 3
```
În C++: `new` alocă memoria, iar constructorul o inițializează. Seamănă cu `__new__` urmat de `__init__`.
Unde nu ține: Constructorul C++ doar inițializează un obiect deja alocat și nu poate înlocui obiectul cu altul. `__new__` poate întoarce și alt obiect, chiar unul existent, iar `__init__` rulează apoi pe el, din nou.
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
Greu: da
Problema: `ScanJob` moștenește `EmailSender` ca să trimită alerte. Acum nu-l poți testa fără email real, iar trecerea la Slack înseamnă să rescrii clasa. Orice schimbare în `EmailSender` poate strica și `ScanJob`.
Ideea: Compoziția înseamnă că `ScanJob` primește un `notify` în constructor și îl apelează. În test pui un fake, în producție email sau Slack, fără să atingi `ScanJob`. Moștenirea e pentru „este un”: un `ScanJob` nu este un `EmailSender`. Ea leagă copilul de detaliile părintelui. Moștenești când subclasa poate sta oriunde stă părintele; altfel o ții ca atribut.
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
În C++: `Job` ține un `std::unique_ptr<Notifier>` primit în constructor, iar `Notifier` are o funcție `virtual … = 0`. În test pasezi un fake derivat din `Notifier`.
Unde nu ține: În Python nu ai nevoie de o clasă-interfață: `notify` poate fi orice apelabil, chiar și `sent.append`. Duck typing în locul lui `virtual`.
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
Greu: da
Problema: Ai `send(alert)` pentru Slack și email. Cineva uită metoda într-o clasă nouă și afli abia în producție. Pe de altă parte, nu poți cere unei clase dintr-o bibliotecă să moștenească din clasa ta.
Ideea: ABC + `@abstractmethod` e contract nominal: moștenești explicit, iar o subclasă fără metoda cerută dă `TypeError` la instanțiere. `Protocol` e contract structural: nu moștenești nimic, iar verificarea o face type checkerul, static. La rulare, `Protocol` nu verifică nimic. Cu `@runtime_checkable`, `isinstance` verifică doar prezența metodelor, nu semnăturile. Alegi ABC când controlezi ierarhia și vrei eroarea la instanțiere, `Protocol` când vrei duck typing verificat static.
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
Greu: da
Problema: Un `if tip == "email" … elif tip == "slack" …` crește cu fiecare client nou. Adaugi un canal, modifici codul care merge și îl poți strica. Testele clasei trebuie să acopere acum toate ramurile.
Ideea: O clasă are o singură responsabilitate. Extinzi prin strategii primite din afară, nu printr-un `if` nou (Open/Closed). Subclasa respectă contractul părintelui (Liskov): aceeași semnătură, fără precondiții mai stricte. Codul depinde de abstracții primite în constructor (Dependency Inversion), deci testezi cu fake-uri. În Python, un dict de funcții ține locul unei ierarhii de clase `Strategy`.
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
Greu: da
Problema: Scrii o clasă `Retry` cu o singură metodă, sau o clasă doar ca să închizi un fișier: cod în plus, fără nimic de păstrat între apeluri. Și un `close()` pus la sfârșit nu rulează dacă apare o excepție.
Ideea: Fără stare de păstrat, ajunge o funcție. O strategie poate fi o funcție (`sorted(key=...)`). Cleanup-ul garantat e un context manager: `with` cheamă `__exit__` și la excepție, iar `@contextlib.contextmanager` îl scrie ca un generator cu `try/finally`. Un modul e deja un singleton: Python îl importă o dată și îl ține în `sys.modules`. Semnal de alarmă: o clasă cu o singură metodă publică și fără stare e, de fapt, o funcție.
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
Greu: da
Problema: Primești alerte de la Splunk, Sentinel și QRadar, fiecare cu alt API. Restul codului nu trebuie să afle de diferențe. Iar când apare o alertă, trei module vor să afle.
Ideea: Adapter pune câte o clasă per SIEM, toate cu aceeași interfață. Observer anunță ascultătorii înregistrați la „alertă creată”. Strategy + registry schimbă regulile, alese după nume dintr-un dict. Unit of Work (`Session` din SQLAlchemy) strânge modificările într-o tranzacție. Factory (`@classmethod from_dict`) construiește obiectul din date. În Python, Strategy și Observer devin adesea funcții, iar un singleton devine un modul.
Exemplu:
```python
ls, out = [], []
on = ls.append
on(lambda a: out.append("L"+a))
on(lambda a: out.append("M"+a))
for f in ls:
    f("1")
print(out)  # → ['L1', 'M1']
```
Analogie: Adapterul e priza de călătorie. Aparatul rămâne la fel, iar adaptorul se potrivește la fiecare țară.
Legătură: OOP-15 până la OOP-18 le exersează pe rând.
