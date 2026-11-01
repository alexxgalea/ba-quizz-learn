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
    "neacoperit: " + JSON.stringify(x));
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
// === end ===

export { assertNever, label };
export type { Result };
