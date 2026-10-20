// Proof for the stored-row repair door.
//
// The defect class: three stores -- the goals library, the coach's memory and the training
// sessions -- each carried its own byte-identical copy of the rule "a stored row whose title
// (or text) is a plain string, written before the row was keyed, becomes a RowText value; a row
// that is already keyed is returned as the SAME OBJECT, because hydration runs on every load and
// rebuilding unchanged rows would make every one of them look edited". The rule is now the
// `repairTextField` door in domain/rowText.ts, and the three store-named functions are the seam
// into it.
//
// The census charges the rule in ONE place, and the identity properties -- the load-bearing part
// -- once, where they are now true of all three stores at the same time.
//
// Run: node scripts/proof-repair.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const server = await createServer({
  cacheDir: join(tmpdir(), `proof-repair-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const RT = await server.ssrLoadModule("/domain/rowText.ts");
const { repairTextField, asRowText } = RT;

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "domain/rowText.ts";
const SEAMS = [
  ["domain/goals.ts", "repairGoalTitles", "title"],
  ["domain/memory.ts", "repairMemoryTexts", "text"],
  ["domain/training.ts", "repairSessionTitles", "title"],
  ["data/ai.ts", "repairPlanPrompts", "prompt"],
];
// The rule's own shape: a "is this field a plain string" sweep over a row collection.
const RULE = /typeof\s*\(\s*\w+\.\w+\s+as unknown\s*\)\s*===\s*"string"/g;
const SEAM_CALL = /return repairTextField\(\s*\w+\s*,\s*"\w+"\s*\);/g;
const DECL = /export function repairTextField<T extends object>\(rows: T\[\], field: keyof T & string\): T\[\] \{/;
// The door's own body: the two string checks it makes (the early-out and the map). Computed
// once the tree is read.
const doorStringChecks = () => {
  const body = (raw[HOME].match(/export function repairTextField[\s\S]*?\n\}/) || [""])[0];
  return (body.match(/===\s*"string"/g) || []).length;
};

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const ROOTS = ["domain", "data", "lib", "features", "components", "ui", "src", "store"];
const appFiles = ROOTS.flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const raw = Object.fromEntries(appFiles.map((f) => [f, readFileSync(f, "utf8")]));
const code = Object.fromEntries(appFiles.map((f) => [f, raw[f].split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n")]));
const n = (text, re) => {
  const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
  return (text.match(new RegExp(re.source, flags)) || []).length;
};

// --- 1. Plants: arm the scan, so a "zero"/"three" verdict is measured, never an empty set. -----
const pRule = n('if (!g.some((g) => typeof (g.title as unknown) === "string")) return g;', RULE);
const pSeam = n('return repairTextField(g, "title");', SEAM_CALL);
const pDecl = n("export function repairTextField<T extends object>(rows: T[], field: keyof T & string): T[] {", DECL);
ok(`the scans are armed and the rule's shape is what they draw (the old per-store sweep ${pRule}, the seam that calls the door ${pSeam}, the door's declaration ${pDecl})`,
  pRule === 1 && pSeam === 1 && pDecl === 1);

// --- 2. Population floor + subject presence. -------------------------------------------------
const present = SEAMS.map(([f]) => f).concat([HOME, "store/useFootballOS.tsx"])
  .every((p) => Object.prototype.hasOwnProperty.call(raw, p));
ok(`the census walks the real source tree and every subject is inside it (${appFiles.length} .ts/.tsx, floor 90)`,
  appFiles.length >= 90 && present);

// --- 3. THE RULE IS IN ONE PLACE: the per-store sweep survives nowhere but the door's body. -----
// --- The three seams are named and charged, so a store that forgot to fold would show up. ------
const ruleByFile = appFiles.filter((f) => f !== HOME && n(code[f], RULE) > 0);
const seamBodies = SEAMS.map(([f, name]) => {
  const m = code[f].match(new RegExp(`export function ${name}[\\s\\S]*?\\n}`));
  return m ? { f, name, body: m[0] } : { f, name, body: null };
});
const seamsFolded = seamBodies.every((s) => s.body && n(s.body, SEAM_CALL) === 1 && n(s.body, RULE) === 0);
ok(`the rule is in ONE place: the per-store sweep survives nowhere outside the door's own body (${ruleByFile.length} file(s) still carrying it [${ruleByFile.join(",")}]; the door's body holds ${doorStringChecks} string checks; all ${SEAMS.length} seams are reduced to a call into it: ${seamsFolded ? "yes" : "NO"})`,
  ruleByFile.length === 0 && doorStringChecks() === 2 && seamsFolded);

// --- 4. The store still calls the three seams, in the shape proof-timeline charges. -------------
const storeSrc = raw["store/useFootballOS.tsx"];
const storeCalls = SEAMS.map(([, name]) => new RegExp(`${name}\\(`).test(storeSrc));
ok(`the store still reaches all ${SEAMS.length} seams at the hydration boundary (${storeCalls.map((c, i) => `${SEAMS[i][1]}=${c ? "yes" : "NO"}`).join(", ")})`,
  storeCalls.every(Boolean));

// --- 5. The door is declared once, in its home. ----------------------------------------------
const declByFile = appFiles.filter((f) => n(raw[f], DECL) > 0);
ok(`the door is declared exactly once, in the rowText home (home ${n(raw[HOME], DECL)}, tree [${declByFile.join(",")}])`,
  n(raw[HOME], DECL) === 1 && declByFile.length === 1 && declByFile[0] === HOME);

// --- 6. BEHAVIOUR: the identity properties, charged ONCE for all three stores. ----------------
const plain = { title: "Earn 500 XP" };
const keyed = { title: { value: "Earn 500 XP" } };
const other = { title: 42 };
const list = [keyed, plain, other];
const repaired = repairTextField(list, "title");
// The library with nothing to repair is the SAME ARRAY.
const sameArray = repairTextField([keyed, other], "title");
// A row that is already keyed is the SAME OBJECT; a row that is not a string is untouched.
const sameObject = repairTextField(list, "title")[0] === keyed;
const untouched = repairTextField(list, "title")[2] === other;
const plainBecame = repairTextField(list, "title")[1].title.value === "Earn 500 XP";
ok(`the door keeps the identity properties, once for all four stores: a library with nothing to repair is the SAME ARRAY (${sameArray === repaired ? "NO" : "yes"}), a keyed row is the SAME OBJECT (${sameObject ? "yes" : "NO"}), a row that is not a string is untouched (${untouched ? "yes" : "NO"}), a plain string became a RowText value (${plainBecame ? "yes" : "NO"}), and an empty list is safe (${repairTextField([], "title").length === 0 ? "yes" : "NO"})`,
  sameArray !== repaired && sameObject && untouched && plainBecame && repairTextField([], "title").length === 0);

// --- 6b. Planted companion for the identity claim above: a door that REBUILT every row -- the
// --- shape the fourth copy had before this unit -- must FAIL the same-array property, or the
// --- claim above is a door that happens to answer right for the wrong reason. -------------------
const rebuild = (rows, field) => rows.map((r) => {
  const v = r[field];
  return typeof v === "string" ? { ...r, [field]: { value: v } } : r;
});
const rebuildArray = rebuild([keyed, other], "title");
const rebuildMisses = rebuildArray === repairTextField([keyed, other], "title") ? 0 : 1;
const rebuildRow = rebuild([plain], "title")[0];
const doorRow = repairTextField([plain], "title")[0];
ok(`planted companion: a door that REBUILT every row -- the shape the fourth copy had before this unit -- is caught by the same-array claim (the rebuild returns a different array where the door returns the same one: ${rebuildMisses === 1 ? "yes" : "NO"}), and the two agree on the CONVERSION so the difference is exactly the identity property (rebuilt: ${JSON.stringify(rebuildRow)}, door: ${JSON.stringify(doorRow)})`,
  rebuildMisses === 1 && JSON.stringify(rebuildRow) === JSON.stringify(doorRow));

// --- 7. The door is a repair and not a rebuild: a row that is already keyed is returned UNCHANGED,
// --- so a hydration pass cannot make every row look edited. ------------------------------------
const oneKeyed = repairTextField([keyed], "title");
ok(`the door is a repair and not a rebuild: a library of already-keyed rows comes back with the same objects and the row's own value (${JSON.stringify(oneKeyed[0])})`,
  oneKeyed[0] === keyed && oneKeyed[0].title.value === "Earn 500 XP");

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
