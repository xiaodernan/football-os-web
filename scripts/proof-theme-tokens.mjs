// M454: the seventh direction of the dead-code boundary -- a theme token no reader can see. M432
// asks whether a declared package has a reader; M451 asks the reverse for imports; this gate asks
// the question of the custom properties the stylesheets declare. Two axes can read one: `var(--x)`
// anywhere, and the Tailwind utility class a `@theme` name generates (`bg-card`, `rounded-lg`,
// `font-sans`). Neither a comment nor a longer class that merely starts with the stem is a reader.
// A `@theme` namespace this gate does not model is refused rather than guessed, so a token whose
// readers the census cannot derive is never charged.
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
// a quote, a closing bracket/brace/paren, a variant colon, an opacity slash, or important `!`.
const CLASS_BEFORE = "(?:^|[\\s\"'`:{[(,;>!])";
const CLASS_AFTER = "(?=$|[\\s\"'`\\]}):/,!])";
const classRe = (stem) => new RegExp(CLASS_BEFORE + escapeRe(stem) + CLASS_AFTER, "m");

// Tailwind 4 derives utility families from a @theme name's namespace. Only these are modelled; a
// namespace outside the map is reported and refused, and its token is never charged as unread.
const NAMESPACES = {
  color: ["bg", "text", "border", "ring", "ring-offset", "fill", "stroke", "from", "via", "to", "outline", "divide", "placeholder", "accent", "caret", "decoration", "shadow"],
  radius: ["rounded"],
  font: ["font"],
};
const stemsFor = (token) => {
  const m = /^--(color|radius|font)-(.+)$/.exec(token);
  return m ? NAMESPACES[m[1]].map((family) => `${family}-${m[2]}`) : null;
};

const blockAt = (text, header) => {
  const m = header.exec(text);
  if (!m) return null;
  const open = text.indexOf("{", m.index);
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") { depth--; if (depth === 0) return { body: text.slice(open + 1, i) }; }
  }
  return { body: text.slice(open + 1), unbalanced: true };
};
const declRe = /(^|[\s{;])(--[A-Za-z0-9-]+)\s*:/g;
const declsIn = (body) => [...(body ?? "").matchAll(declRe)].map((m) => m[2]);

const census = (cssEntries, codeEntries) => {
  const declared = new Map(); // token -> { theme: boolean, root: boolean }
  const broken = [];
  let blocks = 0;
  for (const { rel, text } of cssEntries) {
    const code = stripComments(text);
    const opens = (code.match(/\{/g) ?? []).length;
    const closes = (code.match(/\}/g) ?? []).length;
    if (opens !== closes) broken.push(`${rel} (${opens} { vs ${closes} })`);
    const themed = blockAt(code, /^\s*@theme\b[^{]*\{/m);
    const light = blockAt(code, /^\s*:root\s*\{/m);
    const dark = blockAt(code, /^\s*\.dark\s*\{/m);
    if (!themed || !light || !dark) broken.push(`${rel} (missing ${[!themed && "@theme", !light && ":root", !dark && ".dark"].filter(Boolean).join(", ")})`);
    for (const body of [light, dark]) {
      if (!body) continue;
      blocks++;
      if (body.unbalanced) broken.push(`${rel} (unbalanced ${body === light ? ":root" : ".dark"})`);
      for (const t of declsIn(body.body)) {
        const e = declared.get(t) ?? { theme: false, root: false };
        e.root = true; declared.set(t, e);
      }
    }
    if (themed) {
      blocks++;
      for (const t of declsIn(themed.body)) {
        const e = declared.get(t) ?? { theme: false, root: false };
        e.theme = true; declared.set(t, e);
      }
    }
  }

  const varReaders = new Map();
  const classReaders = new Map();
  for (const { rel, text } of [...cssEntries, ...codeEntries]) {
    const code = stripComments(text);
    for (const m of code.matchAll(/var\(\s*(--[A-Za-z0-9-]+)/g)) {
      if (!varReaders.has(m[1])) varReaders.set(m[1], new Set());
      varReaders.get(m[1]).add(rel);
    }
    for (const [token, entry] of declared) {
      if (!entry.theme) continue;
      const stems = stemsFor(token);
      if (!stems) continue;
      if (stems.some((stem) => classRe(stem).test(code))) {
        if (!classReaders.has(token)) classReaders.set(token, new Set());
        classReaders.get(token).add(rel);
      }
    }
  }

  const unread = [], unmodelled = [];
  for (const [token, entry] of declared) {
    if (entry.theme && !stemsFor(token)) { unmodelled.push(token); continue; }
    const vars = varReaders.get(token)?.size ?? 0;
    const classes = entry.theme ? classReaders.get(token)?.size ?? 0 : 0;
    if (vars === 0 && classes === 0) unread.push(token);
  }
  return {
    declared, unread: unread.sort(), unmodelled: unmodelled.sort(), broken, blocks,
    varTokens: [...varReaders.keys()].filter((t) => declared.has(t)).length,
    classTokens: [...classReaders.keys()].filter((t) => declared.has(t)).length,
  };
};

// --- 1. The reader, planted both ways: a class reads a @theme token, var() reads either kind, a --
// --- comment and a longer class do not, and an unmodelled namespace is refused rather than charged.
const FIXTURE_CSS = [
  {
    rel: "fixture/tokens.css",
    text: [
      ":root {",
      "  --root-read: #fff;",
      "  --root-ghost: #000;",
      "}",
      ".dark {",
      "  --root-read: #111;",
      "}",
      "@theme inline {",
      "  --color-known: var(--root-read);",
      "  --color-varread: #123;",
      "  --color-ghost: #456;",
      "  --radius-known: 0.5rem;",
      "  --font-known: sans-serif;",
      "  --spacing-x: 1rem;",
      "}",
    ].join("\n"),
  },
];
const FIXTURE_CODE = [
  { rel: "fixture/sample.tsx", text: 'const a = "hover:bg-known/80";\nconst b = "rounded-known";\nconst c = "font-known";\nconst d = "bg-ghostly";\n// bg-ghost\n// var(--color-ghost)\nconst e = "var(--color-varread)";\n' },
];
const fixture = census(FIXTURE_CSS, FIXTURE_CODE);
const fixtureUnread = fixture.unread.join(",");
const fixtureUnmodelled = fixture.unmodelled.join(",");
ok(`the reader charges tokens neither axis reads (unread [${fixtureUnread}]; unmodelled [${fixtureUnmodelled}]; ${fixture.varTokens} token(s) read through var(), ${fixture.classTokens} through a class)`,
  fixtureUnread === "--color-ghost,--root-ghost" && fixtureUnmodelled === "--spacing-x" &&
  fixture.varTokens === 2 && fixture.classTokens === 3 && fixture.broken.length === 0);

// --- 2. Every declared token has a reader: var(--x) anywhere, or the utility class its @theme ----
// --- namespace generates. The population floors keep a green from being a scan of nothing. --------
const files = walk(root).map((f) => f.slice(root.length + 1).split("\\").join("/"));
const codeEntries = files.filter((f) => CODE_EXT.has(extname(f).toLowerCase()))
  .map((rel) => ({ rel, text: readFileSync(join(root, rel), "utf8") }));
const cssEntries = codeEntries.filter((e) => e.rel.toLowerCase().endsWith(".css"));
const tree = census(cssEntries, codeEntries);
const themeDeclared = [...tree.declared.values()].filter((e) => e.theme).length;
ok(`every declared custom property has a reader (${tree.declared.size} declared, ${themeDeclared} of them @theme; ${tree.varTokens} read through var(), ${tree.classTokens} through a utility class; ${tree.unread.length} unread: ${tree.unread.join(", ") || "none"})`,
  tree.unread.length === 0 && tree.declared.size >= 60 && themeDeclared >= 30 &&
  tree.varTokens >= 30 && tree.classTokens >= 30 && codeEntries.length >= 250);

// --- 3. Coverage and parse health: the three theme blocks are found, every @theme namespace is ---
// --- modelled, the tree's sheets are balanced, and a broken sheet is charged. --------------------
const brokenFixture = census([{ rel: "fixture/broken.css", text: ":root { --x: #fff;\n@theme inline { --color-y: #000; }\n" }], []);
ok(`the census reads the theme and charges a broken sheet (${tree.blocks} blocks over ${cssEntries.length} sheet(s), ${codeEntries.length} code files; ${tree.broken.length} broken: ${tree.broken.join(", ") || "none"}; ${tree.unmodelled.length} unmodelled @theme namespace(s): ${tree.unmodelled.join(", ") || "none"}; broken fixture ${brokenFixture.broken.length} charge(s))`,
  tree.blocks === 3 && cssEntries.length >= 1 && tree.broken.length === 0 && tree.unmodelled.length === 0 &&
  brokenFixture.broken.length > 0 && codeEntries.length >= 250);

// --- 4. No per-token exemption. The gate quotes no declared token in a skip set, and a planted --
// --- skip list is charged. -----------------------------------------------------------------------
const selfSource = stripComments(readFileSync(fileURLToPath(import.meta.url), "utf8"));
const declaredNames = [...tree.declared.keys()];
const exemptionHits = (text) => {
  const hits = new Set();
  for (const m of text.matchAll(/new\s+Set\s*\(\s*\[([\s\S]*?)\]\s*\)/g)) {
    for (const q of m[1].matchAll(/["'`]([^"'`]+)["'`]/g)) if (declaredNames.includes(q[1])) hits.add(q[1]);
  }
  return [...hits];
};
const selfHits = exemptionHits(selfSource);
const planted = `const SKIP_TOKENS = new Set(["${declaredNames[0]}"]);`;
ok(`the gate carries no per-token exemption (${selfHits.length} declared token(s) in a skip set; a planted skip list names ${exemptionHits(planted).length})`,
  selfHits.length === 0 && exemptionHits(planted).length === 1);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
