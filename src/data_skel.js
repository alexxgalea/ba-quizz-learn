// Schelete: codul minim, canonic, al unui concept, scris din memorie în câteva minute (vezi CONTEXT.md).
// id: „s-<modul>-<nume>”; referința e secțiunea „=== <id> ===” din katas/skel_*.{py,mjs,ts,tsx,sql}, testată.
// t titlul, p cerința, k punctele esențiale (3–5), lang limbajul referinței (py, js, ts, tsx, sql, yaml, docker),
// v marcajul de versiune (de pildă „3.11+”), st = true pentru „verificat structural”, g grupa (doar la frontend: react, js, ts).
window.PREP.skel = [
  {
    id: "s-gil-bq", m: "gil", lang: "py",
    t: "Coadă blocantă mărginită cu Condition",
    p: "Scrie o clasă `BoundedQueue(cap)` cu `put(item)` și `get()`, sigure între thread-uri: `put` așteaptă cât coada e plină, `get` așteaptă cât e goală. Fără `queue.Queue`; doar `threading`.",
    k: [
      "`while`, nu `if`, în jurul lui `wait()`: la trezire condiția se verifică din nou (trezire falsă sau alt thread a luat locul).",
      "Ambele condiții (`not_full` / `not_empty`) folosesc același lock, iar bufferul se citește și se modifică doar sub el.",
      "`put` face `notify` pe condiția „nu e goală”, `get` pe „nu e plină”, după ce au schimbat bufferul.",
      "Bufferul e un `deque` (`popleft` în O(1)), iar o capacitate < 1 e respinsă."
    ]
  },
  {
    id: "s-celery-retry", m: "celery", lang: "py",
    t: "Task Celery cu retry, backoff și idempotență",
    p: "Scrie un task Celery `send_mail(key, to, body)` care trimite un email cu `deliver(to, body)` (poate arunca `ConnectionError`). Reîncearcă singur doar pe `ConnectionError`, de cel mult 5 ori, cu backoff exponențial și jitter. O a doua rulare cu aceeași `key` nu trimite emailul încă o dată.",
    k: [
      "`autoretry_for` primește doar erori tranzitorii (`ConnectionError`), nu `Exception`, iar `max_retries` oprește bucla (implicit 3, aici 5). Altfel un `ValueError` s-ar reîncerca degeaba.",
      "`retry_backoff=True` dă întârzieri de 1, 2, 4, 8 s…, plafonate de `retry_backoff_max` (implicit 600 s). `retry_jitter` (implicit `True`) le împrăștie, ca reîncercările să nu lovească serviciul deodată.",
      "Task-ul e idempotent: verifici `key` la început și o marchezi abia după efect. Marcată înainte, o cădere în `deliver` ar pierde emailul. Fără cheie, o reîncercare l-ar trimite de două ori.",
      "`acks_late=True` merge doar cu un task idempotent: mesajul se confirmă după rulare, deci un worker care cade îl primește din nou. Implicit, mesajul se confirmă înainte de rulare."
    ]
  },
  {
    id: "s-celery-canvas", m: "celery", lang: "py",
    t: "Lanț și grup de task-uri Celery",
    p: "Scrie trei task-uri Celery: `fetch(url)`, `parse(page)` și `store(n, url)`. Apoi `one(url)`, care le leagă într-un lanț, și `many(urls)`, care rulează în paralel lanțurile mai multor URL-uri.",
    k: [
      "`chain(a.s(), b.s(), …)` pasează rezultatul unui pas ca PRIMUL argument al următorului. Argumentele din `.s(...)` vin după el (`store(n, url)`), nu înainte.",
      "Pașii sunt semnături (`fetch.s(url)`), nu apeluri: nimic nu rulează până nu pornești lanțul cu `.delay()` sau `.apply_async()`.",
      "`group(...)` rulează semnături independente în paralel. Rezultatul e lista lor în ordinea intrării, nu a terminării.",
      "Un task nu așteaptă alt task cu `.delay().get()`: blochează worker-ul și poate bloca tot pool-ul (deadlock). Compui pașii cu `chain` și `group`.",
      "Corpul fiecărui task se testează apelat direct, ca o funcție obișnuită. Modul eager (`.apply()`) arată doar că pașii sunt legați bine, fiindcă emulează un worker."
    ]
  },
  {
    id: "s-security-sql", m: "security", lang: "py",
    t: "Query parametrizat, fără f-string",
    p: "Scrie `find_users(db, name, sort=\"id\")`, care caută utilizatorii după nume într-o conexiune `sqlite3` și îi ordonează după coloana `sort`. Numele vine de la utilizator, deci nu are voie să schimbe query-ul. `sort` e acceptat doar dacă e `id` sau `name`.",
    k: [
      "Valoarea merge printr-un placeholder (`?` la `sqlite3`, `%s` la `psycopg`) și un tuplu de parametri, niciodată printr-un f-string, `%` sau `+` pe textul SQL.",
      "Driverul trimite SQL-ul și valorile separat: `x' OR '1'='1` rămâne un text de comparat, nu sintaxă SQL, deci query-ul nu se schimbă.",
      "Un nume de coloană sau de tabel nu se poate parametriza. Îl verifici într-o listă albă (`SORT`) și abia apoi îl alipești; nu încerci să-l „escapezi”.",
      "Tuplul are virgulă: `(name,)`, nu `(name)`. Fără ea, driverul primește un șir și îl tratează ca pe o secvență de parametri."
    ]
  },
  {
    id: "s-security-pw", m: "security", lang: "py",
    t: "Hash de parolă cu salt și compare_digest",
    p: "Scrie `hash_pw(pw)` și `check_pw(pw, stored)`, doar cu biblioteca standard. Valoarea stocată conține costul, salt-ul și hash-ul. Verificarea nu scurge informații prin timpul de execuție.",
    k: [
      "Hash lent, derivat din parolă: `hashlib.pbkdf2_hmac` cu `sha256` și cel puțin 600 000 de iterații (OWASP), nu `sha256(pw)`, care se sparge rapid prin forță brută. Argon2id e prima alegere, dacă ai biblioteca.",
      "Salt aleator, unic la fiecare parolă (`os.urandom(16)`), păstrat lângă hash. Aceeași parolă dă hash-uri diferite, deci tabelele precalculate (rainbow tables) nu ajută.",
      "Compari cu `hmac.compare_digest`, nu cu `==`: timpul comparației nu depinde de poziția primei diferențe.",
      "Costul și salt-ul stau în valoarea stocată (`n$salt$hash`): verifici parolele vechi cu costul lor și poți crește costul mai târziu. Parola în clar nu se stochează și nu se loghează."
    ]
  },
  {
    id: "s-security-jwt", m: "security", lang: "py",
    t: "Verificare JWT cu algorithms, aud și exp",
    p: "Scrie `verify(token, key)`, care validează cu PyJWT un token HS256 primit de API-ul `api`, și `user_id(token, key)`, care întoarce `sub` sau `None` pentru orice token invalid.",
    k: [
      "`algorithms=[\"HS256\"]` explicit: serverul alege algoritmul, nu antetul tokenului. Lista respinge `alg: none` și orice alt algoritm; la RS256 previne și confuzia în care atacatorul semnează cu HS256, folosind cheia publică drept secret.",
      "`audience=` verifică `aud`: un token emis pentru alt serviciu e respins cu `InvalidAudienceError`, chiar dacă semnătura e bună.",
      "PyJWT verifică `exp` doar dacă tokenul îl are. `options={\"require\": [...]}` face `exp`, `aud` și `sub` obligatorii, altfel un token fără `exp` ar fi valid pentru totdeauna.",
      "Erorile se prind cu `jwt.InvalidTokenError` (baza tuturor) și devin 401. Nu folosești `verify_signature=False`, iar cheia vine din configurare, nu din cod."
    ]
  },
  {
    id: "s-runtime-slots", m: "runtime", lang: "py",
    t: "Memorie: __slots__ și generator",
    p: "Compară memoria a două clase cu aceleași atribute `x` și `y`: `Plain` (obișnuită) și `Slim` (cu `__slots__`). Scrie `size(obj)` cu `sys.getsizeof`, apoi `squares(n)`, un generator de pătrate care nu ține lista în memorie.",
    k: [
      "`__slots__ = (\"x\", \"y\")` declară atributele și elimină `__dict__` din instanță: mai puțină memorie la milioane de obiecte (din 3.11 câștigul e mai mic). Un atribut nedeclarat dă `AttributeError`.",
      "`sys.getsizeof` e superficial: măsoară doar obiectul, nu ce referă. La o instanță cu `__dict__` îl adaugi tu, iar la o listă nu intră elementele. Memoria reală a unui grup de obiecte o măsori cu `tracemalloc`.",
      "Generatorul (`yield`) produce un element pe rând, deci are aceeași mărime oricât de mare e `n`. Lista `[i * i for …]` ține toate elementele în memorie.",
      "Generatorul se consumă o singură dată: a doua trecere peste el e goală."
    ]
  }
];
