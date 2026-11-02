// Testele referinței s-frontend-react-usefetch: abort la demontare, la schimbarea
// url-ului, fără state după demontare, erori HTTP. `fetch` e înlocuit în test.
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";

import { useFetch } from "./skel_react_usefetch";

type Call = {
  url: string;
  signal: AbortSignal;
  resolve: (body: unknown, status?: number) => void;
};
let calls: Call[] = [];
const realFetch = globalThis.fetch;

beforeEach(() => {
  calls = [];
  globalThis.fetch = ((url: string, init: RequestInit) =>
    new Promise<Response>((resolve, reject) => {
      const signal = init.signal as AbortSignal;
      signal.addEventListener("abort", () =>
        reject(new DOMException("aborted", "AbortError")));
      calls.push({
        url,
        signal,
        resolve: (body, status = 200) =>
          resolve(new Response(JSON.stringify(body), { status })),
      });
    })) as typeof fetch;
});
afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
});

test("întoarce data după răspuns, iar înainte e null", async () => {
  const { result } = renderHook(() => useFetch<{ n: number }>("/a"));
  expect(result.current).toEqual({ data: null, error: null });
  await act(async () => calls[0]!.resolve({ n: 1 }));
  await waitFor(() => expect(result.current.data).toEqual({ n: 1 }));
  expect(result.current.error).toBeNull();
  const n: number | undefined = result.current.data?.n;
  expect(n).toBe(1);
});

test("HTTP 500 devine eroare, iar data rămâne null", async () => {
  const { result } = renderHook(() => useFetch("/a"));
  await act(async () => calls[0]!.resolve({ x: 1 }, 500));
  await waitFor(() => expect(result.current.error).toBe("HTTP 500"));
  expect(result.current.data).toBeNull();
});

test("la demontare cererea se anulează, fără eroare afișată", async () => {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  const { result, unmount } = renderHook(() => useFetch("/a"));
  const sig = calls[0]!.signal;
  expect(sig.aborted).toBe(false);
  unmount();
  expect(sig.aborted).toBe(true);
  await Promise.resolve();
  expect(result.current).toEqual({ data: null, error: null });
  expect(spy).not.toHaveBeenCalled();
  spy.mockRestore();
});

test("la schimbarea url-ului cererea veche se anulează", async () => {
  const { result, rerender } = renderHook(({ u }) => useFetch<string>(u), {
    initialProps: { u: "/a" },
  });
  rerender({ u: "/b" });
  expect(calls.map((c) => c.url)).toEqual(["/a", "/b"]);
  expect(calls[0]!.signal.aborted).toBe(true);
  expect(calls[1]!.signal.aborted).toBe(false);
  await act(async () => calls[1]!.resolve("B"));
  await waitFor(() => expect(result.current.data).toBe("B"));
  // abort-ul cererii vechi respinge fetch-ul, dar nu devine eroare pentru url-ul nou
  await new Promise((r) => setTimeout(r, 10));
  expect(result.current.error).toBeNull();
});

test("un răspuns întârziat pentru url-ul vechi nu suprascrie starea nouă", async () => {
  // simulăm un server care a trimis deja răspunsul când abort-ul ajunge
  globalThis.fetch = ((url: string) =>
    new Promise<Response>((resolve) => {
      calls.push({
        url,
        signal: new AbortController().signal,
        resolve: (body) => resolve(new Response(JSON.stringify(body))),
      });
    })) as typeof fetch;
  const { result, rerender } = renderHook(({ u }) => useFetch<string>(u), {
    initialProps: { u: "/a" },
  });
  rerender({ u: "/b" });
  await act(async () => calls[1]!.resolve("B"));
  await waitFor(() => expect(result.current.data).toBe("B"));
  await act(async () => calls[0]!.resolve("A"));
  await new Promise((r) => setTimeout(r, 10));
  expect(result.current.data).toBe("B");
});

test("o eroare de rețea (nu abort) ajunge în error", async () => {
  globalThis.fetch = (() => Promise.reject(new Error("offline"))) as typeof fetch;
  const { result } = renderHook(() => useFetch("/a"));
  await waitFor(() => expect(result.current.error).toBe("offline"));
});
