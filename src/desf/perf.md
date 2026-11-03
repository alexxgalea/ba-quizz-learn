<!-- Desfășurările fișei `perf` (8 puncte). Format și reguli: lib.mjs (checkDesf), .scratch/desfasurari/spec.md. Faptele: research/_desf_facts_perf.md (secțiunea 38). C++ doar la 1 (perf, callgrind), 2 (vector, unordered_set, deque) și 7 (thread-uri față de procese); la restul nu există un echivalent real. -->

### harta
Problema: Un job sau un endpoint e prea lent, consumă prea multă memorie sau nu scalează când adaugi core-uri. Fără măsurare, optimizezi partea greșită. După măsurare, aproape orice câștig vine din același loc: împarți un cost fix (un apel, o conexiune, un transport între procese) la mulți itemi. Modulul răspunde la patru întrebări: unde se duc timpul și memoria, ce cost ascuns are algoritmul și fiecare apel de I/O, cât costă fiecare element în CPU și în memorie, și cât câștigi paralelizând.
Grupuri:
- 1: cum măsori (profilere pentru timp și pentru memorie)
- 2–3: costul ascuns al algoritmului și al fiecărui apel de I/O
- 4–5: costul pe element: CPU (vectorizare, cod nativ) și memorie (generatori, flux)
- 6: ritmul dintre etape (backpressure)
- 7–8: procese pe mai multe core-uri și limita câștigului (chunksize, Amdahl)

### 1
Greu: da
Problema: Jobul de noapte durează 40 de minute. Optimizezi funcția care „pare lentă” și câștigi 2%, fiindcă timpul se ducea în altă parte.
Ideea: `cProfile` urmărește fiecare apel, precis, dar cu overhead, și pornește odată cu programul. SnakeViz îi arată fișierul `.prof` în browser. `py-spy` eșantionează din exterior un proces deja pornit, fără restart și fără modificarea codului; pe Linux cere root sau, într-un container, `SYS_PTRACE`. `line_profiler` cronometrează linie cu linie funcțiile decorate cu `@profile`. `tracemalloc` arată cine alocă memorie. Citești `tottime` (fără subapeluri) și `cumtime` (cu subapeluri).
Exemplu:
```text
python -m cProfile -s tottime job.py
ncalls tottime cumtime  func
200000   0.060   0.060  genexpr
 20000   0.044   0.104  sum
 20000   0.012   0.116  parse
     1   0.007   0.122  main
```
În C++: `perf record -g` eșantionează un program (`-p PID` pentru unul pornit), ca `py-spy`. `valgrind --tool=callgrind` urmărește fiecare apel, ca `cProfile`.
Unde nu ține: Pe un proces Python, `perf` vede în mod normal doar funcții ale interpretorului (`_PyEval_EvalFrameDefault`). De la Python 3.12, `python -X perf` îi dă numele funcțiilor Python. `py-spy` citește direct stack-ul Python.
Legătură: PF-01 și PF-07; schelet: `s-perf-profile`. La query-uri, același reflex e `EXPLAIN ANALYZE` (IDX-01).

### 2
Greu: da
Problema: Un import verifică fiecare dintre 10 000 de ID-uri cu `if id in seen`, unde `seen` e o listă. Cu 100 de rânduri merge, cu 10 000 durează minute.
Ideea: `x in lista` parcurge elementele unul câte unul: O(n) per căutare, deci O(n²) într-o buclă. `x in set` și `x in dict` folosesc hash-ul: O(1) în medie. `list.pop(0)` și `list.insert(0, x)` mută toate elementele, iar `deque.popleft()` e O(1).
Exemplu:
```python
import time
xs = list(range(10_000))
s = set(xs)
def run(c):
    t = time.perf_counter()
    for _ in range(500): 9999 in c
    return time.perf_counter() - t
run(xs) > 50 * run(s)  # → True
```
În C++: `std::find` pe un `std::vector` e O(n), iar `std::unordered_set::count` e O(1) în medie. `std::deque` are `pop_front()` O(1), ca `deque` din Python.
Unde nu ține: `std::vector<int>` ține valorile una lângă alta în memorie. Lista Python ține o matrice de referințe, iar fiecare `int` e un obiect separat, deci scanarea sare prin memorie.
Legătură: N+1 (SQLAlchemy, punctul 8) e tot un O(n²) ascuns, mutat în baza de date.

### 3
Greu: da
Problema: Importul inserează 100 000 de rânduri, câte un `INSERT` și un `commit` pe rând. Pe laptop merge; cu baza de date în altă mașină durează ore.
Ideea: Fiecare apel plătește un cost fix: round-trip pe rețea, `commit` pe disc. Un lot îl plătește o singură dată pentru mii de rânduri: bulk insert într-o tranzacție sau `COPY` în Postgres. Redis face la fel prin pipelining: trimiți comenzile fără să aștepți fiecare răspuns. O conexiune nouă costă un handshake, deci refolosești conexiunile (pool, un singur client HTTP).
Exemplu:
```text
sqlite3 pe disc, 2 000 de rânduri:
insert + commit pe rând   3,0 s
executemany, un commit    0,004 s
```
Legătură: PF-02; fișele postgres (COPY) și redis.

### 4
Greu: da
Problema: Scorul se calculează într-un `for` pe 10 milioane de rânduri. Rulează minute întregi, pe un singur core.
Ideea: O buclă Python execută bytecode pentru fiecare element. Vectorizarea (NumPy, pandas, Polars) mută bucla în cod nativ, pe coloane compacte. Pentru Python pur, paralelizezi cu procese: thread-urile nu ajută la calcul din cauza GIL. O bibliotecă nativă, ca `orjson` (JSON în Rust), face aceeași muncă mai repede. Un regex folosit des se compilează o dată cu `re.compile`. Un cache (`functools.lru_cache`) evită recalcularea.
Exemplu:
```text
suma i*i, 1 000 000 de numere:
buclă for în Python      0,16 s
NumPy: (x * x).sum()     0,002 s
```
Legătură: PF-03. Cache-ul pe rezultate e ca `cached_property` din fișa oop (punctul 4).

### 5
Problema: Exportul citește 5 milioane de rânduri cu `.all()`. Procesul ajunge la gigaocteți, iar containerul e oprit cu codul 137.
Ideea: Un generator produce un element pe rând, deci memoria rămâne constantă; o listă le ține pe toate. Procesezi pe loturi, apoi le uiți. Din baza de date citești în flux: în SQLAlchemy, `yield_per(N)` folosește un cursor server-side, iar `.all()` aduce tot dintr-odată.
Exemplu:
```python
import tracemalloc as tm
tm.start()
sum([i for i in range(10**6)])
a = tm.get_traced_memory()[1]
tm.reset_peak()
sum(i for i in range(10**6))
b = tm.get_traced_memory()[1]
a > 100 * b  # → True
```
Legătură: PF-05 și LX-07 (finalul tipic al unui `.all()`: exit code 137).

### 6
Problema: Producătorul citește 10 000 de mesaje pe secundă, consumatorul procesează 1 000. Coada fără limită crește în memorie până la OOM, iar latența crește la nesfârșit.
Ideea: Pui între etape o coadă cu limită. Când e plină, `put()` blochează producătorul până se eliberează loc, iar `put_nowait()` ridică `Full`. Ritmul întregii linii devine ritmul etapei celei mai lente. În asyncio, `asyncio.Queue(maxsize=N)` face la fel cu `await q.put()`.
Exemplu:
```python
import queue
q = queue.Queue(maxsize=2)
q.put(1)
q.put(2)
q.full()  # → True
q.put_nowait(3)  # ! Full
```
Legătură: PF-04. La RabbitMQ, același rol îl are `prefetch` (fișa rabbitmq).

### 7
Greu: da
Problema: Un `for` simplu procesează 200 000 de numere în 0,05 s. Cu `ProcessPoolExecutor(4).map` și o funcție mică, aceleași numere durează aproape un minut.
Ideea: Fiecare task trece granița dintre procese: argumentele se serializează cu `pickle`, merg printr-un pipe, iar rezultatul se întoarce pe același drum. Cu `chunksize=1` plătești asta pentru fiecare element. Un `chunksize` mare trimite un lot într-un singur mesaj. `ProcessPoolExecutor.map` pornește cu `chunksize=1`; `Pool.map` alege singur unul din lungimea datelor. Paralelizezi doar când un lot muncește mult mai mult decât costă transportul lui.
Exemplu:
```text
ProcessPoolExecutor(4).map(f, ...):
chunksize=1 (implicit)   55 s
chunksize=1000            0,1 s
for simplu                0,05 s
```
În C++: Două `std::thread` văd aceeași memorie, deci nu serializezi nimic.
Unde nu ține: În Python, thread-urile nu accelerează calculul (GIL), așa că folosești procese și plătești `pickle`. Și în C++, procesele separate (`fork`, pipe) cer serializare.
Legătură: PF-06 și GIL-06 (tot ce trece între procese e pickle).

### 8
Problema: Un job durează 100 s, din care 10 s sunt secvențiale: citește configurația și scrie rezultatul. Adaugi 8 core-uri și aștepți de 8 ori mai repede.
Ideea: Legea lui Amdahl: p este partea paralelizabilă, iar n numărul de core-uri. La p = 0,9 și n = 8, câștigul este de 4,71 ori. Plafonul este de 10 ori, oricâte core-uri adaugi, fiindcă 10% rămâne serial. Partea serială limitează câștigul, deci o măsori întâi și o micșorezi.
Exemplu:
```python
def amdahl(p, n):
    return 1 / ((1 - p) + p / n)
round(amdahl(.9, 8), 2)  # → 4.71
round(amdahl(.9, 1e9), 2)  # → 10.0
```
Legătură: PF-06: costul de transport între procese face partea serială mai mare.
