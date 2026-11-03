<!-- Desfășurările fișei `sqlalchemy` (12 puncte). Format și reguli: lib.mjs (checkDesf), .scratch/desfasurari/spec.md. Faptele: research/interview-facts.md, secțiunile 15 și 27. C++ doar la punctul 6 (RAII față de `with Session`); restul nu are echivalent real. Blocurile ```text sunt cod verificat în afara runnerului (au nevoie de modele și sesiune). -->

### harta
Problema: O aplicație care vorbește cu Postgres prin SQL scris de mână ajunge să lipească șiruri în query-uri, să deschidă o conexiune la fiecare cerere, să transforme rândurile în dict-uri și să schimbe schema cu scripturi rulate pe producție. Fiecare petec e o sursă de bug-uri: injection, conexiuni scurse, date vechi, o migrare care lipsește pe un server. SQLAlchemy acoperă tot drumul. Modulul răspunde la șase întrebări: ce straturi ai și cum scrii query-uri, de unde vin conexiunile, cum ține Session obiectele, cum încarci relațiile fără surprize, cum scrii în siguranță și cum schimbi schema.
Grupuri:
- 1–2: straturile (Core și ORM) și stilul 2.0 pentru modele și query-uri
- 3: de unde vin conexiunile (engine și pool)
- 4–7: viața obiectelor în Session (flush și commit, identity map, scope, expirare)
- 8–9: cum încarci relațiile fără N+1, sincron și async
- 10–11: scrieri sigure (insert idempotent, bind parameters)
- 12: cum schimbi schema în producție (Alembic)

### 1
Problema: Un raport citește două milioane de rânduri, iar logica de business salvează un `User`. Cu un singur stil, fie plătești un obiect ORM pentru fiecare rând de raport, fie scrii SQL de mână peste tot.
Ideea: Core construiește SQL din obiecte Python (`Table`, `select()`) și îl rulează pe o `Connection`; primești rânduri simple. ORM stă peste Core: mapează clase pe tabele și adaugă `Session`. Același `select()` merge în ambele.
Exemplu:
```python
from sqlalchemy import *
q = select(literal(7).label("n"))
e = create_engine("sqlite://")
with e.connect() as c:
    r = c.execute(q).first()
print(r, r.n)  # → (7,) 7
```
Legătură: SQA-12. În Django lucrezi aproape numai prin modele. Aici alegi: Core pentru bulk și ETL, ORM pentru logica pe obiecte.

### 2
Greu: da
Problema: Un tutorial scrie `session.query(User)` și `id = Column(Integer)`, altul `select(User)`. Amesteci stilurile, iar type checkerul nu știe ce tip are `user.id`.
Ideea: În stilul 2.0 coloanele sunt `Mapped[int] = mapped_column(...)`, deci type checkerul vede tipul atributului. Nullabilitatea vine din adnotare: `Mapped[str | None]` permite NULL, `Mapped[str]` e NOT NULL. Query-ul e un `select()`, ca în Core, dat sesiunii. `scalars()` dă obiectele `User`, nu rânduri. `Session.query()` e API legacy, dar încă merge.
Exemplu:
```text
class User(Base):
    ...  # id, __tablename__
    mail: Mapped[str | None]
    name: Mapped[str]
q = select(User).where(
    User.name == "Ana")
u = s.scalars(q).first()
```
Legătură: În Django scrii `User.objects.filter(id=7).first()`. Aici query-ul e un obiect separat, pe care îl construiești și îl dai sesiunii.

### 3
Greu: da
Problema: Fiecare request deschide o conexiune nouă la Postgres. Serverul pornește un proces pentru fiecare conexiune, deci la sute de request-uri pe secundă ajungi la `max_connections` și noile conexiuni sunt refuzate.
Ideea: Engine-ul e fabrica de conexiuni și ține un pool. `connect()` ia o conexiune din pool, iar `close()` o returnează, nu o închide. Implicit sunt `pool_size=5` conexiuni permanente și `max_overflow=10` temporare în plus; peste ele, cererea așteaptă `pool_timeout=30` de secunde și pică. `pool_pre_ping=True` testează conexiunea la fiecare luare și o înlocuiește dacă e moartă. `pool_recycle=n` înlocuiește conexiunile mai vechi de n secunde. Creezi un singur engine per bază de date.
Exemplu:
```python
from sqlalchemy import *
e = create_engine("sqlite:///a",
    pool_size=1, max_overflow=0,
    pool_timeout=0.1)
a = e.connect()
a.close()
b = e.connect()  # ok: aceeași
e.connect()  # ! TimeoutError
```
Legătură: Django ține o conexiune per thread și o închide la sfârșitul request-ului (`CONN_MAX_AGE=0`, implicit); din 5.1 poate folosi un pool psycopg. Cu mulți workeri pool-urile se adună: 20 de procese × (5 + 10) înseamnă până la 300 de conexiuni, de aceea PgBouncer (design, punctul 6).

### 4
Greu: da
Problema: Adaugi un `User` și faci un query pe același tabel, fără `commit()`. Îl găsești în rezultat, deși alt proces nu-l vede. Când e „salvat” de fapt?
Ideea: `session.add()` doar notează obiectul; nu pleacă niciun SQL. `flush()` trimite INSERT, UPDATE și DELETE în tranzacția curentă: conexiunea ta le vede, alte conexiuni nu, iar un rollback le anulează. Autoflush face flush singur înainte de fiecare query, deci query-ul își vede modificările. `commit()` e flush plus COMMIT; abia acum le văd și ceilalți.
Exemplu:
```text
s.add(User(name="Ana"))
# încă fără SQL
s.scalars(select(User)).all()
# autoflush: INSERT, SELECT
# → [Ana]
s2.scalars(select(User)).all()
# → [] (încă necomis)
s.commit()  # → s2 vede [Ana]
```
Legătură: SQA-04 și SQA-14. În Django `obj.save()` trimite INSERT imediat și, în autocommit, îl comite; aici `add()` nu trimite nimic. `transaction.atomic()` seamănă cu `with session.begin()`.

### 5
Greu: da
Problema: Într-un request încarci `User` 7 în handler, iar un helper îl încarcă din nou. Modifici un obiect și citești celălalt: vezi valoarea veche. La commit, o copie o suprascrie pe cealaltă.
Ideea: Sesiunea ține un dicționar (identity map) de la cheia primară la obiect, deci același rând dă mereu același obiect Python. `session.get(User, 7)` îl ia din map, fără SQL. Un `select()` tot trimite SQL, dar îți dă obiectul deja încărcat. Map-ul aparține sesiunii, deci nu e un cache între request-uri.
Exemplu:
```text
a = s.get(User, 7)  # SELECT
b = s.get(User, 7)  # fără SQL
q = select(User).where(
    User.id == 7)
c = s.scalar(q)  # SELECT
print(a is b is c)  # → True
```
Legătură: SQA-01. În Django, `User.objects.get(pk=7)` apelat de două ori dă două obiecte diferite.

### 6
Greu: da
Problema: Pui `session = Session(engine)` la nivel de modul, „ca să fie la îndemână”. Două request-uri o folosesc deodată: rollback-ul unuia anulează munca celuilalt, iar obiectele lor se amestecă în același identity map.
Ideea: Session ține o tranzacție și un identity map, deci e o unitate de lucru, nu o resursă globală. O creezi per request (în FastAPI, într-o dependență cu `yield`) sau per task Celery, într-un `with Session(engine) as s:`. Nu e sigură între thread-uri sau task-uri asyncio: are un singur proprietar. Engine-ul, în schimb, se partajează.
Exemplu:
```python
from sqlalchemy import *
from sqlalchemy.orm import *
e = create_engine("sqlite://")
with Session(e) as s:
    s.connection()
    s.in_transaction()  # → True
s.in_transaction()  # → False
```
În C++: `with Session(e) as s:` seamănă cu un obiect RAII pe stivă, ca `std::lock_guard`: destructorul eliberează resursa la ieșirea din bloc, inclusiv prin excepție.
Unde nu ține: În C++ destructorul rulează oricum, la ieșirea din scope. În Python, fără `with`, nimeni nu cheamă `close()` la ieșirea din funcție, iar conexiunea rămâne luată din pool până o găsește garbage collectorul.
Legătură: SQA-06. În Django nu faci asta: framework-ul leagă conexiunea de request. În FastAPI sesiunea vine ca dependență.

### 7
Greu: da
Problema: După `commit()`, un `print(user.name)` trimite un SELECT, deși n-ai cerut nimic. Mai rău: închizi sesiunea, apoi serializezi obiectul în răspuns și primești `DetachedInstanceError`.
Ideea: Cu `expire_on_commit=True` (implicit), commit-ul expiră atributele tuturor obiectelor, ca să nu rămână date vechi față de ce a comis altcineva. Următorul acces la un atribut citește din DB, cu un SELECT. Dacă sesiunea e închisă între timp, obiectul e detached și nu mai are prin ce citi: `DetachedInstanceError`. Soluții: construiești răspunsul înainte să închizi sesiunea, apelezi `refresh` sau pui `expire_on_commit=False`. În ultimul caz riști date învechite și le reîncarci tu când contează.
Exemplu:
```text
s.commit()  # expiră atributele
u.name  # SELECT, apoi "Ana"
s.commit()
s.close()
u.name  # DetachedInstanceError
```
Legătură: SQA-04 și SQA-05. Django nu expiră nimic la `save()`: valorile rămân în memorie până apelezi `refresh_from_db()`. SQLAlchemy face singur acest refresh, la următorul acces.

### 8
Greu: da
Problema: Listezi 100 de useri cu numărul comenzilor lor. Codul arată nevinovat, dar în log apar 101 query-uri: unul pentru useri, apoi câte unul pentru comenzile fiecăruia.
Ideea: Relațiile sunt lazy: `user.orders` trimite un SELECT abia la primul acces, pentru acel user. Pentru N obiecte rezultă N+1 query-uri. Remediul e eager loading, cerut în query. `selectinload` face un al doilea SELECT cu `IN` pe cheile părinților și e strategia obișnuită pentru colecții. `joinedload` adaugă un JOIN: merge bine la many-to-one, iar pe colecții repetă părintele și cere `.unique()`. `raiseload` aruncă o eroare la orice lazy load, ca testele să prindă N+1.
Exemplu:
```text
us = s.scalars(select(User)).all()
for u in us:
    len(u.orders)  # +1 SELECT
q = select(User).options(
    selectinload(User.orders))
us = s.scalars(q).all()
# → 2 SELECT-uri în total
```
Legătură: SQA-02 și SQA-03. Problema există și în Django, cu aceleași remedii: `select_related` e ca `joinedload`, `prefetch_related` ca `selectinload` (DJ-01).

### 9
Greu: da
Problema: Muți un endpoint pe `AsyncSession`. `order.items`, care mergea, aruncă acum `MissingGreenlet`. Un acces la atribut ar trebui să facă un SELECT, dar un atribut nu se poate `await`-a.
Ideea: `create_async_engine("postgresql+asyncpg://…")` și `AsyncSession` fac I/O async, iar fiecare operație se așteaptă: `await session.execute(...)`. Lazy loading-ul implicit nu merge, fiindcă ar face I/O ascuns. Ai trei ieșiri: eager loading în query (`selectinload`), `await obj.awaitable_attrs.items` (cu mixin-ul `AsyncAttrs` pe clasa de bază) sau `lazy="raise"`. Docs recomandă `expire_on_commit=False`: altfel atributele expirate de commit dau aceeași eroare. Folosești o `AsyncSession` per task, nu una partajată într-un `gather()`.
Exemplu:
```text
Sess = async_sessionmaker(
    engine, expire_on_commit=False)
async with Sess() as s:
    q = select(User).options(
        selectinload(User.orders))
    r = await s.scalars(q)
    u = r.first()
    u.orders  # ok, încărcat
```
Legătură: SQA-13. E aceeași regulă ca în asyncio: nimic blocant sau ascuns pe event loop. Cu FastAPI și asyncpg, fiecare acces la DB trece printr-un `await`.

### 10
Greu: da
Problema: Doi workeri primesc același eveniment. Fiecare face un `SELECT` („există?”), nu găsește nimic și face `INSERT`. Al doilea pică pe constrângerea unică sau, fără ea, ai un duplicat. Între verificare și inserare există un gol.
Ideea: `insert(...).on_conflict_do_nothing()` (din `sqlalchemy.dialects.postgresql`) trimite `INSERT … ON CONFLICT DO NOTHING`: Postgres verifică și inserează atomic. Conflictul cere o constrângere sau un index unic. `on_conflict_do_update` face upsert, dar îi spui ținta (`index_elements`), iar valoarea propusă o iei din `excluded`. Pentru multe rânduri dai o listă de dict-uri; la milioane, `COPY` e mai rapid.
Exemplu:
```text
q = insert(Evt).values(id=7)
q = q.on_conflict_do_nothing(
    index_elements=["id"])
s.execute(q)  # INSERT
s.execute(q)  # fără eroare
-- SQL: INSERT INTO evt (id)
--   VALUES (7) ON CONFLICT (id)
--   DO NOTHING
```
Legătură: SQA-09. Un consumator idempotent din design (punctul 2) se bazează pe asta. În Django, `bulk_create(ignore_conflicts=True)` ignoră rândurile care încalcă o constrângere.

### 11
Greu: da
Problema: Un endpoint de căutare face `text(f"… WHERE name = '{name}'")`. Clientul trimite `' OR 1=1 --`, iar condiția devine adevărată pentru toate rândurile.
Ideea: Cu parametri legați, SQL-ul conține doar un marcaj (`:name`), iar valoarea ajunge separat, la driver. `select().where(User.name == name)` și `text("… :name")` fac asta; f-string-ul, `%` și `+` nu. Numele de tabele sau coloane nu pot fi parametri; pe acelea le alegi dintr-o listă fixă.
Exemplu:
```python
import sqlalchemy as sa
w = "' OR 1=1 --"
s = f"n = '{w}'"
print(s)  # → n = '' OR 1=1 --'
q = sa.text("n = :w")
print(q)  # → n = :w
```
Legătură: SQA-07. Django ORM parametrizează singur; la `raw()` dai valorile separat, ca listă.

### 12
Greu: da
Problema: Adaugi o coloană în model și deploy-ul pică pe producție cu „column does not exist”. Pe dev schema a fost schimbată de mână, deci nimeni nu mai știe în ce stare e fiecare bază.
Ideea: Alembic ține schema în fișiere de migrare. Fiecare are `revision`, `down_revision`, `upgrade()` și `downgrade()`, iar baza își notează versiunea în `alembic_version`. `revision --autogenerate` compară modelele cu baza și scrie un draft. Îl verifici: o redenumire apare ca drop + add, iar constrângerile fără nume nu se văd. `upgrade head` rulează ca pas separat al deploy-ului. Pentru zero downtime schimbi în pași (expand/contract): adaugi coloana nouă, scrii în ambele, faci backfill, muți citirile, ștergi coloana veche într-o migrare ulterioară.
Exemplu:
```text
revision = "0002"
down_revision = "0001"
def upgrade():
    op.add_column("user",
        sa.Column("tz", sa.Text()))
def downgrade():
    op.drop_column("user", "tz")
```
Legătură: SQA-10 și SQA-11. `makemigrations` din Django corespunde lui `revision --autogenerate`, iar `migrate` lui `upgrade head`. La o redenumire Django întreabă „Was u.name renamed to u.full_name?”; Alembic nu întreabă și generează drop + add, deci pierzi datele dacă nu corectezi draftul.
