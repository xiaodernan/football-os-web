// M424 scout #3. LADDERS: a chain of thresholds, spelled more than once.
//
// A decision the app makes with a number - "which band is this in" - is spelled as a chain:
// `pct <= 0.25 ? A : pct <= 0.6 ? B : C`, or `if (age <= 20) ... else if (age <= 23) ...`.
// When the same chain of numbers is spelled twice, the decision lives in two places, and the two
// places can disagree.
//
// This scout extracts every such chain (a ternary ladder on one line, or an if/else-if ladder
// over consecutive lines), groups them by the numbers they compare against, and prints the
// groups with more than one site.
//
// It is a scout, not a proof.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
const ROOTS = ["domain", "data", "lib", "store", "features", "components", "ui", "src", "i18n", "functions"];
const appFiles = ROOTS.flatMap((r) => walk(join(root, r))).filter((f) => /\.(ts|tsx)$/.test(f));

// A comparison against a numeric literal.
const NUMCMP = /([A-Za-z_$][\w$.]*)\s*(>=|<=|>|<|===|!==|==|!=)\s*(\d+(?:\.\d+)?)\b/g;

const ladders = [];
for (const f of appFiles) {
  const rel = f.slice(root.length + 1).replace(/\\/g, "/");
  const lines = readFileSync(f, "utf8").split(/\r?\n/);
  // (a) a ternary ladder: two or more numeric comparisons on one line, joined by "?"
  lines.forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, "");
    const hits = [...code.matchAll(NUMCMP)];
    if (hits.length >= 2 && code.includes("?")) {
      ladders.push({ rel, line: i + 1, kind: "ternary", nums: hits.map((h) => `${h[2]}${h[3]}`), text: line.trim().slice(0, 140) });
    }
  });
  // (b) an if / else-if ladder over consecutive lines
  let chain = [];
  const flush = () => {
    if (chain.length >= 2) {
      ladders.push({ rel, line: chain[0].line, kind: "if", nums: chain.map((c) => c.num), text: chain.map((c) => c.text).join(" | ").slice(0, 180) });
    }
    chain = [];
  };
  lines.forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, "").trim();
    const isIf = /^(else\s+)?if\s*\(/.test(code);
    const nums = isIf ? [...code.matchAll(NUMCMP)].map((h) => `${h[2]}${h[3]}`) : [];
    if (isIf && nums.length) {
      chain.push({ line: i + 1, num: nums[0], text: code.slice(0, 110) });
    } else {
      flush();
    }
  });
  flush();
}

const groups = new Map();
for (const l of ladders) {
  const key = l.nums.join(",");
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(l);
}
const multi = [...groups.entries()].filter(([, rows]) => rows.length > 1).sort((a, b) => b[1].length - a[1].length);
console.log(`ladders found: ${ladders.length}; distinct number-chains: ${groups.size}; chains spelled more than once: ${multi.length}`);
for (const [key, rows] of multi) {
  console.log(`\n=== [${key}]  (${rows.length} sites, ${new Set(rows.map((r) => r.rel)).size} files)`);
  for (const r of rows) console.log(`  ${r.rel}:${r.line} (${r.kind})  ${r.text}`);
}
