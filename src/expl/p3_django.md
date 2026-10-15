<!-- Django. Variantele greșite: B, C, D = ordinea din sursă (A e cea corectă). -->

### dj-01
Pe scurt: `select_related("customer")`: Django aduce comenzile și clienții lor într-un singur query, cu JOIN, în loc de câte un query pentru fiecare comandă.
Scop: Elimini problema N+1, cea mai frecventă cauză de pagini lente în aplicațiile Django.
Mecanism: Fără `select_related`, `Order.objects.all()` face un query, iar fiecare `order.customer` declanșează încă unul, la primul acces. Cu `select_related`, Django adaugă un JOIN pe ForeignKey și construiește obiectele `Customer` din același rezultat.
Pas cu pas:
```text
fără: 1 query (comenzi)
  + 100 de query-uri (clienți)
cu select_related("customer"):
  SELECT ... FROM order
  JOIN customer ON ... -> 1 query
```
Aplicare:
```python
orders = (Order.objects
          .select_related("customer")
          .prefetch_related("items"))
for o in orders:
    print(o.customer.name, len(o.items.all()))
```
Legătură: Echivalentele din SQLAlchemy sunt `joinedload` (JOIN) și `selectinload` (query separat, cu `IN`).
Limită: `select_related` merge doar pe ForeignKey și OneToOne. Pentru many-to-many și pentru relațiile inverse folosești `prefetch_related`, care face un query separat cu `IN`. Iar un JOIN pe prea multe relații produce rânduri foarte late.
La interviu: „E N+1: fiecare `order.customer` face un query. Folosesc `select_related` pentru ForeignKey și OneToOne (un JOIN) și `prefetch_related` pentru many-to-many și relațiile inverse (un query cu `IN`). Verific numărul de query-uri cu Django Debug Toolbar sau în teste.”
Verificare: Cum verifici într-un test că pagina nu mai face N+1?
Răspuns verificare: Cu `self.assertNumQueries(2)` (sau `django_assert_num_queries`, în pytest-django) în jurul codului: testul pică dacă numărul de query-uri crește.
Varianta greșită B: `.only("id")` încarcă mai puține coloane, dar accesul la `order.customer` face tot câte un query, iar câmpurile neîncărcate aduc query-uri în plus.
Varianta greșită C: `.values()` poate evita N+1 dacă ceri explicit `customer__name`, dar renunți la obiecte și la metodele lor. `select_related` rezolvă problema și păstrează obiectele.
Varianta greșită D: Indexul face fiecare query mai rapid (iar Django îl creează oricum pentru ForeignKey), dar tot ai 101 query-uri. Problema e numărul lor, nu viteza fiecăruia.

### dj-02
Pe scurt: `Post.objects.filter(pk=pk).update(views=F("views") + 1)`: incrementul se face în SQL, într-o singură instrucțiune, deci nu se pierde nicio actualizare sub concurență.
Scop: Contoarele (vizualizări, încercări, stoc) sunt cazul clasic de lost update: două request-uri simultane, un singur increment salvat.
Mecanism: `F("views")` înseamnă „valoarea coloanei din baza de date”, nu valoarea din Python. Django generează `UPDATE post SET views = views + 1 WHERE id = ...`, iar Postgres face citirea și scrierea atomic, cu lock pe rând. Varianta `p.views += 1; p.save()` citește în Python, modifică și scrie înapoi, deci două request-uri pot citi aceeași valoare.
Pas cu pas:
```text
p.views += 1; p.save():
  A citește 10, B citește 10
  A scrie 11, B scrie 11 -> lost update
update(views=F("views") + 1):
  SET views = views + 1 -> 12
```
Aplicare:
```python
Post.objects.filter(pk=pk).update(
    views=F("views") + 1)
# dacă ai nevoie de valoarea nouă:
post.refresh_from_db(fields=["views"])
```
Legătură: E exact PG-02 (lost update) în Django, cu aceeași soluție: un `UPDATE ... SET x = x + 1` atomic.
Limită: `update()` nu apelează `save()` și nici semnalele `pre_save` și `post_save`, iar obiectul din memorie nu se actualizează singur. Pentru logică mai complexă (citești, decizi, scrii) folosești `select_for_update()` într-o tranzacție.
La interviu: „Folosesc `update(views=F("views") + 1)`, care face incrementul în SQL, atomic. Varianta cu `+= 1` și `save()` e read-modify-write și pierde actualizări sub concurență. Pentru logică mai complexă folosesc `select_for_update()`.”
Verificare: Vrei să scazi stocul doar dacă e mai mare decât 0. Cum faci asta atomic, fără un lock explicit?
Răspuns verificare: `Product.objects.filter(pk=pk, stock__gt=0).update(stock=F("stock") - 1)`, apoi verifici numărul întors: 1 înseamnă că ai reușit, 0 că stocul era epuizat.
Varianta greșită B: E read-modify-write în Python: două request-uri simultane citesc aceeași valoare, iar una dintre actualizări se pierde.
Varianta greșită C: `update_fields` reduce coloanele scrise, dar valoarea e tot calculată în Python, deci lost update-ul rămâne.
Varianta greșită D: Un contor în memoria procesului nu e partajat între workeri sau replici și dispare la restart.

### dj-03
Pe scurt: `transaction.on_commit` publică task-ul abia după commit-ul tranzacției, ca workerul să găsească raportul salvat în DB.
Scop: Eviți bug-ul intermitent în care workerul caută un rând încă necomis sau anulat de un rollback (CEL-07).
Mecanism: Într-un bloc `transaction.atomic()` (sau cu `ATOMIC_REQUESTS`), scrierile devin vizibile pentru alte conexiuni abia la commit. `on_commit` înregistrează funcția și o rulează doar după un commit reușit; dacă tranzacția face rollback, funcția nu mai rulează deloc.
Pas cu pas:
```text
atomic():
  report = Report.objects.create(...)
  on_commit(publică send_report)
COMMIT -> abia acum: delay()
rollback -> task-ul nu e publicat
```
Aplicare:
```python
with transaction.atomic():
    report = Report.objects.create(owner=user)
    transaction.on_commit(
        lambda: send_report.delay(report.id))
```
Din Celery 5.4 ai și scurtătura `send_report.delay_on_commit(report.id)`.
Legătură: E aceeași problemă ca la CEL-07; în SQLAlchemy, echivalentul e să publici după `session.commit()`.
Limită: Dacă procesul moare între commit și publicare, task-ul se pierde; pentru garanție completă folosești outbox (DES-01). Iar `on_commit` doar publică task-ul, nu-ți dă rezultatul lui.
La interviu: „Cu `transaction.on_commit` public task-ul doar după commit, ca workerul să nu caute un rând încă necomis sau anulat. Din Celery 5.4 există și `delay_on_commit`. Pentru garanție completă, outbox.”
Verificare: Tranzacția face rollback după ce ai înregistrat `on_commit`. Ce se întâmplă cu task-ul?
Răspuns verificare: Nu e publicat: funcțiile înregistrate cu `on_commit` rulează doar dacă tranzacția face commit.
Varianta greșită B: `on_commit` nu rulează task-ul în proces și nici nu-l accelerează: doar amână publicarea până după commit.
Varianta greșită C: Nu e obligatoriu: e necesar doar când task-ul depinde de date scrise în tranzacția curentă.
Varianta greșită D: Task-ul rulează pe worker, în alt proces și cu altă conexiune, deci în afara tranzacției request-ului. `on_commit` doar așteaptă commit-ul acesteia.

### dj-04
Pe scurt: Django ORM folosește modelul Active Record (obiectul se salvează singur, cu `obj.save()`); SQLAlchemy folosește Data Mapper (o `Session` urmărește obiectele și scrie modificările).
Scop: Vii din Django și vei lucra cu SQLAlchemy: dacă știi diferența de model, transferi repede tot ce știi deja.
Mecanism: În Django, fiecare model știe să se salveze, să se șteargă și să se interogheze (`Order.objects`), iar fiecare `save()` scrie imediat. În SQLAlchemy, modelele sunt clase simple, mapate pe tabele; `Session` ține obiectele încărcate (identity map), le urmărește modificările și le scrie la `flush` sau la `commit`, ca o unitate de lucru. Dedesubt, SQLAlchemy are și Core, pentru SQL direct.
Pas cu pas:
```text
Django: o = Order(...); o.save()
  -> INSERT imediat
SQLAlchemy: session.add(o)
  o.status = "paid"
  session.commit() -> INSERT, apoi UPDATE
```
Aplicare: Corespondențe utile: `select_related` ≈ `joinedload`, `prefetch_related` ≈ `selectinload`, `transaction.atomic()` ≈ `with session.begin()`, `migrate` ≈ Alembic, `F()` ≈ `update(...).values(x=Model.x + 1)`.
Legătură: Ai lucrat ani de zile cu Django ORM: aceleași probleme (N+1, lost update, tranzacții) au aceleași soluții și în SQLAlchemy, doar cu alte nume.
Limită: Data Mapper cere mai multă disciplină: sesiunea se gestionează explicit (una per request), iar obiectele detașate de sesiune nu mai pot încărca relații leneș (`DetachedInstanceError`).
La interviu: „Django ORM e Active Record: obiectul se salvează singur. SQLAlchemy e Data Mapper: `Session` urmărește modificările și le scrie ca unitate de lucru, iar dedesubt am Core pentru SQL. Conceptele se mapează: `select_related` e `joinedload`, `atomic` e `session.begin()`, migrațiile sunt în Alembic.”
Verificare: În SQLAlchemy modifici `order.status`, nu mai apelezi nimic și închizi sesiunea. Se salvează modificarea?
Răspuns verificare: Nu: modificarea e doar urmărită de sesiune; ajunge în DB abia la `flush` și se păstrează doar la `commit`. Dacă închizi sesiunea fără commit, o pierzi.
Varianta greșită B: Nu sunt identice ca model: Django e Active Record, SQLAlchemy e Data Mapper, cu o sesiune care urmărește modificările.
Varianta greșită C: SQLAlchemy e construit chiar în jurul sesiunii (Data Mapper), nu e Active Record.
Varianta greșită D: Django ORM are tranzacții: `transaction.atomic()` și `ATOMIC_REQUESTS`.
