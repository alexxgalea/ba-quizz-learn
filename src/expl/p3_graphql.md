<!-- GraphQL. Variantele greșite: B, C, D = ordinea din sursă (A e cea corectă). -->

### gql-01
Pe scurt: E problema N+1: un query pentru listă și încă unul pentru fiecare element. DataLoader adună cheile cerute și face un singur query, cu `WHERE id IN (...)`.
Scop: Într-un API GraphQL, N+1 apare natural, din felul în care sunt construite resolverele: fără DataLoader, o listă de 100 de alerte înseamnă 101 query-uri.
Mecanism: Resolverul câmpului `system` al unei alerte e apelat separat pentru fiecare alertă din listă. Cu DataLoader, fiecare apel doar înregistrează cheia cerută (`system_id`) și primește un awaitable. La finalul tick-ului curent, DataLoader rulează o singură funcție de încărcare cu toate cheile, apoi distribuie rezultatele. Are și un cache per request, deci aceeași cheie nu e încărcată de două ori.
Pas cu pas:
```text
alerts (100) -> 1 query
fără DataLoader:
  system, per alertă -> 100 de query-uri
cu DataLoader:
  100 de chei adunate
  -> WHERE id IN (...) -> 1 query
```
Aplicare:
```python
async def load_systems(ids):
    rows = await repo.systems_by_ids(ids)
    by_id = {r.id: r for r in rows}
    return [by_id.get(i) for i in ids]

loader = DataLoader(load_fn=load_systems)
# în resolver:
# return await loader.load(alert.system_id)
```
Legătură: E aceeași problemă ca N+1 în SQLAlchemy sau în Django ORM, rezolvată acolo cu `selectinload` sau `prefetch_related`; `selectinload` face chiar un `IN (...)`, ca DataLoader.
Limită: DataLoader-ul se creează per request, în contextul GraphQL; altfel, cache-ul lui ar servi date vechi sau date ale altui user. Iar funcția de încărcare trebuie să întoarcă rezultatele în ordinea cheilor, cu `None` pentru cele lipsă.
La interviu: „E problema N+1: resolverul de câmp face câte un query per element. Folosesc DataLoader, care adună cheile din același tick și face un singur `WHERE id IN (...)`, cu cache per request.”
Verificare: Creezi un singur DataLoader global, la pornirea aplicației, pentru toate request-urile. Ce probleme apar?
Răspuns verificare: Cache-ul lui ține rezultatele între request-uri: datele devin vechi, iar un user poate primi obiecte încărcate pentru alt user, ocolind autorizarea. DataLoader-ul se creează pentru fiecare request.
Varianta greșită B: Over-fetching înseamnă să aduci câmpuri inutile. Aici problema e numărul de query-uri, iar paginarea doar îl micșorează, nu îl elimină.
Varianta greșită C: Nu e un deadlock: query-urile nu se blochează între ele, doar sunt prea multe.
Varianta greșită D: CORS ține de browser și de originea request-ului, nu de numărul de query-uri spre DB.

### gql-02
Pe scurt: Query-urile adânc imbricate sau foarte late pot epuiza serverul: clientul alege forma query-ului, iar fiecare nivel poate înmulți munca.
Scop: Un singur request GraphQL bine construit poate costa cât mii de request-uri REST. Fără limite, oricine are acces la API poate dărâma serviciul.
Mecanism: În REST, serverul decide cât întoarce fiecare endpoint. În GraphQL, clientul poate cere `user { friends { friends { friends ... } } }`: la 100 de prieteni pe nivel, trei niveluri înseamnă un milion de obiecte. Serverul trebuie să limiteze explicit adâncimea, complexitatea și durata.
Pas cu pas:
```text
user -> 100 de prieteni
  -> 100 × 100 = 10.000
  -> 100 × 10.000 = 1.000.000 de obiecte
un singur request de câteva sute de bytes
```
Aplicare: Limitezi adâncimea (în Strawberry, cu extensia `QueryDepthLimiter`), calculezi un cost per query și refuzi peste prag, impui paginare pe liste (`first: 50`), pui timeout și rate limit pe cost, iar pentru clienții cunoscuți accepți doar persisted queries.
Legătură: E aceeași idee ca rate limiting-ul de la RD-06, doar că măsori costul query-ului, nu numărul de request-uri.
Limită: Limitele prea stricte strică clienții legitimi, deci le calibrezi pe query-urile reale ale frontend-ului. Iar autorizarea rămâne o problemă separată: și un query ieftin poate ajunge la date interzise (GQL-05).
La interviu: „Un risc specific GraphQL e DoS prin query-uri adânci sau scumpe, pentru că forma o alege clientul. Limitez adâncimea, complexitatea și timpul, impun paginare, pun rate limit pe cost și, unde pot, accept doar persisted queries.”
Verificare: Ce sunt persisted queries și de ce reduc riscul?
Răspuns verificare: Clientul trimite doar un id (de exemplu un hash) al unui query aprobat dinainte, iar serverul execută doar query-urile din această listă. Un atacator nu mai poate trimite query-uri arbitrare.
Varianta greșită B: GraphQL rulează peste HTTP, deci HTTPS funcționează normal și pe un singur endpoint.
Varianta greșită C: SQL injection se previne ca oriunde: query-uri parametrizate sau ORM în resolvere. Nu e o problemă specifică GraphQL.
Varianta greșită D: GraphQL suportă autentificare cu token-uri ca orice API HTTP: token-ul vine în header, iar resolverele îl citesc din context.

### gql-03
Pe scurt: Clientul cere exact câmpurile de care are nevoie, din mai multe resurse, într-un singur request.
Scop: Un frontend complex (un dashboard cu alerte, sisteme, useri) evită zeci de request-uri și datele inutile, iar echipa de frontend nu mai așteaptă endpoint-uri noi pentru fiecare ecran.
Mecanism: Există un singur endpoint, iar query-ul descrie forma exactă a răspunsului. Serverul rulează doar resolverele câmpurilor cerute și întoarce un JSON cu aceeași formă.
Pas cu pas:
```text
REST: GET /alerts, /systems/7, /users/3...
  -> multe drumuri, câmpuri în plus
GraphQL: alerts { title system { name } }
  -> un drum, doar câmpurile cerute
```
Aplicare:
```text
query {
  alerts(first: 20) {
    title
    severity
    system { name }
  }
}
```
Legătură: Ca dezvoltator React vezi direct avantajul: un ecran își declară datele într-un singur query, cu un client ca Apollo sau urql, în loc să compună mai multe apeluri REST.
Limită: Costul se mută pe server: N+1 (GQL-01), costul query-urilor (GQL-02) și un caching HTTP mai greu, pentru că totul trece prin POST, pe același URL. Pentru API-uri simple, publice și ușor de cache-uit, REST rămâne o alegere bună.
La interviu: „Avantajul principal e că clientul cere exact câmpurile de care are nevoie, din mai multe resurse, într-un singur drum. Prețul e complexitatea pe server: N+1, costul query-urilor și un caching mai greu.”
Verificare: Un API public, simplu, întoarce cursul valutar și e citit de mii de clienți. GraphQL sau REST?
Răspuns verificare: REST: un `GET /rates` se cache-uiește ușor în CDN și în browser, iar flexibilitatea GraphQL nu aduce nimic aici.
Varianta greșită B: GraphQL nu e automat mai rapid: rezolvarea câmpurilor poate fi chiar mai scumpă. Câștigul ține de numărul de drumuri și de datele inutile.
Varianta greșită C: E invers: caching-ul HTTP e mai greu, pentru că toate query-urile trec prin același URL, de obicei prin POST.
Varianta greșită D: GraphQL are o schemă tipată obligatorie: e chiar fundamentul lui.

### gql-04
Pe scurt: Adaugi câmpuri noi și le marchezi pe cele vechi cu `@deprecated`, apoi le scoți abia după ce nu le mai folosește nimeni.
Scop: Evoluezi API-ul fără versiuni noi și fără să strici clienții existenți.
Mecanism: Clienții GraphQL cer explicit fiecare câmp, deci un câmp nou nu afectează pe nimeni. Un câmp vechi, marcat `@deprecated(reason: "...")`, rămâne funcțional, dar uneltele și documentația îl semnalează. Serverul poate măsura ce câmpuri mai sunt cerute și scoate câmpul doar când nu-l mai folosește nimeni.
Pas cu pas:
```text
v1: alert { severity }  (string)
adaugi: alert { severityLevel }  (int)
severity -> @deprecated
monitorizezi folosirea -> 0 -> îl scoți
```
Aplicare:
```python
@strawberry.type
class Alert:
    severity_level: int
    severity: str = strawberry.field(
        deprecation_reason="Folosește severityLevel")
```
Legătură: E același principiu ca migrațiile fără downtime din DB: adaugi întâi noul, muți clienții, abia apoi ștergi vechiul (expand, apoi contract).
Limită: Schimbările incompatibile (redenumiri, argumente devenite obligatorii) cer tot o perioadă de tranziție. Iar aplicațiile mobile vechi pot rămâne mult timp în uz, deci un câmp depreciat trăiește uneori luni.
La interviu: „Evoluez schema aditiv: adaug câmpuri noi și le marchez pe cele vechi `@deprecated`, monitorizez folosirea lor și le scot când nu le mai cere nimeni. Fără `/v2`.”
Verificare: Vrei ca argumentul `tenantId` al unui query să devină obligatoriu. De ce e o schimbare incompatibilă?
Răspuns verificare: Clienții care nu-l trimit vor primi erori de validare. Adaugi întâi un query sau un argument nou, muți clienții pe el, apoi îl scoți pe cel vechi.
Varianta greșită B: Versiunile `/v2` sunt practica din REST. În GraphQL evoluezi schema aditiv, pe același endpoint.
Varianta greșită C: Ștergerea imediată strică clienții care încă cer câmpul: query-urile lor pică cu erori de validare.
Varianta greșită D: Schema evoluează continuu: adaugi câmpuri noi și le depreciezi pe cele vechi.

### gql-05
Pe scurt: În resolvere sau în logica de business, pe fiecare obiect și câmp: verifici dacă userul are voie să vadă exact acel obiect, nu doar dacă e autentificat.
Scop: Un query GraphQL poate traversa graful de la un obiect permis spre unul interzis. Fiecare pas al traversării trebuie verificat.
Mecanism: Gateway-ul verifică doar că request-ul are un token valid. Datele concrete le produc resolverele, deci acolo știi ce obiect întorci și cui. Cel mai sigur e ca filtrarea pe tenant să stea în stratul de acces la date, folosit de toate resolverele, ca să nu depinzi de memoria fiecărui dezvoltator.
Pas cu pas:
```text
query { alert(id: 9) {
  rule { alerts { title } } } }
gateway: token valid -> trece
resolver alert: tenantul e corect?
resolver rule.alerts: filtrează tenantul?
```
Aplicare:
```python
@strawberry.field
async def alert(self, info, id: int) -> Alert | None:
    user = info.context.user
    return await repo.get_alert(
        id, tenant_id=user.tenant_id)
```
Legătură: E Broken Access Control (SEC-08) într-un API GraphQL: IDOR-ul apare când un resolver încarcă după id fără să verifice tenantul.
Limită: DataLoader-ele (GQL-01) încarcă și ele date, deci au nevoie de aceeași filtrare; un loader care ignoră tenantul ocolește toate verificările din resolvere.
La interviu: „Autorizarea o fac în resolvere și, ideal, în stratul de acces la date, pe obiect și pe câmp, pentru că un query poate traversa tot graful. Gateway-ul verifică doar autentificarea.”
Verificare: Filtrezi pe tenant în resolverul `alerts` de la rădăcină, dar nu și în câmpul `rule.alerts`, iar regulile de detecție sunt comune tuturor clienților. Ce poate face un user?
Răspuns verificare: Să ceară una dintre alertele lui, apoi `rule { alerts }`, și să vadă alertele tuturor clienților pentru acea regulă. Fiecare drum din graf are nevoie de aceeași filtrare.
Varianta greșită B: Gateway-ul vede doar request-ul și token-ul, nu și obiectele pe care le vor întoarce resolverele, deci nu poate decide pe fiecare obiect.
Varianta greșită C: Schema publică arată ce tipuri există, nu datele. Datele rămân protejate de autorizare.
Varianta greșită D: Frontend-ul poate fi ocolit oricând: oricine trimite query-ul direct, din curl sau din consola browserului.

### gql-06
Pe scurt: Mutations sunt operațiile de scriere din GraphQL; câmpurile de la rădăcina unei mutații se execută secvențial, în ordinea în care sunt scrise.
Scop: Separi clar citirile de scrieri, iar mai multe scrieri dintr-un singur request rulează într-o ordine previzibilă.
Mecanism: Un query își poate rezolva câmpurile în paralel, pentru că doar citește. Specificația cere ca o mutație să-și execute câmpurile de la rădăcină unul după altul: dacă trimiți două mutații în același request, a doua pornește după ce s-a terminat prima. Fiecare mutație întoarce date, de obicei obiectul modificat.
Pas cu pas:
```text
mutation {
  ack: acknowledgeAlert(id: 9) { status }
  close: closeAlert(id: 9) { status }
}
-> întâi ack, apoi close (secvențial)
```
Aplicare:
```python
@strawberry.type
class Mutation:
    @strawberry.mutation
    async def acknowledge_alert(self, info,
                                id: int) -> Alert:
        return await service.acknowledge(
            id, user=info.context.user)
```
Legătură: E echivalentul lui POST, PUT sau DELETE din REST; GraphQL le grupează pe toate sub mutații.
Limită: Secvențial nu înseamnă tranzacțional: dacă a doua mutație eșuează, prima rămâne aplicată. Pentru atomicitate faci o singură mutație, care face totul într-o tranzacție.
La interviu: „Mutations sunt operațiile de scriere; câmpurile de la rădăcina lor rulează secvențial, spre deosebire de câmpurile unui query, care pot rula în paralel. Nu sunt tranzacționale între ele, deci pentru atomicitate fac o singură mutație.”
Verificare: Trimiți două mutații în același request, iar a doua eșuează. Ce se întâmplă cu prima?
Răspuns verificare: Rămâne aplicată: mutațiile rulează pe rând, dar nu într-o tranzacție comună. Răspunsul conține datele primei mutații și eroarea celei de-a doua.
Varianta greșită B: Caching-ul pe server ține de implementare, nu de un tip de operație. Mutațiile scriu date, nu le cache-uiesc.
Varianta greșită C: Notificările în timp real sunt subscriptions, care folosesc de obicei WebSocket.
Varianta greșită D: Mutațiile modifică date, nu schema. Schema nu se schimbă prin operații trimise de clienți.

### gql-07
Pe scurt: Strawberry: construiești schema GraphQL din clase Python cu type hints (code-first) și o montezi în FastAPI cu `GraphQLRouter`.
Scop: Dacă lucrezi cu FastAPI și Pydantic, Strawberry folosește același stil: type hints peste tot și un singur loc în care definești tipurile.
Mecanism: Decoratorii `@strawberry.type`, `@strawberry.field` și `@strawberry.mutation` transformă clase și metode cu type hints în tipuri și resolvere GraphQL, iar schema SDL e generată automat din cod. Integrarea cu FastAPI expune `/graphql` ca router obișnuit, cu acces la dependențe și la contextul request-ului.
Pas cu pas:
```text
@strawberry.type -> tipul Alert
@strawberry.type -> Query, cu resolvere
strawberry.Schema(query=Query)
GraphQLRouter(schema) -> /graphql
```
Aplicare:
```python
@strawberry.type
class Alert:
    id: int
    title: str

@strawberry.type
class Query:
    @strawberry.field
    async def alerts(self) -> list[Alert]:
        return await repo.list_alerts()

schema = strawberry.Schema(query=Query)
app.include_router(GraphQLRouter(schema),
                   prefix="/graphql")
```
Legătură: E ca Pydantic în FastAPI: tipurile din cod devin contractul API-ului, iar documentația (aici, schema GraphQL) e generată automat.
Limită: Code-first e comod când un singur serviciu deține schema. Când mai multe echipe lucrează pe un contract comun, schema-first (Ariadne, cu SDL scris de mână) poate fi mai clar.
La interviu: „Pentru GraphQL în FastAPI aș folosi Strawberry: code-first, cu type hints și dataclasses, montat cu `GraphQLRouter`. Ariadne e alternativa schema-first, iar Graphene e varianta code-first mai veche.”
Verificare: Ce înseamnă code-first, față de schema-first?
Răspuns verificare: Code-first: scrii clase Python, iar schema e generată din ele (Strawberry, Graphene). Schema-first: scrii întâi schema în SDL, apoi legi resolverele de ea (Ariadne).
Varianta greșită B: Ariadne e schema-first: scrii schema în SDL și legi funcțiile Python de ea, deci nu pornește de la clase cu type hints.
Varianta greșită C: Marshmallow face serializare și validare, nu GraphQL.
Varianta greșită D: Graphene e code-first, dar mai vechi și nu se bazează pe type hints: câmpurile le definești cu clasele lui proprii.
