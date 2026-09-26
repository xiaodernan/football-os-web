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
role-gap analysis, film insights, career arc, comparisons, transfers) and the honesty
contracts (AI grounding, local-data registry, offline wording, feed ranking, the weekly
review's prose, and the words the knowledge graph draws). Run them all:

```sh
npm run proof                        # = npm test: every scripts/proof-*.mjs, with per-script counts
node scripts/proof-m99.mjs           # Football DNA: vector rule, archetype derivation, determinism
node scripts/proof-ai-grounding.mjs  # AI answers: grounded value extraction, no invented ranking, determinism
node scripts/proof-localdata.mjs     # registry: lossless export/import, activity-only reset, i18n labels
```

They are plain Node and exit non-zero on failure, so there is no test runner to install.
`npm run proof` prints the live script and check counts; the README deliberately does not,
because a checked-in total goes stale the moment a proof is added.

The app is a static SPA with hash routing, so deep links work without a server.
Route-level code splitting keeps the initial chunk small; chart-heavy screens load on
demand.

## Roadmap status

Work ships one milestone per commit and is currently at M190 (a few numbers in that range
were skipped). Everything added in the current line of work (M37 onward) was built green, and
was checked in a browser against a fresh production preview with a clean console up to M165;
from M166 on the in-app browser stopped committing a React tree at the machine level, so the
evidence for a change is now the proof suite plus, where a component renders without the
store, a server-rendered string check in all three locales — stated per milestone rather than
assumed. Built and verified: shell + onboarding,
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
forms, not Simplified. A sweep of the remaining panels still owes a few untranslated UI
strings — the Dashboard's "% confidence" suffix and its "News →" link are two known ones,
and Manager OS's whole tab strip is hardcoded English — so they are listed here as
outstanding rather than described as finished.

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
pass. 17 unreachable labels remain, each with a disposition — six are dead duplicates of a
`set.key.*` family Settings already renders, the rest get wired to the control they describe
or deleted — and the audit itself still owes a permanent gate, so a label cannot be added
again without naming a place that renders it.

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

**Still outstanding** (deliberately not faked): real data / AI / video providers behind
the existing seams, server-side multi-user persistence and shared community content, a
database designed for millions of rows, long-form i18n of editorial content, and
publishing (this project is intentionally local-only; `sites-hosting` has never been
run).

## Deploying

To host, follow the `sites-hosting` skill with `webDirectory: "dist"`. Publishing is a
deliberate step and has **not** been performed for this project — it is currently local
only. See `PROVENANCE.md` for asset and stylesheet attribution.
