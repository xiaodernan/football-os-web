// Proof for the app's RULE uniqueness: no two exported functions are the same rule wearing
// two different names.
//
// The defect class this project has been closing for twenty milestones: a concept computed in
// more than one place. Each instance so far had the same SHAPE (M404's headroom, M412's vector
// threshold, M416's repair), and a shape census found it. But a copy that differs
// STRUCTURALLY -- one extra line, one missing guard -- is a different shape, and the shape
// census never pairs it with its siblings. M416's fourth copy was exactly that: three stores
// carried the same rule with an early-out and the fourth did not, so it normalised to a
// different shape and the detector that found the other three never saw it.
//
// The measure here is STRICT ALIGNMENT rather than similarity: two bodies are the same rule
// when their token sequences line up position by position, with a consistent one-to-one
// renaming of the identifiers and the literals equal at every step. Similarity over a token SET
// is far too permissive -- every "filter, then sort, then slice" body looks alike, and a gate
// built on it would either be noise or a wall.
//
// The census charges: the rule families are closed (no two exported bodies are the same rule
// under a renaming), the doors the app has converged on are still doors, and the detector is
// armed -- a planted pair that IS the same rule must be caught, and a planted pair that is not
// must not be.
//
// Run: node scripts/proof-rules.mjs
import { readFileSync, readdirSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const KEYWORDS = new Set([
  "const", "let", "var", "return", "if", "else", "for", "of", "in", "new", "typeof", "as",
  "unknown", "string", "number", "boolean", "true", "false", "null", "undefined", "void", "never",
  "any", "export", "function", "import", "from", "await", "async", "class", "extends",
  "implements", "this", "throw", "try", "catch", "finally", "switch", "case", "break",
  "continue", "default", "do", "while", "instanceof", "keyof", "readonly", "public", "private",
  "protected", "static", "type", "interface", "enum", "declare", "delete", "infer", "satisfies",
]);

// The tokens of a body: a literal (a keyword or a punctuation mark) or an identifier.
const tokenize = (s) => {
  const stripped = s.replace(/\/\/[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
  const out = [];
  for (const m of stripped.match(/[A-Za-z_$][\w$]*|[^\sA-Za-z_$]/g) || []) {
    out.push(/^[A-Za-z_$]/.test(m) && !KEYWORDS.has(m) ? { id: m } : { lit: m });
  }
  return out;
};

// Two bodies are the SAME RULE when their token sequences line up position by position under a
// consistent one-to-one renaming: the literals must be equal at every step, and each identifier
// must map to one and the same other identifier.
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
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const ROOTS = ["domain", "data", "lib", "store", "features", "components", "ui", "src"];
const appFiles = ROOTS.flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const raw = Object.fromEntries(appFiles.map((f) => [f, readFileSync(f, "utf8")]));

const EXPORT = /export\s+(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)[^{]*\{|export\s+const\s+(\w+)\s*=\s*(?:\(([^)]*)|(\w+))\s*(?::[^=]+)?=>\s*\{?/g;
// The unit's body: to the matching close brace, or to the end of the statement for a concise arrow.
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
  const s = raw[f];
  EXPORT.lastIndex = 0;
  let m;
  while ((m = EXPORT.exec(s))) {
    const name = m[1] || m[3];
    const start = m.index + m[0].length;
    const body = bodyOf(s, start);
    const tk = tokenize(body);
    // A short body is trivially the same rule as another short one -- "return X.find(...)"
    // aligns with "return Y.filter(...)" under a renaming -- so the measure only runs on
    // bodies with enough tokens for an alignment to mean something.
    if (tk.length < 24) continue;
    units.push({ f, name, tk, body: body.replace(/\s+/g, " ").trim() });
  }
}

// M438: the same measure over EVERY named body, exported or not. The census above could only see
// an exported rule, and M422 found a family it structurally could not: "one result credits one
// row" was spelled in three LOCAL helpers, and a local copy of a door is exactly what this
// census was blind to.
const NAMED = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)[^{;]*\{|(?:export\s+)?const\s+(\w+)\s*(?::[^=]+)?=\s*(?:async\s*)?(?:\(([^)]*)\)|(\w+))\s*(?::[^=]*)?=>\s*\{?/g;
const allUnits = [];
for (const f of appFiles) {
  const s = raw[f];
  NAMED.lastIndex = 0;
  let m;
  while ((m = NAMED.exec(s))) {
    const name = m[1] || m[3];
    const exported = /export/.test(m[0]);
    const start = m.index + m[0].length;
    const body = bodyOf(s, start);
    const tk = tokenize(body);
    if (tk.length < 24) continue;
    allUnits.push({ f, name, exported, tk, body: body.replace(/\s+/g, " ").trim() });
  }
}
const localUnits = allUnits.filter((u) => !u.exported);

// --- 1. Plants: the measure must catch a planted pair that IS the same rule, and refuse one
// --- that is not. A gate that cannot fail is not a gate. --------------------------------------
const pSame = sameRule(tokenize("const a = list.filter((x) => x.on).length;"), tokenize("const b = rows.filter((y) => y.up).length;"));
const pDiff = sameRule(tokenize("const a = list.filter((x) => x.on).length;"), tokenize("const b = rows.filter((y) => y.up).map((z) => z.id);"));
const pDiffLit = sameRule(tokenize("return x + 1;"), tokenize("return x - 1;"));
ok(`the measure is armed (a planted pair that IS the same rule reads ${pSame ? "same" : "DIFFERENT"}, one that differs in shape reads ${pDiff ? "SAME (bad!)" : "different"}, and one that differs only in a literal reads ${pDiffLit ? "SAME (bad!)" : "different"})`,
  pSame && !pDiff && !pDiffLit);

// --- 2. Population floor: the units the measure runs over are real. ---------------------------
ok(`the census walks the real source tree and finds a real population of exported bodies (${appFiles.length} .ts/.tsx, ${units.length} substantial exported unit(s), floor 40)`,
  appFiles.length >= 80 && units.length >= 40);

// --- 3. THE RULE FAMILIES ARE CLOSED: no two exported bodies are the same rule under a
// --- renaming, in two different files. ----------------------------------------------------------
const pairs = [];
for (let i = 0; i < units.length; i++) {
  for (let j = i + 1; j < units.length; j++) {
    if (units[i].f === units[j].f) continue;
    if (sameRule(units[i].tk, units[j].tk)) pairs.push([units[i], units[j]]);
  }
}
ok(`the rule families are closed: no two exported bodies are the same rule wearing two names (${units.length} units across ${appFiles.length} files, ${pairs.length} same-rule pair(s) [${pairs.slice(0, 3).map(([a, b]) => `${a.f.split("/").pop()}:${a.name} ~ ${b.f.split("/").pop()}:${b.name}`).join(", ")}])`,
  pairs.length === 0);

// --- 4. The doors the app converged on are still doors, and the seams that replaced four
// --- copies are still SEAMS -- the same rule in one place, four named entries into it. ----------
const SEAMS = [
  ["domain/goals.ts", "repairGoalTitles"], ["domain/memory.ts", "repairMemoryTexts"],
  ["domain/training.ts", "repairSessionTitles"], ["data/ai.ts", "repairPlanPrompts"],
];
const seamCalls = SEAMS.map(([f, name]) => {
  const m = (raw[f] || "").match(new RegExp(`export function ${name}[\\s\\S]*?\\n}`));
  return !!m && /return repairTextField\(/.test(m[0]);
});
const doorLives = /export function repairTextField<T extends object>/.test(raw["domain/rowText.ts"]);
ok(`the doors the app converged on are still doors, and the four copies that became seams are still seams (the repair door declared: ${doorLives ? "yes" : "NO"}, four seams calling it: ${seamCalls.filter(Boolean).length}/${SEAMS.length})`,
  doorLives && seamCalls.every(Boolean));

// --- 5. The measure is not a wall: a real pair of DIFFERENT bodies must read different, so a
// --- closed family is a finding and not a detector that pairs everything. -----------------------
const diffs = [];
for (let i = 0; i < units.length && diffs.length < 40; i++) {
  for (let j = i + 1; j < units.length && diffs.length < 40; j++) {
    if (units[i].f === units[j].f) continue;
    if (!sameRule(units[i].tk, units[j].tk)) diffs.push([units[i], units[j]]);
  }
}
ok(`the measure is not a wall: it reads real different bodies as different (${diffs.length} different pair(s) sampled, ${pairs.length} same-rule pair(s) — a detector that paired everything would find no different pair)`,
  diffs.length > 0 && pairs.length === 0);

// --- 6. M438: the same rule inside a LOCAL helper, which the census above could not see. -------
// The families are closed here too, with one declared exception: two removals of a row by its own
// key — a film clip by its clipId and a learning record by its id — are the same SHAPE and two
// different contracts, and the measure cannot tell them apart because it renames identifiers.
const localPairs = [];
for (let i = 0; i < localUnits.length; i++) {
  for (let j = i + 1; j < localUnits.length; j++) {
    if (localUnits[i].f === localUnits[j].f) continue;
    if (sameRule(localUnits[i].tk, localUnits[j].tk)) localPairs.push([localUnits[i], localUnits[j]]);
  }
}
const LOCAL_SPLITS = {
  "features/film/FilmRoom.tsx:remove|features/learn/LearnHub.tsx:undo":
    "two removals of a row by its own key — a film clip by its clipId, a learning record by its id: the same shape, two different contracts",
};
const localUndeclared = localPairs
  .map(([a, b]) => `${a.f}:${a.name}|${b.f}:${b.name}`)
  .filter((k) => !(k in LOCAL_SPLITS));
const localStale = Object.keys(LOCAL_SPLITS).filter((k) => !localPairs.some(([a, b]) => `${a.f}:${a.name}|${b.f}:${b.name}` === k));
// The reader is armed: a planted pair of local bodies that IS the same rule is charged.
const pLocal = (() => {
  const a = { f: "planted.ts", name: "one", tk: tokenize("const a = list.filter((x) => x.on).length;") };
  const b = { f: "planted2.ts", name: "two", tk: tokenize("const b = rows.filter((y) => y.up).length;") };
  return sameRule(a.tk, b.tk) ? 1 : 0;
})();
ok(`no two LOCAL bodies are the same rule wearing two names (${localUnits.length} local bodies of ${allUnits.length} named, ${localPairs.length} same-rule pair(s), ${localUndeclared.length} undeclared [${localUndeclared.join(", ")}], ${localStale.length} stale [${localStale.join(", ")}]; a planted local pair reads ${pLocal})`,
  localUndeclared.length === 0 && localStale.length === 0 && pLocal === 1,
  `undeclared: ${localUndeclared.join(", ")}; stale: ${localStale.join(", ")}`);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
