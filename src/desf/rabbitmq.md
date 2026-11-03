<!-- Desfășurările fișei `rabbitmq` (9 puncte). Format și reguli: lib.mjs (checkDesf), .scratch/desfasurari/spec.md. Faptele: research/_desf_facts_rabbitmq.md (secțiunea 34) și research/interview-facts.md, secțiunile 12, 13 și 26. Nu există broker RabbitMQ în mediu: exemplele Python sunt simulări în Python pur, iar codul pika și tabelul de potrivire sunt în blocuri `text` (neexecutate; faptele vin din documentație). Fără C++: nicio comparație reală (o `std::queue` nu are exchange, routing, ack sau persistență). -->

### harta
Problema: Serviciul de comenzi trebuie să anunțe facturile, stocul și emailul fără să le apeleze direct, altfel un serviciu picat blochează comanda. Un broker rezolvă asta, dar aduce șase întrebări: cum ajunge mesajul în cozi (1–2), cum îl primește consumatorul (3–4), ce supraviețuiește căderilor (5–6), ce faci cu mesajele care tot eșuează (7), ce se întâmplă cu ordinea (8) și când alegi altceva, ca Kafka (9).
Grupuri:
- 1–2: cum ajunge mesajul în cozi (exchange, binding, tipuri)
- 3–4: livrarea către consumator (ack și prefetch)
- 5–6: ce supraviețuiește căderilor (durabilitate și quorum queues)
- 7: mesajele care tot eșuează (dead letter exchange)
- 8: ordinea mesajelor
- 9: când alegi altceva (Kafka)

### 1
Problema: Serviciul de comenzi anunță facturile și stocul. Dacă scrie direct în coada fiecăruia, trebuie să știe câte cozi sunt. Un al treilea consumator înseamnă să modifici producerul.
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
Legătură: RMQ-10 și CEL-14. Exemplul e o simulare în Python.

### 2
Greu: da
Problema: Alertele au chei ca `alert.critical.db` sau `alert.low.web`. Echipa web vrea toate alertele web, oricare ar fi severitatea. Cu chei exacte ai nevoie de câte un binding pentru fiecare severitate.
Ideea: Direct: mesajul merge unde cheia lui e egală cu cea din binding. Fanout: ignoră cheia și copiază mesajul în toate cozile legate. Topic: cheia are cuvinte separate prin `.`; în binding, `*` ține locul exact unui cuvânt, iar `#` a zero sau mai multor cuvinte. Headers: potrivește pe antetele mesajului, nu pe cheie.
Exemplu:
```text
alert.*.web și alert.low.web: da
alert.*.web și alert.web: nu
alert.# și alert: da
alert.# și alert.low.web: da
```
Legătură: RMQ-01 și RMQ-08.

### 3
Greu: da
Problema: Consumatorul ia mesajul „trimite factura #42” și începe să lucreze, apoi procesul moare. Cu auto-ack brokerul a șters mesajul în clipa livrării, deci factura nu se mai trimite.
Ideea: La ack manual brokerul ține mesajul „în zbor” până primește `basic.ack`. Dacă canalul sau conexiunea cad fără ack, mesajul revine în coadă cu `redelivered=true`. Asta e at-least-once, deci consumatorul trebuie să fie idempotent. Auto-ack e at-most-once, iar documentația îl numește nesigur. Ack-ul pleacă pe canalul pe care a venit mesajul. Un `nack` cu `requeue=true` repune mesajul; pe o eroare permanentă, asta face o buclă. Celery confirmă implicit înainte de rulare, iar cu `acks_late` după, ca la ack-ul manual.
Exemplu:
```python
def run(auto_ack):
    q, f = [], ["m1"]  # livrat
    if auto_ack:
        f.clear()  # șters acum
    return q + f  # cade
print(run(True))   # → []
print(run(False))  # → ['m1']
```
Legătură: RMQ-02, RMQ-11, CEL-03 și DES-02.

### 4
Greu: da
Problema: Două workere consumă aceeași coadă. Unul procesează un mesaj într-o secundă, celălalt în trei. Brokerul le dă mesajele pe rând, deci cel lent rămâne cu o coadă lungă, iar cel rapid stă degeaba.
Ideea: `basic.qos(prefetch_count=N)` limitează câte mesaje neconfirmate are un consumator. Cu 1, brokerul nu mai dă un mesaj nou până nu confirmi pe cel curent, deci workerul rapid primește mai multe. O valoare mare poate crește debitul, dar lasă mai multe mesaje să aștepte la consumator. Prefetch-ul e și backpressure: consumatorul lent nu e inundat. În RabbitMQ limita se aplică fiecărui consumator. În exemplu, 12 mesaje durează 18 secunde pe rând și 9 cu prefetch 1.
Exemplu:
```python
from operator import mul
s = [1, 3]  # s / mesaj
n = 12
rr = [n // 2] * 2  # pe rând
t1 = max(map(mul, rr, s))
t2 = n / sum(1 / x for x in s)
print(t1, round(t2))  # → 18 9
```
Legătură: RMQ-03, DES-04 și punctul 3. Exemplul e o simulare.

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
    delivery_mode=2))  # pe disc
```
Legătură: RMQ-04 și DES-01 (outbox, drumul dinainte de publicare).

### 6
Greu: da
Problema: Coada trăiește pe un singur nod. Când nodul cade, mesajele ei nu mai sunt disponibile până revine.
Ideea: Quorum queue e o coadă replicată prin Raft pe mai multe noduri (implicit 3). Raft cere acordul majorității, iar coada merge cât timp majoritatea trăiește; un lider nou e ales automat. E mereu durabilă și nu poate fi exclusivă. Un cluster de 4 noduri tolerează tot 1 nod, ca unul de 3, deci se folosesc numere impare. Mirroring-ul clasic a fost eliminat în RabbitMQ 4.0, deci pentru replicare folosești quorum queues (sau streams).
Exemplu:
```python
def tolera(n):
    return n - (n // 2 + 1)
print(tolera(3))  # → 1
print(tolera(5))  # → 2
print(tolera(4))  # → 1
```
Legătură: RMQ-09, RMQ-04 și punctul 5.

### 7
Greu: da
Problema: Un mesaj malformat primește `nack` cu `requeue=true`, revine și eșuează iar, în buclă, blocând restul cozii.
Ideea: Un dead letter exchange primește mesajele „moarte” și le trimite într-o altă coadă, pentru analiză. Un mesaj moare când e respins fără requeue, când îi expiră TTL-ul, când coada depășește lungimea maximă sau când o quorum queue îl livrează de mai multe ori decât `delivery-limit` (20 implicit din 4.0). Antetul `x-death` arată motivul. DLX-ul se recomandă să-l setezi prin policy. Argumentele fixe din cod nu se pot schimba fără redeploy.
Exemplu:
```python
q, dlq, tries = ["bad"], [], 0
while q:
    msg = q.pop(0); tries += 1
    if tries >= 3:  # limita
        dlq.append(msg)
    else:
        q.append(msg)  # nack
print(tries, dlq)  # → 3 ['bad']
```
Legătură: RMQ-05 și DES-07. Exemplul e o simulare ilustrativă, cu limita 3, nu cu numărătoarea reală.

### 8
Greu: da
Problema: Pentru contul X publici în ordine „creează”, apoi „modifică”. Cu doi consumatori, primul ia „creează”, al doilea ia „modifică” și termină mai repede. Modificarea se aplică înaintea creării.
Ideea: O coadă e FIFO, iar mesajele publicate pe un canal intră în ordinea publicării. Garanția se oprește aici. Cu mai mulți consumatori, procesarea se termină în orice ordine. Un requeue sau o redelivery schimbă ordinea, la fel prioritățile. Dacă ordinea contează, folosești un singur consumator pe coadă. Sau faci operațiile tolerante la ordine, cu număr de versiune. Același principiu stă la partiționarea după cheie, cu un singur consumator pe partiție (`design`, punctul 6).
Exemplu:
```python
q = ["add", "edit"]
done = []
a = q.pop(0)  # consumator A
b = q.pop(0)  # consumator B
done += [b, a]  # B e primul
print(done)  # → ['edit', 'add']
```
Legătură: RMQ-06 și `design`, punctul 6.

### 9
Greu: da
Problema: Echipa de analytics vrea să recitească evenimentele de ieri ca să recalculeze un raport. Într-o coadă RabbitMQ ele au dispărut după ack.
Ideea: Kafka e un jurnal partiționat: evenimentele rămân cât spune retenția, nu se șterg la consum. Fiecare consumator ține un offset și poate reciti de la el. Ordinea e garantată într-o partiție. Aceeași cheie ajunge în aceeași partiție. RabbitMQ oferă routing flexibil, iar mesajul dispare după ack. Are și Streams, un jurnal cu citire repetabilă. Pentru task-uri și routing alegi RabbitMQ, iar pentru un log cu replay alegi Kafka.
Exemplu:
```python
queue = ["e1", "e2"]
log = ["e1", "e2"]
queue.pop(0)  # ack: dispare
print(queue)  # → ['e2']
# jurnal: reciți de la 0
print(log)  # → ['e1', 'e2']
```
Legătură: RMQ-07. Exemplul e o simulare în Python.
