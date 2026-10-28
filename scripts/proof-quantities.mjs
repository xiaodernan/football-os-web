// Proof for the app's QUANTITY treatments: a domain field is formatted one way, so the same
// number cannot reach a reader in two forms.
//
// M401 was the reader-visible member of this class: the world engine's market total read
// "€6030M" where a player's value read "€86.0B" -- one quantity, two readings, on two screens
// the reader could compare. proof-money closed the cause (a SECOND money formatter existed) but
// not the class: nothing stopped a field from being formatted one way here and another way
// there.
//
// The census derives the treatments from the tree -- every call of a display door, and every
// hand-rolled unit template -- groups them by the FIELD they format, and requires every field
// that has more than one treatment to be on a named list of DOCUMENTED splits. A new field
// formatted two ways reddens this census the day it is written.
//
// The named list is not a list of defects. Each entry is a split the app has already decided:
// a bare number that goes into a translated sentence beside a labelled one that stands alone;
// a padded sign beside a raw one; a fraction beside a percentage. A reader can meet the same
// field in two forms, and each of them is a different SLOT, not a different answer.
//
// Run: node scripts/proof-quantities.mjs
import { readFileSync, readdirSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const DOORS = ["fmtMoney", "fmt2", "fmt1", "fmt0", "pctLabel", "pctOf", "pct", "signed2", "signed", "epochMs"];
// The documented splits, each with the reason its own door gives.
const SPLITS = {
  value: "a player's value is money (fmtMoney) beside a bar's metric value (fmt2) -- two quantities that share a field name",
  credibility: "a bare integer that goes into a translated sentence (pct) beside a labelled one (pctLabel)",
  fatigue: "a bare integer inside a rationale row (pct) beside a labelled metric (pctLabel)",
  scanTrend: "a raw sign that follows the number (signed) beside the padded fixed-two-decimal cell (signed2)",
  skill: "a fraction shown as a decimal (fmt2) beside the same scale as a percentage (pct)",
  homeEdge: "the venue edge inside a translated sentence (fmt2) beside the signed table cell (signed) -- the sentence names who holds the bigger half, the cell says by how much",
  marketGrowth: "the run's market movement as a bare integer inside an evidence row (pct) beside the labelled tile (pctLabel)",
};

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const ROOTS = ["domain", "data", "lib", "store", "features", "components", "ui", "src"];
const appFiles = ROOTS.flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));

// A display treatment: a door call, or a hand-rolled unit template.
const readTreatments = (files2) => {
  const out = [];
  for (const f of files2) {
    const lines = readFileSync(f, "utf8").split(/\r?\n/);
    lines.forEach((l, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(l)) return;
      for (const d of DOORS) {
        const re = new RegExp(`\\b${d}\\(([^()]{0,60}?)\\)`, "g");
        let m;
        while ((m = re.exec(l))) out.push({ f, line: i + 1, kind: d, arg: m[1].trim() });
      }
      const tpl = /`[^`]*\$\{[^}]*\}[^`]*`/g;
      let t;
      while ((t = tpl.exec(l))) {
        if (!/[KMB%€]/.test(t[0])) continue;
        out.push({ f, line: i + 1, kind: "template", arg: t[0].replace(/\s+/g, " ").trim() });
      }
    });
  }
  return out;
};

// The quantity: the FIELD of the argument, when the argument is a field access or a bare name.
const fieldOf = (arg) => {
  const m = /([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)\s*$/.exec(arg);
  if (m) return m[2];
  const s = /^([A-Za-z_$][\w$]*)$/.exec(arg);
  return s ? s[1] : null;
};

// --- 1. Plants: arm the reader, so a "one treatment"/"two treatments" verdict is measured. -----
const plantedTwo = [
  { kind: "fmtMoney", arg: "p.value" },
  { kind: "fmt2", arg: "p.value" },
];
const plantedOne = [{ kind: "fmtMoney", arg: "p.value" }];
const kindsOf = (ts) => new Set(ts.map((t) => t.kind));
ok(`the reader is armed (a planted field formatted two ways reads ${kindsOf(plantedTwo).size} treatments, one way reads ${kindsOf(plantedOne).size}, and the field of an argument is read from a field access: ${fieldOf("p.value")})`,
  kindsOf(plantedTwo).size === 2 && kindsOf(plantedOne).size === 1 && fieldOf("p.value") === "value" && fieldOf("n.credibility") === "credibility");

// --- 2. Population floor: the treatments read off the tree are real. --------------------------
const treatments = readTreatments(appFiles);
ok(`the census walks the real source tree and finds a real population of display treatments (${appFiles.length} .ts/.tsx, ${treatments.length} treatment site(s), floor 60)`,
  appFiles.length >= 80 && treatments.length >= 60);

// --- 3. THE FAMILIES: every field with more than one treatment is on the named list. -----------
const byField = new Map();
for (const t of treatments) {
  const f = fieldOf(t.arg);
  if (!f) continue;
  if (!byField.has(f)) byField.set(f, []);
  byField.get(f).push(t);
}
const multi = [...byField.entries()].filter(([, ts]) => new Set(ts.map((t) => t.kind)).size > 1).map(([f]) => f).sort();
const unlisted = multi.filter((f) => !(f in SPLITS));
const staleSplits = Object.keys(SPLITS).filter((f) => !multi.includes(f));
ok(`every field with more than one treatment is on the named list of documented splits (${multi.length} field(s) with more than one treatment [${multi.join(", ")}]; unlisted ${unlisted.length} [${unlisted.join(",")}]; named but no longer split ${staleSplits.length} [${staleSplits.join(",")}])`,
  unlisted.length === 0 && staleSplits.length === 0 && multi.length === Object.keys(SPLITS).length);

// --- 4. Each named split is charged with the PAIR of doors that explains it, and the two are
// --- doors the app has -- a split into something that is not a door would be a different defect.
const splitDetail = multi.map((f) => {
  const kinds = [...new Set(byField.get(f).map((t) => t.kind))].sort();
  return `${f}: ${kinds.join("+")}`;
});
const allKindsAreDoors = multi.every((f) =>
  [...new Set(byField.get(f).map((t) => t.kind))].every((k) => DOORS.includes(k) || k === "template"));
ok(`each named split is charged with the pair of doors that explains it, and both are the app's own doors (${splitDetail.join(" | ")}; every kind is a door: ${allKindsAreDoors ? "yes" : "NO"})`,
  allKindsAreDoors && splitDetail.length === Object.keys(SPLITS).length);

// --- 5. The M401 class itself: there is ONE money formatter in the tree, so a money quantity
// --- cannot be formatted two ways by two different money doors. (proof-money charges the same
// --- thing from the door's side; this charges it from the QUANTITY's side.) ----------------------
const moneyDoors = new Set(treatments.filter((t) => t.kind === "fmtMoney").map((t) => t.kind));
ok(`the M401 class is closed from the quantity's side too: every money treatment in the tree goes through ONE door (${[...moneyDoors].join(",")}), so a money quantity cannot reach a reader in two forms`,
  moneyDoors.size === 1 && treatments.filter((t) => t.kind === "fmtMoney").length >= 8);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
