<!-- OOP în Python: design de clase. Variantele greșite: B, C, D = ordinea din sursă (A e cea corectă). -->

### oop-01
Pe scurt: Afișează `[1]`: `items` e atribut de clasă, deci o singură listă, comună tuturor instanțelor.
Scop: Distingi starea clasei de starea fiecărui obiect. E cea mai frecventă greșeală de OOP în Python la cod scris de cineva venit din Java.
Mecanism: `a1.items` caută `items` întâi în `a1.__dict__`, nu-l găsește, apoi îl găsește pe clasă. `append` modifică pe loc lista clasei. `a2.items` ajunge la aceeași listă.
Pas cu pas:
```text
class A: items = []   (o listă)
a1.items -> nu e pe a1 -> A.items
a1.items.append(1) -> A.items = [1]
a2.items -> nu e pe a2 -> A.items
print -> [1]
```
Aplicare:
```python
class A:
    def __init__(self):
        self.items = []
```
Legătură: E aceeași capcană ca valoarea implicită mutabilă (PY-01). Modelele Django par să declare atribute de clasă, dar acolo metaclasa le transformă în câmpuri per instanță.
Limită: Atributele de clasă imutabile (constante, `MAX_RETRIES = 3`) sunt în regulă: o atribuire `self.x = ...` creează un atribut nou pe instanță și nu atinge clasa.
La interviu: „Un atribut scris în corpul clasei e unul singur, comun tuturor instanțelor. Starea per obiect o creez în `__init__`, sau cu `field(default_factory=list)` la dataclass.”
Verificare: Dacă în loc de `a1.items.append(1)` scrii `a1.items = [1]`, ce afișează `a2.items`?
Răspuns verificare: `[]`. Atribuirea creează un atribut nou pe `a1`, care ascunde atributul clasei doar pentru `a1`. Lista clasei rămâne goală.
Varianta greșită B: Ar fi corect doar dacă fiecare instanță ar avea lista ei, creată în `__init__`. Aici lista e creată o singură dată, cu clasa.
Varianta greșită C: Atributul există: căutarea merge de la instanță la clasă și îl găsește acolo.
Varianta greșită D: `append` întoarce `None`, dar `print` afișează lista `a2.items`, nu rezultatul lui `append`.

### oop-02
Pe scurt: `@property` îți permite să păstrezi interfața `obj.score` și să adaugi calcul sau validare fără să schimbi codul care o folosește.
Scop: În Python nu scrii getteri și setteri preventiv. Începi cu un atribut simplu și treci la `@property` doar când apare nevoia.
Mecanism: `property` e un descriptor pus pe clasă. Când citești `obj.score`, Python vede descriptorul și apelează funcția getter. Cu `@score.setter` interceptezi și atribuirea.
Pas cu pas:
```text
v1: self.score = 0  (atribut simplu)
apelanții: obj.score, obj.score = 5
v2: @property score + setter
    validează 0..100
apelanții: neschimbați
```
Aplicare:
```python
@property
def score(self):
    return self._score

@score.setter
def score(self, v):
    if not 0 <= v <= 100:
        raise ValueError(v)
    self._score = v
```
Legătură: Pydantic validează la construcție; `@property` e varianta manuală pentru un câmp calculat (`risk = severity × exposure`) sau validat la atribuire.
Limită: Un property care face I/O (citește din DB la fiecare acces) ascunde un cost. Dacă e scump, o metodă explicită sau `functools.cached_property` sunt mai cinstite.
La interviu: „Încep cu atribute simple. Dacă mai târziu am nevoie de calcul sau validare, le transform în `@property`, fără să schimb apelanții. De aceea în Python nu scriu getteri și setteri din prima.”
Verificare: Ai un property `total` care adună 10.000 de rânduri din memorie și e citit de 50 de ori pe cerere. Ce schimbi?
Răspuns verificare: `functools.cached_property`, care calculează o dată pe instanță și păstrează rezultatul, sau o metodă explicită, ca apelantul să vadă că e un calcul.
Varianta greșită B: Asta face `functools.cached_property`. Un `@property` simplu rulează funcția la fiecare acces.
Varianta greșită C: Python nu are atribute private. `_score` e doar o convenție, iar property-ul există tocmai ca să fie citit din afară.
Varianta greșită D: Un property e un apel de funcție la fiecare acces, deci e puțin mai lent decât un atribut simplu, nu mai rapid.

### oop-03
Pe scurt: Un `@classmethod` primește clasa (`cls`), deci e locul natural pentru constructori alternativi care funcționează și pentru subclase.
Scop: Ai mai multe moduri de a crea un obiect (din dict, din JSON, din rând DB) fără un `__init__` plin de `if`-uri.
Mecanism: Când apelezi `Finding.from_dict(d)`, Python trimite clasa ca prim argument. Dacă apelezi `CriticalFinding.from_dict(d)`, `cls` e subclasa, iar `cls(...)` construiește subclasa.
Pas cu pas:
```text
Finding.from_dict(d)
  -> cls = Finding -> Finding(**d)
CriticalFinding.from_dict(d)
  -> cls = CriticalFinding
  -> CriticalFinding(**d)
```
Aplicare:
```python
class Finding:
    @classmethod
    def from_dict(cls, d):
        return cls(**d)
```
Legătură: `datetime.fromtimestamp`, `dict.fromkeys` și `Model.model_validate` din Pydantic sunt constructori alternativi de acest tip.
Limită: Un `@staticmethod` e doar o funcție pusă în clasă. Dacă nu folosește nici clasa, nici instanța, adesea locul ei e o funcție la nivel de modul.
La interviu: „Folosesc `@classmethod` pentru constructori alternativi, ca `from_dict`: primește `cls`, deci merge corect și pentru subclase. `@staticmethod` e o funcție legată doar logic de clasă.”
Verificare: Scrii `from_dict` ca `@staticmethod` care întoarce `Finding(...)`. Ce se strică la `CriticalFinding.from_dict(d)`?
Răspuns verificare: Primești un `Finding`, nu un `CriticalFinding`, pentru că numele clasei e scris fix. Cu `@classmethod` și `cls(...)` primești subclasa.
Varianta greșită B: Asta descrie un `@staticmethod`. Un `@classmethod` primește clasa.
Varianta greșită C: Și un `@classmethod` poate fi apelat pe instanță: `obj.from_dict(d)` trimite clasa obiectului.
Varianta greșită D: Asta e o metodă obișnuită, care primește `self`. Un `@classmethod` nu are acces la o instanță anume.

### oop-04
Pe scurt: `TypeError: unhashable type: 'Rule'`: un dataclass cu `eq=True` și fără `frozen=True` are `__hash__ = None`.
Scop: Știi de ce un obiect mutabil cu egalitate de valoare nu poate fi pus într-un `set` sau folosit drept cheie de `dict`.
Mecanism: Dataclass-ul generează `__eq__`, care compară câmpurile. Dacă obiectul ar fi și mutabil și hash-uit, modificarea unui câmp după ce intră în `set` i-ar schimba hash-ul, iar setul nu l-ar mai găsi. De aceea Python pune `__hash__ = None`.
Pas cu pas:
```text
@dataclass -> eq=True, frozen=False
  -> __eq__ generat
  -> __hash__ = None
{Rule(...)} -> hash() -> TypeError
@dataclass(frozen=True)
  -> __hash__ din câmpuri
```
Aplicare:
```python
@dataclass(frozen=True)
class Rule:
    name: str
```
Legătură: Același principiu ca la `__eq__` scris de mână (cardul cu `Finding`): obiectele egale trebuie să aibă același hash.
Limită: `unsafe_hash=True` forțează un `__hash__` pe un obiect mutabil. Merge doar dacă ești sigur că nu modifici câmpurile după ce obiectul e într-un set.
La interviu: „Un dataclass compară după valoare, dar fără `frozen=True` nu e hashable, pentru că un obiect mutabil și-ar putea schimba hash-ul în set. Pentru set sau chei de dict îl fac `frozen`.”
Verificare: Faci `Rule` `frozen=True` și încerci `r.name = "x"`. Ce se întâmplă?
Răspuns verificare: `dataclasses.FrozenInstanceError`. Imutabilitatea e chiar ce face hash-ul sigur.
Varianta greșită B: Ar fi adevărat doar cu `frozen=True` sau `unsafe_hash=True`. Implicit, `__hash__` e `None`.
Varianta greșită C: Setul nu se creează deloc: hash-ul elementului e cerut la construcție și aruncă.
Varianta greșită D: `name` există, primit în constructorul generat. Eroarea vine din hash, nu din atribut.

### oop-05
Pe scurt: Afișează `ABBase`: `super()` cheamă următoarea clasă din MRO, nu neapărat părintele direct.
Scop: Înțelegi moștenirea multiplă și de ce mixin-urile cooperative funcționează doar dacă fiecare cheamă `super()`.
Mecanism: MRO pentru `C`, calculat cu C3, e `C → A → B → Base → object`. `C().hi()` găsește `A.hi`. În `A`, `super().hi()` caută după `A` în MRO-ul lui `C`, deci găsește `B.hi`, care cheamă `Base.hi`.
Pas cu pas:
```text
C.__mro__: C, A, B, Base, object
C().hi() -> A.hi
  super() după A -> B.hi
    super() după B -> Base.hi
"A" + "B" + "Base" = "ABBase"
```
Aplicare: Pentru mixin-uri (logging, retry, audit) fiecare metodă cheamă `super()`, ca lanțul să treacă prin toate clasele.
Legătură: Class-based views din Django și DRF combină mixin-uri (`LoginRequiredMixin`, `ListModelMixin`) exact pe acest mecanism.
Limită: Moștenirea multiplă adâncă e greu de urmărit. În cod de aplicație, compoziția e de obicei mai clară.
La interviu: „`super()` urmează MRO-ul obiectului, nu clasa părinte scrisă în cod. La moștenire multiplă, MRO-ul e liniarizat cu C3 și îl văd în `__mro__`; de aceea mixin-urile cheamă mereu `super()`.”
Verificare: Dacă `B.hi` returnează doar `"B"`, fără `super()`, ce afișează `C().hi()`?
Răspuns verificare: `AB`. Lanțul se oprește la `B`, deci `Base.hi` nu mai e apelat.
Varianta greșită B: Ar fi corect dacă `super()` din `A` ar merge direct la `Base`. În MRO-ul lui `C`, după `A` vine `B`.
Varianta greșită C: `Base.hi` e apelat o singură dată. C3 pune fiecare clasă o singură dată în MRO, chiar dacă e moștenită pe două căi.
Varianta greșită D: Ordinea bazelor contează: `C(A, B)` pune `A` înaintea lui `B`, deci `A.hi` rulează primul.

### oop-06
Pe scurt: `TypeError` la `Slack()`: o clasă care nu implementează toate metodele abstracte ale unui ABC nu poate fi instanțiată.
Scop: Folosești un ABC ca să prinzi devreme o implementare incompletă, la creare, nu în producție, la primul apel.
Mecanism: `ABCMeta` ține lista metodelor abstracte neimplementate. `Slack` definește `post`, nu `send`, deci lista nu e goală, iar `object.__new__` refuză instanțierea.
Pas cu pas:
```text
Notifier: abstract = {send}
Slack(Notifier): definește post
  abstract rămas = {send}
Slack() -> TypeError
  (Can't instantiate abstract class)
```
Aplicare:
```python
class Slack(Notifier):
    def send(self, msg):
        slack.post(msg)
```
Legătură: DRF are clase de bază (`BasePermission`, `BaseAuthentication`) cu metode pe care le suprascrii; ABC-ul face contractul obligatoriu.
Limită: ABC-ul verifică doar numele metodelor, nu și semnătura. O metodă `send(self)` fără `msg` trece de verificare; mypy o prinde.
La interviu: „Un ABC cu `@abstractmethod` face contractul obligatoriu: o subclasă incompletă aruncă `TypeError` la instanțiere, nu la primul apel.”
Verificare: Adaugi în `Slack` `send(self)`, fără parametrul `msg`. Mai aruncă `Slack()`?
Răspuns verificare: Nu: ABC-ul verifică doar că metoda există. Greșeala de semnătură apare la apel sau în mypy.
Varianta greșită B: Asta ar fi comportamentul fără ABC, cu un `send` care aruncă `NotImplementedError`. ABC-ul verifică la instanțiere.
Varianta greșită C: `NotImplementedError` o arunci tu dintr-o metodă. ABC-ul aruncă `TypeError`, înainte să ruleze vreo metodă.
Varianta greșită D: Python nu potrivește metodele după rol. `post` e o metodă diferită, iar `send` rămâne abstractă.

### oop-07
Pe scurt: `Protocol` descrie un contract structural: orice clasă cu metodele potrivite îl satisface, fără să-l moștenească.
Scop: Tipezi dependențe (notificator, client SAP, repository) fără să legi implementările de o clasă de bază, inclusiv pentru cod din biblioteci externe.
Mecanism: mypy sau pyright compară metodele și semnăturile clasei cu cele din `Protocol`. La runtime nu se întâmplă nimic, decât dacă îl marchezi `@runtime_checkable`; atunci `isinstance` verifică doar că metodele există.
Pas cu pas:
```text
class Notifier(Protocol):
    def send(self, msg: str): ...
class FakeNotifier: send(...)
  (nu moștenește nimic)
scan(n: Notifier)
mypy: FakeNotifier are send -> ok
```
Aplicare:
```python
class Notifier(Protocol):
    def send(self, msg: str):
        ...
```
Legătură: E duck typing-ul pe care îl folosești deja, doar verificat static. Un fake pentru teste nu mai trebuie să moștenească nimic.
Limită: `Protocol` nu adaugă implementare comună și nu blochează instanțierea. Dacă vrei cod comun sau verificare la runtime, folosești un ABC.
La interviu: „ABC-ul e nominal și verificat la runtime: trebuie moștenit. `Protocol` e structural și verificat static: contează doar metodele. Îl prefer la granițe, pentru dependențe pe care le înlocuiesc în teste.”
Verificare: Cu `@runtime_checkable`, `isinstance(obj, Notifier)` întoarce `True` pentru un obiect care are `send(self)` fără parametri. De ce?
Răspuns verificare: Verificarea la runtime se uită doar dacă metoda există, nu și la semnătură. Semnătura o verifică doar mypy sau pyright.
Varianta greșită B: Python nu verifică tipurile la runtime. `Protocol` e pentru analiza statică.
Varianta greșită C: `Protocol` nu schimbă MRO-ul claselor care îl satisfac: ele nici măcar nu-l moștenesc.
Varianta greșită D: Un `Protocol` nu poate fi instanțiat el însuși, dar clasele care îl respectă se instanțiază normal.

### oop-08
Pe scurt: Compoziția: `ScanJob` primește un notifier în constructor. În test îi dai un fals și verifici ce a primit.
Scop: Alegi între compoziție și moștenire după cum vei testa și extinde codul.
Mecanism: `ScanJob` depinde de o interfață mică (`send(msg)`), nu de o implementare. Implementarea vine din afară, deci o poți schimba fără să atingi `ScanJob`.
Pas cu pas:
```text
prod: ScanJob(EmailNotifier(...))
test: ScanJob(FakeNotifier())
job.run() -> notifier.send(...)
test: fake.sent == ["scan gata"]
canal nou: o clasă nouă,
  ScanJob neschimbat
```
Aplicare:
```python
class ScanJob:
    def __init__(self, notifier):
        self.notifier = notifier
```
Legătură: E dependency injection, același mecanism ca `Depends` din FastAPI și `dependency_overrides` în teste.
Limită: Pentru o singură implementare care nu se va schimba, injecția poate fi exagerată. Dar dacă testezi codul, injecția își plătește costul.
La interviu: „Prefer compoziția: clasa primește colaboratorii în constructor. În teste pun un fake, iar un canal nou e o clasă nouă, fără să modific clasa existentă.”
Verificare: Cum verifici într-un test, fără rețea, că un `ScanJob` eșuat trimite exact o notificare de eroare?
Răspuns verificare: Îi dai un `FakeNotifier` care ține mesajele într-o listă, provoci eșecul și verifici lista: un singur mesaj, cu textul așteptat.
Varianta greșită B: Moștenirea înmulțește clasele (câte una pe canal) și leagă notificarea de logica de scanare. Un client cu două canale ar cere încă o clasă.
Varianta greșită C: Fiecare canal nou modifică `ScanJob`, iar testul trebuie să acopere toate ramurile.
Varianta greșită D: Un notifier global trebuie înlocuit cu `patch` în fiecare test și e partajat între teste.

### oop-09
Pe scurt: Suprascrii `__new__` când trebuie să controlezi crearea obiectului: tipuri imutabile sau un cache de instanțe.
Scop: Știi ce face fiecare metodă, ca să nu suprascrii `__new__` fără motiv.
Mecanism: `Cls(...)` apelează întâi `Cls.__new__(cls, ...)`, care creează și întoarce obiectul. Apoi, dacă obiectul e o instanță a clasei, apelează `__init__` pe el. La un `str` sau `tuple`, valoarea e fixată la creare, deci `__init__` nu o mai poate schimba.
Pas cu pas:
```text
Host("A.example")
-> __new__: creează obiectul
   (aici poți normaliza un str)
-> __init__: inițializează
   (str e deja imutabil)
```
Aplicare:
```python
class Host(str):
    def __new__(cls, v):
        return super().__new__(
            cls, v.lower())
```
Legătură: `__new__` stă și în spatele metaclaselor și al tipurilor imutabile din biblioteca standard.
Limită: Un singleton prin `__new__` e rar necesar în Python: un modul e deja instanțiat o singură dată.
La interviu: „`__new__` creează obiectul, `__init__` îl inițializează. Suprascriu `__new__` doar la tipuri imutabile sau când vreau să întorc o instanță existentă; în rest, `__init__`.”
Verificare: De ce `Host("A.example")` nu poate fi normalizat la litere mici în `__init__`?
Răspuns verificare: Valoarea unui `str` e fixată în `__new__`. În `__init__` obiectul există deja și e imutabil.
Varianta greșită B: Validarea obișnuită a argumentelor stă în `__init__` (sau în `__post_init__` la dataclass).
Varianta greșită C: Atributele obligatorii sunt parametri ai lui `__init__`, fără `__new__`.
Varianta greșită D: Moștenirea multiplă nu cere `__new__`; ordinea apelurilor o dă MRO-ul.

### oop-10
Pe scurt: `ValueError` chiar la definirea clasei: dataclass-ul refuză `list` ca valoare implicită. Corect: `field(default_factory=list)`.
Scop: Recunoști capcana valorii implicite mutabile și forma corectă în dataclass-uri.
Mecanism: Valoarea implicită e evaluată o singură dată, la definire, deci ar fi împărțită de toate instanțele. Dataclass-ul detectează `list`, `dict` și `set` și oprește definirea. `default_factory` cheamă `list()` la fiecare instanță nouă.
Pas cu pas:
```text
findings: list = []
  -> ValueError (mutable default)
findings: list = field(
  default_factory=list)
  -> Report() -> list() nouă
```
Aplicare:
```python
@dataclass
class Report:
    findings: list = field(
        default_factory=list)
```
Legătură: E aceeași capcană ca `def f(x=[])` (PY-01) și ca atributul de clasă comun (OOP-01).
Limită: Din 3.11, verificarea respinge orice valoare implicită nehashable (aproximare pentru „mutabil”), nu doar `list`, `dict` și `set`. O instanță a unei clase proprii e hashable implicit, deci trece de verificare și ar fi împărțită între instanțe.
La interviu: „O valoare implicită se evaluează o dată, deci o listă ar fi comună tuturor instanțelor. Dataclass-ul o refuză, iar eu folosesc `field(default_factory=list)`.”
Verificare: Ce face `field(default_factory=dict)` la fiecare `Report()`?
Răspuns verificare: Cheamă `dict()` și dă fiecărui raport un dicționar nou, propriu.
Varianta greșită B: Asta s-ar întâmpla cu un atribut de clasă obișnuit. Dataclass-ul oprește tocmai acest caz, cu eroare.
Varianta greșită C: Fără `default_factory` nu se creează nimic nou; dataclass-ul aruncă eroare.
Varianta greșită D: Eroarea apare la definirea clasei, nu la prima instanțiere.

### oop-11
Pe scurt: Instanțe fără `__dict__`: mai puțină memorie, iar atributele noi, nedeclarate, sunt interzise.
Scop: Știi când merită `__slots__`: milioane de obiecte mici, cum ar fi evenimentele dintr-un log.
Mecanism: Clasa rezervă locuri fixe pentru atributele numite, iar instanțele nu mai primesc dicționar. O atribuire la un nume nedeclarat aruncă `AttributeError`.
Pas cu pas:
```text
fără slots: obj.__dict__ = {...}
cu slots: rule, host (locuri fixe)
obj.rule = "x"   -> ok
obj.hots = "y"   -> AttributeError
```
Aplicare: Cu dataclass, `@dataclass(slots=True)` (3.10+) generează `__slots__` din câmpuri.
Legătură: Un pipeline care ține în memorie milioane de evenimente parsate (PF) câștigă vizibil memorie cu `slots`.
Limită: Fără `__dict__` nu merg `functools.cached_property` și atributele dinamice. La moștenire, fiecare clasă din lanț trebuie să-și declare slot-urile.
La interviu: „`__slots__` elimină `__dict__`-ul fiecărei instanțe: economisesc memorie la multe obiecte mici și prind greșelile de nume de atribut. Atributele rămân modificabile.”
Verificare: Atributele dintr-o clasă cu `__slots__` sunt imutabile?
Răspuns verificare: Nu. Le poți schimba liber; doar nu poți adăuga atribute noi. Pentru imutabilitate folosești `frozen=True`.
Varianta greșită B: Atributele din slot-uri se pot schimba. Imutabilitatea o dau `frozen=True` sau un tuplu.
Varianta greșită C: `__slots__` nu adaugă nicio sincronizare; accesul concurent are aceleași reguli ca înainte.
Varianta greșită D: Python nu validează tipurile la atribuire; asta face Pydantic.

### oop-12
Pe scurt: Încalcă substituția Liskov: codul care primește un `Repo` și apelează `save()` crapă când primește subclasa.
Scop: Recunoști moștenirea folosită greșit: subclasa promite prin moștenire o capacitate pe care apoi o refuză.
Mecanism: Un apelant tipat pe `Repo` are dreptul să apeleze `save()`. Cu `ReadOnlyRepo`, apelul aruncă la runtime, deci apelantul ar trebui să știe ce subclasă are, adică exact ce moștenirea ar fi trebuit să ascundă.
Pas cu pas:
```text
def archive(repo: Repo):
    repo.save(x)
archive(SqlRepo())      -> ok
archive(ReadOnlyRepo()) -> crapă
fix: Reader + Writer separate
```
Aplicare:
```python
class Reader(Protocol):
    def get(self, id): ...

class Writer(Protocol):
    def save(self, obj): ...
```
Legătură: E principiul de segregare a interfețelor: interfețe mici, pe rol. În DRF, `ReadOnlyModelViewSet` e o clasă separată, nu o subclasă care refuză scrierea.
Limită: Uneori o bibliotecă îți impune o interfață mare. Atunci documentezi clar restricția și o verifici în teste.
La interviu: „Dacă o subclasă aruncă `NotImplementedError` pe o metodă a părintelui, încalcă Liskov. Aș sparge interfața în roluri mai mici, `Reader` și `Writer`, iar fiecare clasă implementează doar ce poate face.”
Verificare: Un `Square(Rectangle)` cu `set_width` care schimbă și înălțimea: ce test al lui `Rectangle` pică?
Răspuns verificare: Cel care setează lățimea 2 și înălțimea 3 și se așteaptă la aria 6. Un `Square` nu poate respecta contractul lui `Rectangle`.
Varianta greșită B: Problema nu e câte face clasa, ci că refuză contractul moștenit.
Varianta greșită C: Așa se ascunde o eroare de design. Contractul părintelui spune că `save` funcționează.
Varianta greșită D: Performanța nu e problema; codul crapă la runtime, nu e lent.

### oop-13
Pe scurt: `AttributeError`: `Scanner.__init__` nu cheamă `super().__init__()`, deci `ready` nu e setat niciodată.
Scop: Știi că un `__init__` suprascris înlocuiește complet pe cel al părintelui.
Mecanism: `Scanner("h1")` rulează doar `Scanner.__init__`. Python nu cheamă automat `Base.__init__`. Atributul `ready` nu există, deci citirea lui aruncă.
Pas cu pas:
```text
Scanner("h1")
-> Scanner.__init__: self.host
   (Base.__init__ nu rulează)
.ready -> AttributeError
fix: super().__init__() în Scanner
```
Aplicare:
```python
class Scanner(Base):
    def __init__(self, host):
        super().__init__()
        self.host = host
```
Legătură: În Django, un `save()` suprascris fără `super().save()` nu mai salvează nimic, din exact același motiv.
Limită: La moștenire multiplă, `super().__init__(**kwargs)` trebuie să transmită mai departe argumentele, ca fiecare clasă din MRO să le primească pe ale ei.
La interviu: „Un `__init__` suprascris îl înlocuiește pe al părintelui; dacă vreau și inițializarea lui, apelez explicit `super().__init__()`, de obicei primul.”
Verificare: Dacă `Scanner` nu definește deloc `__init__`, ce se întâmplă la `Scanner("h1")`?
Răspuns verificare: Se apelează `Base.__init__`, care nu primește `host`, deci aruncă `TypeError` pentru argumentul în plus.
Varianta greșită B: Ar fi corect doar dacă `Base.__init__` ar rula. Nu rulează, pentru că `Scanner` și-a definit propriul `__init__`.
Varianta greșită C: Un atribut nesetat nu valorează `None`: pur și simplu nu există.
Varianta greșită D: Constructorul primește exact argumentul cerut de `Scanner.__init__`, deci crearea merge; eroarea apare la citirea lui `ready`.

### oop-14
Pe scurt: Fiecare regulă e o clasă sau o funcție cu aceeași interfață, înregistrată într-o listă pe care motorul o parcurge.
Scop: Construiești cod care crește prin adăugare, nu prin modificare (open/closed), important când regulile de detecție se schimbă des.
Mecanism: Motorul știe doar interfața: `matches(event)` și `alert(event)`. Regulile se înregistrează, de exemplu cu un decorator, iar motorul le aplică pe rând. O regulă nouă înseamnă un fișier nou și un test nou.
Pas cu pas:
```text
@register class BruteForce
@register class PrivEscalation
engine: for r in RULES:
          if r.matches(ev): alert
regulă nouă = fișier nou
engine: neschimbat
```
Aplicare:
```python
RULES = []

def register(cls):
    RULES.append(cls())
    return cls
```
Legătură: Pattern-ul strategy cu registru; în Django, `INSTALLED_APPS` și semnalele funcționează pe aceeași idee de înregistrare.
Limită: Un registru global se umple la import: în teste îl golești sau construiești motorul cu o listă explicită de reguli.
La interviu: „Aș defini o interfață comună pentru reguli și un registru. Motorul le parcurge fără să le cunoască, deci o regulă nouă e cod nou, testat separat, fără să ating motorul.”
Verificare: Cum testezi motorul fără să depinzi de regulile reale din registru?
Răspuns verificare: Construiești motorul cu o listă explicită de reguli false (una care se potrivește, una care nu) și verifici alertele produse.
Varianta greșită B: Mutarea `if/elif` într-un alt modul nu schimbă nimic: fiecare regulă nouă tot modifică același cod.
Varianta greșită C: O clasă cu câte o metodă pe regulă se modifică la fiecare regulă nouă și crește la nesfârșit.
Varianta greșită D: `eval` pe stringuri e un risc de securitate (execuție de cod) și nu poate fi testat sau tipat.
