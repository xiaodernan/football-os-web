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
