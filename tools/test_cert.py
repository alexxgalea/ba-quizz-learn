# Checks the full certification ("Certificare"): the pick (20 grile, 6 oral cards split backend / frontend, 2 skeletons py + ts),
# the score (20% grile, 50% oral, 30% code; pass at 70% overall and 60% per section), the gaps, and the whole flow through the screens:
# grile without context or feedback, the oral cards with the interviewer, the skeletons with the AI check, quitting and resuming a section,
# resuming after a reload, the certificate, the history entry and the summary. `window.claude.sample` is scripted (as in test_interview.py).
import asyncio, pathlib, json
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = (ROOT / "dist" / "pregatire-onapsis.html").as_uri()
SHOTS = ROOT / "shots"
SHOTS.mkdir(exist_ok=True)

SAMPLE = """
window.__calls = []; window.__q = { turn: [], verdict: [], skel: [], grade: [] };
const sample = (prompt, opts) => new Promise((res, rej) => {
  const kind = prompt.includes('"act":"followup"') ? 'turn' : prompt.includes('"spontan"') ? 'verdict' : prompt.includes('"errors"') ? 'skel' : 'grade';
  window.__calls.push({ kind, prompt });
  const q = window.__q[kind]; let item = q.length ? q.shift() : null;
  const n = (prompt.match(/^\\d+\\. /gm) || []).length;
  if (item === null) item = kind === 'turn' ? JSON.stringify({ act: 'done' })
    : kind === 'verdict' ? JSON.stringify({ covered: Array(n).fill('spontan'), missing: [], wrong: [], feedback: 'Complet.' })
    : kind === 'skel' ? JSON.stringify({ covered: [0, 1], errors: [], missing: ['restul'] })
    : JSON.stringify({ covered: Array(n).fill(true), missing: [], wrong: [], feedback: 'ok' });
  setTimeout(() => res({ text: item, truncated: false }), 20);
});
window.claude = { use: async name => (name === 'sample' ? sample : null) };
"""

fails = []
def check(name, ok, extra=""):
    print(("PASS " if ok else "FAIL ") + name + (" " + str(extra) if extra and not ok else ""))
    if not ok: fails.append(name)

ANS = "Folosesc asyncio pentru I/O-bound și procese pentru CPU-bound, fiindcă GIL-ul serializează bytecode-ul."
CODE = "import asyncio\n\nasync def main():\n    await asyncio.sleep(0)\n\nasyncio.run(main())\n"

async def fresh(pg):
    await pg.goto(PAGE); await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(400)

async def ui(pg, expr): return await pg.evaluate("(() => { const ui = window.__prep.ui(); return " + expr + "; })()")

async def answer_mcq(pg, n_right):
    # answers every grile of the running section: the first n_right correctly, the rest wrong
    total = await ui(pg, "ui.run.items.length")
    for i in range(total):
        pos = await pg.evaluate("""(right) => {
          const run = window.__prep.ui().run, it = run.items[run.i], q = window.PREP.mcq.find(x => x.id === it.id);
          const ok = it.ord.indexOf(q.a); return right ? ok : (ok + 1) % it.ord.length;
        }""", i < n_right)
        await pg.click('[data-a="ans"][data-pos="%d"]' % pos)
        if i < total - 1: await pg.click('[data-a="next"]')
    await pg.click('[data-a="submit"]'); await pg.wait_for_timeout(100)

async def oral_card(pg, verdict=None):
    if verdict: await pg.evaluate("v => { window.__q.verdict.push(v); }", verdict)
    await pg.fill('#ans-t', ANS); await pg.click('[data-a="iv-start"]')
    await pg.wait_for_selector('.ai-v', timeout=3000)
    await pg.click('[data-a="oral-save"]'); await pg.wait_for_timeout(80)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 360, "height": 740}, device_scale_factor=2)
        await ctx.add_init_script(SAMPLE)
        pg = await ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" and "fonts" not in m.text and "Failed to load resource" not in m.text else None)
        await pg.route("**/fonts.*", lambda r: r.abort())
        await fresh(pg)

        # 0) pure logic: the pick
        L = await pg.evaluate("""() => {
          const T = window.__prep, P = window.PREP, MOD = Object.fromEntries(P.modules.map(m => [m.id, m]));
          const out = [];
          for (let r = 0; r < 25; r++) {
            const c = T.pickCert(), q = c.q.map(id => P.mcq.find(x => x.id === id)), o = c.o.map(id => P.oral.find(x => x.id === id)), s = c.s.map(id => P.skel.find(x => x.id === id));
            const per = {}; q.forEach(x => { per[x.m] = (per[x.m] || 0) + 1; });
            const p12 = P.modules.filter(m => m.p <= 2 && P.mcq.some(x => x.m === m.id)).map(m => m.id);
            out.push({
              qn: q.length, qdist: new Set(c.q).size === c.q.length, qall: q.every(Boolean),
              p12once: p12.every(m => per[m] === 1), p3: q.filter(x => MOD[x.m].p === 3).length, p3dist: new Set(q.filter(x => MOD[x.m].p === 3).map(x => x.m)).size, bonus: q.filter(x => MOD[x.m].p > 3).length,
              om: o.map(x => x && x.m), ocode: !!(o[5] && o[5].code), on: o.length, odist: new Set(c.o).size,
              s: s.map(x => x && [x.m, x.lang])
            });
          }
          return out;
        }""")
        check("pick: 20 distinct grile, all real", all(x["qn"] == 20 and x["qdist"] and x["qall"] for x in L), L[0])
        check("pick: one grilă from every P1 and P2 module, two from distinct P3 modules, no Bonus", all(x["p12once"] and x["p3"] == 2 and x["p3dist"] == 2 and x["bonus"] == 0 for x in L), L[0])
        SLOTS = [["gil", "asyncio"], ["oop", "python", "pytest"], ["asgi"], ["react"], ["js", "ts", "frontend"], ["fedebug"]]
        check("pick: 6 distinct oral cards, 3 backend then 3 frontend slots", all(x["on"] == 6 and x["odist"] == 6 and all(m in SLOTS[i] for i, m in enumerate(x["om"])) for x in L), [x["om"] for x in L[:3]])
        check("pick: the last frontend card is a snippet (has code)", all(x["ocode"] for x in L))
        BE = ["gil", "asyncio", "python", "oop", "pytest", "asgi"]
        check("pick: one Python skeleton from a P1 backend module, one TS / TSX skeleton from frontend", all(x["s"][0][0] in BE and x["s"][0][1] == "py" and x["s"][1][0] == "frontend" and x["s"][1][1] in ("ts", "tsx") for x in L), [x["s"] for x in L[:3]])
        R = await pg.evaluate("""() => {
          const T = window.__prep, P = window.PREP;
          const gil = P.oral.find(c => c.m === 'gil'), re = P.oral.find(c => c.m === 'react'), sk = P.skel.find(k => k.m === 'asyncio'), mq = P.mcq.find(q => q.m === 'pytest');
          const res = { q: { n: 20, c: 17, per: { pytest: { n: 1, c: 0 }, gil: { n: 2, c: 2 } }, wrong: [mq.id] }, o: [{ id: gil.id, p: 0.3 }, { id: re.id, p: 1 }], s: [{ id: sk.id, p: 0.5 }] };
          const a = T.certScore(res);
          const b = T.certScore({ q: { n: 20, c: 20, per: {}, wrong: [] }, o: [{ id: gil.id, p: 0.9 }], s: [{ id: sk.id, p: 0.55 }] });
          const c = T.certScore({ q: { n: 20, c: 16, per: {}, wrong: [] }, o: [{ id: gil.id, p: 0.7 }], s: [{ id: sk.id, p: 0.7 }] });
          const e = T.certScore({ q: null, o: [], s: [] });
          return { a, b, c, e, ids: { gil: gil.id, re: re.id, sk: sk.id, mq: mq.id }, w: T.CERT_W };
        }""")
        a = R["a"]
        check("score: sections are grile c/n, mean oral, mean code", abs(a["q"] - 0.85) < 1e-9 and abs(a["o"] - 0.65) < 1e-9 and abs(a["s"] - 0.5) < 1e-9, a)
        check("score: weights 20 / 50 / 30", R["w"] == {"q": 0.2, "o": 0.5, "s": 0.3} and abs(a["tot"] - (0.2 * 0.85 + 0.5 * 0.65 + 0.3 * 0.5)) < 1e-9, [R["w"], a["tot"]])
        check("pass: needs 70% overall and 60% on every section", a["pass"] is False and R["b"]["pass"] is False and R["c"]["pass"] is True and R["b"]["tot"] >= 0.7, [R["b"], R["c"]])
        check("empty result: zeros, not a pass", R["e"]["q"] == 0 and R["e"]["o"] == 0 and R["e"]["s"] == 0 and R["e"]["pass"] is False)
        mods = {m["m"]: m for m in a["mods"]}
        check("modules: grile, oral and code pooled per module, weakest first", abs(mods["pytest"]["p"] - 0) < 1e-9 and abs(mods["gil"]["p"] - (2 + 0.3) / 3) < 1e-9 and mods["gil"]["n"] == 3 and a["mods"][0]["p"] <= a["mods"][-1]["p"], a["mods"])
        check("gaps: below 80% only, production before recognition (oral, code, then grile)", [(g["t"], g["id"]) for g in a["gaps"]] == [("o", R["ids"]["gil"]), ("s", R["ids"]["sk"]), ("q", R["ids"]["mq"])], a["gaps"])

        # 1) entry point on the Plan
        check("plan: the certification card with a start button", await pg.locator('.cert-card [data-a="cert"]').count() == 1 and "Certificare" in (await pg.text_content('.cert-card') or "") and "Start" in await pg.inner_text('.cert-card [data-a="cert"]'))
        await pg.screenshot(path=str(SHOTS / "cert0-plan.png"))
        await pg.click('.cert-card [data-a="cert"]'); await pg.wait_for_timeout(100)
        check("start: the certification screen explains the three sections", await pg.locator('.cert .cert-sec').count() == 3 and await pg.locator('[data-a="cert-go"]').count() == 1)
        await pg.screenshot(path=str(SHOTS / "cert1-intro.png"), full_page=True)

        # 2) section 1: grile, without context, without feedback, 15 min
        await pg.click('[data-a="cert-go"]'); await pg.wait_for_timeout(100)
        run = await ui(pg, "({ kind: ui.run.kind, mode: ui.run.mode, cert: ui.run.cert, n: ui.run.items.length, title: ui.run.title, left: ui.run.deadline - Date.now(), ids: ui.run.items.map(x => x.id), want: ui.cert.ids.q })")
        check("grile: a mock run of the 20 picked grile, flagged as certification", run["kind"] == "mcq" and run["mode"] == "mock" and run["cert"] is True and run["n"] == 20 and sorted(run["ids"]) == sorted(run["want"]) and "Certificare" in run["title"], run)
        check("grile: 15 minutes on the clock", 14 * 60000 < run["left"] <= 15 * 60000, run["left"])
        check("grile: no context, no 'I don't know'", await pg.locator('.ctx, .ctx-btn, [data-a="dunno"]').count() == 0)
        await answer_mcq(pg, 17)
        check("after grile: back on the certification screen, grile scored 85%", await ui(pg, "ui.tab") == "cert" and "85%" in await pg.inner_text('.cert-sec[data-s="q"]'), await pg.inner_text('.cert'))
        st = await pg.evaluate("window.__prep.state()")
        check("grile answers recorded (Leitner) and the session in the history", sum(1 for i in run["ids"] if st["q"].get(i, {}).get("n") == 1) == 20 and any(e["kind"] == "mcq" and "Certificare" in e["title"] for e in st["h"]))

        # 3) reload: the certification resumes at the next section
        await pg.reload(); await pg.wait_for_timeout(400)
        check("after a reload the plan offers to continue", "Continuă" in await pg.inner_text('.cert-card [data-a="cert"]'))
        await pg.click('.cert-card [data-a="cert"]'); await pg.wait_for_timeout(100)
        check("resumed: grile done, oral next", "85%" in await pg.inner_text('.cert-sec[data-s="q"]') and await ui(pg, "ui.cert.step") == "o")
        await pg.screenshot(path=str(SHOTS / "cert2-hub.png"), full_page=True)

        # 4) section 2: oral cards with the interviewer; quit after two, resume with the other four
        await pg.click('[data-a="cert-go"]'); await pg.wait_for_timeout(100)
        o = await ui(pg, "({ kind: ui.run.kind, mock: ui.run.mock, cert: ui.run.cert, items: ui.run.items, want: ui.cert.ids.o })")
        check("oral: the 6 picked cards, in mock mode (interviewer only)", o["kind"] == "oral" and o["mock"] is True and o["cert"] is True and o["items"] == o["want"], o)
        check("oral: only the interviewer button, no direct check, no reveal", await pg.locator('[data-a="iv-start"]').count() == 1 and await pg.locator('[data-a="oral-ai"], [data-a="oral-reveal"]').count() == 0)
        n0 = await pg.evaluate("id => window.PREP.oral.find(c => c.id === id).k.length", o["items"][0])
        await oral_card(pg, json.dumps({"covered": ["nu"] * n0, "missing": ["tot"], "wrong": [], "feedback": "Lipsește mecanismul."}))
        await oral_card(pg)
        await pg.click('[data-a="quit"]'); await pg.click('[data-a="quit"]'); await pg.wait_for_timeout(100)
        check("quitting the oral section goes back to the certification, 2/6 kept", await ui(pg, "ui.tab") == "cert" and "2/6" in await pg.inner_text('.cert-sec[data-s="o"]'), await pg.inner_text('.cert-sec[data-s="o"]'))
        await pg.click('[data-a="cert-go"]'); await pg.wait_for_timeout(100)
        check("resuming the oral section: only the 4 cards left", await ui(pg, "ui.run.items") == o["want"][2:])
        for _ in range(4): await oral_card(pg)
        check("after oral: certification screen, 5 of 6 cards full → 83%", await ui(pg, "ui.tab") == "cert" and "83%" in await pg.inner_text('.cert-sec[data-s="o"]'), await pg.inner_text('.cert-sec[data-s="o"]'))
        st = await pg.evaluate("window.__prep.state()")
        check("oral cards recorded with their gaps", st["o"][o["want"][0]]["s"] == 0 and st["o"][o["want"][0]].get("m") and all(st["o"][i]["s"] == 100 for i in o["want"][1:]))

        # 5) section 3: skeletons with the AI check; the second one peeked → 0
        await pg.click('[data-a="cert-go"]'); await pg.wait_for_timeout(100)
        sids = await ui(pg, "ui.cert.ids.s")
        check("code: the first skeleton opens, with a way back to the certification", await ui(pg, "ui.tab") == "study" and await ui(pg, "ui.study.skel") == sids[0] and "Certificare" in await pg.inner_text('[data-a="cert-open"]'))
        await pg.fill('[data-skel-code]', CODE); await pg.click('[data-a="skel-ai"]'); await pg.wait_for_selector('.skel-ai h3', timeout=3000)
        await pg.screenshot(path=str(SHOTS / "cert3-skel.png"), full_page=True)
        await pg.click('[data-a="skel-save"]'); await pg.wait_for_timeout(100)
        check("after the first skeleton the second one opens", await ui(pg, "ui.study.skel") == sids[1] and await ui(pg, "ui.cert.step") == "s")
        await pg.click('[data-a="skel-peek"]'); await pg.click('[data-a="skel-save"]'); await pg.wait_for_timeout(150)

        # 6) the certificate
        check("done: certification screen with the certificate", await ui(pg, "ui.tab") == "cert" and await ui(pg, "ui.cert.step") == "done" and await pg.locator('.cert-total').count() == 1)
        exp = await pg.evaluate("window.__prep.certScore(window.__prep.ui().cert.res)")
        k0 = await pg.evaluate("id => window.PREP.skel.find(k => k.id === id).k.length", sids[0])
        check("code section: 2 of the first skeleton's points, 0 for the peeked one", abs(exp["s"] - (2 / k0) / 2) < 1e-9, exp["s"])
        check("the total shown is the computed one", (str(round(exp["tot"] * 100)) + "%") in await pg.inner_text('.cert-total'), [exp["tot"], await pg.inner_text('.cert-total')])
        check("verdict: not passed (code under 60%)", exp["pass"] is False and "Netrecut" in await pg.inner_text('.cert-verdict'))
        check("at most 5 gaps, each with a way to practise", 1 <= await pg.locator('.cert-gap').count() <= 5 and await pg.locator('.cert-gap button[data-a]').count() == await pg.locator('.cert-gap').count())
        summ = await pg.input_value('#cert-sum')
        check("summary for Claude: total, sections, modules, gaps", all(x in summ for x in ["Certificare", "Grile 85%", "Explică 83%", "Cod ", "Goluri"]), summ)
        st = await pg.evaluate("window.__prep.state()")
        ce = [e for e in st["h"] if e["kind"] == "cert"]
        check("one history entry for the certification, with the scores, no time counted twice", len(ce) == 1 and abs(ce[0]["cert"]["tot"] - exp["tot"]) < 1e-9 and not ce[0].get("dur"), ce)
        await pg.screenshot(path=str(SHOTS / "cert4-done.png"), full_page=True)
        await pg.emulate_media(color_scheme="dark"); await pg.wait_for_timeout(100)
        await pg.screenshot(path=str(SHOTS / "cert4-done-dark.png"), full_page=True)
        await pg.emulate_media(color_scheme="light")

        # 7) back on the plan: the last result; history row; a new certification starts clean
        await pg.click('.tab[data-tab="plan"]'); await pg.wait_for_timeout(100)
        check("plan shows the last certificate", (str(round(exp["tot"] * 100)) + "%") in await pg.inner_text('.cert-card'))
        await pg.click('.tab[data-tab="progress"]'); await pg.wait_for_timeout(100)
        check("progress history labels the certification", "certificare" in await pg.inner_text('.hist'))
        await pg.click('.tab[data-tab="plan"]'); await pg.click('.cert-card [data-a="cert"]'); await pg.wait_for_timeout(100)
        await pg.click('[data-a="cert-new"]'); await pg.wait_for_timeout(100)
        check("a new certification starts from the grile section", await ui(pg, "ui.cert.step") == "q" and await ui(pg, "ui.cert.res.o.length") == 0)

        # 8) without Claude: the button explains instead of starting
        ctx2 = await b.new_context(viewport={"width": 360, "height": 740})
        pg2 = await ctx2.new_page(); await pg2.route("**/fonts.*", lambda r: r.abort())
        await pg2.goto(PAGE); await pg2.evaluate("localStorage.clear()"); await pg2.reload(); await pg2.wait_for_timeout(400)
        await pg2.click('.cert-card [data-a="cert"]'); await pg2.wait_for_timeout(100)
        check("without sample: no certification starts, a message explains", await pg2.evaluate("window.__prep.ui().cert") is None and "Claude" in (await pg2.text_content('#toast') or ""))
        await ctx2.close()

        check("no console errors", not errs, errs)
        await b.close()
    print("\n" + ("OK" if not fails else "FAILED: " + ", ".join(fails)))
    if fails: raise SystemExit(1)

asyncio.run(main())
