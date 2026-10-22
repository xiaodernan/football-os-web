// M441, after the commit: give the other lane its file back.
//
// The saved file is the other lane's in-flight version PLUS M441's chip edits (it was saved while
// both were in the tree). M441's chip edits are now committed, so this reverts them and leaves the
// other lane's date-door change exactly as it was.
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const file = "features/football/FootballWorld.tsx";
const path = join(root, file);
const stash = join(root, "dev", ".m441-other-lane-footballworld.tsx");

const saved = readFileSync(stash, "utf8");
const revert = [
  ['import { Panel, SectionTitle, StatTile, Crest, PositionTag, EmptyState, DemoBadge, CHIP_CLASS } from "@/ui/primitives";',
   'import { Panel, SectionTitle, StatTile, Crest, PositionTag, EmptyState, DemoBadge } from "@/ui/primitives";'],
  ['import { buildImpact, type Certainty, type ImpactEntity, type ClubStandingFact } from "@/domain/newsImpact";',
   'import { buildImpact, CERTAINTY_TONE, type ImpactEntity, type ClubStandingFact } from "@/domain/newsImpact";'],
  ['\n// The CERTAINTY\'s chip. The domain says how certain the read is; the screen says what the badge\n// wears — and the classes it wears are the app\'s shared palette (M440), the same chips the load\n// zones and the review kinds wear.\nconst CERTAINTY_CHIP: Record<Certainty, string> = {\n  high: CHIP_CLASS.success,\n  moderate: CHIP_CLASS.warning,\n  low: CHIP_CLASS.destructive,\n};\n', '\n'],
  ['CERTAINTY_CHIP[impact.certainty]', 'CERTAINTY_TONE[impact.certainty]'],
  ['CHIP_CLASS.optionOn : CHIP_CLASS.optionOff', '"border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40"'],
];
let text = saved;
let bad = 0;
for (const [from, to] of revert) {
  const n = text.split(from).length - 1;
  if (n === 0) { console.log("MISS", JSON.stringify(from.slice(0, 60))); bad++; continue; }
  text = text.split(from).join(to);
}
writeFileSync(path, text, "utf8");
console.log(bad ? `${bad} revert(s) missed` : "the other lane's file is back, without M441's chip edits");
