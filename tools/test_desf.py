# Studiu › Fișe: harta modulului și desfășurările punctelor ("Pe larg ›", "Deschide tot"), la 360 px, în light și dark.
# Datele reale sunt cele din src/desf/oop.md, src/desf/python.md, src/desf/gil.md, src/desf/asyncio.md, src/desf/asgi.md, src/desf/pytest.md, src/desf/frontend.md, src/desf/design.md, src/desf/sqlalchemy.md, src/desf/postgres.md, src/desf/index.md, src/desf/runtime.md, src/desf/security.md, src/desf/celery.md și src/desf/domain.md; un modul fără desfășurări (aws, Bonus; când primește desfășurări, controlul se mută pe alt modul fără ele) trebuie să arate ca înainte. Pentru C++ / TSX și termenii din glosar
# se injectează în pagină (window.PREP.desf, același obiect pe care îl citește aplicația) o desfășurare de probă la modulul frontend (care are acum date reale: fixture-ul le suprascrie).
# "Întreabă despre asta" primește harta și desfășurările în context: modelul e un `sample` fals care reține cererile.
import asyncio, json, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = (ROOT / "dist" / "pregatire-onapsis.html").as_uri()
SHOTS = ROOT / "shots"
SHOTS.mkdir(exist_ok=True)

SAMPLE = """
window.__asks = [];
const sample = (prompt, opts) => new Promise((res) => {
  window.__asks.push(prompt);
  setTimeout(() => res({ text: JSON.stringify({ on_topic: true, answer: 'Răspuns scurt.' }), truncated: false }), 20);
});
window.claude = { use: async name => (name === 'sample' ? sample : null) };
"""

# Desfășurare de probă pentru frontend: câte una pentru fiecare punct al fișei; prima are TSX și C++ (cuvinte-cheie Python în cod) și un termen din glosar.
FIXTURE = """() => {
  const n = window.PREP.sheets.frontend.points.length;
  const items = Array.from({ length: n }, (_, i) => ({ p: 'Problema ' + i, i: 'Ideea ' + i, an: 'Analogie ' + i }));
  items[0] = { p: 'Un GIL blochează aplicația.', i: 'Ideea unu.', ex: '```tsx\\nclass A { return x; }\\nconst f = (a: number) => a;\\n```',
    cpp: 'Cod C++:\\n```cpp\\nclass B { int f() { return 1; } };\\n```', nu: 'Nu ține peste tot.' };
  window.PREP.desf.frontend = { map: { p: 'Harta de probă.', g: [{ a: 1, b: n, t: 'toate' }] }, items };
  return n;
}"""

fails = []
def check(name, ok, extra=""):
    print(("PASS " if ok else "FAIL ") + name + (" " + str(extra) if extra and not ok else ""))
    if not ok: fails.append(name)

async def new_page(b, scheme="light", init=None):
    ctx = await b.new_context(viewport={"width": 360, "height": 740}, device_scale_factor=2, color_scheme=scheme)
    if init: await ctx.add_init_script(init)
    pg = await ctx.new_page(); pg.errs = []
    pg.on("pageerror", lambda e: pg.errs.append(str(e)))
    pg.on("console", lambda m: pg.errs.append(m.text) if m.type == "error" and "fonts" not in m.text and "Failed to load resource" not in m.text else None)
    await pg.route("**/fonts.*", lambda r: r.abort())
    await pg.goto(PAGE); await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(400)
    return ctx, pg

async def open_sheet(pg, mod):
    await pg.click('.tab[data-tab="study"]'); await pg.click('[data-a="seg"][data-seg="sheets"]'); await pg.wait_for_timeout(100)
    if not await pg.evaluate(f"!!document.querySelector('#sheet-{mod}[open]')"):
        await pg.evaluate(f"document.querySelector('#sheet-{mod} summary').click()"); await pg.wait_for_timeout(250)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for scheme in ["light", "dark"]:
            tag = scheme + ": "
            ctx, pg = await new_page(b, scheme, SAMPLE)
            data = await pg.evaluate("window.PREP.desf.oop")
            npts = await pg.evaluate("window.PREP.sheets.oop.points.length")
            check(tag + "the build carries the map and one explanation per point, indexed like the points", data and len(data["items"]) == npts == 12 and data["map"]["p"] and len(data["map"]["g"]) == 5)
            await open_sheet(pg, "oop")
            S = "#sheet-oop "
            state0 = await pg.evaluate("JSON.stringify(window.__prep.state())")

            # ---- closed by default ----
            check(tag + "the map button sits under the lead and the map is closed", await pg.evaluate(f"""() => {{
                const lead = document.querySelector('{S}.lead'), btn = document.querySelector('{S}[data-a="dz-map"]');
                return !!btn && /Harta modulului/.test(btn.textContent) && !!(lead.compareDocumentPosition(btn) & Node.DOCUMENT_POSITION_FOLLOWING) && btn.getAttribute('aria-expanded') === 'false' && !document.querySelector('{S}[data-dz-map]'); }}"""))
            check(tag + "every point has a visible number and a closed 'Pe larg ›'", await pg.evaluate(f"""() => {{
                const li = [...document.querySelectorAll('{S}ul.pts > li')];
                return li.length === 12 && li.every((e, i) => e.querySelector('.pn') && e.querySelector('.pn').textContent.trim() === String(i + 1) && /Pe larg/.test(e.querySelector('[data-a="dz"]').textContent) && e.querySelector('[data-a="dz"]').getAttribute('aria-expanded') === 'false'); }}"""))
            check(tag + "no explanation is open at first; the button says 'Deschide tot'", await pg.locator(S + "[data-dz]").count() == 0 and "Deschide tot" in await pg.locator(S + '[data-a="dz-all"]').inner_text())

            # ---- one point ----
            await pg.click(S + '[data-a="dz"][data-i="2"]'); await pg.wait_for_timeout(100)
            txt = await pg.locator(S + '[data-dz="2"]').inner_text()
            first = data["items"][2]["p"].replace("`", "")[:30]
            check(tag + "'Pe larg' opens the explanation of exactly that point, under it", await pg.locator(S + "[data-dz]").count() == 1 and first in txt and await pg.evaluate(f"document.querySelector('{S}ul.pts > li:nth-child(3) [data-dz=\"2\"]') !== null"), txt[:120])
            low = txt.lower()   # etichetele sunt scrise cu majuscule din CSS
            check(tag + "the labels Problema and Ideea show; fields that are missing do not", "problema" in low and "ideea" in low and "analogie" not in low)
            check(tag + "a point with a C++ comparison shows 'În C++' with 'Unde nu ține' next to it", "în c++" in low and "unde nu ține" in low and await pg.evaluate(f"!!document.querySelector('{S}[data-dz=\"2\"] .dz-cpp .dz-nu')"))
            check(tag + "the opened button is marked expanded", await pg.get_attribute(S + '[data-a="dz"][data-i="2"]', "aria-expanded") == "true")
            assert not data["items"][9].get("cpp"), "punctul 10 trebuie să rămână fără C++ (testul de mai jos se sprijină pe el)"
            await pg.click(S + '[data-a="dz"][data-i="9"]'); await pg.wait_for_timeout(100)
            t5 = (await pg.locator(S + '[data-dz="9"]').inner_text()).lower()
            check(tag + "opening another keeps the first one open; a point without C++ shows no C++ block", await pg.locator(S + "[data-dz]").count() == 2 and "în c++" not in t5 and "unde nu ține" not in t5 and "exemplu" in t5)
            await pg.click(S + '[data-a="dz"][data-i="2"]'); await pg.wait_for_timeout(100)
            check(tag + "a second tap closes it", await pg.locator(S + '[data-dz="2"]').count() == 0 and await pg.locator(S + '[data-dz="9"]').count() == 1)
            check(tag + "a partly open sheet still offers 'Deschide tot'", "Deschide tot" in await pg.locator(S + '[data-a="dz-all"]').inner_text())
            ex = await pg.evaluate(f"document.querySelectorAll('{S}[data-dz=\"9\"] pre.code .tk-k').length")
            check(tag + "Python examples are colored", ex > 0)
            await pg.click(S + '[data-a="dz"][data-i="9"]')

            # ---- the map ----
            await pg.click(S + '[data-a="dz-map"]'); await pg.wait_for_timeout(100)
            mt = await pg.locator(S + "[data-dz-map]").inner_text()
            check(tag + "the map shows the module's problem and every group with its range", data["map"]["p"].replace("`", "")[:30] in mt and all((f"{g['a']}–{g['b']}" if g["a"] != g["b"] else str(g["a"])) in mt for g in data["map"]["g"]), mt[:200])
            await pg.click(S + '[data-a="dz-map"]'); await pg.wait_for_timeout(100)
            check(tag + "tapping the map button again closes it", await pg.locator(S + "[data-dz-map]").count() == 0)

            # ---- open all / close all ----
            await pg.click(S + '[data-a="dz-all"]'); await pg.wait_for_timeout(150)
            check(tag + "'Deschide tot' opens the map and all 12 explanations and becomes 'Închide tot'", await pg.locator(S + "[data-dz]").count() == 12 and await pg.locator(S + "[data-dz-map]").count() == 1 and "Închide tot" in await pg.locator(S + '[data-a="dz-all"]').inner_text())
            check(tag + "no horizontal overflow with everything open at 360 px", await pg.evaluate("document.documentElement.scrollWidth <= 360"), await pg.evaluate("document.documentElement.scrollWidth"))
            check(tag + "no code block or table sticks out of the sheet", await pg.evaluate(f"""() => {{ const r = document.querySelector('{S}.sheet-b').getBoundingClientRect(); return [...document.querySelectorAll('{S}pre.code')].every(e => e.getBoundingClientRect().right <= r.right + 1); }}"""))
            await pg.screenshot(path=str(SHOTS / f"desf_oop_{scheme}.png"), full_page=True)
            await pg.click(S + '[data-a="dz-all"]'); await pg.wait_for_timeout(100)
            check(tag + "'Închide tot' closes the map and every explanation", await pg.locator(S + "[data-dz]").count() == 0 and await pg.locator(S + "[data-dz-map]").count() == 0 and "Deschide tot" in await pg.locator(S + '[data-a="dz-all"]').inner_text())

            # ---- state: only in ui ----
            check(tag + "opening and closing does not touch the saved progress", await pg.evaluate("JSON.stringify(window.__prep.state())") == state0)
            check(tag + "no console errors", not pg.errs, pg.errs)

            # ---- a module without explanations looks as before ----
            await pg.evaluate(f"document.querySelector('{S}summary').click()"); await pg.wait_for_timeout(150)
            await open_sheet(pg, "aws")
            P = "#sheet-aws "
            n_ctl = await pg.evaluate("window.PREP.sheets.aws.points.length")
            check(tag + "aws has no explanations in the data", await pg.evaluate("!window.PREP.desf.aws"))
            check(tag + "a module without explanations: no numbers, no buttons, plain list", await pg.locator(P + ".pn").count() == 0 and await pg.locator(P + "[data-a^='dz']").count() == 0 and await pg.locator(P + "ul.pts > li").count() == n_ctl)

            # ---- python (tichetul 03): harta și 10 desfășurări, cu C++ doar unde există un echivalent ----
            await pg.evaluate(f"document.querySelector('{P}summary').click()"); await pg.wait_for_timeout(150)
            dp = await pg.evaluate("window.PREP.desf.python")
            n_py = await pg.evaluate("window.PREP.sheets.python.points.length")
            await open_sheet(pg, "python")
            Y = "#sheet-python "
            check(tag + "python: the map and one explanation per point, numbered like the points", dp and len(dp["items"]) == n_py == 10 and await pg.locator(Y + "ul.pts > li .pn").count() == n_py and await pg.locator(Y + '[data-a="dz-map"]').count() == 1)
            await pg.click(Y + '[data-a="dz-all"]'); await pg.wait_for_timeout(150)
            check(tag + "python: 'Deschide tot' opens the map and every explanation", await pg.locator(Y + "[data-dz]").count() == n_py and await pg.locator(Y + "[data-dz-map]").count() == 1)
            cpp = await pg.evaluate(f"[...document.querySelectorAll('{Y}[data-dz]')].map(e => !!e.querySelector('.dz-cpp'))")
            check(tag + "python: the C++ block shows exactly where the data has one, and always with 'Unde nu ține' (none at 8 and 10)", cpp == [bool(x.get("cpp")) for x in dp["items"]] and not cpp[7] and not cpp[9] and any(cpp) and await pg.locator(Y + ".dz-cpp").count() == await pg.locator(Y + ".dz-cpp .dz-nu").count(), cpp)
            check(tag + "python: no horizontal overflow with everything open at 360 px", await pg.evaluate("document.documentElement.scrollWidth <= 360"), await pg.evaluate("document.documentElement.scrollWidth"))
            check(tag + "python: no code block sticks out of the sheet", await pg.evaluate(f"""() => {{ const r = document.querySelector('{Y}.sheet-b').getBoundingClientRect(); return [...document.querySelectorAll('{Y}pre.code')].every(e => e.getBoundingClientRect().right <= r.right + 1); }}"""))
            await pg.screenshot(path=str(SHOTS / f"desf_python_{scheme}.png"), full_page=True)
            check(tag + "python: opening everything leaves the saved progress alone, no console errors", await pg.evaluate("JSON.stringify(window.__prep.state())") == state0 and not pg.errs, pg.errs)

            # ---- gil (tichetul 04): harta și 8 desfășurări; C++ la 1, 4 și 7 (thread-uri, procese, mutex), fără echivalent în rest ----
            await pg.evaluate(f"document.querySelector('{Y}summary').click()"); await pg.wait_for_timeout(150)   # închide fișa python, ca să se deschidă gil
            dg = await pg.evaluate("window.PREP.desf.gil")
            n_gil = await pg.evaluate("window.PREP.sheets.gil.points.length")
            await open_sheet(pg, "gil")
            G = "#sheet-gil "
            check(tag + "gil: the map and one explanation per point, numbered like the points", dg and len(dg["items"]) == n_gil == 8 and await pg.locator(G + "ul.pts > li .pn").count() == n_gil and await pg.locator(G + '[data-a="dz-map"]').count() == 1)
            await pg.click(G + '[data-a="dz-all"]'); await pg.wait_for_timeout(150)
            check(tag + "gil: 'Deschide tot' opens the map and every explanation", await pg.locator(G + "[data-dz]").count() == n_gil and await pg.locator(G + "[data-dz-map]").count() == 1)
            cpp = await pg.evaluate(f"[...document.querySelectorAll('{G}[data-dz]')].map(e => !!e.querySelector('.dz-cpp'))")
            check(tag + "gil: the C++ block shows only at 1, 4 and 7, and always with 'Unde nu ține'", cpp == [True, False, False, True, False, False, True, False] and cpp == [bool(x.get("cpp")) for x in dg["items"]] and await pg.locator(G + ".dz-cpp").count() == await pg.locator(G + ".dz-cpp .dz-nu").count(), cpp)
            check(tag + "gil: Python examples are colored", await pg.evaluate(f"document.querySelectorAll('{G}pre.code .tk-k').length") > 0)
            check(tag + "gil: no horizontal overflow with everything open at 360 px", await pg.evaluate("document.documentElement.scrollWidth <= 360"), await pg.evaluate("document.documentElement.scrollWidth"))
            check(tag + "gil: no code block sticks out of the sheet", await pg.evaluate(f"""() => {{ const r = document.querySelector('{G}.sheet-b').getBoundingClientRect(); return [...document.querySelectorAll('{G}pre.code')].every(e => e.getBoundingClientRect().right <= r.right + 1); }}"""))
            await pg.screenshot(path=str(SHOTS / f"desf_gil_{scheme}.png"), full_page=True)
            check(tag + "gil: opening everything leaves the saved progress alone, no console errors", await pg.evaluate("JSON.stringify(window.__prep.state())") == state0 and not pg.errs, pg.errs)

            # ---- asyncio (tichetul 05): harta și 11 desfășurări; C++ la 1, 2, 5, 6 și 9 (event loop, std::async, wait_for, catch, std::queue) ----
            await pg.evaluate(f"document.querySelector('{G}summary').click()"); await pg.wait_for_timeout(150)   # închide fișa gil, ca să se deschidă asyncio
            da = await pg.evaluate("window.PREP.desf.asyncio")
            n_aio = await pg.evaluate("window.PREP.sheets.asyncio.points.length")
            await open_sheet(pg, "asyncio")
            A = "#sheet-asyncio "
            check(tag + "asyncio: the map and one explanation per point, numbered like the points", da and len(da["items"]) == n_aio == 11 and await pg.locator(A + "ul.pts > li .pn").count() == n_aio and await pg.locator(A + '[data-a="dz-map"]').count() == 1)
            await pg.click(A + '[data-a="dz-all"]'); await pg.wait_for_timeout(150)
            check(tag + "asyncio: 'Deschide tot' opens the map and every explanation", await pg.locator(A + "[data-dz]").count() == n_aio and await pg.locator(A + "[data-dz-map]").count() == 1)
            cpp = await pg.evaluate(f"[...document.querySelectorAll('{A}[data-dz]')].map(e => !!e.querySelector('.dz-cpp'))")
            check(tag + "asyncio: the C++ block shows only at 1, 2, 5, 6 and 9, and always with 'Unde nu ține'", cpp == [True, True, False, False, True, True, False, False, True, False, False] and cpp == [bool(x.get("cpp")) for x in da["items"]] and await pg.locator(A + ".dz-cpp").count() == await pg.locator(A + ".dz-cpp .dz-nu").count(), cpp)
            check(tag + "asyncio: Python examples are colored", await pg.evaluate(f"document.querySelectorAll('{A}pre.code .tk-k').length") > 0)
            check(tag + "asyncio: no horizontal overflow with everything open at 360 px", await pg.evaluate("document.documentElement.scrollWidth <= 360"), await pg.evaluate("document.documentElement.scrollWidth"))
            check(tag + "asyncio: no code block sticks out of the sheet", await pg.evaluate(f"""() => {{ const r = document.querySelector('{A}.sheet-b').getBoundingClientRect(); return [...document.querySelectorAll('{A}pre.code')].every(e => e.getBoundingClientRect().right <= r.right + 1); }}"""))
            await pg.screenshot(path=str(SHOTS / f"desf_asyncio_{scheme}.png"), full_page=True)
            check(tag + "asyncio: opening everything leaves the saved progress alone, no console errors", await pg.evaluate("JSON.stringify(window.__prep.state())") == state0 and not pg.errs, pg.errs)

            # ---- asgi (tichetul 06): harta și 10 desfășurări; C++ doar la 3 (fork / waitpid); la 5 și 7 exemple ```text ----
            await pg.evaluate(f"document.querySelector('{A}summary').click()"); await pg.wait_for_timeout(150)   # închide fișa asyncio, ca să se deschidă asgi
            dsg = await pg.evaluate("window.PREP.desf.asgi")
            n_asgi = await pg.evaluate("window.PREP.sheets.asgi.points.length")
            await open_sheet(pg, "asgi")
            S_ = "#sheet-asgi "
            check(tag + "asgi: the map and one explanation per point, numbered like the points", dsg and len(dsg["items"]) == n_asgi == 10 and await pg.locator(S_ + "ul.pts > li .pn").count() == n_asgi and await pg.locator(S_ + '[data-a="dz-map"]').count() == 1)
            await pg.click(S_ + '[data-a="dz-all"]'); await pg.wait_for_timeout(150)
            check(tag + "asgi: 'Deschide tot' opens the map and every explanation", await pg.locator(S_ + "[data-dz]").count() == n_asgi and await pg.locator(S_ + "[data-dz-map]").count() == 1)
            cpp = await pg.evaluate(f"[...document.querySelectorAll('{S_}[data-dz]')].map(e => !!e.querySelector('.dz-cpp'))")
            check(tag + "asgi: the C++ block shows only at 3, and always with 'Unde nu ține'", cpp == [False, False, True, False, False, False, False, False, False, False] and cpp == [bool(x.get("cpp")) for x in dsg["items"]] and await pg.locator(S_ + ".dz-cpp").count() == await pg.locator(S_ + ".dz-cpp .dz-nu").count(), cpp)
            check(tag + "asgi: Python examples are colored, ```text examples are not", await pg.evaluate(f"document.querySelectorAll('{S_}pre.code .tk-k').length") > 0 and await pg.evaluate(f"[...document.querySelectorAll('{S_}[data-dz=\"4\"] pre.code')].every(e => e.querySelectorAll('[class^=tk-]').length === 0)"))
            check(tag + "asgi: no horizontal overflow with everything open at 360 px", await pg.evaluate("document.documentElement.scrollWidth <= 360"), await pg.evaluate("document.documentElement.scrollWidth"))
            check(tag + "asgi: no code block sticks out of the sheet", await pg.evaluate(f"""() => {{ const r = document.querySelector('{S_}.sheet-b').getBoundingClientRect(); return [...document.querySelectorAll('{S_}pre.code')].every(e => e.getBoundingClientRect().right <= r.right + 1); }}"""))
            await pg.screenshot(path=str(SHOTS / f"desf_asgi_{scheme}.png"), full_page=True)
            check(tag + "asgi: opening everything leaves the saved progress alone, no console errors", await pg.evaluate("JSON.stringify(window.__prep.state())") == state0 and not pg.errs, pg.errs)

            # ---- pytest (tichetul 07): harta și 13 desfășurări; C++ la 2, 4, 6 și 9 (GoogleTest: fixture, teste cu parametri, gMock, ceas injectat) ----
            await pg.evaluate(f"document.querySelector('{S_}summary').click()"); await pg.wait_for_timeout(150)   # închide fișa asgi, ca să se deschidă pytest
            dpt = await pg.evaluate("window.PREP.desf.pytest")
            n_pt = await pg.evaluate("window.PREP.sheets.pytest.points.length")
            await open_sheet(pg, "pytest")
            T_ = "#sheet-pytest "
            check(tag + "pytest: the map and one explanation per point, numbered like the points", dpt and len(dpt["items"]) == n_pt == 13 and await pg.locator(T_ + "ul.pts > li .pn").count() == n_pt and await pg.locator(T_ + '[data-a="dz-map"]').count() == 1)
            await pg.click(T_ + '[data-a="dz-all"]'); await pg.wait_for_timeout(150)
            check(tag + "pytest: 'Deschide tot' opens the map and every explanation", await pg.locator(T_ + "[data-dz]").count() == n_pt and await pg.locator(T_ + "[data-dz-map]").count() == 1)
            cpp = await pg.evaluate(f"[...document.querySelectorAll('{T_}[data-dz]')].map(e => !!e.querySelector('.dz-cpp'))")
            check(tag + "pytest: the C++ block shows only at 2, 4, 6 and 9, and always with 'Unde nu ține'", cpp == [False, True, False, True, False, True, False, False, True, False, False, False, False] and cpp == [bool(x.get("cpp")) for x in dpt["items"]] and await pg.locator(T_ + ".dz-cpp").count() == await pg.locator(T_ + ".dz-cpp .dz-nu").count(), cpp)
            check(tag + "pytest: Python examples are colored, ```text examples (1, 3, 10, 12, 13) are not", await pg.evaluate(f"document.querySelectorAll('{T_}pre.code .tk-k').length") > 0 and await pg.evaluate("(sel) => [1, 3, 10, 12, 13].every(n => [...document.querySelectorAll(sel + ' [data-dz=\"' + (n - 1) + '\"] pre.code')].every(e => e.querySelectorAll('[class^=tk-]').length === 0))", "#sheet-pytest"))
            check(tag + "pytest: no horizontal overflow with everything open at 360 px", await pg.evaluate("document.documentElement.scrollWidth <= 360"), await pg.evaluate("document.documentElement.scrollWidth"))
            check(tag + "pytest: no code block sticks out of the sheet", await pg.evaluate(f"""() => {{ const r = document.querySelector('{T_}.sheet-b').getBoundingClientRect(); return [...document.querySelectorAll('{T_}pre.code')].every(e => e.getBoundingClientRect().right <= r.right + 1); }}"""))
            await pg.screenshot(path=str(SHOTS / f"desf_pytest_{scheme}.png"), full_page=True)
            check(tag + "pytest: opening everything leaves the saved progress alone, no console errors", await pg.evaluate("JSON.stringify(window.__prep.state())") == state0 and not pg.errs, pg.errs)

            # ---- frontend (tichetul 08): harta și 13 desfășurări; C++ doar la 1 (captură lambda) și 10 (std::variant); toate exemplele sunt TS / TSX / JS, deci fără colorare Python ----
            await pg.evaluate(f"document.querySelector('{T_}summary').click()"); await pg.wait_for_timeout(150)   # închide fișa pytest, ca să se deschidă frontend
            dfe = await pg.evaluate("window.PREP.desf.frontend")
            n_fe = await pg.evaluate("window.PREP.sheets.frontend.points.length")
            await open_sheet(pg, "frontend")
            E_ = "#sheet-frontend "
            check(tag + "frontend: the map and one explanation per point, numbered like the points", dfe and len(dfe["items"]) == n_fe == 13 and await pg.locator(E_ + "ul.pts > li .pn").count() == n_fe and await pg.locator(E_ + '[data-a="dz-map"]').count() == 1)
            await pg.click(E_ + '[data-a="dz-all"]'); await pg.wait_for_timeout(150)
            check(tag + "frontend: 'Deschide tot' opens the map and every explanation", await pg.locator(E_ + "[data-dz]").count() == n_fe and await pg.locator(E_ + "[data-dz-map]").count() == 1)
            cpp = await pg.evaluate(f"[...document.querySelectorAll('{E_}[data-dz]')].map(e => !!e.querySelector('.dz-cpp'))")
            check(tag + "frontend: the C++ block shows only at 1 and 10, and always with 'Unde nu ține'", cpp == [True, False, False, False, False, False, False, False, False, True, False, False, False] and cpp == [bool(x.get("cpp")) for x in dfe["items"]] and await pg.locator(E_ + ".dz-cpp").count() == await pg.locator(E_ + ".dz-cpp .dz-nu").count(), cpp)
            check(tag + "frontend: the TS / TSX / JS examples are shown without Python coloring", await pg.locator(E_ + "pre.code").count() >= n_fe and await pg.evaluate(f"[...document.querySelectorAll('{E_}pre.code')].every(e => e.querySelectorAll('[class^=tk-]').length === 0)"))
            check(tag + "frontend: no horizontal overflow with everything open at 360 px", await pg.evaluate("document.documentElement.scrollWidth <= 360"), await pg.evaluate("document.documentElement.scrollWidth"))
            check(tag + "frontend: no code block sticks out of the sheet", await pg.evaluate(f"""() => {{ const r = document.querySelector('{E_}.sheet-b').getBoundingClientRect(); return [...document.querySelectorAll('{E_}pre.code')].every(e => e.getBoundingClientRect().right <= r.right + 1); }}"""))
            await pg.screenshot(path=str(SHOTS / f"desf_frontend_{scheme}.png"), full_page=True)
            check(tag + "frontend: opening everything leaves the saved progress alone, no console errors", await pg.evaluate("JSON.stringify(window.__prep.state())") == state0 and not pg.errs, pg.errs)

            # ---- design (tichetul 09): harta și 9 desfășurări; fără C++ (nu există echivalent real), exemple Python colorate și blocuri `text` (SQL) necolorate ----
            await pg.evaluate(f"document.querySelector('{E_}summary').click()"); await pg.wait_for_timeout(150)   # închide fișa frontend, ca să se deschidă design
            dfd = await pg.evaluate("window.PREP.desf.design")
            n_ds = await pg.evaluate("window.PREP.sheets.design.points.length")
            await open_sheet(pg, "design")
            D_ = "#sheet-design "
            check(tag + "design: the map and one explanation per point, numbered like the points", dfd and len(dfd["items"]) == n_ds == 9 and await pg.locator(D_ + "ul.pts > li .pn").count() == n_ds and await pg.locator(D_ + '[data-a="dz-map"]').count() == 1)
            check(tag + "design: the map and the explanations start closed", await pg.locator(D_ + "[data-dz-map]").count() == 0 and await pg.locator(D_ + "[data-dz]").count() == 0)
            await pg.click(D_ + '[data-a="dz-all"]'); await pg.wait_for_timeout(150)
            check(tag + "design: 'Deschide tot' opens the map and every explanation", await pg.locator(D_ + "[data-dz]").count() == n_ds and await pg.locator(D_ + "[data-dz-map]").count() == 1)
            check(tag + "design: no C++ comparison anywhere (the module has no real C++ equivalent)", await pg.locator(D_ + ".dz-cpp").count() == 0 and not any(x.get("cpp") or x.get("nu") for x in dfd["items"]))
            check(tag + "design: the Python examples are colored, the SQL blocks are not", await pg.locator(D_ + "pre.code .tk-k").count() > 0 and await pg.evaluate(f"(() => {{ const sql = [...document.querySelectorAll('{D_}pre.code')].filter(e => /ROW LEVEL SECURITY|outbox/.test(e.textContent)); return sql.length === 2 && sql.every(e => e.querySelectorAll('[class^=tk-]').length === 0); }})()"))
            check(tag + "design: no horizontal overflow with everything open at 360 px", await pg.evaluate("document.documentElement.scrollWidth <= 360"), await pg.evaluate("document.documentElement.scrollWidth"))
            check(tag + "design: no code block sticks out of the sheet", await pg.evaluate(f"""() => {{ const r = document.querySelector('{D_}.sheet-b').getBoundingClientRect(); return [...document.querySelectorAll('{D_}pre.code')].every(e => e.getBoundingClientRect().right <= r.right + 1); }}"""))
            await pg.screenshot(path=str(SHOTS / f"desf_design_{scheme}.png"), full_page=True)
            check(tag + "design: opening everything leaves the saved progress alone, no console errors", await pg.evaluate("JSON.stringify(window.__prep.state())") == state0 and not pg.errs, pg.errs)

            # ---- sqlalchemy (tichetul 11): harta și 12 desfășurări; C++ doar la 6 (RAII față de `with Session`); Python la 1, 3, 6 și 11 (colorat), restul ```text (necolorat) ----
            await pg.evaluate(f"document.querySelector('{D_}summary').click()"); await pg.wait_for_timeout(150)   # închide fișa design, ca să se deschidă sqlalchemy
            dsq = await pg.evaluate("window.PREP.desf.sqlalchemy")
            n_sq = await pg.evaluate("window.PREP.sheets.sqlalchemy.points.length")
            await open_sheet(pg, "sqlalchemy")
            Q_ = "#sheet-sqlalchemy "
            check(tag + "sqlalchemy: the map and one explanation per point, numbered like the points", dsq and len(dsq["items"]) == n_sq == 12 and await pg.locator(Q_ + "ul.pts > li .pn").count() == n_sq and await pg.locator(Q_ + '[data-a="dz-map"]').count() == 1)
            check(tag + "sqlalchemy: the map and the explanations start closed", await pg.locator(Q_ + "[data-dz-map]").count() == 0 and await pg.locator(Q_ + "[data-dz]").count() == 0)
            await pg.click(Q_ + '[data-a="dz-all"]'); await pg.wait_for_timeout(150)
            check(tag + "sqlalchemy: 'Deschide tot' opens the map and every explanation", await pg.locator(Q_ + "[data-dz]").count() == n_sq and await pg.locator(Q_ + "[data-dz-map]").count() == 1)
            cpp = await pg.evaluate(f"[...document.querySelectorAll('{Q_}[data-dz]')].map(e => !!e.querySelector('.dz-cpp'))")
            check(tag + "sqlalchemy: the C++ block shows only at 6, and always with 'Unde nu ține'", cpp == [i == 5 for i in range(12)] and cpp == [bool(x.get("cpp")) for x in dsq["items"]] and await pg.locator(Q_ + ".dz-cpp").count() == await pg.locator(Q_ + ".dz-cpp .dz-nu").count() == 1, cpp)
            check(tag + "sqlalchemy: Python examples (1, 3, 6, 11) are colored, ```text examples are not", await pg.evaluate("(sel) => { const col = n => [...document.querySelectorAll(sel + ' [data-dz=\"' + (n - 1) + '\"] pre.code')].map(e => e.querySelectorAll('[class^=tk-]').length); return [1, 3, 6, 11].every(n => col(n).length === 1 && col(n)[0] > 0) && [2, 4, 5, 7, 8, 9, 10, 12].every(n => col(n).length === 1 && col(n)[0] === 0); }", "#sheet-sqlalchemy"))
            check(tag + "sqlalchemy: no horizontal overflow with everything open at 360 px", await pg.evaluate("document.documentElement.scrollWidth <= 360"), await pg.evaluate("document.documentElement.scrollWidth"))
            check(tag + "sqlalchemy: no code block sticks out of the sheet", await pg.evaluate(f"""() => {{ const r = document.querySelector('{Q_}.sheet-b').getBoundingClientRect(); return [...document.querySelectorAll('{Q_}pre.code')].every(e => e.getBoundingClientRect().right <= r.right + 1); }}"""))
            await pg.screenshot(path=str(SHOTS / f"desf_sqlalchemy_{scheme}.png"), full_page=True)
            check(tag + "sqlalchemy: opening everything leaves the saved progress alone, no console errors", await pg.evaluate("JSON.stringify(window.__prep.state())") == state0 and not pg.errs, pg.errs)
            # ---- postgres (tichetul 12): harta și 11 desfășurări; C++ doar la 3 (lost update) și 5 (deadlock), exemple SQL în blocuri `text` (necolorate), un singur exemplu Python (colorat) ----
            await pg.evaluate(f"document.querySelector('{Q_}summary').click()"); await pg.wait_for_timeout(150)   # închide fișa sqlalchemy, ca să se deschidă postgres
            dfp = await pg.evaluate("window.PREP.desf.postgres")
            n_pg = await pg.evaluate("window.PREP.sheets.postgres.points.length")
            await open_sheet(pg, "postgres")
            G_ = "#sheet-postgres "
            check(tag + "postgres: the map and one explanation per point, numbered like the points", dfp and len(dfp["items"]) == n_pg == 11 and len(dfp["map"]["g"]) == 5 and await pg.locator(G_ + "ul.pts > li .pn").count() == n_pg and await pg.locator(G_ + '[data-a="dz-map"]').count() == 1)
            check(tag + "postgres: the map and the explanations start closed", await pg.locator(G_ + "[data-dz-map]").count() == 0 and await pg.locator(G_ + "[data-dz]").count() == 0)
            await pg.click(G_ + '[data-a="dz-all"]'); await pg.wait_for_timeout(150)
            check(tag + "postgres: 'Deschide tot' opens the map and every explanation", await pg.locator(G_ + "[data-dz]").count() == n_pg and await pg.locator(G_ + "[data-dz-map]").count() == 1)
            cpp_pg = [bool(x.get("cpp")) for x in dfp["items"]]
            check(tag + "postgres: the C++ block shows only at 3 and 5, and always with 'Unde nu ține'", cpp_pg == [False, False, True, False, True, False, False, False, False, False, False] and await pg.locator(G_ + ".dz-cpp").count() == 2 and await pg.locator(G_ + ".dz-cpp .dz-nu").count() == 2, cpp_pg)
            check(tag + "postgres: only the one Python example is colored; the SQL blocks (and the psycopg snippet) are not", await pg.locator(G_ + "pre.code").count() == 11 and await pg.evaluate(f"(() => {{ const b = [...document.querySelectorAll('{G_}pre.code')]; const col = b.filter(e => e.querySelectorAll('[class^=tk-]').length > 0); return col.length === 1 && /stoc/.test(col[0].textContent) && b.filter(e => /SKIP LOCKED|DETACH PARTITION|cp.write_row/.test(e.textContent)).every(e => e.querySelectorAll('[class^=tk-]').length === 0); }})()"))
            check(tag + "postgres: no horizontal overflow with everything open at 360 px", await pg.evaluate("document.documentElement.scrollWidth <= 360"), await pg.evaluate("document.documentElement.scrollWidth"))
            check(tag + "postgres: no code block sticks out of the sheet", await pg.evaluate(f"""() => {{ const r = document.querySelector('{G_}.sheet-b').getBoundingClientRect(); return [...document.querySelectorAll('{G_}pre.code')].every(e => e.getBoundingClientRect().right <= r.right + 1); }}"""))
            await pg.screenshot(path=str(SHOTS / f"desf_postgres_{scheme}.png"), full_page=True)
            check(tag + "postgres: opening everything leaves the saved progress alone, no console errors", await pg.evaluate("JSON.stringify(window.__prep.state())") == state0 and not pg.errs, pg.errs)
            # ---- index (tichetul 13): harta și 11 desfășurări; C++ la 1, 4, 7 și 11 (std::map, cheie pair, unordered_map, index inversat); exemple Python colorate (1, 4, 6, 11) și SQL ```text necolorat ----
            await pg.evaluate(f"document.querySelector('{G_}summary').click()"); await pg.wait_for_timeout(150)   # închide fișa postgres, ca să se deschidă index
            dix = await pg.evaluate("window.PREP.desf.index")
            n_ix = await pg.evaluate("window.PREP.sheets.index.points.length")
            await open_sheet(pg, "index")
            I_ = "#sheet-index "
            check(tag + "index: the map and one explanation per point, numbered like the points", dix and len(dix["items"]) == n_ix == 11 and await pg.locator(I_ + "ul.pts > li .pn").count() == n_ix and await pg.locator(I_ + '[data-a="dz-map"]').count() == 1)
            check(tag + "index: the map and the explanations start closed", await pg.locator(I_ + "[data-dz-map]").count() == 0 and await pg.locator(I_ + "[data-dz]").count() == 0)
            await pg.click(I_ + '[data-a="dz-all"]'); await pg.wait_for_timeout(150)
            check(tag + "index: 'Deschide tot' opens the map and every explanation", await pg.locator(I_ + "[data-dz]").count() == n_ix and await pg.locator(I_ + "[data-dz-map]").count() == 1)
            cpp = await pg.evaluate(f"[...document.querySelectorAll('{I_}[data-dz]')].map(e => !!e.querySelector('.dz-cpp'))")
            check(tag + "index: the C++ block shows only at 1, 4, 7 and 11, and always with 'Unde nu ține'", cpp == [True, False, False, True, False, False, True, False, False, False, True] and cpp == [bool(x.get("cpp")) for x in dix["items"]] and await pg.locator(I_ + ".dz-cpp").count() == await pg.locator(I_ + ".dz-cpp .dz-nu").count(), cpp)
            check(tag + "index: Python examples (1, 4, 6, 11) are colored, SQL ```text examples (3, 5, 7, 8, 9, 10) are not", await pg.evaluate("(sel) => [1, 4, 6, 11].every(n => document.querySelectorAll(sel + ' [data-dz=\"' + (n - 1) + '\"] pre.code .tk-k').length > 0)", "#sheet-index") and await pg.evaluate("(sel) => [3, 5, 7, 8, 9, 10].every(n => { const b = [...document.querySelectorAll(sel + ' [data-dz=\"' + (n - 1) + '\"] pre.code')]; return b.length === 1 && b.every(e => e.querySelectorAll('[class^=tk-]').length === 0); })", "#sheet-index"))
            check(tag + "index: no horizontal overflow with everything open at 360 px", await pg.evaluate("document.documentElement.scrollWidth <= 360"), await pg.evaluate("document.documentElement.scrollWidth"))
            check(tag + "index: no code block sticks out of the sheet", await pg.evaluate(f"""() => {{ const r = document.querySelector('{I_}.sheet-b').getBoundingClientRect(); return [...document.querySelectorAll('{I_}pre.code')].every(e => e.getBoundingClientRect().right <= r.right + 1); }}"""))
            await pg.screenshot(path=str(SHOTS / f"desf_index_{scheme}.png"), full_page=True)
            check(tag + "index: opening everything leaves the saved progress alone, no console errors", await pg.evaluate("JSON.stringify(window.__prep.state())") == state0 and not pg.errs, pg.errs)
            # ---- runtime (tichetul 15): harta și 8 desfășurări; C++ la 1, 3, 4, 6, 7 și 8 (compilare, tipare statică, conversii, AOT, shared_ptr, main), fără echivalent la 2 și 5; toate exemplele sunt Python (colorate) ----
            await pg.evaluate(f"document.querySelector('{I_}summary').click()"); await pg.wait_for_timeout(150)   # închide fișa index, ca să se deschidă runtime
            drt = await pg.evaluate("window.PREP.desf.runtime")
            n_rt = await pg.evaluate("window.PREP.sheets.runtime.points.length")
            await open_sheet(pg, "runtime")
            R_ = "#sheet-runtime "
            check(tag + "runtime: the map and one explanation per point, numbered like the points", drt and len(drt["items"]) == n_rt == 8 and len(drt["map"]["g"]) == 4 and await pg.locator(R_ + "ul.pts > li .pn").count() == n_rt and await pg.locator(R_ + '[data-a="dz-map"]').count() == 1)
            check(tag + "runtime: the map and the explanations start closed", await pg.locator(R_ + "[data-dz-map]").count() == 0 and await pg.locator(R_ + "[data-dz]").count() == 0)
            await pg.click(R_ + '[data-a="dz-all"]'); await pg.wait_for_timeout(150)
            check(tag + "runtime: 'Deschide tot' opens the map and every explanation", await pg.locator(R_ + "[data-dz]").count() == n_rt and await pg.locator(R_ + "[data-dz-map]").count() == 1)
            cpp_rt = await pg.evaluate(f"[...document.querySelectorAll('{R_}[data-dz]')].map(e => !!e.querySelector('.dz-cpp'))")
            check(tag + "runtime: the C++ block shows only at 1, 3, 4, 6, 7 and 8, and always with 'Unde nu ține'", cpp_rt == [True, False, True, True, False, True, True, True] and cpp_rt == [bool(x.get("cpp")) for x in drt["items"]] and await pg.locator(R_ + ".dz-cpp").count() == 6 and await pg.locator(R_ + ".dz-cpp .dz-nu").count() == 6, cpp_rt)
            check(tag + "runtime: the eight Python examples are colored", await pg.locator(R_ + "pre.code").count() == 8 and await pg.evaluate("(sel) => [...document.querySelectorAll(sel + ' pre.code')].every(e => e.querySelectorAll('[class^=tk-]').length > 0)", "#sheet-runtime"))
            check(tag + "runtime: no horizontal overflow with everything open at 360 px", await pg.evaluate("document.documentElement.scrollWidth <= 360"), await pg.evaluate("document.documentElement.scrollWidth"))
            check(tag + "runtime: no code block sticks out of the sheet", await pg.evaluate(f"""() => {{ const r = document.querySelector('{R_}.sheet-b').getBoundingClientRect(); return [...document.querySelectorAll('{R_}pre.code')].every(e => e.getBoundingClientRect().right <= r.right + 1); }}"""))
            await pg.screenshot(path=str(SHOTS / f"desf_runtime_{scheme}.png"), full_page=True)
            check(tag + "runtime: opening everything leaves the saved progress alone, no console errors", await pg.evaluate("JSON.stringify(window.__prep.state())") == state0 and not pg.errs, pg.errs)
            # ---- security (tichetul 16): harta și 11 desfășurări; C++ doar la 3 (std::system / execvp) și 10 (random_device, memcmp); Python colorat la 1–8 și 10, ```text necolorat la 9 și 11 ----
            await pg.evaluate(f"document.querySelector('{R_}summary').click()"); await pg.wait_for_timeout(150)   # închide fișa runtime, ca să se deschidă security
            dsc = await pg.evaluate("window.PREP.desf.security")
            n_sc = await pg.evaluate("window.PREP.sheets.security.points.length")
            await open_sheet(pg, "security")
            S_ = "#sheet-security "
            check(tag + "security: the map and one explanation per point, numbered like the points", dsc and len(dsc["items"]) == n_sc == 11 and len(dsc["map"]["g"]) == 5 and await pg.locator(S_ + "ul.pts > li .pn").count() == n_sc and await pg.locator(S_ + '[data-a="dz-map"]').count() == 1)
            check(tag + "security: the map and the explanations start closed", await pg.locator(S_ + "[data-dz-map]").count() == 0 and await pg.locator(S_ + "[data-dz]").count() == 0)
            await pg.click(S_ + '[data-a="dz-all"]'); await pg.wait_for_timeout(150)
            check(tag + "security: 'Deschide tot' opens the map and every explanation", await pg.locator(S_ + "[data-dz]").count() == n_sc and await pg.locator(S_ + "[data-dz-map]").count() == 1)
            cpp_sc = await pg.evaluate(f"[...document.querySelectorAll('{S_}[data-dz]')].map(e => !!e.querySelector('.dz-cpp'))")
            check(tag + "security: the C++ block shows only at 3 and 10, and always with 'Unde nu ține'", cpp_sc == [False, False, True, False, False, False, False, False, False, True, False] and cpp_sc == [bool(x.get("cpp")) for x in dsc["items"]] and await pg.locator(S_ + ".dz-cpp").count() == 2 and await pg.locator(S_ + ".dz-cpp .dz-nu").count() == 2, cpp_sc)
            check(tag + "security: Python examples (1–8, 10) are colored, the ```text examples (9, 11) are not", await pg.evaluate("(sel) => [1, 2, 3, 4, 5, 6, 7, 8, 10].every(n => document.querySelectorAll(sel + ' [data-dz=\"' + (n - 1) + '\"] pre.code .tk-k').length > 0)", "#sheet-security") and await pg.evaluate("(sel) => [9, 11].every(n => { const b = [...document.querySelectorAll(sel + ' [data-dz=\"' + (n - 1) + '\"] pre.code')]; return b.length === 1 && b.every(e => e.querySelectorAll('[class^=tk-]').length === 0); })", "#sheet-security"))
            check(tag + "security: no horizontal overflow with everything open at 360 px", await pg.evaluate("document.documentElement.scrollWidth <= 360"), await pg.evaluate("document.documentElement.scrollWidth"))
            check(tag + "security: no code block sticks out of the sheet", await pg.evaluate(f"""() => {{ const r = document.querySelector('{S_}.sheet-b').getBoundingClientRect(); return [...document.querySelectorAll('{S_}pre.code')].every(e => e.getBoundingClientRect().right <= r.right + 1); }}"""))
            await pg.screenshot(path=str(SHOTS / f"desf_security_{scheme}.png"), full_page=True)
            check(tag + "security: opening everything leaves the saved progress alone, no console errors", await pg.evaluate("JSON.stringify(window.__prep.state())") == state0 and not pg.errs, pg.errs)
            # ---- celery (tichetul 14): harta și 12 desfășurări; fără C++ (nicio comparație reală); exemple Python colorate (1, 2, 5, 6, 11) și ```text necolorat (3, 4, 7, 8, 9, 10, 12) ----
            await pg.evaluate(f"document.querySelector('{S_}summary').click()"); await pg.wait_for_timeout(150)   # închide fișa security, ca să se deschidă celery
            dce = await pg.evaluate("window.PREP.desf.celery")
            n_ce = await pg.evaluate("window.PREP.sheets.celery.points.length")
            await open_sheet(pg, "celery")
            C_ = "#sheet-celery "
            check(tag + "celery: the map and one explanation per point, numbered like the points", dce and len(dce["items"]) == n_ce == 12 and len(dce["map"]["g"]) == 7 and await pg.locator(C_ + "ul.pts > li .pn").count() == n_ce and await pg.locator(C_ + '[data-a="dz-map"]').count() == 1)
            check(tag + "celery: the map and the explanations start closed", await pg.locator(C_ + "[data-dz-map]").count() == 0 and await pg.locator(C_ + "[data-dz]").count() == 0)
            await pg.click(C_ + '[data-a="dz-all"]'); await pg.wait_for_timeout(150)
            check(tag + "celery: 'Deschide tot' opens the map and every explanation", await pg.locator(C_ + "[data-dz]").count() == n_ce and await pg.locator(C_ + "[data-dz-map]").count() == 1)
            check(tag + "celery: no C++ block (and so no 'Unde nu ține'): the module has no real C++ equivalent", not any(x.get("cpp") or x.get("nu") for x in dce["items"]) and await pg.locator(C_ + ".dz-cpp").count() == 0 and await pg.locator(C_ + ".dz-nu").count() == 0)
            check(tag + "celery: Python examples (1, 2, 5, 6, 11) are colored, ```text examples (3, 4, 7, 8, 9, 10, 12) are not", await pg.evaluate("(sel) => [1, 2, 5, 6, 11].every(n => document.querySelectorAll(sel + ' [data-dz=\"' + (n - 1) + '\"] pre.code .tk-k').length > 0)", "#sheet-celery") and await pg.evaluate("(sel) => [3, 4, 7, 8, 9, 10, 12].every(n => { const b = [...document.querySelectorAll(sel + ' [data-dz=\"' + (n - 1) + '\"] pre.code')]; return b.length === 1 && b.every(e => e.querySelectorAll('[class^=tk-]').length === 0); })", "#sheet-celery"))
            check(tag + "celery: no horizontal overflow with everything open at 360 px", await pg.evaluate("document.documentElement.scrollWidth <= 360"), await pg.evaluate("document.documentElement.scrollWidth"))
            check(tag + "celery: no code block sticks out of the sheet", await pg.evaluate(f"""() => {{ const r = document.querySelector('{C_}.sheet-b').getBoundingClientRect(); return [...document.querySelectorAll('{C_}pre.code')].every(e => e.getBoundingClientRect().right <= r.right + 1); }}"""))
            await pg.screenshot(path=str(SHOTS / f"desf_celery_{scheme}.png"), full_page=True)
            check(tag + "celery: opening everything leaves the saved progress alone, no console errors", await pg.evaluate("JSON.stringify(window.__prep.state())") == state0 and not pg.errs, pg.errs)
            # ---- domain (tichetul 20): harta și 11 desfășurări; fără C++ (nicio comparație reală); exemple Python colorate (3, 4, 10, 11), ```text necolorat (2, 6, 7, 8, 9), fără cod la 1 și 5 (analogii) ----
            await pg.evaluate(f"document.querySelector('{C_}summary').click()"); await pg.wait_for_timeout(150)   # închide fișa celery, ca să se deschidă domain
            ddm = await pg.evaluate("window.PREP.desf.domain")
            n_dm = await pg.evaluate("window.PREP.sheets.domain.points.length")
            await open_sheet(pg, "domain")
            DM_ = "#sheet-domain "
            check(tag + "domain: the map and one explanation per point, numbered like the points", ddm and len(ddm["items"]) == n_dm == 11 and len(ddm["map"]["g"]) == 6 and await pg.locator(DM_ + "ul.pts > li .pn").count() == n_dm and await pg.locator(DM_ + '[data-a="dz-map"]').count() == 1)
            check(tag + "domain: the map and the explanations start closed", await pg.locator(DM_ + "[data-dz-map]").count() == 0 and await pg.locator(DM_ + "[data-dz]").count() == 0)
            await pg.click(DM_ + '[data-a="dz-all"]'); await pg.wait_for_timeout(150)
            check(tag + "domain: 'Deschide tot' opens the map and every explanation", await pg.locator(DM_ + "[data-dz]").count() == n_dm and await pg.locator(DM_ + "[data-dz-map]").count() == 1)
            check(tag + "domain: no C++ block (and so no 'Unde nu ține'): the module has no real C++ equivalent", not any(x.get("cpp") or x.get("nu") for x in ddm["items"]) and await pg.locator(DM_ + ".dz-cpp").count() == 0 and await pg.locator(DM_ + ".dz-nu").count() == 0)
            check(tag + "domain: Python examples (3, 4, 10, 11) are colored, ```text examples (2, 6, 7, 8, 9) are not, points 1 and 5 have no code", await pg.evaluate("(sel) => [3, 4, 10, 11].every(n => document.querySelectorAll(sel + ' [data-dz=\"' + (n - 1) + '\"] pre.code .tk-k').length > 0)", "#sheet-domain") and await pg.evaluate("(sel) => [2, 6, 7, 8, 9].every(n => { const b = [...document.querySelectorAll(sel + ' [data-dz=\"' + (n - 1) + '\"] pre.code')]; return b.length === 1 && b.every(e => e.querySelectorAll('[class^=tk-]').length === 0); })", "#sheet-domain") and await pg.evaluate("(sel) => [1, 5].every(n => document.querySelectorAll(sel + ' [data-dz=\"' + (n - 1) + '\"] pre.code').length === 0)", "#sheet-domain"))
            check(tag + "domain: no horizontal overflow with everything open at 360 px", await pg.evaluate("document.documentElement.scrollWidth <= 360"), await pg.evaluate("document.documentElement.scrollWidth"))
            check(tag + "domain: no code block sticks out of the sheet", await pg.evaluate(f"""() => {{ const r = document.querySelector('{DM_}.sheet-b').getBoundingClientRect(); return [...document.querySelectorAll('{DM_}pre.code')].every(e => e.getBoundingClientRect().right <= r.right + 1); }}"""))
            await pg.screenshot(path=str(SHOTS / f"desf_domain_{scheme}.png"), full_page=True)
            check(tag + "domain: opening everything leaves the saved progress alone, no console errors", await pg.evaluate("JSON.stringify(window.__prep.state())") == state0 and not pg.errs, pg.errs)
            await ctx.close()

        # ---------- TSX / C++ without Python coloring, glossary terms (fixture on frontend) ----------
        ctx, pg = await new_page(b, "light", SAMPLE)
        n = await pg.evaluate(FIXTURE)
        await open_sheet(pg, "frontend")
        F = "#sheet-frontend "
        await pg.click(F + '[data-a="dz-all"]'); await pg.wait_for_timeout(150)
        check("fixture: all explanations open on a second module", await pg.locator(F + "[data-dz]").count() == n)
        blocks = await pg.evaluate(f"[...document.querySelectorAll('{F}[data-dz=\"0\"] pre.code')].map(e => ({{ spans: e.querySelectorAll('[class^=tk-]').length, text: e.textContent }}))")
        check("TSX and C++ blocks are shown without Python coloring", len(blocks) == 2 and all(x["spans"] == 0 for x in blocks) and "class A" in blocks[0]["text"] and "class B" in blocks[1]["text"], blocks)
        check("glossary terms are tappable inside an explanation", await pg.locator(F + '[data-dz="0"] .term').count() >= 1 and await pg.evaluate(f"document.querySelector('{F}[data-dz=\"0\"] .term').textContent") == "GIL")
        await pg.click(F + '[data-dz="0"] .term'); await pg.wait_for_timeout(200)
        check("tapping a term opens its definition", await pg.evaluate("!document.querySelector('.gsheet').hidden"))
        await pg.keyboard.press("Escape"); await pg.wait_for_timeout(100)
        await ctx.close()

        # ---------- "Întreabă despre asta" ----------
        ctx, pg = await new_page(b, "light", SAMPLE)
        await open_sheet(pg, "oop")
        S = "#sheet-oop "
        await pg.click(S + '[data-a="dz"][data-i="6"]'); await pg.wait_for_timeout(100)
        await pg.click(S + ".ask-open"); await pg.wait_for_timeout(100)
        await pg.fill(S + "[data-ask]", "Mai explică o dată."); await pg.click(S + '[data-a="ask-send"]'); await pg.wait_for_timeout(300)
        asks = await pg.evaluate("window.__asks")
        data = await pg.evaluate("window.PREP.desf.oop")
        check("ask: the request carries the map and the explanations after the points", len(asks) == 1 and "Harta modulului" in asks[0] and data["map"]["p"].replace("`", "")[:40] in asks[0].replace("`", "") and asks[0].index("Puncte:") < asks[0].index("Harta modulului"), asks[0][:400] if asks else "")
        check("ask: every explanation is in the context, numbered like the points", all(f"Punctul {i + 1}:" in asks[0] for i in range(12)) and "Unde nu ține" in asks[0])
        check("ask: the answer shows and the open explanation stays open", "Răspuns scurt." in await pg.locator(S + ".ask").inner_text() and await pg.locator(S + '[data-dz="6"]').count() == 1)
        await pg.click(S + '[data-a="ask-close"]'); await pg.wait_for_timeout(100)
        await pg.evaluate(f"document.querySelector('{S}summary').click()"); await pg.wait_for_timeout(150)
        await open_sheet(pg, "aws")
        await pg.click("#sheet-aws .ask-open"); await pg.wait_for_timeout(100)
        await pg.fill("#sheet-aws [data-ask]", "Ce e GIL?"); await pg.click('#sheet-aws [data-a="ask-send"]'); await pg.wait_for_timeout(300)
        asks = await pg.evaluate("window.__asks")
        # contextul de dinainte, reconstruit din date: fișa, punctele, de evitat; același plafon de 3500 de caractere
        expected = await pg.evaluate("""() => { const m = window.PREP.modules.find(x => x.id === 'aws'), sh = window.PREP.sheets.aws;
            const lines = ['Fișa „' + m.name + '”: ' + sh.lead, 'Puncte: ' + sh.points.join(' ')]; if (sh.avoid) lines.push('De evitat la interviu: ' + sh.avoid.join(' '));
            const t = lines.join('\\n'); return t.length > 3500 ? t.slice(0, 3500) + '…' : t; }""")
        check("ask: a sheet without explanations sends exactly the same material as before", len(asks) == 2 and ("Material (contextul zonei de teorie):\n" + expected + "\n\n") in asks[1], asks[1][:400] if len(asks) > 1 else "")
        await ctx.close()
        await b.close()
    print("\n" + ("ALL PASS" if not fails else f"{len(fails)} FAILED: " + "; ".join(fails)))
    raise SystemExit(1 if fails else 0)

asyncio.run(main())
