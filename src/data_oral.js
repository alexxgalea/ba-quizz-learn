/* Carduri orale: răspunzi cu voce tare, apoi bifezi punctele cheie acoperite. `model` = răspuns model, în română. */
(function (P) {
  const O = (m, list) => list.forEach(c => P.oral.push(Object.assign({ m }, c)));

  O("gil", [
    { id: "o-gil-1", q: "Am un task CPU-bound și unul I/O-bound. Ce folosesc pentru fiecare și de ce?", k: [
      "GIL: un singur thread execută bytecode Python la un moment dat (CPython)",
      "I/O-bound → threads sau asyncio: GIL-ul se eliberează cât aștepți I/O",
      "CPU-bound → procese (ProcessPoolExecutor) sau cod nativ, vectorizat",
      "Costul proceselor: memorie separată, pickling, IPC",
      "Exemplu concret: OpenCV/NumPy eliberează GIL-ul, deci un thread pool scalează"],
      model: "Pentru I/O-bound folosesc threads sau asyncio, pentru că GIL-ul se eliberează cât un thread așteaptă după rețea sau disc, deci multe request-uri se suprapun. Pentru CPU-bound în Python pur, threadurile nu ajută: un singur thread execută bytecode la un moment dat, așa că folosesc un ProcessPoolExecutor ca să lucrez pe mai multe core-uri, acceptând costul de pickling și de memorie. Dacă partea grea rulează în cod nativ, cum e NumPy sau OpenCV, apelurile acelea eliberează GIL-ul, deci și un thread pool poate scala. Iar cu asyncio nu blochez niciodată event loop-ul: apelurile blocante merg în `to_thread` sau într-un executor." },
    { id: "o-gil-2", q: "Ce e asyncio și când nu l-ai folosi?", k: [
      "Concurență cooperativă pe un singur thread, cu event loop",
      "Ideal pentru mii de conexiuni I/O, cu cost mic per corutină",
      "Corutinele cedează doar la await: un apel blocant oprește tot",
      "Nu ajută la CPU-bound; cere biblioteci async (httpx, asyncpg)",
      "Cod sincron și concurență mică → threadurile sunt mai simple"],
      model: "asyncio oferă concurență cooperativă pe un singur thread: un event loop comută între corutine de fiecare dată când una așteaptă I/O. E ideal pentru mii de conexiuni simultane, pentru că o corutină e mult mai ieftină decât un thread. Condiția e ca tot drumul să fie non-blocant: un singur apel sincron blochează tot loop-ul, iar la CPU-bound nu ajută deloc. Dacă bibliotecile pe care le folosesc sunt sincrone și concurența e mică, un thread pool e mai simplu și mai sigur." },
    { id: "o-gil-3", q: "Ce înseamnă că „GIL-ul nu face codul tău thread-safe”? Dă un exemplu.", k: [
      "GIL-ul protejează interpretorul, nu invariantele aplicației",
      "`x += 1` = citire, adunare, scriere → se poate intercala între threaduri",
      "Check-then-act (if key not in d: d[key] = …) e race condition",
      "Soluții: Lock, Queue, operații atomice, fără stare partajată"],
      model: "GIL-ul protejează structurile interne ale interpretorului, nu invariantele aplicației mele. `counter += 1` înseamnă mai mulți pași de bytecode — citire, adunare, scriere — iar între ei se poate schimba threadul, deci se pierd update-uri. La fel se întâmplă cu tiparele de tip check-then-act. Așa că protejez starea partajată cu un Lock sau, mai bine, evit starea partajată și trimit munca printr-o coadă." }
  ]);

  O("runtime", [
    { id: "o-rt-1", q: "De ce primești o eroare de tip în Python abia când rulezi linia respectivă?", k: [
      "Sursă → bytecode → executat de VM-ul CPython (nu C++)",
      "Tipul aparține obiectului; operațiile se rezolvă la runtime",
      "Nu există verificare de tipuri la compilare",
      "Contrast: C++/Rust/Go verifică tipurile înainte de rulare",
      "Mitigare: type hints + mypy/pyright în CI, plus teste"],
      model: "Python compilează sursa în bytecode, pe care îl execută mașina virtuală CPython; nu există compilare în cod mașină înainte de rulare și nici verificare de tipuri în pasul ăsta. Variabilele sunt nume legate de obiecte, iar tipul aparține obiectului, așa că o operație ca `+` se rezolvă abia când rulează linia. În Go sau Rust, compilatorul respinge programul înainte să ruleze. În practică compensez cu type hints verificate de mypy sau pyright în CI și cu teste." },
    { id: "o-rt-2", q: "Ce se întâmplă, pas cu pas, când rulezi `python app.py`?", k: [
      "Parsare → AST → compilare în bytecode",
      "Bytecode-ul rulează în bucla de evaluare a interpretorului",
      "Importuri: caută în sys.path, execută modulul o dată, cache în sys.modules și .pyc",
      "Codul de la nivelul modulului rulează la import → `if __name__ == \"__main__\"`",
      "Memorie: reference counting + GC pentru cicluri"],
      model: "Interpretorul parsează sursa într-un AST, o compilează în bytecode și o rulează în bucla de evaluare. Fiecare import caută în `sys.path`, execută modulul o singură dată, îl pune în `sys.modules` și scrie un `.pyc`, ca rulările următoare să sară peste compilare. Codul de la nivelul modulului rulează la import, de aceea punctul de intrare stă sub `if __name__ == \"__main__\"`. Memoria e gestionată prin reference counting, plus un garbage collector generațional pentru cicluri." }
  ]);

  O("asgi", [
    { id: "o-asgi-1", q: "De ce pui Gunicorn în fața Uvicorn în producție?", k: [
      "WSGI sync vs ASGI async: interfețe, nu servere",
      "Uvicorn = server ASGI; un proces = un event loop = un core",
      "Gunicorn = process manager pre-fork: N workeri, restart, timeout, reload grațios",
      "Combinat: `gunicorn -k UvicornWorker -w N`",
      "Alternativ: `uvicorn --workers` sau un proces per container + replici"],
      model: "Uvicorn e un server ASGI: rulează un event loop într-un proces, deci singur folosește un core. Gunicorn e un process manager matur, cu model pre-fork: pornește N procese worker, le repornește dacă pică sau se blochează și face reload grațios. Cu Gunicorn și clasa de worker Uvicorn le am pe amândouă: managementul proceselor de la Gunicorn și event loop-ul async de la Uvicorn în fiecare worker. În containere pot la fel de bine să rulez un proces Uvicorn per container și să las Kubernetes sau ECS să gestioneze replicile." },
    { id: "o-asgi-2", q: "Când declari un endpoint FastAPI cu `def` și când cu `async def`?", k: [
      "`def` → rulează în threadpool, nu blochează loop-ul",
      "`async def` → rulează direct pe event loop",
      "Biblioteci sincrone (requests, psycopg2, Session sincron) → `def`",
      "Totul async (httpx, asyncpg, AsyncSession) → `async def` cu await",
      "Niciodată cod blocant în `async def`; CPU greu → proces sau worker"],
      model: "FastAPI rulează endpointurile declarate cu `def` într-un thread pool, iar pe cele cu `async def` direct pe event loop. Deci, dacă folosesc biblioteci sincrone, ca requests sau o sesiune SQLAlchemy sincronă, declar endpointul cu `def`. Dacă tot drumul e async — httpx, asyncpg, SQLAlchemy async — folosesc `async def` și pun await peste tot. Ce nu fac niciodată e cod blocant într-un `async def`, pentru că blochează toate request-urile acelui worker." }
  ]);

  O("index", [
    { id: "o-idx-1", q: "Query-ul `WHERE email = ?` e lent pe 5M de rânduri. Ce faci?", k: [
      "Măsor: EXPLAIN (ANALYZE, BUFFERS) → Seq Scan?",
      "Index B-tree pe email (UNIQUE dacă e unic): O(log n) în loc de full scan",
      "În producție: CREATE INDEX CONCURRENTLY",
      "Verific să nu fie funcție pe coloană (lower) → index pe expresie",
      "Cost: scrieri mai lente, spațiu; re-verific planul după"],
      model: "Întâi măsor cu EXPLAIN ANALYZE, ca să confirm că e un sequential scan pe cinci milioane de rânduri. Apoi pun un index B-tree pe email — unic, fiindcă email-urile ar trebui să fie unice — care transformă scanarea completă într-o căutare logaritmică. În producție îl creez cu CONCURRENTLY, ca să nu blochez scrierile. Verific și că query-ul nu aplică o funcție pe coloană, cum e `lower`, pentru că atunci îmi trebuie un index pe expresie. La final rulez din nou EXPLAIN și confirm index scan-ul, ținând cont că fiecare index costă la scriere." },
    { id: "o-idx-2", q: "Cum alegi ordinea coloanelor într-un index compus?", k: [
      "Ordinea contează: B-tree sortat după prima coloană, apoi a doua",
      "Egalitățile primele, intervalul sau sortarea la final",
      "Pornești de la query-urile reale (WHERE + ORDER BY)",
      "Exemplu: (tenant_id, created_at) pentru „evenimentele unui tenant pe interval”",
      "Verifici cu EXPLAIN; nu dublezi indexuri acoperite de prefix"],
      model: "Ordinea contează pentru că un B-tree e sortat după prima coloană, apoi după a doua și așa mai departe. Pun întâi coloanele cu egalitate, iar coloana de interval sau de sortare la final — de exemplu `tenant_id`, apoi `created_at`, pentru „evenimentele unui tenant într-un interval, cele mai noi primele”. Indexul ăsta servește și query-urile doar pe `tenant_id`, dar în general nu pe cele doar pe `created_at`. Pornesc de la query-urile reale și confirm cu EXPLAIN." }
  ]);

  O("python", [
    { id: "o-py-1", q: "Ce e un generator și de ce contează într-un pipeline de procesare de date?", k: [
      "Funcție cu yield: produce valori leneș, păstrând starea între pași",
      "Memorie constantă, indiferent de volumul datelor",
      "Compui etape (parse → filtrare → îmbogățire → loturi) fără liste intermediare",
      "Se consumă o singură dată; erorile apar abia la consum",
      "Exemplu: fișier de log uriaș sau cursor server-side din DB"],
      model: "Un generator e o funcție care produce valori leneș, cu `yield`, și își păstrează starea între iterații, deci dă câte un element, fără să construiască o listă întreagă. Într-un pipeline de date asta înseamnă memorie constantă, indiferent de volum: pot trece un fișier de log uriaș sau un cursor server-side din DB prin etape — parsare, filtrare, îmbogățire, loturi — fiecare fiind un generator care îl alimentează pe următorul. Compromisurile: se consumă o singură dată, iar erorile apar abia când e cerut elementul." },
    { id: "o-py-2", q: "Descrie un decorator `retry` cu backoff exponențial. Ce elemente are?", k: [
      "Decorator cu parametri: trei niveluri (factory → decorator → wrapper)",
      "functools.wraps",
      "Prinde doar excepțiile tranzitorii date ca parametru",
      "Backoff exponențial + jitter, plafon, număr maxim de încercări, re-raise la final",
      "Pentru async: aceeași logică cu await asyncio.sleep"],
      model: "E o fabrică de decoratori: `retry` primește excepțiile, numărul maxim de încercări și pauza de bază și întoarce un decorator, care împachetează funcția cu `functools.wraps`. Wrapper-ul apelează funcția într-o buclă, prinde doar excepțiile tranzitorii primite ca parametru și așteaptă un timp aleator, până la pauza de bază înmulțită cu 2 la puterea încercării, cu un plafon. După ultima încercare re-ridică excepția originală, nu o înghite. Pentru corutine scriu aceeași logică cu `await asyncio.sleep`." }
  ]);

  O("sqlalchemy", [
    { id: "o-sqa-1", q: "Explică `Session` în SQLAlchemy: unit of work, identity map, ciclu de viață.", k: [
      "Unit of work: urmărește obiectele noi, modificate, șterse și le trimite la flush",
      "Flush (SQL în tranzacție) vs commit (permanent); autoflush înainte de query",
      "Identity map: un obiect per PK per sesiune",
      "Scope: per request sau per task, nu e thread-safe; engine + pool globale",
      "Capcane: lazy loading → N+1, atribute expirate după commit"],
      model: "Session e unit of work-ul din SQLAlchemy: urmărește obiectele pe care le adaug, le modific sau le șterg, iar la flush trimite INSERT-urile, UPDATE-urile și DELETE-urile corespunzătoare în tranzacția curentă; commit face flush și apoi COMMIT. Ține și un identity map, așa că în aceeași sesiune fiecare rând corespunde unui singur obiect Python. Sesiunile sunt ieftine și nu sunt thread-safe, deci folosesc una per request sau per task Celery, iar engine-ul, cu pool-ul de conexiuni, e partajat. Capcanele obișnuite sunt lazy loading-ul, care produce N+1, și atributele expirate accesate după închiderea sesiunii." },
    { id: "o-sqa-2", q: "Cum detectezi și repari N+1 în SQLAlchemy?", k: [
      "Cauza: relații lazy accesate într-o buclă → 1 + N query-uri",
      "Detectare: echo=True/log SQL, APM (același query repetat), raiseload în teste",
      "Colecții → selectinload; many-to-one → joinedload",
      "Dacă vrei doar un count: query agregat explicit",
      "Test care numără query-urile (eveniment before_cursor_execute)"],
      model: "N+1 apare când încarc o listă de părinți și apoi ating o relație lazy pe fiecare: un query plus câte unul per rând. Îl văd în logurile SQL sau în trace-ul din APM, unde același query se repetă, și pot face testele să pice pe el cu `raiseload`. Fix-ul e eager loading ales per relație: `selectinload` pentru colecții, care face un singur query în plus, cu IN, și `joinedload` pentru many-to-one. Dacă îmi trebuie doar numărători, scriu un query de agregare în loc să încarc obiecte." },
    { id: "o-sqa-3", q: "Cum rulezi migrațiile Alembic în producție fără downtime?", k: [
      "Pas separat în pipeline, nu la pornirea fiecărei replici",
      "Review la autogenerate (o redenumire apare ca drop + add)",
      "Expand/contract: pași compatibili cu codul vechi și cu cel nou",
      "Indexuri CONCURRENTLY; lock_timeout ca să nu blochezi traficul",
      "Backfill în loturi; plan de rollback sau roll-forward"],
      model: "Rulez migrațiile ca pas separat în pipeline-ul de deploy, nu la pornirea fiecărei replici, și verific mereu scripturile autogenerate: o redenumire de coloană apare ca drop plus add. Pentru zero downtime folosesc expand/contract: adaug coloanele sau tabelele noi compatibil cu codul vechi, fac deploy la cod care scrie în ambele, fac backfill în loturi, mut citirile și abia la final șterg structura veche. Indexurile pe tabele mari le creez cu CONCURRENTLY și setez un `lock_timeout`, ca o migrație să nu poată bloca traficul." }
  ]);

  O("postgres", [
    { id: "o-pg-1", q: "Explică MVCC și de ce există VACUUM.", k: [
      "UPDATE/DELETE nu suprascriu pe loc: creează versiuni noi, le marchează pe cele vechi",
      "Fiecare tranzacție vede un snapshot → cititorii nu blochează scriitorii",
      "Versiunile moarte ocupă spațiu → VACUUM (autovacuum) le recuperează",
      "Tranzacțiile lungi blochează curățarea → bloat",
      "Tabele cu multe update-uri: tuning autovacuum, monitorizezi dead tuples"],
      model: "PostgreSQL folosește MVCC: un UPDATE nu suprascrie rândul pe loc, ci scrie o versiune nouă, iar fiecare tranzacție vede un snapshot consistent. De aceea cititorii nu blochează scriitorii. Prețul sunt versiunile moarte, pe care le recuperează VACUUM — de obicei autovacuum — care ține la zi și visibility map-ul pentru index-only scans. O sesiune lungă sau rămasă „idle in transaction” împiedică curățarea și duce la bloat, așa că țin tranzacțiile scurte și urmăresc dead tuples pe tabelele cu multe update-uri." },
    { id: "o-pg-2", q: "Două request-uri scad simultan din același sold. Ce poate merge prost și cum previi?", k: [
      "Lost update în READ COMMITTED, la read-modify-write în aplicație",
      "Update atomic în SQL: SET balance = balance - x WHERE balance >= x",
      "Pesimist: SELECT ... FOR UPDATE",
      "Optimist: coloană de versiune + retry la conflict",
      "SERIALIZABLE + retry la erorile de serializare"],
      model: "Dacă ambele request-uri citesc soldul, scad în Python și scriu înapoi, un update se pierde în READ COMMITTED. Cel mai simplu fix e operația atomică în SQL — `UPDATE accounts SET balance = balance - 100 WHERE id = 1 AND balance >= 100` — și verific câte rânduri au fost afectate. Dacă am nevoie de mai multă logică, blochez rândul cu SELECT ... FOR UPDATE sau folosesc locking optimist, cu o coloană de versiune și retry la conflict. Merge și SERIALIZABLE, dar atunci aplicația trebuie să reîncerce la erorile de serializare." }
  ]);

  O("celery", [
    { id: "o-cel-1", q: "De ce nu rulezi task-ul direct în request-ul HTTP?", k: [
      "Request-ul trebuie să fie rapid; munca lungă ține un worker web și riscă timeout",
      "Brokerul păstrează munca: nu se pierde dacă procesul web moare",
      "Retry cu backoff, rate limit, scalare independentă a workerilor",
      "Răspuns 202 + status prin polling sau notificare",
      "Exemplul tău: task periodic cu Beat care citește statusul locațiilor din Redis"],
      model: "Pentru că drumul request-ului trebuie să fie rapid și previzibil. Un job de două minute ar ține ocupat un worker web, ar risca timeout-ul din proxy sau din Gunicorn și s-ar pierde dacă procesul repornește. În schimb, request-ul publică un mesaj în broker și răspunde 202, cu un job id; workerii Celery îl consumă, cu retry și backoff pentru erorile tranzitorii, iar workerii se scalează independent de partea web. Clientul verifică un endpoint de status sau primește o notificare." },
    { id: "o-cel-2", q: "Cum faci un task Celery sigur la retry și re-livrare?", k: [
      "Livrarea e at-least-once → task-ul poate rula de două ori",
      "Idempotență: cheie unică, upsert, ON CONFLICT DO NOTHING",
      "Verifici starea înainte de efect (deja procesat?)",
      "Efecte externe: cheie de deduplicare (de ex. SET NX în Redis)",
      "acks_late + prefetch 1 pentru task-uri lungi; retry doar pe erori tranzitorii, cu backoff și jitter; DLQ după limită"],
      model: "Pornesc de la ideea că livrarea e at-least-once, deci fiecare task trebuie să fie idempotent. Trimit ID-uri, nu obiecte, și fac efectul sigur la repetare: un upsert sau `INSERT ... ON CONFLICT DO NOTHING` pe o cheie naturală sau pe o cheie de idempotență, ori o verificare de stare de tipul „sari peste dacă e deja procesat”. Pentru efecte externe păstrez o cheie de deduplicare, de exemplu cu `SET NX` în Redis. Apoi activez `acks_late`, ca task-ul unui worker căzut să fie re-livrat, reîncerc doar erorile tranzitorii, cu backoff exponențial și jitter, și limitez retry-urile, ca mesajele otrăvite să ajungă într-o coadă dead-letter, nu într-o buclă." },
    { id: "o-cel-3", q: "RabbitMQ vs Redis ca broker pentru Celery?", k: [
      "RabbitMQ: broker dedicat, ack per mesaj, routing prin exchanges, DLX, quorum queues",
      "Redis: simplu, rapid, adesea deja în stack",
      "Redis: re-livrare prin visibility_timeout → duplicate la ETA lungi",
      "Durabilitatea Redis depinde de persistența configurată",
      "Volum mare / criticitate → RabbitMQ; Redis pentru cache și stare scurtă"],
      model: "RabbitMQ e un broker dedicat: confirmare per mesaj, cozi durabile și replicate (quorum queues), routing flexibil prin exchanges și dead-lettering, deci e varianta mai sigură când contează să nu pierzi sau să nu dublezi munca. Redis e mai simplu, rapid și adesea deja în stack, dar ca broker se bazează pe un visibility timeout pentru re-livrare, ceea ce produce duplicate la ETA-uri lungi, iar durabilitatea depinde de persistența configurată. Pentru un produs de securitate care procesează joburi de detecție aș folosi RabbitMQ pentru cozi și aș păstra Redis pentru cache și stare de scurtă durată." }
  ]);

  O("rabbitmq", [
    { id: "o-rmq-1", q: "Explică modelul RabbitMQ: exchanges, queues, bindings, acks.", k: [
      "Producătorul publică într-un exchange, nu direct în coadă",
      "Bindings + routing key decid cozile: direct, topic, fanout, headers",
      "Consumator: ack manual după procesare → at-least-once; prefetch pentru backpressure",
      "Durabilitate: quorum queues + mesaje persistente + publisher confirms",
      "DLX pentru mesaje respinse sau otrăvite; consumatori idempotenți"],
      model: "Producătorii publică într-un exchange, cu o cheie de routing, iar bindings decid ce cozi primesc o copie: direct potrivește cheia exact, topic acceptă wildcard-uri, fanout trimite în toate cozile legate. Consumatorii primesc mesaje până la limita de prefetch și confirmă după procesare, deci, dacă un consumator moare, mesajele lui neconfirmate sunt re-livrate: asta e at-least-once, așa că consumatorii trebuie să fie idempotenți. Pentru durabilitate folosesc quorum queues, mesaje persistente și publisher confirms, plus un dead letter exchange pentru mesajele care tot eșuează." }
  ]);

  O("redis", [
    { id: "o-rd-1", q: "Cum ai folosi Redis într-un sistem de detecție în timp real?", k: [
      "Ferestre glisante per entitate (eșecuri de login per user în 5 min): INCR cu TTL sau sorted set",
      "Deduplicare de alerte: SET NX cu expirare pe (regulă, host)",
      "Cache pentru date de referință (configurarea regulilor, metadate despre sisteme)",
      "Rate limiting, lock-uri distribuite",
      "Nu e sursă de adevăr: ce se pierde trebuie să fie reconstruibil"],
      model: "Aș folosi Redis pentru starea rapidă și de scurtă durată de care are nevoie logica de detecție: contoare pe ferestre glisante per user sau per host — de exemplu login-urile eșuate din ultimele cinci minute — cu INCR și TTL sau cu un sorted set de timestamp-uri; deduplicarea alertelor cu `SET NX` și expirare, ca aceeași regulă pe același host să nu alerteze de două ori; și cache pentru date de referință, cum e configurarea regulilor. Nu ar fi sursa de adevăr: alertele și evenimentele stau în PostgreSQL, deci dacă pierd Redis, sistemul e doar temporar degradat." }
  ]);

  O("pytest", [
    { id: "o-pt-1", q: "Cum testezi cod care apelează un API extern sau sistemul SAP al unui client?", k: [
      "Izolezi integrarea într-un client/adaptor cu interfață clară, injectat",
      "Unit: fake sau mock cu autospec, patch unde e folosit",
      "Căile de eroare: timeout, autentificare eșuată, răspuns invalid (side_effect)",
      "Clientul însuși: răspunsuri HTTP înregistrate sau mock-uite",
      "Câteva teste end-to-end pe un sandbox real, în CI"],
      model: "Izolez integrarea într-o clasă-client mică, cu o interfață clară, și o injectez, ca logica de business să nu vorbească niciodată direct cu rețeaua. Testele unitare folosesc un fake sau un mock cu autospec pentru acel client, inclusiv cu `side_effect` pentru timeout, autentificare eșuată și răspunsuri invalide, ca să acopăr căile de retry și de eroare. Clientul în sine îl testez pe răspunsuri HTTP înregistrate sau mock-uite, iar câteva teste end-to-end rulează în CI pe un sistem sandbox real." },
    { id: "o-pt-2", q: "Fixtures: ce sunt, ce scope-uri au, cum izolezi testele cu DB?", k: [
      "Setup/teardown reutilizabil, injectat după nume; teardown după yield",
      "Scope: function (implicit), class, module, package, session",
      "Scope mare pentru resurse scumpe (container, engine), mic pentru stare",
      "Izolare DB: tranzacție per test + rollback",
      "conftest.py pentru partajare; factory_boy pentru date"],
      model: "Un fixture e setup și teardown reutilizabil, pe care pytest îl injectează după numele argumentului; cu `yield`, tot ce vine după e teardown și rulează chiar dacă testul pică. Scope-ul decide durata de viață: resursele scumpe, ca un container Postgres sau engine-ul, au scope `session`, iar orice ține stare are scope `function`. Pentru testele cu baza de date deschid o tranzacție per test și fac rollback la final, ca testele să rămână izolate și rapide, iar fixture-urile comune stau în `conftest.py`." }
  ]);

  O("security", [
    { id: "o-sec-1", q: "Ce măsuri de securitate aplici într-un serviciu Python de backend?", k: [
      "Input: validare (Pydantic), query-uri parametrizate, fără shell/eval/pickle pe date nesigure",
      "AuthN/AuthZ: OIDC cu JWT verificat corect; autorizare per obiect (tenant)",
      "Secrete în secret manager; least privilege (DB, IAM); containere non-root",
      "Supply chain: dependențe fixate și scanate în CI",
      "Loguri fără date sensibile; audit; TLS peste tot"],
      model: "Validez fiecare input la intrare cu Pydantic, folosesc doar query-uri parametrizate și nu trimit niciodată date nesigure în comenzi de shell, `eval` sau `pickle`. Autentificarea trece prin OIDC, cu JWT-uri verificate corect, iar autorizarea o verific per obiect, nu doar per endpoint, mai ales când am mai mulți tenanți. Secretele stau într-un secret manager, serviciile rulează cu least privilege în baza de date și în IAM, iar containerele rulează ca non-root. În CI scanez dependențele, imaginile și commit-urile după secrete, iar logurile nu conțin niciodată credențiale sau token-uri." },
    { id: "o-sec-2", q: "Explică OAuth2/OIDC și rolul Keycloak, pe experiența ta.", k: [
      "Keycloak = identity provider: realms, clients, roluri, useri",
      "OAuth2 = autorizare (access token pentru API); OIDC = identitate (ID token)",
      "Frontend: Authorization Code + PKCE; între servicii: Client Credentials",
      "Backend-ul verifică JWT: semnătura prin JWKS, exp/iss/aud, apoi rolurile",
      "Token-uri scurte + refresh token"],
      model: "Keycloak e identity provider-ul nostru: gestionează realms, clients, useri și roluri și vorbește OAuth2 și OpenID Connect. Frontend-ul React folosește authorization code flow cu PKCE și primește un access token pentru API și un ID token cu identitatea userului; apelurile între servicii folosesc client credentials. Backend-ul Django nu are încredere oarbă în token: verifică semnătura cu cheile publice ale Keycloak, din endpoint-ul JWKS, verifică expirarea, emitentul și audiența, apoi mapează rolurile la permisiuni." }
  ]);

  O("design", [
    { id: "o-des-1", q: "Design: sistem de detecție în timp real pentru logurile SAP ale clienților.", k: [
      "Cerințe: evenimente/s, latența detecției, multi-tenant, fără pierderi, integrare SIEM",
      "Ingestie: colectori → API stateless → RabbitMQ durabil; brut în S3 pentru replay",
      "Procesare: normalizare → module de detecție testate; stare de fereastră în Redis; routing după sistem pentru ordine",
      "Stocare: alerte în Postgres partiționat, idempotent; căutare în Elasticsearch; API GraphQL pentru UI",
      "Fiabilitate: at-least-once + idempotență, DLQ, backpressure, autoscaling pe coadă, lag și latență end-to-end, izolare tenant"],
      model: "Întâi clarific volumul, latența acceptată pentru detecție și izolarea între tenanți. Apoi: colectori la client trimit loturi prin TLS către un API de ingestie stateless, care le validează, le publică în cozi RabbitMQ durabile și arhivează evenimentele brute în S3, pentru replay. Pool-uri de workeri normalizează evenimentele și rulează modulele de detecție — reguli ca unități plug-in, testate individual — țin starea ferestrelor glisante în Redis și rutează după `system_id`, ca evenimentele unui sistem să fie procesate în ordine. Alertele sunt deduplicate și scrise idempotent în PostgreSQL partiționat, apoi trimise în SIEM-ul clientului și în UI, printr-un API GraphQL. Pentru fiabilitate: livrare at-least-once cu consumatori idempotenți, cozi dead-letter, backpressure, autoscaling după lungimea cozii și dashboard-uri pentru lag și latența end-to-end a detecției." },
    { id: "o-des-2", q: "Cum te asiguri că nu pierzi și nu dublezi evenimente între API, broker și DB?", k: [
      "Publicare sigură: publisher confirms sau outbox",
      "Cozi durabile + mesaje persistente; ack manual după commit în DB",
      "Consumatori idempotenți: cheie unică (event_id) + ON CONFLICT DO NOTHING",
      "Retry cu backoff; DLQ pentru mesajele otrăvite",
      "Monitorizezi lag-ul și DLQ-ul; reconciliere periodică"],
      model: "La producător fac publicarea sigură cu publisher confirms sau cu un transactional outbox, când evenimentul trebuie să corespundă unei schimbări în baza de date. Cozile sunt durabile, cu mesaje persistente, iar consumatorii confirmă abia după commit-ul în DB, ceea ce dă livrare at-least-once. Duplicatele le neutralizez cu consumatori idempotenți, pe cheia `event_id`, cu `INSERT ... ON CONFLICT DO NOTHING`. Mesajele care tot eșuează ajung într-o coadă dead-letter, cu alertă, iar eu urmăresc lag-ul consumatorilor și dimensiunea DLQ-ului." }
  ]);

  O("dbmodels", [
    { id: "o-dbm-1", q: "Aplicația are useri, facturi și un motor de căutare pe loguri. Ce stochezi unde?", k: [
      "Postgres = sursa de adevăr: useri, facturi (ACID, FK, tranzacții)",
      "Elasticsearch: full-text și agregări pe loguri, ca replică reconstruibilă",
      "Sincronizare prin coadă/outbox/CDC; Elastic e eventual consistent",
      "S3 pentru loguri brute, Redis pentru cache",
      "Formularea corectă: Postgres scalează bine; alegi după modelul de acces"],
      model: "Userii și facturile merg în PostgreSQL: au nevoie de tranzacții, chei străine și consistență puternică, iar Postgres ține fără probleme sute de milioane de rânduri cu indexurile potrivite. Logurile merg în Elasticsearch, pentru că acolo e vorba de căutare full-text și agregări pe date mari, append-only, exact ce face un index inversat. Elastic e eventual consistent și nu are tranzacții multi-document, deci e un store derivat, nu sursa de adevăr: l-aș alimenta printr-o coadă sau printr-un outbox și aș păstra logurile brute în S3, ca să pot reconstrui oricând indexul." },
    { id: "o-dbm-2", q: "Când ai alege NoSQL în loc de Postgres?", k: [
      "Nu pentru volum în sine: Postgres scalează cu indexuri, partiționare, replici",
      "Scalare orizontală masivă a scrierilor (sharding), multi-regiune",
      "Acces simplu după cheie la latență foarte mică (Redis, DynamoDB)",
      "Full-text și analytics (Elasticsearch), grafuri (Neo4j)",
      "Prețul: fără JOIN-uri și tranzacții între entități; modelezi după query-uri"],
      model: "Nu din cauza numărului de rânduri: Postgres duce tabele foarte mari cu indexuri, partiționare și replici de citire. Aș alege un store NoSQL când modelul de acces i se potrivește mai bine: căutări după cheie la latență foarte mică, un volum de scrieri care cere sharding orizontal, căutare full-text sau traversări de grafuri. Prețul e că de obicei renunți la JOIN-uri și la tranzacții între entități și modelezi datele după query-uri, așa că vreau un motiv concret înainte să-l plătesc." }
  ]);

  O("docker", [
    { id: "o-dk-1", q: "Cum arată un Dockerfile bun pentru un serviciu Python de producție?", k: [
      "Imagine de bază slim, cu versiune fixată",
      "Multi-stage: build de wheels → stage final minimal",
      "Dependențe înainte de cod (cache de layere), .dockerignore",
      "User non-root, fără secrete în imagine",
      "CMD în exec form (semnale), healthcheck, configurare din env"],
      model: "Pornesc de la o imagine Python slim, cu versiune fixată, și folosesc multi-stage build: primul stage are uneltele de build și construiește wheels, stage-ul final copiază doar pachetele instalate și aplicația. Copiez fișierele de dependențe înaintea sursei, ca layer-ul cu dependențe să rămână în cache, țin un `.dockerignore`, rulez ca user non-root și nu pun niciodată secrete în imagine. CMD-ul e în exec form, ca serverul să fie PID 1 și să primească SIGTERM pentru oprire grațioasă, iar configurarea vine din variabile de mediu, la runtime." }
  ]);

  O("domain", [
    { id: "o-dom-1", q: "Ce știi despre Onapsis și Defend? Unde ar intra munca ta?", k: [
      "Onapsis: securitate pentru aplicații business-critical (SAP, Oracle); Research Labs: peste 1.000 de zero-day",
      "Defend: monitorizare continuă și detecție pentru SAP (ABAP, Java, HANA, BTP), peste 2.600 de reguli de detecție",
      "Alerte trimise în SIEM-ul clientului; pre-patch protection",
      "Munca ta: servicii Python pentru ingestie, procesare, module de detecție, integrări",
      "Provocări: volum, latență, fals-pozitive, ordine per sistem, multi-tenant"],
      model: "Onapsis securizează aplicațiile business-critical pe care rulează companiile, în principal SAP și Oracle, iar Research Labs a descoperit și a ajutat la remedierea a peste o mie de vulnerabilități zero-day în zona asta. Defend e produsul de monitorizare continuă și detecție: urmărește sistemele SAP — ABAP, Java, HANA, BTP — pe mii de indicatori de amenințare, inclusiv pre-patch protection pentru vulnerabilități cunoscute, și trimite alerte curate în SIEM-ul clientului. Din ce înțeleg, aș lucra la serviciile Python din spatele lui: ingestia și procesarea evenimentelor la volum, module de detecție și integrări cu platformele clienților, unde greul stă în throughput, ordinea evenimentelor și ținerea fals-pozitivelor la un nivel scăzut." }
  ]);

  O("perf", [
    { id: "o-pf-1", q: "Cum optimizezi un pipeline Python de procesare a logurilor care nu mai ține pasul cu volumul?", k: [
      "Măsori: throughput per etapă, profilare (py-spy, cProfile), bottleneck CPU, I/O sau DB",
      "Câștiguri ieftine: structuri potrivite, regex precompilat, fără muncă repetată",
      "I/O: loturi (bulk insert, COPY), conexiuni refolosite",
      "CPU: procese sau mai mulți workeri, biblioteci native (orjson)",
      "Arhitectură: coadă limitată (backpressure), scalare orizontală, partiționare după cheie"],
      model: "Aș începe prin a măsura throughput-ul pe fiecare etapă și prin profilare cu py-spy, ca să văd dacă bottleneck-ul e CPU, I/O sau baza de date. Apoi câștigurile ieftine: structurile de date potrivite, regex-uri precompilate, fără muncă repetată. La I/O fac scrierile în loturi — bulk insert sau COPY — și refolosesc conexiunile. Dacă parsarea e CPU-bound, paralelizez pe procese sau pe mai mulți workeri Celery și folosesc biblioteci native, ca orjson. Arhitectural, pun cozi limitate între etape, pentru backpressure, și scalez orizontal consumatorii, partiționând după o cheie când ordinea contează." }
  ]);

  O("aws", [
    { id: "o-aws-1", q: "Cum ai deploya pe AWS un serviciu Python cu Postgres, Redis și workeri Celery?", k: [
      "Containere în ECS (Fargate) sau EKS: servicii separate pentru API și workeri",
      "RDS/Aurora Postgres Multi-AZ, ElastiCache, Amazon MQ (RabbitMQ) sau SQS",
      "VPC cu subnete private pentru date, ALB public în față",
      "IAM roles per task, secrete în Secrets Manager",
      "CloudWatch / New Relic; autoscaling pe CPU sau pe lungimea cozii"],
      model: "Aș containeriza API-ul și workerii ca servicii ECS separate, ideal pe Fargate, ca să scaleze independent: API-ul după CPU sau numărul de request-uri, workerii după lungimea cozii. Datele ar sta în RDS sau Aurora PostgreSQL cu Multi-AZ, Redis în ElastiCache, iar brokerul în Amazon MQ pentru RabbitMQ, toate în subnete private, cu un Application Load Balancer ca singur punct public de intrare. Fiecare serviciu are propriul IAM task role, cu least privilege, secretele vin din Secrets Manager, iar metricile și trace-urile merg în CloudWatch sau New Relic, cu alarme." }
  ]);

  O("graphql", [
    { id: "o-gql-1", q: "GraphQL vs REST: când alegi fiecare și ce probleme vin cu GraphQL?", k: [
      "GraphQL: schemă tipată, clientul cere exact ce vrea, agregare din mai multe surse",
      "REST: simplu, cache HTTP, bun pentru resurse și API-uri publice",
      "N+1 în resolvers → DataLoader",
      "Securitate: limită de adâncime și complexitate, autorizare per câmp, paginare",
      "Observabilitate: erori cu HTTP 200 în body, tracing per resolver"],
      model: "GraphQL se potrivește când un UI are nevoie de date variate și imbricate din mai multe surse: clientul cere exact câmpurile de care are nevoie, într-un singur drum, pe o schemă tipată. REST e mai simplu, merge bine cu cache-ul HTTP și e foarte bun pentru API-uri orientate pe resurse sau publice. GraphQL mută complexitatea pe server: resolverele pot produce N+1, pe care îl rezolv cu DataLoader; un singur endpoint cere limite de adâncime și de cost, paginare și autorizare per câmp; iar, fiindcă erorile vin cu HTTP 200, monitorizarea trebuie să se uite în corpul răspunsului." }
  ]);

  O("ops", [
    { id: "o-obs-1", q: "Latența unui endpoint a crescut brusc în producție. Cum investighezi?", k: [
      "Confirmi și delimitezi: p95/p99, rate, erori, de când, ce endpoint sau tenant",
      "Corelezi cu schimbări: deploy, migrație, trafic, dependențe",
      "APM/trace: unde e timpul – DB, apel extern, cod, coadă",
      "DB: query lent, N+1, lock-uri (pg_stat_statements, EXPLAIN); pool de conexiuni saturat",
      "Limitezi impactul (rollback, scalare), apoi fix + alertă sau test ca să nu revină"],
      model: "Întâi confirm amploarea pe dashboard-uri: ce endpoint, ce percentilă, de când și dacă s-au schimbat și erorile sau traficul. Apoi corelez cu schimbările recente: un deploy, o migrație, un vârf de trafic sau un incident la o dependență. În trace-urile din APM, de exemplu New Relic, văd unde se duce timpul: un query lent sau repetat, un apel extern, așteptări pe lock-uri sau un pool de conexiuni saturat. Dacă userii sunt afectați, întâi limitez impactul — rollback sau scalare — apoi repar cauza și adaug o alertă sau un test, ca să nu revină." }
  ]);

  O("linux", [
    { id: "o-lx-1", q: "Un serviciu din producție nu mai răspunde. Ce verifici pe mașina Linux, în ordine?", k: [
      "Procesul/containerul trăiește? `systemctl status`, `docker ps`, restart-uri, exit code (137 = OOM)",
      "Logurile recente: `journalctl -u … --since`, `docker logs --since 10m`",
      "Resurse: `top`, `free -m`, `df -h` (disc plin), descriptori (`lsof`)",
      "Rețea: ascultă pe port (`ss -tlnp`)? răspunde local (`curl localhost/health`)?",
      "Proces viu, dar blocat: `py-spy dump --pid` arată unde stă fiecare thread"],
      model: "Întâi verific dacă procesul trăiește și cum s-a oprit ultima dată: `systemctl status` sau `docker ps`, numărul de restart-uri, iar un exit code 137 ar indica OOM killer-ul. Apoi logurile recente. Apoi resursele: CPU și memorie cu `top` și `free`, discul cu `df` — un disc plin e un clasic — și descriptorii deschiși. Apoi rețeaua: ascultă pe port, răspunde un `curl` local pe endpoint-ul de health? Dacă procesul e pornit, dar blocat, `py-spy dump` îmi arată exact unde așteaptă fiecare thread." }
  ]);

  O("behav", [
    { id: "o-beh-1", q: "„Spune-mi câte ceva despre tine.” (90 de secunde)", k: [
      "Prezent: rolul, ce construiești, stack-ul (Django/DRF, Elasticsearch, Keycloak, Docker Swarm)",
      "2–3 realizări concrete (dashboard builder, integrarea Milestone, incidentul Swarm)",
      "Proiect propriu: Oaktimize (Django, Celery, Redis)",
      "Formare: master în AI, lucrarea despre tracking cu SAM2",
      "De ce Onapsis: backend Python la volum + securitate"],
      get model() { return P.extra.behav.pitch.text; } },
    { id: "o-beh-2", q: "„De ce Onapsis?”", k: [
      "Domeniul: sisteme de care depind companiile (SAP) → impact real",
      "Tipul de inginerie: servicii Python la volum, pipeline-uri, detecție",
      "Legătura cu experiența ta: platformă de procesare, Elasticsearch, securitate (Keycloak, analiza de injecție)",
      "Centrul din București în creștere: construiești, nu doar întreții",
      "Ce vrei să înveți: securitate SAP, detection engineering"],
      model: "Trei motive. Domeniul: Onapsis protejează sisteme fără de care companiile pur și simplu nu pot funcționa, deci munca are consecințe reale. Ingineria: servicii Python la volum mare, pipeline-uri de procesare și logică de detecție, exact partea de backend care îmi place cel mai mult și apropiată de ce am construit pe platforma noastră, cu Elasticsearch. Și momentul: un centru de inginerie în creștere la București, unde pot ajuta la construit, nu doar la întreținut, învățând securitate SAP și detection engineering de la oamenii care sunt referința în domeniu." },
    { id: "o-beh-3", q: "„Povestește-mi un incident de producție pe care l-ai gestionat.”", k: [
      "S: un manager Docker Swarm și-a schimbat IP-ul → quorum pierdut",
      "T: clusterul înapoi într-o stare gestionabilă, serviciile funcționale",
      "A: diagnostic, `--force-new-cluster` pe managerul sănătos, nodurile vechi eliminate, rețeaua overlay a Redis reparată",
      "R: cluster refăcut + ce ai schimbat după (completează cu detaliile reale)",
      "Ton: calm, pași concreți, lecția aplicată"],
      model: "Pe platforma de video analytics rulăm Docker Swarm, iar la un moment dat un nod manager și-a schimbat IP-ul, clusterul și-a pierdut quorum-ul și nu mai puteam gestiona serviciile. Am pus diagnosticul din lista de noduri și din loguri, am reinițializat clusterul de pe managerul sănătos cu `--force-new-cluster`, am eliminat nodurile vechi și le-am realăturat pe celelalte, apoi am verificat fiecare serviciu — și așa a ieșit la iveală o a doua problemă: serviciul Redis își pierduse atașarea la rețeaua overlay, pe care am reparat-o și pe ea. După aceea am [completează ce s-a schimbat: adrese stabile pentru manageri, un număr impar de manageri, un runbook scris]." },
    { id: "o-beh-4", q: "„Povestește-mi o situație în care ai găsit o problemă de securitate.”", k: [
      "S: query de supraveghere în Elasticsearch, construit din input",
      "T: evaluezi riscul de injecție",
      "A: ai urmărit mecanismul (dict-uri serializate, nu stringuri) → fără JSON injection prin match",
      "A: ai găsit riscurile reale: validarea UUID-ului camerei pe server, erori propagate către client",
      "R: remediere prioritizată după risc; lecția: judeci după mecanism"],
      model: "Aveam o căutare de supraveghere a vehiculelor care construia un query Elasticsearch din input de la utilizator, iar întrebarea era dacă poate fi injectat. În loc să presupun, am urmărit cum se construia query-ul: era alcătuit din dicționare Python serializate, niciodată prin concatenare de stringuri, deci o valoare nu putea ieși din clauza match. Analiza a scos însă la iveală două probleme reale: UUID-ul camerei nu era validat pe server, iar mesajele de eroare brute din Elasticsearch ajungeau la client. Pe acelea le-am prioritizat. Lecția pe care o păstrez: judeci după mecanism, ca efortul să meargă spre riscul real." },
    { id: "o-beh-5", q: "„Dă-mi un exemplu concret în care AI-ul te-a ajutat să livrezi mai repede. Ce ai verificat tu?”", k: [
      "Situația: aplicația de pregătire, construită cu Claude Code, cu termen scurt",
      "Cum ai lucrat: specificație întâi, TDD (test, apoi cod), task-uri mici, review pe fiecare diff",
      "Plasa de siguranță: validare pe date, teste Playwright, teste de unitate, soluții testate cu pytest",
      "Ce ai verificat manual: faptele (versiuni, valori implicite) pe surse primare, nu din model",
      "AI în produs: LLM API-uri cu JSON parsat strict, rezervă între furnizori, chei ținute local",
      "Lecția: AI-ul accelerează scrisul; calitatea vine din teste, review și surse"],
      model: "Cel mai concret exemplu e aplicația cu care m-am pregătit pentru interviul ăsta. Aveam puțin timp și un stack larg, așa că am construit-o cu Claude Code. Am lucrat cu specificații scrise întâi și cu TDD: întâi testul la interfață, apoi codul, în pași mici pe care îi citeam ca într-un code review. Plasa de siguranță a fost esențială: un validator pe date, treisprezece suite Playwright, teste de unitate și soluții de live coding testate cu pytest. Ce n-am lăsat pe seama modelului au fost faptele: versiuni, valori implicite, RFC-uri le-am verificat pe sursele primare și le-am notat separat. În aplicație am integrat și LLM API-uri, pentru verificarea răspunsurilor orale: modelul întoarce JSON, pe care îl parsez strict, cu rezervă între furnizori și cheile ținute doar local. Lecția mea: AI-ul îmi scurtează mult scrisul, dar calitatea vine din teste, review și verificarea surselor. Asta aș aduce și în echipă." }
  ]);

  O("frontend", [
    { id: "o-fe-1", q: "Context-ul tău provoacă re-render-uri în toată aplicația. Cum depanezi?", k: [
      "Măsori cu React DevTools Profiler: ce se re-randează și de ce",
      "Cauza tipică: `value` e un obiect nou la fiecare render",
      "Fix: useMemo pe value, useCallback pe funcții, contexte separate (state vs dispatch)",
      "Muți starea mai aproape de unde e folosită",
      "Stare globală frecventă: Zustand cu selectori; date de server: TanStack Query"],
      model: "Aș deschide React DevTools Profiler, ca să văd ce componente se re-randează și de ce. Cauza obișnuită e că provider-ul primește ca `value` un obiect nou la fiecare render, așa că se re-randează toți consumatorii. Aș memoiza valoarea și callback-urile, aș împărți contextul ca datele care se schimbă rar să fie separate de starea care se schimbă des și aș muta starea mai aproape de locul unde e folosită. Pentru stare globală cu update-uri dese aș folosi un store cu selectori, ca Zustand, iar pentru datele de pe server, TanStack Query." },
    { id: "o-fe-2", q: "De ce ai migra un proiect React mare de la JS la TS?", k: [
      "Tipare statică: erori la compilare, nu în producție",
      "Contracte clare frontend ↔ API (tipuri generate din OpenAPI sau GraphQL)",
      "Refactoring sigur, autocomplete, onboarding mai ușor",
      "Migrare incrementală (allowJs), strict activat treptat",
      "Tipurile dispar la runtime → validare la granițe"],
      model: "În primul rând pentru siguranță la scară: compilatorul prinde clase întregi de bug-uri — proprietăți undefined, argumente de formă greșită — înainte să ajungă în producție. Tipurile documentează și contractul dintre frontend și API, mai ales când sunt generate din schema OpenAPI sau GraphQL, și fac refactoring-ul și onboarding-ul mult mai ușoare. Aș migra incremental, cu `allowJs`, și aș strânge treptat modul strict, ținând minte că tipurile dispar la runtime, deci datele externe tot trebuie validate." },
    { id: "o-fe-3", q: "Construiești în React pagina de alerte: listă cu filtre, paginare și alerte noi în timp real. Cum o structurezi?", k: [
      "Starea de server separată de starea de UI: TanStack Query pentru date, `useState` sau URL pentru filtre",
      "Filtrele și pagina în query string: link-uri partajabile, back/forward merg",
      "Paginare cu cursor din API, `queryKey` care include filtrele, debounce la căutare",
      "Timp real: WebSocket sau SSE care invalidează sau actualizează cache-ul, cu cleanup la unmount",
      "Stări explicite: loading, error, empty, ok (union discriminat); liste lungi virtualizate",
      "Tipurile generate din OpenAPI-ul backendului; teste RTL + MSW pe filtre și stări"],
      model: "Separ starea de server de starea de UI. Datele vin prin TanStack Query, cu un `queryKey` care conține filtrele și cursorul, așa că am cache, retry și refetch fără cod scris de mână. Filtrele și pagina le țin în query string, ca un analist să poată trimite link-ul exact și ca butonul Back să meargă. La căutarea text pun debounce. Pentru alerte noi deschid un WebSocket sau SSE într-un effect cu cleanup, iar la fiecare eveniment actualizez cache-ul sau îl invalidez, în loc să țin o a doua copie a listei. Componenta de listă primește o stare discriminată: loading, error, empty sau ok, ca să nu pot afișa date și eroare simultan. Dacă lista poate avea mii de rânduri, o virtualizez. Tipurile le generez din OpenAPI-ul FastAPI. Testez cu React Testing Library și MSW: schimb un filtru și verific cererea și rândurile afișate, plus stările de eroare și listă goală." },
    { id: "o-fe-4", q: "Cum ai testa o pagină React care listează alertele din API, cu filtrare și paginare?", k: [
      "Teste de componentă cu React Testing Library: ce vede și ce face userul (`getByRole`, `user-event`)",
      "Rețeaua mock-uită cu MSW, nu funcții interne mock-uite",
      "Cazuri: loading, eroare, listă goală, filtru aplicat, pagina următoare",
      "`findBy` pentru ce apare după fetch, `queryBy` pentru ce trebuie să lipsească",
      "Câteva teste E2E Playwright doar pe fluxul critic, cu aserții care reîncearcă",
      "Contractul cu backendul: tipuri generate din OpenAPI sau contract tests"],
      model: "Pun majoritatea testelor la nivel de componentă, cu React Testing Library: randez pagina, schimb filtrul cu `user-event` și verific ce vede userul, prin query-uri după rol. Rețeaua o simulez cu MSW, la nivel de request, deci testul nu depinde de cum e scris hook-ul intern. Acopăr stările: loading, eroare de la server, listă goală, filtru aplicat și trecerea la pagina următoare. Pentru ce apare după fetch folosesc `findBy`, iar pentru ce trebuie să lipsească, `queryBy`. Peste ele pun puține teste Playwright, doar pe fluxul critic, cu backend real sau de test și cu aserții care reîncearcă, fără `sleep`. Ca frontendul și backendul să nu se despartă, generez tipurile din OpenAPI-ul FastAPI și îl verific în CI." },
    { id: "o-fe-5", q: "Cum gestionezi autentificarea cu Keycloak într-un SPA React?", k: [
      "SPA-ul e client public: fără secret, Authorization Code + PKCE (S256)",
      "Tokenul ținut în memorie, nu în `localStorage`; refresh înainte de expirare (`updateToken`)",
      "API-ul validează JWT-ul: semnătura (JWKS), `iss`, `aud`, `exp`; rolurile se verifică pe server",
      "UI-ul ascunde butoane după roluri doar pentru UX, nu pentru securitate",
      "Pentru aplicații de business: BFF, cu tokenurile pe server și cookie `HttpOnly` (RFC 10017)",
      "Logout: închizi și sesiunea Keycloak, nu doar starea din React"],
      model: "SPA-ul e un client public, deci nu are secret. Folosesc Authorization Code cu PKCE, prin adaptorul JS Keycloak, cu `pkceMethod: \"S256\"`. Tokenul stă în memorie, nu în `localStorage`, unde l-ar putea citi orice XSS, și îl reîmprospătez cu `updateToken` înainte să expire. Pe fiecare request trimit access token-ul, iar API-ul validează semnătura prin JWKS, emitentul, audiența și expirarea, apoi verifică rolurile. În UI ascund butoanele după rol doar pentru experiență, nu ca protecție. Pentru o aplicație de securitate aș merge mai departe, cu un BFF: backendul face fluxul OAuth și ține tokenurile, iar browserul primește doar un cookie `HttpOnly`. Așa recomandă RFC 10017 pentru aplicații de business. Am integrat Keycloak în proiectele mele, deci știu și partea de configurare: clientul, redirect URI-urile exacte și maparea rolurilor." }
  ]);
})(window.PREP);
