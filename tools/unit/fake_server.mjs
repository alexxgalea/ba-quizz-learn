// Un server de evenimente fals, în memorie, cu același contract ca server/ba_server/routers/events.py:
//   POST /events { events } → { accepted, duplicates, cursor }   (idempotent după id: primul câștigă)
//   GET /events?after=&limit= → { events, cursor, more }          (cursor 1, 2, 3, … fără goluri, în ordinea sosirii)
//   antet Authorization: Bearer <secret>; altfel 401. Limite: 1–500 de evenimente pe lot, limit ≤ 500.
// `fetch` se dă lui JournalSync. Cârlige de defecte: `down` (fără rețea: fetch aruncă), `status` (forțează un cod HTTP), `loseResponse` (lotul se păstrează, dar răspunsul se pierde),
// `poison` (id-uri refuzate cu 422, ca un eveniment stricat), `failAfter(n)` (al n-lea apel de rețea de acum încolo aruncă, o singură dată).
export function fakeServer(secret = "s3cret") {
  const srv = { secret, events: [], ids: new Set(), down: false, status: 0, loseResponse: false, poison: new Set(), calls: [], _failAt: 0 };
  const json = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => JSON.parse(JSON.stringify(body)) });
  srv.failAfter = n => { srv._failAt = srv.calls.length + n; };
  srv.fetch = async (url, req = {}) => {
    srv.calls.push({ url, method: req.method || "GET" });
    if (srv.down || (srv._failAt && srv.calls.length === srv._failAt)) { srv._failAt = 0; throw new TypeError("Failed to fetch"); }
    if (srv.status) return json(srv.status, { detail: "forced" });
    const auth = (req.headers && (req.headers.Authorization || req.headers.authorization)) || "";
    if (auth !== "Bearer " + srv.secret) return json(401, { detail: "unauthorized" });
    const u = new URL(url), path = u.pathname;
    if (req.method === "POST" && path === "/events") {
      const body = JSON.parse(req.body);
      if (!Array.isArray(body.events) || body.events.length < 1 || body.events.length > 500 || body.events.some(e => !e || typeof e.id !== "string")) return json(422, { detail: "invalid" });
      if (body.events.some(e => srv.poison.has(e.id))) return json(422, { detail: "invalid event" });
      const accepted = [], duplicates = [];
      for (const e of body.events) {
        if (srv.ids.has(e.id) || accepted.includes(e.id)) { duplicates.push(e.id); continue; }
        srv.ids.add(e.id); srv.events.push(JSON.parse(JSON.stringify(e))); accepted.push(e.id);
      }
      if (srv.loseResponse) { srv.loseResponse = false; throw new TypeError("network lost after commit"); }
      return json(200, { accepted, duplicates, cursor: srv.events.length });
    }
    if ((req.method || "GET") === "GET" && path === "/events") {
      const after = +(u.searchParams.get("after") || 0), limit = +(u.searchParams.get("limit") || 100);
      if (!(after >= 0) || !(limit >= 1 && limit <= 500)) return json(422, { detail: "invalid" });
      const page = srv.events.slice(after, after + limit);
      return json(200, { events: page, cursor: after + page.length, more: after + page.length < srv.events.length });
    }
    return json(404, { detail: "not found" });
  };
  return srv;
}
