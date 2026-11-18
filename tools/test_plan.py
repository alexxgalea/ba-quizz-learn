# Checks the generated plan, the Leitner due dates, the open questions, the "Formulări" page and the interview settings.
import asyncio, datetime, json, pathlib
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = (ROOT / "dist" / "pregatire-onapsis.html").as_uri()
SHOTS = ROOT / "shots"
SHOTS.mkdir(exist_ok=True)

def ok(cond, msg):
    print(("PASS " if cond else "FAIL ") + msg)
    return cond

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 360, "height": 740}, device_scale_factor=2)
        pg = await ctx.new_page()
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.on("console", lambda m: errors.append("console:" + m.text) if m.type == "error" and "fonts" not in m.text and "ERR_NAME_NOT_RESOLVED" not in m.text and "Failed to load resource" not in m.text else None)
        await pg.route("**/fonts.*", lambda r: r.abort())
        await pg.goto(PAGE)
        await pg.wait_for_timeout(300)

        logic = await pg.evaluate("""() => {
          const T = window.__prep, P = window.PREP, out = {};
          const day = d => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate() + d); };
          const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
          // settings: interview in two days, 2.5 h per evening
          const S = T.state(); S.c = { d: iso(day(2)), h: 2.5, t: Date.now() }; T.setState(S);
          const plan = T.genPlan();
          out.days = plan.length;
          out.dates = plan.map(d => d.date);
          out.todayFirst = plan[0].tasks[0].go.t;                      // fresh state: diagnostic first
          out.eveningMin = plan.slice(0, -1).map(d => d.tasks.reduce((s, t) => s + t.min, 0));
          out.morning = plan[plan.length - 1].tasks.map(t => t.go.t);
          out.lastHasIntv = plan[plan.length - 2].tasks.some(t => t.go.t === "study" && t.go.tab === "intv");
          out.sheetsToday = plan[0].tasks.filter(t => t.go.t === "sheet").map(t => t.go.m);
          out.sheetsTomorrow = plan[1].tasks.filter(t => t.go.t === "sheet").map(t => t.go.m);
          out.noRepeat = !out.sheetsToday.some(m => out.sheetsTomorrow.includes(m));
          out.kataToday = (plan[0].tasks.find(t => t.go.t === "kata") || {}).go;
          out.firstModuleP1 = window.PREP.modules.find(m => m.id === out.sheetsToday[0]).p === 1;
          // due dates per box (orarul de durată): interview far away, so the interview window does not cap them
          const t0 = Date.now(), dd = x => Math.round((new Date(new Date(x).setHours(0, 0, 0, 0)) - day(0)) / 86400000);
          const cfgAt = d => { S.c = { d: iso(day(d)), h: 2.5, t: Date.now() }; T.setState(S); };
          cfgAt(30);
          T.updQ("gil-01", false); out.box1 = S.q["gil-01"].b; out.due1 = Math.round((T.dueAt(S.q["gil-01"]) - t0) / 60000);        // 20 min
          T.updQ("gil-01", true); out.box2 = S.q["gil-01"].b; out.due2 = Math.round((T.dueAt(S.q["gil-01"]) - t0) / 3600000);      // 4 h
          out.boxes = []; out.dueDays = [];
          for (let i = 0; i < 7; i++) { T.updQ("gil-01", true); out.boxes.push(S.q["gil-01"].b); out.dueDays.push(dd(T.dueAt(S.q["gil-01"]))); }   // 3..8, 8
          out.notDueNow = !T.isDue(S.q["gil-01"]);
          // an item that sat in the old top box (5) comes back 7 days after its last answer
          out.oldTop = dd(T.dueAt({ b: 5, n: 6, c: 6, l: 1, t: day(-2).getTime() + 3600000 }));                                    // -2 + 7 = 5
          // interview window: 6 days left → day intervals at most 3 days; an item answered long ago is due now
          cfgAt(6);
          out.winTop = dd(T.dueAt(S.q["gil-01"]));
          out.winOld = T.isDue({ b: 6, n: 6, c: 6, l: 1, t: day(-10).getTime() });
          out.win20 = Math.round((T.dueAt({ b: 1, n: 1, c: 0, l: 0, t: t0 }) - t0) / 60000);
          cfgAt(2);
          // an item answered wrong 30 min ago is due; one answered right 10 min ago is not
          S.q["gil-02"] = { b: 1, n: 1, c: 0, l: 0, t: t0 - 30 * 60000 };
          S.q["gil-03"] = { b: 2, n: 1, c: 1, l: 1, t: t0 - 10 * 60000 };
          out.dueIds = T.pickDue(20).map(q => q.id);
          out.smartHasDue = T.pickSmart(15).some(q => q.id === "gil-02");
          // open questions: grades and boxes
          T.updX("py-01", 2); out.xKnow = S.x["py-01"].b;      // 2
          T.updX("py-01", 1); out.xPart = S.x["py-01"].b;      // stays 2 (cap)
          T.updX("py-01", 0); out.xNo = S.x["py-01"].b;        // 1
          out.openPick = T.pickOpen(8).length;
          out.openMs = T.pickOpen(5, ["celery"]).every(q => q.m === "celery");
          // merge keeps the newer settings and the open-question map
          const a = T.normalize({ x: { "py-01": { b: 2, n: 1, c: 1, t: 100 } }, c: { d: "2026-10-22", h: 2, t: 100 } });
          const bb = T.normalize({ x: { "py-01": { b: 1, n: 2, c: 1, t: 200 } }, c: { d: "2026-10-23", h: 3, t: 50 } });
          const m = T.mergeState(a, bb);
          out.mergeX = m.state.x["py-01"].t === 200 && m.state.c.d === "2026-10-22";
          out.badCfgDropped = !T.normalize({ c: { d: "nope" } }).c;
          out.planPast = (() => { const s2 = T.state(); const keep = s2.c; s2.c = { d: iso(day(-1)), h: 2, t: Date.now() }; const n = T.genPlan().length; s2.c = keep; return n; })();
          // today's list is stable: a checked sheet task stays, its module is not proposed again, and spent time shrinks the budget
          const p1 = T.genPlan(), firstSheet = p1[0].tasks.find(t => t.key.indexOf("sheet-") === 0);
          S.p[firstSheet.id] = { d: 1, t: Date.now() };
          S.h.push({ id: "hx", ts: Date.now(), kind: "mcq", mode: "module", title: "x", n: 10, c: 8, dur: 60 * 60 });
          const p2 = T.genPlan();
          out.doneStays = p2[0].tasks.some(t => t.id === firstSheet.id) && p2[0].tasks.filter(t => t.key === firstSheet.key).length === 1;
          out.notTwice = !p2[1].tasks.some(t => t.key === firstSheet.key);
          out.budgetShrinks = p2[0].tasks.reduce((a, t) => a + t.min, 0) < p1[0].tasks.reduce((a, t) => a + t.min, 0) - 30;
          out.oralCoversDone = (p2[0].tasks.find(t => t.key === "oral") || { go: {} }).go.ms.includes(firstSheet.go.m);
          delete S.p[firstSheet.id]; S.h = S.h.filter(e => e.id !== "hx");
          return out;
        }""")
        print("LOGIC", json.dumps(logic, ensure_ascii=False))
        ok(logic["days"] == 3 and logic["todayFirst"] == "diag", "plan: 3 days, diagnostic first on a fresh state")
        ok(all(abs(m - 150) <= 25 for m in logic["eveningMin"]), "plan: evenings fit ~2.5 h " + str(logic["eveningMin"]))
        ok(logic["morning"] == ["due", "ivmock", "study", "study", "study"] and logic["lastHasIntv"], "plan: morning warm-up and formulations on the last evening")
        ok(logic["noRepeat"] and logic["firstModuleP1"] and logic["kataToday"], "plan: modules don't repeat, P1 first, one kata per evening")
        ok(logic["box1"] == 1 and logic["due1"] == 20 and logic["box2"] == 2 and logic["due2"] == 4 and logic["boxes"] == [3, 4, 5, 6, 7, 8, 8] and logic["dueDays"] == [1, 3, 7, 16, 35, 75, 75] and logic["notDueNow"], "due dates: 20 min, 4 h, then 1, 3, 7, 16, 35, 75 days; the top box (8) comes back " + str(logic["boxes"]) + " " + str(logic["dueDays"]))
        ok(logic["oldTop"] == 5, "an item in the old top box (5) is due 7 days after its last answer: " + str(logic["oldTop"]))
        ok(logic["winTop"] == 3 and logic["winOld"] and logic["win20"] == 20, "interview window (6 days left): day intervals capped at 3, an old item is due now, 20 min stays")
        ok("gil-02" in logic["dueIds"] and "gil-03" not in logic["dueIds"] and logic["smartHasDue"], "due queue: wrong 30 min ago is due, right 10 min ago is not; smart mix takes due first")
        ok(logic["xKnow"] == 2 and logic["xPart"] == 2 and logic["xNo"] == 1 and logic["openPick"] == 8 and logic["openMs"], "open questions: grading and picking")
        ok(logic["mergeX"] and logic["badCfgDropped"] and logic["planPast"] == 1, "merge keeps newer settings and open-question items; a past interview gives the one-day maintenance plan")
        ok(logic["doneStays"] and logic["notTwice"] and logic["budgetShrinks"] and logic["oralCoversDone"], "today's list: checked task stays, module not re-proposed, spent time shrinks the budget, oral covers the done module")

        # daily review cap (fundatie-concepte, ticket 02): 200 overdue MCQs from earlier days, one wrong answer from today
        cap = await pg.evaluate("""() => {
          const T = window.__prep, P = window.PREP, out = {}, D = 86400000;
          const day = d => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate() + d); };
          const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
          const keep = JSON.parse(JSON.stringify(T.state()));
          const pr = id => P.modules.find(m => m.id === P.mcq.find(q => q.id === id).m).p;
          const ids = P.mcq.filter(q => pr(q.id) < 4).map(q => q.id).slice(0, 200);
          const S = { v: 1, r: 0, q: {}, o: {}, x: {}, k: {}, s: {}, p: {}, l: {}, h: [], c: { d: iso(day(30)), h: 2.5, t: Date.now() } };
          ids.forEach((id, i) => { S.q[id] = { b: 3, n: 2, c: 2, l: 1, t: day(-2 - (i % 9)).getTime() + 3600000 }; });   // box 3: due 1 day after, so 1..9 days late
          T.setState(S);
          let dt = T.dueToday();
          out.n = dt.q.length; out.min = dt.min; out.left = dt.left; out.cap = dt.cap;
          out.firstP1 = pr(dt.q[0].id) === 1;
          const late = id => Date.now() - T.dueAt(T.state().q[id]);
          out.p1Order = dt.q.filter(q => pr(q.id) === 1).every((q, i, a) => i === 0 || late(a[i - 1].id) >= late(q.id) - 1000);
          out.planLeft = /așteaptă zilele următoare/.test((T.genPlan()[0].tasks.find(t => t.key === "due") || {}).text || "");
          // answer the 35 of the portion and one more today (reviews): the cap is spent, the rest waits; a wrong answer from today still comes back
          dt.q.slice(0, 35).forEach(q => T.updQ(q.id, true));
          T.updQ(ids[199], false);
          const s2 = T.state(); s2.q[ids[199]].t = Date.now() - 21 * 60000; T.setState(s2);
          dt = T.dueToday();
          out.used = dt.used; out.after = dt.q.map(q => q.id);
          out.wrongBack = out.after.includes(ids[199]);
          out.spent = dt.q.length === 1;
          T.setState(keep);
          return out;
        }""")
        print("CAP", json.dumps(cap, ensure_ascii=False))
        ok(cap["cap"] == 25 and 0 < cap["min"] <= 25.01 and cap["n"] == 35 and cap["left"] == 165, "review cap: 200 overdue MCQs → today's portion fits 25 min (35 MCQs), 165 wait")
        ok(cap["firstP1"] and cap["p1Order"] and cap["planLeft"], "review cap: P1 first, most overdue first, the plan says what waits")
        ok(cap["used"] >= 25 and cap["wrongBack"] and cap["spent"], "review cap: spent after 36 reviews today, a wrong answer from today still comes back")

        # maintenance mode (fundatie-concepte, ticket 03): past or cleared date → today only, in the minutes per day
        mt = await pg.evaluate("""() => {
          const T = window.__prep, out = {};
          const day = d => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate() + d); };
          const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
          const keep = JSON.parse(JSON.stringify(T.state()));
          const base = { v: 1, r: 0, q: {}, o: {}, x: {}, k: {}, s: {}, p: {}, l: {}, h: [] };
          const run = c => { T.setState(Object.assign(JSON.parse(JSON.stringify(base)), c ? { c } : {})); const p = T.genPlan(); return { mode: T.planMode(), n: p.length, date: p[0] && p[0].date, keys: p[0] ? p[0].tasks.map(t => t.key) : [], min: p[0] ? p[0].tasks.reduce((a, t) => a + t.min, 0) : 0 }; };
          out.past = run({ d: iso(day(-3)), h: 2.5, t: 1 });
          out.cleared = run({ d: "", h: 2.5, t: 1 });
          out.short = run({ d: "", h: 2.5, m: 20, r: 10, t: 1 });
          out.oldEvent = run({ d: "", h: 2, t: 1 });
          out.oldCfg = T.cfg();
          out.future = run({ d: iso(day(4)), h: 2.5, t: 1 });
          out.today = iso(day(0));
          out.normKeeps = T.normalize({ c: { d: "", h: 2, m: 30, r: 15, t: 5 } }).c;
          T.setState(keep);
          return out;
        }""")
        print("MAINT", json.dumps(mt, ensure_ascii=False))
        code = lambda k: "sch" in k or any(x.startswith("kata-") for x in k)
        mod = lambda k: "smart" in k or any(x.startswith("sheet-") for x in k)
        ok(mt["past"]["mode"] == "maint" and mt["past"]["n"] == 1 and mt["past"]["date"] == mt["today"] and "due" in mt["past"]["keys"] and mod(mt["past"]["keys"]) and code(mt["past"]["keys"]), "maintenance: a past date gives today only, with due, a module and a code task " + str(mt["past"]))
        ok(mt["cleared"]["mode"] == "maint" and mt["cleared"]["keys"] == mt["past"]["keys"] and abs(mt["past"]["min"] - 45) <= 15, "maintenance: a cleared date gives the same plan, ~45 min " + str(mt["cleared"]))
        ok(mt["short"]["min"] <= 30 and mt["short"]["min"] < mt["past"]["min"], "maintenance: 20 min per day gives a shorter plan " + str(mt["short"]))
        ok(mt["oldCfg"]["m"] == 45 and mt["oldCfg"]["r"] == 25, "an old settings event without m / r takes the defaults")
        ok(mt["future"]["mode"] == "interview" and mt["future"]["n"] == 5, "a future date brings the plan by days back: " + str(mt["future"]["n"]))
        ok(mt["normKeeps"] == {"d": "", "h": 2, "m": 30, "r": 15, "t": 5}, "normalize keeps a cleared date and the new settings " + str(mt["normKeeps"]))

        # UI: plan tab after the state above (the page re-renders on tab switch)
        await pg.click('.tab[data-tab="progress"]')
        await pg.click('.tab[data-tab="plan"]')
        await pg.wait_for_timeout(150)
        plan_ui = await pg.evaluate("""() => ({
          hdr: document.querySelector('#hdr-k').textContent, t: document.querySelector('#hdr-t').textContent,
          due: document.querySelector('.card.due').innerText, days: document.querySelectorAll('details.day').length,
          next: document.querySelector('.card.next') ? document.querySelector('.card.next').innerText.slice(0, 80) : '' })""")
        print("plan ui:", json.dumps(plan_ui, ensure_ascii=False))
        ok(plan_ui["days"] == 3 and "Mai sunt 2 zile" in plan_ui["t"] and ("grile" in plan_ui["due"] or "1 grilă" in plan_ui["due"]), "plan page renders the generated days and the due card")
        await pg.screenshot(path=str(SHOTS / "6-plan-gen.png"), full_page=False)

        # start today's "Scadențe" task → due MCQ run
        await pg.evaluate("document.querySelector('[data-a=\"go\"][data-id$=\"-due\"]').click()")
        await pg.wait_for_timeout(150)
        due_run = await pg.evaluate("() => document.querySelector('.eyebrow') ? document.querySelector('.eyebrow').textContent : ''")
        ok("De repetat acum" in due_run, "'Scadențe' task starts the due run: " + due_run)
        await pg.click('[data-a="quit"]'); await pg.click('[data-a="quit"]'); await pg.wait_for_timeout(150)
        if await pg.query_selector('[data-a="close-result"]'): await pg.click('[data-a="close-result"]')

        # open questions: ask → reveal → grade → result
        await pg.click('.tab[data-tab="oral"]')
        await pg.click('[data-a="open"][data-f="smart"]')
        await pg.wait_for_timeout(150)
        ask = await pg.evaluate("""() => ({ q: document.querySelector('.icard-q').textContent.length, reveal: !!document.querySelector('[data-a=open-reveal]'), grade: !!document.querySelector('[data-a=open-grade]') })""")
        ok(ask["q"] > 10 and ask["reveal"] and not ask["grade"], "open question: ask phase")
        await pg.screenshot(path=str(SHOTS / "7-open-ask.png"), full_page=True)
        await pg.click('[data-a="open-reveal"]')
        await pg.wait_for_timeout(150)
        rev = await pg.evaluate("""() => ({ ans: document.querySelector('#fb .ttl').textContent, grades: document.querySelectorAll('[data-a=open-grade]').length, idea: document.querySelector('#fb .xp-h').textContent })""")
        ok(rev["ans"] == "Răspunsul" and rev["grades"] == 3 and rev["idea"] == "Ideea din spate", "open question: review phase")
        await pg.screenshot(path=str(SHOTS / "8-open-review.png"), full_page=True)
        qid = await pg.evaluate("() => window.__prep.state() && document.querySelector('.chip.acc').textContent.toLowerCase()")
        await pg.click('[data-a="open-grade"][data-g="2"]')
        await pg.wait_for_timeout(120)
        st = await pg.evaluate("(id) => window.__prep.state().x[id]", qid)
        ok(st and st["b"] == 2 and st["l"] == 2, "open question: 'Știam' stored in S.x " + json.dumps(st))
        # keyboard: Enter reveals, 1 grades "nu știam"
        await pg.keyboard.press("Enter"); await pg.wait_for_timeout(100)
        qid2 = await pg.evaluate("() => document.querySelector('.chip.acc').textContent.toLowerCase()")
        await pg.keyboard.press("1"); await pg.wait_for_timeout(100)
        st2 = await pg.evaluate("(id) => window.__prep.state().x[id]", qid2)
        ok(st2 and st2["b"] == 1 and st2["l"] == 0, "open question: keyboard reveal + grade")
        await pg.click('[data-a="quit"]'); await pg.click('[data-a="quit"]'); await pg.wait_for_timeout(150)
        res = await pg.evaluate("() => document.querySelector('.score') ? document.querySelector('.score').innerText : ''")
        ok("întrebări" in res, "open question: result screen " + res.replace("\n", " ")[:60])
        hist = await pg.evaluate("() => window.__prep.state().h.filter(e => e.kind === 'open').length")
        ok(hist == 1, "open question: history entry")
        await pg.click('[data-a="close-result"]')

        # study: formulations page
        await pg.click('.tab[data-tab="study"]')
        await pg.click('[data-a="seg"][data-seg="intv"]')
        await pg.wait_for_timeout(150)
        intv = await pg.evaluate("""() => {
          const P = window.PREP, p1 = new Set(P.modules.filter(m => m.p === 1).map(m => m.id));
          const exp = P.mcq.filter(q => p1.has(q.m) && P.expl[q.id] && P.expl[q.id].intv);
          return { n: document.querySelectorAll('.intv-r').length, mods: document.querySelectorAll('details.sheet').length, label: document.querySelector('.row .xs.muted.mono').textContent,
            expN: exp.length, expMods: new Set(exp.map(q => q.m)).size };
        }""")
        # expected counts come from the data: P1 modules change as priorities move
        ok(intv["n"] == intv["expN"] and intv["mods"] == intv["expMods"] and intv["n"] > 0 and str(intv["n"]) in intv["label"], "formulations: P1 shows every P1 line, grouped by module " + json.dumps(intv, ensure_ascii=False))
        await pg.click('[data-a="intv-f"][data-f="weak"]'); await pg.wait_for_timeout(100)
        weak = await pg.evaluate("() => document.querySelectorAll('.intv-r.weak').length")
        ok(weak >= 1, "formulations: weak filter shows the wrong one (" + str(weak) + ")")
        await pg.click('[data-a="intv-f"][data-f="all"]'); await pg.wait_for_timeout(100)
        alln = await pg.evaluate("() => [document.querySelectorAll('.intv-r').length, window.PREP.mcq.filter(q => window.PREP.expl[q.id] && window.PREP.expl[q.id].intv).length]")
        ok(alln[0] == alln[1] and alln[0] > 0, "formulations: all shows every explanation with a 'La interviu' line " + str(alln))
        await pg.click('[data-a="intv-f"][data-f="p1"]'); await pg.wait_for_timeout(100)
        await pg.screenshot(path=str(SHOTS / "9-intv.png"), full_page=False)

        # progress: settings change the header and the plan
        await pg.click('.tab[data-tab="progress"]')
        await pg.wait_for_timeout(100)
        # four days from today, so the check does not depend on the date the suite runs
        target = datetime.date.today() + datetime.timedelta(days=4)
        days_ro = ["luni", "marți", "miercuri", "joi", "vineri", "sâmbătă", "duminică"]
        months_ro = ["ian", "feb", "mar", "apr", "mai", "iun", "iul", "aug", "sept", "oct", "nov", "dec"]
        hdr_exp = days_ro[target.weekday()][:3] + " " + str(target.day) + " " + months_ro[target.month - 1]
        await pg.fill('#cfg-d', target.isoformat())
        await pg.select_option('#cfg-h', '2')
        await pg.click('[data-a="cfg-save"]')
        await pg.wait_for_timeout(150)
        cfg = await pg.evaluate("() => ({ hdr: document.querySelector('#hdr-k').textContent, c: window.__prep.state().c, days: window.__prep.genPlan().length, weak: !!document.querySelector('[data-a=redo-weak]') })")
        print("cfg:", json.dumps(cfg, ensure_ascii=False))
        ok(hdr_exp in cfg["hdr"] and cfg["c"]["h"] == 2 and cfg["days"] == 5 and cfg["weak"], "settings: date + hours saved, header and plan follow, weak-spots card present")
        await pg.emulate_media(color_scheme="dark")
        await pg.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await pg.wait_for_timeout(100)
        await pg.screenshot(path=str(SHOTS / "10-progress-cfg-dark.png"), full_page=False)
        await pg.click('.tab[data-tab="plan"]')
        await pg.wait_for_timeout(100)
        await pg.screenshot(path=str(SHOTS / "11-plan-dark.png"), full_page=True)
        # maintenance from the settings: minutes per day, review cap, "Fără dată"
        await pg.click('.tab[data-tab="progress"]')
        await pg.wait_for_timeout(100)
        await pg.select_option('#cfg-m', '30')
        await pg.select_option('#cfg-r', '15')
        await pg.click('[data-a="cfg-clear"]')
        await pg.wait_for_timeout(150)
        mc = await pg.evaluate("() => ({ c: window.__prep.state().c, mode: window.__prep.planMode(), hdr: document.querySelector('#hdr-t').textContent, cfgText: document.querySelector('#cfg-d').closest('section').innerText })")
        print("maint cfg:", json.dumps(mc, ensure_ascii=False))
        ok(mc["c"]["d"] == "" and mc["c"]["m"] == 30 and mc["c"]["r"] == 15 and mc["c"]["h"] == 2 and mc["mode"] == "maint" and "Întreținere" in mc["hdr"] and "Întreținere" in mc["cfgText"], "settings: 'Fără dată' clears the date and keeps minutes, cap and hours; the header says Întreținere")
        await pg.click('.tab[data-tab="plan"]')
        await pg.wait_for_timeout(100)
        pm = await pg.evaluate("() => ({ hero: document.querySelector('.card.hero').innerText, days: document.querySelectorAll('details.day').length, passed: document.body.innerText.includes('Interviul a trecut') })")
        ok("Întreținere" in pm["hero"] and pm["days"] == 1 and not pm["passed"], "plan in maintenance: one day, the hero says Întreținere, no 'Interviul a trecut' " + json.dumps(pm, ensure_ascii=False))
        await pg.screenshot(path=str(SHOTS / "12-plan-maint-dark.png"), full_page=True)
        await pg.emulate_media(color_scheme="light")
        await pg.screenshot(path=str(SHOTS / "12-plan-maint-light.png"), full_page=True)
        await pg.click('.tab[data-tab="progress"]')
        await pg.wait_for_timeout(100)
        await pg.locator('#cfg-d').scroll_into_view_if_needed()
        await pg.screenshot(path=str(SHOTS / "13-progress-maint-light.png"), full_page=False)
        await pg.click('.tab[data-tab="plan"]')
        await pg.wait_for_timeout(100)
        overflow = await pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        ok(overflow == 0, "no horizontal overflow")
        ok(not errors, "no page errors " + json.dumps(errors))
        await b.close()

asyncio.run(main())
