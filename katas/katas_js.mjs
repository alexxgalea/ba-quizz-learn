// Soluțiile de referință pentru exercițiile de JavaScript.
// Fiecare secțiune dintre "// === kN ===" și "// === end ===" e afișată în aplicație.
// Teste: node --test katas/katas_js.test.mjs

// === k16 ===
// Rulează task-urile (funcții care întorc o promisiune) cu cel mult
// `limit` în paralel. Rezultatele păstrează ordinea task-urilor.
export async function runWithLimit(tasks, limit) {
  if (!(limit >= 1)) throw new RangeError("limit >= 1");
  const results = new Array(tasks.length);
  let next = 0;

  async function worker() {
    // JS are un singur thread: între două await-uri
    // nimeni nu poate lua același index
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  }

  const n = Math.min(limit, tasks.length);
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}
// === end ===
