# 05: Conținut: python și oop (12 schelete)

**What to build:** Alex are scheletele de Python idiomatic și de design de clase, fiecare cu cerință, 3–5 puncte esențiale și referință testată.

**Blocked by:** 01 (Un schelet de la cap la coadă, fără AI)

**Status:** ready-for-agent

Spec: `.scratch/schelete/spec.md`. Vocabular: `CONTEXT.md` (Schelet, Punct esențial, Kata).

- [ ] python (6): pipeline de generatori pe un fișier · generator cu `send` și `yield from` · decorator cu parametri + `wraps` · context manager ca clasă și cu `@contextmanager` · iterator propriu (`__iter__` / `__next__`) · `Counter` / `defaultdict` / `deque` / `heapq.nlargest`.
- [ ] oop (6): value object (`__eq__` + `__hash__`, sau `dataclass(frozen=True)`) · `@property` cu validare + `@classmethod from_dict` · ABC vs `Protocol` · compoziție cu dependență injectată + fake în test · `super()` cooperativ în moștenire multiplă · container (`__len__`, `__iter__`, `__getitem__`, `__contains__`).
- [ ] Fiecare referință are un test care verifică proprietatea apărată de punctele esențiale (de pildă: generatorul e leneș, `wraps` păstrează numele, `__exit__` rulează la excepție, obiectul intră în `set`, ABC-ul neimplementat nu se instanțiază, MRO-ul cheamă fiecare clasă o dată).
- [ ] Scheletele sunt minimale și nu repetă kata-urile k3, k4 și k7.
- [ ] Textele sunt în română, cu termenii tehnici în engleză; punctele numesc greșeala tipică.
- [ ] Faptele noi sunt verificate pe surse primare și trecute în notele de fapte verificate.
- [ ] Validarea datelor trece; codul încape în 42 de coloane.
