// M441: put the football world back on HEAD's date code, keeping M441's chip edits, so the
// milestone can be committed without carrying the other lane's in-flight door with it. The other
// lane's version of the file is saved first and restored after the commit.
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const file = "features/football/FootballWorld.tsx";
const path = join(root, file);
const stash = join(root, "dev", ".m441-other-lane-footballworld.tsx");

// Save the other lane's version (their date change plus M441's chip edits).
copyFileSync(path, stash);
console.log("saved the other lane's version to", stash);

// HEAD's version.
const head = execFileSync("git", ["show", `HEAD:${file}`], { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 });
let text = head;

const edits = [
  ['import { Panel, SectionTitle, StatTile, Crest, PositionTag, EmptyState, DemoBadge } from "@/ui/primitives";',
   'import { Panel, SectionTitle, StatTile, Crest, PositionTag, EmptyState, DemoBadge, CHIP_CLASS } from "@/ui/primitives";'],
  ['import { buildImpact, CERTAINTY_TONE, type ImpactEntity, type ClubStandingFact } from "@/domain/newsImpact";',
   'import { buildImpact, type Certainty, type ImpactEntity, type ClubStandingFact } from "@/domain/newsImpact";'],
  ['import { matchStatusLabel, newsKindLabel, newsSummary, newsTitle, rowLine } from "@/domain/rowText";',
   'import { matchStatusLabel, newsKindLabel, newsSummary, newsTitle, rowLine } from "@/domain/rowText";\n\n' +
   '// The CERTAINTY\'s chip. The domain says how certain the read is; the screen says what the badge\n' +
   '// wears - and the classes it wears are the app\'s shared palette (M441), the same chips the load\n' +
   '// zones and the review kinds wear.\n' +
   'const CERTAINTY_CHIP: Record<Certainty, string> = {\n' +
   '  high: CHIP_CLASS.success,\n' +
   '  moderate: CHIP_CLASS.warning,\n' +
   '  low: CHIP_CLASS.destructive,\n' +
   '};'],
  ['CERTAINTY_TONE[impact.certainty]', 'CERTAINTY_CHIP[impact.certainty]'],
  ['"border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40"',
   'CHIP_CLASS.optionOn : CHIP_CLASS.optionOff'],
];
let bad = 0;
for (const [from, to] of edits) {
  const n = text.split(from).length - 1;
  if (n === 0) { console.log("MISS", JSON.stringify(from.slice(0, 60))); bad++; continue; }
  text = text.split(from).join(to);
}
writeFileSync(path, text, "utf8");
console.log(bad ? `${bad} replacement(s) missed` : "every replacement applied");
