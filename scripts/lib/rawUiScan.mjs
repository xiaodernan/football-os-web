// Raw-UI-text scanner: finds display strings that reach the interface without
// going through the dictionary. proof-i18n runs it over the app's source files,
// so a new hard-coded label fails the suite instead of becoming invisible the
// moment it leaves the screen it was typed on.
//
// Three positions reach the interface:
//   1. a JSX text node          <div>Related coverage</div>
//   2. a display prop or in-line expression   title="…" / {watching ? "★ Watching" : …}
//   3. a row carrying a label   { label: "Overall", … }
//
// The four rules below are each the answer to a wrong measurement, so they are
// listed with the case they exist for:
//   - a `<` only opens a tag where JSX can start (an opening element never follows
//     an identifier character), otherwise `useState<SimResult | null>` parses as an
//     element and the file's generics read as markup;
//   - inside JSX text a quote character is copy (`{e.minute}'`), not a string
//     delimiter, so only a `{…}` hole leaves the region into real code;
//   - an interpolated hole renders a value, so `${home.short} v ${away.short}`
//     carries no copy of its own and is measured as ` v `;
//   - the *tightest* region owns a literal, and text belongs to an element only
//     while one is open — otherwise `(a ? <b>x</b> : null)` reports ` : null` as
//     interface prose, and an outer prop swallows a nested element's own labels.
//
// Exemptions are deliberately narrow. A literal handed to t() at any argument
// position (`t(cond ? "a.key" : "b.key")`) is a key lookup, but only when it is
// shaped like a key: `t(row.note ?? "Written by hand")` is inside t() and still
// prints English. staticLookups is the matching audit — it returns what the
// exemption waved through so the caller can prove each one is a real key.

const DISPLAY_PROPS = new Set([
  "label", "title", "hint", "sub", "activeText", "idleText", "placeholder",
  "note", "fallbackNote", "fallbackLabel", "subtitle", "empty", "error",
  "retry", "action", "text", "desc", "description", "cta", "tooltip", "message",
  // An aria-label is read aloud to a screen-reader user, so an untranslated one is the
  // same defect as an untranslated caption -- only less visible, because nothing on
  // screen ever shows it. These were invisible to the scan until M159.
  "aria-label",
]);
// Copy handed to the user through a function call rather than rendered as an element.
const CALL_COPY = /\b(?:toast|window\.alert|alert)\(\s*(?:"([^"]{4,})"|'([^']{4,})'|`([^`]{4,})`)/g;
const ROW_PROPS = ["label", "title", "hint", "sub", "text", "desc", "note"];

function stripComments(s) {
  let out = "";
  let i = 0;
  while (i < s.length) {
    if (s[i] === "/" && s[i + 1] === "/") {
      const n = s.indexOf("\n", i);
      i = n < 0 ? s.length : n;
      continue;
    }
    if (s[i] === "/" && s[i + 1] === "*") {
      const e = s.indexOf("*/", i + 2);
      const end = e < 0 ? s.length : e + 2;
      out += s.slice(i, end).replace(/[^\n]/g, " ");
      i = end;
      continue;
    }
    out += s[i];
    i++;
  }
  return out;
}

// s[i] is a quote; index just past the closing quote. Tracks ${} so a brace in an
// interpolation does not end the template, and stops at a newline inside a
// non-template literal.
function skipQuoted(s, i) {
  const q = s[i];
  let j = i + 1;
  while (j < s.length) {
    const c = s[j];
    if (c === "\\") j += 2;
    else if (c === q) return j + 1;
    else if (q === "`" && c === "$" && s[j + 1] === "{") {
      let d = 1;
      j += 2;
      while (j < s.length && d > 0) {
        if (s[j] === "{") d++;
        else if (s[j] === "}") d--;
        else if (/["'`]/.test(s[j])) j = skipQuoted(s, j) - 1;
        j++;
      }
      continue;
    } else if (q !== "`" && c === "\n") return j;
    j++;
  }
  return j;
}

// index of the "}" closing the "{" at `from`
function valueEnd(s, from, to) {
  let d = 0;
  let j = from;
  while (j < to) {
    if (s[j] === "{") d++;
    else if (s[j] === "}") {
      d--;
      if (!d) return j;
    } else if (/["'`]/.test(s[j])) j = skipQuoted(s, j) - 1;
    j++;
  }
  return to;
}

const TAG_OPEN = (s, i) =>
  s[i] === "<" &&
  (s[i + 1] === "/" ||
    (/[A-Za-z_!>]/.test(s[i + 1] ?? "") && !/[A-Za-z0-9_$]/.test(s[i - 1] ?? "")));

// Collect tag (attribute) and child regions. An attribute's `{…}` value is walked
// as code, so a nested element is a region of its own rather than prose belonging
// to the outer prop.
function walk(s, from, to, tags, kids) {
  let inTag = false;
  let tagStart = -1;
  let childStart = -1;
  let regionDepth = 0;
  let brace = 0;
  let elem = 0;
  let depth = 0;
  let i = from;
  const endChild = (at) => {
    if (childStart >= 0) kids.push([childStart, at]);
    childStart = -1;
  };
  while (i < to) {
    const c = s[i];
    if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) {
      depth--;
      if (!inTag && childStart >= 0 && depth < regionDepth) {
        endChild(i);
        i++;
        continue;
      }
    } else if (c === ";" && !inTag && childStart >= 0 && depth <= regionDepth) {
      endChild(i);
      i++;
      continue;
    }
    if (!inTag) {
      if (TAG_OPEN(s, i)) {
        endChild(i);
        inTag = true;
        tagStart = i;
        brace = 0;
        i++;
        continue;
      }
      if (childStart >= 0) {
        // JSX text: a quote character is copy, never a string delimiter, so only
        // a `{…}` hole leaves the region and enters code.
        if (c === `{`) {
          const e = valueEnd(s, i, to);
          walk(s, i + 1, e, tags, kids);
          depth--;
          i = e + 1;
          continue;
        }
        i++;
        continue;
      }
      if (c === `"` || c === "'" || c === "`") {
        i = skipQuoted(s, i);
        continue;
      }
      i++;
      continue;
    }
    if (c === `"` || c === "'" || c === "`") {
      i = skipQuoted(s, i);
      continue;
    }
    if (c === "{") brace++;
    else if (c === "}") brace--;
    else if (c === ">" && brace === 0 && s[i - 1] !== "=") {
      const tEnd = i + 1;
      tags.push([tagStart, tEnd]);
      // a value expression may itself contain elements
      let k = tagStart;
      while (k < tEnd) {
        if (s[k] === "{") {
          const e = valueEnd(s, k, tEnd);
          walk(s, k + 1, e, tags, kids);
          k = e + 1;
          continue;
        }
        if (/["'`]/.test(s[k])) {
          k = skipQuoted(s, k);
          continue;
        }
        k++;
      }
      inTag = false;
      const isClosing = s[tagStart + 1] === "/";
      const isSelf = !isClosing && s[i - 1] === "/";
      if (isClosing) elem = Math.max(0, elem - 1);
      else if (!isSelf) elem++;
      childStart = elem > 0 ? tEnd : -1;
      regionDepth = depth;
      i = tEnd;
      continue;
    }
    i++;
  }
  if (inTag) tags.push([tagStart, to]);
  endChild(to);
}

const holeless = (t) => t.replace(/\$\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, "");

function literals(s, a, b) {
  const out = [];
  let i = a;
  while (i < b) {
    if (s[i] === `"` || s[i] === "'" || s[i] === "`") {
      const end = skipQuoted(s, i);
      const body = s.slice(i + 1, Math.max(i + 1, end - 1));
      const text = s[i] === "`" ? holeless(body) : body;
      out.push({ start: i, text, body });
      i = end;
      continue;
    }
    i++;
  }
  return out;
}

const PLACEHOLDER = /^\{\s*[a-zA-Z_]\w*\}$/;
const hasProse = (t) => /[\p{Script=Han}]/u.test(t) || /[\p{L}]{3}/u.test(t);
const KEY_SHAPE = /^[A-Za-z0-9_.$-]+$/;
const closesTCall = (s, start) => {
  let d = 0;
  for (let i = start - 1; i >= 0; i--) {
    const c = s[i];
    if (")]}".includes(c)) d++;
    else if (c === "(") {
      if (d > 0) {
        d--;
        continue;
      }
      const prev = s[i - 1];
      // A grouping paren — `(a ? "x" : "y")` — carries no callee, so the literal
      // still belongs to whatever encloses it: keep looking one level out.
      if (!prev || !/[A-Za-z0-9_$)\]]/.test(prev)) continue;
      return /(?:^|[^A-Za-z0-9_$.])t\($/.test(s.slice(0, i + 1));
    } else if ("[{".includes(c)) return false;
  }
  return false;
};
const isTArg = (s, L) => KEY_SHAPE.test(L.text) && closesTCall(s, L.start);
// A literal being compared against is a data token, not copy: `side === "home"`.
const isDataToken = (s, start) => {
  const before = s.slice(Math.max(0, start - 12), start);
  const after = s.slice(start, Math.min(s.length, start + 40));
  return /(?:===|!==|==|!=|case)\s*$/.test(before) || /^\s*(?:===|!==|==|!=)/.test(after);
};
const ROW_KEY = new RegExp(
  "\\b(?:" + ROW_PROPS.join("|") + ")\\s*:\\s*(?:[^,;}\\n]{0,60}\\?\\s*)?$"
);
const skipLiteral = (s, L) =>
  !hasProse(L.text) ||
  PLACEHOLDER.test(L.text.trim()) ||
  isTArg(s, L) ||
  isDataToken(s, L.start) ||
  ROW_KEY.test(s.slice(Math.max(0, L.start - 80), L.start));
const ownedElsewhere = (pos, self, all) =>
  all.some(
    ([a, b]) =>
      a >= self[0] &&
      b <= self[1] &&
      (a > self[0] || b < self[1]) &&
      a <= pos &&
      pos < b
  );

function splitExprs(s, a, b) {
  const parts = [];
  let i = a;
  let textStart = a;
  while (i < b) {
    if (s[i] === `{`) {
      if (i > textStart) parts.push({ kind: "text", a: textStart, b: i });
      const end = valueEnd(s, i, b);
      parts.push({ kind: "expr", a: i + 1, b: Math.min(end, b) });
      i = end + 1;
      textStart = i;
      continue;
    }
    // No quote handling here on purpose: in JSX text an apostrophe is copy, not a
    // string delimiter. Every `{…}` was already consumed whole by valueEnd, so no
    // quoted expression can leak into this loop.
    i++;
  }
  if (b > textStart) parts.push({ kind: "text", a: textStart, b });
  return parts;
}

function regions(s) {
  const tags = [];
  const kids = [];
  walk(s, 0, s.length, tags, kids);
  return { tags, kids };
}

export function normalize(src) {
  return stripComments(src.replace(/\r\n/g, "\n"));
}

export function scanSource(src) {
  const s = normalize(src);
  const { tags, kids } = regions(s);
  const all = [...tags, ...kids];
  const hits = [];
  const unknown = new Set();

  // 2a. display props
  for (const tag of tags) {
    const [a, b] = tag;
    let i = a;
    while (i < b) {
      const m = /([A-Za-z][\w-]*)\s*=\s*/.exec(s.slice(i, b));
      if (!m) break;
      const name = m[1];
      const vs = i + m.index + m[0].length;
      if (s[vs] === `{`) {
        const end = valueEnd(s, vs, b);
        for (const L of literals(s, vs, end)) {
          if (ownedElsewhere(L.start, tag, all) || skipLiteral(s, L)) continue;
          if (DISPLAY_PROPS.has(name)) hits.push({ pos: L.start, kind: "attr:" + name, text: L.text });
          else unknown.add(name);
        }
        i = end + 1;
        continue;
      }
      if (s[vs] === `"` || s[vs] === "'") {
        const end = skipQuoted(s, vs);
        const text = s.slice(vs + 1, end - 1);
        // A raw `title="…"` attribute is display text by construction, so no
        // exemption applies here.
        if (DISPLAY_PROPS.has(name) && hasProse(text))
          hits.push({ pos: vs, kind: "attr:" + name, text });
        else if (!DISPLAY_PROPS.has(name)) unknown.add(name);
        i = end;
        continue;
      }
      i = vs;
    }
  }

  // 1 + 2b. JSX children: text nodes and expression literals
  for (const kid of kids) {
    for (const part of splitExprs(s, kid[0], kid[1])) {
      if (part.kind === "text") {
        const text = s.slice(part.a, part.b).replace(/\s+/g, " ").trim();
        if (text && hasProse(text) && !ownedElsewhere(part.a, kid, all))
          hits.push({ pos: part.a, kind: "text", text });
        continue;
      }
      for (const L of literals(s, part.a, part.b)) {
        if (ownedElsewhere(L.start, kid, all) || skipLiteral(s, L)) continue;
        hits.push({ pos: L.start, kind: "child", text: L.text });
      }
    }
  }

  // 3. a row carrying a display label instead of a key
  const BT = String.fromCharCode(96);
  const rowRe = new RegExp(
    "\\b(" + ROW_PROPS.join("|") + ")\\s*:\\s*(?:[^,;}\\n]{0,60}\\?\\s*)?([\"'" + BT + "])([^\"'" + BT + "]*)\\2",
    "g"
  );
  for (const m of s.matchAll(rowRe)) {
    const text = m[2] === BT ? holeless(m[3]) : m[3];
    if (!hasProse(text)) continue;
    hits.push({ pos: m.index, kind: "row:" + m[1], text });
  }

  // Copy handed straight to the user through a function call. It is neither JSX text nor
  // a display attribute, so none of the positions above can see it: a toast that says
  // "Player sold" in English is as untranslated as a caption that does, and was invisible
  // to this scanner until M159 counted it.
  for (const m of s.matchAll(CALL_COPY)) {
    const text = m[1] ?? m[2] ?? m[3];
    if (!hasProse(text)) continue;
    hits.push({ pos: m.index, kind: "call", text });
  }

  const seen = new Set();
  const uniq = hits
    .sort((x, y) => x.pos - y.pos)
    .filter((h) => {
      if (seen.has(h.pos)) return false;
      seen.add(h.pos);
      return true;
    });
  return { hits: uniq, unknown: [...unknown].sort() };
}

export function scanFile(file, read) {
  return scanSource(read(file));
}

// Every literal the t() exemption treats as a dictionary lookup, in source order.
// Whether each one really is a key is the caller's check — this only says what the
// gate chose not to report, so an exemption can never widen silently.
export function lookupsIn(src) {
  const s = normalize(src);
  const out = [];
  for (const L of literals(s, 0, s.length)) {
    if (L.body.includes("$") || !KEY_SHAPE.test(L.text)) continue;
    // `{t(cond === "dark" ? "a" : "b")}` — the compared value sits inside the t()
    // text but is not one of its arguments.
    if (isDataToken(s, L.start)) continue;
    if (!closesTCall(s, L.start)) continue;
    out.push(L.body);
  }
  return out;
}
