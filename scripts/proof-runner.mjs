// M198 — a proof of the proof runner.
//
// `npm run proof` is the gate every other milestone leans on, and until now it
// was itself unproven: it decided PASS/FAIL from a child's exit code alone and
// printed "?/? checks" for anything that had not printed a tally. That makes
// three different events indistinguishable on the console — a real contract
// failure, a script that died before reporting, and a script that printed every
// check green and then exited 1 anyway (seen twice on proof:projection, from
// Vite's dep-scan rejecting after the SSR server closed). Under the old rule the
// second and third looked like the first, so "the suite is red" stopped meaning
// "a contract broke", and a proof that exited 0 without ever counting a check
// looked like a pass.
//
// This file pins the replacement from both ends:
//   · the classifier, as a truth table over the shapes spawnSync can return;
//   · the runner, by spawning the REAL scripts/run-proofs.mjs against temp
//     directories of fake proofs that emit each signature on purpose.
// Fixtures live in the OS temp dir, never in scripts/, so the suite can never
// discover a fake proof and count its checks as evidence about the product.
import { mkdtempSync, writeFileSync, rmSync, readdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { VERDICT, classifyProofRun, findProofs, proofDiscipline, tallyOf, PROOF_FILE } from "./lib/proofRunner.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const RUNNER = join(here, "run-proofs.mjs");

let pass = 0;
let fail = 0;
const ok = (name, cond, detail) => {
  if (cond) {
    pass += 1;
    console.log(`ok   ${name}`);
  } else {
    fail += 1;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

const dirs = [];
const scratch = (files) => {
  const dir = mkdtempSync(join(tmpdir(), "football-os-proof-runner-"));
  for (const [name, src] of Object.entries(files)) writeFileSync(join(dir, name), src);
  dirs.push(dir);
  return dir;
};

// ---------------------------------------------------------------------------
// 1. The truth table. Every row states the spawnSync-shaped input and the
//    verdict + code the contract owes it; nothing here is read back from the
//    implementation, so a change to the classifier has to disagree with intent.
// ---------------------------------------------------------------------------
const T = [
  // name, run, verdict, code
  ["all green, exited 0", { status: 0, signal: null, error: null, out: "ok a\nok b\n2/2 checks passed\n" }, VERDICT.PASS, "green"],
  ["all green, exited 1 anyway", { status: 1, signal: null, error: null, out: "2/2 checks passed\n" }, VERDICT.UNVERIFIED, "died-after-green"],
  ["all green, exited 2", { status: 2, signal: null, error: null, out: "42/42 checks passed\n" }, VERDICT.UNVERIFIED, "died-after-green"],
  ["some red, exited 1", { status: 1, signal: null, error: null, out: "3/5 checks passed\n" }, VERDICT.FAIL, "checks-failed"],
  ["some red, exited 0 (forgot its code)", { status: 0, signal: null, error: null, out: "1/4 checks passed\n" }, VERDICT.FAIL, "red-exited-green"],
  ["no tally, exited 0", { status: 0, signal: null, error: null, out: "booting vite...\n" }, VERDICT.UNVERIFIED, "no-tally-green-exit"],
  ["no tally, exited 1", { status: 1, signal: null, error: null, out: "" }, VERDICT.UNVERIFIED, "no-tally-nonzero-exit"],
  ["empty output, exited 0", { status: 0, signal: null, error: null, out: "" }, VERDICT.UNVERIFIED, "no-tally-green-exit"],
  ["0/0 checks, exited 0", { status: 0, signal: null, error: null, out: "0/0 checks passed\n" }, VERDICT.UNVERIFIED, "zero-checks"],
  ["killed before reporting", { status: null, signal: "SIGKILL", error: null, out: "booting vite...\n" }, VERDICT.UNVERIFIED, "killed-before-tally"],
  ["killed after reporting", { status: null, signal: "SIGKILL", error: null, out: "7/7 checks passed\n" }, VERDICT.UNVERIFIED, "killed-after-tally"],
  ["no exit status at all", { status: null, signal: null, error: null, out: "5/5 checks passed\n" }, VERDICT.UNVERIFIED, "no-exit-status"],
  ["never started (ENOENT)", { status: null, signal: null, error: Object.assign(new Error("spawn boom"), { code: "ENOENT" }), out: "" }, VERDICT.UNVERIFIED, "spawn-failed"],
  ["never started (no code)", { status: null, signal: null, error: new Error("spawn boom"), out: "" }, VERDICT.UNVERIFIED, "spawn-failed"],
  // M199: a spawnSync timeout is reported as an error too, but it is a different
  // fault — the script DID start, and on this platform it arrives with SIGTERM and
  // whatever it had already printed. Measured, not assumed (see the end-to-end
  // budget section below, which arms a real 1500ms timeout against a hung child).
  ["stopped by the budget, nothing reported", { status: null, signal: "SIGTERM", error: Object.assign(new Error("spawnSync node ETIMEDOUT"), { code: "ETIMEDOUT" }), out: "booting vite...\n", timeoutMs: 600000 }, VERDICT.UNVERIFIED, "timed-out"],
  ["stopped by the budget after its tally", { status: null, signal: "SIGTERM", error: Object.assign(new Error("spawnSync node ETIMEDOUT"), { code: "ETIMEDOUT" }), out: "9/9 checks passed\n", timeoutMs: 600000 }, VERDICT.UNVERIFIED, "timed-out-after-tally"],
];

for (const [name, run, verdict, code] of T) {
  const got = classifyProofRun(run);
  ok(`classify: ${name} → ${verdict} [${code}] (got ${got.verdict} [${got.code}])`, got.verdict === verdict && got.code === code);
}

// PASS has to require every part of the evidence at once: swap any single input
// and the row must stop being green. This is the non-vacuity clause — a
// classifier that ignored the exit code, or the tally, or the red count would
// still print a lot of PASSes without it.
const GREEN = { status: 0, signal: null, error: null, out: "6/6 checks passed\n" };
const SWAPS = [
  ["exit code becomes 1", { ...GREEN, status: 1 }],
  ["exit code becomes null", { ...GREEN, status: null }],
  ["a signal appears", { ...GREEN, signal: "SIGTERM" }],
  ["an error appears", { ...GREEN, error: new Error("boom") }],
  ["the tally goes missing", { ...GREEN, out: "nothing counted\n" }],
  ["one check turns red", { ...GREEN, out: "5/6 checks passed\n" }],
  ["the tally turns vacuous", { ...GREEN, out: "0/0 checks passed\n" }],
];
const staysGreen = SWAPS.filter(([, run]) => classifyProofRun(run).verdict === VERDICT.PASS);
ok(`PASS needs all four at once: 6/6 green, exit 0, no signal, no error — and each of the ${SWAPS.length} single-input swaps below breaks it (${staysGreen.length} still green)`,
  staysGreen.length === 0);
ok(`and exactly one row of the ${T.length}-row truth table is a PASS, so a green line always means the same thing`,
  T.filter(([, , v]) => v === VERDICT.PASS).length === 1);
const FAILS = T.filter(([, , v]) => v === VERDICT.FAIL);
ok(`every verdict is one of the three, and only the ${FAILS.length} rows that report a counted red line are FAIL (the rest of the non-green rows produced no evidence)`,
  T.every(([, , v]) => v === VERDICT.PASS || v === VERDICT.FAIL || v === VERDICT.UNVERIFIED) &&
    FAILS.length === 2 &&
    FAILS.every(([name, , , code]) => code === "checks-failed" || code === "red-exited-green") &&
    T.filter(([, , v]) => v === VERDICT.UNVERIFIED).every(([, , , code]) => code !== "checks-failed" && code !== "red-exited-green"));
ok("a contract failure is only called that when a check was counted and came back red — dying is never one",
  T.every(([, , v, code]) => (code === "checks-failed" || code === "red-exited-green") === (v === VERDICT.FAIL)));

// The truth table and the classifier are two lists of codes, and either can drift
// alone: a code the classifier can emit that no row asks about is unexercised, and
// a row that asks about a code nothing emits is a description of a machine that
// does not exist. Read the shipped inventory out of the module instead of retyping
// it, so both directions are gated.
{
  const lib = readFileSync(join(here, "lib", "proofRunner.mjs"), "utf8");
  const shipped = [...lib.matchAll(/at\(VERDICT\.\w+,\s*"([a-z-]+)"/g)].map((m) => m[1]).sort();
  const tabled = T.map(([, , , code]) => code);
  const unexercised = shipped.filter((c) => !tabled.includes(c));
  const invented = [...new Set(tabled)].filter((c) => !shipped.includes(c));
  ok(`the table exercises every code the shipped classifier can emit and invents none (${shipped.length} codes: ${shipped.join(", ")}${unexercised.length ? ` — unexercised: ${unexercised.join(", ")}` : ""}${invented.length ? ` — invented: ${invented.join(", ")}` : ""})`,
    shipped.length >= 11 && unexercised.length === 0 && invented.length === 0);
  // A timeout arrives as an error too, so the two families must not collapse into
  // one code: "never started" and "started, printed, then hung" are different faults.
  const hung = T.filter(([, run]) => run.error?.code === "ETIMEDOUT");
  const dead = T.filter(([, run]) => run.error && run.error.code !== "ETIMEDOUT");
  ok(`and an ETIMEDOUT error is never read as spawn-failed: ${hung.length} timeout rows and ${dead.length} never-started rows keep ${new Set([...hung, ...dead].map(([, , , c]) => c)).size} distinct codes between them`,
    hung.length === 2 && dead.length === 2 &&
      hung.every(([, , , c]) => c.startsWith("timed-out")) &&
      dead.every(([, , , c]) => c === "spawn-failed"));
}

// ---------------------------------------------------------------------------
// 2. tallyOf: which tally wins, and what counts as one.
// ---------------------------------------------------------------------------
ok("tallyOf reads the LAST tally, not the first, because a proof may echo output it captured from elsewhere",
  JSON.stringify(tallyOf("9/9 checks passed\nsub-run said 4/4 checks passed\n2/3 checks passed\n")) === JSON.stringify({ pass: 2, total: 3, text: "2/3" }));
ok("tallyOf returns null on output with no tally", tallyOf("hello\n") === null);
ok("tallyOf is not fooled by a near-miss: '4/4 checks' or 'checks passed' without a count",
  tallyOf("(4/4 checks)\n") === null && tallyOf("all checks passed\n") === null);
ok("tallyOf counts what it says: 174/178 is 174 passing of 178, not 174 of 1780",
  tallyOf("174/178 checks passed").pass === 174 && tallyOf("174/178 checks passed").total === 178);
ok("tallyOf keeps leading zeros honest: 08/08 parses as 8 of 8", tallyOf("08/08 checks passed").text === "08/08" && tallyOf("08/08 checks passed").pass === 8);

// ---------------------------------------------------------------------------
// 3. Discovery: the runner must be able to point itself at another directory,
//    and must only pick up real proof files from it.
// ---------------------------------------------------------------------------
const MIXED = scratch({
  "proof-alpha.mjs": `console.log("1/1 checks passed");`,
  "proof-beta.mjs": `console.log("1/1 checks passed");`,
  "not-a-proof.mjs": `throw new Error("must never be spawned");`,
  "proof-notes.txt": `throw new Error("must never be spawned");`,
  "runner.mjs": `throw new Error("must never be spawned");`,
  "proof-gamma.mjs.bak": `throw new Error("must never be spawned");`,
});
ok(`findProofs takes exactly the proof-*.mjs files from the directory it is given (${findProofs(MIXED).length} of ${readdirSync(MIXED).length} entries)`,
  JSON.stringify(findProofs(MIXED)) === JSON.stringify(["proof-alpha.mjs", "proof-beta.mjs"]));
ok("findProofs sorts, so the runner's output order is stable across machines",
  JSON.stringify(findProofs(MIXED)) === JSON.stringify([...findProofs(MIXED)].sort()));
ok("PROOF_FILE would not accept a helper named proof, nor a proof outside the pattern",
  !PROOF_FILE.test("proofs.mjs") && !PROOF_FILE.test("proof-x.js") && !PROOF_FILE.test("lib-proof.mjs") && PROOF_FILE.test("proof-x.mjs"));
const SELF = findProofs(here);
ok(`the seam is real: pointing at the repo's own scripts dir finds ${SELF.length} proofs and they all match the pattern`,
  SELF.length >= 2 && SELF.every((f) => PROOF_FILE.test(f)));
ok(`this file is registered in its own suite (proof-runner.mjs is one of the ${SELF.length})`,
  SELF.includes("proof-runner.mjs"));

// ---------------------------------------------------------------------------
// 4. End to end: the actual runner, on fake proofs that emit each signature.
//    Every expectation below is the verdict the CONTRACT owes that shape; the
//    assertions read the runner's own stdout lines and exit code.
// ---------------------------------------------------------------------------
const FX = {
  green: `console.log("ok one");\nconsole.log("ok two");\nconsole.log("2/2 checks passed");\n`,
  contract: `console.log("FAIL something broke");\nconsole.log("3/5 checks passed");\nprocess.exit(1);\n`,
  ghost: `console.log("2/2 checks passed");\nprocess.exit(1);\n`,
  silent: `console.log("thinking hard about the contract");\n`,
  crash: `console.log("about to die");\nthrow new Error("kaboom");\n`,
  vacuous: `console.log("0/0 checks passed");\n`,
  forgotten: `console.log("FAIL a red check nobody escalated");\nconsole.log("1/4 checks passed");\n`,
  killed: `console.log("booting");\nprocess.kill(process.pid, "SIGKILL");\n`,
  nested: `console.log("sub-process log said 9/9 checks passed");\nconsole.log("2/3 checks passed");\nprocess.exit(1);\n`,
  // The shape the suite actually hits in the wild: Vite's dep-scan has segfaulted
  // real proofs (exit 139) AFTER they printed a complete, all-green tally. The
  // evidence is finished; the process is not.
  segv: `console.log("5/5 checks passed");\nprocess.kill(process.pid, "SIGKILL");\n`,
};

// Each fixture gets its own directory, so the runner's exit code is attributable
// to one verdict rather than to a mix of them.
const ONE = Object.fromEntries(Object.entries(FX).map(([k, src]) => [k, { [`proof-${k}.mjs`]: src }]));
const runOne = (key) => {
  const dir = scratch(ONE[key]);
  // The fixture is also spawned on its own, because the runner deliberately
  // does not echo a script's log unless it failed: "what did this fake proof
  // actually emit?" has to be measured against the fake, not its reporter.
  const fx = spawnSync(process.execPath, [join(dir, `proof-${key}.mjs`)], { encoding: "utf8" });
  const res = spawnSync(process.execPath, [RUNNER, dir], { encoding: "utf8" });
  return { fx, res, out: `${res.stdout ?? ""}${res.stderr ?? ""}` };
};
const LINE = /^(PASS|FAIL|UNVERIFIED)\s+proof:(\S+)\s+\((.+?)\)(?:\s+\[([a-z-]+)\]\s+(.+))?$/;
const parsed = (out) => {
  const rows = [];
  for (const line of out.split(/\r?\n/)) {
    const m = line.match(LINE);
    if (m) rows.push({ verdict: m[1], name: m[2], checks: m[3], code: m[4] ?? "green", reason: m[5] ?? "" });
  }
  return rows;
};

// The third field is what the runner's line must SAY inside its parentheses —
// the label, not the raw tally, because "no tally" is a label too.
const EXPECT = {
  green: [VERDICT.PASS, "green", "2/2 checks", 0],
  contract: [VERDICT.FAIL, "checks-failed", "3/5 checks", 1],
  ghost: [VERDICT.UNVERIFIED, "died-after-green", "2/2 checks", 1],
  silent: [VERDICT.UNVERIFIED, "no-tally-green-exit", "no tally", 1],
  crash: [VERDICT.UNVERIFIED, "no-tally-nonzero-exit", "no tally", 1],
  vacuous: [VERDICT.UNVERIFIED, "zero-checks", "0/0 checks", 1],
  forgotten: [VERDICT.FAIL, "red-exited-green", "1/4 checks", 1],
  nested: [VERDICT.FAIL, "checks-failed", "2/3 checks", 1],
};

const seen = {};
for (const key of Object.keys(FX)) seen[key] = runOne(key);

for (const [key, [verdict, code, checks, exit]] of Object.entries(EXPECT)) {
  const { res, out } = seen[key];
  const rows = parsed(out);
  const row = rows[0];
  ok(`the runner reports proof:${key} as ${verdict} [${code}] (${checks}) — one line, nothing dropped`,
    rows.length === 1 && !!row && row.verdict === verdict && row.code === code && row.checks === checks);
  ok(`and proof:${key} leaves the suite with exit ${exit}`, res.status === exit, `got ${res.status}`);
}

// The killed fixture is the one whose exact code depends on how this OS reports
// an outside signal, so its verdict is pinned and its code is measured.
{
  const { fx, res, out } = seen.killed;
  const row = parsed(out)[0];
  ok(`proof:killed really died without printing a tally (fixture status ${fx.status}, signal ${fx.signal ?? "none"})`,
    !/checks passed/.test(fx.stdout ?? "") && (fx.status !== 0 || !!fx.signal));
  ok(`and the runner still refuses to call it a pass — measured code [${row?.code ?? "none"}], verdict ${row?.verdict ?? "none"}`,
    row?.verdict === VERDICT.UNVERIFIED && row?.code !== "green");
  // An honest boundary, stated where it can be re-checked: on this platform
  // killing yourself is reported as an exit code, not a signal, so the
  // killed-before/after-tally codes are only reachable through the synthesized
  // rows in section 1. If this line ever goes red, this OS starts reporting
  // signals and the end-to-end table gains real coverage of them.
  ok(`signal reporting on this platform is measured, not assumed (fixture self-kill gave signal "${fx.signal ?? "none"}"; the killed-* codes come from the truth table${fx.signal ? " AND from this fixture" : " only"})`,
    fx.signal ? row?.code === "killed-before-tally" : true);
}

// The real-world flake, reproduced as a fixture rather than recalled from a log:
// a script whose checks all passed and then died anyway must never read as
// either a contract failure or a pass.
{
  const { fx, res, out } = seen.segv;
  const row = parsed(out)[0];
  ok(`proof:segv really printed a complete tally and then died (fixture status ${fx.status}, signal ${fx.signal ?? "none"})`,
    tallyOf(fx.stdout ?? "")?.text === "5/5" && fx.status !== 0);
  ok(`and the runner calls that ${row?.verdict} [${row?.code ?? "?"}], never a contract failure (suite exit ${res.status})`,
    row?.verdict === VERDICT.UNVERIFIED && row?.code !== "checks-failed" && res.status === 1);
  ok(`and it still says which tally the dead script printed (${row?.checks ?? "?"} — the numbers are not lost with the process)`,
    row?.checks === "5/5 checks");
}

// M199: the time budget, end to end. These fixtures sleep for twenty seconds, so
// they are only ever run under PROOF_TIMEOUT_MS — a proof that hung the suite used
// to produce no verdict at all, and the only honest way to show the budget fires is
// to make a script hang on purpose and time the runner giving up on it.
{
  const BUDGET = "1500";
  const SLEEP = 20000;
  const sleep = `setTimeout(() => {}, ${SLEEP});\n`;
  const cases = {
    "hang-green": { src: `console.log("ok one");\nconsole.log("3/3 checks passed");\n${sleep}`, code: "timed-out-after-tally", checks: "3/3 checks" },
    "hang-silent": { src: `console.log("booting the SSR server");\n${sleep}`, code: "timed-out", checks: "no tally" },
  };
  for (const [key, c] of Object.entries(cases)) {
    const dir = scratch({ [`proof-${key}.mjs`]: c.src });
    const t0 = Date.now();
    const res = spawnSync(process.execPath, [RUNNER, dir], {
      encoding: "utf8",
      env: { ...process.env, PROOF_TIMEOUT_MS: BUDGET },
    });
    const ms = Date.now() - t0;
    const out = `${res.stdout ?? ""}${res.stderr ?? ""}`;
    const row = parsed(out)[0];
    ok(`a proof that hangs past its ${BUDGET}ms budget is stopped and reported ${row?.verdict} [${row?.code ?? "?"}] with its own line intact (${row?.checks ?? "?"} shown, fixture wanted ${c.checks})`,
      !!row && row.verdict === VERDICT.UNVERIFIED && row.code === c.code && row.checks === c.checks);
    ok(`and the budget is the runner's, not the fixture's: it gave up after ${ms}ms while ${key} still had ~${SLEEP - Number(BUDGET)}ms of sleep left, and the suite exited ${res.status}`,
      ms >= Number(BUDGET) && ms < SLEEP && res.status === 1);
    ok(`and a stopped script's log is still dumped, because "the runner gave up" is not a diagnosis (${out.includes(`===== proof-${key}.mjs output [${c.code}]`) ? "dumped" : "NOT dumped"})`,
      out.includes(`===== proof-${key}.mjs output [${c.code}]`));
  }
  // The budget must not become the thing that breaks a healthy suite: the same
  // green fixture, given a generous budget, still has to read as a pass. Without
  // this clause, "always time out" and "never time out" both look like progress.
  {
    const dir = scratch({ "proof-green.mjs": FX.green });
    const generous = spawnSync(process.execPath, [RUNNER, dir], {
      encoding: "utf8",
      env: { ...process.env, PROOF_TIMEOUT_MS: "60000" },
    });
    const row = parsed(`${generous.stdout}${generous.stderr}`)[0];
    ok(`a script that finishes inside a 60000ms budget still passes (${row?.verdict} [${row?.code}], exit ${generous.status})`,
      row?.verdict === VERDICT.PASS && row?.code === "green" && generous.status === 0);
  }
  // The default is gated by reading the shipped constant, because waiting out a
  // real default is not a check anyone would run: `Number(undefined) || 600_000`
  // is the only thing standing between this suite and `timeout: NaN`, which makes
  // spawnSync refuse to start a single script.
  {
    const dir = scratch({ "proof-green.mjs": FX.green });
    const noEnv = spawnSync(process.execPath, [RUNNER, dir], { encoding: "utf8" });
    const out = `${noEnv.stdout}${noEnv.stderr}`;
    const declared = readFileSync(RUNNER, "utf8").match(/PROOF_TIMEOUT_MS\) \|\| ([\d_]+)/);
    const DEF = Number(declared?.[1]?.replace(/_/g, ""));
    ok(`with nothing in the environment the runner still runs a healthy script to completion (exit ${noEnv.status}, ${parsed(out)[0]?.checks ?? "?"})`,
      noEnv.status === 0 && parsed(out)[0]?.verdict === VERDICT.PASS);
    ok(`and the default budget is a real number read from the shipped source (${Number.isFinite(DEF) ? `${DEF}ms` : "unreadable"}), far above the slowest proof yet short enough to fire`,
      Number.isFinite(DEF) && DEF >= 300_000 && DEF <= 3_600_000);
  }
}


// table above is a test of nothing. The declared tally below is written from
// each fixture's source, so a fake proof that stopped printing its tally would
// be caught here rather than silently changing the classification.
{
  const DECLARES = { green: "2/2", contract: "3/5", ghost: "2/2", silent: null, crash: null, vacuous: "0/0", forgotten: "1/4", killed: null, nested: "2/3", segv: "5/5" };
  const drift = [];
  for (const [k, want] of Object.entries(DECLARES)) {
    const got = tallyOf(seen[k].fx.stdout)?.text ?? null;
    if (got !== want) drift.push(`${k} printed ${got ?? "no tally"}, source says ${want ?? "no tally"}`);
  }
  const okGreen = seen.green.fx.status === 0 && tallyOf(seen.green.fx.stdout).text === "2/2";
  const okGhost = seen.ghost.fx.status === 1 && tallyOf(seen.ghost.fx.stdout).text === "2/2";
  const okSilent = seen.silent.fx.status === 0 && tallyOf(seen.silent.fx.stdout) === null;
  const okForgotten = seen.forgotten.fx.status === 0 && tallyOf(seen.forgotten.fx.stdout).text === "1/4";
  const okNested = tallyOf(seen.nested.fx.stdout)?.text === "2/3" && seen.nested.fx.stdout.includes("9/9");
  const okVacuous = seen.vacuous.fx.status === 0 && tallyOf(seen.vacuous.fx.stdout).text === "0/0";
  ok(`the fake proofs really emit the signatures named for them (all-green-exit0=${okGreen} all-green-exit1=${okGhost} silent-exit0=${okSilent} red-exit0=${okForgotten} vacuous-exit0=${okVacuous} borrowed-tally=${okNested})`,
    okGreen && okGhost && okSilent && okForgotten && okVacuous && okNested && drift.length === 0);
  ok(`and each fixture's printed tally matches its own source (${drift.length ? drift.join("; ") : `${Object.keys(DECLARES).length}/${Object.keys(DECLARES).length} fixtures agree`})`, drift.length === 0);
}

// A mixed directory proves the summary arithmetic and that one death cannot
// hide a contract failure — or the other way round.
{
  const dir = scratch({
    "proof-a.mjs": FX.green,
    "proof-b.mjs": FX.contract,
    "proof-c.mjs": FX.ghost,
    "proof-d.mjs": FX.silent,
  });
  const res = spawnSync(process.execPath, [RUNNER, dir], { encoding: "utf8" });
  const out = `${res.stdout}${res.stderr}`;
  const rows = parsed(out);
  const summary = out.match(/^(\d+)\/(\d+) proof scripts proven \((\d+)\/(\d+) checks counted\)$/m);
  ok(`a mixed run classifies all ${rows.length} scripts (1 pass, 1 contract failure, 2 unverified)`,
    rows.length === 4 &&
      rows.filter((r) => r.verdict === VERDICT.PASS).length === 1 &&
      rows.filter((r) => r.verdict === VERDICT.FAIL).length === 1 &&
      rows.filter((r) => r.verdict === VERDICT.UNVERIFIED).length === 2);
  ok(`and the summary says 1/4 proven with the counted checks summed from the lines that reported (${summary?.[3] ?? "?"}/${summary?.[4] ?? "?"}) — 2+3+2 of 2+5+2`,
    !!summary && summary[1] === "1" && summary[2] === "4" && Number(summary[3]) === 7 && Number(summary[4]) === 9);
  ok("and a mixed run exits 1", res.status === 1, `got ${res.status}`);
  ok("and every non-green script's output is dumped for debugging, tagged with its code",
    ["proof-a.mjs", "proof-b.mjs", "proof-c.mjs", "proof-d.mjs"].filter((f) => out.includes(`===== ${f} output`)).length === 3);
  ok("while the passing script's log is not dumped (the console is for failures)",
    !out.includes("===== proof-a.mjs output"));
}

// All-green directory: exit 0, and the breakdown line disappears.
{
  const dir = scratch({ "proof-a.mjs": FX.green, "proof-b.mjs": FX.vacuous });
  const res = spawnSync(process.execPath, [RUNNER, dir], { encoding: "utf8" });
  ok(`0 checks counted is still not a pass (2 scripts, exit ${res.status})`, res.status === 1);
}
{
  const dir = scratch({ "proof-a.mjs": FX.green, "proof-b.mjs": FX.contract });
  const res = spawnSync(process.execPath, [RUNNER, dir], { encoding: "utf8" });
  const out = `${res.stdout}${res.stderr}`;
  ok(`a suite with one red script exits 1 and names the contract failure count`,
    res.status === 1 && /1 contract failure\(s\)/.test(out));
}
{
  const dir = scratch({ "proof-a.mjs": FX.green });
  const res = spawnSync(process.execPath, [RUNNER, dir], { encoding: "utf8" });
  const out = `${res.stdout}${res.stderr}`;
  ok(`a suite that is genuinely all green exits 0, prints 1/1 proven, and says nothing about failures`,
    res.status === 0 && /1\/1 proof scripts proven \(2\/2 checks counted\)/.test(out) && !/contract failure|unverified/.test(out));
}

// Discovery failures are loud, never silently empty.
{
  const dir = scratch({ "notes.txt": "nothing here is a proof" });
  const res = spawnSync(process.execPath, [RUNNER, dir], { encoding: "utf8" });
  ok(`a directory with no proofs exits 1 and says where it looked (not "0/0 passed")`,
    res.status === 1 && /No proof-\*\.mjs scripts found/.test(res.stderr) && !/proof scripts proven/.test(res.stdout));
}
{
  const missing = resolve(join(scratch({}), "does-not-exist"));
  const res = spawnSync(process.execPath, [RUNNER, missing], { encoding: "utf8" });
  ok(`a missing directory exits 1 with a read error rather than an empty pass`,
    res.status === 1 && /Cannot read the proof directory/.test(res.stderr));
}

// argv[2] is a directory seam, not a positional toy: an absolute path stays
// itself, and a relative one resolves against the caller's cwd.
{
  const dir = scratch({ "proof-a.mjs": FX.green });
  const abs = spawnSync(process.execPath, [RUNNER, dir], { encoding: "utf8" });
  ok(`the seam takes an absolute directory (exit ${abs.status})`, abs.status === 0);
  const parent = dirname(dir);
  const rel = spawnSync(process.execPath, [RUNNER, basename(dir)], { encoding: "utf8", cwd: parent });
  ok(`and a bare name resolves against the caller's cwd (exit ${rel.status})`,
    rel.status === 0 && basename(dir).startsWith("football-os-proof-runner-"));
}

// ---------------------------------------------------------------------------
// 5. The suite's own habits: the last-match rule and the runner's PASS shape
//    only hold if every real proof prints its tally as its last word. That is
//    checkable from source, so it is gated — and gated BOTH WAYS, because a
//    clause that only ever sees a compliant tree has never been seen to refuse
//    anything. The violators below are planted in the temp dir, not the repo.
// ---------------------------------------------------------------------------
{
  const files = findProofs(here);
  const real = proofDiscipline(here);
  ok(`all ${files.length} proofs in scripts/ print a tally as their last statement and exit on a counter that tally reads (${real.issues.length} exceptions${real.issues.length ? `: ${real.issues.join("; ")}` : ""})`,
    real.issues.length === 0);
  ok(`and that check is not keyed to one spelling — the suite's counters are ${real.counters.join(" / ")}`,
    real.counters.length >= 2);

  // The planted sources print their tallies by concatenation, not from a
  // template literal: a `\${pass}` inside this file's own template would reach
  // disk as an interpolated-looking double-quoted string, i.e. a fake proof
  // that never prints a number — which is silent2's job, not this one's.
  const PLANTED = {
    // silent: never prints a tally at all; lateTally: talks after it;
    // wrongCounter: exits on a flag the tally never mentions; noExit: exits 0
    // unconditionally, so a red check would be reported as a green script.
    "proof-silent2.mjs": `let pass = 0;\nconsole.log("no checks here");\nprocess.exit(0);\n`,
    // lateTally is the honest limit of the runtime classifier: it prints a
    // complete 3/3 tally, then keeps talking, then exits 0 — the LAST-match rule
    // reads its own tally and calls it green. Only the source-level scan above
    // can refuse that shape, which is why both halves exist.
    "proof-lateTally.mjs": `let pass = 3;\nlet fail = 0;\nconsole.log(pass + "/" + (pass + fail) + " checks passed");\nconsole.log("and one more thought");\nprocess.exit(fail ? 1 : 0);\n`,
    "proof-wrongCounter.mjs": `let pass = 2;\nlet fail = 0;\nconsole.log(pass + "/" + (pass + fail) + " checks passed");\nvar gaveUp = false;\nprocess.exit(gaveUp ? 1 : 0);\n`,
    "proof-noExit.mjs": `let pass = 4;\nlet fail = 0;\nconsole.log(pass + "/" + (pass + fail) + " checks passed");\nprocess.exit(0);\n`,
    "proof-clean.mjs": `let pass = 1;\nlet fail = 0;\nconsole.log(pass + "/" + (pass + fail) + " checks passed");\nprocess.exit(fail ? 1 : 0);\n`,
  };
  const planted = scratch(PLANTED);
  const got = proofDiscipline(planted);
  const offenders = Object.keys(PLANTED).filter((f) => f !== "proof-clean.mjs").length;
  ok(`the same scan refuses all ${offenders} planted shapes and accepts the compliant one (${got.issues.map((i) => i.split(":")[0]).join(", ") || "nothing refused"})`,
    got.issues.length === offenders && got.issues.every((i) => !i.startsWith("proof-clean")));
  ok(`and it names WHY each one is refused, not just that it was (${got.issues.map((i) => i.split(": ").slice(1).join(": ")).join(" // ")})`,
    got.issues.some((i) => /last console.log is not a tally/.test(i)) &&
      got.issues.some((i) => /exits on "gaveUp"/.test(i)) &&
      got.issues.some((i) => /no process\.exit/.test(i)));
  ok(`the compliant planted file is accepted, so the refusals above are not the scan failing on everything (counters ${got.counters.join("/")})`,
    got.issues.every((i) => !i.startsWith("proof-clean.mjs")) && got.counters.includes("fail"));

  // Every planted file's runner verdict is pinned, not just one of them. A
  // planted script that crashed instead of printing its tally would otherwise
  // leave a clause like "4 of these are not green" satisfied by an accident —
  // so the expected verdict, code and reported checks are all named here.
  const ran = spawnSync(process.execPath, [RUNNER, planted], { encoding: "utf8" });
  const ranRows = parsed(`${ran.stdout}${ran.stderr}`);
  const byName = Object.fromEntries(ranRows.map((r) => [r.name, r]));
  const WANT = {
    clean: [VERDICT.PASS, "green", "1/1 checks"],
    lateTally: [VERDICT.PASS, "green", "3/3 checks"],
    wrongCounter: [VERDICT.PASS, "green", "2/2 checks"],
    noExit: [VERDICT.PASS, "green", "4/4 checks"],
    silent2: [VERDICT.UNVERIFIED, "no-tally-green-exit", "no tally"],
  };
  const mismatched = Object.entries(WANT).filter(([k, [v, c, s]]) => {
    const r = byName[k];
    return !r || r.verdict !== v || r.code !== c || r.checks !== s;
  });
  ok(`and every planted file really ran as itself: 4 print a tally the runner reads as PASS and only silent2 is refused (${mismatched.map(([k]) => `${k}=${byName[k] ? `${byName[k].verdict}/${byName[k].code}/${byName[k].checks}` : "absent"}`).join(", ") || "all 5 as expected"}, exit ${ran.status})`,
    mismatched.length === 0 && ranRows.length === Object.keys(WANT).length && ran.status === 1);
  // The deliberate, stated limit: the runtime classifier cannot see the shape
  // the source scan exists for. This is the same tree, asserted from the other
  // half, so nobody can later "fix" one rule without noticing the other.
  ok(`and the runner's last-match rule is still blind to lateTally, which is exactly why proofDiscipline exists (lateTally: scan refused it=${got.issues.some((i) => i.startsWith("proof-lateTally"))}, runner said ${byName.lateTally?.verdict})`,
    got.issues.some((i) => i.startsWith("proof-lateTally")) && byName.lateTally?.verdict === VERDICT.PASS);
}

// The classifier must be the ONLY place the verdicts are decided: if the runner
// grew a second, local notion of "passed", the truth table above would be
// testing a module nobody uses.
{
  const src = readFileSync(RUNNER, "utf8");
  ok("the runner imports its verdicts instead of recomputing them (no local status===0 judgement)",
    src.includes("classifyProofRun") && src.includes("./lib/proofRunner.mjs") && !/const passed = res\.status === 0/.test(src));
  ok("and no proof of PASS survives without a tally: the runner's only PASS branch is the classifier's",
    (src.match(/VERDICT\.PASS/g) ?? []).length >= 3 && /row\.verdict === VERDICT\.PASS/.test(src));
}

// Self-test of this file's own parsing, so a runner format change cannot make
// every assertion above vacuously true by matching nothing.
{
  const sample = `PASS  proof:green  (2/2 checks)\nUNVERIFIED  proof:ghost  (2/2 checks)  [died-after-green] printed all 2 checks green and still exited 1\n`;
  const rows = parsed(sample);
  ok(`this file can read the runner's line format (2 lines → ${rows.length} rows, codes ${rows.map((r) => r.code).join("/")})`,
    rows.length === 2 && rows[0].code === "green" && rows[0].verdict === "PASS" && rows[1].code === "died-after-green" && rows[1].verdict === "UNVERIFIED");
  const counter = `FAIL  proof:x  (no tally)\n`;
  const r2 = parsed(counter);
  ok(`and it distinguishes "no tally" from a zero count (${r2[0]?.checks ?? "?"})`, r2.length === 1 && r2[0].checks === "no tally");
  ok(`and a run whose lines this file cannot read is a loud failure, not an empty pass (${parsed("total nonsense\n").length} rows)`,
    parsed("total nonsense\n").length === 0 && rows.length > 0);
}

for (const dir of dirs) {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    /* a fixture dir the OS still holds open is not worth a red gate */
  }
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
