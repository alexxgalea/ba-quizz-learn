<!-- Celery, în formatul propus de Perplexity. Variantele greșite: B, C, D = ordinea din sursă (A e cea corectă). -->

### cel-01
Pe scurt: Un task de 2 minute ține ocupat un worker web, riscă un timeout la load balancer și n-are retry dacă procesul moare; printr-o coadă, request-ul doar pornește munca.
Scop: Vrei ca API-ul să răspundă repede, iar munca lungă să supraviețuiască erorilor și restarturilor.
Mecanism: Request-ul publică un mesaj în broker și răspunde imediat, cu 202 și un id. Workerii Celery iau mesajul în ritmul lor, cu retry la erori și scalare separată de API. Dacă procesul web moare, mesajul e deja în broker.
Pas cu pas:
```text
client -> POST /reports -> API
API -> broker: generate_report(42)
API -> client: 202 {job_id}
worker -> ia task-ul -> 2 min -> salvează
client -> GET /reports/42 -> status
```
Aplicare:
```python
@app.post("/reports", status_code=202)
def create_report():
    r = generate_report.delay(42)
    return {"job_id": r.id}
```
Legătură: Ai făcut deja asta în Django cu Celery: view-ul răspunde, iar procesarea grea merge într-un task.
Limită: Nu orice operație trebuie mutată într-un task. Dacă userul are nevoie de rezultat pe loc și acesta durează 300 ms, un task doar complică lucrurile. Regula e pentru munca lungă sau nesigură.
La interviu: „Nu țin un request deschis 2 minute: blochează un worker web, se lovește de timeout-uri și n-are retry. Public un task în coadă, răspund 202 cu un id, iar workerii procesează separat, cu retry și scalare independentă.”
Verificare: Ai 4 workeri Gunicorn sync, iar 4 useri cer simultan un raport de 2 minute, generat direct în request. Ce pățește al cincilea user, care vrea doar o pagină simplă?
Răspuns verificare: Așteaptă: toți cei 4 workeri sunt ocupați cu rapoartele, deci request-ul lui stă la coadă până se eliberează unul.
Varianta greșită B: Python nu are o asemenea limită. Cele 30 de secunde sunt timeout-ul implicit al workerului Gunicorn sau al load balancer-ului.
Varianta greșită C: Workerii Celery rulează același Python, la aceeași viteză. Câștigul e decuplarea, nu viteza.
Varianta greșită D: HTTP permite răspunsuri lungi. Problema sunt timeout-urile setate de proxy-uri, load balancere și clienți.

### cel-02
Pe scurt: Nu: Celery oferă implicit at-most-once, iar cu `acks_late` at-least-once, deci task-urile trebuie să fie idempotente.
Scop: Un task care emite o factură sau scade un sold de două ori e un bug grav. Îl scrii așa încât o repetare să nu strice nimic.
Mecanism: Implicit, workerul confirmă mesajul înainte să ruleze task-ul: dacă moare în timpul execuției, task-ul se pierde (at-most-once). Cu `acks_late=True` confirmă după execuție: dacă moare după ce a terminat, dar înainte de ack, task-ul rulează din nou (at-least-once). Nicio setare nu le elimină pe amândouă.
Pas cu pas:
```text
acks_late: execută -> crash -> fără ack
broker: re-livrează -> task-ul rulează a doua oară
```
Aplicare: Faci task-ul idempotent: cheie unică plus `ON CONFLICT DO NOTHING`, verificarea stării înainte de acțiune (`if payment.status == "paid": return`) sau un registru cu id-urile deja procesate.
Legătură: E aceeași problemă ca la un webhook primit de două ori: îl recunoști după id și nu-l procesezi din nou.
Limită: Nici brokerul nu deduplică: RabbitMQ și Redis livrează încă o dată un mesaj neconfirmat. „Exactly once” în practică înseamnă at-least-once plus idempotență.
La interviu: „Celery nu garantează exactly once: implicit e at-most-once, iar cu `acks_late` devine at-least-once. Fac task-urile idempotente, cu chei unice sau cu verificarea stării, ca o re-livrare să nu producă efecte duble.”
Verificare: Task-ul `charge_card(order_id)` rulează cu `acks_late=True`. Ce verifici la începutul lui?
Răspuns verificare: Dacă la comanda respectivă plata e deja făcută. Dacă da, ieși fără să încarci cardul a doua oară.
Varianta greșită B: Brokerul nu deduplică mesajele după id. Un mesaj neconfirmat e livrat din nou, cu același id.
Varianta greșită C: Faptul că Redis e single-threaded nu schimbă garanțiile de livrare. Cu Redis, `visibility_timeout` poate chiar să provoace re-livrări.
Varianta greșită D: `acks_late` crește riscul de dublă execuție (at-least-once). Iar `max_retries=0` oprește doar reîncercările tale, nu re-livrările brokerului.

### cel-04
Pe scurt: Task-ul se reîncearcă automat de cel mult 5 ori, doar la `ConnectionError`, cu pauze care cresc exponențial și au o parte aleatoare.
Scop: Apelurile spre sisteme externe (aici, colectarea de loguri SAP) eșuează des temporar. Vrei să reîncerci automat, fără să lovești în rafale un sistem căzut.
Mecanism: `autoretry_for` spune la ce excepții se reîncearcă. `retry_backoff=True` face pauzele să crească exponențial (1, 2, 4, 8... secunde), iar `retry_jitter=True` alege aleator o pauză până la acea limită. `max_retries=5` oprește după a cincea reîncercare și lasă excepția să iasă.
Pas cu pas:
```text
rulare 1: ConnectionError -> pauză 0–1 s
retry 1:  ConnectionError -> pauză 0–2 s
retry 2:  ConnectionError -> pauză 0–4 s
...
retry 5:  eșuează -> task FAILURE
```
Aplicare: Pui în `autoretry_for` doar erori tranzitorii: rețea, timeout, 503. Un `KeyError` din codul tău nu se repară prin reîncercare. `retry_backoff_max` limitează pauza maximă.
Legătură: E același tipar ca backoff-ul cu jitter din clienții HTTP, de exemplu `urllib3.Retry`.
Limită: Retry-ul înseamnă că task-ul rulează de mai multe ori. Dacă apucă să scrie ceva înainte de eroare, partea aceea trebuie să fie idempotentă.
La interviu: „Configurația reîncearcă automat doar la `ConnectionError`, de cel mult 5 ori, cu backoff exponențial și jitter, ca reîncercările să nu lovească toate deodată sistemul care își revine. Reîncerc doar erori tranzitorii, nu bug-uri.”
Verificare: Task-ul aruncă `ValueError` din cauza unui payload greșit. Câte reîncercări face?
Răspuns verificare: Niciuna: `ValueError` nu e în `autoretry_for`, deci task-ul eșuează direct. Și e corect, pentru că un payload greșit nu se repară singur.
Varianta greșită B: `autoretry_for` limitează reîncercările la `ConnectionError`, iar `retry_backoff=True` înseamnă pauze crescătoare, nu fixe.
Varianta greșită C: Reîncercările sunt secvențiale: o nouă rulare pornește doar după ce precedenta a eșuat.
Varianta greșită D: `retry_backoff=True` pune pauze între încercări, cu o limită care se dublează de fiecare dată; jitter-ul doar le face aleatoare.

### cel-05
Pe scurt: Fiecare replică de Beat publică independent fiecare task periodic, deci fiecare task rulează de 3 ori.
Scop: Un raport zilnic trimis de 3 ori sau o curățare rulată de 3 ori în paralel sunt bug-uri reale în producție. Beat trebuie să ruleze într-o singură instanță.
Mecanism: Beat e doar un ceas: la ora din program, publică task-ul în broker. Nu se coordonează cu alte instanțe și nu știe că mai există vreun Beat. Trei replici înseamnă trei ceasuri, care publică fiecare același task.
Pas cu pas:
```text
08:00 beat-1 -> publică daily_report
08:00 beat-2 -> publică daily_report
08:00 beat-3 -> publică daily_report
workerii -> 3 rapoarte identice
```
Aplicare: Rulezi Beat ca serviciu separat, cu o singură replică (în Docker Swarm sau Kubernetes, `replicas: 1`), sau folosești un scheduler cu lock distribuit, de exemplu RedBeat.
Legătură: E ca un cron pus pe 3 servere identice: fiecare server îl rulează.
Limită: Nici cu o singură replică nu ai garanția exact-o-dată: un restart chiar în minutul programat poate pierde sau dubla o rulare. Task-urile periodice tot trebuie să fie idempotente.
La interviu: „Beat nu are coordonare distribuită: fiecare instanță publică singură task-urile, deci cu 3 replici fiecare task rulează de 3 ori. Rulez un singur Beat sau un scheduler cu lock, iar task-urile periodice le fac idempotente.”
Verificare: Pornești Beat în același container cu workerii (`celery worker -B`) și scalezi workerii la 4 replici. Ce se întâmplă?
Răspuns verificare: Ai 4 instanțe de Beat, deci fiecare task periodic e programat de 4 ori. De aceea Beat rulează separat.
Varianta greșită B: Instanțele nu își împart nimic: nu știu una de alta.
Varianta greșită C: Nimic nu le oprește pe celelalte două: toate pornesc și publică.
Varianta greșită D: Nu rulează mai repede, ci de mai multe ori: aceeași muncă, triplată.

### cel-06
Pe scurt: Trimiți `user_id` pentru că mesajul rămâne mic și serializabil, iar task-ul citește din DB starea de la momentul execuției.
Scop: Task-ul poate rula după secunde, după minute sau după mai multe retry-uri. Vrei să lucreze pe date actuale, nu pe o copie veche din momentul publicării.
Mecanism: Argumentele sunt serializate (implicit în JSON) și stau în broker. JSON nu știe ce e un obiect ORM. Chiar și cu pickle, ai trimite o copie înghețată a obiectului, legată de o sesiune care nu mai există. Cu id-ul, task-ul își deschide sesiunea lui și citește rândul curent.
Pas cu pas:
```text
10:00 publici notify(user_id=7)
10:01 userul își schimbă emailul
10:03 workerul citește userul 7 -> emailul nou
```
Aplicare:
```python
@app.task
def notify(user_id):
    with Session() as s:
        user = s.get(User, user_id)
        if user is None:
            return  # șters între timp
        send_email(user.email)
```
Legătură: E aceeași regulă ca în Django cu Celery: trimiți `pk`-ul, nu instanța modelului.
Limită: Uneori vrei chiar starea de la momentul publicării, de exemplu suma comenzii la plasare. Atunci trimiți explicit acele valori, nu obiectul.
La interviu: „Trimit id-uri, nu obiecte ORM: mesajul rămâne mic și serializabil în JSON, iar task-ul citește starea curentă din DB, cu sesiunea lui. Între publicare și execuție datele se pot schimba.”
Verificare: Între publicarea task-ului și execuția lui, userul e șters din DB. Ce trebuie să facă task-ul?
Răspuns verificare: Să trateze cazul: `get()` întoarce `None`, deci task-ul iese curat (eventual loghează), în loc să crape la `user.email`.
Varianta greșită B: Id-urile nu sunt secrete. Avantajul ține de dimensiunea mesajului și de prospețimea datelor, nu de securitate.
Varianta greșită C: Celery acceptă orice tip serializabil în JSON: liste, dicționare, numere zecimale.
Varianta greșită D: Problema nu e threadul, ci faptul că obiectul ORM nu se poate serializa în JSON și ar fi o copie veche, legată de altă sesiune.

### cel-07
Pe scurt: Workerul poate porni task-ul înainte de commit, așa că încă nu găsește rândul comenzii, care poate nici să nu mai existe dacă tranzacția face rollback.
Scop: Bug-ul apare intermitent, sub încărcare, și e greu de reprodus local. Publici task-uri doar după ce datele sunt comise.
Mecanism: Până la COMMIT, rândul e vizibil doar pentru conexiunea care l-a scris. Workerul Celery folosește altă conexiune, din alt proces, și poate prelua mesajul în câteva milisecunde. Dacă tranzacția face ROLLBACK, task-ul rulează pentru o comandă care nu există.
Pas cu pas:
```text
API: session.add(order); flush  (necomis)
API: process_order.delay(order.id)
worker: SELECT order -> nu există încă
API: COMMIT  (prea târziu)
```
Aplicare: În SQLAlchemy publici după `session.commit()`. În Django folosești `transaction.on_commit(lambda: process_order.delay(order.id))`. Pentru garanție completă, inclusiv la un crash între commit și publicare, folosești pattern-ul outbox.
Legătură: Exact pentru asta există `transaction.on_commit` în Django.
Limită: Publicarea după commit închide cursa, dar dacă procesul moare între commit și publicare, task-ul se pierde. Acolo ajută outbox-ul.
La interviu: „Dacă public task-ul înainte de commit, workerul poate porni înainte ca rândul să fie vizibil sau după un rollback. Public după commit, cu `transaction.on_commit` în Django, iar pentru garanție completă folosesc outbox.”
Verificare: Publici task-ul după `commit()`, dar procesul API moare exact între commit și `delay()`. Ce se pierde?
Răspuns verificare: Task-ul: comanda e salvată, dar mesajul n-a plecat niciodată. Outbox-ul rezolvă asta: evenimentul se salvează în aceeași tranzacție și e publicat ulterior.
Varianta greșită B: Celery nu știe nimic despre tranzacțiile tale: `delay()` publică imediat.
Varianta greșită C: Nu există câte o rulare per tranzacție. Riscul e ca task-ul să ruleze o singură dată, dar prea devreme.
Varianta greșită D: SQLAlchemy nu știe de Celery și nu blochează publicarea.

### cel-08
Pe scurt: Task-urile grele ocupă toate sloturile workerilor, iar cele rapide așteaptă în spatele lor. Le separi pe cozi, cu workeri dedicați.
Scop: Vrei ca un task de 50 ms, cum e o notificare, să nu aștepte 10 minute după un export de rapoarte.
Mecanism: Un worker are un număr fix de sloturi (concurrency). Dacă toate sunt ocupate de task-uri de minute, cele rapide stau în coadă. Cu `task_routes` trimiți fiecare tip de task în coada lui și pornești workeri separați pentru fiecare coadă.
Pas cu pas:
```text
coada default: [export][export][notify][notify]
toate sloturile pe export -> notify așteaptă
după separare:
  heavy -> workeri pentru export
  fast  -> workeri pentru notify (liberi)
```
Aplicare:
```python
app.conf.task_routes = {"reports.*": {"queue": "heavy"}}
# celery -A app worker -Q heavy -c 2
# celery -A app worker -Q celery -c 16
```
Legătură: E ca în Docker Swarm, când ai servicii separate pentru API și pentru un job batch, ca să le scalezi diferit.
Limită: Cozile separate nu fac task-urile grele mai rapide; doar le izolează. Pentru task-urile lungi setezi și `worker_prefetch_multiplier=1`, ca un worker să nu rezerve mesaje pe care nu le poate procesa curând.
La interviu: „Task-urile lungi ocupă sloturile workerilor, iar cele scurte așteaptă. Le separ cu `task_routes` pe cozi dedicate și pornesc workeri diferiți pentru fiecare coadă, cu concurența și pool-ul potrivite tipului de muncă.”
Verificare: Ai mutat exporturile pe coada `heavy`, dar n-ai pornit niciun worker cu `-Q heavy`. Ce se întâmplă cu exporturile?
Răspuns verificare: Stau în coadă la nesfârșit: niciun worker nu consumă din `heavy`.
Varianta greșită B: Celery nu prioritizează după durată: ia mesajele în ordinea din coadă.
Varianta greșită C: Reîncercările nu ajută: task-urile rapide nu eșuează, ci așteaptă un slot liber.
Varianta greșită D: Problema nu e brokerul, ci workerii ocupați. Schimbarea brokerului nu eliberează sloturi.

### cel-09
Pe scurt: Un chord rulează un group de task-uri în paralel și, după ce s-au terminat toate, rulează un callback cu lista rezultatelor.
Scop: E tiparul „împarte munca, apoi combină rezultatele”: scanezi 20 de sisteme SAP în paralel, apoi generezi un singur raport.
Mecanism: `group` pornește task-urile în paralel. Chord-ul le urmărește prin result backend, iar când s-a terminat și ultimul, apelează callback-ul cu lista rezultatelor, în ordinea task-urilor din group.
Pas cu pas:
```text
scan(s1) ┐
scan(s2) ├─ toate gata
scan(s3) ┘      │
                ▼
build_report([r1, r2, r3])
```
Aplicare:
```python
from celery import chord
chord(scan.s(sid) for sid in system_ids)(
    build_report.s())
```
Legătură: Seamănă cu `asyncio.gather` urmat de o funcție care primește lista rezultatelor, doar că munca e distribuită pe workeri.
Limită: Chord-ul cere un result backend (Redis sau o bază de date). Dacă un task din group eșuează, callback-ul nu rulează normal, așa că tratezi erorile în task-uri sau într-un callback de eroare.
La interviu: „chain înseamnă secvență, group înseamnă paralel, iar chord e un group plus un callback care primește toate rezultatele la final. Chord-ul are nevoie de result backend.”
Verificare: Ai nevoie ca task-ul B să primească rezultatul lui A, iar C pe al lui B. Ce primitivă folosești?
Răspuns verificare: `chain(A.s(), B.s(), C.s())`: fiecare task primește rezultatul celui dinainte.
Varianta greșită B: Task-urile periodice le programează Beat. Chord-ul e o compunere de task-uri, nu un program în timp.
Varianta greșită C: Prioritatea se configurează pe cozi sau pe mesaje. Chord-ul n-are legătură cu prioritatea.
Varianta greșită D: Ce descrie varianta asta e `chain`. Chord-ul rulează task-urile în paralel.

### cel-10
Pe scurt: Cu Redis, un mesaj neconfirmat redevine vizibil după `visibility_timeout` (implicit o oră), deci un task programat peste 2 ore e livrat din nou și altor workeri.
Scop: Task-urile programate cu întârziere mare, ca reminder-ele sau rapoartele, pot rula de mai multe ori pe Redis. Trebuie să știi de ce și cum previi.
Mecanism: Redis nu are ack-uri ca RabbitMQ, iar Celery le simulează: un mesaj preluat e mutat deoparte și, dacă nu e confirmat în `visibility_timeout`, e pus înapoi în coadă. Un task cu `countdown` mare e preluat imediat de un worker și ținut neconfirmat până la ora execuției, deci timeout-ul expiră înainte.
Pas cu pas:
```text
10:00 worker A ia task-ul (ETA 12:00), neconfirmat
11:00 expiră visibility_timeout -> re-livrare
11:00 worker B ia și el task-ul (ETA 12:00)
12:00 task-ul rulează de 2 ori
```
Aplicare: Mărești `broker_transport_options={"visibility_timeout": 43200}` peste cea mai mare întârziere pe care o folosești sau eviți ETA-urile lungi: le programezi cu Beat sau dintr-o tabelă de joburi.
Legătură: E aceeași re-livrare ca la `acks_late`: un mesaj neconfirmat poate ajunge din nou la un worker. Și RabbitMQ are o limită asemănătoare, `consumer_timeout` (implicit 30 de minute).
Limită: Un `visibility_timeout` foarte mare are și el un cost: dacă un worker chiar moare, task-urile lui reapar abia după acest timp.
La interviu: „Pe Redis, mesajele neconfirmate se re-livrează după `visibility_timeout`, implicit o oră. Un task cu countdown de 2 ore stă neconfirmat la worker, deci e livrat din nou. Măresc timeout-ul peste cel mai lung ETA sau evit ETA-urile lungi.”
Verificare: Ai `visibility_timeout` de o oră și un task fără ETA care durează 90 de minute, cu `acks_late=True`. Ce risc apare?
Răspuns verificare: După o oră mesajul e re-livrat, iar alt worker începe același task în paralel. Mărești timeout-ul peste durata maximă a task-urilor.
Varianta greșită B: Un restart al workerului nu duplică singur mesajele. Re-livrarea vine din expirarea timeout-ului.
Varianta greșită C: Beat publică doar task-urile periodice din programul lui. Un task cu `countdown` nu trece prin Beat.
Varianta greșită D: `countdown` e suportat și pe Redis. Tocmai felul în care e implementat (mesaj ținut neconfirmat) produce problema.

### cel-11
Pe scurt: JSON, pentru că pickle poate executa cod arbitrar la deserializare: oricine poate scrie în broker ar putea rula cod pe workeri.
Scop: La o firmă de securitate, „de ce nu pickle?” e o întrebare de reflex. Un broker compromis sau expus nu trebuie să devină execuție de cod pe toți workerii.
Mecanism: pickle reconstruiește obiectele apelând funcțiile indicate chiar în date (`__reduce__`). Un mesaj fabricat de un atacator poate cere, la încărcare, `os.system(...)`. JSON produce doar dicționare, liste, stringuri și numere, deci datele nu pot cere execuție de cod.
Pas cu pas:
```text
atacator -> broker: mesaj pickle cu __reduce__
worker: pickle.loads(mesaj)
  -> apelează os.system(...)  (execuție de cod)
cu JSON: mesajul devine doar un dict
```
Aplicare:
```python
app.conf.task_serializer = "json"
app.conf.accept_content = ["json"]
app.conf.result_serializer = "json"
```
`accept_content` face workerul să refuze orice alt format.
Legătură: E aceeași problemă ca un `pickle.loads` pe date din Redis sau din cookie-uri: deserializare nesigură.
Limită: JSON nu știe de `datetime`, `Decimal` sau obiecte proprii. Le convertești explicit (string ISO, string) sau folosești un serializer sigur, cu schemă.
La interviu: „Folosesc JSON și `accept_content=['json']`: pickle poate executa cod la deserializare, deci oricine poate scrie în broker ar putea rula cod pe workeri. JSON e implicit din Celery 4.”
Verificare: Ai setat `task_serializer = "json"`, dar `accept_content` include și `"pickle"`. E suficient?
Răspuns verificare: Nu: workerul acceptă în continuare mesaje pickle venite din altă parte. `accept_content` trebuie restrâns la `["json"]`.
Varianta greșită B: Viteza nu compensează riscul: pickle pe date care trec prin broker deschide calea spre execuție de cod.
Varianta greșită C: YAML cu obiecte Python complete are aceeași problemă ca pickle, pentru că poate construi obiecte arbitrare. Nu e o alegere sigură.
Varianta greșită D: Diferența de securitate e chiar miezul întrebării: pickle poate rula cod, JSON nu.

### cel-12
Pe scurt: Pentru task-uri CPU-bound folosești prefork (procese), care e și pool-ul implicit: fiecare proces are GIL-ul lui.
Scop: Parsarea, criptarea sau procesarea de imagini în Python pur au nevoie de core-uri reale, iar threadurile nu ți le dau.
Mecanism: prefork pornește N procese worker; fiecare rulează câte un task pe core-ul lui, fără să concureze pentru același GIL. Pool-urile threads, gevent și eventlet rulează într-un singur proces: sunt bune când task-urile așteaptă I/O, dar inutile pentru calcul.
Pas cu pas:
```text
prefork -c 4: 4 procese -> 4 core-uri ocupate
threads -c 4: 1 proces, 1 GIL -> cam 1 core
gevent -c 500: 1 proces -> multe I/O în așteptare
```
Aplicare: `celery -A app worker --pool prefork -c 4` pentru calcul (concurrency cât numărul de core-uri) și `--pool gevent -c 500` pentru task-uri care fac mai ales request-uri HTTP.
Legătură: E exact regula de la GIL: CPU-bound înseamnă procese, I/O-bound înseamnă threads sau asyncio.
Limită: Procesele costă memorie, pentru că fiecare încarcă aplicația. Codul nativ care eliberează GIL-ul (NumPy, OpenCV) poate scala și pe threaduri.
La interviu: „Pentru task-uri CPU-bound folosesc prefork, implicit în Celery, cu concurrency cât numărul de core-uri: fiecare proces are GIL-ul lui. Pentru task-uri I/O-bound cu concurență mare aleg threads sau gevent.”
Verificare: Un worker face doar request-uri HTTP spre 1.000 de sisteme. Ce pool alegi?
Răspuns verificare: gevent sau threads, cu concurență mare: task-urile mai mult așteaptă rețeaua, deci un singur proces poate ține sute de request-uri în paralel.
Varianta greșită B: Threadurile din același proces împart GIL-ul: pentru calcul în Python pur, lucrează practic pe un singur core.
Varianta greșită C: gevent dă concurență mare pentru I/O, într-un singur proces, dar nu ajută la calcul.
Varianta greșită D: eventlet nu ocolește GIL-ul. Monkey patching-ul face doar ca I/O-ul să fie cooperativ, tot într-un singur proces.

### cel-13
Pe scurt: `soft_time_limit` aruncă `SoftTimeLimitExceeded` în task, ca acesta să poată face cleanup înainte ca `time_limit` să omoare procesul.
Scop: Un task blocat, de exemplu de un API extern care nu răspunde, ține un slot ocupat la nesfârșit. Vrei să-l oprești, dar curat: să eliberezi resursele și să marchezi jobul ca eșuat.
Mecanism: Când expiră limita soft, Celery ridică excepția în codul task-ului, iar tu o poți prinde ca să faci cleanup. Dacă task-ul tot nu se oprește, la `time_limit` (limita hard) procesul worker e omorât și înlocuit.
Pas cu pas:
```text
0 s:   task-ul pornește
300 s: limita soft
  -> SoftTimeLimitExceeded
  -> cleanup, job marcat „timeout”
330 s: limita hard
  -> procesul e omorât forțat
```
Aplicare:
```python
from celery.exceptions import SoftTimeLimitExceeded

@app.task(soft_time_limit=300, time_limit=330)
def scan_system(sid):
    try:
        run_scan(sid)
    except SoftTimeLimitExceeded:
        mark_timeout(sid)
```
Legătură: Seamănă cu `--timeout` de la Gunicorn, dar cu o etapă de avertizare înaintea opririi forțate.
Limită: Limitele de timp nu înlocuiesc timeout-urile pe I/O: pui în continuare `timeout=` pe request-urile HTTP și pe query-uri, ca task-ul să nu stea blocat până la limită.
La interviu: „`soft_time_limit` ridică `SoftTimeLimitExceeded` în task, ca să pot face cleanup, iar `time_limit` omoară procesul dacă task-ul nu se oprește. Le combin cu timeout-uri explicite pe apelurile de I/O.”
Verificare: Prinzi `SoftTimeLimitExceeded`, dar în `except` reiei procesarea de la capăt, care mai durează 5 minute. Ce se întâmplă?
Răspuns verificare: Ajungi la `time_limit`, iar procesul e omorât forțat, fără cleanup. În `except` faci doar o curățenie rapidă.
Varianta greșită B: Pauza dintre retry-uri o controlează `countdown`, `retry_backoff` și `retry_backoff_max`.
Varianta greșită C: Expirarea mesajelor din coadă se setează cu `expires`, nu cu limitele de timp de execuție.
Varianta greșită D: Timeout-urile conexiunii la broker sunt setări de transport. `soft_time_limit` se referă la durata task-ului.

### cel-14
Pe scurt: Brokerul ține coada: aplicația publică mesaje cu task-uri, iar workerii le preiau de acolo.
Scop: Decuplezi cine cere munca de cine o face: API-ul răspunde repede, iar workerii pot fi opriți, reporniți sau scalați fără să piardă munca din coadă.
Mecanism: `task.delay()` serializează numele task-ului și argumentele într-un mesaj și îl trimite brokerului (RabbitMQ sau Redis). Brokerul îl păstrează până când îl ia un worker liber. Workerul execută codul și confirmă mesajul.
Pas cu pas:
```text
API -> delay() -> broker (coadă)
broker -> worker 1 / worker 2
worker -> rezultat -> result backend
```
Aplicare: `app = Celery("app", broker="amqp://...")` pentru RabbitMQ sau `broker="redis://..."` pentru Redis. Rezultatele, dacă îți trebuie, merg în `backend=...`.
Legătură: E ca o cutie poștală între două servicii: cine trimite nu trebuie să știe cine citește și când.
Limită: Brokerul nu execută cod și nu stochează rezultate: de acestea se ocupă workerii și result backend-ul.
La interviu: „Brokerul e coada dintre aplicație și workeri: aplicația publică task-uri, iar workerii le consumă. Asta decuplează API-ul de procesare și permite retry și scalare independentă.”
Verificare: Toți workerii sunt opriți 10 minute pentru un deploy, iar API-ul continuă să publice task-uri. Ce se întâmplă cu ele?
Răspuns verificare: Rămân în coadă, în broker. Când workerii pornesc din nou, le procesează.
Varianta greșită B: Codul îl execută workerii. Brokerul doar transportă mesajele.
Varianta greșită C: Rezultatele stau în result backend (de exemplu Redis sau o bază de date), configurat separat.
Varianta greșită D: De programul periodic se ocupă Celery Beat, care publică task-urile în broker la ora setată.

### cel-15
Pe scurt: `delay()` publică un mesaj în coadă și revine imediat cu un `AsyncResult`; task-ul rulează mai târziu, pe un worker.
Scop: Vrei ca request-ul HTTP să nu aștepte după munca grea: o pornești în fundal și răspunzi imediat.
Mecanism: `send_report.delay(42)` e scurtătura pentru `send_report.apply_async(args=[42])`. Celery serializează numele task-ului și argumentele, trimite mesajul la broker și îți întoarce un obiect cu id-ul task-ului, fără să aștepte execuția.
Pas cu pas:
```text
r = send_report.delay(42)
  -> mesaj în broker, revine imediat
r.id -> „3f2a...”
pe worker: send_report(42)
  -> rulează mai târziu
```
Aplicare: Pentru opțiuni (coadă, întârziere) folosești `apply_async`, de exemplu `send_report.apply_async(args=[42], countdown=60, queue="reports")`.
Legătură: În Django cu Celery ai folosit exact `task.delay(obj.pk)` din view-uri.
Limită: `send_report(42)` fără `delay` rulează funcția imediat, în procesul curent, ca un apel normal. Iar `r.get()` blochează până vine rezultatul, deci nu-l apelezi într-un request web.
La interviu: „`delay()` e scurtătura pentru `apply_async`: publică task-ul în broker și întoarce imediat un AsyncResult cu id-ul task-ului, iar un worker îl execută separat.”
Verificare: În view scrii `result = send_report.delay(42).get()`. Ce câștig mai ai față de apelul direct al funcției?
Răspuns verificare: Practic niciunul: `get()` blochează request-ul până termină workerul. Ai adăugat doar latența cozii.
Varianta greșită B: Asta face apelul direct, fără `delay`: `send_report(report_id)`.
Varianta greșită C: `delay()` nu așteaptă rezultatul. Pentru asta ar trebui `.get()` pe rezultat, care blochează.
Varianta greșită D: Programarea periodică se face cu Beat. `delay()` pornește o singură execuție.
