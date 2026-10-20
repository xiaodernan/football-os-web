// Proof for the ledger's own holes — the class that let M405 ship a measurement paragraph reading
// `__GAUGE__` while the two SOURCE files that section describes were never committed, so HEAD's own
// gate ran red behind a green worktree.
//
// The shape being refused. A milestone section is allowed to say anything about the code it
// describes; nothing read it back. Two cheap, structural sub-claims cover most of the damage:
//
//   · a paragraph that OPENs with "**What the gauge says.**" is a promise that a measurement
//     follows. A scratch token in that slot is the hole the record actually shipped, and a
//     sentence of prose with no figure in it is the same hole wearing better clothes.
//   · an unsubstituted placeholder — `__` plus an uppercase run plus `__` — cannot survive into
//     the file a reader opens. The uppercase run is the convention a draft leaves behind; a
//     lowercase dunder (`__dirname`, `__proto__`) is the ledger quoting code and is NOT charged.
//
// Clause 6 goes one step further and reads the record against an artifact instead of against
// prose: where a section names a gate and states how many clauses it has, the census counts the
// clause calls in that file — lines that OPEN with `ok(` — because a mention inside a comment or a
// sentence is a file talking about its clauses, not one of them. This is the only clause that
// could catch M405's other half — a section whose numbers are about a gate the repository does
// not carry; and a charged section that makes no such claim reads RED, not green.
//
// The honest limit: the census runs on the file as it sits on disk, so it cannot tell a section
// spliced into the wrong revision from one spliced correctly, and it charges the placeholder
// spelling and the gauge lead only — "TBD", "FIXME" or a measurement paragraph in some other
// phrasing walks free.
//
// Run: node scripts/proof-gauge-hole.mjs
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const README = join(root, "README.md");
const src = readFileSync(README, "utf8");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// An unsubstituted scratch token: `__` + an uppercase run + `__`.
const TOKEN = /__[A-Z][A-Z0-9_]*__/g;
// Charged only where a reader SEES it. The ledger quotes its own damage on purpose (the section
// that closes a hole names the token it closed), so a marker inside a code span or a fence is
// prose about a
// hole, not a hole -- the same shielding `proof-record` needs for headings it quotes. A bare
// token in narrative is the thing that reads as a measurement, and that is what is refused.
const shieldCode = (text) => {
  const out = [];
  let inFence = false;
  for (const raw of text.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(raw)) { inFence = !inFence; out.push(""); continue; }
    out.push(inFence ? "" : raw.replace(/`[^`\n]*`/g, "``"));
  }
  return out.join("\n");
};
const scanTokens = (text) => [...shieldCode(text).matchAll(TOKEN)];
const countEverywhere = (text) => (text.match(TOKEN) || []).length;
// The measurement promise, and the figure that has to answer it. The window is a paragraph, and a
// paragraph is whatever runs to the next blank line; 2,500 is a ceiling on that, not a style rule —
// a lead whose own text is longer than this is a paragraph a reader cannot finish either.
const LEAD = /\*\*What the gauge says\.\*\*([\s\S]{0,2500}?)(?=\n\n|\n###|\n\*\*)/g;
const FIGURE = /\d+\/\d+/;
// A section's claim about a gate it names: the path, and the clause count stated beside it.
const NAMED_GATE = /`(scripts\/proof-[a-z0-9-]+\.mjs)`/;
const STATED_CLAUSES = /(\d+)[\s\n]*clauses/;
const HEADING = /^### (M\d+) —(.*)$/;

const lines = src.split(/\r?\n/);
const sections = lines.map((l) => (l.match(HEADING) || [])[1]).filter(Boolean);

// --- 1. Every scan is armed, and the two exempted spellings stay exempt. ---
const pToken = (s) => scanTokens(s).length;
const plantToken = pToken("**What the gauge says.** __GAUGE__\n");
const plantFilled = pToken("**What the gauge says.** 81/81 proof scripts proven\n");
const plantLower = pToken("the shim reads __dirname and __proto__ here, outside any span\n");
const plantMixedCase = pToken("a draft marker like __gaUGE__ is prose\n");
const plantQuoted = pToken("the ledger quotes its own damage: `__GAUGE__` was the hole\n");
const plantFenced = pToken("```text\n__GAUGE__\n```\n");
const leadCount = (s) => (s.match(LEAD) || []).length;
const pLeadFigure = (s) => {
  const m = [...s.matchAll(LEAD)];
  return m.filter((x) => FIGURE.test(x[1])).length;
};
const plantLeadHole = pLeadFigure("**What the gauge says.** __GAUGE__\n\n### M2 — x\n");
const plantLeadFilled = pLeadFigure("**What the gauge says.** came back 81/81 proven\n\n### M2 — x\n");
const plantLeadProse = pLeadFigure("**What the gauge says.** the suite is green and the build ships\n\n### M2 — x\n");
ok(`the scans are armed: a placeholder reads as a hole and a filled paragraph does not, a lowercase dunder and a quoted or fenced marker are prose, and a lead is charged for its FIGURE not its words (token plants bare ${plantToken}, filled ${plantFilled}, lowercase dunder ${plantLower}, mixed case ${plantMixedCase}, in backticks ${plantQuoted}, in a fence ${plantFenced}; lead-with-hole figure ${plantLeadHole}, lead-with-figure ${plantLeadFilled}, lead-with-prose ${plantLeadProse})`,
  plantToken === 1 && plantFilled === 0 && plantLower === 0 && plantMixedCase === 0 &&
  plantQuoted === 0 && plantFenced === 0 &&
  plantLeadHole === 0 && plantLeadFilled === 1 && plantLeadProse === 0);

// --- 2. The population floor. "0 placeholders" is also what an empty read says. ---
const leadTotal = leadCount(src);
ok(`the census reads the real ledger (${lines.length} lines, floor 9,000; ${sections.length} milestone headings, floor 150; ${leadTotal} gauge leads, floor 2)`,
  lines.length >= 9000 && sections.length >= 150 && leadTotal >= 2);

// --- 3. THE LEDGER HAS NO HOLE: no unsubstituted placeholder survives in the prose a reader opens. ---
const found = scanTokens(src);
const tokens = found.map((m) => `${m[0]}@line ${src.slice(0, m.index).split(/\r?\n/).length}`);
const everywhere = countEverywhere(src);
ok(`no milestone section ships a scratch placeholder in its prose (${tokens.length} bare${tokens.length ? `: ${tokens.join(", ")}` : ""}, ${everywhere} counting the ones inside code spans and fences, which are the ledger talking ABOUT a hole; the same reader on the spelling this file was drafted with reads ${plantToken}, on a quoted one ${plantQuoted}, on the filled form ${plantFilled})`,
  tokens.length === 0 && plantToken === 1 && plantQuoted === 0 && plantFilled === 0);

// --- 4. Every measurement promise is answered by a measurement. A lead followed by confident ---
// --- prose is the same defect the token was, dressed up, so the clause asks for a figure. ---
const holes = [];
for (const m of src.matchAll(LEAD)) {
  if (!FIGURE.test(m[1])) {
    holes.push(`line ${src.slice(0, m.index).split(/\r?\n/).length}: "${m[1].replace(/\s+/g, " ").trim().slice(0, 40)}"`);
  }
}
ok(`every "**What the gauge says.**" paragraph carries a measured reading (${leadTotal} leads, ${leadTotal - holes.length} answered, ${holes.length} empty${holes.length ? `: ${holes.join("; ")}` : ""}; planted hole answers ${plantLeadHole}, planted figure answers ${plantLeadFilled}, planted prose-only lead answers ${plantLeadProse})`,
  holes.length === 0 && leadTotal >= 2 && plantLeadHole === 0 && plantLeadFilled === 1);

// --- 5. The readers SUM rather than answer "is there any": the same bytes counted twice must ---
// --- read twice, otherwise a section that doubled would still pass clauses 3 and 4. ---
const m405 = src.slice(src.search(/^### M405 — /m), src.search(/^### M404 — /m));
const doubledToken = pToken(m405 + m405);
const doubledLead = leadCount(m405 + m405);
const singleLead = leadCount(m405);
ok(`the readers tally, they do not merely detect (M405's own text: ${singleLead} lead(s) once, ${doubledLead} counted twice; a placeholder pasted twice reads ${pToken("__GAUGE__\n__GAUGE__\n")} and this file's own text once reads ${pToken(src)})`,
  doubledLead === singleLead * 2 && doubledToken === 0 && pToken("__GAUGE__\n__GAUGE__\n") === 2 && pToken(src) === 0);

// --- 6. The record's claim about a GATE is read against that gate. M405 says its census has ---
// --- eleven clauses; the only honest witness is the file it names. A section that states a ---
// --- count for a script the repository does not carry, states the wrong count for one it does, ---
// --- or carries no claim at all is prose ahead of the artifact — and "no claim yet" must read ---
// --- RED, because a clause that is green while the thing it charges is missing witnesses ---
// --- nothing. This is the clause that bit M405's other half. ---
const readClaim = (text) => {
  const gate = (text.match(NAMED_GATE) || [])[1];
  const stated = +(text.match(STATED_CLAUSES) || [])[1];
  if (!gate || !Number.isFinite(stated)) return { verdict: "no-claim", gate, stated };
  if (!existsSync(join(root, gate))) return { verdict: "absent-gate", gate, stated };
  const actual = (readFileSync(join(root, gate), "utf8").match(/^[ \t]*ok\(/gm) || []).length;
  return { verdict: actual === stated ? "match" : "mismatch", gate, stated, actual };
};
// The population is derived, not pinned: M405's claim, plus every section that names THIS file —
// whichever milestone ends up owning the repair has to state its clause count where it names it.
const SELF = "scripts/proof-gauge-hole.mjs";
const heads = [];
lines.forEach((l, i) => { if (HEADING.test(l)) heads.push(i); });
const charged = heads
  .map((start, k) => ({
    ms: lines[start].match(HEADING)[1],
    body: lines.slice(start, k + 1 < heads.length ? heads[k + 1] : lines.length).join("\n"),
  }))
  .filter((b) => b.ms === "M405" || b.body.includes(SELF))
  .map((b) => ({ ms: b.ms, ...readClaim(b.body) }));
const plant = (text) => readClaim(text).verdict;
const pMatch = plant("the gate `scripts/proof-command-entry.mjs` is new: 11\nclauses");
const pHerald = plant("the gate `scripts/proof-command-entry.mjs` is new: 9 clauses");
const pAbsent = plant("the gate `scripts/proof-nope.mjs` is new: 3 clauses");
const pNoClaim = plant("the gate is new and its gauge paragraph is unfilled");
ok(`every section that states a clause count for the gate it names is counted FROM that gate (${charged.map((c) => `${c.ms}: ${c.verdict}${c.gate ? ` ${c.gate} states ${c.stated}, counted ${c.actual}` : ""}`).join("; ")}; ${charged.length} charged, floor 2; planted exact reads ${pMatch}, planted stale ${pHerald}, planted gate the repo lacks ${pAbsent}, planted section with no claim ${pNoClaim})`,
  charged.length >= 2 && charged.every((c) => c.verdict === "match") &&
  pMatch === "match" && pHerald === "mismatch" && pAbsent === "absent-gate" && pNoClaim === "no-claim");

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
