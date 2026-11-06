<!-- TypeScript: sistemul de tipuri (modulul ts, frontend extins, tichetul 06). Variantele greșite: B, C, D = ordinea din sursă (A e cea corectă). Fapte verificate cu tsc 7.0.2 (`--strict`) și pe typescriptlang.org: research/interview-facts.md, secțiunea 47. -->

### ts-01
Pe scurt: Da, compilează: tiparea e structurală, iar `OrderId` are aceeași formă ca `UserId`.
Scop: Știi că TypeScript compară tipurile după formă, nu după nume. Apare ca „sunt tipurile nominale ca în C++?” sau „cum împiedici să amesteci două id-uri?”.
Mecanism: Un tip e compatibil cu altul dacă are câmpurile cerute, cu tipurile lor. `UserId` și `OrderId` au amândouă `v: number`, deci sunt interschimbabile. Ca să le separi, adaugi un câmp-etichetă diferit sau un membru `private`.
Aplicare:
```ts
class UserId {
  private tag = "user";
  constructor(public v: number) {}
}
// OrderId fără `tag`: TS2741
```
Legătură: În C++, două clase cu același conținut sunt tipuri fără legătură. Aici forma decide, ca într-un duck typing verificat la compilare. Același principiu face ca props-urile din React să accepte obiecte cu câmpuri în plus (TS-02).
Limită: Un membru `private` sau `protected` face compararea nominală pentru acea clasă. Tipurile obiect obișnuite rămân structurale.
La interviu: „TypeScript e structural: un tip e compatibil dacă are forma cerută, indiferent de nume. Dacă vreau tipuri distincte, adaug un câmp-etichetă sau un membru privat.”
Verificare: Două `type` cu aceleași câmpuri, `A` și `B`. Poți pasa un `A` unei funcții care cere `B`?
Răspuns verificare: Da. Alias-urile nu creează tipuri noi, iar tiparea e structurală: contează doar forma.
Varianta greșită B: În C++ ar pica, dar TypeScript nu e nominal. Eroarea apare doar când formele nu se potrivesc.
Varianta greșită C: `strict` nu schimbă regula de compatibilitate. Nu compară numele claselor.
Varianta greșită D: Nu ai nevoie de `as`. Un `as` ar ascunde un tip care deja se potrivește.

### ts-02
Pe scurt: Doar `b` dă eroare: un literal de obiect cu proprietate în plus pică (TS2353), o variabilă cu aceeași formă nu.
Scop: Înțelegi excepția de la tiparea structurală. Apare ca „de ce acceptă TypeScript obiecte cu câmpuri în plus, dar uneori nu?”.
Mecanism: Verificarea proprietăților în plus (excess property check) se face doar pentru un literal de obiect scris direct la atribuire sau ca argument. `o` are deja tipul `{ x: number; y: number }`, iar acest tip e compatibil cu `P`. În `b`, `y` apare doar în literal, deci compilatorul bănuiește o greșeală de scriere.
Pas cu pas:
```text
const o = { x: 1, y: 2 }
  → tip { x: number; y: number }
const a: P = o
  → compatibil (formă ⊇ P) ✓
const b: P = { x: 1, y: 2 }
  → literal proaspăt: y în plus ✗
```
Legătură: Același mecanism prinde o greșeală de scriere într-un prop: `<Card titel="…" />` pică, iar un obiect trecut printr-o variabilă nu.
Limită: Verificarea nu protejează la runtime: obiectul `a` are tot câmpul `y`.
La interviu: „TypeScript acceptă proprietăți în plus pe o variabilă, dar nu pe un literal de obiect. Verificarea de la literal prinde greșelile de scriere.”
Verificare: `const c: P = { ...o }` compilează?
Răspuns verificare: Da. Proprietățile care vin dintr-un spread nu declanșează verificarea.
Varianta greșită B: `a` nu dă eroare: `o` e o variabilă, nu un literal. `y` în plus e permis prin tiparea structurală.
Varianta greșită C: Tocmai `a` trece. Tipul lui `o` conține `x: number`, deci e compatibil cu `P`.
Varianta greșită D: Tocmai pentru literale există TS2353: acolo un câmp în plus e semnalat, ca o posibilă greșeală de scriere.

### ts-03
Pe scurt: `I` primește ambele câmpuri, iar al doilea `T` dă „Duplicate identifier” (TS2300).
Scop: Cunoști diferența practică dintre `interface` și `type`. Apare ca „când alegi `interface`?”.
Mecanism: Două `interface` cu același nume se îmbină (declaration merging): `I` are `a` și `b`. Un `type` nu se poate redeclara, deci a doua declarație `T` e eroare. `type` compensează cu ce nu poate `interface`: uniuni, primitive, tupluri.
Aplicare:
```ts
type Id = string | number;
type Pair = [string, number];
declare global {
  interface Window {
    appName: string;
  }
}
```
Legătură: Bibliotecile cer extinderea prin `interface`: adaugi câmpuri la `Window` sau la tipurile Express. În React, `type Props = { … }` e uzual pentru props, iar `interface` rămâne la contracte extensibile.
Limită: Prin `extends`, un câmp cu tip incompatibil dă eroare (TS2430), iar prin `&` același câmp devine `never`.
La interviu: „Interfața se poate redeschide și extinde; tipul poate numi uniuni și tupluri. Pentru un obiect simplu sunt aproape echivalente, așa că rămân consecvent.”
Verificare: Poți scrie `interface Id = string | number`?
Răspuns verificare: Nu. O interfață descrie doar forma unui obiect. Pentru o uniune folosești `type`.
Varianta greșită B: Doar interfețele se îmbină. Un alias duplicat dă TS2300.
Varianta greșită C: Interfețele cu același nume nu dau eroare: tocmai asta e declaration merging.
Varianta greșită D: E invers: `type` e cel care nu se poate redeclara.

### ts-04
Pe scurt: Compilează, dar la runtime aruncă `TypeError: v.toUpperCase is not a function`.
Scop: Știi că un type guard scris de tine nu e verificat. Apare ca „e sigur un `x is T`?”.
Mecanism: Predicatul `x is string` îi spune compilatorului: dacă funcția întoarce `true`, `x` e string. Corpul nu e comparat cu predicatul. Aici corpul verifică `number`, deci pentru `v = 5` întoarce `true`, iar în ramura `if` compilatorul tratează `v` ca string.
Pas cu pas:
```text
isStr(5): typeof 5 === "number"
  → true
compilatorul: v este string
v.toUpperCase()
  → 5 nu are toUpperCase
TypeError la runtime
```
Legătură: Același risc ca la `as`: promisiunea e a ta. Un guard corect pentru date externe verifică totul (sau un validator zod), cum cere FE-10.
Limită: `typeof`, `in` și `instanceof` directe în `if` sunt verificate de compilator; un predicat `x is T` definit de tine nu.
La interviu: „Un type guard cu `x is T` e încredere, nu verificare: compilatorul nu citește corpul. Pentru date externe folosesc `unknown` și un validator, nu un guard scris la repezeală.”
Verificare: Un guard corect pentru `string`?
Răspuns verificare: `(x: unknown): x is string => typeof x === "string"`. Predicatul și verificarea spun același lucru.
Varianta greșită B: Predicatul și corpul nu sunt comparate. Compilatorul nu dă nicio eroare.
Varianta greșită C: `toUpperCase` nu există pe un număr, deci apelul aruncă la runtime.
Varianta greșită D: `unknown` se poate restrânge, inclusiv printr-un type guard. Aici compilează.

### ts-05
Pe scurt: `T` n-are constrângeri, deci nu se știe că are `length` (TS2339); repari cu `T extends { length: number }`.
Scop: Înțelegi rolul lui `extends` într-un generic. Apare ca „ce face `extends` la generics?”.
Mecanism: Într-o funcție generică, `T` poate fi orice tip, deci compilatorul permite doar ce merge pe orice tip. Constrângerea `T extends { length: number }` cere ca `T` să aibă acel câmp. Apoi `x.length` compilează, iar `len(5)` pică la apel.
Aplicare:
```ts
type Len = { length: number };
function len<T extends Len>(x: T) {
  return x.length;
}
len("abc");  // 3
len([1, 2]);  // 2
```
Legătură: În C++, un template acceptă orice tip și pică abia la instanțiere, dacă lipsește o operație. Constrângerea din TypeScript e verificată din start, ca un `concept`.
Limită: Constrângerea se verifică la compilare. La runtime nu rămâne nimic din `T`.
La interviu: „Fără constrângere, `T` e orice tip, deci nu pot citi câmpuri. Cu `extends` cer forma minimă de care am nevoie, iar apelul pică dacă argumentul n-o are.”
Verificare: Ce tip deduce TypeScript pentru `T` în `len([1, 2])`?
Răspuns verificare: `number[]`, din argument. Îl poți da și explicit: `len<number[]>([1, 2])`.
Varianta greșită B: `length` există pe array-uri și string-uri. Problema e că `T` nu spune asta. `any` ar ascunde eroarea.
Varianta greșită C: Tipul de întoarcere nu are legătură cu eroarea TS2339 de pe `x.length`.
Varianta greșită D: Generics pot accesa proprietăți, dar doar pe cele garantate de constrângere.

### ts-06
Pe scurt: Doar `c` dă eroare: `Pick` păstrează `name` și `email`, deci `id` e în plus (TS2353).
Scop: Citești corect utility types combinate. Apare ca „ce face `Partial<Pick<…>>`?”.
Mecanism: Se evaluează de la interior spre exterior. `Pick<User, "name" | "email">` păstrează doar `name` și `email`. `Partial` le face opționale, deci `{}` și `{ name: "Ana" }` sunt valide. `id` nu mai face parte din tip, iar un literal cu `id` pică la excess property check.
Pas cu pas:
```text
User: id, name, email
Pick name|email: name, email
Partial: name?, email?
{}              → ✓
{ name: "Ana" } → ✓
{ id: 1 }       → ✗ id în plus
```
Legătură: Un PATCH către un endpoint FastAPI se tipează așa: câmpurile care se pot schimba, toate opționale. `Omit<User, "id">` e complementul lui `Pick`.
Limită: Utility types sunt doar tipuri: dispar la runtime și nu validează un obiect.
La interviu: „`Pick` alege câmpuri, `Omit` le scoate, `Partial` le face opționale. Le combin ca să derivez un tip dintr-altul, ca să nu-l copiez.”
Verificare: Ce face `Omit<User, "email">`?
Răspuns verificare: Un tip cu `id` și `name`, adică `User` fără `email`.
Varianta greșită B: `Partial` acceptă un obiect gol. Toate câmpurile devin opționale.
Varianta greșită C: `a` e valid, iar `Pick` nu face câmpurile obligatorii. Le păstrează cu opționalitatea originală.
Varianta greșită D: `Partial` se aplică doar la tipul primit, adică la cel din `Pick`. Nu la tot `User`.

### ts-07
Pe scurt: Doar ultimul rând dă eroare: `b.red` e `unknown` (TS18046), fiindcă anotarea lărgește tipul.
Scop: Știi ce adaugă `satisfies` față de o anotare. Apare ca „`satisfies` sau `: Tip`?”.
Mecanism: `satisfies Record<Colors, unknown>` verifică forma valorii (are `red` și `blue`), dar îi lasă tipul exact: `{ red: number[]; blue: string }`. O anotare `: Record<Colors, unknown>` înlocuiește tipul valorii cu cel declarat, deci `b.red` devine `unknown`, iar `unknown` nu are `map`.
Pas cu pas:
```text
a: satisfies → forma verificată
  tip: red: number[], blue: string
  a.red.map ✓
b: anotare → tipul declarat
  tip: Record<Colors, unknown>
  b.red.map ✗ unknown
```
Legătură: E util la configurări și tabele de căutare: verifici că nu lipsește nicio cheie, dar păstrezi tipurile exacte. `as const` face literalul readonly cu valorile exacte (`"dark"`, nu `string`).
Limită: `satisfies` apare în TypeScript 4.9. Nu convertește nimic și nu verifică la runtime.
La interviu: „O anotare lărgește tipul valorii la cel declarat. `satisfies` verifică forma, dar păstrează tipul exact.”
Verificare: Ce tip are `cfg.mode` după `const cfg = { mode: "dark" } as const`?
Răspuns verificare: `"dark"`, un literal readonly. Fără `as const` ar fi `string`.
Varianta greșită B: `satisfies` nu pierde tipul. Tocmai îl păstrează.
Varianta greșită C: `a.red` e `number[]`, deci are `map`. Doar `b.red` e `unknown`.
Varianta greșită D: Tipurile diferă: anotarea lărgește, `satisfies` nu.

### ts-08
Pe scurt: `u` are tipul `null`, iar `setU({ id: 1 })` pică la compilare (TS2353).
Scop: Știi cum se tipează `useState` când valoarea inițială e `null`. Apare ca „de ce nu pot salva un utilizator în state?”.
Mecanism: `useState(valoare)` deduce tipul din valoarea inițială. Din `null` rezultă tipul `null`, deci `setU` primește `null` sau o funcție de la `null` la `null`. Un obiect nu se potrivește. Soluția e genericul explicit: `useState<User | null>(null)`.
Aplicare:
```tsx
const [u, setU] =
  useState<User | null>(null);
setU({ id: 1 });
return <b>{u?.id}</b>;
```
Legătură: Același lucru la `useState([])` (tip `never[]`) și la `useRef(null)`. `?.` e nevoie fiindcă `u` poate fi `null` (`strictNullChecks`; `?.` e în fișa `js`, punctul 5).
Limită: Genericul explicit nu verifică ce pui în state la runtime. Un răspuns de la API tot trebuie validat (FE-10).
La interviu: „`useState` deduce tipul din valoarea inițială. Pentru `null` dau genericul, `useState<User | null>(null)`.”
Verificare: Ce tip are `u` din `useState<User | null>(null)` după `if (u) {…}`, înăuntru?
Răspuns verificare: `User`. Verificarea de truthiness restrânge tipul (narrowing).
Varianta greșită B: TypeScript nu deduce din apelurile `setU`. Deduce doar din valoarea inițială.
Varianta greșită C: `null` nu devine `any`. Rămâne tipul `null`.
Varianta greșită D: Un obiect nu e compatibil cu `null` sub `strictNullChecks`. Eroarea e TS2353.

### ts-09
Pe scurt: `names[0]` devine `string | undefined`, iar `first.toUpperCase()` pică (TS18048).
Scop: Știi ce nu prinde `strict`. Apare ca „e `strict` destul?”.
Mecanism: Implicit, indexarea unui `string[]` dă `string`, chiar dacă la runtime `names[5]` e `undefined`. `noUncheckedIndexedAccess` adaugă `undefined` la orice acces prin index. Nu face parte din `strict`: îl pornești separat, în `tsconfig`.
Aplicare:
```ts
// tsconfig.json:
// "noUncheckedIndexedAccess": true
const first = names[0];
if (first) first.toUpperCase();
// sau: first?.toUpperCase()
```
Legătură: Același tip de bug ca `Cannot read properties of undefined` din fișa `fedebug`. În Python, `names[5]` aruncă `IndexError`, în JavaScript întoarce `undefined`.
Limită: Flag-ul face codul mai verbos: după un `for` pe indici trebuie verificat fiecare acces. `for…of` nu e afectat.
La interviu: „`strict` nu include `noUncheckedIndexedAccess`. Îl pornesc, ca un acces prin index să dea `T | undefined`.”
Verificare: Prinde `noUncheckedIndexedAccess` un `as User` greșit?
Răspuns verificare: Nu. Flag-ul privește doar accesul prin index. `as` rămâne promisiunea ta.
Varianta greșită B: `strict` nu include flag-ul. Îl pornești separat.
Varianta greșită C: Tipul devine `string | undefined`, nu `string`. Iar `names[5]` e vizibil ca posibil `undefined`.
Varianta greșită D: Indexarea rămâne permisă. Flag-ul doar adaugă `undefined` la rezultat.
