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
//      label, not a value any dynamic site can build,
//  19. the domain name tables drifting away from the dictionary's English values:
//      they now only compose prose, so a rename that skips the dictionary would
//      print the old name in a generated sentence and the new one on screen,
//  20. a second category namespace coming back — compare.cat.* duplicated attr.*,
//  21. the domain name tables being referenced from UI text again instead of
//      staying in the prose layer (the coach-prompt builders that legitimately
//      reference them are declared and count-checked),
//  22. an attribute's English name handed to a UI slot as a literal prop or text
//      node, which no key-level check can see,
//  23. the specific row interpolations M147 converted coming back,
//  24. a caller reading an interpolated key without filling its placeholders,
//      which prints `{a}` on the screen in every locale,
//  25. a key a *domain* module composes (`goal.unit.${metric}`) being incomplete,
//      drifting from the type union it reads, or left behind by a deleted composer
//      — the same three ways check 17 catches a component site, which cannot see it,//  26. a row handed from a domain module to the interface carrying a key that is
//      not in the dictionary, a placeholder the row never supplies, or a sentence
//      the module wrote itself — which no JSX-scanning check can see (M149).
// Run: node scripts/proof-i18n.mjs
import { readdirSync, readFileSync } from "node:fs";
import { scanSource, lookupsIn } from "./lib/rawUiScan.mjs";
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
const { CATEGORY_ORDER, ATTRIBUTE_DEFS, POSITION_GROUPS } = await server.ssrLoadModule("/domain/attributes.ts");
const SCOUT_DOMAIN = readFileSync(join(root, "domain", "scouting.ts"), "utf8");
const EDGE_SOURCES = [
  ["the Scouting board", scoutSrc],
  ["the watchlist board", readFileSync(join(root, "features", "watchlist", "WatchlistBoard.tsx"), "utf8")],
];
const leakedLabels = EDGE_SOURCES.flatMap(([name, src]) => [...src.matchAll(/\b(?:best|worst)Label\b/g)].map(() => name));
ok(`no template-edge display label reaches either board (${leakedLabels.join(", ") || "none"})`, leakedLabels.length === 0);
// The row types themselves: M147 removed `label` from TemplateEdge,
// CategoryEdgeRow and ModelledAttribute, so the compiler — not a reading of the
// prose — is what stops a label being re-added and printed. A proof that only
// looked at the boards would pass while the domain quietly kept a label field.
const scoutLabelFields = [...SCOUT_DOMAIN.matchAll(/^\s+label: string;$/gm)].length;
ok(`the scout-report rows domain/scouting.ts exports carry no label field (${scoutLabelFields})`, scoutLabelFields === 0);
const untranslatedEdge = EDGE_SOURCES
  .filter(([, src]) => !src.includes("attr.${edge.bestCategory}") || !src.includes("attr.${edge.worstCategory}"))
  .map(([name]) => name);
ok(`both boards translate both template-edge categories (${untranslatedEdge.join(", ") || "none"})`, untranslatedEdge.length === 0);

// 15. That render site is a dynamic key, and check 5 can only prove the prefix
//     resolves to *something*. A category the dictionary misses would print its
//     raw key at runtime, so pin the whole value space against the real array.
const missingCat = CATEGORY_ORDER.filter((c) => !bounds.every((_, i) => keysOf(i).includes(`attr.${c}`)));
ok(`all ${CATEGORY_ORDER.length} categories have attr.* in every locale (${missingCat.join(", ") || "none"})`,
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
  { path: "features/player/PlayerOS.tsx", expr: "cat", prefix: "attr.", suffix: "" },
  { path: "ui/charts.tsx", expr: "c.category", prefix: "attr.", suffix: "" },
  { path: "features/compare/ComparePage.tsx", expr: "c.category", prefix: "attr.", suffix: "" },
  { path: "features/football/Details.tsx", expr: "c.category", prefix: "attr.", suffix: "" },
  { path: "features/scouting/ScoutingPanel.tsx", expr: "edge.bestCategory", prefix: "attr.", suffix: "" },
  { path: "features/scouting/ScoutingPanel.tsx", expr: "edge.worstCategory", prefix: "attr.", suffix: "" },
  { path: "features/watchlist/WatchlistBoard.tsx", expr: "edge.bestCategory", prefix: "attr.", suffix: "" },
  { path: "features/watchlist/WatchlistBoard.tsx", expr: "edge.worstCategory", prefix: "attr.", suffix: "" },
  // M147: an attribute name is a key lookup, wherever the row came from. Each of
  // these interpolates a key out of a domain row (edge, item, growth delta,
  // focus chip, projection line), so the space is the attribute table itself.
  { path: "features/compare/ComparePage.tsx", expr: "e.key", prefix: "attr.name.", suffix: "" },
  { path: "features/dashboard/Dashboard.tsx", expr: "f.key", prefix: "attr.name.", suffix: "" },
  { path: "features/development/DevelopmentPage.tsx", expr: "item.key", prefix: "attr.name.", suffix: "" },
  { path: "features/development/DevelopmentPage.tsx", expr: "it.key", prefix: "attr.name.", suffix: "" },
  { path: "features/development/DevelopmentPage.tsx", expr: "it.key", prefix: "attr.name.", suffix: "" },
  { path: "features/development/DevelopmentPage.tsx", expr: "analysis.group", prefix: "group.", suffix: "" },
  { path: "features/film/FilmRoom.tsx", expr: "f.key", prefix: "attr.name.", suffix: "" },
  { path: "features/film/FilmRoom.tsx", expr: "k", prefix: "attr.name.", suffix: "" },
  { path: "features/football/Details.tsx", expr: "at.key", prefix: "attr.name.", suffix: "" },
  { path: "features/football/Details.tsx", expr: "at.key", prefix: "attr.name.", suffix: "" },
  { path: "features/football/Details.tsx", expr: "s.key", prefix: "attr.name.", suffix: "" },
  { path: "features/football/Details.tsx", expr: "s.key", prefix: "attr.name.", suffix: "" },
  { path: "features/history/HistoryPage.tsx", expr: "g.key", prefix: "attr.name.", suffix: "" },
  { path: "features/player/PlayerOS.tsx", expr: "d.key", prefix: "attr.name.", suffix: "" },
  { path: "features/player/PlayerOS.tsx", expr: "d.key", prefix: "attr.name.", suffix: "" },
  { path: "features/player/PlayerOS.tsx", expr: "d.key", prefix: "attr.name.", suffix: "" },
  { path: "features/player/PlayerOS.tsx", expr: "f", prefix: "attr.name.", suffix: "" },
  { path: "features/player/PlayerOS.tsx", expr: "g.key", prefix: "attr.name.", suffix: "" },
  { path: "features/player/PlayerOS.tsx", expr: "k", prefix: "attr.name.", suffix: "" },
  { path: "features/player/PlayerOS.tsx", expr: "k", prefix: "attr.name.", suffix: "" },
  { path: "features/player/PlayerOS.tsx", expr: "w.key", prefix: "attr.name.", suffix: "" },
  { path: "features/profile/ProfilePage.tsx", expr: "s.key", prefix: "attr.name.", suffix: "" },
  { path: "features/profile/ProfilePage.tsx", expr: "s.key", prefix: "attr.name.", suffix: "" },
  { path: "features/review/ReviewPage.tsx", expr: "f.key", prefix: "attr.name.", suffix: "" },
  { path: "features/review/ReviewPage.tsx", expr: "f.key", prefix: "attr.name.", suffix: "" },
  { path: "features/review/ReviewPage.tsx", expr: "g.key", prefix: "attr.name.", suffix: "" },
  { path: "features/review/ReviewPage.tsx", expr: "reco.attributeKey", prefix: "attr.name.", suffix: "" },
  { path: "domain/rowText.ts", expr: "code", prefix: "attr.name.", suffix: "" },
  { path: "domain/rowText.ts", expr: "code", prefix: "group.", suffix: "" },
  { path: "domain/rowText.ts", expr: "code", prefix: "prof.mode.", suffix: "" },
  { path: "domain/rowText.ts", expr: "code", prefix: "onb.goal.", suffix: "" },
  { path: "domain/rowText.ts", expr: "code", prefix: "onb.age.", suffix: "" },
  { path: "features/review/ReviewPage.tsx", expr: "review.recommendation.attributeKey", prefix: "attr.name.", suffix: "" },
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
  // M148: the favourite control derives its own copy from the kind it favours, and
  // the career-arc badge prints the trajectory the model returned.
  { path: "features/football/Details.tsx", expr: "kind", prefix: "fav.", suffix: ".active" },
  { path: "features/football/Details.tsx", expr: "kind", prefix: "fav.", suffix: ".idle" },
  { path: "features/football/Details.tsx", expr: "arc.trajectory", prefix: "det.arc.", suffix: "" },
  { path: "features/football/Details.tsx", expr: "m.status.toLowerCase()", prefix: "fw.status.", suffix: "" },
  // M161: the board's six tags and two sorts are data strings read out of the
  // domain/Tab strip, so their sites are declared against the arrays that produce
  // them rather than against a hand-typed list.
  { path: "features/community/CommunityHub.tsx", expr: "tag", prefix: "comm.tag.", suffix: "" },
  { path: "features/community/CommunityHub.tsx", expr: "s", prefix: "comm.sort.", suffix: "" },
];
// One space per (prefix, expression) pair: the two `prof.mode.` sites take the
// same prefix from different code, which is why the space is not keyed on the
// prefix alone. Several sites can share one space object, and check 16 requires
// every site's pair to appear here.
const S_ACH = { name: "achievement ids", values: ACH_IDS };
const S_CAT = { name: "attribute categories", values: CATEGORY_ORDER };
const S_ATTR = { name: "attribute keys", values: ATTRIBUTE_DEFS.map((d) => d.key) };
const S_GROUP = { name: "position groups", values: POSITION_GROUPS.map((g) => g.id) };
const S_MODE = { name: "Mode union", values: MODES_UPPER };
const ONB_GOAL_CODES = spaceOf("domain/onboarding.ts", /export const GOAL_CODES[^;]+;/, quoted);
const ONB_AGE_WORDS = spaceOf("domain/onboarding.ts", /export const TRANSLATED_AGE_GROUPS[^;]+;/, quoted);
const S_ONB_GOAL = { name: "onboarding goal codes", values: ONB_GOAL_CODES };
const S_ONB_AGE = { name: "translated age bands", values: ONB_AGE_WORDS };
const SPACES = new Map([
  ["ach.name.|a.id", S_ACH],
  ["ach.name.|growth.next.id", S_ACH],
  ["ach.desc.|a.id", S_ACH],
  ["ach.desc.|growth.next.id", S_ACH],
  ["ach.tier.|a.tier", { name: "achievement tiers", values: ACH_TIERS }],
  ["attr.|cat", S_CAT],
  ["attr.|c.category", S_CAT],
  ["attr.|edge.bestCategory", S_CAT],
  ["attr.|edge.worstCategory", S_CAT],
  ["group.|analysis.group", S_GROUP],
  ["compare.m.|m.key", {
    name: "comparison metrics",
    values: spaceOf("domain/compare.ts", /\{ key: "overall",[\s\S]*?\n  \];/, /\{ key: "([^"]+)",/g),
  }],
  ["det.arc.|arc.trajectory", {
    name: "career trajectories",
    values: spaceOf("domain/careerArc.ts", /export type Trajectory = [^;]+;/, quoted),
  }],
  ["fav.|kind", {
    // The store's own action signature: it is what every caller must satisfy, so
    // it is the space the control can actually be handed.
    name: "favourite kinds",
    values: spaceOf("store/useFootballOS.tsx", /setFavorite: \(key: "[a-z]+"(?: \| "[a-z]+")+/, quoted),
  }],
  ["fw.status.|tab.toLowerCase()", {
    name: "match statuses",
    values: lower(spaceOf("features/football/FootballWorld.tsx", /\["LIVE"[\s\S]*?\] as const/, quoted)),
  }],
  ["fw.status.|m.status.toLowerCase()", {
    // A fixture's own status field, not the filter tabs: the union the type says
    // a match can carry is the space this site can be handed.
    name: "match status field, lower-cased by the site",
    values: lower(spaceOf("domain/types.ts", /export type MatchStatus = [^;]+;/, quoted)),
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
  ["comm.tag.|tag", {
    // The tag words the board filters and stores, straight from the only place
    // that defines them — so a new tag fails here until it has a key.
    name: "community tags",
    values: spaceOf("domain/community.ts", /export function allTags\(\): string\[\] \{[\s\S]*?\n\}/, quoted),
  }],
  ["comm.sort.|s", {
    name: "community sorts",
    values: spaceOf("features/community/CommunityHub.tsx", /\["recent", "top"\] as const/, quoted),
  }],
]);
// Every `attr.name.…` site interpolates an attribute key out of some domain row,
// so they all take the same space, and listing it 20 times would only invite the
// copies to drift. Check 16 still requires every *site* to be declared by file
// and expression, which is what stops a new leak reading as already covered.
// A declared site's expression also has to name a value space. Claimed here by prefix
// so a new site of a known family is covered the moment it is declared — but only when
// the site does not already carry its own declaration, because a same-named variable
// can hold a different set: `prof.mode.${r.id}` walks the footprint's record rows, not
// the Mode union, and overwriting it silently drops four real keys out of reach.
const claimByPrefix = (prefix, space) => {
  for (const s of DYN_SITES) {
    if (s.prefix !== prefix) continue;
    const k = `${prefix}|${s.expr}`;
    if (!SPACES.has(k)) SPACES.set(k, space);
  }
};
claimByPrefix("attr.name.", S_ATTR);
claimByPrefix("group.", S_GROUP);
claimByPrefix("prof.mode.", S_MODE);
claimByPrefix("onb.goal.", S_ONB_GOAL);
claimByPrefix("onb.age.", S_ONB_AGE);

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
// A domain module can compose a key too (`goal.unit.${metric}` in domain/goals.ts),
// and no component literal spells its values out, so those keys are claimed here by
// the same rule check 17 applies to a component site. The composing template is
// re-read from the source that claims it, so a deleted composer stops claiming
// rather than leaving its keys reachable on paper — check 25 audits it.
const { GOAL_METRICS } = await server.ssrLoadModule("/domain/goals.ts");
const { MODES } = await server.ssrLoadModule("/domain/types.ts");
const DOMAIN_SPACES = [
  {
    name: "goal metrics",
    values: GOAL_METRICS,
    prefix: "goal.unit.",
    path: "domain/goals.ts",
    compose: /`goal\.unit\.\$\{metric\}`/,
    union: ["domain/types.ts", /export type GoalMetric = [^;]+;/],
  },
  {
    // The three modes a remembered row can name. types.ts holds both the union and the
    // runtime list it mirrors, so this is the only thing that stops the two from
    // drifting apart and a stored `mode` silently falling back to printing its code.
    name: "modes",
    values: MODES,
    prefix: "prof.mode.",
    path: "domain/rowText.ts",
    compose: /`prof\.mode\.\$\{code\}`/,
    union: ["domain/types.ts", /export type Mode = [^;]+;/],
  },
];
const claimed = new Set();
// Properly-paired key literals only. A template that interpolates (`attr.name.$
// {f.key}`) cannot match, because `$` and `{` are outside the character class and
// the group has to end at the same delimiter it started at — those sites are
// claimed through DYN_SITES instead, which is the point of check 16.
const KEY_LIKE = /(?:"([A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]+)+)"|'([A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]+)+)'|`([A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]+)+)`)/g;
for (const [, src] of appSrc) {
  for (const m of src.matchAll(STATIC)) claimed.add(m[1]);
  for (const m of src.matchAll(KEY_LIKE)) claimed.add(m[1] ?? m[2] ?? m[3]);
}
const dynKeys = new Set(DYN_SITES.flatMap((s) => (SPACES.get(`${s.prefix}|${s.expr}`)?.values ?? []).map((v) => s.prefix + v + s.suffix)));
for (const sp of DOMAIN_SPACES) for (const v of sp.values) dynKeys.add(sp.prefix + v);
const unreachable = enKeys.filter((k) => !claimed.has(k) && !dynKeys.has(k));
ok(`every dictionary key is reachable — static, quoted, or a value a dynamic site can build (${unreachable.join(", ") || "none"})`,
  unreachable.length === 0);
// Anti-vacuity: the scan has to be reading real claims, not passing because a
// regex stopped matching anything.
ok(`the reachability scan claims the dictionary rather than nothing (${claimed.size} static/quoted + ${dynKeys.size} dynamic)`,
  claimed.size + dynKeys.size >= enKeys.length && claimed.size > 500 && dynKeys.size > 50);

// 19. The domain name tables and the dictionary's English values must stay one
//     fact. Since M147 the tables only compose prose, so a rename that misses the
//     dictionary would print the old name inside a generated sentence and the new
//     name in the slot beside it — two spellings on one screen, which is worse
//     than the English-only leak this milestone removed.
const attrDrift = ATTRIBUTE_DEFS.filter((d) => en[`attr.name.${d.key}`] !== d.label);
ok(`en attr.name.* still equals the domain attribute table, all ${ATTRIBUTE_DEFS.length} of them (${attrDrift.map((d) => d.key).join(", ") || "none"})`,
  ATTRIBUTE_DEFS.length >= 32 && attrDrift.length === 0);
const groupDrift = POSITION_GROUPS.filter((g) => en[`group.${g.id}`] !== g.label);
ok(`en group.* still equals the domain position-group table, all ${POSITION_GROUPS.length} of them (${groupDrift.map((g) => g.id).join(", ") || "none"})`,
  POSITION_GROUPS.length >= 8 && groupDrift.length === 0);

// 20. One namespace per concept. `compare.cat.*` was a second copy of the same
//     four category names; a screen reading one and a radar reading the other is
//     how two translations of one noun survive. Neither half may come back.
const dupCatKeys = [0, 1, 2].flatMap((i) => keysOf(i).filter((k) => k.startsWith("compare.cat.")));
const dupCatSites = [...appSrc].filter(([, code]) => code.includes("compare.cat.")).map(([p]) => p);
ok(`compare.cat.* stays deleted from every locale and every caller (${[...new Set(dupCatKeys)].join(", ") || "no keys"} / ${dupCatSites.join(", ") || "no sites"})`,
  dupCatKeys.length === 0 && dupCatSites.length === 0);

// 21. The English name tables belong to the prose layer. A UI file that mentions
//     `attributeLabel` is composing a display string in English — the exact
//     shape no key-level check can see. Two callers are declared, and they are
//     not display: both build the prompt text sent to the coach provider, which
//     is model input and stays English in every locale. The counts are pinned in
//     both directions, so widening the surface means changing this table on purpose.
//     The match is on the identifier, not on `name(`: both surviving sites pass it
//     to `.map(...)` as a function reference, and a call-shaped regex read zero
//     uses while the two prompt builders were still there (M147's mutation test
//     found that — a gate that is green because it cannot see anything).
//     Imports are stripped first, because `import { attributeLabel }` is a
//     reference the interface never renders.
const NAME_PROMPT_SITES = new Map([
  ["features/player/PlayerOS.tsx", 1], // requestPlan(`Video analysis flagged: … build a session on …`)
  ["features/film/FilmRoom.tsx", 1], // buildTraining's prompt for the same provider
]);
const withoutImports = (code) => {
  let inImport = false;
  return code
    .split("\n")
    .filter((l) => {
      if (inImport) {
        if (/from\s+["']/.test(l)) inImport = false;
        return false;
      }
      if (/^\s*import\b/.test(l)) {
        if (!/from\s+["']/.test(l)) inImport = true;
        return false;
      }
      return true;
    })
    .join("\n");
};
const nameCalls = new Map();
for (const [path, code] of appSrc) {
  if (!/^(features|ui)\//.test(path)) continue;
  const n = [...withoutImports(code).matchAll(/\b(?:attributeLabel|groupLabel)\b/g)].length;
  if (n) nameCalls.set(path, n);
}
const undeclaredNameCalls = [...nameCalls].filter(([p, n]) => NAME_PROMPT_SITES.get(p) !== n);
const staleNameSites = [...NAME_PROMPT_SITES].filter(([p, n]) => (nameCalls.get(p) ?? 0) !== n);
const declaredCalls = [...nameCalls.values()].reduce((s, n) => s + n, 0);
ok(`the English name tables are referenced only from the ${NAME_PROMPT_SITES.size} declared coach-prompt builders and from no UI display path (${undeclaredNameCalls.join(", ") || "none"} / ${staleNameSites.map(([p]) => p).join(", ") || "none"})`,
  declaredCalls > 0 && undeclaredNameCalls.length === 0 && staleNameSites.length === 0);

// 22. An attribute's English name typed into a UI slot is invisible to every
//     key-level check: there is no key to look up, and the screen looks perfect
//     to an English reader. This is the shape the Dashboard used to have
//     (`<AttributeBar label="First Touch" …>`), three of them at once.
const escName = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const NAME_PATTERNS = ATTRIBUTE_DEFS.flatMap((d) => [
  [`label="${d.label}"`, new RegExp(`\\blabel="${escName(d.label)}"`)],
  [`>${d.label}<`, new RegExp(`>${escName(d.label)}<`)],
]);
const typedNames = [];
const labelProps = [];
for (const [path, code] of appSrc) {
  if (!/^(features|ui)\//.test(path)) continue;
  labelProps.push([path, [...code.matchAll(/\blabel=/g)].length]);
  for (const [shape, re] of NAME_PATTERNS) if (re.test(code)) typedNames.push(`${path}: ${shape}`);
}
ok(`no UI file passes an attribute's English name as a literal prop or text node (${typedNames.join(" | ") || "none"})`,
  typedNames.length === 0);
const labelPropCount = labelProps.reduce((s, [, n]) => s + n, 0);
ok(`the literal-name scan is reading a UI that does pass label props (${labelPropCount})`, labelPropCount > 20);

// 23. The row interpolations M147 converted, struck by shape. Check 21 catches a
//     name-table call; it cannot catch a row that grew its `label` field back and
//     is printed as `{f.label}` — which type-checks the moment the domain adds the
//     field, and reads fine in English. These are the exact expressions that were
//     converted, per file.
const STRUCK_ROWS = [
  ["features/compare/ComparePage.tsx", ["{e.label}"]],
  ["features/dashboard/Dashboard.tsx", ["{f.label}"]],
  ["features/development/DevelopmentPage.tsx", ["{item.label}", "{it.label}", "{analysis.groupLabel}"]],
  ["features/film/FilmRoom.tsx", ["{current.report.recommendedFocus.map(attributeLabel)"]],
  ["features/football/Details.tsx", ["{at.label}", "{s.label}", "{c.label}"]],
  ["features/history/HistoryPage.tsx", ["{g.label}"]],
  ["features/player/PlayerOS.tsx", ["{d.label}", "{g.label}", "{attributeLabel(w.key)}", "{attributeLabel(f)}"]],
  ["features/review/ReviewPage.tsx", ["{f.label}", "{g.label}", "{reco.attributeLabel}", "{review.recommendation.attributeLabel}"]],
];
const revived = STRUCK_ROWS.flatMap(([path, exprs]) => {
  const code = appSrc.get(path);
  if (code === undefined) return [`${path} (file gone: the strike list is stale)`];
  return exprs.filter((e) => code.includes(e)).map((e) => `${path}: ${e}`);
});
ok(`none of the ${STRUCK_ROWS.reduce((s, [, e]) => s + e.length, 0)} converted row reads came back (${revived.join(" | ") || "none"})`,
  revived.length === 0);

// 24. A key whose value interpolates is only complete once the caller supplies the
//     value: t() fills {a} from its second argument, and a call that forgets it prints
//     the brace text on the screen — in every locale, because the braces live in all
//     three. This scan used to read only the hand-rolled `.replace("{a}", …)` chains
//     and counted 21 "filled" calls; when M153 moved all of them onto t()'s own
//     variables, its non-vacuity floor went red at 0, which is how it came out that the
//     real interpolation path had never been checked at all. It now reads the call's
//     argument list, and it reports what it cannot read instead of passing it.
const STATIC_T = /\bt\(\s*"([A-Za-z0-9_.$-]+)"/g;
const unsubstituted = [];
let substituted = 0;
const unreadable = [];

// The top-level arguments of a call, from its open paren. String and template
// contents are opaque, so a comma inside "a, b" never splits an argument.
function callArgs(code, open) {
  let depth = 1, str = null, cur = "";
  const parts = [];
  for (let i = open + 1; i < code.length; i++) {
    const c = code[i];
    if (str) { cur += c; if (c === str && code[i - 1] !== "\\") str = null; continue; }
    if (c === '"' || c === "'" || c === "`") { str = c; cur += c; continue; }
    if ("([{`".includes(c) && c !== "`") depth++;
    if (")]}".includes(c)) { depth--; if (depth === 0) { parts.push(cur); return parts; } }
    if (c === "," && depth === 1) { parts.push(cur); cur = ""; continue; }
    cur += c;
  }
  return null;
}

for (const [path, code] of appSrc) {
  if (!/^(features|ui|store|domain|lib)\//.test(path)) continue;
  for (const m of code.matchAll(STATIC_T)) {
    const key = m[1];
    if (!(key in en)) continue;
    const phs = [...new Set((en[key].match(/\{(\w+)\}/g) ?? []).map((s) => s.slice(1, -1)))];
    if (!phs.length) continue;
    const args = callArgs(code, code.indexOf("(", m.index));
    if (!args) { unreadable.push(`${path}: ${key} call cannot be parsed`); continue; }
    if (args.length < 2) { unsubstituted.push(`${path}: ${key} {phs ${phs.join(",")}} called with no variables`); continue; }
    const body = args[1].trim().replace(/^\{/, "").replace(/\}$/, "");
    const given = varNames(body);
    if (!given) { unreadable.push(`${path}: ${key} vars object cannot be read`); continue; }
    const missed = phs.filter((x) => !given.includes(x));
    if (missed.length) unsubstituted.push(`${path}: ${key} {missed ${missed.join(",")}} not supplied`);
    else substituted++;
  }
}
ok(`every placeholder key is read by a call that supplies its variables (${substituted} filled, ${unsubstituted.length} short)`,
  unsubstituted.length === 0);
for (const u of unsubstituted.slice(0, 15)) console.log("       short: " + u);
ok(`the placeholder scan reads t()'s own variable filling, and everything it looks at is readable (${substituted} filled, ${unreadable.length} unreadable)`,
  substituted >= 20 && unreadable.length === 0);

// 28. The other half of the row contract. Checks 18/26 make sure a domain module hands
//     out a key; nothing made the screen resolve it. Handing the row object to React
//     renders "[object Object]", type-checks (ReactNode accepts objects), builds and reads
//     fine in English -- so a probe that swapped rowLine(x.label, t) for String(x.label)
//     walked through every gate green. Every read of a known keyed-row property now has to
//     sit inside a rowLine( call.
const KEYED_ROW_READS = [/\bzone\.label\b/, /\bhonour\.label\b/, /\bm\.text\b/, /\bg\.title\b/, /\brow\.title\b/];
const unresolvedRows = [];
let keyedRowReads = 0;
for (const [p, body] of appSrc) {
  if (!p.endsWith(".tsx")) continue;
  for (const re of KEYED_ROW_READS) {
    for (const hit of body.matchAll(new RegExp(re.source, "g"))) {
      keyedRowReads++;
      const before = body.slice(Math.max(0, hit.index - 24), hit.index);
      // rowLine(s.honour.label, t) -- the receiver sits between the call and the
      // property, so the test is "rowLine( opened within the last few characters".
      if (!/rowLine\([^)]{0,12}$/.test(before)) unresolvedRows.push(p + ": " + hit[0]);
    }
  }
}
ok("every read of a keyed row is resolved by rowLine (" + keyedRowReads + " reads, " + unresolvedRows.length + " bare)",
  keyedRowReads >= 4 && unresolvedRows.length === 0);
for (const u of unresolvedRows.slice(0, 8)) console.log("       bare read: " + u);

// 22. Raw UI text, measured across the whole app rather than one screen at a
//     time. scripts/lib/rawUiScan.mjs reads the three positions a reader of the
//     interface actually sees — a JSX text node, a display prop or in-line
//     expression, and a row that carries a label instead of a key. M148 localised
//     the player/club/match detail screen with it; the covered set keeps that
//     screen at zero while the ceiling measures the debt that is left, so a new
//     hard-coded label is a red check instead of a new untranslated corner.
//
//     The gate is planted with its own fixture first. Every exemption it applies —
//     a t() argument at any position, a value being compared against, a template
//     whose holes carry the copy — is a way for real leak to hide, so each one is
//     paid for by a literal the fixture proves is *not* reported, and by the
//     five literals it proves *is*. The two call literals are the position M160
//     added: copy handed to toast() through a conditional argument, which the
//     `toast("` shape M159 wrote could not see at all.
const RAW_FIXTURE = [
  `export function Demo({ x }: { x: number }) {`,
  `  const { t } = useI18n();`,
  `  const rows = [{ label: "Planted row label", k: "ms.possession" }];`,
  `  toast(x > 1 ? "Planted toast taken" : "Planted toast missed");`,
  `  toast(t("planted.toasted"));`,
  `  return (`,
  `    <Panel title="Planted title" hint={t("planted.key")}>`,
  `      <div>Planted text node</div>`,
  `      <Badge>{t(x > 1 ? "planted.a" : "planted.b")}</Badge>`,
  `      <span>{x === "LIVE" ? t("planted.c") : null}</span>`,
  "      <i>{t(`fav.${x}.active`)}</i>",
  `      <Link to="/players">{"← " + t("common.back")}</Link>`,
  `    </Panel>`,
  `  );`,
  `}`,
  ``,
].join("\n");
const planted = scanSource(RAW_FIXTURE).hits;
ok(`the raw-UI scan reports exactly the copy planted in its fixture (${planted.map((h) => h.kind).join(", ") || "nothing"})`,
  planted.length === 5 && planted.filter((h) => h.kind === "call").length === 2 &&
    planted.every((h) => h.text.startsWith("Planted")));
const plantedLookups = lookupsIn(RAW_FIXTURE);
ok(`the fixture's t() lookups are read as lookups, not as interface copy (${plantedLookups.join(", ")})`,
  plantedLookups.length === 6 && planted.every((h) => !plantedLookups.includes(h.text)));

const RAW_COVERED = [
  "features/compare/ComparePage.tsx",
  "features/football/Details.tsx",
  "features/history/HistoryPage.tsx",
  "features/learn/LearnHub.tsx",
  "features/manager/ManagerOS.tsx",
  "features/onboarding/Onboarding.tsx",
  "features/review/ReviewPage.tsx",
  "features/settings/SettingsPage.tsx",
  "features/shell/AppShell.tsx",
  "features/tactical/TacticalStudio.tsx",
  "features/transfers/TransferCentre.tsx",
  "ui/charts.tsx",
  // Not a screen: the store is where persisted rows are minted, and the one file a
  // composed sentence can hide in without any component-scoped scan ever seeing it.
  // It reached 0 raw literals at M152 and has to stay there.
  "store/useFootballOS.tsx",
];
// The ceiling is the debt that is not in the covered set. Lower it when a screen
// is localised; it may only ever go down on purpose.
//
// Measured over every .tsx in the repo — which is wider than the features/ui/
// components tree (store/useFootballOS.tsx carries 4, src/App.tsx 3). 596 as of
// M149, when the activity timeline's rows went onto keys and HistoryPage's own
// `label` fields became `labelKey`, which is what the scan reads as a key. 594 as
// of M150, when onboarding's two goal titles stopped being sentences stored in a row.
// 584 as of M151, when the Player OS goal panel — the one place you manage goals —
// stopped being English-only.
// 579 as of M152: the three sentences the coach used to write into memory, and the
// memory panel's own labels, are keys now.
// 536 as of M155: the Dashboard's 44 hits were
// 22 dictionary keys sitting in a field named `label` (the launcher) plus 21 sentences of
// English copy; only the provider's "LIVE" status code is left, which is a query argument.
// 514 as of M156: onboarding's screen copy is keyed and its two option lists now
// store codes rather than sentences. 451 as of M157: Manager OS's header, overview,
// season summary, squad, transfer market and tactics panels are keyed (133 hits -> 70),
// which also meant giving the file a useI18n import it never had.
// 440 as of M158 step 1: Manager OS's tab strip and the market's position buckets are
// keys now, and the strip's map variable stops shadowing the translator.
// 410 as of M158 step 2: the career-empty state, the market row, the league-table header
// and the whole season-outlook panel are keyed, and the four panels that received them
// (Table, Outlook, MatchPrepPanel, ClubPicker) each take the translator hook.
// 381 as of M158 step 3: Manager OS is finished and covered, so its 133 hits left the
// open count entirely. The non-vacuity floor below tracks the measurement downward -- it
// exists to notice a scan that stopped reading, not to hold a number steady.
// 394 as of M159 — the number did not grow, the measurement did. The scan now also
// reads two positions it never looked at: `aria-label` attributes and copy handed to
// toast()/alert(). 13 of those items were then keyed; the 5 left (two Community Hub
// toasts, three Learn Hub toasts) stay counted as real debt for those screens.
// 354 as of M160: Learn Hub — the last screen whose file had no translator import at
// all — is keyed and covered, so its 40 hits left the open count entirely. The call
// rule also grew from `toast("` to the whole argument list, which found no new debt
// (the only conditional toast in the repo was Learn Hub's own, and it is keyed), so
// 354 is a measurement of the same tree with two more eyes on it.
const RAW_UI_CEILING = 354;
const tsxSrc = [...appSrc].filter(([p]) => p.endsWith(".tsx"));
const missing = RAW_COVERED.filter((p) => !appSrc.has(p));
const leaks = RAW_COVERED
  .filter((p) => appSrc.has(p))
  .map((p) => [p, scanSource(appSrc.get(p)).hits])
  .filter(([, h]) => h.length > 0)
  .map(([p, h]) => `${p} (${h.length}: ${h[0].text.slice(0, 30)})`);
ok(`the ${RAW_COVERED.length} localised files still render no raw UI text (${[...missing.map((p) => p + " (gone)"), ...leaks].join(", ") || "none"})`,
  RAW_COVERED.length >= 8 && missing.length === 0 && leaks.length === 0);
const openRows = tsxSrc
  .filter(([p]) => !RAW_COVERED.includes(p))
  .map(([p, src]) => [scanSource(src).hits.length, p])
  .filter(([n]) => n > 0);
const openTotal = openRows.reduce((s, [n]) => s + n, 0);
ok(`the raw-UI debt outside the covered set has not grown (${openTotal} across ${openRows.length} files, ceiling ${RAW_UI_CEILING})`,
  openTotal <= RAW_UI_CEILING);
for (const [n, p] of openRows.sort((a, b) => b[0] - a[0]).slice(0, 6)) console.log(`       debt: ${String(n).padStart(4)} ${p}`);
ok(`the debt scan is reading files that do carry raw text (${openRows.length} files)`,
  tsxSrc.length >= 60 && openRows.length >= 20 && openTotal >= 300);

// The exemption's own audit: a literal the scan chose not to report because it
// looks like a t() lookup has to be one. This is the check that would have caught
// the four keys M148 deleted out from under their callers.
const allLookups = tsxSrc.flatMap(([p, src]) => lookupsIn(src).map((k) => [p, k]));
const enSet = new Set(enKeys);
const badLookups = allLookups.filter(([, k]) => !enSet.has(k));
ok(`every literal the raw-UI exemption treats as a t() lookup is a real key (${allLookups.length} lookups, ${[...new Set(badLookups.map(([p, k]) => `${p}: ${k}`))].slice(0, 8).join(", ") || "no unknown"})`,
  badLookups.length === 0);
ok(`the exemption audit is reading real lookups rather than nothing (${allLookups.length})`, allLookups.length >= 500);

// 25. A key a domain module composes is as exposed to the reader as one a component
//     spells out. domain/goals.ts turns a stored metric code into `goal.unit.<code>`
//     and the profile prints whatever comes back, so: the composing template has to
//     still be in the file that claims it, the value space has to still be the
//     TypeScript union rows are typed against, and every value has to be keyed in
//     every locale — or a Chinese profile reads "goal.unit.xp".
const unionOf = (name) => spaceOf("domain/types.ts", new RegExp(`export type ${name} =[^;]+;`), quoted);
ok(`onb.goal.… · the code table in domain/onboarding.ts is the OnboardingGoalCode union (${ONB_GOAL_CODES.join(", ")} / ${unionOf("OnboardingGoalCode").join(", ")})`,
  ONB_GOAL_CODES.length > 0 && unionOf("OnboardingGoalCode").length === ONB_GOAL_CODES.length &&
    ONB_GOAL_CODES.every((c) => unionOf("OnboardingGoalCode").includes(c)));
ok(`onb.age.… · the word list in domain/onboarding.ts is the AgeGroupWord union (${ONB_AGE_WORDS.join(", ")} / ${unionOf("AgeGroupWord").join(", ")})`,
  ONB_AGE_WORDS.length > 0 && unionOf("AgeGroupWord").length === ONB_AGE_WORDS.length &&
    ONB_AGE_WORDS.every((c) => unionOf("AgeGroupWord").includes(c)));

for (const sp of DOMAIN_SPACES) {
  const src = appSrc.get(sp.path);
  ok(`${sp.path} still composes its ${sp.prefix}… keys`, src !== undefined && sp.compose.test(src));
  const [unionPath, unionRe] = sp.union;
  const members = (((appSrc.get(unionPath) ?? "").match(unionRe) ?? [""])[0].match(/"([^"]+)"/g) ?? []).map((s) => s.slice(1, -1));
  ok(`${sp.prefix}… · ${sp.name}: the domain table and the ${unionPath} union are one list (${members.join(", ")} / ${sp.values.join(", ")})`,
    members.length > 0 && members.length === sp.values.length && members.every((m) => sp.values.includes(m)));
  const missing = sp.values.map((v) => sp.prefix + v).filter((k) => !bounds.every((_, i) => keysOf(i).includes(k)));
  ok(`${sp.prefix}… · ${sp.name}: all ${sp.values.length} values keyed in every locale (${missing.join(", ") || "none"})`,
    sp.values.length > 0 && missing.length === 0);
}

// 26. A row a domain module hands the interface carries a key or a recorded value —
//     never a sentence the module wrote itself. This class is invisible to check 22
//     (the raw-UI scan reads JSX, and a domain module is not JSX), and `t()`'s
//     raw-key fallback means a mistyped key prints *itself* on screen while still
//     type-checking, building and reading fine in English. So for every module that
//     declares the row union: each key literal must be a real dictionary key, must
//     be supplied with exactly the placeholders its English value interpolates
//     (no more, no fewer), and no row value may be a literal typed in that module.
const ROW_FILES = [...appSrc].filter(([, src]) => /\bRowText\b/.test(src));
// No closing-brace requirement: a row written across several lines ends `…},\n  },`,
// and demanding the literal close here matched 8 of the 9 rows and silently skipped
// the multi-line one — which is the row whose five variables most needed auditing.
// M149's mutation run found that by deleting a variable nothing complained about.
const ROW_LITERAL = /\{\s*key:\s*"([^"]+)"(?:\s*,\s*vars:\s*\{([^{}]*)\})?/g;
// Top-level property names of a `vars: { … }` body. Returns null rather than a partial
// answer when a segment is not recognisably `name` or `name:` — an audit that guesses
// is worse than one that stops, because a guessed list still prints "clean".
function varNames(body) {
  if (!body.trim()) return [];
  const segs = [];
  let cur = "", depth = 0, str = null;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (str) { cur += c; if (c === str && body[i - 1] !== "\\") str = null; continue; }
    if (c === '"' || c === "'" || c === "`") { str = c; cur += c; continue; }
    if ("([{".includes(c)) depth++;
    if (")]}".includes(c)) depth--;
    if (c === "," && depth === 0) { segs.push(cur); cur = ""; continue; }
    cur += c;
  }
  if (cur.trim()) segs.push(cur);
  const names = [];
  for (const seg of segs) {
    const m = seg.trim().match(/^([A-Za-z_$][\w$]*)\s*(?::|$)/);
    if (!m) return null;
    names.push(m[1]);
  }
  return names;
}
const badRows = [];
let rowKeys = 0;
for (const [path, src] of ROW_FILES) {
  for (const m of src.matchAll(ROW_LITERAL)) {
    rowKeys++;
    const key = m[1];
    if (!(key in en)) { badRows.push(`${path}: ${key} is not a dictionary key`); continue; }
    const phs = [...new Set((en[key].match(/\{(\w+)\}/g) ?? []).map((s) => s.slice(1, -1)))].sort();
    // The names the row supplies, read segment by segment so `vars: { mode, goal }`
    // (a shorthand property) counts exactly like `vars: { mode: m, goal: g }`. A naive
    // comma split would cut `focus.join(",")` in half and a plain regex that consumes
    // its own separator silently skipped every other property, so this walks the body,
    // tracks strings and nesting, and REFUSES to guess when a segment is not a property.
    const given0 = varNames(m[2] ?? "");
    if (!given0) { badRows.push(`${path}: ${key} has a vars body this audit cannot read (${m[2]})`); continue; }
    const given = [...new Set(given0)].sort();
    if (phs.join(",") !== given.join(",")) badRows.push(`${path}: ${key} interpolates {${phs.join(",")}} · the row supplies {${given.join(",")}}`);
  }
  for (const m of src.matchAll(/\{\s*value:\s*["'`]/g)) badRows.push(`${path}: a row value is prose typed in this module (${m[0]})`);
}
ok(`every row text a domain module hands the screen is a real key with exactly its placeholders (${rowKeys} keys, ${badRows.slice(0, 6).join(" | ") || "clean"})`,
  badRows.length === 0);
ok(`the row-text scan is reading modules that actually carry the union (${ROW_FILES.length} files, ${rowKeys} keys)`,
  // 5 files / 15 keys as of M152: history.ts's 9 timeline rows, goals.ts's 3 title
  // rows, rowText.ts and types.ts as the two modules that name the union. A row built
  // as a bare string in a table escapes this pattern — that is how 2 of the 12 first
  // went unnoticed — so the floor is the measured count, never a round number.
  ROW_FILES.length >= 5 && rowKeys >= 15);

// 27. A second interpolator. t(key, vars) fills every occurrence of a placeholder;
//     `String.prototype.replace` with a string needle fills only the FIRST, so a key
//     that repeats a token renders half-filled — and every new key would have to know
//     which path reads it. 21 hand-rolled call sites were collapsed onto t()'s own
//     variables at M153; this is what stops them coming back one at a time.
//     data/ is exempt: it fills a seeded news headline template, not a dictionary string.
const HANDROLLED = /\.replace\(\s*["'`]\{/g;
const handRolled = [...appSrc]
  .filter(([p, src]) => !p.startsWith("data/") && src.match(HANDROLLED))
  .map(([p, src]) => `${p} (${src.match(HANDROLLED).length})`);
ok(`t()'s variable filling is the only interpolator in the UI source (${handRolled.join(", ") || "none"})`,
  handRolled.length === 0);

console.log(`\n${enKeys.length} keys · ${L.length} locales`);
console.log(`${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
