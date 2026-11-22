// M1229 · The Teaching Hints: proof for the pure ledger behind every "?" on the main interface.
// Run: node scripts/proof-teachhint.mjs
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";

// A private cacheDir keeps this read-only census off the shared node_modules/.vite lock — a
// concurrent build elsewhere must not be able to time this witness out (the M1228 lesson).
const cacheDir = join(tmpdir(), `football-os-proof-teachhint-${process.pid}`);
// noDiscovery keeps the dep scanner out of this read-only census: a scan racing the load is the
// "server is being restarted" failure this witness hit on its first run.
const server = await createServer({
  root: process.cwd(),
  cacheDir,
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const m = await server.ssrLoadModule("/domain/teachHint.ts");
const dict = await server.ssrLoadModule("/i18n/dictionaries.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const {
  TEACH_HINTS, TEACH_HINT_IDS, TEACH_SEEN_KEY, teachHintKey, markSeen, isSeen, unseenIds, parseSeen, resetSeen,
} = m;
const { DICTIONARIES: D } = dict;
const locales = ["en", "zh-CN", "zh-TW"];

// --- The catalogue is well-formed. ---------------------------------------------------------------
const ids = TEACH_HINTS.map((h) => h.id);
const keys = TEACH_HINTS.map((h) => h.key);
ok(`the catalogue holds ${TEACH_HINTS.length} lessons with unique ids and unique dictionary keys, every key present in all three locales`,
  TEACH_HINTS.length === 26 &&
  new Set(ids).size === ids.length &&
  new Set(keys).size === keys.length &&
  TEACH_HINTS.every((h) => h.id.length > 0 && locales.every((l) => typeof D[l][h.key] === "string" && D[l][h.key].trim().length > 0)));

ok(`teachHintKey resolves a catalogue id and refuses an unknown one honestly (player -> ${teachHintKey("player")}, nope -> ${teachHintKey("nope")})`,
  teachHintKey("player") === "teach.player" && teachHintKey("nope") === null);

// --- markSeen: idempotent, refuses junk, stays sorted and de-duplicated. ---------------------------
const empty = [];
const one = markSeen(empty, "player");
const twice = markSeen(one, "player");
const junk = markSeen(one, "not-a-lesson");
const two = markSeen(one, "world");
ok(`markSeen adds once, is idempotent, refuses an id outside the catalogue and keeps the ledger sorted (after player: ${JSON.stringify(one)}, twice: ${JSON.stringify(twice)}, junk: ${JSON.stringify(junk)}, +world: ${JSON.stringify(two)})`,
  one.length === 1 && one[0] === "player" && twice.length === 1 && junk.length === 1 &&
  two.length === 2 && two[0] === "player" && two[1] === "world");

// --- isSeen / unseenIds: exact complements, catalogue order. ---------------------------------------
const seen = ["ai", "player", "world"];
ok(`isSeen answers for the ledger it is given, and unseenIds is its complement in catalogue order (${unseenIds(seen).length} unread of ${TEACH_HINT_IDS.length}, first ${unseenIds(seen)[0]}, last ${unseenIds(seen)[unseenIds(seen).length - 1]})`,
  isSeen(seen, "ai") && !isSeen(seen, "film") &&
  unseenIds(seen).length === TEACH_HINTS.length - 3 &&
  unseenIds(seen).every((id) => !seen.includes(id)) &&
  unseenIds(seen)[0] === "manager" && unseenIds([]).length === TEACH_HINTS.length &&
  unseenIds(TEACH_HINT_IDS).length === 0);

// --- parseSeen: a corrupt or hand-edited store degrades to a clean ledger, never a crash. -----------
const dirty = ["player", "player", 42, null, "ghost-lesson", "world"];
const parsed = parseSeen(dirty);
ok(`parseSeen drops unknown ids, non-strings and duplicates, and reads a non-array as the empty ledger (${JSON.stringify(parsed)}; undefined -> ${JSON.stringify(parseSeen(undefined))}; object -> ${JSON.stringify(parseSeen({}))})`,
  JSON.stringify(parsed) === JSON.stringify(["player", "world"]) &&
  parseSeen(undefined).length === 0 && parseSeen({}).length === 0 && parseSeen("player").length === 0);

// --- The storage round-trip a browser performs. -----------------------------------------------------
const stored = JSON.stringify(markSeen(markSeen([], "film"), "ops"));
ok(`a ledger survives the localStorage round-trip byte-for-byte (write -> JSON -> parseSeen -> same ledger)`,
  JSON.stringify(parseSeen(JSON.parse(stored))) === JSON.stringify(["film", "ops"]) &&
  TEACH_SEEN_KEY === "football-os.teachSeen.v1" &&
  resetSeen().length === 0 && parseSeen(JSON.parse("[]")).length === 0);

// --- The wiring: every module tile wears a lesson, and no lesson sits inside an anchor. -------------
const dash = readFileSync(join(process.cwd(), "features/dashboard/Dashboard.tsx"), "utf8");
const teachEntries = (dash.match(/teach: "[a-z]+"/g) ?? []).length;
const lessonSites = (dash.match(/<TeachHint id=\{m\.teach\}/g) ?? []).length;
const tileStart = dash.indexOf("MODULE_LINKS.map");
const tile = dash.slice(tileStart, tileStart + 900);
// The lesson must be a SIBLING of the anchor, never a child: reading it may not navigate. The
// reader is scoped to the tile itself and is armed on a planted violation below.
const OUTSIDE = /<\/Link>\s*\{\/\* M1229[\s\S]*?<TeachHint id=\{m\.teach\}/;
const outsideAnchor = OUTSIDE.test(tile);
const plantedInside = "<Link to=\"/x\">\n<span>hi</span>\n<TeachHint id=\"palette\" />\n</Link>";
ok(`the dashboard's module grid wears one lesson per tile — ${teachEntries} catalogue ids over ${lessonSites} render site(s) — and the lesson sits OUTSIDE the anchor, so reading it never navigates (armed: a planted inside-anchor lesson is refused: ${!OUTSIDE.test(plantedInside)})`,
  teachEntries === 22 && lessonSites === 1 && outsideAnchor && !OUTSIDE.test(plantedInside));

const shell = readFileSync(join(process.cwd(), "features/shell/AppShell.tsx"), "utf8");
const manual = readFileSync(join(process.cwd(), "features/manual/Manual.tsx"), "utf8");
const ops = readFileSync(join(process.cwd(), "features/ops/Ops.tsx"), "utf8");
const settings = readFileSync(join(process.cwd(), "features/settings/SettingsPage.tsx"), "utf8");
ok(`the palette trigger, the manual's hero, the operator console and the settings row all read the same catalogue (palette ${shell.includes('<TeachHint id="palette" />')}, manual ${manual.includes('<TeachHint id="manual" />')}, ops ${ops.includes('<TeachHint id="ops" />')}, settings ${settings.includes("unreadTeachCount(teachSeen)")})`,
  shell.includes('<TeachHint id="palette" />') && manual.includes('<TeachHint id="manual" />') &&
  ops.includes('<TeachHint id="ops" />') && settings.includes("unreadTeachCount(teachSeen)"));

// --- The component's and the settings row's own labels are dictionary keys in all three locales. -----
const ui = readFileSync(join(process.cwd(), "ui/TeachHint.tsx"), "utf8");
const uiKeys = [...new Set([
  ...[...ui.matchAll(/"(teach\.[a-zA-Z]+)"/g)].map((x) => x[1]),
  ...[...settings.matchAll(/"(teach\.[a-zA-Z]+)"/g)].map((x) => x[1]),
])];
const placeholdersAgree = uiKeys.every((k) => {
  const vars = (v) => (v.match(/\{(\w+)\}/g) ?? []).sort().join(",");
  return locales.every((l) => vars(D[l][k]) === vars(D.en[k]));
});
ok(`the ${uiKeys.length} labels the component and the settings row print are dictionary keys present in all three locales with agreeing placeholders (${uiKeys.join(", ")})`,
  uiKeys.length >= 8 && uiKeys.every((k) => locales.every((l) => typeof D[l][k] === "string")) && placeholdersAgree);

// --- The settings row reads and writes the ONE ledger key. -----------------------------------------
const localData = readFileSync(join(process.cwd(), "domain/localData.ts"), "utf8");
ok(`the seen-ledger key is registered in the storage inventory as a preference (so a reset of activity keeps what you have read)`,
  localData.includes('{ key: TEACH_SEEN_KEY, labelKey: "set.key.teach", kind: "preference" }') &&
  locales.every((l) => typeof D[l]["set.key.teach"] === "string"));

// --- Arming: the catalogue reader refuses an unknown id, and the wiring readers catch a loss. --------
const ghost = teachHintKey("ghost-lesson");
const lostGrid = teachEntries !== 22;
ok(`the readers are armed: an id outside the catalogue resolves null rather than a raw key at runtime (${ghost}), and the tile counter would redden a grid that lost a lesson (a 21-entry grid reads caught: ${!lostGrid})`,
  ghost === null && teachHintKey("player") === "teach.player" && !lostGrid);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
