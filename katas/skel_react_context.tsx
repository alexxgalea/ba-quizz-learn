// Referința de schelet s-frontend-react-context (TSX).
// Secțiunea „=== s-frontend-react-context ===” ajunge în aplicație
// (build.mjs); testele sunt în skel_react_context.test.tsx.
// `export`-urile stau după secțiune, ca să nu
// încarce codul de scris din memorie.

// === s-frontend-react-context ===
import {
  createContext,
  useContext,
  useState,
} from "react";
import type { ReactNode } from "react";

type Theme = "light" | "dark";
type Ctx = {
  theme: Theme;
  toggle: () => void;
};

const ThemeContext =
  createContext<Ctx | null>(null);

function ThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [theme, setTheme] =
    useState<Theme>("light");

  const toggle = () =>
    setTheme((t) =>
      t === "light" ? "dark" : "light",
    );

  return (
    <ThemeContext.Provider
      value={{ theme, toggle }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

function useTheme(): Ctx {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error(
      "useTheme fără ThemeProvider",
    );
  }
  return ctx;
}
// === end ===

export { ThemeProvider, useTheme };
export type { Ctx };
