<!-- Explicații în formatul propus de Perplexity (15 oct 2026), curățate: fără citări, variantele greșite potrivite pe variantele reale. -->
### py-01

Context: Un backend colectează evenimente în liste. Funcția de mai jos permite să-i dai o listă sau să omiți acel argument. Urmărește ce obiect modifică fiecare apel și ce returnează.

Pe scurt: Afișează `['a', 'b']`: ambele apeluri modifică aceeași listă implicită.

Scop: Vrei să eviți ca un apel să păstreze, fără intenție, datele apelului anterior. Într-un backend, o listă implicită reutilizată poate amesteca date între operații care ar trebui să fie independente.

Mecanism: Când se execută definiția funcției, Python creează lista `[]` o singură dată. Apelurile care omit `events` primesc acel obiect. `append` modifică lista existentă; nu creează una nouă.

Pas cu pas:
```text
Definire:      lista L = []
add_event("a"): L devine ["a"]
add_event("b"): L devine ["a", "b"]
print:         ["a", "b"]
```

Aplicare: Dacă fiecare apel trebuie să pornească separat, creezi lista în corpul funcției:
```python
def add_event(e, events=None):
    if events is None:
        events = []
    events.append(e)
    return events
```

Legătură: Gândește-te la două request-uri care apelează același helper. Faptul că request-urile sunt diferite nu reconstruiește automat obiectele implicite ale funcției.

Limită: O listă primită explicit poate fi modificată în continuare. Soluția cu `None` separă apelurile care omit argumentul; nu transformă funcția într-una care evită orice modificare a datelor primite.

La interviu: „Argumentele implicite se evaluează la definirea funcției. Dacă valoarea este mutabilă și o modific, schimbarea rămâne pentru apelurile următoare. Folosesc `None` și creez lista în funcție când vreau o listă nouă per apel.”

Verificare: Cu funcția inițială, ce afișează `print(add_event("c", []))` după apelurile din grilă?

Răspuns verificare: `['c']`. Ai trimis explicit o listă nouă, deci apelul nu folosește lista implicită care conține deja `"a"` și `"b"`.

Varianta greșită: „['b']” — ar fi rezultatul dacă al doilea apel ar primi o listă nouă. În codul inițial, lista implicită nu se reconstruiește la fiecare apel.

Varianta greșită: „TypeError” — Python permite argumente implicite mutabile. Este o sursă de bug-uri, nu o construcție interzisă.

Varianta greșită: „['a']” — al doilea apel execută și el `append`, adăugând `"b"` în aceeași listă.

### py-02

Context: Codul construiește trei funcții mici, apoi le apelează într-o etapă separată. Urmărește diferența dintre momentul în care se creează o funcție și momentul în care se execută corpul ei.

Pe scurt: Afișează `[2, 2, 2]`: cele trei funcții citesc aceeași variabilă `i` când sunt apelate.

Scop: Conceptul contează când generezi callbacks într-o buclă. Vrei ca fiecare callback să folosească identificatorul lui, nu ca toate să ajungă să lucreze cu ultima valoare.

Mecanism: `lambda: i` nu salvează o copie a valorii curente. Funcțiile păstrează accesul la aceeași variabilă din comprehension. Când sunt apelate, bucla s-a terminat, iar valoarea acelei variabile este `2`. Acesta este late binding.

Pas cu pas:
```text
i = 0: creezi f0, care va citi i
i = 1: creezi f1, care va citi i
i = 2: creezi f2, care va citi i
După buclă: aceeași variabilă are 2
f0(), f1(), f2() -> 2, 2, 2
```

Aplicare: Poți fixa valoarea fiecărei iterații într-un argument implicit:
```python
funcs = [lambda i=i: i for i in range(3)]
print([f() for f in funcs])
# [0, 1, 2]
```

Legătură: Este aceeași regulă temporală din `py-01`: expresia unui argument implicit se evaluează când creezi funcția. Acolo reutilizarea unei liste era capcana; aici fixarea valorii este intenționată.

Limită: `lambda i=i` nu face o copie profundă a obiectului. Dacă valoarea fixată este un obiect mutabil și îl modifici ulterior, funcția poate observa acele modificări.

La interviu: „Este late binding într-un closure. Funcțiile citesc variabila la apel, nu salvează automat valoarea fiecărei iterații. Pot fixa valoarea printr-un argument implicit sau printr-o funcție care construiește separat fiecare callback.”

Verificare: În exemplul inițial, înlocuiești `range(3)` cu `range(4)`. Ce rezultat obții?

Răspuns verificare: `[3, 3, 3, 3]`. Creezi patru funcții, iar toate citesc valoarea finală a aceleiași variabile: `3`.

Varianta greșită: „[0, 1, 2]” — presupune că fiecare funcție salvează automat valoarea iterației în care a fost creată. `lambda: i` nu face asta.

Varianta greșită: „[0, 0, 0]” — prima valoare nu este fixată la crearea funcțiilor. Citirea are loc ulterior, după terminarea buclei.

Varianta greșită: „NameError” — funcțiile păstrează accesul la variabila capturată. Nu este necesar ca `i` să existe ca variabilă globală.

### py-04

Context: Ai o funcție `get_alerts`, peste care adaugi logging printr-un decorator. Apelul trece acum printr-o funcție intermediară, `wrapper`. Pe lângă rezultat, uneltele de dezvoltare inspectează și informațiile despre funcție.

Pe scurt: `functools.wraps` păstrează pe wrapper metadatele funcției originale și adaugă o legătură către ea prin `__wrapped__`.

Scop: Vrei ca funcția decorată să rămână identificabilă pentru debugging, documentație și unelte de inspecție. Altfel poți vedea numele generic `wrapper` în loc de `get_alerts`.

Mecanism: Decoratorul returnează wrapperul. `@wraps(fn)` copiază pe el informații precum `__name__` și `__doc__`. Setează și `__wrapped__ = fn`, prin care uneltele pot ajunge la funcția originală.

Pas cu pas:
```text
Fără wraps:
get_alerts -> wrapper
numele expus: "wrapper"

Cu wraps:
get_alerts -> wrapper -> funcția originală
numele expus: "get_alerts"
```

Aplicare:
```python
from functools import wraps

def logged(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        print("apel")
        return fn(*args, **kwargs)
    return wrapper
```

Legătură: Când inspectezi un endpoint decorat, este util să poți afla ce funcție originală a fost învelită. `wraps` păstrează această legătură fără să elimine comportamentul adăugat de decorator.

Limită: Nu schimbă mecanismul de apel al wrapperului. `inspect.signature` poate urmări `__wrapped__`, dar wrapperul trebuie în continuare să primească și să transmită corect argumentele.

La interviu: „Folosesc `functools.wraps` ca wrapperul să păstreze metadatele funcției decorate și legătura `__wrapped__`. Ajută introspecția și debuggingul; nu adaugă automat caching, tratarea excepțiilor sau suport async.”

Verificare: În exemplul de mai sus, adăugarea lui `@wraps(fn)` face ca `print("apel")` să ruleze o singură dată, indiferent de numărul apelurilor?

Răspuns verificare: Nu. Wrapperul se execută la fiecare apel. `wraps` păstrează informațiile funcției originale; nu memorează rezultatele și nu sare peste execuție.

Varianta greșită: „Face decoratorul să funcționeze și pentru funcții async” — `wraps` nu transformă wrapperul într-o corutină. Comportamentul async trebuie implementat separat.

Varianta greșită: „Cache-uiește rezultatele funcției decorate, ca `lru_cache`” — cachingul este rolul altui decorator. `wraps` gestionează metadatele, nu rezultatele apelurilor.

Varianta greșită: „Prinde și loghează excepțiile aruncate de funcția decorată” — pentru acest comportament scrii explicit `try/except` și logging în wrapper.

### asgi-02

Context: Un query sincron la DB ține ocupat firul de execuție până primește rezultatul. Într-un server async contează unde rulează acest cod: pe event loop sau într-un thread separat.

Pe scurt: FastAPI, prin Starlette, execută endpointul `def` într-un threadpool, astfel încât query-ul sincron nu blochează direct event loop-ul.

Scop: Poți folosi biblioteci sincrone fără să oprești threadul care coordonează celelalte operații async. Query-ul continuă să aștepte DB-ul, dar așteptarea are loc în alt thread.

Mecanism: Starlette trimite endpointul sincron către `anyio.to_thread.run_sync`. Un thread execută funcția, iar event loop-ul poate procesa alte operații până când primește rezultatul.

Pas cu pas:
```text
Request A -> event loop -> threadpool
                             |
                        query DB sync
                             |
Request B -> event loop      |
                             v
Request A <- rezultatul endpointului
```

Aplicare: Pentru un endpoint care folosește direct un driver DB sincron, `def` este o alegere simplă. Declararea lui ca `async def` nu transformă automat query-ul sincron într-o operație neblocantă.

Legătură: Un endpoint sincron Django/DRF își poate păstra stilul obișnuit de apelare a DB-ului. Aici, ideea nouă este că serverul async deleagă endpointul sincron unui thread.

Limită: Limita implicită AnyIO este de 40 de tokens, partajate cu alte utilizări ale acelui mecanism. Nu înseamnă 40 de threaduri create permanent și nici concurență nelimitată.

La interviu: „Un endpoint FastAPI declarat cu `def` rulează în threadpool prin Starlette și AnyIO. Query-ul sincron blochează threadul respectiv, nu direct event loop-ul. Tot trebuie să urmăresc capacitatea threadpoolului și a poolului de conexiuni DB.”

Verificare: Schimbi endpointul în `async def`, dar păstrezi apelul direct către același driver sincron. Este suficient pentru a evita blocarea event loop-ului?

Răspuns verificare: Nu. Apelul sincron rulat direct în endpointul async poate bloca event loop-ul. Ai nevoie de un driver async sau de delegarea explicită a operației blocante.

Varianta greșită: „Blochează tot event loop-ul până termină query-ul” — aceasta este capcana apelului sincron direct dintr-un endpoint `async def`, nu comportamentul endpointului `def` gestionat de Starlette.

Varianta greșită: „FastAPI refuză să pornească: cu Session sincron trebuie `async def`” — endpointurile `def` sunt acceptate și tocmai pentru ele există delegarea către threadpool.

Varianta greșită: „Rulează automat într-un proces separat, creat per request” — mecanismul folosește threaduri, nu câte un proces nou pentru fiecare request.

### pg-01

Context: Două request-uri lucrează simultan cu aceleași date. O tranzacție grupează operații într-o unitate de lucru. Nivelul de izolare stabilește ce modificări făcute de cealaltă tranzacție poate observa.

Pe scurt: Nivelul implicit în PostgreSQL este `READ COMMITTED`.

Scop: Trebuie să știi dacă o citire poate vedea date neconfirmate și dacă două citiri din aceeași tranzacție pot da rezultate diferite. Această alegere influențează corectitudinea logicii tale, nu doar performanța.

Mecanism: La `READ COMMITTED`, un `SELECT` obișnuit vede modificările altor tranzacții confirmate înainte de începerea acelui query. Următorul `SELECT` primește o imagine nouă și poate vedea între timp alte date confirmate.

Pas cu pas:
```text
A: BEGIN
A: SELECT stoc -> 10
B: UPDATE stoc la 9
B: COMMIT
A: SELECT stoc -> 9
A: COMMIT
```

Aplicare: Nu presupune că `BEGIN` îngheață toate citirile. Pentru o operație concurentă precum scăderea stocului, poți folosi un `UPDATE` condiționat și verifici dacă a modificat un rând.
```sql
UPDATE products
SET stock = stock - 1
WHERE id = 7 AND stock > 0;
```

Legătură: Nici `transaction.atomic()` din Django nu înseamnă automat „datele citite nu se mai schimbă”. Atomicitatea operațiilor și vizibilitatea modificărilor concurente sunt proprietăți diferite.

Limită: Tranzacția își vede propriile modificări, chiar înainte de commit. Regula „doar date confirmate” descrie aici vizibilitatea modificărilor făcute de alte tranzacții.

La interviu: „PostgreSQL folosește implicit `READ COMMITTED`. Fiecare query vede un snapshot nou al datelor confirmate. De aceea, două SELECT-uri din aceeași tranzacție pot vedea rezultate diferite dacă altă tranzacție face commit între ele.”

Verificare: În cronologia de mai sus, B modifică stocul la `9`, dar încă nu face commit. Al doilea `SELECT` obișnuit al lui A vede acel `9`?

Răspuns verificare: Nu. Dacă nu există alte schimbări relevante, vede tot `10`. Modificarea neconfirmată a lui B nu este vizibilă pentru A la `READ COMMITTED`.

Varianta greșită: „SERIALIZABLE” — este un nivel mai strict, ales explicit. Poate anula tranzacții care trebuie reluate pentru a menține garanția de serializabilitate. Nu este implicit.

Varianta greșită: „REPEATABLE READ” — păstrează o imagine stabilă pentru citirile tranzacției, stabilită la prima instrucțiune relevantă. Nu este nivelul implicit.

Varianta greșită: „READ UNCOMMITTED” — PostgreSQL acceptă denumirea, dar o tratează ca `READ COMMITTED`. Numele nivelului implicit rămâne `READ COMMITTED`.

### rt-08

Context: Un modul Python poate fi rulat direct cu `python modul.py` sau importat de alt modul ori de teste. Urmărește ce cod se execută în fiecare situație.

Pe scurt: `if __name__ == "__main__":` separă codul de pornire de codul care trebuie să ruleze și la import.

Scop: Vrei ca pornirea serverului, rularea scriptului sau testele să nu declanșeze accidental acțiuni care aparțin doar pornirii directe a fișierului.

Mecanism: La import, Python execută tot codul de la nivelul fișierului. Variabila `__name__` este `"__main__"` doar când rulezi direct fișierul. Într-un import, ea are numele modulului, deci blocul este sărit.

Pas cu pas:
```text
python app.py
__name__ == "__main__" -> rulează main()

import app
__name__ == "app" -> se sare peste main()
```

Aplicare: Pune în blocul `__main__` doar pornirea aplicației: `uvicorn.run(...)`, parsarea argumentelor CLI sau un script one-off. Funcțiile și clasele rămân la nivelul modulului, ca să poată fi importate și testate.

Legătură: Este ca un `main()` dintr-un proiect: biblioteca expune funcții, iar punctul de intrare decide când se pornește aplicația.

Limită: `__name__` nu controlează securitatea sau accesul la funcții. Codul din bloc este sărit la import; restul codului de la nivelul modulului se execută oricum.

La interviu: „Pun codul de pornire sub `if __name__ == "__main__":` pentru că la import tot codul de nivelul modulului se execută, iar `__name__` este `__main__` doar la rulare directă. Astfel, importurile și testele nu pornesc accidental aplicația.”

Verificare: Ai în `app.py` un `print("config loaded")` în afara blocului `__main__`. Ce se afișează când faci `import app` din teste?

Răspuns verificare: Se afișează `config loaded`. La import se execută codul de la nivelul modulului; doar blocul `__main__` este sărit.

Varianta greșită: „Ca să ruleze mai repede, fiind compilat separat de restul modulului” — blocul nu schimbă modul de compilare sau viteza de execuție. Controlează doar dacă codul de pornire rulează la import.

Varianta greșită: „Pentru că altfel interpretorul nu găsește funcția `main` la pornire” — Python nu caută automat o funcție numită `main`. Numele este o convenție, nu o cerință a interpretorului.

Varianta greșită: „Ca să ruleze doar pe Linux, nu și pe Windows sau macOS” — `__name__` nu depinde de sistemul de operare. Regula este aceeași pe toate platformele.

### asgi-10

Context: Rulezi un serviciu FastAPI în Kubernetes. Poți porni mai multe procese în același container sau un proces per container și mai multe replici. Urmărește cine gestionează procesele și cum scalezi.

Pe scurt: Cea mai simplă și corectă variantă este, de regulă, un proces Uvicorn per container și scalarea prin mai multe replici în Kubernetes.

Scop: Vrei un deployment predictibil: Kubernetes gestionează pornirea, repornirea, sănătatea și numărul de instanțe, fără să duplici aceste responsabilități în container.

Mecanism: Un proces Uvicorn are un event loop și folosește un core pentru bucla principală. Kubernetes pornește mai multe pod-uri/replici, fiecare cu procesul lui, iar Service-ul distribuie traficul între ele.

Pas cu pas:
```text
Service -> Pod 1: uvicorn (1 proces)
        -> Pod 2: uvicorn (1 proces)
        -> Pod 3: uvicorn (1 proces)

Scaling: crești replicas, nu procesele dintr-un container
```

Aplicare: Setează `replicas` și resursele CPU/memorie, adaugă liveness/readiness probes și lasă Kubernetes să repornească pod-urile. Dacă folosești Gunicorn, un worker Uvicorn per container rămâne o opțiune validă, dar nu este necesară pentru scalare orizontală.

Legătură: E similar cu Docker Swarm: mai multe task-uri/replici în spatele unui load balancer. Diferența este că Kubernetes oferă probes, autoscaling și restart policy mai bogate.

Limită: Un proces per container nu înseamnă că nu poți folosi mai mulți workeri. Pentru aplicații cu mult I/O sau CPU-bound, poți alege alt model, dar trebuie să gestionezi shutdown-ul, timeout-urile și resursele explicit.

La interviu: „În Kubernetes aleg de regulă un proces Uvicorn per container și scalez cu replici. Kubernetes gestionează restartul și distribuția traficului. Dacă folosesc Gunicorn, îl folosesc pentru managementul workerilor, nu pentru a duplica orchestrarea făcută deja de K8s.”

Verificare: Ai un container cu 4 procese Uvicorn și Kubernetes scalează la 3 replici. Câte procese Uvicorn rulează în total?

Răspuns verificare: 12. Fiecare replică conține cele 4 procese, deci `3 × 4 = 12`.

Varianta greșită B: 32 de procese într-un pod care are alocate, să zicem, 1–2 core-uri se bat pe CPU și consumă de 32 de ori memoria aplicației. Numărul de workeri se potrivește cu resursele podului, iar scalarea se face prin replici, nu prin workeri în plus.

Varianta greșită C: `--reload` e pentru dezvoltare: repornește serverul când se schimbă fișierele și consumă resurse. Un singur pod înseamnă și zero redundanță: dacă pică, serviciul e jos.

Varianta greșită D: Numărul de noduri din cluster nu are legătură cu ce rulează într-un container: procesele unui pod folosesc doar CPU-ul alocat podului. Repartizarea pe noduri o face Kubernetes, prin replici.

### py-03

Context: Ai un fișier de log de 50 GB, dar mașina are doar 8 GB RAM. Trebuie să extragi erorile și să produci un rezultat. Urmărește diferența dintre a încărca totul odată și a procesa pe măsură ce citești.

Pe scurt: Citești și procesezi fișierul linie cu linie sau pe bucăți, fără să-l încarci integral în memorie.

Scop: Vrei să procesezi volume mai mari decât memoria disponibilă, fără `MemoryError` și fără să trebuie să mărești RAM-ul.

Mecanism: Un obiect fișier deschis în mod text poate fi iterat. Python citește câte o linie la un moment dat, o procesezi, iar memoria folosită rămâne aproximativ constantă. Generatorii îți permit să compui pașii fără liste intermediare.

Pas cu pas:
```text
fișier 50 GB
  -> citește linia curentă
  -> filtrează erorile
  -> scrie/agregă rezultatul
  -> trece la linia următoare

RAM: o linie + starea agregării, nu 50 GB
```

Aplicare:
```python
errors = 0
with open("app.log", encoding="utf-8") as f:
    for line in f:
        if "ERROR" in line:
            errors += 1
```

Legătură: E același principiu ca streaming-ul din SQLAlchemy cu `yield_per`: nu aduci toate rândurile în memorie, ci le procesezi pe măsură ce sosesc.

Limită: Dacă algoritmul are nevoie de toate liniile simultan — de exemplu, sortare globală — streaming-ul simplu nu este suficient. Poți sorta extern, pe bucăți, sau folosi unelte specializate.

La interviu: „Pentru un fișier de 50 GB folosesc streaming: iterez fișierul sau folosesc generatori și procesez pe bucăți. Memoria rămâne constantă. Dacă trebuie sortare globală sau join între fișiere mari, folosesc sortare externă sau unelte de procesare distribuită.”

Verificare: Înlocuiești bucla cu `lines = f.readlines()` și apoi iterezi `lines`. Ce problemă apare?

Răspuns verificare: `readlines()` încearcă să încarce toate liniile într-o listă în memorie. Pentru 50 GB, riști `MemoryError`, chiar dacă mașina are doar 8 GB RAM.

Varianta greșită B: `f.read()` citește tot fișierul într-un singur string, înainte ca `splitlines()` să apuce să lucreze: 50 GB nu încap în 8 GB de RAM, deci primești `MemoryError`.

Varianta greșită C: `readlines()` construiește lista tuturor liniilor în memorie, deci problema apare înainte de procesare. Paralelismul nu ajută când datele nu încap.

Varianta greșită D: Un DataFrame ține tot fișierul în RAM, de obicei chiar mai mult decât ocupă pe disc. pandas poate citi pe bucăți (`chunksize`), dar varianta asta încarcă totul odată.

### rd-03

Context: Ai date în PostgreSQL și vrei răspunsuri mai rapide pentru citiri frecvente. Redis poate ține o copie a acestor date. Urmărește cine citește din DB și cine scrie în Redis.

Pe scurt: La cache-aside, aplicația citește mai întâi din Redis; la miss, citește din DB și populează cache-ul.

Scop: Vrei să reduci numărul de query-uri către DB pentru date citite des, fără ca Redis să devină sursa de adevăr.

Mecanism: La citire: verifici Redis. Dacă cheia există, o folosești. Dacă nu există, citești din Postgres, scrii rezultatul în Redis cu TTL și îl returnezi. La scriere în DB, invalidezi sau actualizezi cheia din cache.

Pas cu pas:
```text
Citire:
app -> Redis: are cheia?
  da -> returnează valoarea
  nu -> app -> Postgres
       app -> Redis: SET key value TTL
       returnează valoarea

Scriere:
app -> Postgres: UPDATE
app -> Redis: DEL key
```

Aplicare: Folosește TTL pentru limite naturale de prospețime și invalidare explicită la scrieri. Pentru date care se schimbă des sau pentru care consistența strictă contează imediat, cache-ul poate fi o problemă mai mare decât câștigul.

Legătură: E ca un cache de query-uri sau de obiecte serializate în aplicație, dar partajat între mai multe instanțe. Redis este rapid pentru citiri, însă nu înlocuiește tranzacțiile din Postgres.

Limită: Cache-ul poate conține date vechi între scrierea în DB și invalidare. La un val de trafic simultan pe aceeași cheie lipsă, mai multe request-uri pot citi DB-ul — cache stampede; se limitează cu lock/single-flight și TTL cu jitter.

La interviu: „Cache-aside înseamnă că aplicația gestionează cache-ul: la miss citește din DB, populează Redis cu TTL și returnează datele. La scriere invalidez cheia. Redis rămâne o copie rapidă, nu sursa de adevăr.”

Verificare: Un request citește o cheie inexistentă în Redis, citește din Postgres și scrie în Redis. Un alt request sosește imediat după. De unde citește?

Răspuns verificare: Din Redis. Prima cerere a populat cache-ul, deci a doua găsește cheia și nu mai interoghează Postgres.

Varianta greșită: „Baza de date scrie automat în cache la fiecare modificare” — în cache-aside, aplicația este cea care populează și invalidează cache-ul, nu DB-ul.

Varianta greșită: „Cache-ul devine sursa de adevăr, iar DB-ul e backup” — invers: Postgres rămâne sursa de adevăr; Redis ține o copie potențial expirabilă.

Varianta greșită: „Scrierile merg întâi în cache, apoi asincron în DB” — acesta este write-behind. Poate pierde date dacă cache-ul cade înainte ca scrierea să ajungă în DB.

### rmq-07

Context: Ai evenimente sau task-uri care trebuie procesate de alte servicii. Poți folosi un broker de mesaje sau o platformă de event streaming. Urmărește ce se întâmplă cu mesajul după ce un consumator îl procesează.

Pe scurt: RabbitMQ șterge mesajul după ack; Kafka îl păstrează în log, iar consumatorii citesc după offset.

Scop: Alegerea depinde de modelul de lucru: distribuire de task-uri și routing flexibil versus reprocessing, retenție și throughput mare de evenimente.

Mecanism: RabbitMQ livrează un mesaj din coadă unui consumator; după ack, mesajul poate fi eliminat. Kafka scrie evenimentul într-un log partiționat; fiecare consumer group își ține offset-ul și poate reciti evenimentele vechi.

Pas cu pas:
```text
RabbitMQ:
producer -> queue -> consumer
                  -> ack -> mesajul poate fi șters

Kafka:
producer -> partition log
consumer A citește de la offset 120
consumer B citește de la offset 80
evenimentele rămân în log
```

Aplicare: RabbitMQ pentru task-uri de background, retry-uri, routing pe tip de eveniment și cozi separate. Kafka pentru pipeline-uri de evenimente, audit, replay și integrări între multe servicii.

Legătură: Celery se potrivește natural cu RabbitMQ pentru task-uri: un task intră într-o coadă, un worker îl preia și confirmă după procesare. Kafka nu este, în mod implicit, un sistem de cozi de task-uri.

Limită: RabbitMQ are și Streams, iar Kafka poate fi folosit pentru task-uri, dar modelul implicit rămâne diferit: coadă cu ack versus log persistent cu offset.

La interviu: „RabbitMQ e un broker de mesaje orientat pe cozi și ack: după procesare, mesajul dispare din coadă. Kafka e event streaming: păstrează evenimentele într-un log partiționat, iar consumatorii citesc după offset și pot face replay.”

Verificare: Un consumator Kafka citește evenimentele de la offset 100, le procesează, apoi vrea să le reproceseze de la offset 100. Este posibil fără ca producătorul să le retrimită?

Răspuns verificare: Da. Kafka păstrează evenimentele în log, iar consumatorul își poate muta offset-ul înapoi și reciti intervalul dorit.

Varianta greșită: „Sunt același produs: Kafka e versiunea comercială, plătită, a RabbitMQ” — sunt produse diferite, cu modele de livrare și retenție diferite.

Varianta greșită: „Kafka ține mesajele doar în memorie, RabbitMQ pe disc” — Kafka scrie logul pe disc și poate păstra evenimentele conform retenției configurate.

Varianta greșită: „RabbitMQ nu suportă mai mulți consumatori pe aceeași coadă” — suportă mai mulți consumatori; aceștia împart mesajele din coadă, nu primesc fiecare toate mesajele.

### lx-01

Context: Un container sau un proces backend trebuie oprit. Sistemul de operare poate trimite un semnal procesului. Unele semnale pot fi interceptate de aplicație, altele nu.

Pe scurt: `kill -15` trimite `SIGTERM`, pe care procesul îl poate trata; `kill -9` trimite `SIGKILL`, pe care procesul nu îl poate prinde.

Scop: Vrei să oprești aplicația fără să pierzi request-uri în curs, conexiuni DB sau mesaje deja preluate din coadă.

Mecanism: `SIGTERM` este o cerere de oprire. Aplicația poate prinde semnalul, poate termina request-urile, poate închide conexiunile și poate face cleanup. `SIGKILL` este aplicat de kernel: procesul nu primește șansa de a rula cod de cleanup.

Pas cu pas:
```text
kill -15 PID
  -> SIGTERM
  -> app: termină request-uri, închide conexiuni
  -> exit

kill -9 PID
  -> SIGKILL
  -> kernel: oprește procesul
  -> fără handler, fără cleanup
```

Aplicare: În Docker/Kubernetes, configurează `terminationGracePeriodSeconds` și handler pentru `SIGTERM`. Orchestratorul trimite de regulă întâi `SIGTERM`, apoi `SIGKILL` dacă procesul nu se oprește la timp.

Legătură: Un container este un proces Linux izolat. Dacă procesul principal nu primește sau nu tratează `SIGTERM`, oprirea grațioasă nu funcționează, chiar dacă aplicația are logică de shutdown.

Limită: `SIGKILL` nu este „mai curat”, doar mai forțat. Poate lăsa conexiuni deschise sau mesaje nereconfirmate; brokerul sau DB-ul le pot recupera ulterior, dar aplicația nu face cleanup.

La interviu: „`kill -15` trimite `SIGTERM`, pe care aplicația îl poate prinde pentru shutdown grațios. `kill -9` trimite `SIGKILL`, pe care procesul nu îl poate intercepta. În producție trimit întâi `SIGTERM` și las un grace period.”

Verificare: Un proces primește `SIGTERM`, dar handlerul său rămâne blocat la nesfârșit. Ce se întâmplă dacă Kubernetes depășește perioada de grație?

Răspuns verificare: Kubernetes trimite `SIGKILL`. Procesul este oprit imediat, fără să poată executa cleanup-ul.

Varianta greșită: „Sunt identice, diferă doar numărul semnalului trimis” — numerele diferă, dar și comportamentul: `SIGTERM` poate fi tratat, `SIGKILL` nu.

Varianta greșită: „`-9` oprește grațios procesul, `-15` îl oprește imediat” — este inversat: `-15` este `SIGTERM`, oprirea grațioasă; `-9` este `SIGKILL`, oprirea forțată.

Varianta greșită: „`-15` repornește procesul, `-9` îl oprește definitiv” — niciunul dintre semnale nu repornește procesul. Repornirea este decizia supervisorului sau orchestratorului.

### dom-02

Context: Onapsis securizează sisteme critice folosite de companii mari. Înainte de a vorbi despre detecție, trebuie clar ce fel de software monitorizează și de ce un SIEM generic nu este suficient.

Pe scurt: SAP este un ERP folosit pentru procese business critice — finanțe, supply chain, HR — iar Onapsis monitorizează și detectează amenințări asupra acestor sisteme.

Scop: Înțelegi domeniul produsului: nu monitorizezi orice server generic, ci aplicații business-critical în care un atac sau o modificare neautorizată poate afecta operațiunile companiei.

Mecanism: SAP este o suită de aplicații enterprise. Onapsis Defend colectează și corelează activitate din sistemele SAP, aplică reguli și anomalii, apoi generează alerte care pot ajunge în SIEM-ul clientului.

Pas cu pas:
```text
Sistem SAP
  -> evenimente / loguri / schimbări
  -> Onapsis Defend
  -> reguli + anomalii
  -> alertă
  -> SIEM / SOC
```

Aplicare: La interviu, leagă partea tehnică de domeniu: ingestie de evenimente, normalizare, reguli de detecție, corelare în timp, alerte cu context și integrare către SIEM.

Legătură: Gândește-te la un sistem de detecție pentru video analytics: ai evenimente, reguli, false positives și nevoie de context. Aici contextul este SAP: utilizatori, tranzacții, modificări de configurare și acces.

Limită: SAP nu este doar o bază de date sau un server. Este un ecosistem de aplicații business; ABAP este limbajul folosit frecvent pentru dezvoltare în SAP, iar S/4HANA este generația curentă.

La interviu: „SAP este un ERP folosit pentru procese critice de business. Onapsis Defend monitorizează continuu aceste sisteme, detectează schimbări neautorizate și abuz, și trimite alerte cu context către SOC/SIEM.”

Verificare: Un utilizator face cinci login-uri eșuate pe același sistem SAP în două minute, apoi un login reușit. De ce este relevant pentru Onapsis?

Răspuns verificare: Este un tipar posibil de brute force reușit. Regula de detecție corelează evenimentele în fereastră de timp și generează o alertă pentru investigare.

Varianta greșită B: Limbajul din ecosistemul SAP este ABAP. SAP e compania și suita de aplicații ERP pe care rulează procesele firmei.

Varianta greșită C: SAP rulează pe sisteme de operare (Linux, Windows) și pe baze de date ca HANA; el însuși e o suită de aplicații de business, nu un sistem de operare.

Varianta greșită D: SAP procesează tranzacții de business (comenzi, facturi, plăți), dar nu e un standard de criptare. În SAP, „tranzacție” înseamnă o operație de business rulată de un user.

### gil-03

Context: Patru threaduri incrementează aceeași variabilă globală. Fiecare thread face un milion de operații. Urmărește ce pași sunt necesari pentru o singură incrementare.

Pe scurt: Rezultatul poate fi sub `4.000.000`, pentru că `counter += 1` nu este atomic; fără `Lock`, update-urile se pot pierde.

Scop: Vrei să înțelegi de ce GIL-ul nu garantează automat corectitudinea codului care modifică stare partajată.

Mecanism: `counter += 1` presupune citirea valorii, adunarea și scrierea înapoi. Interpretorul poate comuta între threaduri între acești pași. Două threaduri pot citi aceeași valoare, aduna fiecare `1` și scrie aceeași valoare: un increment se pierde.

Pas cu pas:
```text
Thread A: citește counter = 10
Thread B: citește counter = 10
Thread A: scrie 11
Thread B: scrie 11
Rezultat: 11, deși au avut loc două incrementări
```

Aplicare: Protejează secțiunea critică cu un lock:
```python
lock = threading.Lock()

def work():
    global counter
    for _ in range(1_000_000):
        with lock:
            counter += 1
```

Legătură: GIL-ul limitează execuția paralelă a bytecode-ului Python, dar nu transformă automat operațiile compuse din codul tău în operații atomice.

Limită: În versiuni recente, comutarea între threaduri poate face race-ul mai greu de observat în practică. Asta nu face codul corect: rezultatul rămâne nedeterminist fără sincronizare.

La interviu: „`counter += 1` nu este atomic: sunt load, add și store. GIL-ul poate comuta threadurile între pași, deci se pot pierde update-uri. Folosesc `threading.Lock` sau reduc starea partajată.”

Verificare: Fiecare thread numără într-o variabilă locală și adună rezultatul în `counter` o singură dată, la final. Mai ai nevoie de lock în buclă?

Răspuns verificare: Nu în buclă: variabilele locale nu sunt partajate între threaduri. Lock-ul rămâne necesar doar la adunarea finală în `counter`, care e tot o operație citește-modifică-scrie.

Varianta greșită: „E mereu 4.000.000, pentru că GIL-ul face fiecare instrucțiune Python atomică” — GIL-ul serializează execuția bytecode-ului, dar nu face atomică o operație compusă precum `+=`.

Varianta greșită: „Aruncă RuntimeError, pentru că un thread nu poate modifica o variabilă globală” — threadurile pot modifica variabile globale. Problema este concurența, nu accesul.

Varianta greșită: „E mereu 1.000.000, pentru că fiecare thread își incrementează propria copie” — toate threadurile referă aceeași variabilă globală, nu câte o copie separată.

### sqa-02

Context: Ai 100 de useri și, pentru fiecare, afișezi numărul de comenzi. Relația `orders` este lazy, comportamentul implicit în SQLAlchemy. Urmărește momentul în care se execută fiecare query.

Pe scurt: Sunt 101 query-uri: unul pentru useri și câte unul pentru comenzile fiecărui user — problema N+1.

Scop: Vrei să eviți ca o pagină sau un export să facă sute de query-uri mici către DB, ceea ce crește latența și încarcă baza de date.

Mecanism: Primul query aduce lista de useri. Relația lazy nu încarcă comenzile odată cu userul. La primul acces al lui `u.orders`, SQLAlchemy execută un SELECT separat pentru acel user. Bucla repetă acest acces de 100 de ori.

Pas cu pas:
```text
1. SELECT * FROM users
2. SELECT * FROM orders WHERE user_id = 1
3. SELECT * FROM orders WHERE user_id = 2
...
101. SELECT * FROM orders WHERE user_id = 100
```

Aplicare: Folosește eager loading explicit:
```python
from sqlalchemy.orm import selectinload

users = session.scalars(
    select(User).options(selectinload(User.orders))
).all()
```
Rezultatul este de regulă două query-uri: unul pentru useri și unul pentru toate comenzile relevante.

Legătură: În Django, `prefetch_related` rezolvă un N+1 similar printr-un query separat cu `IN`. În SQLAlchemy, `selectinload` este echivalentul potrivit pentru colecții.

Limită: `selectinload` nu este automat cea mai bună alegere pentru orice relație. Pentru many-to-one, `joinedload` poate fi potrivit; alegerea depinde de cardinalitate, dimensiunea datelor și planul de execuție.

La interviu: „Cu relație lazy primesc N+1: un query pentru useri și câte unul per user pentru comenzi. Folosesc `selectinload(User.orders)` pentru a aduce colecțiile într-un query separat, reducând de regulă totalul la două query-uri.”

Verificare: Ai 100 de useri, dar doar 10 dintre ei au comenzi. Cu `selectinload`, câte query-uri principale așteaptă SQLAlchemy pentru useri și comenzi?

Răspuns verificare: Două. Un query pentru useri și unul pentru comenzile userilor selectați; SQLAlchemy trimite ID-urile relevante într-un `IN`.

Varianta greșită: „1” — ar însemna că comenzile sunt deja încărcate odată cu userii. Relația lazy nu face asta.

Varianta greșită: „2” — ar fi rezultatul cu `selectinload`, nu cu lazy loading implicit.

Varianta greșită: „100” — lipsește query-ul inițial pentru lista de useri. Totalul este 101.

### cel-03

Context: Un worker Celery preia un task din broker. Ack este confirmarea prin care workerul îi spune brokerului că poate renunța la mesaj. Întrebarea este când are loc această confirmare.

Pe scurt: `acks_late=True` confirmă task-ul după execuție; dacă workerul moare între timp, mesajul poate fi re-livrat.

Scop: Vrei ca un task să nu fie pierdut dacă workerul crapă în timpul execuției. Prețul este că același task poate rula de mai multe ori.

Mecanism: Implicit, Celery confirmă mesajul la primire. Dacă workerul moare după confirmare și înainte de a termina task-ul, brokerul consideră mesajul livrat și nu îl retrimite. Cu `acks_late=True`, confirmarea are loc după execuție, deci un crash poate duce la re-livrare.

Pas cu pas:
```text
Implicit:
worker primește task -> ack -> execută
crash după ack -> task pierdut

acks_late=True:
worker primește task -> execută -> ack
crash înainte de ack -> re-livrare
```

Aplicare: Folosește `acks_late=True` pentru task-uri care nu trebuie pierdute și asigură idempotență:
```python
@app.task(bind=True, acks_late=True)
def process_payment(self, payment_id):
    ...
```
Combină cu `worker_prefetch_multiplier=1` pentru task-uri lungi, ca un worker ocupat să nu rețină inutil mai multe mesaje.

Legătură: Este același trade-off ca la RabbitMQ: ack manual după procesare oferă at-least-once, dar cere ca procesarea repetată să nu producă efecte duplicate.

Limită: `acks_late=True` nu oferă exactly-once. Dacă execuția reușește, dar ack-ul nu ajunge la broker, task-ul poate fi rulat din nou. De aceea, idempotența este obligatorie.

La interviu: „`acks_late=True` mută ack-ul după execuție. Dacă workerul crapă, mesajul este re-livrat, deci trecem la at-least-once. Task-ul trebuie să fie idempotent, iar pentru task-uri lungi folosesc și `worker_prefetch_multiplier=1`.”

Verificare: Un task cu `acks_late=True` actualizează un sold cu `balance += amount`, fără verificare dacă plata a fost deja aplicată. Ce risc apare?

Răspuns verificare: La re-livrare, soldul poate fi incrementat de două ori. Task-ul nu este idempotent; trebuie să verifici existența plății sau să folosești o operație condiționată/idempotentă.

Varianta greșită: „Pornește task-ul cu o întârziere configurabilă” — întârzierea se configurează cu `countdown` sau `eta`, nu cu `acks_late`.

Varianta greșită: „Salvează rezultatul în backend mai târziu, în loturi” — `acks_late` nu are legătură cu result backend-ul sau cu salvarea în loturi.

Varianta greșită: „Dezactivează retry-urile, ca task-ul să nu ruleze de două ori” — dimpotrivă, poate duce la re-livrare și la rulare repetată după un crash.

### idx-02

Context: Ai un index compus `(tenant_id, created_at)`. Indexul este sortat întâi după `tenant_id`, iar în interiorul fiecărei valori după `created_at`. Urmărește ce condiții se potrivesc acestei ordini.

Pe scurt: Query-ul care filtrează după `tenant_id = 7` și interval pe `created_at` folosește indexul cel mai eficient.

Scop: Vrei ca un raport sau un endpoint per tenant să nu facă full scan pe un tabel mare. Indexul potrivit reduce căutarea de la parcurgerea întregului tabel la o porțiune mică, ordonată.

Mecanism: Un index compus `(a, b)` este util când prima coloană este filtrată prin egalitate și a doua printr-un interval sau sortare. `tenant_id = 7` restrânge imediat zona din index; apoi `created_at > ...` poate parcurge intervalul ordonat din interiorul tenantului.

Pas cu pas:
```text
Index: (tenant_id, created_at)

tenant_id=7 -> zona tenantului 7
created_at > X -> interval ordonat în zona respectivă
=> Index Scan eficient
```

Aplicare:
```sql
SELECT *
FROM events
WHERE tenant_id = 7
  AND created_at > now() - interval '1 day';
```

Legătură: Este ca o carte de telefon sortată după nume, apoi prenume. Poți găsi rapid toate intrările pentru un nume și un interval de prenume; nu poți sări direct la un prenume fără să știi numele.

Limită: PostgreSQL 18 poate folosi skip scan în unele cazuri când se filtrează doar pe a doua coloană, dar nu trebuie să te bazezi pe asta ca pe comportamentul normal al unui index compus.

La interviu: „Pentru indexul `(tenant_id, created_at)`, pun egalitatea pe prima coloană și intervalul pe a doua. Query-ul `tenant_id = 7 AND created_at > ...` se potrivește ordonării indexului. Filtrul doar pe `created_at` nu folosește eficient indexul.”

Verificare: Ai indexul `(tenant_id, created_at)` și rulezi `WHERE tenant_id = 7 ORDER BY created_at DESC LIMIT 20`. Este indexul util?

Răspuns verificare: Da. Poate restricționa tenantul și parcurge intrările ordonate după `created_at`, deci poate satisface și `ORDER BY` fără un sort suplimentar.

Varianta greșită: „`WHERE created_at > now() - interval '1 day'`” — filtrezi doar pe a doua coloană. Ordinea indexului începe cu `tenant_id`, deci nu poate sări direct la intervalul de timp.

Varianta greșită C: `OR` combină două condiții care vizează coloane diferite. Plannerul nu poate folosi direct ambele părți printr-un singur Index Scan pe acest index compus.

Varianta greșită: „`WHERE created_at::date = '2026-10-19'`” — cast-ul aplicat coloanei poate împiedica folosirea indexului simplu; ar trebui un index pe expresie sau o condiție pe interval fără cast.
