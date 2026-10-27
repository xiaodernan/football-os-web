// M539. The quarantine's TYPE health.
//
// M537 closed the quarantine's SYNTAX backlog: every draft under `.drafts/` parses. Parse-clean is
// not shippable, and nothing measured the layer beneath it: the syntax gate asked whether the
// tokens parse, while the app's own compiler never looked at `.drafts/` at all — the app's tsconfig
// includes `src`, `components`, `hooks` and `lib`, and the quarantine is in none of them.
//
// So the drafts carried their type defects unmeasured: 475 of them, across 71 of the 79 files.
// This gate reads the quarantine with the checker, names the files, and bounds what it finds.
//
// What it charges:
//   1. the census reads the quarantine with the APP'S OWN compiler options — the same tsconfig, the
//      same `paths`, the same `jsx` — so a draft is judged the way the app would judge it;
//   2. the backlog may not GROW: every family of defects is bounded by the figure measured when
//      this milestone landed, and a family that appears with no bound is refused;
//   3. the two families this milestone repaired are bounded at ZERO, so a draft that loses its
//      `useState` import again, or reaches for `React` without binding it, reddens here;
//   4. the reader is armed: a mirror of the quarantine carrying a missing `useState` import, a React
//      UMD global and a sound draft beside them must name the first two and leave the third alone.
//
// Run: node scripts/proof-draft-types.mjs
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { walkApp } from "./lib/appTree.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const draftsDir = join(root, ".drafts");

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log("ok   " + name); }
  else { fail++; console.log("FAIL " + name + (detail ? ` — ${detail}` : "")); }
};

// --- the app's own compiler options ----------------------------------------------------------------
// The quarantine is judged by the app's compiler, not by one of its own: the same tsconfig, the same
// `paths` mapping, the same `jsx` mode. A draft that the app's checker would reject is a draft the
// app cannot ship, whatever a standalone checker said about it.
const appOptions = () => {
  const cfg = ts.readConfigFile(join(root, "tsconfig.json"), ts.sys.readFile);
  if (cfg.error) throw new Error(`the app's tsconfig does not read: ${ts.flattenDiagnosticMessageText(cfg.error.messageText, " ")}`);
  const parsed = ts.parseJsonConfigFileContent(cfg.config, ts.sys, root);
  if (parsed.errors.length) throw new Error(`the app's tsconfig does not parse: ${parsed.errors.length} error(s)`);
  return { ...parsed.options, noEmit: true };
};

/**
 * The signature of a diagnostic: its code, plus the NAME it complains about when the code names one.
 * "cannot find name 'useState'" and "cannot find name 'EmptyState'" are the same code and two
 * different families, and a family is what the bounds below are written against.
 */
const signature = (d) => {
  const msg = ts.flattenDiagnosticMessageText(d.messageText, " ");
  const named = /Cannot find name '([^']+)'/.exec(msg);
  return named ? `${d.code}:${named[1]}` : String(d.code);
};

/** The census: the files of a population, and the signatures of the defects the checker finds. */
const census = (files, options, population) => {
  const program = ts.createProgram(files, options);
  const prefix = population.replace(/\\/g, "/") + "/";
  const perFile = new Map();
  for (const sf of program.getSourceFiles()) {
    const name = sf.fileName.replace(/\\/g, "/");
    if (!name.startsWith(prefix)) continue;
    perFile.set(name.slice(prefix.length), program.getSemanticDiagnostics(sf).map(signature));
  }
  return perFile;
};

// --- the measured census, and the bound each family carries ---------------------------------------
// A family may shrink — the backlog is being paid down — but it may not grow, and a family that
// appears with no bound is refused: a new shape of defect has to be recorded deliberately.
const TYPE_CEILINGS = {
  "2322": 280,            // not assignable
  "2339": 71,             // property does not exist on the type
  "7006": 23,             // parameter implicitly has an 'any' type
  "2307": 8,              // cannot find module
  "2554": 7,              // wrong number of arguments
  "2304:EmptyState": 4,   // a component the app exports and the draft does not import
  "2551": 4,              // no overlap between the two types
  "2304:browserStore": 2,
  "2304:useI18n": 2,
  "2365": 2, "2448": 2, "2454": 2, "7022": 2, "7024": 2,
  "2304:calculateTransferFee": 1, "2304:newsData": 1, "2304:prev": 1,
  "2304:readJson": 1, "2304:syncedCount": 1, "2304:writeJson": 1,
  "2345": 1, "2367": 1, "2488": 1, "2538": 1, "2695": 1, "7053": 1,
  // The two families this milestone repaired. A bound of zero is not a number the census may fall
  // below — it is a number it may never rise above.
  "2304:useState": 0,     // a draft that calls useState without importing it
  "2686": 0,              // a draft that reaches for React without binding it
};
const TOTAL_CEILING = 423;
const FILES_CEILING = 69;
const POPULATION_PIN = 79;

// --- the census -------------------------------------------------------------------------------------
const options = appOptions();
const draftFiles = walkApp(draftsDir, { dirs: null, notApp: [], exts: [".ts", ".tsx"] });

const perFile = census(draftFiles, options, draftsDir);
const defective = [...perFile].filter(([, sigs]) => sigs.length > 0);
const total = defective.reduce((s, [, sigs]) => s + sigs.length, 0);
const byFamily = {};
for (const [, sigs] of defective) for (const s of sigs) byFamily[s] = (byFamily[s] ?? 0) + 1;

ok(`the census read the quarantine with the app's own compiler options (${draftFiles.length} draft file(s) walked, ${perFile.size} read by the checker)`,
  draftFiles.length === POPULATION_PIN && perFile.size === POPULATION_PIN,
  `walked ${draftFiles.length}, read ${perFile.size}, pin ${POPULATION_PIN}`);

const unbound = Object.keys(byFamily).filter((f) => !(f in TYPE_CEILINGS));
const over = Object.entries(byFamily).filter(([f, n]) => n > TYPE_CEILINGS[f]);
ok(`the backlog may not grow (${total} error(s) <= ${TOTAL_CEILING}; ${defective.length} file(s) with errors <= ${FILES_CEILING})`,
  total <= TOTAL_CEILING && defective.length <= FILES_CEILING,
  `${total} errors, ${defective.length} files`);
ok(`every family of defect is within its bound, and a family with no bound is refused (${Object.keys(byFamily).length} famil(y/ies), ${over.length} over their bound [${over.map(([f, n]) => `${f} ${n} > ${TYPE_CEILINGS[f]}`).join("; ")}], ${unbound.length} unbound [${unbound.join(", ")}])`,
  over.length === 0 && unbound.length === 0,
  `over: ${over.map(([f, n]) => `${f} ${n}`).join(", ")}; unbound: ${unbound.join(", ")}`);

const returned = ["2304:useState", "2686"].filter((f) => (byFamily[f] ?? 0) > 0);
ok(`the two families this milestone repaired may not come back (useState ${byFamily["2304:useState"] ?? 0}, React UMD ${byFamily["2686"] ?? 0})`,
  returned.length === 0, returned.join(", "));

// The census names the files it read, so the reader can see what it is reading.
for (const [rel, sigs] of defective.sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`       ${rel}  ${sigs.length}  [${sigs.join(" ")}]`);
}

// --- the reader, armed ------------------------------------------------------------------------------
// A bound of zero is only a measurement if the reader can still see the defect it forbids. So the
// same reader is run over a MIRROR of the quarantine carrying one draft that calls `useState`
// without importing it, one that reaches for `React` without binding it, and one sound draft
// beside them. It must name the first two and leave the third alone.
const mirror = mkdtempSync(join(tmpdir(), "draft-types-mirror-"));
let sawUseState = 0, sawUmd = 0, soundErrors = -1;
try {
  const md = join(mirror, ".drafts");
  mkdirSync(join(md, "features", "plant"), { recursive: true });
  writeFileSync(join(md, "features", "plant", "MissingUseState.ts"),
    "export const A = () => { const [a, setA] = useState(0); return a; };\n");
  writeFileSync(join(md, "features", "plant", "UmdReact.ts"),
    "export const B = () => { const [a, setA] = React.useState(0); return a; };\n");
  writeFileSync(join(md, "features", "plant", "Sound.ts"), "export const C = 1;\n");
  // The mirror carries no import of its own, so the react declarations are pulled in BY NAME — the
  // same declarations the drafts reach through their own import — or `React` would be an unknown
  // name rather than a UMD global, and the arm would prove nothing about the family it is arming.
  const mirrorOptions = { ...options, types: [...(options.types ?? []), "react"] };
  const seen = census([
    join(md, "features", "plant", "MissingUseState.ts"),
    join(md, "features", "plant", "UmdReact.ts"),
    join(md, "features", "plant", "Sound.ts"),
  ], mirrorOptions, md);
  sawUseState = (seen.get("features/plant/MissingUseState.ts") ?? []).filter((s) => s === "2304:useState").length;
  sawUmd = (seen.get("features/plant/UmdReact.ts") ?? []).filter((s) => s === "2686").length;
  soundErrors = (seen.get("features/plant/Sound.ts") ?? []).length;
} finally {
  rmSync(mirror, { recursive: true, force: true });
}
ok(`the reader still finds both forbidden families with two planted drafts in a mirror of the quarantine, and leaves the sound draft alone (missing useState ${sawUseState}, React UMD ${sawUmd}, sound draft ${soundErrors} error(s))`,
  sawUseState === 1 && sawUmd === 1 && soundErrors === 0);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
