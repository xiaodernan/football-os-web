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
//   5. the digest never consults a wall clock in its composition path.

import { readFileSync, existsSync, mkdtempSync, rmSync, copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let fail = 0;
let total = 0;
const ok = (name, cond) => {
  total += 1;
  const ok = Boolean(cond);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) fail++;
};

const digestPath = join(root, "scripts/wire-digest.txt");
const srcPath = join(root, "public/live-wire.json");
const proxyPath = join(root, "scripts/llm-proxy.mjs");

// 1 · presence and size
ok("scripts/wire-digest.txt exists", existsSync(digestPath));
const digest = existsSync(digestPath) ? readFileSync(digestPath) : Buffer.alloc(0);
ok(`wire-digest.txt is substantial (${digest.length} bytes, need >= 120000)`, digest.length >= 120_000);

const digestText = digest.toString("utf8");
const src = JSON.parse(readFileSync(srcPath, "utf8"));

// 2 · every league and every fixture accounted for
for (const league of src.leagues) {
  ok(`league present: ${league.league}`, digestText.includes(league.league));
}
const fixtureLines = (digestText.match(/^ {2}\d{4}-\d{2}-\d{2} MD\d+/gm) ?? []).length;
const expectedFixtures = src.leagues.reduce((n, l) => n + (l.seasonFixtures?.length ?? 0), 0);
ok(`fixture lines (${fixtureLines}) equal the seasonFixtures sum (${expectedFixtures})`, fixtureLines === expectedFixtures);

// 3 · license lineage survives
ok("OpenFootball CC0-1.0 lineage is printed", digestText.includes("OpenFootball") && digestText.includes("CC0-1.0"));
ok("the snapshot stamp equals the committed artifact's generated_at", digestText.includes(src.generated_at));

// 4 · the proxy wires it, once, visibly
const proxy = readFileSync(proxyPath, "utf8");
ok("proxy defines WIRE_DOSSIER_MARK", proxy.includes('export const WIRE_DOSSIER_MARK = "THE REAL-WORLD WIRE DOSSIER"'));
ok("proxy loads the dossier at module scope", /readFileSync\(WIRE_DOSSIER_PATH/.test(proxy));
ok("proxy appends the dossier to the first system message", /findIndex\(\(m\) => m\.role === "system"\)/.test(proxy) && /WIRE_DOSSIER\b/.test(proxy));
ok("proxy marks JSON, stream and middleware envelopes (X-FootballOS-Wire-Dossier)", (proxy.match(/X-FootballOS-Wire-Dossier/g) ?? []).length >= 3);
ok("dossier state is exported for witnesses", /export const wireDossierState/.test(proxy));

// 5 · determinism: rebuild through the builder's own --check path
const builder = join(root, "scripts/build-wire-digest.mjs");
const rebuilt = spawnSync(process.execPath, [builder, "--check"], { encoding: "utf8" });
ok("builder --check passes (the committed digest is byte-identical to a fresh rebuild)", rebuilt.status === 0);

// Plant: the --check gate must REFUSE a byte-flipped digest. Runs in a throwaway copy of the
// tree — the committed digest is never touched — and proves the refusal path end to end.
const plantDir = mkdtempSync(join(tmpdir(), "wiredossier-plant-"));
try {
  mkdirSync(join(plantDir, "public"));
  mkdirSync(join(plantDir, "scripts"));
  copyFileSync(join(root, "public/live-wire.json"), join(plantDir, "public/live-wire.json"));
  copyFileSync(builder, join(plantDir, "scripts/build-wire-digest.mjs"));
  const flipped = Buffer.from(digest);
  flipped[100] = flipped[100] ^ 0xff;
  writeFileSync(join(plantDir, "scripts/wire-digest.txt"), flipped);
  const refused = spawnSync(process.execPath, [join(plantDir, "scripts/build-wire-digest.mjs"), "--check"], { encoding: "utf8" });
  ok(`the --check gate refuses a byte-flipped digest (exit ${refused.status}) (plant)`, refused.status === 1 && /DIFFERS/.test(refused.stdout + refused.stderr));
} finally {
  rmSync(plantDir, { recursive: true, force: true });
}

// 6 · the composition path never consults a wall clock
ok("no Date.now/new Date/performance.now in the builder", !/Date\.now|new Date\(|performance\.now/.test(readFileSync(builder, "utf8")));
ok("the no-clock gate reads a planted clock (plant)", /Date\.now|new Date\(|performance\.now/.test("const t = Date.now();"));

console.log(`${total - fail}/${total} checks passed`);
process.exit(fail ? 1 : 0);
