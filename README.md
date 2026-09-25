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

Work ships one milestone per commit and is currently at M161 (a few numbers in that range
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

Still outstanding, unchanged: Player OS (89 hits), Simulation Lab (51), Community Hub (0 —
closed by M161), Learn Hub (37), Film Room (30), Data Room (29), Landing (18),
`src/App.tsx` (3), plus the
three `toast()` strings in Manager OS that no scan reports because they are call arguments
and not JSX — which is M159's neighbourhood alongside the demo coach's generated prose.
Nothing here was clicked in a browser: the in-app browser remains wedged, so task #142's
three-locale walk is still owed.

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

**Still outstanding** (deliberately not faked): real data / AI / video providers behind
the existing seams, server-side multi-user persistence and shared community content, a
database designed for millions of rows, long-form i18n of editorial content, and
publishing (this project is intentionally local-only; `sites-hosting` has never been
run).

## Deploying

To host, follow the `sites-hosting` skill with `webDirectory: "dist"`. Publishing is a
deliberate step and has **not** been performed for this project — it is currently local
only. See `PROVENANCE.md` for asset and stylesheet attribution.
