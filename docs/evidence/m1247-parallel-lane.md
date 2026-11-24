# M1247 · The Parallel Lane — evidence

## What shipped
- `scripts/llm-proxy.mjs`: the STREAMING wire now emits the same `X-FootballOS-LLM-Cache` header
  the buffered wire always had. `hit`, `coalesced` and `miss` are attached to the streamed response
  and written by the middleware, so the browser's actual call path is observable instead of
  silently unlabelled.
- `scripts/proof-parallel-lane.mjs`: an OFFLINE proof that drives the shipped middleware over a
  stubbed upstream behind a latch. It measures eight simultaneous identical asks: one cold dial,
  seven coalesced siblings, no cross-talk, one LRU eviction order, one content-derived lane, and
  an honest header on every path. No real model call is spent; the API is closed as of 2026-11-23.
- Direct egress restored: the local `.env` no longer sets `LLM_UPSTREAM_PROXY`, and
  `docs/MASTER-DIRECTIVE.md` now says the default route is the normal network. Clash Verge is
  optional, never required; no more ECONNREFUSED when it is off.

## Gates measured on this tree
- `proof-parallel-lane` **14/14**, `EXIT=0`.
- Full proof battery: `node scripts/run-proofs.mjs` **242/242 proof scripts proven
  (5745/5745 checks counted)**, `EXIT=0`.
- `tsc` 0, `npm run build` 0; `proof-pwa` 4/4 and `perf-baseline` 5/5 at the M1246 baseline
  (bundle unchanged, server/wire change only).
- Full E2E across two shards (the single long run kept being killed by host restarts):
  shard 1/2 **156 passed**, shard 2/2 **143 passed / 12 skipped**, combined
  **299 passed / 12 skipped / 0 failed**. The settings lesson count was measured at 26 (M1246
  appended the cache lesson), and main-content specs now dismiss the first-run guide before clicking.

## Honest caveats
- The upstream is a stub; this proof measures OUR server's coalescing/cache behaviour, not any
  provider-side KV hit rate. `cached_tokens` is a live number and is out of reach offline.
- The real model API is closed. No guarded live witness was run for this milestone.
