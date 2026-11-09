# Drafts — the lane's unshipped screens and the modules only they reach

This directory holds material committed by the concurrent lane in M463–M521 that **the app never
loads**. Nothing here is imported by `src/main.tsx`, no proof loads it, and no route mounts it.
Measured on 2026-10-27 with the TypeScript parser (`createSourceFile`, `ScriptKind.TSX`):

- 48 screens under `features/` were unreachable from `src/main.tsx`;
- **39 of them produce parse diagnostics** — unbraced JSX attributes (`value=foo`), object
  literals in text positions (`{{p.name}[0]}`), unclosed elements, stray `=`;
- **9 parse but nothing routes or imports them**, and they pulled in ten modules of their own
  (five under `domain/`, two under `ui/charts/`, three under `src/`) that no reachable file reads.

All 48 screens are here at their original paths, together with those ten modules. A dot-prefixed
name is not shipped — `scripts/lib/appTree.mjs` says so and every tree-walking proof obeys it —
so keeping the drafts here keeps them in git without letting them enter the app's population,
its gates, its module graph, or its stylesheet.

## The 39 that do not parse

`features/academy/` (4), `features/ai/` (1), `features/coach/` (2), `features/community/` (1),
`features/injury/` (1), `features/manager/` (11), `features/media/` (1), `features/news/` (4),
`features/player/` (7), `features/scouting/` (2), `features/tactical/` (2).

## The 9 that parse

- `features/coach/CoachProfile.tsx`
- `features/community/PluginSystem.tsx`
- `features/injury/InjuryTracker.tsx`
- `features/league/LeagueManager.tsx`
- `features/manager/TransferWindow.tsx`
- `features/schedule/SeasonSchedule.tsx`
- `features/sync/SyncManager.tsx`
- `features/tactical/TacticalEditor.tsx`
- `features/world/SeasonReport.tsx`

…and the ten modules only they reached:

- `domain/coachCareer.ts`, `domain/finance.ts`, `domain/league.ts`, `domain/sync.ts`,
  `domain/transfer.ts`
- `ui/charts/EnhancedCharts.tsx`, `ui/charts/TrainingProgress.tsx`
- `src/compat.tsx`, `src/mobile.ts`, `src/mobile-performance.ts`

## Two more that were reachable only through a dead export

- `features/world/SeasonAwards.tsx` — `DynamicWorld.tsx` imported it only to re-export
  `SeasonAwardsComponent`, which no screen rendered; all 19 of its `t()` rows were absent from
  every locale, so it had never been translated.
- `features/world/seasonStats.ts` — read by `SeasonAwards` and by the drafted `SeasonReport`,
  and by nothing else.

Parsing is not compiling. Several of the nine still need fixes before `tsc` will accept them once
imported: `TransferWindow.tsx` and `SyncManager.tsx` call `React.useState` without importing
`React`; `EnhancedCharts.tsx` and `TrainingProgress.tsx` call `t()` without calling `useI18n`;
`CoachProfile.tsx` reads `localStorage` directly where the storage door expects `browserStore`.

## And one script

`scripts/backup-season-data.mjs` (M498) is here for the same reason: it is `.mjs` but uses CommonJS
(`require`, `module.exports`), so Node would refuse it at load, and it does not parse either — the
`files.map(...)` call at line 65 is closed by the `.sort(...)` call's parenthesis. Nothing ran it;
nothing references it outside the plan file. A single syntax fix would make it parse without making
it a tool the repository uses, so it waits with the rest.

Drafts also stay out of the stylesheet now. Tailwind's automatic content detection reads class
names as text, so before the fix `bg-blue-500` — used only by three drafts — was in the built CSS.
`src/globals.css` carries `@source not "../.drafts"`, and the class is gone from the build.


## Resurrecting one

1. `git mv .drafts/<path> <path>` — restore the original location, plus any module it reached
   from this directory.
2. Make it parse, then let `tsc` read it for the first time by importing it from reachable code
   (`tsconfig.json` includes `src`, not `features/`); it will name the type errors.
3. Author the `t()` rows it asks for in all three locales — the lane shipped none of them.
4. Mount it (an ops-hub registry entry or a hub tab) so coverage can reach it, and run the
   suite; the structural gates will name the invariants it breaks (raw divs, inline rounding,
   storage keys, vocabulary lists).

The lane's generator writes to the original `features/...` paths, so a later lane commit may
re-create a file that is drafted here. Check `git status` for duplicates after a rebase.


## The fourth wave (M943): the overview batch, all 44 unparseable

The component-farm lane's M936–M942 run wrote a whole `features/overview/` directory — 44
screens from `Captaincy` to `TransferStats` — that nothing routes, nothing imports and nothing
reaches: `proof-unused-locals`' program census found all 44 outside the tsconfig program at
M942, the same shape M522 quarantined and M525 re-quarantined. Measured on 2026-11-05 with the
TypeScript parser: **44 of 44 produce parse diagnostics**, worse than the first wave's 39/48.
They reach for `ui/primitives` and `lib/utils` only — both stay reachable, so no module follows
them here — and none of their 583 `t()` calls has a dictionary row in any locale (the farm has
never authored one), so the quarantine removes no keys. They sit here at their original paths;
a resurrection follows the same four steps as above, starting from a parse fix.

## Resurrections (the ledger, newest last)

- **M1022: `domain/finance.ts` and `features/manager/ClubFinance.tsx` → `features/finance/FinanceBoard.tsx`.**
  The drafted fold hand-keyed a calculator (manual budget inputs the app had no door to fill,
  hardcoded Chinese messages, a State that could never be populated, `Math.random(...)`-free but
  useless without a host club context). Resurrected as the world-scale board the plan always
  promised: a single deterministic fold `clubFinance(clubs, players)` in house style, mounted as
  `/finance` with a nav entry; the screen reads the fold, the world refolded every read; the
  drafted StatTile import/labels mis-typed were rewritten to the fork's real doors
  (`fmtMoney`, `StatTile{label,value,sub,tone}`, `TileTone`); 15 `fin.*` keys ×3 locales;
  `scripts/proof-finance.mjs` charges the fixture's hand-count, the seeded arm independent
  recount over all 73 clubs (squad book €86.03B, wage ratio 0.95) and the screen's stranger-arm
  reader. The old screen moved to `features/finance/FinanceBoard.tsx` per the git-mv discipline;
  the empty budget surface is gone — the board is read-only by design.
- **M1023: `domain/league.ts` and `features/league/LeagueManager.tsx` → new `domain/league.ts`,
  `features/league/LeagueRules.tsx`.** The drafted league module was interface-only (a
  multi-user `League`/`LeagueCreationForm` for a fantasy-style hosted league — no doors, no
  persistence, empty bodies); the drafted screen was a `localStorage`-backed fake of the same
  idea with Chinese strings and a non-existent `footballProvider.teams()` call. Resurrected in
  spirit as the seed-scale thought experiment the world can actually answer: fold
  `customPointsTable(compId, matches, clubs, rules)` — the same fixtures read two ladders
  (the standard 3/1/0 the standings use, and the reader's vector), rows carry both point sets
  and both positions plus sway; mounted as `/league-rules` with a nav entry; table replicates
  the seed's standings on the standard triplet (the seeded arm cross-checks points identity
  over the 15 seeded competitions); 17 `rules.*` keys ×3 locales; `scripts/proof-league-rules.mjs`
  charges the tie-rule order, the two-arm fixture hand-count (positions flip under 3-0-0) and
  the screen's stranger-arm reader. The fantasy-league entry itself remains out of scope for the
  demo until a live back-end exists; nothing about the fold pretends otherwise.

## Retirements (the ledger, newest last)

- **M1024: eight retired drafts — content the app had already shipped better, or content that could
  not compile against any real door.** `features/world/SeasonReport.tsx`, `features/world/SeasonAwards.tsx`
  and `features/world/seasonStats.ts` are a hollow re-creation of what `/world` already renders and exports
  (the `buildSeasonReport`/`seasonReportPayload` panel — dynasties, rise/fall, export to JSON — shipped with
  its own proofs and E2E coverage). `scripts/backup-season-data.mjs` was a CommonJS script written as ESM that
  nothing invoked or could. `features/manager/TransferWindow.tsx` and `domain/transfer.ts` are superseded on
  both sides: the manager-side transfers ride `domain/career` (budget, morale, fatigue, marketTargets) in
  `/manager`'s transfers tab, and the world's targets board rides `domain/transfers.ts` in `/transfers`
  (rumours, fit scores, asking fees) — their hand-keyed `calculateTransferFee` was a toy, their
  `footballProvider.teams()`/`contractYearsRemaining` never existed, and `getFreeAgents` was an empty body
  with a comment promising code. `features/ai/ManagerAgent.tsx` and `features/manager/TransferAnalysis.tsx`
  are retired with the same stroke: both imported the deleted `seasonStats` stub and
  `footballProvider.teams()` — the app has no such door, and no editor of theirs could resolve them.
  The quarantine's proof pins recount in the same commit (proof-draft-any 10→9 & ledger 4→2,
  proof-draft-modules 4→1 specifiers, proof-draft-types 119→112).
- **M1025: six more retired drafts — the parseable nine closed out.** `features/community/PluginSystem.tsx`
  (a mock list with invented `plugin.*`/`category.*` dictionary keys that never existed anywhere), 
  `features/schedule/SeasonSchedule.tsx` (fake "Team A … Team F" fixtures on fabricated dates), 
  `features/injury/InjuryTracker.tsx` (a client-only CRUD of invented injury types with no seed, no
  store and no career wiring — nothing in it tied to the world the app runs on), 
  `features/tactical/TacticalEditor.tsx` (pure React state + a `window.alert` masquerading as a save;
  the shipped Tactical Studio already does drag boards, presets and replay), 
  `features/sync/SyncManager.tsx` and `domain/sync.ts` (a fake sync that always "succeeded" against a
  back-end that does not exist; the settings page already exports/imports the store as JSON, which is
  the app's honest sync story until a server exists). The parseable-nine list from the M527-era
  ledger is now closed: three resurrected (M1022/M1023), six retired, and this milestone retired
  the rest. The quarantine's proof pins recount in the same commit (proof-draft-types 112→106;
  proof-draft-modules specimen now stands at zero sibling doors — the endstate the quarantine was
  built to reach, witnessed by the planted arms rather than by a floor).
