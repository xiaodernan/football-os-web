// Proof for the shared two-decimal display-string door (`fmt2`, declared once in lib/utils.ts as a
// caller's number rendered `.toFixed(2)`). M369 folded all seventy-seven clean inline spellings
// across twenty-two files — monospace cells, i18n vars, template segments and Fact values — onto
// the door, so one display convention is one edit instead of twenty-two files' worth. The census
// below lexes every carrier file to CODE state (comments, string bodies and template text are not
// code) and charges a plain `.toFixed(2)` wherever one survives outside the door's own body.
//
// Four residue families remain inline on purpose, each pinned by count and by file, each with a
// planted snippet that arms its classifier so a broken classifier cannot read zero everywhere and
// pass: `x?.toFixed(2)` optional cells keep their undefined short-circuit before a `?? "—"`
// fallback (five); a receiver behind `?.` short-circuits the whole call to undefined and
// fmt2(undefined) would throw (Data Room league average, one); the two `parseFloat((…).toFixed(2))`
// seeds round back to a number; and the padded sign family — a `+` glued in front of a fixed-width
// string. M393 gave that last family its own `signed2` door in lib/utils and folded the Film Room's
// scan-trend cell onto it; M399 folded the career form cell too, so the family is now the door's own
// body alone. proof-signed2 pins the literal form, so this proof re-measures it rather than trusting
// the sibling.
// scripts/ is not walked, so the plants arm the scans instead of entering the census.
// Run: node scripts/proof-fmt2.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// `fmt2` is pure, but loading it through Vite SSR routes through the module runner, which waits on the
// shared dep-optimizer a concurrent build churns; an owned cacheDir outside the repo plus noDiscovery
// keeps that wait off this proof.
const server = await createServer({
  cacheDir: join(tmpdir(), `proof-fmt2-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { fmt2, round2 } = await server.ssrLoadModule("/lib/utils.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "lib/utils.ts";
// Every file that reads the door after M369's fold: all twenty-two, none left out of the census.
const CONSUMERS = [
  "domain/career.ts", "domain/community.ts", "domain/filmInsights.ts", "domain/footprint.ts",
  "domain/load.ts", "domain/matchEngine.ts", "domain/review.ts", "domain/scouting.ts",
  "domain/worldEngine.ts", "data/ai.ts", "data/footballSeed.ts", "data/intelligence.ts",
  "features/analytics/DataRoom.tsx", "features/film/FilmRoom.tsx", "features/football/Details.tsx",
  "features/football/FootballWorld.tsx", "features/load/LoadPage.tsx", "features/manager/ManagerOS.tsx",
  "features/player/PlayerOS.tsx", "features/review/ReviewPage.tsx", "features/settings/SettingsPage.tsx",
  "features/sim/SimulationLab.tsx",
];
// The four declared residue families, pinned file-first: [file, optionalBefore, optionalReceiver, parseFloat, padded].
// FilmRoom left this table at M393 and career's padded cell left it at M399 — both folded onto the
// signed2 door. The padded clause below charges every padded site in the tree by file, so a carrier's
// absence from the table is measured, not assumed; and career is still present in CONSUMERS above, so
// removing its row here cannot hide the file from the census altogether.
const FAMILY_PINS = [
  ["data/ai.ts", 3, 0, 0, 0],
  ["features/dashboard/Dashboard.tsx", 1, 0, 0, 0],
  ["features/player/PlayerOS.tsx", 1, 0, 0, 0],
  ["features/analytics/DataRoom.tsx", 0, 1, 0, 0],
  ["data/footballSeed.ts", 0, 0, 2, 0],
];

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "ui", "src", "store", "i18n"]
  .filter((d) => { try { readdirSync(d); return true; } catch { return false; } })
  .flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const count = (text, re) => (text.match(re) || []).length;

const LIT = ".toFixed(2)";
const isIdent = (ch) => /[A-Za-z0-9_$]/.test(ch);

// CODE-state occurrence finder: line/block comments, string bodies and template text are not code;
// a template's ${...} interior is code (frames record which backtick opened which expression so the
// padded classifier can read the whole template back). A `${` pushes an expr frame so its `}` pops
// exactly that frame — the off-by-one that a naive stack makes desynchronises every later file.
function findOccurrences(text) {
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
      if (text.startsWith(LIT, i)) {
        const d = i;
        let tmplRoot = -1;
        for (let k = frames.length - 1; k >= 0; k--) {
          if (frames[k].kind === "template") { tmplRoot = frames[k].start; break; }
        }
        occs.push({ d, optionalBefore: d > 0 && text[d - 1] === "?", tmplRoot });
        i += LIT.length;
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

// Backward capture of the receiver feeding `RECEIVER.toFixed(2)`; groups, non-null `x!` suffixes and
// in-group strings are walked, a prefix `!` or a ternary `?` stops the capture.
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

// Classify every code-state occurrence into the door-eligible plain lane or one of the four families.
const census = (text) => {
  const out = { plain: 0, optionalBefore: 0, optionalReceiver: 0, parseFloat: 0, padded: 0, unparsed: 0 };
  for (const o of findOccurrences(text)) {
    if (o.optionalBefore) { out.optionalBefore++; continue; }
    const cap = captureReceiver(text, o.d);
    if (!cap) { out.unparsed++; continue; }
    if (cap.receiver.includes("?.")) { out.optionalReceiver++; continue; }
    if (/parseFloat\s*\(\s*$/.test(text.slice(0, cap.start))) { out.parseFloat++; continue; }
    if (o.tmplRoot >= 0 && /\? "\+" : ""/.test(text.slice(o.tmplRoot, o.d))) { out.padded++; continue; }
    out.plain++;
  }
  return out;
};

const DECL_FMT2 = /\nexport const fmt2\s*=\s*\(v: number\): string =>/g;
const IMPORT_FMT2 = /import[^;]*\bfmt2\b[^;]*from ["']@\/lib\/utils["']/g;
const CALL_FMT2 = /\bfmt2\(/g; // invocations only: the door's `fmt2 = (` and a doc's `fmt2(undefined)`-in-comment are not calls in code files
// proof-signed's literal: a sign ternary glued to a fixed-width toFixed inside the same interpolation.
const PADDED_SIGN = />= *0 *\? *"\+" *: *""\} *\$\{[^}]*\.toFixed\(2\)/;

// --- Plants: arm every scan so a "once"/"zero"/"only" verdict is measured, never an empty set. ---
const pDecl = count(`\nexport const fmt2 = (v: number): string => x;`, DECL_FMT2);
const pImport = count(`import { cn, fmt2 } from "@/lib/utils";`, IMPORT_FMT2);
const pCall = count(`const s = fmt2(ago.rating);`, CALL_FMT2);
const pPlain = census(`const s = (acwr).toFixed(2);`).plain;
const pPlainTemplate = census("const s = `${acwr.toFixed(2)}`;").plain;
const pPlainComment = census("// shown as acwr.toFixed(2) here").plain;
const pPlainString = census(`const hint = "acwr.toFixed(2)";`).plain;
const pPlainTemplateText = census("const s = `acwr.toFixed(2)`;").plain;
const pOptional = census(`const r = load.acwr?.toFixed(2) ?? "-";`).optionalBefore;
const pOptionalReceiver = census(`const r = metrics[0]?.leagueAvg.toFixed(2) ?? "";`).optionalReceiver;
const pParseFloat = census(`const x = parseFloat((a * b).toFixed(2));`).parseFloat;
const pPadded = census("const s = `${v >= 0 ? \"+\" : \"\"}${v.toFixed(2)}`;").padded;
ok(`the fmt2 scans are armed (decl ${pDecl}, import ${pImport}, call ${pCall}, plain code ${pPlain}, plain in template expr ${pPlainTemplate}) and each classifier is measured by its own plant (comment ${pPlainComment}, string ${pPlainString}, template text ${pPlainTemplateText}, optional-before ${pOptional}, optional-receiver ${pOptionalReceiver}, parseFloat ${pParseFloat}, padded ${pPadded})`,
  pDecl === 1 && pImport === 1 && pCall === 1 && pPlain === 1 && pPlainTemplate === 1 &&
  pPlainComment === 0 && pPlainString === 0 && pPlainTemplateText === 0 &&
  pOptional === 1 && pOptionalReceiver === 1 && pParseFloat === 1 && pPadded === 1);

// --- Population floor + subject presence (a blind walk would read an empty tree and pass a negative claim). ---
const present = CONSUMERS.concat([HOME], FAMILY_PINS.map(([p]) => p)).every((p) => Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and every subject is inside it (${carriers.length} .ts/.tsx, floor 90)`,
  carriers.length >= 90 && present);

// --- Structural: the fmt2 door is declared exactly once, and only in its home. ---
const declByFile = carriers.filter((f) => count(src[f], DECL_FMT2) > 0);
ok(`fmt2 is declared exactly once, in the lib/utils door (home ${count(src[HOME], DECL_FMT2)}, tree ${declByFile.join(",")})`,
  count(src[HOME], DECL_FMT2) === 1 && declByFile.length === 1 && declByFile[0] === HOME);

// --- Reach guard on the door: lib/utils holds exactly ONE code-state plain site — the body; the doc ---
// --- comment describes the shape in prose and never re-spells it as code, so the door is one site. ---
const homeCensus = census(src[HOME]);
const doorBody = (src[HOME].match(/export const fmt2 = [^\n]*/) || [""])[0];
ok(`the door body IS the toFixed call and it is the sole code-state plain site in lib/utils (home plain ${homeCensus.plain}, body "${doorBody.trim()}")`,
  homeCensus.plain === 1 && doorBody.trim() === "export const fmt2 = (v: number): string => v.toFixed(2);");

// --- All twenty-two consumers read the door. ---
const importing = CONSUMERS.filter((f) => count(src[f], IMPORT_FMT2) >= 1);
const perCall = CONSUMERS.map((f) => [f.split("/").pop(), count(src[f], CALL_FMT2)]);
const totalCalls = perCall.reduce((s, [, n]) => s + n, 0);
ok(`all twenty-two consumers read the door (imports ${importing.length}/22, per-file calls ${perCall.map(([, n]) => n).join(",")}, total calls ${totalCalls}, floor 70)`,
  importing.length === CONSUMERS.length && perCall.every(([, n]) => n >= 1) && totalCalls >= 70);

// --- Convergence completeness: across the whole tree, a code-state plain .toFixed(2) survives only ---
// --- in the door's own body — no residue of the hand-spelled display form remains anywhere. ---
const treeCensus = carriers.reduce((acc, f) => {
  const c = census(src[f]);
  for (const k of Object.keys(acc)) acc[k] += c[k];
  return acc;
}, { plain: 0, optionalBefore: 0, optionalReceiver: 0, parseFloat: 0, padded: 0, unparsed: 0 });
const plainByFile = carriers.filter((f) => census(src[f]).plain > 0);
const strayPlain = plainByFile.filter((f) => f !== HOME);
ok(`every code-state plain .toFixed(2) survives only in the door body — no residue remains (files with plain ${plainByFile.join(",")}; strays ${strayPlain.length}, measured and not excused; unparsed captures ${treeCensus.unparsed})`,
  plainByFile.length === 1 && plainByFile[0] === HOME && strayPlain.length === 0 && treeCensus.unparsed === 0);

// --- The four residue families: exact counts across the tree, and exactly the files pinned above. ---
// --- The padded total read 2 before M393 (career + FilmRoom cells) and 2 after it (door body + ---
// --- career) for DIFFERENT reasons, and 1 now that both folded — so the number alone cannot be the ---
// --- pin, and never was: the carriers are, and each carrier is separately required to import the door. ---
const paddedByFile = carriers.filter((f) => census(src[f]).padded > 0).sort();
ok(`the four declared families total the pinned 5+1+2+1 sites (optional-before ${treeCensus.optionalBefore}, optional-receiver ${treeCensus.optionalReceiver}, parseFloat ${treeCensus.parseFloat}, padded ${treeCensus.padded} in ${paddedByFile.join(",")})`,
  treeCensus.optionalBefore === 5 && treeCensus.optionalReceiver === 1 && treeCensus.parseFloat === 2 &&
  treeCensus.padded === 1 && paddedByFile.join(",") === "lib/utils.ts");
const familyExact = FAMILY_PINS.every(([f, ob, or, pf, pd]) => {
  const c = census(src[f]);
  return c.optionalBefore === ob && c.optionalReceiver === or && c.parseFloat === pf && c.padded === pd;
});
const familyNoPlain = FAMILY_PINS.every(([f]) => census(src[f]).plain === 0);
ok(`each residue lives in exactly its pinned file and nothing else in those files is plain (pinned ${FAMILY_PINS.map(([f]) => f.split("/").pop()).join(",")})`,
  familyExact && familyNoPlain);

// --- Behavioural: fmt2 reproduces the removed inline call byte-for-byte and keeps the fixed-width pad. ---
const samples = [0, 1, 2.5, 0.1, 9.99, 123.45, -3.21, 1.005, 2.675, 123456.789, 0.004999];
ok(`fmt2(v) equals the inline v.toFixed(2) byte-for-byte across samples and returns the fixed-width string (fmt2(1) = "${fmt2(1)}", fmt2(2.675) = "${fmt2(2.675)}")`,
  samples.every((v) => fmt2(v) === v.toFixed(2)) && typeof fmt2(1) === "string" && fmt2(1) === "1.00");

// --- Must-not-unify: fmt2 is NOT round2 in type OR rounding path — the string keeps a pad String(round2)
// --- drops, and the classic 2.675 lands differently ("2.67" off the binary value vs 2.68 off a
// --- multiplied Math.round), so a swap moves figures, not just types. ---
ok(`fmt2 is NOT round2 in type or in rounding path — the string keeps a pad String(round2) drops and the classic 2.675 disagrees (fmt2(2.5) = "${fmt2(2.5)}" vs String(round2(2.5)) = "${String(round2(2.5))}"; fmt2(2.675) = "${fmt2(2.675)}" vs round2(2.675) = ${round2(2.675)})`,
  fmt2(2.5) !== String(round2(2.5)) && fmt2(2.675) === "2.67" && round2(2.675) === 2.68);
// The unary-plus sites kept `+x.toFixed(2)`; the fold's `+fmt2(x)` is byte-for-byte that expression.
ok(`the unary-plus bridge is byte-for-byte the inline form the fold replaced (+fmt2(v) = +v.toFixed(2) on ${samples.filter((v) => +fmt2(v) === +v.toFixed(2)).length}/${samples.length} samples, measured)`,
  samples.every((v) => +fmt2(v) === +v.toFixed(2)));

// --- Proof-signed2 cross-guard: the padded-sign literal proof-signed2 pins now survives on the door's ---
// --- own body line ALONE, and has LEFT both carriers — measured here rather than trusted from the ---
// --- sibling. HOME is read by line because its docstring quotes the shape it replaced, which the raw ---
// --- literal scan cannot tell apart from code. Each former carrier is required to IMPORT the door, so ---
// --- a cell deleted rather than folded cannot satisfy this clause. ---
const signed2Line = (src[HOME].match(/export const signed2[^\n]*/) || [""])[0];
const paddedCarry = [["signed2 body", count(signed2Line, PADDED_SIGN)],
  ["domain/career.ts", count(src["domain/career.ts"], PADDED_SIGN)],
  ["features/film/FilmRoom.tsx", count(src["features/film/FilmRoom.tsx"], PADDED_SIGN)]];
const importsSigned2 = (f) => /import[^;]*\bsigned2\b[^;]*from ["']@\/lib\/utils["']/.test(src[f]);
const carrierImports = ["domain/career.ts", "features/film/FilmRoom.tsx"].filter(importsSigned2);
ok(`the padded sign literal lives only in the signed2 door now — both cells left it and both import the door (door body ${paddedCarry[0][1]}, career ${paddedCarry[1][1]}, FilmRoom ${paddedCarry[2][1]}, importers ${carrierImports.length}/2)`,
  paddedCarry[0][1] === 1 && paddedCarry[1][1] === 0 && paddedCarry[2][1] === 0 && carrierImports.length === 2);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
