# Sincronizarea jurnalului în pagină (Progres › Sincronizare), cu un server fals în memorie care respectă contractul din server/README.md
# (POST /events idempotent după id, GET /events?after=&limit=, antet Authorization: Bearer). Logica pură e testată în Node (tools/unit/sync.test.mjs); aici: ecranul, linia de stare,
# două dispozitive reale (două contexte de browser), fără semnal, secret greșit, reset, și faptul că secretul nu ajunge în S, în jurnal sau în export.
import asyncio, json, pathlib
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
PWA = (ROOT / "dist" / "app" / "index.html").as_uri()
ART = (ROOT / "dist" / "pregatire-onapsis.html").as_uri()
SECRET = "s3cret-" + "x" * 30
URL = "https://fake.test"
fails = []
def check(name, ok, extra=""):
    print(("PASS " if ok else "FAIL ") + name + (" " + str(extra) if extra and not ok else ""))
    if not ok: fails.append(name)

CORS = {"access-control-allow-origin": "*", "access-control-allow-headers": "authorization,content-type", "access-control-allow-methods": "GET,POST,OPTIONS"}

class FakeServer:
    """Același contract ca server/ba_server/routers/events.py, în memorie."""
    def __init__(self): self.events = []; self.ids = set(); self.calls = []; self.down = False; self.secret = SECRET
    async def handle(self, route):
        req = route.request
        if req.method == "OPTIONS": return await route.fulfill(status=204, headers=CORS)
        self.calls.append((req.method, req.url))
        if self.down: return await route.abort("connectionrefused")
        if req.headers.get("authorization") != "Bearer " + self.secret:
            return await route.fulfill(status=401, headers=CORS, content_type="application/json", body='{"detail":"unauthorized"}')
        from urllib.parse import urlparse, parse_qs
        u = urlparse(req.url)
        if req.method == "POST" and u.path == "/events":
            evs = json.loads(req.post_data)["events"]
            acc, dup = [], []
            for e in evs:
                if e["id"] in self.ids: dup.append(e["id"]); continue
                self.ids.add(e["id"]); self.events.append(e); acc.append(e["id"])
            return await route.fulfill(status=200, headers=CORS, content_type="application/json", body=json.dumps({"accepted": acc, "duplicates": dup, "cursor": len(self.events)}))
        if req.method == "GET" and u.path == "/events":
            q = parse_qs(u.query); after = int(q.get("after", ["0"])[0]); limit = int(q.get("limit", ["100"])[0])
            page = self.events[after:after + limit]
            return await route.fulfill(status=200, headers=CORS, content_type="application/json", body=json.dumps({"events": page, "cursor": after + len(page), "more": after + len(page) < len(self.events)}))
        return await route.fulfill(status=404, headers=CORS, body="{}")

async def new_device(b, srv, page=None):
    ctx = await b.new_context(viewport={"width": 390, "height": 844})
    await ctx.route(URL + "/**", srv.handle)
    pg = await ctx.new_page(); pg.errs = []
    pg.on("pageerror", lambda e: pg.errs.append(str(e)))
    pg.on("console", lambda m: pg.errs.append(m.text) if m.type == "error" and "fonts" not in m.text and "Failed to load resource" not in m.text and "fake.test" not in m.text and "ERR_" not in m.text else None)
    await pg.route("**/fonts.*", lambda r: r.abort())
    await pg.goto(page or PWA); await pg.wait_for_timeout(500)
    return ctx, pg

async def status(pg): return (await pg.inner_text("#jsync-l")).strip()
async def to_progress(pg): await pg.click('.tab[data-tab="progress"]'); await pg.wait_for_timeout(200)
async def connect(pg, url=URL, secret=SECRET):
    await to_progress(pg)
    await pg.fill("#srv-url", url); await pg.fill("#srv-secret", secret)
    await pg.click('[data-a="srv-save"]'); await pg.wait_for_timeout(800)
async def box(pg, item): return await pg.evaluate("id => (window.__prep.state().q[id] || {}).b", item)
async def wait_status(pg, text, ms=6000):
    for _ in range(ms // 100):
        if text in await status(pg): return True
        await pg.wait_for_timeout(100)
    return False

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        srv = FakeServer()

        # ---- un dispozitiv, fără server configurat ----
        ctxA, A = await new_device(b, srv)
        await to_progress(A)
        check("Progres has a Sincronizare section", await A.locator("#sync-card h3").inner_text() == "Sincronizare")
        check("without a server the status says it is not configured", "nu e configurată" in await status(A), await status(A))
        await A.evaluate("window.__prep.updQ('py-01', true); window.__prep.updQ('py-01', true); window.__prep.updQ('py-02', false)")
        await A.wait_for_timeout(2200)
        check("answers still work and nothing is sent", await box(A, "py-01") == 3 and srv.calls == [], srv.calls)

        # ---- se introduc adresa și secretul ----
        await connect(A)
        check("the status turns to up to date after the first sync", await wait_status(A, "La zi."), await status(A))
        check("the server received the three answers", len(srv.events) == 3 and all(e["type"] == "answer" for e in srv.events), len(srv.events))
        cfg = json.loads(await A.evaluate("localStorage.getItem('onapsis-server-v1')"))
        check("the pair is kept as JSON {url, secret} under onapsis-server-v1", cfg == {"url": URL, "secret": SECRET}, cfg)
        await to_progress(A)
        check("the secret field does not show the secret back", SECRET not in await A.content())
        check("there is a manual sync button", await A.locator('[data-a="srv-sync"]').count() == 1)
        st = json.dumps(await A.evaluate("window.__prep.state()")); jr = json.dumps(await A.evaluate("window.__prep.journal().events()"))
        check("the secret is not in S nor in the journal", SECRET not in st and SECRET not in jr)
        await A.click('[data-a="exp"]'); exp = await A.input_value("#exp-t")
        check("nor in the export", SECRET not in exp)

        # ---- al doilea dispozitiv ----
        ctxB, B = await new_device(b, srv)
        await connect(B)
        check("B shows up to date", await wait_status(B, "La zi."), await status(B))
        check("an answer from A appears on B with the same box", await box(B, "py-01") == 3 and await box(B, "py-02") == 1, await B.evaluate("window.__prep.state().q"))
        check("B queued nothing back", await B.evaluate("window.__prep.journal().unsent().then(u => u.length)") == 0)

        # ---- fără semnal, pe ambele dispozitive ----
        srv.down = True
        await A.evaluate("window.__prep.updQ('py-03', true)")
        await B.evaluate("window.__prep.updQ('py-04', true); window.__prep.updQ('py-04', true)")
        await A.click('[data-a="srv-sync"]'); await B.click('[data-a="srv-sync"]')
        check("A says no signal and counts the unsent", await wait_status(A, "Fără semnal") and "1 netrimis" in await status(A), await status(A))
        check("B counts two", await wait_status(B, "Fără semnal") and "2 netrimise" in await status(B), await status(B))
        check("the app keeps working offline", await box(A, "py-03") == 2 and await box(B, "py-04") == 3)
        await A.click('.tab[data-tab="plan"]'); await A.wait_for_timeout(200)
        check("the other screens are not blocked", await A.locator("#main").inner_text() != "")
        await to_progress(A)
        srv.down = False
        await A.click('[data-a="srv-sync"]'); await B.click('[data-a="srv-sync"]')
        check("after reconnect A is up to date", await wait_status(A, "La zi."), await status(A))
        check("and B", await wait_status(B, "La zi."), await status(B))
        await A.click('[data-a="srv-sync"]'); await A.wait_for_timeout(600)
        check("both offline answers are on both devices", await box(A, "py-04") == 3 and await box(B, "py-03") == 2, (await A.evaluate("window.__prep.state().q")))
        check("the server holds every event once", len(srv.events) == 3 + 1 + 2 and len({e["id"] for e in srv.events}) == 6, len(srv.events))

        # ---- reset ----
        await A.click('[data-a="reset"]'); await A.click('[data-a="reset"]'); await A.wait_for_timeout(300)
        check("A is reset", (await A.evaluate("window.__prep.state().q")) == {})
        await A.click('[data-a="srv-sync"]'); await wait_status(A, "La zi.")
        await B.click('[data-a="srv-sync"]'); await B.wait_for_timeout(800)
        check("the reset applies on B", (await B.evaluate("window.__prep.state().q")) == {} and await B.evaluate("window.__prep.state().r") > 0)

        # ---- secret greșit ----
        await A.evaluate("window.__prep.updQ('py-05', true)")
        await to_progress(A)
        await A.fill("#srv-url", URL); await A.fill("#srv-secret", "gresit-" + "y" * 30); await A.click('[data-a="srv-save"]')
        check("a wrong secret shows in the status", await wait_status(A, "Secret greșit"), await status(A))
        check("without losing anything", await box(A, "py-05") == 2 and len(await A.evaluate("window.__prep.journal().unsent()")) >= 1)
        await to_progress(A); n_calls = len(srv.calls); await A.wait_for_timeout(2500)
        check("and without retrying in a loop", len(srv.calls) == n_calls, len(srv.calls) - n_calls)
        await A.fill("#srv-secret", SECRET); await A.click('[data-a="srv-save"]')
        check("the right secret recovers", await wait_status(A, "La zi."), await status(A))
        check("with the answer sent", any(e.get("item") == "py-05" for e in srv.events))

        # ---- ce vine de la server se vede pe ecran fără să atingi nimic ----
        await to_progress(B)
        kpi_before = await B.inner_text(".kpis")
        await A.evaluate("window.__prep.updQ('py-07', true); window.__prep.updQ('py-08', true)"); await A.wait_for_timeout(2500)
        await B.click('[data-a="srv-sync"]'); await B.wait_for_timeout(900)
        check("answers pulled from the server repaint the screen the user is on", await B.inner_text(".kpis") != kpi_before, kpi_before)
        await B.fill("#srv-secret", "ceva-scris-de-mana")
        await B.evaluate("window.__prep.sync().syncNow()"); await B.wait_for_timeout(300)
        await A.evaluate("window.__prep.updQ('py-09', true)"); await A.wait_for_timeout(2500)
        await B.focus("#srv-secret"); await B.evaluate("window.__prep.sync().syncNow()"); await B.wait_for_timeout(900)
        check("but a field being typed in is not wiped by the repaint", await B.input_value("#srv-secret") == "ceva-scris-de-mana")

        # ---- repornire: cursorul se păstrează ----
        await B.reload(); await B.wait_for_timeout(1200)
        before = len(srv.calls)
        await A.evaluate("window.__prep.updQ('py-06', true)"); await A.wait_for_timeout(2500)
        await B.click('.tab[data-tab="progress"]'); await B.click('[data-a="srv-sync"]'); await B.wait_for_timeout(800)
        check("B gets the new answer after a restart", await box(B, "py-06") == 2)
        gets = [u for m, u in srv.calls[before:] if m == "GET"]
        check("the pull starts from the kept cursor, not from zero", gets and all("after=0" not in u for u in gets), gets)

        # ---- ștergerea serverului ----
        await B.click('[data-a="srv-del"]'); await B.wait_for_timeout(500)
        check("removing the server returns the status to not configured", "nu e configurată" in await status(B) and await B.evaluate("localStorage.getItem('onapsis-server-v1')") is None)

        check("no console errors", not A.errs and not B.errs, A.errs + B.errs)
        await ctxA.close(); await ctxB.close()

        # ---- artifactul rămâne pe vechea cale ----
        ctx = await b.new_context(viewport={"width": 390, "height": 844})
        await ctx.add_init_script("window.claude = { use: async () => null };")
        pg = await ctx.new_page(); pg.errs = []
        pg.on("pageerror", lambda e: pg.errs.append(str(e)))
        await pg.route("**/fonts.*", lambda r: r.abort())
        await pg.goto(ART); await pg.wait_for_timeout(500)
        await to_progress(pg)
        check("the artifact has no Sincronizare section and no server code path", await pg.locator("#sync-card").count() == 0 and await pg.evaluate("window.__prep.sync()") is None)
        check("no page errors (artifact)", not pg.errs, pg.errs)
        await ctx.close()
        await b.close()
    print("\n%s" % ("ALL PASS" if not fails else "FAILED: " + ", ".join(fails)))
    raise SystemExit(1 if fails else 0)

asyncio.run(main())
