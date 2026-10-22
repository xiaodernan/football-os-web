// M440: the chip palette, applied to the screens. UTF-8 safe (node reads and writes bytes as
// UTF-8; a shell round-trip through a legacy code page does not).
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const edits = [];
const E = (file, from, to) => edits.push({ file, from, to });

// --- the three zone screens: the load module's ZONE_TONE became the UI's ZONE_CLASS --------------
E("features/dashboard/Dashboard.tsx",
  'import { buildLoad, ZONE_LABEL, ZONE_TONE, type LoadZone } from "@/domain/load";',
  'import { buildLoad, ZONE_LABEL, type LoadZone } from "@/domain/load";');
E("features/dashboard/Dashboard.tsx",
  'import { Panel, SectionTitle, Crest, PositionTag, AttributeBar, EmptyState } from "@/ui/primitives";',
  'import { Panel, SectionTitle, Crest, PositionTag, AttributeBar, EmptyState, CHIP_CLASS, ZONE_CLASS } from "@/ui/primitives";');
E("features/dashboard/Dashboard.tsx",
  '  none: "border-border text-muted-foreground",\n  ...ZONE_TONE,',
  '  none: CHIP_CLASS.muted,\n  ...ZONE_CLASS,');
E("features/dashboard/Dashboard.tsx",
  '<Link to="/achievements" className="block rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-success">',
  '<Link to="/achievements" className={cn("block rounded-lg border p-3 text-sm", CHIP_CLASS.success)}>');
E("features/dashboard/Dashboard.tsx",
  '<div className="mt-3 rounded-lg border border-success/40 bg-success/10 p-2 text-xs text-success">',
  '<div className={cn("mt-3 rounded-lg border p-2 text-xs", CHIP_CLASS.success)}>');

E("features/player/PlayerOS.tsx",
  'import { buildLoad, ZONE_LABEL, ZONE_TONE, type LoadZone } from "@/domain/load";',
  'import { buildLoad, ZONE_LABEL, type LoadZone } from "@/domain/load";');
E("features/player/PlayerOS.tsx",
  'import { Panel, SectionTitle, StatTile, AttributeBar, DnaCard, EmptyState, LoadingBlock, ErrorState } from "@/ui/primitives";',
  'import { Panel, SectionTitle, StatTile, AttributeBar, DnaCard, EmptyState, LoadingBlock, ErrorState, CHIP_CLASS, ZONE_CLASS } from "@/ui/primitives";');
E("features/player/PlayerOS.tsx",
  '    none: "border-border text-muted-foreground",\n    ...ZONE_TONE,',
  '    none: CHIP_CLASS.muted,\n    ...ZONE_CLASS,');

E("features/load/LoadPage.tsx",
  'import { buildLoad, ZONE_LABEL, ZONE_LEGEND, ZONE_TONE, type LoadZone } from "@/domain/load";',
  'import { buildLoad, ZONE_LABEL, ZONE_LEGEND, type LoadZone } from "@/domain/load";');
E("features/load/LoadPage.tsx",
  'import { Panel, SectionTitle, StatTile, EmptyState, DemoBadge } from "@/ui/primitives";',
  'import { Panel, SectionTitle, StatTile, EmptyState, DemoBadge, CHIP_CLASS, ZONE_CLASS } from "@/ui/primitives";');
E("features/load/LoadPage.tsx",
  'const ZONE_BANNER_TONE: Record<LoadZone, string> = {\n  none: "border-border bg-secondary/30 text-muted-foreground",\n  ...ZONE_TONE,\n};',
  '// The banner\'s `none` row carries a secondary fill the bare chips do not, so it is the muted chip\n// WITH its wash — a chip of its own in the palette, not the bare muted chip the other two screens\n// wear. The shared map holds the four action zones only.\nconst ZONE_BANNER_TONE: Record<LoadZone, string> = {\n  none: CHIP_CLASS.mutedSoft,\n  ...ZONE_CLASS,\n};');

// --- the review screen's kind chips and its gain chips -----------------------------------------
E("features/review/ReviewPage.tsx",
  'import { Panel, SectionTitle, StatTile, EmptyState, DemoBadge } from "@/ui/primitives";',
  'import { Panel, SectionTitle, StatTile, EmptyState, DemoBadge, CHIP_CLASS } from "@/ui/primitives";');
E("features/review/ReviewPage.tsx",
  'const TONE: Record<WeeklyReview["insights"][number]["kind"], string> = {\n  positive: "border-success/40 bg-success/10 text-success",\n  watch: "border-warning/40 bg-warning/10 text-warning",\n  plan: "border-primary/40 bg-primary/10 text-primary",\n};',
  'const TONE: Record<WeeklyReview["insights"][number]["kind"], string> = {\n  positive: CHIP_CLASS.success,\n  watch: CHIP_CLASS.warning,\n  plan: CHIP_CLASS.primary,\n};');
E("features/review/ReviewPage.tsx",
  'className="rounded-md border border-success/40 bg-success/10 px-2 py-1 text-xs font-medium text-success"',
  'className={cn("rounded-md border px-2 py-1 text-xs font-medium", CHIP_CLASS.success)}');

// --- the history screen's filter chip ------------------------------------------------------------
E("features/history/HistoryPage.tsx",
  'import { Panel, SectionTitle, EmptyState, DemoBadge } from "@/ui/primitives";',
  'import { Panel, SectionTitle, EmptyState, DemoBadge, CHIP_CLASS } from "@/ui/primitives";');
E("features/history/HistoryPage.tsx",
  'filter === k.id ? "border-primary/40 bg-primary/10 text-primary" : "bg-card text-muted-foreground hover:text-foreground",',
  'filter === k.id ? CHIP_CLASS.primary : "bg-card text-muted-foreground hover:text-foreground",');

// --- the football world's certainty chip ---------------------------------------------------------
E("features/football/FootballWorld.tsx",
  'import { buildImpact, CERTAINTY_TONE, type ImpactEntity, type ClubStandingFact } from "@/domain/newsImpact";',
  'import { buildImpact, type Certainty, type ImpactEntity, type ClubStandingFact } from "@/domain/newsImpact";');
E("features/football/FootballWorld.tsx",
  'import { matchStatusLabel, newsKindLabel, newsSummary, newsTitle, rowLine } from "@/domain/rowText";',
  'import { matchStatusLabel, newsKindLabel, newsSummary, newsTitle, rowLine } from "@/domain/rowText";\nimport { CHIP_CLASS } from "@/ui/primitives";\n\n// The CERTAINTY\'s chip. The domain says how certain the read is; the screen says what the badge\n// wears — and the classes it wears are the app\'s shared palette (M440), the same chips the load\n// zones and the review kinds wear.\nconst CERTAINTY_CHIP: Record<Certainty, string> = {\n  high: CHIP_CLASS.success,\n  moderate: CHIP_CLASS.warning,\n  low: CHIP_CLASS.destructive,\n};');
E("features/football/FootballWorld.tsx",
  'CERTAINTY_TONE[impact.certainty]',
  'CERTAINTY_CHIP[impact.certainty]');

// --- the achievements screen's tier chips ---------------------------------------------------------
E("features/achievements/AchievementsPage.tsx",
  'import { Panel, SectionTitle, StatTile, EmptyState, DemoBadge } from "@/ui/primitives";',
  'import { Panel, SectionTitle, StatTile, EmptyState, DemoBadge, CHIP_CLASS } from "@/ui/primitives";');
E("features/achievements/AchievementsPage.tsx",
  'const TONE: Record<Tier, string> = {\n  gold: "text-warning border-warning/40 bg-warning/10",\n  silver: "text-info border-info/40 bg-info/10",\n  bronze: "text-muted-foreground border-border bg-secondary/30",\n};',
  '// The tier\'s chip: the app\'s shared palette (M440). A tier wears the same three-class chip the\n// load zones and the review kinds wear, and the bronze tier wears the muted chip with its wash.\nconst TONE: Record<Tier, string> = {\n  gold: CHIP_CLASS.warning,\n  silver: CHIP_CLASS.info,\n  bronze: CHIP_CLASS.mutedSoft,\n};');

// --- the muted chip -------------------------------------------------------------------------------
E("features/transfers/TransferCentre.tsx",
  'import { Panel, Crest, PositionTag, EmptyState, StatTile, DemoBadge } from "@/ui/primitives";',
  'import { Panel, Crest, PositionTag, EmptyState, StatTile, DemoBadge, CHIP_CLASS } from "@/ui/primitives";');
E("features/transfers/TransferCentre.tsx",
  'const KIND_TONE: Record<NewsArticle["kind"], string> = {\n  Rumor: "border-warning/50 text-warning",\n  Reported: "border-info/50 text-info",\n  Confirmed: "border-success/50 text-success",\n  Analysis: "border-border text-muted-foreground",\n  Opinion: "border-border text-muted-foreground",\n};',
  '// The stance badge is a border and a word, with no wash — a different chip from the palette\'s\n// three-class tone chip, and its own shape on purpose (M440). The two neutral stances wear the\n// app\'s shared muted chip.\nconst KIND_TONE: Record<NewsArticle["kind"], string> = {\n  Rumor: "border-warning/50 text-warning",\n  Reported: "border-info/50 text-info",\n  Confirmed: "border-success/50 text-success",\n  Analysis: CHIP_CLASS.muted,\n  Opinion: CHIP_CLASS.muted,\n};');
E("features/profile/ProfilePage.tsx",
  'import { Panel, SectionTitle, StatTile, Mini, Crest, EmptyState, DemoBadge } from "@/ui/primitives";',
  'import { Panel, SectionTitle, StatTile, Mini, Crest, EmptyState, DemoBadge, CHIP_CLASS } from "@/ui/primitives";');
E("features/profile/ProfilePage.tsx",
  'r.active ? "border-success/40 text-success" : "border-border text-muted-foreground"',
  'r.active ? "border-success/40 text-success" : CHIP_CLASS.muted');

// --- the filter chip ------------------------------------------------------------------------------
E("features/analytics/DataRoom.tsx",
  'import { Panel, SectionTitle, StatTile, Mini, Crest, EmptyState, DemoBadge } from "@/ui/primitives";',
  'import { Panel, SectionTitle, StatTile, Mini, Crest, EmptyState, DemoBadge, CHIP_CLASS } from "@/ui/primitives";');
E("features/analytics/DataRoom.tsx",
  'compId === c.id ? "border-primary/50 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:border-primary/30",',
  'compId === c.id ? CHIP_CLASS.filterOn : CHIP_CLASS.filterOff,');
E("features/transfers/TransferCentre.tsx",
  'active.has(k) ? "border-primary/50 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:border-primary/30",',
  'active.has(k) ? CHIP_CLASS.filterOn : CHIP_CLASS.filterOff,');
E("features/watchlist/WatchlistBoard.tsx",
  'import { Panel, SectionTitle, Crest, PositionTag, EmptyState, StatTile, DemoBadge, bestEdgeTone, worstEdgeTone } from "@/ui/primitives";',
  'import { Panel, SectionTitle, Crest, PositionTag, EmptyState, StatTile, DemoBadge, bestEdgeTone, worstEdgeTone, CHIP_CLASS } from "@/ui/primitives";');
E("features/watchlist/WatchlistBoard.tsx",
  'sort === s ? "border-primary/50 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:border-primary/30",',
  'sort === s ? CHIP_CLASS.filterOn : CHIP_CLASS.filterOff,');

// --- the option chip: the one you have picked, and the ones you have not ------------------------
const OPTION_FROM = '"border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40"';
const OPTION_TO = 'CHIP_CLASS.optionOn : CHIP_CLASS.optionOff';
for (const f of [
  "features/ai/AiStudio.tsx",
  "features/community/CommunityHub.tsx",
  "features/football/FootballWorld.tsx",
  "features/learn/LearnHub.tsx",
  "features/manager/ManagerOS.tsx",
  "features/onboarding/Onboarding.tsx",
  "features/player/PlayerOS.tsx",
  "features/scouting/ScoutingPanel.tsx",
  "features/tactical/TacticalStudio.tsx",
]) {
  E(f, OPTION_FROM, OPTION_TO);
}
for (const [f, from, to] of [
  ["features/ai/AiStudio.tsx",
    'import { Panel, EmptyState, DemoBadge } from "@/ui/primitives";',
    'import { Panel, EmptyState, DemoBadge, CHIP_CLASS } from "@/ui/primitives";'],
  ["features/community/CommunityHub.tsx",
    'import { Panel, SectionTitle, EmptyState, DemoBadge } from "@/ui/primitives";',
    'import { Panel, SectionTitle, EmptyState, DemoBadge, CHIP_CLASS } from "@/ui/primitives";'],
  ["features/learn/LearnHub.tsx",
    'import { Panel, SectionTitle, EmptyState, DemoBadge } from "@/ui/primitives";',
    'import { Panel, SectionTitle, EmptyState, DemoBadge, CHIP_CLASS } from "@/ui/primitives";'],
  ["features/manager/ManagerOS.tsx",
    'import { Panel, SectionTitle, Crest, EmptyState, DemoBadge, TONE_CLASS } from "@/ui/primitives";',
    'import { Panel, SectionTitle, Crest, EmptyState, DemoBadge, TONE_CLASS, CHIP_CLASS } from "@/ui/primitives";'],
  ["features/onboarding/Onboarding.tsx",
    'import { Crest } from "@/ui/primitives";',
    'import { Crest, CHIP_CLASS } from "@/ui/primitives";'],
  ["features/scouting/ScoutingPanel.tsx",
    'import { Panel, SectionTitle, Crest, EmptyState, DemoBadge, bestEdgeTone, worstEdgeTone } from "@/ui/primitives";',
    'import { Panel, SectionTitle, Crest, EmptyState, DemoBadge, bestEdgeTone, worstEdgeTone, CHIP_CLASS } from "@/ui/primitives";'],
  ["features/tactical/TacticalStudio.tsx",
    'import { Panel, SectionTitle, Crest, EmptyState, DemoBadge } from "@/ui/primitives";',
    'import { Panel, SectionTitle, Crest, EmptyState, DemoBadge, CHIP_CLASS } from "@/ui/primitives";'],
]) E(f, from, to);

// --- apply ---------------------------------------------------------------------------------------
const byFile = new Map();
for (const e of edits) {
  if (!byFile.has(e.file)) byFile.set(e.file, []);
  byFile.get(e.file).push(e);
}
let bad = 0;
for (const [file, list] of byFile) {
  const path = join(root, file);
  const raw = readFileSync(path, "utf8");
  const crlf = raw.includes("\r\n");
  let text = raw.replace(/\r\n/g, "\n");
  for (const e of list) {
    const n = text.split(e.from).length - 1;
    if (n === 0) { console.log(`MISS ${file}: ${JSON.stringify(e.from.slice(0, 70))}`); bad++; continue; }
    text = text.split(e.from).join(e.to);
    if (n > 1) console.log(`note ${file}: ${n} sites for ${JSON.stringify(e.from.slice(0, 50))}`);
  }
  writeFileSync(path, crlf ? text.replace(/\n/g, "\r\n") : text, "utf8");
}
console.log(bad ? `\n${bad} replacement(s) missed` : "\nevery replacement applied");
