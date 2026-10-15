import asyncio, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = (ROOT / "dist" / "pregatire-onapsis.html").as_uri()
SHOTS = ROOT / "shots"
SHOTS.mkdir(exist_ok=True)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 360, "height": 760}, device_scale_factor=2)
        pg = await ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.route("**/fonts.*", lambda r: r.abort())
        await pg.goto(PAGE); await pg.wait_for_timeout(300)
        await pg.click('.tab[data-tab="study"]'); await pg.click('[data-a="seg"][data-seg="katas"]'); await pg.wait_for_timeout(100)
        await pg.click('[data-a="kata"] >> nth=2'); await pg.wait_for_timeout(150)
        await pg.evaluate("document.querySelectorAll('details.model').forEach(d => d.open = true)")
        await pg.wait_for_timeout(100)
        ov = await pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        el = await pg.query_selector('details.model')
        await el.screenshot(path=str(SHOTS / "kata-sol.png"))
        # copy fallback text check: DOM text of the pre keeps one line per source line
        txt = await pg.evaluate("document.querySelector('details.model pre').innerText")
        src = await pg.evaluate("Object.values(window.PREP.kataCode)[2] || ''")
        print("overflow:", ov, "| errors:", errs, "| innerText lines:", len(txt.rstrip().split('\n')), "src lines:", len(src.rstrip().split('\n')))
        await b.close()
asyncio.run(main())
