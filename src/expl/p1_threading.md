<!-- Threading: cozi, lock-uri, executori, semnale. Variantele greșite: B, C, D = ordinea din sursă (A e cea corectă). -->

### gil-15
Pe scurt: `queue.Queue`: e thread-safe, `get()` doarme până apare un element, iar `task_done()` și `join()` îți spun când s-a terminat tot lucrul.
Scop: Construiești producer/consumer fără să scrii singur sincronizarea.
Mecanism: Coada are intern un lock și condiții. `put()` adaugă și trezește un consumator; `get()` blochează fără să consume CPU. Fiecare consumator cheamă `task_done()` după ce termină un element, iar `q.join()` așteaptă până când toate elementele puse au fost marcate ca terminate.
Pas cu pas:
```text
producător: q.put(job) x 100
4 workeri: job = q.get()
           proceseaza(job)
           q.task_done()
main: q.join() -> toate gata
oprire: câte un None pe worker
```
Aplicare:
```python
def worker():
    while True:
        job = q.get()
        if job is None:
            break
        handle(job)
        q.task_done()
```
Legătură: E modelul din RabbitMQ și Celery (broker, workeri, ack), doar în memorie, într-un singur proces.
Limită: Coada trăiește doar în memoria procesului: la crash pierzi lucrul. Pentru durabilitate, un broker. Din 3.13, `Queue.shutdown()` oprește curat coada.
La interviu: „Pentru producer/consumer cu threaduri folosesc `queue.Queue`: e thread-safe, `get()` doarme fără să consume CPU, iar `join()` și `task_done()` îmi spun când e gata. Opresc workerii cu o valoare santinelă sau cu `shutdown()`.”
Verificare: Cum oprești cei 4 workeri după ce producătorul a terminat?
Răspuns verificare: Pui câte un `None` (santinelă) pentru fiecare worker, sau, din 3.13, `q.shutdown()`, care face `get()` să arunce `ShutDown` după ce coada se golește.
Varianta greșită B: GIL-ul nu face sigure operațiile compuse (verifici că lista nu e goală, apoi `pop`), iar `pop(0)` e O(n). În plus, consumatorii ar trebui să interogheze lista în buclă.
Varianta greșită C: `asyncio.Queue` e pentru corutine, într-o singură buclă, și nu e thread-safe.
Varianta greșită D: Un `while True` care verifică încontinuu consumă CPU degeaba și tot are nevoie de lock.

### gil-16
Pe scurt: Deadlock: un `Lock` simplu blochează și threadul care îl ține deja, deci `inner` așteaptă la nesfârșit.
Scop: Recunoști deadlock-ul de reintrare și știi alternativele.
Mecanism: `Lock` nu ține minte cine l-a luat; a doua cerere, chiar din același thread, așteaptă eliberarea, care nu mai vine. `RLock` ține minte threadul proprietar și un contor, deci același thread îl poate lua de mai multe ori.
Pas cu pas:
```text
outer: lock.acquire() -> ok
outer -> inner
inner: lock.acquire() -> așteaptă
  (îl ține chiar el)
deadlock
fix: RLock sau _inner_unlocked()
```
Aplicare:
```python
lock = threading.RLock()
```
Legătură: E aceeași familie de bug-uri ca deadlock-ul cu două lock-uri luate în ordine inversă (cardul cu `transfer_1` și `transfer_2`).
Limită: `RLock` ascunde uneori un design neclar. Adesea e mai curat să ai o funcție internă care presupune lock-ul deja luat și o funcție publică care îl ia.
La interviu: „Un `Lock` nu e reentrant: dacă același thread îl cere de două ori, se blochează singur. Folosesc `RLock` sau separ codul care presupune lock-ul deja luat.”
Verificare: Cum ai diagnostica un worker blocat în producție?
Răspuns verificare: Cu un dump al stivelor tuturor threadurilor (`py-spy dump --pid` sau `faulthandler`): vezi exact la ce `acquire` stă fiecare thread.
Varianta greșită B: Asta face un `RLock`. Un `Lock` simplu nu ține minte proprietarul.
Varianta greșită C: `Lock` nu detectează situația; doar așteaptă. Nu există o eroare care să te salveze.
Varianta greșită D: `with lock:` nu e opțional: `inner` așteaptă la `acquire` și nu ajunge niciodată în bloc.

### gil-17
Pe scurt: În ordinea în care termină cererile: `as_completed` întoarce fiecare future imediat ce e gata.
Scop: Alegi între rezultate în ordinea intrărilor (`map`) și rezultate cât mai repede (`as_completed`).
Mecanism: `submit` întoarce imediat un `Future`. `as_completed` le dă pe măsură ce se termină, deci poți procesa primul rezultat fără să-l aștepți pe cel mai lent. `f.result()` întoarce valoarea sau ridică excepția din worker.
Pas cu pas:
```text
submit u1 (3 s), u2 (1 s), u3 (2 s)
as_completed -> u2, u3, u1
map          -> u1, u2, u3
  (map așteaptă u1 primul)
```
Aplicare:
```python
for f in as_completed(fs):
    try:
        save(f.result())
    except Exception:
        log.exception("fetch")
```
Legătură: În asyncio, `asyncio.as_completed` face același lucru pentru corutine.
Limită: Pierzi legătura cu intrarea: dacă îți trebuie, ții un `dict` de la future la URL.
La interviu: „Cu `as_completed` procesez rezultatele pe măsură ce vin; cu `executor.map` le primesc în ordinea intrărilor. `result()` ridică excepția din worker, deci o tratez acolo.”
Verificare: Unul dintre `fetch` aruncă excepție. Când o vezi?
Răspuns verificare: Doar când apelezi `result()` pe future-ul lui. Dacă nu-l apelezi niciodată, eroarea trece neobservată.
Varianta greșită B: Asta face `executor.map`. `as_completed` nu păstrează ordinea.
Varianta greșită C: Ordinea nu e aleatoare: e ordinea terminării.
Varianta greșită D: `as_completed` dă fiecare rezultat imediat, nu le adună pe toate.

### gil-18
Pe scurt: `Event` e un semnal sincronizat: un thread face `set()`, iar altele așteaptă cu `wait()` sau verifică `is_set()`.
Scop: Ai un mod simplu de a opri curat workerii sau de a anunța că o resursă e gata.
Mecanism: `Event` ține un flag intern protejat de un lock. `wait()` blochează până la `set()` (sau până la un timeout), iar `is_set()` îl citește fără să aștepte.
Pas cu pas:
```text
stop = Event()
worker: while not stop.is_set():
          lucrează o sarcină
main: SIGTERM -> stop.set()
worker: termină sarcina, iese
main: t.join()
```
Aplicare:
```python
stop = threading.Event()

def worker():
    while not stop.is_set():
        step()
        stop.wait(1)
```
Legătură: Același rol ca un graceful shutdown la Celery: workerul termină sarcina curentă și nu mai ia alta.
Limită: Un `Event` nu transportă date; pentru date folosești o `Queue`. Iar un thread blocat într-un apel I/O nu verifică flag-ul până nu revine.
La interviu: „Pentru oprirea curată folosesc un `threading.Event`: firul principal face `set()`, iar workerii îl verifică între sarcini. `stop.wait(timeout)` ține loc și de `sleep`, dar se trezește imediat la oprire.”
Verificare: De ce `stop.wait(1)` e mai bun decât `time.sleep(1)` în bucla workerului?
Răspuns verificare: Revine imediat ce evenimentul e setat, deci oprirea nu mai așteaptă până la o secundă în plus.
Varianta greșită B: Asta descrie un `RLock`.
Varianta greșită C: Asta e o `queue.Queue`.
Varianta greșită D: Asta e `threading.Timer`.

### gil-19
Pe scurt: `wait()` eliberează lock-ul asociat, doarme până la un `notify()` și îl reia înainte să revină.
Scop: Înțelegi primitiva de sub `queue.Queue` și de ce condiția se verifică într-o buclă.
Mecanism: `wait()` se apelează cu lock-ul luat. Îl eliberează atomic și doarme, ca alt thread să poată schimba starea și să cheme `notify()`. La trezire, reia lock-ul, deci starea e citită protejat. Starea se verifică din nou, pentru că alt thread poate să o fi schimbat între timp.
Pas cu pas:
```text
consumator:
  with cond:
    while not items: cond.wait()
    x = items.pop()
producător:
  with cond:
    items.append(x); cond.notify()
```
Aplicare:
```python
with cond:
    cond.wait_for(lambda: items)
    x = items.pop()
```
Legătură: `queue.Queue` e construită exact din două condiții (`not_empty`, `not_full`) peste un lock.
Limită: În cod de aplicație, o `Queue` e aproape mereu mai simplă și mai sigură decât un `Condition` scris de mână.
La interviu: „Un `Condition` combină un lock cu așteptarea unei stări: `wait()` eliberează lock-ul cât doarme și îl reia la trezire. Verific starea într-o buclă sau cu `wait_for`. În practică prefer `queue.Queue`.”
Verificare: De ce `if not items: cond.wait()` e mai fragil decât `while not items: cond.wait()`?
Răspuns verificare: După trezire, alt consumator poate să fi luat deja elementul. Bucla verifică din nou starea; un `if` ar continua cu lista goală.
Varianta greșită B: Dacă ar ține lock-ul, niciun alt thread n-ar putea schimba starea sau chema `notify()`: ar fi deadlock.
Varianta greșită C: `wait()` se trezește la `notify()` (sau la un timeout opțional), nu verifică singur condiția periodic.
Varianta greșită D: `wait()` blochează doar threadul care îl apelează.
