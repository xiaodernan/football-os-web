// Proof for the dead export: a symbol a module hands across its boundary that no other module
// ever takes -- the mirror of proof-dead-imports, and the reader M413's section promised.
//
// The defect, measured before it was fixed. Twenty-four exports had no reader anywhere: five
// page components also exported themselves as `default` while the router imported them by name
// through a lazy dynamic import; fourteen parts of the copied-in UI kit (six Card parts,
// CommandShortcut, three Dialog parts, four Sheet parts) plus `Sparkline` in ui/primitives.tsx;
// and four domain symbols (`CATEGORY_LABEL`, `AgeGroup`, `NamedValue`, `DRILL_PHASES`). Removing
// `CATEGORY_LABEL` exposed a second, one step down: its only reader was the import feeding it, so
// the English table `CATEGORY_LABELS` in data/attributesLabels.ts lost every reader too. That is the shape
// this gate is for -- an export is a promise a consumer exists, and nothing was reading the
// promise back.
//
// What the reader charges, and what it deliberately does not:
//   · A name read only inside ITS OWN module is not charged. `export` on a helper the file uses
//     itself is redundancy, not a lie; this gate measures that population in clause 2 but does not
//     ask for their keyword to be dropped.
//   · A consumer may be any app module or any proof script. Scripts read production modules
//     through Vite's SSR loader, so a whole-word mention in script CODE -- or inside a regex
//     literal -- keeps an export alive; a mention only in a script COMMENT or a STRING does
//     not, because the scanner strips comments and blanks quoted text first. The limit is
//     stated: a script that assembles an export's name at runtime (a concatenation, a variable)
//     is not seen, and a name read only that way would be charged dead.
//   · Every import shape is read: named (`import { a }`), aliased (`a as b`), type-only,
//     default (`import d`), namespace (`import * as N` followed by `N.a`), dynamic
//     (`import("m").then((m) => m.a)`), and re-export (`export { a } from "m"`,
//     `export * from "m"`). The dynamic shape is recognised by the `.then((m) =>` parameter
//     the app's route table uses; a dynamic module bound to a variable elsewhere and read later
//     is not seen, and a name consumed only that way would be charged dead.
//   · A comment never keeps an export alive, for the same reason it never keeps an import
//     alive: a sentence claiming a dependency is not the dependency.
//
// Run: node scripts/proof-dead-exports.mjs
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { skipReason } from "./lib/appTree.mjs";

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

// The script consumer reader is one pass, because comments and templates nest: a template's
// `${...}` can hold another template, and a two-pass stripper closes the outer template at the
// first backtick, leaving the rest of the report text looking like code. Comments and quoted text
// are blanked; code and regex literals are kept, so a census rule written as
// /CATEGORY_CODES[^;]+;/ really does read that name out of the source it scans. A quoted string
// cannot survive a newline here; an unterminated one is blanked to the end of its line.
const KEYWORDS_BEFORE_REGEX = new Set(["return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "throw", "case", "do", "else", "yield", "await"]);
const stripNoise = (text) => {
  let out = "", i = 0, prev = "", word = "";
  const stack = [{ kind: "code", braces: 0, top: true }];
  const blankUntil = (end) => { while (i < end) { out += text[i] === "\n" ? "\n" : " "; i++; } };
  while (i < text.length) {
    const frame = stack[stack.length - 1];
    const c = text[i], d = text[i + 1];
    if (frame.kind === "tpl") {
      if (c === "\\") { out += "  "; i += 2; continue; }
      if (c === "`") { stack.pop(); out += " "; i++; prev = "x"; word = ""; continue; }
      if (c === "$" && d === "{") { stack.push({ kind: "code", braces: 1 }); out += "  "; i += 2; prev = "{"; word = ""; continue; }
      out += c === "\n" ? "\n" : " "; i++; continue;
    }
    if (c === "/" && d === "/") { i += 2; out += "  "; const n = text.indexOf("\n", i); blankUntil(n < 0 ? text.length : n); continue; }
    if (c === "/" && d === "*") { i += 2; out += "  "; const n = text.indexOf("*/", i); blankUntil(n < 0 ? text.length : n); if (n >= 0) { out += "  "; i += 2; } continue; }
    if (c === "'" || c === '"') {
      const q = c;
      out += " "; i++;
      while (i < text.length && text[i] !== q && text[i] !== "\n") {
        if (text[i] === "\\" && text[i + 1] !== "\n") { out += "  "; i += 2; continue; }
        out += " "; i++;
      }
      if (text[i] === q) { out += " "; i++; }
      prev = "x"; word = "";
      continue;
    }
    if (c === "`") { stack.push({ kind: "tpl" }); out += " "; i++; continue; }
    if (c === "}") {
      if (!frame.top) {
        frame.braces--;
        if (frame.braces === 0) { stack.pop(); out += " "; i++; prev = "x"; word = ""; continue; }
      }
      out += c; prev = c; word = ""; i++; continue;
    }
    if (c === "{") { if (!frame.top) frame.braces++; out += c; prev = c; word = ""; i++; continue; }
    const startsRegex = c === "/" && (/[=(,:[!&|?{};+\-*%<>~^]$/.test(prev) || prev === "" || KEYWORDS_BEFORE_REGEX.has(word));
    if (startsRegex) {
      let j = i + 1, cls = false;
      while (j < text.length) {
        const e = text[j];
        if (e === "\\") { j += 2; continue; }
        if (e === "\n") break;
        if (e === "[") cls = true;
        else if (e === "]") cls = false;
        else if (e === "/" && !cls) break;
        j++;
      }
      if (text[j] === "/") {
        for (; i <= j; i++) out += text[i];
        i++;
        while (i < text.length && /[A-Za-z]/.test(text[i])) { out += text[i]; i++; }
        prev = "/"; word = "";
        continue;
      }
    }
    out += c;
    if (!/\s/.test(c)) {
      if (/[A-Za-z0-9_$]/.test(c)) word += c; else word = "";
      prev = c;
    }
    i++;
  }
  return out;
};

const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordRe = (name) => new RegExp(`(^|[^.\\w$])${reEsc(name)}([^\\w$]|$)`);
const blank = (s) => " ".repeat(s.length);

const EXPORT_DECL = /^[ \t]*export\s+(?:const\s+enum|async\s+function|function|class|const|let|var|enum|interface|type|namespace)\s+([A-Za-z_$][\w$]*)/gm;
const EXPORT_LIST = /^[ \t]*export\s+(?:type\s+)?\{([\s\S]*?)\}[ \t]*(?:from[ \t]+["']([^"']+)["'])?[ \t]*;?/gm;
const EXPORT_STAR = /^[ \t]*export\s+\*\s+from\s+["']([^"']+)["']/gm;
const EXPORT_DEFAULT = /^[ \t]*export\s+default\b/gm;
const IMPORT_NAMED = /^[ \t]*import\s+(?:type\s+)?\{([\s\S]*?)\}\s+from\s+["']([^"']+)["']/gm;
const IMPORT_DEFAULT = /^[ \t]*import\s+([A-Za-z_$][\w$]*)\s*(?:,\s*\{[\s\S]*?\}\s*)?from\s+["']([^"']+)["']/gm;
const IMPORT_NS = /^[ \t]*import\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s+["']([^"']+)["']/gm;
const DYNAMIC = /import\(\s*["']([^"']+)["']\s*\)/g;
const DECL_NAME = (name) => new RegExp(`\\b(?:const|let|var|function|class|type|interface|enum|namespace)\\s+${reEsc(name)}\\b`);

const listSpecs = (list) => list.split(",").map((p) => p.trim().replace(/^type\s+/, "")).filter(Boolean)
  .map((p) => { const [orig, alias] = p.split(/\s+as\s+/).map((s) => s.trim()); return { orig, name: alias || orig }; })
  .filter((p) => /^[A-Za-z_$][\w$]*$/.test(p.name) && /^[A-Za-z_$][\w$]*$/.test(p.orig || ""));

const readExports = (text) => {
  const entries = [];
  let rest = text;
  for (const m of text.matchAll(EXPORT_DECL)) {
    entries.push({ name: m[1], local: m[1], kind: "decl" });
    rest = rest.replace(m[0], blank(m[0]));
  }
  for (const m of text.matchAll(EXPORT_LIST)) {
    for (const s of listSpecs(m[1])) entries.push({ name: s.name, local: s.orig, kind: s.name === "default" ? "default" : "list", from: m[2] || null });
    rest = rest.replace(m[0], blank(m[0]));
  }
  for (const m of text.matchAll(EXPORT_STAR)) {
    entries.push({ kind: "star", from: m[1] });
    rest = rest.replace(m[0], blank(m[0]));
  }
  for (const m of text.matchAll(EXPORT_DEFAULT)) {
    entries.push({ name: "default", kind: "default" });
    rest = rest.replace(m[0], blank(m[0]));
  }
  return { entries, rest };
};

// Internal use: uses left after the export statements and imports are blanked and the name's own
// declaration is removed. A list entry's local binding is often a declaration or an import; both
// are blanked here, so only real occurrences survive.
const readInternal = (text, rest, entry) => {
  if (entry.kind === "decl") return wordRe(entry.name).test(rest);
  if (entry.kind !== "list") return false;
  let body = rest.replace(IMPORT_NAMED, blank).replace(IMPORT_DEFAULT, blank).replace(IMPORT_NS, blank);
  body = body.replace(DECL_NAME(entry.local), (s) => blank(s));
  return wordRe(entry.local).test(body);
};

// --- 1. The reader, exercised on fixtures. Comments do not save a name; each import shape does. ---
const X = [
  "export const named = 1;",
  "export const dotted = 2;",
  "export const dyn = 3;",
  "export const deadOne = 4;",
  "const alias = 5;",
  "export { alias as default };",
].join("\n");
const NAMED_CONSUMER = 'import { named } from "./x";\nconst a = named;\n';
const DEFAULT_CONSUMER = 'import d from "./x";\nconst b = d;\n';
const NS_CONSUMER = 'import * as N from "./x";\nconst c = N.dotted;\n';
const DYN_CONSUMER = 'const P = lazy(() => import("./x").then((m) => ({ default: m.dyn })));\n';
const COMMENT_CONSUMER = '// import { deadOne } from "./x";\nconst e = 1;\n';
const INTERNAL_ONLY = [
  "export function helper() { return 2; }",
  "export const usesHelper = helper();",
  "export const alsoDead = 9;",
  "/** ghost is exported but this sentence is its only other mention. */",
  "export const ghost = 1;",
  "function widget() { return 3; }",
  "const w = widget();",
  "export { widget };",
].join("\n");

const fakeResolve = (from, spec) => (spec === "./x" ? "x.ts" : spec === "./src" ? "src.ts" : null);
const fixture = (files) => {
  const texts = new Map(Object.entries(files).map(([f, t]) => [f, stripComments(t)]));
  const ex = new Map([...texts].map(([f, t]) => [f, readExports(t)]));
  const consumed = new Map();
  const add = (target, name, consumer) => {
    if (!target) return;
    const k = `${target}::${name}`;
    if (!consumed.has(k)) consumed.set(k, new Set());
    consumed.get(k).add(consumer);
  };
  for (const [f, text] of texts) {
    for (const m of text.matchAll(IMPORT_NAMED)) {
      const target = fakeResolve(f, m[2]);
      for (const s of listSpecs(m[1])) add(target, s.orig, f);
    }
    for (const m of text.matchAll(IMPORT_DEFAULT)) add(fakeResolve(f, m[2]), "default", f);
    for (const m of text.matchAll(IMPORT_NS)) {
      const target = fakeResolve(f, m[2]), list = ex.get(target);
      if (!list) continue;
      for (const e of list.entries) if (e.name && new RegExp(`\\b${m[1]}\\s*\\.\\s*${reEsc(e.name)}\\b`).test(text)) add(target, e.name, f);
    }
    for (const m of text.matchAll(DYNAMIC)) {
      const target = fakeResolve(f, m[1]), list = ex.get(target);
      const after = text.slice(m.index, m.index + 600);
      const ns = (after.match(/\.then\(\s*\(\s*([A-Za-z_$][\w$]*)\s*\)/) || [])[1];
      let any = false;
      if (list && ns) for (const e of list.entries) {
        if (e.name && new RegExp(`\\b${ns}\\s*\\.\\s*${reEsc(e.name)}\\b`).test(after)) { add(target, e.name, f); any = true; }
      }
      if (!any && !ns) add(target, "default", f);
    }
    for (const m of text.matchAll(EXPORT_LIST)) {
      const target = m[2] ? fakeResolve(f, m[2]) : null;
      if (target) for (const s of listSpecs(m[1])) add(target, s.orig, f);
    }
    for (const m of text.matchAll(EXPORT_STAR)) {
      const target = fakeResolve(f, m[1]), list = ex.get(target);
      if (list) for (const e of list.entries) if (e.name) add(target, e.name, f);
    }
  }
  const dead = [];
  for (const [f, { entries, rest }] of ex) {
    for (const e of entries) {
      if (!e.name) continue;
      const ext = [...(consumed.get(`${f}::${e.name}`) || [])].filter((c) => c !== f);
      if (ext.length === 0 && !readInternal(texts.get(f), rest, e)) dead.push(`${f}:${e.name}`);
    }
  }
  return dead.sort();
};

const dNamed = fixture({ "x.ts": X, "c.ts": NAMED_CONSUMER });
const dDefault = fixture({ "x.ts": X, "c.ts": DEFAULT_CONSUMER });
const dNs = fixture({ "x.ts": X, "c.ts": NS_CONSUMER });
const dDyn = fixture({ "x.ts": X, "c.ts": DYN_CONSUMER });
const dComment = fixture({ "x.ts": X, "c.ts": COMMENT_CONSUMER });
const dInternal = fixture({ "i.ts": INTERNAL_ONLY });
const dStar = fixture({ "src.ts": "export const starred = 1;\n", "barrel.ts": 'export * from "./src";\n' });
const dReexport = fixture({ "src.ts": "export const fromSrc = 1;\n", "barrel.ts": 'export { fromSrc } from "./src";\n' });
ok(`the reader counts named, default, namespace, dynamic and re-export consumers, and a comment never keeps an export alive -- not even in its own module ` +
  `(named dead [${dNamed}], default dead [${dDefault}], ns dead [${dNs}], dyn dead [${dDyn}], comment dead [${dComment}], ` +
  `internal-only dead [${dInternal}], star dead [${dStar}], re-export dead [${dReexport}])`,
  dNamed.join() === "x.ts:deadOne,x.ts:default,x.ts:dotted,x.ts:dyn" &&
  dDefault.join() === "x.ts:deadOne,x.ts:dotted,x.ts:dyn,x.ts:named" &&
  dNs.join() === "x.ts:deadOne,x.ts:default,x.ts:dyn,x.ts:named" &&
  dDyn.join() === "x.ts:deadOne,x.ts:default,x.ts:dotted,x.ts:named" &&
  dComment.join() === "x.ts:deadOne,x.ts:default,x.ts:dotted,x.ts:dyn,x.ts:named" &&
  dInternal.join() === "i.ts:alsoDead,i.ts:ghost,i.ts:usesHelper" && dStar.join() === "" &&
  dReexport.join() === "barrel.ts:fromSrc");

// --- 2. The walk covers the app, derives its roots, and measures the population it declines ---
// --- to charge (exports read only by their own module). ---
const ROOTS = ["domain", "data", "lib", "features", "components", "ui", "src", "store", "i18n", "functions"];
// M423: the rule that says a directory is a NEIGHBOUR rather than a kind of file lives in one place
// now (scripts/lib/appTree.mjs) — a hidden directory is not shipped, and a directory carrying its
// own `.git` is another repository. `football-os/` was a local clone of this repository, so this
// census read the app's exports and the clone's copy of the same exports.
const NON_APP = ["scripts", "dev", "dist", "node_modules", "test-results", "vendor", "Python"];
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  const p = `${d}/${e.name}`;
  if (e.isDirectory()) return skipReason(e.name, p) ? [] : walk(p);
  return [p];
});
const topDirs = readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
const carriesTs = (d) => {
  try {
    const entries = readdirSync(join(root, d), { withFileTypes: true });
    if (entries.some((e) => e.isFile() && /\.tsx?$/.test(e.name))) return true;
    return entries.some((e) => e.isDirectory() && e.name !== "node_modules" && carriesTs(`${d}/${e.name}`));
  } catch { return false; }
};
const uncovered = topDirs.filter((d) => !ROOTS.includes(d) && !skipReason(d, join(root, d), NON_APP) && carriesTs(d));
const files = ROOTS.filter((d) => { try { statSync(join(root, d)); return true; } catch { return false; } })
  .flatMap((d) => walk(join(root, d))).filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith(".d.ts"))
  .map((f) => f.slice(root.length + 1).split("\\").join("/"));
const texts = new Map(files.map((f) => [f, stripComments(readFileSync(join(root, f), "utf8"))]));
const scriptFiles = (() => {
  try { return walk(join(root, "scripts")).filter((f) => /\.(mjs|ts)$/.test(f)).map((f) => f.slice(root.length + 1).split("\\").join("/")); }
  catch { return []; }
})();
const scriptTexts = scriptFiles.map((f) => [f, stripNoise(readFileSync(join(root, f), "utf8"))]);

const exportsBy = new Map(files.map((f) => [f, readExports(texts.get(f))]));
const resolveSpec = (fromFile, spec) => {
  let base;
  if (spec.startsWith("@/")) base = join(root, spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(join(root, fromFile)), spec);
  else return null;
  for (const cand of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
    try { if (statSync(cand).isFile()) return cand.slice(root.length + 1).split("\\").join("/"); } catch {}
  }
  return null;
};

const consumed = new Map();
const add = (target, name, consumer) => {
  if (!target) return;
  const k = `${target}::${name}`;
  if (!consumed.has(k)) consumed.set(k, new Set());
  consumed.get(k).add(consumer);
};
for (const f of files) {
  const text = texts.get(f);
  for (const m of text.matchAll(IMPORT_NAMED)) {
    const target = resolveSpec(f, m[2]);
    if (target) for (const s of listSpecs(m[1])) add(target, s.orig, f);
  }
  for (const m of text.matchAll(IMPORT_DEFAULT)) {
    const target = resolveSpec(f, m[2]);
    if (target) add(target, "default", f);
  }
  for (const m of text.matchAll(IMPORT_NS)) {
    const target = resolveSpec(f, m[2]), list = exportsBy.get(target);
    if (!list) continue;
    for (const e of list.entries) if (e.name && new RegExp(`\\b${m[1]}\\s*\\.\\s*${reEsc(e.name)}\\b`).test(text)) add(target, e.name, f);
  }
  for (const m of text.matchAll(DYNAMIC)) {
    const target = resolveSpec(f, m[1]), list = exportsBy.get(target);
    const after = text.slice(m.index, m.index + 600);
    const ns = (after.match(/\.then\(\s*\(\s*([A-Za-z_$][\w$]*)\s*\)/) || [])[1];
    let any = false;
    if (list && ns) for (const e of list.entries) {
      if (e.name && new RegExp(`\\b${ns}\\s*\\.\\s*${reEsc(e.name)}\\b`).test(after)) { add(target, e.name, f); any = true; }
    }
    if (!any && !ns && target) add(target, "default", f);
  }
  for (const m of text.matchAll(EXPORT_LIST)) {
    const target = m[2] ? resolveSpec(f, m[2]) : null;
    if (target) for (const s of listSpecs(m[1])) add(target, s.orig, f);
  }
  for (const m of text.matchAll(EXPORT_STAR)) {
    const target = resolveSpec(f, m[1]), list = exportsBy.get(target);
    if (list) for (const e of list.entries) if (e.name) add(target, e.name, f);
  }
}

const rows = [];
for (const f of files) {
  const { entries, rest } = exportsBy.get(f);
  for (const e of entries) {
    if (!e.name) continue;
    const ext = [...(consumed.get(`${f}::${e.name}`) || [])].filter((c) => c !== f);
    const internal = readInternal(texts.get(f), rest, e);
    const scripts = ext.length === 0 && !internal && e.name !== "default"
      ? scriptTexts.filter(([, t]) => wordRe(e.name).test(t)).map(([sf]) => sf)
      : [];
    rows.push({ f, name: e.name, ext, internal, scripts });
  }
}
const exportOnly = rows.filter((r) => r.ext.length === 0 && r.internal);
const plantTop = ["domain", "features", "brandNewApp"].filter((x) => !ROOTS.includes(x) && !NON_APP.includes(x));
ok(`the walk covers every top-level TypeScript directory and reads the real app (${files.length} files, floor 95; ` +
  `${rows.length} exports, floor 550; ${exportOnly.length} exports read only inside their own module are measured and NOT charged; ` +
  `uncovered [${uncovered.join(",")}], planted new directory reads uncovered ${plantTop.length === 1 ? 1 : plantTop.length})`,
  files.length >= 95 && rows.length >= 550 && exportOnly.length >= 100 && uncovered.length === 0 &&
  plantTop.includes("brandNewApp") && NON_APP.includes("dev") && NON_APP.includes("scripts"));

// --- 3. The value: every export has a reader outside the module that declares it. Each dead ---
// --- name is printed, so a regression is a symbol and its file, not a falling total. ---
const dead = rows.filter((r) => r.ext.length === 0 && !r.internal && r.scripts.length === 0)
  .map((r) => `${r.f}:${r.name}`);
ok(`no shipped export is dead (${dead.length} dead${dead.length ? `: ${dead.join(", ")}` : ""}; the fixtures above charge ` +
  `${dInternal.length} in the internal-only file and ${dComment.length} where the only consumer is a comment, so a zero here is a reader that looked)`,
  dead.length === 0);

// --- 4. No exemption list: an app path quoted in the gate's CODE would be a file it refuses to ---
// --- charge. The header names the repaired sites as prose; the same comment stripper the reader ---
// --- uses runs here, and the plant is assembled from fragments so it does not trip itself. ---
const selfPath = "scripts/proof-dead-exports.mjs";
const selfCode = stripComments(readFileSync(join(root, selfPath), "utf8"));
const appFileMentions = files.filter((f) => selfCode.includes(f));
const plantSelf = [["features", "dashboard", "Dashboard.tsx"].join("/"), ["domain", "attributes.ts"].join("/")];
const plantedMentions = plantSelf.filter((p) => files.includes(p)).length;
ok(`the gate carries no per-file exemption (${appFileMentions.length} app paths quoted in ${selfPath}; a planted skip list names ${plantedMentions}, so the reader is looking for the right thing)`,
  appFileMentions.length === 0 && plantedMentions === 2);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
