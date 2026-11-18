// M1193 · The Wire Dossier gate.
//
// The user asked for two things at once: a context BIG enough to be worth caching, and a
// prefix STABLE enough to cache. Those are the same property on an OpenAI-compatible prefix
// cache. This proof holds the dossier honest:
//
//   1. the committed scripts/wire-digest.txt exists, is substantial (>= 120 KB), and is
//      byte-identical to a fresh build from public/live-wire.json — no hand edits, no clock;
//   2. every league in the live-wire artifact is represented, and the fixture line count equals
//      the sum of its totalFixtures — nothing silently dropped;
//   3. the license lineage (OpenFootball · CC0-1.0, snapshot stamp) survives rebuilds;
//   4. scripts/llm-proxy.mjs loads the dossier at module scope, guards the append with the
//      marker constant, and surfaces the X-FootballOS-Wire-Dossier header on every envelope;
//   5. the dossier never carries a wall-clock build stamp of its own (determinism sentinel).

import { readFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const checks = [];
const check = (name, cond) => { checks.push([name, Boolean(cond)]); };

const digestPath = join(root, "scripts/wire-digest.txt");
const srcPath = join(root, "public/live-wire.json");
const proxyPath = join(root, "scripts/llm-proxy.mjs");

// 1 · presence and size
check("scripts/wire-digest.txt exists", existsSync(digestPath));
const digest = existsSync(digestPath) ? readFileSync(digestPath) : Buffer.alloc(0);
check(`wire-digest.txt is substantial (${digest.length} bytes, need >= 120000)`, digest.length >= 120_000);

const digestText = digest.toString("utf8");
const src = JSON.parse(readFileSync(srcPath, "utf8"));

// 2 · every league and every fixture accounted for
for (const league of src.leagues) {
  check(`league present: ${league.league}`, digestText.includes(league.league));
}
const fixtureLines = (digestText.match(/^ {2}\d{4}-\d{2}-\d{2} MD?\d+/gm) ?? []).length;
const expectedFixtures = src.leagues.reduce((n, l) => n + (l.seasonFixtures?.length ?? 0), 0);
check(`fixture lines (${fixtureLines}) equal the seasonFixtures sum (${expectedFixtures})`, fixtureLines === expectedFixtures);

// 3 · license lineage survives
check("OpenFootball · FTCC0 lineage is printed", digestText.includes("OpenFootball") && digestText.includes("CC0-1.0"));
check("the snapshot stamp equals the committed artifact's generated_at", digestText.includes(src.generated_at));

// 4 · the proxy wires it, once, visibly
const proxy = readFileSync(proxyPath, "utf8");
check("proxy defines WIRE_DOSSIER_MARK", proxy.includes('export const WIRE_DOSSIER_MARK = "THE REAL-WORLD WIRE DOSSIER"'));
check("proxy loads the dossier at module scope (readFileSync of wire-digest.txt)", /readFileSync\(WIRE_DOSSIER_PATH/.test(proxy));
check("proxy appends the dossier to the first system message", /findIndex\(\(m\) => m\.role === "system"\)/.test(proxy) && /content: clean\[idx\]\.content \+ "\\n\\n" \+ WIRE_DOSSIER/.test(proxy));
check("proxy marks both JSON and stream envelopes (X-FootballOS-Wire-Dossier)", (proxy.match(/X-FootballOS-Wire-Dossier/g) ?? []).length >= 3);
check("dossier state is exported for witnesses", /export const wireDossierState/.test(proxy));

// 5 · determinism: rebuild into a temp dir through the builder's own code path
const builder = join(root, "scripts/build-wire-digest.mjs");
const rebuilt = spawnSync(process.execPath, [builder, "--check"], { encoding: "utf8" });
check(`builder --check passes (${(rebuilt.stdout ?? rebuilt.stderr ?? "").trim().split("\n")[0]})`, rebuilt.status === 0);

// 6 · the dossier path never consults a wall clock (determinism sentinel)
const builderSrc = readFileSync(builder, "utf8");
check("no Date.now/new Date/Date() in the builder's composition path", !/Date\.now|new Date\(|performance\.now/.test(builderSrc));

const passed = checks.filter(([, ok]) => ok).length;
for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
console.log(`\n${passed}/${checks.length} checks passed`);
process.exit(passed === checks.length ? 0 : 1);
