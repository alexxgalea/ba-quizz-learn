// Testele referințelor de schelet TypeScript: `tsc --strict --noEmit` (tipurile)
// și vitest (comportamentul). O eroare de tip așteptată se marchează cu
// `// @ts-expect-error`: dacă eroarea dispare, tsc se plânge de directivă.
import { expect, test } from "vitest";

import { assertNever, label, type Result } from "./skel_ts";

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
