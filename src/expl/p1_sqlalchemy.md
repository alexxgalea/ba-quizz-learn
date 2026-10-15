<!-- SQLAlchemy 2.0 & Alembic, în formatul propus de Perplexity. Variantele greșite: B, C, D = ordinea din sursă (A e cea corectă). -->

### sqa-01
Pe scurt: Identity map-ul garantează că, în aceeași sesiune, un rând din DB corespunde unui singur obiect Python.
Scop: Evită două copii diferite ale aceluiași rând, modificate separat, care s-ar suprascrie una pe alta la commit.
Mecanism: Sesiunea ține un dicționar cu cheia (clasă, cheie primară) și valoarea obiect. Când un query întoarce un rând deja încărcat, primești obiectul existent. `session.get(User, 7)` caută întâi în dicționar și nu mai trimite SQL dacă găsește obiectul.
Pas cu pas:
```text
u1 = s.get(User, 7)   -> SELECT, intră în map
u2 = s.get(User, 7)   -> din map, fără SQL
u1 is u2              -> True
alt Session: get(...) -> alt obiect
```
Aplicare: Te bazezi pe el ca să nu ai stări contradictorii în aceeași unitate de lucru. Nu îl folosești ca un cache între request-uri.
Legătură: În Django nu există: `User.objects.get(pk=7)` apelat de două ori întoarce două obiecte diferite, fiecare cu copia lui.
Limită: Map-ul trăiește cât sesiunea; nu e un cache global. Un `select()` tot trimite SQL, doar că rezultatul e reconciliat cu obiectul existent.
La interviu: „Identity map-ul din Session garantează că un rând, identificat prin cheia primară, e reprezentat de un singur obiect în acea sesiune. `session.get()` îl ia din map fără SQL. Nu e un cache între sesiuni.”
Verificare: În aceeași sesiune setezi `u1.name = "X"`, fără commit, apoi faci `session.get(User, 7)`. Ce `name` vezi?
Răspuns verificare: `"X"`: primești același obiect din identity map, cu modificarea ta încă nesalvată.
Varianta greșită B: Map-ul aparține unei singure sesiuni și ține obiecte, nu rezultate de query-uri. Nu e partajat între sesiuni.
Varianta greșită C: Maparea dintre clase și tabele e treaba mapper-ului (`DeclarativeBase`, `Mapped[...]`). Identity map-ul ține instanțe concrete.
Varianta greșită D: Indexul pe cheia primară îl creează Postgres. Identity map-ul e o structură din memoria procesului Python.

### sqa-03
Pe scurt: selectinload trimite un al doilea SELECT cu `WHERE ... IN (...)`; joinedload adaugă un JOIN la query-ul principal.
Scop: Ambele evită N+1. Alegi după tipul relației, ca să nu aduci rânduri duplicate inutil.
Mecanism: joinedload face un singur query, dar un JOIN pe o colecție repetă rândul părintelui pentru fiecare copil: un user cu 50 de comenzi vine de 50 de ori. selectinload aduce întâi părinții, apoi toate colecțiile într-un singur query, cu `IN` pe id-urile părinților.
Pas cu pas:
```text
joinedload(User.orders):
  users JOIN orders -> userul × fiecare comandă
selectinload(User.orders):
  1) SELECT * FROM users
  2) SELECT * FROM orders WHERE user_id IN (1, 2, ...)
```
Aplicare: Pentru colecții (one-to-many, many-to-many) folosești `selectinload`. Pentru relații spre un singur obiect (many-to-one, ca `Order.user`) folosești `joinedload`.
```python
select(Order).options(joinedload(Order.user))
select(User).options(selectinload(User.orders))
```
Legătură: Corespondența din Django: `select_related` ≈ joinedload, `prefetch_related` ≈ selectinload.
Limită: joinedload pe mai multe colecții deodată produce un produs cartezian (rânduri × rânduri). selectinload pe liste foarte mari împarte `IN`-ul în loturi.
La interviu: „joinedload face un JOIN în același query și e bun pentru many-to-one. selectinload face un al doilea SELECT cu IN și e bun pentru colecții, pentru că un JOIN pe colecție multiplică rândurile părintelui.”
Verificare: Încarci 100 de comenzi și, pentru fiecare, userul ei. Ce opțiune alegi?
Răspuns verificare: `joinedload(Order.user)`: relația e many-to-one, fiecare comandă are un singur user, deci JOIN-ul nu multiplică rândurile.
Varianta greșită B: Nu sunt identice: generează SQL diferit, cu costuri diferite. Amândouă există în SQLAlchemy 2.0.
Varianta greșită C: Un singur query nu e automat mai bun. Pe colecții, JOIN-ul aduce rândul părintelui repetat pentru fiecare copil.
Varianta greșită D: Amândouă încarcă toată colecția; diferă doar felul în care o aduc.

### sqa-04
Pe scurt: `commit()` face flush (trimite modificările ca SQL), apoi COMMIT; implicit marchează atributele obiectelor ca expirate.
Scop: Trebuie să știi ce e deja în DB și ce nu, și de ce un acces la obiect după commit poate declanșa un query nou.
Mecanism: Până la flush, modificările stau doar în sesiune. Flush le trimite ca INSERT sau UPDATE în tranzacția deschisă, unde încă se pot anula. COMMIT le face permanente. Apoi, cu `expire_on_commit=True` (implicit), atributele obiectelor sunt marcate expirate și se reîncarcă din DB la următorul acces.
Pas cu pas:
```text
order.status = "paid"  -> doar în sesiune
session.flush()        -> UPDATE trimis, încă reversibil
session.commit()       -> COMMIT + atribute expirate
order.status           -> SELECT nou, la acces
```
Aplicare: Dacă folosești obiectul după commit, de exemplu ca răspuns din FastAPI după închiderea sesiunii, setezi `expire_on_commit=False` sau îl convertești înainte într-un model Pydantic.
Legătură: În Django, `obj.save()` scrie imediat. În SQLAlchemy, scrierile se adună în sesiune și pleacă la flush sau la commit.
Limită: Expirarea nu reîncarcă nimic pe loc: reîncărcarea se face abia la acces. Iar conexiunea nu se închide, ci se întoarce în pool.
La interviu: „`session.commit()` face flush, apoi COMMIT, și implicit expiră atributele, ca următorul acces să citească date proaspete. Flush trimite SQL-ul în tranzacție, dar până la commit totul e încă reversibil.”
Verificare: După `commit()` închizi sesiunea și accesezi `order.status`, cu setările implicite. Ce se întâmplă?
Răspuns verificare: Primești `DetachedInstanceError`: atributul e expirat și nu mai există o sesiune care să-l reîncarce.
Varianta greșită B: `close()` nu face COMMIT. Dacă tranzacția n-a fost comisă, la închidere se face rollback.
Varianta greșită C: Conexiunea nu se închide: după commit se întoarce în pool, ca s-o refolosească alt request.
Varianta greșită D: Reîncărcarea nu e imediată: atributele sunt doar marcate expirate și se reîncarcă la primul acces.

### sqa-05
Pe scurt: Obiectul a ieșit din sesiune, iar `order.items` e lazy: încercarea de a-l încărca nu mai are prin ce să facă query-ul.
Scop: E eroarea clasică din API-uri: încarci date într-o funcție, închizi sesiunea, apoi serializezi răspunsul și atingi o relație.
Mecanism: Un obiect ORM poate face query-uri noi (lazy load, reîncărcarea atributelor expirate) doar prin sesiunea de care e atașat. După `session.close()`, obiectul e detached: datele deja încărcate se pot citi, dar orice încărcare nouă aruncă `DetachedInstanceError`.
Pas cu pas:
```text
with Session() as s:
    order = s.get(Order, 1)  # items neîncărcate
# sesiunea s-a închis
order.items -> lazy load -> fără sesiune -> eroare
```
Aplicare: Încarci relația cât sesiunea e deschisă:
```python
order = s.scalars(
    select(Order).where(Order.id == 1)
    .options(selectinload(Order.items))).one()
```
Sau convertești rezultatul într-un model Pydantic înainte să închizi sesiunea.
Legătură: În Django nu apare, pentru că relațiile se pot încărca oricând, cu riscul unui N+1 ascuns.
Limită: `expire_on_commit=False` rezolvă doar atributele expirate de commit. Relațiile neîncărcate tot nu se pot încărca fără sesiune.
La interviu: „`DetachedInstanceError` apare când accesezi o relație lazy sau un atribut expirat după ce sesiunea s-a închis. Încarc explicit ce îmi trebuie, cu eager loading cât sesiunea e deschisă, sau convertesc în DTO înainte.”
Verificare: Ai încărcat `order` cu `selectinload(Order.items)`, ai închis sesiunea și accesezi `order.items[0].product`, o relație lazy. Merge?
Răspuns verificare: Nu: `items` sunt încărcate, dar `product` nu. Încarci tot lanțul: `selectinload(Order.items).joinedload(Item.product)`.
Varianta greșită B: O tabelă lipsă dă o eroare de la baza de date (`UndefinedTable`), nu `DetachedInstanceError`.
Varianta greșită C: Dacă rândul ar fi fost șters, ai primi `ObjectDeletedError` la reîncărcare. Aici problema e lipsa sesiunii, nu a datelor.
Varianta greșită D: Un pool plin dă un timeout la obținerea conexiunii („QueuePool limit ... reached”), alt mesaj și altă cauză.

### sqa-06
Pe scurt: O sesiune per unitate de lucru: per request sau per task, folosită de un singur thread.
Scop: Vrei tranzacții scurte, obiecte care nu se acumulează la nesfârșit și nicio sesiune partajată între threaduri.
Mecanism: Sesiunea ține o tranzacție și toate obiectele încărcate (identity map). Nu e thread-safe: două threaduri care o folosesc simultan își amestecă tranzacția și obiectele. Engine-ul, cu pool-ul lui de conexiuni, e partea gândită să fie partajată.
Pas cu pas:
```text
pornire:  engine = create_engine(...)  (unul)
request 1 -> Session() -> lucru -> commit, close
request 2 -> Session() -> lucru -> commit, close
task Celery -> Session() -> lucru -> close
```
Aplicare: În FastAPI, o dependență `get_db` cu `yield`. În Celery, `with Session() as s:` în corpul task-ului.
Legătură: Django face asta pentru tine: o conexiune pe thread și, cu `ATOMIC_REQUESTS`, o tranzacție per request.
Limită: „Per request” nu înseamnă „per query”: într-un request faci toate operațiile în aceeași sesiune, ca să rămână în aceeași tranzacție.
La interviu: „O Session reprezintă o unitate de lucru, deci una per request sau per task, nepartajată între threaduri. Engine-ul și pool-ul de conexiuni le partajez la nivel de proces.”
Verificare: Un worker Celery cu `--pool threads` și 8 threaduri folosește o sesiune globală, creată la pornire. Ce riscuri apar?
Răspuns verificare: Threadurile își amestecă tranzacțiile și obiectele: un commit sau un rollback afectează munca altui thread, iar erorile apar aleator. Fiecare task își creează sesiunea lui.
Varianta greșită B: O sesiune globală acumulează obiecte în memorie, ține tranzacții lungi și nu e thread-safe.
Varianta greșită C: O sesiune per query rupe unitatea de lucru: operații care trebuie să fie atomice ajung în tranzacții separate.
Varianta greșită D: Partajarea între threaduri e exact ce nu suportă Session. Între threaduri se partajează pool-ul de conexiuni, nu sesiunea.

### sqa-07
Pe scurt: Varianta cu f-string e vulnerabilă: input-ul userului devine parte din textul SQL.
Scop: SQL injection îi permite unui atacator să citească sau să modifice date la care nu are acces, doar printr-un câmp de formular.
Mecanism: Cu f-string, valoarea e lipită în textul query-ului înainte să ajungă la DB. Dacă `name` e `x' OR '1'='1`, condiția devine mereu adevărată. Cu parametri (`:n`), textul SQL și valoarea pleacă separat, iar DB-ul tratează valoarea doar ca dată.
Pas cu pas:
```text
name = "x' OR '1'='1"
f-string:  WHERE name = 'x' OR '1'='1' -> toți userii
parametru: WHERE name = :n
           n = "x' OR '1'='1" -> caută exact acest nume
```
Aplicare: Folosești mereu `select().where(...)` sau `text(...)` cu parametri. Pentru nume de coloane sau de tabele dinamice, care nu se pot parametriza, folosești o listă albă de valori permise.
Legătură: În Django e la fel: `raw()` cu `%s` și parametri e sigur; un f-string în `raw()` sau `extra()` e vulnerabil.
Limită: Parametrii protejează valorile, nu structura query-ului. Un `ORDER BY` cu o coloană venită de la user cere listă albă, nu parametru.
La interviu: „f-string-ul pune input-ul direct în SQL, deci e injectabil. Folosesc mereu parametri: valoarea pleacă separat de textul query-ului. Pentru identificatori dinamici, ca coloana de sortare, folosesc o listă albă.”
Verificare: Numele coloanei de sortare vine dintr-un dropdown din UI și îl pui în `text(f"... ORDER BY {col}")`. E sigur?
Răspuns verificare: Nu: request-ul poate fi trimis direct, cu orice valoare. Verifici `col` față de o listă de coloane permise înainte să-l pui în query.
Varianta greșită B: E varianta sigură: `:n` e un parametru, deci valoarea pleacă separat de textul SQL.
Varianta greșită C: Expresiile ORM generează query-uri parametrizate: `name` ajunge la DB ca parametru.
Varianta greșită D: `session.get()` caută după cheia primară, transmisă tot ca parametru.

### sqa-08
Pe scurt: La fiecare luare a unei conexiuni din pool, SQLAlchemy verifică dacă mai e vie și o înlocuiește dacă a murit.
Scop: Eviți erorile „server closed the connection unexpectedly” după un restart al bazei de date sau după ce un firewall a închis conexiunile inactive.
Mecanism: Pool-ul ține conexiuni deschise, ca să nu plătească deschiderea lor la fiecare request. O conexiune poate muri fără ca aplicația să afle. Cu `pool_pre_ping=True`, la checkout se trimite un ping ieftin; dacă eșuează, conexiunea e aruncată și se deschide alta.
Pas cu pas:
```text
03:00 restart Postgres -> conexiunile din pool mor
08:00 request -> ia o conexiune din pool
  fără pre_ping: query -> eroare
  cu pre_ping: ping eșuează -> conexiune nouă -> OK
```
Aplicare:
```python
engine = create_engine(url, pool_pre_ping=True,
                       pool_recycle=1800)
```
`pool_recycle` înlocuiește preventiv conexiunile mai vechi de N secunde.
Legătură: În Django, `CONN_HEALTH_CHECKS = True` (din versiunea 4.1) face aceeași verificare pentru conexiunile persistente.
Limită: Costă un drum dus-întors în plus la fiecare checkout și nu ajută dacă conexiunea moare în mijlocul unui query: acolo ai nevoie de retry.
La interviu: „`pool_pre_ping` verifică o conexiune când e luată din pool și o înlocuiește dacă a murit, de exemplu după un restart de DB. Îl combin cu `pool_recycle` când un firewall închide conexiunile inactive.”
Verificare: Un load balancer închide conexiunile TCP inactive după 10 minute. Ce setezi în plus față de `pool_pre_ping`?
Răspuns verificare: `pool_recycle` sub 10 minute, de exemplu 300 de secunde, ca pool-ul să nu țină conexiuni mai vechi decât limita.
Varianta greșită B: Pool-ul nu deschide toate conexiunile la pornire: le deschide la cerere, până la `pool_size`.
Varianta greșită C: Nu trimite ping-uri periodice în fundal: verifică doar în momentul în care conexiunea e luată din pool.
Varianta greșită D: Dezactivarea pool-ului ar fi `poolclass=NullPool`. `pool_pre_ping` păstrează pool-ul.

### sqa-09
Pe scurt: Folosești `INSERT ... ON CONFLICT DO NOTHING` din dialectul postgresql: verificarea și inserarea se fac atomic, în baza de date.
Scop: Task-urile Celery și mesajele pot rula de două ori. Vrei ca a doua rulare să nu creeze un duplicat și nici să nu crape.
Mecanism: Ai nevoie de o constrângere unică, de exemplu pe `event_id`. La conflict, Postgres sare peste rând în aceeași operație, fără o fereastră de timp între „verific” și „inserez”. Două procese concurente nu pot insera amândouă.
Pas cu pas:
```text
W1: INSERT event_id=42 ON CONFLICT DO NOTHING -> inserat
W2: INSERT event_id=42 ON CONFLICT DO NOTHING -> sărit
rezultat: un singur rând, nicio eroare
```
Aplicare:
```python
from sqlalchemy.dialects.postgresql import insert
stmt = insert(Event).values(event_id=42, data=d)
stmt = stmt.on_conflict_do_nothing(
    index_elements=["event_id"])
session.execute(stmt)
```
Pentru actualizare la conflict folosești `on_conflict_do_update(...)`.
Legătură: În Django există `bulk_create(..., ignore_conflicts=True)`. `get_or_create` e sigur sub concurență doar dacă există constrângerea unică în DB.
Limită: Fără o constrângere unică nu există niciun conflict de detectat. Iar `ON CONFLICT DO NOTHING` nu-ți spune direct dacă a inserat; afli cu `RETURNING`.
La interviu: „Pentru inserturi idempotente folosesc `insert().on_conflict_do_nothing()` din dialectul Postgres, pe o constrângere unică. E atomic în DB, spre deosebire de `merge()`, care face SELECT și apoi INSERT și poate pierde cursa sub concurență.”
Verificare: Ai pus `on_conflict_do_nothing()`, dar tabela nu are nicio constrângere unică pe `event_id`. Ce se întâmplă când același eveniment vine de două ori?
Răspuns verificare: Se inserează de două ori: fără constrângere unică nu există conflict, deci nimic nu e sărit.
Varianta greșită B: `merge()` face SELECT, apoi INSERT sau UPDATE. Între cele două, alt proces poate insera același rând, deci operația nu e atomică.
Varianta greșită C: Ignorarea oricărei excepții ascunde și erorile reale. În plus, după o eroare de integritate sesiunea cere rollback înainte să poți continua.
Varianta greșită D: Identity map-ul vede doar obiectele din sesiunea curentă, nu rândurile inserate de alte procese.

### sqa-10
Pe scurt: `--autogenerate` compară modelele SQLAlchemy cu schema bazei de date și scrie un fișier de migrație draft, pe care îl verifici înainte să-l aplici.
Scop: Nu scrii manual fiecare `ALTER TABLE`, dar nici nu lași un script generat să ruleze necitit în producție.
Mecanism: Alembic citește metadatele modelelor și schema curentă din DB, calculează diferențele (tabele, coloane, indexuri) și scrie operațiile, ca `op.add_column(...)`, în `upgrade()` și `downgrade()`. Aplicarea e un pas separat: `alembic upgrade head`.
Pas cu pas:
```text
1. modifici modelul (o coloană nouă)
2. alembic revision --autogenerate -m "add phone"
3. citești și corectezi fișierul generat
4. alembic upgrade head  (separat, la deploy)
```
Aplicare: Verifici mereu fișierul generat. O redenumire apare ca drop + add (pierzi datele), iar unele tipuri custom, constrângeri sau valori implicite pot lipsi.
Legătură: Pașii 2 și 4 corespund lui `makemigrations` și `migrate` din Django.
Limită: Autogenerate nu știe ce intenționai: nu deosebește o redenumire de o ștergere urmată de o adăugare și nu scrie migrații de date.
La interviu: „`alembic revision --autogenerate` compară modelele cu schema și scrie un draft de migrație. Îl citesc obligatoriu, mai ales la redenumiri, și rulez `alembic upgrade head` ca pas separat în deploy.”
Verificare: Ai redenumit în model `name` în `full_name` și rulezi autogenerate. Ce vei găsi probabil în migrație?
Răspuns verificare: `drop_column('name')` și `add_column('full_name')`: aplicată așa, migrația pierde datele. O corectezi manual (`alter_column` cu `new_column_name`) sau faci expand/contract.
Varianta greșită B: Generarea și aplicarea sunt pași separați. Aplicarea e `alembic upgrade head`.
Varianta greșită C: Generarea de modele din baza existentă se face prin reflecție (de exemplu cu `sqlacodegen`), nu cu autogenerate.
Varianta greșită D: Comprimarea migrațiilor vechi se face manual. Autogenerate scrie o migrație nouă pentru diferențele curente.

### sqa-11
Pe scurt: Faci redenumirea în pași compatibili cu ambele versiuni de cod: adaugi coloana nouă, scrii în ambele, faci backfill, muți citirile și abia apoi o ștergi pe cea veche.
Scop: La un rolling deploy, instanțele vechi și cele noi rulează simultan câteva minute. O schimbare bruscă de schemă strică una dintre versiuni.
Mecanism: Expand: adaugi `full_name`, pe care codul vechi o ignoră. Codul nou scrie în ambele coloane. Backfill: copiezi `name` în `full_name` pentru rândurile vechi. Muți citirile pe `full_name`. Contract: ștergi `name` doar după ce nu mai rulează niciun cod care o citește.
Pas cu pas:
```text
1. ADD COLUMN full_name     (codul vechi merge)
2. deploy: scrie în ambele coloane
3. backfill: full_name = name (în loturi)
4. deploy: citește din full_name
5. DROP COLUMN name         (contract)
```
Aplicare: Fiecare pas e o migrație și un deploy separat. Backfill-ul îl faci în loturi, ca să nu ții lock-uri lungi pe tabelă.
Legătură: E același principiu ca la API-uri: adaugi câmpul nou, îl marchezi pe cel vechi ca depreciat și îl scoți când nu-l mai folosește nimeni.
Limită: Durează mai multe deploy-uri. Pentru o tabelă mică, cu o fereastră de mentenanță, un RENAME simplu poate fi acceptabil; regula e pentru zero downtime.
La interviu: „Pentru zero downtime folosesc expand/contract: adaug coloana nouă, scriu în ambele, fac backfill, mut citirile, apoi șterg coloana veche. Fiecare pas e compatibil și cu codul vechi, și cu cel nou, care rulează simultan în timpul deploy-ului.”
Verificare: Ai ajuns la pasul 4 (codul citește din `full_name`), dar o instanță veche încă rulează. Poți face acum pasul 5?
Răspuns verificare: Nu: instanța veche încă citește `name`. Ștergi coloana abia după ce toate instanțele rulează codul nou.
Varianta greșită B: Câteva secunde sau minute coexistă cod vechi și cod nou. Codul vechi caută `name` și crapă imediat după RENAME.
Varianta greșită C: Ștergerea coloanei pierde datele și strică instantaneu codul vechi. Tranzacția nu ajută.
Varianta greșită D: Atomicitatea schimbării nu rezolvă problema: după RENAME, codul vechi care încă rulează tot caută `name`.

### sqa-12
Pe scurt: Folosești Core pentru operații în bulk, ETL și SQL complex, acolo unde obiectele ORM și unit of work-ul doar adaugă cost.
Scop: Când procesezi milioane de rânduri sau scrii rapoarte complexe, vrei SQL eficient și rânduri simple, nu obiecte urmărite de sesiune.
Mecanism: ORM-ul creează câte un obiect Python pentru fiecare rând, îl ține în identity map și îi urmărește modificările. Core construiește aceleași `select()`, `insert()` și `update()`, dar întoarce rânduri simple, fără urmărire.
Pas cu pas:
```text
ORM:  1M rânduri -> 1M obiecte + identity map
Core: 1M rânduri -> tupluri, procesate în flux
```
Aplicare:
```python
with engine.begin() as conn:
    conn.execute(insert(events), rows)
    for r in conn.execute(select(events.c.id)):
        ...
```
Legătură: În Django, echivalentul e să treci de la obiecte la `values()` sau `values_list()`, ori la SQL brut pentru rapoartele grele.
Limită: Core nu e „vechi” sau depreciat: în SQLAlchemy 2.0, ORM-ul folosește aceleași construcții. Pentru logica de business obișnuită, ORM-ul rămâne mai comod.
La interviu: „Folosesc ORM-ul pentru logica de business și Core pentru bulk, ETL și rapoarte complexe, unde nu am nevoie de obiecte și de unit of work. În 2.0 au aceeași sintaxă de `select()`.”
Verificare: Trebuie să copiezi 5M de rânduri dintr-o tabelă în alta, cu o transformare simplă. ORM sau Core?
Răspuns verificare: Core, sau chiar un `INSERT ... SELECT` direct în SQL. Nu ai nevoie de obiecte, iar 5M de obiecte ORM ar consuma memorie și timp.
Varianta greșită B: Core nu e depreciat: în SQLAlchemy 2.0 e baza peste care e construit ORM-ul.
Varianta greșită C: ORM-ul funcționează complet și pe SQLite. Alegerea nu ține de baza de date.
Varianta greșită D: Lazy loading e o funcționalitate a ORM-ului. Core nu are relații încărcate automat.

### sqa-13
Pe scurt: Accesul la o relație lazy cu `AsyncSession` aruncă `MissingGreenlet`: un simplu acces la atribut nu poate face I/O async.
Scop: În FastAPI cu SQLAlchemy async, eroarea apare des la serializarea răspunsului. Trebuie să știi să încarci explicit relațiile.
Mecanism: Cu AsyncSession, orice drum la DB trebuie să fie un `await`. `user.orders` e un acces la atribut, sincron: SQLAlchemy ar trebui să facă un query exact atunci, dar nu are cum să-l aștepte. În loc să blocheze event loop-ul, ridică `MissingGreenlet`.
Pas cu pas:
```text
user = await session.get(User, 1)
user.orders  -> ar trebui un SELECT
             -> nu e într-un context await
             -> MissingGreenlet
```
Aplicare:
```python
res = await session.scalars(
    select(User).where(User.id == 1)
    .options(selectinload(User.orders)))
user = res.one()
# sau, cu mixin-ul AsyncAttrs:
orders = await user.awaitable_attrs.orders
```
Legătură: E aceeași regulă ca în asyncio: nimic nu face I/O pe ascuns; fiecare așteptare e marcată cu `await`.
Limită: Și atributele expirate după commit se reîncarcă lazy. De aceea, cu sesiuni async se folosește des `expire_on_commit=False`.
La interviu: „Cu AsyncSession, lazy loading-ul implicit nu funcționează: accesul la atribut nu poate face await și primești MissingGreenlet. Încarc explicit cu `selectinload` sau folosesc `awaitable_attrs`.”
Verificare: Faci `await session.commit()`, apoi returnezi `user.name`, cu setările implicite. Ce risc apare?
Răspuns verificare: După commit atributele sunt expirate, deci accesul ar cere un query lazy: tot `MissingGreenlet`. Setezi `expire_on_commit=False` pe sesiunea async.
Varianta greșită B: SQLAlchemy nu poate face await automat la un acces de atribut: în Python, un atribut obișnuit nu e un awaitable.
Varianta greșită C: Nu primești o listă goală, ci o eroare. `refresh()` poate încărca relația, dar numai dacă îl chemi explicit.
Varianta greșită D: Ar fi cel mai rău comportament, de aceea SQLAlchemy refuză: blocarea event loop-ului ar opri toate request-urile.

### sqa-14
Pe scurt: Session urmărește obiectele încărcate și modificările lor, apoi le scrie în DB într-o tranzacție (unit of work).
Scop: Vrei ca mai multe modificări din același request să plece împreună, într-o tranzacție, fără să apelezi `save()` pe fiecare obiect.
Mecanism: Adaugi obiectele noi cu `session.add()`. Sesiunea observă și modificările obiectelor pe care le-a încărcat. La flush, generează INSERT, UPDATE și DELETE în ordinea potrivită; la commit, tranzacția devine permanentă.
Pas cu pas:
```text
s.add(order)            -> nou, urmărit
order.items.append(it)  -> modificare observată
s.commit()              -> INSERT order, INSERT item, COMMIT
```
Aplicare:
```python
with Session(engine) as s, s.begin():
    s.add(Order(user_id=7))
# commit automat la ieșirea din bloc
```
Legătură: În Django fiecare obiect se salvează singur (`save()`), iar tranzacția o gestionezi separat, cu `atomic()`. În SQLAlchemy, sesiunea face ambele lucruri.
Limită: Session nu e un pool de conexiuni (acela ține de Engine) și nu e thread-safe: o folosești într-o singură unitate de lucru.
La interviu: „Session implementează unit of work: ține obiectele în identity map, adună modificările, le trimite la flush și le face permanente la commit. Engine-ul gestionează conexiunile.”
Verificare: Modifici `user.email` pe un obiect încărcat prin sesiune și faci `commit()`, fără `session.add(user)`. Se salvează?
Răspuns verificare: Da: obiectul a fost încărcat prin sesiune, deci e deja urmărit. `add()` e necesar doar pentru obiectele noi.
Varianta greșită B: Gestionarea conexiunilor e treaba Engine-ului și a pool-ului. Sesiunea doar împrumută o conexiune.
Varianta greșită C: Tabelele și coloanele le definesc clasele mapate (`DeclarativeBase`), nu sesiunea.
Varianta greșită D: Sesiunea HTTP (login, cookie) e alt concept, care doar are același nume.
