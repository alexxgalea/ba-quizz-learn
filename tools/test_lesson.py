# Lecție live (spec .scratch/lectie-live): poziția lecției și recomandarea în aplicație, istoricul, butonul „Ascultă” din Studiu, butonul recomandat și vederea lecției din Jarvis.
# Live și Audio sunt înlocuite de tools/jarvis_fakes.js; protocolul și sunetul real sunt acoperite de tools/unit/*.test.mjs.
import asyncio, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = (ROOT / "dist" / "pregatire-onapsis.html").as_uri()
SHOTS = ROOT / "shots"
SHOTS.mkdir(exist_ok=True)
FAKES = str(ROOT / "tools" / "jarvis_fakes.js")
CTL = "window.__jarvisFakes.ctl"
DAY = 86400000

fails = []
def check(name, ok, extra=""):
    print(("PASS " if ok else "FAIL ") + name + (" " + str(extra) if extra and not ok else ""))
    if not ok: fails.append(name)

async def fresh(pg):
    await pg.goto(PAGE); await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(400)
async def ev(pg, js, arg=None): return await pg.evaluate(js, arg) if arg is not None else await pg.evaluate(js)
async def text(pg, sel): return await pg.locator(sel).inner_text()
async def emit(pg, e): await pg.evaluate(f"e => {CTL}.emit(e)", e); await pg.wait_for_timeout(60)
async def sent(pg): return await ev(pg, f"{CTL}.live.sent")
async def texts(pg): return [x["text"] for x in await sent(pg) if "text" in x]
async def tool(pg, name): r = await ev(pg, f"{CTL}.tool('{name}')"); await pg.wait_for_timeout(60); return r

MODS = "() => window.PREP.modules.map(m => ({ id: m.id, p: m.p, short: m.short, n: (window.PREP.sheets[m.id].points || []).length }))"

async def app_logic(b):
    ctx = await b.new_context(viewport={"width": 360, "height": 740})
    pg = await ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.route("**/fonts.*", lambda r: r.abort())
    await fresh(pg)
    mods = await ev(pg, MODS)
    total = {m["id"]: m["n"] for m in mods}

    check("PrepApp exposes the lesson methods", await ev(pg, "['sheet','lessonHeard','lessonDone','lessonRec','lessonReset'].every(m => typeof window.PrepApp[m] === 'function')"))

    sh = await ev(pg, "window.PrepApp.sheet('asyncio')")
    pts = await ev(pg, "window.PREP.sheets.asyncio")
    check("sheet gives the module's lead, points and things to avoid, with the total and the position", sh["module"] == "asyncio" and sh["lead"] == pts["lead"] and sh["points"] == pts["points"] and sh["avoid"] == pts["avoid"] and sh["total"] == total["asyncio"] and sh["pos"] == 0, sh)
    check("an unknown module has no sheet", await ev(pg, "window.PrepApp.sheet('nu-exista')") is None)

    # --- poziția
    before = await ev(pg, "JSON.stringify([window.__prep.state().q, window.__prep.state().o, window.__prep.state().x, window.__prep.readiness().ready])")
    await ev(pg, "window.PrepApp.lessonHeard('asyncio', 3)")
    await ev(pg, "window.PrepApp.lessonHeard('asyncio', 2)")
    l = await ev(pg, "window.__prep.state().l.asyncio")
    check("the position advances to the chunk heard and never goes back", l["n"] == 3 and l["t"] > 0, l)
    check("sheet reports the saved position", (await ev(pg, "window.PrepApp.sheet('asyncio')"))["pos"] == 3)
    # --- resetarea poziției
    await ev(pg, "window.PrepApp.lessonDone('asyncio')")
    done_at = (await ev(pg, "window.__prep.state().l.asyncio")).get("d")
    await ev(pg, "window.PrepApp.lessonHeard('asyncio', 3)")
    await ev(pg, "window.PrepApp.lessonReset('asyncio')")
    r = await ev(pg, "window.__prep.state().l.asyncio")
    check("resetting a lesson puts the position back to zero and keeps the date of the last finish", r["n"] == 0 and r.get("d") == done_at and r["t"] > 0, r)
    check("after a reset the lesson is no longer a started one", (await ev(pg, "window.PrepApp.lessonRec()"))["why"] == "need" and (await ev(pg, "window.PrepApp.sheet('asyncio')"))["pos"] == 0)
    newer = await ev(pg, """() => { const T = window.__prep, a = T.normalize({ l: { gil: { n: 0, t: 900 } } }), b = T.normalize({ l: { gil: { n: 5, t: 300 } } }); return T.mergeState(a, b).state.l.gil.n; }""")
    check("a reset on one device beats an older position from another", newer == 0, newer)
    await ev(pg, "window.PrepApp.lessonReset('nu-exista')")
    check("resetting an unknown module changes nothing", "nu-exista" not in await ev(pg, "window.__prep.state().l"))
    await ev(pg, "window.PrepApp.lessonDone('asyncio')")
    l = await ev(pg, "window.__prep.state().l.asyncio")
    check("finishing the sheet puts the position back to zero and notes the date", l["n"] == 0 and l["d"] > 0, l)
    after = await ev(pg, "JSON.stringify([window.__prep.state().q, window.__prep.state().o, window.__prep.state().x, window.__prep.readiness().ready])")
    check("a lesson does not touch the score, the Leitner boxes, the gaps or the open questions", before == after)
    await ev(pg, "window.PrepApp.lessonHeard('asyncio', 99)")
    check("the position never goes past the last chunk", (await ev(pg, "window.__prep.state().l.asyncio.n")) == total["asyncio"])

    # --- îmbinare și reset
    merged = await ev(pg, """() => { const T = window.__prep, a = T.normalize({ l: { gil: { n: 2, t: 100 }, oop: { n: 1, t: 500 } } }), b = T.normalize({ l: { gil: { n: 4, t: 300 }, oop: { n: 0, d: 400, t: 200 } } });
      return T.mergeState(a, b).state.l; }""")
    check("merging two devices keeps the newest position for each module", merged["gil"]["n"] == 4 and merged["oop"]["n"] == 1, merged)
    reset = await ev(pg, """() => { const T = window.__prep, a = T.normalize({ r: 1000, l: { gil: { n: 2, t: 100 } } }), b = T.normalize({ l: { oop: { n: 1, t: 500 }, gil: { n: 4, t: 2000 } } });
      return T.mergeState(a, b).state.l; }""")
    check("a progress reset erases the older positions and keeps the newer ones", "oop" not in reset and reset["gil"]["n"] == 4, reset)
    check("an old state without positions loads fine", (await ev(pg, "window.__prep.normalize({ v: 1, q: {} }).l")) == {})

    # --- recomandarea
    await fresh(pg)
    rec = await ev(pg, "window.PrepApp.lessonRec()")
    ok_pool = [m["id"] for m in mods if m["p"] < 4 and m["id"] != "behav"]
    check("with nothing started the recommendation is a module with real need, not a Bonus one and not the behavioural one", rec["module"] in ok_pool and rec["pos"] == 0 and rec["total"] == total[rec["module"]] and rec["why"] == "need", rec)
    await ev(pg, "window.PrepApp.lessonHeard('dbmodels', 2)")
    rec = await ev(pg, "window.PrepApp.lessonRec()")
    check("a started lesson comes first, even for a Bonus module", rec["module"] == "dbmodels" and rec["pos"] == 2 and rec["why"] == "started", rec)
    await ev(pg, "window.PrepApp.lessonHeard('gil', 1)")
    rec = await ev(pg, "window.PrepApp.lessonRec()")
    check("of several started lessons the most recent one", rec["module"] == "gil", rec)
    await fresh(pg)
    first = (await ev(pg, "window.PrepApp.lessonRec()"))["module"]
    await ev(pg, "id => window.PrepApp.lessonDone(id)", first)
    second = (await ev(pg, "window.PrepApp.lessonRec()"))["module"]
    check("a module finished today is not recommended again", second != first and second in ok_pool, [first, second])
    await ev(pg, "id => { const s = window.__prep.state(); s.l[id].d = Date.now() - 3 * 86400000; window.__prep.setState(s); }", first)
    check("after more than two days it is eligible again", (await ev(pg, "window.PrepApp.lessonRec()"))["module"] in (first, second))
    await ev(pg, """pool => { pool.forEach(id => window.PrepApp.lessonDone(id)); }""", ok_pool)
    rec = await ev(pg, "window.PrepApp.lessonRec()")
    check("when every module was done recently it still recommends one from the pool", rec is not None and rec["module"] in ok_pool, rec)

    # --- istoric și buget
    await fresh(pg)
    def plan_min(): return ev(pg, "window.__prep.genPlan()[0].tasks.reduce((a, t) => a + t.min, 0)")
    base = await plan_min()
    await ev(pg, "window.PrepApp.log({ title: 'Jarvis · Lecție · asyncio', n: 4, c: 0, dur: 3600, lesson: true })")
    with_lesson = await plan_min()
    await ev(pg, "window.PrepApp.log({ title: 'Jarvis · antrenament', n: 4, c: 2, dur: 3600 })")
    with_oral = await plan_min()
    check("a lesson row does not shrink tonight's budget, an ordinary session does", with_lesson == base and with_oral != base, [base, with_lesson, with_oral])
    row = await ev(pg, "window.__prep.state().h[0]")
    check("the lesson row is marked as a lesson", row["lesson"] is True and row["kind"] == "jarvis" and row["title"] == "Jarvis · Lecție · asyncio", row)
    await pg.click('.tab[data-tab="progress"]'); await pg.wait_for_timeout(200)
    hist = await text(pg, ".hist")
    check("the history shows the lesson with its chunks, not with a percentage", "Lecție · asyncio" in hist and "4 idei" in hist and "0%" not in hist.split("Lecție")[1].split("\n")[0], hist)

    check("no page errors (app logic)", not errs, errs)
    await ctx.close()


async def screens(b, scheme):
    tag = scheme + ": "
    ctx = await b.new_context(viewport={"width": 360, "height": 740}, device_scale_factor=2, color_scheme=scheme)
    await ctx.add_init_script(path=FAKES)
    pg = await ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" and "fonts" not in m.text and "Failed to load resource" not in m.text else None)
    await pg.route("**/fonts.*", lambda r: r.abort())
    await fresh(pg)
    mods = await ev(pg, MODS)

    # --- Studiu: butonul „Ascultă” pe fișă
    await pg.click('.tab[data-tab="study"]'); await pg.wait_for_timeout(150)
    await pg.click('#sheet-asyncio summary'); await pg.wait_for_timeout(150)
    check(tag + "the open sheet has a Ascultă button", await pg.locator('#sheet-asyncio [data-a="listen"][data-m="asyncio"]').count() == 1)
    await pg.screenshot(path=str(SHOTS / f"lesson_sheet_{scheme}.png"))
    await pg.click('#sheet-asyncio [data-a="listen"]'); await pg.wait_for_timeout(200)
    check(tag + "without a key Ascultă leads to the key field and does not connect", await pg.locator("#jv-key").count() == 1 and await ev(pg, f"{CTL}.live.cfg") is None)
    check(tag + "the key screen says why, without naming a mode", "cheia Gemini" in await text(pg, "main"))

    # --- cheia și butonul recomandat
    await pg.fill("#jv-key", "TESTKEY1234"); await pg.click('[data-a="jv-key-save"]'); await pg.wait_for_timeout(150)
    rec = await ev(pg, "window.PrepApp.lessonRec()")
    btn = pg.locator("#jv-rec")
    check(tag + "the big button offers the recommended lesson with the module and the position", await btn.count() == 1 and "Ascultă lecția recomandată" in await btn.inner_text() and rec["name"] in await btn.inner_text(), await btn.inner_text())
    lst = pg.locator('.jv-lessons [data-a="jv-lesson"]')
    check(tag + "the list offers every module, Bonus and behavioural included", await lst.count() == len(mods), await lst.count())
    check(tag + "the Jarvis home shows the build version, so a stale phone cache is easy to spot", __import__("re").fullmatch(r"Versiune [0-9a-f]{7}", await text(pg, "#jv-build")) is not None, await text(pg, "#jv-build"))
    await pg.screenshot(path=str(SHOTS / f"lesson_home_{scheme}.png"))
    await ev(pg, "window.PrepApp.lessonHeard('asyncio', 4)")
    await pg.click('.tab[data-tab="progress"]'); await pg.click('.tab[data-tab="jarvis"]'); await pg.wait_for_timeout(150)
    rec = await ev(pg, "window.PrepApp.lessonRec()")
    n = (await ev(pg, "window.PrepApp.sheet('asyncio')"))["total"]
    check(tag + "a started lesson turns the button into Continuă, with n/total", "Continuă asyncio, 4/" + str(n) in (await text(pg, "#jv-rec")).replace("\n", " "), await text(pg, "#jv-rec"))

    # --- resetarea din ecran
    check(tag + "a started lesson offers Resetează lecția under the recommended button and a Resetează in its row", await pg.locator("#jv-rec-reset").count() == 1 and await pg.locator('.jv-lessons [data-a="jv-lesson-reset"][data-m="asyncio"]').count() == 1)
    check(tag + "only started lessons have a reset", await pg.locator('.jv-lessons [data-a="jv-lesson-reset"]').count() == 1)
    await pg.screenshot(path=str(SHOTS / f"lesson_home_started_{scheme}.png"))
    await pg.click("#jv-rec-reset"); await pg.wait_for_timeout(150)
    check(tag + "the reset sends the lesson back to the start and the buttons go away", (await ev(pg, "window.PrepApp.sheet('asyncio')"))["pos"] == 0 and await pg.locator("#jv-rec-reset").count() == 0 and "Continuă asyncio" not in await text(pg, "main") and await pg.locator('[data-a="jv-lesson-reset"]').count() == 0)
    check(tag + "the reset does not start a lesson", await ev(pg, f"{CTL}.live.cfg") is None)
    await ev(pg, "window.PrepApp.lessonHeard('asyncio', 4)")
    await pg.click('.tab[data-tab="progress"]'); await pg.click('.tab[data-tab="jarvis"]'); await pg.wait_for_timeout(150)
    await pg.click('.jv-lessons summary'); await pg.click('.jv-lessons [data-a="jv-lesson-reset"][data-m="asyncio"]'); await pg.wait_for_timeout(150)
    check(tag + "the reset in the module list works too", (await ev(pg, "window.PrepApp.sheet('asyncio')"))["pos"] == 0)
    await ev(pg, "window.PrepApp.lessonHeard('asyncio', 4)")
    await pg.click('.tab[data-tab="progress"]'); await pg.click('.tab[data-tab="jarvis"]'); await pg.wait_for_timeout(150)
    await pg.wait_for_function("(() => { const t = document.getElementById('toast'); return !t || t.hidden; })()")      # toast-ul „revine la început” stă 2,4 s peste butoane

    # --- pornirea din fișă, cu poziția salvată
    await pg.click('.tab[data-tab="study"]'); await pg.click('#sheet-asyncio [data-a="listen"]'); await pg.wait_for_timeout(250)
    cfg = await ev(pg, f"({{ names: {CTL}.live.cfg.tools.map(t => t.name).sort(), sys: {CTL}.live.cfg.system }})")
    check(tag + "Ascultă on the sheet starts the lesson with the lesson functions", cfg["names"] == ["end_session", "next_chunk", "pause_session", "repeat_chunk"], cfg["names"])
    check(tag + "the lesson screen shows the module and the controls", await pg.locator("#jv-lesson").count() == 1 and all([await pg.locator(f'[data-a="{a}"]').count() == 1 for a in ["jv-pause", "jv-repeat", "jv-skip", "jv-stop", "jv-mute"]]))
    check(tag + "Vorbește is not shown while Mut is off", await pg.locator("#jv-talk").count() == 0)

    # --- bucata curentă pe ecran
    r = await tool(pg, "next_chunk")
    pts = await ev(pg, "window.PREP.sheets.asyncio.points")
    shown = (await text(pg, "#jv-chunk")).replace("\n", " ")
    check(tag + "the current chunk's text from the sheet is on screen", pts[4].replace("`", "")[:40] in shown, shown)
    check(tag + "n/total is shown", f"5/{n}" in (await text(pg, "#jv-pos")).replace(" ", ""), await text(pg, "#jv-pos"))
    check(tag + "the transcript is collapsed behind a button", await pg.locator("details#jv-trd").count() == 1 and await pg.locator("details#jv-trd[open]").count() == 0)
    await pg.screenshot(path=str(SHOTS / f"lesson_active_{scheme}.png"))
    fits = await ev(pg, "document.documentElement.scrollWidth <= window.innerWidth")
    check(tag + "no horizontal scroll at 360 px", fits)
    small = await ev(pg, "Array.from(document.querySelectorAll('#jv-lesson .jv-ctl .btn, #jv-lesson .jv-mutes .btn')).filter(b => b.getBoundingClientRect().height < 44).length")
    check(tag + "the controls are at least 44 px tall", small == 0, small)

    # --- fereastra de ascultare
    await ev(pg, f"{CTL}.speak()"); await pg.wait_for_timeout(100)
    check(tag + "after the chunk a tone plays and the window shows", await ev(pg, f"{CTL}.audio.beeps") == ["window"] and "ascult" in (await text(pg, "#jv-state")).lower(), await text(pg, "#jv-state"))
    await ev(pg, f"{CTL}.advance(3100)"); await pg.wait_for_timeout(100)
    check(tag + "Alex's silence asks the model for the next chunk", "next_chunk" in (await texts(pg))[-1])

    # --- butoane
    await pg.click('[data-a="jv-repeat"]'); await pg.wait_for_timeout(80)
    check(tag + "Repetă asks for the chunk again", "repeat_chunk" in (await texts(pg))[-1])
    await pg.click('[data-a="jv-skip"]'); await pg.wait_for_timeout(80)
    check(tag + "Sari asks for the next chunk", "next_chunk" in (await texts(pg))[-1])
    # --- Reset în lecție: în același rând cu Pauză, Repetă, Sari, cu confirmare la a doua atingere
    ys = await ev(pg, "Array.from(document.querySelectorAll('#jv-lesson .jv-ctl .btn')).map(b => Math.round(b.getBoundingClientRect().top))")
    names = await ev(pg, "Array.from(document.querySelectorAll('#jv-lesson .jv-ctl .btn')).map(b => b.dataset.a)")
    check(tag + "Reset sits in the same row as Pauză, Repetă and Sari", names == ["jv-pause", "jv-repeat", "jv-skip", "jv-restart"] and len(set(ys)) == 1, [names, ys])
    check(tag + "the four controls fit at 360 px", await ev(pg, "document.documentElement.scrollWidth <= window.innerWidth") and await ev(pg, "Array.from(document.querySelectorAll('#jv-lesson .jv-ctl .btn')).every(b => b.getBoundingClientRect().width >= 60 && b.scrollWidth <= b.clientWidth + 1)"))
    await pg.screenshot(path=str(SHOTS / f"lesson_controls_{scheme}.png"))
    n_before = len(await texts(pg))
    await pg.click('[data-a="jv-restart"]'); await pg.wait_for_timeout(80)
    check(tag + "the first tap on Reset only asks for confirmation", "Sigur" in await text(pg, '[data-a="jv-restart"]') and len(await texts(pg)) == n_before and (await ev(pg, "window.PrepApp.sheet('asyncio')"))["pos"] >= 1)
    await pg.wait_for_timeout(4300)
    check(tag + "the confirmation fades back to Reset after a few seconds", "Sigur" not in await text(pg, '[data-a="jv-restart"]'))
    await pg.click('[data-a="jv-restart"]'); await pg.click('[data-a="jv-restart"]'); await pg.wait_for_timeout(120)
    last = (await texts(pg))[-1]
    check(tag + "the second tap restarts the lesson from the beginning", (await ev(pg, "window.PrepApp.sheet('asyncio')"))["pos"] == 0 and "next_chunk" in last and "început" in last, last)
    await tool(pg, "next_chunk")
    check(tag + "after the restart the screen shows the first chunk again", "1/" in (await text(pg, "#jv-pos")).replace(" ", "") and (await ev(pg, "window.PREP.sheets.asyncio.points[0]")).replace("`", "")[:30] in (await text(pg, "#jv-chunk")).replace("\n", " "), await text(pg, "#jv-pos"))
    await ev(pg, "window.PrepApp.lessonHeard('asyncio', 4)")
    await pg.click('[data-a="jv-pause"]'); await pg.wait_for_timeout(80)
    check(tag + "Pauză becomes Reia", await pg.locator('[data-a="jv-resume"]').count() == 1 and await pg.locator('[data-a="jv-pause"]').count() == 0 and await ev(pg, f"{CTL}.audio.pauses") == 1)
    await pg.screenshot(path=str(SHOTS / f"lesson_paused_{scheme}.png"))
    await pg.click('[data-a="jv-resume"]'); await pg.wait_for_timeout(80)
    check(tag + "Reia becomes Pauză again", await pg.locator('[data-a="jv-pause"]').count() == 1)

    # --- Mut și Vorbește
    await pg.click('[data-a="jv-mute"]'); await pg.wait_for_timeout(80)
    check(tag + "Mut is on and remembered in the Jarvis settings only", await pg.locator('[data-a="jv-mute"][aria-pressed="true"]').count() == 1 and (await ev(pg, "JSON.parse(localStorage.getItem('onapsis-jarvis-v1')).muted")) is True and "muted" not in await ev(pg, "JSON.stringify(window.__prep.state())"))
    check(tag + "on Mut the Vorbește button appears", await pg.locator("#jv-talk").count() == 1)
    check(tag + "the Mut hook is not the global muted-text class", await pg.locator("#jv-lesson.muted").count() == 0 and await pg.locator("#jv-lesson.is-mut").count() == 1)
    colour = await ev(pg, "getComputedStyle(document.querySelector('#jv-lesson')).color")
    check(tag + "on Mut the lesson text keeps the normal ink colour", colour == await ev(pg, "getComputedStyle(document.body).color"), colour)
    await pg.screenshot(path=str(SHOTS / f"lesson_mute_{scheme}.png"))
    box = await pg.locator("#jv-talk").bounding_box()
    await pg.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
    await pg.mouse.down(); await pg.wait_for_timeout(80)
    await ev(pg, f"{CTL}.frame(4)")
    await pg.mouse.up(); await pg.wait_for_timeout(80)
    s = await sent(pg)
    i_audio = max(i for i, x in enumerate(s) if "audio" in x)
    check(tag + "the microphone reaches the server only while Vorbește is held, and the stream is ended on release", i_audio < len(s) - 1 and s[-1] == {"audioEnd": True} and (await ev(pg, f"{CTL}.audio.flushes")) >= 1, s[-3:])
    await ev(pg, f"{CTL}.frame(4)")
    check(tag + "after the release nothing more goes to the server", (await sent(pg))[-1] == {"audioEnd": True})
    await pg.click('[data-a="jv-mute"]'); await pg.wait_for_timeout(60)
    check(tag + "Mut off hides Vorbește again", await pg.locator("#jv-talk").count() == 0)

    # --- semnalul a căzut: alerta apare și „Reia” redeschide sesiunea
    await emit(pg, {"type": "closed", "reason": "network", "code": 1006, "detail": ""}); await pg.wait_for_timeout(100)
    check(tag + "a lost connection shows the alert and offers Reia", "Semnalul a căzut" in await text(pg, ".jv-warn") and await pg.locator('[data-a="jv-resume"]').count() == 1 and await ev(pg, f"{CTL}.audio.beeps.slice(-1)[0]") == "warn", await text(pg, "main"))
    await pg.screenshot(path=str(SHOTS / f"lesson_lost_{scheme}.png"))
    await pg.click('[data-a="jv-resume"]'); await pg.wait_for_timeout(200)
    check(tag + "Reia opens a new session and the alert goes away", await pg.locator(".jv-warn").count() == 0 and "Reiau de unde am rămas" in (await texts(pg))[-1], await texts(pg))

    # --- sfârșit
    await ev(pg, f"{CTL}.speak()"); await pg.wait_for_timeout(100)
    await pg.click('[data-a="jv-stop"]'); await pg.wait_for_timeout(200)
    h = await ev(pg, "window.__prep.state().h.slice(-1)[0]")
    check(tag + "Gata ends the lesson with one history row marked as a lesson", h["lesson"] is True and h["n"] >= 1 and "Lecție" in h["title"], h)
    check(tag + "the end screen shows the lesson, not card results", await pg.locator(".jv-res").count() == 0 and "idee" in await text(pg, "main"), await text(pg, "main"))
    await pg.screenshot(path=str(SHOTS / f"lesson_ended_{scheme}.png"))
    await ev(pg, "window.PrepApp.lessonHeard('asyncio', window.PrepApp.sheet('asyncio').total)")
    await pg.click('.tab[data-tab="study"]'); await pg.click('.tab[data-tab="jarvis"]'); await pg.wait_for_timeout(150)
    check(tag + "with every point heard the end screen points at the closing, not at a missing idea", "capcanele" in await text(pg, "main") and "ideea 12" not in await text(pg, "main"), await text(pg, "main"))
    check(tag + "no page errors", not errs, errs)
    await ctx.close()


async def artifact(b):
    ctx = await b.new_context(viewport={"width": 360, "height": 740})
    await ctx.add_init_script("window.claude = { use: async () => null };")
    await ctx.add_init_script(path=FAKES)
    pg = await ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.route("**/fonts.*", lambda r: r.abort())
    await fresh(pg)
    await pg.click('.tab[data-tab="study"]'); await pg.wait_for_timeout(150)
    await pg.click('#sheet-asyncio summary'); await pg.wait_for_timeout(150)
    check("in the artifact the sheet has no Ascultă button, but a link to the app", await pg.locator('[data-a="listen"]').count() == 0 and await pg.locator('#sheet-asyncio a[data-lesson-link]').count() == 1 and "alexxgalea.github.io/ba-quizz-learn/app" in (await pg.locator('#sheet-asyncio a[data-lesson-link]').get_attribute("href")))
    await pg.click('.tab[data-tab="jarvis"]'); await pg.wait_for_timeout(150)
    check("in the artifact the Jarvis tab has no lesson controls but says the lesson lives in the app", await pg.locator('[data-a="jv-lesson"], #jv-rec').count() == 0 and "lecți" in (await text(pg, "main")).lower() and not errs, errs)
    await ctx.close()


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        await app_logic(b)
        for scheme in ["light", "dark"]:
            await screens(b, scheme)
        await artifact(b)
        await b.close()
    print("\nALL OK" if not fails else "\nFAILED: " + str(fails))
    raise SystemExit(1 if fails else 0)

asyncio.run(main())
