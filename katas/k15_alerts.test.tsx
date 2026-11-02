// Testul pentru k15: React Testing Library + user-event, cu fetch înlocuit în test.
// Pe CoderPad: `npm i -D vitest jsdom @testing-library/react @testing-library/user-event`,
// apoi `npx vitest run --environment jsdom`.

// === k15 ===
import { expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AlertList } from "./k15_alerts";

const data = [
  { id: "1", title: "SAP_ALL acordat", severity: "high" },
  { id: "2", title: "Login la 3 noaptea", severity: "low" },
];
const reply = (body: unknown, status = 200) =>
  (globalThis.fetch = (async () =>
    new Response(JSON.stringify(body),
      { status })) as typeof fetch);

test("filtrează după severitate", async () => {
  reply(data);
  render(<AlertList />);
  expect(await screen.findAllByRole("listitem"))
    .toHaveLength(2);
  await userEvent.selectOptions(
    screen.getByLabelText(/severitate/i), "high");
  expect(screen.getAllByRole("listitem"))
    .toHaveLength(1);
  expect(screen.queryByText(/3 noaptea/))
    .toBeNull();
});

test("arată eroarea de la server", async () => {
  reply({ detail: "x" }, 500);
  render(<AlertList />);
  const msg = await screen.findByRole("alert");
  expect(msg.textContent).toContain("HTTP 500");
});
// === end ===
