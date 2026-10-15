<!-- RabbitMQ. Variantele greșite: B, C, D = ordinea din sursă (A e cea corectă). -->

### rmq-01
Pe scurt: Un exchange de tip topic, cu binding-ul `sap.*.security`: `*` se potrivește cu exact un cuvânt, deci prinde și `prd`, și `dev`.
Scop: Rutezi evenimentele după tipare (mediu, sistem, tip de eveniment) cu un singur binding, nu cu câte unul pentru fiecare combinație.
Mecanism: Routing key-ul e format din cuvinte separate prin punct. Un exchange topic compară cheia cu tiparul fiecărui binding: `*` înlocuiește exact un cuvânt, iar `#` zero sau mai multe. Mesajul ajunge în toate cozile ale căror tipare se potrivesc.
Pas cu pas:
```text
binding: sap.*.security -> coada sec
sap.prd.security   -> sec: da
sap.dev.security   -> sec: da
sap.prd.audit      -> nu
sap.prd.eu.security -> nu (* = un cuvânt)
```
Aplicare:
```python
ch.exchange_declare("events",
                    exchange_type="topic")
ch.queue_bind("security", "events",
              routing_key="sap.*.security")
```
Legătură: Seamănă cu tiparele pentru numele indexurilor din Elasticsearch (`logs-*`), doar că aici tiparul se aplică routing key-ului, cuvânt cu cuvânt.
Limită: Cu `#` (de exemplu `sap.#`) prinzi tot ce începe cu `sap`, pe oricâte niveluri. Tiparele prea largi umplu coada cu mesaje pe care consumatorul le aruncă.
La interviu: „Folosesc un topic exchange cu binding-ul `sap.*.security`: `*` înseamnă exact un cuvânt, `#` zero sau mai multe. Un direct exchange ar cere cheia exactă, iar fanout ar ignora cheia.”
Verificare: Vrei toate evenimentele de securitate, din orice mediu, inclusiv chei ca `sap.prd.eu.security`. Ce tipar folosești?
Răspuns verificare: `sap.#.security`: `#` acoperă oricâte cuvinte între `sap` și `security`, inclusiv niciunul.
Varianta greșită B: Fanout ignoră complet routing key-ul și tiparul binding-ului: copiază mesajul în toate cozile legate, deci ar trimite și `sap.prd.audit`.
Varianta greșită C: Direct cere potrivire exactă: binding-ul `sap.*.security` ar prinde doar o cheie identică, cu asteriscul cu tot.
Varianta greșită D: Headers rutează după headerele mesajului, nu după routing key, iar `#` nu are nicio semnificație acolo.

### rmq-02
Pe scurt: Mesajul e pierdut: cu auto-ack, brokerul l-a considerat livrat chiar când l-a trimis, deci l-a șters deja.
Scop: Alegerea între auto-ack și ack manual decide dacă un crash pierde date. Pentru evenimente de securitate, pierderea e inacceptabilă.
Mecanism: Cu auto-ack, RabbitMQ șterge mesajul imediat ce îl trimite consumatorului. Dacă procesul moare în timpul procesării, nu mai există nicio copie. Cu ack manual, mesajul rămâne „neconfirmat” la broker, iar dacă se închide canalul fără ack, e pus înapoi în coadă și livrat altui consumator.
Pas cu pas:
```text
auto-ack:
  broker -> consumator, mesaj șters
  crash -> mesaj pierdut
ack manual:
  broker -> consumator (neconfirmat)
  crash -> canal închis -> re-livrare
```
Aplicare:
```python
def on_msg(ch, method, props, body):
    process(body)
    ch.basic_ack(method.delivery_tag)

ch.basic_consume("alerts", on_msg,
                 auto_ack=False)
```
Legătură: E exact ce ai văzut la CEL-02 și CEL-03: în Celery, ack-ul implicit vine înainte de execuție, iar `acks_late=True` îl mută după.
Limită: Ack-ul manual dă at-least-once: dacă procesul moare după procesare, dar înainte de ack, mesajul e procesat din nou. Consumatorul trebuie să fie idempotent.
La interviu: „Cu auto-ack, mesajul e considerat livrat la trimitere, deci un crash îl pierde: at-most-once. Folosesc ack manual după procesare, deci at-least-once, și fac consumatorul idempotent.”
Verificare: Consumatorul face ack manual, dar îl trimite la începutul funcției, înainte de procesare. Ce garanție ai?
Răspuns verificare: Tot at-most-once: dacă procesul crapă după ack, mesajul e deja șters. Ack-ul se trimite după ce procesarea s-a terminat.
Varianta greșită B: Re-livrarea funcționează doar pentru mesajele neconfirmate. Cu auto-ack, mesajul e confirmat chiar la trimitere, deci nu mai are ce re-livra.
Varianta greșită C: În DLX ajung mesajele respinse fără requeue, cele expirate sau cele care depășesc limita cozii. Un mesaj deja confirmat nu ajunge acolo.
Varianta greșită D: Mesajul a fost șters din coadă la trimitere, deci nu mai rămâne nimic de așteptat până la repornire.

### rmq-03
Pe scurt: Prefetch count limitează câte mesaje neconfirmate poate avea un consumator odată; peste limită, brokerul nu-i mai trimite nimic până nu confirmă ceva.
Scop: Vrei ca munca să se împartă echitabil între consumatori și ca unul lent să nu-și adune sute de mesaje pe care le-ar putea procesa alții.
Mecanism: Fără limită, brokerul împinge mesajele spre consumatori cât de repede poate, iar ele stau în buffer-ul consumatorului. Cu `basic_qos(prefetch_count=N)`, fiecare consumator are cel mult N mesaje neconfirmate; restul rămân în coadă, la dispoziția consumatorilor liberi.
Pas cu pas:
```text
prefetch 1000, task de 10 s:
  C1 primește 1000 de mesaje
  C2 pornește -> coada e goală
prefetch 1, task de 10 s:
  C1 ia 1, C2 ia 1 -> împart munca
```
Aplicare:
```python
ch.basic_qos(prefetch_count=1)  # task-uri lungi
# prefetch_count=50 pentru mesaje mici, rapide
```
Legătură: Celery are aceeași setare, `worker_prefetch_multiplier`, pe care o pui la 1 pentru task-uri lungi (CEL-08).
Limită: Un prefetch prea mic la mesaje foarte rapide face consumatorul să aștepte după rețea între mesaje. Pentru mesaje mici, valori de zeci sau sute cresc throughput-ul.
La interviu: „Prefetch-ul limitează câte mesaje neconfirmate ține un consumator. Pentru task-uri lungi folosesc prefetch 1, ca munca să se împartă echitabil; pentru mesaje mici și rapide, o valoare mai mare, pentru throughput.”
Verificare: Ai prefetch 1000 și ack manual, iar un consumator crapă după ce a primit 1000 de mesaje. Ce se întâmplă cu ele?
Răspuns verificare: Toate mesajele neconfirmate se întorc în coadă la închiderea canalului și le preiau alți consumatori. Nu se pierd, dar unele pot fi procesate de două ori.
Varianta greșită B: Dimensiunea cozii se limitează cu `x-max-length` sau `x-max-length-bytes`, nu cu prefetch.
Varianta greșită C: Numărul de livrări înainte de DLQ se limitează cu `delivery-limit`, pe quorum queues. Prefetch-ul n-are legătură cu retry-urile.
Varianta greșită D: Prefetch-ul ține de consumator. Pe partea producătorului există publisher confirms, care nu impun o asemenea limită.

### rmq-04
Pe scurt: Ai nevoie de o coadă durable și de mesaje persistente (`delivery_mode=2`), iar publisher confirms îți spun când brokerul le-a preluat în siguranță.
Scop: Un restart de broker (deploy, crash, mentenanță) nu trebuie să piardă evenimentele aflate în coadă.
Mecanism: „Durable” privește definiția cozii: o coadă non-durable dispare la restart, cu tot cu mesaje. „Persistent” privește mesajul: doar mesajele marcate persistente sunt scrise pe disc. Cu publisher confirms, brokerul confirmă fiecare mesaj după ce l-a preluat, iar producătorul retrimite ce nu a fost confirmat.
Pas cu pas:
```text
durable + persistent  -> rămâne
durable + tranzitoriu -> mesaj pierdut
coadă non-durable     -> dispare cu tot
confirm de la broker  -> e în siguranță
```
Aplicare:
```python
ch.queue_declare("alerts", durable=True)
ch.confirm_delivery()
ch.basic_publish(
    "", "alerts", body,
    properties=pika.BasicProperties(
        delivery_mode=2))
```
Legătură: E ca la Postgres: un COMMIT confirmat înseamnă că datele sunt pe disc. Publisher confirm e „commit-ul” dintre producător și broker.
Limită: Pe un singur nod, discul rămâne un punct unic de defect. Pentru disponibilitate folosești quorum queues (RMQ-09), replicate pe mai multe noduri; la ele, mesajele sunt mereu persistente.
La interviu: „Ca mesajele să supraviețuiască unui restart îmi trebuie coadă durable și mesaje persistente, iar cu publisher confirms știu că brokerul le-a preluat. În RabbitMQ 4.x folosesc quorum queues, replicate.”
Verificare: Ai coadă durable și mesaje persistente, dar nu folosești publisher confirms. Brokerul crapă imediat după ce producătorul a trimis un mesaj. E sigur că mesajul există?
Răspuns verificare: Nu: mesajul putea fi încă pe drum sau nescris pe disc. Fără confirm, producătorul nu știe dacă trebuie să-l retrimită.
Varianta greșită B: Mesajele nu moștenesc durabilitatea cozii: un mesaj tranzitoriu dintr-o coadă durable se pierde la restart.
Varianta greșită C: O coadă non-durable dispare la restart, cu toate mesajele din ea, chiar dacă sunt marcate persistente.
Varianta greșită D: RabbitMQ păstrează după restart doar ce i-ai cerut: cozi durable și mesaje persistente.

### rmq-05
Pe scurt: Respingi mesajul fără requeue (`basic_reject(requeue=False)`), iar coada îl trimite într-un dead letter exchange, unde îl poți inspecta.
Scop: Un singur mesaj stricat nu trebuie să blocheze consumatorul la nesfârșit și nici să dispară fără urmă.
Mecanism: Cu requeue, mesajul revine imediat în coadă, consumatorul îl ia din nou și eșuează din nou: o buclă infinită, care consumă CPU și încurcă restul procesării. O coadă declarată cu `x-dead-letter-exchange` trimite mesajele respinse fără requeue spre acel exchange, care le pune într-o coadă separată (DLQ).
Pas cu pas:
```text
mesaj malformat -> consumator -> eroare
requeue=True  -> revine -> eroare -> ...
requeue=False -> DLX -> coada alerts.dlq
alertă pe DLQ -> investighezi manual
```
Aplicare:
```python
ch.queue_declare("alerts", durable=True,
    arguments={"x-dead-letter-exchange": "dlx"})

try:
    handle(json.loads(body))
    ch.basic_ack(method.delivery_tag)
except ValueError:
    ch.basic_reject(method.delivery_tag,
                    requeue=False)
```
Legătură: E aceeași separare ca la retry-urile din Celery (CEL-04): erorile tranzitorii se reîncearcă, cele permanente, ca datele greșite, nu.
Limită: Diferențiezi tipul erorii: un mesaj malformat merge direct în DLQ, iar o eroare tranzitorie (DB căzută) merită retry cu întârziere. Pe quorum queues, `delivery-limit` trimite automat mesajul în DLX după N livrări eșuate.
La interviu: „Un poison message îl resping fără requeue, spre un dead letter exchange, ca să nu blocheze coada și să-l pot investiga. Pun o alertă pe DLQ. Erorile tranzitorii le reîncerc separat, cu întârziere.”
Verificare: Consumatorul face `basic_nack(requeue=True)` la orice eroare, inclusiv când DB-ul e căzut 10 minute. Ce se întâmplă în acest timp?
Răspuns verificare: Mesajele se învârt într-o buclă strânsă (livrate, respinse, livrate din nou) și consumă CPU și rețea fără progres. Mai bine un retry cu întârziere sau oprești temporar consumul.
Varianta greșită B: Requeue la infinit nu rezolvă un mesaj malformat: va eșua mereu, iar bucla consumă resurse și încurcă procesarea.
Varianta greșită C: Recrearea cozii șterge toate mesajele, inclusiv pe cele bune, și nu păstrează mesajul problematic pentru investigație.
Varianta greșită D: Un prefetch mai mare nu oprește bucla: mesajul stricat tot revine și eșuează, doar că acum consumatorul ține mai multe mesaje odată.

### rmq-06
Pe scurt: O coadă livrează mesajele în ordine FIFO, dar cu mai mulți consumatori sau cu requeue, procesarea poate ieși din ordine.
Scop: Dacă evenimentele aceluiași sistem trebuie procesate în ordine (de exemplu, „creat” înainte de „șters”), trebuie să proiectezi explicit pentru asta.
Mecanism: Coada dă mesajele consumatorilor în ordinea în care au intrat. Dar cu doi consumatori, mesajul 1 poate ajunge la unul lent, iar mesajul 2 la unul rapid, care termină primul. Un mesaj respins cu requeue poate fi și el procesat după mesaje care au intrat după el.
Pas cu pas:
```text
coada: m1, m2, m3
C1 ia m1 (lent, 2 s)
C2 ia m2 (rapid) -> termină primul
C2 ia m3 -> termină
ordinea procesării: m2, m3, m1
```
Aplicare: Dacă ordinea contează per entitate (de exemplu, per sistem SAP), rutezi după cheie spre cozi dedicate, cu câte un consumator, sau folosești single active consumer (`x-single-active-consumer`). Alternativ, faci procesarea tolerantă: compari versiunea sau timestamp-ul evenimentului cu ce ai deja.
Legătură: E ca la două request-uri HTTP trimise în paralel: nu știi care se termină primul, deci nu te bazezi pe ordinea răspunsurilor.
Limită: Un singur consumator per coadă păstrează ordinea, dar limitează throughput-ul. De aceea împarți pe chei: ordine în cadrul fiecărei entități, paralelism între entități.
La interviu: „RabbitMQ păstrează ordinea FIFO într-o coadă, dar cu mai mulți consumatori sau cu requeue procesarea iese din ordine. Dacă ordinea contează per entitate, rutez după cheie spre cozi dedicate, cu un consumator fiecare, sau folosesc single active consumer.”
Verificare: Ai un singur consumator, cu prefetch 10, și un mesaj din mijloc e respins cu requeue. Se păstrează ordinea?
Răspuns verificare: Nu: mesajele de după el sunt deja la consumator, datorită prefetch-ului, și sunt procesate înainte ca mesajul respins să fie livrat din nou.
Varianta greșită B: Ordinea nu e garantată global: fiecare coadă are ordinea ei, iar între cozi nu există nicio coordonare.
Varianta greșită C: Într-o singură coadă există ordine FIFO; ea se strică abia la consumul paralel sau la requeue.
Varianta greșită D: Fanout copiază mesajul în mai multe cozi, dar nu adaugă nicio garanție de ordine.

### rmq-08
Pe scurt: Un fanout exchange copiază fiecare mesaj în toate cozile legate de el, ignorând routing key-ul.
Scop: Când același eveniment trebuie consumat independent de mai multe servicii (notificări, audit, SIEM), fiecare primește propria copie, în propria coadă.
Mecanism: Fanout nu se uită la routing key: orice mesaj primit ajunge în fiecare coadă legată de exchange. Fiecare serviciu consumă din coada lui, în ritmul lui; dacă unul e oprit, mesajele se adună doar în coada lui.
Pas cu pas:
```text
alertă -> fanout "alerts"
  -> coada notify -> email
  -> coada audit  -> audit log
  -> coada siem   -> integrarea SIEM
```
Aplicare:
```python
ch.exchange_declare("alerts",
                    exchange_type="fanout")
for q in ("notify", "audit", "siem"):
    ch.queue_declare(q, durable=True)
    ch.queue_bind(q, "alerts")
```
Legătură: E modelul publish/subscribe: ca un eveniment în JavaScript cu mai mulți ascultători, doar că aici fiecare ascultător are propria coadă durabilă.
Limită: O coadă nouă primește doar mesajele publicate după binding, nu istoricul. Iar dacă un consumator e oprit mult timp, coada lui crește: pui o limită (`x-max-length`) sau o alertă.
La interviu: „Fanout copiază mesajul în toate cozile legate și ignoră routing key-ul. Îl folosesc pentru broadcast: aceeași alertă consumată independent de notificări, audit și SIEM, fiecare din coada lui.”
Verificare: Vrei ca doar alertele critice să ajungă la SIEM, iar toate să ajungă în audit. Mai merge fanout?
Răspuns verificare: Nu: fanout nu filtrează. Folosești un exchange topic sau direct, cu routing key-uri ca `alert.critical`, și binding-uri diferite pentru fiecare coadă.
Varianta greșită B: Fanout trimite mesajul în toate cozile legate, nu într-una aleasă la întâmplare.
Varianta greșită C: Rutarea după headere e treaba exchange-ului de tip headers. Fanout ignoră și cheia, și headerele.
Varianta greșită D: Împărțirea mesajelor între consumatorii aceleiași cozi o face coada (round-robin), indiferent de tipul exchange-ului.

### rmq-09
Pe scurt: Quorum queues: cozi replicate pe mai multe noduri prin consens Raft, tipul de coadă replicată din RabbitMQ 4.x, după eliminarea mirroring-ului clasic.
Scop: Vrei ca o coadă să supraviețuiască pierderii unui nod fără să pierzi mesajele confirmate.
Mecanism: O quorum queue are un lider și mai mulți urmăritori, pe noduri diferite. O scriere e confirmată abia după ce a ajuns pe majoritatea nodurilor (de exemplu 2 din 3). Dacă liderul cade, un urmăritor cu datele la zi devine lider.
Pas cu pas:
```text
3 noduri: lider + 2 urmăritori
publish -> lider -> replicat pe 2/3
  -> confirm către producător
liderul cade -> alt nod devine lider
mesajele confirmate rămân
```
Aplicare:
```python
ch.queue_declare("alerts", durable=True,
    arguments={"x-queue-type": "quorum",
               "x-delivery-limit": 5})
```
Legătură: Seamănă cu replicile din Elasticsearch: fiecare shard are copii pe alte noduri, ca un nod căzut să nu piardă date.
Limită: Quorum queues sunt mereu durable și persistente și costă mai mult (replicare, disc). Au nevoie de cel puțin 3 noduri ca să tolereze căderea unuia. În 4.x au implicit o limită de 20 de livrări per mesaj.
La interviu: „În RabbitMQ 4.x folosesc quorum queues: replicate prin Raft, cu o scriere confirmată când ajunge pe majoritatea nodurilor. Mirroring-ul clasic a fost eliminat în 4.0. În plus, au `delivery-limit` pentru poison messages.”
Verificare: Ai un cluster de 3 noduri și cad 2 dintre ele. Mai poți publica în quorum queue?
Răspuns verificare: Nu: nu mai există majoritate (1 din 3), deci coada nu mai acceptă scrieri până nu revine măcar un nod. Consensul alege consistența în locul disponibilității.
Varianta greșită B: Classic mirrored queues au fost eliminate în RabbitMQ 4.0, iar politica `ha-mode` nu mai are efect.
Varianta greșită C: O coadă exclusivă aparține unei singure conexiuni și dispare odată cu ea: opusul disponibilității.
Varianta greșită D: O coadă auto-delete dispare când pleacă ultimul consumator și nu replică nimic.

### rmq-10
Pe scurt: Producătorul publică într-un exchange, cu un routing key; consumatorul citește dintr-o coadă legată de acel exchange printr-un binding.
Scop: E modelul de bază din RabbitMQ: separă cine trimite de cine primește, iar regulile de rutare stau în broker, nu în cod.
Mecanism: Exchange-ul nu stochează mesaje: le rutează imediat în cozile legate, după tipul lui și după binding-uri. Coada păstrează mesajele până le consumă cineva. Exchange-ul implicit, cu numele gol, rutează direct în coada al cărei nume e egal cu routing key-ul.
Pas cu pas:
```text
producător -> exchange "events" + cheie
exchange -> binding-uri -> coada A, B
consumator 1 <- coada A
consumator 2 <- coada B
```
Aplicare:
```python
ch.basic_publish(exchange="events",
                 routing_key="sap.prd.security",
                 body=payload)
ch.basic_consume("security", on_msg)
```
Legătură: Ca la poștă: exchange-ul e centrul de sortare, coada e cutia poștală, iar binding-ul e regula „scrisorile pentru adresa X merg în cutia Y”.
Limită: Dacă mesajul nu se potrivește cu nicio coadă, e aruncat în tăcere. Cu `mandatory=True` primești mesajul înapoi, iar un alternate exchange îl poate prinde.
La interviu: „În RabbitMQ, producătorul publică într-un exchange, cu un routing key, iar exchange-ul rutează mesajul în cozile legate prin binding-uri. Consumatorii citesc din cozi.”
Verificare: Publici în exchange-ul `events` cu cheia `sap.qa.security`, dar există doar binding-ul `sap.prd.*`. Unde ajunge mesajul?
Răspuns verificare: Nicăieri: nu se potrivește cu niciun binding, așa că e aruncat, fără eroare. Ca să nu-l pierzi, folosești `mandatory=True` sau un alternate exchange.
Varianta greșită B: E invers: publici în exchange și consumi din coadă. Exchange-ul nu stochează mesaje, deci n-ai din ce consuma.
Varianta greșită C: Exchange-ul nu are abonați și nu ține mesaje. Consumatorii citesc mereu din cozi.
Varianta greșită D: Producătorul publică într-un exchange. Copierea în mai multe cozi o face un exchange de tip fanout, nu coada.

### rmq-11
Pe scurt: Ack-ul e confirmarea trimisă de consumator că a procesat mesajul, după care brokerul îl poate șterge din coadă.
Scop: Momentul ack-ului decide dacă un crash pierde mesaje (at-most-once) sau le poate procesa de două ori (at-least-once).
Mecanism: Când livrează un mesaj, brokerul îl marchează ca neconfirmat, dar nu-l șterge. După ack, îl șterge definitiv. Dacă se închide canalul fără ack, de exemplu pentru că procesul a murit, brokerul pune mesajul înapoi în coadă și îl dă altui consumator.
Pas cu pas:
```text
broker -> consumator: msg (neconfirmat)
consumator: procesează -> ack
broker: șterge mesajul
fără ack + canal închis -> re-livrare
```
Aplicare: Trimiți ack după procesare (`basic_ack`). Pentru un mesaj pe care nu-l poți procesa trimiți `basic_nack` sau `basic_reject`, cu sau fără requeue.
Legătură: Ai întâlnit-o la Celery: `acks_late=True` înseamnă exact ack după execuție (CEL-03).
Limită: Ack după procesare înseamnă at-least-once: dacă procesul moare după procesare, dar înainte de ack, mesajul vine din nou. De aceea consumatorii trebuie să fie idempotenți.
La interviu: „Ack-ul e confirmarea consumatorului că a procesat mesajul; abia atunci brokerul îl șterge. Ack înainte de procesare dă at-most-once, ack după dă at-least-once, cu consumatori idempotenți.”
Verificare: Un consumator primește mesaje, dar uită să trimită ack. Ce vezi în RabbitMQ după câteva minute?
Răspuns verificare: Mesajele stau ca „Unacked” în interfața de administrare, iar consumatorul nu mai primește altele când atinge limita de prefetch. La închiderea canalului, toate se întorc în coadă.
Varianta greșită B: Confirmarea dinspre broker spre producător se numește publisher confirm. Ack-ul vine de la consumator.
Varianta greșită C: Când coada e plină, comportamentul depinde de setarea `overflow`: refuză publicarea sau aruncă mesajele vechi. Nu e un ack.
Varianta greșită D: Semnalul periodic dintre client și broker se numește heartbeat și verifică doar dacă trăiește conexiunea.
