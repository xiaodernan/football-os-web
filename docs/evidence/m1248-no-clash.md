# M1248 · No Clash Dependency — evidence

## What shipped
- `scripts/proof-no-clash.mjs` walks 641 executable source files (`.ts/.tsx/.js/.mjs`, excluding
  comments, `dist`, `node_modules`, `test-results`, `specproof-web` and itself) and refuses any
  hardcoded `127.0.0.1:789x` proxy port. It also asserts the double opt-in guard in
  `scripts/llm-proxy.mjs` and that a local `.env` never opts into an upstream proxy.
- Combined with the M1247 `serverConfig` change, egress is direct by default; an inherited Clash or
  system proxy is ignored unless `LLM_ALLOW_UPSTREAM_PROXY=1` is set deliberately.

## Gates measured on this tree
- `proof-no-clash` **4/4**, `EXIT=0`.
- Full proof battery: `node scripts/run-proofs.mjs` **243/243 proof scripts proven
  (5751/5751 checks counted)**, `EXIT=0`.
- No app code or bundle changed: build remains **901 KB gzip / 126 assets**, `proof-pwa` 4/4,
  `perf-baseline` 5/5. E2E unchanged from M1247: **299 passed / 12 skipped / 0 failed**.

## Honest caveat
- This gate covers the repository. Clash Verge's OS-level "System Proxy" can still intercept
  `127.0.0.1:5199` in the browser; disable it or add `127.0.0.1`/`localhost` to its bypass list,
  then restart `npm run dev`. That setting lives outside this codebase.
