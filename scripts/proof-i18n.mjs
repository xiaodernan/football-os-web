// Proof for the i18n contract. The dictionary is a loose Record<string,string>
// and `t()` falls back to English then to the raw key, so a missing translation
// never fails loudly — a Chinese user just sees English, or a bare `fw.hub.title`.
// This pins the ways that goes wrong:
//   1. a locale missing a key the others have,
//   2. a key present but blank,
//   3. a placeholder a locale drops, so `t()` leaves `{n}` on screen,
//   4. a `t("...")` call site naming a key the dictionary does not define,
//   5. a dynamic `t()` prefix that resolves to nothing,
//   6. a dictionary inheriting from a sibling — zh-TW used to open with
//      `...zhCN`, which both served Simplified text to Traditional readers and
//      made check 1 structurally incapable of failing, since the assembled object
//      always had every key (M142's mutation test proved that; M143 removed the
//      spread and this check keeps it from coming back),
//   7. a 简体 character surviving inside a zh-TW value,
//   8. a screen whose labels live in a variable (so check 4 cannot see them)
//      carrying raw text instead of dictionary keys,
//   9. a shared primitive falling back to a hardcoded English string, which would
//      go untranslated on every screen at once,
//  10. a panel whose labels live in a variable rendering stored text (Scouting),
//  11. a string prop on that panel carrying raw English, which no key-level check
//      can see,
//  12. a JSX text node on that panel carrying raw English beyond a declared list
//      of stat codes,
//  13. the specific English prose M145 moved into the dictionary coming back,
//  14. a domain function handing a board an untranslated display label — the
//      shape checks 10-12 cannot see, because it arrives as an interpolation,
//  15. a value of a dynamic key's real value space (CATEGORY_ORDER) missing from
//      a locale, which check 5's prefix-only test cannot catch,
//  16. a dynamic `t()` site that is not in the declared table, or a table entry
//      whose site has been renamed or deleted,
//  17. a declared value space whose members lack a key in some locale,
//  18. a dictionary key nothing can reach — not a literal, not a variable-held
//      label, not a value any dynamic site can build.
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

// 6. No dictionary may inherit from another. zh-TW used to open with `...zhCN`,
//    which silently served 简体中文 to a 繁體中文 visitor for 18 keys AND made
//    check 1 above structurally unable to fail (the assembled object always had
//    every key). M143 wrote the block out; this keeps the spread from returning.
const dictSrc = readFileSync(join(root, "i18n", "dictionaries.ts"), "utf8");
const declAt = (n) => dictSrc.indexOf(`const ${n}: Dict = {`);
const dictEnd = dictSrc.indexOf("export const DICTIONARIES");
const bounds = [["en", declAt("en")], ["zh-CN", declAt("zhCN")], ["zh-TW", declAt("zhTW")]];
ok("all three dictionary literal blocks are locatable by name (else the checks below slice garbage)",
  bounds.every(([, at]) => at > 0) && dictEnd > declAt("zhTW"));
// Key + value pairs read out of a block's own literal text. Comments are prose
// and must not be mistaken for something the interface renders.
const KEYVAL = /"([^"]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
const sliceOf = (i) => dictSrc.slice(bounds[i][1], i + 1 < bounds.length ? bounds[i + 1][1] : dictEnd);
const pairsOf = (i) => [...sliceOf(i).matchAll(KEYVAL)].map((m) => [m[1], m[2]]);
const valuesOf = (i) => pairsOf(i).map(([, v]) => v);
// Keys per block, not the assembled object: a key zh-TW inherits would look
// defined here and that is exactly the hole M143 closed.
const keysOf = (i) => pairsOf(i).map(([k]) => k);
for (let i = 0; i < bounds.length; i++) {
  // Comment lines are excluded: the zh-TW block documents in prose that it used to
  // spread zh-CN, and a gate that reads that as the spread itself is not a gate.
  const code = sliceOf(i).split(/\r?\n/).filter((l) => !/^\s*\/\//.test(l)).join("\n");
  ok(`${bounds[i][0]} declares its own keys instead of spreading a sibling dictionary`,
    !/\.\.\.(en|zhCN|zhTW)\b/.test(code));
}

// 7. Script regression, for the characters that were actually wrong here. These
//    sixteen are exactly the 简体 forms the M143 audit found inside strings a
//    繁體中文 reader was shown (located with OpenCC's STCharacters table, then
//    hand-adjudicated — the variant forms 峰 and 群 were left alone, since they
//    are ordinary Traditional). This is a closed list, NOT a converter: a
//    simplified character this file had never used would slip through, so the
//    general defence is check 6 plus review. Widening it to the full 3800-char
//    table would fail on legitimate variants and would mean vendoring a converter
//    into a proof script for a static site.
const SIMPLIFIED_SEEN = "赛进档属训练标视频术体战经验龄评画并";
const twValues = valuesOf(2);
const strays = [...new Set(twValues.flatMap((v) => [...v]).filter((c) => SIMPLIFIED_SEEN.includes(c)))];
ok(`no zh-TW value reintroduces one of the 16 简体 characters M143 corrected (${strays.join("") || "none"})`,
  strays.length === 0);

// 8. A label held in a variable is invisible to check 4 — `t(tab.label)` contains
//    no literal key to match. The player tab strip is the case that matters: the
//    tab labels M143 rewrote into 繁體 only reach the screen if the strip reads
//    them from the dictionary, so pin both halves of that contract.
const tabSrc = readFileSync(join(root, "features", "player", "PlayerOS.tsx"), "utf8");
const tabBlock = tabSrc.match(/const TABS = \[[\s\S]*?\];/)?.[0] ?? "";
ok("the player TABS array is locatable (else check 8 is vacuous)", tabBlock.length > 0);
const tabLabels = [...tabBlock.matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1]);
ok(`all ten tabs carry a label (${tabLabels.length})`, tabLabels.length === 10);
// Raw English would still render perfectly for an English visitor, which is why
// the parity and the t() call are checked instead of the glyphs.
const rawLabels = tabLabels.filter((l) => !bounds.every((_, i) => keysOf(i).includes(l)));
ok(`every tab label is a key all three dictionaries declare (${rawLabels.join(", ") || "none"})`,
  rawLabels.length === 0);
const tTab = /\{t\(\s*tab\.label\s*\)\}/.test(tabSrc);
ok("the tab strip renders its labels through t() rather than as stored text", tTab);
// 9. The shared primitives sit on nearly every screen, so a literal inside one of
//    them is untranslated UI everywhere at once. M144 moved the demo badge, the
//    loading status, and the empty/error states into the dictionary; both halves
//    are pinned, because deleting the `t()` call and re-typing the English are
//    different regressions.
const prim = readFileSync(join(root, "ui", "primitives.tsx"), "utf8");
const PRIMITIVE_KEYS = ["common.demo", "common.synthetic", "common.empty", "common.error", "common.errorDetail", "cta.retry", "cta.loading"];
const unwired = PRIMITIVE_KEYS.filter((k) => !prim.includes(`t("${k}")`));
ok(`the primitives read all ${PRIMITIVE_KEYS.length} of their own labels from the dictionary (${unwired.join(", ") || "none"})`,
  unwired.length === 0);
const STRUCK = ["● DEMO DATA", "Something went wrong", "Unexpected error while loading", `title = "Nothing here yet"`];
const backslid = STRUCK.filter((s) => prim.includes(s));
ok(`no primitive still hardcodes the English M144 replaced (${backslid.join(" | ") || "none"})`, backslid.length === 0);

// 10. M145 localised the Scouting board. Two of its label arrays keep the key in
//     a variable, the same shape check 8 had to reach, so both arrays and both
//     render sites are pinned.
const scoutSrc = readFileSync(join(root, "features", "scouting", "ScoutingPanel.tsx"), "utf8");
const SCOUT_ARRAYS = [
  ["SORTS", /const SORTS[\s\S]*?\];/],
  ["comparison rows", /const rows[\s\S]*?\];/],
];
for (const [name, re] of SCOUT_ARRAYS) {
  const block = scoutSrc.match(re)?.[0] ?? "";
  ok(`the Scouting ${name} array is locatable (else this check is vacuous)`, block.length > 0);
  const ls = [...block.matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1]);
  ok(`Scouting ${name} carries ${ls.length} labels`, ls.length > 0);
  const raw = ls.filter((l) => !bounds.every((_, i) => keysOf(i).includes(l)));
  ok(`every Scouting ${name} label is a key all three dictionaries declare (${raw.join(", ") || "none"})`, raw.length === 0);
}
ok("both Scouting label arrays render through t()",
  /\{t\(s\.label\)\}/.test(scoutSrc) && /\{t\(r\.label\)\}/.test(scoutSrc));

// 11. A `title="English"` prop is invisible to check 4 (there is no key to look
//     up) and to check 10 (it is not in an array), so it is matched by shape.
const engProps = [...scoutSrc.matchAll(/\b(?:title|hint|label|placeholder|description|aria-label)="[^"]*[A-Za-z]{2}[^"]*"/g)].map((m) => m[0]);
ok(`no Scouting string prop still carries raw English (${engProps.join(" | ") || "none"})`, engProps.length === 0);

// 12. Same for JSX text nodes, in both shapes they take: text that runs into a
//     tag, and text that runs into an interpolation ("Foo: {x}"). The carve-out
//     is the honest remainder — OVR, POT and OVR/€M are monospace stat codes the
//     app prints identically in all three locales, and "vs" is a separator. A
//     node that mixes prose with an interpolation *after* a `{…}` is still a
//     blind spot here; check 13 covers the specific sentences M145 moved.
const CODE_TEXT = ["OVR", "POT", "OVR/€M", "vs"];
// `(?<!=)` skips arrow functions: `() => scoutCandidates({` would otherwise read
// as a text node running into an interpolation.
const nodeTexts = [
  ...[...scoutSrc.matchAll(/(?<!=)>[^<>{}\n]+(?=<)/g)].map((m) => m[0].slice(1)),
  ...[...scoutSrc.matchAll(/(?<!=)>[^<>{}\n]+(?=\{)/g)].map((m) => m[0].slice(1)),
].map((x) => x.trim()).filter((x) => /[A-Za-z]{2}/.test(x) && !/[):;=}&|]/.test(x));
const strayTexts = nodeTexts.filter((x) => !CODE_TEXT.includes(x));
ok(`the Scouting board renders no English text node beyond its ${CODE_TEXT.length} stat codes (${strayTexts.join(" | ") || "none"})`,
  strayTexts.length === 0);
ok(`the text-node scan sees nodes rather than nothing (${nodeTexts.length} found)`, nodeTexts.length >= CODE_TEXT.length);

// 13. The prose M145 moved into the dictionary, struck as literals. The panel's
//     own tooltip used to be a hand-typed copy of watch.templateHint, so pinning
//     the sentence also pins the point that only one copy exists.
const SCOUT_STRUCK = [
  "Explainable shortlists from the world dataset",
  "Your club needs",
  "Amber = thin or below-average group",
  "Highest overall per €1M among eligible players",
  "Discover targets",
  "Loosen the overall, age or value filters",
  "Strongest and weakest category against a player",
  "Saved on this device",
  "Use the Cmp checkboxes",
  "Growth headroom",
];
const scoutBack = SCOUT_STRUCK.filter((s) => scoutSrc.includes(s));
ok(`no Scouting string reintroduces the English M145 replaced (${scoutBack.join(" | ") || "none"})`, scoutBack.length === 0);

// 14. A domain function that hands the UI a *display label* is invisible to every
//     check above: it reaches the screen as an interpolation, not a text node or a
//     string prop. `templateEdge` used to return `bestLabel: "Tactical"`, which the
//     two list boards printed as English on a 繁體中文 page; only the browser showed
//     it. It now returns the category id and each board translates it.
const { CATEGORY_ORDER } = await server.ssrLoadModule("/domain/attributes.ts");
const EDGE_SOURCES = [
  ["domain/scouting.ts", readFileSync(join(root, "domain", "scouting.ts"), "utf8")],
  ["the Scouting board", scoutSrc],
  ["the watchlist board", readFileSync(join(root, "features", "watchlist", "WatchlistBoard.tsx"), "utf8")],
];
const leakedLabels = EDGE_SOURCES.flatMap(([name, src]) => [...src.matchAll(/\b(?:best|worst)Label\b/g)].map(() => name));
ok(`no template-edge display label survives in the domain or either board (${leakedLabels.join(", ") || "none"})`, leakedLabels.length === 0);
const untranslatedEdge = EDGE_SOURCES.slice(1)
  .filter(([, src]) => !src.includes("compare.cat.${edge.bestCategory}") || !src.includes("compare.cat.${edge.worstCategory}"))
  .map(([name]) => name);
ok(`both boards translate both template-edge categories (${untranslatedEdge.join(", ") || "none"})`, untranslatedEdge.length === 0);

// 15. That render site is a dynamic key, and check 5 can only prove the prefix
//     resolves to *something*. A category the dictionary misses would print its
//     raw key at runtime, so pin the whole value space against the real array.
const missingCat = CATEGORY_ORDER.filter((c) => !bounds.every((_, i) => keysOf(i).includes(`compare.cat.${c}`)));
ok(`all ${CATEGORY_ORDER.length} categories have compare.cat.* in every locale (${missingCat.join(", ") || "none"})`,
  CATEGORY_ORDER.length >= 4 && missingCat.length === 0);

// 16-18. Key reachability with NO exception list. Checks 4 and 5 each cover one
//      shape and leave the rest to human reading: a key held in a variable is
//      invisible to 4, and 5 can only prove a dynamic prefix resolves to
//      *something* — `t(\`prof.mode.${r.id}\`)` would happily pass while the
//      dictionary held a `prof.mode.coach` nothing could ever ask for. M145 cut
//      17 dead keys and M146 13 more by hand; that does not scale, so from here
//      every key in the dictionary must be claimed by one of exactly three
//      rules, and every dynamic site must name the code that builds its values:
//        (a) a `t("key")` literal,
//        (b) the key as a quoted string in app code — a label held in a variable
//            (checks 8 and 10), or in a config array,
//        (c) a declared dynamic site whose real value space, read out of the
//            source that feeds it, produces the key.
//      A new dynamic site that is not in DYN_SITES fails check 16, so the table
//      cannot quietly fall behind the code, and no key can be added to the
//      dictionary without a caller.
const rel = (f) => f.replace(root, "").replace(/\\/g, "/").replace(/^\//, "");
// Comment lines cannot claim a key: prose that quotes a key is not a caller.
const codeOf = (src) => src.split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
const appSrc = new Map(files.filter((f) => !rel(f).startsWith("i18n/")).map((f) => [rel(f), codeOf(readFileSync(f, "utf8"))]));

const { ACHIEVEMENTS } = await server.ssrLoadModule("/domain/achievements.ts");
const quoted = /"([^"]+)"/g;
// Read a value space out of the source that feeds it. `anchor` locates the
// literal (and is checked, so a moved array reports red instead of passing
// vacuously on an empty list); `field` picks the values out of it.
const spaceOf = (path, anchor, field) => {
  const src = appSrc.get(path) ?? "";
  const hit = src.match(anchor);
  if (!hit) { ok(`the ${path} anchor for a dynamic value space is locatable`, false); return []; }
  return [...hit[0].matchAll(field)].map((m) => m[1]);
};
const MODES_UPPER = spaceOf("domain/types.ts", /export type Mode = [^;]+;/, quoted);
const ACH_IDS = ACHIEVEMENTS.map((a) => a.id);
const ACH_TIERS = [...new Set(ACHIEVEMENTS.map((a) => a.tier))];
const lower = (xs) => xs.map((x) => x.toLowerCase());

// Each entry: the file holding the site, the interpolated expression as written,
// the key prefix/suffix it builds, and the code-derived set of values it can
// take. `expr` is matched verbatim, so renaming what is interpolated counts as
// a new site rather than silently re-pointing an old one.
const DYN_SITES = [
  { path: "features/achievements/AchievementsPage.tsx", expr: "a.id", prefix: "ach.name.", suffix: "" },
  { path: "features/dashboard/Dashboard.tsx", expr: "growth.next.id", prefix: "ach.name.", suffix: "" },
  { path: "features/achievements/AchievementsPage.tsx", expr: "a.id", prefix: "ach.desc.", suffix: "" },
  { path: "features/dashboard/Dashboard.tsx", expr: "growth.next.id", prefix: "ach.desc.", suffix: "" },
  { path: "features/achievements/AchievementsPage.tsx", expr: "a.tier", prefix: "ach.tier.", suffix: "" },
  { path: "features/player/PlayerOS.tsx", expr: "cat", prefix: "attr.", suffix: "" },
  { path: "features/compare/ComparePage.tsx", expr: "c.category", prefix: "compare.cat.", suffix: "" },
  { path: "features/scouting/ScoutingPanel.tsx", expr: "edge.bestCategory", prefix: "compare.cat.", suffix: "" },
  { path: "features/scouting/ScoutingPanel.tsx", expr: "edge.worstCategory", prefix: "compare.cat.", suffix: "" },
  { path: "features/watchlist/WatchlistBoard.tsx", expr: "edge.bestCategory", prefix: "compare.cat.", suffix: "" },
  { path: "features/watchlist/WatchlistBoard.tsx", expr: "edge.worstCategory", prefix: "compare.cat.", suffix: "" },
  { path: "features/compare/ComparePage.tsx", expr: "m.key", prefix: "compare.m.", suffix: "" },
  { path: "features/football/FootballWorld.tsx", expr: "tab.toLowerCase()", prefix: "fw.status.", suffix: "" },
  { path: "features/football/FootballWorld.tsx", expr: "tab.toLowerCase()", prefix: "fw.status.", suffix: "" },
  { path: "features/football/FootballWorld.tsx", expr: "type", prefix: "fw.type.", suffix: "" },
  { path: "features/landing/Landing.tsx", expr: "p.k", prefix: "landing.pillars.", suffix: "" },
  { path: "features/onboarding/Onboarding.tsx", expr: "m.toLowerCase()", prefix: "onboarding.", suffix: "" },
  { path: "features/shell/AppShell.tsx", expr: "m.toLowerCase()", prefix: "onboarding.", suffix: "" },
  { path: "features/onboarding/Onboarding.tsx", expr: "m.toLowerCase()", prefix: "onboarding.", suffix: ".desc" },
  { path: "features/profile/ProfilePage.tsx", expr: "p.mode", prefix: "prof.mode.", suffix: "" },
  { path: "features/profile/ProfilePage.tsx", expr: "r.id", prefix: "prof.mode.", suffix: "" },
  { path: "features/settings/SettingsPage.tsx", expr: "m", prefix: "set.mode.", suffix: "" },
  { path: "features/tactical/TacticalStudio.tsx", expr: "i", prefix: "tac.mentality.", suffix: "" },
  { path: "features/watchlist/WatchlistBoard.tsx", expr: "s", prefix: "watch.sort.", suffix: "" },
];
// One space per (prefix, expression) pair: the two `prof.mode.` sites take the
// same prefix from different code, which is why the space is not keyed on the
// prefix alone. Several sites can share one space object, and check 16 requires
// every site's pair to appear here.
const S_ACH = { name: "achievement ids", values: ACH_IDS };
const S_CAT = { name: "attribute categories", values: CATEGORY_ORDER };
const S_MODE = { name: "Mode union", values: MODES_UPPER };
const SPACES = new Map([
  ["ach.name.|a.id", S_ACH],
  ["ach.name.|growth.next.id", S_ACH],
  ["ach.desc.|a.id", S_ACH],
  ["ach.desc.|growth.next.id", S_ACH],
  ["ach.tier.|a.tier", { name: "achievement tiers", values: ACH_TIERS }],
  ["attr.|cat", S_CAT],
  ["compare.cat.|c.category", S_CAT],
  ["compare.cat.|edge.bestCategory", S_CAT],
  ["compare.cat.|edge.worstCategory", S_CAT],
  ["compare.m.|m.key", {
    name: "comparison metrics",
    values: spaceOf("domain/compare.ts", /\{ key: "overall",[\s\S]*?\n  \];/, /\{ key: "([^"]+)",/g),
  }],
  ["fw.status.|tab.toLowerCase()", {
    name: "match statuses",
    values: lower(spaceOf("features/football/FootballWorld.tsx", /\["LIVE"[\s\S]*?\] as const/, quoted)),
  }],
  ["fw.type.|type", {
    name: "search result types",
    values: spaceOf("features/football/FootballWorld.tsx", /\["player"[^\]]*\] as const/, quoted),
  }],
  ["landing.pillars.|p.k", {
    name: "landing pillar keys",
    values: spaceOf("features/landing/Landing.tsx", /\{ k: "coach",[\s\S]*?\n          \]/, /\{ k: "([^"]+)",/g),
  }],
  ["onboarding.|m.toLowerCase()", {
    name: "modes, lower-cased by the site",
    values: lower(MODES_UPPER),
  }],
  ["prof.mode.|p.mode", S_MODE],
  ["prof.mode.|r.id", {
    name: "cross-mode record rows",
    values: spaceOf("domain/footprint.ts", /^\s+id: "player",[\s\S]*?^\s+id: "fan",$/m, /^\s+id: "([^"]+)",$/gm),
  }],
  ["set.mode.|m", S_MODE],
  ["tac.mentality.|i", {
    // The slider's own range, which is also what the incoming deep link is
    // clamped to, so 0..4 is the real space rather than a hand-typed count.
    name: "mentality slider",
    values: (() => {
      const m = (appSrc.get("features/tactical/TacticalStudio.tsx") ?? "").match(/type="range"[^>]*min=\{(\d+)\} max=\{(\d+)\}/);
      if (!m) { ok("the mentality slider range is locatable", false); return []; }
      return Array.from({ length: Number(m[2]) - Number(m[1]) + 1 }, (_, i) => String(Number(m[1]) + i));
    })(),
  }],
  ["watch.sort.|s", {
    name: "watchlist sorts",
    values: spaceOf("features/watchlist/WatchlistBoard.tsx", /\["value"[\s\S]*?\] as Sort\[\]/, quoted),
  }],
]);

// 16. The table and the source must agree in both directions.
const SITE = /\bt\(\s*`([^`]*)\$\{([^}]*)\}([^`]*)`/g;
const live = new Map();
for (const [path, src] of appSrc) {
  for (const m of src.matchAll(SITE)) {
    const k = `${path}|${m[1]}|${m[2].trim()}|${m[3]}`;
    live.set(k, (live.get(k) ?? 0) + 1);
  }
}
const declared = new Map();
for (const s of DYN_SITES) {
  const k = `${s.path}|${s.prefix}|${s.expr}|${s.suffix}`;
  declared.set(k, (declared.get(k) ?? 0) + 1);
}
const undeclared = [...live.keys()].filter((k) => !declared.has(k));
const stale = [...declared.keys()].filter((k) => !live.has(k));
const countDrift = [...declared].filter(([k, n]) => live.get(k) && live.get(k) !== n).map(([k, n]) => `${k} (${n} vs ${live.get(k)})`);
ok(`every dynamic t() site is declared, and every declaration is live (${live.size} sites / ${undeclared.length} undeclared / ${stale.length} stale)`,
  live.size > 0 && undeclared.length === 0 && stale.length === 0 && countDrift.length === 0);
for (const u of undeclared.slice(0, 8)) console.log("       undeclared: " + u);
for (const s of stale.slice(0, 8)) console.log("       stale: " + s);
for (const c of countDrift.slice(0, 8)) console.log("       count: " + c);

// 17. Each declared space is complete in all three locales, so a value the code
//     can produce never renders as its own key. Reported once per distinct
//     (prefix, suffix, expression) rather than once per call site.
const SPACE_SITES = new Map();
for (const s of DYN_SITES) {
  const k = `${s.prefix}|${s.expr}|${s.suffix}`;
  if (!SPACE_SITES.has(k)) SPACE_SITES.set(k, s);
}
for (const s of SPACE_SITES.values()) {
  const sp = SPACES.get(`${s.prefix}|${s.expr}`);
  if (!sp) { ok(`a value space is declared for ${s.prefix}…${s.suffix}`, false); continue; }
  const keys = sp.values.map((v) => s.prefix + v + s.suffix);
  const missing = keys.filter((k) => !bounds.every((_, i) => keysOf(i).includes(k)));
  ok(`${s.prefix}…${s.suffix} · ${sp.name}: all ${keys.length} values keyed in every locale (${missing.join(", ") || "none"})`,
    keys.length > 0 && missing.length === 0);
}

// 18. The headline: no key in the dictionary is unreachable.
const claimed = new Set();
const KEY_LIKE = /["']([A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]+)+)["']/g;
for (const [, src] of appSrc) {
  for (const m of src.matchAll(STATIC)) claimed.add(m[1]);
  for (const m of src.matchAll(KEY_LIKE)) claimed.add(m[1]);
}
const dynKeys = new Set(DYN_SITES.flatMap((s) => (SPACES.get(`${s.prefix}|${s.expr}`)?.values ?? []).map((v) => s.prefix + v + s.suffix)));
const unreachable = enKeys.filter((k) => !claimed.has(k) && !dynKeys.has(k));
ok(`every dictionary key is reachable — static, quoted, or a value a dynamic site can build (${unreachable.join(", ") || "none"})`,
  unreachable.length === 0);
// Anti-vacuity: the scan has to be reading real claims, not passing because a
// regex stopped matching anything.
ok(`the reachability scan claims the dictionary rather than nothing (${claimed.size} static/quoted + ${dynKeys.size} dynamic)`,
  claimed.size + dynKeys.size >= enKeys.length && claimed.size > 500 && dynKeys.size > 50);

console.log(`\n${enKeys.length} keys · ${L.length} locales`);
console.log(`${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
