/* MCQ bank 2: SQLAlchemy, PostgreSQL, Celery, RabbitMQ, Redis, Django ORM. */
(function (P) {
  const R = String.raw;
  const Q = (m, list) => list.forEach(q => P.mcq.push(Object.assign({ m }, q)));

  Q("sqlalchemy", [
    { id: "sqa-01", q: "Ce e identity map-ul din `Session`?", o: [
      "În aceeași sesiune, un rând (după PK) = un singur obiect Python",
      "Un cache global de query-uri, partajat de toate sesiunile",
      "Maparea dintre clasele Python și tabelele din baza de date",
      "Indexul pe cheia primară pe care SQLAlchemy îl creează automat"], a: 0,
      e: "Ceri același user de două ori în aceeași sesiune și primești același obiect. `session.get()` îl ia din identity map fără SQL; un `select()` tot merge la DB, dar rândul e reconciliat cu obiectul existent." },
    { id: "sqa-02", q: "Câte query-uri pentru 100 de useri, cu relația `orders` lazy (implicit)?", code: R`users = session.scalars(select(User)).all()
for u in users:
    print(u.name, len(u.orders))`, o: ["101", "1", "2", "100"], a: 0,
      e: "Un SELECT pentru useri plus câte unul per user la primul acces al lui `orders` (N+1). Cu `.options(selectinload(User.orders))` ai 2 query-uri." },
    { id: "sqa-03", q: "selectinload vs joinedload?", o: [
      "selectinload: al doilea SELECT cu `IN`; joinedload: un JOIN",
      "Sunt identice; joinedload e doar numele vechi pentru selectinload",
      "joinedload e mereu mai bun, pentru că face un singur query",
      "selectinload încarcă doar primul element, joinedload toată colecția"], a: 0,
      e: "Un JOIN pe o colecție multiplică rândurile părintelui (și mai rău cu mai multe colecții), deci pentru colecții (one-to-many) selectinload. Pentru `order.user` (many-to-one), joinedload e eficient." },
    { id: "sqa-04", q: "Ce face `session.commit()`?", o: [
      "Face flush, apoi COMMIT; implicit expiră atributele obiectelor",
      "Doar trimite SQL-ul în tranzacție; COMMIT-ul vine la `close()`",
      "Face COMMIT și închide conexiunea fizică la baza de date",
      "Face COMMIT și reîncarcă imediat toate obiectele din DB"], a: 0,
      e: "Flush trimite modificările în așteptare în tranzacție (mai poți face rollback); commit le face permanente. Cu `expire_on_commit=True`, atributele se reîncarcă abia la următorul acces, nu imediat." },
    { id: "sqa-05", q: "Primești `DetachedInstanceError` la `order.items`, după ce sesiunea s-a închis. De ce?", o: [
      "Obiectul e detașat de sesiune, deci lazy load-ul eșuează",
      "Tabela `items` nu există sau n-a fost creată de migrații",
      "Obiectul a fost șters din DB de alt request între timp",
      "Pool-ul de conexiuni e plin și nu mai poate da o conexiune nouă"], a: 0,
      e: "La fel pentru atributele expirate după commit. Soluții: eager loading cât sesiunea e deschisă, `expire_on_commit=False` când returnezi obiecte după commit, sau conversie în DTO/Pydantic înainte de închidere." },
    { id: "sqa-06", q: "Care e scope-ul corect al unei `Session`?", o: [
      "Una per request sau per task, nepartajată între threaduri",
      "Una singură, globală, creată la pornire și refolosită peste tot",
      "Una nouă pentru fiecare query, închisă imediat după el",
      "Una per proces, partajată de toate threadurile acelui proces"], a: 0,
      e: "O sesiune = o unitate de lucru. Session nu e thread-safe; una globală acumulează obiecte și ține tranzacții lungi. Engine-ul (cu pool-ul) e cel partajat." },
    { id: "sqa-07", q: "Care cod e vulnerabil la SQL injection?", o: [
      "`session.execute(text(f\"SELECT * FROM users WHERE name = '{name}'\"))`",
      "`session.execute(text(\"SELECT * FROM users WHERE name = :n\"), {\"n\": name})`",
      "`session.scalars(select(User).where(User.name == name))`",
      "`session.get(User, user_id)`"], a: 0,
      e: "f-string-ul pune input-ul direct în textul SQL. Celelalte trimit valoarea ca parametru, separat de SQL. Numele de coloane sau tabele dinamice nu se pot parametriza: whitelist." },
    { id: "sqa-08", q: "Ce face `pool_pre_ping=True` la `create_engine`?", o: [
      "Testează conexiunea la checkout și o înlocuiește dacă e moartă",
      "Deschide toate conexiunile din pool la pornirea aplicației",
      "Trimite periodic un ping la DB, ca să țină conexiunile vii",
      "Dezactivează pool-ul și deschide o conexiune nouă la fiecare query"], a: 0,
      e: "La checkout (când conexiunea e luată din pool) trimite un ping ieftin. Evită erorile „server closed the connection unexpectedly” după un restart de DB sau un timeout de firewall. `pool_recycle` reciclează conexiunile după N secunde." },
    { id: "sqa-09", q: "Cum faci un insert idempotent în Postgres cu SQLAlchemy?", o: [
      "`insert(...).on_conflict_do_nothing(...)` din dialectul postgresql",
      "`session.merge(obj)`, care face upsert atomic sub concurență",
      "`try: session.add(obj); session.commit()` și ignori orice excepție",
      "`session.add(obj)`: identity map-ul previne automat duplicatele"], a: 0,
      e: "Upsert-ul nativ e atomic în DB. `merge()` face SELECT, apoi INSERT/UPDATE: sub concurență, două procese pot insera amândouă. După o eroare de integritate, sesiunea cere rollback." },
    { id: "sqa-10", q: "Ce face `alembic revision --autogenerate`?", o: [
      "Scrie un draft de migrație din diferența modele–schemă",
      "Generează migrația și o aplică imediat pe baza de date curentă",
      "Generează modele Python din baza de date existentă",
      "Comprimă migrațiile vechi deja aplicate într-una singură"], a: 0,
      e: "Autogenerate nu vede tot: o redenumire de coloană apare ca drop + add (pierzi datele), unele constrângeri și tipuri custom lipsesc. Review obligatoriu; `alembic upgrade head` ca pas separat în deploy." },
    { id: "sqa-11", q: "Redenumești coloana `name` în `full_name` fără downtime. Abordarea sigură?", o: [
      "Expand/contract: coloană nouă, backfill, apoi ștergi vechea",
      "`ALTER TABLE ... RENAME COLUMN` și deploy în același minut",
      "Ștergi coloana și o recreezi cu numele nou, într-o tranzacție",
      "`RENAME COLUMN` într-o singură tranzacție, deci schimbarea e atomică"], a: 0,
      e: "Pașii: adaugi `full_name`, scrii în ambele coloane, backfill, muți citirile pe `full_name`, abia apoi ștergi `name`. În timpul deploy-ului rulează simultan codul vechi și cel nou, deci fiecare pas trebuie să fie compatibil cu amândouă. Atomicitatea nu ajută: codul vechi caută în continuare `name`." },
    { id: "sqa-12", q: "Când folosești Core în loc de ORM?", o: [
      "Pentru bulk/ETL și SQL complex, fără obiecte și unit of work",
      "Niciodată: Core e depreciat și dispare în SQLAlchemy 2.0",
      "Doar pentru SQLite, unde ORM-ul nu e suportat complet",
      "Când ai nevoie de lazy loading pe relațiile dintre tabele"], a: 0,
      e: "Core îți dă SQL compozabil fără overhead-ul obiectelor ORM. În 2.0, aceleași `select()`/`insert()` rulează prin Session sau prin Connection." },
    { id: "sqa-13", q: "Cu `AsyncSession` accesezi `user.orders` (lazy implicit) fără eager loading. Ce se întâmplă?", o: [
      "Eroare (`MissingGreenlet`): lazy load-ul nu poate face I/O async",
      "Merge normal: SQLAlchemy face automat await în spate",
      "Returnează o listă goală până faci un `await session.refresh()`",
      "Încarcă sincron, blocând event loop-ul, dar fără eroare"], a: 0,
      e: "În async, încărcarea trebuie să fie explicită: `selectinload` în query sau `await user.awaitable_attrs.orders` (mixin-ul `AsyncAttrs`)." }
  ]);

  Q("postgres", [
    { id: "pg-01", q: "Care e nivelul de izolare implicit în PostgreSQL?", o: ["READ COMMITTED", "SERIALIZABLE", "REPEATABLE READ", "READ UNCOMMITTED"], a: 0,
      e: "Fiecare statement vede ce era comis la începutul lui; două SELECT-uri din aceeași tranzacție pot vedea date diferite. (READ UNCOMMITTED se comportă în Postgres ca READ COMMITTED.)" },
    { id: "pg-02", q: "Două request-uri rulează asta simultan, cu soldul inițial 500. Ce rezultat e posibil în READ COMMITTED?", code: R`acc = session.get(Account, 1)
acc.balance = acc.balance - 100
session.commit()`, o: [
      "400: un update pierdut (lost update)",
      "Mereu 300, pentru că commit-urile se serializează",
      "O eroare de serializare la al doilea commit",
      "Deadlock, pentru că ambele scriu același rând"], a: 0,
      e: "Ambele citesc 500 și scriu 400. Soluții: update atomic în SQL (`balance = balance - 100`), `with_for_update()` (SELECT ... FOR UPDATE), versionare optimistă (`version_id_col`) sau SERIALIZABLE cu retry." },
    { id: "pg-03", q: "Ce e MVCC?", o: [
      "Multi-Version Concurrency Control: cititorii nu blochează scriitorii",
      "Un tip de index pentru tabele cu multe versiuni ale rândurilor",
      "Mecanismul de replicare sincronă între mai multe centre de date",
      "Formatul de backup incremental folosit de `pg_basebackup`"], a: 0,
      e: "UPDATE scrie o versiune nouă a rândului, iar fiecare tranzacție vede un snapshot consistent. Prețul: versiunile moarte trebuie curățate de VACUUM, iar tranzacțiile lungi împiedică curățarea." },
    { id: "pg-04", q: "De ce e periculoasă o conexiune rămasă „idle in transaction” ore întregi?", o: [
      "Ține lock-uri și blochează VACUUM, deci apar bloat și lentoare",
      "Consumă constant CPU pe server cât timp stă deschisă",
      "Face rollback la tranzacțiile celorlalți care ating aceleași rânduri",
      "Nu e periculoasă cât timp nu execută niciun statement"], a: 0,
      e: "Setezi `idle_in_transaction_session_timeout` și ții tranzacțiile scurte: niciun apel HTTP extern în interiorul unei tranzacții DB." },
    { id: "pg-05", q: "Construiești o coadă de joburi direct în Postgres, cu mai mulți workeri. Ce query de preluare?", o: [
      "`SELECT ... FOR UPDATE SKIP LOCKED LIMIT 1`",
      "`SELECT ... ORDER BY id LIMIT 1`, fără lock",
      "`LOCK TABLE jobs IN EXCLUSIVE MODE` la fiecare preluare",
      "`SELECT ... FOR SHARE LIMIT 1` într-o tranzacție"], a: 0,
      e: "Rulat într-o tranzacție, SKIP LOCKED sare peste rândurile blocate de alți workeri: fără contenție și fără dublă procesare." },
    { id: "pg-06", q: "De ce ai nevoie de PgBouncer cu sute de workeri Celery și replici de API?", o: [
      "Fiecare conexiune Postgres e un proces backend scump",
      "Ca să cripteze cu TLS traficul dintre aplicație și Postgres",
      "Ca să facă backup-uri incrementale fără să încarce primarul",
      "Ca să cache-uiască rezultatele query-urilor frecvente"], a: 0,
      e: "Fiecare conexiune e un proces cu memorie proprie, iar `max_connections` e limitat. PgBouncer multiplexează multe conexiuni client pe puține conexiuni server. În transaction pooling, atenție la ce ține de sesiune: `SET`, advisory locks, prepared statements." },
    { id: "pg-07", q: "Tabela de evenimente crește cu 50M de rânduri pe lună; citești ultimele 7 zile; păstrezi 90 de zile. Strategie?", o: [
      "Partiționare pe timp (zi sau lună); ștergi partițiile vechi",
      "O singură tabelă și `DELETE WHERE created_at < now() - interval '90 days'` zilnic",
      "Muți evenimentele în Redis",
      "O tabelă nouă pentru fiecare client, creată manual"], a: 0,
      e: "Partition pruning limitează citirile la partițiile relevante; o partiție veche se șterge instant (DETACH, apoi DROP TABLE), pe când un DELETE masiv lasă milioane de versiuni moarte pentru VACUUM." },
    { id: "pg-08", q: "Ce e un deadlock și cum îl gestionezi?", o: [
      "Două tranzacții se așteaptă reciproc; Postgres anulează una",
      "O tranzacție care durează mai mult de 30 de secunde",
      "Un index corupt care blochează toate scrierile pe tabelă",
      "O conexiune pierdută în timpul unui COMMIT, care lasă lock-uri"], a: 0,
      e: "T1 blochează A apoi B, T2 blochează B apoi A. Faci retry la eroare și iei lock-urile mereu în aceeași ordine (de exemplu după id), ca ciclul să nu mai apară." },
    { id: "pg-09", q: "Cel mai rapid mod de a încărca 10M de rânduri dintr-un CSV în Postgres?", o: [
      "COPY (de exemplu `cursor.copy()` în psycopg 3)",
      "10M de `session.add()` și un singur commit la final",
      "10M de INSERT-uri, cu commit după fiecare",
      "Prin API-ul REST al aplicației, rând cu rând"], a: 0,
      e: "COPY e protocolul de bulk load: overhead minim per rând. Pentru volume medii, insert-uri în loturi. Commit per rând = un fsync per rând." },
    { id: "pg-10", q: "Cum găsești query-urile care consumă cel mai mult timp total în producție?", o: [
      "`pg_stat_statements`, sortat după timpul total de execuție",
      "Citești manual logurile aplicației, request cu request",
      "`SELECT * FROM pg_tables` sortat după dimensiunea tabelelor",
      "Repornești serverul și urmărești CPU-ul în primele minute"], a: 0,
      e: "Apoi EXPLAIN pe primele. Un query de 5 ms rulat de un milion de ori poate costa mai mult decât unul de 10 s rulat o dată. APM-ul (New Relic) arată aceeași imagine din partea aplicației." },
    { id: "pg-11", q: "Ce face `ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC)`?", o: [
      "Numerotează rândurile fiecărui user, fără să le comprime",
      "Șterge rândurile duplicate ale fiecărui user, păstrându-l pe primul",
      "Creează câte o partiție de tabelă pentru fiecare user",
      "Agregă rândurile fiecărui user într-unul singur"], a: 0,
      e: "Numerotarea pornește de la cel mai recent. Folosit pentru „ultimul eveniment per user”: filtrezi `rn = 1` într-un CTE sau subquery. Păstrezi rândurile individuale." }
  ]);

  Q("celery", [
    { id: "cel-01", q: "De ce nu rulezi un task de 2 minute direct în request-ul HTTP?", o: [
      "Pentru că blochează un worker web, riscă timeout și n-are retry",
      "Pentru că Python nu poate rula o funcție mai mult de 30 de secunde",
      "Pentru că workerii Celery execută codul Python mai repede, compilat",
      "Pentru că protocolul HTTP nu permite răspunsuri după un minut"], a: 0,
      e: "Request-ul doar publică mesajul, workerii procesează în ritmul lor, cu retry și scalare independentă; dacă procesul web moare, munca rămâne în broker. Clientul primește 202 + job id." },
    { id: "cel-02", q: "Celery garantează implicit livrare „exactly once”?", o: [
      "Nu; task-urile trebuie să fie idempotente",
      "Da, brokerul deduplică mesajele după id-ul task-ului",
      "Da, dacă folosești Redis ca broker, care e single-threaded",
      "Doar cu `acks_late=True` și `max_retries=0`"], a: 0,
      e: "Un task poate rula de două ori (worker mort după execuție, înainte de ack; visibility timeout în Redis). Idempotență: cheie unică, upsert, `ON CONFLICT DO NOTHING`, verificarea stării." },
    { id: "cel-03", q: "Ce face `acks_late=True`?", o: [
      "Ack după execuție: dacă workerul moare, mesajul e re-livrat",
      "Pornește task-ul cu o întârziere configurabilă",
      "Salvează rezultatul în backend mai târziu, în loturi",
      "Dezactivează retry-urile, ca task-ul să nu ruleze de două ori"], a: 0,
      e: "Implicit Celery confirmă înainte de execuție: un crash pierde task-ul. Cu acks_late treci la at-least-once. Se combină des cu `worker_prefetch_multiplier=1`." },
    { id: "cel-04", q: "Ce face configurația?", code: R`@app.task(bind=True, autoretry_for=(requests.ConnectionError,),
          retry_backoff=True, retry_jitter=True, max_retries=5)
def fetch_sap_logs(self, system_id):
    ...`, o: [
      "Până la 5 retry-uri la ConnectionError, cu backoff și jitter",
      "Reîncearcă la orice excepție, de 5 ori, cu pauză fixă",
      "Rulează task-ul de 5 ori în paralel și păstrează primul rezultat",
      "La ConnectionError reîncearcă imediat, fără pauză, de 5 ori"], a: 0,
      e: "Backoff-ul dă timp sistemului să-și revină; jitter-ul evită ca toate retry-urile să lovească simultan. Reîncerci doar erori tranzitorii, nu bug-uri." },
    { id: "cel-05", q: "Pornești Celery Beat în 3 replici ale aceluiași container. Ce se întâmplă?", o: [
      "Fiecare task periodic e programat de 3 ori",
      "Cele 3 instanțe își împart automat task-urile periodice",
      "Doar prima replică pornește, celelalte așteaptă",
      "Task-urile rulează de 3 ori mai repede"], a: 0,
      e: "Beat nu are coordonare distribuită. Îl rulezi separat, cu o singură replică, sau folosești un scheduler cu lock." },
    { id: "cel-06", q: "De ce trimiți în task `user_id`, nu obiectul ORM `user`?", o: [
      "Pentru că mesajul e mic, iar task-ul citește starea curentă",
      "Pentru că ID-urile sunt mai sigure criptografic decât obiectele",
      "Pentru că Celery acceptă doar argumente de tip int sau str",
      "Pentru că obiectele ORM nu pot fi folosite în alt thread"], a: 0,
      e: "Până rulează task-ul (după retry-uri sau minute în coadă), datele se pot schimba. Serializarea JSON nu știe de obiecte ORM; recitești din DB." },
    { id: "cel-07", q: "Publici un task imediat după `session.add(order)`, înainte de commit. Ce poate merge prost?", o: [
      "Workerul poate porni înainte de commit și nu găsește rândul",
      "Nimic: Celery amână automat publicarea până la commit",
      "Task-ul rulează garantat de două ori, o dată per tranzacție",
      "SQLAlchemy blochează publicarea până când tranzacția se închide"], a: 0,
      e: "Sau tranzacția face rollback și task-ul rulează pe date care nu există. Publici după commit (Django: `transaction.on_commit`; SQLAlchemy: după `session.commit()`) sau folosești outbox." },
    { id: "cel-08", q: "Task-uri rapide (ms) și grele (minute) stau în aceeași coadă. Problema și soluția?", o: [
      "Cele grele blochează workerii; le muți pe cozi dedicate",
      "Nicio problemă: Celery prioritizează automat după durată",
      "Crești `max_retries`, ca task-urile rapide să fie reîncercate",
      "Treci de la RabbitMQ la Redis, care livrează mesajele mai repede"], a: 0,
      e: "`task_routes` + `celery worker -Q heavy`. Cozi separate = scalare și concurență diferite per tip (prefork pentru CPU, threads/gevent pentru I/O)." },
    { id: "cel-09", q: "Ce e un chord în Celery?", o: [
      "Un group de task-uri paralele, plus un callback la final",
      "Un task care rulează periodic, programat de Beat",
      "O coadă cu prioritate pentru task-urile urgente",
      "Un lanț de task-uri secvențiale, fiecare primind rezultatul anterior"], a: 0,
      e: "chain = secvență, group = paralel, chord = group + callback care rulează când toate s-au terminat. Chord-ul cere result backend." },
    { id: "cel-10", q: "Cu Redis ca broker, un task cu `countdown=7200` (2 h) rulează de mai multe ori. De ce?", o: [
      "`visibility_timeout` (implicit 1 h) expiră și mesajul e re-livrat",
      "Redis duplică mesajele cu ETA la fiecare restart al workerului",
      "Beat programează din nou task-ul când countdown-ul depășește 1 h",
      "`countdown` nu e suportat cu Redis, deci task-ul rulează imediat"], a: 0,
      e: "Un mesaj neconfirmat redevine vizibil după visibility_timeout și ajunge la alt worker. Crești timeout-ul sau eviți ETA-uri lungi. RabbitMQ nu are mecanismul ăsta: re-livrează la închiderea conexiunii." },
    { id: "cel-11", q: "Ce serializer folosești pentru Celery și de ce?", o: [
      "JSON: pickle poate executa cod la deserializare",
      "pickle: e mai rapid și suportă orice obiect Python",
      "YAML: e lizibil și suportă obiecte Python complete",
      "Nu contează, toate sunt echivalente ca securitate"], a: 0,
      e: "Dacă cineva poate scrie în broker, pickle înseamnă execuție de cod. JSON e implicit din Celery 4. La o firmă de securitate, „de ce nu pickle?” e un test de reflexe." },
    { id: "cel-12", q: "Ce pool de concurență pentru task-uri Celery CPU-bound?", o: [
      "prefork (procese), cel implicit",
      "threads, ca să împartă memoria între task-uri",
      "gevent, cu greenlets pentru concurență mare",
      "eventlet, care ocolește GIL-ul prin monkey patching"], a: 0,
      e: "Același raționament ca la GIL: procesele ocolesc GIL-ul; threads/gevent/eventlet sunt pentru task-uri I/O-bound cu concurență mare." },
    { id: "cel-13", q: "Ce face `soft_time_limit`?", o: [
      "Aruncă o excepție în task, ca să poți face cleanup",
      "Setează pauza maximă dintre două retry-uri ale task-ului",
      "Limitează cât poate sta un mesaj în coadă înainte să expire",
      "Setează timeout-ul conexiunii dintre worker și broker, în secunde"], a: 0,
      e: "Excepția e `SoftTimeLimitExceeded`; `time_limit` omoară procesul. Protejezi workerii de task-uri blocate și pui și timeout-uri explicite pe apelurile de I/O." }
  ]);

  Q("rabbitmq", [
    { id: "rmq-01", q: "Ce tip de exchange, ca `sap.prd.security` și `sap.dev.security` să ajungă în aceeași coadă printr-un singur binding?", o: [
      "topic, cu binding `sap.*.security`", "fanout, cu binding `sap.*.security`", "direct, cu binding `sap.*.security`", "headers, cu binding `#`"], a: 0,
      e: "Topic: `*` = exact un cuvânt, `#` = zero sau mai multe. Direct cere potrivire exactă a cheii; fanout ignoră cheia complet." },
    { id: "rmq-02", q: "Consumatorul folosește auto-ack și crapă în mijlocul procesării. Ce se întâmplă cu mesajul?", o: [
      "E pierdut: a fost considerat livrat la trimitere", "E re-livrat automat altui consumator", "Ajunge în dead letter exchange", "Rămâne în coadă până repornește consumatorul"], a: 0,
      e: "Auto-ack = at-most-once. Cu ack manual după procesare, un mesaj neconfirmat e re-livrat când canalul se închide: at-least-once." },
    { id: "rmq-03", q: "Ce controlează prefetch count (`basic.qos`)?", o: [
      "Câte mesaje neconfirmate primește un consumator odată",
      "Dimensiunea maximă a cozii, în număr de mesaje",
      "Câte retry-uri primește un mesaj înainte de DLQ",
      "Câte mesaje publică producătorul înainte de un confirm"], a: 0,
      e: "Asigură distribuție echitabilă și backpressure. Prefetch mare + task-uri lungi = un consumator ține multe mesaje cât alții stau. Prefetch 1 pentru task-uri lungi, mai mare pentru mesaje mici și rapide." },
    { id: "rmq-04", q: "Ce îți trebuie ca mesajele să supraviețuiască unui restart al brokerului?", o: [
      "Coadă durable + mesaje persistente (plus publisher confirms)",
      "Doar coada declarată durable, mesajele moștenesc setarea",
      "Doar mesaje persistente, coada poate fi oricum",
      "Nimic: RabbitMQ salvează automat totul pe disc"], a: 0,
      e: "O coadă durable cu mesaje non-persistente pierde mesajele la restart. Ideal quorum queue. Publisher confirms îți spun că mesajul e în siguranță la broker." },
    { id: "rmq-05", q: "Un mesaj malformat face consumatorul să eșueze la nesfârșit (requeue în buclă). Soluția?", o: [
      "Reject fără requeue, spre un dead letter exchange",
      "Requeue cu întârziere, la infinit, până trece",
      "Ștergi și recreezi coada, ca să scapi de mesaj",
      "Crești prefetch-ul, ca mesajul să nu mai blocheze coada"], a: 0,
      e: "„Poison message”. DLQ-ul păstrează mesajul pentru investigație fără să blocheze coada, iar o alertă pe DLQ te anunță; pe quorum queues ajută și `delivery-limit`. Retry-urile pentru erori tranzitorii merg separat, cu întârziere." },
    { id: "rmq-06", q: "Ce poți spune despre ordinea mesajelor în RabbitMQ?", o: [
      "FIFO per coadă, dar se strică cu mai mulți consumatori",
      "E garantată global, între toate cozile și toate exchange-urile",
      "Nu există nicio ordine, nici măcar într-o singură coadă",
      "E garantată doar pentru mesajele trecute printr-un fanout"], a: 0,
      e: "Cu mai mulți consumatori sau requeue, procesarea poate ieși din ordine. Dacă ordinea contează per entitate (per sistem SAP), rutezi după cheie spre cozi dedicate sau ai un singur consumator per cheie." },
    { id: "rmq-07", q: "RabbitMQ vs Kafka, pe scurt?", o: [
      "RabbitMQ șterge mesajul după ack; Kafka îl păstrează în log",
      "Sunt același produs: Kafka e versiunea comercială, plătită, a RabbitMQ",
      "Kafka ține mesajele doar în memorie, RabbitMQ pe disc",
      "RabbitMQ nu suportă mai mulți consumatori pe aceeași coadă"], a: 0,
      e: "Cozi de task-uri și routing flexibil → RabbitMQ. Event streaming cu retenție, partiții, replay după offset și throughput foarte mare → Kafka. (RabbitMQ are și Streams.)" },
    { id: "rmq-08", q: "Ce face un fanout exchange?", o: [
      "Copiază mesajul în toate cozile legate",
      "Trimite mesajul unei singure cozi, aleasă aleatoriu",
      "Rutează mesajul după headerele lui, nu după cheie",
      "Balansează mesajele între consumatorii aceleiași cozi"], a: 0,
      e: "Routing key-ul e ignorat. Bun pentru broadcast: aceeași alertă consumată independent de notificări, audit și integrarea cu SIEM." },
    { id: "rmq-09", q: "În RabbitMQ 4.x, ce tip de coadă folosești pentru replicare și disponibilitate?", o: [
      "Quorum queues (bazate pe Raft)",
      "Classic mirrored queues, cu politica ha-mode",
      "Exclusive queues, legate de o conexiune",
      "Auto-delete queues, recreate la nevoie"], a: 0,
      e: "Mirroring-ul clasic a fost eliminat în 4.0. Quorum queues replică pe mai multe noduri prin consens și au `delivery-limit` pentru poison messages." }
  ]);

  Q("redis", [
    { id: "rd-01", q: "Pub/Sub vs Streams în Redis, pentru evenimente care nu au voie să se piardă?", o: [
      "Streams: persistente, cu consumer groups și ack",
      "Pub/Sub: garantează livrarea către fiecare subscriber",
      "Sunt echivalente ca garanții, diferă doar sintaxa",
      "Niciunul: Redis nu poate transporta mesaje"], a: 0,
      e: "Pub/Sub e fire-and-forget: un subscriber deconectat pierde mesajele. Streams păstrează mesajele; consumer groups le împart între consumatori, cu listă de pending pentru cele neconfirmate." },
    { id: "rd-02", q: "Cum implementezi un lock distribuit simplu în Redis?", o: [
      "`SET lock:job42 <token> NX PX 30000`",
      "`GET lock:job42`, apoi `SET` dacă cheia nu există încă",
      "`SET lock:job42 1` fără expirare, șters la final cu `DEL`",
      "`SETNX lock:job42 1`, apoi `EXPIRE` într-o comandă separată"], a: 0,
      e: "NX = doar dacă nu există (atomic); PX = expiră dacă procesul moare. La eliberare ștergi doar dacă token-ul e al tău (script Lua). GET + SET e un race; SETNX + EXPIRE separat lasă lock-ul etern dacă procesul moare între ele." },
    { id: "rd-03", q: "Ce e cache-aside?", o: [
      "La miss, aplicația citește din DB și populează cache-ul",
      "Baza de date scrie automat în cache la fiecare modificare",
      "Cache-ul devine sursa de adevăr, iar DB-ul e backup",
      "Scrierile merg întâi în cache, apoi asincron în DB"], a: 0,
      e: "Cel mai comun pattern; la scriere invalidezi cheia. „Scrierile merg întâi în cache, apoi asincron în DB” e write-behind (risc de pierdere). TTL + invalidare limitează datele vechi." },
    { id: "rd-04", q: "Ce e un cache stampede?", o: [
      "Multe request-uri ratează simultan o cheie și lovesc DB-ul",
      "Cache-ul se umple și Redis începe să piardă chei la întâmplare",
      "Redis rămâne fără CPU din cauza comenzilor O(N) lente",
      "O cheie are TTL prea mare și servește mult timp date vechi"], a: 0,
      e: "Previi cu lock/single-flight (un singur request recalculează), TTL cu jitter (cheile nu expiră toate odată) sau refresh anticipat." },
    { id: "rd-05", q: "De ce nu folosești `KEYS *` în producție?", o: [
      "E O(N) și blochează serverul; folosești `SCAN`",
      "E depreciat și dă eroare de sintaxă în versiunile noi de Redis",
      "Șterge cheile pe care le găsește, la fel ca `FLUSHDB`",
      "Funcționează doar pe replici, nu și pe nodul primar"], a: 0,
      e: "Comenzile rulează pe un singur thread, deci o comandă lungă blochează tot. SCAN iterează incremental cu cursor. Aceeași grijă pentru SMEMBERS sau HGETALL pe structuri mari." },
    { id: "rd-06", q: "Rate limit de 100 de request-uri pe minut per API key, cu mai multe replici de API. Cea mai simplă implementare corectă?", o: [
      "`INCR rl:{key}:{minut}` + `EXPIRE`; respingi peste 100",
      "Un dict Python în memoria fiecărui proces de API",
      "Un rând în Postgres actualizat la fiecare request",
      "Un canal Pub/Sub pe care numeri mesajele per cheie"], a: 0,
      e: "Fixed window e simplu, dar permite rafale la granița ferestrelor; sliding window (sorted set) sau token bucket (Lua) sunt mai netede. Dict-ul local nu vede celelalte replici." },
    { id: "rd-07", q: "Ce `maxmemory-policy` alegi pentru un Redis folosit strict ca cache?", o: [
      "`allkeys-lru` sau `allkeys-lfu`",
      "`noeviction`, valoarea implicită",
      "Nu există politici de evacuare în Redis",
      "`volatile-ttl` e singura opțiune validă"], a: 0,
      e: "Evacuează cheile cel mai puțin folosite. Cu `noeviction` (implicit), scrierile dau eroare când memoria e plină: potrivit când Redis ține date care nu au voie să dispară (cozi), nu pentru cache." },
    { id: "rd-08", q: "Ce garantează MULTI/EXEC?", o: [
      "Execuție neîntreruptă, dar fără rollback",
      "Rollback complet dacă o comandă eșuează, ca în SQL",
      "Execuție paralelă a comenzilor pe mai multe threaduri",
      "Scriere sincronă pe disc a tuturor comenzilor din bloc"], a: 0,
      e: "Nicio comandă a altui client nu se intercalează. Pentru logică condiționată atomică (citești, apoi decizi) folosești scripturi Lua sau WATCH (optimistic)." },
    { id: "rd-09", q: "RDB vs AOF în Redis?", o: [
      "RDB = snapshot periodic; AOF = log al comenzilor",
      "Ambele țin datele doar în memorie, fără nimic pe disc",
      "AOF e replicarea între noduri, RDB e backup-ul pe disc",
      "RDB garantează zero pierderi la crash, AOF nu garantează nimic"], a: 0,
      e: "Cu RDB poți pierde ultimele minute; cu AOF + everysec, cam o secundă. Le poți combina. Pentru cozi sau stare importantă: AOF + replicare; pentru cache pur, persistența poate fi oprită." }
  ]);

  Q("django", [
    { id: "dj-01", q: "Listezi `Order.objects.all()` și pentru fiecare accesezi `order.customer.name`. Fix?", o: [
      "`select_related(\"customer\")`: un JOIN pentru relația FK",
      "`.only(\"id\")`, ca să încarci mai puține coloane",
      "`.values()` și renunți la obiecte",
      "Un index pe `customer_id`, ca fiecare query să fie rapid"], a: 0,
      e: "select_related pentru many-to-one/one-to-one (JOIN); prefetch_related pentru many-to-many și reverse FK (query separat cu IN). Echivalente în SQLAlchemy: joinedload / selectinload." },
    { id: "dj-02", q: "Cum incrementezi atomic un contor în Django?", o: [
      "`Post.objects.filter(pk=pk).update(views=F(\"views\") + 1)`",
      "`p.views += 1; p.save()`",
      "`p.views = p.views + 1`, apoi `p.save(update_fields=[\"views\"])`",
      "Un contor într-o variabilă globală a procesului"], a: 0,
      e: "F() face operația în SQL. Variantele cu `+ 1` în Python sunt read-modify-write: lost update sub concurență." },
    { id: "dj-03", q: "De ce `transaction.on_commit(lambda: send_report.delay(report.id))`?", o: [
      "Publică task-ul doar după commit-ul tranzacției",
      "Face task-ul să ruleze mai repede, în același proces",
      "E obligatoriu pentru orice task Celery publicat din Django",
      "Rulează task-ul în aceeași tranzacție cu request-ul"], a: 0,
      e: "Fără el, workerul poate căuta un rând încă necomis sau anulat de rollback. Echivalentul în SQLAlchemy: publici după `session.commit()`. Pentru garanție completă (crash între commit și publicare): outbox." },
    { id: "dj-04", q: "Django ORM vs SQLAlchemy ORM, la nivel de concept?", o: [
      "Django: Active Record; SQLAlchemy: Data Mapper",
      "Sunt identice ca model; SQLAlchemy e doar mai nou și mai rapid",
      "SQLAlchemy e doar Active Record, fără sesiuni",
      "Django ORM nu are tranzacții, doar autocommit"], a: 0,
      e: "În Django obiectul se salvează singur (`obj.save()`); în SQLAlchemy Session urmărește și scrie modificările, plus Core pentru SQL. Conceptele se mapează: select_related ≈ joinedload, prefetch_related ≈ selectinload, atomic ≈ `session.begin()`, migrate ≈ Alembic." }
  ]);
})(window.PREP);
