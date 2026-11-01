// Schelete: codul minim, canonic, al unui concept, scris din memorie în câteva minute (vezi CONTEXT.md).
// id: „s-<modul>-<nume>”; referința e secțiunea „=== <id> ===” din katas/skel_*.{py,mjs,ts,tsx,sql}, testată.
// t titlul, p cerința, k punctele esențiale (3–5), lang limbajul referinței (py, js, ts, tsx, sql, yaml, docker),
// v marcajul de versiune (de pildă „3.11+”), st = true pentru „verificat structural”, g grupa (doar la frontend: react, js, ts).
window.PREP.skel = [
  {
    id: "s-gil-bq", m: "gil", lang: "py",
    t: "Coadă blocantă mărginită cu Condition",
    p: "Scrie o clasă `BoundedQueue(cap)` cu `put(item)` și `get()`, sigure între thread-uri: `put` așteaptă cât coada e plină, `get` așteaptă cât e goală. Fără `queue.Queue`; doar `threading`.",
    k: [
      "`while`, nu `if`, în jurul lui `wait()`: la trezire condiția se verifică din nou (trezire falsă sau alt thread a luat locul).",
      "Ambele condiții (`not_full` / `not_empty`) folosesc același lock, iar bufferul se citește și se modifică doar sub el.",
      "`put` face `notify` pe condiția „nu e goală”, `get` pe „nu e plină”, după ce au schimbat bufferul.",
      "Bufferul e un `deque` (`popleft` în O(1)), iar o capacitate < 1 e respinsă."
    ]
  },
  {
    id: "s-redis-cache", m: "redis", lang: "py",
    t: "Cache-aside cu TTL și invalidare",
    p: "Scrie `get_user(r, uid, load, ttl)`: citește din Redis, iar la lipsă cheamă `load(uid)` și pune rezultatul în cache cu TTL. Scrie și `save_user(r, uid, user, save)`, care scrie în sursă și invalidează cheia. `r` e un `redis.Redis`.",
    k: [
      "Fluxul cache-aside: la hit întorci valoarea din cache fără să atingi sursa; la miss citești din sursă și abia apoi pui în cache.",
      "Valoarea și TTL-ul se pun într-o singură comandă (`set(key, value, ex=ttl)`), nu `set` urmat de `expire`: un crash între ele lasă cheia fără expirare.",
      "Miss-ul se recunoaște după `None` de la `get` (`is not None`), nu după valoarea decodată: `{}` și `0` sunt valori valide. Valoarea se serializează (JSON).",
      "La scriere: întâi sursa, apoi `delete` pe cheie (invalidare). Nu rescrii cache-ul, ca să nu păstrezi o valoare veche."
    ]
  },
  {
    id: "s-redis-lock", m: "redis", lang: "py",
    t: "Lock cu SET NX PX și eliberare sigură",
    p: "Scrie `acquire(r, name, ttl_ms)`, care întoarce un token dacă a luat lock-ul și `None` dacă e deja luat, și `release(r, name, token)`, care îl eliberează doar dacă îl deții încă. O singură instanță Redis, fără Redlock.",
    k: [
      "Lock-ul se ia cu o singură comandă: `set(name, token, nx=True, px=ttl_ms)`. `SETNX` urmat de `EXPIRE` nu e atomic.",
      "TTL-ul (`px`) eliberează lock-ul singur dacă procesul care îl ține moare; fără el, lock-ul rămâne agățat.",
      "Valoarea e un token unic pe proprietar (`uuid4().hex`), nu o constantă: doar tokenul arată cine deține lock-ul.",
      "Eliberarea compară tokenul și șterge atomic, într-un script Lua (`eval`). Un `delete` simplu, sau `get` urmat de `delete` din Python, poate șterge lock-ul altuia după ce al tău a expirat."
    ]
  },
  {
    id: "s-redis-ratelimit", m: "redis", lang: "py",
    t: "Rate limit cu fereastră fixă (INCR + EXPIRE)",
    p: "Scrie `allow(r, user, limit, window)`: întoarce `True` cât `user` are cereri rămase în fereastra curentă de `window` secunde și `False` după `limit` cereri. Contorul stă în Redis.",
    k: [
      "Cheia conține fereastra (`time() // window`): o fereastră nouă înseamnă o cheie nouă, deci contorul pornește de la zero.",
      "`INCR` crește atomic și întoarce noua valoare. Nu citești cu `get` ca să scrii cu `set`: două cereri concurente ar pierde o incrementare.",
      "`INCR` și `EXPIRE` pleacă împreună într-un `pipeline` (MULTI/EXEC), ca un crash între ele să nu lase un contor fără TTL.",
      "Verdictul e `count <= limit`: cererea cu numărul `limit` mai trece, cea cu `limit + 1` e respinsă."
    ]
  },
  {
    id: "s-rabbitmq-consumer", m: "rabbitmq", lang: "py",
    t: "Consumer pika cu prefetch, ack manual și DLQ",
    p: "Scrie `consume(ch, handle, queue)` pe un channel pika: declară coada și coada de mesaje moarte `<queue>.dlq`, limitează prefetch-ul, procesează fiecare mesaj cu `handle(body)` și confirmă-l. Un mesaj care dă eroare nu se reîncearcă, ci ajunge în DLQ. Callback-ul primește `(ch, method, props, body)`.",
    k: [
      "`basic_qos(prefetch_count=N)` se cheamă înainte de `basic_consume`: fără limită, brokerul împinge toată coada la un singur consumer.",
      "Ack manual: `auto_ack=False` (implicit în pika) și `basic_ack(method.delivery_tag)` doar după ce `handle` a reușit, deci mesajul se livrează cel puțin o dată.",
      "La eroare: `basic_nack(method.delivery_tag, requeue=False)`. Cu `requeue=True`, mesajul stricat se întoarce la nesfârșit.",
      "DLQ: coada principală e declarată cu `x-dead-letter-exchange` (`''`, exchange-ul implicit) și `x-dead-letter-routing-key` = numele DLQ-ului; ambele cozi sunt durabile."
    ]
  },
  {
    id: "s-linux-sigterm", m: "linux", lang: "py",
    t: "Graceful shutdown la SIGTERM",
    p: "Scrie `serve(step, cleanup)`: repetă `step()` într-o buclă până primește SIGTERM sau SIGINT, termină unitatea de lucru curentă, rulează `cleanup()` o singură dată și iese cu codul 0. Așa se oprește un worker la `docker stop`.",
    k: [
      "Handlerul (`signal.signal(signal.SIGTERM, handler)`, cu `signum, frame`) doar setează un flag (`threading.Event`); nu face I/O și nu închide nimic în el.",
      "Bucla verifică flagul între unități de lucru (`while not stop.is_set()`), deci unitatea curentă se termină, nu e tăiată.",
      "`cleanup()` stă într-un `finally` după buclă, ca să ruleze și când `step` ridică o excepție.",
      "Același handler pentru SIGINT (Ctrl+C). `signal.signal` se cheamă din thread-ul principal (altfel `ValueError`); fără handler, SIGTERM omoară procesul fără cleanup."
    ]
  },
  {
    id: "s-perf-profile", m: "perf", lang: "py",
    t: "Profilare cu cProfile și măsurare cu timeit",
    p: "Scrie `profile(fn, sort, top)`, care rulează `fn` sub `cProfile` și întoarce raportul `pstats` ca text (primele `top` rânduri, sortate după `sort`), și `best_of(fn, n, repeat)`, care întoarce secundele pe apel măsurate cu `timeit`.",
    k: [
      "`cProfile.Profile()` ca context manager în jurul codului măsurat; profilerul se oprește și dacă `fn` ridică o excepție.",
      "Raportul: `pstats.Stats(pr, stream=io.StringIO())`, apoi `sort_stats(sort)` și `print_stats(top)`; textul se ia din `getvalue()`.",
      "Sortezi după `tottime` (timp în funcția însăși, fără subapeluri) ca să găsești bucla fierbinte, și după `cumulative` (cu subapeluri) ca să găsești lanțul scump de apeluri.",
      "`timeit.repeat(fn, number=n, repeat=r)` primește un callable. Iei `min(...)`, nu media, și împarți la `n` ca să ai secunde pe apel."
    ]
  },
  {
    id: "s-aws-presign", m: "aws", lang: "py",
    t: "URL presemnat S3 cu boto3",
    p: "Scrie `presign(method, bucket, key, expires, region)`, care întoarce un URL presemnat pentru `get_object` (descărcare) sau `put_object` (încărcare). URL-ul trebuie semnat cu SigV4, pentru regiunea bucket-ului.",
    k: [
      "`generate_presigned_url(method, Params={'Bucket': ..., 'Key': ...}, ExpiresIn=secunde)`: `get_object` pentru descărcare, `put_object` pentru încărcare.",
      "Clientul se creează cu `region_name` și `Config(signature_version='s3v4')`. Documentația boto3 recomandă SigV4 și regiunea bucket-ului; în `us-east-1`, cu config implicit, am primit un URL SigV2 vechi.",
      "`ExpiresIn` e în secunde și rămâne scurt (minute). URL-ul moare oricum odată cu credențialele temporare (rol IAM, STS) cu care a fost semnat.",
      "URL-ul se calculează local, cu credențialele clientului: nu apelează S3 și nu verifică dacă bucket-ul sau cheia există. Cine îl are poate folosi operația semnată, deci îl tratezi ca pe un secret."
    ]
  }
];
