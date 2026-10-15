<!-- Performanță. Variantele greșite: B, C, D = ordinea din sursă (A e cea corectă). -->

### pf-01
Pe scurt: Întâi profilezi: măsori unde se duce timpul, apoi optimizezi doar acea parte.
Scop: Intuiția despre ce e lent greșește des. Fără măsurare, poți pierde o zi optimizând o funcție care ia 2% din timp.
Mecanism: Un profiler înregistrează cât timp petrece programul în fiecare funcție. cProfile urmărește fiecare apel (precis, dar cu overhead) și se pornește odată cu programul. py-spy eșantionează din exterior stack-ul procesului, de sute de ori pe secundă, și se poate atașa unui proces care rulează deja.
Pas cu pas:
```text
python -m cProfile -s cumtime job.py
  parse_line  62% din timp
  db.insert   30%
  restul       8%
-> optimizezi parse_line și insert
```
Aplicare:
```text
python -m cProfile -o out.prof job.py
py-spy top --pid 4242
py-spy record -o profile.svg --pid 4242
```
Legătură: E aceeași disciplină ca la query-uri: `EXPLAIN ANALYZE` înainte de indexuri (IDX-01). Măsori, schimbi un singur lucru, măsori din nou.
Limită: Profilul de CPU nu arată tot: dacă jobul așteaptă după DB sau rețea, timpul apare în funcțiile de I/O, iar soluția e la DB (loturi, indexuri), nu în Python. Și profilezi pe date realiste, nu pe un fișier de 10 rânduri.
La interviu: „Primul pas e să profilez, nu să ghicesc: cProfile local, py-spy pe procesul care rulează deja. Optimizez doar partea care domină timpul și măsor din nou după schimbare.”
Verificare: Profilul arată că 85% din timp se duce în `cursor.execute`. Unde cauți optimizarea?
Răspuns verificare: La baza de date, nu în Python: fie query-ul e lent (`EXPLAIN ANALYZE`, indexuri), fie rulezi prea multe query-uri (N+1, commit per rând, lipsa loturilor).
Varianta greșită B: Rescrierea în Rust e scumpă și poate ataca partea greșită: dacă timpul se duce în DB, un cod mai rapid nu schimbă nimic.
Varianta greșită C: Threadurile nu ajută la calcul în Python pur (GIL), iar fără măsurare nici nu știi dacă problema e CPU-ul.
Varianta greșită D: Cache-ul pus peste tot adaugă complexitate și invalidări, fără să știi dacă citirile sunt problema.

### pf-02
Pe scurt: Inserezi în loturi (mii de rânduri per insert, într-o tranzacție) sau, și mai rapid, cu COPY.
Scop: Un import care durează o oră poate ajunge la un minut, fără hardware nou.
Mecanism: Fiecare commit costă un drum dus-întors la server și o scriere sincronă a WAL-ului pe disc (fsync). Cu un milion de commit-uri, costul fix domină total. În loturi, plătești costul o dată la mii de rânduri. COPY trimite datele ca flux continuu, cu și mai puțin overhead per rând.
Pas cu pas:
```text
1M × (round-trip + fsync) -> ore
1.000 de loturi × 1.000 de rânduri
  -> 1.000 × costul fix
COPY: un flux, un commit -> cel mai rapid
```
Aplicare:
```python
with conn.cursor() as cur:
    with cur.copy("COPY events (ts, type) "
                  "FROM STDIN") as cp:
        for e in events:
            cp.write_row((e.ts, e.type))
conn.commit()
```
Legătură: E PG-09 din alt unghi: acolo ai văzut de ce COPY e cea mai rapidă cale pentru încărcări masive.
Limită: Un lot uriaș, într-o singură tranzacție, ține lock-uri și versiuni de rânduri mult timp; loturile de ordinul miilor sunt un compromis bun. Iar dacă un rând e invalid, tot lotul eșuează, deci validezi datele înainte.
La interviu: „Commit-ul per rând plătește un round-trip și un fsync pe WAL la fiecare rând. Grupez în loturi de mii de rânduri, într-o tranzacție, sau folosesc COPY, care e cel mai rapid pentru încărcări masive.”
Verificare: Folosești `session.add()` în buclă, cu SQLAlchemy ORM și un singur commit la final, pentru 1M de obiecte. Mai e o problemă?
Răspuns verificare: Da: un singur commit rezolvă fsync-ul, dar ORM-ul ține 1M de obiecte în memorie și le urmărește pe fiecare. Pentru volume mari folosești `session.execute(insert(Event), lista_de_dicționare)` sau COPY.
Varianta greșită B: Mai multe threaduri cu commit per rând plătesc tot câte un fsync per rând, doar în paralel, și concurează pentru același WAL.
Varianta greșită C: Fiecare index în plus încetinește inserarea: e muncă suplimentară la fiecare rând, nu un câștig.
Varianta greșită D: Memoria clientului nu e problema: costul vine din round-trip-uri și fsync-uri, nu din cât ține clientul în RAM.

### pf-03
Pe scurt: Operațiile vectorizate (pandas, NumPy, Polars): calculul pe coloane întregi rulează în cod nativ, nu ca buclă Python, rând cu rând.
Scop: Agregările pe milioane de rânduri trec de la minute la secunde, fără să schimbi limbajul.
Mecanism: O buclă `for` în Python execută bytecode pentru fiecare rând: creează obiecte, caută atribute, verifică tipuri. O operație vectorizată, ca `df.groupby("user")["bytes"].sum()`, rulează aceeași logică într-o buclă scrisă în C sau Rust, pe date stocate compact, pe coloane.
Pas cu pas:
```text
for row in rows: total[row.user] += ...
  -> 10M × overhead de interpretor
df.groupby("user")["bytes"].sum()
  -> o buclă în C, pe coloane compacte
de obicei, de zeci de ori mai rapid
```
Aplicare:
```python
import polars as pl
out = (pl.scan_csv("events.csv")
         .group_by("user")
         .agg(pl.col("bytes").sum()))
print(out.collect())
```
Legătură: În computer vision e aceeași idee: operații NumPy pe tot array-ul, nu bucle pe pixeli (GIL-05).
Limită: Vectorizarea cere ca logica să se poată exprima pe coloane; logica foarte ramificată, per rând, se pretează mai greu. Iar pandas încarcă tot fișierul în memorie; la fișiere mari ajută `scan_csv` din Polars sau citirea pe bucăți.
La interviu: „Înlocuiesc bucla Python cu operații vectorizate în pandas, NumPy sau Polars, care rulează în cod nativ, pe coloane. Threadurile nu ajută o buclă Python CPU-bound, din cauza GIL-ului.”
Verificare: Folosești pandas, dar calculezi cu `df.apply(lambda r: ..., axis=1)`. E vectorizat?
Răspuns verificare: Nu: `apply` pe rânduri apelează o funcție Python pentru fiecare rând, deci păstrezi overhead-ul buclei. Folosești operații pe coloane (`df["a"] * df["b"]`, `np.where`).
Varianta greșită B: Threadurile nu accelerează o buclă Python CPU-bound: își iau GIL-ul pe rând.
Varianta greșită C: Recursivitatea adaugă overhead la fiecare apel și poate depăși limita de recursivitate. Nu ajută deloc.
Varianta greșită D: `print`-urile adaugă I/O la fiecare rând și încetinesc și mai mult. Pentru progres folosești un contor la câteva mii de rânduri sau `tqdm`.

### pf-04
Pe scurt: Backpressure înseamnă că un consumator lent își frânează producătorul: când nu mai ține pasul, producătorul așteaptă, în loc să umple memoria cu date neprocesate.
Scop: Fără backpressure, un vârf de evenimente umple memoria până la OOM sau crește latența la nesfârșit. Cu backpressure, sistemul încetinește controlat.
Mecanism: Între producător și consumator pui un buffer limitat. Când e plin, producătorul se blochează (sau primește semnal să încetinească) până se eliberează loc. Astfel, ritmul întregului pipeline se adaptează la cea mai lentă etapă.
Pas cu pas:
```text
q = Queue(maxsize=1000)
producător: put() -> buffer plin
  -> așteaptă
consumator: get() -> eliberează un loc
producător: continuă
```
Aplicare:
```python
q = asyncio.Queue(maxsize=1000)

async def producer(source):
    async for ev in source:
        await q.put(ev)  # așteaptă dacă e plină

async def consumer():
    while True:
        ev = await q.get()
        await process(ev)
        q.task_done()
```
Legătură: Prefetch-ul din RabbitMQ (RMQ-03) e tot backpressure: brokerul nu mai trimite mesaje unui consumator care are deja N neconfirmate.
Limită: Backpressure-ul doar mută așteptarea în amonte. Dacă producătorul nu poate aștepta, cum e un flux de evenimente în timp real, ai nevoie de o coadă durabilă care să absoarbă vârful sau de mai mulți consumatori.
La interviu: „Backpressure înseamnă că un consumator lent îl frânează pe producător, de exemplu printr-o coadă limitată (`maxsize`) sau prin prefetch. Așa nu se acumulează memorie și latență când consumatorii nu țin pasul.”
Verificare: Folosești `asyncio.Queue()` fără `maxsize`, iar producătorul citește evenimente de 10 ori mai repede decât le procesezi. Ce se întâmplă?
Răspuns verificare: Coada crește fără limită: memoria procesului urcă până la OOM, iar latența fiecărui eveniment crește continuu. Cu `maxsize`, producătorul ar fi așteptat.
Varianta greșită B: IOPS măsoară operațiile pe disc. Backpressure e un mecanism de control al fluxului dintre etape.
Varianta greșită C: Retry-ul cu întârziere crescătoare e backoff (DES-07). Backpressure controlează ritmul, nu reîncercările.
Varianta greșită D: Compresia reduce traficul, dar nu controlează ritmul dintre producător și consumator.

### pf-05
Pe scurt: Citești în flux, cu `yield_per` (cursor server-side), și procesezi pe loturi, în loc să încarci toate cele 5M de rânduri cu `.all()`.
Scop: Un job de export sau ETL trebuie să folosească memorie constantă, oricâte rânduri ar avea tabela.
Mecanism: `.all()` aduce tot rezultatul și construiește 5M de obiecte ORM înainte să procesezi primul rând. Cu `yield_per=1000`, SQLAlchemy folosește un cursor pe server și aduce câte 1.000 de rânduri odată: procesezi un lot, apoi vine următorul, iar obiectele vechi pot fi eliberate.
Pas cu pas:
```text
.all(): 5M de obiecte în RAM -> OOM
yield_per=1000:
  lotul 1 (1.000) -> procesezi
  lotul 2 (1.000) -> procesezi
  ... memorie aproape constantă
```
Aplicare:
```python
stmt = (select(Event)
        .execution_options(yield_per=1000))
for batch in session.scalars(stmt).partitions():
    write_batch(batch)
```
Legătură: E echivalentul lui `.iterator(chunk_size=1000)` din Django ORM.
Limită: Pentru ETL pur, Core (rânduri ca tupluri, fără obiecte ORM) e și mai rapid, și mai ieftin în memorie. Iar cursorul server-side ține o tranzacție deschisă cât citești, deci nu-l lași deschis ore întregi pe un primar încărcat (PG-04).
La interviu: „Nu încarc 5M de rânduri cu `.all()`: folosesc `yield_per`, cu cursor server-side, și procesez pe loturi, cu memorie constantă. Pentru ETL pur folosesc Core, cu tupluri în loc de obiecte ORM.”
Verificare: Folosești `yield_per`, dar în buclă adaugi fiecare obiect într-o listă `all_events`, pentru raportul final. Ce se întâmplă cu memoria?
Răspuns verificare: Crește la fel ca înainte: lista ține referințe la toate obiectele, deci nimic nu poate fi eliberat. Agregi pe parcurs (sume, contoare) sau scrii fiecare lot direct în destinație.
Varianta greșită B: `.all()` a încărcat deja toate rândurile în memorie, deci împărțirea ulterioară în bucăți nu mai ajută.
Varianta greșită C: Dublarea memoriei doar amână problema: la 10M de rânduri crapă din nou, iar costul crește.
Varianta greșită D: Garbage collector-ul nu e cauza: obiectele sunt ținute în viață de lista întoarsă de `.all()`.

### pf-06
Pe scurt: Overhead-ul per task domină: fiecare task trece prin pickling și IPC spre alt proces, iar pentru un task de microsecunde drumul costă mai mult decât calculul.
Scop: Paralelizarea are un cost fix per unitate de lucru. Ca să câștigi ceva, fiecare unitate trebuie să fie suficient de mare.
Mecanism: Pentru fiecare task, procesul părinte serializează argumentele, le trimite printr-un pipe, workerul le deserializează, rulează funcția și trimite rezultatul înapoi pe același drum. Dacă funcția durează 1 µs și drumul 50 µs, faci mai mult transport decât calcul. Cu `chunksize`, `map` trimite loturi de task-uri într-un singur mesaj.
Pas cu pas:
```text
1M task-uri × (pickle + IPC ~50 µs)
  + calcul 1 µs -> peste 50 s
chunksize=10_000:
  100 de mesaje -> overhead amortizat
```
Aplicare:
```python
with ProcessPoolExecutor() as ex:
    results = list(ex.map(score, items,
                          chunksize=10_000))
```
Legătură: E GIL-06 din alt unghi: tot ce trimiți între procese trece prin pickle, iar costul ăsta trebuie amortizat.
Limită: Un `chunksize` prea mare dezechilibrează munca: un worker poate primi la final loturile grele, iar ceilalți stau. Iar pentru operații foarte simple, vectorizarea (PF-03) bate de obicei orice paralelizare cu procese.
La interviu: „Fiecare task traversează granița de proces, cu pickling și IPC, iar la task-uri foarte mici overhead-ul domină. Trimit loturi, cu `chunksize` mare în `map`, sau grupez munca în unități mai mari.”
Verificare: Fiecare task primește ca argument același dicționar de 200 MB. Ce problemă ai, pe lângă overhead?
Răspuns verificare: Dicționarul e serializat și trimis cu fiecare task: sute de MB copiați de mii de ori. Îl încarci o singură dată în fiecare worker (cu `initializer=`) sau îl moștenesc procesele prin `fork`.
Varianta greșită B: GIL-ul nu e partajat între procese: fiecare proces are propriul GIL.
Varianta greșită C: Procesele rulează în paralel, pe core-uri diferite; tocmai de aceea le folosești pentru calcul în Python pur.
Varianta greșită D: `map` distribuie task-urile pe toți workerii, la fel ca `submit`. Problema e numărul uriaș de mesaje, nu metoda.

### pf-07
Pe scurt: py-spy: un profiler cu eșantionare care se atașează din exterior unui proces Python care rulează deja, fără restart și fără să-i modifici codul.
Scop: Problemele de performanță apar adesea doar în producție, pe date reale. Vrei să vezi ce face procesul chiar atunci, fără să-l oprești.
Mecanism: py-spy citește memoria procesului țintă și reconstruiește stack-ul Python de sute de ori pe secundă, din exterior. Nu rulează cod în procesul țintă, deci overhead-ul e foarte mic. cProfile, în schimb, trebuie pornit în proces și urmărește fiecare apel.
Pas cu pas:
```text
py-spy top --pid 4242
  -> funcțiile care consumă acum CPU
py-spy dump --pid 4242
  -> stack-ul curent al fiecărui thread
py-spy record --pid 4242 -o flame.svg
  -> flame graph pe o perioadă
```
Aplicare: Când un worker pare blocat, `py-spy dump` îți arată exact linia la care stă fiecare thread, de exemplu un lock sau un socket. Pentru CPU mare, `py-spy record` produce un flame graph.
Legătură: E echivalentul lui `top`, dar la nivel de funcții Python, nu de procese.
Limită: py-spy are nevoie de dreptul de a citi memoria altui proces (ptrace): în containere adaugi capability-ul `SYS_PTRACE` sau rulezi py-spy chiar în containerul procesului.
La interviu: „În producție folosesc py-spy: se atașează la procesul care rulează, fără restart, și eșantionează stack-urile cu overhead mic. `py-spy dump` arată unde e blocat un worker, iar `record` produce un flame graph.”
Verificare: Un worker Celery stă la 0% CPU și nu mai procesează nimic. Ce îți arată `py-spy dump`?
Răspuns verificare: Linia exactă la care așteaptă fiecare thread, de exemplu un `recv` pe un socket fără timeout sau un lock. De acolo afli ce dependență l-a blocat.
Varianta greșită B: cProfile se pornește odată cu programul (`python -m cProfile`), deci cere restart, și adaugă overhead la fiecare apel.
Varianta greșită C: pdb e un debugger interactiv: oprește programul ca să-l inspectezi, nu măsoară timpul. Într-un proces din producție, oprirea e exact ce vrei să eviți.
Varianta greșită D: tracemalloc urmărește alocările de memorie, nu timpul, și trebuie pornit din proces, de obicei de la început.
