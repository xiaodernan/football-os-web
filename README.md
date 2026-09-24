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
contracts (AI grounding, local-data registry, offline wording, feed ranking). Run them all:

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

Work ships one milestone per commit and is currently at M146 (a few numbers in that range
were skipped). Everything added in the current line of work (M37 onward) was built green
and — where it changed what a visitor sees — checked in a browser against a fresh production
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

The M108–M146 line of work is a different kind of progress: it makes the earlier claims
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
reader sees the pre-M146 wording unchanged, console clean in each. proof-i18n is now 58
checks and the suite 973.

**Still outstanding** (deliberately not faked): real data / AI / video providers behind
the existing seams, server-side multi-user persistence and shared community content, a
database designed for millions of rows, long-form i18n of editorial content, and
publishing (this project is intentionally local-only; `sites-hosting` has never been
run).

## Deploying

To host, follow the `sites-hosting` skill with `webDirectory: "dist"`. Publishing is a
deliberate step and has **not** been performed for this project — it is currently local
only. See `PROVENANCE.md` for asset and stylesheet attribution.
