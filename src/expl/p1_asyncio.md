<!-- asyncio: event loop, task-uri, anulare. Variantele greșite: B, C, D = ordinea din sursă (A e cea corectă). -->

### aio-01
Pe scurt: O corutină rulează până la un `await` pe ceva care chiar așteaptă; abia atunci bucla poate trece la altă corutină.
Scop: Înțelegi diferența față de threaduri: în asyncio tu decizi unde se poate comuta, prin `await`.
Mecanism: Un singur thread rulează bucla de evenimente. Bucla ia o corutină gata de rulat și o execută până când aceasta face `await` pe un socket, un timer sau un alt task. Atunci corutina e suspendată, iar bucla trece la următoarea.
Pas cu pas:
```text
buclă: rulează A
A: await socket.recv() -> suspendat
buclă: rulează B
B: await asyncio.sleep(1)
buclă: datele lui A au sosit
  -> A continuă
```
Aplicare: Fiindcă nu există comutare între două `await`-uri, codul dintre ele nu are nevoie de lock-uri pentru starea locală a buclei.
Legătură: Uvicorn rulează aplicația FastAPI pe o astfel de buclă: un worker, mii de conexiuni deschise, dar un singur thread care execută cod Python.
Limită: Cooperativ înseamnă și că o singură corutină care nu cedează (calcul greu, apel blocant) oprește tot workerul.
La interviu: „asyncio e concurență cooperativă pe un singur thread: o corutină cedează controlul doar la `await`. E ideal pentru multe operații I/O, dar nu dă paralelism pe core-uri.”
Verificare: Ai o corutină care face o buclă de calcul de 3 s, fără niciun `await`. Ce pățesc celelalte cereri din același worker?
Răspuns verificare: Stau toate 3 s: bucla nu poate comuta până când corutina nu ajunge la un `await`.
Varianta greșită B: asyncio rulează pe un singur thread. Pentru mai multe core-uri ai nevoie de procese.
Varianta greșită C: Așa funcționează threadurile (preemptive). În asyncio comutarea se face doar la `await`.
Varianta greșită D: Corutinele nu au threaduri proprii: toate rulează în threadul buclei.

### aio-02
Pe scurt: ~200 s: `time.sleep` blochează bucla, deci cererile sunt servite una după alta, câte 2 s fiecare.
Scop: Recunoști cel mai frecvent bug în cod async: un apel blocant într-o corutină.
Mecanism: `time.sleep` oprește threadul curent, adică threadul buclei. Cât doarme, nicio altă corutină nu poate rula. `async def` doar declară o corutină; nu face apelurile din ea non-blocante.
Pas cu pas:
```text
cerere 1: time.sleep(2) -> bucla stă
cererea 2: așteaptă bucla
...
cererea 100: pornește după ~198 s
cu asyncio.sleep: toate ~2 s
```
Aplicare:
```python
async def handler():
    await asyncio.sleep(2)
    return "ok"
```
Legătură: Aceeași greșeală apare cu `requests`, cu un driver DB sincron sau cu SDK-uri fără variantă async: în FastAPI le pui în endpoint-uri `def` sau în `to_thread`.
Limită: Uneori nu există variantă async. Atunci o rulezi în `asyncio.to_thread` sau declari endpoint-ul cu `def`, ca FastAPI să-l ruleze în threadpool.
La interviu: „`async def` nu face codul non-blocant. Un `time.sleep` sau un `requests.get` într-o corutină blochează toată bucla, deci toate cererile workerului. Folosesc biblioteci async sau mut apelul într-un thread.”
Verificare: Cum ai detecta în producție corutinele care blochează bucla?
Răspuns verificare: Cu modul debug din asyncio (`PYTHONASYNCIODEBUG=1`), care loghează callback-urile mai lente de 100 ms, sau cu metrici de latență: toate rutele încetinesc deodată.
Varianta greșită B: Ar fi adevărat cu `await asyncio.sleep(2)`, care cedează controlul. `time.sleep` nu cedează.
Varianta greșită C: `async def` doar marchează funcția drept corutină. Apelurile blocante din ea rămân blocante.
Varianta greșită D: `time.sleep` funcționează oriunde; tocmai de aceea e periculos: nu dă eroare, doar blochează.

### aio-03
Pe scurt: Rulează funcția sincronă într-un thread al executorului implicit, iar bucla rămâne liberă cât aștepți rezultatul.
Scop: Ai o soluție pentru codul sincron pe care trebuie să-l apelezi dintr-o corutină.
Mecanism: `to_thread` (3.9+) trimite apelul în `ThreadPoolExecutor`-ul implicit al buclei și întoarce o corutină. Corutina ta se suspendă la `await`, iar bucla servește alte cereri până termină threadul.
Pas cu pas:
```text
corutina: await to_thread(parse, d)
  -> parse rulează într-un thread
  -> corutina e suspendată
buclă: servește alte cereri
thread gata -> corutina continuă
```
Aplicare:
```python
rows = await asyncio.to_thread(
    parse_csv, raw)
```
Legătură: FastAPI face același lucru automat pentru endpoint-urile `def`: le rulează în threadpool-ul AnyIO.
Limită: Threadul tot are nevoie de GIL. Pentru calcul greu în Python pur, `to_thread` ține bucla liberă, dar nu dă paralelism; acolo folosești un `ProcessPoolExecutor` cu `loop.run_in_executor`.
La interviu: „Pentru cod sincron într-o corutină folosesc `asyncio.to_thread`: rulează în threadpool și nu blochează bucla. Pentru calcul greu, procese, din cauza GIL-ului.”
Verificare: Rulezi cu `to_thread` o funcție care calculează hash-uri în Python pur, 2 s. Rămân celelalte cereri complet nederanjate?
Răspuns verificare: Nu complet: threadul de calcul ține GIL-ul în reprize, deci și bucla încetinește. Pentru calcul greu, un proces separat.
Varianta greșită B: Asta face un `ProcessPoolExecutor`. `to_thread` folosește threaduri, în același proces.
Varianta greșită C: Python nu poate transforma automat o funcție sincronă în corutină; ea rulează neschimbată, în alt thread.
Varianta greșită D: Tocmai asta evită `to_thread`: funcția nu rulează pe buclă.

### aio-04
Pe scurt: `b()` și `c()` continuă să ruleze: `gather` propagă prima excepție, dar nu anulează celelalte task-uri.
Scop: Știi ce se întâmplă cu munca rămasă când o parte eșuează, ca să nu lași task-uri orfane.
Mecanism: `gather` împachetează corutinele în task-uri. La prima excepție, `await gather(...)` o ridică imediat, dar task-urile rămase nu sunt anulate și rulează în fundal. Cu `return_exceptions=True` primești excepțiile ca valori în lista de rezultate.
Pas cu pas:
```text
t=0: a, b, c pornesc
t=1: a aruncă ValueError
  -> gather ridică ValueError
  -> b, c continuă în fundal
TaskGroup: b, c ar fi anulate
```
Aplicare:
```python
res = await asyncio.gather(
    *aws, return_exceptions=True)
```
Legătură: E diferența dintre „vreau toate rezultatele, chiar dacă unele eșuează” (gather cu `return_exceptions`) și „la prima eroare oprește tot” (TaskGroup).
Limită: Task-urile rămase în fundal pot scrie în DB sau trimite cereri după ce codul tău a tratat deja eroarea.
La interviu: „`gather` ridică prima excepție, dar nu anulează celelalte task-uri. Dacă vreau toate rezultatele, pun `return_exceptions=True`; dacă vreau să opresc tot la prima eroare, folosesc `TaskGroup`.”
Verificare: Scanezi 100 de hosturi cu `gather(..., return_exceptions=True)`. Cum separi reușitele de erori?
Răspuns verificare: Parcurgi rezultatele: elementele care sunt `isinstance(r, BaseException)` sunt erorile, iar ordinea corespunde ordinii hosturilor.
Varianta greșită B: Asta face `TaskGroup`, nu `gather`.
Varianta greșită C: `ExceptionGroup` vine de la `TaskGroup`. `gather` ridică excepția originală.
Varianta greșită D: Fără `return_exceptions`, `gather` nu așteaptă restul: ridică imediat prima excepție.

### aio-05
Pe scurt: TaskGroup anulează celelalte task-uri, așteaptă să se oprească și ridică toate erorile într-un `ExceptionGroup`.
Scop: Ai concurență structurată: niciun task nu supraviețuiește blocului care l-a creat.
Mecanism: Blocul `async with` așteaptă toate task-urile create cu `tg.create_task`. La prima excepție, grupul anulează restul, așteaptă terminarea lor, apoi ridică un `ExceptionGroup` cu toate excepțiile (în afară de anulări). `KeyboardInterrupt` și `SystemExit` sunt ridicate direct.
Pas cu pas:
```text
async with TaskGroup() as tg:
  tg.create_task(a()) -> eroare
  tg.create_task(b()) -> anulat
  tg.create_task(c()) -> anulat
ieșire: ExceptionGroup([ValueError])
except* ValueError: ...
```
Aplicare:
```python
async with TaskGroup() as tg:
    for h in hosts:
        tg.create_task(scan(h))
```
Legătură: E echivalentul async al unui `with ThreadPoolExecutor()` care nu te lasă să ieși până nu s-au terminat toate sarcinile.
Limită: Necesită Python 3.11+. Dacă vrei rezultate parțiale când unele eșuează, prinzi erorile în fiecare task sau folosești `gather(return_exceptions=True)`.
La interviu: „TaskGroup e concurență structurată: task-urile nu ies din bloc. La prima eroare anulează restul și ridică un `ExceptionGroup`, pe care îl prind cu `except*`.”
Verificare: Două task-uri eșuează aproape simultan, cu `ValueError` și `KeyError`. Ce primești la ieșirea din bloc?
Răspuns verificare: Un singur `ExceptionGroup` care le conține pe amândouă; le poți trata separat cu `except* ValueError` și `except* KeyError`.
Varianta greșită B: Ar contrazice ideea de grup: o eroare oprește tot grupul.
Varianta greșită C: Așa se comportă `gather(return_exceptions=True)`. TaskGroup ridică excepțiile.
Varianta greșită D: Nu există reîncercare automată; retry-ul îl scrii tu, în task.

### aio-06
Pe scurt: După 5 s, `fetch` e anulat, iar blocul ridică `TimeoutError`.
Scop: Pui o limită de timp pe orice I/O extern, ca un host lent să nu țină cererea la nesfârșit.
Mecanism: La expirare, `asyncio.timeout` anulează task-ul curent: `fetch` primește `CancelledError` la `await`-ul la care stă. La ieșirea din bloc, context manager-ul transformă anularea în `TimeoutError` (builtin, din 3.11).
Pas cu pas:
```text
t=0: intră în timeout(5)
t=5: deadline -> task.cancel()
  fetch: CancelledError la await
ieșire din bloc:
  CancelledError -> TimeoutError
```
Aplicare:
```python
try:
    async with asyncio.timeout(5):
        data = await fetch(url)
except TimeoutError:
    data = None
```
Legătură: Același rol ca `timeout=` la `requests` sau ca `soft_time_limit` la Celery: niciun apel extern fără limită.
Limită: Anularea are efect doar la un `await`. Un apel blocant din corutină nu poate fi întrerupt de timeout.
La interviu: „Pun `asyncio.timeout` pe apelurile externe: la expirare task-ul e anulat, iar eu primesc `TimeoutError`. Funcționează doar dacă codul din interior cedează controlul.”
Verificare: În `fetch` e un `time.sleep(10)` în loc de un `await`. Mai funcționează timeout-ul la 5 s?
Răspuns verificare: Nu. Bucla e blocată 10 s, deci timer-ul nu poate rula; anularea ajunge abia după, la următorul `await`.
Varianta greșită B: Anularea oprește efectiv `fetch`; nu primești un `None` tăcut.
Varianta greșită C: `CancelledError` e transformată în `TimeoutError` la ieșirea din bloc.
Varianta greșită D: Timeout-ul acționează la 5 s, nu după ce operația se termină.

### aio-07
Pe scurt: `except BaseException` prinde și `CancelledError`, deci bucla continuă și task-ul nu mai poate fi oprit.
Scop: Știi cum să nu strici anularea, care stă la baza timeout-urilor și a opririi curate.
Mecanism: `task.cancel()` aruncă `CancelledError` în corutină la următorul `await`. Din 3.8, `CancelledError` moștenește `BaseException`, nu `Exception`, tocmai ca un `except Exception` să n-o prindă. Aici `except BaseException` o prinde, o loghează ca eroare și bucla merge mai departe.
Pas cu pas:
```text
shutdown -> task.cancel()
await job() -> CancelledError
except BaseException: o înghite
while True: continuă
oprirea așteaptă la nesfârșit
```
Aplicare:
```python
except asyncio.CancelledError:
    raise
except Exception:
    log.exception("failed")
```
Legătură: E același principiu ca la Celery sau la orice worker: un semnal de oprire nu se tratează ca o eroare de business.
Limită: Uneori ai nevoie de cleanup la anulare: îl faci în `finally` sau prinzi `CancelledError`, faci curat și o ridici din nou.
La interviu: „Anularea în asyncio e o excepție, `CancelledError`, derivată din `BaseException`. Nu o înghit: prind `Exception`, iar dacă prind anularea pentru cleanup, o ridic din nou.”
Verificare: De ce a fost mutată `CancelledError` sub `BaseException` în Python 3.8?
Răspuns verificare: Ca blocurile obișnuite `except Exception:` din codul de aplicație să nu mai înghită anularea din greșeală.
Varianta greșită B: `except BaseException` prinde și anularea și `KeyboardInterrupt`. E exact problema.
Varianta greșită C: `log.exception` merge oriunde într-un `except`; nu are legătură cu corutinele.
Varianta greșită D: `await job()` cedează controlul, deci bucla nu se învârte în gol cât timp jobul rulează.

### aio-08
Pe scurt: Task-ul poate fi colectat de GC înainte să termine, iar excepțiile lui se pierd.
Scop: Știi să lansezi corect lucru „în fundal” în asyncio și când nu e locul lui acolo.
Mecanism: Bucla ține doar o referință slabă la task. Dacă nimeni altcineva nu-l referă, poate dispărea la jumătate. Dacă aruncă și nimeni nu-l așteaptă, eroarea apare doar ca warning la colectare.
Pas cu pas:
```text
create_task(send_alert(e))
  -> rezultatul nu e păstrat
GC -> task colectat la jumătate
excepție -> doar un warning
fix: background.add(t)
     t.add_done_callback(
       background.discard)
```
Aplicare:
```python
t = asyncio.create_task(job())
background.add(t)
t.add_done_callback(
    background.discard)
```
Legătură: Pentru lucru care nu are voie să se piardă (o alertă de securitate) potrivită e o coadă durabilă, RabbitMQ sau Celery; nici `BackgroundTasks` din FastAPI nu supraviețuiește unei reporniri.
Limită: Chiar și cu referință, task-urile în fundal mor la oprirea procesului; le anulezi și le aștepți la shutdown.
La interviu: „Păstrez referința la task-urile create cu `create_task` și le tratez excepțiile; altfel pot dispărea sau eșua tăcut. Lucrul care trebuie să ajungă la destinație îl pun într-o coadă durabilă.”
Verificare: Unde ai anula și aștepta task-urile din `background` într-o aplicație FastAPI?
Răspuns verificare: În partea de oprire a funcției `lifespan`: le anulezi, apoi `await asyncio.gather(*background, return_exceptions=True)`.
Varianta greșită B: `create_task` programează imediat corutina pe buclă; nu așteaptă un `await`.
Varianta greșită C: `create_task` întoarce imediat; corutina rulează pe buclă, nu blochează apelantul.
Varianta greșită D: Task-urile rulează toate pe threadul buclei; nu se creează threaduri.

### aio-09
Pe scurt: `loop.call_soon_threadsafe(q.put_nowait, ev)`: programezi apelul în threadul buclei, pentru că `asyncio.Queue` nu e thread-safe.
Scop: Legi corect cod pe threaduri (un SDK sincron, un callback) de o aplicație asyncio.
Mecanism: Primitivele asyncio presupun că sunt folosite doar din threadul buclei. `call_soon_threadsafe` pune apelul în coada buclei într-un mod sigur și o trezește dacă doarme. Pentru corutine există `asyncio.run_coroutine_threadsafe`, care întoarce un future.
Pas cu pas:
```text
thread T: eveniment nou
T: loop.call_soon_threadsafe(
     q.put_nowait, ev)
bucla se trezește
  -> q.put_nowait(ev)
corutina: await q.get() -> ev
```
Aplicare:
```python
loop = asyncio.get_running_loop()
# dat threadului la pornire
loop.call_soon_threadsafe(
    q.put_nowait, ev)
```
Legătură: Același tip de punte ca între un consumer RabbitMQ sincron (pika) și un serviciu async.
Limită: Referința la buclă o iei în threadul buclei (`get_running_loop()`) și o dai threadului; din alt thread nu o poți obține sigur.
La interviu: „Primitivele asyncio nu sunt thread-safe. Dintr-un alt thread trimit lucru în buclă cu `call_soon_threadsafe` sau `run_coroutine_threadsafe`.”
Verificare: De ce `queue.Queue.get()` apelat direct într-o corutină e o idee proastă?
Răspuns verificare: `get()` blochează threadul buclei până apare un element, deci blochează tot workerul.
Varianta greșită B: `asyncio.Queue` nu e thread-safe; modificarea ei din alt thread poate strica starea sau poate să nu trezească bucla.
Varianta greșită C: `await` merge doar într-o corutină care rulează pe buclă, nu într-un thread oarecare.
Varianta greșită D: `get()` blocant din `queue.Queue` blochează bucla în corutină; ai nevoie de `to_thread` sau de puntea thread-safe.
