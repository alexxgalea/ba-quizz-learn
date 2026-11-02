// Referința de schelet s-frontend-react-list (TSX).
// Secțiunea „=== s-frontend-react-list ===” ajunge în aplicație
// (build.mjs); testele sunt în skel_react_list.test.tsx.
// `export`-urile stau după secțiune, ca să nu
// încarce codul de scris din memorie.

// === s-frontend-react-list ===
import { useState } from "react";

type Item = { id: number; name: string };

function FilterList({
  items,
}: {
  items: Item[];
}) {
  const [q, setQ] = useState("");

  // derivat în render: fără useEffect
  const needle = q.toLowerCase();
  const visible = items.filter((i) =>
    i.name.toLowerCase().includes(needle),
  );

  return (
    <div>
      <input
        aria-label="Caută"
        value={q}
        onChange={(e) =>
          setQ(e.target.value)
        }
      />
      <p>
        {visible.length} din{" "}
        {items.length}
      </p>
      <ul>
        {visible.map((i) => (
          <li key={i.id}>{i.name}</li>
        ))}
      </ul>
    </div>
  );
}
// === end ===

export { FilterList };
