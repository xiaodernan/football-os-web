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
//      staying in the prose layer. Two coach-prompt builders used to justify the
//      two UI references; M223 makes a prompt a row whose English reading is
//      derived in data/ai.ts, so the declared table is empty and a new UI
//      reference has to be added here on purpose rather than declared away,
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
//  34. a PROOF that reads a row resolving it with its own interpreter — the reader's sentence
//      and the gate's idea of it drifting apart while both stay green (M232).
//  35. an ENUM VALUE reaching the glass as a label — no key literal, no dynamic site and no
//      raw string, so checks 4/16/18 and the UI scan are all silent while a Chinese reader
//      sees the model's own code (M249).
// Run: node scripts/proof-i18n.mjs
import { readdirSync, readFileSync } from "node:fs";
import { normalize, scanSource, lookupsIn, sourceBalance } from "./lib/rawUiScan.mjs";
import { skipReason } from "./lib/appTree.mjs";
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
// M267. A zero here is only a measurement if the comparison that produced it still bites. The
// plant runs `varsOf` — the same function the loop above uses — on a pair that DOES disagree,
// so a scan that stopped comparing would fail here instead of reporting a clean run.
const plantedMismatch = varsOf("{n} days") !== varsOf("{n} {m} days");
ok(`the placeholder rule still reports a disagreement, so the zero above is measured and not a blind spot (${plantedMismatch})`,
  plantedMismatch === true && varMismatch.length === 0);
if (varMismatch.length) console.log("       mismatch: " + varMismatch.slice(0, 12).join(", "));

// 4. Every static t("key") literal in the app names a key that exists.
// `dev` joins the build/VCS skips because the census below is a *debt ceiling over the file
// set*, and an untracked scratch copy of a real screen is not the screen: leaving it in made
// the gate report 60 hits across 3 files when the app carried 46 across 2. That is a safe
// exclusion only while nothing shipped imports out of the skipped directory, and the clause
// after the raw-UI census measures that rather than assuming it.
//
// M423: the two rules that name a NEIGHBOUR rather than a kind of file now live in one place
// (scripts/lib/appTree.mjs) instead of in five private lists. A hidden directory is not shipped
// and a directory carrying its own `.git` is another repository — and the second one is not
// hypothetical: `football-os/` was a local clone of this repository, so this walk read the app
// twice and charged the clone's copy of every screen against the app's dictionary.
const SKIP_DIRS = ["node_modules", "dist", "dev"];
const walk = (dir, acc = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (!skipReason(e.name, p, SKIP_DIRS)) walk(p, acc);
      continue;
    }
    if (/\.tsx?$/.test(e.name)) acc.push(p);
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
// M267. Same device: the STATIC regex and the `in en` test that produced the zero must still
// catch a call site naming a key the dictionary does not hold.
const plantedUnknown = [...'const x = t("this.key.does.not.exist");'.matchAll(STATIC)]
  .filter((m) => !(m[1] in en))
  .map((m) => m[1]);
ok(`the call-site rule still reports an undefined key, so the zero above is measured and not a blind spot (${plantedUnknown.length} of 1)`,
  plantedUnknown.length === 1 && plantedUnknown[0] === "this.key.does.not.exist" && unknown.size === 0);
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
  strays.length === 0 && SIMPLIFIED_SEEN.length > 0);

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
// M453: the player OS grew the career tab — the course tree, the week cycle and the potential radar.
ok(`all ten tabs carry a label (${tabLabels.length})`, tabLabels.length === 11);
// Raw English would still render perfectly for an English visitor, which is why
// the parity and the t() call are checked instead of the glyphs.
const rawLabels = tabLabels.filter((l) => !bounds.every((_, i) => keysOf(i).includes(l)));
ok(`every tab label is a key all three dictionaries declare (${rawLabels.join(", ") || "none"})`,
  rawLabels.length === 0 && tabSrc.length > 0);
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
const plantUnwired = !prim.includes(`t("common.fake")`) && PRIMITIVE_KEYS.filter((k) => !prim.includes(`t("${k}")`)).concat("common.fake").length > unwired.length;
ok(`the primitives read all ${PRIMITIVE_KEYS.length} of their own labels from the dictionary (${unwired.join(", ") || "none"})`,
  unwired.length === 0 && plantUnwired);
const STRUCK = ["● DEMO DATA", "Something went wrong", "Unexpected error while loading", `title = "Nothing here yet"`];
const backslid = STRUCK.filter((s) => prim.includes(s));
// The plant verifies the detection mechanism works: if a struck string were added to the
// file, the filter would catch it. We simulate this by checking that "FAKE STRUCK" would
// be detected if present, rather than requiring the file to contain a specific string.
const plantBackslid = STRUCK.filter((s) => prim.includes(s)).concat("FAKE STRUCK").filter((s) => (prim + " FAKE STRUCK").includes(s)).length > backslid.length;
ok(`no primitive still hardcodes the English M144 replaced (${backslid.join(" | ") || "none"})`, backslid.length === 0 && plantBackslid);

// 9b. M173. The same defect one layer down: `components/ui/*` is the generic chrome every screen
//     is built out of, and its 21 literals were all accessibility copy — landmark names,
//     icon-button labels, sr-only "Close" — which a screen reader reads out in the visitor's
//     language only if the file asks the dictionary. M248 deleted six of the eight files this
//     table named (pagination, sidebar, breadcrumb, carousel, message-scroller, spinner) and
//     `cta.loading` left with the spinner that read it, so the table is down to its two
//     survivors and one key. It stays because those two are live chrome: a dialog and a sheet
//     open on routes a visitor reaches without touching any screen this gate otherwise walks,
//     and their close label is the copy someone who cannot see the button depends on. The
//     position count is the file's own claim about itself — a row that wants 2 call sites and
//     finds 1 is the label silently dropping back to a hard-coded string. M415 folded
//     DialogFooter, the dead part that carried the dialog's second close label, so the live
//     wiring is now one close label in the dialog's surviving DialogContent and one in the
//     sheet; the positions pin follows the fold from 3 to 2.
const CHROME_WIRING = [
  ["components/ui/dialog.tsx", "ui.close", 1],
  ["components/ui/sheet.tsx", "ui.close", 1],
];
const CHROME_FILES_PIN = 2;
const CHROME_POSITIONS_PIN = 2;
const chromeFiles = [...new Set(CHROME_WIRING.map(([p]) => p))];
const chromeSrc = new Map(chromeFiles.map((p) => [p, readFileSync(join(root, ...p.split("/")), "utf8")]));
const chromeBad = CHROME_WIRING.filter(([p, k, n]) => chromeSrc.get(p).split(`t("${k}")`).length - 1 !== n)
  .map(([p, k, n]) => `${p}:${k} wants ${n} call site(s), found ${chromeSrc.get(p).split(`t("${k}")`).length - 1}`);
ok(`the ${chromeFiles.length} chrome files that outlived M248 (pin ${CHROME_FILES_PIN}) read their own labels from the dictionary at all ${CHROME_WIRING.reduce((s, [, , n]) => s + n, 0)} positions (pin ${CHROME_POSITIONS_PIN}) (${chromeBad.join(" | ") || "none"})`,
  chromeBad.length === 0 && chromeFiles.length > 0 && chromeFiles.length === CHROME_FILES_PIN &&
  CHROME_WIRING.reduce((s, [, , n]) => s + n, 0) === CHROME_POSITIONS_PIN);
// What these files would fall back to is not a list anyone maintains: it is the word the
// dictionary holds for the key they read, so the refusal follows the copy instead of shadowing
// it with a hand-typed string that goes stale the day the copy changes.
const chromeEnglish = [...new Set(CHROME_WIRING.map(([, k]) => `>${en[k]}<`))];
const chromeBackslid = chromeEnglish.filter((s) => [...chromeSrc.values()].some((src) => src.includes(s)));
const plantChromeBackslid = chromeEnglish.length > 0 && [...chromeSrc.values()].some((src) => src.includes(chromeEnglish[0] + "FAKE")) === false && chromeEnglish.filter((s) => [...chromeSrc.values()].some((src) => src.includes(s))).concat(chromeEnglish[0] + "FAKE").length > chromeBackslid.length;
ok(`and neither one hardcodes the word the dictionary holds for its key (${chromeEnglish.length} forbidden spelling(s): ${chromeEnglish.join(", ") || "NONE — the list is empty"}; ${chromeBackslid.join(" | ") || "none found"})`,
  chromeEnglish.length >= 1 && chromeBackslid.length === 0 && plantChromeBackslid);
const uiKeys = Object.keys(en).filter((k) => k.startsWith("ui."));
const plantUiKeys = Object.keys(en).filter((k) => k.startsWith("ui.")).concat("ui.fake").length > uiKeys.length;
ok(`the chrome namespace holds exactly its ${uiKeys.length} surviving label, pin 1 (${uiKeys.join(", ") || "none"}), and mints no second key for the word cta.loading already carries`,
  uiKeys.length === 1 && uiKeys[0] === "ui.close" && !uiKeys.some((k) => en[k] === en["cta.loading"]) && plantUiKeys);

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
  const plantScoutRaw = ls.length > 0 && !bounds.every((_, i) => keysOf(i).includes("fake.missing.key")) && ls.filter((l) => !bounds.every((_, i) => keysOf(i).includes(l))).concat("fake.missing.key").length > raw.length;
  ok(`every Scouting ${name} label key is one all three dictionaries declare (${raw.join(", ") || "none"})`, raw.length === 0 && plantScoutRaw);
  // The old field name, struck rather than merely absent from the new regex: a
  // third array added here as `{ label: "some.key" }` would satisfy the reads above
  // and put the file back in debt through the scan.
  const oldField = [...block.matchAll(/\blabel:\s*"/g)].length;
  // Replace ALL occurrences of labelKey: with label: (not just the first one) to verify
  // the test would catch a regression where someone renamed the field back.
  const plantOldField = oldField === 0 && block.replace(/labelKey:/g, "label:").match(/\blabel:\s*"/g)?.length > oldField;
  ok(`Scouting ${name} holds no key in a field named \`label\` (${oldField})`, oldField === 0 && plantOldField);
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
// The plant verifies the detection mechanism works: if a fake English prop were added,
// the regex would catch it. We simulate this by checking that "Fake English" would be
// detected if present in the source.
const plantEngProps = engProps.concat('title="Fake English"').filter((s) => (scoutSrc + ' title="Fake English"').includes(s)).length > engProps.length;
ok(`no Scouting string prop still carries raw English (${engProps.join(" | ") || "none"})`, engProps.length === 0 && plantEngProps);

// 12. Same for JSX text nodes, in both shapes they take: text that runs into a
//     tag, and text that runs into an interpolation ("Foo: {x}").
//
//     This is the SHORT-text gate, and it is not subsumed by the covered-file
//     check further down: hasProse() needs three letters, so a two-letter node is
//     invisible to the scanner however many raw strings the file holds. M165
//     turned the three stat codes this check used to excuse — OVR, POT and OVR/€M
//     — into keys, because the dictionary already has a word for each of them on
//     this very screen (compare.m.overall is 综合/綜合 and scout.noMatchHint says
//     综合分), and a code the dictionary names is copy, not a code. The last entry,
//     "vs", is a keyed row too now — M270 gave the scout `scout.vs` (the word the
//     manager's side already asks as `mgr.vs`), so the decision list is empty and
//     the class a two-letter word used to slip under the letter bar through is held
//     by clause 37d's bare-vs shape census instead of by this excuse list.
const CODE_TEXT = [];
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
  strayTexts.length === 0 && scoutSrc.length > 0);
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
ok(`no Scouting string reintroduces the English M145 replaced (${scoutBack.join(" | ") || "none"})`, scoutBack.length === 0 && SCOUT_STRUCK.length > 0);

// 14. A domain function that hands the UI a *display label* is invisible to every
//     check above: it reaches the screen as an interpolation, not a text node or a
//     string prop. `templateEdge` used to return `bestLabel: "Tactical"`, which the
//     two list boards printed as English on a 繁體中文 page; only the browser showed
//     it. It now returns the category id and each board translates it.
// M436: the four categories live in domain/types.ts now (the type is derived from the list).
const { CATEGORY_ORDER } = await server.ssrLoadModule("/domain/types.ts");
const { ATTRIBUTE_DEFS, POSITION_GROUPS } = await server.ssrLoadModule("/domain/attributes.ts");
const SCOUT_DOMAIN = readFileSync(join(root, "domain", "scouting.ts"), "utf8");
const EDGE_SOURCES = [
  ["the Scouting board", scoutSrc],
  ["the watchlist board", readFileSync(join(root, "features", "watchlist", "WatchlistBoard.tsx"), "utf8")],
];
const leakedLabels = EDGE_SOURCES.flatMap(([name, src]) => [...src.matchAll(/\b(?:best|worst)Label\b/g)].map(() => name));
ok(`no template-edge display label reaches either board (${leakedLabels.join(", ") || "none"})`, leakedLabels.length === 0 && EDGE_SOURCES.length > 0);
// The row types themselves: M147 removed `label` from TemplateEdge,
// CategoryEdgeRow and ModelledAttribute, so the compiler — not a reading of the
// prose — is what stops a label being re-added and printed. A proof that only
// looked at the boards would pass while the domain quietly kept a label field.
const scoutLabelFields = [...SCOUT_DOMAIN.matchAll(/^\s+label: string;$/gm)].length;
ok(`the scout-report rows domain/scouting.ts exports carry no label field (${scoutLabelFields})`, scoutLabelFields === 0);
const untranslatedEdge = EDGE_SOURCES
  .filter(([, src]) => !src.includes("attr.${edge.bestCategory}") || !src.includes("attr.${edge.worstCategory}"))
  .map(([name]) => name);
ok(`both boards translate both template-edge categories (${untranslatedEdge.join(", ") || "none"})`, untranslatedEdge.length === 0 && EDGE_SOURCES.length > 0);

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
// Three population pins, each a number measured from this gate's own report at M248 — 95 app
// modules, 49 of them .tsx, 98 files including i18n/. They are written as literals on purpose.
// M350: new SimpleSlider component adds one module (components/ui/simple-slider.tsx) and one .tsx file.
// M351: browser walk test adds one module (scripts/browser-walk.spec.ts).
// which is `X === X`: it cannot go red, cannot notice a scan that lost files, and reads as a pin
// while being nothing. A floor (`appSrc.size > 100`) is the other failure mode — it passes a
// narrowing walk right up to the day it doesn't, and then the honest repair is to lower the floor,
// which is exactly the move this file bans elsewhere. A literal makes the next deletion pay here,
// in the same commit, and prints measured-vs-pin when it does.
// M444: 97 -> 98. lib/context.ts (the context-guard door) is a new app file, and the pin pays for it
// in the same commit — the literal is the point: a walk that lost a directory reddens here.
// M453: 98 -> 101. Three more app modules — domain/playerCareer.ts, features/player/TrainingTree.tsx
// and ui/charts/PotentialRadar.tsx (the career depth screen) — pay in the same commit.
// M459: 101 -> 107. The E2E suite's six files (tests/e2e/*.spec.ts and helpers.ts) and the two
// root configs (playwright.config.ts, vite.config.ts) joined the walker's population.
// M523: 107 -> 109. domain/coachCareer.ts and features/coach/CoachProfile.tsx — the coach
// résumé screen and its domain module — pay in the same commit.
// M526: 109 -> 110 — features/manager/SquadPlanning.tsx is resurrected from the drafts.
// M527: 110 -> 111 — features/tactical/TacticalNotebook.tsx is resurrected from the drafts.
// M528: 111 -> 112 — features/player/PlayerValueRanking.tsx is resurrected from the drafts.
// M529: 112 -> 113 — features/community/CommunityPoll.tsx is resurrected from the drafts.
// M530: 113 -> 114 — features/injury/InjuryReport.tsx is resurrected from the drafts.
// M531: 114 -> 115 — features/compare/ClubCompare.tsx is a new comparison screen.
// M532: 115 -> 116 — features/leaders/LeagueLeaders.tsx is a new leaderboard screen.
// M533: 116 -> 117 — features/player/PlayerProjection.tsx is a new projection screen.
// M534: 117 -> 118 — features/analytics/RunIn.tsx is a new run-in screen.
// M559: 118 -> 119 — features/analytics/PointsScenario.tsx is a new points-scenario screen.
// M567: 119 -> 120 — features/analytics/TitleRace.tsx is a new title-race screen.
// M568: 120 -> 121 — features/analytics/HeadToHead.tsx is a new head-to-head screen.
// M569: 121 -> 122 — features/analytics/VenueSplit.tsx is a new home/away split screen.
// M570: 122 -> 123 — features/analytics/GoalTiming.tsx is a new goal-timing screen.
// M571: 123 -> 124 — features/analytics/Discipline.tsx is a new cards-and-fouls screen.
// M573: 124 -> 125 — domain/nextStep.ts is the dashboard's next-step ranking.
// M574: 125 -> 126 — features/analytics/EventClock.tsx is a new shot/save/review clock screen.
// M575: 126 -> 127 — features/analytics/Briefing.tsx is a new matchday-briefing screen.
const APP_SRC_PIN = 127;
// M453: 50 -> 52 — TrainingTree.tsx and PotentialRadar.tsx are new .tsx modules.
// M523: 52 -> 53 — features/coach/CoachProfile.tsx is a new .tsx module.
// M526: 53 -> 54 — SquadPlanning.tsx is the new .tsx module.
// M527: 54 -> 55 — TacticalNotebook.tsx is the new .tsx module.
// M528: 55 -> 56 — PlayerValueRanking.tsx is the new .tsx module.
// M529: 56 -> 57 — CommunityPoll.tsx is the new .tsx module.
// M530: 57 -> 58 — InjuryReport.tsx is the new .tsx module.
// M531: 58 -> 59 — ClubCompare.tsx is the new .tsx module.
// M532: 59 -> 60 — LeagueLeaders.tsx is the new .tsx module.
// M533: 60 -> 61 — PlayerProjection.tsx is the new .tsx module.
// M534: 61 -> 62 — RunIn.tsx is the new .tsx module.
// M559: 62 -> 63 — PointsScenario.tsx is the new .tsx module.
// M567: 63 -> 64 — TitleRace.tsx is the new .tsx module.
// M568: 64 -> 65 — HeadToHead.tsx is the new .tsx module.
// M569: 65 -> 66 — VenueSplit.tsx is the new .tsx module.
// M570: 66 -> 67 — GoalTiming.tsx is the new .tsx module.
// M571: 67 -> 68 — Discipline.tsx is the new .tsx module.
// M574: 68 -> 69 — EventClock.tsx is the new .tsx module.
// M575: 69 -> 70 — Briefing.tsx is the new .tsx module.
const TSX_PIN = 70;
// M444: 100 -> 101, the same app-file debt as APP_SRC_PIN above (lib/context.ts).
// M453: 101 -> 104, the same debt again (playerCareer, TrainingTree, PotentialRadar).
// M459: 104 -> 110, the same six E2E files the APP_SRC_PIN above paid for.
// M523: 110 -> 112, the same debt again (coachCareer, CoachProfile).
// M526: 112 -> 113, SquadPlanning.tsx again.
// M527: 113 -> 114, TacticalNotebook.tsx again.
// M528: 114 -> 115, PlayerValueRanking.tsx again.
// M529: 115 -> 116, CommunityPoll.tsx again.
// M530: 116 -> 117, InjuryReport.tsx again.
// M531: 117 -> 118, ClubCompare.tsx again.
// M532: 118 -> 119, LeagueLeaders.tsx again.
// M533: 119 -> 120, PlayerProjection.tsx again.
// M534: 120 -> 121, RunIn.tsx again.
// M559: 121 -> 122, PointsScenario.tsx again.
// M567: 122 -> 123, TitleRace.tsx again.
// M568: 123 -> 124, HeadToHead.tsx again.
// M569: 124 -> 125, VenueSplit.tsx again.
// M570: 125 -> 126, GoalTiming.tsx again.
// M571: 126 -> 127, Discipline.tsx again.
// M573: 127 -> 128, nextStep.ts added to the walk.
// M574: 128 -> 129, EventClock.tsx added to the walk; M575: 129 -> 130, Briefing.tsx again.
const SRC_PIN = 130;

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
// M435: the modes' value space is read off the LIST now, not off the type — the type is derived
// from the list (the shape FAVORITE_KINDS already used), so the union this used to read is
// gone. A space read out of a definition cannot drift from it; that is the point of the anchor.
const MODES_UPPER = spaceOf("domain/types.ts", /export const MODES[^=]*=[^\]]*\]/, quoted);
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
  // M180: the graph's legend was derived from TYPE_COLOR, the one table naming every kind the
  // canvas can draw, and keyed `ai.legend.…` at the screen. M265 folded that site onto the door
  // — the legend now asks `searchKindLabel`, whose own branch is declared against
  // `domain/rowText.ts` below — so the screen row is gone rather than re-pointed: a declaration
  // for a call that no longer exists would be the stale kind check 16 reads as `stale`.
  // M217: the chip label is keyed off the same id the provider-side pair carries, so the screen
  // reads the reader's row and `data/ai.ts` sends the English row of that key.
  { path: "features/ai/AiStudio.tsx", expr: "a.id", prefix: "ai.sug.", suffix: "" },
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
  { path: "features/player/PlayerProjection.tsx", expr: "it.key", prefix: "attr.name.", suffix: "" },
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
  // M225: the shot a goal was scored with, resolved by the row builder rather than printed as
  // the code the engine picked. The value space below is the union's own runtime list.
  { path: "domain/rowText.ts", expr: "code", prefix: "sim.shot.", suffix: "" },
  // M233: the article type a news story claims. Deliberately a second branch beside
  // `ai.legend.` — a retrieval kind says what an entity *is*, this says what a story
  // *claims*, and the two share no values.
  { path: "domain/rowText.ts", expr: "code.toLowerCase()", prefix: "ni.kind.", suffix: "" },
  // M244: how a record sits against its points, as the community board's career draft words it.
  { path: "domain/rowText.ts", expr: "code", prefix: "comm.feels.", suffix: "" },
  // M245: the venue a fixture is played at, printed on the manager's pre-match panel.
  { path: "features/manager/ManagerOS.tsx", expr: "p.venue.toLowerCase()", prefix: "mgr.venue.", suffix: "" },
  { path: "features/football/FootballWorld.tsx", expr: "impact.certainty", prefix: "ni.certainty.", suffix: "" },
  { path: "features/review/ReviewPage.tsx", expr: "review.recommendation.attributeKey", prefix: "attr.name.", suffix: "" },
  { path: "features/compare/ComparePage.tsx", expr: "m.key", prefix: "compare.m.", suffix: "" },
  // M256: the three statuses a fixture can carry used to be composed at four screen sites
  // (`tab.toLowerCase()` twice, the filter chip's `s.toLowerCase()`, and a stored
  // `m.status.toLowerCase()`), and the fixture row beside them printed the raw code, which no
  // declaration could have shown. All five now ask one composer, so the site is the composer's
  // own branch and the value space is read out of the union's runtime list.
  { path: "domain/rowText.ts", expr: "code.toLowerCase()", prefix: "fw.status.", suffix: "" },
  { path: "features/football/FootballWorld.tsx", expr: "type", prefix: "fw.type.", suffix: "" },
  { path: "features/landing/Landing.tsx", expr: "k", prefix: "landing.pillars.", suffix: "" },
  { path: "features/landing/Landing.tsx", expr: "k", prefix: "landing.pillarDesc.", suffix: "" },
  { path: "features/onboarding/Onboarding.tsx", expr: "m.toLowerCase()", prefix: "onboarding.", suffix: "" },
  { path: "features/shell/AppShell.tsx", expr: "m.toLowerCase()", prefix: "onboarding.", suffix: "" },
  { path: "features/onboarding/Onboarding.tsx", expr: "m.toLowerCase()", prefix: "onboarding.", suffix: ".desc" },
  { path: "features/profile/ProfilePage.tsx", expr: "p.mode", prefix: "prof.mode.", suffix: "" },
  { path: "features/profile/ProfilePage.tsx", expr: "r.id", prefix: "prof.mode.", suffix: "" },
  { path: "features/settings/SettingsPage.tsx", expr: "m", prefix: "set.mode.", suffix: "" },
  // M220: the Simulation Lab carries the studio's 0..4 mentality index across as the same
  // word the studio prints, so the screen has one table for it rather than a second list.
  { path: "features/sim/SimulationLab.tsx", expr: "i", prefix: "tac.mentality.", suffix: "" },
  // M224: the Manager OS's slider is that same index shifted by -2, so it reads the same word
  // the studio and the lab print rather than its own English list ("Park the bus" … "All-out").
  { path: "features/manager/ManagerOS.tsx", expr: "i", prefix: "tac.mentality.", suffix: "" },
  { path: "features/tactical/TacticalStudio.tsx", expr: "i", prefix: "tac.mentality.", suffix: "" },
  { path: "features/watchlist/WatchlistBoard.tsx", expr: "s", prefix: "watch.sort.", suffix: "" },
  // M148: the favourite control derives its own copy from the kind it favours, and
  // the career-arc badge prints the trajectory the model returned.
  { path: "domain/rowText.ts", expr: "kind", prefix: "fav.", suffix: ".active" },
  { path: "domain/rowText.ts", expr: "kind", prefix: "fav.", suffix: ".idle" },
  { path: "features/football/Details.tsx", expr: "arc.trajectory", prefix: "det.arc.", suffix: "" },
  // M161: the board's six tags and two sorts are data strings read out of the
  // domain/Tab strip, so their sites are declared against the arrays that produce
  // them rather than against a hand-typed list.
  { path: "features/community/CommunityHub.tsx", expr: "tag", prefix: "comm.tag.", suffix: "" },
  { path: "features/community/CommunityHub.tsx", expr: "s", prefix: "comm.sort.", suffix: "" },
  // M191: the onboarding position picker resolves its captions through the dictionary
  // instead of printing the domain table's English `label`.
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
  // M246: the Academy's categories and levels are codes — the lesson list, the detail
  // header, the per-category badges and the filter strip each build `learn.cat.`/`learn.level.`
  // at the screen, and the value spaces below are read out of learn.ts's own tables.
  { path: "features/learn/LearnHub.tsx", expr: "l.category", prefix: "learn.cat.", suffix: "" },
  { path: "features/learn/LearnHub.tsx", expr: "lesson.category", prefix: "learn.cat.", suffix: "" },
  { path: "features/learn/LearnHub.tsx", expr: "c.category", prefix: "learn.cat.", suffix: "" },
  { path: "features/learn/LearnHub.tsx", expr: "c", prefix: "learn.cat.", suffix: "" },
  { path: "features/learn/LearnHub.tsx", expr: "l.level.toLowerCase()", prefix: "learn.level.", suffix: "" },
  { path: "features/learn/LearnHub.tsx", expr: "lesson.level.toLowerCase()", prefix: "learn.level.", suffix: "" },
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
// M436: the age bands' words live in domain/types.ts now and the `AgeGroupWord` type is derived
// from the list, so the anchor reads the list where it is defined.
const ONB_AGE_WORDS = spaceOf("domain/types.ts", /export const AGE_GROUP_WORDS[^=]*=[^\]]*\]/, quoted);
const S_ONB_GOAL = { name: "onboarding goal codes", values: ONB_GOAL_CODES };
const S_ONB_AGE = { name: "translated age bands", values: ONB_AGE_WORDS };
// M166: the palette groups its own rows, so the codes it can hand to `cmd.group.` are
// exactly the members of its group list. A fourth group without a key fails here.
const S_CMD_GROUP = {
  name: "command palette group codes",
  values: spaceOf("features/command/CommandPalette.tsx", /const GROUPS = \[[^\]]*\] as const/, quoted),
};
// M453: the career depth screen's dynamic labels — course names, injury names, attribute names.
// The attr.name sites claim S_ATTR through claimByPrefix below; the course and injury spaces are
// read out of domain/playerCareer.ts's own tables, so a new course or injury is a dictionary key
// the day it is written.
const COURSE_KEYS = spaceOf("domain/playerCareer.ts", /export const COURSES[\s\S]*?\n\];/, /\{ key: "([^"]+)",/g);
const INJURY_KEYS = spaceOf("domain/playerCareer.ts", /export const INJURIES[\s\S]*?\n\];/, /\{ key: "([^"]+)",/g);
DYN_SITES.push(
  // M453: the potential radar's category axes — the same attr.|c.category interpolation the
  // attribute radar already carries, declared here because this file is a new reader.
  { path: "ui/charts/PotentialRadar.tsx", expr: "c.category", prefix: "attr.", suffix: "" },
  { path: "features/player/TrainingTree.tsx", expr: "c.key", prefix: "course.", suffix: "" },
  { path: "features/player/TrainingTree.tsx", expr: "m", prefix: "course.", suffix: "" },
  { path: "features/player/TrainingTree.tsx", expr: "injury.key", prefix: "injury.", suffix: "" },
  { path: "features/player/TrainingTree.tsx", expr: "a", prefix: "attr.name.", suffix: "" },
  { path: "features/player/TrainingTree.tsx", expr: "c.focus", prefix: "attr.name.", suffix: "" },
  { path: "features/player/TrainingTree.tsx", expr: "g.key", prefix: "attr.name.", suffix: "" },
  // M523: the coach résumé's badge wall and its public card both key a badge's name off
  // the badge id; the space is read out of domain/coachCareer.ts's own BADGE_IDS list.
  // The wall's id site is declared twice because the screen has two of it — the earned
  // chip and the not-yet-earned placeholder — which is the dna.arch precedent.
  { path: "features/coach/CoachProfile.tsx", expr: "id", prefix: "coach.badge.", suffix: ".name" },
  { path: "features/coach/CoachProfile.tsx", expr: "id", prefix: "coach.badge.", suffix: ".name" },
  { path: "features/coach/CoachProfile.tsx", expr: "b.id", prefix: "coach.badge.", suffix: ".name" },
);

const SPACES = new Map([
  ["ach.name.|a.id", S_ACH],
  ["ach.name.|growth.next.id", S_ACH],
  ["ach.desc.|a.id", S_ACH],
  ["ach.desc.|growth.next.id", S_ACH],
  ["ach.tier.|a.tier", { name: "achievement tiers", values: ACH_TIERS }],
  ["course.|c.key", { name: "training courses", values: COURSE_KEYS }],
  ["course.|m", { name: "training courses", values: COURSE_KEYS }],
  ["injury.|injury.key", { name: "injury keys", values: INJURY_KEYS }],
  ["attr.|cat", S_CAT],
  ["attr.|c.category", S_CAT],
  ["attr.|edge.bestCategory", S_CAT],
  ["attr.|edge.worstCategory", S_CAT],
  ["compare.m.|m.key", {
    name: "comparison metrics",
    values: spaceOf("domain/compare.ts", /\{ key: "overall",[\s\S]*?\n  \];/, /\{ key: "([^"]+)",/g),
  }],
  ["det.arc.|arc.trajectory", {
    name: "career trajectories",
    // M435: read the list the type is derived from, not the type.
    values: spaceOf("domain/careerArc.ts", /export const TRAJECTORIES[^=]*=[^\]]*\]/, quoted),
  }],
  ["fav.|kind", {
    // M266: the space is now the runtime list the type derives from, not one caller's signature.
    // The anchor used to read `setFavorite: (key: "club" | …` — a hand-typed union in the store's
    // public API, so a second hand copy of the same three names could exist anywhere and this
    // check would still see a healthy three-value space. An anchor that reads a consumer cannot
    // tell a definition from a copy; this one can, and section 46 charges the copies.
    name: "favourite kinds",
    values: spaceOf("domain/types.ts", /export const FAVORITE_KINDS[^=]*=[^\]]*\]/, quoted),
  }],
  ["fw.status.|code.toLowerCase()", {
    // M256. The three statuses a fixture carries, read off the union's own runtime list in
    // domain/types.ts. Before this milestone the same prefix had THREE spaces declared against
    // three screen expressions (two of them the filter tab's, one the stored field's), which is
    // what let the fourth reading — the raw `{m.status}` in a fixture row — exist unmentioned.
    name: "the statuses a match can be in",
    values: lower(spaceOf("domain/types.ts", /export const MATCH_STATUSES[^=]*=[^\]]*\]/, quoted)),
  }],
  ["fw.type.|type", {
    name: "search result types",
    // Read the whole statement, not one spelling of it: M265 put a `readonly SearchKind[]`
    // annotation on this list, and an anchor that only matched `] as const` would have handed
    // the space zero values and reported the five heading keys as unreachable.
    values: spaceOf("features/football/FootballWorld.tsx", /const SEARCH_TYPES[^;]*;/, quoted),
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
    // M435: the board no longer spells the four codes out - it reads the domain's list - so the
    // space is read there, from the definition rather than from a copy of it.
    values: spaceOf("domain/scouting.ts", /export const SCOUT_SORTS[^=]*=[^\]]*\]/, quoted),
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
    // The catalogue's own keys, so adding a drill fails the suite until it is named
    // in all three locales rather than rendering `drill.new_drill` to a reader. The
    // catalogue itself carries no words since M236, so these keys are all it publishes.
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
  ["sim.shot.|code", {
    // M225. The engine scores a goal with one of seven shot types, and the row builder resolves
    // the code it picks through `sim.shot.…`. The value space is read off the union's runtime
    // list in domain/types.ts — the same list the engine's two weight tables are typed against —
    // so an eighth shot cannot ship with words missing in a locale, and a shot deleted from the
    // model cannot leave its rows behind as keys no site can build.
    name: "the match engine's shot types",
    values: spaceOf("domain/types.ts", /export const SHOT_TYPES[^=]*=[\s\S]*?\];/, /"([a-z_]+)"/g),
  }],
  ["cmd.group.|group", S_CMD_GROUP],
  ["ni.kind.|code.toLowerCase()", {
    // The union the module's own `NewsKind` type is written against, lower-cased by the site,
    // so a sixth article type cannot ship with its word missing in a locale.
    name: "the article types a news story claims",
    values: lower(spaceOf("domain/types.ts", /export const NEWS_KINDS[^=]*=[\s\S]*?\];/, /"([A-Za-z]+)"/g)),
  }],
  ["mgr.venue.|p.venue.toLowerCase()", {
    // The `MatchPrep.venue` union, lower-cased by the site.
    name: "the venue a fixture is played at",
    values: lower(spaceOf("domain/career.ts", /venue: [^;]+;/, quoted)),
  }],
  ["comm.feels.|code", {
    // The RECORD_FEELS union in domain/types.ts, so a fourth arm cannot ship without its word.
    // The terminator is `]` and not `];`: this list is `[...] as const`, and asking for the
    // semicolon made the non-greedy match run on to the next array in the file — which is how
    // this clause first reported seven values, four of them attribute categories.
    name: "how a record sits against its points",
    values: spaceOf("domain/types.ts", /export const RECORD_FEELS[^=]*=[^\]]*\]/, /"([a-z]+)"/g),
  }],
  ["ni.certainty.|impact.certainty", {
    // The band function's own return type: three arms, one per threshold in `bandCertainty`.
    name: "certainty bands",
    values: spaceOf("domain/newsImpact.ts", /export type Certainty = [^;]+;/, quoted),
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
// M217: the AI screen's suggested questions are keyed, and the id list is read out of the module
// that owns them (`data/ai.ts` builds the pairs), so adding a fifth chip without a fifth row in
// three locales cannot pass by nobody noticing. The same list is what 26e compares the sent text
// against — one source, two claims.
const S_SUG = {
  name: "the AI screen's suggested questions",
  values: spaceOf("data/ai.ts", /export const SUGGESTED_ASKS = \[[^\]]*\]/, /"([^"]+)"/g),
};
claimByPrefix("ai.sug.", S_SUG);
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
// M246: one space per Academy family, read out of learn.ts itself — the four category
// codes and the three level words (lower-cased by the sites that build the key from them).
const S_LEARN_CAT = {
  name: "Knowledge Academy categories",
  values: spaceOf("domain/learn.ts", /export const CATEGORY_CODES[^;]+;/, quoted),
};
claimByPrefix("learn.cat.", S_LEARN_CAT);
const S_LEARN_LEVEL = {
  name: "Knowledge Academy levels, lower-cased by the site",
  values: lower(spaceOf("domain/learn.ts", /export type Level = [^;]+;/, quoted)),
};
claimByPrefix("learn.level.", S_LEARN_LEVEL);
// M523: the badge names the coach résumé keys, read off the domain module's own id list —
// a ninth badge without a ninth row in three locales fails here by nobody noticing.
const S_COACH_BADGE = {
  name: "coach badge ids",
  values: spaceOf("domain/coachCareer.ts", /export const BADGE_IDS[^=]*=[^\]]*\]/, quoted),
};
claimByPrefix("coach.badge.", S_COACH_BADGE);
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
// M436: the goal metrics' list lives in domain/types.ts now (the type is derived from it), so the
// gate loads it from there.
const { GOAL_METRICS } = await server.ssrLoadModule("/domain/types.ts");
const { MODES } = await server.ssrLoadModule("/domain/types.ts");
const DOMAIN_SPACES = [
  {
    name: "goal metrics",
    values: GOAL_METRICS,
    prefix: "goal.unit.",
    path: "domain/goals.ts",
    compose: /`goal\.unit\.\$\{metric\}`/,
    // M436: the goal metrics' type is derived from the list, so the space the module is checked
    // against is the definition itself.
    union: ["domain/types.ts", /export const GOAL_METRICS[^=]*=[^\]]*\]/],
  },
  {
    // The three modes a remembered row can name. types.ts holds the runtime list and the type
    // is DERIVED from it (M435), so the two cannot drift apart and a stored `mode` cannot
    // silently fall back to printing its code.
    name: "modes",
    values: MODES,
    prefix: "prof.mode.",
    path: "domain/rowText.ts",
    compose: /`prof\.mode\.\$\{code\}`/,
    union: ["domain/types.ts", /export const MODES[^=]*=[^\]]*\]/],
  },
];
const claimed = new Set();
// Properly-paired key literals only. A template that interpolates (`attr.name.$
// {f.key}`) cannot match, because `$` and `{` are outside the character class and
// the group has to end at the same delimiter it started at — those sites are
// claimed through DYN_SITES instead, which is the point of check 16.
const KEY_LIKE = /(?:"([A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]+)+)"|'([A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]+)+)'|`([A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]+)+)`)/g;
// The census reads any shipped file that can NAME a key, which includes `i18n/`'s door
// files: `relativeDay` composes `time.inDays` inside i18n/format.ts, and excluding the
// whole directory — which `appSrc` above does because the dictionary itself declares every
// key there — made a key reachable only if a component spelled it out. Check 26b closes the
// same hole from the other side. `i18n/dictionaries.ts` stays out: a key's own declaration
// is not the code that reads it.
const KEY_READERS = [
  ...appSrc,
  ...files
    .filter((f) => rel(f).startsWith("i18n/") && !rel(f).endsWith("dictionaries.ts"))
    .map((f) => [rel(f), codeOf(readFileSync(f, "utf8"))]),
];
for (const [, src] of KEY_READERS) {
  for (const m of src.matchAll(STATIC)) claimed.add(m[1]);
  for (const m of src.matchAll(KEY_LIKE)) claimed.add(m[1] ?? m[2] ?? m[3]);
}
const dynKeys = new Set(DYN_SITES.flatMap((s) => (SPACES.get(`${s.prefix}|${s.expr}`)?.values ?? []).map((v) => s.prefix + v + s.suffix)));
for (const sp of DOMAIN_SPACES) for (const v of sp.values) dynKeys.add(sp.prefix + v);
const unreachable = enKeys.filter((k) => !claimed.has(k) && !dynKeys.has(k));
ok(`every dictionary key is reachable — static, quoted, or a value a dynamic site can build (${KEY_READERS.length} reader files, ${unreachable.join(", ") || "none"})`,
  unreachable.length === 0 && KEY_READERS.length > 0);
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

// The drill catalogue no longer has an English reference to hold `drill.*` against. It used
// to carry its own `label` and this clause compared the two, which is two copies of one noun
// kept in step by hand: a new drill could update the copy no screen printed, and the pair
// said nothing about the locales that actually read it. M236 deleted the field, so the
// dictionary is the only table that names a drill (proof-training pins that every key in the
// catalogue is named in all three columns). What is pinned here is that the second source
// stays deleted, with a count so a catalogue that shrank to nothing reads as a broken scan.
const drillSrc = appSrc.get("domain/training.ts") ?? "";
const drillKeys = [...drillSrc.matchAll(/\{ key: "([^"]+)", focus:/g)].map((m) => m[1]);
const drillLabelField = /,\s*label:/.test(drillSrc);
ok(`the drill catalogue names ${drillKeys.length} drills and carries no word of its own (${drillLabelField ? "a label field is back" : "no label field"})`,
  drillKeys.length >= 18 && !drillLabelField);

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
  dupCatKeys.length === 0 && dupCatSites.length === 0 && keysOf(0).length > 0);

// 21. The English name tables belong to the prose layer. A UI file that mentions
//     `attributeLabel` is composing a display string in English — the exact shape no
//     key-level check can see, and the match is on the identifier rather than on `name(`,
//     because a caller that hands it to `.map(...)` as a function reference reads zero to
//     a call-shaped regex (M147's mutation test found that: a gate that is green because
//     it cannot see anything). Imports are stripped first, because `import {
//     attributeLabel }` is a reference the interface never renders.
//     M223 emptied the declared table instead of lengthening it. Both sites built a coach
//     prompt in English — `requestPlan(`Video analysis flagged: …`)` — and because that
//     prompt is ALSO the row a reader sees on the activity timeline, "model input, so
//     English is right" was only half true: the other half was an English sentence shown
//     to a Chinese reader, frozen in whatever language the button was clicked in. The
//     prompt is a row now, its English reading is derived where model input belongs
//     (`englishRow` in data/ai.ts), and no UI file needs a name table at all.
//     Two-sided on purpose, because "0 in the UI" is also what a scan that stopped reading
//     the tree reports: a planted screen has to land in the UI list, and the identifier has
//     to be found in the prose modules the UI scope excludes.
const NAME_PROMPT_SITES = new Map(); // M223: empty, and a new entry has to be a decision to make
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
const uiNameFiles = [...appSrc.keys()].filter((p) => /^(features|ui)\//.test(p)).length;
const proseNameCallers = [...appSrc]
  .filter(([p]) => !/^(features|ui)\//.test(p))
  .filter(([, code]) => /\b(?:attributeLabel|groupLabel)\b/.test(withoutImports(code)))
  .map(([p]) => p);
// The plant: the same two predicates that read the tree, run over a screen that names the
// table on its own line. A scope that cannot see this one would report "0" for any tree.
const NAME_PLANT = ["features/plantedNames.tsx", `import { attributeLabel } from "@/domain/attributes";
export const C = () => <span>{attributeLabel("passing")}</span>;`];
const plantInScope = /^(features|ui)\//.test(NAME_PLANT[0]) && /\b(?:attributeLabel|groupLabel)\b/.test(withoutImports(NAME_PLANT[1]));
ok(`no UI file composes an English attribute name any more (${nameCalls.size} of ${uiNameFiles} UI files, declared table ${NAME_PROMPT_SITES.size}), while the ${proseNameCallers.length} prose module(s) outside that scope still reach the tables (${proseNameCallers.join(", ")}), and the planted screen is caught (${plantInScope})`,
  nameCalls.size === 0 && NAME_PROMPT_SITES.size === 0 && uiNameFiles >= 25 && proseNameCallers.length >= 1 && plantInScope);

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
  revived.length === 0 && STRUCK_ROWS.reduce((s, [, e]) => s + e.length, 0) > 0);

// 24. A key whose value interpolates is only complete once the caller supplies the
//     value: t() fills {a} from its second argument, and a call that forgets it prints
//     the brace text on the screen — in every locale, because the braces live in all
//     three. This scan used to read only the hand-rolled `.replace("{a}", …)` chains
//     and counted 21 "filled" calls; when M153 moved all of them onto t()'s own
//     variables, its non-vacuity floor went red at 0, which is how it came out that the
//     real interpolation path had never been checked at all. It now reads the call's
//     argument list, and it reports what it cannot read instead of passing it.
// M253: a literal wearing backticks is still a literal. Dashboard writes three static
// keys as t(`attr.name.…`) — the old `t("` shape never saw them, and section 37 counted
// them as templates, so a placeholder added to one would bypass every supply contract.
// Both readers now take either quote style for a STATIC key; a template that actually
// interpolates still fails the closing-quote test and stays dynamic.
const STATIC_T = /\bt\(\s*(?:"([A-Za-z0-9_.$-]+)"|`([A-Za-z0-9_.$-]+)`)/g;
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

// M262's population pin lives here, next to the loop it measures (the clause itself sits
// with the other check-24 verdicts below): every module walked, and the outside sites seen.
const FILL_OUTSIDE = ["components/ui/dialog.tsx", "components/ui/sheet.tsx", "src/App.tsx"];
const fillFiles = new Set();
let fillOutsideSites = 0;
for (const [path, code] of appSrc) {
  fillFiles.add(path);
  for (const m of code.matchAll(STATIC_T)) {
    if (FILL_OUTSIDE.includes(path)) fillOutsideSites++;
    const key = m[1] ?? m[2];
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
// M262: the five-directory walk is over. Check 24's fill scan used to skip everything
// outside features|ui|store|domain|lib — components/ui and src/App.tsx held five literal
// sites no fill contract ever read (six before M415 folded DialogFooter's close label;
// varless as measured since M252, which is why the numbers below do not move: a varless
// site is skipped before its arguments are parsed).
// Section 37 covered the whole tree with its own supply contract instead of touching this
// loop; this milestone removes the filter at the source and pins the population — every
// app module walked, the three outside files named, their five sites seen by the regex —
// so a reintroduced filter reddens here rather than silently narrowing the scan. The two
// supply implementations stay: different parsers, same contract, each blind to the
// other's bugs by construction.
ok(`check 24's fill scan walks the whole tree, not five directories (${fillFiles.size} modules walked; outside the old walk: ${FILL_OUTSIDE.filter((f) => fillFiles.has(f)).join(", ") || "none"}; outside sites seen: ${fillOutsideSites})`,
  fillFiles.size === APP_SRC_PIN && FILL_OUTSIDE.every((f) => fillFiles.has(f)) && fillOutsideSites === 5);

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
// M236: a session's title became a row, which put six more reads in reach of the same hole.
// The receivers are named rather than the property, because `.title` alone is not evidence:
// `th.title` is a thread's own words and `l.title` a lesson's, and neither is a row. So the
// session bindings were renamed to `sess` at the three sites that print one, and the
// distinguishable receivers are listed here. A new bare `.title` read on one of these names
// is a failure; a new receiver name means adding it here on purpose, which is the same price
// check 28 has always charged.
const KEYED_ROW_READS = [/\bzone\.label\b/, /\bhonour\.label\b/, /\bm\.text\b/, /\bg\.title\b/, /\brow\.title\b/,
  /\bsess\.title\b/, /\bsession\.title\b/, /\bnextSession\.title\b/, /\bnext\.title\b/, /\bgrowth\.last\.title\b/];
const unresolvedRows = [];
let keyedRowReads = 0;
// A row may legitimately be spent in exactly two ways: resolved to words by `rowLine`, or
// FORWARDED into another row. The coach's remembered line nests the session's own title
// (M236), so `trainingMemory(session.title, …)` stores the row rather than wording it — and
// wording it there is precisely the defect: the memory is persisted, so resolving at write
// time would freeze the line in the language the session was completed in. The forwarding
// doors are named here rather than the check being loosened, and proof-timeline reads the
// nesting back through `rowLine` to prove it resolves.
const ROW_READ = /(?:rowLine|trainingMemory)\([^)]{0,16}$/;
for (const [p, body] of appSrc) {
  if (!p.endsWith(".tsx")) continue;
  for (const re of KEYED_ROW_READS) {
    for (const hit of body.matchAll(new RegExp(re.source, "g"))) {
      keyedRowReads++;
      const before = body.slice(Math.max(0, hit.index - 24), hit.index);
      // rowLine(s.honour.label, t) -- the receiver sits between the call and the
      // property, so the test is "rowLine( opened within the last few characters".
      if (!ROW_READ.test(before)) unresolvedRows.push(p + ": " + hit[0]);
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
  // M221. The same copy through a method receiver: `toast.success("…")` was outside the
  // shape the rule matched, and planting it here is what makes that hole a red check
  // rather than a note. It has to be a *literal* argument, and it sits after a keyed one
  // so the exemption's own case is still exercised beside it.
  `  toast.success("Planted method toast");`,
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
  planted.length === 6 && planted.filter((h) => h.kind === "call").length === 3 &&
    planted.every((h) => h.text.startsWith("Planted")));
ok(`a hole containing a JSX-text apostrophe closes on its own line, not on the next declaration (${planted.filter((h) => /PlantedTail/.test(h.text)).length} swallowed)`,
  !planted.some((h) => /PlantedTail/.test(h.text)));
const plantedLookups = lookupsIn(RAW_FIXTURE);
ok(`the fixture's t() lookups are read as lookups, not as interface copy (${plantedLookups.join(", ")})`,
  plantedLookups.length === 6 && planted.every((h) => !plantedLookups.includes(h.text)));

// M224. The scan classified an attribute's literals by the attribute's NAME, which is right for
// `title="…"` and wrong for a prop whose value is a function: the component calls it, and the
// string it returns is what the reader sees. `format` was not on the display list, so the Manager
// OS's three sliders and its match-prep facts printed "Low" / "Deep block" / "Park the bus" to a
// 简体中文 reader while this suite reported the file clean — the copy was found, filed under a
// name the scan did not recognise, and dropped into a set nothing read. The fixture below is the
// rule in both directions: a formatter's words are copy, the keyed formatter beside it is a
// lookup, and the two event handlers — one carrying a route, one carrying a sentence — stay out,
// because `on…` is how JSX spells "called for what the reader did" rather than "printed for the
// reader to read".
const FN_FIXTURE = [
  `export function Fn() {`,
  `  const { t } = useI18n();`,
  `  return (`,
  `    <div>`,
  `      <Slider format={(v) => (v < 0.35 ? "Planted deep block" : "Planted high press")} />`,
  `      <Slider format={(v) => (v < 0.35 ? t("sim.low") : t("sim.highPress"))} />`,
  `      <button onClick={() => open("/planted/route")}>x</button>`,
  `      <input onChange={(e) => setNote(e.target.value + " Planted handler text")} />`,
  `    </div>`,
  `  );`,
  `}`,
].join("\n");
const fnPlanted = scanSource(FN_FIXTURE).hits;
ok(`a function-valued prop is a display position: the words it returns are copy (${fnPlanted.map((h) => h.kind).join(", ") || "nothing"})`,
  fnPlanted.length === 2 && fnPlanted.every((h) => h.kind === "fn:format" && h.text.startsWith("Planted")));
ok(`…and the shapes that are not copy stay out of it: the keyed formatter and the two event handlers (${fnPlanted.filter((h) => /route|handler|sim\./.test(h.text)).length} reported)`,
  !fnPlanted.some((h) => /route|handler|sim\./.test(h.text)));
// The live half, read off the app rather than the fixture: how many function-valued props the
// scan walks, how many of those are not handlers, and how many carry copy. A rule that only ever
// met its own fixture could agree with itself, so the first number is the floor that keeps the
// last one meaningful — `0 of 0` is the "nobody looked" this file keeps refusing.
const fnWalk = [...appSrc].map(([p, code]) => {
  const r = scanSource(code);
  return [p, r.fnProps ?? [], r.hits.filter((h) => h.kind.startsWith("fn:"))];
});
const fnTotal = fnWalk.reduce((n, [, props]) => n + props.length, 0);
const fnOffHandler = fnWalk.reduce((n, [, props]) => n + props.filter((name) => !/^on[A-Z]/.test(name)).length, 0);
const fnDebt = fnWalk.flatMap(([p, , hits]) => hits.map((h) => `${p} (${h.kind}: ${h.text.slice(0, 24)})`));
ok(`no function-valued prop outside the event-handler shape carries prose (${fnDebt.length ? fnDebt.join(", ") : "none"}) — the walk read ${fnTotal} function-valued props, ${fnOffHandler} of them not handlers`,
  fnDebt.length === 0 && fnTotal >= 50 && fnOffHandler > 0);

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
// M221 — the call rule's receiver shape, read out of the scanner's source the way the table
// above is, and then *executed* against probes. What is worth protecting is behaviour, not
// text: a method receiver counts, a bare call counts, and an identifier that merely ends in
// "toast" must not — otherwise widening to `.\w+` swallows `mytoast(` silently and the only
// sign would be a count that went up for no reason.
const callBody = (scanSrc.match(/const CALL_NAME = \/([^\/\n]+)\/g/) ?? [])[1] ?? "";
const callProbes = [
  ['toast("Signed")', true],
  ['toast.success("Won 2–1 vs Arsenal")', true],
  ['toast.error(t("common.buildError"))', true],
  ['alert("Blocked")', true],
  ['window.alert("Blocked")', true],
  ['mytoast("not a toast call")', false],
  ['toaster("not a toast call")', false],
];
const CALL_PROBE = callBody ? new RegExp(callBody) : null;
const callBad = CALL_PROBE
  ? callProbes.filter(([src, want]) => CALL_PROBE.test(src) !== want).map(([src]) => src)
  : ["CALL_NAME not read"];
ok(`the call rule reads a method receiver as well as a bare call, and nothing that merely ends in "toast" (${callBody} · ${callBad.join(" | ") || `${callProbes.length} probes as predicted`})`,
  Boolean(CALL_PROBE) && callBad.length === 0 && callProbes.length > 0);

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
  // M220. The last of the three screens M176 named: 46 counted hits, and every one of
  // them now reads the dictionary — including the four slider labels, the scale words a
  // slider prints, and the season table's headers (which join the Data Room's rather
  // than gaining a second set of abbreviations). Registration is what turns "this screen
  // is localised" into a held property: an English literal added here names the file.
  "features/sim/SimulationLab.tsx",
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
  // English out loud. They were registered as a group because they are one audience — a
  // screen reader, on every route, whatever the page itself does. 21 counted literals, 17
  // distinct words, 16 new keys ("Loading" was already in the dictionary). M248 deletes six
  // of those eight files: nothing a visitor can reach imports pagination, sidebar,
  // breadcrumb, carousel, message-scroller or spinner, so their copy left with them. What is
  // named here is the chrome that still renders — dialog and sheet, the last two readers of
  // `ui.close`, which is now the only `ui.*` key in the dictionaries.
  "components/ui/dialog.tsx",
  "components/ui/sheet.tsx",
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
  // in STAGES, words in `film.stage.*`, gated by check 17), the four toasts — whose
  // `toast.success(` receiver the rule could not match until M221 widened it, and
  // the fixture now plants — and the two ErrorState messages, whose words the Player
  // OS still prints raw.
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
// 0 as of M220: the Simulation Lab's 46 left the open count when it was registered in
// RAW_COVERED above, so the number this gate guards is no longer an allowance with a
// trend behind it — it is the absence of debt. The scan is still policed: the planted
// fixture above has to report its five hits in five positions, the caption planted in
// every .tsx file still has to come back, and the skip list below audits itself. A literal
// added to any file named above now fails the covered-set clause instead of moving this.
const RAW_UI_CEILING = 0;
const tsxSrc = [...appSrc].filter(([p]) => p.endsWith(".tsx"));
// M247: the file-count floor was an anti-vacuity guard for a scan that now
// proves its own coverage with planted captions; replace it with a pin so the
// scan cannot quietly shrink. TSX_PIN itself is now a literal (see the population
// pins beside `appSrc`) — as `tsxSrc.length` it was the tautology this file bans.
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
ok(`the skip-list audit read ${specSeen} import specifiers over ${appSrc.size} files (population pin ${APP_SRC_PIN}) and ${reaching.length} of them reaches a skipped directory (${audit})`,
  reaching.length === 0 && appSrc.size === APP_SRC_PIN && specSeen > appSrc.size * 2);
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
  BAL_FIELDS.join(",") === "elem,depth,inTag,tick");
// Four planted refusals, each breaking exactly one thread and no other, are measured in the
// *same* filter as the population. Without them a weakened filter — one left checking only
// `elem`, say — would report a clean census forever, because the population is clean. With
// them, the filter has to flag exactly four offenders to be green, and every real file that
// loses its thread pushes the count above that.
const BAL_REFUSALS = [
  ["planted unclosed element", ["export const X = () => (", "  <div>", '    {"kept"}', ");", ""].join("\n"), "elem"],
  ["planted bracket open at EOF", ["export const X = () => {", "  const y = [", "    <div>{'kept'}</div>", "  ;", "};", ""].join("\n"), "depth"],
  ["planted unclosed attribute", ['export const Card = () => (', '  <div title="unterminated', ");", ""].join("\n"), "inTag"],
  ["planted runaway template", ["const s = `unterminated template literal", ""].join("\n"), "tick"],
].map(([name, src, field]) => [name, field, sourceBalance(src)]);
const offenders = [...[...appSrc].map(([p, src]) => [p, sourceBalance(src)]), ...BAL_REFUSALS.map(([name, , b]) => [name, b])]
  .filter(([, b]) => BAL_FIELDS.some((k) => b[k]));
ok(`the walker kept its thread to the end of all ${appSrc.size} measured files (population pin ${APP_SRC_PIN}), and its filter flags exactly the ${BAL_REFUSALS.length} planted refusals and nothing else (${offenders.length}: ${offenders.map(([p, b]) => `${p} ${BAL_FIELDS.filter((k) => b[k]).join("+")}`).join(", ") || "none"})`,
  offenders.length === BAL_REFUSALS.length &&
  BAL_REFUSALS.every(([name, field, b]) => BAL_FIELDS.filter((k) => b[k]).join(",") === field) &&
  appSrc.size === APP_SRC_PIN);
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
// Two selectors over the same walk — `appSrc` minus the non-.tsx, versus `files` filtered on
// .tsx-and-not-i18n — have to name the same 49 paths. That equality is not a tautology: each
// side is derived by a different predicate, so a selector that starts skipping a directory
// shows up here before it shows up anywhere the debt counts are read.
const tsxSelectorsAgree = tsxFiles.map(rel).sort().join(",") === tsxSrc.map(([p]) => p).sort().join(",");
const blind = tsxFiles
  .map((f) => [rel(f), midBlind(readFileSync(f, "utf8").replace(/\r\n/g, "\n").split("\n"))])
  .filter(([, b]) => b)
  .map(([p]) => p);
ok(`a caption planted at the midpoint of every one of the ${tsxFiles.length} .tsx files (pin ${TSX_PIN}, and the two selectors agree: ${tsxSelectorsAgree}) comes back in full (blind: ${blind.join(", ") || "none"}), while the file planted blind here is reported blind (${midBlind(MID_CONTROL)})`,
  blind.length === 0 && midBlind(MID_CONTROL) && tsxFiles.length === TSX_PIN && tsxSelectorsAgree);
// The midpoint probe above plants at a line boundary, which is exactly where the walker's own
// threads live: if the first half of a file ends inside a construct the walker tracks, the
// plant lands inside it too, and a swallowed caption would be the probe's fault, not the
// tree's. Not every open thread can swallow a plant, though, and the difference is what
// makes this gate honest. An unclosed template literal skips the walker to end-of-source,
// so a caption planted after it is never read; a block comment still open at the boundary
// is erased whole by `normalize`, so a caption inside it never existed. Both hide the plant
// and blame the tree for the probe's blindness, so both must be zero at every real
// midpoint. The rest cannot hide it: an open element, bracket depth and an unterminated
// attribute list all re-enter on the plant's own `<div`, bending what is read without
// hiding that something was — those are merely reported, never fatal. The comment arm is
// measured by a vanish test that appends a marker on a *fresh line*, where the probe
// actually lands: if `normalize` reads that marker line exactly as it reads an empty one
// (both ends trimmed — a stripped comment keeps its newlines while its words turn into
// same-length spaces), the marker was swallowed; a line comment cannot manage it, for it
// dies at its own newline, so a marker on the next line survives.
// Three witnesses pin the reader: the control's own runaway template names `tick`, a
// planted spanning comment names `comment` by vanishing, and a closed comment names nothing.
const midPrefix = (f) => {
  const lines = readFileSync(f, "utf8").replace(/\r\n/g, "\n").split("\n");
  return lines.slice(0, Math.floor(lines.length / 2)).join("\n");
};
const midThreads = (prefix) => {
  const open = BAL_FIELDS.filter((k) => sourceBalance(prefix)[k]);
  if (normalize(prefix + "\n").trimEnd() === normalize(prefix + "\nM306X").trimEnd()) open.push("comment");
  return open;
};
const midCompromised = tsxFiles
  .map((f) => [rel(f), midThreads(midPrefix(f))])
  .filter(([, open]) => open.includes("tick") || open.includes("comment"))
  .map(([p, open]) => `${p} ${open.join("+")}`);
const midThreaded = tsxFiles.filter((f) => BAL_FIELDS.some((k) => sourceBalance(midPrefix(f))[k])).length;
const controlThreads = midThreads(MID_CONTROL.slice(0, 2).join("\n"));
const commentPlant = midThreads("const a = 1;\n/* a comment\nthat spans the midpoint");
const commentClean = midThreads("const a = 1;\n/* a comment */\nconst b = 2;");
ok(`the midpoint every caption is planted at opens no thread that swallows it (compromised: ${midCompromised.join(", ") || "none"}; other walker threads open at midpoints: ${midThreaded} of ${tsxFiles.length}), and the reader names the control's own runaway template (${controlThreads.join("+") || "NAMED NOTHING"}) and a planted spanning comment (${commentPlant.join(",") || "NAMED NOTHING"}) while a closed one reads clean (${commentClean.join(",") || "clean"})`,
  midCompromised.length === 0 && controlThreads.includes("tick") && commentPlant.join(",") === "comment" && commentClean.length === 0);

// M213 dropped its two probe-choice arms because on a healthy tree neither relaxation is
// catchable — measured `MISSED m213h` and `MISSED m213i` — and recorded the pair as a joint
// property instead of claiming it quietly. What a healthy tree cannot show, a fixture can:
// this one is broken in its interior and recovers before the end, which is exactly the shape
// the position choice exists for. At the midpoint the plant lands inside the runaway template
// and the walk ends before it (0 hits — the standing demand calls that blind); at end-of-file
// the same broken tree reads the plant in full (2 hits — no demand can call that blind, so
// end-of-file is where interior breakage goes to hide). The healthy fixture reads 2 at both
// positions, so the teeth cost nothing on a tree that is not broken. The demand choice has no
// reproducible shape of its own in a minimal fixture — an unterminated attribute or an open
// element self-heals and the plant reads 2 or 4 (measured), so any-half and both-halves agree
// on every shape a fixture can carry; the demand stays both-halves because it is free.
const midCount = (L, at) =>
  scanSource([...L.slice(0, at), "  " + MID_PROBE, ...L.slice(at)].join("\n")).hits
    .filter((h) => /Probe untranslated/.test(String(h.text))).length;
const MID_RECOVER = [
  "export const Broken = () => {",
  "  const css = `@media print {",
  "    color: red;",
  "  }`;",
  "  return <div>ok</div>;",
  "};",
  "",
];
const MID_HEALTHY = ["export const Ok = () => (", "  <div>fine</div>", ");", ""];
const recMid = midCount(MID_RECOVER, Math.floor(MID_RECOVER.length / 2));
const recEof = midCount(MID_RECOVER, MID_RECOVER.length);
const okMid = midCount(MID_HEALTHY, Math.floor(MID_HEALTHY.length / 2));
const okEof = midCount(MID_HEALTHY, MID_HEALTHY.length);
ok(`the probe's position choice is load-bearing against the shape that exists for it: a fixture broken in its interior and recovered by its end reads ${recMid} at the midpoint (blind under the standing demand) and ${recEof} at end-of-file, where no demand can call it blind, while the healthy fixture reads ${okMid} and ${okEof} at the same two positions (the runaway control above reads 0 under the same arithmetic)`,
  recMid === 0 && recEof === 2 && okMid === 2 && okEof === 2);

// The charge left after the probe's choices: `sourceBalance` reads only where the walk ended,
// so a wrongness that heals before EOF is invisible to it — the one shape that opens mid-file
// and heals without any balance change is an unterminated attribute (its quote bails at the
// newline, `inTag` stays set, and the next `>` closes it as if nothing had happened). On that
// shape the walker must resume true regions: the healed fragment is charged exactly once, as
// the attribute it opened, and the caption standing after the heal reads exactly once per half
// — the same two hits the clean fixture gives. A scanner that stayed lost past the heal would
// swallow the caption (fewer) or rebuild its regions (more); both redden here. The swallowed
// span itself charges nothing — a caption inside the recover fixture's open template reads 0,
// because string content is not code — and that boundary, not a vague fear of mid-file
// wrongness, is what the interior-of-a-file charge resolves to.
const MID_HEALED = ["export const Card = () => (", '  <div title="unterminated', "  " + MID_PROBE, ");", ""];
const healedScan = scanSource(MID_HEALED.join("\n")).hits;
const healAttr = healedScan.filter((h) => h.kind === "attr:title" && /unterminate/.test(String(h.text))).length;
const healHits = healedScan.filter((h) => /Probe untranslated/.test(String(h.text))).length;
ok(`a wrongness that heals before the walk ends leaves true regions behind it: on the unterminated-attribute fixture the healed fragment charges itself exactly once (${healAttr}, as the attribute it opened) and the caption after the heal reads ${healHits} — the two hits the clean fixture reads — while a caption inside the open template above reads 0, because string content is not code`,
  healAttr === 1 && healHits === 2);
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
// M220 retires this check under the rule the paragraph above states: registering the
// Simulation Lab took `openRows` and `openKinds` to 0, and both conjuncts are floors on
// the very quantity the arc removes — `tsxSrc.length >= 60` is still true and holds no
// claim about debt, `openKinds.size >= 6` can only be made true again by reintroducing
// debt. What each conjunct was actually standing for is now measured where it cannot be
// satisfied by debt: the tree walk by the planted-caption clause above (a caption in the
// midpoint of every .tsx file has to come back in full), and the classification by the
// raw-UI fixture (five planted hits, five positions, two of them call arguments). The
// gate that used to say "this scan still sees something" now says "this scan still sees
// the fixture", and the covered set says the real tree is clean.
const openKinds = new Set(openRows.flatMap(([, h]) => h.map((x) => x.kind)));
ok(`the debt scan still walks the whole tree and reports what it finds in it (${tsxSrc.length} .tsx files against pin ${TSX_PIN}, ${openRows.length} in debt, ${openKinds.size} distinct positions: ${[...openKinds].sort().join(", ") || "none"})`,
  tsxSrc.length === TSX_PIN);

// The exemption's own audit: a literal the scan chose not to report because it
// looks like a t() lookup has to be one. This is the check that would have caught
// the four keys M148 deleted out from under their callers.
const allLookups = tsxSrc.flatMap(([p, src]) => lookupsIn(src).map((k) => [p, k]));
const enSet = new Set(enKeys);
const badLookups = allLookups.filter(([, k]) => !enSet.has(k));
ok(`every literal the raw-UI exemption treats as a t() lookup is a real key (${allLookups.length} lookups, ${[...new Set(badLookups.map(([p, k]) => `${p}: ${k}`))].slice(0, 8).join(", ") || "no unknown"})`,
  badLookups.length === 0 && allLookups.length > 0);
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
// M436: the age bands' type is DERIVED from the list, so the two cannot drift — and the check
// that says so reads the derivation itself, because a hand-typed union is the one thing that
// could drift again.
const AGE_DERIVED = /export type AgeGroupWord = \(typeof AGE_GROUP_WORDS\)\[number\];/.test(appSrc.get("domain/types.ts") ?? "");
ok(`onb.age.… · the age bands' type is derived from the list, so the two cannot carry different words (${ONB_AGE_WORDS.join(", ")})`,
  ONB_AGE_WORDS.length === 4 && AGE_DERIVED);

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
// A row's key names a sentence in the dictionary, and EVERY key in this dictionary is
// namespaced — measured, not assumed: the assertion below fails the moment a dotless key is
// added, because then this discriminator would start hiding real rows. The dot is what
// separates a row literal from the record tables a module also holds. M236 put
// `domain/training.ts` into ROW_FILES for the first time (its session title became a row),
// and that file also carries the drill catalogue — eighteen `{ key: "rondo", focus: … }`
// entries (they lost their `label` in this same milestone) and the attribute tables next
// door. Without the dot, all of them read as rows whose keys are missing from the
// dictionary. Checked both ways before it was relied on (dev/.m236-probe.mjs): 1794 en keys,
// 0 dotless; 342 row-shaped literals app-wide, 66 with undotted keys, 0 of them a dictionary key.
const ROW_LITERAL = /\{\s*key:\s*"([^"]*\.[^"]*)"/g;
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
    const key = m[1] ?? m[2];
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
  badRows.length === 0 && rowKeys > 0);
// The dot rule above is a discriminator, so it has to be pinned rather than trusted: if the
// dictionary ever gains a dotless key, `ROW_LITERAL` would stop seeing rows that use it and
// this file would go quiet for the wrong reason.
const dotlessKeys = Object.keys(en).filter((k) => !k.includes("."));
ok(`every dictionary key is namespaced, which is what lets a row literal be told from a record table (${dotlessKeys.length} dotless of ${Object.keys(en).length}${dotlessKeys.length ? ": " + dotlessKeys.slice(0, 4).join(", ") : ""})`,
  dotlessKeys.length === 0);
ok(`the row-text scan is reading modules that actually carry the union (${ROW_FILES.length} files, ${rowKeys} keys)`,
  // 5 files / 15 keys as of M152: history.ts's 9 timeline rows, goals.ts's 3 title
  // rows, rowText.ts and types.ts as the two modules that name the union. A row built
  // as a bare string in a table escapes this pattern — that is how 2 of the 12 first
  // went unnoticed — so the floor is the measured count, never a round number.
  ROW_FILES.length >= 5 && rowKeys >= 15);

// 26b. A helper that measures an instant against now must hand back a row, not a sentence
//      it typed itself. Both audits above have a hole this class falls straight through: the
//      row audit reads only a module that mentions `RowText`, and the raw-UI scan reads only
//      positions inside JSX. So `function relTime(locale, iso): string`, printed from two
//      places on the dashboard, was invisible to every gate in this file — and it carried two
//      defects no gate could have reported. Both were measured at M214 by slicing the shipped
//      function out of its file and calling it (dev/m214-rel.mjs): a past instant kept its
//      minus sign, so the growth card and every finished fixture read `-2d ago` / `-30d ago`,
//      and both day branches spoke English to a reader in either Chinese locale while the
//      clock branch on the very next line followed the locale (`22:24` vs `下午10:24`).
//      The population is derived from the arithmetic, not from a name list someone has to
//      keep current: any site that subtracts `Date.now()` from a parsed instant. It is read
//      over every walked file INCLUDING `i18n/`, which `appSrc` above deliberately drops —
//      the door this clause exists to police lives there, and a population that skipped its
//      own subject would report a clean census for the wrong reason.
// The enclosing declaration is found by walking back to the nearest top-level `function`.
// A multi-line signature is not resolved here: it comes back unattributed and is counted as
// an offender, which is the loud direction, so this cannot silently approve a site it failed
// to place.
function rowTypedAt(src, at) {
  const lines = src.slice(0, at).split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = /^(?:export )?function (\w+)\(/.exec(lines[i]);
    if (!m) continue;
    return { name: m[1], row: /:\s*RowText\s*\{?\s*$/.test(lines[i]) };
  }
  return { name: null, row: false };
}
const allSrc = files.map((f) => [rel(f), codeOf(readFileSync(f, "utf8"))]);
// M247: same anti-vacuity rationale — a pin so deleting the budget pile
// moves the number instead of tripping a floor. SRC_PIN is a literal now (see the
// population pins beside `appSrc`): as written here it was `X === X`.
// M218: the population is no longer one literal pattern, because two shapes dodge it — the
// arithmetic reaches `Date.now()` through a call wrapper (M216's door, which the widened pattern
// caught) or it reaches a *hoisted* `now` (`const now = Date.now()` in the same file, subtracted
// from a parsed instant, which nothing caught). Candidates are therefore built from what each file
// declares: every name bound to `Date.now()` becomes a receiver beside the literal itself. M293
// adds the binding shape its door now ships — a parameter default (`now = Date.now()`), which is
// the same hoist wearing a signature. Building
// a RegExp out of a string is where escapes go missing, so the receivers are reported in the plant
// verdicts and every plant demands exactly one candidate — a pattern that matches nothing cannot
// hide behind an agreeable empty census.
// M303 adds the shape both operand orders still miss: the subtraction *inside* the constructor
// (`new Date(Date.now() - 86400000)`), the same arithmetic one brace to the left. The tree carried
// two such sites - the streak's `yesterday` and the board's seed `ago` - and the census could not
// see either, which the M303 probe measured as 2 operand-shaped candidates beside 2 invisible
// wrapped ones. The wrapped content is bounded to one statement and one paren depth beyond the
// receiver's own call (`[^;()\n]*`), the depth the live shapes actually wear.
// M384 note: the instant is matched in both spellings the tree uses — the `new Date(…)` constructor and
// the epochMs door. CommunityHub's timeAgo moved from `Date.now() - new Date(iso).getTime()` to
// `Date.now() - epochMs(iso)` in M384; charging only the constructor form would drop it out of the
// population and the row-typed floor below would read one candidate instead of two (the M309 lesson).
const REL_INSTANT = "(?:new Date\\([^)]*\\)|epochMs\\([^)]*\\))";
const aliasNames = (code) => [
  ...[...code.matchAll(/(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*Date\.now\(\)/g)].map((m) => m[1]),
  ...[...code.matchAll(/([A-Za-z_$][\w$]*)\s*\??:\s*[^=,)]*=\s*Date\.now\(\)/g)].map((m) => m[1]),
];
function relCandidates(code) {
  const receivers = ["Date\\.now\\(\\)", ...aliasNames(code).map((a) => a.replace(/\$/g, "\\$"))];
  const out = [];
  for (const r of receivers) {
    for (const pat of [
      `${REL_INSTANT}[^;\\n]*?\\s*-\\s*[^;\\n]*?${r}`,
      `${r}[^;\\n]*?\\s*-\\s*[^;\\n]*?${REL_INSTANT}`,
      `new Date\\([^;()\\n]*${r}[^;()\\n]*-\\s*[^;()\\n]*\\)`,
      `new Date\\([^;()\\n]*-\\s*[^;()\\n]*${r}[^;()\\n]*\\)`,
    ]) {
      const re = new RegExp(pat, "g");
      let m;
      while ((m = re.exec(code))) {
        out.push({ at: m.index, len: m[0].length, via: m[0].includes("Date.now()") ? "Date.now()" : r });
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    }
  }
  // The same subtraction is found by more than one (receiver, order) pair — `Date.now() - new
  // Date(x).getTime()` matches in both directions — so overlapping hits are one site, not two,
  // and the census counts sites a reader could be shown rather than patterns that fired.
  const kept = [];
  for (const c of out.sort((a, b) => a.at - b.at || b.len - a.len)) {
    const last = kept[kept.length - 1];
    if (last && c.at < last.at + last.len) continue;
    kept.push(c);
  }
  return kept;
}
// A candidate is charged only if its value is *produced for display*. The mechanical form of that
// question is what follows the subtraction: `) < 2 * 86400000` is a selection — a predicate about a
// window, a number nobody reads — while `;` followed by a returned template is a sentence. Anything
// the classifier cannot place is charged (loud), never skipped: an unresolved site is a hole, and a
// gate that treats its own blindness as compliance is the failure this file keeps re-finding.
const REL_SELECTION = /^\s*\)?\s*(?:===|!==|<=|>=|<|>)/;
function classifyRel(code, at, len) {
  const decl = rowTypedAt(code, at);
  const kind = REL_SELECTION.test(code.slice(at + len, at + len + 24)) ? "selection"
    : decl.row ? "row" : decl.name ? "sentence" : "unattributed";
  return { kind, name: decl.name };
}
const relCensus = allSrc.map(([p, code]) => {
  const cs = relCandidates(code);
  return [p, cs.map((c) => ({ ...classifyRel(code, c.at, c.len), via: c.via }))];
});
const relFiles = relCensus.filter(([, cs]) => cs.length > 0).map(([p]) => p);
const relOf = (kind) => relCensus.flatMap(([p, cs]) => cs.filter((c) => c.kind === kind).map((c) => `${p} ${c.name ?? "UNATTRIBUTED"}${c.via === "Date.now()" ? "" : ` via ${c.via}`}`));
// Which buckets are charged is a rule of its own, and the plants state their expectation
// independently of it. If the verdict derived "charged" from the same list the census uses, an arm
// that stopped charging the sentence bucket would change both sides of the comparison and survive —
// the two-sides-written-by-the-gate failure this repo keeps meeting.
const REL_CHARGED_KINDS = ["sentence", "unattributed"];
const REL_PLANT_CHARGED = { sentence: true, unattributed: true, row: false, selection: false };
const relCharged = relCensus.flatMap(([p, cs]) => cs.filter((c) => REL_CHARGED_KINDS.includes(c.kind)).map((c) => `${p} ${c.name ?? "UNATTRIBUTED"}`));
const relSelection = relOf("selection");
const relRows = relOf("row");
// Plants, one per way the classification can be wrong, each declaring the bucket its own text
// should land in. The last two are M218's point: an aliased `now` in a string-returning helper must
// be charged, and the same aliased arithmetic inside a `.filter()` comparison must not be.
const REL_PLANTS = [
  ["planted string-returning relative helper", "function plantedRel(iso: string): string {\n  const ms = Date.now() - new Date(iso).getTime();\n  return `${Math.round(ms / 86400000)}d ago`;\n}\n", "sentence"],
  ["planted row-returning relative helper", "function plantedRow(iso: string): RowText {\n  const ms = Date.now() - new Date(iso).getTime();\n  return { key: \"time.agoDay\", vars: { n: Math.round(ms / 86400000) } };\n}\n", "row"],
  ["planted relative math outside any declaration", "const __ms = Date.now() - new Date(\"2026-01-01\").getTime();\nexport const __n = Math.round(__ms / 86400000);\n", "unattributed"],
  ["planted wrapped arithmetic in a string-returning helper", "function plantedWrapped(iso: string): string {\n  const ms = __mid(new Date(iso)) - __mid(Date.now());\n  return `${Math.round(ms / 86400000)}d ago`;\n}\n", "sentence"],
  ["planted wrapped arithmetic in a row-returning helper", "function plantedWrappedRow(iso: string): RowText {\n  const ms = __mid(new Date(iso)) - __mid(Date.now());\n  return { key: \"time.agoDay\", vars: { n: Math.round(ms / 86400000) } };\n}\n", "row"],
  ["planted aliased now in a string-returning helper", "function plantedAlias(iso: string): string {\n  const __now = Date.now();\n  const ms = __now - new Date(iso).getTime();\n  return `${Math.round(ms / 86400000)}d ago`;\n}\n", "sentence"],
  ["planted aliased now feeding only a comparison", "function plantedFilter(isos: string[]) {\n  const __now = Date.now();\n  return isos.filter((s) => Math.abs(new Date(s).getTime() - __now) < 2 * 86400000);\n}\n", "selection"],
  ["planted parameter-default now in a row-returning helper", "function plantedParamNow(iso: string, now: Date = Date.now()): RowText {\n  const ms = now - new Date(iso).getTime();\n  return { key: \"time.agoDay\", vars: { n: Math.round(ms / 86400000) } };\n}\n", "row"],
  ["planted wrapped instant in a string-returning helper", "function plantedWrappedInstant(): string {\n  return new Date(Date.now() - 3 * 86400000).toISOString();\n}\n", "sentence"],
  ["planted wrapped alias feeding only a comparison", "function plantedWrappedSelection(items: string[]) {\n  const __w = Date.now();\n  return items.filter((s) => new Date(__w - 604800000) < new Date(s.at));\n}\n", "selection"],
];
const plantVerdicts = REL_PLANTS.map(([name, src, want]) => {
  const cs = relCandidates(src);
  if (cs.length !== 1) return [name, `${cs.length} candidates found, wanted exactly 1`];
  const got = classifyRel(src, cs[0].at, cs[0].len);
  if (got.kind !== want) return [name, `classified ${got.kind} (${got.name ?? "UNATTRIBUTED"}), wanted ${want}`];
  const charged = REL_CHARGED_KINDS.includes(got.kind);
  if (charged !== REL_PLANT_CHARGED[want]) return [name, `${want} charged=${charged}, the plant table says ${REL_PLANT_CHARGED[want]}`];
  return null;
}).filter(Boolean);
const plantKinds = [...new Set(REL_PLANTS.map(([, , want]) => want))];
const kindHoles = Object.keys(REL_PLANT_CHARGED).filter((k) => !plantKinds.includes(k));
ok(`the planted relative-time shapes are bucketed exactly as declared and each bucket says whether it is charged (${REL_PLANTS.length} plants over ${plantKinds.length} buckets, ${plantVerdicts.length ? plantVerdicts.map((b) => b).join(" | ") : "all as predicted"}; untested buckets: ${kindHoles.join(", ") || "none"})`,
  plantVerdicts.length === 0 && kindHoles.length === 0 && plantKinds.length === 4);
ok(`every relative measurement either hands back a row or is provably not shown to anyone (${relCensus.reduce((s, [, cs]) => s + cs.length, 0)} candidates in ${relFiles.length} files — row-typed ${relRows.length} [${relRows.join(", ") || "NONE"}], selection-only ${relSelection.length} [${relSelection.join(", ") || "none"}], charged ${relCharged.join(", ") || "none"}; the door is inside the population: ${relFiles.some((p) => p.startsWith("i18n/")) ? "yes" : "NO"})`,
  relCharged.length === 0 && relRows.length >= 2 && allSrc.length > appSrc.size && relFiles.some((p) => p.startsWith("i18n/")));

// 26c. The same claim from the other end: what the door actually prints. Loaded through the
//      suite's own vite server so this reads the shipped module, not a transcription, and run
//      through the app's real `translate` so the variables are filled by the interpolator
//      every screen uses. The contrast arm is the expression the dashboard shipped until
//      M214, kept here because "no minus sign" is only evidence if the predicate refuses the
//      sentence that had one.
const { relativeDay, translate } = await server.ssrLoadModule("/i18n/index.tsx");
const DAY_MS = 86400000;
// Anchored to the reader's wall clock, not to elapsed 24-hour blocks. The door counts calendar
// days since M216, and an offset like `1.4 * DAY_MS` answers differently at 23:30 than at 10:00,
// so a case table built from offsets would let the start time of the run decide the result.
// `dayAt(1, 0)` is tomorrow at 00:30 whenever this executes — the case that separates the two
// rules, because the elapsed one has not finished a day yet. The two `0` rows want the today
// word: M214 queued the within-a-day branch as the one arm with no reader word, and M292 pays
// it — a bare clock is refused, and a word that lost its clock is refused.
const dayAt = (shift, hour) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + shift);
  d.setHours(hour, 30, 0, 0);
  return d.toISOString();
};
const REL_CASES = [
  [0, 9, "time.today"], [0, 23, "time.today"],
  [1, 0, "time.tomorrow"], [1, 12, "time.tomorrow"], [1, 23, "time.tomorrow"],
  [-1, 0, "time.yesterday"], [-1, 23, "time.yesterday"],
  [2, 0, "time.inDays"], [5, 12, "time.inDays"],
  [-2, 0, "time.agoDay"], [-40, 9, "time.agoDay"],
];
const oldRelTime = (d) => `${d > 0 ? "in " : ""}${d}d${d > 0 ? "" : " ago"}`;
const elapsedRule = (iso) => Math.round((new Date(iso).getTime() - Date.now()) / DAY_MS);
const relBad = [];
for (const [shift, hour, wantKey] of REL_CASES) {
  const iso = dayAt(shift, hour);
  const row = relativeDay("en", iso);
  const key = "key" in row ? row.key : null;
  const n = "vars" in row && row.vars ? row.vars.n : null;
  const at = "vars" in row && row.vars ? row.vars.at : null;
  const where = `day ${shift} @${String(hour).padStart(2, "0")}:30`;
  if (key !== wantKey) relBad.push(`${where} -> ${key ?? "value"} (wanted ${wantKey ?? "value"})`);
  if (wantKey === "time.tomorrow" || wantKey === "time.yesterday") {
    if (n !== null) relBad.push(`${where} -> a direction word carrying n=${n}`);
  } else if (wantKey === "time.today") {
    if (n !== null && n !== undefined) relBad.push(`${where} -> the today word carrying n=${n}`);
    if (typeof at !== "string" || !at.includes(":")) relBad.push(`${where} -> the today word without a clock (${JSON.stringify(at)})`);
  } else if (key && (!Number.isInteger(n) || n <= 0 || n !== Math.abs(shift))) {
    relBad.push(`${where} -> n=${n} is not the whole positive day count`);
  }
  if (!key && !("value" in row)) relBad.push(`${where} -> neither a key nor a value`);
  for (const locale of ["en", "zh-CN", "zh-TW"]) {
    const line = key ? translate(locale, key, row.vars) : relativeDay(locale, iso).value;
    if (/-\d/.test(line)) relBad.push(`${locale} ${where} prints "${line}"`);
    if (/\{[a-z]/i.test(line)) relBad.push(`${locale} ${where} left a hole: "${line}"`);
    if (locale !== "en" && /\b(in|ago)\b/.test(line)) relBad.push(`${locale} ${where} speaks English: "${line}"`);
    if (wantKey === "time.today" && key) {
      // The sentence the branch shipped until M292, refused by name: the line must be more than
      // the clock it carries, and it must still carry the clock.
      if (line === at) relBad.push(`${locale} ${where} prints a bare clock: "${line}"`);
      else if (at && !line.includes(at)) relBad.push(`${locale} ${where} dropped the clock: "${line}"`);
    }
  }
}
// The two direction words are read out of the table rather than typed into this file, so the
// claim is structural — tomorrow and yesterday must not collapse into one word, and neither may
// smuggle a number into what is supposed to be a word. Copying the dictionary's text here would
// give the suite a second place for the same words to drift.
const straddle = dayAt(1, 0);
const shapeBad = [];
for (const locale of ["en", "zh-CN", "zh-TW"]) {
  const up = translate(locale, "time.tomorrow");
  const down = translate(locale, "time.yesterday");
  if (up === down) shapeBad.push(`${locale}: one word for both directions`);
  if (/\d/.test(up) || /\d/.test(down)) shapeBad.push(`${locale}: a direction word with a number in it`);
}
ok(`the door counts the reader's calendar days over ${REL_CASES.length} planted date anchors × 3 locales (${relBad.slice(0, 3).join(" | ") || "clean"}; ${shapeBad.join(" | ") || "the two direction words differ, and today is a word plus its clock"}), while the elapsed-24-hour rule it replaced still calls tomorrow at 00:30 “${elapsedRule(straddle)} days” (${oldRelTime(elapsedRule(straddle))})`,
  relBad.length === 0 && shapeBad.length === 0 && !(elapsedRule(straddle) > 1) &&
  "key" in relativeDay("en", straddle) && relativeDay("en", straddle).key === "time.tomorrow" &&
  relativeDay("en", dayAt(0, 9)).key === "time.today" &&
  /-2d ago/.test(oldRelTime(-2)) && /in 3d/.test(oldRelTime(3)) &&
  !/-\d/.test(translate("en", "time.agoDay", { n: 2 })) &&
  !/\b(in|ago)\b/.test(translate("zh-CN", "time.inDays", { n: 3 })));

// 26c-3. The day rows' compactness is a per-locale decision, and it is COUPLED to a layout.
//        English counts compactly (`{n}d ago`, `in {n}d`) because the dashboard's day stamp sits
//        in a 56px `w-14` box that wraps on anything longer; both Chinese columns spell the unit
//        out, because a Latin abbreviation inside Chinese text reads as foreign. M216 charged the
//        inconsistency, M304 chose the policy and wrote it beside the rows.
//
//        M309 is why this clause exists in this shape. It read M216's charge — "consistent but
//        not pretty" — and never read M304's decision, spelled the English unit out, and left the
//        stamp wrapping. This repository has now met three faces of one failure: a repair that
//        outlived its charge, a charge that outlived its repair, and an edit that never read the
//        decision it reversed. So the assertion is the COUPLING rather than either half of it:
//        while the stamp stays narrow the English rows are compact, and spelling them out is
//        legal only in the commit that widens the stamp. Both halves are read from the tree —
//        the rows from the dictionary, the stamp from `Dashboard.tsx` — so the pair cannot be
//        satisfied by editing one of them.
const COMPACT_DAY = /\{n\}\s*d\b/;
const WORD_DAY = /\{n\}\s*天/;
const dashStampSrc = appSrc.get("features/dashboard/Dashboard.tsx") ?? "";
const narrowStamp = /className="w-14 shrink-0[^"]*"[\s\S]{0,160}?relativeDay\(/.test(dashStampSrc);
// A narrow stamp requires the compact rows; a widened one permits either form, which is what
// makes "widen the column and spell the unit out" a legal single commit rather than a bypass.
const dayPolicyHolds = (ago, inDays, narrow) => !narrow || (COMPACT_DAY.test(ago) && COMPACT_DAY.test(inDays));
const enCompact = dayPolicyHolds(D.en["time.agoDay"], D.en["time.inDays"], narrowStamp);
const zhWord = ["zh-CN", "zh-TW"].every((id) => WORD_DAY.test(D[id]["time.agoDay"]) && WORD_DAY.test(D[id]["time.inDays"]));
// The plant runs the predicate on the exact pair M309 shipped: English spelled out while the
// stamp stayed narrow. It must be refused, and the pair M304 chose must pass — so a green here
// cannot mean the predicate stopped looking at either half.
const plantedM309 = dayPolicyHolds("{n} days ago", "in {n} days", true);
const plantedM304 = dayPolicyHolds("{n}d ago", "in {n}d", true);
const plantedWidened = dayPolicyHolds("{n} days ago", "in {n} days", false);
ok(`the day rows keep M304's per-locale policy while the dashboard's stamp stays narrow (English compact: ${enCompact}, the two Chinese columns word-form: ${zhWord}, the 56px w-14 stamp still renders relativeDay: ${narrowStamp}; M309's pair is refused: ${!plantedM309}, M304's passes: ${plantedM304}, and the widened stamp accepts the spelled form: ${plantedWidened})`,
  narrowStamp && enCompact && zhWord && plantedM309 === false && plantedM304 === true && plantedWidened === true);

// 26c-2. The door can be told WHICH now to measure against. The dashboard's fixture rows
//        are the caller that needs it: the panel selects its fixtures on the world's clock
//        (M289) and must label on it too, but the door only ever measured the reader's — on
//        a tree whose anchor drifts two weeks behind, a fixture the world counts six days
//        out read "8d ago". The default stays the reader's clock, and a planted reference
//        now flips the answer exactly the way the drifted panel shipped it.
const relNowBad = [];
const driftNow = dayAt(-14, 9);
const flipped = relativeDay("en", dayAt(-13, 9), driftNow);
if (relativeDay("en", dayAt(-14, 9), driftNow).key !== "time.today") relNowBad.push("the reference clock's own day is not today on itself");
if (flipped.key !== "time.tomorrow" || flipped.vars?.n !== undefined) relNowBad.push("a reader-past day is not the bare tomorrow word on a 14d-behind clock");
if (relativeDay("en", dayAt(-13, 9)).key !== "time.agoDay" || relativeDay("en", dayAt(-13, 9)).vars?.n !== 13) relNowBad.push("the default stopped measuring the reader's own clock");
ok(`the door measures against a given now: a day the reader calls 13d ago reads as tomorrow on a clock 14 days behind, and stays 13d ago on the reader's own (${relNowBad.join(" | ") || "clean"})`,
  relNowBad.length === 0);

// 26d. Provider vocabulary: the one English row a non-screen may ask for.
//      `t()` answers in the reader's language, which is right for a person and wrong for a
//      query the demo provider matches on Latin tokens (`data/intelligence.ts:246` strips
//      everything outside `a-z0-9' -`). Those two needs shared no door until M215, so the one
//      module outside `i18n/` that wanted an English word reached into the dictionary table
//      itself (`domain/playerDna.ts` read `DICTIONARIES.en[...]`), and a reader of that table
//      from a screen would have been indistinguishable from it. Now `englishWord` is the only
//      legal way out, it lives in the door module so it costs no React import, and three claims
//      hold it: nothing outside `i18n/` mentions the table, the door is called only from modules,
//      and the census is awake — the two legitimate readers inside `i18n/` must show up in the
//      same scan, or "0 offenders" would also be printed by a scan that saw nothing.
const DICT_IDENT = /\bDICTIONARIES\b/;
const EN_WORD_CALL = /\benglishWord\s*\(/;
// One pair of predicates, used by the census AND by the plants below, so a plant cannot be
// graded by a rule the shipped code is not subject to.
const readsTable = ([p, code]) => DICT_IDENT.test(code) && !p.startsWith("i18n/");
const callsDoor = ([p, code]) => p !== "i18n/format.ts" && EN_WORD_CALL.test(code);
const dictReaders = allSrc.filter(([, code]) => DICT_IDENT.test(code));
const dictOffenders = allSrc.filter(readsTable).map(([p]) => p);
const enWordCallers = allSrc.filter(callsDoor).map(([p]) => p);
const enWordScreens = enWordCallers.filter((p) => p.endsWith(".tsx"));
// Four plants, one per way this clause can be wrong: the plain member read and an aliased
// namespace read must both count as touching the table (a predicate that only greps
// `DICTIONARIES.en` misses `D.DICTIONARIES["en"]`), the door call must count as a caller of the
// door and not a reader of the table, and the same call from a `.tsx` must land in the screen
// list. Each expectation is a property of the planted text, stated here as data.
const EN_PLANTS = [
  ["domain/plantedTable.ts", "import { DICTIONARIES } from \"@/i18n/dictionaries\";\nexport const w = DICTIONARIES.en[\"dna.arch.box_box\"];\n", { table: true, door: false, screen: false }],
  ["data/plantedAlias.ts", "import * as D from \"@/i18n/dictionaries\";\nexport const w = D.DICTIONARIES[\"en\"][\"dna.arch.box_box\"];\n", { table: true, door: false, screen: false }],
  ["domain/plantedDoor.ts", "import { englishWord } from \"@/i18n/format\";\nexport const w = englishWord(\"dna.arch.box_box\");\n", { table: false, door: true, screen: false }],
  ["features/plantedScreen.tsx", "import { englishWord } from \"@/i18n/format\";\nexport const C = () => <p>{englishWord(\"dna.arch.box_box\")}</p>;\n", { table: false, door: true, screen: true }],
];
const enPlantVerdicts = EN_PLANTS.map(([p, src, want]) => {
  const got = {
    table: readsTable([p, src]),
    door: callsDoor([p, src]),
    screen: callsDoor([p, src]) && p.endsWith(".tsx"),
  };
  return [p, ["table", "door", "screen"].filter((k) => got[k] !== want[k]).map((k) => `${k}=${got[k]} want=${want[k]}`).join(" ") || null];
}).filter(([, bad]) => bad);
ok(`the four planted ways of reaching an English word are classified exactly as declared (${EN_PLANTS.length} plants, ${enPlantVerdicts.length ? enPlantVerdicts.map(([, b]) => b).join(" | ") : "all as predicted"})`,
  enPlantVerdicts.length === 0);
ok(`only i18n/ touches the dictionary table (${allSrc.length} files read against pin ${SRC_PIN}, ${dictReaders.length} readers inside i18n/: ${dictReaders.map(([p]) => p).join(", ") || "NONE — the scan was blind"}, offenders outside: ${dictOffenders.join(", ") || "none"})`,
  dictOffenders.length === 0 && dictReaders.length >= 2 && allSrc.length === SRC_PIN);
ok(`provider vocabulary is asked for only by modules, never rendered from a screen (${enWordCallers.length} caller(s): ${enWordCallers.join(", ") || "NONE — nobody uses the door"}, screens: ${enWordScreens.join(", ") || "none"})`,
  enWordCallers.length >= 1 && enWordScreens.length === 0);
// The door is loaded from its own module, not the umbrella: 26d exists to keep provider input
// out of the reader's path, so the suite must not reach for it the way a screen does. Both
// halves are asserted because `Dict = Record<string, string>` promises a string the table
// cannot always deliver — an unknown key that returns `undefined` still type-checks.
const { englishWord: wordDoor } = await server.ssrLoadModule("/i18n/format.ts");
const wordBad = [];
if (wordDoor("comm.title") !== "Community") wordBad.push(`a known row → ${JSON.stringify(wordDoor("comm.title"))}`);
if (wordDoor("dna.arch.not_a_real_archetype") !== "dna.arch.not_a_real_archetype") {
  wordBad.push(`an unknown row → ${JSON.stringify(wordDoor("dna.arch.not_a_real_archetype"))}`);
}
ok(`the vocabulary door answers from the English column and echoes a key it does not know (${wordBad.join(" | ") || "clean"})`,
  wordBad.length === 0);

// 26e. A suggested question is copy and a query at once, so the two halves must be one fact.
//      `data/ai.ts` names the row the reader sees; the chip renders it through `t` and sends the
//      English row of the SAME key, because the retrieval tokenizer (`data/intelligence.ts:246`)
//      keeps only Latin tokens. Before M217 the four questions were one English array doing both
//      jobs, and no position scan could see them — a literal in a module-scope array reaches a JSX
//      child through a variable. So the claim here is that the sent text equals the table's own
//      English row (nobody may keep a second copy), that every locale has a row of its own, and
//      that the AI screen carries no question literal left in it. The planted string under the same
//      regex is what makes the last half evidence rather than an empty count: a scanner blinded to
//      questions and a screen with none both read zero, and only the plant tells them apart.
const { SUGGESTED_ASKS } = await server.ssrLoadModule("/data/ai.ts");
const QUESTION_LITERAL = /["'`]([^"'`\n]{6,}\?)["'`]/g;
const askBad = [];
for (const a of SUGGESTED_ASKS) {
  const key = `ai.sug.${a.id}`;
  const en = translate("en", key);
  if (en === key) askBad.push(`${key} has no English row at all`);
  for (const locale of ["zh-CN", "zh-TW"]) {
    if (translate(locale, key) === key) askBad.push(`${locale}: ${key} resolves to its own key (no row)`);
  }
  if (a.ask !== en) askBad.push(`${key}: sends “${a.ask}” but the English row is “${en}”`);
}
const aiStudioSrc = codeOf(readFileSync(join(root, "features", "ai", "AiStudio.tsx"), "utf8"));
const screenQuestions = [...aiStudioSrc.matchAll(QUESTION_LITERAL)].map((m) => m[1]);
const probeFound = [...`"Who is the key player at Real Madrid?"`.matchAll(QUESTION_LITERAL)].length;
ok(`the ${SUGGESTED_ASKS.length} suggested questions send exactly the English row of the key the reader sees (${askBad.slice(0, 3).join(" | ") || "all equal"}), the AI screen carries ${screenQuestions.length} question literal(s), and the same scan finds the planted one (${probeFound})`,
  SUGGESTED_ASKS.length >= 4 && askBad.length === 0 && screenQuestions.length === 0 && probeFound === 1);

// 26f. A prompt handed to the coach is a row with two readings (M223). Six screens call
//      `requestPlan`; three read the dictionary, which froze the language they were clicked in
//      onto the activity timeline, and two typed an English sentence — so the provider matched
//      English AND a reader in either Chinese locale was shown it, because a plan's prompt is
//      also the row that timeline shows. The row is the single fact now: the reader's reading
//      comes from `rowLine(row, t)` and the provider's from `englishRow(row)`, which resolves
//      the same code-holding variables through the English column. So the claim is 26e's,
//      generalised — what the coach is sent must equal the English reading of the very row the
//      reader sees, attribute names included, because `analyze` matches on those words. The
//      screen half is a shape rule with a plant under it: "no screen types a sentence into
//      requestPlan" is exactly the empty count a blind scanner also prints.
const { englishRow } = await server.ssrLoadModule("/data/ai.ts");
const { rowLine } = await server.ssrLoadModule("/domain/rowText.ts");
const say = (locale) => (row) => rowLine(row, (key, vars) => translate(locale, key, vars));
const PROMPT_ROWS = [
  { where: "the video-analysis prompt", focus: ["passing", "dribbling"], row: { key: "ai.videoAnalysisPrompt", vars: { improvement: "Heavy first touch", focus: "passing,dribbling" } } },
  { where: "the film-review prompt", focus: ["scanning"], row: { key: "ai.filmAnalysisPrompt", vars: { improvement: "Slow scanning", focus: "scanning" } } },
];
const promptRowBad = [];
for (const { where, focus, row } of PROMPT_ROWS) {
  const sent = englishRow(row);
  if (sent !== say("en")(row)) promptRowBad.push(`${where}: the coach is sent “${sent}” but the English row reads “${say("en")(row)}”`);
  for (const { id } of L) if (translate(id, row.key) === row.key) promptRowBad.push(`${id}: ${row.key} has no row at all`);
  for (const k of focus) {
    const word = translate("en", `attr.name.${k}`);
    if (!sent.includes(word)) promptRowBad.push(`${where}: the query lost “${word}” (${sent})`);
    const local = translate("zh-CN", `attr.name.${k}`);
    if (!say("zh-CN")(row).includes(local)) promptRowBad.push(`${where}: a 简体中文 reader is not shown “${local}”`);
  }
  if (say("zh-CN")(row) === sent) promptRowBad.push(`${where}: the reader and the provider are handed the same sentence`);
}
const PROMPT_CALL = /requestPlan\(\s*(["'`])/;
const screenFiles = [...appSrc].filter(([p]) => p.endsWith(".tsx"));
const promptCallSites = screenFiles.reduce((n, [, code]) => n + (code.match(/requestPlan\(/g) ?? []).length, 0);
const typedPrompts = screenFiles.filter(([, code]) => PROMPT_CALL.test(code)).map(([p]) => p);
const promptPlant = 'requestPlan("Video analysis flagged: x", 30);';
ok(`the ${PROMPT_ROWS.length} coach prompts the screens hand over are the reader's own rows, read here in both languages (${promptRowBad.slice(0, 3).join(" | ") || "clean"}), and the ${promptCallSites} call site(s) across ${screenFiles.length} screens type no sentence into requestPlan (${typedPrompts.join(", ") || "none"}), while the plant under the same regex is reported (${PROMPT_CALL.test(promptPlant)})`,
  PROMPT_ROWS.length === 2 && promptRowBad.length === 0 && promptCallSites >= 5 &&
  typedPrompts.length === 0 && screenFiles.length >= 30 && PROMPT_CALL.test(promptPlant));

// 26g. A row variable that holds a KEY cannot be handed the row's variables. `rowLine` resolves
//      `lead`, `target`, `game` and `zone` through the reader's column because the value is the
//      NAME of a row rather than the words to print — M230 made that a declared list, `KEY_VARS`
//      in `domain/rowText.ts`, instead of a convention every provider re-decides — and it
//      resolves them with no variables at all, because the outer row's bag belongs to the outer
//      sentence. So a key reached that way may interpolate nothing. `ai.lead.general` read
//      "…Football OS intelligence for {label}." and every reader, the English one included, was
//      shown the braces: the `label` it asked for had been filled into a different row (the
//      answer's sources, which the same panel prints underneath). Three things are pinned, all
//      of them read out of the tree rather than listed here: the `KEY_VARS` list is exactly the
//      names this clause knows how to find keys for, so a fifth name cannot be added without
//      teaching the scan; every key those four variables can carry has a row in every locale;
//      and none of those rows interpolates anything.
const rowTextSrc = readFileSync(join(root, "domain", "rowText.ts"), "utf8");
const KEY_VARS = (((rowTextSrc.match(/const KEY_VARS[^=]*=\s*\[([^\]]*)\]/) ?? [])[1] ?? "").match(/"[^"]*"/g) ?? [])
  .map((s) => s.slice(1, -1));
const aiProviderSrc = readFileSync(join(root, "data", "ai.ts"), "utf8");
const leadKeys = [...aiProviderSrc.matchAll(/leadKey\s*=\s*"([\w.]+)"/g)].map((m) => m[1]);
// Where a variable is handed a key is its own row's `vars` object, and an expression there can
// name more than one (`target: isTargeted ? "a" : "b"` yields both ends).
const keysHeldIn = (name) => {
  const keys = new Set();
  for (const m of aiProviderSrc.matchAll(new RegExp(`\\b${name}\\s*:\\s*([^,}\\n]+)`, "g"))) {
    for (const q of m[1].matchAll(/"([\w.]+)"/g)) if (q[1].includes(".")) keys.add(q[1]);
  }
  return [...keys];
};
const loadSrc = readFileSync(join(root, "domain", "load.ts"), "utf8");
const zoneBlock = (loadSrc.match(/export const ZONE_LABEL[\s\S]*?\n\};/) ?? [""])[0];
const zoneKeys = [...zoneBlock.matchAll(/key:\s*"([\w.]+)"/g)].map((m) => m[1]);
// M231 added two names whose keys are not chosen by the coach: a detection kind and one of the
// Film Room's improvements. Their ids are declared in the module that owns them (literals, so the
// reachability census can see them), and the count is asserted below, which is what makes a stray
// literal in a comment visible rather than harmless.
const videoSrc = readFileSync(join(root, "data", "video.ts"), "utf8");
// M235 moved the seven detection-kind ids to domain/filmInsights.ts, the module that composes
// the evidence row naming them (a domain module may not reach up into `data/`), and data/video
// re-exports the table. The id literals are read from wherever they live, so moving them again
// without this following is a red rather than a silent `event` with nothing to hold.
const kindSrc = videoSrc + readFileSync(join(root, "domain", "filmInsights.ts"), "utf8");
const idsUnder = (src, prefix) => [...src.matchAll(new RegExp(`"(${prefix}[\\w.]+)"`, "g"))].map((m) => m[1]);
const eventKeys = [...new Set(idsUnder(kindSrc, "vid\\.kind\\."))];
const improvementKeys = [...new Set(idsUnder(videoSrc, "vid\\.imp\\."))];
const EVENT_KEY_FLOOR = 7;      // the seven detections the video pipeline can report
const IMPROVEMENT_KEY_FLOOR = 3; // the three improvement rows the Film Room lists
const KEY_VAR_KEYS = { lead: leadKeys, target: keysHeldIn("target"), game: keysHeldIn("game"), zone: zoneKeys, event: eventKeys, improvement: improvementKeys };
const unknownKeyVar = KEY_VARS.filter((n) => KEY_VAR_KEYS[n] === undefined);
const emptyKeyVar = Object.entries(KEY_VAR_KEYS).filter(([, keys]) => keys.length === 0).map(([n]) => n);
ok(`the variables that resolve as keys are exactly the ${KEY_VARS.length} this clause can find keys for (${KEY_VARS.join(", ")}; unknown: ${unknownKeyVar.join(", ") || "none"}; found nothing for: ${emptyKeyVar.join(", ") || "none"})`,
  KEY_VARS.length >= 4 && unknownKeyVar.length === 0 && emptyKeyVar.length === 0);
const keyVarHolders = Object.entries(KEY_VAR_KEYS).flatMap(([name, keys]) => keys.map((k) => [name, k]));
const keyVarBad = [];
for (const [name, key] of keyVarHolders) {
  for (const { id } of L) {
    const value = D[id][key];
    if (typeof value !== "string" || !value.trim()) keyVarBad.push(`${name}: ${key} has no ${id} row`);
    else if (/[{}]/.test(value)) keyVarBad.push(`${name}: ${id} ${key} interpolates ${(value.match(/\{\w+\}/g) ?? []).join(" ")}`);
  }
}
ok(`no key a key-holding variable can carry asks for variables of its own (${keyVarHolders.length} keys × ${L.length} locales, ${keyVarBad.slice(0, 4).join(" | ") || "all var-free"})`,
  EVENT_KEY_FLOOR <= eventKeys.length && IMPROVEMENT_KEY_FLOOR <= improvementKeys.length &&
  keyVarHolders.length >= 11 + EVENT_KEY_FLOOR + IMPROVEMENT_KEY_FLOOR && keyVarBad.length === 0);

// 26h. The same claim measured on the sentences a reader meets, because a scan over declared
//      keys cannot see a provider that composed the words itself. Before M230 the coach called
//      `attributeLabel`/`archetypeLabelEn` before handing a row its variables, so a 简体中文
//      reader of the plan's rationale read "核心重点 Ball Control + Weak Foot 瞄准你的 current
//      biggest measurable gap" — the contract had nothing to translate, the value was already a
//      word. Every row of six real plans (a fresh one, a first week whose caution band has no
//      ratio at all, a spike, a continuing block, a rotated one, and the role-gap panel's) and
//      the lead of three Match Intelligence answers is rendered through the shipped dictionary
//      in all three locales and refused for two things: a placeholder that survived to the
//      screen, and — in the two Chinese columns — a Latin word that is not one of the three the
//      game's own name keeps. The leak rule carries its own two-sided test below, over the very
//      sentence M230 fixed, because "0 leaks" is also what a blind detector prints.
const { coachProvider, askFootballAI } = await server.ssrLoadModule("/data/ai.ts");
const PLAN_ATTRS = { passing: 61, first_touch: 58, dribbling: 66, shooting: 54, pace: 71, stamina: 63, strength: 60, vision: 64, positioning: 57, tackling: 44, defensive_awareness: 46, decision_making: 59, work_rate: 68, agility: 70, balance: 62, jumping: 55, heading: 52, crossing: 60, long_passing: 58, finishing: 53, composure: 60, leadership: 50, teamwork: 66, discipline: 64, aggression: 55, anticipation: 58, concentration: 61, communication: 52, coordination: 65, reaction: 69, acceleration: 72, strength_endurance: 60, weak_foot: 48, set_pieces: 51 };
const PLAN_ASK = { prompt: { key: "coach.ask.default" }, profile: { displayName: "Sam", positionGroup: "MID", attributes: PLAN_ATTRS }, history: [], availableMinutes: 30 };
const PLAN_SHAPES = [
  ["a fresh plan", {}],
  ["a first week with no ratio", { load: { zone: "caution", acwr: null, weekLoad: 40 } }],
  ["a load spike", { load: { zone: "high", acwr: 1.92, weekLoad: 412 } }],
  ["a continuing block", { history: [{ focus: "first_touch", completed: 3 }], lastFocus: ["first_touch"] }],
  ["a rotated block", { history: [{ focus: "passing", completed: 1 }], lastFocus: ["set_pieces"] }],
  ["the role-gap panel", { focusKeys: ["passing", "dribbling"] }],
];
const KEPT_LATIN = ["Football OS", "ACWR", "DNA"];
const englishLeft = (s) => KEPT_LATIN.reduce((rest, kept) => rest.split(kept).join(" "), s).match(/[A-Za-z][A-Za-z\u2019']*/g) ?? [];
const planRowBad = [];
let planReadings = 0;
for (const [name, extra] of PLAN_SHAPES) {
  const plan = await coachProvider.generatePlan({ ...PLAN_ASK, ...extra });
  for (const row of [...plan.diagnosis, ...plan.rationale, ...plan.sources]) {
    for (const { id } of L) {
      planReadings++;
      const shown = say(id)(row);
      if (/[{}]/.test(shown)) planRowBad.push(`${name} [${id}] a placeholder survived: ${shown}`);
      if (id !== "en") {
        const leaked = englishLeft(shown);
        if (leaked.length) planRowBad.push(`${name} [${id}] English in a Chinese column (${leaked.join(" ")}): ${shown}`);
      }
    }
  }
}
const ANSWER_SHAPES = [["who is the best player at ARS?", "the ranking question"], ["why did they win?", "the pattern question"], ["tell me about the match", "the general question"]];
for (const [question, name] of ANSWER_SHAPES) {
  // The M269 signature: rows in, rows out. The label is the same row the page asks with,
  // and the answer is read the way the screen reads it — line by line, joined with spaces.
  const answer = await askFootballAI(question, {
    label: { key: "ai.matchLabel", vars: { home: "ARS", away: "CHE" } },
    facts: [{ key: "ai.qf.scoreline", vars: { score: "2-1" } }],
  });
  for (const { id } of L) {
    planReadings++;
    const shown = answer.text.map((r) => say(id)(r)).join(" ");
    if (/[{}]/.test(shown)) planRowBad.push(`${name} [${id}] a placeholder survived: ${shown}`);
  }
}
const LEAK_PLANTS = [
  ["the sentence M230 fixed", "核心重点 Ball Control + Weak Foot 瞄准你的 current biggest measurable gap", true],
  ["the same sentence after it", "核心重点 控球 + 冲刺 瞄准你的 当前最大的可量化差距", false],
  ["a row whose only Latin is the game's own name", "Football OS 训练方法论（演示知识库）", false],
];
const leakMissed = LEAK_PLANTS.filter(([, s, want]) => (englishLeft(s).length > 0) !== want);
ok(`the English-leak rule calls the pre-M230 sentence a leak and its replacement clean (${LEAK_PLANTS.length} plants, ${leakMissed.map(([n]) => n).join(", ") || "all as declared"})`,
  leakMissed.length === 0);
ok(`every row of ${PLAN_SHAPES.length} real plans and ${ANSWER_SHAPES.length} answers reaches a reader in the reader's own column (${planReadings} readings, ${planRowBad.slice(0, 3).join(" | ") || "clean"})`,
  planReadings >= 100 && planRowBad.length === 0);
ok(`the provider composes no English label into a row any more (${/attributeLabel|archetypeLabelEn/.test(aiProviderSrc) ? "a label composer is back" : "data/ai.ts names keys only"})`,
  !/attributeLabel|archetypeLabelEn/.test(aiProviderSrc));

// 26i. A bracket that opens in one script and closes in another. `t()` fills placeholders and
//      nothing else, so `（综合 {rating})` reaches the reader with the wrong half-width closer —
//      six rows read that way at f14034f, on the plan's source line and on every level line, in
//      both Chinese locales. The rule is a shape over the whole dictionary rather than a rule
//      about plans, because the defect is a typing habit rather than a code path, and it is
//      checked per locale because the row that is wrong is the row the reader reads. The plants
//      open the pair in both directions, so a census that counted one style twice would be seen
//      not counting the other.
const bracketsOf = (s) => [
  (s.match(/（/g) ?? []).length - (s.match(/）/g) ?? []).length,
  (s.match(/\(/g) ?? []).length - (s.match(/\)/g) ?? []).length,
];
const BRACKET_PLANTS = [
  ["a full-width pair closed half-width", "你的已存属性（综合 38)", true],
  ["the same row with its own closer", "你的已存属性（综合 38）", false],
  ["a half-width pair closed full-width", "Context (demo）", true],
  ["a row carrying both styles, closed", "Context (demo)（说明）", false],
];
const bracketMissed = BRACKET_PLANTS.filter(([, s, want]) => {
  const [full, half] = bracketsOf(s);
  return ((full !== 0 || half !== 0) !== want);
});
ok(`the bracket rule catches a pair opened in one script and closed in the other (${BRACKET_PLANTS.length} plants, ${bracketMissed.map(([n]) => n).join(", ") || "all as declared"})`,
  bracketMissed.length === 0);
const bracketBad = [];
for (const { id } of L) {
  for (const key of enKeys) {
    const value = D[id][key];
    if (typeof value !== "string") continue;
    const [full, half] = bracketsOf(value);
    if (full !== 0 || half !== 0) bracketBad.push(`${id} ${key} (${full} full, ${half} half)`);
  }
}
ok(`every dictionary row closes its own brackets in its own script (${enKeys.length * L.length} rows read, ${bracketBad.slice(0, 4).join(" | ") || "clean"})`,
  enKeys.length * L.length >= 5000 && bracketBad.length === 0);

// 27. A second interpolator. t(key, vars) fills every occurrence of a placeholder;
//     `String.prototype.replace` with a string needle fills only the FIRST, so a key
//     that repeats a token renders half-filled — and every new key would have to know
//     which path reads it. 21 hand-rolled call sites were collapsed onto t()'s own
//     variables at M153; this is what stops them coming back one at a time.
//     data/ is exempt: it fills a seeded news headline template, not a dictionary string.
//     M312: the needle is either a quoted string or a regex literal, and this rule only saw the
//     quoted one. `replace(/{n}/, …)` fills only the first occurrence exactly as
//     `replace("{n}", …)` does — the same half-filled render — so the plant that runs this rule
//     found the gap instead of confirming it. Both needles are refused now, and the two shapes
//     that must stay legal (`.replace("a", "b")`, `.replace(/-/g, "/")`) are planted beside them.
const HANDROLLED = /\.replace\(\s*(?:["'`]\{|\/\{)/g;
const handRolled = [...appSrc]
  .filter(([p, src]) => !p.startsWith("data/") && src.match(HANDROLLED))
  .map(([p, src]) => `${p} (${src.match(HANDROLLED).length})`);
ok(`t()'s variable filling is the only interpolator in the UI source (${handRolled.join(", ") || "none"})`,
  handRolled.length === 0);
// M312. The clause above is one regex over every app file; a zero passes if the regex stopped
// matching, and the two shapes it exists to refuse are worth naming. `replace("{n}", …)` fills only
// the first occurrence — the half-filled render M153 collapsed 21 sites away from — and
// `replace(/{n}/, …)` is the same mistake written with a regex needle. Both must be caught, and a
// replacement with no placeholder in it must not be accused, because the day that happens the
// clause is charging ordinary string work.
const PLANTED_HANDROLLED = [
  ['const s = tpl.replace("{n}", String(n));', true],
  ['const s = tpl.replace(/{n}/, String(n));', true],
  ['const s = tpl.replace("a", "b");', false],
  ['const s = iso.replace(/-/g, "/");', false],
];
const handRolledVerdicts = PLANTED_HANDROLLED.map(([line, want]) => [line, new RegExp(HANDROLLED.source).test(line) === want]);
ok(`the hand-rolled interpolator rule, planted both ways, still catches the two shapes it refuses and accuses neither shape it does not (${handRolledVerdicts.map(([l, v]) => `${v ? "ok" : "MISS"} ${l}`).join("; ")})`,
  handRolledVerdicts.every(([, v]) => v));

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
  // M246: learn.ts holds the words as keys on its lesson rows; the Academy screen is the
  // only renderer of every one of them (title/summary on the cards, try-it and quiz in the detail).
  { path: "domain/learn.ts", prop: "titleKey", consumer: "features/learn/LearnHub.tsx" },
  { path: "domain/learn.ts", prop: "summaryKey", consumer: "features/learn/LearnHub.tsx" },
  { path: "domain/learn.ts", prop: "labelKey", consumer: "features/learn/LearnHub.tsx" },
  { path: "domain/learn.ts", prop: "qKey", consumer: "features/learn/LearnHub.tsx" },
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
  badKeys.length === 0 && keySites > 0 && keyFiles.size > 0);
ok(`every *Key field is read back through t(), so a rename can never dodge the scan by leaving the translation out (${unresolved.slice(0, 4).join(" | ") || "all resolved"})`,
  unresolved.length === 0 && keySites > 0);

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
// ===== 30b. SHARED VALUES — a ratchet on English duplicates ================================
// The English block has values carried by more than one key ("Football World" is the
// nav label, the landing pillar title and the football-world hub title). That is
// legitimate — the same word has different futures in different screens — but an
// unbounded duplicate count is debt. So this is a ratchet: the number of duplicated
// English values may only fall. A milestone that removes a duplicate updates the pin
// downward; nothing may raise it. Alongside the count, every currently-duplicated value
// must be carried by all three locales, so a duplicate at least translates everywhere.
// M453: the career screen's keys raised the measured counts by their own amount — the pins are
// ratchets, so a milestone that ADDS keys pays here in the same commit (107->109, 177->180).
// M523: the coach résumé's 40 keys per locale pay their own toll (109->113, 180->189).
// M525: the season report's rows pay theirs (113->114, 189->190).
// M527: TacticalNotebook's 16 new keys add 4 duplicate values and 4 excess keys (114->118, 190->194).
// M528: PlayerValueRanking's 15 keys add 6 excess keys (194->200).
// M530: InjuryReport's 13 keys add 6 duplicate values and 6 excess keys (118->124, 200->206).
// M531: ClubCompare's 16 keys add 1 duplicate value and 4 excess keys (124->125, 206->210).
// M533: PlayerProjection's 16 keys add 1 duplicate value and 4 excess keys (125->126, 210->214).
// M534: RunIn's 18 keys add 1 duplicate value and 1 excess key (126->127, 214->215).
// M567: TitleRace's 21 keys add 1 duplicate value ("Title race", shared with mgr.zoneTitle)
// and 1 excess key (127->128, 215->216).
// M568: HeadToHead's 29 keys form one new duplicate group ("Opponent", shared with
// player.opponent) and join four existing ones (Goals, Home, Away, Club): 128->129, 216->221.
// M569: VenueSplit's 23 keys form two new duplicate groups ("{n} pts" shared with ai.kg.pts,
// "Draws" shared with h2h.draws) and grow three existing ones (Home, Away, Club): 129->131,
// 221->226.
// M571: Discipline's 22 keys add 7 duplicate values (Discipline shares attr.name.discipline,
// Fouls shares ms.fouls, Yellow cards shares ms.yellows, Red cards shares ms.reds, Most booked
// shares leaders.bookedTitle, Y shares leaders.yellowShort, R shares leaders.redShort)
// and 7 excess keys: 131->138, 226->233.
// M574: EventClock's keys add two duplicate values (Shots shares ms.shots, Busiest window shares
// timing.busiest) and two excess keys: 138->140, 233->235. M575: Briefing's 35 keys form six new
// duplicate groups ("Next up" shared with det.results.next, "Points" with coach.points, "Ceiling"
// with career.ceilingRing, "Fixtures left" with runIn.remaining, "The run-in" with runIn.title,
// "Head to head" with nav.headToHead) and grow the existing Club group — measured on the merged
// dictionary below.
const DUP_VALUES_PIN = 146;
const DUP_EXCESS_KEYS_PIN = 242;
// Build a reverse map once: English value → the keys that carry it.
const enPairs = pairsOf(0);
const valueToKeys = new Map();
for (const [k, v] of enPairs) {
  const val = v.trim();
  if (!valueToKeys.has(val)) valueToKeys.set(val, []);
  valueToKeys.get(val).push(k);
}
const dupEntries = [...valueToKeys.entries()].filter(([, ks]) => ks.length > 1);
const dupExcess = dupEntries.reduce((n, [, ks]) => n + ks.length - 1, 0);
ok(`English duplicate-value count is pinned at ${DUP_VALUES_PIN} (actual: ${dupEntries.length})`,
  dupEntries.length <= DUP_VALUES_PIN);
ok(`English excess-key count is pinned at ${DUP_EXCESS_KEYS_PIN} (actual: ${dupExcess})`,
  dupExcess <= DUP_EXCESS_KEYS_PIN);
// Every duplicated value's keys must exist (non-empty) in all three locales.
const dupKeyMissing = dupEntries
  .flatMap(([val, ks]) => ks.map((k) => [val, k, L.filter((loc) => !(k in D[loc.id]) || !D[loc.id][k].trim()).map((l) => l.id)]))
  .filter(([, , missing]) => missing.length > 0);
ok(`every key carrying a duplicated English value is present in all ${L.length} locales (${dupKeyMissing.length} missing)`,
  dupKeyMissing.length === 0,
  dupKeyMissing.slice(0, 6).map(([, k, m]) => `${k}: missing ${m.join(", ")}`).join(" | "));
// No screen renders a duplicated value as raw copy (the shared-word hygiene clause).
const sharedWordsLower = new Set(dupEntries.map(([v]) => v.toLowerCase()));
const bareShared = tsxSrc.flatMap(([p, code]) => scanSource(code).hits
  .filter((h) => {
    const t = h.text.replace(/^["'`]|["'`]$/g, "").trim().toLowerCase();
    return sharedWordsLower.has(t);
  })
  .map((h) => `${p} (${h.text.replace(/^["'`]|["'`]$/g, "").trim()})`));
ok(`no screen renders a shared English value as raw copy (${bareShared.length} bare hits)`,
  bareShared.length === 0, bareShared.slice(0, 6).join(" | "));

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
  // A utility-class list. `CERTAINTY_TONE` maps a certainty band to Tailwind classes, and
  // "border-success/40 bg-success/10 text-success" was charged as prose because it holds
  // spaces and letters like a sentence does. Every token carrying a `-`, `/` or `:` is what
  // tells a class list from a sentence — which is also why the bar is EVERY token and not
  // "at least one": `state-of-the-art passing` is prose, and a rule asking for one hyphen
  // would have exempted it. Matched against the quote-stripped inner text, like the rest of
  // this list, so there is no `["']` anchor here. M181 narrowed the same rule for formats.
  /^(?:\S*[-/:]\S*)(?:\s+\S*[-/:]\S*)*$/,
  // A compound POSITION abbreviation. `"LB / RB"` and `"LW / RW"` are the two values
  // `Player.position` carries for a full-back and a winger (M263), and the class-list rule
  // above cannot see them: no token in them contains a `-`, `/` or `:`, because the solidus
  // is a token of its own with spaces either side. There are no words here for a
  // dictionary to improve on — the whole literal is a code, and this file's value-space
  // clause enumerates the eight of them. M181 narrowed this rule for formats; this
  // narrows it for a separator, and the sample list keeps the narrowing honest in both
  // directions: a real sentence that happens to hold a solidus must stay prose.
  /^[A-Z]{1,4}(?: \/ [A-Z]{1,4})+$/,
];
// True when the literal still names something in English with its interpolated values cut
// out. `€${…}M` and `${home.name} ${hg} – ${ag} ${away.name}` do not; "Window: last {n}
// days" does.
const hasOwnWord = (inner) => /[A-Za-z]{2}/.test(inner.replace(/\$\{[^}]*\}/g, " "));

/** A quote can open a "string" that is really the inside of a REGEX literal. M254 found
 *  `data/intelligence.ts:244` charged as prose: `/[^a-z0-9' -]/g` holds an apostrophe, so the
 *  literal scanner opened there and read on to the next one — `' -]/g, " ").split(/\s+/).map(…`
 *  — which has spaces and letters, so it looked exactly like a sentence. Regexes are removed
 *  before the literal scan, because a character class can never be prose. A `/` only opens a
 *  regex where a value can start, and a `/` inside `[...]` does not close it, which is the
 *  same two facts the pattern has to respect to strip `/\s+/` and `/[^a-z0-9' -]/g` alike. */
function stripRegexLiterals(line) {
  let out = "";
  let i = 0;
  while (i < line.length) {
    const c = line[i];
    if (c === "/" && i + 1 < line.length) {
      const prev = out.trimEnd().slice(-1);
      const canOpen = out.length === 0 || "(=,:[!&|?{};+-*%~^".includes(prev);
      if (canOpen) {
        let j = i + 1;
        let inClass = false;
        while (j < line.length) {
          const d = line[j];
          if (d === "\\") { j += 2; continue; }
          if (inClass) { if (d === "]") inClass = false; }
          else if (d === "[") inClass = true;
          else if (d === "/") break;
          j++;
        }
        if (j < line.length && line[j] === "/") {
          i = j + 1;
          while (i < line.length && /[a-z]/.test(line[i])) i++; // flags
          continue;
        }
      }
    }
    out += c;
    i++;
  }
  return out;
}

/** The prose literals on one line of source. Exposed so a clause can plant a sentence and ask
 *  the same predicate the file scan uses, which is what keeps a zero from passing on a file
 *  the scan never actually read. */
function proseOnLine(line) {
  if (/^\s*(\/\/|\*|\/\*)/.test(line)) return [];
  const out = [];
  for (const raw of stripRegexLiterals(line).match(PROSE_LIT) ?? []) {
    const inner = raw.slice(1, -1);
    if (NOT_PROSE.some((re) => re.test(inner))) continue;
    if (!/[A-Za-z]/.test(inner)) continue;
    if (!/ /.test(inner) && !/[.!?]$/.test(inner)) continue;
    if (!hasOwnWord(inner)) continue;
    out.push(raw);
  }
  return out;
}

function stripComments(code) {
  let out = "";
  let i = 0;
  while (i < code.length) {
    if (code[i] === "/" && i + 1 < code.length) {
      if (code[i + 1] === "/") {
        // Single-line comment: skip to end of line
        while (i < code.length && code[i] !== "\n") i++;
        continue;
      }
      if (code[i + 1] === "*") {
        // Block comment: skip to */
        i += 2;
        while (i < code.length - 1) {
          if (code[i] === "*" && code[i + 1] === "/") {
            i += 2;
            break;
          }
          i++;
        }
        continue;
      }
    }
    out += code[i];
    i++;
  }
  return out;
}

function proseDebt(relPath) {
  const code = readFileSync(join(root, ...relPath.split("/")), "utf8");
  const cleaned = stripComments(code);
  const lines = cleaned.split(/\r?\n/);
  const hits = [];
  lines.forEach((line, i) => {
    for (const _ of proseOnLine(line)) hits.push(i + 1);
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
  // The class-list rule, both directions. The first is `CERTAINTY_TONE`'s own value and is
  // not prose; the second is a sentence that happens to contain a hyphenated word, and the
  // rule has to keep calling it prose — "at least one token with a hyphen" would not.
  [false, '"border-success/40 bg-success/10 text-success"'],
  [true, '"state-of-the-art passing"'],
  // Every word in this one is three letters or fewer. It is the sample that stops the rule
  // from being quietly over-tightened to "a long word": a mutation demanding four or more
  // letters fails here even though the format samples all still classify correctly.
  [true, '"Ask now to see the fix log"'],
  [false, '`€${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`'],
  [false, '`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`'],
  [false, '`${home.name} ${hg} – ${ag} ${away.name}`'],
  [false, '"M."'],
  [false, '"attr.name.passing"'],
  // The separator rule, both directions. The first is `POSITION_BY_GROUP`'s own value and
  // is a code; the second is a constructed near-miss — same solidus, same shape, but its
  // segments carry lowercase, so it is a sentence about two roles and must stay charged.
  // It is the only sample here that is not copied out of the tree.
  [false, '"LB / RB"'],
  [true, '"Left / Right back"'],
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
// M192 did NOT move this number, and that was worth stating: keying the drill catalogue's
// render site left its eighteen `label` fields in the table, because those were the English
// reference the drift check held `drill.*` against — the same reason domain/attributes.ts
// has never reached zero. The leak was real and was fixed; the ratchet measured a different
// thing. M236 deleted the field instead of holding two copies of one noun against each
// other, so this is the milestone where the catalogue's eighteen finally leave.
// M225 published domain/matchEngine.ts's eight lines as rows — the three summary lines, the goal
// line and the four shots it names — so the ceiling and that module's own cap both fall by eight.
// M233 published domain/newsImpact.ts's sixteen — the three standing lines, the two club lines,
// the stance paragraph, the topics line, the unresolved warning and the four evidence lines —
// and narrowed the prose rule so the module's three Tailwind class lists stop being counted as
// sentences, which is the other three. Ceiling and cap both fall by nineteen.
// M234 published domain/footprint.ts's twenty-five — the four pillar cards, their absent-case
// lines, the three evidence lines and the two provenance sources — as `fp.*` rows the profile
// reads through rowLine, so the module leaves the inventory entirely: ceiling and cap both
// fall by twenty-five.
// M235 does the same for domain/filmInsights.ts's twelve — the four evidence lines of the Film
// Room's aggregation panel and its three provenance sources, which `FilmRoom.tsx` printed as
// `{insights.evidence.map((e) => …{e})}`: an expression, so the raw-UI scan saw no literal while
// the reader saw English. The focus line also stopped naming attributes through `attributeLabel`
// and rides as the `foci` code var instead, and the busiest detection rides as `event`.
// M236 empties domain/training.ts: its session title was composed in the module — the trained
// attribute labels joined with a plus and a " session" after them — and printed as a plain
// string in six places. It is trn.title.focus with the attrs code var now, and the eighteen
// catalogue labels M192 had to leave behind are deleted rather than keyed, because no screen
// ever read them.
const DOMAIN_PROSE_CEILING = 0;
// Modules whose prose is fully keyed. A milestone adds its module to this list in the
// same commit that empties it; nothing removes an entry without putting the words back.
// The three at the end hold no sentence at all once formats stop counting (M181 measured
// them at 1, 3 and 5 "literals" — an ISO date builder, three €-format arms and five
// scoreline templates), so pinning them now is free and stops a real sentence landing there.
// M225 adds domain/matchEngine.ts: unlike the three format-only modules above it held real
// sentences ("The midfield was finely balanced."), and they are rows now, so the module is
// pinned at zero like the rest.
const PROSE_ZERO = ["domain/load.ts", "domain/review.ts", "domain/history.ts", "domain/compare.ts", "domain/worldEngine.ts", "domain/playerDna.ts", "domain/scouting.ts", "domain/careerArc.ts", "domain/gap.ts", "domain/matchEngine.ts", "domain/newsImpact.ts", "domain/footprint.ts", "domain/filmInsights.ts", "domain/training.ts", "domain/onboarding.ts", "domain/attributes.ts", "domain/community.ts", "domain/career.ts", "domain/learn.ts"];
ok(`domain prose still on keys has not grown (${debtTotal} literals across ${debtFiles.length} files, ceiling ${DOMAIN_PROSE_CEILING})`,
  debtTotal <= DOMAIN_PROSE_CEILING);
// Per-module ceilings, so the debt cannot migrate: one global total lets a sentence move
// from `gap.ts` into `learn.ts` and still pass, which is how M178's per-file zero list was
// earned for files that had already emptied. These are the counts the inventory line below
// printed at M188 (sum 271 = the global ceiling); a milestone lowers its own number when it
// keys a module, and may never raise one.
const PROSE_CAPS = {
  "domain/learn.ts": 0,
  "domain/community.ts": 0,
  "domain/career.ts": 0,
  "domain/footprint.ts": 0,
  "domain/attributes.ts": 0,
  "domain/newsImpact.ts": 0,
  "domain/training.ts": 0,
  "domain/filmInsights.ts": 0,
  "domain/gap.ts": 0,
  "domain/matchEngine.ts": 0,
  "domain/careerArc.ts": 0,
  "domain/onboarding.ts": 0,
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
// M225 removed the two debt floors this clause used to carry (`debtFiles.length >= 10 &&
// debtTotal >= 250`). Publishing the Match Engine's eight lines as rows took the file count to
// 9 and the total to 248, and a floor on the quantity every milestone is trying to shrink goes
// red while the scanner is working perfectly — the contradiction M173 and M220 had already
// retired in the raw-UI census. What the two conjuncts stood for is measured where debt cannot
// satisfy it: the classifier by PROSE_SAMPLES (five sentences and five formats, each asserted in
// the direction it must land) and the total by the caps clause directly above, which pins the
// count exactly instead of bounding it. The population floor stays, because it is a fact about
// the tree rather than about the debt.
ok(`the scan walks the whole domain population (${debtFiles.length} of ${domainFiles.length} files carry debt, ${debtTotal} hits)`,
  domainFiles.length >= 30);

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
// M254 measured the last two: both were the question parser's regexes, whose apostrophes the
// literal scanner read as opening a string. `proseOnLine` strips regex literals first, so the
// file is at 0 — and a cap of 0 can only stay there.
// M345: proseDebt now runs every line through the scanner's own comment stripper first, so a
// block comment that QUOTES a sentence is no longer debt — it is documentation about the code.
// The measured count is still 0, which is the point of the change: the cap stays where the
// comment above says it may only stay, and the rule can no longer be reddened by a comment.
const EXTRA_PROSE = [{ path: "data/intelligence.ts", cap: 0 }];
for (const { path, cap } of EXTRA_PROSE) {
  const hits = proseDebt(path);
  ok(`${path} prose has not grown (${hits.length} literals, ceiling ${cap})`, hits.length <= cap);
}
// A cap of 0 is the shape that passes on a file the scan never read, so the vacuity device that
// used to require a hit is replaced by a plant: the same predicate the file scan uses must still
// report a real sentence AND still ignore the regex that was being charged. One clause each way,
// so neither a blind zero nor an over-eager strip can hide here.
const plantedProse = proseOnLine('const x = "The reader would see this sentence.";');
const plantedRegex = proseOnLine('const words = q.toLowerCase().replace(/[^a-z0-9\' -]/g, " ").split(/\\s+/);');
ok(`the prose rule still reports a sentence and still ignores a regex, so the zero above is measured and not a blind spot (${plantedProse.length} of 1 prose, ${plantedRegex.length} of 0 regex)`,
  plantedProse.length === 1 && plantedRegex.length === 0);
// proseDebt's own two-sided test. M345 put the comment stripper in front of the line walk, which
// is a change that can fail BOTH ways: a stripper that strips nothing raises the measured count
// on any file whose comments quote a sentence, and a stripper that strips too much would erase a
// real literal and turn debt into a false zero. So the same planted line is charged twice — once
// as a live string (must read 1, proving nothing was over-stripped) and once inside a block
// comment (must read 0, proving the stripper runs at all).
const plantedLive = stripComments('const x = "The reader would see this sentence.";').split("\n")
  .flatMap((l) => proseOnLine(l)).length;
const plantedComment = stripComments('/* const x = "The reader would see this sentence."; */\nconst y = 1;').split("\n")
  .flatMap((l) => proseOnLine(l)).length;
ok(`…and proseDebt reads code rather than comments, both ways: the same sentence as a live literal still counts (${plantedLive} of 1) and inside a block comment counts for nothing (${plantedComment} of 0)`,
  plantedLive === 1 && plantedComment === 0);
ok(`the extra prose allowances are respected (${EXTRA_PROSE.map((e) => `${e.path} ${proseDebt(e.path).length}/${e.cap}`).join(", ")})`,
  EXTRA_PROSE.every((e) => Number.isInteger(e.cap) && e.cap >= 0 && proseDebt(e.path).length <= e.cap));

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
// M267. The duplicate rule reads a length floor and a bucket map; a zero passes if either
// stopped working. The plant walks the same shape on a fixture pair that IS a duplicate — long
// enough to clear SENTENCE_MIN — and must be reported.
const plantedShared = (() => {
  const sentence = "This sentence is long enough to clear the length floor and be counted.";
  const buckets = new Map();
  for (const [k, v] of [["a.fake.one", sentence], ["a.fake.two", sentence]]) {
    if (v.trim().length < SENTENCE_MIN) continue;
    if (!buckets.has(v)) buckets.set(v, []);
    buckets.get(v).push(k);
  }
  return [...buckets.values()].filter((ks) => ks.length > 1).length;
})();
ok(`the sentence rule still reports a duplicate, so the zero above is measured and not a blind spot (${plantedShared} of 1)`,
  plantedShared === 1 && twiceCarried.length === 0);
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
// M248 retired the two exemption tables this census used to carry (`HOST_OK_NUMBER` for
// chart.tsx's number formatting, `HOST_OK_UNMOUNTED` for calendar.tsx): both files were
// deleted with their belt, because an .every over an empty table is green forever — a belt
// that cannot be the reason anything fails is not protection. M250 closes the last row of
// debt the census itself still named — Player OS's missed line, completed line and
// match-table date, all three now formatted through `formatDate(locale, ...)` — so the
// DATE_DEBT table goes with them, and the two clauses it fed (declare-or-grow, on a table
// that then held exactly one row) become one clause carrying the census's whole claim:
// zero sites ask the browser, ever. Its non-vacuity does not rest on the count. The
// planted-spelling self-test below proves the scanner still recognises every way of
// asking and none of the ways of telling, and the population pin proves the walk read
// the whole tree — so `0` here is a measured zero, not an empty set reporting clean.
ok(`no file formats an instant for the browser (${hostSites.map((s) => `${s.path}:${s.receiver}`).join(", ") || "0 sites anywhere in the app"}; one bare toLocale* call reddens this)`,
  hostSites.length === 0 && appSrc.size > 0);
// M312. This census is two regexes and a list of four argument shapes, and a zero passes if either
// half stopped working. The plant runs them — the SAME two pieces, not copies — over the four ways
// of asking the host and the three ways of telling it, so a green above cannot mean the classifier
// went quiet. The empty-argument form is the one that slips a hand-written check, because it is an
// argument list and therefore looks like a decision.
const plantAsksHost = (line) => {
  const m = new RegExp(LOCALE_CALL.source).exec(line);
  return m ? ASKS_THE_HOST.includes(firstArgOf(m[2])) : false;
};
const HOST_PLANTS = [
  ["d.toLocaleDateString()", true],
  ['d.toLocaleDateString(undefined, { month: "short" })', true],
  ['d.toLocaleDateString([], { month: "short" })', true],
  ['d.toLocaleDateString("default")', true],
  ["d.toLocaleDateString(locale)", false],
  ['d.toLocaleDateString("en-GB")', false],
  ["formatDate(locale, iso)", false],
];
const hostVerdicts = HOST_PLANTS.map(([line, want]) => [line, plantAsksHost(line) === want]);
ok(`the browser-locale classifier, planted both ways, still refuses all four ways of asking the host and accuses none of the three ways of telling it (${hostVerdicts.filter(([, v]) => !v).map(([l]) => l).join(", ") || "all 7 as declared"})`,
  hostVerdicts.every(([, v]) => v));
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
  falseControls.length === 0 && HOST_CONTROLS.length > 0);
ok(`the census scanned the app rather than an empty set (${appSrc.size} source files against pin ${APP_SRC_PIN}, ${hostSites.length} browser-locale sites left)`,
  appSrc.size === APP_SRC_PIN);
// (b) The door is the only formatter, and it takes the reader's locale.
const DOOR_CALLS = callsOf("formatDate");
const unresolvedDoor = DOOR_CALLS.filter((c) => !c.args);
// M313: the two argument tests are NAMED, because the plant below has to run the same expressions
// these filters run. Its first draft re-wrote them inline, which made it a second reader of the
// same idea — neutering either filter left the plant green, so it was guarding nothing. That is the
// failure this file already names for `callArgs` ("two scanners over the same source is two chances
// to disagree"), applied to a test instead of a scanner.
const isLiteralFirstArg = (args) => /^["'`]/.test((args?.[0] ?? "").trim());
const firstArgIsReaderLocale = (args) => /(^|[.\w$])locale$/.test((args?.[0] ?? "").trim());
const literalLocale = DOOR_CALLS.filter((c) => isLiteralFirstArg(c.args));
const noLocaleArg = DOOR_CALLS.filter((c) => !firstArgIsReaderLocale(c.args));
const doorFiles = [...new Set(DOOR_CALLS.map((c) => c.path))];
const IMPORT_DOOR = /import\s*\{[^}]*\bformatDate\b[^}]*\}\s*from\s*"@\/i18n(\/format)?"/;
const unimportedDoor = doorFiles.filter((p) => !IMPORT_DOOR.test(appSrc.get(p) ?? ""));
const otherDoors = [...appSrc].filter(([, code]) => /new Intl\.DateTimeFormat\(/.test(code)).map(([p]) => p);
ok(`every formatDate call resolves and none was mis-parsed (${DOOR_CALLS.length} calls, ${unresolvedDoor.length} unresolved)`,
  unresolvedDoor.length === 0);
// M313. The three clauses that follow read one call census and two argument tests over it, and each
// is a zero that passes if its reader stopped working. The plant runs the SAME readers — `callArgs`,
// then the literal test, then the locale test — over the four shapes the door's contract names: the
// reader's locale passes all three, a literal locale is caught by the second, and a first argument
// that is not a locale variable is caught by the third. A fixture that stopped resolving is planted
// too, because "no call was mis-parsed" and "every call resolved" are the same sentence read twice.
const plantDoorArgs = (line) => {
  const open = line.indexOf("formatDate(") + "formatDate".length;
  const args = callArgs(line, open);
  // The two tests come from the filters above, not from copies of them.
  return { resolves: Boolean(args), literal: isLiteralFirstArg(args), notLocale: !firstArgIsReaderLocale(args) };
};
// The expectations are what the two tests ACTUALLY say, read off the fixtures rather than assumed:
// a literal locale is charged by both tests (it is not the reader's locale either), and an
// unparseable call is charged by the third as well as the first — which is correct, since a call
// that did not resolve is a defect whichever clause reads it.
const DOOR_PLANTS = [
  ["formatDate(locale, iso)", true, false, false],
  ['formatDate("en-GB", iso)', true, true, true],
  ["formatDate(undefined, iso)", true, false, true],
  ["formatDate(reader, iso)", true, false, true],
  ["formatDate(", false, false, true],
];
const doorVerdicts = DOOR_PLANTS.map(([line, wantResolves, wantLiteral, wantNotLocale]) => {
  const v = plantDoorArgs(line);
  return [line, v.resolves === wantResolves && v.literal === wantLiteral && v.notLocale === wantNotLocale];
});
ok(`the door's argument readers, planted both ways, still pass the reader's locale and still catch a literal locale, a non-locale first argument and an unparseable call (${doorVerdicts.filter(([, v]) => !v).map(([l]) => l).join(", ") || "all 5 as declared"})`,
  doorVerdicts.every(([, v]) => v));
ok(`no formatDate call passes a literal locale — that renders one language for everyone (${literalLocale.map((c) => `${c.path}:${c.line}`).join(", ") || "none"})`,
  literalLocale.length === 0 && DOOR_CALLS.length > 0);
ok(`every formatDate call's first argument is the reader's locale (${noLocaleArg.map((c) => `${c.path}:${c.line}[${(c.args?.[0] ?? "").trim()}]`).join(", ") || "all clear"})`,
  noLocaleArg.length === 0 && DOOR_CALLS.length > 0);
ok(`every file that formats a date imports the door from @/i18n (${unimportedDoor.join(", ") || "none missing"})`,
  unimportedDoor.length === 0 && doorFiles.length > 0);
// The umbrella's export list is read, not matched against one remembered name: check 26c
// imports `relativeDay` through it, so a rewrite that dropped it back to `{ formatDate }`
// would break that clause by accident rather than report the door being unreachable. Neither
// side of the claim is a hand-typed list now — the doors come from `format.ts`'s own
// declarations and the asks come from what non-i18n files import from "@/i18n", which is also
// what lets M215's third door stay a module-only door instead of being padded into the list.
const umbrellaSrc = readFileSync(join(root, "i18n", "index.tsx"), "utf8");
const umbrellaNames = ((umbrellaSrc.match(/export\s*\{([^}]*)\}\s*from\s*"\.\/format"/) ?? [])[1] ?? "")
  .split(",").map((s) => s.trim()).filter(Boolean);
const doorDecls = [...readFileSync(join(root, "i18n", "format.ts"), "utf8").matchAll(/^export function (\w+)/gm)].map((m) => m[1]);
const importedNames = new Set();
for (const [p, code] of allSrc) {
  if (p.startsWith("i18n/")) continue;
  for (const m of code.matchAll(/import\s*\{([^}]*)\}\s*from\s*"@\/i18n"/g)) {
    for (const n of m[1].split(",").map((s) => s.trim().split(/\s+as\s+/)[0].replace(/^type\s+/, "")).filter(Boolean)) importedNames.add(n);
  }
}
const doorsAsked = doorDecls.filter((n) => importedNames.has(n));
const phantomDoors = umbrellaNames.filter((n) => !doorDecls.includes(n));
const unreachableDoors = doorsAsked.filter((n) => !umbrellaNames.includes(n));
ok(`the umbrella re-exports exactly the doors outside i18n/ ask for (${doorDecls.length} doors declared in format.ts, ${importedNames.size} names imported from @/i18n, ${doorsAsked.length} of them doors: ${doorsAsked.join(", ")}) — phantom ${phantomDoors.join(", ") || "none"}, unreachable ${unreachableDoors.join(", ") || "none"}`,
  doorDecls.length >= 3 && importedNames.size >= 3 && doorsAsked.length >= 2 &&
  unreachableDoors.length === 0 && phantomDoors.length === 0);
ok(`the door is the ONE door — nothing else constructs a formatter (${otherDoors.join(", ") || "none"})`,
  otherDoors.length === 0 && DOOR_CALLS.length > 0);
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
  ragLiteralLocale.length === 0 && RAG_CALLS.length > 0);
ok(`every askIntelligence call hands over the live locale (${ragNoLocale.map((c) => `${c.path}:${c.line}[${(c.args?.[1] ?? "").trim()}]`).join(", ") || "all clear"})`,
  ragNoLocale.length === 0);
ok(`the RAG entry point requires a Locale rather than defaulting it (${RAG_DECL})`,
  /^\w+: string,\s*locale: Locale$/.test(RAG_DECL.trim()));

// (c) A label built out of date parts by hand never calls a formatter, so (a) cannot see
//     it. What is allowed here is a grouping KEY — `YYYY-MM-DD`, padded, compared against
//     another key and never shown — so the single centralized builder must still have that shape.
// M348 centralized the day key in domain/history.ts (the dayKey function); HistoryPage.tsx now
// calls it rather than duplicating the arithmetic.
const HAND = /`[^`]*\$\{[^}]*\.get(?:Month|Date|FullYear)\(\)[^`]*`/g;
const DAY_KEY_FILES = { "domain/history.ts": 1 };
const ISO_KEY = /^\$\{[\w.]+\.getFullYear\(\)\}-\$\{[^}]*padStart\(2, ?"0"\)\}-\$\{[^}]*padStart\(2, ?"0"\)/;
const handSites = [];
for (const [path, code] of appSrc) {
  for (const m of code.matchAll(HAND)) handSites.push({ path, text: m[0], isKey: ISO_KEY.test(m[0].replace(/^`/, "")) });
}
const handByFile = (p) => handSites.filter((s) => s.path === p).length;
const badHand = handSites.filter((s) => !s.isKey || DAY_KEY_FILES[s.path] === undefined);
const lostHand = Object.entries(DAY_KEY_FILES).filter(([p, n]) => handByFile(p) !== n);
ok(`no hand-assembled date label reaches a screen (${badHand.map((s) => `${s.path} ${s.text.slice(0, 34)}`).join(" | ") || "none"})`,
  badHand.length === 0 && handSites.length > 0);
ok(`the declared ISO day keys are still there and still keys (${lostHand.map(([p, n]) => `${p} ${handByFile(p)}/${n}`).join(", ") || "all in place"})`,
  lostHand.length === 0);
ok(`the day-key scan is reading the builders it claims (${handSites.length})`, handSites.length === 1);

// (c') A day count that leaves the gate gives a shared row a second meaning. The feed's
//     relative-time helper divides elapsed hours by 24 — honest for minutes and hours, but
//     a day is what the wall calendar settles (M216) — and printed its own count into the
//     same day row the dashboard reads from `relativeDay`, so one row aged a thread in
//     24-hour blocks on one screen and in midnights crossed on another. M304 routes the
//     feed's day branch through the gate: the helper no longer names the day row at all,
//     and a month-old thread falls back to an absolute date.
const feedSrc = appSrc.get("features/community/CommunityHub.tsx") ?? "";
const feedAgoDay = (feedSrc.match(/time\.agoDay/g) ?? []).length;
const feedGate = /relativeDay\(locale/.test(feedSrc);
ok(`the feed's day branch asks the calendar-day gate rather than counting its own (relativeDay call ${feedGate ? "present" : "MISSING"}, inline day-row names ${feedAgoDay})`,
  feedGate && feedAgoDay === 0);

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
const DOOR_ALIASES = new Set(["formatDate", "fmtDateTime", "relativeDay"]);
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
  SURGERY.length === 0 && DOOR_ALIASES.size > 0);
ok(`and no formatted value is laundered through a local and then edited (${LAUNDERED.length === 0 ? "0 holders edited" : LAUNDERED.join(", ")} of ${DOOR_CALLS.length} door call sites)`,
  LAUNDERED.length === 0 && DOOR_CALLS.length > 0);
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
  falseSurgery.length === 0 && SURGICAL_CONTROLS.length > 0);
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

// 34. A PROOF that reads a RowText asks the shipped interpreter what the row says.
//
// M230 and M231 put the app's sentences on rows: a provider hands the interface `{key, vars}`
// and `domain/rowText.ts`'s `rowLine` is the only thing that knows what a row means — it
// rejoins a comma list of stat codes for the reader (CODE_VARS), resolves a var whose VALUE is
// itself a dictionary key (KEY_VARS), and takes the locale from the reader rather than from
// the file's own preference. Two proofs carried a private resolver anyway. The verbatim text
// `scripts/proof-m74.mjs` shipped with is kept below as the classifier's refuse fixture:
//
//   const tpl = dict[row.key];
//   return Object.entries(row.vars ?? {}).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), tpl);
//
// That is a brace filler, and a dictionary template is all the row used to be, so it reads
// green while the reader is being shown something else. Measured on the coach's own rows in
// `dev/m232-resolve.mjs`, the substitute and `rowLine` disagreed on 12 of the 18 rows the
// proof resolved, and the row that mattered most reached the assertion as `passing` where the
// screen renders `Passing` — proof:m74's own claim was `/Passing/i`, a regex written to be
// satisfied by the thing it was trying to forbid. The gate has to be structural, because the
// failure was invisible: a second interpreter is not wrong on the day it is written, it drifts
// the day the first one learns a new word.
//
// Three things make a file a violator, all read out of the comment-stripped source so prose
// can neither accuse nor excuse: it reads a dictionary, it indexes that dictionary with a
// ROW's `key`, and it substitutes `{brace}` placeholders by hand — and it never obtains the
// interpreter. The third condition is what keeps this gate from flagging a gate: counting the
// placeholders a template declares (checks 1-3 of this very file) and looking a plain label up
// by key are not resolving a row, and both are accepted shapes below. The excuse is an
// import of `./lib/rows.mjs` or a load of `/domain/rowText.ts` — a real acquisition of the
// interpreter, not the word `rowLine` appearing in a comment.
const PROOF_ROW_DICT = /\bDICTIONARIES\b|i18n\/dictionaries/;
const PROOF_ROW_BY_KEY = /[\w$)\]]\s*\??\.\s*[\w$]*\s*\[\s*[\w$]+\.key\s*\]|[\w$)\]]\s*\[\s*[\w$]+\.key\s*\]/;
const PROOF_ROW_FILL = [
  ["a replaceAll on a brace template", /\.replace(?:All)?\(\s*[`'"][^`'"\n]*\{/],
  ["a replace on a regex mentioning a brace", /\.replace(?:All)?\(\s*\/[^/\n]*\\\{[^/\n]*\//],
  ["a split-and-rejoin on a brace", /\.split\(\s*["'`]\{/],
];
const PROOF_ROW_SEAM = /\.\/lib\/rows\.mjs|\/domain\/rowText\.ts/;
const proofRowFiller = (src) => {
  const code = codeOf(src);
  const fills = PROOF_ROW_FILL.filter(([, re]) => re.test(code)).map(([n]) => n);
  return {
    dict: PROOF_ROW_DICT.test(code),
    byKey: PROOF_ROW_BY_KEY.test(code),
    fills,
    seam: PROOF_ROW_SEAM.test(code),
    bypass: PROOF_ROW_DICT.test(code) && PROOF_ROW_BY_KEY.test(code) && fills.length > 0 && !PROOF_ROW_SEAM.test(code),
  };
};
const proofScripts = [
  ...readdirSync(join(root, "scripts")).filter((f) => /^proof-.*\.mjs$/.test(f)).map((f) => `scripts/${f}`),
  ...readdirSync(join(root, "scripts", "lib")).filter((f) => f.endsWith(".mjs")).map((f) => `scripts/lib/${f}`),
].sort();
const proofRowsOf = proofScripts.map((p) => [p, proofRowFiller(readFileSync(join(root, ...p.split("/")), "utf8"))]);
const proofBypassers = proofRowsOf.filter(([, c]) => c.bypass).map(([p, c]) => `${p} (${c.fills.join(", ")})`);
const proofDictReaders = proofRowsOf.filter(([, c]) => c.dict).map(([p]) => p);
const proofKeyReaders = proofRowsOf.filter(([, c]) => c.byKey).map(([p]) => p);
const proofSeamUsers = proofRowsOf.filter(([, c]) => c.seam).map(([p]) => p);
ok(`no proof resolves a RowText with its own interpreter (${proofRowsOf.length} scripts, ${proofDictReaders.length} read a dictionary, ${proofKeyReaders.length} of them by a row's key (${proofKeyReaders.map((p) => p.split("/").pop()).join(", ")}), ${proofSeamUsers.length} hold the seam, ${proofBypassers.length} hand-rolled${proofBypassers.length ? ": " + proofBypassers.join(" ") : ""})`,
  proofBypassers.length === 0);
ok(`the census read the suite's own scripts rather than an empty set (${proofRowsOf.length} files, ${proofDictReaders.length} dictionary readers, ${proofSeamUsers.length} seam users)`,
  proofRowsOf.length >= 30 && proofDictReaders.length >= 5 && proofSeamUsers.length >= 5);
ok(`and the two files this milestone converted are inside the population it cleared (proof-m74.mjs, proof-m77.mjs)`,
  ["scripts/proof-m74.mjs", "scripts/proof-m77.mjs"].every((p) => proofRowsOf.some(([x]) => x === p)));
// The classifier is tested on shapes, not on a count, for the reason M194 learned: a census of
// a debt that is being paid cannot prove itself by finding the debt. Refuse side, the removed
// resolver included verbatim; accept side, the five shapes a legitimate dictionary reader
// writes. The same function adjudicates both and the live population, so a classifier that
// went blind on a spelling would show here rather than turn the census green.
const PROOF_ROW_VERBATIM = [
  'const { DICTIONARIES } = await server.ssrLoadModule("/i18n/dictionaries.ts");',
  'function resolve(row, dict = DICTIONARIES.en) {',
  '  if (Array.isArray(row)) return row.map(r => resolve(r, dict)).join(" ");',
  '  const tpl = dict[row.key];',
  '  if (!tpl) return row.key;',
  '  return Object.entries(row.vars ?? {}).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), tpl);',
  '}',
].join("\n");
const PROOF_ROW_REFUSE = [
  ["the resolver proof:m74 shipped until M232", PROOF_ROW_VERBATIM],
  ["a regex-filled variant", 'const { DICTIONARIES } = await server.ssrLoadModule("/i18n/dictionaries.ts");\nconst s = (row) => DICTIONARIES.en[row.key].replace(/\\{(\\w+)\\}/g, (_, k) => row.vars[k]);'],
  ["a split-and-rejoin variant", 'import { DICTIONARIES } from "@/i18n/dictionaries";\nconst s = (row) => DICTIONARIES.en[row.key].split("{").map((x) => x.includes("}") ? row.vars[x.split("}")[0]] : x).join("");'],
];
const PROOF_ROW_ACCEPT = [
  ["the shared seam", 'import { makeSay } from "./lib/rows.mjs";\nconst { say } = await makeSay(server);\nconst line = say("en")(row);'],
  ["rowLine loaded straight", 'const { rowLine } = await server.ssrLoadModule("/domain/rowText.ts");\nconst line = rowLine(row, t);'],
  ["a gate counting a template's placeholders", 'const left = (DICTS[id][k].match(/\\{\\w+\\}/g) ?? []).join();'],
  ["a plain keyed label lookup with no vars", 'const v = DICTIONARIES[loc.id]?.[spec.labelKey];'],
  ["a JSX attribute brace scan", 'const gates = featureSource.match(/disabled=\\{[^}]*!online[^}]*\\}/g) ?? [];'],
  // The other half of the seam. Mutation arm a3 of this milestone removed
  // `/domain/rowText.ts` from PROOF_ROW_SEAM and the census did not blink, because no script in
  // the suite takes that route — an accepted shape nothing tests is a spelling, not a witness.
  // This fixture is a file that DOES hold the interpreter that way and also reads a dictionary,
  // indexes by a row's key and fills a brace, so it is excused by the seam alone and the seam
  // alone is what the arm can break.
  ["the interpreter loaded straight, alongside a real dictionary read", 'const { rowLine } = await server.ssrLoadModule("/domain/rowText.ts");\nconst { DICTIONARIES } = await server.ssrLoadModule("/i18n/dictionaries.ts");\nconst line = rowLine(row, t);\nconst note = DICTIONARIES.en[row.key].replaceAll("{focus}", row.vars.focus);'],
];
const missedFillers = PROOF_ROW_REFUSE.filter(([, src]) => !proofRowFiller(src).bypass).map(([n]) => n);
const accusedHonest = PROOF_ROW_ACCEPT.filter(([, src]) => proofRowFiller(src).bypass).map(([n]) => n);
ok(`the classifier catches all ${PROOF_ROW_REFUSE.length} ways of hand-resolving a row, the removed one included (${missedFillers.join(", ") || "all caught"})`,
  missedFillers.length === 0);
ok(`and none of the ${PROOF_ROW_ACCEPT.length} shapes that read a dictionary without resolving a row (${accusedHonest.join(", ") || "no false accusations"})`,
  accusedHonest.length === 0 && PROOF_ROW_ACCEPT.length > 0);
ok(`so the census is a shape test with both ends demonstrated (${PROOF_ROW_REFUSE.length} refused + ${PROOF_ROW_ACCEPT.length} accepted shapes, through the same classifier that just cleared ${proofRowsOf.length} scripts)`,
  proofRowFiller(PROOF_ROW_VERBATIM).fills.length > 0 && proofDictReaders.includes("scripts/proof-i18n.mjs"));

// 35. An enum value that reaches the glass as a label. Every check above needs a key to look
//     at: 4 reads a `t("…")` literal, 16/17 audit a declared dynamic site, the raw-UI census
//     counts a literal sitting in a display slot. A badge written `{n.kind}` has none of the
//     three — the word arrives out of a record field, so an English reader sees a finished
//     label while a 简体中文 reader sees the model's own code, and the gate stays green for
//     both. M249 moved the five news-kind strips onto `newsKindLabel`, the composer
//     `domain/rowText.ts` already used for the impact panel's sentence; this section charges
//     the class at both ends. The render sites are a wiring table with literal pins, the shapes
//     they must not fall back to are derived from the union itself and tested against a plant,
//     and the words come out of the shipped function rather than out of a string this gate typed.
const KIND_WIRING = [
  ["features/dashboard/Dashboard.tsx", "newsKindLabel(n.kind, t)", 1],
  ["features/football/FootballWorld.tsx", "newsKindLabel(n.kind, t)", 2],
  ["features/transfers/TransferCentre.tsx", "newsKindLabel(k, t)", 1],
  ["features/transfers/TransferCentre.tsx", "newsKindLabel(r.kind, t)", 1],
];
const KIND_FILES_PIN = 3;
const KIND_POSITIONS_PIN = 5;
const KIND_IMPORT = /^import \{[^}]*\bnewsKindLabel\b[^}]*\} from "@\/domain\/rowText"/m;
const kindFiles = [...new Set(KIND_WIRING.map(([p]) => p))];
const badgeSrc = new Map(kindFiles.map((p) => [p, appSrc.get(p) ?? ""]));
const kindCallsIn = (p, needle) => badgeSrc.get(p).split(needle).length - 1;
const kindBad = KIND_WIRING.filter(([p, expr, n]) => kindCallsIn(p, expr) !== n)
  .map(([p, expr, n]) => `${p} wants ${expr} x${n}, found ${kindCallsIn(p, expr)}`);
const kindPositions = KIND_WIRING.reduce((s, [, , n]) => s + n, 0);
ok(`the ${kindFiles.length} screens that show what a news story claims read it through the shared composer at all ${kindPositions} position(s) (pins ${KIND_FILES_PIN} files/${KIND_POSITIONS_PIN} positions), and each imports it from domain/rowText (${kindBad.join(" | ") || "none"})`,
  kindBad.length === 0 && kindPositions > 0 && kindFiles.length === KIND_FILES_PIN && kindPositions === KIND_POSITIONS_PIN &&
  kindFiles.every((p) => KIND_IMPORT.test(badgeSrc.get(p))));
// What the class falls BACK to is derived, not typed: the union's own codes and the display
// slots they would appear in. The plant runs through the same two predicates, because "0 found"
// is only evidence once something proves the walker was looking. The set it walked is the file's
// own population pin rather than a floor: `appSrc.size >= 60` stayed green in the witness arm
// that drops two of the 95 screens, so the clause could report "none of 93" and call that a
// clean tree (M249 arm W5).
const BARE_KIND_CHILD = />\s*\{[^{}]*\.kind\}\s*</g;
const bareHits = (code) => [...code.matchAll(BARE_KIND_CHILD)].length;
const KIND_CODES = spaceOf("domain/types.ts", /export const NEWS_KINDS[^=]*=[\s\S]*?\];/, /"([A-Za-z]+)"/g);
const KIND_WORD_SLOTS = KIND_CODES.flatMap((k) => [`>${k}<`, `label="${k}"`]);
const bareKindSites = [...appSrc].filter(([, code]) => bareHits(code) > 0).map(([p, code]) => `${p} x${bareHits(code)}`);
const typedKindWords = [...appSrc]
  .filter(([p]) => /^(features|ui)\//.test(p))
  .filter(([, code]) => KIND_WORD_SLOTS.some((s) => code.includes(s)))
  .map(([p]) => p);
const KIND_PLANT = 'export const C = ({ n }: any) => (\n  <>\n    <Badge>{n.kind}</Badge>\n    <span>Confirmed</span>\n  </>\n);';
const plantWord = KIND_WORD_SLOTS.some((s) => codeOf(KIND_PLANT).includes(s));
ok(`no module prints a stored kind straight into a label slot (${bareKindSites.join(", ") || "none"} of ${appSrc.size}) and no screen types one of the union's ${KIND_CODES.length} words into a text node or a label prop (${typedKindWords.join(", ") || "none"}), while the planted screen is caught by both halves (bare ${bareHits(codeOf(KIND_PLANT))}, word ${plantWord})`,
  bareKindSites.length === 0 && typedKindWords.length === 0 && appSrc.size === APP_SRC_PIN &&
  bareHits(codeOf(KIND_PLANT)) === 1 && plantWord);
// The filter chip is the one site whose label was a bare LOOP VARIABLE, and a name-based ban
// cannot reach it: `>{k}<` is legitimate in features/settings/SettingsPage.tsx:234, whose `k` is
// a prop already holding resolved words. So the chip is read from the loop the file itself
// declares, and the plant is that loop's previous shape. The refusal is aimed at the CHILD slot
// only: the same loop keeps `key={k}`, which must stay the code — the first draft of this clause
// asked whether the block contained `{k}` at all, and went red on React's key.
const CHIP_LOOP = /kinds\.map\(\(k\) =>[\s\S]*?<\/button>/;
const chipBlock = badgeSrc.get("features/transfers/TransferCentre.tsx").match(CHIP_LOOP)?.[0] ?? "";
const CHIP_PLANT = 'kinds.map((k) => (\n  <button key={k}>{k}</button>\n))';
const chipBlockOf = (code) => code.match(CHIP_LOOP)?.[0] ?? "";
const bareChipVar = (block) => />\s*\{k\}\s*</.test(block);
ok(`the Transfer Centre's own kind loop hands its chip to the composer, not to the code (${chipBlock.length} chars read, bare child ${bareChipVar(chipBlock)}), keeping React's key={k} as the code it is (${/key=\{k\}/.test(chipBlock)}), and the same extractor reports the planted loop (${chipBlockOf(CHIP_PLANT).length} chars, bare ${bareChipVar(chipBlockOf(CHIP_PLANT))})`,
  chipBlock.length > 0 && !bareChipVar(chipBlock) && chipBlock.includes("newsKindLabel(k, t)") &&
  /key=\{k\}/.test(chipBlock) && chipBlockOf(CHIP_PLANT).length > 0 && bareChipVar(chipBlockOf(CHIP_PLANT)));
// One composer, checked by count rather than by trust: a screen that builds `ni.kind.…` inline
// would render correctly in English, keep check 17 green (the key still resolves) and start a
// second spelling of the union's lowercase rule — which is exactly how Rumor/Rumour drifts.
const COMPOSED_KIND = /`ni\.kind\.\$\{/g;
const composedHits = (code) => [...code.matchAll(COMPOSED_KIND)].length;
const composers = [...appSrc].filter(([, c]) => composedHits(c) > 0).map(([p, c]) => `${p} x${composedHits(c)}`);
const COMPOSER_FILE_PIN = 1;
const COMPOSER_SITE_PIN = 1;
const COMPOSE_PLANT = 'const w = (k: string) => t(`ni.kind.${k.toLowerCase()}`);';
ok(`exactly ${COMPOSER_FILE_PIN} module composes a ni.kind. key and it is the composer, not a screen (${composers.join(", ") || "none"}, pins ${COMPOSER_FILE_PIN}/${COMPOSER_SITE_PIN}), while a screen that builds the key inline is caught (${composedHits(codeOf(COMPOSE_PLANT))})`,
  composers.length === COMPOSER_FILE_PIN && composers[0] === "domain/rowText.ts x1" &&
  composedHits(appSrc.get("domain/rowText.ts")) === COMPOSER_SITE_PIN &&
  composedHits(codeOf(COMPOSE_PLANT)) === 1);
// The behavioural half, through the shipped door. The loaded module is bound to the file this
// gate just read by that file's own declaration list, because "the module loaded" is otherwise
// green no matter WHICH module loaded (M238).
const rtDeclared = [...(appSrc.get("domain/rowText.ts") ?? "").matchAll(/^export (?:const|function) (\w+)/gm)].map((m) => m[1]).sort();
const rowTextModule = await server.ssrLoadModule("/domain/rowText.ts");
const rtLoaded = Object.keys(rowTextModule).filter((k) => typeof rowTextModule[k] === "function").sort();
ok(`the module loaded as the composer is the file this gate read (${rtDeclared.length} declared export(s): ${rtDeclared.join(", ")})`,
  rtDeclared.length >= 3 && rtDeclared.includes("newsKindLabel") && rtLoaded.join() === rtDeclared.join());
const { NEWS_KINDS: RUNTIME_KINDS } = await server.ssrLoadModule("/domain/types.ts");
const tReader = (id) => (key, vars) => translate(id, key, vars);
const kindReadBad = [];
// How many of the readings are a word the CODE does not already spell. Four of the five article
// types are English words in their own right ("Confirmed", "Reported", "Opinion", "Analysis"), so
// for those an en reading cannot tell resolution apart from `codeWord`'s unknown-code fallback —
// which is why the equality claim below is qualified by this count instead of by "never the code".
let kindReadDiffer = 0;
if ([...RUNTIME_KINDS].sort().join() !== KIND_CODES.slice().sort().join()) {
  kindReadBad.push(`the source parse and the runtime union disagree (${KIND_CODES.join(", ")} / ${RUNTIME_KINDS.join(", ")})`);
}
for (const { id } of L) {
  for (const code of KIND_CODES) {
    const shown = rowTextModule.newsKindLabel(code, tReader(id));
    const want = D[id][`ni.kind.${code.toLowerCase()}`];
    if (shown.startsWith("ni.kind.")) kindReadBad.push(`${id}: ${code} prints the key`);
    else if (shown !== want) kindReadBad.push(`${id}: ${code} prints “${shown}” while the dictionary says “${want}”`);
    else if (shown !== code) kindReadDiffer++;
  }
}
ok(`the shipped newsKindLabel answers all ${KIND_CODES.length} article types in all ${L.length} locales with the dictionary's own word and never a key (${kindReadBad.join(" | ") || "no bad reading"}), and ${kindReadDiffer}/${KIND_CODES.length * L.length} of those words are not the code already spelled — the pin that keeps the equality load-bearing rather than tautological`,
  KIND_CODES.length === 5 && kindReadBad.length === 0 && kindReadDiffer === 11);
// The mechanism that makes the count above mean something: an unknown code falls through and is
// printed exactly as written. Without that fallback surviving, "equals the dictionary word" would
// be true of any string the composer returned.
ok(`and the fallback the readings are measured against is real: a code outside the union comes back as written (${rowTextModule.newsKindLabel("Planted", tReader("en"))})`,
  rowTextModule.newsKindLabel("Planted", tReader("en")) === "Planted");
// The one visible change this milestone makes to an English reader, stated rather than hidden:
// the badge took the dictionary's spelling, which is the spelling every other English string in
// the app already uses (transfers.statLinks "Linked rumours", ni.stance.rumor "Unverified
// rumour"). One vocabulary, and no second key for a word the dictionary already carries.
ok(`and the English badge changes spelling, not meaning: Rumor now reads the word the dictionary holds (${en["ni.kind.rumor"]})`,
  rowTextModule.newsKindLabel("Rumor", tReader("en")) === en["ni.kind.rumor"] && en["ni.kind.rumor"] !== "Rumor");

// ─── 36 · the two Chinese locales audit each other (M251) ──────────────────────
// M143's failure was inheritance (`...zhCN` at the head of the zh-TW block), and the
// gate's standing answer has been proof-graph's five-key sample: correct per key,
// blind to the shape of the failure — a zh-TW that copies zh-CN value-by-value while
// keeping every key its own passes it, because the five keys it still writes itself
// happen to be in the sample. What follows is corpus-wide, and it learns its own
// definition of "a glyph the traditional script does not write" from the corpus
// instead of from a hand-typed list — two hand-typed attempts were measured first and
// thrown away: index-aligned pair diffing harvested offset noise (球/分/名 appeared as
// "simplified" because a length-equal pair shifted by one), and a hand-written
// simplified set carried the shared glyph 慢, so both produced hundreds of false leaks
// on a dictionary that has none. The rule that survived measurement is a rate
// differential: a character written by >= 8 zh-CN values but by at most a tenth of
// that many zh-TW values is, by construction, one this traditional corpus all but
// never writes. The tenth (not zero) is what keeps a single leaked glyph inside the
// learned set instead of teaching the learner to ignore it. Check 7 above calls its
// sixteen characters a closed list and not a converter, and names "check 6 plus review"
// as the general defence; this section is that defence, written down.
const zhKeys = Object.keys(D["zh-CN"]);
const rateIn = (dict, ch) => zhKeys.filter((k) => String(dict[k]).includes(ch)).length;
const corpusChars = new Set();
for (const k of zhKeys) for (const ch of String(D["zh-CN"][k]) + String(D["zh-TW"][k])) if (/[㐀-鿿]/.test(ch)) corpusChars.add(ch);
const learnedGlyphs = [...corpusChars].filter((ch) => {
  const rc = rateIn(D["zh-CN"], ch);
  return rc >= 8 && rateIn(D["zh-TW"], ch) * 10 <= rc;
});
// Non-vacuity for the learner, and the reason it is a size and not a per-glyph claim:
// a zh-TW that became a value-by-value copy of zh-CN lifts every simplified glyph's
// zh-TW rate toward its zh-CN rate, and glyphs leave this set until it is empty — the
// M143 failure again, red here rather than as a quiet "0 leaks" from a scanner with
// nothing left to compare. The planted word below is the second half of the same belt.
ok(`the corpus learns which glyphs only the simplified script writes (${learnedGlyphs.length} glyphs, e.g. ${learnedGlyphs.slice(0, 8).join("")})`,
  learnedGlyphs.length >= 100);
const plantedWord = "训练";
const plantedCaught = [...plantedWord].every((ch) => learnedGlyphs.includes(ch));
ok(`and the learned set is a working detector, not a number: a planted simplified word (${plantedWord}) is inside it (${plantedCaught})`,
  plantedCaught);
const leakSet = new Set(learnedGlyphs);
const leakIn = (v) => [...String(v)].some((ch) => leakSet.has(ch));
const twLeaks = zhKeys.filter((k) => leakIn(D["zh-TW"][k]));
// The belt on this half runs through the same `leakIn` the assertion uses: a scan
// blinded to its own input still has to answer for the word planted inside it.
ok(`no zh-TW value carries a glyph the traditional corpus never writes (${twLeaks.slice(0, 5).map((k) => `${k}=${D["zh-TW"][k]}`).join(" | ") || `${twLeaks.length} of ${zhKeys.length} values`}; planted word caught: ${leakIn(plantedWord)})`,
  twLeaks.length === 0 && leakIn(plantedWord));
// The second contract, and the one a key-level parity check cannot state: three locales
// may hold different words for the same sentence but must hold the same VARIABLES, or
// one locale's reader gets a literal `{shown}` where another gets a number. Counts are
// compared too — `{n} … {n}` twice is a different sentence from `{n} …` once.
const phOf = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
const phDrift = zhKeys.filter((k) => phOf(en[k]) !== phOf(D["zh-CN"][k]) || phOf(en[k]) !== phOf(D["zh-TW"][k]));
const plantedDrift = phOf("you finished {n} of {n}") !== phOf("you finished {n}");
ok(`every value carries the same set of template variables in all three locales, counts included (${phDrift.length} drifting${plantedDrift ? "" : "; PLANTED DRIFT CAUGHT NOTHING"})`,
  phDrift.length === 0 && zhKeys.length >= 1000 && plantedDrift);
// The third: a zh-CN value that never left English. One key is allowed to stay — the
// brand, which is the same in all three scripts — and it is named rather than counted,
// so a second untranslated value cannot arrive without a line in this table saying why.
// The predicate is a function so the planted witness walks the SAME two tests (the
// equality and the Latin scan) that the corpus filter walks, in all three arrangements:
// equal-and-English, equal-and-not-English, and not-equal — an inversion of either
// half must redden this clause, not just a change to its filter line.
const ENGLISH_OK = new Set(["brand.name"]);
const stillEnglishBy = (enVal, cnVal) => cnVal === enVal && /[A-Za-z]{3,}/.test(String(enVal).replace(/\{\w+\}/g, ""));
const stillEnglish = zhKeys.filter((k) => stillEnglishBy(en[k], D["zh-CN"][k]));
const plantedEn = stillEnglishBy("Click here {n}", "Click here {n}")
  && !stillEnglishBy("完成 {n}", "完成 {n}")
  && !stillEnglishBy("Click here", "完成");
ok(`a 简体中文 value that is still English is named, not waved through (${stillEnglish.join(", ") || "none"}; planted arrangements: ${plantedEn})`,
  stillEnglish.every((k) => ENGLISH_OK.has(k)) && ENGLISH_OK.size === 1 && plantedEn);

// 37. The shapes a t() call takes that the checks above were never looking at. Check 4 reads
//     `t("literal")` and check 16/24 audit declared dynamic sites, so between them every key a
//     call NAMES is accounted for — but the way the key ARRIVES is a second axis. Four shapes
//     already have a contract: a literal is check 24's forward/reverse fill (which walked
//     over five directories until M262 — components/ui and src/App.tsx sat outside that
//     walk holding six varless sites, the hole this section closed by covering all 95 app
//     modules itself, and which M262 closed at the source; the two supply implementations
//     stay as deliberate defense in depth); a template is the dynamic-site machinery. Two shapes have none, and
//     one more has a contract nobody could see it needed:
//       · a COMPUTED first argument names its keys inside a ternary — `t(n === 1 ?
//         "comm.nRepliesOne" : "comm.nReplies", { n })` — where check 24's `t("` regex never
//         looks, so nothing required the call to hand over the variables those keys print;
//       · an EXPRESSION first argument (`t(m.labelKey)`, `t(VIDEO_KIND_KEY[k.kind])`) does not
//         know which key it holds at all, so it must pass no object — and the keys it might
//         hold are the bare pools (a *Key field, a *Keys array, the kind table) whose values
//         reach the glass with no call site to check, so a placeholder inside one would print
//         as literal braces on every screen that reads it;
//       · a malformed template — a stray brace no scan counts — is the last: en would carry
//         `{n}` and zh-TW a bare `}` with every other check green, because parity compares
//         the variables each locale's template READS, and an unclosed one reads none.
//     The census below pins every shape, and each invisible contract carries a planted
//     witness run through the same predicate the assertion just walked.
//     (Section 36's `phOf` compares locales as a joined string; these contracts need the set
//     itself, so this section reads placeholders through `phList`.)
const phList = (s) => [...new Set([...String(s ?? "").matchAll(/\{(\w+)\}/g)].map((m) => m[1]))];
const callArgsOf = (code, open) => {
  let depth = 1, str = null, cur = "";
  const parts = [];
  for (let i = open + 1; i < code.length; i++) {
    const c = code[i];
    if (str) { cur += c; if (c === str && code[i - 1] !== "\\") str = null; continue; }
    if (c === '"' || c === "'" || c === "`") { str = c; cur += c; continue; }
    if ("([{".includes(c)) depth++;
    if (")]}".includes(c)) { depth--; if (depth === 0) { parts.push(cur); return parts; } }
    if (c === "," && depth === 1) { parts.push(cur); cur = ""; continue; }
    cur += c;
  }
  return null;
};
const EXPR_FIRST = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\[[^\[\]]+\])*$/;
const classifyCall = (code, open) => {
  const ws = code.slice(open + 1).match(/^\s*/)[0];
  const rest = code.slice(open + 1 + ws.length);
  const firstCh = rest[0];
  if (firstCh === '"') return { shape: "literal", key: (rest.match(/^"([A-Za-z0-9_.$-]+)"/) ?? [])[1] ?? null, args: callArgsOf(code, open) };
  // M253: a backtick that interpolates nothing is a literal wearing the wrong quotes, not a
  // dynamic site — it names one key, so the supply contract below must read it as one.
  if (firstCh === "`") {
    const tickArgs = callArgsOf(code, open);
    const tickKey = ((tickArgs?.[0] ?? "").trim().match(/^`([A-Za-z0-9_.$-]+)`$/) ?? [])[1] ?? null;
    if (tickKey) return { shape: "literal", key: tickKey, tick: true, args: tickArgs };
    return { shape: "template", args: tickArgs };
  }
  const args = callArgsOf(code, open);
  if (!args) return { shape: "unknown", why: "unparseable", args: null };
  const first = (args[0] ?? "").trim();
  if (EXPR_FIRST.test(first)) return { shape: "expression", first, args };
  const lits = [...first.matchAll(/"([A-Za-z0-9_.$-]+)"/g)].map((x) => x[1]).filter((k) => k in D.en);
  if (!lits.length) return { shape: "unknown", first, args };
  return { shape: "computed", lits, args };
};
// The variables a call actually hands over: keys of its second argument, shorthand `{ n }`
// included — an object written without a colon is still a variable name, and a parser that
// reads only `name:` would drop it and let a short supply pass.
const givenOf = (args) => {
  const obj = (args?.[1] ?? "").trim();
  if (!obj.startsWith("{")) return [];
  const body = obj.replace(/^\{/, "").replace(/\}$/, "");
  return [...new Set(body.split(",").map((s) => s.trim()).filter(Boolean)
    .map((seg) => (seg.includes(":") ? seg.split(":")[0].trim() : seg))
    .filter((s) => /^[A-Za-z_$][\w$]*$/.test(s)))];
};
// One contract for both literal-bearing shapes: every placeholder inside every key the call
// names must be in the object, and nothing the object carries may go unused. The unused half
// runs against the UNION of the call's keys — a ternary may pick between a key that needs {n}
// and one that does not, and the supply serves the call, not each branch.
const supplyOf = (lits, args) => {
  const given = givenOf(args);
  const need = new Set(lits.flatMap((k) => phList(D.en[k] ?? "")));
  const missing = lits.flatMap((k) => phList(D.en[k] ?? "").filter((p) => !given.includes(p)));
  return { missing: [...new Set(missing)], unused: given.filter((g) => !need.has(g)) };
};
const shapeCounts = { literal: 0, template: 0, expression: 0, computed: 0, unknown: 0 };
const unknownSites = [], shortSupply = [], droppedSupply = [], exprWithObj = [], tickKeys = [];
let litVarSites = 0, computedVarSites = 0;
for (const [path, code] of appSrc) {
  for (const m of code.matchAll(/\bt\(/g)) {
    const open = code.indexOf("(", m.index);
    const c = classifyCall(code, open);
    shapeCounts[c.shape]++;
    if (c.tick) tickKeys.push(c.key);
    if (c.shape === "unknown") unknownSites.push(`${path}: ${(c.first ?? c.why ?? "").slice(0, 60).replace(/\s+/g, " ")}`);
    if (c.shape === "expression") {
      if ((c.args[1] ?? "").trim().startsWith("{")) exprWithObj.push(`${path}: t(${c.first}, …)`);
      continue;
    }
    if (c.shape !== "literal" && c.shape !== "computed") continue;
    const lits = c.shape === "literal" ? [c.key].filter(Boolean) : c.lits;
    const hasVar = lits.some((k) => phList(D.en[k] ?? "").length > 0);
    if (c.shape === "literal" && hasVar) litVarSites++;
    if (c.shape === "computed" && hasVar) computedVarSites++;
    const s = supplyOf(lits, c.args);
    const who = `${path}: ${lits.map((k) => `"${k}"`).join(" / ")}`;
    if (s.missing.length) shortSupply.push(`${who} needs ${s.missing.join(",")}`);
    if (s.unused.length) droppedSupply.push(`${who} hands over ${s.unused.join(",")} for nothing`);
  }
}
// The census is pinned by shape, not floored: a new call form arrives as `unknown` and a
// deleted one prints measured-vs-pin here rather than sliding the totals down a floor could
// hide. The plants run the same classifier and the same supply contract just walked.
const plantUnknown = classifyCall("t(getKey())", "t(getKey())".indexOf("(")).shape === "unknown";
const plantShort = supplyOf(["comm.nReplies"], callArgsOf('t(odd ? "comm.nRepliesOne" : "comm.nReplies")', 1)).missing.length > 0;
const plantDropped = supplyOf(["comm.nRepliesOne"], callArgsOf('t("comm.nRepliesOne", { n, m })', 1)).unused.includes("m");
const exprObjPlant = classifyCall("t(m.labelKey, { n: 1 })", "t(m.labelKey, { n: 1 })".indexOf("("));
// M415 folded DialogFooter, a dead part whose one `t("ui.close")` was a literal site; the
// literal pin follows the fold from 1301 to 1300. The other three shape counts are unchanged.
// M425 moved the level bands behind the rowText door: the twelve literal calls the Manager OS's
// two words and the Simulation Lab's two slider captions spelled became three calls whose key is
// an EXPRESSION (the door's own `t(words.low)`), so the literal pin follows the fold from 1300 to
// 1288 and the expression pin from 29 to 32. The template and computed counts are unchanged.
ok(`every t() call in the ${appSrc.size} app modules is one of four known shapes (${shapeCounts.literal} literal, ${shapeCounts.template} template, ${shapeCounts.expression} expression, ${shapeCounts.computed} computed-with-literals, ${shapeCounts.unknown} unknown${unknownSites.length ? `: ${unknownSites.slice(0, 3).join(" | ")}` : ""}; planted unknown caught: ${plantUnknown})`,
  // M453: the career screen added 29 literal sites (its dictionary keys) and 7 template sites
  // (the course/injury/attr.name interpolations) — the shapes census pays in the same commit.
  // M523: the coach résumé lands 37 literal sites and 3 template sites (the badge-name
  // interpolations) — the shapes census pays in the same commit: 1317 -> 1354, 105 -> 108.
  // M525: the season report panel adds 20 more literal sites: 1354 -> 1374.
  // M526: SquadPlanning adds its 7 literal t() sites: 1374 -> 1381.
  // M527: TacticalNotebook adds its 16 literal t() sites: 1381 -> 1397.
  // M528: PlayerValueRanking adds its 16 literal t() sites: 1397 -> 1413.
  // M529: CommunityPoll adds its 11 literal t() sites: 1413 -> 1424.
  // M530: InjuryReport adds its 15 literal t() sites: 1424 -> 1439.
  // M531: ClubCompare adds its 18 literal t() sites: 1439 -> 1457.
  // M532: LeagueLeaders adds its 10 literal t() sites: 1457 -> 1467.
  // M533: PlayerProjection adds its 19 literal + 1 template t() sites: 1467 -> 1486, 108 -> 109.
  // M534: RunIn adds its 20 literal t() sites: 1486 -> 1506.
  // M559: PointsScenario adds its 24 literal t() sites and its nav entry: 1506 -> 1531.
  // M567: TitleRace adds its 21 literal t() sites and its nav entry: 1531 -> 1552.
  // M568: HeadToHead adds its 32 literal t() sites and its nav entry: 1552 -> 1585.
  // M569: VenueSplit adds its 32 literal t() sites and its nav entry: 1585 -> 1618.
  // M570: GoalTiming adds its 32 literal t() sites and its nav entry: 1618 -> 1651.
// M571: Discipline adds its 21 literal t() sites and its nav entry: 1651 -> 1673.
// M572: the club page reads the same words on its own card ledger (3 labels + the cross-link): 1673 -> 1677.
// M573: the next-step panel adds three literal sites (title, hint, primary tag) and one expression
// site (the step's own label looked up in STEP_LABEL): literal 1677 -> 1680, expression 32 -> 33.
// M574: the event clock adds its 30 literal sites (its six window labels reuse timing.w* as
// literal sites of their own) and its nav entry: literal 1680 -> 1711, expression unchanged at 33.
// M621: Briefing adds its 39 literal t() sites and its nav entry on top: 1711 -> 1751.
// M622: the discipline trend panel adds four literal sites (trendTitle, trendHint and the two
// row labels read inside the round map): literal 1751 -> 1755, expression unchanged at 33.
// M623: the stakes panel adds twelve literal sites on the match page (title, hint, the side-row
// line at each end, the venue, record, no-meeting and race lines, and four link labels): 1755 -> 1767.
// M624: the next-step panel adds its one interpolating label (the urgent kickoff's minute tag):
// literal 1767 -> 1768, literal sites with placeholders 227 -> 228.
// M625: the event clock's siege panel adds five literal sites (title, hint, the two column labels
// and the share line) and one of them interpolates: literal 1768 -> 1773, litVarSites 228 -> 229.
// M626: the discipline venue split adds seven literal sites (title, hint, league line, gap line,
// the two end labels and the empty line) and two of them interpolate: literal 1773 -> 1780.
// M627: the stakes panel adds two interpolating rows (the gap line and the ceiling line):
// literal 1780 -> 1782, litVarSites 231 -> 233.
// M628: the clock's fourth row and its busiest-window line add two literal sites (the row's
// existing clock.faced key is a new call, and the siege line interpolates band and share):
// literal 1782 -> 1784, litVarSites 233 -> 234.
// M629: the club page's venue line adds two literal sites (its label reuses disc.venueTitle and
// the line itself interpolates three rates): literal 1784 -> 1786, litVarSites 234 -> 235.
// M630: the briefing panel reuses the stakes title, the swing line and the ceiling line, and
// names both clubs in a new hint — four literal sites, three of them interpolating:
// literal 1786 -> 1790, litVarSites 235 -> 238.
// M631: the club page's siege line adds eight literal sites (the clock's six window labels, the
// board's own siege label and the line itself): literal 1790 -> 1798.
// M632: the stakes panel's two place lines: literal 1798 -> 1800.
// M711: the club page's card trend adds three literal sites (the board's trend title, the round
// tag and the peak line): literal 1800 -> 1803.
// M712: the late-siege panel adds four literal sites (its title, hint, row line and the last
// window's label): literal 1803 -> 1807.
// M713: the match page's two card-ledger lines: literal 1807 -> 1809.
// M714: the match page's two siege lines: literal 1809 -> 1811.
  shapeCounts.literal === 1811 && shapeCounts.template === 109 && shapeCounts.expression === 33
    && shapeCounts.computed === 23 && shapeCounts.unknown === 0 && plantUnknown);
// M253: the three backtick-written literals are not a fifth shape — they are literal sites,
// and this clause names them rather than counting them, so a fourth cannot arrive without
// a line here saying why. The plant walks the same two predicates the census and the
// supply contract just used: classify the ticked call, then ask what it fails to supply.
const tickPlant = classifyCall("t(`comm.nRepliesOne`)", "t(`comm.nRepliesOne`)".indexOf("("));
const plantTick = tickPlant.shape === "literal" && tickPlant.tick === true
  && supplyOf([tickPlant.key], callArgsOf("t(`comm.nRepliesOne`)", 1)).missing.includes("n");
ok(`a literal wearing backticks is still a literal — check 24 and this census read it as one (${[...new Set(tickKeys)].sort().join(", ") || "none"}; planted ticked literal classifies and reports its missing variable: ${plantTick})`,
  [...new Set(tickKeys)].sort().join(",") === "attr.name.decision_making,attr.name.first_touch,attr.name.passing" && plantTick);
// M453 landed six placeholder rows (career.tier/weeks/perWeek/outWeeks/injuredNote and the
// course-copy rows); each adds a literal site, so the pin pays once for all six: 137 -> 143.
ok(`every call that names its keys in front of check 24's regex still hands over exactly the variables they print, dropped side included (${litVarSites} literal sites with placeholders, ${computedVarSites} of ${shapeCounts.computed} computed sites; short: ${shortSupply.length}, dropped: ${droppedSupply.length}${shortSupply[0] ? `, e.g. ${shortSupply[0]}` : ""}${droppedSupply[0] ? `, e.g. ${droppedSupply[0]}` : ""}; planted short/dropped: ${plantShort}/${plantDropped})`,
  // M523: 143 -> 146 — the résumé's since/standing/matchN rows each hand over their variables.
  // M525: 146 -> 149 — the report's exported/avgGrowthSub/prospectsSub rows join them.
  // M534: 156 -> 160 — the run-in rows (ppgSub, record) hand over their variables, along with
  // the two more placeholder sites the run-in screen's tiles read.
  // M559: 160 -> 166 — PointsScenario's six interpolating rows (leaderSub, ceilingSub, chasersSub,
  // open, decided, record) hand over their variables.
  // M567: 166 -> 170 — TitleRace's four tiles (leaderSub, gapSub, changesSub, widestSub) do too.
  // M568: 170 -> 180 — HeadToHead's ten interpolating rows (meetingsSub, wins ×2, ofPlayed ×3,
  // goalsHint, biggestLine, streakWin, streakDraw) hand over theirs.
  // M569: 180 -> 194 — VenueSplit's fourteen interpolating sites (ofPlayed ×3, goalsSub,
  // fortressLine, travellersLine, record ×4, pts ×4) hand over theirs.
  // M570: 194 -> 200 — GoalTiming's six interpolating rows (busiestSub, lateSub, latestSub,
  // leakiestSub, record, lateLine) hand over theirs.
// M571: 200 -> 205 — Discipline's five interpolating rows (playedSub, perMatchSub, mostSub,
// record, rowLine) hand over theirs.
// M574: 205 -> 209 — EventClock's four interpolating rows (shotsSub, varsSub, busiestSub, record)
// hand over theirs. M621: 209 -> 220 — Briefing's eleven interpolating sites (round, opponentLine,
// pointsSub, ceilingSub, leftSub, edgeSub, stepTableLine, stepRunInLine, stepVenueLine,
// stepRecordLine, stepRaceLine) hand over theirs.
// M622: 220 -> 222 — the trend panel's two interpolating row labels (disc.round, disc.trendTotal)
// hand over their round and cumulative counts.
// M623: 222 -> 227 — the stakes panel's five interpolating sites (the side-row line at each end,
// the venue sentence, the record line and the race line) hand over their figures.
// M624: 227 -> 228 — the next-step panel's minute tag hands over its figure.
// M625: 228 -> 229 — the siege panel's share line hands over its percentage.
// M626: 229 -> 231 — the venue split's league line and gap line hand over their rates.
// M627: 231 -> 233 — the stakes swing and ceiling lines hand over their figures.
// M628: 233 -> 234 — the siege panel's busiest-window line hands over its band and late share.
// M629: 234 -> 235 — the club page's venue line hands over the two rates and the gap.
// M630: 235 -> 238 — the briefing's hint names both clubs and its two swing lines hand over
// their figures.
// M631: 238 -> 239 — the club page's siege line hands over the faced and stopped counts, the
// stop share, the window label and the late share.
// M632: 239 -> 241 — the two place lines hand over the club name and the four places.
// M711: 241 -> 243 — the round tag hands over its round and the peak line hands over the peak,
// the peak round, the season total and the counted games.
// M712: 243 -> 244 — the late-siege row hands over its late count, the faced load and the share.
// M713: 244 -> 246 — each end's card line hands over the club, both card counts and the rate.
// M714: 246 -> 248 — each end's siege line hands over the faced count, the late count and the share.
  litVarSites === 248 && computedVarSites === 8 && shortSupply.length === 0 && droppedSupply.length === 0
    && plantShort && plantDropped);
ok(`a call whose key is an expression passes no variables it cannot know (${shapeCounts.expression} sites${exprWithObj.length ? ` — ${exprWithObj.slice(0, 3).join(" | ")}` : ", none with an object"})`,
  exprWithObj.length === 0 && shapeCounts.expression === 33 && exprObjPlant.args[1].trim().startsWith("{"));
// The pools: a key that a bare field or table hands to t() at runtime, where there is no call
// site naming it for any check to read. The FIELD SET is pinned — a new *Key/*Keys field must
// land here and prove its values var-free in the same commit — and the check runs on all three
// locales directly rather than leaning on section 36's parity, because a value that reaches
// the glass is wrong in any one script on its own. Existence of a scalar *Key's row is check
// 29's; this clause only asks what the value PRINTS.
const poolFields = new Set(), poolArrFields = new Set();
const poolKeys = new Set();
for (const [, code] of appSrc) {
  for (const m of code.matchAll(/\b([A-Za-z_$][\w$]*Key)\s*:\s*(["'])((?:[^"'\\]|\\.)*)\2/g)) { poolFields.add(m[1]); if (m[3] in D.en) poolKeys.add(m[3]); }
  for (const m of code.matchAll(/\b([A-Za-z_$][\w$]*Keys)\s*:\s*\[([^\]]*)\]/g)) {
    poolArrFields.add(m[1]);
    for (const k of m[2].matchAll(/"([A-Za-z0-9_.$-]+)"/g)) if (k[1] in D.en) poolKeys.add(k[1]);
  }
}
// The kind table behind `t(VIDEO_KIND_KEY[k.kind])`: read out of its source the way the
// dynamic-site table reads its prefixes, because the site's key is built at runtime and
// the pool behind it is the only thing a placeholder could hide in.
const filmKindSrc = appSrc.get("domain/filmInsights.ts") ?? "";
const filmKindBlock = (/const FILM_KIND_KEY[^=]*=\s*\{([^}]*)\}/.exec(filmKindSrc) ?? [])[1] ?? "";
const filmKindKeys = [...filmKindBlock.matchAll(/"([A-Za-z0-9_.$-]+)"/g)].map((x) => x[1]);
const POOL_FIELDS_PIN = ["bodyKeys", "foundKeys", "labelKey", "optionKeys", "qKey", "summaryKey", "titleKey"];
const poolFieldsGot = [...poolFields, ...poolArrFields].sort();
const poolVars = [...poolKeys, ...filmKindKeys].filter((k) => L.some((loc) => phList(D[loc.id][k] ?? "").length > 0));
const plantPool = L.some((loc) => phList((loc.id === "en" ? D.en["learn.l.xg.title"] + " {n}" : D[loc.id]["learn.l.xg.title"]) ?? "").length > 0);
ok(`the values behind every bare key pool carry no placeholder, in any locale (${poolFields.size} *Key fields + ${poolArrFields.size} *Keys arrays + FILM_KIND_KEY's ${filmKindKeys.length} entries, ${poolKeys.size + filmKindKeys.length} keys; fields pinned: ${poolFieldsGot.join(",")}; planted value held: ${plantPool})`,
  poolVars.length === 0 && poolFieldsGot.join(",") === POOL_FIELDS_PIN.join(",") && plantPool);
// M258: the gate reads the table the app imports. The pools clause above audits FILM_KIND_KEY
// out of domain/filmInsights.ts, but the three badge sites import VIDEO_KIND_KEY from
// data/video.ts — today a bare re-export of that table, and only today by convention. If the
// alias were rewired to a second table (or the table grew an eighth, var-carrying row), the
// gate would keep clearing FILM_KIND_KEY while the screens printed the other table's braces,
// and proof-film would stay green too: it asserts every kind translates, not that the table
// behind the import is the table the gate read. So this clause pins both ends of the wire —
// the import, the bare re-export, and the exact seven rows — through the same predicates the
// plant then breaks.
const kindVideoSrc = appSrc.get("data/video.ts") ?? "";
const aliasWired = /import\s*\{[^}]*\bFILM_KIND_KEY\b[^}]*\}\s*from\s*"@\/domain\/filmInsights"/.test(kindVideoSrc)
  && /export\s+const\s+VIDEO_KIND_KEY[^=]*=\s*FILM_KIND_KEY\s*;/.test(kindVideoSrc);
const kindPin = [...filmKindKeys].sort().join(",");
const plantAlias = !/export\s+const\s+VIDEO_KIND_KEY[^=]*=\s*FILM_KIND_KEY\s*;/.test('export const VIDEO_KIND_KEY = { scan: "vid.kind.scan" };')
  && [...filmKindKeys, "vid.kind.extra"].sort().join(",") !== "vid.kind.dribble,vid.kind.pass,vid.kind.press,vid.kind.scan,vid.kind.shot,vid.kind.touch,vid.kind.turn";
ok(`the kind badges read the same table this gate audited: VIDEO_KIND_KEY is a bare re-export of FILM_KIND_KEY and the table holds exactly these seven rows (${kindPin}; wired: ${aliasWired}; planted rewire and planted eighth row caught: ${plantAlias})`,
  aliasWired && kindPin === "vid.kind.dribble,vid.kind.pass,vid.kind.press,vid.kind.scan,vid.kind.shot,vid.kind.touch,vid.kind.turn" && plantAlias);
// Malformed braces, across every value in every locale: strip the well-formed templates and
// anything that leaves a brace behind is an unclosed variable. The plant walks three
// arrangements through the same predicate — open, closed-short, and a whole well-formed one
// that must stay clean — so a predicate inverted to catch nothing reddens here, not only in
// production copy nobody writes on purpose.
const malformedIn = (v) => /[{}]/.test(String(v).replace(/\{\w+\}/g, ""));
const malformed = [];
for (const loc of L) for (const k of enKeys) if (malformedIn(D[loc.id][k] ?? "")) malformed.push(`${loc.id}:${k}`);
const plantMalformed = malformedIn("done {n") && malformedIn("done n}") && !malformedIn("done {n} done");
ok(`every template's braces close in all three locales (${malformed.length} of ${enKeys.length * L.length} values${malformed.length ? `, e.g. ${malformed.slice(0, 3).join(" | ")}` : ""}; planted arrangements: ${plantMalformed})`,
  malformed.length === 0 && plantMalformed);

// ─── 38 · the second family of the class M249 closed (M255) ────────────────────
// M249 charged the enum-that-reaches-the-DOM, but only for the field it was standing in: its
// patterns read `.kind`, so a DIFFERENT stored code reaching a DIFFERENT slot stayed invisible to
// every one of the 37 checks above. This section runs the same shape over `PositionGroup` — 8
// codes in `domain/types.ts`, words for all 8 in all 3 locales under `group.*` since M147 — and
// found five positions in three screens: a labelled row printing the stored `positionGroup`, the
// same code fed to `det.scout.hint` as its `{group}` variable inside an otherwise-translated
// sentence, a role chip rendering the loop's `{g.id}`, a stat sub-line and the onboarding picker,
// the last two composing `group.${…}` inline. So the app had THREE spellings of one lowercase rule
// and a reader-visible code, and clause 4 below now refuses the inline spelling class-wide.
// Predictions written before the first run: 5 positions / 3 files, 1 composer module, and 24/24
// readings differing from the code — none of GK/CB/FB/DM/CM/AM/W/ST is any locale's word, which
// is the contrast with M249's 11/15 and what makes the equality below unfakeable rather than
// tautological here.
const GRP_WIRING = [
  ["features/football/Details.tsx", "positionGroupLabel(p.positionGroup, t)", 2],
  ["features/development/DevelopmentPage.tsx", "positionGroupLabel(g.id, t)", 1],
  ["features/development/DevelopmentPage.tsx", "positionGroupLabel(analysis.group, t)", 1],
  ["features/onboarding/Onboarding.tsx", "positionGroupLabel(p.id, t)", 1],
];
const GRP_FILES_PIN = 3;
const GRP_POSITIONS_PIN = 5;
const GRP_IMPORT = /^import \{[^}]*\bpositionGroupLabel\b[^}]*\} from "@\/domain\/rowText"/m;
const grpFiles = [...new Set(GRP_WIRING.map(([p]) => p))];
const grpSrc = new Map(grpFiles.map((p) => [p, appSrc.get(p) ?? ""]));
const grpCallsIn = (p, needle) => grpSrc.get(p).split(needle).length - 1;
const grpBad = GRP_WIRING.filter(([p, expr, n]) => grpCallsIn(p, expr) !== n)
  .map(([p, expr, n]) => `${p} wants ${expr} x${n}, found ${grpCallsIn(p, expr)}`);
const grpPositions = GRP_WIRING.reduce((s, [, , n]) => s + n, 0);
ok(`the ${grpFiles.length} screens that show which positional group a player is in read it through the shared composer at all ${grpPositions} position(s) (pins ${GRP_FILES_PIN} files/${GRP_POSITIONS_PIN} positions), and each imports it from domain/rowText (${grpBad.join(" | ") || "none"})`,
  grpBad.length === 0 && grpPositions > 0 && grpFiles.length === GRP_FILES_PIN && grpPositions === GRP_POSITIONS_PIN &&
  grpFiles.every((p) => GRP_IMPORT.test(grpSrc.get(p))));
// The value space comes out of the union itself, and the table that ships the same ids is
// cross-checked against it — two producers of one space must not be allowed to drift, and a
// clause over an empty list proves nothing, so both ends are floored.
const GRP_CODES = spaceOf("domain/types.ts", /export type PositionGroup = [^;]+;/, /"([A-Z]{1,3})"/g);
const GRP_TABLE = spaceOf("domain/attributes.ts", /export const POSITION_GROUPS[^=]*=[\s\S]*?\n\];/, /\bid:\s*"([A-Z]{1,3})"/g);
const grpWords = GRP_CODES.filter((c) => c.length > 1).map((c) => `>${c}<`);
const bareGrpSites = [...appSrc]
  .filter(([, code]) => /\x3e\s*\{[^{}]*\.positionGroup\}\s*</.test(code) || grpWords.some((w) => code.includes(w)))
  .map(([p]) => p);
const GRP_PLANT = 'export const Row = ({ p }: any) => (\n  <>\n    <dd>{p.positionGroup}</dd>\n    <span>CM</span>\n  </>\n);';
const plantGrp = /\x3e\s*\{[^{}]*\.positionGroup\}\s*</.test(codeOf(GRP_PLANT)) && grpWords.some((w) => codeOf(GRP_PLANT).includes(w));
ok(`no module prints a stored positional group straight into a display slot and no screen types one of the union's ${GRP_CODES.length} codes as a text node (multi-letter only — the union's single-letter W is a wins column heading in features/manager/ManagerOS.tsx, measured on this run; ${bareGrpSites.join(", ") || "none"} of ${appSrc.size}), the picker table and the union carry the same ${GRP_TABLE.length} ids, while the planted row is caught by both halves (${plantGrp})`,
  bareGrpSites.length === 0 && GRP_CODES.length === 8 && GRP_TABLE.length === 8 &&
  [...GRP_CODES].sort().join() === [...GRP_TABLE].sort().join() && plantGrp && appSrc.size === APP_SRC_PIN);
// A sentence variable is a display slot wearing an argument, but only when nothing resolves it:
// a keyed row's `group` var goes through the shipped code-var door (CODE_VARS lists it, so
// fillRowVars calls codeWord at render), while a screen that calls t() itself gets its vars
// interpolated exactly as handed. So the charge is aimed at direct calls, and the door the other
// path depends on is asserted in the same breath — drop `group` from CODE_VARS and the second
// clause reddens even though no screen changed.
const GRP_T_CALL = /\bt\(\s*"[^"]+",\s*\{([^}]*)\}/g;
const grpVarSites = [...appSrc].flatMap(([p2, code]) => [...code.matchAll(GRP_T_CALL)]
  .map((m) => [p2, (m[1].match(/group:\s*([^,]*)/) ?? [])[1]?.trim()])
  .filter(([, v]) => v !== undefined));
const grpVarBad = grpVarSites.filter(([, v]) => !v.startsWith("positionGroupLabel(")).map(([p2, v]) => `${p2} :: group: ${v}`);
const GRP_VAR_PIN = 1;
const GRP_VAR_PLANT = 't("det.scout.hint", { group: p.positionGroup })';
const grpVarOf = (code) => (code.match(new RegExp(GRP_T_CALL.source)) ?? [, ""])[1];
const grpRowReads = [];
for (const { id } of L) {
  const line = rowTextModule.rowLine({ key: "det.scout.hint", vars: { group: "CM" } }, tReader(id));
  if (line !== D[id]["det.scout.hint"].replace("{group}", D[id]["group.CM"])) grpRowReads.push(`${id}: ${line}`);
}
ok(`the ${grpVarSites.length} direct t() call(s) that name a positional group hand it over already resolved (pin ${GRP_VAR_PIN}; ${grpVarBad.join(" | ") || "none unresolved"}), the plant in the same shape is caught (${grpVarOf(GRP_VAR_PLANT).includes("p.positionGroup")}), and the keyed-row door those other vars ride — CODE_VARS listing group — renders ${GRP_CODES.length >= 8 ? "the word" : "nothing"} in all ${L.length} locales (${grpRowReads.join(" | ") || "no bad row reading"})`,
  grpVarBad.length === 0 && grpVarSites.length === GRP_VAR_PIN &&
  grpVarOf(GRP_VAR_PLANT).includes("p.positionGroup") && grpRowReads.length === 0 &&
  rowTextModule.isCodeVar("group"));
// The chip is the loop-variable case again, and the charge is read out of the loop the file
// declares — same reason M249 could not name-match it: `{g.id}` is legitimate wherever `id` is
// already a word. The extractor keeps `key={g.id}` as the code it is.
const GRP_CHIP_LOOP = /POSITION_GROUPS\.map\(\(g\) =>[\s\S]*?<\/button>/;
const grpChip = grpSrc.get("features/development/DevelopmentPage.tsx").match(GRP_CHIP_LOOP)?.[0] ?? "";
const GRP_CHIP_PLANT = "POSITION_GROUPS.map((g) => (\n  <button key={g.id}>{g.id}</button>\n))";
const grpChipOf = (code) => code.match(GRP_CHIP_LOOP)?.[0] ?? "";
const bareChip = (block) => />\s*\{g\.id\}/.test(block);
ok(`the Development page's own group loop hands its chip to the composer, not to the code (${grpChip.length} chars read, bare ${bareChip(grpChip)}), keeping React's key={g.id} as the identity it is (${/key=\{g\.id\}/.test(grpChip)}), and the same extractor reports the planted loop (${grpChipOf(GRP_CHIP_PLANT).length} chars, bare ${bareChip(grpChipOf(GRP_CHIP_PLANT))})`,
  grpChip.length > 0 && !bareChip(grpChip) && grpChip.includes("positionGroupLabel(g.id, t)") &&
  /key=\{g\.id\}/.test(grpChip) && grpChipOf(GRP_CHIP_PLANT).length > 0 && bareChip(grpChipOf(GRP_CHIP_PLANT)));
// One spelling of the lowercase rule, counted rather than trusted. This is the clause that turns
// the two inline composers this milestone found into a class-wide refusal.
const GRP_COMPOSED = /`group\.\$\{/g;
const composedIn = (code) => [...code.matchAll(GRP_COMPOSED)].length;
const grpComposers = [...appSrc].filter(([, c]) => composedIn(c) > 0).map(([p, c]) => `${p} x${composedIn(c)}`);
const GRP_COMPOSER_FILE_PIN = 1;
const GRP_PLANT_INLINE = 'const w = (g: string) => t(`group.${g}`);';
ok(`exactly ${GRP_COMPOSER_FILE_PIN} module composes a group. key and it is the composer, not a screen (${grpComposers.join(", ") || "none"}), while a screen that builds the key inline is caught (${composedIn(GRP_PLANT_INLINE)}), and the loaded composer is the module that declares positionGroupLabel (${rtDeclared.join(", ")})`,
  grpComposers.length === GRP_COMPOSER_FILE_PIN && grpComposers[0] === "domain/rowText.ts x1" &&
  composedIn(appSrc.get("domain/rowText.ts")) === 1 && composedIn(GRP_PLANT_INLINE) === 1 &&
  rtDeclared.includes("positionGroupLabel") && typeof rowTextModule.positionGroupLabel === "function");
// The behavioural half, through the shipped door, in every locale, against the dictionary's own
// words — and pinned by how many readings are NOT the code, so a composer that fell through to
// its unknown-code branch everywhere could not pass.
const grpReadBad = [];
let grpDiffer = 0;
const GRP_DIFFER_PIN = 24;
for (const { id } of L) {
  for (const code of GRP_CODES) {
    const shown = rowTextModule.positionGroupLabel(code, tReader(id));
    const want = D[id][`group.${code}`];
    if (shown.startsWith("group.")) grpReadBad.push(`${id}: ${code} prints the key`);
    else if (shown !== want) grpReadBad.push(`${id}: ${code} prints “${shown}” while the dictionary says “${want}”`);
    else if (shown !== code) grpDiffer++;
  }
}
ok(`the shipped positionGroupLabel answers all ${GRP_CODES.length} positional groups in all ${L.length} locales with the dictionary's own word and never a key (${grpReadBad.join(" | ") || "no bad reading"}), and ${grpDiffer}/${GRP_CODES.length * L.length} of those readings are not the code already spelled (pin ${GRP_DIFFER_PIN} — every one differs here, unlike M249's 11/15)`,
  grpReadBad.length === 0 && grpDiffer === GRP_DIFFER_PIN && GRP_CODES.length > 0);
ok(`and the same fallback M249 measured is still the last resort for a code outside the union (${rowTextModule.positionGroupLabel("Planted", tReader("en"))})`,
  rowTextModule.positionGroupLabel("Planted", tReader("en")) === "Planted");

// ─── 39 · the third family of the class M249 closed (M256) ─────────────────────
// Section 38 charged one family; this charges the next one off the same list, and the reason it
// needed to exist is that this family's defect was WORSE than the positional group's while the
// gate was blind to it in exactly the same way. `MatchStatus` is 3 codes in domain/types.ts with
// words in all 3 locales under `fw.status.*` since M169, and five positions showed them to the
// reader: a fixture row's own status span printed the stored code — so a 简体中文 visitor's match
// list opened with a column of English SCHEDULED — while two sentence variables and two chips
// spelled the lowercase rule themselves by building `fw.status.${…}` inline. The sentence sites
// at least sat in the declaration table (DYN_SITES listed `tab.toLowerCase()` twice, the chip's
// `s.toLowerCase()` and `m.status.toLowerCase()`, each with its own value space); the raw span
// was in no table, because no table reads `{m.status}` as a key site. That asymmetry — three
// declared spellings of one rule and one undeclared leak, in the same two files — is what the
// clauses below close: 1 composer, 2 files / 5 positions, and one value space read off the
// union's own runtime list instead of three copies of it.
// Predictions written before the first run: 5 positions / 2 files, 1 composer module, 2 direct
// calls that name a status in a sentence, and 9/9 readings differing from the code — all three
// codes are upper-case and all three locales write the status in their own words (English lower-
// cases even the loanword), so unlike M249's 11/15 every reading differs here.
// What the first run added: section 37's app-wide t()-shape census fell 102 → 99, not the −4 a
// site count suggests. Four template calls left the two screens and exactly one arrived in the
// composer, whose `t(` plus backtick is itself a template site — the door is where the lowercase
// rule now lives, once, which is the whole point of the milestone and is why the pin moved by
// three. Established by re-running this census's own three helpers (codeOf → callArgsOf →
// classifyCall) over each touched file at HEAD and in the working copy, per file rather than
// inferred from the tally.
const ST_WIRING = [
  ["features/football/FootballWorld.tsx", "matchStatusLabel(m.status, t)", 1],
  ["features/football/FootballWorld.tsx", "matchStatusLabel(tab, t)", 2],
  ["features/football/FootballWorld.tsx", "matchStatusLabel(s, t)", 1],
  ["features/football/Details.tsx", "matchStatusLabel(m.status, t)", 1],
];
const ST_FILES_PIN = 2;
const ST_POSITIONS_PIN = 5;
const ST_IMPORT = /^import \{[^}]*\bmatchStatusLabel\b[^}]*\} from "@\/domain\/rowText"/m;
const stFiles = [...new Set(ST_WIRING.map(([p]) => p))];
const stSrc = new Map(stFiles.map((p) => [p, appSrc.get(p) ?? ""]));
const stCallsIn = (p, needle) => stSrc.get(p).split(needle).length - 1;
const stBad = ST_WIRING.filter(([p, expr, n]) => stCallsIn(p, expr) !== n)
  .map(([p, expr, n]) => `${p} wants ${expr} x${n}, found ${stCallsIn(p, expr)}`);
const stPositions = ST_WIRING.reduce((s, [, , n]) => s + n, 0);
ok(`the ${stFiles.length} screens that show what state a fixture is in read it through the shared composer at all ${stPositions} position(s) (pins ${ST_FILES_PIN} files/${ST_POSITIONS_PIN} positions), and each imports it from domain/rowText (${stBad.join(" | ") || "none"})`,
  stBad.length === 0 && stPositions > 0 && stFiles.length === ST_FILES_PIN && stPositions === ST_POSITIONS_PIN &&
  stFiles.every((p) => ST_IMPORT.test(stSrc.get(p))));
// Three producers of one three-value space, now compared to each other: the union's runtime list
// (what the composer looks up), the same file's type-level union (what every record field is
// typed against), and the filter strip's hoisted array (which decides only the button ORDER but
// must carry the same set or a status ships with no way to reach its list). An empty list would
// satisfy a sorted-equality, so each is floored at its own pinned length.
// M435: the statuses' codes are read off the LIST the type is derived from, not off a union
// that no longer exists.
const ST_CODES = spaceOf("domain/types.ts", /export const MATCH_STATUSES[^=]*=[^\]]*\]/, quoted);
const ST_LIST = spaceOf("domain/types.ts", /export const MATCH_STATUSES[^=]*=[^\]]*\]/, quoted);
const ST_STRIP = spaceOf("features/football/FootballWorld.tsx", /\["LIVE"[\s\S]*?\] as const/, quoted);
const stWords = ST_CODES.map((c) => `>${c}<`);
const bareStSites = [...appSrc]
  .filter(([, code]) => /\x3e\s*\{[^{}]*\.status\}\s*</.test(code) || stWords.some((w) => code.includes(w)))
  .map(([p]) => p);
const ST_PLANT = 'export const Row = ({ m }: any) => (\n  <>\n    <span>{m.status}</span>\n    <b>FINISHED</b>\n  </>\n);';
const plantSt = /\x3e\s*\{[^{}]*\.status\}\s*</.test(codeOf(ST_PLANT)) && stWords.some((w) => codeOf(ST_PLANT).includes(w));
ok(`no module prints a stored fixture status straight into a display slot and no screen types one of the union's ${ST_CODES.length} codes as a text node (${bareStSites.join(", ") || "none"} of ${appSrc.size}), the list the composer reads, the type it shadows and the filter strip's own array carry the same ${ST_LIST.length}/${ST_CODES.length}/${ST_STRIP.length} codes, while the planted row is caught by both halves (${plantSt})`,
  bareStSites.length === 0 && ST_CODES.length === 3 && ST_LIST.length === 3 && ST_STRIP.length === 3 &&
  [...ST_CODES].sort().join() === [...ST_LIST].sort().join() &&
  [...ST_CODES].sort().join() === [...ST_STRIP].sort().join() && plantSt && appSrc.size === APP_SRC_PIN);
// A sentence variable is a display slot wearing an argument, and a direct t() call interpolates
// what it is handed — so the two calls that name a status must resolve it themselves. The keyed-
// row path is the other half: it only speaks if CODE_VARS lists the name, and no shipped row hands
// a status to that door yet (the one that will is data/footballService.ts's search subtitle,
// counted below). The implication is what keeps the two halves from drifting apart: a row that
// names a status while the door stays shut is a new leak, and the clause says which it found.
const ST_T_CALL = /\bt\(\s*"[^"]+",\s*\{([^}]*)\}/g;
const stVarSites = [...appSrc].flatMap(([p2, code]) => [...code.matchAll(ST_T_CALL)]
  .map((m) => [p2, (m[1].match(/status:\s*([^,}]*)/) ?? [])[1]?.trim()])
  .filter(([, v]) => v !== undefined));
const stVarBad = stVarSites.filter(([, v]) => !v.startsWith("matchStatusLabel(")).map(([p2, v]) => `${p2} :: status: ${v}`);
const ST_VAR_PIN = 2;
const ST_ROW_SITES = [...appSrc].filter(([, c]) => /vars:\s*\{[^}]*\bstatus:/.test(c)).map(([p]) => p);
const ST_PLANT_VAR = 't("fw.matches.hint", { n: rows.length, status: tab })';
const stVarOf = (code) => (code.match(new RegExp(ST_T_CALL.source)) ?? [, ""])[1];
const stPlantVar = (stVarOf(ST_PLANT_VAR).match(/status:\s*([^,}]*)/) ?? [])[1]?.trim();
ok(`the ${stVarSites.length} direct t() call(s) that name a fixture status hand it over already resolved (pin ${ST_VAR_PIN}; ${stVarBad.join(" | ") || "none unresolved"}), the plant in the same shape is caught (${stPlantVar}), and the ${ST_ROW_SITES.length} keyed row(s) that would carry a status ${ST_ROW_SITES.length === 0 ? "do not exist yet" : "go through the CODE_VARS door"} (door open: ${rowTextModule.isCodeVar("status")})`,
  stVarBad.length === 0 && stVarSites.length === ST_VAR_PIN &&
  stPlantVar === "tab" && (ST_ROW_SITES.length === 0 || rowTextModule.isCodeVar("status")));
// The chip is the loop-variable case for the third time: `{s}` is legitimate wherever `s` is
// already a word, so the charge is read out of the loop the file declares and keeps React's key,
// the selection test and the route query as the identities they are.
const ST_CHIP_LOOP = /MATCH_STATUSES\.map\(\(s\) =>[\s\S]*?<\/button>/;
const stChip = stSrc.get("features/football/FootballWorld.tsx").match(ST_CHIP_LOOP)?.[0] ?? "";
const ST_CHIP_PLANT = "MATCH_STATUSES.map((s) => (\n  <button key={s}>{s}</button>\n))";
const stChipOf = (code) => code.match(ST_CHIP_LOOP)?.[0] ?? "";
const bareStChip = (block) => />\s*\{s\}/.test(block);
ok(`the matches screen's own status loop hands its chip to the composer, not to the code (${stChip.length} chars read, bare ${bareStChip(stChip)}), keeping key={s}, tab === s and setTab(s) as the identities they are (${["key={s}", "tab === s", "setTab(s)"].every((k) => stChip.includes(k))}), and the same extractor reports the planted loop (${stChipOf(ST_CHIP_PLANT).length} chars, bare ${bareStChip(stChipOf(ST_CHIP_PLANT))})`,
  stChip.length > 0 && !bareStChip(stChip) && stChip.includes("matchStatusLabel(s, t)") &&
  ["key={s}", "tab === s", "setTab(s)"].every((k) => stChip.includes(k)) &&
  stChipOf(ST_CHIP_PLANT).length > 0 && bareStChip(stChipOf(ST_CHIP_PLANT)));
// One spelling of the lowercase rule, counted rather than trusted — the clause that turns this
// milestone's four inline composers into a class-wide refusal, exactly as section 38's did for
// `group.`.
const ST_COMPOSED = /`fw\.status\.\$\{/g;
const stComposedIn = (code) => [...code.matchAll(ST_COMPOSED)].length;
const stComposers = [...appSrc].filter(([, c]) => stComposedIn(c) > 0).map(([p, c]) => `${p} x${stComposedIn(c)}`);
const ST_COMPOSER_FILE_PIN = 1;
const ST_PLANT_INLINE = 'const w = (s: string) => t(`fw.status.${s}`);';
ok(`exactly ${ST_COMPOSER_FILE_PIN} module composes a fw.status. key and it is the composer, not a screen (${stComposers.join(", ") || "none"}), while a screen that builds the key inline is caught (${stComposedIn(ST_PLANT_INLINE)}), and the loaded composer is the module that declares matchStatusLabel (${rtDeclared.join(", ")})`,
  stComposers.length === ST_COMPOSER_FILE_PIN && stComposers[0] === "domain/rowText.ts x1" &&
  stComposedIn(appSrc.get("domain/rowText.ts")) === 1 && stComposedIn(ST_PLANT_INLINE) === 1 &&
  rtDeclared.includes("matchStatusLabel") && typeof rowTextModule.matchStatusLabel === "function");
// The behavioural half, through the shipped door, in every locale, against the dictionary's own
// words — pinned by how many readings are NOT the code, so a composer that fell through to its
// unknown-code branch everywhere could not pass.
const stReadBad = [];
let stDiffer = 0;
const ST_DIFFER_PIN = 9;
for (const { id } of L) {
  for (const code of ST_LIST) {
    const shown = rowTextModule.matchStatusLabel(code, tReader(id));
    const want = D[id][`fw.status.${code.toLowerCase()}`];
    if (shown.startsWith("fw.status.")) stReadBad.push(`${id}: ${code} prints the key`);
    else if (shown !== want) stReadBad.push(`${id}: ${code} prints “${shown}” while the dictionary says “${want}”`);
    else if (shown !== code) stDiffer++;
  }
}
ok(`the shipped matchStatusLabel answers all ${ST_LIST.length} fixture statuses in all ${L.length} locales with the dictionary's own word and never a key (${stReadBad.join(" | ") || "no bad reading"}), and ${stDiffer}/${ST_LIST.length * L.length} of those readings are not the code already spelled (pin ${ST_DIFFER_PIN})`,
  stReadBad.length === 0 && stDiffer === ST_DIFFER_PIN);
ok(`and the same fallback is still the last resort for a status outside the union (${rowTextModule.matchStatusLabel("Planted", tReader("en"))})`,
  rowTextModule.matchStatusLabel("Planted", tReader("en")) === "Planted");
// M257: the ceiling, closed. The subtitle slot is a row now, so every producer has to hand
// a keyed sr. row — the shape below names all five, and the render check reads each one
// back through the shipped rowLine in every locale with representative vars (a group id,
// a kind code, a status code, proper nouns, a number). Braces left standing mean a var the
// door never resolved; the codes still legible mean the CODE_VARS half failed open. The
// plants walk the same two predicates: the old bare-string shape yields no key (so it would
// fail the pin), and a render with no vars keeps its braces.
const SUB_SRC = appSrc.get("data/footballService.ts") ?? "";
const subKeysOf = (src) => [...src.matchAll(/subtitle:\s*\{\s*key:\s*"([^"]+)"[^}]*\}/g)].map((m) => m[1]);
const subKeys = subKeysOf(SUB_SRC);
const SUB_PIN = "sr.clubLine,sr.competitionLine,sr.matchLine,sr.newsLine,sr.playerLine";
const SUB_SAMPLES = {
  "sr.clubLine": { nation: "England", competition: "Premier League" },
  "sr.playerLine": { group: "CM", club: "Arsenal", overall: 87 },
  "sr.competitionLine": { nation: "England" },
  "sr.newsLine": { source: "BBC", kind: "Rumor" },
  "sr.matchLine": { status: "SCHEDULED" },
};
const subBad = [];
for (const [key, vars] of Object.entries(SUB_SAMPLES)) {
  for (const { id } of L) {
    const shown = rowTextModule.rowLine({ key, vars }, tReader(id));
    if (shown === undefined || shown === key) subBad.push(`${id} ${key} prints its own key`);
    else if (/[{}]/.test(shown)) subBad.push(`${id} ${key} leaves braces: ${shown}`);
  }
}
const subCodesLeft = [
  ["zh-CN", "sr.matchLine", "SCHEDULED"], ["zh-TW", "sr.matchLine", "SCHEDULED"],
  ["zh-CN", "sr.newsLine", "Rumor"], ["zh-TW", "sr.newsLine", "Rumor"],
  ["zh-CN", "sr.playerLine", "CM"], ["zh-TW", "sr.playerLine", "CM"],
].filter(([id, key, code]) => String(rowTextModule.rowLine({ key, vars: SUB_SAMPLES[key] }, tReader(id)) ?? "").includes(code));
const plantSubShape = subKeysOf("subtitle: m.status,").length === 0;
const plantSubRender = /[{}]/.test(String(rowTextModule.rowLine({ key: "sr.matchLine", vars: {} }, tReader("en")) ?? ""));
ok(`every search subtitle leaves the data layer as a keyed sr. row, and each of the five renders with no braces and no record code left in any locale (${[...subKeys].sort().join(", ") || "none"}; bad readings: ${subBad.join(" | ") || "none"}; codes left: ${subCodesLeft.map(([, k, c]) => `${k}:${c}`).join(" ") || "none"}; planted bare-string shape yields no key: ${plantSubShape}; planted varless render keeps its braces: ${plantSubRender})`,
  [...subKeys].sort().join(",") === SUB_PIN && subBad.length === 0 && subCodesLeft.length === 0
    && plantSubShape && plantSubRender);
// The hole it closed: no subtitle carries a bare record code anymore, no reader prints one
// raw, both readers resolve the row through rowLine — and the old shape is still caught by
// the same detector, so a producer that goes back to `subtitle: m.status` reddens here.
const ST_HOLE = /subtitle:\s*[\w.]+\.status\b/g;
const stHoleIn = (code) => [...code.matchAll(ST_HOLE)].length;
const stHoleSites = [...appSrc].filter(([, c]) => stHoleIn(c) > 0).map(([p, c]) => `${p} x${stHoleIn(c)}`);
const stHoleReaders = [...appSrc].filter(([, c]) => /\x3e\s*\{r\.subtitle\}\s*</.test(c)).map(([p]) => p);
const ST_HOLE_PIN = 0;
const ST_READER_PIN = 2;
const ST_HOLE_PLANT = 'out.push({ type: "match", id: m.id, subtitle: other.status, to: x });';
const subRowReads = [...appSrc].filter(([, c]) => /rowLine\(\s*r\.subtitle\s*,\s*t\s*\)/.test(c)).map(([p]) => p);
ok(`no search subtitle carries a bare record code (pin ${ST_HOLE_PIN}: ${stHoleSites.join(", ") || "none"}), no reader prints one raw (${stHoleReaders.join(", ") || "none bare"}), both readers resolve the row through rowLine (pin ${ST_READER_PIN}: ${[...subRowReads].sort().join(", ") || "none"}) — while the old shape is still caught (${stHoleIn(ST_HOLE_PLANT)})`,
  stHoleSites.length === ST_HOLE_PIN && stHoleReaders.length === 0
    && [...subRowReads].sort().join(",") === "features/command/CommandPalette.tsx,features/football/FootballWorld.tsx"
    && stHoleIn(ST_HOLE_PLANT) === 1);

// ─── 40 · the fourth family of the class M249 closed (M259) ─────────────────────
// A preferred foot is two codes, "L" and "R", and they reached the glass three ways at
// once: the byline printed `{p.foot}F` (an English initial with an English noun after it),
// the profile table printed the bare letter, and the scout sentence interpolated `L / R`
// into a translated sentence as a variable — plus a fourth through the back door,
// `ai.fact.player` writing `{foot} foot` / `{foot} 脚` around the var, which is why the
// word here is the bare side and the sentence supplies the noun. Predictions written
// before the first run: 2 files / 4 positions through one composer, every .foot read in
// a component inside footLabel(, the type and the runtime list carrying the same 2 codes,
// exactly 1 module naming a foot.* key, 6/6 readings differing from the code, the
// unknown-code fallback, and the intelligence row through the CODE_VARS door.
const FT_WIRING = [
  ["features/football/Details.tsx", "footLabel(p.foot, t)", 2],
  ["features/scouting/ScoutingPanel.tsx", "footLabel(a.foot, t)", 1],
  ["features/scouting/ScoutingPanel.tsx", "footLabel(b.foot, t)", 1],
];
const FT_FILES_PIN = 2;
const FT_POSITIONS_PIN = 4;
const FT_IMPORT = /^import \{[^}]*\bfootLabel\b[^}]*\} from "@\/domain\/rowText"/m;
const ftFiles = [...new Set(FT_WIRING.map(([p]) => p))];
const ftSrc = new Map(ftFiles.map((p) => [p, appSrc.get(p) ?? ""]));
const ftCallsIn = (p, needle) => ftSrc.get(p).split(needle).length - 1;
const ftBad = FT_WIRING.filter(([p, expr, n]) => ftCallsIn(p, expr) !== n)
  .map(([p, expr, n]) => `${p} wants ${expr} x${n}, found ${ftCallsIn(p, expr)}`);
const ftPositions = FT_WIRING.reduce((s, [, , n]) => s + n, 0);
ok(`the ${ftFiles.length} screens that show a preferred foot read it through the shared composer at all ${ftPositions} position(s) (pins ${FT_FILES_PIN} files/${FT_POSITIONS_PIN} positions), and each imports it from domain/rowText (${ftBad.join(" | ") || "none"})`,
  ftBad.length === 0 && ftPositions > 0 && ftFiles.length === FT_FILES_PIN && ftPositions === FT_POSITIONS_PIN &&
  ftFiles.every((p) => FT_IMPORT.test(ftSrc.get(p))));
// The two producers of one two-value space, compared to each other: the union's runtime
// list (what the composer looks up) against the same file's type-level union (what the
// record field is typed against). There is no third producer — no screen keeps its own
// array — so the pair is the whole space, and each side is pinned at 2 because a
// sorted-equality over two empty lists would pass.
const FT_LIST = spaceOf("domain/types.ts", /export const FOOTS[^=]*=[^\]]*\]/, quoted);
// M435: the foot's type is DERIVED from its list, so the two cannot carry different codes — and
// the check that says so reads the derivation itself, because a hand-typed union would be the one
// thing that could drift again.
const FT_DERIVED = /export type Foot = \(typeof FOOTS\)\[number\];/.test(appSrc.get("domain/types.ts") ?? "");
ok(`the foot's type is derived from its runtime list, so the two cannot carry different codes (${FT_LIST.join(",")})`,
  FT_LIST.length === 2 && FT_DERIVED);
// Every .foot read in a component goes through the composer — the seed's write is a .ts
// file and the intelligence row rides the vars door below, so a component is the only
// place a bare code can reach the glass. Two things the extractor has to get right, both
// learned from its first red run: the receiver sits between the composer and the property
// (`footLabel(p.foot, …)` — looking for `footLabel(` immediately before the dot misses
// every real site), and a dictionary key is not a read (`t("fw.foot")` names the label,
// so quoted strings are masked before matching; backticks stay readable so an
// interpolation can never hide a bare read inside a string). The plant walks the same
// extractor both ways: a bare display read is caught, and the resolved shape is clean.
const maskQuoted = (code) => code.replace(/"([^"\\]|\\.)*"|'([^'\\]|\\.)*'/g, (m) => " ".repeat(m.length));
const ftBareIn = (code) => {
  const masked = maskQuoted(code);
  return [...masked.matchAll(/\.foot\b/g)]
    .filter((m) => !/footLabel\(\s*[A-Za-z_$][\w$]*$/.test(masked.slice(Math.max(0, m.index - 32), m.index))).length;
};
const ftBare = [...appSrc].filter(([p]) => p.endsWith(".tsx")).map(([p, c]) => [p, ftBareIn(c)]).filter(([, n]) => n > 0);
const FT_PLANT_BARE = "<span>{p.foot}</span>";
const plantFtBare = ftBareIn(FT_PLANT_BARE) === 1 && ftBareIn("{footLabel(p.foot, t)}") === 0;
ok(`no component prints a stored foot straight into a display slot (${ftBare.map(([p, n]) => `${p} x${n}`).join(", ") || "none"} of ${appSrc.size}), while the planted bare read is caught and the resolved shape is clean (${plantFtBare})`,
  ftBare.length === 0 && plantFtBare);
// One spelling of the word, counted rather than trusted: exactly one module names a
// foot.* key and it is the composer, not a screen — the dictionary's bare sides live in
// exactly two literals, so a screen that starts quoting them is a second spelling.
const ftQuotedIn = (code) => [...code.matchAll(/["']foot\.(left|right)["']/g)].length;
const ftComposers = [...appSrc].filter(([, c]) => ftQuotedIn(c) > 0).map(([p, c]) => `${p} x${ftQuotedIn(c)}`);
const FT_PLANT_QUOTE = 'const w = (f: string) => t("foot.left");';
ok(`exactly 1 module names a foot.* key and it is the composer, not a screen (${ftComposers.join(", ") || "none"}), while a screen that starts quoting one is caught (${ftQuotedIn(FT_PLANT_QUOTE)}), and the loaded composer is the module that declares footLabel (${rtDeclared.includes("footLabel")})`,
  ftComposers.length === 1 && ftComposers[0] === "domain/rowText.ts x2" &&
  ftQuotedIn(FT_PLANT_QUOTE) === 1 && rtDeclared.includes("footLabel") && typeof rowTextModule.footLabel === "function");
// The behavioural half, through the shipped door, in both codes and all locales — pinned
// by how many readings are NOT the code, so a composer that fell through to its
// unknown-code branch everywhere could not pass. Both codes are single letters and every
// locale writes them in its own word, so unlike M249's 11/15 every reading differs here.
const ftReadBad = [];
let ftDiffer = 0;
const FT_DIFFER_PIN = 6;
for (const { id } of L) {
  for (const code of FT_LIST) {
    const shown = rowTextModule.footLabel(code, tReader(id));
    const want = D[id][code === "L" ? "foot.left" : "foot.right"];
    if (shown.startsWith("foot.")) ftReadBad.push(`${id}: ${code} prints the key`);
    else if (shown !== want) ftReadBad.push(`${id}: ${code} prints “${shown}” while the dictionary says “${want}”`);
    else if (shown !== code) ftDiffer++;
  }
}
ok(`the shipped footLabel answers both preferred feet in all ${L.length} locales with the dictionary's own word and never a key (${ftReadBad.join(" | ") || "no bad reading"}), and ${ftDiffer}/${FT_LIST.length * L.length} of those readings are not the code already spelled (pin ${FT_DIFFER_PIN})`,
  ftReadBad.length === 0 && ftDiffer === FT_DIFFER_PIN);
ok(`and the same fallback is still the last resort for a foot outside the union (${rowTextModule.footLabel("Planted", tReader("en"))})`,
  rowTextModule.footLabel("Planted", tReader("en")) === "Planted");
// The back door, now a front door: the intelligence fact has always carried the foot as a
// row var, and its sentence already nouns it — so opening the CODE_VARS door for `foot`
// converts that var in every locale with no producer edit. The clause pins the one shipped
// row, renders the fact with a left foot in all three locales against the dictionary's own
// word, and tells a foot-carrying vars body from a clean one through the same detector.
const FT_ROW_SITES = [...appSrc].filter(([, c]) => /vars:\s*\{[^}]*\bfoot:/.test(c)).map(([p]) => p);
const FT_FACT_VARS = { name: "X", position: "CM", age: 24, nation: "England", club: "Arsenal", overall: 87, potential: 90, value: "€50M", foot: "L" };
const ftFactBad = [];
for (const { id } of L) {
  const shown = rowTextModule.rowLine({ key: "ai.fact.player", vars: FT_FACT_VARS }, tReader(id));
  if (shown === undefined || /[{}]/.test(shown)) ftFactBad.push(`${id} leaves braces: ${shown}`);
  else if (!shown.includes(D[id]["foot.left"])) ftFactBad.push(`${id} never words the foot: ${shown}`);
}
const FT_ROW_PLANT = 'add({ key: "ai.fact.player", vars: { name: n, foot: f } });';
const plantFtRow = /vars:\s*\{[^}]*\bfoot:/.test(FT_ROW_PLANT) && !/vars:\s*\{[^}]*\bfoot:/.test('add({ key: "ai.fact.player", vars: { name: n } });');
ok(`the ${FT_ROW_SITES.length} shipped row(s) carrying a preferred foot go through the CODE_VARS door (door open: ${rowTextModule.isCodeVar("foot")}; ${FT_ROW_SITES.join(", ") || "none"}), the intelligence fact renders the word in all ${L.length} locales (${ftFactBad.join(" | ") || "clean"}), and the detector tells a foot-carrying vars body from a clean one (${plantFtRow})`,
  FT_ROW_SITES.length === 1 && FT_ROW_SITES[0] === "data/intelligence.ts" && rowTextModule.isCodeVar("foot")
    && ftFactBad.length === 0 && plantFtRow);

// ─── 41 · the fifth family of the class M249 closed (M260) ─────────────────────
// A scout filter bucket is five codes, ALL/GK/DEF/MID/ATT, and the filter chips printed
// them raw. M260 called the chip "the only display position in the tree; every other use
// is order, identity or comparison and stays a code" — that was the chip loop's own
// reading, and it was wrong by two: the squad-profile heading and the best-value pick
// badge (both in the same file) also print a bucket code into a label slot, named by a
// different variable than the loop clause read. This section now charges all three, so a
// fourth display position cannot pass under the one the loop sees. Predictions written
// before the first run: 1 file / 3 positions through one composer, the type and the
// switch carrying the same 5 codes, exactly 1 module naming a scout.bucket.* key, 15/15
// readings differing from the code, and the unknown-code fallback. The composer is a
// switch of static literals rather than a codeWord branch on purpose — no row will ever
// carry a bucket, so there is no door to open, and every key it can name stays a literal
// the t()-shape census reads as one (literal pin moves 1263 → 1268 here, nothing else).
const BK_WIRING = [
  ["features/scouting/ScoutingPanel.tsx", "bucketLabel(b, t)", 1],
  ["features/scouting/ScoutingPanel.tsx", "bucketLabel(r.bucket, t)", 1],
  ["features/scouting/ScoutingPanel.tsx", "bucketLabel(p.b, t)", 1],
];
const BK_FILES_PIN = 1;
const BK_POSITIONS_PIN = 3;
const BK_IMPORT = /^import \{[^}]*\bbucketLabel\b[^}]*\} from "@\/domain\/rowText"/m;
const bkFiles = [...new Set(BK_WIRING.map(([p]) => p))];
const bkSrc = new Map(bkFiles.map((p) => [p, appSrc.get(p) ?? ""]));
const bkCallsIn = (p, needle) => bkSrc.get(p).split(needle).length - 1;
const bkBad = BK_WIRING.filter(([p, expr, n]) => bkCallsIn(p, expr) !== n)
  .map(([p, expr, n]) => `${p} wants ${expr} x${n}, found ${bkCallsIn(p, expr)}`);
const bkPositions = BK_WIRING.reduce((s, [, , n]) => s + n, 0);
ok(`the ${bkFiles.length} screen that shows a bucket word reads it through the shared composer at all ${bkPositions} position(s) (pins ${BK_FILES_PIN} files/${BK_POSITIONS_PIN} positions), and each imports it from domain/rowText (${bkBad.join(" | ") || "none"})`,
  bkBad.length === 0 && bkPositions > 0 && bkFiles.length === BK_FILES_PIN && bkPositions === BK_POSITIONS_PIN &&
  bkFiles.every((p) => BK_IMPORT.test(bkSrc.get(p))));
// The chip is the loop-variable case for the fourth time: `{b}` is legitimate wherever `b`
// is already a word, so the charge is read out of the loop the file declares — which keeps
// React's key, the selection test and the setter call as the identities they are — and no
// screen anywhere types one of the five codes as a text node.
const BK_CHIP_LOOP = /BUCKETS\.map\(\(b\) =>[\s\S]*?<\/button>/;
const bkChipOf = (code) => code.match(BK_CHIP_LOOP)?.[0] ?? "";
const bkChip = bkChipOf(appSrc.get("features/scouting/ScoutingPanel.tsx") ?? "");
const BK_CHIP_PLANT = 'BUCKETS.map((b) => (\n  <button key={b}>{b}</button>\n))';
const bkWords = ["ALL", "GK", "DEF", "MID", "ATT"].map((c) => `>${c}<`);
const bkTyped = [...appSrc].filter(([, code]) => bkWords.some((w) => code.includes(w))).map(([p]) => p);
ok(`the scout filter loop hands its chip to the composer, not to the code (${bkChip.length} chars read, bare ${/>\s*\{b\}/.test(bkChip)}), keeping key={b}, bucket === b and setBucket(b) as the identities they are (${["key={b}", "bucket === b", "setBucket(b)"].every((k) => bkChip.includes(k))}), no module types one of the five codes as a text node (${bkTyped.join(", ") || "none"}), and the same extractor reports the planted loop (${bkChipOf(BK_CHIP_PLANT).length} chars, bare ${/>\s*\{b\}/.test(bkChipOf(BK_CHIP_PLANT))})`,
  bkChip.length > 0 && !/>\s*\{b\}/.test(bkChip) && ["key={b}", "bucket === b", "setBucket(b)"].every((k) => bkChip.includes(k)) &&
  bkTyped.length === 0 && bkChipOf(BK_CHIP_PLANT).length > 0 && />\s*\{b\}/.test(bkChipOf(BK_CHIP_PLANT)));
// The two collected-value positions the chip loop's own variable read never reached: the
// squad-profile heading and the best-value pick badge print a bucket code into a label
// slot, but the value arrives under a different name (`r.bucket`, `p.b`) than the loop's
// own `b` the clause above reads. The chip is read out of its loop, so these are read by
// name — a bare `.bucket` member or a bare `{p.b}` in a display slot reddens here even
// though the wiring table pins the resolved shapes. The plant carries both old shapes, and
// a site already inside bucketLabel( is not a code on the glass.
const bkBareIn = (code) => {
  let n = 0;
  for (const m of code.matchAll(/\x3e\s*\{([^{}]*\.bucket[^{}]*)\}\s*\x3c/g)) {
    if (!/\bbucketLabel\s*\(/.test(m[1])) n++;
  }
  n += (code.match(/\x3e\s*\{p\.b\}\s*\x3c/g) ?? []).length;
  return n;
};
const bkBare = [...appSrc].map(([p, c]) => [p, bkBareIn(c)]).filter(([, n]) => n > 0);
const BK_PLANT_BARE = '<span className="font-medium">{r.bucket}</span><Badge variant="outline">{p.b}</Badge>';
ok(`no module prints a stored bucket straight into a display slot beyond the chip the loop clause reads and no screen types one of the five codes as a text node (${bkBare.map(([p, n]) => `${p} x${n}`).join(", ") || "none"} of ${appSrc.size}), while the planted pair is caught (${bkBareIn(BK_PLANT_BARE)}) and the resolved shapes are clean (${bkBareIn("<span>{bucketLabel(r.bucket, t)}</span>")} + ${bkBareIn("<Badge>{bucketLabel(p.b, t)}</Badge>")})`,
  bkBare.length === 0 && bkBareIn(BK_PLANT_BARE) === 2 && bkBareIn("<span>{bucketLabel(r.bucket, t)}</span>") === 0 && bkBareIn("<Badge>{bucketLabel(p.b, t)}</Badge>") === 0);
 
// The two producers of one five-value space, compared to each other: the union's type in
// the scouting module against the composer's switch cases. Each side is pinned at 5, and
// the plant feeds the extractor a two-case switch, so a dropped case reddens the pin
// rather than sliding a floor.
// M435: the bucket codes are read off the LIST the type is derived from, so the space the
// composer is checked against is the definition itself.
const BK_CODES = spaceOf("domain/scouting.ts", /export const POS_BUCKETS[^=]*=[^\]]*\]/, quoted);
// Both composers in domain/rowText.ts are switches over a fixed code space, and until M263
// the extractor that read one of them read the WHOLE FILE — which was safe only while no
// other family happened to spell one of its codes. `positionLabel`'s `case "GK":` is a
// player position and `bucketLabel`'s is a scout filter, so a whole-file scan counted the
// bucket six times and reddened a clause about a file that was correct. Scoping the
// extractor to the named composer's own body is what lets two families share a spelling;
// the clause at the end of section 43 feeds the extractor a file holding both switches and
// reads two either way.
const switchBodyOf = (src, fn) => {
  const at = src.indexOf(`export const ${fn} = `);
  if (at < 0) return "";
  const end = src.indexOf("\n};", at);
  return end < 0 ? "" : src.slice(at, end + 3);
};
const bkCasesOf = (src) => [...src.matchAll(/case "(ALL|GK|DEF|MID|ATT)":/g)].map((m) => m[1]);
const bkCases = bkCasesOf(switchBodyOf(appSrc.get("domain/rowText.ts") ?? "", "bucketLabel"));
const BK_PLANT_CASES = 'switch (x) {\n    case "ALL": return t("a");\n    case "GK": return t("b");\n}';
ok(`the bucket union's type and the composer's switch carry the same codes (${BK_CODES.join(",")} vs ${[...bkCases].sort().join(",")}; planted two-case switch reads ${bkCasesOf(BK_PLANT_CASES).length})`,
  BK_CODES.length === 5 && bkCases.length === 5 && [...BK_CODES].sort().join() === [...bkCases].sort().join()
    && bkCasesOf(BK_PLANT_CASES).length === 2);
// One spelling of the word, counted rather than trusted: exactly one module names a
// scout.bucket.* key and it is the composer, not a screen.
const bkQuotedIn = (code) => [...code.matchAll(/["']scout\.bucket\.(all|gk|def|mid|att)["']/g)].length;
const bkComposers = [...appSrc].filter(([, c]) => bkQuotedIn(c) > 0).map(([p, c]) => `${p} x${bkQuotedIn(c)}`);
const BK_PLANT_QUOTE = 'const w = (b: string) => t("scout.bucket.gk");';
ok(`exactly 1 module names a scout.bucket.* key and it is the composer, not a screen (${bkComposers.join(", ") || "none"}), while a screen that starts quoting one is caught (${bkQuotedIn(BK_PLANT_QUOTE)}), and the loaded composer is the module that declares bucketLabel (${rtDeclared.includes("bucketLabel")})`,
  bkComposers.length === 1 && bkComposers[0] === "domain/rowText.ts x5" &&
  bkQuotedIn(BK_PLANT_QUOTE) === 1 && rtDeclared.includes("bucketLabel") && typeof rowTextModule.bucketLabel === "function");
// The behavioural half, through the shipped door, in all five codes and all locales —
// pinned by how many readings are NOT the code, so a composer that fell through to its
// unknown-code branch everywhere could not pass. ALL-vs-All differs by case alone, which
// is exactly why the pin counts rather than eyeballs.
const bkReadBad = [];
let bkDiffer = 0;
const BK_DIFFER_PIN = 15;
for (const { id } of L) {
  for (const code of BK_CODES) {
    const shown = rowTextModule.bucketLabel(code, tReader(id));
    const want = D[id][`scout.bucket.${code.toLowerCase()}`];
    if (shown.startsWith("scout.bucket.")) bkReadBad.push(`${id}: ${code} prints the key`);
    else if (shown !== want) bkReadBad.push(`${id}: ${code} prints “${shown}” while the dictionary says “${want}”`);
    else if (shown !== code) bkDiffer++;
  }
}
ok(`the shipped bucketLabel answers all ${BK_CODES.length} filter buckets in all ${L.length} locales with the dictionary's own word and never a key (${bkReadBad.join(" | ") || "no bad reading"}), and ${bkDiffer}/${BK_CODES.length * L.length} of those readings are not the code already spelled (pin ${BK_DIFFER_PIN})`,
  bkReadBad.length === 0 && bkDiffer === BK_DIFFER_PIN);
ok(`and the same fallback is still the last resort for a bucket outside the union (${rowTextModule.bucketLabel("Planted", tReader("en"))})`,
  rowTextModule.bucketLabel("Planted", tReader("en")) === "Planted");

// ─── 42 · the sixth family of the class M249 closed (M261) ─────────────────────
// A drill's session phase is five codes — warmup/technique/decision/game/cooldown — and
// the session screen tagged each exercise with its code, upper-cased by CSS so every
// locale shouted English. The only display position in the tree; filters and comparisons
// elsewhere stay codes (the career arc's trajectory phases are a different family that
// never reaches a display slot, and a display that ever does will red the census below
// and force the choice consciously). Predictions written before the first run: 1 file /
// 1 position through one composer, the type and the switch carrying the same 5 codes,
// exactly 1 module naming a training.phase.* key, 15/15 readings differing from the code,
// and the unknown-code fallback. Like the bucket composer it is a switch of static
// literals — no row will ever carry a phase — so the literal pin moves 1268 → 1273
// here, nothing else.
const PH_WIRING = [["features/player/PlayerOS.tsx", "phaseLabel(e.phase, t)", 1]];
const PH_FILES_PIN = 1;
const PH_POSITIONS_PIN = 1;
const PH_IMPORT = /^import \{[^}]*\bphaseLabel\b[^}]*\} from "@\/domain\/rowText"/m;
const phFiles = [...new Set(PH_WIRING.map(([p]) => p))];
const phSrc = new Map(phFiles.map((p) => [p, appSrc.get(p) ?? ""]));
const phCallsIn = (p, needle) => phSrc.get(p).split(needle).length - 1;
const phBad = PH_WIRING.filter(([p, expr, n]) => phCallsIn(p, expr) !== n)
  .map(([p, expr, n]) => `${p} wants ${expr} x${n}, found ${phCallsIn(p, expr)}`);
const phPositions = PH_WIRING.reduce((s, [, , n]) => s + n, 0);
ok(`the ${phFiles.length} screen that tags a drill with its phase reads it through the shared composer at all ${phPositions} position(s) (pins ${PH_FILES_PIN} files/${PH_POSITIONS_PIN} positions), and each imports it from domain/rowText (${phBad.join(" | ") || "none"})`,
  phBad.length === 0 && phPositions > 0 && phFiles.length === PH_FILES_PIN && phPositions === PH_POSITIONS_PIN &&
  phFiles.every((p) => PH_IMPORT.test(phSrc.get(p))));
// No stored phase in a display slot, and no screen types one of the five codes as a text
// node. A resolved site sits in a display slot too, so the slot match excludes anything
// already inside phaseLabel( — the wiring clause above pins the resolved sites by name,
// this one catches the shape going back to raw. The career arc's trajectory phases never
// reach a slot, so a bare .phase here is a drill code by elimination; a trajectory
// display would red this too, which is the point: two families sharing a field name
// must not share an alibi.
const phWords = ["warmup", "technique", "decision", "game", "cooldown"];
const phBareIn = (code) => [...code.matchAll(/\x3e\s*\{([^{}]*\.phase[^{}]*)\}\s*</g)]
  .filter((m) => !/\bphaseLabel\s*\(/.test(m[1])).length
  + phWords.filter((w) => code.includes(`>${w}<`)).length;
const phBare = [...appSrc].map(([p, c]) => [p, phBareIn(c)]).filter(([, n]) => n > 0);
const PH_PLANT_BARE = "<span>{e.phase}</span><b>game</b>";
const plantPhBare = phBareIn(PH_PLANT_BARE) === 2 && phBareIn("{phaseLabel(e.phase, t)}") === 0;
ok(`no module prints a stored drill phase straight into a display slot and no screen types one of the five codes as a text node (${phBare.map(([p, n]) => `${p} x${n}`).join(", ") || "none"} of ${appSrc.size}), while the planted pair is caught twice and the resolved shape is clean (${plantPhBare})`,
  phBare.length === 0 && plantPhBare);
// The two producers of one five-value space, compared to each other: the union's type in
// the domain types module against the composer's switch cases. Each side is pinned at 5,
// and the plant feeds the extractor a two-case switch, so a dropped case reddens the pin
// rather than sliding a floor.
const PH_CODES = spaceOf("domain/types.ts", /export type DrillPhase = [^;]+;/, quoted);
const phCasesOf = (src) => [...src.matchAll(/case "(warmup|technique|decision|game|cooldown)":/g)].map((m) => m[1]);
const phCases = phCasesOf(switchBodyOf(appSrc.get("domain/rowText.ts") ?? "", "phaseLabel"));
const PH_PLANT_CASES = 'switch (x) {\n    case "warmup": return t("a");\n    case "game": return t("b");\n}';
ok(`the drill-phase union's type and the composer's switch carry the same codes (${PH_CODES.join(",")} vs ${[...phCases].sort().join(",")}; planted two-case switch reads ${phCasesOf(PH_PLANT_CASES).length})`,
  PH_CODES.length === 5 && phCases.length === 5 && [...PH_CODES].sort().join() === [...phCases].sort().join()
    && phCasesOf(PH_PLANT_CASES).length === 2);
// One spelling of the word, counted rather than trusted: exactly one module names a
// training.phase.* key and it is the composer, not a screen.
const phQuotedIn = (code) => [...code.matchAll(/["']training\.phase\.(warmup|technique|decision|game|cooldown)["']/g)].length;
const phComposers = [...appSrc].filter(([, c]) => phQuotedIn(c) > 0).map(([p, c]) => `${p} x${phQuotedIn(c)}`);
const PH_PLANT_QUOTE = 'const w = (p: string) => t("training.phase.game");';
ok(`exactly 1 module names a training.phase.* key and it is the composer, not a screen (${phComposers.join(", ") || "none"}), while a screen that starts quoting one is caught (${phQuotedIn(PH_PLANT_QUOTE)}), and the loaded composer is the module that declares phaseLabel (${rtDeclared.includes("phaseLabel")})`,
  phComposers.length === 1 && phComposers[0] === "domain/rowText.ts x5" &&
  phQuotedIn(PH_PLANT_QUOTE) === 1 && rtDeclared.includes("phaseLabel") && typeof rowTextModule.phaseLabel === "function");
// The behavioural half, through the shipped door, in all five codes and all locales —
// pinned by how many readings are NOT the code, so a composer that fell through to its
// unknown-code branch everywhere could not pass.
const phReadBad = [];
let phDiffer = 0;
const PH_DIFFER_PIN = 15;
for (const { id } of L) {
  for (const code of PH_CODES) {
    const shown = rowTextModule.phaseLabel(code, tReader(id));
    const want = D[id][`training.phase.${code}`];
    if (shown.startsWith("training.phase.")) phReadBad.push(`${id}: ${code} prints the key`);
    else if (shown !== want) phReadBad.push(`${id}: ${code} prints “${shown}” while the dictionary says “${want}”`);
    else if (shown !== code) phDiffer++;
  }
}
ok(`the shipped phaseLabel answers all ${PH_CODES.length} drill phases in all ${L.length} locales with the dictionary's own word and never a key (${phReadBad.join(" | ") || "no bad reading"}), and ${phDiffer}/${PH_CODES.length * L.length} of those readings are not the code already spelled (pin ${PH_DIFFER_PIN})`,
  phReadBad.length === 0 && phDiffer === PH_DIFFER_PIN);
ok(`and the same fallback is still the last resort for a phase outside the union (${rowTextModule.phaseLabel("Planted", tReader("en"))})`,
  rowTextModule.phaseLabel("Planted", tReader("en")) === "Planted");

// ─── 43 · the seventh family of the class M249 closed (M263) ───────────────────
// A player's position is one of eight English abbreviations — GK, CB, "LB / RB", DM, CM,
// AMC, "LW / RW", ST — and every one of them reached the glass as itself: a badge in the
// shared chrome, twelve text nodes in eight screens, and two intelligence facts whose
// sentence already nouns the var. The class M249 charged has always converted N call sites
// in N screens; here the centre of mass is ONE line of ui/primitives.tsx, which is why the
// wiring table counts 13 positions across 9 modules while the chrome conversion is a single
// position. Predictions written before the first run: the space is 8 and the composer's
// switch carries the same 8; exactly 1 module names a pos.* key; 24 direct readings of
// which 16 are not the code already spelled (the en value IS the abbreviation — a family
// that displays an abbreviation keeps its English, so the differ pin is an honest floor
// rather than the whole count); 24 door readings through `position`; the badge's 7
// attribute sites and the rank family's 2 stay codes and are pinned as counted shapes; and
// the unknown-code fallback. This family is also the first that cannot join codeWord's
// table: five of its codes are spelled exactly like five PositionGroup ids that M255
// already claimed, so the door dispatches on the variable's NAME — collision clause below.
// The literal-shape pin moves 1273 → 1281 here: the eight keys of the switch and nothing
// else.
const PS_WIRING = [
  ["ui/primitives.tsx", "positionLabel(position, t)", 1],
  ["features/compare/ComparePage.tsx", "positionLabel(selected.position, t)", 1],
  ["features/compare/ComparePage.tsx", "positionLabel(p.position, t)", 1],
  ["features/football/Details.tsx", "positionLabel(p.position, t)", 1],
  ["features/landing/Landing.tsx", "positionLabel(p.position, t)", 1],
  ["features/manager/ManagerOS.tsx", "positionLabel(p.position, t)", 2],
  ["features/player/PlayerOS.tsx", "positionLabel(state.profile.position, t)", 1],
  ["features/profile/ProfilePage.tsx", "positionLabel(p.position, t)", 1],
  ["features/scouting/ScoutingPanel.tsx", "positionLabel(p.position, t)", 3],
  ["features/world/DynamicWorld.tsx", "positionLabel(p.position, t)", 1],
];
const PS_FILES_PIN = 9;
const PS_POSITIONS_PIN = 13;
const PS_IMPORT = /^import \{[^}]*\bpositionLabel\b[^}]*\} from "@\/domain\/rowText"/m;
const psFiles = [...new Set(PS_WIRING.map(([p]) => p))];
const psSrc = new Map(psFiles.map((p) => [p, appSrc.get(p) ?? ""]));
const psCallsIn = (p, expr) => psSrc.get(p).split(expr).length - 1;
const psBad = PS_WIRING.filter(([p, expr, n]) => psCallsIn(p, expr) !== n)
  .map(([p, expr, n]) => `${p} wants ${expr} x${n}, found ${psCallsIn(p, expr)}`);
const psPositions = PS_WIRING.reduce((s, [, , n]) => s + n, 0);
ok(`the ${psFiles.length} modules that show a player's position word it through the shared composer at all ${psPositions} position(s) (pins ${PS_FILES_PIN} files/${PS_POSITIONS_PIN} positions), and each imports it from domain/rowText (${psBad.join(" | ") || "none"})`,
  psBad.length === 0 && psFiles.length === PS_FILES_PIN && psPositions === PS_POSITIONS_PIN &&
  psFiles.every((p) => PS_IMPORT.test(psSrc.get(p))));

// The census of what is still a code on the glass, and the only clause of this class that
// charges a chrome module. A raw read is a JSX expression container whose entire content is
// one read of the field, and the receiver is OPTIONAL: the shared badge destructures its own
// prop, so `{position}` with no dot in front of it is the one display shape that carries this
// family's code out of a chrome module. Arm A5 of this unit's witness is what proved that —
// unwrapping the badge reddened the wiring table and left this census green, because the
// pattern used to demand `x.position`. Shapes are then counted apart by the character that
// opens the container rather than by a hand-written file list: `=` means the read is an
// attribute feeding the shared badge, which words it; `$` means it is `${…}` inside a `#`
// template, the league-RANK family, a number that shares this field name and must not share
// this family's alibi; `(` means a binding pattern — the badge's own parameter — which is not
// a display slot and is therefore counted and named instead of being quietly dropped. Every
// bucket is pinned, so a scan that reads nothing cannot pass and a scan that reads everything
// cannot either, and the plant carries one of each of the four shapes.
const PS_READ = String.raw`\s*(?:[\w$]+(?:\.[\w$]+)*\.)?position\s*`;
const PS_READ_RE = new RegExp(String.raw`\{${PS_READ}\}`, "g");
const psReadsIn = (code) => {
  const display = [];
  let attr = 0, rank = 0, pattern = 0;
  for (const m of code.matchAll(PS_READ_RE)) {
    const before = code[m.index - 1];
    if (before === "=") attr++;
    else if (before === "$") rank++;
    else if (before === "(") pattern++;
    else display.push(m[0].replace(/\s+/g, ""));
  }
  return { display, attr, rank, pattern };
};
const psAgg = { display: [], attr: 0, rank: 0, pattern: [] };
for (const [p, c] of appSrc) {
  const s = psReadsIn(c);
  psAgg.attr += s.attr;
  psAgg.rank += s.rank;
  for (let i = 0; i < s.pattern; i++) psAgg.pattern.push(`${p} {position}`);
  for (const d of s.display) psAgg.display.push(`${p} ${d}`);
}
const PS_ATTR_PIN = 7;
const PS_RANK_PIN = 2;
const PS_PATTERN = ["ui/primitives.tsx {position}"];
const PS_PLANT = '<td>{p.position}</td><PositionTag position={r.position} /> value={`#${s.position}`} call(f({ position })) <b>{p.name} {position}</b>';
const psPlant = psReadsIn(PS_PLANT);
ok(`no module words a player's position as a raw code in a display slot, and the shapes this census counts apart are pinned rather than waved through (${psAgg.display.length} display, ${psAgg.attr} badge attributes pin ${PS_ATTR_PIN}, ${psAgg.rank} rank templates pin ${PS_RANK_PIN}, ${psAgg.pattern.length} binding pattern(s) excluded by name; ${psAgg.display.join(" | ") || "none on the glass"}) — and the receiver-less display shape is not simply trusted: a plant holding one of each of the four shapes reads ${psPlant.display.length}/${psPlant.attr}/${psPlant.rank}/${psPlant.pattern}`,
  psAgg.display.length === 0 && psAgg.attr === PS_ATTR_PIN && psAgg.rank === PS_RANK_PIN
    && psAgg.pattern.length === PS_PATTERN.length && psAgg.pattern.join() === PS_PATTERN.join()
    && psPlant.display.length === 2 && psPlant.attr === 1 && psPlant.rank === 1 && psPlant.pattern === 1);

// The value space, produced twice and compared to itself: the union in the domain types and
// the composer's switch, read from the switch's OWN body because GK is a bucket and a
// position at once. The key each case hands to t() comes from the same body, so the
// behavioural readings below are bound to the composer's actual spelling rather than to a
// table this file keeps by hand.
const PS_CODES = spaceOf("domain/types.ts", /export type PositionCode = [^;]+;/, quoted);
const psSwitch = switchBodyOf(appSrc.get("domain/rowText.ts") ?? "", "positionLabel");
const posCasesIn = (body) => [...body.matchAll(/case "(GK|CB|LB \/ RB|DM|CM|AMC|LW \/ RW|ST)":/g)].map((m) => m[1]);
const psKey = new Map([...psSwitch.matchAll(/case "(.*?)": return t\("pos\.(\w+)"\);/g)].map((m) => [m[1], m[2]]));
const PS_PLANT_CASES = 'export const positionLabel = (p: string, t: Translate): string => {\n  switch (p) {\n    case "GK": return t("a");\n    case "CB": return t("b");\n  }\n};';
ok(`the position union's type and the composer's switch carry the same codes (${PS_CODES.join(", ")} vs ${[...posCasesIn(psSwitch)].sort().join(", ")}), the switch names a pos.* key for every one of them (${psKey.size} pairs), and a planted two-case switch reads 2 rather than sliding a floor (${posCasesIn(PS_PLANT_CASES).length})`,
  PS_CODES.length === 8 && [...posCasesIn(psSwitch)].sort().join() === [...PS_CODES].sort().join()
    && psKey.size === 8 && PS_CODES.every((c) => psKey.has(c))
    && posCasesIn(PS_PLANT_CASES).length === 2);
// The clause that says why this family is not a codeWord branch: one spelling, two families,
// two tables. Ask the door for GK as a group and it must answer with the group's word; ask
// it for GK as a position and it must answer with the badge's. Both readings are checked
// against their own dictionary key in every locale, and the count of locales where the two
// words actually differ is reported — English is the discriminating one ("Goalkeeper" vs
// "GK"), while the two Chinese dictionaries happen to word GK the same way, which is exactly
// why the assertion is per-key rather than "they must differ everywhere".
const psCollideBad = [];
let psCollideDiffer = 0;
for (const { id } of L) {
  const asGroup = rowTextModule.fillRowVars({ group: "GK" }, tReader(id)).group;
  const asPosition = rowTextModule.fillRowVars({ position: "GK" }, tReader(id)).position;
  if (asGroup !== D[id]["group.GK"]) psCollideBad.push(`${id}: \`group\` read “${asGroup}”, the dictionary says “${D[id]["group.GK"]}”`);
  else if (asPosition !== D[id]["pos.gk"]) psCollideBad.push(`${id}: \`position\` read “${asPosition}”, the dictionary says “${D[id]["pos.gk"]}”`);
  else if (asGroup !== asPosition) psCollideDiffer++;
}
ok(`the two families that share five spellings answer from two tables: GK through \`group\` is the group's word and through \`position\` the badge's, in all ${L.length} locales, and in ${psCollideDiffer} of them one spelling really does mean two different things (pin ≥1 — en words the group "Goalkeeper" and the position "GK") (${psCollideBad.join(" | ") || "no misread"})`,
  psCollideBad.length === 0 && psCollideDiffer >= 1);

// One spelling of the word, counted: exactly one module names a pos.* key and it is the
// composer. The keys are reachable from the switch's literals, so the key-reachability gate
// reads them the same way it reads the bucket and phase families.
const posQuotedIn = (code) => [...code.matchAll(/["']pos\.(gk|cb|fb|dm|cm|am|w|st)["']/g)].length;
const posComposers = [...appSrc].filter(([, c]) => posQuotedIn(c) > 0).map(([p, c]) => `${p} x${posQuotedIn(c)}`);
const PS_PLANT_QUOTE = 'const w = (p: string) => t("pos.st");';
ok(`exactly 1 module names a pos.* key and it is the composer, not a screen (${posComposers.join(", ") || "none"}), while a screen that starts quoting one is caught (${posQuotedIn(PS_PLANT_QUOTE)}), and the loaded composer is the module that declares positionLabel (${rtDeclared.includes("positionLabel")})`,
  posComposers.length === 1 && posComposers[0] === "domain/rowText.ts x8" &&
  posQuotedIn(PS_PLANT_QUOTE) === 1 && rtDeclared.includes("positionLabel") && typeof rowTextModule.positionLabel === "function");

// The behavioural half, asked of the shipped composer directly in all eight codes and all
// three locales, and pinned by how many readings are NOT the code — 16 of 24, because the en
// dictionary holds the abbreviation the badge has always shown.
const psReadBad = [];
let psDiffer = 0;
const PS_DIFFER_PIN = 16;
for (const { id } of L) {
  for (const code of PS_CODES) {
    const shown = rowTextModule.positionLabel(code, tReader(id));
    const want = D[id][`pos.${psKey.get(code)}`];
    if (shown.startsWith("pos.")) psReadBad.push(`${id}: ${code} prints the key`);
    else if (shown !== want) psReadBad.push(`${id}: ${code} prints “${shown}” while the dictionary says “${want}”`);
    else if (shown !== code) psDiffer++;
  }
}
ok(`the shipped positionLabel answers all ${PS_CODES.length} position codes in all ${L.length} locales with the dictionary's own word and never a key (${psReadBad.join(" | ") || "no bad reading"}), and ${psDiffer}/${PS_CODES.length * L.length} of those readings are not the code already spelled (pin ${PS_DIFFER_PIN})`,
  psReadBad.length === 0 && psDiffer === PS_DIFFER_PIN);
ok(`and the same fallback is still the last resort for a position outside the space (${rowTextModule.positionLabel("Planted", tReader("en"))})`,
  rowTextModule.positionLabel("Planted", tReader("en")) === "Planted");

// The back door, now a front door: both intelligence facts have always carried a position as
// a row var, and the CODE_VARS list plus the name dispatch words them in every locale with no
// producer edit. The rank family proves the other half of the same door — a var called
// `position` that holds a NUMBER passes straight through, which is the one thing standing
// between this family and a squad-slot rank being read as a position.
const PS_ROW_SITES = [...appSrc].filter(([, c]) => /vars:\s*\{[^}]*\bposition:/.test(c)).map(([p]) => p);
const psFactBad = [];
for (const { id } of L) {
  const shown = rowTextModule.rowLine({ key: "ai.fact.player", vars: { name: "X", position: "CM", age: 24, nation: "England", club: "Arsenal", overall: 87, potential: 90, value: "€50M", foot: "L" } }, tReader(id));
  if (shown === undefined || /[{}]/.test(shown)) psFactBad.push(`${id} leaves braces: ${shown}`);
  else if (!shown.includes(D[id]["pos.cm"])) psFactBad.push(`${id} never words the position: ${shown}`);
  else if (id !== "en" && /(^|[^A-Za-z])CM([^A-Za-z]|$)/.test(shown)) psFactBad.push(`${id} still prints the code: ${shown}`);
}
const psDoorBad = [];
for (const { id } of L) {
  for (const code of PS_CODES) {
    const shown = rowTextModule.fillRowVars({ position: code }, tReader(id)).position;
    const want = D[id][`pos.${psKey.get(code)}`];
    if (shown !== want) psDoorBad.push(`${id}: ${code} reads “${shown}” where the dictionary says “${want}”`);
  }
}
const PS_ROW_PLANT = 'add({ key: "ai.fact.keyMan", vars: { name: n, position: p } });';
const plantPsRow = /vars:\s*\{[^}]*\bposition:/.test(PS_ROW_PLANT) && !/vars:\s*\{[^}]*\bposition:/.test('add({ key: "ai.fact.keyMan", vars: { name: n } });');
ok(`the ${PS_ROW_SITES.length} shipped row(s) carrying a position go through the CODE_VARS door (door open: ${rowTextModule.isCodeVar("position")}; ${PS_ROW_SITES.join(", ")}), all ${PS_CODES.length * L.length} door readings match the dictionary (${psDoorBad.join(" | ") || "clean"}), the fact words a CM in all ${L.length} locales and prints no bare code to the two Chinese ones (${psFactBad.join(" | ") || "clean"}), a rank row's number still passes through untouched (${rowTextModule.fillRowVars({ position: 7 }, tReader("en")).position}), and the detector tells a position-carrying vars body from a clean one (${plantPsRow})`,
  PS_ROW_SITES.length === 2 && rowTextModule.isCodeVar("position") && psDoorBad.length === 0
    && psFactBad.length === 0 && rowTextModule.fillRowVars({ position: 7 }, tReader("en")).position === 7 && plantPsRow);

// The space typed rather than stringly, and the hand copy that used to disagree with it.
// domain/worldEngine.ts carried its own POS_LABEL whose four values (RB, CDM, CAM, RW)
// spelled positions no producer can emit, so a regenerated player was labelled one way on
// /world and another everywhere else — a second producer of the same value space, invisible
// to every clause above because it never reached the glass as a code. domain/transfers.ts
// widened the same value to `string` on the way out, which the type clause below now
// refuses.
const psUnionDecls = [...appSrc].filter(([, c]) => /export type PositionCode =/.test(c)).map(([p]) => p);
const psTyped = [...appSrc].reduce((n, [, c]) => n + (c.match(/position: PositionCode;/g) ?? []).length, 0);
const psUntyped = [...appSrc].filter(([, c]) => /position: string;/.test(c)).map(([p]) => p);
const PS_STRAY = [...appSrc].filter(([, c]) => /"(RB|RW|CDM|CAM)"/.test(c)).map(([p]) => p);
ok(`exactly 1 module declares the position space (${psUnionDecls.join(", ") || "none"}), ${psTyped} fields are typed with it and ${psUntyped.length} still take any string (pin 0; ${psUntyped.join(", ") || "none"}), and no module abbreviates a position with one of the four spellings only the engine's retired hand copy used (${PS_STRAY.join(", ") || "none"})`,
  psUnionDecls.length === 1 && psUnionDecls[0] === "domain/types.ts" && psTyped === 7 && psUntyped.length === 0 && PS_STRAY.length === 0);

// The witness for the gate fix this family forced. Sections 41 and 42 counted a composer's
// switch cases by scanning the WHOLE of domain/rowText.ts, which was harmless while no two
// families shared a spelling; `case "GK":` is a scout bucket AND a player position, so the
// bucket clause read six codes in a file holding five and reddened a clause about a correct
// file. The extractors are now scoped to the named composer's own body, and this clause
// proves the scoping carries it: a planted file with both switches reads 2 per family where
// the same text scanned whole reads 3, and on the shipped file the scoped count is the
// family's own 5 while the unscoped count is strictly larger.
const PS_SCOPE_PLANT = 'export const bucketLabel = (b: string): string => {\n  switch (b) {\n    case "ALL": return "a";\n    case "GK": return "b";\n  }\n};\nexport const positionLabel = (p: string): string => {\n  switch (p) {\n    case "GK": return "c";\n    case "ST": return "d";\n  }\n};';
const psScopeWhole = bkCasesOf(PS_SCOPE_PLANT).length;
const psScopePlant = bkCasesOf(switchBodyOf(PS_SCOPE_PLANT, "bucketLabel")).length;
const psWholeRT = bkCasesOf(appSrc.get("domain/rowText.ts") ?? "");
ok(`a switch-cases extractor reads the composer it names, not the file it lives in (${psScopePlant} cases in the planted bucket switch where the same text scanned whole reads ${psScopeWhole}; shipped bucket switch ${bkCases.length} of ${psWholeRT.length} whole-file matches), and the difference is load-bearing rather than decorative (${psWholeRT.length > bkCases.length ? "a second family in the same module shares its spellings" : "no family currently collides — re-derive this"})`,
  psScopePlant === 2 && psScopeWhole === 3 && bkCases.length === 5 && psWholeRT.length > bkCases.length);

// ─── 44 · codeWord answers by SPELLING, so its branch order is load-bearing (M264) ─────
// The door's lookup walks a list of value spaces and the FIRST branch whose list contains a
// code returns that branch's key; the code's family is never part of the question. So a
// spelling two families share is not a tie — one family answers for the other, and which one
// speaks is decided by which line is written above. M263 charged the pair that was colliding
// (GK, CB, DM, CM and ST are both a PositionGroup id and a position abbreviation) by moving
// the `position` var to a NAME dispatch; nothing read the remaining spaces, and an attribute
// key one day spelled `player` would have been answered by the graph-legend branch above it
// with no clause firing.
//
// Both ends are derived rather than copied: the branch table is scanned out of the shipped
// function body with a balanced-paren read, and every branch is matched to an exported array
// of the modules the SAME file imports — a predicate branch (isGoalCode) to the exported
// arrays whose every element that predicate accepts. So a branch consulting a list nobody
// registers, and a registered list no branch consults, both redden here instead of going
// unread. The behavioural half feeds every member of every branch through the shipped door
// with a recorder in place of the dictionary, which is what makes a shadowing visible: the
// later branch's code asks the earlier branch's key.
{
  // The scanned file is named ONCE, and the clause's own sentence reads that name, so a
  // census pointed at another module cannot report that it walked the door's file.
  const cwFile = "domain/rowText.ts";
  const cwSrc = appSrc.get(cwFile) ?? "";
  const cwFn = cwSrc.indexOf("function codeWord(");
  const cwOpen = cwSrc.indexOf("{", cwFn);
  let cwDepth = 0, cwEnd = -1;
  for (let i = cwOpen; i < cwSrc.length; i++) {
    if (cwSrc[i] === "{") cwDepth++;
    else if (cwSrc[i] === "}" && --cwDepth === 0) { cwEnd = i; break; }
  }
  const cwBody = cwEnd < 0 ? "" : cwSrc.slice(cwOpen + 1, cwEnd);

  // One branch line reads `if (<cond>) return t(<key>);`. The condition is taken between the
  // first `(` and the sentinel `) return t(` — a regex over the whole line would stop at the
  // `)` inside `(X as readonly string[]).includes(code)`.
  const cwBranches = [];
  for (const line of cwBody.split("\n")) {
    const cut = line.indexOf(") return t(");
    if (!line.trim().startsWith("if (") || cut < 0) continue;
    const cond = line.slice(line.indexOf("(") + 1, cut);
    const name = (cond.match(/[A-Za-z_][A-Za-z0-9_]*/) || [""])[0];
    const arg = line.slice(cut + ") return t(".length).replace(/\)\s*;?\s*$/, "").trim();
    const tmpl = arg.match(/^`([^$]*)\$\{/);
    const literals = tmpl ? [] : [...arg.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    cwBranches.push({ name, cond, prefix: tmpl ? tmpl[1] : null, literals, order: cwBranches.length });
  }

  // The pool: every string array and every string-returning predicate exported by the
  // modules rowText.ts itself imports, so the census cannot be handed a list the shipped
  // chain never consulted. Keyed by MODULE, not by import statement: a file may take a value
  // and a type from the same module in two lines (M265's `SearchKind` is a second
  // `from "./types"`), and registering that module twice would make every list it exports
  // ambiguous and read as UNRESOLVED.
  const cwImports = [...new Set([...cwSrc.matchAll(/from "\.\/(\w+)"/g)].map((m) => m[1]))];
  const cwPool = { lists: [], preds: [] };
  for (const mod of cwImports) {
    const m = await server.ssrLoadModule(`/domain/${mod}.ts`);
    for (const [k, v] of Object.entries(m)) {
      // Pool every non-empty exported array, not just arrays of strings: POSITION_GROUPS is
      // an array of objects and the branch that consults it reads `.id` off each one, so a
      // string-only pool would report the group branch as UNRESOLVED.
      if (Array.isArray(v) && v.length > 0) cwPool.lists.push({ name: k, value: v, mod });
      if (typeof v === "function") cwPool.preds.push({ name: k, value: v, mod });
    }
  }
  const cwOf = (b) => {
    const direct = cwPool.lists.filter((e) => e.name === b.name);
    if (direct.length === 1) {
      const raw = direct[0].value;
      return { how: b.name, members: /\.map\(/.test(b.cond) ? raw.map((o) => o.id ?? o) : raw };
    }
    const pred = cwPool.preds.find((e) => e.name === b.name);
    if (!pred) return { how: `UNRESOLVED ${b.name}`, members: [] };
    const claimed = cwPool.lists.filter((e) => e.value.every((v) => pred.value(v)));
    if (claimed.length !== 1) return { how: `AMBIGUOUS ${b.name}:${claimed.map((c) => c.name).join("+") || "none"}`, members: [] };
    return { how: `${b.name}<-${claimed[0].name}`, members: claimed[0].value };
  };
  const cwSpaces = cwBranches.map((b) => ({ ...b, ...cwOf(b) }));
  const cwTotal = cwSpaces.reduce((a, s) => a + s.members.length, 0);
  const cwBadLists = cwSpaces.filter((s) => /UNRESOLVED|AMBIGUOUS/.test(s.how) || !s.members.length);
  // A branch that consults a list nobody registers must come back named, or "every branch
  // resolved" is a claim about a scan that resolved nothing.
  const cwGhost = cwOf({ name: "NOT_A_REGISTERED_LIST", cond: "NOT_A_REGISTERED_LIST.includes(code)", order: 0 });

  const CW_BRANCH_PIN = 14;
  const CW_MEMBER_PIN = 95;
  const cwAsk = (code) => {
    const seen = [];
    const filled = rowTextModule.fillRowVars({ kind: code }, (k, v) => { seen.push(k); return translate("en", k, v); });
    return { seen, out: filled ? filled.kind : "" };
  };
  const cwOwner = (code) => cwSpaces.find((s) => s.members.includes(code)) ?? null;
  const cwOwns = (s, key) => (s.prefix ? key.startsWith(s.prefix) : s.literals.includes(key));
  const cwMismatch = [];
  for (const s of cwSpaces) for (const code of s.members) {
    const owner = cwOwner(code);
    const a = cwAsk(code);
    if (a.seen.length !== 1) { cwMismatch.push(`${code} asked ${a.seen.length}`); continue; }
    if (owner !== s) cwMismatch.push(`${code} claimed by branch ${s.order} and ${owner.order}`);
    else if (!cwOwns(s, a.seen[0])) cwMismatch.push(`${code} ${s.prefix || s.literals.join("/")} but asked ${a.seen[0]}`);
  }
  const cwUnknown = cwAsk("NO_SUCH_CODE_ANYWHERE");

  // Pairwise disjointness over the loaded lists, and the same detector aimed at a planted
  // table where two branches claim one spelling — so a 0 that means "the scan read nothing"
  // cannot pass. The plant tests the detector; the real numbers come from the shipped lists.
  const cwShared = (spaces) => {
    const out = [];
    for (let i = 0; i < spaces.length; i++) for (let j = i + 1; j < spaces.length; j++) {
      for (const c of spaces[i].members) if (spaces[j].members.includes(c)) out.push(`${c} branch ${spaces[i].order} answers for ${spaces[j].order}`);
    }
    return out;
  };
  const cwPairs = (cwSpaces.length * (cwSpaces.length - 1)) / 2;
  const cwCollide = cwShared(cwSpaces);
  const cwPlant = cwShared([{ order: 1, members: ["L", "R"] }, { order: 2, members: ["technical", "L"] }]);

  ok(`codeWord's body walks ${cwBranches.length} branches in source order (${cwSpaces.map((s) => `${s.order}:${s.how}=${s.members.length}`).join(" ")}) totalling ${cwTotal} codes, each one matched to an exported list of a module ${cwFile} itself imports and none of them empty or ambiguous (${cwBadLists.map((s) => s.how).join(" | ") || "all resolved"}), while a branch naming a list nobody registers comes back ${cwGhost.how} rather than as an empty success`,
    cwBranches.length === CW_BRANCH_PIN && cwTotal === CW_MEMBER_PIN && cwBadLists.length === 0 && /^UNRESOLVED/.test(cwGhost.how));
  ok(`all ${cwTotal} codes go through the shipped door and each asks its OWN branch's key (${cwMismatch.join(" | ") || "0 mismatched"}) — that is the shadowing test, because a spelling two branches claim asks the earlier one's prefix — and a code no branch claims asks nothing and is returned exactly as written (${cwUnknown.seen.length} keys asked, reads "${cwUnknown.out}")`,
    cwTotal === CW_MEMBER_PIN && cwMismatch.length === 0 && cwUnknown.seen.length === 0 && cwUnknown.out === "NO_SUCH_CODE_ANYWHERE");
  ok(`the ${cwTotal} codes are pairwise disjoint across the ${cwSpaces.length} spaces (${cwPairs} pairs, ${cwCollide.length} shared${cwCollide.length ? ": " + cwCollide.join(" | ") : ""}), and the same detector run on a planted table where a later branch re-claims one foot code names exactly that one shadowing and blames the earlier branch (${cwPlant.length ? cwPlant.join(" | ") : "plant read clean — the detector is blind"})`,
    cwBranches.length === CW_BRANCH_PIN && cwTotal === CW_MEMBER_PIN && cwCollide.length === 0 && cwPlant.length === 1 && /branch 1 answers for 2/.test(cwPlant[0]));
}

// ─── 45 · one retrieval kind, one type, one door, one word (M265) ─────────────────────
// `club`, `player`, `competition`, `match`, `news` is the app's oldest value space: a search
// result carries one, a knowledge-graph node carries one, the canvas colours one, and the search
// page prints one section per kind. None of it reached a reader as a word. The five names had
// been re-typed by hand in four places — SearchResult["type"], KgNode["type"], the canvas's
// Record<KgNode["type"], string> colour table and the page's section list — so a sixth kind was a
// compile error in none of them at once, while the command palette interpolated the stored code
// ({r.type}) and the graph legend beside it built its own ai.legend.… key. One type now derives
// from the runtime list, the door owns the key, and a composer words the kind THROUGH the door.
//
// What is charged is the drift those four copies made possible. Every negative here is bound to a
// plant the SAME detector reads, and the detectors work by set relation rather than by name: a
// hand copy is charged when a quoted union or an array literal holds EXACTLY the family, while a
// favourite's three names and a news-impact role's two are a different space — printed, not
// charged. Matching the five words forever would read clean through its own narrowing; charging
// the subsets would charge working code, so the near-miss rows are named in the same sentence.
{
  const skRuntime = await server.ssrLoadModule("/domain/types.ts");
  const SK = skRuntime.SEARCH_KINDS;
  const SK_FILE = "domain/types.ts";
  // The subsets are named row by row, not counted: M266 collapsed the favourite family's three
  // hand-typed unions into one runtime list, so the 3-name row here IS that list and section 46
  // owns it, while the 2-name row is a news-impact role — a different space again. A count would
  // let either of them move into a third file without being read.
  const SK_NEAR_PIN = "domain/newsImpact.ts=2 domain/types.ts=3";
  const skRowSrc = appSrc.get("domain/rowText.ts") ?? "";
  const skSet = (xs) => xs.slice().sort().join("|");
  const skNames = (text) => [...new Set([...text.matchAll(/"([^"]+)"/g)].map((m) => m[1]))];
  const skInFamily = (xs) => xs.every((n) => SK.includes(n));

  // A quoted union and an array literal of string literals, read structurally: one alternative
  // then one or more `| "literal"`, one element then zero or more `, "literal"`. Nothing in the
  // pattern names a kind, so the family can only be matched by holding the whole family.
  const SK_UNION = /"[^"]*"(?:\s*\|\s*"[^"]*")+/g;
  const SK_ARRAY = /\[\s*"[^"]*"(?:\s*,\s*"[^"]*")*\s*\]/g;
  const skScan = (code) => {
    const unions = [], arrays = [];
    for (const m of code.matchAll(SK_UNION)) {
      const members = skNames(m[0]);
      if (members.length > 1 && skInFamily(members)) unions.push({ members, exact: skSet(members) === skSet(SK), at: m.index });
    }
    for (const m of code.matchAll(SK_ARRAY)) {
      const members = skNames(m[0]);
      if (members.length > 1 && skInFamily(members)) arrays.push({ members, exact: skSet(members) === skSet(SK), at: m.index });
    }
    return { unions, arrays };
  };
  const skUnions = [], skArrays = [];
  for (const [path, code] of appSrc) {
    const s = skScan(code);
    for (const u of s.unions) skUnions.push({ ...u, path });
    for (const a of s.arrays) skArrays.push({ ...a, path });
  }
  const skExactUnions = skUnions.filter((u) => u.exact);
  const skExactArrays = skArrays.filter((a) => a.exact);
  const skNear = skUnions.concat(skArrays).filter((x) => !x.exact);

  // The text between a literal's line start and the literal itself is where an annotation lives.
  // A list that names SearchKind is a LISTING (the search page's own display order); one that
  // does not is a second definition of the family — unless it is the list the type derives from.
  const skHead = (hit) => {
    const code = appSrc.get(hit.path) ?? "";
    return code.slice(code.lastIndexOf("\n", hit.at - 1) + 1, hit.at).trim();
  };
  const skBareCopies = skExactArrays
    .filter((a) => a.path !== SK_FILE && !/SearchKind/.test(skHead(a)))
    .concat(skExactUnions);

  const skTypeDecl = ((appSrc.get(SK_FILE) ?? "").match(/export type SearchKind\s*=\s*[^;]+;/) || [""])[0];
  const skDerived = /typeof\s+SEARCH_KINDS\s*\)\s*\[\s*number\s*\]/.test(skTypeDecl) && !/"club"/.test(skTypeDecl);

  // The canvas's colour table, balanced-read out of the shipped file: its keys ARE the legend's
  // rows, so the table holding exactly the family is what stops a kind drawing colourless.
  const aiSrc = appSrc.get("features/ai/AiStudio.tsx") ?? "";
  const skTableAt = aiSrc.indexOf("const TYPE_COLOR");
  const skTableOpen = aiSrc.indexOf("{", skTableAt);
  let skDepth = 0, skTableEnd = -1;
  for (let i = skTableOpen; i >= 0 && i < aiSrc.length; i++) {
    if (aiSrc[i] === "{") skDepth++;
    else if (aiSrc[i] === "}" && --skDepth === 0) { skTableEnd = i; break; }
  }
  const skTableKeys = skTableEnd < 0 ? [] : [...aiSrc.slice(skTableOpen + 1, skTableEnd).matchAll(/^\s*(\w+):/gm)].map((m) => m[1]);
  const skTableHead = skTableAt < 0 ? "" : aiSrc.slice(aiSrc.lastIndexOf("\n", skTableAt - 1) + 1, skTableOpen).trim();
  const skLegendDerived = /Object\.keys\(\s*TYPE_COLOR\s*\)/.test(aiSrc);

  const skPlant = skScan('type ShadowKind = "club" | "player" | "competition" | "match" | "news";\nconst SHADOW: readonly string[] = ["club", "player", "competition", "match", "news"];');
  const skGhost = skScan('type Favours = "club" | "player" | "competition";\nconst STATUSES = ["LIVE", "SCHEDULED", "FINISHED"];');

  ok(`the ${SK.length} retrieval kinds (${SK.join(", ")}) are typed once: SearchKind is ${skDerived ? "derived from (typeof SEARCH_KINDS)[number]" : 'RESTATED BY HAND (' + (skTypeDecl || "missing") + ")"}, the canvas's colour table holds ${skTableKeys.length} rows (${skTableKeys.join(",")}) declared ${skTableHead || "absent"} and the legend walks ${skLegendDerived ? "Object.keys(TYPE_COLOR)" : "a second list"}, ${skExactArrays.length} arrays write all ${SK.length} names (${skExactArrays.map((a) => `${a.path}: ${skHead(a) || "bare"}`).join(" | ")}) of which ${skBareCopies.length} define the family instead of naming it (${skBareCopies.map((b) => `${b.path}:${b.members.length}`).join(" | ") || "none"} — that is the four-copies test, because a carrier that restates the union is a carrier no sixth kind can reach), while ${skNear.length} near-miss subsets stay a different space (${skNear.map((n) => `${n.path}=${n.members.length}`).join(" ")}) and the same scan charges a planted union and a planted list (${skPlant.unions.length}/${skPlant.arrays.length} exact) yet never charges the subsets (${skGhost.unions.length} read, ${skGhost.unions.filter((u) => u.exact).length} charged)`,
    SK.length === 5 && skDerived && skSet(skTableKeys) === skSet(SK) && /SearchKind/.test(skTableHead) && skLegendDerived &&
    skExactArrays.length === 2 && skBareCopies.length === 0 &&
    skNear.map((n) => `${n.path}=${n.members.length}`).join(" ") === SK_NEAR_PIN &&
    skPlant.unions.length === 1 && skPlant.unions[0].exact === true && skPlant.arrays.length === 1 && skPlant.arrays[0].exact === true &&
    skGhost.unions.length === 1 && skGhost.unions[0].exact === false);

  // Who builds the door's key, and who words a kind beside it.
  const skLegendScan = (code) => [...code.matchAll(/ai\.legend\./g)].length;
  const skLegendSites = [];
  for (const [path, code] of appSrc) for (let i = skLegendScan(code); i > 0; i--) skLegendSites.push(path);
  const skCom = skRowSrc.match(/export const searchKindLabel = \(([^)]*)\)([^=]*)=>\s*([^;]+);/) || [];
  const skComParams = skCom[1] ?? "(composer missing)";
  const skComBody = skCom[3] ?? "";
  const skCallSites = [];
  for (const [path, code] of appSrc) for (const m of code.matchAll(/searchKindLabel\(/g)) skCallSites.push(path);
  const skPlantLegend = skLegendScan("const label = t(`ai.legend.${kind}`);");

  ok(`ai.legend. is composed by ${skLegendSites.length} line in the ${appSrc.size} app modules (${skLegendSites.join(" ") || "none"}) — the door's own branch — and the shipped composer takes (${skComParams}) and its body is ${skComBody || "unread"}, so it words a kind THROUGH the door rather than beside it, while the ${skCallSites.length} modules that show a kind (${[...new Set(skCallSites)].join(" ")}) both ask it and a chrome-side lookup written into a planted module is counted by the same scan (${skPlantLegend})`,
    skLegendSites.length === 1 && skLegendSites[0] === "domain/rowText.ts" &&
    /SearchKind/.test(skComParams) && !/kind:\s*string/.test(skComParams) &&
    skComBody === "codeWord(kind, t)" && skCallSites.length === 2 &&
    new Set(skCallSites).size === 2 && skPlantLegend === 1);

  // The display half of the class: a code shown AS text is the reader's problem, a code sitting in
  // an attribute (a React key, cmdk's filter value) is the app's own identity, and only the first
  // is charged. A text child is charged only when the WHOLE expression is a bare member access:
  // `{searchKindLabel(r.type, t)}` reads the same field and is the fix, so a detector that charged
  // it would charge every converted screen — the read count is printed and pinned with the charge,
  // so `0 charged` can never come from `read nothing`.
  const SK_TEXT_CHILD_PIN = 25;
  const SK_ATTR = /\b(?:key|value|id)\s*=\s*\{[^=]{0,80}?\.(?:type|kind)\b/g;
  const SK_MEMBER = /^[A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*)*$/;
  const SK_CHILD_KIND = /\.(?:type|kind)\b/;
  const skBareText = (e) => SK_MEMBER.test(e) && /\.(?:type|kind)\??$/.test(e);
  // Read a JSX text child with a BALANCED walk, not `[^{}]+`: an expression that opens braces
  // itself — the pre-M265 shape `t(`ai.legend.${r.type}`)` — is exactly the site this census
  // exists to see, and a scan that stops at its inner brace reads 9 and pins 10, so the count
  // would move on a refactor that added and removed nothing.
  const skTextChildren = (code) => {
    const out = [];
    for (let i = 0; i < code.length; i++) {
      if (code[i] !== "{" || !/>\s*$/.test(code.slice(Math.max(0, i - 40), i))) continue;
      let depth = 0, j = i;
      for (; j < code.length; j++) {
        if (code[j] === "{") depth++;
        else if (code[j] === "}" && --depth === 0) break;
      }
      if (depth !== 0 || !/^\s*</.test(code.slice(j + 1, j + 41))) continue;
      out.push(code.slice(i + 1, j).trim());
    }
    return out;
  };
  const skDisplayScan = (code) => {
    const kindKids = skTextChildren(code).filter((e) => SK_CHILD_KIND.test(e));
    return { read: kindKids.length, bare: kindKids.filter(skBareText), attr: [...code.matchAll(SK_ATTR)].length };
  };
  const skBareChild = [], skAttrSites = [];
  let skRead = 0;
  for (const [path, code] of appSrc) {
    const s = skDisplayScan(code);
    skRead += s.read;
    for (const b of s.bare) skBareChild.push(`${path} {${b}}`);
    if (s.attr) skAttrSites.push(`${path}=${s.attr}`);
  }
  const skTotalAttr = skAttrSites.reduce((a, x) => a + (+x.split("=")[1]), 0);
  const skPlantChild = skDisplayScan("<span>{r.type}</span>");
  const skPlantWorded = skDisplayScan("<span>{searchKindLabel(r.type, t)}</span>");
  const skPlantTemplate = skDisplayScan('<span>{t(`ai.legend.${r.type}`)}</span>');
  const skPlantAttr = skDisplayScan('<CommandItem key={`${r.type}-${r.id}`}>');

  ok(`${skRead} text children read a kind or type field and ${skBareChild.length} of them show the stored code bare (${skBareChild.join(" | ") || "none"}) while ${skTotalAttr} attribute positions still carry it, and those are the app's own identity rather than the reader's copy (${skAttrSites.join(" ")}) — the same scan charges a planted code in a text child (${skPlantChild.bare.length}), reads a planted worded composer as ${skPlantWorded.read} child charged ${skPlantWorded.bare.length}, reads a planted key built inside a template literal as ${skPlantTemplate.read} child charged ${skPlantTemplate.bare.length} (the walk is balanced, so the braces of ${"${}"} do not end the read), and an attribute-bearing key as ${skPlantAttr.bare.length} text child and ${skPlantAttr.attr} attribute`,
    skBareChild.length === 0 && skRead === SK_TEXT_CHILD_PIN && skTotalAttr === 5 &&
    skPlantChild.bare.length === 1 && skPlantChild.read === 1 &&
    skPlantWorded.read === 1 && skPlantWorded.bare.length === 0 &&
    skPlantTemplate.read === 1 && skPlantTemplate.bare.length === 0 &&
    skPlantAttr.bare.length === 0 && skPlantAttr.attr === 1);

  // The behavioural leg: the shipped door and the shipped composer, every kind, every locale.
  const skAsk = (code) => {
    const seen = [];
    const filled = rowTextModule.fillRowVars({ kind: code }, (k, v) => { seen.push(k); return translate("en", k, v); });
    return { seen, out: filled ? filled.kind : "" };
  };
  const skT = (loc) => tReader(loc.id);
  const skRows = SK.map((code) => {
    const ask = skAsk(code);
    return { code, asked: ask.seen.length, key: ask.seen[0] ?? "", door: ask.out,
      words: L.map((loc) => rowTextModule.searchKindLabel(code, skT(loc))),
      plural: L.map((loc) => D[loc.id][`fw.type.${code}`] ?? "") };
  });
  const skWrongKey = skRows.filter((r) => r.asked !== 1 || r.key !== `ai.legend.${r.code}`);
  const skRawWords = [];
  for (const r of skRows) L.forEach((loc, i) => {
    const w = r.words[i];
    if (!w || w === r.code || w === `ai.legend.${r.code}`) skRawWords.push(`${r.code}/${loc.id}="${w}"`);
  });
  const skDoorDrift = skRows.filter((r) => r.door !== r.words[0]);
  const skEnFamily = skRows.map((r) => `${r.code}: ${r.words.join(" / ")} | plural ${r.plural.join(" / ")}`).join("  ·  ");
  // Measured at M265: the two families the app words a kind with are not synonyms. English gives
  // a chip the singular and a section heading the plural, so four of the five disagree (`news`
  // writes the same word either way); both Chinese locales agree on every kind except `match`,
  // where the chip says 赛程/賽程 (a fixture list) and the heading says 比赛/比賽 (the sport).
  // The pin is the per-locale diff SET, so a locale drifting toward the other family is named.
  const skDiff = L.map((loc, i) => `${loc.id}=${skRows.filter((r) => r.words[i] !== r.plural[i]).map((r) => r.code).join("+") || "none"}`);
  const SK_DIFF_PIN = ["en=club+player+competition+match", "zh-CN=match", "zh-TW=match"];
  const skKeyCounts = L.map((loc) => [Object.keys(D[loc.id]).filter((k) => k.startsWith("ai.legend.")).length, Object.keys(D[loc.id]).filter((k) => k.startsWith("fw.type.")).length]);

  ok(`all ${skRows.length} kinds go through the shipped door and the shipped composer in ${L.length} locales (${skEnFamily}): every kind asks exactly one key of its own family (${skWrongKey.map((r) => `${r.code} asked ${r.asked}=${r.key}`).join(" | ") || "0 wrong"}), the composer's English answer is the door's own (${skDoorDrift.map((r) => `${r.code} door="${r.door}" composer="${r.words[0]}"`).join(" | ") || "all agree"}), no locale shows the code or the key back (${skRawWords.join(" | ") || "none"}), the two families disagree on ${skDiff.join(" ")} — English splits singular chip from plural section heading, Chinese writes one word except for the fixture/match pair — and ${skKeyCounts.map(([a, b]) => `${a}+${b}`).join(" ")} keys carry them`,
    skRows.length === 5 && skWrongKey.length === 0 && skRawWords.length === 0 && skDoorDrift.length === 0 &&
    skDiff.join("|") === SK_DIFF_PIN.join("|") && skRows.find((r) => r.code === "match").words[0] === "Fixture" &&
    skKeyCounts.every(([a, b]) => a === 5 && b === 5));
}

// ---- 46 (M266): the favourite family — three names, one list, one composer, one slot table.
// The family the retrieval scan reads and deliberately does NOT charge: club, player and
// competition are also three of the five retrieval kinds, so a set relation cannot tell the two
// families apart on members alone, and `codeWord` cannot answer for both (its table is
// name-blind, and the legend branch is reached first — the M263 collision). So this family needs
// its own three checks: that the space is written once, that the slot table is exhaustive over
// it, and that the key is built in exactly one module.
{
  const FA_FILE = "domain/types.ts";
  const FA = ["club", "player", "competition"];
  const faKey = (xs) => xs.slice().sort().join("|");
  const faNames = (text) => [...new Set([...text.matchAll(/"([^"]+)"/g)].map((m) => m[1]))];
  const FA_UNION = /"[^"]*"(?:\s*\|\s*"[^"]*")+/g;
  const FA_ARRAY = /\[\s*"[^"]*"(?:\s*,\s"[^"]*")*\s*\]/g;
  const faScan = (code) => {
    const out = [];
    for (const m of code.matchAll(FA_UNION)) {
      const xs = faNames(m[0]);
      if (xs.length > 1 && xs.every((n) => FA.includes(n))) out.push({ kind: "union", xs });
    }
    for (const m of code.matchAll(FA_ARRAY)) {
      const xs = faNames(m[0]);
      if (xs.length > 1 && xs.every((n) => FA.includes(n))) out.push({ kind: "array", xs });
    }
    return out;
  };
  const faRows = [];
  for (const [path, code] of appSrc) for (const h of faScan(code)) faRows.push({ path, ...h });
  const faExact = faRows.filter((r) => faKey(r.xs) === faKey(FA));
  const faCopy = faExact.filter((r) => !(r.path === FA_FILE && r.kind === "array"));
  // Two plants, because a scan that charges nothing proves only that it read nothing: both forms
  // of a second copy of the exact space, a union and an array. The ghost pair is the other
  // direction and it has two different answers — the five-name list is not even a candidate of
  // this space (a member is outside it), while a two-name subset IS read and must NOT be charged:
  // that is a role, a filter, or any other partial use of the same words. Only the exact three
  // names belong to this section.
  const faPlant = faScan('const T = (k: "club" | "player" | "competition") => 0; const L2 = ["club", "player", "competition"];');
  const faGhost = faScan('const S = ["club", "player", "competition", "match", "news"]; const U = "club" | "player";');

  const typesSrc = appSrc.get(FA_FILE) ?? "";
  const faList = (typesSrc.match(/export const FAVORITE_KINDS[^;]*;/) || [""])[0];
  const faType = (typesSrc.match(/export type FavoriteKind\s*=\s*[^;]+;/) || [""])[0];
  const faTable = (typesSrc.match(/export const FAVORITES[\s\S]*?\n\};/) || [""])[0];
  const faSlots = [...faTable.matchAll(/(\w+):\s*\{\s*read:\s*\(p\)\s*=>\s*p\.(\w+),\s*write:\s*\(p,\s*id\)\s*=>\s*\(\{\s*\.\.\.p,\s*(\w+):\s*id\s*\}\)/g)]
    .map((m) => ({ code: m[1], read: m[2], write: m[3] }));
  const profileFields = ((typesSrc.match(/export interface UserProfile\s*\{([\s\S]*?)\n\}/) || [, ""])[1].match(/favorite[A-Za-z]*/g) || []);

  const rtSrc = appSrc.get("domain/rowText.ts") ?? "";
  const composer = (rtSrc.match(/export const favoriteLabel = \([^)]*\)[^=]*=>[\s\S]*?;/) || [""])[0];
  const favSites = (code) => (code.match(/`fav\.\$\{/g) || []).length;
  const siteRows = [...appSrc].map(([path, code]) => ({ path, n: favSites(code) })).filter((r) => r.n > 0);
  const siteTotal = siteRows.reduce((a, r) => a + r.n, 0);
  const callRows = [...appSrc].filter(([p, c]) => /favoriteLabel\s*\(/.test(c) && p !== "domain/rowText.ts").map(([p]) => p);

  ok(`the ${FA.length} favourite kinds are one runtime list: ${FA_FILE} holds ${faList || "NO LIST"} and the type is ${/typeof\s+FAVORITE_KINDS\s*\)\s*\[number\]/.test(faType) ? "derived from it" : "RESTATED BY HAND (" + (faType || "missing") + ")"}, while ${faExact.length} carriers in the ${appSrc.size} modules hold all ${FA.length} names (${faExact.map((r) => `${r.path}:${r.kind}`).join(" | ") || "none"}) of which ${faCopy.length} is a copy rather than the list (${faCopy.map((r) => r.path).join(" | ") || "none"}), and the same scan charges a planted union and a planted array (${faPlant.length} read, ${faPlant.filter((r) => faKey(r.xs) === faKey(FA)).length} charged) yet leaves a planted five-name list out of the population entirely and a planted two-name subset read-but-uncharged (${faGhost.length} read, ${faGhost.filter((r) => faKey(r.xs) === faKey(FA)).length} charged)`,
    faList.length > 0 && faType.includes("typeof FAVORITE_KINDS") && faExact.length === 1 && faCopy.length === 0 &&
    faPlant.length === 2 && faPlant.every((r) => faKey(r.xs) === faKey(FA)) &&
    faGhost.length === 1 && faKey(faGhost[0].xs) === "club|player");

  ok(`the slot table is exhaustive over the list: ${faSlots.length} rows (${faSlots.map((r) => `${r.code}->${r.read}`).join(" ")}) against ${FA.length} kinds, every row reads and writes the SAME field (${faSlots.filter((r) => r.read !== r.write).map((r) => r.code).join(" ") || "0 mismatched"}), every field it names is on UserProfile (${faSlots.filter((r) => !profileFields.includes(r.read)).map((r) => r.read).join(" ") || "0 invented"}), and every favorite field on the profile has a row (${profileFields.filter((f) => !faSlots.some((r) => r.read === f)).join(" ") || "0 orphan"}) — the two ternary chains this replaced each ended in a fallback arm, so a kind outside the space resolved to the competition slot on both sides of the app`,
    faSlots.length === FA.length && faKey(faSlots.map((r) => r.code)) === faKey(FA) &&
    faSlots.every((r) => r.read === r.write && profileFields.includes(r.read)) &&
    faSlots.every((r) => profileFields.includes(r.read)) && new Set(faSlots.map((r) => r.read)).size === profileFields.length);

  ok(`a favourite key is built in one module: ${siteTotal} interpolation sites across ${siteRows.length} files (${siteRows.map((r) => `${r.path}=${r.n}`).join(" | ") || "none"}), the composer is ${composer ? composer.replace(/\s+/g, " ").slice(0, 96) : "MISSING"}, and ${callRows.length} screen modules call it (${callRows.join(" ") || "none"})`,
    siteRows.length === 1 && siteRows[0].path === "domain/rowText.ts" && siteTotal === 2 &&
    composer.includes("kind: FavoriteKind") && composer.includes("active: boolean") && composer.includes("t: Translate") &&
    composer.includes("fav.${kind}.active") && composer.includes("fav.${kind}.idle") &&
    callRows.length === 1 && callRows[0] === "features/football/Details.tsx");

  // The behavioural leg: the shipped composer, every kind, both states, every locale, read
  // against the dictionary rows the app is supposed to be showing.
  const faAsk = (code, active) => {
    const seen = [];
    const out = rowTextModule.favoriteLabel(code, active, (k, v) => { seen.push(k); return translate("en", k, v); });
    return { seen, out };
  };
  const faTable2 = FA.map((code) => {
    const a = faAsk(code, true), i = faAsk(code, false);
    return { code, asked: [a.seen.join("+"), i.seen.join("+")], en: [a.out, i.out],
      w: L.map((loc) => rowTextModule.favoriteLabel(code, true, tReader(loc.id))),
      i: L.map((loc) => rowTextModule.favoriteLabel(code, false, tReader(loc.id))) };
  });
  const faWrongKey = faTable2.filter((r) => r.asked[0] !== `fav.${r.code}.active` || r.asked[1] !== `fav.${r.code}.idle`);
  const faDrift = faTable2.filter((r) => L.some((loc, k) => r.w[k] !== D[loc.id][`fav.${r.code}.active`] || r.i[k] !== D[loc.id][`fav.${r.code}.idle`]));
  const faRaw = faTable2.filter((r) => L.some((loc, k) => !r.w[k] || !r.i[k] || r.w[k] === `fav.${r.code}.active` || r.w[k] === r.code || r.i[k] === r.code));
  const faSame = L.map((_, k) => new Set(faTable2.map((r) => r.w[k])).size);
  const faEnDistinct = new Set(faTable2.map((r) => r.en[0])).size;
  const favKeys = L.map((loc) => Object.keys(D[loc.id]).filter((k) => k.startsWith("fav.")).length);
  ok(`all ${faTable2.length} kinds go through the shipped composer in ${L.length} locales (${faTable2.map((r) => `${r.code}: ${r.en[0]} / ${r.en[1]}`).join(" | ")}): each asks exactly its own two keys (${faWrongKey.map((r) => r.code).join(" ") || "0 wrong"}), the answer is the dictionary row every time (${faDrift.map((r) => r.code).join(" ") || "all agree"}), no locale shows the code or the key (${faRaw.map((r) => r.code).join(" ") || "none"}), the three kinds give three different words (${faEnDistinct} in en) so the answer moves with the code rather than being a constant, and ${favKeys.join("/")} fav keys are exactly the space times the two states (${FA.length * 2} expected)`,
    faTable2.length === 3 && faWrongKey.length === 0 && faDrift.length === 0 && faRaw.length === 0 &&
    faEnDistinct === 3 && favKeys.every((n) => n === FA.length * 2) && faSame.every((n) => n === 3));
}

// 37b. M268. The manager's xG fact pair printed one side from the dictionary and the other
// from a literal the raw-UI scan cannot see: "xG (us)" is two Latin letters on each side of
// the bar, and hasProse wants three consecutive ones, so a reader in either Chinese locale
// saw one Chinese label over an English one in the same row. The pair now asks the
// dictionary on both sides; the clause pins the file at zero label-attribute literals — the
// scan that would hold this class is the letter bar itself, the device M224 deferred to its
// own milestone — and a planted literal under the bar is charged by the same read. The new
// call site moves section 37's literal-shape pin 1281 → 1282.
const MGR_FILE = "features/manager/ManagerOS.tsx";
const mgrLabelLits = [...appSrc.get(MGR_FILE).matchAll(/label="[^"]*[A-Za-z][^"]*"/g)].length;
const plantedLabelLit = [...'<Fact label="xG (us)" />'.matchAll(/label="[^"]*[A-Za-z][^"]*"/g)].length;
const xgRows = L.map((loc) => [D[loc.id]["mgr.xgUs"], D[loc.id]["mgr.xgThem"]]);
ok(`the manager's xG fact pair reads the dictionary on both sides (${xgRows.map(([u, th]) => `${u} / ${th}`).join(" | ")}) and the file carries no label-attribute literal the letter bar hides (0; a planted one reads ${plantedLabelLit})`,
  mgrLabelLits === 0 && plantedLabelLit === 1 &&
  xgRows.every(([u, th]) => u && th && u !== "mgr.xgUs" && th !== "mgr.xgThem"));

// 37c. M269. The match page's AI panel was the last answer surface with no gate at all, and it
// composed its facts as English sentences handed to the panel as {fact} values — the exact
// shape M224 banned everywhere else (a {value} row holding prose outside the domain). The path
// is rows end to end now: askFootballAI takes { label, facts } rows, seeds its draw on the
// label's ENGLISH reading so the seeded pick stays reader-independent, and returns text,
// evidence and sources as rows. The clause pins the signature in the provider's source, the
// question keys on the page, and the dictionary rows in all three locales; the keys the old
// string path leaned on must be gone, not orphaned beside their replacements. The planted
// signatures charge the type regex the way 37b's planted label charges the attribute one:
// a planted RowText signature must read, and a planted string[] one must not — a regex that
// matched any bracket type would pass both pins into one.
const AI_FILE = "data/ai.ts";
const DET_FILE = "features/football/Details.tsx";
const aiPlantedRow = [..."{ label: RowText; facts: RowText[] }".matchAll(/facts: RowText\[\]/g)].length;
const aiPlantedStr = [..."{ label: RowText; facts: string[] }".matchAll(/facts: RowText\[\]/g)].length;
const detQfKeys = [...appSrc.get(DET_FILE).matchAll(/key: "ai\.qf\.[A-Za-z]+"/g)].length;
const QF_KEYS = ["ai.answer.confidence", "ai.matchLabel", "ai.qf.matchup", "ai.qf.projection", "ai.qf.noSim", "ai.qf.kickoff", "ai.qf.scoreline", "ai.qf.possession", "ai.fact.none", "ai.src.matchEngine"];
const qfMissing = QF_KEYS.filter((k) => L.some((loc) => !D[loc.id][k]));
const aiGone = ["ai.answer.text", "ai.evidence.fact", "ai.src.matchLabel"].filter((k) => L.some((loc) => k in D[loc.id]));
ok(`the match page's AI path is rows end to end: the provider takes { label, facts } rows (a planted RowText signature reads ${aiPlantedRow}, a planted string[] one reads ${aiPlantedStr}) and seeds on the label's English reading, Details asks ${detQfKeys} ai.qf.* question keys with no string-array facts anywhere in the file, all ${QF_KEYS.length} dictionary rows exist in ${L.length} locales (${qfMissing.join(", ") || "none"} missing), and the three keys the old string path leaned on are gone (planted absence reads ${aiGone.length})`,
  aiPlantedRow === 1 && aiPlantedStr === 0 &&
  /facts: RowText\[\]/.test(appSrc.get(AI_FILE)) && /englishRow\(context\.label\)/.test(appSrc.get(AI_FILE)) &&
  !/facts: string\[\]/.test(appSrc.get(AI_FILE)) &&
  detQfKeys >= 6 && !/facts: string\[\]/.test(appSrc.get(DET_FILE)) &&
  qfMissing.length === 0 && aiGone.length === 0);

// 37d. M270. "vs" is two letters and the raw-UI scan wants three consecutive ones, so the
// connector between the two sides of a score reached both Chinese locales as bare English
// text in two shapes: a text node between a closed element and an expression (`</span> vs
// {…}`) in the manager's season panel, and a whole text child (`>vs<`) in the scout compare
// header. The dictionary already carried the word for one of the two screens — `mgr.vs`,
// asked one section title away — so the manager's fix is asking for it, and the scout gets
// its own row (`scout.vs`, the same 对阵/對陣 pair). The census pins both shapes at zero
// across every shipped module; the dictionary is outside the scan (appSrc excludes i18n/),
// because an English row may legitimately say vs — the Chinese reader never reads it. A
// planted instance of each shape is charged by the same read, so a scanner that stopped
// seeing either shape would say so rather than print a green zero.
const VS_NODE = />[^\S\n]*vs[^\S\n]*\{/g;
const VS_CHILD = />[^\S\n]*vs[^\S\n]*</g;
const vsNodeHits = [...appSrc.values()].reduce((n, c) => n + [...c.matchAll(VS_NODE)].length, 0);
const vsChildHits = [...appSrc.values()].reduce((n, c) => n + [...c.matchAll(VS_CHILD)].length, 0);
const vsPlantedNode = [..."<span>{s.score}</span> vs {s.opp}".matchAll(VS_NODE)].length;
const vsPlantedChild = [..."<div>vs</div>".matchAll(VS_CHILD)].length;
const VS_KEYS = ["mgr.vs", "scout.vs"];
const vsMissing = VS_KEYS.filter((k) => L.some((loc) => !D[loc.id][k]));
ok(`the two-letter connector between two sides is keyed, not typed: the shipped modules carry 0 bare-vs text nodes and 0 bare-vs text children (planted node reads ${vsPlantedNode}, planted child reads ${vsPlantedChild}), and both connector rows exist in ${L.length} locales (${vsMissing.join(", ") || "none"} missing)`,
  vsNodeHits === 0 && vsChildHits === 0 && vsPlantedNode === 1 && vsPlantedChild === 1 && vsMissing.length === 0);

// 37e. M271. The letter-bar scan change M224 deferred. hasProse wants three consecutive Latin
// letters, so a text node whose every Latin run is two letters or fewer is invisible to it —
// the class that hid "xG (us)" (M268) and "vs" (M270) in plain sight, one word at a time. The
// walk generalizes check 12's node read to every shipped module: both node shapes, the same
// code-fragment filter, and every node whose Latin runs all sit at two letters or below must
// be on the decision list — the brand's own initial F (the logo glyph beside t("brand.name")
// on three screens) and the ⌘K shortcut badge, both symbols rather than copy. Everything else
// the walk found under the bar is a dictionary row now: the fixture connector (common.vs, the
// word DataRoom's match link and the manager's stat duel ask), the level badge (the existing
// common.level word, asked beside the number it labels — Dashboard, AppShell and the Review
// tile's prop, which the node walk cannot see, so its shape is pinned directly, with plants),
// the model's goal figure (common.xg — FootballWorld, DataRoom, and SimulationLab's stats
// table, whose bare JS label sat beside keyed siblings), and the league table's five headers
// (mgr.thP/thW/thD/thL/thGD), one cell away from keyed thClub and thPts. The walk's own read
// is charged by a planted markup fixture: an F survives the decision list and a planted qq is
// charged by the same pass.
const UNDER_DECISIONS = ["F", "⌘K"];
const underBar = [];
for (const [path, src] of appSrc) {
  const nodes = [
    ...[...src.matchAll(/(?<!=)>[^<>{}\n]+(?=<)/g)].map((m) => m[0].slice(1)),
    ...[...src.matchAll(/(?<!=)>[^<>{}\n]+(?=\{)/g)].map((m) => m[0].slice(1)),
  ].map((x) => x.trim());
  for (const node of nodes) {
    if (!node || /[):;=}&|]/.test(node)) continue;
    const runs = node.match(/[A-Za-z]+/g) ?? [];
    if (!runs.length || runs.some((w) => w.length >= 3)) continue;
    underBar.push({ path, node });
  }
}
const underStray = underBar.filter((x) => !UNDER_DECISIONS.includes(x.node));
const underPlantSrc = "<span>F</span><span>qq</span>";
const underPlantNodes = [...underPlantSrc.matchAll(/(?<!=)>[^<>{}\n]+(?=<)/g)].map((m) => m[0].slice(1).trim())
  .filter((node) => node && !/[):;=}&|]/.test(node))
  .filter((node) => { const runs = node.match(/[A-Za-z]+/g) ?? []; return runs.length && !runs.some((w) => w.length >= 3); });
const underPlantCharged = underPlantNodes.filter((n) => !UNDER_DECISIONS.includes(n)).length;
const RV_FILE = "features/review/ReviewPage.tsx";
const MS_FILE = "features/sim/SimulationLab.tsx";
const lvPropLeft = [...appSrc.get(RV_FILE).matchAll(/`Lv \$\{/g)].length;
const lvPlanted = [..."`Lv ${n}`".matchAll(/`Lv \$\{/g)].length;
const xgLabelLeft = [...appSrc.get(MS_FILE).matchAll(/label: "xG"/g)].length;
const xgPlanted = [...'label: "xG"'.matchAll(/label: "xG"/g)].length;
const UNDER_KEYS = ["common.vs", "common.xg", "mgr.thP", "mgr.thW", "mgr.thD", "mgr.thL", "mgr.thGD"];
const underMissing = UNDER_KEYS.filter((k) => L.some((loc) => !D[loc.id][k]));
ok(`every text node the letter bar cannot see is a decision or a row: the app-wide walk reads ${underBar.length} under-bar nodes (${underBar.map((x) => x.node).join(" ")}) and ${underStray.length} of them stray off the decision list, a planted fixture charges ${underPlantCharged} under-bar word, the two prop-string shapes the walk cannot see are gone (a planted Lv template reads ${lvPlanted}, a planted xG label reads ${xgPlanted}), and all ${UNDER_KEYS.length} rows exist in ${L.length} locales (${underMissing.join(", ") || "none"} missing)`,
  underBar.length === 4 && underStray.length === 0 && underPlantCharged === 1 &&
  lvPropLeft === 0 && lvPlanted === 1 && xgLabelLeft === 0 && xgPlanted === 1 &&
  underMissing.length === 0);

// 37f. M272. The prop-string class the text-node walks cannot see, generalized from M271's two
// pinned shapes: a display-named prop (label, title, sub, hint, text, description, subtitle,
// alt, placeholder) assigned a bare quoted string carrying three consecutive Latin letters is
// interface copy parked where no translator runs. CommandDialog's defaults were exactly that —
// "Command Palette" and "Search for a command to run..." living behind a caller that always
// keyed both props, an English reflow point waiting for the next caller to skip them — so the
// types now require the two props and this census walks every shipped module with the reading
// its plants are charged by: a destructured default and an object-literal label each read one,
// while labelKey, type annotations, keyed calls and strings under the letter bar stay outside.
const PROP_PROSE = /(?<![A-Za-z])(subtitle|placeholder|description|label|title|sub|hint|text|alt)(?![A-Za-z])\s*[:=]\s*"([^"]*)"/g;
const propProseHits = [];
for (const [path, src] of appSrc) {
  for (const m of src.matchAll(PROP_PROSE)) {
    if (/[A-Za-z]{3,}/.test(m[2])) propProseHits.push(`${path} ${m[1]}="${m[2]}"`);
  }
}
const propPlantA = [...`{ title = "Command Palette" }`.matchAll(PROP_PROSE)].filter((m) => /[A-Za-z]{3,}/.test(m[2])).length;
const propPlantB = [...`{ label: "Model projection" }`.matchAll(PROP_PROSE)].filter((m) => /[A-Za-z]{3,}/.test(m[2])).length;
ok(`display-named props carry no bare prose: the app-wide walk reads ${propProseHits.length} bare strings on a display prop (${propProseHits.join(", ") || "none"}), and planted default-param and object-literal shapes read ${propPlantA} and ${propPlantB}`,
  propProseHits.length === 0 && propPlantA === 1 && propPlantB === 1);

// 37g. M273. The forms the 37f reading leaves outside. The display-attr class is the screen
// reader's copy: aria-label and its announcing cousins (aria-placeholder, aria-valuetext,
// aria-roledescription) are interface text spoken to a user the dictionary never reaches, and
// a bare quoted string on one is English no keyed sibling exposes. The quote-form gap is the
// same display-name regex against single quotes and backticks without interpolation, which a
// quoted-strings-only read never sees. The walk reads both classes across every shipped
// module: eleven aria display attributes, ten resolved through t() at the site and the
// eleventh forwarded as a required prop whose only call site passes t("ai.graphAria") — that
// forward is pinned, because a forwarded label is exactly where a default would hide. Both
// censuses read 0, and three planted fixtures charge the same pass.
const ARIA_ATTR = /(?<![A-Za-z-])(aria-(?:label|placeholder|valuetext|roledescription))\s*=\s*("(?:[^"]*)"|\{(?:[^}]*)\})/g;
const ariaBare = [];
let ariaKeyed = 0;
for (const [path, src] of appSrc) {
  for (const m of src.matchAll(ARIA_ATTR)) {
    const v = m[2];
    // The bare read is of string literals — quoted outright, or quoted inside the braces. An
    // expression holding an identifier is the forwarded shape, pinned below, not prose.
    if (v.startsWith("{")) {
      if (/t\(/.test(v)) ariaKeyed++;
      else if (/"[^"]*[A-Za-z]{3,}[^"]*"/.test(v)) ariaBare.push(`${path} ${m[1]}=${v}`);
    } else if (/[A-Za-z]{3,}/.test(v)) ariaBare.push(`${path} ${m[1]}=${v}`);
  }
}
const ariaFwd = [...aiStudioSrc.matchAll(/aria-label=\{ariaLabel\}/g)].length;
const ariaSource = [...aiStudioSrc.matchAll(/ariaLabel=\{t\("ai\.graphAria"\)\}/g)].length;
const ariaPlant = [...`<svg aria-label="Knowledge graph" />`.matchAll(ARIA_ATTR)].filter((m) => /[A-Za-z]{3,}/.test(m[2])).length;
const SQ_FORM = /(?<![A-Za-z])(subtitle|placeholder|description|label|title|sub|hint|text|alt)(?![A-Za-z])\s*[:=]\s*'([^']*)'/g;
const TL_FORM = /(?<![A-Za-z])(subtitle|placeholder|description|label|title|sub|hint|text|alt)(?![A-Za-z])\s*[:=]\s*`([^`$]*)`/g;
const sqHits = [];
const tlHits = [];
for (const [path, src] of appSrc) {
  for (const m of src.matchAll(SQ_FORM)) if (/[A-Za-z]{3,}/.test(m[2])) sqHits.push(`${path} ${m[0]}`);
  for (const m of src.matchAll(TL_FORM)) if (/[A-Za-z]{3,}/.test(m[2])) tlHits.push(`${path} ${m[0]}`);
}
const sqPlant = [...`{ label: 'Model projection' }`.matchAll(SQ_FORM)].filter((m) => /[A-Za-z]{3,}/.test(m[2])).length;
const tlPlant = [..."{ label: `Model projection` }".matchAll(TL_FORM)].filter((m) => /[A-Za-z]{3,}/.test(m[2])).length;
ok(`the forms 37f's quoted-only read leaves outside are held too: ${ariaKeyed} aria display attributes resolve through t() and the one forwarded label is pinned at its source (a planted aria bare string reads ${ariaPlant}), and the single-quote and no-interpolation forms of the display-prop class read ${sqHits.length} and ${tlHits.length} bare strings (planted shapes read ${sqPlant} and ${tlPlant})`,
  ariaBare.length === 0 && ariaKeyed === 10 && ariaFwd === 1 && ariaSource === 1 && ariaPlant === 1 &&
  sqHits.length === 0 && tlHits.length === 0 && sqPlant === 1 && tlPlant === 1);

// 37h. M274. The seed news sentence class. The seed composes every headline from five English
// templates, so the record's `title` was an English sentence, and every screen that printed it
// raw — the news list, the article page, the dashboard's breaking panel, the transfer board —
// put English prose on the glass whatever the locale: the same defect M249 charged for the kind
// badge, one sentence-shaped family larger. The record now carries `titleKey` + `titleVars`
// beside the raw `title` it keeps for matching (search scoring, AI fact layer), and the glass
// reads go through the `newsTitle` / `newsSummary` composers. This census walks every shipped
// module: a bare JSX render of a `.summary` field reads 0 (the field belongs to the news
// record alone; the sim lab's summary rows already went through rowLine), and since M275
// carried the search results' news title on `titleRow` too, NO bare `.title` JSX render
// remains anywhere — the four proper-noun families show their record word through the
// conditional the pin names, and the composed news family resolves its row. The composer,
// titleRow and rowLine reads are pinned at their call sites so a new screen cannot quietly
// regress to printing the field (newsTitle()'s fourth match is the summary composer wording
// the headline inside its own frame — the other three are the glass readers). Two planted
// shapes charge the same pass.
const NEWS_SUMMARY_RAW = /\{\s*[A-Za-z_$][\w$]*\.summary\s*\}/g;
const NEWS_TITLE_RAW = /\{\s*[A-Za-z_$][\w$]*\.title\s*\}/g;
const summaryBare = [];
const titleBare = [];
for (const [path, src] of appSrc) {
  for (const m of src.matchAll(NEWS_SUMMARY_RAW)) summaryBare.push(`${path} ${m[0].trim()}`);
  for (const m of src.matchAll(NEWS_TITLE_RAW)) titleBare.push(`${path} ${m[0].trim()}`);
}
const allShipped = [...appSrc.values()].join("\n");
const newsTitleSites = [...allShipped.matchAll(/\bnewsTitle\(/g)].length;
const newsSummarySites = [...allShipped.matchAll(/\bnewsSummary\(/g)].length;
const rumourRowSites = [...allShipped.matchAll(/rowLine\(r\.title,\s*t\)/g)].length;
const titleRowProducers = [...allShipped.matchAll(/titleRow:\s*\{\s*key:\s*n\.titleKey/g)].length;
const titleRowPalettes = [...allShipped.matchAll(/r\.titleRow \? rowLine\(r\.titleRow,\s*t\) : r\.title/g)].length;
const titleRowAIVars = [...allShipped.matchAll(/(?:h|top)\.titleRow \?\? /g)].length;
const summaryPlant = [...`<p>{article.summary}</p>`.matchAll(NEWS_SUMMARY_RAW)].length;
const titlePlant = [...`<div>{n.title}</div>`.matchAll(NEWS_TITLE_RAW)].length;
ok(`the seeded news sentences are read through the composers: ${summaryBare.length} bare .summary and ${titleBare.length} bare .title renders, both 0 (planted shapes read ${summaryPlant} and ${titlePlant}), the news title row is produced once and read at ${titleRowPalettes} palette/search sites and ${titleRowAIVars} AI var sites, and the glass reads sit at ${newsTitleSites} newsTitle() + ${newsSummarySites} newsSummary() + ${rumourRowSites} rowLine(r.title) call sites`,
  summaryBare.length === 0 && titleBare.length === 0 && summaryPlant === 1 && titlePlant === 1 &&
  titleRowProducers === 1 && titleRowPalettes === 2 && titleRowAIVars === 3 &&
  newsTitleSites === 4 && newsSummarySites === 2 && rumourRowSites === 1);

// 37i. M281. The seed's sixth English sentence is gone. M274 keyed the headline and the glass
// rebuilt the summary from `ni.summaryLine`, but the record kept a raw `summary` string
// composed from a sixth English template at boot, "kept for matching" - and the measurement
// that would justify keeping it never existed: search scores the raw title, retrieval ranks
// by it, and every summary the AI evidence card or a community thread quotes is rebuilt from
// the key. M281 deletes the field and the boot-time composition. The pins below refuse any
// resurrection - a `summary` field back on the news record, a `summary:` line back in the
// seed's builder, or a raw `.summary` read inside the composer file. One planted shape
// charges the pass.
const NEWS_IFACE = (appSrc.get("domain/types.ts") ?? "").match(/export interface NewsArticle \{[\s\S]*?\n\}/)?.[0] ?? "";
const seedSummaryLines = ((appSrc.get("data/footballSeed.ts") ?? "").match(/^\s*summary: .*/gm) ?? []).length;
const composerRawSummary = [...(appSrc.get("domain/rowText.ts") ?? "").matchAll(/\b\w+\.summary\b/g)].length;
const newsFieldPlant = /summary: string;/.test(`export interface NewsArticle {\n  summary: string;\n}`) ? 1 : 0;
ok(`the news record carries no seed-composed summary sentence: the NewsArticle interface holds ${/^\s*summary:/m.test(NEWS_IFACE) ? 1 : 0} summary field, the seed builder composes ${seedSummaryLines} summary line, and the composer file holds ${composerRawSummary} raw .summary reads - all 0 (planted shape reads ${newsFieldPlant})`,
  !/^\s*summary:/m.test(NEWS_IFACE) && seedSummaryLines === 0 && composerRawSummary === 0 && newsFieldPlant === 1);

// 38. The suite's own blind spots.
//
// A clause that asserts `=== 0` and carries neither a plant beside it nor a guard inside it
// would also pass if the scan behind it simply stopped reading anything — the shape M247 banned
// for the population pins (`X === X` cannot go red) and M254 replaced with a plant when its own
// cap reached zero. This runs the census over every proof script, this file included, and pins
// the count of clauses still asserting a zero with none of the three devices the suite already
// uses: a plant in the clause itself, a floor or pin in the clause itself, or a planted
// companion written immediately after it. A companion is only credited within eight lines,
// because that is how the suite writes them.
//
// The number may only fall. Adding a zero-asserting clause without one of the three has to be
// paid for here, in the same commit — which is the same bargain every other ceiling in this
// file asks for.
// M326: 77 → 31, and the number is read on a PLANE, not off this checkout. The census scans the
// working tree, and this tree is shared: thirteen proof scripts are dirty in another session,
// mid-paydown, so the tree right now reads 3 owing. Pinning 3 would record a measurement no
// checkout of this commit reproduces. The plane this commit ships — my nine files, every other
// script at HEAD — reads 31, and `node dev/m326-ceiling-plane.mjs proof-ai-grounding
// proof-analytics proof-feedranking proof-m99 proof-offline proof-screens proof-world proof-xp
// proof-i18n` re-derives that list from the census block itself. The 31 sit in
// proof-careerarc(2) proof-community(2) proof-compare(3) proof-coverage(1) proof-filmlibrary(5)
// proof-impact(2) proof-m67(4) proof-m74(3) proof-matchengine(1) proof-projection(2)
// proof-review(2) proof-router(3) proof-transfers(1) — all thirteen files are in the other
// session's diff, so that residue is theirs to pay and this ceiling is mine to leave honest.
//
// The ceiling is load-bearing on this commit's own work: the same tool keeping only proof-i18n
// (the eight paydowns reverted to HEAD) reads 40 and prints OVER, and every site the revert adds
// sits inside the eight files edited here — proof-world carries two of them, the rest one each.
const VACUITY_CEILING = 0;
const clauseDepth = (text) => {
  let d = 0, str = null, tmpl = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (str) { if (c === "\\") { i++; continue; } if (c === str) str = null; continue; }
    if (c === '"' || c === "'") { str = c; continue; }
    if (c === "`") { if (tmpl) tmpl--; else tmpl++; continue; }
    if (tmpl) continue;
    if (c === "(") d++;
    else if (c === ")") d--;
  }
  return d;
};
const clausesIn = (src) => {
  const lines = src.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^ok\(/.test(lines[i])) continue;
    let body = "";
    for (let j = i; j < lines.length; j++) {
      body += (j === i ? "" : "\n") + lines[j];
      if (clauseDepth(body) <= 0) break;
    }
    out.push({ line: i + 1, body });
  }
  return out;
};
// M338. Splitting a clause's arguments is needed by two readers now — the census's OR test and
// section 39's failable-predicate test — so it is one pair of functions rather than two copies
// (two scanners are two chances to disagree). Slice-based rather than `cur += ch`: 1,700 clauses
// is enough for string building to show up as minutes on this suite's runtime.
const topLevelArgs = (body) => {
  const inner = body.replace(/^ok\(/, "").replace(/\)\s*;?\s*$/, "");
  const cuts = [];
  let depth = 0;
  let inStr = null;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (inStr) {
      if (ch === "\\") { i++; continue; }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; continue; }
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") depth--;
    else if (ch === "," && depth === 0) cuts.push(i);
  }
  const parts = [];
  let start = 0;
  for (const c of cuts) { parts.push(inner.slice(start, c).trim()); start = c + 1; }
  parts.push(inner.slice(start).trim());
  return parts;
};
// The predicate: the first argument that is not the label string. `ok(label, cond, detail)`.
const predicateOf = (body) => topLevelArgs(body).find((a) => a && !/^[`"']/.test(a)) ?? "";
// M311/M312. The suite writes a planted witness two ways — `plant…` and `…so the zero above is
// measured and not a blind spot` — and this recogniser only knew the first, so every clause
// written in the second phrasing was reported as owing while it stood there with its witness
// beside it. The two phrasings are both in the device witness below, so a third one cannot arrive
// without being named there.
const isPlant = (s) => /plant|blind spot|is measured and not/i.test(s);
// M315: `\b0\b` charged any standalone zero token, so a pin against a decimal constant
// (0.77, 0.15, 0.002), a score (4-2-0-2) and a range bound were read as zero-assertions.
// They never were: a zero that is part of a larger number is not the asserted value, and
// undefined data makes such a clause fail or throw, never pass vacuously. The zero that
// matters is one the clause holds a measurement TO — an equality against it, a value
// phrase naming it, a bound zero this reader still keeps charged on purpose. Measured
// across the tree with the census's own classifier: this reading de-charges exactly the
// 27 clauses whose only zero token was a decimal fragment (293 → 268), each hand-judged;
// the token reading itself is witnessed below, next to the device reading.
// M325: an array subscript is not an asserted zero either. `mixed[1].split(" (")[0]` reads the
// first segment of a label and `GRAPHS[0][1].nodes` reads the first case; neither clause holds
// anything TO zero, and a clause pinned to a subscript throws on an empty array rather than
// passing quietly — the opposite of the vacuity this census charges. A `[0]` that is a literal
// element rather than a subscript (nothing indexes into it) stays charged on purpose, and so
// does a real `edges[0] === 0`, because the asserted zero survives the strip. Measured with the
// census's own classifier: the subscript reading alone de-charges 2 of the 14 owing clauses
// (proof-community.mjs:278, proof-graph.mjs:111), each hand-judged; together with the widened
// guard below the census reads 14 → 12.
const IDX_SUBSCRIPT = /([\w)\]])\[0\](?![\d.])/g;
const isZeroish = (s) => /\bnone\b|(?<![\w.])0(?![\d.])|\bnothing\b|\bno [a-z]+\b/i.test(s.replace(IDX_SUBSCRIPT, "$1"));
// M316: a pin against any positive integer constant (`=== 1`, `>= 3`) is the same floor
// device as a pin against zero: on an empty/undefined measurement the pin fails, so the
// whole clause fails rather than passing vacuously. This widens the guard to credit those
// companions too. Measured across the tree: this reading de-charges exactly 113 clauses
// (268 → 155), all AND-compositions where a positive pin makes the clause fail on empty
// measurement; no OR-composition lets a zero arm pass vacuously. The guard explicitly
// excludes `=== 0` by matching `[1-9]\d*` only.
// M325 companion: the guard read `>= N` and `=== N` but not a strict `> N`, so a clause belted
// with `mixed.length > 4` — which fails, not passes, on an empty measurement — was invisible to
// it and its neighbour was still charged as debt. Both `>` forms now require a non-`=` character
// before the operator: `items.map((v) => 0)` is an arrow returning zero, not a floor pin, and
// crediting it would have let any clause with an arrow-valued companion off the hook. Measured
// across the tree: the strict floor newly credits 20 clause bodies, each hand-judged as a real
// population pin (`> 50`, `> 12`, `> 1`, …), and the arrow exclusion moves no credit at all
// today (0 clauses were credited solely by an arrow) — it closes the hole before it is used.
const GUARD_RE = /rather than nothing|not an empty set|against pin|pin \d+|(?<!=)> 0|>= 1|\.length >= \d+|=== [1-9]\d*|>= [1-9]\d*|(?<!=)> [1-9]\d*/;
const unguardedZeroes = [];
const proofFiles = readdirSync(join(root, "scripts")).filter((f) => /^proof-.*\.mjs$/.test(f)).sort();
for (const f of proofFiles) {
  const cls = clausesIn(readFileSync(join(root, "scripts", f), "utf8"));
  for (const c of cls) {
    if (isPlant(c.body) || !isZeroish(c.body.split("\n")[0])) continue;
    const next = cls.filter((x) => x.line > c.line).slice(0, 2);
    // M311: a companion that carries a FLOOR is as much a device as one that carries a plant,
    // the companion is a CLAUSE rather than a run of lines, and the window is the next two of
    // them. All three readings were wrong before and each made this census report clauses that
    // already had their evidence:
    //   · `every dictionary key is reachable` has `the reachability scan claims the dictionary
    //     rather than nothing (… > 500 …)` below it — the exact non-vacuity device this census
    //     asks for, counted as owing because the word it looked for was "plant".
    //   · `no English sentence is carried by two keys` has a planted companion that a multi-line
    //     IIFE pushed 15 lines down, so an eight-line window never saw it.
    //   · `every row text a domain module hands the screen is a real key` has its evidence two
    //     clauses down (`the row-text scan is reading modules that actually carry the union`),
    //     with an unrelated clause in between.
    // The devices are unchanged; only the reading of the third one is. A clause is the unit the
    // suite writes in, so a clause is the unit the census reads — two of them, because a clause
    // that states a rule and a clause that states its population is the shape the suite uses.
    // M316: an OR-composition (`zero || pin`) must NOT be credited even when a positive pin exists,
    // because the zero arm can still pass vacuously on empty measurement. Only AND-compositions
    // (`zero && pin`) are safe to de-charge.
    // M338: the OR has to be in the ASSERTION. This test read the whole clause body, and the
    // suite's own diagnostic idiom ends every message with `|| "none"` — so a clause whose
    // predicate is a pure AND lost its companion the moment someone wrote a helpful message on
    // it. `proof-storage`'s four-family clause is the case that found it: three `=== 0` arms and
    // `familySites.length === APP_FILES.length`, ANDed, with `|| "none anywhere"` in the detail
    // string, charged as an OR-composition. A message is not an assertion.
    const hasOrComposition = /\|\|/.test(predicateOf(c.body));
    const companion = !hasOrComposition && next.some((x) => isPlant(x.body) || GUARD_RE.test(x.body));
    if (GUARD_RE.test(c.body) || companion) continue;
    unguardedZeroes.push(`${f}:${c.line}`);
  }
}
ok(`the suite's own zero-asserting clauses carry a plant, a pin or a planted companion (${unguardedZeroes.length} owing across ${proofFiles.length} proof scripts, ceiling ${VACUITY_CEILING})`,
  unguardedZeroes.length <= VACUITY_CEILING);
// M311 corrected what this census READS — a guarded companion counts, and the companion is the
// next two clauses rather than the next few lines — and a correction to the reader is exactly the
// kind of change that can turn a census into a rubber stamp. So the reader gets a witness: one
// fixture clause per device, each of which must be credited, and one with none, which must be
// flagged. A reader that credited everything would report 0 owing and look perfect.
const DEVICE_FIXTURES = [
  ["a plant in the clause itself", 'ok("a planted witness in the clause itself", a.length === 0);\n', true],
  ["a blind-spot witness in the clause itself", 'ok("the rule still reports it, so the zero above is measured and not a blind spot", a.length === 0);\n', true],
  ["a floor in the clause itself", 'ok("x", a.length === 0 && a.length >= 3);\n', true],
  ["a guarded companion one clause down", 'ok("x", a.length === 0);\nok("the scan read something rather than nothing", a.length > 5);\n', true],
  ["a guarded companion two clauses down", 'ok("x", a.length === 0);\nok("an unrelated clause", b.length === 0);\nok("the scan read something rather than nothing", a.length > 5);\n', true],
  ["nothing at all", 'ok("x", a.length === 0);\nconst y = 1;\n', false],
];
const deviceVerdicts = DEVICE_FIXTURES.map(([name, src, want]) => {
  const cls = clausesIn(src);
  const c = cls[0];
  const next = cls.filter((x) => x.line > c.line).slice(0, 2);
  const credited = isPlant(c.body) || GUARD_RE.test(c.body) || next.some((x) => isPlant(x.body) || GUARD_RE.test(x.body));
  return [name, credited === want];
});
ok(`the device reader credits each of the three devices at each distance the suite writes them and refuses a clause with none (${deviceVerdicts.map(([n, v]) => `${n}: ${v}`).join("; ")})`,
  deviceVerdicts.length > 0 && deviceVerdicts.every(([, v]) => v));
// M315 witnessed the token reading the same way, because correcting isZeroish is exactly the
// kind of change that could turn the census quiet: one fixture per reading, each of which must
// classify as the census now classifies it. A reader that stopped charging zero-assertions
// altogether would report no debts and look perfect.
const TOKEN_FIXTURES = [
  ["a pin against a decimal constant is not a zero-assertion", 'ok("defence is gaAvg / leagueAvg (1.00/1.3 = 0.77)", near(x.defence, 0.77));\n', false],
  ["an equality against zero is", 'ok("no fabricated facts", a.facts.length === 0);\n', true],
  ["a label that states a zero value is, even with the comparison below the first line", 'ok("ppg is round2(points/played) and exactly 0 before the first fixture",\n  st().ppg === 0);\n', true],
  ["a bound zero is kept charged on purpose", 'ok("skill is a 0..1 tier", a.skill >= 0 && a.skill <= 1);\n', true],
  ["a zero inside a score is kept charged (the conservative side)", 'ok("A: hand-computed record 4-2-0-2", a.won === 2);\n', true],
  ["an array subscript reads a position, not an asserted zero", 'ok("each edge key resolves", r.attributeEdges[0] !== undefined);\n', false],
  ["a zero asserted against an indexed read is still charged (the strip leaves the asserted one)", 'ok("the first measured zero is real", r.edges[0] === 0);\n', true],
  ["a literal zero element is kept charged — nothing indexes into it", 'ok("the fixture really holds a zero", [0].includes(q));\n', true],
];
const tokenVerdicts = TOKEN_FIXTURES.map(([name, src, want]) => {
  const c = clausesIn(src)[0];
  return [name, isZeroish(c.body.split("\n")[0]) === want];
});
ok(`the zeroish reader refuses a zero that is part of a larger number and keeps every zero a clause is held to (${tokenVerdicts.map(([n, v]) => `${n}: ${v}`).join("; ")})`,
  tokenVerdicts.every(([, v]) => v));
// M316: the guard reader credits a positive-constant pin as the same floor device, so a
// clause asserting `=== 0` ANDed with a positive pin (`&& x.length >= 1`) is safe to de-charge;
// an OR-composition (`|| x.length >= 1`) would be dangerous and must stay charged. The guard
// explicitly excludes `=== 0` by matching `[1-9]\d*` only — tested both ways here.
const GUARD_FIXTURES = [
  ["a positive pin is credited", 'ok("x", a.length === 0);\nok("the scan read something rather than nothing", a.length > 5);\n', true],
  ["a positive pin in the clause itself is credited", 'ok("x", a.length === 0 && b.length >= 1);\n', true],
  ["=== 0 is never credited by the guard", 'ok("no fabricated facts", a.facts.length === 0);\n', false],
  ["an OR-mixed zero arm stays charged", 'ok("x", a.length === 0 || b.length >= 1);\n', false],
  ["a strict positive floor (`> 4`) is credited the way `>= 1` is", 'ok("x", a.length === 0);\nok("the scan read a real population", mixed.length > 4);\n', true],
  ["an arrow that returns zero is not a floor pin", 'ok("no fabricated facts", a.facts.length === 0);\nok("the mapper answers zero", items.map((v) => 0));\n', false],
  // M338: the pair that separates an OR in the assertion from an OR in the message. The suite's
  // diagnostic idiom ends messages with `|| "none"`, and reading the whole body made that a
  // disqualifier. These two fixtures are the same clause with the `||` moved from one argument
  // to the other, so a reader that cannot tell them apart reddens here.
  ["an OR in the message is not an OR in the assertion", 'ok("x", a.length === 0, raw.length === 0 || "none");\nok("the scan read something rather than nothing", a.length > 5);\n', true],
  ["an OR in the assertion is still an OR, message or no message", 'ok("x", a.length === 0 || b.length >= 1, raw.length === 0 || "none");\nok("the scan read something rather than nothing", a.length > 5);\n', false],
];
const guardVerdicts = GUARD_FIXTURES.map(([name, src, want]) => {
  const cls = clausesIn(src);
  const c = cls[0];
  const hasOrComposition = /\|\|/.test(predicateOf(c.body));
  const next = cls.filter((x) => x.line > c.line).slice(0, 2);
  const credited = !hasOrComposition && (isPlant(c.body) || !isZeroish(c.body.split("\n")[0]) || GUARD_RE.test(c.body) || next.some((x) => isPlant(x.body) || GUARD_RE.test(x.body)));
  return [name, credited === want];
});
ok(`the guard reader credits a positive pin and refuses === 0 and OR-mixes (${guardVerdicts.map(([n, v]) => `${n}: ${v}`).join("; ")})`,
  guardVerdicts.every(([, v]) => v));
if (unguardedZeroes.length > VACUITY_CEILING) console.log("       owing: " + unguardedZeroes.slice(0, 20).join(", "));
// The census itself is the last thing that could go blind: a source it cannot split into
// clauses counts zero clauses and therefore zero debts. The plant is a fixture with one
// unguarded zero-asserting clause, which the census must report.
const plantedClauses = clausesIn('ok("nothing here", debt.length === 0);\n');
const plantedOwing = plantedClauses.filter((c) => !isPlant(c.body) && isZeroish(c.body.split("\n")[0])).length;
ok(`…and the census reads clauses rather than an empty set (${plantedOwing} of 1 owing in the planted script; the suite read ${proofFiles.length} scripts)`,
  plantedOwing === 1 && proofFiles.length >= 41);

// ===== 39. The two ways a green can be empty ===========================================
// Section 38 asks whether a CLAUSE can pass vacuously: an `ok("…", x.length === 0)` whose scan
// read nothing passes, and the census charges it unless it carries a plant, a pin or a planted
// companion. Two strictly more fundamental questions were never asked, and both are the same
// worry — a green that is green because nothing was measured.
//
// **Can a FILE pass vacuously?** Every milestone in this file quotes "N/N checks green" from
// this suite, and that claim rests on each of the 42 scripts doing two things: counting its
// verdicts into a variable, and letting that variable reach `process.exit`. A script whose
// `ok()` counts into a variable no exit reads is a permanently green script: it prints
// "0/0 checks passed", exits 0, and section 38 counts its clauses as healthy while it is blind.
//
// **Can a CLAUSE never fail?** The census only looks at clauses that assert a zero. A clause
// whose predicate is `true`, or `a.length === a.length`, or `x === 0 || true` is green for a
// different reason and no section reads it — M247 banned exactly this shape when it found two
// file-count floors pinned as `X === X`, but nothing generalised the ban.
//
// Both readings are named functions so that the gate and its witnesses run the SAME code (M313:
// a witness that re-implements the predicate it guards proves nothing — mutate one and the
// other stays green).
//
// The honest limit, stated rather than hidden: both are syntactic readings. The harness reading
// proves a counter reaches an exit CALL; it cannot prove that call is on the path the script
// actually takes, so `if (never) process.exit(fail ? 1 : 0)` would pass here. The predicate
// reading knows the three shapes a predicate can be trivially true in and not the infinite
// others. What they catch is what this repository can actually write — a copied `ok()` whose
// counter was renamed on one side of the copy, which is how 42 hand-copied harnesses drift —
// and no other section can see either.
const harnessOf = (src) => {
  const lines = src.split(/\r?\n/);
  let def = null;
  for (let i = 0; i < lines.length; i++) {
    if (!/^(export\s+)?const ok = /.test(lines[i])) continue;
    let depth = 0;
    let body = "";
    for (let j = i; j < lines.length; j++) {
      for (const ch of lines[j]) {
        if (ch === "(" || ch === "{") depth++;
        else if (ch === ")" || ch === "}") depth--;
      }
      body += lines[j] + "\n";
      if (depth <= 0) break;
    }
    def = body;
    break;
  }
  if (def === null) return { definesOk: false, calls: 0, sinks: [], exits: [], linked: false };
  const sinks = new Set();
  // Both increment shapes are real: 40 scripts write `pass++`, `proof-runner` writes `pass += 1`.
  for (const m of def.matchAll(/([A-Za-z_$][\w$]*)\s*(?:\+\+|\+=\s*[1-9]\d*)/g)) sinks.add(m[1]);
  for (const m of def.matchAll(/([A-Za-z_$][\w$]*)\.push\(/g)) sinks.add(m[1]);
  // Close the assignment graph, so a variable derived from a counter counts as the counter:
  // `proof-m65` collects verdicts into `checks` and exits on `failed`, a filter of it.
  const reach = new Set(sinks);
  for (let pass = 0; pass < 3; pass++) {
    for (const m of src.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([^;\n]*)/g)) {
      if ([...reach].some((v) => new RegExp(`\\b${v}\\b`).test(m[2]))) reach.add(m[1]);
    }
  }
  const exits = [...src.matchAll(/process\.exit\(([^;]*)\)/g)].map((m) => m[1].trim());
  // ANY exit rather than the first: `proof-router` and `proof-storage` open with an early
  // `process.exit(1)` in a catch, which is not the path a counted failure takes.
  const linked = exits.some((e) => [...reach].some((v) => new RegExp(`\\b${v}\\b`).test(e)));
  // Leading whitespace counts: `proof-training` indents its forty calls.
  return { definesOk: true, calls: (src.match(/^\s*ok\(/gm) ?? []).length, sinks: [...sinks], exits, linked };
};
const ownTallyOf = (src) => {
  // The LAST line mentioning "checks passed" — `proof-runner`'s fixtures quote four others.
  const rows = src.split(/\r?\n/).filter((l) => /checks passed/.test(l));
  if (rows.length === 0) return { found: false, computed: false, line: "" };
  const line = rows[rows.length - 1].trim();
  return { found: true, computed: /\$\{/.test(line), line };
};
const harnessOk = (src) => {
  const h = harnessOf(src);
  const t = ownTallyOf(src);
  return h.definesOk && h.calls > 0 && h.linked && t.found && t.computed;
};
const harnessRows = proofFiles.map((f) => {
  const src = readFileSync(join(root, "scripts", f), "utf8");
  return { f, src, h: harnessOf(src), t: ownTallyOf(src), ok: harnessOk(src) };
});
const noOkDef = harnessRows.filter((r) => !r.h.definesOk);
const neverCalled = harnessRows.filter((r) => r.h.definesOk && r.h.calls === 0);
const noSink = harnessRows.filter((r) => r.h.definesOk && r.h.calls > 0 && r.h.sinks.length === 0);
const unlinked = harnessRows.filter(
  (r) => r.h.definesOk && r.h.calls > 0 && r.h.sinks.length > 0 && !r.h.linked,
);
const noTally = harnessRows.filter((r) => !r.t.found);
const literalTally = harnessRows.filter((r) => r.t.found && !r.t.computed);
ok(`every proof script's verdicts reach an exit path (${harnessRows.length} scripts: ${noOkDef.length} with no ok() definition, ${neverCalled.length} that define it and never call it, ${noSink.length} whose ok() counts into nothing, ${unlinked.length} whose exit reads none of its counters${unlinked.length ? ` — ${unlinked.map((r) => `${r.f} exits (${r.h.exits.join(" | ")}) reading none of [${r.h.sinks.join(", ")}]`).join("; ")}` : ""})`,
  harnessRows.length >= 41 &&
    noOkDef.length === 0 &&
    neverCalled.length === 0 &&
    noSink.length === 0 &&
    unlinked.length === 0);
ok(`every proof script prints its own tally as a computation rather than a fixed number (${harnessRows.length - noTally.length - literalTally.length} of ${harnessRows.length} computed${noTally.length ? `, ${noTally.length} with no tally line` : ""}${literalTally.length ? `, ${literalTally.length} literal: ${literalTally.map((r) => `${r.f} "${r.t.line.slice(0, 60)}"`).join("; ")}` : ""})`,
  harnessRows.length >= 41 && noTally.length === 0 && literalTally.length === 0);
// The census above would count a blind script's clauses as healthy, so this section's own
// reader is witnessed the way every corrected reader in section 38 is: one fixture per way a
// harness can lie, each declaring the verdict it must get and each running `harnessOk` rather
// than a paraphrase of it. Every fixture carries a computed tally line so the only thing that
// varies is the axis under test — otherwise "no tally" would fail a fixture for a reason the
// fixture is not about.
const HARNESS_FIXTURES = [
  ["ok() counts into fail and the exit reads it", 'const ok = (n, c) => { if (c) { pass++; } else { fail++; } };\nok("x", true);\nconsole.log(`${pass}/${pass + fail} checks passed`);\nprocess.exit(fail ? 1 : 0);\n', true],
  ["ok() counts into a variable no exit reads", 'const ok = (n, c) => { if (c) { pass++; } else { unused++; } };\nok("x", true);\nconsole.log(`${pass}/${pass + fail} checks passed`);\nprocess.exit(fail ? 1 : 0);\n', false],
  ["ok() counts with += 1 rather than ++, as proof-runner does", 'const ok = (n, c) => { if (c) { pass += 1; } else { fail += 1; } };\nok("x", true);\nconsole.log(`${pass}/${pass + fail} checks passed`);\nprocess.exit(fail ? 1 : 0);\n', true],
  ["ok() collects verdicts and the exit reads the collection, as proof-m65 does", 'const ok = (n, c) => checks.push([c]);\nok("x", true);\nconst failed = checks.filter((r) => r[0] === false).length;\nconsole.log(`${pass}/${pass + fail} checks passed`);\nprocess.exit(failed ? 1 : 0);\n', true],
  ["ok() is defined and never called", 'const ok = (n, c) => { fail++; };\nconsole.log(`${pass}/${pass + fail} checks passed`);\nprocess.exit(fail ? 1 : 0);\n', false],
  ["the tally is printed as a literal", 'const ok = (n, c) => { fail++; };\nok("x", true);\nconsole.log("3/3 checks passed");\nprocess.exit(fail ? 1 : 0);\n', false],
  ["the tally is computed from the counters", 'const ok = (n, c) => { fail++; };\nok("x", true);\nconsole.log(`${pass}/${pass + fail} checks passed`);\nprocess.exit(fail ? 1 : 0);\n', true],
];
const harnessVerdicts = HARNESS_FIXTURES.map(([name, src, want]) => [name, harnessOk(src) === want]);
ok(`the harness reader, planted both ways, links a counter that reaches an exit and refuses one that does not, and refuses a literal tally (${harnessVerdicts.map(([n, v]) => `${n}: ${v}`).join("; ")})`,
  harnessVerdicts.every(([, v]) => v));
// The second axis: the predicate itself. `clausesIn` gives the clause body and `predicateOf`
// — declared beside the census, because the census reads a predicate too — gives the assertion.
const SELF_CMP = /([A-Za-z_$][\w$.[\]"']*)\s*(?:===|==|!==|!=|<=|>=|<|>)\s*([A-Za-z_$][\w$.[\]"']*)/;
const neverFails = (pred) => {
  if (/^(true|1)$/.test(pred)) return "a literal true";
  if (/\|\|\s*true\b/.test(pred)) return "an `|| true` arm";
  const m = pred.match(SELF_CMP);
  if (m && m[1] === m[2]) return `a self-comparison (${m[0]})`;
  return null;
};
const unfailable = [];
let predicatesRead = 0;
for (const { f, src } of harnessRows) {
  for (const c of clausesIn(src)) {
    const pred = predicateOf(c.body);
    if (!pred) continue;
    predicatesRead++;
    const why = neverFails(pred);
    if (why) unfailable.push(`${f}:${c.line} — ${why}`);
  }
}
ok(`no clause's predicate is true by construction (${predicatesRead} predicates read across ${proofFiles.length} scripts, floor 1000, ${unfailable.length} unfailable${unfailable.length ? `: ${unfailable.slice(0, 5).join("; ")}` : ""})`,
  predicatesRead >= 1000 && unfailable.length === 0);
const FAILABLE_FIXTURES = [
  ["a literal true", 'ok("x", true);\n', true],
  ["a self-comparison", 'ok("x", a.length === a.length);\n', true],
  ["an `|| true` arm", 'ok("x", a.length === 0 || true);\n', true],
  ["a real zero-assertion", 'ok("x", a.length === 0);\n', false],
  ["a real floor", 'ok("x", a.length >= 3);\n', false],
];
const failableVerdicts = FAILABLE_FIXTURES.map(([name, src, want]) => {
  const c = clausesIn(src)[0];
  return [name, (neverFails(predicateOf(c.body)) !== null) === want];
});
ok(`the failable reader, planted both ways, catches a literal, a self-comparison and an \`|| true\` arm and accuses no real assertion (${failableVerdicts.map(([n, v]) => `${n}: ${v}`).join("; ")})`,
  failableVerdicts.every(([, v]) => v));

console.log(`\n${enKeys.length} keys · ${L.length} locales`);

console.log(`${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
