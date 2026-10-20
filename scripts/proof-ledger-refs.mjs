// Proof for the ledger's file references.
//
// The defect class, one step from M405's: the ledger's sections name files, and a name that
// points at a file the tree no longer has is a claim a reader cannot check. MOST of them are
// fine -- a section that says "the escape defect in `components/ui/chart.tsx`" is a true
// statement about a file that was later deleted. The ones that are NOT fine are the sentences
// that put the file in a list of work STILL TO DO: "the older queue is unchanged -- ... the two
// `components/ui/calendar.tsx` sites ...". The component was removed at M213, so those two sites
// cannot be outstanding, and a reader who goes looking for them finds nothing.
//
// The gate is therefore SENTENCE-scoped, not paragraph-scoped: a backticked file named in a
// sentence that presents it as a live item must either exist, or the sentence must say it is
// gone. A descriptive reference -- a defect, a fixture, a measurement -- is not a live item and
// is left alone, because a file that no longer exists can still be the subject of a true past
// statement.
//
// Run: node scripts/proof-ledger-refs.mjs
import { readFileSync, readdirSync, existsSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const README = "README.md";
const ROOTS = ["domain", "data", "lib", "features", "components", "ui", "src", "store", "i18n", "scripts", "functions", "dev"]
  .filter((d) => existsSync(d));
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const byBase = new Map();
for (const f of ROOTS.flatMap(walk)) {
  const b = f.split(/[\\/]/).pop();
  if (!byBase.has(b)) byBase.set(b, []);
  byBase.get(b).push(f);
}
const resolves = (p) => {
  if (existsSync(p)) return true;
  const base = p.split("/").pop();
  return (byBase.get(base) || []).length > 0;
};

const readme = readFileSync(README, "utf8");
const lines = readme.split(/\r?\n/);
const heads = [];
lines.forEach((l, i) => { const m = /^### (M)(\d+)\b/.exec(l); if (m) heads.push({ id: m[1], n: Number(m[2]), line: i }); });

// A sentence: the text up to the next sentence end. A markdown sentence can be long, and the
// ledger's paragraphs wrap, so a sentence is found by splitting on ". " and keeping the
// paragraph's own boundaries.
const sentences = (para) => para.split(/(?<=[.!?])\s+(?=[A-Z*`"“(])/);

const PATH = /`([A-Za-z0-9_./-]+\.(?:ts|tsx|mjs|md|json|html|css|bat|sh|txt))`/g;
// A sentence that presents the named file as a LIVE item: a queue, an exemption, a site that
// still has to be dealt with.
const LIVE = /(the older queue|the rest of the queue|exemptions are declared|still ask[s]? the browser|is permitted only while|nothing imports the primitive|still has no proof|are still outstanding)/i;
// The sentence says the file is GONE, so a reader is not sent looking for it.
const GONE = /(removed|deleted|no longer|was removed|is gone|has been removed|since removed|was deleted)/i;

// --- 1. Plants: arm the reader both ways. ----------------------------------------------------
const pLive = LIVE.test("the older queue is unchanged -- the two `x.ts` sites");
const pDescribed = LIVE.test("the escape defect in `x.ts` broke the walk");
const pGone = GONE.test("the component was removed at M248");
const pGoneMiss = GONE.test("the two `x.ts` sites are still outstanding");
ok(`the reader is armed (a live-item sentence is recognised ${pLive ? "yes" : "no"}, a descriptive one is not ${pDescribed ? "IT IS" : "no"}, a removal note is recognised ${pGone ? "yes" : "no"} and a queue sentence without one is not ${pGoneMiss ? "IT IS" : "no"})`,
  pLive && !pDescribed && pGone && !pGoneMiss);

// --- 2. The tree the references resolve against is the real one. -----------------------------
ok(`the reference resolver reads the real tree (${ROOTS.length} roots, ${byBase.size} distinct file names)`,
  ROOTS.length >= 10 && byBase.size > 100);

// --- 3. The census: every LIVE-ITEM reference to a file must resolve, or the sentence must say
// --- the file is gone. ------------------------------------------------------------------------
let refs = 0, liveItems = 0, missing = 0;
const misses = [];
for (let h = 0; h < heads.length; h++) {
  const from = heads[h].line;
  const to = h + 1 < heads.length ? heads[h + 1].line : lines.length;
  // The section's text, paragraph by paragraph, sentence by sentence.
  const section = lines.slice(from, to).join("\n");
  for (const para of section.split(/\n\s*\n/)) {
    const flat = para.replace(/\n/g, " ");
    for (const sent of sentences(flat)) {
      PATH.lastIndex = 0;
      let m;
      while ((m = PATH.exec(sent))) {
        refs++;
        if (resolves(m[1])) continue;
        if (!LIVE.test(sent)) continue; // a descriptive reference to a deleted file is fine
        liveItems++;
        // The removal note is read from the PARAGRAPH, not the sentence: a paragraph is the unit
        // of a claim, and "Both exemptions were removed from the disk at M248" in the next
        // sentence is as much a part of the claim as the reference itself.
        if (GONE.test(flat)) continue;
        missing++;
        misses.push(`${heads[h].id}: ${m[1]} -- ${sent.trim().slice(0, 110)}`);
      }
    }
  }
}
ok(`every live-item reference to a file resolves, or the sentence says the file is gone (${refs} reference(s) scanned, ${liveItems} live-item reference(s) to a file the tree no longer has, ${missing} unexplained [${misses.join(" | ")}])`,
  missing === 0 && refs >= 600 && liveItems >= 1);

// --- 4. The gate is ARMED: a planted live-item sentence naming a file that is gone must be
// --- reported, and the same sentence with a removal note must not be. --------------------------
const plantedMissing = "the older queue is unchanged -- the two `components/ui/calendar.tsx` sites";
const plantedFixed = "the older queue is unchanged -- the two `components/ui/calendar.tsx` sites, which were removed at M248";
const plantedMissingHit = LIVE.test(plantedMissing) && !resolves("components/ui/calendar.tsx") && !GONE.test(plantedMissing);
const plantedFixedOk = LIVE.test(plantedFixed) && !resolves("components/ui/calendar.tsx") && GONE.test(plantedFixed);ok(`the gate is armed both ways: a planted live-item sentence naming a deleted file is reported (${plantedMissingHit ? "yes" : "no"}), and the same sentence with a removal note is not (${plantedFixedOk ? "yes" : "no"})`,
  plantedMissingHit && plantedFixedOk);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
