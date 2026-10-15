<!-- AWS. Variantele greșite: B, C, D = ordinea din sursă (A e cea corectă). -->

### aws-01
Pe scurt: Printr-un IAM task role cu permisiuni minime: containerul primește credențiale temporare, rotite automat, fără chei în imagine sau în configurare.
Scop: Cheile statice scăpate sunt una dintre cele mai frecvente cauze de incidente în cloud. Cu roluri nu mai ai chei care să scape.
Mecanism: Atașezi un rol IAM (task role) definiției task-ului ECS. La rulare, SDK-ul AWS (boto3) din container cere automat credențiale temporare de la ECS, valabile câteva ore și reînnoite singure. Politica rolului spune exact ce are voie aplicația, de exemplu doar `s3:GetObject` pe un singur bucket.
Pas cu pas:
```text
task definition: taskRoleArn = rol-reports
container: boto3.client("s3")
  -> credențiale temporare de la ECS
  -> reînnoite automat
politica: s3:GetObject doar pe bucket-ul X
```
Aplicare: Codul nu conține nicio cheie (`s3 = boto3.client("s3")`), iar politica rolului e strictă:
```json
{"Effect": "Allow",
 "Action": ["s3:GetObject"],
 "Resource": "arn:aws:s3:::reports-bucket/*"}
```
Legătură: E least privilege (SEC-09) plus principiul de la SEC-10: fără secrete statice, cu acces auditat și rotație automată.
Limită: Task role-ul e pentru aplicația din container; execution role-ul e separat și îl folosește ECS ca să descarce imaginea și să citească secretele la pornire. Se confundă des, iar fiecare trebuie să aibă doar drepturile lui.
La interviu: „Containerul primește acces la S3 printr-un IAM task role cu permisiuni minime: credențiale temporare, rotite automat, fără chei în imagine. Politica permite doar acțiunile și bucket-ul de care are nevoie.”
Verificare: Rolul are `s3:*` pe `*`, ca să nu mai apară erori de permisiuni. Ce risc ai?
Răspuns verificare: Dacă aplicația e compromisă, atacatorul poate citi, modifica sau șterge orice bucket din cont. Restrângi rolul la acțiunile și resursele strict necesare.
Varianta greșită B: Cheile unui user IAM sunt permanente: odată copiate în imagine, le poate extrage oricine are imaginea, iar rotația cere un build nou.
Varianta greșită C: Un bucket public e accesibil oricui îi află numele, iar numele se ghicesc sau apar în loguri și în cod. Obscuritatea nu e un control de securitate.
Varianta greșită D: Contul root are acces nelimitat și nu se folosește pentru aplicații; cheile lui într-un `.env` sunt cel mai grav scenariu posibil.

### aws-02
Pe scurt: SQS standard garantează livrare at-least-once și ordine doar best-effort; varianta FIFO adaugă ordine strictă (per grup de mesaje) și deduplicare.
Scop: Cozile din AWS au aceleași compromisuri ca RabbitMQ și Celery. Dacă știi garanțiile, scrii consumatori corecți.
Mecanism: Consumatorul preia un mesaj, care devine invizibil pentru ceilalți pe durata visibility timeout-ului. Dacă îl șterge (`DeleteMessage`) după procesare, a terminat; dacă nu, mesajul reapare și e livrat din nou. Cozile standard pot livra ocazional un mesaj de două ori și nu garantează ordinea. După `maxReceiveCount` încercări, mesajul ajunge în DLQ.
Pas cu pas:
```text
ReceiveMessage -> invizibil 30 s
procesare OK -> DeleteMessage
crash -> după 30 s mesajul reapare
după maxReceiveCount -> DLQ
```
Aplicare:
```python
resp = sqs.receive_message(QueueUrl=url,
    MaxNumberOfMessages=10, WaitTimeSeconds=20)
for m in resp.get("Messages", []):
    handle(m["Body"])  # idempotent
    sqs.delete_message(QueueUrl=url,
        ReceiptHandle=m["ReceiptHandle"])
```
Legătură: Visibility timeout-ul e echivalentul mesajului neconfirmat din RabbitMQ și seamănă cu `visibility_timeout` din Celery cu Redis (CEL-10).
Limită: Dacă procesarea durează mai mult decât visibility timeout-ul, mesajul reapare și îl ia alt consumator, în paralel. Îl prelungești (`ChangeMessageVisibility`) sau îl setezi peste durata maximă. Iar FIFO are throughput mai mic decât standard.
La interviu: „SQS standard e at-least-once, cu ordine best-effort; FIFO adaugă ordine per grup de mesaje și deduplicare. Consumatorii șterg mesajul după procesare și sunt idempotenți, iar mesajele care eșuează repetat ajung în DLQ.”
Verificare: Procesarea unui mesaj durează 2 minute, iar visibility timeout-ul e de 30 de secunde. Ce se întâmplă?
Răspuns verificare: După 30 s mesajul redevine vizibil și îl preia alt consumator, deci e procesat de mai multe ori în paralel. Crești timeout-ul peste durata maximă sau îl prelungești din cod.
Varianta greșită B: Cozile standard pot livra un mesaj de mai multe ori și nu garantează ordinea. Ordinea strictă și deduplicarea vin doar cu FIFO.
Varianta greșită C: Un mesaj neșters reapare și e livrat din nou: SQS e făcut tocmai ca să nu pierzi mesaje.
Varianta greșită D: Mesajele expiră după perioada de retenție: implicit 4 zile, maximum 14.

### aws-03
Pe scurt: Security Group-ul se aplică pe instanță (pe interfața ei de rețea) și e stateful; NACL-ul se aplică pe subnet și e stateless.
Scop: Când proiectezi rețeaua unei aplicații în AWS, SG-urile sunt controlul principal, iar NACL-urile un strat suplimentar, mai grosier.
Mecanism: Un SG are doar reguli allow și ține minte conexiunile: dacă ai permis o cerere, răspunsul trece automat. Un NACL are reguli allow și deny, evaluate în ordinea numerelor, și verifică fiecare pachet separat, în ambele direcții, deci trebuie să permiți explicit și traficul de răspuns.
Pas cu pas:
```text
SG app: intrare 443 din load balancer
  răspunsul trece automat (stateful)
SG db: 5432 doar din SG-ul app
NACL subnet: allow și deny, în ordine
  răspunsul cere regulă explicită
```
Aplicare: Baza de date stă într-un subnet privat, iar SG-ul ei permite portul 5432 doar din SG-ul aplicației (o referință la SG, nu la IP-uri). NACL-urile le folosești pentru blocări largi, de exemplu un interval de IP-uri.
Legătură: Seamănă cu diferența dintre un firewall cu stare pe server (`ufw`, `iptables` cu conntrack) și un filtru de pachete fără stare, pus pe un router.
Limită: Pentru că NACL-ul e stateless, o regulă care uită porturile efemere de răspuns (1024–65535) blochează traficul în tăcere, iar problema e greu de diagnosticat.
La interviu: „SG-ul e per instanță, stateful, doar cu reguli allow; NACL-ul e per subnet, stateless, cu allow și deny. Folosesc SG-uri ca control principal (de exemplu, DB-ul accesibil doar din SG-ul aplicației) și NACL-uri pentru blocări largi.”
Verificare: Vrei să blochezi explicit un IP malițios pentru tot subnetul. SG sau NACL?
Răspuns verificare: NACL: SG-ul are doar reguli allow, deci nu poate exprima „interzice acest IP”. NACL-ul are reguli deny, evaluate în ordine.
Varianta greșită B: Nu sunt identice: diferă prin nivel (instanță sau subnet), prin stare și prin tipurile de reguli.
Varianta greșită C: E invers: SG-ul e pe instanță, NACL-ul pe subnet.
Varianta greșită D: E invers și la stare: SG-ul e stateful, iar NACL-ul stateless.

### aws-04
Pe scurt: RDS sau Aurora, cu Multi-AZ: AWS întreține o copie standby în altă zonă de disponibilitate și face failover automat dacă primarul cade.
Scop: Vrei Postgres cu disponibilitate ridicată, fără să administrezi tu replicarea, backup-urile și failover-ul.
Mecanism: În RDS Multi-AZ, fiecare scriere e replicată sincron pe un standby din altă AZ. Dacă primarul sau AZ-ul lui cade, RDS promovează standby-ul și mută endpoint-ul DNS spre el, de obicei în unul-două minute. Aurora replică stocarea în trei AZ-uri și promovează o replică existentă.
Pas cu pas:
```text
app -> endpoint DNS -> primar (AZ-a)
  replicare sincronă -> standby (AZ-b)
AZ-a cade -> standby-ul e promovat
endpoint DNS -> noul primar
aplicația se reconectează
```
Aplicare: Aplicația folosește endpoint-ul DNS, nu IP-ul, și are retry la reconectare. Pentru multe citiri adaugi read replicas, separat de standby-ul Multi-AZ.
Legătură: E dilema de la DBM-05: replicarea sincronă alege consistența, deci failover-ul nu pierde tranzacțiile confirmate.
Limită: Standby-ul din varianta Multi-AZ clasică nu servește citiri: există doar pentru failover. Read replicas sunt asincrone (pot rămâne în urmă) și servesc la scalarea citirilor, nu la disponibilitate. E o diferență întrebată des.
La interviu: „Pentru Postgres gestionat, cu failover automat, folosesc RDS sau Aurora cu Multi-AZ: un standby sincron în altă AZ, promovat automat. Read replicas sunt altceva: asincrone, pentru scalarea citirilor.”
Verificare: Aplicația ține conexiunile deschise ore întregi și se conectează la IP-ul primarului. Ce se întâmplă la failover?
Răspuns verificare: Conexiunile vechi cad, iar aplicația, legată de IP-ul vechi, nu găsește noul primar. Folosești endpoint-ul DNS și reconectare cu retry.
Varianta greșită B: Pe EC2 administrezi tu replicarea, backup-urile și failover-ul; nimic nu e automat.
Varianta greșită C: DynamoDB e o bază NoSQL cheie-valoare, nu Postgres, iar global tables replică între regiuni, pentru alt tip de date.
Varianta greșită D: S3 e stocare de obiecte. Versionarea păstrează versiuni ale fișierelor, dar nu rulează o bază de date.

### aws-05
Pe scurt: Lambda nu e potrivit pentru procesări de peste 15 minute (limita maximă per invocare) sau pentru procese care trebuie să țină conexiuni deschise mult timp.
Scop: Serverless e comod, dar are limite clare. La interviu arăți că știi când alegi un container în loc.
Mecanism: Lambda pornește o instanță a funcției la un eveniment, o rulează cel mult 15 minute și o poate opri oricând după aceea. Instanțele noi pornesc „la rece” (cold start), iar multe instanțe simultane deschid multe conexiuni la DB. Plătești doar timpul de execuție, ideal pentru trafic rar sau cu vârfuri.
Pas cu pas:
```text
fișier în S3 -> Lambda -> 3 s -> gata
job de 40 min -> oprit la 15 min
1.000 de invocări simultane
  -> 1.000 de conexiuni la Postgres
```
Aplicare: Joburile lungi le muți pe ECS/Fargate sau EC2, ori le împarți în pași cu Step Functions. Pentru conexiunile la DB din Lambda folosești RDS Proxy, care le pune în comun.
Legătură: RDS Proxy e pentru Lambda ce e PgBouncer pentru workeri (PG-06): multe conexiuni scurte, puține conexiuni reale la DB.
Limită: Cold start-urile adaugă latență la primele request-uri, mai ales cu pachete mari de dependențe. Pentru API-uri sensibile la latență folosești provisioned concurrency sau containere.
La interviu: „Lambda e bun pentru evenimente scurte și trafic variabil, dar are limita de 15 minute, cold start-uri și presiune pe conexiunile la DB. Pentru joburi lungi aleg ECS sau Fargate, iar pentru DB folosesc RDS Proxy.”
Verificare: O funcție Lambda procesează fiecare mesaj dintr-o coadă SQS și deschide o conexiune nouă la Postgres. La un vârf de 2.000 de mesaje, ce se poate întâmpla?
Răspuns verificare: Lambda pornește sute de instanțe în paralel, fiecare cu conexiunea ei, și poate depăși `max_connections` din Postgres. Limitezi concurența funcției și folosești RDS Proxy.
Varianta greșită B: Evenimentele rare sunt cazul ideal pentru Lambda: plătești doar cele câteva execuții.
Varianta greșită C: Procesarea fișierelor încărcate în S3 e un caz clasic pentru Lambda, cât timp fiecare fișier se procesează în mai puțin de 15 minute.
Varianta greșită D: Traficul variabil, cu vârfuri, e chiar punctul forte al lui Lambda: scalează automat și nu plătești capacitate nefolosită.

### aws-06
Pe scurt: CloudTrail înregistrează apelurile API făcute în contul AWS: cine (user sau rol), ce acțiune, pe ce resursă, când și de la ce IP.
Scop: Într-o investigație de securitate, prima întrebare e „cine a schimbat asta și când?”. CloudTrail e jurnalul de audit care răspunde.
Mecanism: Orice acțiune pe resursele AWS, din consolă, CLI sau SDK, e un apel API. CloudTrail le salvează ca evenimente: identitatea, acțiunea (`DeleteBucket`, `AuthorizeSecurityGroupIngress`), parametrii, sursa și rezultatul. Ultimele 90 de zile de evenimente de management se văd implicit; pentru păstrare pe termen lung configurezi un trail spre S3.
Pas cu pas:
```text
cineva deschide portul 22 spre internet
CloudTrail: AuthorizeSecurityGroupIngress
  user: ana, ora: 03:12, IP: 1.2.3.4
investigație: cine, când, de unde
```
Aplicare: Configurezi un trail pentru toate regiunile, cu logurile într-un bucket S3 protejat (de preferat în alt cont, fără drept de ștergere), și trimiți evenimentele în SIEM, cu alerte pe acțiunile sensibile.
Legătură: E exact tipul de sursă pe care un SIEM (DOM-05) o corelează cu restul: auditul infrastructurii cloud, așa cum Defend acoperă SAP.
Limită: Implicit, CloudTrail înregistrează acțiunile de management (creare, ștergere, configurare), nu și accesul la date, de exemplu fiecare `GetObject` din S3. Evenimentele de date se activează separat și costă.
La interviu: „CloudTrail e jurnalul de audit al apelurilor API din cont: cine, ce, când, de unde. Îl folosesc în investigații de securitate, cu logurile păstrate într-un bucket protejat și trimise în SIEM. CloudWatch e pentru metrici, loguri de aplicație și alarme.”
Verificare: Un bucket S3 a fost făcut public azi-noapte. Unde cauți cine a făcut-o?
Răspuns verificare: În CloudTrail, după evenimente ca `PutBucketPolicy` sau `PutPublicAccessBlock` pe acel bucket: vezi identitatea, ora și IP-ul.
Varianta greșită B: Metricile de CPU și memorie sunt în CloudWatch, nu în CloudTrail.
Varianta greșită C: Logurile scrise de aplicație ajung în CloudWatch Logs. CloudTrail înregistrează acțiunile pe resursele AWS, nu ce scrie codul tău.
Varianta greșită D: Costurile le vezi în Cost Explorer și în rapoartele de facturare.

### aws-07
Pe scurt: Un eveniment publicat pe un topic SNS ajunge în mai multe cozi SQS abonate, iar fiecare consumator îl procesează independent, în ritmul lui.
Scop: Notificările, auditul și indexarea consumă același eveniment fără să depindă unele de altele: dacă una cade, celelalte merg mai departe, iar mesajele ei așteaptă în coada ei.
Mecanism: SNS face publish/subscribe: trimite fiecare mesaj tuturor abonaților topicului. Când abonații sunt cozi SQS, fiecare coadă primește o copie durabilă. Consumatorii citesc din coada lor, cu propriile retry-uri și propriul DLQ.
Pas cu pas:
```text
alert.created -> topic SNS "alerts"
  -> SQS notify -> email
  -> SQS audit -> audit log
  -> SQS index -> căutare
email căzut -> crește doar coada lui
```
Aplicare: Publici o singură dată (`sns.publish(TopicArn=..., Message=...)`) și abonezi câte o coadă pentru fiecare consumator. Cu filter policies pe abonamente, fiecare coadă primește doar tipurile de evenimente care o interesează.
Legătură: E echivalentul fanout exchange-ului din RabbitMQ (RMQ-08): același eveniment, câte o coadă pentru fiecare consumator.
Limită: Fan-out-ul nu aduce ordine globală: fiecare coadă are ordinea ei (best-effort, la cozile standard). Și fiecare consumator trebuie să fie idempotent, pentru că SQS e at-least-once.
La interviu: „SNS plus SQS face fan-out: un eveniment publicat o dată ajunge în mai multe cozi independente, iar fiecare consumator îl procesează în ritmul lui, cu retry și DLQ proprii. E echivalentul fanout exchange-ului din RabbitMQ.”
Verificare: Abonezi serviciul de email direct la SNS, prin HTTP, fără coadă. Ce pierzi?
Răspuns verificare: Bufferul durabil: dacă serviciul e căzut mai mult decât durează retry-urile SNS, mesajele se pierd (sau ajung în DLQ-ul abonamentului, dacă l-ai configurat). Cu SQS, mesajele așteaptă în coadă până revine serviciul.
Varianta greșită B: Mutarea mesajelor vechi în S3 n-are legătură cu fan-out-ul; SNS și SQS nu sunt arhive.
Varianta greșită C: Cozile țin mesajele temporar, până la procesare. Nu sunt o bază de date și nu se pot interoga.
Varianta greșită D: Fiecare coadă are ordinea ei, iar între cozi nu există ordine globală.
