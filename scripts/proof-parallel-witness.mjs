// M1220 · The Parallel Witness gate. The stress run itself lives in Playwright (real browsers,
// real concurrent contexts, refused transport). This gate refuses to accept a hand-written
// result: it checks that the machine-written evidence is internally consistent, that every
// session really walked the fold arm with a trace and its own storage, and that the spec which
// produced it still contains the assertions — not a fixture that learned to say "allOk".
// Run: node scripts/proof-parallel-witness.mjs
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const evidence = JSON.parse(readFileSync("docs/evidence/m1220-parallel-witness.json", "utf8"));
const spec = readFileSync("tests/e2e/cartographer-stress.spec.ts", "utf8");

ok("the witness names its milestone", evidence.milestone === "M1220");
ok("the evidence was struck by a clock, not typed by a hand", typeof evidence.generatedAt === "string" && Number.isFinite(Date.parse(evidence.generatedAt)));
ok("the witness ran the full declared parallelism", evidence.sessions === 16 && Array.isArray(evidence.rows) && evidence.rows.length === evidence.sessions);
ok("every session is accounted for exactly once",
  evidence.rows.every((r, i) => r.session === i) && new Set(evidence.rows.map((r) => r.session)).size === 16);
ok("every session took the honest fold arm with its badge and traced graph",
  evidence.rows.every((r) => r.fold === true && r.badge === true && Number.isInteger(r.traceChips) && r.traceChips > 0));
const ownsStorage = (r) => r.storageIntact === true;
ok("no session leaked storage into another context (plant: a foreign-storage row is refused by the same predicate)",
  evidence.rows.every(ownsStorage) && !ownsStorage({ ...evidence.rows[0], storageIntact: false }));
const cleanConsole = (r) => Array.isArray(r.errors) && r.errors.length === 0;
ok("no session swallowed a console or page error (plant: a row carrying an error is refused)",
  evidence.rows.every(cleanConsole) && !cleanConsole({ ...evidence.rows[0], errors: ["planted error"] }));
const refusedTransport = (s) => /503/.test(s) && /no live model call/i.test(s);
ok("the run is honest about its refused transport (plant: a live-call claim is refused)",
  refusedTransport(evidence.transport) && !refusedTransport("a live model call was made; 503"));
ok("the summary agrees with the rows it summarises", evidence.allOk === true &&
  evidence.maxSessionMs === Math.max(...evidence.rows.map((r) => r.ms)) &&
  evidence.minSessionMs === Math.min(...evidence.rows.map((r) => r.ms)));
ok("the timings are measured, bounded and mutually consistent",
  evidence.wallMs >= evidence.maxSessionMs && evidence.maxSessionMs >= evidence.minSessionMs &&
  evidence.minSessionMs > 0 && evidence.wallMs > 0);
const unsullied = (s) => !/sample|placeholder|mock(?!ed transport)|fabricat|fake/i.test(s);
ok("the evidence carries no sample/placeholder/fake marker (plant: a sample marker is refused)",
  unsullied(JSON.stringify(evidence)) && !unsullied("sample"));

ok("the spec really opens isolated browser contexts in parallel", /browser\.newContext\(/.test(spec) && /Promise\.all\(/.test(spec));
const refusesTransport = (s) => /503/.test(s) && /api\/llm\/chat/.test(s);
ok("the spec refuses the transport so the witness spends no real model call (plant: an untouched spec is refused)",
  refusesTransport(spec) && !refusesTransport("tests/e2e/cartographer.spec.ts"));
ok("the spec marks each context so cross-talk would be caught", /localStorage\.setItem/.test(spec) && /storageIntact/.test(spec));
ok("the spec still asserts the fold, the badge, the trace and zero errors", /row\.fold/.test(spec) && /row\.badge/.test(spec) && /row\.traceChips/.test(spec) && /row\.errors/.test(spec));
ok("the spec writes this very evidence file from the run", /writeFileSync\(EVIDENCE/.test(spec) && /m1220-parallel-witness\.json/.test(spec));

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
