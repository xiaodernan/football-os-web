import { createServer } from "vite";

// Pins domain/localData.ts — the on-device backup/recovery contract the Settings
// screen, lossless export/import and activity-only reset all rest on — plus the
// registry↔i18n cross-module invariant (every registered store must carry a
// translated label in all three locales, or the inventory leaks a raw key).
// Fully in-memory and deterministic: no browser, no localStorage.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const {
  LOCAL_KEYS, OS_STATE_KEY, LOCALE_KEY, THEME_KEY, EXPORT_APP,
  buildExport, readImport, applyImport, clearActivity, inventory, countRecords,
} = await server.ssrLoadModule("/domain/localData.ts");
const { DICTIONARIES, LOCALES } = await server.ssrLoadModule("/i18n/dictionaries.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

class Mem {
  constructor(init = {}) { this.m = new Map(Object.entries(init)); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}

const seedFor = (key) => (key === LOCALE_KEY ? "zh-CN" : key === THEME_KEY ? "dark" : '[{"id":"a1"},{"id":"a2"}]');
const seeded = {};
for (const spec of LOCAL_KEYS) seeded[spec.key] = seedFor(spec.key);

// ---- Registry integrity ----
ok("LOCAL_KEYS is non-empty", LOCAL_KEYS.length > 0);
ok("keys are unique", new Set(LOCAL_KEYS.map((k) => k.key)).size === LOCAL_KEYS.length);
ok("every key is namespaced football-os.", LOCAL_KEYS.every((k) => k.key.startsWith("football-os.")));
ok("every kind is activity|preference", LOCAL_KEYS.every((k) => k.kind === "activity" || k.kind === "preference"));
ok("label keys are unique too", new Set(LOCAL_KEYS.map((k) => k.labelKey)).size === LOCAL_KEYS.length);

// ---- registry ↔ i18n cross-module invariant ----
let missingLabel = [];
for (const spec of LOCAL_KEYS) {
  for (const loc of LOCALES) {
    const v = DICTIONARIES[loc.id]?.[spec.labelKey];
    if (typeof v !== "string" || v.length === 0) missingLabel.push(`${spec.labelKey}@${loc.id}`);
  }
}
ok("every registered store has a non-empty label in all locales", LOCAL_KEYS.length > 0 && missingLabel.length === 0);
if (missingLabel.length) console.log("     missing: " + missingLabel.join(", "));

// ---- Lossless export → import round-trip ----
const src = new Mem(seeded);
const bundle = buildExport(src);
ok("export tags the app", bundle.app === EXPORT_APP);
ok("export captures every present key", Object.keys(bundle.sections).length === LOCAL_KEYS.length);

const text = JSON.stringify(bundle); // simulate saving to a file
const read = readImport(text);
ok("a real bundle reads back as a bundle", "bundle" in read);
const dst = new Mem();
const imp = applyImport(dst, read.bundle);
ok("import reports success", imp.ok === true && imp.error === undefined);
ok("import restores all keys", imp.keys === LOCAL_KEYS.length);

let roundTripOk = true, rtDetail = "";
for (const spec of LOCAL_KEYS) {
  if (dst.getItem(spec.key) !== seeded[spec.key]) { roundTripOk = false; rtDetail = `${spec.key}: ${JSON.stringify(dst.getItem(spec.key))} != ${JSON.stringify(seeded[spec.key])}`; break; }
}
ok("every stored value survives the round-trip byte-for-byte", roundTripOk);
if (rtDetail) console.log("     " + rtDetail);
ok("bare-string preferences are not silently dropped", dst.getItem(LOCALE_KEY) === "zh-CN" && dst.getItem(THEME_KEY) === "dark");

// ---- Import refuses to plant unknown keys ----
const guarded = new Mem();
const bad = applyImport(guarded, { app: EXPORT_APP, version: 1, exportedAt: "", sections: { [OS_STATE_KEY]: '[{"ok":1}]', "evil.example/data": '{"hack":1}' } });
ok("unknown key is never written", guarded.getItem("evil.example/data") === null);
ok("known key still imports", guarded.getItem(OS_STATE_KEY) === '[{"ok":1}]' && bad.keys === 1);

// ---- Import input validation ----
ok("non-json is rejected", readImport("this is not json").error === "not-json");
ok("a foreign bundle is rejected", readImport(JSON.stringify({ app: "someone-else", sections: {} })).error === "not-a-football-os-bundle");

// ---- Activity-only reset preserves preferences ----
const resetStore = new Mem(seeded);
const activityKeys = LOCAL_KEYS.filter((k) => k.kind === "activity").map((k) => k.key);
const prefKeys = LOCAL_KEYS.filter((k) => k.kind === "preference").map((k) => k.key);
const removed = clearActivity(resetStore);
ok("reset removes exactly the activity keys", removed === activityKeys.length && activityKeys.every((k) => resetStore.getItem(k) === null));
ok("reset keeps every preference", prefKeys.every((k) => resetStore.getItem(k) != null));

// ---- inventory + countRecords semantics ----
const inv = inventory(new Mem(seeded));
ok("inventory returns one entry per registered key", inv.entries.length === LOCAL_KEYS.length);
ok("inventory counts all present stores", inv.present === LOCAL_KEYS.length);
ok("inventory total equals the sum of entry bytes", inv.bytes === inv.entries.reduce((a, e) => a + e.bytes, 0) && inv.bytes > 0);
ok("countRecords counts array items, not fields", countRecords([{ id: 1 }, { id: 2 }, { id: 3 }]) === 3);
ok("countRecords flattens one nested level", countRecords({ threads: [{ r: 1 }, { r: 2 }], meta: { replies: [{ x: 1 }] } }) === 3);
ok("countRecords ignores plain object fields", countRecords({ overall: 5, level: 2, xp: 100 }) === 0);
ok("countRecords treats a bare preference as one thing", countRecords("dark") === 1);
ok("countRecords of empty is zero", countRecords(null) === 0 && countRecords(undefined) === 0 && countRecords({ threads: [{ r: 1 }, { r: 2 }] }) === 2); /* M324-LOCALDATA: a counter that always read 0 would satisfy the empty arm alone */

// ---- A document that is not allowed a store at all ----
// SettingsPage hands every one of these functions `browserStore()`, which answers null when the
// document may not have one (site data blocked). These four functions grew that parameter type in
// the same change, so the null path is the shipped path, not a hypothetical one: the page has to
// reach a refusal through it, and none of them may report work it did not do.
const noStoreInv = inventory(null);
ok("no store: the inventory still lists every registered key, so the page has rows to show", LOCAL_KEYS.length > 0 && noStoreInv.entries.length === LOCAL_KEYS.length);
ok("no store: nothing is counted as present, and the counts are all zero rather than undefined", noStoreInv.entries.length > 0 && noStoreInv.present === 0 && noStoreInv.bytes === 0 && noStoreInv.records === 0 && noStoreInv.entries.every((e) => !e.present && e.bytes === 0 && e.records === 0));
const noStoreBundle = buildExport(null);
ok("no store: the export keeps its identity but carries no sections — the shape SettingsPage refuses on", noStoreBundle.app === EXPORT_APP && noStoreBundle.app.length > 0 && Object.keys(noStoreBundle.sections).length === 0);
const noStoreImport = applyImport(null, { app: EXPORT_APP, version: 1, exportedAt: "", sections: { [OS_STATE_KEY]: '[{"ok":1}]' } });
ok("no store: an import refuses instead of reporting keys it never wrote", noStoreImport.ok === false && noStoreImport.keys === 0 && noStoreImport.error === "storage-write-failed" && noStoreImport.error.length > 0);
ok("no store: a reset reports zero keys cleared, not a fabricated count", clearActivity(null) === 0 && activityKeys.length > 0 && removed === activityKeys.length); /* M324-LOCALDATA: a reset that always read 0 would satisfy the no-store arm alone */

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
