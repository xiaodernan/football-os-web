// M438 scout. The rule census, extended to LOCAL bodies.
//
// M417's census (scripts/proof-rules.mjs) reads EXPORTED function bodies and pairs the ones that
// are the same rule under a renaming. It cannot see a rule written inside a local helper, which is
// the class M422 found by hand ("one result credits one row" was spelled in three local helpers).
//
// This scout runs the same strict-alignment measure over EVERY named function body in the app —
// exported or not — and reports the pairs it finds.
//
// It is a scout, not a proof.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const KEYWORDS = new Set([
  "const", "let", "var", "return", "if", "else", "for", "of", "in", "new", "typeof", "as",
  "unknown", "string", "number", "boolean", "true", "false", "null", "undefined", "void", "never",
  "any", "export", "function", "import", "from", "await", "async", "class", "extends",
  "implements", "this", "throw", "try", "catch", "finally", "switch", "case", "break",
  "continue", "default", "do", "while", "instanceof", "keyof", "readonly", "public", "private",
  "protected", "static", "type", "interface", "enum", "declare", "delete", "infer", "satisfies",
]);

const tokenize = (s) => {
  const stripped = s.replace(/\/\/[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
  const out = [];
  for (const m of stripped.match(/[A-Za-z_$][\w$]*|[^\sA-Za-z_$]/g) || []) {
    out.push(/^[A-Za-z_$]/.test(m) && !KEYWORDS.has(m) ? { id: m } : { lit: m });
  }
  return out;
};

const sameRule = (a, b) => {
  if (a.length !== b.length || a.length < 8) return false;
  const fwd = new Map(), back = new Map();
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    if (x.lit !== undefined || y.lit !== undefined) { if (x.lit !== y.lit) return false; continue; }
    if (fwd.has(x.id)) { if (fwd.get(x.id) !== y.id) return false; }
    else if (back.has(y.id)) return false;
    fwd.set(x.id, y.id);
    back.set(y.id, x.id);
  }
  return true;
};

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
const ROOTS = ["domain", "data", "lib", "store", "features", "components", "ui", "src", "i18n", "functions"];
const appFiles = ROOTS.flatMap((r) => walk(join(root, r))).filter((f) => /\.(ts|tsx)$/.test(f));

// A named function of ANY scope.
const NAMED = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)[^{;]*\{|(?:export\s+)?const\s+(\w+)\s*(?::[^=]+)?=\s*(?:async\s*)?(?:\(([^)]*)\)|(\w+))\s*(?::[^=]*)?=>\s*\{?/g;
const bodyOf = (s, start) => {
  const nl = s.indexOf("\n", start);
  const head = s.slice(start, nl < 0 ? s.length : nl);
  if (!head.includes("{")) {
    const semi = s.indexOf(";", start);
    return s.slice(start, semi < 0 ? s.length : semi);
  }
  let depth = 1, i = start;
  while (i < s.length && depth > 0) { if (s[i] === "{") depth++; else if (s[i] === "}") depth--; i++; }
  return s.slice(start, i);
};

const units = [];
for (const f of appFiles) {
  const rel = f.slice(root.length + 1).replace(/\\/g, "/");
  const s = readFileSync(f, "utf8");
  NAMED.lastIndex = 0;
  let m;
  while ((m = NAMED.exec(s))) {
    const name = m[1] || m[3];
    const exported = /export/.test(m[0]);
    const start = m.index + m[0].length;
    const body = bodyOf(s, start);
    const tk = tokenize(body);
    if (tk.length < 24) continue;
    units.push({ f: rel, name, exported, tk, body: body.replace(/\s+/g, " ").trim() });
  }
}

const pairs = [];
for (let i = 0; i < units.length; i++) {
  for (let j = i + 1; j < units.length; j++) {
    if (units[i].f === units[j].f) continue;
    if (sameRule(units[i].tk, units[j].tk)) pairs.push([units[i], units[j]]);
  }
}
const local = units.filter((u) => !u.exported);
console.log(`named bodies read: ${units.length} (exported ${units.length - local.length}, local ${local.length})`);
console.log(`same-rule pairs across files: ${pairs.length}`);
for (const [a, b] of pairs) {
  console.log(`\n--- ${a.f}:${a.name}${a.exported ? " (exported)" : " (local)"}  ~  ${b.f}:${b.name}${b.exported ? " (exported)" : " (local)"}`);
  console.log(`  A: ${a.body.slice(0, 190)}`);
  console.log(`  B: ${b.body.slice(0, 190)}`);
}
