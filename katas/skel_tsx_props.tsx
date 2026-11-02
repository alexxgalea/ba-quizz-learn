// Referința de schelet s-frontend-tsx-props (TSX).
// Secțiunea „=== s-frontend-tsx-props ===” ajunge în aplicație
// (build.mjs); testele sunt în skel_tsx_props.test.tsx.
// `export`-urile stau după secțiune, ca să nu
// încarce codul de scris din memorie.

// === s-frontend-tsx-props ===
import type {
  ChangeEvent,
  ReactNode,
} from "react";

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children?: ReactNode;
}

function Field(props: FieldProps) {
  const { label, value, onChange } =
    props;

  function handle(
    e: ChangeEvent<HTMLInputElement>,
  ) {
    onChange(e.target.value);
  }

  return (
    <label>
      {label}
      <input
        value={value}
        onChange={handle}
      />
      {props.children}
    </label>
  );
}
// === end ===

export { Field };
export type { FieldProps };
