// Proof runner: the repo carries many scripts/proof-*.mjs contract checks but
// had no single gate, so a refactor could silently break one. This discovers
// every proof, runs each in its own process (they each spin up their own Vite
// SSR server), and exits non-zero unless every one of them came back PROVEN.
//
// M198 gave it three verdicts instead of a boolean, because exit code 1 covers
// several very different events and only one of them is a broken contract:
//   PASS         — printed a tally, every check in it green, exited 0
//   FAIL         — a check it counted came back red (a contract failure)
//   UNVERIFIED   — no evidence: never started, killed, died before its tally,
//                  exited 0 without one, counted 0 checks, printed all green and
//                  then died anyway, or ran past its time budget (M199)
// All three non-green cases keep the suite red; what changed is that the line
// now says which one happened. Pass a directory as argv[2] to run a different
// set of proofs — scripts/proof-runner.mjs uses that seam to point the runner
// at fake proofs that emit each signature on purpose.
//
// M203 added the retry policy: a script that produced NO evidence is given one more
// attempt, because the observed dep-scan crash kills a proof after its tally, and a
// single re-run tells that apart from a script that reliably cannot finish. PASS is
// never re-run and a counted red is never re-run — only the absence of evidence is.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { VERDICT, classifyProofRun, findProofs, tallyOf } from "./lib/proofRunner.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const target = process.argv[2] ? resolve(process.argv[2]) : here;

let proofs;
try {
  proofs = findProofs(target);
} catch (err) {
  console.error(`Cannot read the proof directory ${target}: ${err.message}`);
  process.exit(1);
}

if (proofs.length === 0) {
  console.error(`No proof-*.mjs scripts found in ${target}.`);
  process.exit(1);
}

const rows = [];
const pad = Math.max(...Object.values(VERDICT).map((v) => v.length));
// M199: every proof gets a time budget. Without one, a script that hangs — a Vite
// SSR server that never closes is the plausible shape here — keeps `spawnSync`
// waiting forever, so the suite prints nothing at all and has to be killed by
// hand. The budget is deliberately far above any real runtime: walking all 30
// proofs one at a time on an idle machine, the slowest took 24.9s (this file's own
// proof) and the median about 3s, so ten minutes is ~24× the slowest observed
// script while still being a finite wait. PROOF_TIMEOUT_MS overrides it, which
// exists so scripts/proof-runner.mjs can watch a timeout fire in seconds rather
// than waiting in the dark for the real budget.
const timeoutMs = Number(process.env.PROOF_TIMEOUT_MS) || 600_000;
// M203: one retry, and only for the no-evidence case. Vite's dependency scan has been
// observed to kill a proof AFTER it printed a complete, all-green tally (exit
// 0xC0000005 / 0xC0000409) — the measurement finished, the process did not. That is the
// one red this suite cannot mean as a red, and a single re-run distinguishes it from
// anything systematic. PASS is never re-run (it already has its evidence) and FAIL is
// never re-run (a counted red must not be able to flake away). PROOF_ATTEMPTS overrides
// the budget for scripts/proof-runner.mjs, which counts actual spawns.
const maxAttempts = Number(process.env.PROOF_ATTEMPTS) || 2;
// The tally of a script that never reported one says so in words, so the line
// reads "(no tally)" rather than "(no tally checks)".
const label = (row) => (row.checks === "no tally" ? "no tally" : `${row.checks} checks`);
// The aggregate check count is printed so a milestone's suite number comes from
// the tool that ran the suite instead of from someone adding up the lines.
const totals = { pass: 0, total: 0 };

for (const file of proofs) {
  let attempts = 0;
  let row = null;
  let out = "";
  for (;;) {
    attempts += 1;
    const res = spawnSync(process.execPath, [join(target, file)], { encoding: "utf8", timeout: timeoutMs });
    out = `${res.stdout ?? ""}${res.stderr ?? ""}`;
    row = classifyProofRun({ status: res.status, signal: res.signal, error: res.error, out, timeoutMs });
    // Only a script that produced NO evidence is worth a second try.
    if (row.verdict !== VERDICT.UNVERIFIED || attempts >= maxAttempts) break;
  }
  const tally = tallyOf(out);
  if (tally) {
    totals.pass += tally.pass;
    totals.total += tally.total;
  }
  rows.push({ file, row, out, attempts });
  const retryNote = attempts > 1
    ? (row.verdict === VERDICT.PASS ? `  (recovered on attempt ${attempts})` : `  (${attempts} attempts, no evidence either time)`)
    : "";
  console.log(
    `${row.verdict.padEnd(pad)}  proof:${file.replace(/^proof-|\.mjs$/g, "")}  ` +
      `(${label(row)})` +
      (row.verdict === VERDICT.PASS ? "" : `  [${row.code}] ${row.reason}`) +
      retryNote
  );
}

const green = rows.filter((r) => r.row.verdict === VERDICT.PASS).length;
const failed = rows.filter((r) => r.row.verdict === VERDICT.FAIL);
const unverified = rows.filter((r) => r.row.verdict === VERDICT.UNVERIFIED);
const retried = rows.filter((r) => r.attempts > 1);

console.log(`\n${green}/${rows.length} proof scripts proven (${totals.pass}/${totals.total} checks counted)`);
if (retried.length) {
  console.log(`${retried.length} script(s) needed a retry: ${retried.map((r) => `${r.file.replace(/^proof-|\.mjs$/g, "")}×${r.attempts - 1}`).join(", ")}`);
}
if (failed.length || unverified.length) {
  console.log(
    `${failed.length} contract failure(s)` +
      (unverified.length ? ` · ${unverified.length} unverified (no evidence produced)` : "")
  );
}

for (const { file, row, out, attempts } of rows) {
  if (row.verdict === VERDICT.PASS) continue;
  console.error(`\n===== ${file} output [${row.code}]${attempts > 1 ? ` after ${attempts} attempts` : ""} =====\n${out.trimEnd()}`);
}

process.exit(green === rows.length ? 0 : 1);
