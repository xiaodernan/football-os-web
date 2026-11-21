// M1235 · The Training Desk: proof for the seventeenth door's pure half — the prescription
// parser, the numeral law, the fold's own deterministic prescription and the machine.
// Run: node scripts/proof-trainingdesk.mjs
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";

const cacheDir = join(tmpdir(), `football-os-proof-trainingdesk-${process.pid}`);
const server = await createServer({
  root: process.cwd(), cacheDir, server: { middlewareMode: true }, appType: "custom", logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const m = await server.ssrLoadModule("/domain/trainingDesk.ts");
const dict = await server.ssrLoadModule("/i18n/dictionaries.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };
const { createDesk, parseDeskRx, verifyDeskText, foldRx, deskPreflight, deskBuild, deskPrecommit, deskCommit, deskRefused, DESK_FOCUS_LIMIT } = m;
const { DICTIONARIES: D } = dict;
const locales = ["en", "zh-CN", "zh-TW"];

// The hand-counted dossier: a striker whose weakest attributes are finishing (53) and
// first_touch (58); the load zone is optimal.
const dossier = {
  playerName: "Test Striker",
  group: "ST",
  age: 24,
  loadZone: "optimal",
  attributes: [
    { key: "shooting", value: 71 },
    { key: "finishing", value: 53 },
    { key: "first_touch", value: 58 },
    { key: "pace", value: 82 },
    { key: "stamina", value: 66 },
    { key: "strength", value: 60 },
  ],
};

const lawful = "RX:finishing,first_touch,shooting\nMIN:45\nFinishing is the weakest at 53; first touch at 58 follows. Two sessions a week keeps the load in the optimal zone.";
const parsed = parseDeskRx(lawful, dossier);
ok(`a lawful prescription parses — three dossier keys, one supported minutes value (${parsed.prescription?.focusKeys.join(",")} @ ${parsed.prescription?.minutes}; violations ${parsed.violations.join(",") || "none"})`,
  parsed.prescription !== null && parsed.violations.length === 0 &&
  JSON.stringify(parsed.prescription.focusKeys) === JSON.stringify(["finishing", "first_touch", "shooting"]) &&
  parsed.prescription.minutes === 45);

// Each unlawful answer is caught by code.
const cases = [
  ["no directive", "Just do some shooting drills.", "noDirective"],
  ["four focuses", "RX:finishing,first_touch,shooting,pace\nMIN:45", "tooManyFocus"],
  ["a repeat", "RX:finishing,finishing,shooting\nMIN:45", "duplicateFocus"],
  ["a ghost attribute", "RX:finishing,telekinesis,shooting\nMIN:45", "unknownAttribute"],
  ["a bad minutes value", "RX:finishing,first_touch,shooting\nMIN:47", "badMinutes"],
];
ok(`every unlawful prescription is refused by code and returns none (${cases.map(([l, , w]) => `${l}:${parseDeskRx(cases.find((c) => c[0] === l)[1], dossier).violations.includes(w)}`).join(" · ")})`,
  cases.every(([, text, want]) => { const r = parseDeskRx(text, dossier); return r.prescription === null && r.violations.includes(want); }) &&
  DESK_FOCUS_LIMIT === 3);

// The numeral law over the prose.
ok(`the prose law passes the dossier's own figures and refuses an invented one and futurology (dossier ${verifyDeskText("finishing is 53 and pace is 82.", dossier).length === 0}, invented ${verifyDeskText("finishing is 987654.", dossier).includes("offDossier")}, futurology ${verifyDeskText("you will reach 99 by June.", dossier).includes("prediction")})`,
  verifyDeskText("finishing is 53 and pace is 82.", dossier).length === 0 &&
  verifyDeskText("finishing is 987654.", dossier).includes("offDossier") &&
  verifyDeskText("you will reach 99 by June.", dossier).includes("prediction"));

// The fold's own prescription: the three weakest, minutes by zone, deterministic.
const fold = foldRx(dossier);
ok(`the fold prescribes the dossier's three weakest attributes and the zone's minutes, twice the same (${fold?.focusKeys.join(",")} @ ${fold?.minutes}; again ${JSON.stringify(foldRx(dossier))})`,
  JSON.stringify(fold?.focusKeys) === JSON.stringify(["finishing", "first_touch", "strength"]) &&
  fold?.minutes === 45 &&
  JSON.stringify(foldRx(dossier)) === JSON.stringify(fold));
const zones = { spike: 30, high: 45, low: 60, optimal: 45 };
ok(`the fold's minutes answer to the load zone — a spike week gets the short sharp session (${Object.entries(zones).map(([z, want]) => `${z}:${foldRx({ ...dossier, loadZone: z }).minutes === want ? want : "WRONG"}`).join(" ")})`,
  Object.entries(zones).every(([z, want]) => foldRx({ ...dossier, loadZone: z }).minutes === want));

// An empty dossier reads null rather than a crash.
ok(`a dossier with no attributes reads null rather than a broken prescription (${foldRx({ ...dossier, attributes: [] })})`,
  foldRx({ ...dossier, attributes: [] }) === null);

// The machine: the two precommit arms, commit carries the prescription, refusal carries the fold's.
let desk = deskBuild(deskPreflight(createDesk(dossier, "en")));
const committed = deskCommit(deskPrecommit(desk, "pass"), lawful, parsed.prescription);
const refused = deskRefused(deskPrecommit(desk, "refused"), "The desk cannot back this prescription.");
const thin = deskPreflight(createDesk({ ...dossier, attributes: [] }, "en"));
ok(`the machine walks preflight -> build -> precommit -> commit with the prescription carried, and a refusal carries the fold's own (commit ${committed.status} rx ${committed.prescription?.focusKeys.join(",")}, refused ${refused.status} rx ${refused.prescription?.focusKeys.join(",")}, empty-dossier preflight ${thin.status})`,
  committed.status === "commit" && committed.prescription?.focusKeys.length === 3 &&
  refused.status === "refused" && refused.prescription?.focusKeys.length === 3 &&
  thin.status === "refused" && committed.trace.length >= 3 && refused.trace.length >= 3);

// The dossier is cloned, so a caller cannot swap the player's numbers mid-run.
const before = JSON.stringify(createDesk(dossier, "en").dossier.attributes);
const desk2 = createDesk(dossier, "en");
desk2.dossier.attributes.push({ key: "ghost", value: 99 });
ok(`the dossier is cloned into the state — a caller's later push cannot touch the desk's copy (${before === JSON.stringify(createDesk(dossier, "en").dossier.attributes)})`,
  before === JSON.stringify(createDesk(dossier, "en").dossier.attributes) && desk2.dossier.attributes.length === 7);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
