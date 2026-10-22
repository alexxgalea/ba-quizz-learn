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
})(window.PREP);
