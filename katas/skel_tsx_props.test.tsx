// Testele referinței s-frontend-tsx-props: props tipate, children, ChangeEvent.
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";

import { Field } from "./skel_tsx_props";

afterEach(cleanup);

test("onChange primește valoarea (string), nu evenimentul", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<Field label="Email" value="" onChange={onChange} />);
  await user.type(screen.getByLabelText("Email"), "ab");
  expect(onChange).toHaveBeenNthCalledWith(1, "a");
  expect(onChange).toHaveBeenNthCalledWith(2, "b");
});

test("câmpul e controlat: arată `value` din props", () => {
  render(<Field label="Nume" value="Ana" onChange={() => {}} />);
  expect(screen.getByLabelText<HTMLInputElement>("Nume").value).toBe("Ana");
});

test("children se randează în interiorul label-ului", () => {
  render(
    <Field label="Parolă" value="" onChange={() => {}}>
      <small>min. 8 caractere</small>
    </Field>,
  );
  expect(screen.getByText("min. 8 caractere")).toBeTruthy();
  expect(screen.getByLabelText(/Parolă/)).toBeTruthy();
});

test("props-urile greșite nu compilează", () => {
  // @ts-expect-error lipsește `label`
  const a = <Field value="" onChange={() => {}} />;
  // @ts-expect-error `value` e string
  const b = <Field label="x" value={1} onChange={() => {}} />;
  // @ts-expect-error onChange primește string, nu number
  const c = <Field label="x" value="" onChange={(v: number) => v} />;
  expect([a, b, c]).toHaveLength(3);
});

test("tipul props-urilor e cel declarat", () => {
  type P = ComponentProps<typeof Field>;
  const ok: P = { label: "x", value: "y", onChange: (v: string) => v };
  expect(ok.label).toBe("x");
  const handler: P["onChange"] = (v) => {
    const s: string = v;
    return s;
  };
  expect(handler("q")).toBe("q");
});
