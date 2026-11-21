# M1228 · The Stress Witness — evidence

## What shipped
- `scripts/proof-storm.mjs`: 512 simulated device cohorts (impatient one-visit browsers, lost
  clickers, and faithful returners) are folded through the SAME pure domain doors at once. No real
  model call is spent and the upstream is never dialed.
- The witness proves: parallel folds equal the serial fold byte-for-byte; all 512 envelopes hash to
  the one content-derived world-book lane with `PROMPT_CACHE_RETENTION === "24h"`; 512 concurrent
  forecast writes land in 512 distinct per-device slots without ever touching the pulse ring; no
  fold prints `NaN`, `Infinity` or `undefined`; and the LRU cache keeps every value isolated under a
  full-capacity burst.
- Deliberate plants prove the reader is armed: a planted lane change, a planted wrong forecast slot
  and planted cache corruption are all charged.

## Gates measured on this tree
- `proof-storm` **13/13**, `EXIT=0`.
- No app or UI code changed: bundle stays **855 KB gzip / 117 assets**; `proof-pwa` 4/4 and
  `perf-baseline` 5/5 remain green from the M1226/M1227 baseline.
- Full proof battery: `node scripts/run-proofs.mjs` **227/227 proof scripts proven** (final number
  recorded after the battery run).
- Full E2E unchanged from M1227: **275 passed / 12 skipped / 0 failed**.

## Honest caveats
- This is an in-process determinism and isolation stress test of the pure fold/cache doors, not a
  claim about network capacity or a live upstream. The real API is intentionally not dialed here.
- The 512 cohorts are seeded simulations of user behaviour, honestly labelled; they are not real
  visitor data.
