// Referința de schelet s-frontend-tsx-usefetch (TSX).
// Secțiunea „=== s-frontend-tsx-usefetch ===” ajunge în aplicație
// (build.mjs); testele sunt în skel_tsx_usefetch.test.tsx.
// `export`-urile stau după secțiune, ca să nu
// încarce codul de scris din memorie.

// === s-frontend-tsx-usefetch ===
import {
  useEffect,
  useState,
} from "react";

type FetchState<T> =
  | { status: "loading" }
  | { status: "ok"; data: T }
  | { status: "error"; message: string };

function useFetch<T>(
  url: string,
  parse: (json: unknown) => T,
): FetchState<T> {
  const [state, setState] = useState<
    FetchState<T>
  >({ status: "loading" });

  useEffect(() => {
    let live = true;
    setState({ status: "loading" });

    fetch(url)
      .then(
        (r) =>
          r.json() as Promise<unknown>,
      )
      .then((json) => {
        if (!live) return;
        const data = parse(json);
        setState({ status: "ok", data });
      })
      .catch((e: unknown) => {
        if (live) {
          setState({
            status: "error",
            message: String(e),
          });
        }
      });

    return () => {
      live = false;
    };
  }, [url, parse]);

  return state;
}
// === end ===

export { useFetch };
export type { FetchState };
