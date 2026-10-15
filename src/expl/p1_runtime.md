<!-- Runtime CPython. Variantele greșite: B, C, D = ordinea din sursă (A e cea corectă). -->

### rt-01
Pe scurt: CPython compilează sursa în bytecode, apoi îl execută în mașina lui virtuală, instrucțiune cu instrucțiune.
Scop: „Python e interpretat” e doar jumătate de adevăr. Vrei să explici exact ce se întâmplă, ca să poți vorbi apoi despre GIL, `.pyc` și performanță.
Mecanism: La pornire, CPython parsează sursa într-un AST (arborele sintactic), îl compilează în bytecode, adică instrucțiuni simple pentru o mașină virtuală, și execută bytecode-ul într-o buclă de evaluare scrisă în C. Erorile de sintaxă apar la compilare, înainte să ruleze ceva; erorile de tip apar abia la execuție.
Pas cu pas:
```text
app.py -> parser -> AST
AST -> compilator -> bytecode
bytecode -> bucla de evaluare (C)
modulele importate -> cache .pyc
```
Aplicare: Vezi bytecode-ul cu modulul `dis`:
```python
import dis
dis.dis(lambda a, b: a + b)
# încărcări, BINARY_OP (+), RETURN_VALUE
```
Legătură: Seamănă cu Java (sursă, bytecode, mașină virtuală), cu diferența că CPython compilează automat, la rulare, și nu verifică tipurile.
Limită: CPython nu e singura implementare: PyPy are un JIT care generează cod mașină. Iar CPython are, din 3.13, un JIT experimental, oprit implicit.
La interviu: „CPython compilează sursa în bytecode și îl execută într-o mașină virtuală. Modulele importate își păstrează bytecode-ul în fișiere `.pyc`. Tipurile se verifică abia la execuție.”
Verificare: Ai o eroare de sintaxă pe ultima linie din `app.py`. Rulează măcar primele linii?
Răspuns verificare: Nu: fișierul e compilat întreg înainte de execuție, iar compilarea eșuează cu `SyntaxError`. Nu se execută nimic din el.
Varianta greșită B: CPython nu generează C++. Unelte separate, ca Cython sau Nuitka, fac ceva asemănător, dar nu e pasul standard.
Varianta greșită C: Există un pas de compilare: tot fișierul e transformat în bytecode înainte să ruleze ceva. De aceea o eroare de sintaxă oprește totul de la început.
Varianta greșită D: CPython nu compilează JIT implicit. Din 3.13 există un JIT experimental, dar e oprit implicit.

### rt-02
Pe scurt: Tipurile aparțin obiectelor, iar operațiile le verifică abia când se execută, deci eroarea apare la rularea liniei.
Scop: Explici de ce un bug de tip poate sta ascuns într-o ramură rar executată și de ce testele și verificatoarele statice contează în Python.
Mecanism: O variabilă e doar un nume legat de un obiect, iar tipul e al obiectului. Când rulează `a + b`, interpretorul se uită la tipurile celor două obiecte și caută operația potrivită (`__add__`). Dacă nu există, aruncă `TypeError` chiar atunci. Compilarea în bytecode nu verifică tipuri.
Pas cu pas:
```text
def f(x): return x + 1  -> compilează
f(2)    -> 3
f("a")  -> TypeError, abia acum
```
Aplicare: Prinzi erorile de tip mai devreme cu type hints plus mypy sau pyright în CI și cu teste care acoperă și ramurile rare.
Legătură: E ca în JavaScript fără TypeScript: tipurile se află la rulare. mypy e pentru Python ce e `tsc` pentru TypeScript.
Limită: Verificarea statică e opțională și poate fi ocolită (`Any`, `# type: ignore`). Datele venite din afară (JSON, request-uri) le validezi oricum la runtime, de exemplu cu Pydantic.
La interviu: „În Python, tipurile aparțin obiectelor și se verifică la execuția operației, deci un `TypeError` apare doar când rulează linia. Prind astfel de erori devreme cu type hints, mypy sau pyright în CI și cu teste.”
Verificare: O ramură `if` care rulează o dată pe lună conține `total + "lei"`, unde `total` e int. Când afli de bug?
Răspuns verificare: Abia când rulează ramura, în producție, dacă nu o acoperă un test. mypy ar fi semnalat problema din CI.
Varianta greșită B: Python are tipuri, doar că aparțin obiectelor, nu variabilelor: `type(3)` e `int`.
Varianta greșită C: Compilatorul nu ignoră erorile de tip ca optimizare: pur și simplu nu le verifică, pentru că tipurile se cunosc abia la execuție.
Varianta greșită D: Nu există un mod debug care să verifice tipurile înainte. Verificarea se face mereu la execuție, la fiecare operație.

### rt-03
Pe scurt: Aruncă `TypeError`: Python nu convertește singur un `str` în `int` sau invers, pentru că rezultatul ar fi ambiguu.
Scop: Diferența dintre dinamic și puternic tipat apare des la interviu, mai ales când vii din JavaScript.
Mecanism: La `"1" + 1`, Python încearcă `str.__add__`, care acceptă doar alt `str`, apoi `int.__radd__`, care acceptă doar numere. Niciuna nu știe să combine cele două tipuri, deci operația eșuează. Python nu ghicește dacă voiai concatenare sau adunare.
Pas cu pas:
```text
"1" + 1 -> str.__add__(1): nu știe
        -> int.__radd__("1"): nu știe
        -> TypeError
"1" + str(1) -> "11"
int("1") + 1 -> 2
```
Aplicare: Convertești explicit, după intenție: `int(s) + 1` pentru adunare, `s + str(n)` sau un f-string, `f"{s}{n}"`, pentru text.
Legătură: În JavaScript, `"1" + 1` dă `"11"`, iar `"1" - 1` dă `0`. Python refuză tocmai ca să eviți astfel de surprize.
Limită: Python face totuși conversii sigure între numere: `1 + 2.5` dă `3.5`, iar `True + 1` dă `2`, pentru că `bool` e o subclasă a lui `int`.
La interviu: „Python e dinamic, dar puternic tipat: tipurile se află la runtime, dar nu face conversii implicite ambigue. `"1" + 1` aruncă `TypeError`, așa că eu convertesc explicit, după intenție.”
Verificare: Ce dă `"1" * 3` în Python?
Răspuns verificare: `"111"`: înmulțirea unui string cu un int e definită explicit, ca repetare, deci nu e o conversie implicită.
Varianta greșită B: Așa se comportă JavaScript. Python nu transformă singur numărul în text.
Varianta greșită C: Python nu transformă singur textul în număr. Pentru 2 scrii `int("1") + 1`.
Varianta greșită D: Operația nu întoarce nimic: aruncă excepție înainte să existe vreun rezultat.

### rt-04
Pe scurt: Interpretorul nu le verifică: sunt metadate, folosite de mypy sau pyright înainte de rulare și citite de biblioteci ca Pydantic la runtime.
Scop: FastAPI și Pydantic par să „aplice” tipurile. La interviu explici că biblioteca face asta, nu Python.
Mecanism: Adnotările se păstrează în `__annotations__`, pe funcție sau pe clasă. Din Python 3.14 sunt evaluate leneș, abia la primul acces (PEP 649); înainte erau evaluate la definirea funcției. Interpretorul nu le folosește la apeluri, iar Pydantic și FastAPI le citesc explicit ca să construiască validarea.
Pas cu pas:
```text
def f(x: int) -> str: ...
f("abc")  -> rulează, fără eroare
f.__annotations__
  -> {'x': int, 'return': str}
mypy app.py -> eroare: "abc" nu e int
```
Aplicare: Pui hint-uri peste tot și rulezi mypy sau pyright în CI. La granițele sistemului (request-uri, JSON, mesaje din coadă) validezi la runtime, cu Pydantic.
Legătură: Ca în TypeScript, nimeni nu verifică tipurile la rulare. Diferența: în TypeScript ele dispar, pe când în Python rămân disponibile, de aceea le poate citi Pydantic.
Limită: Un hint greșit nu dă nicio eroare la rulare, iar un hint mincinos e mai rău decât niciunul. Doar verificatorul static sau validarea explicită le fac utile.
La interviu: „Type hints-urile nu sunt verificate de interpretor: sunt metadate în `__annotations__`. mypy sau pyright le verifică static, iar Pydantic și FastAPI le citesc la runtime ca să valideze datele.”
Verificare: Un endpoint FastAPI are `item_id: int`, iar clientul trimite `"abc"`. Cine răspunde cu eroare și cu ce cod?
Răspuns verificare: FastAPI, prin Pydantic, care citește hint-ul și validează: clientul primește 422. Python însuși nu verifică nimic.
Varianta greșită B: Interpretorul nu verifică hint-urile la apel. Funcția rulează cu orice argument; eroarea apare doar dacă o operație eșuează.
Varianta greșită C: CPython nu generează cod pe baza hint-urilor. Optimizările lui interne se bazează pe tipurile observate la rulare, nu pe adnotări.
Varianta greșită D: Hint-urile rămân disponibile la runtime, în `__annotations__` sau prin `typing.get_type_hints`. De aceea le poate citi Pydantic.

### rt-05
Pe scurt: CPython eliberează majoritatea obiectelor prin reference counting, imediat ce nu mai sunt referite, iar un GC generațional colectează ciclurile de referințe.
Scop: Explici de ce memoria unui proces Python crește sau nu scade și ce face, de fapt, `del`.
Mecanism: Fiecare obiect are un contor de referințe. Când contorul ajunge la 0, obiectul e eliberat imediat. Două obiecte care se referă unul pe altul nu ajung niciodată la 0, așa că modulul `gc` caută periodic astfel de cicluri izolate și le eliberează.
Pas cu pas:
```text
a = [1, 2]  -> 1 referință
b = a       -> 2 referințe
del a       -> 1 referință (b)
b = None    -> 0 -> eliberată imediat
x.self = x; del x -> ciclu: îl ia gc
```
Aplicare: Pentru scurgeri de memorie folosești `tracemalloc` și compari snapshot-uri. Cauza tipică nu e GC-ul, ci referințe uitate: un cache global sau o listă care tot crește.
Legătură: În Java sau JavaScript, GC-ul principal rulează periodic. În CPython, majoritatea obiectelor sunt eliberate imediat, prin contor.
Limită: Memoria eliberată nu se întoarce mereu la sistemul de operare: alocatorul CPython o păstrează pentru obiecte noi, deci memoria procesului poate rămâne mare.
La interviu: „CPython folosește reference counting: un obiect e eliberat imediat ce nu mai are referințe. Ciclurile le colectează un GC generațional, modulul `gc`. `del` șterge doar un nume.”
Verificare: Faci `del big_list`, dar memoria procesului nu scade. Ce poate explica asta?
Răspuns verificare: Fie altă referință ține lista în viață (alt nume, un cache, o closure), fie lista a fost eliberată, dar alocatorul n-a returnat memoria sistemului.
Varianta greșită B: CPython nu se bazează doar pe un GC periodic: majoritatea obiectelor sunt eliberate imediat, prin reference counting. GC-ul se ocupă doar de cicluri.
Varianta greșită C: Nu e manual: `del` șterge doar un nume. Obiectul e eliberat automat, când nu mai are nicio referință.
Varianta greșită D: Memoria se eliberează continuu, pe măsură ce obiectele nu mai sunt referite, nu doar la final.

### rt-06
Pe scurt: Un `.pyc` e bytecode-ul unui modul importat, salvat pe disc ca importurile următoare să nu-l mai compileze.
Scop: Știi ce sunt fișierele din `__pycache__/`, de ce apar și de ce fac aplicația să pornească mai repede, nu să ruleze mai repede.
Mecanism: La import, CPython caută un `.pyc` pentru versiunea curentă a interpretorului (de exemplu `utils.cpython-312.pyc`) și verifică dacă sursa nu s-a schimbat. Dacă e valid, încarcă direct bytecode-ul; altfel compilează sursa și rescrie `.pyc`-ul.
Pas cu pas:
```text
import utils (prima dată)
  -> compilează utils.py
  -> scrie __pycache__/utils.cpython-312.pyc
import utils (data viitoare)
  -> sursa neschimbată -> încarcă .pyc
```
Aplicare: Pui `__pycache__/` în `.gitignore`. În containere poți seta `PYTHONDONTWRITEBYTECODE=1`, ca să nu scrii `.pyc` la rulare, sau le generezi la build cu `python -m compileall`.
Legătură: Seamănă cu fișierele `.class` din Java, doar că sunt generate automat, la import.
Limită: Scriptul pe care îl rulezi direct (`python app.py`) nu primește `.pyc`, doar modulele importate. Iar `.pyc` nu ascunde codul: bytecode-ul se decompilează ușor.
La interviu: „`.pyc` e bytecode-ul cache-uit al unui modul importat, în `__pycache__/`, specific versiunii de Python. Accelerează pornirea, pentru că sare peste compilare, nu execuția.”
Verificare: Ștergi tot `__pycache__/` și repornești aplicația. Ce se schimbă?
Răspuns verificare: Doar prima pornire durează puțin mai mult: modulele se recompilează și `.pyc`-urile se regenerează. Comportamentul rămâne identic.
Varianta greșită B: Bytecode-ul nu e cod mașină: îl execută mașina virtuală CPython, nu procesorul direct.
Varianta greșită C: pip lucrează cu alte fișiere (`pyproject.toml`, metadatele din wheel). `.pyc` e generat de interpretor, la import.
Varianta greșită D: Nu e sursă minificată, ci rezultatul compilării în bytecode. Nu-l poți edita ca pe un fișier sursă.

### rt-07
Pe scurt: Cea mai precisă: Python e compilat în bytecode, rulat de mașina virtuală CPython, iar tipurile se verifică la runtime.
Scop: La interviu, o frază precisă despre cum rulează Python arată că știi ce e sub capotă, nu doar sintaxa.
Mecanism: Formularea bună răspunde corect la trei întrebări. Există compilare? Da, în bytecode. Cine rulează bytecode-ul? Mașina virtuală CPython, nu procesorul direct. Când se verifică tipurile? La execuția fiecărei operații.
Pas cu pas:
```text
compilare?   da, în bytecode
cine rulează? VM-ul CPython
tipuri?      la runtime, per operație
```
Aplicare: Spui fraza, apoi o legi de un detaliu practic: „De aceea `.pyc` accelerează doar pornirea, iar erorile de tip le prind cu mypy în CI.”
Legătură: Rezumă grilele RT-01, RT-02 și RT-06 într-o singură frază.
Limită: Detaliile țin de CPython. Alte implementări, ca PyPy, compilează JIT în cod mașină; dacă te întreabă de ele, precizezi că vorbeai despre CPython.
La interviu: „CPython compilează sursa în bytecode și îl execută în mașina lui virtuală. Tipurile se verifică la runtime, când rulează fiecare operație, așa că erorile de tip le prind static, cu mypy, sau prin teste.”
Verificare: Intervievatorul spune: „Deci Python e ca Java?” Ce răspunzi?
Răspuns verificare: Seamănă prin bytecode și mașina virtuală, dar diferă la tipuri: Java le verifică la compilare, Python la runtime. Iar Java are JIT implicit; CPython, nu.
Varianta greșită B: CPython are un pas de compilare: tot fișierul e transformat în bytecode înainte de execuție.
Varianta greșită C: CPython nu trece prin C++. Bytecode-ul e executat de interpretor, care e scris în C.
Varianta greșită D: Compilarea în bytecode nu verifică tipurile. Spre deosebire de Java, tipurile se verifică abia la execuție.
