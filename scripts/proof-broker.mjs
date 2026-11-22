// M1238 · The Transfer Broker: proof for door 19's pure half — the ruling parser, the deal
// numeral law, the fold's own arithmetic and the machine.
// Run: node scripts/proof-broker.mjs
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";

const cacheDir = join(tmpdir(), `football-os-proof-broker-${process.pid}`);
const server = await createServer({
  root: process.cwd(), cacheDir, server: { middlewareMode: true }, appType: "custom", logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const m = await server.ssrLoadModule("/domain/broker.ts");
const dict = await server.ssrLoadModule("/i18n/dictionaries.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };
const { createBroker, parseBrokerRuling, verifyBrokerText, foldRuling, brokerPreflight, brokerBuild, brokerPrecommit, brokerCommit, brokerRefused, RULING_CODES, ACCEPT_AT, REJECT_AT } = m;
const { DICTIONARIES: D } = dict;
const locales = ["en", "zh-CN", "zh-TW"];

// The hand-counted deal: a 100M-valued striker, 79 overall, 22 years old.
const deal = {
  dossier: { playerName: "Test Striker", clubName: "Arsenal", overall: 79, age: 22, value: 100000000 },
  fee: 130000000,
};

// The three lawful rulings.
const accept = parseBrokerRuling("RULING:accept\nThe fee is fair against the value.", deal);
const reject = parseBrokerRuling("RULING:reject\nNowhere near the valuation.", deal);
const counter = parseBrokerRuling("RULING:counter\nFEE:120000000\nWe would take 120000000.", deal);
ok(`the three lawful rulings parse — accept and reject carry no fee, counter carries one (${accept.ruling?.code}, ${reject.ruling?.code}, ${counter.ruling?.code} @ ${counter.ruling?.fee})`,
  accept.ruling?.code === "accept" && accept.ruling.fee === null && accept.violations.length === 0 &&
  reject.ruling?.code === "reject" && reject.violations.length === 0 &&
  counter.ruling?.code === "counter" && counter.ruling.fee === 120000000 && counter.violations.length === 0);

// Each unlawful answer is caught by code.
const cases = [
  ["no directive", "The player is worth it.", "noDirective"],
  ["a bad code", "RULING:maybe\nThinking about it.", "badCode"],
  ["a counter with no fee", "RULING:counter\nWe want more.", "missingFee"],
  ["a counter with a zero fee", "RULING:counter\nFEE:0\nWe want more.", "missingFee"],
];
ok(`every unlawful ruling is refused by code and returns none (${cases.map(([l, , w]) => `${l}:${parseBrokerRuling(cases.find((c) => c[0] === l)[1], deal).violations.includes(w)}`).join(" · ")})`,
  cases.every(([, text, want]) => { const r = parseBrokerRuling(text, deal); return r.ruling === null && r.violations.includes(want); }) &&
  RULING_CODES.join(",") === "accept,reject,counter");

// The numeral law over the prose.
ok(`the deal law passes the dossier's own figures and the fee on the table, and refuses an invented one and futurology (dossier ${verifyBrokerText("Valued at 100000000, 79 overall, 22 years old; the fee is 130000000.", deal).length === 0}, invented ${verifyBrokerText("The fee is 987654.", deal).includes("offDeal")}, futurology ${verifyBrokerText("He will be worth 200000000.", deal).includes("prediction")})`,
  verifyBrokerText("Valued at 100000000, 79 overall, 22 years old; the fee is 130000000.", deal).length === 0 &&
  verifyBrokerText("The fee is 987654.", deal).includes("offDeal") &&
  verifyBrokerText("He will be worth 200000000.", deal).includes("prediction"));

// The fold's own ruling is real arithmetic on the thresholds.
const rulings = [
  ["2x value accepts", { ...deal, fee: 200000000 }, "accept", null],
  ["1.5x value accepts at the line", { ...deal, fee: 150000000 }, "accept", null],
  ["1.3x counters", { ...deal, fee: 130000000 }, "counter", 120000000],
  ["0.8x rejects at the line", { ...deal, fee: 80000000 }, "reject", null],
  ["half value rejects", { ...deal, fee: 50000000 }, "reject", null],
];
ok(`the fold rules by real arithmetic — accept at ${ACCEPT_AT}x, reject at ${REJECT_AT}x, counter at value x 1.2 rounded to the million (${rulings.map(([l, d, w, f]) => `${l}:${foldRuling(d).code === w && foldRuling(d).fee === f}`).join(" · ")})`,
  rulings.every(([, d, w, f]) => { const r = foldRuling(d); return r.code === w && r.fee === f; }));

// The rounding is to the million, and the same deal always rules the same.
const odd = { ...deal, fee: 100000000 };
odd.dossier = { ...deal.dossier, value: 123456789 };
ok(`the counter-fee is rounded to the nearest million and the ruling is deterministic (odd value 123456789 -> counter ${foldRuling(odd).fee}, twice ${JSON.stringify(foldRuling(odd))})`,
  foldRuling(odd).code === "counter" && foldRuling(odd).fee === 148000000 &&
  JSON.stringify(foldRuling(odd)) === JSON.stringify(foldRuling(odd)));

// A zero-value dossier or a zero fee cannot be ruled on.
const zeroValue = { ...deal, dossier: { ...deal.dossier, value: 0 }, fee: 100000000 };
const zeroFee = { ...deal, fee: 0 };
const zeroDesk = brokerPreflight(createBroker(zeroValue, "en"));
ok(`a zero-value dossier or a zero fee is refused at preflight, not ruled on (zeroValue ${zeroDesk.status}, zeroFee ${brokerPreflight(createBroker(zeroFee, "en")).status})`,
  zeroDesk.status === "refused" && brokerPreflight(createBroker(zeroFee, "en")).status === "refused");

// The machine: both arms, the fold's ruling carried on a refusal.
let desk = brokerBuild(brokerPreflight(createBroker(deal, "en")));
const committed = brokerCommit(brokerPrecommit(desk, "pass"), "RULING:accept\nA fair fee.", { code: "accept", fee: null });
const refused = brokerRefused(brokerPrecommit(desk, "refused"), "RULING:accept\nThe fee is 987654 and he will be king.");
ok(`the machine walks preflight -> build -> precommit -> commit with the ruling carried, and a refusal carries the fold's own ruling (commit ${committed.status} ${committed.ruling?.code}, refused ${refused.status} ${refused.ruling?.code} @ ${refused.ruling?.fee})`,
  committed.status === "commit" && committed.ruling?.code === "accept" &&
  refused.status === "refused" && refused.ruling?.code === "counter" && refused.ruling?.fee === 120000000 &&
  committed.trace.length >= 3 && refused.trace.length >= 3);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
