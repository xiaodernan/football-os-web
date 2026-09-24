// Proof for the i18n contract. The dictionary is a loose Record<string,string>
// and `t()` falls back to English then to the raw key, so a missing translation
// never fails loudly — a Chinese user just sees English, or a bare `fw.hub.title`.
// This pins the three ways that goes wrong:
//   1. a locale missing a key the others have (zh-TW spreads zh-CN, so a new key
//      silently inherits Simplified Chinese unless it is written out),
//   2. a key present but blank,
//   3. a `t("...")` call site naming a key the dictionary does not define.
// Run: node scripts/proof-i18n.mjs
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// The dictionary is TypeScript, so load it through the same Vite SSR runtime
// the other proofs use rather than parsing it by hand.
const { createServer } = await import("vite");
const server = await createServer({ root, server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const dict = await server.ssrLoadModule("/i18n/dictionaries.ts");
const { DICTIONARIES: D, LOCALES: L } = dict;

const en = D.en;
const enKeys = Object.keys(en).sort();

// 1. Every locale defines exactly the same key set as English.
for (const { id } of L) {
  if (id === "en") continue;
  const keys = Object.keys(D[id]).sort();
  const missing = enKeys.filter((k) => !keys.includes(k));
  const extra = keys.filter((k) => !enKeys.includes(k));
  ok(`${id}: no keys missing (${missing.length})`, missing.length === 0);
  if (missing.length) console.log("       missing: " + missing.slice(0, 12).join(", "));
  ok(`${id}: no keys English lacks (${extra.length})`, extra.length === 0);
  if (extra.length) console.log("       extra: " + extra.slice(0, 12).join(", "));
}

// 2. No key is defined but empty — that renders as a blank label.
for (const { id } of L) {
  const blank = Object.entries(D[id]).filter(([, v]) => typeof v !== "string" || v.trim() === "").map(([k]) => k);
  ok(`${id}: no blank values`, blank.length === 0);
  if (blank.length) console.log("       blank: " + blank.slice(0, 12).join(", "));
}

// 3. Every placeholder a locale interpolates must match English's, or `t()` will
//    leave `{n}` in the output for one language.
// A locale can legitimately lack a key (checked separately above), so guard
// here rather than letting a missing key crash the whole run.
const varsOf = (s) => (typeof s === "string" ? s.match(/\{(\w+)\}/g) ?? [] : []).sort().join(",");
const varMismatch = [];
for (const k of enKeys) {
  const base = varsOf(en[k]);
  for (const { id } of L) {
    if (varsOf(D[id][k]) !== base) varMismatch.push(`${k} (${id})`);
  }
}
ok("placeholders agree across locales", varMismatch.length === 0);
if (varMismatch.length) console.log("       mismatch: " + varMismatch.slice(0, 12).join(", "));

// 4. Every static t("key") literal in the app names a key that exists.
const walk = (dir, acc = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "dist", ".git", ".workbuddy-ai"].includes(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.tsx?$/.test(e.name)) acc.push(p);
  }
  return acc;
};
const files = walk(root);
const STATIC = /\bt\(\s*"([^"]+)"/g;
const DYNAMIC = /\bt\(\s*`([^`]*)\$\{/g;
const unknown = new Set();
const dynPrefixes = new Set();
for (const f of files) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(STATIC)) if (!(m[1] in en)) unknown.add(`${m[1]}  (${f.replace(root, "")})`);
  for (const m of src.matchAll(DYNAMIC)) dynPrefixes.add(m[1]);
}
ok(`no t() call site names an undefined key (${unknown.size})`, unknown.size === 0);
for (const u of [...unknown].slice(0, 15)) console.log("       undefined: " + u);

// 5. Dynamic keys are built by interpolation, so we can only check the prefix
//    resolves to something — but that still catches a mistyped namespace.
const deadPrefix = [...dynPrefixes].filter((p) => !enKeys.some((k) => k.startsWith(p)));
ok(`every dynamic t() prefix resolves (${dynPrefixes.size} checked)`, deadPrefix.length === 0);
if (deadPrefix.length) console.log("       dead prefix: " + deadPrefix.join(", "));

console.log(`\n${enKeys.length} keys · ${L.length} locales`);
console.log(`${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
