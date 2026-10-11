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
// Three readings, each a named function so the clauses and their witnesses run the SAME code (M313:
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
];
const recordVerdict = (src) => {
  const s = milestoneSections(src);
  return (
    s.length >= 2 &&
    duplicatedMilestones(s).length === 0 &&
    s.every((x) => x.body !== "") &&
    pointerMilestone(src) !== null &&
    pointerMilestone(src) === newestMilestone(s)
  );
};
const recordVerdicts = RECORD_FIXTURES.map(([name, src, want]) => [name, recordVerdict(src) === want]);
ok(`the record reader, planted both ways, refuses a repeated heading, an empty heading and a stale pointer, and accepts a clean file (${recordVerdicts.map(([n, v]) => `${n}: ${v}`).join("; ")})`,
  recordVerdicts.every(([, v]) => v));

console.log(`\n${sections.length} milestone headings · ${new Set(sections.map((s) => s.ms)).size} distinct`);
console.log(`${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
