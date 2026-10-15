import asyncio, pathlib, json
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = (ROOT / "dist" / "pregatire-onapsis.html").as_uri()
SHOTS = ROOT / "shots"
SHOTS.mkdir(exist_ok=True)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await (await b.new_context(viewport={"width": 360, "height": 760}, device_scale_factor=2)).new_page()
        errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.route("**/fonts.*", lambda r: r.abort())
        await pg.goto(PAGE); await pg.wait_for_timeout(300)
        await pg.click('.tab[data-tab="quiz"]'); await pg.click('[data-a="mcq-mod"][data-m="gil"]'); await pg.wait_for_timeout(100)
        for _ in range(20):
            if (await pg.inner_text('.chip.acc')).strip() == "GIL-03": break
            await pg.click('[data-a="dunno"]'); await pg.click('[data-a="next"]'); await pg.wait_for_timeout(40)
        ctx_terms = await pg.evaluate("[...document.querySelectorAll('.ctx .term')].map(e => e.textContent)")
        print("context terms before answer:", ctx_terms)
        await pg.click('.opt >> nth=0'); await pg.wait_for_timeout(600)
        terms = await pg.evaluate("[...document.querySelectorAll('#fb .term')].map(e => e.textContent + '→' + e.dataset.t)")
        print("explanation terms:", terms)
        await pg.click('#fb .term >> nth=0'); await pg.wait_for_timeout(250)
        print("sheet:", await pg.inner_text('#gs-t'))
        await pg.screenshot(path=str(SHOTS / "x3-term.png"))
        chip = await pg.query_selector('.gs-body button.chip')
        if chip:
            await chip.click(); await pg.wait_for_timeout(150); print("vezi și ->", await pg.inner_text('#gs-t'))
        await pg.click('.gs-back', position={"x": 20, "y": 20}); await pg.wait_for_timeout(100)
        print("closed by backdrop:", await pg.evaluate("document.querySelector('.gsheet').hidden"), "| errors:", errs)
        # sheets: terms linked in a study sheet
        await pg.click('[data-a="quit"]'); await pg.click('[data-a="quit"]'); await pg.wait_for_timeout(100)
        await pg.click('.tab[data-tab="study"]'); await pg.click('[data-a="seg"][data-seg="sheets"]'); await pg.wait_for_timeout(100)
        await pg.evaluate("document.querySelector('#sheet-celery summary').click()"); await pg.wait_for_timeout(200)
        print("terms in Celery sheet:", await pg.evaluate("[...document.querySelectorAll('#sheet-celery .term')].map(e => e.textContent)"))
        await b.close()
asyncio.run(main())
