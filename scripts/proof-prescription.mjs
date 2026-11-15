// Proof for the prescription fold (M1157). The ops console's deep-optimization brief is computed by
// the fold — this proof keeps the computation honest on planted shapes: the severity ladder, the
// name-the-heaviest-dead-end rule, the ordering, and the healthy case staying quiet. If the fold
// ever prescribed off-topic, this goes red before the operator reads it.
// Run: node scripts/proof-prescription.mjs
import { createServer } from "vite";
import { readFileSync } from "node:fs";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true, include: [] } });
const { foldPrescription } = await server.ssrLoadModule("/domain/prescription.ts");
const { foldPulse, syntheticCohort } = await server.ssrLoadModule("/domain/pulse.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };
const planted = (overrides) => ({
  cohort: "device", visits: 60, sessions: 12, bounceSessions: 0, bounceRate: 5, avgDepth: 4,
  avgDwellMs: 5000, loopSessions: 0, loopRate: 0, deadEndSessions: 0,
  depthBuckets: [0, 0, 6, 6], perRoute: [], exits: [], trend: [{ day: "2026-11-10", visits: 12 }],
  ...overrides,
});

// 1 · the healthy fold stays quiet (hold-or-less, never hysterical)
const healthy = planted({});
const healthyRx = foldPrescription(healthy);
ok("a healthy fold prescribes at most a watch, never a now",
  healthyRx.length > 0 && healthyRx.every((r) => r.severity === "watch") && healthyRx[0].id === "rx.hold");

// 2 · the front-door bounce — the prescription is urgent when the world is bleeding
const bleeding = planted({ bounceRate: 60, bounceSessions: 7 });
const bleedingRx = foldPrescription(bleeding);
ok("bounceRate ≥ 55 prescribes rx.bounce with severity now",
  bleedingRx.some((r) => r.id === "rx.bounce" && r.severity === "now"));

// 3 · the shallow world triggers the depth prescription
const shallow = planted({ avgDepth: 1.4 });
ok("avgDepth < 2 prescribes rx.depth", foldPrescription(shallow).some((r) => r.id === "rx.depth"));

// 4 · the heaviest dead-end is named, counted and ranked
const deadEnd = planted({ exits: [{ path: "/nowhere", exits: 5 }, { path: "/manual", exits: 2 }] });
const deadEndRx = foldPrescription(deadEnd);
ok("a ≥30% dead-end door is prescribed with its name and its count",
  (() => { const r = deadEndRx.find((x) => x.id === "rx.deadEnd"); return !!r && r.vars.path === "/nowhere" && Number(r.vars.n) === 5 && r.severity === "now"; })());

// 5 · manual exits ≥ 3 are named
const viaManual = planted({ exits: [{ path: "/manual", exits: 4 }] });
ok("≥3 manual exits prescribe rx.manualExit", foldPrescription(viaManual).some((r) => r.id === "rx.manualExit" && r.vars.n === 4));

// 6 · the loop room fires at ≥30%
const loopy = planted({ loopRate: 42 });
ok("≥30% session loop prescribes rx.loop", foldPrescription(loopy).some((r) => r.id === "rx.loop"));

// 7 · the swallowing door — any route whose bounceShare ≥ 70 with ≥5 visits is named
const door = planted({ perRoute: [{ path: "/black-hole", visits: 8, avgDwellMs: 100, exits: 4, bounceShare: 88 }] });
ok("a route with bounceShare ≥ 70 and ≥5 visits is prescribed by name", foldPrescription(door).some((r) => r.id === "rx.bounceDoor" && r.vars.path === "/black-hole"));

// 8 · ordering — severity rank ascending, then score descending
const mixed = planted({ bounceRate: 60, bounceSessions: 7, avgDepth: 1.4, loopRate: 40 });
const mixedRx = foldPrescription(mixed);
const rank = { now: 0, next: 1, watch: 2 };
const sorted = mixedRx.every((r, i) => i === 0 || (rank[mixedRx[i - 1].severity] < rank[r.severity] || (rank[mixedRx[i - 1].severity] === rank[r.severity] && mixedRx[i - 1].score >= r.score)));
ok("prescriptions are ordered severity-first, then measured weight", sorted);
ok("at most five prescriptions are prescribed, and none repeats",
  mixedRx.length <= 5 && new Set(mixedRx.map((r) => r.id)).size === mixedRx.length);

// 9 · the live seeded cohort yields a verdict with no junk inside
const live = foldPrescription(foldPulse(syntheticCohort(), "seeded"));
ok("the seeded cohort produces ≤5 unique prescriptions, every one carrying a known severity",
  live.length > 0 && live.length <= 5 && live.every((r) => ["now", "next", "watch"].includes(r.severity)) && new Set(live.map((r) => r.id)).size === live.length);

// 10 · the wiring — the screen imports and renders the prescription panel
const ops = readFileSync("features/ops/Ops.tsx", "utf8");
ok("the ops screen imports and renders foldPrescription",
  /import \{ foldPrescription/.test(ops) && /const rx = foldPrescription\(fold\)/.test(ops) && /ops\.rx\.kicker/.test(ops));

// 11 · every key the prescription references exists in all three locales
const dict = readFileSync("i18n/dictionaries.ts", "utf8");
for (const key of ["ops.rx.kicker", "ops.rx.title", "ops.rx.severity.now", "ops.rx.severity.next", "ops.rx.severity.watch",
                   "ops.rx.bounce", "ops.rx.depth", "ops.rx.deadEnd", "ops.rx.manualExit", "ops.rx.loop", "ops.rx.bounceDoor", "ops.rx.fatigue", "ops.rx.hold"]) {
  ok(`all three locales coin ${key}`, (dict.match(new RegExp(`"${key.replace(/\./g, "\\.")}":`, "g")) ?? []).length === 3);
}

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
