// Testul de referință pentru s-frontend-react-rtl: secțiunea de mai jos e testul
// pe care Alex îl scrie din memorie; componenta e în skel_react_rtl.tsx.
// Pe CoderPad: vitest + jsdom + @testing-library/react + user-event.

// === s-frontend-react-rtl ===
import {
  afterEach,
  expect,
  test,
  vi,
} from "vitest";
import {
  cleanup,
  render,
  screen,
} from "@testing-library/react";
import userEvent from
  "@testing-library/user-event";
import {
  Greeter,
} from "./skel_react_rtl";

afterEach(cleanup);

test("salută la trimitere", async () => {
  const user = userEvent.setup();
  const fetchGreeting = vi
    .fn()
    .mockResolvedValue("Salut, Ana!");
  render(
    <Greeter
      fetchGreeting={fetchGreeting}
    />,
  );

  expect(
    screen.queryByRole("status"),
  ).toBeNull();
  await user.type(
    screen.getByLabelText("Nume"),
    "Ana",
  );
  await user.click(
    screen.getByRole("button", {
      name: "Salută",
    }),
  );

  const msg =
    await screen.findByRole("status");
  expect(msg.textContent).toBe(
    "Salut, Ana!",
  );
  expect(
    fetchGreeting,
  ).toHaveBeenCalledWith("Ana");
});

test("arată eroarea", async () => {
  const user = userEvent.setup();
  const fetchGreeting = vi
    .fn()
    .mockRejectedValue(new Error("500"));
  render(
    <Greeter
      fetchGreeting={fetchGreeting}
    />,
  );

  await user.click(
    screen.getByRole("button", {
      name: "Salută",
    }),
  );

  const alert =
    await screen.findByRole("alert");
  expect(alert.textContent).toBe("500");
  expect(
    screen.queryByRole("status"),
  ).toBeNull();
});
// === end ===

// Verificări în plus, în afara referinței.
test("după o eroare, o trimitere reușită șterge eroarea", async () => {
  const user = userEvent.setup();
  const fetchGreeting = vi
    .fn()
    .mockRejectedValueOnce(
      new Error("500"),
    )
    .mockResolvedValueOnce("Salut!");
  render(
    <Greeter
      fetchGreeting={fetchGreeting}
    />,
  );
  const btn = screen.getByRole("button", {
    name: "Salută",
  });
  await user.click(btn);
  await screen.findByRole("alert");
  await user.click(btn);
  await screen.findByRole("status");
  expect(
    screen.queryByRole("alert"),
  ).toBeNull();
});
