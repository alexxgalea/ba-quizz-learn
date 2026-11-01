// Referințele de schelet JavaScript.
// Fiecare secțiune „=== s-… ===” ajunge în aplicație
// (build.mjs); testele sunt în skel_js.test.mjs.
// `export`-urile stau după secțiune, ca să nu
// încarce codul de scris din memorie.

// === s-frontend-closure ===
function makeCounter(start = 0) {
  // privat: doar closure-urile de mai jos
  // văd `n`, nimic din afară
  let n = start;
  return {
    inc() {
      return ++n;
    },
    dec() {
      return --n;
    },
    value() {
      return n;
    },
  };
}
// === end ===

export { makeCounter };
