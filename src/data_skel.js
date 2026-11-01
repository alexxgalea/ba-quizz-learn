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
    id: "s-docker-multistage", m: "docker", lang: "docker", st: true,
    t: "Dockerfile multi-stage, non-root",
    p: "Scrie un `Dockerfile` pentru o aplicație FastAPI (`requirements.txt`, `main.py`) cu două etape: una care instalează dependențele și una de rulare. Imaginea finală rulează ca utilizator non-root și pornește `uvicorn`.",
    k: [
      "Etape numite (`FROM … AS build`, `FROM … AS runtime`); etapa finală ia doar rezultatul, cu `COPY --from=build`, deci uneltele de build nu ajung în imagine.",
      "`USER` non-root în etapa finală, cu utilizatorul creat mai devreme (`useradd`) și pus înaintea lui `CMD`.",
      "Ordinea pentru cache: `COPY requirements.txt` și `pip install` vin înaintea lui `COPY . .`, ca dependențele să nu se reinstaleze la fiecare schimbare de cod.",
      "`CMD` în forma exec (listă JSON): procesul primește SIGTERM de la `docker stop`. Imaginile de bază au tag fixat, nu `latest`."
    ]
  },
  {
    id: "s-docker-compose", m: "docker", lang: "yaml", st: true,
    t: "Compose cu healthcheck și depends_on",
    p: "Scrie un `compose.yaml` cu două servicii: `db` (Postgres 16, cu volum pentru date) și `api` (construit din `Dockerfile`-ul curent, port 8000). `api` pornește abia când `db` poate primi conexiuni și se conectează la ea prin variabila `DB_URL`.",
    k: [
      "`healthcheck` pe `db`: `test` cu `pg_isready`, plus `interval`, `timeout` și `retries`.",
      "`depends_on` în forma lungă, cu `condition: service_healthy`. Forma scurtă așteaptă doar pornirea containerului, nu starea lui sănătoasă.",
      "`api` ajunge la bază prin numele serviciului (`@db`), nu prin `localhost`: în container, `localhost` e containerul însuși.",
      "Datele stau într-un volum numit, declarat în `volumes:` de sus. Porturile sunt între ghilimele (`\"8000:8000\"`), iar imaginile au tag fixat."
    ]
  },
  {
    id: "s-ops-json-log", m: "ops", lang: "py",
    t: "Logging structurat: JSON cu extra",
    p: "Scrie un `JsonFormatter` pentru `logging`: fiecare eveniment e un obiect JSON pe o singură linie, cu `level`, `logger`, `msg` și câmpurile trimise prin `extra=`; o excepție intră în câmpul `exc`. Montează-l pe un `StreamHandler` al logger-ului `app`.",
    k: [
      "`format(record)` întoarce `json.dumps(...)`: un obiect JSON pe linie, pe care un agregator îl parsează direct.",
      "Mesajul vine din `record.getMessage()` (aplică argumentele `%`), nu din `record.msg`.",
      "Câmpurile din `extra=` sunt atribute ale `LogRecord`: le iei pe cele care nu sunt în `vars(logging.makeLogRecord({}))` (plus `message` și `asctime`). `default=str` împiedică un tip neserializabil să strice linia.",
      "Excepția intră în câmp prin `self.formatException(record.exc_info)`, ca un traceback pe mai multe rânduri să nu spargă linia unică."
    ]
  },
  {
    id: "s-ops-gitlab-ci", m: "ops", lang: "yaml", st: true,
    t: ".gitlab-ci.yml minim: test și build",
    p: "Scrie un `.gitlab-ci.yml` cu două etape. `test` instalează dependențele din `requirements.txt` și rulează `pytest`, cu cache pentru pip. `build` construiește imaginea Docker și rulează doar pe ramura implicită.",
    k: [
      "`stages: [test, build]`; fiecare job are `stage:` și `script:` (listă de comenzi). Imaginea implicită stă în `default:`, cu tag fixat, nu `latest`.",
      "Cache pentru pip: `PIP_CACHE_DIR` în `$CI_PROJECT_DIR`, `cache:paths` pe același director și `key:files` pe `requirements.txt`. GitLab păstrează în cache doar căi din proiect.",
      "`build` folosește imaginea `docker:…-cli` cu serviciul `docker:…-dind` și `DOCKER_TLS_CERTDIR`. Docker-in-Docker cere un runner privilegiat.",
      "Imaginea poartă tag-ul `$CI_COMMIT_SHORT_SHA`, nu `latest`, iar `rules: - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH` o ține doar pe ramura implicită."
    ]
  },
  {
    id: "s-graphql-dataloader", m: "graphql", lang: "py",
    t: "Strawberry: resolver cu DataLoader",
    p: "Ai `async fetch_authors(ids)` (o singură interogare cu `IN`, întoarce rânduri cu `id` și `name`) și `async fetch_books()` (rânduri cu `title` și `author_id`). Scrie schema Strawberry cu `Query.books` și cu `Book.author` rezolvat printr-un `DataLoader`, astfel încât `{ books { title author { name } } }` să cheme `fetch_authors` o singură dată, oricâte cărți ar fi.",
    k: [
      "`load_fn` e `async`, primește lista de chei și întoarce o listă de aceeași lungime, în ordinea cheilor (nu a rândurilor din bază): dict după `id` și `by_id.get(k)` pentru cheile lipsă.",
      "Resolverul `Book.author` e `async` și face `await loader.load(key)`, fără interogare proprie: loadurile din aceeași cerere se adună într-un singur apel în lot.",
      "Loaderul se creează la fiecare cerere (în contextul cererii, citit din `info.context`), nu global: cache-ul lui ar păstra valori vechi între cereri.",
      "`author_id` e `strawberry.Private`, deci nu apare în schemă. O cheie lipsă dă `None`, nu o excepție care ar strica tot lotul."
    ]
  },
  {
    id: "s-django-orm", m: "django", lang: "py",
    t: "Django ORM: select_related și prefetch_related",
    p: "Ai modelele Django `Author(name)` și `Book(title, author=ForeignKey, related_name=\"books\")`, plus echivalentele SQLAlchemy 2.0 `SAAuthor` și `SABook` (relațiile `author` și `books`). Scrie patru funcții fără N+1: cărțile cu autorul lor și autorii cu numărul cărților lor, o dată în Django (`books_with_author`, `authors_with_books`) și o dată în SQLAlchemy (`sa_books_with_author(session)`, `sa_authors_with_books(session)`).",
    k: [
      "FK înainte (`Book.author`): `select_related(\"author\")` face un singur query cu JOIN. În SQLAlchemy, echivalentul e `joinedload(SABook.author)`.",
      "Colecție (`Author.books`): `prefetch_related(\"books\")` mai face un query, cu `IN`, și leagă rezultatele în Python (2 query-uri în total). În SQLAlchemy, `selectinload(SAAuthor.books)`.",
      "Citești relația deja încărcată (`a.books.all()`, `b.author`). Un `.filter()` sau `.order_by()` pe manager aruncă cache-ul și dă din nou un query per obiect.",
      "SQLAlchemy 2.0: `session.scalars(select(...).options(...))`, nu `session.query(...)`, care e API legacy."
    ]
  }
];
