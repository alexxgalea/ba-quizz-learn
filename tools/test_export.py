# Exportul, importul și ștergerea jurnalului din Progres (tichetul 09), în pagină: butoanele „Exportă jurnalul” / „Importă jurnalul”, fișierul descărcat (formatul, textul lui Alex, fără secret),
# importul fără dubluri și fără server, erorile în română, importul vechi (text S) care merge în continuare, „Șterge jurnalul de pe server” în doi pași, „Retrimite jurnalul local”
# și ce vede al doilea dispozitiv după o ștergere (epoca). Serverul e un fals prin rutele Playwright, cu același contract ca server/ba_server (epoch, POST /events/purge).
import asyncio, json, pathlib, tempfile
from urllib.parse import urlparse, parse_qs
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
PWA = (ROOT / "dist" / "app" / "index.html").as_uri()
ART = (ROOT / "dist" / "pregatire-onapsis.html").as_uri()
SECRET = "s3cret-" + "x" * 30
URL = "https://fake.test"
TEXT = "Răspunsul meu scris, cu ăâîșț: GIL blochează thread-urile."
fails = []
def check(name, ok, extra=""):
    print(("PASS " if ok else "FAIL ") + name + (" " + str(extra) if extra and not ok else ""))
    if not ok: fails.append(name)

CORS = {"access-control-allow-origin": "*", "access-control-allow-headers": "authorization,content-type", "access-control-allow-methods": "GET,POST,OPTIONS"}

class FakeServer:
    """Același contract ca server/ba_server/routers/events.py și purge.py, în memorie."""
    def __init__(self): self.events = []; self.ids = set(); self.calls = []; self.secret = SECRET; self.epoch = "0"; self.purges = 0
    async def handle(self, route):
        req = route.request
        if req.method == "OPTIONS": return await route.fulfill(status=204, headers=CORS)
        self.calls.append((req.method, req.url))
        def ok(body, status=200): return route.fulfill(status=status, headers=CORS, content_type="application/json", body=json.dumps(body))
        if req.headers.get("authorization") != "Bearer " + self.secret: return await ok({"detail": "unauthorized"}, 401)
        u = urlparse(req.url)
        if req.method == "POST" and u.path == "/events":
            acc, dup = [], []
            for e in json.loads(req.post_data)["events"]:
                if e["id"] in self.ids: dup.append(e["id"]); continue
                self.ids.add(e["id"]); self.events.append(e); acc.append(e["id"])
            return await ok({"accepted": acc, "duplicates": dup, "cursor": len(self.events), "epoch": self.epoch})
        if req.method == "GET" and u.path == "/events":
            q = parse_qs(u.query); after = int(q.get("after", ["0"])[0]); limit = int(q.get("limit", ["100"])[0])
            page = self.events[after:after + limit]
            return await ok({"events": page, "cursor": after + len(page), "more": after + len(page) < len(self.events), "epoch": self.epoch})
        if req.method == "POST" and u.path == "/events/purge":
            try: body = json.loads(req.post_data or "null")
            except ValueError: body = None
            if body != {"confirm": "purge-all-events"}: return await ok({"detail": "confirm"}, 422)
            n = len(self.events); self.events = []; self.ids = set(); self.purges += 1; self.epoch = "e%d" % self.purges
            return await ok({"deleted": n, "epoch": self.epoch})
        return await route.fulfill(status=404, headers=CORS, body="{}")

async def new_device(b, srv, page=None):
    ctx = await b.new_context(viewport={"width": 390, "height": 844}, accept_downloads=True)
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
async def wait_status(pg, text, ms=6000):
    for _ in range(ms // 100):
        if text in await status(pg): return True
        await pg.wait_for_timeout(100)
    return False
async def q(pg): return await pg.evaluate("window.__prep.state().q")
async def n_events(pg): return await pg.evaluate("window.__prep.journal().events().then(e => e.length)")
async def text_of(pg, sel):
    return (await pg.inner_text(sel)).strip() if await pg.locator(sel).count() else ""
async def add_work(pg):
    await pg.evaluate("window.__prep.updQ('py-01', true); window.__prep.updQ('py-01', true); window.__prep.updQ('py-02', false)")
    await pg.evaluate("t => window.__prep.journal().append({ type: 'answer', form: 'o', item: 'o-gil-1', result: { p: 0.5 }, text: t })", TEXT)
async def export_file(pg, tmp, name):
    await to_progress(pg)
    async with pg.expect_download() as dl:
        await pg.click('[data-a="jexp"]')
    d = await dl.value
    path = tmp / name
    await d.save_as(str(path))
    return d.suggested_filename, path

async def main():
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="exp-"))
    async with async_playwright() as p:
        b = await p.chromium.launch()
        srv = FakeServer()

        # ---- butoanele există în Progres și exportul e un fișier ----
        ctxA, A = await new_device(b, srv)
        await to_progress(A)
        check("Progres has Exportă jurnalul and Importă jurnalul", await A.locator('[data-a="jexp"]').inner_text() == "Exportă jurnalul" and await A.locator('[data-a="jimp"]').inner_text() == "Importă jurnalul")
        check("the old export/import buttons are still there", await A.locator('[data-a="exp"]').count() == 1 and await A.locator('[data-a="imp"]').count() == 1)
        check("without a server there is no purge button", await A.locator('[data-a="jpurge"]').count() == 0)
        await add_work(A)
        await connect(A)
        check("synced", await wait_status(A, "La zi."), await status(A))
        name, path = await export_file(A, tmp, "a.json")
        raw = path.read_text(encoding="utf-8"); doc = json.loads(raw)
        check("the download is a dated .json file", name.startswith("jurnal-onapsis-") and name.endswith(".json"), name)
        check("format, version, device ids and count", doc["format"] == "ba-journal" and doc["version"] == 1 and doc["count"] == len(doc["events"]) == 4 and doc["device"] and doc["device"] in doc["devices"], {k: doc[k] for k in ("format", "version", "count", "device", "devices")})
        check("it holds Alex's own text", any(e.get("text") == TEXT for e in doc["events"]))
        check("it never holds the server secret or address", SECRET not in raw and URL not in raw and "fake.test" not in raw)
        check("the page says what was exported", "Jurnal exportat: 4 evenimente" in await text_of(A, "#jio-msg"), await text_of(A, "#jio-msg"))
        before_q = await q(A)

        # ---- import pe un dispozitiv gol, fără server: merge și dă aceeași proiecție ----
        ctxC, C = await new_device(b, srv)
        calls_before = len(srv.calls)
        await to_progress(C)
        await C.set_input_files("#jimp-f", str(path)); await C.wait_for_timeout(600)
        check("import on an empty device reports the new events", "Importat: 4 evenimente noi, 0 erau deja aici." in await text_of(C, "#jio-msg"), await text_of(C, "#jio-msg"))
        check("the projection is the same as on the exporting device", await q(C) == before_q, await q(C))
        check("nothing was sent (no server configured)", len(srv.calls) == calls_before, len(srv.calls) - calls_before)
        await C.set_input_files("#jimp-f", str(path)); await C.wait_for_timeout(500)
        check("importing the same file again adds nothing", "Importat: 0 evenimente noi, 4 erau deja aici." in await text_of(C, "#jio-msg") and await n_events(C) == 4, await text_of(C, "#jio-msg"))
        qn = await q(C)
        # fișier bun, plus unul stricat, plus unul care nu e jurnal
        bad = tmp / "bad.json"; bad.write_text(json.dumps({**doc, "events": doc["events"] + [{"id": "x"}]}), encoding="utf-8")
        await C.set_input_files("#jimp-f", str(bad)); await C.wait_for_timeout(400)
        check("a broken file is refused in Romanian and imports nothing", "Fișierul e stricat" in await text_of(C, "#jio-msg") and "Nu s-a importat nimic" in await text_of(C, "#jio-msg") and await n_events(C) == 4, await text_of(C, "#jio-msg"))
        junk = tmp / "junk.json"; junk.write_text("asta nu e json {", encoding="utf-8")
        await C.set_input_files("#jimp-f", str(junk)); await C.wait_for_timeout(400)
        check("a file that is not JSON is refused", "nu e un export valid" in await text_of(C, "#jio-msg"), await text_of(C, "#jio-msg"))
        newer = tmp / "newer.json"; newer.write_text(json.dumps({**doc, "version": 9}), encoding="utf-8")
        await C.set_input_files("#jimp-f", str(newer)); await C.wait_for_timeout(400)
        check("a file from a newer format asks for an update", "versiune mai nouă" in await text_of(C, "#jio-msg"), await text_of(C, "#jio-msg"))
        oldS = tmp / "olds.json"; oldS.write_text(json.dumps(await C.evaluate("window.__prep.state()")), encoding="utf-8")
        await C.set_input_files("#jimp-f", str(oldS)); await C.wait_for_timeout(400)
        check("an old S export in the file box points to the text box", "export de progres" in await text_of(C, "#jio-msg"), await text_of(C, "#jio-msg"))
        check("after all the refusals the data is the same", await q(C) == qn and await n_events(C) == 4)

        # ---- importul vechi (text S) merge în continuare ----
        ctxD, D = await new_device(b, srv)
        await to_progress(D)
        s_old = {"v": 1, "r": 0, "q": {"py-05": {"b": 3, "n": 2, "c": 2, "l": 1, "t": 1700000000000}}, "o": {}, "x": {}, "k": {}, "s": {}, "p": {}, "l": {}, "h": []}
        await D.click('[data-a="imp"]'); await D.fill("#imp-t", json.dumps(s_old)); await D.click('[data-a="do-imp"]'); await D.wait_for_timeout(500)
        check("the old text import still works", (await q(D)).get("py-05", {}).get("b") == 3, await q(D))
        await to_progress(D)
        await D.click('[data-a="imp"]'); await D.fill("#imp-t", raw); await D.click('[data-a="do-imp"]'); await D.wait_for_timeout(500)
        check("a journal file pasted in the text box is imported as a journal", "Importat: 4 evenimente noi" in await text_of(D, "#jio-msg") and (await q(D)).get("py-01", {}).get("b") == 3 and (await q(D)).get("py-05", {}).get("b") == 3, await text_of(D, "#jio-msg"))
        check("both are in the projection together", await n_events(D) >= 5)

        # ---- ștergerea de pe server, în doi pași ----
        await to_progress(A)
        check("with a server there are the resend and purge buttons", await A.locator('[data-a="jresend"]').count() == 1 and await A.locator('[data-a="jpurge"]').inner_text() == "Șterge jurnalul de pe server")
        check("the purge panel is closed until asked for", await A.locator("#jpurge-panel").count() == 0)
        ctxB, B = await new_device(b, srv)
        await connect(B); await wait_status(B, "La zi.")
        check("B has A's work", (await q(B)).get("py-01", {}).get("b") == 3)
        await to_progress(A)
        await A.click('[data-a="jpurge"]')
        check("one click only opens the confirmation", await A.locator("#jpurge-panel").count() == 1 and len(srv.events) == 4, len(srv.events))
        await A.click('[data-a="jpurge-go"]'); await A.wait_for_timeout(400)
        check("without the word nothing is deleted", len(srv.events) == 4 and srv.purges == 0)
        await A.fill("#jpurge-w", "nu"); await A.click('[data-a="jpurge-go"]'); await A.wait_for_timeout(400)
        check("a wrong word deletes nothing either", len(srv.events) == 4 and srv.purges == 0)
        await A.click('[data-a="jpurge-cancel"]')
        check("cancel closes the panel", await A.locator("#jpurge-panel").count() == 0 and len(srv.events) == 4)
        await A.click('[data-a="jpurge"]'); await A.fill("#jpurge-w", "Șterge"); await A.click('[data-a="jpurge-go"]'); await A.wait_for_timeout(800)
        check("typing the word (with diacritics) deletes the journal on the server", srv.purges == 1 and srv.events == [], (srv.purges, len(srv.events)))
        check("the page confirms with the count", "Jurnalul de pe server a fost șters (4 evenimente)" in await text_of(A, "#jsv-msg"), await text_of(A, "#jsv-msg"))
        check("the local copy stays intact", await q(A) == before_q and await n_events(A) == 4)
        check("the notice about the wiped server is shown", await A.locator("#jwiped").is_visible())
        check("A does not re-upload on its own", (await A.click('[data-a="srv-sync"]') or True) and await wait_status(A, "La zi.") and srv.events == [], len(srv.events))
        check("the purge request carried the explicit confirmation", any(m == "POST" and u.endswith("/events/purge") for m, u in srv.calls))

        # ---- al doilea dispozitiv ----
        await to_progress(B)
        await B.click('[data-a="srv-sync"]'); await B.wait_for_timeout(1000)
        check("B notices the wipe and shows the notice", await B.locator("#jwiped").is_visible())
        check("B keeps its data and sends nothing back", (await q(B)).get("py-01", {}).get("b") == 3 and srv.events == [], len(srv.events))
        await B.evaluate("window.__prep.updQ('py-09', true)"); await B.wait_for_timeout(2500)
        check("B's new answer reaches the server", len(srv.events) == 1 and srv.events[0]["item"] == "py-09", len(srv.events))
        await A.click('[data-a="srv-sync"]'); await A.wait_for_timeout(900)
        check("and A (which wiped) receives it, because its cursor was reset", (await q(A)).get("py-09", {}).get("b") == 2, await q(A))

        # ---- retrimite jurnalul local ----
        await to_progress(A)
        await A.click('[data-a="jresend"]'); await A.wait_for_timeout(1500)
        check("resend puts the whole local journal back on the server, once", len(srv.events) == 5 and len({e["id"] for e in srv.events}) == 5, len(srv.events))
        check("the notice goes away after resend", not await A.locator("#jwiped").is_visible())
        check("the resend message is shown", "puse în coada de trimis" in await text_of(A, "#jsv-msg"), await text_of(A, "#jsv-msg"))
        name2, path2 = await export_file(A, tmp, "a2.json")
        d2 = json.loads(path2.read_text(encoding="utf-8"))
        check("a second export after all this is complete and has no secret", d2["count"] == 5 and SECRET not in path2.read_text(encoding="utf-8"))

        # ---- erori la ștergere ----
        srv.secret = "altceva"
        await A.click('[data-a="jpurge"]'); await A.fill("#jpurge-w", "sterge"); await A.click('[data-a="jpurge-go"]'); await A.wait_for_timeout(800)
        check("a wrong secret says nothing was deleted", "Secret greșit" in await text_of(A, "#jsv-msg") and srv.purges == 1, await text_of(A, "#jsv-msg"))
        srv.secret = SECRET

        check("no console errors", not (A.errs + B.errs + C.errs + D.errs), A.errs + B.errs + C.errs + D.errs)
        for c in (ctxA, ctxB, ctxC, ctxD): await c.close()

        # ---- artifactul nu are butoanele de jurnal ----
        ctx = await b.new_context(viewport={"width": 390, "height": 844})
        await ctx.add_init_script("window.claude = { use: async () => null };")
        pg = await ctx.new_page(); pg.errs = []
        pg.on("pageerror", lambda e: pg.errs.append(str(e)))
        await pg.route("**/fonts.*", lambda r: r.abort())
        await pg.goto(ART); await pg.wait_for_timeout(500)
        await to_progress(pg)
        check("the artifact has no journal export / import / purge buttons", await pg.locator('[data-a="jexp"]').count() == 0 and await pg.locator('[data-a="jimp"]').count() == 0 and await pg.locator('[data-a="jpurge"]').count() == 0)
        check("but keeps the old export and import", await pg.locator('[data-a="exp"]').count() == 1 and await pg.locator('[data-a="imp"]').count() == 1)
        check("no page errors (artifact)", not pg.errs, pg.errs)
        await ctx.close()
        await b.close()
    print("\n%s" % ("ALL PASS" if not fails else "FAILED: " + ", ".join(fails)))
    raise SystemExit(1 if fails else 0)

asyncio.run(main())
