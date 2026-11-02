// Componenta testată de s-frontend-react-rtl (testul e în skel_react_rtl.test.tsx).
// Nu face parte din referință: scheletul cere doar testul.
import { useState } from "react";
import type { FormEvent } from "react";

type Props = { fetchGreeting: (name: string) => Promise<string> };

export function Greeter({ fetchGreeting }: Props) {
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    try {
      setMsg(await fetchGreeting(name));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <form onSubmit={submit}>
      <label>
        Nume
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <button>Salută</button>
      {msg && <p role="status">{msg}</p>}
      {err && <p role="alert">{err}</p>}
    </form>
  );
}
