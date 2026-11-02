// Soluția de referință pentru k15 (pad React pe CoderPad: Vite + TypeScript).
// Verificată cu React 19, Testing Library și jsdom (testul e în k15_alerts.test.tsx).

// === k15 ===
import { useEffect, useState } from "react";

type Severity = "low" | "high";
type Alert = { id: string; title: string; severity: Severity };
type State =
  | { s: "loading" }
  | { s: "error"; msg: string }
  | { s: "ok"; data: Alert[] };

function isAlerts(x: unknown): x is Alert[] {
  return Array.isArray(x) && x.every(a =>
    typeof a?.id === "string" &&
    typeof a?.title === "string" &&
    (a.severity === "low" || a.severity === "high"));
}

export function AlertList({ url = "/api/alerts" }) {
  const [st, setSt] = useState<State>({ s: "loading" });
  const [sev, setSev] = useState<"all" | Severity>("all");

  useEffect(() => {
    const ctrl = new AbortController();
    setSt({ s: "loading" });
    fetch(url, { signal: ctrl.signal })
      .then(r => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then((d: unknown) => {
        if (!isAlerts(d)) throw new Error("format greșit");
        setSt({ s: "ok", data: d });
      })
      .catch(e => {
        if (e.name !== "AbortError")
          setSt({ s: "error", msg: e.message });
      });
    return () => ctrl.abort();
  }, [url]);

  if (st.s === "loading") return <p>Se încarcă…</p>;
  if (st.s === "error")
    return <p role="alert">Eroare: {st.msg}</p>;

  const shown = st.data.filter(
    a => sev === "all" || a.severity === sev);
  return (
    <section>
      <label>
        Severitate{" "}
        <select value={sev} onChange={e =>
          setSev(e.target.value as "all" | Severity)}>
          <option value="all">toate</option>
          <option value="high">high</option>
          <option value="low">low</option>
        </select>
      </label>
      {shown.length === 0
        ? <p>Nicio alertă.</p>
        : <ul>{shown.map(a =>
            <li key={a.id}>{a.title}</li>)}</ul>}
    </section>
  );
}
// === end ===
