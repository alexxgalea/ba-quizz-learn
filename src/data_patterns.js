/* Pattern-uri de design: de ce există fiecare, când îl alegi, când nu, cum arată în Python și în React/TS, plus ce se confundă.
   Pagina din Studiu › Pattern-uri (vPatterns) și cardurile orale o-pat-* (modulul oop, exersate cu intervievatorul).
   `code`: cel mult 36 de caractere pe rând (verificat de validate.mjs), ca să încapă pe un telefon de 360 px. */
(function (P) {
  const R = String.raw;

  P.extra.patterns = {
    title: "Pattern-uri de design: de ce, când, când nu",
    intro: "Un pattern e numele unei soluții la o problemă care revine. La interviu nu începi cu numele: spui problema, apoi soluția, apoi prețul ei. Aproape toate pattern-urile servesc trei idei: depinzi de o interfață, nu de o clasă concretă; adaugi cod nou fără să modifici codul care merge (open/closed); compui obiecte în loc să moștenești. În Python multe devin o funcție, un dict sau un modul.",
    pick: [
      ["Aleg ce clasă creez după date (tip, config)", "Factory"],
      ["Obiect cu multe părți opționale, construit pas cu pas", "Builder"],
      ["O singură instanță partajată (config, pool)", "Un obiect creat la pornire și injectat, nu Singleton clasic"],
      ["API-uri externe cu forme diferite, codul meu vrea una singură", "Adapter"],
      ["Un subsistem complicat, vreau un singur punct de intrare", "Facade"],
      ["Adaug logging, retry sau cache fără să modific clasa", "Decorator"],
      ["Controlez accesul la un obiect scump: lazy, cache, permisiuni", "Proxy"],
      ["Aleg algoritmul la runtime (reguli, sortări, formate)", "Strategy"],
      ["Același flux, pași care diferă de la caz la caz", "Template Method"],
      ["Când se întâmplă X, reacționează mai multe părți", "Observer (în proces) / pub/sub (între servicii)"],
      ["Pun o operație în coadă, o reîncerc, o loghez", "Command"],
      ["Parcurg date mari fără să le încarc pe toate", "Iterator (generator)"],
      ["Cererea trece prin pași care o pot opri sau modifica", "Chain of Responsibility (middleware)"],
      ["Clasele își primesc colaboratorii din afară, ca să le testez", "Dependency Injection"],
      ["Ascund persistența de logica de business", "Repository + Unit of Work"]
    ],
    items: [
      { n: "Factory", g: "creațional",
        prob: "Codul trebuie să creeze un parser diferit după tipul fișierului. Dacă fiecare apelant face `if kind == \"csv\"`, același `if` se repetă peste tot.",
        why: "Un singur loc decide ce clasă concretă se creează. Apelantul cere „un parser pentru csv” și nu știe de clase; o variantă nouă înseamnă o linie nouă în factory.",
        when: "Clasa concretă depinde de date sau de config; vrei constructori alternativi (`from_dict`, `from_env`); configurezi aplicația într-o funcție (`create_app()`), ca testele să-și facă propria instanță.",
        not: "Când există o singură clasă și un constructor clar. O funcție sau un `@classmethod` ajung; o ierarhie de clase-factory e prea mult în Python.",
        code: R`PARSERS = {"json": JsonParser,
           "csv": CsvParser}

def make_parser(kind: str):
    return PARSERS[kind]()

p = make_parser("csv")`,
        fe: "Un `Record<Kind, ComponentType<Props>>` care alege componenta după tipul widget-ului: `const W = widgets[w.kind]; return <W {...w} />`.",
        leg: "`Finding.from_dict(d)` e un factory. În teste, `factory_boy` (sau o funcție `make_alert(**over)`) creează date valide cu valori implicite.",
        say: "Folosesc un factory când clasa concretă depinde de date: decizia stă într-un singur loc, iar codul care cere obiectul nu se schimbă când adaug o variantă." },
      { n: "Builder", g: "creațional",
        prob: "O interogare are filtre opționale: host, interval, severitate, sortare, limită. Un constructor cu zece parametri e greu de citit și ușor de greșit.",
        why: "Construiești obiectul pas cu pas, cu nume clare, și adaugi doar părțile de care ai nevoie. Fiecare pas întoarce builder-ul, deci lanțul se citește ca o propoziție.",
        when: "Interogări și cereri compuse din multe părți opționale: SQL, Elasticsearch, cereri HTTP complexe.",
        not: "În Python, argumentele cu nume și valorile implicite (sau un `@dataclass`) rezolvă de obicei problema fără builder.",
        code: R`stmt = (
    select(Alert)
    .where(Alert.host == "db1")
    .order_by(Alert.ts.desc())
    .limit(50)
)`,
        fe: "Query builder-ele (Knex) și obiectele de opțiuni: în TS, un obiect cu câmpuri opționale (`{ host?: string; limit?: number }`) ține locul builder-ului.",
        leg: "`Search().query(...).filter(...)` din elasticsearch-dsl și QuerySet-urile din Django (`filter().exclude().order_by()`) sunt builder-e: nimic nu rulează până nu ceri rezultatul.",
        say: "Builder-ul îl folosesc pentru obiecte cu multe părți opționale, cum sunt interogările. În Python, pentru obiecte simple, argumentele cu nume fac aceeași treabă." },
      { n: "Singleton", g: "creațional",
        prob: "Vrei o singură conexiune la pool sau o singură configurație pentru toată aplicația.",
        why: "Pattern-ul clasic garantează o singură instanță și un acces global. Problema e accesul global: orice cod o poate atinge, iar testele nu o pot înlocui ușor.",
        when: "Aproape niciodată în forma clasică. Ai nevoie de o singură instanță: o creezi o dată, la pornire, și o dai mai departe celor care au nevoie de ea.",
        not: "Nu scrii o metaclasă sau un `__new__` care întoarce aceeași instanță. Un modul Python se importă o singură dată, deci un obiect la nivel de modul e deja unic.",
        code: R`# config.py: modulul se
# importă o singură dată
settings = Settings()

# FastAPI: creat o dată,
# injectat unde trebuie
def get_settings():
    return settings`,
        fe: "Un modul ES se evaluează o singură dată, deci `export const api = createClient()` e o instanță unică. Pentru ce trebuie înlocuit în teste, îl dai prin Context.",
        leg: "Clientul Elasticsearch sau Redis creat o dată, la pornire (în `lifespan` la FastAPI), și refolosit: exact ce lipsea în golul tău de la FastAPI, unde un client nou pe cerere costă.",
        say: "Nu scriu Singleton clasic: creez obiectul o dată, la pornire, și îl injectez. Am aceeași instanță unică, dar dependența se vede și o pot înlocui în teste." },
      { n: "Adapter", g: "structural",
        prob: "Trimiți alerte în Splunk, Sentinel și QRadar. Fiecare are alt client și alt format, iar codul tău ar ajunge plin de `if siem == ...`.",
        why: "Codul tău depinde de o singură interfață (`send(alert)`). Fiecare adapter traduce acea interfață în API-ul unui sistem extern, deci un SIEM nou înseamnă o clasă nouă, fără să atingi restul.",
        when: "Integrezi biblioteci sau servicii externe cu forme diferite; înlocuiești un client vechi fără să modifici apelanții; în teste, un adapter fals înlocuiește serviciul real.",
        not: "Când există o singură integrare stabilă și nu o schimbi. Un strat în plus fără o a doua implementare e doar indirectare.",
        code: R`class SplunkAdapter:
    def __init__(self, client):
        self.client = client

    def send(self, alert):
        self.client.post_event(
            alert.to_splunk())`,
        fe: "O funcție care mapează răspunsul API-ului pe modelul din UI (`toAlertView(dto)`): componentele nu știu forma JSON-ului de pe server, iar o schimbare de API se repară într-un singur loc.",
        leg: "Bibliotecile client ale Keycloak se numesc chiar „adapters”: aduc protocolul OIDC la forma framework-ului tău.",
        say: "Adapter-ul aduce un API străin la interfața pe care o așteaptă codul meu. Restul aplicației depinde de interfață, deci o integrare nouă e o clasă nouă, nu o modificare peste tot." },
      { n: "Facade", g: "structural",
        prob: "O scanare înseamnă conexiune SSH, colectare, reguli și salvare. Fiecare endpoint care pornește o scanare repetă cei patru pași, în aceeași ordine.",
        why: "O singură clasă (sau un modul) oferă operația simplă (`run(host)`) și ascunde colaborarea dintre componente. Apelanții depind de fațadă, nu de cele patru piese.",
        when: "Un subsistem cu multe părți, pe care majoritatea apelanților îl folosesc la fel; o graniță clară între straturi (API → servicii).",
        not: "Când fațada ajunge să facă tot („god object”). Ea doar orchestrează; logica rămâne în componente.",
        code: R`class ScanFacade:
    def run(self, host):
        c = self.ssh.connect(host)
        d = self.collector.get(c)
        f = self.rules.check(d)
        self.repo.save(f)
        return f`,
        fe: "Un modul `api.ts` care ascunde `fetch`, token-ul, retry-ul și tratarea erorilor: componentele cheamă `api.getAlerts()`. Un hook ca `useAlerts()` peste TanStack Query e tot o fațadă.",
        leg: "Un serviciu în Django care orchestrează mai multe modele și un task Celery, chemat dintr-un `ViewSet` subțire.",
        say: "Facade-ul dă un punct de intrare simplu peste un subsistem complicat. Nu adaugă comportament, doar ascunde cum colaborează piesele." },
      { n: "Decorator", g: "structural",
        prob: "Vrei retry, logging și măsurarea timpului în jurul apelurilor către SIEM, fără să modifici fiecare client.",
        why: "Învelișul are aceeași interfață ca obiectul învelit și adaugă un comportament. Le poți combina (retry peste logging peste client) fără o clasă pentru fiecare combinație.",
        when: "Preocupări transversale: retry, cache, logging, metrici, autorizare.",
        not: "Diferența față de sintaxa `@` din Python: `@decorator` învelește o funcție la definire. E aceeași idee, dar pattern-ul clasic învelește un obiect la runtime. Nu stivui atât de multe straturi încât un bug să fie greu de urmărit.",
        code: R`def retry(fn):
    @functools.wraps(fn)
    def wrap(*a, **kw):
        for i in range(3):
            try:
                return fn(*a, **kw)
            except OSError:
                if i == 2: raise
    return wrap`,
        fe: "Un higher-order component (`withAuth(Page)`) sau `React.memo(Comp)` învelesc o componentă și păstrează interfața ei (props-urile). Azi, de obicei, un hook propriu face aceeași treabă.",
        leg: "`@login_required`, `@permission_classes` și `@shared_task` din Django, DRF și Celery; `@lru_cache` pentru cache.",
        say: "Decoratorul păstrează interfața și adaugă un comportament transversal, cum e retry sau cache. Îl pot combina cu alții fără să modific clasa." },
      { n: "Proxy", g: "structural",
        prob: "Un raport e scump de încărcat, dar majoritatea paginilor nu îl afișează.",
        why: "Proxy-ul are aceeași interfață ca obiectul real și controlează accesul la el: îl încarcă abia la nevoie (lazy), îl ține în cache, verifică permisiuni sau trimite apelul la distanță.",
        when: "Încărcare leneșă, cache, control de acces, obiecte la distanță (un client RPC), mock-uri în teste.",
        not: "Când nu ai ce controla: un proxy care doar pasează apelul mai departe e o clasă în plus.",
        code: R`class LazyReport:
    def __init__(self, load):
        self._load = load
        self._rows = None

    def rows(self):
        if self._rows is None:
            rows = self._load()
            self._rows = rows
        return self._rows`,
        fe: "`Proxy` e chiar un obiect din JavaScript: interceptează citirea și scrierea proprietăților. Reactivitatea din Vue 3 și MobX e construită pe el.",
        leg: "Relațiile lazy din SQLAlchemy și Django ORM încarcă datele abia la primul acces (de aici N+1). `unittest.mock.Mock` e un proxy folosit în teste.",
        say: "Proxy-ul arată ca obiectul real, dar controlează accesul la el: lazy, cache sau permisiuni. Spre deosebire de decorator, scopul lui e controlul, nu un comportament nou." },
      { n: "Strategy", g: "comportamental",
        prob: "Alertele se sortează după severitate, după timp sau după host, iar clientul alege. Cu `if/elif`, fiecare criteriu nou modifică aceeași funcție.",
        why: "Algoritmul devine un parametru: o funcție sau un obiect cu aceeași semnătură, ales la runtime. Fiecare strategie se testează separat, iar una nouă nu atinge codul existent.",
        when: "Mai multe variante ale aceluiași calcul (reguli de detecție, prețuri, formate de export, sortări), alese după config sau după client.",
        not: "Pentru 2–3 cazuri stabile, un `if/elif` e mai clar. În Python, o strategie e de obicei o funcție, nu o clasă cu o singură metodă.",
        code: R`def by_severity(a): return a.sev
def by_time(a): return a.ts

def ranked(alerts, key=by_severity):
    return sorted(alerts, key=key)

ranked(alerts, key=by_time)`,
        fe: "Un `Record<SortKey, (a: Row, b: Row) => number>` cu comparatoare, sau o funcție pasată ca prop (`renderItem`, `onValidate`).",
        leg: "Regulile de detecție într-un registry (dict de la nume la funcție, OOP-17); `authentication_classes` din DRF aleg strategia de autentificare.",
        say: "Strategy face din algoritm un parametru. Variantele se schimbă la runtime și se testează separat, iar în Python strategia e adesea doar o funcție." },
      { n: "Template Method", g: "comportamental",
        prob: "Toate verificările urmează aceiași pași (colectează, evaluează, raportează), dar colectarea diferă de la verificare la verificare.",
        why: "Clasa de bază fixează scheletul fluxului și ordinea pașilor; subclasele completează doar pașii care diferă. Fluxul nu se poate strica într-o subclasă.",
        when: "Fluxuri cu pași ficși și câteva puncte de extensie: framework-uri, clase de bază pentru teste sau joburi.",
        not: "Când variațiile se combină liber (un colector oarecare cu un evaluator oarecare). Atunci e mai bună compoziția: două strategii injectate.",
        code: R`class Check(ABC):
    def run(self, host):
        data = self.collect(host)
        return self.evaluate(data)

    @abstractmethod
    def collect(self, host): ...

    @abstractmethod
    def evaluate(self, data): ...`,
        fe: "În React nu: componentele nu se moștenesc. Partea comună o pui într-un hook sau într-o componentă care primește bucățile variabile ca props sau `children`.",
        leg: "`perform_create` și `get_queryset` din DRF, `get_context_data` din class-based views, `setUp` / `tearDown` din unittest: framework-ul ține fluxul, tu completezi pașii.",
        say: "Template Method fixează pașii în clasa de bază și lasă subclasele să completeze doar ce diferă. E moștenire; când variațiile se combină liber, prefer Strategy, adică compoziție." },
      { n: "Observer", g: "comportamental",
        prob: "La crearea unei alerte vrei email, o intrare în SIEM și un dashboard actualizat, fără ca `AlertService` să știe de fiecare.",
        why: "Subiectul ține o listă de ascultători și îi anunță la eveniment. Adaugi un ascultător nou fără să modifici subiectul.",
        when: "Mai multe reacții independente la același eveniment, în același proces.",
        not: "Când reacțiile sunt lente, în alt serviciu sau trebuie reîncercate: aici îți trebuie un broker (pub/sub). În proces, un ascultător lent sau o excepție în el oprește subiectul.",
        code: R`class Alerts:
    def __init__(self):
        self._subs = []

    def subscribe(self, fn):
        self._subs.append(fn)

    def created(self, alert):
        for fn in self._subs:
            fn(alert)`,
        fe: "`addEventListener`, un store la care te abonezi (`useSyncExternalStore(subscribe, getSnapshot)`), un `EventEmitter`.",
        leg: "Semnalele din Django (`post_save`) sunt Observer sincron, în același proces. Când reacția e lentă, handler-ul doar pune un task Celery în coadă.",
        say: "Observer decuplează evenimentul de reacții: subiectul nu știe cine ascultă. În proces e sincron; între servicii sau pentru muncă lentă folosesc un broker." },
      { n: "Command", g: "comportamental",
        prob: "O rescanare durează minute. Vrei s-o pui în coadă, s-o reîncerci la eroare și să vezi ce s-a cerut și când.",
        why: "Cererea devine un obiect, cu numele operației și argumentele ei. Un obiect se poate pune în coadă, serializa, loga, reîncerca sau anula.",
        when: "Cozi de joburi, retry, istoric și audit, undo/redo, operații trimise între procese.",
        not: "Pentru un apel direct și rapid, care nu trebuie nici amânat, nici reîncercat.",
        code: R`@app.task(bind=True,
          max_retries=3)
def rescan(self, host_id):
    ...

# comanda pleacă în coadă
rescan.delay(host_id=42)`,
        fe: "O acțiune din `useReducer` sau Redux (`{ type: \"add\", item }`) e o operație descrisă ca date: se poate loga, reda sau testa separat de UI.",
        leg: "Un mesaj Celery e o comandă serializată: numele task-ului plus argumentele. De aceea argumentele trebuie să fie mici și serializabile (id-uri, nu obiecte ORM).",
        say: "Command face din cerere un obiect, deci o pot pune în coadă, reîncerca și loga. Un task Celery e exact asta: numele operației și argumentele, trimise unui worker." },
      { n: "Iterator", g: "comportamental",
        prob: "Exporți milioane de rânduri din Elasticsearch. Dacă le încarci pe toate într-o listă, procesul rămâne fără memorie.",
        why: "Iteratorul dă elementele unul câte unul, la cerere, și ascunde cum sunt stocate sau paginate. Consumatorul scrie un simplu `for`.",
        when: "Date mari sau infinite, paginare, streaming, pipeline-uri pe pași.",
        not: "Când ai nevoie de toate datele deodată (sortare globală, `len`) sau de mai multe parcurgeri: un generator se consumă o singură dată.",
        code: R`def read_pages(fetch):
    page = 1
    while batch := fetch(page):
        yield from batch
        page += 1

for row in read_pages(api.get):
    handle(row)`,
        fe: "Generatoarele (`function*`), `for...of` și `for await...of` pentru fluxuri asincrone.",
        leg: "`helpers.scan` din clientul Elasticsearch e un generator peste scroll. Răspunsurile `StreamingResponse` din FastAPI primesc un generator.",
        say: "Un generator e iteratorul din Python: produce elementele la cerere, cu memorie constantă, iar paginarea rămâne ascunsă în el." },
      { n: "Chain of Responsibility", g: "comportamental",
        prob: "Fiecare cerere trebuie să treacă prin autentificare, rate limit și logging, iar oricare dintre ele o poate opri.",
        why: "Fiecare verigă face un singur lucru și decide: oprește cererea sau o trimite mai departe. Adaugi sau scoți o verigă fără să atingi endpoint-urile.",
        when: "Middleware HTTP, pipeline-uri de validare, interceptoare.",
        not: "Când ordinea verigilor contează și nu e evidentă: un lanț lung, cu efecte ascunse, e greu de depanat.",
        code: R`@app.middleware("http")
async def auth(request, call_next):
    if not request.headers.get(
            "authorization"):
        return JSONResponse(
            {"detail": "no"}, 401)
    return await call_next(request)`,
        fe: "Interceptoarele din Axios și middleware-ul din Redux sau Express.",
        leg: "Middleware-ul din Django; `authentication_classes` din DRF sunt încercate pe rând, până când una recunoaște utilizatorul.",
        say: "Middleware-ul e un lanț de responsabilitate: fiecare verigă poate opri cererea sau o poate trimite mai departe. Endpoint-urile rămân curate." },
      { n: "Dependency Injection", g: "arhitectural",
        prob: "`ScanService` își creează singur clientul SSH și repository-ul. În teste nu le poți înlocui fără `patch` peste tot.",
        why: "Colaboratorii vin din afară (în constructor sau ca parametri), deci în teste dai un fake, iar în producție schimbi implementarea fără să modifici clasa. Dependențele se văd în semnătură.",
        when: "Orice cod care vorbește cu exteriorul: DB, HTTP, cozi, ceas, configurație.",
        not: "Nu-ți trebuie un container DI în Python: parametrii din constructor și `Depends` din FastAPI ajung.",
        code: R`DB = Annotated[Session,
               Depends(get_db)]

@app.get("/alerts")
def list_alerts(db: DB):
    return db.scalars(
        select(Alert)).all()

# test: app.dependency_overrides
#   [get_db] = lambda: fake_db`,
        fe: "Context e injecția din React: un Provider dă valoarea, iar componentele o citesc fără prop drilling. În teste înfășori componenta într-un Provider cu o valoare falsă.",
        leg: "`Depends` din FastAPI, cu `dependency_overrides` în teste; fixture-urile din pytest sunt tot injecție (testul primește ce declară în parametri).",
        say: "Prin injecție, clasa își primește colaboratorii din afară. Dependențele se văd și le înlocuiesc ușor în teste; în FastAPI asta e `Depends`, în React e Context." },
      { n: "Repository + Unit of Work", g: "arhitectural",
        prob: "Logica de business face direct `session.query(...)` peste tot, deci nu o poți testa fără o bază de date și nu poți schimba modul de stocare.",
        why: "Repository-ul oferă operații pe colecție (`add`, `by_host`) și ascunde SQL-ul. Unit of Work strânge toate schimbările unei operații și le scrie împreună, într-o tranzacție.",
        when: "Logică de business care merită testată fără DB; mai multe surse de date; aplicații în care stratul de persistență se poate schimba.",
        not: "La un CRUD simplu, ORM-ul e deja un strat bun; un repository peste el doar repetă metodele.",
        code: R`class AlertRepo:
    def __init__(self, session):
        self.s = session

    def by_host(self, host):
        q = select(Alert).where(
            Alert.host == host)
        rows = self.s.scalars(q)
        return rows.all()`,
        fe: "Un modul de acces la date (`alertsApi`) peste care stau hook-urile; componentele nu știu de URL-uri.",
        leg: "`Session` din SQLAlchemy e un Unit of Work (OOP-18): urmărește obiectele și le scrie la `commit()`. Django ORM urmează alt pattern, Active Record: modelul se salvează singur (`alert.save()`).",
        say: "Repository-ul ascunde persistența în spatele unor operații de business. `Session` din SQLAlchemy face Unit of Work: strânge schimbările și le scrie împreună, la commit." }
    ],
    conf: [
      { h: "Adapter, Facade, Decorator, Proxy: toate învelesc ceva", t: "Diferă scopul, nu forma. **Adapter** schimbă interfața: codul tău vrea altă formă. **Facade** simplifică: un punct de intrare peste mai multe piese. **Decorator** păstrează interfața și adaugă un comportament. **Proxy** păstrează interfața și controlează accesul. Întrebarea de control: ce vrea apelantul? Altă formă, mai puțin, același lucru plus ceva sau același lucru, păzit?" },
      { h: "Factory, Builder sau constructor", t: "Constructorul (sau un `@dataclass`) e implicit. **Factory** când trebuie să decizi ce clasă sau ce configurație creezi. **Builder** când obiectul are multe părți opționale și se construiește pas cu pas. În Python, argumentele cu nume rezolvă multe cazuri pentru care în Java ai scrie un builder." },
      { h: "Strategy, Template Method sau if/elif", t: "`if/elif` pentru 2–3 cazuri stabile. **Strategy** e compoziție: algoritmul vine din afară și se schimbă la runtime. **Template Method** e moștenire: clasa de bază ține fluxul, subclasele completează pași. Când cazurile cresc, un registry de strategii (dict de la nume la funcție) adaugă reguli fără să modifice codul existent." },
      { h: "Observer sau pub/sub cu broker", t: "**Observer**: în același proces, sincron, subiectul își cheamă direct ascultătorii. **Pub/sub** (RabbitMQ, Redis, Kafka, Celery): publicatorul nu știe cine ascultă, consumatorii rulează în alte procese, livrarea e asincronă și, de obicei, „cel puțin o dată”, deci handler-ii trebuie să fie idempotenți. Broker-ul îl alegi pentru muncă lentă, retry, persistență și scalare pe workeri." },
      { h: "Dependency Injection, Singleton sau import global", t: "Toate dau „aceeași instanță”. **Singleton** și importul global ascund dependența: o vezi abia în corpul funcției și o înlocuiești în teste doar cu `patch`. **Injecția** o pune în semnătură: o vezi, o înlocuiești cu un fake, iar instanța unică o creezi o dată, la pornire." },
      { h: "Repository sau Active Record", t: "**Active Record** (Django ORM): modelul știe să se salveze (`alert.save()`), deci e simplu, dar business-ul e legat de DB. **Repository** + **Unit of Work** (SQLAlchemy `Session`): obiectele sunt simple, iar persistența stă separat, deci logica se testează fără bază de date. Prețul: mai mult cod de legătură." }
    ]
  };

  // Cardurile orale: aceleași idei, de spus cu voce tare (intervievatorul pune întrebări de continuare).
  const O = (m, list) => list.forEach(c => P.oral.push(Object.assign({ m }, c)));
  O("oop", [
    { id: "o-pat-1", q: "Adapter, Facade, Decorator și Proxy învelesc toate un alt obiect. Prin ce diferă? Dă câte un exemplu.", k: [
      "Adapter schimbă interfața: aduce un API străin la forma pe care o așteaptă codul tău (de exemplu un SIEM sau un client vechi)",
      "Facade simplifică: un singur punct de intrare peste mai multe componente (un serviciu de scanare, un modul `api.ts`)",
      "Decorator păstrează interfața și adaugă un comportament (retry, logging, cache); decoratorii se pot combina",
      "Proxy păstrează interfața și controlează accesul: încărcare leneșă, cache, permisiuni, obiect la distanță",
      "Criteriul e scopul: altă formă (Adapter), mai puțin (Facade), același lucru plus ceva (Decorator), același lucru, păzit (Proxy)"],
      model: "Toate patru învelesc un obiect, dar cu alt scop. Adapter-ul schimbă interfața: am trimis alerte în mai multe SIEM-uri, iar fiecare adapter traducea `send(alert)` în API-ul lui. Facade-ul simplifică: un `ScanService.run(host)` ascunde conexiunea, colectarea, regulile și salvarea. Decoratorul păstrează interfața și adaugă ceva, ca retry sau cache, și îl pot combina cu alții. Proxy-ul păstrează și el interfața, dar controlează accesul: încarcă datele abia la nevoie, ca relațiile lazy din ORM, sau verifică permisiuni." },
    { id: "o-pat-2", q: "Factory, Builder sau un constructor simplu: când alegi fiecare? Cum arată în Python?", k: [
      "Constructorul simplu (sau un `@dataclass`) e implicit, cât timp obiectul se creează dintr-un set clar de argumente",
      "Factory decide ce clasă sau ce configurație creezi după date: `from_dict`, `create_app()`, un dict de la tip la clasă",
      "Builder construiește pas cu pas un obiect cu multe părți opționale; în Python argumentele cu nume îl înlocuiesc adesea",
      "Builder-ul fluent apare la interogări: `select(...).where(...)` în SQLAlchemy, `Search().query().filter()` în Elasticsearch",
      "Câștigul unui factory: apelantul nu știe de clasele concrete, deci adaugi o variantă fără să-l modifici"],
      model: "Pornesc de la constructor sau de la un `@dataclass`. Un factory îmi trebuie când clasa concretă depinde de date: un dict de la tipul fișierului la parser, un `from_dict` sau un `create_app()` care le dă testelor propria aplicație. Apelantul nu știe de clasele concrete, deci o variantă nouă e o linie în factory. Builder-ul îl folosesc pentru obiecte cu multe părți opționale, cum sunt interogările: `select(Alert).where(...).order_by(...)` sau `Search().query().filter()` în Elasticsearch. Pentru obiecte simple, în Python argumentele cu nume fac aceeași treabă." },
    { id: "o-pat-3", q: "Ai reguli de detecție care se înmulțesc de la o lună la alta. Strategy, Template Method sau `if/elif`? De ce?", k: [
      "`if/elif` merge pentru 2–3 cazuri stabile; când cazurile cresc, fiecare regulă nouă modifică aceeași funcție (încalcă open/closed)",
      "Strategy: fiecare regulă e o funcție sau un obiect cu aceeași semnătură, aleasă la runtime, de obicei dintr-un registry (dict)",
      "Template Method: clasa de bază fixează pașii, subclasele completează doar ce diferă (`setUp` în unittest, `perform_create` în DRF)",
      "Strategy e compoziție (schimbi algoritmul fără subclase), Template Method e moștenire (scheletul e fix)",
      "Fiecare strategie se testează izolat, iar registry-ul primește reguli noi fără să atingi codul existent"],
      model: "Pentru reguli care cresc aleg Strategy cu un registry: fiecare regulă e o funcție cu aceeași semnătură, înregistrată într-un dict, iar motorul le aplică pe toate. O regulă nouă e o funcție nouă, fără să modific motorul, și fiecare se testează separat. Un `if/elif` merge doar pentru două-trei cazuri stabile. Template Method e varianta cu moștenire: clasa de bază ține fluxul, colectează, evaluează, raportează, iar subclasele completează pașii. Îl folosesc când fluxul e fix, ca la `perform_create` în DRF; când variațiile se combină liber, prefer compoziția." },
    { id: "o-pat-4", q: "Observer sau pub/sub cu un broker (RabbitMQ, Redis, Celery)? Când îți trebuie broker?", k: [
      "Observer: subiectul ține lista ascultătorilor și îi cheamă direct, în același proces (semnalele din Django, `addEventListener`)",
      "Pub/sub: publicatorul trimite în broker și nu știe cine ascultă; consumatorii rulează în alte procese sau servicii",
      "Broker îți trebuie când consumatorii sunt în alt serviciu, când munca e lentă sau când vrei retry, persistență și scalare pe workeri",
      "Prețul broker-ului: livrare asincronă, de obicei „cel puțin o dată” (deci handler-i idempotenți) și încă o componentă de operat",
      "La Observer în proces, un ascultător lent sau o excepție în el oprește subiectul"],
      model: "Observer e în același proces: subiectul își cheamă direct ascultătorii, ca semnalele din Django sau `addEventListener`. E simplu și sincron, dar un ascultător lent îl oprește pe subiect. Când reacția e lentă, trebuie reîncercată sau rulează în alt serviciu, trec la pub/sub printr-un broker: în proiectele mele, semnalul doar punea un task Celery în coadă, iar workerii îl procesau. Prețul e livrarea asincronă, de obicei cel puțin o dată, deci handler-ii trebuie să fie idempotenți, plus o componentă în plus de operat." },
    { id: "o-pat-5", q: "Ce e dependency injection, de ce îl folosești și cum arată în FastAPI și în React?", k: [
      "Clasa sau funcția primește colaboratorii din afară (în constructor sau ca parametri), nu îi creează singură",
      "Câștigul: înlocuiești o dependență reală cu un fake în teste și schimbi implementarea fără să modifici codul care o folosește",
      "FastAPI: `Depends(get_db)` în semnătură; în teste, `app.dependency_overrides[get_db] = ...`",
      "React: Context dă o valoare componentelor din arbore fără prop drilling; în teste înfășori componenta într-un Provider cu o valoare falsă",
      "Spre deosebire de un singleton sau de un import global, dependența se vede în semnătură"],
      model: "Prin injecție, codul își primește colaboratorii din afară, în constructor sau ca parametri, în loc să și-i creeze. Așa dependențele se văd în semnătură, iar în teste le înlocuiesc cu fake-uri fără `patch`. În FastAPI asta e `Depends`: endpoint-ul cere o sesiune de DB, iar în teste o schimb prin `app.dependency_overrides`. Fixture-urile din pytest funcționează la fel. În React, Context face același lucru pentru componente: Provider-ul dă valoarea, iar în teste înfășor componenta într-un Provider cu o valoare falsă." }
  ]);
})(window.PREP);
