// Proof for the offline/degraded-state honesty contract.
//
// Football OS has no backend: every answer, analysis and post is produced on the
// visitor's own device (M136/M137/M138 each removed a notice that implied
// otherwise — a control disabled for no reason, "retrieval is not refreshed",
// "remain when you reconnect"). Those fixes are all one string or one prop away
// from regressing, and a regression here is invisible to the type checker, the
// build and proof-i18n (which checks that keys *resolve*, not what they *claim*).
//
// So this pins the premises and the wording rules:
//   1. the premise itself — no shipped source performs network I/O, which is what
//      makes "runs on this device" true rather than aspirational;
//   2. connection state must never gate data or domain logic, only presentation;
//   3. every `!online` render site routes its sentence through t() — a hardcoded
//      English notice is both untranslated and unaudited by the rules below;
//   4. offline copy states the on-device mechanism, never promises delivery or a
//      refresh, and may mention reconnection only to deny that anything is sent;
//   5. no offline key is left defined-but-unrendered, and no control is disabled
//      merely because the device is offline.
// Run: node scripts/proof-offline.mjs
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const { createServer } = await import("vite");
const server = await createServer({ root, server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { DICTIONARIES: D, LOCALES: L } = await server.ssrLoadModule("/i18n/dictionaries.ts");

const walk = (dir, acc = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "dist", ".git", ".workbuddy-ai"].includes(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.tsx?$/.test(e.name)) acc.push(p);
  }
  return acc;
};

// --- 1. The premise: nothing in the shipped app touches the network. ---------
const APP_DIRS = ["domain", "data", "features", "store", "lib", "ui", "i18n", "components", "src"];
const appFiles = APP_DIRS.map((d) => join(root, d)).filter(existsSync).flatMap((d) => walk(d));
ok(`the scan actually covers the shipped app (${appFiles.length} files)`, appFiles.length > 80);

// M458 put a service-worker registration in the entry. Registering one is not a network call — it
// is the offline asset itself, and its absence would make "runs on this device" mean less — but it
// is still the one shipped place that names the network stack. So the premise is read as two
// clauses: no call API anywhere, and the single registration guarded and pointed at a shell the
// build actually ships. Dropping the registration reds the second clause, and a `fetch` returning
// anywhere reds the first.
const NETWORK = /\bfetch\s*\(|XMLHttpRequest|\baxios\b|new\s+WebSocket|new\s+EventSource|sendBeacon/;
const netHits = appFiles.filter((f) => NETWORK.test(readFileSync(f, "utf8"))).map((f) => f.replace(root, ""));
ok(`no shipped source performs network I/O (${netHits.length})`, netHits.length === 0);
for (const h of netHits.slice(0, 8)) console.log("       network call: " + h);

const SW_REGISTER = /navigator\s*\.\s*serviceWorker\s*\.\s*register\s*\(\s*["'`]([^"'`]+)["'`]/;
const swSites = appFiles.flatMap((f) => {
  const src = readFileSync(f, "utf8");
  if (!/\bnavigator\s*\.\s*serviceWorker\b/.test(src)) return [];
  const m = src.match(SW_REGISTER);
  return [{
    rel: f.slice(root.length + 1).split("\\").join("/"),
    target: m ? m[1] : null,
    // The guard must be in the same statement's neighbourhood: production-only or not at all.
    prodOnly: m ? /import\.meta\.env\.PROD/.test(src.slice(Math.max(0, m.index - 300), m.index)) : false,
  }];
});
const swPath = join(root, "public", "sw.js");
const swExists = existsSync(swPath);
const swSource = swExists ? readFileSync(swPath, "utf8") : "";
const swSite = swSites[0];
ok(`the one service-worker registration is production-only and names a shipped shell (${swSites.length} site(s)${swSite ? `: ${swSite.rel} -> ${swSite.target ?? "no literal target"}${swSite.prodOnly ? "" : " (not PROD-guarded)"}` : ""}; public/sw.js ${swExists ? `present, ${(swSource.match(/addEventListener\(\s*["']fetch["']/g) ?? []).length} fetch handler` : "missing"})`,
  swSites.length === 1 && swSite.rel === "src/main.tsx" && swSite.target === "/sw.js" && swSite.prodOnly
  && swExists && /addEventListener\(\s*["']fetch["']/.test(swSource));

// --- 2. Connection state is a presentation concern only. ---------------------
const DATA_DIRS = ["domain", "data", "store"];
const onlineInData = DATA_DIRS.map((d) => join(root, d)).filter(existsSync).flatMap((d) => walk(d))
  .filter((f) => /useOnline/.test(readFileSync(f, "utf8"))).map((f) => f.replace(root, ""));
ok(`connection state never gates data or domain logic (${onlineInData.length})`, onlineInData.length === 0);
for (const h of onlineInData.slice(0, 8)) console.log("       gated: " + h);

// --- 3/5. Every !online render site, and what it renders. --------------------
const featureFiles = walk(join(root, "features"));
const sites = [];
for (const f of featureFiles) {
  const src = readFileSync(f, "utf8");
  let i = 0;
  while ((i = src.indexOf("!online", i)) !== -1) {
    // The JSX that follows the guard — 240 chars covers a multi-line branch.
    sites.push({ file: f.replace(root, ""), tail: src.slice(i, i + 240) });
    i += 7;
  }
}
ok(`the audit has render sites to judge (${sites.length})`, sites.length >= 3);
const noticeKeys = new Set();
for (const s of sites) {
  // Only a dedicated `*.offline` key counts: an unrelated t() nearby (a button
  // label, say) must not be mistaken for the notice and audited in its place.
  const m = s.tail.match(/\bt\(\s*"([a-z][\w.]*\.offline)"/);
  ok(`${s.file}: its !online branch renders a keyed offline notice`, !!m);
  if (!m) continue;
  noticeKeys.add(m[1]);
  for (const { id } of L) ok(`${s.file}: ${m[1]} resolves in ${id}`, typeof D[id][m[1]] === "string");
}

// --- 4. What an offline notice is allowed to claim. --------------------------
const MENTIONS_DEVICE = /(this device|本机|本機)/;
const PROMISES_DELIVERY = /not refreshed|will (?:refresh|sync|upload|post|send)|will be (?:synced|uploaded|posted|sent|refreshed)|showing cached data|上次加载|上次載入/;
const MENTIONS_RECONNECT = /reconnect|重新联网|重新連線/;
const DENIES_DELIVERY = /nothing|never|不会|不會/;
const offlineKeys = Object.keys(D.en).filter((k) => k.endsWith(".offline")).sort();
// Rendered notices and defined notices must be the same set: a key nobody
// renders is dead copy, a rendered sentence with no key escapes every rule here.
ok(`offline notices defined and rendered are the same ${offlineKeys.length} keys`,
  offlineKeys.length === noticeKeys.size && offlineKeys.every((k) => noticeKeys.has(k)));
for (const k of offlineKeys) {
  for (const { id } of L) {
    const v = D[id][k];
    ok(`${k} (${id}) states the on-device mechanism`, MENTIONS_DEVICE.test(v));
    ok(`${k} (${id}) promises no refresh or delivery`, !PROMISES_DELIVERY.test(v));
    // Reconnection may appear, but only to say nothing happens then.
    ok(`${k} (${id}) mentions reconnection only to deny a send`, !MENTIONS_RECONNECT.test(v) || DENIES_DELIVERY.test(v));
  }
}

// --- 5b. No control disabled merely because the device is offline. -----------
const featureSource = featureFiles.map((f) => readFileSync(f, "utf8")).join("\n");
const disabledGates = featureSource.match(/disabled=\{[^}]*!online[^}]*\}/g) ?? [];
ok(`no control is disabled merely because the device is offline (${disabledGates.length})`, disabledGates.length === 0);
for (const d of disabledGates.slice(0, 5)) console.log("       gated control: " + d);
ok("the gate above is not vacuous — disabled= is used in this app", (featureSource.match(/disabled=\{/g) ?? []).length >= 1);

console.log(`\n${offlineKeys.length} offline notices · ${sites.length} render sites · ${appFiles.length} files scanned`);
console.log(`${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
