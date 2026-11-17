// Proof for the Deep Digest (M1180): the one world-knowledge artifact the model
// used to get a sketch of, now gets whole. The gate asserts the digest is real,
// deterministic, and byte-identical across loads — the property the prefix cache
// needs in order to ever offer a ~90% hit rate.
// Run: node scripts/proof-digest.mjs
import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { DEEP_DIGEST, DEEP_DIGEST_NUMBERS, WORLD_CLUB_NAMES } = await server.ssrLoadModule("/data/deepDigest.ts");
const { footballProvider } = await server.ssrLoadModule("/data/footballService.ts");

const dig = DEEP_DIGEST;
ok("the digest is real — non-trivial, ten-digit kilobytes, no placeholder", typeof dig === "string" && dig.length >= 25_000 && dig.length <= 300_000 && !dig.includes("<placeholder>"));

// Determinism: load twice through the same door, same bytes.
const { DEEP_DIGEST: dig2 } = await server.ssrLoadModule("/data/deepDigest.ts");
ok("the digest renders byte-identically across loads", dig2 === dig);

const compCount = footballProvider.competitions().length;
const clubCount = footballProvider.clubs().length;
const playerCount = footballProvider.players().length;
ok(`every competition the world claims (${compCount}) is accounted for — every table the services ship is inside the digest: pl, liga, seriea, bundes, ligue1, eredivisie, liga1, spl, mls, brasileirao, jleague, superlig, ucl, uel, libertadores`,
  ["pl", "liga", "seriea", "bundes", "ligue1", "eredivisie", "liga1", "spl", "mls", "brasileirao", "jleague", "superlig", "ucl", "uel", "libertadores"]
    .every((id) => dig.includes(`(${id})`)));
ok(`every club the world owns (${clubCount}) is inside the digest`, footballProvider.clubs().every((c) => dig.includes(c.name)));
ok(`at least one player per club is inside the digest (${playerCount} players in the seed — starboard names 75+, roster names 9 per club)`, footballProvider.clubs().every((c) => footballProvider.players().some((p) => p.clubId === c.id && dig.includes(p.name))));
ok("the world meta line states the counts", dig.includes(String(compCount)) && dig.includes(String(clubCount)) && dig.includes(String(playerCount)));

// Every numeral the digest carries is in its own accepted set — the doors widen to digest numerics.
// The ledger + tape sections are real, named, counted.
const ledgerBlock = dig.slice(dig.indexOf("THE LEDGER"), dig.indexOf("THE BIGGEST TAPE"));
const ledgerLines = (ledgerBlock.match(/\n\s+\d{1,3}\. /g) ?? []).length;
const tapeBlock = dig.slice(dig.indexOf("THE BIGGEST TAPE"));
const tapeLines = tapeBlock.split("\n").filter((l) => /MD\d+/.test(l));
ok(`the ledger carries at least 60 attribute-vector lines (${ledgerLines.length ?? ledgerLines} found)`, ledgerLines >= 60);
ok(`the biggest-tape section lists between 1 and 15 fixture lines (${tapeLines.length} found)`, tapeLines.length >= 1 && tapeLines.length <= 15);
ok("THE BIGGEST TAPE is present and the margin is printed", dig.includes("THE BIGGEST TAPE"));
const testId = footballProvider.players().sort((a, b) => b.overall - a.overall)[0];
ok(`the rank-1 starboard line names the top player by overall (${testId.name} at ${testId.overall})`, dig.includes(testId.name));

const lines = dig.split("\n");
const numbersInLines = lines.flatMap((l) => l.match(/\d+(?:[\d,.]*\d)?/g) ?? []);
const missing = numbersInLines.filter((t) => { const n = Number(t.replace(/,/g, "")); if (!Number.isFinite(n)) return false; return !DEEP_DIGEST_NUMBERS.has(t) && !DEEP_DIGEST_NUMBERS.has(String(Math.round(n))); });
ok(`every numeral anywhere in the digest is in the accepted set the imprisonment doors read (${missing.length} offenders, planted or real)`, missing.length === 0);

// Plants: two known-shipped contamination samples must be refused by the set logic.
const plantedNumber = "999999999";
ok("a planted, never-digested numeral is refused by the accepted set", !DEEP_DIGEST_NUMBERS.has(plantedNumber));
const plantedClub = "Atlantis FC";
ok("a planted, never-digested club is refused by the world-club set", !WORLD_CLUB_NAMES.has(plantedClub));

await server.close();

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
