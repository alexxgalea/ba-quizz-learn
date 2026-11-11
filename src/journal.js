// Journal: jurnalul de încercări (ADR 0003). Fiecare răspuns al lui Alex, ca și fiecare schimbare de setări, bifă de plan, poziție de lecție sau reset, e un eveniment care nu se mai schimbă.
// Din jurnal se calculează `S`, starea pe care o citește aplicația (cutiile Leitner, contoarele, golurile, istoricul). Funcțiile pure (apply, project, union, importState) nu știu de browser; depozitul
// (IndexedDB, cu un adaptor în memorie pentru teste), oglinda (localStorage, pentru prima desenare) și coada evenimentelor netrimise stau în spatele unor adaptoare mici.
// În pagină e o declarație globală, în Node un modul.
//
// Forma evenimentului (JSON simplu):
//   { id, t, dev, type, ...câmpurile tipului }
//   id   șir unic, generat de client: "<dispozitiv>.<t în base 36>.<număr de ordine>"; pe același dispozitiv ordinea ids = ordinea adăugării
//   t    milisecunde; pe dispozitiv nu scade niciodată, iar un eveniment nou are mereu cheia (t, id) mai mare decât tot ce e deja aplicat
//   dev  dispozitivul care l-a scris; imported: true la cele sintetice (importState)
//   type answer  { form: "q"|"o"|"x"|"s"|"k", item, points: [], result, interval, conf?, dur?, text? }
//          result: q { ok, assisted?, pick? } · x { g } · o { p, k?, missed?, fixed?, wrong?, keep? } · s { p } · k { s }
//        guess   { form: "q", item }              "Am ghicit": cutia 1, fără încercare nouă
//        gap     { op: "fix", item, point }       un gol reparat cu întrebarea țintită
//        cfg     { d, h }                         data interviului, ore pe seară
//        plan    { item, done }                   bifa unei sarcini din plan
//        lesson  { item, n, done? }               poziția lecției pe modul; done: data terminării = t
//        hist    { row }                          un rând din istoric
//        state   { map, item, entry }             doar importat: intrarea unui item așa cum era în S
//        reset                                    ascunde tot ce e mai vechi
// Ordinea evenimentelor: după t, apoi după id. Îmbinarea a două liste e reuniunea după id.
const Journal = (() => {
  const MC_MAX = 9, HMAX = 80;
  const MAPS = ["q", "o", "x", "k", "s", "p", "l"];
  const emptyState = () => ({ v: 1, r: 0, q: {}, o: {}, x: {}, k: {}, s: {}, p: {}, l: {}, h: [] });
  const clone = x => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
  const cmp = (a, b) => (a.t - b.t) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const keyOf = e => ({ t: e.t, id: e.id });
  const validEvent = e => !!e && typeof e === "object" && typeof e.id === "string" && !!e.id && Number.isFinite(e.t) && typeof e.type === "string";
  const itemT = e => Math.max((e && e.t) || 0, (e && e.gt) || 0);

  // ---------- regulile de învățare (aceleași ca în vechile updQ / updO / updX / recordOral) ----------
  // Contorul golurilor unui card: `mc` (index punct → ratări); la cardurile dinainte de `mc`, fiecare punct din `m` valorează 1.
  function gapCounts(e) {
    const out = {};
    if (!e) return out;
    if (e.mc && typeof e.mc === "object") { for (const k of Object.keys(e.mc)) { const n = +e.mc[k]; if (n > 0) out[k] = Math.min(MC_MAX, n); } }
    else (e.m || []).forEach(i => { out[i] = 1; });
    return out;
  }
  // Un pas Leitner pe procentul de puncte acoperite: ≥ 80% urcă o cutie, 50–80% rămâne, sub 50% cutia 1.
  function leitner(map, item, p, t) {
    const e = Object.assign({ b: 0, n: 0 }, map[item]);
    e.n++; e.s = Math.round(p * 100);
    if (p >= 0.8) e.b = Math.min(5, Math.max(1, e.b) + 1);
    else if (p >= 0.5) e.b = Math.max(1, e.b);
    else e.b = 1;
    e.t = t;
    map[item] = e;
    return e;
  }
  // Un răspuns corect dat cu contextul deschis te duce cel mult în cutia 2.
  function stepQ(S, item, r, t) {
    const e = Object.assign({ b: 0, n: 0, c: 0 }, S.q[item]);
    e.n++;
    if (r.ok) { e.c++; const nb = Math.min(5, Math.max(1, e.b) + 1); e.b = r.assisted ? Math.max(e.b, Math.min(nb, 2)) : nb; } else e.b = 1;
    e.l = r.ok ? 1 : 0; e.t = t;
    S.q[item] = e;
  }
  // Întrebări deschise: 2 = știu, 1 = parțial (urcă cel mult în cutia 2), 0 = nu.
  function stepX(S, item, r, t) {
    const g = r.g, e = Object.assign({ b: 0, n: 0, c: 0 }, S.x[item]);
    e.n++;
    if (g >= 1) { e.c++; const nb = Math.min(5, Math.max(1, e.b) + 1); e.b = g === 1 ? Math.max(e.b, Math.min(nb, 2)) : nb; } else e.b = 1;
    e.l = g; e.t = t;
    S.x[item] = e;
  }
  // Golurile unui card oral: +1 la un punct ratat, −1 la unul acoperit întreg (max 9), 0 la unul reparat; `m` = ratate acum și nereparate; `w` = ce a marcat verdictul greșit; `a` = ultima versiune bună.
  function oralGaps(e, r) {
    const prev = gapCounts(e), mc = {}, fx = r.fixed || [], open = r.missed.filter(i => fx.indexOf(i) < 0);
    for (let i = 0; i < (r.k || 0); i++) {
      const n = fx.indexOf(i) >= 0 ? 0 : r.missed.indexOf(i) >= 0 ? Math.min(MC_MAX, (prev[i] || 0) + 1) : Math.max(0, (prev[i] || 0) - 1);
      if (n) mc[i] = n;
    }
    e.mc = mc;                                                   // și gol ({}): fără el, `m` ar fi citit ca date vechi
    if (open.length) e.m = open; else delete e.m;
    if (r.wrong !== undefined) { const w = r.wrong.slice(0, 3); if (w.length) e.w = w; else delete e.w; }
    if (r.keep) e.a = r.keep;
  }

  // Aplică un eveniment peste S, pe loc. Evenimentele de tip necunoscut se ignoră (un client mai vechi nu se strică de unul mai nou).
  function apply(S, ev, o) {
    const t = ev.t, hmax = (o && o.hmax) || HMAX;
    switch (ev.type) {
      case "answer": {
        const r = ev.result || {};
        if (ev.form === "q") stepQ(S, ev.item, r, t);
        else if (ev.form === "x") stepX(S, ev.item, r, t);
        else if (ev.form === "o" || ev.form === "s") {
          const e = leitner(S[ev.form], ev.item, r.p, t);
          if (ev.form === "o" && Array.isArray(r.missed)) oralGaps(e, r);
        } else if (ev.form === "k") S.k[ev.item] = { s: r.s, t };
        break;
      }
      case "guess": { const e = S.q[ev.item]; if (e) { e.b = 1; e.l = 0; e.t = t; } break; }
      case "gap": {
        const e = S.o[ev.item]; if (!e || ev.op !== "fix") break;
        const mc = gapCounts(e); delete mc[ev.point]; e.mc = mc;
        const m = (e.m || []).filter(x => x !== ev.point); if (m.length) e.m = m; else delete e.m;
        e.gt = t;                                                // nu mută scadența Leitner, care folosește doar `t`
        break;
      }
      case "cfg": S.c = { d: ev.d, h: ev.h, t }; break;
      case "plan": S.p[ev.item] = { d: ev.done ? 1 : 0, t }; break;
      case "lesson": {
        const prev = S.l[ev.item], e = { n: ev.n, t };
        if (ev.done) e.d = t; else if (prev && prev.d) e.d = prev.d;
        S.l[ev.item] = e;
        break;
      }
      case "hist": S.h.push(clone(ev.row)); if (S.h.length > hmax) S.h = S.h.slice(-hmax); break;
      case "state": if (MAPS.indexOf(ev.map) >= 0) S[ev.map][ev.item] = clone(ev.entry); break;
      case "reset": { const z = emptyState(); for (const k of Object.keys(S)) delete S[k]; Object.assign(S, z, { r: t }); break; }
    }
    return S;
  }

  // ---------- reuniune, proiecție, import ----------
  // Reuniunea după id (la id egal rămâne primul), în ordinea (t, id).
  function union(...lists) {
    const m = new Map();
    for (const l of lists) for (const e of l || []) if (!m.has(e.id)) m.set(e.id, e);
    return Array.from(m.values()).sort(cmp);
  }
  // Jurnalul întreg → S, plus cursorul. Un reset ascunde tot ce e mai vechi: proiecția începe de la ultimul reset.
  function projectFull(events, o) {
    const evs = union(events).filter(validEvent), S = emptyState();
    let from = 0, reset = null;
    for (let i = evs.length - 1; i >= 0; i--) if (evs[i].type === "reset") { from = i; reset = keyOf(evs[i]); break; }
    for (let i = from; i < evs.length; i++) apply(S, evs[i], o);
    return { state: S, last: evs.length ? keyOf(evs[evs.length - 1]) : null, reset, n: evs.length - from };
  }
  const project = (events, o) => projectFull(events, o).state;

  // djb2 în base 36: face id-ul unui eveniment importat să depindă și de conținutul intrării.
  const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  // O stare S → evenimente sintetice (marcate `imported`): unul pe item, plus setările, rândurile de istoric și resetul. Cu `from`, doar ce diferă de starea curentă.
  // Id-urile sunt deterministe: același export importat de două ori (sau de pe două dispozitive) se reunește fără dubluri.
  function importState(S, o) {
    const from = o && o.from, out = [];
    const mkEv = (id, t, rest) => Object.assign({ id: "imp-" + id, t, dev: "import", imported: true }, rest);
    if (S.r > 0 && (!from || S.r > from.r)) out.push(mkEv("r-" + S.r, S.r, { type: "reset" }));
    if (S.c && !(from && same(from.c, S.c))) out.push(mkEv("c-" + (S.c.t || 0) + "-" + hash(JSON.stringify(S.c)), S.c.t || 0, { type: "cfg", d: S.c.d, h: S.c.h }));
    for (const map of MAPS) for (const item of Object.keys(S[map] || {})) {
      const entry = S[map][item];
      if (from && same(from[map][item], entry)) continue;
      const t = itemT(entry);
      out.push(mkEv(map + "-" + item + "-" + t + "-" + hash(JSON.stringify(entry)), t, { type: "state", map, item, entry: clone(entry) }));
    }
    const have = new Set(from ? from.h.map(r => r.id) : []);
    for (const row of S.h || []) if (!have.has(row.id)) out.push(mkEv("h-" + row.id + "-" + row.ts, row.ts, { type: "hist", row: clone(row) }));
    return out.sort(cmp);
  }

  // ---------- adaptoare ----------
  const sortedCopy = list => list.slice().sort(cmp);
  // Depozit în memorie: același contract ca IndexedDB, pentru teste. `stats` numără citirile, ca testele să poată afirma că pornirea nu reia tot jurnalul.
  function memStore() {
    const events = new Map(), outbox = new Set();
    let snapshot = null, meta = null;
    const st = {
      stats: { loads: 0, commits: 0, allEvents: 0, eventsAfter: 0, eventsRead: 0 }, failing: false,
      async load() { st.stats.loads++; return { snapshot: clone(snapshot) || null, meta: clone(meta) || null }; },
      async commit(c) {
        if (st.failing) throw new Error("commit failed");
        st.stats.commits++;
        for (const e of c.events || []) events.set(e.id, clone(e));
        for (const id of c.outbox || []) outbox.add(id);
        if (c.snapshot) snapshot = clone(c.snapshot);
        if (c.meta) meta = clone(c.meta);
      },
      // items: [{ ev, ob }]; întoarce doar evenimentele care nu erau în depozit
      async putEvents(items) {
        const fresh = [];
        for (const it of items) if (!events.has(it.ev.id)) { events.set(it.ev.id, clone(it.ev)); if (it.ob) outbox.add(it.ev.id); fresh.push(clone(it.ev)); }
        return sortedCopy(fresh);
      },
      async count() { return events.size; },
      async eventsAfter(k) { st.stats.eventsAfter++; const r = sortedCopy(Array.from(events.values()).filter(e => !k || cmp(e, k) > 0)); st.stats.eventsRead += r.length; return clone(r); },
      async allEvents() { st.stats.allEvents++; const r = sortedCopy(Array.from(events.values())); st.stats.eventsRead += r.length; return clone(r); },
      async outbox() { return clone(sortedCopy(Array.from(outbox).map(id => events.get(id)).filter(Boolean))); },
      async markSent(ids) { ids.forEach(id => outbox.delete(id)); },
      async clear() { events.clear(); outbox.clear(); snapshot = null; meta = null; },
      // cârlige pentru teste
      setSnapshot(s) { snapshot = clone(s); },
      clearSnapshot() { snapshot = null; }
    };
    return st;
  }

  // IndexedDB: `events` (cheie id, index `k` pe [t, id] pentru „tot ce e după cursor”), `outbox` (id-urile netrimise), `meta` (instantaneul proiecției și contorul dispozitivului).
  // Întoarce null când nu există IndexedDB (fereastră privată, politică): aplicația rămâne atunci pe oglindă.
  function idbStore(name, idb) {
    idb = idb || (typeof indexedDB !== "undefined" ? indexedDB : null);
    if (!idb) return null;
    let dbp = null;
    const open = () => dbp || (dbp = new Promise((res, rej) => {
      let rq; try { rq = idb.open(name || "onapsis-journal", 1); } catch (e) { dbp = null; rej(e); return; }
      rq.onupgradeneeded = () => {
        const db = rq.result;
        db.createObjectStore("events", { keyPath: "id" }).createIndex("k", ["t", "id"]);
        db.createObjectStore("outbox", { keyPath: "id" });
        db.createObjectStore("meta", { keyPath: "key" });
      };
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => { dbp = null; rej(rq.error); };
      rq.onblocked = () => { dbp = null; rej(new Error("blocked")); };
    }));
    const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const done = tx => new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error || new Error("aborted")); });
    const after = k => (k ? IDBKeyRange.lowerBound([k.t, k.id], true) : undefined);
    return {
      async load() {
        const db = await open(), tx = db.transaction("meta", "readonly"), s = tx.objectStore("meta");
        const [a, b] = await Promise.all([req(s.get("snapshot")), req(s.get("meta"))]);
        return { snapshot: a ? a.v : null, meta: b ? b.v : null };
      },
      async commit(c) {
        const db = await open(), tx = db.transaction(["events", "outbox", "meta"], "readwrite"), d = done(tx);
        for (const e of c.events || []) tx.objectStore("events").put(e);
        for (const id of c.outbox || []) tx.objectStore("outbox").put({ id });
        if (c.snapshot) tx.objectStore("meta").put({ key: "snapshot", v: c.snapshot });
        if (c.meta) tx.objectStore("meta").put({ key: "meta", v: c.meta });
        await d;
      },
      async putEvents(items) {
        const db = await open(), tx = db.transaction(["events", "outbox"], "readwrite"), d = done(tx), fresh = [];
        await Promise.all(items.map(async it => {
          if (await req(tx.objectStore("events").getKey(it.ev.id)) !== undefined) return;
          tx.objectStore("events").put(it.ev);
          if (it.ob) tx.objectStore("outbox").put({ id: it.ev.id });
          fresh.push(it.ev);
        }));
        await d;
        return sortedCopy(fresh);
      },
      async count() { const db = await open(); return req(db.transaction("events", "readonly").objectStore("events").count()); },
      async eventsAfter(k) { const db = await open(); return req(db.transaction("events", "readonly").objectStore("events").index("k").getAll(after(k))); },
      async allEvents() { const db = await open(); return req(db.transaction("events", "readonly").objectStore("events").index("k").getAll()); },
      async outbox() {
        const db = await open(), tx = db.transaction(["events", "outbox"], "readonly");
        const ids = await req(tx.objectStore("outbox").getAllKeys());
        const evs = await Promise.all(ids.map(id => req(tx.objectStore("events").get(id))));
        return sortedCopy(evs.filter(Boolean));
      },
      async markSent(ids) { const db = await open(), tx = db.transaction("outbox", "readwrite"), d = done(tx); ids.forEach(id => tx.objectStore("outbox").delete(id)); await d; },
      async clear() { const db = await open(), tx = db.transaction(["events", "outbox", "meta"], "readwrite"), d = done(tx); ["events", "outbox", "meta"].forEach(n => tx.objectStore(n).clear()); await d; }
    };
  }

  // Oglinda: ultima proiecție + evenimentele încă neconfirmate de depozit, scrise sincron la fiecare eveniment. Prima desenare nu așteaptă IndexedDB, iar un proces oprit între timp nu pierde nimic.
  function localMirror(storage, key) {
    return {
      read() { try { const raw = storage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } },
      write(obj) { try { storage.setItem(key, JSON.stringify(obj)); return true; } catch (e) { return false; } }
    };
  }
  function memMirror() { let raw = null; return { read: () => (raw ? JSON.parse(raw) : null), write: o => { raw = JSON.stringify(o); return true; } }; }

  const randomDevice = () => "d" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);

  // ---------- jurnalul viu ----------
  // opts: device, clock (ms), hmax, store, mirror, legacy (() => S vechi, citit doar când nu există nici oglindă, nici jurnal), onState (S s-a înlocuit), retryMs.
  // Fără `store`, jurnalul doar proiectează (artifactul): evenimentele se aplică peste S, nimic nu se păstrează aici.
  function create(opts) {
    opts = opts || {};
    const clock = opts.clock || Date.now, hmax = opts.hmax || HMAX, store = opts.store || null, mirror = opts.mirror || null;
    let S = emptyState(), last = null, resetK = null, applied = 0, seq = 0, device = opts.device, legacyBoot = false;
    const pending = [];                       // [{ ev, ob }]: scrise în oglindă, încă neconfirmate de depozit
    let loaded = !store, chain = Promise.resolve(), scheduled = false, dirtySnap = false, mirrorOk = true, failures = 0, retryT = 0;

    const m0 = mirror && mirror.read();
    if (m0 && m0.snap && m0.snap.state) {
      S = Object.assign(emptyState(), m0.snap.state); last = m0.snap.last || null; resetK = m0.snap.reset || null; applied = m0.snap.n || 0; seq = m0.seq || 0;
      if (!device && m0.dev) device = m0.dev;
      for (const p of m0.tail || []) if (p && validEvent(p.ev)) pending.push(p);
    } else if (opts.legacy) {
      let s = null; try { s = opts.legacy(); } catch (e) { s = null; }
      if (s && typeof s === "object") { S = s; legacyBoot = true; }
    }
    if (!device) device = randomDevice();

    const snap = () => ({ v: 1, state: S, last, reset: resetK, n: applied });
    const hasData = s => s.r > 0 || s.h.length > 0 || !!s.c || MAPS.some(k => Object.keys(s[k]).length > 0);
    function writeMirror() { if (mirror) mirrorOk = mirror.write({ v: 1, dev: device, seq, snap: snap(), tail: pending }); }
    const enqueue = fn => { const p = chain.then(fn); chain = p.catch(() => {}); return p; };
    function adopt(s) { S = s; if (opts.onState) opts.onState(S); }

    // Cheia unui eveniment nou: după tot ce e deja aplicat, chiar dacă ceasul a mers înapoi.
    function stamp(partial) {
      seq++;
      const mk = t => device + "." + t.toString(36).padStart(9, "0") + "." + seq.toString(36).padStart(5, "0");
      let t = Math.max(clock(), last ? last.t : 0), id = mk(t);
      if (last && cmp({ t, id }, last) <= 0) { t = last.t + 1; id = mk(t); }
      return Object.assign({}, clone(partial), { id, t, dev: device });
    }
    function applyOne(e) {
      apply(S, e, { hmax });
      if (!last || cmp(e, last) > 0) last = keyOf(e);
      if (e.type === "reset") resetK = keyOf(e);
      applied++;
    }
    function rebuildFrom(events) { const p = projectFull(events, { hmax }); last = p.last; resetK = p.reset; applied = p.n; adopt(p.state); }

    function append(partial) {
      const e = stamp(partial);
      if (e.type === "answer") {
        if (!e.points) e.points = [];
        const prev = S[e.form] && S[e.form][e.item];
        e.interval = prev && prev.t ? e.t - prev.t : null;
      }
      applyOne(e);
      if (store) { pending.push({ ev: e, ob: true }); scheduleFlush(); }
      writeMirror();
      return clone(e);
    }
    function scheduleFlush() { if (!store || scheduled) return; scheduled = true; Promise.resolve().then(() => { scheduled = false; enqueue(flushTask); }); }
    async function flushTask() {
      if (!store || !loaded || (!pending.length && !dirtySnap)) return true;
      const batch = pending.slice(), snapshot = snap(), meta = { dev: device, seq };
      dirtySnap = false;
      try {
        await store.commit({ events: batch.map(p => p.ev), outbox: batch.filter(p => p.ob).map(p => p.ev.id), snapshot, meta });
        pending.splice(0, batch.length);
        writeMirror();
        return true;
      } catch (e) {
        failures++; dirtySnap = true;
        if (opts.retryMs && !retryT) retryT = setTimeout(() => { retryT = 0; scheduleFlush(); }, opts.retryMs);
        return false;
      }
    }

    // Pornirea: oglinda (sau starea veche) a desenat deja prima pagină. Aici se împacă cu depozitul: instantaneul, evenimentele de după el, cele pe care doar oglinda le știa.
    async function loadTask() {
      const { snapshot, meta } = await store.load();
      if (meta) { if ((meta.seq || 0) > seq) seq = meta.seq; if (!opts.device && !(m0 && m0.dev) && meta.dev) device = meta.dev; }
      const empty = !snapshot && (await store.count()) === 0;
      if (empty) {
        const had = hasData(S);
        if (had) {                                                    // starea există (oglindă sau cheia veche), jurnalul nu: o scriem ca evenimente sintetice, fără coadă (e aceeași informație)
          const evs = importState(S);
          for (const e of evs) if (!last || cmp(e, last) > 0) last = keyOf(e);
          await store.commit({ events: evs, snapshot: snap(), meta: { dev: device, seq } });
        }
        loaded = true;
        await flushTask();
        return { fresh: !had };
      }
      let rebuilt = false;
      if (snapshot && (!last || (snapshot.last && cmp(snapshot.last, last) > 0))) {
        // depozitul e înaintea oglinzii (oglinda s-a golit sau n-a putut scrie): luăm instantaneul lui și, ce știa doar oglinda, vine prin reconstruire
        const freshTail = await store.putEvents(pending.map(p => ({ ev: p.ev, ob: p.ob })));
        if (m0 && m0.snap && freshTail.length) { rebuildFrom((await store.allEvents()).concat(pending.map(p => p.ev))); rebuilt = true; }
        else { S = Object.assign(emptyState(), snapshot.state); last = snapshot.last; resetK = snapshot.reset || null; applied = snapshot.n || 0; adopt(S); }
      } else if (!snapshot) {
        rebuildFrom((await store.allEvents()).concat(pending.map(p => p.ev))); rebuilt = true;        // nici un instantaneu: singura reluare completă
      } else {
        await store.putEvents(pending.map(p => ({ ev: p.ev, ob: p.ob })));                              // ce a rămas doar în oglindă ajunge în depozit
      }
      if (!rebuilt) {
        const tail = await store.eventsAfter(last);                                                     // evenimentele de după instantaneu
        for (const e of tail) if (!resetK || cmp(e, resetK) >= 0) applyOne(e);
        if (tail.length) adopt(S);
      }
      loaded = true;
      dirtySnap = true;
      await flushTask();
      return { fresh: false };
    }

    // Îmbinarea cu evenimente venite de aiurea (server, alt dispozitiv, import). { remote: true } = nu intră în coada de trimis. Întoarce { added, rebuilt }.
    function merge(events, o) {
      if (!store) return Promise.reject(new Error("fără depozit"));
      o = o || {};
      return enqueue(async () => {
        const evs = union(events.filter(validEvent).map(clone));
        const fresh = await store.putEvents(evs.map(ev => ({ ev, ob: !o.remote })));
        if (!fresh.length) return { added: 0, rebuilt: false };
        let rebuild = false;
        for (const e of fresh) { if (resetK && cmp(e, resetK) < 0) continue; if (last && cmp(e, last) <= 0) rebuild = true; }
        if (rebuild) rebuildFrom((await store.allEvents()).concat(pending.map(p => p.ev)));
        else { for (const e of fresh) { if (resetK && cmp(e, resetK) < 0) continue; applyOne(e); } adopt(S); }
        dirtySnap = true; writeMirror();
        await flushTask();
        return { added: fresh.length, rebuilt: rebuild };
      });
    }

    const flush = () => (store ? enqueue(flushTask) : Promise.resolve(true));

    return {
      state: () => S,
      append,
      merge,
      load() { if (!store) return Promise.resolve({ fresh: false }); return enqueue(loadTask); },
      // Înlocuiește proiecția fără evenimente: artifactul (starea vine din localStorage și din sincronizarea veche) și cârligul de test `__prep.setState`. Obiectul primit devine starea vie.
      replaceState(s) { adopt(s); if (store) { dirtySnap = true; scheduleFlush(); } writeMirror(); },
      // Un export S vechi → evenimente sintetice pentru ce diferă de starea curentă, îmbinate ca orice altceva.
      importState(s) { return merge(importState(s, { from: S })); },
      flush,
      async events() { if (!store) return []; await flush(); return store.allEvents(); },
      async unsent() { if (!store) return []; await flush(); return store.outbox(); },
      markSent: ids => (store ? enqueue(() => store.markSent(ids)) : Promise.resolve()),
      info: () => ({ device, last, applied, pending: pending.length, mirrorOk, failures, legacyBoot, durable: mirrorOk || (!!store && failures === 0) })
    };
  }

  return { MC_MAX, HMAX, MAPS, emptyState, gapCounts, cmp, apply, union, project, projectFull, importState, create, memStore, idbStore, localMirror, memMirror };
})();
if (typeof module !== "undefined" && module.exports) module.exports = Journal;
