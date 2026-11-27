# Checks the glossary sheet: a term written in the beginner format (CI/CD, the pioneer) shows its three bands
# (Ideea → Cum funcționează → Ca să nu greșești) and its sections in reading order, the answer of „Verifică-te” stays hidden
# until asked, the source links open outside, nothing sticks out at 360 px; an old-format term (GIL) keeps only its old
# sections, without bands; the list in Studiu › Glosar marks the terms explained at length. Light and dark.
import asyncio, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = (ROOT / "dist" / "pregatire-onapsis.html").as_uri()
SHOTS = ROOT / "shots"
SHOTS.mkdir(exist_ok=True)

fails = []
def check(name, ok, extra=""):
    print(("PASS " if ok else "FAIL ") + name + (" " + str(extra) if extra and not ok else ""))
    if not ok: fails.append(name)

ORDER = ["CE PROBLEMĂ REZOLVĂ", "ANALOGIE", "CUVINTELE DE CARE AI NEVOIE", "PAS CU PAS", "EXEMPLU", "NU CONFUNDA",
         "UNDE L-AI VĂZUT DEJA", "ATENȚIE", "LA INTERVIU", "VERIFICĂ-TE", "CITEȘTE MAI DEPARTE", "VEZI ȘI"]

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for scheme in ["light", "dark"]:
            tag = scheme + ": "
            ctx = await b.new_context(viewport={"width": 360, "height": 740}, device_scale_factor=2, color_scheme=scheme)
            pg = await ctx.new_page(); errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            await pg.route("**/fonts.*", lambda r: r.abort())
            await pg.goto(PAGE); await pg.wait_for_timeout(300)
            await pg.click('.tab[data-tab="study"]'); await pg.click('button[data-a="seg"][data-seg="gloss"]'); await pg.wait_for_timeout(100)
            rich = await pg.evaluate("window.PREP.gloss.filter(g => g.p).map(g => g.id)")
            check(tag + "CI/CD is written in the beginner format", "ci-cd" in rich, rich)
            check(tag + "the list marks exactly the terms explained at length", await pg.locator('.glrow .gl-more').count() == len(rich) and await pg.locator('.glrow[data-t="ci-cd"] .gl-more').count() == 1)
            await pg.click('.glrow[data-t="ci-cd"]'); await pg.wait_for_timeout(250)
            body = (await pg.inner_text('.gs-body')).upper()
            pos = [body.find(x) for x in ORDER]
            check(tag + "CI/CD: every section, in reading order", all(x >= 0 for x in pos) and pos == sorted(pos), list(zip(ORDER, pos)))
            bands = await pg.evaluate("[...document.querySelectorAll('.gs-band')].map(e => e.textContent)")
            check(tag + "CI/CD: three bands, Ideea → Cum funcționează → Ca să nu greșești", len(bands) == 3 and "Ideea" in bands[0] and "Cum funcționează" in bands[1] and "Ca să nu greșești" in bands[2], bands)
            g = await pg.evaluate("window.PREP.gloss.find(x => x.id === 'ci-cd')")
            check(tag + "CI/CD: one row per basic word, one numbered step per step", await pg.locator('.gs-voc dt').count() == len(g["voc"]) and await pg.locator('ol.gs-steps > li').count() == len(g["pas"]) and 3 <= len(g["pas"]) <= 7)
            ans = pg.locator('details.gs-ans')
            check(tag + "CI/CD: the answer is hidden until asked", await ans.count() == 1 and not await ans.evaluate("e => e.open") and not await pg.locator('details.gs-ans > :not(summary)').first.is_visible())
            await pg.click('details.gs-ans > summary'); await pg.wait_for_timeout(80)
            check(tag + "CI/CD: the answer opens on tap", await pg.locator('details.gs-ans > :not(summary)').first.is_visible())
            links = await pg.evaluate("[...document.querySelectorAll('.gs-read a')].map(a => [a.href, a.target, a.rel])")
            check(tag + "CI/CD: source links are https and open outside", len(links) >= 1 and all(h.startswith("https://") and t == "_blank" and "noopener" in r for h, t, r in links), links)
            wide = await pg.evaluate("[...document.querySelectorAll('.gs-body pre.code')].filter(e => e.scrollWidth > e.clientWidth + 1).length + (document.querySelector('.gs-body').scrollWidth > document.querySelector('.gs-body').clientWidth + 1 ? 1 : 0)")
            check(tag + "CI/CD: nothing sticks out at 360 px", wide == 0, wide)
            await pg.screenshot(path=str(SHOTS / f"gloss_cicd_{scheme}.png"))
            await pg.click('.gs-head [data-a="term-close"]'); await pg.wait_for_timeout(80)
            await pg.click('.glrow[data-t="gil"]'); await pg.wait_for_timeout(200)
            gil = (await pg.inner_text('.gs-body')).upper()
            check(tag + "GIL (old format): old sections only, no bands, no quiz", all(x in gil for x in ["LA CE FOLOSEȘTE", "EXEMPLU", "ANALOGIE", "ATENȚIE", "VEZI ȘI"]) and await pg.locator('.gs-band').count() == 0 and await pg.locator('details.gs-ans').count() == 0)
            check(tag + "no page errors", not errs, errs)
            await ctx.close()
        await b.close()
    print("\n" + ("ALL PASS" if not fails else str(len(fails)) + " FAILED: " + "; ".join(fails)))
    if fails: raise SystemExit(1)

asyncio.run(main())
