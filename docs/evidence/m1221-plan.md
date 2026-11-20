# M1221 plan and evidence — The Cross-Examination

## Why
D1219 let the model choose the StateGraph branch, but one shelf's fluent claim was still
committed on that shelf's word alone. M1221 adds a second model-driven edge: the model names
a *different* sealed shelf, and the SAME numeral law re-proves both the second shelf's prose
and the original claim against that second shelf. A claim that cannot survive becomes a
`contested` arm where the fold answers; a claim that survives commits with `crossCorroborated`.

## Plan (all shipped)
1. `domain/witnessBench.ts` — first-line `CHECK:crown|chase|form` grammar, `ABSTAIN`
   directive, strict stripping before verification, five new trace notes and state fields
   (`crossLens`, `crossVerdict`), and four transition helpers for the chosen/corroborated/
   contested/invalid/abstained arms.
2. `features/wirediary/Cartographer.tsx` — a second streamed call on the same byte-stable
   world-book prefix. The second system prompt carries the claim and all three sealed shelves;
   a second shelf that repeats the first is refused. Both the second prose and the first claim
   are re-verified before commit. The second button remains available on the keyless/fold arm
   so the honest contested outcome is observable offline as well.
3. Trilingual copy in `en`/`zh-CN`/`zh-TW`; the cross lens label rides the existing
   `witnessBench.ask.*` namespace, and the new notes ride `library.door.note.*`.
4. Gates: `proof-model-route` extended to the second edge (57/57), `proof-i18n` value spaces
   and call-shape pins re-measured (437/437), `proof-boot-order` made CRLF-safe after a real
   worktree-checkout red, and `proof-chips` fixed by moving the new button's badge colours
   into the shared `CHIP_CLASS.badgeInfoStrong` palette (17/17).
5. E2E `cartographer-cross.spec.ts` — both calls refused with 503; first arm says the model was
   unreachable, second arm shows the contested badge and the model-abstained note.
6. `scripts/verify-cross-exam-live.mjs` — a guarded, two-call real-model witness, excluded from
   `npm run proof`; the key is read server-side only and never printed.

## Measured evidence (this tree)
- Real `gpt-6.2-sol` witness through the shipped proxy and Clash lane:
  **12/12 checks passed**. World book **235,772 chars** on both calls; warm-up reported
  `cached_tokens=142529`, showing the long context is actually carried and cached.
  - Call 1 first line: `LENS:form`; prose verified pass.
  - Call 2 first line: `CHECK:chase`; the model named a *different* shelf; second prose
    verifier pass, original-claim-against-second-shelf verifier pass.
  - Final graph: `status commit`, note `crossCorroborated`, **7 trace entries**.
- Offline E2E: `/cartographer` with both calls refused takes the honest fold → contested arm,
  adds a trace chip, and keeps the console clean.
- `proof-model-route` 57/57 · `proof-i18n` 437/437 · `proof-chips` 17/17 ·
  `proof-boot-order` 21/21. Full battery, build and full E2E recorded in the top-level ledgers.

## Honest caveats
- The two live calls were spent once on this dev tree; the E2E and proof gates spend no model
  calls. A model that answers `ABSTAIN`, repeats the first shelf, or drifts into prose takes a
  defined refused arm rather than a fabricated corroboration.
- Corroboration means "both sealed shelves carry the same numerals", not external-world truth;
  the frozen world book remains the only source of facts.
- Local `verify-services.mjs` and the spring-cloud stack remain CI matters; the CRLF fix here
  concerns the *proof reader* of that script, not the service verifier's runtime.
