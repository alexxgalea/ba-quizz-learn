<!-- GIL, threads, procese, asyncio. Variantele greșite: B, C, D = ordinea din sursă (A e cea corectă). -->

### gil-01
Pe scurt: GIL-ul garantează că, într-un proces CPython, un singur thread execută bytecode Python la un moment dat.
Scop: Explică de ce threadurile nu accelerează calculul în Python pur, dar ajută la I/O, și de ce nu te scapă de lock-uri.
Mecanism: Un thread are nevoie de GIL ca să execute bytecode. Îl eliberează când așteaptă I/O (socket, fișier, `time.sleep`) sau când interpretorul îi cere să cedeze, cam la fiecare 5 ms (`sys.getswitchinterval()`). Extensiile native îl pot elibera cât lucrează doar pe memoria lor.
Pas cu pas:
```text
T1: are GIL -> execută bytecode
T1: recv() pe socket -> eliberează GIL
T2: ia GIL -> execută bytecode
T2: după ~5 ms -> i se cere să cedeze
T1: răspunsul a sosit -> ia GIL
```
Aplicare: Pentru calcul în Python pur pe mai multe core-uri folosești procese (`ProcessPoolExecutor`, `multiprocessing`). Pentru I/O, threadurile sau asyncio sunt suficiente. Pentru stare partajată tot ai nevoie de `Lock`.
Legătură: Gunicorn și Celery (pool-ul prefork) pornesc mai multe procese worker tocmai din cauza GIL-ului: fiecare proces are GIL-ul lui.
Limită: Din Python 3.14 există și un build opțional fără GIL (free-threaded). Build-ul standard, cel pe care îl instalezi implicit, are în continuare GIL.
La interviu: „În CPython, GIL-ul lasă un singur thread să execute bytecode la un moment dat. Threadurile ajută la I/O, pentru că GIL-ul se eliberează cât aștept; pentru calcul în Python pur folosesc procese. GIL-ul nu face codul meu thread-safe.”
Verificare: Pornești 4 threaduri care caută numere prime în Python pur, pe o mașină cu 4 core-uri. Cu cât scade timpul față de un singur thread?
Răspuns verificare: Practic deloc, poate chiar crește: un singur thread execută bytecode odată, iar comutarea între ele costă. Cu 4 procese ai folosi toate core-urile.
Varianta greșită B: GIL-ul protejează doar instrucțiunile individuale de bytecode. O operație compusă (`counter += 1`, „verifică, apoi scrie”) se poate intercala între threaduri.
Varianta greșită C: Extensiile native (NumPy, OpenCV) și operațiile de I/O pot elibera GIL-ul, deci un proces poate folosi mai multe core-uri.
Varianta greșită D: GIL-ul nu garantează nicio ordine: ce thread primește GIL-ul decid interpretorul și planificatorul sistemului de operare.

### gil-02
Pe scurt: Threads sau asyncio pentru download, unde munca așteaptă rețeaua; procese pentru parsare, unde munca ține CPU-ul ocupat în Python pur.
Scop: Alegi unealta după tipul muncii, I/O-bound sau CPU-bound. E întrebarea clasică după care se vede dacă înțelegi GIL-ul.
Mecanism: Cât un thread așteaptă rețeaua, GIL-ul e liber, deci zeci de download-uri pot aștepta în același timp. Parsarea în Python pur ține GIL-ul tot timpul, deci threadurile ar lucra pe rând. Procesele au fiecare interpretorul și GIL-ul lor, deci rulează pe core-uri diferite.
Pas cu pas:
```text
1. ThreadPoolExecutor(20): 500 download-uri
   (cât aștepți rețeaua, GIL-ul e liber)
2. ProcessPoolExecutor(): parsare pe fișiere
   (câte un proces pe core)
3. agregi rezultatele parțiale
```
Aplicare:
```python
with ThreadPoolExecutor(max_workers=20) as tp:
    paths = list(tp.map(download, urls))
with ProcessPoolExecutor() as pp:
    total = merge(pp.map(parse_file, paths))
```
Legătură: E aceeași împărțire ca la pool-urile Celery: gevent sau threads pentru task-uri care așteaptă rețeaua, prefork pentru calcul.
Limită: Procesele costă: pornire, memorie și serializarea datelor cu pickle. Dai fiecărui proces bucăți mari de muncă (un fișier întreg), nu câte o linie.
La interviu: „Download-ul e I/O-bound, deci folosesc threads sau asyncio: GIL-ul se eliberează cât aștept rețeaua. Parsarea în Python pur e CPU-bound, deci folosesc procese, câte unul pe core, cu bucăți mari de muncă.”
Verificare: Pui și parsarea pe un `ThreadPoolExecutor` cu 8 threaduri, pe o mașină cu 8 core-uri. Ce vezi în `htop`?
Răspuns verificare: Cam un singur core ocupat: threadurile își dau GIL-ul pe rând. Cu procese ai vedea toate cele 8 core-uri lucrând.
Varianta greșită B: Procesele merg și pentru download, dar plătești memorie și pornire fără niciun câștig: la I/O, GIL-ul nu era problema.
Varianta greșită C: GIL-ul nu se eliberează la fiecare linie. Calculul în Python pur ține GIL-ul, iar threadurile îl iau pe rând.
Varianta greșită D: asyncio rulează toate corutinele pe un singur thread, deci pe un singur core. Pentru calcul nu ajută.

### gil-04
Pe scurt: `time.sleep(2)` oprește threadul event loop-ului, deci timp de 2 secunde nicio corutină nu avansează.
Scop: Un singur apel blocant într-un endpoint `async def` încetinește toate request-urile servite de acel worker. E cea mai frecventă greșeală cu asyncio.
Mecanism: Event loop-ul rulează pe un singur thread și trece la altă corutină doar când cea curentă ajunge la un `await`. `time.sleep` nu e awaitable: oprește threadul cu totul, deci loop-ul nu mai poate rula nimic până se termină.
Pas cu pas:
```text
t=0    req A: time.sleep(2) -> threadul stă
t=0.1  sosește req B -> nu-l preia nimeni
t=2    A termină -> loop-ul preia B
cu await asyncio.sleep(2):
t=0.1  B e servit imediat
```
Aplicare: Folosești `await asyncio.sleep(2)`. Codul blocant pe care nu-l poți rescrie (`requests`, un driver sincron) îl muți pe un thread: `await asyncio.to_thread(func, ...)`.
Legătură: Un `time.sleep` într-un worker Gunicorn sync blochează un singur request. Aici blochezi toate request-urile procesului.
Limită: Orice calcul lung în Python pur are același efect, chiar fără `sleep`: loop-ul nu e liber până nu ajunge la un `await`. Pentru calcul folosești un proces separat.
La interviu: „asyncio e cooperativ: corutinele cedează controlul doar la `await`. `time.sleep` blochează threadul loop-ului, deci toate corutinele stau. Folosesc `asyncio.sleep` sau mut codul blocant cu `asyncio.to_thread`.”
Verificare: Într-un endpoint FastAPI `async def` apelezi `requests.get(url)`, care durează o secundă. Ce pățesc celelalte request-uri ale acelui worker?
Răspuns verificare: Așteaptă și ele: `requests` e sincron și blochează loop-ul. Folosești `httpx.AsyncClient` cu `await` sau declari endpointul cu `def`, ca să ruleze în threadpool.
Varianta greșită B: O corutină cedează controlul doar la `await`. `time.sleep` nu cedează nimic: blochează tot threadul.
Varianta greșită C: Python nu rescrie apelurile. `time.sleep` rămâne o funcție sincronă, care oprește threadul.
Varianta greșită D: Python permite apeluri sincrone în `async def`; de aceea greșeala e ușor de făcut. Modul debug al asyncio doar avertizează când un pas durează prea mult.

### gil-05
Pe scurt: Multe operații din extensiile native, ca NumPy și OpenCV, eliberează GIL-ul cât calculează, deci pot rula în paralel din mai multe threaduri.
Scop: Explică de ce un thread pool peste OpenCV sau NumPy poate folosi mai multe core-uri, iar același calcul scris în Python pur nu.
Mecanism: GIL-ul protejează obiectele Python. O funcție C care lucrează doar pe memoria ei (pixelii unei imagini, un array NumPy) poate elibera GIL-ul pe durata calculului și îl reia la final, ca să întoarcă rezultatul. Între timp, alte threaduri rulează bytecode sau alt cod nativ.
Pas cu pas:
```text
T1: cv2.resize(img1) -> eliberează GIL
T2: cv2.resize(img2) -> eliberează GIL
    (T1 și T2 calculează pe core-uri diferite)
T1: reia GIL -> întoarce rezultatul
```
Aplicare: Pentru procesare de imagini sau calcule mari pe array-uri, un `ThreadPoolExecutor` poate fi suficient și evită copierea datelor între procese. Verifici în `top`: dacă procesul trece de 100% CPU, operația folosește mai multe core-uri.
Legătură: În computer vision, decodarea video și operațiile OpenCV pe cadre sunt exact cazul ăsta: munca grea se face în C/C++, nu în Python.
Limită: Nu toate operațiile eliberează GIL-ul: depinde de cum e scrisă extensia. La operații mici, apelate des, timpul petrecut în codul Python dintre ele anulează câștigul.
La interviu: „Extensiile native pot elibera GIL-ul cât lucrează pe memoria lor, cum fac multe operații NumPy și OpenCV. De aceea threadurile pot scala pentru astfel de calcule; pentru Python pur folosesc procese.”
Verificare: Rulezi 4 threaduri care parcurg fiecare, cu un `for` în Python, pixelii unei imagini. Folosești 4 core-uri?
Răspuns verificare: Nu: bucla e bytecode Python și ține GIL-ul. Ai folosi 4 core-uri dacă ai înlocui bucla cu o operație NumPy sau OpenCV pe toată imaginea.
Varianta greșită B: Multe extensii eliberează GIL-ul pe durata calculului. Codul nativ îl ține doar cât atinge obiecte Python.
Varianta greșită C: NumPy nu pornește procese. Unele operații, de exemplu înmulțirea de matrici prin BLAS, folosesc threaduri native, dar în același proces.
Varianta greșită D: GIL-ul privește execuția bytecode-ului Python. În extensiile C, autorul alege dacă și când îl eliberează, fie la I/O, fie la calcul.

### gil-06
Pe scurt: Argumentele și rezultatele trebuie să poată fi serializate cu pickle, pentru că trec dintr-un proces în altul ca bytes.
Scop: Când un `ProcessPoolExecutor` crapă cu o eroare de pickling, știi imediat de ce și cum repari.
Mecanism: Procesele nu împart memoria. Funcția, argumentele și rezultatul sunt serializate cu pickle, trimise printr-un pipe și reconstruite în procesul worker. Funcția însăși e trimisă prin nume (modul plus nume), deci trebuie definită la nivel de modul.
Pas cu pas:
```text
părinte: pickle(parse_file, "a.log")
  -> bytes prin pipe -> worker
worker: unpickle -> parse_file("a.log")
worker: pickle(rezultat) -> părinte
```
Aplicare: Trimiți date simple: căi de fișiere, id-uri, dicționare. Funcțiile le definești cu `def` la nivel de modul, nu ca lambda sau funcții interne. Conexiunile DB și clienții HTTP le creezi în worker (de exemplu cu `initializer=`), nu le trimiți.
Legătură: E aceeași regulă ca la Celery: trimiți `user_id`, nu obiectul ORM, pentru că argumentele trec prin serializare.
Limită: Serializarea costă. Pentru argumente mari (un array de 1 GB) sau task-uri foarte mici, overhead-ul poate depăși câștigul; trimiți calea fișierului sau folosești `multiprocessing.shared_memory`.
La interviu: „La `ProcessPoolExecutor`, argumentele și rezultatele trec între procese prin pickle, deci trebuie să fie serializabile: funcții la nivel de modul, date simple, nu conexiuni sau lambda-uri. Dau fiecărui worker bucăți mari de muncă, ca overhead-ul să merite.”
Verificare: Scrii `fut = pool.submit(lambda x: x * 2, 21)`, apoi `fut.result()`. Ce se întâmplă?
Răspuns verificare: Primești o eroare de pickling: o lambda nu are un nume după care s-o găsească workerul. Definești funcția cu `def`, la nivel de modul.
Varianta greșită B: Imutabilitatea nu contează: o listă, care e mutabilă, se trimite fără probleme. Contează să poată fi serializată.
Varianta greșită C: Merg și liste, dicționare, dataclass-uri sau obiecte proprii, cât timp pickle le poate serializa.
Varianta greșită D: Procesele au memorie separată. Chiar și la `fork`, copilul primește o copie, nu memoria comună cu părintele.

### gil-07
Pe scurt: Pui fiecare request în spatele unui `asyncio.Semaphore(50)` și le pornești cu `gather`: doar 50 rulează simultan, restul așteaptă la semafor.
Scop: Nu vrei 10.000 de conexiuni deschise deodată: epuizezi socket-urile, primești rate limiting sau suprasoliciți serverul țintă.
Mecanism: `gather` creează imediat câte un task pentru fiecare corutină. Semaforul are 50 de permise: un task intră în `async with sem` doar dacă mai e un permis liber, altfel așteaptă. Când un request se termină, permisul trece la următorul task din așteptare.
Pas cu pas:
```text
10.000 de task-uri create
50 iau un permis -> request HTTP
9.950 așteaptă la semafor
un request gata -> permisul trece mai departe
```
Aplicare:
```python
sem = asyncio.Semaphore(50)

async def fetch(client, url):
    async with sem:
        r = await client.get(url)
        return r.status_code

async def main(urls):
    async with httpx.AsyncClient() as c:
        return await asyncio.gather(
            *(fetch(c, u) for u in urls))
```
Legătură: E ca `max_workers=50` la un `ThreadPoolExecutor`, doar că aici limitezi corutine pe un singur thread, nu threaduri.
Limită: `gather` tot creează 10.000 de task-uri în memorie, ceea ce e în regulă la ordinul ăsta. Pentru milioane de URL-uri folosești N workeri care consumă dintr-o `asyncio.Queue`.
La interviu: „`gather` pornește toate corutinele deodată, deci limitez concurența cu un `asyncio.Semaphore(50)` în jurul fiecărui request. Pentru volume foarte mari folosesc N workeri pe o `asyncio.Queue`.”
Verificare: Una dintre cele 10.000 de cereri aruncă excepție. Ce face `gather` implicit cu ea și cu celelalte?
Răspuns verificare: Propagă prima excepție la cine face `await`, dar celelalte task-uri nu sunt anulate și continuă în fundal. Cu `return_exceptions=True` primești excepțiile în listă, alături de rezultate.
Varianta greșită B: Event loop-ul nu limitează nimic: `gather` pornește toate cele 10.000 de corutine, care deschid conexiuni cât de repede pot.
Varianta greșită C: 10.000 de threaduri consumă multă memorie și tot nu limitează la 50. Un pool de threaduri ar avea nevoie de `max_workers=50`.
Varianta greșită D: `time.sleep` blochează event loop-ul, iar o pauză fixă nu limitează conexiunile deschise simultan: depinde cât durează fiecare request.

### gil-08
Pe scurt: `await coro()` rulează corutina și te ține pe loc până termină; `create_task(coro())` o programează să ruleze concurent și îți dă imediat un Task, pe care îl aștepți mai târziu.
Scop: Ca să rulezi două operații I/O în același timp, de exemplu două request-uri HTTP, le pornești ca task-uri, nu le aștepți pe rând.
Mecanism: `await` cedează controlul event loop-ului până când corutina dă rezultatul, deci codul de după nu rulează până atunci. `create_task` înregistrează corutina în loop și revine imediat; task-ul avansează de fiecare dată când corutina ta cedează la un `await`.
Pas cu pas:
```text
await a(); await b()   -> 1 s + 1 s = 2 s
ta = create_task(a())
tb = create_task(b())
await ta; await tb     -> ~1 s
```
Aplicare:
```python
t_user = asyncio.create_task(get_user(uid))
t_perm = asyncio.create_task(get_perms(uid))
user = await t_user
perms = await t_perm
```
Legătură: Seamănă cu `executor.submit()`, care întoarce un Future: pornești munca acum și ceri rezultatul mai târziu. În JavaScript e diferența dintre a porni două promisiuni și a le aștepta pe rând.
Limită: Păstrezi o referință la task: loop-ul ține doar referințe slabe, deci un task nereferit poate fi colectat înainte să termine. Și îi aștepți rezultatul, altfel excepțiile lui ajung doar ca avertisment în log.
La interviu: „`await` rulează corutina și aștept rezultatul pe loc. `create_task` o programează concurent și primesc un Task pe care îl aștept mai târziu. Păstrez referința la task și îi tratez excepțiile, sau folosesc `TaskGroup`.”
Verificare: Scrii `asyncio.create_task(send_email())` și nu salvezi rezultatul nicăieri. Ce risc ai?
Răspuns verificare: Task-ul poate fi colectat înainte să termine, iar dacă aruncă excepție, nu o vede nimeni. Îl salvezi într-o variabilă sau într-un set ori folosești un `TaskGroup`.
Varianta greșită B: Nu sunt echivalente: `create_task` pornește corutina concurent cu codul tău, `await` o așteaptă pe loc. Ambele fac parte din asyncio-ul modern.
Varianta greșită C: `create_task` nu folosește threaduri: task-ul rulează pe același event loop, în același thread.
Varianta greșită D: `await` nu pornește procese. Ambele rulează pe event loop-ul din threadul curent.

### gil-09
Pe scurt: Formularea corectă: GIL-ul limitează paralelismul bytecode-ului, nu concurența; pentru I/O folosești threads sau asyncio, pentru calcul în Python pur procese.
Scop: La interviu, o frază precisă despre GIL arată că știi diferența dintre concurență și paralelism și ce unealtă alegi pentru fiecare caz.
Mecanism: Concurența înseamnă mai multe sarcini în progres, care se alternează: cât una așteaptă rețeaua, alta lucrează. Paralelismul înseamnă execuție simultană, pe core-uri diferite. GIL-ul blochează doar paralelismul bytecode-ului Python; concurența pentru I/O funcționează normal.
Pas cu pas:
```text
I/O-bound (HTTP, DB) -> threads / asyncio
CPU-bound, Python pur -> procese
CPU-bound, cod nativ -> threads pot scala
stare partajată -> Lock, oricum
```
Aplicare: Spui fraza, apoi dai un exemplu concret: „Pentru un serviciu care interoghează 500 de sisteme prin HTTP folosesc asyncio cu un semafor; pentru parsarea logurilor, un `ProcessPoolExecutor`.”
Legătură: E rezumatul grilelor GIL-01, GIL-02 și GIL-05 într-o singură frază.
Limită: Nu exagera nici în sens invers: GIL-ul chiar limitează threadurile la calcul în Python pur, iar build-ul fără GIL din 3.14 e opțional.
La interviu: „GIL-ul limitează paralelismul bytecode-ului Python, nu concurența. Pentru I/O folosesc threads sau asyncio, pentru CPU în Python pur procese, iar codul nativ care eliberează GIL-ul poate scala și pe threaduri. Starea partajată o protejez tot cu lock-uri.”
Verificare: Intervievatorul întreabă: „Deci asyncio e mai rapid decât threadurile?” Ce răspunzi?
Răspuns verificare: Nu neapărat: ambele oferă concurență pentru I/O. asyncio e mai ieftin la mii de conexiuni, pentru că nu ține un thread per conexiune, dar cere biblioteci async. Niciunul nu ajută la calcul în Python pur.
Varianta greșită B: GIL-ul nu împiedică orice paralelism: I/O-ul și codul nativ pot rula în paralel. Procesele pentru I/O sunt un cost inutil.
Varianta greșită C: GIL-ul nu face codul thread-safe: `counter += 1` se poate intercala între threaduri, deci ai nevoie de `Lock`.
Varianta greșită D: asyncio rulează pe un singur thread, deci pe un singur core: e concurență, nu paralelism.

### gil-10
Pe scurt: Build-ul free-threaded e o variantă opțională a CPython, fără GIL, în care threadurile pot executa bytecode în paralel; build-ul implicit are în continuare GIL.
Scop: Dacă discuția ajunge la viitorul GIL-ului, vrei să știi exact statutul: există, e suportat oficial din 3.14, dar nu e implicit.
Mecanism: PEP 703 a introdus un build separat (executabilul `python3.14t`, de exemplu) în care GIL-ul lipsește. Interpretorul își protejează structurile interne altfel: lock-uri fine pe obiecte și un reference counting adaptat. În 3.13 a fost experimental; PEP 779 l-a făcut suportat oficial în 3.14, tot ca opțiune.
Pas cu pas:
```text
python3.14  (implicit)      -> are GIL
python3.14t (free-threaded) -> fără GIL
4 threaduri CPU-bound:
  cu GIL   -> ~1 core
  fără GIL -> până la 4 core-uri
```
Aplicare: Verifici cu `sys._is_gil_enabled()` (din 3.13). Extensiile C trebuie să declare că suportă modul fără GIL; dacă importi una care nu o face, interpretorul reactivează GIL-ul și afișează un avertisment.
Legătură: Leagă-l de GIL-03: fără GIL, threadurile chiar rulează în paralel, deci race condition-urile din codul tău apar și mai ușor.
Limită: Codul single-threaded e puțin mai lent în build-ul free-threaded, iar extensiile se adaptează treptat. Pentru producție, răspunsul sigur la interviu rămâne: procese pentru calcul.
La interviu: „PEP 703 a adus un build free-threaded al CPython, fără GIL: experimental în 3.13, suportat oficial din 3.14, dar opțional. Build-ul implicit are încă GIL, deci pentru calcul în Python pur folosesc în continuare procese.”
Verificare: Instalezi Python 3.14 obișnuit și rulezi 4 threaduri CPU-bound. Folosești 4 core-uri?
Răspuns verificare: Nu: build-ul implicit are GIL. Ai nevoie explicit de build-ul free-threaded (`python3.14t`) și de extensii compatibile.
Varianta greșită B: Build-ul implicit are în continuare GIL, inclusiv în 3.13 și 3.14. Varianta fără GIL e un build separat, opțional.
Varianta greșită C: Un GIL per thread n-ar avea sens. Ideea apropiată e GIL-ul per subinterpretor (PEP 684), un mecanism diferit.
Varianta greșită D: Build-ul free-threaded n-are legătură cu GPU-ul. Codul rulează tot pe CPU, doar că threadurile pot lucra în paralel.

### gil-11
Pe scurt: `asyncio.to_thread` rulează o funcție blocantă într-un thread din pool și îți dă un awaitable; event loop-ul rămâne liber cât rulează funcția.
Scop: Ai cod sincron pe care nu-l poți rescrie (`requests`, un SDK, un driver vechi) și vrei să-l apelezi dintr-un serviciu asyncio fără să blochezi celelalte corutine.
Mecanism: Funcția e trimisă în pool-ul implicit de threaduri al loop-ului, echivalent cu `loop.run_in_executor(None, ...)`. Corutina ta face `await` pe rezultat și cedează controlul, iar loop-ul rulează alte corutine până când threadul termină. E disponibil din Python 3.9.
Pas cu pas:
```text
await to_thread(requests.get, url)
  -> requests.get rulează pe un thread
loop: rulează alte corutine între timp
thread gata -> corutina primește răspunsul
```
Aplicare:
```python
resp = await asyncio.to_thread(
    requests.get, url, timeout=10)
```
Legătură: E ce face FastAPI automat pentru endpointurile declarate cu `def`: le rulează în threadpool, ca să nu blocheze loop-ul.
Limită: Pentru calcul în Python pur, un thread nu ajută: ține GIL-ul și încetinește tot procesul. Acolo folosești `loop.run_in_executor` cu un `ProcessPoolExecutor`.
La interviu: „`asyncio.to_thread` rulează o funcție sincronă într-un thread separat și întoarce un awaitable, deci loop-ul nu se blochează. Îl folosesc pentru biblioteci sincrone; pentru calcul greu folosesc un executor de procese.”
Verificare: Muți cu `to_thread` o funcție care calculează 5 secunde în Python pur. Rămâne serviciul responsiv?
Răspuns verificare: Doar parțial: loop-ul primește GIL-ul periodic, deci răspunde, dar mai încet, iar calculul nu se accelerează. Pentru calcul folosești un proces.
Varianta greșită B: Funcția nu devine corutină: rulează în alt thread. Dacă ar rula direct pe loop, l-ar bloca.
Varianta greșită C: `to_thread` folosește un thread, nu un proces, deci nu ocolește GIL-ul. Pentru procese folosești `run_in_executor` cu un `ProcessPoolExecutor`.
Varianta greșită D: Funcția pornește imediat, pe un thread din pool, nu după ce loop-ul își termină task-urile.

### gil-12
Pe scurt: Când un task din `TaskGroup` aruncă excepție, celelalte sunt anulate, iar la ieșirea din bloc erorile apar împreună, ca `ExceptionGroup`.
Scop: Vrei ca niciun task să nu rămână „orfan”, rulând în fundal după ce operația din care făcea parte a eșuat. Asta înseamnă concurență structurată.
Mecanism: `async with asyncio.TaskGroup() as tg:` pornește task-uri cu `tg.create_task(...)`, iar blocul așteaptă să se termine toate. La prima excepție (alta decât `CancelledError`), grupul anulează task-urile rămase, așteaptă să se oprească, apoi ridică un `ExceptionGroup` cu toate erorile.
Pas cu pas:
```text
tg: t1..t5 pornite
t3 aruncă ValueError
tg anulează t1, t2, t4, t5
ieșire -> ExceptionGroup([ValueError])
```
Aplicare:
```python
try:
    async with asyncio.TaskGroup() as tg:
        for s in systems:
            tg.create_task(scan(s))
except* httpx.HTTPError as eg:
    log.error("scan failed: %s", eg.exceptions)
```
Legătură: E opusul lui `gather` folosit implicit: acolo, la prima excepție, celelalte task-uri continuă în fundal.
Limită: Dacă vrei ca toate să termine indiferent de erori, `TaskGroup` nu e potrivit: folosești `gather(..., return_exceptions=True)` și verifici fiecare rezultat.
La interviu: „`TaskGroup` aduce concurență structurată: la prima eroare anulează celelalte task-uri și ridică un `ExceptionGroup`, pe care îl prind cu `except*`. Când vreau să termine toate, folosesc `gather` cu `return_exceptions=True`.”
Verificare: Scanezi 20 de sisteme și vrei raportul pentru cele care au mers, chiar dacă 2 eșuează. `TaskGroup` sau `gather`?
Răspuns verificare: `gather(..., return_exceptions=True)`: primești o listă cu rezultate și excepții, iar cele 2 erori nu le opresc pe celelalte 18.
Varianta greșită B: Excepția nu rămâne doar în log: grupul o propagă la ieșirea din bloc, după ce anulează celelalte task-uri.
Varianta greșită C: Event loop-ul nu se oprește: doar task-urile grupului sunt anulate, iar excepția ajunge la codul care a deschis blocul.
Varianta greșită D: Nu există retry automat: task-ul eșuat rămâne eșuat, iar celelalte sunt anulate.

### gil-13
Pe scurt: Threadurile aceluiași proces împart memoria; procesele au fiecare memoria lor, izolată.
Scop: Distincția asta explică restul: de ce threadurile au nevoie de lock-uri, de ce procesele comunică prin pickle și de ce doar procesele ocolesc GIL-ul.
Mecanism: Un proces are propriul spațiu de memorie, propriile fișiere deschise și cel puțin un thread. Threadurile din același proces văd aceleași variabile și obiecte: comunică direct, dar se pot și încurca între ele. Procesele sunt izolate și comunică prin IPC (pipe-uri, cozi, socket-uri), cu date serializate.
Pas cu pas:
```text
proces A: memorie A
  thread 1 ┐ văd aceleași obiecte
  thread 2 ┘
proces B: memorie B (separată)
A <-> B: doar prin IPC (pipe, coadă)
```
Aplicare: Threads: pentru I/O și când vrei să împarți ușor date (cu `Lock` pentru starea partajată). Procese: pentru calcul în Python pur sau pentru izolare, ca un crash să nu dărâme restul.
Legătură: Gunicorn pornește mai multe procese worker: dacă unul crapă, celelalte merg mai departe, iar fiecare are GIL-ul lui.
Limită: Procesele sunt mai scumpe: pornesc mai greu, consumă mai multă memorie (copy-on-write la `fork` atenuează parțial) și plătești serializarea datelor.
La interviu: „Threadurile unui proces împart memoria: sunt ieftine, dar au nevoie de sincronizare. Procesele sunt izolate, mai scumpe și comunică prin IPC. În CPython, pentru calcul în Python pur, doar procesele scapă de GIL.”
Verificare: Pornești un thread și un proces copil (`multiprocessing`). Apoi părintele adaugă un element într-o listă globală. Îl vede threadul? Dar procesul copil?
Răspuns verificare: Threadul da: memoria e comună. Procesul copil nu: are propria copie a listei, făcută la pornire.
Varianta greșită B: E invers: threadurile împart memoria procesului, iar procesele sunt izolate între ele.
Varianta greșită C: Sunt concepte ale sistemului de operare, nu doar ale Python, și diferă prin memorie, cost și izolare.
Varianta greșită D: Sistemul de operare poate muta orice proces sau thread pe orice core, iar threadurile unui proces pot rula pe core-uri diferite. În CPython, doar GIL-ul le limitează la bytecode.

### gil-14
Pe scurt: Event loop-ul alternează corutinele pe un singur thread: rulează una până la un `await`, apoi o reia pe cea care poate continua.
Scop: Înțelegi de ce asyncio servește mii de conexiuni pe un singur thread și de ce un apel blocant oprește totul.
Mecanism: Loop-ul ține lista task-urilor gata de rulare și urmărește operațiile I/O în așteptare, prin mecanismele sistemului de operare (`epoll` pe Linux). Rulează un task până când acesta face `await` pe ceva care nu e gata. Când sosesc datele pe un socket, marchează task-ul respectiv ca gata și îl reia.
Pas cu pas:
```text
A: await sock.recv() -> pauză
loop: rulează B
B: await db.fetch() -> pauză
sosesc datele lui A -> loop reia A
A termină; B, la răspunsul DB
```
Aplicare: Folosești biblioteci async (httpx, asyncpg) și `await` pe fiecare operație I/O. Codul blocant îl muți cu `asyncio.to_thread`, iar calculul greu într-un proces.
Legătură: E același model ca event loop-ul din JavaScript, în browser sau Node.js: un singur thread, iar munca e reluată când datele sunt gata. Uvicorn rulează FastAPI exact așa.
Limită: Un event loop folosește un singur core. Ca să folosești mai multe, rulezi mai multe procese, de exemplu mai mulți workeri Uvicorn.
La interviu: „Event loop-ul rulează corutinele pe un singur thread: fiecare rulează până la un `await` pe I/O, apoi loop-ul trece la alta și o reia când datele sunt gata. E concurență, nu paralelism.”
Verificare: O corutină face un calcul de 3 secunde fără niciun `await`. Ce fac celelalte între timp?
Răspuns verificare: Nimic: loop-ul nu le poate rula până când corutina nu ajunge la un `await` sau nu termină.
Varianta greșită B: asyncio nu pornește threaduri pentru corutine: toate rulează pe threadul loop-ului.
Varianta greșită C: Corutinele se opresc la fiecare `await`, iar loop-ul le alternează. Doar codul fără `await` rulează fără pauză.
Varianta greșită D: Un event loop rulează pe un singur thread, deci pe un singur core. Pentru mai multe core-uri ai nevoie de procese.
