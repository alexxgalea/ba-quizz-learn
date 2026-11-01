# Checks Study › Schelete: the list grouped by module, the skeleton screen, the draft kept on the device,
# self-grading on the essential points with the oral-card Leitner thresholds, "Arată referința" before an attempt → 0,
# and the new state key (normalize / merge / prune / reset; readiness unchanged).
import asyncio, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = (ROOT / "dist" / "pregatire-onapsis.html").as_uri()
SID = "s-gil-bq"

fails = []
def check(name, ok, extra=""):
    print(("PASS " if ok else "FAIL ") + name + (" " + str(extra) if extra and not ok else ""))
    if not ok: fails.append(name)

async def fresh(pg):
    await pg.goto(PAGE); await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(400)

async def open_seg(pg):
    await pg.click('nav button[data-tab="study"]')
    await pg.click('button[data-a="seg"][data-seg="skel"]')

async def open_skel(pg, sid=SID):
    await open_seg(pg)
    await pg.click('button[data-a="skel"][data-k="%s"]' % sid)

async def skel_state(pg, sid=SID): return await pg.evaluate("id => window.__prep.state().s[id] || null", sid)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 360, "height": 780})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: m.type == "error" and "fonts.g" not in m.text and errs.append(m.text))
        await fresh(pg)

        # --- the segment and the list ---
        await open_seg(pg)
        segs = await pg.eval_on_selector_all('button[data-a="seg"]', "bs => bs.map(b => b.dataset.seg)")
        check("Schelete segment sits between Live coding and System design", segs.index("skel") == segs.index("katas") + 1 and segs.index("design") == segs.index("skel") + 1, segs)
        title = await pg.evaluate("window.PREP.skel.find(s => s.id === '%s').t" % SID)
        row = pg.locator('button[data-a="skel"][data-k="%s"]' % SID)
        check("skeleton row shows its title", title in (await row.text_content()))
        check("new skeleton is marked nou", "nou" in (await row.text_content()))
        grp = await pg.evaluate("""() => [...document.querySelectorAll('[data-skel-mod]')].map(e => e.dataset.skelMod)""")
        check("list is grouped by module, P1 first", len(grp) >= 1 and grp[0] == "gil", grp)
        check("no horizontal overflow on the list", await pg.evaluate("document.documentElement.scrollWidth <= 360"))

        # --- frontend groups, no Python colouring for other languages, the language in the AI prompt ---
        JS_ID, TS_ID = "s-frontend-closure", "s-frontend-union-never"
        grp = await pg.evaluate("""() => [...document.querySelectorAll('[data-skel-mod="frontend"] [data-skel-grp]')].map(e => [e.dataset.skelGrp, e.querySelector('.eyebrow').textContent.trim()])""")
        keys = [g[0] for g in grp]
        check("frontend skeletons are split into groups, in React / JavaScript / TypeScript order", keys == [k for k in ["react", "js", "ts"] if k in keys] and "js" in keys and "ts" in keys, grp)
        check("group headings use the language names", dict(grp).get("js") == "JavaScript" and dict(grp).get("ts") == "TypeScript", grp)
        check("each frontend skeleton sits in its own group", await pg.locator('[data-skel-grp="js"] button[data-k="%s"]' % JS_ID).count() == 1 and await pg.locator('[data-skel-grp="ts"] button[data-k="%s"]' % TS_ID).count() == 1 and await pg.locator('[data-skel-grp="js"] button[data-k="%s"]' % TS_ID).count() == 0)
        check("other modules have no group headings", await pg.locator('[data-skel-mod="gil"] [data-skel-grp]').count() == 0)
        refs = {}
        for sid in [SID, JS_ID, TS_ID]:
            await pg.click('button[data-a="skel"][data-k="%s"]' % sid)
            await pg.click('button[data-a="skel-done"]')
            refs[sid] = await pg.evaluate("() => ({ spans: document.querySelectorAll('.skel-ref code span').length, text: document.querySelector('.skel-ref code').textContent, w: document.documentElement.scrollWidth })")
            await pg.click('button[data-a="skel-back"]')
        check("the Python reference is highlighted", refs[SID]["spans"] > 0, refs[SID]["spans"])
        check("the JavaScript reference is shown without Python highlighting", refs[JS_ID]["spans"] == 0 and "function makeCounter" in refs[JS_ID]["text"], refs[JS_ID]["spans"])
        check("the TypeScript reference is shown without Python highlighting", refs[TS_ID]["spans"] == 0 and "function assertNever" in refs[TS_ID]["text"], refs[TS_ID]["spans"])
        check("no horizontal overflow on the JS / TS reference screens at 360 px", refs[JS_ID]["w"] <= 360 and refs[TS_ID]["w"] <= 360, (refs[JS_ID]["w"], refs[TS_ID]["w"]))
        langs = await pg.evaluate("""(ids) => ids.map(id => { const k = window.PREP.skel.find(s => s.id === id); return window.__prep.skelPrompt(k, 'x'.repeat(30)).user.split('\\n').find(l => l.indexOf('Limbaj') === 0); })""", [SID, JS_ID, TS_ID])
        check("the AI prompt carries the skeleton's language", langs == ["Limbaj: py", "Limbaj: js", "Limbaj: ts"], langs)

        # --- the skeleton screen and the draft ---
        await row.click()
        sk = await pg.evaluate("window.PREP.skel.find(s => s.id === '%s')" % SID)
        body = await pg.text_content("#main")
        check("screen shows the title", sk["t"] in body)
        check("screen shows the prompt", sk["p"].replace("`", "")[:60] in body.replace("\n", " "))
        ta = pg.locator('textarea[data-skel-code]')
        attrs = await ta.evaluate("t => [t.getAttribute('autocorrect'), t.getAttribute('autocapitalize'), t.getAttribute('spellcheck'), getComputedStyle(t).fontFamily]")
        check("code field: no autocorrect / autocapitalize / spellcheck", attrs[:3] == ["off", "off", "false"], attrs)
        check("code field is monospace", "mono" in attrs[3].lower() or "courier" in attrs[3].lower() or "menlo" in attrs[3].lower(), attrs[3])
        check("essential points are not shown before an attempt", sk["k"][0].replace("`", "")[:40] not in (await pg.text_content("#main")))
        await ta.click()
        await pg.keyboard.type("class BoundedQueue:")
        await pg.keyboard.press("Enter")
        await pg.keyboard.press("Tab")
        await pg.keyboard.type("pass")
        val = await ta.input_value()
        check("Tab inserts indentation and keeps focus", val == "class BoundedQueue:\n    pass" and await ta.evaluate("t => document.activeElement === t"), repr(val))
        await pg.wait_for_timeout(500)
        st = await pg.evaluate("JSON.stringify(window.__prep.state())")
        check("draft is not in the synced state", "BoundedQueue:" not in st)
        await pg.reload(); await pg.wait_for_timeout(400)
        await open_skel(pg)
        check("draft survives a reload", (await pg.locator('textarea[data-skel-code]').input_value()) == "class BoundedQueue:\n    pass")
        await pg.click('button[data-a="skel-back"]')
        check("back returns to the list", await pg.locator('button[data-a="skel"][data-k="%s"]' % SID).count() == 1)

        # --- self-grading and Leitner (thresholds of the oral cards) ---
        n = len(sk["k"])
        async def attempt(ticks):
            await open_skel(pg)
            await pg.click('button[data-a="skel-done"]')
            for i in ticks: await pg.click('button[data-a="skel-tick"][data-k="%d"]' % i)
            await pg.click('button[data-a="skel-save"]')
            await pg.wait_for_timeout(150)
        await open_skel(pg)
        await pg.click('button[data-a="skel-done"]')
        check("after 'Gata' the essential points appear as ticks", await pg.locator('button[data-a="skel-tick"]').count() == n)
        check("after 'Gata' the reference is visible", "class BoundedQueue" in (await pg.text_content(".skel-ref")))
        check("save button shows the count", ("0/%d" % n) in (await pg.text_content('button[data-a="skel-save"]')))
        for i in range(n): await pg.click('button[data-a="skel-tick"][data-k="%d"]' % i)
        await pg.click('button[data-a="skel-save"]')
        await pg.wait_for_timeout(150)
        e = await skel_state(pg)
        check("100% from new → box 2, one attempt, score 100", e and e["b"] == 2 and e["n"] == 1 and e["s"] == 100 and e["t"] > 0, e)
        check("draft is cleared after saving", await pg.evaluate("(JSON.parse(localStorage.getItem('onapsis-skel-draft-v1') || '{}'))['%s'] === undefined" % SID))
        check("after saving, back on the list with the box shown", "cutia 2" in (await pg.text_content('button[data-a="skel"][data-k="%s"]' % SID)))
        await attempt([0, 1])              # 50% → stays in box 2
        e = await skel_state(pg)
        check("50% keeps the box", e["b"] == 2 and e["n"] == 2 and e["s"] == 50, e)
        await attempt([0])                 # 25% → box 1
        e = await skel_state(pg)
        check("under 50% → box 1", e["b"] == 1 and e["s"] == 25, e)
        await attempt(range(n)); await attempt(range(n)); await attempt(range(n)); await attempt(range(n)); await attempt(range(n))
        check("box never goes above 5", (await skel_state(pg))["b"] == 5)

        # --- "Arată referința" before an attempt → 0 ---
        await pg.evaluate("id => { const s = window.__prep.state(); delete s.s[id]; window.__prep.setState(s); }", SID)
        await open_skel(pg)
        check("'Arată referința' is available before an attempt", await pg.locator('button[data-a="skel-peek"]').count() == 1)
        await pg.click('button[data-a="skel-peek"]')
        check("peek shows the reference", "class BoundedQueue" in (await pg.text_content(".skel-ref")))
        check("peek warns that the attempt counts 0", "0" in (await pg.text_content(".skel-peek-note")))
        for i in range(n): await pg.click('button[data-a="skel-tick"][data-k="%d"]' % i)
        await pg.click('button[data-a="skel-save"]')
        await pg.wait_for_timeout(150)
        e = await skel_state(pg)
        check("peek before attempt → score 0, box 1, whatever the ticks", e and e["s"] == 0 and e["b"] == 1, e)

        # the peek sticks to the skeleton until the next save: leaving and coming back does not erase it
        await pg.evaluate("id => { const s = window.__prep.state(); delete s.s[id]; window.__prep.setState(s); }", SID)
        await open_skel(pg)
        await pg.click('button[data-a="skel-peek"]')
        check("after a peek the code field stays editable", not await pg.locator('textarea[data-skel-code]').evaluate("t => t.readOnly"))
        await pg.click('button[data-a="skel-back"]')
        await open_skel(pg)
        check("coming back after a peek still shows the 0 warning", await pg.locator(".skel-peek-note").count() == 1)
        if await pg.locator('button[data-a="skel-done"]').count(): await pg.click('button[data-a="skel-done"]')
        for i in range(n): await pg.click('button[data-a="skel-tick"][data-k="%d"]' % i)
        await pg.click('button[data-a="skel-save"]')
        await pg.wait_for_timeout(150)
        check("peek → back → reopen → save still scores 0", (await skel_state(pg))["s"] == 0, await skel_state(pg))
        await open_skel(pg)
        check("after saving, the next attempt starts without the peek", await pg.locator(".skel-peek-note").count() == 0)
        await pg.click('button[data-a="skel-back"]')
        # a draft that starts with a newline keeps it after a re-render
        await pg.evaluate("localStorage.setItem('onapsis-skel-draft-v1', JSON.stringify({ '%s': '\\nx = 1' }))" % SID)
        await open_skel(pg)
        check("a leading newline in the draft survives rendering", (await pg.locator('textarea[data-skel-code]').input_value()) == "\nx = 1")
        await pg.click('button[data-a="skel-back"]')

        # --- the state key: normalize / merge / prune / reset; readiness unchanged ---
        R = await pg.evaluate("""(id) => {
          const T = window.__prep;
          const old = T.normalize({ v: 1, q: {}, o: {}, h: [] });
          const a = T.normalize({ v: 1, s: { [id]: { b: 2, n: 1, s: 100, t: 1000 }, 'x-only-a': { b: 1, n: 1, s: 0, t: 5 } }, h: [] });
          const b = T.normalize({ v: 1, s: { [id]: { b: 4, n: 3, s: 80, t: 2000 } }, h: [] });
          const m1 = T.mergeState(a, b).state.s, m2 = T.mergeState(b, a).state.s;
          const reset = T.mergeState(a, T.normalize({ v: 1, r: 1500, s: {}, h: [] })).state.s;
          const bad = T.normalize({ v: 1, s: { [id]: 'oops' }, h: [] }).s;
          return { old: old.s, m1, m2, reset, bad };
        }""", SID)
        check("an old state without the key normalizes to an empty map", R["old"] == {}, R["old"])
        check("merge keeps the newer skeleton entry, both directions", R["m1"][SID]["b"] == 4 and R["m2"][SID]["b"] == 4 and "x-only-a" in R["m1"], R["m1"])
        check("a newer reset drops older skeleton entries", R["reset"] == {}, R["reset"])
        check("normalize drops a malformed entry", R["bad"] == {}, R["bad"])
        r0 = await pg.evaluate("""(id) => { const T = window.__prep, s = T.state(); delete s.s[id]; T.setState(s); return T.readiness().ready; }""", SID)
        r1 = await pg.evaluate("""(id) => { const T = window.__prep, s = T.state(); s.s[id] = { b: 5, n: 9, s: 100, t: Date.now() }; T.setState(s); return T.readiness().ready; }""", SID)
        check("skeletons do not change the readiness score", r0 == r1, (r0, r1))
        await pg.click('nav button[data-tab="progress"]')
        await pg.click('button[data-a="reset"]')
        await pg.click('button[data-a="reset"]')
        await pg.wait_for_timeout(200)
        check("the progress reset clears skeletons too", await pg.evaluate("Object.keys(window.__prep.state().s).length") == 0)

        check("no console errors", not errs, errs)
        await b.close()
    print("\n" + ("ALL PASS" if not fails else "FAILED: " + ", ".join(fails)))
    if fails: raise SystemExit(1)

asyncio.run(main())
