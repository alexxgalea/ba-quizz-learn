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

Definiție: Bucla care programează și reia corutinele într-un program asyncio, de regulă pe un singur thread.
Scop: Coordonează sarcinile care așteaptă I/O, astfel încât una care așteaptă să nu blocheze celelalte.
Exemplu: La `await asyncio.sleep(1)`, loop-ul rulează alte task-uri și reia corutina după expirare.
Analogie: Un dispatcher care urmărește ce sarcini pot continua și le redistribuie.
Limită: Un apel blocant direct, precum `time.sleep`, oprește loop-ul; folosești `await asyncio.sleep` sau `asyncio.to_thread`.
Vezi și: corutină, asyncio, threadpool

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
