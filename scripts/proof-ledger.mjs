// Proof for the LEDGER's own claims.
//
// The defect class: README.md is this project's ledger and scripts/proof-record.mjs is its only
// accountant — but the accountant checks the ledger's STRUCTURE (unique headings, bodies, a pointer
// that names the newest milestone) and never its CLAIMS. So a note written at M144, naming three
// outstanding items and a count of 17 unreachable labels, stayed in the file through the
// milestones that fixed every one of them. It read as a live claim ("still owes", "are two known
// ones") and it was not one.
//
// This is the project's own recurring theme pointed at the ledger itself: a list that is not
// re-derived goes stale. M396 taught "derive the list from the tree instead of typing it"; here
// the list IS the ledger's, and the tree is the app.
//
// The gate has two arms.
//
//   ARM 1 — the ledger's OUTSTANDING LIST. The README carries it in a marked block, and every
//   defect entry names a file and the pattern that would still show the defect. A resolved
//   pattern means the ledger is claiming a defect that no longer exists, and the gate reddens.
//   A task entry names work no scan can see (a live-browser pass), and is recorded, not checked.
//
//   ARM 2 — the WITHDRAWAL, charged. The M405 note withdrew five specific claims, and a withdrawal
//   that is not charged is a promise. Each of the five is resolved against the tree here.
//
// The gate is ARMED both ways: a planted ledger carrying one of the withdrawn claims must be
// rejected, and a planted ledger carrying a pattern that IS still there must be accepted. A gate
// over an empty list is a gate over nothing, and the plant is the answer.
//
// Run: node scripts/proof-ledger.mjs
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const README = "README.md";
const DICT = "i18n/dictionaries.ts";
const DASH = "features/dashboard/Dashboard.tsx";
const MGR = "features/manager/ManagerOS.tsx";

const read = (p) => readFileSync(p, "utf8");

// --- The outstanding list: a marked block in the README. --------------------------------------
const OPEN = "<!-- outstanding";
const CLOSE = "<!-- /outstanding -->";
// A defect entry: `defect <file> :: <pattern>` — the pattern must STILL be in the file.
// A task entry: `task` — work no scan can see.
// The entry HEAD is the first backticked span of the line; the rest of the line is the prose that
// explains it, and a wrapped continuation line (one that does not start a bullet) belongs to the
// entry above it.
const DEFECT = /^defect\s+(\S+)\s+::\s+(.+)$/;
const TASK = /^task$/;

const parseOutstanding = (markdown) => {
  const start = markdown.indexOf(OPEN);
  const end = markdown.indexOf(CLOSE);
  if (start < 0 || end < 0 || end < start) return null;
  const body = markdown.slice(start + OPEN.length, end);
  const entries = [];
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) continue;
    if (!/^\s*[-*]\s/.test(line)) continue; // a continuation of the entry above
    const head = /^\s*[-*]\s*`([^`]+)`/.exec(line);
    if (!head) return { malformed: line.trim() };
    const h = head[1].trim();
    const d = DEFECT.exec(h);
    if (d) { entries.push({ kind: "defect", file: d[1], pattern: d[2].trim() }); continue; }
    if (TASK.test(h)) { entries.push({ kind: "task", text: h }); continue; }
    return { malformed: line.trim() };
  }
  return { entries };
};

// --- 1. Plants: arm the reader, so a "well-formed"/"rejected" verdict is measured. --------------
const planted = parseOutstanding([
  "<!-- outstanding",
  "",
  "- `defect features/dashboard/Dashboard.tsx :: \"News →\"` — a planted defect entry",
  "- `task` — a planted task entry",
  "",
  "<!-- /outstanding -->",
].join("\n"));
const plantedDefect = planted && planted.entries ? planted.entries[0] : null;
const plantedTask = planted && planted.entries ? planted.entries[1] : null;
const malformed = parseOutstanding("<!-- outstanding\n- nonsense entry\n<!-- /outstanding -->");
ok(`the ledger reader is armed (a planted defect entry reads ${plantedDefect ? `${plantedDefect.file} :: ${plantedDefect.pattern}` : "nothing"}, a planted task entry reads ${plantedTask ? "yes" : "no"}, a malformed entry is caught ${malformed && malformed.malformed ? "yes" : "no"}; a ledger with no block at all reads ${parseOutstanding("no block here") === null ? "null" : "something"})`,
  !!plantedDefect && plantedDefect.file === "features/dashboard/Dashboard.tsx" &&
  !!plantedTask && plantedTask.kind === "task" &&
  malformed !== null && !!malformed.malformed && parseOutstanding("no block here") === null);

// --- 2. The ledger carries a well-formed outstanding list. ------------------------------------
const ledger = read(README);
const outstanding = parseOutstanding(ledger);
ok(`the ledger carries a well-formed outstanding list (${outstanding === null ? "NO BLOCK" : outstanding.malformed ? `malformed: ${outstanding.malformed}` : `${outstanding.entries.length} entry/entries [${outstanding.entries.map((e) => e.kind).join(", ")}]`})`,
  outstanding !== null && !outstanding.malformed && outstanding.entries.length >= 1);

// --- 3. ARM 1: every defect entry is STILL OUTSTANDING. A resolved pattern means the ledger is
// --- claiming a defect that is not there — the exact failure M405 found. ----------------------
const defectEntries = outstanding && outstanding.entries ? outstanding.entries.filter((e) => e.kind === "defect") : [];
const taskEntries = outstanding && outstanding.entries ? outstanding.entries.filter((e) => e.kind === "task") : [];
const resolvedEntries = [];
for (const e of defectEntries) {
  let present = false;
  try { present = read(e.file).includes(e.pattern); } catch { present = false; }
  if (!present) resolvedEntries.push(`${e.file} :: ${e.pattern}`);
}
ok(`every defect the ledger still lists is STILL outstanding — a resolved one is a stale claim (${defectEntries.length} defect entry/entries, ${taskEntries.length} task entry/entries; resolved ${resolvedEntries.length} [${resolvedEntries.join("; ")}])`,
  resolvedEntries.length === 0);

// --- 4. ARM 2: THE WITHDRAWAL, charged. The M405 note withdrew five specific claims, and each is
// --- resolved against the tree here — a withdrawal that is not charged is a promise. ------------
// (a) the Dashboard's "% confidence" suffix: the row is translated in all three locales.
const dict = read(DICT);
const confRows = [...dict.matchAll(/"dash\.confidence":\s*"([^"]*)"/g)].map((m) => m[1]);
// (b) the Dashboard's "News →" link: no such literal in the file.
const dashSrc = read(DASH);
const newsLiteral = /"News|News →|>News</.test(dashSrc);
// (c) the Manager OS tab strip: it reads its labels through t(), not stored text.
const mgrSrc = read(MGR);
const tabStrip = /const TABS[\s\S]{0,600}?labelKey/.test(mgrSrc) && /t\(entry\.labelKey\)/.test(mgrSrc);
// (d) the unreachable-label count: the ledger must not still claim it in the PRESENT TENSE. The
//     historical form ("17 unreachable labels WERE outstanding at this point") is a true statement
//     about M144 and is allowed; the stale form ("... remain") is the claim being withdrawn.
const staleCountForm = /unreachable labels remain/.test(ledger);
// (e) the audit's "permanent gate": the reachability gate is in the suite.
const gatePresent = read("scripts/proof-i18n.mjs").includes("every dictionary key is reachable");
ok(`the withdrawn claims are all RESOLVED, each checked against the tree: the confidence row is translated in every locale (${confRows.length} rows: ${confRows.map((r) => JSON.stringify(r)).join(" | ")}), the Dashboard holds no "News" literal (${newsLiteral ? "IT DOES" : "none"}), the Manager OS tab strip reads its labels through t() (${tabStrip ? "yes" : "NO"}), the ledger still claims the unreachable count in the present tense (${staleCountForm ? "IT DOES" : "no"}), and the reachability gate is in the suite (${gatePresent ? "yes" : "NO"})`,
  confRows.length === 3 && confRows.every((r) => r.length > 0) && !newsLiteral && tabStrip &&
  !staleCountForm && gatePresent);

// --- 5. The gate is ARMED both ways: a planted ledger carrying a resolved claim must be
// --- REJECTED, and a planted ledger carrying a pattern that IS still there must be ACCEPTED. ---
const plantResolved = parseOutstanding([
  "<!-- outstanding",
  "",
  "- `defect features/dashboard/Dashboard.tsx :: \"News →\"` — one of the WITHDRAWN claims",
  "",
  "<!-- /outstanding -->",
].join("\n"));
const plantResolvedMiss = plantResolved && plantResolved.entries
  ? plantResolved.entries.filter((e) => e.kind === "defect" && !read(e.file).includes(e.pattern)).length : 0;
const plantAccepted = parseOutstanding([
  "<!-- outstanding",
  "",
  "- `defect features/dashboard/Dashboard.tsx :: dash.allBadges` — a pattern that IS still there",
  "",
  "<!-- /outstanding -->",
].join("\n"));
const plantAcceptedHit = plantAccepted && plantAccepted.entries
  ? plantAccepted.entries.filter((e) => e.kind === "defect" && read(e.file).includes(e.pattern)).length : 0;
ok(`the gate is armed both ways: a planted ledger carrying one of the WITHDRAWN claims is rejected (${plantResolvedMiss} resolved entry/entries it would report), and a planted ledger carrying a pattern that IS still there is accepted (${plantAcceptedHit} outstanding entry/entries it would keep)`,
  plantResolvedMiss === 1 && plantAcceptedHit === 1);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
