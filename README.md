# Football OS

A football operating system that combines a football world, personal development, an
AI coach, a knowledge graph, tactical tools and a deterministic match engine. Three
native modes — **FAN**, **PLAYER** and **MANAGER** — share one world dataset.

> **Runs fully in Demo Mode.** No API keys, no AI provider, no football data feed and
> no video model are required. Every number, fixture, player and "highlight" is
> generated deterministically from a seeded synthetic dataset, and is labelled
> `● DEMO DATA · synthetic` in the UI. This is not real football data.

## What is here

| Area | Route(s) | What it does |
| --- | --- | --- |
| Landing / Onboarding | `/`, `/onboarding` | Introduces the product and creates a profile + mode. |
| Command Center | `/` (post-onboarding) | Dashboard of fixtures, news, trending players and your progress. |
| Football World | `/football`, `/players`, `/clubs`, `/competitions`, `/matches`, `/news`, `/search` | Browse a synthetic world of 39 clubs, 318 players, 8 competitions and their fixtures/standings; entity detail pages with source-grounded news, and a per-article "Impact read" that resolves affected clubs/players to real standings and scores its own confidence. Player pages carry the dataset's real attribute vector (radar + top traits), a scout report against the positional template at matched skill, and a modelled career arc; club pages carry season analytics and a next-fixture xG; scheduled fixtures carry a model line. |
| Player OS | `/player` | Training plan loop: AI coach → session → complete → XP, attribute growth, streaks and goals. |
| Manager OS | `/manager` | Take charge of a club: play fixtures, buy/sell players, set team instructions, and climb a live league table. Adds a **season outlook** (title chance and expected finish projected from the live table), a retrospective **season summary** with honours, and a **match prep** advisor that recommends tactics from the same engine inputs the fixture will use and can project odds for it. |
| Football AI | `/ai` | RAG-style chat grounded in the world dataset, always with evidence, sources and a confidence score. |
| Knowledge Graph | `/knowledge` | Radial graph linking clubs, players, competitions and news; click a node to navigate. |
| Tactical Studio | `/tactical-studio` | Draggable 2D coaching board with formation presets, mentality and shape read-out. |
| Simulation Lab | `/simulation` | Tune tactics and run the deterministic Match Engine for a single fixture or a full season. |
| Knowledge Academy | `/learn` | Short football-analytics and tactics lessons with comprehension checks. Progress is evidence-based, not self-declared: every answer is recorded as an attempt, "completed" and "check passed" are tracked separately, and next lessons are ranked from your own training log, watchlist, career and film data — each suggestion quotes the number that triggered it. Passed checks unlock Scholar achievements, and completions appear on the activity timeline. |
| Community | `/community` | A device-local discussion board. Thread **topics** are generated from the world dataset (standings races, news items), but their authors and replies are clearly labelled `sample` — they are not real people and they carry no audience metrics. Only your own posts, replies and likes are counted, in a "Your activity" summary. |
| Scouting | `/scouting` | Club-needs profile, best-value picks and a filterable prospect table with compare; shortlist feeds the Command Center watchlist. |
| Dynamic World | `/world` | Deterministic season-by-season simulation layered over the dataset: players age and develop, get re-priced, retire and are replaced by academy prospects, and league champions are crowned each step. |
| Film Room | `/film` | Standalone video-analysis pillar: upload or drop clips, run the pipeline stage-by-stage, keep a local library of reports, review detected events/frames with confidence, and build a training plan from a finding. Across the whole library it computes detections per minute by type, actions/scans per minute, an older-vs-newer scanning trend (unlocked at two clips) and recurring coaching focus. |
| Data Room | `/data` | Advanced team analytics derived deterministically from the world's finished matches: league-pace attack/defence ratings, form, home/away splits and clean sheets, a **Poisson matchday forecast** for upcoming fixtures (win/draw/loss, expected goals, most likely scoreline) and modelled next-fixture xG. Small samples are regressed toward the league mean so a few odd games cannot dominate a line. |
| Transfer Centre | `/transfers` | Rumour board built from the world's own news feed: each linked target carries its source + credibility, a transparent asking-fee estimate, value index and headroom, plus a squad-fit score against your favourite club's depth. |
| Player Comparison | `/compare` | Head-to-head duel built from the dataset's real fields: rating/age/value metrics with a relative bar and a win count, **plus** a category profile and the eight biggest attribute differences taken from each player's own attribute vector. The verdict blends quality, upside and prime-window length. When a provider ships no vectors, the page says so instead of inventing a profile. |
| Watchlist Board | `/watchlist` | Your device-local starred players in one sortable board (value, potential, overall, age) with derived asking estimates — tick any two to open a head-to-head in the Compare tool. |
| My Profile | `/profile` | A personal growth dashboard built entirely from your locally-stored activity: level and XP curve, ability radar with strengths and focus areas, overall-rating trend, toggleable goals, recent sessions and favourites. |
| Achievements & Trophies | `/achievements` | Badges grouped by Training, Consistency, Growth, Explorer, Scholar and Analyst — each unlocked only from a genuine signal already in your local state (sessions logged, streak kept, goals met, plans requested, players watched, level reached, academy lessons completed, film clips analysed), with transparent progress bars and trophy points. |
| Settings & Data | `/settings` | Switch mode / language / theme, and see a real inventory of every registered `football-os.*` store (records + bytes per store, activity vs preference). Export **all** stores as one lossless bundle, import a bundle back with validation, and a guarded reset that clears activity but keeps preferences — all entirely on-device. |
| Activity History | `/history` | A day-grouped timeline merged from your real completed sessions, AI coach plans, academy completions, film clips analysed and coach-memory records, filterable by event type, sorted newest-first — nothing invented, every row reads straight from local state. |
| Weekly Review | `/review` | A coach-style period digest (7/30/90-day windows) compiled only from your local records: sessions, minutes, XP, streak, overall trend, self-rated quality, focus mix, attribute gains actually earned, academy completions and the detections from film clips analysed inside the window (scanning rate, older-vs-newer trend, repeated coaching focus), plus a next-focus recommendation that yields to observed film evidence when the two agree — each labelled with a confidence score and the evidence behind it, no external model called. |
| Load & Recovery | `/load` | Training-load management from your completed sessions (duration × session-RPE): acute 7-day vs chronic 28-day average daily load, an ACWR with colour-coded under/optimal/caution/high-risk bands, weekly monotony and strain, and a guidance card with confidence — a relative-load estimate, not a medical claim. |
| Role Gap Analysis | `/development` | Compares your saved attributes against a heuristic archetype for any position group at your current level: a role-readiness score weighted to role-critical traits, ranked development priorities and role strengths, a switchable target role, and evidence + confidence + sources. A demo training guide, explicitly not real scouting data. |
| Command palette | `⌘K` / `Ctrl-K` | Jump to any route or search entities across the world. |

## Architecture

```
domain/     pure, deterministic logic — match engine and its probability model, career
            model (outlook, summary, match prep), attributes and role gap, growth and
            projection, career arc, scouting and scout report, film insights, academy
            progress, analytics, community seeding, cross-mode footprint, local-data
            registry, XP. No React, no I/O: the testable core.
data/       provider layer + synthetic world seed. The UI never reads the seed directly.
store/      global user state (reducer + Context) persisted to localStorage.
features/   route-level UI, split into lazily-loaded chunks.
lib/        router (hash-based), i18n, theme, hooks, rng.
ui/         shared primitives.   components/ui: Shadcn primitives.
src/        entry (App.tsx routes), globals.css, main.
```

- **Provider abstraction.** `footballProvider` (world data), `coachProvider` (AI
  plans), a video provider (`data/video.ts`) and the intelligence layer
  (`data/intelligence.ts`) each sit behind an interface, so a real backend or model can
  replace the Demo implementation without touching components.
- **Determinism.** A seeded PRNG (`lib/rng.ts`, mulberry32 + FNV) drives world
  generation and every simulation, so identical inputs always reproduce identical
  results — required by the simulation contract.
- **Persistence.** User profiles, training, saved formations, manager careers, academy
  progress, film reports and community posts live in `localStorage` (device-local), with
  clear `provider` seams for later server storage. Every key is registered in
  `domain/localData.ts`, which drives the Settings inventory, the lossless export/import
  bundle and the activity-only reset — a new `football-os.*` key must be added there or it
  would silently be left out of backups. No credentials or secrets are ever
  placed in the frontend.
- **Models are labelled models.** Projections (season outlook, Poisson matchday forecast,
  career arc, attribute estimates) state their inputs, sample size, confidence and
  sources on screen, and are never presented as results or as measured scouting data.
- **Every state is handled.** Views include loading, empty, error and offline/degraded
  states; the language switcher covers English / 简体中文 / 繁體中文.

## Develop

Use Node 22.12+ (22.x):

```sh
npm ci
npm run dev      # Vite on the printed loopback URL (e.g. http://127.0.0.1:5173/)
npm run build    # type-check + static export into dist/
npm run preview  # serve the built output
```

The app is a static SPA with hash routing, so deep links work without a server.
Route-level code splitting keeps the initial chunk small; chart-heavy screens load on
demand.

## Roadmap status

Milestones M0–M88 are committed, one per milestone. Everything added in the current line
of work (M37 onward) was built green and checked in a browser against a fresh production
preview with a clean console before it was committed. Built and verified: shell + onboarding,
the Player OS training loop with a single source of truth for attribute growth, Football
World browse and entity detail (player attribute profile, scout report, career arc; club
season analytics), AI chat + knowledge graph, Tactical Studio, Simulation Lab with a
probabilistic match model, Manager career (season outlook, summary, match prep, projected
odds), Knowledge Academy with evidence-based progress, Community as an explicitly
sample-labelled local board, Scouting, Transfer Centre, Compare, Watchlist, Dynamic
World (multi-season), Film Room with cross-clip library insights, Data Room with a
matchday forecast, Profile/Progress, Achievements, Weekly Review, Load & Recovery, Role
Gap Analysis, Activity History, Settings with a full local-data registry (inventory,
lossless export/import, activity-only reset), i18n (EN / 简体中文 / 繁體中文), the ⌘K
command palette and route-level code splitting. Recent work (M65–M73) threads the film
library through the rest of the product via one shared reader — the Weekly Review and the
cross-mode profile record cite in-window clip detections, analysed clips appear as dated
events on the Activity History timeline, the Achievements "Analyst" group unlocks from real
clip counts, and the Player OS progress checklist reports the actual library instead of a
hardcoded signal. It also closes two dead-end recommendation surfaces: the Weekly Review's
suggested focus and the Load & Recovery guidance now each act on their own advice (build a
load-aware session via the shared `requestPlan` path, and the review can additionally track
its recommended attribute as a self-updating goal), with the Load page honestly withholding
a session only in the high-risk spike band where the advice is to rest. The Film Room's
"build a training" button now routes the analysed clip's actual `recommendedFocus` through
`requestPlan`'s focus keys rather than describing them in prose only (M72). And the Weekly
Review's "N planned sessions slipped" insight — previously unreachable because no code path
ever set a session to `missed` — is now backed by a deterministic overdue sweep at the
hydration boundary that flips planned sessions whose scheduled day has passed into `missed`
(a pure `sweepOverdueSessions`, provably excluded from the load model since it counts only
completed sessions), with the slipped rows surfaced in a Missed panel on the Training page
(M73). And the Player OS "AI memory · What your coach remembers" panel — which previously
only *displayed* stored memories while `generatePlan` ignored them — is now backed by real
continuity: `requestPlan` hands the newest plan's focus to the coach, which frames the next
diagnosis as continuing or rotating from that focus and adds a grounded "Coach memory"
evidence line naming it (M74). A follow-on honesty sweep then closed four more
computed-but-disconnected signals: the training-session note the user types at
completion is now carried onto the Activity History timeline instead of vanishing
(M75); the plan's "saved attributes (overall N)" source prints the real
`overallRating(attributes)` rather than a stale XP figure (M76); the coach's "session
shaped to your role" claim is now literal — each archetype carries a `gameFocus` and
the built session's game-realistic block actually trains it (M77); the never-dispatched
`SCHEDULE` reducer branch was removed as dead code (M78); and the Weekly Review's
overall tile shows its previously-dropped `64 → 71` baseline (M79). A second sweep then
targeted broken affordances and dead seams rather than only unwired math: Film Room's and
Player OS's video "Retry" now genuinely re-runs the analysis instead of just dismissing the
error (M80), the Player OS Video tab gained the `try/catch/finally` + error surface it was
missing (it could hang on "Processing… 100%" forever), the ⌘K "Ask Football AI" command
routes to the real assistant at `/ai` instead of a `/search?ai=1` param nothing read (M82),
logged match performances can finally be deleted (M83), `coachProvider.available` went from
a field no one consulted into a real `requestPlan` gate with an accurate error surfaced in
the Coach UI (M84), Tactical Studio's "Take to Simulation Lab" now actually carries your
mentality + shape into the lab instead of the link being decorative (M85), and the
hardcoded `ready = true` hydration flag became a real gate so returning users no longer
flash the logged-out Landing before their stored state loads (M86). A dead-code pass then
deleted the leftovers an honest audit surfaces but nothing ever reads: an unreferenced
`nearestWeakAttr` helper, the never-called `phaseSummary`/`ALL_FOCUS` training exports
(and the `PHASE_ORDER` const they alone used), an unused `TIER_ORDER` array, a stray
`getCompetition` import in the command palette, and the entirely dead async-boundary
abstraction (`useAsync`/`AsyncState`/`AsyncStatus`/`AsyncBoundary`) — the live loading /
error / retry states features actually use (`LoadingBlock`/`ErrorState`/`EmptyState`) are
untouched, so nothing shipped lost a state (M87). The academy's quiz `recordAttempt`
handler likewise dropped the `correct` flag it was handed; the fix clarifies the contract
rather than blurring it — an attempt only counts tries, while correctness is recorded by
`markLearned` at completion, so "mastered" still requires an actual passed check (M88).

**Still outstanding** (deliberately not faked): real data / AI / video providers behind
the existing seams, server-side multi-user persistence and shared community content, a
database designed for millions of rows, long-form i18n of editorial content, and
publishing (this project is intentionally local-only; `sites-hosting` has never been
run).

## Deploying

To host, follow the `sites-hosting` skill with `webDirectory: "dist"`. Publishing is a
deliberate step and has **not** been performed for this project — it is currently local
only. See `PROVENANCE.md` for asset and stylesheet attribution.
