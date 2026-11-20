# M1220 plan and evidence — The Parallel Witness

## Why
M1219 repaired an inverted `laneKey(...)` call in the shipped proxy because parallel sessions
were fragmenting one content-derived cache lane. That claim had a unit-level proof
(`proof-lane-parallel`) but no browser-level witness. This milestone closes that gap with real
concurrent browsers, not a mocked timer.

## Plan (all shipped)
1. `tests/e2e/cartographer-stress.spec.ts` — open 16 isolated Playwright contexts in parallel,
   mark each with its own `localStorage` id, refuse `POST /api/llm/chat` with 503 in every
   context (no live model call, no key), click the model-chosen door, and require the honest
   fold arm with badge, traced graph, intact storage and zero console/page errors.
2. Write the measurements from that run into `docs/evidence/m1220-parallel-witness.json`.
3. `scripts/proof-parallel-witness.mjs` — read the evidence back, check its internal
   consistency and check that the spec still contains every assertion that produced it.
4. Leave the app untouched: no route, i18n key, FSM edge, pin or budget moved by this milestone.

## Measured evidence (this tree)
- Sessions: **16 / 16 ok**. Wall: **22,982 ms**. Per session: min **14,654 ms**, max
  **16,653 ms**. Trace chips: **3** in every session. Console/page errors: **0** in every
  session. No session lost its own storage mark.
- Transport was deliberately refused with 503 in every context: the witness spends no real
  model call and never reads an API key.
- Full battery: **222/222 proof scripts proven (5,279/5,279 checks counted), exit 0**.
  `proof-i18n` reported **0 owing zero-asserting clauses across 222 scripts** after the four
  new clauses received real plant witnesses on their own predicates.
- `tsc --noEmit` 0 · `npm run build` 0 · Playwright **268 passed / 12 skipped / 0 failed
  (8.9m)** · `proof-pwa` 4/4 at **836 KB gzip / 115 assets** (unchanged, baseline untouched).

## Honest caveats
- The 503 is an injected transport refusal. This witnesses the offline/refused arm, not a live
  `gpt-6.2-sol` reply; the live routing witness remains the guarded LLM_LIVE-only script added
  in M1219.
- These timings are this Windows host on this day, not a capacity commitment or a production
  latency guarantee.
- The personal page's milestone tile was still serving a cached M1217/13-door copy when this
  evidence was written; the corrected commit (`xiaodernan.github.io@fa39721`) had been pushed
  and its Pages job queued. The football app itself was verified fresh on cache-busted assets.
