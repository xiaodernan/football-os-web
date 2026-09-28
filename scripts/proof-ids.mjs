// Proof for the id contract (lib/ids.ts and every site that mints a handle).
//
// An id is the only value in this tree whose entire job is to differ from every other
// id: nothing reads it as data, nothing resolves it through the dictionary, no screen
// prints it (checked: the one `{g.id}` in DevelopmentPage is a position-group code, not
// a record id). That makes it the one thing the row contract, the raw-UI scan and the
// i18n gate are all blind to, and it carried two live defects:
//
//   1. an id read from a *truncated* clock. `S${Date.now().toString(36).slice(-5)}` kept
//      five base-36 digits, so the handle came back every 36^5 ms ≈ 16.8 hours: two plans
//      minted a day apart handed the store one session id. The store reads an equal
//      session id as the same session (`sessions.filter((s) => s.id !== ...)`), so the
//      newer plan deleted the older one — including a *completed* session, whose XP stayed
//      on the profile while its row left the training list, the load model, the review and
//      the activity timeline;
//   2. an id derived from the *content*. `P${makeRng(seed)().toString(36).slice(2, 7)}`
//      with `seed = coach-${hashString(ask + displayName)}` is one handle per ask+name, so
//      one player asking one question twice held two plans under one id and `domain/history`
//      built two timeline rows under one key;
//   3. two mints inside one millisecond, which the onboarding pair met head-on — the source
//      kept them apart with `Date.now() + 1`;
//   4. two module instances (two tabs, or a reload that restored rows) reaching the same
//      sequence in the same millisecond, which no clock read can separate.
//
// The contract the checks pin: an id is minted where the event happens, it is distinct
// from every other handle in the process and from every handle a second instance mints,
// and the *content* stays as deterministic as ./rng says it is — a plan's exercises,
// diagnosis and sources are still reproducible from its seed, because identity is not
// content. What is NOT claimed: the census below matches the assignment shape, so an id
// hoisted into a variable (`const raw = Date.now().toString(36); … id: raw`) escapes it,
// exactly as the relative-time census cannot see a duration computed in one function and
// printed in another; the cross-instance guarantee is a 36^8 salt, not a proof; and the
// two-instance case is measured through Vite's module registry rather than in two real
// browser tabs.
//
// Run: node scripts/proof-ids.mjs
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { normalize } from "./lib/rawUiScan.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const server = await createServer({ root, server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const idsModule = await server.ssrLoadModule("/lib/ids.ts");
// A second instance of the same module: what a second tab — or a reload that restored rows
// minted before it — actually is. A fresh query is the only way one process can stand in
// for two, and the clause below measures that it *is* a second instance rather than
// assuming it.
const otherInstance = await server.ssrLoadModule("/lib/ids.ts?instance=2");
const { makeRng, hashString } = await server.ssrLoadModule("/lib/rng.ts");
const { coachProvider } = await server.ssrLoadModule("/data/ai.ts");
const { buildTimeline } = await server.ssrLoadModule("/domain/history.ts");
const { newId } = idsModule;

const realNow = Date.now;
const frozen = 1_700_000_000_000;
const WRAP = 36 ** 5; // the 16.8-hour cycle the truncated clock read repeated on
Date.now = () => frozen;

// ---- 1-2. The shapes that were there really did collide. A milestone that removes a
// collision has to be able to show the collision, or "fixed" is a claim about code nobody
// ran — the same reason M142's mutation arms exist.
const oldSessionId = (ms) => `S${ms.toString(36).slice(-5)}`;
ok("the shape that was there really did repeat: a truncated clock read collides one wrap later",
  oldSessionId(frozen) === oldSessionId(frozen + WRAP) && oldSessionId(frozen) !== "S");
const oldPlanId = (ask, name) => `P${makeRng(`coach-${hashString(ask + name)}`)().toString(36).slice(2, 7)}`;
ok("the shape that was there really did repeat: a content-derived id is one handle per ask+name",
  oldPlanId("improve my game", "Sam") === oldPlanId("improve my game", "Sam"));

// ---- 3-6. The door: many mints, one millisecond, two instances, all different.
const many = new Set();
for (let i = 0; i < 5000; i++) many.add(newId("S"));
ok("5000 handles minted inside one frozen millisecond are 5000 distinct handles", many.size === 5000);
ok("a handle keeps its prefix and carries nothing printable",
  [...many].every((id) => id.startsWith("S") && !/\s/.test(id)));
// The onboarding pair is the named case: two goals minted in the same tick, which the
// source used to separate with `Date.now() + 1`.
ok("two handles minted back to back for the same kind of record differ",
  newId("g-") !== newId("g-") && newId("mem-") !== newId("mem-"));
for (let i = 0; i < 5000; i++) many.add(otherInstance.newId("S"));
ok("a second module instance is a second instance, and 5000 handles from each in one frozen millisecond are 10000 distinct",
  otherInstance !== idsModule && many.size === 10000);

// ---- 7-9. The coach: one handle per plan, and the content still the seed's.
const ask = { value: "improve my game" };
const mk = (name) => ({ prompt: ask, profile: { displayName: name, positionGroup: "MID", attributes: {} }, history: [], availableMinutes: 30 });
const p1 = await coachProvider.generatePlan(mk("Sam"));
const p2 = await coachProvider.generatePlan(mk("Sam"));
ok("one player asking one question twice gets two plans under two ids",
  p1.id !== p2.id && p1.session.id !== p2.session.id);
ok("...and the content is still the seed's, so only the handle moved",
  JSON.stringify(p1.diagnosis) === JSON.stringify(p2.diagnosis) &&
    JSON.stringify(p1.sources) === JSON.stringify(p2.sources) &&
    JSON.stringify(p1.session.exercises) === JSON.stringify(p2.session.exercises));
Date.now = () => frozen + WRAP;
const p3 = await coachProvider.generatePlan(mk("Sam"));
ok("a plan minted one clock wrap later shares neither id with the earlier plan",
  p3.id !== p1.id && p3.session.id !== p1.session.id);

// ---- 10-12. What the store does with an equal id, and the key the collision duplicated.
// The predicate is read out of the store rather than copied from it: the line is why an
// equal id was data loss, and therefore why distinct ids are the guarantee.
const store = readFileSync(join(root, "store/useFootballOS.tsx"), "utf8");
ok("the store still reads an equal session id as the same session",
  /sessions: \[action\.plan\.session, \.\.\.state\.sessions\.filter\(\(s\) => s\.id !== action\.plan\.session\.id\)\]/.test(store));
ok("...so under that rule the two plans above keep both rows rather than one",
  [p1.session, p3.session].filter((s) => s.id !== p3.session.id).length === 1 &&
    [p1.session, p3.session].filter((s) => s.id !== p1.session.id).length === 1);
const events = buildTimeline({ sessions: [], plans: [p1, p2], memory: [] });
ok("two plans by one player build two timeline rows under two keys",
  events.length === 2 && new Set(events.map((e) => e.id)).size === 2);

// ---- 13-14. The census: the door is the only way an id is minted anywhere in the tree.
Date.now = realNow;
const SKIP_DIRS = ["node_modules", "dist", ".git", ".workbuddy-ai", "dev"];
const walk = (dir, acc = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.includes(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.tsx?$/.test(e.name)) acc.push(p);
  }
  return acc;
};
const files = walk(root);
const CLOCK_ID = /\b(id|clipId|sessionId)\s*:\s*`[^`]*\bDate\.now\(\)[^`]*`/g;
const CONTENT_ID = /\b(id|clipId|sessionId)\s*:\s*`[^`]*(?:makeRng|hashString)\([^`]*`/g;
const fromAClock = [];
const fromContent = [];
let doorSites = 0;
let doorFiles = 0;
for (const f of files) {
  const code = normalize(readFileSync(f, "utf8"));
  for (const m of code.matchAll(CLOCK_ID)) fromAClock.push(`${f.replace(root, "")} → ${m[0].trim()}`);
  for (const m of code.matchAll(CONTENT_ID)) fromContent.push(`${f.replace(root, "")} → ${m[0].trim()}`);
  if (f.endsWith(join("lib", "ids.ts"))) continue;
  const sites = (code.match(/\bnewId\(/g) ?? []).length;
  if (sites) { doorSites += sites; doorFiles += 1; }
}
ok(`no id in the walked tree (${files.length} files) is built from the clock`
  + (fromAClock.length ? ` — ${fromAClock.length} left: ${fromAClock.slice(0, 3).join(" | ")}` : ""),
  fromAClock.length === 0);
ok(`no id in the walked tree is built from the content`
  + (fromContent.length ? ` — ${fromContent.length} left: ${fromContent.slice(0, 3).join(" | ")}` : ""),
  fromContent.length === 0);
ok(`the door is the way in: ${doorSites} newId() call sites across ${doorFiles} files besides lib/ids.ts`,
  doorSites >= 11 && doorFiles >= 5);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
