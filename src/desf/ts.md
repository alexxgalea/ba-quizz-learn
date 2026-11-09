<!-- Desfășurările fișei `ts` (14 puncte: 1–8 din tichetul 06, 9–14 harta uneltelor, 9 nov. 2026; formatul de frontend: 90–140 de cuvinte, ~250 la `Greu: da`, exemplu ≤ 14 rânduri cu ✗ / ✓, `Pas cu pas` ≤ 8 rânduri). Blocurile `ts` trec prin desf_examples (tsc --strict; `// ! TSxxxx` pe rândul cu eroarea voită), TSX-ul (punctul 7) e verificat de mână cu tsc, C++ cu g++. Format și reguli: lib.mjs (checkDesf, DESF_LIMITS_FE), .scratch/frontend-extins/spec.md. Faptele: research/interview-facts.md, secțiunile 47 și 49. -->

### harta
Problema: Un obiect cu o proprietate în plus trece într-un loc și pică în altul, un `as` ascunde un bug până în producție, iar cu `strict` pornit `names[0]` tot nu poate fi `undefined`. TypeScript e un verificator care rulează la compilare: dă tipuri valorilor, le compară după formă și le șterge înainte ca programul să ruleze. Modulul răspunde la patru întrebări: cum compară TypeScript tipurile, cum le restrângi și le generalizezi, cât te poți încrede în ele și cum se aplică în React și cu `strict`. Punctele 9–14 sunt harta uneltelor: pentru fiecare tip sau operator, ce face, când îl alegi și ce capcană are. Validarea datelor din rețea e în `frontend`, la punctul 10.

Grupuri:
- 1–2: cum compară TypeScript tipurile (formă, `type` și `interface`)
- 3–5: cum le restrângi și le generalizezi (narrowing, generics, utility types)
- 6: cât te poți încrede în ele (`as`, `!`, `satisfies`)
- 7–8: în practică: React și `strict`
- 9: tipurile-limită (`any`, `unknown`, `never`, `void`)
- 10–11: tipuri construite din altele (utility types, tipuri derivate din cod)
- 12: un set fix de valori (uniune de literale, `enum`, `as const`)
- 13–14: tipuri calculate și forma funcțiilor (mapped, conditional, tupluri, `readonly`)

### 1
Greu: da
Problema: `UserId` și `OrderId` au același câmp, `v: number`. Treci un `OrderId` unei funcții care cere `UserId`, iar compilatorul tace. Pe un literal cu un câmp în plus, același compilator se plânge.
Ideea: Tiparea e structurală: un tip e compatibil dacă are câmpurile cerute, indiferent de nume. Un `type` nu creează un tip nou, doar un nume pentru o formă. Excepția e verificarea proprietăților în plus (excess property check): un literal de obiect scris direct la atribuire sau ca argument nu poate avea câmpuri necunoscute (TS2353), fiindcă compilatorul bănuiește o greșeală de scriere. O variabilă cu aceleași câmpuri trece. Ca să le deosebești, adaugi un câmp-etichetă sau un membru `private`.
Exemplu:
```ts
class UserId { v = 1 }
class OrderId { v = 2 }
function load(id: UserId) {}
load(new OrderId());  // ✓ trece
type P = { x: number };
const o = { x: 1, y: 2 };
const a: P = o;  // ✓ variabilă
// ✗ literal proaspăt, y în plus
const b: P = {
  x: 1, y: 2,  // ! TS2353
};
```
În C++: `struct UserId { int v; }` și `struct OrderId { int v; }` sunt tipuri fără legătură: al doilea nu intră într-un parametru de primul tip, deși au același conținut.
Unde nu ține: C++ e nominal: numele tipului hotărăște, nu conținutul. În TypeScript hotărăște forma. Cel mai aproape de C++ e un template, care acceptă orice tip cu membrii folosiți. Un membru `private` face o clasă nominală, ca în C++.
Legătură: TS-01 și TS-02. În React, un obiect trecut printr-o variabilă ca props nu declanșează verificarea de la literal.

### 2
Greu: da
Problema: O bibliotecă îți cere să adaugi un câmp la un tip existent, iar cu `type` primești „Duplicate identifier”. Un coleg încearcă un `interface` pentru o uniune și nu merge.
Ideea: Ambele descriu forma unui obiect și, în cod obișnuit, sunt aproape interschimbabile. `interface` se poate redeschide: două declarații cu același nume se îmbină (declaration merging), și se extinde cu `extends`. `type` nu se poate redeclara (TS2300), dar poate numi uniuni, primitive și tupluri. La câmpuri conflictuale, `extends` dă eroare (TS2430), iar `&` dă `never`. Alege una și fii consecvent în proiect.
Exemplu:
```ts
interface I { a: number }
interface I { b: string }  // ✓
const i: I = { a: 1, b: "x" };
// ✗ un type nu se redeschide
type T = { a: 1 };  // ! TS2300
type T = { b: 2 };  // ! TS2300
type Id = string | number;  // ✓
```
Legătură: TS-03. Bibliotecile cer extinderea prin `interface` (de exemplu `Window` în `declare global`). În React, props se scriu de obicei ca `type Props = { … }`.

### 3
Greu: da
Problema: O funcție primește `string | number` și apelează `x.toFixed()`. Compilatorul refuză: nu știe ce e `x`. Un coleg scrie `x as number` și merge, până cade în producție la un string.
Ideea: Narrowing (restrângere) înseamnă că TypeScript îngustează tipul unei variabile în ramura unde o verificare l-a dovedit: `typeof`, `in`, `instanceof`, o egalitate, o verificare de truthiness sau tag-ul unei uniuni discriminate (un câmp literal comun, ca `k`). Verificarea trebuie să fie în cod, ca s-o vadă compilatorul. Un type guard `x is T` restrânge după regula ta: compilatorul te crede și nu citește corpul, deci un guard greșit minte.
Exemplu:
```ts
type V = string | number;
function f(x: V) {
  // ✗ nu știe ce e x
  x.toFixed();  // ! TS2339
  // ✓ verificarea restrânge tipul
  if (typeof x === "number") {
    return x.toFixed();
  }
  return x.length;
}
```
Pas cu pas:
```text
x: string | number
typeof x === "number"
  → x: number
restul: x: string
```
Legătură: TS-04 (guard care minte) și FE-10: pentru date din rețea, `unknown` plus verificări, nu `as`. Un `switch` pe un tag se restrânge la fel.

### 4
Greu: da
Problema: Scrii `first(xs: any[]): any` și pierzi tipul: rezultatul e `any`. Alt coleg scrie un generic, dar `xs[0].id` nu compilează, deși „știe” că elementele au `id`.
Ideea: Un generic are un parametru de tip, `T`, pe care compilatorul îl deduce din argumente: `first<T>(xs: T[]): T` întoarce `User` dacă primește `User[]`. Fără constrângere, `T` e orice tip, deci poți face doar ce merge pe orice tip. `T extends { id: number }` cere forma minimă, iar corpul poate citi `id`. Se pot declara mai mulți parametri, cu constrângeri între ei: `<T, K extends keyof T>`.
Exemplu:
```ts
// ✗ T poate fi orice
function bad<T>(xs: T[]) {
  return xs[0].id;  // ! TS2339
}
// ✓ forma minimă cerută
type H = { id: number };
function ok<T extends H>(xs: T[]) {
  return xs[0].id;
}
ok([{ id: 1, name: "a" }]);
```
În C++: `template<class T> T first(std::vector<T>& v)` face același lucru: `T` se deduce din argument. Fără constrângere explicită (în C++11/17), un template folosește orice operație pe `T`, iar eroarea apare la instanțiere.
Unde nu ține: Template-ul se instanțiază: compilatorul generează cod separat pentru `first<int>` și pentru `first<User>`. În TypeScript există o singură funcție, iar `T` dispare la runtime: nu poți face `new T()`, `typeof T` sau să afli ce e `T`.
Legătură: TS-05. Un `useQuery<User[]>` din TanStack (FE-04) e același mecanism: tipul dat se propagă până la `data`.

### 5
Problema: Un PATCH acceptă doar `name` și `email`, opționale. Copiezi tipul `User` într-un tip nou. Când `User` primește un câmp, copia rămâne în urmă și nimeni nu observă.
Ideea: Utility types derivă tipuri din altele, deci ai o singură sursă. `Partial<T>` face câmpurile opționale, `Readonly<T>` doar în citire, `Pick<T, K>` păstrează câmpurile `K`, `Omit<T, K>` le scoate, `Record<K, V>` face un obiect cu cheile `K`. `ReturnType<F>` dă tipul întors de `F`, iar `Awaited<P>` tipul din care o promisiune se rezolvă. `keyof T` dă cheile lui `T` ca uniune, iar `T["k"]` tipul unui câmp. Le combini de la interior spre exterior.
Exemplu:
```ts
type User = {
  id: number;
  name: string;
  email: string;
};
type Patch = Partial<
  Pick<User, "name" | "email">>;
const p: Patch = { name: "Ana" };
type Key = keyof User;
const k: Key = "age";  // ! TS2322
```
Pas cu pas:
```text
User: id, name, email
Pick "name" | "email": name, email
Partial: name?, email?
keyof User: "id" | "name" | "email"
```
Legătură: TS-06 și FE-10. Un PATCH către FastAPI se tipează așa, iar tipurile generate din OpenAPI-ul lui (`openapi-typescript`) sunt tipuri obișnuite, deci `Pick`, `Omit` și `Partial` merg direct pe ele. `Omit<User, "id">` e bun pentru formularul de creare.

### 6
Greu: da
Problema: Scrii `JSON.parse(raw) as User`, iar aplicația crapă la `user.id.toFixed()`, deși TypeScript n-a avertizat. Un `el!.remove()` face la fel când `el` e `null`.
Ideea: `as` nu convertește și nu verifică nimic la runtime: se șterge la compilare, deci o afirmație greșită nu aruncă. `!` promite că valoarea nu e `null` sau `undefined`, la fel de nesigur. `as const` face literalul readonly și îi păstrează valorile exacte (`"dark"`, nu `string`). `satisfies` (4.9) verifică forma unei valori fără să-i lărgească tipul, spre deosebire de o anotare, care îl înlocuiește. `as` pe tipuri fără legătură cere un pas prin `unknown`, ca să se vadă că forțezi.
Exemplu:
```ts
type U = { id: number };
const raw = '{ "id": "x" }';
const a = JSON.parse(raw) as U;
a.id.toFixed();  // ✗ crapă
const cfg = { m: "dark" } as const;
cfg.m = "light";  // ! TS2540
declare const el: Element | null;
el!.remove();  // ✗ promisiune
const pal = {
  red: [1],
} satisfies Record<"red", unknown>;
pal.red.map((x) => x);  // ✓
```
Legătură: TS-07 și FE-10 (datele din rețea). În Python, `typing.cast` face la fel: doar pentru verificator, fără nicio verificare la runtime.

### 7
Problema: Un `onChange` cu `e: any`, `children` netipate, iar `useState(null)` refuză un utilizator. Codul merge, dar autocomplete-ul și verificările dispar.
Ideea: Props se tipează ca un tip obiect. `children?: ReactNode` acoperă text, JSX, liste și `null`. Evenimentele au tipuri generice după elementul DOM: `ChangeEvent<HTMLInputElement>` la `onChange`, `MouseEvent<HTMLButtonElement>` la click. Scris inline, tipul handlerului se deduce din prop. Tipurile ajută și la refactorizare: dacă schimbi un prop, compilatorul arată toate locurile care nu se mai potrivesc. `useState` deduce tipul din valoarea inițială, deci pentru `null` dai genericul: `useState<User | null>(null)`. La fel, `useState([])` dă `never[]`.
Exemplu:
```tsx
type Props = {
  title: string;
  children?: ReactNode;
};
const [u, setU] = useState(null);
// ✗ setU({ id: 1 }): u e null
const [v, setV] =
  useState<User | null>(null);  // ✓
const onChange = (
  e: ChangeEvent<HTMLInputElement>,
) => setQ(e.target.value);
```
Legătură: TS-08. Fișa `react` explică inputurile controlate (punctul 4), la care se leagă `onChange`.

### 8
Greu: da
Problema: Pornești `strict` și crezi că ești acoperit, dar `names[5]` tot are tipul `string`, iar `JSON.parse` întoarce `any`, deci bug-urile din date trec.
Ideea: `strict` pornește o familie de verificări: `strictNullChecks` (`null` și `undefined` nu mai intră în orice tip), `noImplicitAny` (un parametru fără tip e eroare), `strictPropertyInitialization`, `useUnknownInCatchVariables` (`e` din `catch` e `unknown`) și altele. E implicit activ în TypeScript 6 și 7. `noUncheckedIndexedAccess` nu face parte din el: abia cu el `arr[0]` are tipul `T | undefined`. `strict` nu prinde `as`, `any` din biblioteci sau datele din rețea: acolo validezi la graniță.
Exemplu:
```ts
function g(s: string | undefined) {
  // ✗ s poate fi undefined
  return s.length;  // ! TS18048
}
function h(x) {  // ! TS7006
  return x;
}
try {
} catch (e) {
  e.message;  // ! TS18046
}
```
Legătură: TS-09. Același bug ca `Cannot read properties of undefined` din fișa `fedebug`. În Python, `names[5]` aruncă `IndexError`; în JavaScript dă `undefined`.

### 9
Greu: da
Problema: Răspunsul de la API e tipat `any`, iar `data.user.name` compilează. În producție `user` lipsește și aplicația cade cu `Cannot read properties of undefined`, deși TypeScript nu s-a plâns.
Ideea: Patru tipuri marchează capetele sistemului. `any` oprește verificarea: orice operație trece, iar lipsa de verificare se transmite în tot ce atinge valoarea. `unknown` acceptă orice valoare, dar nu te lasă s-o folosești până n-o restrângi (`typeof`, `in`, un type guard, o schemă zod). E tipul corect pentru JSON, mesaje și pentru `e` din `catch`, care sub `strict` e `unknown`. `never` e tipul fără valori: îl întoarce o funcție care aruncă mereu și rămâne în ramura unui `switch` care a tratat toate cazurile. `void` spune că rezultatul unei funcții nu se folosește, ca la un callback `onClick`.
Exemplu:
```ts
declare function read(): unknown;
const raw = read();
// ✗ unknown nu se folosește direct
raw.user;  // ! TS18046
// ✓ restrâns înainte
if (typeof raw === "object" &&
  raw !== null && "user" in raw) {
  console.log(raw.user);
}
function fail(m: string): never {
  throw new Error(m);
}
```
Legătură: TS-10. FE-10 pune `unknown` și `never` în practică, cu validarea la graniță. În Python, `Any` din `typing` oprește verificarea la fel, iar `object` seamănă cu `unknown`: mypy cere o restrângere înainte de folosire.

### 10
Greu: da
Problema: Formularul de creare are un tip `NewUser` scris de mână, cu câmpurile lui `User` minus `id`. Cineva adaugă `email` în `User` și uită de `NewUser`, iar API-ul primește obiecte fără email.
Ideea: Utility types construiesc un tip din altul, ca o schimbare în `User` să ajungă peste tot. `Partial<T>` face toate câmpurile opționale: corpul unui PATCH sau o ciornă de formular. `Required<T>` face invers. `Readonly<T>` interzice reatribuirea câmpurilor, de exemplu la o configurație. `Pick<T, K>` păstrează câteva câmpuri (props mai mici), iar `Omit<T, K>` le scoate (datele de creare, fără `id`). `Record<K, V>` face un obiect cu exact cheile `K`: cu `K` o uniune, compilatorul cere o valoare pentru fiecare status. Două capcane: toate lucrează pe un singur nivel, deci `Partial` nu atinge obiectele imbricate, iar `Omit` acceptă orice cheie, chiar și una scrisă greșit.
Exemplu:
```ts
type User = {
  id: number; name: string;
};
// ✓ derivate, nu copiate
type NewUser = Omit<User, "id">;
type Patch = Partial<User>;
type St = "open" | "done";
type Labels = Record<St, string>;
// ✗ lipsește "done"
const lb: Labels = { // ! TS2741
  open: "Deschis",
};
```
Legătură: TS-11, TS-12. În DRF e aceeași idee ca un serializer cu `partial=True` pentru PATCH și `read_only_fields = ["id"]` la creare.

### 11
Greu: da
Problema: `getUser` întoarce un obiect, iar componenta care îl afișează are un tip `User` copiat de mână. Funcția primește un câmp nou, tipul copiat nu, iar diferența iese abia în producție.
Ideea: În loc să copiezi un tip, îl derivi din cod. `typeof x`, scris unde se așteaptă un tip, dă tipul unei valori. `keyof T` dă uniunea cheilor, iar `T[K]` tipul unui câmp (`User["id"]`). `ReturnType<typeof f>` și `Parameters<typeof f>` iau rezultatul și parametrii unei funcții. `Awaited<T>` desface o `Promise`, deci la o funcție `async` scrii `Awaited<ReturnType<typeof getUser>>`. `NonNullable<T>` scoate `null` și `undefined`, `Exclude<U, X>` scoate membri dintr-o uniune, iar `Extract<U, X>` îi păstrează pe cei potriviți. Capcana: un generic primește tipuri, deci `ReturnType<getUser>` pică (TS2749), fiindcă `getUser` e o valoare.
Exemplu:
```ts
async function getUser() {
  return { id: 1, name: "Ana" };
}
// ✗ getUser e o valoare
type A =
  ReturnType<getUser>;  // ! TS2749
// ✓ tipul funcției, apoi rezultatul
type User = Awaited<
  ReturnType<typeof getUser>>;
// keyof User: "id" | "name"
type K = keyof User;
type S = Exclude<"a" | "b", "a">;
```
Pas cu pas:
```text
typeof getUser
→ () => Promise<{ id; name }>
ReturnType<…>
→ Promise<{ id; name }>
Awaited<…>
→ { id: number; name: string }
```
Legătură: TS-13, TS-14. Tipurile generate din OpenAPI-ul FastAPI (punctul 5) urmează aceeași regulă: o singură sursă, din care derivi restul.

### 12
Greu: da
Problema: Statusurile unei comenzi stau într-un `enum`, iar un coleg rulează fișierul direct cu Node, care doar șterge tipurile, și primește o eroare. În altă parte, lista pentru un dropdown e copiată separat de tip și rămâne în urmă.
Ideea: Ai trei feluri de a descrie un set fix de valori. O uniune de literale (`type St = "open" | "done"`) dispare la compilare, are autocomplete și e alegerea obișnuită. `enum` are efect la runtime: generează un obiect, iar unul numeric are și mapare inversă (`Dir[0]` e `"Up"`). Opțiunea `erasableSyntaxOnly` (TS 5.8) îl interzice, ca fișierul să poată rula după simpla ștergere a tipurilor, cum face Node. Când îți trebuie și lista la runtime (un dropdown, o validare), scrii array-ul o singură dată, cu `as const`, și derivi uniunea din el: `typeof ROLES[number]`. O sursă, două utilizări.
Exemplu:
```ts
// ✗ cod la runtime, mapare inversă
enum Dir { Up, Down }
console.log(Dir[0]);  // "Up"
// ✓ lista și tipul dintr-o sursă
const ROLES =
  ["admin", "user"] as const;
type Role = typeof ROLES[number];
const ok: Role = "admin";
const n: Role = "guest"; // ! TS2322
ROLES.map((r) => r.toUpperCase());
```
În C++: `enum class Dir { Up, Down };` (C++11) e un tip nou, nominal, cu valori întregi: `Dir::Up` nu se convertește implicit la `int` și nu intră unde se cere alt `enum`.
Unde nu ține: C++ nu are un tip pentru „unul dintre aceste string-uri”. Un `enum` C++ lasă la runtime doar constante întregi; un `enum` TypeScript devine un obiect pe care îl poți parcurge, cu mapare inversă. O uniune de literale nu există deloc la runtime.
Legătură: TS-15. În Django, `TextChoices` urmează ideea lui `as const`: o singură listă dă și valorile din baza de date, și opțiunile din formular.

### 13
Greu: da
Problema: În tipurile unei biblioteci dai de `{ [K in keyof T]?: T[K] }` și de `T extends … ? … : …` și nu știi cum să le citești. Un tip ajutător scris de tine transformă `string | number` în altceva decât te așteptai.
Ideea: Tipurile se pot calcula din alte tipuri. Un mapped type trece prin cheile unui tip și produce câte o proprietate pentru fiecare: `{ [K in keyof T]?: T[K] }` e chiar definiția lui `Partial`. Un conditional type, `T extends U ? X : Y`, alege un tip după formă, ca un `if` la compilare. Când `T` e un parametru generic și primește o uniune, condiția se aplică separat pe fiecare membru: `ToArr<string | number>` dă `string[] | number[]`. Ca să tratezi uniunea întreagă, scrii `[T] extends [U]`. `infer R` scoate o bucată din tip: așa e scris `ReturnType`. Template literal types construiesc tipuri de string: din `"click"` fac `"onClick"`. În codul aplicației le scrii rar; contează să le poți citi.
Exemplu:
```ts
type Ret<F> =
  F extends () => infer R
    ? R : never;
type N = Ret<() => 1>;  // 1
type ToArr<T> =
  T extends unknown ? T[] : never;
type SN = ToArr<string | number>;
// ✗ string[] | number[], nu mixt
const a: SN = [1, "x"]; // ! TS2322
type Whole<T> =
  [T] extends [any] ? T[] : never;
type W = Whole<string | number>;
const b: W = [1, "x"];  // ✓
```
În C++: `std::conditional<B, X, Y>` (C++11) alege un tip după o condiție la compilare, iar specializarea parțială a unui template scoate bucăți dintr-un tip, cum face `infer`.
Unde nu ține: În C++ condiția e o valoare `bool` calculată la compilare (de obicei dintr-un trait ca `std::is_same`), nu o verificare de formă. Nu există distribuirea peste uniuni, fiindcă C++ nu are tipuri-uniune: `std::variant` e un tip obișnuit.
Legătură: TS-17. `Partial`, `ReturnType` și `Exclude` din punctele 10–11 sunt scrise exact așa în `lib.es5.d.ts`.

### 14
Greu: da
Problema: Un custom hook întoarce `[on, toggle]`, ca `useState`, dar la `toggle()` compilatorul spune că expresia nu se poate apela. Altă funcție primește un array din props și îl sortează pe loc, iar lista părintelui își schimbă ordinea.
Ideea: Un tuplu (`[boolean, () => void]`) are lungime fixă și un tip pe fiecare poziție. Un literal de array fără alt indiciu e dedus ca `T[]`, cu `T` uniunea elementelor, deci `[on, toggle]` devine `(boolean | (() => void))[]`. `as const` sau un tip de retur explicit îl face tuplu, cum face `useState`. `readonly T[]` scoate din tip metodele care modifică pe loc (`push`, `sort`, `splice`); rămân `map`, `filter` și `toSorted`. `x?: T` înseamnă că proprietatea poate lipsi, iar la citire primești `T | undefined`. Overload-urile dau unei funcții mai multe semnături când tipul rezultatului depinde de argument: `parse(s: string): number` și `parse(s: string[]): number[]`.
Exemplu:
```ts
function useToggle() {
  let on = false;
  const flip = () => { on = !on; };
  // ✓ tuplu, nu array de uniuni
  return [on, flip] as const;
}
const [on, flip] = useToggle();
flip();
function f(xs: readonly string[]) {
  // ✗ sort modifică pe loc
  xs.sort();  // ! TS2339
  return [...xs].sort();  // ✓ copie
}
```
Legătură: TS-16. RE-03: în React state-ul se înlocuiește, nu se sortează pe loc, iar `readonly` prinde greșeala la compilare. În Python, un `tuple` e tot o secvență fixă și imutabilă.
