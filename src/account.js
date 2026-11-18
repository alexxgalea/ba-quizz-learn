// ServerAccount: contul legat de secretul serverului (ADR 0006): numele, adresarea („m” / „f”) și profilul, din `GET /me`.
// Cache în `localStorage` (`onapsis-account-v1`), legat de adresa serverului și de o amprentă a secretului (nu de secret):
// alt server sau alt secret = cont necunoscut, deci valorile implicite, ale lui Alex (cum era înainte de conturi).
// Nu intră în starea `S`, în jurnal, în export sau în brief. Aici stau și liniile pe care prompturile AI le primesc despre persoană.
// Mic și fără importuri: legătura (`ServerConn`), stocarea și `fetch` se primesc prin `create`. În pagină e o declarație globală, în Node un modul.
const ServerAccount = (() => {
  const ITEM = "onapsis-account-v1";
  const DEFAULT = Object.freeze({
    id: "alex", name: "Alex", address: "m",
    profile: "dezvoltator cu experiență în Django/DRF, React, Elasticsearch, Docker Swarm, Keycloak, Celery și computer vision"
  });

  // FNV-1a pe 32 de biți: amprenta secretului, ca un secret nou să invalideze cache-ul fără să-l păstrăm a doua oară.
  function mark(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16);
  }
  // Un cont valid de la server: id, nume și adresare cum le validează serverul; profilul poate lipsi.
  function clean(j) {
    if (!j || typeof j.id !== "string" || !/^[a-z0-9]{1,32}$/.test(j.id) || typeof j.name !== "string" || !j.name.trim() || (j.address !== "m" && j.address !== "f")) return null;
    return { id: j.id, name: j.name.trim().slice(0, 40), address: j.address, profile: typeof j.profile === "string" ? j.profile.trim().slice(0, 800) : "" };
  }
  const err = code => Object.assign(new Error(code), { code });

  function create({ conn, storage, fetch }) {
    const key = () => { const c = conn.valid(); return c ? c.url + "#" + mark(c.secret) : ""; };
    function cached() {
      const k = key();
      if (!k) return null;
      try { const o = JSON.parse(storage.getItem(ITEM) || "null"); return o && o.k === k ? clean(o.me) : null; } catch (e) { return null; }
    }
    return {
      known: () => !!cached(),
      get: () => cached() || DEFAULT,
      clear() { try { storage.removeItem(ITEM); } catch (e) { /* stocare blocată */ } },
      // Întreabă serverul cine e contul. Un eșec lasă cache-ul cum era; codul erorii spune de ce (`old` = server fără `/me`).
      async refresh() {
        const c = conn.valid();
        if (!c) throw err("nokey");
        let r;
        try { r = await fetch(c.url + "/me", { method: "GET", headers: { authorization: "Bearer " + c.secret } }); }
        catch (e) { throw err("network"); }
        if (r.status === 401) throw err("auth");
        if (r.status === 404) throw err("old");
        if (!r.ok) throw err("server");
        let me;
        try { me = clean(await r.json()); } catch (e) { me = null; }
        if (!me) throw err("format");
        try { storage.setItem(ITEM, JSON.stringify({ k: key(), me })); } catch (e) { /* stocare blocată: merge și fără cache */ }
        return me;
      }
    };
  }

  // Linia de profil din prompturi; goală dacă persoana n-are profil. Pentru Alex e textul de dinainte de conturi, neschimbat.
  function profileLine(me) {
    if (!me || !me.profile) return "";
    const f = me.address === "f";
    const example = me.profile === DEFAULT.profile ? "„în proiectul tău cu Celery, cum…”" : "„în proiectul tău cu …, cum…”";
    return "Profilul " + (f ? "candidatei" : "candidatului") + ": " + me.profile.replace(/[.\s]+$/, "") + ". " +
      "Folosește-l doar ca să faci întrebarea concretă (" + example + "); nu inventa detalii despre proiectele " + (f ? "ei" : "lui") + ".";
  }
  // Forma de adresare: pentru masculin nu se adaugă nimic (prompturile sunt scrise la masculin).
  function addressLine(me) {
    if (!me || me.address !== "f") return "";
    return "Persoana care se pregătește e " + me.name + ", o femeie: când te adresezi ei sau vorbești despre ea, folosește acordurile la feminin (de exemplu „ai fost atentă”, „candidata”), chiar dacă instrucțiunile sunt scrise la masculin.";
  }
  return { create, ITEM, DEFAULT, profileLine, addressLine };
})();
if (typeof module !== "undefined" && module.exports) module.exports = ServerAccount;
