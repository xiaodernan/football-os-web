# M1224 · The Long-Context Chronicler — evidence

## What shipped
- A **fifteenth imprisoned door** at `/chronicler`, distinct from `/chronicle`: a lazy route, a nav-rail
  tab, a command-palette entry and an in-app manual chapter link. No external docs are required.
- The **complete `DEEP_DIGEST` tape is the shared prefix**; only a three-fixture list is the dynamic
  suffix. `withWorldBook(envelope)` puts the whole tape ahead of the ask, so the content-derived
  `24h` cache lane stays warm for every other door. `laneForMessages(messages) === laneKey(WORLD_BRIEFING)`
  is asserted by the real witness; `TIMESTAMP` and `TICK` never enter the briefing.
- **One streamed model call** writes one sealed micro-chapter: first line `CHAPTER:<fixtureId>` or a
  bare `ABSTAIN`, then `SETTING:` / `TURN:` / `ECHO:` in that order. The directive is parsed against
  the offered ids only; it is stripped before either verifier sees the prose.
- **Two verifiers in strict order**: structure (three ordered, non-empty sections within 140 words)
  then numerals (the one shared `verifyReplayText` evidence-number door over that fixture's sealed
  envelope). Refusal at either stage walks the shared traced FSM to the refused arm instead of
  committing; the honest fold chapter is built from the fixture's own verbatim tape line.
- `domain/chronicler.ts` owns only protocol markers; fold prose is localised through `chronicler.fold.*`
  in all three locales; status words come from `matchStatusLabel`. The trace panel prints the three
  FSM proof flags (`structureOk`, `numeralsOk`, `committed`) beside every stage chip.

## Gates measured on this tree
- `proof-chronicler` **71/71**: tape parser (1,566 finished fixture lines), three deterministic
  first/middle/last fixtures, directive grammar, both verifiers in order, every refusal arm, lazy
  route + nav + palette + manual wiring, and all 40 new trilingual keys.
- `proof-i18n` **443/443**: 225 app modules, 3,714 literal / 180 template / 70 expression /
  26 computed `t()` calls, `APP_SRC_PIN=225`, `TSX_PIN=116`, `SRC_PIN=228`, `ST_VAR_PIN=3`,
  duplicate values 164 and excess keys 271 unchanged.
- `proof-app-tree` 13/13 (`APP_MODULE_PIN=228`), `proof-coverage` 26/26 (`POP_PIN=229`,
  `BY_DIR` domain 90 / features 93, `DEEP_PIN=109`), `proof-router` 29/29
  (`ROUTER_POP_PIN=220`), `proof-storage` 63/63 (`APP_FILES_PIN=223`), `proof-thresholds` 7/7
  (`>= 3` split 7 → 8 sites/files: the sealed-tape floor), `proof-param-options` 5/5
  (`pickTapeFixtures.count` now passed explicitly at every call site).
- `proof-rules` **7/7**: the numeral verifier delegates to the Replay Room's single door; state flags
  distinguish the two commit/refuse edges; the deliberate same-file directive/verifier pairs and the
  two screens' terminal `enter` shape are declared with their distinct contracts, never hidden.
- `proof-model-fields` **5/5**: all three new `ChapterState` proof flags are read in the trace panel.
- `proof-services` **65/65**, `proof-wiredossier` **21/21**: the six CRLF-normalised frozen artifacts
  in this worktree were restored to the committed LF bytes, not exempted.
- `tsc` 0 and `npm run build` 0. Fresh build measured **848 KB gzip / 117 assets** (JS 833 KB,
  CSS 15.2 KB); `proof-pwa` **4/4** with pin 842 → 849 (the +1 KB Ubuntu zlib margin) and
  `tests/perf/baseline.json` re-recorded in the same commit; `perf-baseline` **5/5**.
- E2E `tests/e2e/chronicler.spec.ts`: the offline/fold arm with the model transport refused (503),
  both provenance notes, the fold badge, trace chips and a clean console. The full suite is green:
  **272 passed / 12 skipped / 0 failed** (8.4m), including the 16-context parallel witness re-run
  alone at 18.1s (well under the honest 45s gate — the earlier 45.2s was proof/E2E contention).
- Final full battery on this tree: `node scripts/run-proofs.mjs` **224/224 proof scripts proven
  (5441/5441 checks counted)**, `EXIT=0`; `tsc` 0; `npm run build` 0.

## Real model witness
- Guarded `LLM_LIVE=1 node scripts/verify-chronicler-live.mjs` (not in `npm run proof`; server key
  read from gitignored `.env`, never printed) spent exactly one `gpt-6.2-sol` call through the
  shipped proxy: **10/10**. The warm-up tick reported `cached_tokens=142529`; the chapter ask
  reported `cached_tokens=7643` on a **235,772-char world book** (9,140 ms, status 200). The real
  answer opened `CHAPTER:M1414`, wrote exactly `SETTING:` / `TURN:` / `ECHO:`, passed structure,
  passed the shared numeral verifier against that fixture's sealed tape line, and committed with
  6 trace entries (`status commit`, note `commitOk`). The witness asserts the canonical model,
  the single content-derived 24h lane (`laneForMessages(...) === laneKey(WORLD_BRIEFING)`),
  the strict first line, both verifiers in order and a terminal FSM status.

## Honest caveats
- A chapter is a *narrative* over one verbatim tape line, not a new fact: every compound numeral is
  re-proved against the sealed line and future-tense promises are refused.
- The fold arm is the deterministic on-device answer, not a model answer; the badge says so.
- No gate or E2E spends a model call. The live witness is guarded and excluded from `npm run proof`.
