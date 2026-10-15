# python3 shot_q.py <module> <ID e.g. CEL-09> [dark] → answers wrong, expands everything, screenshots the feedback at 360px
import asyncio, pathlib, json, sys
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = (ROOT / "dist" / "pregatire-onapsis.html").as_uri()
SHOTS = ROOT / "shots"
SHOTS.mkdir(exist_ok=True)
mod, target = sys.argv[1], sys.argv[2]; dark = len(sys.argv) > 3

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 360, "height": 760}, device_scale_factor=2, color_scheme="dark" if dark else "light")
        pg = await ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.route("**/fonts.*", lambda r: r.abort())
        await pg.goto(PAGE); await pg.wait_for_timeout(300)
        await pg.click('.tab[data-tab="quiz"]')
        await pg.click(f'[data-a="mcq-mod"][data-m="{mod}"]'); await pg.wait_for_timeout(100)
        found = False
        for _ in range(25):
            if (await pg.inner_text('.chip.acc')).strip() == target: found = True; break
            await pg.click('[data-a="dunno"]'); await pg.click('[data-a="next"]'); await pg.wait_for_timeout(40)
        if not found: print("not found", target); return
        qid = target.lower()
        wrong = await pg.evaluate("""(id) => { const q = window.PREP.mcq.find(x => x.id === id); const btns = [...document.querySelectorAll('.opt')];
            return btns.findIndex(b => !b.textContent.includes(q.o[q.a])); }""", qid)
        await pg.click(f'.opt >> nth={wrong}'); await pg.wait_for_timeout(600)
        await pg.click('[data-a="xp-more"]'); await pg.wait_for_timeout(120)
        for a in ("xp-intv", "xp-ver"):
            if await pg.query_selector(f'[data-a="{a}"]'): await pg.click(f'[data-a="{a}"]'); await pg.wait_for_timeout(80)
        ov = await pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        pre = await pg.evaluate("[...document.querySelectorAll('#fb pre')].map(p => p.scrollWidth > p.clientWidth)")
        terms = await pg.evaluate("[...document.querySelectorAll('#fb .term')].map(e => e.textContent)")
        el = await pg.query_selector('#fb')
        out = str(SHOTS / f"q-{qid}{'-dark' if dark else ''}.png")
        await el.screenshot(path=out)
        print(out, "| overflow:", ov, "| pre scrolls:", pre, "| terms:", terms, "| errors:", errs)
        await b.close()
asyncio.run(main())
