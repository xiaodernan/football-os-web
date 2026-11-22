// M1246 · The Prompt Budget: proof that the number the cache observatory prints about an ask is
// the number the call path actually sends.
// Run: node scripts/proof-prompt-budget.mjs
//
// The cache observatory used to explain caching as a set of decisions; it could not say what one
// real ask carried. M1246 moves the growing-window policy out of data/llm.ts into a pure fold
// (domain/promptBudget.ts) and measures the assembled envelope: the canonical world-book prefix,
// the trimmed history window, the question — chars summed, tokens as ceil(chars/4), the prefix
// share as the part a provider's prefix cache can reuse. This proof recounts every arithmetic
// step and plants the three ways the measurement can lie:
//   · an unstable prefix (the canonical string does not head the system message)
//   · a shrinking window (this ask trimmed history, so the previous ask's span cannot be reused)
//   · a mis-split envelope (the book appears mid-message, so nothing is cacheable)
// It also refuses a zero-token claim for a non-empty ask, and pins that a fresh session's ledger
// is honestly EMPTY rather than filled with placeholder zeroes.
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";

const cacheDir = join(tmpdir(), `football-os-proof-prompt-budget-${process.pid}`);
const server = await createServer({
  root: process.cwd(),
  cacheDir,
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const PB = await server.ssrLoadModule("/domain/promptBudget.ts");
const DATA = await server.ssrLoadModule("/data/llm.ts");
const TEACH = await server.ssrLoadModule("/domain/teachHint.ts");
const dict = await server.ssrLoadModule("/i18n/dictionaries.ts");
const read = (p) => readFileSync(join(process.cwd(), p), "utf8");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const { HISTORY_CAP, HISTORY_TRIM_BLOCK, windowHistory, estimateTokens, splitSystem, measurePrompt } = PB;
const { WORLD_BRIEFING, withWorldBook, recentAsks, ASK_RING_CAP, HISTORY_CAP: LLM_CAP, windowHistory: LLM_WINDOW } = DATA;
const { DICTIONARIES: D } = dict;
const locales = ["en", "zh-CN", "zh-TW"];
const LLM = read("data/llm.ts");
const PANEL = read("features/cache/CacheObservatory.tsx");

// ── 1 · one source: the call path re-exports the fold, it does not keep a private copy ────────
ok(`data/llm.ts re-exports the SAME window fold and cap (windowHistory identity ${LLM_WINDOW === windowHistory}, ${LLM_CAP}/${HISTORY_CAP})`,
  LLM_WINDOW === windowHistory && LLM_CAP === HISTORY_CAP &&
  !/export const HISTORY_CAP\s*=/.test(LLM) && !/function windowHistory/.test(LLM) &&
  /export \{ HISTORY_CAP, HISTORY_TRIM_BLOCK, windowHistory \} from "@\/domain\/promptBudget"/.test(LLM));
ok(`the real call path measures the EXACT envelope it sends — the fold is applied once, to the RAW history, before the fetch (no second arithmetic)`,
  /const system = options\.system \?\? WORLD_BRIEFING;/.test(LLM) &&
  /const ask = recordAsk\(question, history, system\);/.test(LLM) &&
  /const window = windowHistory\(history\);/.test(LLM) &&
  /\.\.\.measurePrompt\(\{ system, prefix: WORLD_BRIEFING, history, question \}\)/.test(LLM) &&
  !/Math\.ceil\([^\n]*\/ ?4\)/.test(LLM));
// M1246 · the plant for the two negations above. A scan that cannot catch its own counterfeit is
// reading nothing, and "no second arithmetic" would then be a blind spot restated in green. So
// each lie is written into a copy of the REAL file and must trip its regex there while the
// unmutated file rejects it. `replace` no-ops when its anchor drifts, which makes the mutant
// identical to the original and fails this clause — a stale anchor cannot masquerade as a pass.
const mutantDouble = LLM.replace(
  "...measurePrompt({ system, prefix: WORLD_BRIEFING, history, question })",
  "tokens: Math.ceil((system.length + question.length) / 4),");
const mutantTrimmed = LLM.replace(
  "const ask = recordAsk(question, history, system);",
  "const ask = recordAsk(question, window, system);");
ok(`the planted lies are CAUGHT — a second ceil(/4) arithmetic and a ledger fed the trimmed window each trip their scan on a mutated copy of the real file (double-arithmetic: ${mutantDouble === LLM ? "anchor drifted" : /Math\.ceil\([^\n]*\/ ?4\)/.test(mutantDouble) ? "caught" : "MISSED"}, trimmed-window: ${mutantTrimmed === LLM ? "anchor drifted" : /recordAsk\(question, window, system\)/.test(mutantTrimmed) ? "caught" : "MISSED"}), so the negations above are measurements and not blind spots`,
  mutantDouble !== LLM && mutantTrimmed !== LLM &&
  /Math\.ceil\([^\n]*\/ ?4\)/.test(mutantDouble) && /recordAsk\(question, window, system\)/.test(mutantTrimmed) &&
  !/Math\.ceil\([^\n]*\/ ?4\)/.test(LLM) && !/recordAsk\(question, window, system\)/.test(LLM));
ok(`the ledger is fed the raw history, NOT the trimmed window: a cap bite must appear as dropped turns, never as a silent zero (${/recordAsk\(question, window, system\)/.test(LLM) ? "window passed — lie" : "raw history passed"})`,
  !/recordAsk\(question, window, system\)/.test(LLM) &&
  LLM.indexOf("recordAsk(question, history, system)") < LLM.indexOf("const window = windowHistory(history);"));
ok(`the live gate sits BEFORE the ledger invocation, so a closed arm records nothing: "no key configured" (at ${LLM.indexOf("if (!LLM_CONFIG.hasKey)")}) precedes the call (at ${LLM.indexOf("const ask = recordAsk(question, history, system)")})`,
  LLM.indexOf("if (!LLM_CONFIG.hasKey)") >= 0 &&
  LLM.indexOf("if (!LLM_CONFIG.hasKey)") < LLM.indexOf("const ask = recordAsk(question, history, system)") &&
  /if \(askRing\.length > ASK_RING_CAP\) askRing\.length = ASK_RING_CAP;/.test(LLM));

// ── 2 · the window GROWS and trims in whole blocks ─────────────────────────────────────────────
const under = Array.from({ length: HISTORY_CAP }, (_, i) => ({ role: "user", content: "m" + i }));
const at57 = Array.from({ length: HISTORY_CAP + 13 }, (_, i) => ({ role: "user", content: "m" + i }));
const at41 = Array.from({ length: HISTORY_CAP + 1 }, (_, i) => ({ role: "user", content: "m" + i }));
const huge = Array.from({ length: 100 }, (_, i) => ({ role: "user", content: "m" + i }));
const w57 = windowHistory(at57), w41 = windowHistory(at41), w100 = windowHistory(huge);
ok(`M969 windowHistory is identity under the cap (${HISTORY_CAP} in, same array out) and block-aligns over it: +1 → ${at41.length - w41.length} dropped, +13 → ${at57.length - w57.length} dropped, 100 → ${100 - w100.length} dropped (kept ${w100.length})`,
  windowHistory(under) === under &&
  at41.length - w41.length === HISTORY_TRIM_BLOCK && w41.length === 29 &&
  at57.length - w57.length === 2 * HISTORY_TRIM_BLOCK && w57.length === 29 &&
  huge.length - w100.length === 60 && w100.length === HISTORY_CAP);
const slide = at57.slice(-HISTORY_CAP);
ok(`the block trim is NOT a sliding window: at ${at57.length} messages it keeps ${w57.length} where slice(-${HISTORY_CAP}) keeps ${slide.length}, so a trim is one deferred event instead of a per-turn prefix shift`,
  w57.length !== slide.length && w57[0].content === "m24" && slide[0].content === "m13");

// ── 3 · chars → tokens, and the refusal to call a non-empty ask free ──────────────────────────
const tokenVectors = [0, 1, 3, 4, 5, 8, 9, 400, 401];
const expected = tokenVectors.map((c) => (c === 0 ? 0 : Math.ceil(c / 4)));
ok(`estimateTokens is ceil(chars/4) on ${tokenVectors.length} vectors (${tokenVectors.map((c, i) => c + "→" + expected[i]).join(", ")}) and never returns zero for non-empty content`,
  tokenVectors.every((c, i) => estimateTokens(c) === expected[i]) && estimateTokens(1) === 1 && estimateTokens(0) === 0);

const history = [
  { role: "user", content: "Who leads the table right now?" },
  { role: "assistant", content: "The frozen tables say the seeded leader; I only know this demo world." },
  { role: "user", content: "And the strongest club by overall?" },
  { role: "assistant", content: "The strongest clubs are listed in the briefing, in overall order." },
  { role: "user", content: "Name the best three players." },
  { role: "assistant", content: "They are the first three rows of the highest-rated list in the briefing." },
];
const question = "Which of them is youngest?";
const budget = measurePrompt({ system: WORLD_BRIEFING, prefix: WORLD_BRIEFING, history, question });
const historyChars = history.reduce((n, m) => n + m.content.length, 0);
ok(`the real briefing measures ${budget.prefixChars} prefix chars ≈ ${budget.prefixTokens} tokens; with ${history.length} turns and one question the whole ask is ${budget.totalChars} chars ≈ ${budget.totalTokens} tokens, ${budget.prefixShare}% on the stable prefix (stable=${budget.prefixStable}, window kept ${budget.historyKept})`,
  budget.prefixChars === WORLD_BRIEFING.length && budget.prefixStable &&
  budget.envelopeChars === 0 && budget.prefixChars > 1000 &&
  budget.historyChars === historyChars && budget.questionChars === question.length &&
  budget.totalChars === budget.prefixChars + budget.envelopeChars + budget.historyChars + budget.questionChars &&
  budget.totalTokens === Math.ceil(budget.totalChars / 4) &&
  budget.prefixShare === Math.round((budget.prefixChars / budget.totalChars) * 100) &&
  budget.prefixShare >= 50 && budget.historyKept === history.length && budget.windowStable);
const zeroClaim = { tokens: 0 };
const measuredNonEmpty = budget.totalTokens;
ok(`a zero-token claim about a non-empty ask is REFUSED: measured ${measuredNonEmpty} tokens (planted claim ${zeroClaim.tokens} rejected: ${measuredNonEmpty !== zeroClaim.tokens}), and no measurement can fall below chars/4`,
  measuredNonEmpty >= 1 && measuredNonEmpty >= budget.totalChars / 4 && measuredNonEmpty !== zeroClaim.tokens);

// ── 4 · the envelope split: stable only when the canonical prefix heads the message ───────────
const envelope = "Answer as the desk: one tight line, no invented names.";
const split = splitSystem(withWorldBook(envelope), WORLD_BRIEFING);
ok(`withWorldBook's envelope is recovered byte-for-byte (${envelope.length} chars) with the full book (${split.prefixChars} chars) in front and one separator newline not charged`,
  split.stable && split.envelope === envelope && split.prefixChars === WORLD_BRIEFING.length);
const noNewline = splitSystem(WORLD_BRIEFING + envelope, WORLD_BRIEFING);
ok(`a system message that appends text with no separator still splits honestly (envelope ${noNewline.envelope.length} chars, stable=${noNewline.stable})`,
  noNewline.stable && noNewline.envelope === envelope && noNewline.prefixChars === WORLD_BRIEFING.length);
const misSplit = splitSystem("intro line\n" + WORLD_BRIEFING, WORLD_BRIEFING);
const unstable = measurePrompt({ system: "intro line\n" + WORLD_BRIEFING, prefix: WORLD_BRIEFING, history: [], question });
const plantedStable = measurePrompt({ system: WORLD_BRIEFING + "\n" + envelope, prefix: WORLD_BRIEFING, history: [], question });
ok(`a MIS-SPLIT envelope is refused: the book after an intro line gives stable=${misSplit.stable}, prefixChars=${misSplit.prefixChars}, the whole ${unstable.totalChars} chars charged as envelope — while the correctly headed book is stable and charges ${plantedStable.envelopeChars} envelope chars`,
  !misSplit.stable && misSplit.prefixChars === 0 &&
  unstable.prefixChars === 0 && unstable.prefixShare === 0 &&
  unstable.envelopeChars === ("intro line\n" + WORLD_BRIEFING).length &&
  plantedStable.prefixStable && plantedStable.envelopeChars === envelope.length);

// ── 5 · a shrinking window is visible, not silent ───────────────────────────────────────────
const growing = Array.from({ length: HISTORY_CAP + 13 }, (_, i) => ({ role: "user", content: "turn " + i }));
const shrunk = measurePrompt({ system: WORLD_BRIEFING, prefix: WORLD_BRIEFING, history: growing, question });
const keptChars = growing.slice(growing.length - shrunk.historyKept).reduce((n, m) => n + m.content.length, 0);
const stableWindow = measurePrompt({ system: WORLD_BRIEFING, prefix: WORLD_BRIEFING, history, question });
ok(`a trimming ask says so: ${growing.length} turns → kept ${shrunk.historyKept}, dropped ${shrunk.historyDropped}, windowStable=${shrunk.windowStable}, historyChars ${shrunk.historyChars} = the kept turns only; an under-cap ask reports windowStable=${stableWindow.windowStable}`,
  shrunk.historyKept === 29 && shrunk.historyDropped === 2 * HISTORY_TRIM_BLOCK &&
  !shrunk.windowStable && shrunk.historyChars === keptChars &&
  stableWindow.windowStable && stableWindow.historyDropped === 0);
const rawOver = Array.from({ length: HISTORY_CAP + 5 }, (_, i) => ({ role: "user", content: "t" + i }));
const seen = measurePrompt({ system: WORLD_BRIEFING, prefix: WORLD_BRIEFING, history: rawOver, question });
const sent = windowHistory(rawOver);
ok(`the fold and the envelope cannot disagree: ${rawOver.length} raw turns send ${sent.length} messages and the budget reports kept ${seen.historyKept} / dropped ${seen.historyDropped} with historyChars ${seen.historyChars} = the sent turns' chars (measuring the trimmed window instead would have printed dropped 0 — the silent zero this panel refuses)`,
  seen.historyKept === sent.length && seen.historyDropped === rawOver.length - sent.length &&
  sent.length === 33 && seen.historyChars === sent.reduce((n, m) => n + m.content.length, 0) &&
  !seen.windowStable);

// ── 6 · the observatory prints the fold, and an unmeasured session stays honestly empty ─────
ok(`the /cache panel reads the fold and the call path's ledger (measurePrompt + recentAsks + LLM_CONFIG.enabled), and a fresh session's ledger is EMPTY rather than zero-filled (${recentAsks().length} asks, ring cap ${ASK_RING_CAP})`,
  PANEL.includes("measurePrompt({ system: WORLD_BRIEFING, prefix: WORLD_BRIEFING, history: [], question: \"\" })") &&
  PANEL.includes("recentAsks()") && PANEL.includes("LLM_CONFIG.enabled") &&
  PANEL.includes('t("cache.promptEmpty")') && PANEL.includes('t("cache.promptMethod"') &&
  recentAsks().length === 0 && ASK_RING_CAP === 12);

// ── 7 · every visible string is a dictionary key in all three locales, placeholders agreeing ──
const promptKeys = [...new Set([...PANEL.matchAll(/"(cache\.prompt[A-Za-z]+)"/g)].map((x) => x[1]))];
const vars = (v) => (v.match(/\{(\w+)\}/g) ?? []).sort().join(",");
const allPresent = promptKeys.every((k) => locales.every((l) => typeof D[l][k] === "string" && D[l][k].trim().length > 0));
const agree = promptKeys.every((k) => locales.every((l) => vars(D[l][k]) === vars(D.en[k])));
ok(`the ${promptKeys.length} prompt-budget labels the panel prints are dictionary keys in all three locales with agreeing placeholders (${promptKeys.join(", ")})`,
  promptKeys.length >= 16 && allPresent && agree);
ok(`the cache lesson is in the teaching catalogue and every locale defines it (id cache -> ${TEACH.teachHintKey("cache")})`,
  TEACH.teachHintKey("cache") === "teach.cache" &&
  locales.every((l) => typeof D[l]["teach.cache"] === "string" && D[l]["teach.cache"].trim().length > 0) &&
  PANEL.includes('<TeachHint id="cache" />'));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
