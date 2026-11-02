// Testele referinței s-frontend-react-form (vitest + jsdom + Testing Library).
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Counter, NameForm } from "./skel_react_form";

afterEach(cleanup);

test("Counter: două update-uri funcționale într-un handler dau +2", async () => {
  const user = userEvent.setup();
  render(<Counter />);
  expect(screen.getByRole("button").textContent).toBe("n = 0");
  await user.click(screen.getByRole("button"));
  expect(screen.getByRole("button").textContent).toBe("n = 2");
  await user.click(screen.getByRole("button"));
  expect(screen.getByRole("button").textContent).toBe("n = 4");
});

test("NameForm: câmp controlat, trimis curățat, apoi golit", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  render(<NameForm onSave={onSave} />);
  const input = screen.getByLabelText<HTMLInputElement>("Nume");
  await user.type(input, "  Ana ");
  expect(input.value).toBe("  Ana ");
  await user.click(screen.getByRole("button", { name: "Salvează" }));
  expect(onSave).toHaveBeenCalledExactlyOnceWith("Ana");
  expect(input.value).toBe("");
});

test("NameForm: Enter trimite formularul, iar numele gol nu se salvează", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  render(<NameForm onSave={onSave} />);
  const input = screen.getByLabelText("Nume");
  await user.type(input, "   {Enter}");
  expect(onSave).not.toHaveBeenCalled();
  await user.type(input, "Dan{Enter}");
  expect(onSave).toHaveBeenCalledExactlyOnceWith("Dan");
});

test("NameForm: preventDefault, formularul nu navighează", () => {
  render(<NameForm onSave={() => {}} />);
  const form = screen.getByLabelText("Nume").closest("form")!;
  const ev = new Event("submit", { bubbles: true, cancelable: true });
  form.dispatchEvent(ev);
  expect(ev.defaultPrevented).toBe(true);
});

test("NameForm: onSave e obligatoriu la compilare", () => {
  // @ts-expect-error lipsește `onSave`
  const el = <NameForm />;
  expect(el).toBeDefined();
});
