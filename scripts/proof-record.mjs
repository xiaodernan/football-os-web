// M346. The repository's record of itself, checked against itself.
//
// README.md is the project's ledger: one `### M###` section per milestone, and a pointer paragraph
// that says which milestone is current. Nothing checked either. Two concurrent sessions can write a
// section for the same milestone number and both land, and a docs sync can rename a heading it was
// not about — both happened, and the record carried the damage silently:
//
//   · `M339` appeared **three times** — two headings with the comment-ghost account and one whose
//     body was `M336`'s section verbatim, its heading renamed by `a5f17ea` (a docs sync for M339).
//   · `M281` appeared **twice**, for two unrelated units: `26e698b`'s deleted seed sentence and
//     `bc4f917`'s recorded match stats.
//   · One of the `M339` headings had **no body at all** — a heading immediately followed by the
//     next heading, which reads as a section and is not one.
//
// Four readings, each a named function so the clauses and their witnesses run the SAME code (M313:
// a witness that re-implements the predicate it guards proves nothing).
//
// The honest limit: this checks the record against itself, not against the commits. It cannot tell
// whether a section describes the work its number belongs to — only a reader can, and the two
// collisions above were found by reading. What it can do is refuse to let a heading be written
// twice or written empty, which is the shape the damage actually took.
import { readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const README = join(root, "README.md");

let pass = 0;
let fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log("ok   " + name); }
  else { fail++; console.log("FAIL " + name + (detail ? ` — ${detail}` : "")); }
};

// A milestone heading: `### M<digits>` at the start of a line, followed by a word boundary.
const HEAD = /^### (M\d+)\b/;

/** Every milestone heading in the file, with the line it sits on and its body. */
const milestoneSections = (src) => {
  const lines = src.split(/\r?\n/);
  const heads = [];
  lines.forEach((line, i) => {
    const m = line.match(HEAD);
    if (m) heads.push({ ms: m[1], line: i + 1, title: line });
  });
  return heads.map((h, i) => {
    const end = i + 1 < heads.length ? heads[i + 1].line - 1 : lines.length;
    const body = lines.slice(h.line, end).join("\n").trim();
    return { ...h, body };
  });
};

/** The milestone numbers that appear on more than one heading. */
const duplicatedMilestones = (sections) => {
  const seen = new Map();
  for (const s of sections) seen.set(s.ms, (seen.get(s.ms) ?? 0) + 1);
  return [...seen.entries()].filter(([, n]) => n > 1).map(([ms, n]) => `${ms} x${n}`);
};

/** The milestone the roadmap pointer says is current. */
const pointerMilestone = (src) => {
  const m = src.match(/currently at (M\d+)/);
  return m ? m[1] : null;
};

/** Milestones whose number is the largest in the file, by numeric value. */
const newestMilestone = (sections) =>
  sections.reduce((best, s) => (Number(s.ms.slice(1)) > Number(best.slice(1)) ? s.ms : best), "M0");

/**
 * A `### M###` that does NOT start its line: the section was inserted onto the end of a paragraph, so
 * CommonMark renders the heading as prose and `milestoneSections` above never sees it. M396 did exactly
 * this to M395 — its landing script joined a section that carried no trailing newline — and the gate
 * stayed green while the ledger lost a heading: 188 found, 188 distinct, because the damaged section was
 * counted as body text of the section above it. So this reading exists only as a PAIR with the blind one:
 * `glued === 1 && sections === 0` on the same fixture is what proves the file is being read, not ignored.
 *
 * Two shielded shapes must NOT be charged, because the README quotes headings as prose about itself:
 * inline code spans (lines 6713 and 6750 carry `` `### M336 — …` `` inside backticks) and fenced blocks
 * (42 fence markers). A scan that charged either would report three false damages and the next insert
 * would be refused for a reason nobody could act on.
 */
const GLUED_MARK = /### M\d+\b/g;
const gluedHeadings = (src) => {
  const out = [];
  let inFence = false;
  src.split(/\r?\n/).forEach((raw, i) => {
    if (/^\s*(```|~~~)/.test(raw)) { inFence = !inFence; return; }
    if (inFence) return;
    const line = raw.replace(/`[^`]*`/g, "``"); // inline code is prose, not markup
    for (const m of line.matchAll(GLUED_MARK)) {
      if (m.index > 0 && line.slice(0, m.index).trim() !== "") out.push({ line: i + 1, at: m[0] });
    }
  });
  return out;
};

const readme = readFileSync(README, "utf8");
const sections = milestoneSections(readme);
const dupes = duplicatedMilestones(sections);
const empty = sections.filter((s) => s.body === "");
const pointer = pointerMilestone(readme);
const newest = newestMilestone(sections);

ok(`no milestone is recorded twice (${sections.length} headings, ${new Set(sections.map((s) => s.ms)).size} distinct milestones, ${dupes.length} duplicated${dupes.length ? `: ${dupes.join(", ")}` : ""})`,
  sections.length >= 150 && dupes.length === 0);
ok(`every milestone heading carries a body (${sections.length - empty.length} of ${sections.length} non-empty${empty.length ? `, empty: ${empty.map((s) => `${s.ms} at line ${s.line}`).join(", ")}` : ""})`,
  sections.length >= 150 && empty.length === 0);
ok(`the roadmap pointer names the newest milestone the file records (pointer ${pointer ?? "absent"}, newest heading ${newest})`,
  pointer !== null && pointer === newest);

// Clause 4. The glue reading, armed both ways in the same expression the clause uses: a glued heading must
// be seen BY THIS READING and missed by `milestoneSections` (that blindness is the damage), a line-start
// heading must be seen by the reader and not charged here, and the two shielded prose shapes — inline code
// and a fenced block — must read 0 so the census cannot be satisfied by charging the ledger's own quotes.
const glued = gluedHeadings(readme);
const gGlued = gluedHeadings("para ends.### M2 — the second\n\nbody two\n");
const gGluedSections = milestoneSections("para ends.### M2 — the second\n\nbody two\n");
const gClean = gluedHeadings("### M2 — the second\n\nbody two\n");
const gCleanSections = milestoneSections("### M2 — the second\n\nbody two\n");
const gCodeSpan = gluedHeadings("renamed `### M336 — the data room's count` by `a5f17ea` — a docs sync\n");
const gFenced = gluedHeadings("```txt\nprose.### M2 — inside a fence\n```\n");
const gIndented = gluedHeadings("### M2 — a\n\n   ### M1 — b\n\nbody one\n");
const gTwo = gluedHeadings("para ends.### M2 — second\n\nbody\n\nmore text.### M1 — first\n\nbody\n");
ok(`no milestone heading is glued to the end of a paragraph (${glued.length ? `${glued.length} damaged: ${glued.map((g) => `line ${g.line} "${g.at}"`).join(", ")}` : "none"}; ${sections.length} headings the line-anchored reader can see; planted glued ${gGlued.length} while the blind reader counted ${gGluedSections.length} heading(s) of it, planted clean ${gClean.length} with ${gCleanSections.length} read, planted inline-code quote ${gCodeSpan.length}, planted fenced ${gFenced.length}, planted 3-space indent ${gIndented.length}, planted two ${gTwo.length})`,
  glued.length === 0 && gGlued.length === 1 && gGluedSections.length === 0 && gClean.length === 0 &&
  gCleanSections.length === 1 && gCodeSpan.length === 0 && gFenced.length === 0 &&
  gIndented.length === 0 && gTwo.length === 2 && sections.length >= 150);

// The witnesses. Each fixture is a small README, and each declares the verdict it must get from
// the same three readings the clauses above use. A reader that stopped finding headings would
// report no duplicates and look perfect, so the "clean" fixture is the one that proves it is
// still reading: it must come back with its own headings counted and its pointer matched.
const RECORD_FIXTURES = [
  ["a record with unique, populated headings and a matching pointer",
    "Work ships one milestone per commit and is currently at M2 (x).\n\n### M2 — the second\n\nbody two\n\n### M1 — the first\n\nbody one\n", true],
  ["a milestone recorded twice",
    "currently at M2 (x)\n\n### M2 — the second\n\nbody two\n\n### M1 — the first\n\nbody one\n\n### M1 — the first again\n\nbody one again\n", false],
  ["a heading with no body, immediately followed by the next heading",
    "currently at M2 (x)\n\n### M2 — the second\n\n### M1 — the first\n\nbody one\n", false],
  ["a pointer that names a milestone the file does not record newest",
    "currently at M1 (x)\n\n### M2 — the second\n\nbody two\n\n### M1 — the first\n\nbody one\n", false],
  ["no pointer at all",
    "### M2 — the second\n\nbody two\n", false],
  // The M396 damage as a fixture: two headings the line-anchored reader can see, a pointer that names the
  // newest of THOSE, non-empty bodies everywhere — and a third milestone welded onto the end of a
  // paragraph. Without the glue reading this file verdicts true; the damaged heading is present in the
  // bytes and absent from the record.
  ["a heading glued to the end of a paragraph, which the line-anchored reader cannot see",
    "currently at M3 (x)\n\n### M3 — third\n\nbody three\n\n### M2 — second\n\nbody two.**Next.** text.### M1 — the first\n\nbody one\n", false],
];
const recordVerdict = (src) => {
  const s = milestoneSections(src);
  return (
    s.length >= 2 &&
    duplicatedMilestones(s).length === 0 &&
    s.every((x) => x.body !== "") &&
    gluedHeadings(src).length === 0 &&
    pointerMilestone(src) !== null &&
    pointerMilestone(src) === newestMilestone(s)
  );
};
const recordVerdicts = RECORD_FIXTURES.map(([name, src, want]) => [name, recordVerdict(src) === want]);
ok(`the record reader, planted both ways, refuses a repeated heading, an empty heading, a stale pointer and a heading glued into a paragraph, and accepts a clean file (${recordVerdicts.map(([n, v]) => `${n}: ${v}`).join("; ")})`,
  recordVerdicts.every(([, v]) => v));

console.log(`\n${sections.length} milestone headings · ${new Set(sections.map((s) => s.ms)).size} distinct`);
console.log(`${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
