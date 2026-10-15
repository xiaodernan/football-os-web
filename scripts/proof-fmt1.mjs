// Proof for the shared one-decimal display-string door (`fmt1`, declared once in lib/utils.ts as a
// caller's number rendered `.toFixed(1)`). M372 folded all nineteen clean inline spellings across
// eleven files — per-minute rates, analysed minutes, ratings, value indices, one-decimal byte/K·B
// figures and the two SVG path coordinates in primitives — onto the door, so one display convention
// is one edit instead of eleven files' worth. The census below lexes every carrier file to CODE state
// (comments, string bodies and template text are not code) and charges a plain `.toFixed(1)` wherever
// one survives outside the door's own body.
//
// Two residue families remain inline on purpose, each pinned by count and by file, each with a
// planted snippet that arms its classifier so a broken classifier cannot read zero everywhere and
// pass: the seed's two `parseFloat((…).toFixed(1))` seeds round straight back to a number — a
// rounding step, not a display — and the one conditional-decimal line in the value formatter picks
// 0 or 1 at runtime (`.toFixed(v >= 10_000_000 ? 0 : 1)`) and so is not a `.toFixed(1)` site at all.
// A third family is a blind spot rather than a residue: the fmt0 decimal (community credibility, gap
// tier, the K line) stays hand-spelled until its own door exists, and the fmt0 census below measures
// exactly those three so a mis-keyed door cannot quietly absorb them. scripts/ is not walked, so the
// plants arm the scans instead of entering the census.
// Run: node scripts/proof-fmt1.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Owned cacheDir + noDiscovery: the shared dep-optimizer a concurrent build churns must not gate this
// proof (same device as proof-fmt2).
const server = await createServer({
  cacheDir: join(tmpdir(), `proof-fmt1-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { fmt1 } = await server.ssrLoadModule("/lib/utils.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "lib/utils.ts";
// Every file that reads the door after M372's fold: all eleven, none left out of the census.
const CONSUMERS = [
  "data/footballService.ts", "domain/compare.ts", "domain/history.ts", "domain/review.ts",
  "features/film/FilmRoom.tsx", "features/football/Details.tsx", "features/player/PlayerOS.tsx",
  "features/scouting/ScoutingPanel.tsx", "features/settings/SettingsPage.tsx",
  "features/watchlist/WatchlistBoard.tsx", "ui/primitives.tsx",
];
// Exact per-file call pins — a call that moves files, not just a total that drifts, reddens below.
const CALL_PINS = {
  "data/footballService.ts": 1, "domain/compare.ts": 1, "domain/history.ts": 2, "domain/review.ts": 3,
  "features/film/FilmRoom.tsx": 1, "features/football/Details.tsx": 1, "features/player/PlayerOS.tsx": 1,
  "features/scouting/ScoutingPanel.tsx": 5, "features/settings/SettingsPage.tsx": 1,
  "features/watchlist/WatchlistBoard.tsx": 1, "ui/primitives.tsx": 2,
};
// The pinned families' homes: seed's parseFloat wraps, service's conditional decimal, and the three
// fmt0 blind-spot sites.
const PARSE_FLOAT_FILE = "data/footballSeed.ts";
const CONDITIONAL_FILE = "data/footballService.ts";
const FMT0_FILES = ["data/footballService.ts", "domain/community.ts", "domain/gap.ts"];

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "ui", "src", "store", "i18n"]
  .filter((d) => { try { readdirSync(d); return true; } catch { return false; } })
  .flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const count = (text, re) => (text.match(re) || []).length;

const isIdent = (ch) => /[A-Za-z0-9_$]/.test(ch);

// CODE-state occurrence finder (the proof-fmt2 lexer): line/block comments, string bodies and
// template text are not code; a template's ${...} interior IS code, and a `${` pushes an expr frame
// so its `}` pops exactly that frame — the off-by-one a naive stack makes desynchronises every later
// file. Parameterised on the literal so the fmt0 blind-spot census can reuse it.
function findOccurrences(text, lit) {
  const occs = [];
  let i = 0;
  const n = text.length;
  let mode = "code";
  const frames = [];
  while (i < n) {
    const c = text[i];
    if (mode === "code") {
      if (c === "/" && text[i + 1] === "/") { mode = "linec"; i += 2; continue; }
      if (c === "/" && text[i + 1] === "*") { mode = "blockc"; i += 2; continue; }
      if (c === "'") { mode = "sstr"; i++; continue; }
      if (c === '"') { mode = "dstr"; i++; continue; }
      if (c === "`") { frames.push({ kind: "template", start: i, depth: 0 }); mode = "tstr"; i++; continue; }
      if (c === "{" && frames.length && frames[frames.length - 1].kind === "expr") { frames[frames.length - 1].depth++; i++; continue; }
      if (c === "}" && frames.length) {
        const top = frames[frames.length - 1];
        if (top.kind === "expr" && top.depth === 0) { frames.pop(); mode = "tstr"; i++; continue; }
        if (top.kind === "expr") { top.depth--; i++; continue; }
        i++; continue;
      }
      if (text.startsWith(lit, i)) {
        const d = i;
        occs.push({ d, optionalBefore: d > 0 && text[d - 1] === "?" });
        i += lit.length;
        continue;
      }
      i++;
      continue;
    }
    if (mode === "linec") { if (c === "\n") mode = "code"; i++; continue; }
    if (mode === "blockc") { if (c === "*" && text[i + 1] === "/") { mode = "code"; i += 2; } else i++; continue; }
    if (mode === "sstr" || mode === "dstr") {
      const q = mode === "sstr" ? "'" : '"';
      if (c === "\\") { i += 2; continue; }
      if (c === q || c === "\n") { mode = "code"; i++; continue; }
      i++; continue;
    }
    if (mode === "tstr") {
      if (c === "\\") { i += 2; continue; }
      if (c === "`") { frames.pop(); mode = "code"; i++; continue; }
      if (c === "$" && text[i + 1] === "{") { frames.push({ kind: "expr", depth: 0 }); mode = "code"; i += 2; continue; }
      i++; continue;
    }
  }
  return occs;
}

// Backward capture of the receiver feeding `RECEIVER.toFixed(1)` — groups, non-null `x!` suffixes and
// in-group strings are walked; a prefix `!` or a ternary `?` stops the capture (then: unparsed).
function captureReceiver(text, d) {
  let i = d - 1;
  if (i < 0 || text[i] === "?") return null;
  let paren = 0, brk = 0;
  while (i >= 0) {
    const c = text[i];
    if (paren > 0 || brk > 0) {
      if (c === ")") paren++;
      else if (c === "(") paren--;
      else if (c === "]") brk++;
      else if (c === "[") brk--;
      else if (c === "'" || c === '"' || c === "`") {
        const q = c;
        let j = i - 1;
        while (j >= 0) {
          if (text[j] === "\\") { j -= 2; continue; }
          if (text[j] === q) break;
          if (q !== "`" && text[j] === "\n") break;
          j--;
        }
        i = j - 1;
        continue;
      }
      i--;
      continue;
    }
    if (c === ")") { paren++; i--; continue; }
    if (c === "]") { brk++; i--; continue; }
    if (isIdent(c)) { i--; continue; }
    if (c === ".") { i--; continue; }
    if (c === "!") {
      if (i > 0 && (isIdent(text[i - 1]) || text[i - 1] === ".")) { i--; continue; }
      break;
    }
    if (c === "?") {
      const nx = text[i + 1];
      if (nx === "." || nx === "?") { i--; continue; }
      break;
    }
    break;
  }
  const start = i + 1;
  if (start >= d) return null;
  return { start, receiver: text.slice(start, d) };
}

// Classify code-state occurrences into the door-eligible plain lane or a pinned family.
const census = (text, lit) => {
  const out = { plain: 0, optional: 0, parseFloat: 0, unparsed: 0 };
  for (const o of findOccurrences(text, lit)) {
    if (o.optionalBefore) { out.optional++; continue; }
    const cap = captureReceiver(text, o.d);
    if (!cap) { out.unparsed++; continue; }
    if (/parseFloat\s*\(\s*$/.test(text.slice(0, cap.start))) { out.parseFloat++; continue; }
    out.plain++;
  }
  return out;
};

const DECL_FMT1 = /\nexport const fmt1\s*=\s*\(v: number\): string =>/g;
const IMPORT_FMT1 = /import[^;]*\bfmt1\b[^;]*from ["']@\/lib\/utils["']/g;
const CALL_FMT1 = /\bfmt1\(/g; // invocations only: the door's `fmt1 = (` and a doc mention are not calls in code files
// The conditional-decimal line: picks 0 or 1 at runtime, so it is not a `.toFixed(1)` site at all.
const CONDITIONAL = /\.toFixed\(v >= 10_000_000 \? 0 : 1\)/g;

// --- Plants: arm every scan so a "once"/"zero"/"only" verdict is measured, never an empty set. ----
const pDecl = count(`\nexport const fmt1 = (v: number): string => x;`, DECL_FMT1);
const pImport = count(`import { cn, fmt1 } from "@/lib/utils";`, IMPORT_FMT1);
const pCall = count(`const s = fmt1(row.rating);`, CALL_FMT1);
const pConditional = count(`\`€\${(v / 1e6).toFixed(v >= 10_000_000 ? 0 : 1)}M\`;`, CONDITIONAL);
const pPlain = census(`const s = (rating).toFixed(1);`, ".toFixed(1)").plain;
const pPlainTemplate = census("const s = `${rating.toFixed(1)}`;", ".toFixed(1)").plain;
const pPlainComment = census("// shown as rating.toFixed(1) here", ".toFixed(1)").plain;
const pPlainString = census(`const hint = "rating.toFixed(1)";`, ".toFixed(1)").plain;
const pPlainTemplateText = census("const s = `rating.toFixed(1)`;", ".toFixed(1)").plain;
const pOptional = census(`const r = row.rating?.toFixed(1) ?? "-";`, ".toFixed(1)").optional;
const pParseFloat = census(`const x = parseFloat((a * b).toFixed(1));`, ".toFixed(1)").parseFloat;
const pFmt0 = census(`cred: (n.credibility * 100).toFixed(0);`, ".toFixed(0)").plain;
ok(`the fmt1 scans are armed (decl ${pDecl}, import ${pImport}, call ${pCall}, conditional ${pConditional}, plain code ${pPlain}, plain in template expr ${pPlainTemplate}) and each classifier is measured by its own plant (comment ${pPlainComment}, string ${pPlainString}, template text ${pPlainTemplateText}, optional ${pOptional}, parseFloat ${pParseFloat}, fmt0 ${pFmt0})`,
  pDecl === 1 && pImport === 1 && pCall === 1 && pConditional === 1 && pPlain === 1 && pPlainTemplate === 1 &&
  pPlainComment === 0 && pPlainString === 0 && pPlainTemplateText === 0 &&
  pOptional === 1 && pParseFloat === 1 && pFmt0 === 1);

// --- Population floor + subject presence (a blind walk would read an empty tree and pass a negative claim). ---
const subjects = CONSUMERS.concat([HOME], [PARSE_FLOAT_FILE, CONDITIONAL_FILE], FMT0_FILES);
const present = subjects.every((p) => Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and every subject is inside it (${carriers.length} .ts/.tsx, floor 90)`,
  carriers.length >= 90 && present);

// --- Structural: the fmt1 door is declared exactly once, and only in its home. --------------------
const declByFile = carriers.filter((f) => count(src[f], DECL_FMT1) > 0);
ok(`fmt1 is declared exactly once, in the lib/utils door (home ${count(src[HOME], DECL_FMT1)}, tree ${declByFile.join(",")})`,
  count(src[HOME], DECL_FMT1) === 1 && declByFile.length === 1 && declByFile[0] === HOME);

// --- Reach guard: the door body IS the toFixed call and it is the sole code-state plain site. -----
const homeCensus = census(src[HOME], ".toFixed(1)");
const doorBody = (src[HOME].match(/export const fmt1 = [^\n]*/) || [""])[0];
ok(`the door body IS the toFixed call and it is the sole code-state plain site in lib/utils (home plain ${homeCensus.plain}, body "${doorBody.trim()}")`,
  homeCensus.plain === 1 && doorBody.trim() === "export const fmt1 = (v: number): string => v.toFixed(1);");

// --- All eleven consumers read the door, at exactly their pinned call counts. --------------------
const importing = CONSUMERS.filter((f) => count(src[f], IMPORT_FMT1) >= 1);
const actualCalls = Object.fromEntries(CONSUMERS.map((f) => [f, count(src[f], CALL_FMT1)]));
const totalCalls = Object.values(actualCalls).reduce((s, n) => s + n, 0);
const pinsHold = CONSUMERS.every((f) => actualCalls[f] === CALL_PINS[f]);
ok(`all eleven consumers read the door at their exact pinned counts (imports ${importing.length}/11, calls ${Object.entries(actualCalls).map(([f, n]) => `${f.split("/").pop()}=${n}`).join(", ")}, total ${totalCalls}, pinned 19)`,
  importing.length === CONSUMERS.length && pinsHold && totalCalls === 19);

// --- Convergence completeness: across the whole tree, a code-state plain .toFixed(1) survives only ---
// --- in the door's own body — no residue of the hand-spelled display form remains anywhere. --------
const plainByFile = carriers.filter((f) => census(src[f], ".toFixed(1)").plain > 0);
const strayPlain = plainByFile.filter((f) => f !== HOME);
const treeUnparsed = carriers.reduce((s, f) => s + census(src[f], ".toFixed(1)").unparsed, 0);
ok(`every code-state plain .toFixed(1) survives only in the door body — no residue remains (files with plain ${plainByFile.join(",")}; strays ${strayPlain.length}, measured and not excused; unparsed ${treeUnparsed})`,
  plainByFile.length === 1 && plainByFile[0] === HOME && strayPlain.length === 0 && treeUnparsed === 0);

// --- The pinned residue families: parseFloat wraps live only in the seed, exactly two. ------------
const pfCarriers = carriers.filter((f) => census(src[f], ".toFixed(1)").parseFloat > 0);
const pfTotal = carriers.reduce((s, f) => s + census(src[f], ".toFixed(1)").parseFloat, 0);
ok(`the seed's parseFloat wraps are the only parseFloat residue, exactly two (files ${pfCarriers.join(",")}; total ${pfTotal})`,
  pfTotal === 2 && pfCarriers.length === 1 && pfCarriers[0] === PARSE_FLOAT_FILE
  && census(src[PARSE_FLOAT_FILE], ".toFixed(1)").optional === 0);

// --- The conditional-decimal line: not a `.toFixed(1)` site, pinned where it lives. ---------------
const condByFile = carriers.filter((f) => count(src[f], CONDITIONAL) > 0);
const condTotal = carriers.reduce((s, f) => s + count(src[f], CONDITIONAL), 0);
ok(`the conditional-decimal formatter line survives unpooled, exactly once (files ${condByFile.join(",")}; total ${condTotal})`,
  condTotal === 1 && condByFile.length === 1 && condByFile[0] === CONDITIONAL_FILE);

// --- Blind spot: the fmt0 decimal stays hand-spelled — three sites, three files, unabsorbed. ------
const fmt0ByFile = FMT0_FILES.map((f) => [f.split("/").pop(), census(src[f], ".toFixed(0)").plain]);
const fmt0Total = fmt0ByFile.reduce((s, [, n]) => s + n, 0);
ok(`the fmt0 decimal stays hand-spelled until its own door (blind spot a mis-keyed fold would swallow: ${fmt0ByFile.map(([f, n]) => `${f}=${n}`).join(", ")}, total ${fmt0Total})`,
  fmt0Total === 3 && fmt0ByFile.every(([, n]) => n === 1) && pFmt0 === 1);

// --- Behavioural: fmt1 reproduces the removed inline call byte-for-byte and keeps the pad. --------
const samples = [0, 0.04, 0.05, 1, 2.04, 2.5, -3.45, 9.99, 99.995, 1234.567, 1e6 / 3, -0.05];
ok(`fmt1(v) equals the inline v.toFixed(1) byte-for-byte across samples and returns the padded string (fmt1(1) = "${fmt1(1)}", fmt1(2.04) = "${fmt1(2.04)}")`,
  samples.every((v) => fmt1(v) === v.toFixed(1)) && typeof fmt1(1) === "string" && fmt1(1) === "1.0");

// --- Must-not-unify: fmt1 is NOT round1 (type AND pad) and NOT fmt0 (decimal is the point). -------
ok(`fmt1 is NOT round1 in type or pad — the string keeps a trailing zero String(round1) drops — and NOT fmt0 (fmt1(2.04) = "${fmt1(2.04)}" vs String(Math.round(2.04 * 10) / 10) = "${String(Math.round(2.04 * 10) / 10)}"; (2.04).toFixed(0) = "${(2.04).toFixed(0)}")`,
  fmt1(2.04) === "2.0" && Math.round(2.04 * 10) / 10 === 2 && String(Math.round(2.04 * 10) / 10) === "2" && (2.04).toFixed(0) === "2");
// The unary-plus sites in ScoutingPanel kept `+x.toFixed(1)`; the fold's `+fmt1(x)` is that expression.
ok(`the unary-plus bridge is byte-for-byte the inline form the fold replaced (+fmt1(v) = +v.toFixed(1) on ${samples.filter((v) => +fmt1(v) === +v.toFixed(1)).length}/${samples.length} samples, measured)`,
  samples.every((v) => +fmt1(v) === +v.toFixed(1)));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
