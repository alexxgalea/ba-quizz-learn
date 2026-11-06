<!-- Desfășurările fișei `asyncio` (11 puncte). Format și reguli: lib.mjs (checkDesf), .scratch/desfasurari/spec.md. Faptele: research/interview-facts.md, secțiunile 1, 5, 16 și 22. -->

### harta
Problema: Un server async pare simplu: pornești mii de cereri, iar toate așteaptă deodată. Apoi un apel blocant îl îngheață, o eroare lasă restul să ruleze degeaba, un task uitat dispare, iar un thread străin strică o coadă. Ele pornesc din aceeași regulă: totul rulează pe un thread, iar bucla primește controlul înapoi doar la `await`. Modulul răspunde la cinci întrebări: cum merge bucla, cum pornești și oprești mai multe task-uri, cum le limitezi și le ții în viață, ce faci cu thread-urile străine și când alegi asyncio.

Grupuri:
- 1–2: cum rulează bucla (un thread, controlul se schimbă la `await`) și ce o oprește (apelul blocant)
- 3–6: mai multe task-uri odată și cum se opresc (`gather`, `TaskGroup`, timeout, anulare)
- 7–8: câte task-uri rulează deodată și cine le ține în viață
- 9: ce faci când alt thread vorbește cu bucla
- 10–11: când alegi asyncio și cum îl folosește FastAPI

### 1
Greu: da
Problema: Ai 1.000 de conexiuni deschise și aproape toate așteaptă date. Un thread pe conexiune înseamnă 1.000 de thread-uri. Un singur thread, care servește conexiunile pe rând, ar sta blocat pe prima liniștită.
Ideea: asyncio rulează într-un singur thread, cu un event loop. Bucla rulează o corutină până la un `await` pe ceva care așteaptă (rețea, timer). Atunci corutina se suspendă, iar bucla alege alta. Când I/O-ul e gata, bucla o reia. Două corutine nu rulează niciodată deodată. Concurența e cooperativă, nu paralelism. Pe Linux, bucla așteaptă I/O-ul cu `epoll`, prin modulul `selectors`.
Exemplu:
```python
import asyncio as aio
async def f(): return 1
async def main():
    t = aio.create_task(f())
    print(t.done())  # → False
    await t
    print(t.result())  # → 1
aio.run(main())
```
În C++: Un event loop de mână e o buclă `while` în jurul lui `epoll_wait` sau `select` (API-uri POSIX, nu C++): așteaptă mai mulți descriptori, apoi cheamă handlerul celui pregătit.
Unde nu ține: Handlerul C++ e un callback, deci păstrezi tu starea între apeluri, într-o structură. O corutină își păstrează variabilele locale între `await`-uri.
Legătură: AIO-01 și GIL-14. În JavaScript, event loop-ul rulează tot pe un singur thread, iar un job se termină înainte să înceapă altul.

### 2
Greu: da
Problema: Pe aceeași buclă rulează un heartbeat, care răspunde la health check, și o corutină care parsează un fișier mare, 3 s fără niciun `await`. Heartbeat-ul tace 3 s, iar load balancer-ul scoate instanța din rotație.
Ideea: Un apel blocant nu are `await`, deci bucla nu primește controlul înapoi. Toate task-urile și tot I/O-ul așteaptă (docs: o funcție de 1 s întârzie totul cu 1 s). Muți apelul într-un thread cu `await asyncio.to_thread(f, ...)` (3.9+). Thread-ul vine din executorul implicit al buclei. Din cauza GIL-ului, ajută la I/O, nu la calcul Python pur: acolo folosești procese.
Exemplu:
```python
import asyncio as aio
import threading as th
async def main():
    g = th.get_ident
    a = await aio.to_thread(g)
    print(a == g())  # → False
aio.run(main())
```
În C++: `std::async(std::launch::async, f)` rulează `f` pe alt thread, ca `to_thread`. `future.get()` ia rezultatul, ca `await`.
Unde nu ține: `get()` blochează thread-ul apelant până termină funcția. `await` suspendă doar corutina, iar bucla rulează altceva. Fără `launch::async`, `std::async` poate amâna apelul până la `get()`.
Legătură: AIO-02, AIO-03 și GIL-11. În Django, o view async care apelează direct ORM-ul primește `SynchronousOnlyOperation`; `sync_to_async` mută apelul într-un thread.

### 3
Greu: da
Problema: Chemi trei API-uri cu `gather`. Unul întoarce 500, iar tu răspunzi clientului cu eroare. Celelalte două continuă să scrie în baza de date, fără ca cineva să le mai aștepte.
Ideea: `gather(*aws)` rulează awaitable-urile concurent și întoarce rezultatele în ordinea argumentelor, nu a terminării. Fără `return_exceptions`, prima excepție ajunge imediat la `await gather(...)`. Celelalte NU sunt anulate: merg mai departe. Cu `return_exceptions=True`, excepțiile apar ca valori în listă, la locul lor. Dacă vrei anulare, folosești `TaskGroup` (punctul 4).
Analogie: Trimiți trei colete cu curierul. Unul se pierde și curierul te anunță pe loc. Celelalte două nu se întorc din drum.
Exemplu:
```python
import asyncio as aio
async def bad(): raise KeyError
async def main():
    f = aio.Future()
    try: await aio.gather(bad(), f)
    except KeyError: pass
    print(f.cancelled())  # → False
aio.run(main())
```
Legătură: AIO-04. `f` ține locul unui apel încă în curs. În JavaScript, `Promise.all` respinge la prima respingere și nu anulează restul, iar `Promise.allSettled` e ca `return_exceptions=True`.

### 4
Greu: da
Problema: Un job de noapte pornește cinci exporturi cu `gather`. Al doilea pică, dar celelalte patru scriu fișiere mai departe, iar jobul se declară eșuat cu fișiere pe jumătate scrise.
Ideea: Cu `async with asyncio.TaskGroup() as tg:` (3.11+) pornești task-uri prin `tg.create_task(...)`. Blocul se termină abia când s-au terminat toate. La prima eroare, alta decât `CancelledError`, grupul anulează restul. Apoi așteaptă să se oprească. Dacă blocul încă rulează, îl anulează și pe el. La final ridică toate erorile într-un `ExceptionGroup`, pe care îl prinzi cu `except*`.
Exemplu:
```python
import asyncio as aio
async def bad(): raise KeyError
async def main():
    async with aio.TaskGroup() as g:
        g.create_task(bad())
        await aio.sleep(9)
aio.run(main())  # ! ExceptionGroup
```
Legătură: AIO-05 și GIL-12. `ExceptionGroup` și `except*` apar la fișa python, punctul 9.

### 5
Greu: da
Problema: Un API terț nu mai răspunde. Cererea ta așteaptă la nesfârșit, iar cererile blocate se adună în spatele ei.
Ideea: `async with asyncio.timeout(5):` (3.11+) pune o limită pe tot blocul. La expirare, bucla anulează task-ul curent, deci înăuntru apare `CancelledError`. La ieșirea din bloc, `CancelledError` devine `TimeoutError`. De aceea `TimeoutError` îl prinzi doar în afara blocului. `asyncio.wait_for(aw, 5)` anulează awaitable-ul, așteaptă să se oprească și ridică `TimeoutError`.
Exemplu:
```python
import asyncio as aio
async def main():
    async with aio.timeout(.05):
        await aio.sleep(9)
aio.run(main())  # ! TimeoutError
```
În C++: La un future de la `std::async(std::launch::async, ...)`, `wait_for(durată)` întoarce `future_status::timeout` dacă rezultatul nu e gata la timp.
Unde nu ține: `wait_for` doar încetează să aștepte. Funcția continuă să ruleze, iar destructorul unui future de la `std::async` poate bloca până termină. În Python, expirarea anulează task-ul.
Legătură: AIO-06. În JavaScript, `AbortSignal.timeout(ms)` oprește un `fetch` cu un `TimeoutError`.

### 6
Greu: da
Problema: La oprirea aplicației ceri anularea workerilor, dar unul ignoră cererea. Procesul rămâne agățat, iar orchestratorul îl oprește brutal după timeout.
Ideea: `task.cancel()` aruncă un `CancelledError` în task, la următorul `await`. Clasa moștenește direct `BaseException` (din 3.8), deci `except Exception` nu o prinde. `except BaseException` sau un `except:` gol o înghit, iar task-ul nu se mai oprește. Dacă o prinzi pentru curățenie, o ridici din nou cu `raise`. `TaskGroup` și `timeout()` se bazează pe anulare, deci se strică la fel. În exemplu, `wait_for` întoarce 1 și nu ridică `TimeoutError`, fiindcă anularea a fost înghițită (rulat pe 3.13).
Exemplu:
```python
import asyncio as aio
async def w():
    try: await aio.sleep(9)
    except BaseException: return 1
r = aio.run(aio.wait_for(w(), .05))
r  # → 1
```
În C++: `except Exception` seamănă cu `catch (const std::exception&)`, iar `except BaseException` cu `catch (...)`, care prinde orice.
Unde nu ține: În C++ ierarhia e doar convenție: `throw 42;` trece de `catch (const std::exception&)`. În Python ridici doar obiecte care moștenesc `BaseException`. Iar C++17 n-are anulare cooperativă de thread-uri.
Legătură: AIO-07. Anularea e mecanismul din punctele 4 și 5.

### 7
Greu: da
Problema: Un script de migrare are 50.000 de apeluri de făcut către un API care acceptă cel mult 20 de conexiuni deschise odată. Cu `gather` pornești toate apelurile deodată și API-ul te respinge.
Ideea: `asyncio.Semaphore(20)` ține un contor intern. `async with sem:` îl scade la intrare și îl crește la ieșire. Când contorul e 0, următoarea corutină așteaptă (în exemplu, până o oprește `timeout`). Alternativa: 20 de workeri care iau din aceeași `asyncio.Queue`. Cu `maxsize`, `put` așteaptă când coada e plină. Cu semafor creezi totuși toate cele 50.000 de task-uri; cu coada pornești doar 20 de workeri.
Exemplu:
```python
import asyncio as aio
async def main():
    s = aio.Semaphore(1)
    await s.acquire()
    async with aio.timeout(.05):
        await s.acquire()
aio.run(main())  # ! TimeoutError
```
Legătură: GIL-07 și punctul 6 din fișa gil. În Celery, `--concurrency` limitează tot câte task-uri rulează odată.

### 8
Problema: Trimiți o alertă cu `asyncio.create_task(send_alert(e))` și nu păstrezi task-ul. Uneori alerta nu pleacă, iar codul nu ridică nicio eroare.
Ideea: Bucla ține doar referințe slabe la task-uri. Un task fără altă referință poate fi colectat de GC oricând, chiar înainte să termine. Dacă pică, excepția lui rămâne doar un mesaj „Task exception was never retrieved”, scris la colectare. Păstrezi task-ul într-un `set` și îl scoți cu `add_done_callback(bg.discard)`. Sau pornești task-urile într-un `TaskGroup`, care ține referințe puternice.
Exemplu:
```python
import asyncio as aio
async def job(): return 1
async def main():
    t = aio.create_task(job())
    bg = {t}
    t.add_done_callback(bg.discard)
    print(await t, len(bg))  # → 1 0
aio.run(main())
```
Legătură: AIO-08. În JavaScript, o promisiune respinsă fără handler declanșează evenimentul `unhandledrejection`.

### 9
Greu: da
Problema: Un thread de fundal (un consumator de mesaje, un driver sincron) pune evenimente direct într-o `asyncio.Queue`. Uneori bucla nu se trezește, iar evenimentul stă în coadă.
Ideea: Aproape toate obiectele asyncio (`Queue`, `Lock`, `Event`) nu sunt thread-safe. Le folosește doar thread-ul buclei. Din alt thread trimiți lucrul buclei cu `loop.call_soon_threadsafe(f, *args)`: programează apelul și trezește bucla. Pentru o corutină folosești `asyncio.run_coroutine_threadsafe(coro, loop)`, care întoarce un `concurrent.futures.Future`.
Analogie: Un birou cu un singur funcționar care ține dosarele. Alții nu umblă în ele. Lasă un bilet în tăviță, iar funcționarul îl ia la rând.
În C++: `std::queue` nu e thread-safe. O protejezi cu `std::mutex` și o semnalizezi cu `std::condition_variable`. `asyncio.Queue` seamănă cu un `std::queue` fără mutex: e sigură doar pe thread-ul buclei.
Unde nu ține: `std::mutex` blochează thread-ul care așteaptă. `asyncio.Lock` suspendă doar corutina și nu apără datele de alte thread-uri. Echivalentul unui mutex între thread-uri e `threading.Lock`.
Legătură: AIO-09 și GIL-15 (coada dintre thread-uri).

### 10
Greu: da
Problema: Ai de scris trei lucruri: un serviciu cu 10.000 de conexiuni care așteaptă aproape tot timpul, o integrare cu o bibliotecă sincronă (`requests`) și un script care parsează fișiere mari. Folosești asyncio la toate trei?
Ideea: Alegi după ce așteaptă codul. Pentru multe conexiuni I/O și biblioteci async (httpx, asyncpg), alegi asyncio: o corutină e doar un obiect Python, nu un thread cu stiva lui. Pentru biblioteci sincrone (requests, un driver blocant), alegi thread-uri, direct sau cu `to_thread`. Pentru calcul Python pur, alegi procese.
Exemplu:
```python
import asyncio as aio
async def main():
    c = [aio.sleep(.1, 1)
         for _ in range(10_000)]
    r = await aio.gather(*c)
    print(sum(r))  # → 10000
aio.run(main())
```
Legătură: GIL-02 și punctul 3 din fișa gil, aceeași alegere văzută din partea GIL-ului.

### 11
Greu: da
Problema: Treci un endpoint din `def` în `async def`, „ca să fie modern”, dar el apelează în continuare un driver DB sincron. Sub încărcare, latența crește la toate endpoint-urile, nu doar la acesta.
Ideea: FastAPI se uită cum e declarat endpoint-ul (în esență, cu `inspect.iscoroutinefunction`). Un `async def` rulează direct pe event loop, deci acolo nu ai voie să blochezi. Un `def` rulează într-un threadpool AnyIO, ca să nu blocheze bucla. Threadpool-ul permite implicit cel mult 40 de apeluri în paralel. Cu un driver sincron lași `def`. Într-un `async def` muți apelul cu `to_thread`.
Exemplu:
```python
import inspect as ins
async def a(): ...
def b(): ...
f = ins.iscoroutinefunction
f(a)  # → True
f(b)  # → False
```
Legătură: ASGI-02 și ASGI-03. În Django, un view async care apelează ORM-ul direct are aceeași problemă (punctul 2).
