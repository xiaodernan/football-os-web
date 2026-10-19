// Proof for the shared class-name door (`cn`, declared once in lib/utils.ts:4 as
// `return twMerge(clsx(inputs))`). 148 calls across 40 shipped files read the door — the widest-reach
// helper in the app — yet scripts/ never proved it was declared once, that its body is still the
// clsx+tailwind-merge pair, that no shipped file re-spells the joiner by hand, and that every caller
// imports it: the same census debt M371/M372/M385 paid for the rounding and index doors. Purely
// additive: edits NO shipped source and NO lib/utils door.
//
// Two admission traps make a naive `cn` census untrustworthy, and both are charged here:
//   · data/intelligence.ts declares `const cn: KgNode` THREE times — the same identifier as the door,
//     a knowledge-graph node variable. It has no `cn(` call and no lib/utils import, so it must read
//     zero on every door clause; a name-keyed census would call it a caller (or a second declaration).
//   · `.cn(` is a member call on some other object, not the door. The call scan rejects a leading dot
//     and plants both shapes, so the refusal is a measurement rather than an accident.
//
// Must-not-unify siblings, each charged zero by the hand-join scan:
//   · `className={cond ? "a" : "b"}` — a SELECTOR, not a merger: 59 of them, no list to join.
//   · the real `.join(" ")` sites in the tree are not class lists at all: the sparkline path `d` in
//     ui/primitives.tsx and the prose row lines in Details.tsx / PlayerOS.tsx.
// scripts/ and dev/ are not walked, so the plants arm the scans; a re-spelled joiner in ANY shipped
// file other than the door's own home reddens the convergence clause.
// Run: node scripts/proof-cn.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Vite SSR module-runner waits on the shared dep-optimizer a concurrent build/writer dev-server churn
// (.vite/deps lock stalls ssrLoadModule at the 60s timeout). Defenses: an owned per-PID cacheDir OUTSIDE
// the repo plus noDiscovery/empty include so Node resolves clsx/tailwind-merge externally and the witness
// arms' children never collide.
const server = await createServer({
  cacheDir: join(tmpdir(), `proof-cn-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { cn } = await server.ssrLoadModule("/lib/utils.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "lib/utils.ts";

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "ui", "i18n"]
  .filter((d) => { try { readdirSync(d); return true; } catch { return false; } })
  .flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const count = (text, re) => (text.match(re) || []).length;

const DECL_CN = /\bexport function cn\(/g;
const IMPORT_CN = /import[^;]*\{[^}]*\bcn\b[^}]*\} from ["']@\/lib\/utils["']/g;
// A member call `.cn(` is a different object's method; the door is the bare identifier. The negative
// lookbehind is what keeps `foo.cn(` out of the caller census.
const CALL_CN = /(?<!\.)\bcn\(/g;
const MEMBER_CN = /\.cn\(/g;
// The joiner re-spelled by hand, in the three shapes a refactor would actually reach for. Each branch
// is anchored so it cannot swallow the door's own call: `className={` alone would charge every
// `className={cn(…)}` in the app, so the template branch requires the backtick.
const HAND_JOIN = new RegExp([
  String.raw`\.filter\(\s*Boolean\s*\)\s*\.join\(\s*" "\s*\)`,
  String.raw`className=\{\s*\x60`,
  String.raw`className=\{[^}\n]*\+\s*" "`,
].join("|"), "g");
// The library half of the door: a file that calls clsx or twMerge directly bypasses cn and its conflict
// resolution, which is the drift the door retires.
const RAW_LIB = /(?:\bclsx\()|(?:\btwMerge\()/g;
const KG_DECL = /\bconst cn: KgNode\b/g;            // data/intelligence.ts's shadow, by its own shape
const TERNARY_CLASS = /className=\{[^}\n]*\?[^}\n]*:[^}\n]*\}/g;

// The door's own return line, pinned literally AND by shape. Both halves are planted: the literal
// refuses a renamed parameter, the shape scan accepts a rename but refuses a hand-rolled join. Being one
// `)` short of the real nesting is exactly how M385's body guard sat red on a green tree.
const BODY_EXACT = /return twMerge\(clsx\(inputs\)\);/;
const BODY_SHAPE = /return twMerge\(clsx\([A-Za-z_$][\w$]*\)\);/;
const doorReturn = (src[HOME].match(/return twMerge\([^\n]*/) || [""])[0];

// --- Plants: arm every scan so a "once"/"only"/"survives" verdict is a measurement, never an empty set. ---
const pDecl = count(`\nexport function cn(...inputs: ClassValue[]): string { return twMerge(clsx(inputs)); }\n`, DECL_CN);
const pImport = count(`import { cn, fmt2 } from "@/lib/utils";`, IMPORT_CN);
const pImportMulti = count(`import {\n  cn,\n  pct,\n} from "@/lib/utils";`, IMPORT_CN);
const pCall = count(`const c = cn("a", cond && "b");`, CALL_CN);
const pCallRefused = count(`const c = foo.cn("a");`, CALL_CN);
const pMember = count(`const c = foo.cn("a");`, MEMBER_CN);
const pHfilter = count('const c = ["a", b].filter(Boolean).join(" ");', HAND_JOIN);
const pHtmpl = count('<div className={`${a} ${b}`}/>', HAND_JOIN);
const pHconc = count('<div className={a + " " + b}/>', HAND_JOIN);
const pDoorCall = count('<div className={cn("a", b)}/>', HAND_JOIN); // the door's own call must read 0
const pRawLib = count(`import { clsx } from "clsx";\nconst c = clsx(["a"]);`, RAW_LIB);
const pBodyShip = BODY_EXACT.test(doorReturn) && count(doorReturn, BODY_SHAPE) === 1;
const pBodyRenamed = BODY_EXACT.test(`return twMerge(clsx(classes));`) === false && count(`return twMerge(clsx(classes));`, BODY_SHAPE) === 1;
const pBodyHandRolled = BODY_EXACT.test(`return classes.join(" ");`) === false && count(`return classes.join(" ");`, BODY_SHAPE) === 0;
ok(`the cn scans are armed (decl ${pDecl}, import ${pImport}, multi-line import ${pImportMulti}, call ${pCall}, member call refused by CALL_CN ${pCallRefused}, member ${pMember}, hand-join filter ${pHfilter} template ${pHtmpl} concat ${pHconc}, the door's own className={cn(…)} reads ${pDoorCall}, raw-lib ${pRawLib}) and the body guard reads ship/rename/hand-rolled as ${pBodyShip}/${pBodyRenamed}/${pBodyHandRolled}`,
  pDecl === 1 && pImport === 1 && pImportMulti === 1 && pCall === 1 && pCallRefused === 0 && pMember === 1 &&
  pHfilter === 1 && pHtmpl === 1 && pHconc === 1 && pDoorCall === 0 && pRawLib === 1 &&
  pBodyShip && pBodyRenamed && pBodyHandRolled);

// --- Population floor + subject presence (a blind walk would read an empty tree and pass a negative claim). ---
const present = [HOME, "components/ui/button.tsx", "components/ui/card.tsx", "data/intelligence.ts"].every((p) =>
  Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and the cn consumers are inside it (${carriers.length} .ts/.tsx, floor 80)`,
  carriers.length >= 80 && present);

// --- Structural: the cn door is declared exactly once, and only in its home. ---
const declByFile = carriers.filter((f) => count(src[f], DECL_CN) > 0);
ok(`cn is declared exactly once, in the lib/utils door (home ${count(src[HOME], DECL_CN)}, tree ${declByFile.join(",")})`,
  count(src[HOME], DECL_CN) === 1 && declByFile.length === 1 && declByFile[0] === HOME);

// --- Body guard: the door's return line IS the clsx-over-tailwind-merge pair it was extracted for. ---
ok(`the door body IS twMerge(clsx(inputs)) (body "${doorReturn.trim()}")`,
  BODY_EXACT.test(doorReturn.trim()) && count(doorReturn, BODY_SHAPE) === 1);

// --- Convergence: OUTSIDE the door's home no shipped file re-spells the joiner by hand and none reaches
// --- for clsx/twMerge directly (HOME is excluded because it IS the door; it spells the pair by design). ---
const strayFiles = carriers.filter((f) => f !== HOME && count(src[f], HAND_JOIN) > 0);
const rawLibFiles = carriers.filter((f) => f !== HOME && count(src[f], RAW_LIB) > 0);
const homeRaw = count(src[HOME], RAW_LIB);
const plantStray = count('<div className={`${a} ${b}`}/>', HAND_JOIN);
ok(`no shipped file bypasses the door (hand-join strays ${strayFiles.length ? strayFiles.join(",") : "0 sites"}; files calling clsx/twMerge outside HOME ${rawLibFiles.length ? rawLibFiles.join(",") : "none"}; HOME spells the pair ${homeRaw} times; a planted stray would read ${plantStray})`,
  plantStray === 1 && strayFiles.length === 0 && rawLibFiles.length === 0 && homeRaw >= 2);

// --- Derived consumer census: every shipped file that CALLS cn IMPORTS it. HOME's declaration line
// --- spells `cn(` as its own header, so the door is excluded rather than charged as its own caller. ---
const callers = carriers.filter((f) => f !== HOME && count(src[f], CALL_CN) >= 1);
const orphanCallers = callers.filter((f) => count(src[f], IMPORT_CN) === 0);
const totalCalls = callers.reduce((s, f) => s + count(src[f], CALL_CN), 0);
ok(`every external caller of cn imports it and the door has the widest reach in the app (${callers.length} files, floor 30; orphans ${orphanCallers.length ? orphanCallers.join(",") : 0}; total external calls ${totalCalls}, floor 120)`,
  callers.length >= 30 && orphanCallers.length === 0 && totalCalls >= 120);

// --- Admission: the same identifier is used elsewhere for something else, and the census keys on the
// --- door's shape, not the name. data/intelligence.ts declares `const cn: KgNode` three times — a
// --- graph node, no call, no import — so it must read zero on every caller clause. ---
const kgFile = "data/intelligence.ts";
const kgSites = count(src[kgFile], KG_DECL);
const kgReads = { call: count(src[kgFile], CALL_CN), import: count(src[kgFile], IMPORT_CN), decl: count(src[kgFile], DECL_CN) };
const kgPlant = count(`const cn: KgNode = { id: "club:c1" }; add(cn); edges.push({ to: cn.id });`, KG_DECL);
ok(`the KgNode shadow named cn is charged as zero callers (declared ${kgSites} times in ${kgFile}, reads call ${kgReads.call} / import ${kgReads.import} / decl ${kgReads.decl}; a planted shadow reads ${kgPlant})`,
  kgPlant === 1 && kgSites >= 2 && kgReads.call === 0 && kgReads.import === 0 && kgReads.decl === 0);

// --- Must-not-unify in the tree: the conditional-className selectors and the prose/sparkline joins are
// --- different contracts the hand-join scan leaves uncharged (folding them onto cn would be noise). ---
const ternarySites = carriers.reduce((s, f) => s + count(src[f], TERNARY_CLASS), 0);
const realJoinFiles = carriers.filter((f) => /\.join\(\s*" "\s*\)/.test(src[f]));
const realJoinCharged = realJoinFiles.map((f) => count(src[f], HAND_JOIN));
const sTernary = count('<div className={a ? "x" : "y"}/>', HAND_JOIN);
ok(`the conditional selectors and the prose/sparkline .join(" ") sites are real spellings the door leaves uncharged (className ternaries ${ternarySites}, floor 30, plant reads ${sTernary}; non-class join files ${realJoinFiles.map((f) => f.split("/").pop()).join(",")} charged ${realJoinCharged.join(",")})`,
  ternarySites >= 30 && sTernary === 0 && realJoinFiles.length >= 3 && realJoinCharged.every((c) => c === 0));

// --- Behavioural, the reason the door exists: tailwind-merge RESOLVES conflicting utilities, so the
// --- last one written wins in the output. A hand join keeps both and leaves it to CSS source order. ---
const merged = cn("px-2", "px-4");
const handJoined = ["px-2", "px-4"].join(" ");
ok(`cn resolves conflicting utilities the way a hand join cannot (cn("px-2","px-4")="${merged}" keeps 1 utility; a hand join="${handJoined}" keeps ${handJoined.split(" ").length} and lets CSS order decide)`,
  merged === "px-4" && !merged.includes("px-2") && handJoined === "px-2 px-4");

// --- Behavioural: clsx drops EVERY falsy operand and flattens arrays/objects, so `cn(a, cond && b)`
// --- never leaks a token into the class attribute. A hand join is not equivalent and not merely
// --- messier: `Array.prototype.join` stringifies `false` and `0` into real class tokens ("false", "0")
// --- while it renders `undefined`/`null` as EMPTY slots, so the same operand list produces a different
// --- token multiset depending on which falsy value happened to appear. That asymmetry is the contract.
const falsyOut = cn("card", false, undefined, null, 0, "");
const falsyHand = ["card", false, undefined, null, 0, ""].join(" ");
const handTokens = falsyHand.split(" ").filter(Boolean);
const nestedOut = cn(["a", ["b"]], { c: true });
ok(`cn drops every falsy operand and flattens arrays/objects, while a hand join leaks only some of them (cn("card",false,undefined,null,0,"")="${falsyOut}" tokens ${falsyOut.split(" ").filter(Boolean).length}; hand join="${falsyHand}" tokens [${handTokens.join(",")}] — keeps false and zero as class names, blanks undefined/null; cn(["a",["b"],{c:true}])="${nestedOut}")`,
  falsyOut === "card" && handTokens.join(",") === "card,false,0" &&
  /\ba\b/.test(nestedOut) && /\bb\b/.test(nestedOut) && /\bc\b/.test(nestedOut));

// --- Companion to the clause above: it pins a token COUNT, so this measures the fixture it is ---
// --- counted against. Five falsy spellings in, exactly the two that join stringifies survive, and ---
// --- cn's own answer is one token — an empty cn output would drop that to zero and fail here, so ---
// --- the reading above is not a count taken over a population that could quietly go empty. ---
ok(`the fixture carries all five falsy spellings the contract names, and the two readings differ by exactly the two a hand join leaks (hand join ${handTokens.length} tokens, cn ${falsyOut.split(" ").filter(Boolean).length}; undefined and null blank out, false and zero do not)`,
  [false, undefined, null, 0, ""].length === 5 &&
  handTokens.length === 3 && falsyOut.split(" ").filter(Boolean).length === 1);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
