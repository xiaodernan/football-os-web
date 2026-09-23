// Proof runner: the repo carries many scripts/proof-*.mjs contract checks but
// had no single gate, so a refactor could silently break one. This discovers
// every proof, runs each in its own process (they each spin up their own Vite
// SSR server), and exits non-zero if any fail — turning the pile into a suite.
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const proofs = readdirSync(here)
  .filter((f) => f.startsWith("proof-") && f.endsWith(".mjs"))
  .sort();

if (proofs.length === 0) {
  console.error("No proof-*.mjs scripts found in scripts/.");
  process.exit(1);
}

// A proof prints a final "N/M checks passed" line; surface it inline, and keep
// the full output only for failures so a broken contract is still debuggable.
const SUMMARY = /(\d+)\/(\d+) checks passed/;

let okCount = 0;
const failures = [];

for (const file of proofs) {
  const res = spawnSync(process.execPath, [join(here, file)], { encoding: "utf8" });
  const out = `${res.stdout ?? ""}${res.stderr ?? ""}`;
  const match = out.match(SUMMARY);
  const checks = match ? `${match[1]}/${match[2]}` : "?/?";
  const passed = res.status === 0;
  if (passed) okCount += 1;
  else failures.push({ file, out });
  console.log(`${passed ? "PASS" : "FAIL"}  proof:${file.replace(/^proof-|\.mjs$/g, "")}  (${checks} checks)`);
}

console.log(`\n${okCount}/${proofs.length} proof scripts passed`);

for (const { file, out } of failures) {
  console.error(`\n===== ${file} output =====\n${out.trimEnd()}`);
}

process.exit(failures.length === 0 ? 0 : 1);
