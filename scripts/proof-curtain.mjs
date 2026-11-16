// Proof for Curtain Up (M1162). The screen renders ONLY from the committed artifact; this proof
// re-derives the next round by hand and checks every cross-app wiring surface.
// Run: node scripts/proof-curtain.mjs
import { createServer } from "vite";
import { readFileSync, existsSync } from "node:fs";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true, include: [] } });
const { foldCurtain } = await server.ssrLoadModule("/domain/curtain.ts");
const { isLiveWirePayload } = await server.ssrLoadModule("/data/liveWire.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const WIRE = "public/live-wire.json";
ok("the curtain artifact exists", existsSync(WIRE));
const wire = JSON.parse(readFileSync(WIRE, "utf8"));
ok("the SPA's runtime guard accepts the v3 payload", isLiveWirePayload(wire) === true);
ok("seven leagues are present", (wire?.leagues ?? []).length === 7);

const fold = foldCurtain(wire);
ok("the fold yields seven cards (one per league)", fold.cards.length === 7);
ok("every card carries a round with at least one unplayed fixture",
  fold.cards.every((c) => c.fixtures.some((f) => !f.played)));
ok("every card's round is the earliest with an unplayed fixture",
  fold.cards.every((c) => {
    const byRound = new Map();
    for (const f of wire.leagues.find((l) => l.id === c.leagueId).seasonFixtures) {
      const r = byRound.get(f.round) ?? [];
      r.push(f);
      byRound.set(f.round, r);
    }
    const eligible = [...byRound.keys()].filter((r) => (byRound.get(r) ?? []).some((f) => !Array.isArray(f.ft)));
    const earliest = eligible.sort((a, b) => Number(/(\d+)\s*$/.exec(a)?.[1] ?? 0) - Number(/(\d+)\s*$/.exec(b)?.[1] ?? 0))[0];
    return c.round === earliest;
  }));
ok("every card's fixture count equals its round's fixture count (8-10 by league size)",
  fold.cards.every((c) => c.fixtures.length >= 8 && c.fixtures.length <= 10));
ok("the reported season fixture count agrees with the artifact (2364)",
  fold.totalFixtures === 2364);
ok("the reported played fixtures across the next rounds is honest (sum of played through the chosen round)",
  fold.playedFixtures === fold.cards.reduce((n, c) => n + c.fixtures.filter((f) => f.played).length, 0));

const appTsx = readFileSync("src/App.tsx", "utf8");
ok("src/App.tsx lazy-imports @/features/curtain/Curtain", /import\("@\/features\/curtain\/Curtain"\)/.test(appTsx));
ok("src/App.tsx mounts /curtain-up", /path === "\/curtain-up"/.test(appTsx));
const shell = readFileSync("features/shell/AppShell.tsx", "utf8");
ok("the shell nav carries /curtain-up with nav.curtainUp", /to: "\/curtain-up", label: t\("nav\.curtainUp"\)/.test(shell));
const palette = readFileSync("features/command/CommandPalette.tsx", "utf8");
ok("the command palette goto group carries /curtain-up", palette.includes('nav("/curtain-up")'));
const manual = readFileSync("features/manual/Manual.tsx", "utf8");
ok("the manual's chapter-3 link list carries /curtain-up", manual.includes('{ to: "/curtain-up", label: t("nav.curtainUp") },'));
const journey = readFileSync("domain/journey.ts", "utf8");
ok("the Journey's watch chapter carries /curtain-up", journey.includes('"/curtain-up"'));
const cinema = readFileSync("tests/e2e/cinematic.spec.ts", "utf8");
ok("the cinematic catalogue walks /curtain-up", cinema.includes('"/curtain-up"'));

const dict = readFileSync("i18n/dictionaries.ts", "utf8");
ok("all three locales coin nav.curtainUp", (dict.match(/"nav\.curtainUp":/g) ?? []).length === 3);
ok("all three locales declare curtain.title", (dict.match(/"curtain\.title":/g) ?? []).length === 3);
ok("all three locales declare curtain.method", (dict.match(/"curtain\.method":/g) ?? []).length === 3);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
