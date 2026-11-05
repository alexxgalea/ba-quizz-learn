<!-- Desfășurările fișei `ts` (8 puncte; formatul de frontend: 90–140 de cuvinte, ~250 la `Greu: da`, exemplu ≤ 14 rânduri cu ✗ / ✓, `Pas cu pas` ≤ 8 rânduri). Blocurile `ts` trec prin desf_examples (tsc --strict; `// ! TSxxxx` pe rândul cu eroarea voită), TSX-ul (punctul 7) e verificat de mână cu tsc, C++ cu g++. Format și reguli: lib.mjs (checkDesf, DESF_LIMITS_FE), .scratch/frontend-extins/spec.md. Faptele: research/interview-facts.md, secțiunea 47. -->

### harta
Problema: Un obiect cu o proprietate în plus trece într-un loc și pică în altul, un `as` ascunde un bug până în producție, iar cu `strict` pornit `names[0]` tot nu poate fi `undefined`. TypeScript e un verificator care rulează la compilare: dă tipuri valorilor, le compară după formă și le șterge înainte ca programul să ruleze. Modulul răspunde la patru întrebări: cum compară TypeScript tipurile, cum le restrângi și le generalizezi, cât te poți încrede în ele și cum se aplică în React și cu `strict`. Validarea datelor din rețea e în `frontend`, la punctul 10.

Grupuri:
- 1–2: cum compară TypeScript tipurile (formă, `type` și `interface`)
- 3–5: cum le restrângi și le generalizezi (narrowing, generics, utility types)
- 6: cât te poți încrede în ele (`as`, `!`, `satisfies`)
- 7–8: în practică: React și `strict`

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
Legătură: TS-06. Un PATCH către FastAPI se tipează așa. `Omit<User, "id">` e complementul lui `Pick`, bun pentru formularul de creare.

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
