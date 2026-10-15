import asyncio, json, pathlib
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = (ROOT / "dist" / "pregatire-onapsis.html").as_uri()
SHOTS = ROOT / "shots"
SHOTS.mkdir(exist_ok=True)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        pg = await ctx.new_page()
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.on("console", lambda m: errors.append("console:" + m.text) if m.type == "error" else None)
        # block external fonts so the check is deterministic offline
        await pg.route("**/fonts.*", lambda r: r.abort())
        await pg.goto(PAGE)
        await pg.wait_for_timeout(400)

        logic = await pg.evaluate("""() => {
          const T = window.__prep, out = {};
          out.diag = T.pickDiag().length;
          const mock = T.pickMock(25).map(q => q.id); out.mock = mock.length; out.mockUnique = new Set(mock).size;
          out.smart = T.pickSmart(15).length;
          const a = T.normalize({ q: { x: { b: 2, n: 1, c: 1, t: 100 } }, h: [{ id: 'h1', ts: 100 }] });
          const b = T.normalize({ q: { x: { b: 1, n: 2, c: 1, t: 200 }, y: { b: 3, n: 2, c: 2, t: 150 } }, h: [{ id: 'h2', ts: 150 }] });
          const m1 = T.mergeState(a, b);
          out.newerWins = m1.state.q.x.t === 200 && !!m1.state.q.y && m1.state.h.length === 2 && m1.remoteNewer && m1.localNewer;
          const reset = T.normalize({ r: 300, q: {}, h: [] });
          const m2 = T.mergeState(b, reset);
          out.resetWins = Object.keys(m2.state.q).length === 0 && m2.state.h.length === 0;
          const m3 = T.mergeState(b, b);
          out.stableNoFlags = !m3.localNewer && !m3.remoteNewer;
          const r0 = T.readiness().ready;
          return out;
        }""")
        print("LOGIC", json.dumps(logic))

        await pg.screenshot(path=str(SHOTS / "1-plan.png"), full_page=False)
        # start the diagnostic from the quiz tab and answer one question
        await pg.click('.tab[data-tab="quiz"]')
        await pg.click('[data-a="mcq"][data-mode="diag"]')
        await pg.click('.opt >> nth=0')
        await pg.wait_for_timeout(300)
        await pg.evaluate("window.scrollTo(0,0)")
        await pg.screenshot(path=str(SHOTS / "2-question.png"), full_page=True)
        st = await pg.evaluate("Object.keys(window.__prep.state().q).length")
        print("answered stored:", st)
        # oral card review phase
        await pg.click('.tab[data-tab="oral"]')
        await pg.click('[data-a="oral"][data-f="smart"]')
        await pg.click('[data-a="oral-reveal"]')
        await pg.click('.kp-i >> nth=0')
        await pg.screenshot(path=str(SHOTS / "3-oral.png"), full_page=True)
        # study sheet with diagram, dark theme
        await pg.emulate_media(color_scheme="dark")
        await pg.click('.tab[data-tab="study"]')
        await pg.evaluate("document.querySelector('#sheet-celery summary').click()")
        await pg.wait_for_timeout(200)
        await pg.screenshot(path=str(SHOTS / "4-sheet-dark.png"), full_page=False)
        await pg.click('.tab[data-tab="progress"]')
        await pg.screenshot(path=str(SHOTS / "5-progress-dark.png"), full_page=True)
        overflow = await pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        print("horizontal overflow px:", overflow)
        print("errors:", errors)
        await b.close()

asyncio.run(main())
