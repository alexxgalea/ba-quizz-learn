// Referința de schelet s-frontend-react-form (TSX).
// Secțiunea „=== s-frontend-react-form ===” ajunge în aplicație
// (build.mjs); testele sunt în skel_react_form.test.tsx.
// `export`-urile stau după secțiune, ca să nu
// încarce codul de scris din memorie.

// === s-frontend-react-form ===
import { useState } from "react";
import type { FormEvent } from "react";

function Counter() {
  const [n, setN] = useState(0);

  function addTwo() {
    setN((c) => c + 1);
    setN((c) => c + 1);
  }

  return (
    <button onClick={addTwo}>
      n = {n}
    </button>
  );
}

type Props = {
  onSave: (name: string) => void;
};

function NameForm({ onSave }: Props) {
  const [name, setName] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    onSave(clean);
    setName("");
  }

  return (
    <form onSubmit={submit}>
      <input
        aria-label="Nume"
        value={name}
        onChange={(e) =>
          setName(e.target.value)
        }
      />
      <button>Salvează</button>
    </form>
  );
}
// === end ===

export { Counter, NameForm };
