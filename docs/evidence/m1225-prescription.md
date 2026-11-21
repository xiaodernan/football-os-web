# M1225 · The Prescription Council — evidence

## What shipped
- The sixteenth imprisoned door lives **inside the existing `/ops` console** (no new route, nav
  tab, palette entry or manual chapter): one panel, one streamed model call, the passcode `123`
  gate, the Replay Room envelope and numeral door reused verbatim, and the same passcode/envelope
  shape as the Replay Room panel.
- `domain/rxCouncil.ts` owns only protocol, StateGraph and forecast logic; the fold prose and all
  visible words are localised in all three locales through `ops.rxCouncil.*`. The envelope law
  lives with the screen next to `REPLAY_LAW`, so the domain module publishes no English sentence.
- The model must open with `RX:<offered-id>` or a bare `ABSTAIN`. A foreign id, an abstention or a
  failed numeral check walks a refused FSM arm into the honest fold. Every figure is re-proved by
  the shared replay verifier **before** the proposal reaches the operator.
- Adoption and rejection are two explicit human edges out of `status: "commit"`; neither happens
  silently. Only adoption records a forecast in `football-os.rxcouncil.forecast.v1`. The pulse ring
  `football-os.pulse.v1` is never written by this door; the panel is read-only against it.
- A forecast is graded only against a **later measured hour** from a new replay. The grade compares
  prediction and observation; the copy never claims the prescription caused the measurement.

## Gates measured on this rebased tree
- Full proof battery: `node scripts/run-proofs.mjs` **225/225 proof scripts proven
  (5510/5510 checks counted)**, `EXIT=0`.
- `proof-rxcouncil` **61/61**: offered shelf maps only known ids, first-line grammar, strict
  verifier order, every refusal arm, both traced operator edges, one forecast slot and a
  no-causal-claim grade; all 36 new `ops.rxCouncil.*` rows exist in all three locales.
- `proof-i18n` **451/451**: 226 app modules, 4,445 keys in 3 locales, 172 dynamic `t()` sites
  (0 undeclared / 0 stale), all dictionary keys reachable through static or declared dynamic sites,
  no duplicate English sentence and no simplified glyph leaking into the traditional corpus. The
  duplicate-value and excess-key pins stay at 164 / 271 after the one duplicate sentence was
  rewritten.
- `proof-rules` **7/7**: exported rule bodies remain unique across doors; the deliberate same-file
  refusal/commit pairs and the three panels' terminal setters are declared with distinct contracts.
- `proof-services` **65/65**, `proof-wiredossier` **21/21**: the frozen service contracts and wire
  digest are byte-identical to their committed LF blobs (the CRLF checkout noise was normalised to
  LF, not exempted).
- `proof-app-tree` 13/13, `proof-coverage` 26/26, `proof-router` 29/29, `proof-storage` 63/63,
  `proof-pwa` 4/4, `perf-baseline` 5/5.
- `tsc` 0; `npm run build` 0. Fresh build measured **852 KB gzip / 117 assets** (JS 837 KB,
  CSS 15.2 KB); `tests/perf/baseline.json` re-recorded on 2026-11-21.
- E2E: `tests/e2e/ops-rxcouncil.spec.ts` **1 passed (9.2s)** (503 model transport, seeded device
  hour, fold badge, both provenance notes, traced stategraph, no adopt button, clean console).
  Full suite **273 passed / 12 skipped / 0 failed** (10.8m).

## Real model witness
- Guarded `LLM_LIVE=1 node scripts/verify-rxcouncil-live.mjs` (server-only key in gitignored `.env`,
  never printed) spent exactly one `gpt-6.2-sol` call through the shipped proxy: **12/12**. The call
  took **8,634 ms**, returned HTTP 200, and rode the one content-derived world-book lane with
  `PROMPT_CACHE_RETENTION === "24h"` (`laneForMessages(...) === laneKey(WORLD_BRIEFING)`); the
  235,772-character world book was the shared prefix. `cached_tokens=null` is reported honestly
  (cold lane on this single ask), not invented.
- The answer opened `RX:rx.deadEnd`, survived the shared replay numeral verifier, and committed
  with note `proposalVerified` and 4 trace entries. The operator edge produced a forecast that is
  gradeable by a later measured hour; no causal claim is made.

## Honest caveats
- The offline model path is a deterministic on-device fold, not a model answer; the badge says so.
- The recorded forecast is a prediction compared with an observation, never a claim that the
  suggested prescription caused the later figure.
- No offline gate or E2E spends a model call. The live witness is guarded and excluded from
  `npm run proof`.
