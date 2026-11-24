// M1248 · No Clash dependency, ever. The app's egress is direct by default and the upstream
// proxy is a double opt-in. This gate walks every executable source file, ignores comments, and
// refuses any hardcoded local proxy port or a non-empty inherited proxy without the opt-in.
// It is OFFLINE — nothing here dials a network, and no real model call is spent.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log("ok   " + name); }
  else { fail++; console.log("FAIL " + name + (detail ? " — " + detail : "")); }
};

const stripComments = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/[^\n]*/g, "");

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  if (e.name === "node_modules" || e.name === "dist" || e.name === "test-results" ||
      e.name === ".git" || e.name === "specproof-web") return [];
  const p = join(dir, e.name);
  return e.isDirectory() ? walk(p) : [p];
});

const files = walk(".").filter((f) => /\.(ts|tsx|js|mjs)$/.test(f) && !f.endsWith("proof-no-clash.mjs"));
const carriers = [];
for (const f of files) {
  const lines = stripComments(readFileSync(f, "utf8")).split(/\r?\n/);
  lines.forEach((line, i) => {
    if (/7897|127\.0\.0\.1:7897|127\.0\.0\.1:789[0-9]/.test(line)) carriers.push(`${f}:${i + 1}`);
  });
}
ok(`no executable source hardcodes a Clash-style local proxy (${files.length} files walked, ${carriers.length} carriers${carriers.length ? ": " + carriers.slice(0, 5).join(", ") : ""})`,
  files.length > 100 && carriers.length === 0);

// The reader must be armed: a planted line inside source-shaped text is charged.
const planted = stripComments("const url = '127.0.0.1:7897';\n// 7897 in a comment is not code").split(/\r?\n/);
const plantedHits = planted.filter((l) => /7897/.test(l)).length;
ok(`the scanner is armed: a planted proxy port is caught while a commented one is not (${plantedHits} hit)`,
  plantedHits === 1);

// The opt-in guard must survive in the shipped server config.
const proxySrc = readFileSync("scripts/llm-proxy.mjs", "utf8");
ok("the egress is double opt-in, never inherited",
  /LLM_ALLOW_UPSTREAM_PROXY === "1"/.test(proxySrc) &&
  /LLM_UPSTREAM_PROXY \|\| ""/.test(proxySrc));

// A local .env is optional and gitignored; when present it must not force a proxy.
let localEnv = "";
try { localEnv = readFileSync(".env", "utf8"); } catch { /* absent in CI is fine */ }
const forced = localEnv.split(/\r?\n/).some((l) =>
  /^LLM_ALLOW_UPSTREAM_PROXY=1\s*$/.test(l) && !/^#/.test(l));
ok("a local .env never opts into an upstream proxy", !forced);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
