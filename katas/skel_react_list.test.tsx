// Testele referinței s-frontend-react-list: `key` stabil, filtru derivat fără effect.
import { Profiler } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FilterList } from "./skel_react_list";

afterEach(cleanup);

const items = [
  { id: 10, name: "Alfa" },
  { id: 20, name: "Beta" },
  { id: 30, name: "Gama" },
];

test("arată toate elementele, apoi doar cele care se potrivesc", async () => {
  const user = userEvent.setup();
  render(<FilterList items={items} />);
  expect(screen.getAllByRole("listitem")).toHaveLength(3);
  expect(screen.getByText("3 din 3")).toBeTruthy();
  await user.type(screen.getByLabelText("Caută"), "GA");
  expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Gama"]);
  expect(screen.getByText("1 din 3")).toBeTruthy();
  await user.clear(screen.getByLabelText("Caută"));
  expect(screen.getAllByRole("listitem")).toHaveLength(3);
});

test("niciun rezultat: lista e goală, contorul spune 0", async () => {
  const user = userEvent.setup();
  render(<FilterList items={items} />);
  await user.type(screen.getByLabelText("Caută"), "zzz");
  expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  expect(screen.getByText("0 din 3")).toBeTruthy();
});

test("key = id: nodul DOM al unui element supraviețuiește filtrării", async () => {
  const user = userEvent.setup();
  render(<FilterList items={items} />);
  const beta = screen.getByText("Beta");
  await user.type(screen.getByLabelText("Caută"), "beta");
  // cu key={index}, React ar refolosi primul <li> și ar fi alt nod
  expect(screen.getByText("Beta")).toBe(beta);
});

test("nu apar avertismente de key", () => {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  render(<FilterList items={items} />);
  expect(spy).not.toHaveBeenCalled();
  spy.mockRestore();
});

test("filtrul e derivat în render: un singur commit pe tastă", async () => {
  const user = userEvent.setup();
  let commits = 0;
  render(
    <Profiler id="l" onRender={() => commits++}>
      <FilterList items={items} />
    </Profiler>,
  );
  const afterMount = commits;
  await user.type(screen.getByLabelText("Caută"), "a");
  // stare + useEffect care setează lista filtrată ar da 2 commit-uri
  expect(commits - afterMount).toBe(1);
});
