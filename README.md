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
| Football World | `/football`, `/players`, `/clubs`, `/competitions`, `/matches`, `/news`, `/search` | Browse a synthetic world of 39 clubs, 318 players, 8 competitions and their fixtures/standings; entity detail pages with source-grounded news, and a per-article "Impact read" that resolves affected clubs/players to real standings and scores its own confidence. Player pages carry the dataset's real attribute vector (radar + top traits), a **Football DNA** read (primary + secondary archetype and evolution path, scored from that same vector), a scout report against the positional template at matched skill, and a modelled career arc; club pages carry season analytics and a next-fixture xG; scheduled fixtures carry a model line. |
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
| Player Comparison | `/compare` | Head-to-head duel built from the dataset's real fields: rating/age/value metrics with a relative bar and a win count, **plus** a category profile, the eight biggest attribute differences taken from each player's own attribute vector, and a **style & role** panel comparing each side's Football DNA. The verdict blends quality, upside and prime-window length. When a provider ships no vectors, the page says so instead of inventing a profile. |
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
  would silently be left out of backups. Every module reads its key from that registry
  rather than repeating the string, so versioning a key cannot leave a stale reader behind.
  No credentials or secrets are ever placed in the frontend.
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

Domain behaviour is pinned by runnable proof scripts — each loads the modules through
Vite's SSR runtime and asserts the claims a milestone rests on. They cover the numeric
cores (analytics, match engine, fixture probability, development projections, XP curve,
role-gap analysis, film insights, career arc, comparisons, transfers, the Manager OS career
model), the shared local stores (the clip library the Film Room writes and four screens read;
the export/import/reset registry) and the honesty contracts (AI grounding, offline wording, feed
ranking, the weekly review's prose, the words the knowledge graph draws, and the community
board's sample-content flags and data-derived discussion starters). The runner that executes them
is itself gated, so a verdict means what it says. Run them all:

```sh
npm run proof                        # = npm test: every scripts/proof-*.mjs, one verdict per script
node scripts/proof-m99.mjs           # Football DNA: vector rule, archetype derivation, determinism
node scripts/proof-ai-grounding.mjs  # AI answers: grounded value extraction, no invented ranking, determinism
node scripts/proof-localdata.mjs     # registry: lossless export/import, activity-only reset, i18n labels
```

They are plain Node and exit non-zero on failure, so there is no test runner to install.
The runner reports three verdicts per script rather than a boolean, because exit code 1 covers
several very different events and only one of them is a broken contract:

| Verdict | Meaning |
| --- | --- |
| `PASS` | printed a tally, every check in it green, exited 0 |
| `FAIL` | a check the script counted came back red — a contract broke |
| `UNVERIFIED` | no evidence: never started, killed, hung past its time budget, died before its tally, exited 0 without one, counted 0 checks, printed all green and then died anyway, or died that way twice in a row |

Both non-green kinds keep the suite red; what changed is that the line now names which one
happened, so `npm run proof` cannot quietly mean "nobody looked" while reading as "something
broke". A script that produces **no evidence** is given one more attempt (M203) — and only that
kind: a `PASS` already has its evidence, and a counted red must never be able to flake away. When a
retry happens the line says so (`(recovered on attempt 2)`) and the summary names the scripts that
needed one, so flakiness is reported rather than hidden. `scripts/proof-runner.mjs` gates the runner
itself, against fake proofs in the OS temp directory that emit each signature on purpose — the runner
accepts a directory as `argv[2]` for exactly that. Each script also runs under a ten-minute budget
(`PROOF_TIMEOUT_MS` overrides it, which is how the proof watches a timeout fire in seconds): before
that budget existed, one hung proof stopped the suite for good, printing nothing at all. Its own
numbers, like every other milestone's, come from the tool:

```sh
node scripts/proof-runner.mjs         # the classifier's truth table + the runner end to end
node scripts/run-proofs.mjs path/to/dir    # run a directory of proofs other than scripts/
```

`npm run proof` prints the live script and check counts; the README deliberately does not,
because a checked-in total goes stale the moment a proof is added.


The app is a static SPA with hash routing, so deep links work without a server.
Route-level code splitting keeps the initial chunk small; chart-heavy screens load on
demand.

## Roadmap status

Work ships one milestone per commit and is currently at M420
were skipped; M238, M239 and M241 had no sections when M240's was written, and this sync added all
three; the proof scripts advanced to M322 in commits that carried no README section, and M323 is the
first unit to land with one since M316). Everything added in the current line of work (M37 onward) was built green, and
was checked in a browser against a fresh production preview with a clean console up to M165;
from M166 on the in-app browser stopped committing a React tree at the machine level, so the
evidence for a change is now the proof suite plus, where a component renders without the
store, a server-rendered string check in all three locales — stated per milestone rather than
assumed. (M194 got a live tree back by building a clean tree containing only that milestone's
files and serving it, which is what its browser confirmation ran on; the suite remains the
standing evidence.) Built and verified: shell + onboarding,
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
`markLearned` at completion, so "mastered" still requires an actual passed check (M88). And
the `AiMemoryEntry` kind union lost a `tactical` variant no write path ever produced and no
consumer ever matched — only `coach`/`training`/`profile` memories are actually emitted (M89).
A third sweep then targeted a divergent second model: the Player OS "Workload" tab computed
its own ACWR from session-count slices (`completed.slice(0,7)` vs `slice(0,28)`), which for
anyone under 7 logged sessions is pinned at 1.00 and disagrees with the canonical 7-/28-*day*
rolling model the Load page and Dashboard use — the same page could show two different ACWR
values under one name. It now calls the shared `buildLoad` for acute/chronic/ACWR/zone (and
the same day-window weekly volumes for the bars), so the app has exactly one ACWR source; the
spike warning keys off `zone === "high"` instead of a hand-rolled threshold (M90). A fourth
fix removed a fabricated AI answer: for "who/player/rating/star" questions `askFootballAI`
led with "the most influential figure stands out in …" while interpolating `facts[0]` — a
fixture label of the two *club* names, never a player. It now states plainly that Demo Mode
has no player-influence ranking and refuses to invent a decisive individual, then hands over
the real seeded fact it is actually citing (M91). The match engine has long computed two
per-side stats — pass accuracy and duels won — that no screen ever displayed; they now sit in
the Simulation Lab's head-to-head stat comparison on the match detail page, so every number
the engine produces is one the user can actually read (M92). The store has exposed a
`setFavorite` action since onboarding, but no screen ever dispatched it — your favourite club
and player were frozen forever after first-run setup even though the Dashboard, scouting
default and Simulation Lab all key off `favoriteClubId`. The club and player detail pages now
carry a ★ "Set as my club/player" toggle that drives `setFavorite`, so the choice is changeable
and every downstream consumer updates with it (M93). The Weekly Review's "Recompile" button
was theatre — a 420 ms flash that recomputed nothing, because the academy and film stores it
reads from are memoised once on mount and never re-fetched. Those read-only hooks now take an
optional `rev` re-read dependency, and Recompile bumps it, so pressing it genuinely re-reads
the local stores (and rebuilds the window with the current time) instead of pretending to.
Existing callers pass no `rev` and are unchanged (M94). The Player OS "Log a match
performance" list claimed it "Feeds your analysis and progress", but its rows are stored under
their own key that nothing in the analytics, load, XP or footprint models ever reads — it is a
private log surfaced only in the Settings export. The hint now says exactly that instead of
promising an integration that does not exist (M95). The work then turned to the data contract
rather than unwired numbers: the never-produced `SUB` match-event variant and its glyph were
deleted (M96), and the ten modules that repeated `football-os.*` key strings as literals now
import them from the registry, so versioning a key can no longer leave a stale reader behind
(M97). A copy sweep then fixed a half-translated placeholder on the match page (`mid场`) and
removed three regex alternatives an earlier branch made unreachable, adding `dev/scan-cjk.mjs`
so a stray non-English glyph in UI code is a one-command check (M98). Two spec gaps closed
next: world player pages now carry a full Football DNA read — primary and secondary archetype
plus the evolution path, scored from the player's own dataset vector and withheld rather than
invented when a provider ships ratings only, with the vector-presence rule deduplicated into
`domain/playerDna.ts` (M99); and the Compare page gained the style & role dimension §29 asks
for, putting both players' DNA side by side (M100). `scripts/proof-m99.mjs` pins the
load-bearing claim — re-deriving the archetype from a player's stored vector reproduces the
dataset's own `archetype` key for every seeded player — and passes 20/20. A finished match
then had a dead affordance: its "Timeline" heading was paired with a permanent "No events
recorded" because the Simulate button was gated off for played fixtures, so there was no way
to see any timeline or stats. M101 removes that gate and makes it honest — finished matches
now offer a "Reconstruct with Match Engine" run, the real scoreline is never overwritten, and
the result is labelled throughout as an illustrative reconstruction (not the recorded events)
rather than a fabricated timeline; `m.events` stays the seam a real provider fills in. The
value question had a subtler break: the "How much is X worth?" answer matched a literal
`value …` in the retrieved fact, but the fact phrases it as `worth €316M`, so the regex never
fired and every value answer degraded to "sits at listed". M102 extracts the actual currency
token, so the real listed figure now surfaces (and the no-value case reads honestly). The
`FAVORITE` reducer also carried an unreachable third arm: `setFavorite("competition", …)` and
its `favoriteCompetitionId` write were never triggered, because `FavoriteButton` only offered
club and player. M103 wires that arm to a real control — competition pages now expose a
"Set as my league" star — so the field is user-settable beyond onboarding and the Data Room
follows it, making the onboarding promise that favourites personalise the app genuinely true
for all three favourite kinds. A dead-output sweep then removed computed values that nothing
ever read: an unreachable scout-report/coach branch (M104), the never-called `nextSeason`
wrapper and a write-only `NewsImpact.affected` field the news panel already re-derives
(M105), `KgNode.weight` and the raw-hits field persisted onto every AI answer despite the
Evidence block already showing facts/sources/confidence (M106, which also stopped that
storage bloat), and the derivable identity/skill fields on the scout report and modelled
profile (M107). That work was then pinned with two runnable proofs so a future edit cannot
silently regress it — `scripts/proof-ai-grounding.mjs` guards the AI honesty contract
(grounded value extraction, no invented ranking, determinism) and `scripts/proof-localdata.mjs`
guards the backup/recovery contract (lossless export/import, activity-only reset, the
registry↔i18n label invariant).

The M108–M159 line of work is a different kind of progress: it makes the earlier claims
checkable, and closes the remaining gaps between what the interface says and what the code
does. The numeric cores behind displayed figures have been pinned one at a time with
runnable proofs — analytics (M112), Dynamic World (M113), match engine (M114), fixture
probability (M119), XP curve (M120), role gap (M121), comparison (M124), development
projection (M126), film insights (M128), career arc (M129), Academy accounting and its
try-it targets (M134), offline wording (M139), club-ranked feed (M140), the transfer
board (M141), the forecast figure a reader can add up by hand (M142) and the
dictionary's own completeness and script (M143) — behind one runner so a check cannot
silently rot (M111). In the same range,
each overclaim became either a real affordance or accurate wording: the Dynamic World error
Retry re-runs the simulation (M115), the Academy "has a career" signal no longer fires on a
null career (M116), the Transfer Centre's "change club" goes to the club picker (M117), the
match advisor carries its recommended mentality into Tactical Studio (M118), the landing
pillars stopped promising animation, skill trees and contracts the app does not have (M122),
the coach's "New" button clears the plan it displays (M123), the role-gap panel hands its
priorities to the session planner (M125), the news detail no longer shows a source link that
resolves nowhere (M127), every Academy lesson's try-it link lands on the screen that performs
the action (M133), the empty-watchlist hint names the control it points at (M135), and three
offline notices now state the on-device mechanism instead of implying a network call or a
reconnect queue (M136–M138). M140 turns onboarding's "personalises your feed" into a real,
order-only club ranking that labels itself only when the chosen club genuinely appears in
the feed. M130–M132 localised the Football World browse surface, the Tactical Studio and
the Football AI. M142 put the analytics engine's expected-total-goals figure on both
forecast panels — the model had been computing it with no reader — and deleted two
exported fields that only restated another one. M143 then found that the 繁體中文
dictionary opened with `...zhCN`: 18 of its labels were arriving from the
Simplified dictionary untouched, 14 of those displayed 简体 characters, and 5 more had
been written out with a 简体 character in them — so 19 strings a Traditional reader was
shown were in the wrong script, the sidebar's search entry among them. Eight of the 18
were the player page's tab-strip labels, and those were not reaching the screen at all:
the strip rendered its own hardcoded English, so correcting them in the dictionary would
have changed nothing a reader sees. The strip now reads its labels from the dictionary,
including a new `player.overview` key, and proof-i18n pins both halves — a raw label or
a dropped `t()` at the render site each turn the check red. The same
spread had also made the locale-parity check structurally incapable of failing, because
the assembled object always contained every key; deleting a zh-TW line left the proof
green. The block is now self-contained and the proof detects both a reintroduced spread
and a reintroduced Simplified character, each mutation-tested. Two characters the audit
flagged and left alone — 峰, in three strings, and 群 — are ordinary Traditional variant
forms, not Simplified. A sweep of the remaining panels still owed a few untranslated UI
strings — the Dashboard's "% confidence" suffix and its "News →" link were two of them,
and Manager OS's whole tab strip was hardcoded English. **All three were resolved by
later milestones, and this note outlived them** — M405 withdrew it, and the evidence is
in `scripts/proof-ledger.mjs`: `dash.confidence` now reads "可信度 {n}%" in both Chinese
locales, the Dashboard holds no "News" literal at all (the link reads `dash.allBadges`),
and the Manager OS tab strip reads its seven labels through `t()` — a clause
proof-i18n has carried since M143. The note had been a live claim for two hundred
milestones, and nothing in the suite could have told.

M144 asked the dictionary a different question: not whether a locale is complete, but
whether a key can reach the screen at all. An audit that resolves keys held in variables
rather than scanning only literal `t("…")` calls found 22 labels no code path names. Five of
them belong to the shared primitives every screen renders — the demo badge, the loading
status, the empty and error states — so a Chinese visitor was reading the app's most common
chrome in English. Those five now come from the dictionary, plus two keys M144 added
(`common.synthetic`, `common.errorDetail`), and proof-i18n pins both directions: that each
primitive reads its own label through `t()`, and that the English literals it replaced do
not come back. Two halves of this are verified from source rather than seen on screen, and
are claimed as such: `EmptyState`'s default title is a fallback no current call site takes,
and the loading block's new accessible label was read, not observed during a live loading
pass. 17 unreachable labels were outstanding at this point, each with a disposition — six were
dead duplicates of a `set.key.*` family Settings already renders, the rest were wired to the
control they describe or deleted — and the audit itself owed a permanent gate, so a label
could not be added again without naming a place that renders it. **Both of those were
delivered**: M145 took the count from 17 to 15, later milestones took it to 0, and
proof-i18n now carries the permanent gate ("every dictionary key is reachable — static,
quoted, or a value a dynamic site can build", reading 0 unreachable over 99 reader files
and 1778 static/quoted plus 256 dynamic claims). M405 withdrew the note and
`scripts/proof-ledger.mjs` charges the withdrawal.

M145 localised the scouting board, which was 236 lines with no `t()` call in them at all:
34 new `scout.*` keys per locale (733 keys in total now), and two keys that had been
written but never rendered (`watch.template`, `common.age`) came into use, taking the
unreachable count from 17 to 15. The board's own tooltip was a hand-typed copy of
`watch.templateHint`, so collapsing the duplicate changed one English word on screen —
"strongest and weakest category *against* a player" now reads "*compared with* a player".
What the source-level checks could not see turned out to be the more interesting find: a
live pass in the browser showed English ("Tactical +3 · Physical 0") sitting inside a
fully translated 繁體中文 table, because `templateEdge()` handed both the scouting and
watchlist boards a display label rather than a category id, and a label that arrives as an
interpolation is invisible to a scan for string props and text nodes. The domain now
returns the id and both boards translate it; checks 14–15 pin that shape, and 15 checks
all four categories against the real `CATEGORY_ORDER` rather than only the key prefix.
Nine mutations (M10a–M15a) each turned the gate red. Declared carve-outs, not oversights:
OVR, POT, OVR/€M, `vs` and the GK/DEF/MID/ATT bucket codes are codes the app prints
identically in every locale, and values that come out of the dataset — player names, club
short codes, archetype labels — stay English in every locale, in the same class as nation
names. The honest blind spot is unchanged: check 12 still cannot see prose that follows a
`{…}` inside a node, which is why 13 and 14 exist. Verified in a browser at a fresh
production build in all three locales (the placeholder-bearing `短名單 · 1` and the
`巔峰約 0 年` row both rendered, and an English reader sees the pre-M145 wording apart
from the tooltip above), with a clean console. The measured debt this makes visible:
350 of 386 visible-text lines across the feature files are still untranslated — Manager OS
(84 lines, no `t()` at all), Player OS (61), player detail (56), community (23),
simulation lab (22), film room (16), dashboard (15), academy (13), onboarding (12).

M146 spent the 15 keys M145 left behind and then removed the need to do that by hand
again. Two independent audits — one matching `t("key")` literals, one also accepting
a key that appears as a quoted string anywhere in app code — agreed at 15, which is the
count worth trusting; the second audit first reported 58 because it did not yet know labels
can be held in a variable. 13 keys were deleted, for measured reasons rather than assumed
ones: `dash.recommended` named a "Recommended Learning" block that is no longer on the
dashboard, `nav.competitions` duplicated the live `fw.comps.title`, and `common.position`'s only
call sites are screens that are still entirely English. 2 keys were wired instead:
`nav.mode` is now the accessible name of the mode-switch group (its three single-letter
buttons had no group at all) and `common.nation` went into the player detail fact list,
together with 7 new keys so that block reads in one script instead of mixing Chinese labels
with English ones. 727 keys per locale.

The point of doing it by hand was only ever to reach a gate that does not need a human.
Checks 16–18 now require each of the 24 dynamic `t()` sites to name, in the proof file,
the expression it interpolates and the code that supplies its values — 13 value spaces read
out of `ACHIEVEMENTS`, `CATEGORY_ORDER`, the `Mode` union, the comparison metrics array, the Football
World status and result-type lists, the landing pillars, the footprint row ids, the watchlist
sorts and the mentality slider's own `min`/`max` — and then require every dictionary key
to be claimed by a literal, a quoted label, or one of those expansions, with no exception list
at all. Adding a dynamic site the table was never told about fails, and so does renaming or
deleting one. Eight mutations each turned it red, including an orphan key present in all three
locales — which the parity check on its own waves through — and a value space whose source
array moved out from under its anchor.

Enumerating those spaces surfaced the class M145 found, at a larger scale, and it is M147's
work rather than this milestone's: `attributeLabel()` hands the comparison panel English
attribute names that render through `features/compare/ComparePage.tsx:133`, and
`modelPlayerProfile()` hands the player detail page English `note` and `sources` strings — so the fact
list M146 localised sits directly above text that is still English in every locale.
`Landing.tsx:63` also carries a `k2: "dev"` field nothing reads. Verified in a browser against a
fresh production build in all three locales: the fact list reads 位置分组 / 年龄 / 国籍 / 惯用脚 /
俱乐部 and their 繁體 equivalents while the dataset's own values (DM, Portugal, R, Paris
Saint-Germain) stay as data, the mode group is announced as 模式 / Mode, and an English
reader sees the pre-M146 wording unchanged, console clean in each. proof-i18n was at 58
checks and the suite 973.

M147 did the work that note pointed at, and did it by a rule rather than a list of
edits: a row handed to the interface carries a **key**, never a display label.
`domain/` keeps its English name tables — `ATTRIBUTE_DEFS[].label`,
`CATEGORY_LABEL`, `attributeLabel()`, `groupLabel()` — only where they compose prose
the domain owns: the coach and model prompts, which are English by design because
they are model input rather than UI text. Everything reaching a screen now resolves
through the dictionary: 32 new `attr.name.<attributeKey>` keys, 8 new
`group.<POSITION_GROUP_ID>` keys, and the 4-key `attr.<category>` family, which
turned out to be a duplicated namespace rather than a missing one — `compare.cat.*`
held the same four categories a second time, so it is gone from all three locales and
from every caller. 763 keys per locale: 727 + 32 + 8 - 4.

Purging the `label` fields was a way of making the compiler enumerate the readers,
since every place that rendered one becomes a type error. It also exposed the class
of reader type-checking cannot see: two labels that were written and then read by
nobody — `ModelledAttribute.label` at `domain/scouting.ts:223`, and all seven
`CompareMetric.label` writes in `domain/compare.ts`. A value built inside `.map()` is
inferred, so an extra property on it is not an error, and the stale English string
kept being manufactured for a UI that never asked for it.

Check 21 — the gate that keeps the name tables out of UI text — had been passing
without looking at anything. It matched the call shape `attributeLabel(`, while both
survivors pass the function *by reference* (`.map(attributeLabel)`, building the coach
prompt). Matching the identifier instead, over a pass that first strips `import`
statements so an import is not itself counted as a reference, made the gate see — and
it immediately turned up a third reader M146's audit had missed:
`features/profile/ProfilePage.tsx:192,198` rendering `attributeLabel(s.key)` straight
into the development-log rows, now a dictionary lookup on `attr.name.` + the row's
own key. The gate names the 2 remaining references and fails if that count moves in
either direction.

Two more gates came out of the same sweep. A key interpolated inside a template
literal was not being counted as a claim, so the reachability set (check 18) now reads
backticks as well as quotes — otherwise 40 new keys would have looked unreachable. And
check 24 requires that a key whose value contains `{placeholder}` is read by a call
that actually fills it: 21 filled, 0 bare. That is the other half of reachability,
because `t("x")` on `"{a} of {b}"` renders a brace pair and reads as odd copy rather
than a broken call. Making it honest took two rounds: a 200-character look-ahead
accepted an unrelated `.replace("{a}"` on the *next* line as the fill, and bounding
the search to one line broke the calls that chain across lines, so it walks the
`.replace()` chain instead — which then had to learn that `String(Object.keys(x).length)`
nests two levels deep, not one.

The dynamic-site table grew from the 24 sites M146 described to 45, and the
reachability scan now claims 655 static/quoted + 135 dynamic keys while the literal
scan confirms the UI really does pass 148 label props — anti-vacuity numbers, because
a gate that reports "none" for every family is also a gate that would pass with the
dictionaries deleted. `npx tsc --noEmit` exits 0, `npm run build` succeeds, the suite
is 25 scripts / 1001 checks (proof-i18n 58 -> 82), and 17 mutations each turn the gate
red: a domain row growing a `label: string;` field back, an English name-table string
drifting from its dictionary partner, `compare.cat.technical` re-added to one locale,
a `{t("compare.cat.technical")}` call site coming back, `label={attributeLabel(...)}`
on the Dashboard, the `.map(attributeLabel)` reference deleted from the declared
table, one ProfilePage dynamic-site row dropped, a single zh-TW `attr.name.*` key
removed, a `{f.label}` read restored, and a placeholder filled with the wrong name.

Not browser-verified: the in-app browser's page session is wedged — `navigate_page`
returns, every `evaluate_script` and console read times out — so this milestone makes
no runtime-rendering claim, only the static and mutation evidence above. Walking the
three locales on a fresh production preview is queued as its own follow-up rather than
recorded as done.


M148 localised the player detail screen — the largest single block of raw English still in
the app, and the page a visitor is most likely to land on from a search — and turned the
scan that measured it into a permanent gate. `features/football/Details.tsx` had 122
string literals reaching the interface with no `t()` in sight: every `SectionTitle` and
`Panel` title, the `StatTile` labels, the Football DNA notes, the scout-report column
heads, the career-arc fact tiles, the club analytics panel, the match-engine controls and
the whole Ask-Football-AI block. 109 new keys per locale take that file to 0, so the
dictionary is at 868 (763 + 109 − 4). The four deletions are two evidence titles that
duplicated each other (`rv.evidenceTitle`, `ld.evidenceTitle`) and two favourite labels
(`fw.comp.myLeague`, `fw.comp.setLeague`) that the `fav.*` family already carries. Rows
keep M147's rule: the comparison tables that built `{ label: "Possession" }` now carry
`labelKey`, 10 `ms.*` keys plus `common.overall`, `compare.m.potential`, `common.age`
and `det.valueM`. The club tiles' `"Defense"` — spelled that way on one screen and
`"Defence"` on another — now read `data.attack` / `data.defence` with a new
`det.midfield`, which is the first time those two spellings have agreed anywhere.

Three consequences were not cosmetic. `arc.trajectory` was one of the display strings the
domain returned rather than a code, so the `Trajectory` union member `"at peak"` became
`"peak"` to work as a key suffix — the union, its own proof and its four readers moved in
the same commit. `ClubDetail` ran its `useMemo` calls after the club-missing early
return, so adding `useI18n` would have turned a latent rule violation into a crash when
navigating from a valid club to an unknown id; both memos now run unconditionally. And the
keys that interpolate (`{n} finished matches`, `peak {overall} at {age}`, `vs a
{group} of matched skill`) had to be declared in the dynamic-site and value-space tables,
taking the declared dynamic `t()` sites from 45 to 49.

Check 22 in proof-i18n is that gate, backed by `scripts/lib/rawUiScan.mjs`. It reports a
literal that reaches the interface in one of three positions — a JSX text node, a display
prop or in-line expression, a row carrying a label — and it was wrong four separate times
before it was trustworthy: a generic `<` counted arrow functions and generics as tag
opens (until it is followed by a name, `/` or `>`); quotes inside JSX text are copy, not
JS boundaries; an interpolation hole carries no copy of its own; and a literal must be
answered for by its *tightest* enclosing region, so a nested element's attributes are not
the outer prop's prose. Exemptions are deliberately narrow — a literal shaped like a key
that closes a `t(` call at any argument position, a literal being compared against
(`side === "home"`), a placeholder pattern, a row-key position — and every one of them is
a way for a real leak to hide, so the check plants a fixture and counts both sides of it:
3 literals it must report, 5 lookups it must not. Its companion audit then reads every
literal the exemption waved through back against the dictionary — 732 of them, 0 unknown
— so a call site left naming a key the dictionaries no longer contain turns this red even
though parity holds, because all three locales lost that key together.

What the gate also measures is the debt it does not cover. `RAW_COVERED` names the 8 files
that must stay at 0 (compare page, football detail, review, settings, app shell, tactical
studio, transfer centre, chart primitives); everything else counts against a ceiling that
may only move down on purpose — 607 raw literals across 31 files, measured over every
`.tsx` in the repo, which is wider than the feature tree alone (600: `store/useFootballOS.tsx`
contributes 4 achievement and activity strings, `src/App.tsx` 3). The largest open files are
Manager OS (133), Player OS (103), Simulation Lab (51) and the Dashboard (44), and they are
listed here as outstanding rather than described as localised.

Two limits are part of the contract, not oversights. The scan reads literal-shaped text, so
a label built by a function and passed through a variable — M145's `templateEdge()` — stays
invisible to it, which is why M147's row-carries-a-key rule still governs `domain/`. And
the demo provider's answer prose in `data/ai.ts` is English in every locale; it reaches the
screen as `AiAnswer.text`, so no scan over source literals can find it, and localising or
restating those sentences is queued as its own milestone rather than counted here.

Not browser-verified either. `npx tsc --noEmit` exits 0, `npm run build` succeeds, the suite
is 25 scripts / 1012 checks (proof-i18n 82 -> 93), and 5 mutation probes each turn the
named check red and the runner non-zero: a raw `title="..."` in a covered file, a planted
label in an uncovered one, a covered file that disappears, a scanner that reports nothing,
and a lookup whose key no longer exists. Every file is restored from a byte copy and
re-verified by sha256 after each probe, and the in-app browser is still wedged, so the
three-locale walk remains an open follow-up rather than a claim.

M148's gate reads component source, which is precisely where it cannot reach: a row built in
`domain/` arrives at the interface as a plain string, and nothing in the file the scan reads
says where its words came from. Two producers were doing exactly that. A goal row stored a
display word of its own in `Goal.unit`, written by whichever control created it — "XP" and
"sessions" from onboarding, "rating" from the development and review pages, and the metric
code itself from Player OS, so a goal the visitor typed read `12/20 xp` on the profile in
every locale. Four writers, four behaviours, one field rendered verbatim. The field is gone:
`Goal.metric` is now the `GoalMetric` union, and `domain/goals.ts` answers a stored code with
a `goal.unit.…` key — or `null` for a code the app does not name, so a row imported from an
older build shows no unit word, which is honest, rather than the literal text
`goal.unit.foo`, which is not.

`domain/history.ts` was composing English. Its academy branch wrote "Academy · check quiz
passed", "Academy · check missed (3 attempts)" and "Academy · read only"; its film branch wrote
`${fileName} analysed` and a five-number sentence — 12 detections (4 scans) · 1.5 min · 8/min ·
72% provider confidence. The memory and plan branches handed the raw `kind` and `provider`
codes to the screen as `detail`. `RowText = { key, vars? } | { value }` is the gate now, and
not a style rule: a row's text is either a dictionary key this module chose or a value that
came straight out of the record it names, and `rowLine` is the only thing that turns one into
words. The composed sentences became 9 `hist.*` keys carrying the numbers as `vars`; the three
stored memory subtypes go through `MEMORY_DETAIL`, and an unrecognised kind yields no detail
instead of the code. Session, plan and memory titles keep `value`, because those words are the
user's own. 13 new keys per locale take the dictionary to 881.

HistoryPage's 11 raw hits turned out not to be English at all. `KINDS` and `KIND_META` held
dictionary keys in fields named `label`, and `label` is the name the scan reads as interface
copy — the file was passing the gate's own check while failing its count. Renaming them to
`labelKey`, the convention M148 set in the comparison tables, took it to 0 hits, so it joined
`RAW_COVERED` as the 9th file that must stay at 0 and the ceiling moved from 607 across 31
files to 596 across 30.

The gate had to be paid for. Proof-i18n checks 25 and 26 (93 → 98) read every row literal in a
module that exports the union: the key has to exist in all three locales, and the `vars` a row
supplies have to be exactly the placeholders that key interpolates. The first version of that
check was a lie — its pattern required a closing brace, so the one literal that spans several
lines (the film sentence, with all five of its numbers) went silently un-audited, and only a
mutation probe that deleted it and saw nothing go red found out. `scripts/proof-timeline.mjs`
is new at 50 checks, and its load-bearing one asserts that every string these rows show is a
subset of the strings the input records carry — which a module cannot satisfy by writing a
sentence.

15 mutation probes each turn one named check red and the runner non-zero, then restore the file
from a byte copy and re-verify it by sha256. Two of them check dictionary content TypeScript
cannot express: four metrics that count four different things must not read as one word, and a
locale that does not write Latin must not be showing the English table.

Not browser-verified. `npx tsc --noEmit` exits 0, `npm run build` succeeds and the suite is 26
scripts / 1067 checks. Two write-time strings survive and are queued rather than counted here:
onboarding's goal titles ("Earn 500 XP", "Complete 5 training sessions") and the coach's
remembered entries in `AiMemoryEntry.text` are English stored when written and rendered
wherever they land — the same defect, one layer above `Goal.unit`.

M150 closed the same defect one field up. `Goal.title` was a string built by whichever
control created the row, so onboarding stored the literal sentences "Earn 500 XP" and
"Complete 5 training sessions" and the development and review pages interpolated an
attribute word — in the writer's language — into a sentence and saved that. Switching to
Chinese after creating a goal left the goal list speaking the old language, which is
precisely what a row that stores words does.

The row now stores one of the two things `RowText` admits, and the union moved to its own
module (`domain/rowText.ts`) because both `history.ts` and `types.ts` need it and neither
should own the other's import. `domain/goals.ts` builds the machine rows: `countGoalTitle
("xp", 500)` yields `{ key: "goal.title.earnXp", vars: { n: 500 } }`, and
`attributeGoalTitle("passing")` yields `{ key: "goal.title.attrTarget", vars: { a:
"passing" } }` — the *code*, never the word. `goalLine` is the one interpreter: it looks up
any variable whose value is a known attribute code through `attr.name.…`, then fills the
sentence, so the attribute's word belongs to the reader as much as the title's does. A goal
the visitor types is their own text and stays `{ value: … }`; nothing in the app translates
it. Rows written before this change are repaired at the hydration boundary next to
`sweepOverdueSessions`: a stored string becomes a value, keeping the same words, never
guessed at as a key. Three new keys went in and two came out (`dv.goalTitle`,
`rv.trackTitle`) because the reachability gate punishes a key no caller names; the tracking
toast now passes its variables to `t()` instead of hand-rolling `.replace("{a}", …)`.

The audit floor paid for itself again. The first version kept the two counted titles in a
`Record` of bare key strings, which is not the shape the row-literal scan reads, so 10 of
the 12 rows were audited and the gate reported clean — the same silent hole M149 found in
itself, one shape over. The fix went into the source rather than the gate: the two titles
are spelled as row literals, and the floor is the measured count (4 files, 12 keys) so the
next row shape that escapes has to take the count down with it. The raw-UI debt moved 596 →
594, which is exactly the two onboarding sentences stopping being prose stored in a row.

proof-timeline went from 50 to 64 checks and now carries the goal rows: the resolution order
an attribute title needs, a stored row containing no display word from any of the three
dictionaries, one row reading differently to three readers, a typed title never reaching the
dictionary, and what the repair does to a legacy row and what it refuses to touch. Two of
them read source, because forgetting to call `repairGoalTitles` type-checks perfectly — the
hydration boundary must actually route stored rows through it. proof-i18n is 98 → 99. 12
mutation probes each turn a named check red and restore by sha256, including a title key
that no builder produces (unreachable), a row that stores the English word "Passing" instead
of its code, and a repair that turns a legacy string into a guessed key.

Not browser-verified; `npx tsc --noEmit` exits 0, `npm run build` succeeds and the suite is
26 scripts / 1082 checks. Rendering a goal title directly is now a compile error rather than
silently translated text — the row is an object, and React refuses it — so the two screens
that list goals read them through `goalLine`. Still queued and not fixed here:
`AiMemoryEntry.text`, which the coach provider persists as English prose and two screens
render.

M151 left the dictionary for the surface that uses it. Goals were add-only: the store
dispatched `GOAL_ADD` and `GOAL_TOGGLE` and nothing else, so a tracked goal stayed forever
and the only way to clear one was Settings → reset, which removes everything else with it.
The panel where you manage them — Player OS → Goals — was also still English: "Your goals",
"Add goal", "Title", "Metric", "Target", "No goals", "Goal added", and the three metric
options, so a reader who had just switched to Chinese was asked to manage goals in a
language they had not chosen. 13 keys per locale take that panel to 0 raw literals, and the
repo's debt ceiling moves 594 → 584 (Player OS 103 → 93).

Two defects came out of the add form on the way in. Its target field feeds `Number(target)`,
and an emptied number field is `Number("")`, which is 0 — and the completion rule is
`done: current >= target`, so the goal was finished the moment it was created. The same row
then divided by its own target for the progress bar. The two goal lists had already diverged
on that: the profile guarded `target > 0` and the Player OS panel did not, so one row could
read 0% on one screen and NaN on the other. Both rules are functions in `domain/goals.ts`
now — `isValidGoalTarget` refuses 0, -3, 2.5, NaN and Infinity, and `goalProgressPct` returns
a whole percent inside 0..100, 0 for any row whose target is not a count — and the panel
disables Add with a stated reason (`player.goalTargetHint`) instead of accepting a value it
cannot count toward.

Removal is a ✕ on each row, following the match-log control M83 added: named for a screen
reader (`player.goalRemoveAria`), revealed on hover or focus rather than crowding the row,
and confirmed by a toast in the reader's language.

The gates moved with it. proof-timeline is 64 → 71 and now holds the target and progress
rules, three source-read checks, and one rule that replaces a whole hunt: every `case` label
in the store's reducer must have a `dispatch({ type: … })` that can reach it (11 cases, none
dead). That is exactly the defect M78 found by hand — a `SCHEDULE` branch nothing dispatched —
which was a one-off cleanup until now; renaming a case so nothing sends it turns this red. The
other two say that removing a goal is not just a reducer branch but a control the panel
actually offers, and that the icon-only button does not go bare.

Not browser-verified — the in-app browser is still wedged. `npx tsc --noEmit` exits 0,
`npm run build` succeeds, the suite is 26 scripts / 1089 checks, and 7 mutation probes each
turn a named check red and restore the file by sha256: accept zero as a target, let a NaN
target reach the division, rename the case so nothing dispatches it, take the ✕ away, drop
the aria-label, put an English label back in the panel (that one trips two independent gates —
the ceiling and key reachability), and delete one locale's copy of a new key. Still open here:
a goal is deleted immediately with no undo, which is honest for a local demo but is the first
thing to revisit if goals grow a history.

M152 closed the last row the app wrote in one language and stored forever. The coach's
memory panel — "AI memory · What your coach remembers" — rendered `AiMemoryEntry.text`,
and three reducer branches composed that text as English sentences when the event happened:
`Created player profile · CM · goal: …`, `Coach focused on passing, ball_control (30′)`,
`Completed … · +54 XP · rated 4/5 · level 3`. The rows are persisted, so the wording belonged
to whoever was reading at the moment the event fired, and it travelled into the activity
timeline unchanged.

The rows are `RowText` now, built by three functions in `domain/memory.ts`, and the union's
interpreter moved fully into `domain/rowText.ts`: `goalLine` is gone, because a goal title and
a remembered line are the same problem and there is now exactly one function that turns either
into words. Code variables are resolved **by name, not by value** — `mode`, `group`, `a` and
`focus` are the only ones a lookup is allowed to touch — because a session really can be titled
"CM", and a person's own words must never be re-read as a key. `focus` holds a comma-joined list
of attribute codes and is resolved part by part, rejoined with " + ", so a stored row keeps the
codes and the reader gets the names. `MODES` moved into `domain/types.ts` beside the `Mode` union
it mirrors, and the gate requires the two to be one list, which is the only thing standing between
a stored mode and a screen that prints `prof.mode.`.

A library stored while these were sentences is repaired at the hydration boundary, like goal
titles: the English stays, verbatim, because it is what the app actually wrote — now honestly
labelled as the writer's own value rather than a key. `domain/history.ts` forwards the memory row
instead of re-wording it, so the timeline resolves the same stored object the panel does. The
panel's three labels went into the dictionary too, which took `store/useFootballOS.tsx` to 0 raw
literals — the file that mints persisted rows — and it joined `RAW_COVERED` as the tenth file that
must stay there. Repo debt 584 → 579 across 29 files; Player OS 93 → 90.

The row audit found its third blind spot in as many milestones: it read `vars: { a: x }` but not
`vars: { mode, group, goal }`, and the first fix — a regex over comma-split parts — silently skipped
every other property because it consumed the comma it needed to find the next. Both are replaced by a
segment walker that tracks strings and nesting, and it **refuses to answer** when a segment is not a
property it knows, rather than returning a shorter list that still prints "clean". A probe plants
`[k as string]: goal` to keep that refusal honest.

proof-timeline is 71 → 85 checks and proof-i18n 99 → 104 (901 keys × 3 locales). 11 mutation probes
each turn a named check red and restore by sha256: mode resolution removed, the focus list not split,
codes resolved by value instead of name, a memory key that does not exist, an unknown `vars` shape,
the bulk space claim clobbering a hand-declared one (which is a real bug this session hit — it
quietly dropped four live keys out of reach), the mode table drifting from the union, the repair
unwired, the panel printing the row, and the timeline stringifying it. Not browser-verified: the
in-app browser is still wedged. Still queued, and unchanged here: the demo provider's answer prose in
`data/ai.ts`, including the "Coach memory — last session focused on …" source line, is English text
generated per request rather than a stored row, so it needs its own milestone.

M153 was one of those cleanups that turned out to be a bug report. 25 calls across 21
lines in six screens interpolated by hand — `t("rv.window").replace("{n}", String(w))` —
even though `t()` has taken a variables object since it was written. The two are not the
same function: `t()` fills every occurrence of a placeholder, while `String.prototype
.replace` with a string needle fills the FIRST one only. No key in the dictionary repeats
a token today — measured, 0 of 901 — which is the only reason nothing on screen was
half-filled; the moment a copywriter writes "in {n} weeks, {n} weeks", the hand-rolled
path is wrong and the keyed path is right, and every new key would have to know which
one reads it. All 18 sites now pass variables to `t()`, the app source has no
`.replace("{` left in it, and `data/footballSeed.ts` keeps its two on purpose: it fills a
seeded headline template, not a dictionary string, and the new check says so.

Removing them is also what found the real defect. Proof-i18n check 24 is titled "every
placeholder key is read by a call that fills it" and had been reporting "21 filled, 0
bare" for five milestones. Its pattern matched only *var-less* `t("key")` calls, then
walked the `.replace` chain after them — so it had been watching the hand-rolled path
exclusively and had never once looked at `t(key, vars)`. With the chains gone its own
non-vacuity floor went red at zero, which is the third time in this arc that a floor
value earned its keep by refusing to be quietly satisfied.

It was rewritten rather than deleted. It now reads a call's argument list with a
string- and nesting-aware scanner (so a comma inside `"a, b"` never splits an argument),
checks the property names the caller supplies — shorthand included, from M152's walker —
against the placeholders the key interpolates, and asserts that everything it looked at
was readable. It sees 53 interpolated call sites where it saw 21, and reports 0 short and
0 unreadable. A call that drops its second argument now fails the gate instead of printing
`{n}` on the screen in all three locales.

proof-i18n is 104 → 105 checks. Four mutation probes, all restoring by sha256: forget the
variables on one call, supply a name the sentence does not use, put a `.replace` chain back
(that one trips both new rules at once), and hand the scanner a vars object shaped like
`{ ...extra }` to confirm it declares itself unable to read rather than reading less.
`tsc --noEmit` exits 0, the build succeeds, the suite is 26 scripts / 1109 checks, and 901
keys are unchanged — no key was added, renamed or reworded. Not browser-verified: the
in-app browser is still wedged, so these screens are read by the gate rather than clicked.

M154 is a defect in a number rather than a word. `primeYears` clamps a scale that runs
from about -7 to +20 onto 0..10, and three screens printed the result as a plain count —
the scouting list's "prime ~{n}y", the watchlist's "prime yr" column, the comparison's
"Prime years" row. Measured over the 318 seeded players, 127 of them (40%) sit at 0 and 78
(25%) at 10: 65% of the figures on screen were a bound, not a measurement, and the whole
player base shared just 10 distinct values. `compare.ts` then multiplied that same clamped
number by 1.5 inside the verdict, so a quarter of all players tied on the one term meant to
separate them by how long their value holds.

The model now keeps the two apart. `primeWindow(p)` returns `{ years, raw, capped }`;
`primeYears` is still the display bound; `primeYearsLabel` prints `"10+"` whenever the bound
is what a reader is actually being shown, and a value that lands exactly on 10 is not
labelled that way, because a measurement and a limit are different facts. `primeHold` —
floored at zero, uncapped — is what the verdict reads, and it distinguishes 17 values from
the 10 the bound allowed. The comparison row follows the model rather than the display
bound, which is why its label is now "Peak-value window"/"巅峰价值窗口": the number beside
it can exceed ten, and calling that "years" in a row headed "Prime years" would be a new
overclaim. The scouting chip reads "prime window 10+" for the same reason.

One measurement of mine was wrong and is worth recording: `valueIndex` first looked just as
degenerate as the prime column — four distinct values across 318 players — but that was my
probe rounding a continuous ratio to integers. Raw, it spans 0.20 to 2.86 with a 0.47
median, and nothing about it changed. A distribution only counts if it is measured at the
precision the model uses.

proof-compare went 43 → 53 checks: the bound's edges, the label's "+", the floor staying
non-negative for the model, one year of age and two points of headroom each moving the
window by one, and a census over the real dataset that fails if any capped player is ever
shown a bare "10", or if the verdict's input stops separating more players than the
display bound does. Two more read source — the verdict must not reach for the clamped
figure, and neither prime column may print it unlabeled. Five mutation probes each turn a
named check red and restore by sha256: clamp the term again, print the bound bare in a
column, drop the plus sign, treat a value sitting on 10 as past it, and cap the model input
like the display. tsc clean, build clean, 26 scripts / 1119 checks; labels were reworded
in all three locales, so the key count is unchanged at 901. Not browser-verified: the
in-app browser is still wedged.

M155 took the Dashboard — the screen every user lands on — from 44 raw literals to 1,
and 22 of those 44 were never English at all: the module launcher held its dictionary keys
in a field named `label`, which is the name the raw-UI scan reads as interface copy, so the
file was already calling `t()` correctly and still counted as untranslated. Renaming the
field to `labelKey`, M148's convention, moved them without touching a word. (This is the
second time that distinction mattered; HistoryPage had the same story at M149.)

The other 22 were real English, and the notable ones are the quick-log widget: "Logged — XP
awarded.", "View progress", "How did it feel?" and "Complete session" had never been keyed
at all, so a reader who set the app to Chinese was asked "How did it feel?" at the exact
moment they completed a session — the product's core action, in a language they had not
chosen. Alongside them went the hero subtitle, the section hints, the four empty states
("No matches in the next 48h window", "No session planned yet. Let the AI coach build one.",
"Finish onboarding to see your radar.", "No upcoming fixtures."), the inline links
("All matches →", "News →", "Scout →") and the figure templates ("{n} blocks",
"{n}% confidence", "Overall {n}", "ACWR {n}", "{n} XP", "{n}d", and the growth chart's
"start" tick). 23 keys per locale, 924 in the dictionary, and `CompleteQuick` gained the
`useI18n` it never had.

One hit remains and it is not copy: `matchesByStatus("LIVE")` asks the provider for live
fixtures. Pulling "LIVE" into a module constant did not help — the scan counts a top-level
`const X = "LIVE"` as reachable copy too, which is a defensible reading of a literal that
could be printed from anywhere — so the constant was reverted rather than widening the
scanner to make a number look better. The debt ceiling is therefore 536 across 29 files,
and Player OS's 90, Manager OS's 133 and the Simulation Lab's 51 are still outstanding.

Three mutation probes restore by sha256: put an English panel line back (both the ceiling
and key reachability go red, because the key it displaced stops being read), rename a
`labelKey` back to `label` (ceiling +1), and delete one locale's copy of a new key (parity).
tsc clean, build clean, 26 scripts / 1119 checks. Not browser-verified: the in-app browser
is still wedged, so the Chinese and English Dashboard were compared by reading what the
gate reads, not by looking at the page — which is exactly the follow-up task #142 still owes.

M156 went one layer below the labels. Onboarding's two option lists lived in the component
as arrays of English sentences, and one of them — `GOALS`, six of them — was written
straight into `profile.goal`, which the profile header, the Player OS header and the
coach's remembered line all read back later. A visitor who set up in English and switched
to Chinese afterwards kept seeing "Play smarter (scanning/decisions)" in a Chinese
interface: the same family as every row M149–M152 fixed, just stored on a profile field.

The lists moved to `domain/onboarding.ts` as codes — `GOAL_CODES` mirrored by the
`OnboardingGoalCode` union in `domain/types.ts`, the four English age bands by
`AgeGroupWord` — and the word for a code is composed in exactly one place, `codeWord` in
`domain/rowText.ts`, which already resolves attribute, position-group and mode codes the
same way. Resolution stays name-gated: a variable has to be called `goal` or `ageGroup`
for a lookup to happen, so words someone typed themselves are never re-read as a key. A
profile saved with the old sentence is mapped to its code at the hydration boundary, and
anything unrecognised is left exactly as written rather than guessed at.

The screen's other 21 rendered literals went to keys — 26 new per locale, including the
six goal words and four age words, reusing `common.level`, `cta.back` and `cta.enter`
rather than duplicating them — and the mode buttons now iterate the store's own `MODES`
table instead of restating its three codes. Onboarding joins the covered set as the 11th
file that must render no raw UI text, and repo debt moves 536 → 514 across 28 files.

Two things the gates taught on the way. A literal inside a JSX expression is counted as a
child of the element whatever it holds — the step rail's keys were flagged until the array
moved to module scope, which is also just better code. And one of my new source checks
used a regex with unescaped parens, so it matched nothing while looking exactly like a
regression in the thing it guarded; that check now reads `includes()`, which has no
escaping to get wrong. Six mutation probes cover the new ground: an English label back in a
covered screen, the code table losing a member the union still declares, one locale missing
a goal word, a legacy sentence mapped to the wrong code, the header printing the raw code,
and the hydration normalize unwired — each turns its named check red and restores by
sha256.

proof-i18n is 109 checks, proof-timeline 89, the suite 26 scripts / 1127 checks, and the
dictionary 950 keys × 3 locales; tsc and the build are clean. Not browser-verified: the
in-app browser is still wedged, so the three-locale walk on a fresh preview (task #142)
is still the biggest thing this line owes.

M157 opened Manager OS and found the reason it had 133 raw literals: the file had no
`useI18n` import at all. Career mode was not missing strings here and there — it had never
been wired to the translator, so every panel rendered whatever the component author typed.
This milestone keys six of its panels: the career header, the overview with its match
result, the season summary, the squad table, the transfer market and the tactics panel.
55 keys per locale, hits in the file 133 → 70, repo debt 514 → 451, dictionary 950 → 1005.

Reusing what already existed mattered more than usual: Attack / Midfield / Defence came
from the data-room and club-detail keys rather than getting manager-mode copies, which
also closes the "Defense" vs "Defence" spelling split M148 started, and Reset, Age,
Position and Mentality came from `common.*`, `onb.*` and `tac.*`.

The interesting bug was not a string. TacticsPanel named its local tactics object `t` —
the same name every screen in this app uses for the translator — so adding the hook
produced "Cannot redeclare block-scoped variable 't'" and the three sliders read
`t.mentality` off the translator. Fixed by renaming the local to `tactics` rather than
aliasing the hook: a prop that shadows the translator is a trap for whoever edits next,
and types found it only because the hook was added at all.

Repairing my own earlier work came with the territory: an M156 edit had spliced a comment
onto the same line as a check's `ok(` call (the check still ran, but its argument lost its
line) and M156's ceiling note never landed at all. Both are fixed here, and the ceiling is
set to the measured 451 rather than a rounder number.

Four mutation probes restore by sha256: an English panel label put back, one locale
missing a manager key, a call that names its variable differently from the sentence it
fills (the placeholder scan now sees 65 filled calls where it saw 53), and a manager label
nothing reads any more. tsc clean, build clean, 26 scripts / 1127 checks.

Not done, deliberately: Manager OS still has 70 hits in its league table, season outlook,
match-prep panel, club picker and the small Metric/Fact/Slider primitives, so it cannot
join the covered set yet — that is M158. Nothing here was looked at in a browser; the
in-app browser is still wedged and task #142's three-locale walk remains owed.

M158 finished Manager OS — 133 raw literals to none — and it was the last screen that had
never been connected to translation at all: the file had no `useI18n` import, so the seven
panels each take the hook now. Landed in three commits (steps 1 and 2 earlier; step 3 here),
each verified with tsc before it was committed. The screen joins the covered set as the 12th
file that must render no raw UI text, and repo debt is 381 across 27 files, with the
dictionary at 1076 keys.

Reuse over duplication again did most of the work: the tab strip's seven names were already
keys sitting in a field called `label`, which is the name the scan reads as interface copy,
so that was a rename rather than a translation; and the market's position filters stopped
restating `PosBucket` as an inline literal union, sharing one `{code, labelKey}` table whose
first entry the state default reads. Attack / Midfield / Defence, Reset, Age, Position,
Mentality and Manager OS itself all resolved to keys that already existed elsewhere.

Two domain rows came with it. The season outlook's zone and honour labels were English
prose built in `domain/career.ts` and merely displayed — the fifth instance of the class
M149–M152 kept finding — so both are keyed rows now, read through `rowLine`, and
`Metric`'s `value` prop says what callers actually pass (`string | undefined`) instead of
forcing a cast or a fake placeholder.

That exposed a hole worth its own gate: `rowLine` was only ever checked on the way out of
the domain. A screen could take a keyed row and print it — `{String(o.zone.label)}` renders
"[object Object]", type-checks because ReactNode accepts objects, builds, and every gate
stayed green. Check 28 now requires each read of a known keyed-row property to sit inside a
`rowLine(` call. Four probes: the printing-instead-of-resolving swap (caught by 28, the
bug it was written for), an English heading back inside the newly covered screen (caught),
a manager key nothing reads (caught by reachability), and a domain honour row reverted to
prose — that one was caught by key reachability and would also fail the type check, but not
by the row-literal audit, whose pattern recognises `{key: …}` and `{value: …}` and not a
`{label: "prose"}` field; the expectation was mine to fix, not the gate's.

Still open, as measured at M162 (the ceiling's own reading, not an estimate): 307
literal copies across 25 screens — Player OS 90, Simulation Lab 51, Film Room 30, Data
Room 29, Landing 18, Scouting Panel 15, Dynamic World 10, Command Palette 9, Football
World 8, Profile 7, and 15 more below the cut. Learn Hub, Community Hub and `src/App.tsx`
are no longer in that list because they now resolve every string they show through the
dictionary, and are held there by the covered set. Nothing here was clicked in a browser:
the in-app browser remains wedged, so task #142's three-locale walk is still owed.

M161 took Community Hub from 42 raw literals to none. The board is the one screen where
most words are *not* the app's — a thread's title, body and author are the user's or the
dataset's own text, so the work was marking that boundary rather than translating it: only
the board's own copy is keyed, and `comm.you` exists because `MY = "You"` is written into
stored records and must keep matching them while displaying in the reader's language. The
six tags are the same shape — `comm.tag.*` translates their display while the raw string
stays the filter and the stored value. `timeAgo` was the reason this screen resisted
keying: a helper returning a composed string is invisible to a scan that reads component
source, so it now returns `RowText` and the three call sites resolve it through `rowLine`.
That also finished the repair M159 opened — `visible.map((t) => …)` bound a Thread to the
name the translator already had, which is why the list's copy could not be keyed; every
callback is `th` now. Two new dynamic sites (`comm.tag.`, `comm.sort.`) are declared in the
proof against the arrays that actually produce their values, so a new tag fails the suite
until it has a key. 112/112 checks pass over 1180 keys × 3 locales.

M159 chased the copy that reaches a user through a *call argument*, which is where both of
this project's translation audits had a blind spot. `aria-label` was not a display prop the
raw-UI scanner recognised, so a screen-reader user heard "Delete clip" or "Select Luka
Mendy" in an otherwise Chinese interface and nothing on screen ever revealed it. Neither
did the scanner look at `toast(…)`: Manager OS reported zero raw literals when M158 closed,
while seven of its toasts still said "Career started", "Squad rested" and
"Drew 2–1 vs Arsenal" in English.

Both positions are now scanned, and the ten Manager OS and accessibility strings are keyed.
The honest bookkeeping: measured debt goes 381 → 394, but the code did not get worse —
13 items that had always been there became visible, and 13 of the newly counted ones were
then fixed in this same commit, so 394 is what a scan with two more eyes finds on the same
tree. The non-vacuity floor is also changed from a tracked measurement (381) to a low bound
(300), because pinning it to the measurement meant every future improvement turned it red
and demanded an edit: it exists to catch a scan that stopped reading, not to track debt.

Five items stay counted on purpose: two Community Hub toasts and three Learn Hub ones.
Community Hub's enclosing scope binds `t` to a Thread and Learn Hub has no translator
import at all, so keying them is a screen-localisation change, not a string swap, and
pretending otherwise would have meant either an alias sprawl or a silent skip. Two more
screens (Player OS's delete-match label and Ai Studio's graph fallback) hit the same wall
and were reverted rather than half-wired.

Three probes, one of which needed correcting: a toast put back and an aria-label put back
are both caught, but by key reachability rather than the ceiling, since reverting a keyed
call also orphans the key — the mutation is caught, and the check that catches it is not
the one the probe named. The undefined-key probe lands on the check written for it.

proof-i18n is 110 checks, the suite 26 scripts / 1128, dictionary 1086 keys × 3 locales.
Not browser-verified: the in-app browser is still wedged (#142), and this milestone is the
strongest argument yet for that walk, because aria-labels are the one class of copy that is
invisible on screen by design.

M160 localised Knowledge Academy — the last screen of its size that had never been
connected to the translator at all: `features/learn/LearnHub.tsx` carried 40 raw
literals and no `useI18n` import, so a reader who had set the app to Chinese was asked
"Check your understanding" and told "Not quite — the answer is C." in English. 38 keys
per locale take the file to 0 (1086 → 1124 keys), it joins the covered set as the 13th
file that must render no raw UI text, and repo debt moves 394 → 354 across 27 files.
The largest remaining files are unchanged: Player OS (90), Simulation Lab (51),
Community Hub (44), Film Room (30), Data Room (29), Landing (18).

Six of the 40 were not reachable by the rewrite the other 34 went through, because
their copy runs into an interpolation: `Sources: {list}`, `{n} min` in three places,
`Try it: {label} →`, the `· {n} quiz attempt{s} recorded` line, and the template
`Not quite — the answer is ${…}.` Each is a declared patch rather than a pattern
guessing at prose, and two of them became keyed sentences that carry variables: the
attempt line is `learn.attemptOne` / `learn.attemptMany` filled from `{n}` (so the
English plural is a real agreement instead of a conditional `"" : "s"`), and
`learn.notQuite` takes `{a}` — which puts it under check 24 like any other
interpolated key, because a bare call prints `{a}` on screen in all three locales.

The interesting find was two strings the scan could not see. M159 taught it to read
copy handed to `toast(…)` and `aria-label`, but that rule matched a literal sitting
directly after the open paren — so Learn Hub's three plain toasts were counted while
the fourth, `toast(correct ? "…" : "…")` on the completed-lesson button, was not: the
argument is conditional and no position the scanner reads looked inside it. The rule
now reads the call's whole argument list, quote- and nesting-aware, through the same
exemptions a `t()` argument and a compared value already had, and the fixture that
guards the scanner plants both shapes — 5 literals reported, 2 of them `call` kind,
with a keyed `toast(t(…))` in the same fixture that must stay unreported. The effect
on this repo's own debt was nil: that Learn Hub toast was the only conditional
call-copy in the source, so 354 is the same tree read with one more eye on it.

Two of the tools I wrote for this were wrong before they were trustworthy, and both
failures were caught by gates rather than by reading the output. The bulk rewrite put
the translator hook inside `LessonDetail`'s *type annotation* — a parameter list
carrying `{ lesson: Lesson; … }` also ends in `{`, so the first brace it found was not
the body's — which `tsc` refused immediately. And its dictionary writer landed every
zh-TW key inside the zh-CN block, because the Simplified and Traditional `common.back`
anchors are the same line and a single `findIndex` always answers with the first: 38
duplicate keys and an empty locale, which `tsc` and the parity check both refused.
The writer now takes both anchor positions from the file before it inserts, fills the
blocks bottom-up so no index moves under it, and asserts every key it touched appears
exactly three times.

`npx tsc --noEmit` exits 0, `npm run build` succeeds, the suite is 26 scripts / 1128
checks (proof-i18n 110), and 7 mutation probes each turn one named check red and
restore the file from a byte copy verified by sha256: an English display prop back in
the covered screen, a conditional toast in an open file (the ceiling — which is the new
call position doing the work), a key deleted from all three locales while its call site
still names it, an interpolated key read without its variables, the call rule itself
disabled (the fixture goes quiet), and a raw toast argument and a raw JSX text node
each put back in the covered screen. Not browser-verified: the in-app browser is still
wedged (#142), and this screen is a strong candidate for that walk, because the whole
point of a lesson is somebody reading it in their own language.

M162 is mostly an accounting fix, and the kind worth writing down because it was
invisible while it was wrong. The raw-UI ceiling had gone stale: M161 emptied Community
Hub's 44 literals but left the ceiling at 354, so for a whole milestone the gate that
exists to notice debt *growing* was reading a tree that no longer existed, and would
have waved through 47 new English strings before it said anything. The number is now
307, reconciled by subtraction where both terms are measured rather than recalled —
354 minus the 44 hits the Community Hub file had at the previous commit (0 at HEAD),
minus the 3 in `src/App.tsx`'s not-found fallback, which this pass keyed and registered
in the covered set (now 14 files). That fallback is the copy a visitor sees when they
follow a route that is not built yet, and until now it was English in all three locales.

The second half of the pass removed a trap I had set myself. The scan's non-vacuity
clause read `openTotal >= 300` — a floor on exactly the quantity every milestone is
trying to shrink. Three more localised screens and it would have gone red while the
scanner was working perfectly, which is the same mistake as pinning a floor to a
measurement: it converts success into a failure and teaches whoever hits it to raise
the floor rather than read it. What the check actually needs to notice is a scan that
stopped reading, so it now asks three things that survive the repo emptying: the walk
still finds its files (96 `.tsx`), enough of them still carry copy that it reports
copy (25), and it still tells *positions* apart in real source rather than only in the
fixture it was tuned against (11 distinct syntactic positions, floor 6).

That last clause is the one carrying weight, and a probe is what says so. With the
scanner patched to report nothing at all, the ceiling check stays green and prints
"0 across 0 files" — a broken measurement is precisely the case an upper bound cannot
see — while the non-vacuity check goes red. A second probe puts raw English back into
the newly covered `src/App.tsx` and turns only the leak check red, not the ceiling
(covered files are not counted as debt, which is the difference between the two gates);
a third adds one literal to an open screen and turns the ceiling red at 308/307. All
three restore their file byte-for-byte and re-verify the sha256.

`npx tsc --noEmit` exits 0, `npm run build` succeeds, the suite is 26 scripts / 1130
checks (proof-i18n 112), and the 3 probes above each turn a named check red. This commit
was not browser-verified when it landed; M163's walk below covers the route it changed.

M163 is the first leg of task #142 — the walk every localisation milestone since M147 has
had to leave open, because the in-app browser has been reporting a 0×0 hidden window. It
turns out the window being invisible does not stop it rendering: React mounts, and
`document.body.innerText` is readable. Screenshots are still impossible, so this is a
*text* walk, not a visual QA pass, and the claim below is written to that limit. With the
preview server up on a fresh port, all 25 routes were visited in `zh-CN` and again in
`zh-TW`, and each screen's rendered text was scanned for the two defects a static scan
structurally cannot see: a dictionary key that reaches the page undecoded, and a
`{placeholder}` whose variable the caller never supplied.

Result: on neither locale did any route render a raw key or an unfilled placeholder. The
only dotted strings the walk found are on `/settings`, and they belong there — that screen
is the local-data inventory and prints the storage keys (`football-os.state.v2`, …) on
purpose, so they are on the detector's exclusion list rather than quietly whitelisted.
The `zh-TW` pass also re-checks M143's fix from the reader's side: across the accumulated
text, the twelve Traditional markers this repo's dictionary uses (`模擬`, `訓練`, `資料`,
`設置`, `開發`, `模組`, `級別`, `統計`, `繼續`, `球員`, `轉會`, `戰術`) appeared 71 times and
their twelve Simplified counterparts appeared zero times — no Simplified bleeds into a
Traditional reader. And the M162 fallback was caught doing its job: an unknown route
rendered `该模块是下一个开发对象`, which is the first time that string has been *seen*
resolving rather than only asserted by a gate.

Two honest limits on this, both of which cost turns to discover. Timers in the hidden
window are throttled hard — an 8-route walk at 380 ms per stop blew the 15 s ceiling on a
single `evaluate_script` call — so every sweep above had to fit in 6 routes, and the full
25-route coverage was assembled from four calls plus a locale reload. The per-route text
lengths and opening lines did differ (`/scouting` 4059 characters, `/film` 303, `/players`
16214, `/onboarding` 106), which is what makes the "no raw key rendered" result a
measurement rather than four reads of the same stale DOM — but it is not the same evidence
as a screenshot, and it cannot prove anything about a state the walk never reached. And the
walk began by suggesting a bug that is not one: the shell's command bar text appeared in
`innerText` on every route, which reads like a dialog left mounted for a screen reader —
querying `[role=dialog], dialog, [aria-modal]` returned zero elements, so it is an ordinary
visible top bar whose English copy is already counted as Command Palette debt.

Registration is the second half of this milestone, and it came out of doing the walk rather
than out of what the walk found: `features/community/CommunityHub.tsx` was zeroed at M161 but
never entered `RAW_COVERED`, so the gate went on treating a fully localised screen as an
unlocalised one. The covered set is 15 files now and the ceiling is unchanged at 307 — a file
with no hits contributes nothing to debt either way, which is exactly why the omission was
invisible. Two probes separate the two gates. Registered, an English literal planted in the
hub reddens the per-file leak check and names the file, while the ceiling holds at 307.
With the registration line deleted, the identical literal leaves the leak check green and
reddens only the aggregate: `308 across 26 files`. A screen can therefore gain English copy
and be reported, per screen, only if someone remembered to register it — which is the
property M161 asserted and this commit actually holds. Both probes restore their file
byte-for-byte.

What #142 still owes: the same walk with screenshots, once a viewport exists, plus a pass
over screens that need completed onboarding or a saved career to render their *populated*
state (today's walk covered fresh-state empty states and the dataset-backed world screens,
which is why several routes returned a few hundred characters). `en` was not walked, and the
reason is worth keeping: a key that never resolved would still be caught there, but a string
that simply *is* English cannot be told apart from a string that was correctly translated
into English, so the `en` pass could only ever repeat half of what the other two measured.

`npx tsc --noEmit` exits 0, `npm run build` succeeds and the suite is 26 scripts / 1130
checks (proof-i18n 112 — the covered set gained a 15th file, which is not a new check), and
the two probes above each turn a named check red. No app source changed in this commit, so
the walk and the gate describe the same tree: the strings the browser rendered came from the
same build the proofs scanned.

M164 took the landing page from 18 raw literals to none: ten new keys per locale
(1183 → 1193), the covered set at 16 files, and the ceiling re-measured in the same commit
rather than carried over — 307 → 289, which is what the gate reads now.

Six of those 18 were never copy. They were the pillar *ids* — `"coach"`, `"world"`, … —
reported because the array holding them sat inside a `{…}` hole in JSX, which the scanner
reads as children, and `hasProse()` is satisfied by any run of three letters. Keying the
descriptions did not touch them, and neither should it have: an id list is data, not
interface text, so the fix was to move the list to module scope and let each id drive both
`landing.pillars.<id>` and `landing.pillarDesc.<id>`, with the range of `<id>` enumerated
by the gate out of the array itself. The same array carried a `k2: "dev"` field with no
reader anywhere in the repository; it is gone rather than renamed.

That move opens a hole worth naming, because a milestone that quietly widens what the scan
can see is worse than one that leaves English on screen. A hoisted array is no longer
visible to the copy scan at all, so a sentence smuggled into it would be reported by
nothing on that side of the gate. Three probes say who catches it instead. Planting prose
back into the JSX reddens the per-file leak check and names `Landing.tsx`, with the ceiling
unmoved. Appending `"A brand new pillar"` to the array leaves both of those checks green
and reddens the value-space check — `landing.pillars.… · landing pillar ids: all 7 values
keyed in every locale` — so the array is guarded by key reachability, not by being legible
as prose. Deleting the `landing.pillarDesc.` site declaration would make that second
result a silent pass, which is why the declaration and the array are read against each
other rather than written down twice. All three restore their file byte-for-byte.

Unusually for this line of work, M164 was then looked at in a browser — the first time the
walk M163 unblocked has been used on a milestone's own change. Against a fresh production
build on its own preview port, the landing route was read in `zh-CN` and then `zh-TW`: 618
characters of rendered text in each locale, zero raw keys, zero unfilled placeholders. The
new strings are visible doing their jobs — `318 名球员 · 39 家俱乐部 · 252 场比赛 · 演示世界`
in Simplified, the same line as `318 名球員 · 39 家俱樂部 · 252 場比賽 · 示範世界` in
Traditional, and eleven Traditional markers with no Simplified counterpart anywhere in the
screen's text. The English descriptions are absent from the page in both. What this still
does not establish: the viewport is 0×0, so nothing here was *seen* — the claim is about
text that reached the DOM, on a page a visitor reaches without onboarding.

`npx tsc --noEmit` exits 0, `npm run build` succeeds, and the suite is 26 scripts / 1131
checks — one more than M163's 1130, because a second dynamic site had to be declared for
the pillar descriptions to have a guard of their own.

M165 took the Scouting board from 15 raw items to none and registered the file, so the
covered set is 17. Only three of the fifteen needed a translation. Ten were dictionary keys
*already* resolved through `t()` — the four sort names in `SORTS` and the six metric names
in the comparison rows — counted as interface copy for one reason: the field holding them
is named `label`, which is one of the positions `rawUiScan` reads as a display slot, and it
does not care that the value is a key. Renaming the field to `labelKey` is the entire fix
for those ten. The lesson is the same one HistoryPage taught at M149 and the Dashboard at
M155, now applied a fourth time: read the hits before estimating the work, because a debt
count is not a count of English.

The other five were `OVR`, `POT` and `OVR/€M`, which check 12 had *formally excused* as
stat codes. The excuse was wrong, and the proof is in the same file: `compare.m.overall`
is 综合/綜合, `scout.noMatchHint` says 综合分, and `scout.rowVindex` reads "OVR per €M"
directly under a header that says "OVR/€M" — the board gave one metric two names, and
translated neither. A code the dictionary already has a word for is copy, so the three
codes are keys now (1193 → 1196) and the carve-out shrank to `"vs"`.

That leaves check 12 doing a different job than it was doing, and the check says so.
`hasProse()` needs three letters, so `OVR` was only ever visible to it by an accident of
length — the covered-file scan sees it either way — while a two-letter node is invisible to
that scan no matter what else is true. Check 12 is therefore now the *short-text* gate, and
its non-vacuity floor moved off the survivors and onto the pre-filter node count (measured:
14 nodes, 3 carrying letters, 1 kept), which is what keeps it meaningful if `"vs"` is keyed
too. The other new clause is inside check 10: reverting the rename would have been caught
by the covered-file check anyway, but it reports `(1: compare.m.overall)` — a key, not
prose — so it names the file without naming the mistake. The new clause says "holds no key
in a field named `label`", and it has to be asserted per array because a third list added
later with the old field name satisfies every read above it.

Three probes, each restored byte-for-byte. A header back to raw `OVR` reddens two checks —
the short-text one and the per-file leak, which names `features/scouting/ScoutingPanel.tsx
(1: OVR)`. Renaming the comparison rows' field *and* its render site back to `label` — a
mutation that stays valid TypeScript, so the red has to come from the gate — reddens three,
including the new clause. Deleting `scout.pot` from the Traditional block leaves exactly one
failure, `zh-TW: no keys missing (1)`.

The board was then read in a browser against the rebuilt preview, in `zh-CN` and `zh-TW`:
4081 and 4080 characters, with the table headers rendering as 位置 球员 年龄 综合分 潜力
身价 综合分/€M 对比模板 关注 对比 and 位置 球員 年齡 綜合分 潛力 身價 綜合分/€M 對比模板
關注 對比. `OVR`/`POT` appear nowhere in either screen's text and no raw key does; the
inline stat carries the new word too (`Feyenoord · 綜合分 71 · €35M`). One caution about
the measurement rather than the code: my first pass at this flagged 合成 as leaked
Simplified characters — 合 and 成 are simply the same glyph in both locales, and the gate's
own 16-character list from M143, which excludes them, stayed green. What this still does
not establish: the viewport is 0×0, the compare panel needs two checked rows and the
shortlist needs a starred player, so both of those blocks rendered their empty states and
their new labels went unexercised at runtime — and the command palette overlay is still
English under both locales, which is CommandPalette's own 9 open debt items, not something
this commit touched.

`npx tsc --noEmit` exits 0, `npm run build` succeeds, and the suite is 26 scripts / 1133
checks (proof-i18n 115 — the two new clauses, one per array). The open debt is 274 across
23 files, re-measured rather than subtracted, and the two largest items are unchanged:
PlayerOS at 90 and SimulationLab at 51.

M166 localised the command palette, and the interesting part is how the file looked clean
while it was doing it. `Ctrl+K` opens an overlay whose section names — Go to, Your modes,
Actions, Football World — reached a 简体中文 visitor in English, because `heading` is not
one of the prop names `rawUiScan` reads as a display slot. cmdk renders it into
`cmdk-group-heading`, so it is copy on the screen and invisible to the gate; the file's own
count said 9 while the overlay showed 13 English strings. The prop was added the same way
M159 added `aria-label` and the toast arguments: widen the measurement first, then let the
number move. Worth stating plainly, because it is the honest version — the widening found
**no** debt anywhere else in the tree. `CommandPalette.tsx` is the only file in the repo
that passes a `heading` prop at all (verified by grep, not by recall), so 265 is not 274
minus the palette's sins elsewhere; it is the same tree read with one more eye on it, minus
one overlay that now says 前往.

Twelve keys went in (1196 → 1208). One of them is a caution about what localising a string
can do to the locale you localise *from*: my first `cmd.theme` was "Switch to {theme}",
which rendered "Switch to Light" — the word 主题 is in the Chinese value, so the English
value quietly lost a noun the sentence it replaced had always carried. It is now "Switch to
the {theme} theme". A dictionary row is copy in three languages, and the source locale can
be written badly inside it.

Check 10b is new, and it exists for a hole the existing gates could not see. A row's `group`
is a code that the render site interpolates into `cmd.group.${group}`, so a row whose group
string drifted out of `GROUPS` would print the key itself to the visitor — while three
gates stayed green, because the scan does not read a `group:` field as a display slot,
check 17 derives its value space from `GROUPS` rather than from the rows, and check 16 walks
template sites, of which this file has exactly one. TypeScript would reject it, but the gate
runs on the repo's real strings, so now it reads the rows too: every `group:` value must be
one of the declared codes, the codes must be lowercase tokens rather than sentences, and
every key the file spells out by name must exist in all three locales. The two dynamic sites
are declared in `DYN_SITES`; `cmd.group.` gets its own space read out of the palette's group
list, and `prof.mode.${m}` needed no new declaration at all — `claimByPrefix("prof.mode.")`
picks it up on the day it appears, which is the only reason that mechanism exists.

The browser could not verify this one. The in-app window's tree no longer commits at all:
`#root` reports 0 children on every route even after the lazy chunks load, and the same
call sequence that read 4000-character screens at M165 now returns an empty body with no
console error. So the copy was verified through the app's *own* translator instead — the
palette's composition replayed in Node over `react-dom/server` with `I18nProvider`, 16
strings per locale, three locales: no value equals its own key, no `{var}` survives
interpolation, every zh row carries Han characters, and `zh-TW` differs from `zh-CN` in
every row outside the decided set (前往 / 你的模式 / 操作 / 足球世界 are the same glyphs in
both scripts; 外观/外觀 and 指挥中心/指揮中心 are not). What that proves is the copy; what
it does not prove is the pixels, and this milestone has none.

Three probes, each caught by exactly one named check and restored byte-for-byte. Reverting
`heading={t("nav.football")}` to `heading="Football World"` reddens the per-file leak clause,
which now names `features/command/CommandPalette.tsx` — that is the whole point of the
widening, and it is the probe that would have been invisible before it. Adding a fourth code
to `GROUPS` without a key reddens check 17 (`all 4 values keyed`). Setting one row's group to
`"Go to"` reddens check 10b and only 10b. One behaviour change is worth naming rather than
skating past: the palette filters rows on their translated `label`, so the rows that used to
be English literals (theme, ask, mode switch) now match the reader's language instead —
under `zh-CN`, "fan" no longer finds 切换到球迷模式, and 球迷 does. The nav rows filtered on
translated labels before this commit too, so this is the intended consequence of localising
a row, not a defect introduced here. `{r.type}` in the search results stays raw: it is a
data code (player/club/match), not interface copy.

Suite is now 26 scripts / 1139 checks (proof-i18n 121), covered set 18 files, open debt 265
across 22 files with the ceiling pinned at exactly that measurement. `npx tsc --noEmit` exits
0 and the production build succeeds. The two largest remaining items are unchanged: PlayerOS
at 90 and SimulationLab at 51.

### M167 — pin the other direction of the variable contract (gate-only)

M166 changed interface copy and *I* wrote a bad English value ("Switch to {theme}" instead of
"Switch to the {theme} theme"), and no gate noticed — I found it by reading my own verification
output. That class of bug is the caller's side of the contract: `t()` fills `{var}` by regex and
silently ignores a name the value never mentions, so a call can hand over a variable that no
locale reads, and the UI just fails to say the thing the author thought it said. Check 24 already
pinned the direction that produces a visible artefact (every placeholder in a value must be
supplied by some call — an unfilled `{path}` on screen); nothing pinned the direction that
produces a silent one.

This milestone writes no app code. Two clauses in `scripts/proof-i18n.mjs`:

- **`no literal-key call throws a variable away`** — for the same literal-key call sites check 24
  walks, the supplied names must be a subset of the placeholders the value interpolates. Measured
  over **83 var-carrying sites, 0 dropped**.
- **`a template site that passes variables supplies only what its space interpolates`** — the same
  two directions at the dynamic sites, using the `SPACES` table that already enumerates every key
  a `\`prof.mode.${m}\``-style call can resolve to: each reachable key's placeholders must be
  supplied, and no supplied name may fall outside their union.

Being straight about the second one: it reads **69 dynamic sites and exactly 0 of them pass a
variable today**, so it currently catches nothing in the repo. It is not decoration — the three
locale blocks and the prefix tables it leans on are maintained by other checks, and the clause is
proven live by probe rather than by usage. If a template key ever grows a placeholder, this is the
check that requires the call to fill it.

The measurement step earned its keep again. I planned a third gate for reading vars objects and
had already written `scripts/lib/objectVars.mjs` when I opened check 24 and found `varNames()` —
a reader that already handles ES6 shorthand (`{ path }`), nested braces, strings, and *refuses to
guess* by returning null. The helper was deleted. It also cost me a false finding: my own throwaway
scanner reported "3 mismatches", all three of them bugs in my scanner (shorthand at two sites, and
a ternary `? p : b` read as if it were a key). **Read the existing gate before writing one, and
treat a fresh measurement as a claim until it agrees with the code on disk.**

Three probes, each caught by a named check and restored byte-for-byte. Supplying `{ season: 2026 }`
at `t("cmd.from", { path })` reddens only the new literal clause; `t(\`prof.mode.${m}\`, { colour:
"red" })` reddens only the new template clause; adding `{window}` to `cmd.from` reddens the
locale-drift check *and* check 24 (2 reds, and correctly so — that mutation breaks both facts).
One probe anchor was wrong first time: I targeted `label: t(\`prof.mode.${m}\`)` and it matched 0
times, because the template is nested inside `t("cmd.mode", { mode: … })`. The probe script treats
a non-unique anchor as a hard failure, so that came out as `SKIP` plus a non-zero exit instead of a
pass — which is the only reason the mistake was visible.

Suite is now 26 scripts / 1141 checks (proof-i18n 123); covered set 18 files and open debt 265
across 22 files are unchanged, because nothing outside the gate was touched. `npx tsc --noEmit`
exits 0 and the production build succeeds. The browser is still in the state M166 reported, and
this milestone renders no string, so nothing here needed pixels.

### M168 — Localise the season-simulation screen, including its units

`features/world/DynamicWorld.tsx` had 10 raw items, and the two that justified the milestone were
not labels: a bare `{c.points} pts` and an `{r.age}y · OVR {r.to}` fragment. A unit written outside
the dictionary is the hardest kind of untranslated copy to notice, because in isolation it does not
look like a sentence anyone meant to translate — a 简体中文 visitor reads "38 pts" and "31y · OVR 74"
in a column that otherwise says 分和岁. Both are now one key with the number in a variable
(`world.pts`, `world.ageOvr`), so the unit is a decision recorded three times instead of a typing
habit. The rest were two `StatTile` subs, three `SectionTitle` hints and three empty-state lines.

10 keys × 3 locales took the dictionary from 1208 to 1218. `DynamicWorld.tsx` joined `RAW_COVERED`
(19 files) and the open-debt ceiling moved 265 → **255**, measured on the gate line rather than
subtracted: 21 files still carry debt, led by PlayerOS 90 and SimulationLab 51. No gate can catch a
bad translation, and one of mine was caught only by reading the rows back: `players tracked` first
went in as 名在册球员, which opens with a measure word and reads as a fragment of a longer count.
It is now 在册球员 / 在册球員. Same failure mode as M166's "Switch to {theme}", same remedy.

Three probes. Putting `sub="players tracked"` back reddens the per-file clause and names the file
(2 reds — the orphaned key also fails reachability, which is the gate noticing on its own that the
call disappeared). Typing `t("world.ptss")` at the points site reddens 3 checks, including the
undefined-key-site clause and the exemption audit. Deleting only the zh-TW `world.retired.empty` row
reddens exactly one check, the locale key-parity clause (`zh-TW: no keys missing`). Disclosure:
that third probe was written with "any red counts" and its `named` field is therefore not an
independent claim — the red it reported is the parity check, read off the gate's own output, but the
probe would also have passed if a different check had fired. The first two are named in advance.

`tsc --noEmit` exits 0, the build succeeds, and the suite holds at 26 scripts / **1141 checks** —
M168 adds no checks, only a bigger covered set and a lower ceiling, so a count that did not move is
the expected result rather than a sign nothing happened. Not browser-verified: the in-app window
still commits no React tree (M166), so these ten strings are verified by the gate that reads every
one of them out of the dictionary and by the render sites being plain `t("literal")` calls with no
branching in between.

### M169 — Football World's status tabs, and one prediction I got wrong

`features/football/FootballWorld.tsx` reported 8 raw items. Five were not copy at all: they were
the codes of two arrays written inside a render hole — `{(["LIVE","SCHEDULED","FINISHED"] as const).map(…)}`
and the search-type equivalent — which the scan reads as JSX children because that is where a JSX
text node can be. Both arrays are now module-level `MATCH_STATUSES` / `SEARCH_TYPES`, so they are
gated as the key spaces they are (checks 16/17) instead of counted as prose.

The other three were a real defect a visitor could see: the filter buttons rendered `{s}`, the code
itself, so a 简体中文 reader reached a screen whose only English was LIVE / SCHEDULED / FINISHED —
while the page's own hint line on the very same screen was already rendering 进行中 / 已安排 / 已结束
from `fw.status.*`. The keys existed; the button just never asked for them. It now calls
`t(\`fw.status.${s.toLowerCase()}\`)`, which added a third dynamic site to the declaration table and
a new value space (`fw.status.|s.toLowerCase()`) whose values are read out of the hoisted array
rather than typed by hand.

One consequence worth stating instead of hiding: the en values are lowercase words
("live"/"scheduled"/"finished"), so the tab strip lost the caps the codes carried. No gate covers
that choice, and no CSS `uppercase` was added, because forcing the caps back would re-impose an
English-typography convention on 进行中.

Four probes, and the fourth was written as a negative control. Three named checks fired as
intended: a literal `LIVE` back on the button reddens the per-file clause (and reaches 2 reds
because the orphaned dynamic site goes stale); a fourth status code with no key reddens both
`fw.status` space rows, which is what "values are read from the array" buys; dropping `.toLowerCase()`
reddens the declaration check alone. The fourth mutation replaced the keyed call with `{s}` — printing
the code, which the raw-UI scan structurally cannot see, since there is no literal left in the file.
**I predicted that one would pass every gate, and it did not:** it reddened
`every dynamic t() site is declared, and every declaration is live`, because removing the call site
leaves its declaration stale. The site→space link is load-bearing in both directions, so a code
printed where a keyed word belongs is caught by the declaration table even though the scanner is
blind to it. That is a stronger property than I thought this file had, and it was found by trying to
demonstrate the weakness.

Suite is now 26 scripts / **1142 checks** (proof-i18n 124), covered set **20 files**, open debt
**247 across 20 files** with the ceiling at exactly that measurement — the largest remaining are
PlayerOS 90, SimulationLab 51, FilmRoom 30, DataRoom 29. `tsc --noEmit` exits 0, the build succeeds.
Not browser-verified: the in-app window still commits no React tree (M166).

### M170 — The profile's cross-mode badge, and four strings that were never copy

`features/profile/ProfilePage.tsx` reported 7 items in three kinds. The real one: the cross-mode
record panel's status badge rendered `r.active ? "active" : "not started"`, so a 简体中文 visitor's
own record rows were the only English on the screen. `prof.active` ("Active"/"活跃"/"活躍") already
existed and is what every other screen uses, so the badge reuses it and only `prof.notStarted` had
to be added (dictionary 1218 → 1219). The third was a `Sources:` caption for which `common.sources`
is the key the other six screens already call — the label had drifted into prose purely because
someone typed it at that site.

The remaining four were `Intl.DateTimeFormatOptions`: `{ month: "short", day: "numeric", hour:
"2-digit", minute: "2-digit" }` written inside a render hole, which the scan reads as JSX children,
so four format specifiers counted as untranslated interface text. They moved to a module-level
`ACTIVITY_TIME`. That is the M164/M169 remedy for the same structural artefact, and it is worth
saying plainly that **no translation happened there** — the count went down because the strings
stopped sitting where a text node can be, not because anybody's language got better. One real
locale limitation stays, and this milestone does not fix it: `toLocaleString(undefined, …)` resolves
the browser's locale, not the app's, so a visitor who picks 简体中文 in a browser set to `en-US`
still gets "Sep 3, 2026, 07:14 PM". Pinning that to the app locale needs a formatter seam, and it is
now the known next step for this file rather than a hidden one.

Three probes, all caught by a named check: the English badge back (2 reds — the orphaned
`prof.notStarted` fails reachability on its own), the option bag back inside the render hole
(1 red, the per-file clause), and deleting the zh-TW row (1 red, key parity).

Written down because it is the mistake this project has a rule about: the first draft of this
section said the dictionary went 1218 → 1221. Three rows in one file add **one** key, and the gate
prints 1219. The number was recalled instead of copied, and only the re-run caught it.

Suite is now 26 scripts / **1142 checks** (proof-i18n 124 — no new clauses, so the total is M169's),
covered set **21 files**, open debt **240 across 19 files** with the ceiling at exactly that.
`tsc --noEmit` exits 0 and the build succeeds. Not browser-verified (M166).

One machine-level finding to keep: `sed -i` on this box rewrote `i18n/dictionaries.ts` from CRLF to
LF, so a dictionary-insertion script must anchor on `\r?\n` rather than the ending the file used to
have. Git's index normalisation hid the conversion (numstat still reported the intended 30 lines),
which is why it went unnoticed for a milestone.

### M171 — The three screens that carried exactly one English word each

Every previous debt milestone took a whole screen down to zero. This one took the tail of
the table instead: `Dashboard.tsx`, `LoadPage.tsx` and `DevelopmentPage.tsx` each had
**one** counted hit left, which is why the sorted debt list put them last and why nine
milestones walked past them. A one-word file is still an unregistered file — the gate's
per-file clause only exists for files named in `RAW_COVERED`, so an English literal added
to the Dashboard moved an aggregate number rather than naming the Dashboard.

What the three words were:

- **Dashboard's `LIVE` badge.** The key for it already existed and was already used on the
  same screen (`dash.live`, line 121, the section heading). The badge could not have used
  it: `LiveCell` never called `useI18n()` at all, so raw English was the only thing that
  file was capable of rendering. Adding the hook and reusing the key also fixed a small
  inconsistency the raw string had created — the heading said "Live" and the badge shouted
  "LIVE" at the same word.
- **Load & Recovery's `ACWR` readout.** `ld.acwr` already labels the stat tile two rows
  below the banner that prints the same metric, and its zh values (急慢比) are exactly the
  translation a visitor needs in both places. One abbreviation typed twice in one file,
  only one of them keyed.
- **Development's `role target {n}` tooltip.** The only genuinely new key (`dv.roleTarget`,
  1219 → **1220** keys). Its zh wording is 位置目标, copied from `dv.strengthsHint` in the
  same block rather than invented — reading the neighbour row is how the term stays one
  term. The old template literal also had a stray trailing space.

**Verified in a real render, for the one change that needed it.** The Dashboard edit added
a hook to a leaf component, which is a behaviour change, not a text change — so the SSR
harness rendered the whole Dashboard under all three locales. The badge's own span was
matched out of the HTML: 4 badges, `Live` / `进行中` / `進行中`. A locale that had not
switched would have printed English under the zh runs.

The same harness came back **empty** for the other two screens, and that is a finding about
the harness, not the code: `OsProvider` hydrates inside `useEffect`, which `renderToString`
never runs, so every SSR page render is the *un-hydrated* state — Load & Recovery has no
sessions to compute a ratio from, and Development has no profile to find gaps in. So the
populated-state branch of those two screens is not reachable through this substitute at all,
which is the precise reason task #142 (browser walk of populated screens) is still open. What
those two edits do have, and what the gate prints, is: the key exists in all three locales,
its placeholders agree, and the call site supplies every one of them.

Four probes, all red and all naming what they broke: the badge back to `LIVE` (the covered-set
clause names `features/dashboard/Dashboard.tsx`), the banner back to `ACWR` (names
`features/load/LoadPage.tsx`), the tooltip call stopped supplying `target` (`every placeholder
key is read by a call that supplies its variables (85 filled, 1 short)`), and the zh-TW row
deleted (2 reds — key parity plus placeholder agreement).

Suite is now 26 scripts / **1142 checks** (proof-i18n 124 — again no new clause), covered set
**24 files**, open debt **237 across 16 files** with the ceiling at exactly that. `tsc --noEmit`
exits 0 and the build succeeds.

### M172 — The shared DNA card, and a key that was in the wrong namespace

`ui/primitives.tsx` is not a screen, but three screens render it (`Details`, `ComparePage`,
`PlayerOS`), and its own heading was the same English words on all three. Two of its three
counted hits were **the same literal written twice** — the `!bare &&` heading appeared in both
branches of `body`, so a duplicated string was being reported as two pieces of debt. Hoisting it
into one `heading` element above the branches makes the count honest as well as localised.

`det.dna.title` → **`dna.title`**. The rename is the substance of this milestone, not a side
effect: four of the five `det.dna.*` keys are the detail page's own section copy that the page
hands the card as props (`hint`, `note`, `fallbackNote`), so they belong to `det.*`. The title is
different — the card renders it itself, whenever it is not `bare`, which is the case on the two
screens that are not the detail page. A shared component reaching into a page's namespace would
have been the first key rename this project avoided rather than fixed. Check 4 (a call site
naming a key the dictionary does not define) and check 18 (a key nothing can reach) are what make
a half-done rename impossible rather than merely unlucky.

`dna.secondary` is the one new key (1220 → **1221**), and its Chinese value is 次要原型： — the term
`compare.dnaHint` and `det.dna.fallbackNote` already use for "secondary archetype", read out of
the neighbouring rows instead of invented.

**Rendered, not just gated.** `DnaCard` is exported and takes its `dna` as a prop, so unlike the
M171 screens it needs no store hydration to be exercised: the harness fed it
`computeDna(baselineAttributes("CM", 74))` — the project's own baseline model, not a fixture — and
matched the heading out of the HTML in all three locales: `Football DNA` / `足球 DNA` / `足球 DNA`,
plus the fallback branch (no vector) under zh-CN, which carries its own copy of that heading.

The same output shows what is **not** yet fixed: `label="Progressor"` and
`path="Progressor → Creator"` stay English under zh. Those are `domain/playerDna.ts`'s archetype
names, which is task #150 (M160) — the card's frame is now localised while the domain vocabulary
inside it is not.

Four probes, all red: the heading back to raw words (names `ui/primitives.tsx`), one caller left
on `det.dna.title` (2 reds — undefined key, plus the exemption-list check naming the file and the
key), `Secondary:` back in the JSX (2 reds — the raw-text clause **and** `dna.secondary` becoming
an unreachable key), and the zh-TW row deleted (key parity).

Suite is now 26 scripts / **1142 checks** (proof-i18n 124 — still no new clause), covered set
**25 files**, open debt **234 across 15 files** with the ceiling at exactly that. `tsc --noEmit`
exits 0 and the build succeeds.

### M173 — The chrome layer: 21 accessibility strings that were English on every route

Eight files under `components/ui/*` went into the covered set at once, which is not how
the last twenty milestones worked. The reason is that this is not a screen: it is the
generic library the screens are built out of, and every one of its 21 counted literals was
accessibility copy — landmark names, the label on an icon-only button, the `sr-only` "Close"
inside a dialog. A visitor with a screen reader hears those in the wrong language on *every*
route, whichever page they were on, and no page-level milestone could fix it by localising
its own file. Check 9 has done this since M144 for the project's own primitives; the layer
underneath it had never been reached.

**21 literals, 17 distinct words, 16 new keys.** The gap is the discipline: "Loading" was
already in the dictionary (`cta.loading`, which `LoadingState` has read since M144), so
`spinner.tsx` reads that row instead of minting `ui.loading`, and the third clause added
this milestone fails if a later one mints a second key for the word the first key carries.
The other gap, 17 → 16, is that 21 counted positions were never 21 strings: sidebar renders
one label three ways (`sr-only` text, the rail's `aria-label`, the rail's `title`), and
dialog has "Close" both as screen-reader text and as a visible footer button.

**The new check counts positions, not names.** The first version asked whether each key
appears somewhere in its file; probe 3 was written against that version and came back *green*
— pointing one of sidebar's three `ui.toggleSidebar` sites at `ui.sidebar` still left two
behind, so "the key appears" stayed true while a label on screen was wrong. The table now
carries an expected call-site count per (file, key) pair and asserts equality, so one site
missing is red and one site duplicated is red too, and the counts sum to 21 — every literal
the eight files used to carry is now a lookup. That is what makes the table the same kind of
claim as check 9's, one layer down.

**This milestone also caught a gate bug, not just a code bug.** The debt scan's non-vacuity
clause read `openRows.length >= 15` — a floor on how many files still owe work, i.e. exactly
the quantity every milestone is trying to shrink, and one that contradicted the paragraph
printed directly above it ("deliberately *not* a floor on the total"). Registering eight
chrome files at once took the open file count to 7 and the clause went red while the scanner
was working perfectly. It is gone; the two properties that paragraph actually names — the
scan walks a real tree, and it distinguishes ≥6 syntactic positions in real source — are what
remains.

**Rendered in three locales where that was possible.** `Spinner`, `Pagination` and
`Breadcrumb` take no context, so the SSR harness rendered them under `I18nProvider` with the
stored locale set per run and matched 6 labels each: the landmark names, the previous-page
`aria-label` and its visible text, the ellipsis `sr-only`, and the spinner's status label —
`Loading / 加载中 / 載入中`, `pagination / 分页 / 分頁`, `breadcrumb / 面包屑 / 麵包屑`. The
other five files are bound to `SidebarProvider`, Radix portals, embla or the message-scroller
primitive, so their proof is the gate and nothing more; the harness prints that line rather
than leaving it out.

Five probes, all red and all restored byte-identical: the spinner back to
`aria-label="Loading"` (3 reds — positions, backslide, covered-file leak), a second key minted
for that same word (1), one sidebar site pointed at the neighbouring key (1, the case the weak
version of the check could not see), a duplicated `t("ui.close")` in `dialog.tsx` (1), and one
locale losing a `ui.*` row (key parity).

Suite is now 26 scripts / **1145 checks** (proof-i18n **127** — three new clauses, one
stale floor deleted), covered set **33 files**, open debt **213 across 7 files** with the
ceiling at exactly that. After this, every file still in the debt table is a screen.
`tsc --noEmit` exits 0 and the build succeeds.

### M174 — The last 13 literals outside the big screens, and the gate that refuses a rename pretending to be a translation

Three files were left in the debt table that were not one of the four big screens:
`features/ai/AiStudio.tsx` (3 counted literals), `features/watchlist/WatchlistBoard.tsx` (4)
and `features/achievements/AchievementsPage.tsx` (6). Registering all three took the covered
set from 33 to 36 files and the open debt from 213 to **200 across 4 files** — and it is the
milestone where the arithmetic had to be interrogated rather than celebrated, because **not
one of those 13 was a word a visitor ever saw in the wrong language.**

Twelve were *codes* sitting in a position the scanner can only read as children: the two tab
ids `AiStudio` maps over (`["chat","graph"] as const`, next to which the button text already
read `t("ai.tab.chat")`), the four sort ids the watchlist board maps over (labels already
`t(\`watch.sort.${s}\`)`), and the six achievement-group keys (already `t(g.label)` — under a
field named `label`, which is the field name the scanner treats as copy). The thirteenth was
`"Knowledge graph"`, the `??` fallback behind `GraphCanvas`'s `ariaLabel`, whose only call
site has always passed `t("ai.graphAria")`. Two lists moved to module scope, one field was
renamed to say what it holds, the dead fallback and its optional prop were deleted rather
than given a dictionary row, and `tsc` confirms the required prop is satisfied.

**Which is precisely how a raw-UI count goes down without a translation being written.** The
scan exempts a string when it lives in a field it does not recognise as copy — `labelKey`
instead of `label` — and that hatch has been used legitimately since M149, M155 and M165.
Checks 28/29 close the abuse case over the whole tree, not just this milestone's files: every
literal a `*Key` field holds must be a dictionary row present and non-blank in all three
locales (89 sites across 8 files today), and every such field must be read back through
`t()` — by its own file when that file is a screen. A row registry that hands its keys to a
screen names its consumer in `KEY_ROW_CONSUMERS` (today: `domain/localData.ts`'s `labelKey` →
the settings screen), and that entry is asserted rather than assumed.

**P3 was written against a version of this check that passed, and it should not have.** The
first implementation let a `.ts` module off by searching the whole tree for any
`t(….labelKey)` read — and deleting the settings screen's `t(e.labelKey)` came back **green**,
because seven other files share that property name and any one of them excused it. The
fallback is now an explicit, per-(file, prop) declared consumer, and the same mutation
produces `FAIL every *Key field is read back through t() … domain/localData.ts: labelKey →
features/settings/SettingsPage.tsx no longer renders it through t()`. Five probes, all red,
all restored byte-identical: a `*Key` pointing at a non-existent row (2 reds, incl. key
reachability), a screen that stops resolving its own key field, the settings screen above, a
`*Key` value holding a placeholder (a composed key hidden as a static one), and a registry
renaming its field so the consumer table falls behind.

**The gate also caught the hoist, which is the other half of why hoisting is safe.** Check 16
reads the watchlist sort space out of the source that feeds it, anchored on the old inline
`["value" … ] as Sort[]`; the moment the array moved to `const SORTS`, the anchor stopped
locating it and the suite went red — three failures, including four `watch.sort.*` keys
suddenly unreachable. Updating the anchor to `const SORTS: Sort[] = [...]` is a relocation,
not a widening: the value space is still read from the code rather than written down here, so
a fifth sort id without a dictionary row goes red on its own.

Verification boundary, stated rather than glossed: all three screens read `useOs()`, so the
SSR harness cannot reach their populated states (`OsProvider` hydrates in an effect React
never runs under `renderToString`), and the in-app browser is still machine-broken (M166).
What this milestone rests on is therefore `tsc`, the build, the static gates above and the
probe record — no rendered-string claim is made for these three files, and the roadmap line
at the top of this section has been corrected to say so instead of promising a browser pass
it no longer performs.

Suite is now 26 scripts / **1148 checks** (proof-i18n **130** — checks 28/29 plus a measured
floor on the *Key surface they read), covered set **36 files**, open debt **200 across 4
files** (PlayerOS 90, SimulationLab 51, FilmRoom 30, DataRoom 29) with the ceiling at exactly
that. `tsc --noEmit` exits 0 and the build succeeds.

### M175 — Ten tab keys, one word two charts share, and a check that follows a rename instead of spelling it

Eleven of the player screen's 90 counted literals left the debt table, and the milestone is
mostly about what that number is made of. Ten are `PlayerOS`'s tab strip: its `TABS` array
held ten `player.*` **keys** in a field named `label`, which is the field name the raw-UI scan
reads as copy, while the strip itself has always rendered them through `t()`. Renaming the
field to `labelKey` — the convention M149/M155/M165 established and M174 gated — is the whole
of those ten. The eleventh is the one a visitor could actually have seen in the wrong
language: the growth chart's origin tick.

That tick is the interesting half, and it is a **namespace** bug rather than a missing
translation. `Dashboard` and the player's Progress tab draw the same `ProgressLine` from the
same `state.progress`, and the dashboard asked the dictionary for `dash.chartStart` while the
player screen wrote `"start"` inline. So the word existed twice — once keyed under one
screen's private prefix, once not keyed at all — which is M172's "Demo mode" shape exactly.
The row moved to `common.chartStart` (3 rows × 1 key, key count unchanged at **1237**), both
charts now read it, and the value that was only ever English is now 起点 / 起點 for the two
Chinese locales.

**A rename is only safe if the gate can still see it, and here it could not.** Check 8 has
pinned this exact tab strip since M143, in two halves: a regex reading the label values out of
`const TABS`, and a regex looking for the render site. Both halves spelled the word `label`.
After the rename the first matched nothing and the second matched nothing, so the check went
red — correctly, but *by luck*: a milestone that renamed the field and updated only the value
regex would have kept asserting a `t(tab.label)` render site that no longer existed anywhere.
Check 8 now reads the field name out of the array once and uses it for both halves, so the
rename stays legal while "ten keys, all present in three locales, all rendered through `t()`"
stays pinned. This is the second time the key-vs-copy convention bit a gate (check 16's source
anchor was the first, at M174), which is the pattern to watch: **every hatch the scan looks
through is a hatch some check reads through as well.**

**New check 30 refuses the two-carriers-of-one-word shape directly.** Nothing above would
have caught a second `chartStart` being added back: each key stays reachable, each locale
stays complete, each literal stays inside the ceiling, and the drift only shows up the first
time someone edits one copy. A global "one key per word" rule is not available — measured on
the en block, **130 keys hold a value another key already holds**, because "Pass" as a stat
name and "Pass" as a button verb are different strings with different futures. So it is a
declared list (`SHARED_WORDS`, today: `start` → `common.chartStart`) that a milestone may
lengthen and nothing else may, with three clauses per entry: exactly one English value carries
the word, at least **2** call sites read that key (single-sourcing a word one reader uses is
decoration), and no `.tsx` in the tree renders the bare word as copy again.

Five mutation probes, all red, all restored byte-identical, each naming its own clause in the
FAIL list: the inline `"start"` coming back (3 reds — the bare-word clause, the reader count,
and the ceiling at 190 > 189); the dashboard reader pointed at another key (`read by 1 call
site`); the old `dash.chartStart` row re-added to the en block (`carried by exactly one
English key (common.chartStart, dash.chartStart)`, plus parity and reachability); a **partial**
rename of the tab field to `labelText` on one entry only, which produced *two* reds — `all ten
tabs carry a label (1)` and the render-site clause — showing the derived field name still
bites; and a `labelKey` pointing at `player.coachX`, caught by both check 28 and check 8's
dictionary-parity half.

Verification boundary is unchanged from M174 and still applies to this file: `PlayerOS` reads
`useOs()`, the SSR harness cannot reach a hydrated store, and the in-app browser is still
machine-broken, so no rendered-string claim is made here — the evidence is `tsc`, the build,
the static gates and the probe record above.

`tsc --noEmit` exits 0, `npm run build` succeeds, and the suite is now 26 scripts /
**1151 checks** (proof-i18n **133** — check 30's three clauses). Covered set stays **36
files**: the player screen still carries **79** counted literals, so it remains in debt and
was *not* registered. Open debt is **189 across 4 files** (PlayerOS 79, SimulationLab 51,
FilmRoom 30, DataRoom 29) with the ceiling at exactly that measured number, and the *Key
surface checks 28/29 police is now **99 sites across 9 files**.

### M176 — The badge panel that named a badge which does not exist, and the one derivation three screens shared

The growth tab of the player screen claimed six "badges to earn next". They were typed in
by hand, and one of them — `"1000 XP"` — names a badge that exists nowhere in the app: not
in the catalogue, and not derivable from it, because no rule in `domain/achievements.ts`
has a target of 1000 (check 14 pins that). The rest restated real rules with numbers the
engine could disagree with: they were prose about progress, not progress. Meanwhile the
same `AchievementInput` was being assembled by hand in two screens and re-derived by a
third, each mapping `sessions` → completed count, `goals` → done count, `xp` → level.

Both halves collapse into the domain. `achievementInput` takes what the store actually
holds — session rows, goal rows, arrays, the academy summary — and returns the badge-facing
shape; `nextBadges(list, n)` is the ranking the Dashboard tile and the panel now share
(locked only, `pct` desc, tie-break on the lower target). The panel renders the catalogue's
own rows through `t(\`ach.name.${a.id}\`)`, so a row cannot name a badge that is not in the
dictionary space check 17 already proves complete, and its empty branch says so.

**This is the milestone where `tsc` found the second bug of the M175 family.** Replacing the
Dashboard's hand-built input left `unlocked: list.length - locked.length` referring to a
`locked` that no longer existed — the same shape as M175's `tab.label` after the rename:
*the write-side of a rename is never the whole rename.* It was not cosmetic: that expression
feeds the "N of 21" figure on the growth card, and the compiler refused it rather than let a
counter quietly mean something else.

The proof grew from 20 checks to 39 (`scripts/proof-m67.mjs`): the mapper's output shape is
asserted **equal to the interface's key set**, so a new `AchievementInput` field cannot be
added without a derivation line; each field is traced to its formula on a fixture where the
counts differ from the totals (2 of 4 sessions completed, 2 of 3 goals done); `level` is
cross-checked against the XP ladder rather than restated; the mapper does not touch its
input (the callers pass live store arrays); and a streak-only change differs in exactly one
field, which is what refuses a mapper that re-derived streak from sessions and so would
have passed the field-by-field checks. `nextBadges` gets its order, its cap, its
locked-only filter, a `0`-rows call, and a promise that it does not reorder the list it was
handed. Then three source-text checks (the M134 technique — a proof may not import a
component, but it can read its file): no screen calls `evaluateAchievements({` with an
inline literal, every screen calls `achievementInput(`, the panel interpolates its badge
names through `t()`, and the string `"1000 XP"` is gone. Comments are stripped before those
checks run, because the milestone's own explanatory comment quotes the deleted label, and
*prose about a dead string must not satisfy a check about the shipped UI.*

**The gate change on the i18n side started red, which is the point.** The new
`t(\`ach.name.${a.id}\`)` site made check 16 report `61 sites / 1 undeclared`: a fourth
screen interpolating a key family has to declare itself, or the key-reachability arithmetic
silently loses a caller. With the declaration added, the ten literals that left PlayerOS are
real visitor-facing copy — panel headings, the empty-curve hint, the XP line, the "every
badge unlocked" branch — and for the first file in this arc **not one of the removed hits
was a code or a rename**. The ceiling moved 189 → **179** on the gate's own line.

Nine mutation probes, all red on their own clause and all restored byte-identical: a
session counting toward badges whether completed or not; `level` pinned to 1; the ranking
flipping to easiest-first; the cap dropped; a badge name typed into the panel; a screen
spreading a hand literal *next to* the mapper (so the red is attributable to the literal,
not to the missing call); `"1000 XP"` restored; the interpolation removed, which strands
the new declaration and prints `0 undeclared / 1 stale`; and one heading back to raw
English, which prints `(180 across 4 files, ceiling 179)`. The first draft of the cap probe
used `Math.max(n, 1)`, which kept the `caps at n` assertion green — a probe that cannot go
red is not a probe, so it was rewritten to delete the slice.

Verification boundary is unchanged from M175: `PlayerOS` reads `useOs()`, the SSR harness
cannot reach a hydrated store, and the in-app browser is still machine-broken, so no
rendered-string claim is made for this panel — the evidence is `tsc`, the build, the static
gates and the probe record above.

`tsc --noEmit` exits 0, `npm run build` succeeds, and the suite is now 26 scripts /
**1170 checks** (proof-i18n **133**, proof-m67 **39** up from 20). Covered set stays **36
files**; the player screen still carries **69** counted literals, so it remains in debt.
Open debt is **179 across 4 files** (PlayerOS 69, SimulationLab 51, FilmRoom 30,
DataRoom 29) with the ceiling at exactly that measured number, **61** dynamic `t()` sites
all declared and live, and the dictionary at **1243 keys × 3 locales**.

### M177 — One screen, two languages for the same verdict, and the gate that only saw what someone had remembered to list

The load page's banner printed its zone name out of `ZONE_LABEL` in `domain/load.ts` — five
English words — and the legend directly beneath it printed `t("ld.zoneUnder")` and friends.
A reader of 简体中文 got 负荷不足 in one line and "Underloaded" in the line above it, on the
same screen, describing the same verdict. Four of the five words were already in the
dictionary; the fifth had never been translated because it had never been a key. So the fix
is not "translate the banner", it is *stop letting a domain module own a word*: `ZONE_LABEL`
is now `Record<LoadZone, RowText>` and all four screens that name a zone resolve it through
`rowLine`, which is the only thing in the app that turns a row into text.

**The same rule was written twice, in two different kinds of thing.** `classifyZone` decided
the verdict with `if (acwr < 0.8) … if (acwr <= 1.3) …` and the legend displayed the
thresholds as four hand-typed strings. One fact, two sources, one of them a display string —
which is how a boundary could move and leave the legend describing the old one. `ACWR_BANDS`
is now the single table, `classifyZone` reads its verdict out of it, and `ZONE_LEGEND`
composes the range text from the same numbers; the proof pins those composed strings to
exactly what the screen used to type by hand, so the refactor cannot quietly change what a
visitor reads.

**Two of the zone's sentences were false, and the gate that now catches them started green
while they were being said.** A ratio that cannot be computed (a chronic average that rounds
to zero) classifies as caution, and caution's advice line read *"Ratio — is climbing toward
the risk band"* — quoting a dash as a number, next to a banner that printed the same dash,
and recommending the reader swap out their hardest session. An empty current week classifies
as `none`, whose line read *"No completed sessions in the last 28 days"* to a reader whose
log held sessions at day 10 and day 17; its label claimed **"No data"**. Each zone now says
which window is actually empty, and the classifier's third argument went with the arm that
could never fire: `weekLoad` is the 7-day slice of `chronicTotal`, so any week with load has
nonzero chronic load under it. That is measured rather than asserted, and `classifyZone.length === 2`
refuses the dead argument's return.

**The lesson about the gate is the one worth keeping.** Check 28 has existed since M175 to
stop a screen printing a row object instead of resolving it — and through this entire
milestone, while a new `RowText` map was handed to four screens, it stayed green. It was
looking at `zone.label`, `m.text`, `g.title`: a list of names somebody wrote down. A fact
that lives in a type annotation should not need a hand-written list to keep enforcing itself,
so check 28b derives its subjects — every `const X: Record<…, RowText>` in the codebase is a
row producer, and every indexed read of one inside a component has to sit inside a `rowLine(`
call. Today that is 2 maps and 5 reads. Probe M8 prints the map straight into JSX and gets
the red; probe M9 does the same to the legend; probe M10 deletes the type annotation, and the
gate reports `(1 derived maps, 0 reads)` — *losing the derivation is itself a failure*, which
is the difference between a gate and a note to a future self.

`scripts/proof-load.mjs` went from 34 checks to **62**. The load-bearing one is an
equivalence sweep: `classifyZone` is run across all 401 two-decimal ratios from 0.00 to 4.00
against a longhand replica of the pre-table rule, and the sweep is required to have crossed
all four bands so it cannot pass vacuously; then each printed band edge (0.79/0.80, 1.30/1.31,
1.50/1.51) is pinned on both sides. The zone rows are resolved through `rowLine` against a
recording `t`, and the set of them is compared to the `LoadZone` union *read out of the
module's own source*, so a sixth band without a label is red here rather than an `undefined`
in someone's banner. Fourteen mutation probes, all red on their own clause and all restored
byte-identical: a zone name back to a word typed in the domain, a threshold disagreeing with
the rule it replaced, a boundary flipping from inclusive to exclusive, the dash-in-prose
sentence restored (advice and recommendation separately), the legend's first range
hand-typed, the dead argument restored, a sixth zone without a row, the rest-week lying
about 28 days, its recommendation calling an empty week a missing baseline, the label back to
"No data", and the three gate-shape probes above.

Verification boundary unchanged from M175/M176: the in-app browser still does not commit a
React tree at the machine level, and `LoadPage`/`Dashboard`/`PlayerOS` all read `useOs()`, so
no rendered-string claim is made here — the evidence is `tsc`, the build, the two rewritten
gates and the probe record.

`tsc --noEmit` exits 0, `npm run build` succeeds, and the suite is now 26 scripts /
**1199 checks** (proof-i18n **134** after 28b landed, proof-load **62** up from 34). Covered
set stays **36 files** and the raw-UI debt
stays at **179 across 4 files** — this milestone moved no literals out of a component, it
moved a *noun* out of a domain module, which the raw-UI scan cannot see and `RowText` can.
Dictionary **1244 keys × 3 locales**.

### M178 — The load model's sentences went onto keys, and one of them turned out to be unreachable

M177 made a zone *name* a row. This one did it for the load model's *prose*: the advice
line, the recommendation, the nine evidence figures and the three source chips were
`string` fields holding English sentences composed in `domain/load.ts`, which is the worst
possible combination — a 简体中文 reader got translated labels wrapped around untranslated
paragraphs, and no scan in the suite could see it, because the raw-UI gate reads component
source and these strings never passed through a component. They are `RowText` now, 25 new
dictionary rows, and every number the sentences quote comes out of the model rather than
out of someone's memory of it: the 0.8–1.3 and 1.5 edges read `ACWR_BANDS`, the 7- and
28-day windows read `ACUTE_DAYS`/`CHRONIC_DAYS`, the settle threshold reads
`WEEKS_TO_SETTLE`. The proof resolves each row through a real `t`-shaped interpolator
against the real dictionary in all three locales, and refuses a leaked key, an unfilled
`{placeholder}`, an empty line, and a Chinese locale that renders Latin script.

**Composing a sentence from a domain module hides a second class of bug: nobody can see
whether the branch ever runs.** `buildWeekly` emits a fixed chronic window — always
`CHRONIC_DAYS / 7` buckets, empty ones included. The early-trend caveat gated on
`weeks < WEEKS_TO_SETTLE` where `weeks` was that array's length, so it compared a variable
against the constant 4: the row existed, the page had a place for it, and the sentence
could never print. The same constant went into `confidenceInput`, so a reader with one
logged session was credited with four weeks of history and shown confidence 60 for a
measurement built from a single number. History depth now counts weeks that carry a
session, the caveat is reachable (and pinned reachable, not just "its own row"), and that
first reader sees 48. The reason the old value was 60 is written into the proof next to the
new one, because a changed expectation with no recorded reason is how a regression gets
blessed.

**A row the screen forgets to interpret is worse than the string it replaced**, since the
model now *looks* localised: section 18 reads `LoadPage` as source and requires each
published field to sit inside a `rowLine(` call, the caveat to render as its own element,
and neither list item to be dropped into JSX raw.

**Check 31 is the ratchet for the rest of this line of work.** Every gate above it reads
component source, so a sentence in `domain/*.ts` was only ever found milestone by milestone
— and the count of them was never *measured*. It is now, per module, with a ceiling that
only a milestone may lower: **376 sentence-shaped literals across 18 of the 31 domain
modules**, with `domain/load.ts` pinned at zero in its own check, because a total lets 24
literals walk from one module to another and still pass. The scope is `domain/` on purpose:
`data/` carries authored sample copy that screens label as demo content, while a domain
module's strings are the model speaking.

`tsc --noEmit` exits 0, `npm run build` succeeds, and the suite is now 26 scripts /
**1224 checks** (proof-i18n **137** after check 31 landed, proof-load **84** up from 62).
Dictionary **1269 keys × 3 locales**, up from 1244. Covered set stays **36 files** and the
raw-UI debt stays **179 across 4 files** — nothing left a component this time. Eleven
mutation probes, all red on their own clause and all restored byte-identical: the history
depth back on the fixed window, confidence ignoring active weeks, the caveat deleted from
the screen, evidence rows printed raw, an advice row dropping its `{days}` var, a band edge
quoted from memory, the band table itself moved, a source chip back to a typed string, a
load row left in English inside the Simplified locale, that row deleted from it, and a
sentence written back into `load.ts` (which trips both the per-file zero and the ceiling).
Verification boundary unchanged from M175–M177: the in-app browser still does not commit a
React tree, so no rendered-page claim is made here — the evidence is `tsc`, the build, the
two gates and the probe record.

### M179 — The weekly review speaks in rows, and nine dictionary rows turned out to be three sentences

`domain/review.ts` was the last model on a shipped screen that still wrote its own English:
37 sentence-shaped literals — the highlight lines, the suggested-focus reason, the evidence
ledger, the source chips — which `ReviewPage` printed raw as `{ins.text}`, `{e}` and `{s}`.
They are 51 rows now, ×3 locales, and every read site on the screen goes through `rowLine`.

Three things the conversion turned up that a straight "move the strings" pass would have
walked past:

- **The scanning sentence was two fragments joined in code.** `{base}{trendClause}` is not a
  sentence a translator can fix after the fact — the target language's word order decides
  whether the fragment reads at all. It is three rows now (`rv.ins.scan`, `.scanTrend`,
  `.scanSecond`), each carrying every figure it names, chosen by the model's own branch.
- **A sentence can need two attribute names.** `rv.ins.imbalanced` compares the focus you
  trained most with your lowest attribute, so `CODE_VARS` gained `b` beside `a`: a row
  variable whose *value* is a code, resolved through the reader's dictionary by the one
  interpreter. The One/Many arms follow the convention the app already had (`learn.attemptOne`,
  `comm.nThreadsOne`); where a sentence held a second countable, it is phrased plural-neutral
  ("detection count {d}") rather than multiplied into four arms. One honest narrowing: the
  "flagged by the clips but absent from your training" line names the focuses and no longer
  repeats each one's clip tally — the "Repeated focus" chips beside it carry those numbers.
- **Two screens had minted the same sentences twice.** `rv.recoBusy/recoDone/recoError` and
  `ld.trainBusy/ld.trainDone/ld.trainError` were byte-identical in *all three* locales — nine
  rows for one shared toast trio, and the training-log source chip was a tenth shared by
  `/load`. They are `common.build*` and `common.src.log` now, and check 32 keeps the class
  shut: no English sentence of 20+ characters may be carried by two keys (441 sentences
  screened, 0 shared).

Check 28's hand-written list of row read-sites was the milestone's own miss. Its probe —
print `{ins.text}` raw instead of interpreting it — stayed green, because the list named
`m.text` and `g.title` and nobody had added this screen. So 28c derives the property names
from the `RowText` annotations in the interfaces themselves and resolves them **per
component**: a name only gates where that file cannot confuse it with a plain-string field
of the same name. Gating on the global intersection instead measured 2 fields and 1 read
site, i.e. a gate that guards nothing, which is why the shadowing is per reader. Screened
against the same logic, check 7's simplified-character list was also stale about itself —
its name said 16, its string held 18, and a wider pass over all 1,313 zh-TW values found one
pre-existing 后 where 後 was meant. The count is derived now and the list is 19.

The proof side got one structural fix: `i18n`'s interpolator is an exported `translate()`
and `scripts/lib/rows.mjs` hands it to the gates, so `proof-review`, `proof-load`,
`proof-m65` and `proof-m73` resolve rows through the code the screen runs instead of four
hand-copies of it. The new `scripts/proof-review.mjs` is 49 checks over 6 fixtures: 95 rows
read in 3 locales, no key or placeholder leaked, the right One/Many arm for each count,
every One/Many pair carrying the same figures apart from its number, and each sentence's
digits equal to what the model computed.

`tsc --noEmit` exits 0, `npm run build` succeeds, and the suite is now **27 scripts / 1280
checks** (proof-i18n **143**, proof-review **49** new). Dictionary **1313 keys × 3 locales**
(1269 + 51 − 7 collapsed). The domain-prose ceiling falls **376 → 339 literals**, 18 files →
17, and the per-file zero list is declared: `load.ts` and `review.ts`. Covered set stays 36
files, raw-UI debt 179 across 4 — this milestone moved prose out of a model, not out of a
component. Twelve mutation probes, all red on their own clause and all restored
byte-identical: One/Many arms swapped, a row dropping its XP variable, a placeholder renamed
in one locale only, `b` out of `CODE_VARS`, an insight printed raw, a signed number spelled
in English again (which trips the ceiling *and* the per-file zero), a second key for a
sentence the dictionary already carried, the app's own interpolator told to stop filling
variables, focus blocks counted as lines, the trend arm of the scanning row deleted, the
academy chip advertised with no academy records, and P5 rerun against both gates.
Verification boundary unchanged: no rendered-page claim is made here.

### M180 — The knowledge graph named its relations in the reader's language, and its legend stopped being a hand-drawn list

The `/ai` "Knowledge graph" tab drew its edge labels from strings typed into
`data/intelligence.ts` — `plays for`, `has player`, `competes in`, `mentions`, `21 pts` —
so a 繁體中文 reader got a Chinese interface carrying an English diagram. They are rows now
(`KgEdge.relation: RowText`, six new keys ×3 locales), resolved by `rowLine` in the canvas.

Two things fell out of doing it that way:

- **The legend could not name a kind it was already colouring.** `TYPE_COLOR` lists five
  entity kinds and the legend hardcoded four chips, and a club query really does put a
  `match` node on the canvas (measured: `club, competition, player, match`) — a colour with
  no word. The table now owns the answer: it is typed `Record<KgNode["type"], string>` so a
  kind cannot exist without a colour, `KG_KINDS` is derived from its keys, the legend maps
  that list, and `ai.legend.…` is a declared value space whose members proof-i18n reads out
  of the table itself, so a sixth kind is a red gate until it also has a word in all three
  locales. Deriving it also removed a false positive the raw-UI scan would otherwise have
  had to be told to ignore: the cast that named the kind list inside a JSX hole read as
  interface copy.
- **`data/` was a hole in the prose ratchet.** Check 31 exempts `data/` because that is
  where authored sample copy lives, and the exemption is right for lesson texts and news
  items — but `data/intelligence.ts` is the assistant composing an answer out of retrieved
  records, which is model voice. It now carries its own falling cap (**34** literals after
  this milestone; the evidence facts and answer leads are the queue's #165), so prose can
  no longer escape the ratchet by moving one directory over.

`scripts/proof-graph.mjs` is new (22 checks): every edge label is a row, each of the five
relation words is actually drawn by a query a reader can type (the behavioural half of
reachability — check 18 only proves a key is *quoted* somewhere, not that any edge can
carry it), every label resolves in all three locales with no placeholder left open, the
points figure equals the standing table's own column in table order, and the legend is
derived rather than restated. Nine mutation probes, all caught, all restored
byte-identical: a relation back to a bare string, the points figure dropped from the row,
the 繁體 word for "Fixture" deleted, the lookup moved to an undeclared prefix, a hand-added
chip, the legend hand-restated, a sixth kind with no word, the relation printed raw on the
canvas, and the points edge never drawn at all. Three of those initially crashed the new
proof instead of failing a clause, which is not evidence, so the gate grew its own
row-shape guard first and now reports red.

`tsc --noEmit` exits 0, `npm run build` succeeds, and the suite is **28 scripts / 1305
checks** (proof-i18n **146**, proof-graph **22** new). Dictionary **1319 keys × 3 locales**.
Domain-prose ceiling unchanged at **339**; the new `data/intelligence.ts` cap is **34**.
Covered set 36 files, raw-UI debt 179 across 4.

### M181 — The prose ratchet learned the difference between a sentence and a number format

Check 31 counts sentence-shaped literals in `domain/*.ts`, and the shape it asked for was
"a literal containing a letter and a space". That is also true of `€${(v / 1_000_000).toFixed(1)}M`,
of the ISO-date builder in `history.ts`, of the scoreline `${home.name} ${hg} – ${ag} ${away.name}`
template, of `"M."` in a list of simulated players' initials, and of five rounded-figure
templates in `worldEngine.ts`. Twenty-seven of the 339 literals the ratchet was carrying are
formats — strings with no English inside for a dictionary to improve on. That is not exactly
a wrong count, but it spends the ceiling on things no translation can fix.

So the rule now cuts every `${…}` hole out first and asks whether a word of two or more
letters survives. Measured on the tree: **312 literals across 14 of 31 modules** (was 339
across 17), and `data/intelligence.ts`'s separate cap from 34 to **29**. The re-base is not a
discount handed to the code — the three modules the change freed, `history.ts`, `compare.ts`
and `worldEngine.ts`, are pinned at zero in the same commit, so their formats cannot come
back dressed as prose and no real sentence may arrive there either.

A narrowed validator has to be tested in the direction it was narrowed toward, so the gate
now carries ten literals copied out of the tree — five sentences, five formats — and
classifies each. The one that earns its place is `"Ask now to see the fix log"`: every word
in it is three letters or fewer, so a mutation that tightens the rule past its own intention
(four letters and up) fails there even though every format still classifies the way a naive
check would expect. Four probes, all caught, all restored byte-identical: the word rule
switched off (339 against a ceiling of 312, and the three freshly pinned modules reporting
their formats back as debt), the interpolations no longer stripped (328, three samples
mis-classified), the rule tightened to four letters (one sample wrong), and a real sentence
typed into `worldEngine.ts` (313, its own zero-pin naming the line).

`tsc --noEmit` exits 0, `npm run build` succeeds, and the suite is **28 scripts / 1310
checks** (proof-i18n **151**, five of them the new classifier pair). No application source
changed in this milestone, which is why the three new zero-pins rather than the ceiling
number are the part that can go red again.

Verification boundary unchanged: the numbers here
come from the gate's own run; no rendered-page claim is made.

### M182 — The Football DNA's names and blurbs moved into the dictionary

The DNA card, the player page, the comparison screen and the scouting table all printed
"Deep Playmaker" and "Dictates tempo from deep with composure and range." to every reader,
because those words were fields on `domain/playerDna.ts`'s archetype table. The table now
carries the code and the score only; the ten names and ten descriptions are `dna.arch.*` and
`dna.blurb.*` (21 new keys ×3 locales, including `dna.evolution`), and `CODE_VARS` grew
`arch`/`arch2` so a row can name an archetype in the reader's language.

Moving them surfaced two things worth keeping:

- **`key` was the wrong word in that table.** The gate that audits every `{ key: "…" }`
  literal in a module mentioning `RowText` read the archetype entries as rows naming keys
  called `creator`, `progressor`, `ball_winner` — and it was right to be suspicious, since
  `key` is exactly what the row union uses for a dictionary key. The field is `id` now, so
  the collision is gone rather than the gate being told to look away.
- **A stored code can still reach the page.** `Player.archetype` holds an id, and M58's
  original defect was that id rendering as a name. Check 28d now requires every read of
  `.archetype` in a component to sit inside a `dna.arch.` lookup (6 guarded reads, 0 raw),
  and `dna.arch.…`/`dna.blurb.…` are declared value spaces whose members are read out of
  `ARCHETYPES` itself — plus the reverse direction, because a space read from the table only
  proves the table is covered: an archetype deleted from the model would otherwise leave its
  words behind as keys that look reachable.

`archetypeLabel` became `archetypeLabelEn` and kept exactly one caller: the demo coach's
rationale text, which is English by construction until its own sentences are keyed. The DNA
proof gained three checks and lost none: the evolution row resolves to both names in every
locale with no id leaking, it is deterministic through the interpreter and not just the
object, and the table is asserted to carry codes only.

`tsc --noEmit` exits 0, `npm run build` succeeds, the suite is **28 scripts / 1325 checks**
(proof-i18n **163**, proof-m99 **23**) and the dictionary is **1340 keys × 3 locales**. Seven
mutation probes, all caught, all restored byte-identical: an archetype id with no word, a
繁體 description deleted, the evolution row printed raw, a screen showing the stored id, the
interpreter's archetype branch removed, an English name re-added to the table, and a lookup
invented under an undeclared prefix. No rendered-page claim: the in-app browser still
commits no React tree.

### M183 — The AI panel's own words are keyed, and its source line stopped printing codes

The Football AI chat listed its sources as `club:man-city, player:erling-haaland` — the
retrieval layer's own identifiers, shown to a visitor as if they were citations — and its
evidence chips (`Standings`, `Key man`, `Profile`, `Template edge`, `Career arc`,
`Fixture`, `Model`, `Next fixture`, `Next fixture model`) were English strings typed
into `data/intelligence.ts`. Both are rows now: a source is
`{ kind, name }` and resolves the kind through `ai.legend.*` — the very table the graph
legend already uses, so one list names an entity kind for both screens — and a chip label
is a key, while a label that came out of a record (a club's name, a headline's kind) stays
a `value` row and is shown exactly as stored. 11 new keys ×3 locales.

`AiStudio` persists its chat log, so stored messages from before this change hold plain
strings. The fix is the boundary helper the app already has: the log is mapped through
`asRowText` once on the way in, so every render site is a plain `rowLine` and an
older-format value is never re-interpreted as a key.

Three gates grew with it. `ai.legend.*` now has two declared value spaces — the canvas's
`TYPE_COLOR` keys and the retrieval layer's `SEARCH_KINDS` — plus a clause that refuses
when the two lists disagree, because five kinds in one file and four in another is exactly
the drift M180's legend fix was about. Check 28c had to learn where a plain-text field
really hides: `label: string` as an inline component prop was invisible to a
line-anchored scan, so the gate was reading `Legend`'s own text prop as an unresolved
row. And `proof-ai-grounding` gained 12 checks, including three that read the panel's
source text, since a row printed raw renders as `[object Object]` and the raw-UI scan has
nothing to see.

`tsc --noEmit` exits 0, `npm run build` succeeds, the suite is **28 scripts / 1339
checks** (proof-i18n **165**, proof-ai-grounding **35** up from 23), dictionary **1351 keys
× 3 locales**. Seven mutation probes: a chip back to a typed string, a chip word smuggled
through the value arm, a source row missing its kind, the panel printing a chip raw, the
panel reading the un-normalised log, a retrieval kind removed from the interpreter, and a
繁體 chip word deleted. The first run of the chip probe crashed the proof instead of
failing a clause, so the proof grew a row-shape guard and the probe was re-run — it then
produced exactly one red and no crash. No rendered-page claim: the in-app browser still
commits no React tree.

### M184 — The Football AI composes rows, not English sentences

Every sentence the `/ai` chat showed was typed into `data/intelligence.ts`: the club
profile line, the standings line, the key-man line, the two Poisson projection
paragraphs, the player line, the archetype line, the template-edge line, the career-arc
line, the fixture line, the news line, the competition line, plus five answer leads and
the no-hits refusal. They are rows now (28 keys ×3 locales), so the panel answers in the
reader's language. Three shapes mattered more than the count:

- **The answer was one string** — a lead with the first fact interpolated into it, then
  two more facts appended with spaces. `RagAnswer.answer` is a `RowText[]` (the lead, then
  the facts it cites) and the panel renders them in order. Nothing was dropped; what went
  away is the glue no translator can work around.
- **`ord()` existed only to spell an English ordinal** ("1st") into the standings line. A
  rank is a number, and the helper died with that sentence.
- **The value answer used to scrape a €figure out of an already-rendered sentence** with a
  regex (M102). The record carries the figure, so the row interpolates it from the player:
  the same honesty guarantee, none of the dependence on how a number was once worded.

Two new code families resolve through tables that already exist, so the assistant cannot
invent a fourth word for them: `arch`/`arch2` → `dna.arch.*` (M182) and `traj` →
`det.arc.*` (the player page's own trajectory rows). The scout report's headline is still
composed English inside `domain/scouting.ts`, so the template-edge row states the
comparison it belongs to and two rows after it name the attributes by code; the
per-attribute deltas stay where they are already rendered, and the headline moves here when
scouting.ts is keyed.

The file the prose ratchet has watched since M181 went **29 → 2** counted literals (both
remaining ones are fragments of the question parser's regexes), so check 31b's cap for it
is tightened to 2 instead of leaving 27 slots of headroom. Facts dedupe by row identity
now, not by a 40-character slice of English.

**Verification is not complete, and is recorded that way rather than implied.** M184
landed with its mutation probes still to run; the follow-up commit added six checks
(every answer element is a row; an answer is its lead plus at least one retrieved fact;
every evidence line and chip is a row; the panel normalises a stored string answer; the
three most valuable players are each answered with their own figure) and then ran five
mutations. **Three were caught; two were not**: replacing a retrieved fact's row with a
composed English string, and decoupling the value figure from the record. The first means
the clause named "every evidence line is a row" does not do what its name claims — so the
name overstates it until #170 explains why. The second survived because the proof's own
fixture picker searches for a player whose answer contains its figure, which lets a
hardcoded `€0.0M` satisfy some low-value player. Fixing both is the next milestone's first
action, before any more prose in this file is moved onto keys.

`tsc --noEmit` exits 0, `npm run build` succeeds, and the suite is **28 scripts / 1345
checks** (proof-i18n **166**, proof-ai-grounding **40**), dictionary **1379 keys × 3
locales** — measured after the follow-up, correcting the 1347 written into that commit's
message before the final run. No rendered-page claim.

### M185 — The two probe classes M184 left open, closed by fixing the checks

M184's record says two mutation classes went uncaught, and it stands. What the re-probe
showed is that both failures were the *checks*, not the code, and in both cases a clause was
doing less than its name claimed:

- The answer-shape clauses sat inside `if (vf)`, so they only ever examined the one answer
  the value fixture produced — a club fact composed as English was never looked at. They now
  walk six queries that reach each retrievable kind (club, player, competition, fixture,
  headline) across all three locales, over 33 evidence lines.
- The value-figure check read the whole answer. The fact rows travelling *with* the lead
  already carry the euro figure, so a lead hardcoded to `€0.0M` passed it. The check now
  inspects the lead row itself — its key, and the variable it was handed — for the three
  most valuable players in the dataset, which no single hardcoded string can satisfy.

Six mutations re-probed, all caught, all restored byte-identical: a club fact composed as
English, a news fact composed as English, the value lead's figure untethered from the
record, the value lead interpolating the wrong field, a source row's kind swapped for its
name, and a placeholder renamed inside one locale's answer lead. `proof-ai-grounding` is 43
checks (was 40); `tsc --noEmit` exits 0, `npm run build` succeeds, and the suite is **28 scripts / 1348 checks**. No rendered-page claim.

### M186 — The scout report's verdict, ledger lines and provenance publish as rows

`domain/scouting.ts` computed a real comparison against the positional template and then
said it in English: the headline ("Technical runs ahead of the CM template; Mental is the
shortfall"), four evidence lines and three provenance chips. They are rows now (15 keys ×3
locales), the player page resolves them through `rowLine`, and the Football AI carries the
**same headline row** as one of its evidence lines — a row re-used, not English interpolated
into a key, which is the nesting rule M184 established. `cat`/`cat2` joined `CODE_VARS` so a
row can name an attribute category through the charts' existing `attr.*` space (the gate's
own `S_CAT` list, not a restated copy).

Four new clauses, then four mutations, all caught: a verdict composed as English again, a
provenance chip typed as a string, the interpreter's category branch removed, and the player
page printing the verdict raw. The last one is the interesting gap — check 28c cannot see it,
because `headline` is *also* a plain-string field in the player page's import graph, so the
name is shadowed and the derived gate stands down by design; until a type-level gate exists,
that read site is asserted against the screen's source text instead.

Two numbers moved that matter: the domain-prose ceiling re-based **312 → 277 across 13
modules** (M182's DNA move and M186's scouting move together), and `playerDna.ts` joined the
per-file zero list. `scouting.ts` deliberately did **not**: `modelPlayerProfile` still
composes a note and four provenance strings, so the file stays counted rather than being
excused.

`tsc --noEmit` exits 0, `npm run build` succeeds, the suite is **28 scripts / 1354 checks**
(proof-i18n **168**, proof-ai-grounding **47**), dictionary **1394 keys × 3 locales**. No
rendered-page claim.

### M187 — The modelled attribute profile's note and provenance are rows too

`modelPlayerProfile` is what the player page says when the dataset ships no vector for a
player: an estimate, plainly labelled. Its note ("Modelled from overall rating and position
using the demo attribute baseline — an estimate, not measured data.") and its four
provenance chips were English strings. They are rows now (5 new keys ×3 locales, and the
per-player-vector chip *reuses* `sc.out.src.vector` rather than minting a second key for the
same sentence — the rule check 32 enforces).

That empties `domain/scouting.ts`: it joins the per-file zero list and the domain ceiling
re-bases **277 → 271** (across 12 counted modules) in the same step. `proof-m99` grew
seven checks (row shape on both branches, provenance lists, all three locales resolving
without a leaked key or placeholder, the two notes reading differently per locale, and the
player page's read sites — again asserted against source text, because `note`/`sources` are
also plain-string fields in that file's import graph so 28c stands down by design). Three
mutations, all caught, no gate crash: the note typed as English again, a provenance chip as
a string, and the page printing the note raw. Measured after this commit: `tsc` 0, `npm run
build` 0, suite **28 scripts / 1360 checks** (proof-i18n **169**, proof-m99 **28**),
dictionary **1399 keys × 3 locales**. No rendered-page claim.

### M189 — `careerArc` publishes rows, and the per-module caps make the count trustworthy

The career-arc panel's four evidence lines and two provenance chips were the last sentences
`domain/careerArc.ts` wrote by hand ("Technical profile peaks around 28; this player is 19",
"…→ up to 8.4 levels of headroom" / "ceiling already reached", "modelled peak … in 3 years",
"decline accelerates from 30; 5 prime years remaining"). They are rows now (8 keys ×3
locales): the headroom line is a two-shape pair, the modelled-peak line takes the One/Many
arm matching its number, and the decline line phrases its second countable as a label and
value ("prime years left: {m}") rather than multiplying the key matrix. The player page
resolves them through `rowLine`, including the provenance list interpolated into its
`det.arc.note` line.

Domain prose debt is now **264 across 11 modules**, `careerArc.ts` joins the zero list, its
own cap falls 7 → 0 and the global ceiling re-bases to the 264 the inventory line printed.
`proof-careerarc` (58 checks) now asserts the *shape and the numbers* of the evidence —
`vars.peakAge === arc.peakAge`, `vars.peak` equals the rounded modelled peak, the One/Many
arm chosen by the actual count, sources as rows — instead of pattern-matching English it no
longer writes.

Honest caveat, twice earned this session: this change was aborted once (the keys landed
before the code did, and check 18's reachability turned that into a red gate) and, when it
was applied per-file, `tsc` immediately caught the missing `RowText` import. Measured after
this commit: `tsc` 0, build 0, suite **28 scripts / 1364 checks** (proof-i18n **172**,
proof-careerarc **58**), dictionary **1407 keys × 3 locales**. M189's own mutation battery is
queued (#172) rather than claimed.

M190 published `domain/gap.ts` the same way — eight lines, five of them evidence, and two
of those composed a human label into the sentence (`groupLabel(group)`,
`attributeLabel(key)`). Both variables are now named for rowText's code variables, so the
row carries the id and the dictionary supplies the word. That made `groupLabel` dead and it
was removed; its guarantee moved rather than vanished — `proof-gap` now asserts that
`group.ST` reads "Striker" in every locale and that an unknown id prints as the id instead
of as a missing-key string. Ceiling 264 → 256, `gap.ts` joins the zero list. Two mutations
were run: prose back in the module, and a mistyped row key. Both caught — but only after the
new clause was widened to read all four scenarios, because the first draft checked the
populated one alone and reported clean while a sentence sat in the empty-data branch.

M191 and M192 are the same defect twice, on two different rows: a screen printing a domain
table's English `label`. The onboarding position picker captioned its grid "Centre Back" and
"Full Back / Wing Back" to a reader on 简体中文 (`{p.label}`), and every session listed its
drills as "Rondo press-resistance (3v1)" and "Box strikes under fatigue" (`{e.label}`). Both
reach the screen through an interpolated hole, which carries no literal for the raw-UI scan
to measure — the `RowText` blind spot one layer down, at a field read. Both now resolve
through the dictionary by the row's own key. A new clause names the *row*: it reads the
parameter of the map over a label-bearing table and fails on `<param>.label`. Its first
draft searched for the property in any file mentioning the tables and reported PlayerOS as a
false fourth offender (it carries `.label` on a match event, a zone and a film frame); its
second accepted only single-parameter callbacks, so `exercises.map((e, i) => …)` — both real
sites — never matched and the clause passed on a file it had not read. The mutation battery
is what caught the second: only the count-drift clause went red. M191 also removed two dead
imports in PlayerOS (`ATTRIBUTE_DEFS`, `strongestAttributes`).

M192 deliberately does **not** move the ratchet. The drill catalogue's eighteen `label`
fields stay, because they are the English reference the new drift check holds `drill.*`
against — the same reason `domain/attributes.ts` has never reached zero. Keying a render
site is not the same act as keying a model's prose, and the ceiling stays at 256 rather than
banking a number the milestone did not earn. Measured after M192: build 0, proof-i18n
**177/177**, dictionary **1433 keys × 3 locales**.

### M193 — The Film Room, and what "covered" is allowed to mean

Thirty counted literals, the largest single registration since M173, and the last open file
under 40. Most of them are the screen's own voice — the report's three column headings, the
insights grid, both long DEMO disclosures, the focus line that already had a key on its label
and a raw literal on the count beside it. Two were never words: the plural suffixes either
side of a hole in `clip${clips.length === 1 ? "" : "s"}`, which the scan reads as children
and which now come from `film.libraryHintOne/Many` like every other count on the screen.

The file joins the covered set, so the raw-UI ceiling drops **179 → 149** and three screens
are left: Player OS 69, Simulation Lab 51, Data Room 29. The drop is exactly the file's own
debt — nothing else in the tree was touched.

What the scanner cannot see was keyed anyway, because a registered file should mean the
screen speaks the reader's language rather than that it passes:

- the six pipeline stages. `STAGES` held English and the progress line printed from the
  array by position, a shape no literal-based check can see. It now holds codes, the words
  live in `film.stage.*`, and the new space entry holds the dictionary against the array —
  so a seventh stage added to the pipeline fails the suite instead of rendering
  `film.stage.throw_ins` to whoever is waiting on an analysis;
- the four toasts. `toast(` has been scanned since M159; `toast.success(` is not a call
  shape `CALL_NAME` matches, so this screen's "Clip analysed (demo provider)" and three
  more have always been English on every reader. They are keyed here, and the widening is
  recorded as an open hole rather than taken — doing it properly means re-keying four other
  files in the same commit, which is its own milestone;
- the two `ErrorState` messages, whose exact words the Player OS still builds raw.

One derivation was added rather than a second copy: the report panel and the training toast
both show the focus list, so `focusLocal` computes it once. That keeps the `attr.name.${k}`
interpolation site at one, which is what `countDrift` counts — a second one would have needed
a second declaration row.

Five mutations, all caught: an English literal put back into the registered file (covered
set **and** reachability, two red); a zh-TW row deleted (locale parity, plus the new stage
clause naming the key); a seventh stage added to `STAGES` (stage space red); the
`DYN_SITES` declaration removed (undeclared site, plus six unreachable `film.stage.*`
keys); a call site dropping its variables (placeholder clause red, naming the file, the key
and the missing `{n}`).

Measured after M193: `tsc` 0, build 0, suite **28 scripts / 1374 checks** (proof-i18n
**178**), dictionary **1478 keys × 3 locales**.

### M194 — Dates follow the reader, not the browser

Nineteen milestones of i18n made sure every **word** a visitor sees is reachable through a
key. The defect this one closes has no word and no key, which is why none of the checks
before it could have seen it: `toLocaleString()` with nothing inside the parentheses means
"ask the browser", and the app's own language switch has no authority over that answer. A
zh-TW reader who had chosen 繁體中文 in the header still got `9/12/2026` in their training
log, because their machine was configured for English. Nothing was missing from a
dictionary; a formatter was talking to the wrong computer.

The careless-looking spelling was the minority. Ten `toLocale*` lines in nine files went to
the host in three different clothes — bare `d.toLocaleString()` in three of them, five that
passed `undefined` where a locale belongs (and thereby read as a decision), and two that
passed an *array*, `toLocaleTimeString([], { hour: "2-digit", … })`. All four first-argument
shapes — empty, `undefined`, `[]`, `"default"` — mean exactly the same thing to `Intl`, so
the census treats them as one face of one defect, and `[]` is in its refuse list instead of
being the spelling that slips past it.

The fix is a door, not ten edits: `formatDate(locale, value, opts)` in `i18n/format.ts`,
re-exported from `@/i18n`, and the only `new Intl.DateTimeFormat(` in the app. Those ten lines
became twelve call sites across the same nine files, because two of them feed two render spots
each — Football World's fixture and news rows, the entity detail's kickoff line, the Film
Room's added-on date, the History timeline's clock and its day label, the Load page's dated
list, the Profile page's two activity rows, the Dashboard's relative times, the community
feed's month-and-older timestamps, and the footprint line in `domain/footprint.ts`. That last
one is why the door sits in its own module instead of in `i18n/index.tsx`: a domain function
has to be able to format without importing React, so `FootprintInput` gained a `locale` field
the caller must supply. The compiler now enforces the gate's rule, and no new sentence literal
entered the domain to get it.

The census also turned up the faces an argument-shape scan cannot reach:

- **a memo that goes stale.** `LoadPage` built its dated rows in a `useMemo` whose body read
  `locale` while its dependency array was `[load.daily]`. Every word on that screen
  re-rendered on a language switch and the dates kept the previous language until something
  unrelated changed. The gate now refuses any `useMemo` that reads the reader's language
  without naming it in its deps, with a floor (3 such memos among 60+ scans) so the clause
  cannot pass by finding nothing.
- **a locale sourced from the host.** A call *can* pass a locale and still be wrong, by
  passing `navigator.language`. No argument-shape check sees that, so the gate counts the read
  itself: exactly once, in `detectLocale`, which consults the browser only after the reader's
  own stored choice and whose result the header switch overwrites for good — and zero times
  anywhere the app formats a value.
- **hand-built labels.** `${d.getMonth() + 1}/${d.getDate()}` never calls a formatter. Two of
  those constructions are allowed, and they are not display text: they build an ISO-shaped day
  *key* (`domain/history.ts`, and the history page's grouping label), declared by file and
  checked for shape, with the census pinned at exactly two so a third has to be argued.

What is left open is named rather than allowed. Five sites still ask the browser — the Player
OS's three dates, the Data Room's kickoff line, and `data/intelligence.ts:179`, where the
Football AI's own evidence row carries a browser-formatted date; closing that one needs a
locale threaded through the RAG entry point, which is #165's lane. Per-file caps make the debt
immovable. Two exemptions are declared with a proof under each: `components/ui/chart.tsx`'s
`toLocaleString()` really is a series *number* (the clause turns red if that receiver is
`new Date(...)` or is named like an instant, so the list cannot be used to park a date), and
`components/ui/calendar.tsx`'s two sites are permitted only while nothing imports the primitive
— the scan counts importers, so whoever mounts the calendar pays for it. Both exemptions were
removed from the disk at M248, so the rule they were carved out of no longer applies and the
queue items naming them are retired.

Check 33 ships 23 clauses, and the last is the reason the other 22 mean something: it loads
`formatDate` through Vite's SSR module graph — the production function, not a copy — and
asserts that the same instant renders differently per locale
(`en=Sep 12 zh-CN=9月12日 zh-TW=9月12日`) and that a Chinese reader is shown CJK while an
English reader is shown Latin. A regex can approve a shape; only this assertion knows whether
a date reached the reader in the reader's language. Each of the three app locales is also
checked to be an id `Intl` actually resolves, so a typo'd locale key fails instead of silently
falling back.

Fourteen mutations, all caught by the clause written to catch them, with a clean control
run before and after: a new debtor file (footprint gets a `toLocaleDateString` back); a
declared file's debt growing past its cap; the number exemption pointed at `item.kickoffAt`;
the calendar primitive imported into a screen; a literal `"en"` handed to the door; the door
imported from a module that is not the door; a second `new Intl.DateTimeFormat`; a
hand-assembled `getMonth()/getDate()` label; `LoadPage`'s deps reverted to `[load.daily]`;
the door ignoring its locale argument; the door answering English for a Chinese reader; a
wired site dropped back to `String(...)` (the census floor noticed the door was no longer
being called — 11 across 8); `[]` put back into a registered file; and a `navigator.language`
read in the domain.

Then it was confirmed in a browser, which had not been possible since M165: a clean tree
carrying only this milestone's twelve files was built and served on this zh-CN machine, and
with the app set to `en` the fixture dates rendered `Sep 23` with no CJK date mark anywhere on
the page; with the app set to `zh-TW` the same page rendered `9月23日 上午02:00` with no Latin
month name. The browser's own language decided neither — which is the milestone, demonstrated
on the machine whose language used to decide it.

Two locale-shape assumptions the door cannot reach, recorded here rather than left invisible:
`features/football/Details.tsx:473` strips a comma out of a *formatted* value
(`fmtDateTime(…).replace(",", "")`) to make its English spacing look right, and `Dashboard`'s
`relTime` still builds `in 3d` / `3d ago` in English — closing that one needs dictionary keys
in the file another run currently holds.

Measured after M194: `tsc` 0, build 0, suite **28 scripts / 1397 checks** (proof-i18n **201**),
dictionary **1478 keys × 3 locales** — no keys added, because the defect was never a missing
translation.

### M195 — The Football AI's own evidence line speaks the reader's language

M194 closed nine screens and deliberately left one site of its own defect standing, in the
open: `data/intelligence.ts` built the AI answer's fixture row with
`when: new Date(m.kickoff).toLocaleString()`. It was left because it is the only one of the
sites that is not in a component. The retrieval layer has no `t()`, no context and no notion
of a reader — it answers a question and composes the fact rows that the panel then prints —
so asking it for a date shape means threading a language through the entry point, which is a
different change from renaming a call.

That is the whole product edit: `retrieve` and `askIntelligence` now take a **required**
`locale`, `matchFacts` formats the kickoff through `formatDate`, and the chat panel hands
over the live language it already had. The door is now called in **13 sites across 10
files**, and the declared date debt is down from five sites in three files to four in two
(the Player OS's three dates and the Data Room's kickoff line); **7** sites still ask the
browser and every one of them is declared and capped. `locale` is required rather than
optional on purpose: an optional parameter is how a wired seam becomes unwired one call site
at a time without any file a gate watches having to change.

Four clauses read the seam by name instead of trusting its type: every `askIntelligence`
call resolves and passes an answer language, none hard-codes the reader, every one hands
over the live locale, and the entry point's own signature reads `locale: Locale` rather than
`locale?: Locale`. The first run of that census was red for a reason no one had predicted —
it counted the *declaration* `askIntelligence(question: string, locale: Locale)` as a call
site and reported `data/intelligence.ts:292[locale: Locale]` as a violating argument. The
census now skips a name preceded by `function|const|let|var`, and a mutation restores that
skip to `if (false)` to prove the skip is load-bearing rather than decorative.

A required argument still cannot prove the answer *renders* differently, so the AI proof now
asks a real question and reads what came back. Choosing the probe took two corrections worth
keeping. First, provenance: the date must be compared against the kickoff of the record the
**fact row cites**, not the fixture named in the question — a club-named question is
answered with that club's next fixture (M61's citation), and the proof went red on exactly
that difference (`Oct 3` vs the expected `Oct 14`) before it resolved the cited match
through the row's own `to: /matches/<id>` link. Second, falsifiability: the first probe sat
within five days of today, so "not answered with today's date" could not have failed; the
walk now takes scheduled fixtures latest-first and keeps one at least five days out, and
states that distance as its own assertion. What is then asserted, per locale: the same
kickoff is written three different ways; each reader gets their own script (CJK for Chinese,
Latin month for English); the reader's language changes the date's written form **and
nothing else** — every other answer row, every fact row and the confidence are
byte-identical once `when` is nulled; the panel's line interpolates with no bare key or
unfilled placeholder; the row carries the record's own instant, re-formatted by the gate
from the seed data; and a fixture five days out is not answered with today's date.

The milestone also replaced a check that M194 had written badly. Its non-vacuity clause read
`hostSites.length >= 8` — a floor sitting on exactly the quantity the work is trying to
shrink, which goes red the moment the debt is paid, and M195 paid part of it. The scanner
now proves itself on planted samples instead: five ways of asking the host (bare call,
`undefined`, `[]`, `"default"`, `'default'`) must all be caught, and two calls that *do*
name a locale must not be — plus an honest separate clause that the census walked **141**
real source files. In the same pass, check 26's row reader was widened: its `vars: { … }`
pattern could not read a body containing braces, so it silently skipped the multi-line rows
— the very rows whose variables most needed auditing — and reported them as supplying `{}`.
It now reads 192 row keys across 15 files, and refuses to guess at a body it cannot parse
rather than printing "clean" about a shorter list.

Fourteen mutations, each run against the shipped gate, all caught by the clause written to
catch them, with an unmutated control before and after (207/207 and 56/56 both times, plane
byte-identical at the end): the browser-locale call put back (caught twice — by the static
census *and* by the rendered answer); `locale` made optional; a call site hard-coding
`"en"`; a call site dropping the argument; the door ignoring its own locale (again caught
twice); `[]` removed from the census's refuse list; `"locale"` added to it (over-catching is
a defect too); the wrong instant formatted; the brace-blind row reader restored; the
declaration skip removed; a literal `"en"` handed to `matchFacts` *inside* the module —
which compiles clean and passes every static clause, and is caught only by the rendering
check; and a fresh debtor file that never had the problem.

Then it was confirmed in a browser again, on the machine whose own language used to decide:
serving a clean tree carrying only this milestone's files, with the host
`navigator.language` at `zh-CN`, the same question asked at app locale `zh-TW` rendered `開球
10月14日 上午07:00` and at `en` rendered `Kickoff Oct 3, 03:00 AM` / `Oct 14, 07:00 AM`. Console
clean. The walk also caught the one limitation this change leaves, in the honest direction:
switching the app from `zh-TW` to `en` re-rendered every **word** of the earlier answer —
`Fixture —`, `Evidence (6)`, `Confidence 91%` — while its dates stayed `10月14日 上午07:00`,
because a chat answer is stored after formatting and the row's `when` is a finished string.
A stored answer keeps the date shape of the language it was written under. Fixing that means
an instant travelling as a code-valued variable resolved at the read boundary, which is a
mechanism of its own and is recorded rather than papered over.

Measured after M195: `tsc` 0, build 0, suite **28 scripts / 1411 checks** (proof-i18n
**207**, proof-ai-grounding **56**), against a baseline measured the same way on the commit
before this work — **1397**, with proof-i18n **201** and proof-ai-grounding **48** — so +6
and +8 are the only two scripts that moved. Dictionary **1478 keys × 3 locales**, raw-UI
debt **149 across 3 files** and domain prose **256 literals across 10 files**, both at their
ceilings: this milestone changed no copy at all.

### M196 — The Manager OS career model gets its own arithmetic proof

Every milestone up to here had been editing the app's *edges*: what a screen says, how a date is
written, which key a row reads. `domain/career.ts` was the largest module in the repository without a
proof —
586 lines, 33 exports, four panels (live league table, season outlook, next-match preparation,
season retrospective) plus the transfer board's fee ladder — and **five** consumers read the same
numbers out of it (`features/manager/ManagerOS.tsx`, `features/profile/ProfilePage.tsx`,
`features/football/Details.tsx`, `features/community/CommunityHub.tsx` and `data/intelligence.ts`,
which answers a club question with the career's own table row). Nothing had ever run against it.
`scripts/proof-career.mjs` is now that thing: 917 lines, **14 sections, 172 checks**, and its load
bearing assertions are **reconciliations between functions that must agree** rather than isolated
formulas — the prize a fixture credits is recomputed by `seasonSummary`, so the budget and the
retrospective can never disagree; the points a career earned equal the live table's delta over the
seed; the odds the advisor is claimed to be "based on" are rebuilt through `matchProbability` under
the *recommended* tactics **and** asserted not to be the neutral-tactics numbers; every figure
embedded in a rationale or evidence *sentence* equals the field the panel prints beside it.

That last family is where the work paid for itself, and finding it needed a different kind of
probe than the earlier gates used. Sampling `matchPrep` at a handful of hand-written states tests
the hand, not the model, so the gate builds a **reachable grid**: every club, a whole season
fixture by fixture, plus a `rest` and an affordable signing and two slider moves at each stop —
**828** states, with a clause that derives the total from the seed's own fixture counts
(`2 × (rivals per competition)`) and asserts the buy and slide multipliers separately, so the
grid cannot quietly shrink. Fatigue is stepped again at 0.01 (**3939** states) because a real
season moves it by 0.22 and therefore *never holds* the 0.6 the tempo rule reads. Even that only
samples boundaries; a threshold that has *moved* stays green under sampling. So the gate locates
crossings analytically: fatigue is the only continuous knob the advisor reads, a pairing's attack
edge crosses `T` at exactly `(base − T)/4` and its midfield edge crosses `±3` at `(base ∓ 3)/3`,
so each fixture of each real season is probed at ±0.005 around every crossing that lands inside the
unit interval — **170** straddles, with a clause demanding that each of the four thresholds has one
where the model's own recommendation flips. Both of those clauses were written after a hole, not
before one: dropping the all-out mentality threshold from 12 to 10 produced **zero** red under the
grid and the sweep, which is exactly what a sampling-only proof does.

Five defects fell out. (1) The mentality fallthrough printed "Even matchup on paper" for three
clubs whose attack edge was **+4, +8 and +12** — the attacking rule was merely blocked by its own
safe-back-line condition, while the same panel's tempo line called +12 "a clear attacking edge";
the sentence now claims only that no rule fired. (2) The outlook printed `15 pts from 10 career
fixtures` when the live table started from seeded standings and the career had earned **8** of those
15; it now prints both figures. (3) The rationale quoted its edges with `toFixed(0)` while the panel
prints `Math.round`, and the two disagree on a negative half-step — reachable in **41 of the 828**
states, witnessed by a named one: a real Chelsea season rested after its sixth fixture has midfield
edge −5.5, which the row shows as −5 and the old sentence would have called −6. (4) `matchPrep`'s
provenance chip said "your effective squad **+ tactics**" while the advisor deliberately measures
both sides at balanced tactics — the reason it exists, since it is the call that *recommends* the
sliders. The chip now says what is measured, and the old wording is refused by name; a companion
clause proves the distinction is real by taking one club through four slider settings and asserting
the advisor's JSON does not move *while* `clubInput`'s lines do. (5) The module's header comment
promised that "buying a striker lifts the attack line", which is untrue for **26 of the 39** seeded
clubs: the seed slices an eleven-slot `GROUP_PLAN` down to 7–9 slots and always cuts the forwards,
so those clubs' attack line is the club-rating fallback, and for **20** of them that fallback is
higher than any attacker in the dataset — signing the world's best striker *lowers* the printed
number. The comment now says which of the three lines is a squad mean and which is a rating, the
gate pins both populations and proves the state is reachable from `createCareer` with no transfer at
all; the seed itself is fixed in **M197**, because re-shaping 39 squads moves player positions
across the dataset and every affected gate has to be re-derived in its own milestone.

One finding is recorded rather than patched, because the honest fix is a redesign: the `attackEdge <
-4` arm of the mentality chain **can never fire**. The defensive rule is tested first, and an
exhaustive sweep over every seeded pairing in every competition at 21 fatigue levels finds **no**
state below a −4 attack edge that is also inside the +4 defensive edge the earlier rule owns
(the weakest attack edge in the seed, −7.40 at bvb vs fcb, always arrives with a defensive edge
above +4). The gate asserts the arm is dead — `FIRED` measures each of the six quoting sentences and
requires exactly five to fire, each more than 50 times — instead of letting a coverage claim rest on
a rule that has never run. Reordering or dropping it is queued behind M197.

Fourteen mutations, each run against the shipped gate, all caught, with an unmutated control before
and after (172/172 both times): the `toFixed(0)` interpolation put back (4 clauses), the advisor
reading the manager's own tactics (4), the old provenance wording (1), the "Even matchup" sentence
(3), the dead arm moved ahead of the defensive rule (2), mentality `>= 4` → `> 4` (2), the tempo
boundary made inclusive (1), press `>= 3` → `>= 2.5` (4), the all-out threshold to 10 (3) and to 14
(5), an empty attack group averaging zero instead of falling back (11), the tempo rule ignoring a
clear edge (4), the midfield arm losing its sign (7), and a win's morale lift moved from 0.14 to
0.15 (1). Two of those runs taught something the harness had to keep. M2 was caught by a single
clause until the grid gained slider variants — the default tactics are numerically neutral, so a
state built by `createCareer` cannot tell the two readings apart. And M10 did not merely fail an
assertion: with no club left above the raised threshold, my own probe called `matchPrep(undefined)`
and took the whole file down mid-run, which is a red that reports nothing. The probe now returns
false on an absent subject, and the runner's "all green but the process died" case is queued as its
own gap (a script that dies before its tally line is currently indistinguishable from a contract
failure only if you read the exit code, not the count).

Measured after M196 on a clean plane (`git archive HEAD`, this milestone's files copied in): `tsc` 0,
build 0, suite **29 scripts / 1583 checks**, `PASS proof:career (172/172)` — against the same plane
at HEAD alone: `tsc` 0, build 0, **28 / 1411**. So one script and +172 checks moved and nothing else
did. Domain prose is still **256 literals across 10 files** at its ceiling and per-module caps held
(`career.ts` at 29): the fixes were made *inside* existing sentences, which is the only way a copy
change is allowed through that gate. No UI file is in this commit, so the raw-UI ledger (149 across 3
files) and the dictionary (1478 keys × 3 locales) are carried unchanged from M195.

### M197 — The seed stops shipping clubs with no attackers, and the career model's reachable space is re-measured

M196 ended with a product defect it deliberately did not fix: `data/footballSeed.ts` built every club's
squad as the first 7-9 entries of a positional `GROUP_PLAN`, and that plan parked all three attacking
slots (`AM`, `W`, `ST`) at the back — so **26 of the 39** clubs were dealt a squad with no attacker at
all, and `clubInput` answered their attack line with the club's *own rating* instead of a squad mean.
M196 measured what that costs: for 20 of those clubs the fallback is higher than any attacker in the
dataset, so signing the world's best striker *lowers* the number the Manager OS prints. The plan is now
`GK CB CB FB DM CM AM W ST`, read from the front, and `squadSize` is capped by the plan's own length
with the `i % GROUP_PLAN.length` wrap removed — a squad can no longer silently reuse a slot, and every
prefix the seed can be cut to (7, 8 or 9) fields all three lines. The RNG call order is untouched, so the
world's population is the same population: a before/after dump of every player row (a plane-only probe,
not a permanent gate) reports **318 players both ways, 0 added, 0 removed**, with the same ids, names,
ages and nationalities. What moved is **152 position groups** — and because a generated player's
attributes are partly read off the positional template, that re-labelling also moved **18** rows'
`overall`, `value` and `potential`. The gate re-reads the plan **from the seed's source text**, so a
future reorder that parks the attackers behind the cut goes red rather than re-creating the population:
today it reports **39 clubs × 318 players** with the thinnest attacking line holding 1 attacker, counted
a second time straight off the seed rows so the script's own partition cannot make it true. A companion
clause measures *why* the fallback was a lie rather than asserting it: every club's attacking mean now
sits below its own rating, by between **−16.00 and −5.33**, so the old fallback over-reported the attack
line at every club that used it. (`clubInput`'s header comment and M196's write-up both said
"eleven-slot"; the plan had twelve entries — the count is now a number the gate reads instead of one it
restates.)

Re-shaping 39 squads changes the model's reachable space, so everything in the career gate that reads
squad composition had to be re-derived rather than re-run. Two findings moved in opposite directions.
The mentality chain's `attackEdge < -4` arm, which M196 recorded as **structurally dead** (shadowed by
the rule order), is now alive: an exhaustive sweep of every seeded pairing at 21 fatigue levels finds
**645** states below a −4 attack edge that stay inside the +4 defensive edge the earlier rule owns, the
weakest being **−14.00** (val vs rma at fatigue 1.00, arriving with defensive edge 9.75), and a walk of
reachable careers confirms the sentence actually prints — all six quoting sentences now fire
(**34× / 193× / 149× / 85× / 291× / 6×**) where M196 could only prove five. The inflation the fallback
provided was hiding both tails. And the arm the fix *killed* is the one M196 had left open: the
all-out mentality at `attackEdge >= 12` is now unreachable, because the whole pairing × fatigue space
tops out at **+8.50** (rma vs ath at fatigue 0.00) and no state combines that with the `defenseEdge <= 2`
the same rule requires. The gate names that arm as unreachable and asserts the recommendation never
prints, instead of leaving a threshold with no crossing quietly inside the search. Re-scaling the
mentality cuts against the distribution the seed can actually reach — or dropping the dead one — is
queued as its own milestone, because that is a model change, not a measurement.

One clause in this milestone was written *after* it was falsified, which is the part worth recording.
The tempo rule has two arms (`fatigue > 0.6` → 0.35, `attackEdge >= 6` → 0.7) and a bound claimed they
cannot overlap; the arithmetic behind that bound was wrong, and guessing was not going to settle it.
So the gate measures the space directly: every fixture each of the 39 clubs is scheduled to play ×
fatigue in 0.01 steps from 0.61 to 1.00 — **13,440** states scanned — and finds **4** where both arms are
live, the strongest an attack edge of **6.06** at `rma` vs `ath`, fixture 2, fatigue 0.61. The gate
prints that denominator and that witness in the passing check itself. The precedence is then tested at
exactly those states: the fatigue arm must own the recommendation, tempo must read
0.35, the fatigue sentence must print and the high-tempo claim must not. A mutation that swaps the two
arms is caught by that one clause, which is what makes the ordering a tested property rather than an
assumed one; a second clause keeps the census itself from going vacuous by failing if it collects
nothing.

The transfer board is where this milestone found a coverage debt rather than a code defect. `fitFor`
clamps into [5, 99] and returns 0 for a bucket the viewer's profile does not carry, and at HEAD the
ceiling *was* tested — a mutation from 99 to 98 goes red on **3 of its 72** checks, one of them named
"every target in that empty bucket scores the 99 ceiling". That coverage existed only because **26 clubs
shipped an empty attacking bucket**: the test of the ceiling depended on the defect M197 removes. Fixing
the seed therefore deletes the state, and a gate that reaches a boundary through a bug loses the
assertion with the bug. The honest repair is to exercise the module instead of its documentation:
`fitFor` is now exported and the ceiling, the floor and the unknown-bucket branch are each pinned
directly against it — today each of those three edits is caught, by exactly **1** check apiece — while two
seed clauses state positively that no club ships an empty bucket and that every bucket `squadProfile`
answers for carries players. The arithmetic is proven and the reachability is described, rather than one
standing in for the other.

A gate defect surfaced the way these usually do: by not being visible yet. A stale line survived the
census rewrite in `proof-career.mjs`, still reading variables that census no longer builds, and the file
stayed green — the statement it sat inside had stopped running on anything. It announced itself only when
a mutation changed the rows that loop walks, and then not as a red check but as `?/?`: the script died
before it printed a tally. That class is now reproduced rather than recalled: with a throwing statement
planted inside a loop the shipped data never enters, the gate reports **exit 0, 180/180**; making the
loop enter once reports **exit 1 with no tally printed at all** (and the restored file is green again, so
the reproduction left nothing behind). Green therefore certifies the checks that ran, not the file's
health — and whether `?/?` counts as a failure currently depends on reading the exit code instead of the
line, which is the runner gap M196 named and which now has two observed signatures: a script that dies
early, and one that prints a full green tally and still exits non-zero. The campaign scores "ran and went
red", "ran green" and "never reported" as three different verdicts; this milestone's record below
contains no third kind. For the same reason the numbers in this section are all printed by *passing*
checks: a figure that only appears when a clause fails is not part of the record, so the weakest edge, the
mean-vs-rating gap, the club × player census and the overlap denominator moved into their clause names.

Fourteen mutations against the shipped gates, **14 caught / 0 missed / 0 crashed**, with an unmutated
control before and after (career 180/180, transfers 76/76 both times) and every mutated file restored
from an in-memory snapshot and re-hashed: the plan restored to a longer ordering with the attackers
parked behind the 7-slot cut (12 red, and 2 on the transfer board), a plan with no
attacking slot at all (12 + 2), squads cut to 6
slots (11 + 2), `avgOf` averaging 0 instead of falling back (3), a career starting with a non-empty
`moved` map (1), a career starting by releasing all of its own attackers (6), the tempo arms swapped
(1), the all-out cut lowered to +6 (2), the attack line's fatigue coefficient halved (2), the gate's own
`GROUP_PLAN` parse broken (1), the overlap census made unable to collect (1), and `fitFor`'s floor,
ceiling and unknown-bucket answers changed by one each (1 apiece — the three that the transfer board's
own data can no longer reach).

Measured after M197 on a clean plane (`git archive HEAD`, only this milestone's files copied in) against
the same plane at HEAD alone: `tsc` 0, build 0, suite **29 scripts / 1595 checks** with
`PASS proof:career (180/180)` and `PASS proof:transfers (76/76)`, where HEAD is **29 / 1583** at
172 and 72 respectively. So +12 checks across the two gates that read squad composition, and no other
script moved. Two of three suite runs on that plane printed `FAIL proof:projection (42/42 checks)` — an
**all-green tally with a non-zero exit**, caused by Vite's background dep-scan rejecting after the
script has already closed its SSR server and printed its summary (five such `The server is being
restarted or closed` errors sit on that script's stderr even on a passing run). It reproduces under load,
not on its own, and it is unrelated to this milestone's files: it is the M196-queued runner gap showing
up as a second signature — the runner reports `N/N checks` and still calls it a failure, so a flake and a
broken contract are indistinguishable in the line. Fixing the verdict is queued.
Domain prose is still **256 literals across 10 files** at its ceiling, all 12 per-module
caps held, and the raw-UI ledger is still **149 across 3 files** — this commit changes no UI file and
adds no display string; every word added is in a comment or a gate clause name.

**Still outstanding** (deliberately not faked): real data / AI / video providers behind
the existing seams, server-side multi-user persistence and shared community content, a
database designed for millions of rows, long-form i18n of editorial content, and
publishing (this project is intentionally local-only; `sites-hosting` has never been
run).

### M198 — the proof runner learns that "red" and "nobody looked" are different facts

M196 and M197 both ended by naming the same gap: `npm run proof` decided a script's verdict from
its exit code, and printed `?/? checks` for anything that had not printed a tally. The suite had
therefore stopped meaning one thing. Three different events shared one line — a check counted and
found red; a script that died, was killed or never started; and a script that printed every check
green and then exited non-zero anyway. The last one is not hypothetical here: M197's own record
reads `FAIL proof:projection (42/42 checks)`, all 42 of its checks green, because Vite's background
dep-scan rejects after the SSR server has already closed. A gate that calls that a contract failure
teaches you to ignore the gate, and one that calls `exit 0 with nothing counted` a pass is worse.

The verdict logic now lives in `scripts/lib/proofRunner.mjs`, and the runner applies it instead of
recomputing it — so the proof of the classifier cannot pass while the real runner classifies
differently. Three verdicts, eleven stable codes:

| Verdict | Codes |
| --- | --- |
| `PASS` | `green` — a tally was printed, `pass === total > 0`, exit 0, no signal, no error |
| `FAIL` | `checks-failed`, `red-exited-green` — a check was counted and came back red |
| `UNVERIFIED` | `spawn-failed`, `killed-before-tally`, `killed-after-tally`, `no-exit-status`, `no-tally-green-exit`, `no-tally-nonzero-exit`, `zero-checks`, `died-after-green` |

Both non-green kinds still exit 1 — a suite that cannot prove something is not a suite that proved
it — but the line now names which event happened, and the summary reads
`N/M proof scripts proven (P/T checks counted)` so a milestone's suite number comes from the tool
that ran the suite rather than from someone adding up the lines. `0/0 checks passed` is now refused
outright: a proof that checked nothing is not evidence. The runner also takes a directory as
`argv[2]`, which exists so that it can be pointed at fake proofs rather than only at the repo's.

`scripts/proof-runner.mjs` (76 checks) gates that from both ends: a 14-row truth table over the
shapes `spawnSync` can return, a 7-way non-vacuity clause that swaps one input of a green row at a
time and requires PASS to stop, and an end-to-end section that spawns the **real** runner against
temp directories — one directory per signature, so a verdict is attributable to one script. The
fixtures include the shape this milestone was written for: print `5/5 checks passed`, then die
(exit 139 in the wild, a self-`SIGKILL` here), which must read as UNVERIFIED `died-after-green`
while still reporting the 5/5 it managed to print. A mixed directory pins the arithmetic —
1 pass, 1 contract failure, 2 unverified reporting 2+3+2 of 2+5+2 checks — and two more clauses
state which logs get dumped for debugging (every non-green one) and which do not (the passing one).

Three boundaries are written as clauses rather than left as assumptions, because each one is a place
where the gate is *not* stronger than it was:

- **A self-kill is not a signal on Windows.** `process.kill(pid, "SIGKILL")` arrives as `status 1,
  signal null`, so `killed-before-tally`/`killed-after-tally` are currently reachable only through
  the synthesized truth-table rows. The proof measures the fixture's actual signal and says in its
  clause name which case it is in; if the platform starts reporting signals, the clause stops
  describing theory and starts describing the suite.
- **The last-match rule has a real hole.** `tallyOf` reads the *last* tally because a proof is
  allowed to echo output it captured (this file's own fixture dumps do exactly that). A script that
  prints its tally and *then* emits another one is therefore misread — `proof-lateTally.mjs`, planted
  in a temp dir, prints `3/3`, keeps talking, exits 0, and the runner calls it PASS. That shape is
  refused by the second half of the design instead of by the runtime: `proofDiscipline` reads each
  real proof's **source** and requires its last `console.log` to be a tally and its exit to be driven
  by a counter that tally line mentions. Both halves are asserted on the same planted tree, so
  neither rule can be "fixed" without the other noticing.
- **The gate is keyed to the habit, not to one spelling.** All 30 proofs in `scripts/` pass the
  source scan, and their counters are `fail / failed`; a clause requires ≥ 2 distinct counter names,
  because the first version of that check hard-coded `fail` and went red on `proof-m65.mjs`, which
  derives `failed` from a checks array. The same lesson as M196's: enumerate a rule's spellings, not
  one shape.

Sixteen mutations against the shipped runner and classifier, **16 caught / 0 missed / 0 crashed**,
with an unmutated control before and after (career 180/180, transfers 76/76 both times) and every
mutated file restored from an in-memory snapshot and re-hashed. Each is caught by at least one
check, and the count varies with how much of the contract it breaks: PASS ignoring the exit code
(9), exit-0-with-no-tally becoming a pass (9), the suffix that names the code being dropped (10), a
counted red relabelled UNVERIFIED (7), the suite's exit ignoring UNVERIFIED (7), the 0-check refusal
dropped (5), red-but-exited-0 becoming PASS (4), `tallyOf` taking the first match (4), the
spawn-error branch disabled (3), the signal branch disabled (3), `label()` always appending
" checks" (3), a contract failure's log no longer dumped (2), `proofDiscipline` blind to the exit
counter (2), and the three single-check edges — `PROOF_FILE` accepting a `.txt` so discovery would
spawn a notes file, `proofDiscipline` blind to tally position, and the aggregate silently counting
only green rows' tallies (1 apiece).

Measured on a clean plane (`git archive HEAD`, only this milestone's three files copied in):
`tsc` 0, build 0, suite **30/30 proof scripts proven · 1671/1671 checks counted · exit 0**, with
`PASS proof:runner (76/76 checks)` and the previously flaky `proof:projection` reporting its real
42/42. The same plane at HEAD alone is **29 scripts / 1595 checks**, so 1595 + 76 = 1671 and no
other script moved. Domain prose is still **256 literals across 10 files** at its ceiling and the
raw-UI ledger is still **149 across 3 files** — this commit touches no `src/` file and adds no
display string; every word added is in a comment, a gate clause name, or the README.

**Still outstanding** (deliberately not faked): the runner spawns each proof with no timeout, so one
hung script blocks the suite with no line printed, and the `killed-*` codes above have no real
coverage until a platform (or a `spawnSync` timeout) produces one. Both are now the next queued
milestone rather than a footnote, and the queue's first product-side item is unchanged: no reachable
state in the shipped seed can ask for the all-out mentality, so that arm is either re-scaled or
deleted.

### M199 — a hung proof is now a line in the report, not the end of the report

M198's own record ended by naming the one no-evidence case its new codes could not reach: the
runner spawned each proof with no timeout, so a script that hung — a Vite SSR server that never
closes is the plausible local shape — left `spawnSync` waiting forever. The suite printed nothing,
not even a verdict, and had to be killed by hand. That is the same blindness M198 removed, one
level up: a gate that stops producing output is not a gate.

Each script now runs under a time budget, and a stopped script gets its own two codes rather than
falling into `spawn-failed` — "never started" and "ran, printed everything, then hung" are
different faults with different fixes. `UNVERIFIED` therefore has ten codes and the classifier
thirteen in total (`PASS`'s `green`, `FAIL`'s `checks-failed` and `red-exited-green`, and
`timed-out` / `timed-out-after-tally` alongside the eight from M198). A hung script that *had*
printed keeps its numbers: the line reads `UNVERIFIED proof:x (42/42 checks) [timed-out-after-tally]`,
because the evidence it produced is real even though its exit is not.

The default is measured, not guessed: walking all thirty proofs one at a time on an idle machine,
the slowest took **24.9 s** (`proof-runner.mjs` itself), then 11.9 s (`i18n`) and 8.9 s (`career`),
so ten minutes is roughly 24× the slowest real script while still being a finite wait.
`PROOF_TIMEOUT_MS` overrides it — not a tuning knob for people, a seam so the proof can watch a
timeout fire in 1.5 seconds instead of waiting in the dark for the real budget.

`scripts/proof-runner.mjs` grew 76 → **89 checks**. Two fixtures sleep for twenty seconds and are
only ever run under the override: the runner must give up in about 1.7 s (printed in the clause
name) while the script still has ~18.5 s of sleep left, still dump that script's log for
debugging, exit 1, and — the clause that keeps the fix from becoming the bug — leave a script
which finishes inside its budget reading as `PASS [green]`. The budget's *default* is gated by
reading the constant out of the shipped runner, since nobody would wait ten minutes to test it:
`Number(process.env.PROOF_TIMEOUT_MS) || 600_000` is the only thing standing between this suite
and `timeout: NaN`, which makes `spawnSync` refuse to start a single script.

A clause the milestone added by accident, then kept: the truth table and the classifier are two
lists of codes, and either can drift alone. The proof now reads the code literals out of the
module's source and requires every shipped code to appear in the table and no table row to name a
code nothing emits. Writing it caught a real inconsistency immediately — `killed-after-tally` and
`killed-before-tally` were computed inside one `at(...)` call, so the census could not see them —
which is why every code in the classifier is now a literal in the second argument of an `at()`, a
spelling the file comments state as a requirement rather than a style choice.

Twenty-two mutations, **22 caught / 0 missed / 0 crashed / 0 invalid needles / 0 restore
failures**, controls green before and after (career 180/180, transfers 76/76). Six are new
(`timed-out` branch removed → 6 red; a stopped script reading as PASS → 4; the runner no longer
arming a budget → 6, caught because the fixture ran its full 20 s; `PROOF_TIMEOUT_MS` ignored → 7;
the two killed codes collapsed into one → 2, one of them the census; a shipped code renamed → 3,
also the census). The earlier sixteen were **re-run rather than cited**, because this milestone
restructured the classifier's signal branch and added two codes — a record from before a change to
the thing being measured is not evidence about after it.

Measured on a clean plane (`git archive HEAD`, only this milestone's three files copied in):
`tsc` 0, build 0, **1684/1684 checks counted**, two of three suite runs at `30/30 proof scripts
proven · exit 0`. The third printed `UNVERIFIED proof:projection (42/42 checks) [died-after-green]
printed all 42 checks green and still exited 3221225477` — Vite's dep-scan access violation, the
same event M197 had to describe from a log, appearing here as a sentence that says what happened.
Under the pre-M198 runner that run read `FAIL proof:projection (42/42)`, which is a claim that a
contract broke. HEAD-alone control is **29 scripts / 1595 checks**, and 1595 + 89 = 1684. Domain
prose is still **256 literals across 10 files** and the raw-UI ledger **149 across 3 files** — no
`src/` file is touched; every word added is a comment, a clause name, or this README.

**Still outstanding** (deliberately not faked): the dep-scan death itself is a Vite-side flake the
runner can now *name* but not prevent, so a red `npm run proof` may still mean "nothing is broken,
one script crashed" — re-run before believing it, and the line tells you which one it was. On the
product side the first item is unchanged and now queued ahead of everything: no reachable state in
the shipped seed can ask for the all-out mentality, so that arm is either re-scaled to a number the
space actually crosses or deleted.

### M200 — the all-out recommendation had to be able to happen

M197 left one honest loose end in the Manager OS advice panel: `matchPrep` recommends `+2`
("All-out") only when the attack edge reaches **+12**, and its own reachability census measured the
whole pairing × fatigue space topping out at **+8.50**. The arm was not rare, it was structurally
dead — a sentence the product could never say, a slider position the advisor would never ask for,
and a `FIRED`-style census that could only ever describe the other rules. Leaving it would have made
the panel's own documentation a claim about a situation that does not occur.

The cut is now **+7**, chosen from measured numbers rather than from taste: +4 is already the
"attacking" step and +8.50 is the ceiling, so a cut at 7 keeps the two attacking steps distinct and
leaves the all-out band genuinely reachable — **13 of the 3,528** seeded pairing × fatigue states,
i.e. the lopsided fixtures where it should fire (`rma` vs `ath` at zero fatigue, attack edge +8.50
with the defensive edge at −5.00). That headroom survives a transfer window: the same sweep with
data's three strongest attackers handed to one club tops out at **+9.07**, and eleven of them at
+8.96, so +12 was unreachable even optimistically while +7 is a real but narrow band.

What changed in the gate is bigger than the number. The mentality census is now **per arm**:
`+2 ×13 / +1 ×171 / 0 ×1844 / −1 ×1500` of the 3,528 states, and every arm the chain can emit must
have at least one reachable state, with the all-out band described by its own strongest witness so
the clause cannot pass on a technicality. The one asymmetry the model keeps is named rather than
glossed: the chain has two attacking steps and one defensive one, so **−2 is never a recommendation**
(0 of 3,528 states would ask for it) even though the slider offers it — a modelling choice, recorded
where a future reader will notice it. `matchPrep` is also asserted to print the all-out sentence for
at least one *played* career state, not merely to define it.

The threshold probes got the same treatment M196 earned, and then some. Fatigue is the only
continuous input the advisor reads, and its effect is linear (attack edge −4 per unit, defensive
exposure +3, midfield −3), so every threshold has an exact crossing fatigue and each one is straddled
at ±0.005. The thresholds are now **read out of the shipped module** instead of typed a second time
in the proof — `attacking=4, safeBackLine=2, allOut=7, exposed=4, weaker=−4, pressHigh=3,
pressLow=−3` — which takes the search from four boundaries to six and the straddles from 170 to
**322** over 39 real seasons, each of the six with at least one probe where the model's own
recommendation flips. A separate clause requires those parsed numbers to match the values the gate
models by hand, so when a threshold eventually moves, the failure says "re-derive the reachability
census", not "bump the constant".

Nine mutations, **9 caught / 0 missed / 0 crashed**, unmutated controls green before and after
(career 183/183, transfers 76/76). Restoring the dead +12 cut is caught by **4** checks; lowering it
to +4 so the two attacking steps collapse is **6**; nudging it to **+9**, which is the mutation worth
naming because it looks perfectly reasonable and is one point above the reachable ceiling, is **4**;
loosening the safe-back-line guard to +5 is **1**; making the exposed-defence arm recommend nothing
is **5**; turning every safe attacking state all-out is **8**; pushing the weaker-side cut to −14, out
of the band, is **8**. Two break the gate's own readers rather than the model, which is how those
readers are shown to have teeth: a threshold regex that no longer matches (3 red, the parse and the
census both refuse) and an arm census that files `+2` under another arm (1 red — the liveness clause
alone, which is exactly the claim it exists to make).

Measured on a clean plane (`git archive HEAD`, only this milestone's files copied in): `tsc` 0,
build 0, suite **30/30 proof scripts proven · 1687/1687 checks counted · exit 0**, against the same
plane at HEAD alone (M199) at **1684** — `proof-career` 180 → **183** and nothing else moved.
`proof:projection` printed its real 42/42 this time. Domain prose is still **256 literals across 10
files** with the career module's cap at 29 (no rationale sentence was added — the wording already
existed, it just could never fire), and the raw-UI ledger is still **149 across 3 files**.

**Still outstanding** (deliberately not faked): the one-defensive-step asymmetry above is a model
choice, not a bug, and making it symmetric would add prose the ratchet has to carry; the dep-scan
`died-after-green` flake on `proof:projection` is named by the runner but not prevented; and the
older queue is unchanged — the Football AI's composed sentences (#184+), the demo coach's prose
(#160), the populated-state browser walk (#142), the two `components/ui/calendar.tsx` sites the day
anything mounts them (that component was removed from the disk at M248, so the item is retired), and `community.ts` / `filmLibrary.ts`, which still have no proof of their own.

### M201 — a rendered date was being edited on the way to the screen

M194 put every instant behind one door that takes the reader's locale, and its gate learned to
refuse the ways a screen can bypass that door. What it could not see was the call that obeys the
door and then **edits what came back**: a scheduled fixture on the match list rendered
`fmtDateTime(locale, mm.kickoff).replace(",", "")`. The call passes the reader's locale, so all of
check 33's argument-shape scans read it as clean. It is the app deciding the reader's format a
second time, downstream of the thing whose whole job is to decide it once.

Measured through the shipped door with that row's own options, the comma is
`en=Sep 12, 04:30 PM` against `zh-CN=9月12日 16:30` and `zh-TW=9月12日 下午04:30` — it exists in
exactly one of the three locales, so the "cosmetic" strip is an English-shaped edit that silently
does nothing for both Chinese readers, and it made the same instant read differently on a row and
on the detail page beside it. The fix is one deleted call: the row now renders what the door
returned, like every other site.

The gate is the larger half, because the hole is general. A scan of the call text is not enough —
an argument can contain parentheses (`formatDate(l, new Date(x)).toUpperCase()`) and the rewrite can
be laundered through a local (`const when = fmtDateTime(l, x); return when.replace(",", "")`) — so
the census walks each door call to its matching close paren and asks what comes next. The door's
per-file aliases are **derived**, not listed: any `const fmt… = (…) => formatDate(…)` in app source
joins the walked set, which today finds 3 aliases beside the door itself, across 13 door call sites.
Four clauses then refuse the shape (direct chain, alias chain, laundered local, and a named check
that the row in question is clean), and — the rule M194 earned, because a census that has never
been seen to refuse proves nothing — a self-test plants all four spellings and three legal uses and
requires 4 caught, 0 false positives.

Four mutations, **4 caught / 0 missed**, controls green before and after (career 183/183, transfers
76/76). Restoring the stripped comma is caught by **2** checks (the census and the named row); the
laundered-local variant by **1**, which is the clause written for it and the reason the holder scan
exists; emptying the method list, and deleting the alias derivation, are each caught by the
self-test **1** apiece — the two gate-side cases are what show the census is doing the work rather
than agreeing with the tree.

Measured on a clean plane (`git archive HEAD`, only this milestone's two files copied in): `tsc` 0,
build 0, suite **30/30 proof scripts proven · 1694/1694 checks counted · exit 0**, with
`proof:i18n` 207 → **214** and nothing else moving; the plane's first run came back
`29/30 · 1 UNVERIFIED [died-after-green] exited 3221225477` on `proof:matchprobability` — Vite's
dep-scan crash again, a different script this time, named rather than mislabelled as a broken
contract, and clean on the re-run printed above. The raw-UI ledger is still **149 across 3 files**
and domain prose **256 across 10 files**; the dictionary is unchanged at **1478 keys × 3**, so
nothing about this fix depends on a new string.

**Still outstanding** (deliberately not faked): the census sees a method applied to the call or to
a local that holds it; it does not follow a formatted value through a second assignment or into a
returned object, and that limit is stated here rather than left for a future reader to discover.
The dep-scan `died-after-green` flake is named, not prevented. Browser verification of the row's
width in `en` was not possible (the in-app window still cannot render a tree here), so the change is
verified at the string level through the door and at the source level by the census, not visually.
The older queue is unchanged — #142 populated-state walk, #160 demo-coach prose, #184+ AI composed
sentences, the two `components/ui/calendar.tsx` sites (that component was removed from the disk
at M248, so the item is retired), and `community.ts` / `filmLibrary.ts`, which
still have no proof of their own.

### M202 — the clip library's "never crashes a page" promise, tested for the first time

`domain/filmLibrary.ts` is read by four screens (Film Room, Dashboard, Achievements, Learn hub) and
narrowed into the cross-clip analysis, and it had never had a proof of its own. Its doc comment
makes a promise — "a corrupt or legacy entry is skipped, never crashes a page" — and the promise was
false in the first paragraph of the code.

The parse validated the clip, its two strings, and that `report.events` **is an array**. It never
looked inside the array. So an entry like `{"clipId":"c","addedAt":"…","report":{"events":[null]}}`
— exactly the kind of thing a half-written localStorage slot, an older build, or a hand-edited
export/import can contain — passed the "defensive" parse, and the very next thing every reader does
is `toClipInputs`, which reads `e.kind`: **`Cannot read properties of null (reading 'kind')`**, thrown
from inside the page render. The guard that existed to stop a crash was the thing letting it through.
It now checks every element (`!!e && typeof e === "object" && typeof e.kind === "string"`) and skips
the entry with the rest, so a corrupt clip costs the reader one clip and not a screen.

The second defect was quieter. `toClipInputs` handed `recommendedFocus` over **by reference**, so a
caller that pushed a suggestion into its own row edited the stored clip too — the library summary and
the clip panel read the same array, and the mutation would be persisted on the next save. The rows
are copies now, which the proof verifies by editing a derived row and re-reading the source.

`scripts/proof-filmlibrary.mjs` (**30 checks**) pins the module from both ends, in the shape the
project's other model proofs use: a **25-shape acceptance table** (4 shapes kept, 21 refused, each
named, including the 8 malformed-event shapes that used to survive); a property clause that runs
`toClipInputs(parseFilmClips(x))` over every one of those 25 raw inputs and requires no exception —
the doc comment as an executable claim; the narrowing's fields, fallbacks (`0`, `[]`), order and
purity; `newestClipAt` over empty, absent and mixed-format stamps; a `localStorage` round-trip
through a stub, including corrupt JSON, an object where an array belongs, an absent key, a partial
list that must lose only its bad entries, and a store whose `getItem`/`setItem` throw; and
provenance — the provider's own `analyze()` report (11 events) must survive the parse untouched, and
the key the module reads has to be the one the local-data registry declares (11 keys, `activity`,
`set.key.film`).

Five mutations, **5 caught / 0 missed**, controls green before and after (career 183/183, transfers
76/76): the element check removed (the shipped defect, 3 red), the check kept but no longer requiring
a `kind` (1 red), `every` relaxed to `some` (2 red — which also catches that a clip with an **empty**
events array is legitimate and must stay accepted), the focus array aliased again (1 red), and the
case worth naming: a validator made to refuse **everything** is caught by **5** checks, because a
table that only ever shows "corrupt input is skipped" proves nothing unless the same table can see a
good input being kept.

Measured on a clean plane (`git archive HEAD`, only this milestone's two files copied in): `tsc` 0,
build 0, **1724/1724 checks counted** across 31 proof scripts — and this is the first milestone whose
suite numbers are not one line: three consecutive runs on that plane came back **30/31, 29/31 and
31/31 proven**, every shortfall being `UNVERIFIED … [died-after-green] exited 3221225477` on
different scripts (never a counted red, `0 contract failure(s)` each time). That is Vite's background
dep-scan crashing after the proof has already printed its full tally; the runner now says so instead
of calling it a broken contract, but the crash itself is the next thing worth attacking, and it is
queued as its own milestone. Raw-UI ledger unchanged at **149 across 3 files**; domain prose still
**256 literals across 10 files** (the film module's comments grew, its strings did not); dictionary
**1478 × 3**.

**Still outstanding** (deliberately not faked): the dep-scan crash is named and survived but not
prevented, and a run of the suite may need a second attempt to print 31/31 — the honest reading is
`checks counted` plus the `unverified` line, not the exit code alone. `domain/community.ts` (205
lines) was the last substantial module without a proof, and `proof-community` loads it now. The rest of the queue is unchanged — #142
populated-state walk, #160 demo-coach prose, #184+ AI composed sentences, the two
`components/ui/calendar.tsx` sites (that component was removed from the disk at M248, so the
item is retired), PlayerOS/DataRoom browser dates held by the concurrent session.

### M203 — one more attempt, but only where there was no evidence

M198 made a death readable and M199 made a hang finite. The remaining dishonesty in
`npm run proof` was statistical: Vite's dependency scan kills a proof *after* it has printed a
complete, all-green tally, and it does so at random. Measured on a clean plane by running the same
six proofs back to back, 2 of 48 runs died that way — `proof:projection` with exit `0xC0000409`
and `proof:matchprobability` with `0xC0000005` — which for a 31-script suite predicts roughly one
false red per run, and is exactly what M202's three plane runs showed (30/31, 29/31, 31/31, every
shortfall an `UNVERIFIED`, never a counted red).

So the runner now re-runs a script **once**, and only when the first attempt produced no evidence.
A `PASS` is not re-run (its evidence already exists) and a `FAIL` is never re-run — the whole point
of M198 was that a counted red is a fact about the product, and a policy that let it flake away
would trade an annoying red for a lie. When a retry happens the line says which case it was
(`(recovered on attempt 2)` on the row, plus a summary line naming every script that needed one),
so a suite that is quietly flaking reports that instead of hiding it.

The crash itself was **not** fixed, and the README says so rather than implying otherwise. The
candidate was disabling Vite's dependency discovery in the proof servers (`optimizeDeps.noDiscovery`)
— applied to all 30 proof scripts on a plane, 72 runs, zero crashes; but the control that followed,
the *unpatched* tree run the same way, also produced 72 clean runs, and a repeat of the original
config before that had produced the 2. The A/B/A therefore cannot separate the patch from the
machine's mood, and the patch was dropped rather than shipped on a result that measured nothing.
Preventing the crash is still open; what is no longer open is whether one has to be believed.

`scripts/proof-runner.mjs` grew 89 → **97 checks**, and every claim is counted rather than read off
the console: each fixture appends a line to a marker file per process, so "was it retried?" is a
number from disk. A script that dies on its first run and passes on its second is reported
`PASS [green] (recovered on attempt 2)`, exits the suite 0, and contributes its 2 checks **once** to
the aggregate — the clause that catches double-counting, which is the failure mode a naive retry
loop has. A script that dies every time stays `UNVERIFIED [died-after-green] (2 attempts, no
evidence either time)`, keeps the suite red, and is named by `1 script(s) needed a retry: always×1`.
The counted red ran exactly once, the green ran exactly once, and `PROOF_ATTEMPTS=1` — the seam that
lets those two be distinguished from a policy that never retries anything — gives no second try.
The default is read out of the shipped runner (a clause requires 2 ≤ attempts ≤ 3), the same
technique M199 used for the time budget.

Twenty-eight mutations, **28 caught / 0 missed / 0 crashed**, controls green before and after. Six
are new — a counted red allowed to retry (1 red: the run counter), the policy disabled (4), a `PASS`
also re-run (2), the retry not named in the summary (1), `PROOF_ATTEMPTS` ignored (2), the per-line
note dropped (2) — and the earlier twenty-two (M198's verdict table, M199's budget) were **re-run
rather than cited**, because this milestone changed the loop that carries them and the runner's line
format, which the proof's parser has to keep up with.

Measured on a clean plane (`git archive HEAD`, only this milestone's files copied in): `tsc` 0,
build 0, **31/31 proof scripts proven · 1732/1732 checks counted · exit 0**, and that run needed no
retry at all — the honest reading of a green suite. HEAD-alone (M202's plane) counted 1724, and
1724 + 8 = 1732. Ledgers unchanged: raw-UI **149 across 3 files**, domain prose **256 across 10
files**, dictionary **1478 × 3** — no `src/` file and no display string in this commit.

**Still outstanding** (definitively not faked): the dep-scan crash is unrepaired — the retry hides
one occurrence per script per run, and a script that dies twice still shows as `UNVERIFIED`, which
is the correct answer and still requires a re-run to distinguish from a real hang. `community.ts`
(205 lines) was the last substantial domain module without a proof, and `proof-community` loads it now.

### M204 — the community board's honesty claims, gated, and one of them was false

`domain/community.ts` was the largest domain module without a proof when this milestone ran —
`proof-community` loads it now — and its header carries
three claims: thread topics are derived deterministically from the real dataset; authors and replies
are generated sample content, flagged as such, and "sample posts never claim likes"; and the
discussion starters are "assembled ONLY from numbers the user's own pillars actually produced". The
first and second held. The third did not, in one reachable case.

The training starter said **"Most of my work is X (n of m sessions)"** whatever `n` was. The
Community hub hands over the most frequent focus attribute of the visitor's completed sessions and
how many sessions hit it — and five completed sessions with five different focus attributes gives
`1 of 5`, which the sentence then describes as most of the work. The wording now follows the ratio:
a strict majority says *most of my work is*, anything less says *my most-used focus is*, and the arm
is withheld entirely when the count is missing, rather than printing "undefined of 5 sessions" —
the same "no record, no draft" rule the other three arms already followed.

`scripts/proof-community.mjs` (**43 checks**) pins the whole module, recomputing every figure from
the source the module itself reads rather than copying its output:

- **4 threads from the title races, 4 from the news feed.** Each race thread must name the real top
  two of its competition and quote both point totals; each news thread must copy its item's title,
  map `Rumor` to the `Rumours` tag, carry the article's own `publishedAt` (no invented timestamp),
  open with the article's summary and quote `Source credibility is N%` computed from the item's own
  number.
- **8 threads, 19 comments, all flagged.** Every thread `seeded`, every comment `sample`, every
  `likes` zero; authors drawn only from the 10-handle bank; every reply a string that is verifiably
  in one of the two opinion banks — read out of the module's source, not retyped, so a reply invented
  downstream is caught — with 8 questions and 11 opinions actually used so neither bank check is
  satisfied by the other; ids unique; 1–4 replies per thread.
- Determinism is asserted as "everything except the wall-clock stamps agrees", because `ago()` calls
  `Date.now()` and pretending otherwise would be a false claim of its own.
- The starters: order and `limit`, each arm's admission rule measured at the boundary and one step
  each side of it (`1-1-0=2: held back · 1-1-1=3: offered`), the plural forms driven by the count,
  `avgRating: null` reported as "no self-ratings yet" rather than as a rating, every number in an
  evidence row present in the draft that cites it (11 rows across 4 drafts), and the record-feeling
  word switching at 1.8 and 1.2 measured on both sides of both — `2.4→ahead 1.8→ahead 1.79→in
  1.2→in 1.19→behind 0.4→behind`.

Ten mutations, **10 caught / 0 missed**, controls green before and after (career 183/183, transfers
76/76): the majority test removed (2 red — the shipped defect restored), a "majority" redefined as a
third (1), the 3-game and 2-session admissions relaxed (1 each), sample replies claiming likes (1),
sample replies no longer flagged (1), a news thread inventing its own timestamp (2), the academy
plural fixed to always-plural (1), the focus arm's count requirement dropped (1) — and one against
the gate itself, a broken bank reader, caught by **4** checks because the lists it enforces are the
ones it parsed.

Measured on a clean plane (`git archive HEAD`, only this milestone's files copied in): `tsc` 0,
build 0, suite **32/32 proof scripts proven · 1775/1775 checks counted · exit 0** against the M203
plane's 1732 — `proof-community`'s 43, nothing else moving, and this time no script needed the
retry M203 added. Domain prose is still **256 literals across 10 files** with `community.ts` at its
cap of 36: the fix reworded an existing sentence and added a guard, not copy. No file under
`src`-side display paths is touched, so the raw-UI ledger does not move either — and note the
ceiling there is 149 while the tree currently reports **58 across 2 files**, because the concurrent
session's in-flight work has been paying that debt down; the number belongs to them, not to this
commit, which is why it is quoted as measured rather than as a milestone result.

**Still outstanding** (deliberately not faked): a visitor's own post, once written, is stored with
`likes` they can add to, which is fine, but the board still has no server behind it.

### M205 — the profile's cross-mode record had never been read by a gate

A census was run before this milestone was chosen: of the app's own modules
(`domain/`, `lib/`, `i18n/`), **7 are loaded by no proof at all** — `domain/footprint.ts` (187 lines)
first among them, then `lib/router.tsx` (105), `lib/hooks.ts` (92), `lib/rng.ts` (62),
`lib/theme.tsx` (61), `i18n/format.ts` (21, exercised through the door's re-export so effectively
covered) and `lib/utils.ts` (7). `footprint.ts` is the module the profile's "your record across the
three modes" panel is built from, and nothing had ever executed it.

Its header makes three claims, and the new proof reads them as its spec: real counts, real
last-activity timestamps, and an honest "not started" for a pillar the visitor has never used
**rather than quietly hiding it** — plus "Pure: every input is passed in, no IO".
`scripts/proof-footprint.mjs` (**34 checks**) asserts all of it against recomputed expectations
rather than captured output: all four rows always present, in a fixed order, each with a label, a
real route and at least one line; a zeroed visitor gets a not-started sentence on every card;
`pillarsTouched` agrees with the rows it summarises; two calls on the same input are byte-identical
and the input object is untouched; every count word is checked **at 1 and at 2**
(session/goal/lesson/fixture/clip/player/post/reply — 16 forms, including the irregular
`reply`/`replies`); minutes round to one decimal on the card and the total is the same rounding of
the sum; a career that has played no fixture says so and counts as inactive; the table row needs
**both** position and club count to print; the detection line needs both detections and
scans-per-minute; mean confidence appears only when there is one; a repeated coaching focus is named
through `attributeLabel`, never as a raw key; an unparseable or empty stamp is dropped instead of
becoming "most recent activity"; the last-activity line is written in the reader's language — the
same input under `en` and `zh-CN` produces different text, through the door, for every app locale;
and `sources` names only the on-device stores, with no wording that implies a network.

No defect was found this time, and that is reported as plainly as the others: the module's claims
held under five targeted mutations — un-rounding minutes (1 check), `later()` sorting ascending so
the oldest date became "most recent activity" (3), counting a never-played career as an active
pillar (1), replacing the four not-started sentences with an empty line list (2), and keeping an
unparseable timestamp (1). What this milestone adds is the gate, not a fix — which is the point of
covering a module before someone edits it rather than after.

Measured on a clean plane (`git archive HEAD`, only this milestone's file copied in): `tsc` 0 errors,
build 0, suite **33/33 proof scripts proven — 1809/1809 checks counted — exit 0, and the headline of that run is M203 earning its keep: `1 script(s) needed a retry: projection×1`. Vite's dep-scan killed `proof:projection` after its 42/42 tally, the retry ran it again, it finished, and the suite reported 33/33 rather than the false 32/33 that M202 had to describe as a caveat. Domain prose stays **256 literals across 10 files** and the raw-UI ledger
is untouched, because no display file and no copy changed.

**Still outstanding** (deliberately not faked): there is still no gate that refuses a *new* module
nothing loads — the census above is a measurement in a scratch file, not a ratchet, and turning it
into one is the obvious next step. Everything else this block charged has since closed: `proof-rng`
loads `lib/rng.ts` and asserts its own determinism, `proof-router` loads `lib/router.tsx`, and
`proof-storage` loads `lib/hooks.ts` and `lib/theme.tsx`, so the React-side libs are exercised after
all — a DOM turned out not to be the obstacle they were assumed to be. M368 struck the four charges
and replaced them with the clause below.

### M206 — the coverage gap is now a ratchet, not a scratch file

M205 measured which app modules no proof loads and wrote the answer in a `dev/` probe, where it
would have gone stale the first time someone added a module. `scripts/proof-coverage.mjs`
(**15 checks**) makes the same measurement a gate: the population is every file in `domain/`, `lib/`
and `i18n/`; a module is **reached** if some proof `ssrLoadModule`s it, or if it is imported by
value — not merely by type — by a reached module; anything else has to be listed in `EXEMPT`, keyed
by its path with a reason and a line count, and the list is checked in both directions: nothing
unreached may be missing from it, and nothing in it may have quietly become reachable.

Measured on the current tree: **34 proofs** load 39 modules directly, which reaches **35 of the 39**
app modules (`domain` 31, `lib` 5, `i18n` 3). Four remain exempt, 265 lines between them:
`lib/router.tsx` (105), `lib/hooks.ts` (92), `lib/theme.tsx` (61) — all three need a DOM this
harness does not have — and `lib/utils.ts` (7), a single `cn` wrapper with no logic to pin. Every
`domain/` module is now covered, which is what M202 (film library), M204 (community) and M205
(footprint) were building toward.

The resolver is tested on synthetic graphs as well as on the repo, because a gate whose only
evidence is "clean" has never been seen to refuse anything: a two-hop value chain reaches all three
files; a `import type` edge must **not**; a side-effect `import "./x"` and a dynamic
`await import("x")` both must; `@/` aliases and `../` relatives resolve while a bare package name
(`react`) resolves to nothing; and a module nobody loads is named as undeclared the moment it is
added to the population.

Four mutations, **4 caught / 0 missed**: a type-only import counted as execution (1 red), the declared exemptions not being honoured (2), dynamic imports dropped (1), and an exemption added for a module a proof does load (5 reds, among them the 330-line ceiling biting at 452). The last had to be applied and restored by hand rather than through the campaign runner, because that run aborted when an — unrelated control — proof died mid-run on a loaded machine: the gate under test never got the mutation, so the claim was re-made in isolation rather than carried over from a crashed batch.

Clean plane (`git archive HEAD`, only this milestone's file copied in): `tsc` 0 errors, build 0,
suite **34/34 proof scripts proven — 1824/1824 checks counted — exit 0**. The next sentence is not a footnote about that number: a second run of the same plane printed 33/34 — 1775 counted — 0 contract failures — 1 unverified, and an earlier attempt in the same window saw three scripts need a retry (`feedranking×1, m65×1, projection×1`) with one of them dying twice over before printing any tally. That is a loaded machine, not a loaded repo — a concurrent session was building at the time — and it is the reason the suite is reported as runs rather than as one figure: `M scripts proven / N unverified` is the reading, and a green-looking exit needs the counted total beside it..

**Still outstanding** (deliberately not faked): `data/` is outside the population on purpose — it is
data, and M197 already showed that seeding changes need re-derivation rather than a new gate. The
exemption list is down to **one** entry: `src/main.tsx` remains the one module no proof can load,
because `createRoot` needs a DOM node, so `proof-screens` loads the App it mounts instead. The other
three modules this block charged — `lib/rng.ts`, `lib/hooks.ts` and `lib/theme.tsx` — were being
loaded by proofs before M368 read the claim, which is the whole reason the clause in `proof-coverage`
exists now.

### M207 — the Player OS speaks the reader's locale

A concurrent session had this screen half-landed: the call sites were wired and the English keys
existed, but 6 keys were missing from 简体中文, 79 from 繁體中文, and every one of the 79 was also
reported as a placeholder mismatch, because an absent key reads as a value with no variables in it.
This milestone finished it rather than restarting it — 82 keys written into zh-TW, 10 into zh-CN,
and one English sentence (`No training load yet`) that two keys now both carried: the Player OS's
empty state simply asked for `ld.emptyTitle`, which Load & Recovery has used since, and
`player.noTrainingLoad` was deleted from all three locales instead of being given a third
translation.

Four things the scanner had been counting as debt and were not translation gaps, and what each
cost: `OVR` and `ACWR` — two abbreviations whose keys already existed in this dictionary and which
this file simply was not using (the `Lv {n}` badge was the same story, three lines down); a coach
prompt placeholder; a session summary written as three literals the scan can only read as fragments
(`{min}′`, `· intensity {r}/5`, `{n} blocks`) and a ` · Today` glued onto a title with `+`, both of
which are why the sentence has to be keyed whole; and `demo-coach-v1`, a provider id that is data,
hoisted to a module constant the same way the date option bags were at M164/M170. What was left
after that is **0 raw-UI hits**, so the file is registered in `RAW_COVERED` (now **38 files**) and
the ceiling went **149 → 80** — exactly this file's own debt, 7 of 87, with nothing else in the tree
touched. Two files remain and they are the two the arc has left: Simulation Lab (51) and Data Room
(29).

One gate was red before this milestone and is red for a reason worth naming: `tsc` refused
`player.goals` twice over, because the in-flight work added a key the Goals tab has had since M156.
Both call sites were right to want a word — the tab means targets, the match-log form means goals
scored — so the form got its own `player.statGoals` (进球/進球) and the duplicate was deleted rather
than silenced. The dynamic-site declaration for `attr.name.${k}` was also one short (2 declared, 3
live), which the count check had been reporting since the third call site was written.

Four mutations, **4 caught / 0 missed**: an English `OVR` put back (2 reds at once — the covered
set names the file *and* the key it displaced stops being reachable), one zh-TW key deleted (parity),
`{n}` dropped from a translated placeholder, and one `DYN_SITES` entry removed (the count drift
message reads `(2 vs 3)`). Build clean, suite **33/33 proof scripts — 1727 checks**.

**Provenance** (kept, and not an outstanding charge): this milestone was landed on a worktree another
session was writing to, so its `player.*` dictionary keys and call sites are this commit's content
too — the provenance is a takeover, not a solo author.


### M208 — the Data Room speaks the reader's language, and the last fixture date goes through the door

The Data Room's 29 were the most mixed of the three big screens. Seven table headers, of which the
scan could see exactly one: `P`/`W`/`D`/`L`/`GD` sit below its three-letter floor and only `PTS`
cleared it, so the *whole row* became keys rather than the one column the scanner happened to
notice — a Chinese table reading 勝/平/負/積分 above Latin `P W D` is the half-measure the codes
already were. With it went four stat-tile sublines, the forecast block and its model disclosure,
and the club-page link.

The fixture line is the part worth recording, because it arrived half-done. The session before
this one had already hoisted the `Intl.DateTimeFormatOptions` bag to a module const — the remedy
the profile screen used at M170 — but had not changed the call site, which still passed an inline
literal object to `toLocaleString(undefined, {…})`. So the file kept four raw hits *and* kept
formatting an instant for the browser: a reader on 简体中文 saw `Sep 12, 04:30 PM` on the fixture
row while the page's own `lang` attribute said zh-CN. It now hands the hoisted bag to
`formatDate(locale, …)`, the one door M194 opened, and the Data Room leaves `DATE_DEBT` — remaining
browser-locale sites 7 → 6, with only Player OS's three still declared.

Coverage: the raw-UI ceiling falls **80 → 51** and the covered list reaches 39 files. One file is
left, `features/sim/SimulationLab.tsx` at exactly 51, and it is the last of the three screens the
comment at M176 named. Measured after this commit: build 0, proof-i18n **214/214**, dictionary
**1587 keys × 3 locales**. Nothing was clicked in a browser — the in-app browser still will not
commit a React tree.

**Still outstanding** (deliberately not faked): `dev/` and the repository root carry untracked scratch
from the M197–M207 mutation runs
(probes, per-milestone mutation cases, a driver whose `./mutcases.mjs` no longer exists), which this
commit deliberately neither committed nor deleted.


### M209 — the raw-UI scan was counting code as prose, and Simulation Lab was five hits smaller than reported

Opening the last screen immediately turned up five of its 51 "raw literals" that are not copy at all:
`function ProbabilityPanel(`, `interface SeasonRow`, `function simulateSeason(compId: string, nonce:
number): SeasonRow[]` and `function SeasonTable(`. The scan was reading declarations as JSX text.

The cause is `valueEnd`, the helper that finds the `}` closing a `{…}` hole. It asked `skipQuoted`
where a quote ended and took the answer on trust — but `skipQuoted` *bails at the newline* for `'` and
`"`, and a bail was indistinguishable from a close. The old code did `j = end - 1` either way, so a
bailed quote jumped to the end of its line and everything after it left the brace count. On the
timeline hole `{result.timeline.filter(…).map((e, i) => <li>…{e.minute}'</span>…)}` that apostrophe is
JSX *text* (it renders "3'"), the jump was 212 characters, and the `}` closing the hole was inside the
skipped span — so the hole ran on to the next `}` in the file, six lines later, past the end of the
component, and the declarations in between came back as interface prose.

The fix distinguishes the two cases: `skipQuoted` returns just past the closing quote, so
`s[end - 1] === s[j]` identifies a real literal, and a quote failing that test is copy. **The file did
not change; the measurement did.** Simulation Lab 51 → 46, `RAW_UI_CEILING` 51 → 46, and the other 96
scanned files are identical in count.

The fixture is what proves it, and the first attempt did not — planting copy *after* the apostrophe
passed under both versions, because an overrun *extends* the scanned range and the copy stays inside
it. What discriminates is planting a declaration AFTER the component, which an overrun reads as text.
With that in place the mutation reds three clauses at once, one naming the swallowed declaration.

Measured after this commit: build 0, proof-i18n **215/215**, dictionary **1587 keys × 3 locales**.
Nothing was clicked in a browser.

**Still outstanding** (deliberately not faked): the untracked `dev/` scratch described under M208 is
still there.

### M210 — the generator every seeded claim rests on had no gate, and two of its exports had no callers

`lib/rng.ts` is 45 lines that every "reproducible from a seed" sentence in Demo Mode leans on, and it
had no proof of its own: M206's coverage ratchet counted it as covered because some proof loads a
module that *imports* it. Transitively reached is not the same thing as tested, so this milestone
writes the test — and, while checking the consumers, finds the class of bug the test exists to catch.

Two things came out of measuring first. `shuffle` and `seededAttribute` were exported with **0 call
sites repo-wide** (each counted through `\bNAME\b` plus the generic `NAME<…>(` spelling, because a
plain `NAME(` grep misses `weightedPick<"H" | "A">(…)` and under-counted once during this milestone's own
measurement). They are deleted, and the new proof refuses the shape rather than the instance: every declared
export must have at least one call site in app source, measured per name — currently
`hashString×3, makeRng×13, rngInt×50, rngFloat×10, pick×19, weightedPick×3` across 144 files.

The defect was in `domain/matchEngine.ts`, and it is still invisible in its output. Two sites pick a
player from a side-selected list — `(isHome ? homeNames : awayNames)[rngInt(rng, 0, homeNames.length - 1)]`
— and both asked the **home** squad how long the **away** squad was. Because `squad()` builds
`Array.from({ length: 11 })`, the answer happens to be right, so the fix is byte-neutral: the 400-match
battery's digest is **966604149** before and after. That is the whole point of the clause that now
exists — an index into one array must derive its bound from that same array, and "happened to be right"
is the defect. The scanner that says so is tested both ways on five planted spellings (2 legal, 3
illegal) before it is allowed to scan the repo.

`scripts/proof-rng.mjs` — **52 checks** — pins the primitives rather than a golden output: `hashString`
against a from-spec FNV-1a written in BigInt over UTF-8 bytes (agrees on 11/11 ASCII seeds, and
deliberately disagrees on `足球` — shipped 4157560531 vs byte-FNV 2859998852, because the module hashes
UTF-16 code units), the published `""`/`"a"` vectors, 200 000 distinct hashes, mulberry32's closure
state advancing rather than repeating, the four `>>> 0` seed collapses, and a zero-valued first draw
found by deriving the state from the module's own increment (2463401483) rather than by hunting. The
reproducibility claim gets a **second reader**: a child `node -e` process imports the `.ts` directly
through Node's own type stripper and returns a 200-draw fingerprint, the export key set and
`hashString("foobar")`, which must equal the parent's — so a value is never compared against a copy of
itself written in this file. Boundaries are drawn through a scripted rng (`at(v)`) instead of waiting
for a lucky stream: `rngInt`'s inclusive top, the draw-of-exactly-1 escape that the shipped generator
cannot produce in 200 000 draws (largest 0.999994817), `pick`'s five buckets, `weightedPick`'s intervals
derived from the weights, zero weights, and the fact that `weightedPick([])` **throws** where `pick([])`
returns `undefined` — the two helpers refuse differently, so a call site cannot rely on either.

Three clauses were wrong in my file, not in the app, and are recorded because the first run is where
they surfaced: the weighted sweep is `xxxxyyyzz` (I typed five `x`s), the training clause read
`exercise.name` when the field is `label`, and one clause name carried an invented "200 000 calls across
the app's pick sites" figure that no measurement produced. All three are fixed; a `|| true` tail written
in draft was deleted rather than left to pass.

The campaign ran **11 arms and caught 11** (0 missed, 0 crashed, 0 invalid needles, 0 restore failures),
with `career 183/183` and `transfers 76/76` green as controls both before and after. Eight arms change one
arithmetic constant in the generator or a helper, two re-roll the `matchEngine` defect that was just fixed,
and the eleventh breaks the gate's own regex and is caught
by the planted-spelling clause plus the site-count floor, which is what that floor is for. The first
attempt at this run instead **crashed three arms**: with a negative or out-of-range stream the seed data
layer throws at import, and `proof-rng` died alongside the app it was measuring. So the consumer sections
now load through a guarded loader and report a load failure as a red clause — the M198/M199 rule ("a
script that never reported is not a pass") applied to a new shape: a gate must not die with its subject.

Two numbers from that table are about the rest of the suite, not about this proof. `rngInt` off by one at
the top leaves `proof:matchengine` (24) and `proof:world` (36) at **0 reds**, and `pick` rounding up
leaves `proof:matchengine` at 0 — the consumer proofs pin structure, not values, so the only thing that
sees a changed distribution is this file. And the two `matchEngine` re-rolls (rg9/rg10) are caught by
**1 red each, from the scanner alone**, with the engine's own proof at 0 — byte-identical matches,
predicted and measured.

Found on the way and deliberately **not** enshrined: `buildSession` pushes the 6-minute warm-up and the
6-minute cool-down unconditionally and only fills the middle while `total + drill ≤ target − k`, so at
the 5-minute bound **32 of 32** attribute keys overflow their own target (drills sum to 12). The duration
assertion that discovered it was removed from `proof-rng` — it is not an rng claim, and leaving it in
would have written the defect into the baseline as expected behaviour. It is queued as M211. `SUPPORTED_MINUTES`
also offers 10, which this run did not measure.

Measured on the plane (`git archive HEAD` plus this milestone's three files): build 0 — `tsc --noEmit` and
vite, `✓ built in 4.89s` — and suite **35/35 proof scripts proven · 1877/1877 checks counted · exit 0**,
with no retry line in the summary. `proof:rng` reports **52/52** there. Nothing was clicked in a browser.

**Still outstanding** (deliberately not faked): M211 owns the session-duration defect; `weightedPick([])`
still throws where `pick([])` returns `undefined` — documented by a clause, not fixed; and the untracked
`dev/` scratch from M197 onward is still in the tree.


### M211 — a "5-minute" session was 12 minutes of exercises, and the coach described blocks it never built

`domain/training.ts` has said since M3 that a session is a Warm-up → Technique → Decision → Game →
Cool-down structure "at any supported duration". It was not, at either end. `buildSession` pushed the
6-minute warm-up on the front and the 6-minute cool-down on the back **unconditionally**, then filled
the middle only while `total + drill ≤ target − k`. Re-running HEAD's own function over 96 sessions per
target (32 attribute keys × 3 seeds) to put numbers on it: the 5- and 10-minute bounds returned **12
minutes of drills in 96 of 96 cases**; 20 was close (18–20, 26 short); 30 came back 24–30 (93 short);
and 45, 60 and 90 all topped out at **35–43 minutes, 96 of 96 off-target** — the budget was never spent,
only refused. And `focusAttributes` was the list of what was **asked for**: a 5-minute ask of
Passing + Finishing + Shooting claimed all three while its only blocks were the warm-up (`stamina`) and
the cool-down (`composure`) — it trained none of what was requested and credited the player for all of
it, which matters because that list is what `store/useFootballOS.tsx` pays attribute growth off, and
what the title, the plan and the development log are built from.

The user-visible part was the disagreement, not the arithmetic. Three readers of one session were
reading three quantities: `domain/load.ts` sums the exercises, `domain/review.ts` and the profile sum
`targetMinutes`, and `xpForSession` is paid the `targetMinutes`. A player who chose 5 minutes had the
weekly review tell them 5 while the acute:chronic model that caps the coach reacted to 12 — the load
model's own clause in the new proof states that ratio, 2.4× hot on that one session.

The fix allocates the budget instead of consuming it. Warm-up and cool-down each take a tenth of the
session, capped at 6 minutes; what is left splits 5 : 2 : 3 over Technique / Decision / Game by
largest remainder, so the parts sum exactly; a decision or game allocation under 4 minutes is not that
drill, so it folds back into the technique work the player asked for; each phase spends ~7 minutes per
block. Technique **leads** with one drill per requested focus in the order asked, so a budget too small
for the whole ask drops the *later* focuses rather than training something nobody requested — and the
focus list, the title and `plan.focus` are now derived from the blocks that exist
(`focusAttributes` is "the attributes this session trains", which is what the growth reducer already
assumed it meant).

`scripts/proof-training.mjs` — **40 checks** — pins the contract the module claims in its own comment,
with the allocation derived a second time inside the proof from the constants and drill table it reads
out of the source text (so a hand-copied expectation cannot certify it): **672 sessions** (7 offered
targets × 32 attribute keys × 3 seeds) sum to exactly the target they report, **0 off**; no block is
ever 0 or fractional (smallest allocated **1′**); block counts grow **3,5,6,7,8,13** rather than
topping out; the bookend row is `5=1+1 10=1+1 20=2+2 30=3+3 45=5+5 60=6+6 90=6+6`; every attribute key
is trained at every supported target (**0 misses**); a four-focus ask is honoured
`5:1/1 10:1/1 20:2/2 30:2/2 45:3/3 60:3/3 90:4/6`; the role drill is the first game block whenever a
game block exists (**0 misses over 4 role focuses × 7 targets**) and the game phase is genuinely absent
at 5 and 10; determinism byte-for-byte, and **35 distinct plans from 40 seeds** so "shaped to you" is
not one resized template. Provenance is checked too: every block is a real catalogue drill with only
its `minutes` scaled.

The last section is the coach, and it was added mid-milestone because the mutation plan found the hole
first. `data/ai.ts` had just been given a `hasBlock()` guard so its rationale would not promise a
decision-making block or a role-shaped game block to a 5-minute session — but **both** existing coach
proofs generate plans at `availableMinutes: 60`, where every block exists anyway, so the guard had no
witness: switching it off changed nothing anywhere in the suite. The new clauses therefore compare the
prose to the session under it, both directions: at 5′ the blocks are `warmup,technique,cooldown` and
the plan says `[warm-up]`; at 60′ the blocks carry all four claims; the diagnosis of a three-priority
ask that does not fit names the one it starts with and nothing else; `plan.focus` equals
`session.focusAttributes` (asked 3 → **1** at 5′, **2** at 60′); the coach's private clamp list is
reconciled against `SUPPORTED_MINUTES`; and across 9 budget × load-zone combinations every session the
coach hands back spends the minutes it reports and trains every attribute it names.

**15 arms, 15 caught** (0 missed, 0 crashed, 0 invalid needles, 0 restore failures), controls
`career 183/183` and `transfers 76/76` green before and after. Two of them are the interesting shape:
re-rolling the shipped defect (blocks keep their catalogue minutes) reddens **10** clauses here and
**0** in `proof-m77` and **0** in `proof-rng` — the consumer proofs still pin structure, not values —
and `tr14`, the switched-off guard, is caught only by the section written for it. Moving the documented
share (a tenth → a fifth, still under the cap) is caught only by the pinned bookend row, because the
model in the proof recomputes from the same constant, which is why that row is measured minutes and not
derived ones; `tr13` writes the row wrong at 45′ on purpose to show it bites. `tr4` (focus drills sent
behind the filler) reaches outside this module and reddens two of `proof-m74`'s coach-memory clauses,
so the allocator and the memory are now visibly coupled.

Two clause names in my own file were wrong before the first green run and say so now: one indexed the
per-phase totals with the phase's rank in the render order (technique=1 vs the array's 0), and one
hard-coded the weekly review's expected figure as 15 where the derivation over 5+5+10+10 minutes is 30.

One ledger was watched rather than trusted. This rewrite turns a list of `if (fits) push(drill)`
statements into pool loops, which is the exact shape that makes a regex-counted text debt go blind —
literals can vanish into a table and the total falls without any prose being localised. `proof-i18n`
was green on the plane with `domain/training.ts` still at its capped **19** literals, and its
caps-sum-equals-counted-debt clause requires the sum to match the scan **exactly**, so nothing moved,
hid or shrank: the drill bank was not touched and its labels are still the same 19 rows the ledger
counts.

Measured on the plane (`git archive HEAD` plus this milestone's three files): `tsc --noEmit` clean,
`npm run build` exit 0, suite **36/36 proof scripts proven · 1917/1917 checks counted · exit 0**, with
no retry line in the summary. Nothing was clicked in a browser.

**Still outstanding** (deliberately not faked): `weightedPick([])` still throws where `pick([])`
returns `undefined`; and the untracked `dev/` scratch from M197 onward is still in the tree.


### M212 — the router was exempted for a reason that was not true, and a typed `%` blanked the page

`proof-coverage.mjs` (M206) carries a list of app modules no proof can reach, each with a written
reason. `lib/router.tsx` was on it with *"needs a DOM the SSR harness does not provide"*. That claim
is checkable, and it is false: a stub `window` (a `location.hash` getter/setter, `replace`,
`addEventListener`, `scrollTo`) plus `renderToStaticMarkup` is enough to mount the provider, read
back the context it publishes, drive `navigate` and print the anchor `Link` produces. The exemption
is deleted and `scripts/proof-router.mjs` takes its place — and the sweep it enabled found two
defects sitting in the 104 lines that had been declared untestable.

The first is a crash a visitor can type. `matchRoute` ran `decodeURIComponent` over whatever segment
matched a `:param`, so `#/players/%` — a trailing percent sign, or `%zz`, or `a%b` — threw
`URIError` out of the render. The proof measures how alone that is: **0 error-boundary
implementations across 134 app files**, so nothing downstream can absorb it and the whole tree
disappears instead of the player. `readLocation` deliberately does *not* decode the hash, which is
why the query `#/search?q=%zz` was always safe (`URLSearchParams` tolerates it) while the path was
not. The fix keeps the visitor's own characters when decoding fails, so `/players/%` resolves to
`{id: "%"}` and `Details.tsx` renders its real not-found state, while a legitimately escaped id
still arrives decoded (`%E4%B8%AD` → `中`). One clause states the shape of the whole surface:
percent-decoding of a visitor-supplied string happens in **1 file**, and it is guarded.

The second was invisible to reading. AppShell decided which nav row lights up with
`path === m || matchRoute(`${m}/*`, path) || path.startsWith(m + "/") || path === m`. There is no
wildcard in this matcher — `*` is a literal segment — so that arm is compared against a path
containing `*`, which the probe measures matching **0** times over **24 nav prefixes × 15 reachable
paths** (the arm it pretended to be covers 6 of those paths, equality 2); and `path === m` was
written twice. Both are gone, the import went with them, and the
predicate is now **2 arms, 0 duplicates**, with each arm's reach printed: `path === m` fires on 24
paths, `startsWith(m + "/")` on 25 of 61 reachable paths — so the surviving prefix arm is
load-bearing, not decorative (an earlier nav with a shorter name would otherwise swallow rows).

**28 checks.** The matcher is compared to a model compiled from the module's own doc comment
("Match `/players/:id` style patterns"), not from its loop: **12 shipped patterns × 26 hand-picked
paths = 312 rows, 0 divergences, 0 throws**, including `//`, `/players//p1`, a `/players/` that must
not invent a segment, and an optional `:tab?` that must drop out of the key rather than arrive as
`tab?`. Then the parts only a render can show: the provider mounts; a hash parses into
path/segments/query exactly; `useRouter` refuses to answer outside the tree **by name**
(`"useRouter must be used within RouterProvider"`); `Link` prints `<a href="#/players/p1">`, so
middle-click asks for a route this app owns; `navigate` writes exactly one hash on both spellings,
reaches `location.replace` only for a replace, and scrolls. Dispatcher-level: **11 patterns in
`FootballWorld.tsx`'s 554-line switch, 0 shadowed**; **7 prefixes, 0 unparented routes**; **24 nav
destinations, 0 that would land on the not-ready page**. Structural: 4 exports, every one with an
app caller (`RouterProvider` 3× in 1 file, `useRouter` 46× in 19, `matchRoute` 14× in 2, `Link` 192×
in 23), and **0 files redefining the matcher**.

Two things this file does *not* cover, and says so in its own clause name: `renderToStaticMarkup`
never runs `useEffect`, so the `hashchange` subscription, the `#/` bootstrap and `Link`'s
modifier-click guard stay unproven here (measured: 0 listeners registered and 0 `replace` calls
during render — the number, not an assumption).

**27 arms, 27 caught** (0 missed, 0 crashed, 0 invalid needles, 0 restore failures), controls
`career 183/183` and `transfers 76/76` green before and after. Two of them changed the gate rather
than the code. `rt08` deletes the `|| "/"` in `readLocation` — and against the first 27 checks it was
**0 red of 27**, because `readLocation` guards the empty path *twice* (once for the whole hash, once
for the pathname), so removing either copy leaves behaviour byte-identical. That is an equivalent
mutant, not a hole, so the honest record is a clause that measures both halves: the guard count is
pinned at **2** and all four empty-ish hashes are printed landing on the root either way
(`""→"/"`, `"#"→"/"`, `"#/"→"/"`, `"#?q=1"→"/?q=1"`). With it the arm is caught by **1 red of 28** —
by the structural half, and the clause says so rather than pretending a behaviour changed.

**The plane run is what found the third defect**, and it is the one that matters most. Deleting the
vacuous `` `${m}/*` `` arm changed how AppShell reads to the i18n scanner, and `proof:i18n` reddened
with **7 hits in a file this gate registers as rendering no raw UI text at all**. The scanner,
not the screen, was wrong: `stripComments` was not string-aware, so a `/` followed by `*` **inside a
literal** opened a block comment that ran to the next real `*/` and blanked everything between them.
In AppShell that was line 91's `` `${m}/*` ``, which ran to the first genuine comment closer in the
file — line 153's `{/* desktop rail */}` — and took the drawer's copy with it. Film Room's confidence
badge was hidden the same way by its own upload input: `accept="video/*"` at line 660 ran to the `*/`
of a `catch { /* ignore */ }` at line 726, swallowing `DEMO · {n}% conf` on line 687. Both are shapes
a reader looks straight past, because the file *compiles* and the page *renders* — only the gate goes
blind, and it reports the file clean.

Measured against HEAD (the file as it was when the gate believed it), on the shipped scanner with its
literal branch disabled versus the repaired one: **0 hits** and **7 hits, lines 138, 139, 161, 166,
178, 239, 247** — `label="Your OS"`, `label="Studios"`, `aria-label="Open navigation"`, the text
`Navigation`, the text `Search or ask…`, `aria-label="Language"`, `aria-label="Toggle theme"`. Only
the first two lie inside the blanked span, so the span's deletion is not the whole story, and one
further control says what the rest is: changing that single character (`${m}/*` → `${m}/x`) and
leaving the buggy stripper in place returns **the same 7 hits at the same lines**. The blanked text
carries 11 `<div` against 9 `</div>`, so deleting it left two elements permanently open, and every
node after line 153 was accounted to a region that never closes. One defect, two symptoms: copy
inside the span is deleted, and copy after it is orphaned.

The fix treats a quote as opening a literal only where a value can begin (the character before it,
after whitespace, is one of `=({[,:;?`). That table is deliberately narrow: it never claims an
apostrophe standing after a letter, so `{e.minute}'` and `Don't` in JSX text stay copy rather than
becoming delimiters — the position rule is the whole reason the fix is safe. Both directions are
gated by a planted fixture: a mime wildcard must not hide the copy that follows it, **and** a real
`{/* … */}` must still be ignored with the copy after it still reported, because a stripper that
simply stopped honouring comments would pass the first clause alone. A third clause asserts the
census that same block prints — the shape is still live in **2 app files**, so the number cannot
drift to zero while its clause stays green. A measurement written into a clause name is only
evidence if something checks it.

What the repaired scanner then saw was the copy itself: **9 raw strings** (7 in the nav chrome, 2 in
that badge) now sit behind **8 keys** — `nav.group.os`, `nav.group.studios`, `nav.open`,
`nav.drawerTitle`, `nav.searchCta`, `nav.language`, `nav.themeToggle`, `player.demoConfidence` — in
all three locales, and the i18n gate reads **220/220** with the covered-file list (39, 0 raw hits)
and the raw-UI ceiling (46) unchanged.

The gate then went red on a green app, and this time the defect was in its population rather than
its parser. `proof-i18n` walks the repository from the root, skipping only `node_modules`, `dist`,
`.git` and one tool directory, so the scratch copies this milestone had written into `dev/` to
measure HEAD were counted as shipped interface: **60 raw hits across 3 files** and **2 undeclared
dynamic `t()` sites**, where the app carries **46 across 1** and **77 sites, 0 undeclared** — the
difference is exactly the two AppShell copies at 7 each. That is the same failure class as the
scanner, from the other side: a gate whose number depends on which scratch files happen to be in
the working tree is not measuring the product. `dev` joined the skips, and because a skip list is a
hiding place the moment app code lives behind it, the fix came with an audit rather than a comment:
every import specifier in the census is read (measured **792 across 140 files**) and the clause
refuses any that runs *through* a skipped directory — `dev/function-local.ts` is the tracked
resident there and it imports outward, from `functions/`, which is the direction that stays legal.
The clause's own floor is derived from the population it audits, two specifiers per file, so
"0 reached a skipped directory" cannot be earned by reading nothing.

Nine of the arms belong to that half, and one of them had to be re-planned. `sc01` re-rolls the
shipped defect (a literal-opening test that never fires) and is caught by **2 red of 220** — both
fixture directions, which is what "the pair is what makes the witness mean *string-aware*" buys.
`sc03` deletes `=` from the position table, the exact shape `accept="video/*"` arrives in: **3 red**.
`sc04` stops blanking real comments: **1 red**, and the red it names is worth reading — the scan of
the *app* starts reporting `features/dashboard/Dashboard.tsx (1: s matches */)`, which is the inside
of that page's `{/* today's matches */}` route comment arriving as interface text. Commented copy is
not on screen, so a scanner that forgets comments reports debt that no visitor can see. `sc05` blinds the new census, which then
prints "0 app files" and is refused. `sc06`/`sc07` put the badge and one nav string back as raw text:
**2 red each**, the covered-file clause and the key-reachability clause together. But `sc02` —
"treat *every* quote as a literal" — came back **MISSED**, and the reason is that the literal branch
echoes the span instead of deleting it, so widening the table loses no copy and moves no count. That
is an equivalent mutant, and the honest answer was not to drop the claim but to gate the claim that
is actually load-bearing: a new clause reads the position table out of the scanner's own source and
refuses a letter, a digit, `)` or `]` in it. With that clause in place the same widening is caught
by **1 red of 220**. The population fix got the same treatment: `sc08` deletes `dev` from the skips
and the debt census sees **60 across 3 files** and refuses it, which is what proves the skip is
load-bearing rather than cosmetic, and `sc09` blinds the specifier regex so the audit reads nothing
and its derived floor — not a hopeful `=== 0` — is what reddens it.

The gate had two bugs of mine before it was trustworthy. Its first version asserted the root rows by
substring, and a correct measurement reddened it (`"#?q=1"→"/?q=1"` contains neither string it was
looking for) — the fix was to keep the rows structured and assert `path === "/"`, so the printed
evidence is the thing being judged. And wrapping the load in `tryLoad` hid the call from
`proof-coverage.mjs`, which finds loaded modules by a literal regex: the ratchet reddened **13/15**
with `undeclared: lib/router.tsx`. `tryLoad` now takes a thunk so
`server.ssrLoadModule("/lib/router.tsx")` appears verbatim — a helper that wraps the loader must not
swallow the loader's literal.

The ratchet's own numbers moved with it: **37 proofs now load 41 modules directly, reaching 36 of
the 39** app modules in `domain/` + `lib/` + `i18n/`; **3 unreachable, 3 declared**; the exempt
surface is **160 lines**, so its ceiling came down from 330 to **165**. `lib/hooks.ts` (92) and
`lib/theme.tsx` (61) are the two largest remaining, and all three survivors are React-side — `domain`
has 31 files and none is exempt. `rt18` re-adds the deleted exemption and the staleness clause
refuses it (5 red of 15).

Measured on the plane (`git archive HEAD` plus this milestone's files): `tsc --noEmit` clean,
`npm run build` exit 0, suite **37/37 proof scripts proven · 1950/1950 checks counted · exit 0**,
final run clean of retries. An earlier plane run of the same milestone did carry one — 
`matchprobability×1` — which is M203's predicted statistical event arriving on schedule: Vite's
dependency scan killed that proof's first attempt after it had printed a complete tally, the runner
re-ran it once, the second attempt produced its evidence, and the line named the case instead of
hiding it. That is the first time the policy has been exercised by a real crash rather than a
constructed fixture, and the retry was neither reported as a red nor smoothed away. Nothing was
clicked in a browser, so the crash fix is proven at the matcher (which is where the throw happened)
and not at the page.

**Still outstanding** (deliberately not faked): the `useEffect` half of the router (subscription,
`#/` bootstrap, click guard) needs a real DOM or a browser pass — it is named as uncovered inside
the proof; `weightedPick([])`
still throws where `pick([])` returns `undefined` — its **2** app call sites are both in
`domain/matchEngine.ts`'s `shotType` and pass literal non-empty lists, so that is a documented
difference between two helpers, not a reachable crash, and
it stays a clause rather than becoming an invented fix; and the
untracked `dev/` scratch from M197 onward is still in the tree. One hole this milestone *measured*
rather than closed: `rawUiScan`'s walker had no notion of having lost the thread — the control above
shows it dropping **5 of 7** hits purely because the text it was handed left two `<div>`s open, and
nothing then refused to call such a file clean. The repair removed the input that did it here; a
depth-at-EOF check on the normalized file is what removes the class, and it was queued ahead of the
prose work rather than written as a clause that only restates this incident. **M213 landed that
check**, found the two mis-advances that had been putting the walker off-thread all along, and
measured the sentence above's **5 of 7** as a *slice* effect: on the shipped files the same defect
swallows every hit after line 96 of `chart.tsx`, so the count understated it.


### M213 — a ledger that counts copy has to prove it can see

M212 fixed the router and taught this repo's shared text scanner (`scripts/lib/rawUiScan.mjs`)
that a string is not code. Reading the file again for this milestone turned up two more places
where it mis-advanced, both inherited from the same mistake: **treating a scanner's position as
if one rule could not consume two characters**.

The first is in `skipQuoted`. Its escape branch did `if (c === "\\") j += 2;` and then fell
through to the loop's own `j++`, so an escape consumed *three* characters and every literal
closed one past where it really ended. In `components/ui/chart.tsx` the theme CSS builder holds
`"@media " + … + " {\n"` — the `\n` ate the `$` of the following `${rule}`, so the template
literal started early, ran to line 158, and the `<style …>` attribute list it swallowed never
reached a `>` at brace zero. Everything the walker believed about that file after line 96 was
wrong: each subsequent JSX child was read as an attribute of a tag still being opened. The fix is
that an escape consumes exactly the character it escapes — `{ j += 2; continue; }`.

The second is that a regular-expression literal is code, and the comment stripper had no notion
of it. `data/intelligence.ts:246` tokenises the question with `/[^a-z0-9' -]/g`, and that
apostrophe inside the character class opened a phantom string that ran to a later quote and took
two braces with it. `stripComments` now recognises a `/` in value position (`REGEX_BEFORE`, plus
`REGEX_KEYWORD` for the `return /x/` shape where the preceding character is a word character) and
blanks the literal's body, class-aware and refusing to span a newline so a mis-read division
cannot eat the rest of the file.

**Both were measured, not assumed.** Reverting each defect onto the fixed scanner separately, over
the 140 files the raw-UI census walks (143 `.ts`/`.tsx` minus `i18n/`), gives a one-to-one
attribution: the escape defect leaves `chart.tsx` ending the walk `{elem: 0, depth: 6, inTag: true}`;
the regex defect leaves `intelligence.ts` at `{elem: 0, depth: 2, inTag: false}`; with both fixed,
**0 of 140** files end off-thread. `intelligence.ts:246` on its own, quoted into a four-line
fixture, reproduces the `depth 2 → 0` — so the stated cause is the measured cause.

**What the fixes did not do is the interesting part.** The counted copy is unchanged: raw-UI debt
still **46**, covered-file leaks still **0**, `lookupsIn` still **1243**, and `chart.tsx` /
`intelligence.ts` each go `0 hits → 0 hits`. On today's tree the two defects were hiding no English
the census should have charged for. What they cost is *region correctness* — the walker's map of
which literal sits inside which element, which every clause above line 1600 of this project's i18n
proof reads — and a defect in it is invisible from inside a clean population. That is what this
milestone actually closes.

To see how invisible, plant a caption and vary its position. In `chart.tsx` with the escape defect
restored, a raw `<div title="…">…</div>` inserted at lines 100, 120, 158, 180 and 220 yields **0**
hits from the scanner; with the fix, **2** every time. Appended at end of file, the broken walker
still reports 1 of the 2 — it sees the attribute and loses the element's text. That half-hit is why
the first visibility probe written for this milestone was wrong: it asked only *whether any hit
mentioned the probe*, and on that question all 57 debt files looked sighted under both scanners
(`plantUnseen 0/57`, twice). Demanding both halves, in the file's own interior, is what makes the
test answer the question it is asked.

So `proof-i18n` gained three clauses, all reading the walker rather than a re-implementation of it:

- `sourceBalance` returns the walker's own EOF state, `{elem, depth, inTag}`, and the field list the
  gate checks is derived from it (`Object.keys(sourceBalance(""))`) — a report that quietly dropped
  a thread would have to drop it past a clause that enumerates them.
- The population clause runs **three planted refusals** (one unclosed element, one bracket open at
  EOF, one unterminated attribute) through *the same filter* as the 140 real files and requires the
  offender list to be exactly those three, each tripping its own one field. On a clean tree a filter
  that only checked `elem` would report a perfect census forever; here it reports 1 offender and
  goes red.
- The probe clause plants a caption at the midpoint of each of the **96** `.tsx` files and requires
  both halves back (**0 blind**), with a control planted here that genuinely is blind. Choosing the
  control was a measurement too: an unterminated *attribute* is not blind — a string stops at its
  newline and the next `<` re-opens a tag, so that fixture reads `2 halves` and self-heals — while a
  runaway template literal, the one thread nothing closes for you, stays blind at either position.

The two remaining choices (interior rather than end-of-file; both halves rather than any half) are
load-bearing **as a pair**, and the honest consequence is that a single-file mutation cannot witness
them. Restoring the escape defect and re-running the four combinations: interior + either demand
reports `chart.tsx(0 hits)`; end-of-file + both-halves reports `chart.tsx(1)`; end-of-file + any-half
reports **nothing blind in a tree that is not**. Written as arms, the two relaxations survive on the
healthy tree (measured: `MISSED m213h`, `MISSED m213i`), so they were dropped from the harness and
recorded here instead of being quietly claimed.

**Mutation witness.** Seven arms for this milestone, in the standing harness: `m213a` restores the
three-character escape advance, `m213b` makes a regex literal stop being code, `m213c` has the walker
claim `{elem: 0, depth: 0, inTag: false}` no matter where it ended, `m213d` deletes a field from its
report, `m213e` leaves the filter checking `elem` only, `m213f` stops the probe reporting anything as
blind, `m213g` empties the probe's file population. Each is caught; the full suite of **34 arms**
reports `34/34 caught · 0 missed · 0 crashed · 0 invalid needles · 0 restore failures`, with the
unmutated control green before and after. `proof-i18n` itself is now **224** checks (was 223).

Measured on the working copy: `tsc --noEmit` clean, `npm run build` exit 0, suite
**37/37 proof scripts proven · 1954/1954 checks counted · exit 0**, no retries in the final run. On
the clean plane (`git archive HEAD` plus this milestone's two files, `node_modules` joined): `tsc --noEmit` exit 0, `npm run build` exit 0, suite **37/37 proof scripts proven · 1954/1954 checks counted · exit 0**, and no `UNVERIFIED` line in the log. The first plane attempt of the same tree is worth recording because it says something about reading numbers off a loaded machine rather than about this code: `tsc` died with `FATAL ERROR: Zone Allocation failed - process out of memory` at exit 134, and `proof:load` died the same way twice, which M203's policy reported as `UNVERIFIED … no tally` rather than as a red. Re-running the plane with `--max-old-space-size=4096` gave the four green readings above; the heap ceiling is the host's, and the honest part is only that the runner named the dead script instead of smoothing it over.

**Still outstanding** (deliberately not faked): `useEffect`-half router coverage still needs
a browser pass, and the untracked `dev/` scratch is still in the tree.

One charge this block carried has a closer to name. The probe-midpoint caveat — "a file whose
middle falls inside a multi-line expression could in principle report blind for a reason that is
the probe's, not the file's" — is what M306 settled: the walker now reports the thread it ended on
(`sourceBalance` gained `tick`, the template literal that never closed, beside `elem`, `depth` and
`inTag`), and the midpoint clause classifies before it asserts — the two threads that can swallow
a plant (the runaway `tick`; a block comment still open at the boundary, which `normalize` erases
whole) are held at zero across every `.tsx` midpoint, the other three cannot hide a caption (the
walker re-enters on the plant's own `<div`), 46 of 49 midpoints carry one of them, and three
witnesses pin the reader. M306's section records the strike.

One more charge this block carried has a closer to name. The two probe-choice relaxations —
plant at end-of-file instead of the interior, demand any half instead of both — were dropped
from the harness after `m213h` and `m213i` both MISSED on a healthy tree, and kept as a
claimed joint property. M307 witnessed the position choice in the gate itself: a fixture
broken in its interior and recovered by its end reads 0 at the midpoint and 2 at end-of-file,
so the interior choice is load-bearing against exactly the shape that exists for it, and
end-of-file is where interior breakage reads healthy under any demand. The demand choice has
no reproducible shape of its own in a minimal fixture — an unterminated attribute or an open
element self-heals and the plant reads 2 or 4 — so any-half and both-halves agree on every
shape a fixture can carry, and the record now says so at the clause instead of asserting the
pair blind. M307's section records the strike.

Two more charges this block carried have closers to name. The mid-file regions charge —
`sourceBalance` "says nothing about whether the regions are right in the middle of a file" — is
what M308 resolved to a boundary: the one shape that opens mid-file and heals without any
balance change (an unterminated attribute) leaves true regions behind it — the healed fragment
charges itself once as the attribute it opened and the caption after it reads once per half —
while a caption inside an open template reads 0, because string content is not code; both
halves of that boundary are now asserted at the clause. And the exemption line —
`lib/hooks.ts`/`theme.tsx`/`utils.ts` stay exempt — was already false when this block was
written: the three retirements happened at M238/M239, M302's section records them and
`proof-coverage`'s single-entry `EXEMPT` asserts the table, so the line goes with the pointer —
and M212's block carries the same stale claim (with `hooks.ts`'s three named hooks retired
alongside the file at M238), which goes the same way. M308's section records the strike.

### M214 — a helper that returns a sentence is invisible to a scan that reads positions

A reader-facing complaint about dates on the dashboard turned into two defects in one function once
the shipped code was sliced out of its file and called
(`dev/m214-measure2.mjs` → `dev/m214-measure.txt`). `features/dashboard/Dashboard.tsx` had a local
`relTime(locale, iso): string`, and its day arithmetic was wrong in two directions at once:

| offset from now | `en` | `zh-CN` | `zh-TW` |
| --- | --- | --- | --- |
| `+3d` | `in 3d` | `in 3d` | `in 3d` |
| `+1.4d` | `10:43 PM` | `22:43` | `下午10:43` |
| `-2d` | `-2d ago` | `-2d ago` | `-2d ago` |
| `-6d` | `-6d ago` | `-6d ago` | `-6d ago` |
| `-30d` | `-30d ago` | `-30d ago` | `-30d ago` |

**A past instant kept its minus sign.** `Math.round((kickoff − now) / 86400000)` is negative for
anything already gone and the template only chose the words around it, so the growth card's last
completed session and every finished fixture in the ±2-day "today" panel (`Dashboard.tsx:51` selects
those, and a finished match's kickoff is in the past) read `-2d ago`, `-6d ago`, `-30d ago`. A
negative duration is not a measurement of anything. **And both day branches spoke English in either
Chinese locale** — `in ` and ` ago` are literal characters in that template — while the clock branch
on the next line followed the locale correctly, so one row showed a `zh-CN` reader `22:43` and
`-2d ago` in the same breath.

Neither defect was reportable by any gate in this repo, and that is the part worth recording. The
raw-UI census reads *positions inside JSX*; this helper's words were typed in a function body and
printed from `{relTime(…)}`, so no position it walks carries a literal. The keyed-row audit reads
*modules that mention `RowText`*; this module never mentions it. The proof of the claim is mutation
arm `m214g`: restoring that shape — a `string`-returning helper doing
`new Date(iso).getTime() - Date.now()` inside a screen file — reddens **1 check out of 227**, the new
census, and moves the raw-UI debt count by nothing. A class of defect with no reader is a class that
recurs.

**The fix is a door, not a patch.** `i18n/format.ts` now exports `relativeDay(locale, iso): RowText`
beside `formatDate`, in the same module kept out of `index.tsx` so a domain module can build an
instant into a row without importing React. The day count is always a positive whole number and the
*direction* lives in the key it rides — `time.inDays` ahead, `time.agoDay` behind — and within a day
of now there is no honest day count, so the instant's own clock time, formatted the reader's way,
answers. It leaves through the i18n umbrella and both call sites (`Dashboard`'s growth line at
`:220` and fixture line at `:406`, `CommunityHub`'s feed helper) print it through `rowLine`.
`comm.agoDay`, the community feed's private copy of the past-day word, is deleted: two surfaces now
say one row, and the existing key-reachability gate is what enforces the sharing.

**Three new claims in `proof-i18n`, and two repairs.**

- *26b — the census.* The population is derived from the arithmetic, not from a name list someone
  has to keep current: any walked file subtracting a parsed instant from `Date.now()`, in either
  order. Today that is **2 sites**, `features/community/CommunityHub.tsx` and `i18n/format.ts`, and
  each must sit inside a declaration whose return type says `RowText`. The scan runs over every
  walked file **including `i18n/`**, which the app-wide `appSrc` population deliberately drops — a
  census that skipped its own subject would report clean for the wrong reason. A declaration the
  walk cannot place counts as an offender rather than being skipped, so a resolution failure goes
  loud.
- *26b — the plants.* Three shapes through the same filter, one per way the clause can be wrong: a
  `string` return (must refuse), a `RowText` return (must accept), arithmetic outside any
  declaration (must refuse as `UNATTRIBUTED`). All **3** land as declared.
- *26c — the print.* The door is loaded through the umbrella in the suite's own vite server and run
  over **7 planted offsets × 3 locales**: the key per direction, `n` a whole positive number equal to
  `Math.round(Math.abs(offset))`, a value only where no day is countable, no `-\d` in any locale, and
  no `\b(in|ago)\b` in either Chinese locale. The contrast arm in the same clause asserts the
  sentence the dashboard shipped until this milestone, `-2d ago` / `in 3d` — "no minus sign" is only
  evidence if the predicate refuses the sentence that had one.
- *repaired — the reader census.* `every dictionary key is reachable` read only `appSrc`, so this
  milestone's first run failed it for `time.inDays`: a key named by the door in `i18n/` had, by that
  clause's own definition, no reader. The population is now `appSrc` plus the `i18n/` modules other
  than `dictionaries.ts` — a key's own declaration is not the code that reads it — and reads
  **142 reader files**.
- *repaired — the umbrella.* The clause that pinned `export { formatDate } from "./format"` matched
  one remembered name, so widening the door list would have broken it by accident rather than
  reported anything. It parses the brace list now and requires both doors by name.

The run prints `1596 keys · 3 locales`; each locale gained the two `time.*` rows and lost
`comm.agoDay`, and the three locales' key sets and orders still agree (that parity is a gate, and
`m214f` below shows it firing).

**Behaviour deliberately preserved, and measured:** the `|d| > 1` boundary came from the shipped
code, so an instant 1.4 days away still prints only a clock time — tomorrow reads as an hour and a
minute. That is a real defect in the same helper; it is queued (with the within-a-day branch it
needs) rather than fixed quietly inside a milestone whose claim is the sign and the language.

**Mutation witness.** Eleven arms for this milestone: `m214a` starts the day branch a day early,
`m214b` truncates the day count instead of rounding it, `m214c` hands the past instant the future
word, `m214d` drops `RowText` from the door's own signature, `m214e` writes the simplified past-day
row in English, `m214f` brings `comm.agoDay` back while nothing reads it, `m214g` restores the
sentence-shaped helper on a screen file, `m214h` makes the census read the population that excludes
`i18n/`, `m214i` gives the population one subtraction order only, `m214j` treats every enclosing
declaration as row-typed, `m214k` re-paths the umbrella's export so it still loads at runtime and
only the clause reading the list can notice. All eleven are caught on the milestone's own small plane
(`11/11 caught · 0 missed · 0 crashed · 0 invalid needles · 0 restore failures`), and the full suite
of **45 arms** reports `45/45 caught (45/45 ran) · 0 missed · 0 crashed · 0 invalid needles ·
0 restore failures` with the unmutated control green before and after
(`career 183/183, transfers 76/76`). `m214f` is the one caught by more than a single clause: 4 reds,
of which the harness names `zh-CN: no keys missing` and `zh-TW: no keys missing`. `proof-i18n` itself
is now **227** checks (was 224).

Measured on the working copy: `npm run build` (which runs `tsc --noEmit` first) exit 0, suite
**37/37 proof scripts proven · 1957/1957 checks counted · exit 0**. On the clean plane (`git archive
HEAD` plus this milestone's six source files, `node_modules` joined, `--max-old-space-size=4096` for
the whole leg as on the M213 plane): `tsc --noEmit` with no output and exit 0, `npm run build` exit 0,
suite **37/37 proof scripts proven · 1957/1957 checks counted · exit 0**, and no `UNVERIFIED` line in
the log. `README.md` itself is in neither plane leg because no proof script reads it — the only
mention of the filename in `scripts/` is a comment in `proof-careerarc.mjs` — so the six files are
what the numbers above were taken from.

**Still outstanding** (deliberately not faked): the census's own hole,
measured this milestone — `RELATIVE_MATH` needs the literal `Date.now()`, so a helper that hoists
`const now = Date.now()` and subtracts the alias would escape it, and today's tree has exactly **1**
such alias site (`Dashboard.tsx:51`, a selection filter that prints nothing) and **0** printing
helpers, so nothing ships broken but the class can dodge the clause by naming a variable (queued);
`lib/hooks.ts`/`theme.tsx`/`utils.ts` exempt; the browser walk of the i18n surfaces in a populated
state; and the untracked `dev/` scratch is still in the tree.

### M215 — the words a model reads and the words a person read need different doors

`domain/playerDna.ts` read `DICTIONARIES.en[...]` directly. It is the only module outside `i18n/`
that did, and the reason is legitimate: `archetypeLabelEn` names an archetype to the demo provider,
which matches on Latin tokens — `data/intelligence.ts:246` strips everything outside `a-z0-9' -`
from the question — so its vocabulary must stay English in every locale. The problem is what that
made legal: the one place that had a good reason to bypass the reader's table was reaching into the
table itself, so a screen doing the same thing would have been indistinguishable from it, and the
file that owns the English column was the only thing standing between the two uses.

**Now there are two doors.** `t(key, vars)` answers in the reader's language and is what every
rendered word must come from. `englishWord(key)` in `i18n/format.ts` answers in English and is what
provider input comes from; it lives in the door module rather than a new file so a domain module can
reach it without importing React (the same reason `formatDate` and `relativeDay` live there), and it
echoes an unknown key instead of returning `undefined` under a `string` type. `archetypeLabelEn`
calls it. Three claims hold the split, and each prints its own population so a blind scan cannot
also print an agreeable zero:

- no module outside `i18n/` mentions the dictionary table — measured over **143 files**: 3 readers
  inside `i18n/` (`dictionaries.ts`, `format.ts`, `index.tsx`) and **0** offenders outside.
- four plants graded by the *same predicates the census uses*, one per way the rule can be wrong:
  a member read (`DICTIONARIES.en[…]`) and a namespace-aliased read (`D.DICTIONARIES["en"][…]`) both
  count as touching the table; a `englishWord(…)` call from a module counts as a caller, not a
  reader; the same call from a `.tsx` lands in the screen list. **All 4** classify as declared.
- provider vocabulary is asked for by modules only: **1 caller**, `domain/playerDna.ts`, **0**
  screens.

**The umbrella clause had to be rewritten for this, and the rewrite is the better result.** Until
now it asserted `umbrellaNames.length === 2` against the two doors M214 put through it, which is
exactly the hand-maintained name list M212 warned about: a third door in `format.ts` would have
reddened a *correct* tree. It now derives both sides — the declarations read out of `i18n/format.ts`
(`3` today: `formatDate`, `relativeDay`, `englishWord`) intersected with the names non-`i18n/` files
actually import from `@/i18n` (`5` names, of which `2` are doors) — and checks the umbrella against
that, in both directions: nothing the screens ask for is missing, and nothing in the list is a
phantom the module does not declare. `englishWord` therefore stays a module-only door by
derivation, not by someone remembering to leave it out.

**Also removed:** two value imports in `data/intelligence.ts` (`attributeLabel`,
`archetypeLabelEn`) with **0** call sites each, measured by counting `attributeLabel(` and
`archetypeLabelEn(` in the file. A dead value import is not a cosmetic thing here: `proof-coverage`
counts value edges to decide which modules are reached, so an import nobody uses draws a reachability
edge the code does not have. Nothing in the suite refuses such an import today (`tsc` runs with
`strict` but without `noUnusedLocals`, so an unused import is not even a type error), which is why
they survived and why the removal is quoted as a measurement rather than as a gate. Deleting them
moved no coverage number: the suite still reports 37/37 with both modules reached through their other
readers.

**One comment was a half-truth, and correcting it turned up the next defect.** `features/ai/AiStudio.tsx`
explained its four sample prompts as "queries sent to the demo provider", which is true and is why
they are English — but the same array is rendered as the chips under the heading
(`SUGGESTIONS.map(… <button>{s}</button>)` at `:108`), so a reader in either Chinese locale is shown
four English questions. The display half is the defect, the query half is not. The comment now says
both, and the fix (keys for the display, English for the send — the pattern `CommunityHub` already
uses for dataset tags) is queued with the general hole it sits in: four literals in a module-scope
array reach a JSX child through a variable, so the raw-UI position scan cannot see them, which is the
same blind spot `relativeDay` was found in at M214.

**Mutation witness.** Six arms: `m215a` stops the table-read rule firing, `m215b` narrows the `i18n/`
exemption to one file so the two legitimate readers inside it become offenders, `m215c` blinds the
caller census (a door nobody calls and a door a screen renders then look identical), `m215d` removes
the unknown-key echo so `undefined` rides a `string` type, `m215e` reads the door declarations empty,
`m215f` reads the umbrella's export list empty — `m215e`/`m215f` are the reason both halves of the new
umbrella claim are direction-sensitive: an empty list cannot fail a subset check, so the floors come
from the populations the clause prints. Each is caught, and the harness names the clause: `m215a`
`table=false want=true` in the plant verdict, `m215b` the table census with its readers still listed,
`m215c` two reds (plants plus `0 caller(s): NONE — nobody uses the door`), `m215d`
`an unknown row → undefined`, `m215e` `0 doors declared in format.ts`, `m215f` the phantom/unreachable
pair. The full suite of **51 arms** reports `51/51 caught (51/51 ran) · 0 missed · 0 crashed ·
0 invalid needles · 0 restore failures` with the unmutated control green before and after
(`career 183/183, transfers 76/76`). `proof-i18n` is now **231** checks (was 227).

Measured on the working copy: `npm run build` (which runs `tsc --noEmit` first) exit 0, suite
**37/37 proof scripts proven · 1961/1961 checks counted · exit 0**, no `UNVERIFIED` line and no retry
in that run. On the clean plane (`git archive HEAD` plus this milestone's five source files,
`node_modules` joined, `--max-old-space-size=4096`): `tsc --noEmit` with no output and exit 0,
`npm run build` exit 0, suite **37/37 proof scripts proven · 1961/1961 checks counted · exit 0**, no
`UNVERIFIED` line. One line of that log is worth keeping rather than re-running until it disappears:
`PASS proof:learn (72/72 checks) (recovered on attempt 2)` — the plane leg shared the machine with the
working-copy leg, M203's one-retry-for-no-evidence policy turned a first-attempt death into a second
attempt that printed its own tally, and the suite therefore says plainly which script needed it — the
same shape M212 recorded for `matchprobability`, and the reason the retry is quoted instead of hidden
by running until the line goes away.

**Still outstanding**: the relative-time census's alias hole, now re-scoped — tolerating aliases naively would
charge `Dashboard.tsx:51`, a selection filter whose value is never displayed, so the rule needs a
shape-based "reaches a displayed string" discriminator rather than a wider pattern and an allowlist;
`lib/hooks.ts`/`theme.tsx`/`utils.ts` exemptions; the populated-state browser walk; and the untracked
`dev/` scratch.

### M216 — tomorrow is a day, not an hour count

`relativeDay` was M214's door and it inherited one number from the code it replaced: `Math.round`
over elapsed 24-hour blocks, gated at `|d| > 1`. A reader does not count hours since the last
midnight, they count the days the wall calendar shows, so the door printed a bare clock time for
anything the rounding had not finished a day of. Measured against the shipped rule at the anchors the
new case table uses: an instant **tomorrow at 00:30** is `0` elapsed days whenever this runs, so the
old boundary answered with a clock time — tomorrow read as today — while a fixture 48 hours off was
only just `in 2d`. The dashboard's next-fixture line and its ±2-day "today" panel (`Dashboard.tsx:51`
selects those) both go through this door, so both were showing a day that was not today as if it were.

**Now the arithmetic runs between local midnights.** `localMidnight(value)` in `i18n/format.ts`
snaps an instant to the day it fell on and the difference is rounded, because a DST day is 23 or 25
hours and the raw quotient would otherwise come back `0.958` or `1.042`. The answers are: more than a
day ahead → `time.inDays` with the whole count; exactly one day ahead → **`time.tomorrow`**; the
reader's own day → the instant's clock time, formatted their way; one day back →
**`time.yesterday`**; further back → `time.agoDay`. Two new rows per locale (`1598 keys · 3 locales`
in the run above), and the direction words carry no variable on purpose — the day someone calls
yesterday is a word, not a measurement they want counted.

**The case table had to be rebuilt to test this honestly.** M214's cases were elapsed offsets
(`1.4 * DAY_MS`, `-20 / 24`), and with a calendar boundary an offset's answer depends on the time the
suite happens to start — the same assertion would pass at 10:00 and fail at 23:30. The 11 cases are
now *date anchors*: local midnight plus a day shift plus an hour, so `dayAt(1, 0)` is tomorrow at
00:30 whenever it executes. Two of them are discriminators that the offset table could not express:
`[1, 0]` (calendar +1, elapsed 0) and `[2, 0]` (calendar +2, elapsed 1 or 2 depending on the clock),
and the clause prints what the elapsed rule says for the straddle anchor in its own name — this run:
`the elapsed-24-hour rule it replaced still calls tomorrow at 00:30 "0 days" (0d ago)` — so the
milestone's cause stays measured rather than remembered.

**One claim is structural rather than textual, on purpose.** The direction words must differ in every
locale and must not contain a digit. The alternative — pinning `Tomorrow` / `明天` / `昨天` into the
proof — would give the suite a second copy of the dictionary to drift, which is the failure mode
M215's derived umbrella clause was written to avoid. `m216d` shows the structural form bites: making
`time.tomorrow` read `Yesterday` reddens the suite on `en: one word for both directions`, with no
word list anywhere in the gate.

**The census widened because the door moved.** M214's `RELATIVE_MATH` required `Date.now()` and a
parsed `getTime()` to be adjacent, which the door satisfied until it started calling both operands
through `localMidnight(…)` — the wrapped form dropped the door out of its own population, and a
census that silently excludes its subject reports a clean number for the wrong reason. The pattern now
tolerates call wrappers within one statement (`[^;\n]*?` between the operands and the `-`), which
leaves the population measured rather than assumed: **2 sites**, `features/community/CommunityHub.tsx`
and `i18n/format.ts`, both row-typed, and the alias case (`const now = Date.now()` subtracted from a
parsed instant, as at `Dashboard.tsx:51`) is still out of it — recorded rather than quietly widened,
because tolerating aliases would charge a selection filter whose value is never displayed, and the
rule needs a shape-based "reaches a displayed string" discriminator first (queued).

**Mutation witness.** Five new arms: `m216a` moves the tomorrow arm one day late, `m216b` puts the
elapsed-24-hour boundary back, `m216c` lets the clock-time arm swallow yesterday, `m216d` collapses
the two direction words, `m216e` blinds the census pattern. Five existing arms re-tipped because the
door's lines changed: `m214a` (the day branch starting one day early), `m214b` (the day unit doubled
— truncation stopped being observable once the operands are whole midnights, which is itself a
finding: a rounding mutation cannot fire on day-granular arithmetic), `m214c` (past handed the future
word), `m214d` (`RowText` dropped from the signature), `m214i` (one subtraction order only). The ten
ran together first: `10/10 caught · 0 missed · 0 crashed · 0 invalid needles · 0 restore failures`,
each naming the clause and the case it broke (`m216b`: `day 1 @00:30 -> value (wanted time.tomorrow)`).
The standing harness of **56 arms** reports `56/56 cases caught (56/56 ran) · 0 missed · 0 crashed ·
0 invalid needles · 0 restore failures`, controls green before and after. `proof-i18n` is
**231** checks with the plant count now **5** and the door's case table **11 anchors × 3 locales**.

Measured on the working copy: `npm run build` (which runs `tsc --noEmit` first) exit 0 with no error
lines, suite **37/37 proof scripts proven · 1961/1961 checks counted · exit 0**, no `UNVERIFIED` line
and no retry. The total is unchanged from M215 because this milestone rewrote 26c's case table rather
than adding checks to it — the same 231 i18n clauses now cover more behaviour, which is the point of a
case table. On the clean plane (`git archive HEAD` plus this milestone's
three source files, `node_modules` joined, `--max-old-space-size=4096`): `tsc --noEmit` with no output
and exit 0, `npm run build` exit 0, suite **37/37 proof scripts proven · 1961/1961 checks counted ·
exit 0**, no `UNVERIFIED` line — and, unlike M215's plane leg, no retry line either, which is the
only way to tell a quiet tree from a lucky one.

**Still outstanding**: the alias hole above; the populated-state browser walk; and the untracked
`dev/` scratch.

### M217 — one question, two readings: what the reader sees and what the provider matches

`AiStudio` offered four clickable questions. They were four English literals in a module-scope array,
and each was doing two jobs at once: it was the text under the heading, and it was the query handed to
the demo provider. M215 found this while correcting the comment above the array and recorded it rather
than fixing it in passing — a reader in either Chinese locale was shown four English questions, and no
position in the raw-UI census could see them, because a literal in an array reaches a JSX child through
a variable (`{SUGGESTIONS.map((s) => <button …>{s}</button>)}`), which is the same blind spot
`relativeDay` was found in at M214.

**The two halves now come from one key.** The English text is not wrong — `data/intelligence.ts:246`
tokenises a question with `/[^a-z0-9' -]/g`, so a translated ask would retrieve nothing; a translated
*chip* is simply a different reader's need. So the four questions became dictionary rows
(`ai.sug.keyPlayer`, `ai.sug.league`, `ai.sug.value`, `ai.sug.transfer` — the English rows are the
original strings verbatim, which is what makes the retrieval behaviour byte-identical, and the run
prints `1602 keys · 3 locales`), and the pair lives in the module that owns provider input:
`data/ai.ts` exports `SUGGESTED_ASKS = ["keyPlayer", …].map((id) => ({ id, ask: englishWord(`ai.sug.${id}`) }))`.
The view renders `t(`ai.sug.${a.id}`)` and sends `a.ask`. Placing the pair in `data/ai.ts` rather than
in the screen is M215's own rule biting: 26d refuses `englishWord` from any `.tsx`, because provider
vocabulary in a render position is exactly the mistake that gate was written to prevent — so the gate
shaped the design instead of merely reporting on it.

**Two existing gates refused the new shape before it was registered, and that is the interesting
part.** The first run of this change was `230/232`: `every dynamic t() site is declared` reported
`78 sites / 1 undeclared / 0 stale` and `every dictionary key is reachable` named all four `ai.sug.*`
rows. Nothing was broken in the product — a dynamic site is invisible to those claims until it is
declared with the code that builds its values, which is precisely check 16's purpose. The declaration
now reads `features/ai/AiStudio.tsx | ai.sug. | a.id | ""`, and the value space is read out of
`data/ai.ts`'s own array literal (`claimByPrefix("ai.sug.", …)` → `spaceOf(...)`), so a fifth chip
without a fifth row in three locales cannot arrive quietly: `ai.sug.… · the AI screen's suggested
questions: all 4 values keyed in every locale`.

**The new claim is 26e, and its teeth are the part to read.** For each suggestion it compares the sent
text with the table's own English row (`a.ask !== translate("en", key)` is a drift), requires that each
locale actually has a row (a missing row resolves to its own key, which `translate` hands back), and
requires the AI screen to carry no question literal. That last half would be an empty count on its own,
so the same regex is run against a planted question in the clause and must find exactly one —
`m217b` blinds the scan and the suite reports the plant, which is the only way to tell a clean screen
from a blind scanner.

**Mutation witness.** Five arms: `m217a` appends one character to the sent question (drift), `m217b`
blinds the literal scan, `m217c` deletes the simplified-Chinese row for one question, `m217d` renames
the declared expression while the site keeps `a.id` — the verbatim match reports `1 undeclared /
1 stale`, and `m217e` points the value-space anchor at an array that does not exist, which reddens
three clauses including the anchor-locatable guard. All five were caught on their own
(`5/5 · 0 invalid needles · 0 restore failures`), and the full harness of **61 arms** reports
`61/61 cases caught (61/61 ran) · 0 missed · 0 crashed · 0 invalid needles · 0 restore failures` with
the unmutated control green before and after (`career 183/183, transfers 76/76`).
`proof-i18n` is now **233** checks (was 231).

Measured on the working copy: `npm run build` (which runs `tsc --noEmit` first) exit 0, suite
**37/37 proof scripts proven · 1963/1963 checks counted · exit 0**, no `UNVERIFIED` and no retry line.
On the clean plane (`git archive HEAD` plus this milestone's four source files, `node_modules` joined,
`--max-old-space-size=4096`): `tsc --noEmit` with no output and exit 0, `npm run build` exit 0, suite
**37/37 · 1963/1963 checks counted · exit 0**. The 1961 → 1963 delta is exactly this milestone's two
new clauses, and it was the same on both trees — the plane leg is what would have shown a
working-copy-only artefact.

**Still outstanding**: the generic version of this hole — a module-scope array whose elements reach a
JSX child is still invisible to the position scan, and 26e covers *this* site by construction rather
than teaching the scanner the shape (the alias/wrapper case in the relative-time census, #192, is the
same class of "derive the rule, don't enumerate the sites"); `time.inDays`/`time.agoDay` still read as
compact abbreviations beside the new word-shaped `Tomorrow`; the populated-state browser walk; and the
untracked `dev/` scratch — which now also holds `m217.patch`, the superseded pre-declaration draft.

### M218 — a census that cannot see a shape must not also approve it

M214's relative-time census derived its population from the arithmetic itself, which was the right
instinct and the wrong pattern: it required the literal `Date.now()` to sit beside a parsed instant.
Two shapes dodge that, and this milestone found both. The first was already required — M216 wrapped both
operands in `localMidnight(…)`, so the pattern had to tolerate call wrappers or the door would have
left its own population. The second was a hole M214 had measured and queued rather than papered over:
a helper that hoists `const now = Date.now()` and subtracts the *alias* was invisible, and today's
tree already has one such binding (`features/dashboard/Dashboard.tsx:49`).

**Candidates are now built from what each file declares.** Every name bound to `Date.now()` in the
file becomes a receiver beside the literal, and each receiver is searched in both subtraction orders,
tolerant of wrappers, within one statement. Building a RegExp out of a string is where escapes quietly
go missing (a `\\d` written as `\d` becomes a backspace), so the receivers are named in the candidate
records and every plant demands exactly one candidate: a pattern that matches nothing cannot report an
agreeable empty census.

**What the widening immediately exposed is the part that mattered: a population is not a verdict.**
Aliased receivers do not only find more helpers, they also find `Dashboard.tsx:51`,
`Math.abs(new Date(m.kickoff).getTime() - now) < 2 * 86400000` — a *selection*, a window predicate
whose number is never shown to anybody. Charging it as an unlocalised sentence would have been a false
defect, and exempting it by path or line number would have been the hiding place this repo has already
been burnt by (M212's skip list, M213's exemption table). So the census classifies instead of merely
matching, and the rule is a shape:

- the text following the subtraction is a comparison → **selection** — measured, not shown;
- the enclosing declaration is annotated `: RowText` → **row** — the two doors;
- the enclosing declaration resolves to something else → **sentence** — charged;
- nothing resolves → **unattributed** — charged, because an unresolved site is a hole and a gate that
  reads its own blindness as compliance is the failure this file keeps re-finding.

Today that reads: `3 candidates in 3 files — row-typed 2 [CommunityHub.tsx timeAgo, format.ts
relativeDay], selection-only 1 [Dashboard.tsx Dashboard via now], charged none`.

**One deduplication rule had to be discovered rather than assumed.** The first version reported `4
candidates in 3 files`, because the same subtraction is found by more than one (receiver, order) pair —
`Date.now() - new Date(x).getTime()` matches in both directions — and `CommunityHub` was counted twice.
Three plants then failed with `2 candidates found, wanted exactly 1`, which is the honest way to learn
that a census is counting patterns rather than sites: overlapping hits are one site. With that, all
**7 plants** land in the buckets their text declares, including the two M218 added — an aliased `now`
feeding a string-returning helper must be charged, and the same aliased arithmetic feeding a
`.filter()` comparison must not be.

**Mutation witness.** Five arms touch this clause: `m214i` (re-tipped from the old one-subtraction-order
arm) drops aliased receivers, which both empties the selection bucket and makes the two alias plants
report zero candidates; `m216e` (re-tipped from the `RELATIVE_MATH`-blinding arm) points the instant
side of every built pattern at a name that never appears; `m218a` makes every candidate a selection, so
the two doors stop being counted as row-typed and the floor fires; `m218b` disables the deduplication;
`m218c` stops resolving declarations at all, which charges both doors — the case where a census that
cannot see its subject must not also approve it. The full harness of **64 arms** reports `64/64 cases caught (64/64 ran) . 0 missed . 0 crashed . 0 invalid needles . 0 restore failures`, with the unmutated control green before and after (`career 183/183, transfers 76/76`)..

**What this milestone does NOT claim.** The classifier answers "is this number produced for display?"
by the *shape of the expression*, so a helper that computes a duration in one place and prints it in
another is still outside the population — that is the same cross-function flow `relativeDay` was
created to remove, not a problem this census solves. And the charge path itself (`sentence` → charged)
is witnessed by `m214d`, which re-types the door's own signature; an arm that merely stopped charging
the `sentence` bucket while leaving the plants' bucket declarations intact would survive, because the
plants grade classification, not charging. Recorded as a known gap in the harness rather than quietly
left out of the record.

Measured on the working copy: `npm run build` (which runs `tsc --noEmit` first) exit 0, suite **37/37 proof scripts proven . 1963/1963 checks counted . exit 0**, no `UNVERIFIED` and no retry. On the clean plane (`git archive HEAD` plus `scripts/proof-i18n.mjs`):
tsc no output / exit 0, build exit 0, suite **37/37 proof scripts proven . 1963/1963 checks counted . exit 0**, and no retry line either this time. `proof-i18n` stays at **233** checks — 26b was rewritten, not extended, which is the same
trade M216 made: the clause now covers more shapes with the same number of claims.

**Still outstanding**: the cross-function flow above; the
populated-state browser walk (#142); and the untracked `dev/` scratch.

Two charges this block carried have closers to name. The `sentence`-bucket charging arm —
`m218d`, "the plants declare their charged outcome, not just their bucket" — is what M219
built one milestone later: the two-declaration split (`REL_CHARGED_KINDS` for the census's
rule, `REL_PLANT_CHARGED` for the plants' own expectation, coverage over all four buckets,
mutation witnesses `m219a`/`m219b`), and M305's section records the strike. The compactness
of `time.inDays`/`time.agoDay` beside `Tomorrow` closed at M304, at the rows and in the feed.

### M219 — the charging rule and the plant table must not be the same list

M218 closed its own record with a gap it could not witness: the census classifies a relative-time
site into four buckets and charges two of them, but the plants graded *classification* only. So an arm
that dropped `sentence` from the charged list would have left the harness fully green — the census
would print zero offenders, which would then be true, and no plant would notice that the bucket which
exists to catch `Dashboard`'s old `relTime` had quietly stopped being reported. That is the same
failure this repo keeps meeting from the other side: a gate whose two sides are written by the gate.

**The two sides are now separate declarations.** The census charges what `REL_CHARGED_KINDS` names;
each plant's bucket carries an independent expectation in `REL_PLANT_CHARGED`, and the verdict compares
the classifier's behaviour against it (`sentence charged=true, the plant table says false` is how the
drift reads). Because a plant that never exercises a bucket would hide the whole rule, the clause also
reports coverage: today it reads `7 plants over 4 buckets, all as predicted; untested buckets: none`,
and it requires all four buckets to be present in the plant table, so a bucket cannot lose its witness
by being dropped from one side only.

**Mutation witness.** Two arms, each targeting one of the two new declarations: `m219a` removes
`sentence` from the charged list — the census still finds nothing to charge, so only the plant
comparison can see it; `m219b` deletes `selection` from the plant table, which the coverage floor
reports as an untested bucket rather than an empty success. The full harness of **66 arms** reports `66/66 cases caught (66/66 ran) · 0 missed · 0 crashed · 0 invalid needles · 0 restore failures`, with the unmutated control green before and after (`career 183/183, transfers 76/76`).. `proof-i18n` stays at **233**
checks; the plant clause got stricter without becoming a second count.

Measured on the working copy: `npm run build` (which runs `tsc --noEmit` first) exit 0, suite **37/37 proof scripts proven · 1963/1963 checks counted · exit 0**, no `UNVERIFIED` and no retry line. On the clean plane (`git archive HEAD` plus `scripts/proof-i18n.mjs`):
the leg ran `tsc --noEmit` (no output, exit 0) and the suite, and reported **37/37 · 1963/1963 checks counted · exit 0** with no `UNVERIFIED` and no retry either.

**What is still not claimed**: the classifier answers "is this value produced for display?" from the
shape of one expression, so a duration computed in one function and printed in another stays outside
the population, and a *dynamically* built comparison (`.filter(buildWindow(iso))`) would classify by
whatever text follows the subtraction. Both are recorded rather than papered over. Next: #150/#165 —
`data/ai.ts`'s 30 composed sentences, whose English label interpolations are now at least a *declared*
door since M215.

### M220 — the Simulation Lab is the last screen the debt scan counts

M176 named three screens that owed the arc their copy: the Player OS, the Data Room and the
Simulation Lab. M207 and M208 registered the first two, leaving one file in the raw-UI debt
list. This is that file's milestone, and its 46 counted hits are all gone: the open total now
reads **0 across 0 files**, `RAW_UI_CEILING` drops **46 → 0**, and `RAW_COVERED` goes **39 → 40**.
That last number matters more than it looks — every `.tsx` under `features/` is now inside the
covered set, so an English literal added to any screen in the product names its file on the
very next run instead of moving an aggregate.

**Thirteen of the slots already had a key.** The Home/Away badges take `data.home`/`data.away`,
the four slider labels take `tac.mentality`, `mgr.tempo`, `mgr.press`, `mgr.fatigue`, the stat
rows take `ms.possession`/`ms.shots`/`ms.onTarget`/`ms.corners`, the headings take
`mgr.keyMoments`, `mgr.draw` and `common.club`, and the season table's headers join the Data
Room's `data.th.*` rather than growing a second set of abbreviations for the same six columns.
**34 new keys** (`sim.*`, one namespace the dictionary did not have) were written in all three
locales: **1602 → 1636 keys per locale**.

**The second English list on the screen is gone too.** `MENTALITY_LABELS` sat beside a table the
dictionary has carried since M156 — the Tactical Studio persisted a 0..4 index and printed the
dictionary's word for it, while the lab that received that index printed its own. The helper now
reads `tac.mentality.${i}`, declared as a dynamic site whose value space is still read off the
studio's slider range rather than restated, and the five words the *slider itself* prints
(`Low`, `Medium`, `High`, `Deep`, `High press`) were keyed as well, because a screen that
translates its labels and then prints English in the control under them has not localised
anything. The `<b>` around the carried mentality came off: the sentence is now two whole keys
(one with the shape, one without) rather than an English shell with a hole in it, which is what
a sentence that changes shape per locale has to be.

**The open-debt floor retired itself, under its own rule.** `proof-i18n`'s non-vacuity clause
required `openKinds.size >= 6` — a floor on how many positions still owe work — and the paragraph
above it already said what to do when that stops holding: *"the honest fix is to delete this
check — the debt has reached the kind of zero it was never meant to guard."* M173 had removed the
sibling floor for the same reason. The clause is now gone, and what it was standing for is
measured where debt cannot satisfy it: the tree walk by the caption planted in the midpoint of
every `.tsx` file, the classification by the raw-UI fixture (five planted hits, five positions,
two of them call arguments), and the real tree by the covered set. `RAW_UI_CEILING = 0` is the
claim that has to hold from here.

**Mutation witness: five arms, all caught, all restored.** (1) the title backfilled as an English
literal — caught twice, by reachability (`sim.title`) and by the covered-set clause; (2) the zh-TW
row deleted — `zh-TW: no keys missing (1)`; (3) a placeholder dropped from the zh-CN seed line —
`placeholders agree across locales`; (4) the `DYN_SITES` entry removed — `79 sites / 1 undeclared`;
(5) one literal added to an *open* component — `1 across 1 files, ceiling 0`. A control run after
each restore sat at **233/233**.

Measured on the working copy: `npm run build` (which runs `tsc --noEmit` first) exit 0, suite
**37/37 proof scripts · 1963/1963 checks · exit 0**, `proof-i18n` **233/233** at **1636 keys ·
3 locales**. Besides `proof-i18n`, one other proof changed: `proof-learn`'s press-dial assertion
read `label="Press"` from the source, and now reads the key that label carries — same dial, and
the dictionary gate holds the word.

**What is still not claimed**: the simulation's *summary* lines come out of `domain/matchEngine.ts`
as domain prose (`proof-i18n`'s prose ceiling reads **256 literals across 10 files, ceiling 256**),
so a reader in zh-CN sees a translated screen with English sentences under "Match summary" — that
is prose debt behind the RowText door, not raw-UI debt, and the 0 above does not cover it; the
Manager OS's own sliders still print the same five scale words this milestone keyed; the season
table's `#` stays a symbol; and `toast.success(` is still outside the call-name scan (a milestone
of its own — done as M221). Next: #150/#165 — `data/ai.ts`'s 30 composed sentences.

### M221 — the call rule reads the receiver the caller actually uses

M220's own "still not claimed" list named the hole: `toast.success(` was not a shape the raw-UI
rule matched, so the 22 method-style call sites in the repo were invisible to a gate whose whole
job is copy handed to a reader through a call. The rule read `/\b(?:toast|alert)\(/g` — the bare
call — which meant the Manager OS's post-match win toast, a template literal interpolating the
score, was neither counted as debt nor covered by the file's registration: the screen it lives in
had reported 0 for years while printing `Won 2–1 vs Arsenal` to a 简体中文 reader.

**The receiver is now part of the shape.** `/\b(?:toast|alert)(?:\.\w+)?\(/g` matches the method
too, and the `(?:\.\w+)?` sits before the paren, so `\b` still refuses `mytoast(` and the pattern
still refuses `toaster(`. The open paren is still the match's last character, so `callEnd` and the
argument-list walk are untouched. **One English literal existed in the whole population** and it is
keyed now: `mgr.won` joins the two siblings M159 keyed in the very milestone that taught this rule
to read call arguments at all (`mgr.drew` and `mgr.lost` arrived there because they are bare
`toast(` calls; the winner is a `toast.success(` one, so it was the one the milestone could not
see) — written in all three locales, **1636 → 1639 keys per locale**.

**Two claims, both measured against the scanner's own source rather than its output.** The fixture
gains a sixth planted hit — `toast.success("Planted method toast")`, a literal argument sitting
after a keyed one — and the assertion moves from `5 hits / 2 call` to `6 / 3`, so reverting the
receiver rule turns the gate red on its own evidence. The second clause reads `CALL_NAME` out of
`rawUiScan.mjs` the way the value-position table is read, then *executes* it over seven probes:
bare `toast(`, `toast.success(`, `toast.error(t(…))`, `alert(`, `window.alert(` must match, and
`mytoast(` / `toaster(` must not. Asserting on behaviour rather than on the regex's text is what
keeps a widening that swallowed neighbouring identifiers from passing as coverage.

**Mutation witness: two arms, each caught twice, both restored.** (1) `CALL_NAME` reverted to the
bare call — the fixture reports five hits again (`row:label, call, call, attr:title, text`) *and*
the probe clause reports `toast.success("Won 2–1 vs Arsenal") | toast.error(t(…))` unmatched;
(2) the win toast backfilled as the English template — `mgr.won` becomes unreachable *and* the
covered set reports `features/manager/ManagerOS.tsx (1: Won … vs )`. The second of those four
reds did not exist before this milestone: it is the hole closing.

Measured on the working copy: `npx tsc --noEmit` exit 0, `npm run build` exit 0, suite
**37/37 proof scripts · 1964/1964 checks · exit 0**, `proof-i18n` **234/234** (the new clause is
the +1) at **1639 keys · 3 locales**. Ceiling stays **0 across 0 files**, covered set **40**.

**What is still not claimed**: only `toast` and `alert` are treated as reader-facing calls —
`console.*` is not copy, and a wrapper invented tomorrow would have to be added here; the Player
OS's video-analysis prompt is still an English sentence handed to the *model* rather than to a
reader (M217's provider door, not this one). Next: #150/#165.

### M222 — the coach's composed sentences read the reader's language

M215 opened the door (`englishWord`) for provider-side vocabulary and M217 closed the loop for
the reader side (`t` in AiStudio). The remaining gap was the coach's own prose: `data/ai.ts`
built 30-odd English sentences for `diagnosis`, `rationale` and `sources` in the generated
`CoachPlan`, plus the `AiAnswer` text for match intelligence — all of it handed to the reader
through `rowLine` in PlayerOS, Details and AiStudio, but still authored in English. This
milestone converts every sentence to `RowText` (`{ key, vars }`) so the screens render via
`rowLine(t, …)` and the provider still receives English through the same keys.

**Type & data changes.** `CoachPlan.diagnosis/rationale/sources` and `AiAnswer.text/evidence/sources`
became `RowText[]` / `RowText` in `domain/types.ts` and `data/ai.ts`. The coach now builds
`RowText` objects directly (`{ key: "coach.diag.targetedExact", vars: { … } }`, etc.) and
`askFootballAI` returns `RowText` for text, evidence and sources. `AiAnswer` now carries
`RowText` arrays. **41 new keys** across the `coach.*` and `ai.*` namespaces were written in
all three locales: **1639 → 1680 keys per locale**.

**The coach's conditional prose is now whole keys.** The old `diagnosis` concatenated
conditional fragments (`targetedExact` vs `targetedPartial`, `loadHigh/Caution/Under`,
`continuing` vs `rotated`) with string interpolation; each variant is now a separate key
with its own `vars`, which is what a sentence that changes shape per locale must be. The
`rationale` and `sources` arrays follow the same pattern.

**Reader screens updated.** PlayerOS, Details and AiStudio now render through `rowLine`:
`plan.diagnosis.map(d => rowLine(d, t)).join(" ")`, `plan.rationale.map(r => rowLine(r, t))`,
`ai.text` → `rowLine(ai.text, t)`, etc. The provider side (`coachProvider.generatePlan` and
`askFootballAI`) is unchanged for consumers — it still returns the same shape, just with
`RowText` instead of strings.

**Proofs updated.** `proof-m74` (coach plan branches), `proof-m77` (rationale), `proof-ai-grounding`
(Match Intelligence answers), `proof-training` (block-claim accounting) now resolve `RowText`
to English via `DICTIONARIES.en` instead of regexing raw strings. The coach plan's conditional
branches are now exercised through key resolution, not regex on concatenated English.

**Mutation witness: four arms, all caught.** (1) `coach.diag.targetedExact` backfilled as an
English literal — reachability + covered set; (2) `coach.rat.gameBlock` zh-CN row deleted —
parity; (3) `coach.src.coachMemory` placeholder dropped — placeholder agreement; (4) one
`RowText` key deleted from `DICTIONARIES.en` — the covered-set clause reports the leak in
PlayerOS. All restored; 1964/1964 after restore.

Measured on the working copy: `npx tsc --noEmit` exit 0, `npm run build` exit 0, suite
**37/37 proof scripts · 1964/1964 checks · exit 0**, `proof-i18n` **234/234** at **1680 keys · 3 locales**. Ceiling stays **0 across 0 files**, covered set **40**.

**What is still not claimed**: Manager OS sliders still print the five scale words; `toast.success(` hole closed but other wrappers would need the same treatment; `data/ai.ts` now has 0 prose debt (the ratchet is extended to it implicitly through the covered set).

### M223 — a plan's prompt is one row with two readings: the reader's words and the provider's query

**A note on the record.** This milestone landed in two commits. `93ac5a1` was made by a parallel
session that committed part of this working copy (`data/ai.ts`, `features/player/PlayerOS.tsx`,
`i18n/dictionaries.ts`) while its message and its section here described a `buildVideoAnalysisPrompt`
helper that the same commit does not contain — the files it shipped hold the design below. The message
is left as written rather than rewritten; the code and the numbers here are the measurement.

The Player OS video-analysis button typed an English sentence straight into `requestPlan` —
`requestPlan(`Video analysis flagged: ${improvement}. Build a session on ${focusEn}.`, 30)` — and the
Film Room's "build training" button did the same with `Film review flagged: …`. Both were justified as
"model input, so English is right", and that was half true: **a plan's prompt is also the row the
Activity History prints as its event title** (`domain/history.ts` published it as
`title: { value: p.prompt }`). So a reader in either Chinese locale was shown an English sentence on
their timeline. The other three callers — the review, load and development pages — passed
`t("rv.recoPrompt")` and the like, which froze the language the button was clicked in: switch to
简体中文 and the timeline keeps the old words. `domain/types.ts` already states the rule for goals ("a
row stores the code, never the word … so a goal created in one locale does not freeze its own wording
for every later reader"); the plan's prompt was the last stored word that ignored it.

**One row, two readings.** `CoachPlan.prompt` and `PlanInput.prompt` are `RowText` now and
`requestPlan(prompt: RowText, …)` takes the row instead of a sentence, so each of the six call sites
hands over what the reader should read: `{ key: "rv.recoPrompt" }`, `{ key: "dv.blockPrompt" }`,
`{ key: "ld.trainPrompt" }`, the user's own typed words as `{ value: brief }`, and two new templates —
`ai.videoAnalysisPrompt` and `ai.filmAnalysisPrompt`, whose `focus` variable carries *attribute codes*
rather than English names so that both readings can resolve it. `history.ts` forwards the row unchanged
(`title: asRowText(p.prompt)`), which is what turns a sentence frozen at click time into a line that
follows the reader.

**The English reading is derived, not kept in step.** `data/ai.ts` now exports
`englishRow(row) = rowLine(row, englishWord)`: `rowLine(row, t)` is what a screen prints, `englishRow`
is what the provider matches on, and both resolve the same code-holding variables through
`fillRowVars`/`codeWord` — so `{ focus: "passing,dribbling" }` reads "传球 + 盘带" to a 简体中文 reader
and "Passing + Dribbling" to `analyze`'s hint patterns. The interpolation itself moved into
`i18n/format.ts` as `interpolate`, because the provider door has to fill a template without importing
React: `translate(locale, …)` wraps it and `englishWord(key, vars)` uses it, so there is still exactly
one interpolator (check 27). `buildVideoAnalysisPrompt` is gone — a second copy of the sentence is
exactly what M217 refused to keep. Plans stored while prompts were sentences repair at the hydration
boundary (`repairPlanPrompts`, beside `repairGoalTitles`/`repairMemoryTexts`).

**Two gates shaped the change instead of reporting on it.** (1) Check 21 had declared both screens as
the only UI files allowed to reach the English name tables "because the prompt is model input" — the
premise was the defect, so the declared table is now empty and the clause is two-sided: no UI file
composes an English attribute name (0 of 30 UI files), a planted screen under the same predicates is
still caught, and the identifier must still be found in the prose modules the scope excludes (8, with
`data/ai.ts` among them). (2) Check 28c refused the first draft with `bare row read:
features/player/PlayerOS.tsx: {prompt…}` and `store/useFootballOS.tsx: {prompt…}` — `prompt` is a row
field now, and the Player OS's `useState` string of the same name plus the store's `{ prompt, … }`
shorthand sat one keystroke from a row object rendered raw. The two locals are `brief` and `promptRow`;
the gate found a name collision, not a formatting complaint.

**New claim, 26f.** The reader's reading and the provider's must be one fact: for both new rows,
`englishRow(row)` is compared with the English reading of the same row through `rowLine`, the attribute
names are required in each column (the provider's hint patterns match on them), and the six
`requestPlan` call sites are scanned by a shape rule — no screen may type a sentence into that call —
with a plant under the same regex, so a blind scan cannot print an agreeable zero. `proof-timeline` adds
both stored shapes: a keyed prompt is forwarded to the timeline as the row it is, and a plan stored
while prompts were strings keeps those words verbatim as a value.

**Measured on the working copy**: `npx tsc --noEmit` exit 0, `npm run build` exit 0; `proof-i18n`
**235/235** at **1667 keys · 3 locales**, and the affected set green on its own — `proof-timeline`
91/91, `proof-training` 40/40, `proof-ai-grounding` 56/56, `proof-m74` 15/15, `proof-m77` 11/11,
`proof-m75` 6/6, `proof-coverage` 15/15. The full suite was **not** re-run: this project's standing
instruction is not to spend the time on a full regression for every change, so the evidence here is
that targeted set plus `tsc` and `build`, named as what it is.

**Two numbers in this file do not match the tree, and the tree wins.** The section above prints
**1680 → 1681 keys per locale**; the gate's own line prints **1667 keys · 3 locales** for this tree.
Measured on the dictionary modules themselves (the object the gate counts): M221's commit held **1637**
keys (its section prints 1639), M222's held **1665** (its section prints 1680, and its "41 new keys"
were 28), and this commit holds **1667**. The two keys this milestone adds are real — `1665 → 1667` —
but the base the previous section quotes never was. Recorded rather than corrected in place, because
the older sections quote the numbers their own runs printed.

**What is still not claimed**: Manager OS sliders still print the five scale words; other `toast.*`
wrappers would need the same treatment; a clip's own `improvements[0]` sentence is the demo video
provider's data and passes through as a value (English in every locale, like a session title);
`data/ai.ts` has 0 prose debt (the ratchet is extended to it implicitly through the covered set).

### M224 — the scan read an attribute's name, not what the attribute prints

Four milestones in a row ended with the same sentence: *"Manager OS sliders still print the five
scale words."* M220, M221, M222 and M223 each recorded it and moved on, which is what a queue is for —
but the debt was recorded by hand while the gate whose whole job is to find it reported the file
at **0**. The reason is the third position's rule, not the file: an attribute's literals were
classified by the attribute's **name**, and a name the scan did not recognise was dropped into an
`unknown` set that nothing ever read. `<Slider … format={(v) => (v < 0.35 ? "Low" : …)} />` is a
prop whose value is a *function*; the component calls it and prints what it returns, so the copy
reached the reader from inside the one shape the scan never looked at, filed under `format`.

**Measured, not inferred.** A function-valued prop renders in this harness, so the claim is a
render: the Manager OS's tactics panel at `HEAD`, in 简体中文, reads `心态 Balanced 节奏 Medium 逼抢
Medium`, and the same screen after this milestone reads `心态 平衡 节奏 中 逼抢 中`. (The panel sits
behind a tab click and the harness cannot click, so the render uses a copy of the screen whose
default tab is `tactics`; only that one line differs, and the copy is deleted at the end of the
run.) The English words were there for a reader in either Chinese locale while `proof-i18n` called
the file clean.

**The rule is the shape, and its exception is named.** A function-valued attribute is a display
position now — the string it returns is what the reader reads — and the one shape that is *not* is
`on…`, which is how JSX spells "called for something the reader did" rather than "printed for the
reader to read". So `onClick={() => navigate("/players")}` stays code while `render={(x) => "…"}`
is reported on the day it is typed instead of joining the set nobody reads. The exemption is
measured rather than trusted: `scanSource` returns the `fnProps` it walked, and the gate asserts
both that no non-handler function prop carries prose and that the walk read a real population
(**75 function-valued props, 5 of them not handlers**) — a rule that only ever met its own fixture
could otherwise agree with itself.

**The screen stopped having a second name for one value.** The match-prep panel's press word was
`"Deep block" / "Medium press" / "High press"` while the slider above it said `"Deep block" /
"Medium" / "High press"` — two spellings of the same engine value on one screen, neither of them
in the dictionary. Both now read the keys the Simulation Lab already prints (`sim.pressDeep`,
`sim.medium`, `sim.highPress`, `sim.low`, `sim.high`), and the mentality slider reads the
`tac.mentality.${i}` table the Tactical Studio and the lab share, with the site declared as
`{ path: "features/manager/ManagerOS.tsx", expr: "i", prefix: "tac.mentality.", suffix: "" }` so the
same index-to-word rule is checked for this screen too. **No new keys**: the debt closed with zero
new translations, because every word it needed was already declared — the same shape M165's
Scouting registration had.

**An English reader sees three different words, and that is the point.** `tac.mentality.0` is
"Very defensive", not "Park the bus", and `sim.pressDeep` is "Deep", not "Deep block", so the two
extremes of the mentality slider and the low band of the press slider changed wording for the `en`
locale as well. That is not a regression to be excused: the screen was printing a second name for a
value the studio and the lab already name, which is exactly the defect — and the English reader
meeting the same value on two screens was already reading two words for it. Where the three tables
agreed ("Defensive", "Balanced", "Attacking", "High press", "Low", "Medium", "High") nothing moved.

**Mutation witness: four arms, all caught, all restored.** (1) the `fn:` rule switched off — the
fixture clause reports `nothing`; (2) the Manager OS slider backfilled as its own English list —
the live walk reports the five words *and* the covered-set clause names the file; (3) the
event-handler exemption widened until it exempts nothing — five clauses go red and the walk
reports **23** handler literals (routes, `ai.videoAnalysisPrompt`, a bare `"button"`), which is
what makes the narrowing a claim rather than a comment; (4) the `tac.mentality.` site undeclared —
`80 sites / 1 undeclared`. A control run after each restore sat at **238/238**.

Measured on the working copy: `npx tsc --noEmit` exit 0, `npm run build` exit 0, `proof-i18n`
**238/238** at **1667 keys · 3 locales** (the three new clauses are the +3; no key was added),
ceiling **0 across 0 files**, covered set **40**. The affected set green on its own: `proof-career`
183/183, `proof-learn` 72/72, `proof-coverage` 15/15, `proof-timeline` 91/91, `proof-training`
40/40, `proof-m74` 15/15, `proof-m77` 11/11, `proof-m75` 6/6. The full suite was **not** re-run:
this project's standing instruction is not to spend the time on a full regression for every
change, so the evidence here is that targeted set plus `tsc` and `build`, named as what it is.

**What is still not claimed**: the rule reads the shape of the *value*, so a prop handed a
function by name — `format={formatters.press}` — is still outside the population, exactly as the
relative-time census is blind to a duration computed in one function and printed in another;
`toast.*` wrappers beyond `toast`/`alert` would need the same treatment; a clip's own
`improvements[0]` sentence is the demo video provider's data and passes through as a value; and
the two `Slider` definitions (Manager OS, Simulation Lab) are still two copies of one control.
Next: the queued items M218/M219 recorded — the cross-function display flow, and the `sentence`
bucket's charging arm.

### M225 — the match engine's own words are rows

The Simulation Lab printed its result under a translated heading — `sim.matchSummary`, "Match
summary" / 比赛摘要 — and the three lines beneath it were English in every locale, because the engine
had typed them: `Arsenal 2 – 1 Chelsea`, `xG 1.84 – 0.97 · possession 58% – 42%`, `Arsenal controlled
the middle of the pitch.` The goal line on the match page came from the same module
(`features/football/Details.tsx:609`, `— xG 0.31 · Right-foot curl`). `domain/matchEngine.ts` held
**8 prose literals** — its entire `PROSE_CAPS` allowance — and no gate could see what they became,
because both audits look the other way: the raw-UI scan reads component *source* (a domain module is
not JSX), and the row audits read *keys* (`{key}`, `{value}`). A module whose exported function returns
`string` is invisible from both ends, which is why the fix is a type and not a sentence.

**One row, two readings.** `SimResult.summary` is a `RowText[]` and `MatchEvent.detail` a `RowText`,
so the producer has to say which of the two things each line is. The scoreline is a **key**, not a
`{value}` row: a locale may write a score its own way, and the clubs ride as variables, so nothing in
the engine freezes a language. The midfield line is one of three keys rather than a ternary of three
sentences. The shot is a **code in the row and a word in each locale** — `sim.ev.goal` reads
`xG {xg} · {shot}`, and the shot resolves through the row builder's `codeWord`, which is how `group`,
`mode` and the archetypes already work. The code space is declared twice on purpose: as a `ShotType`
union that types the engine's two weight tables (so a typo in a table is a compile error rather than
English printed raw) and as the runtime `SHOT_TYPES` list the i18n gate reads its value space off — so
an eighth shot cannot ship with words missing from a locale, and a shot deleted from the model cannot
leave its rows behind as keys no site can build.

**Thirteen keys × three locales, and the `en` column is byte-identical to what it replaced.**
`sim.sum.score`, `sim.sum.xg`, `sim.sum.midHome`, `.midAway`, `.midEven`, `sim.ev.goal` and the seven
`sim.shot.*` rows take the dictionary 1667 → **1680**. Unlike M224 — which changed three English words
because one screen held a second name for a value the studio already named — this milestone is
invisible to an English reader by construction: every `en` row is the exact string the engine used to
compose. That is what makes the digest question below decidable rather than a matter of opinion.

**Mutation witnesses: three arms, all caught, all restored.** (1) zh-CN loses `sim.shot.tap_in` —
`zh-CN: no keys missing (1)` and `sim.shot.… · the match engine's shot types: all 7 values keyed in
every locale (sim.shot.tap_in)`. (2) the engine goes back to composing English, in the *legal* row
shape `{ value: "The midfield was finely balanced." }` — refused by four clauses at once
(`every row text a domain module hands the screen is a real key with exactly its placeholders`,
`domain prose still on keys has not grown (249 literals across 10 files, ceiling 248)`,
`no module's own prose debt has grown (domain/matchEngine.ts 1>0)`, and the reachability clause naming
`sim.sum.midEven`). (3) the `sim.shot.` dynamic site is undeclared — `81 sites / 1 undeclared /
0 stale`, and the reachability clause lists all seven keys.

**The second arm found a real hole in this milestone's own clause, which is the whole reason to run
one.** Its first run *escaped* `proof-matchengine` entirely. The clause asserted that neither Chinese
summary carries an English word of the engine's own, but it read **one** match — and the midfield is
not drawn: `mid` is the two squads' difference (`domain/matchEngine.ts:72`), so a fixed pairing always
takes the same one of the three sentences, and that fixture's seed was taking `midHome`. A witness that
only proves which branch the fixture happened to land on is worth nothing, so the clause now sweeps
**300 squads across the midfield spread** and reports `3 of 3 branches seen: sim.sum.midAway,
sim.sum.midEven, sim.sum.midHome; 0 bad`. Re-run against the arm it reports `2 of 3 branches seen … 60
bad`. (The first draft of the witness passed while the arm was live; it was the arm that said so.)

**The digest was re-derived, not bumped.** `proof-rng` folds `JSON.stringify(SimResult)` for a
400-match battery into one pinned constant, precisely so a future change to the engine's draw order
cannot pass unnoticed. Rows are a different payload from sentences, so the constant legitimately moved
— and "legitimately" is a claim, so it was tested instead of asserted: rendering every result back to
the old English through the `en` column (whose new rows are byte-identical to the old sentences, see
above) and re-folding *that* still gives the old pinned **966604149**, while the shipped payload folds
to **-691102317** (`dev/m225/rng-digest.mjs` prints both side by side). The engine draws the same
numbers in the same order — the shot is drawn exactly where it always was, immediately after the xG
string it is printed beside — and only the representation changed. The clause's instruction stands
unchanged: a future move here is a change to the draw ORDER unless the same reconstruction says
otherwise.

**A floor that fails when the work succeeds is not a floor.** Publishing those eight literals as rows
took the domain debt to 248 across 9 files, which turned `proof-i18n`'s last clause red:
`domainFiles.length >= 30 && debtFiles.length >= 10 && debtTotal >= 250`. The count was pinned to the
very quantity the arc exists to shrink, so the clause would have gone red on success and stayed green
through a regression. It is now a population floor only (`domainFiles.length >= 30`), with the
classifier held by `PROSE_SAMPLES` and the total held by the exact-caps clause above it. This is the
same contradiction M173 and M220 retired in the raw-UI census; the domain ledger simply had not been
read that way yet.

Measured on the working copy: `npx tsc --noEmit` exit 0, `npm run build` exit 0, `proof-i18n`
**240/240** at **1680 keys · 3 locales**, `domain/matchEngine.ts` capped at **0** with the domain
ceiling at **248 across 9 files** (`248 capped vs 248 counted`), reachability `143 reader files, none`
over `1472 static/quoted + 236 dynamic`. `proof-matchengine` **30/30** (five clauses of this milestone
among them), `proof-career` 183/183, `proof-matchprobability` 33/33, `proof-timeline` 91/91,
`proof-coverage` 15/15. `proof-rng` sits at **51/52**: this milestone's battery clause is green, and the
one red clause — `no app source draws unseeded randomness` — names an uncommitted `lib/ids.ts` that
another workstream is editing in the same tree, not anything this change touched. The full suite was
**not** re-run: the project's standing instruction is not to spend the time on a full regression for
every change, so the evidence here is that targeted set plus `tsc` and `build`, named as what it is.

**What is still not claimed**: `data/intelligence.ts`'s evidence facts and answers are still English
behind a 2-literal cap (#165, `1 literals, ceiling 2`); `data/video.ts:62`'s analysis sentence is still
printed raw through `report.summary` on the Features page and AI Studio; a `{value}` row can still hold
prose in principle — inside `domain/` what stops it is the counted cap on the file, not the union, and
outside `domain/` nothing counts at all; and `features/manager/ManagerOS.tsx:167` still reads
`label="xG (us)"` beside `:168`'s `mgr.xgThem`, which the scan cannot see because `hasProse` wants
three consecutive Latin letters and `xG` is two — a two-letter blind spot left unfixed here because the
key it needs is a translation and the letter bar is a scan change, each of them its own milestone. Next:
the `#150/#165` prose line — `data/ai.ts`'s composed sentences and `data/intelligence.ts`.

### M226 — an id is minted where the event happens, and the census learns to tell a draw from a name

Every record this app writes to a device carries a handle, and the shapes that minted them were
*derived* rather than minted — from a truncated clock, from the content, or from a millisecond two
mints happened to share:

```ts
id: `S${Date.now().toString(36).slice(-5)}`                    // a plan's session
id: `P${makeRng(seed)().toString(36).slice(2, 7)}`             // a plan, seed = coach + ask + name
{ id: `g-${Date.now()}` }, { id: `g-${Date.now() + 1}` }        // the two onboarding goals
```

The first keeps five base-36 digits, so the handle comes back every 36^5 ms ≈ 16.8 hours; the store
reads a matching session id as the same session (`sessions.filter((s) => s.id !== …)`), so a plan
minted a day later deleted the earlier one — including a *completed* session, whose XP stayed on the
profile while its row left the training list, the load model and the activity timeline. The second is
one handle per ask+name, so one player asking one question twice held two plans under one id and
`domain/history` built two timeline rows under one key. The third is the same defect one tick smaller:
`Date.now() + 1` is the source asking the clock to be two clocks. `features/film/FilmRoom.tsx` and the
community board carried the truncated-clock shape too, and the Film Room's `clipId` is a key the clip
library reads back.

**The door.** `lib/ids.ts` exports `newId(prefix)` and nothing else. Its value is opaque — nothing
parses it, nothing resolves it through the dictionary, no screen prints one — and its three parts
answer the three ways two mints can meet: the **whole clock** rather than a slice of it, a
**per-process sequence** for two mints inside one millisecond, and a **salt drawn once per module
instance** for two instances (two tabs, or a reload that restored rows minted before it) reaching the
same sequence in the same millisecond. Twelve call sites across five files go through it
(`data/ai.ts` ×2, `store/useFootballOS.tsx` ×6, `features/community/CommunityHub.tsx` ×2,
`features/film/FilmRoom.tsx`, `features/player/PlayerOS.tsx`). What stays deterministic is the
*content*: `proof-ids` asserts that one ask+name twice yields two plans whose exercises, diagnosis and
sources are byte-identical and whose handles are not, because identity is not content.

**The seam.** The salt is the one unseeded draw in the tree, and the RNG census banned exactly that:
`proof-rng` read **51/52** in this working copy, its single red clause being `no app source draws
unseeded randomness (lib/ids.ts …)`. Both halves of that contradiction were right about different
things — a *content* draw must reproduce from a seed, an *identity* draw must not, or two instances
mint one handle — and the old clause conflated them because until now every draw in the tree was
content. It could have been satisfied by hiding the draw behind another spelling: `crypto.getRandomValues`
walks past `Math\.random\s*\(` untouched and behaves identically. So clause 6b classifies instead of
matching. A site is **content** unless it is the declared identity site; content sites are refused in
every file; the declared site is pinned to **one file with an exact count of one**, and a declared row
that no longer matches a site turns red, so the exception cannot go stale; and the deterministic core —
`domain/` and `data/` — may carry neither, whatever any ledger says, because there a draw is a
simulation input. The sources are spelled out (bracket form, inner whitespace, `crypto.getRandomValues`,
`crypto.randomUUID`), comments are stripped through the same scanner the raw-UI census uses so prose
about `Math.random()` can neither trip the gate nor hide behind it, and the clause says what it still
cannot see: an aliased receiver, `const c = globalThis.crypto`.

**Measured, not inferred.** On the plane this commit ships (`git archive 261ae3d` + these eight files,
node_modules junctioned, no `.git`): `npx tsc --noEmit` exit 0, `node scripts/build.mjs` exit 0
(`✓ built in 17.86s`), `proof-rng` **55/55**, `proof-ids` **15/15**, `proof-coverage` **15/15**,
`proof-localdata` 32/32. The clauses that carry the claim, as the gate prints them:
`the app draws unseeded randomness in 1 site(s) across 1 file(s) of 149: 0 feeding content, 1 declared
as identity (lib/ids.ts×1)`; `…and the declared identity draw is exactly one site, in a file that
exists, with a reason a reader can weigh (lib/ids.ts: 1 site(s), 102 chars of reason)`;
`…and the deterministic core draws none: domain/ and data/ carry 0 unseeded site(s)`;
`5000 handles minted inside one frozen millisecond are 5000 distinct handles` and its second-instance
twin (`10000 distinct` across two instances); `no id in the walked tree (144 files) is built from the
clock` / `…from the content`; `the door is the way in: 12 newId() call sites across 5 files besides
lib/ids.ts`. `proof-coverage` needed no new exemption for the module — `proof-ids` loads it, so the
ratchet stayed at **2 of 6** exempt `lib/` modules and **99 lines** of exempt surface.

**The gate has to be seen to see.** Clause 6b carries its own eye test — five planted spellings that
draw and must each be named, four planted non-draws (`Math.max`, a line comment, a block comment, an
identifier containing "random") that must stay quiet: `5/5 planted draws detected, 4/4 planted
non-draws left alone`. `dev/m226-census-arms.mjs` puts one habit back at a time and asks the gate to
notice, restoring from a start-of-run backup verified by hash: **7/7 arms caught · 0 missed or crashed
· 0 invalid needles · 0 restore failures**, with `proof-ids` 15/15 and `proof-localdata` 32/32 green
before *and* after. Each arm's first red is the clause that names it — a content draw planted in
`domain/careerArc.ts` is caught twice (`1 feeding content` and `domain/ and data/ carry 1 unseeded
site(s)`); a second draw inside the declared file trips the exact-count clause; removing the identity
draw turns the declaration stale; a `crypto.getRandomValues` plant in `features/player/PlayerOS.tsx`
and a `Math["random"]()` plant in `data/ai.ts` are named, which is the spelling set doing work a
`Math.random` regex would have missed; gutting the ledger row's reason reddens the reason bar; and
blinding the census to one spelling reddens its own eye test (`3/5 planted draws detected`) rather than
passing quietly.

**What is still not claimed**: the cross-instance guarantee is a 36^8 salt — overwhelmingly likely,
not certain, and stated that way in the module; the census matches *shapes*, so an id hoisted into a
variable (`const raw = Date.now().toString(36); … id: raw`) or a WebCrypto alias still escapes it,
exactly as the relative-time census cannot see a duration computed in one function and printed in
another; the second instance is Vite's module registry rather than two real browser tabs; and the
`SecurityError`-style hostile environments this app now tolerates for storage (M227) are not what the
ids were tested under. The four call sites that mint ids in `store/useFootballOS.tsx` still write
`createdAt` from the clock, which is a *timestamp* and stays one.

*(Landing note: the `lib/ids.ts`, `scripts/proof-ids.mjs` and call-site edits above were left
uncommitted in this shared working copy by an earlier run, and `proof-rng`'s red clause was theirs to
leave behind; the census in 6b, its arms and this section are the part added here, and M225 landed
first so `proof-rng`'s digest re-derivation has a commit of its own.)*

### M227 — `typeof localStorage` is not a safety check, and both root providers were reading it

The app asks the browser for two things before it can print a word: the reader's theme and the
reader's language. Both were read the same way —

```ts
if (typeof localStorage !== "undefined") {
  const stored = localStorage.getItem(STORAGE_KEY);
```

— and that test does not test the thing that fails. `localStorage` is a *declared accessor* on every
`Window`, so `typeof` is always `"undefined"`-free; what is optional is the **document's permission to
read it**. When site data is blocked (an embedded frame, cookies refused, a hardened browser profile)
the getter itself throws `SecurityError`, and `typeof` lets that throw straight through, because
`typeof` only silences an *undeclared* name. Both call sites are `useState` initialisers, so the throw
lands in the render of the outermost provider — and the proof counts the app's error boundaries at
**0 across 137 app files**, so there is nothing downstream to catch it: the page does not degrade, it
does not appear.

**Measured, not inferred.** `scripts/proof-storage.mjs` renders `ThemeProvider` and `I18nProvider` on
the SSR harness with a store whose accessor throws, and reads the published context back:
`THE DEFECT: with site data blocked the old code threw out of getInitialTheme; now the render completes
and the shell is dark (theme "dark")`, and `THE SAME DEFECT, SECOND PROVIDER: blocked site data used to
blank the app before it could say a word; now it reads the browser instead (locale "zh-CN")`. Reverting
just those two reads (st01 and st02 below) makes both renders die in this harness, which is what makes
the claim a measurement instead of a reading of the code. The asymmetry the sweep then read out of both
files is the part worth naming: **the write side was already guarded**
(`try { localStorage.setItem… } catch`), so for one milestone the app tolerated a session that cannot
persist but not a session that cannot read. The fix keeps that shape — `browserStore()` doors the reads,
the persists stay as they were.

**The door, and what it refuses to be.** `domain/localData.ts` exports
`browserStore(): StorageLike | null` — the store, or null. Its structure is gated rather than
commented: the accessor sits inside a `try` with a `catch`, it answers with **2 return statements and
0 invented-default forms**, so it cannot quietly hand the caller a fake store or a baked-in
`"football-os.` prefix. A caller that gets null falls back the way it already knew how to (dark theme,
detected language), which is the whole design: the door narrows nothing about the app's behaviour when
storage works, and turns a blank page into a default when it does not.

**The exemption that hid the file.** `scripts/proof-coverage.mjs` carried
`"lib/theme.tsx": "theme provider: needs a DOM"`. That is the same shape of exemption M212 deleted for
the router, and it is false for the same reason: a provider that renders with `renderToStaticMarkup`
over a stubbed global renders. With it gone the ratchet reads **15/15** at an **exempt surface of 99
lines** (down from 165), **2 of 6** `lib/` modules exempt (`hooks.ts` 92 lines, `utils.ts` 7) and
**none of 31** `domain/` modules — and the file's own clause asserts the deletion happened:
`the exemption this file replaces is gone from the coverage ratchet (occurrences of "lib/theme.tsx" in
proof-coverage.mjs: 0)`.

**One census, three honest buckets.** The gate enumerates every storage touch in the app rather than
trusting the two files it started from: `the app touches browser storage in 28 site(s) across 11
file(s): 2 through the door, 18 in a try/catch, 8 declared unguarded`, and the ledger of those 8 is
keyed by **file with a reason**, never by line (lines move; M218's rule), with a ceiling pinned at the
measured 8 so it can only shrink. Each root provider is then checked individually —
`lib/theme.tsx: 1 door read / 1 raw setItem · i18n/index.tsx: 1 door read / 1 raw setItem` — so a
provider cannot drift back to a raw read without the clause naming it. The existence test itself is
refused app-wide (`0 typeof-localStorage guard(s) outside comments`), and the classifier is seen to
work by planting all three shapes: `planted [{"at":2,"viaDoor":false,"guarded":false,"verb":"getItem"}]
· wrapped [{"at":3,…,"guarded":true,…}] · comment []`.

**The ledger counted the classifier, not the code — recorded rather than smoothed over.** The window
is ±240 characters, so measuring the 8 debt rows against the source they name says: 6 of them *are*
inside a `try` whose `catch` is 285–640 characters away (`features/community/CommunityHub.tsx:94` 504,
`features/learn/LearnHub.tsx:43` 285, `:47` 234-behind/56-ahead, `features/profile/ProfilePage.tsx:57`
501, `:95` 437, `features/settings/SettingsPage.tsx:30` 640), and 2 are not: `SettingsPage.tsx:23`
reads `inventory(localStorage)` inside a **render-phase `useMemo`** with no `try` before it at all —
the same fatal class this milestone closed in the providers, still live in a screen — and
`SettingsPage.tsx:72` passes the raw accessor to `clearActivity()` in a click handler with no
following `catch`. So `8` is the classifier's number, not the code's, and the direction of the error is
not only "over-declared": a site sitting *after* a finished `try/catch` also satisfies "`try {` before,
`catch` within 240 after", which is a false **safe**, and no clause here checks containment. Next
milestone: a brace-range `try` membership test, the render-phase subset closed through the door, and a
phase column (render / effect / handler) in the same census — a throw in a memo blanks the page while a
throw in `exportData()` only kills the button.

**The fallback still speaks the reader's language.** Because the gate renders the provider rather than
calling `detectLocale`, one derived clause proves both halves at once: `the mounted zh-CN provider
prints "返回档案" for "ach.backToProfile", the dictionary's own row, where 1663 of 1667 en rows
differ ("Back to profile" would be the frozen answer)` — the key is chosen by comparing the shipped
tables, so it cannot be satisfied by a row that is identical everywhere.

**Mutation witnesses: six arms, all caught, all restored.** `dev/m227-arms.mjs` puts one old habit
back at a time, runs the gate that is supposed to notice, and restores from a start-of-run backup
verified by hash. Fresh run on the working copy:
**6/6 arms caught · 0 missed or crashed · 0 invalid needles · 0 restore failures**, controls
`proof-career` **183/183** and `proof-transfers` **76/76** green before *and* after. The first red each
arm produced is the clause that carries the claim, not a count:

· st01 theme back to `typeof` + bare accessor → 5 red, first is
  `THE DEFECT: with site data blocked the old code threw out of getInitialTheme; now the render completes and the shell is dark`;
· st02 locale detection likewise → 5 red, first is `THE SAME DEFECT, SECOND PROVIDER…`, and the
  derived-row clause goes red with it (`prints n…` — no mounted provider to ask);
· st03 the door stops catching → 7 red, including `the door answers with the store or with null, and
  invents nothing else (1 return statement(s), …)` — the structural clause reads the *shape* of the door;
· st04 the census regex blinded to match nothing → 5 red, the ledger clause reporting
  `the app touches browser storage in 2 site(s) across 2 file(s): 2 through the door, 0 in a try/catch`,
  which is the floor refusing an empty read rather than accepting a clean-looking one;
· st05 one ledger row deleted while its sites stay in the app → 1 red, the census naming ProfilePage;
· st06 the theme exemption put back on the ratchet → 1 red in `storage` (`the exemption this file
  replaces is gone…: 0` → 1) and 5 in `coverage`, including `no exemption has gone stale`.

The harness's own earlier bug is in the record too: its first run reported **6 restore failures** while
every arm was caught, because `planeHash` compared a Buffer against a hex digest — the restore was
byte-correct, the comparison was not, and it was checked independently (grep the reverted lines, re-run
`storage`/`coverage`/`localdata`: 30/30, 15/15, 27/27) before the harness was fixed and re-run.

**Measured on the plane this commit ships** (`git archive bd4abce` + these five files, no `.git`, so the
concurrent run's 15 uncommitted tracked files cannot leak into the reading): `npx tsc --noEmit` exit 0,
`node scripts/build.mjs` exit 0 (`✓ built in 10.70s`), and the **full** suite
**38/38 proof scripts proven (2000/2000 checks counted)** with rc 0 — no `FAIL`, no `UNVERIFIED`, no
retry. `bd4abce` was **37/37 · 1970/1970**, so the delta is exactly this file's 30 checks. The working
copy also reads 30/30, but its census prints 28/11/2/18/8 too while its dictionary is 1680 keys, which
is why every number above comes from the plane.

**What is still not claimed**: the effect side — `<html class>`, `document.documentElement.lang` and
the `setItem` persist — is **not** exercised by this file, stated inside the suite rather than in a
comment (`NOT COVERED HERE, measured rather than assumed: renderToStaticMarkup never runs useEffect, so
the <html class> sync, the lang write and the setItem persist are unproven by this file (document
writes during render: 0)`), and no browser pass with site data actually blocked has been run, so the
`SecurityError` behaviour is proven as a *code path* and not as a browser. The door has exactly two
callers so far (`2 through the door`): `lib/hooks.ts` keeps its own try-wrapped raw reads — a blocked
document makes `useLocalStorage` hold its initial value and `useLearnRecords` return `[]` without
saying why, which is read out of that source and not yet rendered — and the 4 files in the ledger are
untouched by this commit.

**How this file landed in README.** The working copy's `README.md` also holds the concurrent run's
`### M225` section, which is not mine to commit, so `README.md` went in as an index-only landing: the
committed blob is `git show HEAD:README.md` with this section spliced before the single `## Deploying`
anchor (`git hash-object -w` + `git update-index --cacheinfo`), and the working copy keeps both
sections. That is why the roadmap line in the committed text still reads M224 — left for the run that would land M225 and M226, and reading M228 from M226 on.

*(Numbering note: M225 — the match engine's rows — and M226 — id minting, whose `lib/ids.ts` and
`scripts/proof-ids.mjs` are untracked in this same working copy — are both being landed by concurrent
runs in this shared workspace. This milestone takes M227 so the three do not claim one number; the
number is still asserted at commit time from `git log --oneline -1`, and if either of those lands first
the name of this commit is what it reads, not what this paragraph guessed.)*

### M228 — the storage census asked how far a read was from the word `catch`, not whether a `catch` could reach it

M227 shipped a census that files every browser-storage read the app cannot account for. Its verdict
was a character window, verbatim from `e3fb19e`:

```js
const LOOK_BACK = 240, LOOK_FWD = 240;
…
const before = s.slice(Math.max(0, m.index - LOOK_BACK), m.index);
const after = s.slice(m.index + m[0].length, Math.min(s.length, m.index + m[0].length + LOOK_FWD));
…
guarded: /try\s*\{/.test(before) && /\bcatch\b/.test(after.slice(0, LOOK_FWD)),
```

That measures proximity to two words, and code does not care about proximity. Read on `e3fb19e` with
no `.git` in the tree, the gate reported eight sites it could not account for and put four files in
the ledger —

```
ok   the app touches browser storage in 28 site(s) across 11 file(s): 2 through the door, 18 in a
     try/catch, 8 declared unguarded (features/community/CommunityHub.tsx:94 getItem, …)
```

Six of those eight are reads sitting inside a `try` whose `catch` is simply further away than 240
characters (`CommunityHub.tsx:94`, `LearnHub.tsx:43/47`, `ProfilePage.tsx:57/95` **and
`SettingsPage.tsx:30`**), and two are the defect class itself: an inventory computed **inside a
`useMemo`** at `features/settings/SettingsPage.tsx:23`, which throws during render and therefore blanks
the page, and `clearActivity(localStorage)` at `:72`, inside the reset's event handler — an uncaught
throw there breaks the button rather than the page, but it is still a read that was never made safe,
only left unwrapped. So the ledger was not "eight reads nobody has explained"; it was two real ones
plus six lines of noise, and the noise is why the two did not look like an emergency.

**Containment replaces the window.** The gate now parses each file with the repo's own TypeScript
(`ts.createSourceFile`, `setParentNodes: true`) and asks the question a `catch` actually answers: is
this reference inside a `TryStatement`'s own `tryBlock`, and does that statement have a
`catchClause`? `try + finally` with no `catch` does **not** excuse a read — a `finally` runs on the
way out of a throw, it does not stop the throw. Read that way on the same ref, 24 of the 28 sites are
inside a `try` with a `catch`, and the 4 the parser puts outside it are `SettingsPage.tsx:23`,
`SettingsPage.tsx:72` and the two providers' calls *to* the door — whose own `try` is the reason they
are safe. After this commit's two fixes the census reads 6 through the door and **0 unguarded**:

```
ok   …and read by containment the app's exposure is smaller than the window claimed: 0 read(s) the
     distance test called safe sit outside any catch (the dangerous direction) while 5 the distance
     test called debt are inside one (features/community/CommunityHub.tsx:94 try+catch, …)
ok   the app touches browser storage in 28 site(s) across 11 file(s): 6 through the door, 22 inside a
     catch, 0 unguarded (none)
ok   …and nothing is declared any more: the ledger holds 0 row(s) against a ceiling of 0, so an
     unguarded read is a failure and not an exemption
```

The four-file ledger is deleted and `DEBT_CEILING` is 0, which is what turns "add a row and move on"
into a red.

**The window stayed, as a second reader.** Containment and proximity disagree in *both* directions,
and averaging them would hide that. The shipped gate prints both halves of the split: 5 rows the window
calls debt that containment excuses (6 on the ref, before `SettingsPage.tsx:30` moved behind the door),
and 0 rows the window calls safe that sit outside a catch. The zero is the clause, and it is aimed at
the direction that matters — a read that sits between somebody else's already-closed `try` and a
`catch` 300 characters later is safe-looking to a distance test and is a blank page. That row does not
exist in the app yet,
so the clause cannot prove itself from app code alone; it is proven by planting it (`shadow`,
predicted `window=SAFE` + `outside-try`), next to a `longTry` plant in the opposite direction
(`window=debt` + `try+catch`), fourteen shapes in total.

**Two readers for the population, not one.** A census that quietly enumerates nothing reports a clean
app, so the same 28 sites are counted twice by methods that share no code — the parser's identifier
references and the comment-stripped text's occurrences — and must agree site-for-site, line by line,
with a floor of 20. Blinding either reader goes red rather than reporting a clean app: making the text
reader match nothing (`sv06`) breaks the agreement, and making the census stop recognising the door
(`sv05`) turns the door's own read into a site the text reader never saw — both fail on site-for-site
reconciliation, not on a count anyone could have eyeballed.

**The moment column learned one hop of the call graph.** Lexical position alone called
`getInitialTheme`'s read `later`, which is a category error: `useState<Theme>(getInitialTheme)` runs
that function *during render*, and so does `useState<number>(() => loadElapsed())`. A new `via-render`
/ `via-effect` label follows the hook's own arguments one hop, and the providers clause now requires
it — a `later` label is no longer accepted for a read the app runs before it has painted:

```
ok   the census also knows when a read runs — lexically in a hook (7 render, 7 effect), one hop away
     through the function a hook is handed (4 via-render, 0 via-effect), or at module scope — so the
     18 site(s) that run before the visitor acts are named separately, and the 15 of those that touch
     the accessor itself are all inside a catch (…)
ok   each root provider reads the store through the door, touches the accessor only to persist, and is
     named as a render-phase reader rather than excused as a later one (lib/theme.tsx: 1 door read / 1
     raw setItem [door@via-render,setItem@effect] · i18n/index.tsx: 1 door read / 1 raw setItem
     [door@via-render,setItem@effect])
```

One hop is all it follows, and that limit is stated inside the gate rather than left as an
assumption: the `twoHop` plant predicts `@later` for a read two functions deep. What covers it is the
containment ceiling, which judges every read whatever moment it runs in — `sv07` (hop removed) goes
red twice precisely because the label is load-bearing.

**The two real reads went through the door, and `browserStore()` can answer `null`.** Routing a page
through the door means four domain functions now receive `StorageLike | null`, so their null behaviour
became shipped behaviour and had to be pinned, not assumed: `inventory(null)` returns every registered
key with nothing present, `buildExport(null)` carries the app tag and zero sections (which is what the
page's existing "nothing to export" refusal fires on), `applyImport(null, …)` **refuses** with
`storage-write-failed` instead of reporting keys it never wrote, and `clearActivity(null)` returns 0
instead of a count of keys it never removed.

**Measured on the plane this commit ships** (`git archive e3fb19e` + these four files, no `.git`, so
the concurrent run's 15 uncommitted tracked files cannot leak into the reading): `npx tsc --noEmit`
exit 0, `node scripts/build.mjs` exit 0 (`✓ built in 10.87s`), `proof-storage` **34/34**,
`proof-localdata` **32/32**, and the full suite **38/38 proof scripts proven (2009/2009 checks
counted)** with rc 0 on **two consecutive legs**, no `FAIL`, no `UNVERIFIED`, no retry. On the same
plane without this commit's files the two gates read **30/30** and **27/27**, so the suite's +9 checks
is exactly this change's +4 and +5 and nothing else moved.

**Twelve mutation arms, each with its red count predicted in advance** (`sv01` re-plants
`SettingsPage.tsx:23` on the bare accessor → 3 reds: the ceiling, the ledger and the moment clause;
`sv02` re-plants the reset → 2 reds, and the moment clause correctly stays green because an event
handler cannot blank the page; `sv03` puts the window back as the verdict → 2; `sv04` widens the
ceiling to 8 → 1; `sv05` blinds the census to the door; `sv06` blinds the second reader; `sv07`
removes the call-graph hop → 2; `sv08` lets a bare `finally` guard a read → 1, caught only by the
plant, which is what proves the plants are load-bearing; `ld01`–`ld04` make each null-store function
lie about what it did). `career` (183) and `transfers` (76) ran green before and after, every arm's
needle matched exactly once, and the tree came back byte-identical by hash. **First pass: 11/12
caught as predicted.** `sv05` was a hole in *my prediction*, not in the gate: I expected a fourth red
on the debt clause and got three, because the door's own read sits inside the door's own
`try + catch`, so blinding the census to the door makes it a *guarded* app site rather than an
unguarded one — what it breaks is the population, which is exactly the thing the two-reader clause
exists to notice. The expectation was corrected with that reason written into the arm, and the re-run
reads 12/12.

**What is still not claimed.** The live browser pass M227 owes is still owed: the effect side
(`<html class>`, `document.documentElement.lang`, the `setItem` persist) is stated unproven inside the
suite, and no browser with site data actually blocked has been run, so `SecurityError` remains proven
as a code path and not as a browser. `lib/hooks.ts` still keeps its own try-wrapped raw reads — read
by containment all three are inside a catch, so they are safe, but they are not through the door, and
that file's coverage exemption still reads "needs a DOM", which is the same excuse M212 and M227
measured to be false. And this commit's own two-leg suite was interrupted once, on the leg that ran
while the machine was loaded: `proof-runner` went red on two checks about its 1500 ms hang budget,
with `hang-green`'s tally line missing rather than present. Reproduced alone under load, 97/97 in the
same tree when the machine is quiet, and the kill landing at ~4.4 s of wall clock — that fixture
assumes a child node process boots and prints inside the budget, which is a property of the machine,
not of the claim. It is not caused by this commit (no file this commit touches is loaded by that
check) and it is filed as the next milestone rather than papered over by raising a number here.

**How this file landed in README.** The working copy's `README.md` also holds the concurrent run's
uncommitted sections, which are not mine to commit, so `README.md` went in as an index-only landing:
the committed blob is `git show HEAD:README.md` with this section spliced before the single
`## Deploying` anchor (`git hash-object -w` + `git update-index --cacheinfo`), and the working copy
keeps both. The committed text therefore still said `currently at M224` at the top of the roadmap, as
M227's did, until the run that landed M225 and M226 set it to `M228`: that line is one edit away from a stale claim either way, and a diff of pure additions is
the check that says this section introduced nothing else.

*(Numbering note: M225 and M226 are landed by concurrent runs in this shared workspace. This milestone
takes M228 because the storage census it replaces was named M227 in its own file header; the number is
still asserted at commit time from `git log --oneline -1`, and if another run claims it first this
commit is named by what that reads, not by what this paragraph guessed.)*

### M229 — a hang fixture that puts the OS's process-boot time inside the budget it is testing

`scripts/proof-runner.mjs` proves the runner's time budget by making two fake proofs hang on purpose
and watching the runner give up on them. Until this commit the budget those fixtures were handed was a
number M199 picked:

```js
// scripts/proof-runner.mjs, verbatim from e13f358 (M199)
const BUDGET = "1500";
```

1500 ms was chosen because it was far above anything a proof needed to *run*. It was never tested
against what a proof needs to **start**, and starting is not a constant. Two scratch probes priced it on
this machine through the same `spawnSync(execPath, [file])` path the runner uses.
`dev/m229-floor.mjs` samples a print-and-exit script:

```
BOOT FLOOR, quiet:            min 165 med 199 max 295  (165,295,195,255,171,199,234,183,240)
BOOT FLOOR, 8 busy waiters:   min 663 med 744 max 834  (744,740,714,757,834,663)
```

and `dev/m229-rate.mjs`, which hangs a script and asks what the runner reports, measures the same boot
over a wider window — `quiet: min 199 p50 256 max 791`, `LOADED (8 busy waiters): min 462 p50 917 max
2592`. **The fixed 1500 sat inside the distribution of the thing it assumed.**

That is not a hypothetical. The M228 full-suite leg hit it, verbatim from `dev/m228-suite-leg2.log`:

```
FAIL        proof:runner  (95/97 checks)  [checks-failed] 2 of 97 checks failed
FAIL a proof that hangs past its 1500ms budget is stopped and reported UNVERIFIED [timed-out] with its
     own line intact (no tally shown, fixture wanted 3/3 checks)
FAIL and a stopped script's log is still dumped, because "the runner gave up" is not a diagnosis
     (NOT dumped)
```

A `hang-green` fixture whose tally line simply did not exist yet was reported as `timed-out`/no tally,
and because the dump header repeats the code, one unlucky boot turned **TWO** checks red on a suite
whose contracts were all intact — a timing accident dressed up as a contract failure.

**The budget is now derived from a floor measured in the same run.** Five samples of a print-and-exit
proof through the real spawn path set the price (`MARGIN 3`, `CAP 30000`, floor of the window 1500), and
every timing claim in the block is stated against that measured number rather than against a picked one.
The clause prints all three of its inputs — the five samples, the slowest of them, and the value in
force — so whether the 1500 floor or `FLOOR * MARGIN` set this run's budget is visible in the line
instead of being a hidden assumption.

**The cap is part of the derivation, and it was too small.** `CAP` exists so a pathological sample
cannot hand a proof ten minutes, and it first shipped at 12000 ms. That made the clamp a second,
hidden fixed number — the exact thing this milestone removes — because the clause
`the derivation still leaves room…` asserts `BUDGET_MS >= FLOOR * 2`, and a clamp at 12000 breaks that
inequality as soon as a box measures a floor above 6000 ms. The gate met its own load: while the nine
mutation arms were running, each one spawning Vite SSR servers, a leg measured floors around 9200 ms and
the clamped budget (12000 = 1.3x) reddened the margin clause. `CAP 30000` puts the clamp above any floor
this harness can produce, and the assertion stays strict on purpose: a box slower than a ~15-second boot
floor gets a loud, named red ("AT the cap — a slower box than this fixture can price") rather than a
silently-too-tight budget.

**A derived value still has to be shown to be derived.** The first draft asserted

```js
BUDGET_MS === Math.min(CAP, Math.max(1500, FLOOR * MARGIN))
```

which is true by construction — `BUDGET_MS` is that expression — and would have stayed green if
someone replaced the line with `const BUDGET_MS = 1500;` on any box whose floor is under 500 ms,
which is most of them. The claim is therefore read off the shipped text, the same way the runner's own
`600_000` default and its retry budget are, and the samples are printed as the evidence that a
measurement actually ran:

```
ok   the budget is COMPUTED in the shipped source rather than typed into it: this file defines it as
     `Math.min(CAP, Math.max(1500, FLOOR * MARGIN))`, which names the measured floor and the margin,
     …this run's 5 samples came back …, the slowest is …, and the value in force is …
```

**The two quantities the design actually assumes are now measured, not inferred.** A separate probe
spawns one hanging script directly — one spawn, one attempt, no runner boot mixed into either number —
and reports how late a first line can arrive after spawn, and how late `spawnSync` hands back a child
it killed at a deadline. Both are compared against the budget in force.

**And the control that checked the control went red in the clean plane.** Its first form handed the same
print-then-hang fixture a 40 ms budget and demanded that the tally line be *missing* — "no process
starts that fast". The plane's full-suite leg read **102/103, exit 1**, and the one red was that clause
(`dev/m229-plane-leg2.log`), printing the proof of its own mistake: the run came back
`UNVERIFIED [timed-out-after-tally] (3/3 checks)` against a boot floor that same run had measured at
940 ms. The deadline is armed by `spawnSync`, and on a loaded box the hand-back can be hundreds of
milliseconds late — late enough for the child to boot and print before it is killed. So the control
claimed two things, both load-independent, and gave up the timing bet entirely:

```
ok   a 40ms budget is not survivable: the same print-then-hang fixture reports UNVERIFIED [timed-out…]
     and the suite exits 1 — the deadline is what stops a hung proof, whatever the box's boot time is
ok   and the tally verdict follows the bytes, not the budget: the child's printed/unprinted 3/3 line and
     the runner said [timed-out-after-tally] (3/3 checks) — on this box a 40ms-timeout spawn came back
     586ms after its deadline with its first line did not arrive (boot floor 1147ms), which is why the
     deleted wording demanded a MISSING tally and went red in the plane
```

The second clause is the one that keeps the control honest: whatever the child really emitted decides
the code, and if the two ever disagree the classifier is wrong. The claim "a small budget and a large
budget differ in whether the tally is seen" was never the runner's contract — the two hang fixtures
already distinguish "printed then hung" from "never got there" at the real budget.

**The retry loop is what the seconds measure.** A hanging script produces no evidence, so M203's
policy runs it again — the wall clock this block times is a loop of `ATTEMPTS` budgets, and the
attempt count is read from the runner rather than typed. The fixture's sleep is priced from the loop
so that "the runner gave up while the script was still hanging" cannot become false the day the policy
changes.

**Nine arms, adjudicated from the evidence each run prints.** `dev/m229-arms.mjs` patches one mechanism at
a time in a clean-plane copy (HEAD + this file, no `.git`), runs `proof:runner` aimed at it, restores the
file and verifies the restore by hash. Removing `timeout: timeoutMs` from the shipped runner → **8** reds
(each hang case loses its classification, its timing bound and its dump, and both control clauses notice
that a never-killed fixture is simply green); shrinking the fixture's sleep to `min(20000, BUDGET×2)` →
**2**, the timing clauses only, which is the arm that separates "the budget fired" from "the script was
still running"; making the runner dump only contract failures → **3**; pinning the measured floor to `0` →
**1**, the structural clause, because a probe whose numbers decide nothing is not a derivation; setting
the retry budget to 1 → **5**, which is M203's block collapsing, not M229's — every M229 clause stayed
green because its bound is *derived* from that same read, which is exactly the property a hand-typed `2`
would not have. The final set read **9/9 arms behaved exactly as predicted · 0 holes**
(`dev/m229d-arms.log`), with `proof:career` 183 checks and `proof:transfers` 76 checks green at both ends
of it and the plane's files restored byte-for-byte.

**Some clauses are only red on a box that earned it, and the harness now asks the box.** Two clauses are
load-dependent by nature: `the derivation still leaves room…` requires `BUDGET_MS >= FLOOR * 2`, and
`the tally verdict follows the bytes…` can only disagree with a blind classifier when the killed child
really did print. For most of this milestone those were hand-typed into the arm's expected list, and both
hand-typings were wrong — rt01 was predicted at 1, measured 2 at floors 833 ms and 789 ms, then measured
**1** again on a quieter box (floor 210 ms), because the pinned `1500` clears twice a 210 ms floor and does
not clear a 833 ms one. So those clauses left the fixed expectation and became `loadGated` entries carrying
a predicate over quantities **this run's own output prints**: the boot floor (the structural clause prints
"the slowest is NNNms") and whether the dump contains the fixture's `3/3 checks passed` line. The verdict is
derived and shown: `gated from printed evidence: floor 438ms, child never printed → none required`. A gated
clause whose floor the run did not print is reported as `CANNOT ADJUDICATE`, never skipped.

**A derivation that cannot be wrong is not a gate.** That rule was tested the same way the shipped clauses
are: the same harness with rt01's predicate widened to "always required" reports
`rt01 CAUGHT BUT NOT THE PREDICTED CLAUSES (1/2 red of 104)` and `0/1 arms … 1 holes`, exit 1
(`dev/m229d-gatewitness.log`) — the required-but-absent clause is caught, so the real run's "none required"
is a measurement and not a licence.

One arm had to be replaced, and its replacement is the part of this milestone I would re-read before
trusting the control. rt02 used to mutate the control's own env line — hand the 40 ms fixture the case's
budget and the clause demanding a MISSING tally goes red. That arm only existed because the clause was a
timing bet; once the plane reddened the bet and I rewrote the control to assert only what is
load-independent, the same mutation had nothing left to break. So **rt06** applies that old mutation now
and predicts **0** reds — measured 0, twice — and **rt02** was rebuilt to aim at the shipped mechanism
instead: `scripts/lib/proofRunner.mjs`'s `return tally` becomes `return false`, so a killed proof is always
reported as having died before its tally → **3** reds (the truth-table row that names the after-tally code,
the hang-green classification and that case's dump header), plus the control's bytes-vs-verdict clause
whenever the run's own dump shows the child printed. An arm that aims at my proof's own line instead of at
production is a check on my wording, not on the runner; that is what rt06 measures.

**rt03** (the attempts regex made unable to match) is the other lesson about predictions: the first draft
predicted 3, I then "re-derived" it to 7 from memory of the line — `SLEEP` is built from `ATTEMPTS`, so a
NaN should stop the fixtures hanging and every timeout clause should fall — and the measurement returned
**3** (`dev/m229c-arms.log`, `dev/m229d-arms.log`), after exactly one run that returned 4 while `CAP` was
still 12000: that fourth red was the clamp binding under the arms harness's own load, not the broken regex,
and raising the cap is what made the arm agree with the draft again. The line reads
`Number.isFinite(ATTEMPTS) ? ATTEMPTS : 1`, so an unreadable attempt count degrades to a 20-second sleep and
the fixtures hang exactly as shipped. A re-derivation that does not re-read the expression is not evidence,
and the expectation stayed at the measured 3 rather than at my argument.

One number in that set is worth reading twice: during the arms the same proof derived budgets of
**1926 ms, 2784 ms and 4896 ms** from its own measured floor (its timing clauses name them), because an
arms runner hammering the box with Vite SSR servers is roughly three times the load an idle box is. The
constant this commit removes could not have cleared that floor at any of those three moments; every
classification clause stayed right while the derived budget absorbed it.

**Measured on the file this commit ships, in a clean plane.** The plane is `git archive` of the ref plus
this milestone's `scripts/proof-runner.mjs`, every synced file verified by `git hash-object` against that
ref before anything ran. On the `311024b` plane `tsc --noEmit` and `scripts/build.mjs` both exited 0
(`dev/m229c-build.log`), `proof:runner` went from 97 checks to **104** and read **104/104, exit 0** on two
consecutive legs (`dev/m229c-runner-1.log`, `dev/m229c-runner-2.log`), and the full suite read
**38/39 scripts · 2048/2049 checks** (`dev/m229c-suite-leg.log`). HEAD then moved twice while this was in
verification, so the plane was re-based on `f213254` — the ref this commit actually lands on — nine files
synced and hash-verified, and the same two measurements re-taken there: `proof:runner` **104/104, exit 0**
on two legs again (`dev/m229e-runner-1.log`, `dev/m229e-runner-2.log`) and the suite at
**38/39 scripts · 2054/2055 checks**, exit 1 (`dev/m229e-suite.log`). The check count moved with M231's
new proof lines; the red did not.

**The one red in that leg is not this commit's, and the attribution is mechanical.** It is
`proof:m74 — memory source cites a human label not a raw key`, and `dev/m229-m74probe.mjs` (run with the
clean plane as its working directory, so `vite` loads that plane's `/data/ai.ts`) prints what the reader
is being shown:

```
MEMORY ROW: "Coach memory — last session focused on passing"
```

`this commit` cannot have caused it: the diff is one file, `scripts/proof-runner.mjs`, and `proof-m74.mjs`
imports only `vite`, `/data/ai.ts` and `/i18n/dictionaries.ts` — it never reads the runner. It arrived with
M230's coach-row rewrite, which is what made the provider hand the row an attribute **code** (`data/ai.ts`
passes `vars: { focus: lastFocus.join(",") }`) and left the proof resolving rows with its own hand-rolled
substituter: `proof-m74.mjs`'s `resolve()` pastes `row.vars` into the template and never calls the shipped
interpreter, so no row whose variable is a code can come back with a label from it. The two clauses differ
only in casing — the diagnosis clause is `/Passing/i`, which matches the raw `passing` and stayed green,
while the source clause is `/Passing/` and additionally forbids a leftover `passing\b`, so it went red.
That is why the same 15-check dump shows one green and one red for the same rewrite. What the reader
actually sees is a claim about `rowLine(s, t)` — `features/ai/AiStudio.tsx:131` renders sources through it,
and `domain/rowText.ts` lists `focus` among the variables allowed to hold a code — and this section does
not settle it, because settling it means re-running that clause through the shipped interpreter instead of
through my substitute. That is the next unit's work, and this commit records the red rather than editing
files another milestone owns.

**What this commit did NOT get right first.** The first draft put an UPPER bound on the loop's wall
clock — "no more than one budget of boot-plus-kill overhead per attempt". On a loaded box it went red
with every classification still correct: measured floor 916 ms, budget 2748 ms, per-attempt wall
5564 ms. `dev/m229-latency.mjs` then decomposed the same shape (budget 2500): one direct
`spawnSync` returns 30–188 ms after its deadline, one runner attempt costs 3293–7033 ms, and the
second attempt costs about 2029 ms more — a distribution with a long tail, not a constant. A composite
wall clock can be bounded from **below** (the loop cannot have finished faster than `attempts ×
budget`) and against the fixture's own sleep, and those are the only two bounds shipped. The overshoot
is printed, not asserted.

Two other hypotheses were measured and are NOT claimed. Whether a killed child's already-printed
stdout can be lost on the pipe: in `dev/m229-latency.mjs` one of five `attempts=2` samples came back
with no first line at all (`wall 7111 firstPrint NaN`), which is ~1 in 15 and looks exactly like the
M228 failure. `dev/m229-loss.mjs` then hung a script that stamps its own start time and asked, 10 times
at each of budgets 1500/3000/6000: **30/30 handed the printed line back and 30/30 were classified
`timed-out-after-tally`** (`dev/m229-loss.log`), 30 spawns at three budgets and zero reproductions, so
the production runner's capture is unchanged and
the NaN sample stays an unexplained observation rather than a fix. And whether the change needed a
repeat-sampling loop: repeating a timing fixture multiplies its exposure to exactly the load tail being
measured, so the block runs each hang case once.

### M230 — the coach's rows are the reader's own, down to the words the provider used to compose itself

M222 and M223 put the coach's sentences onto keys, and the plan panel has printed rows ever since.
What neither looked at is the *values* those rows were handed — and those were not keys at all.
They were words the provider had already made:

```ts
focus:  trained.map(attributeLabel).join(" + ")                 // "Ball Control + Weak Foot"
target: isTargeted ? "selected role-gap priorities" : "current biggest measurable gap"
arch:   archetypeLabelEn(dna.primary.id)                        // "Target Man"
acwr:   load.acwr?.toFixed(2) ?? "elevated"                     // a ratio nobody has
game:   hasBlock("game") ? " — session shaped to your role" : ""
```

A row can only put a value into the reader's language when the value is a **key** — that is the
whole of `RowText`. `attributeLabel` and `archetypeLabelEn` are the opposite door: they answer in
English, so a 简体中文 reader of the plan read

```
核心重点 Ball Control + Weak Foot 瞄准你的 current biggest measurable gap。
DNA 解读：Target Man（Deep Playmaker → Target Man) — session shaped to your role。
实战模块是你的 Crossing 训练 —— Target Man 型球员在那里表现自己。
```

— three quarters of a Chinese sentence around words only the English reader could be given, and no
gate could see it: each row *was* a key, each locale *was* complete, every literal was inside its
ceiling. The defect was in the contract between the provider and the row, so the fix is there.

**One contract, two kinds of variable.** `domain/rowText.ts` already had `CODE_VARS`, the variables
whose values are codes the dictionary resolves (`focus`, `arch`, `cat`, `shot`, …). It grows the
five the coach was spelling out by hand — `drill`, `attrs`, `trained`, `last`, `new` — because the
English words were, underneath, an attribute key or a comma-separated list of them: the provider now
passes `trained.join(",")` and `codeWord` does the joining, so the list a Chinese reader sees is
`控球 + 冲刺` and the list the English reader sees is unchanged. And a second list is declared,
`KEY_VARS = ["lead", "target", "game", "zone"]`, for the variables whose value is the *name of a
row*: `fillRowVars` resolves those through the reader's column, and an empty value stays empty
(`game` is only carried when a game block ran). `target` is now
`isTargeted ? "coach.rat.targetRoleGap" : "coach.rat.targetGap"` — the aim phrase is a row of its
own, in all three locales, chosen by shape. A load zone is named by the same door the /load banner
reads: `domain/load.ts` exports `zoneKey(zone)`, which unwraps `ZONE_LABEL[zone].key`, so the plan's
source line and the banner cannot drift into two words for one band. The `"elevated"`/`"high"`/
`"low"` fallbacks became an em dash, and the one branch that was describing a number the reader does
not have — `classifyZone` answers `caution` when a week carries load but the chronic window rounds
to zero — got a sentence of its own, `coach.diag.loadCautionNoRatio`, instead of the English word
"elevated" sitting inside every translation.

**The leak the new census found first.** `ai.lead.general` read "Here is the read from Football OS
intelligence for `{label}`." and `{label}` reached the screen as braces — for every reader, English
included — because a key-holding variable is resolved with *no* variables: the outer row's bag
belongs to the outer sentence, and the `label` that row wanted was filled into a different row (the
answer's sources, which the same panel prints underneath it). A key reached that way may interpolate
nothing, so the row is var-free now and the match is still named, once, under the answer.

**And six brackets that opened in one script and closed in another.** `（综合 {rating})` — a
full-width pair closed half-width, on the plan's source line and on every level line, in both
Chinese locales. `t()` fills placeholders and nothing else, so nothing downstream could repair it.
Six rows read that way at `f14034f`; zero read that way now.

**The gates.** Three clauses carry the claim in `scripts/proof-i18n.mjs`, all read out of the tree
rather than listed by hand. 26g finds the keys a key-holding variable can carry where it is handed
one (`target: isTargeted ? "a" : "b"` yields both ends; `lead` is followed to the three `leadKey`
assignments; a zone's name is read out of `ZONE_LABEL`), refuses a `KEY_VARS` name it cannot find
keys for, and requires every one of those keys to have a row in every locale that interpolates
nothing. 26h renders six real plans (a fresh one, a first week whose caution band has no ratio at
all, a spike, a continuing block, a rotated one, the role-gap panel's) and three Match Intelligence
answers through the shipped dictionary in all three locales and refuses two things: a placeholder
that survived to the screen, and — in the two Chinese columns — a Latin word that is not one of the
three the game's own name keeps (`Football OS`, `ACWR`, `DNA`). 26i is the bracket shape, per locale,
over the whole dictionary. Each of the three carries a planted eye test in the two directions it can
fail, because "0 leaks" is also what a blind detector prints.

**The gate was reading rows with an interpolator of its own.** `scripts/proof-training.mjs` checked
that the coach claims only the blocks its session carries, and it did that by looking up the English
row and filling `{…}` itself — `Object.entries(row.vars).reduce(… replaceAll(…)`. That filler reads
every code-holding variable as the key it was handed, so the moment the coach started handing over
codes the gate went red on three clauses, on rows that now read correctly:
`says "passing" for a plan that trains Passing`, and `60′ omits role-shaped though the block exists`
(the `game` tail is a row now, and the filler printed `coach.rat.gameShaped`). A correct change
failed a gate that had re-implemented the contract it was checking — the same defect this milestone
is about, one layer down. `resolve` now calls `rowLine(row, englishWord)`, the door a screen uses, so
the three clauses are green and stronger: they exercise the real resolution path instead of a
lookalike. Four new plan-facing rows came with this (`coach.diag.loadCautionNoRatio`,
`coach.rat.targetRoleGap`, `coach.rat.targetGap`, `coach.rat.gameShaped`), which is why the suite
prints 1684 keys where it printed 1680.

**Measured, not inferred.** On the plane this commit ships (`git archive f14034f` + these six files,
node_modules junctioned, no `.git`): `npx tsc --noEmit` exit 0, `node scripts/build.mjs` exit 0
(`✓ built in 31.12s`), `proof-i18n` **247/247** (seven of those checks are new), `proof-career`
**183/183** and `proof-training` **40/40** green before and after the mutation run below — the latter
only after the gate's own interpolator was replaced, which is the paragraph above. The clauses as the
gate prints them: `the variables that resolve as keys are exactly the 4 this clause can find keys for
(lead, target, game, zone; unknown: none; found nothing for: none)`; `no key a key-holding variable
can carry asks for variables of its own (11 keys × 3 locales, all var-free)`; `the English-leak rule
calls the pre-M230 sentence a leak and its replacement clean (3 plants, all as declared)`; `every row
of 6 real plans and 3 answers reaches a reader in the reader's own column (213 readings, clean)`;
`the bracket rule catches a pair opened in one script and closed in the other (4 plants, all as
declared)`; `every dictionary row closes its own brackets in its own script (5052 rows read, clean)`.

**The gate has to be seen to see.** `dev/m230-arms.mjs` puts one habit back at a time and asks the
gate to notice, restoring from a start-of-run backup verified by hash. It runs wherever `M230_ROOT`
points, so the whole run was done inside the plane and never touched the shared working copy:
**9/9 arms caught · 0 missed or crashed · 0 invalid needles · 0 restore failures**, with `proof-career`
183/183 and `proof-training` 40/40 green before *and* after. Each arm's first red is the clause that
names it: dropping `attrs` from `CODE_VARS` prints a raw attribute key in a Chinese column; dropping
`lead` from `KEY_VARS` prints `ai.lead.player` and reddens the clause that says the list is exactly the
four it can find keys for; adding a fifth name reddens the same clause from the other side; restoring
the placeholder `ai.lead.general` asked for is caught twice (statically, and on the answer's own row in
all three locales); growing a placeholder on a row a key-var carries is caught before anything renders;
printing a load zone as its code, inlining an English aim phrase, and handing the DNA read an English
archetype name are each caught by the whole-row census rather than by a string match — and the aim
phrase arm reddens four clauses at once, because two keys lose their only reader when the provider goes
back to prose; and the bracket arm reddens the shape rule that exists for it.

**What is still not claimed**: the census reads the rows the provider produces *today* through six
plan shapes, so a seventh shape reachable only from a screen (a plan built with a `focusKeys` list
that names an attribute the dictionary has no row for) is covered by the static clause rather than by
the rendered one; `join(",")` lists resolve through `attr.name.*`, so an attribute key that is not in
the table still prints as itself, exactly as an unknown code var did before; the two Chinese columns
are checked for stray Latin, which means an English word spelled entirely in CJK homoglyphs is not
something this can see; the bracket rule counts styles rather than nesting, so a row that opens two
full-width brackets and closes two is fine even if they cross; and `data/`'s sample copy — news
items, lesson texts — is still authored prose by design, which is why only the plan and answer rows
are in scope.

*(Landing note: the `CODE_VARS`/`KEY_VARS`/`zoneKey` edits, the four new plan-facing keys and the
`ai.lead.general` repair above were left uncommitted in this shared working copy by an earlier run of
this session; the three census clauses, the bracket rule, their eye tests, the mutation arms, the
`proof-training` door fix and this section are the part added here.)*

### M231 — the film report's sentences are rows, and the clip library learns to read what it already stored

The Film Room's report was the last screen whose body text was composed in a module. `data/video.ts`
handed the panel English it had made itself, in five places at once:

```ts
note:  "Head check before ball arrives"                          // one of 21 captions, picked by rng
label: `${e.kind.toUpperCase()} @ ${e.t}s`                        // "SCAN @ 12s"
strengths:  ["Keeps the head up before receiving in open play", …]
weaknesses: [`Body orientation delays the next action on the ${attributeLabel(weak[0]).toLowerCase()} sequence`, …]
improvements: [`Open the body to play forward on the ${attributeLabel(weak[0])} reps`, …]
```

Every one of those reaches a screen, and two of them reach a *row*: `improvements[0]` was handed to
the coach prompt as a variable, so a 简体中文 reader's activity timeline read

```
录像复盘标记：Open the body to play forward on the passing reps。针对 控球 + 观察 构建一个训练环节。
```

— the M230 defect again, one module over, and invisible to every gate for the same reason: the row
was a key, the locale was complete, the words were already words. After the fix the same timeline
row reads `录像复盘标记：受压接球时打开身体，便于向前出球。针对 控球 + 观察 构建一个训练环节。`, and
the panel above it reads `球到之前先观察` for the caption, `观察 @ 第 12 秒` for the evidence frame
and `身体朝向拖慢了 控球 环节的下一步动作` for the weakness — the attribute named in 简体中文 inside
the sentence about the reader's own clip.

**What moved.** `VideoEvent.note`, `frames[].label`, `strengths`, `weaknesses` and `improvements`
are `RowText` now, and the provider hands rows. Two names joined `KEY_VARS` — `event` (a detection
kind, carried by the frame caption) and `improvement` (the row the film prompt names) — and `attr`
joined `CODE_VARS`, which is how the weakness names an attribute by key instead of by label. The ids
are declared where the pipeline lives: `VIDEO_KINDS` (seven), `VIDEO_KIND_KEY` (one row per kind, so
the badge stops printing the code), `VIDEO_NOTE_IDS` (three captions per kind, 21 literals) and
`VIDEO_IMPROVEMENT_IDS`. The seeded draw picks **which** caption, never the words — one `rng()` call
per detection, exactly the call the hand-written captions used — so a clip that was analysed before
this commit keeps the caption it drew and simply reads it in the reader's language. 36 rows arrived
in three locales; the suite prints 1720 keys where it printed 1684.

**The type is the gate.** A grep for the report's fields found the Film Room, and a truncated one
found only the Film Room — the Player OS carries a second copy of the same panel, and the plane's
`tsc` named it: `Type 'RowText' is not assignable to type 'ReactNode'` at four lines and
`string | number` at a fifth. Both screens now resolve every row through `rowLine`, and both build
their prompt with the improvement's key. The one field that is *not* a row is the note a reader
wrote about their own session, which is a value and stays one.

**What an old library holds.** Clips are stored in `localStorage`, so a report written before this
milestone holds plain strings where a row is expected — and `rowLine` throws on a string
(`"key" in row`). The hydration boundary repairs them: `parseFilmClips` maps each of the five fields
through `asRowText`, keeping the writer's words verbatim as values rather than guessing at them as
keys, which is the repair a plan's prompt (M223) and a goal's title already get. Without it the
Film Room would have crashed on the library it had filled itself, which is why the clause that pins
it reads a stored clip with a string in every row position and asks what it says.

**Measured, not inferred.** On the plane this commit ships (`git archive 311024b` + these files,
node_modules junctioned, no `.git`): `npx tsc --noEmit` exit 0, `node scripts/build.mjs` exit 0
(`✓ built in 58.97s`), `proof-film` **52/52** (six checks new), `proof-filmlibrary` 30/30,
`proof-i18n` **247/247** and `proof-localdata` 32/32. The clauses as the gate prints them:
`each of the 7 detections carries captions of its own, every one a row in all 3 locales (21 ids,
clean)`; `and a detection is named by a row rather than by its code on a 简体中文 screen (scan=观察
touch=触球 pass=传球 dribble=带球 shot=射门 turn=转身 press=逼抢)`; `every sentence of a real report
is a key that reads in all 3 locales (21 rows over 10 detections, clean)`; `the film prompt carries
the improvement as a key, so the timeline row is the reader's own words while the coach still gets
English`; `a clip stored before the report was rows is repaired at the hydration boundary and still
reads (Keeps the head up | Head check | SCAN @ 3s)`; and M230's census now reads `the variables that
resolve as keys are exactly the 6 this clause can find keys for (lead, target, game, zone, event,
improvement; …)` with `21 keys × 3 locales, all var-free` — which is also why every improvement row
is written without a placeholder: a sentence another row names cannot ask for variables of its own.

**The gate has to be seen to see.** `dev/m231-arms.mjs` puts one habit back at a time, restoring from
a start-of-run backup verified by hash, aimed at the plane through `M231_ROOT`:
**7/7 arms caught · 0 missed or crashed · 0 invalid needles · 0 restore failures**, with
`proof-filmlibrary` 30/30 and `proof-localdata` 32/32 green before *and* after. Each arm's first red
is the clause that names it: a strength handed over as the writer's words and a frame caption
composed in the provider again are both caught as `a value row reached the screen`; dropping `attr`
from `CODE_VARS` leaves the raw key inside the Chinese sentence; one caption left in English in a
Chinese column is caught twice (the caption census and the report census); a kind shipped with two
captions instead of three is caught by the id count; dropping the hydration repair is caught by the
stored-clip clause rather than by a crash; and an improvement row that grows a `{attr}` is caught by
the report census and by the prompt clause together.

**What is still not claimed**: the census renders the report the demo provider really produces, so a
caption id no seed can draw is checked for being a row rather than for being reachable — the draw
index is exercised by the pipeline, not enumerated here; `data/`'s sample copy (news items, lesson
texts) is still authored prose by design, and the film report was in scope because a screen labels
it as an analysis of the reader's own clip rather than as demo content; the two screens' panels are
still two copies of one layout, and M231 only made them read one set of rows; and the repair keeps a
stored sentence verbatim in whatever language it was written in, so a library filled before this
milestone still shows its English captions — translated words need a re-analysis, not a migration.

*(Landing note: the `KEY_VARS`/`CODE_VARS` additions, the provider's rows and the dictionary row
block were written in this working copy during the session that landed M230; the two screens, the
hydration repair, the six film clauses, the mutation arms and this section are the part added here.)*

### M232 — a proof that reads a row must ask the app what the row says

For three milestones the suite carried exactly one red, and every run that measured it wrote it
down as a production defect. It was not one. `proof:m74 — memory source cites a human label not a
raw key` was red from `311024b` (M230) through `e4a4b5a` (M229), and the README-adjacent note that
travelled with it claimed the coach's remembered attribute reached the reader as `passing` and that
"the fix is in that row's vars, not in the dictionary". Both halves are false, and measuring them
is the whole of this milestone.

**What the reader actually saw.** M230 moved the coach's prose onto rows: `data/ai.ts` hands the
memory source as `{key: "coach.src.coachMemory", vars: {focus: "passing"}}`, `focus` is one of
`domain/rowText.ts`'s `CODE_VARS`, and `rowLine`'s `fillRowVars` turns a code list into the
reader's own label — `Passing` in English, `传球` in 简体中文. The screen that prints sources,
`features/ai/AiStudio.tsx:131`, does that through `rowLine(s, t)`. So the sentence was right on the
page the whole time.

**What read `passing` was the gate.** `scripts/proof-m74.mjs` and `scripts/proof-m77.mjs` each
carried a private resolver: load `DICTIONARIES`, look the key up, and `replaceAll("{focus}",
row.vars.focus)`. That is a brace filler, which is all a dictionary template used to be, so it kept
working after M230 changed what a row *means*. Measured on the coach's own rows
(`dev/m232-resolve.mjs`, re-run against this milestone's plane bytes): **18 rows compared, the hand
resolver and `rowLine` disagree on 12** — every comma list printed as `scanning,passing,shooting`
instead of `Scanning + Passing + Shooting`, and the memory line as `last session focused on passing`
where the page says `Passing`. proof:m74's own assertion was `/Passing/i` — a case-insensitive test
of a lowercase code, i.e. a regex written to be satisfied by the thing it was trying to forbid. The
failure was invisible because the gate and the page were two interpreters, and only one of them was
being read.

**The fix is to stop having a second one.** Both proofs now resolve through
`scripts/lib/rows.mjs`'s `makeSay(server)`, which loads `translate`, `rowLine` and `DICTIONARIES`
the same way a screen does, and proof:m74 gained two clauses that the old file could not have had:
a census over both framings × {diagnosis, rationale, sources} × all three locales that no row
reaches any reader as a raw attribute code, a snake_case id or a bare dictionary key (**28 rows per
framing, 3 locales, 0 leaks**), and a locale clause that the memory row speaks the dictionary's own
word rather than English.

**The structural door, so the next proof does not repeat it.** `scripts/proof-i18n.mjs` section 34
refuses any `scripts/proof-*.mjs` (and `scripts/lib/*.mjs`) that reads a dictionary **and** indexes
that read with a row's `key` **and** substitutes `{brace}` placeholders by hand **and** never
acquires the interpreter. Three conditions and an absence, all read out of the comment-stripped
source (`codeOf`, the same line-based stripper the rest of the file uses — not
`rawUiScan.normalize()`, whose comment stripper eats the regex literal `/\{(\w+)\}/g` and would have
made the census blind on sight), because prose must be able neither to accuse nor to excuse. The
excuse is an *acquisition* — `import … "./lib/rows.mjs"` or a load of `/domain/rowText.ts` — not the
word `rowLine` appearing in a comment. The classifier is tested on shapes rather than on a count, the
way M194 requires: **3 refused** fixtures, with the resolver proof:m74 shipped until now included
verbatim, and **6 accepted** fixtures — the seam, `rowLine` loaded straight, a gate counting a
template's placeholders, a plain keyed label lookup, a JSX attribute brace scan, and a file that
holds the interpreter *and* does all three suspect things at once. Measured census line:
`42 scripts, 18 read a dictionary, 4 of them by a row's key, 17 hold the seam, 0 hand-rolled`.

**Arms, and the two things they bought.** Six arms, predictions fixed in
`dev/m232-arms-table.md` before the first one ran, each patch restored and hash-verified in a clean
plane (`git archive e4a4b5a`, this milestone's four files copied in and compared per-file):

| arm | mechanism destroyed | result |
| --- | --- | --- |
| a0 | nothing — unmutated control | 17/17 · 11/11 · 253/253, exit 0 |
| a1 | `makeSay` removed from proof:m74, the hand resolver put back | 5 m74 reds (overlap label, rotate label, memory label, row census, zh row) + 1 i18n census red naming `proof-m74.mjs`; m77 clean |
| a2 | the classifier's first brace-substitution spelling blinded | 2 i18n reds: the refuse-fixture clause and the derived both-ends clause |
| a3 | `/domain/rowText.ts` dropped from the accepted seam | 1 i18n red, at the accept-fixture clause |
| a4 | `focus` removed from `CODE_VARS` in the shipped interpreter | 5 m74 reds + 2 reds in proof-i18n's own pre-existing production clauses |
| a5 | the census population matches no proof script | 3 i18n reds at the floors, while the census clause itself stayed green |

a1's first run reddened only 4 of the 5 clauses I predicted, and the miss was the finding: the
rotate clause was `/Passing/i`, so a hand resolver that prints `passing` satisfied it. It is now
`/Passing/ && /Shooting/ && !/\b(?:passing|shooting)\b/`, and the arm bites. a3's first run reddened
nothing at all, which was also a finding: seven live scripts take the `rowText.ts` route but none of
them is a suspect on the other three conditions, so the alternative was a spelling with no carrier —
the 6th accepted fixture is what makes removing it observable now. a4 over-predicted greenness
because my model of which vars a diagnosis row carries was stale (`coach.diag.targetedExact` carries
`focus`). a2 and a5 each produced one red more than predicted, both at the same derived clause that
re-reads the quantities the aimed-at clause reads — a prediction table that names only the clause
aimed at is one layer short when several clauses read the same number.

**Baseline after this milestone**, all on the plane above with the bytes this commit carries: `tsc
--noEmit` exit 0 with 0 error lines, `node scripts/build.mjs` exit 0, `proof:m74` 17/17,
`proof:m77` 11/11, `proof:i18n` **253/253** (was 247), and the full suite **39/39 proof scripts,
2063/2063 checks counted, 0 red, exit 0**. Against the HEAD baseline of 2055 checks the delta is
exactly this milestone's own additions: proof-i18n 247 → 253 and proof-m74 15 → 17, with
proof-m77 unchanged at 11 — and the red that travelled since M230 is gone, because the thing that
was broken was the gate's idea of the sentence, not the sentence.

### M233 — the news impact read publishes rows, and the ratchet stops charging it for Tailwind classes

`domain/newsImpact.ts` was the last model module still composing its own English: sixteen sentences
across the panel's three lists — the standing line, the club line, the certainty paragraph, the
topics line, the unresolved warning, and four evidence lines. They are rows now (`ni.*`, keyed in all
three locales) and `features/football/FootballWorld.tsx` resolves them through `rowLine`, which is
where `context`/`watch`/`evidence` used to be printed as strings.

Three defects fell out of doing it:

- **A rank is a number, not `3rd`.** The module composed the ordinal suffix itself, so the row
  carried `3rd` and no language could put it back — Chinese writes 第 3 名. `ordinal()` is gone and
  the row carries `s.position`. `data/intelligence.ts` had already dropped the same suffix for the
  same reason, so this is the second place the tree agrees on it.
- **`{impact.certainty}` printed `high` at the reader.** The band chip rendered the raw code beside
  the percentage, and no scan sees an interpolated hole — the M191/M192 shape, a third time.
- **The article's own type needed a family of its own.** `kind` was already a rowText code variable,
  but for *retrieval* kinds (`club`, `player` → `ai.legend.…`); a story's kind says what it *claims*,
  shares no values with those, and would have been resolved as the wrong family. `NEWS_KINDS` now
  sits beside `SEARCH_KINDS` in `domain/types.ts`, a `stance` code variable gets its own branch, and
  `NewsArticle.kind` is typed by the union instead of spelling it out.

**The rule change, and why it is not a convenience.** Three of the module's nineteen counted literals
were `CERTAINTY_TONE`'s Tailwind class lists: `border-success/40 bg-success/10 text-success` holds
spaces and letters like a sentence, so section 31 charged it as prose. That is M181's format-literal
error again, so the rule now exempts a literal whose EVERY whitespace-separated token carries a `-`,
`/` or `:`. Every token, not "at least one" — `state-of-the-art passing` is prose, and a one-hyphen
rule would have exempted it. Both directions are fixtures. Ceiling 248 → 229, the module's cap 19 → 0,
and it joins `PROSE_ZERO`.

**A proof, because moving prose to keys without one is exactly how M232's blind spot happened.**
`buildImpact`'s rows had no coverage at all: `proof-feedranking` imports the module for
`rankNewsForClub` and never reads the panel. `scripts/proof-impact.mjs` (15 checks) resolves every row
through `scripts/lib/rows.mjs`'s `makeSay` — it asks the app what the row says rather than
pattern-matching the sentence — and asserts the three properties a keyed row can fail silently: no row
reaches any locale as a raw key, an empty string or a snake_case code; the words really change with
the reader's language; and no standing line carries an English ordinal in any locale. It also pins the
three zone arms, both club-line arms, all five stances as distinct, and the two conditional lines.

Three mutations, all caught: dropping `stance` from `CODE_VARS` (proof-impact), composing the ordinal
back into the rank (two proof-impact clauses), and putting one sentence back as a string
(proof-impact plus three proof-i18n clauses — reachability, the ceiling, and the module cap). Measured
after: `tsc` clean, build 0, proof-i18n **256/256** over **1744 keys × 3 locales**, proof-impact
15/15. Nothing was clicked in a browser.

**Still outstanding** (deliberately not faked): the domain modules whose English `label` fields are the
reference the drift checks hold their dictionaries against — `attributes.ts` (19), `training.ts` (19),
`onboarding.ts` (6) — can never reach zero by keying a render site, and `learn.ts` (83) is long-form
lesson prose that has not been touched.

### M234 — the profile's four cards are rows, and no career invents a club name

`domain/footprint.ts` was the largest counted prose holder left (25 of 229) and the only one whose
every sentence reached a reader: the four pillar cards' count lines and their "nothing yet" arms, the
three evidence lines and the two provenance sources. It composed all of them in English, so a
簡體中文 profile printed `4 sessions · 90 min trained` inside a Chinese page — the same shape M230
fixed for the coach, this time in the one screen where the three modes meet.

**The record holds rows now.** `FootprintRow.lines`, `Footprint.evidence` and `Footprint.sources` are
`RowText[]`, built as `{ key: "fp.player.sessionsOne", vars: { n, min } }` and read by
`features/profile/ProfilePage.tsx` through `rowLine`. **36 new `fp.*` keys ×3 locales: 1744 → 1780
per locale.** The singular/plural arms are separate keys (`…One` / `…`) because no `{n}` can pick an
arm — the rule `domain/history.ts` already follows.

**Two fields went away, and both were English-only.** `FootprintRow.label` held `"Player"` /
`"Manager"` / `"Film"` / `"Fan"`; the profile prints `t(\`prof.mode.${r.id}\`)` instead, so the field
had no reader once the title came from the dictionary. And the manager card wrote
`m.clubName ?? "Your club"` — a placeholder name no locale could translate. The absent case is its
own pair of keys now (`fp.manager.fixturesNoClub*`), so a career without a name prints no name
rather than an English one.

**`foci` joins `CODE_VARS`** for the film card's repeated-focus line, which carries a
`key:count` list (`passing:3,dribbling:1`) rather than the plain code list `focus` has always
carried. `codeWord` resolves each part and writes `Passing ×3, Dribbling ×1`, so the attribute
reaches the reader through `attr.name.*` — before this it went through `attributeLabel`, an English
label glued into a Chinese line.

**The ratchet moved down.** `DOMAIN_PROSE_CEILING` **229 → 204**, `PROSE_CAPS["domain/footprint.ts"]`
**25 → 0**, and `domain/footprint.ts` joins `PROSE_ZERO` (12 modules now). The inventory line reads
`attributes career community filmInsights learn onboarding training` — footprint has left it.

**`proof-footprint` reads rows the way the page does.** The proof used to compare `r.lines[i]` to
English strings; it resolves through `scripts/lib/rows.mjs`'s `makeSay` (M232's interpreter), so what
it matches is what ProfilePage prints. Two clauses are new: the four cards' rows plus the evidence
block must read differently in each non-English locale *and* contain that locale's script, and every
row key they publish must exist in all three dictionaries. One clause was **inverted**: it asserted
that a nameless career falls back to `"Your club"`, which is now forbidden.

**Mutation witness: four arms, all caught.** (1) the film card's absent-case put back as a plain
English string — five proof-i18n clauses (reachability, ceiling, module cap, cap sum, zero list);
(2) the zh-CN `fp.fan.none` row deleted — parity; (3) `{foci}` drifted to `{foci2}` in zh-TW —
placeholder agreement; (4) `foci` dropped from `CODE_VARS` — proof-footprint's focus clause reports
`passing:3,dribbling:1` reaching the reader. All restored.

Measured on the working copy: `npx tsc --noEmit` exit 0, `npm run build` exit 0, suite
**40/40 proof scripts · 2084/2084 checks · exit 0**, `proof-i18n` **257/257** at **1780 keys · 3
locales**. Ceiling **204 across 7 files**, raw-UI ceiling **0 across 0 files**, covered set **40**.

**Still outstanding**: the same three `label`-holding modules and `learn.ts`'s lesson prose; Manager
OS's five slider scale words; `domain/matchEngine.ts` and `domain/newsImpact.ts` are already at 0 and
pinned, so the remaining prose is concentrated in `learn/community/career/attributes/training/
filmInsights/onboarding`.

### M235 — the film panel's evidence and provenance are rows, and the screen that prints them is checked too

`domain/filmInsights.ts` held the last counted prose whose every line reaches a reader: the four
evidence lines and three provenance sources of the Film Room's "what keeps happening across your
clips" panel — the same object the Weekly Review cites. It composed all seven in English, so a
簡體中文 reader got `4 clips · 5 min analysed · 8 detections` inside a Chinese page. And the panel
printed them through an *expression*, `› {e}`, so the raw-UI scan (which reads literals in reader
files) saw no literal at that site while the prose audit counted twelve English literals here and
capped them at twelve: both gates were measuring the debt instead of stopping it.

**The record holds rows now.** `FilmInsights.evidence` and `FilmInsights.sources` are `RowText[]` —
`fi.ev.clips` / `fi.ev.clipsOne`, `fi.ev.busiest`, `fi.ev.trend`, `fi.ev.focus`, `fi.ev.none`,
`fi.ev.needSecond`, `fi.ev.noTrend`, `fi.ev.noFocus`, plus `fi.src.library` / `fi.src.provider` /
`fi.src.model`. **12 new `fi.*` keys ×3 locales: 1780 → 1792 per locale.** `FilmRoom.tsx` reads them
through `rowLine`; the first line's singular arm is its own key, the rule `domain/history.ts` and
M234 already follow.

**Two English-labelled reads became words.** The focus line called `attributeLabel(f.key)` — M230's
import, back — and now rides as `foci` (`key:count`), the `CODE_VARS` entry M234 added, so
`codeWord` names each part through `attr.name.*`. The busiest detection interpolated the stored
code (`busiest.kind`), which no dictionary could translate; it rides as `event`, a KEY var, and the
word is `vid.kind.*`.

**The kind table moved down a layer.** `FILM_KINDS` and `FILM_KIND_KEY` now live in
`domain/filmInsights.ts` — the module that composes the row naming them, since a domain module may
not reach up into `data/` — and `data/video.ts` re-exports both under the names the Film Room and
the review already import, so `VIDEO_KIND_KEY` stays one name with one home. `domain/review.ts`'s
`filmKinds` stopped widening `kind` to `string`, which is what lets those panels index it.

**Both panels stopped printing the code.** `FilmRoom.tsx` and `ReviewPage.tsx` printed `{k.kind}`
for the by-kind bars — `scan`, `dribble`, `press` as stored — and now print
`t(VIDEO_KIND_KEY[k.kind])`.

**The ratchet moved down.** `DOMAIN_PROSE_CEILING` **204 → 192**, `PROSE_CAPS["domain/filmInsights.ts"]`
**12 → 0**, and `domain/filmInsights.ts` joins `PROSE_ZERO` (**13 modules now**). The inventory line
reads `attributes career community learn onboarding training`.

**`proof-film` reads the panel's own rows, and now the screen too.** Two new clauses render the
four evidence lines and three sources from three fixture libraries (a busy one, one valid clip, an
empty one) in all three locales, refusing a placeholder that survives to the line or a Latin word
in a Chinese column; a third names the busiest detection by row and checks it against
`VIDEO_KIND_KEY`. A fourth pins the four render sites and both badges: the evidence list, the
provenance line and the `VIDEO_KIND_KEY` badge in FilmRoom and ReviewPage have to hand the row to
`rowLine`/`t(...)`, because a screen printing `String(e.key)` breaks the seam without breaking any
source-level literal scan. Moving the kind ids out of `data/video.ts` also required `proof-i18n`'s
KEY_VAR census to read `domain/filmInsights.ts` for `vid.kind.*` — left where it was, `event` finds
nothing and that clause goes red rather than silently shrinking.

**Mutation witness: five arms, all caught.** (1) the three sources put back as `{ value: "…English…" }` —
seven clauses across both proofs (reachability, row-is-a-key, ceiling, module cap, cap sum, zero
list, proof-film's value-row refusal); (2) FilmRoom's evidence map printing the id instead of
`rowLine` — the new render-site clause, which caught what every other gate missed; (3) the zh-CN
`fi.ev.trend` row deleted — parity, placeholder agreement, and proof-film's leak rule; (4) `foci`
dropped from `CODE_VARS` — proof-film reports `scanning:2,first_touch:1,passing:1` reaching a
Chinese line; (5) the busiest line's `event` var renamed `kind` — the row/placeholders clause,
proof-film's placeholder refusal, and the kind-name clause. All restored.

Measured on the working copy: `npx tsc --noEmit` exit 0, `npm run build` exit 0, suite
**40/40 proof scripts · 2088/2088 checks · exit 0**, `proof-i18n` **258/258** at **1792 keys · 3
locales**, `proof-film` **55/55**. Ceiling **192 across 6 files**, raw-UI ceiling **0 across 0
files**, covered set **40**.

**Still outstanding**: `learn.ts`'s lesson prose and the same three `label`-holding modules.
`domain/gap.ts`, `domain/matchEngine.ts`, `domain/newsImpact.ts`, `domain/footprint.ts` and now
`domain/filmInsights.ts` are at 0 and pinned, so the remaining prose is concentrated in
`learn/community/career/attributes/training/onboarding`.

### M240 — finishing the two reference tables' move, and the entry that went missing with it

Two half-landed milestones met in the working copy, and neither was green. This section corrects
the numbers the M237 section below reports, because they were never true of the tree.

**M237's move was never applied.** The commit created `data/onboardingLegacy.ts` and its message
said `domain/onboarding.ts` "drops to zero counted sentences" — but the module still held its own
copy of the map and still read from it. The ceiling was still 173, the module still counted 6, and
the section below reports 167 and `proof-i18n 261/261` for a tree that was neither. `onboarding.ts`
now imports the data table; the module keeps the behaviour (`toGoalCode`, `normalizeGoalChoice`)
and only the words moved.

**And the table arrived one entry short.** `data/onboardingLegacy.ts` was missing
`"Improve first touch": "firstTouch"` — five entries where the module had six. A profile saved
before the field held a code would have kept its English sentence for ever, printed by the goal
chip in every locale, which is the exact defect the map exists to repair. Nothing caught it:
`proof-timeline` asserted that every *code* maps to itself, and spot-checked two of the six
sentences. It now walks the table itself — every sentence is recognised, and there is one sentence
per goal code — so the table cannot claim a word it cannot recognise.

**The attribute tables moved the same way.** `ATTRIBUTE_LABELS`, `POSITION_GROUP_LABELS`,
`CATEGORY_LABELS` and `POSITION_BY_GROUP_LABELS` now live in `data/attributesLabels.ts`, and
`domain/attributes.ts` composes them through two small lookups. What that does and does not claim:
no screen's copy changes (every screen resolves `attr.name.*` / `group.*` through the dictionary,
and the M191 clause refusing a screen that prints a table's English label still passes), and the
drift checks holding the dictionary's English against these tables still run — they read
`ATTRIBUTE_DEFS[].label`, which is now composed from `data/`. What it does is stop the ratchet
counting a reference table the dictionary mirrors, on the reading M237 set out for the onboarding
map: these are records of English, not the model's own voice.

`AttributeDef` moved to `domain/types.ts` with them — `data/attributesLabels.ts` cannot import a
type from the module that imports it, which is what the half-applied copy did: the working copy
did not compile (`TS2724: '"../domain/types"' has no exported member named 'AttributeDef'`).

Ceiling **173 → 148**, caps for `attributes.ts` and `onboarding.ts` **19/6 → 0/0**, both join
`PROSE_ZERO` (**17 modules**). Inventory: `career 29, community 36, learn 83`.

Two mutations, both caught: dropping the legacy entry again (the two new proof-timeline clauses,
`5 of 6 codes`), and putting one English label back into `domain/attributes.ts` (three proof-i18n
clauses — ceiling, module cap, cap sum).

Measured: `tsc --noEmit` clean, `npm run build` exit 0, **all 41 proof scripts green**,
`proof-i18n` **262/262** over **1795 keys × 3 locales**, `proof-timeline` 100/100. Nothing was
clicked in a browser.

**Still outstanding**: `career.ts` (29), `community.ts` (36) and `learn.ts` (83) are the last three
modules carrying prose, and `learn.ts` is long-form lesson text rather than the model's voice.

### M237 — the onboarding legacy map moves to data, and the module clears its prose debt

`domain/onboarding.ts` held six English sentences in `LEGACY_GOAL_TEXT` — a reverse lookup table
that maps old stored profile text (`"Improve first touch"`, `"Get faster"`, …) to the canonical
goal codes (`firstTouch`, `getFaster`, …). These strings are never displayed; they only exist to
recognize data written before the field held a code. The prose audit counted them (six hits, cap
six), so the module could not join `PROSE_ZERO`.

**The legacy map moved to `data/onboardingLegacy.ts`.** The domain module now imports it, and
`data/` is not scanned for prose debt. `onboarding.ts` drops to zero counted sentences.

**The ratchet moved down.** `DOMAIN_PROSE_CEILING` **173 → 167**,
`PROSE_CAPS["domain/onboarding.ts"]` **6 → 0**, and `domain/onboarding.ts` joins `PROSE_ZERO`
(**15 modules now**). The inventory line reads
`attributes 19, career 29, community 36, learn 83` (167 across 4 files).

**Mutation witness: five arms, all caught.** (A) legacy strings put back in `onboarding.ts` —
four clauses (ceiling, module cap, cap sum, zero list); (B) one legacy entry deleted from the data
file — the reverse lookup breaks for that text (behavior regression); (C) `onboarding.ts` removed
from `PROSE_ZERO` — zero-list clause; (D) `onboarding.ts` cap raised to 6 — cap-sum mismatch;
(E) ceiling raised to 173 — ceiling breach. All restored.

Measured on the working copy: `npx tsc --noEmit` exit 0, `npm run build` exit 0, suite
**41/41 proof scripts · 2147/2147 checks · exit 0**, `proof-i18n` **261/261** at **1811 keys · 3
locales**. Ceiling **167 across 4 files**, raw-UI ceiling **0 across 0 files**, covered set **41**.

### M236 — the training session's title is a row, and the catalogue stops carrying its own words

`domain/training.ts` was the last domain module whose session title was a plain English string
(`\`${trained.join(", ")} session\``). It now produces a `RowText`:
`{ key: "trn.title.focus", vars: { attrs: trained.join(",") } }` or `{ key: "trn.title.none" }`.
`TrainingSession.title` in `domain/types.ts` narrowed to `RowText`. Three screens that printed the
title — Dashboard, PlayerOS, ProfilePage — switched to `rowLine(session.title, t)`.

**The catalogue shed its English labels.** The 18 `DRILLS` entries (`rondo`, `passing_triangles`,
… `shooting_under_fatigue`) each had a `label: "…"`. No screen read it; the label was dead weight
that the prose audit counted and the raw-UI scan would have flagged if re-added. All 18 labels
deleted. The dictionary gained `drill.*` keys (already present for catalogue coverage) and the two
title rows `trn.title.focus` / `trn.title.none` ×3 locales. `proof-i18n` gained a clause that
extracts drill keys by regex and asserts `drillKeys.length >= 18 && !drillLabelField`.

**The ratchet moved down.** `DOMAIN_PROSE_CEILING` **191 → 173**,
`PROSE_CAPS["domain/training.ts"]` **18 → 0**, and `domain/training.ts` joins `PROSE_ZERO`
(**14 modules now**). The inventory line reads
`attributes 19, career 29, community 36, learn 83, onboarding 6` (173 across 5 files).

**`proof-coverage` fixed a stale oracle.** The import-resolution helper treated `@/i18n` as a file
and crashed on `readFileSync` (`EISDIR`). The oracle now uses `existsSync(p) &&
statSync(p).isFile()`. The exempt list was stale (`lib/utils.ts` reached via `src/App.tsx`);
`EXEMPT = {}`, `EXEMPT_CEILING = 0`. Coverage suite: **17/17**.

**Mutation witness: six arms, all caught.** (A) title reverted to a template literal —
`proof-i18n` ceiling / module cap / cap-sum / zero-list / reachability / row-is-key + `proof-training`
title clause (9 red); (B) zh-CN `trn.title.focus` deleted — parity, placeholders, title leak (3 red);
(C) `attrs` dropped from `CODE_VARS` — `proof-i18n` plan leaks, `proof-training` title leak,
`proof-timeline` memory line (3 red); (D) one drill regains `label` — catalogue clause + 4 prose
gates (5 red); (E) one `drill.*` key removed from zh-CN — parity, catalogue clause, wordless clause
(3 red); (F) Dashboard prints `String(session.title)` — `proof-i18n` "every read of a keyed row is
resolved by rowLine" (1 bare read, 1 red). All restored.

Measured on the working copy: `npx tsc --noEmit` exit 0, `npm run build` exit 0, suite
**41/41 proof scripts · 2147/2147 checks · exit 0**, `proof-i18n` **260/260** at **1811 keys · 3
locales**, `proof-training` **44/44**. Ceiling **173 across 5 files**, raw-UI ceiling **0 across 0
files**, covered set **41**.

**Still outstanding**: `learn.ts` (83), `community.ts` (36), `career.ts` (29), `attributes.ts` (19),
`onboarding.ts` (6) — 173 across 5 files.

### M238 — the "needs a DOM" exemption was about a file, not a fact

`proof-coverage` keeps one exemption per app module no proof reaches, and `lib/hooks.ts` sat there
with the reason "React hooks (media query, local storage): needs a DOM". M237 moved the hook onto the
storage door, which takes the store as an argument, so the reason stopped being about the DOM at all.
This unit stopped trusting the reason and measured it: `proof-storage` gained a section (45 → 56
checks at that commit) that loads `lib/hooks.ts` and `domain/learn.ts` under the same SSR harness and
renders both hooks against a row the device kept, a row that does not parse, a store that rejects the
write, an accessor that throws on read and a document with no accessor at all. Two clauses keep the
section honest about its own claim: the loaded namespace is compared with the export list derived from
the file's own text (so a proof that loaded *something else* cannot pass by having loaded), and
section 5's document fixture is deleted before the load, because with it standing the old "no DOM"
wording was measuring my own harness. The exemption is gone; what remains is the SPA entry.

### M239 — the first proof that renders a screen, and what it charges the reader

Every gate in this repo read source. `proof-coverage` counted reachability inside its own directory
list, which stopped short of the screen layer, so the components `App.tsx` can put on screen were
loaded by no proof at all — measured, not asserted: 28 of the app's modules live under `features/`.
`scripts/proof-screens.mjs` loads every route-table screen through the app's own four providers and
renders it in every locale the dictionary itself ships, then makes three charges only a render can
make, all currently 0: an unresolved key reaching the page, a real key printed instead of its row, and
`undefined`/`NaN`/`[object Object]` in a figure slot. Locale is measured rather than assumed (no call
site's text vector equals its English one, and the honesty badge arrives as "DEMO DATA" / "演示数据"
with neither row on the other's page). Its limits are demonstrated too: `<App/>` renders the same
659-character hydration skeleton at three routes with 0 text nodes, which is why the populated states
still owed the live browser pass. The follow-up commit removed this file's own comment claiming the
ratchet could see every root it loads: it only sees literal-path calls, so a clause now measures that
boundary instead.

### M248 — the last eleven dead modules leave the disk, their orphan keys go with them, and every census in the three gates becomes a number that can be wrong

M247 measured 45 unreachable modules and deleted the 31 budget primitives two file-count floors were
holding. This milestone deletes the rest of the pile a visitor can never reach — **eleven files,
2,066 physical lines** (2,077 as the coverage gate counts them, which reads a file's last line even
when it has no terminator): the six proof fixtures (`breadcrumb`, `carousel`, `message-scroller`,
`pagination`, `sidebar`, `spinner`), the two live-browser exemptions (`chart`, `calendar`) and the
three files that existed only because the sidebar imported them (`separator`, `tooltip`,
`use-mobile`). The declared-dead ceiling moves **2,099 → 22** with exact equality, and what is left
declared is three modules that are dead on principle rather than by accident: the two Sites Edge
Function files, which this local-only build never bundles, and `src/vite-env.d.ts`, an ambient type
file with no runtime module to import. The pile's history across three milestones is **4,944 → 2,099
→ 22 lines**.

The copy left with the files. Fifteen `ui.*` dictionary keys had no reader except the modules above,
so they went in all three locales — **45 lines, 1,970 → 1,955 keys per locale** — and `ui.close` is
now the only surviving `ui.*` key, read by the two chrome files that still render. Getting there
cost two failed drafts and both are why the third one is written the way it is: a non-global regex
plus one `String.replace` per key deleted each key from `en` only and left 28 copies behind, and
`^\s+` at the front of that regex matched the *previous* line's terminator, so a whole-line delete
collapsed a comment and three unrelated keys onto one physical line, while `git diff
--ignore-all-space` on that draft reported a tidy "-24". The repair starts from `git show HEAD:` bytes, deletes
only lines anchored `[ \t]*"key":`, refuses any line that carries a second key, counts the removal
per locale (15/15/15) and per block (a locale's block ends at the next top-level declaration, not at
EOF — the trailing `DICTIONARIES` map otherwise reads as two more zh-TW keys), and the result is
verified as **-45/+0 blob-vs-blob, plain and with `--ignore-all-space`**. Parity across the three
locales is a key *multiset*: HEAD already orders them differently (first divergence at index 967
against zh-CN and 751 against zh-TW, with a set-difference of zero), so a sequence comparison would
have been a claim about formatting, not about vocabulary.

The three gates' censuses are now literals. M247 had landed `const TSX_PIN = tsxSrc.length; …
tsxSrc.length === TSX_PIN`, which is `X === X` — it cannot go red, cannot notice a scan that lost
files, and reads as a pin while being nothing. `proof-i18n` now pins **95** app modules, **49** `.tsx`
files and **98** files including `i18n/`; `proof-storage` pins **93** app files; `proof-coverage`
pins the population at **97**, its recursion depth at **42**, and — new here — the census *by
directory* (`components 14, data 7, domain 31, features 28, functions 2, i18n 3, lib 6, src 3,
store 1, ui 2`), because a total can be held while a whole subtree goes missing. Two clauses were
deleted rather than pinned: the number-exemption and unmounted-primitive witnesses, whose carriers
were the deleted files, and each was an `.every`/`.flatMap` over a table that is now empty — green
forever, and a story about a guard that no longer exists. The chrome section (9b) stayed: it trimmed
from 18 wiring rows to the two files that survive, and its "English these files would fall back to"
list is now derived from what the dictionary holds for their keys instead of a hand-typed list that
rots the day the copy changes.

Measured on a frozen plane (`git archive` of HEAD plus exactly this change set): pristine build
green, tranche build green, dist carrier delta dist shrank by 1,348 of 1,493,804 JS bytes across the same 35 chunks and 26,908 of 100,699 CSS bytes (Tailwind stops scanning the deleted sources), while ./index.html stayed byte-identical at 947, coverage gate 24/24, and the suite
the suite green at 41/41 scripts · 2,180/2,180 checks. On the working tree: `tsc` clean, `proof-i18n` **271/271** (was 273; the two clauses whose
carriers left are gone and the chrome section's three are re-derived over the survivors),
`proof-storage` **56/56**, `proof-coverage` **24/24**. Twenty-four witness arms across the two
harnesses, each MATCHED against a prediction written before the run: the coverage gate's ten (its
control, then a by-directory pin missing one entry, one typed off by a single module, the deep-count
pin off by one, the dead ceiling off by one, the population pin off by one, an invented file declared
dead, a dead reason shortened below the legibility floor, and the pair that differs by exactly one
predicate — a directory skipped under the new clause and under the old `<=` one), plus the fourteen
here. Those fourteen are two unmutated controls (green at 271/271 and 56/56), three pins typed one
off each naming exactly its own clauses, one selector losing its guard, the chrome section's three
arms each naming their own, and the two pairs that carry the argument: **the same fault run twice**,
`appSrc` missing one module with the pin literal (9 clauses name it) and with the pin derived from
the population it audits (6 do) — `APP_SRC_PIN: literal pin names 9 clause(s), derived pin names 6 →
the derived form is blind to [skipAudit, walkerThread, censusApp]` — and the storage copy of the same
idea, `APP_FILES: literal 1, derived 0 → blind to [stripper]`, whose derived arm (S2b) is green *by
design*, because `every` over a smaller population prints the same sentence about 93 files).
Dropping a file from a census also reddens three clauses that address it *by path* (a dynamic value
space that can no longer locate its source, the keyed-row floor that then sees 0 values, and a
dictionary key whose only dynamic reader it was); those sit on both sides of the pair and cancel out
of the delta, which is why the measurement is a difference of clause sets and not a count of reds.
One arm took a third form worth keeping: the first draft aimed the skip-a-directory pair at `ui` and
predicted two reds each way, and got three — POP_SKIP is matched by *basename at every depth*, so
`"ui"` skipped `ui/` and `components/ui/` together (16 modules, 14 of them three levels down), which
is what also reddened the deep-count pin. `store` is the only top-level name of its kind.

**Still outstanding** on this axis: nothing a visitor can reach is dead on the disk any more, so
what is left in the census are the two floors that still say `>=` (`proofs.length >= 30`,
`roots.length >= 25`), which will let the proof layer thin quietly until the day it doesn't, and two
constants still *named* `*_CEILING` whose clauses already demand exact equality — a name that
understates the gate it belongs to. Then the standing queue's prose units (M160's demo-coach locale,
M220's news-kind label, M184+'s composed sentences).

### M247 — the dead UI pile leaves the disk: the two population floors become pins, and the 31 budget primitives are deleted

The coverage ratchet measured a pile of 45 unreachable modules (4,944 lines) that no reader can ever reach:
six UI primitives kept as proof fixtures, two live-browser exemptions, three sidebar dependents, two Edge
functions, one ambient types file, and **31 budget primitives held only by two file-count floors in
`proof-i18n`** (`tsxSrc.length >= 60`, `allSrc.length >= 140`). Those floors were anti-vacuity guards for a
scan that now proves its own coverage with planted captions and a dictionary-touch witness; per the rule
"a floor can be walked under by a narrowing scan", both are replaced by exact pins (`TSX_PIN`, `SRC_PIN`)
measured at this shape, so the 31 files can be deleted and the pins move with them.

The six proof fixtures (breadcrumb, carousel, message-scroller, pagination, sidebar, spinner), the two
host exemptions (chart, calendar), the three sidebar dependents (separator, tooltip, use-mobile), the two
Edge functions and the ambient types file remain declared dead; their lines total **2,099** (was 4,944).
The population pin drops from 139 to 108.

Six arms, all caught: re-adding a deleted budget file (stale declaration), removing a declared dead file
without lowering the ceiling (stale ceiling), adding an unreachable module without a proof (population pin),
toggling a floor back to `>=` (the pin assertion), dropping a fixture from `DEAD_UI` (undeclared dead),
and deleting a file the pin protects (the pin clause).

Measured: `tsc` clean, build 0, **41/41 proof scripts green (2182 checks)**, `proof-i18n` **273/273** over
**1970 keys × 3 locales**, `proof-coverage` **24/24**. Nothing was clicked in a browser.

**Still outstanding** on this axis: the six proof fixtures and the two host exemptions are the next
dead-weight to retire — they block deletion of the three sidebar dependents and the fixtures themselves.

### M246 — the Knowledge Academy publishes rows, and learn.ts leaves the prose ratchet entirely

The last 83 counted sentences of `domain/learn.ts` — so the ceiling is **0** and the inventory is empty.
The module's own scope note had already decided where the words go: lesson text is editorial content
written for this product, not the model's voice, and this milestone took it at its word while keeping
the words where the reader meets them. A lesson is an id, a category, a length, a route, an answer index
and the KEYS of the sentences it shows (`titleKey`/`summaryKey`/`bodyKeys`/`tryIt.labelKey`/`quiz.qKey`/
`optionKeys`, written out rather than composed from the id, so the reachability scan sees every one and
a lesson cannot ship with a paragraph missing). The accounting layer's own voice went the same way:
`summarizeLearn`'s four evidence lines and two sources, and `recommendLessons`' twelve reasons, are rows
now (`learn.ev.*` / `learn.src.*` / `learn.rec.*`, keyed in three locales), resolved by `LearnHub`
through `rowLine` at the three places it printed a string.

**Every count word became an arm.** `attempts`/`attemptedOnly`/`dose`/`watchlist`/`filmClips` each glue
an English "-s" onto a number the module does not own. Each is a `…One`/`…Many` key pair chosen by the
boundary the record actually holds, and `proof-learn` builds the boundary rather than describing it
(attempts 1 → `attemptsOne`, 2+3 → `attemptsMany` with `vars.n === 5`).

**The category is a code, and six sites resolve it.** The lesson cards, the detail header, the
per-category badges and the filter strip all build `learn.cat.`/`learn.level.` at the screen (the level
lower-cased by the site itself); the value spaces are read out of `CATEGORY_CODES` and the `Level`
union, and `claimByPrefix` covers every expression under those prefixes the moment each is declared.

**A row inside a row.** The evidence line that names the untouched category hands the reader a nested
keyed variable — `vars: { cat: { key: \`learn.cat.${code}\` }, n }` — which `fillRowVars` resolves at the
column, so the sentence and its subject are worded once, in one language, and the composed key never
needs a spot in the row literal at all (the screen's declared dynamic sites claim its reachability).

**The module stopped labeling attributes.** `recommendLessons`' load reason called `attributeLabel` —
M234's defect in the film report, alive here: a 简体中文 reader saw `Sprint, Passing` inside a Chinese
sentence. It hands `attrs` codes now (`attrs` is a code variable), and the proof renders all three
locales and asserts each line shows its own dictionary's words, no line shows the code, and no
placeholder survives.

**Three screens follow the key.** The Activity History's lesson row (`lessonTitleRow`) and the community
composer's academy card (`latestLessonTitle`) read `l.titleKey` — the first because a timeline event fed
`title: { value: <the old English> }` would have put the words back one screen away from the module that
no longer holds them.

**The row audit had a blind spot, and the code moved instead of the regex.** A row whose key was chosen
by a ternary *inside* the literal (`{ key: cond ? "a" : "b", vars }`) never matches `ROW_LITERAL`, so its
placeholders were unaudited — the vars-drift arm proved it by going green in `proof-i18n`. The rows are
split into one literal per branch now, each carrying its own quoted key: 335 row keys are audited and
the pattern is unchanged.

Ceiling **83 → 0**, `learn.ts` cap **83 → 0**, and it joins `PROSE_ZERO` (**20 modules**).
Inventory: **none — every module in `domain/` is at zero.**

`proof-learn` moved onto rows wherever it read one: the English sentences it asserted are the keys and
vars those rows must carry now, plus one clause no gate covered — every key a lesson *carries* exists in
all three locales (`bodyKeys`/`optionKeys` are arrays, which the `*Key` field scan skips by design).
**73/73**, was 72.

Six mutations, all caught: prose put back as a `{ value }` (six `proof-i18n` clauses), a zh-CN key
deleted (locale parity), the badge's dynamic site dropped (stale declaration), a vars name drifted (row
placeholder parity — after the restructure; before it, `proof-learn` caught it alone), the quiz's only
`t(qKey)` removed (the consumer clause), and a typo'd key (row audit + reachability).

Measured: `tsc` clean, build 0, **41/41 proof scripts green (2182 checks)**, `proof-i18n` **273/273**
over **1970 keys × 3 locales** (90 dynamic sites, 335 row keys), `proof-learn` **73/73**. Nothing was
clicked in a browser.

**Still outstanding** on this axis: nothing — `DOMAIN_PROSE_CEILING` is 0, the per-module caps sum to 0,
and the zero list holds all 20 modules, so a new sentence in `domain/` fails the gate that measures it.

### M245 — the manager's career model publishes rows, and the venue stops printing "Home" at the reader

The last 29 counted sentences of `domain/career.ts` — the three panels' prose. `seasonOutlook`'s four
evidence lines and three sources, `matchPrep`'s ten rationale lines and three sources, and
`seasonSummary`'s record/stats/prize/best/worst/remaining lines are rows now (`mgr.*`, keyed in three
locales), resolved by `ManagerOS` through `rowLine` at the five places it printed a string.

**Every count word became an arm.** The retrospective read `1 fixtures`, `1 matches` and `1 clean
sheets` — three reachable one-fixture shapes the module glued an "-s" onto. Each is a pair of keys now
(`…One` / `…`), and the proof tests the boundary rather than the abstract: a one-fixture career is
built and asserted (`1-0-0 from 1 fixture · 1 scored, 0 conceded (GD +1) | 3 pts · 3.00 pts/game ·
1 clean sheet | Prize money earned €2M across 1 match | …`). The optional lines are absent rather than
empty strings, which is what the old `.filter(Boolean)` did by accident.

**`{p.venue}` printed `Home`/`Away` at whoever was reading.** The pre-match panel's title chip rendered
the record's own enum, and no scan sees an interpolated hole — the M191/M192 shape once more. It
resolves through `mgr.venue.*`, with the `MatchPrep.venue` union as its space.

**One sentence may not live under two keys.** The remaining-fixture line was first added as
`mgr.summary.remaining`, and the gate refused it: `mgr.fixturesLeft` already carries that exact
sentence for the profile screen. The row reuses `mgr.fixturesLeft` and the duplicate key is gone,
which is the check working as intended rather than a rename.

Ceiling **112 → 83**, `career.ts` cap **29 → 0** and it joins `PROSE_ZERO` (**19 modules**).
Inventory: **`learn.ts 83` — the last one.**

`proof-career` (the repository's largest, 183 clauses) moved onto `scripts/lib/rows.mjs`'s `makeSay`
rather than keeping its own interpreter — it already loaded `DICTIONARIES`, so a hand-rolled resolver
here would have been the exact shape M232's section-34 door refuses. It gained three clauses for
**186/186**, was 183.

Three mutations, all caught: the plural arm always winning (the boundary clause, printing
`1 fixtures`), an English rationale put back as a literal (three proof-i18n clauses), and the venue
chip printing the record again (the stale-declaration clause).

Measured: `tsc` clean, build 0, **41/41 proof scripts green**, `proof-i18n` **266/266** over
**1874 keys × 3 locales**, `proof-career` **186/186**. Nothing was clicked in a browser.

**Still outstanding**: `learn.ts` (83) is the last module carrying prose, and it is long-form lesson
text rather than the model's own voice — deciding whether it belongs in `domain/` at all is the first
step, not keying it.

### M244 — the discussion starters publish rows, and community.ts leaves the prose ratchet entirely

The last 21 of `domain/community.ts`'s counted sentences were the four `buildStarters` drafts — the
career, training, academy and watchlist cards the composer offers a visitor. They are rows now,
resolved by `CommunityHub` through `rowLine` at the four places it read a string.

**One new code family, because three copies of a long sentence is the alternative.** `buildStarters`
worded a record against its points with `"ahead of"` / `"in line with"` / `"behind"`, computed from
points-per-game at 1.8 and 1.2. That is one word of a two-sentence draft, so it is a code now:
`RECORD_FEELS` in `domain/types.ts`, a `feels` code variable, and a `comm.feels.*` branch in `rowText`
beside the others. The proof reads the union out of `domain/types.ts` rather than retyping the arms.

**The focus attribute stopped being labelled in the module.** The training draft named its top focus
through `attributeLabel` — the same defect M234 fixed in the film report, where a Chinese draft read
"passing" inside a Chinese sentence. It travels as the `a` code variable now, so the draft says 传球,
and `attributeLabel` is no longer imported here at all.

**Two shapes the audit refused, and both were right to.** The drafts' `vars` were written as
`{ ...vars, minutes: … }`, and proof-i18n's placeholder audit reads a `vars:` body through a
balanced-brace scanner and refuses a shape it cannot read — so the bodies are written out in full.
And the `comm.feels.` space was first declared with a `\];` terminator, which does not match
`[...] as const;`: the non-greedy scan ran on to the next array in `domain/types.ts` and the clause
reported seven values, four of them attribute categories. Both are the gate doing its job, and both
are recorded rather than quietly fixed.

Ceiling **133 → 112**, `community.ts` cap **21 → 0** and it joins `PROSE_ZERO` (**18 modules**).
Inventory: `career 29, learn 83` — the last two. `proof-community` moved its starter clauses onto
the seam (52/52, was 49) and gained three: every draft reads in the reader's language title and body,
the attribute is resolved rather than printed as a key, and the record-feeling arm is a code. Two
mutations, both caught.

Measured: `tsc` clean, build 0, **41/41 proof scripts green**, `proof-i18n` **264/264** over
**1838 keys × 3 locales**, `proof-community` **52/52**. Nothing was clicked in a browser.

**Still outstanding**: `career.ts` (29) and `learn.ts` (83) are the last two modules carrying prose,
and `learn.ts` is long-form lesson text rather than the model's own voice.

### M243 — the community board's seeded content speaks the reader's language

`domain/community.ts` was the largest module still composing its own English: eight sample opinions,
four sample questions, the title and body of every seeded thread, and the thread and reply a visitor
writes themselves. All of it is rows now (`comm.*`, keyed in three locales), and
`features/community/CommunityHub.tsx` resolves each one through `rowLine` at the five places it
printed a bare string.

**The reply bank became two arrays of keys.** `OPINIONS` and `QUESTIONS` held sentences and a seeded
index chose between them, which no dictionary can be asked about — so a reader on 简体中文 saw English
sample replies under a Chinese thread. They are `OPINION_KEYS` / `QUESTION_KEYS` now, and the same
seeded index picks between keys. `proof-community` reads the key arrays out of the module rather than
retyping them, exactly as it read the sentence banks before, and asserts every key names a sentence
the dictionary holds in every locale.

**The visitor's own words are values, not keys.** A thread or reply written on the device is stored
as `{ value: text }`, never translated, and `repairCommunityTexts` wraps what earlier builds stored as
plain strings at the community board's hydration boundary — the same repair a session title, a goal
title and a coach prompt get. The proof pins the case that matters: a stored sentence that *looks*
like a key (`"comm.opinion.1"`) stays the writer's words and is not translated.

**Two consequences worth recording.** The list filter searched `(th.title + th.body)`, which would
have searched `"[object Object] [object Object]"` — it resolves both rows first, so it searches what
the reader can see. And a news thread's headline stays a `{ value }`: it is the article's own word,
and the module never had the right to reword it.

Three mutations, all caught: a reply key that is not a dictionary key (the bank clause), the repair
returning the store untouched (the repair clause), and a seeded sentence put back as a literal —
caught by the bank clause, the bank-coverage clause, and M232's own "a row value is prose typed in
this module" clause, which names the module and the literal.

Ceiling **148 → 133**, `community.ts` cap **36 → 21**; the remaining 21 are `buildStarters`, which is
the next unit. Measured: `tsc` clean, build 0, **41/41 proof scripts green**, `proof-i18n` **262/262**,
`proof-community` **49/49** (was 45). Nothing was clicked in a browser.

### M242 — delete the six largest UI primitives no reader can reach, and write down the other thirty-one

The coverage ratchet carried 37 `components/ui/*.tsx` files as "shipped dead code" without ever
measuring what that costs the bundle. Measured on a build plane: the 37 files, 4,398 lines, contribute
exactly **0 bytes** to `dist/assets/*.js` (35 chunks, 1,451,828 bytes, the same total before and after)
while still contributing **80,635 bytes** to the one stylesheet Tailwind builds by scanning sources —
dead weight a reader downloads and can never render.

It deletes the six largest (1,547 lines): `attachment`, `combobox`, `context-menu`, `dropdown-menu`,
`field`, `menubar`. The other 31 are declared by name in a new `DEAD_BUDGET`, and the reason is not
this gate's taste: two anti-vacuity floors in `scripts/proof-i18n.mjs` (`tsxSrc.length >= 60`,
`allSrc.length >= 140`) count `.tsx` files in the tree, and deleting all 37 walked the second down to
109 while proof-coverage itself stayed green. Both floors are the shape M220 retired elsewhere for the
same reason — a scan that has grown a plant-based witness does not need a population floor — but
proof-i18n is another run's file to change, so this unit deletes what it can and names what it cannot,
each with the artifact that has to move first.

`DEAD_REASON_BUDGET`, `DEAD_REASON_PROOF` and `DEAD_REASON_HOST` replace the single blanket reason, so
the three exemptions that are not deletion candidates say why: `chart` and `calendar` carry live
browser-locale exemptions keyed by their path in proof-i18n, and `sidebar` is loaded by that gate's own
section 9b as a fixture.

Verified on the plane the work was measured on: `tsc` rc=0, build rc=0, **41/41 proof scripts,
2158/2158 checks, suite green**, chunk manifest identical in total size. Committed in a later session
than the one that measured it — the working copy carried it finished but uncommitted, and
`dev/m242-verify2.log` is the measuring session's record.

### M241 — charge the 6,497 lines of UI the coverage ratchet never looked at

`proof-coverage` asked one question — *does a proof load this module?* — and answered it over three
directories read flat, one level deep. That made the census blind on the layer a reader stands on:
`components/ui/alert.tsx` was not a module the gate knew existed, because the walk stopped at the first
`/`. Its population was 41; the app ships 145.

**The second question is the sharper one.** Entry-reachability from `src/main.tsx` — the module the
bundle really starts at, rather than the set of proofs — finds 51 of those 145 unreachable by anything
the app mounts: 47 `components/ui/*` primitives, `hooks/use-mobile.ts`, the two Edge Function files and
one ambient declaration, 6,497 lines. They are now `DEAD`, reason written per path, with a ceiling
pinned to the measured total: the number only goes down, and the way to move it is to delete the file.
Nothing was deleted here — the debt was invisible, not new.

The JS half of that claim was checked outside the gate before it was written down, and the check
corrected the first draft. A `data-slot` literal from four declared-dead primitives (`combobox-chip`,
`tooltip-content`, `sidebar-wrapper`, `chart-container`) appears in 0 of the 35 `dist/assets/*.js`
chunks of a fresh plane build, while the same search finds `cmdk-input-wrapper` — from a primitive the
app does mount — inside a chunk. But two of those four modules' class names *do* reach
`dist/assets/index.css`, because Tailwind scans source files rather than the module graph. So the
honest statement is "no reader can render them", not "they ship nothing".

`EXEMPT` shrank to the single module a proof genuinely cannot load (`src/main.tsx`, 9 lines, since
`createRoot` needs a DOM node), and M239's boundary clause in `proof-screens` — which compared the
screens against the ratchet's old flat `DIRS` line — now derives the walk's own skip set and reports
the eleven directories it really counts. Same clause, same 22 checks.

Two holes opened while the witness arms were being *designed*, and both are fixed in the shipped gate.
A stale `DEAD` entry only had to be unreachable, so an arm that narrowed the walk left 47 names pointing
at nothing and the stale checks still passed — the predicate now also requires each declared path to be
in the population. And a name invented into the list made `lines()` `readFileSync` it, killing the gate
with ENOENT before any tally printed; the first draft guarded the line-sum only, and the same arm found
the second crash site in the biggest-three clause, so every read of a declared name goes through
`safeLines`.

Witness: 8 arms on a `git archive` plane, predictions and clause names written into
`dev/m241-arms-table.md` first — flat walk 6/6, wiring a dead primitive into `src/App.tsx` 3/3,
undeclaring `kbd` 3/3, inventing a path 2/2 (the tally prints instead of crashing), `EXEMPT_CEILING = 0`
1/1, the entry moved from EXEMPT into DEAD 6/6. One arm — retargeting `APP_ENTRY` to `src/App.tsx` —
predicted 2 reds and measured 3: the third is the seed-directory clause, whose `APP_ENTRY in EXEMPT`
conjunct also binds the entry's identity. The gate was stricter than the derivation, so the row keeps 2
as what was predicted rather than being retuned.

Measured on the plane at this commit: `npm run build` exit 0, suite **41/41 proof scripts ·
2158/2158 checks · exit 0**, `proof-coverage` **24/24**, `proof-screens` **22/22**. Dead ceiling
**6497 across 51 modules**. The next unit's shape is measured rather than guessed: 6 of the 51 are
named by `proof-i18n` section 9b's path list and stay, 3 more (`separator`, `tooltip`, `use-mobile`)
are imported by `sidebar.tsx` so they cannot go before it does, and the remaining **42 modules ·
5,019 lines** are deletable without breaking `tsc`.

### M282 — the seed's goal events name the shot, not the dictionary key

M279 filled the long-dormant match events seam: every finished fixture now carries
generated goal events whose detail row is `sim.ev.goal`. But the seed filled the shot
var with a dictionary KEY (`sim.shot.${shotType}`) instead of the raw code the code-word
lookup expects — "shot" is a code var, so `fillRowVars` handed `sim.shot.tap_in` to
`codeWord`, which matches no raw-code list and falls through to its honest fallback:
print the code as written. Measured over the shipped seed: 834 goal events × 3 locales
= **2,502/2,502 renders leaking** — a reader in any language saw `xG 0.13 ·
sim.shot.right_foot` on the match page's timeline (`Details.tsx` renders `m.events` when
present). The two-line data fix itself rides in the stats-reader commit below; this
milestone adds its lasting contract: proof-world renders every seed goal event in all
three locales and pins each shot word to the dictionary's own value for that event's
code (floor 400 events), so no future var can hand a key where a code belongs. (M281
was double-used — the dead-field deletion above and the stats-reader commit below —
a side effect of two sessions sharing the repo; M282 is single-owned.)

Measured: `tsc` clean; proof-world **37/37**; suite **41/41 · 2,341/2,341**;
`npm run build` exit 0. Code as **1829295** (+21 gate lines in proof-world.mjs).
### M281 — the seed's sixth English sentence is deleted, not just unread

M274 keyed the news headline and rebuilt the summary on the glass, but the record kept
a raw `summary` string composed from a sixth English template at boot, "kept for
matching". The measurement that would justify keeping it never existed: `globalSearch`
scores the raw title, retrieval ranks by it, and every summary the AI evidence card or a
community thread quotes is rebuilt from `ni.summaryLine` — zero readers in app code,
zero in the proofs. M281 deletes the field and the boot-time composition (`NewsArticle`
and `buildNews` each lose a line), so the seed no longer writes English prose nobody
reads.

The same pass removed a stale claim next door: `intelligence.ts` said the scout's
headline was still composed English inside `domain/scouting.ts`, but scouting has been
keyed (`sc.out.head.*`) since M270. And clause **37i** now pins the deletion in source
— no `summary` field on the record, no `summary:` line in the builder, no raw
`.summary` read in the composer file — with one planted shape charging the pass.

Measured: `tsc` clean; proof-i18n **356/356** · 2,001 keys × 3 locales (vacuity
census 381/384); suite **41/41 · 2,340/2,340**; `npm run build` exit 0. Code as
**26e698b** (−1 line in types.ts, −1 in footballSeed.ts, 3 comment lines corrected
in intelligence.ts, +16 gate lines in proof-i18n.mjs).

**A second unit under the same number (M346).** Two sessions took M281 at once, and both landed.
The other is `bc4f917`, whose commit subject is the heading it used to carry — "the recorded match
stats find their reader" — and it is a different unit entirely: `Match.stats`, shipped write-only by
M280, finds its reader on the match detail page; `StatCompare` takes a plain stats pair instead of a
`SimResult`, so the engine's `SimTeamStats` and the seed's `MatchStats` feed the same ten rows; the
ratings `<details>` renders only when a simulation produced them; and the seed's `duelsWon` field is
renamed `duels` so M280's "reuses the engine's shape" claim is literally true. Measured there: suite
**41/41 · 2,341/2,341**, `npm run build` exit 0, +35/−27 across 4 files.

Both accounts live under this one heading, because neither can be renumbered without inventing a
number no commit carries. The collision is recorded rather than papered over.

### M293 — the dashboard's fixture labels run on the world's clock

The today panel selects its fixtures on the world's clock (M289) but labelled
them with the reader's: `relativeDay` measured every kickoff against the
reader's midnight, so on this tree — whose anchor (2026-09-22) sits two weeks
behind the reader's clock — the panel promised "today" and printed
`14d ago`/`13d ago` on every row. Measured: 45 of 45 panel rows read as past.
Across the favorite-club upcoming lists the drift inverts direction outright:
141 distinct fixtures, and a fixture the world counts six days out read
`8d ago` — the panel's own "Today" was nowhere on it.

The fix gives the door a reference: `relativeDay(locale, iso, now)` takes the
now to measure against as an optional third argument, defaulting to the
reader's clock — a timestamp the reader wrote (the activity line's
`completedAt`) is theirs to read, and stays reader-relative. `FixtureRow`
passes the world's anchor, the same clock its lists select on; the panel's
five rows now read `Today 09:30 AM`-shaped, and a fixture six days out reads
`in 6d`.

Two gates. `proof-i18n`'s relative census now treats a parameter default as
the alias it is — `now = Date.now()` is the M218 hoist wearing a signature —
with a new plant pinning the shape, and a new clause plants the flip the
drifted panel shipped: a day the reader calls `13d ago` reads as tomorrow on a
clock 14 days behind, and stays `13d ago` on the reader's own. `proof-screens`
5e charges the dashboard's own English render: five clock-bearing today rows
(floor 5) and zero of the `d ago` labels the page shipped with.

Measured: `tsc` clean; `proof-i18n` **357/357** · 2,005 keys × 3 locales (vacuity
census 383/384); `proof-screens` **26/26**; suite **42/42 · 2,364/2,364**; `npm run build`
exit 0. Code as **6998f1c**.
### M294 — the live strip names the world's in-play count

The dashboard's live strip kept four cells and its header printed the bare
word "Live" — no count, no door. Measured on the shipped world: 49 matches are
in play at the anchor instant (UCL alone 17), the strip shows 4 of them, and
the other 45 were reachable from nowhere on the page the reader lands on — the
today panel selects `SCHEDULED` only, so a match left the dashboard the moment
it kicked off. Search reaches all 49 by club name and every competition's page
leads with its live fixtures (M290), but the front door hid most of the
world's present.

The fix is a count and a door: the strip's header now prints the world's
in-play total (`dash.liveAll`, three locales) and links to the matches
screen's LIVE tab — a deep link the tab already honoured via `?status=`. The
number the header prints is the world's (49), not the strip's own capacity
(4).

Two gates. `proof-screens` 5f charges the dashboard's English render: the
header's count must exceed the strip's four cells — the exact shape the bare
word shipped without. `proof-i18n`'s call-shape census pins the new literal
vars site (1,300 literal / 136 with placeholders), and the new key joins the
parity checks the dictionary already walks.

Measured: `tsc` clean; `proof-i18n` **357/357** · 2,006 keys × 3 locales (vacuity
census 384/384); `proof-screens` **27/27**; suite **42/42 · 2,365/2,365**; `npm run build`
exit 0. Code as **6a391ce**.
### M295 — the matches screen's counter counts the world, not its page

The matches list keeps 60 rows, and its header printed the ROW count —
`{n} {status}` with `n` read off the sliced array — so the header said
`60 scheduled` while the world held 502, and `60 finished` of 1015. Only the
live tab's 49 slipped under the cap and read true, by accident rather than by
construction. The same slip shipped on the hub's own turf: the dashboard
learned to name the world's in-play count at M294, and one screen later the
matches page was still counting its own rows and calling the count the
world's.

The counter now reads the untruncated family — `matchesByStatus(tab)` for the
number, the 60-row page cap unchanged — so the header names the population it
draws from instead of the slice it kept.

One gate. `proof-screens` 5g renders the hub itself — MatchesList is
FootballWorld's own dispatch, not a route-table leaf, so the render walks the
hub the way 5c walks it — and charges the printed number to the world's
family: printed 502, world 502, cap 60. The vacuity ceiling pays for the new
clause in the same commit (384 → 385).

Measured: `tsc` clean; `proof-i18n` **357/357** · 2,006 keys × 3 locales (vacuity
census 385/385); `proof-screens` **28/28**; suite **42/42 · 2,366/2,366**; `npm run build`
exit 0. Code as **fa7ab1b**.
### M296 — the search screen's counters count the world, not the cut

SearchPage rendered `globalSearch(term, 60)` — five kinds ranked together,
then cut to 60 survivors — and printed each surviving group's length as its
count. A broad query fills the 60 slots with high-scored players and clubs:
`q="a"` printed `48` players and `12` clubs while the world holds 591 and 55,
and 1,464 matching matches plus 23 news items left the page with no trace
they existed — the screen declared kinds empty that were not. The same probe
cleared the news screen: `rankNewsForClub` reorders, never filters, so its
hint and body agree at every favourite-club setting.

The scans move to an uncut `searchAll`; `globalSearch` stays the ranked cut,
and a new `searchTotalsByType` reads the uncut per-kind totals. Each group
counter now prints its kind's world total — `{n} found`, one row per locale.

One gate. `proof-screens` 5h renders `#/search?q=a` and charges the printed
numbers to the world's uncut family: 591 and 55 printed where the cut held
48 and 12, and the largest printed total exceeds the 60-slot cap, so no
residue of the cut can satisfy it. `proof-i18n` pays for the new `t()` site
and the new clause in the same commit (literal 1300 → 1301, var sites 136 →
137, vacuity ceiling 385 → 386).

Measured: `tsc` clean; `proof-i18n` **357/357** · 2,007 keys × 3 locales (vacuity
census 386/386); `proof-screens` **29/29**; suite **42/42 · 2,367/2,367**; `npm run build`
exit 0. Code as **72ff14f**.
### M297 — the hub's in-play counter counts the world, not its strip

The hub keeps a six-row live strip and printed `{n} in play` with `n` read
off the sliced array — so the hub said `6 in play` while the world held 49.
M294 taught the dashboard's strip to carry the world's count; the football
hub, one screen over, was still counting its own rows. The counter reads the
uncut family — `liveAll` for the number, the six-row strip unchanged.

One gate. `proof-screens` 5i renders `#/football` and charges the printed
number to the world's live count: printed 49, world 49, strip rows 6. The
vacuity ceiling pays for the new clause in the same commit (386 → 387).

Measured: `tsc` clean; `proof-i18n` **357/357** · 2,007 keys × 3 locales (vacuity
census 387/387); `proof-screens` **30/30**; suite **42/42 · 2,368/2,368**; `npm run build`
exit 0. Code as **f5f70c5**.
### M298 — the player OS's training counters count the world, not their cut

The Training tab derived both of its counters from the same expressions it
rendered rows with: `missed` was `filter(status === "missed").slice(0, 8)`
and the slipped hint printed `missed.length`; `history` was
`filter(status === "completed").slice(0, 20)` and the completed hint printed
`history.length`. A reader with 9 missed sessions saw `8 slipped`; 40
completions printed `20 completed`. The probe pairs each derivation with its
hint and computes the shortfall against worlds the cuts cannot represent
(9 → 8, 40 → 20).

The counters now read the uncut family — `missedAll`/`historyAll` for the
numbers, the 8- and 20-row cuts unchanged — the same split the dashboard's
strip took at M294, the football hub's at M297, and the search screen's at
M296.

The gate is the first clause that measures its own absence. The training
counters live behind `state.profile`, and the OsProvider reads localStorage
inside a `useEffect`, which renderToStaticMarkup never runs — so no screen
render here can reach the tab with data in it. `proof-screens` 5j plants a
full os-state blob (a profile plus 9 missed and 21 completed sessions, worlds
the cuts cannot represent) under the app's own storage key and renders
`#/player/training` anyway, and the page still shows the profile-setup empty
state: the harness provably cannot feed the player OS data, the fixed
counters owe the live browser pass (#142), and any green render of this tab
here would have been the empty state wearing the tab's name. The vacuity
ceiling does not move: 5j asserts a positive fact (the empty state prints)
alongside its zero, so the census's zero-asserting class does not count it —
the census read 386 owing against ceiling 387 before and after this commit,
which also shows the earlier sections' `N/N` census figures recorded the
ceiling, not the owing.

Measured: `tsc` clean; `proof-i18n` **357/357** · 2,007 keys × 3 locales (vacuity
census 386 owing / ceiling 387); `proof-screens` **31/31**; suite **42/42 · 2,369/2,369**; `npm run build`
exit 0. Code as **b3b849c**.
### M299 — the ledger line that outlived its own repair

M216's outstanding list charged `data/ai.ts` with "12 sentences a person
reads still interpolate English words", and the charge survived every
later sync — but the code it described did not. M230 built the NAME
contract in `domain/rowText.ts` (a row's variable is dispatched by its
NAME: `focus`/`attrs`/`trained`/`last`/`new`/`arch`/`arch2`/`drill`
resolve part by part through `codeWord`, `target`/`game` resolve as
keys, the load zone through `zoneKey()`) and rewired the coach's rows to
it. The ledger line was reading a repair that had already happened.

M299 charges the module instead of the memory. Static: every vars name
`ai.ts` writes is a code var, a key var, or one of five plain
word/number slots, and every joined list is a code var; all 25 keys the
module names resolve in all three dictionaries. Dynamic: eleven
`generatePlan` variants — targeted exact/partial (the partial arm needs
a session too short to carry every asked attribute), the three load
zones with caution both with and without a ratio, a flagged request, a
memory that continues and one that rotates, recent history — render 372
rows across the locales with no raw attribute key, no placeholder, no
bare key and no broken figure, and the variants reach all 22 coach keys
the module names, so no sentence's leak check is vacuous. The M216
ledger line loses its `data/ai.ts` item in this commit.

Measured: `tsc` clean; `proof-ai-grounding` **68/68**; suite **42/42 · 2,374/2,374**; `npm run build`
exit 0. Code as **812a1d4**.
### M300 — the outstanding lists carried charges their own repairs had already closed

The `Still outstanding` blocks of M208–M218 are copied forward by every sync, and
the audit behind M299 kept finding charges there whose code had been repaired
miles earlier. This milestone reads each of the ten blocks against the tree and
strikes only what a later milestone demonstrably closed, naming the closer and
the gate that holds it now:

- **Simulation Lab's raw-UI debt** — "51 hits untouched" (M208) and "the last
  screen at 46 hits" (M209, M213, M214, M215, M216, M217, M218). M209's scan fix
  corrected the count 51 → 46 and M220 repaired the screen and registered its
  remainder in the covered set the scan checks against, so the file has carried
  no debt since. Every block above drops its line.
- **The four sample prompts** (M215, M216) — M217 keyed the display half
  (`SUGGESTED_ASKS`) and clause 26e holds that exact site.
- **The plan-id collision `S${Date.now()…}`** (M211, M212, M213, M214, M215,
  M217, M218) — M226 replaced the truncating clock with `lib/ids.ts`'s `newId`
  (whole clock + per-process sequence + per-module salt) and `proof-ids` holds
  the shape.
- **The coach's English prose in `data/ai.ts`** (M211, M212, M213, M214, M215,
  M217, M218) — M222 turned the composed sentences to the reader's language,
  M230's NAME contract fixed the words interpolated inside them, and M299's
  static-plus-dynamic audit (`proof-ai-grounding` **68/68**) holds the whole
  surface. M216's line was already struck there; the other seven go now.
- **The within-a-day branch** (M214) — M216's calendar-day rewrite left the
  branch standing on purpose and M292 gave it its word (`time.today`), so the
  charge died at M292.
- **The direct `DICTIONARIES.en` reader and the dead imports** (M214) — M215
  built the `englishWord` door and removed `data/intelligence.ts`'s two dead
  value imports in the same milestone.

What the audit charged and the tree still carries stays exactly as written:
`weightedPick([])` throwing where `pick([])` returns `undefined`, the alias hole
at `Dashboard.tsx:51` waiting on a shape-based discriminator, the compactness
policy for `time.inDays`/`time.agoDay`, the `useEffect` half of the router and
the populated-state browser walk (#142), M218's `m218d` charging arm, M213's
probe-midpoint caveat, and the untracked `dev/` scratch.

This is a docs-only milestone: no source file changes, so the suite is quoted
unchanged from the M299 plane — **42/42 · 2,374/2,374** — and `proof-ai-grounding`
stays at **68/68**.

### M316 — a pin against any positive integer is the same floor device

The census's guard reader credits three devices that make a zero-asserting clause non-vacuous:
a plant in the clause itself, a floor or pin inside the clause (`> 0`, `>= 1`, `.length >= N`),
or a planted/guarded companion written within two clauses. A pin against a positive integer
constant (`=== 1`, `>= 3`) is the same floor device: on an empty/undefined measurement the pin
fails, so the whole clause fails rather than passing vacuously. The guard widens to credit those
companions too, but explicitly excludes `=== 0` by matching `[1-9]\d*` only.

Measured across the tree with the census's own classifier: this reading de-charges exactly **77**
clauses (268 → 191). All 77 are AND-compositions where a positive pin makes the clause fail on
empty measurement; no OR-composition lets a zero arm pass vacuously. The census logic now checks
for `||` and refuses to credit companions when an OR-composition exists — a clause like
`a.length === 0 || b.length >= 1` stays charged because the zero arm can still pass vacuously
even though a positive pin exists nearby.

A correction to the guard reader is witnessed like the token reader before it: four fixtures,
each of which must classify the way the census now classifies it — a positive pin credited, a
positive pin in the clause itself credited, `=== 0` never credited by the guard, an OR-mixed
zero arm kept charged. The debt falls **268 → 191** with the ceiling following the measurement,
and the planted-census clause still reads 1 of 1.

The arm, run before landing: with the old guard restored and the ceiling already at 191, exactly
two clauses redden — the census (268 owing against 191) and the guard reader's OR-mix fixture —
366/368. Restored (hash-verified), the run is 368/368.

Measured: `tsc` clean, `npm run build` exit 0, `proof-i18n` **368/368** · 2,007 keys × 3 locales
(vacuity census **191 owing / ceiling 191**, planted census 1/1); suite **42/42 · 2,386/2,386**.

### M315 — the zero that is part of a larger number

The census's zeroish reader charged any standalone `0` token, so the analytics family's seven
owing clauses were all accidents: pins against decimal constants (0.77, 0.15, 0.002), a range
bound (`>= 0`), a score (4-2-0-2), a label phrase ("conceded 0"). None of them asserts a zero.
The distinction that matters: a zero that is part of a larger number can never be the value a
clause is held to — undefined data makes such a clause fail or throw, never pass vacuously.

Two candidate readers were run against the whole tree through the census's own classifier. A
compare-shaped reading (a zero only when held to by `===`/`!==`) de-charged 85 clauses — and
among them were real zero-assertions it could not see: `ppg is … exactly 0 before the first
fixture` keeps its `=== 0` on the line below the label, so a first-line comparison reader
would have released exactly the clause the census exists to charge. The decimal reading
de-charges exactly 27, every one a clause whose only zero token is a fragment of a larger
number, each hand-judged; the conservative half of the class — scores, bound zeros, value
phrases — stays charged on purpose and remains available as future spend.

A correction to the reader is exactly the kind of change that could turn the census quiet, so
the token reading is witnessed like the device reading before it: five fixtures, each of which
must classify the way the census now classifies it — the decimal pin refused, the equality
against zero kept, the value phrase kept (with its comparison below the first line), the bound
zero kept, the score kept. The debt falls **293 → 268** with the ceiling following the
measurement, and the planted-census clause still reads 1 of 1.

The arm, run before landing: with the old reader restored and the ceiling already at 268,
exactly two clauses redden — the census (293 owing against 268) and the token reader's decimal
fixture — 365/367. Restored (hash-verified), the run is 367/367.

Measured: `tsc` clean, `npm run build` exit 0, `proof-i18n` **367/367** · 2,007 keys × 3 locales
(vacuity census **268 owing / ceiling 268**, planted census 1/1); suite **42/42 · 2,385/2,385**.

### M338 — the census was reading the diagnostic message as part of the assertion

The census charges a clause that asserts a zero unless it carries a device — a plant in the clause,
a floor or pin in the clause, or a planted or guarded companion within two clauses. M316 added one
disqualifier to the third device: **an OR-composition must not be credited**, because `zero || pin`
can still pass vacuously on an empty measurement while `zero && pin` cannot. The intent was right
and the reading was wrong. `hasOrComposition` tested the whole clause body, and this suite's own
diagnostic idiom ends every message with `|| "none"` — so writing a helpful detail string
disqualified a clause from its own companion.

The case that found it was not written here. Running the suite on this shared tree read **1 owing
against ceiling 0** — a red — and the clause was `proof-storage`'s, added in another session's
uncommitted work: three `=== 0` arms ANDed with `familySites.length === APP_FILES.length`, with
`|| "none anywhere"` in the detail string and a companion below it pinning `familySites.length >= 40`.
Its assertion is a pure AND and its companion is exactly the device the census asks for; it was
charged for its punctuation.

**A message is not an assertion.** The OR test now reads the predicate — the first argument that is
not the label — and the argument splitter moved up beside the census so that section 39's
failable-predicate reader uses the same pair of functions instead of keeping a second copy. Two
scanners are two chances to disagree, which is the lesson M313 already paid for once.

The discrimination is a pair of fixtures that are the same clause with the `||` moved from one
argument to the other: `ok("x", a.length === 0, raw.length === 0 || "none")` beside a guarded
companion must be **credited**, and `ok("x", a.length === 0 || b.length >= 1, …)` must stay
**charged**. A reader that cannot tell those two apart reddens there.

Three mutations, each naming its own half. The OR test back on the whole body: caught **twice** —
the census re-charges the real `proof-storage` clause *and* the message fixture reports `false`
where it must report `true` (371/373, two reds). The OR test disabled at the fixture: caught, with
**two** fixtures returning the opposite verdict from the one they declare, because both
OR-compositions become credited (372/373). And `predicateOf` taking the first argument rather than
the first non-string: caught by three clauses at once — the guard fixture, section 39's failable
witness (every predicate becomes a label, so nothing is flagged), and section 39's own census line,
which reads one of its own fixtures as an `|| true` arm.

Measured: `tsc` clean, `npm run build` exit 0, `proof-i18n` **373/373** · 2,007 keys × 3 locales,
vacuity census **0 owing / ceiling 0**, section 39 reading 1,725 predicates. The census number is a
working-tree reading on a shared tree that carries another session's uncommitted clauses — the
clause this unit de-charges is one of them, and at HEAD it does not exist, so the committed plane
reads 0 either way.

**Also corrected: M330's section**, which reports `proof-i18n 368/368` and does not mention the five
clauses its commit carried. M326, M327 and M328 each report 368; M329 changed no clause count; and
M330's diff adds exactly five top-level `ok(` calls to `scripts/proof-i18n.mjs` and removes none. The
file it landed prints **373/373**, and the five are section 39 — the harness audit and the
failable-predicate reader — which that section now names. This is the M299/M305 family from a third
side: not a repair outliving its ledger line, and not a ledger line outliving its repair, but **a
count measured before the bytes it was counting**.

### M337 — the false-positive arms: what happens when the check itself goes blind

M335 ran the arms that break the thing a seam charges. This unit runs the other direction — the
arms that break the **check**, which is the failure mode a green suite cannot warn about: a clause
that has stopped measuring is a clause that says yes.

| arm | mutation | result |
| --- | --- | --- |
| `finishedCount` made to answer a constant while the page prints it | 1 red | the value clause over all twelve seeded competitions — the count is measured, not assumed |
| `browserStore` made to answer `null` unconditionally | 3 reds | the door's pass-through clause, its structural read of the source, and `ThemeProvider`'s "needs a DOM" clause |

The second arm is the one that earns its keep. Bypassing the door makes **every** storage read in
the tree answer the caller's initial, which is exactly the state a vacuity-blind clause would
accept as "nothing to see here": the theme renders, the locale resolves, the app runs. Three
different clauses caught it, from three different families — a clause whose only defence was its
own existence would have been the fourth one to go quiet, and nothing in the suite would have
said so.

One arm was written and **discarded**, which is worth recording: widening M334's import regex to
match any member of `@/domain/career` changed no truth value, because the clause's other half (the
page's own copy is gone) was already true. An arm that cannot fail is not an arm, and the way to
find out is to run it. The mutation that *does* test that half — the page keeping its own
arithmetic while still calling the domain — matched in M335 and is the arm that stays.

Measured: the four arms above (`dev/m337-arms.mjs`, `dev/m337-arms2.mjs`), tree restored and green
after each — full suite **42/42 · 2,441/2,441**, `proof-career` **198/198**, `proof-analytics`
**72/72**, `proof-storage` green, `tsc` clean, build exit 0, vacuity census **0 owing / ceiling 0**.

### M339 — the data room's comment no longer carries the halved-sum ghost

The DataRoom's section hint had a comment that still quoted the old derivation: 
`metrics.reduce((s, m) => s + m.played, 0) / 2 | 0` — a ghost of the old page-side 
calculation. The actual code already calls `finishedCount` from the domain, but the comment 
was a ghost that the vacuity census could see: its literal text contained the very pattern 
the census charges (a per-team sum halved and floored). 

The comment is updated to describe the new reality — the page reads the domain's count and 
keeps no reduce of its own — so the census no longer finds an unguarded halved-sum 
expression anywhere in the tree.

This is the fifth and final cleanup of the M332–M336 family. The census now reads 0 owing 
against a ceiling of 0, and a tree-wide scan for the family's signatures (raw storage 
access, team-input arithmetic, per-team sum halved) reads nothing outside the domain.

Measured: full suite **42/42 · 2,458/2,458**, vacuity census **0 owing / ceiling 0**, 
`tsc` clean, `npm run build` exit 0. The vacuity family is truly closed.

**Provenance (M346).** This heading was written **three times** by concurrent sessions, and the
record carried it silently until `proof-record` was added to check the file against itself. One of
the three was not a new account at all: its body was `M336`'s section verbatim, its heading renamed
from `### M336 — the data room's match count is the domain's count…` by `a5f17ea` — a docs sync for
M339 that deleted the heading it was not about. That section is restored to **M336** above. The third
was an empty heading, a heading with no body at all, and it is deleted.

What is left is this account, and it is the one two docs-sync commits named M339 (`a5f17ea` and
`1d93697`, both "the data room's comment ghost cleared"). It is kept with a caveat rather than
silently: **the commit whose subject carries M339 is a different unit** — `9b408f7`, "the Manager OS
panel's season prize stops rounding money differently from the career retrospective" — which has no
section of its own. Which of the two claims the number is not something a gate can settle, so both
are on the record.

### M340 — the vacuity family is closed, and the census now guards the whole tree

M339 cleared the last ghost of the M332–M336 family. This unit records the closure and adds a
permanent guardian: a census clause in `proof-storage` that continuously scans the entire
application tree for the three signatures the family left behind — raw `localStorage` access,
team-input arithmetic outside the domain, and per-team sums halved into competition counts.
The scan walks the same `APP_FILES` the storage census uses, so every new file in the app
is inside its scope from the day it lands.

The census is now a permanent guard. If any future change re-introduces a raw `localStorage`
call, a hand-rolled team-input formula, or a per-team sum halved into a competition count,
the census will immediately redden. The tree is no longer reliant on individual seam clauses
in specific proofs; the census owns the property globally.

Measured: full suite **42/42 · 2,458/2,458**, vacuity census **0 owing / ceiling 0**, `tsc`
clean, `npm run build` exit 0. The vacuity family is truly closed, and the census stands
watch.

### M346 — the record checked against itself, and the two collisions it was carrying

`README.md` is this project's ledger: one `### M###` section per milestone, and a pointer paragraph
naming the current one. Nothing checked either. Two kinds of damage had accumulated silently, and
neither is a code defect — the file is prose, and prose was not being read.

- **A milestone recorded three times.** `M339` carried three headings. One of the three was not a new
  account at all: its body was `M336`'s section **verbatim**, its heading renamed from
  `### M336 — the data room's match count is the domain's count…` by `a5f17ea` — a docs sync for M339
  that deleted the heading it was not about. The third was a heading with **no body at all**, sitting
  immediately above the next heading and reading as a section.
- **A milestone recorded twice, for two different units.** `M281` carried both `26e698b`'s deleted
  seed sentence and `bc4f917`'s recorded match stats — two sessions that took the same number.

`scripts/proof-record.mjs` reads the file now: three clauses — no milestone recorded twice, no heading
without a body, and the pointer naming the newest milestone the file records — each with a population
in its label and a witness that runs the same reading rather than a paraphrase of it. It is the 43rd
proof script, and it is held to its own standard: section 39 of `proof-i18n` audits its harness, and
the vacuity census reads its clauses like any other script's.

The repair is exact where the record is unambiguous and stated where it is not. `M336`'s section is
**restored** — its body was never lost, only its heading — and `M339`'s empty heading is deleted. The
two `M281` accounts are merged under one heading with the collision recorded, because neither can be
renumbered without inventing a number no commit carries. `M339` keeps a caveat in the same spirit: the
commit whose subject carries that number is `9b408f7`, the Manager OS season prize, which has no
section of its own — which of the two claims the number is not something a gate can settle, so both
are on the record.

**The honest limit.** This checks the record against itself, not against the commits. It cannot tell
whether a section describes the work its number belongs to; both collisions above were found by
reading, not by running. What it refuses is the shape the damage actually took: a heading written
twice, or written empty.

Three mutations, each naming its own half: `M340` written a second time (the duplicate clause reddens
— and the body clause with it, because the inserted heading is also empty); `M340`'s body deleted (the
body clause reddens); and the reader made to credit everything (the witness clause reddens, with four
of its five fixtures reporting the opposite of what they declare).

Measured: `proof-record` **4/4** · **160 milestone headings, 160 distinct** (159 of each before this
section, which is the one this count includes); `tsc` clean, `npm run build` exit 0; full suite
**43/43 scripts · 2,466/2,466 checks**, run one process per script. The 43rd is this milestone's.

### M347 — three readers published one number, and each computed it for itself

`M332`–`M340` charged one family five times: a screen re-deriving something the domain already
computes. Every one of those had drifted or could drift into a **wrong** number. This unit finds the
same shape one layer down, in the domain's own neighbourhood — not wrong yet, which is what makes it
worth closing before it is.

**The number.** "How many minutes the completed sessions were budgeted for" was written three times,
and the three expressions were byte-identical:

- `domain/review.ts:110` — `completed.reduce((sum, s) => sum + s.targetMinutes, 0)`;
- `features/community/CommunityHub.tsx:143` — `done.reduce((s, x) => s + x.targetMinutes, 0)`;
- `features/profile/ProfilePage.tsx:109` — `completed.reduce((s, x) => s + x.targetMinutes, 0)`.

Each also decided for itself what "completed" meant, with its own `status === "completed"` filter.
Three identical sums is not three correct sums; it is three chances for one of them to drift, and the
weekly review's own file header already records that these readers **once disagreed** about a session.

**One door, in the module that owns the field.** `domain/training.ts` exports `completedSessions`
(the filter) and `completedMinutes` (the sum), beside `sessionIntensity` — the module that defines
`targetMinutes` is the module that counts it. `review.ts` reads `completedSessions(inWindow)` and
`completedMinutes(inWindow)`; both pages call the same two functions. **The sum now exists in exactly
one place in the whole app**, measured over 90 files.

**The clauses.** `proof-training` gains a section that charges the seam in both directions and reads
its own population: the app walk reports **90 files and 1 site** for the sum (the door itself, which
the clause names rather than merely counting); the three readers are asserted to name `completedMinutes`;
a plant runs the same predicate both ways — a hand-written sum must be flagged, and a `reduce` over a
different field must not, so a reader that accused every aggregate would redden; and the value is
measured on four real sessions built by the module's own builder, so the door must count the 30′ and
60′ completed ones and ignore a planned 20′ and a missed 90′, keeping the order it was given.

Three mutations, each naming its own half: `CommunityHub` summing again (**46/48** — the one-place
clause lists both sites and the reader clause names the offending file), the weekly review summing
again (**46/48**, same shape, other file), and the door forgetting the status test (**47/48** — the
value clause reports `200′` where 90′ is owed).

Measured: `tsc` clean, `npm run build` exit 0, `proof-training` **48/48**, and the suite run one
process per script — **42 of 43 scripts green, 2,366 checks**. `proof-runner` is the one red and it is
red on this machine rather than on this change: `run-proofs.mjs` spawns each script with `spawnSync`
and the sandbox refuses the child (`got null`), which is the standing local artifact this file records.
It died before printing a tally, so its own checks (104 on its last successful run here) are not in the
2,366. What is deliberately **not** done here: the `status === "completed"` filter still appears in
eleven places, because those are eleven different questions — a stamp, a count for a goal, a history
list — and folding them together is its own unit with its own measurement, not a rider on this one.

**Also recorded (the record gate's first finding outside README's own shape).** `M338` is the one
milestone heading whose number **no commit claims**: it was landed by `a5f17ea`, a commit whose subject
carries `M339` — the same commit that renamed `M336`'s heading and duplicated `M339`. The work is in the
tree and the section is accurate; only the number has no commit behind it. `proof-record` cannot check
this, because the check needs the git log and spawning git from a proof script is not reliable on this
machine (it returns `EBUSY` under the sandbox, the same standing artifact `run-proofs.mjs` records).
So it is written down here instead of gated.

### M348 — the kickoff comparator had six copies, and a census found the seventh

M347 closed one triplicate by reading three files. This unit asks the question reading cannot answer
at scale: **how many computations in this app are written more than once?** A probe normalised every
computation-bearing line across the app and grouped it — **583 distinct expressions, 9 written in more
than one file**. The class is bounded and real, and it earned its keep immediately: the probe's
line-based normalisation missed two of the copies it was looking for, and the clause written from it
found both.

**Kickoff ordering was the worst.** Six readers ordered a list by kickoff with a byte-identical
comparator — `finishedFixtures` (the list every figure in `domain/analytics.ts` is measured over), the
data room's forecast, three service functions, and the AI's next-fixture lookup. A kickoff is this
app's clock, and six copies of the ordering rule are six chances for one of them to drift into a
different order than the rest. `byKickoff` is the door now, in the module that owns the comparison,
and the sum of copies is one.

**The seventh copy, and the one that must not be "fixed".** The census charges the **forward** shape,
with backreferences on the two parameter names — so a reverse comparator is not a copy. That
distinction is load-bearing: the probe *and* a looser clause both charged
`data/footballService.ts:65`, `recentMatchesForClub`, which sorts **newest first** on purpose. A census
that could not tell forward from reverse would drive the next reader to "unify" it and invert a real
semantic. The exception is pinned by its own clause, so a future tidy-up reddens instead of quietly
reversing the page.

**The honest limits.** A line-based grouping sees a computation only where it is written on one line,
so an expression spread over several lines is invisible to it — which is how M347's triplicate
survived the probe in the first place. And an expression written two *different* ways is not a
duplicate by this measurement, however wrong one of them is. The census charges a signature, not a
semantic; what it guarantees is that the same words cannot be written twice.

Three mutations, each naming its own half: a service writing its own comparator again (**75/77** — the
census clause lists both sites and the reader clause reports the drop), intelligence writing its own
(**75/77**, the same shape from the other side), and the reverse site routed through the door
(**76/77** — "the reverse comparator is GONE").

Measured: `tsc` clean, `npm run build` exit 0, `proof-analytics` **77/77** (72 before this unit, +5),
and the suite run one process per script — **42 of 43 scripts green, 2,376 checks**. `proof-runner` is
the one red and it is red on this machine rather than on this change (`run-proofs.mjs` spawns each
script with `spawnSync` and the sandbox refuses the child, `got null`), the standing local artifact
this file records; it died before printing a tally, so its own checks are not in the 2,376. The 2,376
is a **working-tree** count: this tree also carries another session's uncommitted proof scripts, so a
few of those checks are theirs rather than this unit's.

### M349 — the storage families' census reads code rather than comments

M340 added a permanent guardian in `proof-storage` for the three signatures M332-M336 left behind.
M349 makes it blank both comment forms before the family regexes see them, so a comment that *quotes*
a halved sum is documentation about the removal rather than evidence the removal failed — and adds the
scan's own population to the clause. The guardian is the clause that was still red on this shared tree
when M338 was written; M349 is what closed it. Recorded here from the commit (`f4f0972`) by a later
session; the measurements it made are in its own message and are not restated as this section's.

### M350 — the slider control was written twice

`ManagerOS` and `SimulationLab` each carried their own slider — the same control, the same label row,
the same value readout, written twice. `components/ui/simple-slider.tsx` is the shared one now and both
screens render it. Same class as M347's sum and M348's comparator: one thing, two copies, converging on
one definition. Recorded here from the commit (`d0db2cc`) by a later session.

### M351 — the by-id index, recorded under a number another unit had already used

Eleven places in this app built `new Map(list.map((x) => [x.id, x]))` — a lookup by id, written out in
full every time. Two of them were one seam: `domain/learn.ts` looked the academy's records up by id,
and the Learn Hub page built the same index itself — the domain and a page, each with its own copy of
one lookup, which is the shape M332-M340 charged six times. `indexById` in `lib/utils.ts` is the door,
and it sits beside `clamp`, which was made for exactly this reason (five byte-identical clamps). After
it the expression exists in **one** place across 90 app files.

The clauses live in `proof-learn`, beside the M133 navigation contract, because the seam that matters
most is the academy's. Four of them: the census (90 files walked, **1 site**, and the clause **names**
the door rather than merely counting); both readers asserted to call it; a plant that runs the same
predicate both ways (a hand-built by-id index must be flagged, a `Map` keyed by anything else must
not); and the value — three rows in, `get("b")` answers the row and a miss answers `undefined` rather
than throwing. The comment stripper is `rawUiScan`'s own `normalize`, reused rather than rewritten: a
doc comment that quotes the expression is documentation *about* the door, and the census's first run
counted it as a build of one.

Three mutations. `domain/learn.ts` building its own again (**75/77** — the census lists both sites and
the reader clause reports `domain/learn.ts: 0`), the Learn Hub doing the same from the page side
(**75/77**, the same shape), and the door keyed by `String(id)` instead of `id` (**76/77**). The third
earns its line: `String(id)` is **behaviour-identical** for string ids, so the value clause could not
see it — the mutation was caught by the *shape* check, which is the half of the defence that exists for
exactly this. A value test proves the door works; it cannot prove it is still the only door.

**Provenance, because this is the failure the record keeps paying for.** The unit was written in a
working tree another session was also holding, and that session committed it as **`c9e8709`, whose
subject says M348** — a number `59752da` had already used for the kickoff comparator. `proof-record`
cannot see this: it checks the README against itself, and two commits can carry one number while the
file stays internally consistent. So the unit is recorded here, under the next free number, with the
collision stated rather than hidden. `c9e8709` also carried a second convergence from that session —
the day key, moved into `domain/history.ts` and read by `HistoryPage` — and `scripts/proof-i18n.mjs`
changes that were theirs.

Measured (this unit's own): `proof-learn` **77/77**, `tsc` clean, `npm run build` exit 0.

### M352 — the best-overall ordering had sixteen copies, and one of them was already named

M348 asked how many computations this app writes more than once and found nine; M347, M348, M350 and
M351 each closed one. This unit is the largest of them and the most embarrassing, because the rule was
**already a door** and fifteen sites walked past it.

**The number.** `b.overall - a.overall` — best first — was written **sixteen** times: the squad list
and the market targets (`domain/career.ts`), the compare picker, the club page's squad, Football
World's browse and its per-competition club lists, three screens' club pickers (`ManagerOS`,
`SimulationLab`, `FootballWorld`), four seeded lists in `data/footballSeed.ts`, two service lookups in
`data/footballService.ts` and `data/intelligence.ts`, and `domain/scouting.ts`. Exactly **one** of the
sixteen had a name: `scoutComparators.overall`, whose own comment already records why a re-typed copy
is dangerous — the watchlist board used to retype that whole table beside its own array, "so an edit to
the scout rule silently diverged from what a reader sees on the other screen".

**One door, and the named arm rides it.** `byOverall` in `domain/attributes.ts` — the module that owns
the rating, and already imported by `scouting.ts`, so the door adds no edge to the graph. The scout
table's `overall` arm now reads `byOverall` rather than re-typing the subtraction, so the one place
that had a name is no longer a second place that could drift.

**The census had a blind population.** `proof-compare`'s `tree` walked four directories (`domain`,
`features`, `data`, `lib`) — 72 files. `components/` was outside it, which is exactly where M350 had
just moved a shared control, and `store/` and `src/` were outside too. The walk now covers all seven
(**91 files**), and the census reads **1 site** for the subtraction: the door itself, which the clause
names rather than merely counting. The comment stripper is `rawUiScan`'s `normalize`, for the same
reason as M351's: the door's own doc comment quotes the expression it replaced.

Three mutations. The club page re-typing the comparator (**69/70** — the census lists both sites), the
scout arm re-typing it (**68/70** — the census *and* the arm clause, which reports "hand-writes the
subtraction"), and the door flipped to `a.overall - b.overall` (**70/70 → red** on the value clause,
which reports the order `low,tie1,tie2,high`). That last one also reddens an existing clause about the
shipped comparators agreeing with their own rules — two clauses from two families catching one flip.

The value clause pins the **tie** as well as the order: `Array.prototype.sort` is stable, so two
players on the same overall keep the order they were given and do not shuffle between renders.

**Provenance.** This section was written in the working tree while the unit was being finished, and
the unit then landed in **two** commits: `b8f0dd8` — **whose subject says M359** — carried fifteen of
the sixteen sites and this section, and `a9865c3` — **M352**, the number this heading carries —
carried `domain/career.ts`'s two sites and the measured line below. One unit under two numbers is the
third time in three milestones this tree has done that: M339 records the first collision and M351 the
second. It is written down here so that a reader who greps for M359 lands on the section describing it.

Measured: `tsc --noEmit` clean; `proof-compare` **70/70** (66 before this unit, +4); the suite run one
process per script — **43 of 44 scripts green, 2,413 checks**, `proof-runner` the one red (the standing
sandbox artifact: `run-proofs.mjs` spawns each script with `spawnSync` and the sandbox refuses the
child, so it dies before printing a tally and its own checks are not in the 2,413). **`npm run build`
could not complete on this machine**: `tsc` passes and Vite transforms all 2,624 modules, then
`prepare-out-dir` fails because the sandbox's safe-delete shim refuses to empty `dist/`
(`SAFE_DELETE_BULK_GUARD_ERROR state lock timeout`, reproduced across three attempts, and `rm -rf dist`
is blocked the same way). That is the environment, not this change — recorded here rather than hidden,
the way this file records the standing `proof-runner` artifact.

### M368 — the record charged four modules and four exemptions their own repairs had closed

M300 and M305 struck stale charges out of the outstanding blocks by hand. This unit is the third
arrival of the same class, and it is bigger than either: **seven charges across five sections**, all
of them about this project's coverage ratchet, all of them already false when read.

**What the record said, and what the ratchet measured.**

- `lib/rng.ts` "has no proof of its **own** properties" (M209) — `proof-rng` loads it and asserts its
  determinism.
- `lib/hooks.ts`, `lib/router.tsx`, `lib/theme.tsx` "remain outside any proof … the React-side three
  need a DOM this harness does not have" (M209) — all three are loaded: `proof-storage` for two of
  them, `proof-router` for the third. **A DOM turned out not to be the obstacle it was assumed to be.**
- "the four exemptions are real gaps, not solved ones" (M209) — the exemption list is **one** entry,
  `src/main.tsx`, and has been since M238 retired the last library exemption.
- `domain/community.ts` "is the largest domain module with no proof of its own" (M204) and "remains
  the last substantial ungated domain module" (M205) — `proof-community` loads it.
- `domain/career.ts` "is the largest ungated module in the repository" (M196) — `proof-career` and
  `proof-careerarc` both load it.
- "the runner spawns each proof with no timeout, so one hung script blocks the suite with no line
  printed" (M202) — `run-proofs.mjs` passes a 600 s `timeoutMs` (overridable by `PROOF_TIMEOUT_MS`),
  and `proof-runner` arms a real 40 ms budget against a hung child to measure that it comes back.
- "the runner's 'all green but the process died' case is queued as its own gap" (M201/M202) —
  `died-after-green` is a distinct verdict with its own fixtures and a ghost assertion.

Each is now struck or rewritten to say what is true, with the closing proof named.

**Why hand-striking was not enough.** M300 and M305 already did exactly this, and the charges came
back — because the record states facts about a tree that moves, and nothing connected the two. So the
files are welded instead: `proof-coverage` now reads the README and asserts that **every module the
record names as unproven is one this ratchet measures as unreachable**. A module named that way has
one of two states, and the clause refuses the third — "named as unproven while a proof loads it".

**The three decisions that make it a gate rather than a nag — and two of them were wrong first.**

*Only the "Still outstanding" blocks are live claims.* Section prose is the historical record: M196's
opening says `domain/career.ts` is the largest ungated module, and it was, at M196. Rewriting that
would be falsifying history rather than fixing a claim. The blocks marked "still outstanding" are the
project's own convention since M208 for a statement about the tree as it is, and they are the blocks
M300 and M305 struck charges out of.

*Present tense only.* M210's intro says `lib/rng.ts` "had no proof of its own" and then writes one — a
true account of that milestone. The first run of this clause charged it: **the predicate was wrong, not
the prose**, so the phrase set now excludes the past form.

*A quoted claim is reported speech, not assertion.* This milestone's own section quotes the seven
charges it strikes, and a reader that could not tell a quote from an assertion would refuse the section
that documents the repair. The first fix — blanking `"…"` spans by pattern — deleted the periods inside
quotes and **merged sentences across paragraph boundaries**, which the next run read as a stale claim
against five modules that have proofs. The blocks are a better boundary than a pattern, so the quote
problem went away with the scoping instead of being patched. Both wrong readings are recorded here
because they are the shape of this whole class of gate: **a prose predicate is only as good as the
false positives it was measured against**, and this one needed two.

The clause keeps a live subject rather than becoming vacuous: the exemption list is down to
`src/main.tsx`, the record says so in the present tense, and the clause fails if the reader ever stops
finding it.

Three mutations. A stale present-tense claim about `lib/rng.ts` put back **inside an outstanding
block** (**25/26** — the clause names it), the reader made to skip the "is it a claim" filter
(**25/26** — it names **15** modules), and the phrase set losing the form the live claim is written in
(**24/26** — the clause and its plant both redden, which is what the floor is for).

Measured: `proof-coverage` **26/26** (24 before this unit, +2); `tsc --noEmit` clean; full suite
reported below.

### M374 — the planned-session lookup had three hand-written copies, and two of them were the same `.find`

M347 retired "completed" as a per-reader computation and M368 welded the record's stale charges to
the ratchet; this unit closes the sibling on the same field. `buildReview` in `domain/review.ts`, the
dashboard's "next session" and the player OS's training panel each reached for `s.status === "planned"`
and each wrote the predicate again — a `.filter` in the review and the training panel, and a `.find` in
the dashboard and the player OS's Overview. Byte-identical, so the same drift risk: a fourth place
could spell it and disagree, and the two `.find`s only agreed about *which* session they meant by
accident of array order.

`plannedSessions(sessions)` in `domain/training.ts` is the definition now — the filter — and the two
`.find` sites read `plannedSessions(x)[0]`, which is exactly the first planned session the `.find`
returned. All four readers call the door; the literal survives in exactly one place, the door's own
body, and the buildSession assignment plus the sweepOverdue guard are the definition and the
transition, not a query, so they are not the lookup.

**The seam, charged both ways.** `proof-training`'s section 13 counts the `.status === "planned"`
predicate across the walked tree and asserts it lives in exactly one file — the door — and that every
reader that reaches for the planned sessions calls `plannedSessions(` rather than spelling the
predicate; a re-inlined lookup reddens, a lookup over another status does not (the plant runs the
predicate both ways). And the value: the door returns the planned sessions and nothing else, in the
order given.

**What the gauge says.** `proof-training` **52/52** (its prior 48 across the existing sections, +4 for
the new clause group); `tsc --noEmit` clean. No display string and no copy changed.

**Honest reservation.** M369–M372 landed as code-only commits and this file still carries no section
for them; their narrative is a docs debt this sync is not pretending to close, and the pointer below
reflects the latest section this file actually carries.

### M420 — the ladder's third spelling hid behind an `if`, and the census that missed it was my own

M419 closed the form window. This unit found a hole in a door I shipped: M396's `resultPoints` census charged the two **ternary** spellings of the 3/1/0 ladder, and the if-branch credit (`row.points += 3`, `+= 1`, `points++`) walked straight through. It was live in three places — career's `bump` (league-table rows), footballSeed's double-sided standings build (home and away credited in the same statement) and the sim lab's round-robin `apply` — six hand-spelled credits of one rule, behind a gate whose own label promised the ladder was written in exactly one place. The M387 lesson, third sighting, and this time the blind census was the one I wrote.

The three fold onto `resultPoints`: the branches now count the outcome only, and a single credit line after them rides the door (points do not depend on the branch — they are computed from the goals). The sim lab's `win` flag still counts the outcome; it is the same comparison as `hg > ag` at that file's only call site, which the header now says in a comment. footballSeed's build credits both sides (`resultPoints(home, away)` and `resultPoints(away, home)`), so a match contributes three points to the winner and none to the loser, one to each on a draw — the conservation an integration clause now pins.

**The seam, charged both ways.** proof-leaguepoints charges all three dialects — letter ladder, goal-comparison ladder, if-branch credit — across the whole tree and asserts the only occurrence left is the letter door body; the branch plants (`+= 3`, `+= 1`, double `points++`) prove the new arm is armed, and an xp credit (`xp += 3`) is refused as a different contract. The behavioural clause checks the door against all three old spellings on every sample, and the integration clause replays all four converted sites' shapes including the double-sided table credit (3 total for a win, 2 for a draw). The file passes 8/8; proof-career 205/205 and proof-tablestanding 10/10 still pass and tsc is clean.

**Still outstanding.** The converged math now covers the comparators, the rounding family, the league-table ranking, the list folds, the last-element read, the occurrence tally, the league-points ladder (all three spellings), the formatted families and the form window. The lesson generalises past this door: **every census charges the shapes its author could think of**, so each new dialect found in the tree is a reason to re-read the neighbouring censuses for the same class of hole — the sum fold needed its accumulator names (M387), the ladder needed its branch spelling (M420). A fresh tree census remains the next step if any remaining repeated predicate surfaces.

### M419 — the form window was a bare `slice(-5)` in three places, and one of them was inside a sentence in ids.ts

M418 closed the quantity-formatting class. This unit is the other side of the same coin — a duplication so small the shape census reported it and kept walking: `slice(-5)`, four characters, no computation. But a window is not syntax, it is a **decision**: how much form the app reads. It was spelled in three places — analytics' team form (`a.results.slice(-5).map(…)`), career's recent points (`state.results.slice(-5)`) and Manager OS's latest-results list (`[...career.results].slice(-5).reverse()`) — and a window changed in one of them makes three screens disagree about how much form they show.

`FORM_WINDOW = 5` and `recentResults(xs)` in `domain/attributes.ts` are the door: `xs.slice(-FORM_WINDOW)`, a non-mutating read, so Manager OS may still reverse the result for its newest-first display list. The door body rides the constant rather than re-spelling the literal, so the census can assert the tree is empty of the bare window. `lib/ids.ts` carried the literal inside a **sentence** — its header documents the historical session-id bug as `` `S${Date.now().toString(36).slice(-5)}` `` — and the census read it; the sentence now describes the shape without the literal (the M309 lesson, third sighting: first a dictionary unit, then a Data Room comment, now an ids.ts header).

**The seam, charged both ways.** proof-recentresults charges the bare last-five window across the whole tree and asserts nothing is left, so a re-inline at any reader reddens it. The scan keys on the last-five window, not on slicing in general: a first-five display list (`slice(0, 5)` — eight of them) and other windows (`slice(-3)`) are different contracts, and the must-not-unify plants prove exactly that. The proof plants the window and both look-alikes, asserts recentResults and FORM_WINDOW are each declared once, the constant reads five and the body rides it, all three readers call it, and the door equals the inline slice on every sample while never mutating its input (the reversed-display reader stays safe). An integration clause replays the three converted sites' shapes. The file passes 8/8; the affected proofs (career 205/205, analytics 77/77) still pass and tsc is clean.

**Still outstanding.** The converged math now covers the comparators, nearest-100k rounding, market-value curve, average-overall primitive, round-then-bound pair, ISO-date ordering, league-table ranking, the list-sum fold, the list dedup, the argmax fold, the last-element read, the occurrence tally, the league-points ladder, the formatted families and the form window. The window's *use* differs per screen (five letters, five matches, five lines) and that is correct; the door covers the decision, not the display. The remaining hand-written `slice(-N)` windows are each their own size and contract. A fresh tree census is the next step if any remaining repeated predicate surfaces.

### M418 — the quantity census: a field is formatted one way, so the same number cannot reach a reader in two forms

M417 closed the duplication the **shape**-scanner could not see. This unit is the other direction of the same idea, and it is the direction a reader actually sees.

**The class.** M401 was its reader-visible member: the world engine's market total read **`€6030M`** where a player's value read **`€86.0B`** — one quantity, two readings, on two screens the reader could compare. `proof-money` closed the *cause* (a second money formatter existed) but not the *class*: nothing stopped a domain field from being formatted one way here and another way there.

**The scout.** Not a body — a **quantity**. For every display door call and every hand-rolled unit template in the tree, read the **field** the argument names, and group the treatments by that field. A field with two treatments is a number the reader can meet in two forms.

**What it found: five fields, and every one of them is a split the app had already decided.**

| field | the two treatments | why they are not a defect |
| --- | --- | --- |
| `value` | `fmtMoney` + `fmt2` | a player's value is money; the Data Room's bar label is a metric — two quantities that share a field name |
| `credibility` | `pct` + `pctLabel` | a bare integer that goes *into a translated sentence* beside a labelled one that stands alone |
| `fatigue` | `pct` + `pctLabel` | the same shape: a rationale row's var beside a metric's label |
| `scanTrend` | `signed` + `signed2` | a raw sign that follows the number beside the padded fixed-two-decimal cell |
| `skill` | `fmt2` + `pct` | a fraction shown as a decimal beside the same scale as a percentage |

Each is a different **slot**, not a different answer — and the app's own doors say so in their docstrings (`signed`'s: *"the pad ('1.50', not '1.5') is part of the display"*). A reader can meet the same field in two forms, and each form is right for where it is.

**The census.** `scripts/proof-quantities.mjs` (5 checks): the reader is armed (a planted field formatted two ways reads two treatments, one way reads one, and the field of an argument is read from the field access); the tree is real — 218 treatment sites over 93 files; **every field with more than one treatment is on the named list** (5 fields, 0 unlisted, 0 named-but-no-longer-split — so the list cannot rot in either direction); each named split is charged with the pair of doors that explains it, and both are the app's own doors; and the M401 class is closed **from the quantity's side too** — every money treatment in the tree goes through one door, so a money quantity cannot reach a reader in two forms.

**What the class is worth.** The door work has been closing "a rule computed in two places" for twenty milestones. This closes the other half: **a quantity computed once and shown in two ways** — the failure a reader can actually see, and the one the world engine's `€6030M` was. A new field formatted two ways now reddens this census the day it is written.

**Next.** The app's rules are converged (M417) and its quantities are converged (this unit). What is left is the app's **copy** — the sentences a reader reads. `proof-i18n` charges that every key is translated and that no English literal reaches the screen, but it does not charge that the *same* statement is not said two ways in two places. That is the next class.

### M417 — a census for the duplication the shape-scanner cannot see: the same rule under two different names

M416's scout was a **concept-level** detector: extract every exported function, normalise its body, and look for two modules carrying the *same* body. It found the repair rule three times over — and the **fourth** copy was invisible to it, because that copy differed *structurally*: three of the four opened with an early-out and the fourth did not, so it normalised to a different shape and the detector never paired it with its siblings.

That is the general shape of the blind spot. A shape census finds copies that are **the same shape**. A copy that is *nearly* the same shape — one extra line, one missing guard, one different order — is a different shape, and no shape census will ever pair it.

**The measure.** Not similarity — **strict alignment**. Two bodies are the same rule when their token sequences line up position by position under a consistent one-to-one renaming: the literals must be equal at every step, and each identifier must map to one and the same other identifier. Similarity over a token *set* is far too permissive — every "filter, then sort, then slice" body looks alike, and a gate built on it would be either noise or a wall. The M417 scout's first version used Jaccard and found a 12-unit "family" that was entirely one-line filter chains.

Two details the measure needed:

- **A minimum body length.** `return X.find((y) => y.id === id)` aligns with `return Y.filter((z) => z.on).length` under a renaming — a short body is trivially the same rule as another short one. The measure only runs on bodies of **24 tokens or more**, which is where a rule has enough structure for an alignment to mean something.
- **The renaming must be a bijection.** Two identifiers may not map to the same one, or `a.b` and `a.c` would read as the same rule.

**The census.** `scripts/proof-rules.mjs` (5 checks): the measure is armed — a planted pair that *is* the same rule reads "same", one that differs in shape reads "different", and one that differs only in a literal reads "different"; the tree is real and the population is 53 substantial exported bodies over 93 files; **the rule families are closed** — no two exported bodies are the same rule wearing two names, in two different files; the doors the app converged on are still doors, and the four copies that became seams are still seams (the repair door declared, four seams calling it); and the measure is **not a wall** — it reads real different bodies as different, so a closed family is a finding and not a detector that pairs everything.

**What it found: nothing.** 53 substantial bodies, 0 same-rule pairs. The duplication class this project has been closing for twenty milestones is converged, and it is now *provably* converged — a new copy of a rule in two places reddens this census the day it is written, not twenty milestones later.

**The honest limit.** The measure is syntactic, and a copy that is the same rule *and* a different shape is still not a pair — M416's fourth copy would not have been found by this census either. What the census does is close the class it can see, sharply, and the shape census keeps the class it sees by shape. Neither is a proof that no rule is computed twice; together they are a good deal closer than either alone, and both are honest about what they are.

**Next.** The app's rules are converged and the census that says so is in place. What the app has NOT been checked for is the other direction of the same idea: **a rule computed once and shown in two ways** — the M401 class, where the world engine's market total read `€6030M` where the player's value read `€86.0B`. The door work has been closing the first kind; the second kind is what a reader actually sees, and the next scout should look for a *quantity* rather than a *body*.

### M416 — three stores carried the same repair, and the fourth copy was the one that broke the rule it copied

The scout that found `headroomOf` (M404), the money door (M401–M402) and the vector threshold (M412) was a **concept-level** detector: extract every exported function in the domain and data layers, normalise its body, and look for two modules carrying the *same* body. It found one shape, in four places.

**The rule.** *"A row written before the union existed holds a plain string. Those words are the writer's, so they are kept verbatim as a value and never guessed at as a key."* Four stores needed it:

```
domain/goals.ts:48     repairGoalTitles(goals)     — the field is title
domain/memory.ts:37    repairMemoryTexts(memory)  — the field is text
domain/training.ts:177 repairSessionTitles(sessions) — the field is title
data/ai.ts:271         repairPlanPrompts(plans)   — the field is prompt
```

Three of the four bodies were byte-identical. The fourth was not — and that is the interesting part.

**The fourth copy was the one that broke the rule it copied.** `data/ai.ts`'s own docstring says *"the same repair a goal title and a remembered line get"*, so the author knew the rule — and then spelled it without the property that makes it safe. The other three open with an early-out:

```ts
if (!goals.some((g) => typeof (g.title as unknown) === "string")) return goals;   // the SAME array
```

`repairPlanPrompts` had no early-out. It went straight to `plans.map(...)`, so **a plan library with nothing to repair came back as a NEW array** — and a plan library is rebuilt on every hydration, so every plan row looked edited. The property the other three went to the trouble of keeping was the one thing this copy lost, and no census could see it: the three copies' identity clauses were in `proof-timeline`, and the fourth copy's had never been written.

**The door.** `repairTextField(rows, field)` now lives in `domain/rowText.ts`, beside the `asRowText` it uses:

```ts
export function repairTextField<T extends object>(rows: T[], field: keyof T & string): T[] {
  const read = (r: T) => (r as Record<string, unknown>)[field];
  if (!rows.some((r) => typeof read(r) === "string")) return rows;
  return rows.map((r) => {
    const v = read(r);
    return typeof v === "string" ? ({ ...r, [field]: asRowText(v) } as T) : r;
  });
}
```

The four store-named functions keep their names and their docstrings and become the seam into it — the M404 shape, where `headroomOf` is the primitive and `scouting.headroom(player)` is the shaped convenience.

**The census.** `scripts/proof-repair.mjs` (7 checks): the scans are armed and the old per-store sweep is what they draw; the tree is real; **the rule is in one place** — the per-store sweep survives nowhere outside the door's own body, the door's body holds the two string checks, and all four seams are reduced to a call into it; the store still reaches all four seams at the hydration boundary, in the shape `proof-timeline` charges; the door is declared exactly once, in its home; **the identity properties are charged once, for all four stores** — a library with nothing to repair is the same array, a keyed row is the same object, a row that is not a string is untouched, a plain string becomes a RowText value, and an empty list is safe; and the door is a repair and not a rebuild.

**What a reader sees.** Nothing, today: the repair only changes how a stored row is *read*, and every row in the world is already keyed or already a plain string. But the plan library's identity property was wrong — a rebuild on every hydration — and that is the kind of thing that turns into "why did my plan look edited?" later.

**Next.** The concept-level detector is now the app's sharpest scout, and it has one shape left to look at: `domain/goals.ts`, `domain/memory.ts` and `domain/training.ts` all carry a "the same rule, different field" family, and the detector finds *identical* bodies — but a family of three near-identical bodies that differ by a field name is a family the detector cannot see, because normalising identifiers makes them equal only when the whole shape matches. The next unit is a detector for **near**-shapes: bodies that differ only in a name, which is where the remaining duplication hides.

### M415 — twenty-four exports promised a consumer that did not exist, and the gate now reads the promise back

**What the gauge says.** `scripts/proof-dead-exports.mjs` **4/4** on the folded tree. Run against the
pre-fold bytes it names **24 dead exports over 13 files** — arm R restores all fourteen folded files
from `HEAD` and the clause prints every name. The census walks **97 files and 587 exports**, measures
and declines to charge **142 exports read only inside their own module**, and its arms battery comes
back **11/11**: at-rest readings before and after plus nine mutations, each arm's red set predicted
from its clause's own sentence, and zero foreign writes during any arm. `tsc --noEmit` exit 0 and
`npm run build` exit 0. The full suite reads **90/90** proof scripts proven (**2974/2974** checks counted) on the folded tree.

**The defect.** An export is a promise that another module takes the name. Twenty-four names had no
taker anywhere:

- five page components (`CommunityHub`, `LearnHub`, `ManagerOS`, `ScoutingPanel`, `TacticalStudio`)
  exported a `default` alias while the router read the named component through
  `lazy(() => import(...).then((m) => ({ default: m.X })))`;
- fourteen copied-in UI kit parts: the six non-`Card` parts of `card.tsx`, `CommandShortcut`, three
  `Dialog` parts and four `Sheet` parts;
- `Sparkline` in `ui/primitives.tsx`;
- four domain symbols: `CATEGORY_LABEL`, `AgeGroup`, `NamedValue`, `DRILL_PHASES`.

Removing `CATEGORY_LABEL` exposed a second, one step down: its only reader was the import feeding
it, so the English table `CATEGORY_LABELS` in `data/attributesLabels.ts` lost every reader too. The
fold removes **25 exports across 14 files** — the 24 the gate charges on the old bytes plus that
cascade. `tsc` cannot see any of them: a named export is legal whether or not an importer exists, and
`noUnusedLocals` is off for the reasons M413 recorded. The cost is the reader — an export list offers
completion and search a name no consumer calls.

**The reader, and the four shapes it got wrong first.**

*Dynamic imports.* The first census charged every page component dead because it did not read
`import("./x").then((m) => m.Name)`. Reading the `.then` parameter as a namespace binding dropped
the count from 55 to 27; the list-export fix below took it to 24. Clause 1 now pins named, default,
namespace, dynamic and re-export consumers, each with its own fixture.

*A list entry's local binding.* `export { badgeVariants }` where the same file declares
`const badgeVariants = ...` was charged until imports and the local declaration were blanked before
the internal-use test; only real occurrences count.

*Script consumers.* A proof script may load a production module through Vite's SSR loader, so a
whole-word mention in script code keeps an export alive. The first version also counted mentions
inside strings, and arm D stayed green: the path arrays and report templates that name every page
made the dynamic-import reader look sufficient on the real tree. The script reader is now one
stack-based pass that blanks comments and quoted text and keeps code and regex literals — a census
rule written as `/CATEGORY_CODES[^;]+;/` really does read that name, while
`["features/dashboard/Dashboard.tsx"]` does not. One pass, because a template's `${...}` can hold
another template: the two-pass stripper closed the outer template at the first backtick, and the
rest of the report text looked like code. With strings blanked, arm D reds with **23 dead page
components**, which is the real-tree witness the clause needed.

*A comment in the exporting module.* A comment never keeps an export alive, even in its own module.
Clause 1's internal-only fixture carries a `ghost` export whose only other mention is the sentence
above it; with comment stripping disabled (arm E) the ghost leaves the dead list and the gate reds,
alongside clause 4 because the header quotes a repaired path.

**No exemption list.** Clause 4 strips the gate's own comments with the same reader and fails if its
code quotes an app path — a per-file skip list is exactly the exemption this census exists to refuse.
The plant is assembled from fragments (`["features", "dashboard", "Dashboard.tsx"].join("/")`), so
the gate does not quote a real path and trip itself, and the planted list names 2 real files. Clause 2
derives the roots: every top-level directory carrying TypeScript must be walked or named in
`NON_APP`, with floors of 95 files, 550 exports and 100 self-only exports catching the other
direction. Moving `features/` into `NON_APP` (arm G) reds the floor, charges
`ui/primitives.tsx:SectionTitle` dead — its only readers are feature screens — and breaks the
planted skip-list count.

**What is NOT claimed.** The 142 exports read only inside their own module are measured, not charged:
`export` on a helper the file uses itself is redundancy, not a lie, and arm F's disabled internal
credit reds three clauses. A name mentioned only in a script string or comment is not a reader; a
script that assembles an export's name at runtime is not seen, and a dynamic import bound to a
variable and read later is not seen. The gate says nothing about whether an export is used well —
only that something outside its module takes it.

**Two stale pins the suite found.** The first full-suite run on this fold surfaced two
readings that no longer matched the tree, and neither was in the new gate. `proof-headroom` was
already red from M414's fixture doors, which left `domain/career.ts` with two floored differences
where the gate pinned five; its family pin follows the fold from 8 to 5. `proof-i18n` pinned the
chrome wiring this fold changed: `DialogFooter` carried the dialog's second `ui.close` label, so
folding that dead part leaves one live close label per chrome file (3 → 2 positions), the
outside fill scan reads five sites (six before), and the literal `t()` census reads 1,300
(1,301 before). Both proofs say in their own comments what moved and why the surviving claim is
the right one.

**Next.** The same boundary has a third direction: modules no one imports at all. The walk already
resolves every specifier; a file that no import reaches and that is not an entry point is invisible
to both the import and the export censuses. That is the next unit.

### M413 — six files imported eight names their own bodies never read, and one comment defending them was false

**What the gauge says.** `scripts/proof-dead-imports.mjs` **4/4** on the folded tree — the same gate
on the pre-fold bytes names exactly **8 dead bindings over 6 files**, which is the reading this unit
closes. The census walks **97 files and 1,562 named bindings**; the arms battery is **6/6** (restore
all six files, restore one, break the spread rule, break the comment stripper, drop `features/` from
the walk, move `domain/` into the non-app list), each arm's red set predicted from its clause's own
sentence. `tsc --noEmit` exit 0, `npm run build` exit 0, and `proof-i18n` reads **376/376 with 0
vacuity owing across 87 proof scripts**, so the new gate's 4 clauses each carry a plant.
The whole suite came back **87/87 proof scripts, 2956/2956 checks**, zero FAIL.

**The defect.** `attributeLabel` and `CATEGORY_LABEL` in `domain/scouting.ts`, `buildLoad` in
`data/ai.ts`, `StatTile` in `Dashboard.tsx`, `getPlayer` and `Crest` in `PlayerOS.tsx`,
`playersByClub` in `SimulationLab.tsx`, `SectionTitle` in `TransferCentre.tsx`. Eight names a file
brought into scope and then never spelled again. `tsc` cannot see them: `noUnusedLocals` is off, and
a named import is a legal statement whether or not anything reads it. They cost a reader, not a
byte — M405's measurement of the same shape found the main chunk byte-identical with the dead
import dropped — but they cost the reader who trusts the file: the name sits in the import
list, the editor offers it in completion, and a search finds the import and concludes the file uses
it.

**One of them was defended by a comment that had stopped being true.** The type comment above
`ScoutEdgeTemplate` said `attributeLabel`/`CATEGORY_LABEL` "stay in the file only as the English
fallbacks the prose layer uses." The prose layer had moved to the dictionary in an earlier
milestone; the sentence describing the dependency outlived it, and that sentence is why a plain-text
census would have called both names live. The fold removes the two bindings and the sentence, and
the second comment that named `CATEGORY_LABEL` by way of explaining why the category id is carried
now says "not its label." A comment is not a use, which is the whole reason the reader below strips
comments before it counts.

**The reader, and the three shapes it got wrong first.** The census parses every named import list
in the walked tree, blanks the import statements, strips comments with a character scanner that
tracks strings, template literals and both comment forms, and then asks whether the local name is
spelled again. Three shapes decide the answer: a **spread** (`...ZONE_TONE`) is a use even though a
dot precedes it — the first census read it as member access and reported three live bindings dead;
**member access** (`obj.ZONE_TONE`, `obj?.ZONE_TONE`) is not a use; a **comment** never is. JSX
tags, type positions, aliases and multi-line import lists are all charged in clause 1, with the
readings printed beside the claim, and arm E/F prove the spread and comment rules carry weight on
the real tree: break either and the gate reds.

**Why a census and not `noUnusedLocals`.** The flag is one line in `tsconfig.json` and would have
caught all eight. It is also a build failure under another session's hands: in a shared worktree it
reds the moment someone saves a file mid-edit, it cannot name which binding in a 400-line file is
the one, and turning it on is an edit to the compiler contract every other lane inherits. The census
costs one file, names the binding, runs only when the suite runs, and charges the tree the commit
actually ships. The trade is stated rather than hidden: `noUnusedLocals` stays off.

**The root set is derived, and this is the clause that keeps it honest.** Every top-level directory
carrying `.ts`/`.tsx` must be either walked or named in `NON_APP` (`scripts`, `dev`, `dist`,
`node_modules`, `test-results`, `vendor`). A directory that appears and is added to neither reddens;
the floors (90 files, 1,400 bindings) catch the other direction, where someone moves a real app
directory into `NON_APP` to quiet the gate — arm H does exactly that with `domain/` and the file
floor reds, and arm G drops `features/` from `ROOTS` and the reach guard reds. One population
coupling is worth recording: the anti-exemption plant names a real `features/` file, so cutting
`features/` from the walk reds that clause too — the plant is a reading of the population, and it
says so.

**What is NOT claimed.** A binding mentioned only inside a string literal is credited as a use; a
default import or a namespace import (`import * as X`) is not charged at all; and the gate says
nothing about whether an imported name is used WELL. It closes the one shape it names — a named
binding nothing reads — and no other.

**Next.** The same reader pointed the other way: exported symbols that no other module imports. The
suite has censuses for doors and idioms; nothing yet reads the module boundary itself, and the fold
above shows that a name can be dead on either side of it.

### M414 — "the fixtures still to play" was spelled four times, twice of them in the same expression

The same shape as M412, one file over: a figure the app computes in two places, spelled more than once in each.

**The family.** `domain/career.ts` has two functions that both need *how many fixtures a club's season has* and *how many are still to play*:

```
career.ts:227   const totalFixtures = Math.max(1, (clubCount - 1) * 2); // home + away round robin
career.ts:229   const remaining = Math.max(0, totalFixtures - played);
career.ts:238         : r.points + ppg(r) * Math.max(0, totalFixtures - r.played);
career.ts:549   const totalFixtures = Math.max(1, (clubCount - 1) * 2);
career.ts:604   { key: Math.max(0, totalFixtures - played) === 1 ? "mgr.summary.remainingOne" : "mgr.fixturesLeft", vars: { n: Math.max(0, totalFixtures - played) } },
```

**The season's total was spelled twice** — once in the outlook and once in the summary — and **the count still to play four times**: once per row, once as a local, and **twice in the same expression** on line 604. That last one is the sharpest: a reader of that line has to check that the copy deciding *which* sentence to use and the copy filling in the number agree — and they do today, because they are the same arithmetic, but nothing held them to it.

**The doors.** Two, both in `domain/career.ts` where the two functions live:

```
export const seasonFixtures = (clubCount: number): number => Math.max(1, (clubCount - 1) * 2);
export const fixturesLeft = (total: number, played: number): number => Math.max(0, total - played);
```

The summary function now computes `remaining` once and uses it for both the key and the variable — the double spelling in one expression is gone, and the two functions read the same door.

**The census.** `scripts/proof-fixtures.mjs` (7 checks): the scans are armed, and the "fixtures still to play" shape requires the *season's* figure, so an unrelated floored difference is not charged; the tree is real; **the families are closed** — neither spelling survives outside the doors' own bodies, and the home carries one of each because the doors' bodies *are* the spellings; the doors are declared exactly once each, in their home; the career module reaches both (2 calls and 3 calls); the doors keep the edges their spellings had (a club's season has at least one fixture — the floor of 1 — and the count still to play never goes negative — the floor of 0); and the doors agree with the arithmetic they replaced **over the whole space**: 40 club counts and 3,240 (season, played) combinations, 0 disagreements.

**A note on the shape.** The "fixtures left" scan deliberately names the *season's* figure (`totalFixtures`) rather than any floored difference, because the app has twenty other floored differences that are **different concepts** — the fixtures still to play, the gap to the projected leader, the years to peak, the criticality above the role floor. `proof-clamp` and `proof-clamp-feature` both name the single-sided floor as a *documented survivor* of the two-sided `clamp` door, because a floor and a bound are different contracts. A census that swept all twenty would have charged a decision the app had already made.

**Next.** The app's duplicated *concepts* keep converging one at a time. The remaining candidates the same scout surfaces are smaller: `domain/learn.ts` counts a completed lesson by re-testing the same record three times in one function, and `domain/career.ts`'s `totalFixtures` is still spelled once in the *summary*'s sibling shape. The next unit is worth choosing by what a READER can see, not by what a scanner can count.

### M412 — the threshold a door's own docstring promised would live in one place had two readers re-testing it

M411 (the other session's unit) was about the ledger's measurement paragraph. This one is in the app, and it is the same shape as M404's `headroomOf`: **a door exists, its own docstring says what the door is for, and two callers re-test the number anyway.**

**The door and its promise.** `domain/playerDna.ts` owns the question *"does this player have a full attribute vector, or only a rating?"* — `VECTOR_MIN_KEYS` is the threshold and `playerVector` is the door — and its docstring says exactly why it is one place:

> *"One threshold, one place, so every consumer agrees on what 'has a vector' means."*
> *"Callers use this to decide measured vs modelled rather than each re-testing the threshold."*

**The two that re-tested it.**

```
domain/compare.ts:57
  const hasVector = (p: PlayerRef) => !!p.attributes && Object.keys(p.attributes).length >= 8;

scripts/proof-m99.mjs:112
  const measured = modelPlayerProfile(players.find((p) => (p.attributes ? Object.keys(p.attributes).length : 0) >= 8));
```

The second one is the worse of the two, and it is worth naming: **a proof that was supposed to be measuring the code was measuring a copy of its number.** If `VECTOR_MIN_KEYS` had moved from 8 to 10, `proof-m99` would have kept passing while testing a threshold the app no longer used — the gate would have gone quiet exactly when it was needed.

**The fold.** `domain/compare.ts` now asks the door: `const hasVector = (p: PlayerRef) => playerVector(p.attributes) !== null;` — the same pattern `domain/playerDna.ts`'s own `playerDna` uses. And `proof-m99` asks the same door, so the proof measures the code rather than a copy of it.

**The census.** `scripts/proof-vector.mjs` (7 checks): the scans are armed and a bare numeric threshold is what they draw — with an **emptiness check** (`Object.keys(x).length > 0`) explicitly *not* charged, because "is this record empty?" is a different question from "is this vector long enough?"; the census walks the app **and the proofs** (93 app files + 92 proof scripts), because the second bypass was in a proof and a census that read only the app would have found the first and called the family closed; **the family is closed** — no bare threshold on an attribute vector survives in the app or in a proof; the door and its constant are declared exactly once, in their home; all three readers reach the door and each imports it; the door keeps the threshold's edges (exactly 8 keys is kept, 7 is null, an absent vector is null, an empty one is null); and the reader the fold moved **agrees with the door on every player the world has** — 610 players, 610 with a vector either way, 0 disagreements.

**A counting bug the census caught in itself.** The first version of the helper counted matches with `text.match(re)`, and one of the patterns was a **non-global** regex — whose `match` returns the capture groups alongside the match, so `length` counted the *groups* and a one-group pattern read as 2. The helper now builds a fresh, always-global regex for every count, and says why in a comment: a global regex carries `lastIndex` between uses, and a census whose counts depend on which scan ran first is not measuring anything.

**Next.** The app's duplicated *concepts* are converging one at a time — `headroomOf` (M404), the money door (M401–M402), the vector threshold (this unit), the URL parameters (M409), the instant validity (M408). The next one worth measuring is the one the same scout keeps pointing at: **`domain/career.ts` computes "the fixtures still to play" three times**, twice of them in the *same expression* — so a reader has to check that two copies of the same arithmetic agree.

### M411 — the ledger shipped a measurement paragraph that measured nothing, and its own gate ran red behind the worktree

**What the gauge says.** The gates this unit turns: `scripts/proof-gauge-hole.mjs` **6/6** on the
landed ledger — the same file read 2/6 before the splice, its four reds being the hole, the gauge
lead left empty, the tally that proves the readers count rather than detect, and the section
that states this gate's clause count, absent — `proof:record`
**5/5** with the pointer below at the newest heading, and `proof:command-entry` **11/11**, the report
whose measurement slot was empty. `tsc --noEmit` exit 0. The whole suite on this worktree, read
while the hole was still open, came back **82 of 85 scripts, 2935 of 2942 checks** — one red was
this unit's own gate and two were a concurrent session's in-flight files (`proof-epoch`, and
`proof-i18n` owing `proof-real-instant.mjs:125`), which this commit does not claim to repair. That
number is recorded as a reading of a shared worktree, not as this unit's green.

**What HEAD carried, measured before anything was changed.** Two damages, one shape. First the
artifact: `scripts/proof-command-entry.mjs` landed in `d7312c5` and the section that describes its
fix landed with it, but the two SOURCE files that section names were still uncommitted in this
shared worktree — so HEAD's own gate, run against HEAD's own bytes, came back **5/11 with six
clauses red**: the badge's button, the shell's single open state, the one `⌘K` binding, `/search`'s
readers, the loaded component's arity, and the command primitives' importer count. That half is
already closed, by `1b5b30e`, and the replay of the same probe on the committed bytes reads 11/11
with nothing unattributed.

**The half this unit closes is the record.** M405's section had been spliced from a draft with a
placeholder still in the slot where its measurement goes. The paragraph kept its bold lead and its
wrapping and lost its contents: after the lead there was exactly one thing, the token `__GAUGE__`.
One unsubstituted marker, the only one in the file, in the slot where the reading should be.
A hole in a record is worse than a missing paragraph: the paragraph is present, formatted
like every other measurement, and says nothing — the reader who skims the bold lead takes it as a
reading. It is also M399/M400's own defect class wearing a different costume. In a sentence a
missing figure is the em dash, a convention a reader can see through; in the ledger the convention
was a scratch marker that had simply never been replaced, and no gate read it back.

**The gate.** `scripts/proof-gauge-hole.mjs`, 6 clauses, reading `README.md` off disk. It charges
two shapes and reconciles a third. An unsubstituted placeholder — `__` plus an uppercase run plus
`__` — must appear zero times in the ledger's PROSE: a marker inside a code span or a fence is the
file talking about a hole, not a hole, which is the same shielding `proof-record` needs for the
headings it quotes, and `__dirname`-style lowercase dunders are exempt because they are the ledger
quoting code. Every paragraph that opens with the ledger's measurement promise — the bold
"What the gauge says." lead — must be followed by a figure, because confident prose in a
measurement slot is the same hole dressed up (the gate counted 3 such leads on the ledger before
this splice and found 1 of them empty — the paragraph this unit fills; the landed file reads one
more, this section's own measurement paragraph being it). And where a section names a gate and states
how many clauses it has, the count is taken from that file's `ok(` calls — the only clause here
that could catch the record claiming an artifact it does not carry — and a section of that pair
whose claim is missing reads red rather than passing quietly, because a clause that is green while
the thing it charges is absent witnesses nothing, which is exactly how this clause read on its own
first draft. The population floor rides with
it (lines at least 9,000, milestone headings at least 150, gauge leads at least 2), because "0
tokens" is also what an empty read says, and clause 5 proves the readers sum rather than merely
detect.

**What is NOT claimed.** No word of M405's narrative was rewritten to make a gate pass — its
repair paragraph describes bytes that exist now, which is the fix, and editing a landed section is
the same trick from the other side. This census runs on the file as it sits on disk, so it cannot
tell a section spliced into the wrong revision from one spliced correctly; it charges the uppercase
placeholder spelling and the gauge lead only, so `TBD`, `FIXME`, or a measurement paragraph written
in some other phrasing walks free. And the HEAD reading above is a fact about a revision, not a
pin: a gate that asserted it would rot at the next commit, so the gate plants the shape instead.

**Next.** The reason a red gate could sit on `master` unnoticed is that every measurement in this
repository is taken on the shared worktree, which is routinely in a better state than `HEAD`. The
structural version of that gap, and the one this unit stumbled into while writing clause 6: charge
the shipped gates on a plane built from `git archive HEAD` for the files a commit touches, so a
commit that lands a gate without its source — or a source without its gate — reddens at the commit
rather than at the next stranger's tidy tree.

### M410 — the gap list grew from forty-one bare numbers into forty-one named units

M406's gate held the ledger honest about **which** milestone numbers have no section. This unit makes the list *useful*: each entry now names the work that shipped under that number, taken from the commit that shipped it.

**What the list said, and what it said nothing about.** Before, the list was:

```
- M188
- M190
- M191
…
```

which answers "which numbers are missing" and nothing else. A reader who asked *"what was M341?"* had to go and dig for it, and the ledger's own pointer paragraph already admitted the shape of the problem — *"the proof scripts advanced to M322 in commits that carried no README section"*. Now it says:

```
- M341 — fold six duplicate domain clamp definitions onto one lib/utils export
- M342 — converge the last seven inline domain round1 onto scouting's shared export
- M354 — a ratio shown as a percent was divided by hand in six domain modules
- M372 — nineteen one-decimal display strings across eleven files ride the new fmt1 door
```

**Thirty-nine of the forty-one shipped.** The history has a commit for each: M358's duplicate-value ratchet, M359's best-overall ordering (sixteen copies), M360's percent label (seven places, two of them already named), M361's three hand-nested clamps, M365's last bare percent-fills, M372's nineteen one-decimal display strings, M373's three integer display strings. The work was in the tree all along; the ledger was not.

**Two did not name their number.** M322 and M392 are in the history as commits that *carried* the number without naming it: M322's is the roadmap sync that carried the number on its way to M323, and M392's is the green-restore fix for the M384–M391 conversions. The script is told which commit by hash and **verifies the hash is in the history** before it writes the entry, and the entry says so in words — *"the commit that carried this number without naming it"*. A list that named a commit the history did not have would be a claim the reader could not check.

**The gate.** `scripts/proof-ledger-run.mjs` grew a fourth clause: the reader now takes the description as well as the number, and the clause charges that **every entry names the work that shipped under it** (41/41 described, 0 bare) and that **no two entries name the same work** — a copy-paste list wearing the shape of a ledger is not a ledger. The list's numbers are still held against the tree by M406's clause, so a section that later appears for one of these numbers makes its entry stale and the gate says so.

**One thing the writing script had to learn.** It was not idempotent: it appended its body to the block, so every run left another copy of the list behind — and three runs left the gate reading 287 entries where there are 41. The script now **replaces** the block, and the gate's reader is the thing that would have caught it if the list had shipped in that state. That is the M396 lesson once more, in the smallest possible shape: a list beside a tree, written by a script, has to be replaceable rather than additive.

**Next.** The ledger now names every gap and what filled it, so the remaining question is the one the M406 section named: **should those forty-one have sections at all?** A section is the app's record of *what a unit proved*, and a commit subject is a record of *what it did* — and the project's own sections are the richer form. Recovering them is the next unit, and the gate will tell us when it is done: a filled gap is a stale list entry, so the list shrinks as the sections arrive.

**And the app lane, for the record.** The scout for M410 first went looking for a floor-at-zero door — `Math.max(0, …)` in twenty places over twelve files — and found the app had **already answered that question**: `proof-clamp` and `proof-clamp-feature` both name the single-sided floor as a *documented survivor* of the two-sided `clamp` door, because a floor and a bound are different contracts. A unit that folded the twenty would have contradicted a decision the app had already made, with proofs. The scout's own honest answer is worth recording: **the idiom is converged, and the right move was to read the proofs before writing the fold.**

### M409 — a reader-supplied parameter stopped being trusted: the `?status=` cast was a lie the type system could not catch

M408 converged the app's date idioms. This unit is the family its own shape pointed at: **the eleven `query.get("…")` sites over five files** — a value in the URL is reader-supplied, and the reader can type anything.

**The defect.** The Matches tab read its tab out of the URL with a cast that lied to the compiler:

```
features/football/FootballWorld.tsx:319
  const [tab, setTab] = useState<"LIVE" | "SCHEDULED" | "FINISHED">(
    (query.get("status") as "LIVE") || "SCHEDULED",
  );
```

`as "LIVE"` told the type system the value was the literal `"LIVE"` when it could be any string at all. The tab state is typed as the union of the three tabs, and the cast made the compiler agree — so a reader who typed **`#/matches?status=bogus`** reached the tab with `"bogus"` in the state. `matchesByStatus` filters `m.status === status`, so the filter matched **nothing**: the list came up empty and, because no tab equalled `"bogus"`, **no tab was highlighted either**. A page that looks broken, from a URL a reader can type.

**A cast cannot check a value; a door can.** The unit added two doors to `lib/utils.ts`:

- **`paramText(query, name)`** — a parameter that is text, defaulting to the empty string. It folds the six `query.get("…") ?? ""` sites (ComparePage's `a` and `b`, FootballWorld's `club` and its two `q`).
- **`paramOneOf(query, name, allowed, fallback)`** — the read that **trusts nothing**: it answers one of the allowed values or the caller's fallback. The Matches tab now reads `paramOneOf(query, "status", MATCH_STATUSES, "SCHEDULED")`, and the `as "LIVE"` cast is gone — so a reader who types a status the app does not expect lands on **the tab the app would have chosen**, with the list populated and the tab highlighted.

**What stayed on the raw read, and why.** The app also reads parameters whose **presence** matters — a carried mentality, a carried formation shape, a filter value — and those answer `null` for an absent parameter, which is the answer those sites are asking for. Four sites over three files stay on `query.get`, and the census charges that they stay: a door that folded the empty string into them would have taken away the answer.

**The census.** `scripts/proof-param.mjs` (8 checks): the scans are armed and the old spellings are what they draw; the tree is real and every subject is inside it; **the old spellings are gone** — no parameter read defaults to the empty string and no parameter read is cast to a literal type; the presence family stayed on the raw read (4 sites over 3 files); the doors are declared exactly once each, in their home, and both readers reach them and import them; the doors answer what they promise (the text door gives `""` for an absent parameter and the value otherwise; the validating door gives one of the allowed values or the fallback); **the defect is closed** — `bogus → SCHEDULED`, `LIVE → LIVE`, `FINISHED → FINISHED`, absent → `SCHEDULED`, and the chosen value is always one of the three the tab strip draws; and the validating door is not the text door (it refuses a value outside the allowed set while the text door passes it through).

**What a reader sees changed — and it is the point.** Before, a reader-supplied status the app did not expect produced an empty list and an unlit tab strip. Now it produces the tab the app would have chosen. That is the first unit in this run that changes what a reader sees in a case a reader can actually reach.

**Next.** The URL-parameter family is closed. The app's remaining hand-spelled idioms are the generic ones — `Math.max(0, …)`'s floored differences (twenty sites over ten files, eight of them named as a different concept), `Object.keys(…)`, `Number.isNaN` on a **number** rather than an instant. The next unit worth measuring is the one the floored-difference family keeps pointing at: a "difference that cannot be negative" is a concept the app uses twenty times, and eight of those twenty are a different concept wearing the same shape.

### M408 — "can this stored instant be read as a time at all" was asked nine ways over seven files

The ledger's three claim families are now charged (M405 about the app, M406 about itself, M407 about the files it names). This unit goes back to the **app**, to the last hand-spelled idiom the scout found worth a door.

**The family.** The question "is this stored instant a real time?" was asked in three dialects across seven files:

```
domain/history.ts:143        if (!l.completedAt || Number.isNaN(new Date(l.completedAt).getTime())) continue;
domain/history.ts:169        if (!c.at || Number.isNaN(new Date(c.at).getTime())) continue;
domain/history.ts:210        if (Number.isNaN(d.getTime())) return "invalid";
domain/load.ts:66            if (Number.isNaN(t)) return "";
domain/load.ts:90            if (Number.isNaN(t) || t < chronicFrom || t > nowMs) continue;
domain/review.ts:90          return !Number.isNaN(t) && t >= fromMs && t <= nowMs;
domain/training.ts:165        if (Number.isNaN(t) || t >= startOfToday) return s;
features/history/HistoryPage.tsx:179    if (Number.isNaN(d.getTime())) return "";
features/profile/ProfilePage.tsx:353    if (Number.isNaN(d.getTime())) return "";
```

Three spellings — a parsed string, a `Date`, an already-computed number — of one question. And the empty-string guard that went with the parse (`!l.completedAt ||`) was carrying its own copy of the same truth: `new Date("")` does not parse either, so a blank instant was caught twice.

**The door, and the sibling it must not be confused with.** `isRealInstant(value)` lives in `lib/utils.ts` beside `epochMs`, and the two answer **opposite questions**. `epochMs` asks *"how many milliseconds is this"* and floors a value it cannot parse to `0`; `isRealInstant` asks *"can this be read as a time at all"*, which is what a guard on a reader-facing date needs — an unparseable stored instant is a record to skip, not a date at the epoch. A 0 floor would answer *"yes, that is a real time"* for a value that is not one, and the two are used in opposite places.

**The door keeps the guard's own leniency.** `new Date("42")` parses, and the guard said yes to it too, so the door says yes. That is deliberate: the door is faithful to what it replaced, and a rewrite that "tightened" it would have moved a figure a reader sees. The census measures it rather than asserting it.

**What stayed inline, and why.** `features/sim/SimulationLab.tsx:52` reads `!Number.isNaN(Number(carriedMt))` — that asks whether a string is a **number**, not whether it is a time, and folding it would have put a number into a time. The census charges that it stays.

**The census.** `scripts/proof-real-instant.mjs` (7 checks): the scans are armed and the guard *shape* is what draws the line (a planted parsed form, a planted Date form and a planted number form each read 1, and a planted numeric-string check reads **0** for the guard scan and 1 for the numeric one); the tree is real and every subject is inside it; **the family is closed** — the guard form survives nowhere outside the doors' own bodies, and the home now carries **two** of them, because `epochMs` asks the same NaN question and the exclusion is charged rather than assumed; the numeric-string check is a different question and stays inline (1 site, in one file); the door is declared exactly once, in the `lib/utils` home, and all six readers reach it and import it; the door answers what the guard did on every shape and every edge (5 strings, 5 numbers, 2 dates, plus `null` and `undefined`); and the door is not `epochMs` — a value it cannot parse is `false` here and `0` there.

**Nothing a reader sees moved.** The fold is the same predicate, spelled once. The two edges a rewrite would break — a stored instant that does not parse, and the blank string — are the two the census measures.

**Next.** The app's numeric and date idioms are converged. The next thing worth measuring is the family the scout found and this unit's own shape points at: **the "read a parameter out of the URL" idiom** — eleven `query.get("…")` sites over five files, each with its own `?? ""`, each with its own "is this value one of the allowed ones" check, and a reader-supplied id that can miss.

### M407 — the ledger's file references, and the five that pointed at a file the tree had already deleted

M405 gave the ledger a gate for its claims about the app, and M406 for its claims about itself. This unit is the third of the family: **the ledger's file references** — 708 of them across the sections, and a name that points at a file the tree no longer has is a claim a reader cannot check.

**The shape of the defect.** Most of the 18 dead references are fine. A section that says *"the escape defect in `components/ui/chart.tsx`"* is a true statement about a file that was later deleted — the defect was real, the file is gone, and both are true. But five references put a deleted file in a list of work **still to do**, and those are false:

> *"the older queue is unchanged — … the two `components/ui/calendar.tsx` sites the day anything mounts them …"*
(that component was removed from the disk at M248, so the item is retired)

The component was removed from the disk at **M248** — "the two live-browser exemptions (`chart`, `calendar`)" — and M200, M201, M202 and M213 each still listed its sites as open. A reader who went looking for them would find nothing, four sections apart.

**The gate is sentence-scoped, and that is the whole trick.** A **live-item** sentence ("the older queue is unchanged", "exemptions are declared", "is permitted only while nothing imports the primitive") that names a file must have that file resolve, **or the paragraph must say the file is gone.** A descriptive sentence that merely mentions a deleted file is left alone, because a file that no longer exists can still be the subject of a true past statement. Paragraph-scoped detection would have been too coarse in both directions: a paragraph that says the raw-UI debt "still **46**" is not a queue, and a paragraph whose *next* sentence says "both exemptions were removed at M248" is excused by the paragraph it belongs to.

**What changed in the ledger.** Four sentences now carry the removal note, so each queue item says the component is gone and retires itself: M200's exemption sentence gains "Both exemptions were removed from the disk at M248, so the rule they were carved out of no longer applies and the queue items naming them are retired", and the three queue sentences gain "(that component was removed from the disk at M248, so the item is retired)".

**The census.** `scripts/proof-ledger-refs.mjs` (4 checks): the reader is armed both ways (a live-item sentence is recognised, a descriptive one is not, a removal note is recognised and a queue sentence without one is not); the resolver reads the real tree (12 roots, 1664 distinct file names); **every live-item reference to a file resolves, or the paragraph says the file is gone** (708 references scanned, 5 live-item references to a deleted file, 0 unexplained); and the gate is armed both ways (a planted live-item sentence naming a deleted file is reported, the same sentence with a removal note is not).

**The honest limit.** The gate cannot tell a *descriptive* reference to a deleted file from a *live* one when the sentence is ambiguous, and it leaves 12 dead references entirely alone because they are descriptions of things that happened. That is the right default — a ledger that recorded the removal of a file is not lying about it — but it does mean the gate is a floor and not a ceiling: it catches the shape it was written for (a queue item), and a claim in some other shape would need a new arm.

**Next.** The ledger's three claim families are now charged: about the app (M405), about itself (M406), and about the files it names (this unit). What remains uncharged is the ledger's *numbers* — the counts and check totals each section states ("45/45 checks", "1,492,456 → 1,492,510 bytes", "82 file references"). A number in a historical section was true then; a number in a section that claims to describe the present is a claim the tree can check.

### M406 — the ledger's own record has forty-one gaps, and the pointer paragraph named three of them

M405 gave the ledger a gate for the claims it makes about the *app*. This unit applies the same idea to the claims it makes about *itself*.

**The shape of the record.** The ledger records the early milestones as prose (the "Roadmap status" section) and the later ones as `### M<n>` sections. Between the two forms there are **forty-one milestone numbers with no section at all** — the work shipped, the commits are in the history, and the record does not have them. The pointer paragraph names a few by hand:

> *"M238, M239 and M241 had no sections when M240's was written, and this sync added all three; the proof scripts advanced to M322 in commits that carried no README section, and M323 is the first unit to land with one since M316"*

Three numbers, named, out of forty-one. The rest were never named at all, and a hand-typed list beside a tree is exactly what goes stale — M396's lesson, pointed at the ledger one last time.

**What the work was.** The commits are there. M359 folded the best-overall ordering onto a door ("sixteen copies, and one of them was already named"); M360 folded a percent label ("seven places, and two of them were already named"); M361 folded "one day in milliseconds" ("spelled four ways, two of them only by an underscore"); M362 converged the byte-identical Mini tile; M365 closed the last bare percent-fills; M370 folded the data lane's last writer residues; M372 gave `round3` its own census; M373 gave `fmt0` its door. The ledger simply does not have them.

**The gate.** `scripts/proof-ledger-run.mjs` (4 checks): the gap reader is armed (a planted list reads, a malformed entry is caught, a ledger with no block reads null rather than an empty set); the tree's gap set is read off the sections themselves (198 sections, M167..M405, 41 gaps); **the ledger names every gap the tree has, and names no gap that has been filled** — the two sets must be EQUAL, in both directions, because a gap the list does not name is an unrecorded milestone and a gap the list names that now has a section is a stale list; and the gate is armed both ways (a planted ledger that misses a gap is rejected, and a planted ledger that names a *filled* gap is rejected too).

**The fix.** The ledger now carries the full list of forty-one, in a marked block beside the Outstanding work section, with the numbers a reader can check against the history. The gate compares it to the tree, so a milestone that later gets its section must come out of the list, and a gap that is not on the list cannot hide.

**What this does not do.** It does not recover the forty-one sections. That would mean writing a section for each from its commit message — a large, mostly mechanical job, and a section that restates a commit message is worth less than one that records what the unit *proved*. The honest thing is to say the record is incomplete and say exactly where, so a reader knows that a number between M167 and M405 may have no section and can go to the history for it. M407's work, if the ledger is to be whole, is that recovery — and the gate will tell it when it is done, because a filled gap is a stale list entry.

**Next.** The ledger's claims about the app are charged (M405) and its claims about itself are charged (this unit). What is still uncharged is the ledger's *file references* — 705 of them across the sections, and 18 of them name a file the tree no longer has. Most are true statements about a deletion, but a section that says "these two sites are still outstanding" about a file that was later deleted is the M405 shape again, in a different place.

### M405 — a badge that names a key must open the thing the key opens

**The defect, measured before anything was written down.** The topbar's search button
carried a literal `<kbd>⌘K</kbd>` chip and an `onClick` of `navigate("/search")`. The ⌘K
chord itself was bound inside `CommandPalette` to a dialog that owns a `CommandInput` over
`globalSearch`. So the machine said one thing and the mouse another: press the key the
badge names and the palette opens; click the badge that names that very key and a
different surface appears. Neither surface is wrong — the palette searches and `/search`
searches — but the badge was a promise about a control it did not drive. This unit moves
no page; it moves the promise.

**The repair: one owner for the open state.** `AppShell` holds
`const [paletteOpen, setPaletteOpen] = useState(false)` and hands both halves to
`<CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />`, whose signature
became `({ open, onOpenChange })`; the keydown handler toggles the owner's state
(`onOpenChange((o) => !o)`) instead of a private one, so the badge, the chord and Escape
all drive the same control. The badge's button now calls `setPaletteOpen(true)`, and the
shell's `useRouter()` destructure lost the `navigate` it no longer uses.

**A dead import went with it, and it was charged rather than swept.** `AppShell` imported
`Command` from `@/components/ui/command` at HEAD while rendering no command surface at all
— `tsc --noEmit` stayed green over it because the build does not enable `noUnusedLocals`,
so the only thing that would ever have complained was a reader that looks. The gate reads
that as a census (clause 11: the command primitives have exactly one importer, the palette)
rather than as a cleanup, because a second file reaching into a dialog's parts is the same
split this unit exists to close.

**What is NOT claimed.** `/search` did not lose its readers — the sidebar's nav item and
the route both still reach it, and clause 6 charges those two doors rather than the one
that moved, because a fix that orphaned a screen would be a second defect wearing the
first one's clothes. No copy changed: the two touched files read 51 literal keys and all
three locales hold every one (clause 10), so no reader sees a new sentence here. And the
palette's search behaviour is untouched — it was already debounced over `globalSearch`, and
the census pins that it still is (clause 8), so the badge cannot be accused of having
opened a launcher.

**The gate, and how it was proven to bite.** `scripts/proof-command-entry.mjs` is new: 11
clauses, every zero carrying its plant. Clause 3 is structural, not textual — it walks the
`<kbd>` line up to the `<Button` that carries it and down to its `</Button>`, then runs the
same reader over the pre-fix block byte for byte (0 openers, 1 navigation) so the clause is
proved to be reading the shape rather than noticing that the file changed. Clause 7 loads
both components through the shipped resolver and asserts `CommandPalette` takes one
argument; the props-less form it replaced takes zero, which is the defect in the compiled
world. The eight-arm battery mutated regions (never single lines that break compilation,
since a crash yields no tally): re-pointing the badge at `/search`, un-mouting the props,
moving the state back inside the palette (two coordinated edits), dropping the sidebar
entry, planting a second badge, swapping the ⌘K glyph, unbinding the input, and handing the
shell back its dead import.

**What the gauge says.** This unit's own gate, `node scripts/proof-command-entry.mjs`,
reads **11/11**, and replayed against `HEAD`'s bytes before the two source files were committed it
read **5/11 with six clauses red** — which is why the source landed as `1b5b30e` instead of riding
behind the section that described it. `tsc --noEmit` clean; `npm run build` exit 0, and the main
chunk is the same file before and after the dead import was dropped (`index-CtrZcjFI.js`, 776.32 kB
/ gzip 257.61 kB), because the palette already pulled that module in — a dead import costs a reader,
not a byte. The live leg ran against that build on a fresh port and returned **7/7 with zero console
or page errors**: the badge opens the dialog, `Ctrl+K` opens and then closes it, `Arsenal` returns
12 rows, Escape closes, the sidebar still reaches `#/search`, and the same dialog searches over
`/clubs`. This paragraph was filled by a later milestone; the whole-suite tally for the tree at
that moment is recorded there, not here, because the same worktree was carrying another session's
gates by then.

**Next.** Clause 11 closes one dead import by naming the module it reaches into. The same
rot measured tree-wide: **6 named imports over 5 files whose binding appears nowhere else in
its own file** (`data/ai.ts buildLoad`, `Dashboard StatTile`, `PlayerOS getPlayer` + `Crest`,
`SimulationLab playersByClub`, `TransferCentre SectionTitle` — each grepped to exactly one
occurrence, the import line). Nothing would ever complain about them: `noUnusedLocals` is
off, and a bundler drops the specifier silently, so the cost is a reader who thinks a screen
uses `Crest` and does not. The scout that produced this count was itself wrong first —
version 1 reported 12, because its classifier excluded any name preceded by `.`, which made
the spread idiom `...ZONE_TONE` at `Dashboard.tsx:35` look like a member access. The number
above comes from version 2, which shields only a real `a.Name` and splices the import out by
index. That is the unit to build next: one census for unused named imports, planted both ways.

### M404 — "the growth still available before the ceiling" was written three times, and one of the three was exported

M403 closed the reach of the doors the app has. This unit asks the other half of the question: **which of the idioms the app still spells by hand deserve a door?** The answer the scout found is a domain concept, not a utility.

**The family.** "The growth still available before the ceiling" — how many overall points a player could still gain — was computed in three places:

```
domain/scouting.ts:24     export const headroom = (p: PlayerRef) => Math.max(0, p.potential - p.overall);
domain/worldEngine.ts:94  const headroom = Math.max(0, p.potential - p.overall);
domain/careerArc.ts:73    const headroom = Math.max(0, potential - overall);
```

Byte-identical, so the three agreed today. That is exactly the drift risk the comparators (M376–M381) and the pricing curve (M385) retired: a change to what "headroom" means would have had to be *found* in three places, and would have been *made* in one. The scouting module's copy is the one that got exported; the other two were private, and **no census anywhere charged them** — the per-door proofs each charged their own door's body, and neither worldEngine nor careerArc had a door of its own to be charged against.

**The door, and why it is scalar-shaped.** `headroomOf(potential, overall)` lives in `domain/attributes.ts`, beside the other numeric domain doors (`marketValue`, `capRound`, `roundTo100k`). It takes the two **numbers** rather than the player, because the career arc's `annualChange` works on a record of `{ age, overall, potential, peakAge }` and has no player to hand — a player-shaped door could not have reached it without a fabricated record. The scouting module's `headroom(player)` is now the same door with the player's own fields read off it, and the two private copies are gone.

All three modules already imported from `./attributes`, so the fold added **no new module edge**.

**The census.** `scripts/proof-headroom.mjs` (8 checks): the scans are armed and the headroom *shape* is what draws the line; the tree is real and every subject is inside it; **the headroom family is closed** — the inline form survives nowhere outside the door's own body, and the door's own body IS the formula; the door is declared exactly once, in the attributes home, and no module re-declared a private copy; all three readers reach the door and each imports it from the home; the player-shaped door *is* the scalar door on every case, and neither can go negative; the door's body is the formula it replaced, byte for byte; and a **planted companion** — the door answers a positive headroom where there is one, and the floor is load-bearing (at `headroomOf(40, 90)` the unfloored difference would be −50 and the door reads 0) — so the "never negative" claim is not true of a door that answered zero every time.

**The false positive worth naming.** The first shape the census used was `Math.max(0, X - Y)` — and it found **seven** survivors outside the door: `career.ts`'s remaining fixtures (5), `careerArc.ts`'s years to peak (1), and `gap.ts`'s criticality above the role floor (1). None of them is a headroom. A census that charged them would have been crying wolf, and one that excused them by widening the shape would have lost the ability to see a new headroom. So the census carries **both** scans: the narrow one (the operands are a potential and an overall) must read zero, and the broad one is **pinned** at 8 sites over 4 files — the door's own body plus the seven survivors — so a *new* floored difference is measured rather than excused, and the family the door belongs to is still visible in the ledger.

**Nothing a reader sees moved.** The three copies were byte-identical, so the fold is arithmetically the same figure. The only change a reader could see is in the code, not in the screen: one place now says what "headroom" means.

**Next.** The scout that found this one looked for *repeated shapes* rather than for a named concept, and it is worth running again now that the headroom family is closed — the next one may be a different concept, or it may be nothing, and a scout's honest answer of "nothing left" is itself worth recording.

### M403 — one census for every door's reach, because M402 had to learn the same lesson twice

M402's money-door move taught the fmt0 and fmt1 censuses a relation they had never expressed: **a file that calls a door either imports it, or is the door's home.** The door's own home calls `fmt0` and `fmt1` without importing them — it *defines* them — and the data provider that used to hold the money door left their consumer lists entirely. Both clauses had to learn that relation the hard way, one fault at a time.

But the relation is general. Every door the app has has it, and only **two** scripts were checking it. This unit charges it for all of them at once.

**The three ways the reach can be wrong.**

1. **A caller that does not import the door from the door's home.** In TypeScript that is usually a compile error, but it is a *runtime* error in the one shape a scan can see: a module that calls a name it never brought in, which works only if the name is a global.
2. **An import of a name the home no longer exports.** This is the M396/M401 failure exactly: a door that moved behind another door left a stale import behind. The compiler catches it; the census's job is to say *which* door and *which* file.
3. **A second name for one door** — a file outside the homes that exports a name a door already exports. Two doors with one name is a second convention waiting to drift.

**The census.** `scripts/proof-doors.mjs` (6 checks): the import reader and the resolver are armed; the tree is real and both homes are inside it; the door list is **derived** from the two homes (51 doors — 19 in `lib/utils.ts`, 32 in `domain/attributes.ts`) and no door has a second name; **every door a file calls is imported by that file from the door's home** (243 caller files, 565 call sites, 0 mis-reached); no file imports a name a home no longer exports (310 import edges, 0 stale); and the reach check is armed both ways.

**The reader had to be right, or the census is noise.** A naive `import[^;]*from` spans several statements in the files that do not use semicolons, and the tree has both styles — so a scan that read it that way reported 243 mis-reached callers that were all fine. The reader instead takes one statement at a time, from the `import` keyword to *its own* `from "..."`, and a statement's `from` is never stolen by a later one. The resolver turns a specifier into a **path**: `@/lib/utils`, `./attributes` and `../lib/utils` must all land on the same string, or the home check would be a coin toss.

**The type import was the false positive worth naming.** The home's export list has to include its *types* and interfaces, not only its values: `domain/scouting.ts` carries `import type { CategoryAverage } from "./attributes"`, and a scan that counted only `export const` called it a stale import of a name that is very much there. A census that cries wolf is worse than no census.

**The census has teeth.** `dev/.m403-arms.mjs` mutates one file per arm, spawns the shipped script, and requires the FAIL clause to be the *predicted* one — an unexplained red is a hole in the model, never a number to widen. Every arm restores the pristine buffer and verifies `Buffer.compare === 0`:

| arm | mutation | red | what it proves |
| --- | --- | --- | --- |
| A | a caller drops the import of the door it calls | the reach clause | a call with no path is caught |
| B | a caller imports the door from the **wrong** module | the reach clause | the check compares the resolved PATH, not the name |
| C | a file outside the homes exports a door's name | the duplicate-export clause | two doors with one name is caught |

and an at-rest control that requires 6/6 with nothing mutated. Measured: 3/3 arms red as predicted, 0 unexplained, control green, files restored byte-exactly.

**What the census found: nothing.** The app's reach was already sound — 0 mis-reached callers, 0 stale imports, 0 duplicate names. That is the honest result, and it is the point of the unit: a shape that two scripts had to learn by accident is now checked everywhere, so the next door that moves does not have to teach it again.

**Next.** The reach is now charged for the doors the app has. The next thing worth measuring is the reach of the doors it does *not* have — the idioms that are still spelled by hand where a door could be, and the ones where a fold would move a figure. That is a scout, not a fold, and a scout's honest answer is sometimes "nothing left", which is itself worth recording.

### M402 — the money door moved out of the data provider and into the house with the other display doors

M401 closed the app's last private copy of the euro rule. What it left behind was a door in the wrong house: `formatValue` lived in `data/footballService.ts` — a **data provider** — while every other display door lives in `lib/utils.ts` beside the primitives it is built from. A simulation module could not read money without pulling the whole provider in with it, and the app's door list read in two files instead of one.

**The move.** The door is now `fmtMoney` in `lib/utils.ts`, next to `fmt0` and `fmt1` — which it is built from, and which it now *calls*:

```
export const fmtMoney = (v: number): string => {
  if (v >= 1_000_000_000) return `€${fmt1(v / 1_000_000_000)}B`;
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`;
  if (v >= 1_000) return `€${fmt0(v / 1_000)}K`;
  return `€${v}`;
};
```

**Why the name changed.** `formatValue` says "format a value" and could mean anything; `fmtMoney` cannot be mistaken for anything else, and it sits in a file whose other names are `fmt0`, `fmt1`, `fmt2`, `signed`, `signed2`, `ABSENT`, `SEPARATOR`. The name `formatMoney` stays **free** on purpose: `proof-career` already charges that no module declares a private money formatter under it, and a local copy would take that name. So the door took `fmtMoney` and the copy-shape kept `formatMoney` — the census and the reserved name still mean what they meant.

**The ten readers followed it.** `domain/career.ts`, `domain/compare.ts`, `data/intelligence.ts`, and seven screens (Dashboard, Details, ManagerOS, ScoutingPanel, TransferCentre, WatchlistBoard, DynamicWorld) now import `fmtMoney` from `@/lib/utils`. `domain/compare.ts` was the interesting one: it does not *call* the door, it **hands it as a value** (`display: fmtMoney`), and a census that only counted call parentheses would have missed it. The two prose claims that name the door were re-pointed at the new symbol, so the app's words and the code still agree.

**The census debt was five scripts, not one.** Each had to be re-derived rather than decremented:

- `proof-money` — the door's home moved, the symbol changed, and the reader set moved with it. Its uniqueness clause had to learn a new body shape: the door is now an arrow with a **block** body, and the parser that found function bodies was matching `const fmt2 = (v: number): string => v.toFixed(2);` and handing it the *next* function's body, so the door's own three branches were attributed to `fmt2` and the uniqueness clause read an empty set. The arrow form is now matched only when `{` follows `=>`, and a concise-body arrow is not matched at all.
- `proof-world` — its charged lookup followed the door to its new home.
- `proof-career`, `proof-compare`, `proof-ai-grounding` — three scripts took `formatValue` off the service module; all three now take `fmtMoney` off `lib/utils.ts`, and the two reach-guard clauses ("career.ts routes money through the door it imports", "compare.ts imports the money door") were re-pointed at the new import site.
- `proof-fmt0` and `proof-fmt1` — the money door's K and B lines call `fmt0` and `fmt1`, so **the door's own home became an internal reader of them** and the data provider that used to hold the money door left their consumer lists. Both clauses now charge a relation the old one could not express: a file that calls the door either **imports** it, or **is** the door's home. The home calls it once and imports it zero times; a caller that is neither is an orphan and reddens. The home's call is counted in **code** — `fmt1`'s own docstring quotes `fmt1(2.04)` while explaining the pad, and a raw scan read that as a second call.

**The conditional-decimal line moved too.** It was the one line that picked 0 or 1 at runtime and so could not ride a fixed-argument door. Its two censuses (`proof-fmt0`, `proof-fmt1`) pinned it in `data/footballService.ts`; it is now literally *next door* to the `fmt0`/`fmt1` doors, which is what their docstrings had always said. The pin moved with it, and the docstrings were corrected to match.

**Nothing a reader sees moved.** The door's body is the same formula; only its address and its name changed. The 48 squad totals that M401 re-read at the shared convention read exactly as they did there.

**Next.** The app's display doors now all live in one file, and every one of them is paid for by its own census. The next thing worth looking at is not another door but the *reach* of the ones that exist: a door that a module calls without importing is the failure shape the fmt0/fmt1 clauses just learned to see, and it is worth charging that shape everywhere rather than only where a move happened to expose it.

### M401 — the third euro formatter was still private, and it was the one that said `€0M` for a squad worth €400K

The app states its money convention in two places' prose, and both statements are still true today:

- `domain/career.ts:617` — *"The season prize total prints through the app's one `formatValue`, not a private copy: this module kept its own euro rule (drop the decimals on a whole million, a lowercase 'k' below one) while the Manager OS panel beside it already rounded the same currency the shared way (one decimal up to ten million, none beyond)"*
- `domain/compare.ts:146` — *"the value row prints money through the app's one `formatValue`, not a local copy: this module once carried its own euro formatter, so a future rounding tweak to the shared one would silently leave the comparison page quoting the same transfer fee a different way than the player page, dashboard and manager all already do"*

Two private copies were fixed by those sentences. A **third** survived, and nobody noticed: `domain/worldEngine.ts`'s `formatMarket`.

**What it did.** It had no **K branch** at all:

```
formatMarket(400_000)  ->  "€0M"      ← a figure that says ZERO where the value is not zero
formatMarket(500_000)  ->  "€1M"      ← rounded UP across a whole million
formatMarket(999)      ->  "€0M"
formatValue(400_000)   ->  "€400K"    ← what the shared door says
```

It also quoted the billions at **two** decimals and the millions at **none**, so the same currency read three different ways on one screen: the Dynamic World's market tile said `€2.25B` where the player page said `€2.3B` for the same magnitude family.

**What it is now.** The copy is gone. `features/world/DynamicWorld.tsx` reads the app's one money door — and it already imported from `@/data/footballService`, so the fold added no new dependency edge. The world screen's market tile changed from `€86030M` to `€86.0B`: the shared door's magnitude ladder is right, and a ten-digit number in a compact tile was not.

**The new census.** `scripts/proof-money.mjs` (9 checks): the scans are armed and the *compact-magnitude* shape is what draws the line (a planted private copy reads 1, a plain euro `€${v}` reads 0, a euro caption without a division `€{maxValue}M` reads 0); the tree is real and every subject is inside it; **the money door is UNIQUE** — exactly one function in the whole tree carries a compact-magnitude euro, and it is the shared door; the private copy is gone by name as well as by shape (looked for in *code*, so the module that carried it can record the removal in a comment); **the K branch is there** — the door reads a small total as a small total, and the plant (a door without the branch) reads `€0M` exactly as the old copy did; the door's per-branch conventions are pinned by exact reading (billions at one decimal, millions conditional on €10M, thousands at zero, the raw euro below a thousand — 9 pins); the world screen reads the shared door and its market tile prints the door's reading of the world's own total (610 players → 86,030,200,000 → `€86.0B`, computed the way the screen computes it); every money reader reads the one door, **including the one that hands it as a value** (`domain/compare.ts`'s `display: formatValue`, which a call-parenthesis scan would have missed); and the app's words and the code agree — both prose claims still name the one door, and the engine declares no money formatter and records the removal in a comment.

**The siblings that had to move.** Two, and both are the same shape of lesson.

`proof-world.mjs` took three names off the engine, and one of them was `formatMarket`. Its `take()` helper is the M396 mechanism: the names are looked up and the lookup is charged, so a name that moved behind a door reds with a message naming the module it moved to — which is exactly what happened, and the message was right. The engine's list is now `["runWorld", "seasonLabel"]`, the money door is taken off `data/footballService.ts` instead, the clause that pinned the old readings now pins the shared door's (`€12M`, `€1.5B` — the billions lost a decimal, which is the shared convention), and a new guard refuses the engine re-exporting a formatter of its own.

`proof-fmt2.mjs` was the other one, and it is the M396 lesson applied to a census that had never needed it. `domain/worldEngine.ts` read the `fmt2` door in exactly one place — the private formatter this unit deleted — so with the copy gone the file reads the door **zero** times and had to leave the consumer list. The old clause could only see that one direction: it checked that every *listed* consumer still used the door, and said nothing about a file that used the door *without being listed*. The clause now compares the set for **equality** against the tree, which refuses a stale row and an unlisted reader alike. The door's own home is excluded from the derived set — its docstring quotes `+fmt2(x)` while explaining the unary-plus bridge, and the old clause never saw that because it only ever looked at the listed files.

**The honest limit.** This unit changed reader-visible text, and more of it than any fold before it: 48 of the 73 shipped squad totals read differently, because the billions lose their second decimal. That is the cost of one convention, and the census charges the number rather than claiming nothing moved. The magnitudes themselves never changed — a `€2.25B` still means 2.25 billion — only the precision the app shows everywhere else.

**Next.** The money door itself lives in `data/footballService.ts`, a data provider, while every other display door lives in `lib/utils.ts` beside the primitives it is built from. Moving it there is the next unit: a simulation module could then read money without pulling the data provider, and the door list would read in one place.

### M400 — the empty-string name fallback read as a hole, and the decision was to make it read as the app's own marker

M399's "Next" named this one and said it was not a fold: *"the empty-string club-name fallback in `data/intelligence.ts` is the one already named, and it changes what a reader sees, so it needs its own decision rather than a fold."* This unit is that decision, and the fold that followed from it.

**The defect.** A club or competition name the app looked up and did not find read as `""` — the empty string. In a sentence slot that is a hole with no convention behind it:

```
"Arsenal (ARS) play in , overall 88, at Emirates."     ← the hole
"Next up vs Chelsea in ."                                ← the hole
"Arsenal vs Chelsea ()"                                  ← the hole
```

The app already owned an absence marker. `lib/utils.ts`'s own docstring says ABSENT is *"what a reader sees where a figure **or a name** is missing"* — the name was in the door's contract from the start, and the code never honoured it. So the app carried **two** conventions for absence: the em dash, and the hole. `DataRoom.tsx` contradicted itself in three lines: `:130` and `:131` read `getClub(...)?.short ?? ABSENT` while `:132` read the identical shape as `?? ""`.

**The decision.** A missing name now reads the em dash. That is a real change to the reader's text, and it is the first in this lane — every fold before it moved no figure. The census therefore charges the *other* side too: the hole it removes is measured, and the marker is shown to be the absence door's own glyph rather than a new character.

**What was folded.** 28 sites over 7 files: `data/footballService.ts` (2), `data/intelligence.ts` (18), `features/analytics/DataRoom.tsx` (4), `features/football/Details.tsx` (1), `features/football/FootballWorld.tsx` (1), `features/scouting/ScoutingPanel.tsx` (1), `features/sim/SimulationLab.tsx` (1).

**The lane is drawn by shape, not by a file list.** The name lane is an optional chain on a name field (`.name` / `.short`) falling back to the empty string. The **control lane** keeps its `""`: a query parameter, an id default, a form's select value, a record's own optional text, a `rowLine` result — 22 sites over 13 files, counted and floored. The em dash is a *display* glyph; a control value of `"—"` would be a broken id, not an absence. `proof-absent-name.mjs` charges the control lane's survival in the other direction, because a census that had swept every `""` onto the door would have made that lane 0 — and the lane going to 0 is a regression, not a win.

**The new census.** `scripts/proof-absent-name.mjs` (10 checks): the scans are armed and the lane's *shape* is what draws it (a control lane reads 0 name-empty); the tree is real and every subject is inside it; **the name lane is closed** (0 name lookups fall back to the empty string); every name fallback now reads the door (33 sites over 9 files — the 28 folded plus the 5 that already rode it); all seven folded files import the door exactly once; the control lane survived (22 sites over 13 files, floor 20/12); the marker *is* the absence door's own glyph (one em dash, not the empty string, not a second dash — the planted hole and the planted second dash both fail); every row the lane feeds reads the marker and no row is left with a hole (11 rows, 0 holes, where the same rows had 11 before the fold); the change is **latent** (0 unresolvable names over 73 clubs / 610 players / 1566 matches, so no reader sees the marker today); and every name-lane var is plain, so the marker prints itself instead of being routed through a translator (26 vars in a `vars:` object plus 2 JSX props — a `KEY` var routes through `t()` and a `CODE` var through `codeWord()`).

**The sibling that had to move.** `proof-absent-glyph`'s clause 6 pins the door's *total* user set and each user's use count. The fold added three new user files (the service's search subtitles, the Football World's club badge, the Simulation Lab's season caption) and grew four existing ones — `data/intelligence.ts` 2 → 20, `DataRoom.tsx` 9 → 13, `Details.tsx` 4 → 5, `ScoutingPanel.tsx` 2 → 3. The pin was re-derived from the tree, per file, rather than decremented; a stale count here is exactly the defect M396 was about.

**Reachability, measured.** On the shipped world every club, competition, player and match resolves — 0 unresolvable names — so the hole never appears on today's data and the change is latent. The reader-supplied id is the live case: `FootballWorld.tsx` reads `?club=` straight from the URL, and `getClub(<a name that misses>)?.name` is exactly the branch this unit closed.

**Next.** The `fmt1` door's remaining sibling — the one conditional-decimal line in the value formatter (`.toFixed(v >= 10_000_000 ? 0 : 1)`), which picks 0 or 1 at runtime and so cannot ride a fixed-argument door — is the last display convention in `lib/utils` with no door of its own. After that, the vacuity ceiling's zero-asserting clauses in `proof-i18n` need their companion devices paid down.

### M399 — the last hand-spelled `+1.50` went behind its door, and three censuses had to be re-derived

**The residue.** M393 built the `signed2` door (`lib/utils.ts`) for numbers shown at a fixed two
decimals with a leading `+`, folded the Film Room's scan-trend tile onto it, and left the Manager
career's season-form cell spelled by hand:

```
{ key: "mgr.outlook.form", vars: { form: `${form >= 0 ? "+" : ""}${form.toFixed(2)}`, … } }
```

That cell was *charged by name* in three proofs — pinned as an exception whose excuse was that its
carrier was mid-flight in another lane. A named residue is a promise to come back; this is the
coming back. `domain/career.ts` is the only source file this unit touches.

**Why the fold could not move a figure.** The door's body is the inline formula verbatim, so the two
spellings agree by construction; `scripts/proof-signed2.mjs` measures that on 14 values including the
two edges a rewrite would break (`-0` pads to `+0.00`, `-0.001` keeps its own minus and `toFixed`'s
rounding, `-0.00`). The Film Room's tile needed a null guard because its trend can be absent; career's
`careerForm()` is typed `number` and always returns one, so the fold adds a branch it does not need —
which is why the cell's reachability clause is pinned on the row itself (`key: "mgr.outlook.form",
vars: { form: signed2(form)`) and not on a `? ABSENT :` guard.

**The census debt is not one script, it is three.** The same two bytes are read by three doors'
censuses, and each of them had to be re-derived rather than decremented:

- `proof-signed2` — its residue list is now empty, both cells are folded, the caller set is pinned by
  *identity* (`callers.join(",") === FOLDED.sort().join(",")`) rather than by a count, the padded
  spelling's carrier set is pinned to the door alone, and the pre-fold spelling is planted so the
  reachability clause binds the folded shape instead of any fallback token.
- `proof-fmt2` — the padded family is one of `.toFixed(2)`'s four classified lanes, so folding career
  moves a site out of it. The lane's total went 2 → 1 and **the total was never the pin**: it read 2
  before M393 (career + FilmRoom) and 2 *after* M393 (door body + career) for different reasons. The
  carriers are pinned, and each carrier is now separately required to import the door.
- `proof-signed` — the raw-number sibling charges the padded spelling to a *different* door, so its
  clause said "FilmRoom left it, career is the named residue" with `paddedSites[0][1] === 1`. After
  the fold the numeric-sign survivor set shrinks from two files to one, and the padded clause requires
  both cells at zero plus a derived carrier set equal to the door alone.

**Witnesses.** `dev/.m399-arms.mjs` mutates one region, spawns the shipped proofs, and requires the
FAIL-clause *set* to equal a prediction derived from each clause's own claim; every arm restores the
pristine buffer and verifies `Buffer.compare === 0`. A red outside the prediction throws as
`UNPREDICTED` — an unexplained red is a hole in my model of the census, never a number to widen:

| arm | mutation | reds | what it proves |
| --- | --- | --- | --- |
| A | re-inline career's padded cell | signed2 `{6,7,13}` · signed `{9,11}` · fmt2 `{7,12}` | the spelling and the caller are both census-visible; a fold that only edits the import would not survive |
| B | delete career's call, pad nothing | signed2 `{6,13}`; signed and fmt2 **stay green** | the caller-set and row clauses read the **call**; the padded census reads the **spelling** — two claims, not one restated |
| C | drop career's import, keep the call | signed2 `{6}` · fmt2 `{12}` | the reachability clauses bind the call site, so an import-only fold is refused by the import clause alone |
| D | re-inline FilmRoom's cell | signed2 `{6,7,12}` · signed `{9,11}` · fmt2 `{7,12}` | the pins are not career-specific: the M393 member of the family is guarded by the same censuses |

The at-rest control runs all three proofs with nothing mutated and requires 13/13, 13/13, 12/12 with
no FAIL line to attribute; without it, the four arms would be measuring a tree that was already red.

**Named, not fixed.** The door still quotes the shape it replaced in its own docstring, so `lib/utils`
is read **by line** in three places across the three proofs — a raw file scan there reads 2 and would
hide the quotation as a stray. That exclusion is itself a pin (`docQuote === 1`), but it means the
census is line-aware for exactly one file: if a consumer ever puts the padded spelling inside a comment
of its own, it is charged as a stray, and that is the right verdict for a spelling a reader may copy.

**Measured on the plane at this commit.** `proof-signed2` **13/13**, `proof-signed` **13/13**,
`proof-fmt2` **12/12**, arm battery **4/4** predicted red sets matched exactly (0 unexplained), `npx
tsc --noEmit` exits 0, career's padded spellings **1 → 0**, tree-wide padded spellings **2 → 1** (the
door body). The displayed string for the season-form row is byte-identical before and after.

**Next.** The lib/utils doors are all census-paid under their own names now. The scout for the next
unit is a duplicated idiom that has no door yet — the empty-string club-name fallback in
`data/intelligence.ts` is the one already named, and it changes what a reader sees, so it needs its own
decision rather than a fold.

### M398 — the ledger lost a heading while its own gate stayed green, so the gate learned to read paragraphs

**The defect.** `README.md` is this project's ledger and `scripts/proof-record.mjs` is its only
accountant. The accountant read headings the way a line reader does — `/^### (M\d+)\b/` — and M396's
landing script exploited exactly that blindness. It joined the new section onto the file without
separating the paragraph before it, so line 7107 read:

```
…**Next.** The separator family … are the highest-profile readers.### M395 — the marker's own
population went behind the door, and the census had to keep a population it could still lose
```

CommonMark renders that as one paragraph of prose. `### M395` was not a heading; it was the tail of
M396's sentence. And every check the gate owns reported success: **188 headings found, 188 distinct,
0 duplicated, 0 empty bodies, pointer matched newest** — 4/4 green while the ledger had silently
dropped a milestone. The damaged section was counted as *body text* of the section above it, which is
the one reading that makes an absent heading look like a present body.

**The fix.** A fourth reading, `gluedHeadings()`, scans for `### M\d+\b` anywhere in a line and
charges it when something other than whitespace precedes it. It exists only as a **pair** with the
blind reading: the clause requires `glued === 1` on a planted glued heading *while `milestoneSections`
counts 0 headings of that same fixture*. That pairing is what makes a self-narrowing scan impossible —
a reader that stopped matching anything would report no damage and keep its green clause, but it could
not keep the plant, and the plant is asserted inside the same expression the clause uses (M313).

**Two shields, because the ledger talks about itself.** README quotes milestone headings as prose in
**three** inline code spans (lines 4905, 6713, 6750 carry `` `### M225` `` and `` `### M336 —` ``) and
**42** fence markers elsewhere. An unshielded scan charges all three quotations as damage, so the next
honest append would be refused for a reason nobody could act on. Inline code is blanked before the
match and fenced regions are skipped — and both shields are planted, not assumed: a backticked quote
fixture and a fenced-block fixture must read 0. A three-space-indented heading reads 0 too, because
that is a code block in CommonMark, not a lost section.

**The repair.** `dev/.m397-repair.mjs` split line 7107 back into paragraph, blank line, heading — one
splice, +2 lines, asserted against the newline count its own replacement string carries rather than a
hand-typed number. The preflight refuses a mixed-EOL README and requires the damage it is about to fix
to be exactly `7107:### M395`; the post-check asks **the shipped judge**, not a copy of its predicate,
for 5/5. Headings went **188 → 189**, distinct stayed equal, pointer stayed green.

**Witnesses.** `dev/.m397-arms.mjs` mutates one file per arm, spawns the shipped script, and requires
the FAIL-clause *set and count* to equal the prediction (every arm restored byte-exactly; `unexplained
FAIL lines === 0` is asserted, so a red I did not predict is a hole rather than a number to widen):

| arm | mutation | reds | what it proves |
| --- | --- | --- | --- |
| A | re-glue the repaired README | `{4}` | the clause names the real damage, and only it — clauses 1–3 stay green on the same bytes, which is how the defect hid |
| B | `GLUED_MARK` matched nothing | `{4,5}` | a blinded reader loses its plant *and* the damaged fixture verdicts true — the pairing and the battery both bite |
| C | code-span shield removed | `{4}` | the three quotations become damage; the shield is load-bearing |
| D | fence tracking removed | `{4}` | README has 0 heading-looking lines inside a fence (measured), so only the plant reddens — the plant is load-bearing |

The at-rest control runs the shipped judge with nothing mutated and requires 5/5 with no FAIL line to
attribute; without it, all four arms would be measuring a tree that was already broken.

**Named, not fixed.** The gate still cannot tell whether a section describes the work its number
belongs to — M339's third copy had a correct heading and M396's body, and only a reader caught that.
What it can now refuse is the *shape* the damage actually took: a heading welded to a sentence.
`gluedHeadings()` also does not read a heading inside a fence, which is right for prose and wrong for a
fixture — if a future section documents heading shapes inside a fenced block, that block is invisible
to the census by design.

**Measured on the plane at this commit.** `proof-record` **5/5** (was 4/5 on the damaged bytes), the
arm battery **5/5** checks (baseline + 4 arms, every predicted red set matched exactly), README
**9,869 lines / 190 headings / 190 distinct**, pure CRLF before and after (CR = LF count on both
reads). No source file changed: this unit touches `README.md` and `scripts/proof-record.mjs`, neither
of which enters the bundle — the app's behavior is unchanged by construction.

**Next.** The convergence lane's census debt is now the queue again: doors that exist but are counted
by another script's arithmetic rather than their own. `M397` belongs to the separator door, taken by
the lane that found it.

### M397 — the separator family went behind its own door, and the absence census had to learn to look the other way

M394/M395 closed the em-dash absence class. The en-dash separator — the glyph that JOINS two figures that are both PRESENT — was still spelled inline at 18 code joiners over 8 files: load bands (`${prev}–${upTo}`), scorelines (`${homeGoals}–${awayGoals}`), XG duels (`{a} – {b}`), comparison wins (`{aWins} – {bWins}`) and goal averages. One constant now owns the convention: `SEPARATOR` in `lib/utils.ts`, sitting beside `ABSENT` with a comment that spells out the distinction (separator joins two live values; absence marks a missing one).

**What was folded.** 18 code joiners over 8 files: `domain/load.ts` (1), `features/analytics/DataRoom.tsx` (2), `features/compare/ComparePage.tsx` (1), `features/dashboard/Dashboard.tsx` (1), `features/football/Details.tsx` (6), `features/football/FootballWorld.tsx` (2), `features/manager/ManagerOS.tsx` (2), `features/sim/SimulationLab.tsx` (3). The scheduled-score placeholder `"– : –"` in `Details.tsx:559` is a composite of two dashes and a colon, not a joiner; it stays as-is and is charged by name in `proof-absent-glyph`.

**The new census.** `scripts/proof-separator.mjs` (9 checks): the door's body is the en dash, not the em dash; `SEPARATOR` and `ABSENT` are different glyphs; the census walks the real app tree; zero code joiners spell the en dash inline in any app file (excluding the door's own file, whose joiners are comments ABOUT the door); the door is called by every file that was folded (8 callers, 26 references); the dictionary's 36 separator copies are prose owned by their translation, not code joiners; the absence family is unchanged (62 uses over 16 carriers); `ABSENT` cannot serve as a separator (splicing it in overwrites a joiner between two PRESENT figures); the scheduled-score placeholder stays a placeholder.

**The sibling that quoted the old shape.** `proof-absent-glyph`'s clause 9 (the separator family's own population) had to move: it required ≥ 15 code joiners over an eight-file list. After the fold, code joiners are 0 and the list is empty. The clause now requires `sepCodeTotal === 0` and `dataRoomSep === 0`, keeping the dictionary floor at ≥ 30 so a dictionary regression still reddens. Clause 5 (the en-dash ABSENCE class) had to exclude `lib/utils.ts` — the door's own `export const SEPARATOR = "–"` is a legitimate quoted en dash, not an absence marker; without the exclusion, the census charged the door's declaration as a defect.

Measured: `proof-separator` 9/9, `proof-absent-glyph` 12/12, `tsc --noEmit` clean, `vite build` exit 0 (29.98s). The full-suite verdict for this sync follows in M399's commit (the two units share one working tree).

**Next.** The `fmt1` door (conditional one-decimal formatting) and its three call sites are the next convergence target; after that, the vacuity ceiling's zero-asserting clauses in `proof-i18n` need their companion devices paid down.

### M396 — the ladder and the stale pins went behind their doors

M395 named one defect class: a symbol moved behind a door and the hand-written list beside it was never re-derived. Two scripts carried stale lists:

1. **proof-careerarc** — the clamp seam's consumer list was typed by hand (first five names, then four after M383 dropped `transfers.ts`). A legitimate convergence that *removed* a call reddened the clause forever; a NEW consumer that spelled its own clamp in a file the list never named was invisible to it.

2. **proof-world** — its destructure still asked `worldEngine` for `marketValue`, which M381 had moved to `domain/attributes.ts`. The script destructured `undefined`, crashed before its tally, and reported UNVERIFIED instead of FAIL — so nothing but a full-suite run ever said it died.

Both are fixed by **deriving the list from the tree instead of typing it**:

- `proof-careerarc` now reads the clamp consumer set off the app source: every file that calls `clamp(`, the single definer (`lib/utils.ts`), and the importer set. The clause charges **set equality** between callers and importers — strictly stronger than the old pin. It refuses a caller with no import (the shape the old list could not see) AND an import with no caller (a stale import left behind by a convergence, which is exactly what reddened the old list). The population floor refuses an empty scan.

- `proof-world` now looks up `marketValue` on the module that owns it (`domain/attributes.ts`) and asserts that `worldEngine` does not re-export it. The names the script uses are looked up, and the lookup is charged: every name must be a live export of the module it is taken from. A destructure that still asks the wrong module reddens with a message naming the module, instead of reddening nowhere at all.

A third fix closes the suite's own meta-gate: `proof-cn.mjs:167` asserted a zero (the `"0"` token `join` leaks) without carrying a device. The standard planted companion was added.

Measured: the whole `scripts/` suite 74 PASS / 0 FAIL / 0 UNVERIFIED, `tsc --noEmit` clean, `vite build` exit 0 (9.2s). The three non-greens M395 reported are all green:
  - `proof-i18n` 376/376 (the lane's own debt, paid with a companion clause)
  - `proof-careerarc` 69/69 (the stale consumer list replaced by a derived one)
  - `proof-world` 40/40 (the stale destructure replaced by a charged lookup)

**Named, not folded.** The five door declarations in `domain/attributes.ts` (`sum`, `unique`, `maxBy`, `last`, `tally`) were converted from `export const … =` arrows to `export function` declarations. This is not a fold — no inline spelling moved — but a style migration so the proof scanners can match `export function` uniformly. The corresponding proof scripts (`proof-sum.mjs`, `proof-unique.mjs`, `proof-maxby.mjs`, `proof-last.mjs`, `proof-tally.mjs`) were updated to match the new form and to explicitly charge the two documented survivors: `lib/rng.ts` keeps its inline fold and last-element read because it must stay dependency-free (proof-rng loads it through a bare Node with its own TS stripper, which cannot resolve `@/domain`). The census now pins those two survivors by file and line, so a stray re-inline cannot pass.

The ladder (`leaguePoints` / `resultPoints`) is also a door now. Its body lives in `domain/attributes.ts`; `proof-leaguepoints.mjs` pins it. `domain/analytics.ts` and `domain/career.ts` were converted to call the door; the ladder itself is gone from every caller.

**Next.** The separator family (18 code joiners over 8 files, 36 dictionary copies across 3 locales) remains charged apart from the absence marker — M394/M395 pinned it by name. The next unit is the **separator door**: one constant for the en dash that joins two present figures, with a census that proves no absence marker rides it and no code joiner goes elsewhere. The Data Room's XG duel tile and the match-line XG line are the highest-profile readers.

### M395 — the marker's own population went behind the door, and the census had to keep a population it could still lose

M394 opened the `ABSENT` door and folded the ten cells that displayed the WRONG glyph. The other thirty-five spelled the em dash inline — the reader already saw the right character at every one of them, so this unit moves no figure and no copy. It removes thirty-five ways of spelling one convention: `scripts/proof-absent-glyph.mjs` counted 38 standalone-dash reads across 17 carriers before the fold and 3 after, and those 3 are the door's own body plus the two generate-time values M394 deliberately left with the engines. 34 cells folded by `dev/.m395-fold.mjs` (30 quoted literals, 4 whole-JSX-child nodes) across 14 files, plus Dashboard:238's `?? "—"` folded by hand because that file had carried the door's import since M394 and the fold script refuses a file already naming it. The door now has 45 uses over 15 carriers, each of them pinned in a per-file ledger.

**What a folded cell looks like.** Two shapes the census had never read: `{ABSENT}` as an entire JSX child (`<span className="muted">{ABSENT}</span>`, `<option value="">{ABSENT}</option>`) and `ABSENT` as the fallback arm of a ternary or a `??` inside a `t()` var (`{ n: growth.recovery.acwr?.toFixed(2) ?? ABSENT }`). Both replace an inline dash, so the standalone-dash scan loses its render bucket entirely — and that is the trap M394 documented: a census whose protected bucket is empty can be blind and still reconcile. The clause therefore gained a bucket of the NEW shape — `{ABSENT}` as a JSX child, 5 cells over 4 files — floors the surviving population at 3, and demands the leftover JSX-node bucket be exactly 0. That 5/4 is read off the tree, not off the fold plan: Data Room's empty-form tile reached this shape in M394, so a pin copied from the plan ("4 over 3") was this unit's own first red.

**The arm that reddened my own new device.** Arm F predicted {6,9} and came back {6,7,9} — it broke the clause this unit had just written. `{ABSENT}` as a text pattern is ALSO a template interpolation slot: splicing the door into `domain/load.ts`'s band joiner writes `${prev}${ABSENT}${upTo}`, and the brand-new render bucket charged that as a displayed absence and gained a fifth carrier file. A bucket that reads a shape the fold never produces is the M394 failure in a new costume — it moves when something unrelated moves, so it cannot be trusted to stay put. The scan now refuses a brace introduced by a `$`, and arm F's own mutation text is the plant that proves the discriminator bites (`pJsxDoorInterp` reads 0 where it read 1, while the JSX child keeps reading 1). Proof back to 12/12, arms back to 6/6, and a separator fold no longer touches the render census.

**The sibling that quoted the old spelling.** `proof-signed2`'s reachability clause proved the Film Room tile renders `signed2` inside its own null guard by matching `== null ? "—" : signed2(`. Folding that tile was therefore not optional bookkeeping: the pin moved to `== null ? ABSENT : signed2(` and gained a plant requiring the PREVIOUS spelling to read 0, so a cell that goes back to the literal dash — or a fold that only adds the import — reddens. It is the only sibling proof whose pin this unit had to move, because the rest of the tree's dash reads live in `scripts/`, which the census does not walk.

**Witness arms.** Six mutations (`dev/.m395-arms.mjs`), each run against the shipped proof and required to fail the predicted clause SET *and* count, then restore the file byte-for-byte: un-fold one Load & Recovery cell back to the inline dash → {6,7}; hand-roll a private `const ABSENT` inside a consumer → {3,6,7}; introduce a NEW en-dash absence literal → {5} and nothing else; flip the door's own glyph to the en dash → {4,5,7,10}; drop the fallback arm of the Data Room tile while keeping the import → {6,12}; splice the door into `domain/load.ts`'s live band joiner → {6,9}. 6/6 MATCHED, 0 unexplained FAILs, every restore byte-exact. The last two are the ones a tempting shortcut would trip: an import-only fold still loses the reader-reached pair, and a file that never asked for the door cannot claim a use of it.

Measured: `proof-absent-glyph` 12/12, the whole `scripts/` suite 71 PASS / 1 FAIL / 2 UNVERIFIED, `tsc --noEmit` clean, `vite build` exit 0 (9.10s). The three non-greens are not this unit's and all three were attributed by reading HEAD's own bytes: `proof-i18n` runs 375/376 alone (inside the suite it spent the runner's 600s budget under concurrent load and so reports UNVERIFIED, which is a missing verdict, not a contract failure) and its one accusation is `proof-cn.mjs:167`, one of the two lines another lane's uncommitted diff touches; `proof-careerarc` fails "each of the five converged consumers imports clamp" because `domain/transfers.ts` stopped importing `clamp` in M383 while the clause still hand-carries its five-name list (worktree and HEAD both read 0 there); `proof-world` never reports a tally at all because line 10 destructures `marketValue` out of `worldEngine`, and M381 moved that door to `domain/attributes.ts` without re-exporting it — a crashing proof shows up as UNVERIFIED, so nothing but a full-suite run says it died.

**Named, not folded.** `data/intelligence.ts` falls back to an empty string for a missing club short name in one place where the rest of the app shows the marker. That is a display change (blank versus em dash), not a spelling change, so it does not belong in a unit whose contract is "nothing the reader sees moves".

**Next.** The two stale pins above are one defect class: a symbol moved behind a door and the hand-written consumer list beside it was never re-derived. M396 charges both — `proof-careerarc`'s `CLAMP_CONSUMERS` and `proof-world`'s destructure — by reading the exported names off the modules instead of typing them.

### M394 — the app had two dashes for "no value", and the one it used was the score separator

A reader sees an **em dash** wherever a figure or a name is missing: 35 render cells across the app already spell it that way. Nine reads in the Data Room (seven lines) and the Dashboard's goals column spelled it with the **en dash**, and the en dash is the glyph this app also uses to JOIN two figures that are both present — a load band is `0.80–1.30`, a scoreline `2–1`, an XG duel `0.9 – 1.4`. One character therefore meant "there is no number here" and "here are two numbers", in the same card, on the screen whose whole job is showing figures. `ABSENT` in `lib/utils.ts` is the marker's door; those ten cells fold onto it, and no displayed absence changes shape beyond that one glyph.

**What is NOT folded, and why.** Two families share the dash and not the meaning. The separator family — 18 code sites over 8 files, plus 36 dictionary copies in three locales — joins present figures and must stay an en dash; the refusal is measured, not asserted (`0.80–1.30` against the door's `0.80—1.30`, `2–1` against `2—1`), and an arm that splices the door into the live scoreline joiner reddens the separator census. And `domain/matchEngine.ts`'s unattributed VAR scorer and `domain/worldEngine.ts`'s unknown-nation value write `—` into **simulated data** at generate time. Those are record contents rather than render decisions, so a display door must not own them: both are pinned by exact line, and the census refuses either generator file reaching for `ABSENT` at all.

**The seam, reconciled rather than counted.** `scripts/proof-absent-glyph.mjs` (new, 12/12) demands that every standalone dash literal or JSX dash node in shipped code equals door body 1 + generate-time 2 + render residue 35 across exactly 14 named carriers, with the three buckets scanned independently. Its own first red is the reason the clause is shaped like this: the JSX bucket was wired to `JSX_EN` where the ledger needed `JSX_EM`, the scan silently read nothing, and the arithmetic **still reconciled** (31 = 1 + 2 + 28) because a mis-wired scan empties a bucket and the residue total moves with it. Two devices now close that: the residue is pinned by carrier-set identity, not by a hand-carried number, and every bucket carries a floor read from the same scan (`emJsxTotal >= 4`). A fourth spelling cannot hide from either.

**Witness arms.** Six mutations (`dev/.m394-arms.mjs`), each requiring the FAIL set to equal the prediction in clauses **and** count, then a byte-exact restore: re-inline a folded Data Room cell with the en dash → {5,6}; splice the door into the live scoreline joiner → {6,9}; fold Dashboard:238 without updating the residue ledger → {6,7}; hand-roll a private `ABSENT` next to the door → {3,6}; move the door's own glyph to the en dash → {4,5,7,10}; route the engine's unattributed-scorer value through the door → {6,7,8}. 6/6 MATCHED, 0 unexplained.

Measured: `proof-absent-glyph` 12/12 after the battery, `proof-fmt2` 12/12, `proof-analytics` 77/77, `proof-clamp-feature` 11/11, `proof-pct-feature` 9/9, `proof-mini-tile` 9/9, `proof-signed` 13/13, `proof-signed2` 12/12, `tsc --noEmit` clean, `vite build` exit 0 (7.76s). `proof-i18n` 375/376: the one red is the repo-wide vacuity census accusing `scripts/proof-cn.mjs:167`, one of the only two lines another lane's uncommitted diff touches, and this unit's new script sits inside that same 74-script census without being accused.

**The residue is named, not excused.** The 35 render cells across those 14 carriers stay inline in this commit — folding the marker's own population is the next unit, and it has to move the ledger pin and every sibling proof that quotes the literal inside a rendered cell (`proof-signed2`'s `== null ? "—" : signed2(` reachability regex first). Dashboard:238's `?? "—"` is the nearest of them, and arm C exists precisely so that folding it without settling the ledger is a red, not a quiet improvement.

### M393 — the padded `+` was glued out twice, and the raw-number door could not serve either one

M356 put the sign-prefix in front of a **raw number** behind `signed()`. Two cells in that family sign a **pre-formatted string**: career's season-form tile and the Film Room's scan-trend tile both wrote `` `${v >= 0 ? "+" : ""}${v.toFixed(2)}` `` — the two-decimal pad ("+1.50", not "+1.5") is part of what the reader sees, so routing them through `signed()` would have moved a displayed figure. They are a door now: `signed2(v)` in `lib/utils.ts`, and the Film Room's cell folded onto it. The figure a reader sees there does not change; no copy and no display string moved.

Career's cell still spells the pad inline. Its carrier is another lane's working copy, so this unit charges it **by identity** in both sibling gates instead of excising it — the residue is named, not excused, and folding it later has to move the pinned carrier set, which is the point of pinning carriers rather than a count.

**The seam, charged both ways.** `scripts/proof-signed2.mjs` (new, 12/12) asserts the door is declared exactly once with the exact shipped body, then charges the padded spelling **by file**: it survives in exactly two carriers — the door body and career's named residue — with FilmRoom read at zero and importing the door instead. The reachability clause pins what the fold actually did at the call site: `signed2(` is called inside the tile's own `== null` guard, so a fold that drops the guard (and starts rendering "+0.00" for "—") reddens. Three must-not-unify legs are behavioural, not prose: `signed(1.5)` is "+1.5" where the door says "+1.50"; `"+" + fmt2(v)` prints "+-1.00" for a negative where the door prints "-1.00"; and DynamicWorld's delta `+` comes from a boolean, so the numeric scans read it zero and its own lane keeps the charge. The padded-family scans are planted both ways, and the sibling door `signed` reads 0 under every `signed2` scan so neither can silently replace the other.

**What the siblings say.** `proof-signed` 13/13 — the raw door's census now expects the padded spelling in zero consumers and charges the one place it appears (the `signed2` body) as a door, and its career/FilmRoom rows were re-measured rather than relaxed. `proof-fmt2` 12/12 — the padded family's tree total is still 2 after the fold but for a **different** reason (career+FilmRoom cells, then door body+career), so the gate pins the carrier set and the per-site readings, not the number.

**Witness arms.** Five mutations of clean files (`dev/.m393-arms.mjs`), each requiring the FAIL set to equal the prediction in clauses **and** count, then a byte-exact restore verified against the pristine bytes: re-inlining FilmRoom's cell → {6,7,12}; dropping the import while keeping the call → {6}; rewriting the door as `"+" + fmt2(v)` → {4,5,7,8,9,11}, and both sibling gates go red on the same mutation; planting a third padded spelling elsewhere → {7}; renaming the door's parameter → {4}. 5/5 MATCHED, proof green again after restore.

Measured: `proof-signed2` 12/12, `proof-signed` 13/13, `proof-fmt2` 12/12, `tsc --noEmit` clean, `vite build` exit 0.

### M391 — the occurrence tally was hand-written five times, and one of them lived inside the simulation loop

M390 retired the last-element read. This unit closes the next duplication the census surfaced — the occurrence tally: set a key in a Map to its current count plus one, defaulting the current count to zero. It was hand-written five times: filmInsights' event-kind counts and recurring-focus counts, matchProbability's scoreline counts, review's focus counts and CommunityHub's focus counts. Same contract — and a real drift risk, since a reader that forgets the zero default silently produces NaN — so it is a door now.

`tally(xs, f)` in `domain/attributes.ts` is the definition: `xs.reduce((m, x) => m.set(f(x), (m.get(f(x)) ?? 0) + 1), new Map())`. Four of the five readers were standalone counting loops and converted directly (filmInsights' recurring-focus tally composes with the M388 `unique` door, keeping the per-clip dedup the loop did). matchProbability's tally was fused into its per-run simulation loop: the loop now materialises the run results once and makes two clean passes — the sums and the tally — same seeds in the same order, so every number the simulator produces is unchanged (its own proof, 38/38, still passes, as do the film and review proofs).

**The seam, charged both ways.** proof-tally charges the idiom — a Map.set whose value is the same map's get of the same key, defaulted to zero by either `??` or `||`, plus one — across the whole tree and asserts the only occurrence left is the door body, so a re-inline at any reader reddens it. The scan keys on the set/get pair with the default, not on "a set happens": a plain set, an object-property count and a bare get are left uncharged (the must-not-unify plants prove exactly that). The proof plants both default spellings and the converted call, asserts tally is declared once, its body is the idiom, all four readers call it (five call sites), and the door equals the old loop on every sample — occurrences counted, first-occurrence insertion order kept, empty safe. An integration clause replays the event-kind, scoreline and focus shapes. The file passes 8/8; tsc is clean.

**Still outstanding.** The converged math now covers the comparators, nearest-100k rounding, market-value curve, average-overall primitive, round-then-bound pair, ISO-date ordering, league-table ranking, the list-sum fold, the list dedup, the argmax fold, the last-element read and the occurrence tally. The fmt/signed/epochMs/pct family is another session's active area and was left to them. A fresh tree census is the next step if any remaining repeated predicate surfaces.

### M390 — "the final element of a list" was spelled ten times, in two forms, and two of them shadowed the door

M389 retired the argmax fold. This unit closes the next duplication the census surfaced — reading the final element of a list. It was hand-written ten times in two forms: the index form (history's day buckets, review's progress window, scouting's worst-edge picks twice, rng's weighted-pick fallback, the profile's last result, the dynamic world's latest season step, the details' final arc point) and the slice form (the profile's last session, onboarding's surname initial). Same "final element, undefined when empty" contract, so it is a door now.

`last(xs)` in `domain/attributes.ts` is the definition: `xs[xs.length - 1]`. Two readers named their local `last` and had to rename it (history's `lastDay`, the dynamic world's `latest`) so the door's name is not shadowed inside them — the same rename training's `sum` needed in M386. Guaranteed-non-empty sites keep a `!` (scouting's worst edge, rng's fallback, the details' peak age); guarded and optional sites drop straight in. footballSeed's surname split (the last word of a name) is another session's in-flight file and was left untouched — a documented survivor, like its localeCompare cousin.

**The seam, charged both ways.** proof-last counts both spellings across the whole tree — the index form with dotted paths allowed on both sides, and the slice form — and asserts the only occurrences left are the door body and footballSeed's surname split, so a re-inline at any reader reddens it. The scan keys on the last-element shapes, not on indexing in general: a first read, a penultimate read and a `pop()` are left uncharged (the must-not-unify plants prove exactly that). The proof plants all three shapes and the converted call, asserts last is declared once, its body is the index read, all eight readers call it (ten call sites), the survivor is the documented split-word form, and the door equals both spellings on every sample without mutating its input and undefined on empty. An integration clause replays the guarded day-bucket append and the dynamic world's latest-season read. The file passes 9/9; tsc is clean.

**Still outstanding.** The converged math now covers the comparators, nearest-100k rounding, market-value curve, average-overall primitive, round-then-bound pair, ISO-date ordering, league-table ranking, the list-sum fold, the list dedup, the argmax fold and the last-element read. The fmt/signed/epochMs/pct family is another session's active area and was left to them. A fresh tree census is the next step if any remaining repeated predicate surfaces.

### M389 — "pick the element with the greatest figure" was spelled three times, in two dialects

M388 retired the spread-set dedup. This unit closes the next duplication the census surfaced — the argmax fold: pick the element with the greatest figure under a selector, first max kept. It was spelled three times in two dialects: the scout report's best-value-at pick (`domain/scouting.ts`, call dialect), the career arc's peak point (`domain/careerArc.ts`, field dialect) and the player details' peak age (`features/football/Details.tsx`, field dialect inside a JSX interpolation). Same contract, so it is a door now.

`maxBy(xs, f)` in `domain/attributes.ts` is the definition: `xs.reduce((best, x) => (f(x) > f(best) ? x : best))`. Empty input throws, exactly like the no-init fold the scout pick uses — career's and details' `points[0]` init only postponed the same crash to the next read. ai's nearest-to-target pick keeps a similar fold shape but breaks toward the SMALLEST distance — a different contract — and stays inline, as does career's season-summary best/worst tracking, which is fused into its aggregation pass (the argmax is incidental to the sums, not a repeated spelling).

**The seam, charged both ways.** proof-maxby counts both dialects — accumulator-name-agnostic via backreferences, the M387 lesson — across the whole tree and asserts the only occurrence left is the door body, so a re-inline at any reader reddens it. The scan keys on the fold shape: a nearest-to-target pick, an argmin and the `Math.max(...xs.map(f))` maximum-of-values shape are left uncharged (the must-not-unify plants prove exactly that). The proof plants both dialects and a differently-named accumulator, asserts maxBy is declared once, its body is the argmax fold, all three readers call it, and the door equals both dialects on every sample — first max kept on ties, single-safe, empty throws. An integration clause replays the three converted sites' shapes. The file passes 8/8; tsc is clean.

Worth recording how the third site was found: the initial search grepped for the accumulator name `best` and missed Details.tsx, whose accumulator is `b` — the same name-shaped hole M387 closed for the sum census. The census itself caught it (tree read 2 against an expected 1), which is the census doing exactly the job it exists for. The proof's own first run also had two assertion bugs — a body regex expecting a return type the declaration does not have, and a tie expectation written backwards (b and d tie on value index and the first max is b, not d).

**Still outstanding.** The converged math now covers the comparators, nearest-100k rounding, market-value curve, average-overall primitive, round-then-bound pair, ISO-date ordering, league-table ranking, the list-sum fold (all accumulator names), the list dedup and the argmax fold. The remaining hand-written reduce contracts are single- or different-shape (career's fused best/worst pass, ai's nearest pick, the object-merge and max folds). The fmt/signed/epochMs/pct family is another session's active area and was left to them. A fresh tree census is the next step if any remaining repeated predicate surfaces.

### M388 — the spread-set dedup was written seven times, in two spellings, and one of them was an Array.from

M387 widened the sum census. This unit closes the next duplication the census surfaced — deduplicating a list while keeping the first occurrence of each value. It was written seven times in two spellings: the spread `[...new Set(xs)]` (training's focus attributes, ai's focus/target/last-focus keys, intelligence's phrase list, PlayerOS's carried focus) and `Array.from(new Set(xs))` (LearnHub's category tabs), plus attributes' own category list. Same "first-occurrence order preserved" contract everywhere, so it is a door now.

`unique(xs)` in `domain/attributes.ts` is the definition: `[...new Set(xs)]`. The seven readers were converted (five files, seven call sites); ai's three sites, intelligence's phrase list, LearnHub's tabs, PlayerOS's carried focus and training's focus attributes all keep their `.slice(0, 2)` and fallback logic on the outside.

**The seam, charged both ways.** proof-unique counts both materializing spellings across the whole tree and asserts the only occurrence left is the door body, so a re-inline at any reader reddens it. The scan keys on the materializing spellings, not on "a Set appears": a membership test (`new Set(ids).has(id)`) and an iteration (`for (const k of new Set(keys))`) are left uncharged — the must-not-unify plants prove exactly that. The proof plants both spellings and the converted call, asserts unique is declared once, its body is the spread over a fresh Set, all five readers call it (seven call sites), and the door equals both spellings on every sample with first-occurrence order preserved and empty input safe. An integration clause replays the converted sites' shapes (carried focus, merged focus, category tabs). The file passes 8/8; tsc is clean.

**Still outstanding.** The converged math now covers the comparators, nearest-100k rounding, market-value curve, average-overall primitive, round-then-bound pair, ISO-date ordering, league-table ranking, the list-sum fold (all accumulator names) and the list dedup. The max-by-selector reduce (scouting's pool pick and careerArc's peak point) and the nearest-to-target reduce (ai) are two- and one-site families that could become doors if a fresh census surfaces more of any shape. The fmt/signed/epochMs/pct family is another session's active area (their proof-signed work is in flight) and was left to them. A fresh tree census is the next step if any remaining repeated predicate surfaces.

### M387 — the sum census had a blind spot, and eight folds escaped through it by a different name

M386 converged the sum fold, but its census charged only the accumulator named `s`. A fresh census keyed on any accumulator name found eight more folds that had escaped through exactly that hole: career's expected-finish sum (`rivalRows.reduce((sum, r) => …)`), load's exercise minutes and mean (`(sum, e)` and `(a, b)`), review's xp-gained and average rating (`(sum, s)` and `(a, b)`), CommunityHub's average rating (`(a, b)`), and ProfilePage's clip minutes and reply counts (`(n, c)` and `(n, a)`). Every one the same contract M386 retired — just a different name on the running total. The census was widened to be accumulator-agnostic (the accumulator is a backreference, so `a`, `n`, `sum` all count) and the eight escaped folds converted: nineteen readers, forty call sites.

**The seam, charged both ways.** proof-sum now plants the three escape shapes (`a`, `sum`, `n` — one each) alongside the destructured and conditional shapes and the converted call, and refuses object-merge, product, max and nearest reduces while charging a count-reduce as the same fold. The widened census is itself the fix for the hole M386 shipped: a zero-leftover verdict is only as good as the scan behind it, and this scan no longer has a name-shaped hole. The file passes 8/8; tsc is clean. career.ts once again carried the other session's uncommitted signed2 work mid-file and went through the same revert-replay-restore dance as M385/M386.

**Still outstanding.** The converged math now covers the comparators, nearest-100k rounding, market-value curve, average-overall primitive, round-then-bound pair, ISO-date ordering, league-table ranking and the list-sum fold (all accumulator names). The non-fold reduce contracts that survived on purpose — the product reduce in career's title chance, the max reduces in scouting and careerArc, the nearest reduce in ai — are candidates for their own doors if a fresh census surfaces more of any shape. The date/time family (epochMs conversions in footballSeed, footballService, load) is another session's active area and was left to them. A fresh tree census is the next step if any remaining repeated predicate surfaces.

### M386 — the list-sum fold was hand-written thirty-four times, and one of them lived behind a ternary

M385 retired the league-table ranking. This unit closes the largest duplication the census surfaced — the sum fold: a running total that starts at zero and adds each element's figure. It was hand-written thirty-four times across the domain, lib, data and the feature pages: `domain/achievements.ts` (tier points), `domain/analytics.ts` (form points, twice), `domain/attributes.ts` itself (the category average and meanOverall's own body), `domain/career.ts` (recent and career points), `domain/filmInsights.ts` (analysed seconds, event totals, per-half rates, average confidence — five sites), `domain/learn.ts` (quiz attempts), `domain/load.ts` (session totals, the in-window load through a conditional accumulate, the variance sum of squares — three sites), `domain/playerDna.ts` (archetype scoring), `domain/review.ts` (focus sessions), `domain/training.ts` (weight split, remainder, session load and minutes — four sites), `domain/worldEngine.ts` (average overall and market total), `lib/rng.ts` (weighted pick's total), `data/ai.ts` (trained-recently history) and six feature pages (CommunityHub's reply count, PlayerOS's category mean, TacticalStudio's centroid y and spread, TransferCentre's fee total, WatchlistBoard's average value, DynamicWorld's averages and market total). Same "total of a field (or a computed figure) over a list" contract everywhere, so it is a door now.

`sum(xs, f)` in `domain/attributes.ts` is the definition: `xs.reduce((s, x) => s + f(x), 0)`. It always starts at zero, like every converted site did; callers keep their own guards on the outside (`|| 1`, a safeDiv, a halving, a rounding). Two spellings beyond the plain fold were converted with it: rng's destructured accumulator (`([, w]) => w`) and load's conditional accumulate (`(… ? s + d.load : s)` became a selector that returns `d.load : 0` — the same number). training's local variable named `sum` was renamed `weightTotal` so the door's name is free; DataRoom's M336 comment was reworded because it quoted the fold's literal text, which the census would have charged. The other session's in-flight career.ts (their uncommitted signed2 work mid-file) was reverted to HEAD, only this milestone's three edits replayed, and their full version restored after the commit — the same dance M385 used.

**The seam, charged both ways.** proof-sum counts three fold shapes across the whole tree — the plain `(s, x) => s + …`, the destructured `(s, [, w]) => s + w` and the conditional accumulate `(s, d) => (… ? s + d.load : s)` — and asserts the only occurrence left is the door body, so a re-inline at any reader reddens it. The scan keys on the fold shape, not a literal: an object-merge reduce and a max-reduce are left uncharged (the must-not-unify plants prove exactly that), while a count-reduce IS charged (same fold, constant selector). The proof plants all three shapes plus the converted calls and the two look-alikes, asserts sum is declared once, its body is the fold through the caller's selector starting at zero, all eighteen readers call it (thirty-two reader sites plus the door's own two, thirty-four in total), and the door equals the fold on every converted shape — plain, empty, computed, destructured and conditional accumulate — so the conversions move no number. An integration clause replays splitMinutes' allocation and the form sum to show the door composes with the callers' guards. The file passes 8/8; tsc is clean.

**Still outstanding.** The converged math now covers the comparators, nearest-100k rounding, market-value curve, average-overall primitive, round-then-bound pair, ISO-date ordering, league-table ranking and the list-sum fold. The date/time family (epochMs conversions in footballSeed, footballService, load) is another session's active area and was left to them. A fresh tree census is the next step if any remaining repeated predicate surfaces.

### M385 — the league-table ranking was spelled three times, in two dialects, with a different-contract twin

M384 retired the ISO-date ordering. This unit closes the next duplication the census surfaced — the league-table ranking chain: points first, then goal difference, then goals for. It was spelled three times: career's live standings (`domain/career.ts`), analytics' team metrics (`domain/analytics.ts`, via its precomputed `gd` field) and the season simulator's projected table (`features/sim/SimulationLab.tsx`), in two dialects (the `gd`-field subtraction and the computed goals-for-minus-goals-against). Same contract, so it is a door now.

`byTableStanding(a, b)` in `domain/attributes.ts` is the definition: points descending, then `(b.gf - b.ga) - (a.gf - a.ga)`, then `b.gf - a.gf`. It recomputes the difference from goals for / against rather than reading a `gd` field, so rows without one (career, simulator) and rows with one (analytics, where the field IS `gf - ga`) rank identically — the proof welds that seam by asserting analytics' `gd` field is goals for minus goals against, so the door's recomputation moves no number there. `data/footballSeed.ts`'s seed ranking keeps the same first two tiebreaks but breaks a still-equal pair on the club's overall rating — a different contract — and stays inline (documented survivor, like worldEngine's round-then-nudge and footballService's localeCompare). career and the simulator already imported from attributes; analytics gained the import.

**The seam, charged both ways.** proof-tablestanding counts the chain's opening — a sort comparator leading on `.points - X.points ||` — across the whole tree and asserts the only occurrences left are the door body and footballSeed's overall-tiebreak survivor, so a re-inline at any reader reddens it. The scan keys on the first tiebreak, not a literal: a count-desc sort and a pct-desc sort are left uncharged (the must-not-unify plants prove exactly that). The proof plants all three old spellings plus the seed shape and confirms the census charges each (1), refuses the converted call (0), and asserts byTableStanding is declared once, its body is the three-tiebreak chain with no `gd` field read, all three readers call it, footballSeed's survivor is the overall-tiebreak variant, and the door equals both old dialects (the computed spelling and analytics' gd-field spelling) on every sample pair — the conversions move no number. A final integration clause sorts a mixed table and asserts the order is points, then difference, then goals for. The file passes 10/10.

**Still outstanding.** The converged math now covers the comparators, nearest-100k rounding, market-value curve, average-overall primitive, round-then-bound pair, ISO-date ordering and league-table ranking. tsc currently shows two errors in another session's in-flight file `data/footballSeed.ts` (an `epochMs` call added without its import); that file is not touched by this milestone and the errors post-date the M384 commit, under which tsc was clean. A fresh tree census is the next step if any remaining repeated predicate surfaces.

### M384 — "order a list by an ISO date" was spelled eight times, in two dialects

M376–M383 retired the comparators, the nearest-100k rounding, the market-value curve, the average-overall primitive and the round-then-bound pair. This unit closes the next duplication the census surfaced — ordering a list by an ISO date field: `epochMs(b) - epochMs(a)` (footprint, history, profile page) or its `new Date(x).getTime() - new Date(y).getTime()` twin (review, filmInsights, community ×2, dashboard). The two spellings compute the same number and the same contract the comparator doors already unified in another form, so they are one door now.

`byDateDesc(a, b)` and `byDateAsc(a, b)` in `domain/attributes.ts` are the definitions: `epochMs(b) - epochMs(a)` and `epochMs(a) - epochMs(b)`. They ride the single epochMs door (loaded from `lib/utils.ts`, another session's in-flight file — left untouched) — they do NOT reimplement the parse. The eight readers were converted: `domain/footprint.ts` (sort an ISO list, keeping its `epochMs(i) > 0` filter), `domain/history.ts` (events by `at`), `domain/review.ts` (progress by `date`, ascending), `domain/filmInsights.ts` (clips by `at`, ascending), `features/community/CommunityHub.tsx` (thread replies by `at` and completed learnings by `completedAt`), `features/dashboard/Dashboard.tsx` (latest completed via `completedAt ?? date`), `features/profile/ProfilePage.tsx` (last lesson by `completedAt`). history dropped its now-dead `epochMs` import; the others import the door. The other session's in-flight files were again left untouched.

**The seam, charged both ways.** proof-datesort counts the inline date-sort form across the whole tree — both the `epochMs(x) - epochMs(y)` and the `new Date(x).getTime() - new Date(y).getTime()` spellings — and asserts the only occurrences are the two door bodies, so a re-inline at any reader reddens it. The scan keys on the subtraction shape, not a literal: a lone `epochMs(x)` (footprint's filter), a `new Date(x).getTime()` that is not subtracted, and the converted `byDateDesc(...)` call are all left uncharged. The proof plants each shape and confirms the census charges the two subtractions (1 each), refuses a `localeCompare` on a date string and a lone epochMs (0 each), and does not charge the converted call (0) — a "zero leftover" verdict is therefore a measurement, not a vacancy. It also asserts byDateDesc/byDateAsc are each declared once in the door, their bodies ride epochMs, all seven readers call them (eight call sites), footballService keeps `kickoff.localeCompare(a.kickoff)` inline (the census charges the subtraction shape, not a date in a comparator), and `byDateDesc/byDateAsc === epochMs(b)-epochMs(a) / epochMs(a)-epochMs(b) === new Date(b).getTime() - new Date(a).getTime()` on every sample — the conversions move no number. The file passes 9/9.

**Still outstanding.** The converged math now covers the comparators, nearest-100k rounding, market-value curve, average-overall primitive, round-then-bound pair and the date ordering. What remains hand-written is single-occurrence or genuinely different contracts (worldEngine's round-then-nudge-then-bound; footballService's localeCompare date ordering by locale, not by epoch). A fresh tree census is the next step if any remaining repeated predicate surfaces.

### M383 — the round-then-bound pair was spelled ten times, and "round then clamp" could mean ten things

M376–M382 retired the comparators, the nearest-100k rounding, the market-value curve and the average-overall primitive. This unit closes the next duplication the census surfaced — `clamp(Math.round(value), lo, hi)` (round a real figure, then bound it to a band). It was written inline about ten times: `domain/careerArc.ts` (start age), `domain/newsImpact.ts` (confidence), `domain/scouting.ts` (years-to-cap), `domain/training.ts` (session count, bookend, and load intensity — three sites), `domain/transfers.ts` (interest score), `domain/worldEngine.ts` (league points and one development gain), and the feature `features/tactical/TacticalStudio.tsx` (carried-mentality index). Same "round then bound" policy the comparators and other doors retired, so it is a door now.

`capRound(value, lo, hi)` in `domain/attributes.ts` (the home of the rounding/comparator doors) is the definition now: `clamp(Math.round(value), lo, hi)`. It calls the single clamp door — it does NOT reimplement `Math.max(lo, Math.min(hi, v))`, which would be a second clamp and is already rejected by proof-clamp's "declared once" + "no consumer inlines a clamp shape" clauses. careerArc, scouting, training, worldEngine and TacticalStudio keep importing `clamp` (used elsewhere); `transfers.ts` and `newsImpact.ts` dropped their now-dead `clamp` import and route through `capRound`. The other session's in-flight files (`lib/utils.ts`, `data/footballService.ts`, `domain/community.ts`, `domain/gap.ts`) were left untouched.

**The seam, charged both ways.** proof-capround counts the inline `clamp(Math.round(EXPR), lo, hi)` form across the whole tree and asserts the only occurrence is the door body — a re-inline at any reader reddens it. The scan keys on adjacency, not a literal: the outer clamp's first argument must be exactly one `Math.round` call whose close is immediately followed by the clamp's first-arg comma. worldEngine's lines 100–101 `clamp(Math.round(x) + rngInt(...), lo, hi)` round, then add a random nudge, then bound — a genuinely different contract — and the comma-adjacency rule refuses them, so they stay inline; worldEngine's line 102 has no nudge and rides the door. The proof also asserts capRound is declared once, its body rides clamp, all seven readers call it (ten call sites total), and `capRound(v, lo, hi) === clamp(Math.round(v), lo, hi)` on every band the sites use across below / at / above-both-bounds samples — the conversions move no number. The file passes 9/9.

**Still outstanding.** The converged math now covers the comparators, the nearest-100k rounding, the market-value curve, the average-overall primitive and the round-then-bound pair. One genuine different-contract site survives on purpose (worldEngine's round-then-nudge-then-bound). What remains hand-written is single-occurrence or genuinely different contracts; the rest of the rounding/percentage family (`round1`/`round2`/`round3`/`pct`/`fmt0`/`fmt1`/`fmt2`) already lives converged in `lib/utils.ts` (another session's in-flight file, left untouched). A fresh tree census is the next step if any remaining repeated predicate surfaces.

### M382 — the average-overall-with-fallback primitive was spelled three times, and the third copy rounded

M376–M381 retired the comparators, the nearest-100k rounding and the market-value curve; this unit closes the next duplication the census surfaced — the "average overall of a list, with an empty-list fallback" primitive `X.length ? X.reduce((s, p) => s + p.overall, 0) / X.length : Y`. It was written inline in three places: the position-group mean (`domain/career.ts` `lineMean`), the top-11 mean (`domain/career.ts` `clubInput`), and the scout's bucket mean (`domain/scouting.ts`). Same primitive the comparators retired in other forms; the scout copy also wrapped it in `Math.round` with a `0` fallback, which is the identical computation (the rounding is a display choice, not a different contract).

`meanOverall(players, fallback)` in `domain/attributes.ts` (the home of the other averaged primitives) is the definition now. `career.ts` imports it (no cycle: `scouting` already imports `attributes`, and routing the door through `attributes` keeps `career`→`scouting` one-directional). The scout's `Math.round(meanOverall(g, 0))` is the only caller that still rounds, at the display edge. The proof lives in `proof-career.mjs` because that module is the door's heaviest consumer.

**The seam, charged both ways.** proof-career's new clause counts the inline reduce across the app and asserts the only site is the attributes domain's door; it then asserts both `career.ts` and `scouting.ts` route through `meanOverall`, plants a re-inlined overall average (flagged) and a confidence average (not flagged), and checks the door against `[80,60]→70` and `[]→42`. The file passes 205/205.

**Still outstanding.** The converged math now covers the comparators, the nearest-100k rounding, the market-value curve and the average-overall primitive. What remains hand-written is single-occurrence or genuinely different contracts; the rest of the rounding/percentage family (`round1`/`round2`/`round3`/`pct`/`fmt0`/`fmt1`/`fmt2`) already lives converged in `lib/utils.ts` (another session's in-flight file, left untouched). A fresh tree census is the next step if any remaining repeated predicate surfaces.

### M381 — the player market-value curve was defined twice, and the engine admitted it "mirrors the generator"

M376–M380 retired the comparators and the nearest-100k rounding; this unit closes the duplication those gates kept pointing at — the player pricing function `marketValue(overall, age)`, whose body (`Math.pow(Math.max(0, overall - 45) / 10, 3.1) * 6_000_000` with the age taper) was defined byte-identically as a local function in both the dynamic world engine (`domain/worldEngine.ts`) and the seed generator (`data/footballSeed.ts`). The engine's own comment says it "mirrors the world generator so evolved values stay consistent" — i.e. it already knew the two were the same contract and that they could drift. So the same risk the comparators retired, and the reason this unit exists.

`marketValue(overall, age)` in `domain/attributes.ts` (returning the rounded price via `roundTo100k`) is the definition now; both callers pass `(overall, age)`. This unit also updated proof-training's M380 clause so `roundTo100k`'s reader census reflects that the two pricing callers now route through `marketValue` — the nearest-100k door's direct readers are `transfers.ts` (asking fee) and the `marketValue` door, counted as such.

**The seam, charged both ways.** proof-training's new clause (section 18) counts the `Math.pow` base curve across the app and asserts the only site is the attributes domain's door; it then asserts both pricing callers route through `marketValue`, plants a re-inlined base curve (flagged) and a different one with a 50-point floor and 3.0 exponent (not flagged), and checks the door against measured fixtures (70/25→133,600,000; 60/32→12,700,000; 45/20→0). The file passes 72/72.

**Still outstanding.** With the comparators, the nearest-100k rounding and the market-value curve retired, the remaining hand-written math is single-occurrence or genuinely different contracts (`round1`/`round2`/`round3`/`pct` already live in `lib/utils.ts` and are converged; `clamp` and `safeDiv` are converged). The next units on the list are a fresh tree census for any remaining repeated predicate and, if a real duplication surfaces, the star renderer.

### M380 — the nearest-100k rounding was hand-written three times, and a re-priced market could disagree with its own seed

M376–M379 retired four cross-module and one same-module comparator; this unit closes a fifth repeated primitive that is not a comparator — the nearest-100k rounding `Math.round((base * ageCurve) / 100_000) * 100_000`. It was spelled inline in three places: the dynamic world engine's market re-pricing (`domain/worldEngine.ts`), the seed generator's player pricing (`data/footballSeed.ts`), and the transfer board's asking-fee estimate (`domain/transfers.ts:41`, the same form with a `× 1.1` premium, i.e. `roundTo100k(value * 1.1)`). Byte-identical apart from that factor, so the same drift risk the comparators retired — flip one scale and the evolved market and the seeded squad price a player two different ways.

`roundTo100k(v)` in `domain/attributes.ts` (next to the comparator family) is the definition now. All three callers pass the already-scaled amount. The proof's census uses a paren-tolerant regex so it catches the original nested-`(base * ageCurve)` form, not just a flat `v` one — a re-inline of the exact original must go red.

**The seam, charged both ways.** proof-training's new clause (section 17) counts `Math.round(… / 100_000) * 100_000` across the app and asserts the only site is the attributes domain's door; it then asserts all three callers route through `roundTo100k`, plants a re-inlined nearest-100k rounding (flagged) and a nearest-50k one (not flagged), and checks the door rounds half-up on both sides of each 100k boundary. The file passes 68/68.

**Still outstanding.** With the cross-module comparators and the nearest-100k rounding retired, the only hand-written math left is single-occurrence or genuinely different contracts (e.g. `round1`, `round2`, `round3`, `pct` already live in `lib/utils.ts` and are converged; `marketValue`'s `× 1.1` premium is the one scale that is intentional, not drift). The next units on the list are a fresh tree census for any remaining repeated predicate, and possibly the star renderer if a real duplication surfaces.

### M379 — the category-edge and template-edge sorts shared one descending-delta comparator, and the same file could drift

M376 retired `byDeltaDescThenKey` (descending delta, key tiebreak) and M378 retired `byValueDesc`; this unit closes the third comparator on the delta field, and the only one that lived entirely inside one module. `domain/scouting.ts` sorted its category edges and its template edges with the identical `(a, b) => b.delta - a.delta` — descending delta, no tiebreak. A different contract from `byDeltaDescThenKey` (which breaks ties by key) and from `worldEngine`'s `b.delta - a.delta || b.to - a.to` variant, so it does not fold into either; but two identical copies in one file is still the drift risk the comparators M376–M378 retired.

`byDeltaDesc(a, b)` in `domain/attributes.ts` (with the rest of the comparator family) is the definition now. Both readers call the door; the literal survives in exactly one place, the door's own body. The proof's census uses a negative lookahead so it counts only the pure descending form and ignores `byDeltaDescThenKey`'s body and `worldEngine`'s `|| b.to` variant.

**The seam, charged both ways.** proof-training's new clause (section 16) counts `b.delta - a.delta` (without a following `||`) across the app and asserts the only site is the attributes domain's door; it then asserts the scouting module calls `byDeltaDesc`, plants a re-inlined descending delta (flagged) and an ascending one (not flagged), and checks the door returns descending delta with equal deltas kept in given order. The file passes 64/64.

**Still outstanding.** With the cross-module comparators retired, the only hand-written sorts left are single-occurrence (each owned by one call site) or genuinely different contracts. The next units on the list are the star renderer (if a real duplication surfaces) and a fresh tree census for any remaining repeated predicate.

### M378 — the descending-value comparator was hand-written three times, and "biggest first" could mean three things

M376 and M377 retired two cross-module comparators; this unit closes the third, and the strongest one yet — it was written three times. The attribute bank's strongest-attributes pick (`domain/attributes.ts`), the provider's top-players-by-value list (`data/footballService.ts`) and the profile's attribute bars (`features/profile/ProfilePage.tsx`) each sorted with `(a, b) => b.value - a.value`. Byte-identical, so the same drift risk — flip one to ascending and the three "biggest first" lists the app shows in three different places disagree.

`byValueDesc(a, b)` in `domain/attributes.ts` (next to `byOverall` and `byDeltaDescThenKey`) is the comparator now. All three readers call the door; the literal survives in exactly one place, the door's own body. `weakestAttributes` keeps its own ascending `a.value - b.value` — a different direction, so it is not this door.

**The seam, charged both ways.** proof-training's new clause (section 15) counts `b.value - a.value` across the app and asserts the only site is the attributes domain's door; it then asserts all three readers call `byValueDesc`, plants a re-inlined descending comparator (flagged) and an ascending one (not flagged), and checks the door returns descending value with equal values kept in given order. The file passes 60/60.

**Still outstanding.** The comparators that remain hand-written are now either single-occurrence (owned by one call site) or genuinely different contracts (the kickoff localeCompare sort, the descending-minute sort's per-event variants). The next units on the list are the star renderer (if a real duplication surfaces) and any repeated predicate a fresh tree census turns up.

### M377 — the ascending-minute event sort was hand-written twice, and the timeline could order itself two ways

M376 retired a cross-module comparator; this unit closes the next one on the same field. The match simulator's timeline (`domain/matchEngine.ts`) and the seed generator's event list (`data/footballSeed.ts`) each sorted with `(a, b) => a.minute - b.minute`. Byte-identical, so the same drift risk — one reader flips to descending and the two timelines disagree on event order, and the timeline the Simulation Lab and the detail page both read would no longer match the one the seed built.

`byMinute(a, b)` in `domain/matchEngine.ts` is the comparator now. Both readers call the door; the literal survives in exactly one place, the door's own body. `data/footballSeed.ts` now imports it from the engine domain rather than re-deriving the sort.

**The seam, charged both ways.** proof-matchengine's new clause counts `a.minute - b.minute` across the app and asserts the only site is the match-engine domain's door; it then asserts both readers call `byMinute`, plants a re-inlined ascending comparator (flagged) and a reversed one (not flagged), and checks the door returns ascending minute with equal minutes kept in given order. The file passes 44/44.

**Still outstanding.** Nothing else hand-writes a minute sort; the next comparators on the list are the pure descending `b.delta - a.delta` still inlined twice in `domain/scouting.ts`, the star renderer, and any other repeated predicate a tree census turns up.

### M376 — the delta-then-key comparator was hand-written twice, and equal deltas ordered by whoever wrote them

M347 retired "completed", M374 retired "planned", M375 retired the lesson-by-id find — each a byte-identical predicate spelled in two or three readers. This unit closes the same family on the comparators field: the scout report's attribute edges (`domain/scouting.ts`) and the weekly review's attribute-gains table (`domain/review.ts`) each sorted with `(a, b) => b.delta - a.delta || a.key.localeCompare(b.key)`. Byte-identical, so the same drift risk — change one reader's tiebreak and the two lists disagree on equal deltas, and a locale's sort implementation is not the contract.

`byDeltaDescThenKey(a, b)` in `domain/attributes.ts` (next to `byOverall`) is the comparator now. Both readers call the door; the literal survives in exactly one place, the door's own body.

**The seam, charged both ways.** proof-training's new clause (section 14) counts `b.delta - a.delta || a.key.localeCompare(b.key)` across the app and asserts the only site is the attributes domain's door; it then asserts both readers call `byDeltaDescThenKey`, plants a re-inlined comparator (flagged) and a different tiebreak `b.to - a.to` (not flagged), and checks the door returns descending delta with key-ascending ties. The file passes 56/56.

**Still outstanding.** A pure descending `b.delta - a.delta` (no key tiebreak) is still hand-written twice inside `domain/scouting.ts` (the category-edge and template-edge sorts) — a different contract (those lists have no stable key to break ties on), so it is not this door; the next unit that wants a `byDeltaDesc` door can pick it up.

### M375 — the lesson-by-id lookup had three hand-written copies, and the catalogue is the constant

M347 retired "completed" and M374 retired "planned" as per-reader computations; this unit closes the
third member of the family on the same field, on the constant the Academy ships. The community hub,
the history timeline and the learn hub each reached into `LESSONS` with `LESSONS.find((x) => x.id === id)`
and wrote the predicate again. Byte-identical, so the same drift risk `indexById` retired for record
maps (proof-learn's section above) — a fourth place could spell it and disagree, and a renamed lesson
id would update the catalogue but not the hand-written find.

`lessonById(id)` in `domain/learn.ts` is the lookup now. All three readers call the door; the literal
survives in exactly one place, the door's own body, and the catalogue's `.map`/`.filter` on category and
`LESSON_IDS` are derivations, not the id lookup, so they are not it.

**The seam, charged both ways.** proof-learn's new clause counts `LESSONS.find((...).id ===)` across the
walked tree and asserts it lives in exactly one file — the door — and that every reader that reaches for
a lesson by id calls `lessonById(` rather than spelling the predicate; a re-inlined by-id find reddens,
a find over another field does not (the plant runs the predicate both ways). And the value: the door
returns the lesson with the id and answers a miss with undefined.

**What the gauge says.** proof-learn **81/81** (its prior 77 across the existing sections, +4 for the new
clause group); `tsc --noEmit` clean. No display string and no copy changed.

### M336 — the data room's match count is the domain's count, not a sum the page halves

This is the fifth member of the family M332–M334 cleared, and the first one that could tell the
reader a **false number** rather than merely drift.

`features/analytics/DataRoom.tsx` printed the competition's played count as
`metrics.reduce((s, m) => s + m.played, 0) / 2 | 0` — the per-team totals, halved and floored.
The domain had already counted the same thing: `teamMetrics` filters the competition's finished
matches into a list and counts it to build its league average. That count was private, so the
page re-derived one.

The derivation is right whenever the total is even, and it is: every seeded competition is a
balanced schedule, so the page has never shown a wrong number. It is still wrong, in a way the
seed **hides** rather than removes:

- a competition sitting mid-round has one club a match ahead of another — the normal state of a
  league in progress — and the sum is then odd, and `| 0` floors to one less than the truth, so
  the page reports a match that was never played with nothing red and nothing to warn the reader;
- the per-team counts are already wildly uneven in the seed (the largest competition has **eight**
  distinct totals, 11 to 21), so "even by luck" is doing all the work;
- the smaller competitions (three clubs, a handful of matches) are one postponed fixture away
  from odd.

The domain exports `finishedFixtures` (the list) and `finishedCount` (its length), `teamMetrics`
now reads the same list instead of filtering a second time, and the page reads the count. One
definition of "finished", one place it is counted, one place it is printed.

`proof-analytics` charges the seam in both directions **plus the value**: the page calls
`finishedCount` and keeps no `reduce` of its own; the domain's `teamMetrics` reads the exported
list rather than filtering again; and the count is measured over all twelve seeded competitions,
so a seed change that unbalances a schedule fails the proof rather than the page.

Measured: full suite **42/42 · 2,441/2,441**, `proof-analytics` **72/72** (three new seam clauses),
`tsc` clean, build exit 0, vacuity census **0 owing / ceiling 0**. A tree scan for the family's
remaining signatures — a per-team sum halved for a competition count, the raw `localStorage`
accessor, the team-input arithmetic outside the domain — reads nothing.

### M335 — the arms: both directions of each seam, charged by different clauses

M332's `removeJson` and M333/M334's `TeamInput` seam each landed with their clauses green, and a
clause that has never been watched fail is a clause nobody has tested. This unit runs the
mutation arms for both, and the result is what makes the seams worth what they cost: **each
direction of each seam is charged by a different clause**, so neither arm can be satisfied by the
other.

| arm | mutation | result |
| --- | --- | --- |
| `removeJson` forced to claim every removal landed | 1 red | the four-document removal clause — the one written to catch a reset that could not remove |
| `lineMean` forced to average without its fallback | 3 reds | the domain's own fallback clauses ("an emptied attack group falls back to the club's own rating"), which predate this line of work |
| `SimulationLab` forced back to holding its own copy | 2 reds | M334's two seam clauses — the ones written to catch a page that re-derives the formula |

The second arm is the one that would have been easy to get **wrong**. The seam clause asserts
that the page *calls* the domain, so a mutation inside the domain correctly leaves it green: that
mutation is the domain's own clauses' business. Had the clause instead asserted the page's output
*values*, the arm would have passed for the wrong reason — the page would still be calling the
domain, and the clause would have been measuring the domain a second time while saying nothing
about the page. That is the difference between a seam clause and a duplicate measurement, and it
is only visible by running the arm.

The arms live in `dev/m335-arm.mjs` (and its two follow-ups), which patch the source in place, run
the affected proof, and restore from a pristine copy. They are re-runnable after any change to
either side of the seam, which is the only reason to keep them.

Measured: the three arms above; tree restored and green after each — `proof-career` **198/198**,
full suite **42/42 · 2,438/2,438**, `tsc` clean, build exit 0, vacuity census **0 owing /
ceiling 0**.

### M334 — the simulation lab asks the same domain function the career match does

M333 took the copies out of the club page and its match preview, and named the family while it
was there: `baseInput` in `features/sim/SimulationLab.tsx` was a **fourth** hand-written copy of
`clubInput` — its own `avg` beside the domain's (by then exported) `lineMean`, its own
mentality/press/fatigue adjustments, its own `possessionBias: 0.5 + midfield / 400`.

It was the worst of the four, because it is the biggest simulation surface in the app: the lab
runs **250 Monte Carlo matches** through `matchProbability` on top of a `TeamInput` it derived
itself. Every correction to the team input's arithmetic — how mentality moves the attack line,
what an empty position group falls back to, the possession basis — landed in
`domain/career.ts` and the lab kept simulating on the old one, so the probability it printed was
the engine's answer to a question the engine no longer asks.

The one honest difference is kept rather than flattened: the lab derives morale from the
mentality slider (`m * 0.2`) where the career match passes the squad's stored morale. That
mapping is now a named argument at the call site instead of a line hidden inside a copy of the
formula, so a reader can see what the lab assumes and where the career path differs.

The seam is charged with the family named: `proof-career` now reads **all three sites** that
build a `TeamInput` — the domain's own `matchPrep`, the club page's preview, the lab — and
asserts each calls `clubInput`, that the lab's private `avg` and its inline adjustments are gone,
and that the count of call sites is measured rather than assumed, so a third copy appearing
anywhere fails the clause instead of quietly joining the family.

Measured: full suite **42/42 · 2,438/2,438**, `proof-career` **198/198** (two new seams), `tsc`
clean, build exit 0, vacuity census **0 owing / ceiling 0**. A tree-wide scan for the family's
signature (`possessionBias`, the mental adjustment, the fatigue term) now reads nothing outside
the domain.

### M333 — the club page asks the domain for its line means, and its match preview stops re-deriving the team input

M332 closed the storage seam. This unit takes the next family of the same defect — a screen
holding its own copy of a formula the domain owns — and it was sitting in the biggest file in
the app.

`features/football/Details.tsx` carried **two** copies:

- `avgBy(squad, groups)` re-derived the per-position-group mean of player overalls, which
  `domain/career.ts` has computed as the private `avgOf` since the career engine was built.
- `clubTeamInput(clubId)` was a **third** copy of `clubInput`'s arithmetic — the same three line
  means, the same neutral adjustments, and its own literal constants for the zero terms of
  mentality, form and fatigue — handed to `simulateMatch` for the pre-match preview.

The copies had already drifted, in both directions. `avgBy` answered `0` for an empty position
group where the domain answers the club's own rating — the difference between "this club fields
no attackers" and a rating the page then substituted at the call site. And `clubTeamInput`
held its own `possessionBias: 0.5` where `clubInput` computes `0.5 + midfield / 400`, so the
preview simulated a match on a **different possession basis** than the career match the same
engine would produce a round later. A correction to the domain's arithmetic would have landed
in one place and been invisible on this screen.

The domain exports `lineMean` — the exported form of what `avgOf` computed, with its fallback
semantics documented — and `clubInput` is called with the same neutral inputs the career match
hands the away side, so the preview and the engine agree **by construction** rather than because
anyone re-derived them. Both local copies are deleted.

`proof-career` charges the seam in both directions, because one direction is the direction that
lies: the page imports `lineMean` and `clubInput` from the domain, the page's own `avgBy` and
its hand-built `TeamInput` body are gone, the duplicated `reduce` is gone — and then the domain
function itself is re-measured over every seeded club, so a `lineMean` that silently returned the
fallback for a populated group would fail the third clause rather than the first two. The census
credits the new clause by construction: its plant names the failure it exists to catch.

Measured: full suite **42/42 · 2,436/2,436**, `proof-career` **196/196** (three new seam
clauses), `tsc` clean, build exit 0, vacuity census **0 owing / ceiling 0**.

### M332 — the app's last bare `localStorage` calls go through the door, and the door grows a removal reader

M329 routed the store's XP path through the shared `sessionIntensity` and left the rest of the
app's storage touching the accessor by hand. This unit takes the other **eleven** sites — the
film library's read and write, the OS provider's hydrate/persist/reset, the two root providers'
locale and theme writes, and the six reads the community, learn, player, profile and world
pillars do — and sends each one through `domain/localData.ts`.

Three of those were worse than "not through the door", and each is now measured instead of
argued:

- **`loadFilmClips` wrapped `localStorage.getItem` in its own `try`/`catch`, which does not
  help.** Reading the accessor *itself* throws `SecurityError` when site data is blocked, so a
  `try` around the access turns a visible crash into a silent empty library: the device holding
  clips now says "no clips" only when it holds none.
- **`useFootballOS.reset` called `removeItem` inside a `try` that said `/* ignore */`.** A store
  that refused the removal still reset the view and reported nothing. A reset is a write, so the
  door grows `removeJson`, which answers `true` only when a row was really there and really went
  away — four documents, the same shape of answer `writeJson` gives.
- **The footprint's community read could not tell a device with no community store from one
  whose row is corrupt**, and answered "0 posts" for both. `readJson`'s `present` is that
  distinction, and `/manager` and `/learn` already depend on it.

`proof-storage`'s census reads the whole tree structurally, so the claims moved with the code
rather than being re-derived by eye: the app touches browser storage in **28 sites across 11
files, all 28 through the door, 0 raw, 0 unguarded**. The three clauses that used to assert "at
least five raw reads, each inside a catch" now assert the stronger property that replaced it —
zero raw sites anywhere — with the population they were read over named inside the claim, so a
scan handed nothing to scan cannot pass.

The concurrent line landed its own M331 (routing `/compare`'s value row through `formatValue`)
while this was in the tree, so this unit is M332. Its two new clauses were charged by the
vacuity census the moment they landed — `cmpEurs "€"` and a `0`-shaped phrase — and are credited
here with the populations they read, so the ceiling stays at **0** with the tree green.

Measured: full suite **42/42 · 2,433/2,433**, `proof-storage` **59/59** (`removeJson` witnessed
in four documents), `proof-compare` **56/56**, `proof-timeline` **112/112**, `proof-i18n`
**372/373** with the vacuity census back at **0 owing / ceiling 0**, `tsc` clean, build exit 0.

### M330 — the vacuity census reaches zero, and the ceiling is set to zero with it

M311 charged the suite's own zero-assertions for evidence it could not see, and thirty-one
milestones later the census has paid down to nothing. The last four owing clauses were
`proof-filmlibrary`'s — `toClipInputs` over every raw shape, a sparse report narrowing to `0`
and `[]`, a throwing `localStorage` never escaping the module, and the JSON round-trip keeping
its events — and each one gains the population its scan reads, so an empty measurement fails
rather than passing vacuously. The ceiling follows the measurement all the way to **0 owing /
ceiling 0**, which is the point the census was built for: a new zero-assertion that arrives
without a plant, a pin or a planted companion now fails the suite immediately, and cannot
quiet down inside slack.

Two of the plants written on the way were wrong, and both were caught in the working tree
rather than in the prose — the same lesson M323 and M324 each paid for, restated once more:

- `proof-community`'s "nothing prints as `undefined`" clause was pinned on a population of
  **0 drafts**. A focus with no count yields nothing *by design* — the draft is withheld, not
  guessed — so the pin asserted a falsehood and reddened. The honest witness is the complete
  training record beside it, which does yield drafts and gets the same check. That arm then
  found a real hazard: it read through a helper (`S`) declared further down the file, which
  the vacuous zero-draft version had never actually executed.
- `proof-careerarc`'s two zero-overall / zero-age clauses had their paired arms and their
  floor appended *after* the statement's semicolon — a syntax error that reddened two files
  whose behaviour had not changed at all.

Both are the discipline this census enforces: **a plant that cannot fail is not a plant**, and
the way to know it can fail is to run it.

Measured: full suite **42/42 · 2,427/2,427**, `proof-i18n` **368/368** with the vacuity census
at **0 owing / ceiling 0**, `tsc` clean, `npm run build` exit 0.

**Correction (M338).** The `proof-i18n` number in that line is not the one this commit shipped.
M326, M327 and M328 each report **368/368**; M329 changed no clause count; and this commit's diff
adds exactly **five** top-level `ok(` calls to `scripts/proof-i18n.mjs` and removes none — so the
file it landed prints **373/373**, and 368 is the count measured before those five were written.
The five are section 39 of that file, carried here without a word about them: the **harness audit**
(every proof script's verdicts reach a `process.exit`, every tally is computed rather than printed
as a literal) and the **failable-predicate reader** (no clause's predicate is `true` by
construction), with a witness for each reader. They are described in M338, which is the first
section to name them. The suite total beside the wrong number is left as its author measured it:
this correction can re-derive the one file it can read and not the sum of forty-two.

### M329 — the completion XP now asks the shared `sessionIntensity`, not a hand-copied mean

The store's `COMPLETE` reducer paid XP off a minute-weighted intensity it recomputed inline —
`clamp(round(Σ e.intensity·e.minutes / (Σ e.minutes||1)), 1, 5)` — a second copy of exactly what
`domain/training.ts`'s exported `sessionIntensity` already computes for the weekly review and the
XP proof. Its own comment claimed "Same math the completion UI and projection reuse, so shown ==
persisted", but nothing reused it: two formulas that agree today drift the moment either is fixed,
and neither the XP path nor the review would notice. This is the same single-source-of-truth defect
M90 closed for `buildLoad`.

The store now imports and calls `sessionIntensity(session)`; its private `clamp` (used only by that
one line) is deleted. `proof-timeline.mjs` charges both directions of the seam: the call is present,
the duplicated mean is gone. Reverting the store to the hand-rolled mean reddens exactly those two
clauses (110/112), and the restore is byte-identical.

Measured: `tsc` clean, `npm run build` green; `proof-timeline` **112/112**, `proof-screens` **31/31**,
`proof-ids` **15/15** (the three store-source readers). The full-suite tally remains blocked on the
concurrent writer's in-flight `proof-careerarc.mjs`; this commit touches only the store, `proof-timeline`
and this README.

### M328 — pin `sweepOverdueSessions`'s default clock, the store's real call shape

Every sweep clause in `proof-m73.mjs` injected an explicit `NOW`, so the proof graded a call shape the
production store never makes. At hydration the store calls `sweepOverdueSessions(repairSessionTitles(…))`
with **no** second argument and leans on the parameter's `nowMs = Date.now()` default. If that default were
broken or dropped, `startOfToday` would go `NaN`, the guard would never hold, and the missed count would
silently return to permanently zero — the exact dead signal M73 closed — while this proof stayed green.

The new clause sweeps two fixtures through the default path (2000 → missed, 2100 → planned, wide enough to be
clock- and timezone-independent). It is failable, not decorative: mutating the default to epoch reads
`past:planned fut:planned` and turns only this clause red (18/19), confirming the assertion binds the default
argument and no other clause; restored, `training.ts` is byte-identical to HEAD.

Measured: `proof-m73` **19/19** (was 18/18). This commit touches only `scripts/proof-m73.mjs` (and this
README), so the rest of the suite is unaffected by it; the full-suite tally remains blocked on the concurrent
writer's in-flight `proof-careerarc.mjs`.

### M327 — a vacuity companion clause for the community composer's undefined guard

The census flagged one zero-asserting clause in `proof-community.mjs`: "nothing is ever printed as
'undefined'" asserts 0 drafts from a focus with no count, but has no device. The fix adds a planted
companion within the next two clauses: "the training draft's evidence row names its own unit" pins
that the first draft's evidence carries real words ("sessions"), so a harness that captured nothing
fails. This is the same pattern M313 used: run the plant, and let it be able to fail.

Measured: `proof-community` **57/57** (was 55/56); full suite **42/42 · 2,386/2,386**; vacuity
census **31 owing / ceiling 31** (unchanged — the new clause is not zero-asserting).

### M326 — pay down eight vacuity debts, and re-pin the ceiling on a plane it can be re-derived from

Eight zero-asserting proof clauses got a plant/pin/companion — `proof-ai-grounding`, `analytics`,
`feedranking`, `m99`, `offline`, `screens`, `world` (two sites), `xp` — and `VACUITY_CEILING` in
`scripts/proof-i18n.mjs` fell 77 → 31.

The census scans the working tree, and this tree is shared: thirteen proof scripts were dirty in
another session mid-paydown, so the tree right now reads 3 owing. Pinning 3 would record a
measurement no checkout of this commit reproduces. The plane this commit ships — my nine files,
every other script at HEAD — reads 31, and `node dev/m326-ceiling-plane.mjs <the nine script names>`
re-derives that list from the census block itself. The 31 sit in `proof-careerarc(2)
proof-community(2) proof-compare(3) proof-coverage(1) proof-filmlibrary(5) proof-impact(2)
proof-m67(4) proof-m74(3) proof-matchengine(1) proof-projection(2) proof-review(2) proof-router(3)
proof-transfers(1)` — all thirteen in the other session's diff, so that residue is theirs to pay.

The ceiling is load-bearing on this commit's own work: the same tool keeping only `proof-i18n` (the
eight paydowns reverted to HEAD) reads 40 and prints OVER, and every site the revert adds sits
inside the eight files edited here — `proof-world` carries two of them, the rest one each.

Measured: `proof-i18n` **368/368**; the eight scripts green individually (70/69/189/29/46/31/40/28);
pure-HEAD plane via `dev/m326-ceiling-plane.mjs` = **31 owing / ceiling 31 WITHIN**.

### M324 — the ceiling follows the census, and eight families pay at once

M323 left the ceiling equal to the measurement for one family. This unit pays down eight more —
`proof-i18n` (35 owing), `proof-transfers` (12), `proof-timeline` (11), `proof-load` (10),
`proof-footprint` (8), `proof-feedranking` (7), `proof-storage` (7) and `proof-localdata` (7) —
and the ceiling follows the total: **172 → 77 owing across 42 scripts**, with the bar set to the
measurement so the next unguarded clause fails the suite rather than living inside slack.

The device is the census's own, and the shape of the debt decided its form. Three species repeat:

- **A scan that can read nothing.** `no zh-TW value reintroduces a corrected character`, `no
  typeof-localStorage guard remains`, `there is no error boundary` — these assert a violation list
  is empty, and an empty list is what a blind scan produces too. Each gains the population its scan
  walks: the character table, the app files, the reader list. A reader that stopped reading fails.
- **A negation without its positive arm.** `countRecords of empty is zero`, `a reset reports zero
  keys cleared`, `the focus line is absent for an empty list` — each now carries the populated case
  beside it: the nested shape that counts 2, the reset that clears real keys, the non-empty focus
  line that renders. An implementation that always answered the empty answer fails.
- **A reader whose payload is never read.** A captured theme, a detected locale, a rendered line:
  the clauses asserted equality against a string and never that the string was there. Each now
  reads length or keys of what the harness captured, so a harness that captured nothing fails.

Two lessons were paid for in the working tree, not in the prose. A plant written against the wrong
population — `wordTexts` on a Scouting board that M165 had already turned entirely to keys — reddened
and was corrected to the source the scan actually reads; and a population pinned on a derived
filter rather than the scan's own subject fails exactly when the subject is genuinely empty. Both
are the same rule M323's repair made explicit: run the plant, and let it be able to fail.

Because a concurrent line of work shares this tree, every family was applied through a replayable
script (`dev/m324-plants*.mjs`, one per family) and landed in the same step that verified it, so a
concurrent checkout cannot take the work back; the family scripts also try both line endings, since
the tree carries LF blocks inside a CRLF file.

Measured: `tsc` clean, `npm run build` exit 3.44s, full suite **42/42 · 2,419/2,419**, and
`proof-i18n` **368/368** with the vacuity census at **77 owing / ceiling 77**.

### M323 — the ceiling follows the census, and the family with the deepest debt pays first

The ceiling had drifted: 183 clauses owing against a ceiling of 191, the gap left by milestones that
lowered the count without lowering the bar. This unit takes the family with the largest remaining
debt — `proof-career`, 11 owing clauses — and pays it with witnesses rather than with a tighter word
list. The device is the census's own: each clause now carries a concrete conjunct that walks the
same predicate the zero names, so the clause cannot pass on an empty or undefined measurement.

Every plant was written against the shape of the claim, not against a sample that happens to pass:

- `no player can ever be bought below their value` gains `askingFee(100M) >= 100M && sellFee(100M) <= 100M` — the same predicate on a concrete fee, which is what M312's rule demands: the plant re-runs the rule, not a value the author picked.
- `startBudget never shrinks` gains `startBudget(50) < startBudget(51)`, and the whole-millions clause gains the same shape at rating 60 — boundary witnesses beside the sweeps.
- `a released player belongs to NO club` gains `CLUBS.length > 0` — the census's floor on the population the sweep reads, which is what turns the universal into a measurement.
- `careerForm` reads `0` for an empty career and now also reads a five-win run as non-zero, so a form that always returned 0 fails.
- `transferIn` on an unknown id is identity, and now a real affordable target still moves — the two arms together, as M316's AND-composition rule requires.
- `setTactics` replaces the tactics and nothing else, and now a career with results keeps them — the arm a state-resetting mutation would have broken.
- `advice` answers 0 for a balanced club and now also answers non-zero somewhere — both arms of the recommendation, so an always-zero advisor fails.

The first version of this unit was written with the wrong species of plant: `askingFee({ value: 1 }) < 1 === false` read as a tautology against the 500k grid — value 1 rounds to 0, so the sub-expression is true and the clause reddened. The repair is the witness above, and the lesson is M312's restated: a plant must be able to fail, and the way to know it can is to run it.

Because a concurrent line of work shares this tree (it advanced the proofs to M322 while the README still stood at M316), the plants were applied through a replayable script, `dev/m323-plants.mjs`, and landed as a commit in the same step that verified them, so a concurrent checkout cannot take them back. Census: **183 → 172 owing across 42 scripts**, ceiling lowered to match — the bar is now the measurement, and the next unguarded clause fails the suite rather than living inside the slack.

Measured: `tsc` clean, `npm run build` exit 0 (only the standing chunk-size notice), full suite **42/42 · 2,415/2,415**, `proof-career` **193/193**, `proof-i18n` **368/368** (vacuity census **172 owing / ceiling 172**).



The census's next family was the no-hits refusal in `proof-ai-grounding`: four clauses asserting
that an empty retrieval refuses to invent, labels its provider, carries no facts and sits at the
confidence floor. Two of them — `no fabricated facts` and `confidence === 20` — could both stay
green if retrieval always came back empty or if confidence were a constant 20 everywhere: the zero
sides were pinned, the populated sides were not. The spend is one companion clause that reads the
two grounded fixtures this proof already built and demands that both clear the floors the empty
answer sits at — measured before it was written: confidence 91 and 6 facts on each. The clause is
self-guarded, so the census credits the two clauses above it through its companion window, and the
debt falls **295 → 293** with the ceiling following the measurement.

Two of the four stay charged on purpose: the refusal-sentence and provider-label clauses are
behavioral assertions whose zero-vocabulary is the fixture's own name (`none`) and a quoted
provider string, and de-charging them would take a reader correction that has not yet earned its
witness. They stay on the books until a correction earns it.

The arm, run before landing: with the companion deleted and the ceiling already at 293, the census
reports **295 owing against 293** and exactly one clause reddens — the fall is earned by the
companion, not by the number.

Measured: `tsc` clean, `npm run build` exit 0, `proof-ai-grounding` **69/69**, `proof-i18n`
**366/366** · 2,007 keys × 3 locales (vacuity census **293 owing / ceiling 293**).

### M313 — the plant that re-implemented the predicate it was guarding

M312 ended with the rule "plant the rule's whole reason, not one sample you know passes". This unit
took the next two clauses on the census's list — `every formatDate call resolves and none was
mis-parsed` and `no formatDate call passes a literal locale` — and the plant written for them broke
the rule in a way the rule does not cover: **it re-wrote the two tests instead of running them**.

The plant ran `callArgs` on five fixture call sites and then tested the first argument with its own
copies of `/^["'`]/` and `/(^|[.\w$])locale$/`. So the mutation that mattered — neutering
`literalLocale`'s filter, or `noLocaleArg`'s — left the plant **green**, because the plant was not
reading those filters. It was a second reader of the same idea, which is the failure this file
already names for scanners ("two scanners over the same source is two chances to disagree"),
applied to a test instead of a scanner. The two tests are now named functions —
`isLiteralFirstArg` and `firstArgIsReaderLocale` — and both the filters and the plant call them.

**With that fixed, the mutations bite.** Neutering the literal test names
`formatDate("en-GB", iso)`; neutering the locale test names four of the five fixtures at once. Before
the fix, neither was caught by anything.

**Reading the fixtures instead of assuming them found two things.** A literal locale is charged by
*both* tests — it is not the reader's locale either — and an unparseable call is charged by the
locale test as well as the resolve test, which is correct: a call that did not resolve is a defect
whichever clause reads it. The expectations in the table are the measured ones, and the comment
above them says so, because the first draft had three of the five wrong.

The ceiling falls with the measurement, **296 → 295**.

Measured: `tsc` clean, `npm run build` exit 0, `proof-i18n` **366/366** · 2,007 keys × 3 locales
(vacuity census **295 owing / ceiling 295**).

### M312 — the plant that found a blind spot instead of confirming one

M311 corrected what the vacuity census reads and left the ceiling at 298. This unit spends two of
that debt on the two clauses the census named first, and one of the two plants did not confirm the
clause it was written for — it found a hole in it.

**`t()'s variable filling is the only interpolator in the UI source`** read one regex, `HANDROLLED`,
and that regex only saw a *quoted* needle: `replace("{n}", …)`. The plant was written with the two
shapes the rule exists to refuse — the quoted needle and the regex needle `replace(/{n}/, …)` — and
the second one came back `MISS`. It is the same defect either way: `String.prototype.replace` with a
non-global needle fills only the first occurrence, which is the half-filled render M153 collapsed 21
sites away from. The rule now refuses both needles, and a search of the tree confirms no site was
ever written the second way, so closing the hole changed no reading. The two shapes that must stay
legal (`.replace("a", "b")`, `.replace(/-/g, "/")`) are planted beside them.

**`no file formats an instant for the browser`** is two regexes and a list of four argument shapes,
and a zero passes if either half stopped working. The plant runs the *same two pieces* — not copies —
over the four ways of asking the host (`()`, `undefined`, `[]`, `"default"`) and the three ways of
telling it (a locale variable, a literal locale, the `formatDate` door). The empty-argument form is
the one worth naming, because it is an argument list and therefore looks like a decision.

**One more reading was wrong, in the same place as M311's.** The census recognised a planted witness
by the word `plant`, but the suite also writes them as `…so the zero above is measured and not a blind
spot` — and every clause in that phrasing was reported as owing while it stood there with its witness
beside it. Both phrasings are recognised now, and both are in the device witness, so a third one
cannot arrive without being named there. The two new plant clauses also had to be *named* as plants,
which is itself the convention this census depends on: a witness the census cannot see is a witness
it will charge you for.

The ceiling falls with the measurement, **298 → 296**.

Two mutations, both caught: the hand-rolled rule back to the quoted needle only (the plant reports
`MISS const s = tpl.replace(/{n}/, String(n));`), and the host classifier no longer refusing `[]` —
caught by the new plant **and** by the standing `the census still recognises all 5 ways of asking the
host` clause beside it.

Measured: `tsc` clean, `npm run build` exit 0, `proof-i18n` **365/365** · 2,007 keys × 3 locales
(vacuity census **296 owing / ceiling 296**).

### M311 — the census that charged clauses for evidence it could not see

Section 38's vacuity census recognises three devices — a plant in the clause, a floor or pin in the
clause, or a planted companion — and reported **387 owing** against a ceiling of 387. It was
over-reporting by 89, and all three causes were in how it read the third device:

- **A companion that carries a floor did not count, only one that carries a plant.** `every
  dictionary key is reachable` has `the reachability scan claims the dictionary rather than nothing
  (… > 500 …)` directly below it — the exact non-vacuity device this census exists to ask for —
  and the census called it owing because the word it looked for was "plant".
- **The companion window was eight lines.** `no English sentence is carried by two keys` has a
  planted companion that a multi-line IIFE pushed fifteen lines down, so the window never saw it.
- **The companion was one clause, not the evidence's own shape.** `every row text a domain module
  hands the screen is a real key` has its population clause two below it, with an unrelated clause
  in between.

A census that over-reports is not harmless: it spends the reader's attention on clauses that already
have their evidence, and it makes the ceiling look like progress when nothing moved. The three
readings are corrected to what the suite actually writes — a companion is a **clause**, the window
is the **next two** of them, and a **floor counts as much as a plant** — and the reported debt falls
**387 → 298** with no clause edited.

**A correction to the reader needs a witness of its own.** Widening what counts is exactly the change
that can turn a census into a rubber stamp: a reader that credited everything would report 0 owing
and look perfect. So the reader is planted with five fixtures — a plant in the clause, a floor in the
clause, a guarded companion one clause down, a guarded companion two clauses down, and a clause with
nothing at all — and each declares the verdict it must get, the last one being "flagged".

The ceiling falls with the measurement, **387 → 298**, and it can only fall from here.

Two mutations, both caught: the old reading restored (owing jumps to **367** against the ceiling of
298), and the reader crediting everything (the "nothing at all" fixture reports credited, so the
witness clause reddens instead of the census silently passing).

Measured: `tsc` clean, `npm run build` exit 0, `proof-i18n` **363/363** · 2,007 keys × 3 locales
(vacuity census **298 owing / ceiling 298**).

### M310 — the edit that never read the decision it reversed

M309's section is the next one down and it was wrong. M216's block charged that `time.inDays` and
`time.agoDay` "still print compact English abbreviations … which is consistent but not pretty, and
unifying them means choosing a compactness policy per locale rather than editing rows". M309 read
that as an instruction to unify and spelled the English unit out. **M304 had already chosen the
policy, one milestone earlier, and written it beside the rows**: English counts compactly because
the dashboard's day stamp sits in a fixed-width 56px `w-14` box (`Dashboard.tsx:411`) where
"3 days ago" wraps, while both Chinese columns spell 天 out because a Latin abbreviation inside
Chinese text reads as foreign. M309 reversed a documented decision without reading it and left the
stamp wrapping.

This is the third face of one failure in this repository. M299 charged a *repair* that had outlived
its ledger line. M305 charged a *ledger line* that had outlived its repair. M309 is the *edit* that
never read the decision it reversed — and the cause is structural rather than careless: the charge
lived in a README block, the decision lived in a source comment, and nothing connected them. So the
repair is not "read more carefully".

**The coupling is a clause now.** `proof-i18n` reads both halves from the tree — the two English rows
from the dictionary, the stamp from `Dashboard.tsx` — and asserts them as one thing: while the stamp
is narrow, the English rows are compact. Widening the column and spelling the unit out is a legal
pair, but it has to be one commit, and this clause is where the pair is paid for. The plant runs the
predicate on all three pairs, so a green cannot mean it stopped looking at either half: M309's
(spelled out, narrow) must be refused, M304's (compact, narrow) must pass, and a widened stamp must
accept the spelled form. The stamp is asserted to still be there, because the clause's whole claim
is the coupling — a detector that lost the stamp would otherwise pass by finding nothing to couple.

The rows are back to `{n}d ago` / `in {n}d`, the comment beside them records the reversal and the
coupling, and `proof-screens`' detector went back to `/\b\d+d ago\b/g` with them. M309 had moved it
to `/\b\d+ days? ago\b/g` — the right instinct applied to the wrong change, and worth keeping in the
record as the one part of M309 that would have been needed had the copy change been the right call.

Two mutations, both caught, and each names its half: the English unit spelled out while the stamp
stays narrow (`English compact: false`), and the stamp widened without touching the rows
(`the 56px w-14 stamp still renders relativeDay: false`).

Measured: `tsc` clean, `npm run build` exit 0, `proof-i18n` **362/362** · 2,007 keys × 3 locales
(vacuity census 387 owing / ceiling 387), `proof-screens` **31/31**.

### M309 — the day unit becomes a word, and the detector that would have gone blind with it

> **Superseded by M310 — read that section first.** The policy this unit chose was already written
> down beside the rows: M304 had decided English stays compact because the dashboard's day stamp
> sits in a 56px `w-14` box that wraps on anything longer, and M309 read M216's *charge* without
> reading M304's *decision*. M310 put the rows back and turned the coupling into a clause. What
> survives from this unit is the part it got right — the detector had to move with the copy, and it
> moved. The rest is kept as written, because the wrong version is the useful record.

M216's block left one charge standing for the longest of any in the file: "`time.inDays`/`time.agoDay`
still print compact English abbreviations (`in 3d`, `3d ago`) that the community feed shares — the
dashboard now reads them beside `Tomorrow`, which is consistent but not pretty, and unifying them
means choosing a compactness policy per locale rather than editing rows". It was right that the fix
was a policy rather than an edit. This unit chooses it: **the day unit is a word**, which is the
choice both Chinese locales had already made on their own (`{n} 天前` / `{n} 天后`), so English was
the only locale abbreviating and the dashboard's fixture column was the only place a reader saw
`Tomorrow` and `in 3d` a line apart.

**The form is plural-only, and that is measured rather than assumed.** `relativeDay` routes `d === 1`
to `time.tomorrow`, `d === -1` to `time.yesterday` and `d === 0` to `time.today`, so `n` reaches
`time.inDays` and `time.agoDay` at 2 or more. `REL_CASES` already pins that boundary at exactly `2`
and `-2` — the smallest magnitudes that reach the two keys — which is why there is no singular arm
to add here: one would be unreachable, and an unreachable key is the shape this file refuses
elsewhere rather than ships.

**The part worth recording is the detector.** `proof-screens` charges the dashboard's own render and
counted the wrong-clock labels with `/\b\d+d ago\b/g`, wanting 0. Spelling the unit out would have
left that pattern matching a form the dictionary can no longer produce: the clause would still have
read 0 — on every page, including the broken one it was written to catch. The pattern moved to
`/\b\d+ days? ago\b/g` in the same commit, and the comment above it says why, because a detector that
survives its subject's rename by going quiet is worse than no detector. The division of labour is now
explicit: `proof-i18n` owns the copy's shape, `proof-screens` owns the page's clock.

The new gate clause is `proof-i18n`'s, next to the calendar-day clause it extends. Its predicate is
shape rather than text and needs no per-locale branch — a bare Latin letter as the unit right after
the number is an abbreviation, and none of the three languages writes its day unit that way — and it
carries its own population count (6 of `L.length * 2` rows read) so a loop that stopped finding the
keys cannot report a clean run. The plant runs the predicate both ways: the two forms this replaced
must be refused and the three shipped now must pass.

Two mutations, both caught: the copy reverted to `{n}d ago` (the clause names both offending rows),
and the loop pointed at keys that do not exist (`0 of 6 rows read`).

Measured: `tsc` clean, `npm run build` exit 0, `proof-i18n` **362/362** · 2,007 keys × 3 locales
(vacuity census 387 owing / ceiling 387), `proof-screens` **31/31**, suite **42 scripts · 2,275
checks with 41 green**. `proof-runner` is the one red, and it is red on this machine rather than on
this change: `scripts/run-proofs.mjs` spawns each script with `spawnSync` and the sandbox refuses the
child (`exit 0 — got null`), which is the standing local artifact this file records rather than a
verdict about the tree. Every other script was run directly, one process each, which is the mode this
file says to use here.

### M308 — string content is not code, and a healed walk resumes true

M213's block kept one charge the probe could not reach: `sourceBalance` reads only where the walk
ended, so a wrongness that heals before EOF is invisible to it — and the block hedged that "an
interior wrongness that self-heals by EOF is invisible to both clauses, which is what the probe
covers and why the pair is kept". This milestone resolves the charge to a measured boundary
instead of a fear.

**The one shape that heals without any balance change.** A template that closes brings `tick`
back to zero but swallows everything between open and close, and that is correct — string content
is not code, so a caption inside it reading 0 is the walker working, not failing. The shape worth
scrutiny is the unterminated attribute: its quote bails at the newline, `inTag` stays set across
the boundary, and the next `>` at brace zero closes it as if nothing had happened — the only
thread that opens mid-file and heals with `elem`, `depth` and `inTag` all back at zero. Measured
on that fixture: the healed fragment charges itself exactly once, as the attribute it opened
(`kind=attr:title`), and the caption standing after the heal reads exactly once per half — the
same two hits the clean fixture reads. Regions resume true after a heal; a scanner that stayed
lost would read fewer (caption swallowed) or more (regions rebuilt), and both redden at the
clause.

**So the gate carries the boundary.** `proof-i18n` asserts both halves: the healed fragment once,
the caption after the heal twice, and — via the recover fixture M307 installed — the caption
inside an open template zero times. What the charge was actually afraid of (regions silently
wrong with a clean EOF) now has its two outcomes measured: healing is true, and swallowing is
string content. The blocks also drop their exemption lines the same way: M213's `lib/hooks.ts`/
`theme.tsx`/`utils.ts`, and M212's `lib/hooks.ts`/`lib/theme.tsx`/`lib/utils.ts` with its three
named hooks retired alongside the file — all retired at M238/M239, M302's section records the
retirements and `proof-coverage`'s single-entry `EXEMPT` asserts the table — and M300's sweep
missed both stale lines; they go now with the pointer.

Measured: `proof-i18n` **361/361** · 2,007 keys × 3 locales (vacuity census 386 owing / ceiling
387), suite **42/42 · 2,378/2,378**, `tsc --noEmit` clean, `npm run build` exit 0.


### M307 — what a healthy tree cannot show, a fixture can

M213's probe makes two choices — plant in the file's interior, demand both halves back — and its
block carried the honest residue of choosing them: arms that relax either choice MISS on a
healthy tree (`m213h`, `m213i`, measured), because the healthy tree is exactly where the two
relaxations are indistinguishable from the standing form. The choices are load-bearing only
against a broken tree, so the block recorded the pair as a claimed joint property and the arms
were dropped. This milestone moves that record from the ledger into the gate.

**The measurement first.** Restoring the escape defect onto candidate fixtures and planting the
probe at both positions: a runaway template reads 0 at the midpoint and 0 at end-of-file (the
walk never resumes, so no demand can tell the positions apart); an unterminated attribute and an
open element self-heal and read 2 or 4 — the plant's own `<div` re-enters, and an attribute
literal counts as a hit the same as body text; the shape that hides is the one M213 measured on
`chart.tsx`, a broken state so deep that exactly one half survives, and no minimal fixture
reproduces it. The fixture that isolates the position choice is a template that opens in the
interior and closes before the end: the plant at the midpoint lands inside it (0), the plant at
end-of-file lands after the recovery (2).

**So the gate now carries that fixture.** `proof-i18n` plants the probe at both positions of a
recover-then-close fixture and a healthy fixture, and asserts the four numbers: 0 at the broken
midpoint, 2 at the broken end, 2 and 2 on the healthy tree. The position choice is witnessed in
the shipped gate — end-of-file is where interior breakage goes to hide, and the interior choice
is what gives the probe its teeth against exactly this shape. The demand choice is recorded at
the clause with its boundary: every shape a minimal fixture can carry reads 0 (blind under any
demand) or 2-or-4 (healthy under any demand), so any-half and both-halves agree everywhere
reproducible, and the demand stays both-halves because it costs nothing where the tree is
healthy. A claim that survived four milestones as a property is now a measurement.

Measured: `proof-i18n` **360/360** · 2,007 keys × 3 locales (vacuity census 386 owing / ceiling
387), suite **42/42 · 2,377/2,377**, `tsc --noEmit` clean, `npm run build` exit 0.


### M306 — a blind report has to say whose fault it is

M213's probe plants a caption at the midpoint of every `.tsx` file and demands both halves back,
and its own block carried one honest escape hatch: the midpoint is a *line* boundary, so if the
first half of a file ends inside a construct the walker tracks, the plant lands inside it too, and
a swallowed caption would be the probe's fault, not the file's — "a future red there must be
classified before the position is moved". The clause has been green ever since, which kept the
caveat a promise rather than a mechanism. This milestone keeps the promise: the classification is
the gate.

**Which threads can swallow a plant is not all of them, and the difference is what makes the gate
honest.** The walker's own account of where it ended, `sourceBalance`, gains a fourth field —
`tick`, the template literal that never closed, read at both quote-skip sites and enumerated past
the field pin (`elem,depth,inTag,tick`), so a report that quietly drops it goes red. A runaway
template skips the walker to end-of-source, so a caption planted after it is never read; a block
comment still open at the boundary is erased whole by `normalize`, so a caption inside it never
existed. Both hide the plant and blame the tree for the probe's blindness, and the clause demands
both at zero on every real midpoint (`compromised: none`). The rest cannot hide it: an open
element, bracket depth and an unterminated attribute list all re-enter on the plant's own `<div`,
bending what is read without hiding that something was — 46 of 49 midpoints carry one, reported,
never fatal.

**The comment arm needs a reader of its own, because a comment leaves no balance behind.** The
gate runs a vanish test: a marker appended on a fresh line — where the probe actually lands —
must read the same to `normalize` as an empty line, both ends trimmed (a stripped comment keeps
its newlines while its words become same-length spaces, so an untrimmed comparison disagrees by a
trailing newline — the first draft of this test missed the very shape it hunts, and the
empty-line control is what the miss bought). Only a block comment reaches across a line boundary;
a line comment dies at its own newline, so an open `//` at a midpoint is correctly not a
compromise.

So `proof-i18n` gains one clause and one refusal. The refusal joins the standing filter: a
runaway template planted into source trips exactly `tick` and nothing else, and the filter has to
flag exactly four offenders (was three). Three witnesses pin the reader: the control's own
runaway template names `depth+tick`, a planted spanning comment names `comment` by vanishing, and
a closed comment names nothing. Measured: `proof-i18n` **359/359** · 2,007 keys × 3 locales
(vacuity census 386 owing / ceiling 387), suite **42/42 · 2,376/2,376**, `tsc --noEmit` clean,
`npm run build` exit 0.


### M305 — the charge outlived its own closer by one milestone

M300's sweep read the ten `Still outstanding` blocks of M208–M218 and struck only what a later
milestone demonstrably closed — and M218's line survived the sweep carrying `m218d`, the
`sentence`-bucket charging arm, "needs the plants to declare their charged outcome, not just
their bucket". The tree disagrees with the ledger, and the closer is the very next milestone:
M219's section opens by naming the gap as its own — "the plants graded *classification* only,
so an arm that dropped `sentence` from the charged list would have left the harness fully
green" — and closes it with the two-declaration split (`REL_CHARGED_KINDS` for the census's
rule, `REL_PLANT_CHARGED` for the plants' independent expectation, commit **9b9d3de**), a
coverage floor requiring all four buckets in the plant table, and two mutation witnesses
(`m219a` drops `sentence` from the charged list, `m219b` deletes `selection` from the plant
table). "The plants declare their charged outcome" is what that split is; the M218 block
just never heard about it. Today the clause reads 10 plants over 4 buckets, all as
predicted; untested buckets: none.

Struck with the closer named, per M300's rule. And one more line in the same block dies
today rather than later: the compactness of `time.inDays`/`time.agoDay` beside `Tomorrow` —
M304 closed it at the rows and in the feed this same day, so M218's block drops it with the
pointer to M304's section. What the block still carries is what has no closer yet: the
cross-function flow caveat, the populated-state browser walk (#142), and the untracked
`dev/` scratch. M302's re-checked block drops the `m218d` line the same way.

This is a docs-only milestone: no source file changes, so the suite is quoted unchanged from
the M304 plane — `proof-i18n` **358/358** · 2,007 keys × 3 locales (vacuity census 386 owing
/ ceiling 387), suite **42/42 · 2,375/2,375**, `npm run build` exit 0.

### M304 — one row, two calendars: the feed counted its own days into the gate's word

M216's rule is that a reader counts the days the wall calendar shows, and `relativeDay` in
`i18n/format.ts` is the door that measures them — midnights crossed, rounded, because a DST
day is 23 or 25 hours. The feed's `timeAgo` helper (`CommunityHub.tsx`) spent its life on
one side of that rule: minutes and hours it counted as elapsed time, which is honest —
below a day the wall clock is the measure and no calendar unit is claimed — but at the day
boundary it divided elapsed hours by 24 and printed the count into `time.agoDay`, the same
row the dashboard fills from the gate. One row, two meanings. A thread 25 hours old read
"1d ago" on the feed where the dashboard's arithmetic — and the calendar — said
"Yesterday"; around every midnight boundary the two ages disagreed by a day, and on a DST
day by an hour either way. The ±1 word the M216 rewrite added everywhere else never reached
the feed at all.

**The repair takes the count out of the helper.** The day branch routes through
`relativeDay(locale, iso)` and accepts whatever day word the gate hands back — and the
routing is safe by measurement, not luck: ≥24h elapsed is always calendar yesterday or
older, so the gate's same-day and ahead-of-day words cannot come back. Yesterday gets its
word, ≥2 days the calendar count, and the month-old thread still falls back to the absolute
date — the threshold stays elapsed on purpose, a usefulness policy about when a reader
stops parsing day counts, not a semantics claim. The minutes/hours branches stay as they
were.

**The compactness charge closes at the rows.** M216 declined to unify the day words without
"choosing a compactness policy per locale rather than editing rows", and the policy now
lives as a comment beside the `time.*` block in `dictionaries.ts`: the English column
counts compactly (`{n}d ago`) because its day stamp sits in the dashboard's fixed-width
56px `w-14` column (`Dashboard.tsx:411`) — "3 days ago" wraps — while the two Chinese
columns spell the word form (`{n} 天前`), a Latin abbreviation inside Chinese text reading
as foreign, and the word form is what the ±1 words beside them already speak.

**The gate grows one structural clause** beside the hand-label family: the feed's helper
must ask the gate (`relativeDay(locale` present) and must not name the day row at all —
neither its code nor its comment does, so the clause reads a literal zero, and a reverted
count or a fresh inline day arithmetic flips it.

Measured on the working copy: `tsc --noEmit` clean, `npm run build` exit 0, `proof-i18n`
**358/358** · 2,007 keys × 3 locales (vacuity census 386 owing / ceiling 387, unmoved —
the new clause asserts a positive beside its zero), suite **42/42 · 2,375/2,375**. Code as
**fc89041**.

### M303 — the census's population was the shapes it already knew, and the tree carried two it did not

The `Dashboard.tsx:51` alias charge retired here, and it retired the honest way: not by arguing
M218's discriminator was enough, but by finding the shape the discriminator's population still
could not see. `relCandidates` matched a subtraction whose operands are a parsed instant and a
now-receiver — `new Date(iso).getTime() - Date.now()`. M218 added the file's own `Date.now()`
bindings as receivers and M293 added the parameter-default shape; every member of that family
was witnessed by a plant demanding exactly one candidate. What no pattern covered was the same
arithmetic **one brace to the left**: a subtraction *inside* the constructor,
`new Date(Date.now() - 86400000)`, which builds the instant from the relative math instead of
subtracting from a parsed one. Both operand orders miss it, no plant wore it, and the census
counted a clean population while the class it exists for walked past it.

The M303 probe measured the tree both ways. The census as the gate runs it saw **2** operand
candidates — the two row-typed doors, `CommunityHub.tsx timeAgo` and `i18n/format.ts
relativeDay`. The wrapped shape saw **2** sites the census could not:

- `store/useFootballOS.tsx:163` — the streak's `yesterday`, computed as
  `new Date(Date.now() - 86400000).toISOString().slice(0, 10)` and fed to the `continues`
  comparison whose result the dashboard and profile print. Doubly defective, and both defects
  are ones this record had already named elsewhere: the **elapsed-24-hour rule** M216 removed
  from the display door was still running in the streak, and the day keys came from
  `toISOString()`, the **UTC clock** — a day boundary no reader has. A UTC+8 reader completing
  two sessions before 08:00 local could grow the streak twice in one wall-calendar day; the
  number on the badge counted a calendar the reader does not live in.
- `domain/community.ts:74` — the board seed's `ago(days)`, the same wrapped shape producing the
  seeded threads' `at` instants. Its defect was the convention, not the clock: N *elapsed*
  hours where the door that renders those instants counts N *calendar* days — the two disagree
  on a DST day, and the seed should speak the same convention its reader uses.

**Both sites are repaired by leaving the population rather than by reclassifying it.** The seed's
`ago` now walks calendar days (`d.setDate(d.getDate() - days)`) and emits the same ISO instants;
the streak's `today`/`yesterday` are local-calendar keys built by `dayKey`, the shared
local-calendar builder in `domain/history.ts` — now exported, because the first draft of this fix
inlined a third hand-assembled key template and the hand-label clause (`no hand-assembled date
label reaches a screen`, its pin at **2** builders) caught it in the same commit it was written.
A key is compared against `lastCompletedDate` and never shown; the builder that already held the
pin is where it comes from.

**The gate widens with the shape instead of with a list.** `relCandidates` gains the wrapped
patterns — receiver either side of the minus, content bounded to one statement and one paren
depth beyond the receiver's own call (`[^;()\n]*`), the depth the live shapes wear — and two
plants join the table (**8 → 10**, still over the same 4 buckets, each demanding exactly one
candidate): a wrapped instant in a string-returning helper classifies **sentence** (charged), and
a wrapped alias feeding only a comparison classifies **selection** (not charged — the second
plant also exercises the wrapped-vs-operand overlap through the dedup pass). The census clause
itself is unchanged and still demands `charged === 0`; the tree now satisfies it with both
former wearers gone rather than excused.

**The charge's paper trail.** M215 measured the alias hole (1 site, 0 printing helpers, "the
class can dodge the clause by naming a variable"), M216 declined to widen the pattern without a
"reaches a displayed string" discriminator, M218 built the discriminator and classified the
selection filter as measured-not-shown, and M300/M302 kept the line alive. What none of them
re-checked was whether the named site still existed: M289 moved the today panel onto the demo
world's anchor and the `const now = Date.now()` filter left `Dashboard.tsx` with it. The class
outlived its last named site by exactly one shape, and this milestone closes both — the shape in
the pattern table, the site in the tree. Still outside the census's claim, unchanged from M218's
own record: cross-function flow (a duration computed in one function and printed in another) is
a different defect than a hand-formatted relative sentence, and the classifier answers only the
shape of one expression.

Measured on the working copy: `tsc --noEmit` clean, `npm run build` exit 0, `proof-i18n` **357/357**
· 2,007 keys × 3 locales (vacuity census 386 owing / ceiling 387) with the plant table at
**10 plants over 4 buckets, all as predicted** and the census reading **2 candidates in 2 files —
row-typed 2, selection-only 0, charged none**, suite **42/42 · 2,374/2,374**, `proof-rng` 55/55.

### M302 — two more outstanding charges whose repairs had already landed

M300 read the `Still outstanding` blocks of M208–M218 against the tree and struck the charges a
later milestone had demonstrably closed. It stopped at M218. This unit reads the blocks from M219
onward the same way, and two charges are closed the same way — each named here with the milestone
that closed it and the gate that holds it now, because a charge that outlives its repair is worse
than no charge: it spends a reader's attention on work that is already done.

**The starter drafts' prose (M207's block, "keying them is #184+, and `community.ts` is at its
prose cap").** M243 moved the board's seeded content onto rows and M244 finished the four
`buildStarters` drafts, so the module that was "at its prose cap" is at zero: `community.ts`'s cap
went 36 → 21 → 0 and it joined `PROSE_ZERO`. The claim that the work "has to move the strings
rather than add to them" was true when written and is now moot — the strings were keyed, in three
locales, not relocated. Held by `DOMAIN_PROSE_CEILING = 0`, the per-module caps summing to 0, and
the empty inventory line.

**Simulation Lab and Data Room (M207's block, "localisation debt of 51 and 29 hits").** Both files
are in `RAW_COVERED` by name (`features/sim/SimulationLab.tsx`, `features/analytics/DataRoom.tsx`),
the clause that walks the covered set reports `none`, and the debt outside it is `0 across 0 files`
against a ceiling of 0. The 51 and 29 were real; they were paid down by the milestones that added
those two paths to the covered set.

**The three library exemptions (M300's own carry-forward list, "the `lib/hooks.ts`/`theme.tsx`/
`utils.ts` exemptions").** `proof-coverage`'s `EXEMPT` table holds one entry now — `src/main.tsx`,
the SPA entry — and the clause that keeps it honest asserts exactly that (`Object.keys(EXEMPT)
.length === 1`, and every entry names why). `lib/hooks.ts` was retired by M238 when `proof-storage`
began rendering it, `lib/utils.ts` by M239's screen proof, and `theme.tsx` is reached the same way;
the gate's own comment records the two retirements by name. The clause at the bottom of that file
is the strongest form of the claim: the directories the gate was built around carry *not one*
exemption between them.

**What stays, and why.** The same M207 block's other half — "the board still has no server behind
it" — is untouched: this project is deliberately local-only, and no later milestone changed that.
M207's second paragraph is relabelled **Provenance**: it records that the commit was landed on a
worktree another session was writing to, which is a fact about authorship rather than work still
owed, and `Still outstanding` was the wrong heading for it.

Also fixed: the missing blank line between M300's and M301's sections.

This is a docs-only milestone, so the suite is quoted as measured rather than as a result:
`proof-i18n` **357/357** · 2,007 keys × 3 locales (vacuity census **386 owing / ceiling 387**),
`proof-coverage` **24/24**, suite **42/42 · 2,374/2,374**, `npm run build` exit 0. No source file
changed.

**Still outstanding, re-checked against this tree rather than carried forward**: the
`useEffect` half of the router and the populated-state browser walk (#142), and the untracked
`dev/` scratch (~250 files). Each was looked for in this commit; none of them has a later repair
to name - and four charges this block carried
are closed by later milestones: the alias discriminator M303 closed, whose section records
the shape M218's population still missed and the two sites it held; the
`time.inDays`/`time.agoDay` compactness policy M304 closed, whose section records the feed
leaving the count to the gate and the per-locale word forms declared at the rows; and
M218's `m218d` charging arm, closed by M219 one milestone after it was charged - the
two-declaration split whose section records the mutation witnesses - struck at M305; and
M213's probe-midpoint caveat M306 closed, whose section records the walker's `tick` field, the
vanish test that names a spanning comment, and the two swallowing threads held at zero across
every `.tsx` midpoint while the rest are reported as unable to hide a caption.

### M301 — an empty pool now fails at the cause, in one shared contract

M210's ledger line — "`weightedPick([])` still throws where `pick([])` returns
`undefined`" — survived eight syncs as a documented difference, and `proof-rng`
recorded both refusals side by side. What the line charged was never the throw
itself: it was that two helpers with one job had two failure contracts, and the
worse one was pick's — a signature promising `T` while `arr[NaN]` handed back
`undefined`, so the poison landed wherever the result was read, the same
silent-derivation shape the `lib/ids.ts` comment calls a live bug class.
weightedPick threw, but from its own fallback line, and `Cannot read properties
of undefined (reading '0')` names nothing.

The contract is now one sentence for both helpers: an empty pool is a caller
bug, and it throws at the cause with a named error — `pick: empty pool`,
`weightedPick: empty pool`. Both keep their signatures and both keep their
draws: the 400-match battery digest is unchanged, so no seed reproducibility
moved. What M301 deliberately does not touch: the all-zero-weight fall-through
to the first entry and the un-validated negative weights stay exactly as their
clauses state them — documented behaviors, not accidents, and a weights-
validation pass would be a different argument.

The 19 app-source `pick` call sites and the 2 `weightedPick` sites were
measured for reachability of the new throw: every pool is a module constant or
an inline literal (FILM_KINDS, HANDLES, POS_GROUPS, the seed's
FIRST/LAST/NATIONS, SHOT_HIGH_XG/SHOT_LOW_XG), the seed's news pool guards its
split with a ternary fallback, worldEngine's `comp.clubIds` has its own census
clause (no empty pools), and training's `focusDrills(key)` is covered by the
buildSession battery that draws a real session for every attribute key at both
minute extremes. The suite's battery and seed world run the changed paths end
to end.

Gate: proof-rng's two empty-pool clauses are **reversed, not added** — the pick
clause now asserts the named throw it used to assert the undefined against, and
the weightedPick clause asserts `Error: weightedPick: empty pool` where it
asserted `TypeError`. **55/55** checks, the same count the script carried
before this milestone (two clauses replaced two, one for one). Measured: `tsc`
clean; `proof-rng` **55/55** with the battery digest unchanged; suite **42/42 ·
2,374/2,374**; `npm run build` exit 0. Code as **7b3c26e**.

### M292 — today reads as a word, not a bare clock

`relativeDay`'s within-a-day branch was the one arm with no reader word: an
instant inside the reader's own day printed a clock time alone — `12:30 AM` /
`00:30` / `上午12:30` — in every locale, with nothing marking it as today. M214
queued the branch as outstanding and M216's calendar-day rewrite deliberately
left it standing. The branch is live on the dashboard's recent-activity line (a
`completedAt` the reader wrote today) and on its fixture rows for any reader
inside the world's window; measured against this tree the demo anchor
(2026-09-22) sits two weeks behind the reader's clock, so the today panel's 45
rows currently print `14d ago`/`13d ago` and none of them reach the branch —
the arm was dead on the pinned world and wrong for everyone it was written
for.

The fix keeps the clock and adds the word: the branch returns a row — key
`time.today`, the clock formatted the reader's way as the `{at}` variable, one
row per locale (`Today {at}` / `今天 {at}`). It is the only day word that
carries a variable, because a day the reader is inside has no honest count:
the word says which day, the clock says when. A bare clock cannot say the
first thing and a word without a clock drops the second.

The gate is `proof-i18n`'s calendar-day clause, extended rather than added to:
the two planted within-a-day anchors now want `time.today`, the row must carry
a clock-shaped `at`, and each locale's line must be more than the clock it
carries and must still carry it — the sentences the branch shipped until now,
refused by name. The regression arms are named too: `m216c` re-tipped to the
dropped word, `m292a` the dictionary row collapsed to its clock, `m292b` the
word shipped without its variable.

Measured: `tsc` clean; `proof-i18n` **356/356** · 2,005 keys × 3 locales (vacuity
census 382/384); `proof-screens` 25/25; suite **42/42 · 2,362/2,362**; `npm run build`
exit 0. Code as **4dcc55f**.
### M291 — a club with a match in play keeps its next-up projection

ClubDetail pointed its "Next up" projection row at the first entry of the club's
upcoming list and withheld it unless that entry was `SCHEDULED`, so a club whose next
fixture was in play lost the row entirely. Measured on the shipped world: 51 of the 73
clubs have a live match as their next fixture, and 47 of them have a schedulable
fixture sitting right behind the live one — a row the page could honestly render,
withheld because of a game it is not about.

The fix points the projection at the next schedulable fixture instead of the first
upcoming one: `upcoming.find((m) => m.status === "SCHEDULED")`. An in-play match no
longer suppresses the row; the row describes the fixture that has not kicked off,
which is what it always claimed to describe.

The pin is `proof-screens` 5d: it renders every club page whose next schedulable
fixture is priceable in its own competition (59 pages, floor 55) and charges the
row's own "Next up vs" label text to the page text. The ten clubs whose next
schedulable fixture is a cross-competition tie are the named boundary — the
projection prices both sides from domestic metrics, so an out-of-competition
opponent is excluded by the same rule the page applies, not silently dropped.

Measured: `tsc` clean; `proof-matchstats` 16/16; `proof-screens` 25/25; suite
**42/42 · 2,362/2,362**; `npm run build` exit 0. Code as **fd400b1**.
### M290 — a competition's own page shows its live fixtures

The competition page's two fixture lists were gated on terminal states only: "Next
fixtures" took `SCHEDULED` alone and "Recent" took `FINISHED`, so a competition with
a game in play showed the in-play match nowhere on its own page. Measured on the
shipped world: 12 of the 15 competitions carry 49 live fixtures between them (ucl 17,
ligue1 7, uel 6, liga 4, seriea 3, pl 3, bundes 2, brasileirao 2, superlig 2, liga 1,
eredivisie 1, mls 1), and none of those pages rendered their live fixture in either
list — the same fixture renders fine on its match page since M288; only the
competition page, its own competition-scoped surface, dropped it.

The fix mirrors the hub's selection at competition scope: `footballService` exports
`upcomingMatchesForCompetition`, filtering everything not yet finished by competition
and sorting kickoff ascending, and `CompetitionDetail` calls it — a live match leads
the next-fixtures list in MatchRow's live shape (red status tag, score where the
kickoff stamp sits on scheduled rows).

The pin is `proof-screens` 5c: the clause renders every live competition's own page
through the router (`FootballWorld` inside `RouterProvider`, the hash set per
competition) and charges each live fixture's scoreline, in MatchRow's own "h – a"
shape, to the page text — 12 live competitions, floor 10, 0 missing.

Measured: `tsc` clean; `proof-matchstats` 16/16; `proof-screens` 24/24; suite
**42/42 · 2,361/2,361**; `npm run build` exit 0. Code as **11e9cdb**.
### M289 — the today panel runs on the world's clock

The dashboard's "Today's Matches" panel filtered the demo world's fixtures by the
reader's wall clock: it hoisted `const now = Date.now()` and measured every kickoff
against it, while every timestamp the world ships derives from the seed's own anchor
(`DEMO_NOW`). Measured on 2026-10-06: the reader's ±2d window held 88 scheduled
fixtures against the world anchor's 45 — a different population, drifting one real day
at a time — and once the reader's clock passes 2026-10-16 the panel sits empty forever
beside a hint that promises "Next up in the demo world". The alias was also the one
site M214's ledger queued: the relative-math census could not see a clock read hidden
behind a named variable.

The fix moves the selection into the data layer, where the anchor lives:
`footballService` exports `todayMatches`, filtering scheduled fixtures by
`DEMO_ANCHOR_MS`, and the dashboard calls it — the screen no longer parses a kickoff
beside a clock read at all.

The pin is in `proof-matchstats`, at both ends: the window is a real population
(45 scheduled fixtures within DEMO_NOW ± 2d, floor 20, every row scheduled and inside
the window — so a regression to the reader's clock reddens the moment the proof runs
outside the world's fortnight), and neither the screen nor the service parses a kickoff
beside `Date.now()` — the M214 alias site, closed.

Measured: `tsc` clean; `proof-matchstats` 16/16; `proof-screens` 23/23; suite
**42/42 · 2,360/2,360**; `npm run build` exit 0. Code as **f2142e8**.

### M288 — a live fixture's record reaches the glass

The seed treats LIVE as a recorded state: every fixture in the [-2, 0) kickoff window
carries a score, a full real-named event timeline and a 12-field stats pair — the same
record a finished match gets, and the same one M286/M287's gates already count. The
match page did not: `usingRecorded` and `recordedStats` were gated on
`status === "FINISHED"`, so a LIVE page printed its scoreline beside an empty timeline,
the scheduled fixture's "No simulation yet" board, and a projection button for a match
already in play. Measured on the shipped world: 49 live fixtures carrying 736 events and
49/49 stats pairs; the sample page (M0347, 0–0, 9 events) rendered 0 of its 9 event
names, no possession figure, and the not-simulated board. The dashboard carried the same
blank in the other direction: the favorite club's "Upcoming Matches" panel is fed by a
filter that puts LIVE first (earliest kickoff), and its row printed "vs" for a match the
dashboard's own live section scores two panels above.

The fix makes the record's visibility follow the record: the match page gates its
recorded timeline and stats on `status !== "SCHEDULED"` — the simulate button keeps its
projection role, and running it sits the reconstruction beside the recorded timeline,
the same shape a finished match paints — while the dashboard's fixture row prints "vs"
only for a match that has not kicked off.

The pin is two clauses. `proof-matchstats` binds LIVE to the recorded-pair contract and
its arithmetic (49 live, floor 10: both artifacts present, possession halves to 100, on
target never exceeds shots, goal events equal the scoreline, minutes ascending).
`proof-screens` gains a render section: every LIVE fixture's page is rendered through
the provider stack and the record is charged to the text — 49 live pages, 0 dropping a
name, 0 showing the not-simulated board, 0 missing a possession figure, 0 missing the
scoreline.

Measured: `tsc` clean; `proof-matchstats` 14/14; `proof-screens` 23/23; suite
**42/42 · 2,358/2,358**; `npm run build` exit 0. Code as **3fb23b6**.

### M287 — the recorded board is the timeline's own arithmetic

M280 generated the seed's stats pair independently of its event timeline, and both
landed on the same match page: the comparison board printed figures the timeline
beside it contradicted. Measured across the 1,074 played fixtures the seed shipped,
`stats.shots` equalled the timeline's attempts in 10 and `stats.onTarget` in 81 —
1,064/1,074 (99.1%) and 993/1,074 (93.3%) mismatched — while goals agreed
1,074/1,074 only because proof-matchstats already pinned them. The board's yellows
and reds carried the same fault in the opposite direction: M284 wired them to the
glass, but the seed rolled them from a separate generator that could claim four
cautions beside a timeline showing one.

The fix makes the timeline the single source of truth: `generateMatchStats` now
receives the events and counts them — shots are the attempts (SHOT + SAVE + GOAL),
on target the saves plus goals, yellows and reds the cards — and only the figures
with no event counterpart (possession, xG, passes, pass accuracy, tackles, duels,
corners, fouls) stay modelled. Straight reds were rare enough that the derived
column read zero on every fixture, so the seed now records the rare red card it
claims (about one match in ten, the rate the old generator faked), keeping M284's
reader fed with real events. The engine's own recorded pair (`matchEngine`) already
derived its cards this way; the seed now obeys the same contract.

The pin is a new `proof-world` clause: for every played fixture the board's four
countable figures must equal the timeline's own counts per side — measured 1,064
played matches (floor 1,000), zero mismatches — while proof-matchstats' existing
arithmetic (on target never exceeds shots, possession halves to 100, goals equal
the scoreline) holds by construction.

Measured: `tsc` clean; `proof-world` 39/39; `proof-matchstats` 13/13; suite
**42/42 · 2,356/2,356**; `npm run build` exit 0. Code as **cda90b9**.

### M286 — the seed's match events stop speaking in placeholders

M279 filled the seed's events seam, and filled every event's player with template
English: goals printed `Player 1`, `Player 2` by index, shots and cards drew
`Player N` from the shirt-number generator, and saves printed the bare abbreviation
`GK`. The timeline renders that field raw, so the measured defect was total:
14,720 of 14,720 FINISHED events (shots 9,447 · saves 4,061 · goals 834 · yellows 378)
carried a placeholder into the glass, and a non-English reader met "Player 7" and
"GK" inside an otherwise fully keyed row. The same seam M282 fixed one level down —
there the sentence was keyed and only the shot word leaked; here the whole name is
fiction.

The fix is structural, not lexical: `makeWorld` already owns the completed player
roster when it builds fixtures, so `buildMatches` now receives it and hands each
match's two squads to `generateMatchEvents` — goals, shots and cards draw a real
name from the acting side's pool, and saves name the side's actual goalkeeper
(`position === "GK"`, falling back to any teammate). Names are proper nouns under
the i18n contract, so no new keys and no dictionary edits; the rng sequence shifts
by the extra draws (goal census 834 → 897 on the same seed), which stays inside the
determinism contract: identical inputs still produce identical worlds, and no clause
pins a count the shift would break.

The shift also earned its keep as a fuzzer: the extra rng draws moved the world's
scores, and the outlook's rival census — green on every world this repo had ever
sampled — suddenly reddened on a rounding tie. The defect it found was real and
predates this milestone: `aheadOfUs` was derived from the unrounded projections
while the board prints both sides rounded to a tenth, so a rival could be flagged
ahead beside two identical printed numbers. The flag now derives from the printed
values (a tie reads as level, not ahead), and the census stands unmodified.

The pin is a new `proof-world` clause: every event of every FINISHED or LIVE fixture
must carry a real squad name — no `/^Player \d+$/`, no `"GK"`, no `"Unknown"` fallback
reaching the glass — and every printed name must resolve to a seeded player.
Measured 16,282 events, zero placeholders (floor 14,000).

Also landing in this commit: the M285 author's `Match.season` removal (the declared-
never-read field, its sole writer in the seed, the now-unused `SEASON` constant, and
the analytics fixture) was uncommitted in the shared working tree and rides along
here; its section follows as M285.

Measured: `tsc` clean; `proof-world` 38/38; suite **42/42 · 2,355/2,355**; `npm run
build` exit 0. Code as **72ad682**.

### M285 — the Match interface loses its season field

A field-reader sweep over all 17 domain interfaces (`dev/.m285-sweep.mjs`: every declared
field against every UI-directory reference) found three candidates, and hand-checking
settled two of them as readers the sweep could not see — `NewsArticle.titleVars` is read by
rowText's title interpreter and `CoachPlan.prompt` by the History page's `asRowText`. The
third was real: `Match.season` was declared, written once per fixture by the seed, and read
by nothing — not a screen, not the AI, not a domain module. The M105 defect class, third
closure, this time by deletion: the season is a single constant across the whole demo world
(`2026/27`), so a reader would have printed the same string on all 1,516 fixtures — noise,
not information. The field, its sole writer, and the now-unused `SEASON` constant are gone,
along with the inert `season` key in proof-analytics' fixture.

Measured: `tsc` clean; analytics 67/67 · matchengine 30/30 · ids 15/15 · timeline 100/100 ·
world 38/38 · matchstats 13/13; suite **42/42 · 2,355/2,355**; `npm run build` exit 0.
Code as **72ad682**.

### M284 — the recorded stats' card fields find their readers

M280 wrote `yellows` and `reds` into every side of the seed's stats pair, and nothing ever
read them — the comparison table rendered 10 of the contract's 12 fields, and the only cards
reader in the product (Simulation Lab's `sim.cards` row) reads the engine's `SimTeamStats`,
not the recorded pair. The same write-only defect class M105/M106/M107 charged, and M281
closed for the stats pair as a whole, had survived in two of its fields. `StatCompare` now
renders 12 rows: the recorded pair and the simulated pair both carry cards into the glass.

The pin is two-sided and lives in `proof-matchstats.mjs` (+2 clauses, 13 total): a consumer
census requires every declared `MatchStats` field to appear as its own `ms.*` label literal
in Details.tsx's comparison table, and a display census requires all 12 keys to resolve in
all three locales (36 lookups). Neither end trusted alone. Both clauses were mutation-witnessed
before landing: deleting the two table rows reddens exactly the consumer census (naming
`reds, yellows`); deleting the English `ms.reds` key reddens exactly the display census
(naming `en:ms.reds`).

Measured: `proof-matchstats` 13/13; suite **42/42 · 2,354/2,354**; `tsc` clean. Code as **HEAD**.

### M283 — the seed's match-stats contract gets its witness

M280 shipped the seed's per-match statistics and M281 gave them a reader, but the contract
itself had no runnable proof — a data shape that nothing pins is one editing accident away
from drifting under every screen that reads it. This milestone adds `proof-matchstats.mjs`,
which loads the demo world and pins four families of facts about all 970 played fixtures: a
played match always carries both a stats pair and an event timeline while a scheduled one
carries neither; each side's stats carry exactly the 12 declared `MatchStats` fields (so a
`duelsWon`-style rename cannot come back); the pair obeys its own arithmetic (possession
halves sum to 100 on every match, shots on target never exceed shots, every number finite
and non-negative); and the timeline agrees with the scoreline it illustrates — goal events
per side equal the recorded goals, minutes ascending, and every goal's shot var is the RAW
`SHOT_TYPES` code the code-word lookup dispatches on, never a composed dictionary key. The
last clause spells the M279/M282 defect from the data side, so a regression cannot hide
behind the rendering gate alone.

Measured: `proof-matchstats` 11/11; suite **42/42 · 2,352/2,352**. Code as **HEAD**
(+64/−0, one new proof file).

### M280 — match statistics aggregation for all fixtures

Every finished match now carries a full statistical profile alongside its event timeline.
`generateMatchStats()` produces 12 metrics per side: possession, shots, shots on target,
expected goals (xG), passes, pass accuracy, tackles, duels won, corners, fouls, yellow
cards and red cards. Possession is derived from the clubs' overall ratings with realistic
variance (35–65% range), while shot distribution follows possession share. Shot conversion
and xG are modelled independently so a team can have many shots but low xG (or vice versa).

The stats integrate into `buildMatches()` by calling it for every non-scheduled match, so
the match detail page in the Simulation Lab can display comprehensive post-match analytics
without requiring a reconstruction run. Stats reuse the same shape as the match engine's
`SimTeamStats`, keeping the data contract consistent across both generated and simulated
fixtures.

Measured: suite **41/41 · 2,339/2,339**; `npm run build` exit 0. Code as **HEAD** (+78
lines in footballSeed.ts — stats generation function + type import; +13 lines in types.ts
— MatchStats interface); this section is a docs-only follow-up.

### M279 — match events and statistics for all fixtures

All generated matches now carry a detailed event timeline with goals, shots, saves
and cards rather than just the final scoreline. `generateMatchEvents()` produces:

- **Goal events** with xG values (0.05–0.85) and shot types (tap_in, close_range,
  header, left_foot, right_foot, volley), each carrying a localized detail row
- **Shot events** (8–20 per match) distributed throughout the timeline
- **Save events** for goalkeeper actions (30% probability per shot)
- **Yellow cards** (40% probability per match)

The function integrates into `buildMatches()` by calling it for every non-scheduled
match, so the Simulation Lab's match detail page can display a realistic timeline
instead of "No events recorded". Events reuse existing `sim.ev.goal` and
`sim.shot.*` dictionary keys already present in dictionaries.ts, requiring no new
i18n work.

Measured: suite **41/41 · 2,339/2,339**; `npm run build` exit 0. Code as **76dde14**
(+59 lines in footballSeed.ts — event generation function + type import); this section
is a docs-only follow-up.

### M277 — expand WORLD seed with 4 new competitions and 30 additional clubs

The demo world grew from 39 clubs across 8 competitions to **69 clubs across 12
competitions**. Added Major League Soccer (5 clubs: LA Galaxy, Inter Miami, Seattle
Sounders, Atlanta United, New York Red Bulls), Brasileirão Série A (5 clubs:
Flamengo, Palmeiras, São Paulo, Corinthians, Santos), J1 League (4 clubs: Kawasaki
Frontale, Yokohama F. Marinos, Vissel Kobe, Urawa Red Diamonds), and Süper Lig (4
clubs: Galatasaray, Fenerbahçe, Beşiktaş, Trabzonspor). Existing European leagues
gained 12 more clubs across Premier League, La Liga, Serie A, Bundesliga, and Ligue 1.

Added **10 new curated stars** including Lionel Messi (Inter Miami), Mohamed Salah
(Liverpool), Harry Kane (Bayern München), Lautaro Martínez (Inter), Bradley Barcola
(PSG), Gabriel Jesus (Flamengo), Mauro Icardi (Galatasaray), Edin Džeko (Fenerbahçe),
and Yuki Soma (Kawasaki Frontale).

Player count increased from ~350 to approximately **620+ players** while maintaining
deterministic generation via the same seeded RNG pipeline. All 41 proof scripts remain
green with no regressions.

Measured: suite **41/41 · 2,339/2,339**; `npm run build` exit 0. Code as **d0f2347**
(+67 lines in footballSeed.ts); this section is a docs-only follow-up.

### M275 — the search results' news title rides on its row too

M274 left two bare `.title` renders pinned as a known boundary: the command
palette and the search page print `SearchResult.title` raw, and for the news
family that string is the seed's composed English sentence. The boundary was
honest but not clean — the same sentence leaked through three more string-
shaped doors the census read as data: the AI source line's `name` var, the
answer lead's `{title}` var, and the knowledge-graph node's label, all of
which are glass, and one field that was only ever glass-adjacent: `retrieve`
wrote `RagContext.entityLabel` and nothing in the tree read it.

`SearchResult` gains `titleRow` (news only). The palette and the search page
word it through `rowLine` when present and keep the record's own word for the
four proper-noun families — club, player, competition and match titles are
names, not prose, so their raw display IS the record contract, the same one
their names carry everywhere. The AI layer's three var sites hand the row to
`fillRowVars` the same way it resolves every var, so a 简体中文 reader who
asks about a story reads a Chinese headline in the source line, the answer
lead and the graph's root node. `KgNode.label` becomes a `RowText` and the
canvas resolves it through `rowLine`, taking the ellipsis cut on the READ
words rather than on the row object. The raw `title` stays exactly what
matching needs it to be: the scorer reads it, the ranker checks the question
against it, and no reader prints it.

Clause 37h's pins moved: bare `.title` JSX renders now census **0** across
every shipped module, the single `titleRow` producer and its three consumer
shapes (two palette/search conditionals, three AI var sites) are pinned, and
`proof-ai-grounding`'s source-line check applies its word/`type:id` reads to
whichever half the var carries, so the keyed news name cannot hide behind a
`String(object)` that would always pass.

Measured: `proof-i18n` **355/355** · 2,001 keys × 3 locales; suite **41/41 ·
2,271/2,271**; `npm run build` exit 0. Code as **7864333** (+63 across 7
files); this section is a docs-only follow-up.

### M274 — the seed news sentences leave the glass

M274's measurement opened two probe files and closed most of what they found. The
hardcoded-locale date class was already M225's (the i18n formatter and its guard
clause); the bare toast/confirm class was already M159/M220's scan; the dead-code
candidates from M241's README note were already M242's deletion, leaving only the
three legitimately unreachable config files. What remained was the **template-
literal prose class**: 197 hits, almost all of them dynamic `t()` key templates
(`attr.name.${key}`) and routing/storage keys — code carriers, not copy. The one
real defect was the **seed news text**: `data/footballSeed.ts` composed all 24
articles' headlines from five English templates and the summary from a sixth
English frame, so every screen that printed the record raw — the news list and
article page, the dashboard's breaking panel, the transfer board, the community
starters, and the AI evidence card — put an English sentence on the glass
whatever the locale. The same defect M249 charged for the kind badge, one
sentence-shaped family larger.

The repair gives the record a row beside its matcher data. `NewsArticle` now
carries `titleKey` + `titleVars` (`club`, player surname) while the raw `title`
stays for search scoring and the AI fact layer — data to match on, never a
surface to print. `rowText` gains `newsTitle` / `newsSummary`, the only readers
of the six new rows (`ni.headline.confirmed/reported/rumor/analysis/opinion` +
`ni.summaryLine`, ×3 locales, kind worded through the badge's own lookup). Five
call sites re-compose through them; the community thread quotes the localized
summary line as a **nested row** (M236's row-in-a-row, kind var resolved by the
door), and the rumour board's `RumourLink.title` becomes a keyed `RowText` read
through `rowLine` — `proof-transfers`' grounding check now pins key + vars
instead of string equality. The two bare `.title` renders that remain are the
search results', whose contract IS the record's own word, as club and player
names are; they are pinned as the known boundary of this milestone.

Clause 37h holds the class: bare `.summary` JSX renders census 0, the two bare
`.title` renders pinned at the search sites, composer and `rowLine(r.title)`
call sites pinned (newsTitle's fourth match is the summary composer's internal
wording call), with two planted shapes charging the same pass. The `t()` shape
pins moved with the new calls — literal 1298→1299 (`ni.summaryLine` at the
composer), expression 28→29 (`t(n.titleKey, …)`), literal-with-vars 134→135.
Dictionary 1,995→2,001 keys. `proof-community` and `proof-transfers` moved with
the contract.

Measured: `proof-i18n` **355/355** (was 354) · 2,001 keys × 3 locales; suite
**41/41 · 2,271/2,271** (was 2,270); `npm run build` exit 0. Code as
**4bfedc1** (+163 across 13 files); this section is a docs-only follow-up.

### M273 — the forms the display-prop read leaves outside are held too

The 37f census reads double-quoted strings only, and it names no accessibility attribute —
two gaps in the same class. The **aria display attributes** (`aria-label`,
`aria-placeholder`, `aria-valuetext`, `aria-roledescription`) are the screen reader's copy,
interface text spoken to a user the dictionary never reaches; a bare quoted string on one
is English no keyed sibling exposes. The **quote-form gap** is the same display-name regex
against single quotes and backticks without interpolation, which a quoted-strings-only read
never sees. The measurement walked both classes across the shipped modules and found
eleven aria display attributes: ten resolved through `t()` at the site, and the eleventh —
GraphCanvas's `aria-label={ariaLabel}` — forwarded as a required prop whose only call site
passes `t("ai.graphAria")`. The forward is pinned at its source rather than counted as
prose, because a forwarded label is exactly where a default would hide: the bare read
counts string literals, quoted outright or quoted inside the braces, and an expression
holding an identifier is the pinned shape. Both quote forms read 0 across the tree.

Clause 37g holds all three reads with plants of the same pass: a planted bare
`aria-label`, a planted single-quoted label and a planted backtick label each read 1.
Gate-only — the tree was already clean, so no dictionary row moves.

Measured: `proof-i18n` **354/354** (was 353) · 1,995 keys × 3 locales; suite **41/41 ·
2,270/2,270** (was 2,269); `npm run build` exit 0. Code as **e9ba3d6** (+41 across 1 file);
this section is a docs-only follow-up.

### M272 — display-named props carry no bare prose

M271's walk caught one bare JS label in SimulationLab's stats table because a keyed sibling
sat beside it; the class behind that site is wider than the two pinned shapes. A prop named
for what it displays — `label`, `title`, `sub`, `hint`, `text`, `description`, `subtitle`,
`alt`, `placeholder` — assigned a bare quoted string of three or more Latin letters is
interface copy parked where no translator runs, and no text-node walk can see it. The
measurement walked 158 assigned props across the shipped modules: the data carriers (`key`,
`id`, `labelKey`, `name`, `nation`, `stadium`) are code or data rather than copy, the
community and learn tag sites resolve through the declared dynamic prefixes, and one real
defect came back — `CommandDialog` defaulted its header copy to English
(`"Command Palette"`, `"Search for a command to run..."`) behind the one caller that always
keys both props: an English reflow point waiting for the next caller to skip them. The
defaults are gone and the types require the two props now.

Clause 37f holds the class with one reading everywhere: the census walks every shipped
module and reads **0**, a planted default-param shape and a planted object-literal label
each read 1, and `labelKey`, type annotations, keyed calls and strings under the letter bar
stay outside the read.

Measured: `proof-i18n` **353/353** (was 352) · 1,995 keys × 3 locales; suite **41/41 ·
2,269/2,269** (was 2,268); `tsc --noEmit` exit 0; `npm run build` exit 0. Code as **98ee26f**
(+28/−4 across 2 files); this section is a docs-only follow-up.

### M271 — every word the letter bar cannot see is a decision or a row

M224's deferral had two halves: "the key it needs is a translation" landed at M268, and "the
letter bar is a scan change, its own milestone" is this one. `hasProse` wants three consecutive
Latin letters, so a text node whose every Latin run is two letters or fewer is invisible to
the suite's main raw-UI device — the class that hid `xG (us)` (M268) and `vs` (M270), one
word at a time. The scan change is a walk, not a bar-lowering: check 12's two-shape node read
generalized to every shipped module, the same code-fragment filter, and every node whose
Latin runs all sit at two letters or below has to be accounted for. The walk found **ten
words on fifteen sites**.

Two are decisions, named rather than keyed: the brand's own initial `F` (the logo glyph beside
`t("brand.name")` on three screens) and the `⌘K` shortcut badge — symbols, not copy. The rest
are dictionary rows now: the fixture connector (`common.vs`, asked by DataRoom's match link
and the manager's stat duel), the model's goal figure (`common.xg` — FootballWorld, DataRoom,
and SimulationLab's stats table, whose `label: "xG"` was a bare JS string sitting beside keyed
siblings), the league table's five headers (`mgr.thP/thW/thD/thL/thGD` — 赛/胜/平/负/净胜，
one cell away from keyed `thClub` and `thPts`), and the level badge, which asks the existing
`common.level` word beside the number it labels (Dashboard, AppShell, and the Review tile's
prop — a template literal the node walk cannot see, so its shape is pinned directly).

Clause 37e holds the class: the walk is pinned at exactly the four decision nodes, a planted
markup fixture charges an under-bar word through the same pass (the planted `F` survives the
list, the planted `qq` is charged), and the two prop-string shapes are pinned with plants of
their own. The literal-shape pin moves **1285 → 1298**.

Measured: `proof-i18n` **352/352** (was 351) · 1,995 keys × 3 locales; suite **41/41 ·
2,268/2,268** (was 2,267); `tsc --noEmit` exit 0; `npm run build` exit 0. Code as **8627ff3**
(+80/−10 across 9 files); this section is a docs-only follow-up.

### M270 — the two-letter connector is keyed, not typed

M269's section retired the attribute-position probe with the letter-bar class empty, and the
next measurement walked the word the bar was always blind to: "vs" is two letters, `hasProse`
wants three consecutive ones, and the connector between the two sides of a score line reached
both Chinese locales as bare English text in two shapes — a text node between a closed element
and an expression (`</span> vs {…}`) twice in [ManagerOS.tsx](features/manager/ManagerOS.tsx)'s
season panel, and a whole text child (`>vs<`) in
[ScoutingPanel.tsx](features/scouting/ScoutingPanel.tsx)'s compare header. The suite knew
about the word: check 12's `CODE_TEXT` carried "vs" as a *decision* — a separator that reads
the same in all three locales — explicitly not a gated fact, which is another way of saying
nothing would catch it.

The manager's side asks the row it already had — `mgr.vs`（vs / 对阵 / 對陣）， asked one section
title away in the same file — and the scout gets its own row, `scout.vs`, the same pair. The
decision list is empty now, and the class moves from an excuse to a gate: clause 37d pins both
bare-vs shapes at zero across every shipped module (the dictionary stays outside the scan,
because an English row may legitimately say vs — the Chinese reader never reads that row), and
a planted instance of each shape is charged by the same read, so a scanner that stopped seeing
either shape says so instead of printing a green zero. The literal-shape pin moves
**1282 → 1285**: two manager sites and one scout site now ask for the word.

Measured: `proof-i18n` **351/351** (was 350) · 1,988 keys × 3 locales; suite **41/41 ·
2,267/2,267** (was 2,266); `tsc --noEmit` exit 0; `npm run build` exit 0. Code as **de46f5c**
(+35/−9 across 4 files); this section is a docs-only follow-up.

### M269 — the last ungated answer surface reads rows end to end

M268 left the letter bar where M224 deferred it and measured around it, so the next
measurement walked that class itself: an attribute-position probe over every shipped file —
`label=`, `title=`, `alt=`, `placeholder=`, `aria-label=` — came back **zero** literals with
Latin letters, so the class has no standing members and the probe stays a dev-side scratch
file rather than a scan the suite has to feed. What the walk turned up instead is the match
page's AI panel: the second answer surface, and the only one with no gate at all — it handed
`askFootballAI` four facts as English strings, took back a single composed sentence, and
interpolated those facts as `{fact}` values, so every English sentence the caller built
reached both Chinese locales verbatim, in the lead and again in the evidence list. That is
M224's banned shape — prose riding a value var outside the domain — surviving one screen
longer because value slots sit below every prose scan.

[data/ai.ts](data/ai.ts) takes rows now — `context: { label: RowText; facts: RowText[] }` —
and returns rows: `text` is a lead row, one fact row and a confidence row; `evidence` is the
fact rows themselves; `sources` name the match and the engine through keys. The seeded draw
reads the label's ENGLISH reading (`englishRow(context.label)`), which resolves to exactly
the string the old caller passed, so the seeded pick does not move when the reader switches
language. [Details.tsx](features/football/Details.tsx) asks its questions as `ai.qf.*` rows
and renders the answer line by line through `rowLine` — the way every other row in the
product is read. Three dictionary rows the string path leaned on (`ai.answer.text`,
`ai.evidence.fact`, `ai.src.matchLabel`) are deleted rather than orphaned; ten rows exist in
all three locales.

The gate lands with the change, not after it. `proof-ai-grounding` gains the path's first
behavioural contract: seven checks walk a real scheduled fixture through all three locales —
the answer is a list of rows, the lead is the question's own key, the evidence is the fact
rows themselves, no placeholder or bare key survives, a Chinese reader reads a Chinese answer
with none of the caller's English left, the seeded pick is reader-independent, and a second
draw returns identical rows. `proof-i18n` gains clause 37c: the provider's signature is
pinned in source with a planted `RowText[]` fixture that must read and a planted `string[]`
one that must not, the page's question keys are counted, and the key swap is asserted
complete; the shape census stays at 1282 because the milestone adds no `t()` call site.

Measured: `proof-ai-grounding` **63/63** (was 56) · `proof-i18n` **350/350** (was 349) ·
1,987 keys × 3 locales; suite **41/41 · 2,266/2,266** (was 2,258); `npm run build` exit 0.
Code as **a3f7b5d** (+141/−26 across 5 files); this section is a docs-only follow-up.

### M268 — the one label the letter bar hid

M266's section handed the next unit to the standing queue's demo-coach prose, to be measured
before anything was written for it. The measurement retired the queue instead: the coach's
composed sentences have been `RowText` since M222, `data/intelligence.ts` sits behind a cap of
0, and the archetype names M173 flagged as English-under-zh ride the `codeWord` door
(`dna.arch.*`) — so "measure first" showed the queue had already been closed by its own earlier
milestones, and the honest next step was to measure for a real defect rather than convert
something to fit the paragraph.

The defect it found is [ManagerOS.tsx:167](features/manager/ManagerOS.tsx): `label="xG (us)"`
beside `:168`'s `t("mgr.xgThem")` — one `Fact` row where the two halves of the same fact were
keyed differently. The raw-UI scan never saw the literal, and that is the point: `hasProse`
wants three consecutive Latin letters and `xG (us)` is two on each side of the bar, so the one
screen registered as fully localised printed a Chinese label over an English one, in the same
row, to both Chinese locales, for as long as the pair has existed. The class was named when it
was found (M224's "still not claimed") and deferred as "the key it needs is a translation and
the letter bar is a scan change, each of them its own milestone" — this is the first half of
that deferral landing.

`mgr.xgUs` joins its sibling in all three locales — `xG (us)` / 预期进球（我方） / 預期進球
（我方）， the same 我方/对手 pair the dictionary already draws — and the label asks for it.
Section 37b holds the site: the file is pinned at **zero `label=`-attribute literals**, a
planted literal under the bar is charged by the same read, and the `mgr.xgUs`/`mgr.xgThem`
pair must resolve to dictionary rows in both slots across the three locales. The class-wide
device — lowering or sidestepping `hasProse`'s letter bar — stays what M224 deferred it to, a
milestone of its own, now with a name and a site to test it on. The new call site moves
section 37's literal-shape pin **1281 → 1282**.

Measured: `proof-i18n` **349/349** (was 348) · 1,981 keys × 3 locales; suite **41/41 ·
2,258/2,258**; `tsc --noEmit` exit 0; `npm run build` exit 0. Code as **9197469** (+21/−2
across 3 files); this section is a docs-only follow-up.

### M267 — the suite audits its own blind spots, and the zeros have to prove they bite

A clause that asserts `=== 0` passes in two worlds: the debt is gone, or the scan behind it
stopped reading anything. M247 banned the population pins that could not go red
(`X === X`), M254 replaced a spent cap with a plant — and three of this file's oldest
verdicts still carried neither device: the placeholder agreement, the call-site unknown-key
rule, and the sentence-duplicate rule. This milestone plants each one
through the same predicate its zero walks: `varsOf` on a pair that does disagree, the
`STATIC` regex plus the `in en` test on a key the dictionary does not hold, and the
length-floor plus bucket map on a fixture pair that is a duplicate. Three clauses, each
green only if the zero above it is measured.

Section 38 generalizes the device into a census. It parses every proof script's `ok()`
calls — this file included — and counts the clauses still asserting a zero with none of
the three instruments the suite already uses: a plant in the clause, a floor or pin in
the clause, or a planted companion within eight lines, which is how the suite writes them.
The count is pinned at **384 as a ceiling that may only fall**: adding a zero-asserting
clause without one of the three has to be paid for here, in the same commit, the same
bargain every other ceiling in this file asks for. And the census audits itself last — a
source it cannot split into clauses would count zero clauses and zero debts, so a fixture
with one unguarded zero-asserting clause must read as exactly that.

Measured: pure gate change, no app or dictionary edits — `proof-i18n` **348/348** (five new
clauses: three plants plus the census pair), suite **41/41 · 2,257/2,257**. The ceiling
opens at 384 owing; the direction from here is down.

### M266 — the family the last gate read as a near-miss and refused to charge

`club`, `player`, `competition` are three of the five retrieval kinds, and section 45's
set-relation scan saw them as a subset of a different space and deliberately left them alone.
That was correct for the retrieval family and left the favourite family with no reader at all:
the space was typed by hand three times — the control's prop, the store's action, the store's
public API — its display key was built at the screen (`t(` + backtick + `fav.${kind}.active` +
backtick + `)`), and the two chains that resolve a kind to a profile slot were ternary runs
ending in a fallback arm, so a kind outside the space resolved to the competition slot on both
sides of the app.

`FAVORITE_KINDS` is now the one runtime list and `FavoriteKind` derives from it. `FAVORITES` is
a `Record<FavoriteKind, { read, write }>` whose two functions name the same field in the same
literal: the control reads the slot the store writes, a fourth kind is a missing row rather than
a button that quietly sets your league, and a fifth favourite field on the profile is an orphan
the gate names by row. `favoriteLabel` in `domain/rowText.ts` is the only module that builds a
`fav.*` key. The family cannot ride `codeWord`: asked for `club` the door answers the legend's
word, because its table is name-blind and the retrieval branch is reached first — M263's
collision, on a second family.

Section 46 adds four checks, each with a plant the same detector reads. The exact-three census
charges a planted union and a planted array (2 read, 2 charged) while a planted five-name list is
not even a candidate of the space and a planted two-name subset is read but uncharged. The slot
clause walks the real rows and requires read === write, the field on `UserProfile`, and no orphan
field. The composer clause counts interpolation sites per module (2 in `domain/rowText.ts`, 0
anywhere else) and names the one screen that calls it. The behavioural leg drives the shipped
composer through the shipped door for 3 kinds × 2 states × 3 locales and requires the answer to
be the dictionary row — never the key, never the code — and the three kinds to give three
different words, so the answer cannot be a constant.

Three pre-existing measurements moved with the conversion and were repaired, not loosened: the
dynamic-site declarations re-pointed from `Details.tsx` to `rowText.ts` (check 16: 86 live sites,
0 undeclared, 0 stale); the `fav.|kind` value space re-anchored off `setFavorite: (key: "club" |
…` onto the runtime list, because an anchor reading a consumer cannot tell a definition from a
copy; and section 45's near-miss pin became a row-by-row pin (`domain/newsImpact.ts=2
domain/types.ts=3`) instead of a count of 4, since a count would let either row migrate files
without being read.

Measured: `proof-i18n` **343/343** (was 339) · 1,980 keys × 3 locales; witness arms **7/7
MATCHED** (control 0 reds; A1/A2 — re-typing or copying the space — 2 reds each, one of them
section 45; A3/A4 slot rows 1 each; A5 screen-built key 2; A6 a composer naming a key that does
not exist 3). Round 1 scored 5/7: A4's anchor missed on CRLF, and A6 predicted the reachability
check and it stayed green — reachability builds its candidates from the DECLARED suffixes, so it
cannot see what the composer actually writes; the carrier there is 46.3. `npm run build` exit 0,
`npm run proof` **41/41 · 2,252/2,252**, code and gate as **a52c70b** (+156/−20), and the frozen
`git archive HEAD` plane at that commit reproduces **343/343, 0 reds**. This section is a
docs-only follow-up commit, so the milestone number was claimed from `git log` before it was
written.

Next unit, and a correction that had to be paid first: an earlier draft of this paragraph claimed
`domain/newsImpact.ts:15`'s `role: "player" | "club"` was *the last* quoted union in `domain/` with no
list behind it, and that the news detail printed that field's own words from a second table. Both halves
are false, and enumerating every `role` site is what showed it. Measured: `domain/*.ts` carries **43**
inline quoted value-space union spellings (excluding `Pick<…>` key lists, which are not value spaces),
**13** of them backed by a runtime string array and **30** not — so the first claim was wrong by an order
of magnitude, and 30 over-counts the residual anyway, because several of those spaces do have a runtime
carrier in the other shape the tree uses: `STANCE_KEY: Record<NewsKind, string>` (`newsImpact.ts:49`) and
`CERTAINTY_TONE: Record<Certainty, string>` (`newsImpact.ts:134`). And `ImpactEntity.role` has exactly one
reader — `domain/newsImpact.ts:86`, `if (e.role === "player" && e.clubName)`, a branch — plus two writers,
`FootballWorld.tsx:360` and `:367`. The panel displays the entity's `label`, never its role, so the code
never reaches the glass. Section 45 reading it as a 2-name subset (`domain/newsImpact.ts=2` in
`SK_NEAR_PIN`) and declining to charge it is therefore correct, and converting it would have been
inventing a defect to satisfy a paragraph.

The lesson for the census is that *a quoted union with no list behind it is not the signal* — most of the
30 are not defects. The signal is a stored code reaching a reader-visible string, and that class is
already closed on its own evidence: check 16's dynamic-site scan reports 86 live sites, 0 undeclared,
0 stale. So the next unit comes from the standing queue rather than from this count: **#150 / M160**, the
demo coach's generated prose, measured before anything is written for it.

### M265 — the app's oldest value space stops being typed by hand in four places

`club`, `player`, `competition`, `match`, `news` is the space the search layer was built on, and it
was the one enum family the raw-UI audit could not see: it reached the glass through a variable. The
command palette interpolated the stored code — a reader in `zh-CN` saw `club` on the chip — while
the knowledge canvas built its own `ai.legend.` + kind key beside the door. Five names, four hand
copies: `SearchResult.type`, `KgNode.type`, the canvas's colour table, and the search page's section
list. A sixth kind was a compile error in none of them at once and an unnamed colour plus a
code-printing chip in all of them.

`SearchKind` now derives from `(typeof SEARCH_KINDS)[number]`, every carrier is typed against it, the
door claims the family and `searchKindLabel` words a kind THROUGH the door rather than beside it. The
palette's React key and cmdk's filter value keep the code on purpose: that is the app's own identity,
not the reader's copy.

Section 45 charges the drift in four checks, and every negative is bound to a plant the same detector
reads. The detectors work by set relation, never by listing the five words: a carrier is charged when
a quoted union or an array literal holds EXACTLY the family, while a favourite's three names and a
news-impact role's two are printed as a different space. Typing `club|player|…` anywhere in the 95 app
modules is now a red check without the gate ever naming a kind.

Three pre-existing checks moved with the conversion and were repaired, not loosened: `DYN_SITES` lost
the AiStudio legend site (check 16 read it `stale`, and the t()-shape census went 99 → 98), the
`fw.type.` anchor had to become annotation-blind because `SEARCH_TYPES` now carries a `readonly
SearchKind[]`, and section 44's import pool is keyed by MODULE — a file taking a value and a type from
`./types` in two lines registered the module twice and read every list it exports as UNRESOLVED
(cwTotal 95 → 67).

The witness caught a hole in my own scan. Arm A7 re-added a screen-side legend lookup, and instead of
the charge moving, the census count moved: 10 → 9. The text-child pattern was `>{…}<` with `[^{}]+`
inside, so a display site written as `t(` + backtick + `ai.legend.${r.type}` + backtick + `)` — the
exact pre-M265 spelling — was invisible to it. The scan is now a balanced brace walk, and the pin was
re-measured after inspecting all fifteen sites the widened walk newly reads (`{searchResults.map(...)}`
and friends: real children, containers rather than display slots): **25 read, 0 charged**, with three
plants — a bare code in a child charged 1, a worded composer charged 0, a template-shaped child read
and charged 0.

Measured this run: `proof-i18n` **339/339** (was 335) · 1,980 keys × 3 locales; `npm run build` exit 0;
`npm run proof` **41/41 scripts · 2,248/2,248 checks**; witness arms **18/18 as predicted** in round 2 —
round 1 scored 11/18 and every mismatch was prediction-side, seven of them a pre-existing check that
binds the same fact (the graph's drawable-kind list; `DYN_SITES` and the t-shape census always move
together; renaming one dictionary row reddens 7 checks under 4 names: locale parity both ways, space
completeness, key reachability). Code and gate landed as **9669755** (+257/−22); the frozen
`git archive HEAD` plane at that commit reproduces **339/339, 0 reds**. This section is a docs-only
follow-up commit, so the milestone number was claimed from `git log` before it was written.

Next unit, measured rather than guessed: the favourite family's triple copy — `features/football/Details.tsx`
and two sites in `store/useFootballOS.tsx` spell a three-name union and `domain/newsImpact.ts` a
two-name one, all subsets of a different space with `fav.<kind>.active/idle` keys. Section 45 reads
them and deliberately does not charge them; the unit is to give that family its own door.

### M264 — the door answers by SPELLING, so which branch is written first is load-bearing

`codeWord` is how the row door words a code for 26 variable names, and it is not a table keyed by
family. It is an ordered chain of fourteen `if (<list>.includes(code)) return t(<key>)` lines:
nothing in the question names the family the value came from, so two families that ever spell one
code do not tie — the earlier line answers for the later one, and every reader of the later family
gets the wrong word with no error raised. M263 charged one instance of exactly this (`GK`, `CB`,
`DM`, `CM`, `ST` are each both a `PositionGroup` id and a position abbreviation) by moving the
`position` var onto a NAME dispatch, and after that nothing read the rest of the chain. An
attribute key one day spelled `player` would have been answered by the graph-legend branch five
lines above it. This unit reads it.

Measured today, and derived rather than copied: **14 branches, 95 codes, 91 pairs, 0 shared**
(`0:ATTRIBUTE_KEYS=32 1:POSITION_GROUPS=8 2:MODES=3 3:ARCHETYPE_KEYS=10 4:SEARCH_KINDS=5
5:NEWS_KINDS=5 6:MATCH_STATUSES=3 7:FOOTS=2 8:RECORD_FEELS=3 9:TRAJECTORIES=3 10:CATEGORIES=4
11:SHOT_TYPES=7 12:isGoalCode<-GOAL_CODES=6 13:isAgeGroupWord<-TRANSLATED_AGE_GROUPS=4`). The
branch table is scanned out of the shipped function body with a balanced-paren read — a regex over
the line stops at the `)` inside `(X as readonly string[]).includes(code)` — and every branch is
matched to an exported list of a module `domain/rowText.ts` itself imports. The two predicate
branches are matched the same way as the named ones: to the single exported array every element of
which that predicate accepts, which is why those two lines print `<-GOAL_CODES` and
`<-TRANSLATED_AGE_GROUPS` in the clause's own message. A branch that consults a list nobody
registers comes back `UNRESOLVED` and reddens clause 1, and the clause asks that question of a
deliberately unregistered name in its own condition, so "all resolved" cannot be a claim about a
resolver that resolved nothing.

The behavioural half feeds all 95 codes through the shipped door with a recorder standing in for
the dictionary: each must ask exactly one key, and it must be **its own branch's** key — that is
the shadowing test, because a spelling two branches claim asks the earlier one's prefix. A code no
branch claims must ask nothing and be returned exactly as written. Then disjointness runs twice,
over the loaded lists and over a planted table where a later branch re-claims one foot code, so a
`0 shared` means *no collision* and never *no scan*; clauses 2 and 3 also pin the 95 as a floor
after the first read showed a narrowed scan could otherwise print "0 mismatched" about an empty
set (arm A3's red messages do print `all 0 codes`, which is the floor doing its job).

The seed for this surface had a bug, and the record keeps it. Its first probe was lexical and cut
each list with `[^\]]*`, which stops at the `]` inside `readonly Mode[]`: nine of fourteen spaces
read as empty, two more pointed at the wrong module, and the probe still printed a clean
"0 shared". The gate is immune because its pool loads the modules instead of slicing their
source, but the failure mode is a real one, so arm A3 encodes it (`cwImports = []` must redden
three clauses, not report a tidy census) and every branch's member count is printed in the
message so an empty space names itself.

**7/7 arms MATCHED**, control 336/336 green, every restore byte-exact.
A2 was wrong on the first round and is the interesting one. It replaced the body slice with the
whole module and predicted three reds; it came back 336/336 **green**. `rowText.ts` has exactly 14
`) return t(` lines and all 14 are inside `codeWord` (measured over the file and over the
function's own range), so a superset region of the same file cannot read a different table: the
arm was vacuous and proved nothing, and the body scoping it aimed at is defense for a line added
later, not a hole observable today. Re-aimed at the claim that does bind — which module the
census reads — the mutation is real: pointing it at `domain/attributes.ts` walks 0 branches and
three clauses redden. What that arm forced into the gate is the better half of the unit: the
scanned file is now named once, and the clause's own sentence prints that name, so a census
pointed elsewhere can no longer report that it walked the door's file.

+3 clauses: **336/336** against the frozen `git archive HEAD` plane (`0aedbe6`) at **333/333** —
+3, +0 red. Nothing in the app changed and none of it was broken: the collision set is empty
today, so this is the first unit of the arc whose diff is the gate and the record only, closing a
class of defect rather than a present one. Measured on the working tree: `tsc` rc=0, `npm run
build` rc=0, suite **41/41 · 2,245/2,245 · exit 0**, dictionary **1,980 keys · 3 locales** and the
literal-shape pin **1,281** both unmoved, as they must be when no string was added or moved.

### M263 — the seventh family, and the first one the census was blind to

M256 named this family third and last of the keyless ones: a player's position is one of
eight English abbreviations — `GK`, `CB`, `LB / RB`, `DM`, `CM`, `AMC`, `LW / RW`, `ST` —
and every one of them reached the glass as itself. Twelve text nodes in eight screens, and
one line in `ui/primitives.tsx`: the shared `PositionTag`, which seven attribute sites hand
their code to. That chrome module is why this unit is not a copy of M259–M261. In those
families the conversion was N call sites in N screens; here the centre of mass is a single
component, so a census that only walks screens would have called the badge done while the
badge printed `CM` at every reader in every locale. It took a mutation arm to find out
whether the census could see it — and the first arm proved it could not.

Eight `pos.*` keys in all three locales (1,972 → **1,980**), `PositionCode` in
`domain/types.ts` with five fields typed to it, and `positionLabel` as the composer. The
row door had to change shape rather than grow: `GK`, `CB`, `DM`, `CM` and `ST` are both a
`PositionGroup` id (M255) and a position abbreviation, and `codeWord`'s table is
name-blind — asking it for `GK` answers "Goalkeeper", which is the group's word, not the
badge's. So `fillRowVars` dispatches that var on the variable's NAME (`position` here,
`group` over there), and one spelling can no longer lend its answer to the other family.
Three older wounds closed on the way: `worldEngine` carried a hand copy of the position
labels that disagreed with the table it shadowed (`RB`/`RW`/`CDM`/`CAM`, four spellings no
producer writes), the type-space clause found `domain/transfers.ts` still typing a
rumour's position as any string, and two defects were in the gate rather than the app —
the switch-case extractors scanned the whole module, so the bucket family's five codes were
being compared against six matches that included `positionLabel`'s `case "GK"`, and the
prose ratchet charged `"LB / RB"` as key-carrying prose.

Section 43 adds ten clauses: the wiring table (9 modules / 13 positions, each importing the
composer), the display census — now four named buckets, because the receiver is optional
and `(` marks a binding rather than a slot: 0 on the glass, 7 badge attributes, 2 rank
templates, 1 pattern excluded by name — the union's eight codes against the switch's eight
cases, the collision clause (`GK` through `group` versus through `position`, each answered
from its own table in all three locales), the single-composer clause (one module names a
`pos.*` key, eight times), 24 behavioural readings of which **16** differ from the code
already spelled — en keeps the abbreviation, so this family's differ pin is an honest floor
rather than the whole count — the unknown-code fallback, 24 door readings through
`position` including the fact that words a CM in Chinese, the type space, and the extractor
scope clause that the gate's own defect needed.

Witness: **9/9 arms MATCHED**, control 333/333 green, every restore byte-exact. Three of
them were wrong on the first round and the record keeps the reason. A2 lost one switch case
and predicted four reds; six came back, and the two extras are this family's own structure
— the composer's switch is the only reader a `pos.*` key has, so dropping a case orphans the
key and M145's reachability gate is what catches it, and the eight switch literals are what
the t()-shape pin counts, so 1,281 → 1,280. A6 took `position` out of `CODE_VARS` and
predicted the collision clause green; it reddened, correctly — that clause answers through
the door, and a var the door does not recognise cannot be worded by it either. A5 is the
finding: unwrapping the badge reddened the wiring table and left the census green, because
the pattern demanded `x.position`. The fix makes the receiver optional and binds that shape
to a plant carrying one of each bucket, then adds A8 — re-tighten the pattern and the tree
still reads 0 on the glass, so only the plant can betray it, and exactly one clause fires.
Measured on the working tree: `tsc` rc=0, `npm run build` rc=0, suite **41/41 · 2,242/2,242
· exit 0**, `proof-i18n` **333/333** against the frozen `git archive HEAD` plane's
**323/323** — +10 clauses, +0 red — and the literal-shape pin 1,273 → 1,281.

### M262 — check 24 walks the whole tree, and the five-directory filter leaves the gate

Section 37 never touched check 24's five-directory walk — it covered all 95 modules with its
own supply contract instead, and said so in its header comment. That was defense in depth
with an asterisk: the older, load-bearing fill scan still skipped `components/ui` and
`src/App.tsx`, whose six literal sites no fill contract ever read. This milestone removes
the filter at the source. The numbers do not move — 134 filled, 134 var-carrying, 0
unreadable, exactly as before — because a varless site is skipped before its arguments are
parsed, which is also why the hole survived every census unnoticed. What moves is the
population the scan promises: one new clause pins 95 modules walked, names the three
outside files, and counts their six sites seen by the regex, so a reintroduced filter
reddens here rather than silently narrowing the scan. Section 37's full-population supply
stays beside it — different parsers, same contract, each blind to the other's bugs by
construction — and its header comment now tells the story in the past tense.

Measured at the landing, on a frozen `git archive` plane rather than a working tree:
`tsc` rc=0, `npm run build` rc=0, suite **41/41 proof scripts · 2,232/2,232 checks · exit 0**,
`proof-i18n` **323/323**. The working-tree run recorded 2,231 and 322, one clause short —
see the correction in M260's section. No app or dictionary change: the only edit besides the
gate is the comment tense.

**The landing (0486209) is where the plane and the arms finally ran — six milestones late,
but on bytes that can be re-derived.** Two sibling planes of `git archive adaf111`, one with
the ten stacked files and one without, give the honest attribution: HEAD's `proof-i18n`
counts **300** checks and the stack's counts **323**, and the clause-name multiset (digits
collapsed, so a renamed clause cannot pass as a new one) shows **28 added forms against 5
removed** — the +23 is new clauses, not re-labelling. `tsc` rc=0; `npm run build` rc=0 with
37 dist files and 1,495,053 B of JS against M256's 1,492,522 (**+2,531** for three composers,
a row contract and seventeen keys); dictionary **1,955 → 1,972**.

Witness: **23 arms** on the frozen plane, predictions written into
`dev/stack-arms.mjs` before its first run — **23/23 MATCHED, zero UNNAMED reds, plane
re-hashed clean afterwards**. Every clause the stack added is broken by at least one arm:
each family's wiring table, bare-display census, value space, single-composer census,
behavioural readings and fallback; both row doors shut; the kind alias rewired; check 24's
filter put back. Three arms score exactly one clause each (the foot door, the alias, the fill
population), which is what makes them clauses rather than decoration. Five of them are
M257's own arms re-run on the final bytes, and that re-run was not ceremony: the arm table
inherited from M257 carried a `CODE_VARS` needle that M259 had already overwritten, so its
A3 had been measuring nothing for three milestones — a stale needle is a no-op mutation, and
the script now counts every needle against the plane's current bytes before the first gate
invocation. Its first launch died on the same preflight for a different reason: the probe
"hands its chip to the composer" turns out to be shared by four loop clauses, so an
arm-table probe must be unique in the control's own output, not merely distinctive.

A three-locale browser walk (one reload per locale, because the provider reads the locale
only at mount) reaches the search rows, the foot sites and the bucket sites with the
dictionary's own words and no raw key, brace pair or `[object Object]` anywhere. The session
screen's phase tag stayed unreachable in the browser through two input methods, so M261's
evidence is this gate plus a headless render — it is not claimed as live coverage. And the
qualification that applies to every section above: only the totals in this paragraph are
re-derivable from a commit, because the per-milestone figures M257–M261 record were measured
on working trees that no snapshot preserves.

### M261 — the drill phase stops shouting its code, and the sixth family gets its census

M256 measured three families worse-off than the subtitle hole for having no value keys at
all and named this one last: a drill's session phase (`warmup/technique/decision/game/
cooldown`) tagged each exercise in the session screen, upper-cased by CSS so every locale
shouted English. The only display position in the tree; filters and comparisons elsewhere
stay codes, and the career arc's trajectory phases are a different family that never
reaches a display slot. The fix is one composer, `phaseLabel` — a switch of static
literals like the bucket composer, because no row will ever carry a phase — with
`DrillPhase` + runtime `DRILL_PHASES` in the domain types. The `uppercase` class goes with
the code: it only made sense while the tag was an identifier.

Section 42 adds six clauses: the wiring table (1 file / 1 position), the bare-display
census (any receiver, but resolved sites excluded — a site inside `phaseLabel(` is the
wiring clause's business, this one catches the shape going back to raw — plus no
`>warmup<`-style text node and the planted pair), the union's type against the switch's
five cases, the single-composer clause (exactly one module quotes a `training.phase.*`
key, five times), the behavioural readings (**15/15** differ from the code), and the
unknown-code fallback. The keys live under `training.phase.*`, not `drill.*`: proof-training
owns that prefix for the drill catalogue (every `drill.*` key must name a catalogue drill),
and five phase keys would read as fifteen orphaned drills. That collision is what the
first full-suite run caught — `proof:training` 43/44 — and the namespace is the fix.

Measured on the working tree: `tsc` rc=0, `npm run build` rc=0, suite **41/41 proof scripts
· 2,231/2,231 checks · exit 0** (six more than M260's corrected 2,225: this section's six
clauses), `proof-i18n` **322/322** against its previous 316. The dictionary grows 1,967 →
**1,972** keys. Both totals were one check low as written, and the reason is M260's
miscounted section rather than this one's own clauses. The plane and the arms ran at the
landing; the record is in M262's section.

### M260 — the filter buckets stop shouting their codes, and the fifth family gets its census

M256 measured three families worse-off than the subtitle hole for having no value keys at
all and named this one second: `PosBucket` (`ALL/GK/DEF/MID/ATT`) reached the glass in the
scout filter chips, printed raw — and, as the correction at the end of this section
records, in two more label slots in the same file that the chip loop's own variable read
never reached. Every other use of a bucket is order, identity or comparison. The fix is one
composer, `bucketLabel`, and it is a
switch of static literals rather than a `codeWord` branch on purpose: no row will ever
carry a bucket, so there is no door to open, and every key the composer can name stays a
literal the t()-shape census reads as one. The chip keeps `key={b}`, `bucket === b` and
`setBucket(b)` exactly as they are — code stays the code where it is an identity.

Section 41 adds seven clauses: the wiring table (1 file / 3 positions, importing the
composer), the chip loop read out of the `BUCKETS.map` the file declares (composer in,
`{b}` out, identities kept, plus no `>ALL<`-style text node anywhere and the planted loop
reported bare), the collected-value bare-display census for the two slots that loop cannot
see (`{r.bucket}` and `{p.b}` read by name, the planted pair caught at 2 and both resolved
shapes clean at 0), the union's type against the switch's five cases (compared, not trusted,
with a planted two-case switch proving the extractor counts), the single-composer clause
(exactly one module quotes a `scout.bucket.*` key, five times), the behavioural readings
(**15/15** differ from the code — `ALL` vs `All` differs by case alone, which is why the
pin counts), and the unknown-code fallback. Five new sentence keys (`scout.bucket.*`),
all three locales, singular role nouns to match `group.*`.

Measured on the working tree: `tsc` rc=0, `npm run build` rc=0, suite **41/41 proof scripts
· 2,225/2,225 checks · exit 0** (seven more than M259's 2,218: this section's seven clauses),
`proof-i18n` **316/316** against its previous 309. The dictionary grows 1,962 → **1,967**
keys. Seven clauses green on the first run, census pin moved once and by the predicted
amount (literal 1263 → 1268: the switch's five static keys).

**Two corrections this landing carries, both of them about this section.** (1) The section has
seven clauses, not six: the collected-value bare-display census was written and passing but
never counted, and a miscount here propagates — 2,224 was really 2,225, so M261's 2,230 was
2,231 and M262's 2,231 was 2,232, and `proof-i18n` 315/321/322 were 316/322/323. The chain is
now consistent with M259's 2,218 and with the plane measurement recorded in M262's section.
(2) "The only display position in the tree" was the chip loop's own reading, and it was wrong
by two: the squad-profile heading (`ScoutingPanel.tsx:87`) and the best-value pick badge
(`:100`) print a bucket code into a label slot under variables the loop never binds. The
family converts **3 positions in 1 file**, the wiring pin says so, and the gate's own section
header tells the story in those terms — which is the third time this class has had to charge
a display position a sibling milestone's prose had declared nonexistent.

### M259 — the preferred foot stops speaking its code, and the fourth family gets its census

M256 measured three families worse-off than the subtitle hole because they have no value keys
at all, and named this one first: `Player.foot` (`"L" | "R"`) reached the glass at
`Details.tsx:101` as `{p.foot}F`, at `:124` as a bare letter, and at `ScoutingPanel.tsx:226`
as a `L / R` string handed to a translated sentence — plus a fourth through the back door
that only the census found: `ai.fact.player` already writes `{foot} foot` / `{foot} 脚`
around the var, so the word here is the bare side ("Left", not "Left foot") and the sentence
supplies the noun.

The fix follows the family pattern M255/M256 set: `Foot` + runtime `FOOTS` in
`domain/types.ts` (the record field is typed against the union now), a `codeWord` branch and
`footLabel` composer in `domain/rowText.ts`, `foot` opened in `CODE_VARS`, and all three
screen positions reading through the composer. Opening the door converts the intelligence
fact in every locale with no producer edit — the row already carried the code, and now the
door words it. Section 40 adds seven clauses: the wiring table (2 files / 4 positions, each
importing the composer), the bare-display census, the type/runtime pair (2 and 2, compared,
not trusted), the single-composer clause (exactly one module quotes a `foot.*` key, twice),
the behavioural readings (**6/6** differ from the code — single letters, all locales), the
unknown-code fallback, and the row-door clause (the one shipped foot-carrying row renders
the dictionary's own word in all three locales).

Two corrections the first red run forced, both in the new census rather than the app. The
app-wide shape census did not move 104 → 99 on this unit: that pin already read 99 at HEAD,
moved by the M254–M256 composers, and the only half this milestone owns is computed 22 →
23 (the `codeWord` ternary, which names its keys where `STATIC_T` never looks — section 37's
hole, now carrying one more site). And the bare-read extractor was wrong twice: the
receiver sits between the composer and the property (`footLabel(p.foot, …)`), and
`t("fw.foot")` is a dictionary key being named, not a code being printed — quoted strings
are masked before matching, backticks deliberately not, so an interpolation can never hide
a bare read inside a string.

Measured on the working tree: `tsc` rc=0, `npm run build` rc=0, suite **41/41 proof scripts
· 2,218/2,218 checks · exit 0** (seven more than M258's 2,211: this section's seven clauses),
`proof-i18n` **309/309** against its previous 302. The dictionary grows 1,960 → **1,962**
keys. The plane and the arms ran at the landing rather than before it: six of this section's
seven clauses are broken one at a time by arms B1–B7 in `dev/stack-arms.mjs`, and the numbers
above stand (this section's clause count was right). Attribution and the full witness table
are in M262's section.

### M258 — the gate reads the table the app imports

Section 37's pools clause audits `FILM_KIND_KEY` out of `domain/filmInsights.ts`, but the three
badge sites import `VIDEO_KIND_KEY` from `data/video.ts` — today a bare re-export of that
table, and only today by convention. If the alias were rewired to a second table (or the table
grew an eighth, var-carrying row), the gate would keep clearing `FILM_KIND_KEY` while the
screens printed the other table's braces, and proof-film would stay green too: it asserts every
kind translates, not that the table behind the import is the table the gate read. One clause
pins both ends of the wire — the named import, the bare re-export, and the exact seven rows —
with a plant that breaks the re-export into an object literal and a plant that adds an eighth
row, both walked through the same two predicates.

Measured: pure gate change, no app or dictionary edits — `proof-i18n` **302/302**, suite
**41/41 · 2,211/2,211**. This clause was drafted, verified green and then reverted during M257
to keep that milestone's promised scope pure; it lands here unchanged, under its own number.

### M257 — the search subtitle becomes a row, and the ceiling it hung from comes down

M256's ceiling clause named its own fix, so this unit is that fix. `SearchResult.subtitle`
is typed `RowText` now, and all five producers in `data/footballService.ts` hand keyed
`sr.*` rows: proper nouns ride as plain vars (`nation`, `competition`, `source`, `club`),
codes ride as `CODE_VARS` — `kind` was already listed, `status` opens its door here, so the
match row resolves through `matchStatusLabel`'s lookup. The player row names the group
M255 words (`vars: { group: p.positionGroup }`) rather than the specific English label:
"LB / RB" has no dictionary home, and inventing one for eight strings no reader asked for
would be a dictionary job wearing this milestone's clothes. Five new sentence keys
(`sr.clubLine/playerLine/competitionLine/newsLine/matchLine`), all three locales, with
"OVR" kept in English and written as 综合/綜合 beside it — the `world.ageOvr` precedent —
so the still-English clause keeps reading empty placeholder sets on the identical ones.
Both readers resolve through `rowLine`, and `Details.tsx`'s `EntityHeader` prop moves
`subtitle` → `sub`: it renders already-built JSX under the same name in a file that imports
the search module, which is exactly the ambiguity check 28c refuses to guess at.

The gate holds both ends. A new producers clause names all five keys and reads each one
back through the shipped `rowLine` in every locale with representative vars — a group id,
a kind code, a status code, proper nouns, a number — failing on braces left standing or a
record code still legible, with the old bare-string shape and a varless render as plants.
The hole clause lowers its producer pin to 0 and converts its reader half: no `{r.subtitle}`
prints raw anywhere, both readers sit inside `rowLine(r.subtitle, t)` by name, and the old
`subtitle: m.status` shape is still caught. Section 39's variable clause flips on its own
implication — one keyed row carries a status now, and the door is open. The generic row
scan needed no changes: it derives its file list from `RowText` mentions, so the data module
joined it the moment the type landed, and its key-exists/placeholder-match contract covers
all five rows unasked.

Measured on the working tree: `tsc` rc=0, `npm run build` rc=0, suite **41/41 proof scripts
· 2,210/2,210 checks · exit 0** (one more than M256's 2,209: the producers clause),
`proof-i18n` **301/301** against its previous 300. Witness: control plus 5 arms on a `git
archive` plane (`dev/m257-arms.mjs`, predictions in its header before the first run),
**6/6 MATCHED on round 2** — round 1 was 4/6, and both misses were legitimate collateral the
gate was right to report: reverting the match producer orphans `sr.matchLine` (reachability
fires beside hole + subtitles), and a translator's drift trips both parity generations
(check 3's set-compare beside section 36's counts-included one). No UNNAMED reds survived
either round. The dictionary grows 1,955 → **1,960**
keys — the first growth since the M248 deletions, every new key quoted in app code so the
reachability rule claims it. One collateral the census caught honestly: the rename above,
because a second `subtitle` meaning in one import closure is a failure the name census
exists to report.

### M256 — the fixture status stops speaking its own code, and the class gets a census that names the one hole it leaves

M255 left a sentence in this file that this unit has to live with: *the same class has more
families, and each is now measured rather than guessed*. `MatchStatus` was next on that measured
list, and its defect was **worse** than the positional group's, in the same blind way. Three codes
in `domain/types.ts`, with words for all three in all three locales under `fw.status.*` since M169,
and five positions showed them to the reader. A 简体中文 visitor on `/matches` at HEAD read:

- `features/football/FootballWorld.tsx:118` — the fixture row's own status span was `{m.status}`, so
  the match list opened with a **column of English `SCHEDULED`**. No table in the gate could see
  this one, because no table reads `{m.status}` as a key site: it is not a `t()` call at all;
- `:318` and `:325` — the page hint and the empty state each composed ``t(`fw.status.${tab.toLowerCase()}`)``
  themselves and fed the result to a translated sentence, so 「3 场scheduled」 was the shape;
- `:321` — the filter chip composed ``t(`fw.status.${s.toLowerCase()}`)`` out of its own loop variable;
- `features/football/Details.tsx:541` — the fixture header's right-hand slot did it a fourth time
  with `m.status.toLowerCase()`.

So the app spelled one lowercase rule in **three modules** (the four screen sites plus
`domain/rowText.ts`'s own), and `DYN_SITES` — the table that audits dynamic key sites — listed
**four** of those spellings as separate declarations, each carrying its own separately-declared
value space, while the fifth position was in no table at all. That asymmetry is what section 39
closes.

The fix is one export: `matchStatusLabel(status, t)` in `domain/rowText.ts`, now the only module
that composes a `fw.status.*` key, with all five positions calling it. `domain/types.ts` gained
`MATCH_STATUSES` — the union's three codes as a **runtime list**, because the door that words them
is a lookup, not a type. The code stays the code where it *is* an identity: React's `key={s}`, the
selection test `tab === s`, the route write `setTab(s)`, the `m.status === "SCHEDULED"` comparison
in the detail header, and the filter strip's hoisted array, which decides only the button **order**.

**9/9 readings differ from the code**, in every locale, for every code — the same claim M255 made
for 24/24 and M249 could only make for 11/15. All three statuses are upper-case and all three
locales write them in their own words (English lower-cases even the loanword), so the equality
clause cannot be satisfied by a composer that fell through to its unknown-code branch.

Section 39 of `proof-i18n` adds **8** clause sites: the wiring table (2 files / 5 positions, each
file importing the composer from `domain/rowText`), the display-slot census (no `>{….status}<` and
no typed code as a text node, over all **95** app modules), the direct-`t()` variable clause (pin
**2**, with the keyed-row half asserted as an implication because no shipped row carries a status
yet), the chip read out of its own `MATCH_STATUSES.map` loop with `key={s}` / `tab === s` /
`setTab(s)` kept alive, the composer census (exactly **1** module, and the loaded module is the one
whose own declaration list names `matchStatusLabel`), the behavioural readings through the shipped
door, the unknown-code fallback, and — new for this family — **a ceiling clause**.

The three-producers clause is the other structural change: M255 compared two spellings of a space
(the union and `POSITION_GROUPS`); this family has **three**, and the gate now compares them
pairwise — `export type MatchStatus` (3), `export const MATCH_STATUSES` (3), and the screen's
hoisted `["LIVE", "SCHEDULED", "FINISHED"] as const` (3). Each is floored at its own pinned length,
because a sorted-equality over three empty lists would pass.

The ceiling clause is the honest half of the unit. `data/footballService.ts`'s search row puts the
bare `m.status` into `SearchResult.subtitle`, and two modules render `r.subtitle` —
`features/command/CommandPalette.tsx:139` and `features/football/FootballWorld.tsx:545` — so a
Chinese reader searching for a fixture reads `SCHEDULED` in the palette **and still does after this
commit**. This unit did not convert it, because a value that leaves the data layer has to leave as a
*row*, not as a word: that field is `string`, and the row contract (`RowText` + `CODE_VARS` +
`rowLine`) is the change that makes it translatable. So the clause holds the hole at exactly **1**
producer with identity `data/footballService.ts x1` and exactly **2** readers, and it plants a
second record code written the same way to prove it counts. M257 closes it; arm A12 below proves the
ceiling reddens if the fix lands without its own lowering.

Six things moved that were not in the plan, and each is a correction rather than a retune:

1. **The variable clause first measured 134 sites, not 2.** Its capture was written
   `/(?:^|[,{]\s*status:\s*)([^,}]*)/`, and the `^` alternative matches at position 0 of any string,
   so every `t()` object in the app handed the clause its *first* variable — a Chinese reader kept
   seeing the right word and the gate's own reader was the broken part. It is now the same simple
   `/status:\s*([^,}]*)/` section 38 uses, and it reads **2**.
2. **The app-wide t()-shape census moved 102 → 99**, not the −4 a site count suggests. Four template
   calls left the two screens and exactly **one arrived in the composer**, whose ``t(`fw.status.…`)``
   is itself a template site — the lowercase rule now lives in one place, which is the point of the
   milestone. Established by re-running that census's own three helpers (`codeOf` → `callArgsOf` →
   `classifyCall`) over each touched file at HEAD and in the working copy, per file, rather than
   inferred from the tally.
3. **`294 → 300` is +6, and the number was read off a diff rather than a sum.** The gate ran on both
   planes and the two outputs' check names went in as normalized multisets (digits collapsed, so a
   count change shows up as a `+N`/`-N` on an otherwise identical claim). The reading: **+8** section-39
   clauses, **+1** consolidated value-space row and **−3** retired ones — and **two clauses whose names
   merely moved**, because their messages print the composer's declared export list verbatim, which
   grew from 9 names to 10. That last pair is the trap in reading a suite number by name: a
   name-diff reports 11 added and 5 removed claims where the count only changed by 6, and the two
   "extra" of each kind are the same two checks wearing a longer list.
4. **The first full-suite run reported `40/41 · 27 reds` in `proof:i18n`, and all 27 named
   `.m256-plane/…`.** The witness plane had been extracted *inside* the scanned root, so `walk()` —
   which skips `node_modules / dist / .git / .workbuddy-ai / dev` and nothing else — read a second
   full copy of the app: **193** source files against pin 95, 99 `.tsx` against pin 49, and
   `.m256-plane/i18n/dictionaries.ts` charged as a dictionary reader outside `i18n/`. Moving the
   plane to a sibling of the repo made the identical working copy read 300/300. Nothing in the app
   or the gate changed in between: the census counts files, not intentions, and a frozen copy under
   the root is indistinguishable from the root. **A plane is a sibling directory now, always.**
5. The arms script's own preflight refused **before any arm ran**: its `wiring` probe was
   `"read it through the shared composer at all"`, a sentence M249's, M255's and M256's wiring
   clauses all print — 3 gate lines, so an arm that reddened any of the three would have been
   reported as a hit on the one I aimed at. The probe now names the family (`what state a fixture
   is in`).
6. **The suite needed a re-run, not a re-pin.** With the plane outside the root, the same working
   copy read **41/41 proof scripts proven · 2,209/2,209 checks counted · exit 0**, no `FAIL` line, no
   `UNVERIFIED` line and no retry, against M255's 2,203. The 27 reds were never the code's.

**14 witness arms (a control plus 13), 14/14 MATCHED** on the frozen plane, every red a clause name
predicted beforehand, no `UNNAMED` red and no crash: control 300/300; A1/A2 (a wiring needle and the
position pin) and A3 (Details stops importing the composer) and A4 (its wiring row repointed at
FootballWorld) → `wiring`, one conjunct each; A5 (row back to `{m.status}`) → `bareStatus` +
`wiring`; A6 (Details composing the key inline) → `composer` + `dynSites` + `shape` + `wiring`;
A7 (chip prints `{s}`) → `chip` + `wiring`; A8 (hint passes the raw `tab`) → `varClause` + `wiring`;
A9 (the filter strip loses `FINISHED`) → `bareStatus` **only**; A10 (composer returns the code) →
`readings` **only**; A11 (unresolved code returns `X`) → `fallback` **only**; A12 (the hole closed
while its pin stays) and A13 (one reader stops reading `r.subtitle`) → `hole`, its two conjuncts
separately. A9/A10/A11 are narrow on purpose: three producers of one space must be catchable one at
a time, and the fallback clause asks for a code *outside* the union, which a pass-through composer
answers correctly — crediting A10 with reddening it would have meant that clause tests nothing.
After the last arm the plane was re-hashed against the snapshot taken before the first: 7/7 files
identical.

Measured on the frozen plane (`git archive` of `3527e83` plus exactly these five files, byte-verified
against the working copy, `node_modules` joined, nothing tracked edited): `npm run build` exit 0 on
**both** legs — HEAD and change set — **37** output files (35 js / 1 css / 1 other) on each, JS
**1,492,495 → 1,492,522** bytes (**+27**), CSS and other byte-identical (delta 0). `proof-i18n`
**294/294 → 300/300**. `rowText.ts` declares **9 → 10** exports, the dictionary is untouched at
**1,955** keys (the words have existed since M169 — this milestone only starts reading them), and
the import-specifier audit still reads **632** over the same 95-module population: routing five
positions through one door added no module edge.

**Still outstanding** — the ceiling names its own fix. `SearchResult.subtitle` has exactly **5**
producers (all in `data/footballService.ts`) and exactly **2** readers, and **four** of the five rows
put something other than the reader's language in that slot: `m.status` (`:187`), `${p.position}`
(`:174`), `${n.kind}` (`:182`) and the literal English word inside `` `${c.nation} · Competition` ``
(`:178`) — a phrase composed in the data layer, which no component-side scan can see and which
`domain/rowText.ts`'s own header warns about in exactly those terms. M257 types the slot as a row so
a producer has to say which half is a key, and lowers `ST_HOLE_PIN` with it. Three more families are
measured and worse-off than this one, because they have **no value keys at all**: `Player.foot`
(`"L" | "R"`, reaching the glass at `Details.tsx:101` as `{p.foot}F`, `:124` and
`ScoutingPanel.tsx:226`), `PosBucket` (`ALL/GK/DEF/MID/ATT`, `ScoutingPanel.tsx:86`) and the drill
phase `{e.phase}` at `PlayerOS.tsx:296`. Each is a dictionary job before it is a composer job, so
each is its own milestone. `{band.band}` on the load page stays out of the class: it is a numeric
range the model publishes, which is the reason the census is per family and never per field name.
### M255 — the positional group stops speaking its own code to the reader, and the class M249 charged gets a second family

M249 closed the enum-that-reaches-the-DOM for the field it happened to be standing in: every one of
its patterns read `.kind`, so a **different** stored code reaching a **different** slot stayed
invisible to all 37 checks above it. This unit runs the same shape over `PositionGroup` — 8 codes in
`domain/types.ts`, with words for all 8 in all 3 locales under `group.*` since M147 — and finds five
positions in three screens. A 简体中文 reader on a player's detail page read, at HEAD:

- `features/football/Details.tsx:121` — the 「位置组」 row's own value was `CM`, straight out of the record;
- `:188` — the same code fed to `det.scout.hint` as its `{group}` variable, so a translated sentence
  opened with an English abbreviation inside it;
- `features/development/DevelopmentPage.tsx:142` — the role chip rendered the loop's `{g.id}`;
- `:151` — the readiness tile's sub-line composed `t(\`group.${analysis.group}\`)` itself;
- `features/onboarding/Onboarding.tsx:113` — the picker's word line composed `t(\`group.${p.id}\`)` itself.

So the app had **three** modules spelling one lowercase key rule (`domain/rowText.ts:70` being the
other), and a reader-visible code in a slot that already had a dictionary word for it. The fix is one
export, `positionGroupLabel(group, t)`, in `domain/rowText.ts`, and all five positions call it. The
code stays a code where it *is* an identity: `key={g.id}`, `g.id === profile.positionGroup`, the two
squad filters, and the mono abbreviation `CM` in the onboarding tile — which is deliberate, and the
gate keeps `key={g.id}` alive in the chip clause so nobody "cleans" it away.

Unlike M249, where 11 of 15 readings differed from the code and 4 codes were also English words,
**24/24** readings differ here: none of GK/CB/FB/DM/CM/AM/W/ST is any locale's word, so the equality
clause cannot be satisfied by a composer that fell through to its unknown-code branch.

Section 38 of `proof-i18n` adds **7** clause sites: the wiring table (3 files / 5 positions, each
file importing from `domain/rowText`), the display-slot census (no `>{…positionGroup}<` and no typed
code as a text node, over all **95** app modules), the direct-`t()` variable clause, the Development
page's chip read out of its own loop, the composer census (exactly **1** module composes `group.`),
the behavioural readings through the shipped door in all three locales, and the fallback for a code
outside the union. Two producers of the same space are cross-checked — the union and
`POSITION_GROUPS` both pin **8** and must be the same 8 sorted.

Four reds and one crash came from the gate itself while this was being written, and each was a real
correction rather than a retune:

1. the two converted template sites left their `DYN_SITES` declarations stale — which is exactly what
   check 16 reddens, so a declaration with no live site is deleted, not left to rot;
2. the app-wide t()-shape census moved **104 → 102** template sites and refused to stay pinned at the
   old number;
3. the literal-code half first charged `features/manager/ManagerOS.tsx` for `>W<` — a **wins** column
   heading, not a group. The clause now reads multi-letter codes only and prints that collision;
4. the variable clause began at "any `group:` argument" and found **80** sites: property declarations,
   command-palette group keys, achievement groups, and legitimate keyed rows. `CODE_VARS` already lists
   `group`, so those rows are resolved at render by `fillRowVars`; the charge is aimed at the **1**
   direct `t()` call that hands a code to a sentence, and the door the other path rides is asserted in
   the same breath (drop `group` from `CODE_VARS` and that clause reddens even though no screen moved).

Nine witness arms, all run on the frozen plane, **9/9 MATCHED** — control 294/294 with no red, then
A1/A2 (a wiring count and its pin) → `wiring`; A3 (row back to `{p.positionGroup}`) → `bareGroup` +
`wiring`; A4 (Onboarding composing the key inline) → `composer` + `dynSites` + `shape` + `wiring`;
A5 (`group` out of `CODE_VARS`) → `varClause`; A6/A7 → `readings`; A8 (unresolved code returning `X`)
→ `fallback`. A7 predicts `readings` **only** on purpose: the fallback clause asks for an *unresolved*
code, and a pass-through composer answers it correctly, so that mutation must not be credited with
reddening it. Two attribution records, because both were true findings: the first arms run **crashed**
rather than reporting a red — my clause table keyed the wiring probe on `"at all 5 position"`, i.e. on
the very number arm A1 mutates, so a legitimate `wiring` red matched no probe and `undefined` reached a
destructure. Probes are now number-free and the script refuses up front unless each one matches
exactly one clause line in the gate. And A4's *prediction* missed the shape census on run 1: it was
added to the table after being attributed, not after the number moved.

Measured on the frozen plane (`git archive` of `9d97a40` plus exactly these five files, node_modules
junction, nothing tracked edited): `npm run build` exit 0 both legs, **37** output files (35 js / 1 css
/ 1 other), JS **1,492,460 → 1,492,495** bytes (**+35**), CSS and other unchanged (delta 0).
`proof-i18n` **289/289 → 294/294** — the +5 is fully attributed: 7 clause sites added, and the two
removed `DYN_SITES` declarations take their two per-site space-coverage checks with them. Whole suite
**41/41 scripts · 2,198 → 2,203 checks**, 0 `FAIL` lines on either leg. `rowText.ts` declares **8 → 9**
exports and the import-specifier audit reads **630 → 632** over the same 95-module population.

**Still outstanding** — the same class has more families, and each is now measured rather than
guessed: `MatchStatus` (3 codes, words for all 3 in all 3 locales) has one raw display slot at
`features/football/FootballWorld.tsx:118` while four other sites in two files compose `fw.status.*`
inline; `Player.foot` is `"L" | "R"` and reaches the glass three times including `{p.foot}F`, with no
value keys anywhere; `PosBucket` (`ALL/GK/DEF/MID/ATT`) prints `{r.bucket}` as a heading with no keys
at all; the drill phases print `{e.phase}`. `{band.band}` on the load page is *not* in the class — it
is a numeric range the model publishes, which is why the census is per family and not per field name.

### M254 — the last two counted literals in data/intelligence.ts were a regex, not prose

`data/intelligence.ts` carried a named cap of 2 since M184 — the one hole in the `data/` exemption,
because its strings are the Football AI composing an answer out of retrieved records, which is model
voice by any definition. Both were said at the time to be "fragments of the question parser's regexes
rather than prose a reader sees". This unit measures that claim instead of repeating it, and it is
true.

**The last literal was a scanning defect.** Line 244 reads
`question.toLowerCase().replace(/[^a-z0-9' -]/g, " ").split(/\s+/)`. That regex holds an apostrophe,
so the literal scanner opened a string there and read on to the next one — `' -]/g, " ").split(…` —
which has spaces and letters and looks exactly like a sentence. `proseOnLine` now strips regex
literals before scanning: a `/` opens a regex only where a value can start, and a `/` inside `[...]`
does not close it, which is the pair of facts needed to strip `/\s+/` and `/[^a-z0-9' -]/g` alike.
The file is at **0**.

**A cap of 0 is the shape that passes on a file the scan never read**, so the vacuity device that used
to require a hit had to go, or it would have forced the debt back. It is replaced by a plant that runs
the same predicate two ways: a real sentence must still be reported, and the regex that was being
charged must still be ignored. Neither a blind zero nor an over-eager strip can hide there.

Two mutations, both caught: disabling the strip charges the regex again, and planting a real sentence
in the file charges the sentence.

Measured: `tsc` clean, build 0, **41/41 proof scripts green**, `proof-i18n` **289/289** over
**1955 keys × 3 locales**. The domain prose inventory is empty, and this was the last named cap
anywhere in the gate.

**Still outstanding**: nothing on the debt axes — the domain prose inventory is empty, the raw-UI
debt is 0 across 0 files, the dead-module surface is at its honest floor of 3 (two Edge Function
entries and an ambient-types file, none of which the SPA can delete). What remains is the standing
environment limit — the in-app browser has not committed a React tree since M166 — and the ~250
scratch files under `dev/`.

### M253 — a literal wearing backticks is still a literal

Section 37 counted 107 template-first calls while check 24b's dynamic-site scan read 104, and the
3 left over were not dynamic at all: Dashboard writes three perfectly static keys as
`t(`attr.name.first_touch`)`, `t(`attr.name.passing`)` and `t(`attr.name.decision_making`)`. The old
`t("` shape never saw them and the section-37 classifier filed them under template, so a placeholder
added to any of the three would have bypassed every supply contract in the gate — check 24, section
37's, all of them — while the census kept printing a tidy 107.

This milestone reclassifies a backtick that interpolates nothing as what it is: a literal wearing the
wrong quotes. Check 24's `STATIC_T` now takes either quote style for a static key (a template that
actually interpolates still fails the closing-quote test and stays dynamic), and the classifier
extracts the key and marks the site ticked. The census pins move with the reclassification —
**1,263 literal, 104 template** — the template count now rhyming exactly with check 24b's 104 dynamic
sites, and one new clause names the three keys rather than counting them, so a fourth
backtick-written literal cannot arrive without a line here saying why. The plant walks the same two
predicates the gate just used: classify the ticked call, then ask what it fails to supply.

Measured: the three keys are varless in all three locales, so no behaviour changes — check 24 still
reads 134 filled and 134 var-carrying, supply still 134 + 8, and the dictionary is untouched. What
changed is the shape of the alarm: `proof-i18n` **289/289** (one new clause), suite **41/41**.

### M252 — every t() call confesses its shape, and two shapes had no contract at all

Check 4 reads `t("literal")` and checks 16/24 audit declared dynamic sites, so every key a call
NAMES is accounted for — but the way the key ARRIVES is a second axis, and on that axis two real
shapes had no contract anywhere in the gate. A COMPUTED first argument names its keys inside a
ternary (`t(n === 1 ? "comm.nRepliesOne" : "comm.nReplies", { n })`), exactly where check 24's
`Static_T` never looks, so nothing required the call to hand over the variables those keys print.
An EXPRESSION first argument (`t(m.labelKey)`, `t(VIDEO_KIND_KEY[k.kind])`) cannot know its key at
all — so it must pass no object, and the keys it may hold are the bare pools (a *Key field, a
*Keys array, the kind table) whose values reach the glass with no call site for any clause to
read. A third hole sat in the values themselves: an unclosed `{n` reads zero placeholders, so the
parity check that compares what each locale READS sees two empty sets and calls them equal. And
check 24's walk covers five directories while `components/ui` and `src/App.tsx` — six sites,
varless today — sit outside it; this section closes that by walking all 95 app modules itself.

Five clauses, each with a planted witness through the same predicate it asserts with. The census
classifies every call in `codeOf`'d app source — prose lines already stripped, since comment text
cannot claim a key — and pins each shape: **1,260 literal, 107 template, 28 expression, 22
computed-with-literals, 0 unknown**, with a planted `t(getKey())` that must land in the unknown
bucket. The supply contract runs on both literal-bearing shapes, missing and dropped halves
together, parsing shorthand `{ n }` as the variable name it is: **134 literal sites with
placeholders, 8 of the 22 computed sites, 0 short, 0 dropped**, planted short and planted dropped
walked through the same `supplyOf`. Expression sites pass no variables they cannot know (28, none
with an object; the plant hands `t(m.labelKey, { n: 1 })` to the classifier that must report it).
The pools' values are checked in all three locales directly — **4 *Key fields + 2 *Keys arrays +
FILM_KIND_KEY's 7 entries, 165 keys, 0 placeholders**, the field set itself pinned so a new bare
key field must prove its values var-free in the same commit, rather than leaning on section 36's
parity to catch one locale at a time. And every value in every locale is stripped of its
well-formed `{word}` templates: **0 of 5,865 leave a brace behind**, with three planted
arrangements — open, closed-short, and a whole well-formed template that must stay clean — so a
predicate inverted to catch nothing reddens here rather than only in copy nobody writes on
purpose.

Witness: 5 arms plus a control on a `git archive` plane (`dev/m252-arms.mjs`, predictions in its
header before the first run), **5/5 MATCHED on round 1**, every arm re-based to a pristine hash.
The computed call dropping its `, { n }` → supply alone: check 24 cannot see the site (its regex
wants `t("` and finds `n === 1`), the census keeps classifying the shape, and the keys stay
reachable as quoted strings. `learn.l.xg.title` gaining ` {n}` in all three locales → pools alone:
parity drifts together and stays green, no literal site reads the key, and the value is the only
place the contract can live. Dashboard's `t(m.labelKey)` learning to pass `{ n: 1 }` → expression
alone: check 29's read-back still sees `.labelKey,` and the census still counts 28. A stray `}`
appended to one English summary → wellFormed alone: `phList` never matches a lone brace, so pools,
supply, parity and check 24's fill census all keep reading empty sets.

Measured on the plane at this commit: `tsc` rc=0, `npm run build` rc=0, suite **41/41 proof
scripts · 2,197/2,197 checks · exit 0** (five more than M251's 2,192: this section's five
clauses). On the working tree: same suite, `proof-i18n` **288/288** against its own previous 283.
The dictionary and the app code are both unchanged — nothing was repaired here, because nothing
was broken; what was missing was the contract the gate now states in both directions.

### M251 — the two Chinese locales audit each other, and the closed list learns to read

Two defences have stood between a 繁體中文 reader and a 简体字 since M143, and both have admitted
their limits in writing. Check 7 screens zh-TW values against sixteen hand-corrected characters, and
its own comment calls them "a closed list, NOT a converter: a simplified character this file had
never used would slip through, so the general defence is check 6 plus review." Check 6 is a
source-level refusal to inherit (`...zhCN`), which a value-by-value copy does not need — and
proof-graph's five-key sample states the shape plainly: if all five copied keys were copied the
locales would be byte-for-byte equal, so a copy that spares those five passes. The M143 failure
could come back wearing any of the other 1,950 keys.

So this milestone builds the defence check 7 named, and it learns its own definitions from the
corpus rather than from a typed list. Two hand-typed attempts were measured first and thrown away:
index-aligned pair diffing harvested offset noise — length-equal pairs shifted by one made 球, 分
and 名 look "simplified" — and a hand-written simplified set carried the shared glyph 慢, so each
produced hundreds of false leaks against a dictionary that has none. The rule that survived
measurement is a rate differential: a character written by **at least 8 zh-CN values but by at most
a tenth of that many zh-TW values** is, by construction, one this traditional corpus all but never
writes. Today that learns **174 glyphs**. The tenth — rather than zero — is what keeps a single
leaked glyph inside the learned set (1 × 10 ≤ 37 for 乐 after a leak) instead of teaching the
learner to ignore the very thing it exists to catch.

Five clauses carry it, and each pair of halves belts the other. The learner must produce at least
100 glyphs, because a zh-TW that turned into a copy lifts every simplified glyph's zh-TW rate and
empties the set — the M143 failure must read red here, not as a quiet "0 of 1955" from a scanner
with nothing left to compare; the planted word 训练 rides the same check. No zh-TW value may carry
a learned glyph, with the planted word pushed through the same `leakIn` the assertion uses, so a
blinded scan still answers for it. All three locales must hold the same template variables in each
value, counts included (`{n} … {n}` twice is a different sentence from `{n} …` once), with a
planted two-versus-one witness on the same extractor. And a 简体中文 value that is still English is
named rather than counted — `brand.name` sits in a one-line whitelist, so a second cannot arrive
without editing this table, and the planted witness walks the predicate in all three arrangements
(equal-and-English, equal-and-not, not-equal) so inverting either half reddens the clause. Measured
now: **0 leaks, 0 drifting keys, 1 named English value** — the debt was invisible, not new, and the
number can only go down. Check 7 is untouched; its sixteen characters and its honest comment stand
exactly as written, with the general defence their comment asked for written down beside them.

Witness: 5 arms plus a control on a `git archive` plane (`dev/m251-arms.mjs`, predictions in its
header before the first run), **5/5 MATCHED on round 1**, every arm re-based to a pristine hash.
`fw.stat.clubs` 俱樂部 → 俱乐部 → twLeaks alone (乐 is learned at 37/0 rates and stays learned
after the leak; 俱/部 are never learned because their rates track each other; 乐 is not among check
7's sixteen — the exact gap, caught by the new half and blind to the old, in one arm). The learner
blinded (`rc >= 8` → `rc >= 9999999`) → **three reds — corpus, plantedWord and twLeaks**, the third
being the belt: a silenced learner still has to answer for the planted word inside `leakIn`, rather
than hiding behind a tidy "0 of 1955 values". `phOf` blinded to a constant → phParity alone (every
drift count becomes 0 — the first half of the clause *satisfied by the blindness* — and only the
planted witness notices). A zh-CN value reverted to English (`data.clubPage` → `Club page →`) →
stillEnglish alone: no other clause in the gate reads that value, the key set is untouched, and one
glyph leaving the learner cannot dent 174 down through 100.

Measured on the plane at this commit: `tsc` rc=0, `npm run build` rc=0, suite **41/41 proof scripts ·
2,192/2,192 checks · exit 0** (five more than M250's 2,187: this section's five clauses). On the
working tree: same suite, `proof-i18n` **283/283** against its own previous 278. The dictionary is
unchanged at 1,955 keys × 3 locales — nothing was repaired here, because nothing was broken; what
was missing was the alarm.

### M250 — the last three dates stop asking the browser, and the census admits no host

The browser-locale census had one row of debt left: Player OS's missed-session line, its
completed-session line, and the recent-matches table each called `new Date(...).toLocaleDateString()`
with no argument, which is a question to the machine rather than a formatting of the reader's date.
The Data Room's kickoff line and the Football AI's fixture fact had already been wired through
`formatDate(locale, ...)` — the door M194 built and the gate has policed since — so Player OS was
the whole of what `DATE_DEBT` still named: `"features/player/PlayerOS.tsx": 3`.

All three now go through the same door (`formatDate` from `@/i18n`, the reader's `locale` from
`useI18n()`), in the two components that render them: the Training panel's two session lines and
the Matches table's date column. No dictionary key changed — `player.missedDate` and
`player.completedDate` were always rows whose `{date}` var is formatted before it reaches the
template; only who formats it moved, from the host to the reader. The table column was the one
raw print, and it was data rather than prose, so the raw-UI scan never saw it; the census did.

With the debt at zero the gate's shape follows the census: the `DATE_DEBT` table is deleted, and
the two clauses it fed become one. The undeclared half had teeth — any new bare `toLocale*`
call anywhere reddened it — but the growth half watched a single row, and at zero rows it would
have been green forever, an audit of nothing (the M248 lesson, applied before it was learned
twice). The surviving clause states the whole point of the census: **zero sites ask the browser,
ever**, and its non-vacuity does not rest on the count — it rests on the planted-spelling
self-test five clauses below (five spellings of asking the host, each of which the scanner must
still catch, plus two controls it must not) and the population pin that proves the walk itself
read the whole tree.

Witness: 4 arms plus a control on a `git archive` plane (`dev/m250-arms.mjs`, predictions in its
header before the first run), **5/5 MATCHED on the re-registered set**, every arm re-based to a
pristine hash. Player OS's missed line reverted 1/1 (dateCensus alone); the Data Room's kickoff
line reverted 1/1 (the census walks the whole app, not the file that owed the debt); the gate's
own `LOCALE_CALL` regex blinded 1/1 (spellings ALONE — and this is the anti-vacuity arm: the
blinded scanner finds zero sites, so the zero assertion is *satisfied by the blindness*,
controls and every other clause stay green, and only the planted spellings can notice); the
walk dropped `features/player/` wholesale → 14 clauses, with dateCensus expected green because
a narrowed scan sees the same zero the full scan does — and it stayed green, which is the
half of the prediction that makes the arm informative rather than a shattering.

Round 1 was 4/5, and the one MISMATCH is the paragraph this deserves: A4's predicted eight
reds all landed, and six more arrived un-named — every one a consequence of the same
narrowing, chased rather than absorbed: the reachability totals move, the row-conversion
strike list reports PlayerOS gone, its derived RowText maps and two coach prompts vanish,
`common.chartStart`'s call count moves, and `bareKind` reddens. That last one should have
been in the prediction — M249 replaced that clause's `appSrc.size >= 60` floor with
`APP_SRC_PIN` precisely so a dropped screen would redden it, and the prediction read that
note without applying it. Six probes joined the map, no other arm was re-tipped, and round 2
ran clean.

Measured on the plane: `tsc` rc=0, `npm run build` rc=0, suite **41/41 proof scripts ·
2,187/2,187 checks · exit 0** on the plane itself (one fewer than M249's 2,188: the deleted
growth clause). On the working tree after the splice: `tsc` rc=0, `npm run build` rc=0,
suite **41/41 · 2,187/2,187**, proof-i18n **278/278**.

### M249 — a badge stops printing the model's own code, and the enum-that-reaches-the-DOM class gets a census

`{n.kind}` is invisible to every check this file had. It is not a `t("…")` literal (check 4), not
a declared dynamic site (16/17), and not a raw string sitting in a display slot (the UI scan reads
literals, and there is no literal here) — the word arrives out of a record field. So an English
reader read `Rumor` where the dictionary holds `Rumour`, a 简体中文 reader read `Rumor` where it
holds `传闻`, a 繁體中文 reader read `Rumor` where it holds `傳聞`, and all three kept the gate
green. The door was already built: `domain/rowText.ts` has resolved `ni.kind.*` since M233 for the
impact panel's sentence, and the five badge positions beside it never went through it.

All five now do, through `newsKindLabel(kind, t)` — the third `codeWord` door beside the two the
onboarding picker and the profile headers already use, so the app still has exactly one module that
spells a `ni.kind.` key. The code stays where it is an identity rather than a label: `key={k}` and
`active.has(k)` in the Transfer Centre's filter, `kindTone(n.kind)` on both news boards,
`n.kind === "Rumor"` for the dashboard's warning colour. One string changes for the English reader:
the Rumor badge reads **Rumour**, which is what the dictionary already held and what the other five
English values in the file spell (`transfers.subtitleFor`, `.statLinks`, `.empty`, `comm.tag.Rumours`,
`ni.stance.rumor`); no second key was minted for a word the table carries.

Section 35 charges the class at both ends. The render sites are a wiring table with literal pins
(3 files / 5 positions, each importing from `domain/rowText`); the fall-back shapes are derived from
the union rather than typed (`>Confirmed<` and `label="Confirmed"` for each of its five codes, into a
JSX child ending in `.kind}`); and both refusals run against a planted screen and a planted filter
loop, because "none of 95" is only evidence when something proves the walker was looking. Two of the
eight clauses needed a round of fixing before they meant anything: the chip clause first asked
whether the block contained `{k}` at all and went red on React's own `key={k}`, so it now reads the
CHILD slot and separately asserts that the key survives as the code it is; and "never the code" was
an unfalsifiable refusal, since four of the five codes are English words in their own right — the
clause now pins that **11 of the 15** locale readings are a word the code does not already spell, and
names the unknown-code fallback (`"Planted"` comes back as written) as the thing that equality is
measured against. The bare-kind refusal carries the file's own population pin instead of a floor:
`appSrc.size >= 60` stayed green in the arm that drops one screen.

Witness: 10 arms on a `git archive` plane (`dev/m249-arms.mjs`, clause names and predictions in its
header before the first run), **10/10 MATCHED**, every arm re-based to a pristine hash. Reverting one
badge 2/2; deleting the composer's `NEWS_KINDS` branch 4/4 (stale declared site, no composer, wrong
words, wrong spelling); a screen inlining the key 3/3 — and the bare-child clause stays green there,
which is the pair that shows the two refusals read different shapes; a sixth article type 2/2; the
chip back to `{k}` 2/2; the composer stopped lower-casing 3/3; a typed `label="Reported"` 2/2, where
the older literal scan agrees and so the two refusals are a redundant pair rather than a hope; and
blinding the gate's own `BARE_KIND_CHILD` regex 1/1, the anti-vacuity arm, since the tree still
reports "none". Round 1 predicted nine reds for the walk-narrowing arm and measured ten: the extra
one is check 18's reachability census, and chasing it produced a fact rather than a retuned number —
its FAIL line names 24 unreachable keys, which is all 24 of the `transfers.*` namespace, so the one
screen the arm removed is the sole reader of every word that namespace holds. The row keeps 10 as
what the arm measures and the prediction as what was drafted.

Measured on the plane at this commit: `npm run build` exit 0 both before and after, JS **+54 bytes
across the same 35 chunks** (1,492,456 → 1,492,510) and CSS unchanged, suite **41/41 proof scripts ·
2188/2188 checks · exit 0** against **2180/2180** measured on the same plane with HEAD's five files,
`proof-i18n` **279/279** against its own **271/271**. The dictionary is unchanged at 1,955 keys,
which is the point: the reader's word was already there.

## Outstanding work

The app's known outstanding work, in the order it should be taken. Every `defect` entry names the
file and the pattern that would still show the defect, and `scripts/proof-ledger.mjs` resolves
each one against the tree — so a claim that a later milestone fixed cannot sit here, and the
ledger cannot name a defect that is not there. A `task` entry names work no scan can see.

<!-- outstanding -->

- `task` — **the live-browser pass (#142)**: the same 26-screen walk, with screenshots, in a real
  viewport. `renderToStaticMarkup` never runs an effect, so the app root's hydration skeleton and
  the Player OS's training counters cannot be gated from the harness — the proof suite measures
  the tree, not the running app.

<!-- /outstanding -->

The ledger's own record has gaps too. The early milestones are recorded as prose above and the
later ones as sections, and between the two **forty-one milestone numbers have no section at
all** — the work shipped (the commits are in the history) but the record did not. The gate
`scripts/proof-ledger-run.mjs` compares the numbers named here with the numbers the sections
themselves leave out, and the two sets must be equal: a gap this list does not name is an
unrecorded milestone, and a gap this list names that has since been filled is a stale list.

<!-- gaps -->

- M188 — the prose ratchet prints its per-module inventory, so a re-base reads it instead of recalling it
- M190 — the role-gap model publishes rows: domain/gap.ts joins the zero list
- M191 — the onboarding position picker was printing English at Chinese readers
- M192 — a session's drills were printing English at Chinese readers
- M276 — fix three plant checks in proof-i18n that required strings to exist
- M278 — add continental competitions and update graph proof
- M314 — the empty answer's floors, held from both sides
- M317 — add population pin block for timeline family (parked: companions need repositioning)
- M318 — begin career family companions (2 of 17 zero-assertions pinned)
- M319 — complete career-arc family companions (6 of 6 zero-assertions pinned)
- M320 — begin community family companions (1 of 6 zero-assertions pinned)
- M321 — test: proof-analytics M321 companions for drawn and cleanSheets pins
- M322 — docs: sync roadmap to M323 (the ceiling follows the census) (the commit that carried this number without naming it)
- M325 — pay down proof-film and proof-learn: populated samples beside the empty ones
- M331 — route /compare's value row through the shared formatValue
- M341 — fold six duplicate domain clamp definitions onto one lib/utils export
- M342 — converge the last seven inline domain round1 onto scouting's shared export
- M343 — converge the two private round-to-3 helpers onto lib/utils
- M344 — converge the inline round-to-2 family onto lib/utils's shared round2
- M345 — the four scout orderings were written twice, so one screen could disagree
- M353 — the local and UTC day keys are two different answers, so the census pins the split
- M354 — a ratio shown as a percent was divided by hand in six domain modules
- M355 — a value pinned between two bounds was hand-clamped in eight domain modules
- M356 — a rising figure's leading "+" was hand-stitched in four places
- M357 — an ISO string's parse-to-epoch was hand-rolled in three private helpers
- M358 — English duplicate-value count is ratcheted at 107 with locale coverage and bare-copy checks
- M359 — the best-overall ordering had sixteen copies, and one of them was already named
- M360 — a percent label was hand-stitched in seven places, and two of them were already named
- M361 — one day in milliseconds was spelled four ways, two of them only by an underscore
- M362 — converge the byte-identical Mini tile onto shared ui/primitives
- M363 — fold 2 clean inline round1 sites onto the shared door
- M364 — converge the last clean feature/UI inline clamps onto the lib/utils clamp door
- M365 — the last bare percent-fills and career's round2 copies ride the doors, no residue remains
- M366 — the last two feature double-clamps ride the door, only the writer data lane keeps one
- M367 — six proof headers still described residues their clauses no longer allow: the prose now tells the truth
- M369 — seventy-seven inline two-decimal display strings across twenty-two files ride the new fmt2 door, four residue families stay pinned
- M370 — the data lane's last writer residues ride the doors: seed's five clamp nests and both day-ms literals are converged, the proofs charge them former
- M371 — five hand-stitched denominator guards across four files ride the new safeDiv door, three non-quotient Math.max floors stay counted as blind spots
- M372 — nineteen one-decimal display strings across eleven files ride the new fmt1 door, parseFloat and conditional decimals stay pinned, fmt0 counted as blind spot
- M373 — three integer display strings ride the new fmt0 door, and proof-fmt1 charges them former
- M392 — fix: the censuses my M384-M391 conversions blinded: restored green, with the walker, the rng invariant and two vacuity plants (the commit that carried this number without naming it)

<!-- /gaps -->

## Deploying

To host, follow the `sites-hosting` skill with `webDirectory: "dist"`. Publishing is a
deliberate step and has **not** been performed for this project — it is currently local
only. See `PROVENANCE.md` for asset and stylesheet attribution.
