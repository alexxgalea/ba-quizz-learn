# python3 shot_qcode.py <module> <ID> → screenshot of the question card (before answering)
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = (ROOT / "dist" / "pregatire-onapsis.html").as_uri()
SHOTS = ROOT / "shots"
SHOTS.mkdir(exist_ok=True)
mod, target = sys.argv[1], sys.argv[2]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 360, "height": 760}, device_scale_factor=2)
        pg = await ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.route("**/fonts.*", lambda r: r.abort())
        await pg.goto(PAGE); await pg.wait_for_timeout(300)
        await pg.click('.tab[data-tab="quiz"]')
        await pg.click(f'[data-a="mcq-mod"][data-m="{mod}"]'); await pg.wait_for_timeout(100)
        for _ in range(25):
            if (await pg.inner_text('.chip.acc')).strip() == target: break
            await pg.click('[data-a="dunno"]'); await pg.click('[data-a="next"]'); await pg.wait_for_timeout(40)
        el = await pg.query_selector('pre.code')
        await el.screenshot(path=str(SHOTS / f"qcode-{target.lower()}.png"))
        print("overflow:", await pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth"), "errors:", errs)
        await b.close()
asyncio.run(main())
