// Comentariile `// → …` și `// ! Tip` din blocurile JavaScript / TypeScript ale desfășurărilor, citite ca în desf_run.py (cu tokenize):
// doar comentariile adevărate, nu un `//` din interiorul unui șir, al unui șablon (`…`) sau al unui comentariu bloc.
// Nu înțelege literalele regex și nici `${…}` imbricat în șabloane: nu apar în exemple.
export const ARROW = /^\/\/\s*→\s?(.*)$/;
export const BANG = /^\/\/\s*!\s*([A-Za-z_$][\w$.]*)\s*$/;

// [{ line, text }], cu text = comentariul întreg, de la `//` până la capătul rândului.
export function scanComments(src) {
  const out = [];
  let line = 1, q = null, i = 0;
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (q) {
      if (c === "\\") { if (n === "\n") line++; i += 2; continue; }
      if (c === "\n") { line++; if (q !== "`") q = null; } else if (c === q) q = null;
      i++; continue;
    }
    if (c === "\n") { line++; i++; continue; }
    if (c === '"' || c === "'" || c === "`") { q = c; i++; continue; }
    if (c === "/" && n === "*") {
      const end = src.indexOf("*/", i + 2), stop = end < 0 ? src.length : end + 2;
      for (const ch of src.slice(i, stop)) if (ch === "\n") line++;
      i = stop; continue;
    }
    if (c === "/" && n === "/") {
      const end = src.indexOf("\n", i), stop = end < 0 ? src.length : end;
      out.push({ line, text: src.slice(i, stop).trimEnd() });
      i = stop; continue;
    }
    i++;
  }
  return out;
}

// { arrows: Map(rând → text), marks: Map(rând → Tip) }
export function readMarks(src) {
  const arrows = new Map(), marks = new Map();
  for (const c of scanComments(src)) {
    let m = c.text.match(ARROW); if (m) arrows.set(c.line, m[1].trimEnd());
    m = c.text.match(BANG); if (m) marks.set(c.line, m[1]);
  }
  return { arrows, marks };
}
