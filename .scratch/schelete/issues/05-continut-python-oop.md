# 05: Conținut: python și oop (12 schelete)

**What to build:** Alex are scheletele de Python idiomatic și de design de clase, fiecare cu cerință, 3–5 puncte esențiale și referință testată.

**Blocked by:** 01 (Un schelet de la cap la coadă, fără AI)

**Status:** done

Spec: `.scratch/schelete/spec.md`. Vocabular: `CONTEXT.md` (Schelet, Punct esențial, Kata).

- [x] python (6): pipeline de generatori pe un fișier · generator cu `send` și `yield from` · decorator cu parametri + `wraps` · context manager ca clasă și cu `@contextmanager` · iterator propriu (`__iter__` / `__next__`) · `Counter` / `defaultdict` / `deque` / `heapq.nlargest`.
- [x] oop (6): value object (`__eq__` + `__hash__`, sau `dataclass(frozen=True)`) · `@property` cu validare + `@classmethod from_dict` · ABC vs `Protocol` · compoziție cu dependență injectată + fake în test · `super()` cooperativ în moștenire multiplă · container (`__len__`, `__iter__`, `__getitem__`, `__contains__`).
- [x] Fiecare referință are un test care verifică proprietatea apărată de punctele esențiale (de pildă: generatorul e leneș, `wraps` păstrează numele, `__exit__` rulează la excepție, obiectul intră în `set`, ABC-ul neimplementat nu se instanțiază, MRO-ul cheamă fiecare clasă o dată).
- [x] Scheletele sunt minimale și nu repetă kata-urile k3, k4 și k7.
- [x] Textele sunt în română, cu termenii tehnici în engleză; punctele numesc greșeala tipică.
- [x] Faptele noi sunt verificate pe surse primare și trecute în notele de fapte verificate.
- [x] Validarea datelor trece; codul încape în 42 de coloane.

## Comments

**1 nov. 2026 — implementat** (d78cc6f). 12 schelete, 6 la `python` și 6 la `oop`, câte 4 puncte esențiale fiecare. Referințele sunt în `katas/skel_python.py` și `katas/skel_oop.py`, testele în `katas/test_skel_python.py` (34) și `katas/test_skel_oop.py` (39); `pytest katas` dă 125 de teste verzi. Fiecare test apără proprietatea unui punct esențial, cu un contrast acolo unde punctul numește o greșeală (de pildă `__eq__` fără `__hash__` face clasa nehashable, `Base.hello(self)` în loc de `super()` sare peste `Right`, `yield` fără `finally` nu curăță). Verificare de mână prin mutații (30 de mutații pe copii, de pildă: scos `wraps`, `return True` în `__exit__`, `deque()` fără `maxlen`, `Base.hello(self)`): toate pică. Prima rundă a lăsat 3 supraviețuitoare: două din ele veneau din teste prost alese (cel mai frecvent cuvânt era și primul alfabetic; contorul decoratorului era verificat cu două fabrici, nu cu un singur decorator pe două funcții), reparate; a treia era un mutant echivalent.

Abateri și decizii:
- Mediul nu are Python 3.10 (cel mai vechi e 3.11). Sintaxa referințelor și a testelor e verificată cu `ast.parse(..., feature_version=(3, 10))`, iar testele rulează pe 3.13; **nu au rulat pe un interpretor 3.10**.
- Pentru limita de 42 de caractere: `first_matches` are o variabilă intermediară, media din `averager` e `total / max(count, 1)` (grupă goală → 0), `from_dict` face `cls(**data)`, iar mesajul din `Signup` e „salut”.
- Fără suprapunere cu kata-urile: decoratorul (`limit_calls`) ține stare în closure și nu reîncearcă (k3); iteratorul și containerul sunt clase peste o listă, nu un cache (k4); pipeline-ul pune `with open` în generator și arată lenea și închiderea fișierului, fără `parse_kv` / `batched` (k7).
- Faptele noi (contextmanager, `__exit__`, `wraps`, protocolul iteratorului, `in` și `iter()` prin `__getitem__`, `__hash__`, `NotImplemented`, `Counter`, `defaultdict`, `deque`, `heapq`, `super()`) sunt verificate pe docs.python.org la 1 nov. 2026 și trecute în `research/interview-facts.md`, secțiunea 9.
- Verificate: `node validate.mjs` (OK, 13 schelete), `node build.mjs`, `node --check dist/bundle-check.js`, `tools/test_skel.py` și `tools/test_skel_ai.py` (ALL PASS), plus un script care deschide fiecare din cele 12 ecrane la 360 px, în light și dark, cu referința afișată (fără overflow, 4 bife, fără erori de consolă). `node tools/fencew.mjs 42` raportează doar rânduri vechi din explicații, nu din schelete.
- Nefăcut: `/code-review`, celelalte teste de interfață din `tools/` și testele de unitate; artifactul nu e publicat (publicarea e tichetul 06).
