// Proof for the ledger's milestone RUN.
//
// The defect class: the ledger records the early milestones as prose and the later ones as
// `### M<n>` sections, and between the two there are GAPS -- milestone numbers with no section at
// all. The work shipped (the commits are there); the RECORD did not. The ledger's own pointer
// paragraph names a few of the gaps by hand ("M238, M239 and M241 had no sections when M240's
// was written ... the proof scripts advanced to M322 in commits that carried no README section"),
// and a hand-typed list beside a tree is exactly what goes stale -- M396's lesson.
//
// The gate compares two sets: the numbers the LEDGER SAYS have no section, and the numbers the
// TREE says have none. They must be EQUAL -- a gap the ledger does not name is an unrecorded
// milestone, and a gap the ledger names that now has a section is a stale list.
//
// Run: node scripts/proof-ledger-run.mjs
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const README = "README.md";
const readme = readFileSync(README, "utf8");
const lines = readme.split(/\r?\n/);

// --- The tree's set: the milestone numbers that HAVE a section. -------------------------------
const sections = [];
lines.forEach((l, i) => { const m = /^### (M)(\d+)\b/.exec(l); if (m) sections.push({ n: Number(m[2]), line: i }); });
const withSection = new Set(sections.map((s) => s.n));
const max = Math.max(...sections.map((s) => s.n));
const min = Math.min(...sections.map((s) => s.n));

// --- The ledger's set: the numbers it says have NO section. -----------------------------------
// The list lives in a marked block, one number per line, so the ledger itself carries the claim
// and the gate can compare it against the tree.
const OPEN = "<!-- gaps";
const CLOSE = "<!-- /gaps -->";
const parseGaps = (markdown) => {
  const start = markdown.indexOf(OPEN);
  const end = markdown.indexOf(CLOSE);
  if (start < 0 || end < 0 || end < start) return null;
  const body = markdown.slice(start + OPEN.length, end);
  const nums = [];
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.replace(/^\s*[-*]\s*/, "").trim();
    if (!line) continue;
    if (!/^\s*[-*]\s/.test(raw)) continue; // a continuation of the line above
    const m = /^M?(\d+)/.exec(line);
    if (!m) return { malformed: line };
    nums.push(Number(m[1]));
  }
  return { nums };
};

// --- 1. Plants: arm the reader, so a "well-formed"/"equal" verdict is measured. ----------------
const planted = parseGaps(["<!-- gaps", "", "- M188", "- M190", "", "<!-- /gaps -->"].join("\n"));
const plantedMalformed = parseGaps(["<!-- gaps", "", "- nonsense", "", "<!-- /gaps -->"].join("\n"));
ok(`the gap reader is armed (a planted list reads ${planted && planted.nums ? planted.nums.join(",") : "nothing"}, a malformed entry is caught ${plantedMalformed && plantedMalformed.malformed ? "yes" : "no"}, a ledger with no block reads ${parseGaps("no block") === null ? "null" : "something"})`,
  !!planted && planted.nums.length === 2 && planted.nums[0] === 188 && planted.nums[1] === 190 &&
  !!plantedMalformed && !!plantedMalformed.malformed && parseGaps("no block") === null);

// --- 2. The tree's gaps: the numbers between the oldest and newest section that have none. -----
const treeGaps = [];
for (let n = min; n <= max; n++) if (!withSection.has(n)) treeGaps.push(n);
ok(`the tree's gap set is read off the sections themselves (${sections.length} sections, M${min}..M${max}, ${treeGaps.length} gap(s) [${treeGaps.join(",")}])`,
  sections.length >= 190 && treeGaps.length > 0 && treeGaps.length <= 60);

// --- 3. The ledger's set is read off its own marked block, and the two must be EQUAL. ----------
// --- A gap the ledger does not name is an unrecorded milestone; a gap it names that now has a
// --- section is a stale list. Both directions, or the list is not a list. -----------------------
const declared = parseGaps(readme);
const declaredNums = declared && declared.nums ? declared.nums : [];
const unrecorded = treeGaps.filter((n) => !declaredNums.includes(n));
const stale = declaredNums.filter((n) => withSection.has(n));
ok(`the ledger names EVERY gap the tree has, and names no gap that has been filled (declared ${declaredNums.length}, tree ${treeGaps.length}; unrecorded ${unrecorded.length} [${unrecorded.join(",")}]; stale ${stale.length} [${stale.join(",")}])`,
  declared !== null && !declared.malformed && unrecorded.length === 0 && stale.length === 0 &&
  declaredNums.length === treeGaps.length);

// --- 4. The gate is ARMED both ways: a planted ledger that misses a gap must be rejected, and
// --- one that names a gap that has been filled must be rejected too. --------------------------
const plantMiss = parseGaps(["<!-- gaps", "", "- M188", "", "<!-- /gaps -->"].join("\n"));
const plantMissUnrecorded = treeGaps.filter((n) => !(plantMiss.nums || []).includes(n));
const plantStale = parseGaps(["<!-- gaps", "", `- M${min}`, "", "<!-- /gaps -->"].join("\n"));
const plantStaleHit = (plantStale.nums || []).filter((n) => withSection.has(n));
ok(`the gate is armed both ways: a planted ledger that misses a gap is rejected (${plantMissUnrecorded.length} unrecorded gap(s) it would not report), and a planted ledger that names a FILLED gap is rejected (${plantStaleHit.length} stale entry/entries it would keep)`,
  plantMissUnrecorded.length === treeGaps.length - 1 && plantStaleHit.length === 1);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
