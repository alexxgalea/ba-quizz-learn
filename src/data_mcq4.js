/* MCQ bank 4: securitate, domeniul Onapsis, system design, performanță, SQL vs NoSQL, React/TS bonus. */
(function (P) {
  const R = String.raw;
  const Q = (m, list) => list.forEach(q => P.mcq.push(Object.assign({ m }, q)));

  Q("security", [
    { id: "sec-01", q: "Ce e periculos aici?", code: R`data = redis_client.get(f"session:{sid}")
session = pickle.loads(data)`, o: [
      "`pickle.loads` pe date controlabile permite execuție de cod",
      "Redis nu poate stoca date binare, doar stringuri UTF-8",
      "f-string-ul din numele cheii permite injecție de comenzi în Redis",
      "Nimic, dacă Redis e în rețeaua internă"], a: 0,
      e: "Pickle poate apela orice callable la deserializare (`__reduce__`). Pentru date care trec granițe de încredere: JSON + validare. „E în rețeaua internă” nu e un control de securitate." },
    { id: "sec-02", q: "Cum stochezi parolele userilor?", o: [
      "Hash lent, cu salt: Argon2id sau bcrypt",
      "SHA-256 cu salt unic per utilizator",
      "Criptare AES, cu cheia în configurare",
      "Base64, ca să nu fie în clar"], a: 0,
      e: "Funcțiile rapide (SHA-256) permit miliarde de încercări pe secundă pe GPU. Algoritmii de password hashing sunt lenți intenționat (Argon2id e costisitor și în memorie)." },
    { id: "sec-03", q: "Ce verifici la un JWT primit de la Keycloak?", o: [
      "Semnătura (JWKS), algoritmul, `exp`, `iss`, `aud`",
      "Doar că se poate decoda din base64 fără erori",
      "Doar câmpul `sub`, care identifică userul",
      "Nimic: dacă vine pe HTTPS, e valid"], a: 0,
      e: "Semnătura se verifică cu cheia publică din JWKS, iar algoritmul dintr-o listă permisă. Decodarea nu dovedește nimic. Atacuri clasice: `alg: none`, confuzia RS256/HS256. JWT-ul e semnat, nu criptat: oricine îi poate citi conținutul." },
    { id: "sec-04", q: "OAuth2 vs OpenID Connect?", o: [
      "OAuth2 = autorizare (access token); OIDC = identitate (ID token)",
      "Sunt două nume pentru același protocol, din versiuni diferite",
      "OIDC e algoritmul de semnare a token-urilor OAuth2",
      "OAuth2 funcționează doar cu furnizori publici, ca Google"], a: 0,
      e: "OAuth2 = autorizare delegată pentru API-uri; OIDC adaugă identitatea peste OAuth2. Keycloak le implementează pe amândouă. Authorization Code + PKCE pentru aplicații web, SPA și mobile; Client Credentials între servicii." },
    { id: "sec-05", q: "Cum rulezi o comandă de sistem cu un argument venit de la user?", o: [
      "`subprocess.run([\"ping\", \"-c\", \"1\", host])`",
      "`os.system(f\"ping -c 1 {host}\")`, după `host.strip()`",
      "`subprocess.run(f\"ping -c 1 {host}\", shell=True)`",
      "`subprocess.run(\"ping -c 1 \" + host, shell=True)`"], a: 0,
      e: "Cu shell, `host = \"8.8.8.8; rm -rf /\"` devine command injection. Lista de argumente nu trece prin shell; validezi oricum `host`." },
    { id: "sec-06", q: "Un endpoint descarcă un fișier de la un URL dat de user. Ce vulnerabilitate te îngrijorează?", o: [
      "SSRF: serverul e folosit să acceseze servicii interne",
      "XSS: URL-ul poate injecta script în pagina clientului",
      "CSRF: un alt site poate declanșa descărcarea în numele userului",
      "Clickjacking: pagina de descărcare poate fi pusă într-un iframe"], a: 0,
      e: "De exemplu metadata la 169.254.169.254. Mitigări: allowlist de domenii, rezolvi DNS și blochezi IP-urile private și link-local, controlezi redirect-urile, IMDSv2 pe AWS. În OWASP 2025, SSRF a intrat sub Broken Access Control." },
    { id: "sec-07", q: "Compari un token primit cu cel așteptat. Ce funcție folosești?", o: [
      "`hmac.compare_digest(a, b)`",
      "`a == b`, care e suficient pentru stringuri",
      "`a is b`, ca să eviți comparația caracter cu caracter",
      "`hashlib.sha256(a) == hashlib.sha256(b)`"], a: 0,
      e: "Comparația în timp constant evită timing attacks; `==` se oprește la primul caracter diferit. Pentru generarea token-urilor: modulul `secrets`, nu `random`." },
    { id: "sec-08", q: "Ce categorie e pe primul loc în OWASP Top 10, atât în 2021, cât și în 2025?", o: ["Broken Access Control", "Injection", "Cross-Site Scripting", "Security Misconfiguration"], a: 0,
      e: "Ex.: IDOR – `GET /alerts/123` întoarce alerta altui tenant pentru că verifici autentificarea, dar nu dreptul asupra obiectului. În 2025, Security Misconfiguration e pe 2, iar Injection a coborât pe 5." },
    { id: "sec-09", q: "Ce înseamnă least privilege pentru userul de DB al aplicației?", o: [
      "Doar drepturile de care are nevoie, pe tabelele ei",
      "Superuser, ca să nu apară erori de permisiuni",
      "Un user comun pentru toate serviciile, ca să fie ușor de rotit",
      "Fără parolă, dacă DB-ul e în rețeaua internă"], a: 0,
      e: "Migrațiile rulează cu alt rol. Dacă aplicația e compromisă (de exemplu prin SQL injection), atacatorul are doar drepturile ei. Defense in depth." },
    { id: "sec-10", q: "Unde ții un API key pentru un serviciu extern?", o: [
      "Într-un secret manager, injectat la runtime, cu rotație",
      "Hardcodat în cod, dacă repo-ul e privat și protejat",
      "Într-un `.env` comis în git, într-un repo privat",
      "În imaginea Docker, ca variabilă de mediu la build"], a: 0,
      e: "Plus acces auditat. Repo-urile private se clonează pe laptopuri și apar în logurile de CI. Adaugi scanare de secrete în pipeline (secret detection în GitLab)." },
    { id: "sec-11", q: "Ce categorie nouă a apărut în OWASP Top 10:2025 și te privește direct ca dezvoltator Python?", o: [
      "Software Supply Chain Failures",
      "Server-Side Request Forgery, ca categorie separată",
      "Cross-Site Scripting, separat de Injection",
      "Buffer Overflow în extensiile native"], a: 0,
      e: "Practic: dependențe fixate (lock file), scanare (pip-audit, dependency scanning în GitLab), surse de pachete de încredere, artefacte semnate." }
  ]);

  Q("domain", [
    { id: "dom-01", q: "Ce face, pe scurt, Onapsis Defend?", o: [
      "Monitorizare continuă și detecție de amenințări pentru SAP",
      "Antivirus pentru stațiile angajaților care folosesc SAP",
      "Firewall de rețea pentru data center-ele clienților",
      "Backup și restore pentru bazele de date SAP"], a: 0,
      e: "Peste 2.600 de reguli de detecție, pe ABAP, Java, HANA, SAProuter și cloud (RISE, BTP), cu alerte trimise în SIEM-ul clientului. Rolul tău: serviciile Python din spatele detecției." },
    { id: "dom-02", q: "Ce e SAP, în contextul Onapsis?", o: [
      "Un ERP: finanțe, supply chain și HR în companii mari",
      "Un limbaj de programare pentru microservicii enterprise în cloud",
      "Un sistem de operare pentru serverele din data center",
      "Un standard de criptare pentru tranzacții financiare"], a: 0,
      e: "De aici „business-critical applications”: o compromitere lovește direct operațiunile. ABAP e limbajul SAP; S/4HANA e generația curentă." },
    { id: "dom-03", q: "Regula „cel puțin 5 login-uri eșuate pentru același user în 2 minute, urmate de unul reușit” e un exemplu de:", o: [
      "Detecție cu prag, fereastră de timp și corelare",
      "Detecție pe baza semnăturii unui malware cunoscut",
      "Scanare periodică de vulnerabilități pe sistemul SAP",
      "Analiză statică a codului ABAP custom, înainte de deploy"], a: 0,
      e: "Posibil brute force reușit. Implementare: stare per user într-o fereastră glisantă (deque în memorie sau sorted set în Redis), evenimente ordonate per sursă, deduplicare de alerte. Vezi kata 1." },
    { id: "dom-04", q: "De ce sunt scumpe fals-pozitivele într-un produs de detecție?", o: [
      "„Alert fatigue”: analiștii ajung să ignore alertele",
      "Ocupă mult spațiu pe disc în baza de date a alertelor",
      "Încetinesc sistemul SAP pe care agentul îl monitorizează",
      "Nu sunt scumpe, dacă sunt marcate și închise automat"], a: 0,
      e: "Iar alertele reale se pierd printre ele. O regulă bună echilibrează precizia și recall-ul; contextul din alertă (cine, ce sistem, ce criticitate) scurtează triajul." },
    { id: "dom-05", q: "Ce e un SIEM?", o: [
      "O platformă care adună și corelează evenimente de securitate",
      "Un firewall de nouă generație, cu inspecție profundă de pachete",
      "Protocolul prin care sistemele SAP își trimit logurile",
      "Un sistem de backup și arhivare pentru logurile de securitate"], a: 0,
      e: "Exemple: Splunk, Microsoft Sentinel. SIEM-urile generice nu înțeleg contextul SAP; un produs specializat face detecția și trimite alerte curate în SIEM-ul clientului." },
    { id: "dom-06", q: "Ce e MITRE ATT&CK?", o: [
      "Un catalog al tacticilor și tehnicilor atacatorilor",
      "Un antivirus open-source dezvoltat de MITRE pentru servere",
      "Un standard de criptare pentru comunicații militare",
      "Un tip de atac DDoS documentat de MITRE"], a: 0,
      e: "Folosită ca taxonomie comună: maparea regulilor la tehnici ATT&CK arată acoperirea (ce detectezi) și ajută comunicarea cu SOC-ul." },
    { id: "dom-07", q: "Evenimentele din același sistem SAP trebuie procesate în ordine pentru corelare, dar ai mulți workeri. Abordarea?", o: [
      "Partiționezi după system_id, pe cozi cu câte un consumator",
      "Un singur worker pentru toate evenimentele tuturor clienților",
      "Ignori ordinea; corelarea o face analistul în UI",
      "Sortezi toate evenimentele o dată pe zi, înainte de detecție"], a: 0,
      e: "Paralelismul rămâne între sisteme. Același principiu ca partițiile Kafka sau routing-ul consistent pe cozi RabbitMQ. Plus timestamp-uri de la sursă și toleranță la evenimente întârziate." },
    { id: "dom-08", q: "Ce înseamnă „pre-patch protection” în Defend?", o: [
      "Detectezi exploatarea vulnerabilității până la patch",
      "Aplici automat patch-urile SAP în producție, fără downtime",
      "Blochezi instalarea patch-urilor neverificate",
      "Testezi patch-urile într-un mediu izolat înainte de producție"], a: 0,
      e: "Clienții SAP aplică patch-urile cu întârziere (sisteme critice, ferestre de mentenanță). Regulile de detecție acoperă intervalul." }
  ]);

  Q("design", [
    { id: "des-01", q: "Scrii în DB și publici un eveniment în RabbitMQ. Dacă publicarea eșuează după commit, evenimentul se pierde. Ce pattern rezolvă asta?", o: [
      "Transactional outbox, în aceeași tranzacție cu datele",
      "Publici evenimentul înainte de commit, ca să nu-l pierzi",
      "Retry infinit al publicării, chiar în request-ul HTTP",
      "Two-phase commit distribuit între Postgres și RabbitMQ"], a: 0,
      e: "Un relay citește tabela outbox și publică. Elimină „dual write”-ul. Relay-ul poate publica de două ori, deci consumatorii trebuie să fie idempotenți. Alternativ: CDC (Debezium) pe WAL." },
    { id: "des-02", q: "Exactly-once end-to-end într-un sistem distribuit, în practică:", o: [
      "At-least-once plus procesare idempotentă",
      "E garantat de orice broker modern, prin confirmări",
      "Se obține cu at-most-once și fără retry",
      "Nu se poate apropia, deci duplicatele se acceptă"], a: 0,
      e: "„Effectively once”: rețeaua poate pierde confirmarea după ce efectul s-a produs; retry-ul produce duplicat. Deduplicarea la consumator (cheie unică) închide bucla." },
    { id: "des-03", q: "Un serviciu extern e căzut, request-urile tale stau 30 s în timeout și îți epuizează workerii. Ce pattern?", o: [
      "Circuit breaker + timeouts scurte: eșuezi rapid o vreme",
      "Mărești timeout-ul la 120 s, ca apelurile să reușească",
      "Retry imediat și fără limită, până revine serviciul",
      "Mai mulți workeri, ca să compensezi cei blocați"], a: 0,
      e: "După N eșecuri nu mai încerci o perioadă și degradezi grațios. Retry-urile fără backoff amplifică problema. Bulkheads (pool-uri separate per dependență) împiedică o dependență să consume toate resursele." },
    { id: "des-04", q: "Cum scalezi workerii care consumă o coadă?", o: [
      "Orizontal, după lungimea cozii (workeri stateless)",
      "Doar vertical, cu un singur worker mai mare",
      "După CPU-ul serviciului de API care publică mesajele în coadă",
      "Nu se pot scala fără downtime, din cauza ack-urilor"], a: 0,
      e: "Te uiți și la vârsta celui mai vechi mesaj. Atenție la resursele din aval: 100 de workeri = peste 100 de conexiuni DB (PgBouncer) și presiune pe dependențe." },
    { id: "des-05", q: "Un client retrimite un POST de creare a unei alerte după un timeout de rețea. Cum eviți duplicatul?", o: [
      "Idempotency key de la client, stocat împreună cu rezultatul",
      "Imposibil de evitat: duplicatele țin de rețea",
      "Interzici retry-urile pe client pentru request-uri POST",
      "Ștergi duplicatele cu un job de noapte"], a: 0,
      e: "La o cerere repetată cu aceeași cheie returnezi același rezultat. Pattern folosit de API-urile de plăți; cheia se stochează cu constrângere unică și TTL." },
    { id: "des-06", q: "Izolare multi-tenant în Postgres, de la cea mai partajată la cea mai izolată:", o: [
      "`tenant_id` (+ RLS) → schema per tenant → bază de date per tenant",
      "Bază de date per tenant → schema per tenant → `tenant_id` (+ RLS)",
      "Doar coloana `tenant_id` e posibilă în Postgres",
      "Doar baza de date per tenant e sigură pentru date sensibile"], a: 0,
      e: "RLS = row-level security. Trade-off: cost și operare vs izolare și „noisy neighbour”. Pentru datele de securitate ale clienților, izolarea e un argument serios." },
    { id: "des-07", q: "După o cădere, retry-urile tuturor clienților lovesc simultan serviciul revenit și îl pică din nou. Ce schimbi?", o: [
      "Backoff exponențial cu jitter și o limită de încercări",
      "Retry imediat, de mai multe ori, până trece",
      "Timeout mai mare la clienți, ca să nu mai reîncerce",
      "Mai multe replici, fără alte schimbări"], a: 0,
      e: "Thundering herd. Jitter-ul împrăștie reîncercările în timp, limita oprește bucla, iar un circuit breaker dă timp de revenire." }
  ]);

  Q("perf", [
    { id: "pf-01", q: "Un job de procesare a devenit lent. Primul pas?", o: [
      "Profilezi, ca să vezi unde se duce timpul",
      "Îl rescrii în Rust, unde codul e oricum mai rapid",
      "Adaugi threaduri, ca să folosești toate core-urile",
      "Adaugi cache peste tot unde se citesc date"], a: 0,
      e: "Fără măsurare atacii de obicei partea greșită. cProfile pentru rulări locale; py-spy se atașează la un proces care rulează deja, fără restart." },
    { id: "pf-02", q: "Inserezi 1M de evenimente în Postgres cu commit după fiecare. Cea mai mare îmbunătățire?", o: [
      "Loturi: mii de rânduri per insert într-o tranzacție, sau COPY",
      "Mai multe threaduri, fiecare tot cu commit per rând",
      "Index pe fiecare coloană, ca inserturile să fie găsite repede",
      "Mai mult RAM pe client, ca să țină tot lotul în memorie"], a: 0,
      e: "Fiecare commit = un round-trip + fsync pe WAL. Loturile amortizează costul fix per operație." },
    { id: "pf-03", q: "Agregi un CSV de 10M de rânduri cu o buclă Python pe fiecare rând. Ce accelerează de obicei cel mai mult?", o: [
      "Operații vectorizate (pandas, NumPy, Polars), în cod nativ",
      "Threaduri peste bucla Python, câte unul per core",
      "Recursivitate în locul buclei, ca să eviți overhead-ul",
      "Mai multe `print`-uri ca să vezi progresul"], a: 0,
      e: "Vectorizarea mută bucla în C sau Rust. Threadurile nu ajută o buclă Python CPU-bound (GIL)." },
    { id: "pf-04", q: "Ce e backpressure?", o: [
      "Consumatorul lent îl frânează pe producător",
      "Presiunea pe disc la scrieri mari, măsurată în IOPS",
      "Un tip de retry cu întârziere crescătoare între încercări",
      "Compresia datelor între servicii, ca să reduci traficul"], a: 0,
      e: "Așa nu se acumulează memorie și latență. Exemple: `queue.Queue(maxsize=N)` sau `asyncio.Queue(maxsize=N)` blochează `put` când e plină; prefetch în RabbitMQ; limitarea ingestiei când workerii nu țin pasul." },
    { id: "pf-05", q: "Citești 5M de rânduri cu SQLAlchemy ORM și memoria explodează. Ce faci?", o: [
      "Streaming: `yield_per` (cursor server-side) și loturi",
      "`.all()`, apoi procesezi lista în bucăți de câte 1000",
      "Mărești memoria containerului la dublul datelor",
      "Dezactivezi garbage collector-ul pe durata citirii"], a: 0,
      e: "`execution_options(yield_per=1000)`. `.all()` materializează tot, plus obiectele ORM din identity map. Pentru ETL ia în calcul Core (tupluri, fără obiecte)." },
    { id: "pf-06", q: "Paralelizezi cu `ProcessPoolExecutor.map` milioane de task-uri foarte mici și e mai lent decât serial. De ce?", o: [
      "Overhead-ul de pickling/IPC per task domină",
      "GIL-ul e partajat între procese și le blochează",
      "Procesele nu pot rula în paralel în Python",
      "`map` serializează execuția, spre deosebire de `submit`"], a: 0,
      e: "Fiecare task traversează granița de proces (pickling + IPC). Cu un `chunksize` mare trimiți loturi: mai puține mesaje, overhead amortizat." },
    { id: "pf-07", q: "Ce profiler poți atașa unui proces Python din producție, fără restart?", o: [
      "py-spy (sampling profiler)",
      "cProfile, prin `python -m cProfile`",
      "pdb, pus pe pauză din exterior",
      "tracemalloc, activat la runtime"], a: 0,
      e: "py-spy citește stack-urile din exterior (`py-spy top --pid`, `py-spy dump`). cProfile trebuie pornit în proces (deci restart) și adaugă overhead." }
  ]);

  Q("dbmodels", [
    { id: "dbm-01", tag: "formulare", q: "Care formulare e corectă la interviu?", o: [
      "„Postgres ține sute de milioane de rânduri cu indexuri bune; aleg NoSQL pentru un model de acces anume.”",
      "„Bazele relaționale devin ineficiente peste câteva milioane de rânduri, de aceea la volume mari trec pe NoSQL.”",
      "„NoSQL e mereu mai rapid decât SQL, pentru că nu are JOIN-uri și nici scheme de respectat.”",
      "„NoSQL nu are nicio garanție de consistență, deci pentru date de business nu-l folosesc niciodată.”"], a: 0,
      e: "Exact formularea slabă de la Lateral. Motivele reale pentru NoSQL: modelul de acces, scalarea orizontală a scrierilor, schema flexibilă, latența." },
    { id: "dbm-02", q: "Aplicația are useri, facturi și căutare full-text în loguri. Ce stochezi unde?", o: [
      "Useri și facturi în Postgres, logurile în Elasticsearch",
      "Totul în Elasticsearch, pentru că e mai rapid la citire",
      "Facturile în Redis (rapid), userii și logurile în Elasticsearch",
      "Totul în MongoDB, ca să nu ai nevoie de schemă și migrații"], a: 0,
      e: "Facturile cer tranzacții și integritate → relațional. Logurile cer full-text și agregări pe volum mare → Elasticsearch, ca replică reconstruibilă (brutele eventual în S3), nu sursă de adevăr." },
    { id: "dbm-03", q: "Ce înseamnă ACID?", o: ["Atomicity, Consistency, Isolation, Durability", "Availability, Consistency, Isolation, Distribution", "Atomicity, Caching, Indexing, Durability", "Asynchronous, Concurrent, Isolated, Distributed"], a: 0,
      e: "Atomic: totul sau nimic. Consistent: constrângerile rămân valide. Izolat: tranzacțiile concurente nu se calcă (după nivelul de izolare). Durabil: după COMMIT, datele supraviețuiesc unui crash (WAL)." },
    { id: "dbm-04", q: "De ce Elasticsearch e rar sursa primară de adevăr?", o: [
      "Nu are tranzacții multi-document și e doar near-real-time",
      "Nu poate stoca documente JSON imbricate pe mai multe niveluri",
      "Nu suportă mai mult de un milion de documente per index",
      "Nu are API HTTP, doar un client binar proprietar"], a: 0,
      e: "Plus: o schimbare de mapping cere reindexare. E optimizat pentru căutare și agregări. Scrii în Postgres, propagi în Elastic (outbox, CDC, coadă) și poți reconstrui indexul oricând." },
    { id: "dbm-05", q: "Teorema CAP: în prezența unei partiții de rețea, un sistem distribuit…", o: [
      "trebuie să aleagă între consistență și disponibilitate",
      "poate avea consistență, disponibilitate și toleranță la partiții simultan",
      "pierde mereu o parte din datele scrise în timpul partiției",
      "devine automat eventual consistent, fără să piardă nimic"], a: 0,
      e: "CAP vorbește despre comportamentul la partiție. PACELC adaugă: fără partiție, alegi între latență și consistență. Un Postgres cu un singur primar alege consistența." },
    { id: "dbm-06", q: "Când alegi JSONB în Postgres în locul unui document store separat?", o: [
      "Când ai câmpuri variabile, dar vrei tranzacții și JOIN-uri",
      "Niciodată: JSONB e mai lent decât un text simplu cu JSON",
      "Când ai nevoie de chei străine pe fiecare câmp intern",
      "Doar pentru fișiere binare mari, ca imagini sau PDF-uri"], a: 0,
      e: "De exemplu payload-ul unui eveniment. Câmpurile stabile rămân coloane, partea variabilă stă în JSONB: un sistem în loc de două." },
    { id: "dbm-07", q: "Unde ții starea efemeră cu TTL (sesiuni, rate limits, lock-uri distribuite)?", o: ["Redis", "Postgres, cu un job de ștergere", "Elasticsearch", "S3"], a: 0,
      e: "Redis e în memorie, cu TTL nativ și operații atomice (INCR, `SET NX PX`). Pierderea lui nu trebuie să însemne pierderea datelor de business." },
    { id: "dbm-08", q: "Ce e consistența eventuală?", o: [
      "Replicile converg în timp; între timp poți citi date vechi",
      "Datele devin consistente o dată pe zi, după un job de reconciliere",
      "Datele nu ajung niciodată consistente între replici",
      "Fiecare citire vede ultima scriere, pe orice replică"], a: 0,
      e: "Converg dacă scrierile se opresc. „Fiecare citire vede ultima scriere” descrie consistența puternică. Replicile de citire Postgres (asincrone) sunt și ele eventual consistente: „read your writes” se gândește explicit." }
  ]);

  Q("frontend", [
    { id: "fe-01", q: "De ce ai migra un proiect React mare de la JS la TS?", o: [
      "Erori prinse la compilare și refactoring mai sigur",
      "TypeScript rulează mai repede în browser decât JavaScript",
      "TypeScript validează automat datele de la API la runtime",
      "React nu mai suportă JavaScript simplu din versiunea 19"], a: 0,
      e: "Contează mai ales în echipă. Tipurile dispar la runtime: datele externe tot trebuie validate (zod) sau tipurile generate din schema OpenAPI/GraphQL." },
    { id: "fe-02", q: "Un Context cu `value={{ user, setUser }}` re-randează toți consumatorii la fiecare render al providerului. De ce?", o: [
      "`value` e un obiect nou la fiecare render; îl memoizezi",
      "Context e lent prin design și trebuie înlocuit cu Redux sau MobX",
      "Lipsește `key` pe provider, deci React îl recreează",
      "Lipsește un `useEffect` care să sincronizeze consumatorii"], a: 0,
      e: "Consumatorii văd o valoare „schimbată”. Depanezi cu React DevTools Profiler. Pentru stare globală cu update-uri dese: un store cu selectori (Zustand)." },
    { id: "fe-03", q: "De ce nu folosești indexul ca `key` într-o listă care se reordonează?", o: [
      "Starea e legată de key; la reordonare, se amestecă",
      "E interzis de sintaxa JSX și dă eroare la compilare",
      "Încetinește compilarea listelor mari cu Babel",
      "Nu e nicio problemă dacă lista are sub 100 de elemente afișate"], a: 0,
      e: "Starea unei componente ajunge la elementul greșit. Folosești un ID stabil din date." },
    { id: "fe-04", q: "`staleTime` vs `gcTime` în TanStack Query?", o: [
      "staleTime: cât datele sunt proaspete; gcTime: cât stau în cache",
      "Sunt identice; gcTime e doar numele nou pentru staleTime",
      "gcTime e timeout-ul request-ului, iar staleTime e cel al retry-ului",
      "staleTime e intervalul de polling, gcTime al curățării"], a: 0,
      e: "Cât timp datele sunt proaspete nu se face refetch; gcTime e cât stau datele nefolosite în cache. Implicit staleTime = 0 (refetch la mount sau focus), gcTime = 5 minute." }
  ]);
})(window.PREP);
