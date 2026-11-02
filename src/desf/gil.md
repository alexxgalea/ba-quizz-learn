<!-- Desfășurările fișei `gil` (8 puncte). Format și reguli: lib.mjs (checkDesf), .scratch/desfasurari/spec.md. Faptele: research/interview-facts.md, secțiunile 2, 16 și 21. -->

### harta
Problema: Adaugi thread-uri ca să meargă mai repede și nu câștigi nimic. Sau câștigi viteză, dar contorul iese greșit. Cauza e GIL-ul: ce limitează, ce lasă liber și ce nu îți garantează. Modulul răspunde la cinci întrebări: ce face GIL-ul, ce unealtă alegi pentru I/O și pentru CPU, cum lucrează asyncio, ce rămâne în grija ta și ce se schimbă fără GIL.
Grupuri:
- 1–2: ce limitează GIL-ul și când e eliberat (cod Python față de I/O și cod nativ)
- 3–4: ce unealtă alegi pentru fiecare tip de sarcină și ce plătești la procese
- 5–6: asyncio (un thread, un event loop) și cum îi limitezi concurența
- 7: GIL-ul nu face codul tău thread-safe
- 8: build-ul fără GIL

### 1
Greu: da
Problema: Rulezi un calcul în Python pur pe 4 thread-uri, pe o mașină cu 4 core-uri. Durează cam cât patru rulări una după alta, nu un sfert din timp.
Ideea: În CPython, un lock global (GIL-ul) lasă un singur thread să execute bytecode Python la un moment dat. Celelalte așteaptă, iar interpretorul dă ștafeta la fiecare 5 ms (`sys.getswitchinterval()`). Deci thread-urile nu paralelizează cod Python CPU-bound. Limita ține de CPython, nu de limbaj.
Analogie: Patru casieri, o singură casă de marcat. Toate stau la ghișeu, dar doar una tastează la un moment dat.
În C++: Patru `std::thread` care fac același calcul pe 4 core-uri rulează deodată și termină de câteva ori mai repede decât patru rulări una după alta.
Unde nu ține: În C++ nu există GIL: două thread-uri care scriu aceeași variabilă fără sincronizare sunt un data race, adică comportament nedefinit. Python își păstrează structurile interne întregi; riști doar un rezultat greșit (punctul 7).
Legătură: GIL-01. Celery rulează implicit task-urile în procese (`prefork`), model recomandat pentru task-uri CPU-bound.

### 2
Greu: da
Problema: Descarci 40 de pagini cu 8 thread-uri și programul termină mult mai repede, deși „un singur thread rulează”. În alt program, 4 thread-uri care comprimă date cu `zlib` chiar folosesc 4 core-uri.
Ideea: Un thread care așteaptă I/O (rețea, disc, DB, `sleep`) eliberează GIL-ul, deci altul rulează Python între timp. Multe extensii native îl eliberează cât lucrează în C: `zlib`, `hashlib` (la peste 2047 de octeți), operațiile NumPy pe array-uri numerice, OpenCV. Acolo thread-urile rulează în paralel. Capcană: GIL-ul e liber doar cât durează apelul nativ; bucla Python dintre apeluri rămâne sub GIL.
Exemplu:
```python
import time
import concurrent.futures as cf
p = cf.ThreadPoolExecutor(4)
s = time.perf_counter()
with p:
    p.map(time.sleep, [.2] * 4)
d = time.perf_counter() - s
print(d < .6)  # → True
```
Legătură: GIL-05. Binding-urile generate ale OpenCV (computer vision) își învelesc apelul în `PyAllowThreads`, deci thread-uri diferite pot procesa imagini în paralel.

### 3
Greu: da
Problema: Ai de descărcat 500 de fișiere prin HTTP și apoi de parsat milioane de linii în Python pur. Cu thread-uri, descărcarea se grăbește, dar parsarea nu.
Ideea: Alegi după unde se duce timpul. Dacă el se duce în așteptare (I/O-bound), folosești `ThreadPoolExecutor`, sau asyncio pentru mii de conexiuni. Dacă se duce în calcul Python (CPU-bound), folosești `ProcessPoolExecutor` sau `multiprocessing`: fiecare proces are GIL-ul lui. Altă ieșire e codul nativ vectorizat, care mută calculul din Python.
Analogie: Un bucătar poate pune mai multe oale la fiert și le supraveghează pe rând, fiindcă apa fierbe singură (I/O). Dar tăiatul de legume îl face doar el: pentru mai mult, ai nevoie de mai mulți bucătari (procese).
Legătură: GIL-02. Gunicorn are aceeași alegere: `--workers` sunt procese, iar `--threads` (worker `gthread`) ajută la cereri cu I/O.

### 4
Greu: da
Problema: Trimiți unui `ProcessPoolExecutor` 100.000 de task-uri de câte o înmulțire și programul merge mai încet decât o buclă simplă. Altă dată îi dai o `lambda` și primești `PicklingError`.
Ideea: Procesele au memorie separată. Argumentele și rezultatele sunt serializate cu pickle, trimise printr-un canal (IPC) și deserializate, deci procesul lucrează pe o copie. Serializarea costă: un task foarte mic costă mai mult pe transport decât pe calcul, deci trimiți bucăți mari (`map(..., chunksize=…)`). Pickle cere obiecte găsite după nume: funcții de nivel de modul, nu `lambda`.
Exemplu:
```python
import pickle as p
x = [1]
y = p.loads(p.dumps(x))
y.append(2)
print(x, y)  # → [1] [1, 2]
f = lambda: 1
p.dumps(f)  # ! PicklingError
```
În C++: Biblioteca standard C++17 nu are procese (doar `std::system`); folosești `fork` (POSIX) sau o bibliotecă. Memoria e separată și acolo.
Unde nu ține: În C++ trimiți tu octeții (pipe, memorie partajată), pe când pickle serializează în locul tău. Iar pentru CPU-bound ajung de obicei thread-urile (punctul 1); în Python procesele sunt calea obișnuită.
Legătură: GIL-06. Celery trimite argumentele unui task prin broker, serializate (JSON implicit din 4.0), din același motiv: task-ul rulează în alt proces.

### 5
Greu: da
Problema: Un endpoint `async def` apelează `time.sleep(2)` sau `requests.get`. Cât durează apelul, nicio altă cerere nu primește răspuns, deși codul e „async”.
Ideea: asyncio rulează într-un singur thread, cu un event loop. Concurența e cooperativă: o corutină cedează controlul doar la `await`, iar loop-ul alege atunci alta. Un apel blocant nu are `await`, deci ține loop-ul ocupat. Îl muți într-un thread cu `await asyncio.to_thread(f, ...)`. Pentru CPU-bound în Python pur nu ajută: tot GIL-ul.
Exemplu:
```python
import asyncio as aio, time
async def w(): time.sleep(.2)
async def main():
    s = time.perf_counter()
    await aio.gather(w(), w())
    d = time.perf_counter() - s
    print(d > .35)  # → True
aio.run(main())
```
Legătură: GIL-04 și GIL-11. În FastAPI, un endpoint `def` rulează într-un threadpool, iar un `async def` rulează direct pe loop (fișa asgi).

### 6
Greu: da
Problema: Pornești 10.000 de cereri cu `asyncio.gather`. Se deschid toate odată și rămâi fără conexiuni sau serverul te respinge. Iar cu `gather`, când una pică, celelalte merg mai departe degeaba.
Ideea: Limitezi concurența cu `asyncio.Semaphore(N)`: `async with sem:` lasă înăuntru cel mult N corutine. Alternativa e un grup de N workeri care iau din aceeași `asyncio.Queue`. `TaskGroup` (3.11+) anulează restul grupului la prima eroare dintr-un task, iar la ieșire ridică un `ExceptionGroup`.
Analogie: Semaforul e o parcare cu N locuri. A N+1-a mașină așteaptă la barieră până pleacă una.
Exemplu:
```python
import asyncio as aio
async def bad(): raise KeyError
async def main():
    async with aio.TaskGroup() as g:
        g.create_task(aio.sleep(9))
        g.create_task(bad())
aio.run(main())  # ! ExceptionGroup
```
Legătură: GIL-07 și GIL-12. În Celery, `--concurrency` limitează tot câte task-uri rulează odată.

### 7
Greu: da
Problema: 4 thread-uri incrementează câte 100.000 de ori același contor. Aștepți 400.000, dar poți obține mai puțin, și altceva la fiecare rulare.
Ideea: `counter += 1` nu e o singură operație: interpretorul citește valoarea, adună 1 și scrie rezultatul. GIL-ul nu protejează secvența: interpretorul poate schimba thread-ul între două instrucțiuni de bytecode. Dacă se întâmplă între citire și scriere, un increment se pierde. Pe unele versiuni pierderea se vede rar, dar garanție nu ai. Același risc are „verifică, apoi scrie”. Rezolvi cu `with lock:` în jurul secvenței sau eviți starea partajată (o coadă, un rezultat per thread).
Exemplu:
```python
# intercalare posibilă, simulată
n = 0
a = n      # A citește 0
b = n      # B citește 0
n = a + 1  # A scrie 1
n = b + 1  # B scrie 1
print(n)   # → 1
```
În C++: `std::mutex` cu `std::lock_guard` fac ce fac `threading.Lock` cu `with lock:`: intri în secțiunea critică, iar ieșirea o eliberează chiar dacă apare o excepție.
Unde nu ține: C++ are `std::atomic<int>`, unde `++` e atomic. Python n-are echivalent: `+=` pe `int` nu e atomic nici cu GIL. Un `Lock` poate fi eliberat de alt thread; `unlock` pe un `std::mutex` ținut de alt thread e comportament nedefinit.
Legătură: GIL-03. În Django, `F("count") + 1` mută incrementul în baza de date, ca să nu se piardă între citire și scriere.

### 8
Greu: da
Problema: Citești că „Python scapă de GIL”, instalezi 3.13 și te aștepți ca thread-urile CPU-bound să folosească toate core-urile. Nu se schimbă nimic.
Ideea: PEP 703 definește un build free-threaded, fără GIL, cu executabil separat (`python3.13t`). În 3.13 a fost experimental, iar din 3.14 e suportat oficial (PEP 779), dar tot opțional. Build-ul implicit are GIL; verifici cu `sys._is_gil_enabled()`. Importul unei extensii C nemarcate ca sigură pentru free-threading poate reactiva GIL-ul. Tipurile `list` și `dict` rămân sigure, prin lock-uri interne, dar `+=` rămâne cursă (punctul 7).
Exemplu:
```python
import sys
sys._is_gil_enabled()  # → True
```
Legătură: GIL-10.
