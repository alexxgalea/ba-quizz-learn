<!-- Desfășurările fișei `graphql` (7 puncte). Format și reguli: lib.mjs (checkDesf), .scratch/desfasurari/spec.md. Faptele: research/_desf_facts_graphql.md (secțiunea 41) și research/interview-facts.md, secțiunea 14. Fără C++: modulul nu are echivalent real. Exemplele de query și de schemă sunt în blocuri `text` (nerulate); cele Python sunt simulări fără biblioteci. -->

### harta
Problema: Un ecran React are nevoie de alerte, de sistemul fiecăreia și de userul care a deschis-o. Cu REST faci mai multe apeluri și primești și câmpuri pe care nu le folosești. GraphQL lasă clientul să ceară exact ce vrea, dar serverul plătește: multe query-uri spre baza de date, cereri scumpe și erori greu de văzut. Modulul răspunde la șase întrebări: ce e un API GraphQL și ce câștigă clientul, ce plătește serverul, cum îl scrii în Python, cum vezi erorile, cum îl aperi și cum îl schimbi fără `/v2`.
Grupuri:
- 1–2: ce e un API GraphQL și ce câștigă clientul (un endpoint, o schemă, exact câmpurile cerute)
- 3: ce plătește serverul (resolvere per câmp, N+1, DataLoader)
- 4: cum îl scrii în Python (Strawberry, Graphene, Ariadne)
- 5: cum vezi erorile (răspuns 200 cu `errors`)
- 6: cum îl aperi (limite, autorizare, persisted queries)
- 7: cum îl schimbi (`@deprecated`, fără `/v2`)

### 1
Problema: Backend-ul are mai multe endpoint-uri REST și nicio descriere comună. Frontend-ul vrea un ecran nou și află ce întoarce fiecare endpoint abia când îl apelează.
Ideea: GraphQL are un singur endpoint, de obicei `/graphql`, și o schemă tipată. Schema e contractul dintre client și server, iar fiecare cerere se validează față de ea înainte să ruleze. Punctele de intrare sunt trei tipuri speciale: `Query` pentru citire, `Mutation` pentru scriere și `Subscription` pentru un flux de evenimente. Semnul `!` înseamnă că valoarea nu poate fi `null`.
Exemplu:
```text
type Alert {
  id: ID!
  title: String!
}
type Query {
  alerts: [Alert!]!
}
```
Legătură: GQL-03 și GQL-06.

### 2
Problema: Ecranul de alerte arată titlul, severitatea și numele sistemului. `GET /alerts` întoarce toate câmpurile, iar numele sistemului cere încă un `GET /systems/7` pentru fiecare alertă.
Ideea: Primul caz se numește over-fetching: primești câmpuri pe care nu le folosești. Al doilea e under-fetching: un endpoint nu ajunge și faci alt apel. În GraphQL clientul scrie forma răspunsului, iar serverul întoarce un JSON cu aceeași formă. Datele din mai multe resurse vin într-un singur request. Munca trece pe server (punctul 3).
Exemplu:
```text
query {
  alerts(first: 20) {
    title
    severity
    system { name }
  }
}
```
Legătură: GQL-03. În React, un ecran își declară datele într-un singur query.

### 3
Greu: da
Problema: Query-ul de la punctul 2 cere 100 de alerte, fiecare cu `system { name }`. Serverul apelează resolverul câmpului `system` separat pentru fiecare alertă. Rezultă 1 query pentru listă și 100 pentru sisteme, adică 101.
Ideea: Un resolver e funcția care produce valoarea unui câmp. Pentru o listă, serverul o apelează pentru fiecare element. Un query pentru listă plus N pentru elemente se numește N+1. DataLoader strânge cheile cerute în același moment al event loop-ului și cheamă o singură dată `load_fn` cu toate. Funcția întoarce valorile în ordinea cheilor, cu `None` unde lipsesc. Loaderul ține și un cache, iar la fiecare request creezi unul nou, altfel servește date vechi.
Exemplu:
```python
fara, cu = [], []  # queries
ids = [1, 2, 2, 3]  # system_id
for i in ids:
    fara.append([i])
cu.append(sorted(set(ids)))
print(len(fara))  # → 4
print(cu)  # → [[1, 2, 3]]
```
Legătură: GQL-01. `selectinload` din SQLAlchemy și `prefetch_related` din Django rezolvă același N+1.

### 4
Problema: Ai deja FastAPI cu type hints și Pydantic. Pentru GraphQL poți scrie schema de mână într-un fișier separat sau o poți genera din codul Python.
Ideea: Strawberry e code-first: scrii clase Python cu type hints, iar schema se generează din ele. Se montează în FastAPI cu `GraphQLRouter`. Graphene e tot code-first, dar mai vechi, cu tipurile lui (`ObjectType`, `String()`), nu cu type hints. Ariadne e schema-first: scrii schema în SDL și legi funcții Python de ea.
Exemplu:
```text
@strawberry.type
class Alert:
    title: str
# generează în schemă:
# type Alert {
#   title: String!
# }
```
Legătură: GQL-07. Ca Pydantic în FastAPI, tipurile din cod devin contractul API-ului.

### 5
Greu: da
Problema: Dashboard-ul de monitorizare alertează la 5xx. După trecerea la GraphQL, câmpul `system` pică pentru o alertă, iar userii văd `null`. Dashboard-ul rămâne verde, fiindcă răspunsul e 200.
Ideea: Un răspuns GraphQL are `data` și, dacă ceva a mers prost, `errors`, cu un `path` către câmp. Un câmp care pică devine `null`, iar restul datelor vin. La un câmp cu `!`, `null` urcă la cel mai apropiat părinte care îl acceptă. Specificația GraphQL peste HTTP recomandă 2xx când `data` există și nu e `null`, chiar cu erori. O cerere invalidă primește de obicei 400, dar unele servere vechi răspund tot 2xx. Deci numeri răspunsurile cu `errors` din corp.
Exemplu:
```python
s = 200  # status HTTP
e = [{"path": ["a"]}]
b = {"data": {"a": None},
     "errors": e}
print(s >= 500)  # → False
print("errors" in b)  # → True
```
Legătură: OBS-03. RED numără erorile după 5xx, aici le citești din `errors`.

### 6
Greu: da
Problema: Fiecare alertă are 100 de reguli, iar fiecare regulă are 100 de alerte. Un client trimite un query cu trei niveluri din astea: un singur request cere un milion de obiecte. Alt user își cere o alertă, apoi `rule { alerts }`, și vede alertele altor clienți.
Ideea: Clientul alege forma query-ului, deci serverul îi pune limite: adâncime (în Strawberry, `QueryDepthLimiter`), complexitate, timeout și pagini de dimensiune maximă. Autorizarea o faci în resolvere sau în stratul de date, pe obiect și pe câmp. Persisted queries lasă serverul să execute doar documente cunoscute, dar nu merg la un API public cu clienți terți. Introspecția o oprești în producție doar la un API pentru clienții tăi, și nu ține loc de autorizare.
Exemplu:
```python
n = 3  # niveluri
print(100 ** n)  # → 1000000
p = 20  # pagină maximă
print(p ** n)  # → 8000
```
Legătură: GQL-02, GQL-05 și SEC-08.

### 7
Problema: Backend-ul vrea `severityLevel` (număr) în locul lui `severity` (text). Un client vechi încă cere `severity`. În REST ai scoate un `/v2`; dacă ștergi câmpul, clientul vechi pică.
Ideea: Un câmp nou nu strică pe nimeni, fiindcă fiecare client cere explicit câmpurile lui. Câmpul vechi îl marchezi cu `@deprecated(reason: …)`: merge în continuare, iar uneltele pot să-l semnaleze. Îl ștergi abia când nu-l mai cere nimeni, ceea ce afli măsurând câmpurile cerute. În Strawberry, motivul se dă prin `deprecation_reason`.
Exemplu:
```text
type Alert {
  severityLevel: Int!
  severity: String! @deprecated(
    reason: "Use severityLevel")
}
```
Legătură: GQL-04. Ca la migrațiile fără downtime: întâi adaugi, apoi ștergi.
