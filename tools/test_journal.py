# Jurnalul de încercări în pagină: evenimentele ajung în IndexedDB, proiecția (S) se păstrează la reîncărcare, artifactul rămâne pe vechea cale.
# Proiecțiile, importul și îmbinarea sunt testate în Node (tools/unit/journal.test.mjs); aici: depozitul IndexedDB real, oglinda, migrarea cheii vechi, resetul și artifactul.
import asyncio, json, pathlib
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
PWA = (ROOT / "dist" / "app" / "index.html").as_uri()           # jurnalul în IndexedDB
ART = (ROOT / "dist" / "pregatire-onapsis.html").as_uri()      # artifactul: S în localStorage, ca până acum
fails = []
def check(name, ok, extra=""):
    print(("PASS " if ok else "FAIL ") + name + (" " + str(extra) if extra and not ok else ""))
    if not ok: fails.append(name)

ARTIFACT = "window.claude = { use: async () => null };"
LEGACY = """
if (!localStorage.getItem('onapsis-journal-v1') && !sessionStorage.getItem('seeded')) {
  sessionStorage.setItem('seeded', '1');
  localStorage.setItem('onapsis-prep-v1', JSON.stringify({ v: 1, r: 0,
    q: { 'py-01': { b: 3, n: 4, c: 3, l: 1, t: 1700000000000 } },
    o: { 'o-x': { b: 2, n: 2, s: 60, t: 1700000001000, mc: { 0: 2 }, m: [0] } },
    x: {}, k: { k1: { s: 'solo', t: 1700000002000 } }, s: {}, p: { 'g2026-11-12-due': { d: 1, t: 1700000003000 } }, l: { asyncio: { n: 3, t: 1700000004000 } },
    h: [{ id: 'h1700000005000', ts: 1700000005000, kind: 'mcq', mode: 'diag', title: 'Diagnostic', n: 5, c: 3, dur: 100 }], c: { d: '2026-12-01', h: 2, t: 1700000006000 } }));
}
"""

async def new_page(b, init=None, ctx=None, page=None):
    ctx = ctx or await b.new_context(viewport={"width": 390, "height": 844})
    if init: await ctx.add_init_script(init)
    pg = await ctx.new_page(); pg.errs = []
    pg.on("pageerror", lambda e: pg.errs.append(str(e)))
    pg.on("console", lambda m: pg.errs.append(m.text) if m.type == "error" and "fonts" not in m.text and "Failed to load resource" not in m.text else None)
    await pg.route("**/fonts.*", lambda r: r.abort())
    await pg.goto(page or PWA); await pg.wait_for_timeout(500)
    return ctx, pg

async def events(pg): return await pg.evaluate("window.__prep.journal().events()")
async def S(pg): return await pg.evaluate("window.__prep.state()")

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # ---- PWA / browser: IndexedDB ----
        ctx, pg = await new_page(b)
        check("a fresh start has an empty state and no events", (await S(pg))["q"] == {} and await events(pg) == [])
        await pg.evaluate("window.__prep.updQ('py-01', true, false, 2)")
        await pg.evaluate("window.__prep.updQ('py-01', false)")
        await pg.evaluate("window.__prep.updO('o-gil-1', 0.9)")
        st = await S(pg)
        check("updQ / updO change the projection at once", st["q"]["py-01"]["n"] == 2 and st["q"]["py-01"]["b"] == 1 and st["o"]["o-gil-1"]["b"] == 2, st["q"])
        ev = await events(pg)
        check("each answer is one event in IndexedDB, with the pick, the interval and the device", [e["form"] for e in ev] == ["q", "q", "o"] and ev[0]["result"] == {"ok": True, "pick": 2} and ev[0]["interval"] is None and ev[1]["interval"] >= 0 and ev[0]["dev"], ev)
        check("ids are unique and the events are ordered", len({e["id"] for e in ev}) == 3 and [e["t"] for e in ev] == sorted(e["t"] for e in ev))
        check("the unsent queue holds them all", len(await pg.evaluate("window.__prep.journal().unsent()")) == 3)
        check("the old synced key is not written any more", await pg.evaluate("localStorage.getItem('onapsis-prep-v1')") is None)
        mirror = json.loads(await pg.evaluate("localStorage.getItem('onapsis-journal-v1')"))
        check("the mirror has the projection and nothing waiting for the store", mirror["snap"]["state"]["q"]["py-01"]["n"] == 2 and mirror["tail"] == [], mirror["tail"])
        before = await S(pg)

        await pg.reload(); await pg.wait_for_timeout(500)
        check("a reload gives the same state (mirror, then snapshot)", await S(pg) == before)
        check("and the same events", [e["id"] for e in await events(pg)] == [e["id"] for e in ev])

        await pg.evaluate("localStorage.removeItem('onapsis-journal-v1')")
        await pg.reload(); await pg.wait_for_timeout(600)
        check("with the mirror gone, the IndexedDB snapshot brings the state back", await S(pg) == before)
        await pg.evaluate("window.__prep.updQ('py-02', true)")
        await pg.reload(); await pg.wait_for_timeout(500)
        check("new answers after that survive a reload too", (await S(pg))["q"]["py-02"]["n"] == 1)

        # click path: the diagnostic answer goes through the same event
        await pg.click('.tab[data-tab="quiz"]'); await pg.click('[data-a="mcq"][data-mode="diag"]'); await pg.click(".opt >> nth=0"); await pg.wait_for_timeout(400)
        ev2 = await events(pg)
        last = ev2[-1]
        check("answering on screen appends a q event with the chosen variant", last["type"] == "answer" and last["form"] == "q" and isinstance(last["result"]["ok"], bool) and "pick" in last["result"], last)

        # plan tick, settings, reset
        await pg.evaluate("window.__prep.journal().append({ type: 'cfg', d: '2026-12-05', h: 2 })")
        check("settings come from the projection", (await pg.evaluate("window.__prep.cfg()")) == {"d": "2026-12-05", "h": 2})
        await pg.click('.tab[data-tab="progress"]'); await pg.wait_for_timeout(200)
        n_before = len(await events(pg))
        await pg.click('[data-a="reset"]'); await pg.click('[data-a="reset"]'); await pg.wait_for_timeout(400)
        st = await S(pg)
        check("reset empties the projection and keeps the epoch", st["q"] == {} and st["o"] == {} and st["h"] == [] and st["r"] > 0 and "c" not in st, st)
        ev3 = await events(pg)
        check("the log only grew: a reset event, nothing deleted", len(ev3) == n_before + 1 and ev3[-1]["type"] == "reset")
        await pg.reload(); await pg.wait_for_timeout(500)
        check("a reload after a reset stays reset", (await S(pg))["q"] == {} and (await S(pg))["r"] == st["r"])
        check("no console errors", not pg.errs, pg.errs)
        await ctx.close()

        # ---- the old local state becomes imported events, once ----
        ctx, pg = await new_page(b, LEGACY)
        st = await S(pg)
        check("the legacy state shows up on the first paint", st["q"]["py-01"]["b"] == 3 and st["c"]["d"] == "2026-12-01" and st["l"]["asyncio"]["n"] == 3)
        await pg.wait_for_timeout(400)
        ev = await events(pg)
        check("it is written to the journal as imported events", len(ev) >= 6 and all(e.get("imported") for e in ev), len(ev))
        check("and queued to send (the server does not have the old state)", len(await pg.evaluate("window.__prep.journal().unsent()")) == len(ev))
        proj = await pg.evaluate("window.__prep.journal().events().then(e => e.length)")
        legacy_state = st
        await pg.reload(); await pg.wait_for_timeout(500)
        check("after a reload the state is the same and the old key is not reread", await S(pg) == legacy_state and len(await events(pg)) == proj)
        # the progress import (Progres › Importă) adds only what differs
        imp = {"v": 1, "r": 0, "q": {"py-01": {"b": 5, "n": 9, "c": 9, "l": 1, "t": 1800000000000}, "py-02": {"b": 2, "n": 1, "c": 1, "l": 1, "t": 1700000009000}}, "o": {}, "x": {}, "k": {}, "s": {}, "p": {}, "l": {}, "h": []}
        await pg.click('.tab[data-tab="progress"]'); await pg.click('[data-a="imp"]'); await pg.fill("#imp-t", json.dumps(imp)); await pg.click('[data-a="do-imp"]'); await pg.wait_for_timeout(500)
        st = await S(pg)
        check("importing a progress file merges by item (newer wins) and keeps the rest", st["q"]["py-01"]["b"] == 5 and st["q"]["py-02"]["n"] == 1 and st["o"]["o-x"]["b"] == 2 and st["c"]["d"] == "2026-12-01", st["q"])
        ev = await events(pg)
        check("as two new imported events", len(ev) == proj + 2 and all(e.get("imported") for e in ev), len(ev) - proj)
        await pg.reload(); await pg.wait_for_timeout(500)
        check("and they survive a reload", (await S(pg))["q"]["py-01"]["b"] == 5)
        check("no console errors (legacy)", not pg.errs, pg.errs)
        await ctx.close()

        # ---- no IndexedDB: the mirror carries the state ----
        ctx, pg = await new_page(b, "Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true });")
        await pg.evaluate("window.__prep.updQ('py-01', true)")
        check("without IndexedDB answers still change the state", (await S(pg))["q"]["py-01"]["n"] == 1)
        await pg.reload(); await pg.wait_for_timeout(500)
        check("and survive a reload through the mirror", (await S(pg))["q"]["py-01"]["n"] == 1)
        # the progress import (Progres › Importă) must work too: no store means no journal merge, so it goes through the projection and the mirror
        imp = {"v": 1, "r": 0, "q": {"py-09": {"b": 4, "n": 7, "c": 7, "l": 1, "t": 1800000000000}}, "o": {}, "x": {}, "k": {}, "s": {}, "p": {}, "l": {}, "h": []}
        await pg.click('.tab[data-tab="progress"]'); await pg.click('[data-a="imp"]'); await pg.fill("#imp-t", json.dumps(imp)); await pg.click('[data-a="do-imp"]'); await pg.wait_for_timeout(500)
        toast = await pg.evaluate("(document.getElementById('toast') || {}).textContent || ''")
        check("without IndexedDB the progress import works", (await S(pg))["q"]["py-09"]["b"] == 4 and "nu a mers" not in toast, toast)
        await pg.reload(); await pg.wait_for_timeout(500)
        check("and the imported progress survives a reload", (await S(pg))["q"]["py-09"]["b"] == 4 and (await S(pg))["q"]["py-01"]["n"] == 1)
        check("no console errors (no IndexedDB)", not pg.errs, pg.errs)
        await ctx.close()

        # ---- artifact: the old way (S in localStorage, no journal storage) ----
        ctx, pg = await new_page(b, ARTIFACT, page=ART)
        await pg.click('.tab[data-tab="quiz"]'); await pg.click('[data-a="mcq"][data-mode="diag"]'); await pg.click(".opt >> nth=0"); await pg.wait_for_timeout(400)
        st = await S(pg)
        saved = json.loads(await pg.evaluate("localStorage.getItem('onapsis-prep-v1')"))
        check("in the artifact an answer on screen still lands in S", len(st["q"]) == 1 and list(st["q"].values())[0]["n"] == 1, st["q"])
        check("saved under the old key, in the old shape", saved == st and saved["v"] == 1 and saved["h"] == [], saved)
        check("no journal key, no IndexedDB database, no events", await pg.evaluate("localStorage.getItem('onapsis-journal-v1')") is None and await events(pg) == [] and (await pg.evaluate("indexedDB.databases ? indexedDB.databases().then(d => d.length) : 0")) == 0)
        await pg.reload(); await pg.wait_for_timeout(500)
        check("a reload in the artifact restores S from the old key", (await S(pg)) == saved)
        await pg.click('.tab[data-tab="progress"]'); await pg.click('[data-a="reset"]'); await pg.click('[data-a="reset"]'); await pg.wait_for_timeout(300)
        st = await S(pg)
        check("reset in the artifact empties S and saves it", st["q"] == {} and st["r"] > 0 and json.loads(await pg.evaluate("localStorage.getItem('onapsis-prep-v1')"))["r"] == st["r"])
        check("no console errors (artifact)", not pg.errs, pg.errs)
        await ctx.close()

        # ---- the IndexedDB store, through its contract (same checks as memStore in Node) ----
        ctx, pg = await new_page(b)
        r = await pg.evaluate("""async () => {
          const st = Journal.idbStore('contract-' + Math.random()), out = {};
          const e = (t, id, extra) => Object.assign({ id, t, dev: 'x', type: 'answer', form: 'q', item: 'i', result: { ok: true } }, extra);
          out.empty = [await st.count(), (await st.load()).snapshot];
          await st.commit({ events: [e(5, 'b'), e(5, 'a'), e(9, 'c')], outbox: ['a', 'c'], snapshot: { v: 1, state: { q: 1 }, last: { t: 9, id: 'c' }, reset: null, n: 3 }, meta: { dev: 'x', seq: 3 } });
          out.loaded = await st.load();
          out.all = (await st.allEvents()).map(x => x.id);
          out.after = (await st.eventsAfter({ t: 5, id: 'a' })).map(x => x.id);
          out.afterAll = (await st.eventsAfter(null)).map(x => x.id);
          out.put = (await st.putEvents([{ ev: e(5, 'a'), ob: true }, { ev: e(7, 'd'), ob: true }, { ev: e(8, 'f'), ob: false }])).map(x => x.id);
          out.outbox = (await st.outbox()).map(x => x.id);
          await st.markSent(['a']);
          out.outbox2 = (await st.outbox()).map(x => x.id);
          out.count = await st.count();
          await st.clear();
          out.cleared = [await st.count(), (await st.load()).snapshot];
          return out;
        }""")
        check("idb: empty store", r["empty"] == [0, None], r["empty"])
        check("idb: commit stores events, snapshot and meta together", r["loaded"]["snapshot"]["n"] == 3 and r["loaded"]["meta"] == {"dev": "x", "seq": 3}, r["loaded"])
        check("idb: events come back ordered by time, then id", r["all"] == ["a", "b", "c"], r["all"])
        check("idb: eventsAfter(cursor) returns only what is after it", r["after"] == ["b", "c"] and r["afterAll"] == ["a", "b", "c"], (r["after"], r["afterAll"]))
        check("idb: putEvents returns only the new ones (idempotent)", r["put"] == ["d", "f"], r["put"])
        check("idb: the unsent queue is the events flagged for it", r["outbox"] == ["a", "d", "c"] or sorted(r["outbox"]) == ["a", "c", "d"], r["outbox"])
        check("idb: markSent removes from the queue", "a" not in r["outbox2"] and len(r["outbox2"]) == 2 and r["count"] == 5, r["outbox2"])
        check("idb: clear empties everything", r["cleared"] == [0, None])

        # the live journal on the real store: restart reads only what is after the snapshot, a late event rebuilds in order
        r = await pg.evaluate("""async () => {
          const name = 'live-' + Math.random(), out = {};
          const mk = (dev, clock) => Journal.create({ device: dev, clock: () => clock.t, store: Journal.idbStore(name) });
          const clock = { t: 1800000000000 };
          const a = mk('dev-a', clock); await a.load();
          for (let i = 0; i < 20; i++) { clock.t += 1000; a.append({ type: 'answer', form: 'q', item: 'q' + (i % 4), result: { ok: i % 3 !== 0 } }); }
          await a.flush();
          const b = mk('dev-a', clock); await b.load();
          out.same = JSON.stringify(b.state()) === JSON.stringify(a.state());
          const late = { id: 'dev-b.0000000001.00001', t: 1800000000500, dev: 'dev-b', type: 'answer', form: 'q', item: 'q0', result: { ok: false } };
          out.merge = await b.merge([late], { remote: true });
          const all = await b.events();
          out.rebuilt = JSON.stringify(b.state()) === JSON.stringify(Journal.project(all));
          out.n = all.length;
          out.unsent = (await b.unsent()).length;
          return out;
        }""")
        check("idb: a restarted journal has the same state", r["same"])
        check("idb: a late remote event forces a rebuild that matches a replay", r["merge"] == {"added": 1, "rebuilt": True} and r["rebuilt"] and r["n"] == 21, r)
        check("idb: remote events are not queued for sending", r["unsent"] == 20, r["unsent"])
        check("no console errors (contract)", not pg.errs, pg.errs)
        await ctx.close()
        await b.close()
    print("\nALL OK" if not fails else "\nFAILED: " + str(fails))
    raise SystemExit(1 if fails else 0)

asyncio.run(main())
