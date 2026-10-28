// Proof for the ABSENCE-MARKER door (lib/utils.ts's `ABSENT`): the single glyph a reader is shown where
// a figure or a name is missing. This door is not a rounding or formatting fold — it freezes a display
// CONVENTION, and the convention was broken: thirty-plus cells app-wide spelled the marker as an em dash
// while nine Data Room tiles and one Dashboard goals column spelled it as an en dash, so the same "no
// value" read differently one screen over. Worse, the en dash is ALSO this app's range/score separator
// (`${prev}–${upTo}`, `${homeGoals}–${awayGoals}`), so a reader could not tell "nothing here" from "the
// scoreline is 2–1" by glyph alone. M394 added the door, folded those ten outlier cells onto it and
// charged the em-dash majority as a residue ledger; M395 spent that ledger — every render-time absence
// marker in shipped code now goes through the door, and the three dash reads the census still finds are
// the door's own body and the two generate-time values below. No displayed absence changed shape: the
// residue was already the right glyph, so this fold moves bytes and a convention, not a figure.
//
// Three families sit on the same two glyphs and must NOT be unified, which is why every scan is planted
// in both directions and the totals reconcile:
//   · ABSENCE marker — a standalone dash literal (`"—"`, `'—'`, `` `—` ``) or a dash as a whole JSX text
//     node (`>—<`). That is the door's family. The EN spelling of it is the class M394 closed, so a new
//     `?? "–"` reddens clause 5, and a re-inlined `"—"` reddens clause 7.
//   · RANGE / SCORE separator — a dash GLUED between two present figures (`}–${`, `} – {`, and the
//     zh/en dictionary copies). Folding one of these onto the door would overwrite a real figure's
//     joiner, so clause 10 measures the moved string instead of forbidding a spelling.
//   · GENERATE-TIME data value — the match engine's unattributed VAR scorer and the season simulator's
//     unknown nation. Both are bytes written INTO simulated records, not a marker chosen at render time,
//     so a locale- or theme-sensitive door would move generated data; they are charged by their exact
//     shipped line in clause 8 and are deliberately outside the fold queue.
// The residue bucket emptied in M395, and an empty bucket is exactly the shape that hid a mis-wired scan
// in M394's first draft. So the census keeps a population it CAN see (the three surviving reads, floored)
// and gains a bucket for the folded shape itself: clause 13 counts `{ABSENT}` in JSX position, planted
// both ways, so a scan that goes blind on the door's own spelling reddens instead of reconciling.
// scripts/ is not walked, so the plants below arm the scans instead of entering the census.
// Run: node scripts/proof-absent-glyph.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// The door is a constant, but loading it through Vite SSR is what lets clause 4 ask for the GLYPH the
// shipped module exports instead of trusting my own reading of the source line. An owned cacheDir outside
// the repo plus noDiscovery keeps the shared dep-optimizer's wait off this proof.
const server = await createServer({
  cacheDir: join(tmpdir(), `proof-absent-glyph-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { ABSENT, fmt2 } = await server.ssrLoadModule("/lib/utils.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "lib/utils.ts";
const FOLDED = ["features/analytics/DataRoom.tsx", "features/dashboard/Dashboard.tsx"];
// The ledger M394 charged and M395 spent: every screen and domain module that rendered its own em-dash
// absence. Pinned as the door's USER set in clause 6, so a new inline spelling shows up as a missing
// user and a new fold shows up as an unlisted one.
const SPENT = [
  "data/ai.ts", "data/intelligence.ts", "domain/scouting.ts",
  "features/film/FilmRoom.tsx", "features/football/Details.tsx", "features/load/LoadPage.tsx",
  "features/manager/ManagerOS.tsx", "features/onboarding/Onboarding.tsx", "features/player/PlayerOS.tsx",
  "features/review/ReviewPage.tsx", "features/scouting/ScoutingPanel.tsx",
  "features/settings/SettingsPage.tsx", "features/transfers/TransferCentre.tsx",
];
// The two generate-time values: simulated data, not display. Pinned by their exact shipped line below.
const DATA_VALUE = ["domain/matchEngine.ts", "domain/worldEngine.ts"];
const MATCH_LINE = 'events.push({ minute: 45, type: "VAR", side: rng() < 0.5 ? "home" : "away", player: "—" });';
const NATION_LINE = 'nation: clubsById.get(pr.clubId)?.nation ?? "—",';
// The scheduled-score placeholder: a COMPOSITE of two en dashes and a colon, neither an absence marker
// nor a two-figure joiner. It is the reason the absence scan must read quoted literals, not lines.
const PLACEHOLDER = '"– : –"';

const EN = "–", EM = "—";
// A dash that is the ENTIRE quoted literal — the absence-marker shape. Both quote spellings are scanned
// (the tree only ever uses double quotes today, and the plant proves the other two are read, not ignored).
const quoted = (g) => new RegExp(`"${g}"|'${g}'|\`${g}\``, "g");
const QUOTED_EM = quoted(EM), QUOTED_EN = quoted(EN);
// A dash that is the entire JSX child — `<span>—</span>`, `<td>—</td>`, `<option value="">—</option>`.
const JSX_EM = new RegExp(">" + EM + "<", "g"), JSX_EN = new RegExp(">" + EN + "<", "g");
// The SAME JSX-child position after the fold: `<span>{ABSENT}</span>`, `<option value="">{ABSENT}</option>`.
// The braces matter — `{ n: x ?? ABSENT }` is an expression slot, not a dash-shaped child, so this scan
// reads the four cells that used to be bare `>—<` text nodes and nothing else.
const JSX_DOOR = /(?<!\$)\{ABSENT\}/g;
// The separator family: a dash glued between two interpolations (JSX `{a} – {b}` or template `}–${b}`).
const SEP = new RegExp("\\}\\s*" + EN + "\\s*(?:\\$\\{|\\{)", "g");
const DECL_ABSENT = /\nexport const ABSENT[ \t]*=/g;
const PRIVATE_ABSENT = /\n(?:const|let)[ \t]*ABSENT[ \t]*=/g;
const IMPORT_ABSENT = /import[^;]*\bABSENT\b[^;]*from ["']@\/lib\/utils["']/g;
const USE_ABSENT = /(?<![\w$"])ABSENT(?![\w$"])/g;

const n = (text, re) => (text.match(re) || []).length;
// Walk the shipped source roots, then drop comment lines: the door's own docstring quotes every shape it
// replaced, and a raw file scan would charge the door for describing itself (the M371/M372 HOME-exclusion
// trap). Code text is what a reader's screen is built from.
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "i18n"].flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const raw = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const codeLines = (f) => raw[f].split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l));
const code = Object.fromEntries(carriers.map((f) => [f, codeLines(f).join("\n")]));
// A door USE is an ABSENT read outside its declaration and outside the import statement that brings it in.
// The header-line filter is the mechanism, so the plants below run through it too — a discriminator that
// counted a raw import line would claim to exclude something the scan does not exclude.
const bodyLines = (text) => text.split(/\r?\n/).filter((l) => !/^\s*(?:import|export)\b/.test(l)).join("\n");
const useText = (f) => bodyLines(code[f]);

// --- 1. Plants: every scan armed, and the four glyph-shape discriminators bite. ---
const pQuotedEm = n('  x = { present ? e.records : "—" }', QUOTED_EM);
const pQuotedEmAlt = n("  hint: '—',", QUOTED_EM);
const pQuotedEmTmpl = n("  band: `—`,", QUOTED_EM);
const pJsxEm = n('<span className="muted">—</span>', JSX_EM);
const pOptionEm = n('<option value="">—</option>', JSX_EM);
const pQuotedEn = n('  avg: metrics[0]?.leagueAvg.toFixed(2) ?? "–",', QUOTED_EN);
const pJsxEn = n("<td>–</td>", JSX_EN);
// Discriminators: the absence scans are glyph-exact and literal-exact, so they must read NOTHING on a
// separator line, on the composite placeholder, or on the other glyph. A scan that only needed the glyph
// somewhere on the line would charge all eighteen code separators and both dictionary locales as absence
// markers, and clause 5's "0 remaining" would be unreachable — i.e. already red before this unit.
const dSepNotAbsence = n('  return { zone: band.zone, band: `${prev}–${band.upTo}` };', QUOTED_EN);
const dSepNotAbsenceJsx = n("<span>{clash.xg.home} – {clash.xg.away}</span>", QUOTED_EN);
const dPlaceholderNotAbsence = n('{m.status === "SCHEDULED" ? "– : –" : `${a}–${b}`}', QUOTED_EN);
const dPlaceholderCountsAsSeparator = n('{m.status === "SCHEDULED" ? "– : –" : `${a}–${b}`}', SEP);
const dEnScanBlindToEm = n('  x = { present ? e.records : "—" }', QUOTED_EN);
const dEmScanBlindToEn = n('  avg: metrics[0]?.leagueAvg.toFixed(2) ?? "–",', QUOTED_EM);
const dDeclNotUse = n(bodyLines('export const ABSENT = "—";'), USE_ABSENT);
const dImportNotUse = n(bodyLines('import { cn, clamp, ABSENT } from "@/lib/utils";'), USE_ABSENT);
const dRealUse = n("value={lead.bestForm ? getClub(id)?.short ?? ABSENT : ABSENT}", USE_ABSENT);
ok(`the scans are armed and glyph-exact (quoted-em ${pQuotedEm}/${pQuotedEmAlt}/${pQuotedEmTmpl}, jsx-em ${pJsxEm}, option ${pOptionEm}, quoted-en ${pQuotedEn}, jsx-en ${pJsxEn}) while they refuse the shapes they must not charge (en separator in a template ${dSepNotAbsence}, in JSX ${dSepNotAbsenceJsx}, composite placeholder ${dPlaceholderNotAbsence} yet the separator scan reads it ${dPlaceholderCountsAsSeparator}, en-scan-on-em-line ${dEnScanBlindToEm}, em-scan-on-en-line ${dEmScanBlindToEn}) and a door USE excludes the declaration ${dDeclNotUse} and the import ${dImportNotUse} but counts a real fallback pair ${dRealUse}`,
  pQuotedEm === 1 && pQuotedEmAlt === 1 && pQuotedEmTmpl === 1 && pJsxEm === 1 && pOptionEm === 1 &&
  pQuotedEn === 1 && pJsxEn === 1 && dSepNotAbsence === 0 && dSepNotAbsenceJsx === 0 &&
  dPlaceholderNotAbsence === 0 && dPlaceholderCountsAsSeparator === 1 && dEnScanBlindToEm === 0 &&
  dEmScanBlindToEn === 0 && dDeclNotUse === 0 && dImportNotUse === 0 && dRealUse === 2);

// --- 2. Population floor + subject presence (a blind walk reads an empty tree and passes a zero claim). ---
const present = [HOME, ...FOLDED, ...DATA_VALUE, "features/football/Details.tsx", "i18n/dictionaries.ts"]
  .every((p) => Object.prototype.hasOwnProperty.call(raw, p));
ok(`the census walks the real source tree and every subject is inside it (${carriers.length} .ts/.tsx, floor 80)`,
  carriers.length >= 80 && present);

// --- 3. The door is declared exactly once, only in its home, and no consumer hand-rolled one. ---
const declByFile = carriers.filter((f) => n(raw[f], DECL_ABSENT) > 0);
const privateByFile = carriers.filter((f) => n(code[f], PRIVATE_ABSENT) > 0);
const plantDecl = n('\nexport const ABSENT = "—";\n', DECL_ABSENT);
const plantPrivate = n('\nconst ABSENT = "—";\n', PRIVATE_ABSENT);
ok(`ABSENT is declared exactly once, in the lib/utils door, and no module re-declared a private copy (home ${n(raw[HOME], DECL_ABSENT)}, tree [${declByFile.join(",")}], private ${privateByFile.length}; planted declaration ${plantDecl}, planted private copy ${plantPrivate})`,
  plantDecl === 1 && plantPrivate === 1 && n(raw[HOME], DECL_ABSENT) === 1 &&
  declByFile.length === 1 && declByFile[0] === HOME && privateByFile.length === 0);

// --- 4. The door's VALUE pinned two ways: LITERALLY (the shipped line, so a rename or a re-spaced arm ---
// --- reddens) and BEHAVIOURALLY through the loaded module (so the glyph is the em dash, one character, ---
// --- and NOT the en dash the fold replaced). The plants below each keep the identifier and change one ---
// --- thing the literal must catch, which is what proves the compare is load-bearing, not always-true. ---
const doorLine = (raw[HOME].match(/export const ABSENT[^\n]*/) || [""])[0];
const LIT = 'export const ABSENT = "—";';
const literalOf = (line) => (line.trim() === LIT ? 1 : 0);
const plantEnBody = literalOf('export const ABSENT = "–";');
const plantRenamed = literalOf('export const AbsentMarker = "—";');
const plantDouble = literalOf('export const ABSENT = "——";');
const plantReSpaced = literalOf('export const ABSENT="—";');
ok(`the door ships the em dash: the literal line matches byte-for-byte and the loaded module's value is one em-dash character (line "${doorLine}", literal ${literalOf(doorLine)}, loaded typeof ${typeof ABSENT} length ${ABSENT.length} codepoint U+${ABSENT.codePointAt(0).toString(16).toUpperCase()}, equals-em ${ABSENT === EM ? 1 : 0}, equals-en ${ABSENT === EN ? 1 : 0}; planted en-dash body ${plantEnBody}, renamed ${plantRenamed}, two-character ${plantDouble}, re-spaced ${plantReSpaced})`,
  literalOf(doorLine) === 1 && plantEnBody === 0 && plantRenamed === 0 && plantDouble === 0 &&
  plantReSpaced === 0 && typeof ABSENT === "string" && ABSENT.length === 1 && ABSENT === EM && ABSENT !== EN);

// --- 5. The en-dash ABSENCE class is closed: zero standalone en-dash literals or JSX dash nodes left in ---
// --- shipped code. Armed by the plants above and by the per-file breakdown printed here — the eight Data ---
// --- Room tiles and the Dashboard goals column were the whole class, and a new one reddens this census. ---
// --- M397: lib/utils.ts is excluded because it now carries the SEPARATOR door's own declaration ---
// --- (`export const SEPARATOR = "–"`), which is a legitimate quoted en dash, not an absence marker. ---
const enQuotedByFile = carriers.filter((f) => f !== "lib/utils.ts" && n(code[f], QUOTED_EN) > 0);
const enJsxByFile = carriers.filter((f) => f !== "lib/utils.ts" && n(code[f], JSX_EN) > 0);
const enLeft = enQuotedByFile.concat(enJsxByFile);
ok(`no absence marker is spelled with the separator glyph any more (quoted-en carriers [${enQuotedByFile.join(",")}], jsx-en carriers [${enJsxByFile.join(",")}], total ${enLeft.length}; lib/utils.ts excluded: SEPARATOR door declaration; planted en literals read 1 each in clause 1)`,
  enLeft.length === 0);

// --- 6. Derived caller census: every file that USES the door imports it, the users are exactly the ---
// --- screens this door owns (M394's two outlier folds plus M395's spent ledger), and each user's use ---
// --- count is the number of cells it renders through the door. Users come from the tree, never from a ---
// --- hand-typed list, so a fold in a fifth file shows up here without editing this proof — and so does ---
// --- a fold that forgot its import. ---
// --- M400 widened the door's user set: the NAME lane (a club or competition name the app looked up
// --- and did not find) now rides the door too, which added three new user files (the service's search
// --- subtitles, the Football World's club badge, the Simulation Lab's season caption) and grew four
// --- existing ones. The pin below is the tree's own per-user counts, re-derived after that fold —
// --- a stale count here is exactly the defect M396 was about, so the counts are checked per file.
// --- The lane's own claims (the name lane is closed, the control lane survived) live in
// --- proof-absent-name.mjs; this clause charges the door's TOTAL user set, not the name lane's. ---
const users = carriers.filter((f) => n(useText(f), USE_ABSENT) > 0).sort();
const userImports = users.filter((f) => n(code[f], IMPORT_ABSENT) >= 1);
const dataValueUsers = DATA_VALUE.filter((f) => n(useText(f), USE_ABSENT) > 0);
const perUser = users.map((f) => `${f}=${n(useText(f), USE_ABSENT)}`).join(",");
// The ledger by carrier: the door's whole reader-facing population, by the file that renders it.
// M394 folded two outlier cells, M395 spent a 13-file ledger, and M400 added the name lane.
// M534 adds the run-in screen: five cells (the league average, three short-name tiles and the
// opponent-average column) read the door rather than a typed dash.
// M559 adds the points-scenario screen: five cells (three short-name tiles, the title-race hint
// and the leader's gap) read the door rather than a typed dash.
// M569 adds the venue split: fourteen cells (the headline share, the competition-name hint, the
// fortress/traveller lines, and both halves of every club's record and points) read the door.
// M570 adds the goal-timing screen: four cells (both late-scorer tiles and their absent values,
// and the two club short names they fall back from) read the same door.
const expectedUsers = [
  "data/ai.ts", "data/footballService.ts", "data/intelligence.ts", "domain/scouting.ts",
  "features/analytics/DataRoom.tsx", "features/analytics/GoalTiming.tsx",
  "features/analytics/PointsScenario.tsx",
  "features/analytics/RunIn.tsx", "features/analytics/VenueSplit.tsx",
  "features/compare/ClubCompare.tsx", "features/dashboard/Dashboard.tsx",
  "features/film/FilmRoom.tsx", "features/football/Details.tsx",
  "features/football/FootballWorld.tsx", "features/load/LoadPage.tsx",
  "features/manager/ManagerOS.tsx", "features/manager/SquadPlanning.tsx", "features/onboarding/Onboarding.tsx",
  "features/player/PlayerOS.tsx", "features/review/ReviewPage.tsx",
  "features/scouting/ScoutingPanel.tsx", "features/settings/SettingsPage.tsx",
  "features/sim/SimulationLab.tsx", "features/transfers/TransferCentre.tsx",
  // M525: the season report's rise/fall tiles fall back to the door.
  "features/world/DynamicWorld.tsx",
];
const expectedPerUser = [
  ["data/ai.ts", 3], ["data/footballService.ts", 2], ["data/intelligence.ts", 20], ["domain/scouting.ts", 1],
  ["features/analytics/DataRoom.tsx", 13], ["features/analytics/GoalTiming.tsx", 4],
  ["features/analytics/PointsScenario.tsx", 5],
  ["features/analytics/RunIn.tsx", 5], ["features/analytics/VenueSplit.tsx", 14],
  ["features/compare/ClubCompare.tsx", 2], ["features/dashboard/Dashboard.tsx", 2],
  ["features/film/FilmRoom.tsx", 1], ["features/football/Details.tsx", 5],
  ["features/football/FootballWorld.tsx", 1], ["features/load/LoadPage.tsx", 3],
  ["features/manager/ManagerOS.tsx", 2], ["features/manager/SquadPlanning.tsx", 1], ["features/onboarding/Onboarding.tsx", 2],
  ["features/player/PlayerOS.tsx", 5], ["features/review/ReviewPage.tsx", 5],
  ["features/scouting/ScoutingPanel.tsx", 3], ["features/settings/SettingsPage.tsx", 2],
  ["features/sim/SimulationLab.tsx", 1], ["features/transfers/TransferCentre.tsx", 2],
  ["features/world/DynamicWorld.tsx", 3],
].map(([f, c]) => `${f}=${c}`).join(",");
ok(`the door is used by exactly the screens that render an absence, each importing it, and neither generate-time data file reaches for it (users ${users.length}/${expectedUsers.length} [${users.join(",")}] with uses ${perUser}; importers ${userImports.length}/${users.length}; generate-time users ${dataValueUsers.length})`,
  users.length === expectedUsers.length && users.join(",") === expectedUsers.join(",") &&
  userImports.length === users.length && perUser === expectedPerUser && dataValueUsers.length === 0);

// --- 7. Completeness by RECONCILIATION, not by a hand count: every standalone dash literal or JSX dash ---
// --- node in shipped code is exactly one of {the door's own body, a generate-time data value, a render ---
// --- residue}. The three buckets are scanned independently. M394 learned (in its own first draft) that a ---
// --- mis-wired bucket still RECONCILES, because the residue total is whatever the other two leave over; ---
// --- so the clause pins the carrier SET of each bucket, floors the population the scans can see, and ---
// --- after M395 spends the ledger it also demands the surviving floor of 3 — a blind scan would read 0 ---
// --- and pass a "residue 0" claim about nothing. ---
const emQuoted = carriers.map((f) => [f, n(code[f], QUOTED_EM)]).filter(([, c]) => c > 0);
const emJsx = carriers.map((f) => [f, n(code[f], JSX_EM)]).filter(([, c]) => c > 0);
const emJsxTotal = emJsx.reduce((a, [, c]) => a + c, 0);
const standalone = new Map();
for (const [f, c] of emQuoted.concat(emJsx)) standalone.set(f, (standalone.get(f) || 0) + c);
const totalStandalone = [...standalone.values()].reduce((a, b) => a + b, 0);
const doorBody = n(codeLines(HOME).filter((l) => /^\s*export const ABSENT\b/.test(l)).join("\n"), QUOTED_EM);
const dataValueTotal = DATA_VALUE.reduce((a, f) => a + (standalone.get(f) || 0), 0);
const residueFiles = [...standalone.keys()].filter((f) => f !== HOME && !DATA_VALUE.includes(f)).sort();
const residueTotal = residueFiles.reduce((a, f) => a + standalone.get(f), 0);
const reconciles = doorBody + dataValueTotal + residueTotal === totalStandalone;
// The folded shape gets its own bucket and its own floor: `{ABSENT}` as a whole JSX child. This is the
// population that REPLACED the residue ledger, so the census still has something to lose. Five cells,
// not four: Data Room's empty-form tile reached this shape in M394 and the other four in M395, which
// is what this pin corrected from the tree rather than from the fold plan.
// --- Two shapes the fold produced: `{ABSENT}` as an entire JSX child, and `ABSENT` as the fallback arm ---
// --- of a ternary or a `??` sitting inside an expression slot. This bucket counts the FIRST shape only. ---
// --- Arm F of dev/.m395-arms.mjs found why that has to be explicit: a plain brace scan also read a ---
// --- template interpolation slot (the door spliced into a band joiner writes `${prev}${ABSENT}${upTo}`), ---
// --- so a separator fold made this render bucket gain a carrier and reddened a clause whose whole job is ---
// --- the render population. The scan now refuses a brace introduced by a `$`; `pJsxDoorInterp` is the ---
// --- plant that proves the discriminator bites — it read 1 before the lookbehind and 0 after, while the ---
// --- JSX child keeps reading 1 and the carrier set stays at four files. ---
const jsxDoorTotal = carriers.reduce((a, f) => a + n(code[f], JSX_DOOR), 0);
const jsxDoorFiles = carriers.filter((f) => n(code[f], JSX_DOOR) > 0).sort();
const expectedJsxDoorFiles = [
  "features/analytics/DataRoom.tsx", "features/football/Details.tsx",
  "features/onboarding/Onboarding.tsx", "features/scouting/ScoutingPanel.tsx",
].sort().join(",");
const pJsxDoor = n('<span className="muted">{ABSENT}</span>', JSX_DOOR);
const pJsxDoorOld = n('<span className="muted">—</span>', JSX_DOOR);
const pJsxDoorExprSlot = n("{ n: acwr?.toFixed(2) ?? ABSENT }", JSX_DOOR);
const pJsxDoorInterp = n('band: `${prev}${ABSENT}${band.upTo}`', JSX_DOOR);
ok(`the standalone-dash census reconciles on the spent ledger and both its buckets are pinned (total ${totalStandalone} = door body ${doorBody} + generate-time ${dataValueTotal} + render residue ${residueTotal}; reconciles ${reconciles ? "yes" : "NO"}; surviving floor 3, residue carriers [${residueFiles.join(",")}], quoted-em carriers [${emQuoted.map(([f, c]) => f + "=" + c).join(",")}], leftover JSX-em nodes ${emJsxTotal}; folded JSX bucket {ABSENT} ${jsxDoorTotal} over [${jsxDoorFiles.join(",")}] with floor 5, planted child 1 / pre-fold 0 / expression-slot 0 / template-interpolation ${pJsxDoorInterp})`,
  reconciles && doorBody === 1 && dataValueTotal === 2 && residueTotal === 0 &&
  residueFiles.length === 0 && totalStandalone >= 3 && emJsxTotal === 0 &&
  pJsxDoor === 1 && pJsxDoorOld === 0 && pJsxDoorExprSlot === 0 && pJsxDoorInterp === 0 &&
  jsxDoorTotal >= 5 &&
  jsxDoorFiles.join(",") === expectedJsxDoorFiles);

// --- 8. The generate-time values are charged by their EXACT shipped line, so a fold of either onto the ---
// --- door (or a re-spelling inside the generator) reddens this clause rather than passing silently. The ---
// --- folded-line plant reads 0, proving the pin binds the inline spelling and not merely the file. ---
const matchSites = n(code[DATA_VALUE[0]], new RegExp(escapeRe(MATCH_LINE), "g"));
const nationSites = n(code[DATA_VALUE[1]], new RegExp(escapeRe(NATION_LINE), "g"));
const plantFoldedMatch = n('events.push({ minute: 45, type: "VAR", side: rng() < 0.5 ? "home" : "away", player: ABSENT });', new RegExp(escapeRe(MATCH_LINE), "g"));
const plantOtherGenerator = n('  scorer: "—" });', new RegExp(escapeRe(MATCH_LINE), "g"));
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
ok(`the two dashes written into SIMULATED DATA are pinned by line, not by glyph (VAR scorer ${matchSites}, unknown nation ${nationSites}; planted already-folded VAR line ${plantFoldedMatch}, planted unrelated generator line ${plantOtherGenerator}) — they are record contents, so a display door must not own them`,
  matchSites === 1 && nationSites === 1 && plantFoldedMatch === 0 && plantOtherGenerator === 0);

// --- 9. The separator family is now behind its own door (M397), counted apart from the absence ---
// --- family and split by plane: code joiners (which build a displayed figure pair) are 0, and ---
// --- dictionary copy (which is prose and must stay a translation's own character) is unchanged. ---
// --- Both are measured, so "the census narrowed itself" reddens. ---
const sepByFile = carriers.map((f) => [f, n(code[f], SEP)]).filter(([, c]) => c > 0);
const sepCode = sepByFile.filter(([f]) => f !== "i18n/dictionaries.ts" && f !== "lib/utils.ts");
const sepCodeTotal = sepCode.reduce((a, [, c]) => a + c, 0);
const sepDict = n(code["i18n/dictionaries.ts"], SEP);
const sepFiles = sepCode.map(([f]) => f).sort();
const dataRoomSep = n(code["features/analytics/DataRoom.tsx"], SEP);
ok(`the en-dash joiners are folded behind the SEPARATOR door: 0 code sites remain, dictionary copy is unchanged (${sepCodeTotal} code sites over [${sepFiles.join(",")}]; Data Room keeps ${dataRoomSep}; dictionary copy keeps ${sepDict} in three locales, charged apart); planted separator line read 1 in clause 1`,
  sepCodeTotal === 0 && sepDict >= 30 && dataRoomSep === 0);

// --- 10. Must-not-unify, BEHAVIOURAL. The tempting rewrite is "one dash constant for everything". Run it ---
// --- on the shipped door and the shipped fmt2 with the figures a band and a scoreline actually carry, and ---
// --- the reader loses a number: `${prev}–${upTo}` becomes a single figure with a marker in its middle, and ---
// --- the composite scheduled-score placeholder is not the door's shape either. Measured, not asserted. ---
const bandWithDoor = `${fmt2(0.8)}${ABSENT}${fmt2(1.3)}`;
const bandAsShipped = `${fmt2(0.8)}–${fmt2(1.3)}`;
const scoreAsShipped = `${2}–${1}`;
const scoreWithDoor = `${2}${ABSENT}${1}`;
ok(`the door cannot serve the separator — splicing it in overwrites a joiner between two PRESENT figures (band "${bandAsShipped}" would read "${bandWithDoor}", scoreline "${scoreAsShipped}" would read "${scoreWithDoor}"), and both differ from the shipped text (${bandWithDoor !== bandAsShipped && scoreWithDoor !== scoreAsShipped ? "yes" : "NO"})`,
  bandWithDoor !== bandAsShipped && scoreWithDoor !== scoreAsShipped &&
  bandAsShipped.includes(EN) && !bandWithDoor.includes(EN) && ABSENT === EM);

// --- 11. The composite scheduled-score placeholder is charged by name in its own carrier and read by the ---
// --- separator scan, never by the absence scans: it is the one shipped string where an en dash appears ---
// --- INSIDE a quoted literal. A clause that only grepped for the glyph would have charged it as absence. ---
const placeholderFile = "features/football/Details.tsx";
const placeholderSites = n(code[placeholderFile], new RegExp(escapeRe(PLACEHOLDER), "g"));
const placeholderNotAbsence = n(code[placeholderFile], QUOTED_EN);
ok(`the "– : –" score placeholder stays a placeholder, not an absence marker (${placeholderFile} spells it ${placeholderSites}x; the absence scan reads ${placeholderNotAbsence} standalone en literals there)`,
  placeholderSites === 1 && placeholderNotAbsence === 0);

// --- 12. Reachability: the folded cells are live render branches, not names an import could satisfy. ---
// --- Each pattern is planted three ways — the guarded fallback pair (reads 1), an import-only fold and a ---
// --- call with the fallback dropped (read 0) — so a half-fold that leaves the reader with "undefined" is ---
// --- refused even though the door is imported. Data Room's tile line is pinned in its shipped shape. ---
const TILE = /value=\{lead\.bestForm \? getClub\(lead\.bestForm\.clubId\)\?\.short \?\? ABSENT : ABSENT\}/g;
const GOAL = /\{goals \?\? ABSENT\}/g;
const pTile = n('<StatTile value={lead.bestForm ? getClub(lead.bestForm.clubId)?.short ?? ABSENT : ABSENT} />', TILE);
const pTileDropped = n('<StatTile value={lead.bestForm ? getClub(lead.bestForm.clubId)?.short ?? ABSENT : undefined} />', TILE);
const pGoal = n("<span>{goals ?? ABSENT}</span>", GOAL);
const pGoalBare = n("<span>{goals}</span>", GOAL);
const tileSites = n(code[FOLDED[0]], TILE);
const goalSites = n(code[FOLDED[1]], GOAL);
ok(`both folds sit inside the expression the reader reaches (Data Room tile fallback pair ${tileSites}, Dashboard goals fallback ${goalSites}; planted guarded pair ${pTile}, planted dropped-fallback ${pTileDropped}, planted span-with-guard ${pGoal}, planted unguarded interpolation ${pGoalBare})`,
  tileSites === 1 && goalSites === 1 && pTile === 1 && pTileDropped === 0 && pGoal === 1 && pGoalBare === 0);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
