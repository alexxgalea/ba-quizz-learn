<!-- Desfășurările fișei `behav` (5 puncte). Format și reguli: lib.mjs (checkDesf), .scratch/desfasurari/spec.md. Faptele: research/_desf_facts_behav.md (secțiunea 40). Conținutul vine doar din fișă, din Studiu → Comportamental (P.extra.behav) și din cardurile o-beh-1…5; ce ține de Onapsis e verificat pe onapsis.com. Fără C++ și fără cod: exemplele sunt răspunsuri-model în blocuri `text`, cu cifrele reale lăsate în paranteze pătrate pentru Alex. -->

### harta
Problema: Ți se spune „Spune-mi câte ceva despre tine” sau „Povestește-mi un incident”. Dacă improvizezi, pierzi firul, povestești ce a făcut echipa și uiți rezultatul. Modulul răspunde la patru întrebări: cum te prezinți în 90 de secunde, cum spui o poveste, ce povești ai gata și cum răspunzi când nu ai folosit o tehnologie sau când ți se dă cuvântul la final.
Grupuri:
- 1: cum te prezinți (pitch de 90 de secunde)
- 2: cum spui o poveste (STAR)
- 3: ce povești ai gata (patru, pe tipuri de întrebări)
- 4–5: ce spui când nu știi ceva și cum închizi (punte onestă, întrebările tale)

### 1
Problema: La „Spune-mi câte ceva despre tine” începi cu liceul, treci prin fiecare job și după patru minute n-ai ajuns la ce faci acum.
Ideea: Pitch-ul de 90 de secunde are trei părți, în ordinea asta: prezent, trecut, de ce rolul ăsta. Prezentul spune ce construiești și cu ce stack. Trecutul alege două-trei realizări, nu tot CV-ul. Ultima parte leagă ce ai făcut de ce construiește Onapsis: detecție de amenințări pentru sisteme SAP. Îl repeți cu voce tare până sună natural, nu recitat.
Exemplu:
```text
Prezent: full-stack, platformă de
video analytics (DRF, React).
Trecut: dashboard builder,
integrarea Milestone, incidentul
Swarm.
De ce aici: backend Python la volum
și securitate.
```
Legătură: cardul o-beh-1. Textul complet e în Studiu → Comportamental.

### 2
Greu: da
Problema: Povestești incidentul așa: „S-a stricat clusterul, am încercat mai multe lucruri și până la urmă a mers.” Ascultătorul nu află ce ai făcut tu și nici ce s-a rezolvat.
Ideea: STAR are patru părți. Situația e contextul, într-o propoziție. Task-ul e ce trebuia obținut. Acțiunea e ce ai făcut tu, cu verbe la persoana I: „am reinițializat clusterul”, nu „s-a reinițializat”. Rezultatul vine cu un număr, dacă există. Dacă nu ai număr, spui ce s-a schimbat după. Cifrele le pui tu, din ce s-a întâmplat.
Exemplu:
```text
S: Un nod manager Swarm și-a
   schimbat IP-ul, quorum pierdut.
T: Readuc clusterul în stare bună.
A: Am reinițializat clusterul pe
   managerul sănătos, am scos
   nodurile vechi, am reparat
   rețeaua overlay a Redis.
R: [cât a durat; ce am schimbat]
```
Legătură: o-beh-3 și o-beh-4. Intervievatorul AI cere ce lipsește din STAR: ce ai făcut tu, rezultatul, o cifră.

### 3
Problema: Ți se cere „un incident”, apoi „o problemă de securitate”, apoi „un design”. Dacă inventezi fiecare răspuns pe loc, pierzi timp cu detaliile și nu mai ajungi la rezultat.
Ideea: Pregătești patru povești, câte una pe tip de întrebare. Fiecare are deja STAR-ul scris în Studiu → Comportamental. Cifrele și durata le completezi tu. La interviu alegi povestea după întrebare, nu după ce îți vine în minte.
Exemplu:
```text
întrebare   -> povestea
incident    -> Swarm, quorum pierdut
securitate  -> injecție în ES
design      -> dashboard builder
integrare   -> Milestone
```
Legătură: o-beh-3 și o-beh-4. Studiu → Comportamental mai are două povești: auditul Celery și AI în livrare.

### 4
Greu: da
Problema: Ești întrebat „Ai lucrat cu GraphQL?”, iar tu nu l-ai folosit în producție. „Da, puțin” te dă de gol la următoarea întrebare. „Nu”, urmat de tăcere, pierde ocazia să arăți ce știi.
Ideea: Spui direct că nu ai folosit tehnologia în producție. Numești ce ai folosit pentru aceeași problemă. Spui ce diferă. Încheii cu felul în care ai începe. Puntea arată că înțelegi problema, nu doar numele uneltei.
Exemplu:
```text
N-am folosit GraphQL în producție.
Am făcut API-uri REST cu DRF, unde
serializer-ul fixează forma.
În GraphQL o fixează clientul, iar
costul trece pe server: N+1,
limite de adâncime.
Aș începe cu Strawberry pe FastAPI.
```
Legătură: Harta din Studiu → Comportamental pune RabbitMQ, AWS, GraphQL și New Relic ca puncte de legătură. Diferența REST / GraphQL e în GQL-03.

### 5
Problema: La final auzi „Aveți întrebări pentru noi?” și răspunzi „Nu, mi-ați spus tot.” Interviul se termină fără să fi arătat ce te interesează la rol.
Ideea: Pregătești două-trei întrebări. Le alegi pe cele despre cum se construiește detecția, produsul pe care îl scrie echipa: drumul unei detecții noi, unde rulează Defend și cum se testează, cum arată succesul după trei–șase luni. Pe cele despre rol le poți pune managerului, iar pe cele tehnice colegilor din echipă.
Exemplu:
```text
1. Cum ajunge o detecție nouă de
   la cercetare la un client?
2. Unde rulează Defend: la client
   sau în cloud? Cum testați?
3. Cum arată succesul în rol după
   trei–șase luni?
```
Legătură: Studiu → Comportamental are lista de întrebări, din care alegi două-trei.
