// Testele referințelor de schelet TypeScript: `tsc --strict --noEmit` (tipurile)
// și vitest (comportamentul). O eroare de tip așteptată se marchează cu
// `// @ts-expect-error`: dacă eroarea dispare, tsc se plânge de directivă.
import { expect, test } from "vitest";

import {
  assertNever,
  label,
  reducer,
  pluck,
  byId,
  isUser,
  parseUser,
  show,
  patch,
  toRow,
  ROLES,
  PERMS,
  can,
  isRole,
  Square,
  loadAll,
  reasonOf,
  type Result,
  type Action,
  type Role,
  type Perm,
  type Todo,
  type TodoPatch,
  type TodoRow,
  type Nullable,
  type Config,
  type Shape,
  type Labeled,
  type Id,
} from "./skel_ts";

// egalitate exactă de tipuri: dacă A și B diferă, atribuirea `= true` nu compilează
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

test("label: câte o ramură pentru fiecare stare", () => {
  expect(label({ status: "loading" })).toBe("se încarcă…");
  expect(label({ status: "ok", data: ["a", "b"] })).toBe("2 rezultate");
  expect(label({ status: "error", message: "500" })).toBe("eroare: 500");
});

test("îngustare: `data` există doar pe starea ok", () => {
  function peek(r: Result) {
    // @ts-expect-error `data` nu există pe toate stările uniunii
    return r.data;
  }
  expect(peek({ status: "loading" })).toBeUndefined();
});

test("un caz nou în uniune nu compilează fără ramura lui", () => {
  type Extended = Result | { status: "stale"; since: number };

  // fără ramura pentru "stale", `r` nu e `never` în default
  function incomplete(r: Extended): string {
    switch (r.status) {
      case "loading":
        return "se încarcă…";
      case "ok":
        return "ok";
      case "error":
        return "eroare";
      default:
        // @ts-expect-error "stale" încă nu are ramură
        return assertNever(r);
    }
  }

  // cu ramura lui, același default compilează fără nicio directivă
  function complete(r: Extended): string {
    switch (r.status) {
      case "loading":
        return "se încarcă…";
      case "ok":
        return "ok";
      case "error":
        return "eroare";
      case "stale":
        return "vechi de " + r.since;
      default:
        return assertNever(r);
    }
  }

  expect(complete({ status: "stale", since: 3 })).toBe("vechi de 3");
  // și la runtime ramura lipsă se vede: aruncă, nu întoarce tăcut ceva
  expect(() => incomplete({ status: "stale", since: 3 })).toThrow(/stale/);
});

test("assertNever aruncă la runtime pentru date din afara tipului", () => {
  const fromJson = JSON.parse('{"status":"retrying"}') as Result;
  expect(() => label(fromJson)).toThrow(/neacoperit.*retrying/);
});

// ---------- reducer exhaustiv (useReducer) ----------

test("reducer: fiecare acțiune duce în starea ei", () => {
  const start: Result = { status: "loading" };
  const ok = reducer(start, { type: "done", data: ["a"] });
  expect(ok).toEqual({ status: "ok", data: ["a"] });
  expect(reducer(ok, { type: "fail", message: "x" })).toEqual({
    status: "error",
    message: "x",
  });
  expect(reducer(ok, { type: "fetch" })).toEqual({ status: "loading" });
});

test("reducer: nu mută starea veche, întoarce una nouă", () => {
  const start: Result = { status: "ok", data: ["a"] };
  const next = reducer(start, { type: "done", data: ["b"] });
  expect(next).not.toBe(start);
  expect(start).toEqual({ status: "ok", data: ["a"] });
});

test("reducer: o acțiune nouă nu compilează fără ramura ei", () => {
  type Extended = Action | { type: "reset" };
  function incomplete(a: Extended): string {
    switch (a.type) {
      case "fetch":
      case "done":
      case "fail":
        return a.type;
      default:
        // @ts-expect-error "reset" încă nu are ramură
        return assertNever(a);
    }
  }
  expect(() => incomplete({ type: "reset" })).toThrow(/reset/);
});

// ---------- generice cu constrângeri ----------

const users = [
  { id: "a", name: "Ana", age: 30 },
  { id: "b", name: "Dan", age: 41 },
];

test("pluck: tipul rezultatului urmează cheia aleasă", () => {
  const names: string[] = pluck(users, "name");
  const ages: number[] = pluck(users, "age");
  expect(names).toEqual(["Ana", "Dan"]);
  expect(ages).toEqual([30, 41]);

  const t1: Equal<ReturnType<typeof pluck<(typeof users)[0], "name">>, string[]> = true;
  expect(t1).toBe(true);

  // @ts-expect-error cheia "nope" nu există pe element
  pluck(users, "nope");
  // @ts-expect-error `name` e string, nu number
  const wrong: number[] = pluck(users, "name");
  expect(wrong).toBeDefined();
  expect(pluck([], "x" as never)).toEqual([]);
});

test("byId: cere un câmp `id` și păstrează tipul elementului", () => {
  const map = byId(users);
  expect(map["b"]?.name).toBe("Dan");
  const age: number | undefined = map["a"]?.age;
  expect(age).toBe(30);
  // @ts-expect-error elementele nu au `id`
  byId([{ name: "fără id" }]);
  expect(byId([])).toEqual({});
  expect(byId([{ id: "x" }, { id: "x" }])).toEqual({ x: { id: "x" } });
});

// ---------- narrowing, type guard, unknown din JSON ----------

test("isUser: verifică structura, nu doar că e obiect", () => {
  expect(isUser({ id: 1, name: "Ana" })).toBe(true);
  expect(isUser({ id: 1, name: "Ana", extra: true })).toBe(true);
  for (const bad of [null, undefined, 5, "x", [], {}, { id: "1", name: "A" },
    { id: 1 }, { name: "A" }, { id: 1, name: 2 }]) {
    expect(isUser(bad)).toBe(false);
  }
});

test("parseUser: JSON valid trece, JSON cu formă greșită aruncă", () => {
  const u = parseUser('{"id": 7, "name": "Ana"}');
  const id: number = u.id;
  expect(id).toBe(7);
  expect(() => parseUser('{"id": "7", "name": "Ana"}')).toThrow("JSON invalid");
  expect(() => parseUser("null")).toThrow("JSON invalid");
  expect(() => parseUser("{")).toThrow(SyntaxError);
});

test("unknown nu se folosește fără verificare", () => {
  const data: unknown = JSON.parse('{"id":1,"name":"A"}');
  // @ts-expect-error `unknown` nu are proprietăți
  const bad = data.name;
  expect(bad).toBe("A");
  if (isUser(data)) {
    const ok: string = data.name;
    expect(ok).toBe("A");
  }
});

test("show: narrowing cu null și typeof", () => {
  expect(show(null)).toBe("gol");
  expect(show("ab")).toBe("AB");
  expect(show(3)).toBe("3.0");
});

// ---------- utility types și mapped type ----------

const todo: Todo = { id: 1, title: "scrie", done: false };

test("patch: aplică doar câmpurile date, fără id", () => {
  expect(patch(todo, { done: true })).toEqual({ id: 1, title: "scrie", done: true });
  expect(patch(todo, {})).toEqual(todo);
  expect(patch(todo, { done: true })).not.toBe(todo);
  // @ts-expect-error id nu face parte din patch
  patch(todo, { id: 2 });
  // @ts-expect-error tip greșit pentru `done`
  patch(todo, { done: "da" });
});

test("tipurile derivate au forma cerută", () => {
  const a: Equal<TodoPatch, { title?: string; done?: boolean }> = true;
  const b: Equal<TodoRow, { id: number; title: string }> = true;
  const c: Equal<Nullable<Todo>, { id: number | null; title: string | null; done: boolean | null }> = true;
  expect([a, b, c]).toEqual([true, true, true]);
  expect(toRow(todo)).toEqual({ id: 1, title: "scrie" });
  const n: Nullable<Todo> = { id: null, title: null, done: null };
  expect(n.id).toBeNull();
  // @ts-expect-error toate cheile rămân obligatorii în Nullable
  const partial: Nullable<Todo> = { id: 1 };
  expect(partial).toBeDefined();
});

// ---------- as const, literali, satisfies ----------

// cod care trebuie doar să (nu) compileze, fără să ruleze
const typeOnly = (_: () => void): void => {};

test("ROLES e un tuple readonly, iar Role e uniunea de literali", () => {
  expect([...ROLES]).toEqual(["admin", "editor", "viewer"]);
  const t: Equal<Role, "admin" | "editor" | "viewer"> = true;
  expect(t).toBe(true);
  // liniile de mai jos sunt doar pentru compilator: nu se execută
  typeOnly(() => {
    // @ts-expect-error tuple-ul e readonly
    ROLES.push("root");
    // @ts-expect-error "root" nu e un Role
    can("root", "read");
  });
  expect([...ROLES]).toHaveLength(3);
});

test("PERMS păstrează literalii, iar satisfies verifică toate rolurile", () => {
  const p: Equal<Perm, "read" | "write" | "delete"> = true;
  expect(p).toBe(true);
  const first: "read" = PERMS.viewer[0];
  expect(first).toBe("read");
  // @ts-expect-error `delete` nu există pe viewer
  const d: "delete" = PERMS.viewer[0];
  expect(d).toBe("read");
  // satisfies prinde un rol lipsă la compilare
  // @ts-expect-error lipsesc editor și viewer
  const incomplete = { admin: ["read"] } satisfies Record<Role, readonly string[]>;
  expect(incomplete).toBeDefined();
});

test("can și isRole", () => {
  expect(can("admin", "delete")).toBe(true);
  expect(can("editor", "delete")).toBe(false);
  expect(can("viewer", "read")).toBe(true);
  expect(can("viewer", "write")).toBe(false);
  typeOnly(() => {
    // @ts-expect-error "exec" nu e o permisiune
    can("admin", "exec");
  });
  expect(isRole("admin")).toBe(true);
  expect(isRole("root")).toBe(false);
  const s: string = "viewer";
  if (isRole(s)) {
    const r: Role = s;
    expect(r).toBe("viewer");
  }
});

// ---------- interface vs type ----------

test("interface: extends, implements și declaration merging", () => {
  const sq = new Square(3);
  expect(sq.area()).toBe(9);
  const cfg: Config = { url: "x", retries: 2 };
  expect(cfg.retries).toBe(2);
  // @ts-expect-error clasa nu are `area`
  class Bad implements Shape {}
  expect(Bad).toBeDefined();
});

test("type: uniuni, tuple și intersecții", () => {
  const ids: Id[] = [1, "a"];
  const l: Labeled = { name: "n", label: "L" };
  expect(ids).toHaveLength(2);
  expect(l.label).toBe("L");
  // @ts-expect-error `Id` nu acceptă boolean
  const bad: Id = true;
  expect(bad).toBe(true);
  // @ts-expect-error lipsește `label`
  const noLabel: Labeled = { name: "n" };
  expect(noLabel).toBeDefined();
});

// ---------- Promise.allSettled + erori în TS ----------

test("loadAll: reușitele și eșecurile, în ordinea intrării", async () => {
  const fetchOne = async (id: string) => {
    if (id === "b") throw new Error("404 b");
    if (id === "d") throw "text simplu";
    return id.toUpperCase();
  };
  const res = await loadAll(["a", "b", "c", "d"], fetchOne);
  expect(res.ok).toEqual(["A", "C"]);
  expect(res.failed).toEqual([
    { id: "b", reason: "404 b" },
    { id: "d", reason: "text simplu" },
  ]);
  const ok: string[] = res.ok;
  expect(ok).toHaveLength(2);
});

test("loadAll: un eșec nu oprește restul, nici când aruncă sincron", async () => {
  const seen: string[] = [];
  const fetchOne = (id: string): Promise<number> => {
    seen.push(id);
    if (id === "x") throw new Error("sync x");
    return Promise.resolve(id.length);
  };
  const res = await loadAll(["x", "yy", "zzz"], fetchOne);
  expect(res.ok).toEqual([2, 3]);
  expect(res.failed).toEqual([{ id: "x", reason: "sync x" }]);
  expect(seen).toEqual(["x", "yy", "zzz"]);
  expect(await loadAll([], fetchOne)).toEqual({ ok: [], failed: [] });
});

test("reasonOf: Error, șir, obiect; catch dă unknown", () => {
  expect(reasonOf(new Error("m"))).toBe("m");
  expect(reasonOf("s")).toBe("s");
  expect(reasonOf(404)).toBe("404");
  try {
    JSON.parse("{");
  } catch (e) {
    // @ts-expect-error în catch, `e` e unknown (strict)
    const m: string = e.message;
    expect(typeof m).toBe("string");
    expect(typeof reasonOf(e)).toBe("string");
  }
});
