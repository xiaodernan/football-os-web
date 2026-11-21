# M1226 · The Forecast Ombudsman — evidence

## What shipped
- A sixteenth imprisoned door **inside the existing `/ops` console** (no new route, nav, palette or
  manual surface): one panel, one streamed model call, and the shared `123` passcode gate.
- The model audits the **council's own previously recorded forecast** against a later measured hour.
  It must open with `GRADE:hit|near|miss` — the grade the deterministic comparison already proves —
  or a bare `ABSTAIN`. A wrong grade, unusable first line, bad section order or failed numeral
  walks a refused FSM arm into the honest fold.
- The three-part minute (`FORECAST:` / `OBSERVATION:` / `BOUNDARY:`, in that order, ≤80 words) is
  checked for order before the **shared replay numeral verifier** checks every figure against the
  same sealed envelope. The minute explicitly compares a prediction with an observation; causation
  is forbidden in the taught prompt and in the shipped copy.
- `publish` and `contest` are two explicit human edges out of `status: "commit"`. Only an operator
  decision writes `football-os.ombudsman.note.v1`; the pulse ring and the council forecast slot are
  never written by this door.
- `domain/rxCouncil.ts` owns the protocol, FSM and forecast grade only; fold prose and all visible
  words are localised through `ops.ombudsman.*` in all three locales.

## Gates measured on this tree
- Full proof battery: `node scripts/run-proofs.mjs` **226/226 proof scripts proven
  (5579/5579 checks counted)**, `EXIT=0`.
- `proof-ombudsman` **67/67**: envelope provenance, first-line grammar, structure verifier in both
  directions, deterministic grade mapping, every refusal arm, both operator edges, one note slot,
  read-only pulse and all 36 new trilingual keys.
- `proof-i18n` **453/453**: 4,481 keys · 3 locales, 3760 literal / 192 template / 70 expression /
  26 computed `t()` sites, 174 dynamic sites declared with no drift, no duplicate sentence and no
  simplified glyph leaking into the traditional corpus.
- `proof-rules` **7/7**: the exported rule families stay closed across the two Ops doors; all
  deliberate same-file terminal shapes are declared with distinct contracts.
- `proof-dead-exports` 4/4, `proof-app-tree` 13/13, `proof-coverage` 26/26, `proof-router` 29/29,
  `proof-storage` 63/63, `proof-services` 65/65, `proof-wiredossier` 21/21.
- `tsc` 0, `npm run build` 0. Fresh build **855 KB gzip / 117 assets** (JS 840 KB, CSS 15.2 KB);
  `proof-pwa` 4/4 with pin 852 → 855 and `tests/perf/baseline.json` re-recorded on 2026-11-21.
- E2E `tests/e2e/ops-ombudsman.spec.ts` **1 passed (13.3s)**: seeded device hour and council
  forecast, 503 model transport, deterministic grade visible, fold badge, both provenance notes,
  traced stategraph, no publish button, clean console. The full suite is green:
  **274 passed / 12 skipped / 0 failed** (11.3m).

## Real model witness
- Guarded `LLM_LIVE=1 node scripts/verify-ombudsman-live.mjs` (server-only key in gitignored `.env`,
  never printed) spent exactly one `gpt-6.2-sol` call through the shipped proxy: **14/14**. The call
  took **7,982 ms**, returned HTTP 200, and rode the one content-derived world-book lane with
  `PROMPT_CACHE_RETENTION === "24h"` (`laneForMessages(...) === laneKey(WORLD_BRIEFING)`); the
  235,772-character world book was the shared prefix. `cached_tokens=null` is reported honestly.
  The answer opened `GRADE:miss`, matched the deterministic comparison, wrote all three ordered
  sections, passed the shared replay numeral door, and committed with note `published` and
  6 trace entries; the explicit publish edge produced a gradeable note with no causal claim.

## Honest caveats
- The offline path is a deterministic on-device fold, not a model answer; the badge says so.
- The audit compares a recorded prediction with a later observation. It never claims the
  prescription caused the measurement.
- No offline gate or E2E spends a model call. The live witness is guarded and excluded from
  `npm run proof`.
