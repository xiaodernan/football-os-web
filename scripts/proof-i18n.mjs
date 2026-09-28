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
//      which prints `{a}` on the screen in every locale — and, from M167, the other
//      direction too: a placeholder the caller fills that no locale interpolates,
//      which is a number the visitor never sees,
//  24b. both directions again at a *template* call site, where the key is not a literal
//       so the check above never reaches it,
//  25. a key a *domain* module composes (`goal.unit.${metric}`) being incomplete,
//      drifting from the type union it reads, or left behind by a deleted composer
//      — the same three ways check 17 catches a component site, which cannot see it,
//  26. a row handed from a domain module to the interface carrying a key that is
//      not in the dictionary, a placeholder the row never supplies, or a sentence
//      the module wrote itself — which no JSX-scanning check can see (M149).
//  27. a file in the chrome layer (components/ui/*) falling back to its own English
//      word — check 9 one layer down, so it reaches every screen at once,
//  28. a `*Key` field (the one naming convention that makes the raw-UI scan look away
//      from a string) holding something that is not a dictionary row in every locale,
//  29. the same field never being read back through t(): a component must resolve what
//      it declares, and a module that hands rows to a screen must name that screen in
//      KEY_ROW_CONSUMERS. The rename with the translation left out would otherwise keep
//      a raw-UI count down forever, and "somebody reads .labelKey somewhere" is not a
//      check while seven files share the name,
//  30. a word the app shows in two places being keyed twice — which is how one screen
//      gets translated and the other keeps the old English (M172's "Demo mode", M175's
//      chart origin), with the bare literal and the second reader both refused.
//  33. a date formatted for the BROWSER instead of for the READER — the one defect in this
//      layer that involves no key at all, so checks 1-32 cannot see it in any direction.
//      See the long note at its own definition below (M194).
// Run: node scripts/proof-i18n.mjs
import { readdirSync, readFileSync } from "node:fs";
import { scanSource, lookupsIn, sourceBalance } from "./lib/rawUiScan.mjs";
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
// `dev` joins the build/VCS skips because the census below is a *debt ceiling over the file
// set*, and an untracked scratch copy of a real screen is not the screen: leaving it in made
// the gate report 60 hits across 3 files when the app carried 46 across 2. That is a safe
// exclusion only while nothing shipped imports out of the skipped directory, and the clause
// after the raw-UI census measures that rather than assuming it.
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
//    M179 added 后: all 1313 zh-TW values were screened against a much wider simplified
//    table and it was the single survivor — in "…請求一份計畫，然后再回來", where the
//    writer means 後 ("then") and 后 is an empress. That is a pre-existing row, not one
//    this milestone wrote, which is the point of screening the whole block.
const SIMPLIFIED_SEEN = "赛进档属训练标视频术体战经验龄评画并后";
const twValues = valuesOf(2);
const strays = [...new Set(twValues.flatMap((v) => [...v]).filter((c) => SIMPLIFIED_SEEN.includes(c)))];
ok(`no zh-TW value reintroduces one of the ${SIMPLIFIED_SEEN.length} 简体 characters the audits corrected (${strays.join("") || "none"})`,
  strays.length === 0);

// 8. A label held in a variable is invisible to check 4 — `t(tab.label)` contains
//    no literal key to match. The player tab strip is the case that matters: the
//    tab labels M143 rewrote into 繁體 only reach the screen if the strip reads
//    them from the dictionary, so pin both halves of that contract.
const tabSrc = readFileSync(join(root, "features", "player", "PlayerOS.tsx"), "utf8");
const tabBlock = tabSrc.match(/const TABS = \[[\s\S]*?\];/)?.[0] ?? "";
// The field holding these keys is `labelKey` since M175. Check 8 used to spell `label`
// twice — once to read the values, once to find the t() call — so the rename went red on
// both, which is the check working. It was also one rename away from going *quiet*: a
// future milestone that renamed the field and updated only the value regex would keep
// asserting a render site that no longer exists. So the field name is read out of the
// array once and used for both halves; the rename stays legal, the contract does not.
const TAB_FIELD = tabBlock.match(/\b(\w*[lL]abel\w*)\s*:\s*"/)?.[1] ?? "";
ok(`the player TABS array is locatable and names its label field (${TAB_FIELD || "none"})`,
  tabBlock.length > 0 && /^\w+$/.test(TAB_FIELD));
const tabLabels = [...tabBlock.matchAll(new RegExp(`\\b${TAB_FIELD}\\s*:\\s*"([^"]+)"`, "g"))].map((m) => m[1]);
ok(`all ten tabs carry a label (${tabLabels.length})`, tabLabels.length === 10);
// Raw English would still render perfectly for an English visitor, which is why
// the parity and the t() call are checked instead of the glyphs.
const rawLabels = tabLabels.filter((l) => !bounds.every((_, i) => keysOf(i).includes(l)));
ok(`every tab label is a key all three dictionaries declare (${rawLabels.join(", ") || "none"})`,
  rawLabels.length === 0);
const tTab = new RegExp(`\\{t\\(\\s*tab\\.${TAB_FIELD}\\s*\\)\\}`).test(tabSrc);
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

// 9b. M173. The same defect one layer down: `components/ui/*` is the generic chrome
//     every screen is built out of, and its 21 literals were all accessibility copy —
//     landmark names, icon-button labels, sr-only "Close" — which a screen reader reads
//     out in the visitor's language only if the file asks the dictionary. The table is
//     the wiring half of the proof, and it pins *positions*, not just names: the third
//     number on each row is how many of the file's counted literals that key replaced,
//     so the totals come back to 21 and pointing one call site at a neighbouring key
//     stays red. (The first version of this check asked only whether a key appeared
//     *somewhere* in the file; probe 3 turned up that swapping one of sidebar's three
//     "Toggle Sidebar" sites for `ui.sidebar` passed it, because the other two were
//     still there. `cta.loading` in the table is deliberate — "Loading" was already in
//     the dictionary, so the spinner reads that row instead of minting a second key for
//     the same word, and the last clause below keeps that decision from being reversed.)
const CHROME_WIRING = [
  ["components/ui/pagination.tsx", "ui.pagination", 1],
  ["components/ui/pagination.tsx", "ui.prevPage", 1],
  ["components/ui/pagination.tsx", "ui.previous", 1],
  ["components/ui/pagination.tsx", "ui.nextPage", 1],
  ["components/ui/pagination.tsx", "ui.next", 1],
  ["components/ui/pagination.tsx", "ui.morePages", 1],
  ["components/ui/sidebar.tsx", "ui.sidebar", 1],
  ["components/ui/sidebar.tsx", "ui.sidebarMobile", 1],
  ["components/ui/sidebar.tsx", "ui.toggleSidebar", 3],
  ["components/ui/breadcrumb.tsx", "ui.breadcrumb", 1],
  ["components/ui/breadcrumb.tsx", "ui.more", 1],
  ["components/ui/carousel.tsx", "ui.prevSlide", 1],
  ["components/ui/carousel.tsx", "ui.nextSlide", 1],
  ["components/ui/dialog.tsx", "ui.close", 2],
  ["components/ui/sheet.tsx", "ui.close", 1],
  ["components/ui/message-scroller.tsx", "ui.scrollToEnd", 1],
  ["components/ui/message-scroller.tsx", "ui.scrollToStart", 1],
  ["components/ui/spinner.tsx", "cta.loading", 1],
];
const chromeFiles = [...new Set(CHROME_WIRING.map(([p]) => p))];
const chromeSrc = new Map(chromeFiles.map((p) => [p, readFileSync(join(root, ...p.split("/")), "utf8")]));
const chromeBad = CHROME_WIRING.filter(([p, k, n]) => chromeSrc.get(p).split(`t("${k}")`).length - 1 !== n)
  .map(([p, k, n]) => `${p}:${k} wants ${n} call site(s), found ${chromeSrc.get(p).split(`t("${k}")`).length - 1}`);
ok(`the ${chromeFiles.length} chrome files read their own labels from the dictionary at all ${CHROME_WIRING.reduce((s, [, , n]) => s + n, 0)} positions (${chromeBad.join(" | ") || "none"})`,
  chromeBad.length === 0);
const CHROME_ENGLISH = ['aria-label="pagination"', 'aria-label="breadcrumb"', 'aria-label="Loading"',
  'aria-label="Toggle Sidebar"', 'title="Toggle Sidebar"', '"Go to previous page"', '"Go to next page"',
  ">Previous<", ">Next<", "More pages", "Scroll to end", "Scroll to start", "Previous slide", "Next slide",
  "Displays the mobile sidebar.", ">Close<", ">Sidebar<"];
const chromeBackslid = CHROME_ENGLISH.filter((s) => [...chromeSrc.values()].some((src) => src.includes(s)));
ok(`no chrome file still hardcodes the English M173 replaced (${chromeBackslid.join(" | ") || "none"})`, chromeBackslid.length === 0);
const uiKeys = Object.keys(en).filter((k) => k.startsWith("ui."));
ok(`the chrome namespace holds exactly its 16 labels, and mints no second key for the word cta.loading already carries (${uiKeys.length})`,
  uiKeys.length === 16 && !uiKeys.some((k) => en[k] === en["cta.loading"]));

// 10. M145 localised the Scouting board. Two of its label arrays keep the key in
//     a variable, the same shape check 8 had to reach, so both arrays and both
//     render sites are pinned. M165 renamed the field `label` → `labelKey`: a row
//     property called `label` is one of the positions the raw-UI scan reads as a
//     display string, so a *key* sitting in one is counted as copy exactly like a
//     sentence, and ten of this board's fifteen debt items were keys the render
//     site already resolved through t(). The rename is what let the file reach 0.
const scoutSrc = readFileSync(join(root, "features", "scouting", "ScoutingPanel.tsx"), "utf8");
const SCOUT_ARRAYS = [
  ["SORTS", /const SORTS[\s\S]*?\];/],
  ["comparison rows", /const rows[\s\S]*?\];/],
];
for (const [name, re] of SCOUT_ARRAYS) {
  const block = scoutSrc.match(re)?.[0] ?? "";
  ok(`the Scouting ${name} array is locatable (else this check is vacuous)`, block.length > 0);
  const ls = [...block.matchAll(/labelKey:\s*"([^"]+)"/g)].map((m) => m[1]);
  ok(`Scouting ${name} carries ${ls.length} label keys`, ls.length > 0);
  const raw = ls.filter((l) => !bounds.every((_, i) => keysOf(i).includes(l)));
  ok(`every Scouting ${name} label key is one all three dictionaries declare (${raw.join(", ") || "none"})`, raw.length === 0);
  // The old field name, struck rather than merely absent from the new regex: a
  // third array added here as `{ label: "some.key" }` would satisfy the reads above
  // and put the file back in debt through the scan.
  const oldField = [...block.matchAll(/\blabel:\s*"/g)].length;
  ok(`Scouting ${name} holds no key in a field named \`label\` (${oldField})`, oldField === 0);
}
ok("both Scouting label arrays render through t()",
  /\{t\(s\.labelKey\)\}/.test(scoutSrc) && /\{t\(r\.labelKey\)\}/.test(scoutSrc));

// 10b. M166 localised the command palette — the one overlay reachable from every
//      screen. Its rows carry a `group` code that the render site interpolates into
//      `cmd.group.…`, and a row whose group string had drifted out of GROUPS would
//      print the key itself to the visitor while three separate gates stayed green:
//      the scan does not read a `group:` field as a display slot, check 17 derives its
//      value space from GROUPS rather than from the rows, and check 16 only walks
//      template sites, of which there is exactly one. So the rows are read here.
const cmdSrc = readFileSync(join(root, "features", "command", "CommandPalette.tsx"), "utf8");
const CMD_CODES = [...(cmdSrc.match(/const GROUPS = \[([^\]]*)\]/)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]);
ok(`the palette's group list is locatable and holds codes (${CMD_CODES.join(", ") || "none"})`, CMD_CODES.length > 0);
// A code, not a sentence: that is what makes `cmd.group.${group}` a lookup at all.
ok(`the palette's group codes are codes (${CMD_CODES.join(", ")})`,
  CMD_CODES.every((g) => /^[a-z]+$/.test(g)));
const rowGroups = [...cmdSrc.matchAll(/\bgroup:\s*"([^"]+)"/g)].map((m) => m[1]);
ok(`every palette row names one of its declared groups (${[...new Set(rowGroups)].sort().join(", ")})`,
  rowGroups.length >= 28 && rowGroups.every((g) => CMD_CODES.includes(g)));
const cmdKeys = [...cmdSrc.matchAll(/\bt\("((?:cmd|nav|set\.theme)\.[a-z.]+)"/g)].map((m) => m[1]);
const cmdRaw = cmdKeys.filter((k) => !bounds.every((_, i) => keysOf(i).includes(k)));
ok(`the palette's ${cmdKeys.length} spelled-out keys exist in all three locales (${cmdRaw.join(", ") || "none"})`,
  cmdKeys.length >= 12 && cmdRaw.length === 0);

// 11. A `title="English"` prop is invisible to check 4 (there is no key to look
//     up) and to check 10 (it is not in an array), so it is matched by shape.
const engProps = [...scoutSrc.matchAll(/\b(?:title|hint|label|placeholder|description|aria-label)="[^"]*[A-Za-z]{2}[^"]*"/g)].map((m) => m[0]);
ok(`no Scouting string prop still carries raw English (${engProps.join(" | ") || "none"})`, engProps.length === 0);

// 12. Same for JSX text nodes, in both shapes they take: text that runs into a
//     tag, and text that runs into an interpolation ("Foo: {x}").
//
//     This is the SHORT-text gate, and it is not subsumed by the covered-file
//     check further down: hasProse() needs three letters, so a two-letter node is
//     invisible to the scanner however many raw strings the file holds. M165
//     turned the three stat codes this check used to excuse — OVR, POT and OVR/€M
//     — into keys, because the dictionary already has a word for each of them on
//     this very screen (compare.m.overall is 综合/綜合 and scout.noMatchHint says
//     综合分), and a code the dictionary names is copy, not a code. What is left is
//     "vs": a separator between two names that reads the same in all three locales.
//     It is listed as a decision, not as a gated fact — nothing would catch it
//     turning into prose, which is why the scan below walks every node it can find.
const CODE_TEXT = ["vs"];
// `(?<!=)` skips arrow functions: `() => scoutCandidates({` would otherwise read
// as a text node running into an interpolation.
const nodeTexts = [
  ...[...scoutSrc.matchAll(/(?<!=)>[^<>{}\n]+(?=<)/g)].map((m) => m[0].slice(1)),
  ...[...scoutSrc.matchAll(/(?<!=)>[^<>{}\n]+(?=\{)/g)].map((m) => m[0].slice(1)),
].map((x) => x.trim());
// Two letters or more, and not a fragment of code — `r.bv : r.av`, `0 ? ` — that
// a brace-free regex cannot tell apart from markup.
const wordTexts = nodeTexts.filter((x) => /[A-Za-z]{2}/.test(x) && !/[):;=}&|]/.test(x));
const strayTexts = wordTexts.filter((x) => !CODE_TEXT.includes(x));
ok(`the Scouting board renders no untranslated short text node (${strayTexts.join(" | ") || "none"})`,
  strayTexts.length === 0);
// Vacuity is pinned on the *pre-filter* count. After M165 only one node survives
// the filters, so a floor on the survivors would go vacuous the moment "vs" is
// keyed too; the nodes these regexes find is what proves they still read the file.
ok(`the text-node scan still walks the board's markup (${nodeTexts.length} nodes, ${wordTexts.length} words)`,
  nodeTexts.length >= 10 && wordTexts.length >= CODE_TEXT.length);

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
  // M176: Player OS's growth tab now walks the /achievements catalogue for its "badges to
  // earn next" panel, so the same interpolation exists on that screen as well. It used to
  // be six hand-written strings, one of which named a badge the catalogue does not have.
  { path: "features/player/PlayerOS.tsx", expr: "a.id", prefix: "ach.name.", suffix: "" },
  { path: "features/dashboard/Dashboard.tsx", expr: "growth.next.id", prefix: "ach.name.", suffix: "" },
  { path: "features/achievements/AchievementsPage.tsx", expr: "a.id", prefix: "ach.desc.", suffix: "" },
  { path: "features/dashboard/Dashboard.tsx", expr: "growth.next.id", prefix: "ach.desc.", suffix: "" },
  { path: "features/achievements/AchievementsPage.tsx", expr: "a.tier", prefix: "ach.tier.", suffix: "" },
  // M182: the Football DNA's words left domain/playerDna.ts for the dictionary, so every
  // display site interpolates an archetype id. They are declared here individually (twice
  // where a file has two) because check 16 compares the declared count to the live one —
  // and the value list is read out of the table, not written down again here.
  { path: "domain/rowText.ts", expr: "code", prefix: "dna.arch.", suffix: "" },
  { path: "features/compare/ComparePage.tsx", expr: "result.a.archetype", prefix: "dna.arch.", suffix: "" },
  { path: "features/compare/ComparePage.tsx", expr: "result.b.archetype", prefix: "dna.arch.", suffix: "" },
  { path: "features/compare/ComparePage.tsx", expr: "selected.archetype", prefix: "dna.arch.", suffix: "" },
  { path: "features/football/Details.tsx", expr: "p.archetype", prefix: "dna.arch.", suffix: "" },
  { path: "features/football/Details.tsx", expr: "p.archetype", prefix: "dna.arch.", suffix: "" },
  { path: "features/scouting/ScoutingPanel.tsx", expr: "p.archetype", prefix: "dna.arch.", suffix: "" },
  { path: "ui/primitives.tsx", expr: "dna.primary.id", prefix: "dna.arch.", suffix: "" },
  { path: "ui/primitives.tsx", expr: "dna.secondary.id", prefix: "dna.arch.", suffix: "" },
  { path: "ui/primitives.tsx", expr: "dna.primary.id", prefix: "dna.blurb.", suffix: "" },
  // M180: the graph's legend is derived from TYPE_COLOR, the one table that names every
  // kind the canvas can draw, so a sixth kind cannot appear without a word for it. The
  // value space below reads that table rather than restating it.
  { path: "features/ai/AiStudio.tsx", expr: "kind", prefix: "ai.legend.", suffix: "" },
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
  // M193: the analysis progress line used to print the English stage name out of the
  // STAGES array. The array now holds codes, so the word comes from `film.stage.*` and
  // check 17 holds the dictionary against the array itself.
  { path: "features/film/FilmRoom.tsx", expr: "stageKey", prefix: "film.stage.", suffix: "" },
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
  // M183: the retrieval kinds a source chip names resolve through the legend's own space,
  // which is why one list (`SEARCH_KINDS`) has to serve both.
  { path: "domain/rowText.ts", expr: "code", prefix: "ai.legend.", suffix: "" },
  // M184: an answer that names a career trajectory resolves it through the player page's
  // own `det.arc.*` rows, so the AI cannot invent a fourth word for the shape of an arc.
  // M186: a scout headline names attribute categories through the charts' own rows.
  { path: "domain/rowText.ts", expr: "code", prefix: "attr.", suffix: "" },
  { path: "domain/rowText.ts", expr: "code", prefix: "det.arc.", suffix: "" },
  { path: "domain/rowText.ts", expr: "code", prefix: "onb.goal.", suffix: "" },
  { path: "domain/rowText.ts", expr: "code", prefix: "onb.age.", suffix: "" },
  { path: "features/review/ReviewPage.tsx", expr: "review.recommendation.attributeKey", prefix: "attr.name.", suffix: "" },
  { path: "features/compare/ComparePage.tsx", expr: "m.key", prefix: "compare.m.", suffix: "" },
  { path: "features/football/FootballWorld.tsx", expr: "tab.toLowerCase()", prefix: "fw.status.", suffix: "" },
  { path: "features/football/FootballWorld.tsx", expr: "tab.toLowerCase()", prefix: "fw.status.", suffix: "" },
  // M169: the filter buttons themselves. Until this line they printed the raw code, so a
  // 简体中文 visitor saw LIVE / SCHEDULED / FINISHED as the only English on the screen —
  // and the gate could not see it, because the words came from an array inlined in a
  // render hole, which reads as children copy rather than as a label slot.
  { path: "features/football/FootballWorld.tsx", expr: "s.toLowerCase()", prefix: "fw.status.", suffix: "" },
  { path: "features/football/FootballWorld.tsx", expr: "type", prefix: "fw.type.", suffix: "" },
  { path: "features/landing/Landing.tsx", expr: "k", prefix: "landing.pillars.", suffix: "" },
  { path: "features/landing/Landing.tsx", expr: "k", prefix: "landing.pillarDesc.", suffix: "" },
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
  // M191: the onboarding position picker resolves its captions through the dictionary
  // instead of printing the domain table's English `label`.
  { path: "features/onboarding/Onboarding.tsx", expr: "p.id", prefix: "group.", suffix: "" },
  // M192: a session's exercises print the drill's own key, not the catalogue's English
  // label — the key is what a stored session carries, so an old session reads correctly.
  { path: "features/player/PlayerOS.tsx", expr: "e.key", prefix: "drill.", suffix: "" },
  { path: "features/player/PlayerOS.tsx", expr: "e.key", prefix: "drill.", suffix: "" },
  // M166: the palette's section headings come out of its own group list, and its mode
  // switch rows reuse the Mode union. Both were invisible to the gate before this
  // milestone for different reasons — the heading reached the screen through a prop the
  // scan did not read, the mode name through a key nobody had declared.
  { path: "features/command/CommandPalette.tsx", expr: "group", prefix: "cmd.group.", suffix: "" },
  { path: "features/command/CommandPalette.tsx", expr: "m", prefix: "prof.mode.", suffix: "" },
];
// One space per (prefix, expression) pair: the two `prof.mode.` sites take the
// same prefix from different code, which is why the space is not keyed on the
// prefix alone. Several sites can share one space object, and check 16 requires
// every site's pair to appear here.
const S_ACH = { name: "achievement ids", values: ACH_IDS };
// M164: the landing page's pillar strip is one id list driving two key sites, so both
// sites share one value space read out of the array itself.
const S_PILLAR = {
  name: "landing pillar ids",
  values: spaceOf("features/landing/Landing.tsx", /const PILLARS = \[[^\]]*\]/, /"([^"]+)"/g),
};
const S_CAT = { name: "attribute categories", values: CATEGORY_ORDER };
const S_ATTR = { name: "attribute keys", values: ATTRIBUTE_DEFS.map((d) => d.key) };
const S_GROUP = { name: "position groups", values: POSITION_GROUPS.map((g) => g.id) };
const S_MODE = { name: "Mode union", values: MODES_UPPER };
const ONB_GOAL_CODES = spaceOf("domain/onboarding.ts", /export const GOAL_CODES[^;]+;/, quoted);
const ONB_AGE_WORDS = spaceOf("domain/onboarding.ts", /export const TRANSLATED_AGE_GROUPS[^;]+;/, quoted);
const S_ONB_GOAL = { name: "onboarding goal codes", values: ONB_GOAL_CODES };
const S_ONB_AGE = { name: "translated age bands", values: ONB_AGE_WORDS };
// M166: the palette groups its own rows, so the codes it can hand to `cmd.group.` are
// exactly the members of its group list. A fourth group without a key fails here.
const S_CMD_GROUP = {
  name: "command palette group codes",
  values: spaceOf("features/command/CommandPalette.tsx", /const GROUPS = \[[^\]]*\] as const/, quoted),
};
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
  ["fw.status.|s.toLowerCase()", {
    // The filter tab loop: the same three codes, reached from the hoisted list rather
    // than from the route query, so it is a separate site and gets its own declaration.
    name: "match status filter buttons",
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
  ["landing.pillars.|k", S_PILLAR],
  ["landing.pillarDesc.|k", S_PILLAR],
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
    // M174 moved the four codes from an inline `[… ] as Sort[]` in a JSX hole to the
    // module-scope SORTS the board now maps over — which is precisely the anchor
    // relocation check 16 is built to notice: it went red on the hoist, and the value
    // space is still read out of the source rather than written down here.
    values: spaceOf("features/watchlist/WatchlistBoard.tsx", /const SORTS: Sort\[\] = \[[\s\S]*?\]/, quoted),
  }],
  ["comm.tag.|tag", {
    // The tag words the board filters and stores, straight from the only place
    // that defines them — so a new tag fails here until it has a key.
    name: "community tags",
    values: spaceOf("domain/community.ts", /export function allTags\(\): string\[\] \{[\s\S]*?\n\}/, quoted),
  }],
  ["ai.legend.|kind", {
    // The five entity kinds the knowledge graph can put on the canvas, read out of the
    // colour table the legend now maps over. A kind with no key would print
    // `ai.legend.match` inside a legend chip, and a key nobody can reach is deleted by
    // check 18 — so the two directions are both covered by this one anchor.
    name: "knowledge-graph entity kinds",
    values: spaceOf("features/ai/AiStudio.tsx", /const TYPE_COLOR[^=]*=[\s\S]*?\};/, /([a-z]+)\s*:\s*"var\(/g),
  }],
  // M186: a scout headline names two attribute categories by code (`cat` / `cat2`), so it
  // joins the other category lookups on the same space rather than restating the list.
  ["attr.|code", S_CAT],
  ["ai.legend.|code", {
    // M183: a source chip resolves its kind through the SAME space the legend uses, and the
    // two lists come from two different files — the retrieval kinds the AI can produce
    // (`SEARCH_KINDS`) and the entity kinds the canvas can colour (`TYPE_COLOR`). Both are
    // read out of their own source and compared below.
    name: "retrieval entity kinds",
    values: spaceOf("domain/types.ts", /export const SEARCH_KINDS[^=]*=[\s\S]*?\];/, /"([a-z]+)"/g),
  }],
  ["comm.sort.|s", {
    name: "community sorts",
    values: spaceOf("features/community/CommunityHub.tsx", /\["recent", "top"\] as const/, quoted),
  }],
  ["drill.|e.key", {
    // The catalogue's own keys, so adding a drill fails the suite until it has a label
    // in all three locales rather than rendering `drill.new_drill` to a reader.
    name: "drill catalogue keys",
    values: spaceOf("domain/training.ts", /const DRILLS: TrainingExercise\[\] = \[[\s\S]*?\n\];/, /\{ key: "([^"]+)"/g),
  }],
  ["film.stage.|stageKey", {
    // M193: the six pipeline stages, read out of the array the progress line computes
    // from — so a seventh stage added to STAGES fails here instead of rendering
    // `film.stage.new_stage` to whoever is waiting on the analysis.
    name: "film pipeline stages",
    values: spaceOf("features/film/FilmRoom.tsx", /const STAGES = \[[^\]]*\]/, /"([a-z_]+)"/g),
  }],
  ["cmd.group.|group", S_CMD_GROUP],
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
// M182: one space, two prefixes — the archetype ids are the same list whether the site is
// asking for its name or its one-line description, and both are read out of the table that
// decides which archetypes exist.
const S_DNA = {
  name: "football DNA archetypes",
  values: spaceOf("domain/playerDna.ts", /export const ARCHETYPES[\s\S]*?\n\];/, /id:\s*"([a-z0-9_]+)"/g),
};
claimByPrefix("dna.arch.", S_DNA);
claimByPrefix("dna.blurb.", S_DNA);
const S_TRAJ = {
  name: "career-arc trajectories",
  values: spaceOf("domain/careerArc.ts", /export const TRAJECTORIES[^=]*=[\s\S]*?\];/, /"([a-z]+)"/g),
};
claimByPrefix("det.arc.", S_TRAJ);
// Both directions, because a space read from the table only proves the table is covered.
// An archetype deleted from the model would otherwise leave its words behind as keys no
// site can build — reachable-looking, because the prefix claim still spells them out.
{
  const ids = S_DNA.values;
  const archKeys = pairsOf(0).map(([k]) => k).filter((k) => k.startsWith("dna.arch.")).map((k) => k.slice("dna.arch.".length));
  const blurbKeys = pairsOf(0).map(([k]) => k).filter((k) => k.startsWith("dna.blurb.")).map((k) => k.slice("dna.blurb.".length));
  ok(`dna.arch.… · the archetype ids and the dictionary's name rows are one list (${ids.join(", ")} / ${archKeys.length} keys)`,
    ids.length >= 8 && [...ids].sort().join() === [...archKeys].sort().join());
  ok(`dna.blurb.… · every archetype has a description and nothing else has one (${blurbKeys.length} keys)`,
    [...ids].sort().join() === [...blurbKeys].sort().join());
}

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

// The drill catalogue is held the same way. Its `label` is the English reference for
// `drill.*`, and the pair may not drift — this is what caught the catalogue's own
// "Defential 1v1 jockey" typo, which the dictionary had already spelled correctly.
const drillPairs = [...(appSrc.get("domain/training.ts") ?? "").matchAll(/\{ key: "([^"]+)", label: "([^"]+)"/g)];
const drillDrift = drillPairs.filter(([, k, l]) => en[`drill.${k}`] !== l).map(([, k]) => k);
ok(`en drill.* still equals the drill catalogue, all ${drillPairs.length} of them (${drillDrift.join(", ") || "none"})`,
  drillPairs.length >= 18 && drillDrift.length === 0);

// 19b. Those two `label` fields are the English reference the checks above hold the
//      dictionary against — they are not copy a screen may print. The onboarding
//      position picker did print one, so a reader on 简体中文 picked a position from a
//      grid captioned "Centre Back" and "Full Back / Wing Back" while everything around
//      it was translated. No scan saw it: `{p.label}` is an interpolated hole, and a hole
//      carries no literal to measure. Reading the field is now the failure, whatever
//      words it happens to hold.
// The check names the ROW, not the word: PlayerOS carries `.label` on three unrelated
// rows (a match event, a zone, a film frame) and a file-wide search for the property
// reported it as a fourth offender. What matters is whether a screen reads the label off
// a row it got from one of these two tables, so the parameter of the map is what gets
// looked for.
// M192 added the drill catalogue and `exercises` to the sources: a session's rows carry
// the same kind of English `label`, and they reach the screen through `exercises.map`.
// `byWeek.map((w) => …)` in the same file keeps its own `label`, which is why the map
// source is named rather than the property being banned outright.
// The file filter is "maps one of these rows", not "mentions one of these tables": after
// M192 a screen can render a drill without ever naming the catalogue, because the row
// arrives inside a session. Requiring the table identifier would have silently stopped
// covering the very site this milestone fixed.
// The callback may take an index as well: `exercises.map((e, i) => …)` is how both drill
// sites are written, and a pattern that only accepted a single parameter matched neither
// of them — so the clause passed on a file it had never actually read. The trailing group
// is optional so `(p) =>`, `p =>` and `(e, i) =>` all resolve to the row name.
const MAP_PARAM = /\b(?:POSITION_GROUPS|ATTRIBUTE_DEFS|DRILLS|exercises)\.(?:map|filter|find|forEach)\(\s*\(?\s*([A-Za-z_$][\w$]*)\s*(?:,[^)]*)?\)?\s*=>/g;
let rowMappers = 0;
const labelPrinters = [];
for (const [p, s] of appSrc) {
  if (!/^(features|ui)\//.test(p)) continue;
  const params = [...s.matchAll(MAP_PARAM)];
  if (!params.length) continue;
  rowMappers += 1;
  for (const m of params) {
    if (new RegExp(`\\b${m[1]}\\.label\\b`).test(s)) labelPrinters.push(`${p} (${m[1]}.label)`);
  }
}
ok(`no screen prints a domain name table's English label (${rowMappers} files mapping those rows, ${labelPrinters.join(", ") || "none"})`,
  rowMappers > 0 && labelPrinters.length === 0);

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
// The other direction: a variable the call supplies and no locale's value interpolates is
// silently thrown away. The screen still reads as complete, so this is not a broken-output
// bug but a lost-number one — the caller computed something and the visitor never sees it.
// M167 measured 83 var-carrying literal sites and 0 of these, which is what makes the
// clause cheap to hold rather than cheap to skip.
const droppedVars = [];
let varSites = 0;

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
    varSites++;
    const unused = given.filter((g) => !phs.includes(g));
    if (unused.length) droppedVars.push(`${path}: ${key} supplies {${unused.join(",")}} no locale interpolates`);
  }
}
ok(`every placeholder key is read by a call that supplies its variables (${substituted} filled, ${unsubstituted.length} short)`,
  unsubstituted.length === 0);
for (const u of unsubstituted.slice(0, 15)) console.log("       short: " + u);
ok(`the placeholder scan reads t()'s own variable filling, and everything it looks at is readable (${substituted} filled, ${unreadable.length} unreadable)`,
  substituted >= 20 && unreadable.length === 0);
ok(`no literal-key call throws a variable away — every name it supplies is interpolated by the value (${varSites} var-carrying sites, ${droppedVars.length} dropped)`,
  varSites >= 60 && droppedVars.length === 0);
for (const d of droppedVars.slice(0, 8)) console.log("       dropped: " + d);

// 24b. The same contract at a *template* site, which the loop above cannot see because its
//      first argument is not a literal. Nothing in the repo passes variables at a dynamic
//      site today (measured: 0 of 69), so this clause is written to be provable rather than
//      plausible — it reports how many sites it read, and the milestone's mutation probe
//      supplies variables at one of them to show the disagreement path is live.
//      Two rules, and the second is deliberately weaker than per-key: a space may hold a
//      `{a}` row and a `{b}` row, so a site legitimately supplying both is only wrong if a
//      name appears in *neither*.
const DYN_T = /\bt\(\s*`([^`]*)\$\{([^}]*)\}([^`]*)`/g;
const dynBad = [];
let dynSites = 0, dynVarSites = 0;
for (const [path, code] of appSrc) {
  for (const m of code.matchAll(DYN_T)) {
    dynSites++;
    const args = callArgs(code, code.indexOf("(", m.index));
    if (!args || args.length < 2 || !args[1].trim().startsWith("{")) continue;
    dynVarSites++;
    const given = varNames(args[1].trim().replace(/^\{/, "").replace(/\}$/, ""));
    if (!given) { dynBad.push(`${path}: ${m[0].slice(0, 44)} vars object cannot be read`); continue; }
    const sp = SPACES.get(`${m[1]}|${m[2].trim()}`);
    if (!sp) { dynBad.push(`${path}: ${m[1]}…${m[3]} passes variables but its value space is undeclared`); continue; }
    const union = new Set();
    for (const v of sp.values) {
      const key = m[1] + v + m[3];
      if (!(key in en)) continue; // check 17 already reports an incomplete space
      const need = [...new Set((en[key].match(/\{(\w+)\}/g) ?? []).map((s) => s.slice(1, -1)))];
      need.forEach((x) => union.add(x));
      const missed = need.filter((x) => !given.includes(x));
      if (missed.length) dynBad.push(`${path}: ${key} interpolates {${missed.join(",")}} the site never supplies`);
    }
    const unused = given.filter((g) => !union.has(g));
    if (unused.length) dynBad.push(`${path}: ${m[1]}…${m[3]} supplies {${unused.join(",")}} no key in its space interpolates`);
  }
}
ok(`a template site that passes variables supplies only what its space interpolates (${dynSites} dynamic sites read, ${dynVarSites} carrying variables, ${dynBad.length} disagreement(s))`,
  dynSites >= 60 && dynBad.length === 0);
for (const d of dynBad.slice(0, 8)) console.log("       dyn: " + d);

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

// 28b. Check 28's list is spelled by hand, so it only ever covers what whoever wrote
//      it happened to know about. M177 is the proof of the cost: `ZONE_LABEL` became a
//      `Record<LoadZone, RowText>` mid-milestone — five row objects handed to four
//      screens — and check 28 stayed green while printing one of them raw would render
//      "[object Object]". The type annotation is the fact here, and a fact in the code
//      should not need a hand-written list to keep it true. So this half is derived:
//      every map declared `: Record<…, RowText>` anywhere in the app is a row producer,
//      and every indexed read of one in a component has to sit inside a rowLine( call.
const ROW_MAPS = [...appSrc]
  .filter(([p]) => p.endsWith(".ts"))
  .flatMap(([, code]) => [...code.matchAll(/\bconst\s+(\w+)\s*:\s*Record<[^;{}]*RowText\s*>/g)].map((m) => m[1]));
const TSX = [...appSrc].filter(([p]) => p.endsWith(".tsx"));
const bareMapReads = [];
let mapReads = 0;
for (const [p, body] of TSX) {
  for (const name of ROW_MAPS) {
    for (const hit of body.matchAll(new RegExp("\\b" + name + "\\s*\\[", "g"))) {
      mapReads++;
      const before = body.slice(Math.max(0, hit.index - 24), hit.index);
      if (!/rowLine\([^)]{0,16}$/.test(before)) bareMapReads.push(p + ": " + hit[0] + "…");
    }
  }
}
ok("every read of a RowText map is resolved by rowLine (" + ROW_MAPS.length + " derived maps, " + mapReads + " reads, " + bareMapReads.length + " bare)",
  ROW_MAPS.length >= 2 && mapReads >= 5 && bareMapReads.length === 0);
for (const b of bareMapReads.slice(0, 8)) console.log("       bare map read: " + b);

// 28c. The same fact, one step further: which names the derivation above is ALLOWED to
//      read. A component that prints a row field raw renders "[object Object]" — check 28
//      covers a hand-written list of read sites and check 28b derived RowText maps, and
//      M179's probe found the /review screen's `{ins.text}` outside both. The type
//      annotation in the domain interface is the fact, so the field names come from there.
//      A name is only usable where it is unambiguous AT THE READER: a component that
//      imports review.ts (`evidence: RowText[]`) and also a module typing `evidence:
//      string[]` cannot be checked by name, so shadowing is computed per component rather
//      than across the whole tree — gating on the global intersection measured 2 fields
//      and 1 read site, i.e. a gate that guards nothing.
// Every module that can declare a field — a domain interface, a data interface, or a
// component's own props — is read for BOTH sides. A component that takes `label: string`
// as a prop can legitimately print that label, so the name is shadowed for it: gating by
// name alone would accuse `Legend` of printing a row raw.
// Both sides of the name test read a field declaration anywhere it appears — its own line,
// or one property inside an inline props type like `{ color: string; label: string }`,
// which is exactly where a component's own plain-text `label` hides.
const FIELD_ROW = /(?:^|[{;,]\s*)(\w+)\s*:\s*(?:readonly\s+)?RowText(?:\[\])?\s*(?=[;,}])/g;
const FIELD_STR = /(?:^|[{;,]\s*)(\w+)\s*:\s*(?:readonly\s+)?string(?:\[\])?\s*(?=[;,}])/g;
const domainTs = [...appSrc].filter(([p2]) => /\.(ts|tsx)$/.test(p2) && !p2.endsWith("rowText.ts"));
const rowFields = new Map();
const stringFields = new Map();
for (const [dp, code] of domainTs) {
  for (const m of code.matchAll(FIELD_ROW)) {
    if (!rowFields.has(m[1])) rowFields.set(m[1], []);
    if (!rowFields.get(m[1]).includes(dp)) rowFields.get(m[1]).push(dp);
  }
  for (const m of code.matchAll(FIELD_STR)) {
    if (!stringFields.has(m[1])) stringFields.set(m[1], []);
    if (!stringFields.get(m[1]).includes(dp)) stringFields.get(m[1]).push(dp);
  }
}
const bareRowReads = [];
const gatedReads = new Map();
for (const [p2, body] of TSX) {
  const imports = new Set([...body.matchAll(/from\s+"@\/([^"]+)"/g)].map((m) => m[1].replace(/\.tsx?$/, "")));
  for (const [field, mods] of rowFields) {
    const rowsHere = mods.filter((m) => imports.has(m.replace(/\.ts$/, "")));
    if (!rowsHere.length) continue;
    if ((stringFields.get(field) ?? []).some((m) => m === p2 || imports.has(m.replace(/\.ts$/, "")))) continue;
    for (const hit of body.matchAll(new RegExp("\\{\\s*(rowLine\\(\\s*)?([A-Za-z_$][\\w$.]*\\.)?" + field + "\\s*[,}]", "g"))) {
      const key = `${p2.split("/").pop()} · ${field}`;
      gatedReads.set(key, (gatedReads.get(key) ?? 0) + 1);
      if (hit[1]) continue; // wrapped: `{rowLine(x.field, t)}`
      bareRowReads.push(`${p2}: {${hit[2] ?? ""}${field}…}`);
    }
  }
}
const gatedSites = [...gatedReads.keys()];
const gatedCount = [...gatedReads.values()].reduce((n, k) => n + k, 0);
ok(`every JSX read of a row field the reader cannot confuse is resolved by rowLine (${gatedSites.length} file/field pairs, ${gatedCount} reads, ${bareRowReads.length} bare)`,
  bareRowReads.length === 0);
for (const b of bareRowReads.slice(0, 8)) console.log("       bare row read: " + b);
// Non-vacuity: the rule has to be reading the review screen's rows, which is the site
// that started this. A pattern that matched nothing would pass the check above. Array
// fields are not in scope here — a bare one renders its ELEMENT, not the array, so the
// map itself looks identical either way; those are check 28b's and proof-review's.
ok(`the derivation is reading the /review screen's prose fields (${gatedSites.filter((k) => k.includes("ReviewPage")).length} of them)`,
  gatedSites.includes("ReviewPage.tsx · text") &&
  gatedSites.includes("ReviewPage.tsx · reason") &&
  gatedSites.includes("LoadPage.tsx · advice"));


// 28d. The code-leak half of the same rule, for the newest code family. A player record
//      stores its archetype as an id (`ball_winner`), which is meaningful to the model and
//      noise on the page — M58's original defect was exactly a slug rendering as a name.
//      Since M182 the words live in `dna.arch.*`, so every read of `.archetype` in a
//      component has to sit inside that lookup. Writes (`archetype: dna.primary.id`) are
//      not reads and are skipped by requiring the dot.
const ARCH_READ = /\.([A-Za-z_$][\w$]*\.)?archetype\b/g;
const slugReads = [];
let slugGuarded = 0;
for (const [p2, body] of TSX) {
  for (const hit of body.matchAll(ARCH_READ)) {
    const before = body.slice(Math.max(0, hit.index - 30), hit.index);
    // `"det.archetype"` is a dictionary key inside a string, not a read of a record.
    if (/["'`][\w$]*$/.test(before)) continue;
    if (/dna\.arch\.\$\{[\w$.]*$/.test(before)) { slugGuarded++; continue; }
    slugReads.push(`${p2}: …${before.slice(-16)}${hit[0]}`);
  }
}
ok(`every archetype id a component reads, it reads through dna.arch. (${slugGuarded} guarded, ${slugReads.length} raw)`,
  slugReads.length === 0);
for (const r of slugReads.slice(0, 6)) console.log("       raw id read: " + r);
ok(`the id-leak scan is reading sites that exist (${slugGuarded} guarded reads)`, slugGuarded >= 6);

// Two files name the same five kinds for two different purposes; if they drift, a
// retrieval kind can arrive in a chip the legend has no colour or word for.
{
  const retrieval = spaceOf("domain/types.ts", /export const SEARCH_KINDS[^=]*=[\s\S]*?\];/, /"([a-z]+)"/g);
  const canvas = spaceOf("features/ai/AiStudio.tsx", /const TYPE_COLOR[\s\S]*?\};/, /([a-z]+)\s*:\s*"var\(/g);
  ok(`the AI's retrieval kinds and the graph's drawable kinds are one list (${retrieval.join(", ")} / ${canvas.join(", ")})`,
    retrieval.length === 5 && [...retrieval].sort().join() === [...canvas].sort().join());
}

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
  // M209. An apostrophe inside a HOLE, in nested JSX text: `{rows.map((r) => <li>{r.k}'</li>)}`.
  // `skipQuoted` bails at the newline, and the old `valueEnd` read that bail as "a string
  // ended here" — so the rest of the line, including the `}` that closes the hole, left the
  // brace count and the hole ran on to the next `}` in the file. On Simulation Lab's
  // timeline that was 212 characters and six lines later, and four `function`/`interface`
  // declarations came back as interface prose. Planting a declaration AFTER the component is
  // what makes it observable: an overrun reads it as text, so the assertion below goes red.
  `      <ul>{rows.map((r) => <li>{r.k}'</li>)}</ul>`,
  `    </Panel>`,
  `  );`,
  `}`,
  ``,
  `function PlantedTail() {`,
  `  return null;`,
  `}`,
  ``,
].join("\n");
const planted = scanSource(RAW_FIXTURE).hits;
ok(`the raw-UI scan reports exactly the copy planted in its fixture (${planted.map((h) => h.kind).join(", ") || "nothing"})`,
  planted.length === 5 && planted.filter((h) => h.kind === "call").length === 2 &&
    planted.every((h) => h.text.startsWith("Planted")));
ok(`a hole containing a JSX-text apostrophe closes on its own line, not on the next declaration (${planted.filter((h) => /PlantedTail/.test(h.text)).length} swallowed)`,
  !planted.some((h) => /PlantedTail/.test(h.text)));
const plantedLookups = lookupsIn(RAW_FIXTURE);
ok(`the fixture's t() lookups are read as lookups, not as interface copy (${plantedLookups.join(", ")})`,
  plantedLookups.length === 6 && planted.every((h) => !plantedLookups.includes(h.text)));

// M212. The comment stripper walked characters, so the `/*` inside `accept="video/*"` opened a
// block comment that ran to the next REAL `*/` — and everything between never reached the scan.
// AppShell was registered here as fully localised while seven English strings sat in that span
// (`label="Your OS"`, `aria-label="Toggle theme"`, the drawer title, the search button). Two
// directions, because a stripper that stops honouring comments at all would pass the first one.
const PHANTOM_FIXTURE = [
  `export function Phantom() {`,
  `  return (`,
  `    <div>`,
  `      <input type="file" accept="video/*" className="hidden" />`,
  `      <Group label="Planted after a mime wildcard">x</Group>`,
  `      {/* Planted inside a real comment */}`,
  `      <div>Planted after a real comment</div>`,
  `    </div>`,
  `  );`,
  `}`,
].join("\n");
const phantom = scanSource(PHANTOM_FIXTURE).hits;
ok(`a mime wildcard inside an attribute is not a comment opener — copy after it is still scanned (${phantom.map((h) => h.text).join(", ") || "nothing"})`,
  phantom.some((h) => h.text === "Planted after a mime wildcard"));
ok(`…and a real {/* … */} is still a comment: the copy inside it stays out of the scan (${phantom.filter((h) => /real comment/.test(h.text)).map((h) => h.text).join(" | ")})`,
  phantom.filter((h) => /inside a real comment/.test(h.text)).length === 0 &&
    phantom.filter((h) => h.text === "Planted after a real comment").length === 1);
const phantomSites = [...PHANTOM_FIXTURE.matchAll(/accept="video\/\*"/g)].length;
// The census is printed inside a clause name, which is how this suite records a measurement —
// but a number nobody asserts can silently fall to 0 while its clause stays green, so the claim
// "this shape is still live in the app" is checked, not just narrated.
const livePhantomSites = [...appSrc].filter(([, code]) => /["'`][^"'`\n]*\/\*/.test(code)).length;
ok(`the fixture plants the shape that hid AppShell (${phantomSites} site), and that shape is still live in ${livePhantomSites} app files, so the scanner's own copy is the one being measured`,
  phantomSites === 1 && livePhantomSites >= 1);
// Narrowness is the other half of the fix, and it needed its own clause because the mutation that
// removes it is behaviourally silent: treating every quote as a literal still echoes the span, so
// no copy is lost and no count moves — the first campaign measured that arm as MISSED. The claim
// worth protecting is therefore the structural one: a quote counts as a literal only after a
// character that can begin a value. An apostrophe after a word character is copy (`{e.minute}'` of
// play, `Don't`), and the table read out of the scanner's own source must not claim one.
const scanSrc = readFileSync(join(root, "scripts", "lib", "rawUiScan.mjs"), "utf8");
const valueBody = (scanSrc.match(/const VALUE_BEFORE = \/\[([^\]]*)\]\$/) ?? [])[1] ?? "";
const valueChars = valueBody.replace(/\\/g, "");
ok(`the value-position table is ${JSON.stringify(valueBody)} (${valueChars.split("").join(" ")}) — it holds \`=\`, which is the shape that hid AppShell, and no letter, digit, \`)\` or \`]\`, so an apostrophe inside copy is never read as a delimiter`,
  valueChars.includes("=") && !/[A-Za-z0-9)\]]/.test(valueChars) && valueChars.length > 0);

const RAW_COVERED = [
  // M166. The palette was the one overlay reachable from every screen, and it was also
  // the reason the scan learned to read `heading`: its four section names reached a
  // 简体中文 visitor in English while this file reported nearly no debt, because
  // CommandGroup's heading prop was not a display slot the scanner knew about.
  "features/command/CommandPalette.tsx",
  "features/compare/ComparePage.tsx",
  // M208. The Data Room was the second of the three big screens, and its 29 were the
  // most mixed of them: seven table headers of which the scan could see exactly one
  // (`P`/`W`/`D`/`L`/`GD` are below its three-letter floor, `PTS` is not) — so the whole
  // row became keys, because a Chinese table reading 胜/平/负/积分 over Latin `P W D` is
  // the same half-measure the codes were; four stat-tile sublines; the forecast block
  // including its model disclosure; and four `Intl.DateTimeFormatOptions` literals that
  // are format specifiers rather than words, hoisted exactly as the profile screen
  // hoisted them at M170.
  "features/analytics/DataRoom.tsx",
  "features/football/Details.tsx",
  "features/history/HistoryPage.tsx",
  // The landing page is the one screen a visitor can reach without onboarding, so it
  // is the first place an untranslated sentence is seen at all. It reached 0 at M164,
  // which needed its pillar list moved out of the JSX: an array inlined in a render
  // hole is scanned as children, so its own ids counted as copy.
  "features/landing/Landing.tsx",
  "features/learn/LearnHub.tsx",
  "features/manager/ManagerOS.tsx",
  "features/onboarding/Onboarding.tsx",
  // M207. The Player OS was the last of the three big screens to reach zero, and what
  // the last seven were matters more than the number: two abbreviations a Chinese
  // reader had been given in Latin (`OVR`, `ACWR`, both of which already had keys this
  // file simply was not using), a coach prompt placeholder, a session summary assembled
  // from three literals the scan could only read as fragments, the ` · Today` half of a
  // title built by concatenation, and a provider id that is data rather than copy.
  // Registering it is what makes the next English literal here name the file.
  "features/player/PlayerOS.tsx",
  "features/review/ReviewPage.tsx",
  // M165. The board's last two debts were of two different kinds: ten dictionary
  // keys sitting in a field named `label`, which the scan reads as a display slot
  // even though the render site already resolved them, and three stat codes that an
  // earlier check had formally excused as codes. Both were measurement artefacts of
  // the same mistake — treating a word the dictionary translates as if it were not
  // copy — and both are gone, so an English literal added here now names the file.
  "features/scouting/ScoutingPanel.tsx",
  "features/settings/SettingsPage.tsx",
  "features/shell/AppShell.tsx",
  // Reached 0 at M161 but only registered here, at M163, because the locale walk made
  // the difference visible: the file renders no raw text, yet until this line an
  // English literal added to it would have moved one aggregate number, not named the
  // file. Registration is what turns "this screen is localised" into a held property.
  "features/community/CommunityHub.tsx",
  "features/tactical/TacticalStudio.tsx",
  "features/transfers/TransferCentre.tsx",
  // M168. Ten items, and the two worth naming were not labels: a bare `pts` suffix and
  // an `{age}y · OVR {ovr}` fragment, i.e. units and abbreviations that read as nothing
  // in isolation to a visitor whose language writes 分 and 岁. Keying the row is what
  // forces the unit to be a decision rather than a typing habit.
  "features/world/DynamicWorld.tsx",
  // M169. Eight "hits", and only one of them was a translation gap: five were codes in
  // arrays inlined in a render hole, which the scan cannot tell apart from copy, and the
  // other three were the status buttons printing those codes. Both are fixed, so the
  // buttons now say 进行中 / 已安排 / 已结束 and the file's codes are gated as data.
  "features/football/FootballWorld.tsx",
  // M170. Seven hits in three kinds: a badge that printed "active"/"not started" in
  // English on a screen where every other word came from the dictionary (2), a `Sources:`
  // label that already has a key every other screen uses (1), and four
  // `Intl.DateTimeFormatOptions` strings — `short`, `numeric`, `2-digit` twice — that the
  // scan read as JSX children only because the option bag sat inside a render hole.
  // Only the first two were copy; the third was moved out rather than translated,
  // because a format specifier is not a word a visitor reads.
  "features/profile/ProfilePage.tsx",
  // M171. Three screens that each carried exactly one English word, and the reason
  // they are registered together is that a one-word file is still an unregistered
  // file: the debt table ranked them last, so they were invisible to every previous
  // milestone. Two of the three were pure reuse (`dash.live` was already on the same
  // screen, `ld.acwr` already labelled the stat tile two rows below the readout), and
  // the Dashboard one explains itself: `LiveCell` had no `useI18n()` at all, so raw
  // English was the only thing it could have rendered.
  "features/dashboard/Dashboard.tsx",
  "features/development/DevelopmentPage.tsx",
  "features/load/LoadPage.tsx",
  // M172. Not a screen but a shared primitive, which is why it matters more than its
  // three counted hits suggest: `DnaCard` renders on the player detail page, the
  // comparison page and Player OS, so its own heading was the same English words on
  // three screens at once. The heading's key moved out of the detail page's namespace
  // (`det.dna.title` -> `dna.title`) because the string is authored by the card, not
  // by the page that passes the other four `det.dna.*` rows in as props.
  "ui/primitives.tsx",
  // M173. The chrome layer at once: every file under components/ui/* that still spoke
  // English out loud. They are registered as a group because they are one audience —
  // a screen reader, on every route, whatever the page itself does. Sidebar's three
  // "Toggle Sidebar" hits are one label rendered as text, aria-label and title on two
  // different controls, and dialog's two are the same word in an sr-only span and a
  // visible footer button, so the 21 counted literals were 17 distinct words — 16 new
  // keys, since "Loading" was already in the dictionary and the spinner reads that row.
  "components/ui/pagination.tsx",
  "components/ui/sidebar.tsx",
  "components/ui/breadcrumb.tsx",
  "components/ui/carousel.tsx",
  "components/ui/dialog.tsx",
  "components/ui/sheet.tsx",
  "components/ui/message-scroller.tsx",
  "components/ui/spinner.tsx",
  // M174. The three shortest screens, and the reason the `*Key` rule below exists.
  // 13 counted literals between them, and not one of them was words a reader saw: 12
  // were codes sitting where the scan could only read them as children — AiStudio's
  // two tab codes, the watchlist board's four sort codes, the achievements page's six
  // group keys — and the 13th was `"Knowledge graph"`, the fallback behind an ariaLabel
  // whose only caller has always passed a translated label. Two lists moved to module
  // scope, one misnamed field (`label` → `labelKey`) stopped lying about what it holds,
  // and the dead fallback was deleted instead of minting a key for a string that
  // cannot render. Renaming a field is the one way to leave a raw-UI count without
  // translating anything, so it is now gated from the other side by checks 28/29.
  "features/ai/AiStudio.tsx",
  "features/watchlist/WatchlistBoard.tsx",
  "features/achievements/AchievementsPage.tsx",
  "ui/charts.tsx",
  // Not a screen: the store is where persisted rows are minted, and the one file a
  // composed sentence can hide in without any component-scoped scan ever seeing it.
  // It reached 0 raw literals at M152 and has to stay there.
  "store/useFootballOS.tsx",
  // Also not a screen, but the one place a route that does not exist yet speaks to a
  // visitor: the not-found/build-queue fallback. It reached 0 at M162.
  "src/App.tsx",
  // M193. The Film Room, 30 counted literals — the largest single registration since
  // M173, and the last file in the open set under 40. Two of the 30 were never words:
  // the plural suffixes either side of a hole in `clip${…}s`, which the scan reads as
  // children. The rest is the screen's own voice: the report's three column headings,
  // the insights grid, the two long DEMO disclosures, and the focus line that had a
  // key on the label and a raw literal on the count next to it. What the scanner
  // cannot see was keyed anyway, because a registered file should mean the screen
  // speaks the reader's language, not that it passes: the six pipeline stages (codes
  // in STAGES, words in `film.stage.*`, gated by check 17), the four toasts —
  // `toast.success(` is not a call shape the scanner matches, which is its own hole
  // and is left open on purpose here rather than widened mid-milestone — and the two
  // ErrorState messages, whose words the Player OS still prints raw.
  "features/film/FilmRoom.tsx",
];
// The ceiling is the debt that is not in the covered set. Lower it when a screen
// is localised; it may only ever go down on purpose.
//
// Measured over every .tsx in the repo — which is wider than the features/ui/
// components tree (at M149, store/useFootballOS.tsx carried 4 and src/App.tsx 3; both
// have since been keyed, and both are now in the covered set above). 596 as of
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
// 307 as of M162, and the ceiling was overdue: Community Hub's 44 hits went to zero
// at M161 without this number moving, so for a whole milestone 354 described a tree
// that no longer existed rather than the debt that did. The reading is now reconciled
// by subtraction, and both terms are measured rather than recalled: 354 - 44 (the
// Community Hub file at 7093fad vs. at HEAD) - 3 (src/App.tsx's not-found fallback,
// keyed in this pass) = 307.
// 289 as of M164: Landing's 18 hits are keys now and the file is covered. Six of those
// 18 were never copy — they were the pillar ids, counted because the array holding them
// was inlined in a JSX hole, which the scan reads as children. Moving the list to module
// scope is what let the file reach 0, and the value space is still enumerated here (see
// DYN_SITES' `landing.pillars.|p.k`), so the ids are gated by key reachability rather
// than by being visible as prose.
// 274 as of M165, measured rather than subtracted: the Scouting board is covered and
// its 15 hits left the open count. Ten were keys held in a field named `label` — so
// this number came down without a single new translation, which is what a misnamed
// field costs. The other five were the OVR/POT/€M stat codes check 12 used to excuse,
// now keyed because the dictionaries on that very screen already say 综合分 and 潜力.
// 265 as of M166, measured on the gate line rather than subtracted: the command palette
// is covered and its 9 counted hits left the open count. The widening that found them
// (see rawUiScan's `heading`) added no debt anywhere else in the tree — the palette is
// the only file in the repo that hands a prop named `heading` copy — so 265 is the same
// tree read with one more eye on it, and one of its overlays now says 前往 instead.
// 255 as of M168, measured on the gate line again: the season-simulation screen is
// covered and its 10 counted hits left the open count. Nothing about the widening
// changed here — the drop is exactly the file's own debt, which is the shape this
// number is supposed to have when a screen is actually localised.
// 247 as of M169, measured the same way: Football World's 8 left the open count, and 5 of
// those 8 were never copy — codes in an array inlined in a render hole. Hoisting them is
// the honest fix (they are gated as a key space by checks 16/17), the 3 real ones were
// the status buttons, which printed LIVE/SCHEDULED/FINISHED at a visitor whose
// dictionary already had 进行中/已安排/已结束.
// 240 as of M170, measured on the gate line: the profile screen is covered and its 7 left
// the open count, of which 4 were format specifiers rather than copy.
// 237 as of M171, measured on the gate line: three screens at one hit each. This is the
// first drop that is not "one screen's whole debt", because the files were already down to
// their last word — the open count fell by exactly the number of new covered files.
// 234 as of M172, measured on the gate line: the shared DnaCard is covered and its 3 left
// the open count — 2 of those 3 were the same literal written twice in two branches.
// 213 as of M173, measured on the gate line: the whole chrome layer at once, 21 literals
// across 8 files. This is the largest single drop since M168 because the milestone is the
// largest single registration — after it, every remaining open file is a screen.
// 200 as of M174, measured on the gate line: the three shortest screens are covered and
// their 13 left the open count — which is also why checks 28/29 landed with them, since
// 6 of those 13 were a field rename and nothing else. Only four files are still in debt
// now, and all four are the big screens this arc has been walking toward.
// 189 as of M175: the player tab strip's ten `label:` fields were renamed to `labelKey`
// and the growth chart's origin tick stopped being a bare English "start". Those 11 are
// the *same* kind of removal checks 28/29 now police, so this milestone's registration
// came with the gate that reads a rename as a rename, not as a translation.
// 179 as of M176, measured on the gate line: PlayerOS 79 → 69. The ten that left are the
// growth tab's panel headings, and unlike M174/M175 none of them is a code or a rename —
// every one is a word a visitor reads. The panel also stopped inventing a badge.
// 149 as of M193, measured on the gate line: the Film Room is covered and its 30 left the
// open count, which is the shape this number is supposed to have — the drop is exactly the
// file's own debt, with nothing else in the tree touched. Three files remain, and all three
// are the big screens: Player OS, Simulation Lab, Data Room.
// 80 as of M207, measured on the gate line: the Player OS is covered and its 7 left the
// open count, again exactly its own debt. Two files remain, and they are the two the arc
// has left: Simulation Lab (51) and Data Room (29).
// 51 as of M208, measured on the gate line: the Data Room is covered and its 29 left the
// open count. One file remains — Simulation Lab — and it is the last of the three the
// comment at M176 named. 46 as of M209, after the scanner stopped counting five things
// that were never copy (see `valueEnd`): the file did not change, the measurement did.
const RAW_UI_CEILING = 46;
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
  .map(([p, src]) => [p, scanSource(src).hits])
  .filter(([, h]) => h.length > 0);
const openTotal = openRows.reduce((s, [, h]) => s + h.length, 0);
ok(`the raw-UI debt outside the covered set has not grown (${openTotal} across ${openRows.length} files, ceiling ${RAW_UI_CEILING})`,
  openTotal <= RAW_UI_CEILING);
for (const [p, h] of openRows.sort((a, b) => b[1].length - a[1].length).slice(0, 6)) console.log(`       debt: ${String(h.length).padStart(4)} ${p}`);
// The skip list above is the one thing in this gate that can make a file invisible, so it is
// policed instead of trusted: if any measured file imports a path that runs through a skipped
// directory, that directory is app source and the exclusion is void. `dev/function-local.ts` is
// the tracked resident and it imports *from* `functions/`, never the other way round — which is
// exactly the direction this clause has to see to stay green.
const SPECIFIER = /(?:\bfrom|\brequire|\bimport)\s*\(?\s*["'`]([^"'`\n]+)["'`]/g;
let specSeen = 0;
const escapesTo = (code) => {
  let bad = null;
  for (const m of code.matchAll(SPECIFIER)) {
    specSeen++;
    if (!bad && m[1].split("/").some((seg, i) => i > 0 && SKIP_DIRS.includes(seg))) bad = m[1];
  }
  return bad;
};
const reaching = [...appSrc].map(([p, code]) => [p, escapesTo(code)]).filter(([, s]) => s);
// The bound is derived from the census it audits, not pinned: two specifiers per measured file.
// At M212 the scan reads 792 across 140 files, so this is a floor on a number that only grows,
// and its purpose is the 0 — a broken SPECIFIER would otherwise audit nothing and agree.
const audit = reaching.length
  ? reaching.map(([p, s]) => p + " -> " + s).join(", ")
  : "none reaches " + SKIP_DIRS.join(", ");
ok(`the skip-list audit read ${specSeen} import specifiers over ${appSrc.size} files and ${reaching.length} of them reaches a skipped directory (${audit})`,
  reaching.length === 0 && appSrc.size > 100 && specSeen > appSrc.size * 2);
// Every clause above counts literals inside *regions* the shared walker built, so it inherits
// the walker's thread: an attribute list that never reaches its `>`, or a brace still open when
// the text runs out, means each region after that point describes a file the source does not
// contain. This is not hypothetical — `components/ui/chart.tsx` read as clean at M212 because
// one mis-advanced escape made its `<style …>` template run away, and the walker finished that
// file six braces deep with an unclosed tag, so the JSX body below line 96 had been parsed as
// attributes for as long as the census has existed. `sourceBalance` is the walker's own account
// of where it stood at EOF, which makes it the only honest way to audit the census's own sight.
// The fields are read off the walker, not hand-written: a report that silently drops one would
// otherwise shrink this gate forever, and the clause below cannot notice a field it was never
// told to look at.
const BAL_FIELDS = Object.keys(sourceBalance(""));
ok(`the balance the census reads reports one field per thread the walker can lose (${BAL_FIELDS.join(", ")})`,
  BAL_FIELDS.join(",") === "elem,depth,inTag");
// Three planted refusals, each breaking exactly one thread and no other, are measured in the
// *same* filter as the population. Without them a weakened filter — one left checking only
// `elem`, say — would report a clean census forever, because the population is clean. With
// them, the filter has to flag exactly three offenders to be green, and every real file that
// loses its thread pushes the count above that.
const BAL_REFUSALS = [
  ["planted unclosed element", ["export const X = () => (", "  <div>", '    {"kept"}', ");", ""].join("\n"), "elem"],
  ["planted bracket open at EOF", ["export const X = () => {", "  const y = [", "    <div>{'kept'}</div>", "  ;", "};", ""].join("\n"), "depth"],
  ["planted unclosed attribute", ['export const Card = () => (', '  <div title="unterminated', ");", ""].join("\n"), "inTag"],
].map(([name, src, field]) => [name, field, sourceBalance(src)]);
const offenders = [...[...appSrc].map(([p, src]) => [p, sourceBalance(src)]), ...BAL_REFUSALS.map(([name, , b]) => [name, b])]
  .filter(([, b]) => BAL_FIELDS.some((k) => b[k]));
ok(`the walker kept its thread to the end of all ${appSrc.size} measured files, and its filter flags exactly the ${BAL_REFUSALS.length} planted refusals and nothing else (${offenders.length}: ${offenders.map(([p, b]) => `${p} ${BAL_FIELDS.filter((k) => b[k]).join("+")}`).join(", ") || "none"})`,
  offenders.length === BAL_REFUSALS.length &&
  BAL_REFUSALS.every(([name, field, b]) => BAL_FIELDS.filter((k) => b[k]).join(",") === field) &&
  appSrc.size > 100);
// The other direction: a whole file must read zero on every field *and* still show its copy from
// two syntactic positions, so an instrument that reports zeros because it builds no regions at
// all cannot pass the clause above either.
const BAL_WHOLE = [
  "export const Card = () => (",
  '  <div title="attr">',
  "    <span>",
  '      {"in a hole"}',
  "    </span>",
  "  </div>",
  ");",
  "",
].join("\n");
const balWhole = sourceBalance(BAL_WHOLE);
const wholeSeen = scanSource(BAL_WHOLE).hits.map((h) => h.kind).join(",");
ok(`and a whole fixture reads zero on every field while still showing its copy (${JSON.stringify(balWhole)} / ${wholeSeen})`,
  BAL_FIELDS.every((k) => !balWhole[k]) && wholeSeen.includes("attr") && wholeSeen.includes("child"));
// The clause above reads the walker's own report, so it answers "where did it stand?". This one
// asks the symptom question a reader actually cares about: if a future commit dropped one
// untranslated caption into the middle of this file, would the census see it? One probe per .tsx,
// at that file's own midpoint, and both of its halves must come back. Measured against the two
// reverted defects separately, the two clauses agree on the file where damage is visible
// (`chart.tsx`) and the balance report additionally sees a non-JSX file's drift that this probe
// cannot reach — so they cover each other rather than duplicate. The control is a file that
// really is blind, built here rather than hoped for: without it, a probe test that stopped
// flagging anything would be indistinguishable from a healthy tree. Choosing it was a
// measurement: an unterminated *attribute* is not blind, because a string stops at its newline
// and the walker re-reads the next `<` as a tag, so only the runaway template literal — the one
// thread with no character to hand that closes it — stays blind to the end.
// The two choices this probe makes (plant in the interior, demand both halves) are load-bearing
// as a pair, and that was measured by restoring the escape defect and re-running the four
// combinations: interior reports chart.tsx with either demand, an end-of-file plant reports it
// under "both halves" only, and the laziest reading of all — plant at the end, accept a single
// half — reports nothing blind in a tree that is not. On the healthy tree the two are
// indistinguishable, which is why neither is a mutation arm on its own.
const MID_PROBE = '<div title="Probe untranslated caption">Probe untranslated body</div>';
const midBlind = (lines) => {
  const at = Math.floor(lines.length / 2);
  const code = [...lines.slice(0, at), "  " + MID_PROBE, ...lines.slice(at)].join("\n");
  return scanSource(code).hits.filter((h) => /Probe untranslated/.test(String(h.text))).length !== 2;
};
const MID_CONTROL = [
  "export const Broken = () => {",
  "  const s = `unterminated template literal",
  "  return <div>{s}</div>;",
  "};",
];
const tsxFiles = files.filter((f) => rel(f).endsWith(".tsx") && !rel(f).startsWith("i18n/"));
const blind = tsxFiles
  .map((f) => [rel(f), midBlind(readFileSync(f, "utf8").replace(/\r\n/g, "\n").split("\n"))])
  .filter(([, b]) => b)
  .map(([p]) => p);
ok(`a caption planted at the midpoint of every one of the ${tsxFiles.length} .tsx files comes back in full (blind: ${blind.join(", ") || "none"}), while the file planted blind here is reported blind (${midBlind(MID_CONTROL)})`,
  blind.length === 0 && midBlind(MID_CONTROL) && tsxFiles.length > 50);
// Non-vacuity, and deliberately *not* a floor on the total. The previous clause read
// `openTotal >= 300`, which is a bound on the exact quantity every milestone is trying
// to shrink: localise three more screens and the check goes red while the scan is
// working perfectly. That is the same mistake as pinning a floor to a measurement.
// What has to stay true as the repo empties is that the scanner still (a) walks the
// tree and (b) classifies copy into more than one syntactic position in real source,
// not only in the fixture we tuned it against. Both survive a fully localised repo
// being *reported*, and when the second one stops holding the honest fix is to delete
// this check — the debt has reached the kind of zero it was never meant to guard.
// M173 removed the third conjunct, `openRows.length >= 15`. Registering eight chrome
// files at once took the open file count to 7, and that clause had already contradicted
// the paragraph above it: a floor on how many files still owe work is a floor on the
// quantity every milestone is trying to shrink, so it went red while the scanner was
// working perfectly. The two properties the comment names are the two that remain.
const openKinds = new Set(openRows.flatMap(([, h]) => h.map((x) => x.kind)));
ok(`the debt scan still walks a real tree and still tells copy positions apart in it (${tsxSrc.length} files, ${openRows.length} in debt, ${openKinds.size} distinct positions: ${[...openKinds].sort().join(", ")})`,
  tsxSrc.length >= 60 && openKinds.size >= 6);

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
// The row's key literal is found by regex; its `vars:` body is read by the SAME balanced
// scanner check 24 uses. That split is deliberate and M195 paid for it: the old reader asked
// for `vars:\s*\{([^{}]*)\}`, i.e. a body with no braces anywhere in it, and a row whose
// value is a nested object literal — `when: formatDate(locale, m.kickoff, { month: "short", …
// })` — matched none of the body. The audit then reported a five-variable row as one that
// "supplies {}", which is M149's failure mode (a silently unreadable row printed as an
// audited one) wearing a new face. So: match the key, then either read the body properly or
// REFUSE it in the message. Nothing here guesses at a shape it cannot see.
const ROW_LITERAL = /\{\s*key:\s*"([^"]+)"/g;
// The text between the `{` at `open` and its matching `}`, with string contents opaque — the
// brace twin of `callArgs`, which stops at a top-level comma. Returns null when the braces
// never balance, because an audit that guesses is worse than one that stops.
function objectBody(code, open) {
  let depth = 0, str = null;
  for (let i = open; i < code.length; i++) {
    const c = code[i];
    if (str) { if (c === str && code[i - 1] !== "\\") str = null; continue; }
    if (c === '"' || c === "'" || c === "`") { str = c; continue; }
    if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) { depth--; if (depth === 0) return code.slice(open + 1, i); }
  }
  return null;
}
// Top-level property names of a `vars: { … }` body. Returns null rather than a partial
// answer when a segment is not recognisably `name` or `name:` — checks 24 and 25 read their
// `t()` arguments through this same function, so the union of what counts as a property is
// one list rather than two that can disagree.
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
    // comma split would cut `focus.join(",")` in half, so this hands the body to the
    // balanced reader and splits at top-level commas only.
    const after = src.slice(m.index + m[0].length);
    const lead = after.match(/^\s*,\s*vars:\s*/);
    let given = [];
    if (lead) {
      const open = m.index + m[0].length + lead[0].length;
      const unreadable = `${path}: ${key} has a vars body this audit cannot read (${after.slice(lead[0].length, lead[0].length + 28).trim()})`;
      if (src[open] !== "{") { badRows.push(unreadable); continue; }
      const body = objectBody(src, open);
      if (body === null) { badRows.push(unreadable); continue; }
      const read = varNames(body);
      if (!read) { badRows.push(unreadable); continue; }
      given = [...new Set(read)].sort();
    }
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

// 28-29. The scan's own escape hatch, pinned from the other side. A raw-UI count can go
//      down without a single translation being written: rename a row's `label` field to
//      `labelKey` and the scan stops reading it as copy (ROW_PROPS matches `label` and
//      nothing else). M149/M155/M165 did that rename legitimately — the strings were
//      already dictionary keys — and M174 did it again on the achievements page, which
//      is six of that milestone's 13 "fixed" literals. The rename is only honest if the
//      key it names exists and something actually resolves it, so both halves are now
//      checked, over the whole tree rather than only the three files touched this time:
//        28 every literal a `*Key` field carries is a dictionary key, present and
//          non-blank in EVERY locale — a renamed field pointing at nothing prints the
//          bare key text on screen, which is the exact bug class checks 4/5 exist for;
//        29 the field is read back through t() — by the declaring file itself when that
//          file is a screen, or by the consumer a module names in KEY_ROW_CONSUMERS when
//          it is a row registry (localData's KeySpec, read by the settings screen). A
//          *Key field nothing resolves is the rename with the translation left out, and
//          it would otherwise keep a raw-UI count down forever.
//      The regex skips `labelKey?: string` and friends by requiring a quoted value, so
//      a type declaration contributes no site and cannot pad the numbers below.
const KEY_FIELD = /\b([A-Za-z_$][\w$]*Key)\s*:\s*(["'])((?:[^"'\\]|\\.)*)\2/g;
// Who renders a key row declared outside a component. Adding a *Key-carrying module
// without a row here fails check 29, so this table cannot fall behind the code.
const KEY_ROW_CONSUMERS = [
  { path: "domain/localData.ts", prop: "labelKey", consumer: "features/settings/SettingsPage.tsx" },
];
const badKeys = [], unresolved = [];
let keySites = 0;
const keyFiles = new Set();
for (const [path, code] of appSrc) {
  const props = new Set();
  for (const m of code.matchAll(KEY_FIELD)) {
    keySites++;
    keyFiles.add(path);
    props.add(m[1]);
    const key = m[3];
    if (key.includes("{")) { badKeys.push(`${path}: ${m[1]} holds a key with a placeholder in it (${key})`); continue; }
    const missing = L.filter((loc) => !(key in D[loc.id]) || !D[loc.id][key].trim()).map((loc) => loc.id);
    if (missing.length) badKeys.push(`${path}: ${m[1]} → ${key} is missing or blank in ${missing.join(",")}`);
  }
  for (const prop of props) {
    const read = new RegExp(`\\bt\\(\\s*[\\w$.]*\\.${prop}\\s*[,)]`);
    if (read.test(code)) continue;
    // A screen has to resolve what it declares. A non-component module that hands its
    // rows out to a screen (localData's KeySpec → the settings page) instead names its
    // consumer here, and the entry has to be true — because "somebody in the tree reads
    // `.labelKey`" is worth nothing when seven files share that property name, which is
    // exactly what the probe that deleted SettingsPage's t() call returned green for.
    const declared = KEY_ROW_CONSUMERS.find((e) => e.path === path && e.prop === prop);
    if (!declared) { unresolved.push(`${path}: ${prop} — a key field with no declared renderer`); continue; }
    if (!read.test(appSrc.get(declared.consumer) ?? ""))
      unresolved.push(`${path}: ${prop} → ${declared.consumer} no longer renders it through t()`);
  }
}
ok(`every key held in a *Key field is a real dictionary row in all ${L.length} locales (${keySites} sites across ${keyFiles.size} files, ${badKeys.slice(0, 4).join(" | ") || "clean"})`,
  badKeys.length === 0);
ok(`every *Key field is read back through t(), so a rename can never dodge the scan by leaving the translation out (${unresolved.slice(0, 4).join(" | ") || "all resolved"})`,
  unresolved.length === 0);

// Non-vacuity for the pair above: the counts come from the tree, and a floor on them is
// a floor on how much of the app relies on this hatch — 99 sites / 9 files as measured
// at M175, of which the three files registered at M174 contribute 6 (the achievements
// page's group names) and the player tab strip contributes 10.
ok(`the *Key scan is reading files that actually carry the fields (${keyFiles.size} files, ${keySites} sites)`,
  keyFiles.size >= 8 && keySites >= 80);

// 30. A word the interface shows on more than one screen gets ONE dictionary key. M172
//     found "Demo mode" sitting under two namespaces; M175 found the growth chart's
//     origin label half-keyed (`dash.chartStart`) and half-bare (a raw "start" in the
//     player screen's copy of the very same chart). Two carriers of one word is how a
//     translation lands on one screen and misses the other, and the drift is invisible to
//     every check above: each key stays reachable, each locale stays complete, each
//     literal stays inside the ceiling.
//     A global one-key-per-word rule is not available — 130 of the English values repeat
//     legitimately, because "Pass" as a stat name and "Pass" as a button verb are
//     different strings with different futures. So this is a declared list that only a
//     milestone may lengthen, and each entry is pinned three ways: exactly one English
//     value carries the word, at least two call sites read that key (single-sourcing a
//     word one reader uses is decoration, not sharing), and no screen renders the bare
//     word as copy again.
const SHARED_WORDS = [
  { word: "start", key: "common.chartStart" },
];
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
for (const s of SHARED_WORDS) {
  const carriers = pairsOf(0).filter(([, v]) => v.trim().toLowerCase() === s.word).map(([k]) => k);
  ok(`"${s.word}" is carried by exactly one English key (${carriers.join(", ") || "none"})`,
    carriers.length === 1 && carriers[0] === s.key);
  const readerRe = new RegExp("\\bt\\(\\s*[\"'`]" + escRe(s.key) + "[\"'`]\\s*[,)]", "g");
  const readers = [...appSrc.values()].reduce((n, code) => n + (code.match(readerRe) ?? []).length, 0);
  ok(`${s.key} is read by ${readers} call sites, so the shared row really is shared`, readers >= 2);
  const bare = tsxSrc.flatMap(([p, code]) => scanSource(code).hits
    .filter((h) => h.text.replace(/^["'`]|["'`]$/g, "").trim().toLowerCase() === s.word)
    .map((h) => `${p} (${h.kind})`));
  ok(`no screen renders "${s.word}" as raw copy any more (${bare.slice(0, 4).join(" | ") || "none"})`,
    bare.length === 0);
}

// 31. Prose typed into a domain module. Everything above this line reads component
//     source, and a sentence composed in `domain/*.ts` never appears there: the module
//     hands the finished English to a screen, which prints it through `rowLine` or a
//     `{value}` row, and the raw-UI scan has nothing to see. M176 found this on the
//     growth panel and M177 on the zone names; the load model's advice, recommendation,
//     evidence and source chips were the last prose the /load screen printed that way,
//     and M178 moved them onto keys. This is the ratchet that keeps the ground: the same
//     sentence-shaped literal count, over the whole of domain/, may only fall.
//     Scope is domain/ only, deliberately. data/ carries sample copy (lesson texts,
//     news items) that screens label as demo content and a reader expects to be authored
//     prose; a domain module's strings are the model's own voice.
//     M181 narrowed what the rule counts. It asked only for "a letter and a space", so it
//     also charged the ratchet for FORMATS — `€${(v / 1e6).toFixed(1)}M`, the ISO date
//     builder, a scoreline that is two record names around a score, a rounded figure. None
//     of those carries English a dictionary could improve on. Measured on the tree, 27 of
//     domain/'s 339 literals were formats, and that mis-attribution was the only reason
//     history.ts, compare.ts and worldEngine.ts looked like prose debtors when they hold no
//     sentence at all. So a literal counts only when it still contains a word of two or
//     more letters after its `${…}` holes are cut out.
const PROSE_LIT = /(["'`])(?:\\.|(?!\1)[^\\])*\1/g;
const NOT_PROSE = [
  /^["'][@.]/,            // import specifiers
  /^["']\.\.\//,
  /^[a-z][a-z0-9]*$/,     // a single lowercase token: a key fragment or enum code
  /^[A-Za-z0-9_ -]{1,3}$/,
];
// True when the literal still names something in English with its interpolated values cut
// out. `€${…}M` and `${home.name} ${hg} – ${ag} ${away.name}` do not; "Window: last {n}
// days" does.
const hasOwnWord = (inner) => /[A-Za-z]{2}/.test(inner.replace(/\$\{[^}]*\}/g, " "));
function proseDebt(relPath) {
  const lines = readFileSync(join(root, ...relPath.split("/")), "utf8").split(/\r?\n/);
  const hits = [];
  lines.forEach((line, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
    for (const raw of line.match(PROSE_LIT) ?? []) {
      const inner = raw.slice(1, -1);
      if (NOT_PROSE.some((re) => re.test(inner))) continue;
      if (!/[A-Za-z]/.test(inner)) continue;
      if (!/ /.test(inner) && !/[.!?]$/.test(inner)) continue;
      if (!hasOwnWord(inner)) continue;
      hits.push(i + 1);
    }
  });
  return hits;
}
// The rule's own two-sided test. A validator whose first run is also its first pass proves
// nothing, and M181's change can fail in BOTH directions: too strict and the ratchet stops
// seeing real sentences (the very regression this file exists to catch), too loose and it
// keeps counting formats. These literals are copied out of the tree they measure.
const PROSE_SAMPLES = [
  [true, '"You completed 3 sessions totalling 100 minutes and earned 150 XP."'],
  [true, '"No saved attributes to compare."'],
  [true, '"decline accelerates from 24; 3 prime years remaining"'],
  [true, '"Your on-device training log"'],
  // Every word in this one is three letters or fewer. It is the sample that stops the rule
  // from being quietly over-tightened to "a long word": a mutation demanding four or more
  // letters fails here even though the format samples all still classify correctly.
  [true, '"Ask now to see the fix log"'],
  [false, '`€${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`'],
  [false, '`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`'],
  [false, '`${home.name} ${hg} – ${ag} ${away.name}`'],
  [false, '"M."'],
  [false, '"attr.name.passing"'],
];
const classifyProse = (raw) => {
  const inner = raw.slice(1, -1);
  if (NOT_PROSE.some((re) => re.test(inner))) return false;
  if (!/[A-Za-z]/.test(inner)) return false;
  if (!/ /.test(inner) && !/[.!?]$/.test(inner)) return false;
  return hasOwnWord(inner);
};
const wrong = PROSE_SAMPLES.filter(([want, raw]) => classifyProse(raw) !== want).map(([, raw]) => raw.slice(0, 40));
ok(`the prose rule calls a sentence a sentence and a format a format (${wrong.length} wrong of ${PROSE_SAMPLES.length})`,
  wrong.length === 0);
for (const w of wrong) console.log("       mis-classified: " + w);
ok(`the rule is tested in both directions (${PROSE_SAMPLES.filter(([w]) => w).length} sentences, ${PROSE_SAMPLES.filter(([w]) => !w).length} non-sentences)`,
  PROSE_SAMPLES.filter(([w]) => w).length >= 5 && PROSE_SAMPLES.filter(([w]) => !w).length >= 5);

const domainFiles = readdirSync(join(root, "domain")).filter((f) => f.endsWith(".ts")).sort();
const debt = domainFiles.map((f) => ["domain/" + f, proseDebt("domain/" + f)]);
const debtTotal = debt.reduce((n, [, h]) => n + h.length, 0);
const debtFiles = debt.filter(([, h]) => h.length).map(([p]) => p);
// Measured on the gate line at M181, with the format literals no longer counted: 312
// literals across 14 of 31 modules (was 339 across 17 — see the rule note above). The next
// milestone to localise a module lowers this number and writes the new one here; it never
// raises it. 264 → 256 at M190, which published domain/gap.ts's eight lines as rows.
// M192 did NOT move this number, and that is worth stating: keying the drill catalogue's
// render site leaves its eighteen `label` fields in the table, because those are the
// English reference the drift check below holds `drill.*` against — the same reason
// domain/attributes.ts has never reached zero. The leak was real and is fixed; the
// ratchet measures a different thing.
const DOMAIN_PROSE_CEILING = 256;
// Modules whose prose is fully keyed. A milestone adds its module to this list in the
// same commit that empties it; nothing removes an entry without putting the words back.
// The three at the end hold no sentence at all once formats stop counting (M181 measured
// them at 1, 3 and 5 "literals" — an ISO date builder, three €-format arms and five
// scoreline templates), so pinning them now is free and stops a real sentence landing there.
const PROSE_ZERO = ["domain/load.ts", "domain/review.ts", "domain/history.ts", "domain/compare.ts", "domain/worldEngine.ts", "domain/playerDna.ts", "domain/scouting.ts", "domain/careerArc.ts", "domain/gap.ts"];
ok(`domain prose still on keys has not grown (${debtTotal} literals across ${debtFiles.length} files, ceiling ${DOMAIN_PROSE_CEILING})`,
  debtTotal <= DOMAIN_PROSE_CEILING);
// Per-module ceilings, so the debt cannot migrate: one global total lets a sentence move
// from `gap.ts` into `learn.ts` and still pass, which is how M178's per-file zero list was
// earned for files that had already emptied. These are the counts the inventory line below
// printed at M188 (sum 271 = the global ceiling); a milestone lowers its own number when it
// keys a module, and may never raise one.
const PROSE_CAPS = {
  "domain/learn.ts": 83,
  "domain/community.ts": 36,
  "domain/career.ts": 29,
  "domain/footprint.ts": 25,
  "domain/attributes.ts": 19,
  "domain/newsImpact.ts": 19,
  "domain/training.ts": 19,
  "domain/filmInsights.ts": 12,
  "domain/gap.ts": 0,
  "domain/matchEngine.ts": 8,
  "domain/careerArc.ts": 0,
  "domain/onboarding.ts": 6,
};
const capBreaches = Object.entries(PROSE_CAPS)
  .map(([f, cap]) => [f, proseDebt(f).length, cap])
  .filter(([, n, cap]) => n > cap);
ok(`no module's own prose debt has grown (${capBreaches.length ? capBreaches.map(([f, n, cap]) => `${f} ${n}>${cap}`).join(", ") : "all 12 at or under cap"})`,
  capBreaches.length === 0);
ok(`the per-module caps cover the whole counted debt (${Object.values(PROSE_CAPS).reduce((a, b) => a + b, 0)} capped vs ${debtTotal} counted)`,
  Object.values(PROSE_CAPS).reduce((a, b) => a + b, 0) === debtTotal);
// Per-module inventory, printed so a re-base reads from the gate instead of from memory:
// the total alone lets literals migrate from one module into another and still pass.
console.log("       inventory: " + debt.filter(([, h]) => h.length).map(([p, h]) => `${p.replace("domain/", "")}=${h.length}`).join(" "));
// Per-file, not just in the total: 24 literals can leave load.ts and enter review.ts and
// the ceiling above still passes. A module that reaches zero stays at zero.
for (const done of PROSE_ZERO) {
  const left = debt.find(([p]) => p === done)?.[1] ?? [];
  ok(`${done} publishes no sentence of its own (${left.length} left on lines ${left.slice(0, 6).join(",")})`,
    left.length === 0);
}
ok(`the zero list names modules that really are in the tree (${PROSE_ZERO.length})`,
  PROSE_ZERO.every((p) => domainFiles.includes(p.split("/")[1])));
ok(`the scan is reading the modules that carry the debt (${debtFiles.length} of ${domainFiles.length} files, ${debtTotal} hits)`,
  domainFiles.length >= 30 && debtFiles.length >= 10 && debtTotal >= 250);

// 31b. The exemption's one hole, closed by name. `data/` is out of scope above because it
//      carries authored sample copy a reader expects to be prose — lesson texts, news
//      items. `data/intelligence.ts` is the exception inside that directory: its strings
//      are the Football AI composing an answer out of retrieved records, which is model
//      voice by any definition. M180 keyed its graph labels; the sentences in its evidence
//      facts and its answer lead are still English (the queue's #165), so the file gets a
//      named cap that may only fall rather than staying invisible behind the exemption.
// Measured at M184, after the AI's own sentences moved onto keys: 2 counted literals left,
// and both are fragments of the question parser's regexes rather than prose a reader sees.
// The cap is the measurement, so it may not drift back up.
const EXTRA_PROSE = [{ path: "data/intelligence.ts", cap: 2 }];
for (const { path, cap } of EXTRA_PROSE) {
  const hits = proseDebt(path);
  ok(`${path} prose has not grown (${hits.length} literals, ceiling ${cap})`, hits.length <= cap);
}
ok(`the extra scope is reading a module that really carries debt (${EXTRA_PROSE.reduce((n, e) => n + proseDebt(e.path).length, 0)} hits)`,
  EXTRA_PROSE.every((e) => proseDebt(e.path).length > 0));

// 32. One English sentence, one key. Check 30 pins a handful of declared shared words;
// this is the same drift class measured across the whole dictionary instead of a list
// someone has to remember to lengthen. M179 found it while moving the review prose: the
// `/review` and `/load` "build my session" buttons carried their own byte-identical
// triples — `rv.recoBusy/Done/Error` and `ld.trainBusy/Done/Error`, nine rows across the
// three locales — so a translation could land on one screen and miss the other while
// every check above stayed green. Short labels are excluded on purpose ("Pass" as a stat
// name and "Pass" as a verb are different strings with different futures); a sentence is
// not.
const SENTENCE_MIN = 20;
const shared = new Map();
for (const [k, v] of pairsOf(0)) {
  const t = v.trim();
  if (t.length < SENTENCE_MIN) continue;
  if (!shared.has(t)) shared.set(t, []);
  shared.get(t).push(k);
}
const twiceCarried = [...shared.entries()].filter(([, ks]) => ks.length > 1);
ok(`no English sentence is carried by two keys (${twiceCarried.length} of ${shared.size} sentences shared)`,
  twiceCarried.length === 0);
for (const [v, ks] of twiceCarried.slice(0, 5)) console.log(`       duplicated: ${ks.join(" | ")} — ${v.slice(0, 60)}`);
ok(`the collapsed triples are read as one row by both screens (${[...appSrc.values()].reduce((n, c) => n + (c.match(/\bt\(\s*"common\.build/g) ?? []).length, 0)} sites)`,
  [...appSrc.values()].reduce((n, c) => n + (c.match(/\bt\(\s*"common\.build/g) ?? []).length, 0) === 6);

// 33. A date formatted for the BROWSER instead of for the READER.
//
// `d.toLocaleDateString()` with no argument means "the browser's language", and the app's
// own language switch has nothing to do with it: a reader who has set the interface to
// 简体中文 still sees `9/12/2026` in their training log. The same deferral is written three
// ways — a bare call, `toLocaleString(undefined, {…})`, and `toLocaleTimeString([], {…})`,
// the last of which looks like a decision because it passes an argument list. Every check
// above this line is a check about KEYS, so this defect class was structurally invisible for
// 190 milestones — there is no key, no dictionary row and no English word in it, just a
// formatter asking the wrong machine. M194 opened one door, `formatDate(locale, value, opts)`,
// and wired every site a SCREEN renders. M195 reached the last instant formatted away from
// one: the Football AI's fixture evidence, composed in a data module where no hook is in
// scope, so the reader's language now arrives as a required argument of the RAG entry point.
// Thirteen door calls across ten files. The clauses below keep the door:
//   (a) a browser-locale `toLocale*` call needs a named entry that proves its own reason,
//       with a per-file cap so the debt that is left cannot migrate (M188's lesson) or grow;
//   (a') a call that DOES pass a locale can still source it from the host, and no
//       argument-shape scan sees that — so `navigator.language` is allowed exactly once, in
//       the picker that chooses the reader's starting locale, and nowhere else;
//   (b) a `formatDate` call that hands over a *literal* locale is the same defect wearing
//       the other face — it renders one language for every reader;
//   (b') the seam that carries a locale into a module with no hook is policed too: every
//       `askIntelligence` call passes the live one and the parameter cannot go optional,
//       because TypeScript cannot see a script or a call site that simply stops caring;
//   (c) a date label assembled by hand out of `getMonth()`/`getDate()` is invisible to (a),
//       because it never calls a formatter at all;
//   (d) a memo that reads `locale` but leaves it out of its dependency array keeps last
//       week's language after the switch — no static formatting check can see that;
//   (e) the assertions run through the PRODUCTION function, so green means a Chinese reader
//       really is shown CJK, not that a regex approved a shape;
//   (f) and the census proves ITSELF on planted samples rather than on a count of the real
//       debt, because a floor on a debt count goes red exactly when the debt is paid.
//
// Scanner plumbing. The call-argument reader check 24 already uses (`callArgs`, top-level
// arguments from the open paren, string and template contents opaque) is the one this check
// reads through too: two scanners over the same source is two chances to disagree about what
// a call is. Every call the census is asked about has to resolve, and the clause that prints
// the count refuses an unresolved one rather than guessing.
// Every call of `name` outside i18n/, with its argument strings. appSrc has already dropped
// comment lines, so a doc comment that mentions the door is not a caller. A declaration is not
// a caller either — and it has to be excluded here rather than assumed away: the
// `askIntelligence` census counted its own `export function` line as a call whose "arguments"
// were `question: string, locale: Locale`, which is a red gate for the wrong reason.
const callsOf = (name) => {
  const re = new RegExp("\\b" + name + "\\(", "g");
  const out = [];
  for (const [path, code] of appSrc) {
    for (const m of code.matchAll(re)) {
      if (/\b(function|const|let|var)\s+$/.test(code.slice(Math.max(0, m.index - 24), m.index))) continue;
      out.push({ path, line: code.slice(0, m.index).split("\n").length, args: callArgs(code, m.index + name.length) });
    }
  }
  return out;
};

// (a) The browser-locale census. A call asks the host when its first argument is absent,
//     `undefined` or `[]`, or the literal "default" — all four read the browser, not the
//     reader. `[]` is the one that slips a hand-written check: it is an argument list, so the
//     call *looks* like a decision was made, and two of this milestone's twelve sites were
//     written that way.
const LOCALE_CALL = /((?:new Date\([^)]*\)|[\w.$]+))\.toLocale[A-Za-z]*\(\s*([^)]*)\)/g;
const firstArgOf = (t) => t.split(",")[0].trim();
const ASKS_THE_HOST = ["", "undefined", "[]", '"default"', "'default'"];
const hostSites = [];
for (const [path, code] of appSrc) {
  for (const m of code.matchAll(LOCALE_CALL)) {
    if (ASKS_THE_HOST.includes(firstArgOf(m[2]))) hostSites.push({ path, receiver: m[1] });
  }
}
const hostCount = (p) => hostSites.filter((s) => s.path === p).length;
// A grouped number. The reason is pinned by name: `item.value` is a chart series value, and
// the clause refuses any receiver that is a `new Date(...)` or is named like an instant, so
// this list cannot be used to park a date. A new receiver has to be added here, in the open.
const HOST_OK_NUMBER = { "components/ui/chart.tsx": ["item.value"] };
// A primitive that is not mounted anywhere. Its two sites would be real debt the day the
// component is imported, so the exemption is only as good as the importer count under it.
const HOST_OK_UNMOUNTED = { "components/ui/calendar.tsx": 2 };
// Still browser-locale, one milestone each to wire. Measured after M195: Player OS's two
// session dates and its record date, and the Data Room's kickoff line. The Football AI's
// fixture fact was the third entry and is gone — its `when:` used to be composed here with
// no locale in scope, and the RAG entry point now takes the reader's language as an
// argument (see the RAG seam below), so the file formats through the door.
const DATE_DEBT = {
  "features/player/PlayerOS.tsx": 3,
};
const undeclaredHost = hostSites.filter((s) =>
  !(s.path in HOST_OK_NUMBER || s.path in HOST_OK_UNMOUNTED || s.path in DATE_DEBT));
ok(`no file formats an instant for the browser without saying why (${undeclaredHost.map((s) => s.path).join(", ") || "none undeclared"} of ${hostSites.length} sites)`,
  undeclaredHost.length === 0);
const grewHost = Object.entries(DATE_DEBT).filter(([p, cap]) => hostCount(p) > cap);
ok(`the remaining date debt has not grown in any file (${grewHost.map(([p, cap]) => `${p} ${hostCount(p)}>${cap}`).join(", ") || Object.entries(DATE_DEBT).map(([p, c]) => `${p.split("/").pop()}=${hostCount(p)}/${c}`).join(" ")})`,
  grewHost.length === 0);
const badNumber = Object.entries(HOST_OK_NUMBER).flatMap(([p, receivers]) =>
  [...(appSrc.get(p) ?? "").matchAll(LOCALE_CALL)]
    .filter((m) => !receivers.includes(m[1]) || /^new Date/.test(m[1]) || /date|kickoff|iso|time|at\b/i.test(m[1]))
    .map((m) => `${p} ${m[1]}`));
ok(`the number exemption still only vouches for a non-instant receiver (${badNumber.join(", ") || "clean"})`,
  badNumber.length === 0);
const calImporters = files.map((f) => rel(f)).filter((p) =>
  p !== "components/ui/calendar.tsx" && /\.tsx?$/.test(p) &&
  /from\s+["'][^"']*ui\/calendar["']/.test(readFileSync(join(root, ...p.split("/")), "utf8")));
ok(`the unmounted-primitive exemption is still unmounted (${calImporters.join(", ") || "0 importers"})`,
  calImporters.length === 0);
// The way back into the same defect that no argument-shape scan can see: a call that DOES
// pass a locale, but sources it from the host. Reading the browser once is correct — the app
// picks a starting locale from it, the reader can override that in the header, and the choice
// persists. A second read means something is being styled by the machine again.
const hostReads = [...appSrc].flatMap(([p, code]) =>
  [...code.matchAll(/\bnavigator\.languages?\b/g)].map(() => p));
const pickerReads = (readFileSync(join(root, "i18n", "index.tsx"), "utf8")
  .match(/\bnavigator\.languages?\b/g) || []).length;
ok(`no formatted value takes its locale from the host (${hostReads.join(", ") || "0 reads outside i18n"}; the start-locale picker reads it ${pickerReads}×)`,
  hostReads.length === 0 && pickerReads === 1);
// Non-vacuity for the census — and the reason it is written as a SELF-TEST rather than a
// floor on the count. The M194 version of this clause was `hostSites.length >= 8`, which sat
// on the debt list: every milestone that WIRED a date made the count smaller, so the next
// honest fix would have gone red for being honest (the anti-pattern this project banned at
// M162). A census of shrinking debt cannot prove itself. What has to hold is that the
// scanner still recognises each spelling, so the synthetic samples below assert exactly that,
// and stay true no matter how much of the real debt gets closed. The controls are the other
// half: a call that names the reader's locale must NOT be counted, or the census is noise.
const HOST_SPELLINGS = [
  ["a bare call", "const a = (x: Date) => x.toLocaleDateString();"],
  ["undefined as the locale", "const b = (x: Date) => x.toLocaleString(undefined, { hour: \"2-digit\" });"],
  ["an empty options list", "const c = (x: Date) => x.toLocaleTimeString([], { hour: \"2-digit\" });"],
  ["the literal \"default\"", "const d = (x: Date) => x.toLocaleDateString(\"default\");"],
  ["a freshly built Date", "const e = (x: string) => new Date(x).toLocaleString();"],
];
const HOST_CONTROLS = [
  ["a call that names the reader's locale", "const f = (x: Date, locale: Locale) => x.toLocaleDateString(locale, { hour: \"2-digit\" });"],
  ["the door itself", "const g = (x: Date, locale: Locale) => formatDate(locale, x);"],
];
const censusOf = (src) => [...src.matchAll(LOCALE_CALL)].filter((m) => ASKS_THE_HOST.includes(firstArgOf(m[2]))).length;
const missedSpellings = HOST_SPELLINGS.filter(([, src]) => censusOf(src) !== 1);
const falseControls = HOST_CONTROLS.filter(([, src]) => censusOf(src) !== 0);
ok(`the census still recognises all ${HOST_SPELLINGS.length} ways of asking the host (${missedSpellings.map(([n]) => n).join(", ") || "all caught"})`,
  missedSpellings.length === 0);
ok(`and recognises none of the ${HOST_CONTROLS.length} calls that name a locale (${falseControls.map(([n]) => n).join(", ") || "no false positives"})`,
  falseControls.length === 0);
ok(`the census scanned the app rather than an empty set (${appSrc.size} source files, ${hostSites.length} browser-locale sites left and all declared)`,
  appSrc.size >= 40);
// (b) The door is the only formatter, and it takes the reader's locale.
const DOOR_CALLS = callsOf("formatDate");
const unresolvedDoor = DOOR_CALLS.filter((c) => !c.args);
const literalLocale = DOOR_CALLS.filter((c) => /^["'`]/.test((c.args?.[0] ?? "").trim()));
const noLocaleArg = DOOR_CALLS.filter((c) => !/(^|[.\w$])locale$/.test((c.args?.[0] ?? "").trim()));
const doorFiles = [...new Set(DOOR_CALLS.map((c) => c.path))];
const IMPORT_DOOR = /import\s*\{[^}]*\bformatDate\b[^}]*\}\s*from\s*"@\/i18n(\/format)?"/;
const unimportedDoor = doorFiles.filter((p) => !IMPORT_DOOR.test(appSrc.get(p) ?? ""));
const otherDoors = [...appSrc].filter(([, code]) => /new Intl\.DateTimeFormat\(/.test(code)).map(([p]) => p);
ok(`every formatDate call resolves and none was mis-parsed (${DOOR_CALLS.length} calls, ${unresolvedDoor.length} unresolved)`,
  unresolvedDoor.length === 0);
ok(`no formatDate call passes a literal locale — that renders one language for everyone (${literalLocale.map((c) => `${c.path}:${c.line}`).join(", ") || "none"})`,
  literalLocale.length === 0);
ok(`every formatDate call's first argument is the reader's locale (${noLocaleArg.map((c) => `${c.path}:${c.line}[${(c.args?.[0] ?? "").trim()}]`).join(", ") || "all clear"})`,
  noLocaleArg.length === 0);
ok(`every file that formats a date imports the door from @/i18n (${unimportedDoor.join(", ") || "none missing"})`,
  unimportedDoor.length === 0);
ok("formatDate is reachable through the i18n umbrella the screens import",
  /export\s*\{\s*formatDate\s*\}\s*from\s*"\.\/format"/.test(readFileSync(join(root, "i18n", "index.tsx"), "utf8")));
ok(`the door is the ONE door — nothing else constructs a formatter (${otherDoors.join(", ") || "none"})`,
  otherDoors.length === 0);
ok(`the door scan is reading real call sites (${DOOR_CALLS.length} across ${doorFiles.length} files)`,
  DOOR_CALLS.length >= 12 && doorFiles.length >= 8);

// (b') The RAG seam is the door's twin, and it needs its own clause because it is not a
//      formatter: `askIntelligence` composes a fact outside any React tree, where no hook can
//      be read, so an argument is the only way the reader's language gets in. M195 threaded
//      that argument; without these three lines a call site could drop it, or the parameter
//      could go optional, and TypeScript would stay green while the browser crept back into
//      the answer the AI cites.
const RAG_CALLS = callsOf("askIntelligence");
const unresolvedRag = RAG_CALLS.filter((c) => !c.args || c.args.length < 2);
const ragLiteralLocale = RAG_CALLS.filter((c) => /^["'`]/.test((c.args?.[1] ?? "").trim()));
const ragNoLocale = RAG_CALLS.filter((c) => !/(^|[.\w$])locale$/.test((c.args?.[1] ?? "").trim()));
const RAG_DECL = (appSrc.get("data/intelligence.ts") ?? "").match(/export function askIntelligence\(([^)]*)\)/)?.[1] ?? "not found";
ok(`every askIntelligence call resolves and passes an answer language (${RAG_CALLS.length} calls, ${unresolvedRag.length} unresolved)`,
  unresolvedRag.length === 0 && RAG_CALLS.length >= 1);
ok(`no askIntelligence call hard-codes the reader (${ragLiteralLocale.map((c) => `${c.path}:${c.line}`).join(", ") || "none"})`,
  ragLiteralLocale.length === 0);
ok(`every askIntelligence call hands over the live locale (${ragNoLocale.map((c) => `${c.path}:${c.line}[${(c.args?.[1] ?? "").trim()}]`).join(", ") || "all clear"})`,
  ragNoLocale.length === 0);
ok(`the RAG entry point requires a Locale rather than defaulting it (${RAG_DECL})`,
  /^\w+: string,\s*locale: Locale$/.test(RAG_DECL.trim()));

// (c) A label built out of date parts by hand never calls a formatter, so (a) cannot see
//     it. What is allowed here is a grouping KEY — `YYYY-MM-DD`, padded, compared against
//     another key and never shown — so each declared site has to still have that shape.
const HAND = /`[^`]*\$\{[^}]*\.get(?:Month|Date|FullYear)\(\)[^`]*`/g;
const DAY_KEY_FILES = { "domain/history.ts": 1, "features/history/HistoryPage.tsx": 1 };
const ISO_KEY = /^\$\{[\w.]+\.getFullYear\(\)\}-\$\{[^}]*padStart\(2, ?"0"\)\}-\$\{[^}]*padStart\(2, ?"0"\)/;
const handSites = [];
for (const [path, code] of appSrc) {
  for (const m of code.matchAll(HAND)) handSites.push({ path, text: m[0], isKey: ISO_KEY.test(m[0].replace(/^`/, "")) });
}
const handByFile = (p) => handSites.filter((s) => s.path === p).length;
const badHand = handSites.filter((s) => !s.isKey || DAY_KEY_FILES[s.path] === undefined);
const lostHand = Object.entries(DAY_KEY_FILES).filter(([p, n]) => handByFile(p) !== n);
ok(`no hand-assembled date label reaches a screen (${badHand.map((s) => `${s.path} ${s.text.slice(0, 34)}`).join(" | ") || "none"})`,
  badHand.length === 0);
ok(`the declared ISO day keys are still there and still keys (${lostHand.map(([p, n]) => `${p} ${handByFile(p)}/${n}`).join(", ") || "all in place"})`,
  lostHand.length === 0);
ok(`the day-key scan is reading the builders it claims (${handSites.length})`, handSites.length === 2);

// (d) A memo is a cache. If its body reads `locale` and its dependency array does not name
//     it, the first render's language is kept forever — so a chart's labels can be in the
//     wrong language on a screen every static formatting check calls clean.
const memos = [];
for (const [path, code] of appSrc) {
  for (const m of code.matchAll(/\buseMemo\(/g)) {
    const args = callArgs(code, m.index + "useMemo".length);
    memos.push({ path, line: code.slice(0, m.index).split("\n").length, body: args?.[0] ?? null, deps: args?.[1] ?? null });
  }
}
const READS_LOCALE = /(^|[^\w$])locale([^\w$]|$)/;
const unparsedMemos = memos.filter((x) => x.body === null || x.deps === null);
const staleMemos = memos.filter((x) => x.body !== null && READS_LOCALE.test(x.body) && !READS_LOCALE.test(x.deps ?? ""));
const localeMemos = memos.filter((x) => x.body !== null && READS_LOCALE.test(x.body));
ok(`every useMemo the scanner was asked about resolved (${memos.length} calls, ${unparsedMemos.length} unparsed)`,
  unparsedMemos.length === 0);
ok(`no cached row reads the reader's language without depending on it (${staleMemos.map((x) => `${x.path}:${x.line}`).join(", ") || "none"})`,
  staleMemos.length === 0);
ok(`the memo rule is watching a locale that is really read (${localeMemos.length} of ${memos.length} memos)`,
  memos.length >= 60 && localeMemos.length >= 3);

// (e) Behaviour, through the function the screens import. A gate that only matched shapes
//     would stay green if the door ignored its own argument, or if an app locale id were a
//     string Intl never resolves — then every reader silently gets the host's format back,
//     which is exactly the bug this milestone fixed.
const { formatDate: door } = await server.ssrLoadModule("/i18n/index.tsx");
ok("the i18n umbrella really exports formatDate at runtime", typeof door === "function");
const WHEN = "2026-09-12T08:30:00Z";
const rendered = Object.fromEntries(L.map((l) => [l.id, door(l.id, WHEN, { month: "short", day: "numeric" })]));
const badIntl = L.filter((l) => !new Intl.DateTimeFormat(l.id).resolvedOptions().locale.toLowerCase().startsWith(l.id.toLowerCase().split("-")[0]));
ok(`every app locale id is one Intl actually resolves (${badIntl.map((l) => l.id).join(", ") || "all resolve"})`,
  badIntl.length === 0);
ok(`the same instant renders differently per locale (${L.map((l) => `${l.id}=${rendered[l.id]}`).join(" ")})`,
  new Set(L.map((l) => rendered[l.id])).size > 1);
const CJK = /[一-鿿]/;
const LONG = L.filter((l) => l.id !== "en" && !CJK.test(door(l.id, WHEN, { year: "numeric", month: "long", day: "numeric" })));
const latinPolluted = CJK.test(rendered.en);
ok(`a Chinese reader is shown CJK and an English reader Latin (${LONG.map((l) => `${l.id}=${door(l.id, WHEN, { year: "numeric", month: "long", day: "numeric" })}`).join(" ") || "zh renders CJK"}${latinPolluted ? " | en polluted" : " | en latin"})`,
  LONG.length === 0 && !latinPolluted);

// (f) A formatted value can survive its formatter and still be rewritten on the way to the
//     screen. `fmtDateTime(locale, mm.kickoff).replace(",", "")` sat on a fixture row since
//     M194 wired it: nothing in (a)-(e) can see it, because the call DOES pass the reader's
//     locale. What it does is a shape edit aimed at one locale's punctuation — measured below,
//     only `en` puts a comma between the day and the time, so the call is a no-op for both
//     Chinese readers and a rewrite for the English one — and it made the same instant read
//     differently on a row and on the detail page beside it. The door's output is a rendered
//     string: post-processing it is the app deciding the reader's format again, downstream.
const DOOR_ALIASES = new Set(["formatDate"]);
for (const [, code] of appSrc) {
  for (const m of code.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=[\s\S]{0,160}?(?:=>|function)[\s\S]{0,60}?\bformatDate\s*\(/g)) DOOR_ALIASES.add(m[1]);
}
const SURGICAL_METHODS = ["replace", "split", "slice", "substring", "substr", "toUpperCase", "toLowerCase", "toLocaleUpperCase", "toLocaleLowerCase", "trim", "trimStart", "trimEnd", "padStart", "padEnd", "concat", "charAt", "indexOf", "includes", "match", "search", "normalize"];
const IS_SURGICAL = new RegExp(`^(${SURGICAL_METHODS.join("|")})$`);
// Walk to the matching close paren so a nested argument cannot hide a chain, then ask what
// comes next. JSX text after the call is not a method, so rendering is not a rewrite.
function postProcessed(src, names) {
  const hits = [];
  for (const name of names) {
    for (const m of src.matchAll(new RegExp(`\\b${name}\\s*\\(`, "g"))) {
      let i = m.index + m[0].length, depth = 1;
      while (i < src.length && depth > 0) {
        if (src[i] === "(") depth++;
        else if (src[i] === ")") depth--;
        i++;
      }
      if (depth !== 0) continue;
      const chain = src.slice(i, i + 60).match(/^\s*\??\.\s*([A-Za-z_$][\w$]*)\s*\(/);
      if (chain && IS_SURGICAL.test(chain[1])) hits.push({ name, method: chain[1] });
    }
  }
  return hits;
}
// Laundered through a local: `const when = fmtDateTime(...); … when.replace(…)`. Counting the
// holders is cheap, and refusing the shape costs nothing today because nothing uses it.
function laundered(src, names) {
  const holders = [];
  for (const m of src.matchAll(new RegExp(`(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*(?:${[...names].join("|")})\\s*\\(`, "g"))) holders.push(m[1]);
  return holders.filter((h) => new RegExp(`\\b${h}\\s*\\??\\.\\s*(?:${SURGICAL_METHODS.join("|")})\\s*\\(`).test(src));
}
const SURGERY = [...appSrc].flatMap(([path, code]) =>
  postProcessed(code, DOOR_ALIASES).map((h) => `${path} ${h.name}().${h.method}`));
const LAUNDERED = [...appSrc].flatMap(([path, code]) => laundered(code, DOOR_ALIASES).map((h) => `${path} ${h}`));
ok(`no screen rewrites what the door rendered (${SURGERY.length === 0 ? "0 rewrites" : SURGERY.join(", ")}; door and ${DOOR_ALIASES.size - 1} per-file aliases walked)`,
  SURGERY.length === 0);
ok(`and no formatted value is laundered through a local and then edited (${LAUNDERED.length === 0 ? "0 holders edited" : LAUNDERED.join(", ")} of ${DOOR_CALLS.length} door call sites)`,
  LAUNDERED.length === 0);
// The census has to be seen refusing, not just reported clean (M194's rule). The planted
// spellings include the two the naive regex misses — a nested argument and a rewrite several
// methods down the chain — and the controls include the shapes that must stay legal.
const SURGICAL_SPELLINGS = [
  ["the door with a method on it", 'const a = (l: Locale, x: string) => formatDate(l, x).replace(",", "");'],
  ["a per-file alias", 'const fmtDateTime = (l: Locale, x: string) => formatDate(l, x);\nconst b = (l: Locale, x: string) => fmtDateTime(l, x).split(" ")[0];'],
  ["a nested argument before the chain", 'const c = (l: Locale, x: string) => formatDate(l, new Date(x)).toUpperCase();'],
  ["laundered through a local", 'const d = (l: Locale, x: string) => { const when = fmtDateTime(l, x); return when.replace(",", ""); };'],
];
const SURGICAL_CONTROLS = [
  ["rendered straight into JSX", 'const e = (l: Locale, x: string) => formatDate(l, x);'],
  ["a method on something that is not a formatted value", 'const f = (label: string) => label.replace(",", "");'],
  ["the door's own options object", 'const g = (l: Locale, x: string) => formatDate(l, x, { month: "short" });'],
];
const missedSurgery = SURGICAL_SPELLINGS.filter(([, src]) => (postProcessed(src, DOOR_ALIASES).length + laundered(src, DOOR_ALIASES).length) === 0);
const falseSurgery = SURGICAL_CONTROLS.filter(([, src]) => (postProcessed(src, DOOR_ALIASES).length + laundered(src, DOOR_ALIASES).length) !== 0);
ok(`the surgery scan catches all ${SURGICAL_SPELLINGS.length} ways of rewriting a rendered value (${missedSurgery.map(([n]) => n).join(", ") || "all caught"})`,
  missedSurgery.length === 0);
ok(`and refuses none of the ${SURGICAL_CONTROLS.length} ways of using one honestly (${falseSurgery.map(([n]) => n).join(", ") || "no false positives"})`,
  falseSurgery.length === 0);
// Why the stripped comma was not a cosmetic nothing: measured through the shipped door, the
// comma is English-only punctuation, so the rewrite only ever applied to the English reader.
const WHEN2 = "2026-09-12T08:30:00Z";
const DTM = { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };
const commas = L.map((l) => [l.id, door(l.id, WHEN2, DTM).includes(",")]);
ok(`a date-time with the fixture row's own options carries a comma in exactly ${commas.filter(([, c]) => c).map(([id]) => id).join("/") || "no"} locale${commas.filter(([, c]) => c).length === 1 ? "" : "s"} (${commas.map(([id, c]) => `${id}=${door(id, WHEN2, DTM)}`).join(" ")})`,
  commas.filter(([, c]) => c).length === 1 && commas.filter(([, c]) => c)[0][0] === "en");
ok(`so a punctuation-strip aimed at that comma cannot reach the readers it appears to serve (${L.filter((l) => !door(l.id, WHEN2, DTM).includes(",")).map((l) => l.id).join("/")} have no comma to strip)`,
  L.filter((l) => l.id !== "en").every((l) => !door(l.id, WHEN2, DTM).includes(",")));
ok("and the fixture row really renders the door's string unchanged today",
  !/fmtDateTime\([^)]*\)\s*\.|formatDate\([^)]*\)\s*\./.test(appSrc.get("features/football/Details.tsx") ?? ""));

console.log(`\n${enKeys.length} keys · ${L.length} locales`);
console.log(`${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
