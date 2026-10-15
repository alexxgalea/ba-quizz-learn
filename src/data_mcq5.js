/* MCQ bank 5: grile de bază (nivel 1), ca diagnosticul și mixul să poată porni de la fundamente.
   Fiecare are nivelul și contextul definite direct pe întrebare. */
(function (P) {
  const Q = (m, list) => list.forEach(q => P.mcq.push(Object.assign({ m, lvl: 1 }, q)));

  Q("gil", [
    { id: "gil-13", q: "Diferența de bază dintre un proces și un thread?",
      ctx: "Când pornești `python app.py`, sistemul de operare creează un proces. Un program poate porni apoi alte procese sau mai multe threaduri. Gândește-te ce împart între ele și cât costă să le creezi.",
      o: [
        "Threadurile unui proces împart memoria; procesele au memorie separată",
        "Procesele împart memoria; threadurile au fiecare memoria lor separată",
        "Sunt același lucru; „thread” e doar numele folosit în Python",
        "Un proces rulează mereu pe un singur core, un thread pe toate"], a: 0,
      e: "Threadurile sunt ieftine și comunică direct prin memorie, de aici nevoia de lock-uri. Procesele sunt izolate, mai scumpe de pornit și comunică prin IPC (pipe-uri, cozi, pickling). În CPython, pentru calcul în Python pur, doar procesele ocolesc GIL-ul." },
    { id: "gil-14", q: "Ce face event loop-ul din asyncio?",
      ctx: "O corutină e o funcție `async def`: poate fi pusă pe pauză la `await` și reluată mai târziu. Cineva trebuie să decidă ce corutină rulează în fiecare moment.",
      o: [
        "Alternează corutinele pe un thread, reluând-o pe cea care poate continua",
        "Pornește câte un thread nou pentru fiecare corutină și le rulează în paralel",
        "Rulează corutinele una după alta, fiecare până la capăt, fără pauze",
        "Distribuie corutinele pe toate core-urile procesorului, ca procesele"], a: 0,
      e: "Loop-ul ține evidența task-urilor gata de rulare. Când o corutină ajunge la `await` pe o operație I/O, cedează controlul; loop-ul rulează alta și o reia pe prima când a sosit răspunsul. Totul pe un singur thread: concurență, nu paralelism." }
  ]);

  Q("asgi", [
    { id: "asgi-11", q: "Ce e Uvicorn?",
      ctx: "O aplicație FastAPI e un obiect Python care știe să răspundă la request-uri, dar nu deschide singură porturi și nu acceptă conexiuni de rețea.",
      o: [
        "Un server ASGI care acceptă conexiuni HTTP și apelează aplicația",
        "Un framework web, o alternativă la FastAPI, cu rutare și validare",
        "Un ORM asincron pentru PostgreSQL, folosit des cu FastAPI",
        "Un reverse proxy, ca Nginx, care face TLS și servește fișiere"], a: 0,
      e: "Uvicorn rulează event loop-ul, parsează HTTP și apelează aplicația prin interfața ASGI. Corespondentul din lumea WSGI e Gunicorn cu workeri sync. În producție, Uvicorn rulează adesea ca worker sub Gunicorn sau câte un proces per container." }
  ]);

  Q("index", [
    { id: "idx-12", q: "Ce face, pe scurt, un index B-tree pe coloana `email`?",
      ctx: "Fără index, Postgres găsește un rând citind tabela de la cap la coadă. Gândește-te la indexul de la finalul unei cărți: o listă sortată care îți spune pe ce pagină apare fiecare termen.",
      o: [
        "Ține valorile sortate, cu trimiteri la rânduri: căutare rapidă",
        "Comprimă coloana `email`, ca tabela să ocupe mai puțin spațiu",
        "Copiază tabela în memorie, ca toate query-urile să fie mai rapide",
        "Verifică formatul fiecărui email la inserare și respinge greșelile"], a: 0,
      e: "B-tree-ul e un arbore echilibrat: căutarea costă O(log n) pași în loc de O(n). Ajută la egalitate, intervale (`<`, `BETWEEN`) și `ORDER BY`. Costul: spațiu și scrieri mai lente, pentru că fiecare INSERT/UPDATE actualizează și indexul." }
  ]);

  Q("sqlalchemy", [
    { id: "sqa-14", q: "Ce rol are `Session` în SQLAlchemy ORM?",
      ctx: "În Django, `obj.save()` scrie direct în DB. SQLAlchemy separă lucrurile: obiectele tale sunt simple, iar un alt obiect se ocupă de comunicarea cu baza de date.",
      o: [
        "Urmărește obiectele și scrie modificările în DB, într-o tranzacție",
        "Ține conexiunile deschise și le împarte între threadurile aplicației",
        "Definește tabelele și coloanele, ca o clasă model din Django",
        "Păstrează datele userului logat între request-urile HTTP"], a: 0,
      e: "Session = unit of work: ține obiectele încărcate (identity map), adună modificările, le trimite ca SQL la flush și le face permanente la commit. Pool-ul de conexiuni ține de Engine, iar tabelele le definesc clasele mapate. „Sesiunea HTTP” e alt concept." }
  ]);

  Q("postgres", [
    { id: "pg-12", q: "Ce garantează o tranzacție (`BEGIN` ... `COMMIT`)?",
      ctx: "Un transfer bancar are doi pași: scazi suma dintr-un cont și o adaugi în altul. Gândește-te ce se întâmplă dacă serverul cade între cei doi pași.",
      o: [
        "Toți pașii se aplică împreună sau deloc; ROLLBACK anulează tot",
        "Fiecare pas e salvat imediat, ca să nu se piardă la o cădere",
        "Pașii rulează în paralel, ca operația să se termine mai repede",
        "Nimeni altcineva nu poate citi tabelele cât durează tranzacția"], a: 0,
      e: "Atomicitate: totul sau nimic. Dacă ceva eșuează înainte de COMMIT, faci ROLLBACK și baza rămâne ca înainte. Ce văd ceilalți în timpul tranzacției depinde de nivelul de izolare; în Postgres, cititorii nu sunt blocați (MVCC)." },
    { id: "pg-13", q: "`INNER JOIN` vs `LEFT JOIN` între `users` și `orders`?",
      ctx: "Un JOIN combină rânduri din două tabele după o condiție (`users.id = orders.user_id`). Întrebarea e ce se întâmplă cu un user care nu are nicio comandă.",
      o: [
        "LEFT JOIN păstrează și userii fără comenzi, cu NULL; INNER nu",
        "INNER JOIN păstrează userii fără comenzi, LEFT JOIN îi elimină",
        "Sunt echivalente; LEFT JOIN e doar sintaxa mai veche din SQL",
        "LEFT JOIN returnează doar coloanele din tabela din stânga"], a: 0,
      e: "INNER JOIN întoarce doar perechile care se potrivesc. LEFT JOIN întoarce toate rândurile din stânga; unde nu există potrivire, coloanele din dreapta sunt NULL. Tipar util: `LEFT JOIN ... WHERE orders.id IS NULL` găsește userii fără comenzi." },
    { id: "pg-14", q: "Diferența dintre `EXPLAIN` și `EXPLAIN ANALYZE`?",
      ctx: "Postgres decide singur cum execută un query (ce indexuri folosește, în ce ordine face JOIN-urile): asta e planul. Ambele comenzi îți arată planul, dar nu în același fel.",
      o: [
        "ANALYZE chiar rulează query-ul și arată timpii și rândurile reale",
        "ANALYZE actualizează statisticile tabelei înainte să arate planul",
        "EXPLAIN rulează query-ul, iar ANALYZE doar estimează costul lui",
        "Sunt identice; ANALYZE doar formatează planul ca JSON"], a: 0,
      e: "EXPLAIN arată planul estimat, fără să ruleze query-ul. EXPLAIN ANALYZE îl execută și pune lângă estimări valorile reale; pentru UPDATE/DELETE îl rulezi într-o tranzacție urmată de ROLLBACK. Comanda separată `ANALYZE tabel` actualizează statisticile." }
  ]);

  Q("celery", [
    { id: "cel-14", q: "Ce rol are brokerul (RabbitMQ sau Redis) într-o aplicație Celery?",
      ctx: "Într-o aplicație Celery sunt trei participanți: aplicația ta (care cere un task), workerii (care îl execută) și brokerul. Aplicația și workerii nu comunică direct.",
      o: [
        "Ține coada: aplicația publică task-uri, iar workerii le preiau",
        "Execută codul task-urilor, ca să nu încarce aplicația web",
        "Stochează rezultatele task-urilor, ca să le citească aplicația",
        "Programează task-urile periodice, la ora setată în configurare"], a: 0,
      e: "Brokerul e coada: decuplează cine cere munca de cine o face. Workerii execută codul; rezultatele stau în result backend (opțional, poate fi tot Redis); task-urile periodice le publică Celery Beat." },
    { id: "cel-15", q: "Ce face `send_report.delay(report_id)`?",
      ctx: "`send_report` e o funcție decorată cu `@app.task`. O poți apela direct, ca pe orice funcție, sau prin metodele adăugate de Celery.",
      o: [
        "Publică un mesaj în coadă și revine imediat; un worker îl execută",
        "Rulează funcția imediat, în același proces, ca un apel normal",
        "Așteaptă ca un worker să execute task-ul, apoi întoarce rezultatul",
        "Programează funcția să ruleze zilnic, la ora curentă"], a: 0,
      e: "`delay` e scurtătura pentru `apply_async(args=...)`. Întoarce un `AsyncResult` (cu id-ul task-ului), nu rezultatul. Request-ul HTTP poate răspunde imediat (de exemplu 202), iar munca se face în fundal." }
  ]);

  Q("rabbitmq", [
    { id: "rmq-10", q: "În RabbitMQ, unde publică producătorul și de unde citește consumatorul?",
      ctx: "RabbitMQ are două concepte de bază: exchange și coadă (queue). Legătura dintre ele se numește binding.",
      o: [
        "Publică într-un exchange; consumă dintr-o coadă legată de el",
        "Publică direct într-o coadă; consumă dintr-un exchange",
        "Publică și consumă din același exchange, prin abonare",
        "Publică într-o coadă; RabbitMQ o copiază în toate celelalte"], a: 0,
      e: "Producătorul nu scrie direct în cozi: trimite mesajul unui exchange, cu un routing key. Exchange-ul îl pune în cozile legate (binding-uri), după tipul lui (direct, topic, fanout), iar consumatorii citesc din cozi. Exchange-ul implicit (cu numele gol) rutează direct după numele cozii." },
    { id: "rmq-11", q: "Ce e un ack (acknowledgement) în mesagerie?",
      ctx: "Un consumator primește un mesaj din coadă și îl procesează. Brokerul trebuie să afle dacă poate șterge mesajul sau dacă trebuie să-l dea altcuiva.",
      o: [
        "Confirmarea consumatorului că a procesat mesajul și poate fi șters",
        "Confirmarea producătorului că mesajul a fost scris corect în coadă",
        "Un mesaj de eroare trimis când coada e plină și refuză publicarea",
        "Un semnal periodic prin care brokerul verifică dacă trăiește clientul"], a: 0,
      e: "Fără ack, brokerul re-livrează mesajul (de exemplu altui consumator, după închiderea canalului). Momentul ack-ului decide garanția: ack înainte de procesare = at-most-once; ack după = at-least-once. Confirmarea dinspre broker spre producător se numește publisher confirm, iar semnalul periodic, heartbeat." }
  ]);

  Q("redis", [
    { id: "rd-10", q: "Ce e Redis, în esență?",
      ctx: "Redis apare des în stack-urile Python: cache, broker pentru Celery, rate limiting, lock-uri. Toate au în comun nevoia de operații foarte rapide pe date mici.",
      o: [
        "Un store cheie–valoare în memorie, cu structuri de date și TTL",
        "O bază de date relațională optimizată pentru tabele mici",
        "Un motor de căutare full-text, ca Elasticsearch, dar mai mic",
        "Un broker de mesaje care nu poate stoca date între restarturi"], a: 0,
      e: "Datele stau în RAM (de aici viteza), organizate pe chei, cu tipuri de valori: string, hash, list, set, sorted set, stream. Poate persista pe disc (RDB, AOF), dar e gândit pentru date pe care le poți reconstrui sau care expiră." },
    { id: "rd-11", q: "Ce face `EXPIRE session:42 3600` în Redis?",
      ctx: "În Redis, multe date sunt temporare: o sesiune, un cod de verificare, un contor pe minut. Ar fi incomod să ții minte să le ștergi manual.",
      o: [
        "Cheia `session:42` va fi ștearsă automat după 3600 de secunde",
        "Șterge acum toate cheile mai vechi de 3600 de secunde din Redis",
        "Blochează cheia `session:42` timp de o oră pentru alți clienți",
        "Salvează cheia pe disc, iar după o oră o mută înapoi în memorie"], a: 0,
      e: "EXPIRE pune un TTL (time to live) pe cheie; `TTL session:42` îți arată cât mai are. Poți seta TTL-ul direct la scriere: `SET session:42 ... EX 3600`. Atenție: un SET ulterior fără EX șterge TTL-ul." }
  ]);

  Q("design", [
    { id: "des-08", q: "Ce înseamnă că o operație e idempotentă?",
      ctx: "Într-un sistem distribuit, mesajele și request-urile se pot repeta: un client reîncearcă după un timeout, o coadă re-livrează un mesaj. Unele operații suportă bine repetarea, altele nu.",
      o: [
        "Repetată de mai multe ori, are același efect ca o singură rulare",
        "Rulează garantat o singură dată, oricâte retry-uri ar apărea pe drum",
        "Nu modifică nimic în baza de date, doar citește date",
        "Se execută atomic, într-o singură tranzacție, fără lock-uri"], a: 0,
      e: "`SET status = 'done'` e idempotent, `balance = balance - 100` nu. Un insert cu cheie unică și `ON CONFLICT DO NOTHING` devine idempotent. Idempotență + livrare at-least-once = efect „exactly once” în practică." }
  ]);
})(window.PREP);
