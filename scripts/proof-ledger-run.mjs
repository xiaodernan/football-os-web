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
// The list lives in a marked block, one entry per line, and each entry NAMES THE WORK that
// shipped under that number — a bare number is a hole in the ledger, and a hole a reader has to
// dig for is a hole the ledger did not really close. -------------------------------------------
const OPEN = "<!-- gaps";
const CLOSE = "<!-- /gaps -->";
const parseGaps = (markdown) => {
  const start = markdown.indexOf(OPEN);
  const end = markdown.indexOf(CLOSE);
  if (start < 0 || end < 0 || end < start) return null;
  const body = markdown.slice(start + OPEN.length, end);
  const entries = [];
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.replace(/^\s*[-*]\s*/, "").trim();
    if (!line) continue;
    if (!/^\s*[-*]\s/.test(raw)) continue; // a continuation of the line above
    const m = /^M?(\d+)\s*(?:—|--|-)?\s*(.*)$/.exec(line);
    if (!m) return { malformed: line };
    entries.push({ n: Number(m[1]), text: (m[2] || "").trim() });
  }
  return { entries };
};

// --- 1. Plants: arm the reader, so a "well-formed"/"equal" verdict is measured. ----------------
const planted = parseGaps(["<!-- gaps", "", "- M188 — a unit that shipped", "- M190", "", "<!-- /gaps -->"].join("\n"));
const plantedMalformed = parseGaps(["<!-- gaps", "", "- nonsense", "", "<!-- /gaps -->"].join("\n"));
ok(`the gap reader is armed (a planted list reads ${planted && planted.entries ? planted.entries.map((e) => `M${e.n}${e.text ? ":" + e.text : ""}`).join(",") : "nothing"}, a malformed entry is caught ${plantedMalformed && plantedMalformed.malformed ? "yes" : "no"}, a ledger with no block reads ${parseGaps("no block") === null ? "null" : "something"})`,
  !!planted && planted.entries.length === 2 && planted.entries[0].n === 188 && planted.entries[0].text === "a unit that shipped" &&
  planted.entries[1].n === 190 && planted.entries[1].text === "" &&
  !!plantedMalformed && !!plantedMalformed.malformed && parseGaps("no block") === null);

// --- 2. The tree's gaps: the numbers between the oldest and newest section that have none. -----
// The vacuity ceiling is derived from the run it guards instead of a hand-typed constant: a gap
// list that is most of the ledger would mean the record stopped being written at all, so the gaps
// must stay a minority of the sections. (The old constant was 60; a lane that mints numbers in
// code-only commits outgrew it, and a constant a tree can outgrow is a false alarm waiting to fire.)
const ceilingHolds = (gapCount, sectionCount) => gapCount > 0 && gapCount * 2 <= sectionCount;
const treeGaps = [];
for (let n = min; n <= max; n++) if (!withSection.has(n)) treeGaps.push(n);
ok(`the tree's gap set is read off the sections themselves (${sections.length} sections, M${min}..M${max}, ${treeGaps.length} gap(s) [${treeGaps.join(",")}])`,
  sections.length >= 190 && ceilingHolds(treeGaps.length, sections.length));

ok(`the vacuity ceiling is armed (gaps ${treeGaps.length} of ${sections.length} sections; planted 5/10 holds ${ceilingHolds(5, 10)}, 6/10 holds ${ceilingHolds(6, 10)}, 0/10 holds ${ceilingHolds(0, 10)})`,
  ceilingHolds(5, 10) && !ceilingHolds(6, 10) && !ceilingHolds(0, 10));

// --- 3. The ledger's set is read off its own marked block, and the two must be EQUAL. ----------
// --- A gap the ledger does not name is an unrecorded milestone; a gap it names that now has a
// --- section is a stale list. Both directions, or the list is not a list. -----------------------
const declared = parseGaps(readme);
const declaredEntries = declared && declared.entries ? declared.entries : [];
const declaredNums = declaredEntries.map((e) => e.n);
const unrecorded = treeGaps.filter((n) => !declaredNums.includes(n));
const stale = declaredNums.filter((n) => withSection.has(n));
ok(`the ledger names EVERY gap the tree has, and names no gap that has been filled (declared ${declaredNums.length}, tree ${treeGaps.length}; unrecorded ${unrecorded.length} [${unrecorded.join(",")}]; stale ${stale.length} [${stale.join(",")}])`,
  declared !== null && !declared.malformed && unrecorded.length === 0 && stale.length === 0 &&
  declaredNums.length === treeGaps.length);

// --- 4. EVERY entry NAMES THE WORK that shipped under that number. A bare number is a hole a
// --- reader has to dig for; a description that repeats another entry's is a copy-paste list
// --- wearing the shape of a ledger. ----------------------------------------------------------
const described = declaredEntries.filter((e) => e.text.length >= 12);
const bare = declaredEntries.filter((e) => e.text.length < 12);
const texts = declaredEntries.map((e) => e.text);
const repeated = texts.filter((t, i) => t && texts.indexOf(t) !== i);
ok(`every gap names the work that shipped under it, and no two name the same work (${described.length}/${declaredEntries.length} described, ${bare.length} bare [${bare.map((e) => "M" + e.n).join(",")}]; repeated descriptions ${repeated.length})`,
  bare.length === 0 && repeated.length === 0 && described.length === declaredEntries.length && declaredEntries.length > 0);

// --- 5. The gate is ARMED both ways: a planted ledger that misses a gap must be rejected, and
// --- one that names a FILLED gap must be rejected too. --------------------------------------
const plantMiss = parseGaps(["<!-- gaps", "", "- M188 — a unit that shipped", "", "<!-- /gaps -->"].join("\n"));
const plantMissUnrecorded = treeGaps.filter((n) => !(plantMiss.entries || []).some((e) => e.n === n));
const plantStale = parseGaps(["<!-- gaps", "", `- M${min} — a filled gap`, "", "<!-- /gaps -->"].join("\n"));
const plantStaleHit = (plantStale.entries || []).filter((e) => withSection.has(e.n));
ok(`the gate is armed both ways: a planted ledger that misses a gap is rejected (${plantMissUnrecorded.length} unrecorded gap(s) it would not report), and a planted ledger that names a FILLED gap is rejected (${plantStaleHit.length} stale entry/entries it would keep)`,
  plantMissUnrecorded.length === treeGaps.length - 1 && plantStaleHit.length === 1);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
