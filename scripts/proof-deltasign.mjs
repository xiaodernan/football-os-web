// M426. The SIGN of a difference: which way does this number point, and who asks it.
//
// The defect, measured before it was fixed. The app asks one question of a difference in four
// places, and each copy answered in its own vocabulary: compare the figure with zero, and with
// zero the other way round, and call the result up, down or flat. The four copies were:
//
//   · domain/compare.ts, for an attribute edge — `delta > 0 ? "a" : delta < 0 ? "b" : "even"`;
//   · domain/compare.ts, for a category edge — the same ladder again, in the same file;
//   · features/football/Details.tsx, for a category difference's colour;
//   · features/review/ReviewPage.tsx, for the change in a player's overall.
//
// So a change to what counts as "no difference" — a zero that counts as a hair, a tolerance —
// would have moved one screen and left the other three reading the same figure differently. It
// is the sibling of M424's sign convention: that unit closed the door that prints a figure with
// its sign, and this one closes the door that says which way the figure points.
//
// What this gate reads. A THREE-ARM SIGN LADDER is a line that asks "is this above zero?" and
// then "is this below zero?" — the two comparisons in one expression, in that order. A two-armed
// sign (`x > 0 ? a : b`) is a different contract: it asks whether the figure is positive, not
// which way it points. A band over a tolerance (`Math.abs(v) < 1.5 ? "even" : …`) is a different
// decision again. The census charges the three-arm ladder and refuses the other two.
//
// Run: node scripts/proof-deltasign.mjs
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log("ok   " + name); }
  else { fail++; console.log("FAIL " + name + (detail ? ` — ${detail}` : "")); }
};

// --- 1 · the reader -------------------------------------------------------------------------------
// "is this above zero?" and "is this below zero?" — in that order, in one expression.
const UP = /> *0 *\?/;
const DOWN = /< *0 *\?/;
const isSignLadder = (line) => UP.test(line) && DOWN.test(line);

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
const ROOTS = ["domain", "data", "lib", "store", "features", "components", "ui", "src", "i18n", "functions"];
const appFiles = ROOTS.flatMap((r) => walk(join(root, r))).filter((f) => /\.(ts|tsx)$/.test(f));

const stripComments = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .split(/\r?\n/)
    .map((l) => l.replace(/\/\/.*$/, ""))
    .join("\n");

/** Every three-arm sign ladder in the tree, and where it sits. */
const readLadders = (text) => {
  const out = [];
  stripComments(text).split(/\r?\n/).forEach((line, i) => {
    if (isSignLadder(line)) out.push({ line: i + 1, text: line.trim() });
  });
  return out;
};

const ladders = [];
for (const f of appFiles) {
  const rel = f.slice(root.length + 1).replace(/\\/g, "/");
  for (const l of readLadders(readFileSync(f, "utf8"))) ladders.push({ ...l, file: rel });
}

// The reader is armed: a planted three-arm ladder is charged, and the two near shapes are not.
const pLadder = readLadders("const f = d > 0 ? \"a\" : d < 0 ? \"b\" : \"even\";").length;
const pTwoArm = readLadders("const f = d > 0 ? \"a\" : \"b\";").length;
const pBand = readLadders("const f = Math.abs(v) < 1.5 ? \"even\" : adv > 0 ? \"a\" : \"b\";").length;
const pVar = readLadders("const f = d > limit ? \"a\" : d < limit ? \"b\" : \"even\";").length;
ok(`the reader is armed and the two near shapes are refused (a planted three-arm ladder reads ${pLadder}, a two-armed sign reads ${pTwoArm}, an even-band over a tolerance reads ${pBand}, and a comparison against a variable reads ${pVar})`,
  pLadder === 1 && pTwoArm === 0 && pBand === 0 && pVar === 0);

// --- 2 · the census: the ladder survives only in the door -----------------------------------------
const HOME = "domain/attributes.ts";
const byFile = [...new Set(ladders.map((l) => l.file))].sort();
ok(`the three-arm sign ladder survives in ONE place, and that place is the door (${ladders.length} site(s) across ${byFile.length} file(s): ${byFile.join(", ")})`,
  ladders.length === 1 && byFile.length === 1 && byFile[0] === HOME,
  `carriers: ${byFile.join(", ")}`);

// --- 3 · the door is declared once, and every former site asks it ----------------------------------
const src = Object.fromEntries(appFiles.map((f) => [f.slice(root.length + 1).replace(/\\/g, "/"), readFileSync(f, "utf8")]));
const DECL = /\nexport const deltaSign[ \t]*=/g;
const CALL = /\bdeltaSign\(/g;
const IMPORT = /import[^;]*\bdeltaSign\b[^;]*from ["'](?:@\/domain\/attributes|\.\/attributes)["']/g;
const declFiles = Object.entries(src).filter(([, t]) => (t.match(DECL) || []).length > 0).map(([f]) => f);
const FORMER = ["domain/compare.ts", "features/football/Details.tsx", "features/review/ReviewPage.tsx"];
const formerCalls = FORMER.map((f) => [f, (src[f]?.match(CALL) || []).length]);
const formerImporters = FORMER.filter((f) => (src[f]?.match(IMPORT) || []).length >= 1);
ok(`deltaSign is declared once, in the door, and every module that used to spell the ladder asks it (declared in ${declFiles.join(",") || "nowhere"}; calls ${formerCalls.map(([, n]) => n).join(",")}; importers ${formerImporters.length}/${FORMER.length})`,
  declFiles.length === 1 && declFiles[0] === HOME && formerImporters.length === FORMER.length
    && formerCalls.every(([, n]) => n >= 1),
  `missing the import: ${FORMER.filter((f) => !formerImporters.includes(f)).join(", ")}`);

// --- 4 · the door answers exactly what the ladder answered ----------------------------------------
const server = await createServer({ root, server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { deltaSign } = await server.ssrLoadModule("/domain/attributes.ts");
const ladder = (d) => (d > 0 ? "up" : d < 0 ? "down" : "flat");
const VALUES = [0, -0, 1, -1, 0.5, -0.5, 1e-9, -1e-9, 99, -99, 1234.5, -1234.5];
const agrees = VALUES.every((d) => deltaSign(d) === ladder(d));
ok(`the door answers exactly what the ladder answered, on every figure a reader could meet (${VALUES.length} values: zero→"${deltaSign(0)}", negative→"${deltaSign(-1)}", positive→"${deltaSign(1)}")`,
  agrees && VALUES.length >= 8 && deltaSign(0) === "flat" && deltaSign(-1) === "down" && deltaSign(1) === "up");

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
