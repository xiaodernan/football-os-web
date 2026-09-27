// The proof runner's verdict logic, shared by scripts/run-proofs.mjs (which
// applies it) and scripts/proof-runner.mjs (which has to test it). Keeping it
// in one module is the point: a proof that re-implemented the classifier would
// be able to pass while the real runner mis-classified every script.
//
// Before M198 the runner judged a proof by exit code alone and printed "?/?
// checks" for anything that had not printed a tally. That conflated three
// different events — a contract failure, a script that died or was killed
// before reporting, and a script that reported every check green and then
// exited non-zero anyway (seen twice on proof:projection, from Vite's dep-scan
// rejecting after the SSR server closed). The first is a red the suite exists
// to find; the other two mean "no evidence was produced", and a suite that
// calls them the same thing cannot be trusted to distinguish "fine" from
// "nobody looked".
//
// M199 added the fourth no-evidence event, which was absent above only because
// nothing had ever hit it: `spawnSync` with no timeout waits forever, so a proof
// that hangs — a Vite SSR server that never closes is the local candidate — stops
// the suite before it prints a single line. The runner now arms a time budget per
// script, and a stopped script gets its own codes rather than `spawn-failed`,
// because "never started" and "ran, printed everything, then hung" are different
// faults with different fixes.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const VERDICT = { PASS: "PASS", FAIL: "FAIL", UNVERIFIED: "UNVERIFIED" };

// A proof file is `proof-<name>.mjs`; anything else in the scripts dir (helpers,
// notes, a leftover `.txt`) is not a proof and must never be spawned as one.
export const PROOF_FILE = /^proof-(.+)\.mjs$/;

// Proofs print their tally as the last thing they do. The global flag is for
// matchAll below; the LAST occurrence wins, because a proof is allowed to echo
// output it captured from another process (proof-runner dumps a fixture's
// runner log while diagnosing) and an earlier, borrowed tally must not stand in
// for the one this script actually printed about itself.
const TALLY = /(\d+)\/(\d+) checks passed/g;

export function tallyOf(out) {
  let last = null;
  for (const m of String(out).matchAll(TALLY)) last = m;
  if (!last) return null;
  return { pass: Number(last[1]), total: Number(last[2]), text: `${last[1]}/${last[2]}` };
}

// Discovery is a function of the directory, so a proof of the runner can point
// it at a tree of deliberately broken fake proofs without touching the repo's.
export function findProofs(dir) {
  return readdirSync(dir)
    .filter((f) => PROOF_FILE.test(f))
    .sort();
}

// `run` is the shape spawnSync returns: status/signal/error plus the merged
// stdout+stderr the caller collected, and `timeoutMs` when the caller armed one.
// Returns { verdict, code, checks, reason }. `code` is the stable identifier —
// the proof asserts on it, not on the prose.
export function classifyProofRun({ status, signal, error, out, timeoutMs }) {
  const tally = tallyOf(out ?? "");
  const checks = tally ? tally.text : "no tally";
  if (error) {
    // Measured on this platform: a spawnSync timeout arrives as
    // { status: null, signal: "SIGTERM", error.code: "ETIMEDOUT" } and keeps the
    // output the child had already written, so the tally below can still be read.
    if (error.code === "ETIMEDOUT") {
      return tally
        ? at(VERDICT.UNVERIFIED, "timed-out-after-tally", checks,
            `the runner stopped it after its ${timeoutMs ?? "configured"}ms budget — it printed ${tally.text} and then hung`)
        : at(VERDICT.UNVERIFIED, "timed-out", checks,
            `the runner stopped it after its ${timeoutMs ?? "configured"}ms budget before it reported a tally`);
    }
    return at(VERDICT.UNVERIFIED, "spawn-failed", checks,
      `the script never started (${error.code ?? error.message ?? "unknown spawn error"})`);
  }
  if (signal) {
    // Every code the classifier can emit is a literal in the second argument of an
    // at() call, on purpose: scripts/proof-runner.mjs reads this module's source to
    // list them, so a code hidden behind a ternary or a variable is invisible to the
    // census that proves the truth table covers them all.
    return tally
      ? at(VERDICT.UNVERIFIED, "killed-after-tally", checks,
          `killed by ${signal} after printing its tally`)
      : at(VERDICT.UNVERIFIED, "killed-before-tally", checks,
          `killed by ${signal} without reporting a tally`);
  }
  if (status === null || status === undefined) {
    return at(VERDICT.UNVERIFIED, "no-exit-status", checks,
      "the process ended without reporting an exit status");
  }
  if (!tally) {
    return status === 0
      ? at(VERDICT.UNVERIFIED, "no-tally-green-exit", checks,
          "exited 0 without ever printing a tally — no check was counted")
      : at(VERDICT.UNVERIFIED, "no-tally-nonzero-exit", checks,
          `exited ${status} without printing a tally — the script died mid-run`);
  }
  if (tally.total === 0) {
    return at(VERDICT.UNVERIFIED, "zero-checks", checks,
      "reported a tally of 0 checks — a proof that checked nothing is not evidence");
  }
  if (tally.pass === tally.total) {
    return status === 0
      ? at(VERDICT.PASS, "green", checks, `${tally.total} of ${tally.total} checks passed`)
      : at(VERDICT.UNVERIFIED, "died-after-green", checks,
          `printed all ${tally.total} checks green and still exited ${status} — ` +
            "that is a process death or a post-tally error, not a contract failure");
  }
  const red = tally.total - tally.pass;
  return status === 0
    ? at(VERDICT.FAIL, "red-exited-green", checks,
        `${red} of ${tally.total} checks failed but the script exited 0 — it forgot its own exit code`)
    : at(VERDICT.FAIL, "checks-failed", checks, `${red} of ${tally.total} checks failed`);
}

// Every proof has to leave the runner one unambiguous signal: a tally as its
// last word, and an exit driven by the counter that tally reads. The classifier
// depends on that habit (it takes the LAST tally in the output), so it is
// checked per file rather than assumed. Returns the offenders plus the counter
// names actually in use, so a caller can see the check is not keyed to one
// spelling without re-implementing the judgement.
export function proofDiscipline(dir, files = findProofs(dir)) {
  const issues = [];
  const counters = new Set();
  for (const f of files) {
    const src = readFileSync(join(dir, f), "utf8");
    const line = src.slice(src.lastIndexOf("console.log(")).split("\n")[0];
    if (!/console\.log\(/.test(src) || !/checks passed/.test(line)) {
      issues.push(`${f}: its last console.log is not a tally`);
      continue;
    }
    const exit = src.match(/process\.exit\(\s*([A-Za-z_$][\w$]*)\s*\?\s*1\s*:\s*0\s*\)/);
    if (!exit) issues.push(`${f}: no process.exit(<count> ? 1 : 0)`);
    else if (!line.includes(exit[1])) issues.push(`${f}: exits on "${exit[1]}", which its tally line never mentions`);
    else counters.add(exit[1]);
  }
  return { issues, counters: [...counters].sort() };
}

function at(verdict, code, checks, reason) {
  return { verdict, code, checks, reason };
}
