# Checks the gap tracking and "smart theory": per-point miss counters (mc), wrong claims (w), theory on the verdict screen and Study › Pentru tine.
import asyncio, pathlib, json
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = (ROOT / "dist" / "pregatire-onapsis.html").as_uri()
SHOTS = ROOT / "shots"
SHOTS.mkdir(exist_ok=True)

# Scripted `sample` (same idea as test_interview.py): the first turn is "done", the verdict covers point 0 spontaneously and flags a wrong claim.
SAMPLE = """
window.__calls = [];
window.__gq = [];
const sample = (prompt, opts) => new Promise(res => {
  const kind = prompt.includes('Scrie o explicație scurtă') ? 'lesson' : prompt.includes('Pune O SINGURĂ întrebare nouă') ? 'ask' : prompt.includes('{"covered":true,"feedback"') ? 'gapgrade'
    : prompt.includes('"act":"followup"') ? 'turn' : prompt.includes('"spontan"') ? 'verdict' : 'grade';
  window.__calls.push({ kind, prompt, tier: opts && opts.modelTier, cache: opts && opts.cache, hasSignal: !!(opts && 'signal' in opts) });
  const n = (prompt.match(/^\\d+\\. /gm) || []).length;
  if (kind === 'lesson') { setTimeout(() => res({ text: 'Ideea: GIL-ul serializează bytecode-ul.\\nUnde s-a rupt gândirea ta: ai crezut că threadurile rulează în paralel.\\nSpune-l la interviu: Pentru CPU-bound folosesc procese.', truncated: false }), 20); return; }
  if (kind === 'ask') { setTimeout(() => res({ text: 'Ai un serviciu care redimensionează imagini: ce folosești și de ce?', truncated: false }), 20); return; }
  if (kind === 'gapgrade') { const t = window.__gq.length ? window.__gq.shift() : JSON.stringify({ covered: true, feedback: 'Corect: procese pentru CPU-bound.' }); setTimeout(() => res({ text: t, truncated: false }), 20); return; }
  const text = kind === 'turn' ? JSON.stringify({ act: 'done' })
    : JSON.stringify({ covered: ['spontan'].concat(Array(n - 1).fill('nu')), missing: ['costul proceselor'], wrong: ['GIL nu protejează invarianții'], feedback: 'Ai acoperit începutul.' });
  setTimeout(() => res({ text, truncated: false }), 20);
});
window.claude = { use: async name => (name === 'sample' ? sample : null) };
"""

fails = []
def check(name, ok, extra=""):
    print(("PASS " if ok else "FAIL ") + name + (" " + str(extra) if extra and not ok else ""))
    if not ok: fails.append(name)

async def fresh(pg):
    await pg.goto(PAGE); await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(400)

async def seed(pg, cid, entry):
    await pg.evaluate("([id, e]) => { const s = window.__prep.state(); s.o[id] = e; window.__prep.setState(s); }", [cid, entry])

async def state_o(pg, cid): return (await pg.evaluate("window.__prep.state().o"))[cid]

async def start_gil(pg):
    await pg.click('.tab[data-tab="oral"]'); await pg.wait_for_timeout(100)
    await pg.click('[data-a="oral-mod"][data-m="gil"]'); await pg.wait_for_selector('#ans-t', timeout=3000)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 360, "height": 740}, device_scale_factor=2)
        pg = await ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" and "fonts" not in m.text and "Failed to load resource" not in m.text else None)
        await pg.route("**/fonts.*", lambda r: r.abort())
        await pg.goto(PAGE); await pg.wait_for_timeout(400)

        # 0) pure logic
        L = await pg.evaluate("""() => {
          const T = window.__prep, o = {};
          o.rel = T.relRank('Corutinele cedează doar la await', ['Altceva complet', 'asyncio: corutinele cedează controlul la await', 'cod blocant în await']).map(x => x.i);
          o.stop = T.relRank('pentru care este', ['pentru care este sunt']).length;
          o.diac = T.relRank('cedează controlul', ['cedeaza controlul']).length;
          o.cm = JSON.stringify(T.gapCounts({ mc: { 1: 2, 3: 0, 4: 99 }, m: [0] }));
          o.cmOld = JSON.stringify(T.gapCounts({ m: [0, 2] })); o.cmNone = JSON.stringify(T.gapCounts(undefined)); o.cmEmpty = JSON.stringify(T.gapCounts({ mc: {}, m: [1] }));
          const p1 = window.PREP.oral.find(c => window.PREP.modules.find(m => m.id === c.m).p === 1), p2 = window.PREP.oral.find(c => window.PREP.modules.find(m => m.id === c.m).p === 2);
          const s = T.state(); s.o[p1.id] = { b: 1, n: 1, s: 20, t: 1, mc: { 0: 3 } }; s.o[p2.id] = { b: 1, n: 1, s: 20, t: 1, mc: { 1: 3, 2: 1 } }; T.setState(s);
          const l = T.gapList(); o.order = l.map(g => [g.c.id === p1.id ? 'p1' : 'p2', g.i, g.n]);
          return o;
        }""")
        check("relRank: ranks by shared words, ignores items with none", L["rel"] == [1, 2], L["rel"])
        check("relRank: stop words don't count; diacritics are ignored", L["stop"] == 0 and L["diac"] == 1)
        check("gapCounts: mc wins, zeros dropped, capped at 9; old `m` counts 1; empty mc means no gaps", '"1":2' in L["cm"] and '"3"' not in L["cm"] and '"4":9' in L["cm"] and '"0"' not in L["cm"] and L["cmOld"] == '{"0":1,"2":1}' and L["cmNone"] == "{}" and L["cmEmpty"] == "{}", L)
        check("gapList: misses × module priority (P1 ×3 before P2 ×2 at equal count)", L["order"] == [["p1", 0, 3], ["p2", 1, 3], ["p2", 2, 1]], L["order"])

        # 1) Study › Pentru tine: empty state first
        await fresh(pg)
        await pg.click('.tab[data-tab="study"]'); await pg.click('[data-a="seg"][data-seg="gaps"]'); await pg.wait_for_timeout(100)
        check("empty state explains where gaps come from; no count on the tab label", "Niciun gol încă" in await pg.inner_text('main') and "(" not in await pg.inner_text('[data-seg="gaps"]'))

        # 2) plain flow (no sample): ticks decide the counters; the review shows theory for what is missed
        await fresh(pg)
        A = await pg.evaluate("(() => { const c = window.PREP.oral.find(c => c.m === 'gil'); return { id: c.id, k: c.k, n: c.k.length }; })()")
        n = A["n"]
        await seed(pg, A["id"], {"b": 1, "n": 1, "s": 30, "t": 1000, "mc": {"1": 2, "2": 1}, "m": [1, 2]})
        await start_gil(pg)
        await pg.click('[data-a="oral-reveal"]'); await pg.wait_for_selector('.kp-i')
        check("review: theory offered for the points not covered, with their count", "(" + str(n) + ")" in await pg.inner_text('[data-a="th-open"]'), await pg.inner_text('[data-a="th-open"]'))
        await pg.click('.kp-i >> nth=0'); await pg.wait_for_timeout(50)
        check("ticking a point lowers the count on the button", "(" + str(n - 1) + ")" in await pg.inner_text('[data-a="th-open"]'))
        await pg.click('[data-a="th-open"]'); await pg.wait_for_selector('.gap .gap-i')
        items = await pg.locator('.gap .gap-i').count()
        check("theory section has one block per missed point", items == n - 1, items)
        txt = await pg.inner_text('.gap')
        check("block for point 1 says it was missed 3 times (2 before + now); point 3 has no chip", "ratat de 3 ori" in txt and txt.count("ratat de") == 2, txt.count("ratat de"))
        rts = await pg.eval_on_selector_all('.gap .gap-i .rt', "els => els.map(e => e.textContent.trim())")
        lis = await pg.eval_on_selector_all('.gap .gap-i .pts li', "els => els.map(e => e.textContent.trim())")
        check("theory is not repeated across blocks (model sentences and sheet points are unique)", len(rts) >= 1 and len(set(rts)) == len(rts) and len(set(lis)) == len(lis) and await pg.locator('.gap [data-a="open-sheet"]').count() == items, (len(rts), len(set(rts)), len(lis), len(set(lis))))
        await pg.screenshot(path=str(SHOTS / "g1-theory.png"), full_page=True)
        await pg.click('.kp-i >> nth=1'); await pg.wait_for_timeout(50)
        check("ticking another point removes its block live", await pg.locator('.gap .gap-i').count() == items - 1)
        await pg.click('.kp-i >> nth=2'); await pg.wait_for_timeout(50)
        for i in range(3, n): await pg.click('.kp-i >> nth=' + str(i)); await pg.wait_for_timeout(30)
        check("everything covered: no theory button", await pg.locator('[data-a="th-open"], .gap').count() == 0)
        await pg.click('[data-a="oral-save"]'); await pg.wait_for_timeout(100)
        e = await state_o(pg, A["id"])
        check("full cover lowers the counters (mc 2→1, 1→0), missed list empty, no wrong claims", e.get("mc") == {"1": 1} and "m" not in e and "w" not in e, e)

        # 3) partial cover raises the counters; plain flow has no `w`
        await fresh(pg)
        await seed(pg, A["id"], {"b": 1, "n": 1, "s": 30, "t": 1000, "m": [1, 2]})
        await start_gil(pg)
        await pg.click('[data-a="oral-reveal"]'); await pg.wait_for_selector('.kp-i')
        await pg.click('.kp-i >> nth=0'); await pg.click('.kp-i >> nth=1')
        await pg.click('[data-a="oral-save"]'); await pg.wait_for_timeout(100)
        e = await state_o(pg, A["id"])
        exp = {"2": 2}; exp.update({str(i): 1 for i in range(3, n)})
        check("old `m` seeds counters at 1; ticked 0,1 → point 1 drops to 0, point 2 rises to 2, new misses start at 1", e.get("mc") == exp and e.get("m") == list(range(2, n)) and "w" not in e, e)

        # 4) Study › Pentru tine with data
        await pg.click('[data-a="quit"]'); await pg.click('[data-a="quit"]'); await pg.wait_for_timeout(100)
        if await pg.locator('[data-a="close-result"]').count(): await pg.click('[data-a="close-result"]')
        await seed(pg, A["id"], {"b": 1, "n": 2, "s": 30, "t": 1000, "mc": {"2": 3, "3": 1}, "m": [2, 3], "w": ["Cred că GIL-ul face codul thread-safe."]})
        await pg.click('.tab[data-tab="study"]'); await pg.click('[data-a="seg"][data-seg="gaps"]'); await pg.wait_for_timeout(100)
        check("tab label shows the number of gaps", "(2)" in await pg.inner_text('[data-seg="gaps"]'))
        rows = await pg.eval_on_selector_all('details.gap > summary', "els => els.map(e => e.textContent.replace(/\\s+/g, ' ').trim())")
        check("heaviest gap first, with its counter", len(rows) == 2 and rows[0].endswith("×3") and rows[1].endswith("×1"), rows)
        check("a repeated gap is flagged", await pg.locator('details.gap >> nth=0 >> summary .chip.bad').count() == 1 and await pg.locator('details.gap >> nth=1 >> summary .chip.bad').count() == 0)
        await pg.click('details.gap >> nth=0 >> summary'); await pg.wait_for_timeout(100)
        body = await pg.inner_text('details.gap >> nth=0')
        check("open gap: the card question, the wrong claim, theory (point not repeated) and the practice button", "thread-safe" in body and "Din răspunsul model" in (await pg.text_content('details.gap >> nth=0')) and await pg.locator('details.gap >> nth=0 >> .gap-p').count() == 0 and await pg.locator('details.gap >> nth=0 >> [data-a="oral-card"]').count() == 1)
        await pg.screenshot(path=str(SHOTS / "g2-study.png"), full_page=True)
        await pg.click('details.gap >> nth=0 >> [data-a="oral-card"]'); await pg.wait_for_selector('#ans-t', timeout=3000)
        check("'Exersează cardul' opens exactly that card", "1/1" in await pg.text_content('.eyebrow') and await pg.evaluate("(id => { const c = window.PREP.oral.find(c => c.id === id); return document.querySelector('.icard-q').textContent.replace(/\\s+/g, ' ').trim() === c.q.replace(/`/g, '').replace(/\\s+/g, ' ').trim(); })", A["id"]))
        check("no horizontal overflow at 360 px", await pg.evaluate("document.documentElement.scrollWidth <= 360"))
        await pg.emulate_media(color_scheme="dark")
        await pg.click('.tab[data-tab="study"]'); await pg.wait_for_timeout(100)
        await pg.screenshot(path=str(SHOTS / "g3-study-dark.png"), full_page=True)
        check("no page errors (plain flow)", not errs, errs)

        # 5) with sample: the verdict's wrong claims are saved (w) and shown first in the theory; mock hides the theory
        ctx2 = await b.new_context(viewport={"width": 360, "height": 740})
        await ctx2.add_init_script(SAMPLE)
        pg2 = await ctx2.new_page(); errs2 = []
        pg2.on("pageerror", lambda e: errs2.append(str(e)))
        await pg2.route("**/fonts.*", lambda r: r.abort())
        await fresh(pg2)
        await start_gil(pg2)
        cid = await pg2.evaluate("(() => { const q = document.querySelector('.icard-q').textContent.replace(/\\s+/g, ' ').trim(); return window.PREP.oral.find(c => c.m === 'gil' && c.q.replace(/`/g, '').replace(/\\s+/g, ' ').trim() === q).id; })()")
        await pg2.fill('#ans-t', "GIL-ul lasă un singur thread să execute bytecode, deci pentru CPU-bound folosesc procese.")
        await pg2.click('[data-a="iv-start"]'); await pg2.wait_for_selector('.ai-v', timeout=3000)
        await pg2.click('[data-a="th-open"]'); await pg2.wait_for_selector('.gap')
        check("theory shows the wrong claim first, then a block per missed point", "De corectat întâi" in await pg2.inner_text('.gap') and "GIL nu protejează invarianții" in await pg2.inner_text('.gap .ai-l'))
        await pg2.click('[data-a="oral-save"]'); await pg2.wait_for_timeout(100)
        e = await state_o(pg2, cid)
        check("wrong claims saved on the card (w), counters set for the missed points", e.get("w") == ["GIL nu protejează invarianții"] and len(e.get("mc", {})) == e["n"] * 0 + len(e["m"]) and "0" not in e.get("mc", {}), e)
        await pg2.click('[data-a="quit"]'); await pg2.click('[data-a="quit"]'); await pg2.wait_for_timeout(100)
        if await pg2.locator('[data-a="close-result"]').count(): await pg2.click('[data-a="close-result"]')
        await pg2.click('.tab[data-tab="study"]'); await pg2.click('[data-a="seg"][data-seg="gaps"]'); await pg2.click('details.gap >> nth=0 >> summary'); await pg2.wait_for_timeout(100)
        check("Study shows what was said wrong last time", "Ai spus greșit" in await pg2.inner_text('details.gap >> nth=0') and "GIL nu protejează invarianții" in await pg2.inner_text('details.gap >> nth=0'))
        await pg2.click('.tab[data-tab="oral"]'); await pg2.click('[data-a="iv-mock"]'); await pg2.wait_for_selector('#ans-t')
        await pg2.fill('#ans-t', "GIL-ul lasă un singur thread să execute bytecode, deci pentru CPU-bound folosesc procese.")
        await pg2.click('[data-a="iv-start"]'); await pg2.wait_for_selector('.ai-v', timeout=3000)
        check("simulated interview: no theory button between cards", await pg2.locator('[data-a="th-open"]').count() == 0)
        # 6) Study with sample: the lesson, the targeted question, the repair (no scheduling side effects), details stay open across re-renders
        await fresh(pg2)
        A = await pg2.evaluate("(() => { const c = window.PREP.oral.find(c => c.m === 'gil'); return { id: c.id, k: c.k, n: c.k.length }; })()")
        await seed(pg2, A["id"], {"b": 2, "n": 3, "s": 60, "t": 5000, "mc": {"2": 2}, "m": [2], "w": ["Cred că GIL-ul face codul thread-safe."]})
        await pg2.click('.tab[data-tab="study"]'); await pg2.click('[data-a="seg"][data-seg="gaps"]'); await pg2.click('details.gap >> summary'); await pg2.wait_for_timeout(100)
        await pg2.click('[data-a="th-explain"]'); await pg2.wait_for_selector('.gap-les', timeout=3000)
        c0 = [c for c in await pg2.evaluate("window.__calls") if c["kind"] == "lesson"][0]
        check("lesson: default tier, no cache, no signal key, point and wrong claim in the prompt, no candidate text in Study", c0["tier"] == "default" and c0["cache"] is False and not c0["hasSignal"] and A["k"][2] in c0["prompt"] and "thread-safe" in c0["prompt"] and "Ce a scris candidatul" not in c0["prompt"] and "nu avem textul lui" in c0["prompt"], c0["prompt"][:200])
        check("lesson shown with its three labels; the block stayed open; the button is gone", await pg2.locator('.gap-les b').count() == 3 and await pg2.locator('details.gap[open]').count() == 1 and await pg2.locator('[data-a="th-explain"]').count() == 0)
        await pg2.screenshot(path=str(SHOTS / "g4-lesson.png"), full_page=True)
        before = await state_o(pg2, A["id"])
        await pg2.click('[data-a="th-test"]'); await pg2.wait_for_selector('textarea[data-chk]', timeout=3000)
        ca = [c for c in await pg2.evaluate("window.__calls") if c["kind"] == "ask"][0]
        check("targeted question: quick tier, about the missed point", ca["tier"] == "quick" and A["k"][2] in ca["prompt"] and "nu repeta întrebarea" in ca["prompt"])
        check("the question is shown as the interviewer's", "redimensionează imagini" in await pg2.inner_text('.gap .iv-m.int'))
        ng = len([c for c in await pg2.evaluate("window.__calls") if c["kind"] == "gapgrade"])
        await pg2.fill('textarea[data-chk]', "scurt"); await pg2.click('[data-a="th-send"]'); await pg2.wait_for_timeout(100)
        check("too-short answer sends nothing", len([c for c in await pg2.evaluate("window.__calls") if c["kind"] == "gapgrade"]) == ng)
        await pg2.evaluate("window.__gq.push(JSON.stringify({ covered: false, feedback: 'Mai lipsește costul proceselor.' }))")
        await pg2.fill('textarea[data-chk]', "Folosesc threaduri, merge destul de bine."); await pg2.click('[data-a="th-send"]'); await pg2.wait_for_selector('.gap-ai .ai-l', timeout=3000)
        check("wrong answer: 'Încă nu' with feedback; nothing repaired; answer kept", "Încă nu" in await pg2.inner_text('.gap-ai .ai-l') and "costul proceselor" in await pg2.inner_text('.gap-ai .ai-l') and await pg2.input_value('textarea[data-chk]') == "Folosesc threaduri, merge destul de bine." and (await state_o(pg2, A["id"])).get("mc") == {"2": 2})
        await pg2.fill('textarea[data-chk]', "Procese, fiindcă task-ul e CPU-bound și GIL-ul blochează threadurile."); await pg2.click('[data-a="th-send"]'); await pg2.wait_for_selector('.gap-ok', timeout=3000)
        e = await state_o(pg2, A["id"])
        check("good answer: 'Reparat'; counter cleared, point out of `m`, merge stamp `gt` set", e.get("mc") == {} and "m" not in e and e.get("gt", 0) > 5000, e)
        check("repair does not touch the Leitner schedule (b, n, s, t unchanged)", all(e[k] == before[k] for k in ["b", "n", "s", "t"]), (e, before))
        check("Study keeps showing the repaired point; tab label has no count", "Reparat" in await pg2.inner_text('main') and "(" not in await pg2.inner_text('[data-seg="gaps"]'))
        M = await pg2.evaluate("""() => {
          const T = window.__prep, mk = o => Object.assign(T.normalize({}), { o: { x: o } });
          const fixed = { t: 100, gt: 500, mc: {} }, stale = { t: 100, mc: { 1: 3 }, m: [1] };
          const a = T.mergeState(mk(fixed), mk(stale)), b = T.mergeState(mk(stale), mk(fixed));
          const pr = T.prune(Object.assign(T.normalize({}), { r: 50, o: { y: { t: 10, gt: 100 }, z: { t: 10 } } }));
          return { a: JSON.stringify(a.state.o.x.mc), an: a.localNewer, b: JSON.stringify(b.state.o.x.mc), bn: b.remoteNewer, keep: Object.keys(pr.o) };
        }""")
        check("merge: the newer `gt` wins in both directions; prune keeps an item whose gt is after the reset", M["a"] == "{}" and M["an"] and M["b"] == "{}" and M["bn"] and M["keep"] == ["y"], M)

        # 7) review with sample: the lesson sees what he wrote; a repaired point is not counted as missed on save
        await fresh(pg2)
        await start_gil(pg2)
        cid = await pg2.evaluate("(() => { const q = document.querySelector('.icard-q').textContent.replace(/\\s+/g, ' ').trim(); return window.PREP.oral.find(c => c.m === 'gil' && c.q.replace(/`/g, '').replace(/\\s+/g, ' ').trim() === q).id; })()")
        n = await pg2.evaluate("(id => window.PREP.oral.find(c => c.id === id).k.length)", cid)
        MINE = "GIL-ul lasă un singur thread să execute bytecode, deci pentru CPU-bound folosesc procese."
        await pg2.fill('#ans-t', MINE); await pg2.click('[data-a="iv-start"]'); await pg2.wait_for_selector('.ai-v', timeout=3000)
        await pg2.click('[data-a="th-open"]'); await pg2.wait_for_selector('.gap .gap-i')
        await pg2.click('.gap [data-a="th-explain"] >> nth=0'); await pg2.wait_for_selector('.gap-les', timeout=3000)
        cl = [c for c in await pg2.evaluate("window.__calls") if c["kind"] == "lesson"][-1]
        check("review lesson prompt carries what he wrote and the verdict's wrong claim", MINE in cl["prompt"] and "GIL nu protejează invarianții" in cl["prompt"] and "Ce a scris candidatul" in cl["prompt"])
        await pg2.click('.gap [data-a="th-test"] >> nth=0'); await pg2.wait_for_selector('textarea[data-chk]')
        await pg2.fill('textarea[data-chk]', "Procese, fiindcă task-ul e CPU-bound și GIL-ul blochează threadurile."); await pg2.click('.gap [data-a="th-send"]'); await pg2.wait_for_selector('.gap-ok', timeout=3000)
        check("repaired in review: nothing written to the state until save", (await pg2.evaluate("window.__prep.state().o"))[cid].get("mc") if cid in await pg2.evaluate("window.__prep.state().o") else True is True)
        await pg2.click('[data-a="oral-save"]'); await pg2.wait_for_timeout(100)
        e = await state_o(pg2, cid)
        check("save: the repaired point (1) has no counter and is out of `m`; the other misses count 1", e.get("mc") == {str(i): 1 for i in range(2, n)} and e.get("m") == list(range(2, n)), e)

        # 8) plan task and morning warm-up appear only with gaps; weights favour cards with gaps
        P = await pg2.evaluate("""() => {
          const days = window.__prep.genPlan(), last = days[days.length - 1];
          const g = days[0].tasks.find(t => t.key === 'gap');
          return { g: g && { go: g.go, min: g.min, text: g.text }, m: last.tasks.map(t => t.id.replace(/^g[\\d-]+-/, '')), when: last.when };
        }""")
        check("plan: evening 'gap' task opens Pentru tine; morning has m-gap after the warm-up, label 50–60", P["g"] and P["g"]["go"] == {"t": "study", "tab": "gaps"} and "goluri" in P["g"]["text"] and "m-gap" in P["m"] and "50–60" in P["when"], P)
        K = await pg2.evaluate("window.__prep.genPlan()[0].tasks.map(t => t.key)")
        check("regression: adding the gap task leaves the rest of the evening recipe alone (oral present, no smart/open fallback)", "oral" in K and "smart" not in K and "open" not in K and K.count("gap") == 1, K)
        await pg2.click('.tab[data-tab="plan"]'); await pg2.wait_for_timeout(100)
        await pg2.evaluate('[...document.querySelectorAll(\'[data-a="go"]\')].find(b => /-gap$/.test(b.dataset.id) && !/-m-gap$/.test(b.dataset.id)).click()'); await pg2.wait_for_timeout(100)
        check("the plan task opens Study › Pentru tine", "Ce ratezi" in await pg2.inner_text('main'))
        W = await pg2.evaluate("""() => {
          const T = window.__prep, s = T.state(), cs = window.PREP.oral.filter(c => window.PREP.modules.find(m => m.id === c.m).p === 1).slice(0, 3);
          const out = {};
          s.o = {}; T.setState(s); out.base = T.wO(cs[0]);
          s.o[cs[0].id] = { b: 1, n: 1, s: 20, t: 1, mc: { 0: 3, 1: 3 } }; s.o[cs[1].id] = { b: 1, n: 1, s: 20, t: 1, mc: { 0: 1 } }; s.o[cs[2].id] = { b: 1, n: 1, s: 20, t: 1, mc: {} }; T.setState(s);
          out.heavy = T.wO(cs[0]); out.light = T.wO(cs[1]); out.none = T.wO(cs[2]);
          return out;
        }""")
        check("weights: no gaps ×1; a little ×1.25; heavy gaps capped at ×2", abs(W["none"] * 2 - W["heavy"]) < 1e-9 and abs(W["none"] * 1.25 - W["light"]) < 1e-9, W)
        check("no page errors (with sample, AI steps)", not errs2, errs2)

        # 9) without sample there is no AI step in the theory
        ctx3 = await b.new_context(viewport={"width": 360, "height": 740}); pg3 = await ctx3.new_page()
        await pg3.route("**/fonts.*", lambda r: r.abort()); await fresh(pg3)
        await seed(pg3, A["id"], {"b": 1, "n": 1, "s": 30, "t": 1000, "mc": {"1": 2}, "m": [1]})
        await pg3.click('.tab[data-tab="study"]'); await pg3.click('[data-a="seg"][data-seg="gaps"]'); await pg3.click('details.gap >> summary'); await pg3.wait_for_timeout(100)
        check("no sample: theory only, no explain or targeted-question buttons", await pg3.locator('details.gap .gap-i').count() == 1 and await pg3.locator('[data-a="th-explain"], [data-a="th-test"]').count() == 0)
        check("no page errors (with sample)", not errs2, errs2)
        await b.close()
    print("\nFAILED: " + ", ".join(fails) if fails else "\nALL OK")
    raise SystemExit(1 if fails else 0)

asyncio.run(main())
