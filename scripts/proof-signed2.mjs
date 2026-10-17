// Proof for the PADDED signed-display door (lib/utils.ts's `signed2`): a figure shown at a FIXED two
// decimals with a leading `+`, i.e. the sign glued in front of a PRE-FORMATTED string. Two cells in
// the app spelled that by hand — the Manager career's season-form var and the Film Room's scan-trend
// tile — and the sibling `signed` door cannot serve either of them, because it coerces the RAW number
// and would show "+1.5" where the reader is shown "+1.50". M393 put the two spellings behind one door
// and folded the Film Room's tile onto it; career's cell is still inline and is charged here BY NAME
// (its carrier is mid-flight in another lane), so a fold of it has to come back and update this census.
//
// Three shapes sit next to each other and must NOT be unified, which is why each scan is planted both
// ways:
//   · `signed` (raw coercion) — a DIFFERENT name, so neither door's declaration/import/call scan can
//     read the other. The behavioural clause shows they disagree on the value the padded cells pass.
//   · `"+" + fmt2(v)` — the tempting rewrite. It glues a `+` onto a NEGATIVE's own sign and prints
//     "+-1.00" where the shipped door prints "-1.00", so it is refused by behaviour, not by spelling.
//   · DynamicWorld's delta — `up ? "+" : ""}{delta}`, where the sign comes from a BOOLEAN computed
//     elsewhere and the number keeps whatever width it already had. The `>= 0` anchor reads 0 there;
//     the boolean anchor reads 1 and the padded anchor 0, so the census neither sweeps it up nor
//     excuses it unseen.
// scripts/ is not walked, so the plants arm the scans instead of entering the census.
// Run: node scripts/proof-signed2.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// fmt2 is pure, but loading it through Vite SSR routes through the module runner, which waits on the
// shared dep-optimizer a concurrent build churns; an owned cacheDir outside the repo plus noDiscovery
// keeps that wait off this proof.
const server = await createServer({
  cacheDir: join(tmpdir(), `proof-signed2-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { signed, signed2, fmt2 } = await server.ssrLoadModule("/lib/utils.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "lib/utils.ts";
// The padded family, cell by cell: FilmRoom folded at M393, career still a named residue.
const RESIDUE = ["domain/career.ts"];
const FOLDED = ["features/film/FilmRoom.tsx"];
// The boolean sibling, deliberately outside this door's population.
const BOOLEAN_SITE = "features/world/DynamicWorld.tsx";

// Walk the shipped source roots. scripts/ is NOT walked, so the plants below are the reference the
// scans are armed against, never a second charge in the census population.
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "i18n"].flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));

const count = (text, re) => (text.match(re) || []).length;

// The padded spelling: a `>= 0` sign ternary with an EMPTY false arm, closed with `}` and glued
// straight onto a `${…toFixed(2)}` interpolation. The general numeric-sign scan is the same ternary
// without the pad, so padded ⊂ numeric; the boolean scan keys on an IDENTIFIER before the `?` (the
// numeric form always has a digit there), which is what tells the two families apart.
const PADDED_SIGN = />= *0 *\? *"\+" *: *""\} *\$\{[^}]*\.toFixed\(2\)/g;
const NUMERIC_SIGN = />= *0 *\? *"\+" *: *""/g;
const BOOLEAN_SIGN = /[A-Za-z_$][A-Za-z0-9_$.]* *\? *"\+" *: *""/g;
const DECL_SIGNED2 = /\nexport const signed2[ \t]*=/g;
const PRIVATE_SIGNED2 = /\nconst signed2[ \t]*=/g;
const IMPORT_SIGNED2 = /import[^;]*\bsigned2\b[^;]*from ["']@\/lib\/utils["']/g;
const CALL_SIGNED2 = /\bsigned2\(/g;

const LIT_BODY = 'export const signed2 = (v: number): string => `${v >= 0 ? "+" : ""}${v.toFixed(2)}`;';

// --- Plants: arm every scan so a "once"/"zero"/"only" verdict is measured, never an empty set. ---
const plantPadded = count('  {v >= 0 ? "+" : ""}${v.toFixed(2)}', PADDED_SIGN);
const plantNumeric = count('  delta: `${x >= 0 ? "+" : ""}${x}`,', NUMERIC_SIGN);
const plantNumericNotPadded = count('  delta: `${x >= 0 ? "+" : ""}${x}`,', PADDED_SIGN);
const plantBoolean = count('  <span>{up ? "+" : ""}{delta}</span>', BOOLEAN_SIGN);
const plantBooleanNotNumeric = count('  <span>{up ? "+" : ""}{delta}</span>', NUMERIC_SIGN);
const plantNumericNotBoolean = count('  delta: `${x >= 0 ? "+" : ""}${x}`,', BOOLEAN_SIGN);
const plantDecl = count('\nexport const signed2 = (v: number): string => x;\n', DECL_SIGNED2);
const plantPrivate = count('\nconst signed2 = (v: number) => x;\n', PRIVATE_SIGNED2);
const plantImport = count('import { cn, signed2 } from "@/lib/utils";', IMPORT_SIGNED2);
const plantCall = count('  trend: signed2(insights.scanTrend),', CALL_SIGNED2);
// The SIBLING raw door shares the name prefix, so every scan here must read it as NOTHING — a proof
// that cannot tell `signed` from `signed2` would credit the raw door's imports to this door.
const plantRawDecl = count('\nexport const signed = (n: number): string => (n >= 0 ? "+" + n : String(n));\n', DECL_SIGNED2);
const plantRawImport = count('import { cn, signed } from "@/lib/utils";', IMPORT_SIGNED2);
const plantRawCall = count('  delta: signed(review.delta),', CALL_SIGNED2);
const plantCallNotSigned2 = count('  delta: signed(review.delta),', CALL_SIGNED2);
ok(`the seven scans are armed (padded ${plantPadded}, numeric ${plantNumeric}, decl ${plantDecl}, private ${plantPrivate}, import ${plantImport}, call ${plantCall}) and the three discriminators bite (numeric-not-padded ${plantNumericNotPadded}, boolean ${plantBoolean}, boolean-not-numeric ${plantBooleanNotNumeric}, numeric-not-boolean ${plantNumericNotBoolean}) while the raw sibling door reads nothing here (decl ${plantRawDecl}, import ${plantRawImport}, call ${plantRawCall}, and the same call scan on it ${plantCallNotSigned2})`,
  plantPadded === 1 && plantNumeric === 1 && plantDecl === 1 && plantPrivate === 1 && plantImport === 1 && plantCall === 1 &&
  plantNumericNotPadded === 0 && plantBoolean === 1 && plantBooleanNotNumeric === 0 && plantNumericNotBoolean === 0 &&
  plantRawDecl === 0 && plantRawImport === 0 && plantRawCall === 0 && plantCallNotSigned2 === 0);

// --- Population floor + subject presence (a blind walk would read an empty tree and pass a negative claim). ---
const present = [HOME, ...RESIDUE, ...FOLDED, BOOLEAN_SITE].every((p) => Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and every subject is inside it (${carriers.length} .ts/.tsx, floor 80)`,
  carriers.length >= 80 && present);

// --- Structural: the door is declared exactly once, only in its home, and no module hand-rolled one. ---
const declByFile = carriers.filter((f) => count(src[f], DECL_SIGNED2) > 0);
const privateByFile = carriers.filter((f) => count(src[f], PRIVATE_SIGNED2) > 0);
ok(`signed2 is declared exactly once, in the lib/utils door, and no consumer re-declared a private copy (home ${count(src[HOME], DECL_SIGNED2)}, tree ${declByFile.join(",")}, private ${privateByFile.length})`,
  count(src[HOME], DECL_SIGNED2) === 1 && declByFile.length === 1 && declByFile[0] === HOME && privateByFile.length === 0);

// --- The door body, pinned TWO ways. LITERALLY: the shipped line equals the byte-for-byte body, so a ---
// --- rename of the parameter or a re-spaced arm reddens this clause. A plant with the same semantics ---
// --- but a different parameter name reads 0 here, which is what proves the literal is load-bearing ---
// --- rather than an always-true string compare. ---
const signed2Line = (src[HOME].match(/export const signed2[^\n]*/) || [""])[0];
const literalOf = (line) => (line.trim() === LIT_BODY ? 1 : 0);
const plantRenamedParam = literalOf('export const signed2 = (n: number): string => `${n >= 0 ? "+" : ""}${n.toFixed(2)}`;');
const plantSameNameDiffPad = literalOf('export const signed2 = (v: number): string => `${v >= 0 ? "+" : ""}${v.toFixed(1)}`;');
ok(`the door body line is the exact shipped form, and neither a rename of the parameter nor a different pad satisfies the literal (shipped ${literalOf(signed2Line)}, renamed-param plant ${plantRenamedParam}, one-decimal plant ${plantSameNameDiffPad})`,
  literalOf(signed2Line) === 1 && plantRenamedParam === 0 && plantSameNameDiffPad === 0);

// --- Structurally: the body IS a padded sign of a two-decimal call, so the door keeps the pad the ---
// --- folded cell showed. A body rewritten to `"+" + fmt2(v)` reads 0 here (no `>= 0` ternary at all). ---
const pBodyGlue = count('export const signed2 = (v: number): string => `${v >= 0 ? "+" : ""}${v.toFixed(2)}`;', PADDED_SIGN);
const pBodyPlusFmt = count('export const signed2 = (v: number): string => "+" + fmt2(v);', PADDED_SIGN);
ok(`the door body is the padded idiom itself, read by line so the docstring that quotes the shape it replaced is never charged (body ${count(signed2Line, PADDED_SIGN)}, numeric ${count(signed2Line, NUMERIC_SIGN)}, planted padded ${pBodyGlue}, planted plus-fmt2 rewrite ${pBodyPlusFmt})`,
  count(signed2Line, PADDED_SIGN) === 1 && count(signed2Line, NUMERIC_SIGN) === 1 && pBodyGlue === 1 && pBodyPlusFmt === 0);

// --- Derived caller census: every file that CALLS the door imports it, and no caller still spells ---
// --- the padded form by hand (a half-fold that leaves the inline spelling next to the call is dead ---
// --- bytes a reader would blame the door for). Callers come from the tree, not from a hand-typed list. ---
const callers = carriers.filter((f) => count(src[f], CALL_SIGNED2) > 0).sort();
const callerImports = callers.filter((f) => count(src[f], IMPORT_SIGNED2) >= 1);
const callerSpelling = callers.filter((f) => f !== HOME && count(src[f], PADDED_SIGN) > 0);
const filmRoomCalls = count(src["features/film/FilmRoom.tsx"], CALL_SIGNED2);
ok(`every caller of signed2 imports it and none still glues the pad by hand (callers ${callers.join(",")}, importers ${callerImports.length}/${callers.length}, callers-with-inline ${callerSpelling.length}, FilmRoom calls ${filmRoomCalls}, floor 1)`,
  callers.length >= 1 && callerImports.length === callers.length && callerSpelling.length === 0 &&
  callers.includes("features/film/FilmRoom.tsx") && filmRoomCalls >= 1);

// --- Completeness: across the tree the padded spelling survives in exactly two places — the door's ---
// --- own body line and career's named residue. HOME is read BY LINE because its docstring quotes the ---
// --- shape it replaced (a raw file scan there reads 2 and would hide the quote as a stray). Any third ---
// --- spelling reddens this set — and so does career's own fold, which is the point of pinning it. ---
const paddedByFile = carriers.filter((f) => (f === HOME ? count(signed2Line, PADDED_SIGN) : count(src[f], PADDED_SIGN)) > 0).sort();
const expectedPadded = [HOME, ...RESIDUE].sort();
const docQuote = count(src[HOME].split("\n").filter((l) => /^\s*\/\//.test(l)).join("\n"), PADDED_SIGN);
const residueSites = RESIDUE.map((f) => [f, count(src[f], PADDED_SIGN)]);
const foldedSites = FOLDED.map((f) => [f, count(src[f], PADDED_SIGN)]);
ok(`the padded sign spelling survives only in the door body and career's named residue (carriers ${paddedByFile.join(",")}; expected ${expectedPadded.join(",")}; career ${residueSites.map(([, n]) => n).join(",")}, FilmRoom ${foldedSites.map(([, n]) => n).join(",")}; door docstring quotes it ${docQuote} and is read by line; planted padded ${plantPadded})`,
  plantPadded === 1 && paddedByFile.length === expectedPadded.length && paddedByFile.every((f, i) => f === expectedPadded[i]) &&
  residueSites[0][1] === 1 && foldedSites[0][1] === 0 && docQuote === 1);

// --- Must-not-unify, behavioural, against the RAW sibling: both doors are the SHIPPED ones here, not ---
// --- a re-spelling of mine. A fold onto `signed` would move the figure the reader sees. ---
ok(`signed() cannot serve this door's cells — it coerces the raw number and drops the pad the reader is shown (signed(1.5)="${signed(1.5)}" vs signed2(1.5)="${signed2(1.5)}"; signed(-3.21)="${signed(-3.21)}" vs signed2(-3.21)="${signed2(-3.21)}")`,
  signed(1.5) === "+1.5" && signed2(1.5) === "+1.50" && signed(1.5) !== signed2(1.5) &&
  signed(-3.21) === "-3.21" && signed2(-3.21) === "-3.21" && signed2(2) === "+2.00");

// --- Must-not-unify, behavioural, against the tempting `"+" + fmt2(v)` rewrite: on a negative it ---
// --- glues a `+` onto the number's own sign. Measured through the shipped fmt2, not asserted in prose. ---
const plusFmt2 = (v) => "+" + fmt2(v);
const disagrees = [-1, -3.21, -0.001].filter((v) => plusFmt2(v) !== signed2(v));
ok(`"+" + fmt2(v) is NOT this door — it signs a negative twice (${disagrees.map((v) => `${v} → plus-fmt2 "${plusFmt2(v)}" vs door "${signed2(v)}"`).join("; ")}), and the rewrite reads 0 under the padded scan too`,
  disagrees.length === 3 && plusFmt2(-1) === "+-1.00" && signed2(-1) === "-1.00");

// --- Must-not-unify, structural, against the boolean sibling: DynamicWorld's `+` is chosen by a ---
// --- boolean computed elsewhere over a raw delta, so it is neither swept up nor quietly excused. ---
const boolFile = src[BOOLEAN_SITE];
const boolSites = count(boolFile, BOOLEAN_SIGN);
const boolPadded = count(boolFile, PADDED_SIGN);
const boolNumeric = count(boolFile, NUMERIC_SIGN);
ok(`the DynamicWorld delta reads ${boolSites} boolean sign site(s), 0 under both this door's scans (padded ${boolPadded}, numeric ${boolNumeric}), so it is charged to its own lane, not here`,
  boolSites === 1 && boolPadded === 0 && boolNumeric === 0);

// --- Behavioural: the shipped door reproduces the inline formula byte-for-byte on the values the two ---
// --- cells actually pass, including the two edges a rewrite would break (-0 pads to "+0.00", a tiny ---
// --- negative keeps its own minus and toFixed's rounding: "-0.00"). ---
const VALUES = [0, -0, 1, -1, 1.5, -3.21, 2, 15, -8, 0.75, 100, -0.001, 2.675, 123456.789];
const inlineOf = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}`;
const agrees = VALUES.filter((v) => signed2(v) !== inlineOf(v));
ok(`signed2(v) equals the inline \`\${v >= 0 ? "+" : ""}\${v.toFixed(2)}\` byte-for-byte on every value the cells pass (${VALUES.length - agrees.length}/${VALUES.length}, incl 0→"${signed2(0)}", -0→"${signed2(-0)}", -0.001→"${signed2(-0.001)}", 2.675→"${signed2(2.675)}"; returned type ${typeof signed2(1)})`,
  agrees.length === 0 && VALUES.length >= 12 && typeof signed2(1) === "string" &&
  signed2(0) === "+0.00" && signed2(-0) === "+0.00" && signed2(-0.001) === "-0.00");

// --- Reachability: the folded cell is a live render branch, not a name a comment or an import could ---
// --- satisfy. The null guard and the door call sit in ONE expression, so a fold that only adds the ---
// --- import, or one that drops the em-dash fallback, reddens this clause. ---
const RENDER_CELL = /== null \? "—" : signed2\(/g;
const pGuardedCell = count('{trend == null ? "—" : signed2(trend)}', RENDER_CELL);
const pUnguardedCall = count('{signed2(trend)}', RENDER_CELL);
const pImportOnly = count('import { cn, signed2 } from "@/lib/utils";', RENDER_CELL);
const filmRoomCell = count(src["features/film/FilmRoom.tsx"], RENDER_CELL);
ok(`the Film Room tile renders signed2 inside its own null guard (${filmRoomCell} live site; planted guarded cell ${pGuardedCell}, planted unguarded call ${pUnguardedCall}, planted import-only fold ${pImportOnly})`,
  filmRoomCell === 1 && pGuardedCell === 1 && pUnguardedCall === 0 && pImportOnly === 0);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
