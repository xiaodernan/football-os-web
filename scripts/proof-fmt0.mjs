// Proof for the shared integer display-string door (`fmt0`, declared once in lib/utils.ts as a
// caller's number rendered `.toFixed(0)`). M373 folded all three clean inline spellings — the value
// formatter's K line, community credibility, gap evidence tier — onto the door. The census below
// lexes every carrier file to CODE state (comments, string bodies and template text are not code;
// career's advisor file mentions the shape twice in prose while deliberately quoting Math.round) and
// charges a plain `.toFixed(0)` wherever one survives outside the door's own body.
//
// Two things stay inline on purpose, pinned by count and by file, each with a planted snippet that
// arms its classifier so a broken classifier cannot read zero everywhere and pass: the one
// conditional-decimal line in the value formatter picks 0 or 1 at runtime
// (`.toFixed(v >= 10_000_000 ? 0 : 1)`) and so is not a `.toFixed(0)` site at all — proof-fmt1 pins
// it too, from the other side of the decimal; and career's advisor quotes are Math.round's business
// — proof-career pins the negative half-step disagreement on its 41 witness states, so this door must
// never be swapped in there, and the career clause below measures that it was not. scripts/ is not
// walked, so the plants arm the scans instead of entering the census.
// Run: node scripts/proof-fmt0.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Owned cacheDir + noDiscovery: the shared dep-optimizer a concurrent build churns must not gate this
// proof (same device as proof-fmt1/proof-fmt2).
const server = await createServer({
  cacheDir: join(tmpdir(), `proof-fmt0-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { fmt0 } = await server.ssrLoadModule("/lib/utils.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "lib/utils.ts";
// The three files whose inline integers M373 folded onto the door, with exact per-file call pins.
const CONSUMERS = [
  "data/footballService.ts", "domain/community.ts", "domain/gap.ts",
];
const CALL_PINS = { "data/footballService.ts": 1, "domain/community.ts": 1, "domain/gap.ts": 1 };
// The pinned conditional-decimal line's home, and the advisor file that must stay Math.round's.
const CONDITIONAL_FILE = "data/footballService.ts";
const CAREER_FILE = "domain/career.ts";

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "ui", "src", "store", "i18n"]
  .filter((d) => { try { readdirSync(d); return true; } catch { return false; } })
  .flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const count = (text, re) => (text.match(re) || []).length;

const isIdent = (ch) => /[A-Za-z0-9_$]/.test(ch);

// CODE-state occurrence finder (the proof-fmt2/proof-fmt1 lexer): comments, string bodies and
// template text are not code; a template's ${...} IS code, and a `${` pushes an expr frame so its `}`
// pops exactly that frame — the off-by-one a naive stack makes desynchronises every later file.
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

// Backward capture of the receiver feeding `RECEIVER.toFixed(0)` — groups, non-null `x!` suffixes and
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

const DECL_FMT0 = /\nexport const fmt0\s*=\s*\(v: number\): string =>/g;
const IMPORT_FMT0 = /import[^;]*\bfmt0\b[^;]*from ["']@\/lib\/utils["']/g;
const CALL_FMT0 = /\bfmt0\(/g; // invocations only: the door's `fmt0 = (` and a doc mention are not calls in code files
// The conditional-decimal line: picks 0 or 1 at runtime, so it is not a `.toFixed(0)` site at all.
const CONDITIONAL = /\.toFixed\(v >= 10_000_000 \? 0 : 1\)/g;

// --- Plants: arm every scan so a "once"/"zero"/"only" verdict is measured, never an empty set. ----
const pDecl = count(`\nexport const fmt0 = (v: number): string => x;`, DECL_FMT0);
const pImport = count(`import { cn, fmt0 } from "@/lib/utils";`, IMPORT_FMT0);
const pCall = count(`const s = fmt0(n.credibility * 100);`, CALL_FMT0);
const pConditional = count(`\`€\${(v / 1e6).toFixed(v >= 10_000_000 ? 0 : 1)}M\`;`, CONDITIONAL);
const pPlain = census(`cred: (n.credibility * 100).toFixed(0);`, ".toFixed(0)").plain;
const pPlainTemplate = census("const s = `${tier.toFixed(0)}`;", ".toFixed(0)").plain;
const pPlainComment = census("// shown as tier.toFixed(0) here", ".toFixed(0)").plain;
const pPlainString = census(`const hint = "tier.toFixed(0)";`, ".toFixed(0)").plain;
const pPlainTemplateText = census("const s = `tier.toFixed(0)`;", ".toFixed(0)").plain;
const pOptional = census(`const r = row.tier?.toFixed(0) ?? "-";`, ".toFixed(0)").optional;
const pParseFloat = census(`const x = parseFloat((a * b).toFixed(0));`, ".toFixed(0)").parseFloat;
ok(`the fmt0 scans are armed (decl ${pDecl}, import ${pImport}, call ${pCall}, conditional ${pConditional}, plain code ${pPlain}, plain in template expr ${pPlainTemplate}) and each classifier is measured by its own plant (comment ${pPlainComment}, string ${pPlainString}, template text ${pPlainTemplateText}, optional ${pOptional}, parseFloat ${pParseFloat})`,
  pDecl === 1 && pImport === 1 && pCall === 1 && pConditional === 1 && pPlain === 1 && pPlainTemplate === 1 &&
  pPlainComment === 0 && pPlainString === 0 && pPlainTemplateText === 0 &&
  pOptional === 1 && pParseFloat === 1);

// --- Population floor + subject presence (a blind walk would read an empty tree and pass a negative claim). ---
const present = CONSUMERS.concat([HOME], [CONDITIONAL_FILE, CAREER_FILE]).every((p) => Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and every subject is inside it (${carriers.length} .ts/.tsx, floor 90)`,
  carriers.length >= 90 && present);

// --- Structural: the fmt0 door is declared exactly once, and only in its home. --------------------
const declByFile = carriers.filter((f) => count(src[f], DECL_FMT0) > 0);
ok(`fmt0 is declared exactly once, in the lib/utils door (home ${count(src[HOME], DECL_FMT0)}, tree ${declByFile.join(",")})`,
  count(src[HOME], DECL_FMT0) === 1 && declByFile.length === 1 && declByFile[0] === HOME);

// --- Reach guard: the door body IS the toFixed call and it is the sole code-state plain site. -----
const homeCensus = census(src[HOME], ".toFixed(0)");
const doorBody = (src[HOME].match(/export const fmt0 = [^\n]*/) || [""])[0];
ok(`the door body IS the toFixed call and it is the sole code-state plain site in lib/utils (home plain ${homeCensus.plain}, body "${doorBody.trim()}")`,
  homeCensus.plain === 1 && doorBody.trim() === "export const fmt0 = (v: number): string => v.toFixed(0);");

// --- All three consumers read the door, at exactly their pinned call counts. ---------------------
const importing = CONSUMERS.filter((f) => count(src[f], IMPORT_FMT0) >= 1);
const actualCalls = Object.fromEntries(CONSUMERS.map((f) => [f, count(src[f], CALL_FMT0)]));
const totalCalls = Object.values(actualCalls).reduce((s, n) => s + n, 0);
const pinsHold = CONSUMERS.every((f) => actualCalls[f] === CALL_PINS[f]);
ok(`all three consumers read the door at their exact pinned counts (imports ${importing.length}/3, calls ${Object.entries(actualCalls).map(([f, n]) => `${f.split("/").pop()}=${n}`).join(", ")}, total ${totalCalls}, pinned 3)`,
  importing.length === CONSUMERS.length && pinsHold && totalCalls === 3);

// --- Convergence completeness: across the whole tree, a code-state plain .toFixed(0) survives only ---
// --- in the door's own body — no residue of the hand-spelled integer form remains anywhere. --------
const plainByFile = carriers.filter((f) => census(src[f], ".toFixed(0)").plain > 0);
const strayPlain = plainByFile.filter((f) => f !== HOME);
const treeUnparsed = carriers.reduce((s, f) => s + census(src[f], ".toFixed(0)").unparsed, 0);
ok(`every code-state plain .toFixed(0) survives only in the door body — no residue remains (files with plain ${plainByFile.join(",")}; strays ${strayPlain.length}, measured and not excused; unparsed ${treeUnparsed})`,
  plainByFile.length === 1 && plainByFile[0] === HOME && strayPlain.length === 0 && treeUnparsed === 0);

// --- The conditional-decimal line: not a `.toFixed(0)` site, pinned where it lives. ---------------
const condByFile = carriers.filter((f) => count(src[f], CONDITIONAL) > 0);
const condTotal = carriers.reduce((s, f) => s + count(src[f], CONDITIONAL), 0);
ok(`the conditional-decimal formatter line survives unpooled, exactly once (files ${condByFile.join(",")}; total ${condTotal})`,
  condTotal === 1 && condByFile.length === 1 && condByFile[0] === CONDITIONAL_FILE);

// --- Cross-lane: career's advisor quotes stayed Math.round's business — the fold stopped at its door. ---
const careerFmt0Plain = census(src[CAREER_FILE], ".toFixed(0)").plain;
ok(`career's advisor quotes remain Math.round's business — the fold stopped at its door (career plain ${careerFmt0Plain}, career fmt0 calls ${count(src[CAREER_FILE], CALL_FMT0)}, pinned by proof-career's 41 half-step states)`,
  careerFmt0Plain === 0 && count(src[CAREER_FILE], CALL_FMT0) === 0 && pPlain === 1);

// --- Behavioural: fmt0 reproduces the removed inline call byte-for-byte. -------------------------
const samples = [0, 1, 2.04, 2.5, -3.45, 50.5, 99.995, 1234.567, 1e6 / 3];
ok(`fmt0(v) equals the inline v.toFixed(0) byte-for-byte across samples (9 samples; fmt0(2.04) = "${fmt0(2.04)}", fmt0(50.5) = "${fmt0(50.5)}")`,
  samples.length === 9 && samples.every((v) => fmt0(v) === v.toFixed(0)) && typeof fmt0(1) === "string");

// --- Must-not-unify: fmt0 is NOT String(Math.round()) at the half-step and NOT fmt1's padded cell. -
ok(`fmt0 is NOT String(Math.round()) at a negative half-step — the away-from-zero toFixed keeps the sign Math.round drops toward +∞ — and NOT fmt1's pad (fmt0(-4.5) = "${fmt0(-4.5)}" vs String(Math.round(-4.5)) = "${String(Math.round(-4.5))}"; fmt0(2.04) = "${fmt0(2.04)}" vs "2.0")`,
  fmt0(-4.5) === "-5" && String(Math.round(-4.5)) === "-4" && Math.round(-4.5) === -4 && fmt0(2.04) === "2" && fmt0(2.04) !== "2.0");

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
