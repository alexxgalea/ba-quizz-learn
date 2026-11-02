// Referințele de schelet TypeScript.
// Fiecare secțiune „=== s-… ===” ajunge în aplicație
// (build.mjs); testele sunt în skel_ts.test.ts.
// `export`-urile stau după secțiune, ca să nu
// încarce codul de scris din memorie.

// === s-frontend-union-never ===
type Result =
  | { status: "loading" }
  | { status: "ok"; data: string[] }
  | { status: "error"; message: string };

function assertNever(x: never): never {
  throw new Error(
    "neacoperit: " + JSON.stringify(x),
  );
}

function label(r: Result): string {
  switch (r.status) {
    case "loading":
      return "se încarcă…";
    case "ok":
      return r.data.length + " rezultate";
    case "error":
      return "eroare: " + r.message;
    default:
      return assertNever(r);
  }
}

// aceeași formă, pe acțiuni (useReducer)
type Action =
  | { type: "fetch" }
  | { type: "done"; data: string[] }
  | { type: "fail"; message: string };

function reducer(
  _: Result,
  a: Action,
): Result {
  switch (a.type) {
    case "fetch":
      return { status: "loading" };
    case "done":
      return {
        status: "ok",
        data: a.data,
      };
    case "fail":
      return {
        status: "error",
        message: a.message,
      };
    default:
      return assertNever(a);
  }
}
// === end ===

// === s-frontend-generics ===
function pluck<T, K extends keyof T>(
  items: T[],
  key: K,
): T[K][] {
  return items.map((x) => x[key]);
}

function byId<T extends { id: string }>(
  items: T[],
): Record<string, T> {
  const out: Record<string, T> = {};
  for (const x of items) out[x.id] = x;
  return out;
}
// === end ===

// === s-frontend-narrowing ===
interface User {
  id: number;
  name: string;
}

function isUser(x: unknown): x is User {
  return (
    typeof x === "object" &&
    x !== null &&
    "id" in x &&
    typeof x.id === "number" &&
    "name" in x &&
    typeof x.name === "string"
  );
}

function parseUser(json: string): User {
  const data: unknown = JSON.parse(json);
  if (!isUser(data)) {
    throw new Error("JSON invalid");
  }
  return data;
}

function show(v: string | number | null) {
  if (v === null) return "gol";
  return typeof v === "string"
    ? v.toUpperCase()
    : v.toFixed(1);
}
// === end ===

// === s-frontend-utility-types ===
interface Todo {
  id: number;
  title: string;
  done: boolean;
}

type TodoPatch = Partial<
  Omit<Todo, "id">
>;
type TodoRow = Pick<Todo, "id" | "title">;
type Nullable<T> = {
  [K in keyof T]: T[K] | null;
};

function patch(
  t: Todo,
  p: TodoPatch,
): Todo {
  return { ...t, ...p };
}

function toRow(t: Todo): TodoRow {
  return { id: t.id, title: t.title };
}
// === end ===

// === s-frontend-const-satisfies ===
const ROLES = [
  "admin",
  "editor",
  "viewer",
] as const;
type Role = (typeof ROLES)[number];

const PERMS = {
  admin: ["read", "write", "delete"],
  editor: ["read", "write"],
  viewer: ["read"],
} as const satisfies Record<
  Role,
  readonly string[]
>;
type Perm = (typeof PERMS)[Role][number];

function can(role: Role, perm: Perm) {
  const list: readonly string[] =
    PERMS[role];
  return list.includes(perm);
}

function isRole(s: string): s is Role {
  const all: readonly string[] = ROLES;
  return all.includes(s);
}
// === end ===

// === s-frontend-interface-type ===
interface Shape {
  area(): number;
}
interface Named {
  name: string;
}
interface Circle extends Shape, Named {
  r: number;
}

class Square implements Shape {
  constructor(private side: number) {}
  area() {
    return this.side ** 2;
  }
}

// doar `type`: uniuni, tuple, intersecții
type Id = string | number;
type Pair = [number, number];
type Labeled = Named & { label: string };

// doar `interface` se redeschide (merge)
interface Config {
  url: string;
}
interface Config {
  retries?: number;
}
// === end ===

// === s-frontend-allsettled ===
type Loaded<T> = {
  ok: T[];
  failed: {
    id: string;
    reason: string;
  }[];
};

function reasonOf(e: unknown): string {
  return e instanceof Error
    ? e.message
    : String(e);
}

async function loadAll<T>(
  ids: string[],
  fetchOne: (id: string) => Promise<T>,
): Promise<Loaded<T>> {
  const res = await Promise.allSettled(
    ids.map(async (id) => fetchOne(id)),
  );
  const out: Loaded<T> = {
    ok: [],
    failed: [],
  };
  res.forEach((r, i) => {
    if (r.status === "fulfilled") {
      out.ok.push(r.value);
    } else {
      out.failed.push({
        id: ids[i],
        reason: reasonOf(r.reason),
      });
    }
  });
  return out;
}
// === end ===

export {
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
};
export type {
  Result,
  Action,
  User,
  Todo,
  TodoPatch,
  TodoRow,
  Nullable,
  Role,
  Perm,
  Shape,
  Named,
  Circle,
  Id,
  Pair,
  Labeled,
  Config,
  Loaded,
};
