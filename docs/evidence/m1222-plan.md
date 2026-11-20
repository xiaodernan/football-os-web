# M1222 plan and evidence — The Replay Room

## Why
The operator console already folds this device's visit trail into honest numbers, and a seeded
cohort stands in when the trail is thin. M1222 puts the two side by side inside a model-driven
StateGraph: the device's last hour is replayed read-only, a deterministic continuation projects
the doors a comparable visitor would open next, and `gpt-6.2-sol` chooses which anomaly deserves
the operator's attention. Every figure on the panel carries its own provenance — `measured` or
`simulated` — and the model cannot write a numeral the envelope does not already contain.

## Plan (all shipped)
1. `domain/pulse.ts` — export the existing LCG and continuation table so the projection uses the
   SAME deterministic engine as the seeded cohort, not a second randomness source.
2. `domain/replay.ts` (new) — `replayFold(rawVisits, now)` takes the last hour, folds it with the
   one `foldPulse`, and projects one continuation per recorded session start. It returns four
   anomalies (`entryBounce`, `deepExit`, `loopDetour`, `deadEnd`) with separate measured and
   simulated counts. `replayEnvelope(snapshot, law)` tags every figure with its source;
   `verifyReplayText` rides the same evidence-number law as the other LLM doors (`collectEvidenceNumbers`,
   compound numerals only, rounded twins allowed, future-promise words refused), reporting the offending
   figure rather than a bare violation code. First-line grammar
   `ANOMALY:… | ABSTAIN`; six traced transitions reuse `domain/tracedFsm.ts`, with `chosenBy:
   "model"` and refused arms for no-key, transport failure, invalid directive, abstention and
   unverified prose.
3. `features/ops/Ops.tsx` — one new `<Panel>` between dispatch and the 14-day rhythm. Four cards
   print measured and simulated counts in separate labelled slots. One streamed `withWorldBook`
   call chooses the anomaly; the keyless/offline arms print the deterministic fold answer and a
   trace, never a fake streaming rail. The panel is a pure read of the pulse ring.
4. Trilingual copy — 33 `ops.replay.*` keys × 3 locales; every enum-derived site is registered in
   `proof-i18n`'s dynamic-site table and backed by a value space read from the domain table.
5. Gates — new `scripts/proof-replay.mjs` (59/59) reads the source and exercises the real fold,
   parser, verifier and StateGraph through Vite; `proof-i18n` 442/442 after re-measuring all
   population, value-space, duplicate and call-shape pins. App-tree/coverage/router/storage pins
   moved by exactly one module (`domain/replay.ts`), measured rather than guessed.
6. `tests/e2e/ops-replay.spec.ts` — seeds a fixed hour in localStorage, unlocks with `123`,
   refuses the model transport with 503, and asserts both provenance labels, the fold badge, the
   trace strip and a clean console.

## Gates measured on this tree
- `proof-replay` 59/59 · `proof-i18n` 442/442 · `proof-app-tree` 13/13 ·
  `proof-coverage` 26/26 · `proof-router` 29/29 · `proof-storage` 63/63 · `tsc` 0.
- Offline E2E `tests/e2e/ops-replay.spec.ts`: 1 passed (fixed localStorage hour, 503 transport,
  both provenance labels, fold badge, trace strip, clean console).
- **Real one-call witness** `LLM_LIVE=1 node scripts/verify-replay-live.mjs` (guarded, NOT in
  `npm run proof`; server-side key from gitignored `.env`, never printed): **10/10**. The real
  `gpt-6.2-sol` answer opened `ANOMALY:deadEnd`, named measured `1` / simulated `0` from the
  envelope, passed the shared evidence-number verifier, and committed with 5 trace entries.
  235,772-char world book on the one content-derived 24h lane; this ask reported
  `cached_tokens=7661` (the warm-up tick alongside it reported `142529`). No claim of cause or
  prediction was accepted.
- Two M1221 battery reds were fixed by evidence on `master` before this merge: `proof-rules`
  (four deliberate same-file directive/route pairs declared with their distinct contracts, and
  the reader now prints the undeclared/stale keys) and `proof-unique` (the cross-exam violation
  merge now goes through the one `unique` door). Both are green at 7/7 and 8/8.
- Fresh build measured **841 KB gzip / 115 assets** (JS 826, CSS 15.2) — 836 → 841 with M1222's panel
  and keys. `proof-pwa`'s pin moved 837 → 842 (the +1 KB Ubuntu zlib margin) and
  `tests/perf/baseline.json` was re-recorded in the same commit; `proof-pwa` 4/4 and
  `perf-baseline` 5/5 on that build. No gate was bypassed or waved through.
- The full battery red on the first draft's unused `ReplaySource` export (`proof-dead-exports` 3/4);
  the export was deleted and the gate re-measured 4/4 — never exempted. It then caught two more
  real draft defects: `proof-i18n-scan` read an arrow-plus-generic on one line as unkeyed JSX copy
  (the replay read now sits in its own block; 1/1, zero candidates), and `proof-fmt1`'s exact call
  pins moved by the four new replay figures (Ops 4 → 8, total 28 → 32; 12/12). No gate was skipped.
- The next clean battery exposed six more reds, all traced to this draft or to this worktree's
  checkout, never waived. `proof-services` and `proof-wiredossier` were reading CRLF-normalised
  copies of six frozen JSON/digest artifacts (`core.autocrlf=true` in the worktree); their working
  bytes were restored to the committed LF and the gates re-measured **65/65** and **21/21**.
  `proof-last` caught a new inline `CONTINUATIONS[CONTINUATIONS.length - 1]` fallback in the
  projection; it now goes through the one `last()` door (**10/10**). `proof-vocab` caught three
  unions spelled two or three times: the route reuses `BenchRoute`, the verdict reuses `Verdict`,
  and the operator badge is one `ReplayBadge` type (**7/7**). `proof-rules` caught four exported
  bodies that were the same rule under renaming: preflight now seals the four-figure window,
  build clears any prior answer and branch choice, and both refused arms clear a carried anomaly —
  genuine replay-domain differences, not cosmetic token padding (**7/7**). The pure-read assertion
  was re-measured against the block-shaped `readJson`/`replayFold` pair, not weakened.
- Full E2E on this tree: **270 passed / 12 skipped / 0 failed (11.6m)**. The full battery figure is
  recorded in `dev/status_report.md` after the final-tree run.

## Honest caveats
- The projection is a seeded continuation of the recorded starts. It is a *simulation*, not a
  measurement of other visitors; the panel says so in every card and in the method line.
- The model chooses an anomaly and may speak only envelope numerals. Corroboration here means
  "the prose stays inside the measured/simulated envelope", not that a cause was proven.
- No model call is spent by gates or E2E; the live witness, if run, is guarded and excluded from
  `npm run proof`. The replay never writes `football-os.pulse.v1`.
