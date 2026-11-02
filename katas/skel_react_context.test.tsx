// Testele referinței s-frontend-react-context: Provider, hook propriu, eroare fără Provider.
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ThemeProvider, useTheme, type Ctx } from "./skel_react_context";

afterEach(cleanup);

function Panel({ name }: { name: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button onClick={toggle}>
      {name}:{theme}
    </button>
  );
}

test("doi consumatori văd aceeași stare, iar toggle o schimbă pentru amândoi", async () => {
  const user = userEvent.setup();
  render(
    <ThemeProvider>
      <Panel name="a" />
      <Panel name="b" />
    </ThemeProvider>,
  );
  expect(screen.getByText("a:light")).toBeTruthy();
  expect(screen.getByText("b:light")).toBeTruthy();
  await user.click(screen.getByText("a:light"));
  expect(screen.getByText("a:dark")).toBeTruthy();
  expect(screen.getByText("b:dark")).toBeTruthy();
  await user.click(screen.getByText("b:dark"));
  expect(screen.getByText("a:light")).toBeTruthy();
});

test("useTheme în afara Provider-ului aruncă o eroare clară", () => {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  expect(() => renderHook(() => useTheme())).toThrow(/ThemeProvider/);
  spy.mockRestore();
});

test("hook-ul întoarce un Ctx fără null (tip îngustat)", () => {
  const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
  const ctx: Ctx = result.current;
  expect(ctx.theme).toBe("light");
  // @ts-expect-error tema e doar "light" sau "dark"
  const bad: Ctx["theme"] = "blue";
  expect(bad).toBe("blue");
});

test("Provider-ul ține children-ul", () => {
  render(
    <ThemeProvider>
      <p>copil</p>
    </ThemeProvider>,
  );
  expect(screen.getByText("copil")).toBeTruthy();
});
