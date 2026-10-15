/* Nivel și context pentru fiecare grilă din băncile 1–4.
   Nivel: 1 = bază, 2 = practic, 3 = avansat.
   Contextul se citește înaintea întrebării: explică noțiunile de care ai nevoie, fără să dea răspunsul. */
(function (P) {
  P.qctx = {
    // ---- GIL, threads, procese, asyncio ----
    "gil-01": [1, "CPython e interpretorul Python standard. Codul tău e compilat în bytecode: instrucțiuni mici (citește o valoare, adună, scrie). GIL (Global Interpreter Lock) e un lock unic per proces, care controlează execuția acestor instrucțiuni. Atenție la nivelul la care acționează."],
    "gil-02": [1, "Munca I/O-bound mai mult așteaptă (rețea, disc); munca CPU-bound calculează continuu. Un thread care așteaptă rețeaua eliberează GIL-ul, unul care calculează în Python pur îl ține. Fiecare proces are propriul interpretor și propriul GIL."],
    "gil-03": [2, "Threadurile din același proces văd aceleași variabile globale. Interpretorul poate comuta de la un thread la altul între oricare două instrucțiuni de bytecode. Întrebarea-cheie: din câte instrucțiuni e făcut `counter += 1`?"],
    "gil-04": [1, "asyncio rulează multe corutine pe un singur thread, printr-un event loop care le alternează. O corutină cedează controlul doar la `await`. `time.sleep` e o funcție sincronă obișnuită: oprește threadul pe care rulează."],
    "gil-05": [2, "NumPy și OpenCV sunt extensii native: cod C/C++ apelat din Python. GIL-ul protejează obiectele Python; codul C care lucrează doar pe memoria lui poate renunța la GIL pe durata calculului, dacă autorii extensiei au ales asta."],
    "gil-06": [2, "`ProcessPoolExecutor` rulează funcții în alte procese. Procesele nu împart memoria: tot ce trimiți (argumente) și tot ce primești (rezultate) trece dintr-un proces în altul ca bytes, prin serializare."],
    "gil-07": [2, "`asyncio.gather` pornește toate corutinele primite deodată și așteaptă rezultatele. Ca să limitezi concurența, ai nevoie de un mecanism care lasă doar n corutine să lucreze în același timp, iar pe celelalte le pune să aștepte."],
    "gil-08": [2, "O corutină (`coro()`) nu rulează până nu o programează cineva. `await` o rulează și oprește corutina curentă până primește rezultatul. Un `Task` e o corutină programată pe event loop, care avansează în fundal."],
    "gil-09": [2, "Concurență = mai multe sarcini în progres în același interval, care se alternează. Paralelism = rulează literalmente simultan, pe core-uri diferite. Formularea bună le distinge și leagă alegerea (threads, asyncio, procese) de tipul de muncă."],
    "gil-10": [3, "PEP 703 a propus un CPython fără GIL, iar PEP 779 l-a declarat suportat oficial începând cu Python 3.14. Întrebarea e dacă e build-ul implicit sau o variantă separată și ce schimbă pentru threaduri."],
    "gil-11": [2, "Multe biblioteci sunt sincrone: `requests`, drivere DB mai vechi. Într-un program asyncio, apelul lor direct ar opri event loop-ul. Python are o funcție standard care rulează un astfel de apel în altă parte, fără să blocheze loop-ul."],
    "gil-12": [3, "`TaskGroup` (Python 3.11) e „concurență structurată”: pornești task-uri într-un bloc `async with`, iar blocul nu se termină până nu se termină toate. Gândește-te ce e mai sigur când unul dintre ele eșuează."],

    // ---- Cum rulează Python ----
    "rt-01": [1, "Python e numit des „interpretat”, dar CPython are și un pas de compilare înainte de execuție. Rezultatul compilării nu e cod mașină pentru procesor, ci un format intermediar, rulat de o mașină virtuală."],
    "rt-02": [1, "În Python, o variabilă e doar un nume legat de un obiect; tipul aparține obiectului, nu variabilei. Nu există un pas care să verifice tipurile înainte de rulare: `a + b` află abia când se execută ce obiecte are de adunat."],
    "rt-03": [1, "Python e dinamic (tipurile se află la runtime), dar „puternic tipat”: nu convertește singur un tip în altul când operația e ambiguă. Compară cu JavaScript, care face conversii implicite."],
    "rt-04": [2, "Type hints-urile (`def f(x: int) -> str`) sunt adnotări pe care interpretorul le stochează în `__annotations__`. Unelte separate le pot folosi: verificatoare statice (mypy, pyright) sau biblioteci care validează date (Pydantic)."],
    "rt-05": [2, "Fiecare obiect CPython are un contor de referințe: câte nume sau structuri îl țin. Când contorul ajunge la 0, obiectul poate fi eliberat. Problema: două obiecte care se referă unul pe altul nu ajung niciodată la 0."],
    "rt-06": [2, "Când imporți un modul, CPython îl compilează în bytecode. Ca să nu repete compilarea la fiecare pornire, salvează rezultatul pe disc, în directorul `__pycache__/`."],
    "rt-07": [2, "La interviu contează precizia. Există un pas de compilare în CPython? În ce format? Cine verifică tipurile și când? Alege formularea care răspunde corect la toate trei."],
    "rt-08": [1, "Când un fișier e importat, tot codul de la nivelul lui de sus se execută. Variabila specială `__name__` are valoarea `\"__main__\"` doar în fișierul pornit direct cu `python fișier.py`."],

    // ---- WSGI/ASGI, Gunicorn, Uvicorn, FastAPI ----
    "asgi-01": [2, "Uvicorn e un server ASGI: rulează un event loop într-un singur proces, deci folosește un singur core. Gunicorn e un manager de procese (pre-fork): pornește N procese worker, le repornește dacă mor și le oprește grațios."],
    "asgi-02": [2, "FastAPI rulează pe un event loop. Un endpoint `async def` rulează direct pe loop. Pentru endpointurile `def` (sincrone), FastAPI știe că ar putea bloca și le tratează diferit."],
    "asgi-03": [2, "Endpointul e `async def`, deci rulează direct pe event loop-ul workerului. `requests` e o bibliotecă HTTP sincronă: așteaptă răspunsul blocând threadul. Gândește-te ce fac celelalte request-uri în acest timp."],
    "asgi-04": [1, "WSGI și ASGI sunt specificații: contractul dintre serverul web și aplicația Python. Gunicorn + Django/Flask folosesc WSGI; Uvicorn + FastAPI folosesc ASGI. Diferă felul în care aplicația e apelată."],
    "asgi-05": [3, "Un worker Gunicorn de tip sync procesează un singur request odată. Procesul master îi urmărește pe workeri și îl consideră blocat pe cel care nu dă semn de viață într-un anumit timp (setarea `--timeout`)."],
    "asgi-06": [1, "În producție, în fața serverului aplicației (Gunicorn) stă de obicei un reverse proxy: Nginx sau un load balancer. El primește conexiunile din internet și le trimite mai departe aplicației."],
    "asgi-07": [2, "În FastAPI, `Depends(get_db)` cere framework-ului să apeleze `get_db` pentru fiecare request și să injecteze rezultatul. O dependență scrisă cu `yield` are două părți: ce e înainte de `yield` (setup) și ce e după (cleanup)."],
    "asgi-08": [1, "În FastAPI declari body-ul ca model Pydantic (`def create(a: AlertIn)`). Înainte să-ți apeleze funcția, FastAPI validează JSON-ul primit după model. Gândește-te ce cod HTTP se potrivește pentru „datele trimise nu respectă formatul”."],
    "asgi-09": [2, "Un worker sync servește un request odată, iar o parte din timp așteaptă după DB sau rețea. Documentația Gunicorn dă o formulă de pornire în funcție de numărul de core-uri, care ține cont de acest timp de așteptare."],
    "asgi-10": [2, "Kubernetes pornește containere în pod-uri, le repornește când mor, le verifică sănătatea și le scalează prin numărul de replici. Gândește-te ce din munca lui Gunicorn face deja orchestratorul."],

    // ---- Indexuri ----
    "idx-01": [1, "Fără index, ca să găsească un rând după `email`, Postgres citește toată tabela (Seq Scan). Un index e o structură separată, sortată după coloană, care duce direct la rândurile căutate. `EXPLAIN ANALYZE` arată ce plan a ales Postgres și cât a durat."],
    "idx-02": [2, "Un index compus `(a, b)` e sortat întâi după `a`, apoi după `b` în cadrul fiecărei valori `a`, ca o carte de telefon sortată după nume, apoi după prenume. Gândește-te la ce căutări se potrivește această ordine."],
    "idx-03": [2, "Selectivitate = ce fracțiune din rânduri trece filtrul. Planner-ul Postgres estimează costul fiecărei variante (prin index sau citind tabela în ordine) și o alege pe cea mai ieftină."],
    "idx-04": [1, "Un index e o copie sortată a unor coloane, ținută separat de tabelă și actualizată de Postgres de fiecare dată când datele se schimbă. Gândește-te ce costă asta la fiecare INSERT, UPDATE sau DELETE."],
    "idx-05": [2, "Un index B-tree pe `email` stochează valorile coloanei exact cum sunt. Query-ul caută după `lower(email)`, adică o valoare calculată din coloană, pe care indexul nu o conține."],
    "idx-06": [3, "Postgres are mai multe tipuri de index: B-tree (implicit: egalitate, intervale, sortare), Hash, GIN (valori compuse: chei din JSONB, elemente din array-uri, cuvinte din text) și BRIN (rezumate pe blocuri). Operatorul `@>` înseamnă „conține”."],
    "idx-07": [3, "Când datele sunt inserate în ordinea timpului, rândurile cu `created_at` apropiat stau fizic împreună pe disc. Un tip de index profită de asta: reține doar un rezumat (min/max) pentru fiecare grup de pagini, nu o intrare per rând."],
    "idx-08": [2, "`EXPLAIN ANALYZE` rulează query-ul și arată planul real. `Seq Scan` = citire secvențială a întregii tabele; `Rows Removed by Filter` = câte rânduri a citit și a aruncat pentru că nu se potriveau condiției."],
    "idx-09": [2, "Un `CREATE INDEX` obișnuit blochează scrierile în tabelă cât construiește indexul, iar pe o tabelă mare asta poate dura minute. Postgres are o variantă care nu blochează scrierile, cu prețul unei construcții mai lente."],
    "idx-10": [1, "Cuvântul „index” înseamnă lucruri diferite: în Postgres, o structură care accelerează căutarea într-o tabelă; în Elasticsearch, locul în care stochezi documentele. Ai lucrat cu Elasticsearch: gândește-te unde trimiți documentele."],
    "idx-11": [3, "Un index-only scan răspunde unui query doar din index, fără să mai citească tabela, dar numai dacă indexul conține toate coloanele cerute. Aici cheia indexului e `customer_id`; `total` și `status` sunt adăugate altfel."],

    // ---- Python ----
    "py-01": [2, "Valorile implicite ale parametrilor sunt evaluate când Python execută linia `def`. Întrebarea: câte liste există aici, una per apel sau una pentru toată viața funcției?"],
    "py-02": [3, "Un lambda e o funcție mică. Creat într-o buclă, reține o referință la variabila `i`, nu o copie a valorii ei de atunci. Funcțiile sunt apelate abia după ce bucla s-a terminat."],
    "py-03": [1, "Un fișier de 50 GB nu încape în 8 GB de RAM. Unele metode citesc tot fișierul în memorie odată; altele îl parcurg bucată cu bucată, păstrând în memorie doar linia curentă."],
    "py-04": [2, "Un decorator înlocuiește funcția ta cu alta (de obicei numită `wrapper`) care o apelează pe a ta. Fără grijă, funcția rezultată „uită” cine era: numele, docstring-ul, semnătura."],
    "py-05": [1, "Căutarea `x in colecție` costă diferit după structură: o listă e parcursă element cu element (O(n)), iar structurile bazate pe hash găsesc elementul direct, în timp aproape constant (O(1))."],
    "py-06": [2, "Lista Python e un array: adăugarea la final e ieftină, dar scoaterea de la început mută toate celelalte elemente. Modulul `collections` are o structură construită pentru operații ieftine la ambele capete."],
    "py-07": [1, "Fiecare obiect Python are o identitate (unde e în memorie) și o valoare. Două liste diferite pot avea aceeași valoare. Un operator compară identitatea, celălalt compară valoarea (apelând `__eq__`)."],
    "py-08": [1, "`with open(...) as f:` folosește un context manager: un obiect cu `__enter__` (rulează la intrarea în bloc) și `__exit__` (rulează la ieșire). Gândește-te ce se întâmplă dacă blocul aruncă o excepție la jumătate."],
    "py-09": [2, "O expresie generator `(... for ...)` produce valorile leneș, una câte una, pe măsură ce sunt cerute. Odată parcurs, generatorul nu se resetează."],
    "py-10": [3, "`itertools.groupby` parcurge lista o singură dată și începe un grup nou de fiecare dată când cheia se schimbă față de elementul anterior. Gândește-te ce iese pentru cheile `[A, B, A]`."],
    "py-11": [2, "Când prinzi o excepție de nivel jos (de la driverul DB, de exemplu) și ridici una de domeniu, poți pierde informația despre cauza reală. Sintaxa `raise ... from e` leagă explicit cele două excepții."],
    "py-12": [3, "`@dataclass` generează automat `__init__`, `__repr__` și `__eq__` pentru o clasă cu câmpuri. `frozen=True` interzice modificarea câmpurilor după creare; `slots=True` schimbă felul în care instanța își ține atributele în memorie."],
    "py-13": [2, "`[x] * 2` construiește o listă care conține de două ori același obiect `x`, nu două copii ale lui. Pentru numere nu contează, pentru că sunt imutabile; pentru liste interioare contează."],

    // ---- SQLAlchemy & Alembic ----
    "sqa-01": [2, "`Session` ține evidența obiectelor pe care le-a încărcat din DB, într-un dicționar intern indexat după clasă și cheie primară. Gândește-te ce primești dacă ceri același rând de două ori în aceeași sesiune."],
    "sqa-02": [1, "O relație „lazy” (implicit) nu se încarcă odată cu obiectul: SQLAlchemy face un SELECT separat abia la primul acces al atributului (`u.orders`). Numără: un query pentru lista de useri, apoi ce se întâmplă în buclă."],
    "sqa-03": [2, "Ambele opțiuni încarcă relațiile din timp (eager loading), ca să eviți N+1. Diferă cum o fac: una adaugă un JOIN la query-ul principal, cealaltă trimite un al doilea query pentru toate obiectele deodată."],
    "sqa-04": [2, "În SQLAlchemy, modificările stau întâi în sesiune. `flush` le trimite la DB ca SQL, în tranzacția deschisă (încă reversibile); COMMIT le face permanente. După commit, sesiunea consideră implicit datele din obiecte posibil vechi."],
    "sqa-05": [2, "Un obiect ORM e „atașat” cât timp sesiunea care l-a încărcat e deschisă: doar prin ea poate face query-uri noi. Accesul la o relație lazy (`order.items`) înseamnă un query nou."],
    "sqa-06": [1, "O `Session` e o unitate de lucru: o conversație cu DB-ul, cu tranzacția și obiectele ei, și nu e thread-safe. În Django, echivalentul e gestionat pentru tine la fiecare request; în SQLAlchemy îl gestionezi tu."],
    "sqa-07": [1, "SQL injection apare când input-ul userului devine parte din textul query-ului, iar DB-ul îl interpretează ca SQL (`' OR 1=1 --`). Protecția: valoarea trimisă separat, ca parametru, pe care DB-ul o tratează mereu ca dată."],
    "sqa-08": [3, "Engine-ul ține un pool de conexiuni deschise, refolosite între request-uri. O conexiune din pool poate „muri” fără să știi: restart de DB, firewall care închide conexiunile inactive."],
    "sqa-09": [3, "„Idempotent” = dacă rulezi operația de două ori, rezultatul e același ca după o rulare. Cu doi workeri concurenți, „verific dacă există, apoi inserez” din Python nu e sigur: ambii pot verifica înainte ca vreunul să insereze."],
    "sqa-10": [1, "Alembic e sistemul de migrații pentru SQLAlchemy, echivalentul `makemigrations`/`migrate` din Django. O migrație e un fișier Python care modifică schema DB. Comanda din întrebare corespunde lui `makemigrations`."],
    "sqa-11": [3, "La un deploy fără downtime, o vreme rulează simultan codul vechi (care citește `name`) și cel nou (care citește `full_name`). Orice pas al migrației trebuie să funcționeze pentru amândouă."],
    "sqa-12": [2, "SQLAlchemy are două straturi: Core (construiești SQL din Python și primești rânduri) și ORM (clase mapate pe tabele, obiecte urmărite de `Session`, relații). ORM-ul e construit peste Core."],
    "sqa-13": [3, "Cu `AsyncSession`, orice acces la DB trebuie făcut explicit, cu `await`. Un atribut lazy (`user.orders`) ar declanșa un query în momentul accesului, iar un simplu acces la atribut nu poate fi „await-uit”."],

    // ---- PostgreSQL ----
    "pg-01": [2, "Nivelul de izolare spune ce vede o tranzacție din modificările altor tranzacții concurente. Standardul SQL definește patru niveluri, de la cel mai permisiv la cel mai strict: READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ, SERIALIZABLE."],
    "pg-02": [2, "În READ COMMITTED, o tranzacție citește valoarea comisă în momentul citirii. Aici codul citește soldul în Python, calculează noua valoare și o scrie înapoi. Urmărește ce se întâmplă dacă ambele request-uri citesc înainte ca vreunul să scrie."],
    "pg-03": [2, "Problema clasică: dacă un UPDATE ar bloca rândul, toți cei care vor să-l citească ar aștepta. Postgres păstrează mai multe versiuni ale aceluiași rând, iar fiecare tranzacție o vede pe cea potrivită momentului ei."],
    "pg-04": [3, "„Idle in transaction” = conexiunea a deschis o tranzacție (BEGIN), a rulat ceva și acum nu mai face nimic, fără COMMIT sau ROLLBACK. Tranzacția ține lock-urile luate și un snapshot vechi al datelor."],
    "pg-05": [3, "Mai mulți workeri iau joburi din aceeași tabelă. `SELECT ... FOR UPDATE` blochează rândul ales până la finalul tranzacției, iar alți workeri care îl vor așteaptă. Postgres are o opțiune prin care un worker sare peste rândurile deja blocate."],
    "pg-06": [2, "În Postgres, fiecare conexiune deschisă e servită de un proces separat pe server, cu memoria lui. Sute de workeri și replici, fiecare cu propriul pool de conexiuni, înseamnă mii de conexiuni."],
    "pg-07": [2, "Partiționare = o tabelă logică împărțită în mai multe tabele fizice, de exemplu una pe lună. Query-urile filtrate pe timp citesc doar partițiile relevante. Gândește-te și cum ștergi datele mai vechi de 90 de zile."],
    "pg-08": [1, "Un lock e un drept exclusiv, temporar, asupra unui rând sau unei tabele: cine îl vrea și nu-l primește așteaptă. Imaginează-ți două tranzacții, fiecare ținând un lock de care are nevoie cealaltă."],
    "pg-09": [2, "Fiecare INSERT trimis separat costă un drum dus-întors la server, iar fiecare commit forțează o scriere sincronă pe disc. Postgres are un protocol dedicat încărcărilor masive, care trimite datele în flux, cu cost minim per rând."],
    "pg-10": [2, "Postgres poate colecta statistici pentru fiecare formă de query: de câte ori a rulat, timpul total, timpul mediu. Un query rapid, dar rulat de milioane de ori, poate costa mai mult decât unul lent rulat rar."],
    "pg-11": [2, "Funcțiile fereastră (`... OVER (...)`) calculează o valoare pentru fiecare rând, uitându-se la un grup de rânduri înrudite. `PARTITION BY user_id` definește grupul (rândurile aceluiași user), iar `ORDER BY` ordinea în grup."],

    // ---- Celery ----
    "cel-01": [1, "Un request HTTP e servit de un worker web (proces Gunicorn sau Uvicorn), iar clientul și load balancer-ul îl așteaptă cu un timeout. Celery mută munca lungă în workeri separați, care iau task-uri dintr-o coadă."],
    "cel-02": [2, "„Exactly once” = fiecare task rulează exact o dată, oricât de des pică rețeaua sau workerii. Gândește-te la cazul în care un worker termină task-ul, dar moare înainte să confirme brokerului."],
    "cel-03": [2, "Ack (confirmarea) îi spune brokerului că poate șterge mesajul din coadă. Implicit, workerul Celery confirmă când primește task-ul, înainte să-l execute. `acks_late` schimbă momentul confirmării."],
    "cel-04": [2, "Decoratorul `@app.task` primește opțiuni care controlează reîncercările automate. Citește fiecare parametru după nume: la ce eroare se aplică, cum cresc pauzele și de câte ori se repetă."],
    "cel-05": [2, "Celery Beat e programatorul de task-uri periodice: la ora setată, publică task-ul în coadă, de unde îl iau workerii. Fiecare instanță de Beat își ține singură evidența programului."],
    "cel-06": [1, "Argumentele unui task sunt serializate (implicit JSON) și stau în coadă până le preia un worker, uneori minute în șir. Gândește-te ce se poate schimba în DB între timp și ce poate pune JSON-ul într-un mesaj."],
    "cel-07": [2, "`session.add(order)` doar pregătește rândul; abia COMMIT-ul îl face vizibil pentru alte conexiuni. Workerul Celery rulează în alt proces, cu propria conexiune la DB, și poate porni task-ul în câteva milisecunde."],
    "cel-08": [2, "Un worker Celery are un număr fix de sloturi de execuție (concurrency). Un task de câteva minute ocupă un slot tot acest timp. Gândește-te ce pățesc task-urile rapide aflate în spatele lui, în aceeași coadă."],
    "cel-09": [2, "Celery are primitive pentru compunerea task-urilor (canvas): `chain` = task-uri în secvență, fiecare primind rezultatul anterior; `group` = task-uri în paralel. Chord-ul le combină într-un anumit fel."],
    "cel-10": [3, "Cu Redis ca broker, un mesaj preluat, dar neconfirmat, redevine vizibil după `visibility_timeout`, ca să nu se piardă dacă workerul moare. Un task cu `countdown` lung stă la worker, neconfirmat, până la ora de execuție."],
    "cel-11": [2, "Serializer-ul transformă argumentele task-ului în bytes pentru broker. pickle poate reconstrui orice obiect Python, inclusiv unul care, la deserializare, apelează o funcție aleasă de cine a creat datele."],
    "cel-12": [2, "Workerul Celery poate rula task-urile în procese (prefork), threaduri sau greenlets (gevent, eventlet). Aplică regula de la GIL: ce ajută codul Python care calculează continuu?"],
    "cel-13": [3, "Celery are două limite de timp per task. `time_limit` (hard) omoară procesul care rulează task-ul. `soft_time_limit` se declanșează înaintea ei și e mai blândă. Gândește-te ce ar vrea să facă un task înainte să fie oprit."],

    // ---- RabbitMQ ----
    "rmq-01": [2, "În RabbitMQ publici într-un exchange, cu un routing key (ex. `sap.prd.security`); exchange-ul decide în ce cozi ajunge mesajul, după binding-uri. Tipuri: direct (cheie exactă), topic (tipare cu `*` și `#`), fanout (toate cozile), headers."],
    "rmq-02": [2, "Cu auto-ack, brokerul consideră mesajul confirmat în momentul în care îl trimite consumatorului. Cu ack manual, consumatorul confirmă singur, după ce a terminat procesarea."],
    "rmq-03": [2, "Brokerul trimite mesaje consumatorilor fără să aștepte ca fiecare mesaj să fie terminat. `basic.qos` setează o limită legată de asta. Gândește-te ce pățește un consumator lent care a primit deja 1000 de mesaje."],
    "rmq-04": [2, "Pentru RabbitMQ, „durabil” are două niveluri: coada (dacă definiția ei supraviețuiește restartului) și mesajul (dacă e scris pe disc, adică „persistent”). Publisher confirms = brokerul confirmă producătorului că a preluat mesajul."],
    "rmq-05": [2, "Un „poison message” e un mesaj care nu poate fi procesat niciodată (de exemplu, malformat). Dacă la fiecare eșec îl pui înapoi în coadă (requeue), revine imediat și blochează consumatorul. Un dead letter exchange (DLX) primește mesajele respinse."],
    "rmq-06": [2, "O coadă livrează mesajele în ordinea în care au intrat. Cu mai mulți consumatori, mesaje consecutive ajung la consumatori diferiți, care termină în ritmuri diferite."],
    "rmq-07": [1, "RabbitMQ e un broker de mesaje clasic: cozi din care consumatorii iau și confirmă mesaje. Kafka e o platformă de event streaming: un log de evenimente pe care fiecare consumator îl citește de la poziția lui (offset)."],
    "rmq-08": [1, "Un exchange primește mesajele de la producători și le distribuie în cozile legate de el (binding-uri). Tipul exchange-ului decide regula de distribuție. „Fan-out” înseamnă, în general, o intrare care pleacă spre mai multe ieșiri."],
    "rmq-09": [3, "RabbitMQ 4.0 a eliminat mirroring-ul clasic al cozilor. Coada replicată modernă folosește un algoritm de consens (Raft): o scriere e confirmată când a ajuns pe majoritatea nodurilor."],

    // ---- Redis ----
    "rd-01": [2, "Redis are două mecanisme de mesagerie: Pub/Sub și Streams. Întrebarea-cheie pentru „nu au voie să se piardă”: ce se întâmplă cu un mesaj publicat cât timp un consumator e deconectat?"],
    "rd-02": [2, "Un lock distribuit = o cheie Redis pe care o poate crea un singur proces odată. Două lucruri trebuie să fie adevărate: crearea e atomică (nu pot reuși doi deodată) și lock-ul expiră singur dacă procesul care îl ține moare."],
    "rd-03": [1, "Un cache ține o copie rapidă (în Redis) a datelor din sursa de adevăr (Postgres). Patternurile de cache diferă prin cine scrie în cache și când: aplicația sau baza de date, la citire sau la scriere."],
    "rd-04": [2, "Imaginează-ți o cheie de cache foarte cerută, recalculată printr-un query scump. În momentul în care expiră, toate request-urile care o cer în acea secundă găsesc cache-ul gol."],
    "rd-05": [2, "Redis execută comenzile pe un singur thread, una câte una. `KEYS *` returnează toate cheile care se potrivesc tiparului, parcurgând întreaga bază, care poate avea milioane de chei."],
    "rd-06": [2, "Mai multe replici de API primesc request-uri pentru aceeași cheie, deci contorul trebuie să fie vizibil tuturor și incrementat atomic. Gândește-te și cum „se resetează” contorul la fiecare minut."],
    "rd-07": [3, "Când Redis atinge limita de memorie (`maxmemory`), politica de evacuare decide ce face: refuză scrierile noi sau șterge chei după un criteriu (cele mai puțin recent folosite, cele mai rar folosite, cele cu TTL)."],
    "rd-08": [3, "`MULTI` deschide un bloc de comenzi puse în așteptare, iar `EXEC` le execută. Redis rulează comenzile pe un singur thread. Nu presupune că e la fel ca o tranzacție SQL: verifică ce se întâmplă dacă o comandă din bloc eșuează."],
    "rd-09": [2, "Redis ține datele în memorie, dar le poate salva și pe disc, în două feluri: o fotografie periodică a întregii baze sau un jurnal în care adaugă fiecare comandă de scriere."],

    // ---- Pytest ----
    "pt-01": [1, "Un fixture pytest pregătește ceva pentru test (o sesiune DB, date). Testul îl cere ca parametru, iar pytest îl creează automat. Un fixture scris cu `yield` are două părți: ce rulează înainte de test și ce rulează după."],
    "pt-02": [2, "`scope` spune cât trăiește un fixture: `function` (implicit, nou pentru fiecare test), `class`, `module` sau `session` (o dată pentru toată rularea). Pornirea containerului durează 5 s; înmulțește cu 300."],
    "pt-03": [2, "`from app.notify import send_email` creează în modulul `app.alerts` un nume nou, `send_email`, care arată spre funcție. `patch` înlocuiește un nume într-un anumit modul. Întrebarea: ce nume folosește `raise_alert` când rulează?"],
    "pt-04": [1, "Un decorator `@pytest.mark...` atașează unui test o etichetă sau un comportament. `parametrize` primește un nume de argument și o listă de valori."],
    "pt-05": [1, "Pytest caută automat anumite fișiere cu nume speciale. Fixture-urile definite într-un astfel de fișier sunt disponibile testelor din directorul lui, fără niciun import."],
    "pt-06": [2, "Testele nu trebuie să lase urme: o variabilă de mediu modificată de un test poate strica testele următoare. Pytest are fixture-uri încorporate pentru modificări temporare, anulate automat la final."],
    "pt-07": [2, "Un mock înlocuiește un obiect real în test. Implicit, apelarea lui întoarce alt mock. Poți controla ce face la apel: `return_value` dă mereu aceeași valoare, iar `side_effect` permite comportamente mai complexe."],
    "pt-08": [3, "Cu `task_always_eager=True`, `.delay()` execută task-ul imediat, în procesul testului, ca pe o funcție normală. Gândește-te ce părți din drumul real al unui task (aplicație → broker → worker) dispar."],
    "pt-09": [1, "Un test bun e rapid și dă același rezultat la fiecare rulare (determinist). Un job asincron poate termina în 0,5 s pe laptop și în 3 s pe un runner CI încărcat."],
    "pt-10": [3, "Un `MagicMock` simplu acceptă orice apel, cu orice argumente, și are orice atribut ceri. Dacă funcția reală își schimbă semnătura, testul cu mock simplu continuă să treacă."],

    // ---- Securitate ----
    "sec-01": [2, "Codul citește bytes din Redis și îi deserializează cu pickle, formatul nativ Python, capabil să reconstruiască orice obiect. Întreabă-te: cine poate scrie în acea cheie și ce poate face pickle la încărcare?"],
    "sec-02": [1, "Parolele nu se stochează niciodată în clar. Hash = transformare ireversibilă; salt = valoare aleatoare per user, ca parole identice să dea hash-uri diferite. Dacă baza scapă, atacatorul încearcă miliarde de parole pe GPU."],
    "sec-03": [2, "Un JWT are trei părți în base64: header (algoritmul), payload (claims: `sub` = userul, `exp` = expirarea, `iss` = emitentul, `aud` = destinatarul) și semnătura. Keycloak semnează cu cheia privată și publică cheia publică (JWKS)."],
    "sec-04": [1, "Ai lucrat cu Keycloak, care le implementează pe amândouă. OAuth2 a apărut pentru acces delegat: o aplicație primește un token ca să cheme un API în numele userului. OpenID Connect a fost construit peste OAuth2, pentru login."],
    "sec-05": [2, "Cu `shell=True` (și cu `os.system`), comanda e un string interpretat de shell, unde `;`, `&&` sau `|` pornesc comenzi noi. Gândește-te ce se întâmplă dacă `host` e `8.8.8.8; rm -rf /`."],
    "sec-06": [2, "Request-ul îl face serverul tău, din rețeaua lui internă. Un atacator poate da un URL spre servicii accesibile doar din interior: un admin intern, o bază de date, metadata cloud la 169.254.169.254."],
    "sec-07": [3, "`==` pe stringuri se oprește la primul caracter diferit, deci un token greșit de la primul caracter e respins puțin mai repede decât unul greșit de la ultimul. Cine măsoară timpii de răspuns poate ghici tokenul caracter cu caracter."],
    "sec-08": [1, "OWASP Top 10 e lista celor mai frecvente categorii de vulnerabilități web, actualizată periodic (2021, 2025). Pe primele locuri sunt categoriile găsite în cele mai multe aplicații testate."],
    "sec-09": [1, "Principiul least privilege: fiecare componentă primește doar drepturile strict necesare. Gândește-te ce poate face un atacator care preia aplicația (de exemplu printr-un SQL injection), în funcție de drepturile userului ei de DB."],
    "sec-10": [1, "Un secret (API key, parolă) trebuie să stea în afara codului și a imaginilor, accesibil doar cui are nevoie, cu acces auditat și ușor de schimbat (rotit). Repo-urile, chiar private, se clonează pe multe laptopuri și pipeline-uri."],
    "sec-11": [3, "OWASP Top 10:2025 a adus o categorie nouă, extinsă din „componente vulnerabile și învechite” (2021). Gândește-te la riscurile din tot ce instalezi cu pip și din pipeline-ul care îți construiește aplicația."],

    // ---- System design ----
    "des-01": [3, "„Dual write”: scrii în două sisteme (Postgres și RabbitMQ) fără o tranzacție comună, deci una dintre scrieri poate reuși, iar cealaltă eșua. Ideea soluției: scrii totul într-un singur loc, atomic, iar publicarea vine separat."],
    "des-02": [2, "Într-un sistem distribuit, confirmarea unei operații se poate pierde pe rețea chiar dacă operația a reușit; expeditorul reîncearcă și apare un duplicat. Varianta opusă, fără reîncercări, pierde mesaje."],
    "des-03": [2, "Când o dependență e căzută, fiecare apel spre ea ține un worker ocupat până la timeout, iar workerii se termină repede. Gândește-te la o siguranță electrică: ce face când detectează o problemă repetată?"],
    "des-04": [1, "Workerii stateless nu păstrează nimic între mesaje, deci oricare dintre ei poate procesa orice mesaj. Lungimea cozii arată câtă muncă așteaptă: dacă tot crește, workerii nu țin pasul."],
    "des-05": [2, "Clientul nu știe dacă primul POST a ajuns la server înainte de timeout. Dacă trimite odată cu cererea un identificator unic generat de el, serverul poate recunoaște o cerere repetată."],
    "des-06": [2, "Multi-tenant = aceeași aplicație servește mai mulți clienți, ale căror date trebuie separate. Variantele diferă prin cât partajează: aceleași tabele (cu o coloană care spune al cui e rândul), scheme separate sau baze de date separate."],
    "des-07": [1, "Când un serviciu cade, toți clienții eșuează în același moment. Dacă toți reîncearcă după aceeași pauză fixă, lovesc din nou serviciul deodată. Backoff = pauze tot mai lungi; jitter = o parte aleatoare din pauză."],

    // ---- Relațional vs nerelațional ----
    "dbm-01": [1, "La Lateral, motivul dat pentru NoSQL a fost volumul de date. Întrebarea e ce motive tehnice reale justifică NoSQL și cât de mult duce un Postgres bine indexat."],
    "dbm-02": [1, "Fiecare tip de bază e bun la altceva: relațional (Postgres) = tranzacții, integritate, JOIN-uri; Elasticsearch = căutare full-text și agregări pe volume mari; Redis = date în memorie, rapide, efemere."],
    "dbm-03": [1, "ACID descrie garanțiile unei tranzacții: ce se întâmplă cu un transfer bancar dacă serverul cade la jumătate, dacă două transferuri rulează simultan sau dacă o regulă a bazei ar fi încălcată."],
    "dbm-04": [2, "Sursa de adevăr e sistemul pe care te bazezi când copiile datelor diferă: trebuie să garanteze scrieri sigure, consistente și imediat vizibile. Elasticsearch e optimizat pentru căutare și indexează documentele cu o mică întârziere."],
    "dbm-05": [2, "CAP: Consistency (toți văd aceleași date), Availability (orice cerere primește răspuns), Partition tolerance (sistemul funcționează când nodurile nu mai comunică). Într-un sistem distribuit, o partiție de rețea nu poate fi exclusă."],
    "dbm-06": [2, "JSONB e un tip de coloană Postgres care stochează JSON în format binar, indexabil (GIN) și interogabil cu operatori. Un document store separat (MongoDB) înseamnă încă un sistem de operat și de sincronizat."],
    "dbm-07": [1, "Starea efemeră trăiește puțin (minute, ore) și e citită și scrisă foarte des: sesiuni, contoare de rate limit, lock-uri. Ai nevoie de viteză și de expirare automată (TTL)."],
    "dbm-08": [2, "Replicare asincronă: scrierea ajunge întâi pe un nod, apoi e copiată pe celelalte, cu o mică întârziere. Gândește-te ce poate citi un client de pe o replică imediat după scriere."],

    // ---- Docker ----
    "dk-01": [1, "`docker build` produce ceva din Dockerfile; `docker run` pornește ceva din acel rezultat. Din același rezultat al build-ului poți porni oricâte instanțe."],
    "dk-02": [2, "Fiecare instrucțiune din Dockerfile produce un layer, iar Docker refolosește layerele din cache cât timp nimic nu s-a schimbat. Când o instrucțiune se schimbă (de exemplu fișierele copiate), toate cele de după se refac."],
    "dk-03": [2, "Un Dockerfile poate avea mai multe etape (`FROM ... AS builder`, apoi alt `FROM`). Compilatoarele, header-ele și uneltele de build sunt necesare la build, dar nu și la rulare."],
    "dk-04": [3, "Shell form (`CMD gunicorn app:app`) pornește comanda prin `/bin/sh -c`. Exec form (`CMD [\"gunicorn\", \"app:app\"]`) pornește direct programul. `docker stop` trimite SIGTERM procesului cu PID 1 din container."],
    "dk-05": [1, "O imagine Docker e făcută din layere, iar fiecare instrucțiune din Dockerfile lasă urme în istoricul imaginii (`docker history`). Oricine are acces la imagine poate citi acest istoric."],
    "dk-06": [1, "Implicit, procesul din container rulează ca root. Dacă aplicația are o vulnerabilitate, atacatorul primește drepturile procesului."],
    "dk-07": [1, "Ai lucrat cu Docker Swarm: servicii, replici, rolling updates. Amândouă sunt orchestratoare de containere. Diferența ține de complexitate, de ecosistem și de cât de răspândite sunt."],
    "dk-08": [1, "Docker Compose pune serviciile din același fișier într-o rețea comună, cu DNS intern. Fiecare container are propriul `localhost`, care înseamnă containerul însuși."],

    // ---- Onapsis, SAP & detecție ----
    "dom-01": [1, "Onapsis vinde securitate pentru aplicațiile SAP ale companiilor mari. Produsele lor acoperă scanarea vulnerabilităților, analiza codului ABAP și monitorizarea în timp real. Defend e produsul pe care ai lucra."],
    "dom-02": [1, "SAP e compania germană care face cele mai folosite sisteme ERP (Enterprise Resource Planning). Pe ele rulează procesele de bază ale marilor companii, de aceea Onapsis le numește „business-critical applications”."],
    "dom-03": [1, "Regulile de detecție caută un tipar în evenimente. Uită-te la ingrediente: un număr minim („cel puțin 5”), o perioadă („2 minute”) și o succesiune de evenimente diferite (eșuate, apoi reușit)."],
    "dom-04": [1, "Fals-pozitiv = alertă pentru ceva ce nu era un atac. Alertele sunt citite de oameni, analiștii din SOC (Security Operations Center), care au timp limitat pentru fiecare."],
    "dom-05": [1, "Companiile mari au zeci de surse de loguri de securitate: firewall-uri, servere, aplicații, Active Directory. Un SIEM (Security Information and Event Management) e locul în care aceste loguri se întâlnesc."],
    "dom-06": [2, "MITRE e o organizație americană non-profit. ATT&CK e unul dintre cele mai cunoscute proiecte ale ei, folosit de echipele SOC și de produsele de detecție ca limbaj comun."],
    "dom-07": [2, "Corelarea (de ex. „5 eșecuri, apoi un succes”) are nevoie de evenimentele aceluiași sistem în ordine; ordinea între sisteme diferite nu contează. Gândește-te cum păstrezi paralelismul fără să amesteci evenimentele unui sistem."],
    "dom-08": [2, "Clienții SAP aplică patch-urile de securitate cu întârziere de săptămâni sau luni: sistemele sunt critice și au ferestre de mentenanță rare. În acest interval, vulnerabilitatea e deja cunoscută public."],

    // ---- Performanță ----
    "pf-01": [1, "Intuiția despre unde e lent un program e de obicei greșită. Un profiler măsoară cât timp petrece programul în fiecare funcție."],
    "pf-02": [1, "Fiecare commit înseamnă un drum dus-întors la server și o scriere sincronă pe disc (fsync). La un milion de rânduri, acest cost fix se plătește de un milion de ori."],
    "pf-03": [2, "O buclă `for` în Python execută bytecode pentru fiecare rând, cu overhead de interpretor. Biblioteci ca pandas, NumPy sau Polars rulează aceeași operație pe coloane întregi, în cod compilat (C, Rust)."],
    "pf-04": [2, "Într-un pipeline, un producător (citește evenimente) trimite date unui consumator (le procesează). Dacă producătorul e mai rapid, datele se adună undeva între ei. Gândește-te cum poate consumatorul să controleze ritmul."],
    "pf-05": [3, "`.all()` aduce toate rândurile în memorie deodată, ca obiecte ORM, iar sesiunea le ține în identity map. SQLAlchemy poate aduce rândurile și în bucăți, pe măsură ce le procesezi."],
    "pf-06": [3, "Un `ProcessPoolExecutor` trimite fiecare task altui proces: argumentele sunt serializate (pickle) și trimise prin IPC, iar rezultatul face drumul invers. Compară costul acestui drum cu durata unui task foarte mic."],
    "pf-07": [2, "Un profiler clasic (cProfile) se pornește odată cu programul. Un sampling profiler se poate atașa din exterior unui proces deja pornit și citește periodic ce funcție rulează."],

    // ---- AWS ----
    "aws-01": [1, "În AWS, IAM controlează cine ce are voie să facă. Un user IAM are chei permanente; un rol IAM e asumat temporar de un serviciu (EC2, ECS, Lambda) și primește credențiale temporare, rotite automat."],
    "aws-02": [2, "SQS e serviciul de cozi din AWS, cu două tipuri: standard (throughput aproape nelimitat) și FIFO. Ca la RabbitMQ, un mesaj preluat trebuie șters explicit după procesare, altfel reapare."],
    "aws-03": [2, "Amândouă sunt firewall-uri virtuale în VPC (rețeaua ta privată din AWS). „Stateful” = ține minte conexiunile: dacă ai permis cererea, răspunsul trece automat. „Stateless” = fiecare pachet e verificat separat, în ambele direcții."],
    "aws-04": [1, "O zonă de disponibilitate (AZ) e un data center separat dintr-o regiune AWS. RDS e serviciul de baze de date gestionate (Postgres, MySQL); Aurora e varianta AWS compatibilă cu Postgres."],
    "aws-05": [2, "Lambda rulează o funcție la un eveniment (request HTTP, fișier în S3, mesaj în coadă) și plătești doar timpul de execuție. Are o durată maximă per invocare, iar instanțele pornesc și se opresc des."],
    "aws-06": [2, "AWS are servicii diferite pentru observabilitate și audit: CloudWatch (metrici, loguri, alarme), CloudTrail, Cost Explorer. Gândește-te ce îți trebuie într-o investigație de securitate: cine a schimbat o resursă și când."],
    "aws-07": [2, "SNS e un serviciu de notificări publish/subscribe: un mesaj publicat pe un topic ajunge la toți abonații. SQS e un serviciu de cozi. Un abonat SNS poate fi o coadă SQS."],

    // ---- GraphQL ----
    "gql-01": [2, "În GraphQL, fiecare câmp are un resolver: o funcție care îi produce valoarea. Pentru o listă de 100 de obiecte, resolver-ul unui câmp al obiectului e apelat de 100 de ori."],
    "gql-02": [2, "Un client GraphQL scrie el forma query-ului, inclusiv cât de adânc intră în relații (prieteni ai prietenilor ai prietenilor...). Fiecare nivel poate înmulți munca serverului."],
    "gql-03": [1, "În REST, serverul decide ce câmpuri întoarce fiecare endpoint (`/users/1`, `/users/1/orders`). În GraphQL există un singur endpoint, iar clientul trimite un query care descrie forma exactă a răspunsului."],
    "gql-04": [2, "Într-un API REST, o schimbare incompatibilă duce des la o versiune nouă (`/v2`). În GraphQL, clientul cere explicit fiecare câmp, deci serverul știe exact ce folosesc clienții."],
    "gql-05": [2, "Un API GraphQL expune un graf de obiecte legate: din `alert` ajungi la `system`, apoi la `tenant`, apoi la alte alerte. Un singur query poate traversa multe tipuri de obiecte."],
    "gql-06": [1, "GraphQL are trei tipuri de operații: query (citire), mutation și subscription (flux de evenimente în timp real). Numele „mutation” vine de la „a modifica”."],
    "gql-07": [2, "Code-first = scrii clase Python, iar schema GraphQL e generată din ele. Schema-first = scrii întâi schema în SDL (limbajul GraphQL), apoi legi funcțiile Python de ea. FastAPI se bazează mult pe type hints."],

    // ---- Observabilitate & GitLab CI ----
    "obs-01": [1, "Media ascunde extremele: dacă 99 de request-uri durează 50 ms și unul 7 s, media e 120 ms. Percentila p99 = valoarea sub care se află 99% din request-uri."],
    "obs-02": [1, "Metricile, logurile și trace-urile sunt cei trei piloni ai observabilității. Gândește-te la ce răspunde fiecare: cât de des și cât de mult? ce s-a întâmplat exact aici? pe unde a trecut acest request?"],
    "obs-03": [2, "RED e o metodă de a alege metricile unui serviciu care primește request-uri: câte vin, câte eșuează și cât durează. Fiecare literă e o măsurătoare."],
    "obs-04": [2, "New Relic APM (Application Performance Monitoring) rulează ca agent în procesul aplicației și măsoară automat fiecare tranzacție (request web sau task de fundal), defalcată pe componente."],
    "obs-05": [1, "Logurile structurate sunt scrise ca JSON, cu câmpuri (`level`, `user_id`, `request_id`), nu ca text liber. Correlation ID = un identificator unic al request-ului, adăugat în fiecare log scris pe parcursul lui."],
    "obs-06": [2, "În GitLab CI, un pipeline are joburi grupate pe stage-uri, care pot rula pe runneri diferiți. Ambele mecanisme păstrează fișiere între joburi, dar cu scopuri și garanții diferite."],
    "obs-07": [2, "Un job GitLab CI rulează într-un container. GitLab poate porni lângă el containere auxiliare, accesibile prin hostname, cum face și docker compose."],
    "obs-08": [3, "Implicit, joburile din GitLab CI rulează pe stage-uri: niciun job din stage-ul 2 nu pornește până nu se termină toate joburile din stage-ul 1."],
    "obs-09": [2, "Trei termeni înrudiți: SLI, SLO și SLA. Ultima literă vine, pe rând, de la Indicator, Objective și Agreement. SLI e ce măsori, de exemplu latența request-urilor."],

    // ---- Linux ----
    "lx-01": [1, "Semnalele sunt mesaje trimise de sistemul de operare unui proces. Pe unele procesul le poate prinde și trata (ca să-și închidă conexiunile, de exemplu), pe altele kernelul le aplică direct. 15 = SIGTERM, 9 = SIGKILL."],
    "lx-02": [1, "Un proces care ascultă pe un port are deschis un socket TCP. Unelte ca `ss` și `lsof` listează socket-urile deschise și procesele care le dețin; `ps` listează procese, `df` spațiul pe disc."],
    "lx-03": [2, "Pipeline-ul trece output-ul unei comenzi în următoarea. `awk '{print $1}'` scoate prima coloană, iar `head -5` păstrează primele 5 linii. Atenție la un detaliu al lui `uniq -c`: numără doar liniile identice consecutive."],
    "lx-04": [2, "În Linux, fiecare fișier deschis, socket sau conexiune de rețea ocupă un descriptor de fișier. Fiecare proces are o limită de descriptori, vizibilă cu `ulimit -n`."],
    "lx-05": [1, "Permisiunile Unix au trei cifre: owner, grup, ceilalți. Fiecare cifră e o sumă: 4 = citire (r), 2 = scriere (w), 1 = execuție (x)."],
    "lx-06": [2, "Un container nu e o mașină virtuală: nu are kernel propriu, ci e un proces obișnuit de pe gazdă. Kernelul Linux are mecanisme care îi limitează ce vede (procese, rețea, fișiere) și cât consumă (CPU, memorie)."],
    "lx-07": [2, "Când un proces e oprit de un semnal, codul de ieșire e 128 + numărul semnalului. Kernelul are un mecanism (OOM killer) care omoară procese când memoria disponibilă e depășită."],

    // ---- Django ORM → SQLAlchemy ----
    "dj-01": [1, "Fiecare acces la `order.customer` face un query separat dacă relația nu e deja încărcată. Django are două metode pentru încărcarea relațiilor din timp: una cu JOIN (pentru ForeignKey), alta cu query separat (pentru many-to-many)."],
    "dj-02": [2, "`p.views += 1; p.save()` citește valoarea în Python, o modifică și o scrie înapoi. Dacă două request-uri fac asta simultan, amândouă pot citi aceeași valoare. Django are expresii care lasă baza de date să facă operația."],
    "dj-03": [2, "În Django, cu `ATOMIC_REQUESTS` sau `transaction.atomic`, scrierile din request rămân invizibile până la commit. Workerul Celery citește din DB din alt proces, cu altă conexiune."],
    "dj-04": [2, "Active Record: obiectul știe să se salveze singur (`obj.save()`). Data Mapper: obiectele sunt simple, iar un alt strat (aici `Session`) urmărește modificările și le scrie în DB."],

    // ---- React & TypeScript ----
    "fe-01": [1, "TypeScript adaugă tipuri peste JavaScript și se compilează în JavaScript. Verificarea tipurilor are loc la compilare; în browser rulează tot JavaScript, fără tipuri."],
    "fe-02": [2, "React compară valoarea `value` a unui Context cu cea de la render-ul anterior după referință (`Object.is`), nu după conținut. `{{ user, setUser }}` scrie un obiect literal direct în JSX."],
    "fe-03": [1, "`key` îi spune lui React care element din listă e care între două render-uri. React leagă starea internă a unei componente (input-uri, state) de key-ul ei."],
    "fe-04": [2, "TanStack Query (React Query) cache-uiește rezultatele request-urilor. Datele pot fi „proaspete” (folosite direct) sau „vechi” (afișate, dar reîncărcate în fundal), iar datele nefolosite de nicio componentă sunt șterse după un timp."]
  };
})(window.PREP);
