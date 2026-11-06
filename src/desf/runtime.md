<!-- Desfășurările fișei `runtime` (8 puncte). Format și reguli: lib.mjs (checkDesf), .scratch/desfasurari/spec.md. Faptele: research/interview-facts.md, secțiunea 31 (și 4, 5, 19, 20). -->

### harta
Problema: Un script Python merge în dezvoltare, dar în producție aduce surprize: o eroare de tip apare abia pe o ramură rară, memoria rămâne ocupată după `del`, iar importul unui modul pornește un server. Toate vin din felul în care rulează Python: ce se întâmplă între sursă și execuție, când se verifică tipurile și cine ține obiectele în viață. Modulul răspunde la patru întrebări: ce face `python app.py`, ce garanții de tip ai, cum se curăță memoria și cum se încarcă modulele.
Grupuri:
- 1–2: ce face `python app.py`: compilare în bytecode, apoi interpretor (nu cod C/C++)
- 3–6: tipurile: dinamice, dar puternice, hint-uri neverificate de interpretor, față de limbajele compilate AOT
- 7: memoria: reference counting plus GC pentru cicluri
- 8: modulele: importul rulează corpul o singură dată, iar `__name__` spune cum a pornit fișierul

### 1
Greu: da
Problema: Pornești un script de 200 de rânduri cu `python app.py`. O greșeală de sintaxă la rândul 150 oprește tot, înainte să ruleze rândul 1. Deci nu citește „linie cu linie”, dar nici n-ai făcut un build.
Ideea: CPython parsează întâi tot fișierul într-un arbore (AST) și îl compilează în bytecode, instrucțiuni pentru o mașină virtuală. Apoi bucla de evaluare a interpretorului (PVM) execută bytecode-ul. Un modul importat își salvează bytecode-ul în `__pycache__/*.pyc`, ca următorul import să sară peste compilare. Scriptul pornit direct se recompilează de fiecare dată. Un `.pyc` accelerează încărcarea, nu execuția.
Exemplu:
```python
import ast
s = "1 + 2"
t = ast.parse(s, mode="eval")
c = compile(t, "<s>", "eval")
type(c).__name__  # → 'code'
eval(c)  # → 3
```
În C++: Seamănă cu `g++ app.cpp`: sursa e analizată și tradusă înainte de prima rulare, iar linker-ul o adună într-un program.
Unde nu ține: Rezultatul lui C++ e cod mașină, gata de rulat de procesor. Bytecode-ul Python nu rulează singur: îl citește interpretorul, iar formatul lui se schimbă între versiuni. Python compilează modul cu modul, la primul import, nu tot programul dinainte.
Legătură: RT-01 și RT-06. În imaginile Docker se setează des `PYTHONDONTWRITEBYTECODE=1`, ca Python să nu scrie fișiere `.pyc`.

### 2
Problema: La interviu spui „Python se transformă în C++ și apoi rulează”. Intervievatorul întreabă unde e fișierul generat și ce compilator îl construiește. Nu există niciunul.
Ideea: CPython nu generează cod C sau C++ din scriptul tău. El însuși e un program scris în C, iar bucla lui de evaluare execută bytecode-ul instrucțiune cu instrucțiune, ca jucăria de mai jos. Un JIT experimental există, dar e oprit în build-urile obișnuite; `PYTHON_JIT=1` îl pornește unde e inclus.
Exemplu:
```python
s = []
for x in [2, 3, "+"]:
    if x == "+":
        b = s.pop()
        s.append(s.pop() + b)
    else:
        s.append(x)
s  # → [5]
```
Legătură: RT-01 și RT-07 (formularea corectă: „compilat în bytecode, rulat de VM-ul CPython”).

### 3
Greu: da
Problema: O funcție are pe o ramură rară `"1" + 1`. Testele nu trec pe acolo, codul ajunge în producție și greșeala apare abia când un utilizator lovește ramura.
Ideea: O variabilă e un nume legat de un obiect, iar tipul aparține obiectului. Același nume poate arăta apoi spre alt tip. `a + b` se rezolvă la execuție, după tipul obiectelor. Compilarea nu verifică tipurile, deci `TypeError` apare abia când rulează linia. Plasa o faci tu: teste care ating ramurile și un type checker (punctul 5).
Exemplu:
```python
def add(a, b):
    return a + b
add(1, 2)  # → 3
add("a", "b")  # → 'ab'
x = 1
x = "unu"
type(x).__name__  # → 'str'
add(1, "2")  # ! TypeError
```
În C++: Acolo tipul aparține variabilei: `auto x = 1; x = "unu";` nu compilează. Cel mai aproape de „tipul e al obiectului” e un `Base*` spre un obiect cu `virtual`, care își știe tipul real.
Unde nu ține: Variabila rămâne legată de `Base`, deci apelezi doar ce are `Base`, iar operatorii se verifică la compilare. În Python orice nume arată spre orice.
Legătură: RT-02. Duck typing-ul din fișa oop (punctul 8) se sprijină pe aceeași tipizare dinamică.

### 4
Greu: da
Problema: Formularul trimite prețul ca text, `"5"`. În JavaScript, `"5" + 1` dă `"51"`, iar totalul iese greșit fără nicio eroare. Python se oprește pe loc cu `TypeError`.
Ideea: Python nu convertește singur între tipuri când operația e ambiguă; convertești tu: `int("1") + 1`. „Dinamic” spune când se verifică tipurile, iar „puternic” spune cât de ușor le amestecă limbajul. Sunt axe diferite. Unele combinații merg: `1 + 2.5`, iar `"1" * 3` repetă șirul.
Exemplu:
```python
"1" * 3  # → '111'
1 + 2.5  # → 3.5
int("1") + 1  # → 2
"1" + 1  # ! TypeError
```
În C++: C++ e static, dar face conversii implicite între tipurile de bază: `'a' + 1` dă `98`. Și `"1" + 1` compilează, ca aritmetică de pointeri.
Unde nu ține: Acel `"1" + 1` nu dă `"11"`: dă un pointer spre terminatorul `'\0'`, deci un șir gol. Clasele nu se amestecă: `std::string("1") + 1` nu compilează.
Legătură: RT-03. În React, `e.target.value` e mereu șir, deci `+` îl lipește de alt șir; convertești cu `Number(...)`.

### 5
Greu: da
Problema: Scrii `def f(x: int)` și apelezi `f("a")`. Nimic nu se oprește. Dar FastAPI întoarce 422 când primește `"abc"` la un parametru `int`. Hint-ul e același; diferă cine îl citește.
Ideea: Interpretorul păstrează hint-urile în `__annotations__` și nu le verifică. mypy și pyright le verifică static, fără să ruleze codul. Pydantic și FastAPI le citesc la runtime și validează date. Până la 3.13, expresia hint-ului se evaluează la `def` (`x: Lipsa` dă `NameError`); din 3.14 se evaluează leneș.
Exemplu:
```python
def f(x: int) -> int:
    return x
f("a")  # → 'a'
t = f.__annotations__["x"]
t("5")  # → 5
```
Legătură: RT-04. În TypeScript tipurile dispar la compilare, de aceea validezi la graniță cu zod; Python le păstrează, iar Pydantic le folosește pentru asta.

### 6
Greu: da
Problema: O funcție are pe o ramură rară `total + "0"`. În Python trece testele și pică în producție. În C++ aceeași greșeală nu ajunge nici măcar la un executabil.
Ideea: Un limbaj compilat AOT (ahead of time: C++, Rust, Go) traduce tot programul în cod mașină înainte de prima rulare. Verifică tipurile la compilare, deci o greșeală de tip oprește build-ul. Python le verifică la execuție. Poți muta verificarea în față cu mypy sau pyright, dar nu e obligatorie.
Exemplu:
```python
src = "def f(): return 'a' + 1"
c = compile(src, "<s>", "exec")
exec(c)
print("compilat")  # → compilat
f()  # ! TypeError
```
În C++: `std::string s = "a"; int n = s + 1;` nu compilează (g++: `no match for 'operator+'`), deci nu rămâne nimic de rulat.
Unde nu ține: Compilatorul prinde erorile de tip, nu toate erorile. `v[10]` pe un `std::vector` de 3 elemente compilează fără avertisment (`-Wall`) și e comportament nedefinit. Iar `std::any_cast` și `dynamic_cast` verifică tot la runtime: un `any_cast<T>(x)` greșit aruncă `bad_any_cast`.
Legătură: RT-02 și RT-04. TypeScript are `tsc` ca verificator de build, dar după compilare rămâne JavaScript fără tipuri.

### 7
Greu: da
Problema: Un arbore de obiecte ține în fiecare copil o referință la părinte. Ștergi rădăcina, dar memoria nu se eliberează la `del`: părintele și copilul își țin unul altuia contorul peste zero.
Ideea: CPython ține pentru fiecare obiect un contor de referințe. La 0, obiectul e eliberat imediat. Un ciclu (a → b → a) nu ajunge la 0. Îl rezolvă colectorul de cicluri din modulul `gc`, generațional: obiectele noi sunt verificate mai des decât cele vechi. `del x` șterge doar numele și scade contorul. Eliberarea imediată e detaliu al CPython, nu garanție a limbajului.
Exemplu:
```python
import gc, weakref
gc.disable()  # doar pentru demo
class N: pass
n = N(); n.me = n
w = weakref.ref(n)
del n
w() is None  # → False
gc.collect() and w()  # → None
```
În C++: Echivalentul e `std::shared_ptr`: ține un contor și distruge obiectul la 0. Doi `shared_ptr` care se țin reciproc nu ajung la 0, ca ciclul din Python. `std::weak_ptr` rupe ciclul, ca `weakref`.
Unde nu ține: C++ nu are colector de cicluri: ciclul de `shared_ptr` nu se eliberează niciodată, iar destructorul nu rulează. Contorul e opțional: obiectele obișnuite le curăță scope-ul (RAII) sau `unique_ptr`, fără contor. În CPython fiecare obiect are unul.
Legătură: RT-05. Pentru cleanup garantat folosești `with` (fișa python, punctul 6), nu `__del__`.

### 8
Greu: da
Problema: Un test importă `app` ca să încerce o funcție, și deodată pornește serverul. Codul de pornire stă direct în fișier, la nivel de modul, deci rulează la import.
Ideea: `import` execută tot corpul modulului, de sus în jos, dar numai prima dată. Obiectul modul stă apoi în `sys.modules`, iar următoarele importuri îl întorc fără să ruleze nimic. Fișierul pornit cu `python app.py` are `__name__ == "__main__"`; importat, are `__name__ == "app"`. Blocul `if __name__ == "__main__":` rulează deci doar la pornirea directă. Capcană: un fișier pornit direct și importat apoi de altul rulează de două ori, ca `__main__` și ca `app`.
Exemplu:
```python
import pathlib, sys
sys.path.insert(0, ".")
pathlib.Path("m.py").write_text(
    "print('run', __name__)")
import m  # → run m
import m
"m" in sys.modules  # → True
print(__name__)  # → __main__
```
În C++: `main()` e punctul de intrare și există doar în executabil. O bibliotecă legată nu își rulează `main`, deci nu ai nevoie de gardă.
Unde nu ține: În C++, la nivel de fișier există doar declarații: un `puts("x");` acolo nu compilează. Inițializarea obiectelor globale rulează de obicei înainte de `main`, într-o ordine nespecificată între fișiere. Iar `#include` lipește textul de fiecare dată.
Legătură: RT-08. `uvicorn app:app` importă modulul `app`, deci blocul de gardă nu rulează acolo.
