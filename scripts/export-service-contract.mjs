// M1037: regenerate the league service's contract resource from the seeded world.
//
// Run after any change to data/footballSeed.ts: `node scripts/export-service-contract.mjs`.
// proof-services.mjs re-derives the same snapshot and fails if this file is stale, so the Java
// resource cannot drift from the TypeScript world it claims to describe.

import { createServer } from "vite";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildWorldContract, serializeContract, CONTRACT_PATH } from "./lib/world-contract.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
try {
  const contract = await buildWorldContract(server);
  writeFileSync(resolve(root, CONTRACT_PATH), serializeContract(contract));
  const s = contract.snapshot;
  console.log(
    `wrote ${CONTRACT_PATH} — ${s.clubs} clubs, ${s.players} players, ${s.competitions} competitions, ` +
      `${s.matches} matches (${s.finishedMatches} finished), digest ${contract.digest.slice(0, 19)}…`,
  );
} finally {
  await server.close();
}
