# PrepApp (spec §4.5): what Jarvis sees of the app. `record` must leave the same traces as saving a card on screen; `next`, `theory`, `summary` and `log` give content and progress.
import asyncio, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = (ROOT / "dist" / "pregatire-onapsis.html").as_uri()

fails = []
def check(name, ok, extra=""):
    print(("PASS " if ok else "FAIL ") + name + (" " + str(extra) if extra and not ok else ""))
    if not ok: fails.append(name)

async def fresh(pg):
    await pg.goto(PAGE); await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(400)

# A card of the gil module and its key points, read from the data (the test builds verdicts of the right length from it).
CARD = "() => { const c = window.PREP.oral.find(c => c.m === 'gil'); return { id: c.id, k: c.k }; }"

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 360, "height": 740})
        pg = await ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" and "fonts" not in m.text and "Failed to load resource" not in m.text else None)
        await pg.route("**/fonts.*", lambda r: r.abort())
        await fresh(pg)
        c = await pg.evaluate(CARD); n = len(c["k"]); cid = c["id"]
        so = lambda: pg.evaluate("id => window.__prep.state().o[id]", cid)

        check("PrepApp is exposed with its five methods", await pg.evaluate("['next','record','theory','summary','log'].every(m => typeof window.PrepApp[m] === 'function')"))

        # --- record: same traces as saving on screen
        r = await pg.evaluate("([id, n]) => window.PrepApp.record(id, { points: Array(n).fill('spontan') })", [cid, n])
        e = await so()
        check("all spontan: score 1, box 2, no gaps", r == {"ok": True, "score": 1, "prev": None, "box": 2, "missed": []} and e["s"] == 100 and e["b"] == 2 and e["n"] == 1 and e["mc"] == {} and "m" not in e, [r, e])

        await fresh(pg)
        r = await pg.evaluate("([id, n]) => window.PrepApp.record(id, { points: Array(n).fill('nu') })", [cid, n])
        e = await so()
        check("all nu: score 0, box 1, every point is a gap", r["score"] == 0 and r["box"] == 1 and r["missed"] == c["k"] and e["m"] == list(range(n)) and e["mc"] == {str(i): 1 for i in range(n)}, [r, e])

        await fresh(pg)
        pts = ["spontan", "dupa"] + ["nu"] * (n - 2)
        r = await pg.evaluate("([id, pts]) => window.PrepApp.record(id, { points: pts })", [cid, pts])
        e = await so()
        check("a point covered only after a follow-up counts half and stays a gap", abs(r["score"] - 1.5 / n) < 1e-9 and e["m"] == list(range(1, n)) and "0" not in e["mc"], [r, e])

        r = await pg.evaluate("([id, n]) => window.PrepApp.record(id, { points: Array(n).fill('spontan') })", [cid, n])
        e = await so()
        check("a second, full answer repays the gaps and reports the previous score", r["prev"] is not None and abs(r["prev"] - 1.5 / n) < 0.01 and e["mc"] == {} and "m" not in e and e["n"] == 2, [r, e])

        await fresh(pg)
        await pg.evaluate("([id, n]) => window.PrepApp.record(id, { points: Array(n).fill('nu'), wrong: ['a1', 'a2', 'a3', 'a4', 'a5'] })", [cid, n])
        e = await so()
        check("wrong claims are kept, at most three", e["w"] == ["a1", "a2", "a3"], e)

        await fresh(pg)
        bad = await pg.evaluate("""([id, n]) => [window.PrepApp.record(id, { points: ['spontan'] }), window.PrepApp.record(id, { points: Array(n).fill('poate') }), window.PrepApp.record('nu-exista', { points: [] })].map(r => r.ok)""", [cid, n])
        check("an invalid verdict is refused and nothing is saved", bad == [False, False, False] and await so() is None, bad)

        # --- next
        await fresh(pg)
        card = await pg.evaluate("window.PrepApp.next({ mode: 'train', done: [] })")
        check("train gives a card with everything Jarvis needs", set(card) == {"id", "module", "moduleName", "q", "code", "points", "model", "rules", "missed", "best"} and card["points"] and card["rules"]["max"] >= 2, card)
        seen = await pg.evaluate("() => { const ids = new Set(); for (let i = 0; i < 40; i++) ids.add(window.PrepApp.next({ mode: 'train', done: [] }).id); return ids.size; }")
        check("train varies the cards", seen > 3, seen)
        ex = await pg.evaluate("() => { const all = window.PREP.oral.map(c => c.id); const keep = all[0]; return window.PrepApp.next({ mode: 'train', done: all.filter(id => id !== keep) }).id === keep; }")
        check("train never repeats a done card", ex)
        await pg.evaluate("""() => { const T = window.__prep, s = T.state(); const strong = window.PREP.oral.filter(c => window.PREP.modules.find(m => m.id === c.m).p < 4);
          strong.forEach((c, i) => { s.o[c.id] = { b: 5, n: 3, s: 100, t: Date.now() - 1e6 }; }); s.o[strong[0].id] = { b: 1, n: 3, s: 0, t: Date.now() - 1e8 }; T.setState(s); window.__weak = strong[0].id; }""")
        hits = await pg.evaluate("() => { let n = 0; for (let i = 0; i < 60; i++) if (window.PrepApp.next({ mode: 'train', done: [] }).id === window.__weak) n++; return n; }")
        check("train favours the weak, due card", hits >= 30, hits)

        tp = await pg.evaluate("""() => { const ok = []; for (let i = 0; i < 12; i++) ok.push(window.PrepApp.next({ mode: 'topic', module: 'asyncio', done: [] }).module); return [ok.every(m => m === 'asyncio'), window.PrepApp.next({ mode: 'topic', module: 'nu-exista', done: [] })]; }""")
        check("topic stays in its module; an unknown module gives no card", tp == [True, None], tp)

        slots = await pg.evaluate("""() => { const done = [], out = []; for (let i = 0; i < 8; i++) { const c = window.PrepApp.next({ mode: 'mock', done: done.slice() }); out.push(c ? [c.module, !!c.code] : null); if (c) done.push(c.id); } return out; }""")
        okslots = slots[0][0] in ("gil", "asyncio") and slots[1][0] == "oop" and slots[2][0] in ("pytest", "python") and slots[3][0] == "asgi" and slots[4][0] == "frontend" and slots[5][1] and slots[6][0] == "design" and slots[7] is None
        check("mock walks the seven slots of the technical interview (BE + FE), then stops", okslots, slots)

        d = await pg.evaluate("""() => { const c = window.PREP.oral.find(c => c.m === 'design'); const s = window.__prep.state(); s.o[c.id] = { b: 1, n: 1, s: 0, t: 1, m: [0], mc: { 0: 1 }, a: 'Varianta mea bună.' }; window.__prep.setState(s);
          for (let i = 0; i < 80; i++) { const x = window.PrepApp.next({ mode: 'topic', module: 'design', done: [] }); if (x.id === c.id) return [x.rules.max, x.missed, x.best, c.k[0]]; } return null; }""")
        check("a card carries its rules, what was missed last time and the best earlier answer", d is not None and d[0] == 3 and d[1] == [d[3]] and d[2] == "Varianta mea bună.", d)

        # --- theory
        await fresh(pg)
        await pg.evaluate("([id, n]) => window.PrepApp.record(id, { points: Array(n).fill('nu') })", [cid, n])
        th = await pg.evaluate("id => window.PrepApp.theory(id)", cid)
        check("theory is plain text, names the missed points and stays short", isinstance(th, str) and "<" not in th and c["k"][0].replace("`", "") in th and len(th) <= 900, th)
        th2 = await pg.evaluate("id => window.PrepApp.theory(id)", await pg.evaluate("window.PREP.oral.find(c => c.m === 'oop').id"))
        check("without gaps theory still gives the model answer", isinstance(th2, str) and len(th2) > 20, th2)

        # --- summary
        sm = await pg.evaluate("window.PrepApp.summary()")
        days = await pg.evaluate("""() => { const [y, m, d] = window.__prep.cfg().d.split('-').map(Number); const t = new Date(); return Math.round((new Date(y, m - 1, d) - new Date(t.getFullYear(), t.getMonth(), t.getDate())) / 86400000); }""")
        check("summary: readiness, days left, top gaps, role and profile", 0 <= sm["readiness"] <= 1 and sm["daysLeft"] == days and 1 <= len(sm["gaps"]) <= 3 and "Python" in sm["role"] and sm["profile"].startswith("Profilul candidatului"), sm)

        # --- log
        await pg.evaluate("window.PrepApp.log({ title: 'Jarvis · antrenament', n: 2, c: 1.5, dur: 600 })")
        h = await pg.evaluate("window.__prep.state().h.slice(-1)[0]")
        check("log adds one history row of kind jarvis", h["kind"] == "jarvis" and h["title"] == "Jarvis · antrenament" and h["n"] == 2 and h["c"] == 1.5 and h["dur"] == 600, h)
        await pg.click('.tab[data-tab="progress"]'); await pg.wait_for_timeout(200)
        txt = await pg.locator(".hist").inner_text()
        check("the history shows it as Jarvis, with its percentage", "Jarvis" in txt and "75%" in txt, txt)

        check("no page errors", not errs, errs)
        await b.close()
    print("\nALL OK" if not fails else "\nFAILED: " + str(fails))
    raise SystemExit(1 if fails else 0)

asyncio.run(main())
