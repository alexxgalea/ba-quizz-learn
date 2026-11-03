<!-- Desfășurările fișei `rabbitmq` (9 puncte). Format și reguli: lib.mjs (checkDesf), .scratch/desfasurari/spec.md. Faptele: research/_desf_facts_rabbitmq.md (secțiunea 34) și research/interview-facts.md, secțiunile 12, 13 și 26. Nu există broker RabbitMQ în mediu: exemplele Python sunt simulări în Python pur, iar codul pika și tabelul de potrivire sunt în blocuri `text` (neexecutate; faptele vin din documentație). C++ doar la 1 (coadă și consumator în același proces). -->

### harta
Problema: Serviciul de comenzi trebuie să anunțe facturile, stocul și emailul fără să le apeleze direct, altfel un serviciu picat blochează comanda. Un broker rezolvă asta, dar aduce întrebări noi: cine primește mesajul, ce se întâmplă dacă un consumator cade, cât primește deodată, ce supraviețuiește unui restart și ce faci cu mesajele care tot eșuează. Modulul răspunde la ele pe rând și se încheie cu alternativa Kafka.
Grupuri:
- 1–2: cum ajunge mesajul în cozi (exchange, binding, tipuri)
- 3–4: livrarea către consumator (ack și prefetch)
- 5–6: ce supraviețuiește căderilor (durabilitate și quorum queues)
- 7: mesajele care tot eșuează (dead letter exchange)
- 8: ordinea mesajelor
- 9: când alegi altceva (Kafka)

### 1
Greu: da
Problema: Serviciul de comenzi anunță facturile și stocul. Dacă scrie direct în coada fiecăruia, trebuie să știe câte cozi sunt și cum se numesc. Un al treilea consumator înseamnă să modifici producerul.
Ideea: Producerul publică într-un exchange, cu o routing key, și nu vede cozile. Binding-urile spun exchange-ului ce chei merg în ce coadă, iar el copiază mesajul în cozile potrivite. Consumatorul citește dintr-o coadă. Dacă nicio coadă nu se potrivește, mesajul se pierde sau se întoarce la producer, după atributele puse de el.
Exemplu:
```python
q = {"facturi": [], "stoc": []}
b = {"order.created": list(q)}
def publish(key, msg):
    for n in b.get(key, []):
        q[n].append(msg)
publish("order.created", "#7")
print(q["facturi"])  # → ['#7']
print(q["stoc"])  # → ['#7']
```
În C++: o `std::queue` păzită de `std::mutex` și `std::condition_variable`. Producătorul face `push` și `notify_one`, iar consumatorul așteaptă în `wait` și face `pop`.
Unde nu ține: coada C++ trăiește în memoria unui singur proces. N-are exchange, routing, persistență sau ack, iar `pop` scoate elementul chiar dacă consumatorul pică după aceea.
Legătură: RMQ-10 și CEL-14. În Celery, request-ul publică task-ul, iar brokerul îl ține până îl ia un worker. Exemplul simulează dirijarea în Python.

### 2
Greu: da
Problema: Alertele au chei ca `alert.critical.db` sau `alert.low.web`. Dashboard-ul vrea toate alertele, iar echipa web doar pe cele web. Cu chei exacte ai nevoie de câte un binding pentru fiecare combinație.
Ideea: Direct: mesajul merge unde cheia lui e egală cu cea din binding. Fanout: ignoră cheia și copiază mesajul în toate cozile legate. Topic: cheia are cuvinte separate prin `.`; în binding, `*` ține locul exact unui cuvânt, iar `#` a zero sau mai multor cuvinte. Headers: potrivește pe antetele mesajului, nu pe cheie.
Exemplu:
```text
alert.* și alert.db: da
alert.* și alert: nu
alert.# și alert: da
alert.# și alert.db.eu: da
```
Legătură: RMQ-01 și RMQ-08. Un singur binding topic poate prinde mai multe chei (RMQ-01), iar fanout nu se uită deloc la cheie (RMQ-08).

### 3
Greu: da
Problema: Consumatorul ia mesajul „trimite factura #42” și începe să lucreze, apoi procesul moare. Cu auto-ack brokerul a șters mesajul în clipa livrării, deci factura nu se mai trimite.
Ideea: La ack manual brokerul ține mesajul „în zbor” până primește `basic.ack`. Dacă canalul sau conexiunea cad fără ack, mesajul revine în coadă cu `redelivered=true`. Asta e at-least-once, deci consumatorul trebuie să fie idempotent. Auto-ack e at-most-once, iar documentația îl numește nesigur. Ack-ul pleacă pe canalul pe care a venit mesajul. Un `nack` cu `requeue=true` repune mesajul; pe o eroare permanentă, asta face o buclă.
Exemplu:
```python
def run(auto_ack):
    q, flight = [], ["m1"]  # livrat
    if auto_ack:
        flight.clear()  # șters acum
    return q + flight  # cade
print(run(True))   # → []
print(run(False))  # → ['m1']
```
Legătură: RMQ-02, RMQ-11, CEL-03 și DES-02. Celery confirmă implicit înainte de rulare; cu `acks_late` confirmă după, ca ack-ul manual de aici.

### 4
Greu: da
Problema: Două workere consumă aceeași coadă. Unul procesează un mesaj într-o secundă, celălalt în trei. Brokerul le dă mesajele pe rând, deci cel lent rămâne cu o coadă lungă, iar cel rapid stă degeaba.
Ideea: `basic.qos(prefetch_count=N)` limitează câte mesaje neconfirmate are un consumator. Cu 1, brokerul nu mai dă un mesaj nou până nu confirmi pe cel curent, deci workerul rapid primește mai multe. Valorile mari cresc debitul, dar mesajele așteaptă în memoria consumatorului. Prefetch-ul e și backpressure: consumatorul lent nu e inundat. În RabbitMQ limita se aplică fiecărui consumator; cu `global`, întregului canal.
Exemplu:
```python
from operator import mul
cost = [1, 3]      # secunde / mesaj
n = 12
rr = [n // 2] * 2  # fără prefetch
t_rr = max(map(mul, rr, cost))
fair = n / sum(1 / c for c in cost)
print(t_rr, round(fair))  # → 18 9
```
Legătură: RMQ-03, DES-04 și punctul 3. Exemplul simulează timpul total pentru 12 mesaje: pe rând durează 18 secunde, cu prefetch 1 durează 9. Fără ack nu primești nimic nou.

### 5
Greu: da
Problema: Brokerul se repornește. Coada nu era durabilă și a dispărut cu tot cu mesaje. Altă dată coada rămâne, dar mesajele nu erau persistente. Sau producerul a trimis și n-a aflat că brokerul nu le-a preluat.
Ideea: Ai nevoie de trei lucruri. O coadă durabilă supraviețuiește restartului (quorum queue e mereu durabilă). Un mesaj persistent e scris pe disc, nu doar ținut în memorie. Publisher confirms: brokerul confirmă producerului că și-a asumat mesajul, iar fără confirmare producerul retrimite. Confirmarea producerului nu e ack-ul consumatorului. Nici toate trei nu promit zero pierderi.
Exemplu:
```text
ch.queue_declare("facturi",
                 durable=True)
ch.confirm_delivery()
ch.basic_publish("", "facturi",
  body, pika.BasicProperties(
    delivery_mode=2))  # persistent
```
Legătură: RMQ-04 și DES-01. Confirmările acoperă drumul până la broker; outbox-ul din DES-01 acoperă drumul de la baza de date până la publicare.

### 6
Greu: da
Problema: Coada trăiește pe un singur nod. Când nodul cade, mesajele ei nu mai sunt disponibile până revine.
Ideea: Quorum queue e o coadă replicată prin Raft pe mai multe noduri (implicit 3). Raft cere acordul majorității, iar coada merge cât timp majoritatea trăiește; un lider nou e ales automat. E mereu durabilă și nu poate fi exclusivă. Mirroring-ul clasic a fost eliminat în RabbitMQ 4.0, deci pentru replicare folosești quorum queues (sau streams).
Exemplu:
```python
def tolera(n):
    return n - (n // 2 + 1)
print(tolera(3))  # → 1
print(tolera(5))  # → 2
print(tolera(4))  # → 1
```
Legătură: RMQ-09 și RMQ-04. Un cluster de 4 noduri tolerează tot 1 nod, ca unul de 3, de aceea se folosesc numere impare. Quorum queue e răspunsul la „coadă durabilă” din punctul 5, dar replicată.

### 7
Problema: Un mesaj malformat primește `nack` cu `requeue=true`, revine și eșuează iar, în buclă, blocând restul cozii.
Ideea: Un dead letter exchange primește mesajele „moarte” și le trimite într-o altă coadă, pentru analiză. Un mesaj moare când e respins fără requeue, când îi expiră TTL-ul, când coada depășește lungimea maximă sau când o quorum queue îl livrează de mai multe ori decât `delivery-limit` (20 implicit din 4.0). `x-death` arată motivul. DLX-ul se setează prin policy, nu prin argumente fixe în cod.
Exemplu:
```python
q, dlq, tries = ["bad"], [], 0
while q:
    msg = q.pop(0); tries += 1
    if tries >= 3:          # limita
        dlq.append(msg)
    else:
        q.append(msg)       # nack
print(tries, dlq)  # → 3 ['bad']
```
Legătură: RMQ-05 și DES-07. Exemplul simulează `delivery-limit` cu o limită de 3.

### 8
Greu: da
Problema: Pentru contul X publici în ordine „creează”, apoi „modifică”. Cu doi consumatori, primul ia „creează”, al doilea ia „modifică” și termină mai repede. Modificarea se aplică înaintea creării.
Ideea: O coadă e FIFO, iar mesajele publicate pe un canal intră în ordinea publicării. Garanția se oprește aici. Cu mai mulți consumatori, procesarea se termină în orice ordine. Un requeue sau o redelivery schimbă ordinea, la fel prioritățile. Dacă ordinea contează, folosești un singur consumator pe coadă sau faci operațiile tolerante la ordine, cu număr de versiune.
Exemplu:
```python
q = ["add", "edit"]
done = []
a = q.pop(0)      # consumatorul A
b = q.pop(0)      # consumatorul B
done += [b, a]  # B e primul
print(done)  # → ['edit', 'add']
```
Legătură: RMQ-06 și DES-04. La un consumator pe partiție, ordinea per cheie se păstrează; același principiu stă la partiționarea după cheie.

### 9
Greu: da
Problema: Echipa de analytics vrea să recitească evenimentele de ieri ca să recalculeze un raport. Într-o coadă RabbitMQ mesajele au dispărut după ack.
Ideea: În cozile RabbitMQ mesajul se livrează și dispare după ack; brokerul oferă routing flexibil. Kafka e un jurnal partiționat: evenimentele rămân cât spune retenția, nu se șterg la consum. Fiecare consumator ține un offset și poate reciti. Ordinea e garantată într-o partiție, iar aceeași cheie ajunge în aceeași partiție. RabbitMQ are și Streams, un jurnal cu citire repetabilă. Task-uri și routing: RabbitMQ; log de evenimente cu replay: Kafka.
Exemplu:
```python
queue = ["e1", "e2"]
log = ["e1", "e2"]
queue.pop(0)  # ack: dispare
print(queue)  # → ['e2']
# jurnalul: recitești de la offset 0
print(log)  # → ['e1', 'e2']
```
Legătură: RMQ-07. Exemplul simulează în Python o coadă cu ack și un jurnal cu offset.
