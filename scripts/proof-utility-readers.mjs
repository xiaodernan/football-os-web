// M455: the eighth direction of the dead-code boundary -- a stylesheet declaration no reader can
// see. M454 read the custom properties the sheet declares; this gate reads the declarations that
// *produce* names the rest of the app can use: an `@utility` block (Tailwind 4 generates exactly
// that class, no derivation), a `@keyframes` block (read by an `animation` / `animation-name` value,
// or by a `@theme --animate-*` value), and a plain class selector (read wherever the class token
// appears in markup or a class string). An at-rule header is not a reader, and a selector-shaped
// string (".foo") is not a class token. A declaration whose reader this census cannot derive is
// charged, never exempted.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const stripComments = (text) => {
  let out = "", i = 0, mode = null;
  while (i < text.length) {
    const c = text[i], d = text[i + 1];
    if (mode === "line") { if (c === "\n") { mode = null; out += c; } else out += " "; i++; continue; }
    if (mode === "block") { if (c === "*" && d === "/") { mode = null; out += "  "; i += 2; } else { out += c === "\n" ? "\n" : " "; i++; } continue; }
    if (mode === "sq" || mode === "dq" || mode === "tpl") {
      out += c;
      if (c === "\\") { out += d ?? ""; i += 2; continue; }
      if ((mode === "sq" && c === "'") || (mode === "dq" && c === '"') || (mode === "tpl" && c === "`")) mode = null;
      i++; continue;
    }
    if (c === "/" && d === "/") { mode = "line"; out += "  "; i += 2; continue; }
    if (c === "/" && d === "*") { mode = "block"; out += "  "; i += 2; continue; }
    if (c === "'") mode = "sq"; else if (c === '"') mode = "dq"; else if (c === "`") mode = "tpl";
    out += c; i++;
  }
  return out;
};

const SKIP = new Set(["node_modules", "dist", ".git", "football-os", "test-results", "vendor"]);
const CODE_EXT = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".css", ".html"]);
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? (SKIP.has(e.name) ? [] : walk(join(d, e.name))) : [join(d, e.name)]);

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// A class token starts after whitespace, a quote, a variant colon, `>`/`!`; ends before whitespace,
// a quote, a closing bracket/brace/paren, a variant colon, an opacity slash, `;`, or important `!`.
// A leading dot is NOT a boundary, so a `.foo` selector (or a selector-shaped string) is not a
// token; the token has to be written where a class name actually goes.
const CLASS_BEFORE = "(?:^|[\\s\"'`:{[(,;>!])";
const CLASS_AFTER = "(?=$|[\\s\"'`\\]}):/,;!])";
const classRe = (stem) => new RegExp(CLASS_BEFORE + escapeRe(stem) + CLASS_AFTER, "m");

// The at-rule header names a declaration; it must not read its own declaration. Blank out header
// names before scanning for class tokens, keeping newlines so line-shaped scans still work.
const headerBlank = (text) => text.replace(/@(?:utility|keyframes)\s+[A-Za-z_][\w-]*/g, (m) => m.replace(/[^\n]/g, " "));

const atBlocks = (code, kind) => {
  const out = [];
  const re = new RegExp(`@${kind}\\s+([A-Za-z_][\\w-]*)\\s*\\{`, "g");
  let m;
  while ((m = re.exec(code))) {
    const open = code.indexOf("{", m.index);
    let depth = 0, end = -1;
    for (let i = open; i < code.length; i++) {
      if (code[i] === "{") depth++;
      else if (code[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
    }
    out.push({ name: m[1], unbalanced: end < 0, body: end < 0 ? code.slice(open + 1) : code.slice(open + 1, end) });
    if (end < 0) break;
    re.lastIndex = end + 1;
  }
  return out;
};

// `.foo` at a selector position: start of the sheet, after `{`/`}`/`,`, followed by `{`, `,` or `:`.
const SELECTOR_RE = /(?:^|[\n{},])\s*\.([A-Za-z_][\w-]*)\s*(?=[{,:])/g;
const ANIMATION_RE = /(?:^|[\s;{"'`])(?:animation|animation-name|animationName)\s*:\s*([^;}]*)/g;
const ANIMATE_TOKEN_RE = /--animate-[\w-]+\s*:\s*([^;}]*)/g;
const idents = (value) => value.match(/[A-Za-z_][\w-]*/g) ?? [];

const census = (cssEntries, codeEntries) => {
  const declarations = [];
  const seen = new Set();
  const push = (kind, name, rel) => {
    const key = `${kind}:${name}`;
    if (seen.has(key)) return;
    seen.add(key);
    declarations.push({ kind, name, files: [rel] });
  };
  const broken = [];
  let atBlocksRead = 0, classSelectors = 0;
  for (const { rel, text } of cssEntries) {
    const code = stripComments(text);
    const opens = (code.match(/\{/g) ?? []).length;
    const closes = (code.match(/\}/g) ?? []).length;
    if (opens !== closes) broken.push(`${rel} (${opens} { vs ${closes} })`);
    for (const kind of ["utility", "keyframes"]) {
      for (const b of atBlocks(code, kind)) {
        atBlocksRead++;
        if (b.unbalanced) broken.push(`${rel} (@${kind} ${b.name} unbalanced)`);
        push(kind, b.name, rel);
      }
    }
    for (const m of code.matchAll(SELECTOR_RE)) { classSelectors++; push("class", m[1], rel); }
  }

  const classReaders = new Map(); // "kind:name" -> Set(rel)
  const keyframeReaders = new Map(); // name -> Set(rel)
  const readClass = (key, rel) => {
    if (!classReaders.has(key)) classReaders.set(key, new Set());
    classReaders.get(key).add(rel);
  };
  const readKeyframe = (name, rel) => {
    if (!keyframeReaders.has(name)) keyframeReaders.set(name, new Set());
    keyframeReaders.get(name).add(rel);
  };

  for (const { rel, text } of [...cssEntries, ...codeEntries]) {
    const isCss = rel.toLowerCase().endsWith(".css");
    const code = stripComments(text);
    const classScan = isCss ? headerBlank(code) : code;
    for (const d of declarations) {
      if (d.kind === "keyframes") continue;
      if (classRe(d.name).test(classScan)) readClass(`${d.kind}:${d.name}`, rel);
    }
    for (const m of code.matchAll(ANIMATION_RE)) for (const id of idents(m[1])) readKeyframe(id, rel);
    if (isCss) for (const m of code.matchAll(ANIMATE_TOKEN_RE)) for (const id of idents(m[1])) readKeyframe(id, rel);
  }

  const unread = [];
  for (const d of declarations) {
    const readers = d.kind === "keyframes" ? keyframeReaders.get(d.name) : classReaders.get(`${d.kind}:${d.name}`);
    if (!readers || readers.size === 0) unread.push(`${d.kind} ${d.name}`);
  }
  const countKind = (kind) => declarations.filter((d) => d.kind === kind).length;
  return {
    declarations, unread, broken, atBlocksRead, classSelectors,
    utilities: countKind("utility"), keyframes: countKind("keyframes"), classes: countKind("class"),
    classReadDecls: declarations.filter((d) => d.kind !== "keyframes" && (classReaders.get(`${d.kind}:${d.name}`)?.size ?? 0) > 0).length,
    keyframeReadDecls: declarations.filter((d) => d.kind === "keyframes" && (keyframeReaders.get(d.name)?.size ?? 0) > 0).length,
  };
};

// --- 1. The reader, planted both ways: a variant/opacity class reads a utility, a class attribute
// --- reads a plain class, an animation value reads a keyframe; the at-rule header, a comment, a
// --- selector-shaped string, and a bare selector read nothing. ---------------------------------
const FIXTURE_CSS = [
  {
    rel: "fixture/sheet.css",
    text: [
      "@utility fixture-live { color: red; }",
      "@utility fixture-ghost { color: blue; }",
      "@utility fixture-alone { color: pink; }",
      "@keyframes fixture-motion { to { opacity: 1; } }",
      "@keyframes fixture-still { to { opacity: 0; } }",
      ".fixture-class { color: green; }",
      ".fixture-dark { color: black; }",
      ".fixture-dotted { color: teal; }",
    ].join("\n"),
  },
];
const FIXTURE_CODE = [
  { rel: "fixture/sample.tsx", text: 'const a = "hover:fixture-live/80";\nconst b = "fixture-class";\nconst c = "animation: fixture-motion 1s";\nconst d = ".fixture-dotted";\n// fixture-ghost\n// animation: fixture-still\n' },
];
const fixture = census(FIXTURE_CSS, FIXTURE_CODE);
const fixtureUnread = fixture.unread.join(",");
ok(`the reader charges declarations neither axis reads (unread [${fixtureUnread}]; ${fixture.utilities} utilities, ${fixture.keyframes} keyframes, ${fixture.classes} class selectors; ${fixture.classReadDecls} read by a class, ${fixture.keyframeReadDecls} by an animation)`,
  fixtureUnread === "utility fixture-ghost,utility fixture-alone,keyframes fixture-still,class fixture-dark,class fixture-dotted" &&
  fixture.utilities === 3 && fixture.keyframes === 2 && fixture.classes === 3 &&
  fixture.classReadDecls === 2 && fixture.keyframeReadDecls === 1 && fixture.broken.length === 0);

// --- 2. Every declaration the sheet makes has a reader: a class token for `@utility` and plain
// --- class selectors, an animation value for `@keyframes`. Population floors keep a green from
// --- being a scan of nothing. ----------------------------------------------------------------
const files = walk(root).map((f) => f.slice(root.length + 1).split("\\").join("/"));
const codeEntries = files.filter((f) => CODE_EXT.has(extname(f).toLowerCase()))
  .map((rel) => ({ rel, text: readFileSync(join(root, rel), "utf8") }));
const cssEntries = codeEntries.filter((e) => e.rel.toLowerCase().endsWith(".css"));
const tree = census(cssEntries, codeEntries);
ok(`every declaration the sheet makes has a reader (${tree.declarations.length} declared: ${tree.utilities} @utility, ${tree.keyframes} @keyframes, ${tree.classes} class selectors; ${tree.classReadDecls} read through a class, ${tree.keyframeReadDecls} through an animation; ${tree.unread.length} unread: ${tree.unread.join(", ") || "none"})`,
  tree.unread.length === 0 && tree.utilities >= 4 && tree.keyframes >= 2 && tree.classes >= 3 &&
  tree.classReadDecls >= 5 && tree.keyframeReadDecls >= 2 && codeEntries.length >= 250);

// --- 3. Parse health: every at-rule block and every class selector is found, the tree's sheets are
// --- balanced, and a sheet with an unclosed block is charged. --------------------------------
const brokenFixture = census([{ rel: "fixture/broken.css", text: "@utility fixture-x { color: red;\n.fixture-y { color: blue;\n" }], []);
ok(`the census reads the sheet and charges a broken one (${tree.atBlocksRead} at-rule block(s) and ${tree.classSelectors} class selector(s) over ${cssEntries.length} sheet(s), ${codeEntries.length} code files; ${tree.broken.length} broken: ${tree.broken.join(", ") || "none"}; broken fixture ${brokenFixture.broken.length} charge(s))`,
  tree.atBlocksRead >= 6 && tree.classSelectors >= 3 && cssEntries.length >= 1 &&
  tree.broken.length === 0 && brokenFixture.broken.length > 0 && codeEntries.length >= 250);

// --- 4. No per-name exemption. The gate quotes no declared name in a skip set, and a planted skip
// --- list is charged. -----------------------------------------------------------------------
const selfSource = stripComments(readFileSync(fileURLToPath(import.meta.url), "utf8"));
const declaredNames = [...new Set(tree.declarations.map((d) => d.name))];
const exemptionHits = (text) => {
  const hits = new Set();
  for (const m of text.matchAll(/new\s+Set\s*\(\s*\[([\s\S]*?)\]\s*\)/g)) {
    for (const q of m[1].matchAll(/["'`]([^"'`]+)["'`]/g)) if (declaredNames.includes(q[1])) hits.add(q[1]);
  }
  return [...hits];
};
const selfHits = exemptionHits(selfSource);
const planted = `const SKIP_NAMES = new Set(["${declaredNames[0]}"]);`;
ok(`the gate carries no per-name exemption (${selfHits.length} declared name(s) in a skip set; a planted skip list names ${exemptionHits(planted).length})`,
  selfHits.length === 0 && exemptionHits(planted).length === 1);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
