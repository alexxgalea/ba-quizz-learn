# Checks the written interviewer on oral cards: follow-up cap, 1 / 0.5 scoring, memory between sessions, rewrite step, errors and stop.
# `window.claude.sample` is scripted: every call is recorded (kind, tier, cache, prompt) and answers come from per-kind queues.
import asyncio, pathlib, json
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = (ROOT / "dist" / "pregatire-onapsis.html").as_uri()
SHOTS = ROOT / "shots"
SHOTS.mkdir(exist_ok=True)

# Queue items: a string (the reply text), {err: code} (rejects), or "HANG" (never answers; rejects `cancelled` on abort).
SAMPLE = """
window.__calls = []; window.__q = { turn: [], verdict: [], grade: [] };
const sample = (prompt, opts) => new Promise((res, rej) => {
  const kind = prompt.includes('"act":"followup"') ? 'turn' : prompt.includes('"spontan"') ? 'verdict' : 'grade';
  window.__calls.push({ kind, prompt, tier: opts && opts.modelTier, cache: opts && opts.cache });
  const q = window.__q[kind]; let item = q.length ? q.shift() : null;
  const n = (prompt.match(/^\\d+\\. /gm) || []).length;
  if (item === null) item = kind === 'turn' ? JSON.stringify({ act: 'done' })
    : kind === 'verdict' ? JSON.stringify({ covered: Array(n).fill('spontan'), missing: [], wrong: [], feedback: 'Complet.' })
    : JSON.stringify({ covered: Array(n).fill(true), missing: [], wrong: [], feedback: 'ok' });
  if (item === 'HANG') { const sg = opts && opts.signal; if (sg) sg.addEventListener('abort', () => rej({ code: 'cancelled', message: 'stop' })); return; }
  if (item && item.err) { rej({ code: item.err, message: 'x' }); return; }
  setTimeout(() => res({ text: item, truncated: false }), 20);
});
window.claude = { use: async name => (name === 'sample' ? sample : null) };
"""

fails = []
def check(name, ok, extra=""):
    print(("PASS " if ok else "FAIL ") + name + (" " + str(extra) if extra and not ok else ""))
    if not ok: fails.append(name)

ANS = "GIL-ul lasă un singur thread să execute bytecode, deci pentru CPU-bound folosesc procese."
FU1 = "De ce nu ajută threadurile la un task CPU-bound?"
FU2 = "Și dacă taskul e I/O-bound?"
def tj(**k): return json.dumps(k, ensure_ascii=False)

async def calls(pg): return await pg.evaluate("window.__calls")
async def queue(pg, kind, items): await pg.evaluate("([k, v]) => { window.__q[k].push(...v); }", [kind, items])

async def fresh(pg):
    await pg.goto(PAGE); await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(400)
    await pg.evaluate("window.__calls.length = 0; for (const k in window.__q) window.__q[k].length = 0")

async def seed(pg, cid, entry):
    await pg.evaluate("([id, e]) => { const s = window.__prep.state(); s.o[id] = e; window.__prep.setState(s); }", [cid, entry])

async def start_gil(pg):
    await pg.click('.tab[data-tab="oral"]'); await pg.wait_for_timeout(100)
    await pg.click('[data-a="oral-mod"][data-m="gil"]'); await pg.wait_for_selector('#ans-t', timeout=3000)
    return await pg.evaluate("""() => {
      const q = document.querySelector('.icard-q').textContent.replace(/\\s+/g, ' ').trim();
      const c = window.PREP.oral.find(c => c.m === 'gil' && c.q.replace(/`/g, '').replace(/\\s+/g, ' ').trim() === q);
      return { id: c.id, k: c.k, n: c.k.length };
    }""")

async def answer_and_start(pg, text=ANS):
    await pg.fill('#ans-t', text); await pg.click('[data-a="iv-start"]')

def fmtn(x): return str(round(x * 10) / 10).replace(".", ",")

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 360, "height": 740}, device_scale_factor=2)
        await ctx.add_init_script(SAMPLE)
        pg = await ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" and "fonts" not in m.text and "Failed to load resource" not in m.text else None)
        await pg.route("**/fonts.*", lambda r: r.abort())
        await pg.goto(PAGE); await pg.wait_for_timeout(400)

        # 0) pure logic
        L = await pg.evaluate("""() => {
          const T = window.__prep, o = {};
          o.fu = JSON.stringify(T.parseTurn('{"act":"followup","say":"  De ce?  "}'));
          o.done = JSON.stringify(T.parseTurn('```json\\n{"act":"done"}\\n```'));
          o.prose = JSON.stringify(T.parseTurn('Sigur: {"act":"followup","say":"Cum?"} gata'));
          o.badAct = T.parseTurn('{"act":"altceva","say":"x"}'); o.noSay = T.parseTurn('{"act":"followup","say":"  "}'); o.garbage = T.parseTurn('nu e json'); o.empty = T.parseTurn('');
          o.longSay = T.parseTurn(JSON.stringify({ act: 'followup', say: 'x'.repeat(900) })).say.length;
          o.v = JSON.stringify(T.parseIvVerdict('{"covered":["spontan","dupa","nu"],"missing":["a"],"wrong":[],"feedback":"f"}', 3));
          o.vLen = T.parseIvVerdict('{"covered":["spontan"]}', 2); o.vBool = T.parseIvVerdict('{"covered":[true,false]}', 2); o.vVal = T.parseIvVerdict('{"covered":["da","nu"]}', 2); o.vGarbage = T.parseIvVerdict('x', 1);
          o.score = [T.ivScore(['spontan', 'dupa', 'nu', 'nu']), T.ivScore(['spontan', 'spontan']), T.ivScore(['dupa', 'dupa']), T.ivScore([])];
          const c = { id: 'x', m: 'gil', q: 'Q?', k: ['p1', 'p2', 'p3'], model: 'M' };
          const iv = { turns: [{ who: 'cand', text: 'răspuns 1' }, { who: 'int', text: 'de ce?' }, { who: 'cand', text: 'răspuns 2' }], fu: 1 };
          o.tp = T.ivTurnPrompt(c, iv, { m: [1, 2] }); o.tp0 = T.ivTurnPrompt(c, iv, null);
          o.tpBeh = T.ivTurnPrompt(Object.assign({}, c, { m: 'behav' }), iv, null);
          o.vp = T.ivVerdictPrompt(c, iv); o.vpOpen = T.ivVerdictPrompt(c, { turns: iv.turns.slice(0, 2), fu: 1 });
          o.max = T.IV_MAX;
          return o;
        }""")
        check("parseTurn: followup trimmed, done fenced, prose around JSON", '"say":"De ce?"' in L["fu"] and '"act":"done"' in L["done"] and '"say":"Cum?"' in L["prose"], L)
        check("parseTurn rejects unknown act, empty say, garbage, empty", L["badAct"] is None and L["noSay"] is None and L["garbage"] is None and L["empty"] is None)
        check("parseTurn caps the question at 400 characters", L["longSay"] == 400, L["longSay"])
        check("parseIvVerdict accepts spontan / dupa / nu", '"covered":["spontan","dupa","nu"]' in L["v"], L["v"])
        check("parseIvVerdict rejects wrong length, booleans, unknown values, garbage", L["vLen"] is None and L["vBool"] is None and L["vVal"] is None and L["vGarbage"] is None)
        check("ivScore: 1 spontan, 0.5 after a question, 0 otherwise", L["score"] == [0.375, 1, 0.5, 0], L["score"])
        check("turn prompt: transcript with roles, follow-ups left, profile, JSON format", all(x in L["tp"] for x in ["Candidat (răspuns inițial): răspuns 1", "Intervievator (întrebare de continuare): de ce?", "Candidat (răspuns la întrebare): răspuns 2", "rămase: 1", "Celery", '"act":"followup"']), L["tp"])
        check("turn prompt: memory names the missed points only when present", "Data trecută candidatul a ratat: „p2”; „p3”" in L["tp"] and "p1”" not in L["tp"].split("Data trecută")[1].split("\n")[0] and "Data trecută" not in L["tp0"])
        check("turn prompt: STAR only for behavioural cards", "STAR" in L["tpBeh"] and "STAR" not in L["tp0"])
        check("verdict prompt: labels the three values, the dialog and an unanswered last question", all(x in L["vp"] for x in ['"spontan"', "dupa", "Candidat (răspuns la întrebare): răspuns 2"])  and "înainte ca ultima întrebare să primească răspuns" in L["vpOpen"] and "înainte ca ultima întrebare să primească răspuns" not in L["vp"])
        check("IV_MAX is 2", L["max"] == 2)

        # 1) full dialog: two follow-ups, then the verdict without another question; 1 / 0.5 scoring; memory saved
        await fresh(pg)
        card = await start_gil(pg); n = card["n"]
        check("with sample: the interviewer button is primary, the direct check secondary", await pg.locator('[data-a="iv-start"].primary').count() == 1 and await pg.locator('[data-a="oral-ai"].primary').count() == 0 and "direct" in await pg.inner_text('[data-a="oral-ai"]'))
        await pg.screenshot(path=str(SHOTS / "iv1-ask.png"))
        await pg.fill('#ans-t', "scurt"); await pg.click('[data-a="iv-start"]'); await pg.wait_for_timeout(150)
        check("too-short answer starts nothing", len(await calls(pg)) == 0 and await pg.locator('#ans-t').count() == 1)
        await queue(pg, "turn", [tj(act="followup", say=FU1), tj(act="followup", say=FU2)])
        await queue(pg, "verdict", [tj(covered=["spontan", "dupa"] + ["nu"] * (n - 2), missing=["costul proceselor"], wrong=[], feedback="Ai acoperit mecanismul.")])
        await answer_and_start(pg)
        await pg.wait_for_selector('.iv-m.int', timeout=3000)
        c0 = (await calls(pg))[0]
        check("first call: follow-up question, quick tier, no cache, carries the answer", c0["kind"] == "turn" and c0["tier"] == "quick" and c0["cache"] is False and ANS in c0["prompt"] and "rămase: 2" in c0["prompt"], c0["tier"])
        check("dialog shows the question and the counter 1/2", FU1 in await pg.inner_text('.iv-m.int') and "1/2" in await pg.inner_text('.iv h3 + .chip'))
        check("dialog offers send, don't know, finish", all([await pg.locator(f'[data-a="{a}"]').count() == 1 for a in ["iv-send", "iv-dunno", "iv-finish"]]))
        await pg.fill('#iv-t', ""); await pg.click('[data-a="iv-send"]'); await pg.wait_for_timeout(100)
        check("empty reply is not sent", len(await calls(pg)) == 1)
        REPLY = "Pentru că GIL-ul serializează execuția bytecode-ului, deci threadurile nu rulează în paralel."
        await pg.screenshot(path=str(SHOTS / "iv2-dialog.png"), full_page=True)
        await pg.fill('#iv-t', REPLY); await pg.click('[data-a="iv-send"]')
        await pg.wait_for_function("document.querySelectorAll('.iv-m.int').length === 2", timeout=3000)
        c1 = (await calls(pg))[1]
        check("second call: sees the first question and the reply, 1 left", c1["kind"] == "turn" and FU1 in c1["prompt"] and REPLY in c1["prompt"] and "rămase: 1" in c1["prompt"])
        check("counter shows 2/2", "2/2" in await pg.inner_text('.iv h3 + .chip'))
        REPLY2 = "Da, la I/O-bound threadurile merg, pentru că GIL-ul se eliberează cât așteaptă rețeaua."
        await pg.fill('#iv-t', REPLY2); await pg.click('[data-a="iv-send"]'); await pg.wait_for_selector('.ai-v', timeout=3000)
        cs = await calls(pg)
        check("after the 2nd follow-up the verdict comes with no third question", [c["kind"] for c in cs] == ["turn", "turn", "verdict"], [c["kind"] for c in cs])
        check("verdict call: default tier, no cache, labelled dialog", cs[2]["tier"] == "default" and cs[2]["cache"] is False and "Candidat (răspuns la întrebare): " + REPLY2 in cs[2]["prompt"])
        pressed = await pg.eval_on_selector_all('.kp-i', "els => els.map(e => e.getAttribute('aria-pressed') === 'true')")
        check("points pre-ticked: spontan and dupa, not nu", pressed == [True, True] + [False] * (n - 2), pressed)
        check("only the 'after a question' point is marked", await pg.locator('.kp-i .chip.warn').count() == 1 and await pg.locator('.kp-i:nth-child(2) .chip.warn').count() == 1)
        check("save button shows 1,5/n", ("(" + fmtn(1.5) + "/" + str(n) + ")") in await pg.inner_text('[data-a="oral-save"]'), await pg.inner_text('[data-a="oral-save"]'))
        check("verdict titled Claude; dialog kept in a collapsed section", "Verdict Claude" in await pg.inner_text('.ai-v') and FU1 in (await pg.text_content('details.model .iv-t') or ""))
        check("first time on the card: no comparison with last time", await pg.locator('.iv-cmp').count() == 0)
        check("rewrite is offered but not forced", await pg.locator('[data-a="rw-open"]').count() == 1 and await pg.locator('#rw-t').count() == 0)
        await pg.screenshot(path=str(SHOTS / "iv3-review.png"), full_page=True)
        await pg.click('[data-a="oral-save"]'); await pg.wait_for_timeout(100)
        e = (await pg.evaluate("window.__prep.state().o"))[card["id"]]
        check("score = (1 + 0.5) / n", e["s"] == round(1.5 / n * 100), e)
        check("memory: missed points saved as indexes, no rewrite saved", e.get("m") == list(range(1, n)) and "a" not in e and set(e) <= {"b", "n", "s", "t", "m"}, e)
        check("next card starts clean (ask phase, empty answer, interviewer offered)", await pg.input_value('#ans-t') == "" and await pg.locator('[data-a="iv-start"]').count() == 1 and await pg.locator('.iv').count() == 0)
        await pg.click('[data-a="quit"]'); await pg.click('[data-a="quit"]'); await pg.wait_for_timeout(100)
        if await pg.locator('[data-a="close-result"]').count(): await pg.click('[data-a="close-result"]')

        # 2) memory aimed first; "done" goes straight to the verdict; comparison with last time; rewrite step
        await fresh(pg)
        A = await pg.evaluate("(() => { const c = window.PREP.oral.find(c => c.m === 'gil'); return { id: c.id, k: c.k, n: c.k.length }; })()")
        OLD = "Versiune veche a mea, scrisă data trecută."
        await seed(pg, A["id"], {"b": 1, "n": 1, "s": 30, "t": 1000, "m": [1, 2], "a": OLD})
        card = await start_gil(pg)
        check("the card with memory comes first", card["id"] == A["id"], card["id"])
        await queue(pg, "turn", [tj(act="done")])
        await answer_and_start(pg)
        await pg.wait_for_selector('.ai-v', timeout=3000)
        cs = await calls(pg)
        check("'done' on the first question goes to the verdict (turn, then verdict)", [c["kind"] for c in cs] == ["turn", "verdict"], [c["kind"] for c in cs])
        mline = [l for l in cs[0]["prompt"].split("\n") if "Data trecută" in l]
        check("turn prompt carries last time's missed points, not the covered one", len(mline) == 1 and A["k"][1] in mline[0] and A["k"][2] in mline[0] and A["k"][0] not in mline[0], mline)
        cmp_ = await pg.inner_text('.iv-cmp') if await pg.locator('.iv-cmp').count() else ""
        check("review compares with last time (30% → 100%)", "30%" in cmp_ and "100%" in cmp_, cmp_)
        check("no 'after a question' marker when everything was spontaneous", await pg.locator('.kp-i .chip.warn').count() == 0)
        await pg.click('[data-a="rw-open"]'); await pg.wait_for_selector('#rw-t')
        check("rewrite step shows last time's good version, collapsed", OLD in (await pg.text_content('.rw details.model p') or ""))
        n = A["n"]; before = len(await calls(pg))
        await pg.click('[data-a="rw-check"]'); await pg.wait_for_timeout(100)
        check("empty rewrite sends nothing", len(await calls(pg)) == before)
        RW = "GIL-ul permite un singur thread să ruleze bytecode odată; pentru CPU-bound folosesc procese, pentru I/O threads sau asyncio."
        await queue(pg, "grade", [json.dumps({"covered": [True, True] + [False] * (n - 2), "missing": ["costul proceselor"], "wrong": [], "feedback": ""})])
        await pg.fill('#rw-t', RW); await pg.click('[data-a="rw-check"]'); await pg.wait_for_selector('.rw .ai-l', timeout=3000)
        check("low rewrite: shows what is missing, nothing kept", "2/" + str(n) in await pg.inner_text('.rw .ai-l') and "costul proceselor" in await pg.inner_text('.rw .ai-l'))
        await pg.fill('#rw-t', RW + " Costul proceselor e pickling-ul."); await pg.click('[data-a="rw-check"]'); await pg.wait_for_selector('.rw .chip.ok', timeout=3000)
        check("good rewrite (≥80%): confirmed", str(n) + "/" + str(n) in await pg.inner_text('.rw .chip.ok'))
        g = [c for c in await calls(pg) if c["kind"] == "grade"]
        check("rewrite is checked with the plain verifier, once per click", len(g) == 2 and RW in g[1]["prompt"])
        await pg.fill('#rw-t', RW + " Costul proceselor e pickling-ul și memoria separată."); await pg.wait_for_timeout(50)
        check("editing the text clears the confirmation", await pg.locator('.rw .chip.ok').count() == 0)
        await pg.click('[data-a="rw-check"]'); await pg.wait_for_selector('.rw .chip.ok', timeout=3000)
        RW2 = await pg.input_value('#rw-t')
        pressed = await pg.eval_on_selector_all('.kp-i', "els => els.map(e => e.getAttribute('aria-pressed') === 'true')")
        check("rewrite does not touch the ticks", all(pressed))
        await pg.screenshot(path=str(SHOTS / "iv4-rewrite.png"), full_page=True)
        await pg.click('[data-a="oral-save"]'); await pg.wait_for_timeout(100)
        e = (await pg.evaluate("window.__prep.state().o"))[A["id"]]
        check("rewrite ≥80% saved as 'a'; score 100%; missed list cleared", e["a"] == RW2 and e["s"] == 100 and "m" not in e, e)

        # 3) "Nu știu", finishing with a half-written reply, a low rewrite saves nothing
        await fresh(pg)
        card = await start_gil(pg); n = card["n"]
        await queue(pg, "turn", [tj(act="followup", say=FU1), tj(act="followup", say=FU2)])
        await queue(pg, "verdict", [tj(covered=["spontan"] * 2 + ["nu"] * (n - 2), missing=["x"], wrong=["y"], feedback="f")])
        await answer_and_start(pg); await pg.wait_for_selector('.iv-m.int', timeout=3000)
        await pg.click('[data-a="iv-dunno"]')
        await pg.wait_for_function("document.querySelectorAll('.iv-m.int').length === 2", timeout=3000)
        c1 = (await calls(pg))[1]
        check("'Nu știu' is sent as the candidate's reply", "Candidat (răspuns la întrebare): Nu știu." in c1["prompt"])
        DRAFT = "Cred că asyncio, dar nu sunt sigur"
        await pg.fill('#iv-t', DRAFT); await pg.click('[data-a="iv-finish"]'); await pg.wait_for_selector('.ai-v', timeout=3000)
        cs = await calls(pg)
        check("finish skips the next question, goes to the verdict and keeps the started reply", [c["kind"] for c in cs] == ["turn", "turn", "verdict"] and DRAFT in cs[2]["prompt"], [c["kind"] for c in cs])
        pressed = await pg.eval_on_selector_all('.kp-i', "els => els.map(e => e.getAttribute('aria-pressed') === 'true')")
        check("verdict with 2 spontan: 2 ticks", pressed == [True, True] + [False] * (n - 2))
        await pg.click('[data-a="rw-open"]'); await pg.fill('#rw-t', "O versiune scurtă dar suficient de lungă ca să fie trimisă.")
        await queue(pg, "grade", [json.dumps({"covered": [True] + [False] * (n - 1), "missing": [], "wrong": [], "feedback": ""})])
        await pg.click('[data-a="rw-check"]'); await pg.wait_for_selector('.rw .ai-l', timeout=3000)
        await pg.click('[data-a="oral-save"]'); await pg.wait_for_timeout(100)
        e = (await pg.evaluate("window.__prep.state().o"))[card["id"]]
        check("low rewrite: no 'a' saved; memory = the missed indexes", "a" not in e and e.get("m") == list(range(2, n)), e)

        # 4) errors keep the dialog usable; a failed verdict is retried without asking again; garbage degrades to the verdict
        await fresh(pg)
        card = await start_gil(pg)
        await queue(pg, "turn", [{"err": "rate_limited"}])
        await answer_and_start(pg); await pg.wait_for_selector('.iv .ai-err', timeout=3000)
        check("rate limit: message, own answer still shown, exactly one call", "Prea multe cereri" in await pg.inner_text('.iv .ai-err') and ANS in await pg.inner_text('.iv-m.me') and len(await calls(pg)) == 1)
        await pg.click('[data-a="iv-retry"]'); await pg.wait_for_selector('.ai-v', timeout=3000)
        check("manual retry asks again (turn, turn, verdict)", [c["kind"] for c in await calls(pg)] == ["turn", "turn", "verdict"], [c["kind"] for c in await calls(pg)])
        await pg.click('[data-a="quit"]'); await pg.click('[data-a="quit"]'); await pg.wait_for_timeout(100)
        if await pg.locator('[data-a="close-result"]').count(): await pg.click('[data-a="close-result"]')

        await fresh(pg)
        card = await start_gil(pg)
        await queue(pg, "turn", [tj(act="done")]); await queue(pg, "verdict", ["nu e json"])
        await answer_and_start(pg); await pg.wait_for_selector('.iv .ai-err', timeout=3000)
        check("bad verdict format: message in the dialog, two calls", "formatul" in await pg.inner_text('.iv .ai-err') and [c["kind"] for c in await calls(pg)] == ["turn", "verdict"])
        await pg.click('[data-a="iv-retry"]'); await pg.wait_for_selector('.ai-v', timeout=3000)
        check("retry after a failed verdict goes straight to the verdict (no new question)", [c["kind"] for c in await calls(pg)] == ["turn", "verdict", "verdict"], [c["kind"] for c in await calls(pg)])
        await pg.click('[data-a="quit"]'); await pg.click('[data-a="quit"]'); await pg.wait_for_timeout(100)
        if await pg.locator('[data-a="close-result"]').count(): await pg.click('[data-a="close-result"]')

        await fresh(pg)
        card = await start_gil(pg)
        await queue(pg, "turn", ["gunoi, nu e json"])
        await answer_and_start(pg); await pg.wait_for_selector('.ai-v', timeout=3000)
        check("malformed question reply degrades to the verdict, no error", [c["kind"] for c in await calls(pg)] == ["turn", "verdict"] and await pg.locator('.ai-err').count() == 0)
        await pg.click('[data-a="quit"]'); await pg.click('[data-a="quit"]'); await pg.wait_for_timeout(100)
        if await pg.locator('[data-a="close-result"]').count(): await pg.click('[data-a="close-result"]')

        # 5) stop, then continue; quitting mid-request leaves no error
        await fresh(pg)
        card = await start_gil(pg)
        await queue(pg, "turn", ["HANG"])
        await answer_and_start(pg); await pg.wait_for_selector('[data-a="iv-stop"]', timeout=3000)
        check("while waiting: 'Se gândește…' and a Stop button", "gândește" in await pg.inner_text('.iv-wait'))
        await pg.screenshot(path=str(SHOTS / "iv5-busy.png"))
        await pg.click('[data-a="iv-stop"]'); await pg.wait_for_selector('.iv .ai-err', timeout=3000)
        check("stop: calm message, continue offered, answer kept", "oprit" in await pg.inner_text('.iv .ai-err') and await pg.locator('[data-a="iv-retry"]').count() == 1 and ANS in await pg.inner_text('.iv-m.me'))
        await pg.click('[data-a="iv-retry"]'); await pg.wait_for_selector('.ai-v', timeout=3000)
        await pg.click('[data-a="quit"]'); await pg.click('[data-a="quit"]'); await pg.wait_for_timeout(100)
        if await pg.locator('[data-a="close-result"]').count(): await pg.click('[data-a="close-result"]')

        card = await start_gil(pg)
        await queue(pg, "turn", ["HANG"])
        await answer_and_start(pg); await pg.wait_for_selector('[data-a="iv-stop"]', timeout=3000)
        await pg.click('[data-a="quit"]'); await pg.click('[data-a="quit"]'); await pg.wait_for_timeout(200)
        check("quit mid-request: back to the oral home, no leftover dialog", await pg.locator('.modrow').count() > 0 and await pg.locator('.iv').count() == 0)

        # 5b) mock interview: 4 cards from ≥3 modules, fixed persona, no model between cards, result screen with the closing line
        await fresh(pg)
        spread = await pg.evaluate("Array.from({ length: 40 }, () => { const p = window.__prep.pickIvMock(4); return [p.length, new Set(p.map(c => c.id)).size, new Set(p.map(c => c.m)).size]; })")
        check("pickIvMock: 4 distinct cards from at least 3 modules, every time", all(a == 4 and b == 4 and c >= 3 for a, b, c in spread), spread[:3])
        await pg.click('.tab[data-tab="oral"]'); await pg.wait_for_timeout(100)
        check("oral home offers the simulated interview", await pg.locator('[data-a="iv-mock"]').count() == 1)
        await pg.screenshot(path=str(SHOTS / "iv8-home.png"), full_page=True)
        await pg.click('[data-a="iv-mock"]'); await pg.wait_for_selector('#ans-t', timeout=3000)
        check("starts at 1/4 with the greeting", "1/4" in await pg.text_content('.eyebrow') and "Bună!" in await pg.inner_text('.iv-m.int') and "Interviu simulat" in await pg.text_content('.eyebrow'))
        check("mock ask phase: only the interviewer button (no timer, no direct check, no reveal)", await pg.locator('[data-a="iv-start"]').count() == 1 and await pg.locator('[data-a="oral-ai"], [data-a="oral-reveal"], [data-a="oral-timer"]').count() == 0)
        await pg.screenshot(path=str(SHOTS / "iv9-mock-ask.png"))
        order = []
        for i in range(4):
            if i == 1: check("transition between cards", "trecem mai departe" in await pg.inner_text('.iv-m.int'))
            if i == 3: check("last card is announced", "Ultima întrebare" in await pg.inner_text('.iv-m.int'))
            await queue(pg, "turn", [tj(act="done")])
            await answer_and_start(pg); await pg.wait_for_selector('.ai-v', timeout=3000)
            if i == 0: check("mock review: no model answer and no rewrite step", await pg.locator('details.model summary:has-text("Model de răspuns")').count() == 0 and await pg.locator('[data-a="rw-open"]').count() == 0 and await pg.locator('[data-a="oral-save"]').count() == 1)
            await pg.click('[data-a="oral-save"]'); await pg.wait_for_timeout(120)
        check("result screen: closing line, 4 cards, scores", "Asta a fost tot" in await pg.inner_text('main') and await pg.locator('main .score').count() == 1 and "4 carduri" in await pg.inner_text('.score'))
        st = await pg.evaluate("({ o: Object.keys(window.__prep.state().o).length, h: window.__prep.state().h.map(e => e.title) })")
        check("every card went through updO; history records the mock", st["o"] == 4 and st["h"][-1] == "Interviu simulat", st)
        await pg.screenshot(path=str(SHOTS / "iv10-mock-result.png"), full_page=True)
        calls_n = len(await calls(pg))
        check("persona added no extra calls (one turn + one verdict per card)", calls_n == 8, calls_n)
        await pg.click('[data-a="close-result"]'); await pg.wait_for_timeout(100)

        # 5c) plan: oral task points at the interviewer; the morning warm-up starts a 2-card mock
        P = await pg.evaluate("""() => {
          const days = window.__prep.genPlan(), tasks = days.flatMap(d => d.tasks);
          const m = days[days.length - 1].tasks.find(t => /-m-iv$/.test(t.id));
          return { oral: (tasks.find(t => t.key === 'oral') || {}).text || '', m: m && { go: m.go, min: m.min } };
        }""")
        check("plan: oral task recommends the interviewer, morning has a 2-card warm-up", "intervievatorului" in P["oral"] and P["m"] and P["m"]["go"] == {"t": "ivmock", "n": 2} and P["m"]["min"] == 10, P)
        await pg.click('.tab[data-tab="plan"]'); await pg.wait_for_timeout(100)
        await pg.evaluate("document.querySelector('[data-a=\"go\"][data-id$=\"-m-iv\"]').click()"); await pg.wait_for_selector('#ans-t', timeout=3000)
        check("warm-up task opens a 2-card interview", "1/2" in await pg.text_content('.eyebrow') and "Interviu simulat" in await pg.text_content('.eyebrow'))
        await pg.click('[data-a="quit"]'); await pg.click('[data-a="quit"]'); await pg.wait_for_timeout(100)

        # 6) dark theme shots of the dialog and the review
        await fresh(pg)
        await pg.emulate_media(color_scheme="dark")
        card = await start_gil(pg); n = card["n"]
        await queue(pg, "turn", [tj(act="followup", say=FU1)])
        await queue(pg, "verdict", [tj(covered=["spontan", "dupa"] + ["nu"] * (n - 2), missing=["costul proceselor"], wrong=["GIL nu protejează invarianții"], feedback="Ai acoperit mecanismul, dar lipsește compromisul.")])
        await answer_and_start(pg); await pg.wait_for_selector('.iv-m.int', timeout=3000)
        await pg.screenshot(path=str(SHOTS / "iv6-dialog-dark.png"), full_page=True)
        await pg.fill('#iv-t', REPLY); await pg.click('[data-a="iv-finish"]'); await pg.wait_for_selector('.ai-v', timeout=3000)
        await pg.click('[data-a="rw-open"]')
        await pg.screenshot(path=str(SHOTS / "iv7-review-dark.png"), full_page=True)
        check("no horizontal overflow at 360 px", await pg.evaluate("document.documentElement.scrollWidth <= 360"))
        check("no page errors", not errs, errs)

        # 7) without `sample` (outside the artifact): no interviewer button, the old flow is untouched
        ctx2 = await b.new_context(viewport={"width": 360, "height": 740})
        pg2 = await ctx2.new_page(); errs2 = []
        pg2.on("pageerror", lambda e: errs2.append(str(e)))
        await pg2.route("**/fonts.*", lambda r: r.abort())
        await pg2.goto(PAGE); await pg2.wait_for_timeout(400)
        await pg2.click('.tab[data-tab="oral"]'); await pg2.click('[data-a="oral-mod"][data-m="gil"]'); await pg2.wait_for_selector('#ans-t')
        check("no sample: no interviewer button, plain reveal stays primary", await pg2.locator('[data-a="iv-start"]').count() == 0 and "Răspunde intervievatorului" not in await pg2.inner_text('main') and await pg2.locator('[data-a="oral-reveal"].primary').count() == 1)
        await pg2.click('.tab[data-tab="oral"]'); await pg2.click('[data-a="tab"][data-tab="oral"]'); await pg2.wait_for_timeout(100)
        await pg2.click('[data-a="quit"]'); await pg2.click('[data-a="quit"]'); await pg2.wait_for_timeout(100)
        check("no sample: no simulated-interview mode on the oral home", await pg2.locator('[data-a="iv-mock"]').count() == 0)
        P2 = await pg2.evaluate("(window.__prep.genPlan().flatMap(d => d.tasks).find(t => t.key === 'oral') || {}).text || ''")
        check("no sample: the plan keeps the spoken wording", "voce tare" in P2 and "intervievatorului" not in P2, P2)
        check("no sample: no page errors", not errs2, errs2)
        await b.close()
    print("\nFAILED: " + ", ".join(fails) if fails else "\nALL OK")
    raise SystemExit(1 if fails else 0)

asyncio.run(main())
