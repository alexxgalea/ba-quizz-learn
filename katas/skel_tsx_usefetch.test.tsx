// Testele referinței s-frontend-tsx-usefetch: rezultat tipat ca union, parse validat.
import { afterEach, beforeEach, expect, test } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";

import { useFetch, type FetchState } from "./skel_tsx_usefetch";

type User = { id: number; name: string };
function parseUser(x: unknown): User {
  const o = x as Record<string, unknown>;
  if (typeof o?.id !== "number" || typeof o.name !== "string") {
    throw new Error("format greșit");
  }
  return { id: o.id, name: o.name };
}

let pending: { url: string; reply: (body: unknown) => void }[] = [];
let fetchCalls = 0;
const realFetch = globalThis.fetch;
beforeEach(() => {
  pending = [];
  fetchCalls = 0;
  globalThis.fetch = ((url: string) =>
    new Promise<Response>((resolve) => {
      fetchCalls++;
      pending.push({
        url,
        reply: (body) => resolve(new Response(JSON.stringify(body))),
      });
    })) as typeof fetch;
});
afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
});

test("loading, apoi ok cu data tipată", async () => {
  const { result } = renderHook(() => useFetch("/u", parseUser));
  expect(result.current).toEqual({ status: "loading" });
  await act(async () => pending[0]!.reply({ id: 1, name: "Ana" }));
  await waitFor(() => expect(result.current.status).toBe("ok"));
  const s = result.current;
  if (s.status === "ok") {
    const u: User = s.data; // îngustat: data există doar la ok
    expect(u.name).toBe("Ana");
  } else {
    throw new Error("trebuia ok");
  }
});

test("parse aruncă -> stare error, cu mesajul", async () => {
  const { result } = renderHook(() => useFetch("/u", parseUser));
  await act(async () => pending[0]!.reply({ id: "x" }));
  await waitFor(() => expect(result.current.status).toBe("error"));
  expect(result.current).toEqual({ status: "error", message: "Error: format greșit" });
});

test("tipurile: data nu se citește fără îngustare", () => {
  const s: FetchState<User> = { status: "loading" };
  // @ts-expect-error `data` nu există pe toate stările
  const d = s.data;
  expect(d).toBeUndefined();
  // @ts-expect-error `ok` cere `data`
  const bad: FetchState<User> = { status: "ok" };
  expect(bad).toBeDefined();
  // @ts-expect-error data nu are tipul T
  const wrong: FetchState<User> = { status: "ok", data: 5 };
  expect(wrong).toBeDefined();
});

test("T se deduce din parse, fără să-l scrii", () => {
  const { result } = renderHook(() => useFetch("/u", parseUser));
  const s: FetchState<User> = result.current;
  expect(s.status).toBe("loading");
});

test("un răspuns vechi nu suprascrie url-ul nou", async () => {
  const { result, rerender } = renderHook(
    ({ u }) => useFetch(u, parseUser),
    { initialProps: { u: "/a" } },
  );
  rerender({ u: "/b" });
  expect(result.current).toEqual({ status: "loading" });
  await act(async () => pending[1]!.reply({ id: 2, name: "B" }));
  await waitFor(() => expect(result.current.status).toBe("ok"));
  await act(async () => pending[0]!.reply({ id: 1, name: "A" }));
  await new Promise((r) => setTimeout(r, 10));
  expect(result.current).toEqual({ status: "ok", data: { id: 2, name: "B" } });
});

test("parse stabil (în afara componentei): o singură cerere, nu o buclă", async () => {
  const { result } = renderHook(() => useFetch("/u", parseUser));
  await act(async () => pending[0]!.reply({ id: 1, name: "A" }));
  await waitFor(() => expect(result.current.status).toBe("ok"));
  await new Promise((r) => setTimeout(r, 20));
  expect(fetchCalls).toBe(1);
});
