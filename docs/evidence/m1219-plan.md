# M1219 plan — The Cartographer (model-chosen StateGraph branch)

## Current state at plan time
- M1218 staged: complete tape, 20/20 digest proof, 219/219 individually re-proven gates,
  E2E running, IO deploy/guard green, profile guard green.
- Door 13 (Witness Bench) lets the model choose only `answer` vs `ABSTAIN`. The lens is
  still chosen by the visitor. The user's key request remains: LLM must drive state
  transitions and content, not just decorate prose.

## Plan
1. **Domain** (`domain/witnessBench.ts`): add `parseBenchDirective` with a strict first-line
   grammar (`LENS:crown|chase|form` or `ABSTAIN`), `benchModelChose` and
   `benchModelRouteInvalid` using the ONE shared traced FSM. Chosen lens and `chosenBy`
   become part of the trace; an unusable directive can never reach commit.
2. **Door** (`features/wirediary/WitnessBench.tsx`): one new button. One streaming call,
   wrapped in `withWorldBook` (same cache lane, longer context), carries all three frozen
   envelopes. The model writes a directive line plus the answer. The graph enters the
   chosen lens, re-proves every numeral against THAT envelope, then commits or folds.
   Existing visitor-chosen path stays byte-for-byte intact so its proof still pins it.
3. **i18n**: five new keys × three locales; English zero CJK, zh-CN/zh-TW all Chinese.
4. **Proofs**:
   - `scripts/proof-model-route.mjs`: strict grammar, refused invalid arms, chosen lens in
     state + trace, verifier against chosen envelope, trilingual keys, E2E coverage.
   - `scripts/proof-lane-parallel.mjs` (already green 13/13): 120 parallel sessions share
     one content-derived lane; different briefing self-loads on its own lane; streaming,
     `prompt_cache_key`, 24h retention at both upstream call sites, no `include_usage`.
5. **E2E**: extend `tests/e2e/witness-bench.spec.ts` with the model-chooses affordance,
   keeping the existing three lens assertions.
6. **Manual/teaching**: add one in-app line to the manual so users understand that the
   model can choose the question's angle and still cannot invent a numeral.
7. **Gates**: `tsc`, `build`, full proof battery, full Playwright, PWA size, then commit,
   push, and verify live bundle. Use the real `gpt-6.2-sol` endpoint only for one
   end-to-end routing witness through the existing proxy (key read from `.env`, never
   echoed, logged, staged or committed).

## Cache-lane conclusion (kept, not re-litigated)
The lane key is `football-os-web:` + FNV-1a of the first 4 KiB of the byte-stable system
briefing. Session/user identity never enters it. That is the codex-shaped discipline:
one family, one warm lane, 24h retention, growing history window, streamed request.
`proof-lane-parallel` now locks that invariant into CI.

## Shipped evidence (this commit)
- The new affordance lives on its own lazy door, `/cartographer` — door 14. The visitor-chosen
  path on `/witness-bench` was left byte-intact: `proof-witness` still reads 39/39.
- 12 keys × 3 locales (36 rows) ship for the routing door and its badges/notes; `proof-i18n`
  re-measured 436/436 with all dynamic-site and value-space ledgers updated.
- The shipped proxy had both `prompt_cache_key` call sites passing `laneKey`'s arguments in
  the wrong order. Fixed with one exported `laneForMessages(clean)`; `proof-lane-parallel`
  went 13/13 → 16/16 with a runtime assertion on the SHIPPED shape, not just the primitive.
- The live model's first grounded sentence was refused by the shared verifier because compact
  JSON arrays were tokenised as one fused numeral. `collectEvidenceNumbers` now recognises
  thousands groups without swallowing commas between array elements; the exact sentence is a
  permanent gate in `proof-model-route`.
- Final gates: full battery **221/221 scripts · 5,263/5,263 checks · exit 0**; `tsc` 0;
  `npm run build` 0; Playwright **267 passed / 12 skipped / 0 failed**; PWA **836 KB / 115
  assets** with baseline re-recorded. One real `gpt-6.2-sol` call through the shipped proxy
  (`LLM_LIVE=1 node scripts/verify-cartographer-live.mjs`) returned `LENS:form` with a
  verifier-pass body: **7/7**. The key was read server-side from `.env` only.
