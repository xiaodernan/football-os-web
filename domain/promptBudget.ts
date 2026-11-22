// M1246 — the prompt budget: the request the app actually sends, measured as a fold.
//
// The live brief surfaces all ride ONE envelope (data/llm.ts): a canonical world-book system
// message in front, the growing history window and the visitor's question behind it. The
// provider's prefix cache can only reuse the byte-stable head of that envelope, so the two
// numbers that decide whether an ask is cheap — how many characters sit in the stable prefix,
// and how many the changing window carries — are the two numbers this module measures.
//
// Why a domain fold: the arithmetic must be recountable without a browser, a network or a
// tokenizer. `scripts/proof-prompt-budget.mjs` loads this file through Vite and re-derives every
// total: chars summed message by message, tokens as ceil(chars/4), the prefix split at the
// caller-supplied canonical string. It also plants the three ways the budget can lie — a prefix
// that does not head the system message (unstable), a window that shrank this turn (a cache
// break), and an envelope split in the wrong place — and refuses each one loudly.
//
// THE TOKEN NUMBER IS AN ESTIMATE, NOT A TOKENIZER. ceil(chars / 4) is the usual English-prose
// rule of thumb and it is labelled as such wherever it is printed. A real BPE tokenizer would
// need the model's vocabulary, which this frozen world deliberately does not ship; an estimate
// that says it is an estimate is honest, a fake precision would not be.
//
// The growth policy moved here from data/llm.ts unchanged (M969): the window GROWS so request
// N+1's prefix equals all of request N, and the trim is BLOCK-ALIGNED so a trim costs one turn
// of cached history every twelve asks rather than shifting the window every ask. data/llm.ts
// re-exports the three names, so the call path and this fold cannot drift apart.

import { pct } from "@/lib/utils";
import { sum } from "@/domain/attributes";

/** The structural minimum a measured message must carry. data/llm.ts's ChatMessage is assignable,
 *  which is why the window fold can be generic over the caller's own message type. */
export interface PromptMessage {
  readonly role: string;
  readonly content: string;
}

/** The window cap, in messages (system and the final question are not counted). */
export const HISTORY_CAP = 40;

/** The trim grain: a whole block drops at once, never one message per turn. */
export const HISTORY_TRIM_BLOCK = 12;

/** The growing window with a block-aligned trim. Under the cap this returns the SAME array
 *  (identity), which is what makes consecutive requests share their whole history prefix. */
export function windowHistory<T extends PromptMessage>(history: readonly T[]): readonly T[] {
  const over = history.length - HISTORY_CAP;
  if (over <= 0) return history;
  return history.slice(Math.ceil(over / HISTORY_TRIM_BLOCK) * HISTORY_TRIM_BLOCK);
}

/** chars → estimated tokens. Empty content costs zero; every non-empty prompt costs at least one,
 *  so no measurement can ever claim a non-empty ask is free. */
export const estimateTokens = (chars: number): number => (chars <= 0 ? 0 : Math.ceil(chars / 4));

export interface SystemSplit {
  /** Characters in the canonical prefix. Zero when the prefix does not head this message. */
  readonly prefixChars: number;
  /** Everything after the prefix — the part that changes between calls. One separator newline
   *  (the one `withWorldBook` inserts) is not charged to the envelope. */
  readonly envelope: string;
  /** True only when a non-empty canonical prefix heads the system message byte-for-byte. */
  readonly stable: boolean;
}

/** Split one system message at the canonical prefix. A prefix that appears mid-string, or not at
 *  all, is NOT a cacheable head: the honest answer there is `stable: false` with the whole
 *  message counted as envelope, because the provider would have to re-read all of it. */
export function splitSystem(system: string, prefix: string): SystemSplit {
  if (prefix.length === 0 || !system.startsWith(prefix)) {
    return { prefixChars: 0, envelope: system, stable: false };
  }
  const rest = system.slice(prefix.length);
  return {
    prefixChars: prefix.length,
    envelope: rest.startsWith("\n") ? rest.slice(1) : rest,
    stable: true,
  };
}

export interface PromptInput {
  /** The whole system message as it will be sent (world book, or world book + a surface envelope). */
  readonly system: string;
  /** The canonical, byte-stable head the caller expects the provider to cache (WORLD_BRIEFING). */
  readonly prefix: string;
  /** The conversation so far; trimmed through `windowHistory` before measuring. */
  readonly history: readonly PromptMessage[];
  /** The visitor's question. */
  readonly question: string;
}

export interface PromptBudget {
  readonly prefixChars: number;
  readonly envelopeChars: number;
  readonly historyChars: number;
  readonly questionChars: number;
  readonly totalChars: number;
  readonly prefixTokens: number;
  /** Estimated tokens for the whole ask: the stable prefix plus everything the cache must re-read
   *  (envelope, window, question). The changing part is this minus `prefixTokens`. */
  readonly totalTokens: number;
  /** Estimated share of the whole ask that rides the stable prefix, in whole percent (0..100). */
  readonly prefixShare: number;
  readonly prefixStable: boolean;
  readonly historyKept: number;
  readonly historyDropped: number;
  /** True when no trim happened on this ask — the window is a superset of the previous ask's,
   *  so the provider can keep reusing the history span. */
  readonly windowStable: boolean;
}

/** Measure one assembled ask. Pure: same input, same output, no clock, no network. */
export function measurePrompt(input: PromptInput): PromptBudget {
  const window = windowHistory(input.history);
  const split = splitSystem(input.system, input.prefix);
  const historyChars = sum(window, (m) => m.content.length);
  const questionChars = input.question.length;
  const envelopeChars = split.envelope.length;
  const totalChars = split.prefixChars + envelopeChars + historyChars + questionChars;
  const prefixTokens = estimateTokens(split.prefixChars);
  return {
    prefixChars: split.prefixChars,
    envelopeChars,
    historyChars,
    questionChars,
    totalChars,
    prefixTokens,
    totalTokens: prefixTokens + estimateTokens(envelopeChars + historyChars + questionChars),
    prefixShare: totalChars === 0 ? 0 : pct(split.prefixChars / totalChars),
    prefixStable: split.stable,
    historyKept: window.length,
    historyDropped: input.history.length - window.length,
    windowStable: window.length === input.history.length,
  };
}
