# M1218 evidence — full battery, comparator repair, long-context cache

- Full proof battery (`node scripts/run-proofs.mjs`, 2026-11-20, `LLM_KEEPWARM_SECONDS=0`):
  `218/219 proof scripts proven (5214/5215 checks counted)`. The single red was
  `proof:analytics` at 250/251: the new tape's first draft used a hand-written
  kickoff comparator, and the domain's one-comparator gate refused it.
- Fix by evidence, not exemption: `data/deepDigest.ts` and `scripts/proof-digest.mjs`
  now both call the domain's single `byKickoff`. Re-proofed individually:
  `proof-analytics 251/251`, `proof-digest 20/20`, plus every other digest-dependent
  proof (`app-tree 13/13`, `fmt1 12/12`, `librarian 33/33`, `llm 48/48`,
  `warm-lane 9/9`, `worlddesk 37/37`, `live-wire 115/115`).
- Long-context witness (`dev/.m1218-context.mjs`, two real calls through the
  configured CONNECT proxy, model `gpt-6.2-sol`, key never echoed): system prefix
  `235,819 chars`; upstream reported `prompt_tokens=160,257`; cold
  `cached_tokens=7,631` (4.8%); byte-identical replay `cached_tokens=142,527`
  (88.9%). `prompt_cache_retention: "24h"` with a content-derived lane key keeps
  every door on ONE lane, so parallel sessions cannot fragment the prefix.
- Honest caveat: one cold raw answer still named a real-world score absent from the
  seed. That is why the shipped doors re-prove numerals/entities before commit and
  why the raw witness is a measurement, not a door.
- IO side: Pages deploy failures were diagnosed from run logs (duplicate artifact
  name on retry, then artifacts-API metadata lag immediately after upload). Fix is
  unique-per-attempt artifact names plus a bounded 20s settle step; run
  `44617543586` deployed successfully. Live language percentages now match the
  GitHub REST byte audit (TypeScript 32.28%, Python 24.64%, JavaScript 19.48%,
  HTML 12.36%, Java 8.83%), `NaN=0`, literal `**19**=0`.
