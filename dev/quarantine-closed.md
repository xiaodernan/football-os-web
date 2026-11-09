# The `.drafts/` quarantine — closed

**Closed by** `M1026`. **Opens to history.** Every file that ever sat under `.drafts/` is listed here or recoverable with `git show <commit> -- /.drafts/<path>`; nothing was ever force-pushed. This record exists so the name is not revived casually — the quarantine was an unusual shape (a sibling holding unshippable content the app refused to load) and re-creating it from memory would repeat the audit it took to build.

## What it was

The component farm / parallel lanes across M463–M943 wrote whole directories of screens, domains, helpers and tooling that the app never loaded, imported, or routed. `tsconfig` includes `src` but not `features/`; a dot-prefixed directory is not in the app's population, its gates, or its stylesheet. The quarantine held exactly that boundary — each draft sat at `.drafts/<its original path>`, so a `git mv` restored it exactly when it shipped — and the gates (`proof-drafts`, `proof-draft-imports`, `proof-draft-modules`, `proof-draft-types`, `proof-draft-any`, `proof-unused-locals`' program census) kept the line while lanes churned.

Content was either restored to the app (`git mv`, fixed, wired, proven and mounted) or retired (deleted from the tree). The waves and dispositions:

| Wave | Files (unique paths) | Disposition |
|---|---|---|
| `features/academy/` (YouthAcademy, AcademyManagement, AcademyOverview, AcademyReport, AdvancedAcademyManagement, CourseManagement) | 6 | retired — fabricated curriculum store; nothing compiles against any real door |
| `features/ai/` (ManagerAgent) | 1 | retired M1024 |
| `features/analytics/` (EuropeanQualification, FixtureDifficulty, HomeAwayAnalysis, LeagueTable, MatchAnalysis, MatchStats, PlayerComparison, PlayerRatings, RecentForm, RelegationBattle, SeasonAwards, SeasonPrediction, SeasonReview, SeasonSummary, SquadComparison, TeamPerformanceChart) | 16 | retired — all fabricate on invented data; the app's equivalents shipped and proved |
| `features/coach/` (CoachAnalytics, CoachCareerProfile, CoachStatistics; **CoachProfile** resurrected M523) | 4 | 1 resurrected, 3 retired |
| `features/community/` (AdvancedPluginSystem, CommunityActivity, CommunityEngagement, **CommunityPoll** resurrected M529, DataSync, FanEngagement, PluginSystem, UserFeedback) | 8 | 1 resurrected, 7 retired |
| `features/core/` (ModuleRefactoring, SystemOptimization) | 2 | retired — invented toolchains |
| `features/injury/` (InjuryList, InjuryPrediction, **InjuryReport** resurrected M530, InjuryTracker) | 4 | 1 resurrected, 3 retired |
| `features/league/` (**LeagueManager** → `/league-rules` M1023) | 1 | resurrected |
| `features/manager/` (AdvancedFinancialAnalyst, AdvancedTransferMarketReport, BudgetPlanning, **ClubFinance** → `/finance` M1022, FinancialAnalyst, PayrollStructure, SalaryCapAnalysis, SeasonDataViz, SeasonNews, SeasonOps, SeasonOpsAdvanced, SeasonReport, SquadDepth, **SquadPlanning** resurrected M526, TeamDataScreen, TeamDataViz, TeamFinance, TransferAnalysis, TransferMarketReport, TransferWindow) | 22 | 4 resurrected/rewritten, 18 retired |
| `features/match/` (FixtureSchedule, MatchPage, SeasonSchedule) | 3 | retired — fabrications; the app carries native matches at `/competitions`/`/football` |
| `features/media/` (MediaLibrary) | 1 | retired |
| `features/news/` (NewsArchive, NewsArchiveAdvanced, SeasonNews, SeasonNewsLive, TeamNews) | 5 | retired |
| `features/overview/` (44 screens, all unparseable, M943 batch) | 44 | retired — every one a template fill with invented dictionary keys, invented data and unclosed JSX; nothing from this wave was ever close to shippable |
| `features/player/` (ContractExtensionAnalysis, ContractManagement, ContractPrediction, MarketValuePrediction, MarketValueTrend, **PlayerContractDetails**, PlayerDataViz, PlayerDevelopmentAssessment, PlayerFiveYearPlan, PlayerMarketValueHistory, PlayerValueComparison, **PlayerValueRanking** resurrected M528, PotentialPrediction, TransferPrediction) | 15 | 2 resurrected/rewritten, 13 retired |
| `features/report/` (SeasonExport, TopScorersList) | 2 | retired |
| `features/schedule/` (SeasonSchedule) | 1 | retired M1025 |
| `features/scout/` (**ScoutReport**-family: ScoutReport, ScoutReportDetail) | 2 | retired — unparseable, fabricated |
| `features/scouting/` (EnhancedScoutReport, ScoutReport) | 2 | retired |
| `features/sync/` (SyncManager + domain/sync.ts) | 2 | retired M1025 — a fake sync; the settings page exports/imports JSON, the app's honest sync story |
| `features/tactical/` (TacticalAnalysisStudio, TacticalDashboard, TacticalEditor, **TacticalNotebook** resurrected M527) | 4 | 1 resurrected, 3 retired |
| `features/transfer/` (TransferAnalysis, TransferMarketReport, TransferPredictionEngine, TransferRumors) | 4 | retired — the /transfers board shipped instead |
| `features/world/` (SeasonAwards, SeasonReport, seasonStats.ts) | 3 | retired M1024 — /world's own report panel covers it |
| `domain/` (coachCareer.ts resurrected M523 with the coach résumé; finance.ts → M1022 /finance; league.ts → M1023 /league-rules; sync.ts retired M1025; transfer.ts retired M1024) | 5 | 3 resurrected, 2 retired |
| `ui/charts/` (EnhancedCharts, TrainingProgress) | 2 | retired — reached only by retired screens |
| `src/` (compat.tsx, mobile.ts, mobile-performance.ts) | 3 | retired — only reached from retired screens |
| `scripts/` (backup-season-data.mjs) | 1 | retired |
| `README.md` | 1 | the quarantine's own ledger — closed and replaced by this record |

**Counts:** 160 unique paths across the quarantine's life. **Eight resurrections** (each `git mv`, each proven and mounted): `domain/coachCareer.ts` + `features/coach/CoachProfile.tsx` (M523), `features/manager/SquadPlanning.tsx` (M526), `features/tactical/TacticalNotebook.tsx` (M527), `features/player/PlayerValueRanking.tsx` (M528), `features/community/CommunityPoll.tsx` (M529), `features/injury/InjuryReport.tsx` (M530), `domain/finance.ts` + `features/finance/FinanceBoard.tsx` (M1022 — the world's balance sheet), `domain/league.ts` + `features/league/LeagueRules.tsx` (M1023 — the table under different rules). Everything else was retired with a ledger note (M1022–M1026); the final sweep removed the last 107 stubs at M1026.

## The discipline it enforced (for whoever meets the quarantine's remnant)

1. `tsconfig` reads the app; a dot-prefixed directory is never app source. If something lands there, it is not in the tree's gates, the stylesheet for `@source not "../.drafts"`, or the population the census measures.
2. Nothing in-tree imports from it — not statically, not dynamically, not via `require` — and `proof-drafts` held that line by planting the near shapes and checking them.
3. A resurrection moved the file with `git mv` so history stayed attached to content, then made it parse, then compiled against the app's doors, then authored its words in three locales, then mounted it, then proved it. Splitting a resurrection across "parse fixed" and "feature delivered" never passed the suite as green.
4. Content that could not pass the doors got retired with a ledger note stating *why* its content could not ship (invented keys, invented data, impossible dependencies) — never "paired with effort" omitted.

## Recovering anything

```bash
git log --all --oneline -- .drafts | tail -3          # the era that wrote it
git show <sha>:.drafts/<path>                        # any file, whole
git log --follow -- .drafts/<path>                   # who wrote it when
```

---

*This record replaces the deleted `.drafts/README.md`. Its closing milestone is `M1026` — every gate the quarantine existed to feed is recounted in the same commit or confirmed honestly empty.*
