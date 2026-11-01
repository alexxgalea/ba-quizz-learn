# Checks Study › Schelete: the list grouped by module, the skeleton screen, the draft kept on the device,
# self-grading on the essential points with the oral-card Leitner thresholds, "Arată referința" before an attempt → 0,
# and the new state key (normalize / merge / prune / reset; readiness unchanged).
import asyncio, json, pathlib, subprocess, tempfile
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

        # --- "Scadente": the due skeletons, in box order, with the same due dates as questions and cards ---
        ids = await pg.evaluate("window.PREP.skel.map(s => s.id)")
        other = next((i for i in ids if i != SID), None)
        async def set_skels(m):
            await pg.evaluate("m => { const T = window.__prep, s = T.state(); s.s = m; T.setState(s); }", m)
        await set_skels({})
        await open_seg(pg)
        entry = pg.locator('button[data-a="skel-due"]')
        check("Scadente entry is on the list and shows 0 on a fresh state", await entry.count() == 1 and "Scadente" in (await entry.text_content()) and "(0)" in (await entry.text_content()))
        t_now = await pg.evaluate("Date.now()")
        due = {SID: {"b": 1, "n": 1, "s": 0, "t": t_now - 30 * 60000}}
        if other: due[other] = {"b": 3, "n": 1, "s": 100, "t": t_now - 3 * 86400000}
        notdue = next((i for i in ids if i not in due), None)
        if notdue: due[notdue] = {"b": 2, "n": 1, "s": 100, "t": t_now - 10 * 60000}      # box 2, 10 min ago: not due
        await set_skels(due)
        await open_seg(pg)
        want = [SID] + ([other] if other else [])
        check("the entry counts the due skeletons only", ("(%d)" % len(want)) in (await pg.locator('button[data-a="skel-due"]').text_content()), await pg.locator('button[data-a="skel-due"]').text_content())
        await pg.click('button[data-a="skel-due"]')
        shown = await pg.eval_on_selector_all('button[data-a="skel"]', "bs => bs.map(b => b.dataset.k)")
        check("Scadente lists the due skeletons only, weakest box first", shown == want, shown)
        check("no horizontal overflow on the due list", await pg.evaluate("document.documentElement.scrollWidth <= 360"))
        await pg.click('button[data-a="skel"][data-k="%s"]' % SID)
        await pg.click('button[data-a="skel-done"]')
        for i in range(n): await pg.click('button[data-a="skel-tick"][data-k="%d"]' % i)
        await pg.click('button[data-a="skel-save"]')
        await pg.wait_for_timeout(150)
        shown = await pg.eval_on_selector_all('button[data-a="skel"]', "bs => bs.map(b => b.dataset.k)")
        check("after saving, the skeleton leaves the due list, which stays open", shown == want[1:], shown)
        await pg.click('button[data-a="seg"][data-seg="skel"]')
        check("tapping the segment again shows every skeleton", await pg.locator('button[data-a="skel"]').count() == len(ids))

        # --- the evening plan: task "sch" ---
        iso_in2 = await pg.evaluate("""() => { const t = new Date(), d = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 2);
          return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }""")
        async def plan_with(m, extra=""):
            return await pg.evaluate("""([m, iso]) => { const T = window.__prep, s = T.state(); s.s = m; s.c = { d: iso, h: 2.5, t: Date.now() }; s.p = {}; s.h = []; T.setState(s);
              const plan = T.genPlan(); const day = plan[0];
              return { day, nextDay: plan[1], ids: day.tasks.map(t => t.key) }; }""", [m, iso_in2])
        t_now = await pg.evaluate("Date.now()")
        have_due = {SID: {"b": 1, "n": 1, "s": 0, "t": t_now - 30 * 60000}}
        P = await plan_with(have_due)
        sch = next((t for t in P["day"]["tasks"] if t["key"] == "sch"), None)
        check("every evening has a 'sch' task with a stable id", sch is not None and sch["id"].endswith("-sch") and sch["id"].startswith("g"), P["ids"])
        n_new = min(3, len(ids) - 1)
        check("task text counts the due skeletons and the new ones", sch and sch["text"] == "Schelete: 1 scadente + %d noi." % n_new, sch and sch["text"])
        check("task takes 15-20 minutes", sch and 15 <= sch["min"] <= 20, sch and sch["min"])
        keys = P["ids"]
        check("task sits right after oral and before the kata", "oral" in keys and keys.index("sch") == keys.index("oral") + 1 or ("oral" not in keys and "open" in keys), keys)
        check("a kata is still planned next to the skeleton task", any(k.startswith("kata-") for k in keys), keys)
        check("task opens the first due skeleton", sch and sch["go"]["t"] == "skel" and sch["go"]["id"] == SID, sch and sch["go"])
        nxt = next((t for t in P["nextDay"]["tasks"] if t["key"] == "sch"), None)
        check("later evenings have the task too, without a count", nxt is not None and nxt["id"] != sch["id"], nxt)
        # nothing due: the task opens a new skeleton from the module with the greatest need
        P0 = await plan_with({})
        sch0 = next((t for t in P0["day"]["tasks"] if t["key"] == "sch"), None)
        best = await pg.evaluate("""() => { const T = window.__prep, P = window.PREP, mods = [...new Set(P.skel.map(k => k.m))];
          mods.sort((a, b) => T.modNeed(P.modules.find(m => m.id === b)) - T.modNeed(P.modules.find(m => m.id === a)));
          return P.skel.find(k => k.m === mods[0]).id; }""")
        check("with nothing due the text says 0 due + the new ones", sch0 and sch0["text"] == "Schelete: 0 scadente + %d noi." % min(3, len(ids)), sch0 and sch0["text"])
        check("new skeletons come from the module with the greatest need", sch0 and sch0["go"]["id"] == best, (sch0 and sch0["go"], best))
        # checking the task keeps it after regeneration, and it is not proposed twice
        await pg.evaluate("""id => { const T = window.__prep, s = T.state(); s.p[id] = { d: 1, t: Date.now() }; T.setState(s); }""", sch["id"])
        done_plan = await pg.evaluate("window.__prep.genPlan()[0].tasks.filter(t => t.key === 'sch').map(t => t.id)")
        check("a checked 'sch' task stays after the plan is regenerated", done_plan == [sch["id"]], done_plan)
        await set_skels({SID: {"b": 5, "n": 3, "s": 100, "t": t_now}})
        done_plan = await pg.evaluate("window.__prep.genPlan()[0].tasks.filter(t => t.key === 'sch').map(t => t.id)")
        check("... even after the skeletons were done and nothing is due", done_plan == [sch["id"]], done_plan)
        # the task opens the skeleton screen in the app
        await pg.evaluate("""([m, iso]) => { const T = window.__prep, s = T.state(); s.s = m; s.p = {}; s.c = { d: iso, h: 2.5, t: Date.now() }; T.setState(s); }""", [have_due, iso_in2])
        await pg.click('nav button[data-tab="progress"]'); await pg.click('nav button[data-tab="plan"]')
        await pg.click('[data-a="go"][data-id$="-sch"]')
        await pg.wait_for_timeout(100)
        check("the task opens Schelete at the first due skeleton", (await pg.locator("#main h2").first.text_content()) == title and await pg.locator('textarea[data-skel-code]').count() == 1)
        await pg.click('button[data-a="skel-back"]')

        # --- time on a skeleton goes into the history (so today's budget shrinks) ---
        async def timed_attempt(minutes, ticks, peek=False):
            await pg.evaluate("() => { window.__realNow = window.__realNow || Date.now.bind(Date); window.__shift = 0; Date.now = () => window.__realNow() + window.__shift; }")
            await open_skel(pg)
            await pg.evaluate("m => { window.__shift = m * 60000; }", minutes)
            if peek: await pg.click('button[data-a="skel-peek"]')
            else: await pg.click('button[data-a="skel-done"]')
            for i in ticks: await pg.click('button[data-a="skel-tick"][data-k="%d"]' % i)
            await pg.click('button[data-a="skel-save"]')
            await pg.wait_for_timeout(100)
            await pg.evaluate("() => { window.__shift = 0; }")
            return await pg.evaluate("window.__prep.state().h.filter(e => e.kind === 'skel')")
        await pg.evaluate("() => { const T = window.__prep, s = T.state(); s.h = []; s.s = {}; T.setState(s); }")
        hs = await timed_attempt(4, [0, 1])
        e = hs[-1] if hs else None
        check("a saved attempt writes a history entry (kind skel) with the time spent", e and e["mode"] == "skel" and e["title"] == title and e["n"] == n and e["c"] == 2 and 239 <= e["dur"] <= 242 and e["id"] and e["ts"], e)
        hs = await timed_attempt(120, [0])
        check("an attempt left open for hours counts at most 15 minutes", hs[-1]["dur"] <= 900 and hs[-1]["dur"] > 0, hs[-1])
        hs = await timed_attempt(2, [0, 1], peek=True)
        check("a peeked attempt is logged with the score it got (0)", hs[-1]["c"] == 0, hs[-1])
        check("three attempts, three history entries", len(hs) == 3, len(hs))

        # --- the budget: skeleton time shrinks tonight's plan, and the task never costs the kata ---
        async def plan_mins(hours, hist_dur=0, skels=None):
            return await pg.evaluate("""([hours, dur, skels, iso]) => { const T = window.__prep, s = T.state();
              s.s = skels || {}; s.p = {}; s.h = dur ? [{ id: 'hs', ts: Date.now(), kind: 'skel', mode: 'skel', title: 'x', n: 4, c: 4, dur }] : [];
              s.c = { d: iso, h: hours, t: Date.now() }; T.setState(s);
              const day = T.genPlan()[0]; return { total: day.tasks.reduce((a, t) => a + t.min, 0), keys: day.tasks.map(t => t.key) }; }""", [hours, hist_dur, skels, iso_in2])
        saved = await pg.evaluate("() => JSON.stringify(window.__prep.state())")
        base = await plan_mins(2.5)
        spent = await plan_mins(2.5, 60 * 60)
        check("an hour spent on skeletons shrinks tonight's plan (the history entry counts)", spent["total"] < base["total"], (base["total"], spent["total"]))
        all_done = {i: {"b": 5, "n": 3, "s": 100, "t": t_now} for i in ids}          # nothing due, nothing new: no 'sch' task
        for hrs in (1.5, 2, 2.5, 3, 4, 5, 6):
            with_sch = await plan_mins(hrs); without = await plan_mins(hrs, 0, all_done)
            check("%s h: the skeleton task is there, and the kata survives exactly when it would without it" % hrs, "sch" in with_sch["keys"] and "sch" not in without["keys"] and any(k.startswith("kata-") for k in with_sch["keys"]) == any(k.startswith("kata-") for k in without["keys"]), (with_sch["keys"], without["keys"]))

        await pg.evaluate("j => window.__prep.setState(window.__prep.normalize(JSON.parse(j)))", saved)

        # --- Progres: the skeleton line and the history row ---
        t_now = await pg.evaluate("Date.now()")
        cons = {SID: {"b": 3, "n": 2, "s": 100, "t": t_now - 3 * 86400000}}                # known (box >= 3), and due
        if other: cons[other] = {"b": 1, "n": 1, "s": 0, "t": t_now - 30 * 60000}           # due, not known
        third = next((i for i in ids if i not in cons), None)
        if third: cons[third] = {"b": 2, "n": 1, "s": 60, "t": t_now - 10 * 60000}          # started, not due, not known
        await set_skels(cons)
        await pg.click('nav button[data-tab="progress"]')
        sec = pg.locator("section.card", has=pg.locator("h3", has_text="Schelete"))
        want_line = "1 știute · %d de repetat · %d neîncepute" % (1 + (1 if other else 0), len(ids) - len(cons))
        check("Progres shows X știute · Y de repetat · Z neîncepute", await sec.count() == 1 and want_line in (await sec.text_content()), await sec.text_content() if await sec.count() else "no section")
        row = pg.locator(".hist-r").first
        check("the history lists the skeleton attempt with its score", title in (await row.text_content()) and "schelete" in (await row.text_content()) and "0/%d" % n in (await row.text_content()), await row.text_content())
        check("no horizontal overflow on Progres", await pg.evaluate("document.documentElement.scrollWidth <= 360"))

        # --- the module sheet links to its skeletons ---
        per_mod = await pg.evaluate("() => { const c = {}; window.PREP.skel.forEach(k => { c[k.m] = (c[k.m] || 0) + 1; }); return c; }")
        no_skel = await pg.evaluate("() => window.PREP.modules.map(m => m.id).filter(id => !window.PREP.skel.some(k => k.m === id))")
        for mid, cnt in list(per_mod.items())[:2]:
            await pg.click('nav button[data-tab="progress"]')
            await pg.click('.tile[data-m="%s"]' % mid)
            lk = pg.locator('details.sheet[open] button[data-a="skel-mod"]')
            check("sheet %s has the link 'Schelete (%d)'" % (mid, cnt), await lk.count() == 1 and (await lk.text_content()).strip() == "Schelete (%d)" % cnt, await lk.count())
            await lk.click()
            on_skel = await pg.evaluate("document.querySelector('button[data-a=seg][aria-pressed=true]').dataset.seg")
            vis = await pg.evaluate("m => { const e = document.querySelector('[data-skel-mod=' + m + ']'); if (!e) return false; const r = e.getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight; }", mid)
            check("the link opens Schelete scrolled to module %s" % mid, on_skel == "skel" and vis, (on_skel, vis))
        if no_skel:
            await pg.click('nav button[data-tab="progress"]'); await pg.click('.tile[data-m="%s"]' % no_skel[0])
            check("a sheet without skeletons has no link", await pg.locator('details.sheet[open] button[data-a="skel-mod"]').count() == 0)

        # --- the Perplexity brief: counts per module and the missed skeletons ---
        def brief(skels):
            with tempfile.TemporaryDirectory() as d:
                src, out = pathlib.Path(d) / "progress.json", pathlib.Path(d) / "brief.md"
                src.write_text(json.dumps({"v": 1, "q": {}, "o": {}, "h": [], "s": skels}))
                subprocess.run(["node", str(ROOT / "export" / "make_brief.js"), str(src), str(out)], check=True, capture_output=True)
                return out.read_text()
        mods = await pg.evaluate("() => window.PREP.modules.map(m => ({ id: m.id, short: m.short }))")
        short = {m["id"]: m["short"] for m in mods}
        sk_mod = await pg.evaluate("window.PREP.skel.map(s => [s.id, s.m, s.t])")
        mod_of = {i: m for i, m, _ in sk_mod}; title_of = {i: t for i, _, t in sk_mod}
        weak_id = SID; strong_id = other
        sprog = {weak_id: {"b": 1, "n": 1, "s": 20, "t": 1000}}
        if strong_id: sprog[strong_id] = {"b": 4, "n": 2, "s": 90, "t": 2000}
        md = brief(sprog)
        known_in = lambda mid: sum(1 for i, e in sprog.items() if mod_of[i] == mid and e["b"] >= 3)
        total_in = lambda mid: sum(1 for m in mod_of.values() if m == mid)
        check("brief counts skeletons per module (known / total)", ("%s: %d/%d" % (short[mod_of[SID]], known_in(mod_of[SID]), total_in(mod_of[SID]))) in md)
        check("brief lists a skeleton whose last score is under 50%", ("`%s`" % weak_id) in md and title_of[weak_id] in md and "20%" in md)
        if strong_id: check("brief does not list a skeleton scored 50% or more", ("`%s`" % strong_id) not in md)
        md2 = brief({weak_id: {"b": 2, "n": 1, "s": 50, "t": 1000}})
        check("exactly 50% is not a miss", ("`%s`" % weak_id) not in md2)
        check("a progress export without skeletons still builds the brief, with zero known", "0 știute din" in brief({}))

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
