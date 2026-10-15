import asyncio, pathlib, json
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = (ROOT / "dist" / "pregatire-onapsis.html").as_uri()
SHOTS = ROOT / "shots"
SHOTS.mkdir(exist_ok=True)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await (await b.new_context(viewport={"width": 360, "height": 740})).new_page()
        errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.route("**/fonts.*", lambda r: r.abort())
        await pg.goto(PAGE); await pg.wait_for_timeout(300)
        await pg.click('.tab[data-tab="quiz"]'); await pg.click('[data-a="mcq"][data-mode="diag"]'); await pg.wait_for_timeout(100)
        qid = await pg.inner_text('.chip.acc')
        await pg.click('[data-a="open-sheet"]'); await pg.wait_for_timeout(200)
        sheet_open = await pg.evaluate("() => !!document.querySelector('details.sheet[open]') && document.querySelector('.tab[aria-current=page]').dataset.tab")
        await pg.click('.tab[data-tab="quiz"]'); await pg.wait_for_timeout(150)
        back = await pg.inner_text('.chip.acc')
        print("sheet tab:", sheet_open, "| same question after returning:", qid == back)
        # smart mix on a fresh state: level mix over 20 samples
        lv = await pg.evaluate("() => { let c = {1:0,2:0,3:0}; for (let i = 0; i < 20; i++) window.__prep.pickSmart(15).forEach(q => c[q.lvl]++); return c; }")
        print("smart mix levels over 20 sessions (fresh):", json.dumps(lv), "| errors:", errs)
        await b.close()
asyncio.run(main())
