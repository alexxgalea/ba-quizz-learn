// Referința de schelet s-frontend-react-usefetch (TSX).
// Secțiunea „=== s-frontend-react-usefetch ===” ajunge în aplicație
// (build.mjs); testele sunt în skel_react_usefetch.test.tsx.
// `export`-urile stau după secțiune, ca să nu
// încarce codul de scris din memorie.

// === s-frontend-react-usefetch ===
import {
  useEffect,
  useState,
} from "react";

function useFetch<T>(url: string) {
  const [data, setData] =
    useState<T | null>(null);
  const [error, setError] = useState<
    string | null
  >(null);

  useEffect(() => {
    const ctrl = new AbortController();
    const live = () =>
      !ctrl.signal.aborted;
    setData(null);
    setError(null);

    fetch(url, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) {
          throw new Error(
            "HTTP " + r.status,
          );
        }
        return r.json() as Promise<T>;
      })
      .then((d) => live() && setData(d))
      .catch((e: unknown) => {
        if (!live()) return;
        setError(
          e instanceof Error
            ? e.message
            : String(e),
        );
      });

    return () => ctrl.abort();
  }, [url]);

  return { data, error };
}
// === end ===

export { useFetch };
