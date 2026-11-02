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
    id: "s-frontend-closure", m: "frontend", g: "js", lang: "js",
    t: "Closure și factory: un contor cu stare privată",
    p: "Scrie `makeCounter(start = 0)`, care întoarce un obiect cu `inc()`, `dec()` și `value()`. Starea nu trebuie să fie accesibilă din afară, iar doi contori creați separat nu își împart valoarea.",
    k: [
      "Starea e o variabilă locală a fabricii (`let n`), nu o proprietate a obiectului întors: din afară nu o poți citi sau scrie.",
      "Metodele sunt closure-uri: păstrează accesul la `n` și după ce `makeCounter` s-a terminat, fiindcă closure-ul capturează variabila, nu o copie a valorii.",
      "Fiecare apel al fabricii creează o variabilă `n` nouă, deci doi contori nu își împart starea; fără `new`, fără clasă.",
      "Metodele nu folosesc `this`, deci merg și extrase (`const { inc } = c; inc()`), unde o metodă de clasă și-ar pierde contextul."
    ]
  },
  // ---- frontend / JavaScript (tichetul 09) ----
  {
    id: "s-frontend-this", m: "frontend", g: "js", lang: "js",
    t: "this: metodă extrasă, bind și arrow",
    p: "Scrie clasa `Button(label)` cu `click()`, care întoarce `\"click:\" + label`. Adaugă o versiune legată în constructor (`bound`), un câmp arrow (`arrow`) și `tags(items)`, care folosește un callback arrow. Scrie și `call(handler)`, care apelează `handler()` fără obiect în față, ca să arăți că `click` extrasă aruncă.",
    k: [
      "`this` îl decide felul apelului, nu locul unde e scrisă funcția: `btn.click()` are `this === btn`, dar `const f = btn.click; f()` îl pierde. Codul din clase e strict, deci `this` e `undefined` și `this.label` aruncă `TypeError` (nu citește din `globalThis`).",
      "`bind(this)` în constructor sau un câmp arrow fixează `this` pe instanță, deci poți da metoda ca handler (`onClick={btn.bound}`). Pe o funcție legată, `call` / `apply` și un al doilea `bind` nu mai schimbă `this`; pe metoda obișnuită, `call` îl schimbă.",
      "Arrow function nu are `this` propriu: îl ia lexical, din scope-ul în care e scrisă. De aceea `items.map((i) => this.label + i)` merge în interiorul metodei.",
      "Un `function () {}` clasic în același callback își are propriul `this` (`undefined` în cod strict): capcana tipică, reparată cu arrow sau cu `bind`."
    ]
  },
  {
    id: "s-frontend-event-loop", m: "frontend", g: "js", lang: "js",
    t: "Ordinea pe event loop: sync, microtask, timeout",
    p: "Scrie în comentariu ce ordine prezici, apoi funcția `order()`. Ea pune un `setTimeout(…, 0)`, un `.then` (care pornește un `queueMicrotask` numit `nested`), un `queueMicrotask`, o funcție `async` cu `await null` și un pas sincron. Fiecare pas adaugă un șir în `log`, iar promisiunea întoarsă se rezolvă cu `log` din timeout.",
    k: [
      "Mai întâi tot codul sincron (inclusiv corpul unei funcții `async` până la primul `await`), apoi microtask-urile, apoi următorul task (`setTimeout`).",
      "Microtask-urile sunt `.then`, `queueMicrotask` și continuarea de după `await`; rulează în ordinea în care au fost puse în coadă.",
      "Coada de microtask-uri se golește complet înainte să ruleze orice timer: și un microtask pus de alt microtask (`nested`) iese înaintea lui `setTimeout(…, 0)`.",
      "`setTimeout(fn, 0)` nu rulează „imediat”: e un task nou, care așteaptă golirea stack-ului și a microtask-urilor."
    ]
  },
  {
    id: "s-frontend-promisify", m: "frontend", g: "js", lang: "js",
    t: "promisify și async / await cu try / catch / finally",
    p: "Scrie `promisify(fn)` pentru funcții cu callback în stil Node (`(err, value) => …`, ultimul argument). Apoi `async load(read, path, log)`: citește cu `await read(path)`, face `JSON.parse`, la eroare aruncă o eroare nouă „citire eșuată: …” care păstrează cauza, și scrie în `log` șirul `gata <path>` indiferent de rezultat.",
    k: [
      "`promisify` întoarce o funcție care înfășoară apelul într-un `new Promise`; callback-ul stă ultimul în `fn(...args, cb)`, iar `err` merge la `reject`, valoarea la `resolve`.",
      "Fiecare cale ajunge la `resolve` sau la `reject`: altfel promisiunea rămâne pending pentru totdeauna. O excepție aruncată sincron în executor devine singură rejecție.",
      "`await` în `try` face din rejecție o excepție prinsă de `catch`, în același bloc cu `JSON.parse`, care aruncă sincron.",
      "`finally` rulează și la succes, și la eroare, și nu schimbă rezultatul. Eroarea nouă primește `{ cause: e }`, ca să nu pierzi originalul."
    ]
  },
  {
    id: "s-frontend-retry", m: "frontend", g: "js", lang: "js",
    t: "Retry cu backoff exponențial și timeout",
    p: "Scrie `retry(fn, { tries = 3, base = 100, timeout = 1000 })`. Fiecare încercare apelează `fn(signal)` cu un `AbortSignal.timeout(timeout)` nou. Dacă eșuează, așteaptă `base * 2 ** i` ms și reîncearcă; după ultima încercare aruncă ultima eroare.",
    k: [
      "Fiecare încercare primește propriul `AbortSignal.timeout(ms)` (la expirare semnalul se anulează cu `TimeoutError`); `fn` trebuie să-l dea mai departe (de pildă `fetch(url, { signal })`), altfel nu se oprește nimic. `Promise.race` cu un timer te eliberează din așteptare, dar lucrul continuă în fundal.",
      "Backoff exponențial: `base * 2 ** i` (100, 200, 400 ms). În producție adaugi și jitter, ca mai mulți clienți să nu reîncerce în același moment.",
      "Nu dormi după ultima încercare: `if (i < tries - 1)`, apoi `throw last`, adică ultima eroare originală, nu una nouă.",
      "`return await fn(...)` în `try`: fără `await`, promisiunea respinsă iese din funcție înainte să o prindă `catch`, deci retry-ul nu mai rulează."
    ]
  },
  {
    id: "s-frontend-debounce-throttle", m: "frontend", g: "js", lang: "js",
    t: "debounce și throttle",
    p: "Scrie `debounce(fn, ms)` (rulează `fn` o singură dată, la `ms` după ultimul apel, cu argumentele lui) și `throttle(fn, ms)` (rulează imediat, apoi cel mult o dată la `ms`; apelurile dintre ele se pierd).",
    k: [
      "`debounce`: fiecare apel face `clearTimeout` pe timerul precedent și pornește unul nou, deci `fn` rulează doar după `ms` de liniște, cu argumentele ULTIMULUI apel.",
      "Timerul (`let id`) stă în closure-ul fabricii: fiecare funcție întoarsă îl are pe al ei, deci două debounce-uri nu se încurcă.",
      "`throttle`: ține minte momentul ultimei rulări (`last`) și rulează doar dacă au trecut `ms`; `last` se schimbă doar când rulează, deci apelurile ignorate nu mută fereastra.",
      "Alegerea: `debounce` pentru „după ce s-a oprit” (căutare în timp ce tastezi, salvare automată), `throttle` pentru „cel mult o dată la” (scroll, resize)."
    ]
  },
  {
    id: "s-frontend-immutable-update", m: "frontend", g: "js", lang: "js",
    t: "Update imutabil imbricat: spread și structuredClone",
    p: "Pentru `state = { user, lists: [{ id, tasks: [{ id, done }] }] }` scrie `setDone(state, lid, id, done)`, care întoarce o stare nouă fără să schimbe originalul, și `snapshot(state)`, o copie profundă a stării.",
    k: [
      "Copiezi fiecare nivel de pe drumul spre valoare (`{ ...state, lists: … }`, `{ ...l, tasks: … }`, `{ ...t, done }`) și nu atingi originalul: fără `push`, `splice` sau `t.done = …`.",
      "Ce nu se schimbă se refolosește prin referință (`l.id !== lid ? l : …`), deci listele neatinse rămân `===` cu cele vechi, iar React poate sări peste ele.",
      "Spread-ul e copie superficială: `{ ...state }` e un obiect nou, dar `state.lists` e același array. De aceea copiezi nivel cu nivel.",
      "`structuredClone` face copie profundă (și `Date`, `Map`, `Set`, referințe circulare), dar aruncă `DataCloneError` pe funcții și pierde prototipul claselor. Pentru un update obișnuit e prea scump."
    ]
  },
  {
    id: "s-frontend-array-group", m: "frontend", g: "js", lang: "js",
    t: "filter, map, reduce și grupare",
    p: "Dintr-o listă de comenzi `{ user, total, paid }` scrie `paidByUser(orders)`: totalul comenzilor plătite pe utilizator, ca listă `{ user, total }` sortată descrescător. Apoi `byUser(orders)`, care grupează comenzile pe utilizator.",
    k: [
      "Pipeline fără mutarea intrării: `filter` (doar plătitele), `reduce` (însumare), apoi `entries`, `map` și `sort`. `sort` mută array-ul pe care e apelat, deci îl aplici pe unul nou (aici cel din `Object.entries`), nu pe `orders`.",
      "`reduce` primește mereu valoarea inițială (`{}`): fără ea, pe un array gol aruncă `TypeError`, iar primul element ar deveni acumulator.",
      "Comparatorul de `sort` e numeric, `b.total - a.total`; implicit `sort` compară ca șiruri (`[10, 9, 1].sort()` dă `[1, 10, 9]`).",
      "`Object.groupBy(items, fn)` întoarce un obiect cu prototip `null` și câte un array pe cheie. Există de la Node 21; pe un mediu mai vechi faci același lucru cu `reduce`."
    ]
  },
  {
    id: "s-frontend-map-set", m: "frontend", g: "js", lang: "js",
    t: "Map și Set: contor, deduplicare, intersecție",
    p: "Scrie `countWords(text)` (un `Map` cuvânt → număr, fără majuscule), `uniqueBy(items, key)` (prima apariție, în ordine, în O(n)) și `intersect(a, b)` (elementele comune, fără dubluri, în ordinea lui `a`).",
    k: [
      "`Map` pentru contor: `counts.set(w, (counts.get(w) ?? 0) + 1)` (citești cu `?? 0`, scrii înapoi). Spre deosebire de un obiect simplu, nu are chei moștenite (`constructor`, `toString`) și primește chei de orice tip; mărimea e `size`, nu `length`.",
      "`Set` pentru „l-am mai văzut?”: `has` și `add` sunt O(1) în medie. Cu un array și `includes` ar fi O(n) pe fiecare element, deci O(n²) în total.",
      "Cheile se compară prin identitate (SameValueZero): două obiecte cu același conținut sunt chei diferite, iar `NaN` e egal cu el însuși.",
      "`new Set(a)` deduplică păstrând ordinea inserării, iar `[...set]` îl aduce înapoi la array. Pentru intersecție faci un `Set` din `b` și filtrezi `a` cu `has`; Node 22 are și `a.intersection(b)`."
    ]
  },
  {
    id: "s-frontend-async-gen", m: "frontend", g: "js", lang: "js",
    t: "Generator async și for await peste un API paginat",
    p: "Scrie `pages(fetchPage)`, un generator async care cere pagină după pagină (`fetchPage(cursor)` întoarce `{ items, next }`, iar `next === null` la ultima) și cedează elementele pe rând. Apoi `collect(source, limit)`, care strânge elemente cu `for await` și se oprește la `limit`.",
    k: [
      "`async function*` cu `yield` / `yield*` produce valori pe rând; `yield* page.items` deleagă la elementele paginii curente. Generatorul e leneș: nu cere nimic până nu e consumat.",
      "`for await (const x of source)` consumă un async iterable și merge doar unde merge `await` (într-o funcție `async` sau într-un modul).",
      "`break` din `for await` apelează `return()` pe generator: execuția lui se oprește (și rulează blocurile `finally`), deci pagina următoare nu se mai cere.",
      "Paginarea cu `cursor` și `do…while`: prima cerere se face oricum, iar bucla se oprește când `next === null`. Cererile sunt secvențiale, fiindcă fiecare pagină depinde de cursorul precedentei."
    ]
  },
  {
    id: "s-frontend-es-class", m: "frontend", g: "js", lang: "js",
    t: "Clasă ES: #private, static și getter",
    p: "Scrie clasa `Account(owner)` cu soldul privat (`#balance`), un getter `balance` fără setter, `deposit(amount)` care respinge sumele ≤ 0 cu `RangeError` și întoarce `this`, și un contor static privat al conturilor create, expus prin `static get opened`.",
    k: [
      "`#balance` e privat de-adevăratelea: `acc.#balance` în afara clasei e `SyntaxError` la parsare, iar `Object.keys` și `JSON.stringify` nu-l văd. Convenția `_balance` n-ar proteja nimic.",
      "`get balance()` fără `set` face proprietatea read-only: în cod strict (module, clase) atribuirea `acc.balance = 1` aruncă `TypeError`; în cod sloppy e ignorată în tăcere.",
      "`static` aparține clasei, nu instanțelor: `Account.opened`, nu `acc.opened`. Câmpul `static #count` se accesează prin numele clasei (`Account.#count`), nu prin `this`, ca să nu se strice la subclase.",
      "Metoda validează înainte să schimbe starea (`!(amount > 0)` prinde și `NaN`), iar `return this` permite înlănțuirea: `acc.deposit(5).deposit(7)`."
    ]
  },
  {
    id: "s-frontend-esm", m: "frontend", g: "js", lang: "js",
    t: "Module ESM: named, default și import dinamic",
    p: "Scrie două fișiere. `util.mjs`: un contor exportat (`export let count`) cu `inc()`, o funcție numită `add` și un export default `mul`. `app.mjs`: importă default-ul și numele, apelează `inc()` și arată că `count` importat vede valoarea nouă, apoi `lazy()`, care încarcă `util.mjs` cu `import()`.",
    k: [
      "Exportul numit (`export const add`) se importă cu acolade și cu același nume (se redenumește cu `as`); default-ul e unul singur per modul și se importă cu orice nume. Pot sta în același import: `import mul, { add } from …`.",
      "Importurile sunt legături vii (live bindings), nu copii: după `inc()`, `count` din `app.mjs` e 1. Importatorul nu le poate reasigna (`count = 5` aruncă `TypeError`).",
      "`import()` dinamic întoarce o promisiune cu obiectul namespace al modulului, iar default-ul e `m.default`. Îl folosești pentru încărcare la cerere (lazy loading) și acolo unde `import` static nu e permis (în funcții, condiționat).",
      "Modulul se execută o singură dată și e ținut în cache: importurile statice și dinamice ale aceluiași fișier văd aceeași stare. În Node, calea relativă are extensia (`./util.mjs`), iar fișierul e `.mjs` sau pachetul are `\"type\": \"module\"`."
    ]
  },
  {
    id: "s-frontend-union-never", m: "frontend", g: "ts", lang: "ts",
    t: "Union discriminat și switch exhaustiv cu never",
    p: "Modelează rezultatul unei cereri ca union discriminat de `status`: `loading`, `ok` (cu `data: string[]`) și `error` (cu `message`). Scrie `label(r)` cu un `switch` exhaustiv, astfel încât un caz nou în union să nu compileze până nu primește ramura lui.",
    k: [
      "Uniunea e discriminată de un câmp literal comun (`status`), nu de câmpuri opționale; în fiecare `case` tipul se îngustează (`r.data` există doar la `ok`).",
      "`default` apelează `assertNever(r)`, iar parametrul ei are tipul `never`: după ce toate cazurile sunt tratate, `r` nu mai poate avea alt tip.",
      "Un caz nou în union face `r` ne-`never` în `default`, deci eroarea apare la compilare, nu în producție.",
      "`assertNever` aruncă și la runtime (date din afara tipului, de pildă un JSON) și întoarce `never`, deci funcția nu are nevoie de alt `return`."
    ]
  },
  // ---- python (tichetul 05) ----
  {
    id: "s-python-gen-pipeline", m: "python", lang: "py",
    t: "Pipeline de generatori pe un fișier",
    p: "Scrie `read_lines(path)` (generator care citește fișierul linie cu linie, fără newline la capăt), `grep(lines, word)` și `head(lines, n)`, apoi `first_matches(path, word, n)` care le înlănțuie. Memoria rămâne constantă pentru orice fișier.",
    k: [
      "Fiecare etapă primește un iterabil și produce unul (generator sau generator expression), deci nimic nu se citește până nu consumi rezultatul. Greșeala tipică: `readlines()` sau `[... for ...]`, care încarcă tot în memorie.",
      "`with open(...)` stă ÎN generator: fișierul se deschide la prima linie cerută și se închide la epuizare sau la `close()` (`GeneratorExit` iese din `with`).",
      "Oprirea timpurie se face cu `itertools.islice(lines, n)`, nu cu `list(lines)[:n]`: după al n-lea rezultat sursa nu mai e citită.",
      "Generatorul e de unică folosință: al doilea parcurs al aceluiași pipeline e gol; pentru o nouă trecere îl refaci."
    ]
  },
  {
    id: "s-python-gen-send", m: "python", lang: "py",
    t: "Generator cu send și yield from",
    p: "Scrie `averager()`, un generator care primește numere prin `send` și, la `None`, se termină cu `return` media. Apoi `collector(results)`, care cu `yield from averager()` adună în listă media fiecărei grupe, una după alta.",
    k: [
      "Generatorul se pornește cu `next(gen)` (sau `send(None)`); `send(valoare)` pe unul neînceput ridică `TypeError`.",
      "`x = yield` primește valoarea trimisă cu `send`, iar un sentinel (`None`) marchează sfârșitul grupei.",
      "Sub-generatorul se încheie cu `return medie`, iar expresia `yield from averager()` are exact acea valoare (din `StopIteration.value`); nu prinzi tu `StopIteration`.",
      "Delegatorul stă într-un `while True`: după fiecare grupă pornește un sub-generator nou, iar `send`-urile următoare ajung direct la el."
    ]
  },
  {
    id: "s-python-decorator", m: "python", lang: "py",
    t: "Decorator cu parametri și wraps",
    p: "Scrie `@limit_calls(n)`: funcția decorată se poate apela de cel mult `n` ori, apoi ridică `RuntimeError`. Trebuie să-i păstrezi numele și docstring-ul, să transmiți argumentele și să întorci rezultatul.",
    k: [
      "Trei niveluri: `limit_calls(n)` (fabrica) întoarce `decorator(func)`, care întoarce `wrapper`. Greșeala tipică: `@limit_calls` fără paranteze, care îi dă funcția drept `n`.",
      "`@functools.wraps(func)` pe wrapper copiază `__name__` și `__doc__` și adaugă `__wrapped__`; fără el, funcția decorată se numește `wrapper`.",
      "Wrapper-ul primește `*args, **kwargs` și face `return func(*args, **kwargs)`; fără `return`, funcția decorată întoarce mereu `None`.",
      "Contorul stă în closure (`nonlocal used`), creat în `decorator`, deci e separat pe fiecare funcție decorată, nu global."
    ]
  },
  {
    id: "s-python-ctx", m: "python", lang: "py",
    t: "Context manager: clasă și @contextmanager",
    p: "Scrie același context manager în două feluri: clasa `Managed(log)` cu `__enter__` / `__exit__` și generatorul `managed(log)` cu `@contextmanager`. Ambele adaugă `open` în listă la intrare și `close` la ieșire, chiar dacă blocul `with` ridică o excepție, și lasă excepția să se propage.",
    k: [
      "`__exit__(self, exc_type, exc, tb)` rulează și când blocul ridică o excepție, iar `__enter__` întoarce obiectul legat de `as`.",
      "`__exit__` întoarce `False` sau `None`, ca excepția să se propage; un `True` o înghite în tăcere. Greșeala tipică: `return True` pus din reflex.",
      "La `@contextmanager`: exact un `yield`, iar valoarea lui ajunge în `as`.",
      "`yield` stă într-un `try/finally`: excepția din bloc e re-ridicată în generator chiar la `yield`, iar fără `finally` curățarea nu mai rulează."
    ]
  },
  {
    id: "s-python-iter", m: "python", lang: "py",
    t: "Iterator propriu: __iter__ și __next__",
    p: "Scrie `Countdown(start)`, un iterabil care dă `start, start-1, … 1` și se poate parcurge de mai multe ori, cu o clasă separată pentru iterator. Iteratorul are `__iter__` și `__next__`; fără generatori.",
    k: [
      "Iteratorul are `__iter__` (întoarce `self`) și `__next__` (întoarce valoarea următoare); starea parcurgerii stă în el, nu în container.",
      "Sfârșitul se semnalează cu `raise StopIteration` (nu `return None`, nu `IndexError`), iar după epuizare `__next__` continuă să ridice `StopIteration`.",
      "`__iter__` al iterabilului întoarce un iterator NOU la fiecare apel; dacă întoarce `self`, al doilea `for` pe același obiect iese gol.",
      "Doi iteratori creați din același iterabil merg independent unul de altul."
    ]
  },
  {
    id: "s-python-collections", m: "python", lang: "py",
    t: "Counter, defaultdict, deque, heapq.nlargest",
    p: "Scrie patru funcții mici din `collections` și `heapq`: `top_words(words, k)` (cele mai frecvente k cuvinte), `group_by_len(words)` (cuvintele grupate după lungime), `last_n(items, n)` (ultimele n dintr-un flux) și `biggest(scores, k)` (primele k perechi după valoare).",
    k: [
      "`Counter(words).most_common(k)` numără și ordonează descrescător; la egalitate păstrează ordinea primei apariții. Nu sorta de mână un dict de frecvențe.",
      "`defaultdict(list)` creează valoarea doar la `d[key]` (prin `__missing__`); `d.get(key)` și `key in d` nu o creează.",
      "`deque(maxlen=n)` aruncă singur cel mai vechi element, deci ții doar ultimele n dintr-un flux; cu o listă și `pop(0)` fiecare scoatere costă O(n).",
      "`heapq.nlargest(k, iterabil, key=...)` întoarce lista descrescător după `key`; merge bine pentru k mic, iar pentru k mare e mai eficient `sorted(...)` (pentru k = 1, `max()`)."
    ]
  },
  // ---- oop (tichetul 05) ----
  {
    id: "s-oop-value", m: "oop", lang: "py",
    t: "Value object: __eq__, __hash__ și frozen dataclass",
    p: "Scrie un value object în două feluri: clasa `Tag(name)` cu `name` doar în citire și `__eq__` / `__hash__` scrise de mână, apoi `Money(amount, currency)` ca `dataclass(frozen=True)`. Obiectele egale trebuie să intre o singură dată într-un `set`.",
    k: [
      "`__eq__` și `__hash__` merg împreună și folosesc aceleași câmpuri: obiectele egale au același hash (`hash(self.name)` sau `hash((a, b))`).",
      "Greșeala tipică: `__eq__` fără `__hash__` face clasa nehashable (`__hash__` devine `None`), deci nu intră în `set` și nu e cheie de `dict`.",
      "`__eq__` întoarce `NotImplemented` pentru alt tip, nu `False` și nu `AttributeError`; Python încearcă atunci operandul invers.",
      "Value object-ul e imuabil (`name` doar prin `@property`); `@dataclass(frozen=True)` generează `__eq__` + `__hash__` și blochează atribuirea (`FrozenInstanceError`). Fără `frozen`, `eq=True` pune `__hash__ = None`."
    ]
  },
  {
    id: "s-oop-property", m: "oop", lang: "py",
    t: "property cu validare și classmethod from_dict",
    p: "Scrie `Product(name, price)` cu `price` ca `@property`: setter-ul respinge valorile negative cu `ValueError`, iar validarea rulează și în constructor. Adaugă `Product.from_dict(data)` ca constructor alternativ.",
    k: [
      "`__init__` atribuie `self.price = price` (deci prin setter), nu `self._price`; altfel un preț negativ trece la construcție. Greșeala tipică.",
      "Getter-ul și setter-ul au același nume (`@price.setter`) și țin valoarea în `_price`; dacă setter-ul ar atribui `self.price`, s-ar apela la nesfârșit (`RecursionError`).",
      "Setter-ul validează înainte să atribuie și ridică `ValueError`; după o valoare respinsă, cea veche rămâne.",
      "`from_dict` e `@classmethod` și construiește cu `cls(...)`, nu cu `Product(...)`: o subclasă primește o instanță de subclasă."
    ]
  },
  {
    id: "s-oop-abc-protocol", m: "oop", lang: "py",
    t: "ABC vs Protocol",
    p: "Scrie interfața `Storage` ca `ABC` cu `save` abstractă și implementarea `MemoryStorage`. Apoi `Notifier` ca `Protocol` cu `send`, clasa `MemoryNotifier` care îl satisface fără moștenire și funcția `alert(notifier, msg)`.",
    k: [
      "`ABC` + `@abstractmethod`: o clasă cu metode abstracte neimplementate nu se instanțiază (`TypeError`), nici ABC-ul însuși, nici o subclasă incompletă.",
      "ABC e subtipare nominală (moștenești explicit); `Protocol` e structurală: orice clasă cu metoda `send` se potrivește, fără `Notifier` în bază.",
      "`isinstance(x, Notifier)` cere `@runtime_checkable`; fără el ridică `TypeError`. Și cu el verifică doar că metoda există, nu semnătura.",
      "Alegerea: ABC când vrei impunere la instanțiere sau cod comun în bază; Protocol când tipezi cod existent sau vrei duck typing verificat static."
    ]
  },
  {
    id: "s-oop-composition", m: "oop", lang: "py",
    t: "Compoziție cu dependență injectată și fake",
    p: "Scrie `Signup(mailer)` cu `register(email)`, care respinge un email fără `@` (`ValueError`) și trimite un mail de salut prin `mailer.send(to, text)`. Apoi un `FakeMailer` care înregistrează apelurile și un test care îl folosește.",
    k: [
      "Dependența vine prin `__init__` (`self.mailer = mailer`), nu e creată în clasă; un `Mailer()` în `__init__` leagă clasa de implementarea reală și face testul lent sau imposibil.",
      "`Signup` știe doar de metoda `send`, deci merge orice obiect care o are (fake, mock, client real). Compoziție („are un”), nu moștenire („este un”).",
      "Fake-ul e o clasă mică, scrisă de mână, care înregistrează apelurile într-o listă (`sent`); testul verifică ce s-a trimis, nu cum e scris `Signup`.",
      "Un email invalid ridică `ValueError` înainte de orice trimitere, deci fake-ul rămâne gol."
    ]
  },
  {
    id: "s-oop-super", m: "oop", lang: "py",
    t: "super() cooperativ în moștenire multiplă",
    p: "Scrie un diamant: `Base.hello()` întoarce `['Base']`, iar `Left(Base)`, `Right(Base)` și `Child(Left, Right)` adaugă fiecare numele lor în față și cheamă mai departe cu `super()`. `Child().hello()` trebuie să treacă prin fiecare clasă exact o dată.",
    k: [
      "`super()` urmează MRO-ul instanței (`Child.__mro__`: Child, Left, Right, Base), nu clasa părinte scrisă în cod: în `Left`, `super()` ajunge la `Right` când obiectul e un `Child`.",
      "Fiecare clasă cheamă `super().hello()`. Greșeala tipică: `Base.hello(self)` direct, care sare peste `Right` și rupe lanțul.",
      "Ordinea bazelor contează: `class Child(Left, Right)` pune `Left` înaintea lui `Right`; inversate, se inversează și MRO-ul.",
      "`Base` e capătul lanțului: întoarce valoarea de bază și nu mai cheamă `super()`, deci rulează o singură dată."
    ]
  },
  {
    id: "s-oop-container", m: "oop", lang: "py",
    t: "Container: __len__, __getitem__, __iter__, __contains__",
    p: "Scrie `Playlist(songs=())`, un container peste o listă internă, care merge cu `len()`, indexare (inclusiv negativă și felii), `for` și `in`.",
    k: [
      "`__len__` dă `len()` și, fără `__bool__`, face un container gol să fie fals în `if playlist:`.",
      "`__getitem__` delegă la listă: acceptă index negativ și felii, iar un index în afara limitelor ridică `IndexError` (pe el se sprijină și protocolul vechi de iterare).",
      "`__iter__` întoarce un iterator NOU (`iter(self._songs)`), nu `self`: containerul se poate parcurge de mai multe ori.",
      "`__contains__` e opțional: fără el, `in` cade pe `__iter__` și apoi pe `__getitem__` (căutare liniară); îl scrii când ai o structură mai rapidă (de pildă un `set`)."
    ]
  },
  // ----- pytest (6) -----
  {
    id: "s-pytest-fixture", m: "pytest", lang: "py",
    t: "Fixture cu yield, scope și conftest.py",
    p: "Scrie în `conftest.py` un fixture `conn` cu scope `module`, care deschide o conexiune SQLite în memorie, creează tabela `t (x int)` și o închide la final. Adaugă un fixture `db` (scope `function`) care dă aceeași conexiune și face `rollback()` după fiecare test. Apoi un test care inserează un rând prin `db` și verifică `count(*)`.",
    k: [
      "`yield`, nu `return`: ce e după `yield` e teardown-ul și rulează și când testul pică (aici `close()`). Cu `return`, conexiunea rămâne deschisă.",
      "Scope-ul îl alegi după costul setup-ului: `module` pentru o conexiune scumpă, `function` (implicit) pentru ce trebuie nou la fiecare test.",
      "Cu scope mare, testele împart starea. Izolezi cu un fixture `function` deasupra (aici `db` face `rollback()`), nu coborând scope-ul conexiunii.",
      "Fixture-ul comun stă în `conftest.py`, iar testele îl cer după nume, ca argument. Fără `import`."
    ]
  },
  {
    id: "s-pytest-parametrize", m: "pytest", lang: "py",
    t: "Parametrize cu ids",
    p: "Scrie `slugify(text)` (`\"A B\"` → `\"a-b\"`: litere mici, un grup de caractere non-alfanumerice devine un singur `-`, fără `-` la capete) și un singur test `parametrize` cu trei cazuri: două cuvinte, spații multiple și șirul gol. Fiecare caz are un `id` citibil.",
    k: [
      "Numele argumentelor sunt într-un singur string, separate prin virgulă (`\"text, expected\"`), iar fiecare caz e un tuplu în aceeași ordine.",
      "`param(..., id=\"gol\")` dă fiecărui caz un nume în raport (`test_slugify[gol]`). Fără `id`, numele iese din valori și nu spune ce testează cazul.",
      "Cazurile limită sunt rânduri în listă, nu o buclă `for` în test: fiecare caz e un test separat, iar unul care pică nu le oprește pe celelalte.",
      "`expected` e un literal scris de mână, nu rezultatul funcției testate: altfel testul e tautologic și nu pică niciodată."
    ]
  },
  {
    id: "s-pytest-raises", m: "pytest", lang: "py",
    t: "raises cu match",
    p: "Scrie `parse_port(text)`: ridică `ValueError(\"nu e număr\")` dacă textul nu are doar cifre și `ValueError` pentru un port în afara 1–65535; altfel întoarce portul ca `int`. Două teste: unul cu `pytest.raises(ValueError, match=...)`, unul care păstrează excepția (`as ei`) și îi verifică mesajul.",
    k: [
      "`raises` e context manager, iar în `with` pui doar linia care trebuie să arunce. Cu mai multe linii, orice `ValueError` din ele face testul să treacă.",
      "Tipul cât mai precis (`ValueError`, nu `Exception`): un tip larg prinde și bug-uri care nu te interesează.",
      "`match` e un regex căutat în `str(excepție)` cu `re.search`: un fragment ajunge, iar caracterele speciale (`.`, `(`) le escapezi cu `re.escape`.",
      "Excepția o verifici după `with` (`ei.value`), nu în interior: codul din `with` de după linia care aruncă nu mai rulează niciodată."
    ]
  },
  {
    id: "s-pytest-monkeypatch", m: "pytest", lang: "py",
    t: "monkeypatch pe mediu și atribut",
    p: "Ai `api_url()` (citește `API_HOST` din mediu, implicit `\"local\"`) și `attempts()` (`Cfg.tries + 1`). Scrie trei teste cu `monkeypatch`: variabila setată, variabila ștearsă și atributul `Cfg.tries` schimbat la 0. Niciun test nu lasă urme în următoarele.",
    k: [
      "`monkeypatch` anulează singur tot ce a schimbat, la finalul testului. O atribuire directă (`os.environ[...] = ...`, `Cfg.tries = 0`) rămâne și strică testele următoare.",
      "Pentru mediu: `setenv` și `delenv(nume, raising=False)`. Fără `raising=False`, `delenv` pe o variabilă care lipsește dă `KeyError`, iar testul depinde de mașina pe care rulează.",
      "`setattr(obiect, \"nume\", valoare)` schimbă atributul pe obiectul pe care îl citește codul testat (aici clasa `Cfg`).",
      "Fiecare test își setează singur tot ce citește (aici `API_HOST`) și nu presupune nimic despre mediul mașinii."
    ]
  },
  {
    id: "s-pytest-patch", m: "pytest", lang: "py",
    t: "patch acolo unde e folosit, cu autospec",
    p: "`svc.py` face `from client import get_user`, iar `greeting(uid)` întoarce `\"Salut, \"` + numele. `client.get_user` face rețea și nu-l scrii tu. Scrie două teste cu `@patch`: unul cu `return_value`, care verifică și apelul (`assert_called_once_with`), și unul cu `side_effect = TimeoutError`.",
    k: [
      "Patch-uiești numele acolo unde e căutat: `\"svc.get_user\"`, nu `\"client.get_user\"`. După `from client import get_user`, `svc` are propria referință, iar patch-ul pe `client` nu o schimbă.",
      "`autospec=True` copiază semnătura funcției reale: un apel cu argumente greșite pică cu `TypeError` în test, nu rămâne ascuns într-un mock care primește orice.",
      "`return_value` pentru succes, `side_effect = Excepție` pentru eșec (clasa sau instanța se ridică la apel; o listă dă valorile pe rând).",
      "Verifici și apelul (`assert_called_once_with(7)`), nu doar rezultatul: așa prinzi un argument greșit sau un apel în plus."
    ]
  },
  {
    id: "s-pytest-tmp-caplog", m: "pytest", lang: "py",
    t: "tmp_path și caplog",
    p: "Scrie `read_config(path)`: citește linii `cheie=valoare` într-un dict (cu `strip`), loghează `WARNING` pentru o linie fără `=` și `INFO` cu numărul de chei citite. Un test cu `tmp_path` și `caplog` verifică dict-ul și mesajele exacte.",
    k: [
      "`tmp_path` e un `Path` nou pentru fiecare test: scrii fișierul acolo, nu într-un nume fix (`/tmp/app.cfg`, directorul curent) care se amestecă între teste.",
      "Dai funcției un fișier real din `tmp_path`, nu mock-uiești `open()`: testezi și citirea.",
      "Pentru mesaje sub `WARNING` (aici `INFO`) ai nevoie de `caplog.at_level(logging.INFO)`; implicit pytest prinde doar `WARNING` și peste.",
      "Verifici `caplog.messages` (sau `records`: nivel și text), nu `capsys`: log-urile se prind din logger, nu din stdout."
    ]
  },
  // ----- asgi (5) -----
  {
    id: "s-asgi-endpoint", m: "asgi", lang: "py",
    t: "Endpoint cu model Pydantic și response_model",
    p: "`POST /users` primește `{email, password}` (`email` minim 3 caractere, `password` minim 8), întoarce 201 cu `{id, email}`, fără parolă. `GET /users/{uid}` întoarce utilizatorul sau 404 cu `user inexistent`. Stocarea e un `dict` global.",
    k: [
      "Corpul vine ca model Pydantic (`body: UserIn`): validarea și răspunsul `422` vin de la FastAPI. Nu parsezi `dict`-uri de mână.",
      "Două modele, unul pentru intrare și unul pentru ieșire: `response_model=UserOut` taie ce nu e în el. Fără el, `password` ajunge în răspuns.",
      "`status_code=201` pe decorator pentru creare. Fără el, răspunsul e `200`.",
      "Lipsa o semnalezi cu `raise HTTPException(404, ...)`, nu cu un `return` cu mesaj de eroare și status 200. `{uid}` cu tipul `int` se validează singur: `abc` dă 422."
    ]
  },
  {
    id: "s-asgi-depends-yield", m: "asgi", lang: "py",
    t: "Dependență cu yield pentru sesiune",
    p: "`SessionLocal()` (un sessionmaker SQLAlchemy) există deja. Scrie dependența `get_session` și un `POST /notes?text=...` care adaugă textul în sesiune și face `commit()`. Sesiunea se închide mereu; la o eroare faci `rollback()`, iar eroarea ajunge mai departe.",
    k: [
      "`yield` în dependență: ce e înainte e setup, ce e după e cleanup. `close()` stă în `finally`, ca să ruleze și când endpoint-ul aruncă.",
      "Excepția din endpoint ajunge în dependență, la `yield`: faci `rollback()` și `raise` mai departe. Fără `raise` o înghiți și FastAPI nu mai știe de ea (500, fără urmă în loguri).",
      "Endpoint-ul cere sesiunea cu `Depends(get_session)`, fără paranteze: dai funcția, iar FastAPI o apelează la fiecare request.",
      "`commit()` rămâne în endpoint, nu după `yield`: din FastAPI 0.118 codul de după `yield` rulează după ce răspunsul a plecat, deci o eroare de commit nu mai ajunge la client."
    ]
  },
  {
    id: "s-asgi-override", m: "asgi", lang: "py",
    t: "TestClient cu dependency_overrides",
    p: "`GET /count` depinde de `get_db()`, care în producție ridică `RuntimeError`. Scrie un fixture `client` care înlocuiește `get_db` cu o funcție ce întoarce `[1, 2]`, dă un `TestClient` și curăță înlocuirile la final. Un test verifică statusul și JSON-ul.",
    k: [
      "Cheia din `app.dependency_overrides` e funcția originală (`get_db`, obiectul, nu numele ca string), iar valoarea e funcția care o înlocuiește.",
      "Override-ul e global pe `app`: îl cureți cu `clear()` după `yield`, în fixture. Altfel scurge în testele următoare.",
      "`TestClient(app)` apelează aplicația în proces, fără server și fără port, iar testul e un `def` obișnuit, nu `async`.",
      "Verifici contractul HTTP (`status_code`, `json()`), nu funcția endpoint-ului apelată direct."
    ]
  },
  {
    id: "s-asgi-lifespan", m: "asgi", lang: "py",
    t: "lifespan: startup și shutdown",
    p: "La pornire pui în `app.state.pool` o listă cu un element; la oprire o golești. `GET /pool` întoarce `{\"n\": numărul de elemente}`. Un test pornește aplicația cu lifespan-ul, verifică răspunsul și apoi că pool-ul e gol după oprire.",
    k: [
      "`@asynccontextmanager` cu un singur `yield`: ce e înainte rulează la startup, ce e după, la shutdown. Îl dai cu `FastAPI(lifespan=lifespan)`.",
      "Resursele partajate le pui în `app.state` și le citești din `request.app.state`, nu în variabile globale create la import.",
      "Cu `lifespan` dat, handler-ele `@app.on_event(\"startup\")` nu mai sunt apelate, iar `on_event` e deprecated: folosești doar `lifespan`.",
      "În test, `with TestClient(app) as client:` pornește startup și shutdown. Fără `with`, lifespan-ul nu rulează și `app.state.pool` nu există (`AttributeError`)."
    ]
  },
  {
    id: "s-asgi-async-def", m: "asgi", lang: "py",
    t: "async def sau def: cod blocant pus corect",
    p: "Ai `blocking_io()` (un `time.sleep(0.2)`, ca un client sincron). Expune-l pe două endpoint-uri, `GET /sync` (`def`) și `GET /async` (`async def`), fără să blochezi event loop-ul în niciunul. Cinci cereri deodată trebuie să dureze ~0,2 s, nu 1 s.",
    k: [
      "Un endpoint `def` rulează într-un threadpool (AnyIO, 40 de thread-uri implicit): cod blocant (client sincron, SQLAlchemy sync, `time.sleep`) merge aici fără să blocheze serverul.",
      "Un endpoint `async def` rulează chiar pe event loop. Un apel blocant direct în el îngheață toate cererile, nu doar pe a ta.",
      "Cod blocant într-un `async def`: `await asyncio.to_thread(f)` (sau `run_in_threadpool`), ori varianta async a bibliotecii.",
      "Dacă faci I/O și nu ai pe ce să dai `await`, scrie `def`: un `async def` fără `await` peste cod blocant doar blochează loop-ul."
    ]
  },
  {
    id: "s-celery-retry", m: "celery", lang: "py",
    t: "Task Celery cu retry, backoff și idempotență",
    p: "Scrie un task Celery `send_mail(key, to, body)` care trimite un email cu `deliver(to, body)` (poate arunca `ConnectionError`). Reîncearcă singur doar pe `ConnectionError`, de cel mult 5 ori, cu backoff exponențial și jitter. O a doua rulare cu aceeași `key` nu trimite emailul încă o dată.",
    k: [
      "`autoretry_for` primește doar erori tranzitorii (`ConnectionError`), nu `Exception`, iar `max_retries` oprește bucla (implicit 3, aici 5). Altfel un `ValueError` s-ar reîncerca degeaba.",
      "`retry_backoff=True` dă întârzieri de 1, 2, 4, 8 s…, plafonate de `retry_backoff_max` (implicit 600 s). `retry_jitter` (implicit `True`) le împrăștie, ca reîncercările să nu lovească serviciul deodată.",
      "Task-ul e idempotent: verifici `key` la început și o marchezi abia după efect. Marcată înainte, o cădere în `deliver` ar pierde emailul. Fără cheie, o reîncercare l-ar trimite de două ori.",
      "`acks_late=True` merge doar cu un task idempotent: mesajul se confirmă după rulare, deci un worker care cade îl primește din nou. Implicit, mesajul se confirmă înainte de rulare."
    ]
  },
  {
    id: "s-celery-canvas", m: "celery", lang: "py",
    t: "Lanț și grup de task-uri Celery",
    p: "Scrie trei task-uri Celery: `fetch(url)`, `parse(page)` și `store(n, url)`. Apoi `one(url)`, care le leagă într-un lanț, și `many(urls)`, care rulează în paralel lanțurile mai multor URL-uri.",
    k: [
      "`chain(a.s(), b.s(), …)` pasează rezultatul unui pas ca PRIMUL argument al următorului. Argumentele din `.s(...)` vin după el (`store(n, url)`), nu înainte.",
      "Pașii sunt semnături (`fetch.s(url)`), nu apeluri: nimic nu rulează până nu pornești lanțul cu `.delay()` sau `.apply_async()`.",
      "`group(...)` rulează semnături independente în paralel. Rezultatul e lista lor în ordinea intrării, nu a terminării.",
      "Un task nu așteaptă alt task cu `.delay().get()`: blochează worker-ul și poate bloca tot pool-ul (deadlock). Compui pașii cu `chain` și `group`.",
      "Corpul fiecărui task se testează apelat direct, ca o funcție obișnuită. Modul eager (`.apply()`) arată doar că pașii sunt legați bine, fiindcă emulează un worker."
    ]
  },
  {
    id: "s-security-sql", m: "security", lang: "py",
    t: "Query parametrizat, fără f-string",
    p: "Scrie `find_users(db, name, sort=\"id\")`, care caută utilizatorii după nume într-o conexiune `sqlite3` și îi ordonează după coloana `sort`. Numele vine de la utilizator, deci nu are voie să schimbe query-ul. `sort` e acceptat doar dacă e `id` sau `name`.",
    k: [
      "Valoarea merge printr-un placeholder (`?` la `sqlite3`, `%s` la `psycopg`) și un tuplu de parametri, niciodată printr-un f-string, `%` sau `+` pe textul SQL.",
      "Driverul trimite SQL-ul și valorile separat: `x' OR '1'='1` rămâne un text de comparat, nu sintaxă SQL, deci query-ul nu se schimbă.",
      "Un nume de coloană sau de tabel nu se poate parametriza. Îl verifici într-o listă albă (`SORT`) și abia apoi îl alipești; nu încerci să-l „escapezi”.",
      "Tuplul are virgulă: `(name,)`, nu `(name)`. Fără ea, driverul primește un șir și îl tratează ca pe o secvență de parametri."
    ]
  },
  {
    id: "s-security-pw", m: "security", lang: "py",
    t: "Hash de parolă cu salt și compare_digest",
    p: "Scrie `hash_pw(pw)` și `check_pw(pw, stored)`, doar cu biblioteca standard. Valoarea stocată conține costul, salt-ul și hash-ul. Verificarea nu scurge informații prin timpul de execuție.",
    k: [
      "Hash lent, derivat din parolă: `hashlib.pbkdf2_hmac` cu `sha256` și cel puțin 600 000 de iterații (OWASP), nu `sha256(pw)`, care se sparge rapid prin forță brută. Argon2id e prima alegere, dacă ai biblioteca.",
      "Salt aleator, unic la fiecare parolă (`os.urandom(16)`), păstrat lângă hash. Aceeași parolă dă hash-uri diferite, deci tabelele precalculate (rainbow tables) nu ajută.",
      "Compari cu `hmac.compare_digest`, nu cu `==`: timpul comparației nu depinde de poziția primei diferențe.",
      "Costul și salt-ul stau în valoarea stocată (`n$salt$hash`): verifici parolele vechi cu costul lor și poți crește costul mai târziu. Parola în clar nu se stochează și nu se loghează."
    ]
  },
  {
    id: "s-security-jwt", m: "security", lang: "py",
    t: "Verificare JWT cu algorithms, aud și exp",
    p: "Scrie `verify(token, key)`, care validează cu PyJWT un token HS256 primit de API-ul `api`, și `user_id(token, key)`, care întoarce `sub` sau `None` pentru orice token invalid.",
    k: [
      "`algorithms=[\"HS256\"]` explicit: serverul alege algoritmul, nu antetul tokenului. Lista respinge `alg: none` și orice alt algoritm; la RS256 previne și confuzia în care atacatorul semnează cu HS256, folosind cheia publică drept secret.",
      "`audience=` verifică `aud`: un token emis pentru alt serviciu e respins cu `InvalidAudienceError`, chiar dacă semnătura e bună.",
      "PyJWT verifică `exp` doar dacă tokenul îl are. `options={\"require\": [...]}` face `exp`, `aud` și `sub` obligatorii, altfel un token fără `exp` ar fi valid pentru totdeauna.",
      "Erorile se prind cu `jwt.InvalidTokenError` (baza tuturor) și devin 401. Nu folosești `verify_signature=False`, iar cheia vine din configurare, nu din cod."
    ]
  },
  {
    id: "s-runtime-slots", m: "runtime", lang: "py",
    t: "Memorie: __slots__ și generator",
    p: "Compară memoria a două clase cu aceleași atribute `x` și `y`: `Plain` (obișnuită) și `Slim` (cu `__slots__`). Scrie `size(obj)` cu `sys.getsizeof`, apoi `squares(n)`, un generator de pătrate care nu ține lista în memorie.",
    k: [
      "`__slots__ = (\"x\", \"y\")` declară atributele și elimină `__dict__` din instanță: mai puțină memorie la milioane de obiecte (din 3.11 câștigul e mai mic). Un atribut nedeclarat dă `AttributeError`.",
      "`sys.getsizeof` e superficial: măsoară doar obiectul, nu ce referă. La o instanță cu `__dict__` îl adaugi tu, iar la o listă nu intră elementele. Memoria reală a unui grup de obiecte o măsori cu `tracemalloc`.",
      "Generatorul (`yield`) produce un element pe rând, deci are aceeași mărime oricât de mare e `n`. Lista `[i * i for …]` ține toate elementele în memorie.",
      "Generatorul se consumă o singură dată: a doua trecere peste el e goală."
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
  },
  {
    id: "s-docker-multistage", m: "docker", lang: "docker", st: true,
    t: "Dockerfile multi-stage, non-root",
    p: "Scrie un `Dockerfile` pentru o aplicație FastAPI (`requirements.txt`, `main.py`) cu două etape: una care instalează dependențele și una de rulare. Imaginea finală rulează ca utilizator non-root și pornește `uvicorn`.",
    k: [
      "Etape numite (`FROM … AS build`, `FROM … AS runtime`); etapa finală ia doar rezultatul, cu `COPY --from=build`, deci uneltele de build nu ajung în imagine.",
      "`USER` non-root în etapa finală, cu utilizatorul creat mai devreme (`useradd`) și pus înaintea lui `CMD`.",
      "Ordinea pentru cache: `COPY requirements.txt` și `pip install` vin înaintea lui `COPY . .`, ca dependențele să nu se reinstaleze la fiecare schimbare de cod.",
      "`CMD` în forma exec (listă JSON): procesul primește SIGTERM de la `docker stop`. Imaginile de bază au tag fixat, nu `latest`."
    ]
  },
  {
    id: "s-docker-compose", m: "docker", lang: "yaml", st: true,
    t: "Compose cu healthcheck și depends_on",
    p: "Scrie un `compose.yaml` cu două servicii: `db` (Postgres 16, cu volum pentru date) și `api` (construit din `Dockerfile`-ul curent, port 8000). `api` pornește abia când `db` poate primi conexiuni și se conectează la ea prin variabila `DB_URL`.",
    k: [
      "`healthcheck` pe `db`: `test` cu `pg_isready`, plus `interval`, `timeout` și `retries`.",
      "`depends_on` în forma lungă, cu `condition: service_healthy`. Forma scurtă așteaptă doar pornirea containerului, nu starea lui sănătoasă.",
      "`api` ajunge la bază prin numele serviciului (`@db`), nu prin `localhost`: în container, `localhost` e containerul însuși.",
      "Datele stau într-un volum numit, declarat în `volumes:` de sus. Porturile sunt între ghilimele (`\"8000:8000\"`), iar imaginile au tag fixat."
    ]
  },
  {
    id: "s-ops-json-log", m: "ops", lang: "py",
    t: "Logging structurat: JSON cu extra",
    p: "Scrie un `JsonFormatter` pentru `logging`: fiecare eveniment e un obiect JSON pe o singură linie, cu `level`, `logger`, `msg` și câmpurile trimise prin `extra=`; o excepție intră în câmpul `exc`. Montează-l pe un `StreamHandler` al logger-ului `app`.",
    k: [
      "`format(record)` întoarce `json.dumps(...)`: un obiect JSON pe linie, pe care un agregator îl parsează direct.",
      "Mesajul vine din `record.getMessage()` (aplică argumentele `%`), nu din `record.msg`.",
      "Câmpurile din `extra=` sunt atribute ale `LogRecord`: le iei pe cele care nu sunt în `vars(logging.makeLogRecord({}))` (plus `message` și `asctime`). `default=str` împiedică un tip neserializabil să strice linia.",
      "Excepția intră în câmp prin `self.formatException(record.exc_info)`, ca un traceback pe mai multe rânduri să nu spargă linia unică."
    ]
  },
  {
    id: "s-ops-gitlab-ci", m: "ops", lang: "yaml", st: true,
    t: ".gitlab-ci.yml minim: test și build",
    p: "Scrie un `.gitlab-ci.yml` cu două etape. `test` instalează dependențele din `requirements.txt` și rulează `pytest`, cu cache pentru pip. `build` construiește imaginea Docker și rulează doar pe ramura implicită.",
    k: [
      "`stages: [test, build]`; fiecare job are `stage:` și `script:` (listă de comenzi). Imaginea implicită stă în `default:`, cu tag fixat, nu `latest`.",
      "Cache pentru pip: `PIP_CACHE_DIR` în `$CI_PROJECT_DIR`, `cache:paths` pe același director și `key:files` pe `requirements.txt`. GitLab păstrează în cache doar căi din proiect.",
      "`build` folosește imaginea `docker:…-cli` cu serviciul `docker:…-dind` și `DOCKER_TLS_CERTDIR`. Docker-in-Docker cere un runner privilegiat.",
      "Imaginea poartă tag-ul `$CI_COMMIT_SHORT_SHA`, nu `latest`, iar `rules: - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH` o ține doar pe ramura implicită."
    ]
  },
  {
    id: "s-graphql-dataloader", m: "graphql", lang: "py",
    t: "Strawberry: resolver cu DataLoader",
    p: "Ai `async fetch_authors(ids)` (o singură interogare cu `IN`, întoarce rânduri cu `id` și `name`) și `async fetch_books()` (rânduri cu `title` și `author_id`). Scrie schema Strawberry cu `Query.books` și cu `Book.author` rezolvat printr-un `DataLoader`, astfel încât `{ books { title author { name } } }` să cheme `fetch_authors` o singură dată, oricâte cărți ar fi.",
    k: [
      "`load_fn` e `async`, primește lista de chei și întoarce o listă de aceeași lungime, în ordinea cheilor (nu a rândurilor din bază): dict după `id` și `by_id.get(k)` pentru cheile lipsă.",
      "Resolverul `Book.author` e `async` și face `await loader.load(key)`, fără interogare proprie: loadurile din aceeași cerere se adună într-un singur apel în lot.",
      "Loaderul se creează la fiecare cerere (în contextul cererii, citit din `info.context`), nu global: cache-ul lui ar păstra valori vechi între cereri.",
      "`author_id` e `strawberry.Private`, deci nu apare în schemă. O cheie lipsă dă `None`, nu o excepție care ar strica tot lotul."
    ]
  },
  {
    id: "s-django-orm", m: "django", lang: "py",
    t: "Django ORM: select_related și prefetch_related",
    p: "Ai modelele Django `Author(name)` și `Book(title, author=ForeignKey, related_name=\"books\")`, plus echivalentele SQLAlchemy 2.0 `SAAuthor` și `SABook` (relațiile `author` și `books`). Scrie patru funcții fără N+1: cărțile cu autorul lor și autorii cu numărul cărților lor, o dată în Django (`books_with_author`, `authors_with_books`) și o dată în SQLAlchemy (`sa_books_with_author(session)`, `sa_authors_with_books(session)`).",
    k: [
      "FK înainte (`Book.author`): `select_related(\"author\")` face un singur query cu JOIN. În SQLAlchemy, echivalentul e `joinedload(SABook.author)`.",
      "Colecție (`Author.books`): `prefetch_related(\"books\")` mai face un query, cu `IN`, și leagă rezultatele în Python (2 query-uri în total). În SQLAlchemy, `selectinload(SAAuthor.books)`.",
      "Citești relația deja încărcată (`a.books.all()`, `b.author`). Un `.filter()` sau `.order_by()` pe manager aruncă cache-ul și dă din nou un query per obiect.",
      "SQLAlchemy 2.0: `session.scalars(select(...).options(...))`, nu `session.query(...)`, care e API legacy."
    ]
  },
  {
    id: "s-sqlalchemy-model", m: "sqlalchemy", lang: "py",
    t: "Model 2.0, sesiune și select",
    p: "Scrie un model SQLAlchemy 2.0 `User` (`id`, `name` unic și obligatoriu, `email` opțional), `init_db(engine)` care creează tabelele, `create_user(engine, name, email=None)` care îl salvează într-o `Session` și întoarce `id`-ul, și `find_by_name(engine, name)` care îl caută cu `select`.",
    k: [
      "Modelul moștenește `DeclarativeBase`, iar coloanele sunt `Mapped[tip] = mapped_column(...)`; nullabilitatea vine din tip: `Mapped[str | None]` e NULL, `Mapped[str]` e NOT NULL.",
      "Constrângerile se declară pe coloană (`primary_key=True`, `unique=True`) și le aplică baza: o dublură sau un `name` lipsă ridică `IntegrityError`.",
      "Sesiunea se deschide cu `with Session(engine) as s:`; scrierea e `add` + `commit`, iar `with` o închide.",
      "Interogarea e în stil 2.0: `select(User).where(...)` rulat cu `s.scalars(...)` (`.first()` dă un rând sau `None`), nu `s.query`.",
      "`Base.metadata.create_all(engine)` creează tabelele; în producție schema o ține Alembic."
    ]
  },
  {
    id: "s-sqlalchemy-selectin", m: "sqlalchemy", lang: "py",
    t: "selectinload contra N+1, cu numărător de query-uri",
    p: "Modelează `Author` cu `books` (one-to-many) și `Book` cu cheie străină. Scrie `titles_by_author(session)`, care întoarce `{nume: [titluri]}` fără N+1, și un context manager `count_queries(engine)` care strânge instrucțiunile SQL executate, ca să dovedești numărul de query-uri.",
    k: [
      "O relație se încarcă implicit leneș (lazy): `a.books` într-o buclă emite un SELECT per autor, deci 1 + N query-uri.",
      "Opțiunea se pune pe interogare: `select(Author).options(selectinload(Author.books))` încarcă toate colecțiile cu un al doilea SELECT cu `IN` pe cheile părinților, deci 2 query-uri oricâți autori ar fi.",
      "`selectinload` e alegerea obișnuită pentru colecții; `joinedload` pe o colecție repetă rândurile părintelui și cere `.unique()`.",
      "Numărătorul ascultă evenimentul `before_cursor_execute` al engine-ului și se dezabonează în `finally` (`event.remove`), ca să nu rămână ascultători în urma lui."
    ]
  },
  {
    id: "s-sqlalchemy-tx", m: "sqlalchemy", lang: "py",
    t: "Tranzacție cu session.begin() și migrare Alembic",
    p: "Scrie `transfer(engine, src, dst, amount)` pe `Account(id, balance)`: mută banii între două conturi, atomic, cu `ValueError` la sold prea mic. Apoi scrie migrarea Alembic `0002` (după `0001`), care adaugă coloana `currency` NOT NULL, cu valoarea implicită `'RON'`, și `downgrade`-ul ei.",
    k: [
      "`with Session(engine) as s, s.begin():` comite la ieșirea normală și face rollback la orice excepție; nu apelezi `commit()`, iar nimic nu rămâne scris pe jumătate.",
      "Rândurile se blochează cu `get(..., with_for_update=True)` înainte să verifici soldul, altfel două transferuri paralele trec amândouă de verificare.",
      "Blocările se iau în ordinea id-urilor (`sorted`), ca `1→2` și `2→1` în paralel să nu intre în deadlock.",
      "Migrarea are `revision` și `down_revision`, iar `upgrade()` și `downgrade()` sunt simetrice (`op.add_column` / `op.drop_column`).",
      "O coloană NOT NULL adăugată pe un tabel cu rânduri cere `server_default`; altfel migrarea pică pe datele existente."
    ]
  },
  {
    id: "s-postgres-upsert", m: "postgres", lang: "sql",
    t: "Upsert cu ON CONFLICT",
    p: "Tabela `stock(sku text PRIMARY KEY, qty int NOT NULL, updated_at timestamptz)`. Scrie un singur statement care inserează SKU-ul `'A-1'` cu cantitatea 5 sau, dacă există deja, adună 5 la cantitatea veche și actualizează `updated_at`, apoi întoarce rândul rezultat.",
    k: [
      "`ON CONFLICT (sku)` cere o constrângere sau un index unic exact pe coloanele din paranteză, altfel e eroare; fără țintă merge doar `DO NOTHING`.",
      "În `DO UPDATE`, `EXCLUDED` e rândul propus pentru inserare, iar `stock.qty` e valoarea veche: `SET qty = stock.qty + EXCLUDED.qty`. Un `qty` necalificat e ambiguu.",
      "E un singur statement atomic: sesiunile paralele nu pierd cantitate și nu primesc eroare de duplicat, spre deosebire de `SELECT` urmat de `INSERT`.",
      "`RETURNING` dă rândul inserat sau actualizat; la `DO NOTHING` rândul sărit nu se întoarce."
    ]
  },
  {
    id: "s-postgres-window", m: "postgres", lang: "sql",
    t: "Window function: ultima comandă și diferența",
    p: "Tabela `orders(id, customer, amount, created_at)`. Scrie interogarea care întoarce, pentru fiecare client, ultima lui comandă (`customer`, `id`, `amount`) și `delta` = suma ei minus suma comenzii dinainte (`NULL` dacă nu are una), ordonat după client.",
    k: [
      "Fereastra `OVER (PARTITION BY customer ORDER BY …)` păstrează toate rândurile, spre deosebire de `GROUP BY`; `ORDER BY`-ul din `OVER` decide numerotarea și ce înseamnă „anterior”.",
      "`ROW_NUMBER()` cu `ORDER BY created_at DESC, id DESC` dă 1 ultimei comenzi; `id` ca tie-breaker face rezultatul determinist când data se repetă.",
      "Funcțiile fereastră nu merg în `WHERE`: `rn = 1` se filtrează într-un subquery sau într-un CTE.",
      "`LAG(amount)` cu fereastra în ordine crescătoare întoarce comanda precedentă; la primul rând din partiție dă `NULL` (sau valoarea din al treilea argument), deci și `delta` e `NULL`."
    ]
  },
  {
    id: "s-postgres-queue", m: "postgres", lang: "sql",
    t: "Coadă de joburi cu SKIP LOCKED",
    p: "Tabela `jobs(id serial, payload text, status text DEFAULT 'new', started_at timestamptz)`. Scrie un singur statement prin care un worker ia cel mai vechi job `'new'`, îl marchează `'running'` cu `started_at` și îl întoarce, astfel încât doi workeri paraleli să nu primească niciodată același job și să nu aștepte unul după altul.",
    k: [
      "`FOR UPDATE SKIP LOCKED` sare peste rândurile blocate de alte tranzacții în loc să aștepte: doi consumatori nu iau același job și nu se blochează.",
      "Alegerea și marcarea jobului sunt un singur statement atomic: `UPDATE … WHERE id = (SELECT … FOR UPDATE SKIP LOCKED)`; un `SELECT` urmat de un `UPDATE` fără blocare lasă doi workeri să aleagă același rând.",
      "`ORDER BY id` și `LIMIT 1` dau ordinea FIFO și un singur job; blocarea se oprește la limită, deci restul cozii rămâne liber.",
      "`RETURNING` întoarce jobul luat; zero rânduri înseamnă coadă goală. Blocarea ține până la `COMMIT`: într-o tranzacție lăsată deschisă, un worker căzut eliberează jobul."
    ]
  },
  {
    id: "s-index-concurrent", m: "index", lang: "sql",
    t: "Index parțial cu CONCURRENTLY și EXPLAIN ANALYZE",
    p: "Tabela `orders(id, customer_id, status, created_at)` e mare și primește scrieri. Interogarea frecventă e `WHERE customer_id = 42 AND status = 'open' ORDER BY created_at DESC LIMIT 20`. Scrie indexul `idx_orders_open` care o servește fără să blocheze scrierile, apoi interogarea cu `EXPLAIN` care arată planul real.",
    k: [
      "`CREATE INDEX CONCURRENTLY` nu blochează `INSERT`/`UPDATE`/`DELETE` cât se construiește (cel obișnuit blochează scrierile), dar nu rulează într-o tranzacție și e mai lent: două scanări ale tabelei.",
      "Coloanele: egalitatea (`customer_id`) întâi, apoi coloana de sortare (`created_at DESC`); indexul dă rândurile în ordinea cerută, fără nod `Sort`.",
      "Indexul parțial (`WHERE status = 'open'`) e mic și e folosit doar când interogarea are același predicat.",
      "`EXPLAIN (ANALYZE)` execută interogarea și arată planul real: cauți `Index Scan using idx_orders_open`, nu `Seq Scan`, și compari rândurile estimate cu cele reale.",
      "Un build eșuat lasă un index `INVALID`, ignorat la interogări dar plătit la scrieri; îl ștergi cu `DROP INDEX` și reîncerci."
    ]
  },
  {
    id: "s-gil-lock", m: "gil", lang: "py",
    t: "Counter sigur între thread-uri, cu Lock",
    p: "Scrie o clasă `Counter` cu `inc()` sigur între thread-uri și funcția `run_threads(fn, count)`, care pornește `count` thread-uri pe `fn` și le așteaptă pe toate. Doar `threading`.",
    k: [
      "`with self.lock` acoperă tot `self.n += 1`: citirea, adunarea și scrierea nu sunt atomice, deci fără lock două thread-uri pot citi aceeași valoare și o actualizare se pierde (GIL-ul nu te scapă).",
      "Un singur lock pe instanță, creat în `__init__` și partajat de toate thread-urile; un lock nou creat în `inc()` nu exclude nimic.",
      "`start()` pe toate thread-urile, apoi `join()` pe toate, în bucle separate: `start()` urmat imediat de `join()` le rulează unul după altul, adică fără paralelism.",
      "`target=fn`, fără paranteze: `target=fn()` apelează funcția în thread-ul curent și îi dă thread-ului rezultatul ei."
    ]
  },
  {
    id: "s-gil-queue", m: "gil", lang: "py",
    t: "Producer/consumer pe queue.Queue",
    p: "Scrie `pipeline(items, handle, workers=3)`: thread-ul curent pune itemii pe un `queue.Queue` mărginit, iar `workers` thread-uri apelează `handle(item)`. La final totul se oprește curat, fără item pierdut și fără thread rămas. Presupune că `handle` nu aruncă.",
    k: [
      "Un sentinel pentru fiecare consumator (`STOP` pus de `workers` ori): cu un singur sentinel, ceilalți consumatori rămân blocați pe `get()` pentru totdeauna. Sentinelul e un `object()` comparat cu `is`, nu `None`, care ar putea fi un item.",
      "`task_done()` după fiecare `get()`, inclusiv pentru sentinel, în `finally`: `join()` se deblochează doar când contorul ajunge la zero, altfel atârnă.",
      "`q.join()` așteaptă ca itemii să fie procesați, nu doar scoși din coadă; abia apoi faci `join()` pe thread-uri.",
      "`maxsize` dă backpressure: `put()` blochează producătorul când consumatorii nu țin pasul, în loc să umple memoria.",
      "`queue.Queue` e pentru comunicare între thread-uri (are lock-ul inclus); într-un singur thread, pentru BFS sau o fereastră glisantă, folosești `collections.deque`."
    ]
  },
  {
    id: "s-gil-proc", m: "gil", lang: "py",
    t: "Process cu garda __main__ și rezultat prin Queue",
    p: "Pornește 4 procese care calculează pătratul unui număr și trimit rezultatul înapoi părintelui, care îl adună într-un `dict`. Scriptul trebuie să meargă cu orice start method (`spawn`, `forkserver`, `fork`).",
    k: [
      "`if __name__ == \"__main__\":` în jurul pornirii: cu `spawn` și `forkserver` copilul reimportă modulul, iar fără gardă ar porni la rândul lui procese (eroare de bootstrapping).",
      "`target` e o funcție de nivel înalt (picklable), iar datele merg în `args=(...)`; nu o lambda și nu o funcție locală.",
      "Procesele au memorie separată: rezultatul se întoarce printr-un `mp.Queue` (sau `Pipe`), nu printr-o listă globală pe care o modifică copilul.",
      "Citești din coadă înainte de `join()`: un copil care a pus date în coadă nu se termină până nu sunt consumate, deci `join()` primul poate bloca definitiv.",
      "Nu te bazezi pe start method-ul implicit: e `spawn` pe Windows și macOS, `fork` pe Linux până la 3.13 și `forkserver` de la 3.14."
    ]
  },
  {
    id: "s-gil-pool", m: "gil", lang: "py",
    t: "ThreadPoolExecutor cu as_completed și excepții",
    p: "Scrie `run_all(fn, items, pool=ThreadPoolExecutor)`: rulează `fn(x)` pentru fiecare item într-un executor cu 4 workeri și întoarce două dicturi, `done` (item → rezultat) și `failed` (item → excepție). Un item care eșuează nu trebuie să piardă rezultatele celorlalte.",
    k: [
      "`with pool(...) as ex:` face `shutdown(wait=True)` la ieșire, deci nu rămân thread-uri sau procese în urmă.",
      "`as_completed` dă future-urile în ordinea terminării, nu a intrării: ții un dict `future → item`, ca să știi al cui e fiecare rezultat.",
      "Excepția din `fn` nu urcă singură: stă în future și se ridică la `result()`. Pui `result()` într-un `try/except` pe fiecare future; fără el, eroarea oprește colectarea restului.",
      "Pentru CPU-bound schimbi doar clasa în `ProcessPoolExecutor`: `fn` și argumentele trebuie să fie picklable (funcție de nivel înalt, nu lambda), iar scriptul are garda `__main__`."
    ]
  },
  {
    id: "s-gil-event", m: "gil", lang: "py",
    t: "Oprire curată a unui thread cu Event",
    p: "Scrie `start_loop(step, every=0.5)`: pornește un thread care apelează `step()` periodic și întoarce `(stop, thread)`. Oprirea (`stop.set()`, apoi `t.join()`) trebuie să fie imediată, chiar dacă `every` e mare.",
    k: [
      "`while not stop.is_set()`: un `Event` ca semnal de oprire, verificat la fiecare iterație, nu un `bool` global modificat din afară.",
      "`stop.wait(every)` în loc de `time.sleep(every)`: servește și ca pauză, dar se trezește imediat la `set()`, deci oprirea nu așteaptă o pauză întreagă.",
      "`set()` singur doar cere oprirea; `join()` așteaptă ca pasul în curs să se termine, deci după `join()` nu mai rulează nimic.",
      "Thread nedaemon, oprit explicit: un thread `daemon=True` e tăiat brusc la ieșirea din program, fără să-și termine pasul și curățenia."
    ]
  },
  {
    id: "s-asyncio-sem", m: "asyncio", lang: "py",
    t: "Semaphore și gather cu return_exceptions",
    p: "`fns` e o listă de funcții async fără argumente. Scrie `run_limited(fns, limit=5)`: le rulează cu cel mult `limit` în paralel și întoarce rezultatele în ordinea lui `fns`; o excepție apare în locul rezultatului ei, fără să le oprească pe celelalte.",
    k: [
      "`async with sem:` în jurul apelului: permisul se eliberează și când `fn` aruncă; cu `acquire()` fără `release()` în `finally`, o eroare ține permisul pentru totdeauna.",
      "Un singur semafor, creat în `run_limited` și partajat de toate task-urile; unul nou la fiecare apel (în `one`) nu limitează nimic.",
      "`gather(..., return_exceptions=True)`: fără el, prima excepție ajunge imediat la `await`, dar celelalte task-uri nu sunt anulate și continuă să ruleze în fundal; cu el, excepțiile vin ca valori în lista de rezultate.",
      "Toate task-urile există de la început, dar doar `limit` trec de `async with sem` în același timp; rezultatele păstrează ordinea lui `fns`, nu a terminării."
    ]
  },
  {
    id: "s-asyncio-workers", m: "asyncio", lang: "py",
    t: "Workeri pe asyncio.Queue, cu oprire curată",
    p: "Scrie `pipeline(items, handle, n=3)`: pui itemii pe un `asyncio.Queue` mărginit, iar `n` workeri apelează `await handle(item)`. La final workerii sunt opriți și așteptați. Întoarce lista excepțiilor aruncate de `handle`.",
    k: [
      "`task_done()` în `finally`, după fiecare `get()`: altfel `q.join()` nu se mai deblochează după o eroare.",
      "Workerii rulează `while True`, deci nu se opresc singuri: după `join()` îi anulezi cu `cancel()`, iar `gather(*ws, return_exceptions=True)` așteaptă anularea efectivă, ca să nu rămână task-uri pending în loop.",
      "Oprirea stă într-un `finally`: dacă producătorul e anulat sau pică, workerii nu rămân orfani.",
      "În worker, `except Exception`, nu `BaseException`: o eroare din `handle` nu omoară workerul, dar `CancelledError` (subclasă de `BaseException`) trebuie să treacă.",
      "`maxsize` + `await q.put(...)`: producătorul așteaptă când coada e plină (backpressure). Task-urile se țin într-o listă (`ws`), fiindcă loop-ul păstrează doar referințe slabe."
    ]
  },
  {
    id: "s-asyncio-tg", m: "asyncio", lang: "py", v: "3.11+",
    t: "TaskGroup și asyncio.timeout",
    p: "Python 3.11+. Scrie `run_all(fns, limit=2.0)`: rulează funcțiile async fără argumente în paralel, într-un `TaskGroup`, cu o limită totală de timp, și întoarce rezultatele în ordinea lui `fns`. Dacă una eșuează, celelalte se anulează. Fără `gather` și fără `wait_for`.",
    k: [
      "`TaskGroup`: la ieșirea din `async with` toate task-urile sunt gata, iar prima excepție le anulează pe restul (`gather` le lasă să ruleze).",
      "Erorile ies înfășurate într-un `ExceptionGroup`: le prinzi cu `except*`; un `except ValueError` simplu nu se potrivește cu grupul.",
      "`asyncio.timeout(limit)` e un context manager async care stă în afara grupului, ca să acopere tot grupul; la depășire anulează și ridică `TimeoutError`.",
      "Task-urile se creează doar cu `tg.create_task(...)`: grupul le ține referințele și le așteaptă (un `create_task` fără referință poate fi colectat de GC)."
    ]
  },
  {
    id: "s-asyncio-thread", m: "asyncio", lang: "py",
    t: "to_thread și run_in_executor",
    p: "Scrie `io_many(fn, items)`, care rulează o funcție blocantă (I/O) pe fiecare item fără să blocheze event loop-ul, și `cpu_many(fn, items, pool)`, care face același lucru pentru o funcție CPU-bound, într-un `ProcessPoolExecutor` primit ca argument. Ambele întorc rezultatele în ordine.",
    k: [
      "`asyncio.to_thread(fn, x)`: funcția și argumentele separat. `to_thread(fn(x))` apelează `fn` chiar în loop, îl blochează și dă lui `to_thread` rezultatul, nu o funcție.",
      "Un apel blocant direct într-o corutină (`time.sleep`, un client HTTP sincron) îngheață tot loop-ul; `to_thread` îl mută într-un thread din executorul implicit, iar loop-ul merge mai departe.",
      "Thread-urile ajută doar la I/O blocant (GIL): pentru CPU-bound folosești `loop.run_in_executor(pool, fn, x)` cu `ProcessPoolExecutor`, iar `fn` și argumentele trebuie să fie picklable.",
      "`asyncio.get_running_loop()` din corutină; din thread-ul lui `fn` nu atingi obiecte asyncio (`Queue`, `Task`), fiindcă nu sunt thread-safe: folosești `run_coroutine_threadsafe` sau `call_soon_threadsafe`."
    ]
  },
  {
    id: "s-asyncio-cancel", m: "asyncio", lang: "py",
    t: "Anulare corectă: finally și CancelledError",
    p: "Scrie `worker(res)`, care rulează la nesfârșit și lasă în `res` urmele curățeniei când e anulat, și `cancel(task)`, care anulează task-ul și așteaptă să se termine. Anularea trebuie să ajungă la cine a cerut-o: `wait_for`, `timeout` și `TaskGroup` se bazează pe ea.",
    k: [
      "Curățenia stă în `finally`: rulează la anulare, la excepție și la ieșire normală.",
      "Dacă prinzi `CancelledError`, o re-ridici cu `raise` după curățenie: e `BaseException`, deci `except Exception` nu o prinde, iar dacă o înghiți, `wait_for`, `timeout` și `TaskGroup` nu mai pot opri task-ul.",
      "`task.cancel()` doar cere anularea; `await task` (cu `CancelledError` prins în `cancel`) așteaptă să se termine curățenia înainte să mergi mai departe.",
      "`CancelledError` o ignori doar în `cancel()`, acolo unde ai cerut tu anularea, niciodată în worker."
    ]
  },
  {
    id: "s-asyncio-agen", m: "asyncio", lang: "py",
    t: "async with și generator async",
    p: "Scrie un context manager async `resource(log)` (cu `@asynccontextmanager`) care deschide și închide mereu o resursă, și un generator async `ticks(n, log)`. Consumă `ticks` cu `async for`, ieși devreme cu `break` și asigură închiderea lui determinist.",
    k: [
      "`yield` într-un `async def` îl face generator async: îl consumi cu `async for`, nu cu `for`; `yield from` e eroare de sintaxă în el.",
      "În `@asynccontextmanager`, `yield` stă într-un `try/finally`: altfel închiderea nu rulează când blocul `async with` aruncă.",
      "La ieșire anticipată (`break`, excepție, anulare), `finally`-ul generatorului rulează doar dacă generatorul e închis; `aclosing(...)` (3.10+) cheamă `aclose()` determinist, în același task și context.",
      "`async with` apelează `__aenter__` / `__aexit__` (awaitable): `@asynccontextmanager` e doar scurtătura lor, iar un `with` simplu nu merge pe un context manager async."
    ]
  }
];
