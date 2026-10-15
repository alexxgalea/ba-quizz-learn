/* Core data: modules, cheat sheets, day plan, study pages. */
window.PREP = window.PREP || { modules: [], mcq: [], oral: [], sheets: {}, katas: [], diagrams: {}, plan: [], extra: {} };
(function (P) {
  const R = String.raw;

  // p: 1 = critic, 2 = important, 3 = util, 4 = bonus (în afara scorului)
  P.modules = [
    { id: "gil", code: "GIL", name: "Concurență: GIL, threads, procese, asyncio", short: "GIL & concurență", p: 1, src: "Lacună Lateral" },
    { id: "runtime", code: "RT", name: "Cum rulează Python", short: "Runtime Python", p: 1, src: "Lacună Lateral" },
    { id: "asgi", code: "ASGI", name: "WSGI/ASGI, Gunicorn, Uvicorn, FastAPI", short: "WSGI/ASGI", p: 1, src: "Lacună Lateral" },
    { id: "index", code: "IDX", name: "Indexuri în baze de date", short: "Indexuri", p: 1, src: "Lacună Lateral" },
    { id: "python", code: "PY", name: "Python de senior", short: "Python core", p: 1, src: "Onapsis" },
    { id: "sqlalchemy", code: "SQA", name: "SQLAlchemy 2.0 & Alembic", short: "SQLAlchemy", p: 1, src: "Onapsis" },
    { id: "postgres", code: "PG", name: "PostgreSQL în producție", short: "PostgreSQL", p: 1, src: "Onapsis" },
    { id: "celery", code: "CEL", name: "Celery", short: "Celery", p: 1, src: "Lateral + Onapsis" },
    { id: "rabbitmq", code: "RMQ", name: "RabbitMQ & mesagerie", short: "RabbitMQ", p: 2, src: "Onapsis" },
    { id: "redis", code: "RD", name: "Redis", short: "Redis", p: 2, src: "Onapsis" },
    { id: "pytest", code: "PT", name: "Pytest & testare", short: "Pytest", p: 2, src: "Onapsis" },
    { id: "security", code: "SEC", name: "Securitate în backend (AppSec)", short: "Securitate", p: 2, src: "Onapsis" },
    { id: "design", code: "DES", name: "System design & microservicii", short: "System design", p: 2, src: "Onapsis" },
    { id: "dbmodels", code: "DBM", name: "Relațional vs nerelațional", short: "SQL vs NoSQL", p: 2, src: "Lacună Lateral" },
    { id: "docker", code: "DK", name: "Docker & orchestrare", short: "Docker", p: 2, src: "Onapsis" },
    { id: "domain", code: "DOM", name: "Onapsis, SAP & detecție", short: "Domeniu Onapsis", p: 2, src: "Onapsis" },
    { id: "behav", code: "BEH", name: "Comportamental: pitch, motivație, povești", short: "Comportamental", p: 2, src: "Onapsis" },
    { id: "perf", code: "PF", name: "Performanță & pipeline-uri de date", short: "Performanță", p: 3, src: "Onapsis" },
    { id: "aws", code: "AWS", name: "AWS esențial", short: "AWS", p: 3, src: "Onapsis" },
    { id: "graphql", code: "GQL", name: "GraphQL", short: "GraphQL", p: 3, src: "Onapsis" },
    { id: "ops", code: "OBS", name: "Observabilitate & GitLab CI", short: "Observabilitate", p: 3, src: "Onapsis" },
    { id: "linux", code: "LX", name: "Linux pentru backend", short: "Linux", p: 3, src: "Onapsis" },
    { id: "django", code: "DJ", name: "Django ORM → SQLAlchemy", short: "Django ORM", p: 3, src: "Experiența ta" },
    { id: "frontend", code: "FE", name: "React & TypeScript", short: "React/TS", p: 4, src: "Bonus Lateral" }
  ];

  P.sheets = {
    gil: {
      lead: "GIL-ul limitează paralelismul bytecode-ului Python, nu concurența.",
      diagram: "gil",
      points: [
        "CPython: un singur thread execută bytecode Python la un moment dat. Threadurile nu paralelizează cod Python CPU-bound.",
        "GIL-ul e eliberat cât se așteaptă I/O (rețea, disc, DB) și de multe extensii native (NumPy, OpenCV, hashlib, zlib). Acolo threadurile chiar rulează în paralel.",
        "I/O-bound → `ThreadPoolExecutor` sau asyncio (mii de conexiuni). CPU-bound → `ProcessPoolExecutor` / multiprocessing sau cod nativ, vectorizat.",
        "Procesele au memorie separată: argumentele și rezultatele trec prin pickle (IPC). Task-urile foarte mici nu merită trimise la procese.",
        "asyncio: un thread, un event loop, concurență cooperativă. O corutină cedează controlul doar la `await`; cod blocant → `await asyncio.to_thread(...)`.",
        "Limitezi concurența cu `asyncio.Semaphore` sau cu N workeri pe o `asyncio.Queue`. `TaskGroup` (3.11+) anulează tot grupul la prima eroare.",
        "GIL-ul nu face codul tău thread-safe: `counter += 1` înseamnă citire, calcul, scriere și se poate intercala. Folosești `threading.Lock` sau eviți starea partajată.",
        "Build-ul free-threaded (fără GIL, PEP 703): experimental în 3.13, suportat oficial din 3.14, dar opțional. Build-ul implicit are încă GIL."
      ],
      avoid: ["„Python nu poate face nimic în paralel.”", "„Threadurile sunt inutile în Python.”", "„asyncio rulează corutinele pe mai multe core-uri.”"]
    },
    runtime: {
      lead: "Python se compilează în bytecode și e executat de mașina virtuală CPython; tipurile se verifică la runtime.",
      points: [
        "`python app.py`: sursă → AST → bytecode → bucla de evaluare a interpretorului (PVM). Modulele importate se cache-uiesc ca `.pyc` în `__pycache__`.",
        "Nu se traduce în C/C++. CPython e un interpretor scris în C care execută bytecode. Există un JIT experimental, oprit implicit.",
        "Tipare dinamică: tipul aparține obiectului, nu variabilei. `a + b` se rezolvă la execuție, deci `TypeError` apare abia când rulează linia.",
        "Tipare puternică: `\"1\" + 1` aruncă `TypeError` (în JavaScript ar da `\"11\"`).",
        "Type hints: ignorate de interpretor, verificate static de mypy/pyright, citite la runtime de Pydantic/FastAPI pentru validare.",
        "Compilat AOT (C++, Rust, Go): cod mașină înainte de rulare și tipuri verificate la compilare, deci erorile de tip nu ajung în producție.",
        "Memorie: reference counting (eliberare imediată când contorul ajunge la 0) plus GC generațional pentru cicluri.",
        "Un modul importat se execută o singură dată (cache în `sys.modules`). De aici `if __name__ == \"__main__\":`."
      ],
      avoid: ["„Python se transformă în C++ și apoi rulează.”", "„Python nu se compilează deloc.”"]
    },
    asgi: {
      lead: "Gunicorn gestionează procesele, Uvicorn rulează event loop-ul.",
      diagram: "asgi",
      points: [
        "WSGI (PEP 3333): interfață sincronă server ↔ aplicație (Django clasic, Flask). Un worker sync servește un request odată.",
        "ASGI: interfață async, suportă și WebSockets și streaming (FastAPI/Starlette, Django async). WSGI și ASGI sunt specificații, nu servere.",
        "Gunicorn: process manager pre-fork. Un master pornește N workeri, îi repornește la crash, îi omoară la `--timeout` (implicit 30 s), îi reciclează cu `--max-requests`.",
        "Uvicorn: server ASGI (uvloop + httptools). Un proces = un event loop = un core.",
        "Producție: `gunicorn app:app -k uvicorn.workers.UvicornWorker -w N` (în versiunile noi clasa stă în pachetul `uvicorn-worker`). Alternativ: `uvicorn --workers N` sau un proces per container și replici în K8s/ECS.",
        "Punct de plecare pentru workeri sync: 2 × core + 1. Apoi măsori sub încărcare.",
        "Nginx sau un load balancer în față: TLS, fișiere statice, buffering pentru clienții lenți.",
        "FastAPI: endpoint `def` → threadpool AnyIO (implicit, cel mult 40 de apeluri sincrone în paralel); `async def` → direct pe event loop. Cod blocant în `async def` blochează tot workerul.",
        "FastAPI = Starlette + Pydantic: validare din type hints (422 automat), `Depends` pentru injecție (cu `yield` pentru teardown), OpenAPI generat automat."
      ]
    },
    index: {
      lead: "Un index transformă un full scan într-un lookup logaritmic, plătit la scriere.",
      points: [
        "Index = structură auxiliară (în Postgres implicit B-tree): full scan O(n) → lookup O(log n).",
        "Cost: fiecare INSERT/UPDATE/DELETE actualizează indexurile; spațiu pe disc; întreținere.",
        "Pui indexuri pe coloanele din WHERE, JOIN și ORDER BY, cu selectivitate bună.",
        "Compus `(a, b)`: ajută la `a = ?`, la `a = ? AND b = ?` și la `ORDER BY a, b`; de regulă nu la `b = ?` singur (PG 18 are skip scan în unele cazuri). Egalitățile înaintea intervalelor.",
        "Selectivitate mică (boolean, status cu 3 valori): planner-ul alege oricum Seq Scan. Alternativ: index parțial `WHERE status = 'pending'`.",
        "Funcție pe coloană (`lower(email)`, `created_at::date`): indexul simplu nu ajută, îți trebuie index pe expresie.",
        "Tipuri: B-tree (egalitate, interval, sortare), GIN (JSONB, array, full-text, trigram), GiST (geo, ranges), BRIN (tabele uriașe ordonate fizic, ex. după timp), Hash (doar egalitate).",
        "`INCLUDE (col)` → covering index → index-only scan.",
        "În producție: `CREATE INDEX CONCURRENTLY` (nu blochează scrierile, nu rulează în tranzacție).",
        "Verifici cu `EXPLAIN (ANALYZE, BUFFERS)`: Seq Scan vs Index Scan, rânduri estimate vs reale.",
        "Elasticsearch: „index” = colecție de documente (≈ tabel); dedesubt e un index inversat (termen → documentele care îl conțin)."
      ],
      avoid: ["„Pun index pe toate coloanele, ca să fie rapid.”", "„Un index ajută mereu.”"]
    },
    python: {
      lead: "Întrebările de Python core verifică dacă știi ce face limbajul sub capotă.",
      points: [
        "Valorile implicite mutabile sunt evaluate o dată, la definirea funcției: `def f(x=None)` + `if x is None: x = []`.",
        "Late binding în closures: `[lambda: i for i in range(3)]` → toate returnează 2. Fix: `lambda i=i: i`.",
        "`is` = identitate, `==` = egalitate. Pentru singleton-uri: `is None`.",
        "Generatori: leneși, memorie constantă, se consumă o singură dată. Pipeline-urile de generatori procesează fișiere oricât de mari.",
        "Decoratori: primesc și returnează o funcție; `functools.wraps` păstrează metadatele; cei cu parametri au trei niveluri.",
        "Context managers: `with` garantează `__exit__` (cleanup) și la excepții; `contextlib.contextmanager` pentru varianta cu generator.",
        "Complexități: `in` pe list O(n), pe set/dict O(1) mediu; `list.pop(0)` O(n) → `collections.deque`.",
        "`dataclass` nu validează tipuri (Pydantic da). `frozen=True` → imutabil; `slots=True` → memorie mai mică.",
        "Excepții: prinzi specific; `raise X from e` păstrează cauza; `ExceptionGroup` și `except*` din 3.11.",
        "`itertools.groupby` grupează doar elementele consecutive: sortezi întâi sau folosești `defaultdict`."
      ]
    },
    sqlalchemy: {
      lead: "Session = unit of work + identity map. Majoritatea bug-urilor vin din scope-ul sesiunii și din lazy loading.",
      diagram: "sqlalchemy",
      points: [
        "Două straturi: Core (SQL Expression Language, `Table`, `select()`, `Connection`) și ORM (clase mapate, `Session`).",
        "Stil 2.0: `session.scalars(select(User).where(User.email == x)).all()`; modele cu `Mapped[int]` și `mapped_column()`.",
        "Engine = fabrică de conexiuni + pool (`pool_size`, `max_overflow`, `pool_pre_ping`, `pool_recycle`). Unul per aplicație.",
        "Session: urmărește obiectele noi, modificate, șterse; flush trimite SQL-ul în tranzacție (autoflush înainte de query); commit = flush + COMMIT.",
        "Identity map: în aceeași sesiune, un rând (după PK) = un singur obiect Python.",
        "Scope: o sesiune per request sau per task Celery. Nu e thread-safe; nu o faci globală.",
        "`expire_on_commit=True` (implicit): după commit atributele se reîncarcă la acces; după închidere → `DetachedInstanceError`.",
        "Lazy loading implicit → N+1. `selectinload` pentru colecții, `joinedload` pentru many-to-one, `raiseload` ca să prinzi N+1 în teste.",
        "Async: `create_async_engine` + `AsyncSession` (asyncpg). Lazy load implicit nu merge → eager loading explicit sau `awaitable_attrs`.",
        "Bulk/idempotent: `insert(...).on_conflict_do_nothing()` din `sqlalchemy.dialects.postgresql`; pentru volume mari, COPY.",
        "Bind parameters (`select().where(...)`, `text(\"... :id\")`) → protecție la SQL injection. Niciodată f-string în SQL.",
        "Alembic: `revision --autogenerate` produce un draft de verificat (o redenumire apare ca drop + add); `upgrade head` ca pas separat în deploy; migrații expand/contract pentru zero downtime."
      ]
    },
    postgres: {
      lead: "PostgreSQL: MVCC, izolare, lock-uri și tranzacții scurte.",
      points: [
        "MVCC: UPDATE scrie o versiune nouă a rândului; cititorii nu blochează scriitorii. VACUUM (autovacuum) curăță versiunile moarte.",
        "Izolare: READ COMMITTED implicit (fiecare statement vede ce era comis la începutul lui), REPEATABLE READ (snapshot per tranzacție), SERIALIZABLE (poate cere retry).",
        "Lost update la read-modify-write: `UPDATE ... SET x = x - 1` atomic, `SELECT ... FOR UPDATE`, versionare optimistă sau SERIALIZABLE + retry.",
        "`FOR UPDATE SKIP LOCKED` → coadă de joburi în Postgres, cu workeri care nu se calcă.",
        "Deadlock: Postgres anulează una dintre tranzacții. Retry + aceeași ordine a lock-urilor peste tot.",
        "Fiecare conexiune e un proces backend → PgBouncer (transaction pooling) când ai multe replici și workeri.",
        "Partiționare pe timp pentru evenimente: partition pruning la citire, retenție prin `DETACH PARTITION` și `DROP TABLE` pe partițiile vechi.",
        "Încărcări masive: COPY; altfel insert-uri în loturi. Commit per rând = un fsync per rând.",
        "Diagnostic: `pg_stat_statements` (top după timp total), `EXPLAIN (ANALYZE, BUFFERS)`, `auto_explain`.",
        "Plase de siguranță: `statement_timeout`, `lock_timeout`, `idle_in_transaction_session_timeout`.",
        "JSONB + GIN pentru câmpuri variabile; window functions (`ROW_NUMBER() OVER (PARTITION BY ...)`) pentru „ultimul per grup”."
      ]
    },
    celery: {
      lead: "Coadă distribuită de task-uri: producer → broker → workeri. Livrarea e at-least-once, deci task-urile trebuie să fie idempotente.",
      diagram: "celery",
      points: [
        "De ce nu în request: request-ul rămâne rapid, munca lungă nu ține ocupat un worker web, are retry și nu se pierde dacă procesul web moare. Răspunzi 202 + status.",
        "Retry: `autoretry_for=(...)`, `retry_backoff=True`, `retry_jitter=True`, `max_retries`; sau `self.retry(exc=..., countdown=...)` cu `bind=True`. Doar pentru erori tranzitorii.",
        "Implicit mesajul e confirmat la primire (crash = task pierdut). `acks_late=True` confirmă după execuție → re-livrare la crash → idempotență obligatorie.",
        "`worker_prefetch_multiplier=1` pentru task-uri lungi, ca mesajele să nu stea rezervate la un worker ocupat.",
        "Routing: cozi separate pentru task-uri rapide și grele (`task_routes`, `celery worker -Q heavy`).",
        "Canvas: chain (secvență), group (paralel), chord (group + callback, cere result backend).",
        "Beat = scheduler de task-uri periodice. Exact o instanță, altfel task-urile pornesc de mai multe ori.",
        "Pool-uri: prefork (implicit, procese, pentru CPU), threads/gevent/eventlet (pentru I/O).",
        "`soft_time_limit` aruncă o excepție în task (cleanup); `time_limit` omoară procesul.",
        "Cu Redis ca broker: un mesaj neconfirmat în `visibility_timeout` (implicit 1 h) e re-livrat. ETA/countdown lungi → duplicate.",
        "Serializer JSON, nu pickle. Trimiți ID-uri, nu obiecte ORM. Publici task-ul după commit (`transaction.on_commit` în Django).",
        "Cazul tău: task periodic cu Beat care citește statusul locațiilor din Redis. Spune-l concret: frecvență, ce se întâmplă la eșec, de ce e idempotent."
      ]
    },
    rabbitmq: {
      lead: "Producerul publică într-un exchange; bindings decid cozile; consumatorul confirmă după procesare.",
      diagram: "rabbitmq",
      points: [
        "AMQP 0-9-1: producer → exchange → (binding + routing key) → queue → consumer.",
        "Exchanges: direct (cheie exactă), topic (`*` = un cuvânt, `#` = zero sau mai multe), fanout (copie în toate cozile legate), headers.",
        "Ack manual după procesare = at-least-once. Auto-ack = at-most-once (crash = mesaj pierdut).",
        "Prefetch (`basic.qos`): câte mesaje neconfirmate are un consumator. Controlează distribuția și backpressure.",
        "Durabilitate: coadă durable (ideal quorum queue) + mesaje persistente + publisher confirms.",
        "Quorum queues (Raft) pentru replicare. Mirroring-ul clasic a fost eliminat în RabbitMQ 4.0.",
        "Dead letter exchange: mesajele respinse, expirate sau peste `delivery-limit` ajung într-o coadă separată pentru analiză.",
        "Ordinea e păstrată într-o coadă, dar cu mai mulți consumatori sau requeue procesarea poate ieși din ordine.",
        "RabbitMQ vs Kafka: broker cu routing flexibil, mesajul dispare după ack vs log persistent partiționat, cu replay după offset."
      ]
    },
    redis: {
      lead: "Redis: stare rapidă și efemeră. Nu e sursa de adevăr.",
      points: [
        "Execută comenzile pe un singur thread → fiecare comandă e atomică.",
        "Structuri: string (INCR, `SET NX PX`), hash, list, set, sorted set (ferestre glisante, clasamente), stream (consumer groups, ack), pub/sub.",
        "TTL pe chei; `maxmemory-policy` când se umple memoria (noeviction implicit, allkeys-lru pentru cache).",
        "Persistență: RDB (snapshot periodic) și/sau AOF (log de comenzi, fsync everysec).",
        "Pub/Sub e fire-and-forget. Streams păstrează mesajele, au consumer groups și ack.",
        "Cache-aside: citești din cache, la miss din DB, populezi cu TTL, invalidezi la scriere. Stampede → lock/single-flight și TTL cu jitter.",
        "Lock distribuit: `SET lock token NX PX 30000`; eliberezi doar dacă token-ul e al tău (Lua). Pentru corectitudine strictă: fencing tokens.",
        "Rate limiting: fixed window cu INCR + EXPIRE, sliding window cu sorted set, token bucket cu Lua.",
        "Fără `KEYS *` în producție (O(N), blochează) → SCAN.",
        "Valkey = fork open-source al Redis (Linux Foundation), oferit și de AWS ElastiCache."
      ]
    },
    pytest: {
      lead: "Teste rapide, deterministe, izolate. Testezi comportamentul, nu implementarea.",
      points: [
        "Teste = funcții `test_*` cu `assert` simplu (pytest rescrie aserțiile pentru mesaje detaliate).",
        "Fixtures: setup/teardown injectat după nume; codul de după `yield` e teardown. Scope: function (implicit), class, module, package, session.",
        "`conftest.py`: fixture-uri partajate pe director, fără import.",
        "`@pytest.mark.parametrize` → același test pe multe cazuri (ideal pentru reguli de detecție).",
        "`pytest.raises(Exc, match=...)`, `monkeypatch`, `tmp_path`, `caplog`.",
        "Mock: `patch(\"modulul.unde.e.folosit.nume\")`, `autospec=True`, `side_effect` pentru excepții sau valori succesive.",
        "DB: Postgres real în Docker (service în CI sau testcontainers), tranzacție + rollback per test, factory_boy pentru date.",
        "Celery: testezi funcția direct; `task_always_eager` doar pentru unit; worker real pentru integrare.",
        "Timp: freezegun/time-machine sau un clock injectat. Niciodată `sleep` ca sincronizare.",
        "Utile: `-x`, `-k`, `--lf`, markers (`-m \"not slow\"`), `pytest-xdist -n auto`, `pytest-cov`."
      ]
    },
    security: {
      lead: "La o firmă de securitate, reflexele de cod sigur sunt testate implicit în orice răspuns.",
      points: [
        "SQL injection: doar bind parameters; identificatorii dinamici (coloane, tabele) → whitelist.",
        "Deserializare: `pickle.loads` / `yaml.load` pe date nesigure = execuție de cod. JSON + validare (Pydantic).",
        "Comenzi de sistem: `subprocess.run([...])` cu listă, fără `shell=True` pe input.",
        "SSRF: URL-uri date de user → allowlist, blochezi IP-uri private și metadata (169.254.169.254), IMDSv2 pe AWS.",
        "Parole: Argon2id sau bcrypt (lente, cu salt). Niciodată SHA-256 simplu sau criptare reversibilă.",
        "JWT: verifici semnătura (JWKS), algoritmul din allowlist, `exp`, `iss`, `aud`. JWT e semnat, nu criptat.",
        "OAuth2 = autorizare delegată (access token); OIDC = identitate peste OAuth2 (ID token). Authorization Code + PKCE pentru frontend, Client Credentials între servicii.",
        "Autorizare la nivel de obiect (tenant), nu doar la endpoint. Broken Access Control e pe locul 1 în OWASP Top 10 (2021 și 2025).",
        "Secrete în secret manager, nu în cod, git sau imagini. Least privilege pentru DB, IAM, containere.",
        "`hmac.compare_digest` pentru token-uri; modulul `secrets`, nu `random`.",
        "Supply chain: dependențe fixate și scanate (pip-audit, scanare în GitLab CI). E categorie nouă în OWASP Top 10:2025."
      ]
    },
    design: {
      lead: "Cerințe → estimări → componente → aprofundare → eșecuri → trade-off-uri.",
      diagram: "design",
      points: [
        "Sync (HTTP/gRPC: simplu, cuplare temporală) vs async (cozi/evenimente: decuplare, reziliență, complexitate).",
        "Livrare: at-most-once, at-least-once (+ idempotență = „effectively once”). Exactly-once end-to-end e foarte greu.",
        "Transactional outbox: evenimentul se scrie în DB în aceeași tranzacție cu schimbarea; un relay îl publică. Fără dual write.",
        "Retry cu backoff exponențial + jitter, limită de încercări, DLQ. Circuit breaker și timeouts pentru dependențe.",
        "Idempotency key pentru POST-uri repetate de client.",
        "Scalare: servicii stateless + load balancer; workeri scalați după lungimea cozii; partiționare după cheie; replici de citire; cache.",
        "Backpressure: cozi limitate, prefetch, rate limit per tenant.",
        "Multi-tenant: `tenant_id` (+ row-level security) → schema per tenant → DB per tenant. Izolare vs cost.",
        "Observabilitate de la început: lag, vârsta celui mai vechi mesaj, latența end-to-end, rata de erori."
      ]
    },
    dbmodels: {
      lead: "Volumul singur nu e un motiv să pleci de pe relațional. Modelul de acces este.",
      points: [
        "Relațional (Postgres): ACID, tranzacții, JOIN-uri, constrângeri. Ține sute de milioane de rânduri cu indexuri, partiționare și replici.",
        "NoSQL: document (MongoDB), key-value (Redis, DynamoDB), wide-column (Cassandra), graf (Neo4j), căutare (Elasticsearch). Schemă flexibilă, scalare orizontală, acces după cheie.",
        "Prețul NoSQL: de obicei renunți la JOIN-uri și la tranzacții între entități; modelezi după query-uri.",
        "Elasticsearch: căutare full-text și agregări, near-real-time (refresh ~1 s), fără tranzacții multi-document → rar sursă de adevăr.",
        "Pattern: Postgres = sursa de adevăr; Elastic = replică pentru căutare (prin coadă/outbox/CDC); Redis = cache și stare efemeră; S3 = date brute.",
        "JSONB în Postgres: flexibilitate de document cu tranzacții și indexuri GIN.",
        "CAP: la o partiție de rețea alegi între consistență și disponibilitate. PACELC: fără partiție, între latență și consistență."
      ],
      avoid: ["„Bazele relaționale devin ineficiente la milioane de rânduri.”", "„NoSQL e mai rapid decât SQL.”"]
    },
    docker: {
      lead: "Imaginea e template-ul, containerul e procesul care rulează.",
      points: [
        "Imagine = layere read-only (câte unul per instrucțiune); container = instanță a imaginii + layer de scriere + proces izolat (namespaces, cgroups).",
        "Cache de layere: copiezi întâi `requirements.txt`/`pyproject.toml` și instalezi, apoi `COPY . .`.",
        "Multi-stage build: stage de build (compilatoare, wheels) + stage final minimal → imagine mică, suprafață de atac redusă.",
        "`.dockerignore` (venv, .git, secrete). User non-root. Fără secrete în ENV/ARG (rămân în istoric).",
        "Exec form (`CMD [\"gunicorn\", ...]`) ca procesul să fie PID 1 și să primească SIGTERM. Shell form pune `sh` ca PID 1.",
        "Healthcheck / probes (liveness, readiness). Volume pentru date persistente.",
        "Compose: serviciile se găsesc după nume; `depends_on` + `condition: service_healthy`.",
        "Swarm (simplu, integrat în Docker) vs Kubernetes (standardul industriei, ecosistem bogat). Pe AWS: ECS sau EKS.",
        "Imagini Python: `python:3.x-slim`; alpine (musl) poate rupe wheels și încetini build-ul."
      ]
    },
    domain: {
      lead: "Onapsis securizează aplicațiile pe care rulează companiile mari (SAP, Oracle), unde un SIEM generic nu înțelege contextul.",
      points: [
        "Onapsis: securitate pentru aplicații business-critical. Onapsis Research Labs a descoperit și ajutat la remedierea a peste 1.000 de vulnerabilități zero-day în aplicații de business.",
        "Zonele de produs pe care lucrează inginerii: Threat Detection & Response, Vulnerability Management, Compliance Automation.",
        "Defend = monitorizare continuă și detecție pentru SAP: un sistem de avertizare timpurie pentru schimbări neautorizate, abuz sau atacuri.",
        "Defend: peste 2.600 de reguli de detecție (după pagina produsului), inclusiv zero-day, pe ABAP, Java, HANA, SAProuter, plus cloud (RISE, BTP); scoruri de anomalie și analiză de comportament.",
        "Alertele SAP ajung în SIEM-ul clientului (SOC). „Pre-patch protection” = monitorizezi exploatarea unei vulnerabilități înainte să aplici patch-ul.",
        "Onapsis e singura platformă de securitate din programul SAP Endorsed Apps. Vulnerabilități celebre raportate de Onapsis: RECON (2020) și ICMAD (2022).",
        "SAP = ERP: finanțe, supply chain, HR. ABAP e limbajul SAP; S/4HANA e generația curentă.",
        "Vocabular SOC: SIEM, IoC, MITRE ATT&CK, false positive, alert fatigue, MTTD/MTTR.",
        "Inginerie: ingestie de loguri → normalizare → reguli → alerte → integrare SIEM; ordine per sistem, idempotență, multi-tenant, reguli testate pe loguri reale anonimizate."
      ]
    },
    behav: {
      lead: "Pitch, motivație și povești STAR: le spui cu voce tare până sună natural, nu recitat.",
      page: "behav",
      points: [
        "Pitch de 90 s: prezent → trecut → de ce rolul ăsta. Textul complet e în Studiu → Comportamental.",
        "STAR: Situație, Task, Acțiune (ce ai făcut tu, cu verbe la persoana I), Rezultat (cu un număr, dacă există).",
        "Poveștile tale cele mai potrivite pentru Onapsis: incidentul Swarm, analiza de injecție în Elasticsearch, dashboard builder-ul, integrarea Milestone.",
        "Pentru o tehnologie din stack pe care n-ai folosit-o: punte onestă către ce ai folosit și ce diferă.",
        "Încheie cu 2–3 întrebări pentru ei; arată că te interesează cum se construiește detecția."
      ]
    },
    perf: {
      lead: "Măsori întâi, optimizezi apoi locul măsurat.",
      points: [
        "Profilare: cProfile (+ snakeviz), py-spy (sampling, se atașează la un proces care rulează), line_profiler, tracemalloc pentru memorie.",
        "Întâi algoritmic: structuri potrivite, fără O(n²) ascuns.",
        "I/O: loturi (bulk insert, COPY), pipelining în Redis, conexiuni refolosite (pool, un singur client HTTP).",
        "CPU: vectorizare (NumPy, pandas, Polars), procese, biblioteci native (orjson), regex precompilat, cache.",
        "Memorie: generatori, procesare pe bucăți, streaming din DB (`yield_per`, server-side cursor).",
        "Backpressure: cozi limitate între etape, ca producătorul să nu copleșească consumatorul.",
        "Paralelizare cu procese: bucăți mari (`chunksize`), altfel overhead-ul de pickling domină.",
        "Legea lui Amdahl: partea serială limitează câștigul."
      ]
    },
    aws: {
      lead: "Destul cât să poți desena un deploy și să vorbești despre IAM corect.",
      points: [
        "Compute: EC2 (VM), ECS (containere; Fargate = fără servere de gestionat), EKS (Kubernetes gestionat), Lambda (max 15 minute).",
        "Storage: S3 (obiecte, lifecycle către clase reci), EBS (disc pentru EC2), EFS (NFS partajat).",
        "Baze de date: RDS/Aurora (Postgres gestionat, Multi-AZ, replici de citire), ElastiCache (Redis/Valkey), DynamoDB.",
        "Mesagerie: SQS (standard at-least-once; FIFO cu ordine și deduplicare), SNS (fan-out), EventBridge, Amazon MQ (RabbitMQ gestionat), MSK (Kafka).",
        "Rețea: VPC, subnete publice/private, Security Groups (stateful) vs NACL (stateless), ALB (L7) / NLB (L4).",
        "IAM: roluri cu least privilege; aplicațiile folosesc roluri (task role, instance profile), nu chei statice.",
        "CloudWatch (metrici, loguri, alarme) vs CloudTrail (audit al apelurilor API).",
        "Secrets Manager / SSM Parameter Store; KMS pentru chei."
      ]
    },
    graphql: {
      lead: "Clientul cere exact ce vrea; serverul plătește în complexitate.",
      points: [
        "Un endpoint, schemă tipată: queries (citire), mutations (scriere), subscriptions (flux).",
        "Fără over-fetching/under-fetching; un request poate agrega mai multe resurse.",
        "Resolvers per câmp → risc de N+1 → DataLoader (batching + cache per request).",
        "Python: Strawberry (code-first, type hints, integrare FastAPI), Graphene (mai vechi), Ariadne (schema-first).",
        "Erorile vin de obicei cu HTTP 200 în câmpul `errors` → monitorizare diferită de REST.",
        "Securitate: limită de adâncime și complexitate, timeouts, paginare obligatorie, autorizare per câmp/obiect, persisted queries, introspecție oprită în producție.",
        "Evoluție: adaugi câmpuri și marchezi `@deprecated`, fără /v2."
      ]
    },
    ops: {
      lead: "Metricile spun că e o problemă, trace-urile unde, logurile de ce.",
      points: [
        "Metrici (agregate în timp: Prometheus + Grafana), loguri (evenimente cu context, JSON), trace-uri (drumul unui request prin servicii: New Relic APM, OpenTelemetry).",
        "RED pentru servicii: Rate, Errors, Duration. USE pentru resurse: Utilization, Saturation, Errors. Pentru cozi: adâncime și vârsta celui mai vechi mesaj.",
        "Latență în percentile (p95/p99), nu medie.",
        "SLI (măsura) → SLO (ținta internă) → SLA (contractul). Error budget.",
        "Alerte pe simptome pe care le simte userul, acționabile, fără zgomot.",
        "Correlation ID propagat request → task Celery → loguri. Fără secrete în loguri.",
        "GitLab CI: `.gitlab-ci.yml`, stages, jobs, runners, `rules`, `needs` (DAG), `artifacts` vs `cache`, `services` (Postgres/Redis pentru teste), variabile protejate și mascate."
      ]
    },
    linux: {
      lead: "Fișa postului cere explicit lucru în medii Linux.",
      points: [
        "Semnale: SIGTERM (15, oprire grațioasă, poate fi tratat) vs SIGKILL (9, imediat, nu poate fi prins); SIGINT = Ctrl+C; SIGHUP = reload, la mulți daemoni.",
        "Exit code 137 = 128 + 9 → SIGKILL, adesea OOM killer (limita de memorie a containerului).",
        "Procese și resurse: `ps aux`, `top`/`htop`, `free -m`, `df -h`, `du -sh *`.",
        "Rețea: `ss -tlnp` (cine ascultă pe ce port), `curl -v`, `dig`, `nc -zv host port`.",
        "Fișiere deschise: `lsof -p PID`, `lsof -i :8000`; „Too many open files” → leak de descriptori sau `ulimit -n` mic.",
        "Loguri: `tail -f`, `journalctl -u serviciu -f`, `grep -E/-i/-v/-r`, `awk '{print $1}' | sort | uniq -c | sort -rn | head`.",
        "Permisiuni: `chmod 640` = owner rw, grup r, alții nimic.",
        "Containerele sunt procese Linux izolate cu namespaces și limitate cu cgroups."
      ]
    },
    django: {
      lead: "Ce știi din Django se mapează aproape 1:1 pe SQLAlchemy.",
      points: [
        "N+1: `select_related` (JOIN, pentru FK/OneToOne) ≈ `joinedload`; `prefetch_related` (query separat cu IN) ≈ `selectinload`.",
        "`transaction.atomic()` ≈ `with session.begin():`; `transaction.on_commit(...)` → publici task-uri după commit.",
        "`F()` pentru update atomic în SQL; `Q()` pentru condiții compuse; `select_for_update()` ≈ `with_for_update()`.",
        "Indexuri în `Meta.indexes`, `UniqueConstraint`; migrații `makemigrations/migrate` ≈ Alembic.",
        "Conceptual: Django = Active Record (`obj.save()`); SQLAlchemy = Data Mapper + Unit of Work (Session), plus Core pentru SQL."
      ]
    },
    frontend: {
      lead: "Bonus: React/TS nu sunt în stack-ul Onapsis. Le reiei doar dacă rămâne timp.",
      points: [
        "TS: tipare statică, erori la compilare, contracte cu API-ul, refactoring sigur; dispare la runtime → validezi datele externe.",
        "Props (de la părinte, read-only) vs state (local; setState re-randează componenta și copiii).",
        "Context: la schimbarea valorii se re-randează toți consumatorii → memoizezi valoarea, împarți contextul.",
        "`key` stabil în liste (nu indexul când lista se reordonează); `useEffect` cu dependențe complete și cleanup.",
        "TanStack Query: `staleTime` (cât timp datele sunt proaspete) vs `gcTime` (cât stau în cache nefolosite)."
      ]
    }
  };

  // ---------- plan ----------
  // go: { t: "diag" | "smart" | "mock" | "mistakes" | "mcq" (m) | "sheet" (m) | "oral" (ms | due) | "kata" (id) | "study" (tab) }
  P.plan = [
    {
      id: "d1", date: "2026-10-14", day: "Miercuri", label: "14 oct", when: "seara · ~2 h",
      focus: "Calibrare și prima lacună de la Lateral: concurența și runtime-ul Python.",
      tasks: [
        { id: "d1a", min: 20, text: "Test diagnostic ghidat (30 de grile, cu context): baza din fiecare modul, apoi un pas mai departe. Nu ghici, apasă „Nu știu încă”.", go: { t: "diag" } },
        { id: "d1b", min: 25, text: "Fișa + diagrama „GIL & concurență”, apoi grilele modulului.", go: { t: "sheet", m: "gil" } },
        { id: "d1c", min: 15, text: "Fișa + grilele „Runtime Python”.", go: { t: "sheet", m: "runtime" } },
        { id: "d1d", min: 15, text: "Oral, cu voce tare și cronometru de 90 s: CPU vs I/O, erori de tip la runtime.", go: { t: "oral", ms: ["gil", "runtime"] } },
        { id: "d1e", min: 20, text: "Kata 8: fetch async cu limită de concurență.", go: { t: "kata", id: "k8" } },
        { id: "d1f", min: 10, text: "Repetă greșelile de azi.", go: { t: "mistakes" } }
      ]
    },
    {
      id: "d2", date: "2026-10-15", day: "Joi", label: "15 oct", when: "seara · ~2,5 h",
      focus: "Restul lacunelor P1: servere web Python, indexuri, PostgreSQL.",
      tasks: [
        { id: "d2a", min: 10, text: "Încălzire: cardurile orale din cutiile 1–2.", go: { t: "oral", due: true } },
        { id: "d2b", min: 25, text: "Fișa + diagrama „WSGI/ASGI” și grilele.", go: { t: "sheet", m: "asgi" } },
        { id: "d2c", min: 25, text: "Fișa + grilele „Indexuri”.", go: { t: "sheet", m: "index" } },
        { id: "d2d", min: 35, text: "Fișa + grilele „PostgreSQL”.", go: { t: "sheet", m: "postgres" } },
        { id: "d2e", min: 20, text: "Oral: Gunicorn + Uvicorn, WHERE email lent, sold concurent, MVCC.", go: { t: "oral", ms: ["asgi", "index", "postgres"] } },
        {
          id: "d2f", min: 20, text: "Opțional, practic: 1M de rânduri în Postgres, EXPLAIN ANALYZE înainte și după index.",
          code: R`docker run -d --name pg -e POSTGRES_PASSWORD=x postgres:17
docker exec -it pg psql -U postgres
CREATE TABLE users AS
  SELECT g AS id, 'u' || g || '@ex.com' AS email
  FROM generate_series(1, 1000000) g;
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'u777@ex.com';
CREATE INDEX CONCURRENTLY users_email_idx ON users (email);
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'u777@ex.com';`
        },
        { id: "d2g", min: 10, text: "Repetă greșelile.", go: { t: "mistakes" } }
      ]
    },
    {
      id: "d3", date: "2026-10-16", day: "Vineri", label: "16 oct", when: "seara · ~2,5 h",
      focus: "Inima stack-ului Onapsis: Python core, SQLAlchemy, Celery.",
      tasks: [
        { id: "d3a", min: 15, text: "Mix inteligent (15 grile, cântărite pe punctele slabe).", go: { t: "smart" } },
        { id: "d3b", min: 25, text: "Fișa + grilele „Python de senior”.", go: { t: "sheet", m: "python" } },
        { id: "d3c", min: 35, text: "Fișa + diagrama „SQLAlchemy” și grilele.", go: { t: "sheet", m: "sqlalchemy" } },
        { id: "d3d", min: 10, text: "Grilele „Django ORM → SQLAlchemy” (puntea din experiența ta).", go: { t: "mcq", m: "django" } },
        { id: "d3e", min: 30, text: "Fișa + diagrama „Celery” și grilele.", go: { t: "sheet", m: "celery" } },
        { id: "d3f", min: 20, text: "Oral: Session, N+1, task idempotent, de ce nu în request.", go: { t: "oral", ms: ["sqlalchemy", "celery", "python"] } },
        { id: "d3g", min: 20, text: "Kata 3: decorator retry cu backoff și jitter.", go: { t: "kata", id: "k3" } }
      ]
    },
    {
      id: "d4", date: "2026-10-17", day: "Sâmbătă", label: "17 oct", when: "~5–6 h, în trei blocuri",
      focus: "Restul stack-ului, securitate și live coding.",
      tasks: [
        { id: "d4a", min: 25, text: "Bloc 1 · Fișa + diagrama „RabbitMQ” și grilele.", go: { t: "sheet", m: "rabbitmq" } },
        { id: "d4b", min: 25, text: "Bloc 1 · Fișa + grilele „Redis”.", go: { t: "sheet", m: "redis" } },
        { id: "d4c", min: 30, text: "Bloc 1 · Fișa + grilele „Pytest”.", go: { t: "sheet", m: "pytest" } },
        { id: "d4d", min: 20, text: "Bloc 1 · Oral: RabbitMQ vs Redis, Redis în detecție, testarea unui API extern, fixtures.", go: { t: "oral", ms: ["rabbitmq", "redis", "pytest"] } },
        { id: "d4e", min: 30, text: "Bloc 2 · Fișa + grilele „Securitate”.", go: { t: "sheet", m: "security" } },
        { id: "d4f", min: 20, text: "Bloc 2 · Fișa + grilele „Docker”.", go: { t: "sheet", m: "docker" } },
        { id: "d4f2", min: 15, text: "Bloc 2 · Fișa + grilele „Linux” (fișa postului cere lucru în medii Linux).", go: { t: "sheet", m: "linux" } },
        { id: "d4g", min: 15, text: "Bloc 2 · „SQL vs NoSQL”: exersează formulările precise.", go: { t: "sheet", m: "dbmodels" } },
        { id: "d4h", min: 20, text: "Bloc 2 · Oral: securitate, Keycloak, Dockerfile, ce stochezi unde.", go: { t: "oral", ms: ["security", "docker", "dbmodels", "linux"] } },
        { id: "d4i", min: 25, text: "Bloc 3 · Kata 1: detecție brute force (fereastră glisantă).", go: { t: "kata", id: "k1" } },
        { id: "d4j", min: 20, text: "Bloc 3 · Kata 4: LRU cache.", go: { t: "kata", id: "k4" } },
        { id: "d4k", min: 20, text: "Bloc 3 · Kata 6 și 9: top IP-uri, intervale.", go: { t: "kata", id: "k6" } },
        { id: "d4l", min: 15, text: "Repetă greșelile zilei.", go: { t: "mistakes" } }
      ]
    },
    {
      id: "d5", date: "2026-10-18", day: "Duminică", label: "18 oct", when: "~5 h",
      focus: "Integrare: system design, domeniul Onapsis, povești, simulare.",
      tasks: [
        { id: "d5a", min: 15, text: "Fișa + grilele „AWS”.", go: { t: "sheet", m: "aws" } },
        { id: "d5b", min: 15, text: "Fișa + grilele „GraphQL”.", go: { t: "sheet", m: "graphql" } },
        { id: "d5c", min: 15, text: "Fișa + grilele „Observabilitate & GitLab CI”.", go: { t: "sheet", m: "ops" } },
        { id: "d5d", min: 45, text: "System design: parcurge pagina, desenează pipeline-ul pe hârtie și explică-l cu voce tare în 10 minute.", go: { t: "study", tab: "design" } },
        { id: "d5e", min: 25, text: "Grilele „System design” și „Performanță”.", go: { t: "mcq", ms: ["design", "perf"] } },
        { id: "d5f", min: 20, text: "Fișa + grilele „Domeniu Onapsis”.", go: { t: "sheet", m: "domain" } },
        { id: "d5g", min: 30, text: "Comportamental: citește pitch-ul și poveștile STAR, adaptează-le cu detaliile tale reale.", go: { t: "study", tab: "behav" } },
        { id: "d5g2", min: 15, text: "Cardurile orale „Comportamental”, cu voce tare. Înregistrează-te pe telefon și ascultă.", go: { t: "oral", ms: ["behav", "domain"] } },
        { id: "d5h", min: 30, text: "Simulare de interviu: 25 de grile în 25 de minute, fără feedback până la final.", go: { t: "mock" } },
        { id: "d5i", min: 25, text: "Repetă greșelile + cardurile orale slabe.", go: { t: "mistakes" } },
        { id: "d5j", min: 20, text: "Kata 5: token bucket (sau kata 2: deduplicare de alerte).", go: { t: "kata", id: "k5" } },
        { id: "d5k", min: 15, text: "Bonus, doar dacă pregătirea trece de 80%: React/TS.", go: { t: "sheet", m: "frontend" } },
        { id: "d5l", min: 5, text: "Pregătește logistica pentru luni și culcă-te devreme.", go: { t: "study", tab: "tactics" } }
      ]
    },
    {
      id: "d6", date: "2026-10-19", day: "Luni", label: "19 oct", when: "dimineața · 30–40 min",
      focus: "Încălzire. Nimic nou.",
      tasks: [
        { id: "d6a", min: 15, text: "Cardurile orale din cutiile 1–2.", go: { t: "oral", due: true } },
        { id: "d6b", min: 10, text: "Recitește fișele P1, mai ales „De evitat”.", go: { t: "study", tab: "sheets" } },
        { id: "d6c", min: 10, text: "Pitch-ul și întrebările pentru ei, cu voce tare.", go: { t: "study", tab: "behav" } },
        { id: "d6d", min: 5, text: "Logistică: link sau adresă, laptop încărcat, editor deschis, apă, hârtie și pix.", go: { t: "study", tab: "tactics" } }
      ]
    }
  ];

  // ---------- study pages ----------
  P.extra.tactics = [
    {
      h: "Cum răspunzi în 3–4 propoziții",
      list: [
        "Definiția, într-o propoziție.",
        "Mecanismul: cum funcționează, de ce.",
        "Trade-off-ul: când nu e potrivit, ce alternativă alegi.",
        "Un exemplu din experiența ta, cu un detaliu concret."
      ],
      note: "Exemplu pentru GIL: un singur thread execută bytecode → GIL-ul se eliberează la I/O și în cod nativ → pentru CPU în Python pur folosesc procese → „la platforma video, apelurile OpenCV eliberează GIL-ul, așa că un thread pool scalează”."
    },
    {
      h: "Formulări de evitat → formulări precise",
      pairs: [
        ["„Relaționalul e ineficient la milioane de rânduri.”", "„Postgres ține sute de milioane de rânduri cu indexuri potrivite; aleg altceva pentru un model de acces anume.”"],
        ["„Mereu” / „niciodată”", "„Depinde de X; în cazul nostru am ales Y pentru că Z.”"],
        ["„Python nu face paralelism.”", "„Bytecode-ul nu rulează în paralel în build-ul cu GIL; I/O și codul nativ, da.”"],
        ["„N-am lucrat cu RabbitMQ.” (și te oprești)", "„Am folosit Redis ca broker pentru Celery; ack, retry și idempotența le-am aplicat așa: …; în RabbitMQ diferă …”"],
        ["„Exactly-once”", "„At-least-once plus consumatori idempotenți.”"]
      ]
    },
    {
      h: "Când nu știi",
      list: [
        "Spui ce știi sigur și unde se termină.",
        "Raționezi cu voce tare din principii (I/O vs CPU, consistență vs disponibilitate).",
        "Spui cum ai verifica: EXPLAIN, documentația, un test mic, un profiler.",
        "Legi de ceva ce ai făcut. Un „nu știu, dar aș verifica așa” bate o invenție."
      ]
    },
    {
      h: "Live coding: protocol",
      list: [
        "Repeți problema; clarifici input, output, volum, cazuri limită (gol, duplicate, ordine, date invalide).",
        "Spui soluția simplă și complexitatea ei înainte să scrii.",
        "Scrii cod curat: nume clare, funcții mici, gândești cu voce tare.",
        "Treci manual prin 1–2 exemple și un caz limită; propui un test.",
        "Discuți optimizări și follow-up: memorie, concurență, mai multe mașini."
      ]
    },
    {
      h: "System design: protocol (35–45 min)",
      list: [
        "Cerințe funcționale și non-funcționale (5 min). Întrebi de volum, latență, multi-tenant.",
        "Estimări rapide: evenimente pe secundă, octeți pe zi, retenție.",
        "API și modelul de date.",
        "Arhitectura la nivel înalt (desen).",
        "Aprofundezi 1–2 componente alese de intervievator.",
        "Eșecuri, scalare, observabilitate, securitate.",
        "Trade-off-uri spuse explicit."
      ]
    },
    {
      h: "Luni dimineață",
      list: [
        "Somnul bate tocitul de duminică noaptea.",
        "Link-ul de Google Meet sau adresa (One Cotroceni Park), verificate.",
        "Laptop încărcat, cameră și microfon testate, notificările oprite.",
        "Editor și Python local pregătite pentru live coding.",
        "Hârtie și pix pentru diagrame. Apă.",
        "Pitch-ul și 3 întrebări pentru ei, scrise pe o foaie."
      ]
    }
  ];

  P.extra.behav = {
    pitch: {
      h: "Pitch: „Spune-mi câte ceva despre tine” (~90 s)",
      note: "Prezent → trecut → de ce rolul ăsta. Adaptează-l cu vocea ta și verifică statusul lucrării înainte de luni.",
      text: "Sunt full-stack engineer, cu peste trei ani de experiență, și lucrez la un institut de tehnologii avansate pe sisteme de producție, nu pe prototipuri de cercetare. Proiectul meu principal e o platformă de video analytics: backend în Django REST Framework, Elasticsearch pentru căutare și agregări, Keycloak pentru controlul accesului pe roluri, frontend în React, totul pe Docker Swarm. Am dus de la cap la coadă mai multe bucăți: un dashboard builder care transformă configurații salvate în agregări Elasticsearch, integrarea cu identity provider-ul unui sistem extern de management video și readucerea clusterului Swarm după ce își pierduse quorum-ul. Pe cont propriu am construit o platformă de management pentru studiouri de sport, cu Django, Celery și Redis. Am un master în inteligență artificială și o lucrare, ca unic autor, despre tracking cu SAM2. La Onapsis mă atrage combinația dintre backend Python la volum mare și securitate: să construiesc detecție pentru sisteme fără de care companiile nu pot funcționa."
    },
    map: [
      ["Python, Django/DRF", "Platforma video analytics, în producție"],
      ["PostgreSQL, JSON în DB", "Dashboard builder: configurații JSON în Postgres"],
      ["FastAPI, SQLAlchemy, Alembic", "Backend-ul FastAPI din proiectul HI-Jack-Takeaway"],
      ["Celery, Redis", "Oaktimize (Django/Celery/Redis), pipeline-ul de alerte"],
      ["Docker", "Docker Swarm în producție (incidentul de quorum)"],
      ["Securitate", "Keycloak RBAC, analiza de injecție în query-urile Elasticsearch"],
      ["RabbitMQ, AWS, GraphQL, New Relic", "Puncte de legătură: concepte transferabile, spuse onest"]
    ],
    stories: [
      {
        h: "Incident de producție: Swarm fără quorum",
        s: "Un nod manager Docker Swarm și-a schimbat IP-ul, iar clusterul a pierdut quorum-ul.",
        t: "Să readuci clusterul la o stare gestionabilă cu serviciile funcționale.",
        a: "`docker swarm init --force-new-cluster` pe managerul sănătos, eliminarea nodurilor vechi, verificarea serviciilor; ai rezolvat și rețeaua overlay a serviciului Redis (rețele `null`, conectare doar pe bridge).",
        r: "Cluster refăcut. Completează: cât a durat, ce impact a avut, ce ai schimbat după (IP-uri stabile pentru manageri, număr impar de manageri, runbook)."
      },
      {
        h: "Securitate: risc de injecție în Elasticsearch",
        s: "Un query de supraveghere a vehiculelor era construit din input de la utilizator.",
        t: "Să evaluezi dacă poate fi injectat.",
        a: "Ai verificat construcția: dict-uri Python serializate, nu stringuri concatenate, deci fără JSON injection prin `match`. Ai prioritizat riscurile reale: validarea server-side a UUID-ului camerei și mesajele de eroare propagate către client.",
        r: "Remediere concentrată pe ce conta. Arată gândire de securitate pe bază de mecanism, nu de panică."
      },
      {
        h: "Design extensibil: dashboard builder",
        s: "Utilizatorii voiau dashboard-uri configurabile, gen Kibana.",
        t: "Să proiectezi modelul de date și pipeline-ul de randare.",
        a: "Schemă JSON în Postgres: `dashboard_types` ca template-uri care generează formularul din frontend, `dashboards.value` cu `axes`, `params`, `datasource`. La randare, intenția din `datasource` devine agregări Elasticsearch `_async_search`.",
        r: "Dashboard-uri noi fără cod nou. Paralela cu Onapsis: module de detecție configurabile peste un pipeline comun."
      },
      {
        h: "Integrare cu o platformă enterprise: Milestone",
        s: "Platforma avea nevoie de URI-urile de conectare ale camerelor din Milestone VMS.",
        t: "Să integrezi fără să cuplezi tot backend-ul de Milestone.",
        a: "Endpoint DRF separat care se autentifică la Milestone IDP și citește `connectionUri` pentru hardware.",
        r: "Paralela cu rolul: fișa postului cere integrare profundă cu platforme enterprise critice pentru business."
      },
      {
        h: "Fiabilitate Celery: audit pe pipeline-ul de alerte (Oaktimize)",
        s: "Proiectul tău Django/Celery/Redis.",
        t: "Audit tehnic complet înainte de publicare.",
        a: "Ai găsit două bug-uri blocante: o cheie de status nepotrivită în `get_or_create` și retry-uri Celery care nu făceau nimic. Ai planificat remedierea în pași mici.",
        r: "Lecția pe care o spui: retry-urile și idempotența se testează explicit, nu se presupun."
      }
    ],
    extra: [
      {
        h: "Dacă te întreabă de doctorat",
        a: "Spune scurt și concret: e part-time, cum îți organizezi timpul (din ce faci deja acum), ce câștigă jobul (rigoare, computer vision), și că rolul are prioritate în program. Nu intra în detalii pe care nu le-a cerut."
      },
      {
        h: "„De ce pleci de la jobul actual?”",
        a: "Pozitiv și orientat spre ce cauți: produs la scară, domeniul securității, o echipă care crește. Fără critici la angajatorul actual."
      },
      {
        h: "„O tehnologie din stack pe care n-ai folosit-o?”",
        a: "Onest și legat: „N-am folosit X în producție; am folosit Y pentru aceeași problemă; diferențele cheie sunt …; aș începe prin …”."
      }
    ],
    questions: [
      "Cum arată drumul unei detecții noi, de la descoperirea din cercetare până la rularea la un client?",
      "Defend rulează mai ales în mediul clientului, în cloud-ul vostru sau hibrid? Cum influențează asta deploy-ul și testarea?",
      "Ce volume de evenimente procesați azi și unde sunt acum bottleneck-urile?",
      "Cum e împărțită munca între București și celelalte centre de inginerie?",
      "Cum folosiți Grafana și New Relic în fiecare zi? Există o rotație de on-call?",
      "Cât de aproape lucrează inginerii cu Onapsis Research Labs?",
      "Cum ar arăta succesul în rolul ăsta după trei–șase luni?"
    ]
  };

  P.extra.design = {
    title: "Design: detecție în timp real pe logurile SAP",
    intro: "Întrebarea probabilă, în stilul Defend: „Proiectează backend-ul care primește logurile sistemelor SAP ale clienților și generează alerte în câteva secunde.”",
    steps: [
      { h: "1 · Clarifici", list: ["Câte sisteme și clienți? Evenimente pe secundă, medie și vârf?", "Latența acceptată de la eveniment la alertă (secunde? minute?).", "Retenție, cerințe de conformitate, on-prem vs cloud, multi-tenant."] },
      { h: "2 · Estimezi (exemplu)", list: ["1.000 de sisteme × 50 evenimente/s = 50.000 ev/s ≈ 4,3 miliarde/zi.", "La ~500 B/eveniment ≈ 2 TB/zi brut → ingestie în loturi, partiționare pe timp, arhivă în S3 cu lifecycle."] },
      { h: "3 · Componente", list: [
        "Colectori la client: citesc Security Audit Log, gateway, ICM, schimbări; trimit loturi comprimate prin TLS, cu buffer local și retry.",
        "Ingestie: API stateless care validează schema, autentifică sursa (mTLS sau token), publică în broker și răspunde 202; idempotent pe (system_id, batch_id).",
        "Broker: RabbitMQ cu quorum queues, routing după tip și sistem, DLX.",
        "Normalizare: schemă comună (timestamp UTC, user, sistem, tip, câmpuri) + îmbogățire (criticitatea sistemului, rolul userului).",
        "Detecție: module de reguli cu interfață comună, stare de fereastră în Redis, ordine per sistem (routing după system_id), reguli versionate și testate.",
        "Alerte: deduplicare (cheie + cooldown), scriere idempotentă în Postgres partiționat, consumatori separați pentru SIEM și notificări (fanout).",
        "API și UI: GraphQL pentru consola de investigație; căutare în evenimente prin Elasticsearch/OpenSearch.",
        "Arhivă brută în S3 → replay când apare o regulă nouă (detecție retroactivă)."
      ] },
      { h: "4 · Fiabilitate", list: ["At-least-once + consumatori idempotenți.", "Backpressure: prefetch, cozi limitate, rate limit per tenant.", "Autoscaling pe lungimea cozii; DLQ cu alertă; replay din arhivă."] },
      { h: "5 · Observabilitate", list: ["Lag și vârsta celui mai vechi mesaj per coadă.", "Latența end-to-end: timpul evenimentului → alerta.", "Rata de alerte per regulă (reguli zgomotoase) și erorile de parsare per sursă."] },
      { h: "6 · Securitate", list: ["mTLS de la colectori; izolare per tenant (tenant_id + row-level security).", "Secrete în secret manager; least privilege; audit pe acțiunile din consolă."] },
      { h: "7 · Trade-off-uri de spus", list: ["RabbitMQ vs Kafka: Kafka dacă vrei replay nativ și throughput foarte mare.", "Postgres vs un store analitic (ClickHouse, Elastic) pentru interogări pe volum mare.", "Starea ferestrelor în Redis vs în memoria workerului cu routing sticky."] }
    ]
  };
})(window.PREP);
