import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { runWithLimit } from "./katas_js.mjs";

const sleep = ms => new Promise(r => setTimeout(r, ms));

test("k16: păstrează ordinea și nu depășește limita", async () => {
  let running = 0, peak = 0;
  const task = (v, ms) => async () => {
    running++; peak = Math.max(peak, running);
    await sleep(ms);
    running--;
    return v;
  };
  const tasks = [task("a", 30), task("b", 5), task("c", 20), task("d", 1), task("e", 10)];
  assert.deepEqual(await runWithLimit(tasks, 2), ["a", "b", "c", "d", "e"]);
  assert.equal(peak, 2);
});

test("k16: un eșec respinge rezultatul", async () => {
  const tasks = [async () => 1, async () => { throw new Error("x"); }, async () => 3];
  await assert.rejects(runWithLimit(tasks, 2), /x/);
});

test("k16: fără task-uri și limită invalidă", async () => {
  assert.deepEqual(await runWithLimit([], 3), []);
  await assert.rejects(runWithLimit([async () => 1], 0), RangeError);
});

test("k16: limita mai mare decât numărul de task-uri", async () => {
  assert.deepEqual(await runWithLimit([async () => 1, async () => 2], 10), [1, 2]);
});

test("fiecare secțiune JS e închisă", () => {
  const src = fs.readFileSync(new URL("./katas_js.mjs", import.meta.url), "utf8");
  const open = (src.match(/^\/\/ === k\d+ ===$/gm) || []).length;
  const end = (src.match(/^\/\/ === end ===$/gm) || []).length;
  assert.equal(open, end);
});
